# start.ps1 — Menjalankan Emulator Android, Backend Go, Admin Web, dan Mobile App
$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Memulai LangJek Backend & Simulator" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# ── 1. Cek & Jalankan Emulator Android ──────────────────────────────────────
$devices = adb devices 2>$null | Select-String "device$"
if (-not $devices) {
    Write-Host "[check] Emulator belum aktif, mencari AVD..." -ForegroundColor Yellow
    $avd = (emulator -list-avds 2>$null | Select-Object -First 1)
    if ($avd) {
        Write-Host "[start] Menyalakan emulator: $avd..." -ForegroundColor Green
        Start-Process "emulator" -ArgumentList "-avd", "$avd"
        Write-Host "[wait] Menunggu emulator terhubung..." -ForegroundColor Yellow
        $timeout = 0
        while ($timeout -lt 30) {
            Start-Sleep -Seconds 2
            $timeout += 2
            $devices = adb devices 2>$null | Select-String "device$"
            if ($devices) {
                Write-Host "[ready] Simulator Android ($avd) terhubung!" -ForegroundColor Green
                break
            }
        }
    } else {
        Write-Host "[warn] Tidak ditemukan AVD emulator." -ForegroundColor DarkYellow
    }
} else {
    Write-Host "[info] Perangkat Android sudah aktif." -ForegroundColor Green
}

# ── 2. Jalankan Backend Go ──────────────────────────────────────────────────
Write-Host "[start] Menjalankan Go backend (http://localhost:8080)..." -ForegroundColor Green
$backendProc = Start-Process "go" -ArgumentList "run", "./cmd/api" -PassThru

# ── 3. Jalankan Admin Web ───────────────────────────────────────────────────
$adminProc = $null
if (Test-Path "frontend/admin") {
    Write-Host "[start] Menjalankan Admin Dashboard (http://localhost:5173)..." -ForegroundColor Green
    $adminProc = Start-Process "npm" -ArgumentList "--prefix", "frontend/admin", "run", "dev" -PassThru
}

# ── 4. Jalankan Mobile App (Expo) ───────────────────────────────────────────
$mobileProc = $null
if (Test-Path "android/mobile-app") {
    Write-Host "[start] Menjalankan Expo Mobile App untuk Android..." -ForegroundColor Green
    Start-Sleep -Seconds 2
    $mobileProc = Start-Process "npm" -ArgumentList "--prefix", "android/mobile-app", "run", "android" -PassThru
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  [READY] Semua service telah dijalankan!" -ForegroundColor Cyan
Write-Host "  - Backend API: http://localhost:8080" -ForegroundColor Cyan
Write-Host "  - Admin Web:   http://localhost:5173" -ForegroundColor Cyan
Write-Host "  - Mobile App:  Expo Android Simulator" -ForegroundColor Cyan
Write-Host "  Tekan Enter untuk menghentikan semua service..." -ForegroundColor Gray
Write-Host "==========================================================`n" -ForegroundColor Cyan

try {
    [void][System.Console]::ReadLine()
} finally {
    Write-Host "`n[stop] Menghentikan semua proses..." -ForegroundColor Yellow
    if ($backendProc -and -not $backendProc.HasExited) { Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue }
    if ($adminProc -and -not $adminProc.HasExited) { Stop-Process -Id $adminProc.Id -Force -ErrorAction SilentlyContinue }
    if ($mobileProc -and -not $mobileProc.HasExited) { Stop-Process -Id $mobileProc.Id -Force -ErrorAction SilentlyContinue }
    Write-Host "[stop] Selesai." -ForegroundColor Green
}
