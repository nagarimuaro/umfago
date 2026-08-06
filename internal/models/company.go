package models

// Akun perusahaan — satu baris User yang menampung seluruh uang yang berada di
// dalam sistem tetapi belum menjadi milik siapa pun.
//
// Dibuat sebagai User biasa, bukan tabel terpisah, supaya seluruh pergerakan
// uang tetap melewati WalletRepository yang sama: satu pintu, satu ledger, satu
// cara mengunci baris. Tabel platform terpisah akan berarti dua mekanisme
// pembukuan yang harus dijaga tetap sejalan, dan pada akhirnya saldo penumpang
// dan saldo perusahaan tidak bisa direkonsiliasi dalam satu query.
//
// Saldo akun ini terdiri dari dua bagian yang bercampur di kolom yang sama:
//
//	dana titipan  = SUM(ESCROW) - SUM(ESCROW_RELEASE)
//	pendapatan    = SUM(FEE)
//	balance       = dana titipan + pendapatan
//
// Karena itu balance akun perusahaan tidak boleh dibaca sebagai laba. Laporan
// keuangan menghitungnya dari ledger, memakai TransactionType.IsCompanyRevenue.
const (
	// CompanyUserEmail — penanda baris akun perusahaan. Dipakai untuk mencarinya,
	// bukan ID hardcoded: urutan seed bisa berubah, alamat surat tidak.
	CompanyUserEmail = "system@openjek.internal"

	// CompanyUserName — nama yang muncul pada laporan dan riwayat transaksi.
	CompanyUserName = "OpenJek Platform"
)

// IsCompanyAccount — apakah user ini akun perusahaan.
//
// Akun ini tidak boleh login, tidak boleh menarik saldo, dan tidak boleh
// dipesan sebagai merchant. Pemeriksaannya lewat email, bukan ID, agar tetap
// benar walau baris akun dibuat ulang di lingkungan yang berbeda.
func (u *User) IsCompanyAccount() bool {
	return u != nil && u.Email == CompanyUserEmail
}
