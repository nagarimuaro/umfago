package test

import (
	"context"
	"testing"
	"time"

	"openjek-backend/internal/pricing"
	"openjek-backend/internal/repository"
	"openjek-backend/internal/testutil"
)

func newTestCalculator(t *testing.T) *pricing.Calculator {
	t.Helper()
	db := testutil.NewTestDB(t)
	repo := repository.NewSettingsRepository(db, nil)
	return pricing.NewCalculator(repo)
}

func TestPricing_QuoteDefaultRules(t *testing.T) {
	calc := newTestCalculator(t)
	ctx := context.Background()

	// 1. Perjalanan pendek di bawah minDistance (1.5 km < 3.0 km)
	quoteShort := calc.Quote(ctx, 1.5)
	if !quoteShort.MinDistanceApplied {
		t.Error("expected MinDistanceApplied to be true for 1.5km")
	}
	if quoteShort.ChargedDistanceKm != 3.0 {
		t.Errorf("expected charged distance 3.0km, got %f", quoteShort.ChargedDistanceKm)
	}
	if quoteShort.Total != 9000.0 { // 3km * 3000
		t.Errorf("expected total 9000 IDR, got %f", quoteShort.Total)
	}
	if quoteShort.MinFare != 9000.0 {
		t.Errorf("expected min fare 9000 IDR, got %f", quoteShort.MinFare)
	}

	// 2. Perjalanan panjang di atas minDistance (10 km > 3.0 km)
	quoteLong := calc.Quote(ctx, 10.0)
	if quoteLong.MinDistanceApplied {
		t.Error("expected MinDistanceApplied to be false for 10km")
	}
	if quoteLong.ChargedDistanceKm != 10.0 {
		t.Errorf("expected charged distance 10.0km, got %f", quoteLong.ChargedDistanceKm)
	}
	if quoteLong.Total != 30000.0 { // 10km * 3000
		t.Errorf("expected total 30000 IDR, got %f", quoteLong.Total)
	}
}

func TestPricing_SplitCalculations(t *testing.T) {
	calc := newTestCalculator(t)
	ctx := context.Background()

	// Split ride biasa (default platform fee 20%)
	gross := 20000.0
	customerFee := 1000.0
	split := calc.Split(ctx, gross, customerFee, false)

	if split.Gross != 20000.0 {
		t.Errorf("expected gross 20000, got %f", split.Gross)
	}
	if split.PlatformFee != 4000.0 { // 20% dari 20000
		t.Errorf("expected platform fee 4000, got %f", split.PlatformFee)
	}
	if split.DriverNet != 16000.0 { // 20000 - 4000
		t.Errorf("expected driver net 16000, got %f", split.DriverNet)
	}
	if split.MerchantFee != 0.0 {
		t.Errorf("expected merchant fee 0, got %f", split.MerchantFee)
	}
	if split.CompanyRevenue != 5000.0 { // platformFee (4000) + customerFee (1000)
		t.Errorf("expected company revenue 5000, got %f", split.CompanyRevenue)
	}

	// Split order merchant (makanan)
	splitMerchant := calc.Split(ctx, gross, customerFee, true)
	if splitMerchant.CompanyRevenue < split.PlatformFee {
		t.Errorf("company revenue should include platform fee, got %f", splitMerchant.CompanyRevenue)
	}
}

func TestPricing_MatchingHelpers(t *testing.T) {
	calc := newTestCalculator(t)
	ctx := context.Background()

	radius := calc.SearchRadiusKm(ctx)
	if radius <= 0 {
		t.Errorf("expected positive search radius, got %f", radius)
	}

	candidates := calc.MaxDriverCandidates(ctx)
	if candidates <= 0 {
		t.Errorf("expected positive candidate count, got %d", candidates)
	}

	timeout := calc.OfferTimeout(ctx)
	if timeout <= 0*time.Second {
		t.Errorf("expected positive offer timeout, got %v", timeout)
	}

	minBalance := calc.MinBalance(ctx)
	if minBalance > 0 {
		t.Errorf("expected min balance to be negative or zero, got %f", minBalance)
	}
}

func TestPricing_CustomerFee(t *testing.T) {
	calc := newTestCalculator(t)
	ctx := context.Background()

	fee, pct := calc.CustomerFee(ctx, 15000.0)
	if fee < 0 || pct < 0 {
		t.Errorf("expected non-negative customer fee and percent, got %f, %f", fee, pct)
	}
}
