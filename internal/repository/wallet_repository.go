package repository

import (
	"errors"
	"fmt"
	"math"

	"openjek-backend/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ErrInsufficientBalance — saldo tidak cukup untuk didebit
var ErrInsufficientBalance = errors.New("insufficient wallet balance")

// NoMinBalance — batas untuk debit yang tidak boleh gagal karena saldo.
//
// Dipakai pada pelepasan dana titipan di akun perusahaan: kalau debit itu
// gagal, perjalanan yang sudah selesai tidak bisa ditutup dan driver tidak
// dibayar. Saldo perusahaan yang minus adalah keadaan yang harus terlihat di
// laporan dan diselesaikan manusia, bukan alasan menggantung order.
var NoMinBalance = math.Inf(-1)

// WalletRepository — satu-satunya pintu untuk mengubah saldo user.
//
// Semua operasi WAJIB dipanggil di dalam transaksi database dan selalu
// mengambil row lock (SELECT ... FOR UPDATE) sebelum membaca saldo. Tanpa lock,
// dua request bersamaan bisa membaca saldo yang sama lalu saling menimpa hasil
// tulisnya — celah double-spend pada debit dan double-credit pada top up.
//
// Setiap perubahan saldo dicatat sebagai WalletTransaction dalam transaksi yang
// sama, sehingga saldo dan ledger tidak pernah berbeda.
type WalletRepository struct{}

func NewWalletRepository() *WalletRepository {
	return &WalletRepository{}
}

// LockUser — ambil row user dengan FOR UPDATE. Harus dipanggil di dalam transaksi.
func (r *WalletRepository) LockUser(tx *gorm.DB, userID uint) (*models.User, error) {
	var user models.User
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, userID).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Entry — satu baris pergerakan saldo yang akan dibukukan
type Entry struct {
	UserID    uint
	Amount    float64 // selalu positif
	Type      models.TransactionType
	OrderUUID string
	RefID     string
	Note      string

	// MinBalance — batas saldo terbawah yang boleh dicapai oleh debit ini.
	//
	// Nol (nilai bawaan) berarti saldo tidak boleh menembus nol, perilaku yang
	// berlaku untuk hampir semua debit: pembayaran order, penarikan, pembelian.
	// Nilai negatif dipakai khusus untuk komisi order tunai, yang memang boleh
	// membuat saldo driver minus sampai batas tertentu supaya driver tidak perlu
	// deposit lebih dulu sebelum mulai bekerja.
	//
	// Batasnya diserahkan pemanggil, bukan dibaca di sini, agar repository ini
	// tetap tidak tahu-menahu soal setting dinamis — dan agar tidak ada jalur
	// debit yang tiba-tiba boleh minus karena setting berubah.
	MinBalance float64
}

// Credit — tambah saldo user dan catat ke ledger. Harus di dalam transaksi.
func (r *WalletRepository) Credit(tx *gorm.DB, e Entry) (*models.WalletTransaction, error) {
	return r.apply(tx, e, true)
}

// Debit — kurangi saldo user dan catat ke ledger. Harus di dalam transaksi.
//
// Mengembalikan ErrInsufficientBalance bila saldo akan turun di bawah
// e.MinBalance, yang bernilai nol kecuali pemanggil menyetelnya.
func (r *WalletRepository) Debit(tx *gorm.DB, e Entry) (*models.WalletTransaction, error) {
	return r.apply(tx, e, false)
}

func (r *WalletRepository) apply(tx *gorm.DB, e Entry, isCredit bool) (*models.WalletTransaction, error) {
	if e.Amount < 0 {
		return nil, fmt.Errorf("amount must not be negative, got %.2f", e.Amount)
	}
	if e.MinBalance > 0 {
		return nil, fmt.Errorf("min balance must not be positive, got %.2f", e.MinBalance)
	}

	user, err := r.LockUser(tx, e.UserID)
	if err != nil {
		return nil, err
	}

	delta := e.Amount
	if !isCredit {
		if user.Balance-e.Amount < e.MinBalance {
			return nil, ErrInsufficientBalance
		}
		delta = -e.Amount
	}

	newBalance := user.Balance + delta

	// Update relatif terhadap nilai kolom, bukan menulis hasil hitung dari
	// variabel Go. Row sudah dikunci, tapi ini membuat operasinya tetap benar
	// walau di masa depan ada jalur yang lupa mengunci.
	if err := tx.Model(&models.User{}).
		Where("id = ?", e.UserID).
		Update("balance", gorm.Expr("balance + ?", delta)).Error; err != nil {
		return nil, err
	}

	entry := models.WalletTransaction{
		UserID:       e.UserID,
		Amount:       e.Amount,
		Type:         e.Type,
		Status:       models.TxStatusSuccess,
		BalanceAfter: newBalance,
		OrderUUID:    e.OrderUUID,
		RefID:        e.RefID,
		Note:         e.Note,
	}
	if err := tx.Create(&entry).Error; err != nil {
		return nil, err
	}

	return &entry, nil
}

// RecordOnly — catat transaksi tanpa mengubah saldo.
// Dipakai untuk mencatat potongan platform, yang bukan pergerakan saldo user
// melainkan bagian pendapatan yang tidak pernah masuk ke dompet driver.
func (r *WalletRepository) RecordOnly(tx *gorm.DB, e Entry, balanceAfter float64) error {
	entry := models.WalletTransaction{
		UserID:       e.UserID,
		Amount:       e.Amount,
		Type:         e.Type,
		Status:       models.TxStatusSuccess,
		BalanceAfter: balanceAfter,
		OrderUUID:    e.OrderUUID,
		RefID:        e.RefID,
		Note:         e.Note,
	}
	return tx.Create(&entry).Error
}

// ErrAlreadySettled — transaksi sudah pernah diselesaikan sebelumnya
var ErrAlreadySettled = errors.New("transaction already settled")

// SettlePending — selesaikan transaksi yang berstatus PENDING.
//
// Dipakai untuk top up: baris transaksi dibuat lebih dulu saat pembayaran
// dimulai, lalu diselesaikan ketika notifikasi pembayaran tiba. Baris transaksi
// dikunci dan statusnya dicek ulang di dalam transaksi database, sehingga
// notifikasi ganda dari penyedia pembayaran tidak menambah saldo dua kali.
//
// Mengembalikan ErrAlreadySettled bila status transaksi bukan lagi PENDING.
func (r *WalletRepository) SettlePending(tx *gorm.DB, walletTxID uint, success bool) (*models.WalletTransaction, error) {
	var walletTx models.WalletTransaction
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&walletTx, walletTxID).Error; err != nil {
		return nil, err
	}

	if walletTx.Status != models.TxStatusPending {
		return nil, ErrAlreadySettled
	}

	if !success {
		if err := tx.Model(&walletTx).Update("status", models.TxStatusFailed).Error; err != nil {
			return nil, err
		}
		walletTx.Status = models.TxStatusFailed
		return &walletTx, nil
	}

	user, err := r.LockUser(tx, walletTx.UserID)
	if err != nil {
		return nil, err
	}

	delta := walletTx.Amount
	if !walletTx.Type.IsCredit() {
		delta = -walletTx.Amount
		if user.Balance < walletTx.Amount {
			return nil, ErrInsufficientBalance
		}
	}
	newBalance := user.Balance + delta

	if err := tx.Model(&models.User{}).
		Where("id = ?", walletTx.UserID).
		Update("balance", gorm.Expr("balance + ?", delta)).Error; err != nil {
		return nil, err
	}

	if err := tx.Model(&walletTx).Updates(map[string]interface{}{
		"status":        models.TxStatusSuccess,
		"balance_after": newBalance,
	}).Error; err != nil {
		return nil, err
	}

	walletTx.Status = models.TxStatusSuccess
	walletTx.BalanceAfter = newBalance
	return &walletTx, nil
}
