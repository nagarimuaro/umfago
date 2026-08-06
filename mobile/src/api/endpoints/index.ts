/**
 * Endpoint wrappers. One file per domain, each a thin layer over ApiClient so
 * screens never build URLs or remember query-parameter names.
 *
 * Note the pagination parameter is `per_page` (not `limit`) and the envelope key
 * is `meta` (not `pagination`); the server caps `per_page` at 100 whatever the
 * client asks for.
 */

import type { ApiClient } from '../client';
import type {
  AppNotification,
  CreateOrderRequest,
  CreateOrderResponse,
  CurrentUser,
  DriverStatus,
  DriverStatusResponse,
  EarningsResponse,
  FareEstimateRequest,
  FareEstimateResponse,
  KycStatusResponse,
  KycSubmitRequest,
  LoginRequest,
  LoginResponse,
  Order,
  OrderHistoryResponse,
  PageMeta,
  RankedProduct,
  RegisterRequest,
  RejectOrderResponse,
  RoleCode,
  SwitchRoleResponse,
  UploadResponse,
  ValidatePromoRequest,
  ValidatePromoResponse,
  WalletTransaction,
  WithdrawRequest,
} from '../types';

export interface DateRange {
  from?: string;
  to?: string;
}

export interface PageParams {
  page?: number;
  per_page?: number;
}

// ── Auth & identity ─────────────────────────────────────────────────────

export const authApi = (api: ApiClient) => ({
  login: (body: LoginRequest): Promise<LoginResponse> => api.login(body),

  register: (body: RegisterRequest) => api.register(body),

  /** Logging out with `all_devices` revokes every refresh token for the account. */
  logout: (refreshToken?: string, allDevices = false) =>
    api.post<{ message: string }>('/api/logout', {
      refresh_token: refreshToken,
      all_devices: allDevices,
    }),

  me: (): Promise<CurrentUser> => api.get('/api/user'),

  /** Only customer, driver_motorcycle, driver_car, and merchant may be self-assigned. */
  addRole: (role: RoleCode) => api.post<{ message: string }>('/api/users/roles', { role }),

  /**
   * Issues a new access token. The caller must store it and reset the navigation
   * stack — the old token still carries the previous role claim.
   */
  switchRole: (role: RoleCode): Promise<SwitchRoleResponse> =>
    api.put('/api/users/active-role', { role }),
});

// ── Orders ──────────────────────────────────────────────────────────────

export const orderApi = (api: ApiClient) => ({
  /** Scope is decided server-side from the token, not from any parameter. */
  history: (params: PageParams = {}): Promise<OrderHistoryResponse> =>
    api.get('/api/orders', params),

  create: (body: CreateOrderRequest): Promise<CreateOrderResponse> =>
    api.post('/api/orders', body),

  accept: (uuid: string) => api.put<{ message: string; order: Order }>(`/api/orders/${uuid}/accept`),

  /**
   * Rejecting leaves the order in `searching` — only this driver's offer row
   * changes. `reason` is optional and truncated at 100 characters.
   */
  reject: (uuid: string, reason?: string): Promise<RejectOrderResponse> =>
    api.put(`/api/orders/${uuid}/reject`, reason ? { reason } : {}),

  updateStatus: (uuid: string, status: 'arrived' | 'in_progress' | 'completed' | 'cancelled') =>
    api.put<{ message: string; order: Order }>(`/api/orders/${uuid}/status`, { status }),

  /** Only on a completed order, and only once. */
  rate: (uuid: string, rating: number, note?: string) =>
    api.post<{ message: string }>(`/api/orders/${uuid}/rate`, { rating, review_note: note }),

  sendChat: (uuid: string, message: string) =>
    api.post<{ message: string }>(`/api/orders/${uuid}/chat`, { message }),

  /** Readable after the ride ends; `chat_closed` says whether sending is still allowed. */
  chatHistory: (uuid: string) =>
    api.get<{ messages: Array<{ sender_id: number; message: string; created_at: string }>; chat_closed: boolean }>(
      `/api/orders/${uuid}/chat`,
    ),

  estimate: (body: FareEstimateRequest): Promise<FareEstimateResponse> =>
    api.post('/api/fare/estimate', body),

  /** Customer role only. Throws ApiError with `valid: false` in the body on failure. */
  validatePromo: (body: ValidatePromoRequest): Promise<ValidatePromoResponse> =>
    api.post('/api/promos/validate', body),
});

// ── Customer history ────────────────────────────────────────────────────

export const customerApi = (api: ApiClient) => ({
  /** Summary is computed over the whole range, not the page. */
  orders: (params: PageParams & DateRange & { status?: string } = {}): Promise<OrderHistoryResponse> =>
    api.get('/api/customer/orders', params),

  walletHistory: (params: PageParams & DateRange & { type?: string } = {}) =>
    api.get<{ transactions: WalletTransaction[]; meta: PageMeta }>(
      '/api/customer/wallet/history',
      params,
    ),
});

// ── Driver ──────────────────────────────────────────────────────────────

export const driverApi = (api: ApiClient) => ({
  /** Returns 200, not 201. Rejected with 409 while a submission is pending. */
  submitKyc: (body: KycSubmitRequest) => api.post<{ message: string; status: string }>('/api/driver/kyc', body),

  /** Two shapes: without a profile only `status` and `missing_fields` arrive. */
  kycStatus: (): Promise<KycStatusResponse> => api.get('/api/driver/kyc'),

  /**
   * Going online requires an approved KYC; going offline does not. Both 403s
   * are told apart by the presence of `kyc_status` in the error body.
   */
  setStatus: (status: DriverStatus): Promise<DriverStatusResponse> =>
    api.put('/api/driver/status', { status }),

  orders: (params: PageParams & DateRange & { status?: string } = {}): Promise<OrderHistoryResponse> =>
    api.get('/api/driver/orders', params),

  walletHistory: (params: PageParams & DateRange & { type?: string } = {}) =>
    api.get<{ transactions: WalletTransaction[]; meta: PageMeta }>(
      '/api/driver/wallet/history',
      params,
    ),

  /** Days with no trips are simply absent from `daily`. */
  earnings: (range: DateRange = {}): Promise<EarningsResponse> =>
    api.get('/api/driver/earnings', range),
});

// ── Merchant ────────────────────────────────────────────────────────────

export const merchantApi = (api: ApiClient) => ({
  orders: (params: PageParams & DateRange = {}): Promise<OrderHistoryResponse> =>
    api.get('/api/merchant/orders', params),

  sales: (range: DateRange = {}) =>
    api.get<{ summary: Record<string, number>; daily: unknown[]; meta: PageMeta }>(
      '/api/merchant/sales',
      range,
    ),

  products: (params: PageParams = {}) =>
    api.get<{ products: RankedProduct[]; meta: PageMeta }>('/api/merchant/products', params),

  createProduct: (body: Partial<RankedProduct>) =>
    api.post<{ product: RankedProduct }>('/api/merchant/products', body),

  updateProduct: (id: number, body: Partial<RankedProduct>) =>
    api.put<{ product: RankedProduct }>(`/api/merchant/products/${id}`, body),

  deleteProduct: (id: number) => api.delete<{ message: string }>(`/api/merchant/products/${id}`),
});

// ── Catalog ─────────────────────────────────────────────────────────────

export const productApi = (api: ApiClient) => ({
  /**
   * Render the order as received (CLAUDE.md section 17). Filling `q`,
   * `category`, or `merchant_id` switches the server to pure score order, which
   * `meta.exploration_enabled` reports.
   */
  list: (params: PageParams & { q?: string; category?: string; merchant_id?: number } = {}) =>
    api.get<{
      products: RankedProduct[];
      meta: PageMeta & { ranking_window_days: number; exploration_enabled: boolean };
    }>('/api/products', params),

  /** Each open counts as a view and feeds the ranking. */
  get: (id: number) => api.get<{ product: RankedProduct }>(`/api/products/${id}`),
});

// ── Wallet ──────────────────────────────────────────────────────────────

export const walletApi = (api: ApiClient) => ({
  balance: () => api.get<{ balance: number; currency: string }>('/api/wallet'),

  deposit: (amount: number) =>
    api.post<{ transaction_id: number; snap_token?: string; redirect_url?: string }>(
      '/api/wallet/deposit',
      { amount },
    ),

  /**
   * For drivers the bank fields in the body are discarded — the server uses the
   * account on the approved KYC file. A driver without an approved KYC gets 403
   * with `kyc_status`.
   */
  withdraw: (body: WithdrawRequest) =>
    api.post<{ message: string; transaction_id: number }>('/api/wallet/withdraw', body),

  history: (params: PageParams = {}) =>
    api.get<{ transactions: WalletTransaction[]; meta: PageMeta }>('/api/wallet/history', params),
});

// ── Notifications ───────────────────────────────────────────────────────

export const notificationApi = (api: ApiClient) => ({
  /**
   * Call this on app open: WebSocket delivery only reaches a running app, so
   * anything that happened while it was closed is only here.
   */
  list: (params: PageParams = {}) =>
    api.get<{ notifications: AppNotification[]; meta: PageMeta }>('/api/notifications', params),

  unreadCount: () => api.get<{ count: number }>('/api/notifications/unread-count'),

  markRead: (id: number) => api.put<{ message: string }>(`/api/notifications/${id}/read`),

  markAllRead: () => api.put<{ message: string }>('/api/notifications/read-all'),
});

/** `data` arrives as a JSON string, so it needs a second parse. */
export const parseNotificationData = (notification: AppNotification): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(notification.data);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

// ── Uploads ─────────────────────────────────────────────────────────────

export const uploadApi = (api: ApiClient) => ({
  /**
   * KYC photos go through here first; the endpoint returns the URL to put in the
   * submission. The server reads the file to decide its type and throws away the
   * client's filename.
   */
  upload: (file: { uri: string; name: string; type: string }): Promise<UploadResponse> =>
    api.upload('/api/uploads', file),
});
