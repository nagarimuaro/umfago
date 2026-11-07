import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { DriverProfile, DriverStatus, SurgeArea } from '../types/driver';
import { DriverOrder, DriverOrderStep } from '../types/order';
import { INITIAL_DRIVER_PROFILE, SURGE_AREAS, MOCK_ORDERS_HISTORY, SAMPLE_INCOMING_ORDER } from '../constants/mock-data';
import { DriverApiService } from '../services/api';
import { DriverWebSocketService } from '../services/websocket';

interface DriverContextType {
  driver: DriverProfile;
  isOnline: boolean;
  currentOrder: DriverOrder | null;
  incomingOrder: DriverOrder | null;
  orderHistory: DriverOrder[];
  surgeAreas: SurgeArea[];
  currentLocation: { latitude: number; longitude: number; heading: number } | null;
  toggleOnline: () => Promise<void>;
  acceptIncomingOrder: () => Promise<void>;
  rejectIncomingOrder: () => void;
  advanceOrderStep: () => Promise<void>;
  cancelActiveOrder: (reason?: string) => Promise<void>;
  simulateIncomingOrder: () => void;
  updateDriverProfile: (updates: Partial<DriverProfile>) => void;
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

export const DriverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [driver, setDriver] = useState<DriverProfile>(INITIAL_DRIVER_PROFILE);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [currentOrder, setCurrentOrder] = useState<DriverOrder | null>(null);
  const [incomingOrder, setIncomingOrder] = useState<DriverOrder | null>(null);
  const [orderHistory, setOrderHistory] = useState<DriverOrder[]>(MOCK_ORDERS_HISTORY);
  const [surgeAreas] = useState<SurgeArea[]>(SURGE_AREAS);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; heading: number } | null>({
    latitude: -6.1952,
    longitude: 106.8231,
    heading: 90,
  });

  const locationWatchSub = useRef<Location.LocationSubscription | null>(null);
  const tripSimTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tripProgressRef = useRef<number>(0);

  // Initialize GPS Tracking
  useEffect(() => {
    let isMounted = true;

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
              if (isOnline) {
                DriverWebSocketService.sendLocation(coords.latitude, coords.longitude, coords.heading, newLoc.coords.speed ?? 0);
              }
            }
          );
        }
      } catch (e) {
        console.warn('[DriverGPS] Using default Jakarta coordinates:', e);
      }
    })();

    // Authenticate with Backend & Connect Realtime Dispatch WebSocket
    (async () => {
      try {
        let token = DriverApiService.getAuthToken();
        if (!token) {
          // Auto-authenticate with driver motorcycle credentials
          const res = await DriverApiService.login('driver.motor@openjek.id', 'password123');
          if (res.success && res.token) {
            token = res.token;
            DriverWebSocketService.connect(token);
          } else {
            console.log('[DriverWS] Driver operating in standalone demo mode.');
          }
        } else {
          DriverWebSocketService.connect(token);
        }
      } catch (err) {
        console.log('[DriverWS] Backend auth skipped; standalone cockpit active.');
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
      unsub();
    };
  }, [isOnline]);

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
    setIncomingOrder(null);
  }, []);

  // Simulasi pergerakan driver sepanjang rute saat jemput (heading_to_pickup) maupun antar (in_trip)
  useEffect(() => {
    if (currentOrder?.step === 'heading_to_pickup') {
      tripProgressRef.current = 0;
      const pLat = currentOrder.pickup.latitude;
      const pLon = currentOrder.pickup.longitude;
      const startLat = currentLocation?.latitude && Math.abs(currentLocation.latitude - pLat) > 0.001
        ? currentLocation.latitude
        : pLat - 0.008;
      const startLon = currentLocation?.longitude && Math.abs(currentLocation.longitude - pLon) > 0.001
        ? currentLocation.longitude
        : pLon - 0.006;
      const heading = Math.round(calculateBearing(startLat, startLon, pLat, pLon));

      setCurrentLocation({
        latitude: startLat,
        longitude: startLon,
        heading,
      });

      tripSimTimer.current = setInterval(() => {
        if (tripProgressRef.current < 0.95) {
          tripProgressRef.current = Math.min(0.95, tripProgressRef.current + 0.05);
          const prog = tripProgressRef.current;
          const curLat = startLat + (pLat - startLat) * prog;
          const curLon = startLon + (pLon - startLon) * prog;

          setCurrentLocation({
            latitude: curLat,
            longitude: curLon,
            heading,
          });

          DriverWebSocketService.sendLocation(curLat, curLon, heading, 30);
        }
      }, 2500);
    } else if (currentOrder?.step === 'in_trip') {
      tripProgressRef.current = 0;
      const pLat = currentOrder.pickup.latitude;
      const pLon = currentOrder.pickup.longitude;
      const dLat = currentOrder.destination.latitude;
      const dLon = currentOrder.destination.longitude;
      const heading = Math.round(calculateBearing(pLat, pLon, dLat, dLon));

      // Pas mulai perjalanan: posisi driver pas di lokasi penjemputan dan menghadap tujuan
      setCurrentLocation({
        latitude: pLat,
        longitude: pLon,
        heading,
      });

      tripSimTimer.current = setInterval(() => {
        if (tripProgressRef.current < 0.95) {
          tripProgressRef.current = Math.min(0.95, tripProgressRef.current + 0.04);
          const prog = tripProgressRef.current;
          const curLat = pLat + (dLat - pLat) * prog;
          const curLon = pLon + (dLon - pLon) * prog;

          setCurrentLocation({
            latitude: curLat,
            longitude: curLon,
            heading,
          });

          DriverWebSocketService.sendLocation(curLat, curLon, heading, 28);
        }
      }, 2500);
    } else {
      if (tripSimTimer.current) {
        clearInterval(tripSimTimer.current);
        tripSimTimer.current = null;
      }
    }

    return () => {
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

  return (
    <DriverContext.Provider
      value={{
        driver,
        isOnline,
        currentOrder,
        incomingOrder,
        orderHistory,
        surgeAreas,
        currentLocation,
        toggleOnline,
        acceptIncomingOrder,
        rejectIncomingOrder,
        advanceOrderStep,
        cancelActiveOrder,
        simulateIncomingOrder,
        updateDriverProfile,
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

