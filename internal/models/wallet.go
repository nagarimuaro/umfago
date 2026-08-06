package models

import (
	"time"

	"gorm.io/gorm"
)

type TransactionType string
type TransactionStatus string

const (
	TxTypeDeposit    TransactionType = "DEPOSIT"    // top up saldo
	TxTypeWithdrawal TransactionType = "WITHDRAWAL" // penarikan saldo oleh user
	TxTypePayment    TransactionType = "PAYMENT"    // pembayaran order oleh customer
	TxTypeRefund     TransactionType = "REFUND"     // pengembalian dana ke customer
	TxTypeEarning    TransactionType = "EARNING"    // pendapatan driver dari order
	TxTypeFee        TransactionType = "FEE"        // potongan platform yang menjadi pendapatan perusahaan
	TxTypeBonus      TransactionType = "BONUS"      // bonus dari admin ke driver
	TxTypeDisbursed  TransactionType = "DISBURSED"  // pencairan saldo driver oleh keuangan

	// TxTypeEscrow dan TxTypeEscrowRelease menandai dana penumpang yang sedang
	// dititipkan di akun perusahaan antara saat order dibuat dan saat order
	// berakhir. Keduanya selalu berpasangan dengan nominal yang sama, sehingga
	// pendapatan perusahaan yang sesungguhnya bisa dihitung tanpa ikut menghitung
	// uang yang hanya numpang lewat.
	TxTypeEscrow        TransactionType = "ESCROW"         // dana penumpang masuk titipan
	TxTypeEscrowRelease TransactionType = "ESCROW_RELEASE" // titipan dilepas saat order selesai atau batal

	TxStatusPending TransactionStatus = "PENDING"
	TxStatusSuccess TransactionStatus = "SUCCESS"
	TxStatusFailed  TransactionStatus = "FAILED"
)

// IsCredit — apakah jenis transaksi menambah saldo user
func (t TransactionType) IsCredit() bool {
	switch t {
	case TxTypeDeposit, TxTypeRefund, TxTypeEarning, TxTypeBonus, TxTypeEscrow:
		return true
	default:
		return false
	}
}

// IsCompanyRevenue — apakah jenis transaksi merupakan pendapatan perusahaan yang
// sesungguhnya, bukan dana titipan yang akan diteruskan ke pihak lain.
func (t TransactionType) IsCompanyRevenue() bool {
	return t == TxTypeFee
}

// WalletTransaction — catatan setiap pergerakan saldo.
//
// Setiap perubahan kolom users.balance HARUS disertai satu baris di sini dalam
// transaksi database yang sama. Tanpa itu, rekonsiliasi keuangan mustahil
// dilakukan karena saldo bergerak tanpa jejak.
type WalletTransaction struct {
	ID     uint              `gorm:"primaryKey" json:"id"`
	UserID uint              `gorm:"not null;index" json:"user_id"`
	Amount float64           `gorm:"not null" json:"amount"` // selalu positif; arah ditentukan Type
	Type   TransactionType   `gorm:"type:varchar(20);not null;index" json:"type"`
	Status TransactionStatus `gorm:"type:varchar(20);not null;index" json:"status"`

	// BalanceAfter — saldo user setelah transaksi ini dibukukan.
	// Memudahkan audit tanpa harus menjumlah ulang seluruh riwayat.
	BalanceAfter float64 `json:"balance_after"`

	RefID     string `gorm:"type:varchar(100);index" json:"ref_id"`     // referensi bebas
	OrderUUID string `gorm:"type:varchar(100);index" json:"order_uuid"` // order terkait, bila ada

	// Rekening tujuan penarikan. Diisi hanya untuk transaksi WITHDRAWAL.
	// Disimpan sebagai kolom tersendiri, bukan dititipkan ke Note, agar tim
	// keuangan mencairkan dana berdasarkan data terstruktur dan bukan hasil
	// membaca kalimat bebas.
	BankName          string `gorm:"type:varchar(100)" json:"bank_name,omitempty"`
	BankAccountNumber string `gorm:"type:varchar(50)" json:"bank_account_number,omitempty"`
	BankAccountName   string `gorm:"type:varchar(100)" json:"bank_account_name,omitempty"`

	// MidtransOrderID berupa pointer agar transaksi non-Midtrans menyimpan NULL.
	// PostgreSQL mengizinkan banyak NULL pada unique index, sedangkan string
	// kosong akan saling bentrok. Unique-nya sendiri adalah jaring pengaman
	// terakhir terhadap notifikasi Midtrans ganda.
	MidtransOrderID *string `gorm:"type:varchar(100);uniqueIndex" json:"midtrans_order_id,omitempty"`
	MidtransToken   string  `gorm:"type:varchar(255)" json:"midtrans_token,omitempty"` // Snap Token untuk frontend

	Note      string         `gorm:"type:text" json:"note"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
