package handlers

import (
	"strconv"
	"time"

	"gorm.io/gorm/clause"
)

// lockForUpdate — klausa SELECT ... FOR UPDATE.
//
// Dipakai sebelum membaca baris yang akan diubah di dalam transaksi. Tanpa
// lock, dua permintaan bersamaan bisa membaca keadaan yang sama lalu keduanya
// lolos pengecekan — misalnya menyelesaikan order yang sama dua kali dan
// membayar driver dua kali.
func lockForUpdate() clause.Locking {
	return clause.Locking{Strength: "UPDATE"}
}

// uintToString — helper kecil untuk menyusun catatan audit
func uintToString(v uint) string {
	return strconv.FormatUint(uint64(v), 10)
}

// timeNow — waktu sekarang sebagai pointer, untuk kolom yang boleh NULL
func timeNow() *time.Time {
	now := time.Now()
	return &now
}
