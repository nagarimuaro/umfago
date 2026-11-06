package models

import (
	"strings"
	"time"

	"gorm.io/gorm"
)

// KYCStatus — tahapan verifikasi identitas driver.
//
// Statusnya sengaja disimpan terpisah dari User.IsVerified. IsVerified adalah
// gerbang operasional (boleh menerima order atau tidak), sedangkan status di
// bawah ini adalah keadaan berkasnya. Memisahkan keduanya membuat back-office
// bisa menahan seorang driver tanpa menghapus hasil pemeriksaan dokumennya.
type KYCStatus string

const (
	KYCNotSubmitted KYCStatus = "not_submitted"
	KYCPending      KYCStatus = "pending"
	KYCApproved     KYCStatus = "approved"
	KYCRejected     KYCStatus = "rejected"
)

type DriverProfile struct {
	ID     uint `gorm:"primaryKey" json:"id"`
	UserID uint `gorm:"not null;uniqueIndex" json:"user_id"`

	// Identitas
	IdentityCardNumber   string `gorm:"type:varchar(50)" json:"identity_card_number"`
	IdentityCardPhotoURL string `gorm:"type:varchar(500)" json:"identity_card_photo_url"`

	// Surat izin mengemudi
	LicenseNumber   string     `gorm:"type:varchar(50)" json:"license_number"`
	LicenseExpiry   *time.Time `json:"license_expiry"`
	LicensePhotoURL string     `gorm:"type:varchar(500)" json:"license_photo_url"`

	// Surat kendaraan
	VehicleRegistrationNumber   string `gorm:"type:varchar(50)" json:"vehicle_registration_number"`
	VehicleRegistrationPhotoURL string `gorm:"type:varchar(500)" json:"vehicle_registration_photo_url"`

	// Swafoto sambil memegang KTP, untuk memastikan pemilik berkas dan pemilik
	// akun adalah orang yang sama.
	SelfiePhotoURL string `gorm:"type:varchar(500)" json:"selfie_photo_url"`

	// Rekening pencairan. Disimpan di sini, bukan dikirim per permintaan
	// penarikan, sehingga tujuan dana ikut diperiksa saat KYC ditinjau.
	BankName          string `gorm:"type:varchar(100)" json:"bank_name"`
	BankAccountNumber string `gorm:"type:varchar(50)" json:"bank_account_number"`
	BankAccountName   string `gorm:"type:varchar(100)" json:"bank_account_name"`

	// Status peninjauan
	KYCStatus          KYCStatus  `gorm:"type:varchar(20);default:'not_submitted';index" json:"kyc_status"`
	KYCSubmittedAt     *time.Time `json:"kyc_submitted_at"`
	KYCReviewedAt      *time.Time `json:"kyc_reviewed_at"`
	KYCReviewedBy      *uint      `json:"kyc_reviewed_by"`
	KYCRejectionReason string     `gorm:"type:text" json:"kyc_rejection_reason"`

	TotalTrips int `gorm:"default:0" json:"total_trips"`
	// Tanpa default di sisi database: GORM tidak mengirim kolom bernilai zero
	// saat Create, jadi `default:true` hanya menyembunyikan nilai yang tidak
	// pernah benar-benar dikirim. Nilai bawaan ditentukan di handler KYC,
	// satu-satunya tempat profil driver dibuat.
	IsActive  bool           `json:"is_active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// IsKYCApproved — berkas driver sudah ditinjau dan disetujui back-office.
func (p *DriverProfile) IsKYCApproved() bool {
	return p != nil && p.KYCStatus == KYCApproved
}

// HasPayoutAccount — rekening pencairan terisi lengkap.
func (p *DriverProfile) HasPayoutAccount() bool {
	if p == nil {
		return false
	}
	return strings.TrimSpace(p.BankName) != "" &&
		strings.TrimSpace(p.BankAccountNumber) != "" &&
		strings.TrimSpace(p.BankAccountName) != ""
}

// MissingKYCFields — daftar field wajib yang masih kosong.
//
// Dipakai handler untuk menjelaskan penolakan secara spesifik, sehingga driver
// tahu berkas mana yang harus dilengkapi tanpa harus menebak.
func (p *DriverProfile) MissingKYCFields() []string {
	if p == nil {
		return []string{
			"identity_card_number", "identity_card_photo_url",
			"license_number", "license_expiry", "license_photo_url",
			"vehicle_registration_number", "vehicle_registration_photo_url",
			"selfie_photo_url",
			"bank_name", "bank_account_number", "bank_account_name",
		}
	}

	required := []struct {
		name  string
		value string
	}{
		{"identity_card_number", p.IdentityCardNumber},
		{"identity_card_photo_url", p.IdentityCardPhotoURL},
		{"license_number", p.LicenseNumber},
		{"license_photo_url", p.LicensePhotoURL},
		{"vehicle_registration_number", p.VehicleRegistrationNumber},
		{"vehicle_registration_photo_url", p.VehicleRegistrationPhotoURL},
		{"selfie_photo_url", p.SelfiePhotoURL},
		{"bank_name", p.BankName},
		{"bank_account_number", p.BankAccountNumber},
		{"bank_account_name", p.BankAccountName},
	}

	missing := make([]string, 0, len(required)+1)
	for _, f := range required {
		if strings.TrimSpace(f.value) == "" {
			missing = append(missing, f.name)
		}
	}
	if p.LicenseExpiry == nil {
		missing = append(missing, "license_expiry")
	}
	return missing
}

// MaskedBankAccountNumber — nomor rekening dengan hanya empat digit terakhir
// terlihat. Dipakai pada respons ke driver: cukup untuk memastikan rekening yang
// benar terdaftar, tanpa menjadikan endpoint profil sebagai cara membaca nomor
// rekening utuh dari sesi yang diambil alih.
func (p *DriverProfile) MaskedBankAccountNumber() string {
	if p == nil {
		return ""
	}
	num := strings.TrimSpace(p.BankAccountNumber)
	if len(num) <= 4 {
		return num
	}
	return strings.Repeat("*", len(num)-4) + num[len(num)-4:]
}

type MerchantProfile struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	UserID          uint           `gorm:"not null;uniqueIndex" json:"user_id"`
	BusinessName    string         `gorm:"type:varchar(100);not null" json:"business_name"`
	BusinessAddress string         `gorm:"type:text" json:"business_address"`
	Category        string         `gorm:"type:varchar(50)" json:"category"`
	Lat             float64        `gorm:"default:0" json:"lat"`
	Lon             float64        `gorm:"default:0" json:"lon"`
	LogoURL         string         `gorm:"type:varchar(500)" json:"logo_url"`
	Rating          float64        `gorm:"default:4.8" json:"rating"`
	ReviewCount     int            `gorm:"default:0" json:"review_count"`
	DistanceKm      float64        `gorm:"-" json:"distance_km,omitempty"`
	// IsActive — merchant sudah disetujui back-office dan boleh berjualan.
	// Nilai awalnya false: profil yang baru dibuat sendiri oleh pemiliknya
	// harus melewati persetujuan dulu, bukan langsung tampil ke pembeli.
	IsActive bool `gorm:"default:false;index" json:"is_active"`
	// IsOpen — merchant sedang buka saat ini. Berbeda dari IsActive, ini
	// dikendalikan merchant sendiri sehari-hari.
	IsOpen    bool           `gorm:"default:false" json:"is_open"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
