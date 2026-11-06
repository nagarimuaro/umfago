import { Platform } from 'react-native';

import type { Driver } from '@/types/order';

const BACKEND_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

async function getDriverToken(vehicleType: 'car' | 'motorcycle'): Promise<string | null> {
  const email = vehicleType === 'car' ? 'driver.mobil@openjek.id' : 'driver.motor@openjek.id';
  try {
    const res = await fetch(`${BACKEND_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

async function clearOngoingDriverOrders(token: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/driver/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const ongoing = (data.orders || []).filter((o: any) =>
      ['accepted', 'arrived', 'in_progress'].includes(o.status)
    );
    for (const o of ongoing) {
      if (o.status === 'accepted') {
        await fetch(`${BACKEND_URL}/api/orders/${o.uuid}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'arrive' }),
        });
        await fetch(`${BACKEND_URL}/api/orders/${o.uuid}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'start' }),
        });
      } else if (o.status === 'arrived') {
        await fetch(`${BACKEND_URL}/api/orders/${o.uuid}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'start' }),
        });
      }
      await fetch(`${BACKEND_URL}/api/orders/${o.uuid}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'complete' }),
      });
    }
  } catch {}
}

/**
 * Driver otomatis menerima order baru sesuai backend (simulasi matching worker)
 */
export async function autoAcceptDriverOrder(
  orderUUID: string,
  vehicleType: 'car' | 'motorcycle'
): Promise<Driver | null> {
  const token = await getDriverToken(vehicleType);
  if (!token) return null;

  try {
    // 1. Driver terima order (PUT /api/orders/:uuid/accept)
    let accRes = await fetch(`${BACKEND_URL}/api/orders/${orderUUID}/accept`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (accRes.status === 409) {
      await clearOngoingDriverOrders(token);
      accRes = await fetch(`${BACKEND_URL}/api/orders/${orderUUID}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    }

    if (accRes.ok) {
      // 2. Driver tiba di titik jemput (PUT /api/orders/:uuid/status { action: "arrive" })
      await fetch(`${BACKEND_URL}/api/orders/${orderUUID}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'arrive' }),
      });
    }

    const isCar = vehicleType === 'car';
    return {
      id: isCar ? 'drv-car' : 'drv-motor',
      name: isCar ? 'Hendra Wijaya' : 'Budi Santoso',
      rating: 4.9,
      vehicle: isCar ? 'Toyota Avanza (Mobil)' : 'Yamaha NMAX (Motor)',
      plate: isCar ? 'BA 5678 CD' : 'BA 1234 XY',
      photo: isCar
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
        : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      etaMinutes: 2,
    };
  } catch {
    return null;
  }
}

/**
 * Update status perjalanan driver ke backend (start, complete, cancel)
 */
export async function updateDriverOrderStatus(
  orderUUID: string,
  action: 'start' | 'complete' | 'cancel',
  vehicleType: 'car' | 'motorcycle' = 'motorcycle'
): Promise<boolean> {
  const token = await getDriverToken(vehicleType);
  if (!token) return false;

  try {
    const res = await fetch(`${BACKEND_URL}/api/orders/${orderUUID}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
