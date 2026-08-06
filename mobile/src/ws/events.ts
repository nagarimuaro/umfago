/**
 * WebSocket message envelope, both directions: `{type, payload}`.
 *
 * Every message the server can send is listed here — the set is closed, taken
 * from the Go sources rather than inferred. Adding a case to `ServerMessage`
 * without a matching backend sender will type-check and never fire.
 */

// ── Server to client ────────────────────────────────────────────────────

/**
 * The five order-lifecycle events carry nothing but the uuid: the message *type*
 * is the status. There is no status field in the payload, so a screen cannot
 * patch its state from the message — it must refetch over HTTP.
 */
export interface OrderEventPayload {
  order_uuid: string;
}

/** The matching worker's offer. Everything else about the order needs a fetch. */
export interface IncomingOrderPayload {
  order_uuid: string;
  pickup_address?: string;
  dropoff_address?: string;
  distance_km?: number;
  fare_amount?: number;
  expires_at?: string;
}

export interface ChatMessagePayload {
  order_uuid: string;
  sender_id: number;
  message: string;
  created_at: string;
}

export interface BalanceUpdatedPayload {
  balance: number;
  amount?: number;
  transaction_id?: number;
}

export interface NotificationPayload {
  id: number;
  type: string;
  title: string;
  body: string;
  /** JSON encoded as a string — parse a second time to read it. */
  data: string;
  created_at: string;
}

export type ServerMessage =
  | { type: 'incoming_order'; payload: IncomingOrderPayload }
  | { type: 'no_drivers_available'; payload: OrderEventPayload }
  | { type: 'order_accepted'; payload: OrderEventPayload }
  | { type: 'driver_arrived'; payload: OrderEventPayload }
  | { type: 'trip_started'; payload: OrderEventPayload }
  | { type: 'trip_completed'; payload: OrderEventPayload }
  | { type: 'order_cancelled'; payload: OrderEventPayload }
  | { type: 'forced_offline_low_balance'; payload: OrderEventPayload }
  | { type: 'chat_message'; payload: ChatMessagePayload }
  | { type: 'balance_updated'; payload: BalanceUpdatedPayload }
  | { type: 'notification'; payload: NotificationPayload };

export type ServerMessageType = ServerMessage['type'];

/** Types after which the local view of the order is stale and must be refetched. */
export const ORDER_LIFECYCLE_EVENTS: ServerMessageType[] = [
  'order_accepted',
  'driver_arrived',
  'trip_started',
  'trip_completed',
  'order_cancelled',
  'no_drivers_available',
];

/**
 * Careful: notification kinds are a separate namespace from WebSocket message
 * types, and the two disagree on exactly one name — the notification is
 * `no_driver_available` (singular), the WebSocket message is
 * `no_drivers_available` (plural).
 */
export const NOTIFICATION_KIND_NO_DRIVER = 'no_driver_available';

// ── Client to server ────────────────────────────────────────────────────

/**
 * The only message the server reads. Field names are `lat` and `lon` — not
 * `latitude`/`longitude`, not `lng`. Sent by a non-driver role, or with
 * out-of-range coordinates, it is dropped silently; nothing is ever acked.
 */
export interface LocationUpdate {
  type: 'location_update';
  payload: { lat: number; lon: number };
}

export type ClientMessage = LocationUpdate;

export const isServerMessage = (value: unknown): value is ServerMessage =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { type?: unknown }).type === 'string';
