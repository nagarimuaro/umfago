/**
 * WebSocket client.
 *
 * Three backend facts shape this file:
 *
 *  1. The token goes in the query string (`/ws?token=`), because the browser
 *     WebSocket API allows no custom headers. It is the *access* token, so the
 *     connection dies at most every 15 minutes and has to be rebuilt with a
 *     fresh one — `setToken` exists for that.
 *  2. The hub keys connections by user id alone and closes the older one when a
 *     second arrives. Reconnecting without backoff therefore has the app closing
 *     its own socket in a loop.
 *  3. A driver's disconnect flips `is_online` to false server-side and drops the
 *     driver from the Redis geo index. After a reconnect the app must re-send
 *     `PUT /api/driver/status`, not assume it is still online — see
 *     `onReconnected`.
 */

import { isServerMessage, type ClientMessage, type ServerMessage } from './events';

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface WsClientOptions {
  /** Base HTTP URL; ws:// or wss:// is derived from it. */
  baseUrl: string;
  onMessage: (message: ServerMessage) => void;
  onStateChange?: (state: ConnectionState) => void;
  /** Fired after a reconnect that follows a dropped connection, not on first connect. */
  onReconnected?: () => void;
}

/** Server pings every 54s and gives up after 60s without a pong. */
const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

export class WsClient {
  private readonly options: WsClientOptions;
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private state: ConnectionState = 'idle';
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** True once a connection has been established and lost at least once. */
  private hadConnection = false;
  /** Set when the caller asked to stop; suppresses the reconnect loop. */
  private stopped = true;

  constructor(options: WsClientOptions) {
    this.options = options;
  }

  getState(): ConnectionState {
    return this.state;
  }

  /** Connect, or reconnect with a new token if one is already open. */
  connect(token: string): void {
    this.stopped = false;

    if (this.token === token && (this.state === 'open' || this.state === 'connecting')) {
      return;
    }

    this.token = token;
    this.openSocket();
  }

  /**
   * Swap in a rotated access token. The old socket is closed first: opening the
   * new one while the old is alive would make the hub close one of them anyway,
   * and which one is not ours to decide.
   */
  setToken(token: string): void {
    if (this.token === token) {
      return;
    }
    this.token = token;
    if (!this.stopped) {
      this.openSocket();
    }
  }

  disconnect(): void {
    this.stopped = true;
    this.clearTimer();
    this.attempt = 0;
    this.hadConnection = false;

    if (this.socket) {
      // Drop the handlers first so closing does not schedule a reconnect.
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.close();
      this.socket = null;
    }
    this.setState('closed');
  }

  /** Returns false when the socket is not open; the caller decides whether to care. */
  send(message: ClientMessage): boolean {
    if (!this.socket || this.socket.readyState !== 1) {
      return false;
    }
    this.socket.send(JSON.stringify(message));
    return true;
  }

  sendLocation(lat: number, lon: number): boolean {
    return this.send({ type: 'location_update', payload: { lat, lon } });
  }

  // ── Internals ─────────────────────────────────────────────────────────

  private openSocket(): void {
    if (!this.token) {
      return;
    }
    this.clearTimer();

    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.close();
      this.socket = null;
    }

    this.setState(this.hadConnection ? 'reconnecting' : 'connecting');

    const url = new URL('/ws', this.options.baseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('token', this.token);

    const socket = new WebSocket(url.toString());
    this.socket = socket;

    socket.onopen = () => {
      this.attempt = 0;
      this.setState('open');
      if (this.hadConnection) {
        this.options.onReconnected?.();
      }
      this.hadConnection = true;
    };

    socket.onmessage = event => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (isServerMessage(parsed)) {
        this.options.onMessage(parsed);
      }
    };

    socket.onerror = () => {
      // onclose always follows; scheduling here too would double the backoff.
    };

    socket.onclose = () => {
      this.socket = null;
      if (this.stopped) {
        this.setState('closed');
        return;
      }
      this.scheduleReconnect();
    };
  }

  /**
   * Exponential backoff with jitter. The jitter matters more than usual here:
   * when the server restarts, every client reconnects at once, and a fixed delay
   * has them all arrive together.
   */
  private scheduleReconnect(): void {
    this.setState('reconnecting');
    const delay = Math.min(BASE_BACKOFF_MS * 2 ** this.attempt, MAX_BACKOFF_MS);
    const jittered = delay / 2 + Math.random() * (delay / 2);
    this.attempt += 1;

    this.clearTimer();
    this.timer = setTimeout(() => this.openSocket(), jittered);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private setState(state: ConnectionState): void {
    if (this.state === state) {
      return;
    }
    this.state = state;
    this.options.onStateChange?.(state);
  }
}
