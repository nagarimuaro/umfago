# Roadmap Aplikasi Ojek

## Arsitektur

-   Backend: Go + Gorilla WebSocket
-   Database: PostgreSQL + PostGIS
-   Cache: Redis
-   Mobile: React Native (Passenger , Driver Merchant)
-   Maps: MapLibre + OpenStreetMap
-   Routing: Valhalla
-   Geocoding: Nominatim

## Fase 1 - MVP

### Passenger

-   Login/Register
-   Home Map
-   Pilih pickup & tujuan
-   Estimasi tarif
-   Order
-   Live tracking
-   Riwayat
-   Profil

### Driver

-   Login
-   Online/Offline
-   Terima/Tolak order
-   Navigasi
-   Mulai & selesai perjalanan
-   Riwayat
-   Pendapatan

## Fase 2 - Realtime

-   WebSocket
-   Driver location
-   Ride status
-   Chat
-   Push notification

## Fase 3 - Wallet

### Passenger

-   Top up
-   Bayar perjalanan
-   Refund

### Driver

-   Saldo
-   Bonus
-   Withdraw

### Admin

-   Komisi
-   Settlement

Tabel: - wallets - wallet_transactions - topups - withdrawals -
ride_payments - refunds

## Fase 4 - Pembayaran

-   Cash
-   QRIS
-   E-Wallet
-   Transfer Bank
-   Voucher & Promo

## Fase 5 - Admin Dashboard

-   Dashboard
-   Driver
-   Passenger
-   Ride
-   Tarif
-   Promo
-   Laporan
-   Live Driver

## Fase 6 - Skalabilitas

-   Nginx Load Balancer
-   Multi Go Server
-   Redis
-   PostgreSQL + PostGIS
-   Monitoring

## Fase 7 - Fitur Lanjutan

-   GoFood
-   GoSend
-   Multi-stop
-   Scheduled Ride
-   Rating
-   Referral
-   Loyalty
-   In-app Chat
-   SOS
-   Dynamic Pricing
