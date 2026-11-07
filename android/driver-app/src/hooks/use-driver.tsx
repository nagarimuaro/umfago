import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { DriverProfile, DriverStatus, SurgeArea } from '../types/driver';
import { DriverOrder, DriverOrderStep } from '../types/order';
import { INITIAL_DRIVER_PROFILE, SURGE_AREAS, MOCK_ORDERS_HISTORY, SAMPLE_INCOMING_ORDER } from '../constants/mock-data';
import { DriverApiService } from '../services/api';
import { DriverWebSocketService } from '../services/websocket';
import { getShortestNavigationRoute } from '../services/navigation-router';

interface DriverContextType {
  driver: DriverProfile;
  isOnline: boolean;
  isAuthenticated: boolean;
  currentOrder: DriverOrder | null;
  incomingOrder: DriverOrder | null;
  orderHistory: DriverOrder[];
  surgeAreas: SurgeArea[];
  currentLocation: { latitude: number; longitude: number; heading: number } | null;
  activeRoute: Array<[number, number]> | null;
  toggleOnline: () => Promise<void>;
  acceptIncomingOrder: () => Promise<void>;
  rejectIncomingOrder: () => void;
  advanceOrderStep: () => Promise<void>;
  cancelActiveOrder: (reason?: string) => Promise<void>;
  simulateIncomingOrder: () => void;
  updateDriverProfile: (updates: Partial<DriverProfile>) => void;
  loginDriver: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerDriver: (
    name: string,
    email: string,
    phone: string,
    pass: string,
    role?: 'driver_motorcycle' | 'driver_car'
  ) => Promise<{ success: boolean; error?: string }>;
  logoutDriver: () => void;
  withdrawBalance: (amount: number) => Promise<{ success: boolean; error?: string }>;
}

const DriverContext = createContext<DriverContextType | null>(null);

// Helper menghitung sudut kompas (bearing/heading) dari titik A ke titik B
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

function densifyRoute(coords: Array<[number, number]>, stepMeters: number = 2.0): Array<[number, number]> {
  if (!coords || coords.length < 2) return coords;
  const result: Array<[number, number]> = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const dLat = (p1[1] - p0[1]) * 111000;
    const dLon = (p1[0] - p0[0]) * 111000 * Math.cos((p0[1] * Math.PI) / 180);
    const dist = Math.hypot(dLat, dLon);
    const steps = Math.max(1, Math.ceil(dist / stepMeters));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      result.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t]);
    }
  }
  result.push(coords[coords.length - 1]);
  return result;
}

export const DriverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [driver, setDriver] = useState<DriverProfile>(INITIAL_DRIVER_PROFILE);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [currentOrder, setCurrentOrder] = useState<DriverOrder | null>(null);
  const [incomingOrder, setIncomingOrder] = useState<DriverOrder | null>(null);
  const [orderHistory, setOrderHistory] = useState<DriverOrder[]>(MOCK_ORDERS_HISTORY);
  const [surgeAreas] = useState<SurgeArea[]>(SURGE_AREAS);
  const [activeRoute, setActiveRoute] = useState<Array<[number, number]> | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; heading: number } | null>({
    latitude: -6.1952,
    longitude: 106.8231,
    heading: 90,
  });

  const locationWatchSub = useRef<Location.LocationSubscription | null>(null);
  const headingWatchSub = useRef<Location.LocationSubscription | null>(null);
  const tripSimTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const routePointsRef = useRef<Array<[number, number]>>([]);
  const routeIndexRef = useRef<number>(0);
  const isOnlineRef = useRef<boolean>(isOnline);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const syncBackendData = useCallback(async () => {
    try {
      const [earnings, ordersData] = await Promise.all([
        DriverApiService.getDriverEarnings(),
        DriverApiService.getDriverOrders(1),
      ]);

      if (earnings) {
        setDriver((prev) => ({
          ...prev,
          balance: typeof earnings.current_balance === 'number' ? earnings.current_balance : prev.balance,
          stats: {
            ...prev.stats,
            todayEarnings:
              typeof earnings.summary?.driver_earning === 'number'
                ? Math.max(prev.stats.todayEarnings, earnings.summary.driver_earning)
                : prev.stats.todayEarnings,
            completedTrips:
              typeof earnings.summary?.trips === 'number'
                ? Math.max(prev.stats.completedTrips, earnings.summary.trips)
                : prev.stats.completedTrips,
          },
        }));
      }

      if (ordersData && Array.isArray(ordersData.orders) && ordersData.orders.length > 0) {
        const mappedOrders: DriverOrder[] = ordersData.orders.map((o: any) => {
          const fare = typeof o.fare_amount === 'number' ? o.fare_amount : 22000;
          const net = typeof o.driver_earning === 'number' ? o.driver_earning : Math.round(fare * 0.85);
          const fee = typeof o.platform_fee === 'number' ? o.platform_fee : Math.max(0, fare - net);
          const isCompleted = o.status === 'completed';
          const isCancelled = o.status === 'cancelled';
          const dateLabel = o.created_at
            ? new Date(o.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : 'Hari ini';

          return {
            id: o.uuid || String(o.id),
            code: `ORD-${(o.uuid || '0000').slice(-4).toUpperCase()}`,
            serviceType: o.service_type === 'car' ? 'car' : 'ride',
            step: isCompleted ? 'completed' : 'heading_to_pickup',
            status: isCompleted ? 'completed' : isCancelled ? 'cancelled' : 'in_progress',
            customer: {
              id: o.user_id || 1,
              name: o.customer_name || 'Pelanggan UmfaGo',
              phone: '+62 812-0000-0000',
              rating: 4.9,
            },
            pickup: {
              latitude: o.pickup_lat || -6.1952,
              longitude: o.pickup_lng || 106.8231,
              address: o.pickup_address || 'Lokasi Penjemputan',
            },
            destination: {
              latitude: o.dropoff_lat || -6.2255,
              longitude: o.dropoff_lng || 106.8095,
              address: o.dropoff_address || 'Lokasi Tujuan',
            },
            distanceKm: o.distance_km || 3.5,
            estimatedDurationMinutes: o.duration_minutes || 12,
            fareAmount: fare,
            driverEarnings: net,
            platformFee: fee,
            tipAmount: o.tip_amount || 0,
            paymentMethod: o.payment_method === 'cash' ? 'cash' : 'wallet',
            createdAt: dateLabel,
          };
        });

        setOrderHistory((prev) => {
          const existingIds = new Set(mappedOrders.map((m) => m.id));
          return [...mappedOrders, ...prev.filter((p) => !existingIds.has(p.id))];
        });
      }
    } catch {
      // Fallback to local state silently
    }
  }, []);

  // Initialize GPS & Compass Tracking (Once on mount)
  useEffect(() => {
    let isMounted = true;

    if (Platform.OS !== 'web') {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted' && isMounted) {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setCurrentLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              heading: loc.coords.heading ?? 90,
            });

            // Watch physical device compass heading in real-time
            try {
              headingWatchSub.current = await Location.watchHeadingAsync((headingData) => {
                if (!isMounted) return;
                const deg = Math.round(headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading);
                if (!isNaN(deg)) {
                  setCurrentLocation((prev) => (prev ? { ...prev, heading: deg } : prev));
                }
              });
            } catch {
              // Compass sensor not available
            }

            locationWatchSub.current = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.High,
                timeInterval: 5000,
                distanceInterval: 10,
              },
              (newLoc) => {
                if (!isMounted) return;
                const coords = {
                  latitude: newLoc.coords.latitude,
                  longitude: newLoc.coords.longitude,
                  heading: newLoc.coords.heading ?? 90,
                };
                setCurrentLocation(coords);

                // Broadcast to WebSocket if online
                if (isOnlineRef.current) {
                  DriverWebSocketService.sendLocation(coords.latitude, coords.longitude, coords.heading, newLoc.coords.speed ?? 0);
                }
              }
            );
          }
        } catch {
          // Fallback to default Jakarta coordinates silently
        }
      })();
    }

    // Authenticate with Backend & Connect Realtime Dispatch WebSocket
    (async () => {
      try {
        let token = DriverApiService.getAuthToken();
        if (!token) {
          // Auto-authenticate with driver motorcycle credentials
          const res = await DriverApiService.login('driver.motor@openjek.id', 'password123');
          if (res.success && res.token) {
            token = res.token;
            if (res.user && typeof res.user.balance === 'number') {
              setDriver((prev) => ({
                ...prev,
                balance: res.user.balance,
              }));
            }
            DriverWebSocketService.connect(token);
          } else {
            return;
          }
        } else {
          DriverWebSocketService.connect(token);
        }

        // Sync online status, real shift earnings & order history with backend
        if (token && token !== 'demo-local-session') {
          if (isOnlineRef.current) {
            await DriverApiService.setDriverStatus('online');
          }
          if (isMounted) {
            await syncBackendData();
          }
        }
      } catch {
        // Standalone cockpit active
      }
    })();
    const unsub = DriverWebSocketService.addListener((payload) => {
      if (payload.type === 'incoming_order' || payload.type === 'order_offered') {
        const orderUuid = payload.order_uuid || payload.order?.uuid || `ord-${Date.now()}`;
        const fare = payload.fare_amount || payload.order?.fare || 24000;
        setIncomingOrder({
          id: orderUuid,
          code: payload.code || payload.order?.code || `ORD-${orderUuid.slice(-4).toUpperCase()}`,
          serviceType: payload.vehicle_type === 'car' ? 'car' : 'ride',
          step: 'offered',
          status: 'searching',
          customer: {
            id: payload.rider_id || payload.order?.rider_id || 99,
            name: payload.rider_name || payload.order?.rider_name || 'Pelanggan UmfaGo',
            phone: payload.rider_phone || payload.order?.rider_phone || '+62 812-0000-0000',
            rating: 4.9,
          },
          pickup: {
            latitude: payload.pickup_lat ?? payload.order?.origin_lat ?? -6.1952,
            longitude: payload.pickup_lon ?? payload.order?.origin_lng ?? 106.8231,
            address: payload.pickup_address || payload.order?.origin_address || 'Grand Indonesia, Jakarta',
          },
          destination: {
            latitude: payload.dropoff_lat ?? payload.order?.destination_lat ?? -6.2255,
            longitude: payload.dropoff_lon ?? payload.order?.destination_lng ?? 106.8095,
            address: payload.dropoff_address || payload.order?.destination_address || 'SCBD Jakarta Selatan',
          },
          distanceKm: payload.distance_km || payload.order?.distance_km || 4.2,
          estimatedDurationMinutes: payload.duration_minutes || payload.order?.duration_minutes || 15,
          fareAmount: fare,
          driverEarnings: Math.round(fare * 0.85),
          platformFee: Math.round(fare * 0.15),
          tipAmount: 0,
          paymentMethod: 'wallet',
          createdAt: 'Baru saja',
          expiresInSeconds: 15,
        });
      }
    });

    return () => {
      isMounted = false;
      if (locationWatchSub.current) {
        locationWatchSub.current.remove();
      }
      if (headingWatchSub.current) {
        headingWatchSub.current.remove();
      }
      unsub();
    };
  }, []);

  const toggleOnline = useCallback(async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    setDriver((prev) => ({
      ...prev,
      status: nextState ? 'online' : 'offline',
    }));

    await DriverApiService.setDriverStatus(nextState ? 'online' : 'offline');
  }, [isOnline]);

  const acceptIncomingOrder = useCallback(async () => {
    if (!incomingOrder) return;

    const acceptedOrder: DriverOrder = {
      ...incomingOrder,
      step: 'heading_to_pickup',
      status: 'accepted',
    };

    setIncomingOrder(null);
    setCurrentOrder(acceptedOrder);
    setDriver((prev) => ({ ...prev, status: 'busy' }));

    await DriverApiService.acceptOrder(acceptedOrder.id);
  }, [incomingOrder]);

  const rejectIncomingOrder = useCallback(() => {
    if (incomingOrder?.id) {
      DriverApiService.rejectOrder(incomingOrder.id);
    }
    setIncomingOrder(null);
  }, [incomingOrder]);

  // Navigasi jalan raya riil (jarak terdekat via OSRM / Valhalla)
  // Driver bergerak mengikuti kontur jalan, belokan, dan tikungan riil
  useEffect(() => {
    let isCancelled = false;

    if (currentOrder?.step === 'heading_to_pickup') {
      const pLat = currentOrder.pickup.latitude;
      const pLon = currentOrder.pickup.longitude;
      const isFarEnough = currentLocation?.latitude &&
        Math.hypot(currentLocation.latitude - pLat, currentLocation.longitude - pLon) > 0.003;
      const startLat = isFarEnough ? currentLocation.latitude : -6.2018;
      const startLon = isFarEnough ? currentLocation.longitude : 106.8188;
      const mode = currentOrder.serviceType === 'car' ? 'car' : 'motorcycle';

      getShortestNavigationRoute([startLat, startLon], [pLat, pLon], mode).then((res) => {
        if (isCancelled) return;
        const rawCoords = res.coordinates && res.coordinates.length > 1
          ? res.coordinates
          : ([[startLon, startLat], [pLon, pLat]] as Array<[number, number]>);
        const coords = densifyRoute(rawCoords, 2.0);

        routePointsRef.current = coords;
        routeIndexRef.current = 0;
        setActiveRoute(rawCoords);

        // Update estimasi jarak riil terdekat dan waktu tempuh
        setCurrentOrder((prev) => (prev ? {
          ...prev,
          distanceKm: res.distanceKm,
          estimatedDurationMinutes: res.durationMinutes,
          routeCoordinates: rawCoords,
        } : null));

        const first = coords[0];
        const next = coords[1] || coords[0];
        const initialHeading = Math.round(calculateBearing(first[1], first[0], next[1], next[0]));

        setCurrentLocation({
          latitude: first[1],
          longitude: first[0],
          heading: initialHeading,
        });

        let lastWsSend = 0;
        if (tripSimTimer.current) clearInterval(tripSimTimer.current);

        tripSimTimer.current = setInterval(() => {
          if (routeIndexRef.current < routePointsRef.current.length - 1) {
            routeIndexRef.current += 1;
            const idx = routeIndexRef.current;
            const curPt = routePointsRef.current[idx];
            const nextPt = routePointsRef.current[Math.min(routePointsRef.current.length - 1, idx + 1)];
            const stepHeading = Math.round(calculateBearing(curPt[1], curPt[0], nextPt[1], nextPt[0]));

            setCurrentLocation({
              latitude: curPt[1],
              longitude: curPt[0],
              heading: stepHeading,
            });

            // Sinkronkan rute maju secara berkala
            if (idx % 10 === 0 || idx >= routePointsRef.current.length - 5) {
              const remaining = routePointsRef.current.slice(idx);
              setActiveRoute(remaining);
            }

            const now = Date.now();
            if (now - lastWsSend > 1000) {
              lastWsSend = now;
              DriverWebSocketService.sendLocation(curPt[1], curPt[0], stepHeading, 30);
            }
          } else {
            // Sampai di titik penjemputan: stop pergerakan agar tidak jalan terus
            if (tripSimTimer.current) {
              clearInterval(tripSimTimer.current);
              tripSimTimer.current = null;
            }
            setCurrentLocation({
              latitude: pLat,
              longitude: pLon,
              heading: 0,
            });
            setActiveRoute([[pLon, pLat]]);
          }
        }, 90);
      });
    } else if (currentOrder?.step === 'in_trip') {
      const pLat = currentOrder.pickup.latitude;
      const pLon = currentOrder.pickup.longitude;
      const dLat = currentOrder.destination.latitude;
      const dLon = currentOrder.destination.longitude;
      const mode = currentOrder.serviceType === 'car' ? 'car' : 'motorcycle';

      getShortestNavigationRoute([pLat, pLon], [dLat, dLon], mode).then((res) => {
        if (isCancelled) return;
        const rawCoords = res.coordinates && res.coordinates.length > 1
          ? res.coordinates
          : ([[pLon, pLat], [dLon, dLat]] as Array<[number, number]>);
        const coords = densifyRoute(rawCoords, 2.0);

        routePointsRef.current = coords;
        routeIndexRef.current = 0;
        setActiveRoute(rawCoords);

        setCurrentOrder((prev) => (prev ? {
          ...prev,
          distanceKm: res.distanceKm,
          estimatedDurationMinutes: res.durationMinutes,
          routeCoordinates: rawCoords,
        } : null));

        const first = coords[0];
        const next = coords[1] || coords[0];
        const initialHeading = Math.round(calculateBearing(first[1], first[0], next[1], next[0]));

        setCurrentLocation({
          latitude: first[1],
          longitude: first[0],
          heading: initialHeading,
        });

        let lastWsSend = 0;
        if (tripSimTimer.current) clearInterval(tripSimTimer.current);

        tripSimTimer.current = setInterval(() => {
          if (routeIndexRef.current < routePointsRef.current.length - 1) {
            routeIndexRef.current += 1;
            const idx = routeIndexRef.current;
            const curPt = routePointsRef.current[idx];
            const nextPt = routePointsRef.current[Math.min(routePointsRef.current.length - 1, idx + 1)];
            const stepHeading = Math.round(calculateBearing(curPt[1], curPt[0], nextPt[1], nextPt[0]));

            setCurrentLocation({
              latitude: curPt[1],
              longitude: curPt[0],
              heading: stepHeading,
            });

            if (idx % 10 === 0 || idx >= routePointsRef.current.length - 5) {
              const remaining = routePointsRef.current.slice(idx);
              setActiveRoute(remaining);
            }

            const now = Date.now();
            if (now - lastWsSend > 1000) {
              lastWsSend = now;
              DriverWebSocketService.sendLocation(curPt[1], curPt[0], stepHeading, 28);
            }
          } else {
            // Sampai di tujuan: stop pergerakan agar tidak jalan terus
            if (tripSimTimer.current) {
              clearInterval(tripSimTimer.current);
              tripSimTimer.current = null;
            }
            setCurrentLocation({
              latitude: dLat,
              longitude: dLon,
              heading: 0,
            });
            setActiveRoute([[dLon, dLat]]);
          }
        }, 90);
      });
    } else {
      setActiveRoute(null);
      if (tripSimTimer.current) {
        clearInterval(tripSimTimer.current);
        tripSimTimer.current = null;
      }
    }

    return () => {
      isCancelled = true;
      if (tripSimTimer.current) {
        clearInterval(tripSimTimer.current);
        tripSimTimer.current = null;
      }
    };
  }, [currentOrder?.step, currentOrder?.id]);

  const advanceOrderStep = useCallback(async () => {
    if (!currentOrder) return;

    let nextStep: DriverOrderStep = currentOrder.step;
    let action: 'arrive' | 'start' | 'complete' = 'arrive';

    const pLat = currentOrder.pickup.latitude;
    const pLon = currentOrder.pickup.longitude;
    const dLat = currentOrder.destination.latitude;
    const dLon = currentOrder.destination.longitude;
    const headingToDest = Math.round(calculateBearing(pLat, pLon, dLat, dLon));

    if (currentOrder.step === 'heading_to_pickup') {
      nextStep = 'arrived_at_pickup';
      action = 'arrive';
      // Posisi driver tepat di titik penjemputan
      setCurrentLocation({
        latitude: pLat,
        longitude: pLon,
        heading: headingToDest,
      });
      DriverWebSocketService.sendLocation(pLat, pLon, headingToDest, 0);
    } else if (currentOrder.step === 'arrived_at_pickup') {
      nextStep = 'in_trip';
      action = 'start';
      // Pas mulai perjalanan: posisi driver pas di lokasi penjemputan dan siap menuju alamat tujuan
      setCurrentLocation({
        latitude: pLat,
        longitude: pLon,
        heading: headingToDest,
      });
      DriverWebSocketService.sendLocation(pLat, pLon, headingToDest, 25);
    } else if (currentOrder.step === 'in_trip') {
      nextStep = 'completed';
      action = 'complete';
      // Selesai order: posisi driver pas di lokasi tujuan
      setCurrentLocation({
        latitude: dLat,
        longitude: dLon,
        heading: headingToDest,
      });
      DriverWebSocketService.sendLocation(dLat, dLon, headingToDest, 0);
    }

    if (nextStep === 'completed') {
      const completedOrder: DriverOrder = {
        ...currentOrder,
        step: 'completed',
        status: 'completed',
      };

      // Add to history and update shift earnings
      setOrderHistory((prev) => [completedOrder, ...prev]);
      setDriver((prev) => ({
        ...prev,
        status: 'online',
        balance: prev.balance + completedOrder.driverEarnings,
        stats: {
          ...prev.stats,
          todayEarnings: prev.stats.todayEarnings + completedOrder.driverEarnings,
          completedTrips: prev.stats.completedTrips + 1,
        },
      }));
      setCurrentOrder(null);

      await DriverApiService.updateOrderStatus(currentOrder.id, 'complete');
    } else {
      setCurrentOrder((prev) => (prev ? { ...prev, step: nextStep } : null));
      await DriverApiService.updateOrderStatus(currentOrder.id, action);
    }
  }, [currentOrder]);

  const cancelActiveOrder = useCallback(
    async (reason?: string) => {
      if (!currentOrder) return;
      const cancelled: DriverOrder = {
        ...currentOrder,
        status: 'cancelled',
      };
      setOrderHistory((prev) => [cancelled, ...prev]);
      setCurrentOrder(null);
      setDriver((prev) => ({
        ...prev,
        status: 'online',
        stats: {
          ...prev.stats,
          cancelledTrips: prev.stats.cancelledTrips + 1,
        },
      }));
      await DriverApiService.updateOrderStatus(currentOrder.id, 'cancel');
    },
    [currentOrder]
  );

  const simulateIncomingOrder = useCallback(() => {
    setIncomingOrder({
      ...SAMPLE_INCOMING_ORDER,
      id: `ord-${Date.now()}`,
      code: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      expiresInSeconds: 15,
    });
  }, []);

  const updateDriverProfile = useCallback((updates: Partial<DriverProfile>) => {
    setDriver((prev) => ({ ...prev, ...updates }));
  }, []);

  const loginDriver = useCallback(async (email: string, pass: string) => {
    const res = await DriverApiService.login(email, pass);
    if (!res.success || !res.token) {
      return { success: false, error: res.error || 'Email atau kata sandi tidak sesuai.' };
    }

    setIsAuthenticated(true);
    setIsOnline(true);

    if (res.user) {
      const isCar = res.user.active_role === 'driver_car';
      setDriver((prev) => ({
        ...prev,
        id: res.user.id || prev.id,
        name: res.user.name ? res.user.name.replace(/\s*\(Driver.*\)/i, '') : prev.name,
        email: res.user.email || email,
        phone: res.user.phone || prev.phone,
        balance: typeof res.user.balance === 'number' ? res.user.balance : prev.balance,
        status: 'online',
        vehicle: isCar
          ? {
              ...prev.vehicle,
              type: 'car',
              brand: 'Toyota',
              model: 'Toyota Avanza Veloz',
              plateNumber: 'BA 5678 AB',
              color: 'Hitam Metalik',
              year: 2023,
            }
          : prev.vehicle,
      }));
    }

    DriverWebSocketService.connect(res.token);
    await DriverApiService.setDriverStatus('online');
    await syncBackendData();
    return { success: true };
  }, [syncBackendData]);

  const withdrawBalance = useCallback(async (amount: number) => {
    const ok = await DriverApiService.withdraw(amount);
    if (ok) {
      setDriver((prev) => ({
        ...prev,
        balance: Math.max(0, prev.balance - amount),
      }));
      return { success: true };
    }
    return {
      success: false,
      error: 'Penarikan gagal atau saldo/KYC belum memenuhi syarat.',
    };
  }, []);

  const registerDriver = useCallback(
    async (
      name: string,
      email: string,
      phone: string,
      pass: string,
      role: 'driver_motorcycle' | 'driver_car' = 'driver_motorcycle'
    ) => {
      const regRes = await DriverApiService.register(name, email, phone, pass, role);
      if (!regRes.success) {
        return { success: false, error: regRes.error || 'Registrasi akun driver gagal.' };
      }
      return await loginDriver(email, pass);
    },
    [loginDriver]
  );

  const logoutDriver = useCallback(() => {
    DriverWebSocketService.disconnect();
    DriverApiService.setAuthToken(null);
    setIsOnline(false);
    setIsAuthenticated(false);
    setCurrentOrder(null);
    setIncomingOrder(null);
  }, []);

  return (
    <DriverContext.Provider
      value={{
        driver,
        isOnline,
        isAuthenticated,
        currentOrder,
        incomingOrder,
        orderHistory,
        surgeAreas,
        currentLocation,
        activeRoute,
        toggleOnline,
        acceptIncomingOrder,
        rejectIncomingOrder,
        advanceOrderStep,
        cancelActiveOrder,
        simulateIncomingOrder,
        updateDriverProfile,
        loginDriver,
        registerDriver,
        logoutDriver,
        withdrawBalance,
      }}
    >
      {children}
    </DriverContext.Provider>
  );
};

export const useDriver = () => {
  const context = useContext(DriverContext);
  if (!context) {
    throw new Error('useDriver must be used within a DriverProvider');
  }
  return context;
};

