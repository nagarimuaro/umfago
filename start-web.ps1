# PowerShell script untuk menjalankan backend dan web frontend tanpa emulator
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

$processes = @()

function Stop-AllServices {
    Write-Host "`n[stop] Menghentikan semua service web & backend..." -ForegroundColor Yellow
    foreach ($p in $processes) {
        if ($p -and -not $p.HasExited) {
            try {
                Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
            } catch {}
        }
    }
    Write-Host "[stop] Selesai." -ForegroundColor Green
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "        LangJek Web & Backend Development Runner          " -ForegroundColor Cyan
Write-Host "                (Khusus Tanpa Emulator)                   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Cek .env
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "[setup] Berkas .env belum ditemukan, menyalin dari .env.example..." -ForegroundColor Cyan
        Copy-Item ".env.example" ".env"
    }
}

# 2. Go dependencies
Write-Host "[deps] Memeriksa & menginstal dependensi Go backend..." -ForegroundColor Cyan
go mod download

# 3. Frontend Admin dependencies
if (Test-Path "frontend/admin") {
    if (-not (Test-Path "frontend/admin/node_modules") -or ($args -contains "--install")) {
        Write-Host "[deps] Menginstal dependensi Frontend Admin (npm install)..." -ForegroundColor Cyan
        npm --prefix frontend/admin install
    } else {
        Write-Host "[deps] Dependensi Frontend Admin sudah terpasang." -ForegroundColor Green
    }
}

# 4. Mobile App Expo dependencies
if (Test-Path "android/mobile-app") {
    if (-not (Test-Path "android/mobile-app/node_modules") -or ($args -contains "--install")) {
        Write-Host "[deps] Menginstal dependensi Mobile App Expo Web (npm install)..." -ForegroundColor Cyan
        npm --prefix android/mobile-app install
    } else {
        Write-Host "[deps] Dependensi Mobile App Expo sudah terpasang." -ForegroundColor Green
    }
}

try {
    # 5. Jalankan Backend Go
    Write-Host "`n[start] Menjalankan backend Go API (http://localhost:8080)..." -ForegroundColor Green
    $backendProc = Start-Process go -ArgumentList "run ./cmd/api" -PassThru -NoNewWindow
    $processes += $backendProc
    Start-Sleep -Seconds 2

    # 6. Jalankan Frontend Admin
    if (Test-Path "frontend/admin") {
        Write-Host "[start] Menjalankan Dashboard Admin (http://localhost:5173)..." -ForegroundColor Green
        $adminProc = Start-Process npm -ArgumentList "--prefix frontend/admin run dev" -PassThru -NoNewWindow
        $processes += $adminProc
    }

    # 7. Jalankan Expo Mobile Web
    if (Test-Path "android/mobile-app") {
        Write-Host "[start] Menjalankan Expo Mobile Web di Browser (http://localhost:8081)..." -ForegroundColor Green
        $expoProc = Start-Process npm -ArgumentList "--prefix android/mobile-app run web" -PassThru -NoNewWindow
        $processes += $expoProc
    }

    Write-Host "`n==========================================================" -ForegroundColor Cyan
    Write-Host "  [READY] Semua Layanan Web & Backend Berhasil Dijalankan!" -ForegroundColor Cyan
    Write-Host "  - Backend API:    http://localhost:8080" -ForegroundColor White
    Write-Host "  - Admin Web:      http://localhost:5173" -ForegroundColor White
    Write-Host "  - Mobile Web App: http://localhost:8081" -ForegroundColor White
    Write-Host "  (Tekan Ctrl+C untuk menghentikan semua proses)" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Cyan

    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Stop-AllServices
}
