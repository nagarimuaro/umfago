import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/use-auth';
import { MapLibreOSMView } from '@/components/booking/map-libre-view';
import { PulseMarker } from '@/components/booking/pulse-marker';
import { RouteDetails } from '@/components/booking/route-details';
import { SearchLoader } from '@/components/booking/search-loader';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import { BookingCopy } from '@/constants/booking-content';
import {
  Neutral,
  Opacity,
  Overlay,
  Palette,
  Radius,
  ShadowSheet,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import { useBooking } from '@/hooks/use-booking';
import { autoAcceptDriverOrder } from '@/services/driver-demo';
import { ENV } from '@/constants/env';

const BACKEND_URL = ENV.API_URL;

export default function SearchingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pickup, destination, service, payment, promo, assignDriver, setOrderUUID, reset } = useBooking();
  const { token, isLoading, refreshProfile } = useAuth();
  const createdRef = useRef(false);
  const pollTimerRef = useRef<any>(null);
  const [activeUUID, setActiveUUID] = useState<string | null>(null);

  // Buat order sungguhan ke backend PostgreSQL dan pantau statusnya dari database
  useEffect(() => {
    if (isLoading) return;
    if (createdRef.current) return;
    createdRef.current = true;

    if (!destination) {
      router.replace('/booking/service');
      return;
    }

    if (!token) {
      Alert.alert('Perhatian', 'Silakan masuk akun terlebih dahulu untuk memesan perjalanan.', [
        { text: 'Masuk', onPress: () => router.replace('/auth/login') },
        { text: 'Batal', onPress: () => router.back(), style: 'cancel' },
      ]);
      return;
    }

    if (pickup && destination) {
      fetch(`${BACKEND_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_type:
            service === 'car' ? 'car' : service === 'food' ? 'food' : service === 'send' ? 'send' : 'ride',
          pickup_lat: pickup.lat || -0.664159,
          pickup_lon: pickup.lon || 100.939844,
          pickup_address: pickup.detail ? `${pickup.address} (${pickup.detail})` : pickup.address,
          dropoff_lat: destination.lat || -0.666,
          dropoff_lon: destination.lon || 100.941,
          dropoff_address: destination.detail
            ? `${destination.address} (${destination.detail})`
            : destination.address,
          payment_method: payment === 'wallet' ? 'wallet' : 'cash',
          promo_code: promo?.code || undefined,
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok && data?.order?.uuid) {
            const uuid = data.order.uuid;
            setActiveUUID(uuid);
            setOrderUUID(uuid);
            refreshProfile().catch(() => {});

            // Simulasikan driver menerima pesanan di backend untuk demo / staging flow
            const driverVehicle = service === 'car' ? 'car' : 'motorcycle';
            setTimeout(() => {
              autoAcceptDriverOrder(
                uuid,
                driverVehicle,
                pickup ? { lat: pickup.lat || -0.664159, lon: pickup.lon || 100.939844 } : undefined
              ).catch(() => {});
            }, 1800);

            // Polling database secara berkala: cek apakah sudah ada driver yang menerima order di database
            pollTimerRef.current = setInterval(async () => {
              try {
                const statusRes = await fetch(`${BACKEND_URL}/api/orders/${uuid}`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                });
                if (!statusRes.ok) return;

                const statusData = await statusRes.json();
                const order = statusData.order;

                if (order && ['accepted', 'arrived', 'in_progress'].includes(order.status)) {
                  // Driver sungguhan dari database telah menerima order!
                  if (pollTimerRef.current) {
                    clearInterval(pollTimerRef.current);
                    pollTimerRef.current = null;
                  }
                  const rawDriver = statusData.driver;
                  const drv = {
                    id: rawDriver?.id ? String(rawDriver.id) : (service === 'car' ? 'drv-car' : 'drv-motor'),
                    name:
                      rawDriver?.name ||
                      (service === 'car'
                        ? 'Hendra Wijaya'
                        : service === 'food'
                        ? 'Rian - Pengantar Makanan'
                        : 'Budi Santoso'),
                    rating: rawDriver?.rating ?? 4.9,
                    vehicle:
                      rawDriver?.vehicle ||
                      (service === 'car' ? 'Toyota Avanza (Mobil)' : 'Honda Beat (Motor)'),
                    plate: rawDriver?.plate || (service === 'car' ? 'BA 5678 CD' : 'BA 1234 XY'),
                    photo:
                      rawDriver?.photo ||
                      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
                    etaMinutes: 2,
                    lat: rawDriver?.lat ?? (pickup.lat ? pickup.lat + 0.005 : -0.659),
                    lon: rawDriver?.lon ?? (pickup.lon ? pickup.lon + 0.004 : 100.943),
                  };
                  assignDriver(drv);
                  router.replace('/booking/trip');
                } else if (order?.status === 'cancelled') {
                  if (pollTimerRef.current) {
                    clearInterval(pollTimerRef.current);
                    pollTimerRef.current = null;
                  }
                  Alert.alert(
                    'Pesanan Dibatalkan',
                    'Belum ada driver yang tersedia untuk pesanan ini atau pesanan dibatalkan.',
                    [{ text: 'Kembali', onPress: () => { reset(); router.dismissAll(); } }]
                  );
                }
              } catch {
                // Abaikan kesalahan koneksi sementara saat polling
              }
            }, 2000);
          } else {
            Alert.alert(
              'Gagal Membuat Pesanan',
              data.error || 'Terjadi kendala saat memproses pesanan.',
              [{ text: 'Kembali', onPress: () => router.back() }]
            );
          }
        })
        .catch(() => {
          Alert.alert('Koneksi Terputus', 'Gagal menghubungi server untuk membuat order', [
            { text: 'Kembali', onPress: () => router.back() },
          ]);
        });
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isLoading, token, pickup, destination, service, payment, promo, assignDriver, setOrderUUID, refreshProfile, router, reset]);

  const cancel = async () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (activeUUID && token) {
      try {
        await fetch(`${BACKEND_URL}/api/orders/${activeUUID}/cancel`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: 'Dibatalkan oleh pemesan saat pencarian' }),
        });
      } catch {}
    }

    reset();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const isFood = service === 'food';

  return (
    <View style={styles.screen}>
      <MapLibreOSMView />

      {/* Dims the map so the sheet keeps the eye, `bg-surface/50`. */}
      <View style={[StyleSheet.absoluteFill, styles.dim]} pointerEvents="none" />

      <View style={styles.marker} pointerEvents="none">
        <PulseMarker />
      </View>

      <View style={[styles.header, { paddingTop: insets.top }]} pointerEvents="box-none">
        <IconButton
          icon="arrow-back"
          accessibilityLabel="Kembali"
          onPress={cancel}
          box={Sizes.avatar}
          background={Overlay.onMapSurface}
          color={Neutral.gray800}
        />
      </View>

      <View style={styles.sheet}>
        <View style={styles.handleArea}>
          <View style={styles.handle} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: Spacing.md + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.statusCard}>
            <SearchLoader />

            <View style={styles.statusText}>
              <DSText variant="headlineMd" color={Neutral.gray900}>
                {isFood ? 'Mencari Driver Pengantar...' : BookingCopy.searchingHeader}
              </DSText>
              <DSText variant="bodySm" color={Palette.secondary} style={styles.statusSubtext}>
                {isFood
                  ? 'Menghubungkan ke resto dan driver terdekat'
                  : BookingCopy.searchingSubtext}
              </DSText>
            </View>
          </View>

          <RouteDetails
            pickup={{ name: pickup?.label ?? '-', detail: pickup?.address }}
            destination={{ name: destination?.label ?? '-', detail: destination?.address }}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={BookingCopy.cancelRequest}
            onPress={cancel}
            style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}>
            <Icon name="close" size={Sizes.iconMd} color={Palette.onErrorContainer} />
            <DSText variant="headlineSm" color={Palette.onErrorContainer}>
              {BookingCopy.cancelRequest}
            </DSText>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.surfaceDim,
  },
  dim: {
    backgroundColor: Overlay.surfaceHalf,
  },
  marker: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    height: Sizes.appBar,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    maxHeight: '85%',
    backgroundColor: Palette.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    ...ShadowSheet,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: Sizes.sheetHandleWidth,
    height: Sizes.sheetHandleHeight,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceVariant,
  },
  sheetContent: {
    paddingHorizontal: Spacing.screenMargin,
    paddingTop: Spacing.xs,
    gap: Spacing.lg,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.base,
    backgroundColor: Palette.surfaceContainerLow,
  },
  statusText: {
    flex: 1,
  },
  statusSubtext: {
    marginTop: Spacing.base,
  },
  cancel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.base,
    backgroundColor: Overlay.errorContainerSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.errorContainer,
  },
  cancelPressed: {
    opacity: Opacity.pressedSubtle,
  },
});
