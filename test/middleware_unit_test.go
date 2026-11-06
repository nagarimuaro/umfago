package test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"openjek-backend/internal/auth"
	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestMiddleware_CORS_Preflight(t *testing.T) {
	r := gin.New()
	r.Use(middleware.CORSMiddleware())
	r.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	req, _ := http.NewRequest(http.MethodOptions, "/test", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	req.Header.Set("Access-Control-Request-Method", "POST")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204 No Content for OPTIONS, got %d", w.Code)
	}
	origin := w.Header().Get("Access-Control-Allow-Origin")
	if origin != "http://localhost:5173" {
		t.Errorf("expected origin http://localhost:5173, got %s", origin)
	}
	if w.Header().Get("Access-Control-Allow-Credentials") != "true" {
		t.Error("expected credentials true header")
	}
}

func TestMiddleware_CORS_WildcardFallback(t *testing.T) {
	r := gin.New()
	r.Use(middleware.CORSMiddleware())
	r.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})

	req, _ := http.NewRequest(http.MethodGet, "/ping", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 OK, got %d", w.Code)
	}
	if w.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Errorf("expected wildcard origin, got %s", w.Header().Get("Access-Control-Allow-Origin"))
	}
}

func TestMiddleware_JWTAuth(t *testing.T) {
	jwtSvc := auth.NewJWTService("my-super-secret-key-32-chars-long!")

	r := gin.New()
	r.Use(middleware.JWTAuth(jwtSvc))
	r.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"user_id": c.GetUint(middleware.UserIDKey),
			"role":    c.GetString(middleware.UserRoleKey),
		})
	})

	// 1. Missing header
	reqNoAuth, _ := http.NewRequest(http.MethodGet, "/protected", nil)
	wNoAuth := httptest.NewRecorder()
	r.ServeHTTP(wNoAuth, reqNoAuth)
	if wNoAuth.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for missing auth header, got %d", wNoAuth.Code)
	}

	// 2. Malformed auth header (Basic instead of Bearer)
	reqBasic, _ := http.NewRequest(http.MethodGet, "/protected", nil)
	reqBasic.Header.Set("Authorization", "Basic 123456")
	wBasic := httptest.NewRecorder()
	r.ServeHTTP(wBasic, reqBasic)
	if wBasic.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for non-bearer header, got %d", wBasic.Code)
	}

	// 3. Valid Bearer Token
	token, _ := jwtSvc.GenerateAccessToken(99, "test@example.com", string(models.RoleCustomer))
	reqValid, _ := http.NewRequest(http.MethodGet, "/protected", nil)
	reqValid.Header.Set("Authorization", "Bearer "+token)
	wValid := httptest.NewRecorder()
	r.ServeHTTP(wValid, reqValid)
	if wValid.Code != http.StatusOK {
		t.Errorf("expected 200 for valid token, got %d", wValid.Code)
	}
}

func TestMiddleware_RequireRoleAndDriver(t *testing.T) {
	r := gin.New()
	// Simulated authenticated role in context
	r.Use(func(c *gin.Context) {
		role := c.GetHeader("X-Test-Role")
		c.Set(middleware.UserRoleKey, role)
		c.Next()
	})

	r.GET("/driver-only", middleware.RequireDriver(), func(c *gin.Context) {
		c.String(http.StatusOK, "driver-access-granted")
	})

	// 1. Customer rejected
	reqCust, _ := http.NewRequest(http.MethodGet, "/driver-only", nil)
	reqCust.Header.Set("X-Test-Role", string(models.RoleCustomer))
	wCust := httptest.NewRecorder()
	r.ServeHTTP(wCust, reqCust)
	if wCust.Code != http.StatusForbidden {
		t.Errorf("expected 403 Forbidden for customer accessing driver route, got %d", wCust.Code)
	}

	// 2. Motorcycle driver allowed
	reqMoto, _ := http.NewRequest(http.MethodGet, "/driver-only", nil)
	reqMoto.Header.Set("X-Test-Role", string(models.RoleDriverMotorcycle))
	wMoto := httptest.NewRecorder()
	r.ServeHTTP(wMoto, reqMoto)
	if wMoto.Code != http.StatusOK {
		t.Errorf("expected 200 OK for motorcycle driver, got %d", wMoto.Code)
	}

	// 3. Car driver allowed
	reqCar, _ := http.NewRequest(http.MethodGet, "/driver-only", nil)
	reqCar.Header.Set("X-Test-Role", string(models.RoleDriverCar))
	wCar := httptest.NewRecorder()
	r.ServeHTTP(wCar, reqCar)
	if wCar.Code != http.StatusOK {
		t.Errorf("expected 200 OK for car driver, got %d", wCar.Code)
	}
}

func TestMiddleware_RequireAdminGroup(t *testing.T) {
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(middleware.UserRoleKey, c.GetHeader("X-Test-Role"))
		c.Next()
	})
	r.GET("/admin-area", middleware.RequireAdminGroup(), func(c *gin.Context) {
		c.String(http.StatusOK, "welcome-admin")
	})

	// Non admin rejected
	req, _ := http.NewRequest(http.MethodGet, "/admin-area", nil)
	req.Header.Set("X-Test-Role", string(models.RoleCustomer))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 for non-admin, got %d", w.Code)
	}

	// Admin super allowed
	reqAdmin, _ := http.NewRequest(http.MethodGet, "/admin-area", nil)
	reqAdmin.Header.Set("X-Test-Role", string(models.RoleSuperAdmin))
	wAdmin := httptest.NewRecorder()
	r.ServeHTTP(wAdmin, reqAdmin)
	if wAdmin.Code != http.StatusOK {
		t.Errorf("expected 200 for admin super, got %d", wAdmin.Code)
	}
}
