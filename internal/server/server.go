package server

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"openjek-backend/internal/auth"
	"openjek-backend/internal/broker"
	"openjek-backend/internal/config"
	"openjek-backend/internal/db"
	"openjek-backend/internal/handlers"
	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"
	"openjek-backend/internal/payment"
	"openjek-backend/internal/pricing"
	"openjek-backend/internal/repository"
	"openjek-backend/internal/sdui"
	ws "openjek-backend/internal/websocket"
	"openjek-backend/internal/workers"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// Batas waktu HTTP. Tanpa batas ini, satu klien yang membuka koneksi lalu
// diam bisa menahan goroutine dan file descriptor selamanya.
const (
	readHeaderTimeout = 10 * time.Second
	readTimeout       = 30 * time.Second
	writeTimeout      = 60 * time.Second
	idleTimeout       = 120 * time.Second
	shutdownTimeout   = 15 * time.Second
)

type Server struct {
	router *gin.Engine
	http   *http.Server
	db     *gorm.DB
	cfg    *config.Config
	hub    *ws.Hub
	rmq    *broker.RabbitMQ
	redis  *redis.Client
	// presence dihentikan saat server berhenti agar sapuannya tidak menyentuh
	// database yang koneksinya sudah ditutup.
	presence *workers.PresenceWorker
}

func NewServer() *Server {
	cfg := config.LoadConfig()
	database := db.NewPostgresDB(cfg.DatabaseDSN)
	redisClient := db.NewRedisClient(cfg.RedisURL)

	// Auto-migrate semua model termasuk RBAC
	if err := database.AutoMigrate(
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
	); err != nil {
		log.Fatalf("AutoMigrate failed: %v", err)
	}

	// Seed RBAC (roles, permissions, dan relasinya)
	repository.SeedRolesAndPermissions(database)

	// Seed akun perusahaan
	repository.SeedCompanyAccount(database)

	// Build repositories
	locRepo := repository.NewLocationRepository(redisClient)
	settingsRepo := repository.NewSettingsRepository(database, redisClient)
	settingsRepo.Seed()
	roleRepo := repository.NewRoleRepository(database)
	walletRepo := repository.NewWalletRepository()

	// WebSocket Hub — dibuat lebih awal supaya bisa dipakai NotificationRepository
	hub := ws.NewHub()

	// Notifikasi disimpan lebih dulu lalu dikirim lewat hub. Repositori ini
	// dipakai semua handler yang perlu memberi tahu pengguna.
	notifRepo := repository.NewNotificationRepository(database, hub)

	// Kalkulator tarif membaca setting dinamis, sehingga perubahan tarif dari
	// dashboard admin langsung berlaku tanpa deploy ulang.
	priceCalc := pricing.NewCalculator(settingsRepo)

	// RabbitMQ Broker
	rmq, err := broker.NewRabbitMQ(cfg.RabbitMQURL)
	if err != nil {
		log.Printf("[Server] RabbitMQ unavailable: %v (order tetap dibuat, pencarian driver otomatis nonaktif)", err)
		rmq = nil
	}

	// Koneksi yang putus memadamkan status online driver, sehingga driver yang
	// menutup aplikasi langsung berhenti ditawari order.
	hub.OnDisconnect = func(userID uint, role string) {
		if !models.IsDriverRole(models.RoleCode(role)) {
			return
		}
		if err := database.Model(&models.User{}).
			Where("id = ? AND is_online = ?", userID, true).
			Updates(map[string]interface{}{"is_online": false, "online_since": nil}).Error; err != nil {
			log.Printf("[Server] Failed to mark driver %d offline: %v", userID, err)
			return
		}
		if err := locRepo.RemoveDriver(context.Background(), userID); err != nil {
			log.Printf("[Server] Failed to remove driver %d from location index: %v", userID, err)
		}
	}

	go hub.Run()

	// Worker pencarian driver
	matchingWorker := workers.NewMatchingWorker(database, rmq, locRepo, priceCalc, hub, notifRepo)
	if err := matchingWorker.Start(); err != nil {
		log.Printf("[Server] Matching worker failed to start: %v", err)
	}

	// Sapuan berkala: status online yang menggantung dan tawaran kedaluwarsa.
	// Diperlukan di samping hook di atas karena setelah server restart seluruh
	// koneksi lenyap tanpa pernah melewati jalur unregister.
	presenceWorker := workers.NewPresenceWorker(database, hub, rmq)
	presenceWorker.Start()

	// Build services & handlers
	jwtSvc := auth.NewJWTService(cfg.JWTSecret)
	sduiBuilder := sdui.NewBuilder(settingsRepo)
	midtransSvc := payment.NewMidtransService(cfg.MidtransServerKey, cfg.MidtransIsProduction)

	authHandler := handlers.NewAuthHandler(database, jwtSvc)
	userHandler := handlers.NewUserHandler(roleRepo, jwtSvc)
	wsHandler := handlers.NewWebSocketHandler(hub, jwtSvc, locRepo, cfg.AllowedWSOrigins)
	sduiHandler := handlers.NewSDUIHandler(sduiBuilder, settingsRepo)
	orderHandler := handlers.NewOrderHandler(database, rmq, priceCalc, walletRepo, hub, notifRepo)
	walletHandler := handlers.NewWalletHandler(database, midtransSvc, walletRepo)
	webhookHandler := handlers.NewWebhookHandler(database, midtransSvc, walletRepo, hub, notifRepo)
	chatHandler := handlers.NewChatHandler(database, hub)
	profileHandler := handlers.NewProfileHandler(database)
	driverKYCHandler := handlers.NewDriverKYCHandler(database)
	driverStatusHandler := handlers.NewDriverStatusHandler(database, locRepo, priceCalc)
	fareHandler := handlers.NewFareHandler(priceCalc)
	historyHandler := handlers.NewHistoryHandler(database)
	notificationHandler := handlers.NewNotificationHandler(database)
	productHandler := handlers.NewProductHandler(database)
	merchantProductHandler := handlers.NewMerchantProductHandler(database)
	uploadHandler := handlers.NewUploadHandler(cfg.UploadDir)

	adminHandler := handlers.NewAdminHandler(database, walletRepo, roleRepo, notifRepo)
	financeHandler := handlers.NewFinanceHandler(database, walletRepo, notifRepo)
	merchantHandler := handlers.NewMerchantHandler(database)
	adminUserHandler := handlers.NewAdminUserHandler(database, roleRepo)
	promoHandler := handlers.NewPromoHandler(database)
	reportHandler := handlers.NewReportHandler(database)

	r := gin.Default()
	r.HandleMethodNotAllowed = true

	// ── Global Handlers untuk route/method yang tidak ada ─────────────────
	r.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Endpoint not found",
		})
	})
	r.NoMethod(func(c *gin.Context) {
		c.JSON(http.StatusMethodNotAllowed, gin.H{
			"error": "Method not allowed",
		})
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// WebSocket endpoint (auth via query param ?token=)
	r.GET("/ws", wsHandler.HandleWS)

	// Berkas unggahan disajikan sebagai berkas statis biasa. Tidak ada JWT di
	// sini: URL-nya memuat uuid acak dan dipasang langsung pada tag gambar di
	// aplikasi, yang tidak bisa mengirim header Authorization.
	r.Static("/uploads", uploadHandler.BaseDir())

	// ── Webhook (Public, no JWT) — Notifikasi dari Payment Gateway ─────
	r.POST("/webhook/midtrans", webhookHandler.HandleMidtransWebhook)

	// ── Public routes ─────────────────────────────────────────────────
	public := r.Group("/api")
	{
		public.POST("/register", authHandler.Register)
		public.POST("/login", authHandler.Login)
		public.POST("/refresh", authHandler.Refresh)
	}

	// ── Protected: semua user yang sudah login ────────────────────────
	protected := r.Group("/api")
	protected.Use(middleware.JWTAuth(jwtSvc))
	protected.Use(middleware.LoadUser(database))
	{
		protected.POST("/logout", authHandler.Logout)
		protected.GET("/user", userHandler.GetCurrentUser)
		protected.POST("/users/roles", authHandler.AddRole)
		protected.PUT("/users/active-role", userHandler.SwitchRole)
		protected.GET("/ui/home", sduiHandler.GetHomeScreen)

		// Order Routes
		protected.GET("/orders", orderHandler.GetOrderHistory)
		protected.POST("/orders", orderHandler.CreateOrder)
		protected.PUT("/orders/:uuid/accept", middleware.RequireDriver(), orderHandler.AcceptOrder)
		protected.PUT("/orders/:uuid/reject", middleware.RequireDriver(), orderHandler.RejectOrder)
		protected.PUT("/orders/:uuid/status", middleware.RequireDriver(), orderHandler.UpdateOrderStatus)
		protected.POST("/orders/:uuid/rate", orderHandler.RateOrder)
		protected.POST("/orders/:uuid/chat", chatHandler.SendMessage)
		protected.GET("/orders/:uuid/chat", chatHandler.GetHistory)

		// Notifikasi — cakupannya selalu user pada token.
		protected.GET("/notifications", notificationHandler.List)
		protected.GET("/notifications/unread-count", notificationHandler.UnreadCount)
		protected.PUT("/notifications/read-all", notificationHandler.MarkAllRead)
		protected.PUT("/notifications/:id/read", notificationHandler.MarkRead)

		// Katalog produk sisi pembeli. Terbuka bagi siapa pun yang sudah login;
		// yang disaring adalah produknya, bukan pembacanya.
		protected.GET("/products", productHandler.List)
		protected.GET("/products/:id", productHandler.Get)

		// Unggah berkas (foto produk).
		protected.POST("/uploads", uploadHandler.Upload)

		// Estimasi tarif terbuka bagi siapa pun yang sudah login: angkanya tidak
		// rahasia dan tidak mengikat.
		protected.POST("/fare/estimate", fareHandler.Estimate)

		// Validasi promo hanya untuk customer, satu-satunya peran yang memakai
		// kode promo saat memesan.
		protected.POST("/promos/validate", middleware.RequireRole(models.RoleCustomer), promoHandler.Validate)

		// Wallet Routes
		protected.GET("/wallet", walletHandler.GetBalance)
		protected.POST("/wallet/deposit", walletHandler.Deposit)
		protected.POST("/wallet/withdraw", walletHandler.Withdraw)
		protected.GET("/wallet/history", walletHandler.GetHistory)

		// Profile Routes
		protected.GET("/profile", profileHandler.GetProfile)
		protected.PUT("/profile", profileHandler.UpdateUserProfile)
		protected.PUT("/profile/driver", middleware.RequireDriver(), profileHandler.UpdateDriverProfile)
		protected.PUT("/profile/merchant", middleware.RequireRole(models.RoleMerchant), profileHandler.UpdateMerchantProfile)
	}

	// ── Riwayat & KYC per peran ───────────────────────────────────────
	//
	// Penjaga peran memakai role AKTIF, sama seperti seluruh otorisasi lain di
	// sistem ini. Akun yang memiliki beberapa peran harus berpindah role aktif
	// untuk membuka riwayat peran yang lain, sehingga satu token hanya pernah
	// mewakili satu sudut pandang.
	customer := r.Group("/api/customer")
	customer.Use(middleware.JWTAuth(jwtSvc))
	customer.Use(middleware.LoadUser(database))
	customer.Use(middleware.RequireRole(models.RoleCustomer))
	{
		customer.GET("/orders", historyHandler.CustomerOrders)
		customer.GET("/wallet/history", historyHandler.CustomerWalletHistory)
	}

	driver := r.Group("/api/driver")
	driver.Use(middleware.JWTAuth(jwtSvc))
	driver.Use(middleware.LoadUser(database))
	driver.Use(middleware.RequireDriver())
	{
		driver.POST("/kyc", driverKYCHandler.Submit)
		driver.GET("/kyc", driverKYCHandler.Status)
		// Path ini sengaja berbeda dari /api/drivers/status pada spesifikasi awal,
		// agar seragam dengan endpoint driver lain yang sudah beredar.
		driver.PUT("/status", driverStatusHandler.SetStatus)
		driver.GET("/orders", historyHandler.DriverOrders)
		driver.GET("/wallet/history", historyHandler.DriverWalletHistory)
		driver.GET("/earnings", historyHandler.DriverEarnings)
	}

	merchant := r.Group("/api/merchant")
	merchant.Use(middleware.JWTAuth(jwtSvc))
	merchant.Use(middleware.LoadUser(database))
	merchant.Use(middleware.RequireRole(models.RoleMerchant))
	{
		merchant.GET("/orders", historyHandler.MerchantOrders)
		merchant.GET("/wallet/history", historyHandler.MerchantWalletHistory)
		merchant.GET("/sales", historyHandler.MerchantSales)

		// Produk — CRUD merchant untuk katalog sendiri.
		merchant.GET("/products", merchantProductHandler.List)
		merchant.POST("/products", merchantProductHandler.Create)
		merchant.GET("/products/:id", merchantProductHandler.Get)
		merchant.PUT("/products/:id", merchantProductHandler.Update)
		merchant.DELETE("/products/:id", merchantProductHandler.Delete)
	}

	// ── Admin: semua role group "admin" ──────────────────────────────
	admin := r.Group("/api/admin")
	admin.Use(middleware.JWTAuth(jwtSvc))
	admin.Use(middleware.RequireAdminGroup())
	{
		// Settings (hanya pemegang settings.manage)
		admin.GET("/settings",
			middleware.RequirePermission(database, models.PermSettingsManage),
			sduiHandler.GetSettings,
		)
		admin.PUT("/settings/:key",
			middleware.RequirePermission(database, models.PermSettingsManage),
			sduiHandler.UpdateSetting,
		)

		// Driver management
		admin.GET("/drivers",
			middleware.RequirePermission(database, models.PermDriversView),
			adminHandler.ListDrivers,
		)
		admin.PUT("/drivers/:id/verify",
			middleware.RequirePermission(database, models.PermDriversVerify),
			adminHandler.VerifyDriver,
		)
		admin.PUT("/drivers/:id/reject-kyc",
			middleware.RequirePermission(database, models.PermDriversVerify),
			adminHandler.RejectDriverKYC,
		)
		admin.GET("/drivers/:id/kyc",
			middleware.RequirePermission(database, models.PermDriversView),
			adminHandler.GetDriverKYC,
		)
		admin.PUT("/drivers/:id/suspend",
			middleware.RequirePermission(database, models.PermDriversSuspend),
			adminHandler.SuspendDriver,
		)
		admin.PUT("/drivers/:id/reactivate",
			middleware.RequirePermission(database, models.PermDriversSuspend),
			adminHandler.ReactivateDriver,
		)
		admin.POST("/drivers/:id/bonus",
			middleware.RequirePermission(database, models.PermDriversBonus),
			adminHandler.GiveDriverBonus,
		)

		// Order management
		admin.GET("/orders",
			middleware.RequirePermission(database, models.PermOrdersView),
			adminHandler.AdminListOrders,
		)
		admin.PUT("/orders/:uuid/cancel",
			middleware.RequirePermission(database, models.PermOrdersCancelAny),
			adminHandler.AdminCancelOrder,
		)
		admin.PUT("/orders/:uuid/force-complete",
			middleware.RequirePermission(database, models.PermOrdersForceComplete),
			adminHandler.ForceCompleteOrder,
		)

		// Finance
		admin.GET("/finance/report",
			middleware.RequirePermission(database, models.PermFinanceViewReport),
			financeHandler.Report,
		)
		admin.GET("/finance/withdrawals",
			middleware.RequirePermission(database, models.PermFinanceViewReport),
			financeHandler.ListWithdrawals,
		)
		admin.PUT("/finance/withdrawals/:id/disburse",
			middleware.RequirePermission(database, models.PermFinanceDisbursement),
			financeHandler.Disburse,
		)
		admin.PUT("/finance/withdrawals/:id/reject",
			middleware.RequirePermission(database, models.PermFinanceDisbursement),
			financeHandler.RejectWithdrawal,
		)
		admin.POST("/finance/refunds",
			middleware.RequirePermission(database, models.PermFinanceRefund),
			financeHandler.Refund,
		)

		// Merchant management
		admin.GET("/merchants",
			middleware.RequirePermission(database, models.PermMerchantsView),
			merchantHandler.List,
		)
		admin.GET("/merchants/:id",
			middleware.RequirePermission(database, models.PermMerchantsView),
			merchantHandler.Get,
		)
		admin.PUT("/merchants/:id/approve",
			middleware.RequirePermission(database, models.PermMerchantsApprove),
			merchantHandler.Approve,
		)
		admin.PUT("/merchants/:id/suspend",
			middleware.RequirePermission(database, models.PermMerchantsSuspend),
			merchantHandler.Suspend,
		)

		// User management
		admin.GET("/users",
			middleware.RequirePermission(database, models.PermUsersView),
			adminUserHandler.List,
		)
		admin.GET("/users/:id",
			middleware.RequirePermission(database, models.PermUsersView),
			adminUserHandler.Get,
		)
		admin.PUT("/users/:id/active",
			middleware.RequirePermission(database, models.PermUsersManage),
			adminUserHandler.SetActive,
		)
		admin.POST("/users/:id/roles",
			middleware.RequirePermission(database, models.PermUsersManage),
			adminUserHandler.AssignRole,
		)
		admin.DELETE("/users/:id/roles/:role",
			middleware.RequirePermission(database, models.PermUsersManage),
			adminUserHandler.RevokeRole,
		)

		// Promo / voucher
		admin.GET("/promos",
			middleware.RequirePermission(database, models.PermPromoManage),
			promoHandler.List,
		)
		admin.POST("/promos",
			middleware.RequirePermission(database, models.PermPromoManage),
			promoHandler.Create,
		)
		admin.PUT("/promos/:id",
			middleware.RequirePermission(database, models.PermPromoManage),
			promoHandler.Update,
		)
		admin.DELETE("/promos/:id",
			middleware.RequirePermission(database, models.PermPromoManage),
			promoHandler.Delete,
		)
		admin.GET("/promos/:id/usage",
			middleware.RequirePermission(database, models.PermPromoManage),
			promoHandler.Usage,
		)

		// Reports
		admin.GET("/reports/dashboard",
			middleware.RequirePermission(database, models.PermReportsView),
			reportHandler.Dashboard,
		)
		admin.GET("/reports/sales",
			middleware.RequirePermission(database, models.PermReportsSales),
			reportHandler.Sales,
		)
		admin.GET("/reports/top-drivers",
			middleware.RequirePermission(database, models.PermReportsView),
			reportHandler.TopDrivers,
		)
	}

	return &Server{
		router:   r,
		db:       database,
		cfg:      cfg,
		hub:      hub,
		rmq:      rmq,
		redis:    redisClient,
		presence: presenceWorker,
	}
}

// Run menjalankan server sampai konteks dibatalkan (misalnya SIGINT/SIGTERM),
// lalu menutup koneksi yang sedang berjalan secara tertib.
//
// Tanpa penutupan tertib, permintaan yang sedang diproses — termasuk transaksi
// pembayaran — akan terputus di tengah jalan saat proses dimatikan.
func (s *Server) Run(ctx context.Context, addr string) error {
	s.http = &http.Server{
		Addr:              addr,
		Handler:           s.router,
		ReadHeaderTimeout: readHeaderTimeout,
		ReadTimeout:       readTimeout,
		WriteTimeout:      writeTimeout,
		IdleTimeout:       idleTimeout,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Printf("[Server] Listening on %s", addr)
		if err := s.http.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	select {
	case err := <-errCh:
		s.closeDependencies()
		return err
	case <-ctx.Done():
		log.Println("[Server] Shutdown signal received, draining connections...")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	err := s.http.Shutdown(shutdownCtx)
	s.closeDependencies()

	if err != nil {
		return err
	}
	log.Println("[Server] Shutdown complete")
	return nil
}

// closeDependencies menutup semua sumber daya eksternal. Urutannya penting:
// hub ditutup lebih dulu agar tidak ada goroutine yang masih mencoba menulis
// ke koneksi yang sudah dibersihkan.
func (s *Server) closeDependencies() {
	if s.presence != nil {
		s.presence.Stop()
	}
	if s.hub != nil {
		s.hub.Close()
	}
	if s.rmq != nil {
		s.rmq.Close()
	}
	if s.redis != nil {
		if err := s.redis.Close(); err != nil {
			log.Printf("[Server] Redis close failed: %v", err)
		}
	}
	if s.db != nil {
		if sqlDB, err := s.db.DB(); err == nil {
			if err := sqlDB.Close(); err != nil {
				log.Printf("[Server] Database close failed: %v", err)
			}
		}
	}
}

// Port mengembalikan port efektif dari konfigurasi.
func (s *Server) Port() string {
	return s.cfg.Port
}
