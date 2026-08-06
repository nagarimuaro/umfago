package workers

import (
	"testing"
	"time"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"

	"gorm.io/gorm"
)

// Sapuan diuji sebagai fungsi lepas, bukan lewat ticker-nya: yang perlu
// dibuktikan adalah baris mana yang tersentuh, bukan bahwa time.Ticker bekerja.
// Pendekatan ini juga membuat test tidak butuh RabbitMQ maupun WebSocket.

// seedDriver — driver dengan status online tertentu
func seedDriver(t *testing.T, db *gorm.DB, email string, online bool, since *time.Time) models.User {
	t.Helper()
	user := models.User{
		Name:        "Driver " + email,
		Email:       email,
		Phone:       email,
		Password:    "not-a-real-hash",
		RoleCode:    models.RoleDriverMotorcycle,
		IsActive:    true,
		IsVerified:  true,
		IsOnline:    online,
		OnlineSince: since,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatal("failed to seed driver:", err)
	}
	return user
}

func reloadUser(t *testing.T, db *gorm.DB, id uint) models.User {
	t.Helper()
	var user models.User
	if err := db.First(&user, id).Error; err != nil {
		t.Fatal("failed to reload user:", err)
	}
	return user
}

func minutesAgo(n int) *time.Time {
	moment := time.Now().Add(-time.Duration(n) * time.Minute)
	return &moment
}

// ── sweepStaleDrivers ───────────────────────────────────────────────────────

// Driver yang menyalakan status lalu koneksinya hilang harus padam sendiri,
// jika tidak ia akan terus menerima tawaran yang tak pernah dijawab.
func TestSweepStaleDrivers_MarksDisconnectedDriverOffline(t *testing.T) {
	db := testutil.NewTestDB(t)
	driver := seedDriver(t, db, "stale@test.com", true, minutesAgo(10))

	affected, err := sweepStaleDrivers(db, nil, time.Now())
	if err != nil {
		t.Fatal("sweep failed:", err)
	}
	if affected != 1 {
		t.Errorf("expected one row affected, got %d", affected)
	}

	updated := reloadUser(t, db, driver.ID)
	if updated.IsOnline {
		t.Error("expected the driver to be marked offline")
	}
	if updated.OnlineSince != nil {
		t.Error("expected online_since to be cleared")
	}
}

// Driver yang koneksinya masih hidup tidak boleh disentuh, betapapun lama ia
// sudah online.
func TestSweepStaleDrivers_KeepsConnectedDriverOnline(t *testing.T) {
	db := testutil.NewTestDB(t)
	driver := seedDriver(t, db, "connected@test.com", true, minutesAgo(120))

	affected, err := sweepStaleDrivers(db, []uint{driver.ID}, time.Now())
	if err != nil {
		t.Fatal("sweep failed:", err)
	}
	if affected != 0 {
		t.Errorf("expected no rows affected, got %d", affected)
	}
	if !reloadUser(t, db, driver.ID).IsOnline {
		t.Error("expected a connected driver to stay online")
	}
}

// Masa tenggang melindungi driver yang baru saja menekan tombol online tetapi
// belum sempat membuka koneksi WebSocket.
func TestSweepStaleDrivers_RespectsGracePeriod(t *testing.T) {
	db := testutil.NewTestDB(t)
	driver := seedDriver(t, db, "fresh@test.com", true, minutesAgo(1))

	affected, err := sweepStaleDrivers(db, nil, time.Now())
	if err != nil {
		t.Fatal("sweep failed:", err)
	}
	if affected != 0 {
		t.Errorf("expected the grace period to protect a fresh driver, got %d rows", affected)
	}
	if !reloadUser(t, db, driver.ID).IsOnline {
		t.Error("expected the driver to stay online within the grace period")
	}
}

// Baris lama tanpa online_since tidak punya bukti kapan dinyalakan, jadi
// diperlakukan sebagai menggantung.
func TestSweepStaleDrivers_TreatsMissingTimestampAsStale(t *testing.T) {
	db := testutil.NewTestDB(t)
	driver := seedDriver(t, db, "legacy@test.com", true, nil)

	if _, err := sweepStaleDrivers(db, nil, time.Now()); err != nil {
		t.Fatal("sweep failed:", err)
	}
	if reloadUser(t, db, driver.ID).IsOnline {
		t.Error("expected a driver without online_since to be swept")
	}
}

// Sapuan hanya menyentuh yang berstatus online; baris yang sudah offline tidak
// perlu ditulis ulang setiap menit.
func TestSweepStaleDrivers_IgnoresOfflineDrivers(t *testing.T) {
	db := testutil.NewTestDB(t)
	seedDriver(t, db, "already-offline@test.com", false, nil)

	affected, err := sweepStaleDrivers(db, nil, time.Now())
	if err != nil {
		t.Fatal("sweep failed:", err)
	}
	if affected != 0 {
		t.Errorf("expected no rows affected, got %d", affected)
	}
}

// Daftar koneksi yang panjang menyaring per driver, bukan menghentikan sapuan
// seluruhnya.
func TestSweepStaleDrivers_SweepsOnlyDriversOutsideTheOnlineList(t *testing.T) {
	db := testutil.NewTestDB(t)
	connected := seedDriver(t, db, "mixed-connected@test.com", true, minutesAgo(10))
	stale := seedDriver(t, db, "mixed-stale@test.com", true, minutesAgo(10))

	affected, err := sweepStaleDrivers(db, []uint{connected.ID}, time.Now())
	if err != nil {
		t.Fatal("sweep failed:", err)
	}
	if affected != 1 {
		t.Errorf("expected exactly one row affected, got %d", affected)
	}
	if !reloadUser(t, db, connected.ID).IsOnline {
		t.Error("expected the connected driver to stay online")
	}
	if reloadUser(t, db, stale.ID).IsOnline {
		t.Error("expected the disconnected driver to be swept")
	}
}

// ── sweepExpiredOffers ──────────────────────────────────────────────────────

// seedOrderWithOffers — satu order beserta tawaran-tawarannya
func seedOrderWithOffers(t *testing.T, db *gorm.DB, uuid string, status models.OrderStatus, offers ...models.OrderOffer) {
	t.Helper()
	order := models.Order{
		UUID:        uuid,
		RiderID:     seedRider(t, db, uuid),
		Status:      status,
		VehicleType: models.VehicleMotorcycle,
		FareAmount:  15000,
	}
	if err := db.Create(&order).Error; err != nil {
		t.Fatal("failed to seed order:", err)
	}
	for i := range offers {
		offers[i].OrderUUID = uuid
		if err := db.Create(&offers[i]).Error; err != nil {
			t.Fatal("failed to seed offer:", err)
		}
	}
}

// seedRider — penumpang pemilik order. Foreign key orders.rider_id menuntut
// baris user yang benar-benar ada.
func seedRider(t *testing.T, db *gorm.DB, suffix string) uint {
	t.Helper()
	rider := models.User{
		Name:     "Rider " + suffix,
		Email:    "rider-" + suffix + "@test.com",
		Phone:    "rider-" + suffix,
		Password: "not-a-real-hash",
		RoleCode: models.RoleCustomer,
		IsActive: true,
	}
	if err := db.Create(&rider).Error; err != nil {
		t.Fatal("failed to seed rider:", err)
	}
	return rider.ID
}

func offerAt(driverID uint, status models.OfferStatus, expiresAt time.Time) models.OrderOffer {
	return models.OrderOffer{DriverID: driverID, Status: status, ExpiresAt: expiresAt}
}

func reloadOfferByDriver(t *testing.T, db *gorm.DB, uuid string, driverID uint) models.OrderOffer {
	t.Helper()
	var offer models.OrderOffer
	if err := db.Where("order_uuid = ? AND driver_id = ?", uuid, driverID).
		First(&offer).Error; err != nil {
		t.Fatal("offer not found:", err)
	}
	return offer
}

// Tawaran yang didiamkan lewat tenggat berubah menjadi expired, dan ordernya
// dilaporkan sebagai kehabisan kandidat.
func TestSweepExpiredOffers_ExpiresAndReportsStalledOrder(t *testing.T) {
	db := testutil.NewTestDB(t)
	now := time.Now()

	seedOrderWithOffers(t, db, "order-stalled", models.StatusSearching,
		offerAt(1, models.OfferOffered, now.Add(-time.Minute)))

	stalled, err := sweepExpiredOffers(db, now)
	if err != nil {
		t.Fatal("sweep failed:", err)
	}
	if len(stalled) != 1 || stalled[0] != "order-stalled" {
		t.Fatalf("expected the order to be reported as stalled, got %v", stalled)
	}

	if got := reloadOfferByDriver(t, db, "order-stalled", 1).Status; got != models.OfferExpired {
		t.Errorf("expected offer status expired, got %s", got)
	}
}

// Tawaran yang belum lewat tenggat tidak boleh disentuh: driver yang sedang
// menimbang masih berhak menjawab.
func TestSweepExpiredOffers_LeavesLiveOffersAlone(t *testing.T) {
	db := testutil.NewTestDB(t)
	now := time.Now()

	seedOrderWithOffers(t, db, "order-live", models.StatusSearching,
		offerAt(1, models.OfferOffered, now.Add(time.Minute)))

	stalled, err := sweepExpiredOffers(db, now)
	if err != nil {
		t.Fatal("sweep failed:", err)
	}
	if len(stalled) != 0 {
		t.Errorf("expected no stalled order, got %v", stalled)
	}
	if got := reloadOfferByDriver(t, db, "order-live", 1).Status; got != models.OfferOffered {
		t.Errorf("expected the offer to stay offered, got %s", got)
	}
}

// Selama masih ada satu tawaran yang hidup, order belum kehabisan kandidat dan
// tidak boleh didahului putaran pencarian berikutnya.
func TestSweepExpiredOffers_DoesNotReportOrderWithRemainingOffer(t *testing.T) {
	db := testutil.NewTestDB(t)
	now := time.Now()

	seedOrderWithOffers(t, db, "order-partial", models.StatusSearching,
		offerAt(1, models.OfferOffered, now.Add(-time.Minute)),
		offerAt(2, models.OfferOffered, now.Add(time.Minute)))

	stalled, err := sweepExpiredOffers(db, now)
	if err != nil {
		t.Fatal("sweep failed:", err)
	}
	if len(stalled) != 0 {
		t.Errorf("expected no stalled order while one offer is still live, got %v", stalled)
	}

	if got := reloadOfferByDriver(t, db, "order-partial", 1).Status; got != models.OfferExpired {
		t.Errorf("expected the overdue offer to expire, got %s", got)
	}
	if got := reloadOfferByDriver(t, db, "order-partial", 2).Status; got != models.OfferOffered {
		t.Errorf("expected the live offer to be untouched, got %s", got)
	}
}

// Order yang sudah diambil driver tidak perlu dicarikan kandidat baru, walau
// tawaran lain yang tersisa ikut kedaluwarsa.
func TestSweepExpiredOffers_IgnoresOrderNoLongerSearching(t *testing.T) {
	db := testutil.NewTestDB(t)
	now := time.Now()

	seedOrderWithOffers(t, db, "order-taken", models.StatusAccepted,
		offerAt(1, models.OfferOffered, now.Add(-time.Minute)))

	stalled, err := sweepExpiredOffers(db, now)
	if err != nil {
		t.Fatal("sweep failed:", err)
	}
	if len(stalled) != 0 {
		t.Errorf("expected an accepted order not to be reported, got %v", stalled)
	}
	// Tawaran tetap dibereskan agar tidak menggantung selamanya.
	if got := reloadOfferByDriver(t, db, "order-taken", 1).Status; got != models.OfferExpired {
		t.Errorf("expected the offer to expire anyway, got %s", got)
	}
}

// Tawaran yang sudah dijawab tidak diubah statusnya oleh sapuan, sehingga jejak
// penolakan tetap utuh.
func TestSweepExpiredOffers_KeepsAnsweredOffers(t *testing.T) {
	db := testutil.NewTestDB(t)
	now := time.Now()

	seedOrderWithOffers(t, db, "order-answered", models.StatusSearching,
		offerAt(1, models.OfferRejected, now.Add(-time.Minute)))

	stalled, err := sweepExpiredOffers(db, now)
	if err != nil {
		t.Fatal("sweep failed:", err)
	}
	if len(stalled) != 0 {
		t.Errorf("expected nothing to be reported, got %v", stalled)
	}
	if got := reloadOfferByDriver(t, db, "order-answered", 1).Status; got != models.OfferRejected {
		t.Errorf("expected a rejected offer to keep its status, got %s", got)
	}
}

func TestSweepExpiredOffers_NoOffersIsNotAnError(t *testing.T) {
	db := testutil.NewTestDB(t)

	stalled, err := sweepExpiredOffers(db, time.Now())
	if err != nil {
		t.Fatal("sweep failed:", err)
	}
	if len(stalled) != 0 {
		t.Errorf("expected no stalled orders, got %v", stalled)
	}
}

// Beberapa order sekaligus dilaporkan dalam satu sapuan, karena satu putaran
// timeout biasanya mengenai lebih dari satu order.
func TestSweepExpiredOffers_ReportsEveryStalledOrder(t *testing.T) {
	db := testutil.NewTestDB(t)
	now := time.Now()

	seedOrderWithOffers(t, db, "order-a", models.StatusSearching,
		offerAt(1, models.OfferOffered, now.Add(-time.Minute)))
	seedOrderWithOffers(t, db, "order-b", models.StatusSearching,
		offerAt(2, models.OfferOffered, now.Add(-time.Minute)))

	stalled, err := sweepExpiredOffers(db, now)
	if err != nil {
		t.Fatal("sweep failed:", err)
	}
	if len(stalled) != 2 {
		t.Fatalf("expected two stalled orders, got %v", stalled)
	}
}

// ── PresenceWorker ──────────────────────────────────────────────────────────

// Tanpa database, worker tidak boleh menjalankan goroutine yang akan panik pada
// sapuan pertama; ini keadaan yang wajar di lingkungan test.
func TestPresenceWorker_StartWithoutDatabaseIsSafe(t *testing.T) {
	worker := NewPresenceWorker(nil, nil, nil)
	worker.Start()
	worker.Stop()
}

// Stop dipanggil dari Server.Shutdown dan bisa saja terpanggil dua kali; menutup
// channel yang sama dua kali akan panik bila tidak dijaga.
func TestPresenceWorker_StopIsIdempotent(t *testing.T) {
	worker := NewPresenceWorker(nil, nil, nil)
	worker.Stop()
	worker.Stop()
}

// Sapuan lengkap berjalan tanpa broker maupun hub: keduanya boleh nil, dan
// order yang kehabisan kandidat cukup dicatat di log.
func TestPresenceWorker_SweepRunsWithoutBrokerOrHub(t *testing.T) {
	db := testutil.NewTestDB(t)
	now := time.Now()

	seedDriver(t, db, "sweep-worker@test.com", true, minutesAgo(10))
	seedOrderWithOffers(t, db, "order-worker", models.StatusSearching,
		offerAt(1, models.OfferOffered, now.Add(-time.Minute)))

	NewPresenceWorker(db, nil, nil).sweep()

	if got := reloadOfferByDriver(t, db, "order-worker", 1).Status; got != models.OfferExpired {
		t.Errorf("expected the offer to expire, got %s", got)
	}

	var driver models.User
	if err := db.Where("email = ?", "sweep-worker@test.com").First(&driver).Error; err != nil {
		t.Fatal("failed to reload driver:", err)
	}
	if driver.IsOnline {
		t.Error("expected the stale driver to be marked offline")
	}
}
