# SOP & Panduan Manual Setup VPS UmfaGo (Multi-App Safe)

Dokumen ini adalah **Standard Operating Procedure (SOP)** langkah-demi-langkah yang disiapkan khusus untuk **Agent / System Administrator** agar dapat melakukan instalasi dan konfigurasi UmfaGo di server VPS secara **sangat hati-hati dan aman**, tanpa merusak atau mengganggu aplikasi lain yang sudah berjalan di VPS.

---

## 📌 Ringkasan Parameter & Topologi

- **Domain API Backend & WebSocket**: `umfa-core.fazalabs.sbs`
- **Domain Web Admin / Frontend**: `umfa.fazalabs.sbs`
- **Kebijakan CORS**: Diizinkan penuh dari `http://localhost:*`, `http://127.0.0.1:*` (untuk pengembangan lokal) dan `https://umfa.fazalabs.sbs` (dashboard admin produksi).
- **Lokasi Direktori Terisolasi**: `/var/www/umfago/`
- **Nama Service Systemd**: `umfago-backend.service`
- **Port Internal Go Daemon**: `8080` (dapat diubah bila port 8080 sudah digunakan oleh aplikasi lain)
- **Database PostgreSQL**: `openjek` (User: `openjek_user`)

---

## ⚠️ 5 Aturan Emas Keselamatan Server Bersama (Shared VPS)

1. **JANGAN JALANKAN `apt upgrade`**: Meng-upgrade paket sistem secara global dapat merusak versi PHP, Python, Node, atau libc yang dibutuhkan aplikasi lain.
2. **JANGAN HAPUS FILE VIRTUAL HOST APAPUN DI NGINX**: Jangan pernah menghapus `/etc/nginx/sites-enabled/default` atau file `.conf` lain yang sudah aktif melayani domain lain.
3. **JANGAN RESTART POSTGRESQL / REDIS**: Cukup buat user dan database baru secara isolated. Jangan merestart service database agar koneksi aplikasi lain tidak terputus.
4. **SELALU JALANKAN `sudo nginx -t` SEBELUM RELOAD**: Pastikan sintaks Nginx valid. Gunakan `systemctl reload nginx` (bukan `restart`) agar koneksi aktif web lain tidak terputus.
5. **JANGAN MEMAKSAKAN `ufw enable`**: Jika firewall UFW sebelumnya tidak aktif, biarkan tidak aktif agar tidak memblokir port kustom aplikasi lain.

---

## 🛠️ Langkah-demi-Langkah Setup Server

### Langkah 0: Audit Pra-Pemasangan (Pre-Flight Audit)

Masuk ke server via SSH:
```bash
ssh user@IP_VPS_ANDA
```

Jalankan perintah audit berikut untuk memastikan port dan kondisi server:
```bash
# 1. Periksa apakah port 8080 sudah dipakai oleh aplikasi lain
sudo ss -tuln | grep -E ':(8080|5432|6379)'
```
*Catatan:*
- Jika port `8080` **sudah dipakai**, pilih port alternatif bebas (misal `8085` atau `8090`).
- Port PostgreSQL `5432` dan Redis `6379` biasanya sudah aktif bila server sudah memakainya.

```bash
# 2. Periksa virtual host Nginx yang sudah ada
ls -la /etc/nginx/sites-enabled/
```
*Pastikan tidak menyentuh file-file yang terdaftar di atas.*

---

### Langkah 1: Buat Struktur Folder Terisolasi

Buat folder khusus UmfaGo tanpa menyentuh folder aplikasi lain di `/var/www/`:

```bash
sudo mkdir -p /var/www/umfago/bin
sudo mkdir -p /var/www/umfago/admin
sudo mkdir -p /var/www/umfago/uploads
sudo mkdir -p /var/www/umfago/deploy

sudo chown -R www-data:www-data /var/www/umfago
sudo chmod -R 755 /var/www/umfago
```

---

### Langkah 2: Buat Database PostgreSQL (Terisolasi)

Buat user dan database khusus UmfaGo tanpa mengubah database lain:

```bash
# Generate password acak aman
DB_PASS=$(openssl rand -hex 16)
echo "Password Database UmfaGo Anda: $DB_PASS"
# Simpan password ini untuk berkas .env di Langkah 3
```

Masuk dan eksekusi SQL melalui user postgres:
```bash
# Buat role/user openjek_user (jika belum ada)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = 'openjek_user'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE USER openjek_user WITH ENCRYPTED PASSWORD '$DB_PASS';"

# Buat database openjek (jika belum ada)
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'openjek'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE openjek OWNER openjek_user;"

# Berikan hak akses hanya ke database openjek
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE openjek TO openjek_user;"
sudo -u postgres psql -d openjek -c "GRANT ALL ON SCHEMA public TO openjek_user;"
```

---

### Langkah 3: Konfigurasi Berkas `/var/www/umfago/.env`

Buat berkas konfigurasi environment produksi:

```bash
sudo nano /var/www/umfago/.env
```

Tempelkan konfigurasi berikut (sesuaikan `PORT` jika 8080 sudah dipakai, dan ganti `PASSWORD_POSTGRES_DARI_LANGKAH_2`):

```dotenv
PORT=8080
GIN_MODE=release

DATABASE_URL=postgres://openjek_user:PASSWORD_POSTGRES_DARI_LANGKAH_2@localhost:5432/openjek?sslmode=disable
REDIS_URL=localhost:6379
REDIS_PASSWORD=
RABBITMQ_URL=

# Token Keamanan JWT (Minimal 32 karakter)
# Buat baru via: openssl rand -hex 32
JWT_SECRET=GANTI_DENGAN_HASIL_OPENSSL_RAND_HEX_32

# Origin yang diizinkan untuk koneksi WebSocket realtime
ALLOWED_WS_ORIGINS=https://umfa.fazalabs.sbs,http://umfa.fazalabs.sbs,https://umfa-core.fazalabs.sbs,http://localhost:5173,http://localhost:3000,http://localhost:8081,http://127.0.0.1:8081

# Direktori Media Uploads
UPLOAD_DIR=/var/www/umfago/uploads
DEMO_PASSWORD=password123
```

Amankan hak akses berkas:
```bash
sudo chown www-data:www-data /var/www/umfago/.env
sudo chmod 600 /var/www/umfago/.env
```

---

### Langkah 4: Daftarkan Service Systemd (`umfago-backend.service`)

Buat unit service systemd:

```bash
sudo nano /etc/systemd/system/umfago-backend.service
```

Tempelkan isi unit berikut:
```ini
[Unit]
Description=UmfaGo Backend API & WebSocket Service
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/umfago
ExecStart=/var/www/umfago/bin/umfago-api
Restart=always
RestartSec=5s

# Limit resource
LimitNOFILE=65535

# Environment variables
Environment=GIN_MODE=release
EnvironmentFile=/var/www/umfago/.env

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=umfago-api

[Install]
WantedBy=multi-user.target
```

Reload daemon dan aktifkan service (service akan mulai berjalan begitu binary `umfago-api` diunggah oleh CI/CD GitHub Actions):
```bash
sudo systemctl daemon-reload
sudo systemctl enable umfago-backend.service
```

---

### Langkah 5: Konfigurasi Virtual Host Nginx untuk 2 Domain

Kita membuat 2 file virtual host terpisah agar rapi dan independen:

#### A. Domain Backend API (`umfa-core.fazalabs.sbs`)
```bash
sudo nano /etc/nginx/sites-available/umfa-core.conf
```
Tempelkan:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name umfa-core.fazalabs.sbs;

    client_max_body_size 25M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    location /uploads/ {
        alias /var/www/umfago/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files $uri =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8080/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    location /health {
        proxy_pass http://127.0.0.1:8080/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://127.0.0.1:8080/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### B. Domain Web Admin (`umfa.fazalabs.sbs`)
```bash
sudo nano /etc/nginx/sites-available/umfa-admin.conf
```
Tempelkan:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name umfa.fazalabs.sbs;

    client_max_body_size 25M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    root /var/www/umfago/admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8080/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    location /uploads/ {
        alias /var/www/umfago/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files $uri =404;
    }
}
```

#### C. Aktifkan Kedua Virtual Host & Uji Sintaks
```bash
sudo ln -sf /etc/nginx/sites-available/umfa-core.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/umfa-admin.conf /etc/nginx/sites-enabled/

# Uji keamanan sintaks Nginx:
sudo nginx -t
```
> [!IMPORTANT]
> Pastikan output menampilkan `syntax is ok` dan `test is successful`.
> Setelah itu, reload Nginx secara graceful tanpa memutus koneksi aplikasi lain:
> ```bash
> sudo systemctl reload nginx
> ```

---

### Langkah 6: Pasang Sertifikat SSL Gratis (Certbot Let's Encrypt)

Pastikan DNS Record A untuk `umfa-core.fazalabs.sbs` dan `umfa.fazalabs.sbs` sudah mengarah ke IP publik VPS Anda.
Lalu pasang SSL:

```bash
sudo certbot --nginx -d umfa-core.fazalabs.sbs
sudo certbot --nginx -d umfa.fazalabs.sbs
```
*Certbot hanya akan mengonfigurasi blok server untuk kedua domain tersebut dan tidak akan mengganggu sertifikat SSL situs lain.*

---

### Langkah 7: Pengaturan GitHub Actions CI/CD Secrets

Buka repositori GitHub UmfaGo:
1. Buka **Settings** -> **Secrets and variables** -> **Actions**
2. Daftarkan repository secret berikut:
   - `VPS_HOST`: Alamat IP Publik VPS Anda
   - `VPS_USER`: User SSH (misal `root` atau `ubuntu`)
   - `VPS_SSH_KEY`: Private Key SSH yang diizinkan masuk ke VPS
   - `VPS_PORT`: *(Opsional, default 22)*
   - `VPS_TARGET_DIR`: `/var/www/umfago`

> **Catatan Proteksi**: File `.github/workflows/deploy.yml` sudah memiliki aturan `paths-ignore: ['android/**']`, sehingga perubahan apapun pada aplikasi Android tidak akan pernah memicu deployment ke server.

---

### Langkah 8: Pengujian & Validasi

Setelah push pertama ke branch `master`/`main` berhasil dideploy oleh GitHub Actions:

```bash
# 1. Cek status daemon backend
sudo systemctl status umfago-backend

# 2. Uji endpoint health check API
curl -i https://umfa-core.fazalabs.sbs/health

# 3. Uji preflight CORS dari localhost
curl -i -X OPTIONS https://umfa-core.fazalabs.sbs/api/ping \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET"
# Respon harus mengembalikan HTTP 204 No Content dengan header:
# Access-Control-Allow-Origin: http://localhost:5173
# Access-Control-Allow-Credentials: true

# 4. Uji Dashboard Admin Web
curl -I https://umfa.fazalabs.sbs
# Respon harus mengembalikan HTTP 200 OK
```

