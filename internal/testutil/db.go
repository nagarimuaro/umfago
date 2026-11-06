package testutil

import (
	"context"
	"database/sql"
	"log"
	"os"
	"strings"
	"sync"
	"testing"

	"openjek-backend/internal/models"
	"openjek-backend/internal/repository"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// NewMockDB — membuat GORM DB di atas sqlmock, tanpa database sungguhan.
func NewMockDB(t interface{ Fatal(...any) }) (*gorm.DB, *sql.DB, sqlmock.Sqlmock) {
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal("failed to create sqlmock:", err)
	}

	dialector := postgres.New(postgres.Config{
		Conn: sqlDB,
	})

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatal("failed to open gorm with mock:", err)
	}

	return db, sqlDB, mock
}

// NewTestDB — sambungkan ke PostgreSQL khusus testing.
//
// DSN dibaca dari TEST_DATABASE_URL. Kredensial tidak pernah ditulis di dalam
// kode: selain bocor ke riwayat repositori, DSN yang dipaksa hardcode membuat
// test berpotensi menghantam database yang salah di mesin orang lain.
//
// Test akan di-skip (bukan gagal) bila variabel tersebut belum di-set, supaya
// `go test ./...` tetap bisa dijalankan tanpa PostgreSQL.
//
// Contoh:
//
//	TEST_DATABASE_URL="host=localhost user=postgres password=... dbname=testing port=5432 sslmode=disable TimeZone=Asia/Jakarta"
func NewTestDB(t testing.TB) *gorm.DB {
	t.Helper()

	dsn := strings.TrimSpace(os.Getenv("TEST_DATABASE_URL"))
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL belum di-set, melewati test yang butuh database")
	}

	lockTestDatabase(t, dsn)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatal("failed to connect to test PostgreSQL database:", err)
	}

	// Tiap test memanggil NewTestDB sekali, dan tiap panggilan membuka pool
	// koneksi tersendiri. Tanpa penutupan, ratusan test dalam satu paket
	// menumpuk ratusan koneksi sampai PostgreSQL menolak dengan
	// "too many clients already". Pool dibatasi kecil (test tidak butuh
	// paralelisme di sisi database) dan ditutup begitu test selesai.
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal("failed to access underlying sql.DB:", err)
	}
	sqlDB.SetMaxOpenConns(4)
	sqlDB.SetMaxIdleConns(2)
	t.Cleanup(func() { _ = sqlDB.Close() })

	// Bersihkan sisa data dari test sebelumnya
	cleanupTables(db)

	err = db.AutoMigrate(
		&models.Permission{},
		&models.Role{},
		&models.User{},
		&models.UserRole{},
		&models.Vehicle{},
		&models.Order{},
		&models.OrderOffer{},
		&models.RefreshToken{},
		&models.DynamicSetting{},
		&models.WalletTransaction{},
		&models.ChatMessage{},
		&models.DriverProfile{},
		&models.MerchantProfile{},
		&models.Promo{},
		&models.PromoUsage{},
		&models.Notification{},
		&models.Product{},
		&models.ProductEvent{},
		&models.ServiceCatalog{},
		&models.City{},
		&models.Branch{},
		&models.GeoZone{},
		&models.SupportTicket{},
		&models.RiskCase{},
		&models.ApprovalRequest{},
		&models.AuditLog{},
		&models.FeatureFlag{},
	)
	if err != nil {
		t.Fatal("AutoMigrate error:", err)
	}

	// Seed roles dan permissions secara lengkap
	repository.SeedRolesAndPermissions(db)
	// Semai dynamic_settings seperti server start, supaya test yang mengubah
	// setting lewat UPDATE benar-benar mengenai baris.
	repository.NewSettingsRepository(db, nil).Seed()
	repository.SeedEnterpriseDefaults(db)

	log.Println("[TestDB] Ready")
	return db
}

// testDatabaseLockKey — kunci sembarang, hanya perlu sama di seluruh paket test
// dan tidak dipakai aplikasi untuk keperluan lain.
const testDatabaseLockKey int64 = 728_401_553

var (
	testDatabaseLockOnce sync.Once
	// testDatabaseLockConn ditahan sepanjang umur proses. Advisory lock PostgreSQL
	// melekat pada sesi, jadi koneksinya tidak boleh dikembalikan ke pool.
	testDatabaseLockConn *sql.Conn
	testDatabaseLockErr  error
)

// lockTestDatabase — pastikan hanya satu binary test yang memakai database
// testing pada satu waktu.
//
// `go test ./...` menjalankan tiap paket sebagai proses terpisah dan secara
// bawaan menjalankan beberapa di antaranya bersamaan. NewTestDB menghapus lalu
// membuat ulang seluruh tabel, sehingga dua paket yang berjalan bersamaan akan
// saling merobohkan skema di tengah jalan. Advisory lock membuat paket kedua
// menunggu giliran.
//
// Kunci tidak pernah dilepas secara eksplisit: PostgreSQL melepasnya sendiri
// begitu sesi berakhir, termasuk bila proses test mati mendadak. Melepasnya per
// test justru membuka celah bagi proses lain untuk masuk di antara dua test.
func lockTestDatabase(t testing.TB, dsn string) {
	t.Helper()

	testDatabaseLockOnce.Do(func() {
		pool, err := sql.Open("pgx", dsn)
		if err != nil {
			testDatabaseLockErr = err
			return
		}
		// Satu koneksi saja: yang dibutuhkan hanya sesi tempat kunci melekat.
		pool.SetMaxOpenConns(1)

		conn, err := pool.Conn(context.Background())
		if err != nil {
			testDatabaseLockErr = err
			return
		}
		if _, err := conn.ExecContext(context.Background(),
			"SELECT pg_advisory_lock($1)", testDatabaseLockKey); err != nil {
			testDatabaseLockErr = err
			return
		}
		testDatabaseLockConn = conn
	})

	if testDatabaseLockErr != nil {
		t.Fatal("failed to lock the test database:", testDatabaseLockErr)
	}
}

func cleanupTables(db *gorm.DB) {
	db.Migrator().DropTable(
		&models.FeatureFlag{},
		&models.AuditLog{},
		&models.ApprovalRequest{},
		&models.RiskCase{},
		&models.SupportTicket{},
		&models.GeoZone{},
		&models.Branch{},
		&models.City{},
		&models.ServiceCatalog{},
		&models.ProductEvent{},
		&models.Product{},
		&models.Notification{},
		&models.PromoUsage{},
		&models.Promo{},
		&models.DriverProfile{},
		&models.MerchantProfile{},
		&models.ChatMessage{},
		&models.WalletTransaction{},
		&models.DynamicSetting{},
		&models.RefreshToken{},
		&models.OrderOffer{},
		&models.Order{},
		&models.Vehicle{},
		&models.UserRole{},
		&models.User{},
		"role_permissions", // M2M
		&models.Permission{},
		&models.Role{},
	)
}
