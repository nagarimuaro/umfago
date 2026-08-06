.# OpenJek Backend — Dokumen Implementasi

Backend layanan ride-hailing berbasis Go. Dokumen ini menjelaskan sistem yang
sudah berjalan di kode: model peran, alur uang, alur order, konfigurasi, dan
cara menjalankan maupun mengujinya.

---

## 1. Ringkasan Teknis

| Bagian | Teknologi |
|---|---|
| Bahasa | Go 1.25 (module `openjek-backend`) |
| HTTP | Gin |
| Database | PostgreSQL via GORM |
| Cache & geospasial | Redis (GEOADD/GEOSEARCH) |
| Antrian pesan | RabbitMQ (topic exchange `openjek_events`) |
| Realtime | WebSocket (Gorilla) |
| Pembayaran | Midtrans Snap |
| Autentikasi | JWT HS256 (access) + refresh token opaque |

Struktur direktori:

```
cmd/api           entry point, penanganan sinyal
internal/auth     penerbitan & validasi JWT
internal/broker   RabbitMQ
internal/config   pembacaan environment
internal/db       koneksi PostgreSQL & Redis
internal/handlers HTTP handler
internal/middleware  JWT, pemuatan user, RBAC
internal/models   entitas GORM
internal/payment  Midtrans
internal/pricing  kalkulator tarif dari setting dinamis
internal/repository  akses data (wallet, role, lokasi, setting)
internal/sdui     Server-Driven UI
internal/testutil helper test
internal/websocket hub & klien WS
internal/workers  matching worker
```

---

## 2. Model Peran (RBAC)

### 2.1 Daftar Role

Pengguna aplikasi (grup `user`):

| Role | Kode |
|---|---|
| Customer | `customer` |
| Driver Motor | `driver_motorcycle` |
| Driver Mobil | `driver_car` |
| Merchant | `merchant` |

Back-office (grup `admin`):

| Role | Kode |
|---|---|
| Super Admin | `admin.superadmin` |
| Kepala Keuangan | `admin.finance_head` |
| Staf Keuangan | `admin.finance_staff` |
| Kepala Sales | `admin.sales_head` |
| Customer Service | `admin.cs` |
| Manajer Operasional | `admin.ops_manager` |
| Manajer Driver | `admin.driver_manager` |

### 2.2 Multi-Role dengan Satu Role Aktif

Satu akun bisa memiliki banyak role sekaligus — misalnya seseorang yang menjadi
customer sekaligus merchant. Namun pada satu waktu hanya satu role yang aktif,
dan otorisasi selalu dihitung dari role aktif itu saja, tidak pernah dari
gabungan semua role. Pilihan ini menjaga hak akses tetap sekecil yang diperlukan:
seorang admin yang sedang memakai aplikasi sebagai customer tidak membawa
wewenang admin-nya ke sesi tersebut.

Skema:

```
users
  ├─ role_code   ← role yang sedang aktif
  └─ Roles       ← M2M lewat user_roles (semua role yang dimiliki)

user_roles (pivot)
  ├─ user_id
  └─ role_id

roles
  ├─ code, name, group ("user" | "admin")
  └─ Permissions  ← M2M lewat role_permissions

permissions
  └─ code, name, group
```

Alur pemakaian:

1. `POST /api/users/roles` — menambah role ke akun. Hanya `customer`,
   `driver_motorcycle`, `driver_car`, dan `merchant` yang bisa diminta sendiri.
   Role admin hanya bisa diberikan pemegang permission `users.manage`.
2. `PUT /api/users/active-role` — mengganti role aktif. Role yang belum dimiliki
   ditolak dengan 403, jadi endpoint ini tidak bisa dipakai menaikkan hak akses
   sendiri. Access token baru langsung diterbitkan agar perubahan berlaku seketika.
3. `GET /api/user` — mengembalikan `active_role` dan `available_roles`, dipakai
   klien untuk menampilkan tombol pindah mode.

Role aktif ikut ditulis ke klaim JWT. `RequireRole` membaca klaim tersebut
(tanpa query database), sedangkan `RequirePermission` memuat user lengkap dari
database sehingga akun yang baru saja di-suspend langsung kehilangan akses tanpa
menunggu token kedaluwarsa.

### 2.3 Permission dan Endpoint-nya

Setiap permission punya endpoint nyata:

| Permission | Endpoint |
|---|---|
| `orders.view` | `GET /api/admin/orders` |
| `orders.cancel_any` | `PUT /api/admin/orders/:uuid/cancel` |
| `orders.force_complete` | `PUT /api/admin/orders/:uuid/force-complete` |
| `finance.view_report` | `GET /api/admin/finance/report`, `GET /api/admin/finance/withdrawals` |
| `finance.disbursement` | `PUT /api/admin/finance/withdrawals/:id/disburse`, `PUT .../reject` |
| `finance.refund` | `POST /api/admin/finance/refunds` |
| `drivers.view` | `GET /api/admin/drivers` |
| `drivers.verify` | `PUT /api/admin/drivers/:id/verify` |
| `drivers.suspend` | `PUT /api/admin/drivers/:id/suspend`, `PUT .../reactivate` |
| `drivers.bonus` | `POST /api/admin/drivers/:id/bonus` |
| `merchants.view` | `GET /api/admin/merchants`, `GET /api/admin/merchants/:id` |
| `merchants.approve` | `PUT /api/admin/merchants/:id/approve` |
| `merchants.suspend` | `PUT /api/admin/merchants/:id/suspend` |
| `users.view` | `GET /api/admin/users`, `GET /api/admin/users/:id` |
| `users.manage` | `PUT /api/admin/users/:id/active`, `POST /api/admin/users/:id/roles`, `DELETE /api/admin/users/:id/roles/:role` |
| `settings.manage` | `GET /api/admin/settings`, `PUT /api/admin/settings/:key` |
| `promo.manage` | `GET/POST /api/admin/promos`, `PUT/DELETE /api/admin/promos/:id`, `GET /api/admin/promos/:id/usage` |
| `reports.view` | `GET /api/admin/reports/dashboard`, `GET /api/admin/reports/top-drivers` |
| `reports.sales` | `GET /api/admin/reports/sales` |

Pembagian default per role ada di `models.SeedRoles` dan disinkronkan ke database
setiap kali server start, termasuk pencabutan permission yang dihapus dari kode.

### 2.4 Driver Motor vs Driver Mobil

Keduanya adalah role terpisah pada akun yang sama, bukan akun berbeda. Order
membawa kolom `vehicle_type` (`motorcycle` atau `car`) yang diturunkan dari jenis
layanan, dan driver hanya bisa menerima order yang cocok dengan role aktifnya.
Satu orang yang punya motor dan mobil cukup berpindah role aktif.

---

## 3. Alur Order

Status order: `pending` → `accepted` → `arrived` → `in_progress` → `completed`,
dengan `cancelled` sebagai jalur keluar.

1. **Pembuatan** (`POST /api/orders`) — jarak dihitung dengan haversine, tarif
   dari `pricing.Calculator`. Bila metode bayar adalah wallet, saldo dipotong di
   transaksi yang sama dengan penyimpanan order; saldo kurang membuat order
   gagal dibuat, bukan tercipta tanpa pembayaran. Event `order.created`
   dipublikasikan ke RabbitMQ.
2. **Pencocokan** — `MatchingWorker` mengambil driver terdekat dari Redis, lalu
   menyaringnya di database: role harus cocok dengan `vehicle_type`, akun aktif
   dan terverifikasi, serta tidak sedang mengantar order lain. Radius dan jumlah
   kandidat dibaca dari setting dinamis. Kandidat menerima `incoming_order` lewat
   WebSocket.
3. **Penerimaan** (`PUT /api/orders/:uuid/accept`) — hanya driver terverifikasi,
   hanya satu order berjalan per driver. Pengambilan order dilakukan dengan
   update bersyarat (`status = 'pending' AND driver_id IS NULL AND vehicle_type = ?`)
   sehingga dua driver tidak bisa mengambil order yang sama.
4. **Perubahan status** (`PUT /api/orders/:uuid/status`) — seluruh transisi
   berjalan di dalam transaksi dengan penguncian baris (`SELECT … FOR UPDATE`).
   Transisi yang tidak sah ditolak.
5. **Penyelesaian** — potongan platform dihitung saat itu juga dan disimpan ke
   kolom `platform_fee` serta `driver_earning`, sehingga perubahan tarif di
   kemudian hari tidak mengubah catatan lama. Order wallet mengkredit bagian
   bersih driver; order tunai mendebit potongan platform dari saldo driver.
6. **Penilaian** (`POST /api/orders/:uuid/rate`) — hanya untuk order selesai dan
   hanya sekali, dijaga lewat kondisi `WHERE … IS NULL` pada saat update.

Semua endpoint daftar memakai pagination dengan batas 100 baris per halaman.

---

## 4. Dompet dan Uang

Seluruh perubahan saldo melewati `repository.WalletRepository`. Aturannya:

- Baris user dikunci sebelum saldo diubah, dan penambahan memakai ekspresi SQL
  (`balance + ?`) alih-alih membaca lalu menulis, sehingga dua permintaan
  bersamaan tidak saling menimpa.
- Setiap perubahan menulis satu baris `wallet_transactions` beserta
  `balance_after`. Saldo user dan buku besar karenanya selalu bisa direkonsiliasi.
- Top up membuat transaksi berstatus `PENDING`; saldo baru bertambah setelah
  notifikasi pembayaran diverifikasi.
- Penarikan memotong saldo di awal dan menyisakan transaksi `PENDING` sampai tim
  keuangan mencairkan atau menolaknya. Penolakan mengembalikan dana.

### Webhook Midtrans

`POST /webhook/midtrans` bersifat publik namun terikat verifikasi tanda tangan
SHA-512. Bila `MIDTRANS_SERVER_KEY` tidak tersedia, endpoint membalas 503 dan
tidak memproses apa pun — menerima notifikasi tanpa verifikasi berarti siapa pun
bisa mengisi saldonya sendiri.

Payment gateway mengirim ulang notifikasi bila balasan pertama tidak sampai,
sehingga penyelesaian transaksi dibuat idempoten lewat `SettlePending`: hanya
transaksi berstatus `PENDING` yang diproses, pengiriman ulang mengembalikan
`ErrAlreadySettled` dan dibalas 200 tanpa mengubah saldo.

---

## 5. Setting Dinamis dan Server-Driven UI

Tabel `dynamic_settings` menyimpan konfigurasi yang bisa diubah dari dashboard
tanpa deploy ulang, dengan cache Redis berumur 5 menit.

Kunci yang dipakai kalkulator tarif dan pencocokan driver:

| Kunci | Arti |
|---|---|
| `fare.base_price_idr` | tarif dasar |
| `fare.per_km_price_idr` | tarif per kilometer |
| `fare.min_fare_idr` | tarif minimum |
| `fare.platform_fee_percent` | potongan platform (dibatasi 0–100) |
| `matching.search_radius_km` | radius pencarian driver |
| `matching.max_driver_candidates` | jumlah kandidat driver |

`GET /api/ui/home` mengembalikan pohon komponen JSON yang dirakit dari setting
tersebut, berbeda antara customer dan driver. Field `version` adalah sidik jari
isi layar, bukan timestamp, sehingga klien hanya menggambar ulang ketika UI-nya
memang berubah.

---

## 6. Realtime (WebSocket)

`GET /ws?token=<access_token>`.

- Origin browser diperiksa terhadap `ALLOWED_WS_ORIGINS`; permintaan tanpa header
  Origin (aplikasi mobile) tetap diterima.
- Koneksi memakai batas ukuran pesan, deadline baca/tulis, dan ping berkala,
  supaya koneksi yang mati diam-diam terdeteksi dan goroutine-nya dilepas.
- Satu user hanya memegang satu koneksi; koneksi lama ditutup saat yang baru
  mendaftar, dan pemutusan koneksi lama tidak menghapus koneksi baru.
- Driver mengirim `location_update`; koordinat di luar rentang yang mungkin
  diabaikan sebelum masuk indeks geospasial Redis.

---

## 7. Konfigurasi

Semua nilai dibaca dari environment (lihat `.env.example`).

Wajib, server menolak start bila kosong:

- `DATABASE_URL`
- `JWT_SECRET` — minimal 32 karakter acak (`openssl rand -hex 32`)
- `MIDTRANS_SERVER_KEY` — hanya wajib saat `MIDTRANS_IS_PRODUCTION=true`

Opsional: `PORT`, `REDIS_URL`, `REDIS_PASSWORD`, `RABBITMQ_URL`,
`ALLOWED_WS_ORIGINS`, `MIDTRANS_CLIENT_KEY`.

Tidak ada nilai default untuk rahasia. Default yang diam-diam terpakai di
production adalah cara paling umum sebuah backend berakhir dengan secret yang
bisa ditebak siapa saja, jadi konfigurasi yang belum lengkap dilaporkan
sekaligus lalu proses berhenti.

Bila `MIDTRANS_SERVER_KEY` kosong pada mode non-production, top up berjalan dalam
mode simulasi: transaksi langsung diselesaikan tanpa pembayaran nyata.

---

## 8. Menjalankan

```bash
cp .env.example .env      # lalu isi nilainya
go build ./...
go run ./cmd/api
```

Server memuat konfigurasi, menjalankan migrasi, menyemai role dan permission,
menyalakan hub WebSocket dan matching worker, lalu melayani HTTP pada `PORT`.

Saat menerima SIGINT atau SIGTERM, server berhenti menerima koneksi baru,
menyelesaikan permintaan yang sedang berjalan (batas 15 detik), lalu menutup hub,
RabbitMQ, Redis, dan koneksi database. Batas waktu baca/tulis/idle HTTP juga
dipasang agar koneksi menganggur tidak menahan sumber daya selamanya.

`GET /health` tersedia untuk health check.

---

## 9. Pengujian

```bash
go vet ./...
go test ./...
```

Test integrasi butuh PostgreSQL dan membaca DSN dari `TEST_DATABASE_URL`. Bila
variabel itu kosong, test tersebut di-skip sehingga `go test ./...` tetap bisa
dijalankan tanpa database. Kredensial tidak pernah ditulis di dalam kode.

Yang dicakup saat ini: RBAC per role, penambahan dan perpindahan role,
penolakan self-assign role admin, idempotensi penyelesaian pembayaran,
penolakan webhook tanpa verifikasi tanda tangan, deposit mode simulasi, order,
chat, login, dan registrasi.

---

## 10. Yang Belum Dikerjakan

- Modul pesan-antar makanan: order belum tertaut ke merchant, sehingga laporan
  merchant teratas belum bisa dihitung.
- Promo sudah punya model, endpoint pengelolaan, dan pencatatan pemakaian, tetapi
  belum dipasang pada alur pembuatan order.
- Disbursement masih mencatat pencairan secara manual, belum terhubung ke API
  transfer bank.
