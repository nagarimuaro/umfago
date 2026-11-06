# Android Integration Plan — OpenJek

## 1. Pendahuluan

Dokumen ini adalah panduan integrasi untuk pengembangan aplikasi Android (React Native) pada platform OpenJek. Berbeda dengan pendekatan konvensional yang membangun tiga aplikasi terpisah (penumpang, driver, merchant), arsitektur OpenJek menggunakan **satu codebase** dengan tiga persona yang diaktifkan melalui mekanisme role aktif.

### 1.1 Prinsip Dasar

| Aspek | Penjelasan |
|---|---|
| Satu aplikasi, banyak peran | Satu instalasi APK berisi seluruh fitur penumpang, driver, dan merchant |
| Role aktif menentukan tampilan | Navigation stack berubah berdasarkan `active_role` dari `GET /api/user` |
| Multi-role dalam satu akun | Satu akun bisa memiliki `customer`, `driver_motorcycle`, `driver_car`, dan `merchant` sekaligus |
| Perpindahan role tanpa logout | Cukup panggil `PUT /api/users/active-role` untuk berganti mode |
| Backend sebagai sumber kebenaran | Otorisasi dihitung dari role aktif di server, bukan dari state lokal |

### 1.2 Stack Teknologi

| Kebutuhan | Pilihan | Alasan |
|---|---|---|
| Framework | React Native (bare, bukan Expo managed) | Native module untuk peta & background location |
| Bahasa | TypeScript | Kontrak API besar, tipe menangkap ketidakcocokan lebih awal |
| Navigasi | React Navigation 6.x | Stack berbeda per role aktif |
| Server state | TanStack Query v5 | Caching, retry, invalidasi setelah mutasi |
| Client state | Zustand | Ringan, cukup untuk auth & sesi order berjalan |
| Peta | MapLibre React Native + OpenStreetMap | Konsisten dengan roadmap, gratis, offline-capable |
| Routing & geocoding | Valhalla & Nominatim | Dipanggil dari app, bukan lewat backend |
| Penyimpanan token | react-native-keychain | Refresh token tidak boleh di AsyncStorage biasa |
| WebSocket | WebSocket bawaan + reconnect | Protokol pesan sudah ditentukan backend |
| Form | React Hook Form + Zod | Validasi KYC banyak field |
| Background location | react-native-background-geolocation | Untuk driver tetap terdeteksi saat app di background |

---

## 2. Autentikasi & Manajemen Token

### 2.1 Alur Login

```
┌─────────┐     ┌──────────┐     ┌────────────┐
│  User   │────▶│ /login   │────▶│  Backend   │
│  Input  │     │ POST     │     │            │
└─────────┘     └──────────┘     └────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │ access_token  │
                              │ refresh_token │
                              │ user          │
                              └───────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │ Simpan di     │
                              │ Keychain      │
                              └───────────────┘
```

### 2.2 Token Storage

| Token | Penyimpanan | Umur | Tujuan |
|---|---|---|---|
| `access_token` | Memory (state) | 15 menit | Autentikasi API & WebSocket |
| `refresh_token` | Keychain/Keystore | 30 hari | Mendapat access token baru |

### 2.3 Interceptor HTTP

Interceptor di `api/client.ts` menangani:

1. Tambahkan `Authorization: Bearer <access_token>` ke semua request `/api/*`
2. Tangkap response 401
3. Panggil `POST /api/refresh` dengan refresh token
4. Ulangi request yang gagal dengan token baru
5. Jika refresh gagal → logout user

**Peringatan:** Request paralel yang kena 401 harus **menunggu satu refresh**, tidak memicu beberapa refresh paralel. Token lama dicabut setiap kali dipakai, refresh paralel akan mencabut sesi user.

### 2.4 Switch Role

```
PUT /api/users/active-role
{ "role": "driver_motorcycle" }
```

Response:
```json
{
  "message": "Role switched to driver_motorcycle",
  "active_role": "driver_motorcycle",
  "access_token": "eyJ...",
  "expires_in": 900
}
```

Tindakan yang harus dilakukan setelah switch:
1. Ganti `access_token` di memory
2. Reset navigation stack ke stack yang sesuai dengan role baru
3. Invalidasi semua query TanStack Query
4. Tutup koneksi WebSocket lama (jika ada) dan buka yang baru dengan token baru

### 2.5 Logout

1. Hapus `access_token` dari memory
2. Hapus `refresh_token` dari Keychain
3. Tutup WebSocket
4. Navigasi ke layar login
5. (Opsional) Panggil `POST /api/logout` untuk mencabut refresh token di server

---

## 3. Manajemen Role & Pengguna

### 3.1 Endpoint

| Endpoint | Method | Tujuan |
|---|---|---|
| `/api/register` | POST | Registrasi akun baru |
| `/api/login` | POST | Login, dapatkan token |
| `/api/refresh` | POST | Refresh access token |
| `/api/logout` | POST | Logout, cabut refresh token |
| `/api/user` | GET | Dapatkan data user saat ini |
| `/api/users/roles` | POST | Tambah role ke akun |
| `/api/users/active-role` | PUT | Pindah role aktif |

### 3.2 Response `/api/user`

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  is_verified: boolean;
  balance: number;
  active_role: RoleCode;
  available_roles: RoleCode[];
}

type RoleCode = 
  | 'customer'
  | 'driver_motorcycle'
  | 'driver_car'
  | 'merchant'
  | 'admin.superadmin'
  | 'admin.finance_head'
  | 'admin.finance_staff'
  | 'admin.sales_head'
  | 'admin.cs'
  | 'admin.ops_manager'
  | 'admin.driver_manager';
```

### 3.3 Tambah Role

```
POST /api/users/roles
{ "role": "driver_motorcycle" }
```

Hanya role `customer`, `driver_motorcycle`, `driver_car`, `merchant` yang bisa diminta sendiri. Role admin hanya bisa diberikan oleh user dengan permission `users.manage`.

### 3.4 State Management (Zustand)

```typescript
// store/auth.ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  activeRole: RoleCode | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: RoleCode) => Promise<void>;
  refreshToken: () => Promise<string>;
}
```

---

## 4. Navigasi Berbasis Role

### 4.1 Struktur Navigasi

```
RootNavigator
├── AuthStack (login, register)
└── MainStack (bergantung active_role)
    ├── customer → PassengerStack
    ├── driver_motorcycle → DriverStack
    ├── driver_car → DriverStack
    ├── merchant → MerchantStack
    └── admin.* → AdminStack (dashboard terpisah)
```

### 4.2 PassengerStack

```
PassengerStack
├── Home (peta, cari tujuan)
├── Estimate (estimasi tarif)
├── ConfirmOrder (konfirmasi & promo)
├── Tracking (live tracking order)
├── History (riwayat order)
├── OrderDetail (detail order + rating)
├── Wallet (saldo, top up, history)
└── Profile (profil user)
```

### 4.3 DriverStack

```
DriverStack
├── Home (online/offline, status)
├── KYC (pengajuan verifikasi)
├── IncomingOrder (tawaran order masuk)
├── Navigation (navigasi ke tujuan)
├── RideStatus (status perjalanan)
├── History (riwayat order)
├── Earnings (pendapatan)
├── Wallet (saldo, penarikan)
└── Profile (profil driver)
```

### 4.4 MerchantStack

```
MerchantStack
├── Home (dashboard penjualan)
├── Products (katalog produk)
├── ProductForm (tambah/edit produk)
├── Orders (riwayat order merchant)
├── Sales (laporan penjualan)
├── Wallet (saldo, penarikan)
└── Profile (profil merchant)
```

### 4.5 Implementasi RootNavigator

```typescript
// navigation/RootNavigator.tsx
const RootNavigator = () => {
  const { activeRole, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) return <AuthStack />;
  
  switch (activeRole) {
    case 'customer':
      return <PassengerStack />;
    case 'driver_motorcycle':
    case 'driver_car':
      return <DriverStack />;
    case 'merchant':
      return <MerchantStack />;
    default:
      return <PassengerStack />; // fallback
  }
};
```

---

## 5. Integrasi API per Role

### 5.1 Konvensi Umum

- Semua endpoint `/api/*` membutuhkan `Authorization: Bearer <access_token>`
- Pagination menggunakan `page` dan `per_page` (default 20, max 100)
- Error format: `{ "error": "pesan" }` (satu field, bukan `{error, message}`)
- Validasi gagal → **422**, bukan 400
- Waktu dalam ISO 8601 UTC

### 5.2 Passenger (Customer)

| Fitur | Endpoint | Method |
|---|---|---|
| Home UI | `/api/ui/home` | GET |
| Estimasi tarif | `/api/fare/estimate` | POST |
| Validasi promo | `/api/promos/validate` | POST |
| Buat order | `/api/orders` | POST |
| Riwayat order | `/api/customer/orders` | GET |
| Detail order | `/api/orders?uuid=...` | GET |
| Rating driver | `/api/orders/:uuid/rate` | POST |
| Chat | `/api/orders/:uuid/chat` | GET/POST |
| Wallet saldo | `/api/wallet` | GET |
| Top up | `/api/wallet/deposit` | POST |
| Riwayat wallet | `/api/customer/wallet/history` | GET |
| Notifikasi | `/api/notifications` | GET |
| Profil | `/api/profile` | GET/PUT |

### 5.3 Driver

| Fitur | Endpoint | Method |
|---|---|---|
| KYC status | `/api/driver/kyc` | GET |
| Submit KYC | `/api/driver/kyc` | POST |
| Online/Offline | `/api/driver/status` | PUT |
| Terima order | `/api/orders/:uuid/accept` | PUT |
| Tolak order | `/api/orders/:uuid/reject` | PUT |
| Ubah status perjalanan | `/api/orders/:uuid/status` | PUT |
| Riwayat order | `/api/driver/orders` | GET |
| Pendapatan | `/api/driver/earnings` | GET |
| Wallet saldo | `/api/wallet` | GET |
| Penarikan | `/api/wallet/withdraw` | POST |
| Riwayat wallet | `/api/driver/wallet/history` | GET |
| Chat | `/api/orders/:uuid/chat` | GET/POST |
| Notifikasi | `/api/notifications` | GET |

### 5.4 Merchant

| Fitur | Endpoint | Method |
|---|---|---|
| Katalog produk | `/api/merchant/products` | GET |
| Tambah produk | `/api/merchant/products` | POST |
| Edit produk | `/api/merchant/products/:id` | PUT |
| Hapus produk | `/api/merchant/products/:id` | DELETE |
| Riwayat order | `/api/merchant/orders` | GET |
| Laporan penjualan | `/api/merchant/sales` | GET |
| Wallet saldo | `/api/wallet` | GET |
| Penarikan | `/api/wallet/withdraw` | POST |
| Riwayat wallet | `/api/merchant/wallet/history` | GET |
| Profil merchant | `/api/profile/merchant` | PUT |

### 5.5 Public (tanpa auth)

| Endpoint | Tujuan |
|---|---|
| `/health` | Health check |
| `/api/register` | Registrasi |
| `/api/login` | Login |
| `/api/refresh` | Refresh token |
| `/api/products` | Katalog produk publik |
| `/api/products/:id` | Detail produk publik |

---

## 6. WebSocket & Realtime

### 6.1 Koneksi

```
ws://host/ws?token=<access_token>
```

- Hanya satu koneksi per user; koneksi lama ditutup saat yang baru terbuka
- Ping berkala untuk menjaga koneksi tetap hidup
- Reconnect dengan backoff eksponensial

### 6.2 Pesan dari Server ke Driver

| Pesan | Deskripsi |
|---|---|
| `incoming_order` | Tawaran order baru, driver harus merespon dalam `offer_timeout_seconds` (30 detik default) |
| `order_accepted` | Order berhasil diambil oleh driver lain |
| `order_cancelled` | Order dibatalkan oleh penumpang/admin |
| `order_status_changed` | Status order berubah (arrived, in_progress, completed) |

### 6.3 Pesan dari Driver ke Server

| Pesan | Deskripsi |
|---|---|
| `location_update` | Update posisi driver (lat, lon) untuk indeks geospasial Redis |

### 6.4 Pesan dari Server ke Penumpang

| Pesan | Deskripsi |
|---|---|
| `driver_location` | Posisi driver yang sedang mengantar |
| `order_status_changed` | Status order berubah |
| `no_drivers_available` | Tidak ada driver tersedia untuk order |
| `incoming_order` (informasi) | Order sedang dicari driver |

### 6.5 Implementasi WebSocket Client

```typescript
// ws/client.ts
class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  
  connect(token: string) {
    this.ws = new WebSocket(`ws://host/ws?token=${token}`);
    this.ws.onmessage = this.handleMessage;
    this.ws.onclose = () => this.reconnect();
  }
  
  sendLocation(lat: number, lng: number) {
    this.send({ type: 'location_update', lat, lng });
  }
}
```

---

## 7. Alur Fitur Utama

### 7.1 Pemesanan Order (Passenger)

```
1. User pilih pickup & destination di peta
2. App panggil Nominatim untuk geocoding
3. App panggil Valhalla untuk rute & jarak
4. App panggil POST /api/fare/estimate
5. User input promo code → POST /api/promos/validate
6. User konfirmasi → POST /api/orders
7. App terima response → mulai tracking via WebSocket
8. WebSocket kirim status ke user (searching → accepted → ...)
9. Order selesai → POST /api/orders/:uuid/rate
```

### 7.2 KYC Driver

```
1. Driver buka layar KYC
2. App panggil GET /api/driver/kyc → dapat status & data yang sudah diisi
3. Driver isi formulir (KTP, SIM, STNK, swafoto, rekening)
4. Upload foto → POST /api/uploads → dapat URL
5. Submit → POST /api/driver/kyc dengan URL foto
6. Status berubah menjadi 'pending'
7. Driver menunggu verifikasi admin
8. Admin verifikasi → status 'approved' (is_verified = true)
   atau 'rejected' (dengan reason)
9. Driver cek status secara periodik
```

**Peringatan:**
- Status `pending` tidak bisa submit ulang (409 Conflict)
- SIM expired ditolak (422)
- `approved` → submit ulang akan mencabut verifikasi (untuk ganti rekening)
- Rekening disamarkan di `GET /api/driver/kyc` (hanya 4 digit terakhir)

### 7.3 Online/Offline Driver

```
1. Driver tekan tombol "Online"
2. App panggil PUT /api/driver/status { "status": "online" }
3. Berhasil → app mulai kirim location_update via WebSocket
4. Driver masuk indeks geospasial Redis
5. Driver bisa menerima order via WebSocket
6. Driver tekan "Offline" → status berubah, lokasi dihapus dari Redis
```

**Error yang mungkin:**
- 403: "Driver account is not verified yet" → KYC belum approved
- 403: "Finish your ongoing order before going offline" → masih ada order aktif
- 422: "status must be online or offline" → nilai invalid

### 7.4 Menerima/Menolak Order (Driver)

```
1. WebSocket menerima pesan 'incoming_order'
2. Tampilkan notifikasi/alert ke driver
3. Driver pilih "Terima" → PUT /api/orders/:uuid/accept
   atau "Tolak" → PUT /api/orders/:uuid/reject (dengan reason opsional)
4. Jika diterima → status order 'accepted', driver terikat
5. Jika ditolak → order tetap 'searching', dicari driver lain
```

**Peringatan:**
- Driver hanya bisa menerima order yang sesuai `vehicle_type` dengan role aktif
- Driver hanya bisa menolak order yang pernah ditawarkan kepadanya
- Order yang sudah diambil driver lain → 409 Conflict

### 7.5 Perubahan Status Order (Driver)

```
PUT /api/orders/:uuid/status
{ "status": "arrived" }  // atau "in_progress", "completed"
```

Status flow: `searching` → `accepted` → `arrived` → `in_progress` → `completed`

Driver harus mengupdate status saat:
- Tiba di lokasi pickup → `arrived`
- Penumpang naik → `in_progress`
- Tiba di tujuan → `completed`

### 7.6 Wallet & Pembayaran

#### Top Up (Passenger)
```
1. User pilih nominal
2. App panggil POST /api/wallet/deposit { "amount": 100000 }
3. Backend return payment token (Midtrans)
4. App buka payment page (Midtrans Snap)
5. User bayar → Webhook Midtrans → saldo bertambah
6. App polling GET /api/wallet untuk cek saldo baru
```

#### Pembayaran Order
- **Wallet:** Saldo dipotong saat order dibuat (`Insufficient wallet balance` → 400)
- **Cash:** Tidak ada potongan; driver menagih ke penumpang

#### Penarikan (Driver/Merchant)
```
POST /api/wallet/withdraw
{
  "amount": 50000,
  "bank_name": "BCA",
  "bank_account_number": "1234567890",
  "bank_account_name": "Budi Santoso"
}
```

**Driver:** Rekening diambil dari KYC yang sudah approved, body request diabaikan.
**Merchant:** Rekening dari body request (belum ada KYC).

### 7.7 Chat

```
GET /api/orders/:uuid/chat     → ambil riwayat chat
POST /api/orders/:uuid/chat    → kirim pesan baru
{ "message": "Halo driver, saya di depan gerbang" }
```

- Chat hanya bisa diakses oleh rider dan driver dari order tersebut
- Chat tertutup setelah order selesai (tapi riwayat tetap terbaca)
- Format pesan: `{ id, sender_id, message, created_at, is_read }`

### 7.8 Rating

```
POST /api/orders/:uuid/rate
{
  "rating": 5,           // 1-5
  "review": "Bagus!"      // opsional
}
```

- Hanya untuk order dengan status `completed`
- Hanya bisa dinilai sekali

---

## 8. Peta & Routing

### 8.1 MapLibre

```typescript
// Install
npm install @maplibre/maplibre-react-native

// Usage
import MapLibreGL from '@maplibre/maplibre-react-native';

<MapLibreGL.MapView style={{ flex: 1 }}>
  <MapLibreGL.Camera
    centerCoordinate={[longitude, latitude]}
    zoomLevel={14}
  />
  <MapLibreGL.PointAnnotation
    id="pickup"
    coordinate={[pickupLon, pickupLat]}
  />
</MapLibreGL.MapView>
```

### 8.2 Geocoding (Nominatim)

```typescript
// Reverse geocoding (koordinat → alamat)
const response = await fetch(
  `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
);

// Forward geocoding (alamat → koordinat)
const response = await fetch(
  `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5`
);
```

### 8.3 Routing (Valhalla)

```typescript
// Get route & distance
const response = await fetch(
  `https://valhalla.host/route?json={
    "locations":[
      {"lat":${pickupLat},"lon":${pickupLon}},
      {"lat":${dropoffLat},"lon":${dropoffLon}}
    ],
    "costing":"auto"
  }`
);
```

**Catatan:** Routing dan geocoding dipanggil **langsung dari aplikasi**, bukan lewat backend. Backend hanya menerima koordinat dan menghitung tarif berdasarkan jarak.

---

## 9. Background Location (Driver)

### 9.1 Setup

```bash
npm install react-native-background-geolocation
```

### 9.2 Konfigurasi

```typescript
import BackgroundGeolocation from 'react-native-background-geolocation';

BackgroundGeolocation.ready({
  desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
  stationaryRadius: 10,
  distanceFilter: 10,
  stopOnTerminate: false,
  startOnBoot: true,
  url: 'ws://host/ws',
  // custom headers
  headers: { Authorization: `Bearer ${accessToken}` }
}, (state) => {
  console.log('BackgroundGeolocation ready', state);
});
```

### 9.3 Start/Stop

```typescript
// Saat driver online
await BackgroundGeolocation.start();

// Saat driver offline
await BackgroundGeolocation.stop();
```

### 9.4 Izin Android

Tambahkan ke `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

---

## 10. Notifikasi

### 10.1 Fetch Notifications

```
GET /api/notifications?page=&per_page=
GET /api/notifications/unread-count
PUT /api/notifications/:id/read
PUT /api/notifications/read-all
```

### 10.2 WebSocket vs Push

| Metode | Coverage | Status |
|---|---|---|
| WebSocket | App terbuka | ✅ Tersedia |
| FCM/APNs | App tertutup | ❌ Belum (todo) |

Saat ini, notifikasi hanya dikirim via WebSocket. Aplikasi harus:
1. Menyimpan notifikasi lokal saat diterima via WebSocket
2. Mengambil notifikasi yang terlewat via `GET /api/notifications` saat app dibuka

### 10.3 Incoming Order Notification (Driver)

Saat `incoming_order` diterima via WebSocket, tampilkan:
- Alert atau modal dengan tombol Terima/Tolak
- Informasi: pickup, destination, estimated distance, fare
- Timer countdown (`offer_timeout_seconds` dari setting)

---

## 11. Error Handling

### 11.1 Format Error

Semua error mengembalikan:
```json
{ "error": "pesan error" }
```

Beberapa endpoint menambahkan field tambahan:
- `allowed_values` → untuk error validasi enum
- `kyc_status` → untuk error KYC
- `missing_fields` → untuk KYC tidak lengkap

### 11.2 HTTP Status Codes

| Status | Arti |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (saldo kurang, dll) |
| 401 | Unauthorized (token invalid/expired) |
| 403 | Forbidden (role tidak sesuai, KYC belum approved, dll) |
| 404 | Not Found |
| 409 | Conflict (status tidak sesuai, duplikat, dll) |
| 410 | Gone (promo expired) |
| 422 | Validation Error (body invalid) |
| 500 | Internal Server Error |

### 11.3 Token Refresh Flow

```
Request → 401
  ↓
Cek apakah ada refresh token di Keychain
  ↓
Ada → Panggil POST /api/refresh
  ↓
Berhasil → Update access token, ulangi request
Gagal → Logout user
  ↓
Tidak ada → Logout user
```

---

## 12. Struktur Folder Aplikasi

```
src/
├── api/
│   ├── client.ts                 # HTTP client + interceptor
│   ├── endpoints/
│   │   ├── auth.ts               # login, register, refresh, logout
│   │   ├── user.ts               # user, roles, active-role
│   │   ├── orders.ts             # orders, accept, reject, status, rate
│   │   ├── driver.ts             # kyc, status, earnings
│   │   ├── merchant.ts           # products, sales
│   │   ├── wallet.ts             # wallet, deposit, withdraw, history
│   │   ├── promo.ts              # validate promo
│   │   ├── fare.ts               # estimate fare
│   │   ├── chat.ts               # chat messages
│   │   ├── notifications.ts      # notifications
│   │   └── upload.ts             # upload files
│   └── types.ts                  # Request/Response types
├── ws/
│   ├── client.ts                 # WebSocket connection
│   └── events.ts                 # Message types
├── store/
│   ├── auth.ts                   # Auth state (Zustand)
│   ├── activeOrder.ts            # Current order state
│   └── notifications.ts          # Notification state
├── navigation/
│   ├── RootNavigator.tsx
│   ├── PassengerStack.tsx
│   ├── DriverStack.tsx
│   ├── MerchantStack.tsx
│   └── AuthStack.tsx
├── screens/
│   ├── auth/
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   ├── passenger/
│   │   ├── Home.tsx
│   │   ├── Estimate.tsx
│   │   ├── ConfirmOrder.tsx
│   │   ├── Tracking.tsx
│   │   ├── History.tsx
│   │   └── OrderDetail.tsx
│   ├── driver/
│   │   ├── Home.tsx
│   │   ├── KYC.tsx
│   │   ├── IncomingOrder.tsx
│   │   ├── Navigation.tsx
│   │   ├── RideStatus.tsx
│   │   ├── History.tsx
│   │   └── Earnings.tsx
│   ├── merchant/
│   │   ├── Home.tsx
│   │   ├── Products.tsx
│   │   ├── ProductForm.tsx
│   │   ├── Orders.tsx
│   │   └── Sales.tsx
│   └── shared/
│       ├── Profile.tsx
│       ├── Wallet.tsx
│       ├── WalletHistory.tsx
│       ├── Withdraw.tsx
│       ├── Chat.tsx
│       └── Notifications.tsx
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Loading.tsx
│   │   └── ErrorBoundary.tsx
│   └── map/
│       ├── MapView.tsx
│       ├── RoutePolyline.tsx
│       └── Markers.tsx
├── hooks/
│   ├── useLocation.ts
│   ├── useActiveOrder.ts
│   ├── useWebSocket.ts
│   ├── useNotifications.ts
│   └── useDriverStatus.ts
├── lib/
│   ├── format.ts        # currency, distance, date
│   └── validation.ts    # Zod schemas
└── constants/
    ├── roles.ts
    ├── orderStatus.ts
    └── endpoints.ts
```

---

## 13. Konfigurasi Environment

### 13.1 `.env` untuk Android

```bash
# Backend
API_URL=http://192.168.1.100:8080
WS_URL=ws://192.168.1.100:8080

# Maps
MAPLIBRE_STYLE_URL=https://tiles.openstreetmap.org
NOMINATIM_URL=https://nominatim.openstreetmap.org
VALHALLA_URL=https://valhalla.host

# Midtrans
MIDTRANS_CLIENT_KEY=your-client-key
```

### 13.2 Build Variants

| Variant | API_URL | Tujuan |
|---|---|---|
| debug | http://localhost:8080 | Development local |
| staging | https://staging-api.example.com | Testing |
| release | https://api.example.com | Production |

---

## 14. Testing

### 14.1 Unit Testing

```bash
npm test
```

### 14.2 Integration Testing (API)

Gunakan backend testing dengan `TEST_DATABASE_URL`:

```bash
export TEST_DATABASE_URL="host=localhost user=postgres password=... dbname=testing port=5432 sslmode=disable"
go test ./internal/handlers/ -v
```

### 14.3 E2E Testing (Detox)

```bash
npm run detox:build
npm run detox:test
```

---

## 15. Checklist Persiapan

### 15.1 Sebelum Memulai

- [ ] `git init` di root (jika belum)
- [ ] Tambah `.gitignore` root dengan `.env`, `uploads/`, `coverage`, `node_modules/`, `android/app/build/`
- [ ] Commit pertama (`git add -A && git commit -m "Initial commit"`)
- [ ] Pastikan `.env` tidak ikut ter-track

### 15.2 Setup React Native

```bash
# Install dependencies
npm install

# Install iOS (macOS only)
cd ios && pod install

# Run Android
npx react-native run-android
```

### 15.3 Dependencies Tambahan

```bash
npm install @maplibre/maplibre-react-native
npm install react-native-background-geolocation
npm install react-native-keychain
npm install react-native-safe-area-context
npm install react-native-screens
npm install @react-navigation/native @react-navigation/stack
npm install @tanstack/react-query
npm install zustand
npm install react-hook-form @hookform/resolvers zod
npm install react-native-gesture-handler
npm install react-native-reanimated
```

---

## 16. Hal yang Perlu Diperhatikan

### 16.1 KYC Status

| Status | Arti | Aksi |
|---|---|---|
| `not_submitted` | Belum mengajukan | Tampilkan form KYC |
| `pending` | Sedang ditinjau | Tampilkan status menunggu, disable submit |
| `approved` | Disetujui | Tampilkan verifikasi OK, bisa online |
| `rejected` | Ditolak | Tampilkan `reason`, enable submit ulang |

### 16.2 Status Online Tidak Ada di `GET /api/user`

`GET /api/user` tidak mengembalikan `is_online`. Simpan status secara lokal dan anggap sebagai dugaan sampai `PUT /api/driver/status` mengonfirmasi.

### 16.3 Format Koordinat

| Endpoint | Format |
|---|---|
| `POST /api/fare/estimate` | `{ pickup: { lat, lng }, destination: { lat, lng } }` |
| `POST /api/orders` | `pickup_lat, pickup_lon, dropoff_lat, dropoff_lon` (datar) |

### 16.4 Total Fare

`fare_amount` adalah tarif **setelah** promo dan **tanpa** customer_fee. Total yang dibayar penumpang adalah `fare_amount + customer_fee`.

### 16.5 Wallet Transaction Types

Semua huruf besar: `DEPOSIT`, `WITHDRAWAL`, `PAYMENT`, `REFUND`, `EARNING`, `FEE`, `BONUS`, `DISBURSED`

### 16.6 Reconnect WebSocket

Backend hanya mengizinkan satu koneksi per user. Reconnect agresif tanpa backoff akan membuat app saling menutup koneksinya sendiri.

### 16.7 Background Location

Driver perlu izin `ACCESS_BACKGROUND_LOCATION` dan foreground service di Android.

---

## 17. Referensi

- [CLAUDE.md](./CLAUDE.md) — Dokumentasi backend lengkap
- [Roadmap_Aplikasi_Ojek.md](./Roadmap_Aplikasi_Ojek.md) — Roadmap produk
- [MapLibre React Native](https://github.com/maplibre/maplibre-react-native)
- [Nominatim API](https://nominatim.org/release-docs/develop/api/Overview/)
- [Valhalla API](https://valhalla.readthedocs.io/en/latest/api/)
- [React Navigation](https://reactnavigation.org/)
- [TanStack Query](https://tanstack.com/query)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [react-native-keychain](https://github.com/oblador/react-native-keychain)
- [react-native-background-geolocation](https://github.com/transistorsoft/react-native-background-geolocation)
fare.merchant_fee_percent      0         potongan dari bagian merchant
wallet.min_balance_idr         -10000    batas saldo minus driver
matching.search_radius_km      5
matching.max_driver_candidates 10
matching.offer_timeout_seconds 30
ui.primary_color               #c8ff00
ui.home_banner_text
ui.home_banner_color           #1a1a26
ui.driver_mode_enabled
app.maintenance_mode
app.min_android_version        1.0.0
app.force_update_version
```

Ditambah satu paragraf yang menjelaskan mengapa tarif dasar dan tarif minimum
dihapus — supaya tidak ada yang menambahkannya kembali dengan niat baik. Arah
kedua biaya harus ditulis eksplisit karena mudah tertukar: **biaya penumpang
ditambahkan di atas tarif, potongan platform dikurangkan dari pendapatan
driver.**

Bentuk `pricing.Quote` yang harus dipakai di §9.4 dan §9.5:

```json
{
  "distance_km": 3.4, "charged_distance_km": 3.4,
  "min_distance_km": 3, "min_distance_applied": false,
  "per_km_price": 3000, "total": 10200, "min_fare": 9000,
  "customer_fee": 0, "customer_fee_percent": 0,
  "total_charged": 10200, "min_total_charged": 9000
}
```

Pada `/api/fare/estimate` ditambah `vehicle_type` dan `valid_for_seconds`
(konstanta 120, `fare_handler.go`). Pada `POST /api/orders`, objek yang sama
muncul di bawah kunci `fare` — dan **field totalnya bernama `total`, bukan
`estimated_fare`.**

### B.2 Bagian §17 baru — peringkat katalog produk

Ditulis dari `internal/handlers/product_handler.go:268-297`, bukan dari ingatan.
Dua fakta yang mudah salah dan harus tepat:

- **Benih pengacakan adalah tanggal saja** (`time.Now().Format("2006-01-02")`
  di-hash FNV-64a) — bukan tanggal digabung nomor halaman.
- **Kuota eksplorasi ikut ukuran halaman**, tidak tetap 14/6:
  `explorationPerPage = rankExplorationSlots × perPage / rankPageSlots`
  (konstanta 6 dan 20), dengan lantai 1 selama masih ada kandidat sepi.

Skornya `0,5 × norm(order_30d) + 0,3 × norm(view_30d) + 0,2 × (rating/5)`,
normalisasi min-maks atas kandidat permintaan itu, produk tanpa rating diberi
nilai tengah 3,0. Eksplorasi dimatikan begitu `q`, `category`, atau
`merchant_id` diisi.

### B.3 Penghapusan dokumen yang sudah tidak sesuai

| Berkas | Alasan |
|---|---|
| `audit_coverage.md` | daftar route usang (74), sudah digantikan §8 |
| `todo_api.md` | nama route di dalamnya salah; CLAUDE.md sudah mendokumentasikan koreksinya |
| `implem.md` | sudah diringkas ke CLAUDE.md §1-§8 |
| `Roadmap_Aplikasi_Ojek.md` | sudah diringkas ke §12 |
| `todo_admin.md` | sudah diringkas ke §11 |
| `.plan/plan.md` | rencana lama yang sudah selesai |
| `coverage` | keluaran `go tool cover`, bukan dokumen |

Setelah penghapusan, **§1 CLAUDE.md harus diperbarui** — bagian itu menyebut
lima berkas di atas sebagai "dokumen sumber yang diringkas di sini", dan
rujukan ke berkas yang tidak ada lebih buruk daripada dokumen basi.

Penghapusan dilakukan **setelah** commit pertama Bagian A sehingga bisa
dipulihkan, dan daftarnya dikonfirmasi sekali lagi sebelum perintah hapus
dijalankan.

### B.4 Verifikasi backend yang belum pernah benar-benar jalan

Test untuk chat, unggah, produk, dan katalog merchant sudah ditulis tetapi
`go build`/`go vet`/`go test` belum pernah dieksekusi sampai selesai. Jalankan
berurutan:

```bash
gofmt -l ./internal ./cmd      # harus kosong
go build ./...
go vet ./...
go test ./...                  # test integrasi ter-skip tanpa DSN
```

Lalu dengan database — DSN dari environment, tidak pernah ditulis di kode:

```bash
export TEST_DATABASE_URL="host=localhost user=postgres password=... dbname=testing port=5432 sslmode=disable"
go test ./internal/handlers/ -v -run 'Notification|Product|Chat|Upload|Coverage'
go test ./...
```

`TestAPI_AllRoutesAreRegistered` adalah yang menentukan angka route final untuk §8.

---

## Bagian C — Aplikasi Android React Native

Bare React Native + TypeScript, satu codebase untuk penumpang, driver, dan
merchant, di direktori `mobile/` pada repositori yang sama. Stack mengikuti
§10.2 CLAUDE.md yang sudah ditetapkan.

Satu codebase dipilih karena ketiga peran memakai backend, model auth, dan
koneksi WebSocket yang identik; yang membedakan hanyalah role aktif. Backend
sudah mendukung satu akun dengan banyak role, jadi aplikasi cukup memilih
navigation stack dari `active_role`.

### C.1 Kontrak yang mengikat implementasi

Diambil verbatim dari sumber Go. Yang paling menentukan bentuk kode:

**Token.** Access 15 menit (900 detik), refresh 30 hari, keduanya hardcoded di
`internal/auth/jwt.go:32-33`. `expires_in` adalah **detik**, bukan timestamp.

**Rotasi refresh token menuntut single-flight.** Setiap refresh yang berhasil
mencabut token lama dan menerbitkan yang baru. Memakai token yang sudah dicabut
dianggap kebocoran: **seluruh sesi user dicabut** dan balasannya 401
`Refresh token reuse detected`. Rotasi memakai
`WHERE id = ? AND revoked_at IS NULL`, jadi dua refresh paralel dari token yang
sama membunuh salah satunya. Konsekuensinya untuk klien: refresh harus melewati
satu mutex tunggal, dan token baru harus tersimpan sebelum permintaan mana pun
diulang. Ini bukan optimasi — refresh berbarengan melempar pengguna keluar dari
aplikasi.

**Bentuk `available_roles` berbeda antara dua endpoint.** `POST /api/login`
mengembalikan array string (`["customer"]`); `GET /api/user` mengembalikan array
objek (`[{code,name,group}]`). Tipe TypeScript harus memisahkan keduanya, bukan
memaksakan satu tipe.

**Validasi gagal selalu 422, tidak pernah 400.** Interceptor tidak boleh
memperlakukan 400 sebagai kesalahan validasi.

**403 `Account suspended` berarti logout paksa**, berasal dari `LoadUser` dan
berlaku seketika sebelum token kedaluwarsa. Harus dibedakan dari 403 lain (KYC
belum disetujui, saldo minimum, order berjalan) yang semuanya dapat dipulihkan.
Pembedanya adalah isi field `error`, karena backend tidak mengirimkan kode
kesalahan mesin.

**WebSocket.** `GET /ws?token=<access_token>` — token hanya lewat query, tidak
ada jalur header. Karena yang dipakai access token, koneksi mati paling lama
setiap 15 menit dan harus disambung ulang dengan token yang baru. Amplop pesan
`{type, payload}` di kedua arah.

Pesan yang dikirim server, lengkap (tidak ada yang lain di seluruh pohon):
`incoming_order`, `no_drivers_available`, `order_accepted`, `driver_arrived`,
`trip_started`, `trip_completed`, `order_cancelled`,
`forced_offline_low_balance`, `chat_message`, `balance_updated`,
`notification`.

Lima peristiwa siklus order hanya membawa `order_uuid` — **tidak ada field
status di payload**. Jenis pesannya itulah statusnya, dan detail lain harus
diambil ulang lewat HTTP.

Satu-satunya pesan yang diterima server adalah
`{"type":"location_update","payload":{"lat":…,"lon":…}}`. Namanya **`lat` dan
`lon`** — bukan `latitude`/`longitude`, bukan `lng`. Diabaikan diam-diam bila
role aktif bukan driver atau koordinat di luar rentang; tidak ada ack untuk
pesan klien mana pun.

Server mengirim ping protokol setiap 54 detik dan memutus bila pong tidak datang
dalam 60 detik. Batas pesan masuk 8192 byte.

**Satu koneksi per user**, berkunci `user_id` saja. Koneksi baru menutup yang
lama secara diam-diam. Reconnect agresif tanpa backoff membuat aplikasi saling
menutup koneksinya sendiri.

**Putusnya socket driver menonaktifkan status online di server** (`is_online =
false`, dihapus dari indeks geo Redis), ditambah sapuan `PresenceWorker` setiap
60 detik dengan tenggang 2 menit. Setelah reconnect, aplikasi harus mengirim
ulang `PUT /api/driver/status`, bukan menganggap dirinya masih online.

**`notification.data` adalah string berisi JSON**, perlu di-parse sekali lagi.
Jenis notifikasi adalah namespace terpisah dari jenis pesan WebSocket, dan
keduanya punya jebakan: notifikasi memakai `no_driver_available` (tunggal),
WebSocket memakai `no_drivers_available` (jamak).

**KYC.** Kesebelas field `binding:"required"` — tidak ada yang opsional.
`license_expiry` format `YYYY-MM-DD` dan harus di masa depan. Keempat URL
dokumen harus absolut `http`/`https` dengan host tidak kosong dan ≤500 karakter,
jadi unggah lewat `POST /api/uploads` dulu lalu kirim URL hasilnya. Sukses
**200**, bukan 201. Pengajuan saat `pending` dibalas 409.
`GET /api/driver/kyc` punya **dua bentuk response berbeda**: tanpa profil hanya
`status` + `missing_fields`; dengan profil lengkap. `bank_account_number` selalu
tersamarkan empat digit terakhir — jangan pernah dikirim balik ke pengajuan.

### C.2 Struktur

```
mobile/
  src/
    api/
      client.ts            instance HTTP, interceptor 401, single-flight refresh
      endpoints/           auth, orders, wallet, driver, merchant, products, promo, notifications
      types.ts             cermin kontrak §9 CLAUDE.md yang sudah diperbaiki
    ws/
      client.ts            koneksi, backoff, sambung ulang saat token diganti
      events.ts            union type ke-11 pesan server + location_update
    store/
      auth.ts              token, user, active_role
      activeOrder.ts       order berjalan
    navigation/
      RootNavigator.tsx    memilih stack dari active_role
      PassengerStack.tsx  DriverStack.tsx  MerchantStack.tsx
    screens/
      auth/ passenger/ driver/ merchant/ shared/
    components/ hooks/ lib/
  android/
```

### C.3 Todo list

Berurutan; setiap tahap bisa dijalankan dan dilihat hasilnya sebelum tahap
berikutnya.

**Tahap 0 — pengaman dan dokumen**

1. `git init`, `.gitignore` root, commit pertama (Bagian A)
2. Perbaiki CLAUDE.md §6, §9.1, §9.4, §9.5, §8, §12, §15, §16 dan tambah §17 (B.1, B.2)
3. Hapus dokumen usang, perbarui §1 (B.3)
4. Jalankan verifikasi backend yang tertunda (B.4)

**Tahap 1 — fondasi**

5. Scaffold bare React Native + TypeScript ke `mobile/`; pastikan
   `npx react-native run-android` menampilkan layar bawaan
6. Pasang dependensi: React Navigation, TanStack Query, Zustand,
   react-native-keychain, React Hook Form + Zod, MapLibre RN
7. `src/api/types.ts` — tipe request/response dari kontrak yang sudah
   dibetulkan; `Quote` dan `Order` disalin field demi field
8. `src/api/client.ts` — base URL dari config build, header Authorization,
   interceptor 401 dengan **single-flight refresh** (C.1), pemetaan 422 ke
   kesalahan per-field, 403 `Account suspended` ke logout paksa
9. `src/store/auth.ts` — access token di memori, refresh token di Keychain,
   `active_role`, aksi login/logout/switchRole

**Tahap 2 — auth dan kerangka navigasi**

10. Layar Login dan Register (`role` opsional, empat nilai yang boleh)
11. `RootNavigator` memilih stack dari `active_role`; pemindah mode memanggil
    `PUT /api/users/active-role`, **mengganti access token, lalu me-reset stack**
12. `GET /api/user` saat aplikasi dibuka untuk memulihkan sesi

**Tahap 3 — klien WebSocket**

13. `src/ws/client.ts`: sambung dengan token dari store, reconnect ber-backoff
    eksponensial + jitter, sambung ulang saat access token berganti, satu
    koneksi saja
14. `src/ws/events.ts`: union type ke-11 pesan; peristiwa siklus order memicu
    invalidasi query order (bukan menambal state dari payload, karena payload
    hanya berisi uuid)
15. `useWebSocket` yang menaruh pesan masuk ke TanStack Query dan store order
    berjalan

**Tahap 4 — alur penumpang**

16. Home map (MapLibre + OSM), izin lokasi runtime
17. Pilih pickup dan tujuan lewat Nominatim, rute lewat Valhalla
18. Estimasi tarif `POST /api/fare/estimate` — tampilkan `total`, dan bila
    `min_distance_applied` benar jelaskan bahwa jarak minimum yang ditagihkan
19. Terapkan promo `POST /api/promos/validate` (hanya role customer)
20. Buat order `POST /api/orders`; tarif final dari response, bukan dari estimasi
21. Live tracking dari WebSocket; posisi driver dari pesan yang masuk
22. Chat: kolom ketik mengikuti `chat_closed`, bukan status order di layar
23. Rating `POST /api/orders/:uuid/rate`
24. Riwayat `GET /api/customer/orders`

**Tahap 5 — alur driver**

25. Formulir KYC — kesebelas field wajib, unggah tiap foto lewat
    `POST /api/uploads` lalu kirim URL-nya
26. Layar status KYC — empat status punya tampilan berbeda; `rejected`
    menampilkan `rejection_reason`; peringatan bahwa pengajuan ulang mencabut
    verifikasi
27. Tombol online/offline — empat kemungkinan penolakan 403 dibedakan dari isi
    response, ditampilkan apa adanya
28. Pengiriman `location_update` termasuk saat background: foreground service +
    `ACCESS_BACKGROUND_LOCATION`
29. Layar tawaran order dari `incoming_order`, dengan hitung mundur dari
    `expires_at`
30. Terima/tolak, ubah status perjalanan, navigasi Valhalla
31. Pendapatan `GET /api/driver/earnings` — hari tanpa trip tidak muncul sebagai
    baris nol, grafik mengisinya sendiri
32. Penarikan `POST /api/wallet/withdraw` — untuk driver, rekening diambil dari
    KYC, bukan dari formulir

**Tahap 6 — merchant dan bagian bersama**

33. Katalog produk merchant (CRUD), unggah foto multipart
34. Riwayat dan omzet merchant
35. Layar notifikasi — `data` di-parse sebagai string JSON;
    `GET /api/notifications` dipanggil saat aplikasi dibuka untuk menyusul yang
    terlewat, karena WebSocket tidak sampai saat aplikasi tertutup
36. Dompet dan profil bersama

**Tahap 7 — rilis**

37. Konfigurasi build Android: applicationId, versionCode/versionName sejalan
    dengan `app.min_android_version`
38. Penanganan `app.maintenance_mode` dan `app.force_update_version` dari
    `GET /api/ui/home`
39. Build APK release bertanda tangan; keystore di luar repositori dan tercakup
    `.gitignore`

### C.4 Yang mudah salah (dari kontrak, bukan dugaan)

- Estimasi bukan harga terkunci; tarif final dari response `POST /api/orders`
- `platform_fee` dan `driver_earning` ikut terkirim ke penumpang karena
  `models.Order` di-serialize utuh — jangan ditampilkan, tetapi sadari
  menyaringnya di aplikasi tidak menutup apa pun
- Status online tidak ada di `GET /api/user`; setelah aplikasi dibuka ulang,
  tombolnya hanya dugaan sampai `PUT /api/driver/status` berikutnya
- Urutan `GET /api/products` berubah setiap hari — kuota eksplorasi, bukan bug;
  jangan cache lebih dari sehari
- `POST /api/uploads` multipart, jenis ditentukan server dari isi berkas
- Satu akun tidak bisa memegang dua koneksi WebSocket; yang baru menutup yang lama

---

## Verifikasi

**Bagian A** — `git status --porcelain` tidak menyebut `.env`;
`git log --stat -1` tidak memuatnya.

**Bagian B** — `grep -n "base_fare\|base_price_idr\|min_fare_idr" CLAUDE.md`
tidak menghasilkan apa pun kecuali di paragraf yang menjelaskan penghapusannya.
Setiap contoh JSON di §9.4 dan §9.5 dicocokkan field demi field dengan
`pricing.Quote`. Rujukan "bagian 17" di §9.10 dan §10.7 mengarah ke bagian yang
ada. §1 tidak menyebut berkas yang sudah dihapus. Rantai
`gofmt`/`build`/`vet`/`test` lulus, dan angka route di §8 sama dengan
`minimumRoutes`.

**Bagian C** — per tahap, dijalankan di perangkat atau emulator Android:

1. Login berhasil, token tersimpan di Keychain, `GET /api/user` mengisi profil
2. Access token dipaksa kedaluwarsa (tunggu 15 menit atau rusak token di store),
   lalu picu **beberapa permintaan sekaligus**: hanya satu `POST /api/refresh`
   yang terkirim dan tidak ada yang ter-logout. Ini yang membuktikan
   single-flight bekerja; tanpanya kegagalannya baru muncul di tangan pengguna
3. Pindah role dari customer ke driver: stack berganti dan permintaan berikutnya
   memakai token yang baru
4. WebSocket: matikan jaringan lalu nyalakan — satu koneksi tersambung kembali,
   bukan beberapa
5. Alur ujung ke ujung dengan dua perangkat (atau satu perangkat + curl):
   penumpang membuat order, driver menerima `incoming_order`, penumpang melihat
   posisi driver bergerak, status berubah sampai selesai, chat tertutup setelah
   selesai tetapi riwayatnya tetap terbaca
6. Driver: KYC diajukan dengan foto sungguhan lewat `/api/uploads`, admin
   menyetujuinya, driver bisa online — dan sebelum disetujui, tombol online
   ditolak 403 dengan `kyc_status`
7. Aplikasi ditutup selama order berjalan lalu dibuka lagi:
   `GET /api/notifications` menampilkan yang terlewat
