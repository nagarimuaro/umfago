/**
 * UmfaGo Driver Realtime WebSocket Service
 * Listens for incoming ride dispatches and broadcasts GPS location updates
 */

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'wss://umfa-core.fazalabs.sbs/ws';

export type MessageHandler = (data: any) => void;

export class DriverWebSocketService {
  private static socket: WebSocket | null = null;
  private static listeners: Set<MessageHandler> = new Set();
  private static reconnectTimer: any = null;
  private static isExplicitlyClosed = false;

  public static connect(token?: string) {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    const url = token ? `${WS_URL}?token=${token}` : WS_URL;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('[DriverWS] Connected to realtime dispatch hub');
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.listeners.forEach((listener) => listener(payload));
        } catch (e) {
          console.warn('[DriverWS] Non-JSON payload received:', event.data);
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[DriverWS] Socket error:', err);
      };

      this.socket.onclose = () => {
        console.log('[DriverWS] Disconnected');
        if (!this.isExplicitlyClosed) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            this.connect(token);
          }, 5000);
        }
      };
    } catch (e) {
      console.warn('[DriverWS] Connection creation failed:', e);
    }
  }

  public static sendLocation(lat: number, lon: number, heading: number = 0, speed: number = 0) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'location_update',
          latitude: lat,
          longitude: lon,
          heading,
          speed,
          timestamp: Date.now(),
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

