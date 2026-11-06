package test

import (
	"encoding/json"
	"net/http"
	"strconv"
	"testing"
	"time"

	"openjek-backend/internal/models"
	"openjek-backend/internal/repository"
	"openjek-backend/internal/testutil"
)

// TestNotification_Push_SavesAndReturnsRow — Push menyimpan baris dan mengembalikannya
func TestNotification_Push_SavesAndReturnsRow(t *testing.T) {
	db := testutil.NewTestDB(t)

	var user models.User
	db.Create(&models.User{
		Name:     "Alice",
		Email:    "alice@example.com",
		Phone:    "081234567890",
		Password: "hash",
		RoleCode: models.RoleCustomer,
	})
	db.Where("email = ?", "alice@example.com").First(&user)

	repo := repository.NewNotificationRepository(db, nil)
	repo.Push(user.ID, models.NotifOrderAccepted,
		"Driver found",
		"Driver is heading to your location.",
		map[string]any{"order_uuid": "abc-123"})

	var notif models.Notification
	if err := db.Where("user_id = ?", user.ID).First(&notif).Error; err != nil {
		t.Fatal("Notification not saved:", err)
	}

	if notif.Type != models.NotifOrderAccepted {
		t.Errorf("Type = %s, want %s", notif.Type, models.NotifOrderAccepted)
	}
	if notif.Title != "Driver found" {
		t.Errorf("Title = %s, want 'Driver found'", notif.Title)
	}
	if notif.ReadAt != nil {
		t.Errorf("ReadAt should be nil for new notification, got %v", notif.ReadAt)
	}
}

// TestNotification_List_OnlyOwnNotifications — daftar hanya berisi milik sendiri
func TestNotification_List_OnlyOwnNotifications(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	aliceToken := createUserWithRoleAndLoginInDB(t, db, router, "alice@example.com", models.RoleCustomer)
	createUserWithRoleAndLoginInDB(t, db, router, "bob@example.com", models.RoleCustomer)

	var alice, bob models.User
	db.Where("email = ?", "alice@example.com").First(&alice)
	db.Where("email = ?", "bob@example.com").First(&bob)

	repo := repository.NewNotificationRepository(db, nil)
	repo.Push(alice.ID, models.NotifOrderAccepted, "Alice notif", "Body", nil)
	repo.Push(bob.ID, models.NotifOrderAccepted, "Bob notif", "Body", nil)

	req := testutil.JSONRequest("GET", "/api/notifications", nil, aliceToken)
	w := testutil.Do(router, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Status = %d, want 200", w.Code)
	}

	var resp struct {
		Notifications []models.Notification `json:"notifications"`
	}
	json.NewDecoder(w.Body).Decode(&resp)

	if len(resp.Notifications) != 1 {
		t.Fatalf("Got %d notifications, want 1", len(resp.Notifications))
	}
	if resp.Notifications[0].Title != "Alice notif" {
		t.Errorf("Title = %s, want 'Alice notif'", resp.Notifications[0].Title)
	}
}

// TestNotification_UnreadFilter — ?unread=true menyaring yang sudah dibaca
func TestNotification_UnreadFilter(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "user@example.com", models.RoleCustomer)

	var user models.User
	db.Where("email = ?", "user@example.com").First(&user)

	repo := repository.NewNotificationRepository(db, nil)
	repo.Push(user.ID, models.NotifOrderAccepted, "Notif 1", "Body", nil)
	repo.Push(user.ID, models.NotifDriverArrived, "Notif 2", "Body", nil)

	// Tandai satu sebagai sudah dibaca
	var notif models.Notification
	db.Where("user_id = ?", user.ID).First(&notif)
	now := time.Now()
	db.Model(&notif).Update("read_at", now)

	req := testutil.JSONRequest("GET", "/api/notifications?unread=true", nil, token)
	w := testutil.Do(router, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Status = %d, want 200", w.Code)
	}

	var resp struct {
		Notifications []models.Notification `json:"notifications"`
	}
	json.NewDecoder(w.Body).Decode(&resp)

	if len(resp.Notifications) != 1 {
		t.Fatalf("Got %d unread, want 1", len(resp.Notifications))
	}
}

// TestNotification_MarkRead_OwnOnly — tidak bisa menandai milik orang lain
func TestNotification_MarkRead_OwnOnly(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	aliceToken := createUserWithRoleAndLoginInDB(t, db, router, "alice@example.com", models.RoleCustomer)
	createUserWithRoleAndLoginInDB(t, db, router, "bob@example.com", models.RoleCustomer)

	var bob models.User
	db.Where("email = ?", "bob@example.com").First(&bob)

	repo := repository.NewNotificationRepository(db, nil)
	repo.Push(bob.ID, models.NotifOrderAccepted, "Bob notif", "Body", nil)

	var bobNotif models.Notification
	db.Where("user_id = ?", bob.ID).First(&bobNotif)

	// Alice mencoba menandai notifikasi Bob
	req := testutil.JSONRequest("PUT", "/api/notifications/"+uintToString(bobNotif.ID)+"/read", nil, aliceToken)
	w := testutil.Do(router, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Status = %d, want 404 when marking other's notification", w.Code)
	}
}

// TestNotification_MarkAllRead — mengembalikan jumlah yang ditandai
func TestNotification_MarkAllRead(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "user@example.com", models.RoleCustomer)

	var user models.User
	db.Where("email = ?", "user@example.com").First(&user)

	repo := repository.NewNotificationRepository(db, nil)
	repo.Push(user.ID, models.NotifOrderAccepted, "N1", "Body", nil)
	repo.Push(user.ID, models.NotifDriverArrived, "N2", "Body", nil)
	repo.Push(user.ID, models.NotifTripStarted, "N3", "Body", nil)

	req := testutil.JSONRequest("PUT", "/api/notifications/read-all", nil, token)
	w := testutil.Do(router, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Status = %d, want 200", w.Code)
	}

	var resp struct {
		Marked int `json:"marked"`
	}
	json.NewDecoder(w.Body).Decode(&resp)

	if resp.Marked != 3 {
		t.Errorf("Marked = %d, want 3", resp.Marked)
	}

	// Unread count harus 0
	req = testutil.JSONRequest("GET", "/api/notifications/unread-count", nil, token)
	w = testutil.Do(router, req)
	var count struct {
		UnreadCount int `json:"unread_count"`
	}
	json.NewDecoder(w.Body).Decode(&count)
	if count.UnreadCount != 0 {
		t.Errorf("UnreadCount = %d after mark-all, want 0", count.UnreadCount)
	}
}

func uintToString(n uint) string {
	return strconv.FormatUint(uint64(n), 10)
}
