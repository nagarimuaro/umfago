package models

import "time"

// ServiceCatalog — jenis layanan (Ride Motor, Ride Car, GoFood, GoSend, dll).
type ServiceCatalog struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	Code          string    `gorm:"type:varchar(50);uniqueIndex;not null" json:"code"`
	Name          string    `gorm:"type:varchar(100);not null" json:"name"`
	Category      string    `gorm:"type:varchar(50);not null" json:"category"` // ride, delivery, food
	VehicleType   string    `gorm:"type:varchar(30);not null" json:"vehicle_type"`
	PerKmPriceIDR float64   `gorm:"default:3000" json:"per_km_price_idr"`
	MinDistanceKm float64   `gorm:"default:3" json:"min_distance_km"`
	PlatformFeePct float64  `gorm:"default:20" json:"platform_fee_percent"`
	CustomerFeePct float64  `gorm:"default:0" json:"customer_fee_percent"`
	IsActive      bool      `gorm:"index" json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// City — konfigurasi kota untuk operasional multi-city (§16).
type City struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Code        string    `gorm:"type:varchar(30);uniqueIndex;not null" json:"code"`
	Name        string    `gorm:"type:varchar(100);not null" json:"name"`
	Province    string    `gorm:"type:varchar(100)" json:"province"`
	Timezone    string    `gorm:"type:varchar(50);default:'Asia/Jakarta'" json:"timezone"`
	Currency    string    `gorm:"type:varchar(10);default:'IDR'" json:"currency"`
	CenterLat   float64   `json:"center_lat"`
	CenterLon   float64   `json:"center_lon"`
	RadiusKm    float64   `gorm:"default:25" json:"radius_km"`
	IsActive    bool      `gorm:"index" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Branch — cabang operasional di dalam kota (§16).
type Branch struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	CityID      uint      `gorm:"index;not null" json:"city_id"`
	Code        string    `gorm:"type:varchar(30);uniqueIndex;not null" json:"code"`
	Name        string    `gorm:"type:varchar(100);not null" json:"name"`
	Address     string    `gorm:"type:text" json:"address"`
	Phone       string    `gorm:"type:varchar(30)" json:"phone"`
	ManagerName string    `gorm:"type:varchar(100)" json:"manager_name"`
	IsActive    bool      `gorm:"index" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// GeoZone — area layanan, zona harga/surge, geofence terlarang, atau titik jemput (§8).
type GeoZone struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	CityID          uint      `gorm:"index" json:"city_id"`
	Name            string    `gorm:"type:varchar(100);not null" json:"name"`
	ZoneType        string    `gorm:"type:varchar(30);index;not null" json:"zone_type"` // service_area, surge_zone, restricted, pickup_point
	CenterLat       float64   `json:"center_lat"`
	CenterLon       float64   `json:"center_lon"`
	RadiusKm        float64   `gorm:"default:2" json:"radius_km"`
	SurgeMultiplier float64   `gorm:"default:1" json:"surge_multiplier"`
	ExtraFeeIDR     float64   `gorm:"default:0" json:"extra_fee_idr"`
	Notes           string    `gorm:"type:text" json:"notes"`
	IsActive        bool      `gorm:"index" json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// SupportTicket — tiket bantuan CS & sengketa perjalanan (§14).
type SupportTicket struct {
	ID             uint       `gorm:"primaryKey" json:"id"`
	UserID         uint       `gorm:"index;not null" json:"user_id"`
	OrderUUID      string     `gorm:"type:varchar(100);index" json:"order_uuid"`
	Category       string     `gorm:"type:varchar(50);index" json:"category"` // ride_issue, payment, safety, account, dispute
	Priority       string     `gorm:"type:varchar(20);default:'medium';index" json:"priority"` // low, medium, high, critical
	Status         string     `gorm:"type:varchar(20);default:'open';index" json:"status"`     // open, in_progress, resolved, closed
	Subject        string     `gorm:"type:varchar(200);not null" json:"subject"`
	Description    string     `gorm:"type:text" json:"description"`
	AssignedTo     *uint      `gorm:"index" json:"assigned_to"`
	ResolutionNote string     `gorm:"type:text" json:"resolution_note"`
	ResolvedAt     *time.Time `json:"resolved_at"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// RiskCase — deteksi kecurangan & investigasi keamanan (§15).
type RiskCase struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	UserID      uint       `gorm:"index;not null" json:"user_id"`
	OrderUUID   string     `gorm:"type:varchar(100);index" json:"order_uuid"`
	RiskType    string     `gorm:"type:varchar(50);index" json:"risk_type"` // fake_gps, promo_abuse, self_order, abnormal_route, account_takeover
	Severity    string     `gorm:"type:varchar(20);default:'medium';index" json:"severity"` // low, medium, high, critical
	RiskScore   int        `gorm:"default:50" json:"risk_score"`
	Status      string     `gorm:"type:varchar(20);default:'open';index" json:"status"` // open, investigating, confirmed, dismissed
	Summary     string     `gorm:"type:text" json:"summary"`
	ActionTaken string     `gorm:"type:varchar(100)" json:"action_taken"`
	ReviewedBy  *uint      `json:"reviewed_by"`
	ReviewedAt  *time.Time `json:"reviewed_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// ApprovalRequest — alur persetujuan (maker-checker) untuk tindakan sensitif (§17.3).
type ApprovalRequest struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	Module      string     `gorm:"type:varchar(50);index;not null" json:"module"` // pricing, refund, payout, promo, role
	Action      string     `gorm:"type:varchar(100);not null" json:"action"`
	TargetID    string     `gorm:"type:varchar(100)" json:"target_id"`
	PayloadJSON string     `gorm:"type:text" json:"payload_json"`
	Reason      string     `gorm:"type:text" json:"reason"`
	RequestedBy uint       `gorm:"index" json:"requested_by"`
	Status      string     `gorm:"type:varchar(20);default:'pending';index" json:"status"` // pending, approved, rejected
	ReviewedBy  *uint      `json:"reviewed_by"`
	ReviewNote  string     `gorm:"type:text" json:"review_note"`
	ReviewedAt  *time.Time `json:"reviewed_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

// AuditLog — jejak audit untuk seluruh tindakan back-office (§21).
type AuditLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	ActorID    uint      `gorm:"index" json:"actor_id"`
	ActorEmail string    `gorm:"type:varchar(150)" json:"actor_email"`
	ActorRole  string    `gorm:"type:varchar(50)" json:"actor_role"`
	Module     string    `gorm:"type:varchar(50);index" json:"module"`
	Action     string    `gorm:"type:varchar(80);index" json:"action"`
	TargetType string    `gorm:"type:varchar(50)" json:"target_type"`
	TargetID   string    `gorm:"type:varchar(100)" json:"target_id"`
	Summary    string    `gorm:"type:text" json:"summary"`
	IPAddress  string    `gorm:"type:varchar(64)" json:"ip_address"`
	UserAgent  string    `gorm:"type:varchar(255)" json:"user_agent"`
	CreatedAt  time.Time `gorm:"index" json:"created_at"`
}

// FeatureFlag — sakelar fitur & integrasi sistem (§19/§20).
type FeatureFlag struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Key         string    `gorm:"type:varchar(80);uniqueIndex;not null" json:"key"`
	Name        string    `gorm:"type:varchar(120);not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	Enabled     bool      `gorm:"index" json:"enabled"`
	RolloutPct  int       `gorm:"default:100" json:"rollout_pct"`
	UpdatedAt   time.Time `json:"updated_at"`
}

var DefaultServices = []ServiceCatalog{
	{Code: "ride_motorcycle", Name: "Ojek Motor", Category: "ride", VehicleType: "motorcycle", PerKmPriceIDR: 3000, MinDistanceKm: 3, PlatformFeePct: 20, CustomerFeePct: 0, IsActive: true},
	{Code: "ride_car", Name: "Taksi Mobil", Category: "ride", VehicleType: "car", PerKmPriceIDR: 5000, MinDistanceKm: 3, PlatformFeePct: 20, CustomerFeePct: 0, IsActive: true},
	{Code: "food_delivery", Name: "Pesan-Antar Makanan", Category: "food", VehicleType: "motorcycle", PerKmPriceIDR: 3000, MinDistanceKm: 2, PlatformFeePct: 20, CustomerFeePct: 5, IsActive: true},
	{Code: "kurir_instant", Name: "Kurir Instan", Category: "delivery", VehicleType: "motorcycle", PerKmPriceIDR: 3500, MinDistanceKm: 3, PlatformFeePct: 15, CustomerFeePct: 0, IsActive: true},
}

var DefaultCities = []City{
	{Code: "PDG", Name: "Padang", Province: "Sumatera Barat", Timezone: "Asia/Jakarta", Currency: "IDR", CenterLat: -0.9471, CenterLon: 100.4172, RadiusKm: 25, IsActive: true},
	{Code: "PYK", Name: "Payakumbuh", Province: "Sumatera Barat", Timezone: "Asia/Jakarta", Currency: "IDR", CenterLat: -0.2192, CenterLon: 100.6339, RadiusKm: 15, IsActive: true},
	{Code: "JKT", Name: "Jakarta", Province: "DKI Jakarta", Timezone: "Asia/Jakarta", Currency: "IDR", CenterLat: -6.2088, CenterLon: 106.8456, RadiusKm: 40, IsActive: true},
}

var DefaultFeatureFlags = []FeatureFlag{
	{Key: "routing.valhalla_enabled", Name: "Valhalla Routing Engine", Description: "Gunakan mesin rute Valhalla untuk estimasi rute peta", Enabled: true, RolloutPct: 100},
	{Key: "geocoding.nominatim_enabled", Name: "Nominatim / Photon Geocoding", Description: "Pencarian alamat berbasis OpenStreetMap", Enabled: true, RolloutPct: 100},
	{Key: "pricing.surge_enabled", Name: "Dynamic Surge Pricing", Description: "Pengali tarif otomatis pada zona permintaan tinggi", Enabled: false, RolloutPct: 0},
	{Key: "fraud.auto_flag_enabled", Name: "Deteksi Kecurangan Otomatis", Description: "Tandai otomatis order mencurigakan (self-order / promo abuse)", Enabled: true, RolloutPct: 100},
	{Key: "food.marketplace_enabled", Name: "Katalog Produk Merchant", Description: "Aktifkan katalog dan peringkat eksplorasi produk merchant", Enabled: true, RolloutPct: 100},
}
