package handlers

import (
	"net/http"

	"openjek-backend/internal/models"
	"openjek-backend/internal/pricing"

	"github.com/gin-gonic/gin"
)

// estimateValidSeconds — lama estimasi pantas ditampilkan di layar sebelum
// aplikasi sebaiknya meminta angka baru. Estimasi tidak dikunci: tarif final
// tetap dihitung ulang saat order dibuat, memakai kalkulator yang sama.
const estimateValidSeconds = 120

// FareHandler — estimasi tarif sebelum penumpang memesan.
type FareHandler struct {
	pricing *pricing.Calculator
}

func NewFareHandler(calc *pricing.Calculator) *FareHandler {
	return &FareHandler{pricing: calc}
}

// coordinate — satu titik pada peta
type coordinate struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// valid — koordinat berada di dalam rentang yang mungkin ada di bumi
func (p coordinate) valid() bool {
	return p.Lat >= -90 && p.Lat <= 90 && p.Lng >= -180 && p.Lng <= 180
}

// Estimate — POST /api/fare/estimate
func (h *FareHandler) Estimate(c *gin.Context) {
	var req struct {
		Pickup      coordinate `json:"pickup" binding:"required"`
		Destination coordinate `json:"destination" binding:"required"`
		VehicleType string     `json:"vehicle_type"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	if !req.Pickup.valid() || !req.Destination.valid() {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Coordinates are out of range"})
		return
	}

	// Jenis kendaraan yang tidak dikenal ditolak terang-terangan, sama seperti
	// pada pembuatan order: penumpang yang mengetik jenis kendaraan keliru lebih
	// baik tahu daripada menerima harga motor untuk perjalanan mobil.
	vehicleType := req.VehicleType
	if vehicleType == "" {
		vehicleType = models.VehicleMotorcycle
	}
	if vehicleType != models.VehicleMotorcycle && vehicleType != models.VehicleCar {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":          "vehicle_type must be motorcycle or car",
			"allowed_values": []string{models.VehicleMotorcycle, models.VehicleCar},
		})
		return
	}

	distance := haversine(req.Pickup.Lat, req.Pickup.Lng, req.Destination.Lat, req.Destination.Lng)
	quote := h.pricing.Quote(c.Request.Context(), distance)

	// estimated_fare tetap berisi tarif perjalanan saja supaya klien lama tidak
	// berubah artinya; total_charged adalah jumlah yang benar-benar akan ditagih,
	// yaitu tarif ditambah biaya layanan penumpang. Selama customer_fee_percent
	// masih 0, keduanya bernilai sama.
	//
	// distance_km adalah jarak sesungguhnya, charged_distance_km jarak yang
	// dipakai menghitung tarif. Keduanya berbeda hanya untuk perjalanan yang
	// lebih pendek dari jarak minimum.
	//
	// min_fare dan min_total_charged dikirim supaya aplikasi bisa menampilkan
	// tarif terendah yang berlaku sekarang tanpa menghitungnya sendiri — angkanya
	// berubah setiap kali admin mengubah tarif per km atau jarak minimum.
	c.JSON(http.StatusOK, gin.H{
		"distance_km":          quote.DistanceKm,
		"charged_distance_km":  quote.ChargedDistanceKm,
		"min_distance_km":      quote.MinDistanceKm,
		"min_distance_applied": quote.MinDistanceApplied,
		"per_km_price":         quote.PerKmPrice,
		"total":                quote.Total,
		"estimated_fare":       quote.Total,
		"min_fare":             quote.MinFare,
		"customer_fee":         quote.CustomerFee,
		"customer_fee_percent": quote.CustomerFeePercent,
		"total_charged":        quote.TotalCharged,
		"min_total_charged":    quote.MinTotalCharged,
		"vehicle_type":         vehicleType,
		"valid_for_seconds":    estimateValidSeconds,
	})
}
