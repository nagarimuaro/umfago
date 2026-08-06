package config

import (
	"log"
	"os"
	"strings"
)

type Config struct {
	Port                 string
	DatabaseDSN          string
	RedisURL             string
	RedisPassword        string
	RabbitMQURL          string
	JWTSecret            string
	MidtransServerKey    string
	MidtransClientKey    string
	MidtransIsProduction bool
	AllowedWSOrigins     []string
	UploadDir            string
}

// LoadConfig — baca konfigurasi dari environment.
//
// Nilai rahasia (JWT_SECRET, DATABASE_URL, dan kunci Midtrans saat production)
// tidak punya default. Server sengaja menolak start bila belum di-set: default
// yang diam-diam terpakai di production adalah cara paling umum sebuah backend
// berakhir dengan secret yang bisa ditebak siapa saja.
func LoadConfig() *Config {
	var missing []string

	requireEnv := func(key string) string {
		val := strings.TrimSpace(os.Getenv(key))
		if val == "" {
			missing = append(missing, key)
		}
		return val
	}

	optionalEnv := func(key, fallback string) string {
		if val := strings.TrimSpace(os.Getenv(key)); val != "" {
			return val
		}
		return fallback
	}

	port := optionalEnv("PORT", "8080")
	dsn := requireEnv("DATABASE_URL")
	jwtSecret := requireEnv("JWT_SECRET")

	redisURL := optionalEnv("REDIS_URL", "localhost:6379")
	redisPassword := os.Getenv("REDIS_PASSWORD")
	rabbitURL := optionalEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

	midtransIsProd := os.Getenv("MIDTRANS_IS_PRODUCTION") == "true"
	midtransServerKey := strings.TrimSpace(os.Getenv("MIDTRANS_SERVER_KEY"))
	midtransClientKey := strings.TrimSpace(os.Getenv("MIDTRANS_CLIENT_KEY"))

	// Direktori penyimpanan berkas unggahan. Bukan rahasia, jadi boleh punya
	// default; yang penting nilainya tidak pernah berasal dari permintaan HTTP.
	uploadDir := optionalEnv("UPLOAD_DIR", "./uploads")

	if midtransIsProd && midtransServerKey == "" {
		missing = append(missing, "MIDTRANS_SERVER_KEY (wajib saat MIDTRANS_IS_PRODUCTION=true)")
	}

	// Origin yang boleh membuka koneksi WebSocket. Kosong = tolak semua kecuali
	// permintaan tanpa header Origin (klien non-browser seperti aplikasi Android).
	var allowedOrigins []string
	if raw := strings.TrimSpace(os.Getenv("ALLOWED_WS_ORIGINS")); raw != "" {
		for _, o := range strings.Split(raw, ",") {
			if o = strings.TrimSpace(o); o != "" {
				allowedOrigins = append(allowedOrigins, o)
			}
		}
	}

	if len(missing) > 0 {
		log.Fatalf(
			"Konfigurasi wajib belum di-set: %s\n"+
				"Salin .env.example menjadi .env lalu isi nilainya, atau set variabel tersebut di environment.",
			strings.Join(missing, ", "),
		)
	}

	if len(jwtSecret) < 32 {
		log.Fatalf("JWT_SECRET terlalu pendek (%d karakter). Gunakan minimal 32 karakter acak, "+
			"misalnya hasil dari: openssl rand -hex 32", len(jwtSecret))
	}

	if !midtransIsProd && midtransServerKey == "" {
		log.Println("[Config] MIDTRANS_SERVER_KEY kosong — endpoint top up berjalan dalam mode simulasi (tanpa pembayaran nyata).")
	}

	log.Println("Configuration loaded successfully.")

	return &Config{
		Port:                 port,
		DatabaseDSN:          dsn,
		RedisURL:             redisURL,
		RedisPassword:        redisPassword,
		RabbitMQURL:          rabbitURL,
		JWTSecret:            jwtSecret,
		MidtransServerKey:    midtransServerKey,
		MidtransClientKey:    midtransClientKey,
		MidtransIsProduction: midtransIsProd,
		AllowedWSOrigins:     allowedOrigins,
		UploadDir:            uploadDir,
	}
}
