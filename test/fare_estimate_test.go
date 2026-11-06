package test

import (
	"context"
	"math"
	"net/http"
	"testing"

	"openjek-backend/internal/models"
	"openjek-backend/internal/pricing"
	"openjek-backend/internal/repository"
	"openjek-backend/internal/testutil"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// fareFixture — router dan satu penumpang yang sudah login
type fareFixture struct {
	db     *gorm.DB
	router *gin.Engine
	token  string
}

func newFareFixture(t *testing.T) fareFixture {
	t.Helper()
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)
	token := createUserWithRoleAndLoginInDB(t, db, router, "fare-user@test.com", models.RoleCustomer)
	return fareFixture{db: db, router: router, token: token}
}

func (f fareFixture) estimate(t *testing.T, body interface{}) (int, map[string]interface{}) {
	t.Helper()
	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPost, "/api/fare/estimate", body, f.token))
	return w.Code, testutil.ParseJSON(w)
}

// point — dua titik di Jakarta dengan jarak beberapa kilometer
func estimateBody(vehicleType string) map[string]interface{} {
	body := map[string]interface{}{
		"pickup":      map[string]float64{"lat": -6.200000, "lng": 106.816666},
		"destination": map[string]float64{"lat": -6.230000, "lng": 106.850000},
	}
	if vehicleType != "" {
		body["vehicle_type"] = vehicleType
	}
	return body
}

func floatField(t *testing.T, body map[string]interface{}, key string) float64 {
	t.Helper()
	value, ok := body[key].(float64)
	if !ok {
		t.Fatalf("expected %s to be a number, got %v", key, body[key])
	}
	return value
}

// Angka estimasi harus identik dengan pricing.Calculator.Quote — bukan sekadar
// mirip. Bila keduanya berbeda logika, penumpang melihat satu harga di layar
// estimasi dan harga lain saat order dibuat.
func TestFareEstimate_MatchesPricingCalculator(t *testing.T) {
	f := newFareFixture(t)

	code, body := f.estimate(t, estimateBody(""))
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}

	calc := pricing.NewCalculator(repository.NewSettingsRepository(f.db, nil))
	want := calc.Quote(context.Background(), floatField(t, body, "distance_km"))

	if got := floatField(t, body, "estimated_fare"); got != want.Total {
		t.Errorf("expected estimated_fare %v, got %v", want.Total, got)
	}
	if got := floatField(t, body, "per_km_price"); got != want.PerKmPrice {
		t.Errorf("expected per_km_price %v, got %v", want.PerKmPrice, got)
	}
	if got := floatField(t, body, "charged_distance_km"); got != want.ChargedDistanceKm {
		t.Errorf("expected charged_distance_km %v, got %v", want.ChargedDistanceKm, got)
	}
	if got := floatField(t, body, "min_fare"); got != want.MinFare {
		t.Errorf("expected min_fare %v, got %v", want.MinFare, got)
	}
	if body["min_distance_applied"] != want.MinDistanceApplied {
		t.Errorf("expected min_distance_applied %v, got %v", want.MinDistanceApplied, body["min_distance_applied"])
	}
}

// Tarif adalah jarak tertagih dikali tarif per kilometer, tanpa tarif dasar.
// Perhitungan itu diuji langsung terhadap nilai setting supaya perubahan diam-
// diam pada rumus — misalnya kembalinya tarif dasar — langsung ketahuan.
func TestFareEstimate_IsPurelyPerKilometer(t *testing.T) {
	f := newFareFixture(t)

	code, body := f.estimate(t, estimateBody(""))
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}

	perKm := floatField(t, body, "per_km_price")
	charged := floatField(t, body, "charged_distance_km")

	want := math.Round(charged * perKm)
	if got := floatField(t, body, "estimated_fare"); got != want {
		t.Errorf("expected estimated_fare to be charged_distance_km x per_km_price = %v, got %v", want, got)
	}
	if _, ok := body["base_fare"]; ok {
		t.Error("expected no base_fare in the response: fare no longer has a base component")
	}
}

// Jarak dihitung dengan haversine yang sama seperti pembuatan order; nilainya
// dicek kasar agar salah satuan (meter vs kilometer) langsung ketahuan.
func TestFareEstimate_ReturnsPlausibleDistance(t *testing.T) {
	f := newFareFixture(t)

	code, body := f.estimate(t, estimateBody(""))
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}

	distance := floatField(t, body, "distance_km")
	if math.Abs(distance-4.9) > 1.0 {
		t.Errorf("expected roughly 4.9 km between the two points, got %v", distance)
	}
}

// Perjalanan yang lebih pendek dari fare.min_distance_km tetap ditagih sejauh
// jarak minimum itu. Jarak sesungguhnya tetap dilaporkan apa adanya supaya
// aplikasi bisa menerangkan selisihnya kepada penumpang.
func TestFareEstimate_AppliesMinimumDistance(t *testing.T) {
	f := newFareFixture(t)

	code, body := f.estimate(t, map[string]interface{}{
		"pickup":      map[string]float64{"lat": -6.2, "lng": 106.816666},
		"destination": map[string]float64{"lat": -6.2, "lng": 106.816666},
	})
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}

	if body["min_distance_applied"] != true {
		t.Errorf("expected min_distance_applied to be true for a zero-distance trip, got %v", body)
	}
	if got := floatField(t, body, "distance_km"); got != 0 {
		t.Errorf("expected distance_km to report the real distance 0, got %v", got)
	}

	minDistance := floatField(t, body, "min_distance_km")
	if got := floatField(t, body, "charged_distance_km"); got != minDistance {
		t.Errorf("expected charged_distance_km %v, got %v", minDistance, got)
	}

	calc := pricing.NewCalculator(repository.NewSettingsRepository(f.db, nil))
	want := calc.Quote(context.Background(), 0)
	if got := floatField(t, body, "estimated_fare"); got != want.Total {
		t.Errorf("expected estimated_fare %v, got %v", want.Total, got)
	}
	// Perjalanan terdekat membayar tepat tarif terendah — tidak ada lantai rupiah
	// lain di atasnya.
	if got := floatField(t, body, "min_fare"); got != want.Total {
		t.Errorf("expected min_fare %v to equal the fare of a zero-distance trip %v", got, want.Total)
	}
}

// Tarif terendah adalah turunan, bukan setting tersendiri: nilainya jarak
// minimum dikali tarif per kilometer. Mengubah salah satu dari keduanya harus
// langsung menggeser tarif terendah — kalau tidak, admin menaikkan tarif per km
// lalu menemukan order pendek masih ditagih dengan harga lama.
func TestFareEstimate_MinimumFareFollowsPerKmPrice(t *testing.T) {
	f := newFareFixture(t)

	if err := f.db.Model(&models.DynamicSetting{}).
		Where("key = ?", pricing.KeyPerKmPrice).
		Update("value", "5000").Error; err != nil {
		t.Fatalf("failed to raise %s: %v", pricing.KeyPerKmPrice, err)
	}
	if err := f.db.Model(&models.DynamicSetting{}).
		Where("key = ?", pricing.KeyMinDistance).
		Update("value", "4").Error; err != nil {
		t.Fatalf("failed to raise %s: %v", pricing.KeyMinDistance, err)
	}

	// Jarak nol supaya jarak minimum yang berlaku, bukan jarak sesungguhnya.
	code, body := f.estimate(t, map[string]interface{}{
		"pickup":      map[string]float64{"lat": -6.2, "lng": 106.816666},
		"destination": map[string]float64{"lat": -6.2, "lng": 106.816666},
	})
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}

	// 4 km x 5000 = 20000
	if got := floatField(t, body, "min_fare"); got != 20000 {
		t.Errorf("expected min_fare to follow 4 km x 5000 = 20000, got %v", got)
	}
	if got := floatField(t, body, "estimated_fare"); got != 20000 {
		t.Errorf("expected estimated_fare 20000 for a trip below the minimum distance, got %v", got)
	}
}

// Biaya layanan penumpang ditambahkan di atas tarif, termasuk di atas tarif
// terendah: min_total_charged adalah jumlah paling kecil yang mungkin dibayar.
func TestFareEstimate_MinimumChargedIncludesCustomerFee(t *testing.T) {
	f := newFareFixture(t)

	if err := f.db.Model(&models.DynamicSetting{}).
		Where("key = ?", pricing.KeyCustomerFee).
		Update("value", "10").Error; err != nil {
		t.Fatalf("failed to raise %s: %v", pricing.KeyCustomerFee, err)
	}

	code, body := f.estimate(t, estimateBody(""))
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}

	minFare := floatField(t, body, "min_fare")
	want := minFare + math.Round(minFare*0.1)
	if got := floatField(t, body, "min_total_charged"); got != want {
		t.Errorf("expected min_total_charged %v, got %v", want, got)
	}

	fare := floatField(t, body, "estimated_fare")
	if got := floatField(t, body, "total_charged"); got != fare+math.Round(fare*0.1) {
		t.Errorf("expected total_charged to add the 10%% customer fee on top of %v, got %v", fare, got)
	}
}

func TestFareEstimate_DefaultsToMotorcycle(t *testing.T) {
	f := newFareFixture(t)

	code, body := f.estimate(t, estimateBody(""))
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}
	if body["vehicle_type"] != models.VehicleMotorcycle {
		t.Errorf("expected vehicle_type to default to motorcycle, got %v", body["vehicle_type"])
	}
}

func TestFareEstimate_AcceptsCar(t *testing.T) {
	f := newFareFixture(t)

	code, body := f.estimate(t, estimateBody(models.VehicleCar))
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %v", code, body)
	}
	if body["vehicle_type"] != models.VehicleCar {
		t.Errorf("expected vehicle_type car, got %v", body["vehicle_type"])
	}
}

// Jenis kendaraan yang salah ditolak terang-terangan, tidak diam-diam dianggap
// motor seperti yang dilakukan NormalizeVehicleType saat order dibuat.
func TestFareEstimate_RejectsUnknownVehicleType(t *testing.T) {
	f := newFareFixture(t)

	code, body := f.estimate(t, estimateBody("helicopter"))
	if code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d: %v", code, body)
	}
	if _, ok := body["allowed_values"]; !ok {
		t.Error("expected response to list allowed_values")
	}
}

func TestFareEstimate_RejectsOutOfRangeCoordinates(t *testing.T) {
	f := newFareFixture(t)

	cases := []struct {
		name string
		body map[string]interface{}
	}{
		{"latitude too high", map[string]interface{}{
			"pickup":      map[string]float64{"lat": 91, "lng": 106.8},
			"destination": map[string]float64{"lat": -6.2, "lng": 106.8},
		}},
		{"longitude too low", map[string]interface{}{
			"pickup":      map[string]float64{"lat": -6.2, "lng": 106.8},
			"destination": map[string]float64{"lat": -6.2, "lng": -181},
		}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			code, body := f.estimate(t, tc.body)
			if code != http.StatusUnprocessableEntity {
				t.Fatalf("expected 422, got %d: %v", code, body)
			}
		})
	}
}

func TestFareEstimate_RequiresAuthentication(t *testing.T) {
	f := newFareFixture(t)

	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPost, "/api/fare/estimate", estimateBody(""), ""))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

// Estimasi terbuka untuk semua peran yang login: angkanya tidak rahasia dan
// driver pun perlu melihatnya.
func TestFareEstimate_AllowsDriverRole(t *testing.T) {
	f := newFareFixture(t)

	driverToken := createUserWithRoleAndLoginInDB(t, f.db, f.router,
		"fare-driver@test.com", models.RoleDriverMotorcycle)

	w := testutil.Do(f.router, testutil.JSONRequest(
		http.MethodPost, "/api/fare/estimate", estimateBody(""), driverToken))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}
