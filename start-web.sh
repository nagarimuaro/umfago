#!/usr/bin/env bash
set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

BACKEND_PID=""
FRONTEND_PID=""
EXPO_WEB_PID=""

cleanup() {
	echo ""
	echo "[stop] Menghentikan semua service web & backend..."
	[[ -n "$EXPO_WEB_PID" ]] && kill "$EXPO_WEB_PID" 2>/dev/null || true
	[[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
	[[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null || true
	wait 2>/dev/null || true
	echo "[stop] Selesai."
}
trap cleanup EXIT INT TERM

echo "=========================================================="
echo "        LangJek Web & Backend Development Runner          "
echo "                (Khusus Tanpa Emulator)                   "
echo "=========================================================="
echo ""

# ?? 1. Cek & Persiapkan Konfigurasi Lingkungan (.env) ?????????
if [[ ! -f ".env" ]]; then
	if [[ -f ".env.example" ]]; then
		echo "[setup] Berkas .env belum ditemukan, menyalin dari .env.example..."
		cp .env.example .env
	else
		echo "[warn] Berkas .env dan .env.example tidak ditemukan."
	fi
fi

# ?? 2. Instal Dependensi Backend Go ???????????????????????????
echo "[deps] Memeriksa & menginstal dependensi Go backend..."
go mod download
echo "[deps] Dependensi Go siap."

# ?? 3. Instal Dependensi Dashboard Admin SvelteKit ????????????
if [[ -d "frontend/admin" ]]; then
	if [[ ! -d "frontend/admin/node_modules" ]] || [[ "$1" == "--install" ]] || [[ "$1" == "-i" ]]; then
		echo "[deps] Menginstal dependensi Frontend Admin (npm install)..."
		npm --prefix frontend/admin install
	else
		echo "[deps] Dependensi Frontend Admin sudah terpasang."
	fi
fi

# ?? 4. Instal Dependensi Mobile-App Expo Web ??????????????????
if [[ -d "android/mobile-app" ]]; then
	if [[ ! -d "android/mobile-app/node_modules" ]] || [[ "$1" == "--install" ]] || [[ "$1" == "-i" ]]; then
		echo "[deps] Menginstal dependensi Mobile App Expo Web (npm install)..."
		npm --prefix android/mobile-app install
	else
		echo "[deps] Dependensi Mobile App Expo sudah terpasang."
	fi
fi

# ?? 5. Jalankan Backend Go ????????????????????????????????????
echo ""
echo "[start] Menjalankan backend Go API (http://localhost:8080)..."
go run ./cmd/api &
BACKEND_PID=$!
sleep 2

# ?? 6. Jalankan Frontend Admin (SvelteKit Web) ????????????????
if [[ -d "frontend/admin" ]]; then
	echo "[start] Menjalankan Dashboard Admin (http://localhost:5173)..."
	npm --prefix frontend/admin run dev &
	FRONTEND_PID=$!
fi

# ?? 7. Jalankan Expo Mobile Web (Browser Tanpa Emulator) ??????
if [[ -d "android/mobile-app" ]]; then
	echo "[start] Menjalankan Expo Mobile Web di Browser (http://localhost:8081)..."
	npm --prefix android/mobile-app run web &
	EXPO_WEB_PID=$!
fi

echo ""
echo "=========================================================="
echo "  [READY] Semua Layanan Web & Backend Berhasil Dijalankan!"
echo "  - Backend API:    http://localhost:8080"
echo "  - Admin Web:      http://localhost:5173"
echo "  - Mobile Web App: http://localhost:8081"
echo "  (Tekan Ctrl+C untuk menghentikan semua proses)"
echo "=========================================================="
echo ""

wait
