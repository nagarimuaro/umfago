package handlers_test

import (
	"net/http"
	"testing"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func TestChatHandler_SendMessageAndHistory(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	riderToken := createUserWithRoleAndLoginInDB(t, db, router, "rider_chat@go.com", models.RoleCustomer)
	driverToken := createUserWithRoleAndLoginInDB(t, db, router, "driver_chat@go.com", models.RoleDriverMotorcycle)

	var rider, driver models.User
	db.Where("email = ?", "rider_chat@go.com").First(&rider)
	db.Where("email = ?", "driver_chat@go.com").First(&driver)

	// Buat Dummy Order
	order := models.Order{
		UUID:           uuid.New().String(),
		RiderID:        rider.ID,
		DriverID:       &driver.ID,
		Status:         models.StatusAccepted,
		PickupAddress:  "A",
		DropoffAddress: "B",
	}
	db.Create(&order)

	// Rider send message
	payload := map[string]string{
		"message": "Halo pak sesuai map ya",
	}
	wSend := testutil.Do(router, testutil.JSONRequest(http.MethodPost, "/api/orders/"+order.UUID+"/chat", payload, riderToken))
	if wSend.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", wSend.Code, wSend.Body.String())
	}

	// Driver check history
	wHist := testutil.Do(router, testutil.JSONRequest(http.MethodGet, "/api/orders/"+order.UUID+"/chat", nil, driverToken))
	if wHist.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for history, got %d: %s", wHist.Code, wHist.Body.String())
	}

	histBody := testutil.ParseJSON(wHist)
	messages, ok := histBody["messages"].([]interface{})
	if !ok || len(messages) != 1 {
		t.Fatalf("expected 1 message in history, got %v", histBody["messages"])
	}

	msgData := messages[0].(map[string]interface{})
	if msgData["message"] != "Halo pak sesuai map ya" {
		t.Errorf("unexpected message content: %v", msgData["message"])
	}
}

// TestChat_OpenWindowStatuses — kirim pesan boleh di sepanjang perjalanan
func TestChat_OpenWindowStatuses(t *testing.T) {
	open := []models.OrderStatus{
		models.StatusAccepted,
		models.StatusArrived,
		models.StatusInProgress,
	}

	for _, status := range open {
		t.Run(string(status), func(t *testing.T) {
			db := testutil.NewTestDB(t)
			router, _ := testutil.SetupRouter(db)

			riderToken := createUserWithRoleAndLoginInDB(t, db, router, "rider_open@go.com", models.RoleCustomer)
			createUserWithRoleAndLoginInDB(t, db, router, "driver_open@go.com", models.RoleDriverMotorcycle)

			order := chatOrder(t, db, "rider_open@go.com", "driver_open@go.com", status)

			w := testutil.Do(router, testutil.JSONRequest(http.MethodPost,
				"/api/orders/"+order.UUID+"/chat",
				map[string]string{"message": "di depan pagar biru ya"}, riderToken))

			if w.Code != http.StatusOK {
				t.Fatalf("Status = %d, want 200 while order is %s. Body: %s",
					w.Code, status, w.Body.String())
			}
		})
	}
}

// TestChat_ClosedAfterOrderEnds — order selesai atau dibatalkan menutup pengiriman.
//
// Yang diuji bukan hanya kode 409, tetapi juga bahwa pesannya benar-benar tidak
// tersimpan: balasan 409 yang tetap menulis baris akan lolos dari pemeriksaan
// status saja.
func TestChat_ClosedAfterOrderEnds(t *testing.T) {
	closed := []models.OrderStatus{
		models.StatusCompleted,
		models.StatusCancelled,
	}

	for _, status := range closed {
		t.Run(string(status), func(t *testing.T) {
			db := testutil.NewTestDB(t)
			router, _ := testutil.SetupRouter(db)

			riderToken := createUserWithRoleAndLoginInDB(t, db, router, "rider_closed@go.com", models.RoleCustomer)
			driverToken := createUserWithRoleAndLoginInDB(t, db, router, "driver_closed@go.com", models.RoleDriverMotorcycle)

			order := chatOrder(t, db, "rider_closed@go.com", "driver_closed@go.com", status)

			// Kedua peserta ditutup, bukan hanya penumpang.
			for name, token := range map[string]string{"rider": riderToken, "driver": driverToken} {
				w := testutil.Do(router, testutil.JSONRequest(http.MethodPost,
					"/api/orders/"+order.UUID+"/chat",
					map[string]string{"message": "masih di sana?"}, token))

				if w.Code != http.StatusConflict {
					t.Fatalf("%s: status = %d, want 409 while order is %s. Body: %s",
						name, w.Code, status, w.Body.String())
				}

				body := testutil.ParseJSON(w)
				if closedFlag, _ := body["chat_closed"].(bool); !closedFlag {
					t.Errorf("%s: response missing chat_closed = true, got %v", name, body["chat_closed"])
				}
			}

			var count int64
			db.Model(&models.ChatMessage{}).Where("order_uuid = ?", order.UUID).Count(&count)
			if count != 0 {
				t.Errorf("Got %d saved messages, want 0 — a 409 must not write the row", count)
			}
		})
	}
}

// TestChat_HistoryReadableAfterCompletion — riwayat tetap 200 dan tetap lengkap
//
// Inilah sisi lain dari penutupan: yang ditutup adalah pengiriman, bukan
// pembacaan. Percakapan itu bukti yang dipakai saat menangani komplain.
func TestChat_HistoryReadableAfterCompletion(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	riderToken := createUserWithRoleAndLoginInDB(t, db, router, "rider_hist@go.com", models.RoleCustomer)
	driverToken := createUserWithRoleAndLoginInDB(t, db, router, "driver_hist@go.com", models.RoleDriverMotorcycle)

	order := chatOrder(t, db, "rider_hist@go.com", "driver_hist@go.com", models.StatusInProgress)

	// Dua pesan dikirim selama jendela masih terbuka.
	for _, m := range []struct {
		token string
		text  string
	}{
		{riderToken, "saya pakai jaket merah"},
		{driverToken, "baik, sudah kelihatan"},
	} {
		w := testutil.Do(router, testutil.JSONRequest(http.MethodPost,
			"/api/orders/"+order.UUID+"/chat",
			map[string]string{"message": m.text}, m.token))
		if w.Code != http.StatusOK {
			t.Fatalf("Send while in_progress: status = %d, want 200. Body: %s", w.Code, w.Body.String())
		}
	}

	// Perjalanan berakhir.
	db.Model(&models.Order{}).Where("uuid = ?", order.UUID).
		Update("status", models.StatusCompleted)

	for name, token := range map[string]string{"rider": riderToken, "driver": driverToken} {
		w := testutil.Do(router, testutil.JSONRequest(http.MethodGet,
			"/api/orders/"+order.UUID+"/chat", nil, token))

		if w.Code != http.StatusOK {
			t.Fatalf("%s: history status = %d, want 200 after completion. Body: %s",
				name, w.Code, w.Body.String())
		}

		body := testutil.ParseJSON(w)
		if closedFlag, _ := body["chat_closed"].(bool); !closedFlag {
			t.Errorf("%s: chat_closed = %v, want true", name, body["chat_closed"])
		}

		messages, ok := body["messages"].([]interface{})
		if !ok || len(messages) != 2 {
			t.Fatalf("%s: got %v, want the 2 earlier messages still readable", name, body["messages"])
		}

		// Urutan naik menurut waktu — layar chat membacanya apa adanya.
		first := messages[0].(map[string]interface{})
		if first["message"] != "saya pakai jaket merah" {
			t.Errorf("%s: first message = %v, want the rider's message first", name, first["message"])
		}
	}
}

// TestChat_NonParticipantForbidden — orang luar 403 pada kirim maupun baca.
//
// Statusnya dibuat completed supaya sekaligus terbukti penjaga peserta berjalan
// lebih dulu daripada penjaga status: orang luar tidak boleh bisa membedakan
// order yang sudah selesai dari yang belum lewat kode balasan.
func TestChat_NonParticipantForbidden(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	createUserWithRoleAndLoginInDB(t, db, router, "rider_priv@go.com", models.RoleCustomer)
	createUserWithRoleAndLoginInDB(t, db, router, "driver_priv@go.com", models.RoleDriverMotorcycle)
	strangerToken := createUserWithRoleAndLoginInDB(t, db, router, "stranger@go.com", models.RoleCustomer)

	order := chatOrder(t, db, "rider_priv@go.com", "driver_priv@go.com", models.StatusCompleted)

	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost,
		"/api/orders/"+order.UUID+"/chat",
		map[string]string{"message": "siapa ini"}, strangerToken))
	if w.Code != http.StatusForbidden {
		t.Errorf("Send status = %d, want 403 for a non-participant", w.Code)
	}

	w = testutil.Do(router, testutil.JSONRequest(http.MethodGet,
		"/api/orders/"+order.UUID+"/chat", nil, strangerToken))
	if w.Code != http.StatusForbidden {
		t.Errorf("History status = %d, want 403 for a non-participant", w.Code)
	}
}

// TestChat_NoDriverYet — order masih mencari driver belum punya lawan bicara
func TestChat_NoDriverYet(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	riderToken := createUserWithRoleAndLoginInDB(t, db, router, "rider_nodrv@go.com", models.RoleCustomer)

	var rider models.User
	db.Where("email = ?", "rider_nodrv@go.com").First(&rider)

	order := models.Order{
		UUID:           uuid.New().String(),
		RiderID:        rider.ID,
		Status:         models.StatusSearching,
		PickupAddress:  "A",
		DropoffAddress: "B",
	}
	if err := db.Create(&order).Error; err != nil {
		t.Fatal("Failed to create order:", err)
	}

	w := testutil.Do(router, testutil.JSONRequest(http.MethodPost,
		"/api/orders/"+order.UUID+"/chat",
		map[string]string{"message": "halo"}, riderToken))

	if w.Code != http.StatusBadRequest {
		t.Errorf("Status = %d, want 400 while no driver is assigned", w.Code)
	}
}

// chatOrder — order dengan penumpang dan driver yang sudah ada, pada status tertentu
func chatOrder(t *testing.T, db *gorm.DB, riderEmail, driverEmail string, status models.OrderStatus) *models.Order {
	t.Helper()

	var rider, driver models.User
	if err := db.Where("email = ?", riderEmail).First(&rider).Error; err != nil {
		t.Fatal("Rider not found:", err)
	}
	if err := db.Where("email = ?", driverEmail).First(&driver).Error; err != nil {
		t.Fatal("Driver not found:", err)
	}

	order := models.Order{
		UUID:           uuid.New().String(),
		RiderID:        rider.ID,
		DriverID:       &driver.ID,
		Status:         status,
		PickupAddress:  "A",
		DropoffAddress: "B",
	}
	if err := db.Create(&order).Error; err != nil {
		t.Fatal("Failed to create order:", err)
	}
	return &order
}
