package models

import (
	"time"

	"gorm.io/gorm"
)

// UserAddress — alamat tersimpan milik pengguna (Rumah, Kantor, Kos, dll).
type UserAddress struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"not null;index" json:"user_id"`
	Label     string         `gorm:"type:varchar(100);not null" json:"label"`
	Address   string         `gorm:"type:text;not null" json:"address"`
	Note      string         `gorm:"type:text" json:"note"`
	Area      string         `gorm:"type:varchar(150)" json:"area"`
	Lat       float64        `gorm:"default:0" json:"lat"`
	Lon       float64        `gorm:"default:0" json:"lon"`
	Icon      string         `gorm:"type:varchar(50);default:'location-on'" json:"icon"`
	IsDefault bool           `gorm:"default:false" json:"is_default"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

