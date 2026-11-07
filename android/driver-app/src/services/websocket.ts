/**
 * UmfaGo Driver Realtime WebSocket Service
 * Listens for incoming ride dispatches and broadcasts GPS location updates
 * Aligned with Golang backend in internal/websocket/hub.go
 */

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'wss://umfa-core.fazalabs.sbs/ws';

export type MessageHandler = (data: any) => void;

export class DriverWebSocketService {
  private static socket: WebSocket | null = null;
  private static listeners: Set<MessageHandler> = new Set();
  private static reconnectTimer: any = null;
  private static isExplicitlyClosed = false;
  private static currentToken: string | null = null;

  public static connect(token?: string) {
    if (token) {
      this.currentToken = token;
    }

    // Backend endpoint /ws requires a valid JWT token query param: /ws?token=<access_token>
    // Do not attempt to connect without a token to avoid HTTP 401 Unauthorized errors
    if (!this.currentToken) {
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
        this.socket = null;
        if (!this.isExplicitlyClosed && this.currentToken) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            if (this.currentToken && !this.isExplicitlyClosed) {
              this.connect(this.currentToken);
            }
          }, 8000);
        }
      };
    } catch (e) {
      console.warn('[DriverWS] Connection creation failed:', e);
    }
  }

  /**
   * Broadcast Driver Live Location to Backend Redis Index
   * Backend expects { type: "location_update", payload: { lat, lon } }
   * See internal/websocket/hub.go:346
   */
  public static sendLocation(lat: number, lon: number, heading: number = 0, speed: number = 0) {
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
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
