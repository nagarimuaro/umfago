/**
 * UmfaGo Driver Realtime WebSocket Service
 * Listens for incoming ride dispatches and broadcasts GPS location updates
 * Aligned with Golang backend in internal/websocket/hub.go
 */

import { DriverApiService, isJwtExpired } from './api';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'wss://umfa-core.fazalabs.sbs/ws';

export type MessageHandler = (data: any) => void;

export class DriverWebSocketService {
  private static socket: WebSocket | null = null;
  private static listeners: Set<MessageHandler> = new Set();
  private static reconnectTimer: any = null;
  private static heartbeatTimer: any = null;
  private static isExplicitlyClosed = false;
  private static currentToken: string | null = null;
  private static lastLat = -0.664159;
  private static lastLon = 100.939844;
  private static lastHeading = 90;
  private static tokenSubInitialized = false;

  private static ensureTokenSubscription() {
    if (this.tokenSubInitialized) return;
    this.tokenSubInitialized = true;
    DriverApiService.onTokenChange((newToken) => {
      this.currentToken = newToken;
    });
  }

  public static async connect(token?: string) {
    this.ensureTokenSubscription();
    if (token) {
      this.currentToken = token;
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Ensure token is non-expired before opening WebSocket handshake
    if (!this.currentToken || isJwtExpired(this.currentToken, 60)) {
      const refreshed = await DriverApiService.getValidToken();
      if (refreshed) {
        this.currentToken = refreshed;
      }
    }

    // Backend endpoint /ws requires a valid JWT token query param: /ws?token=<access_token>
    // Do not attempt to connect without a valid non-expired token to avoid HTTP 401 Unauthorized errors
    if (!this.currentToken || this.currentToken === 'demo-local-session' || isJwtExpired(this.currentToken, 10)) {
      console.log('[DriverWS] Dispatch hub requires driver authentication. Waiting for valid session.');
      return;
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    const url = `${WS_URL}?token=${encodeURIComponent(this.currentToken)}`;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('[DriverWS] Connected to realtime dispatch hub');
        // Immediately register driver position in Redis GEO (active_drivers)
        this.sendLocation(this.lastLat, this.lastLon, this.lastHeading, 0);
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => {
          this.sendLocation(this.lastLat, this.lastLon, this.lastHeading, 0);
        }, 5000);
        this.listeners.forEach((listener) => listener({ type: 'ws_connected' }));
      };

      this.socket.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          // Backend sends { type: string, payload: any }
          // If payload is a JSON string or object, parse it
          let payload = raw.payload;
          if (typeof payload === 'string') {
            try {
              payload = JSON.parse(payload);
            } catch {
              // keep as string
            }
          }

          const normalized = {
            type: raw.type,
            ...(typeof payload === 'object' && payload !== null ? payload : { payload }),
          };

          this.listeners.forEach((listener) => listener(normalized));
        } catch (e) {
          console.warn('[DriverWS] Non-JSON payload received:', event.data);
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[DriverWS] Socket connection note:', (err as any)?.message || 'Connection closed by remote');
      };

      this.socket.onclose = () => {
        console.log('[DriverWS] Disconnected');
        clearInterval(this.heartbeatTimer);
        this.socket = null;
        if (!this.isExplicitlyClosed && this.currentToken) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            if (this.currentToken && !this.isExplicitlyClosed) {
              this.connect(this.currentToken);
            }
          }, 2500);
        }
      };
    } catch (e) {
      console.warn('[DriverWS] Connection creation failed:', e);
    }
  }

  public static async reconnectNow() {
    clearTimeout(this.reconnectTimer);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendLocation(this.lastLat, this.lastLon, this.lastHeading, 0);
      return;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // ignore
      }
      this.socket = null;
    }
    await this.connect(this.currentToken || undefined);
  }

  /**
   * Broadcast Driver Live Location to Backend Redis Index
   * Backend expects { type: "location_update", payload: { lat, lon } }
   * See internal/websocket/hub.go:346
   */
  public static sendLocation(lat: number, lon: number, heading: number = 0, speed: number = 0) {
    this.lastLat = lat;
    this.lastLon = lon;
    this.lastHeading = heading;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'location_update',
          payload: {
            lat,
            lon,
            heading,
            speed,
            timestamp: Date.now(),
          },
        })
      );
    }
  }

  public static addListener(listener: MessageHandler) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public static disconnect() {
    this.isExplicitlyClosed = true;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.heartbeatTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
