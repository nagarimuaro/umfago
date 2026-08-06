package handlers

import (
	"net/http"

	"openjek-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ReportHandler — laporan ringkas untuk dashboard back-office
type ReportHandler struct {
	db *gorm.DB
}

func NewReportHandler(db *gorm.DB) *ReportHandler {
	return &ReportHandler{db: db}
}

// Dashboard — GET /api/admin/reports/dashboard
func (h *ReportHandler) Dashboard(c *gin.Context) {
	from, to := parseDateRange(c)

	type statusCount struct {
		Status models.OrderStatus `json:"status"`
		Count  int64              `json:"count"`
	}
	var byStatus []statusCount
	if err := h.db.Model(&models.Order{}).
		Select("status, COUNT(*) AS count").
		Where("created_at BETWEEN ? AND ?", from, to).
		Group("status").Scan(&byStatus).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to build dashboard"})
		return
	}

	var summary struct {
		TotalOrders  int64
		GrossRevenue float64
		AvgFare      float64
		AvgDistance  float64
	}
	h.db.Model(&models.Order{}).
		Select(`COUNT(*) AS total_orders,
		        COALESCE(SUM(fare_amount), 0) AS gross_revenue,
		        COALESCE(AVG(fare_amount), 0) AS avg_fare,
		        COALESCE(AVG(distance_km), 0) AS avg_distance`).
		Where("status = ? AND completed_at BETWEEN ? AND ?", models.StatusCompleted, from, to).
		Scan(&summary)

	var activeDrivers, totalUsers int64
	h.db.Model(&models.User{}).
		Where("role_code IN ? AND is_active = ? AND is_verified = ?",
			[]string{string(models.RoleDriverMotorcycle), string(models.RoleDriverCar)}, true, true).
		Count(&activeDrivers)
	h.db.Model(&models.User{}).Where("role_code = ?", models.RoleCustomer).Count(&totalUsers)

	c.JSON(http.StatusOK, gin.H{
		"range":            gin.H{"from": from, "to": to},
		"orders_by_status": byStatus,
		"completed": gin.H{
			"total":         summary.TotalOrders,
			"gross_revenue": summary.GrossRevenue,
			"avg_fare":      summary.AvgFare,
			"avg_distance":  summary.AvgDistance,
		},
		"active_drivers":  activeDrivers,
		"total_customers": totalUsers,
	})
}

// Sales — GET /api/admin/reports/sales
//
// Rekap harian order selesai, dipakai tim sales untuk melihat tren.
func (h *ReportHandler) Sales(c *gin.Context) {
	from, to := parseDateRange(c)

	type dailyRow struct {
		Day         string  `json:"day"`
		Orders      int64   `json:"orders"`
		Gross       float64 `json:"gross"`
		PlatformFee float64 `json:"platform_fee"`
	}

	var rows []dailyRow
	if err := h.db.Model(&models.Order{}).
		Select(`TO_CHAR(completed_at, 'YYYY-MM-DD') AS day,
		        COUNT(*) AS orders,
		        COALESCE(SUM(fare_amount), 0) AS gross,
		        COALESCE(SUM(platform_fee), 0) AS platform_fee`).
		Where("status = ? AND completed_at BETWEEN ? AND ?", models.StatusCompleted, from, to).
		Group("day").Order("day asc").Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to build sales report"})
		return
	}

	// Merchant teratas berdasarkan jumlah order yang selesai belum bisa dihitung
	// selama modul pesan-antar makanan belum menautkan order ke merchant.
	c.JSON(http.StatusOK, gin.H{
		"range": gin.H{"from": from, "to": to},
		"daily": rows,
	})
}

// TopDrivers — GET /api/admin/reports/top-drivers
func (h *ReportHandler) TopDrivers(c *gin.Context) {
	from, to := parseDateRange(c)
	_, perPage, _ := paginate(c)

	type driverRow struct {
		DriverID uint    `json:"driver_id"`
		Name     string  `json:"name"`
		Trips    int64   `json:"trips"`
		Earning  float64 `json:"earning"`
		Rating   float64 `json:"rating"`
	}

	var rows []driverRow
	if err := h.db.Model(&models.Order{}).
		Select(`orders.driver_id,
		        users.name,
		        COUNT(*) AS trips,
		        COALESCE(SUM(orders.driver_earning), 0) AS earning,
		        COALESCE(AVG(orders.customer_rating), 0) AS rating`).
		Joins("JOIN users ON users.id = orders.driver_id").
		Where("orders.status = ? AND orders.completed_at BETWEEN ? AND ?", models.StatusCompleted, from, to).
		Group("orders.driver_id, users.name").
		Order("trips DESC").
		Limit(perPage).
		Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to build driver report"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"range":   gin.H{"from": from, "to": to},
		"drivers": rows,
	})
}
