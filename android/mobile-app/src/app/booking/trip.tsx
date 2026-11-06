import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapLibreOSMView } from '@/components/booking/map-libre-view';
import { PulseMarker } from '@/components/booking/pulse-marker';
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
import { useBooking } from '@/hooks/use-booking';
import { updateDriverOrderStatus } from '@/services/driver-demo';
import type { TripStatus } from '@/types/order';

const StatusCopy: Partial<Record<TripStatus, string>> = {
  pickup: 'Driver menuju titik jemput',
  onTrip: 'Dalam perjalanan ke tujuan',
  completed: 'Perjalanan selesai',
};

export default function TripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { driver, payment, status, setStatus, orderUUID, service, reset } = useBooking();
  console.log('[trip] render', status, orderUUID, driver?.name);

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
      <MapLibreOSMView />

      {/* Pickup pulse, roughly centre-map as drawn. */}
      <View style={styles.pickupMarker} pointerEvents="none">
        <PulseMarker />
      </View>

      {/* Nearby driver — motorcycle chip with ETA, as on the map. The marker stands for
          the assigned driver, so it only appears once there is one to point at. */}
      {driver ? (
        <View style={styles.driverOnMap} pointerEvents="none">
          <View style={styles.driverMarker}>
            <Icon name="motorcycle" size={Sizes.iconBase} color={Palette.onPrimary} />
          </View>
          <View style={styles.etaChip}>
            <DSText variant="labelXs" color={Palette.onSurface}>
              {`${driver.etaMinutes} min`}
            </DSText>
          </View>
        </View>
      ) : null}

      {/* Second nearby driver, the dark dot marker. */}
      <View style={styles.secondaryMarker} pointerEvents="none">
        <View style={styles.secondaryCore} />
      </View>

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
              <Icon name="near-me" size={Sizes.iconMd} color={Palette.primary} />
              <DSText variant="labelMd" color={Palette.onSurface}>
                {BookingCopy.trackingHeader}
              </DSText>
            </View>
            {driver ? (
              <Pill
                label={`${BookingCopy.trackingEtaPrefix} ${driver.etaMinutes} ${BookingCopy.trackingEtaSuffix}`}
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
                          name="motorcycle"
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
                      disabled
                    />
                    <IconButton
                      icon="call"
                      accessibilityLabel="Call driver"
                      box={MinTouchTarget}
                      background={Palette.primary}
                      color={Palette.onPrimaryFixedVariant}
                      size={Sizes.iconMd}
                      disabled
                    />
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
                  {/*
                    The design draws a "Change" link here, but payment is locked once a
                    driver is assigned and there is no mid-trip payment flow to open, so
                    the row stays informational rather than offering a dead control.
                  */}
                </View>
              </>
            ) : null}

            {/* Status flow controls — the design covers pickup only, so the mock keeps
                these buttons to advance the trip. */}
            <DSText variant="labelSm" color={Palette.secondary} style={styles.statusNote}>
              {StatusCopy[status] ?? 'Menunggu status'}
            </DSText>

            {status === 'pickup' ? (
              <Button label="Saya sudah naik" variant="dark" onPress={handleStartTrip} />
            ) : null}
            {status === 'onTrip' ? (
              <Button
                label="Selesaikan perjalanan"
                variant="dark"
                onPress={handleCompleteTrip}
              />
            ) : null}
            {status === 'completed' ? (
              <>
                <Button
                  label="Beri Nilai Driver"
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
  statusNote: {
    textAlign: 'center',
  },
});
