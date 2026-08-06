package repository

import (
	"context"
	"fmt"
	"strconv"

	"github.com/redis/go-redis/v9"
)

const driverGeoKey = "active_drivers"

type LocationRepository struct {
	rdb *redis.Client
}

func NewLocationRepository(rdb *redis.Client) *LocationRepository {
	return &LocationRepository{rdb: rdb}
}

// UpdateDriverLocation — simpan/update posisi driver ke Redis GEOADD
// Dipanggil setiap kali driver mengirim "location_update" via WebSocket
func (r *LocationRepository) UpdateDriverLocation(ctx context.Context, driverID uint, lat, lon float64) error {
	return r.rdb.GeoAdd(ctx, driverGeoKey, &redis.GeoLocation{
		Name:      strconv.FormatUint(uint64(driverID), 10),
		Longitude: lon,
		Latitude:  lat,
	}).Err()
}

// FindNearestDrivers — cari driver aktif dalam radius X km dari titik (lat, lon)
// Menggunakan GEOSEARCH (pengganti GEORADIUS yang sudah deprecated).
// Parameter count membatasi jumlah kandidat yang dikembalikan.
func (r *LocationRepository) FindNearestDrivers(ctx context.Context, lat, lon float64, radiusKm float64, count int) ([]uint, error) {
	if count <= 0 {
		count = 10
	}

	results, err := r.rdb.GeoSearch(ctx, driverGeoKey, &redis.GeoSearchQuery{
		Longitude:  lon,
		Latitude:   lat,
		Radius:     radiusKm,
		RadiusUnit: "km",
		Sort:       "ASC", // terdekat lebih dulu
		Count:      count,
	}).Result()
	if err != nil {
		return nil, fmt.Errorf("geosearch failed: %w", err)
	}

	driverIDs := make([]uint, 0, len(results))
	for _, name := range results {
		id, err := strconv.ParseUint(name, 10, 64)
		if err == nil {
			driverIDs = append(driverIDs, uint(id))
		}
	}
	return driverIDs, nil
}

// RemoveDriver — hapus driver dari set aktif (saat offline)
func (r *LocationRepository) RemoveDriver(ctx context.Context, driverID uint) error {
	return r.rdb.ZRem(ctx, driverGeoKey, strconv.FormatUint(uint64(driverID), 10)).Err()
}
