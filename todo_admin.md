# OpenJek — Roadmap Implementasi Dashboard Admin

Sama seperti dokumen Android: backend dianggap **final**, dokumen ini memetakan
apa yang bisa langsung dibangun di dashboard admin (web) berdasarkan endpoint
& permission yang sudah ada, dan menandai bagian yang datanya belum lengkap
dari sisi backend.

Kabar baiknya: dari tujuh fase roadmap, **Fase 5 (Admin Dashboard) ini yang
paling siap** — backend sudah punya RBAC granular per endpoint untuk tujuh
role admin, jadi struktur menu dashboard bisa hampir langsung diturunkan dari
tabel permission yang sudah ada, bukan ditebak-tebak.

---

## 0. Fondasi: RBAC Menentukan Struktur Menu, Bukan Sebaliknya

Ini beda penting dibanding app passenger/driver: di dashboard admin, **menu
yang tampil harus mengikuti permission yang dimiliki role login**, bukan
menu tetap yang di-disable/di-hide manual. Karena backend sudah menolak akses
di level endpoint (`RequirePermission` memuat user lengkap dari DB, jadi akun
yang baru disuspend langsung kehilangan akses tanpa nunggu token expired),
frontend sebaiknya:

1. Setelah login, ambil daftar permission user (dari `GET /api/user` atau
   endpoint sejenis — **perlu dikonfirmasi apakah daftar permission ikut
   dikembalikan di sana**, kalau belum, ini endpoint kecil yang perlu diminta)
2. Render menu sidebar berdasarkan permission yang dimiliki, bukan berdasarkan
   nama role — supaya kalau suatu hari permission sebuah role berubah
   (`SeedRoles` disinkronkan ulang tiap server start), dashboard otomatis
   menyesuaikan tanpa deploy ulang frontend
3. Tetap validasi di server sebagai sumber kebenaran — frontend hanya
   menyembunyikan menu untuk UX, bukan mekanisme keamanan

**Pertanyaan terbuka yang perlu dijawab dulu:** dokumen backend menyebut
pemetaan default permission per role ada di `models.SeedRoles`, tapi isi
persisnya (permission apa saja untuk `admin.cs` vs `admin.sales_head`, dst.)
**tidak dirinci** di dokumen implementasi. Ini wajib diminta ke tim backend
sebelum menu per role bisa difinalisasi — tanpa ini, dashboard bisa dibangun
generik (semua menu ada, endpoint yang tidak diizinkan otomatis 403), tapi
UX "menu langsung sesuai peran" belum bisa dipastikan benar.

---

## 1. Peta Menu ⇄ Permission ⇄ Endpoint

Tabel ini diturunkan langsung dari tabel permission di dokumen backend —
setiap baris = satu menu/halaman dashboard.

| Menu | Permission dibutuhkan | Endpoint |
|---|---|---|
| **Ride / Order** | | |
| Daftar semua order | `orders.view` | `GET /api/admin/orders` |
| Batalkan order manapun | `orders.cancel_any` | `PUT /api/admin/orders/:uuid/cancel` |
| Paksa selesaikan order | `orders.force_complete` | `PUT /api/admin/orders/:uuid/force-complete` |
| **Keuangan** | | |
| Laporan keuangan | `finance.view_report` | `GET /api/admin/finance/report` |
| Daftar penarikan (withdrawal) | `finance.view_report` | `GET /api/admin/finance/withdrawals` |
| Cairkan penarikan | `finance.disbursement` | `PUT /api/admin/finance/withdrawals/:id/disburse` |
| Tolak penarikan | `finance.disbursement` | `PUT /api/admin/finance/withdrawals/:id/reject` |
| Proses refund | `finance.refund` | `POST /api/admin/finance/refunds` |
| **Driver** | | |
| Daftar driver | `drivers.view` | `GET /api/admin/drivers` |
| Verifikasi driver | `drivers.verify` | `PUT /api/admin/drivers/:id/verify` |
| Suspend / aktifkan kembali | `drivers.suspend` | `PUT /api/admin/drivers/:id/suspend`, `.../reactivate` |
| Beri bonus | `drivers.bonus` | `POST /api/admin/drivers/:id/bonus` |
| **Merchant** | | |
| Daftar merchant | `merchants.view` | `GET /api/admin/merchants`, `GET .../:id` |
| Setujui merchant | `merchants.approve` | `PUT /api/admin/merchants/:id/approve` |
| Suspend merchant | `merchants.suspend` | `PUT /api/admin/merchants/:id/suspend` |
| **User / Passenger** | | |
| Daftar user | `users.view` | `GET /api/admin/users`, `GET .../:id` |
| Kelola user (aktif/nonaktif, role) | `users.manage` | `PUT .../:id/active`, `POST .../:id/roles`, `DELETE .../:id/roles/:role` |
| **Pengaturan** | | |
| Kelola setting dinamis (tarif, radius matching, dst) | `settings.manage` | `GET /api/admin/settings`, `PUT /api/admin/settings/:key` |
| **Promo** | | |
| Kelola promo | `promo.manage` | `GET/POST /api/admin/promos`, `PUT/DELETE .../:id` |
| Lihat pemakaian promo | `promo.manage` | `GET /api/admin/promos/:id/usage` |
| **Laporan** | | |
| Dashboard ringkasan | `reports.view` | `GET /api/admin/reports/dashboard` |
| Top driver | `reports.view` | `GET /api/admin/reports/top-drivers` |
| Laporan penjualan | `reports.sales` | `GET /api/admin/reports/sales` |

---

## 2. Status Kesiapan per Halaman

| Halaman | Status | Catatan |
|---|---|---|
| Dashboard ringkasan | ✅ | `GET /api/admin/reports/dashboard` — perlu tahu bentuk response persis (angka apa saja yang dikembalikan) sebelum desain widget |
| Manajemen Order | ✅ | List, cancel, force-complete lengkap |
| Manajemen Driver | ✅ | View, verify, suspend/reactivate, bonus — paling lengkap dari semua modul |
| Manajemen Merchant | ✅ | View, approve, suspend — cukup untuk onboarding merchant, **tapi** karena order belum tertaut ke merchant (lihat catatan GoFood di roadmap sebelumnya), halaman ini baru bisa dipakai untuk approval merchant, belum untuk lihat performa/order merchant |
| Manajemen User (Passenger) | 🔶 | Endpoint generik `users.view`/`users.manage` ada, tapi tidak ada yang spesifik "riwayat order passenger ini" atau "blokir passenger karena kasus tertentu" — kalau CS butuh lihat riwayat order seorang passenger dari dashboard, itu perlu endpoint gabungan (lihat bagian 3) |
| Keuangan — Laporan & Withdrawal | ✅ | View report, list withdrawal, disburse, reject — lengkap untuk alur manual |
| Keuangan — Settlement otomatis | ⛔ | Disbursement masih manual (dicatat, belum API transfer bank). Dashboard **bisa** dibangun untuk alur manual ini sekarang (finance klik "cairkan" → status berubah, tapi transfer aslinya tetap di luar sistem) |
| Pengaturan (Tarif, Matching) | ✅ | `settings.manage` mencakup semua kunci `fare.*` dan `matching.*` yang disebut di dokumen |
| Promo | 🔶 | CRUD & lihat pemakaian sudah bisa dibangun sepenuhnya di dashboard. Tapi sampai `promo_code` disambung ke `POST /api/orders` (lihat dokumen spek API Prioritas 1), angka "pemakaian" di dashboard akan selalu nol/kosong — halaman ini bisa dibangun, datanya baru terisi setelah endpoint promo di sisi order jadi |
| Laporan (top driver, sales) | ✅ | Tersedia lengkap |
| Live Driver (peta) | ⛔ | Data posisi ada di Redis GEO (dipakai matching), tapi **tidak ada endpoint** yang mengekspos "semua posisi driver online saat ini" untuk kebutuhan peta admin. Perlu endpoint baru, lihat bagian 3 |
| RBAC — Kelola role & permission | ⛔ | Endpoint yang ada baru assign/remove role ke *user* (`users.manage`). Tidak ada endpoint untuk **melihat/mengubah permission per role** dari UI — perubahan permission per role sepertinya masih lewat kode (`SeedRoles`), bukan dashboard. Kalau butuh diatur dari UI, ini endpoint baru |

---

## 3. Endpoint Tambahan yang Dibutuhkan Khusus Dashboard Admin

### a. Live Driver Map
```
GET /api/admin/drivers/live-locations
```
**Akses:** permission baru, mis. `drivers.view` (pakai yang sudah ada) atau
permission khusus `drivers.live_map` kalau mau dipisah dari sekadar "lihat
daftar driver".

Response:
```json
{
  "data": [
    {
      "driver_id": 42,
      "name": "Budi",
      "vehicle_type": "motorcycle",
      "status": "online",
      "lat": -0.2192,
      "lng": 100.6339,
      "current_order_uuid": null,
      "updated_at": "2026-08-05T09:03:00Z"
    }
  ]
}
```
Catatan: ini query langsung ke index geospasial Redis yang sudah dipakai
`MatchingWorker`, jadi secara teknis datanya sudah ada di sistem — cuma belum
diekspos lewat endpoint admin. Untuk update realtime di peta (bukan cuma
snapshot saat halaman dibuka), pertimbangkan event WS khusus admin, atau
polling tiap beberapa detik sebagai versi sederhana dulu.

### b. Riwayat Order per Passenger (untuk CS)
```
GET /api/admin/users/:id/orders
```
**Akses:** `users.view` (yang sudah dipegang role CS). Tanpa ini, CS yang
menangani komplain tidak bisa lihat riwayat order si passenger dari dashboard,
harus lewat query manual ke database.

### c. Daftar permission per role (untuk render menu dinamis)
```
GET /api/user   → tambah field "permissions": ["orders.view", "drivers.verify", ...]
```
atau endpoint terpisah `GET /api/admin/me/permissions`. Tanpa ini, frontend
terpaksa hardcode pemetaan role→menu di kode dashboard, yang berarti setiap
kali `SeedRoles` di backend berubah, frontend juga harus di-deploy ulang
secara manual — rawan tidak sinkron.

---

## 4. Rencana Kerja per Role Admin (7 role)

Karena backend sudah define 7 role dengan permission spesifik, dashboard
sebaiknya dibangun dengan satu shell aplikasi + menu dinamis (bagian 0),
bukan 7 aplikasi terpisah. Tapi urutan pengerjaan tetap bisa diprioritaskan
per kebutuhan bisnis:

| Urutan | Role | Modul utama | Alasan prioritas |
|---|---|---|---|
| 1 | `admin.ops_manager` | Order, Driver, Live Map | Operasional harian — paling sering dipakai, langsung berdampak ke layanan aktif |
| 2 | `admin.driver_manager` | Driver (verify, suspend, bonus) | Onboarding driver perlu jalan duluan sebelum ada volume order besar |
| 3 | `admin.finance_head` + `admin.finance_staff` | Keuangan, Withdrawal | Uang jalan sejak hari pertama, tidak bisa ditunda |
| 4 | `admin.cs` | User (passenger), riwayat order | Butuh endpoint tambahan 3b dulu sebelum modul ini lengkap |
| 5 | `admin.sales_head` | Laporan (sales, top driver), Promo | Promo baru berguna penuh setelah tersambung ke order |
| 6 | `admin.superadmin` | Semua modul + (nanti) kelola permission | Superadmin otomatis dapat semua menu begitu modul lain selesai, tidak perlu kerjaan terpisah kecuali modul RBAC UI di bagian 2 |

---

## 5. Checklist Kerja Dashboard Admin

**Bisa langsung dikerjakan penuh sekarang:**
- [ ] Shell aplikasi + login + render menu dinamis dari permission (setelah endpoint 3c tersedia; sementara bisa hardcode dulu sambil menunggu)
- [ ] Modul Order: list, filter, detail, cancel, force-complete
- [ ] Modul Driver: list, detail, verify, suspend/reactivate, bonus
- [ ] Modul Merchant: list, detail, approve, suspend
- [ ] Modul User: list, detail, aktif/nonaktifkan, kelola role
- [ ] Modul Pengaturan: form untuk semua kunci `fare.*` dan `matching.*`
- [ ] Modul Keuangan: laporan, daftar withdrawal, cairkan/tolak, proses refund
- [ ] Modul Promo: CRUD promo (data pemakaian akan kosong sampai promo tersambung ke order)
- [ ] Modul Laporan: dashboard ringkasan, top driver, sales

**Perlu endpoint tambahan dulu (lihat bagian 3) sebelum bisa dibangun:**
- [ ] **Konfirmasi ke backend:** isi `SeedRoles` — permission apa saja per role, supaya menu per role bisa difinalisasi
- [ ] **Minta endpoint:** `GET /api/admin/drivers/live-locations` — untuk peta live driver
- [ ] **Minta endpoint:** `GET /api/admin/users/:id/orders` — untuk modul CS
- [ ] **Minta endpoint/field:** daftar permission ikut di response login/profil — untuk menu dinamis
- [ ] **Konfirmasi bentuk response** `GET /api/admin/reports/dashboard` — supaya widget dashboard bisa didesain sesuai data yang benar-benar tersedia, bukan ditebak

**Bergantung pada pekerjaan lain yang sudah tercatat sebelumnya:**
- [ ] Modul Promo baru terisi datanya setelah `promo_code` disambung ke `POST /api/orders` (dokumen spek API Prioritas 1)
- [ ] Modul Keuangan — Settlement otomatis baru relevan kalau/setelah backend terhubung ke API transfer bank