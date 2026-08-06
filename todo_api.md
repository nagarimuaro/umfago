# OpenJek — Spesifikasi API Baru (Prioritas 0 & 1)

Dokumen ini merinci endpoint baru yang perlu dibuat di backend, mengikuti pola
yang sudah dipakai di kode (Gin, GORM, JWT, RBAC berbasis permission, response
JSON konsisten). Setiap endpoint punya: role/permission yang boleh akses,
request, response sukses, response error, dan catatan implementasi yang
menyambung ke perilaku yang sudah ada (row locking, idempotensi, dsb).

Konvensi umum yang dipakai di seluruh dokumen ini (mengikuti pola backend
yang sudah ada):
- Semua endpoint di bawah butuh header `Authorization: Bearer <access_token>`
  kecuali disebutkan lain.
- Semua endpoint list pakai pagination dengan default `page=1&limit=20`, batas
  maksimum `limit=100` (konsisten dengan endpoint list yang sudah ada).
- Format error konsisten: `{ "error": "kode_error", "message": "pesan untuk ditampilkan" }`.
- Field waktu dalam format ISO 8601 UTC.

---

## PRIORITAS 0 — Blocker MVP

### 1. Riwayat Order Milik Sendiri

```
GET /api/orders
```

**Akses:** siapa saja yang login (customer, driver_motorcycle, driver_car,
merchant) — tanpa permission admin. Data yang dikembalikan **hanya milik user
yang sedang login**, difilter dari klaim JWT (`user_id`), bukan dari parameter
yang bisa dimanipulasi client.

**Query params:**
| Param | Wajib | Keterangan |
|---|---|---|
| `status` | tidak | filter salah satu: `pending`, `accepted`, `arrived`, `in_progress`, `completed`, `cancelled` |
| `page` | tidak | default 1 |
| `limit` | tidak | default 20, maks 100 |
| `from`, `to` | tidak | filter rentang tanggal `created_at`, format `YYYY-MM-DD` |

**Perilaku berbeda per role aktif:**
- Role `customer` → order yang dia buat sebagai penumpang
- Role `driver_motorcycle` / `driver_car` → order yang dia kerjakan sebagai driver
- Karena role aktif menentukan konteks, endpoint yang sama otomatis menampilkan
  data yang relevan tanpa parameter tambahan — konsisten dengan prinsip "role
  aktif menentukan otorisasi" yang sudah dipakai di seluruh sistem.

**Response 200:**
```json
{
  "data": [
    {
      "uuid": "a1b2c3d4-...",
      "status": "completed",
      "vehicle_type": "motorcycle",
      "pickup": { "lat": -0.2192, "lng": 100.6339, "address": "Jl. Sudirman No. 1" },
      "destination": { "lat": -0.2250, "lng": 100.6400, "address": "Jl. Veteran No. 5" },
      "fare": 15000,
      "platform_fee": 1500,
      "driver_earning": 13500,
      "payment_method": "wallet",
      "rating": 5,
      "created_at": "2026-08-01T08:12:00Z",
      "completed_at": "2026-08-01T08:34:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 47, "total_pages": 3 }
}
```

**Response error:**
- `401 unauthorized` — token tidak valid/kedaluwarsa
- `400 invalid_status_filter` — nilai `status` di luar enum yang sah

**Catatan implementasi:**
- Field `driver_earning`/`platform_fee` sebaiknya **hanya muncul** kalau role
  aktif adalah driver terkait, jangan bocor ke passenger — pertimbangkan dua
  DTO berbeda, bukan satu struct yang difilter di frontend.
- Query wajib pakai index pada `(customer_id, created_at)` dan
  `(driver_id, created_at)` supaya tidak full-scan seiring data order membesar.

---

### 2. Status Online/Offline Driver

```
PUT /api/drivers/status
```

**Akses:** role aktif harus `driver_motorcycle` atau `driver_car`. Driver yang
belum terverifikasi (`is_verified = false`) ditolak — supaya konsisten dengan
aturan matching yang sudah ada, driver belum terverifikasi memang tidak boleh
menerima order dalam kondisi apa pun.

**Request:**
```json
{ "status": "online" }
```
Nilai sah: `"online"`, `"offline"`.

**Response 200:**
```json
{ "status": "online", "updated_at": "2026-08-05T09:00:00Z" }
```

**Response error:**
- `403 driver_not_verified` — akun belum diverifikasi admin
- `403 order_in_progress` — **tidak boleh set offline** kalau masih ada order
  aktif (`accepted`/`arrived`/`in_progress`) yang menempel ke driver ini,
  supaya penumpang tidak ditinggal di tengah jalan. Driver harus selesaikan
  atau order dibatalkan dulu baru bisa offline.
- `400 invalid_status` — nilai selain online/offline

**Catatan implementasi (perubahan skema & alur):**
- Tambah kolom `is_online boolean default false` dan `online_since timestamptz`
  pada tabel driver profile (atau tabel terpisah `driver_status` kalau mau
  dipisah dari data identitas driver).
- **`MatchingWorker` wajib diubah** untuk menyaring `is_online = true` selain
  syarat yang sudah ada (role cocok `vehicle_type`, aktif, terverifikasi, tidak
  sedang mengantar order lain). Tanpa perubahan ini, endpoint baru cuma
  kosmetik dan tidak mempengaruhi siapa yang menerima order.
- Set otomatis `is_online = false` saat koneksi WebSocket driver terputus lebih
  dari beberapa menit (mis. app di-kill), supaya status tidak "nyangkut" online
  padahal app sudah mati — ini butuh hook di sisi hub WebSocket, bukan cuma
  endpoint REST-nya saja.
- Endpoint `GET /api/user` (atau endpoint profil driver) sebaiknya ikut
  mengembalikan `is_online` supaya app tahu state saat ini setelah reconnect.

---

## PRIORITAS 1 — Menutup Alur yang Setengah Jalan

### 3. Tolak Order (Driver)

```
PUT /api/orders/:uuid/reject
```

**Akses:** role aktif driver yang cocok, dan order tersebut sedang berstatus
`pending` serta memang ditawarkan ke driver ini (tercatat sebagai salah satu
kandidat oleh `MatchingWorker`).

**Request:** tanpa body, atau opsional:
```json
{ "reason": "terlalu_jauh" }
```

**Response 200:**
```json
{ "uuid": "a1b2c3d4-...", "status": "pending", "rejected_by_this_driver": true }
```
Status order **tidak berubah** (tetap `pending`) — reject dari satu driver
tidak membatalkan order, hanya menghapus driver ini dari daftar kandidat.

**Response error:**
- `404 order_not_found` — order tidak ada atau tidak ditawarkan ke driver ini
- `409 order_already_taken` — order sudah diambil driver lain lebih dulu, pakai
  pola update bersyarat yang sama seperti `accept` supaya konsisten
- `409 order_not_pending` — order sudah berubah status (mis. dibatalkan penumpang)

**Catatan implementasi:**
- Perlu tabel/cache kandidat per order (mis. Redis set `order:{uuid}:candidates`
  dengan TTL) supaya `MatchingWorker` tahu siapa saja yang sudah pernah
  ditawari & menolak, dan tidak menawarkan ulang ke driver yang sama.
- Setelah reject, `MatchingWorker` perlu trigger pencarian kandidat berikutnya
  untuk order yang sama — bukan pasif menunggu.
- Perlu juga **timeout otomatis**: kalau driver tidak accept/reject dalam N
  detik (nilai N sebaiknya jadi setting dinamis baru, mis.
  `matching.offer_timeout_seconds`), perlakukan sebagai reject implisit.

---

### 4. Estimasi Tarif

```
POST /api/fare/estimate
```

**Akses:** siapa saja yang login sebagai customer. Tidak butuh order dibuat
dulu.

**Request:**
```json
{
  "pickup": { "lat": -0.2192, "lng": 100.6339 },
  "destination": { "lat": -0.2250, "lng": 100.6400 },
  "vehicle_type": "motorcycle"
}
```

**Response 200:**
```json
{
  "distance_km": 3.4,
  "estimated_fare": 15000,
  "breakdown": {
    "base_price": 5000,
    "distance_price": 10000,
    "min_fare_applied": false
  },
  "valid_for_seconds": 120
}
```

**Response error:**
- `400 invalid_coordinates` — lat/lng di luar rentang sah
- `400 unsupported_vehicle_type` — selain `motorcycle`/`car`

**Catatan implementasi:**
- **Pakai ulang `pricing.Calculator` yang sudah ada** — endpoint ini cuma
  wrapper tipis yang memanggil kalkulator yang sama dipakai saat order
  dibuat, supaya angka estimasi dan angka final tidak pernah berbeda logic.
- `estimated_fare` sengaja tidak dikunci/di-cache sebagai harga final — kalau
  tarif dasar berubah (`fare.*` di dynamic settings) antara waktu estimasi dan
  order dibuat, tarif final tetap dihitung ulang saat `POST /api/orders`.
  Field `valid_for_seconds` cuma sinyal UX ("estimasi ini bisa berubah"), bukan
  jaminan harga.

---

### 5. Ringkasan Pendapatan Driver

```
GET /api/drivers/earnings
```

**Akses:** role aktif driver, data hanya milik driver yang login.

**Query params:**
| Param | Wajib | Keterangan |
|---|---|---|
| `period` | tidak | `daily` (default) atau `weekly` |
| `date` | tidak | tanggal acuan, default hari ini. Untuk `weekly`, minggu yang memuat tanggal ini |

**Response 200:**
```json
{
  "period": "daily",
  "date": "2026-08-05",
  "total_orders": 12,
  "gross_earning": 162000,
  "bonus": 20000,
  "net_earning": 182000,
  "orders": [
    { "uuid": "a1b2c3d4-...", "completed_at": "2026-08-05T08:34:00Z", "driver_earning": 13500 }
  ]
}
```

**Catatan implementasi:**
- `gross_earning` = jumlah `driver_earning` semua order `completed` pada
  periode tersebut. `bonus` diambil dari `wallet_transactions` bertipe bonus
  pada periode yang sama.
- Agregasi sebaiknya dihitung on-the-fly dari data yang sudah ada
  (`driver_earning` per order sudah tersimpan permanen sesuai desain yang
  ada), bukan tabel ringkasan terpisah — hindari data terduplikasi yang bisa
  tidak sinkron.

---

### 6. Riwayat Transaksi Wallet

```
GET /api/wallet/transactions
```

**Akses:** siapa saja yang login, data hanya milik user sendiri.

**Query params:** `page`, `limit`, dan opsional `type` (`topup`, `withdrawal`,
`payment`, `bonus`, `refund`, dst — sesuai tipe yang sudah dipakai di
`wallet_transactions`).

**Response 200:**
```json
{
  "data": [
    {
      "id": 1042,
      "type": "topup",
      "amount": 100000,
      "status": "pending",
      "balance_after": null,
      "created_at": "2026-08-05T07:00:00Z"
    },
    {
      "id": 1039,
      "type": "payment",
      "amount": -15000,
      "status": "completed",
      "balance_after": 85000,
      "created_at": "2026-08-04T10:12:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 58, "total_pages": 3 }
}
```

**Catatan implementasi:**
- `balance_after` sengaja `null` untuk transaksi yang masih `pending` (belum
  disettle) — jangan tampilkan angka seolah final padahal belum, konsisten
  dengan desain top up yang memang baru menambah saldo setelah verifikasi.
- Endpoint ini murni **read** dari tabel `wallet_transactions` yang sudah ada,
  tidak perlu perubahan skema.

---

### 7. Promo di Alur Order

**Opsi A — validasi terpisah sebelum order dibuat:**
```
POST /api/promos/validate
```
Request:
```json
{ "code": "HEMAT10", "vehicle_type": "motorcycle", "fare_before_discount": 15000 }
```
Response 200:
```json
{ "valid": true, "discount_amount": 1500, "final_fare": 13500 }
```
Response error: `404 promo_not_found`, `410 promo_expired`, `409 promo_usage_limit_reached`,
`400 promo_not_applicable` (mis. minimum tarif tidak terpenuhi, atau
`vehicle_type` tidak sesuai syarat promo).

**Opsi B — langsung disertakan saat order dibuat:**
```
POST /api/orders   → tambah field opsional "promo_code"
```
Kalau kode tidak valid, `POST /api/orders` gagal dengan error yang sama
seperti di atas — order **tidak boleh terlanjur dibuat** lalu promo gagal
diterapkan, sama seperti prinsip yang sudah dipakai untuk saldo wallet kurang
(gagal dibuat, bukan tercipta tanpa syarat terpenuhi).

**Rekomendasi:** buat **keduanya**. `POST /api/promos/validate` dipanggil app
saat user mengetik kode (real-time feedback sebelum konfirmasi order), lalu
`promo_code` yang sama dikirim ulang saat `POST /api/orders` sebagai validasi
final di server (client-side validation tidak pernah dipercaya sebagai
otorisasi harga akhir).

**Catatan implementasi:**
- Pencatatan pemakaian promo (disebut sudah ada di backend) perlu ditulis di
  transaksi yang sama dengan pembuatan order, supaya kalau order gagal dibuat,
  pemakaian promo juga ikut batal (atomicity, konsisten dengan pola transaksi
  yang sudah dipakai untuk potong saldo wallet).
- `discount_amount` ikut disimpan permanen di order (kolom baru, mis.
  `promo_discount`), sama seperti `platform_fee`/`driver_earning` yang dikunci
  saat itu juga — supaya perubahan aturan promo di kemudian hari tidak
  mengubah catatan order lama.

---

## Ringkasan Perubahan Skema Database yang Dibutuhkan

| Tabel | Perubahan |
|---|---|
| driver profile (atau tabel baru `driver_status`) | + `is_online boolean`, `online_since timestamptz` |
| `orders` | + `promo_code varchar nullable`, `promo_discount integer default 0` |
| `dynamic_settings` | + entri baru `matching.offer_timeout_seconds` |
| Redis | + struktur kandidat per order (`order:{uuid}:candidates`) untuk mendukung reject & timeout |

## Ringkasan Endpoint Baru

| # | Method & Path | Untuk |
|---|---|---|
| 1 | `GET /api/orders` | Riwayat order milik sendiri |
| 2 | `PUT /api/drivers/status` | Online/offline driver |
| 3 | `PUT /api/orders/:uuid/reject` | Tolak order (driver) |
| 4 | `POST /api/fare/estimate` | Estimasi tarif sebelum order |
| 5 | `GET /api/drivers/earnings` | Ringkasan pendapatan driver |
| 6 | `GET /api/wallet/transactions` | Riwayat transaksi wallet |
| 7a | `POST /api/promos/validate` | Cek promo sebelum order |
| 7b | `POST /api/orders` (field baru `promo_code`) | Terapkan promo saat order dibuat |