/**
 * UmfaGo Driver API Client
 * Aligned with Golang backend in internal/server/server.go & internal/handlers/
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://umfa-core.fazalabs.sbs';

export class DriverApiService {
  private static token: string | null = null;

  public static setAuthToken(token: string | null) {
    this.token = token;
  }

  public static getAuthToken(): string | null {
    return this.token;
  }

  private static getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // ── Authentication (Driver Specific) ──────────────────────────

  /**
   * Driver Login
   * POST /api/login
   */
  public static async login(email: string, pass: string): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login gagal.' };
      }
      this.token = data.access_token;
      return { success: true, token: data.access_token, user: data.user };
    } catch (e: any) {
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
      const res = await fetch(`${BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password: pass, role }),
      });
      const data = await res.json();
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
      const response = await fetch(`${BASE_URL}/api/driver/status`, {
        method: 'PUT',
        headers: this.getHeaders(),
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
      const response = await fetch(`${BASE_URL}/api/orders/${orderUuid}/accept`, {
        method: 'PUT',
        headers: this.getHeaders(),
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
      const response = await fetch(`${BASE_URL}/api/orders/${orderUuid}/reject`, {
        method: 'PUT',
        headers: this.getHeaders(),
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
      const response = await fetch(`${BASE_URL}/api/orders/${orderUuid}/status`, {
        method: 'PUT',
        headers: this.getHeaders(),
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

      const response = await fetch(`${BASE_URL}/api/driver/orders?${params.toString()}`, {
        headers: this.getHeaders(),
      });
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
      const response = await fetch(`${BASE_URL}/api/driver/earnings`, {
        headers: this.getHeaders(),
      });
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
      const response = await fetch(`${BASE_URL}/api/driver/wallet/history?page=${page}`, {
        headers: this.getHeaders(),
      });
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
      const response = await fetch(`${BASE_URL}/api/wallet/withdraw`, {
        method: 'POST',
        headers: this.getHeaders(),
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
      const response = await fetch(`${BASE_URL}/api/driver/kyc`, {
        headers: this.getHeaders(),
      });
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
      const response = await fetch(`${BASE_URL}/api/driver/kyc`, {
        method: 'POST',
        headers: this.getHeaders(),
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
      const response = await fetch(`${BASE_URL}/api/profile/driver`, {
        method: 'PUT',
        headers: this.getHeaders(),
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
      const response = await fetch(`${BASE_URL}/api/orders/${orderUuid}/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
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
      const response = await fetch(`${BASE_URL}/api/orders/${orderUuid}/chat`, {
        headers: this.getHeaders(),
      });
      if (response.ok) {
        const json = await response.json();
        return json.messages || [];
      }
    } catch {
      // ignore
    }
    return [];
  }
}
