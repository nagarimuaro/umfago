package test

import (
	"testing"
	"time"

	"openjek-backend/internal/auth"
)

func TestJWT_GenerateAndValidateAccessToken(t *testing.T) {
	svc := auth.NewJWTService("my-super-secret-key-32-chars-long!")

	token, err := svc.GenerateAccessToken(42, "user@example.com", "customer")
	if err != nil {
		t.Fatalf("GenerateAccessToken failed: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty token")
	}

	claims, err := svc.ValidateAccessToken(token)
	if err != nil {
		t.Fatalf("ValidateAccessToken failed: %v", err)
	}

	if claims.UserID != 42 {
		t.Errorf("expected UserID 42, got %d", claims.UserID)
	}
	if claims.Email != "user@example.com" {
		t.Errorf("expected email user@example.com, got %s", claims.Email)
	}
	if claims.Role != "customer" {
		t.Errorf("expected role customer, got %s", claims.Role)
	}
	if claims.Issuer != "openjek-backend" {
		t.Errorf("expected issuer openjek-backend, got %s", claims.Issuer)
	}
}

func TestJWT_ValidateWithWrongSecret(t *testing.T) {
	svc1 := auth.NewJWTService("my-super-secret-key-32-chars-long!")
	svc2 := auth.NewJWTService("different-secret-key-32-chars-long!")

	token, err := svc1.GenerateAccessToken(10, "admin@example.com", "admin.super")
	if err != nil {
		t.Fatalf("GenerateAccessToken failed: %v", err)
	}

	_, err = svc2.ValidateAccessToken(token)
	if err == nil {
		t.Fatal("expected validation error with different secret key, got nil")
	}
}

func TestJWT_ValidateMalformedToken(t *testing.T) {
	svc := auth.NewJWTService("my-super-secret-key-32-chars-long!")

	_, err := svc.ValidateAccessToken("this-is-not-a-valid-jwt")
	if err == nil {
		t.Fatal("expected error for malformed token, got nil")
	}
}

func TestJWT_RefreshTokenGenerationAndHash(t *testing.T) {
	svc := auth.NewJWTService("my-super-secret-key-32-chars-long!")

	raw1, hashed1, exp1, err := svc.GenerateRefreshToken()
	if err != nil {
		t.Fatalf("GenerateRefreshToken failed: %v", err)
	}
	if len(raw1) != 128 { // 64 bytes hex-encoded = 128 chars
		t.Errorf("expected 128 hex chars for raw refresh token, got %d", len(raw1))
	}
	if exp1.Before(time.Now()) {
		t.Errorf("expected expiration in the future, got %v", exp1)
	}

	raw2, hashed2, _, err := svc.GenerateRefreshToken()
	if err != nil {
		t.Fatalf("second GenerateRefreshToken failed: %v", err)
	}
	if raw1 == raw2 {
		t.Fatal("expected distinct random refresh tokens, got identical tokens")
	}

	// Verify HashRefreshToken is deterministic
	hashDirect := auth.HashRefreshToken(raw1)
	if hashDirect != hashed1 {
		t.Errorf("HashRefreshToken(%s) = %s, expected %s", raw1, hashDirect, hashed1)
	}
	if hashed1 == hashed2 {
		t.Fatal("expected different hashes for different tokens")
	}
}

func TestJWT_TTLGetters(t *testing.T) {
	svc := auth.NewJWTService("my-super-secret-key-32-chars-long!")
	if svc.AccessTokenTTL() != 15*time.Minute {
		t.Errorf("expected 15m access token TTL, got %v", svc.AccessTokenTTL())
	}
	if svc.RefreshTokenTTL() != 30*24*time.Hour {
		t.Errorf("expected 30d refresh token TTL, got %v", svc.RefreshTokenTTL())
	}
}

