package sdui

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"

	"openjek-backend/internal/repository"
)

// screenVersion — sidik jari isi layar, dipakai klien untuk cache busting.
//
// Nilainya diturunkan dari isi komponen, bukan dari waktu pembuatan. Versi
// berbasis timestamp berubah pada setiap permintaan, sehingga klien membuang
// cache-nya terus-menerus dan menggambar ulang layar yang sebenarnya sama.
// Dengan sidik jari isi, versi hanya berubah saat UI-nya memang berubah.
//
// encoding/json mengurutkan kunci map, jadi hasilnya stabil antar proses.
func screenVersion(prefix string, components []Component) string {
	data, err := json.Marshal(components)
	if err != nil {
		// Isi tidak bisa diserialisasi: pakai penanda tetap agar klien tetap
		// menerima layar, sekalipun tanpa manfaat cache.
		return prefix + "-unversioned"
	}
	sum := sha256.Sum256(data)
	return prefix + "-" + hex.EncodeToString(sum[:6])
}

// Builder — membangun struktur JSON UI berdasarkan settings dinamis
type Builder struct {
	settings *repository.SettingsRepository
}

func NewBuilder(settings *repository.SettingsRepository) *Builder {
	return &Builder{settings: settings}
}

// BuildHomeScreen — halaman utama Rider (peta + booking panel)
func (b *Builder) BuildHomeScreen(ctx context.Context) Screen {
	s := b.settings
	primaryColor := s.Get(ctx, "ui.primary_color")
	bannerText := s.Get(ctx, "ui.home_banner_text")
	bannerColor := s.Get(ctx, "ui.home_banner_color")
	driverModeEnabled := s.GetBool(ctx, "ui.driver_mode_enabled", true)
	maintenanceMode := s.GetBool(ctx, "app.maintenance_mode", false)
	farePerKm := s.GetFloat(ctx, "fare.per_km_price_idr", 3000)

	components := []Component{}

	// ── Banner Promosi (hanya tampil jika ada teks) ──────────────────────
	if bannerText != "" {
		components = append(components, Component{
			Type: TypeBanner,
			ID:   "home_promo_banner",
			Props: map[string]interface{}{
				"text":            bannerText,
				"backgroundColor": bannerColor,
				"textColor":       primaryColor,
			},
		})
	}

	// ── Peta Interaktif ──────────────────────────────────────────────────
	components = append(components, Component{
		Type: TypeMap,
		ID:   "main_map",
		Props: map[string]interface{}{
			"initialZoom": 15,
			"markerColor": primaryColor,
			"darkMode":    true,
		},
	})

	// ── Bottom Sheet: Panel Pemesanan ────────────────────────────────────
	bookingPanel := Component{
		Type: TypeBottomSheet,
		ID:   "booking_panel",
		Props: map[string]interface{}{
			"snapPoints":      []int{200, 400},
			"backgroundColor": "#0a0a10",
		},
		Children: []Component{
			{
				Type: TypeText,
				Props: map[string]interface{}{
					"text":       "Mau ke mana?",
					"style":      "heading",
					"color":      "#e0e0ea",
					"fontFamily": "Syne",
				},
			},
			{
				Type: TypeInput,
				ID:   "pickup_input",
				Props: map[string]interface{}{
					"placeholder": "Lokasi jemput",
					"icon":        "map-pin",
					"iconColor":   primaryColor,
				},
				Action: &Action{Type: "open_location_picker", Payload: map[string]interface{}{"type": "pickup"}},
			},
			{
				Type: TypeInput,
				ID:   "dropoff_input",
				Props: map[string]interface{}{
					"placeholder": "Tujuan",
					"icon":        "flag",
					"iconColor":   "#ff6b6b",
				},
				Action: &Action{Type: "open_location_picker", Payload: map[string]interface{}{"type": "dropoff"}},
			},
			{
				Type: TypeText,
				Props: map[string]interface{}{
					"text":  fmt.Sprintf("Rp %.0f / km", farePerKm),
					"style": "caption",
					"color": "#8888a2",
				},
			},
		},
	}

	// ── Tombol Pesan (disabled saat maintenance) ─────────────────────────
	if maintenanceMode {
		bookingPanel.Children = append(bookingPanel.Children, Component{
			Type: TypeBanner,
			ID:   "maintenance_banner",
			Props: map[string]interface{}{
				"text":            "Aplikasi sedang dalam pemeliharaan. Harap tunggu.",
				"backgroundColor": "#24243a",
				"textColor":       "#8888a2",
			},
		})
	} else {
		bookingPanel.Children = append(bookingPanel.Children, Component{
			Type: TypeButton,
			ID:   "book_ride_button",
			Props: map[string]interface{}{
				"label":           "Pesan Ojek",
				"backgroundColor": primaryColor,
				"textColor":       "#06060a",
				"style":           "glow",
				"glowColor":       primaryColor,
				"fontFamily":      "Outfit",
			},
			Action: &Action{
				Type: "api_call",
				Payload: map[string]interface{}{
					"method":   "POST",
					"endpoint": "/api/orders",
					"useForm":  "booking_form",
				},
			},
		})
	}

	components = append(components, bookingPanel)

	// ── Tombol Switch Driver Mode ─────────────────────────────────────────
	if driverModeEnabled {
		components = append(components, Component{
			Type: TypeButton,
			ID:   "switch_mode_button",
			Props: map[string]interface{}{
				"label":           "Beralih ke Mode Driver",
				"backgroundColor": "transparent",
				"textColor":       "#8888a2",
				"borderColor":     "#24243a",
				"style":           "outline",
			},
			Action: &Action{
				Type: "api_call",
				Payload: map[string]interface{}{
					"method":   "PUT",
					"endpoint": "/api/users/active-role",
					"body":     map[string]string{"role": "driver_motorcycle"},
				},
			},
		})
	}

	return Screen{
		Version:    screenVersion("home", components),
		Screen:     "home",
		Components: components,
	}
}

// BuildDriverScreen — halaman utama Driver (terima order + lokasi)
func (b *Builder) BuildDriverScreen(ctx context.Context) Screen {
	primaryColor := b.settings.Get(ctx, "ui.primary_color")

	components := []Component{
		{
			Type: TypeMap,
			ID:   "driver_map",
			Props: map[string]interface{}{
				"darkMode":     true,
				"trackingMode": true, // mode ini aktifkan update lokasi otomatis via WS
			},
		},
		{
			Type: TypeBottomSheet,
			ID:   "driver_panel",
			Props: map[string]interface{}{
				"snapPoints":      []int{150},
				"backgroundColor": "#0a0a10",
			},
			Children: []Component{
				{
					Type: TypeText,
					Props: map[string]interface{}{
						"text":  "Anda online dan siap menerima order",
						"style": "body",
						"color": "#e0e0ea",
					},
				},
				{
					Type: TypeBadge,
					ID:   "online_badge",
					Props: map[string]interface{}{
						"label":           "Online",
						"backgroundColor": primaryColor,
						"textColor":       "#06060a",
					},
				},
			},
		},
	}

	return Screen{
		Version:    screenVersion("driver", components),
		Screen:     "driver_home",
		Components: components,
	}
}
