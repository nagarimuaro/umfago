# Panduan Deployment & Konfigurasi VPS UmfaGo

Repositori ini disiapkan untuk arsitektur terisolasi dengan 2 subdomain:
1. **API Backend & WebSocket**: `umfa-core.fazalabs.sbs`
2. **Dashboard Web Admin (SvelteKit)**: `umfa.fazalabs.sbs`

---

## 📖 Panduan Setup Server Manual untuk Agent / SysAdmin

Sesuai instruksi untuk menjaga keamanan server VPS yang sudah menjalankan banyak aplikasi lain, **otomasi skrip tidak dijalankan**.

Seluruh panduan langkah-demi-langkah (SOP) dengan aturan keselamatan ketat telah ditulis di:
👉 **[deploy/MANUAL_SETUP_VPS.md](deploy/MANUAL_SETUP_VPS.md)**

Silakan berikan file tersebut ke Agent atau tim Anda untuk diikuti secara manual dan hati-hati.

---

## 🔒 Fitur Keamanan Terintegrasi

- **CORS API Terbuka untuk Localhost**:
  Endpoint `https://umfa-core.fazalabs.sbs/api/` mendukung panggilan lintas origin (CORS) dari semua port development lokal (`http://localhost:*`, `http://127.0.0.1:*`) serta domain admin `https://umfa.fazalabs.sbs`.
- **Eksklusi Android**:
  Folder `android/**` diabaikan 100% oleh `.github/workflows/deploy.yml`. Perubahan aplikasi mobile tidak akan memicu deploy ataupun membebani VPS.
- **Isolasi Penuh**:
  - Berkas server tersimpan rapi di `/var/www/umfago/`.
  - Service terisolasi di `umfago-backend.service`.
  - Database terisolasi di database `openjek` dengan user `openjek_user`.
  - Virtual host Nginx terpisah: [`deploy/nginx-umfa-core.conf`](deploy/nginx-umfa-core.conf) dan [`deploy/nginx-umfa-admin.conf`](deploy/nginx-umfa-admin.conf).
