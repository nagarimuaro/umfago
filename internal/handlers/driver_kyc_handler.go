package handlers

import (
	"net/http"
	"net/url"
	"strings"
	"time"

	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// DriverKYCHandler — pengajuan dan pemantauan verifikasi identitas driver.
//
// Berkas KYC tidak boleh ditulis lewat endpoint profil biasa: begitu sebuah
// pengajuan masuk peninjauan, isinya menjadi bahan keputusan back-office dan
// tidak boleh berubah tanpa jejak. Karena itu jalur penulisannya dipisah ke
// handler ini, dan endpoint profil driver menolak menyentuh field yang sama
// selama pengajuan berjalan atau sudah disetujui.
type DriverKYCHandler struct {
	db *gorm.DB
}

func NewDriverKYCHandler(db *gorm.DB) *DriverKYCHandler {
	return &DriverKYCHandler{db: db}
}

// kycSubmission — bentuk permintaan pengajuan KYC.
//
// Unggahan berkas belum tersedia di backend ini, jadi klien mengirim URL hasil
// unggahannya. Yang diperiksa di sini hanya kelengkapannya; keaslian dokumen
// tetap dinilai manusia saat peninjauan.
type kycSubmission struct {
	IdentityCardNumber   string `json:"identity_card_number" binding:"required"`
	IdentityCardPhotoURL string `json:"identity_card_photo_url" binding:"required"`

	LicenseNumber   string `json:"license_number" binding:"required"`
	LicenseExpiry   string `json:"license_expiry" binding:"required"` // YYYY-MM-DD
	LicensePhotoURL string `json:"license_photo_url" binding:"required"`

	VehicleRegistrationNumber   string `json:"vehicle_registration_number" binding:"required"`
	VehicleRegistrationPhotoURL string `json:"vehicle_registration_photo_url" binding:"required"`

	SelfiePhotoURL string `json:"selfie_photo_url" binding:"required"`

	BankName          string `json:"bank_name" binding:"required"`
	BankAccountNumber string `json:"bank_account_number" binding:"required"`
	BankAccountName   string `json:"bank_account_name" binding:"required"`
}

// maxDocumentURLLen — sepanjang kolom penyimpanannya (varchar(500)). Diperiksa
// di sini supaya URL kepanjangan dijawab 422 yang bisa diperbaiki klien, bukan
// error database yang muncul sebagai 500.
const maxDocumentURLLen = 500

// validDocumentURL — URL berkas yang layak disimpan dan dibuka peninjau.
//
// Hanya http/https absolut yang diterima. Tanpa pemeriksaan ini, isian seperti
// "javascript:..." atau "file:///..." ikut tersimpan apa adanya dan baru
// menjadi masalah di layar back-office yang membukanya.
func validDocumentURL(raw string) bool {
	if raw == "" || len(raw) > maxDocumentURLLen {
		return false
	}
	u, err := url.Parse(raw)
	if err != nil {
		return false
	}
	return (u.Scheme == "http" || u.Scheme == "https") && u.Host != ""
}

// Submit — POST /api/driver/kyc
func (h *DriverKYCHandler) Submit(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var req kycSubmission
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	expiry, err := time.Parse("2006-01-02", strings.TrimSpace(req.LicenseExpiry))
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": "license_expiry must be a date in YYYY-MM-DD format",
		})
		return
	}
	// SIM yang sudah kedaluwarsa bukan dokumen yang bisa diverifikasi.
	if expiry.Before(time.Now()) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Driving license has expired"})
		return
	}

	// Keempat berkas ini akan dibuka peninjau di back-office, jadi isiannya harus
	// benar-benar sebuah alamat berkas, bukan sekadar teks yang tidak kosong.
	documents := []struct {
		field string
		value string
	}{
		{"identity_card_photo_url", req.IdentityCardPhotoURL},
		{"license_photo_url", req.LicensePhotoURL},
		{"vehicle_registration_photo_url", req.VehicleRegistrationPhotoURL},
		{"selfie_photo_url", req.SelfiePhotoURL},
	}
	for _, doc := range documents {
		if !validDocumentURL(strings.TrimSpace(doc.value)) {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"error": doc.field + " must be an http or https URL of at most 500 characters",
			})
			return
		}
	}

	var profile models.DriverProfile
	err = h.db.Where("user_id = ?", userID).First(&profile).Error
	isNew := err == gorm.ErrRecordNotFound
	if err != nil && !isNew {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Pengajuan yang sedang ditinjau tidak boleh ditimpa. Membiarkannya berarti
	// admin bisa menyetujui berkas yang berbeda dari yang dilihatnya.
	if profile.KYCStatus == models.KYCPending {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Your KYC submission is still under review",
		})
		return
	}

	wasApproved := profile.KYCStatus == models.KYCApproved

	profile.UserID = userID
	profile.IdentityCardNumber = strings.TrimSpace(req.IdentityCardNumber)
	profile.IdentityCardPhotoURL = strings.TrimSpace(req.IdentityCardPhotoURL)
	profile.LicenseNumber = strings.TrimSpace(req.LicenseNumber)
	profile.LicenseExpiry = &expiry
	profile.LicensePhotoURL = strings.TrimSpace(req.LicensePhotoURL)
	profile.VehicleRegistrationNumber = strings.TrimSpace(req.VehicleRegistrationNumber)
	profile.VehicleRegistrationPhotoURL = strings.TrimSpace(req.VehicleRegistrationPhotoURL)
	profile.SelfiePhotoURL = strings.TrimSpace(req.SelfiePhotoURL)
	profile.BankName = strings.TrimSpace(req.BankName)
	profile.BankAccountNumber = strings.TrimSpace(req.BankAccountNumber)
	profile.BankAccountName = strings.TrimSpace(req.BankAccountName)
	profile.KYCStatus = models.KYCPending
	profile.KYCSubmittedAt = timeNow()
	profile.KYCReviewedAt = nil
	profile.KYCReviewedBy = nil
	profile.KYCRejectionReason = ""

	txErr := h.db.Transaction(func(tx *gorm.DB) error {
		if isNew {
			// Ditulis eksplisit, bukan diserahkan pada default kolom: GORM tidak
			// mengirim kolom bernilai zero saat Create, sehingga default di sisi
			// database tidak bisa dipercaya untuk menentukan nilai bawaan.
			profile.IsActive = true
			if err := tx.Create(&profile).Error; err != nil {
				return err
			}
		} else if err := tx.Save(&profile).Error; err != nil {
			return err
		}

		// Mengubah berkas — terutama rekening tujuan — setelah disetujui adalah
		// persis pola yang dipakai saat sebuah akun diambil alih. Verifikasinya
		// dicabut sampai ada manusia yang meninjau ulang.
		if wasApproved {
			return tx.Model(&models.User{}).Where("id = ?", userID).
				Update("is_verified", false).Error
		}
		return nil
	})
	if txErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit KYC"})
		return
	}

	resp := gin.H{
		"message": "KYC submitted, waiting for review",
		"kyc":     kycStatusResponse(&profile),
	}
	if wasApproved {
		resp["message"] = "KYC resubmitted. Your driver verification is paused until it is reviewed again."
	}
	c.JSON(http.StatusOK, resp)
}

// Status — GET /api/driver/kyc
func (h *DriverKYCHandler) Status(c *gin.Context) {
	userID := c.GetUint(middleware.UserIDKey)

	var profile models.DriverProfile
	err := h.db.Where("user_id = ?", userID).First(&profile).Error
	if err == gorm.ErrRecordNotFound {
		c.JSON(http.StatusOK, gin.H{"kyc": kycStatusResponse(nil)})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"kyc": kycStatusResponse(&profile)})
}

// kycStatusResponse — ringkasan status KYC untuk driver sendiri.
//
// Nomor rekening dikirim tersamar. Driver hanya perlu memastikan rekening yang
// benar terdaftar, dan respons ini tidak perlu menjadi cara membaca nomor
// rekening utuh dari sesi yang bukan miliknya.
func kycStatusResponse(p *models.DriverProfile) gin.H {
	if p == nil {
		return gin.H{
			"status":         models.KYCNotSubmitted,
			"missing_fields": (*models.DriverProfile)(nil).MissingKYCFields(),
		}
	}

	status := p.KYCStatus
	if status == "" {
		status = models.KYCNotSubmitted
	}

	return gin.H{
		"status":              status,
		"submitted_at":        p.KYCSubmittedAt,
		"reviewed_at":         p.KYCReviewedAt,
		"rejection_reason":    p.KYCRejectionReason,
		"missing_fields":      p.MissingKYCFields(),
		"bank_name":           p.BankName,
		"bank_account_number": p.MaskedBankAccountNumber(),
		"bank_account_name":   p.BankAccountName,
		"license_expiry":      p.LicenseExpiry,
	}
}
