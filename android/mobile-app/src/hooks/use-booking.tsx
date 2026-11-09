import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { AvailablePromos, FareRules } from '@/constants/pricing';
import { calculateFare, EmptyFare } from '@/lib/fare';
import { reversePhotonGeocode } from '@/services/photon';
import { getValhallaRoute } from '@/services/valhalla';
import { useAuth } from '@/hooks/use-auth';
import type {
  Driver,
  FareBreakdown,
  PaymentMethodId,
  Place,
  Promo,
  RouteEstimate,
  ServiceId,
  TripStatus,
} from '@/types/order';
import { ENV } from '@/constants/env';

const BACKEND_URL = ENV.API_URL;

type BookingState = {
  pickup: Place | null;
  destination: Place | null;
  /** Routed distance for the current destination. Null until one is chosen. */
  route: RouteEstimate | null;
  service: ServiceId;
  payment: PaymentMethodId;
  promo: Promo | null;
  status: TripStatus;
  driver: Driver | null;
  orderUUID: string | null;
};

export type BackendQuote = {
  distanceKm: number;
  chargedDistanceKm: number;
  minDistanceKm: number;
  minDistanceApplied: boolean;
  perKmPrice: number;
  tripFare: number;
  minFare: number;
  serviceFee: number;
  totalCharged: number;
};

export type PromoResult = {
  success: boolean;
  message: string;
  discount?: number;
};

type BookingContextValue = BookingState & {
  /** Itemised fare for the current route and service. Zeroed with no destination. */
  fare: FareBreakdown;
  backendQuote: BackendQuote | null;
  setPickup: (place: Place | null) => void;
  setDestination: (place: Place | null) => void;
  setService: (service: ServiceId) => void;
  setPayment: (payment: PaymentMethodId) => void;
  startBooking: (params: {
    pickup: Place;
    destination: Place;
    service: ServiceId;
    payment: PaymentMethodId;
    promo?: Promo | null;
  }) => void;
  applyPromo: (code: string) => Promise<PromoResult>;
  clearPromo: () => void;
  setOrderUUID: (uuid: string | null) => void;
  /** Simulates a driver accepting the order. Replace with a real API call. */
  assignDriver: (driver?: Driver) => void;
  setStatus: (status: TripStatus) => void;
  reset: () => void;
};

const DefaultPickup: Place = {
  id: 'current',
  label: 'Lokasi saat ini',
  address: 'Sijunjung, Sumatera Barat',
  lat: -0.664159,
  lon: 100.939844,
};

const InitialState: BookingState = {
  pickup: DefaultPickup,
  destination: null,
  route: null,
  service: 'ride',
  payment: 'cash',
  promo: null,
  status: 'searching',
  driver: null,
  orderUUID: null,
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [state, setState] = useState<BookingState>(InitialState);
  const [backendQuote, setBackendQuote] = useState<BackendQuote | null>(null);

  // Sinkronkan lokasi GPS perangkat secara otomatis sejak awal agar peta langsung berada di posisi pengguna
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              if (!mounted) return;
              const lat = pos.coords.latitude;
              const lon = pos.coords.longitude;
              const addr = await reversePhotonGeocode(lat, lon);
              if (!mounted) return;
              setState((s) =>
                !s.pickup || s.pickup.id === 'current'
                  ? {
                      ...s,
                      pickup: {
                        id: `gps-init-${Date.now()}`,
                        label: 'Lokasi Saya (Saat Ini)',
                        address: addr,
                        lat,
                        lon,
                      },
                    }
                  : s
              );
            },
            () => {},
            { enableHighAccuracy: true, timeout: 6000 }
          );
          return;
        }

        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status === 'granted') {
          let loc = await Location.getLastKnownPositionAsync().catch(() => null);
          if (!loc) {
            loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
          }
          if (loc?.coords && mounted) {
            const lat = loc.coords.latitude;
            const lon = loc.coords.longitude;
            const addr = await reversePhotonGeocode(lat, lon);
            if (!mounted) return;
            setState((s) =>
              !s.pickup || s.pickup.id === 'current'
                ? {
                    ...s,
                    pickup: {
                      id: `gps-init-${Date.now()}`,
                      label: 'Lokasi Saya (Saat Ini)',
                      address: addr,
                      lat,
                      lon,
                    },
                  }
                : s
            );
          }
        }
      } catch {
        // Ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Pemicu kalkulasi rute jalan raya Valhalla setiap kali koordinat pickup, destination, atau service berubah
  useEffect(() => {
    if (
      state.pickup?.lat &&
      state.pickup?.lon &&
      state.destination?.lat &&
      state.destination?.lon
    ) {
      let cancelled = false;
      const costing = state.service === 'car' ? 'auto' : 'motorcycle';
      getValhallaRoute(
        [state.pickup.lat, state.pickup.lon],
        [state.destination.lat, state.destination.lon],
        costing
      )
        .then((vRoute) => {
          if (cancelled) return;
          setState((s) => ({
            ...s,
            route: {
              distanceKm: vRoute.distanceKm,
              durationMinutes: vRoute.durationMinutes,
              coordinates: vRoute.coordinates,
            },
          }));
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }
  }, [
    state.pickup?.lat,
    state.pickup?.lon,
    state.destination?.lat,
    state.destination?.lon,
    state.service,
  ]);

  const setPickup = useCallback((pickup: Place | null) => {
    setState((s) => ({ ...s, pickup, route: null }));
  }, []);

  const setDestination = useCallback((destination: Place | null) => {
    setState((s) => ({ ...s, destination, route: null }));
  }, []);

  // Ambil estimasi tarif dan aturan harga minimum langsung dari backend (/api/fare/estimate)
  useEffect(() => {
    if (!token || !state.pickup?.lat || !state.pickup?.lon || !state.destination?.lat || !state.destination?.lon) {
      setBackendQuote(null);
      return;
    }

    let cancelled = false;
    const vehicleType = state.service === 'car' ? 'car' : 'motorcycle';
    fetch(`${BACKEND_URL}/api/fare/estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        pickup: { lat: state.pickup.lat, lng: state.pickup.lon },
        destination: { lat: state.destination.lat, lng: state.destination.lon },
        vehicle_type: vehicleType,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const tripFare =
          typeof data.total === 'number'
            ? data.total
            : typeof data.estimated_fare === 'number'
            ? data.estimated_fare
            : null;

        if (tripFare !== null) {
          setBackendQuote({
            distanceKm: data.distance_km,
            chargedDistanceKm: data.charged_distance_km,
            minDistanceKm: data.min_distance_km,
            minDistanceApplied: Boolean(data.min_distance_applied),
            perKmPrice: data.per_km_price,
            tripFare: tripFare,
            minFare: data.min_fare,
            serviceFee: data.customer_fee || 0,
            totalCharged: data.total_charged ?? tripFare,
          });

          // Jarak tetap menampilkan jarak riil rute jalan raya Valhalla jika tersedia; jika belum, gunakan backend haversine
          setState((s) =>
            s.route
              ? s
              : {
                  ...s,
                  route: {
                    distanceKm: data.distance_km,
                    durationMinutes: Math.max(2, Math.round((data.distance_km / 30) * 60)),
                  },
                }
          );
        }
      })
      .catch(() => {
        if (!cancelled) setBackendQuote(null);
      });

    return () => {
      cancelled = true;
    };
  }, [state.pickup?.lat, state.pickup?.lon, state.destination?.lat, state.destination?.lon, state.service, token]);

  const setService = useCallback((service: ServiceId) => setState((s) => ({ ...s, service })), []);
  const setPayment = useCallback(
    (payment: PaymentMethodId) => setState((s) => ({ ...s, payment })),
    []
  );

  const startBooking = useCallback(
    (params: {
      pickup: Place;
      destination: Place;
      service: ServiceId;
      payment: PaymentMethodId;
      promo?: Promo | null;
    }) => {
      setState({
        pickup: params.pickup,
        destination: params.destination,
        service: params.service,
        payment: params.payment,
        promo: params.promo ?? null,
        route: null,
        driver: null,
        orderUUID: null,
        status: 'searching',
      });
    },
    []
  );

  // Integrasi kupon diskon langsung dengan validasi backend (/api/promos/validate)
  const applyPromo = useCallback(
    async (code: string): Promise<PromoResult> => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) {
        return { success: false, message: 'Masukkan kode promo' };
      }

      const fareBeforeDiscount = backendQuote?.tripFare || (state.route ? calculateFare(FareRules[state.service], state.route).tripFare : 9000);

      try {
        const res = await fetch(`${BACKEND_URL}/api/promos/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            code: trimmed,
            fare_before_discount: fareBeforeDiscount,
          }),
        });

        const data = await res.json();
        if (res.ok && data.valid) {
          const promoItem: Promo = {
            code: trimmed,
            label: `Potongan Rp ${Number(data.discount_amount).toLocaleString('id-ID')}`,
            amount: data.discount_amount,
          };
          setState((s) => ({ ...s, promo: promoItem }));
          return {
            success: true,
            message: `Kupon ${trimmed} berhasil diterapkan (-Rp ${Number(data.discount_amount).toLocaleString('id-ID')})`,
            discount: data.discount_amount,
          };
        }

        return {
          success: false,
          message: data.error || 'Kode promo tidak dapat digunakan',
        };
      } catch {
        const localMatch = AvailablePromos.find((p) => p.code.toUpperCase() === trimmed);
        if (localMatch) {
          setState((s) => ({ ...s, promo: localMatch }));
          return { success: true, message: `Kupon ${trimmed} berhasil diterapkan` };
        }
        return { success: false, message: 'Gagal memvalidasi promo ke server' };
      }
    },
    [backendQuote, state.route, state.service, token]
  );

  const clearPromo = useCallback(() => setState((s) => ({ ...s, promo: null })), []);

  const setOrderUUID = useCallback((orderUUID: string | null) => {
    setState((s) => ({ ...s, orderUUID }));
  }, []);

  const setStatus = useCallback((status: TripStatus) => setState((s) => ({ ...s, status })), []);
  const assignDriver = useCallback(
    (customDriver?: Driver) =>
      setState((s) => ({
        ...s,
        driver: customDriver || null,
        status: 'pickup',
      })),
    []
  );
  const reset = useCallback(() => setState(InitialState), []);

  // Hitung tarif akhir: tarif backend mengunci harga minimum (min_fare), dikurangi promo
  const fare = useMemo(() => {
    if (backendQuote) {
      const discount = state.promo?.amount || 0;
      return {
        tripFare: backendQuote.tripFare,
        serviceFee: backendQuote.serviceFee,
        discount: discount,
        total: Math.max(0, backendQuote.totalCharged - discount),
      };
    }
    return state.route
      ? calculateFare(FareRules[state.service], state.route, state.promo)
      : EmptyFare;
  }, [backendQuote, state.promo, state.route, state.service]);

  const value = useMemo(
    () => ({
      ...state,
      fare,
      backendQuote,
      setPickup,
      setDestination,
      setService,
      setPayment,
      startBooking,
      applyPromo,
      clearPromo,
      setOrderUUID,
      assignDriver,
      setStatus,
      reset,
    }),
    [
      state,
      fare,
      backendQuote,
      setPickup,
      setDestination,
      setService,
      setPayment,
      startBooking,
      applyPromo,
      clearPromo,
      setOrderUUID,
      assignDriver,
      setStatus,
      reset,
    ]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used inside a BookingProvider');
  }
  return context;
}
