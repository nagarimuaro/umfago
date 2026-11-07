/**
 * UmfaGo Driver API Client
 * Aligned with Golang backend in internal/server/server.go & internal/handlers/
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://umfa-core.fazalabs.sbs';

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      throw err;
    }
  }
  return fetch(url, options);
}

const STORAGE_TOKEN_KEY = 'umfago_driver_jwt_token';
const STORAGE_REFRESH_KEY = 'umfago_driver_refresh_token';
const STORAGE_EMAIL_KEY = 'umfago_driver_email';
const STORAGE_PASS_KEY = 'umfago_driver_pass';

function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function setStorageItem(key: string, value: string | null) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (value === null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }
    }
  } catch {
    // ignore storage errors
  }
}

export class DriverApiService {
  private static token: string | null = getStorageItem(STORAGE_TOKEN_KEY);
  private static refreshToken: string | null = getStorageItem(STORAGE_REFRESH_KEY);
  private static lastEmail: string = getStorageItem(STORAGE_EMAIL_KEY) || 'driver.motor@openjek.id';
  private static lastPass: string = getStorageItem(STORAGE_PASS_KEY) || 'password123';

  public static setAuthToken(token: string | null) {
    this.token = token;
    setStorageItem(STORAGE_TOKEN_KEY, token);
  }

  public static getAuthToken(): string | null {
    if (!this.token) {
      this.token = getStorageItem(STORAGE_TOKEN_KEY);
    }
    return this.token;
  }

  private static getHeaders(): HeadersInit {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token && token !== 'demo-local-session') {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Ensure a valid non-expired JWT token exists, refreshing or re-authenticating if needed
   */
  private static async ensureValidToken(forceRefresh = false): Promise<string | null> {
    const current = this.getAuthToken();
    if (!forceRefresh && current && current !== 'demo-local-session') {
      return current;
    }

    // Try refresh token first if available
    const refresh = this.refreshToken || getStorageItem(STORAGE_REFRESH_KEY);
    if (refresh) {
      try {
        const refRes = await fetch(`${BASE_URL}/api/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (refRes.ok) {
          const refData = await refRes.json();
          if (refData.access_token) {
            this.setAuthToken(refData.access_token);
            if (refData.refresh_token) {
              this.refreshToken = refData.refresh_token;
              setStorageItem(STORAGE_REFRESH_KEY, refData.refresh_token);
            }
            return refData.access_token;
          }
        }
      } catch {
        // Fallback to re-login below
      }
    }

    // Re-authenticate with stored credentials (or default driver motor account)
    const email = this.lastEmail || getStorageItem(STORAGE_EMAIL_KEY) || 'driver.motor@openjek.id';
    const pass = this.lastPass || getStorageItem(STORAGE_PASS_KEY) || 'password123';
    try {
      const loginRes = await fetchWithRetry(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        if (loginData.access_token) {
          this.setAuthToken(loginData.access_token);
          if (loginData.refresh_token) {
            this.refreshToken = loginData.refresh_token;
            setStorageItem(STORAGE_REFRESH_KEY, loginData.refresh_token);
          }
          return loginData.access_token;
        }
      }
    } catch {
      // ignore
    }
    return this.token;
  }

  /**
   * Authenticated fetch wrapper that automatically attaches JWT and transparently retries on 401
   */
  private static async authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    await this.ensureValidToken(false);
    const res = await fetchWithRetry(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    });

    if (res.status === 401) {
      const refreshed = await this.ensureValidToken(true);
      if (refreshed && refreshed !== 'demo-local-session') {
        return fetchWithRetry(url, {
          ...options,
          headers: {
            ...this.getHeaders(),
            ...(options.headers || {}),
          },
        });
      }
    }
    return res;
  }

  // ── Authentication (Driver Specific) ──────────────────────────

  /**
   * Driver Login
   * POST /api/login
   */
  public static async login(email: string, pass: string): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
    this.lastEmail = email;
    this.lastPass = pass;
    setStorageItem(STORAGE_EMAIL_KEY, email);
    setStorageItem(STORAGE_PASS_KEY, pass);

    try {
      const res = await fetchWithRetry(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Login gagal.' };
      }
      this.setAuthToken(data.access_token);
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
        setStorageItem(STORAGE_REFRESH_KEY, data.refresh_token);
      }
      return { success: true, token: data.access_token, user: data.user };
    } catch (e: any) {
      // Fallback for seeded demo accounts if backend is temporarily restarting
      if (
        pass === 'password123' &&
        (email === 'driver.motor@openjek.id' || email === 'driver.mobil@openjek.id' || email === 'calon.driver@openjek.id')
      ) {
        const isCar = email === 'driver.mobil@openjek.id';
        return {
          success: true,
          token: 'demo-local-session',
          user: {
            id: isCar ? 3 : 2,
            name: isCar ? 'Eko Prasetyo' : 'Budi Santoso',
            email,
            phone: isCar ? '081234567892' : '081234567891',
            active_role: isCar ? 'driver_car' : 'driver_motorcycle',
            balance: isCar ? 240000 : 95800,
          },
        };
      }
      return { success: false, error: e.message };
    }
  }

  /**
   * Driver Register (default role: driver_motorcycle)
   * POST /api/register
   */
  public static async register(
    name: string,
    email: string,
    phone: string,
    pass: string,
    role: 'driver_motorcycle' | 'driver_car' = 'driver_motorcycle'
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetchWithRetry(`${BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password: pass, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Registrasi driver gagal.' };
      }
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ── Driver Status & Online Toggle ─────────────────────────────

  /**
   * Toggle Driver Online / Offline Status
   * PUT /api/driver/status
   * Requires driver KYC verified & balance above minimum threshold.
   */
  public static async setDriverStatus(status: 'online' | 'offline'): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.authFetch(`${BASE_URL}/api/driver/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || `HTTP ${response.status}` };
      }

      return { success: true };
    } catch (err: any) {
      console.warn('[DriverApi] setDriverStatus fallback:', err.message);
      return { success: true };
    }
  }

  // ── Order Dispatch Lifecycle (Driver Specific) ─────────────────

  /**
   * Driver accepts incoming dispatch order
   * PUT /api/orders/:uuid/accept
   */
  public static async acceptOrder(orderUuid: string): Promise<{ success: boolean; data?: any; error?: string }> {
    // Simulasi test order lokal tidak perlu memanggil remote server
    if (orderUuid.startsWith('ord-') || orderUuid.startsWith('mock-')) {
      return { success: true, data: { id: orderUuid, status: 'accepted' } };
    }

    try {
      const response = await this.authFetch(`${BASE_URL}/api/orders/${orderUuid}/accept`, {
        method: 'PUT',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || 'Pesanan sudah diambil driver lain atau kedaluwarsa.' };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err: any) {
      console.warn('[DriverApi] acceptOrder offline fallback:', err.message);
      return { success: true };
    }
  }

  /**
   * Driver rejects incoming dispatch order
   * PUT /api/orders/:uuid/reject
   */
  public static async rejectOrder(orderUuid: string): Promise<{ success: boolean; error?: string }> {
    if (orderUuid.startsWith('ord-') || orderUuid.startsWith('mock-')) {
      return { success: true };
    }

    try {
      const response = await this.authFetch(`${BASE_URL}/api/orders/${orderUuid}/reject`, {
        method: 'PUT',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || 'Gagal menolak pesanan.' };
      }

      return { success: true };
    } catch (err: any) {
      console.warn('[DriverApi] rejectOrder offline fallback:', err.message);
      return { success: true };
    }
  }

  /**
   * Driver updates lifecycle step of an active order
   * PUT /api/orders/:uuid/status
   * action: "arrive" (sampai jemput) | "start" (mulai antar) | "complete" (selesai) | "cancel"
   */
  public static async updateOrderStatus(
    orderUuid: string,
    action: 'arrive' | 'start' | 'complete' | 'cancel'
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (orderUuid.startsWith('ord-') || orderUuid.startsWith('mock-')) {
      return { success: true, data: { id: orderUuid, action } };
    }

    try {
      const response = await this.authFetch(`${BASE_URL}/api/orders/${orderUuid}/status`, {
        method: 'PUT',
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || 'Gagal memperbarui status order.' };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err: any) {
      console.warn('[DriverApi] updateOrderStatus offline fallback:', err.message);
      return { success: true };
    }
  }

  // ── History & Shift Earnings ──────────────────────────────────

  /**
   * Fetch Driver Orders History
   * GET /api/driver/orders?page=1&status=completed
   */
  public static async getDriverOrders(page: number = 1, status?: string): Promise<any> {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.append('status', status);

      const response = await this.authFetch(`${BASE_URL}/api/driver/orders?${params.toString()}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('[DriverApi] getDriverOrders fallback');
    }
    return { orders: [], summary: null };
  }

  /**
   * Fetch Driver Shift Earnings Breakdown
   * GET /api/driver/earnings
   * Returns: { summary: { trips, gross_fare, platform_fee, driver_earning }, daily: [...], current_balance }
   */
  public static async getDriverEarnings(): Promise<any> {
    try {
      const response = await this.authFetch(`${BASE_URL}/api/driver/earnings`);
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('[DriverApi] getDriverEarnings fallback');
    }
    return null;
  }

  /**
   * Fetch Driver Wallet History
   * GET /api/driver/wallet/history
   */
  public static async getDriverWalletHistory(page: number = 1): Promise<any[]> {
    try {
      const response = await this.authFetch(`${BASE_URL}/api/driver/wallet/history?page=${page}`);
      if (response.ok) {
        const json = await response.json();
        return json.transactions || [];
      }
    } catch (err) {
      console.warn('[DriverApi] getDriverWalletHistory fallback');
    }
    return [];
  }

  /**
   * Driver Withdraw Balance (Tarik Pendapatan)
   * POST /api/wallet/withdraw
   * Destination bank is securely locked to driver's approved KYC bank account.
   */
  public static async withdraw(amount: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await this.authFetch(`${BASE_URL}/api/wallet/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: data.error || 'Penarikan saldo gagal.' };
      }

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ── Verification & KYC ────────────────────────────────────────

  /**
   * Fetch KYC Documents Status
   * GET /api/driver/kyc
   */
  public static async getKycStatus(): Promise<any> {
    try {
      const response = await this.authFetch(`${BASE_URL}/api/driver/kyc`);
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('[DriverApi] getKycStatus fallback');
    }
    return null;
  }

  /**
   * Submit KYC Documents
   * POST /api/driver/kyc
   */
  public static async submitKyc(payload: {
    identity_card_number: string;
    identity_card_photo_url: string;
    license_number: string;
    license_photo_url: string;
    vehicle_registration_number: string;
    vehicle_registration_photo_url: string;
    selfie_photo_url: string;
    bank_name: string;
    bank_account_number: string;
    bank_account_name: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await this.authFetch(`${BASE_URL}/api/driver/kyc`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: data.error || 'Gagal mengajukan dokumen verifikasi.' };
      }

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Update Driver Profile & Vehicle Details
   * PUT /api/profile/driver
   */
  public static async updateDriverProfile(payload: {
    vehicle_brand?: string;
    vehicle_model?: string;
    vehicle_plate?: string;
    vehicle_year?: number;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await this.authFetch(`${BASE_URL}/api/profile/driver`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: data.error || 'Gagal memperbarui profil driver.' };
      }

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ── In-Ride Chat (Driver <-> Customer) ──────────────────────────

  /**
   * Send In-Ride Message to Customer
   * POST /api/orders/:uuid/chat
   */
  public static async sendChatMessage(orderUuid: string, message: string): Promise<boolean> {
    try {
      const response = await this.authFetch(`${BASE_URL}/api/orders/${orderUuid}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get In-Ride Chat History
   * GET /api/orders/:uuid/chat
   */
  public static async getChatHistory(orderUuid: string): Promise<any[]> {
    try {
      const response = await this.authFetch(`${BASE_URL}/api/orders/${orderUuid}/chat`);
      if (response.ok) {
        const json = await response.json();
        return json.messages || [];
      }
    } catch {
      // ignore
    }
    return [];
  }

  // ── Notifications & Emergency Support ─────────────────────────

  /**
   * Fetch Driver Notifications
   * GET /api/notifications
   */
  public static async getNotifications(): Promise<{ notifications: any[]; unread_count: number }> {
    try {
      const response = await this.authFetch(`${BASE_URL}/api/notifications`);
      if (response.ok) {
        const data = await response.json();
        return {
          notifications: data.notifications || [],
          unread_count: data.unread_count || 0,
        };
      }
    } catch {
      // ignore
    }
    return { notifications: [], unread_count: 0 };
  }

  /**
   * Fetch Complete Driver Profile (User + DriverProfile + Vehicles)
   * GET /api/profile
   */
  public static async getProfile(): Promise<any> {
    try {
      const response = await this.authFetch(`${BASE_URL}/api/profile`);
      if (response.ok) {
        const json = await response.json();
        return json.profile || json;
      }
    } catch (err) {
      console.warn('[DriverApi] getProfile fallback');
    }
    return null;
  }

  /**
   * Fetch Single Order Details by UUID
   * GET /api/orders/:uuid
   */
  public static async getOrderByUUID(orderUuid: string): Promise<any> {
    if (!orderUuid || orderUuid.startsWith('ord-') || orderUuid.startsWith('mock-')) {
      return null;
    }
    try {
      const response = await this.authFetch(`${BASE_URL}/api/orders/${orderUuid}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('[DriverApi] getOrderByUUID fallback');
    }
    return null;
  }

  /**
   * Fetch Active Merchants (for real map hotspots & demand zones)
   * GET /api/merchants
   */
  public static async getMerchants(): Promise<any[]> {
    try {
      const response = await fetchWithRetry(`${BASE_URL}/api/merchants`);
      if (response.ok) {
        const json = await response.json();
        return json.merchants || [];
      }
    } catch {
      // ignore
    }
    return [];
  }

  /**
   * Create a 100% Real Order in Backend from Customer Account
   * Used when clicking "Test Order" so the order is stored in PostgreSQL and dispatched via WebSocket
   */
  public static async createRealCustomerOrder(payload: {
    pickup_lat: number;
    pickup_lon: number;
    pickup_address: string;
    dropoff_lat: number;
    dropoff_lon: number;
    dropoff_address: string;
    service_type?: 'ride' | 'car' | 'food' | 'send';
    vehicle_type?: 'motorcycle' | 'car';
    payment_method?: 'cash' | 'wallet';
  }): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      const loginRes = await fetchWithRetry(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'penumpang@openjek.id', password: 'password123' }),
      });
      if (!loginRes.ok) {
        return { success: false, error: 'Gagal otentikasi akun penumpang.' };
      }
      const loginData = await loginRes.json();
      const riderToken = loginData.access_token;

      const orderRes = await fetchWithRetry(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${riderToken}`,
        },
        body: JSON.stringify({
          service_type: payload.service_type || 'ride',
          vehicle_type: payload.vehicle_type || 'motorcycle',
          payment_method: payload.payment_method || 'cash',
          pickup_lat: payload.pickup_lat,
          pickup_lon: payload.pickup_lon,
          pickup_address: payload.pickup_address,
          dropoff_lat: payload.dropoff_lat,
          dropoff_lon: payload.dropoff_lon,
          dropoff_address: payload.dropoff_address,
        }),
      });
      const orderData = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok) {
        return { success: false, error: orderData.error || 'Gagal membuat order real.' };
      }
      return {
        success: true,
        order: {
          ...(orderData.order || orderData),
          rider_name: loginData.user?.name || 'Ahmad Fauzi',
          rider_phone: loginData.user?.phone || '081234567890',
        },
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Create Emergency / Support Ticket
   * POST /api/support/tickets
   */
  public static async createSupportTicket(subject: string, description: string, priority: string = 'high'): Promise<boolean> {
    try {
      const response = await this.authFetch(`${BASE_URL}/api/support/tickets`, {
        method: 'POST',
        body: JSON.stringify({ subject, description, category: 'emergency', priority }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
