package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"time"

	"openjek-backend/internal/broker"
	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"
	"openjek-backend/internal/pricing"
	"openjek-backend/internal/repository"
	ws "openjek-backend/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrderHandler struct {
	db       *gorm.DB
	rmq      *broker.RabbitMQ
	pricing  *pricing.Calculator
	wallet   *repository.WalletRepository
	hub      *ws.Hub
	notif    *repository.NotificationRepository
	dispatch func(payload map[string]interface{})
}

func (h *OrderHandler) SetDispatcher(fn func(payload map[string]interface{})) {
	h.dispatch = fn
}

func NewOrderHandler(
	db *gorm.DB,
	rmq *broker.RabbitMQ,
	calc *pricing.Calculator,
	wallet *repository.WalletRepository,
	hub *ws.Hub,
	notif *repository.NotificationRepository,
) *OrderHandler {
	return &OrderHandler{
		db:      db,
		rmq:     rmq,
		pricing: calc,
		wallet:  wallet,
		hub:     hub,
		notif:   notif,
	}
}

// ── Helpers ─────────────────────────────────────────────────────────────

// haversine Distance calculation (in km)
func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371 // Earth radius in km
	dLat := (lat2 - lat1) * math.Pi / 180.0
	dLon := (lon2 - lon1) * math.Pi / 180.0
	lat1 = lat1 * math.Pi / 180.0
	lat2 = lat2 * math.Pi / 180.0

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1)*math.Cos(lat2)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

// paginate — baca parameter page & per_page dari query string.
// Dibatasi maksimum 100 baris agar satu permintaan tidak bisa menarik
// seluruh tabel order.
func paginate(c *gin.Context) (page, perPage, offset int) {
	page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ = strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}
	return page, perPage, (page - 1) * perPage
}

// notifyUser — kirim event WebSocket bila hub tersedia
func (h *OrderHandler) notifyUser(userID uint, event, orderUUID string) {
	if h.hub == nil || event == "" {
		return
	}
	payload, err := json.Marshal(map[string]string{"order_uuid": orderUUID})
	if err != nil {
		return
	}
	h.hub.SendToUser(userID, ws.Message{Type: event, Payload: payload})
}

// pushNotif — simpan notifikasi yang bertahan setelah aplikasi ditutup.
//
// Terpisah dari notifyUser: yang satu adalah sinyal sesaat untuk layar yang
// sedang terbuka, yang lain adalah catatan yang masih bisa dibaca besok pagi.
func (h *OrderHandler) pushNotif(userID uint, kind, title, body, orderUUID string) {
	if h.notif == nil {
		return
	}
	h.notif.Push(userID, kind, title, body, map[string]any{"order_uuid": orderUUID})
}

// ── Handlers ─────────────────────────────────────────────────────────────

// CreateOrder — POST /api/orders
func (h *OrderHandler) CreateOrder(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var req struct {
		ServiceType string `json:"service_type" binding:"required"` // ride, car, food
		// Koordinat memakai penunjuk, bukan float64 biasa: khatulistiwa melintasi
		// Sumatra dan Kalimantan, jadi lintang 0 adalah titik yang sah. Dengan
		// float64 biasa, `binding:"required"` akan menolaknya karena tidak bisa
		// membedakan "tidak dikirim" dari "bernilai nol".
		PickupLat      *float64 `json:"pickup_lat" binding:"required"`
		PickupLon      *float64 `json:"pickup_lon" binding:"required"`
		PickupAddress  string   `json:"pickup_address"`
		DropoffLat     *float64 `json:"dropoff_lat" binding:"required"`
		DropoffLon     *float64 `json:"dropoff_lon" binding:"required"`
		DropoffAddress string   `json:"dropoff_address"`
		PaymentMethod  string   `json:"payment_method" binding:"required"` // cash, wallet
		// PromoCode adalah nama yang dipakai sekarang; VoucherCode dipertahankan
		// untuk klien lama yang sudah beredar. Keduanya mengisi kolom yang sama.
		PromoCode   string `json:"promo_code"`
		VoucherCode string `json:"voucher_code"`
		// MerchantID diisi untuk order yang berasal dari sebuah merchant
		// (pesan-antar makanan). Kosong untuk order antar-jemput biasa.
		MerchantID *uint `json:"merchant_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	if req.PaymentMethod != string(models.PaymentCash) && req.PaymentMethod != string(models.PaymentWallet) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "payment_method must be cash or wallet"})
		return
	}

	// Rentangnya diperiksa di sini, bukan hanya di endpoint estimasi tarif: klien
	// bisa melewati /api/fare/estimate dan langsung memesan. Koordinat di luar
	// rentang membuat haversine menghasilkan jarak ngawur yang tersimpan sebagai
	// tarif, dan membuat Redis menolak GEOSEARCH sehingga order tersangkut di
	// status searching tanpa pemberitahuan apa pun ke pemesan.
	pickup := coordinate{Lat: *req.PickupLat, Lng: *req.PickupLon}
	dropoff := coordinate{Lat: *req.DropoffLat, Lng: *req.DropoffLon}
	if !pickup.valid() || !dropoff.valid() {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Coordinates are out of range"})
		return
	}

	// Merchant yang ditunjuk harus benar-benar merchant yang sudah disetujui.
	// Tanpa pemeriksaan ini, riwayat penjualan merchant bisa diisi order palsu
	// yang menunjuk ke akun mana pun.
	if req.MerchantID != nil {
		var merchantCount int64
		if err := h.db.Model(&models.MerchantProfile{}).
			Where("user_id = ? AND is_active = ?", *req.MerchantID, true).
			Count(&merchantCount).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate merchant"})
			return
		}
		if merchantCount == 0 {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Merchant not found or not active"})
			return
		}
	}

	// 1. Kalkulasi jarak & tarif dari setting dinamis
	distance := haversine(pickup.Lat, pickup.Lng, dropoff.Lat, dropoff.Lng)
	quote := h.pricing.Quote(c.Request.Context(), distance)
	vehicleType := models.NormalizeVehicleType(req.ServiceType)
	// service_type yang tidak dikenal ditolak, tidak dianggap motor. Estimasi
	// tarif sudah menolak nilai asing, jadi menerimanya di sini berarti penumpang
	// bisa melihat harga mobil lalu menerima order motor dengan tarif mobil.
	if vehicleType == "" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":          "service_type is not recognized",
			"allowed_values": models.ServiceTypes,
		})
		return
	}

	promoCode := req.PromoCode
	if promoCode == "" {
		promoCode = req.VoucherCode
	}

	serviceType := req.ServiceType
	if serviceType == "" {
		serviceType = "ride"
	}

	order := models.Order{
		UUID:           uuid.New().String(),
		RiderID:        userID,
		MerchantID:     req.MerchantID,
		Status:         models.StatusSearching,
		PickupLat:      pickup.Lat,
		PickupLon:      pickup.Lng,
		PickupAddress:  req.PickupAddress,
		DropoffLat:     dropoff.Lat,
		DropoffLon:     dropoff.Lng,
		DropoffAddress: req.DropoffAddress,
		DistanceKm:     distance,
		FareAmount:     quote.Total,
		PaymentMethod:  models.PaymentMethod(req.PaymentMethod),
		VehicleType:    vehicleType,
		ServiceType:    serviceType,
		VoucherCode:    models.NormalizeCode(promoCode),
	}

	// 2. Promo, potong saldo, dan simpan order dalam satu transaksi, sehingga
	// saldo tidak pernah terpotong tanpa order yang menyertainya dan promo tidak
	// pernah tercatat terpakai oleh order yang gagal dibuat.
	var promoErr error
	err := h.db.Transaction(func(tx *gorm.DB) error {
		var promo *models.Promo
		var discount float64

		if promoCode != "" {
			// Baris promo dikunci sepanjang transaksi. Tanpa kunci ini, dua
			// permintaan bersamaan bisa sama-sama lolos pemeriksaan kuota dan
			// membuat used_count melewati quota.
			var locked models.Promo
			if err := tx.Clauses(lockForUpdate()).
				Where("code = ?", models.NormalizeCode(promoCode)).
				First(&locked).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					promoErr = errPromoNotFound
					return promoErr
				}
				return err
			}

			var err error
			promo, discount, err = resolvePromo(tx, promoCode, userID, quote.Total)
			if err != nil {
				if status, _ := promoErrorResponse(err); status != 0 {
					promoErr = err
				}
				return err
			}

			order.PromoID = &promo.ID
			order.PromoDiscount = discount
			order.FareAmount = quote.Total - discount
		}

		// CustomerFee dihitung dari tarif yang sudah dipotong promo, bukan dari
		// quote awal: persentasenya bisa berubah antara waktu estimasi dan waktu
		// order dibuat, dan yang benar adalah tarif yang benar-benar berlaku.
		customerFee, _ := h.pricing.CustomerFee(c.Request.Context(), order.FareAmount)
		order.CustomerFee = customerFee

		if order.PaymentMethod == models.PaymentWallet {
			totalCharged := order.FareAmount + order.CustomerFee

			// Penumpang ditagih tarif penuh termasuk biaya layanan
			if _, err := h.wallet.Debit(tx, repository.Entry{
				UserID:    userID,
				Amount:    totalCharged,
				Type:      models.TxTypePayment,
				OrderUUID: order.UUID,
				Note:      "Pembayaran order " + order.UUID,
			}); err != nil {
				return err
			}

			// Dana dititipkan ke akun perusahaan sampai order selesai
			companyID, err := repository.NewCompanyAccount(h.db).Ensure(tx)
			if err != nil {
				return err
			}
			if _, err := h.wallet.Credit(tx, repository.Entry{
				UserID:    companyID,
				Amount:    totalCharged,
				Type:      models.TxTypeEscrow,
				OrderUUID: order.UUID,
				Note:      "Titipan dana order " + order.UUID,
			}); err != nil {
				return err
			}
		}

		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		if promo == nil {
			return nil
		}

		// Pemakaian dicatat dan kuota dinaikkan di dalam transaksi yang sama,
		// sehingga order yang gagal berarti promo ikut batal terpakai.
		if err := tx.Create(&models.PromoUsage{
			PromoID:   promo.ID,
			UserID:    userID,
			OrderUUID: order.UUID,
			Discount:  discount,
		}).Error; err != nil {
			return err
		}
		return tx.Model(&models.Promo{}).Where("id = ?", promo.ID).
			Update("used_count", gorm.Expr("used_count + 1")).Error
	})

	if promoErr != nil {
		status, msg := promoErrorResponse(promoErr)
		c.JSON(status, gin.H{"error": msg})
		return
	}
	if errors.Is(err, repository.ErrInsufficientBalance) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient wallet balance"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	// 3. Publish Event ke RabbitMQ (atau langsung ke MatchingWorker bila RabbitMQ tidak aktif)
	dispatchPayload := map[string]interface{}{
		"order_uuid":      order.UUID,
		"rider_id":        order.RiderID,
		"pickup_lat":      order.PickupLat,
		"pickup_lon":      order.PickupLon,
		"pickup_address":  order.PickupAddress,
		"dropoff_lat":     order.DropoffLat,
		"dropoff_lon":     order.DropoffLon,
		"dropoff_address": order.DropoffAddress,
		"distance_km":     order.DistanceKm,
		"fare_amount":     order.FareAmount,
		"vehicle_type":    order.VehicleType,
	}
	if h.rmq != nil {
		_ = h.rmq.Publish(c.Request.Context(), broker.EventOrderCreated, dispatchPayload)
	} else if h.dispatch != nil {
		go h.dispatch(dispatchPayload)
	}

	// Biaya layanan pada quote dihitung dari tarif sebelum promo; yang benar
	// adalah nilai yang tersimpan pada order.
	quote.CustomerFee = order.CustomerFee
	quote.TotalCharged = order.FareAmount + order.CustomerFee

	resp := gin.H{
		"message": "Order created, searching for driver",
		"order":   order,
		"fare":    quote,
	}
	if order.PromoDiscount > 0 {
		resp["promo"] = gin.H{
			"code":            order.VoucherCode,
			"discount_amount": order.PromoDiscount,
			"final_fare":      order.FareAmount,
		}
	}
	c.JSON(http.StatusCreated, resp)
}

// AcceptOrder — PUT /api/orders/:uuid/accept (Oleh Driver)
func (h *OrderHandler) AcceptOrder(c *gin.Context) {
	uuidParam := c.Param("uuid")

	driver := middleware.GetCurrentUserFromCtx(c)
	if driver == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Driver harus lolos verifikasi sebelum boleh mengambil penumpang.
	if !driver.IsVerified {
		c.JSON(http.StatusForbidden, gin.H{"error": "Driver account is not verified yet"})
		return
	}

	// Driver motor tidak boleh mengambil order mobil, dan sebaliknya.
	vehicleType := models.VehicleTypeForRole(driver.RoleCode)
	if vehicleType == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Active role cannot accept orders"})
		return
	}

	// Saldo yang sudah menembus batas utang menutup order berikutnya. Diperiksa
	// di sini dan bukan hanya saat driver menyalakan status online, karena batas
	// itu bisa tercapai justru di tengah sesi kerja: komisi order tunai yang baru
	// saja selesai bisa membuat saldo menyeberang batas.
	floor := h.pricing.MinBalance(c.Request.Context())
	if driver.Balance <= floor {
		c.JSON(http.StatusForbidden, gin.H{
			"error":           "Your balance has reached the minimum limit",
			"current_balance": driver.Balance,
			"min_balance":     floor,
			"action_required": "Please deposit to continue",
		})
		return
	}

	// Satu driver hanya boleh memegang satu order aktif dalam satu waktu.
	var ongoing int64
	h.db.Model(&models.Order{}).
		Where("driver_id = ? AND status IN ?", driver.ID,
			[]models.OrderStatus{models.StatusAccepted, models.StatusArrived, models.StatusInProgress}).
		Count(&ongoing)
	if ongoing > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "You still have an ongoing order"})
		return
	}

	// Pengecekan Race Condition menggunakan Optimistic Concurrency:
	// update hanya berhasil bila order masih 'searching' dan jenis kendaraannya cocok.
	//
	// Perubahan order dan penandaan tawaran dijalankan dalam satu transaksi agar
	// catatan tawaran tidak pernah menyimpang dari keadaan order.
	err := h.db.Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&models.Order{}).
			Where("uuid = ? AND status = ? AND vehicle_type = ?", uuidParam, models.StatusSearching, vehicleType).
			Updates(map[string]interface{}{
				"status":      models.StatusAccepted,
				"driver_id":   driver.ID,
				"accepted_at": time.Now(),
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return errOrderUnavailable
		}

		// Tawaran yang diterima ditandai, bila memang ada. Driver bisa juga
		// mengambil order tanpa baris tawaran (misalnya order yang disiarkan
		// tanpa lewat pencarian), dan itu bukan kegagalan.
		return tx.Model(&models.OrderOffer{}).
			Where("order_uuid = ? AND driver_id = ?", uuidParam, driver.ID).
			Update("status", models.OfferAccepted).Error
	})

	if errors.Is(err, errOrderUnavailable) {
		c.JSON(http.StatusConflict, gin.H{"error": "Order no longer available, already taken, or vehicle type mismatch"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept order"})
		return
	}

	// Ambil data order terbaru untuk notifikasi
	var order models.Order
	if err := h.db.Where("uuid = ?", uuidParam).First(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load order"})
		return
	}

	// Beritahu Rider (Customer) bahwa order diterima
	h.notifyUser(order.RiderID, "order_accepted", order.UUID)
	h.pushNotif(order.RiderID, models.NotifOrderAccepted,
		"Driver ditemukan",
		"Driver sedang menuju titik penjemputan Anda.", order.UUID)

	c.JSON(http.StatusOK, gin.H{"message": "Order accepted", "order": order})
}

// RejectOrder — PUT /api/orders/:uuid/reject (Oleh Driver)
//
// Menolak tidak mengubah status order: order tetap 'searching' dan pencarian
// berlanjut ke kandidat lain. Yang berubah hanya baris tawaran milik driver ini,
// sehingga ia tidak akan ditawari order yang sama lagi.
func (h *OrderHandler) RejectOrder(c *gin.Context) {
	uuidParam := c.Param("uuid")

	driverID := c.GetUint(middleware.UserIDKey)
	if driverID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Alasan bersifat opsional; badan permintaan yang kosong tetap sah.
	var req struct {
		Reason string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&req)
	reason := req.Reason
	if len(reason) > 100 {
		reason = reason[:100]
	}

	var order models.Order

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("uuid = ?", uuidParam).First(&order).Error; err != nil {
			return err
		}

		// Driver hanya boleh menolak order yang memang ditawarkan kepadanya.
		// Tanpa syarat ini, endpoint ini bisa dipakai untuk menebak keberadaan
		// order milik orang lain.
		var offer models.OrderOffer
		if err := tx.Clauses(lockForUpdate()).
			Where("order_uuid = ? AND driver_id = ?", uuidParam, driverID).
			First(&offer).Error; err != nil {
			return err
		}

		if offer.Status != models.OfferOffered {
			return errOfferAlreadyAnswered
		}
		if order.Status != models.StatusSearching {
			return errOrderUnavailable
		}

		return tx.Model(&models.OrderOffer{}).
			Where("id = ?", offer.ID).
			Updates(map[string]interface{}{
				"status": models.OfferRejected,
				"reason": reason,
			}).Error
	})

	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found or was never offered to you"})
		return
	case errors.Is(err, errOfferAlreadyAnswered):
		c.JSON(http.StatusConflict, gin.H{"error": "You have already responded to this offer"})
		return
	case errors.Is(err, errOrderUnavailable):
		// Pesan dibedakan supaya aplikasi driver bisa menjelaskan keadaannya
		// alih-alih menampilkan kegagalan yang sama untuk dua sebab berbeda.
		msg := "Order is no longer searching for a driver"
		if order.DriverID != nil {
			msg = "Order has already been taken by another driver"
		}
		c.JSON(http.StatusConflict, gin.H{"error": msg})
		return
	case err != nil:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject order"})
		return
	}

	// Cari kandidat berikutnya. Event yang sama dengan saat order dibuat dipakai
	// ulang karena worker sudah menyaring driver yang pernah ditawari, sehingga
	// pengulangan tidak mengganggu orang yang sama dua kali.
	dispatchPayload := map[string]interface{}{
		"order_uuid":      order.UUID,
		"rider_id":        order.RiderID,
		"pickup_lat":      order.PickupLat,
		"pickup_lon":      order.PickupLon,
		"pickup_address":  order.PickupAddress,
		"dropoff_lat":     order.DropoffLat,
		"dropoff_lon":     order.DropoffLon,
		"dropoff_address": order.DropoffAddress,
		"distance_km":     order.DistanceKm,
		"fare_amount":     order.FareAmount,
		"vehicle_type":    order.VehicleType,
	}
	if h.rmq != nil {
		_ = h.rmq.Publish(c.Request.Context(), broker.EventOrderCreated, dispatchPayload)
	} else if h.dispatch != nil {
		go h.dispatch(dispatchPayload)
	}

	c.JSON(http.StatusOK, gin.H{
		"uuid":                    order.UUID,
		"status":                  order.Status,
		"rejected_by_this_driver": true,
	})
}

// UpdateOrderStatus — PUT /api/orders/:uuid/status (arrive, start, complete)
func (h *OrderHandler) UpdateOrderStatus(c *gin.Context) {
	driverID := c.GetUint(middleware.UserIDKey)
	uuidParam := c.Param("uuid")

	var req struct {
		Action string `json:"action" binding:"required"` // arrive, start, complete, cancel
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	var (
		riderID uint
		wsEvent string
		split   pricing.Split
		// forcedOffline mengumpulkan pihak yang saldonya menembus batas selama
		// transaksi ini, untuk diberi tahu setelah transaksi berhasil disimpan.
		forcedOffline []uint
	)

	// Seluruh perubahan status dan mutasi saldo dijalankan dalam satu transaksi
	// dengan baris order dikunci, sehingga dua permintaan bersamaan tidak bisa
	// menyelesaikan order yang sama dua kali (dan membayar driver dua kali).
	err := h.db.Transaction(func(tx *gorm.DB) error {
		var order models.Order
		if err := tx.Clauses(lockForUpdate()).
			Where("uuid = ? AND driver_id = ?", uuidParam, driverID).
			First(&order).Error; err != nil {
			return err
		}

		riderID = order.RiderID
		now := time.Now()
		updates := map[string]interface{}{}

		switch req.Action {
		case "arrive":
			if order.Status != models.StatusAccepted {
				return errInvalidTransition
			}
			updates["status"] = models.StatusArrived
			updates["arrived_at"] = now
			wsEvent = "driver_arrived"

		case "start":
			if order.Status != models.StatusArrived {
				return errInvalidTransition
			}
			updates["status"] = models.StatusInProgress
			updates["picked_up_at"] = now
			wsEvent = "trip_started"

		case "complete":
			if order.Status != models.StatusInProgress {
				return errInvalidTransition
			}
			updates["status"] = models.StatusCompleted
			updates["completed_at"] = now
			wsEvent = "trip_completed"

			split = h.pricing.Split(c.Request.Context(), order.FareAmount, order.CustomerFee, order.MerchantID != nil)
			updates["platform_fee"] = split.PlatformFee
			updates["driver_earning"] = split.DriverNet
			updates["merchant_fee"] = split.MerchantFee

			companyID, err := repository.NewCompanyAccount(h.db).Ensure(tx)
			if err != nil {
				return err
			}

			if order.PaymentMethod == models.PaymentWallet {
				totalCharged := order.FareAmount + order.CustomerFee

				// Lepas escrow dari akun perusahaan
				if _, err := h.wallet.Debit(tx, repository.Entry{
					UserID:     companyID,
					Amount:     totalCharged,
					Type:       models.TxTypeEscrowRelease,
					OrderUUID:  order.UUID,
					Note:       "Pelepasan titipan order " + order.UUID,
					MinBalance: repository.NoMinBalance,
				}); err != nil {
					return err
				}

				// Bayar driver
				if _, err := h.wallet.Credit(tx, repository.Entry{
					UserID:    driverID,
					Amount:    split.DriverNet,
					Type:      models.TxTypeEarning,
					OrderUUID: order.UUID,
					Note:      "Pendapatan order " + order.UUID,
				}); err != nil {
					return err
				}

				// Komisi jadi pendapatan perusahaan
				companyRevenue := split.PlatformFee + split.CustomerFee
				if _, err := h.wallet.Credit(tx, repository.Entry{
					UserID:    companyID,
					Amount:    companyRevenue,
					Type:      models.TxTypeFee,
					OrderUUID: order.UUID,
					Note:      "Komisi order " + order.UUID,
				}); err != nil {
					return err
				}

				// Merchant fee bila ada
				if split.MerchantFee > 0 {
					floor := h.pricing.MinBalance(c.Request.Context())
					if _, err := h.wallet.Debit(tx, repository.Entry{
						UserID:     *order.MerchantID,
						Amount:     split.MerchantFee,
						Type:       models.TxTypeFee,
						OrderUUID:  order.UUID,
						Note:       "Komisi merchant order " + order.UUID,
						MinBalance: floor,
					}); err != nil && !errors.Is(err, repository.ErrInsufficientBalance) {
						return err
					}
					if _, err := h.wallet.Credit(tx, repository.Entry{
						UserID:    companyID,
						Amount:    split.MerchantFee,
						Type:      models.TxTypeFee,
						OrderUUID: order.UUID,
						Note:      "Komisi merchant order " + order.UUID,
					}); err != nil {
						return err
					}

					if forced, err := h.enforceBalanceFloor(tx, *order.MerchantID, floor); err != nil {
						return err
					} else if forced {
						forcedOffline = append(forcedOffline, *order.MerchantID)
					}
				}

			} else {
				// Cash: potong komisi dari driver
				floor := h.pricing.MinBalance(c.Request.Context())
				driverFee := split.PlatformFee + split.CustomerFee
				if _, err := h.wallet.Debit(tx, repository.Entry{
					UserID:     driverID,
					Amount:     driverFee,
					Type:       models.TxTypeFee,
					OrderUUID:  order.UUID,
					Note:       "Komisi tunai order " + order.UUID,
					MinBalance: floor,
				}); err != nil && !errors.Is(err, repository.ErrInsufficientBalance) {
					return err
				}
				if _, err := h.wallet.Credit(tx, repository.Entry{
					UserID:    companyID,
					Amount:    driverFee,
					Type:      models.TxTypeFee,
					OrderUUID: order.UUID,
					Note:      "Komisi tunai order " + order.UUID,
				}); err != nil {
					return err
				}

				// Paksa offline bila batas utang tercapai
				if forced, err := h.enforceBalanceFloor(tx, driverID, floor); err != nil {
					return err
				} else if forced {
					forcedOffline = append(forcedOffline, driverID)
				}

				// Merchant fee bila ada
				if split.MerchantFee > 0 {
					if _, err := h.wallet.Debit(tx, repository.Entry{
						UserID:     *order.MerchantID,
						Amount:     split.MerchantFee,
						Type:       models.TxTypeFee,
						OrderUUID:  order.UUID,
						Note:       "Komisi merchant order " + order.UUID,
						MinBalance: floor,
					}); err != nil && !errors.Is(err, repository.ErrInsufficientBalance) {
						return err
					}
					if _, err := h.wallet.Credit(tx, repository.Entry{
						UserID:    companyID,
						Amount:    split.MerchantFee,
						Type:      models.TxTypeFee,
						OrderUUID: order.UUID,
						Note:      "Komisi merchant order " + order.UUID,
					}); err != nil {
						return err
					}

					if forced, err := h.enforceBalanceFloor(tx, *order.MerchantID, floor); err != nil {
						return err
					} else if forced {
						forcedOffline = append(forcedOffline, *order.MerchantID)
					}
				}
			}

		case "cancel":
			if order.Status == models.StatusCompleted || order.Status == models.StatusCancelled {
				return errInvalidTransition
			}
			updates["status"] = models.StatusCancelled
			updates["cancelled_at"] = now
			wsEvent = "order_cancelled"

			// Refund penuh ke rider bila pembayaran lewat wallet: dana masih
			// dititipkan di akun perusahaan, jadi yang dikembalikan adalah tarif
			// beserta biaya layanan yang ikut ditagih di muka. Order tunai belum
			// memindahkan uang apa pun, jadi tidak ada yang perlu dikembalikan.
			if order.PaymentMethod == models.PaymentWallet {
				totalCharged := order.FareAmount + order.CustomerFee

				companyID, err := repository.NewCompanyAccount(h.db).Ensure(tx)
				if err != nil {
					return err
				}

				if _, err := h.wallet.Debit(tx, repository.Entry{
					UserID:     companyID,
					Amount:     totalCharged,
					Type:       models.TxTypeEscrowRelease,
					OrderUUID:  order.UUID,
					Note:       "Pelepasan titipan (batal) order " + order.UUID,
					MinBalance: repository.NoMinBalance,
				}); err != nil {
					return err
				}

				if _, err := h.wallet.Credit(tx, repository.Entry{
					UserID:    order.RiderID,
					Amount:    totalCharged,
					Type:      models.TxTypeRefund,
					OrderUUID: order.UUID,
					Note:      "Pengembalian dana order " + order.UUID,
				}); err != nil {
					return err
				}
			}

		default:
			return errUnknownAction
		}

		return tx.Model(&models.Order{}).Where("uuid = ?", order.UUID).Updates(updates).Error
	})

	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found or unauthorized"})
		return
	case errors.Is(err, errInvalidTransition):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state transition"})
		return
	case errors.Is(err, errUnknownAction):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown action"})
		return
	case err != nil:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order status"})
		return
	}

	// Notifikasi WS ke Customer
	h.notifyUser(riderID, wsEvent, uuidParam)

	// Notifikasi yang tersimpan. Penerimanya penumpang untuk seluruh transisi,
	// ditambah driver saat order selesai — pendapatannya baru masuk pada saat itu,
	// jadi itulah satu-satunya transisi yang perlu ia ketahui belakangan.
	switch req.Action {
	case "arrive":
		h.pushNotif(riderID, models.NotifDriverArrived,
			"Driver sudah tiba",
			"Driver menunggu di titik penjemputan.", uuidParam)
	case "start":
		h.pushNotif(riderID, models.NotifTripStarted,
			"Perjalanan dimulai",
			"Selamat menikmati perjalanan Anda.", uuidParam)
	case "complete":
		h.pushNotif(riderID, models.NotifTripCompleted,
			"Perjalanan selesai",
			"Terima kasih. Beri rating untuk driver Anda.", uuidParam)
		h.pushNotif(driverID, models.NotifTripCompleted,
			"Order selesai",
			fmt.Sprintf("Pendapatan Anda dari order ini: %.0f", split.DriverNet), uuidParam)
	case "cancel":
		// Yang diberi tahu adalah pihak yang tidak membatalkan. Pembatalan lewat
		// endpoint ini selalu dilakukan driver, jadi penerimanya penumpang.
		h.pushNotif(riderID, models.NotifOrderCancelled,
			"Order dibatalkan",
			"Order Anda dibatalkan driver. Dana yang sudah terpotong dikembalikan.", uuidParam)
	}

	// Pihak yang saldonya menembus batas dipadamkan; aplikasinya perlu tahu agar
	// tidak menampilkan status online yang sudah tidak berlaku di server.
	for _, id := range forcedOffline {
		h.notifyUser(id, "forced_offline_low_balance", uuidParam)
	}

	resp := gin.H{"message": "Order status updated", "action": req.Action}
	if req.Action == "complete" {
		resp["earning"] = split
	}
	c.JSON(http.StatusOK, resp)
}

// RateOrder — POST /api/orders/:uuid/rate
func (h *OrderHandler) RateOrder(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)
	uuidParam := c.Param("uuid")

	var req struct {
		Rating int    `json:"rating" binding:"required,min=1,max=5"`
		Note   string `json:"note"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	var order models.Order
	if err := h.db.Where("uuid = ?", uuidParam).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Hanya perjalanan yang benar-benar selesai yang bisa dinilai.
	if order.Status != models.StatusCompleted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only completed orders can be rated"})
		return
	}

	updates := map[string]interface{}{}
	var ratedColumn string

	switch {
	case order.RiderID == userID:
		if order.CustomerRating != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "You have already rated this order"})
			return
		}
		ratedColumn = "customer_rating"
		updates["customer_rating"] = req.Rating
		if req.Note != "" {
			updates["review_note"] = req.Note
		}
	case order.DriverID != nil && *order.DriverID == userID:
		if order.DriverRating != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "You have already rated this order"})
			return
		}
		ratedColumn = "driver_rating"
		updates["driver_rating"] = req.Rating
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to rate this order"})
		return
	}

	// Syarat "kolom masih NULL" ikut masuk ke WHERE agar dua permintaan
	// bersamaan tidak sama-sama lolos pengecekan di atas.
	result := h.db.Model(&models.Order{}).
		Where("uuid = ? AND "+ratedColumn+" IS NULL", uuidParam).
		Updates(updates)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit rating"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "You have already rated this order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Rating submitted successfully"})
}

// GetOrderHistory — GET /api/orders
func (h *OrderHandler) GetOrderHistory(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)
	role := models.RoleCode(c.GetString(middleware.UserRoleKey))

	// Query dibangun ulang untuk hitung total dan untuk ambil data, karena
	// rantai *gorm.DB yang sama tidak aman dipakai dua kali.
	scoped := func() *gorm.DB {
		q := h.db.Model(&models.Order{})
		switch {
		case models.IsDriverRole(role):
			return q.Where("driver_id = ?", userID)
		case models.IsAdminRole(role):
			return q // Admin melihat semua order
		default:
			return q.Where("rider_id = ?", userID)
		}
	}

	var total int64
	if err := scoped().Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch order history"})
		return
	}

	page, perPage, offset := paginate(c)

	var orders []models.Order
	if err := scoped().Order("created_at desc").Limit(perPage).Offset(offset).Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch order history"})
		return
	}

	// Hitung pesan unread untuk tiap order milik user yang sedang login
	unreadMap := make(map[string]int)
	if len(orders) > 0 {
		var uuids []string
		for _, o := range orders {
			if o.UUID != "" {
				uuids = append(uuids, o.UUID)
			}
		}
		if len(uuids) > 0 {
			type UnreadStat struct {
				OrderUUID string `gorm:"column:order_uuid"`
				Count     int    `gorm:"column:count"`
			}
			var stats []UnreadStat
			_ = h.db.Model(&models.ChatMessage{}).
				Select("order_uuid, count(*) as count").
				Where("order_uuid IN ? AND receiver_id = ? AND is_read = false", uuids, userID).
				Group("order_uuid").
				Scan(&stats).Error

			for _, s := range stats {
				unreadMap[s.OrderUUID] = s.Count
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"orders":       orders,
		"unread_chats": unreadMap,
		"meta": gin.H{
			"page":     page,
			"per_page": perPage,
			"total":    total,
		},
	})
}

// GetOrderByUUID — GET /api/orders/:uuid
// Mengambil detail pesanan beserta informasi profil driver asli dari database (bila sudah ada driver).
func (h *OrderHandler) GetOrderByUUID(c *gin.Context) {
	uuidParam := c.Param("uuid")
	userID := c.GetUint(middleware.UserIDKey)
	role := models.RoleCode(c.GetString(middleware.UserRoleKey))

	var order models.Order
	if err := h.db.Preload("Rider").Preload("Merchant").Where("uuid = ?", uuidParam).First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load order"})
		return
	}

	// Hanya rider pemilik order, driver yang ditugaskan (atau saat order masih searching), atau admin yang boleh melihat
	isAssignedOrOfferedDriver := (order.DriverID != nil && *order.DriverID == userID) || (role == models.RoleDriver && order.Status == models.StatusSearching)
	if !models.IsAdminRole(role) && order.RiderID != userID && !isAssignedOrOfferedDriver {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to view this order"})
		return
	}

	resp := gin.H{
		"order": order,
	}

	if order.Rider != nil {
		resp["rider"] = gin.H{
			"id":    order.Rider.ID,
			"name":  order.Rider.Name,
			"phone": order.Rider.Phone,
		}
	}

	// Jika order sudah memiliki driver di database, muat data asli driver
	if order.DriverID != nil {
		var driver models.User
		if err := h.db.Preload("DriverProfile").Preload("Vehicles").
			Where("id = ?", *order.DriverID).First(&driver).Error; err == nil {

			driverInfo := gin.H{
				"id":     driver.ID,
				"name":   driver.Name,
				"phone":  driver.Phone,
				"rating": 4.9,
			}

			if len(driver.Vehicles) > 0 {
				v := driver.Vehicles[0]
				driverInfo["vehicle"] = fmt.Sprintf("%s %s", v.Brand, v.ModelName)
				driverInfo["plate"] = v.PlateNumber
			} else {
				driverInfo["vehicle"] = order.VehicleType
				driverInfo["plate"] = "-"
			}

			if driver.DriverProfile != nil && driver.DriverProfile.SelfiePhotoURL != "" {
				driverInfo["photo"] = driver.DriverProfile.SelfiePhotoURL
			}

			resp["driver"] = driverInfo
		}
	} else {
		resp["driver"] = nil
	}

	c.JSON(http.StatusOK, resp)
}

// CancelOrder — PUT /api/orders/:uuid/cancel (oleh Rider)
// Membatalkan pesanan yang sedang mencari driver (atau sebelum perjalanan dimulai).
func (h *OrderHandler) CancelOrder(c *gin.Context) {
	uuidParam := c.Param("uuid")
	userID := c.GetUint(middleware.UserIDKey)

	var req struct {
		Reason string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&req)
	reason := req.Reason
	if reason == "" {
		reason = "Dibatalkan oleh penumpang"
	}

	var order models.Order
	var refunded float64

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(lockForUpdate()).
			Where("uuid = ?", uuidParam).First(&order).Error; err != nil {
			return err
		}

		if order.RiderID != userID {
			return errors.New("unauthorized to cancel this order")
		}

		if order.Status == models.StatusCompleted || order.Status == models.StatusCancelled {
			return errInvalidTransition
		}

		if order.PaymentMethod == models.PaymentWallet {
			totalToRefund := order.FareAmount + order.CustomerFee
			companyID, err := repository.NewCompanyAccount(h.db).Ensure(tx)
			if err == nil {
				_, _ = h.wallet.Debit(tx, repository.Entry{
					UserID:    companyID,
					Amount:    totalToRefund,
					Type:      models.TxTypeEscrow,
					OrderUUID: order.UUID,
					Note:      "Pengembalian titipan dana order dibatalkan: " + order.UUID,
				})
			}
			if _, err := h.wallet.Credit(tx, repository.Entry{
				UserID:    order.RiderID,
				Amount:    totalToRefund,
				Type:      models.TxTypeRefund,
				OrderUUID: order.UUID,
				Note:      "Pengembalian dana order dibatalkan: " + reason,
			}); err != nil {
				return err
			}
			refunded = totalToRefund
		}

		// Batalkan semua penawaran yang masih berstatus offered
		_ = tx.Model(&models.OrderOffer{}).
			Where("order_uuid = ? AND status = ?", order.UUID, models.OfferOffered).
			Update("status", models.OfferExpired).Error

		now := time.Now()
		return tx.Model(&models.Order{}).Where("id = ?", order.ID).
			Updates(map[string]interface{}{
				"status":       models.StatusCancelled,
				"cancelled_at": now,
			}).Error
	})

	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	if errors.Is(err, errInvalidTransition) {
		c.JSON(http.StatusConflict, gin.H{"error": "Order can no longer be cancelled"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if order.DriverID != nil {
		h.notifyUser(*order.DriverID, "order_cancelled", order.UUID)
		h.pushNotif(*order.DriverID, models.NotifOrderCancelled, "Order Dibatalkan", "Penumpang telah membatalkan order.", order.UUID)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Order cancelled successfully",
		"status":   models.StatusCancelled,
		"refunded": refunded,
	})
}

// enforceBalanceFloor — paksa offline pihak yang saldonya sudah menembus batas.
//
// Order tunai memotong komisi tanpa menuntut deposit lebih dulu, jadi saldo
// driver boleh menyeberang nol sampai batas yang diatur admin. Begitu batas itu
// tercapai, satu-satunya yang menghentikannya menerima order berikutnya adalah
// is_online = false — MatchingWorker.filterEligible mensyaratkan kolom itu
// bernilai true, sehingga menurunkannya cukup untuk menutup tawaran walau
// posisinya masih tertinggal di indeks geospasial Redis.
//
// Untuk merchant, padanan "offline" adalah is_open = false pada profilnya:
// tokonya tidak lagi menerima pesanan sampai deposit masuk.
func (h *OrderHandler) enforceBalanceFloor(tx *gorm.DB, userID uint, floor float64) (forced bool, err error) {
	var user models.User
	if err := tx.Select("id", "balance", "role_code", "is_online").
		Where("id = ?", userID).First(&user).Error; err != nil {
		return false, err
	}
	if user.Balance > floor {
		return false, nil
	}

	if models.IsDriverRole(user.RoleCode) {
		if err := tx.Model(&models.User{}).Where("id = ?", userID).
			Updates(map[string]interface{}{"is_online": false, "online_since": nil}).Error; err != nil {
			return false, err
		}
	}

	// Merchant tetap ditutup walau role aktifnya bukan merchant: yang jadi acuan
	// adalah keberadaan profilnya, bukan mode yang sedang dipakai di aplikasi.
	if err := tx.Model(&models.MerchantProfile{}).Where("user_id = ?", userID).
		Update("is_open", false).Error; err != nil {
		return false, err
	}

	return true, nil
}

var (
	errInvalidTransition = errors.New("invalid state transition")
	errUnknownAction     = errors.New("unknown action")
	// errOrderUnavailable — order sudah tidak berstatus searching, entah karena
	// diambil driver lain, dibatalkan, atau jenis kendaraannya tidak cocok.
	errOrderUnavailable = errors.New("order no longer available")
	// errOfferAlreadyAnswered — tawaran sudah dijawab atau sudah kedaluwarsa
	errOfferAlreadyAnswered = errors.New("offer already answered")
)
