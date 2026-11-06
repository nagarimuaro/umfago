#!/usr/bin/env bash
set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

BACKEND_PID=""
FRONTEND_PID=""
EXPO_PID=""

cleanup() {
	echo ""
	echo "[stop] Menghentikan semua service..."
	[[ -n "$EXPO_PID" ]] && kill "$EXPO_PID" 2>/dev/null || true
	[[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
	[[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null || true
	wait 2>/dev/null || true
	echo "[stop] Selesai."
}
trap cleanup EXIT INT TERM

# ── 1. Cek & Jalankan Android Emulator / Simulator ──────────────────────────
start_emulator() {
	echo "[check] Memeriksa Android Emulator / Simulator..."
	local running_devices
	running_devices=$(adb devices 2>/dev/null | grep -v "List of devices attached" | grep -w "device" || true)

	if [[ -n "$running_devices" ]]; then
		echo "[info] Simulator/perangkat Android sudah terdeteksi aktif:"
		echo "$running_devices"
		return 0
	fi

	echo "[info] Belum ada emulator aktif. Mencari daftar AVD..."
	local avd=""
	if command -v emulator >/dev/null 2>&1; then
		avd=$(emulator -list-avds 2>/dev/null | head -n 1 || true)
	elif command -v emulator.exe >/dev/null 2>&1; then
		avd=$(emulator.exe -list-avds 2>/dev/null | head -n 1 || true)
	fi

	if [[ -z "$avd" ]]; then
		echo "[warn] Tidak ditemukan AVD emulator. Pastikan Android Studio/AVD sudah terkonfigurasi."
		echo "[info] Melanjutkan startup tanpa membuka emulator otomatis."
		return 0
	fi

	echo "[start] Menyalakan emulator: $avd..."
	if command -v emulator >/dev/null 2>&1; then
		nohup emulator -avd "$avd" >/dev/null 2>&1 &
	elif command -v emulator.exe >/dev/null 2>&1; then
		nohup emulator.exe -avd "$avd" >/dev/null 2>&1 &
	fi

	echo "[wait] Menunggu emulator terhubung ke adb..."
	local count=0
	while [[ $count -lt 40 ]]; do
		if adb devices 2>/dev/null | grep -w "device" | grep -v "List of devices" >/dev/null; then
			echo "[ready] Emulator Android ($avd) siap digunakan!"
			return 0
		fi
		sleep 2
		count=$((count + 2))
	done
	echo "[warn] Emulator masih proses booting di background, melanjutkan..."
}

start_emulator

# ── 2. Jalankan Backend Go ──────────────────────────────────────────────────
echo "[start] Menjalankan backend Go (http://localhost:8080)..."
go run ./cmd/api &
BACKEND_PID=$!

# ── 3. Jalankan Dashboard Admin (Opsional) ──────────────────────────────────
if [[ -d "frontend/admin" ]]; then
	echo "[start] Menjalankan dashboard Admin Svelte (http://localhost:5173)..."
	npm --prefix frontend/admin run dev &
	FRONTEND_PID=$!
fi

# ── 4. Jalankan Expo Mobile App untuk Simulator ─────────────────────────────
if [[ -d "android/mobile-app" ]]; then
	echo "[start] Menjalankan Expo Mobile App ke Android Simulator..."
	sleep 2
	npm --prefix android/mobile-app run android &
	EXPO_PID=$!
fi

echo ""
echo "=========================================================="
echo "  [READY] LangJek Backend & Simulator Berjalan!"
echo "  - Backend API:  http://localhost:8080"
echo "  - Admin Web:    http://localhost:5173"
echo "  - Mobile App:   Expo Android Simulator"
echo "  Tekan Ctrl+C untuk menghentikan semua proses."
echo "=========================================================="
echo ""

wait
