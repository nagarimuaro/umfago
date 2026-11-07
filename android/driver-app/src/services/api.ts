/**
 * UmfaGo Driver API Client
 * Connects to https://umfa-core.fazalabs.sbs with graceful offline fallback
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://umfa-core.fazalabs.sbs';

export class DriverApiService {
  private static token: string | null = null;

  public static setAuthToken(token: string | null) {
    this.token = token;
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

  /**
   * Toggle Driver Online / Offline Status
   * PUT /api/driver/status
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
      // In mobile environment or offline demo, log and treat gracefully
      console.warn('[DriverApi] setDriverStatus error (using fallback):', err.message);
      return { success: true };
    }
  }

  /**
   * Driver accepts incoming dispatch order
   * PUT /api/orders/:uuid/accept
   */
  public static async acceptOrder(orderUuid: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${BASE_URL}/api/orders/${orderUuid}/accept`, {
        method: 'PUT',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || 'Pesanan sudah diambil atau kedaluwarsa.' };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err: any) {
      console.warn('[DriverApi] acceptOrder offline fallback:', err.message);
      return { success: true };
    }
  }

  /**
   * Driver updates lifecycle step of an active order
   * PUT /api/orders/:uuid/status
   * action: "arrive" | "start" | "complete" | "cancel"
   */
  public static async updateOrderStatus(
    orderUuid: string,
    action: 'arrive' | 'start' | 'complete' | 'cancel'
  ): Promise<{ success: boolean; data?: any; error?: string }> {
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

  /**
   * Fetch Driver Orders History
   * GET /api/driver/orders
   */
  public static async getDriverOrders(): Promise<any[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/driver/orders`, {
        headers: this.getHeaders(),
      });
      if (response.ok) {
        const json = await response.json();
        return json.orders || [];
      }
    } catch (err) {
      console.warn('[DriverApi] getDriverOrders fallback');
    }
    return [];
  }

  /**
   * Fetch Driver Shift Earnings
   * GET /api/driver/earnings
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
}
