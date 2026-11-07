package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"openjek-backend/internal/models"

	"github.com/gorilla/websocket"
)

// Batas waktu dan ukuran koneksi.
//
// Tanpa deadline, koneksi yang mati diam-diam (HP kehilangan sinyal, kabel
// dicabut) tidak pernah terdeteksi: goroutine dan buffer-nya tetap hidup sampai
// proses restart. Ping berkala memaksa lapisan TCP membuktikan koneksi masih ada.
const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10 // harus lebih kecil dari pongWait
	maxMessageSize = 8 * 1024            // batas ukuran pesan masuk
	sendBufferSize = 256
)

// Message — struktur pesan yang dikirim/diterima via WebSocket
type Message struct {
	Type    string          `json:"type"`    // e.g. "location_update", "order_status", "incoming_order"
	Payload json.RawMessage `json:"payload"` // data dinamis sesuai type
}

// Client — satu koneksi WebSocket aktif (1 HP driver/rider)
type Client struct {
	ID   uint // user_id
	Role string
	Conn *websocket.Conn
	Send chan []byte
	Hub  *Hub

	// closeOnce memastikan channel Send hanya ditutup sekali. Menutup channel
	// yang sudah tertutup membuat proses panik.
	closeOnce sync.Once
}

// NewClient — buat klien dengan buffer kirim berukuran standar
func NewClient(id uint, role string, conn *websocket.Conn, hub *Hub) *Client {
	return &Client{
		ID:   id,
		Role: role,
		Conn: conn,
		Send: make(chan []byte, sendBufferSize),
		Hub:  hub,
	}
}

// closeSend — tutup channel kirim dengan aman
func (c *Client) closeSend() {
	c.closeOnce.Do(func() { close(c.Send) })
}

// IsDriver — apakah role aktif klien ini adalah role driver
func (c *Client) IsDriver() bool {
	return models.IsDriverRole(models.RoleCode(c.Role))
}

// Hub — pusat kendali semua koneksi WebSocket aktif
type Hub struct {
	mu         sync.RWMutex
	clients    map[uint]map[*Client]struct{} // key: user_id -> set koneksi aktif
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	done       chan struct{}
	closeOnce  sync.Once

	// OnDisconnect dipanggil setiap kali koneksi terakhir milik seorang user lepas.
	OnDisconnect func(userID uint, role string)
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[uint]map[*Client]struct{}),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client, 16),
		unregister: make(chan *Client, 16),
		done:       make(chan struct{}),
	}
}

// Register — daftarkan klien baru ke Hub
func (h *Hub) Register(c *Client) {
	select {
	case h.register <- c:
	case <-h.done:
	}
}

// Unregister — lepaskan klien dari Hub
func (h *Hub) Unregister(c *Client) {
	select {
	case h.unregister <- c:
	case <-h.done:
	}
}

// Broadcast — kirim pesan ke semua klien yang terhubung
func (h *Hub) Broadcast(msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	select {
	case h.broadcast <- data:
	default:
		log.Println("[WS Hub] Broadcast buffer full, dropping message")
	}
}

// Close — hentikan hub dan tutup semua koneksi. Dipakai saat server berhenti.
func (h *Hub) Close() {
	h.closeOnce.Do(func() {
		close(h.done)

		h.mu.Lock()
		for id, conns := range h.clients {
			for client := range conns {
				client.closeSend()
			}
			delete(h.clients, id)
		}
		h.mu.Unlock()
	})
}

// Run — jalankan hub di goroutine terpisah
func (h *Hub) Run() {
	for {
		select {
		case <-h.done:
			return

		case client := <-h.register:
			h.mu.Lock()
			if h.clients[client.ID] == nil {
				h.clients[client.ID] = make(map[*Client]struct{})
			}
			h.clients[client.ID][client] = struct{}{}
			h.mu.Unlock()
			log.Printf("[WS Hub] Client connected: user_id=%d role=%s", client.ID, client.Role)

		case client := <-h.unregister:
			h.mu.Lock()
			lastDisconnected := false
			if conns, ok := h.clients[client.ID]; ok {
				if _, exists := conns[client]; exists {
					delete(conns, client)
					if len(conns) == 0 {
						delete(h.clients, client.ID)
						lastDisconnected = true
					}
				}
			}
			h.mu.Unlock()
			client.closeSend()
			log.Printf("[WS Hub] Client disconnected: user_id=%d", client.ID)

			if lastDisconnected && h.OnDisconnect != nil {
				go h.OnDisconnect(client.ID, client.Role)
			}

		case message := <-h.broadcast:
			h.mu.Lock()
			for id, conns := range h.clients {
				for client := range conns {
					select {
					case client.Send <- message:
					default:
						client.closeSend()
						delete(conns, client)
					}
				}
				if len(conns) == 0 {
					delete(h.clients, id)
				}
			}
			h.mu.Unlock()
		}
	}
}

// SendToUser — kirim pesan ke satu user spesifik (ke semua sesi aktif user tersebut)
func (h *Hub) SendToUser(userID uint, msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("[WS Hub] Failed to marshal message: %v", err)
		return
	}

	h.mu.RLock()
	conns, ok := h.clients[userID]
	if !ok || len(conns) == 0 {
		h.mu.RUnlock()
		return
	}
	targets := make([]*Client, 0, len(conns))
	for c := range conns {
		targets = append(targets, c)
	}
	h.mu.RUnlock()

	defer func() {
		if r := recover(); r != nil {
			log.Printf("[WS Hub] Send to closed channel for user_id=%d", userID)
		}
	}()

	for _, client := range targets {
		select {
		case client.Send <- data:
		default:
			log.Printf("[WS Hub] Buffer full for user_id=%d, dropping message", userID)
		}
	}
}

// SendToDrivers — broadcast ke semua klien yang role aktifnya adalah driver
func (h *Hub) SendToDrivers(msg Message) {
	h.sendToMatching(msg, func(c *Client) bool { return c.IsDriver() })
}

// SendToVehicleType — kirim hanya ke driver dengan jenis kendaraan tertentu,
// sehingga order mobil tidak mengganggu driver motor.
func (h *Hub) SendToVehicleType(vehicleType string, msg Message) {
	h.sendToMatching(msg, func(c *Client) bool {
		return models.VehicleTypeForRole(models.RoleCode(c.Role)) == vehicleType
	})
}

func (h *Hub) sendToMatching(msg Message, match func(*Client) bool) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.mu.RLock()
	targets := make([]*Client, 0, len(h.clients))
	for _, conns := range h.clients {
		for client := range conns {
			if match(client) {
				targets = append(targets, client)
			}
		}
	}
	h.mu.RUnlock()

	defer func() {
		if r := recover(); r != nil {
			log.Println("[WS Hub] Send to closed channel during fan-out")
		}
	}()

	for _, client := range targets {
		select {
		case client.Send <- data:
		default:
		}
	}
}

// OnlineDriverIDs — daftar user_id driver yang sedang terhubung
func (h *Hub) OnlineDriverIDs() []uint {
	h.mu.RLock()
	defer h.mu.RUnlock()

	ids := make([]uint, 0, len(h.clients))
	for id, conns := range h.clients {
		for client := range conns {
			if client.IsDriver() {
				ids = append(ids, id)
				break
			}
		}
	}
	return ids
}

// WritePump — goroutine yang mengirim pesan dari channel ke koneksi WebSocket.
// Sekaligus mengirim ping berkala untuk mendeteksi koneksi yang sudah mati.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub menutup channel — kirim frame close lalu berhenti
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// ReadPump — goroutine yang menerima pesan dari koneksi WebSocket
func (c *Client) ReadPump(locationSvc func(userID uint, lat, lon float64)) {
	defer func() {
		c.Hub.Unregister(c)
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	_ = c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	// Setiap pong dari klien memperpanjang deadline. Klien yang berhenti
	// merespons akan membuat ReadMessage gagal dan koneksinya dibersihkan.
	c.Conn.SetPongHandler(func(string) error {
		return c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		_, rawMsg, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("[WS] Unexpected close for user_id=%d: %v", c.ID, err)
			}
			return
		}

		var msg Message
		if err := json.Unmarshal(rawMsg, &msg); err != nil {
			continue
		}

		// Handle pesan lokasi dari driver
		if msg.Type == "location_update" && c.IsDriver() {
			var loc struct {
				Lat float64 `json:"lat"`
				Lon float64 `json:"lon"`
			}
			if err := json.Unmarshal(msg.Payload, &loc); err != nil {
				continue
			}
			// Koordinat di luar rentang yang mungkin diabaikan, agar data sampah
			// tidak masuk ke indeks geospasial.
			if loc.Lat < -90 || loc.Lat > 90 || loc.Lon < -180 || loc.Lon > 180 {
				continue
			}
			if locationSvc != nil {
				locationSvc(c.ID, loc.Lat, loc.Lon)
			}
		}
	}
}
