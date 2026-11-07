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

    // Connect to WebSocket
    DriverWebSocketService.connect();
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

  const advanceOrderStep = useCallback(async () => {
    if (!currentOrder) return;

    let nextStep: DriverOrderStep = currentOrder.step;
    let action: 'arrive' | 'start' | 'complete' = 'arrive';

    if (currentOrder.step === 'heading_to_pickup') {
      nextStep = 'arrived_at_pickup';
      action = 'arrive';
    } else if (currentOrder.step === 'arrived_at_pickup') {
      nextStep = 'in_trip';
      action = 'start';
    } else if (currentOrder.step === 'in_trip') {
      nextStep = 'completed';
      action = 'complete';
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

