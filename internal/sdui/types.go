package sdui

// ─── Component Types ──────────────────────────────────────────────────────────
// Ini adalah "kosa kata" komponen UI yang dimengerti oleh aplikasi Android.
// Setiap komponen baru yang ditambahkan di sini TIDAK memerlukan update APK.

type ComponentType string

const (
	TypeScreen      ComponentType = "Screen"
	TypeStack       ComponentType = "Stack" // layout vertikal
	TypeRow         ComponentType = "Row"   // layout horizontal
	TypeText        ComponentType = "Text"
	TypeButton      ComponentType = "Button"
	TypeBanner      ComponentType = "Banner"      // banner promo
	TypeMap         ComponentType = "Map"         // peta interaktif
	TypeBottomSheet ComponentType = "BottomSheet" // panel bawah
	TypeInput       ComponentType = "Input"
	TypeDivider     ComponentType = "Divider"
	TypeSpacer      ComponentType = "Spacer"
	TypeBadge       ComponentType = "Badge"
)

// Component — unit terkecil UI yang bisa dirender oleh Android
type Component struct {
	Type     ComponentType          `json:"type"`
	ID       string                 `json:"id,omitempty"`
	Props    map[string]interface{} `json:"props,omitempty"`  // style, label, color, dll
	Action   *Action                `json:"action,omitempty"` // apa yang terjadi saat diklik
	Children []Component            `json:"children,omitempty"`
}

// Action — aksi yang dieksekusi oleh klien saat komponen diinteraksikan
type Action struct {
	Type    string                 `json:"type"` // "navigate", "api_call", "open_map", "ws_subscribe"
	Payload map[string]interface{} `json:"payload,omitempty"`
}

// Screen — respons lengkap dari SDUI endpoint
type Screen struct {
	Version    string      `json:"version"`    // untuk cache busting di klien
	Screen     string      `json:"screen"`     // nama layar: "home", "booking", "profile"
	Components []Component `json:"components"` // daftar komponen yang harus dirender
}
