package repository

import (
	"log"

	"openjek-backend/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// CompanyAccount — baris User yang menampung dana titipan dan pendapatan
// perusahaan. Lihat models/company.go untuk alasan bentuknya.
//
// Baris ini dibuat sekali lalu dipakai selamanya. Pencariannya lewat email,
// bukan ID hardcoded, sehingga lingkungan yang databasenya dibuat ulang tetap
// menemukan akun yang benar.
type CompanyAccount struct {
	db *gorm.DB
}

func NewCompanyAccount(db *gorm.DB) *CompanyAccount {
	return &CompanyAccount{db: db}
}

// companyPasswordHash — nilai yang sengaja bukan hash bcrypt yang sah.
//
// bcrypt.CompareHashAndPassword menolak nilai ini apa pun kata sandi yang
// dicoba, jadi akun perusahaan tidak bisa dimasuki lewat POST /api/login
// sekalipun seseorang menebak alamat surelnya. Menyimpan string kosong tidak
// aman untuk tujuan yang sama: kolom password bertanda NOT NULL, dan hash
// kosong lebih mudah tertukar dengan "belum diisi" oleh kode di masa depan.
const companyPasswordHash = "!disabled-login-no-password-will-ever-match"

// Ensure — kembalikan ID akun perusahaan, membuatnya bila belum ada.
//
// Aman dipanggil dari dalam transaksi maupun di luarnya. Pemanggil di jalur
// order memakai ini alih-alih ID yang di-cache di memori, karena satu proses
// yang memegang ID basi setelah database dibuat ulang akan membukukan uang ke
// baris yang salah — kesalahan yang tidak akan terlihat sampai rekonsiliasi.
func (c *CompanyAccount) Ensure(tx *gorm.DB) (uint, error) {
	if tx == nil {
		tx = c.db
	}

	user := models.User{
		Email:    models.CompanyUserEmail,
		Name:     models.CompanyUserName,
		Password: companyPasswordHash,
		RoleCode: models.RoleCustomer,
		// IsActive false: seluruh penjaga yang memuat user dari database
		// menolak akun nonaktif, jadi andai kata ada jalur yang bisa memakai
		// akun ini sebagai identitas, jalur itu tertutup lebih dulu.
		IsActive: false,
		Balance:  0,
	}

	// FirstOrCreate dengan ON CONFLICT DO NOTHING: dua proses yang start
	// bersamaan tidak saling menggagalkan, dan unique index pada email tetap
	// menjamin hanya ada satu baris.
	if err := tx.Where("email = ?", models.CompanyUserEmail).
		Attrs(user).
		Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "email"}}, DoNothing: true}).
		FirstOrCreate(&user).Error; err != nil {
		return 0, err
	}

	// FirstOrCreate yang bentrok tidak mengisi ID, jadi baris dibaca ulang.
	if user.ID == 0 {
		if err := tx.Where("email = ?", models.CompanyUserEmail).First(&user).Error; err != nil {
			return 0, err
		}
	}

	return user.ID, nil
}

// SeedCompanyAccount — pastikan akun perusahaan ada saat server start.
//
// Kegagalan di sini fatal: tanpa akun ini, setiap order berbayar wallet akan
// gagal dibukukan, dan lebih baik server menolak start daripada menerima order
// yang uangnya tidak punya tempat berlabuh.
func SeedCompanyAccount(db *gorm.DB) uint {
	id, err := NewCompanyAccount(db).Ensure(db)
	if err != nil {
		log.Fatalf("[Company] Failed to seed company account: %v", err)
	}
	log.Printf("[Company] Company account ready (user id %d)", id)
	return id
}
