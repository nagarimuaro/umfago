package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	"openjek-backend/internal/server"
)

func main() {
	// Konteks dibatalkan saat proses menerima SIGINT/SIGTERM, sehingga server
	// sempat menyelesaikan permintaan yang sedang berjalan sebelum berhenti.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	srv := server.NewServer()

	if err := srv.Run(ctx, ":"+srv.Port()); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
