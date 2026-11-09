import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import { DriverProfile, SurgeArea } from '../types/driver';
import { DriverOrder, DriverOrderStep } from '../types/order';
import { INITIAL_DRIVER_PROFILE, SURGE_AREAS } from '../constants/mock-data';
import { DriverApiService } from '../services/api';
import { DriverWebSocketService } from '../services/websocket';
import { getShortestNavigationRoute } from '../services/navigation-router';

interface DriverContextType {
  driver: DriverProfile;
  isOnline: boolean;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  currentOrder: DriverOrder | null;
  incomingOrder: DriverOrder | null;
  orderHistory: DriverOrder[];
  surgeAreas: SurgeArea[];
  currentLocation: { latitude: number; longitude: number; heading: number } | null;
  activeRoute: Array<[number, number]> | null;
  locateDriverNow: (showAlertOnFail?: boolean) => Promise<{ latitude: number; longitude: number; heading: number } | null>;
  toggleOnline: () => Promise<void>;
  acceptIncomingOrder: () => Promise<void>;
  rejectIncomingOrder: () => void;
  dismissIncomingOrderTimeout: () => void;
  advanceOrderStep: () => Promise<void>;
  cancelActiveOrder: (reason?: string) => Promise<void>;
  simulateIncomingOrder: () => Promise<void>;
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

// Helper menghitung jarak Haversine (km) antara 2 koordinat
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

function mapBackendOrderToDriverOrder(o: any): DriverOrder {
  const fare = typeof o.fare_amount === 'number' ? o.fare_amount : 10000;
  const net = typeof o.driver_earning === 'number' && o.driver_earning > 0 ? o.driver_earning : Math.round(fare * 0.8);
  const fee = typeof o.platform_fee === 'number' && o.platform_fee > 0 ? o.platform_fee : Math.max(0, fare - net);
  const isCompleted = o.status === 'completed';
  const isCancelled = o.status === 'cancelled';

  let step: DriverOrderStep = 'heading_to_pickup';
  if (isCompleted) step = 'completed';
  else if (o.status === 'arrived') step = 'arrived_at_pickup';
  else if (o.status === 'in_progress') step = 'in_trip';
  else if (o.status === 'searching') step = 'offered';

  const dateLabel = o.created_at
    ? new Date(o.created_at).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Hari ini';

  const pLat = typeof o.pickup_lat === 'number' ? o.pickup_lat : -0.664159;
  const pLon = typeof o.pickup_lon === 'number' ? o.pickup_lon : typeof o.pickup_lng === 'number' ? o.pickup_lng : 100.939844;
  const dLat = typeof o.dropoff_lat === 'number' ? o.dropoff_lat : -0.687312;
  const dLon = typeof o.dropoff_lon === 'number' ? o.dropoff_lon : typeof o.dropoff_lng === 'number' ? o.dropoff_lng : 100.958585;
  const distKm =
    typeof o.distance_km === 'number' && o.distance_km > 0
      ? Math.round(o.distance_km * 10) / 10
      : Math.max(0.5, Math.round(haversineDistanceKm(pLat, pLon, dLat, dLon) * 1.25 * 10) / 10);

  const riderName =
    o.rider?.name ||
    o.customer_name ||
    o.rider_name ||
    'Ahmad Fauzi';
  const riderPhone =
    o.rider?.phone ||
    o.customer_phone ||
    o.rider_phone ||
    '081234567890';

  return {
    id: o.uuid || o.order_uuid || String(o.id),
    code: `ORD-${String(o.uuid || o.order_uuid || o.id || '0000').slice(-4).toUpperCase()}`,
    serviceType: o.service_type === 'food' ? 'food' : o.service_type === 'car' || o.vehicle_type === 'car' ? 'car' : 'ride',
    step,
    status: isCompleted ? 'completed' : isCancelled ? 'cancelled' : o.status === 'searching' ? 'searching' : 'in_progress',
    restaurantName: o.merchant?.name || undefined,
    customer: {
      id: o.rider_id || o.rider?.id || 1,
      name: riderName,
      phone: riderPhone,
      rating: 4.9,
    },
    pickup: {
      latitude: pLat,
      longitude: pLon,
      address: o.pickup_address || 'Lokasi Penjemputan',
      notes: o.notes || undefined,
    },
    destination: {
      latitude: dLat,
      longitude: dLon,
      address: o.dropoff_address || 'Lokasi Tujuan',
    },
    distanceKm: distKm,
    estimatedDurationMinutes: Math.max(3, Math.round(distKm * 2.5)),
    fareAmount: fare,
    driverEarnings: net,
    platformFee: fee,
    tipAmount: o.tip_amount || 0,
    paymentMethod: o.payment_method === 'wallet' ? 'wallet' : 'cash',
    createdAt: dateLabel,
  };
}

export const DriverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [driver, setDriver] = useState<DriverProfile>(INITIAL_DRIVER_PROFILE);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(DriverApiService.getAuthToken()));
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [currentOrder, setCurrentOrder] = useState<DriverOrder | null>(null);
  const [incomingOrder, setIncomingOrder] = useState<DriverOrder | null>(null);
  const [orderHistory, setOrderHistory] = useState<DriverOrder[]>([]);
  const [surgeAreas, setSurgeAreas] = useState<SurgeArea[]>(SURGE_AREAS);
  const [activeRoute, setActiveRoute] = useState<Array<[number, number]> | null>(null);
  // Default koordinat awal Muaro Sijunjung, Sumatera Barat
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; heading: number } | null>({
    latitude: -0.664159,
    longitude: 100.939844,
    heading: 90,
  });

  const nativeGpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tripSimTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const routePointsRef = useRef<Array<[number, number]>>([]);
  const routeIndexRef = useRef<number>(0);
  const isOnlineRef = useRef<boolean>(isOnline);
  const currentLocationRef = useRef(currentLocation);
  const rejectedOrderIdsRef = useRef<Set<string>>(new Set());
  const currentOrderRef = useRef<DriverOrder | null>(currentOrder);
  const incomingOrderRef = useRef<DriverOrder | null>(incomingOrder);
  const vehicleTypeRef = useRef<'motorcycle' | 'car'>(driver.vehicle.type);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    currentLocationRef.current = currentLocation;
  }, [currentLocation]);

  useEffect(() => {
    currentOrderRef.current = currentOrder;
  }, [currentOrder]);

  useEffect(() => {
    incomingOrderRef.current = incomingOrder;
  }, [incomingOrder]);

  useEffect(() => {
    vehicleTypeRef.current = driver.vehicle.type;
  }, [driver.vehicle.type]);

  const checkPendingOrders = useCallback(async () => {
    if (!isOnlineRef.current || currentOrderRef.current || incomingOrderRef.current) {
      return;
    }
    const pending = await DriverApiService.getPendingIncomingOrder(
      vehicleTypeRef.current,
      rejectedOrderIdsRef.current
    );
    if (!pending || currentOrderRef.current || incomingOrderRef.current) {
      return;
    }
    const orderUuid = String(pending.uuid || pending.id || '');
    if (!orderUuid || rejectedOrderIdsRef.current.has(orderUuid)) {
      return;
    }
    const mapped = mapBackendOrderToDriverOrder(pending);
    setIncomingOrder((prev) =>
      prev || {
        ...mapped,
        step: 'offered',
        status: 'searching',
        expiresInSeconds: 30,
      }
    );
  }, []);

  const syncBackendData = useCallback(async () => {
    try {
      const [profile, kycData, earnings, ordersData, merchants] = await Promise.all([
        DriverApiService.getProfile(),
        DriverApiService.getKycStatus(),
        DriverApiService.getDriverEarnings(),
        DriverApiService.getDriverOrders(1),
        DriverApiService.getMerchants(),
      ]);

      const dp = profile?.driver_profile || kycData?.profile || null;
      const veh = Array.isArray(profile?.vehicles) && profile.vehicles.length > 0 ? profile.vehicles[0] : null;
      const isCarRole = profile?.active_role === 'driver_car' || veh?.type === 'car';

      setDriver((prev) => {
        const completedCount =
          typeof ordersData?.summary?.completed === 'number'
            ? ordersData.summary.completed
            : typeof earnings?.summary?.trips === 'number'
              ? earnings.summary.trips
              : prev.stats.completedTrips;
        const cancelledCount =
          typeof ordersData?.summary?.cancelled === 'number'
            ? ordersData.summary.cancelled
            : prev.stats.cancelledTrips;
        const totalDecisions = completedCount + cancelledCount;
        const acceptancePct = totalDecisions > 0 ? Math.round((completedCount / totalDecisions) * 100) : 100;

        const kycStatus: 'verified' | 'pending' | 'expired' | 'rejected' =
          dp?.kyc_status === 'approved' || profile?.is_verified
            ? 'verified'
            : dp?.kyc_status === 'rejected'
              ? 'rejected'
              : 'pending';

        const licenseExpiryStr = dp?.license_expiry
          ? new Date(dp.license_expiry).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : prev.vehicle.stnkExpiry;

        const plateNum =
          veh?.plate_number ||
          dp?.vehicle_registration_number ||
          prev.vehicle.plateNumber;

        return {
          ...prev,
          id: profile?.id || prev.id,
          name: profile?.name ? profile.name.replace(/\s*\(Driver.*\)/i, '') : prev.name,
          email: profile?.email || prev.email,
          phone: profile?.phone || prev.phone,
          avatarUrl:
            dp?.selfie_photo_url && !String(dp.selfie_photo_url).includes('sample')
              ? String(dp.selfie_photo_url).startsWith('http')
                ? dp.selfie_photo_url
                : `https://umfa-core.fazalabs.sbs${dp.selfie_photo_url}`
              : prev.avatarUrl,
          isVerified: Boolean(profile?.is_verified || dp?.kyc_status === 'approved'),
          totalTrips:
            typeof dp?.total_trips === 'number' && dp.total_trips > 0
              ? dp.total_trips
              : completedCount,
          balance:
            typeof earnings?.current_balance === 'number'
              ? earnings.current_balance
              : typeof profile?.balance === 'number'
                ? profile.balance
                : prev.balance,
          vehicle: {
            id: veh?.id ? `veh-${veh.id}` : prev.vehicle.id,
            type: isCarRole ? 'car' : 'motorcycle',
            brand: veh?.brand || (isCarRole ? 'Toyota' : 'Honda'),
            model:
              veh?.brand && veh?.model_name
                ? `${veh.brand} ${veh.model_name}`
                : isCarRole
                  ? 'Toyota Avanza Veloz'
                  : 'Honda Beat Street 110',
            plateNumber: plateNum,
            year: veh?.year || 2023,
            color: veh?.color || 'Hitam Metalik',
            stnkExpiry: licenseExpiryStr,
            isVerified: kycStatus === 'verified',
          },
          documents: [
            {
              id: 'doc-ktp',
              type: 'ktp',
              title: 'KTP (Kartu Tanda Penduduk)',
              status: kycStatus,
              documentNumber: dp?.identity_card_number || profile?.identity_number || '-',
              lastUpdated: dp?.updated_at
                ? new Date(dp.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'Terverifikasi',
            },
            {
              id: 'doc-sim',
              type: 'sim',
              title: isCarRole ? 'SIM A (Surat Izin Mengemudi)' : 'SIM C (Surat Izin Mengemudi)',
              status: kycStatus,
              expiryDate: licenseExpiryStr,
              documentNumber: dp?.license_number || '-',
              lastUpdated: dp?.updated_at
                ? new Date(dp.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'Terverifikasi',
            },
            {
              id: 'doc-skck',
              type: 'skck',
              title: 'STNK & Registrasi Kendaraan',
              status: kycStatus,
              documentNumber: plateNum,
              expiryDate: licenseExpiryStr,
              lastUpdated: dp?.updated_at
                ? new Date(dp.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'Terverifikasi',
            },
            {
              id: 'doc-selfie',
              type: 'selfie',
              title: `Rekening Pencairan (${dp?.bank_name || 'Bank Nagari'})`,
              status: kycStatus,
              documentNumber: dp?.bank_account_number
                ? `${dp.bank_account_number} a.n ${dp.bank_account_name || profile?.name || ''}`
                : undefined,
              lastUpdated: 'Aktif',
            },
          ],
          stats: {
            ...prev.stats,
            todayEarnings:
              typeof earnings?.summary?.driver_earning === 'number'
                ? earnings.summary.driver_earning
                : typeof ordersData?.summary?.total_net === 'number'
                  ? ordersData.summary.total_net
                  : 0,
            todayTips: 0,
            completedTrips: completedCount,
            cancelledTrips: cancelledCount,
            acceptanceRate: acceptancePct,
            reviewCount: completedCount,
          },
        };
      });

      if (ordersData && Array.isArray(ordersData.orders)) {
        const mappedOrders: DriverOrder[] = ordersData.orders.map(mapBackendOrderToDriverOrder);
        setOrderHistory(mappedOrders);

        // Jika ada order yang masih berstatus aktif di backend, pulihkan ke layar navigasi!
        const activeBackendOrder = ordersData.orders.find(
          (o: any) => o.status === 'accepted' || o.status === 'arrived' || o.status === 'in_progress'
        );
        if (activeBackendOrder) {
          const restored = mapBackendOrderToDriverOrder(activeBackendOrder);
          setCurrentOrder((prev) => prev || restored);
        }
      }

      if (
        isOnlineRef.current &&
        !currentOrderRef.current &&
        !incomingOrderRef.current &&
        Array.isArray(ordersData?.available_orders) &&
        ordersData.available_orders.length > 0
      ) {
        const candidate = ordersData.available_orders.find((o: any) => {
          const uuid = String(o?.uuid || o?.id || '');
          return uuid && !rejectedOrderIdsRef.current.has(uuid) && (!o.status || o.status === 'searching');
        });
        if (candidate) {
          const mappedCandidate = mapBackendOrderToDriverOrder(candidate);
          setIncomingOrder((prev) =>
            prev || {
              ...mappedCandidate,
              step: 'offered',
              status: 'searching',
              expiresInSeconds: 30,
            }
          );
        }
      }

      // Bangun titik area ramai (Surge Hotspots) dari data merchant & order real di backend
      const dynamicSurges: SurgeArea[] = [];
      if (Array.isArray(merchants) && merchants.length > 0) {
        merchants.forEach((m: any, idx: number) => {
          if (typeof m.latitude === 'number' && typeof m.longitude === 'number' && m.latitude !== 0) {
            dynamicSurges.push({
              id: `merchant-surge-${m.id || idx}`,
              name: m.store_name || m.name || 'Pusat Kuliner UmfaFood',
              landmark: m.address || 'Area Ramai Pesanan',
              multiplier: idx === 0 ? 1.3 : 1.2,
              latitude: m.latitude,
              longitude: m.longitude,
              radiusMeters: 900,
              level: idx === 0 ? 'critical' : 'high',
            });
          }
        });
      }
      if (ordersData && Array.isArray(ordersData.orders)) {
        ordersData.orders.slice(0, 3).forEach((o: any, idx: number) => {
          const lat = o.pickup_lat;
          const lon = o.pickup_lon ?? o.pickup_lng;
          if (typeof lat === 'number' && typeof lon === 'number' && lat !== 0) {
            const existsNear = dynamicSurges.some((s) => haversineDistanceKm(s.latitude, s.longitude, lat, lon) < 1.0);
            if (!existsNear) {
              dynamicSurges.push({
                id: `order-hotspot-${o.id || idx}`,
                name: (o.pickup_address || 'Titik Order Ramai').split(',')[0],
                landmark: o.pickup_address || 'Zona Permintaan Tinggi',
                multiplier: 1.2,
                latitude: lat,
                longitude: lon,
                radiusMeters: 850,
                level: 'high',
              });
            }
          }
        });
      }
      if (dynamicSurges.length > 0) {
        setSurgeAreas(dynamicSurges);
      }
    } catch (err) {
      console.warn('[DriverSync] syncBackendData warning:', err);
    }
  }, []);

  // Ambil koordinat GPS perangkat secara langsung (baik saat startup maupun saat tombol Locate ditekan)
  const locateDriverNow = useCallback(
    async (showAlertOnFail = false): Promise<{ latitude: number; longitude: number; heading: number } | null> => {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 8000,
              maximumAge: 15000,
            });
          });
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            heading: pos.coords.heading && pos.coords.heading >= 0 ? Math.round(pos.coords.heading) : 90,
          };
          setCurrentLocation(coords);
          if (isOnlineRef.current) {
            DriverWebSocketService.sendLocation(coords.latitude, coords.longitude, coords.heading, pos.coords.speed ?? 0);
          }
          return coords;
        } catch {
          return currentLocationRef.current;
        }
      }

      try {
        const existingPerm = await Location.getForegroundPermissionsAsync();
        let status = existingPerm.status;
        if (status !== 'granted') {
          const reqPerm = await Location.requestForegroundPermissionsAsync();
          status = reqPerm.status;
        }
        if (status !== 'granted') {
          if (showAlertOnFail) {
            Alert.alert(
              'Izin Lokasi Diperlukan',
              'Harap izinkan akses lokasi (GPS) pada pengaturan HP Anda agar peta dapat mengarah ke lokasi Anda.'
            );
          }
          return null;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
        if (!servicesEnabled) {
          if (showAlertOnFail) {
            Alert.alert(
              'GPS Belum Aktif',
              'Harap aktifkan layanan lokasi (GPS) pada HP Anda lalu tekan kembali tombol lokasi.'
            );
          }
          return null;
        }

        const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> =>
          Promise.race([
            promise,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
          ]);

        let loc = await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          4500
        ).catch(() => null);

        if (!loc) {
          loc = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            4000
          ).catch(() => null);
        }

        if (!loc) {
          loc = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
            3000
          ).catch(() => null);
        }

        if (!loc) {
          loc = await Location.getLastKnownPositionAsync().catch(() => null);
        }

        if (loc?.coords) {
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading && loc.coords.heading >= 0 ? Math.round(loc.coords.heading) : 90,
          };
          setCurrentLocation(coords);
          if (isOnlineRef.current) {
            DriverWebSocketService.sendLocation(coords.latitude, coords.longitude, coords.heading, loc.coords.speed ?? 0);
          }
          return coords;
        }
      } catch {
        // Ignore
      }

      if (showAlertOnFail) {
        Alert.alert(
          'Lokasi Belum Terdeteksi',
          'Pastikan GPS HP Anda aktif dan berada di area dengan sinyal lokasi yang baik.'
        );
      }
      return null;
    },
    []
  );

  // Initialize GPS & Compass Tracking + Check Saved Backend Auth Session
  useEffect(() => {
    let isMounted = true;

    let nativeGpsStartTimer: ReturnType<typeof setTimeout> | null = null;
    nativeGpsStartTimer = setTimeout(async () => {
      if (!isMounted) return;
      await locateDriverNow(false);
      if (Platform.OS !== 'web' && isMounted) {
        nativeGpsIntervalRef.current = setInterval(() => {
          locateDriverNow(false);
        }, 8000);
      }
    }, 500);

    // 2. Periksa apakah sudah ada sesi token login yang tersimpan (TIDAK auto-login diam-diam jika belum pernah login)
    (async () => {
      try {
        if (!DriverApiService.hasSavedSession()) {
          if (isMounted) {
            setIsAuthenticated(false);
            setIsAuthLoading(false);
          }
          return;
        }

        const validToken = await DriverApiService.getValidToken();
        if (!validToken) {
          DriverApiService.clearSession();
          if (isMounted) {
            setIsAuthenticated(false);
            setIsAuthLoading(false);
          }
          return;
        }

        const profile = await DriverApiService.getProfile();
        if (!profile || !profile.id) {
          DriverApiService.clearSession();
          if (isMounted) {
            setIsAuthenticated(false);
            setIsAuthLoading(false);
          }
          return;
        }

        if (isMounted) {
          setIsAuthenticated(true);
          DriverWebSocketService.connect(validToken);
          if (isOnlineRef.current) {
            await DriverApiService.setDriverStatus('online');
          }
          await syncBackendData();
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    })();

    const unsub = DriverWebSocketService.addListener((payload) => {
      if (payload.type === 'ws_connected') {
        if (isOnlineRef.current) {
          DriverApiService.setDriverStatus('online');
          const loc = currentLocationRef.current || { latitude: -0.664159, longitude: 100.939844, heading: 90 };
          DriverWebSocketService.sendLocation(loc.latitude, loc.longitude, loc.heading, 0);
        }
        return;
      }

      if (payload.type === 'incoming_order' || payload.type === 'order_offered') {
        const orderUuid = payload.order_uuid || payload.order?.uuid;
        if (!orderUuid || rejectedOrderIdsRef.current.has(String(orderUuid))) return;

        const fare = typeof payload.fare_amount === 'number' ? payload.fare_amount : payload.order?.fare || 10000;
        const pLat = payload.pickup_lat ?? payload.order?.origin_lat ?? -0.664159;
        const pLon = payload.pickup_lon ?? payload.order?.origin_lng ?? 100.939844;
        const dLat = payload.dropoff_lat ?? payload.order?.destination_lat ?? -0.687312;
        const dLon = payload.dropoff_lon ?? payload.order?.destination_lng ?? 100.958585;
        const distKm =
          typeof payload.distance_km === 'number' && payload.distance_km > 0
            ? Math.round(payload.distance_km * 10) / 10
            : Math.max(0.5, Math.round(haversineDistanceKm(pLat, pLon, dLat, dLon) * 1.25 * 10) / 10);

        const initialIncoming: DriverOrder = {
          id: orderUuid,
          code: payload.code || payload.order?.code || `ORD-${orderUuid.slice(-4).toUpperCase()}`,
          serviceType:
            payload.service_type === 'food'
              ? 'food'
              : payload.vehicle_type === 'car' || payload.service_type === 'car'
                ? 'car'
                : 'ride',
          step: 'offered',
          status: 'searching',
          customer: {
            id: payload.rider_id || payload.order?.rider_id || 1,
            name: payload.rider_name || payload.order?.rider_name || 'Ahmad Fauzi',
            phone: payload.rider_phone || payload.order?.rider_phone || '081234567890',
            rating: 4.9,
          },
          pickup: {
            latitude: pLat,
            longitude: pLon,
            address: payload.pickup_address || payload.order?.origin_address || 'Lokasi Penjemputan',
            notes: payload.notes || undefined,
          },
          destination: {
            latitude: dLat,
            longitude: dLon,
            address: payload.dropoff_address || payload.order?.destination_address || 'Lokasi Tujuan',
          },
          distanceKm: distKm,
          estimatedDurationMinutes: Math.max(3, Math.round(distKm * 2.5)),
          fareAmount: fare,
          driverEarnings: Math.round(fare * 0.8),
          platformFee: Math.round(fare * 0.2),
          tipAmount: 0,
          paymentMethod: payload.payment_method === 'wallet' ? 'wallet' : 'cash',
          createdAt: 'Baru saja',
          expiresInSeconds: 30,
        };

        setIncomingOrder(initialIncoming);

        // Ambil detail order lengkap dari backend bila ada informasi tambahan (nama penumpang, metode bayar, catatan)
        DriverApiService.getOrderByUUID(orderUuid).then((detail) => {
          if (!detail || !detail.order) return;
          const fullOrder = detail.order;
          const rider = detail.rider || fullOrder.rider;
          setIncomingOrder((prev) =>
            prev && prev.id === orderUuid
              ? {
                  ...prev,
                  serviceType:
                    fullOrder.service_type === 'food'
                      ? 'food'
                      : fullOrder.service_type === 'car' || fullOrder.vehicle_type === 'car'
                        ? 'car'
                        : 'ride',
                  paymentMethod: fullOrder.payment_method === 'wallet' ? 'wallet' : 'cash',
                  pickup: {
                    ...prev.pickup,
                    notes: fullOrder.notes || prev.pickup.notes,
                  },
                  customer: {
                    ...prev.customer,
                    id: rider?.id || fullOrder.rider_id || prev.customer.id,
                    name: rider?.name || prev.customer.name,
                    phone: rider?.phone || prev.customer.phone,
                  },
                }
              : prev
          );
        });
      }
    });

    return () => {
      isMounted = false;
      if (nativeGpsStartTimer) {
        clearTimeout(nativeGpsStartTimer);
      }
      if (nativeGpsIntervalRef.current) {
        clearInterval(nativeGpsIntervalRef.current);
        nativeGpsIntervalRef.current = null;
      }
      unsub();
    };
  }, [syncBackendData, locateDriverNow]);

  const toggleOnline = useCallback(async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    setDriver((prev) => ({
      ...prev,
      status: nextState ? 'online' : 'offline',
    }));

    await DriverApiService.setDriverStatus(nextState ? 'online' : 'offline');
    if (nextState) {
      await DriverWebSocketService.reconnectNow();
      const loc = currentLocationRef.current || { latitude: -0.664159, longitude: 100.939844, heading: 90 };
      DriverWebSocketService.sendLocation(loc.latitude, loc.longitude, loc.heading, 0);
      checkPendingOrders().catch(() => {});
    }
  }, [isOnline, checkPendingOrders]);

  // Saat pengguna berpindah kembali dari aplikasi Penumpang ke aplikasi Driver di HP (AppState -> active),
  // langsung hubungkan kembali WebSocket, pastikan status online aktif, dan periksa order baru.
  useEffect(() => {
    if (!isAuthenticated) return;

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        DriverWebSocketService.reconnectNow().catch(() => {});
        if (isOnlineRef.current) {
          DriverApiService.setDriverStatus('online').catch(() => {});
          locateDriverNow(false).catch(() => {});
          checkPendingOrders().catch(() => {});
        }
      }
    });

    return () => {
      sub.remove();
    };
  }, [isAuthenticated, locateDriverNow, checkPendingOrders]);

  // Polling aktif setiap 3 detik saat driver Online & belum memegang order,
  // memastikan order dari aplikasi pengguna di HP tetap masuk meskipun WebSocket sempat terputus di background.
  useEffect(() => {
    if (!isAuthenticated || !isOnline || currentOrder || incomingOrder) {
      return;
    }

    const immediateTimer = setTimeout(() => {
      checkPendingOrders().catch(() => {});
    }, 600);

    const pollInterval = setInterval(() => {
      checkPendingOrders().catch(() => {});
    }, 3000);

    return () => {
      clearTimeout(immediateTimer);
      clearInterval(pollInterval);
    };
  }, [isAuthenticated, isOnline, currentOrder, incomingOrder, checkPendingOrders]);

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

    const res = await DriverApiService.acceptOrder(acceptedOrder.id);
    if (res.success) {
      // Ambil detail order pasca-accept untuk memastikan nama/telepon/metode bayar real dari database
      const detail = await DriverApiService.getOrderByUUID(acceptedOrder.id);
      if (detail?.order) {
        const rider = detail.rider || detail.order.rider;
        setCurrentOrder((prev) =>
          prev && prev.id === acceptedOrder.id
            ? {
                ...prev,
                paymentMethod: detail.order.payment_method === 'wallet' ? 'wallet' : 'cash',
                customer: {
                  ...prev.customer,
                  name: rider?.name || prev.customer.name,
                  phone: rider?.phone || prev.customer.phone,
                },
              }
            : prev
        );
      }
    }
  }, [incomingOrder]);

  const rejectIncomingOrder = useCallback(() => {
    if (incomingOrder?.id) {
      rejectedOrderIdsRef.current.add(String(incomingOrder.id));
      DriverApiService.rejectOrder(incomingOrder.id);
    }
    setIncomingOrder(null);
  }, [incomingOrder]);

  const dismissIncomingOrderTimeout = useCallback(() => {
    if (incomingOrder?.id) {
      const expiredId = String(incomingOrder.id);
      rejectedOrderIdsRef.current.add(expiredId);
      setTimeout(() => {
        rejectedOrderIdsRef.current.delete(expiredId);
      }, 20000);
    }
    setIncomingOrder(null);
  }, [incomingOrder]);

  // Navigasi jalan raya riil (jarak terdekat via OSRM / Valhalla)
  // Driver bergerak mengikuti kontur jalan, belokan, dan tikungan riil di kota tempat order berada
  useEffect(() => {
    let isCancelled = false;

    if (currentOrder?.step === 'heading_to_pickup') {
      const pLat = currentOrder.pickup.latitude;
      const pLon = currentOrder.pickup.longitude;
      const loc = currentLocationRef.current;

      // Gunakan posisi GPS driver saat ini jika berada dalam radius wajar (50m - 25km dari titik jemput).
      // Bila browser desktop tidak memiliki GPS di kota yang sama (> 25km) atau tepat di titik 0m (< 50m),
      // tempatkan posisi awal driver di jalan raya terdekat (~350m dari titik jemput) agar rute jalan OSRM 100% real!
      const distToPickupKm = loc ? haversineDistanceKm(loc.latitude, loc.longitude, pLat, pLon) : 999;
      const useCurrentGps = loc && distToPickupKm >= 0.05 && distToPickupKm <= 25;
      const startLat = useCurrentGps ? loc.latitude : pLat - 0.0028;
      const startLon = useCurrentGps ? loc.longitude : pLon - 0.0028;
      const mode = currentOrder.serviceType === 'car' ? 'car' : 'motorcycle';

      getShortestNavigationRoute([startLat, startLon], [pLat, pLon], mode).then((res) => {
        if (isCancelled) return;
        const rawCoords =
          res.coordinates && res.coordinates.length > 1
            ? res.coordinates
            : ([[startLon, startLat], [pLon, pLat]] as Array<[number, number]>);
        const coords = densifyRoute(rawCoords, 2.5);

        routePointsRef.current = coords;
        routeIndexRef.current = 0;
        setActiveRoute(rawCoords);

        setCurrentOrder((prev) =>
          prev
            ? {
                ...prev,
                routeCoordinates: rawCoords,
              }
            : null
        );

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

            if (idx % 8 === 0 || idx >= routePointsRef.current.length - 5) {
              const remaining = routePointsRef.current.slice(idx);
              setActiveRoute(remaining);
            }

            const now = Date.now();
            if (now - lastWsSend > 1000) {
              lastWsSend = now;
              DriverWebSocketService.sendLocation(curPt[1], curPt[0], stepHeading, 30);
            }
          } else {
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
        const rawCoords =
          res.coordinates && res.coordinates.length > 1
            ? res.coordinates
            : ([[pLon, pLat], [dLon, dLat]] as Array<[number, number]>);
        const coords = densifyRoute(rawCoords, 2.5);

        routePointsRef.current = coords;
        routeIndexRef.current = 0;
        setActiveRoute(rawCoords);

        setCurrentOrder((prev) =>
          prev
            ? {
                ...prev,
                distanceKm: res.distanceKm,
                estimatedDurationMinutes: res.durationMinutes,
                routeCoordinates: rawCoords,
              }
            : null
        );

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

            if (idx % 8 === 0 || idx >= routePointsRef.current.length - 5) {
              const remaining = routePointsRef.current.slice(idx);
              setActiveRoute(remaining);
            }

            const now = Date.now();
            if (now - lastWsSend > 1000) {
              lastWsSend = now;
              DriverWebSocketService.sendLocation(curPt[1], curPt[0], stepHeading, 28);
            }
          } else {
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
      setCurrentLocation({
        latitude: pLat,
        longitude: pLon,
        heading: headingToDest,
      });
      DriverWebSocketService.sendLocation(pLat, pLon, headingToDest, 0);
    } else if (currentOrder.step === 'arrived_at_pickup') {
      nextStep = 'in_trip';
      action = 'start';
      setCurrentLocation({
        latitude: pLat,
        longitude: pLon,
        heading: headingToDest,
      });
      DriverWebSocketService.sendLocation(pLat, pLon, headingToDest, 25);
    } else if (currentOrder.step === 'in_trip') {
      nextStep = 'completed';
      action = 'complete';
      setCurrentLocation({
        latitude: dLat,
        longitude: dLon,
        heading: headingToDest,
      });
      DriverWebSocketService.sendLocation(dLat, dLon, headingToDest, 0);
    }

    if (nextStep === 'completed') {
      setCurrentOrder(null);
      await DriverApiService.updateOrderStatus(currentOrder.id, 'complete');
      await syncBackendData();
    } else {
      setCurrentOrder((prev) => (prev ? { ...prev, step: nextStep } : null));
      await DriverApiService.updateOrderStatus(currentOrder.id, action);
    }
  }, [currentOrder, syncBackendData]);

  const cancelActiveOrder = useCallback(
    async (reason?: string) => {
      if (!currentOrder) return;
      setCurrentOrder(null);
      await DriverApiService.updateOrderStatus(currentOrder.id, 'cancel');
      await syncBackendData();
    },
    [currentOrder, syncBackendData]
  );

  // Buat order REAL di database PostgreSQL backend dan dispatch via WebSocket
  const simulateIncomingOrder = useCallback(async () => {
    const loc = currentLocationRef.current || { latitude: -0.664159, longitude: 100.939844, heading: 90 };
    // Pastikan posisi GPS driver dikirim terlebih dahulu agar masuk dalam radius kandidat di PostGIS/Redis
    DriverWebSocketService.sendLocation(loc.latitude, loc.longitude, loc.heading, 0);

    const pLat = loc.latitude + 0.0022;
    const pLon = loc.longitude + 0.0022;
    const dLat = loc.latitude - 0.015;
    const dLon = loc.longitude + 0.014;

    const res = await DriverApiService.createRealCustomerOrder({
      pickup_lat: pLat,
      pickup_lon: pLon,
      pickup_address: 'Jl. Lintas Sumatera Muaro Sijunjung (Titik Jemput)',
      dropoff_lat: dLat,
      dropoff_lon: dLon,
      dropoff_address: 'Pusat Niaga & Terminal Sijunjung, Sumatera Barat',
      service_type: driver.vehicle.type === 'car' ? 'car' : 'ride',
      vehicle_type: driver.vehicle.type === 'car' ? 'car' : 'motorcycle',
      payment_method: 'cash',
    });

    // Jika WebSocket sudah mengirim incoming_order, state incomingOrder otomatis terisi.
    // Jika ada jeda jaringan WS, tampilkan order real yang baru saja dibuat di backend tersebut:
    if (res.success && res.order) {
      const realOrder = mapBackendOrderToDriverOrder(res.order);
      setIncomingOrder((prev) => prev || { ...realOrder, step: 'offered', status: 'searching', expiresInSeconds: 20 });
    }
  }, [driver.vehicle.type]);

  const updateDriverProfile = useCallback((updates: Partial<DriverProfile>) => {
    setDriver((prev) => ({ ...prev, ...updates }));
  }, []);

  const loginDriver = useCallback(
    async (email: string, pass: string) => {
      const res = await DriverApiService.login(email, pass);
      if (!res.success || !res.token) {
        return { success: false, error: res.error || 'Email atau kata sandi tidak sesuai.' };
      }

      setIsAuthenticated(true);
      setIsOnline(true);

      DriverWebSocketService.connect(res.token);
      await DriverApiService.setDriverStatus('online');
      await syncBackendData();
      locateDriverNow(false).catch(() => {});
      return { success: true };
    },
    [syncBackendData, locateDriverNow]
  );

  const withdrawBalance = useCallback(
    async (amount: number) => {
      const res = await DriverApiService.withdraw(amount);
      if (res.success) {
        await syncBackendData();
        return { success: true };
      }
      return {
        success: false,
        error: res.error || 'Penarikan gagal atau saldo/KYC belum memenuhi syarat.',
      };
    },
    [syncBackendData]
  );

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
    DriverApiService.clearSession();
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
        isAuthLoading,
        currentOrder,
        incomingOrder,
        orderHistory,
        surgeAreas,
        currentLocation,
        activeRoute,
        locateDriverNow,
        toggleOnline,
        acceptIncomingOrder,
        rejectIncomingOrder,
        dismissIncomingOrderTimeout,
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

export const useDriver = (): DriverContextType => {
  const context = useContext(DriverContext);
  if (!context) {
    throw new Error('useDriver must be used within a DriverProvider');
  }
  return context;
};
