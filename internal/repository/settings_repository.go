package repository

import (
	"context"
	"encoding/json"
	"log"
	"strconv"
	"time"

	"openjek-backend/internal/models"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

const settingsCacheKey = "dynamic_settings"
const settingsCacheTTL = 5 * time.Minute

// SettingsRepository — membaca & menulis pengaturan dinamis dari DB, di-cache ke Redis
type SettingsRepository struct {
	db  *gorm.DB
	rdb *redis.Client
}

func NewSettingsRepository(db *gorm.DB, rdb *redis.Client) *SettingsRepository {
	return &SettingsRepository{db: db, rdb: rdb}
}

// GetAll — ambil semua settings (dari Redis cache, fallback ke DB)
func (r *SettingsRepository) GetAll(ctx context.Context) (map[string]string, error) {
	// Coba ambil dari Redis cache
	if r.rdb != nil {
		cached, err := r.rdb.Get(ctx, settingsCacheKey).Result()
		if err == nil {
			var settings map[string]string
			if err := json.Unmarshal([]byte(cached), &settings); err == nil {
				return settings, nil
			}
		}
	}

	// Cache miss → ambil dari database
	return r.refreshCache(ctx)
}

// Get — ambil satu setting berdasarkan key
func (r *SettingsRepository) Get(ctx context.Context, key string) string {
	all, err := r.GetAll(ctx)
	if err != nil {
		return ""
	}
	return all[key]
}

// GetFloat — helper untuk mengambil nilai float
func (r *SettingsRepository) GetFloat(ctx context.Context, key string, defaultVal float64) float64 {
	val := r.Get(ctx, key)
	if val == "" {
		return defaultVal
	}
	f, err := strconv.ParseFloat(val, 64)
	if err != nil {
		return defaultVal
	}
	return f
}

// GetBool — helper untuk mengambil nilai bool
func (r *SettingsRepository) GetBool(ctx context.Context, key string, defaultVal bool) bool {
	val := r.Get(ctx, key)
	if val == "" {
		return defaultVal
	}
	return val == "true" || val == "1"
}

// Set — update satu setting (dari Admin Dashboard), langsung invalidasi cache
func (r *SettingsRepository) Set(ctx context.Context, key, value string) error {
	result := r.db.WithContext(ctx).
		Model(&models.DynamicSetting{}).
		Where("key = ?", key).
		Update("value", value)

	if result.Error != nil {
		return result.Error
	}

	// Hapus cache agar dibaca ulang dari DB
	if r.rdb != nil {
		r.rdb.Del(ctx, settingsCacheKey)
	}
	log.Printf("[Settings] Updated key=%s value=%s, cache invalidated", key, value)
	return nil
}

// Seed — isi settings default jika belum ada, dan buang kunci yang sudah tidak
// dipakai kode.
//
// Nilai yang sudah ada tidak ditimpa: admin yang menyetel tarif tidak boleh
// kehilangan setelannya setiap kali server restart. Sebaliknya, kunci pada
// models.ObsoleteSettings dihapus supaya halaman pengaturan tidak menampilkan
// kolom yang tidak lagi berpengaruh pada apa pun.
func (r *SettingsRepository) Seed() {
	ctx := context.Background()
	for _, s := range models.DefaultSettings {
		var count int64
		r.db.Model(&models.DynamicSetting{}).Where("key = ?", s.Key).Count(&count)
		if count == 0 {
			r.db.Create(&s)
		}
	}

	if len(models.ObsoleteSettings) > 0 {
		result := r.db.Where("key IN ?", models.ObsoleteSettings).
			Delete(&models.DynamicSetting{})
		if result.Error != nil {
			log.Printf("[Settings] Failed to remove obsolete keys: %v", result.Error)
		} else if result.RowsAffected > 0 {
			log.Printf("[Settings] Removed %d obsolete key(s)", result.RowsAffected)
		}
	}

	log.Println("[Settings] Default settings seeded")
	r.refreshCache(ctx)
}

// ListRecords — ambil semua baris setting lengkap beserta metadata (type, group,
// description) untuk halaman pengaturan Admin Dashboard.
func (r *SettingsRepository) ListRecords(ctx context.Context) ([]models.DynamicSetting, error) {
	var records []models.DynamicSetting
	if err := r.db.WithContext(ctx).Order("key asc").Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

func (r *SettingsRepository) refreshCache(ctx context.Context) (map[string]string, error) {
	var records []models.DynamicSetting
	if err := r.db.WithContext(ctx).Find(&records).Error; err != nil {
		return nil, err
	}

	settings := make(map[string]string, len(records))
	for _, s := range records {
		settings[s.Key] = s.Value
	}

	// Simpan ke Redis dengan TTL 5 menit
	if r.rdb != nil {
		data, _ := json.Marshal(settings)
		r.rdb.Set(ctx, settingsCacheKey, data, settingsCacheTTL)
	}

	return settings, nil
}
