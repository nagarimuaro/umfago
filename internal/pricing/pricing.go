package pricing

import (
	"context"
	"math"
	"time"

	"openjek-backend/internal/repository"
)

// Kunci setting yang dipakai perhitungan tarif
const (
	KeyPerKmPrice    = "fare.per_km_price_idr"
	KeyMinDistance   = "fare.min_distance_km"
	KeyPlatformFee   = "fare.platform_fee_percent"
	KeyCustomerFee   = "fare.customer_fee_percent"
	KeyMerchantFee   = "fare.merchant_fee_percent"
	KeyMinBalance    = "wallet.min_balance_idr"
	KeySearchRadius  = "matching.search_radius_km"
	KeyMaxCandidates = "matching.max_driver_candidates"
	KeyOfferTimeout  = "matching.offer_timeout_seconds"
)

// Nilai cadangan bila setting belum ada di database
const (
	defaultPerKmPrice    = 3000.0
	defaultMinDistance   = 3.0
	defaultPlatformFee   = 20.0
	defaultCustomerFee   = 0.0
	defaultMerchantFee   = 0.0
	defaultMinBalance    = -10000.0
	defaultSearchRadius  = 5.0
	defaultMaxCandidates = 10.0
	defaultOfferTimeout  = 30.0
)

// Quote — rincian tarif satu order.
//
// Tarif hanya terdiri dari satu unsur: jarak tertagih dikali tarif per kilometer.
// Tidak ada tarif dasar yang berdiri sendiri, dan tidak ada tarif minimum yang
// disimpan dalam rupiah. Tarif terendah muncul dengan sendirinya dari jarak
// minimum: MinFare selalu sama dengan MinDistanceKm x PerKmPrice, sehingga
// mengubah tarif per kilometer atau jarak minimum dari dashboard langsung
// menggeser tarif terendah tanpa ada angka kedua yang harus ikut disunting —
// dan tanpa dua sumber kebenaran yang bisa berselisih.
//
// Total adalah tarif perjalanan sebelum biaya layanan penumpang. Yang benar-benar
// dibayar penumpang adalah TotalCharged, yaitu Total ditambah CustomerFee.
// Keduanya dipisah supaya layar aplikasi bisa menampilkan rincian, dan supaya
// pembagian pendapatan driver tetap dihitung dari tarif perjalanan saja —
// biaya layanan penumpang tidak pernah menjadi bagian pendapatan driver.
// MinTotalCharged mengikuti pola yang sama: tarif terendah beserta biaya
// layanannya, yaitu jumlah paling kecil yang mungkin dibayar penumpang.
//
// DistanceKm adalah jarak sesungguhnya, sedangkan ChargedDistanceKm adalah jarak
// yang dipakai menghitung tarif. Keduanya berbeda untuk perjalanan yang lebih
// pendek dari MinDistanceKm: perjalanan sedekat itu tetap ditagih sejauh jarak
// minimum. Jarak asli tetap dibawa supaya aplikasi bisa menerangkan selisihnya
// kepada penumpang alih-alih menampilkan angka yang tidak cocok dengan peta.
type Quote struct {
	DistanceKm         float64 `json:"distance_km"`
	ChargedDistanceKm  float64 `json:"charged_distance_km"`
	MinDistanceKm      float64 `json:"min_distance_km"`
	MinDistanceApplied bool    `json:"min_distance_applied"`

	PerKmPrice float64 `json:"per_km_price"`
	Total      float64 `json:"total"`
	MinFare    float64 `json:"min_fare"`

	CustomerFee        float64 `json:"customer_fee"`
	CustomerFeePercent float64 `json:"customer_fee_percent"`
	TotalCharged       float64 `json:"total_charged"`
	MinTotalCharged    float64 `json:"min_total_charged"`
}

// Split — pembagian satu order menjadi bagian driver, merchant, dan perusahaan.
//
// Gross adalah tarif perjalanan (Quote.Total setelah potongan promo), bukan
// jumlah yang dibayar penumpang. PlatformFee dipotong dari bagian driver,
// MerchantFee dari bagian merchant, dan CustomerFee sudah ditagih di muka saat
// order dibuat. CompanyRevenue menjumlahkan ketiganya.
type Split struct {
	Gross       float64 `json:"gross"`
	PlatformFee float64 `json:"platform_fee"`
	DriverNet   float64 `json:"driver_net"`
	FeePercent  float64 `json:"fee_percent"`

	MerchantFee        float64 `json:"merchant_fee"`
	MerchantFeePercent float64 `json:"merchant_fee_percent"`

	CustomerFee    float64 `json:"customer_fee"`
	CompanyRevenue float64 `json:"company_revenue"`
}

// Calculator — menghitung tarif dari setting dinamis, sehingga tarif bisa diubah
// dari dashboard admin tanpa mengubah kode atau restart server.
type Calculator struct {
	settings *repository.SettingsRepository
}

func NewCalculator(settings *repository.SettingsRepository) *Calculator {
	return &Calculator{settings: settings}
}

// Quote — hitung tarif untuk jarak tertentu.
//
// Rumus: jarak tertagih x tarif per kilometer. Biaya layanan penumpang dihitung
// dari hasil itu dan ditambahkan di atasnya.
//
// Jarak tertagih tidak pernah lebih kecil dari fare.min_distance_km. Perjalanan
// 1 km ditagih seperti perjalanan 3 km, karena order sedekat itu tetap menuntut
// waktu dan bahan bakar yang tidak sebanding dengan tarifnya. Aturan itu juga
// yang menetapkan tarif terendah: MinFare adalah jarak minimum dikali tarif per
// kilometer, jadi keduanya bergerak bersama begitu salah satunya diubah admin.
func (c *Calculator) Quote(ctx context.Context, distanceKm float64) Quote {
	perKm := c.settings.GetFloat(ctx, KeyPerKmPrice, defaultPerKmPrice)
	if perKm < 0 {
		perKm = 0
	}
	minDistance := c.settings.GetFloat(ctx, KeyMinDistance, defaultMinDistance)
	if minDistance < 0 {
		minDistance = 0
	}

	chargedDistance := distanceKm
	minDistanceApplied := false
	if chargedDistance < minDistance {
		chargedDistance = minDistance
		minDistanceApplied = true
	}

	// Bulatkan ke rupiah utuh — tidak ada pecahan rupiah dalam praktik
	total := math.Round(chargedDistance * perKm)
	minFare := math.Round(minDistance * perKm)

	customerPercent := clampPercent(c.settings.GetFloat(ctx, KeyCustomerFee, defaultCustomerFee))
	customerFee := math.Round(total * customerPercent / 100)
	minCustomerFee := math.Round(minFare * customerPercent / 100)

	return Quote{
		DistanceKm:         distanceKm,
		ChargedDistanceKm:  chargedDistance,
		MinDistanceKm:      minDistance,
		MinDistanceApplied: minDistanceApplied,

		PerKmPrice: perKm,
		Total:      total,
		MinFare:    minFare,

		CustomerFee:        customerFee,
		CustomerFeePercent: customerPercent,
		TotalCharged:       total + customerFee,
		MinTotalCharged:    minFare + minCustomerFee,
	}
}

// CustomerFee — biaya layanan penumpang untuk sebuah tarif.
//
// Dipisahkan dari Quote karena tarif final bisa berubah setelah potongan promo:
// biaya layanan dihitung dari tarif yang benar-benar berlaku, bukan dari tarif
// sebelum diskon.
func (c *Calculator) CustomerFee(ctx context.Context, fare float64) (fee, percent float64) {
	percent = clampPercent(c.settings.GetFloat(ctx, KeyCustomerFee, defaultCustomerFee))
	return math.Round(fare * percent / 100), percent
}

// Split — bagi satu order menjadi bagian driver, merchant, dan perusahaan.
//
// customerFee diteruskan dari nilai yang sudah ditagih saat order dibuat, bukan
// dihitung ulang di sini: persentasenya bisa saja berubah di antara kedua saat
// itu, dan yang benar adalah angka yang sungguh-sungguh dibayar penumpang.
// isMerchantOrder menentukan apakah komisi merchant ikut dihitung.
func (c *Calculator) Split(ctx context.Context, gross, customerFee float64, isMerchantOrder bool) Split {
	percent := clampPercent(c.settings.GetFloat(ctx, KeyPlatformFee, defaultPlatformFee))
	fee := math.Round(gross * percent / 100)

	merchantPercent := 0.0
	merchantFee := 0.0
	if isMerchantOrder {
		merchantPercent = clampPercent(c.settings.GetFloat(ctx, KeyMerchantFee, defaultMerchantFee))
		merchantFee = math.Round(gross * merchantPercent / 100)
	}

	return Split{
		Gross:       gross,
		PlatformFee: fee,
		DriverNet:   gross - fee,
		FeePercent:  percent,

		MerchantFee:        merchantFee,
		MerchantFeePercent: merchantPercent,

		CustomerFee:    customerFee,
		CompanyRevenue: fee + merchantFee + customerFee,
	}
}

// MinBalance — batas saldo terbawah yang boleh dicapai driver dan merchant.
//
// Nilainya negatif: komisi order tunai boleh menembus nol sampai batas ini,
// sehingga driver tidak perlu deposit lebih dulu untuk mulai bekerja. Nilai
// positif dari setting dianggap salah ketik dan dinegasikan, karena batas
// terbawah yang lebih tinggi dari nol akan menutup akun yang saldonya normal.
func (c *Calculator) MinBalance(ctx context.Context) float64 {
	v := c.settings.GetFloat(ctx, KeyMinBalance, defaultMinBalance)
	if v > 0 {
		return -v
	}
	return v
}

// clampPercent — jaga persentase di rentang 0–100.
// Setting diisi manusia lewat dashboard; nilai di luar rentang menghasilkan
// pembagian yang tidak masuk akal (fee negatif, atau driver berutang lebih
// besar dari tarifnya sendiri).
func clampPercent(p float64) float64 {
	if p < 0 {
		return 0
	}
	if p > 100 {
		return 100
	}
	return p
}

// SearchRadiusKm — radius pencarian driver dari setting matching.search_radius_km
func (c *Calculator) SearchRadiusKm(ctx context.Context) float64 {
	radius := c.settings.GetFloat(ctx, KeySearchRadius, defaultSearchRadius)
	if radius <= 0 {
		return defaultSearchRadius
	}
	return radius
}

// MaxDriverCandidates — jumlah kandidat driver dari setting matching.max_driver_candidates
func (c *Calculator) MaxDriverCandidates(ctx context.Context) int {
	n := int(c.settings.GetFloat(ctx, KeyMaxCandidates, defaultMaxCandidates))
	if n <= 0 {
		return int(defaultMaxCandidates)
	}
	return n
}

// OfferTimeout — lama sebuah tawaran order menunggu jawaban driver, dari setting
// matching.offer_timeout_seconds.
//
// Nilai ini dibaca sekali saat tawaran dibuat lalu disimpan sebagai expires_at,
// sehingga mengubah setting tidak memindahkan tenggat tawaran yang sudah beredar.
func (c *Calculator) OfferTimeout(ctx context.Context) time.Duration {
	seconds := c.settings.GetFloat(ctx, KeyOfferTimeout, defaultOfferTimeout)
	if seconds <= 0 {
		seconds = defaultOfferTimeout
	}
	return time.Duration(seconds * float64(time.Second))
}
