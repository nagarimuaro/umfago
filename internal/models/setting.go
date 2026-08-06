package models

import "gorm.io/gorm"

// DynamicSetting — semua konfigurasi bisnis yang bisa diubah dari Admin Dashboard
// tanpa perlu restart server maupun update aplikasi Android
type DynamicSetting struct {
	gorm.Model
	Key         string `json:"key" gorm:"uniqueIndex;not null"`
	Value       string `json:"value" gorm:"not null"`
	Type        string `json:"type" gorm:"default:'string'"` // string, float, int, bool, json
	Description string `json:"description"`
	Group       string `json:"group" gorm:"index"` // e.g. "fare", "matching", "ui", "promo"
}

// DefaultSettings — nilai default saat pertama kali di-seed
var DefaultSettings = []DynamicSetting{
	// ── Fare (Tarif) ──────────────────────────────────
	// Tarif hanya punya satu unsur: tarif per kilometer dikali jarak tertagih.
	// Tarif terendah tidak disimpan sebagai angka rupiah tersendiri — nilainya
	// jatuh dari fare.min_distance_km x fare.per_km_price_idr, sehingga mengubah
	// salah satu dari keduanya langsung menggeser tarif terendah tanpa ada angka
	// ketiga yang bisa tertinggal tidak sinkron.
	{Key: "fare.per_km_price_idr", Value: "3000", Type: "float", Group: "fare", Description: "Tarif per kilometer (IDR). Satu-satunya pembentuk tarif perjalanan"},
	{Key: "fare.min_distance_km", Value: "3", Type: "float", Group: "fare", Description: "Jarak minimum yang ditagihkan (km). Order lebih pendek dari ini tetap dihitung sejauh ini, sehingga tarif terendah = jarak ini x tarif per km"},
	{Key: "fare.platform_fee_percent", Value: "20", Type: "float", Group: "fare", Description: "Potongan platform dari tarif, dipotong dari pendapatan driver (%)"},
	{Key: "fare.customer_fee_percent", Value: "0", Type: "float", Group: "fare", Description: "Biaya layanan penumpang, DITAMBAHKAN di atas tarif (%)"},
	{Key: "fare.merchant_fee_percent", Value: "0", Type: "float", Group: "fare", Description: "Komisi merchant dari tarif order merchant (%)"},

	// ── Wallet ────────────────────────────────────────
	{Key: "wallet.min_balance_idr", Value: "-10000", Type: "float", Group: "wallet", Description: "Batas saldo terbawah driver & merchant. Komisi order tunai boleh menembus nol sampai batas ini; setelah tercapai, status dipaksa offline sampai deposit (IDR, negatif)"},

	// ── Matching ──────────────────────────────────────
	{Key: "matching.search_radius_km", Value: "5", Type: "float", Group: "matching", Description: "Radius pencarian driver (km)"},
	{Key: "matching.max_driver_candidates", Value: "10", Type: "int", Group: "matching", Description: "Maksimal kandidat driver per order"},
	{Key: "matching.offer_timeout_seconds", Value: "30", Type: "int", Group: "matching", Description: "Waktu driver untuk menerima/menolak order (detik)"},

	// ── UI (Server-Driven UI) ─────────────────────────
	{Key: "ui.primary_color", Value: "#c8ff00", Type: "string", Group: "ui", Description: "Warna aksen utama aplikasi"},
	{Key: "ui.home_banner_text", Value: "", Type: "string", Group: "ui", Description: "Teks banner promosi di halaman utama (kosong = tidak tampil)"},
	{Key: "ui.home_banner_color", Value: "#1a1a26", Type: "string", Group: "ui", Description: "Warna latar banner promosi"},
	{Key: "ui.driver_mode_enabled", Value: "true", Type: "bool", Group: "ui", Description: "Tampilkan tombol switch driver mode"},

	// ── App ────────────────────────────────────────────
	{Key: "app.maintenance_mode", Value: "false", Type: "bool", Group: "app", Description: "Mode maintenance (nonaktifkan semua order)"},
	{Key: "app.min_android_version", Value: "1.0.0", Type: "string", Group: "app", Description: "Versi minimum Android yang didukung"},
	{Key: "app.force_update_version", Value: "", Type: "string", Group: "app", Description: "Paksa update jika versi kurang dari ini"},
}

// ObsoleteSettings — kunci yang pernah tersemai lalu dihapus dari kode.
//
// Barisnya dibuang saat seed, bukan dibiarkan menganggur. Setting yang tidak lagi
// dibaca siapa pun tetap muncul di halaman pengaturan admin sebagai kolom yang
// bisa disunting, dan admin yang mengubahnya akan menyangka tarif sudah berubah
// padahal tidak ada kode yang membacanya lagi.
var ObsoleteSettings = []string{
	// Tarif dasar dihapus: tarif kini murni jarak dikali tarif per kilometer.
	"fare.base_price_idr",
	// Tarif minimum dihapus: nilainya turunan dari fare.min_distance_km dikali
	// fare.per_km_price_idr, jadi menyimpannya lagi berarti dua sumber kebenaran.
	"fare.min_fare_idr",
}
