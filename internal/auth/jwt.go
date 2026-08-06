package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	// Role adalah role yang sedang AKTIF, bukan seluruh role milik user.
	// Satu akun bisa memegang beberapa role, tetapi hanya bertindak sebagai satu
	// role pada satu waktu.
	Role string `json:"role"`
	jwt.RegisteredClaims
}

type JWTService struct {
	secretKey       []byte
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
}

func NewJWTService(secretKey string) *JWTService {
	return &JWTService{
		secretKey:       []byte(secretKey),
		accessTokenTTL:  15 * time.Minute,    // Access token: 15 menit
		refreshTokenTTL: 30 * 24 * time.Hour, // Refresh token: 30 hari
	}
}

// AccessTokenTTL — masa berlaku access token
func (j *JWTService) AccessTokenTTL() time.Duration { return j.accessTokenTTL }

// RefreshTokenTTL — masa berlaku refresh token
func (j *JWTService) RefreshTokenTTL() time.Duration { return j.refreshTokenTTL }

// GenerateAccessToken - membuat JWT Access Token (15 menit)
func (j *JWTService) GenerateAccessToken(userID uint, email, activeRole string) (string, error) {
	claims := &Claims{
		UserID: userID,
		Email:  email,
		Role:   activeRole,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(j.accessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "openjek-backend",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secretKey)
}

// GenerateRefreshToken - membuat token random aman secara kriptografis.
// Mengembalikan token mentah (dikirim ke klien, tidak pernah disimpan) beserta
// hash-nya (yang disimpan di database) dan waktu kedaluwarsanya.
func (j *JWTService) GenerateRefreshToken() (raw string, hashed string, expiresAt time.Time, err error) {
	bytes := make([]byte, 64)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", time.Time{}, err
	}
	raw = hex.EncodeToString(bytes)
	return raw, HashRefreshToken(raw), time.Now().Add(j.refreshTokenTTL), nil
}

// HashRefreshToken — hash token untuk disimpan di database.
//
// SHA-256 tanpa salt sudah memadai di sini (berbeda dengan password): token
// dihasilkan dari 64 byte acak kriptografis, sehingga tidak rentan terhadap
// serangan kamus maupun rainbow table. Yang dicegah adalah bocornya isi tabel
// refresh_tokens berubah menjadi pengambilalihan sesi.
func HashRefreshToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

// ValidateAccessToken - memvalidasi JWT dan mengekstrak klaim
func (j *JWTService) ValidateAccessToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return j.secretKey, nil
	}, jwt.WithIssuer("openjek-backend"), jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
