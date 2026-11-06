package handlers

import (
	"context"
	"log"
	"net/http"
	"strings"

	"openjek-backend/internal/auth"
	"openjek-backend/internal/middleware"
	"openjek-backend/internal/repository"
	ws "openjek-backend/internal/websocket"

	"github.com/gin-gonic/gin"
	gorillaws "github.com/gorilla/websocket"
)

type WebSocketHandler struct {
	hub      *ws.Hub
	jwtSvc   *auth.JWTService
	locRepo  *repository.LocationRepository
	upgrader gorillaws.Upgrader
}

// NewWebSocketHandler membuat handler upgrade WebSocket.
//
// allowedOrigins berisi daftar origin browser yang boleh membuka koneksi.
// Permintaan tanpa header Origin (aplikasi Android, klien non-browser) tetap
// diterima karena bukan sasaran serangan cross-site. Browser yang mengirim
// Origin harus cocok dengan daftar ini; menerima semua origin membuat situs
// mana pun bisa membuka koneksi memakai cookie/token korban.
func NewWebSocketHandler(
	hub *ws.Hub,
	jwtSvc *auth.JWTService,
	locRepo *repository.LocationRepository,
	allowedOrigins []string,
) *WebSocketHandler {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[strings.ToLower(strings.TrimSpace(o))] = struct{}{}
	}

	return &WebSocketHandler{
		hub:     hub,
		jwtSvc:  jwtSvc,
		locRepo: locRepo,
		upgrader: gorillaws.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				origin := r.Header.Get("Origin")
				if origin == "" {
					return true
				}
				low := strings.ToLower(origin)
				if _, ok := allowed[low]; ok {
					return true
				}
				// Di development, izinkan origin localhost atau 127.0.0.1 dari browser/Expo/Vite
				if strings.HasPrefix(low, "http://localhost:") ||
					strings.HasPrefix(low, "https://localhost:") ||
					strings.HasPrefix(low, "http://127.0.0.1:") ||
					strings.HasPrefix(low, "https://127.0.0.1:") ||
					low == "http://localhost" || low == "http://127.0.0.1" {
					return true
				}
				log.Printf("[WS] Rejected origin: %s", origin)
				return false
			},
		},
	}
}

// HandleWS — GET /ws?token=<access_token>
// Klien Android terhubung dengan menyertakan JWT di query string
func (h *WebSocketHandler) HandleWS(c *gin.Context) {
	// Validasi JWT dari query param (WebSocket tidak punya Authorization header)
	tokenStr := c.Query("token")
	if tokenStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token is required"})
		return
	}

	claims, err := h.jwtSvc.ValidateAccessToken(tokenStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
		return
	}

	// Upgrade koneksi HTTP ke WebSocket
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WS] Upgrade failed: %v", err)
		return
	}

	client := ws.NewClient(claims.UserID, claims.Role, conn, h.hub)

	// Daftarkan klien ke Hub
	h.hub.Register(client)

	// Fungsi yang akan dipanggil saat driver mengirim update lokasi
	locationUpdater := func(driverID uint, lat, lon float64) {
		if h.locRepo == nil {
			return
		}
		if err := h.locRepo.UpdateDriverLocation(context.Background(), driverID, lat, lon); err != nil {
			log.Printf("[WS] Failed to update driver location: %v", err)
		}
	}

	// Jalankan read & write pump secara concurrent
	go client.WritePump()
	go client.ReadPump(locationUpdater)
}

// GetUserIDFromContext — helper untuk ambil user_id dari Gin context
func GetUserIDFromContext(c *gin.Context) uint {
	return c.GetUint(middleware.UserIDKey)
}
