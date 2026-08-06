package broker

import (
	"context"
	"encoding/json"
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

// EventType — jenis-jenis event yang beredar di sistem
type EventType string

const (
	EventOrderCreated   EventType = "order.created"
	EventOrderMatched   EventType = "order.matched"
	EventOrderPickedUp  EventType = "order.picked_up"
	EventOrderCompleted EventType = "order.completed"
	EventOrderCancelled EventType = "order.cancelled"
)

// Event — envelope pesan yang dikirim ke RabbitMQ
type Event struct {
	Type    EventType       `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// RabbitMQ — wrapper koneksi + channel AMQP
type RabbitMQ struct {
	conn     *amqp.Connection
	channel  *amqp.Channel
	exchange string
}

func NewRabbitMQ(url string) (*RabbitMQ, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, err
	}

	exchangeName := "openjek_events"

	// Deklarasi topic exchange — satu exchange untuk semua event
	err = ch.ExchangeDeclare(
		exchangeName, // name
		"topic",      // type: topic agar bisa routing pattern seperti "order.*"
		true,         // durable: bertahan walau RabbitMQ restart
		false,        // auto-deleted
		false,        // internal
		false,        // no-wait
		nil,
	)
	if err != nil {
		return nil, err
	}

	log.Println("[RabbitMQ] Connected and exchange declared:", exchangeName)
	return &RabbitMQ{conn: conn, channel: ch, exchange: exchangeName}, nil
}

// Publish — terbitkan event ke RabbitMQ
func (r *RabbitMQ) Publish(ctx context.Context, eventType EventType, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	event := Event{Type: eventType, Payload: json.RawMessage(data)}
	body, err := json.Marshal(event)
	if err != nil {
		return err
	}

	err = r.channel.PublishWithContext(ctx,
		r.exchange,        // exchange
		string(eventType), // routing key: "order.created", "order.matched", dll
		false,             // mandatory
		false,             // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         body,
			DeliveryMode: amqp.Persistent, // pesan tidak hilang walau RabbitMQ restart
		},
	)
	if err != nil {
		return err
	}

	log.Printf("[RabbitMQ] Published event: %s", eventType)
	return nil
}

// Subscribe — berlangganan ke routing key tertentu (pattern-based)
// Contoh: routingKey = "order.*" untuk semua event order
func (r *RabbitMQ) Subscribe(queueName, routingKey string, handler func(Event)) error {
	q, err := r.channel.QueueDeclare(
		queueName, // name
		true,      // durable
		false,     // delete when unused
		false,     // exclusive
		false,     // no-wait
		nil,
	)
	if err != nil {
		return err
	}

	err = r.channel.QueueBind(q.Name, routingKey, r.exchange, false, nil)
	if err != nil {
		return err
	}

	msgs, err := r.channel.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		return err
	}

	go func() {
		for d := range msgs {
			var event Event
			if err := json.Unmarshal(d.Body, &event); err != nil {
				log.Printf("[RabbitMQ] Failed to unmarshal event: %v", err)
				d.Nack(false, false)
				continue
			}
			handler(event)
			d.Ack(false) // acknowledge setelah berhasil diproses
		}
	}()

	log.Printf("[RabbitMQ] Subscribed to routing key: %s (queue: %s)", routingKey, queueName)
	return nil
}

// Close — bersihkan koneksi
func (r *RabbitMQ) Close() {
	r.channel.Close()
	r.conn.Close()
}
