package handlers

import (
	"net/http"
	"time"

	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// NotificationHandler — daftar dan penandaan notifikasi milik pengguna sendiri.
//
// Seluruh query di sini dikunci ke user_id dari token. Tidak ada satu pun
// parameter permintaan yang bisa memperluas cakupannya, sehingga tidak ada jalan
// membaca notifikasi milik orang lain dengan menebak nomornya.
type NotificationHandler struct {
	db *gorm.DB
}

func NewNotificationHandler(db *gorm.DB) *NotificationHandler {
	return &NotificationHandler{db: db}
}

// List — GET /api/notifications?unread=true&page=&per_page=
func (h *NotificationHandler) List(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)
	unreadOnly := c.Query("unread") == "true" || c.Query("unread") == "1"

	scoped := func() *gorm.DB {
		q := h.db.Model(&models.Notification{}).Where("user_id = ?", userID)
		if unreadOnly {
			q = q.Where("read_at IS NULL")
		}
		return q
	}

	var total int64
	if err := scoped().Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	page, perPage, offset := paginate(c)

	var notifications []models.Notification
	if err := scoped().Order("created_at desc").Limit(perPage).Offset(offset).
		Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	// Jumlah yang belum dibaca dihitung terpisah dari daftar supaya lencana di
	// aplikasi tidak ikut berubah ketika pengguna menyaring atau berpindah
	// halaman.
	var unread int64
	h.db.Model(&models.Notification{}).
		Where("user_id = ? AND read_at IS NULL", userID).Count(&unread)

	c.JSON(http.StatusOK, gin.H{
		"notifications": notifications,
		"unread_count":  unread,
		"meta":          gin.H{"page": page, "per_page": perPage, "total": total},
	})
}

// UnreadCount — GET /api/notifications/unread-count
func (h *NotificationHandler) UnreadCount(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var unread int64
	if err := h.db.Model(&models.Notification{}).
		Where("user_id = ? AND read_at IS NULL", userID).Count(&unread).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"unread_count": unread})
}

// MarkRead — PUT /api/notifications/:id/read
//
// Penandaan ulang notifikasi yang sudah dibaca dibiarkan lewat tanpa mengubah
// waktu bacanya: syarat `read_at IS NULL` membuat operasi ini idempoten, dan
// aplikasi yang mengirim ulang karena koneksi putus tidak memindahkan stempel
// waktu yang sudah tercatat.
func (h *NotificationHandler) MarkRead(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	// Keberadaan diperiksa dengan cakupan pemilik, sehingga notifikasi milik
	// orang lain dibalas 404 — bukan 403 yang justru memberi tahu penebak bahwa
	// nomor itu ada.
	var notif models.Notification
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&notif).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	if notif.ReadAt == nil {
		now := time.Now()
		if err := h.db.Model(&models.Notification{}).
			Where("id = ? AND user_id = ? AND read_at IS NULL", id, userID).
			Update("read_at", now).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notification as read"})
			return
		}
		notif.ReadAt = &now
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read", "notification": notif})
}

// MarkAllRead — PUT /api/notifications/read-all
func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	result := h.db.Model(&models.Notification{}).
		Where("user_id = ? AND read_at IS NULL", userID).
		Update("read_at", time.Now())

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notifications as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "All notifications marked as read",
		"marked":  result.RowsAffected,
	})
}
