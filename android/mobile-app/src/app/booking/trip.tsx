import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapLibreOSMView } from '@/components/booking/map-libre-view';
import { Button } from '@/components/ds/button';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import { Pill } from '@/components/ds/pill';
import { formatRupiah } from '@/constants/booking';
import { BookingCopy } from '@/constants/booking-content';
import {
  MinTouchTarget,
  Neutral,
  Palette,
  Radius,
  ShadowSheet,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import { Wallet } from '@/constants/home-content';
import { ENV } from '@/constants/env';
import { useAuth } from '@/hooks/use-auth';
import { useBooking } from '@/hooks/use-booking';
import { updateDriverOrderStatus } from '@/services/driver-demo';
import { getValhallaRoute } from '@/services/valhalla';
import type { TripStatus } from '@/types/order';

const BACKEND_URL = ENV.API_URL;

const StatusCopy: Partial<Record<TripStatus, string>> = {
  pickup: 'Driver menuju titik jemput',
  onTrip: 'Dalam perjalanan ke tujuan',
  completed: 'Perjalanan selesai',
};

const FoodStatusCopy: Partial<Record<TripStatus, string>> = {
  pickup: 'Driver sedang menuju restoran untuk mengambil pesanan Anda',
  onTrip: 'Driver dalam perjalanan mengantarkan pesanan makanan ke lokasi Anda',
  completed: 'Pesanan makanan telah sampai di tujuan. Selamat menikmati!',
};

export default function TripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { pickup, destination, route, driver, payment, status, setStatus, orderUUID, service, reset } = useBooking();

  const isFood = service === 'food';

  // Posisi aktual dan rute driver menuju titik jemput penumpang
  const [driverPos, setDriverPos] = useState<{ lat: number; lon: number } | null>(null);
  const [pickupRouteCoords, setPickupRouteCoords] = useState<[number, number][] | null>(null);
  const [eta, setEta] = useState<number>(driver?.etaMinutes ?? 3);

  // Sinkronisasi status order real-time dari aplikasi Driver (arrived -> in_progress -> completed)
  useEffect(() => {
    if (!orderUUID || !token) return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/orders/${orderUUID}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const ord = data?.order;
        if (!ord) return;

        if (ord.status === 'arrived') {
          setEta(1);
          if (pickup?.lat && pickup?.lon) {
            setDriverPos({ lat: pickup.lat, lon: pickup.lon });
          }
        } else if (ord.status === 'in_progress' && status !== 'onTrip' && status !== 'completed') {
          setStatus('onTrip');
        } else if (ord.status === 'completed' && status !== 'completed') {
          setStatus('completed');
          if (destination?.lat && destination?.lon) {
            setDriverPos({ lat: destination.lat, lon: destination.lon });
          }
        }
      } catch {
        // ignore network hiccup
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [orderUUID, token, status, setStatus, pickup?.lat, pickup?.lon, destination?.lat, destination?.lon]);

  // Inisialisasi rute jalan raya dari posisi awal driver ke titik jemput penumpang
  useEffect(() => {
    if (!pickup?.lat || !pickup?.lon) return;

    // Driver dimulai dari posisi riil (atau radius ~700m dari titik jemput penumpang)
    const initialDriverLat = driver?.lat ?? (pickup.lat + 0.005);
    const initialDriverLon = driver?.lon ?? (pickup.lon + 0.004);
    setDriverPos({ lat: initialDriverLat, lon: initialDriverLon });

    const costing = service === 'car' ? 'auto' : 'motorcycle';
    getValhallaRoute([initialDriverLat, initialDriverLon], [pickup.lat, pickup.lon], costing)
      .then((res) => {
        if (res.coordinates && res.coordinates.length > 0) {
          setPickupRouteCoords(res.coordinates);
          setEta(Math.max(1, Math.ceil(res.durationMinutes)));
        }
      })
      .catch(() => {});
  }, [pickup?.lat, pickup?.lon, service]);

  // Simulasi pergerakan driver menuju titik jemput penumpang
  useEffect(() => {
    if (status !== 'pickup' || !pickupRouteCoords || pickupRouteCoords.length === 0) return;

    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex += 1;
      if (stepIndex < pickupRouteCoords.length) {
        const [lon, lat] = pickupRouteCoords[stepIndex];
        setDriverPos({ lat, lon });
        const remainingSteps = pickupRouteCoords.length - stepIndex;
        const remainingEta = Math.max(1, Math.ceil((remainingSteps / pickupRouteCoords.length) * eta));
        setEta(remainingEta);
      } else {
        clearInterval(interval);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [status, pickupRouteCoords, eta]);

  // Simulasi pergerakan driver mengantar ke tujuan (status: onTrip)
  useEffect(() => {
    const coords = route?.coordinates;
    if (status !== 'onTrip' || !coords || coords.length === 0) return;

    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex += 1;
      if (stepIndex < coords.length) {
        const [lon, lat] = coords[stepIndex];
        setDriverPos({ lat, lon });
      } else {
        clearInterval(interval);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [status, route?.coordinates]);

  const finish = () => {
    reset();
    router.dismissAll();
  };

  const handleStartTrip = async () => {
    if (orderUUID) {
      await updateDriverOrderStatus(orderUUID, 'start', service === 'car' ? 'car' : 'motorcycle');
    }
    setStatus('onTrip');
  };

  const handleCompleteTrip = async () => {
    if (orderUUID) {
      await updateDriverOrderStatus(orderUUID, 'complete', service === 'car' ? 'car' : 'motorcycle');
    }
    setStatus('completed');
  };

  return (
    <View style={styles.screen}>
      <MapLibreOSMView
        driverCoords={status === 'completed' ? null : driverPos}
        driverVehicleType={service === 'car' ? 'car' : 'motorcycle'}
        customRouteCoords={status === 'pickup' ? pickupRouteCoords : (route?.coordinates ?? null)}
      />

      <View style={[styles.header, { paddingTop: insets.top }]} pointerEvents="box-none">
        <IconButton
          icon="arrow-back"
          accessibilityLabel="Kembali"
          onPress={() => router.back()}
          box={Sizes.avatar}
          background={Palette.surfaceContainerLowest}
          color={Neutral.gray800}
        />
      </View>

      <View style={styles.sheet}>
        <View style={[styles.sheetContent, { paddingBottom: Spacing.md + insets.bottom }]}>
          <View style={styles.statusRow}>
            <View style={styles.statusHeader}>
              <Icon name={isFood ? 'restaurant' : 'near-me'} size={Sizes.iconMd} color={Palette.primary} />
              <DSText variant="labelMd" color={Palette.onSurface}>
                {status === 'pickup'
                  ? (isFood ? 'Driver Menuju Restoran' : 'Penjemputan Penumpang')
                  : status === 'onTrip'
                  ? (isFood ? 'Pengantaran Makanan' : BookingCopy.trackingHeader)
                  : (isFood ? 'Pesanan Telah Sampai' : 'Perjalanan Selesai')}
              </DSText>
            </View>
            {driver ? (
              <Pill
                label={`${BookingCopy.trackingEtaPrefix} ${eta} ${BookingCopy.trackingEtaSuffix}`}
                tone="success"
                compact
              />
            ) : null}
          </View>

          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollInner}>
            {driver ? (
              <>
                <View style={styles.driverCard}>
                  <View style={styles.driverInfo}>
                    <View style={styles.photoWrap}>
                      <Image
                        source={driver.photo}
                        alt={driver.name}
                        accessibilityLabel={driver.name}
                        style={styles.photo}
                        contentFit="cover"
                      />
                      <View style={styles.photoBadge}>
                        <Icon
                          name={isFood ? 'restaurant' : (service === 'car' ? 'directions-car' : 'motorcycle')}
                          size={Sizes.iconSm}
                          color={Palette.onPrimaryFixedVariant}
                        />
                      </View>
                    </View>

                    <View style={styles.driverText}>
                      <View style={styles.driverNameRow}>
                        <DSText variant="headlineMd" color={Neutral.gray900}>
                          {driver.name}
                        </DSText>
                        <View style={styles.ratingRow}>
                          <DSText variant="labelSm" color={Palette.primary}>
                            {driver.rating.toFixed(1)}
                          </DSText>
                          <Icon name="star" size={Sizes.iconXs} color={Palette.primary} />
                        </View>
                      </View>
                      <DSText variant="labelMd" color={Palette.secondary}>
                        {driver.vehicle}
                      </DSText>
                      <DSText variant="headlineMd" color={Neutral.gray900} style={styles.plate}>
                        {driver.plate}
                      </DSText>
                    </View>
                  </View>

                  <View style={styles.driverActions}>
                    <IconButton
                      icon="chat"
                      accessibilityLabel="Chat driver"
                      box={MinTouchTarget}
                      background={Palette.surfaceContainerHigh}
                      color={Palette.primary}
                      size={Sizes.iconMd}
                      onPress={() => router.push(`/chat/${orderUUID || 'demo-order'}`)}
                    />
                    <IconButton
                      icon="call"
                      accessibilityLabel="Call driver"
                      box={MinTouchTarget}
                      background={Palette.primary}
                      color={Palette.onPrimaryFixedVariant}
                      size={Sizes.iconMd}
                      onPress={() => router.push(`/call/${orderUUID || 'demo-order'}`)}
                    />
                  </View>
                </View>

                {/* Info rute penjemputan resto & tujuan pengantaran */}
                <View style={styles.routeSummaryCard}>
                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, { backgroundColor: Palette.primary }]}>
                      <Icon name={isFood ? 'storefront' : 'radio-button-checked'} size={12} color={Palette.onPrimary} />
                    </View>
                    <View style={styles.routeTextWrap}>
                      <DSText variant="labelSm" color={Palette.secondary}>
                        {isFood ? 'Restoran / Pengambilan' : 'Titik Jemput'}
                      </DSText>
                      <DSText variant="bodySm" color={Neutral.gray900} numberOfLines={1}>
                        {pickup?.label || 'Restoran'}
                      </DSText>
                    </View>
                  </View>

                  <View style={styles.routeConnector} />

                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, { backgroundColor: Palette.error }]}>
                      <Icon name="location-on" size={12} color={Palette.onPrimary} />
                    </View>
                    <View style={styles.routeTextWrap}>
                      <DSText variant="labelSm" color={Palette.secondary}>
                        {isFood ? 'Alamat Pengantaran' : 'Tujuan'}
                      </DSText>
                      <DSText variant="bodySm" color={Neutral.gray900} numberOfLines={1}>
                        {destination?.label || destination?.address || 'Tujuan'}
                      </DSText>
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.paymentRow}>
                  <View style={styles.paymentInfo}>
                    <Icon name="account-balance-wallet" size={Sizes.iconMd} color={Palette.primary} />
                    <View>
                      <DSText variant="labelSm" color={Palette.secondary}>
                        {BookingCopy.paymentMethodLabel}
                      </DSText>
                      <DSText variant="labelMd" color={Palette.onSurface}>
                        {payment === 'wallet'
                          ? `OpenPay • ${formatRupiah(Wallet.balance)}`
                          : 'Tunai'}
                      </DSText>
                    </View>
                  </View>
                </View>
              </>
            ) : null}

            {/* Status flow controls */}
            <DSText variant="labelSm" color={Palette.secondary} style={styles.statusNote}>
              {(isFood ? FoodStatusCopy[status] : StatusCopy[status]) ?? 'Menunggu status'}
            </DSText>

            {status === 'pickup' ? (
              <Button
                label={isFood ? 'Driver Telah Mengambil Pesanan' : 'Saya sudah naik'}
                variant="dark"
                onPress={handleStartTrip}
              />
            ) : null}
            {status === 'onTrip' ? (
              <Button
                label={isFood ? 'Pesanan Makanan Diterima' : 'Selesaikan perjalanan'}
                variant="dark"
                onPress={handleCompleteTrip}
              />
            ) : null}
            {status === 'completed' ? (
              <>
                <Button
                  label={isFood ? 'Beri Nilai Driver & Toko' : 'Beri Nilai Driver'}
                  variant="dark"
                  onPress={() => router.replace('/booking/order-done')}
                />
                <Button label="Kembali ke beranda" variant="ghost" onPress={finish} />
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Neutral.gray100,
  },
  pickupMarker: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  driverOnMap: {
    position: 'absolute',
    top: '30%',
    right: '38%',
    alignItems: 'center',
    gap: Spacing.base,
    zIndex: 1,
  },
  driverMarker: {
    width: Sizes.mapMarker,
    height: Sizes.mapMarker,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    borderWidth: 2,
    borderColor: Palette.onPrimary,
    ...ShadowSheet,
  },
  etaChip: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.hair,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceContainerLowest,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.outlineVariant,
  },
  secondaryMarker: {
    position: 'absolute',
    top: '40%',
    left: '45%',
    width: Sizes.routeNode,
    height: Sizes.routeNode,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Neutral.gray900,
    borderWidth: 2,
    borderColor: Palette.surfaceContainerLowest,
    zIndex: 1,
  },
  secondaryCore: {
    width: Spacing.xs,
    height: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceContainerLowest,
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
    maxHeight: '75%',
    backgroundColor: Palette.surfaceContainerLowest,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.outlineVariant,
    ...ShadowSheet,
  },
  sheetContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  handle: {
    width: Sizes.sheetHandleWidth,
    height: Sizes.sheetHandleHeight,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceVariant,
  },
  scrollInner: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Palette.primary,
  },
  photoBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    padding: 2,
    borderRadius: Radius.full,
    backgroundColor: Palette.primary,
    borderWidth: 2,
    borderColor: Palette.surfaceContainerLowest,
  },
  driverText: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.hair,
  },
  plate: {
    letterSpacing: 1,
  },
  driverActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.outlineVariant,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  routeSummaryCard: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radius.base,
    padding: Spacing.sm,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  routeDot: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeConnector: {
    width: 2,
    height: 10,
    backgroundColor: Palette.outlineVariant,
    marginLeft: 9,
    marginVertical: 2,
  },
  routeTextWrap: {
    flex: 1,
  },
  statusNote: {
    textAlign: 'center',
  },
});
