package workers

import (
	"testing"
	"time"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"

	"gorm.io/gorm"
)

// Penyaringan kandidat diuji langsung terhadap database, tanpa Redis, RabbitMQ,
// maupun WebSocket. Yang perlu dibuktikan adalah driver mana yang lolos ke
// tahap penawaran — dan itu sepenuhnya ditentukan oleh keadaan di database.
//
// Bagian ini yang paling pantas ditest: sebuah kekeliruan di sini tidak
// memunculkan error apa pun, hanya order yang ditawarkan ke driver yang salah.

// matchDriver — driver dengan keadaan yang bisa diatur per test.
func matchDriver(t *testing.T, db *gorm.DB, email string, adjust func(*models.User)) models.User {
	t.Helper()
	driver := models.User{
		Name:       "Driver " + email,
		Email:      email,
		Phone:      email,
		Password:   "not-a-real-hash",
		RoleCode:   models.RoleDriverMotorcycle,
		IsActive:   true,
		IsVerified: true,
		IsOnline:   true,
	}
	if adjust != nil {
		adjust(&driver)
	}
	if err := db.Create(&driver).Error; err != nil {
		t.Fatal("failed to seed driver:", err)
	}
	return driver
}

// matchRider — penumpang pemilik order dalam test ini.
func matchRider(t *testing.T, db *gorm.DB, email string) models.User {
	t.Helper()
	rider := models.User{
		Name:       "Rider " + email,
		Email:      email,
		Phone:      email,
		Password:   "not-a-real-hash",
		RoleCode:   models.RoleCustomer,
		IsActive:   true,
		IsVerified: true,
	}
	if err := db.Create(&rider).Error; err != nil {
		t.Fatal("failed to seed rider:", err)
	}
	return rider
}

// matchOrder — order dengan status dan driver yang bisa diatur.
func matchOrder(t *testing.T, db *gorm.DB, uuid string, riderID uint, adjust func(*models.Order)) models.Order {
	t.Helper()
	order := models.Order{
		UUID:        uuid,
		RiderID:     riderID,
		VehicleType: models.VehicleMotorcycle,
		Status:      models.StatusSearching,
	}
	if adjust != nil {
		adjust(&order)
	}
	if err := db.Create(&order).Error; err != nil {
		t.Fatal("failed to seed order:", err)
	}
	return order
}

func contains(ids []uint, want uint) bool {
	for _, id := range ids {
		if id == want {
			return true
		}
	}
	return false
}

// ── filterEligible ──────────────────────────────────────────────────────────

// Driver yang sedang mengantar penumpang tidak boleh ditawari order kedua:
// menerima keduanya berarti meninggalkan salah satu penumpang di jalan.
func TestFilterEligible_ExcludesDriverWithOngoingOrder(t *testing.T) {
	db := testutil.NewTestDB(t)
	w := NewMatchingWorker(db, nil, nil, nil, nil, nil)

	rider := matchRider(t, db, "busy-rider@test.com")
	busy := matchDriver(t, db, "busy-driver@test.com", nil)
	free := matchDriver(t, db, "free-driver@test.com", nil)

	ongoing := []models.OrderStatus{
		models.StatusAccepted,
		models.StatusArrived,
		models.StatusInProgress,
	}
	for _, status := range ongoing {
		t.Run(string(status), func(t *testing.T) {
			db.Where("driver_id = ?", busy.ID).Delete(&models.Order{})
			matchOrder(t, db, "ongoing-"+string(status), rider.ID, func(o *models.Order) {
				o.DriverID = &busy.ID
				o.Status = status
			})

			got := w.filterEligible([]uint{busy.ID, free.ID}, models.VehicleMotorcycle, 10)
			if contains(got, busy.ID) {
				t.Errorf("driver dengan order %s tidak boleh ikut ditawari, got %v", status, got)
			}
			if !contains(got, free.ID) {
				t.Errorf("driver senggang harus tetap lolos, got %v", got)
			}
		})
	}
}

// Order yang sudah selesai atau dibatalkan tidak lagi menahan drivernya.
func TestFilterEligible_PastOrderDoesNotBlockDriver(t *testing.T) {
	db := testutil.NewTestDB(t)
	w := NewMatchingWorker(db, nil, nil, nil, nil, nil)

	rider := matchRider(t, db, "past-rider@test.com")
	driver := matchDriver(t, db, "past-driver@test.com", nil)

	for _, status := range []models.OrderStatus{models.StatusCompleted, models.StatusCancelled} {
		matchOrder(t, db, "past-"+string(status), rider.ID, func(o *models.Order) {
			o.DriverID = &driver.ID
			o.Status = status
		})
	}

	got := w.filterEligible([]uint{driver.ID}, models.VehicleMotorcycle, 10)
	if !contains(got, driver.ID) {
		t.Errorf("order yang sudah tuntas tidak boleh menahan driver, got %v", got)
	}
}

// Tiga kolom status di bawah masing-masing cukup untuk menggugurkan seorang
// driver. Diuji satu per satu supaya kegagalan menunjuk kolom yang tepat.
func TestFilterEligible_ExcludesUnavailableDrivers(t *testing.T) {
	db := testutil.NewTestDB(t)
	w := NewMatchingWorker(db, nil, nil, nil, nil, nil)

	cases := []struct {
		name   string
		email  string
		adjust func(*models.User)
	}{
		{"offline", "offline@test.com", func(u *models.User) { u.IsOnline = false }},
		{"belum terverifikasi", "unverified@test.com", func(u *models.User) { u.IsVerified = false }},
		{"nonaktif", "inactive@test.com", func(u *models.User) { u.IsActive = false }},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			driver := matchDriver(t, db, tc.email, tc.adjust)
			if got := w.filterEligible([]uint{driver.ID}, models.VehicleMotorcycle, 10); len(got) != 0 {
				t.Errorf("driver %s tidak boleh lolos, got %v", tc.name, got)
			}
		})
	}
}

// Order mobil hanya untuk driver mobil, dan sebaliknya. Tanpa ini penumpang
// mobil bisa dijemput sepeda motor.
func TestFilterEligible_MatchesVehicleType(t *testing.T) {
	db := testutil.NewTestDB(t)
	w := NewMatchingWorker(db, nil, nil, nil, nil, nil)

	motor := matchDriver(t, db, "motor@test.com", nil)
	car := matchDriver(t, db, "car@test.com", func(u *models.User) {
		u.RoleCode = models.RoleDriverCar
	})
	both := []uint{motor.ID, car.ID}

	gotMotor := w.filterEligible(both, models.VehicleMotorcycle, 10)
	if !contains(gotMotor, motor.ID) || contains(gotMotor, car.ID) {
		t.Errorf("order motor hanya untuk driver motor, got %v", gotMotor)
	}

	gotCar := w.filterEligible(both, models.VehicleCar, 10)
	if !contains(gotCar, car.ID) || contains(gotCar, motor.ID) {
		t.Errorf("order mobil hanya untuk driver mobil, got %v", gotCar)
	}
}

// Urutan dari GEOSEARCH adalah urutan jarak. Penyaringan lewat database
// mengembalikan baris tanpa urutan yang dijamin, jadi urutan masukan harus
// dipulihkan — kalau tidak, driver terdekat kehilangan prioritasnya.
func TestFilterEligible_PreservesProximityOrderAndLimit(t *testing.T) {
	db := testutil.NewTestDB(t)
	w := NewMatchingWorker(db, nil, nil, nil, nil, nil)

	first := matchDriver(t, db, "nearest@test.com", nil)
	second := matchDriver(t, db, "middle@test.com", nil)
	third := matchDriver(t, db, "farthest@test.com", nil)
	byDistance := []uint{first.ID, second.ID, third.ID}

	got := w.filterEligible(byDistance, models.VehicleMotorcycle, 3)
	if len(got) != 3 || got[0] != first.ID || got[1] != second.ID || got[2] != third.ID {
		t.Errorf("urutan jarak harus dipertahankan, want %v got %v", byDistance, got)
	}

	limited := w.filterEligible(byDistance, models.VehicleMotorcycle, 2)
	if len(limited) != 2 || limited[0] != first.ID || limited[1] != second.ID {
		t.Errorf("limit harus memotong dari yang terjauh, got %v", limited)
	}
}

func TestFilterEligible_EmptyInputReturnsNothing(t *testing.T) {
	db := testutil.NewTestDB(t)
	w := NewMatchingWorker(db, nil, nil, nil, nil, nil)

	if got := w.filterEligible(nil, models.VehicleMotorcycle, 10); len(got) != 0 {
		t.Errorf("masukan kosong harus menghasilkan kosong, got %v", got)
	}
}

// ── excludeOffered ──────────────────────────────────────────────────────────

// Inti dari pencarian berulang: putaran berikutnya harus menyasar driver baru.
// Semua status tawaran diperlakukan sama — yang sudah pernah ditawari, apa pun
// jawabannya, tidak ditawari lagi untuk order yang sama.
func TestExcludeOffered_SkipsDriversAlreadyOffered(t *testing.T) {
	db := testutil.NewTestDB(t)
	w := NewMatchingWorker(db, nil, nil, nil, nil, nil)

	rider := matchRider(t, db, "offer-rider@test.com")
	matchOrder(t, db, "order-offered", rider.ID, nil)

	statuses := []models.OfferStatus{
		models.OfferOffered,
		models.OfferRejected,
		models.OfferExpired,
	}

	for _, status := range statuses {
		t.Run(string(status), func(t *testing.T) {
			seen := matchDriver(t, db, "seen-"+string(status)+"@test.com", nil)
			fresh := matchDriver(t, db, "fresh-"+string(status)+"@test.com", nil)

			offer := models.OrderOffer{
				OrderUUID: "order-offered",
				DriverID:  seen.ID,
				Status:    status,
				ExpiresAt: time.Now().Add(time.Minute),
			}
			if err := db.Create(&offer).Error; err != nil {
				t.Fatal("failed to seed offer:", err)
			}

			got := w.excludeOffered("order-offered", []uint{seen.ID, fresh.ID})
			if contains(got, seen.ID) {
				t.Errorf("driver dengan tawaran %s tidak boleh ditawari ulang, got %v", status, got)
			}
			if !contains(got, fresh.ID) {
				t.Errorf("driver yang belum pernah ditawari harus lolos, got %v", got)
			}
		})
	}
}

// Tawaran melekat pada satu order saja: menolak order A tidak membuat driver
// kehilangan order B.
func TestExcludeOffered_IsScopedToOneOrder(t *testing.T) {
	db := testutil.NewTestDB(t)
	w := NewMatchingWorker(db, nil, nil, nil, nil, nil)

	rider := matchRider(t, db, "scope-rider@test.com")
	driver := matchDriver(t, db, "scope-driver@test.com", nil)
	matchOrder(t, db, "order-a", rider.ID, nil)
	matchOrder(t, db, "order-b", rider.ID, nil)

	rejected := models.OrderOffer{
		OrderUUID: "order-a",
		DriverID:  driver.ID,
		Status:    models.OfferRejected,
		ExpiresAt: time.Now().Add(time.Minute),
	}
	if err := db.Create(&rejected).Error; err != nil {
		t.Fatal("failed to seed offer:", err)
	}

	if got := w.excludeOffered("order-b", []uint{driver.ID}); !contains(got, driver.ID) {
		t.Errorf("penolakan pada order lain tidak boleh berpengaruh, got %v", got)
	}
}

// ── recordOffers ────────────────────────────────────────────────────────────

// Tawaran yang tercatat adalah dasar bagi accept, reject, dan sapuan
// kedaluwarsa. Yang dikembalikan harus hanya yang benar-benar tersimpan.
func TestRecordOffers_PersistsOfferPerDriver(t *testing.T) {
	db := testutil.NewTestDB(t)
	w := NewMatchingWorker(db, nil, nil, nil, nil, nil)

	rider := matchRider(t, db, "record-rider@test.com")
	matchOrder(t, db, "order-record", rider.ID, nil)
	first := matchDriver(t, db, "record-one@test.com", nil)
	second := matchDriver(t, db, "record-two@test.com", nil)

	expiresAt := time.Now().Add(30 * time.Second)
	recorded := w.recordOffers("order-record", []uint{first.ID, second.ID}, expiresAt)
	if len(recorded) != 2 {
		t.Fatalf("kedua tawaran harus tercatat, got %v", recorded)
	}

	var offers []models.OrderOffer
	if err := db.Where("order_uuid = ?", "order-record").Find(&offers).Error; err != nil {
		t.Fatal("failed to read offers:", err)
	}
	if len(offers) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(offers))
	}
	for _, offer := range offers {
		if offer.Status != models.OfferOffered {
			t.Errorf("tawaran baru harus berstatus %s, got %s", models.OfferOffered, offer.Status)
		}
		if offer.ExpiresAt.IsZero() {
			t.Error("ExpiresAt wajib terisi, tanpa itu sapuan kedaluwarsa tidak punya pegangan")
		}
	}
}

// Dua putaran pencarian yang berjalan bersamaan bisa menyasar driver yang sama.
// Unique index menolak baris kedua, dan kandidat itu tidak boleh dilaporkan
// sebagai tertawari — kalau dilaporkan, ia akan dikirimi notifikasi untuk
// tawaran yang tidak ada barisnya.
func TestRecordOffers_DuplicateIsNotReportedAsRecorded(t *testing.T) {
	db := testutil.NewTestDB(t)
	w := NewMatchingWorker(db, nil, nil, nil, nil, nil)

	rider := matchRider(t, db, "dup-rider@test.com")
	matchOrder(t, db, "order-dup", rider.ID, nil)
	driver := matchDriver(t, db, "dup-driver@test.com", nil)
	fresh := matchDriver(t, db, "dup-fresh@test.com", nil)

	expiresAt := time.Now().Add(30 * time.Second)
	if got := w.recordOffers("order-dup", []uint{driver.ID}, expiresAt); len(got) != 1 {
		t.Fatalf("tawaran pertama harus tercatat, got %v", got)
	}

	// Putaran kedua menyasar driver yang sama plus satu kandidat baru.
	got := w.recordOffers("order-dup", []uint{driver.ID, fresh.ID}, expiresAt)
	if contains(got, driver.ID) {
		t.Errorf("tawaran ganda tidak boleh dilaporkan tercatat, got %v", got)
	}
	if !contains(got, fresh.ID) {
		t.Errorf("satu kegagalan tidak boleh membatalkan kandidat lain, got %v", got)
	}

	var count int64
	db.Model(&models.OrderOffer{}).
		Where("order_uuid = ? AND driver_id = ?", "order-dup", driver.ID).
		Count(&count)
	if count != 1 {
		t.Errorf("hanya boleh ada satu baris tawaran per (order, driver), got %d", count)
	}
}
