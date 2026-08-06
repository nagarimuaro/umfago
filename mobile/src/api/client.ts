/**
 * HTTP client for the OpenJek backend.
 *
 * The single load-bearing piece here is `refreshOnce`. Refresh tokens rotate:
 * every successful refresh revokes the old token, and presenting a revoked one
 * is treated as a leak — the backend revokes *every* session for that user and
 * answers 401 "Refresh token reuse detected". Two requests racing a 401 into two
 * parallel refreshes therefore do not merely waste a round trip; the loser kills
 * the winner and the user is thrown out of the app. Every 401 funnels through
 * one in-flight promise.
 */

import type {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  RegisterRequest,
  TokenPair,
} from './types';

export interface ApiClientOptions {
  baseUrl: string;
  /** Access token lives in memory only. */
  getAccessToken: () => string | null;
  /** Refresh token lives in Keychain/Keystore. */
  getRefreshToken: () => Promise<string | null>;
  onTokensRenewed: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  /** Called when the session is unrecoverable: reuse detected, or account suspended. */
  onSessionLost: (reason: SessionLostReason) => void;
}

export type SessionLostReason =
  | 'refresh_failed'
  | 'refresh_reuse_detected'
  | 'account_suspended';

/**
 * Failed validation is always 422, never 400 — a 400 means something else
 * (insufficient wallet balance, for one) and must not be rendered as a field
 * error.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: Record<string, unknown>;

  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.error === 'string' ? body.error : `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  get isValidation(): boolean {
    return this.status === 422;
  }

  /** Values the server will accept, sent alongside some 422s. */
  get allowedValues(): string[] | undefined {
    return Array.isArray(this.body.allowed_values)
      ? (this.body.allowed_values as string[])
      : undefined;
  }

  /** Present on the KYC-related 403, absent on the other 403s. */
  get kycStatus(): string | undefined {
    return typeof this.body.kyc_status === 'string' ? this.body.kyc_status : undefined;
  }

  get missingFields(): string[] | undefined {
    return Array.isArray(this.body.missing_fields)
      ? (this.body.missing_fields as string[])
      : undefined;
  }

  /**
   * A suspended account is the one 403 that cannot be recovered from in-app.
   * The backend sends no machine-readable code, so the message is all there is
   * to key on — the other 403s (KYC pending, ongoing order, low balance) each
   * leave the session usable.
   */
  get isAccountSuspended(): boolean {
    return this.status === 403 && /account (is )?suspended/i.test(String(this.body.error ?? ''));
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Skip the Authorization header and the 401 retry (login, register, refresh). */
  anonymous?: boolean;
  signal?: AbortSignal;
};

export class ApiClient {
  private readonly options: ApiClientOptions;
  /** The single in-flight refresh. Null when no refresh is running. */
  private refreshInFlight: Promise<TokenPair> | null = null;

  constructor(options: ApiClientOptions) {
    this.options = options;
  }

  // ── Public verbs ──────────────────────────────────────────────────────

  get<T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, { method: 'GET', query, signal });
  }

  post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, { method: 'POST', body, signal });
  }

  put<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body, signal });
  }

  delete<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, { method: 'DELETE', signal });
  }

  // ── Auth calls that must not carry a stale token ──────────────────────

  login(body: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/login', {
      method: 'POST',
      body,
      anonymous: true,
    });
  }

  register(body: RegisterRequest): Promise<{ message: string }> {
    return this.request('/api/register', { method: 'POST', body, anonymous: true });
  }

  // ── Multipart upload ──────────────────────────────────────────────────

  /**
   * The server decides the content type by reading the file, not from the
   * filename or the declared Content-Type, and it discards the client's
   * filename entirely.
   */
  async upload<T>(path: string, file: { uri: string; name: string; type: string }): Promise<T> {
    const form = new FormData();
    // React Native's FormData takes this shape; the cast is unavoidable.
    form.append('file', file as unknown as Blob);

    return this.request<T>(path, { method: 'POST', body: form });
  }

  // ── Core ──────────────────────────────────────────────────────────────

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.send(path, options);

    if (response.status !== 401 || options.anonymous) {
      return this.parse<T>(response);
    }

    // 401 on an authenticated call: refresh once, then replay. Concurrent
    // callers all await the same refresh.
    try {
      await this.refreshOnce();
    } catch {
      throw new ApiError(401, { error: 'Session expired' });
    }

    return this.parse<T>(await this.send(path, options));
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(path, this.options.baseUrl);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (options.body !== undefined && !isForm) {
      headers['Content-Type'] = 'application/json';
    }
    if (!options.anonymous) {
      const token = this.options.getAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers,
      body: isForm
        ? (options.body as FormData)
        : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
      signal: options.signal,
    });
  }

  private async parse<T>(response: Response): Promise<T> {
    const text = await response.text();
    const body = text ? safeJson(text) : {};

    if (response.ok) {
      return body as T;
    }

    const error = new ApiError(response.status, body);
    if (error.isAccountSuspended) {
      this.options.onSessionLost('account_suspended');
    }
    throw error;
  }

  /**
   * At most one refresh at a time. The new tokens are persisted *before* the
   * promise resolves, so a replayed request can never pick up the token that
   * was just rotated away.
   */
  private refreshOnce(): Promise<TokenPair> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = (async () => {
      const refreshToken = await this.options.getRefreshToken();
      if (!refreshToken) {
        this.options.onSessionLost('refresh_failed');
        throw new ApiError(401, { error: 'No refresh token' });
      }

      const response = await this.send('/api/refresh', {
        method: 'POST',
        body: { refresh_token: refreshToken },
        anonymous: true,
      });

      if (!response.ok) {
        const body = safeJson(await response.text());
        const reused = /reuse detected/i.test(String(body.error ?? ''));
        this.options.onSessionLost(reused ? 'refresh_reuse_detected' : 'refresh_failed');
        throw new ApiError(response.status, body);
      }

      const tokens = (await response.json()) as RefreshResponse;
      await this.options.onTokensRenewed({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
      return tokens;
    })();

    // Cleared in a finally so a failed refresh does not wedge every later call.
    return this.refreshInFlight.finally(() => {
      this.refreshInFlight = null;
    });
  }
}

function safeJson(text: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : { error: text };
  } catch {
    return { error: text };
  }
}
