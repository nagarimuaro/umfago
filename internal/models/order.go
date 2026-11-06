package models

import (
	"time"

	"gorm.io/gorm"
)

type OrderStatus string
type PaymentMethod string

const (
	StatusSearching  OrderStatus = "searching"
	StatusAccepted   OrderStatus = "accepted"
	StatusArrived    OrderStatus = "arrived"
	StatusInProgress OrderStatus = "in_progress"
	StatusCompleted  OrderStatus = "completed"
	StatusCancelled  OrderStatus = "cancelled"
)

const (
	PaymentCash   PaymentMethod = "cash"
	PaymentWallet PaymentMethod = "wallet"
)

// Jenis kendaraan yang menentukan driver mana yang boleh menerima order.
const (
	VehicleMotorcycle = "motorcycle"
	VehicleCar        = "car"
)

// VehicleTypeForRole — jenis kendaraan yang dilayani sebuah role driver.
// Mengembalikan string kosong bila role bukan role driver.
func VehicleTypeForRole(code RoleCode) string {
	switch code {
	case RoleDriverMotorcycle:
		return VehicleMotorcycle
	case RoleDriverCar:
		return VehicleCar
	default:
		return ""
	}
}

// ServiceTypes — nilai service_type yang diterima saat order dibuat.
//
// Dipakai juga untuk menyusun pesan penolakan, sehingga daftar yang dikirim ke
// klien tidak bisa menyimpang dari daftar yang benar-benar diterima.
var ServiceTypes = []string{"ride", VehicleMotorcycle, VehicleCar, "taxi", "food", "send"}

// NormalizeVehicleType — terjemahkan service_type dari klien ke jenis kendaraan.
//
// Mengembalikan string kosong bila nilainya tidak dikenali. Sebelumnya nilai
// asing jatuh ke motorcycle secara diam-diam, yang berarti penumpang bisa
// menerima estimasi mobil dari /api/fare/estimate — yang menolak nilai asing —
// lalu mendapat order motor dengan tarif mobil. Pemanggil sekarang wajib
// menolak string kosong.
func NormalizeVehicleType(serviceType string) string {
	switch serviceType {
	case VehicleCar, "taxi":
		return VehicleCar
	case VehicleMotorcycle, "ride", "food", "send":
		return VehicleMotorcycle
	default:
		return ""
	}
}

type Order struct {
	gorm.Model
	UUID     string `json:"uuid" gorm:"uniqueIndex;not null"`
	RiderID  uint   `json:"rider_id" gorm:"not null;index"`
	DriverID *uint  `json:"driver_id" gorm:"index"`
	// MerchantID diisi untuk order yang berasal dari sebuah merchant (misalnya
	// pesan-antar makanan). Order antar-jemput biasa menyimpan NULL, karena itu
	// tipenya pointer.
	MerchantID *uint       `json:"merchant_id" gorm:"index"`
	VehicleID  *uint       `json:"vehicle_id"`
	Status     OrderStatus `json:"status" gorm:"default:'searching'"`

	// Location
	PickupLat      float64 `json:"pickup_lat" gorm:"not null"`
	PickupLon      float64 `json:"pickup_lon" gorm:"not null"`
	PickupAddress  string  `json:"pickup_address"`
	DropoffLat     float64 `json:"dropoff_lat" gorm:"not null"`
	DropoffLon     float64 `json:"dropoff_lon" gorm:"not null"`
	DropoffAddress string  `json:"dropoff_address"`
	DistanceKm     float64 `json:"distance_km"`

	// Pricing & Payment
	FareAmount float64 `json:"fare_amount"`
	// CustomerFee adalah biaya layanan yang ditagih di atas tarif. Disimpan
	// permanen karena persentasenya bisa berubah antara pembuatan dan penyelesaian
	// order, dan yang benar adalah nilai yang sungguh dibayar penumpang.
	CustomerFee float64 `json:"customer_fee"`
	// PlatformFee, DriverEarning, dan MerchantFee diisi saat order selesai,
	// sehingga pembagian pendapatan tetap tercatat walau persentase fee berubah
	// kemudian.
	PlatformFee   float64       `json:"platform_fee"`
	DriverEarning float64       `json:"driver_earning"`
	MerchantFee   float64       `json:"merchant_fee"`
	Currency      string        `json:"currency" gorm:"default:'IDR'"`
	PaymentMethod PaymentMethod `json:"payment_method" gorm:"default:'cash'"`
	// VoucherCode menyimpan kode promo yang terpasang pada order ini.
	VoucherCode string `json:"voucher_code"`
	// PromoID dan PromoDiscount dikunci saat order dibuat, sama seperti
	// PlatformFee: aturan promo yang berubah kemudian tidak boleh mengubah
	// catatan order lama.
	PromoID       *uint   `json:"promo_id" gorm:"index"`
	PromoDiscount float64 `json:"promo_discount"`
	// VehicleType menentukan jenis driver yang boleh menerima order ini.
	VehicleType string `json:"vehicle_type" gorm:"default:'motorcycle';index"`
	// ServiceType menyimpan jenis layanan aplikasi (ride, car, food, send, mart, med).
	ServiceType string `json:"service_type" gorm:"type:varchar(50);default:'ride';index"`

	// Ratings
	CustomerRating *int   `json:"customer_rating"` // Rating yang diberikan Customer ke Driver
	DriverRating   *int   `json:"driver_rating"`   // Rating yang diberikan Driver ke Customer
	ReviewNote     string `json:"review_note"`

	// Timestamps
	AcceptedAt  *time.Time `json:"accepted_at"`
	ArrivedAt   *time.Time `json:"arrived_at"`
	PickedUpAt  *time.Time `json:"picked_up_at"`
	CompletedAt *time.Time `json:"completed_at"`
	CancelledAt *time.Time `json:"cancelled_at"`

	// Relations (Preload)
	Rider    *User `json:"rider,omitempty" gorm:"foreignKey:RiderID"`
	Driver   *User `json:"driver,omitempty" gorm:"foreignKey:DriverID"`
	Merchant *User `json:"merchant,omitempty" gorm:"foreignKey:MerchantID"`
}
