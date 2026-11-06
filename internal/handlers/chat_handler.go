package handlers

import (
	"encoding/json"
	"net/http"

	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"
	ws "openjek-backend/internal/websocket"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ChatHandler struct {
	db  *gorm.DB
	hub *ws.Hub
}

func NewChatHandler(db *gorm.DB, hub *ws.Hub) *ChatHandler {
	return &ChatHandler{db: db, hub: hub}
}

// chatClosed — jendela percakapan sudah tertutup untuk order ini.
//
// Chat terbuka sejak driver didapat sampai perjalanan berakhir. Order yang
// selesai atau dibatalkan menutup pengiriman: setelah penumpang turun, tidak ada
// lagi yang perlu dikoordinasikan, dan saluran yang dibiarkan terbuka
// berhari-hari kemudian adalah saluran untuk menghubungi orang asing yang
// nomornya tidak pernah dibagikan.
func chatClosed(order *models.Order) bool {
	return order.Status == models.StatusCompleted || order.Status == models.StatusCancelled
}

// SendMessage - Mengirim pesan ke lawan bicara (driver/rider)
func (h *ChatHandler) SendMessage(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)
	uuidParam := c.Param("uuid")

	var req struct {
		Message string `json:"message" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	// 1. Cari Order untuk memvalidasi apakah user berhak chat di order ini
	var order models.Order
	if err := h.db.Where("uuid = ?", uuidParam).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Tentukan ReceiverID (jika sender = rider, receiver = driver, dst)
	var receiverID uint
	if order.RiderID == userID {
		if order.DriverID == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Driver not assigned yet"})
			return
		}
		receiverID = *order.DriverID
	} else if order.DriverID != nil && *order.DriverID == userID {
		receiverID = order.RiderID
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to chat in this order"})
		return
	}

	// Penjaga status diletakkan setelah pemeriksaan peserta, sehingga orang yang
	// bukan peserta tetap menerima 403 dan tidak bisa menyimpulkan status order
	// milik orang lain dari perbedaan kode balasan.
	if chatClosed(&order) {
		c.JSON(http.StatusConflict, gin.H{
			"error":       "Chat is closed for this order",
			"chat_closed": true,
			"status":      order.Status,
		})
		return
	}

	// 2. Simpan pesan ke DB
	chatMsg := models.ChatMessage{
		OrderUUID:  order.UUID,
		SenderID:   userID,
		ReceiverID: receiverID,
		Message:    req.Message,
	}

	if err := h.db.Create(&chatMsg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save message"})
		return
	}

	// Tandai pesan-pesan sebelumnya dari lawan bicara sebagai terbaca karena user sudah membalas
	_ = h.db.Model(&models.ChatMessage{}).
		Where("order_uuid = ? AND receiver_id = ? AND is_read = false", order.UUID, userID).
		Update("is_read", true).Error

	// 3. Notifikasi via WebSocket
	if h.hub != nil {
		payload, _ := json.Marshal(map[string]interface{}{
			"order_uuid": order.UUID,
			"sender_id":  userID,
			"message":    req.Message,
			"created_at": chatMsg.CreatedAt,
		})

		h.hub.SendToUser(receiverID, ws.Message{
			Type:    "chat_message",
			Payload: json.RawMessage(payload),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Message sent",
		"data":    chatMsg,
	})
}

// GetHistory - Ambil riwayat chat untuk sebuah order
//
// Riwayat tetap terbaca setelah order selesai. Percakapan itulah bukti yang
// dipakai CS saat menangani komplain, dan menyembunyikannya dari pengguna tidak
// menghapusnya dari database — hanya membuat pengguna tidak bisa menunjukkan apa
// yang terjadi.
func (h *ChatHandler) GetHistory(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)
	uuidParam := c.Param("uuid")

	// Validasi kepemilikan
	var order models.Order
	if err := h.db.Where("uuid = ?", uuidParam).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	if order.RiderID != userID && (order.DriverID == nil || *order.DriverID != userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to view this chat"})
		return
	}

	var total int64
	if err := h.db.Model(&models.ChatMessage{}).Where("order_uuid = ?", uuidParam).
		Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	page, perPage, offset := paginate(c)

	var messages []models.ChatMessage
	if err := h.db.Where("order_uuid = ?", uuidParam).Order("created_at asc").
		Limit(perPage).Offset(offset).Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	// Otomatis tandai pesan yang diterima user ini sebagai terbaca saat membuka percakapan
	_ = h.db.Model(&models.ChatMessage{}).
		Where("order_uuid = ? AND receiver_id = ? AND is_read = false", uuidParam, userID).
		Update("is_read", true).Error

	// chat_closed dikirim di sini supaya aplikasi tahu harus menyembunyikan kolom
	// ketik tanpa menebak dari status order yang mungkin sudah basi di layarnya.
	c.JSON(http.StatusOK, gin.H{
		"messages":    messages,
		"chat_closed": chatClosed(&order),
		"status":      order.Status,
		"meta":        gin.H{"page": page, "per_page": perPage, "total": total},
	})
}

// MarkAsRead - Menandai semua pesan dalam order ini sebagai telah dibaca
func (h *ChatHandler) MarkAsRead(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)
	uuidParam := c.Param("uuid")

	// Validasi kepemilikan order
	var order models.Order
	if err := h.db.Where("uuid = ?", uuidParam).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	if order.RiderID != userID && (order.DriverID == nil || *order.DriverID != userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to access this chat"})
		return
	}

	if err := h.db.Model(&models.ChatMessage{}).
		Where("order_uuid = ? AND receiver_id = ? AND is_read = false", uuidParam, userID).
		Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Chat marked as read"})
}
