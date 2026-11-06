package testutil

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"

	"openjek-backend/internal/auth"
	"openjek-backend/internal/handlers"
	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"
	"openjek-backend/internal/pricing"
	"openjek-backend/internal/repository"
	"openjek-backend/internal/sdui"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// TestJWTSecret — secret khusus test. Panjangnya sengaja >= 32 karakter agar
// sama dengan syarat yang diberlakukan config di production.
const TestJWTSecret = "test-secret-key-for-testing-only-32chars"

// SetupRouter — membuat Gin router untuk testing dengan semua route yang sudah terpasang
func SetupRouter(db *gorm.DB) (*gin.Engine, *auth.JWTService) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.HandleMethodNotAllowed = true

	r.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Endpoint not found"})
	})
	r.NoMethod(func(c *gin.Context) {
		c.JSON(http.StatusMethodNotAllowed, gin.H{"error": "Method not allowed"})
	})

	jwtSvc := auth.NewJWTService(TestJWTSecret)

	// Repositories. Redis dilewati (nil) supaya test tidak perlu Redis;
	// SettingsRepository jatuh ke database langsung saat cache tidak ada.
	settingsRepo := repository.NewSettingsRepository(db, nil)
	roleRepo := repository.NewRoleRepository(db)
	walletRepo := repository.NewWalletRepository()
	priceCalc := pricing.NewCalculator(settingsRepo)

	// Hub nil: notifikasi tetap tersimpan di database, hanya pengiriman
	// WebSocket-nya yang dilewati — persis perilaku saat klien sedang offline.
	notifRepo := repository.NewNotificationRepository(db, nil)

	sduiBuilder := sdui.NewBuilder(settingsRepo)

	authHandler := handlers.NewAuthHandler(db, jwtSvc)
	userHandler := handlers.NewUserHandler(roleRepo, jwtSvc)
	sduiHandler := handlers.NewSDUIHandler(sduiBuilder, settingsRepo)

	// rmq dan hub nil: test tidak menjalankan RabbitMQ maupun WebSocket.
	orderHandler := handlers.NewOrderHandler(db, nil, priceCalc, walletRepo, nil, notifRepo)
	// midtransSvc nil agar test tidak memanggil Midtrans.
	walletHandler := handlers.NewWalletHandler(db, nil, walletRepo)
	chatHandler := handlers.NewChatHandler(db, nil)
	profileHandler := handlers.NewProfileHandler(db)
	driverKYCHandler := handlers.NewDriverKYCHandler(db)
	// locRepo nil: tanpa Redis, status di database tetap berubah dan hanya
	// pembersihan indeks geospasial yang dilewati.
	driverStatusHandler := handlers.NewDriverStatusHandler(db, nil, priceCalc)
	fareHandler := handlers.NewFareHandler(priceCalc)
	historyHandler := handlers.NewHistoryHandler(db)
	// midtransSvc nil: webhook harus menolak notifikasi karena tanda tangan
	// tidak bisa diverifikasi. Route tetap dipasang agar perilaku itu teruji.
	webhookHandler := handlers.NewWebhookHandler(db, nil, walletRepo, nil, notifRepo)
	notificationHandler := handlers.NewNotificationHandler(db)
	productHandler := handlers.NewProductHandler(db)
	merchantProductHandler := handlers.NewMerchantProductHandler(db)

	// Direktori unggahan dibuat baru setiap router test, sehingga berkas satu
	// test tidak pernah terlihat oleh test lain.
	uploadDir, err := os.MkdirTemp("", "openjek-uploads-")
	if err != nil {
		uploadDir = filepath.Join(os.TempDir(), "openjek-uploads")
	}
	uploadHandler := handlers.NewUploadHandler(uploadDir)

	adminHandler := handlers.NewAdminHandler(db, walletRepo, roleRepo, notifRepo)
	financeHandler := handlers.NewFinanceHandler(db, walletRepo, notifRepo)
	merchantHandler := handlers.NewMerchantHandler(db)
	adminUserHandler := handlers.NewAdminUserHandler(db, roleRepo)
	promoHandler := handlers.NewPromoHandler(db)
	reportHandler := handlers.NewReportHandler(db)
	enterpriseHandler := handlers.NewEnterpriseHandler(db, nil)

	// Public
	public := r.Group("/api")
	{
		public.POST("/register", authHandler.Register)
		public.POST("/login", authHandler.Login)
		public.POST("/refresh", authHandler.Refresh)
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	r.POST("/webhook/midtrans", webhookHandler.HandleMidtransWebhook)

	// Protected
	protected := r.Group("/api")
	protected.Use(middleware.JWTAuth(jwtSvc))
	protected.Use(middleware.LoadUser(db))
	{
		protected.POST("/logout", authHandler.Logout)
		protected.GET("/user", userHandler.GetCurrentUser)
		protected.POST("/users/roles", authHandler.AddRole)
		protected.PUT("/users/active-role", userHandler.SwitchRole)
		protected.GET("/ui/home", sduiHandler.GetHomeScreen)

		// Order Routes
		protected.GET("/orders", orderHandler.GetOrderHistory)
		protected.POST("/orders", orderHandler.CreateOrder)
		protected.GET("/orders/:uuid", orderHandler.GetOrderByUUID)
		protected.PUT("/orders/:uuid/cancel", orderHandler.CancelOrder)
		protected.PUT("/orders/:uuid/accept", middleware.RequireDriver(), orderHandler.AcceptOrder)
		protected.PUT("/orders/:uuid/reject", middleware.RequireDriver(), orderHandler.RejectOrder)
		protected.PUT("/orders/:uuid/status", middleware.RequireDriver(), orderHandler.UpdateOrderStatus)
		protected.POST("/orders/:uuid/rate", orderHandler.RateOrder)
		protected.POST("/orders/:uuid/chat", chatHandler.SendMessage)
		protected.GET("/orders/:uuid/chat", chatHandler.GetHistory)

		protected.POST("/fare/estimate", fareHandler.Estimate)
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

		// Notifikasi
		protected.GET("/notifications", notificationHandler.List)
		protected.GET("/notifications/unread-count", notificationHandler.UnreadCount)
		protected.PUT("/notifications/:id/read", notificationHandler.MarkRead)
		protected.PUT("/notifications/read-all", notificationHandler.MarkAllRead)

		// Katalog produk pelanggan
		protected.GET("/products", productHandler.List)
		protected.GET("/products/:id", productHandler.Get)

		// Unggah berkas
		protected.POST("/uploads", uploadHandler.Upload)
	}

	r.Static("/uploads", uploadHandler.BaseDir())

	// Riwayat & KYC per peran
	customer := r.Group("/api/customer")
	customer.Use(middleware.JWTAuth(jwtSvc))
	customer.Use(middleware.LoadUser(db))
	customer.Use(middleware.RequireRole(models.RoleCustomer))
	{
		customer.GET("/orders", historyHandler.CustomerOrders)
		customer.GET("/wallet/history", historyHandler.CustomerWalletHistory)
	}

	driver := r.Group("/api/driver")
	driver.Use(middleware.JWTAuth(jwtSvc))
	driver.Use(middleware.LoadUser(db))
	driver.Use(middleware.RequireDriver())
	{
		driver.POST("/kyc", driverKYCHandler.Submit)
		driver.GET("/kyc", driverKYCHandler.Status)
		driver.PUT("/status", driverStatusHandler.SetStatus)
		driver.GET("/orders", historyHandler.DriverOrders)
		driver.GET("/wallet/history", historyHandler.DriverWalletHistory)
		driver.GET("/earnings", historyHandler.DriverEarnings)
	}

	merchant := r.Group("/api/merchant")
	merchant.Use(middleware.JWTAuth(jwtSvc))
	merchant.Use(middleware.LoadUser(db))
	merchant.Use(middleware.RequireRole(models.RoleMerchant))
	{
		merchant.GET("/orders", historyHandler.MerchantOrders)
		merchant.GET("/wallet/history", historyHandler.MerchantWalletHistory)
		merchant.GET("/sales", historyHandler.MerchantSales)

		merchant.GET("/products", merchantProductHandler.List)
		merchant.POST("/products", merchantProductHandler.Create)
		merchant.GET("/products/:id", merchantProductHandler.Get)
		merchant.PUT("/products/:id", merchantProductHandler.Update)
		merchant.DELETE("/products/:id", merchantProductHandler.Delete)
	}

	// Admin
	admin := r.Group("/api/admin")
	admin.Use(middleware.JWTAuth(jwtSvc))
	admin.Use(middleware.RequireAdminGroup())
	{
		admin.GET("/settings",
			middleware.RequirePermission(db, models.PermSettingsManage),
			sduiHandler.GetSettings,
		)
		admin.PUT("/settings/:key",
			middleware.RequirePermission(db, models.PermSettingsManage),
			sduiHandler.UpdateSetting,
		)

		admin.GET("/drivers",
			middleware.RequirePermission(db, models.PermDriversView),
			adminHandler.ListDrivers,
		)
		admin.PUT("/drivers/:id/verify",
			middleware.RequirePermission(db, models.PermDriversVerify),
			adminHandler.VerifyDriver,
		)
		admin.PUT("/drivers/:id/reject-kyc",
			middleware.RequirePermission(db, models.PermDriversVerify),
			adminHandler.RejectDriverKYC,
		)
		admin.GET("/drivers/:id/kyc",
			middleware.RequirePermission(db, models.PermDriversView),
			adminHandler.GetDriverKYC,
		)
		admin.PUT("/drivers/:id/suspend",
			middleware.RequirePermission(db, models.PermDriversSuspend),
			adminHandler.SuspendDriver,
		)
		admin.PUT("/drivers/:id/reactivate",
			middleware.RequirePermission(db, models.PermDriversSuspend),
			adminHandler.ReactivateDriver,
		)
		admin.POST("/drivers/:id/bonus",
			middleware.RequirePermission(db, models.PermDriversBonus),
			adminHandler.GiveDriverBonus,
		)

		admin.GET("/orders",
			middleware.RequirePermission(db, models.PermOrdersView),
			adminHandler.AdminListOrders,
		)
		admin.PUT("/orders/:uuid/cancel",
			middleware.RequirePermission(db, models.PermOrdersCancelAny),
			adminHandler.AdminCancelOrder,
		)
		admin.PUT("/orders/:uuid/force-complete",
			middleware.RequirePermission(db, models.PermOrdersForceComplete),
			adminHandler.ForceCompleteOrder,
		)

		admin.GET("/finance/report",
			middleware.RequirePermission(db, models.PermFinanceViewReport),
			financeHandler.Report,
		)
		admin.GET("/finance/withdrawals",
			middleware.RequirePermission(db, models.PermFinanceViewReport),
			financeHandler.ListWithdrawals,
		)
		admin.PUT("/finance/withdrawals/:id/disburse",
			middleware.RequirePermission(db, models.PermFinanceDisbursement),
			financeHandler.Disburse,
		)
		admin.PUT("/finance/withdrawals/:id/reject",
			middleware.RequirePermission(db, models.PermFinanceDisbursement),
			financeHandler.RejectWithdrawal,
		)
		admin.POST("/finance/refunds",
			middleware.RequirePermission(db, models.PermFinanceRefund),
			financeHandler.Refund,
		)

		admin.GET("/merchants",
			middleware.RequirePermission(db, models.PermMerchantsView),
			merchantHandler.List,
		)
		admin.GET("/merchants/:id",
			middleware.RequirePermission(db, models.PermMerchantsView),
			merchantHandler.Get,
		)
		admin.PUT("/merchants/:id/approve",
			middleware.RequirePermission(db, models.PermMerchantsApprove),
			merchantHandler.Approve,
		)
		admin.PUT("/merchants/:id/suspend",
			middleware.RequirePermission(db, models.PermMerchantsSuspend),
			merchantHandler.Suspend,
		)

		admin.GET("/users",
			middleware.RequirePermission(db, models.PermUsersView),
			adminUserHandler.List,
		)
		admin.GET("/users/:id",
			middleware.RequirePermission(db, models.PermUsersView),
			adminUserHandler.Get,
		)
		admin.PUT("/users/:id/active",
			middleware.RequirePermission(db, models.PermUsersManage),
			adminUserHandler.SetActive,
		)
		admin.POST("/users/:id/roles",
			middleware.RequirePermission(db, models.PermUsersManage),
			adminUserHandler.AssignRole,
		)
		admin.DELETE("/users/:id/roles/:role",
			middleware.RequirePermission(db, models.PermUsersManage),
			adminUserHandler.RevokeRole,
		)

		admin.GET("/promos",
			middleware.RequirePermission(db, models.PermPromoManage),
			promoHandler.List,
		)
		admin.POST("/promos",
			middleware.RequirePermission(db, models.PermPromoManage),
			promoHandler.Create,
		)
		admin.PUT("/promos/:id",
			middleware.RequirePermission(db, models.PermPromoManage),
			promoHandler.Update,
		)
		admin.DELETE("/promos/:id",
			middleware.RequirePermission(db, models.PermPromoManage),
			promoHandler.Delete,
		)
		admin.GET("/promos/:id/usage",
			middleware.RequirePermission(db, models.PermPromoManage),
			promoHandler.Usage,
		)

		admin.GET("/reports/dashboard",
			middleware.RequirePermission(db, models.PermReportsView),
			reportHandler.Dashboard,
		)
		admin.GET("/reports/sales",
			middleware.RequirePermission(db, models.PermReportsSales),
			reportHandler.Sales,
		)
		admin.GET("/reports/top-drivers",
			middleware.RequirePermission(db, models.PermReportsView),
			reportHandler.TopDrivers,
		)

		// ── Enterprise Extensions ─────────────────────────────
		admin.GET("/map/live-drivers",
			middleware.RequirePermission(db, models.PermDriversView),
			enterpriseHandler.LiveDrivers,
		)
		admin.GET("/cities",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.ListCities,
		)
		admin.POST("/cities",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.CreateCity,
		)
		admin.PUT("/cities/:id",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.UpdateCity,
		)
		admin.GET("/branches",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.ListBranches,
		)
		admin.POST("/branches",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.CreateBranch,
		)
		admin.GET("/zones",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.ListZones,
		)
		admin.POST("/zones",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.CreateZone,
		)
		admin.DELETE("/zones/:id",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.DeleteZone,
		)
		admin.GET("/services",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.ListServices,
		)
		admin.PUT("/services/:id",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.UpdateService,
		)
		admin.GET("/fleet",
			middleware.RequirePermission(db, models.PermDriversView),
			enterpriseHandler.ListFleet,
		)
		admin.GET("/support/tickets",
			middleware.RequirePermission(db, models.PermOrdersView),
			enterpriseHandler.ListTickets,
		)
		admin.PUT("/support/tickets/:id",
			middleware.RequirePermission(db, models.PermOrdersView),
			enterpriseHandler.UpdateTicket,
		)
		admin.GET("/risk/cases",
			middleware.RequirePermission(db, models.PermOrdersView),
			enterpriseHandler.ListRiskCases,
		)
		admin.PUT("/risk/cases/:id",
			middleware.RequirePermission(db, models.PermOrdersView),
			enterpriseHandler.UpdateRiskCase,
		)
		admin.GET("/approvals",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.ListApprovals,
		)
		admin.PUT("/approvals/:id",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.DecideApproval,
		)
		admin.GET("/audit-logs",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.ListAuditLogs,
		)
		admin.GET("/feature-flags",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.ListFeatureFlags,
		)
		admin.PUT("/feature-flags/:key",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.UpdateFeatureFlag,
		)
		admin.GET("/system/health",
			middleware.RequirePermission(db, models.PermSettingsManage),
			enterpriseHandler.SystemHealth,
		)
	}

	return r, jwtSvc
}

// JSONRequest — helper untuk membuat HTTP request dengan body JSON
func JSONRequest(method, url string, body interface{}, token string) *http.Request {
	var buf bytes.Buffer
	if body != nil {
		json.NewEncoder(&buf).Encode(body)
	}
	req, _ := http.NewRequest(method, url, &buf)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	return req
}

// Do — eksekusi request ke router dan kembalikan response
func Do(router *gin.Engine, req *http.Request) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

// ParseJSON — parse JSON response ke map
func ParseJSON(w *httptest.ResponseRecorder) map[string]interface{} {
	var result map[string]interface{}
	json.NewDecoder(w.Body).Decode(&result)
	return result
}
