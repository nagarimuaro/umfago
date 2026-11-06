package test

import (
	"os"
	"testing"

	"openjek-backend/internal/config"
)

func TestConfig_LoadConfigSuccess(t *testing.T) {
	// Ensure minimal required env variables are present
	if os.Getenv("DATABASE_URL") == "" {
		t.Setenv("DATABASE_URL", "host=localhost user=postgres password=1234lima dbname=openjek port=5432 sslmode=disable")
	}
	if os.Getenv("JWT_SECRET") == "" {
		t.Setenv("JWT_SECRET", "super-secret-jwt-key-minimum-32-chars-long")
	}

	cfg := config.LoadConfig()
	if cfg == nil {
		t.Fatal("expected non-nil config")
	}
	if cfg.Port == "" {
		t.Error("expected non-empty Port")
	}
	if cfg.DatabaseDSN == "" {
		t.Error("expected non-empty DatabaseDSN")
	}
	if len(cfg.JWTSecret) < 32 {
		t.Errorf("expected JWTSecret >= 32 chars, got %d", len(cfg.JWTSecret))
	}
	if cfg.UploadDir == "" {
		t.Error("expected non-empty UploadDir")
	}
}

func TestConfig_AllowedWSOriginsParsing(t *testing.T) {
	t.Setenv("ALLOWED_WS_ORIGINS", "http://localhost:5173, http://localhost:8081 , http://example.com")
	if os.Getenv("DATABASE_URL") == "" {
		t.Setenv("DATABASE_URL", "host=localhost user=postgres password=1234lima dbname=openjek port=5432 sslmode=disable")
	}
	if os.Getenv("JWT_SECRET") == "" {
		t.Setenv("JWT_SECRET", "super-secret-jwt-key-minimum-32-chars-long")
	}

	cfg := config.LoadConfig()
	if len(cfg.AllowedWSOrigins) != 3 {
		t.Fatalf("expected 3 allowed origins, got %d", len(cfg.AllowedWSOrigins))
	}
	if cfg.AllowedWSOrigins[0] != "http://localhost:5173" {
		t.Errorf("expected first origin http://localhost:5173, got %s", cfg.AllowedWSOrigins[0])
	}
	if cfg.AllowedWSOrigins[1] != "http://localhost:8081" {
		t.Errorf("expected second origin http://localhost:8081, got %s", cfg.AllowedWSOrigins[1])
	}
}

