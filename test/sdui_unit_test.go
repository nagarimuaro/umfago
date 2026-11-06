package test

import (
	"context"
	"testing"

	"openjek-backend/internal/repository"
	"openjek-backend/internal/sdui"
	"openjek-backend/internal/testutil"
)

func TestSDUI_BuildHomeScreen(t *testing.T) {
	db := testutil.NewTestDB(t)
	settingsRepo := repository.NewSettingsRepository(db, nil)
	builder := sdui.NewBuilder(settingsRepo)

	ctx := context.Background()
	screen := builder.BuildHomeScreen(ctx)

	if screen.Screen != "home" {
		t.Errorf("expected screen name home, got %s", screen.Screen)
	}
	if screen.Version == "" {
		t.Error("expected non-empty screen version")
	}
	if len(screen.Components) == 0 {
		t.Fatal("expected at least one component in home screen")
	}

	// Verify main_map and booking_panel exist
	var hasMap, hasBottomSheet bool
	for _, comp := range screen.Components {
		if comp.Type == sdui.TypeMap && comp.ID == "main_map" {
			hasMap = true
		}
		if comp.Type == sdui.TypeBottomSheet && comp.ID == "booking_panel" {
			hasBottomSheet = true
			if len(comp.Children) == 0 {
				t.Error("expected booking panel to have children input/button components")
			}
		}
	}

	if !hasMap {
		t.Error("missing main_map component")
	}
	if !hasBottomSheet {
		t.Error("missing booking_panel component")
	}
}

func TestSDUI_ScreenVersionStability(t *testing.T) {
	db := testutil.NewTestDB(t)
	settingsRepo := repository.NewSettingsRepository(db, nil)
	builder := sdui.NewBuilder(settingsRepo)

	ctx := context.Background()
	s1 := builder.BuildHomeScreen(ctx)
	s2 := builder.BuildHomeScreen(ctx)

	if s1.Version != s2.Version {
		t.Errorf("expected stable version across identical calls: %s != %s", s1.Version, s2.Version)
	}
}
