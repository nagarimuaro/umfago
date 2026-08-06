


# CLAUDE.md — OpenJek

Repositori ini berisi backend Go untuk layanan ride-hailing OpenJek, beserta
dokumen perencanaan untuk aplikasi mobile (React Native) dan dashboard admin
(web). Dokumen ini adalah rujukan tunggal: arsitektur, kontrak API, aturan
otorisasi, rencana kerja mobile, dan hal-hal yang belum selesai.

Bila dokumen ini berselisih dengan kode, **kode yang benar** — dan dokumen ini
yang harus diperbaiki. Kontrak API di bagian 9 ditulis dari handler Go, bukan
dari spesifikasi rencana; beberapa dokumen perencanaan lama menyebut nama route
dan bentuk response yang tidak pernah terdaftar di router.

Rencana pembangunan aplikasi Android ada di `Android-plann.md`.

---

## 1. Arsitektur Sistem

| Bagian | Teknologi |
|---|---|
| Bahasa backend | Go 1.25 (module `openjek-backend`) |
| HTTP | Gin |
| Database | PostgreSQL via GORM |
| Cache & geospasial | Redis (GEOADD/GEOSEARCH) |
| Antrian pesan | RabbitMQ (topic exchange `openjek_events`) |
| Realtime | WebSocket (Gorilla) |
| Pembayaran | Midtrans Snap |
| Autentikasi | JWT HS256 (access) + refresh token opaque |
| Mobile | React Native (Passenger & Driver) |
| Maps | MapLibre + OpenStreetMap |
| Routing | Valhalla |
| Geocoding | Nominatim |
| Dashboard admin | Web (SPA), menu dinamis dari permission |

### Struktur direktori backend

```
cmd/api              entry point, penanganan sinyal
internal/auth        penerbitan & validasi JWT
internal/broker      RabbitMQ
internal/config      pembacaan environment
internal/db          koneksi PostgreSQL & Redis
internal/handlers    HTTP handler
internal/middleware  JWT, pemuatan user, RBAC
internal/models      entitas GORM
internal/payment     Midtrans
internal/pricing     kalkulator tarif dari setting dinamis
internal/repository  akses data (wallet, role, lokasi, setting)
internal/sdui        Server-Driven UI
internal/testutil    helper test
internal/websocket   hub & klien WS
internal/workers     matching worker, presence worker
```

---

## 2. Model Peran (RBAC)

### 2.1 Daftar role

Pengguna aplikasi (grup `user`): `customer`, `driver_motorcycle`,
`driver_car`, `merchant`.

Back-office (grup `admin`): `admin.superadmin`, `admin.finance_head`,
`admin.finance_staff`, `admin.sales_head`, `admin.cs`, `admin.ops_manager`,
`admin.driver_manager`.

### 2.2 Multi-role dengan satu role aktif

Satu akun bisa memiliki banyak role, tetapi pada satu waktu hanya satu role
yang aktif, dan otorisasi selalu dihitung dari role aktif itu saja — tidak
pernah dari gabungan semua role. Seorang admin yang sedang memakai aplikasi
sebagai customer tidak membawa wewenang admin-nya ke sesi tersebut.

```
users
  ├─ role_code   ← role yang sedang aktif
  └─ Roles       ← M2M lewat user_roles (semua role yang dimiliki)

roles
  ├─ code, name, group ("user" | "admin")
  └─ Permissions  ← M2M lewat role_permissions
```

Alur pemakaian:

1. `POST /api/users/roles` menambah role ke akun. Hanya `customer`,
   `driver_motorcycle`, `driver_car`, dan `merchant` yang bisa diminta
   sendiri; role admin hanya bisa diberikan pemegang permission `users.manage`.
2. `PUT /api/users/active-role` mengganti role aktif. Role yang belum dimiliki
   ditolak 403, jadi endpoint ini tidak bisa dipakai menaikkan hak akses
   sendiri. Access token baru langsung diterbitkan.
3. `GET /api/user` mengembalikan `active_role` dan `available_roles`, dipakai
   klien untuk menampilkan tombol pindah mode.

`RequireRole` membaca klaim JWT tanpa query database. `RequirePermission`
memuat user lengkap dari database sehingga akun yang baru di-suspend langsung
kehilangan akses tanpa menunggu token kedaluwarsa. Konsekuensinya: penjaga yang
hanya memeriksa role masih mempercayai token lama sampai kedaluwarsa (15
menit) — perubahan role atau penonaktifan akun berlaku seketika hanya di jalur
yang lewat `RequirePermission` atau `LoadUser`.

`HasPermission` mengembalikan `true` tanpa syarat untuk `admin.superadmin`. Di
luar itu ia membaca `u.Role.Permissions`, yang harus sudah di-preload; bila
belum, hasilnya `false` (fail-closed) — kelalaian preload menutup akses, bukan
membukanya.

### 2.3 Permission dan endpoint-nya

| Permission | Endpoint |
|---|---|
| `orders.view` | `GET /api/admin/orders` |
| `orders.cancel_any` | `PUT /api/admin/orders/:uuid/cancel` |
| `orders.force_complete` | `PUT /api/admin/orders/:uuid/force-complete` |
| `finance.view_report` | `GET /api/admin/finance/report`, `GET /api/admin/finance/withdrawals` |
| `finance.disbursement` | `PUT /api/admin/finance/withdrawals/:id/disburse`, `PUT .../reject` |
| `finance.refund` | `POST /api/admin/finance/refunds` |
| `drivers.view` | `GET /api/admin/drivers`, `GET /api/admin/drivers/:id/kyc` |
| `drivers.verify` | `PUT /api/admin/drivers/:id/verify`, `PUT /api/admin/drivers/:id/reject-kyc` |
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

Pembagian default per role ada di `models.SeedRoles` (`internal/models/role.go`)
dan disinkronkan ke database setiap server start lewat
`repository.SeedRolesAndPermissions`, termasuk pencabutan permission yang
dihapus dari kode.

Pemetaan yang berlaku sekarang:

| Role | Permission |
|---|---|
| `admin.superadmin` | seluruh 19 permission; `HasPermission` juga mengembalikan true tanpa memeriksa relasi |
| `admin.finance_head` | `finance.view_report`, `finance.disbursement`, `finance.refund`, `reports.view`, `orders.view` |
| `admin.finance_staff` | `finance.view_report`, `finance.refund`, `orders.view` |
| `admin.sales_head` | `promo.manage`, `reports.sales`, `reports.view`, `orders.view`, `merchants.view` |
| `admin.cs` | `orders.view`, `orders.cancel_any`, `finance.refund`, `users.view`, `drivers.view` |
| `admin.ops_manager` | `orders.view`, `orders.force_complete`, `drivers.view`, `reports.view`, `merchants.view` |
| `admin.driver_manager` | `drivers.view`, `drivers.verify`, `drivers.suspend`, `drivers.bonus` |
| `customer`, `driver_motorcycle`, `driver_car`, `merchant` | tanpa permission back-office |

Catatan: `admin.finance_staff` tidak memegang `finance.disbursement` — staf
keuangan melihat dan mengajukan, kepala keuangan yang mencairkan.
`admin.cs` memegang `finance.refund` dan `orders.cancel_any` karena keduanya
yang dibutuhkan saat menangani komplain.

### 2.4 Driver motor vs driver mobil

Keduanya role terpisah pada akun yang sama, bukan akun berbeda. Order membawa
kolom `vehicle_type` (`motorcycle` atau `car`), dan driver hanya bisa menerima
order yang cocok dengan role aktifnya. Satu orang yang punya motor dan mobil
cukup berpindah role aktif.

### 2.5 Verifikasi driver (KYC)

`is_verified` bukan tombol yang bisa dinyalakan admin secara langsung —
nilainya adalah akibat dari berkas KYC yang disetujui.

Dokumen wajib pada `driver_profiles`: KTP (`identity_card_number`,
`identity_card_photo_url`), SIM (`license_number`, `license_expiry`,
`license_photo_url`), STNK (`vehicle_registration_number`,
`vehicle_registration_photo_url`), swafoto (`selfie_photo_url`), dan rekening
pencairan (`bank_name`, `bank_account_number`, `bank_account_name`).

Mesin status `kyc_status`:

```
not_submitted ──POST /api/driver/kyc──▶ pending
pending ──PUT /api/admin/drivers/:id/verify──────▶ approved   (is_verified = true)
pending ──PUT /api/admin/drivers/:id/reject-kyc──▶ rejected   (is_verified = false)
rejected ──POST /api/driver/kyc──▶ pending
approved ──POST /api/driver/kyc──▶ pending        (is_verified dicabut)
```

Aturan yang menyertainya:

- Pengajuan saat status `pending` ditolak 409 — berkas yang sedang ditinjau
  tidak boleh berubah di bawah tangan peninjau.
- SIM kedaluwarsa ditolak 422 saat pengajuan.
- `PUT /api/profile/driver` ditolak 409 selama status `pending` atau
  `approved`, supaya endpoint profil lama tidak dipakai menimpa data yang
  sudah diverifikasi.
- Persetujuan menolak berkas tidak lengkap (422 beserta `missing_fields`) dan
  mencatat `kyc_reviewed_by` sebagai jejak audit.
- Penolakan mewajibkan `reason`, dikembalikan ke driver lewat
  `GET /api/driver/kyc`.
- Pengajuan ulang setelah disetujui menurunkan status ke `pending` dan
  mencabut `is_verified` — mengganti rekening tujuan setelah disetujui adalah
  pola yang dipakai saat akun diambil alih, jadi harus melewati manusia lagi.

`GET /api/driver/kyc` menyamarkan nomor rekening (empat digit terakhir);
`GET /api/admin/drivers/:id/kyc` menampilkannya utuh. Antrean tinjauan dibuka
dengan `GET /api/admin/drivers?kyc_status=pending`.

---

## 3. Alur Order

Status: `searching` → `accepted` → `arrived` → `in_progress` → `completed`,
dengan `cancelled` sebagai jalur keluar. Konstanta ada di
`internal/models/order.go`; status awal adalah `searching`, **bukan** `pending`.

1. **Pembuatan** (`POST /api/orders`) — jarak dihitung haversine, tarif dari
   `pricing.Calculator`. Bila metode bayar wallet, saldo dipotong di transaksi
   yang sama dengan penyimpanan order; saldo kurang membuat order gagal
   dibuat, bukan tercipta tanpa pembayaran. Event `order.created`
   dipublikasikan ke RabbitMQ.
2. **Pencocokan** — `MatchingWorker.Dispatch` mengambil driver terdekat dari
   Redis GEOSEARCH (diambil `maxCandidates * 3` karena sebagian akan tersaring),
   membuang driver yang sudah pernah ditawari order ini lewat `excludeOffered`,
   lalu menyaring di database: `role_code` cocok dengan `vehicle_type`,
   `is_active`, `is_verified`, dan `is_online` semuanya true, dan tidak sedang
   memegang order berjalan. Urutan terdekat dari GEOSEARCH dipertahankan.
   Satu baris `OrderOffer` dicatat per kandidat **sebelum** notifikasi dikirim,
   dengan `expires_at` dari `matching.offer_timeout_seconds`. Kandidat menerima
   `incoming_order` lewat WebSocket; bila tidak ada kandidat, pemesan menerima
   `no_drivers_available`.
3. **Penerimaan** (`PUT /api/orders/:uuid/accept`) — hanya driver
   terverifikasi, hanya satu order berjalan per driver. Pengambilan dilakukan
   dengan update bersyarat (`uuid = ? AND status = 'searching' AND
   vehicle_type = ?`) sehingga dua driver tidak bisa mengambil order yang sama.
   Baris `OrderOffer` milik driver ini ikut ditandai `accepted` di transaksi yang
   sama; driver yang mengambil order tanpa baris tawaran tetap diizinkan.
4. **Penolakan** (`PUT /api/orders/:uuid/reject`) — status order tidak berubah
   (tetap `searching`); yang berubah hanya baris `OrderOffer` milik driver ini
   menjadi `rejected`. Setelah itu handler menerbitkan ulang event
   `order.created` supaya `MatchingWorker` mencari kandidat berikutnya.
5. **Perubahan status** (`PUT /api/orders/:uuid/status`) — seluruh transisi di
   dalam transaksi dengan penguncian baris (`SELECT … FOR UPDATE`). Transisi
   tidak sah ditolak.
6. **Penyelesaian** — potongan platform dihitung saat itu juga dan disimpan ke
   `platform_fee` serta `driver_earning`, sehingga perubahan tarif kemudian
   tidak mengubah catatan lama. Order wallet mengkredit bagian bersih driver;
   order tunai mendebit potongan platform dari saldo driver.
7. **Penilaian** (`POST /api/orders/:uuid/rate`) — hanya untuk order selesai
   dan hanya sekali, dijaga lewat kondisi `WHERE … IS NULL` saat update.

Semua endpoint daftar memakai pagination dengan batas 100 baris per halaman.
Parameter yang dibaca `paginate()` adalah `page` dan **`per_page`** (bukan
`limit`), dengan default `per_page=20` dan batas atas 100.

### Tabel `order_offers`

Kandidat per order disimpan di PostgreSQL lewat `models.OrderOffer`, **bukan di
Redis**. Alasannya: keadaan tawaran menentukan siapa yang boleh menerima order,
dan riwayat penolakan tetap berguna sebagai jejak audit jauh setelah tawarannya
kedaluwarsa.

```go
OrderUUID string      // uniqueIndex gabungan dengan DriverID
DriverID  uint        // satu driver hanya ditawari satu kali per order
Status    OfferStatus // offered | accepted | rejected | expired
Reason    string      // hanya terisi pada penolakan sadar
ExpiresAt time.Time   // dihitung saat tawaran dibuat, bukan saat dibaca
```

Unique index `(order_uuid, driver_id)` inilah yang mencegah driver yang sudah
menolak ditawari ulang oleh putaran pencarian berikutnya. `ExpiresAt` dikunci
saat tawaran dibuat sehingga mengubah `matching.offer_timeout_seconds` tidak
memindahkan tenggat tawaran yang sudah beredar.

`PresenceWorker` menyapu berkala untuk menandai tawaran kedaluwarsa dan
memadamkan status online yang menggantung — diperlukan di samping hook
`hub.OnDisconnect` karena setelah server restart seluruh koneksi lenyap tanpa
pernah melewati jalur unregister.

---

## 4. Dompet dan Uang

Seluruh perubahan saldo melewati `repository.WalletRepository`:

- Baris user dikunci sebelum saldo diubah, dan penambahan memakai ekspresi SQL
  (`balance + ?`) alih-alih baca lalu tulis, sehingga dua permintaan bersamaan
  tidak saling menimpa.
- Setiap perubahan menulis satu baris `wallet_transactions` beserta
  `balance_after`, sehingga saldo dan buku besar selalu bisa direkonsiliasi.
- Top up membuat transaksi `PENDING`; saldo bertambah setelah notifikasi
  pembayaran diverifikasi.
- Penarikan memotong saldo di awal dan menyisakan transaksi `PENDING` sampai
  tim keuangan mencairkan atau menolaknya. Penolakan mengembalikan dana.
- Rekening tujuan disimpan pada kolom tersendiri, bukan dititipkan ke `note`.

### Penarikan driver terikat KYC

Untuk driver, rekening tujuan tidak pernah diambil dari badan permintaan HTTP.
Yang dipakai adalah rekening pada berkas KYC yang sudah disetujui; nilai
`bank_name`, `account_number`, dan `account_name` dari klien sengaja dibuang,
bukan dipakai sebagai cadangan. Tanpa aturan ini, satu sesi driver yang diambil
alih cukup memanggil `POST /api/wallet/withdraw` dengan rekening penyerang, dan
tim keuangan tidak punya dasar menolaknya.

Konsekuensi: driver tanpa KYC `approved` menerima 403 beserta `kyc_status`;
driver `approved` tanpa data rekening juga 403; setelah mengganti rekening
lewat pengajuan ulang, penarikan tertutup sampai disetujui kembali. Peran lain
(customer, merchant) belum punya proses KYC, jadi tetap mengirim rekening pada
badan permintaan dan ketiga field itu wajib bagi mereka.

### Webhook Midtrans

`POST /webhook/midtrans` publik namun terikat verifikasi tanda tangan SHA-512.
Bila `MIDTRANS_SERVER_KEY` tidak tersedia, endpoint membalas 503 dan tidak
memproses apa pun. Penyelesaian transaksi idempoten lewat `SettlePending`:
hanya transaksi `PENDING` yang diproses, pengiriman ulang mengembalikan
`ErrAlreadySettled` dan dibalas 200 tanpa mengubah saldo.

---

## 5. Riwayat per Peran

Penumpang, driver, dan merchant melihat kejadian yang sama dari sisi berbeda:
satu order selesai adalah pengeluaran bagi penumpang, pendapatan bagi driver,
penjualan bagi merchant. Karena itu jalurnya dipisah, bukan satu endpoint
bersama. Penjaga peran memakai role **aktif**.

| Route | Penjaga | Isi |
|---|---|---|
| `GET /api/customer/orders` | `customer` | order dengan `rider_id` = user; rekap `total_orders`, `completed`, `cancelled`, `total_fare`, `total_net` |
| `GET /api/customer/wallet/history` | `customer` | dibatasi `DEPOSIT`, `PAYMENT`, `REFUND`, `WITHDRAWAL` |
| `GET /api/driver/orders` | driver | order dengan `driver_id` = user; `total_net` menjumlahkan `driver_earning` |
| `GET /api/driver/wallet/history` | driver | dibatasi `EARNING`, `FEE`, `BONUS`, `WITHDRAWAL`, `DISBURSED` |
| `GET /api/driver/earnings` | driver | jumlah trip, kotor, potongan platform, bersih, rincian per hari, saldo berjalan |
| `GET /api/merchant/orders` | `merchant` | order dengan `merchant_id` = user |
| `GET /api/merchant/wallet/history` | `merchant` | dibatasi `EARNING`, `REFUND`, `WITHDRAWAL`, `DISBURSED` |
| `GET /api/merchant/sales` | `merchant` | omzet per rentang tanggal beserta rincian harian |

Berlaku untuk semuanya:

- Scope selalu dihitung dari user pada token, tidak pernah dari parameter
  permintaan.
- Rentang tanggal (`from`, `to`) memakai `parseDateRange`; standarnya 30 hari
  terakhir. Rekap dihitung atas seluruh rentang, bukan hanya halaman yang
  diminta, supaya angkanya tidak berubah saat pengguna berpindah halaman.
- Query `type` pada riwayat dompet hanya boleh mempersempit daftar jenis milik
  peran itu. Jenis di luar daftar dibalas 422 beserta `allowed_values`.
- `Order` punya `merchant_id` (nullable). `POST /api/orders` menerimanya secara
  opsional dan memvalidasi akun tersebut punya `MerchantProfile` aktif, selain
  itu 422.
- `GET /api/orders` dan `GET /api/wallet/history` yang lama dipertahankan apa
  adanya agar klien yang sudah beredar tidak rusak.

---

## 6. Setting Dinamis dan Server-Driven UI

Tabel `dynamic_settings` menyimpan konfigurasi yang bisa diubah dari dashboard
tanpa deploy ulang, dengan cache Redis berumur 5 menit.

| Kunci | Default | Arti |
|---|---|---|
| `fare.per_km_price_idr` | 3000 | tarif per kilometer |
| `fare.min_distance_km` | 3 | jarak minimum yang ditagihkan |
| `fare.platform_fee_percent` | 20 | potongan dari pendapatan driver (0–100) |
| `fare.customer_fee_percent` | 0 | biaya yang ditambahkan di atas tarif penumpang (0–100) |
| `fare.merchant_fee_percent` | 0 | potongan dari bagian merchant (0–100) |
| `wallet.min_balance_idr` | -10000 | batas saldo minus sebelum driver dipaksa offline |
| `matching.search_radius_km` | 5 | radius pencarian driver |
| `matching.max_driver_candidates` | 10 | jumlah kandidat driver |
| `matching.offer_timeout_seconds` | 30 | batas waktu driver menjawab tawaran order |
| `ui.primary_color` | `#c8ff00` | warna utama yang dikirim lewat `GET /api/ui/home` |
| `ui.home_banner_text` | — | teks banner beranda |
| `ui.home_banner_color` | `#1a1a26` | warna banner beranda |
| `ui.driver_mode_enabled` | — | menampilkan atau menyembunyikan tombol pindah ke mode driver |
| `app.maintenance_mode` | — | menutup aplikasi untuk pemeliharaan |
| `app.min_android_version` | 1.0.0 | versi minimum yang masih dilayani |
| `app.force_update_version` | — | versi yang memaksa pembaruan sebelum aplikasi bisa dipakai |

Nilai default ada di dua tempat yang harus tetap sejalan: `models.SeedSettings`
(`internal/models/setting.go`) menyemai baris database, dan konstanta
`default*` di `internal/pricing/pricing.go` dipakai sebagai cadangan bila baris
setting hilang.

### Tidak ada tarif dasar, dan tarif minimum bukan nilai tersimpan

Rumus tarif seluruhnya bertumpu pada jarak:

```
charged_distance = max(distance_km, fare.min_distance_km)
total            = round(charged_distance × fare.per_km_price_idr)
```

Dua kunci yang pernah ada — `fare.base_price_idr` dan `fare.min_fare_idr` —
sudah dihapus, dan `internal/models/setting.go` mendaftarkan keduanya sebagai
kunci usang yang **dibersihkan dari database setiap server start**. Menambahkan
kembali salah satunya tidak akan bertahan melewati restart berikutnya.

Alasannya: tarif minimum adalah nilai turunan (`min_distance_km ×
per_km_price_idr`). Menyimpannya lagi sebagai angka rupiah tersendiri berarti
dua sumber kebenaran yang bisa berselisih — seseorang menaikkan tarif per
kilometer, lupa menaikkan tarif minimum, dan perjalanan pendek diam-diam
menjadi lebih murah daripada seharusnya. Nilai turunannya tetap dikembalikan
kepada klien sebagai `min_fare` pada setiap kuotasi, jadi tidak ada informasi
yang hilang.

Arah kedua persentase biaya berlawanan dan mudah tertukar:

- `fare.customer_fee_percent` **ditambahkan di atas** tarif; penumpang membayar
  `total + customer_fee`.
- `fare.platform_fee_percent` **dikurangkan dari** pendapatan driver, dan
  `fare.merchant_fee_percent` dari bagian merchant.

`wallet.min_balance_idr` bernilai negatif karena driver order tunai berutang
potongan platform kepada perusahaan; nilai positif yang tersimpan di database
diperlakukan sebagai salah ketik dan dinegasikan oleh `pricing.MinBalance`.

`GET /api/ui/home` mengembalikan pohon komponen JSON yang dirakit dari setting
tersebut, berbeda antara customer dan driver. Field `version` adalah sidik jari
isi layar, bukan timestamp, sehingga klien hanya menggambar ulang ketika UI-nya
memang berubah.

---

## 7. Realtime (WebSocket)

`GET /ws?token=<access_token>`.

- Origin browser diperiksa terhadap `ALLOWED_WS_ORIGINS`; permintaan tanpa
  header Origin (aplikasi mobile) tetap diterima.
- Koneksi memakai batas ukuran pesan, deadline baca/tulis, dan ping berkala.
- Satu user hanya memegang satu koneksi; koneksi lama ditutup saat yang baru
  mendaftar, dan pemutusan koneksi lama tidak menghapus koneksi baru.
- Driver mengirim `location_update`; koordinat di luar rentang yang mungkin
  diabaikan sebelum masuk indeks geospasial Redis.
- `PresenceWorker` menurunkan `is_online` driver yang koneksinya putus lebih
  dari beberapa menit, supaya status tidak nyangkut online padahal app mati.

Pesan yang dipakai klien mobile:

| Arah | Pesan | Keterangan |
|---|---|---|
| Server → driver | `incoming_order` | tawaran order dari `MatchingWorker` |
| Driver → server | `location_update` | koordinat driver, masuk indeks Redis |
| Server → penumpang | posisi driver & perubahan status order | untuk live tracking |

---

## 8. Daftar Route (87 total)

Sumber kebenaran adalah tabel route Gin di `internal/server/server.go`. Test
`TestAPI_AllRoutesAreRegistered` (`internal/handlers/api_coverage_test.go`)
memaksa jumlah tercatat di sini sinkron dengan router aktual.

```
GET    /health
GET    /ws
POST   /webhook/midtrans
GET    /uploads/*filepath

POST   /api/register
POST   /api/login
POST   /api/refresh
POST   /api/logout
GET    /api/user
POST   /api/users/roles
PUT    /api/users/active-role
GET    /api/ui/home

GET    /api/orders
POST   /api/orders
PUT    /api/orders/:uuid/accept
PUT    /api/orders/:uuid/reject
PUT    /api/orders/:uuid/status
POST   /api/orders/:uuid/rate
POST   /api/orders/:uuid/chat
GET    /api/orders/:uuid/chat
POST   /api/fare/estimate
POST   /api/promos/validate

GET    /api/wallet
POST   /api/wallet/deposit
POST   /api/wallet/withdraw
GET    /api/wallet/history

GET    /api/profile
PUT    /api/profile
PUT    /api/profile/driver
PUT    /api/profile/merchant

GET    /api/notifications
GET    /api/notifications/unread-count
PUT    /api/notifications/:id/read
PUT    /api/notifications/read-all

GET    /api/products
GET    /api/products/:id
POST   /api/uploads

GET    /api/customer/orders
GET    /api/customer/wallet/history

POST   /api/driver/kyc
GET    /api/driver/kyc
PUT    /api/driver/status
GET    /api/driver/orders
GET    /api/driver/wallet/history
GET    /api/driver/earnings

GET    /api/merchant/orders
GET    /api/merchant/wallet/history
GET    /api/merchant/sales
GET    /api/merchant/products
POST   /api/merchant/products
GET    /api/merchant/products/:id
PUT    /api/merchant/products/:id
DELETE /api/merchant/products/:id

GET    /api/admin/settings
PUT    /api/admin/settings/:key
GET    /api/admin/drivers
PUT    /api/admin/drivers/:id/verify
PUT    /api/admin/drivers/:id/reject-kyc
GET    /api/admin/drivers/:id/kyc
PUT    /api/admin/drivers/:id/suspend
PUT    /api/admin/drivers/:id/reactivate
POST   /api/admin/drivers/:id/bonus
GET    /api/admin/orders
PUT    /api/admin/orders/:uuid/cancel
PUT    /api/admin/orders/:uuid/force-complete
GET    /api/admin/finance/report
GET    /api/admin/finance/withdrawals
PUT    /api/admin/finance/withdrawals/:id/disburse
PUT    /api/admin/finance/withdrawals/:id/reject
POST   /api/admin/finance/refunds
GET    /api/admin/merchants
GET    /api/admin/merchants/:id
PUT    /api/admin/merchants/:id/approve
PUT    /api/admin/merchants/:id/suspend
GET    /api/admin/users
GET    /api/admin/users/:id
PUT    /api/admin/users/:id/active
POST   /api/admin/users/:id/roles
DELETE /api/admin/users/:id/roles/:role
GET    /api/admin/promos
POST   /api/admin/promos
PUT    /api/admin/promos/:id
DELETE /api/admin/promos/:id
GET    /api/admin/promos/:id/usage
GET    /api/admin/reports/dashboard
GET    /api/admin/reports/sales
GET    /api/admin/reports/top-drivers
```

Perbedaan antara dokumen perencanaan lama dan router aktual — pakai router:

| Nama pada rencana lama | Yang benar-benar terdaftar |
|---|---|
| `PUT /api/drivers/status` | `PUT /api/driver/status` |
| `GET /api/drivers/earnings` | `GET /api/driver/earnings` |
| `GET /api/wallet/transactions` | `GET /api/wallet/history` |

---

## 9. Kontrak API untuk Klien Mobile

Konvensi umum:

- Semua endpoint `/api/*` butuh header `Authorization: Bearer <access_token>`
  kecuali `register`, `login`, `refresh`.
- Endpoint list memakai pagination `page` dan `per_page` (default 20, maksimum
  100). Metadata pagination dikembalikan pada objek `meta`, bukan `pagination`.
- Format error umumnya `{ "error": "pesan" }` — satu field berisi pesan
  berbahasa Inggris yang bisa ditampilkan, **bukan** pasangan
  `{error, message}`. Beberapa endpoint menambah field pelengkap
  (`allowed_values`, `kyc_status`, `missing_fields`).
- Validasi badan permintaan yang gagal dibalas **422**, bukan 400.
- Field waktu dalam ISO 8601 UTC.
- `/ws` mengambil token dari query (`?token=`), bukan header, karena API
  WebSocket browser tidak mengizinkan header kustom.

### 9.0 Identitas user

```
GET /api/user
```

```json
{
  "id": 42,
  "name": "Budi",
  "email": "budi@example.com",
  "phone": "0812...",
  "is_active": true,
  "is_verified": false,
  "balance": 85000,
  "active_role": "customer",
  "available_roles": ["customer", "driver_motorcycle"]
}
```

Tidak ada field `permissions` maupun `is_online` di sini (bagian 16).

```
PUT /api/users/active-role
{ "role": "driver_motorcycle" }
→ { "message": "...", "active_role": "driver_motorcycle",
    "access_token": "...", "expires_in": 900 }
```

Error: 422 bila kode role tidak dikenal, 403 bila role tidak dimiliki akun.

### 9.1 Riwayat order milik sendiri

```
GET /api/orders?page=&per_page=
```

Scope ditentukan role aktif di dalam handler (`GetOrderHistory`): role driver
difilter `driver_id`, role admin melihat **semua** order, selain itu difilter
`rider_id`. Nilai diambil dari klaim JWT, bukan dari parameter permintaan.

Endpoint ini tidak menerima filter `status` maupun `from`/`to` — untuk itu
pakai `GET /api/customer/orders` atau `GET /api/driver/orders`, yang mendukung
`status`, `from`, `to`, dan mengembalikan rekap.

```json
{
  "orders": [ { "uuid": "...", "status": "completed", "...": "..." } ],
  "meta": { "page": 1, "per_page": 20, "total": 47 }
}
```

Setiap elemen adalah `models.Order` yang di-serialize apa adanya
(`internal/models/order.go`): `uuid`, `rider_id`, `driver_id`, `merchant_id`,
`vehicle_id`, `status`, `pickup_lat`, `pickup_lon`, `pickup_address`,
`dropoff_lat`, `dropoff_lon`, `dropoff_address`, `distance_km`, `fare_amount`,
`customer_fee`, `platform_fee`, `driver_earning`, `merchant_fee`, `currency`,
`payment_method`, `voucher_code`, `promo_id`, `promo_discount`, `vehicle_type`,
`customer_rating`, `driver_rating`, `review_note`, dan timestamp per transisi
(`accepted_at`, `arrived_at`, `picked_up_at`, `completed_at`, `cancelled_at`).
Relasi `rider`, `driver`, `merchant` memakai `omitempty` — hanya muncul bila
handler-nya melakukan preload.

Perhatikan: koordinat memakai nama `pickup_lat`/`pickup_lon` dan
`dropoff_lat`/`dropoff_lon` — bukan objek `pickup`/`destination` bersarang, dan
bukan `lng`. Tarif ada di `fare_amount`, bukan `fare`. Rating dipisah dua kolom
(`customer_rating` untuk nilai dari penumpang ke driver, `driver_rating`
sebaliknya), bukan satu field `rating`; keduanya `*int`, jadi `null` berarti
belum dinilai, bukan nol.

`fare_amount` adalah tarif **setelah** potongan promo dan **tanpa**
`customer_fee`. Yang dibayar penumpang adalah `fare_amount + customer_fee` —
angka itu tidak ada sebagai satu kolom, jadi klien harus menjumlahkannya
sendiri. `platform_fee`, `driver_earning`, dan `merchant_fee` masih nol selama
order belum `completed`; ketiganya diisi saat penyelesaian.

Karena `models.Order` di-serialize utuh, `platform_fee` dan `driver_earning`
**ikut terkirim ke penumpang**. Bila kebocoran itu tidak diinginkan, perbaikan
harus dilakukan di sisi backend dengan DTO terpisah — menyaringnya di aplikasi
tidak menutup apa pun, karena datanya sudah ada di response.

### 9.2 Status online/offline driver

```
PUT /api/driver/status
{ "status": "online" }        // nilai sah: "online", "offline"
```

Role aktif harus `driver_motorcycle` atau `driver_car`. Menyalakan status
online menuntut `is_verified = true`; mematikannya tidak.

Sukses: `{ "status": "online", "updated_at": "2026-08-05T09:00:00Z" }`

Saat offline, posisi driver dibuang dari indeks geospasial Redis. Bila
penghapusan itu gagal, response tetap 200 dengan field tambahan
`"warning": "Location index could not be cleared"` — status di database sudah
benar dan predikat `is_online` pada pencarian tetap menyaringnya.

Error:

| Status | Isi | Sebab |
|---|---|---|
| 403 | `{"error": "Driver account is not verified yet", "kyc_status": "pending"}` | mencoba online sebelum KYC disetujui |
| 403 | `{"error": "Finish your ongoing order before going offline"}` | masih ada order `accepted`/`arrived`/`in_progress` |
| 422 | `{"error": "status must be online or offline", "allowed_values": ["online","offline"]}` | nilai di luar enum |

### 9.3 Tolak order (driver)

```
PUT /api/orders/:uuid/reject
{ "reason": "terlalu_jauh" }   // opsional, badan kosong tetap sah, dipotong 100 karakter
```

Sukses:
`{ "uuid": "...", "status": "searching", "rejected_by_this_driver": true }`

Status order tidak berubah — yang berubah hanya baris `OrderOffer` milik driver
ini. Driver hanya boleh menolak order yang memang tercatat pernah ditawarkan
kepadanya; tanpa syarat itu, endpoint ini bisa dipakai menebak keberadaan order
milik orang lain.

| Status | Pesan | Sebab |
|---|---|---|
| 404 | `Order not found or was never offered to you` | order tidak ada, atau tidak ada baris tawaran untuk driver ini |
| 409 | `You have already responded to this offer` | tawaran sudah dijawab atau kedaluwarsa |
| 409 | `Order has already been taken by another driver` | order sudah punya `driver_id` |
| 409 | `Order is no longer searching for a driver` | order berubah status karena sebab lain |

### 9.4 Estimasi tarif

```
POST /api/fare/estimate
{
  "pickup": { "lat": -0.2192, "lng": 100.6339 },
  "destination": { "lat": -0.2250, "lng": 100.6400 },
  "vehicle_type": "motorcycle"          // opsional, default motorcycle
}
```

```json
{
  "distance_km": 3.4,
  "charged_distance_km": 3.4,
  "min_distance_km": 3,
  "min_distance_applied": false,
  "per_km_price": 3000,
  "total": 10200,
  "min_fare": 9000,
  "customer_fee": 0,
  "customer_fee_percent": 0,
  "total_charged": 10200,
  "min_total_charged": 9000,
  "vehicle_type": "motorcycle",
  "valid_for_seconds": 120
}
```

Seluruh rincian berada di level teratas — **tidak** dibungkus objek `breakdown`.
Tidak ada `base_fare`, `distance_fee`, `estimated_fare`, maupun
`min_fare_applied`: keempat nama itu berasal dari model tarif lama yang sudah
tidak dipakai (§6).

Yang perlu dibaca klien:

| Field | Arti |
|---|---|
| `total` | tarif perjalanan sebelum biaya penumpang dan sebelum promo |
| `total_charged` | yang benar-benar dibayar penumpang, yaitu `total + customer_fee` |
| `charged_distance_km` | jarak yang ditagihkan setelah lantai jarak minimum |
| `min_distance_applied` | `true` bila perjalanan lebih pendek dari `min_distance_km`, jadi yang ditagih adalah jarak minimum |
| `min_fare` | `min_distance_km × per_km_price`, dihitung bukan disimpan |
| `min_total_charged` | `min_fare` ditambah biaya penumpangnya |

Angka yang ditampilkan sebagai harga adalah **`total_charged`**, bukan `total` —
selama `fare.customer_fee_percent` bernilai 0 keduanya sama, dan itulah yang
membuat kekeliruan ini tidak ketahuan sampai persentasenya dinaikkan.

Endpoint ini memakai ulang `pricing.Calculator` yang sama dengan yang dipakai
`CreateOrder`, sehingga angka estimasi dan angka final tidak pernah berbeda
logic. Tetap saja ini bukan harga terkunci: bila `fare.*` berubah antara
estimasi dan pembuatan order, tarif final dihitung ulang.

Berbeda dari `CreateOrder` yang memakai `NormalizeVehicleType` (permisif —
nilai tak dikenal jatuh ke `motorcycle`), endpoint ini menolak
`vehicle_type` yang salah terang-terangan: penumpang yang salah ketik lebih
baik tahu daripada menerima harga motor untuk perjalanan mobil.

Error — keduanya **422**, bukan 400:
`{"error": "Coordinates are out of range"}` dan
`{"error": "vehicle_type must be motorcycle or car", "allowed_values": [...]}`.

### 9.5 Pembuatan order

```
POST /api/orders
{
  "service_type": "ride",           // wajib; "car"/"taxi" → mobil, selain itu motor
  "pickup_lat": -0.2192,            // wajib
  "pickup_lon": 100.6339,           // wajib
  "pickup_address": "Jl. Sudirman No. 1",
  "dropoff_lat": -0.2250,           // wajib
  "dropoff_lon": 100.6400,          // wajib
  "dropoff_address": "Jl. Veteran No. 5",
  "payment_method": "wallet",       // wajib; "cash" atau "wallet"
  "promo_code": "HEMAT10",          // opsional (alias lama: "voucher_code")
  "merchant_id": 12                 // opsional, untuk order dari merchant
}
```

Koordinat dikirim sebagai field datar `pickup_lat`/`pickup_lon`, berbeda dari
bentuk bersarang pada `/api/fare/estimate`. Di sisi backend keduanya adalah
pointer `*float64` supaya lintang 0 — yang melintasi Sumatra dan Kalimantan —
tidak ditolak oleh `binding:"required"` sebagai "tidak dikirim".

Sukses **201**:
```json
{
  "message": "Order created, searching for driver",
  "order": { "uuid": "...", "status": "searching", "...": "..." },
  "fare": {
    "distance_km": 3.4, "charged_distance_km": 3.4,
    "min_distance_km": 3, "min_distance_applied": false,
    "per_km_price": 3000, "total": 10200, "min_fare": 9000,
    "customer_fee": 0, "customer_fee_percent": 0,
    "total_charged": 10200, "min_total_charged": 9000
  },
  "promo": { "code": "HEMAT10", "discount_amount": 1500, "final_fare": 8700 }
}
```

Objek `fare` adalah `pricing.Quote` yang sama persis dengan `/api/fare/estimate`
(§9.4), hanya tanpa `vehicle_type` dan `valid_for_seconds`. Dua field-nya
ditimpa dari order yang sudah tersimpan sebelum response ditulis
(`order_handler.go`): `customer_fee` diambil dari `order.CustomerFee` dan
`total_charged` menjadi `order.FareAmount + order.CustomerFee` — keduanya
dihitung **setelah** promo, jadi berbeda dari nilai yang keluar saat estimasi.

Objek `promo` hanya muncul bila ada potongan, dan `final_fare` di dalamnya
adalah `order.FareAmount` setelah potongan — bukan `total_charged`.

Error: 422 untuk badan tidak valid, `payment_method` di luar
`cash`/`wallet`, koordinat di luar rentang, atau merchant tidak aktif;
400 `Insufficient wallet balance` bila saldo kurang; kode promo yang gagal
memakai status pada 9.7.

### 9.6 Ringkasan pendapatan driver

```
GET /api/driver/earnings?from=YYYY-MM-DD&to=YYYY-MM-DD
```

Rentang memakai `parseDateRange` — **bukan** `period=daily|weekly` dengan
tanggal acuan. Default 30 hari terakhir; `to` dimundurkan ke akhir hari
(`+24 jam - 1 ns`) supaya order sore hari pada tanggal batas ikut terhitung.
Tanggal yang tidak bisa di-parse diabaikan diam-diam dan default tetap dipakai.

```json
{
  "summary": {
    "trips": 12,
    "gross_fare": 182000,
    "platform_fee": 20000,
    "driver_earning": 162000
  },
  "daily": [
    { "day": "2026-08-05T00:00:00Z", "trips": 5, "driver_earning": 67500 }
  ],
  "current_balance": 254300,
  "meta": { "from": "2026-07-06T...", "to": "2026-08-05T..." }
}
```

Hanya order berstatus `completed` yang dihitung. `daily` dikelompokkan dengan
`DATE_TRUNC('day', completed_at)`, urut terbaru dulu, dan **hari tanpa trip
tidak muncul sebagai baris nol** — grafik di aplikasi harus mengisi sendiri
tanggal yang kosong, bukan menganggap deret ini rapat.

`current_balance` adalah saldo dompet saat ini, bukan hasil penjumlahan
periode: saldo sudah berkurang oleh penarikan dan bertambah oleh bonus, jadi
angkanya tidak harus sama dengan `summary.driver_earning`. Bonus tidak masuk
ke rekap ini sama sekali — bonus adalah `WalletTransaction` bertipe `BONUS`,
terlihat di `GET /api/driver/wallet/history`.

Untuk daftar order per trip, pakai `GET /api/driver/orders` (mendukung
`status`, `from`, `to`, `page`, `per_page`) yang mengembalikan
`{orders, summary, meta}` dengan `summary.total_net` menjumlahkan
`driver_earning`.

### 9.7 Promo

```
POST /api/promos/validate
{ "code": "HEMAT10", "fare_before_discount": 15000 }
```

Hanya role aktif `customer` yang boleh memanggilnya — satu-satunya peran yang
memakai kode promo saat memesan. Badan permintaan **tidak** menerima
`vehicle_type`.

Sukses:
```json
{ "valid": true, "code": "HEMAT10", "discount_amount": 1500, "final_fare": 13500 }
```

Kegagalan mengembalikan `{"valid": false, "error": "..."}`:

| Status | Pesan | Sebab |
|---|---|---|
| 404 | `Promo code not found` | kode tidak ada |
| 410 | `Promo code is expired or not yet active` | di luar masa berlaku |
| 409 | `Promo quota has been used up` | kuota global habis |
| 409 | `You have already used this promo the maximum number of times` | batas per user tercapai |
| 422 | `Promo does not apply to this fare` | potongan yang dihasilkan nol |

Kode yang sama dikirim ulang sebagai `promo_code` pada `POST /api/orders`.
Keduanya memanggil `resolvePromo` yang sama, jadi tidak ada dua tempat yang
bisa berbeda pendapat tentang keabsahan sebuah kode. Di dalam `CreateOrder`,
baris promo dikunci `FOR UPDATE` sepanjang transaksi — tanpa kunci itu dua
permintaan bersamaan bisa sama-sama lolos pemeriksaan kuota dan membuat
`used_count` melewati `quota`. Pencatatan `PromoUsage` dan kenaikan
`used_count` berada di transaksi yang sama dengan pembuatan order.

`promo_discount` dan `promo_id` disimpan permanen di order, sama seperti
`platform_fee`/`driver_earning`. Kolom `voucher_code` menyimpan kodenya.

### 9.8 Riwayat transaksi wallet

```
GET /api/wallet/history?page=&per_page=
GET /api/customer/wallet/history?type=&from=&to=
GET /api/driver/wallet/history?type=&from=&to=
```

Jenis transaksi yang dikenal `models.TransactionType` — semuanya **HURUF
BESAR**: `DEPOSIT`, `WITHDRAWAL`, `PAYMENT`, `REFUND`, `EARNING`, `FEE`,
`BONUS`, `DISBURSED`. Status: `PENDING`, `SUCCESS`, `FAILED`.

`amount` selalu positif; arah ditentukan `type` (`IsCredit()` menandai
`DEPOSIT`, `REFUND`, `EARNING`, `BONUS` sebagai penambah saldo). Jangan
mengandalkan tanda minus untuk membedakan debit dari kredit.

---

## 10. Aplikasi Mobile React Native

### 10.1 Keputusan arsitektur

Satu codebase, dua pengalaman. Passenger dan driver memakai backend, model
auth, dan koneksi WebSocket yang sama; yang membedakan hanyalah role aktif.
Membangunnya sebagai dua aplikasi terpisah berarti menduplikasi lapisan auth,
API client, WS client, dan peta — lalu keduanya berbeda perlahan seiring waktu.

Karena backend sudah mendukung satu akun dengan banyak role dan perpindahan
role aktif lewat `PUT /api/users/active-role`, app cukup memilih navigation
stack berdasarkan `active_role` dari `GET /api/user`. Pengguna yang sekaligus
penumpang dan driver berpindah mode tanpa logout.

### 10.2 Stack

| Kebutuhan | Pilihan | Alasan |
|---|---|---|
| Framework | React Native (bare, bukan Expo managed) | butuh native module peta & background location |
| Bahasa | TypeScript | kontrak API besar, tipe menangkap ketidakcocokan lebih awal |
| Navigasi | React Navigation | stack berbeda per role aktif |
| Server state | TanStack Query | caching, retry, invalidasi setelah mutasi |
| Client state | Zustand | ringan, cukup untuk auth & sesi order berjalan |
| Peta | MapLibre React Native + OpenStreetMap | konsisten dengan pilihan di roadmap |
| Routing & geocoding | Valhalla & Nominatim | sesuai roadmap; dipanggil dari app, bukan lewat backend |
| Penyimpanan token | Keychain / Keystore lewat `react-native-keychain` | refresh token tidak boleh di AsyncStorage biasa |
| WebSocket | klien tipis di atas `WebSocket` bawaan + reconnect | protokol pesan sudah ditentukan backend |
| Form | React Hook Form + Zod | validasi KYC banyak field |

### 10.3 Struktur folder

```
src/
  api/
    client.ts          instance HTTP, interceptor auth & refresh
    endpoints/         satu berkas per domain (orders, wallet, driver, promo)
    types.ts           tipe request/response, cermin kontrak bagian 9
  ws/
    client.ts          koneksi, reconnect, heartbeat
    events.ts          tipe pesan (incoming_order, location_update, dst)
  store/
    auth.ts            token, user, active_role
    activeOrder.ts     order yang sedang berjalan
  navigation/
    RootNavigator.tsx  memilih stack dari active_role
    PassengerStack.tsx
    DriverStack.tsx
  screens/
    auth/              login, register, pilih role
    passenger/         home map, pilih tujuan, konfirmasi, tracking, riwayat
    driver/            home online/offline, tawaran order, navigasi, pendapatan, KYC
    shared/            profil, wallet, chat
  components/          komponen UI dipakai lintas layar
  hooks/               useLocation, useActiveOrder, useWebSocket
  lib/                 format uang, jarak, tanggal
```

### 10.4 Autentikasi dan token

Access token JWT berumur **15 menit** disimpan di memori; refresh token opaque
berumur **30 hari** disimpan di Keychain/Keystore. Interceptor HTTP menangkap
401, memanggil `POST /api/refresh` satu kali, lalu mengulang permintaan yang
gagal. Permintaan bersamaan yang sama-sama kena 401 harus menunggu satu proses
refresh, bukan memicu beberapa refresh paralel: token lama dicabut setiap kali
dipakai (rotasi), dan backend menganggap pemakaian token yang sudah dicabut
sebagai tanda kebocoran — **seluruh sesi user itu ikut dicabut**. Refresh
berbarengan karena itu tidak sekadar boros, tapi bisa melempar user keluar dari
aplikasi.

Setelah `PUT /api/users/active-role`, backend menerbitkan access token baru
beserta `expires_in`. App harus mengganti token yang tersimpan dan me-reset
navigation stack, karena klaim role di token lama sudah tidak menggambarkan
mode yang sedang dipakai. Refresh token tidak ikut berganti di sini.

### 10.5 Layar passenger

| Layar | Endpoint |
|---|---|
| Login / Register | `POST /api/login`, `POST /api/register` |
| Home Map | `GET /api/ui/home`, geocoding Nominatim |
| Pilih pickup & tujuan | Nominatim (autocomplete), Valhalla (rute & jarak) |
| Estimasi tarif | `POST /api/fare/estimate` |
| Terapkan promo | `POST /api/promos/validate` |
| Buat order | `POST /api/orders` (dengan `promo_code` bila ada) |
| Live tracking | WebSocket `/ws` |
| Chat dengan driver | `POST /api/orders/:uuid/chat`, `GET /api/orders/:uuid/chat` |
| Beri rating | `POST /api/orders/:uuid/rate` |
| Riwayat | `GET /api/customer/orders` |
| Wallet | `GET /api/wallet`, `POST /api/wallet/deposit`, `GET /api/customer/wallet/history` |
| Profil | `GET /api/profile`, `PUT /api/profile` |

### 10.6 Layar driver

| Layar | Endpoint |
|---|---|
| Login | `POST /api/login` |
| Pengajuan KYC | `POST /api/driver/kyc`, `GET /api/driver/kyc` |
| Online / Offline | `PUT /api/driver/status` |
| Tawaran order masuk | WebSocket `incoming_order` |
| Terima order | `PUT /api/orders/:uuid/accept` |
| Tolak order | `PUT /api/orders/:uuid/reject` |
| Navigasi | Valhalla + MapLibre |
| Ubah status perjalanan | `PUT /api/orders/:uuid/status` |
| Kirim lokasi | WebSocket `location_update` |
| Riwayat | `GET /api/driver/orders` |
| Pendapatan | `GET /api/driver/earnings` |
| Wallet & penarikan | `GET /api/wallet`, `POST /api/wallet/withdraw`, `GET /api/driver/wallet/history` |

### 10.7 Hal yang mudah salah di sisi mobile

- **Layar KYC harus menampilkan `kyc_status` apa adanya.** Empat status
  (`not_submitted`, `pending`, `approved`, `rejected`) punya layar berbeda, dan
  `rejected` wajib menampilkan `reason` dari backend. Menyederhanakannya jadi
  "terverifikasi / belum" membuat driver tidak tahu apa yang harus diperbaiki.
- **Pengajuan ulang KYC mencabut `is_verified`.** Layar edit rekening perlu
  memperingatkan driver bahwa mengganti rekening akan menutup penarikan sampai
  ditinjau ulang — kalau tidak, ini terasa seperti bug.
- **Tombol offline bisa ditolak 403.** Pesannya
  `Finish your ongoing order before going offline` — tampilkan apa adanya,
  bukan error generik. Perhatikan bahwa backend tidak mengirim kode error
  mesin di sini; yang ada hanya field `error` berisi kalimat. Membedakan kasus
  ini dari 403 KYC dilakukan lewat ada-tidaknya field `kyc_status`.
- **Status online tidak ada di `GET /api/user`.** Setelah app dibuka ulang,
  tampilan tombol online/offline tidak bisa dipulihkan dari endpoint itu
  (lihat bagian 16). Sementara ini, simpan status terakhir secara lokal dan
  perlakukan sebagai dugaan sampai `PUT /api/driver/status` berikutnya
  mengonfirmasi — jangan tampilkan seolah pasti.
- **`platform_fee` dan `driver_earning` ikut terkirim ke penumpang.**
  `GET /api/orders` men-serialize `models.Order` utuh tanpa membedakan role.
  Jangan menampilkannya di layar penumpang, tetapi sadari bahwa menyaringnya
  di app tidak menutup apa pun — datanya sudah sampai di perangkat. Perbaikan
  sungguhan harus di backend berupa DTO terpisah per role.
- **Reconnect WebSocket wajib idempoten.** Backend hanya mengizinkan satu
  koneksi per user dan menutup yang lama; reconnect yang agresif tanpa backoff
  akan membuat app saling menutup koneksinya sendiri.
- **Background location driver** perlu izin runtime Android
  (`ACCESS_BACKGROUND_LOCATION`) dan foreground service. Tanpa itu,
  `location_update` berhenti begitu app di-background, dan driver hilang dari
  indeks matching meski `is_online = true`.
- **Estimasi tarif bukan harga akhir.** Tampilkan sebagai perkiraan; tarif
  final dari response `POST /api/orders`.

---

## 11. Dashboard Admin

### 11.1 Menu mengikuti permission, bukan nama role

Menu sidebar dirender dari daftar permission yang dimiliki akun login, bukan
dari pemetaan role→menu yang di-hardcode. `SeedRoles` disinkronkan ulang setiap
server start, jadi pemetaan yang di-hardcode di frontend akan tidak sinkron
begitu permission sebuah role berubah, dan memaksa deploy ulang frontend
untuk perubahan yang sebenarnya hanya di backend.

Frontend menyembunyikan menu untuk kenyamanan, bukan sebagai mekanisme
keamanan — server tetap sumber kebenaran dan membalas 403 untuk endpoint yang
tidak diizinkan.

Perlu dicatat: `GET /api/user` **belum** mengembalikan daftar permission
(lihat bagian 16), jadi sampai field itu ada, dashboard terpaksa memetakan
role→menu di sisi klien. Simpan pemetaan itu di satu berkas terpisah supaya
gampang dibuang begitu backend mengirimkan `permissions`.

### 11.2 Peta menu ⇄ permission ⇄ endpoint

| Menu | Permission | Endpoint |
|---|---|---|
| Daftar order | `orders.view` | `GET /api/admin/orders` |
| Batalkan order | `orders.cancel_any` | `PUT /api/admin/orders/:uuid/cancel` |
| Paksa selesai | `orders.force_complete` | `PUT /api/admin/orders/:uuid/force-complete` |
| Laporan keuangan | `finance.view_report` | `GET /api/admin/finance/report` |
| Daftar penarikan | `finance.view_report` | `GET /api/admin/finance/withdrawals` |
| Cairkan / tolak penarikan | `finance.disbursement` | `PUT /api/admin/finance/withdrawals/:id/disburse`, `.../reject` |
| Refund | `finance.refund` | `POST /api/admin/finance/refunds` |
| Daftar driver | `drivers.view` | `GET /api/admin/drivers` |
| Tinjau KYC | `drivers.view` | `GET /api/admin/drivers/:id/kyc` |
| Verifikasi / tolak KYC | `drivers.verify` | `PUT /api/admin/drivers/:id/verify`, `.../reject-kyc` |
| Suspend / reaktivasi | `drivers.suspend` | `PUT /api/admin/drivers/:id/suspend`, `.../reactivate` |
| Bonus driver | `drivers.bonus` | `POST /api/admin/drivers/:id/bonus` |
| Merchant | `merchants.view` / `.approve` / `.suspend` | `GET/PUT /api/admin/merchants...` |
| User | `users.view` / `users.manage` | `GET/PUT/POST/DELETE /api/admin/users...` |
| Pengaturan tarif & matching | `settings.manage` | `GET /api/admin/settings`, `PUT /api/admin/settings/:key` |
| Promo | `promo.manage` | `GET/POST/PUT/DELETE /api/admin/promos...` |
| Laporan | `reports.view` / `reports.sales` | `GET /api/admin/reports/...` |

### 11.3 Status kesiapan per halaman

| Halaman | Status | Catatan |
|---|---|---|
| Dashboard ringkasan | siap | perlu konfirmasi bentuk response `GET /api/admin/reports/dashboard` sebelum desain widget |
| Manajemen order | siap | list, cancel, force-complete lengkap |
| Manajemen driver | siap | modul paling lengkap: view, KYC, verify, suspend, bonus |
| Manajemen merchant | siap | approval jalan; performa/order merchant terbatas sampai modul GoFood ada |
| Manajemen user | sebagian | belum ada endpoint riwayat order per passenger untuk CS |
| Keuangan (manual) | siap | disburse & reject jalan untuk alur manual |
| Settlement otomatis | belum | disbursement belum terhubung API transfer bank |
| Pengaturan | siap | mencakup seluruh kunci `fare.*` dan `matching.*` |
| Promo | siap | CRUD siap; promo sudah tersambung ke `CreateOrder`, jadi `GET /api/admin/promos/:id/usage` terisi dari `promo_usages` sungguhan |
| Laporan | siap | dashboard, top driver, sales |
| Live driver map | belum | posisi ada di Redis GEO tapi belum diekspos lewat endpoint admin |
| Kelola permission per role | belum | perubahan permission masih lewat `SeedRoles` di kode |

### 11.4 Endpoint tambahan yang diperlukan dashboard

```
GET /api/admin/drivers/live-locations     (permission drivers.view)
```
Snapshot posisi driver online untuk peta admin — datanya sudah ada di indeks
geospasial Redis yang dipakai `MatchingWorker`, hanya belum diekspos. Untuk
update realtime, pertimbangkan event WS khusus admin; polling beberapa detik
cukup untuk versi pertama.

```
GET /api/admin/users/:id/orders           (permission users.view)
```
Riwayat order per passenger untuk CS yang menangani komplain.

```
GET /api/user → tambah field "permissions": ["orders.view", ...]
```
Diperlukan supaya menu dinamis (11.1) bisa dirender tanpa hardcode.

### 11.5 Urutan pengerjaan per role

| Urutan | Role | Modul | Alasan |
|---|---|---|---|
| 1 | `admin.ops_manager` | Order, Driver, Live Map | operasional harian, dampak langsung ke layanan aktif |
| 2 | `admin.driver_manager` | Driver (verify, suspend, bonus) | onboarding driver harus jalan sebelum volume order besar |
| 3 | `admin.finance_head`, `admin.finance_staff` | Keuangan, Withdrawal | uang jalan sejak hari pertama |
| 4 | `admin.cs` | User, riwayat order | butuh endpoint 11.4 dulu |
| 5 | `admin.sales_head` | Laporan, Promo | keduanya sudah jalan; tinggal antarmukanya |
| 6 | `admin.superadmin` | semua modul | otomatis lengkap begitu modul lain selesai |

---

## 12. Roadmap Produk

| Fase | Isi | Status backend |
|---|---|---|
| 1 — MVP | login, home map, estimasi, order, tracking, riwayat, profil; driver online/offline, terima/tolak, navigasi, pendapatan | siap |
| 2 — Realtime | WebSocket, driver location, ride status, chat, notifikasi | siap; notifikasi tersimpan di tabel + dikirim lewat WebSocket, yang belum ada hanya push FCM/APNs |
| 3 — Wallet | top up, bayar, refund, saldo, bonus, withdraw, komisi, settlement | siap; settlement masih manual |
| 4 — Pembayaran | cash, QRIS, e-wallet, transfer bank, voucher & promo | cash & wallet siap; kanal lain lewat Midtrans Snap |
| 5 — Admin dashboard | dashboard, driver, passenger, ride, tarif, promo, laporan, live driver | siap kecuali live driver map & RBAC UI |
| 6 — Skalabilitas | Nginx LB, multi Go server, Redis, PostgreSQL, monitoring | belum |
| 7 — Fitur lanjutan | GoFood, GoSend, multi-stop, scheduled ride, referral, loyalty, SOS, dynamic pricing | rating, chat, katalog produk merchant, dan unggah berkas siap; keranjang & alur pesan makanan belum |

---

## 13. Perintah yang Sering Dipakai

```bash
cp .env.example .env      # lalu isi nilainya
go build ./...
go run ./cmd/api

go vet ./...
go test ./...
```

Test integrasi membaca DSN dari `TEST_DATABASE_URL`; bila kosong, test tersebut
di-skip sehingga `go test ./...` tetap jalan tanpa database. Kredensial tidak
pernah ditulis di dalam kode.

```bash
export TEST_DATABASE_URL="host=localhost user=postgres password=... dbname=testing port=5432 sslmode=disable"
go test ./internal/handlers/ -v
```

---

## 14. Konfigurasi

Semua nilai dibaca dari environment (lihat `.env.example`).

Wajib — server menolak start bila kosong:

- `DATABASE_URL`
- `JWT_SECRET` — minimal 32 karakter acak (`openssl rand -hex 32`)
- `MIDTRANS_SERVER_KEY` — wajib saat `MIDTRANS_IS_PRODUCTION=true`

Opsional: `PORT`, `REDIS_URL`, `REDIS_PASSWORD`, `RABBITMQ_URL`,
`ALLOWED_WS_ORIGINS`, `MIDTRANS_CLIENT_KEY`.

Tidak ada nilai default untuk rahasia. Konfigurasi yang belum lengkap
dilaporkan sekaligus lalu proses berhenti. Bila `MIDTRANS_SERVER_KEY` kosong
pada mode non-production, top up berjalan dalam mode simulasi: transaksi
langsung diselesaikan tanpa pembayaran nyata.

Saat menerima SIGINT atau SIGTERM, server berhenti menerima koneksi baru,
menyelesaikan permintaan yang berjalan (batas 15 detik), lalu menutup hub,
RabbitMQ, Redis, dan koneksi database. `GET /health` tersedia untuk health
check.

---

## 15. Pengujian

Angka cakupan tidak dicantumkan di sini karena cepat basi; ukur saat dibutuhkan
dengan `go test ./internal/... -cover`.

| Berkas | Yang diuji |
|---|---|
| `register_test.go`, `login_test.go` | registrasi, login, refresh token |
| `protected_test.go`, `server_test.go` | penjagaan JWT, 404, 405 |
| `role_test.go` | RBAC per role, penambahan & perpindahan role, penolakan self-assign role admin |
| `order_test.go`, `order_reject_test.go` | siklus order lengkap sampai pembagian tarif, penolakan order |
| `fare_estimate_test.go` | estimasi tarif |
| `promo_test.go` | validasi & penerapan promo |
| `driver_status_test.go` | online/offline driver |
| `wallet_test.go`, `webhook_test.go` | deposit, idempotensi settlement, penolakan webhook tanpa verifikasi tanda tangan |
| `chat_test.go` | pengiriman & riwayat pesan, jendela chat tertutup setelah order berakhir sementara riwayat tetap terbaca, penolakan orang luar |
| `upload_test.go` | unggah PNG, batas ukuran, penolakan jenis dari isi berkas, pencegahan path traversal |
| `product_test.go`, `merchant_product_test.go` | katalog publik, CRUD produk merchant beserta kepemilikannya |
| `product_ranking_test.go` | skor peringkat katalog, kuota eksplorasi, penonaktifan eksplorasi saat difilter (bagian 17) |
| `notification_test.go` | daftar notifikasi, hitung belum dibaca, tandai dibaca |
| `driver_kyc_test.go` | mesin status KYC dari pengajuan sampai persetujuan |
| `withdraw_kyc_test.go` | penarikan driver terikat rekening KYC |
| `history_test.go` | riwayat per peran beserta ringkasannya |
| `api_coverage_test.go` | seluruh route terdaftar, 401 tanpa token, 403 lintas role, batas pagination |
| `matching_worker_test.go`, `presence_worker_test.go` | pencocokan driver, penurunan status online otomatis |

`api_coverage_test.go` menguji router secara menyeluruh, bukan logika tiap
handler: seluruh route wajib terdaftar (menangkap endpoint hilang saat wiring
diubah), setiap endpoint terlindungi membalas 401 tanpa token, endpoint
back-office membalas 403 untuk pengguna biasa, batas permission per role admin
dijaga sinkron dengan `SeedRoles`, akun yang dinonaktifkan langsung kehilangan
akses dengan token yang masih beredar, dan batas pagination dipaksakan server
meski klien meminta `per_page` besar.

---

## 16. Yang Belum Dikerjakan

- **Unggah berkas sudah ada, tetapi KYC belum memakainya.** `POST /api/uploads`
  menerima multipart, menentukan jenis dari isi berkas (bukan dari nama atau
  Content-Type), membuang nama berkas kiriman klien, dan menyajikan hasilnya
  lewat `GET /uploads/*filepath`. Yang belum: `POST /api/driver/kyc` masih
  menerima URL apa adanya — server hanya memeriksa bentuk URL-nya, tidak
  memastikan berkasnya berasal dari endpoint unggah ini atau milik pengajunya.
  Selama itu belum ditutup, peninjau harus menganggap URL KYC sebagai masukan
  yang tidak tepercaya.
- **Modul pesan-antar makanan belum lengkap.** Katalog produk sudah ada
  (`GET /api/products`, CRUD merchant di `/api/merchant/products`) dan order
  bisa tertaut ke merchant lewat `merchant_id`, sehingga riwayat dan omzet
  merchant sudah terhitung. Yang belum: keranjang, alur pemesanan makanan, dan
  penugasan driver untuk pengantaran makanan.
- **Disbursement masih manual**, belum terhubung ke API transfer bank. Kolom
  `bank_name`, `bank_account_number`, `bank_account_name` pada transaksi sudah
  menyiapkan bentuk data yang diperlukan.
- **Customer dan merchant belum punya proses KYC**, sehingga penarikan keduanya
  masih memakai rekening dari body permintaan.
- **Push notification lewat FCM/APNs belum ada.** Notifikasi sudah tersimpan di
  tabel `notifications` dan dikirim lewat WebSocket, jadi `GET /api/notifications`
  menyusul yang terlewat saat aplikasi dibuka kembali. Yang tidak ada adalah
  pengiriman ke perangkat dengan aplikasi tertutup — driver yang app-nya mati
  tetap tidak menerima tawaran order.
- **Live driver map dan RBAC UI** untuk dashboard admin butuh endpoint baru
  (bagian 11.4).
- **`GET /api/user` belum mengembalikan `permissions` dan `is_online`.**
  Response saat ini hanya memuat `id`, `name`, `email`, `phone`, `is_active`,
  `is_verified`, `balance`, `active_role`, `available_roles`. Akibatnya menu
  dinamis dashboard admin masih harus memetakan role→menu di sisi klien, dan
  aplikasi driver tidak bisa memulihkan tampilan tombol online/offline setelah
  aplikasi dibuka ulang tanpa memanggil endpoint lain.
- **Kelola permission per role belum ada endpointnya** — perubahan pemetaan
  masih lewat `models.SeedRoles` di kode lalu deploy ulang. Isi pemetaannya
  sendiri sudah dirinci pada bagian 2.
- **Perubahan permission tidak mencabut token yang sudah beredar.** Klaim role
  ada di dalam access token, jadi `RequireRole` mempercayainya sampai token
  kedaluwarsa. Yang memuat ulang dari database hanya `RequirePermission` dan
  `LoadUser`, sehingga penonaktifan akun berlaku seketika pada endpoint admin
  tetapi tidak pada penjaga yang hanya memeriksa role.

---

## 17. Peringkat Katalog Produk

`GET /api/products` tidak mengembalikan urutan menurut waktu buat. Urutannya
disusun `internal/handlers/product_handler.go` dari skor gabungan, lalu
disisipi kuota eksplorasi. Klien harus menampilkan urutan apa adanya —
mengurutkan ulang di aplikasi membuang seluruh mekanisme ini.

### 17.1 Skor

Jendela statistik **30 hari** (`rankWindowDays`), dihitung dari tabel
`product_events` lewat sub-query, bukan dari kolom kumulatif `view_count` /
`order_count` — kolom itu tidak pernah lupa, jadi produk yang laku dua tahun
lalu akan selamanya menindih produk yang laku minggu ini.

```
score = 0,5 × norm(order_30d)
      + 0,3 × norm(view_30d)
      + 0,2 × (rating / 5)
```

`norm` adalah normalisasi min-maks **atas kandidat permintaan itu sendiri**,
bukan atas seluruh tabel: seratus pesanan adalah angka besar di katalog kecil
dan angka biasa di katalog besar. Produk tanpa rating diberi nilai tengah
**3,0** (`rankNeutralRating`), bukan 0 — nol akan menghukum produk baru karena
belum sempat dinilai, padahal itu justru yang ingin diberi kesempatan.

Pesanan diberi bobot terbesar karena itu satu-satunya sinyal yang menuntut
pembeli mengeluarkan uang; penayangan mudah dinaikkan tanpa niat membeli.

### 17.2 Kuota eksplorasi

Sebuah produk masuk kelompok "sepi" bila penayangan 30 harinya di bawah **10**
(`rankQuietViewThreshold`) **atau** dibuat kurang dari **14 hari** lalu
(`rankFreshDays`). Kelompok itu diacak, lalu disisipkan ke dalam urutan
berbasis skor.

Kuotanya **ikut ukuran halaman**, bukan angka tetap:

```
explorationPerPage = rankExplorationSlots × per_page / rankPageSlots
                   = 6 × per_page / 20
```

dengan lantai 1 selama masih ada produk sepi. Pada `per_page=20` berarti 14
slot berbasis skor dan 6 slot eksplorasi; pada `per_page=5` menjadi 4 dan 1.
Bila salah satu kelompok habis, sisa halaman diisi dari kelompok yang lain —
halaman tidak pernah lebih pendek hanya karena kuotanya tidak terpenuhi.

Benih pengacakan adalah **tanggal saja** (`time.Now().Format("2006-01-02")`
di-hash FNV-64a), bukan tanggal digabung nomor halaman dan bukan jam. Akibatnya
urutan produk sepi tetap sama sepanjang hari — pengguna yang menggulir naik lalu
turun tidak kehilangan tempatnya — dan berganti keesokan harinya. Pemotongan
halaman dilakukan **setelah** urutan lengkap disusun, sehingga tidak ada produk
yang muncul di dua halaman sekaligus atau hilang di antaranya.

### 17.3 Eksplorasi dimatikan saat difilter

Mengisi `q`, `category`, atau `merchant_id` mematikan kuota eksplorasi; hasilnya
murni urut skor. Orang yang mengetik nama produk sedang mencari sesuatu yang
spesifik, bukan menjelajah. `meta.exploration_enabled` memberitahu klien mana
yang sedang berlaku.

### 17.4 Bentuk response

```json
{
  "products": [
    {
      "id": 7, "name": "...", "price": 15000,
      "merchant_name": "Warung Bu Sri", "merchant_open": true,
      "view_count_30d": 42, "order_count_30d": 9,
      "score": 0.78, "is_exploration": false
    }
  ],
  "meta": {
    "page": 1, "per_page": 20, "total": 137,
    "ranking_window_days": 30,
    "exploration_enabled": true
  }
}
```

`score` dan `is_exploration` dihitung per permintaan dan tidak tersimpan di
database (`gorm:"-"`). Merchant yang sedang **tutup tidak disembunyikan**, hanya
ditandai `merchant_open: false` — menyembunyikannya membuat katalog berkedip
mengikuti jam buka dan pembeli kehilangan cara menemukan warung yang dicarinya
di luar jam operasional.

`GET /api/products/:id` mencatat satu penayangan setiap kali dibuka, dan
kegagalan pencatatan itu sengaja diabaikan supaya halaman detail tidak ikut
gagal. Produk yang `is_available = false` atau milik merchant tidak aktif
dibalas **404**, bukan 403 — keberadaannya tidak dibocorkan.

Konsekuensi untuk klien: **jangan cache daftar ini lebih dari sehari**, dan
jangan anggap urutan yang berubah esok hari sebagai bug.
