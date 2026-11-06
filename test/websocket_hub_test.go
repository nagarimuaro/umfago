package test

import (
	"encoding/json"
	"testing"
	"time"

	"openjek-backend/internal/models"
	ws "openjek-backend/internal/websocket"
)

func TestWebSocketHub_LifecycleAndMessaging(t *testing.T) {
	hub := ws.NewHub()
	go hub.Run()
	defer hub.Close()

	// Buat klien 1 (customer) dan klien 2 (driver motor)
	client1 := &ws.Client{
		ID:   101,
		Role: string(models.RoleCustomer),
		Send: make(chan []byte, 10),
		Hub:  hub,
	}
	client2 := &ws.Client{
		ID:   202,
		Role: string(models.RoleDriverMotorcycle),
		Send: make(chan []byte, 10),
		Hub:  hub,
	}

	hub.Register(client1)
	hub.Register(client2)

	// Beri waktu kecil goroutine hub untuk memproses registrasi
	time.Sleep(20 * time.Millisecond)

	// 1. Test SendToUser
	testMsg := ws.Message{
		Type:    "test_ping",
		Payload: json.RawMessage(`{"text":"hello user 101"}`),
	}
	hub.SendToUser(101, testMsg)

	select {
	case data := <-client1.Send:
		var received ws.Message
		if err := json.Unmarshal(data, &received); err != nil {
			t.Fatalf("failed to unmarshal received message: %v", err)
		}
		if received.Type != "test_ping" {
			t.Errorf("expected type test_ping, got %s", received.Type)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timed out waiting for message to client1")
	}

	// Pastikan client2 tidak menerima pesan client1
	select {
	case <-client2.Send:
		t.Fatal("client2 should not have received direct message sent to client1")
	default:
		// OK
	}

	// 2. Test SendToDrivers
	driverMsg := ws.Message{
		Type:    "new_order_available",
		Payload: json.RawMessage(`{"order_id":"123"}`),
	}
	hub.SendToDrivers(driverMsg)

	select {
	case data := <-client2.Send:
		var received ws.Message
		_ = json.Unmarshal(data, &received)
		if received.Type != "new_order_available" {
			t.Errorf("expected type new_order_available, got %s", received.Type)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timed out waiting for driver broadcast on client2")
	}

	// Pastikan customer tidak menerima pesan khusus driver
	select {
	case <-client1.Send:
		t.Fatal("customer should not have received driver message")
	default:
		// OK
	}

	// 3. Test Unregister
	hub.Unregister(client1)
	time.Sleep(20 * time.Millisecond)

	// Kirim lagi ke client 1 setelah unregister (harus tidak ada pesan baru)
	hub.SendToUser(101, testMsg)
	select {
	case _, ok := <-client1.Send:
		if ok {
			t.Fatal("unregistered client should not receive new active messages")
		}
	default:
		// OK
	}
}

func TestWebSocketHub_OnDisconnectCallback(t *testing.T) {
	hub := ws.NewHub()
	disconnectedChan := make(chan uint, 1)

	hub.OnDisconnect = func(userID uint, role string) {
		disconnectedChan <- userID
	}

	go hub.Run()
	defer hub.Close()

	client := &ws.Client{
		ID:   303,
		Role: string(models.RoleDriverMotorcycle),
		Send: make(chan []byte, 10),
		Hub:  hub,
	}

	hub.Register(client)
	time.Sleep(20 * time.Millisecond)

	hub.Unregister(client)

	select {
	case uid := <-disconnectedChan:
		if uid != 303 {
			t.Errorf("expected disconnected userID 303, got %d", uid)
		}
	case <-time.After(200 * time.Millisecond):
		t.Fatal("timed out waiting for OnDisconnect callback")
	}
}
