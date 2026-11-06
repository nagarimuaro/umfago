package test

import (
	"context"
	"errors"
	"testing"

	"openjek-backend/internal/models"
	"openjek-backend/internal/repository"
	"openjek-backend/internal/testutil"

	"gorm.io/gorm"
)

func TestRepository_WalletCreditAndDebit(t *testing.T) {
	db := testutil.NewTestDB(t)
	walletRepo := repository.NewWalletRepository()

	// 1. Buat user dengan saldo awal 0
	user := models.User{
		Name:     "Dompet User",
		Email:    "wallet_repo_user@test.com",
		Balance:  0,
		IsActive: true,
	}
	db.Create(&user)

	// 2. Credit 50.000 IDR
	err := db.Transaction(func(tx *gorm.DB) error {
		_, err := walletRepo.Credit(tx, repository.Entry{
			UserID: user.ID,
			Amount: 50000,
			Type:   models.TxTypeDeposit,
			Note:   "Top up saldo",
		})
		return err
	})
	if err != nil {
		t.Fatalf("Credit failed: %v", err)
	}

	var afterCredit models.User
	db.First(&afterCredit, user.ID)
	if afterCredit.Balance != 50000 {
		t.Errorf("expected balance 50000, got %f", afterCredit.Balance)
	}

	// 3. Debit 20.000 IDR (sukses)
	err = db.Transaction(func(tx *gorm.DB) error {
		_, err := walletRepo.Debit(tx, repository.Entry{
			UserID: user.ID,
			Amount: 20000,
			Type:   models.TxTypePayment,
			Note:   "Bayar order",
		})
		return err
	})
	if err != nil {
		t.Fatalf("Debit failed: %v", err)
	}

	var afterDebit models.User
	db.First(&afterDebit, user.ID)
	if afterDebit.Balance != 30000 {
		t.Errorf("expected balance 30000, got %f", afterDebit.Balance)
	}

	// 4. Debit 40.000 IDR tanpa min_balance khusus (gagal saldo tidak cukup)
	err = db.Transaction(func(tx *gorm.DB) error {
		_, err := walletRepo.Debit(tx, repository.Entry{
			UserID: user.ID,
			Amount: 40000,
			Type:   models.TxTypePayment,
		})
		return err
	})
	if !errors.Is(err, repository.ErrInsufficientBalance) {
		t.Errorf("expected ErrInsufficientBalance, got %v", err)
	}

	// 5. Debit dengan min_balance negatif (-20.000) -> saldo akhir -10.000 (sukses)
	err = db.Transaction(func(tx *gorm.DB) error {
		_, err := walletRepo.Debit(tx, repository.Entry{
			UserID:     user.ID,
			Amount:     40000,
			Type:       models.TxTypeFee,
			MinBalance: -20000,
		})
		return err
	})
	if err != nil {
		t.Fatalf("expected allowed negative balance for commission, got error: %v", err)
	}

	var afterMinus models.User
	db.First(&afterMinus, user.ID)
	if afterMinus.Balance != -10000 {
		t.Errorf("expected balance -10000, got %f", afterMinus.Balance)
	}
}

func TestRepository_SettingsSetAndGet(t *testing.T) {
	db := testutil.NewTestDB(t)
	repo := repository.NewSettingsRepository(db, nil)
	ctx := context.Background()

	// Update setting yang sudah di-seed
	if err := repo.Set(ctx, "fare.per_km_price_idr", "5500"); err != nil {
		t.Fatalf("failed to set setting: %v", err)
	}

	val := repo.Get(ctx, "fare.per_km_price_idr")
	if val != "5500" {
		t.Errorf("expected 5500, got %s", val)
	}

	floatPrice := repo.GetFloat(ctx, "fare.per_km_price_idr", 3000)
	if floatPrice != 5500.0 {
		t.Errorf("expected float price 5500.0, got %f", floatPrice)
	}

	// GetFloat fallback
	floatVal := repo.GetFloat(ctx, "non_existent_float", 42.5)
	if floatVal != 42.5 {
		t.Errorf("expected fallback 42.5, got %f", floatVal)
	}

	// GetBool fallback
	boolVal := repo.GetBool(ctx, "non_existent_bool", true)
	if !boolVal {
		t.Error("expected fallback true")
	}
}

func TestRepository_LocationNilSafe(t *testing.T) {
	var repo *repository.LocationRepository
	ctx := context.Background()

	// Memanggil method pada nil repository tidak boleh panik
	if err := repo.UpdateDriverLocation(ctx, 1, -0.9471, 100.4172); err != nil {
		t.Errorf("expected nil error on nil repo, got %v", err)
	}

	drivers, err := repo.FindNearestDrivers(ctx, -0.9471, 100.4172, 5.0, 10)
	if err != nil || drivers != nil {
		t.Errorf("expected nil result on nil repo, got %v, %v", drivers, err)
	}
}
