package handlers

import (
	"net/http"
	"time"

	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// HistoryHandler — riwayat yang dibedakan per peran.
//
// Penumpang, driver, dan merchant melihat kejadian yang sama dari sisi yang
// berbeda: satu order yang selesai adalah pengeluaran bagi penumpang,
// pendapatan bagi driver, dan penjualan bagi merchant. Satu endpoint bersama
// memaksa ketiganya memakai bentuk data yang sama dan membuat ringkasan yang
// berarti mustahil dibuat, karena itu jalurnya dipisah di sini.
//
// Scope selalu dihitung dari user pada token, tidak pernah dari parameter
// permintaan, sehingga tidak ada endpoint di berkas ini yang bisa dipakai
// membaca riwayat orang lain.
type HistoryHandler struct {
	db *gorm.DB
}

func NewHistoryHandler(db *gorm.DB) *HistoryHandler {
	return &HistoryHandler{db: db}
}

// ── Helper bersama ───────────────────────────────────────────────────────

// orderSummary — rekap yang menyertai setiap daftar order.
type orderSummary struct {
	TotalOrders int64   `json:"total_orders"`
	Completed   int64   `json:"completed"`
	Cancelled   int64   `json:"cancelled"`
	TotalFare   float64 `json:"total_fare"`
	TotalNet    float64 `json:"total_net"`
}

// listOrders — daftar order dengan filter, pagination, dan rekap.
//
// scope menentukan kolom mana yang mengikat order ke pemanggil (rider_id,
// driver_id, atau merchant_id). Sisanya sama untuk ketiga peran, jadi ditulis
// sekali di sini.
//
// netColumn adalah kolom yang dijumlahkan sebagai "bersih" bagi peran tersebut:
// driver menghitung driver_earning, sedangkan penumpang dan merchant memakai
// fare_amount.
func (h *HistoryHandler) listOrders(c *gin.Context, scope func(*gorm.DB) *gorm.DB, netColumn string) {
	from, to := parseDateRange(c)

	scoped := func() *gorm.DB {
		q := scope(h.db.Model(&models.Order{})).
			Where("orders.created_at BETWEEN ? AND ?", from, to)
		if status := c.Query("status"); status != "" {
			q = q.Where("orders.status = ?", status)
		}
		return q
	}

	var total int64
	if err := scoped().Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch order history"})
		return
	}

	// Rekap dihitung atas seluruh rentang, bukan hanya halaman yang diminta,
	// supaya angkanya tidak berubah-ubah saat pengguna berpindah halaman.
	var summary orderSummary
	if err := scoped().Select(`COUNT(*) AS total_orders,
		        COUNT(*) FILTER (WHERE orders.status = 'completed') AS completed,
		        COUNT(*) FILTER (WHERE orders.status = 'cancelled') AS cancelled,
		        COALESCE(SUM(orders.fare_amount) FILTER (WHERE orders.status = 'completed'), 0) AS total_fare,
		        COALESCE(SUM(orders.` + netColumn + `) FILTER (WHERE orders.status = 'completed'), 0) AS total_net`).
		Scan(&summary).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to summarize order history"})
		return
	}

	page, perPage, offset := paginate(c)

	var orders []models.Order
	if err := scoped().Order("orders.created_at desc").
		Limit(perPage).Offset(offset).Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch order history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"orders":  orders,
		"summary": summary,
		"meta": gin.H{
			"page":     page,
			"per_page": perPage,
			"total":    total,
			"from":     from,
			"to":       to,
		},
	})
}

// listWalletTransactions — riwayat dompet yang dibatasi jenis transaksi
// yang memang relevan bagi peran pemanggil.
//
// Pembatasan ini bukan soal kerahasiaan — seluruh transaksi memang milik user
// yang sama — melainkan agar layar riwayat tiap peran tidak bercampur dengan
// jenis transaksi yang tidak pernah terjadi pada peran itu.
func (h *HistoryHandler) listWalletTransactions(c *gin.Context, allowed []models.TransactionType) {
	userID := c.GetUint(middleware.UserIDKey)
	from, to := parseDateRange(c)

	types := make([]string, 0, len(allowed))
	for _, t := range allowed {
		types = append(types, string(t))
	}

	// Filter type dari klien tetap dihormati, tapi hanya boleh mempersempit
	// daftar yang diizinkan peran ini, tidak melebarkannya.
	if requested := c.Query("type"); requested != "" {
		found := false
		for _, t := range types {
			if t == requested {
				found = true
				break
			}
		}
		if !found {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"error":          "type is not available for this role",
				"allowed_values": types,
			})
			return
		}
		types = []string{requested}
	}

	scoped := func() *gorm.DB {
		q := h.db.Model(&models.WalletTransaction{}).
			Where("user_id = ? AND type IN ?", userID, types).
			Where("created_at BETWEEN ? AND ?", from, to)
		if status := c.Query("status"); status != "" {
			q = q.Where("status = ?", status)
		}
		return q
	}

	var total int64
	if err := scoped().Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve transactions"})
		return
	}

	type txBucket struct {
		Type  models.TransactionType `json:"type"`
		Count int64                  `json:"count"`
		Total float64                `json:"total"`
	}
	var buckets []txBucket
	if err := scoped().Where("status = ?", models.TxStatusSuccess).
		Select("type, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total").
		Group("type").Scan(&buckets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to summarize transactions"})
		return
	}

	page, perPage, offset := paginate(c)

	var transactions []models.WalletTransaction
	if err := scoped().Order("created_at desc").
		Limit(perPage).Offset(offset).Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve transactions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"transactions": transactions,
		"summary":      buckets,
		"meta": gin.H{
			"page":     page,
			"per_page": perPage,
			"total":    total,
			"from":     from,
			"to":       to,
		},
	})
}

// ── Penumpang ────────────────────────────────────────────────────────────

// CustomerOrders — GET /api/customer/orders
func (h *HistoryHandler) CustomerOrders(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)
	h.listOrders(c, func(q *gorm.DB) *gorm.DB {
		return q.Where("orders.rider_id = ?", userID)
	}, "fare_amount")
}

// CustomerWalletHistory — GET /api/customer/wallet/history
func (h *HistoryHandler) CustomerWalletHistory(c *gin.Context) {
	h.listWalletTransactions(c, []models.TransactionType{
		models.TxTypeDeposit,
		models.TxTypePayment,
		models.TxTypeRefund,
		models.TxTypeWithdrawal,
		models.TxTypeTransfer,
	})
}

// ── Driver ───────────────────────────────────────────────────────────────

// DriverOrders — GET /api/driver/orders
func (h *HistoryHandler) DriverOrders(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)
	h.listOrders(c, func(q *gorm.DB) *gorm.DB {
		return q.Where("orders.driver_id = ?", userID)
	}, "driver_earning")
}

// DriverWalletHistory — GET /api/driver/wallet/history
func (h *HistoryHandler) DriverWalletHistory(c *gin.Context) {
	h.listWalletTransactions(c, []models.TransactionType{
		models.TxTypeEarning,
		models.TxTypeFee,
		models.TxTypeBonus,
		models.TxTypeWithdrawal,
		models.TxTypeDisbursed,
	})
}

// DriverEarnings — GET /api/driver/earnings
//
// Rekap pendapatan per rentang tanggal beserta rinciannya per hari, supaya
// driver bisa mencocokkan saldo yang masuk dengan trip yang dikerjakannya.
func (h *HistoryHandler) DriverEarnings(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)
	from, to := parseDateRange(c)

	base := func() *gorm.DB {
		return h.db.Model(&models.Order{}).
			Where("driver_id = ? AND status = ?", userID, models.StatusCompleted).
			Where("completed_at BETWEEN ? AND ?", from, to)
	}

	var totals struct {
		Trips         int64   `json:"trips"`
		GrossFare     float64 `json:"gross_fare"`
		PlatformFee   float64 `json:"platform_fee"`
		DriverEarning float64 `json:"driver_earning"`
	}
	if err := base().Select(`COUNT(*) AS trips,
		        COALESCE(SUM(fare_amount), 0) AS gross_fare,
		        COALESCE(SUM(platform_fee), 0) AS platform_fee,
		        COALESCE(SUM(driver_earning), 0) AS driver_earning`).
		Scan(&totals).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to summarize earnings"})
		return
	}

	type dailyRow struct {
		Day           time.Time `json:"day"`
		Trips         int64     `json:"trips"`
		DriverEarning float64   `json:"driver_earning"`
	}
	var daily []dailyRow
	if err := base().Select(`DATE_TRUNC('day', completed_at) AS day,
		        COUNT(*) AS trips,
		        COALESCE(SUM(driver_earning), 0) AS driver_earning`).
		Group("day").Order("day desc").Scan(&daily).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to summarize earnings"})
		return
	}

	var user models.User
	if err := h.db.Select("balance").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read balance"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"summary":         totals,
		"daily":           daily,
		"current_balance": user.Balance,
		"meta":            gin.H{"from": from, "to": to},
	})
}

// ── Merchant ─────────────────────────────────────────────────────────────

// MerchantOrders — GET /api/merchant/orders
func (h *HistoryHandler) MerchantOrders(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)
	h.listOrders(c, func(q *gorm.DB) *gorm.DB {
		return q.Where("orders.merchant_id = ?", userID)
	}, "fare_amount")
}

// MerchantWalletHistory — GET /api/merchant/wallet/history
func (h *HistoryHandler) MerchantWalletHistory(c *gin.Context) {
	h.listWalletTransactions(c, []models.TransactionType{
		models.TxTypeEarning,
		models.TxTypeRefund,
		models.TxTypeWithdrawal,
		models.TxTypeDisbursed,
	})
}

// MerchantSales — GET /api/merchant/sales
func (h *HistoryHandler) MerchantSales(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)
	from, to := parseDateRange(c)

	base := func() *gorm.DB {
		return h.db.Model(&models.Order{}).
			Where("merchant_id = ? AND status = ?", userID, models.StatusCompleted).
			Where("completed_at BETWEEN ? AND ?", from, to)
	}

	var totals struct {
		Orders  int64   `json:"orders"`
		Revenue float64 `json:"revenue"`
	}
	if err := base().Select(`COUNT(*) AS orders,
		        COALESCE(SUM(fare_amount), 0) AS revenue`).
		Scan(&totals).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to summarize sales"})
		return
	}

	type dailyRow struct {
		Day     time.Time `json:"day"`
		Orders  int64     `json:"orders"`
		Revenue float64   `json:"revenue"`
	}
	var daily []dailyRow
	if err := base().Select(`DATE_TRUNC('day', completed_at) AS day,
		        COUNT(*) AS orders,
		        COALESCE(SUM(fare_amount), 0) AS revenue`).
		Group("day").Order("day desc").Scan(&daily).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to summarize sales"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"summary": totals,
		"daily":   daily,
		"meta":    gin.H{"from": from, "to": to},
	})
}
