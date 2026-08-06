# Perbaikan Dokumen + Aplikasi Android React Native

## Context

Dua pekerjaan yang diminta, dan urutannya mengikat: dokumen harus benar dulu,
baru aplikasi dibangun di atasnya.

**Masalah pertama — CLAUDE.md mendeskripsikan sistem tarif yang tidak ada.**
Dokumen masih memuat `fare.base_price_idr` ("tarif dasar") dan
`fare.min_fare_idr` ("tarif minimum") sebagai kunci setting, dan contoh response
`/api/fare/estimate` masih menampilkan `base_fare: 5000` dan
`distance_fee: 10200`. Di dalam kode, keduanya sudah dihapus:
`internal/models/setting.go:58-61` justru mendaftarkan kedua kunci itu sebagai
kunci usang yang **dibersihkan otomatis setiap server start**, dengan komentar
yang menyebut alasannya — tarif minimum adalah nilai turunan
(`min_distance_km × per_km_price`), jadi menyimpannya lagi berarti dua sumber
kebenaran. Rumus yang berlaku sekarang di `internal/pricing/pricing.go` tidak
punya tarif dasar sama sekali:

```
charged_distance = max(distance_km, fare.min_distance_km)
total            = round(charged_distance × fare.per_km_price_idr)
```

Perbaikan atas hal ini sempat dikerjakan lalu **ter-revert** — perlu dikerjakan
ulang dari awal, dan kali ini sekalian dengan bagian-bagian lain yang basi.

**Masalah kedua — belum ada aplikasi mobile sama sekali.** Tidak ada satu pun
berkas JS/TS di repositori; seluruhnya Go plus tujuh dokumen markdown. Bagian 10
CLAUDE.md sudah menetapkan stack dan struktur folder, tetapi belum ada kode.

Keduanya saling terikat: aplikasi Android dibangun dari kontrak API, dan
kontrak yang tertulis sekarang keliru pada bagian yang paling sering dipanggil
(estimasi tarif, pembuatan order). Membangun klien lebih dulu berarti menyalin
kekeliruan itu ke dalam kode TypeScript.

Ada juga satu hal yang harus beres sebelum perintah scaffolding apa pun
dijalankan: **repositori ini bukan git repository dan tidak punya `.gitignore`,
sementara `.env` berisi kredensial sungguhan ada di root.** `npx react-native
init` menulis ratusan berkas ke dalam pohon ini tanpa cara membatalkannya, dan
`.gitignore` yang ia hasilkan hanya mencakup subdirektori JS-nya sendiri — root
`.env` tetap terbuka.

---

## Bagian A — Pengaman sebelum menyentuh pohon berkas

Dikerjakan lebih dulu, sebelum langkah lain mana pun.

1. `git init` di root, lalu `.gitignore` root yang minimal mencakup:

   ```
   .env
   .env.*
   !.env.example
   uploads/
   coverage
   node_modules/
   android/app/build/
   android/.gradle/
   *.keystore
   !debug.keystore
   ```

2. Commit pertama atas keadaan sekarang (`git add -A && git commit`). Ini yang
   memberi titik balik bagi seluruh langkah berikutnya — tanpanya, penghapusan
   dokumen di Bagian B dan scaffolding di Bagian C sama-sama tidak bisa
   dibatalkan.

3. Pastikan `.env` benar-benar tidak ikut ter-track: `git status --porcelain`
   tidak boleh menyebutnya, dan `git log --stat -1` tidak boleh memuatnya.

---

## Bagian B — Menyamakan dokumen dengan kode

### B.1 Perbaikan CLAUDE.md

Sembilan tempat yang salah, semuanya sudah diverifikasi terhadap sumber:

| Bagian | Yang tertulis sekarang | Yang benar (sumber) |
|---|---|---|
| §6 tabel setting | `fare.base_price_idr`, `fare.min_fare_idr` | kunci sebenarnya di `pricing.go` (lihat di bawah) |
| §9.4 response estimasi | `base_fare`, `distance_fee`, `min_fare_applied` | 13 field dari `pricing.Quote` |
| §9.5 objek `fare` pada order | `{distance_km, base_fare, distance_fee, total, min_fare_applied}` | seluruh `pricing.Quote`, dengan `customer_fee` dihitung ulang setelah promo (`order_handler.go:336-355`) |
| §9.1 daftar field Order | kurang 6 field | tambah `vehicle_id`, `customer_fee`, `merchant_fee`, `currency`, `promo_id`, `review_note` |
| §8 jumlah route | 85 | pencacahan `server.go` menghasilkan **87** registrasi; angka final diambil dari `minimumRoutes` di `api_coverage_test.go` supaya dokumen dan test tidak berbeda pendapat |
| §12 Fase 2 & 7 | notifikasi/katalog "belum" | tabel notifikasi, katalog produk, unggah berkas sudah ada |
| §15 tabel test | tanpa test baru | tambah `chat_test.go` (5 kasus baru), `upload_test.go`, `product_test.go`, `merchant_product_test.go`; angka cakupan 65,1% sudah basi — diukur ulang atau dihapus |
| §16 tiga butir | "penyimpanan berkas belum ada", "push notification belum ada" | endpoint unggah sudah ada (KYC belum dipindahkan ke sana); notifikasi tersimpan di tabel + WebSocket, yang belum ada hanya FCM/APNs |
| §17 | tidak ada, padahal §9.10 dan §10.7 merujuknya | ditambahkan (lihat B.2) |

Kunci setting yang sebenarnya, dari `internal/pricing/pricing.go` dan
`internal/models/setting.go`:

```
fare.per_km_price_idr          3000      tarif per kilometer
fare.min_distance_km           3         jarak minimum yang ditagihkan
fare.platform_fee_percent      20        potongan dari pendapatan driver
fare.customer_fee_percent      0         biaya DITAMBAHKAN di atas tarif penumpang
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
