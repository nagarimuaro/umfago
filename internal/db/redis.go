package db

import (
	"context"
	"log"

	"github.com/redis/go-redis/v9"
)

func NewRedisClient(addr string) *redis.Client {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: "", // no password set
		DB:       0,  // use default DB
	})

	// Test connection — Redis bersifat opsional (CLAUDE.md §14): bila tidak
	// tersedia, kembalikan nil supaya server tetap jalan dengan fallback DB.
	if _, err := rdb.Ping(context.Background()).Result(); err != nil {
		log.Printf("[Redis] Unavailable (%v) — berjalan tanpa cache Redis & indeks geospasial.", err)
		_ = rdb.Close()
		return nil
	}

	log.Println("Connected to Redis successfully")
	return rdb
}
