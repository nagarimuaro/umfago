package models

import (
	"time"

	"gorm.io/gorm"
)

type ChatMessage struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	OrderUUID  string         `gorm:"type:varchar(100);not null;index" json:"order_uuid"`
	SenderID   uint           `gorm:"not null;index" json:"sender_id"`
	ReceiverID uint           `gorm:"not null;index" json:"receiver_id"`
	Message    string         `gorm:"type:text;not null" json:"message"`
	IsRead     bool           `gorm:"default:false" json:"is_read"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}
