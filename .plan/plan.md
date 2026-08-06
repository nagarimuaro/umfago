# Plan: Notifications, Merchant Products, Fair Ranking, Chat Cutoff, File Upload

## 1. Models

### 1.1 Notification table
```go
// internal/models/notification.go
type Notification struct {
    gorm.Model
    UserID uint   `gorm:"not null;index"`
    Type   string `gorm:"type:varchar(50);not null;index"` // order_accepted, driver_arrived, trip_completed, etc.
    Title  string `gorm:"type:varchar(200);not null"`
    Body   string `gorm:"type:text;not null"`
    Data   string `gorm:"type:jsonb"` // JSON payload for click handling
    ReadAt *time.Time
}
```

### 1.2 Product table
```go
// internal/models/product.go
type Product struct {
    gorm.Model
    MerchantID  uint    `gorm:"not null;index"`
    Name        string  `gorm:"type:varchar(200);not null"`
    Description string  `gorm:"type:text"`
    Price       float64 `gorm:"not null"`
    ImageURL    string  `gorm:"type:varchar(500)"` // from upload endpoint
    IsAvailable bool    `gorm:"default:true;index"`
    // Ranking counters
    ViewCount30d  int `gorm:"default:0;index"` // rolling 30-day window
    OrderCount30d int `gorm:"default:0;index"`
    // Rating fields
    RatingSum   float64 `gorm:"default:0"`
    RatingCount int     `gorm:"default:0"`
    AvgRating   float64 `gorm:"default:0;index"` // denormalized for ranking
    // Time-decay tracking
    LastViewedAt  *time.Time
    LastOrderedAt *time.Time
    
    Merchant *MerchantProfile `gorm:"foreignKey:MerchantID"`
}
```

Counters akan di-update lewat `UPDATE products SET view_count_30d = view_count_30d + 1` tanpa read-modify-write, sehingga concurrent increment aman.

### 1.3 ProductView tracking
```go
// internal/models/product_view.go
type ProductView struct {
    ID        uint      `gorm:"primaryKey"`
    ProductID uint      `gorm:"not null;index:idx_product_viewed"`
    ViewedAt  time.Time `gorm:"not null;index:idx_product_viewed"`
}
```

Index composite `(product_id, viewed_at)` untuk sapuan time-decay cepat.

## 2. Endpoints

### 2.1 Notifications
- `GET /api/notifications?unread=true&page=&per_page=` — list notifikasi, filter `unread` opsional
- `PUT /api/notifications/:id/read` — tandai satu notifikasi dibaca
- `PUT /api/notifications/read-all` — tandai semua milik user dibaca
- `GET /api/notifications/unread-count` — jumlah notifikasi belum dibaca

Protected, JWTAuth + LoadUser. Scope: `user_id = current_user.id`.

### 2.2 Product listing (customer)
- `GET /api/products?page=&per_page=&merchant_id=` — list produk, ranked fair
- `GET /api/products/:id` — detail produk + merchant info

Protected, terbuka untuk role apa saja. Detail endpoint mencatat view (increment `view_count_30d`, insert `ProductView`).

### 2.3 Product CRUD (merchant)
- `POST /api/merchant/products` — buat produk baru
- `GET /api/merchant/products` — list produk milik merchant ini
- `GET /api/merchant/products/:id` — detail produk milik merchant ini
- `PUT /api/merchant/products/:id` — update produk
- `DELETE /api/merchant/products/:id` — soft delete

Scope: `merchant_id` dari `MerchantProfile.UserID = current_user.id`. Permission: `RequireRole(models.RoleMerchant)`.

### 2.4 File upload
- `POST /api/uploads` — terima multipart file, simpan ke disk lokal (misalnya `uploads/<uuid>.<ext>`), return `{"url": "/uploads/<uuid>.<ext>"}`.

Protected. Validasi: ekstensi image (jpg/jpeg/png/webp), size limit (misalnya 5MB). Serve lewat `GET /uploads/:filename` dengan `http.ServeFile`.

### 2.5 Chat cutoff
Ubah `POST /api/orders/:uuid/chat` (SendMessage di `chat_handler.go:25`):
- Guard baru setelah cek kepemilikan order (line 58): bila `order.Status` adalah `completed` atau `cancelled`, return 409 `{"error": "Chat is closed for this order"}`.
- `GET /api/orders/:uuid/chat` (GetHistory line 95): tambahkan field `chat_closed: bool` di response, dihitung dari status order.

## 3. Ranking Algorithm

Score gabungan + kuota eksplorasi:
```
score = 0.5*norm(order_30d) + 0.3*norm(view_30d) + 0.2*norm(rating)
```
Normalisasi min-max per batch. Time decay: `view_count_30d` dan `order_count_30d` disapu periodik, kurangi entri `ProductView` dan order lebih dari 30 hari yang lalu.

20 slot per page:
- 14 slot: top-14 by score, deterministik
- 6 slot: produk dengan `view_count_30d < threshold` atau baru (misal `created_at` < 7 hari), shuffle dengan seed `date(now) + page`, deterministik per hari

Filter `is_available = true` dan `merchant_profiles.is_active = true` serta `is_open = true` (merchant tutup → produknya tidak muncul).

Implementasi di `internal/handlers/product_handler.go`, gunakan raw SQL atau subquery GORM untuk skor, lalu gabung dengan Go slice.

## 4. WebSocket notification

Event baru di `internal/websocket/hub.go`:
```go
const (
    WS_Notification = "notification"
)
```

Helper di repository atau handler notifikasi:
```go
func (r *NotificationRepository) CreateAndPush(db, hub, userID, typ, title, body, data) {
    notif := models.Notification{...}
    db.Create(&notif)
    if hub != nil {
        payload, _ := json.Marshal(notif)
        hub.SendToUser(userID, ws.Message{Type: "notification", Payload: payload})
    }
}
```

Tempat memanggil:
- Order diterima driver → push ke customer
- Driver tiba → push ke customer
- Trip selesai → push ke customer dan driver
- Order dibatalkan → push ke customer dan driver
- (Opsional) Order baru dari merchant → push ke merchant

## 5. Checklist mekanis

1. **AutoMigrate** di `internal/server/server.go:58-76`: tambah `&models.Notification{}`, `&models.Product{}`, `&models.ProductView{}`.
2. **AutoMigrate** di `internal/testutil/db.go:87-103`: tambah ketiganya.
3. **cleanupTables** di `internal/testutil/db.go:169-188`: tambah ketiganya (urutan: ProductView, Product, Notification — FK di depan).
4. **Route list** di `internal/handlers/api_coverage_test.go:792-866`: tambah 12 route baru (4 notif, 2 produk customer, 5 produk merchant, 1 upload).
5. **Permission** (bila admin butuh lihat produk merchant): tidak perlu permission baru, `merchants.view` sudah cukup. Bila perlu CRUD produk dari admin, buat `PermProductsManage` di `internal/models/role.go:38-71` + `AllPermissions:193-213` + assign ke role yang tepat di `SeedRoles:138-190`.
6. **CLAUDE.md**:
   - §8: route list tambah 12 route.
   - §9: kontrak API untuk notifikasi, produk, chat cutoff (409), upload.
   - §10.7: mobile pitfall tambah 2-3 poin (chat putus setelah order selesai, ranking fair deterministik per hari, upload endpoint butuh multipart).
   - §11: dashboard admin tambah halaman produk merchant (bila ada).
   - §16: hapus baris "Penyimpanan berkas belum ada" (sebagian diselesaikan upload endpoint) dan "Push notification belum ada" (diganti notifikasi tabel + WS).

## 6. Test strategy

- **Notification**: buat notifikasi, cek field, cek filter unread, tandai dibaca, cek unread_count.
- **Product CRUD**: merchant buat produk, list hanya miliknya, update, delete. Customer list produk (paginasi), detail produk increment counter.
- **Ranking**: seed 30 produk dengan counter berbeda, panggil list 2x dengan page berbeda, pastikan 6 slot exploration berbeda per page tapi tetap di hari yang sama.
- **Chat cutoff**: buat order, terima driver, kirim chat (200), selesaikan order, kirim chat lagi (409), baca history (200 dengan `chat_closed: true`).
- **Upload**: POST file valid (200, dapat URL), GET URL (200 serve file), POST file terlalu besar atau ekstensi salah (422).

Fokus: fitur jalan, edge case di-guard, bukan cakupan lengkap setiap alur.

## 7. Estimasi kerja

1. Models + AutoMigrate (3 tempat) + cleanupTables: **15 menit**
2. Notification handler + endpoints (4): **30 menit**
3. Product handler merchant (5 endpoint): **40 menit**
4. Product handler customer (2 endpoint) + ranking logic: **60 menit**
5. Upload handler + serve: **20 menit**
6. Chat cutoff guard (1 line + response field): **10 menit**
7. WebSocket push di order transitions: **20 menit**
8. Route wiring di `server.go` + `api_coverage_test.go`: **15 menit**
9. Test per modul (notifikasi, produk, ranking, chat, upload): **60 menit**
10. CLAUDE.md update (§8, §9, §10.7, §11, §16): **30 menit**

Total: ~5 jam kerja serial. Paralel dengan test sambil jalan bisa 3-4 jam.

## 8. Risk & Tradeoff

- **Ranking fair deterministik per hari**: slot eksplorasi shuffle dengan seed hari ini, jadi user berbeda di hari yang sama lihat urutan eksplorasi yang sama. Tradeoff: sederhana vs personalisasi. Dipilih karena user minta "adil" (bukan personalisasi).
- **Time decay manual sweep**: `view_count_30d` dan `order_count_30d` tidak otomatis turun seiring waktu. Perlu worker berkala (misalnya harian) yang hapus `ProductView` > 30 hari dan recalculate counter dari `COUNT(*)`. Tanpa itu, counter tetap tinggi selamanya. Bisa ditambahkan nanti dengan `PresenceWorker` style.
- **Upload local disk**: tidak pakai cloud storage. File upload hilang saat server diganti atau disk penuh. Produksi butuh S3/GCS, tapi untuk MVP cukup lokal.
- **Chat history tetap terbuka**: customer bisa screenshot chat untuk komplain ke CS. Tanpa ini, percakapan hilang begitu order selesai dan CS tidak punya bukti.
- **Notification table tanpa TTL**: notifikasi lama tidak otomatis terhapus. Bila akumulasi jadi masalah, tambahkan soft delete atau hard delete > 90 hari.

Semua tradeoff sudah dikonfirmasi lewat AskUserQuestion — ini pilihan user, bukan asumsi saya.
