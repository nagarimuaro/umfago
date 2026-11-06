import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { reversePhotonGeocode, searchPhotonPlaces } from '@/services/photon';
import { useAuth } from '@/hooks/use-auth';
import { FareSummary } from '@/components/booking/fare-summary';
import { LocationInputs } from '@/components/booking/location-inputs';
import { MapLibreOSMView } from '@/components/booking/map-libre-view';
import { PaymentTiles } from '@/components/booking/payment-tiles';
import { PromoField } from '@/components/booking/promo-field';
import { QuickActions, type QuickAction } from '@/components/booking/quick-actions';
import { SavedPlacesList } from '@/components/booking/saved-places-list';
import { Button } from '@/components/ds/button';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import { formatDistance, PaymentMethods, SavedPlaces } from '@/constants/booking';
import { BookingCopy } from '@/constants/booking-content';
import {
  Brand,
  Neutral,
  Overlay,
  Palette,
  Radius,
  ShadowSheet,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import { Wallet } from '@/constants/home-content';
import { FareRules } from '@/constants/pricing';
import { useBooking } from '@/hooks/use-booking';
import type { Place } from '@/types/order';

/**
 * Shortcuts under the route fields. Home and Work come from the saved-place list; the
 * design's third chip schedules the ride for later, which has no flow yet, so it stays
 * disabled instead of accepting taps it cannot act on.
 */
const ScheduleAction: QuickAction = {
  id: 'later',
  label: 'Nanti',
  icon: 'schedule',
  disabled: true,
};

export default function ServiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();
  const {
    pickup,
    setPickup,
    destination,
    route,
    service,
    setService,
    payment,
    setPayment,
    fare,
    backendQuote,
    promo,
    applyPromo,
    clearPromo,
    setDestination,
  } = useBooking();

  /**
   * Free text yang diketik pengguna: membedakan pencarian penjemputan vs pengantaran
   */
  const [activeField, setActiveField] = useState<'pickup' | 'destination'>('destination');
  const [pickupInput, setPickupInput] = useState(pickup?.address || '');
  const [destInput, setDestInput] = useState(destination?.address || '');
  const [locating, setLocating] = useState(false);
  const [pinLocked, setPinLocked] = useState(false);
  const [confirmingLocation, setConfirmingLocation] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshProfile().catch(() => {});
    }, [])
  );

  useEffect(() => {
    setPickupInput(pickup?.address || '');
  }, [pickup?.address]);

  useEffect(() => {
    setDestInput(destination?.address || '');
  }, [destination?.address]);

  /**
   * Mendapatkan koordinat GPS terkini secara cross-platform (Web Geolocation & Native expo-location)
   */
  const getLiveCoords = async (): Promise<{ lat: number; lon: number } | null> => {
    // 1. Browser Geolocation (Web)
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            maximumAge: 60000,
            enableHighAccuracy: true,
          });
        });
        if (pos?.coords?.latitude && pos?.coords?.longitude) {
          return { lat: pos.coords.latitude, lon: pos.coords.longitude };
        }
      } catch {
        // Fallback silently if browser geolocation is unavailable or permission denied
      }
    }

    // 2. expo-location (Android / iOS)
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status === 'granted') {
        let location = await Location.getLastKnownPositionAsync();
        if (!location) {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }
        if (location?.coords) {
          return { lat: location.coords.latitude, lon: location.coords.longitude };
        }
      }
    } catch {
      // Fallback silently
    }
    return null;
  };

  /**
   * Meminta izin akses lokasi GPS & mengarahkan titik jemput ke lokasi saat ini
   */
  const handleLocateMe = useCallback(async () => {
    setLocating(true);
    try {
      const coords = await getLiveCoords();
      if (coords) {
        const addressName = await reversePhotonGeocode(coords.lat, coords.lon);
        setPickup({
          id: 'gps-current',
          label: 'Lokasi Saya (Saat Ini)',
          address: addressName,
          lat: coords.lat,
          lon: coords.lon,
        });
        setPickupInput(addressName);
        setPinLocked(true);
        return;
      }

      const fallbackLat = -0.664159;
      const fallbackLon = 100.939844;
      const addressName = await reversePhotonGeocode(fallbackLat, fallbackLon);
      setPickup({
        id: 'gps-fallback',
        label: 'Lokasi Saya',
        address: addressName,
        lat: fallbackLat,
        lon: fallbackLon,
      });
      setPickupInput(addressName);
      setPinLocked(true);
    } catch {
      // Ignored
    } finally {
      setLocating(false);
    }
  }, [setPickup]);

  // Otomatis sinkronkan titik jemput ke lokasi pengguna saat ini ketika halaman pertama dibuka
  useEffect(() => {
    if (!pickup || pickup.id === 'current' || pickup.id === 'gps-fallback') {
      handleLocateMe();
    }
  }, [handleLocateMe]);

  // Mengunci lokasi titik jemput atau tujuan saat tombol "Pilih lokasi ini" pada pin ditekan
  const handleConfirmMapLocation = useCallback(
    async (lat: number, lon: number) => {
      setConfirmingLocation(true);
      try {
        const addressName = await reversePhotonGeocode(lat, lon);
        if (activeField === 'pickup') {
          setPickup({
            id: `map-pickup-${Date.now()}`,
            label: 'Titik Jemput (Peta)',
            address: addressName,
            detail: pickup?.detail || '',
            lat,
            lon,
          });
          setPickupInput(addressName);
          setPinLocked(true);
          // Otomatis arahkan fokus berikutnya ke titik tujuan
          setActiveField('destination');
        } else {
          setDestination({
            id: `map-dest-${Date.now()}`,
            label: 'Titik Tujuan (Peta)',
            address: addressName,
            detail: destination?.detail || '',
            lat,
            lon,
          });
          setDestInput(addressName);
          setPinLocked(true);
        }
      } finally {
        setConfirmingLocation(false);
      }
    },
    [activeField, pickup?.detail, destination?.detail, setPickup, setDestination]
  );

  const quickActions = useMemo<readonly QuickAction[]>(
    () => [
      ...SavedPlaces.filter((place) => place.id === 'home' || place.id === 'work').map((place) => ({
        id: place.id,
        label: place.label,
        icon: place.id === 'home' ? ('home' as const) : ('work' as const),
      })),
      ScheduleAction,
    ],
    []
  );

  const choose = useCallback(
    (place: Place) => {
      if (place.id === 'action-current-loc') {
        handleLocateMe();
        setActiveField('destination');
        return;
      }
      if (activeField === 'pickup') {
        setPickup(place);
        setPickupInput(place.address || place.label);
        setPinLocked(true);
        setActiveField('destination');
      } else {
        setDestination(place);
        setDestInput(place.address || place.label);
        setPinLocked(true);
      }
    },
    [activeField, setPickup, setDestination, handleLocateMe]
  );

  const handleQuickAction = useCallback(
    (id: string) => {
      const place = SavedPlaces.find((candidate) => candidate.id === id);
      if (place) choose(place);
    },
    [choose]
  );

  const handlePromo = useCallback(
    async (code: string): Promise<boolean> => {
      const res = await applyPromo(code);
      if (res.success) {
        Alert.alert('Kupon Digunakan', res.message);
        return true;
      } else {
        Alert.alert('Kupon Tidak Valid', res.message);
        return false;
      }
    },
    [applyPromo]
  );

  const walletBalance = user?.balance ?? 0;

  const handleConfirmOrder = useCallback(() => {
    console.log('[handleConfirmOrder tapped]', {
      hasDest: Boolean(destination),
      dest: destination?.address,
      payment,
      walletBalance,
      fareTotal: fare.total,
    });
    if (!destination) {
      Alert.alert('Pilih Tujuan', 'Harap pilih lokasi tujuan terlebih dahulu.');
      return;
    }
    if (payment === 'wallet' && walletBalance < fare.total) {
      Alert.alert(
        'Saldo Dompet Kurang',
        `Saldo Anda Rp ${walletBalance.toLocaleString('id-ID')} tidak mencukupi untuk biaya perjalanan Rp ${fare.total.toLocaleString('id-ID')}.\n\nSilakan pilih metode Tunai atau isi saldo terlebih dahulu.`,
        [
          { text: 'Ganti ke Tunai', onPress: () => setPayment('cash') },
          { text: 'Top Up', onPress: () => router.push('/profile/payment') },
          { text: 'Batal', style: 'cancel' },
        ]
      );
      return;
    }
    router.push('/booking/searching');
  }, [destination, payment, walletBalance, fare.total, setPayment, router]);

  // Autocomplete live Photon Geocoding saat pengguna mengetik nama tempat (baik jemput maupun tujuan)
  const currentQuery = activeField === 'pickup' ? pickupInput : destInput;
  const [photonSuggestions, setPhotonSuggestions] = useState<Place[]>([]);

  useEffect(() => {
    const term = currentQuery.trim();
    if (term.length < 2) {
      setPhotonSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchPhotonPlaces(term, pickup?.lat || -0.664159, pickup?.lon || 100.939844)
        .then((results) => {
          setPhotonSuggestions(
            results.map((r) => ({
              id: r.id,
              label: r.label,
              address: r.address,
              lat: r.lat,
              lon: r.lon,
            }))
          );
        })
        .catch(() => {});
    }, 350);

    return () => clearTimeout(timer);
  }, [currentQuery, pickup]);

  /** Suggestions gabungan: rekomendasi Photon OSM live + tempat tersimpan lokal */
  const suggestions = useMemo(() => {
    const term = currentQuery.trim().toLowerCase();
    const useCurrentLocItem: Place = {
      id: 'action-current-loc',
      label: 'Gunakan Lokasi Saat Ini',
      address: pickupInput || 'Arahkan titik jemput ke posisi GPS Anda saat ini',
      lat: pickup?.lat,
      lon: pickup?.lon,
    };

    if (!term) {
      if (activeField === 'pickup') {
        return [useCurrentLocItem, ...SavedPlaces];
      }
      return SavedPlaces;
    }
    if (photonSuggestions.length > 0) {
      if (activeField === 'pickup') {
        return [useCurrentLocItem, ...photonSuggestions];
      }
      return photonSuggestions;
    }
    const filtered = SavedPlaces.filter(
      (place) =>
        place.label.toLowerCase().includes(term) || place.address.toLowerCase().includes(term)
    );
    if (activeField === 'pickup') {
      return [useCurrentLocItem, ...filtered];
    }
    return filtered;
  }, [currentQuery, photonSuggestions, activeField, pickupInput, pickup?.lat, pickup?.lon]);

  const picking = !destination || activeField === 'pickup';

  return (
    <View style={styles.screen}>
      <MapLibreOSMView
        activeTarget={activeField}
        onConfirmLocation={handleConfirmMapLocation}
        pinLocked={pinLocked}
        confirming={confirmingLocation}
        onUnlock={() => setPinLocked(false)}
      />

      <View style={[styles.header, { paddingTop: insets.top }]} pointerEvents="box-none">
        <IconButton
          icon="arrow-back"
          accessibilityLabel="Kembali"
          onPress={() => router.back()}
          box={Sizes.avatar}
          background={Overlay.onMapSurface}
          color={Neutral.gray800}
        />
      </View>

      {/* Tombol Bulat My Location mengapung tepat di atas bottom sheet */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Arahkan ke lokasi saya"
        onPress={handleLocateMe}
        disabled={locating}
        activeOpacity={0.8}
        style={styles.floatingGpsBtn}>
        {locating ? (
          <ActivityIndicator size="small" color={Brand.ink} />
        ) : (
          <Icon name="my-location" size={26} color={Brand.ink} />
        )}
      </TouchableOpacity>

      <View style={styles.sheet}>
        <View style={styles.handleArea}>
          <View style={styles.handle} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <DSText variant="headlineMd" style={styles.sheetTitle}>
            Pilih Lokasi
          </DSText>

          <LocationInputs
            pickup={pickupInput}
            pickupDetail={pickup?.detail || ''}
            destination={destInput}
            destinationDetail={destination?.detail || ''}
            onPickupChange={(text) => {
              setPickupInput(text);
              setActiveField('pickup');
              setPinLocked(false);
              if (!text.trim()) {
                setPickup(null);
              }
            }}
            onPickupDetailChange={(text) => {
              if (pickup) {
                setPickup({ ...pickup, detail: text.slice(0, 100) });
              }
            }}
            onClearPickup={() => {
              setPickupInput('');
              setActiveField('pickup');
              setPinLocked(false);
              setPickup(null);
            }}
            onDestinationChange={(text) => {
              setDestInput(text);
              setActiveField('destination');
              setPinLocked(false);
              if (!text.trim()) {
                setDestination(null);
              }
            }}
            onDestinationDetailChange={(text) => {
              if (destination) {
                setDestination({ ...destination, detail: text.slice(0, 100) });
              }
            }}
            onClearDestination={() => {
              setDestInput('');
              setActiveField('destination');
              setPinLocked(false);
              setDestination(null);
            }}
            onFocusPickup={() => {
              setActiveField('pickup');
              setPinLocked(false);
            }}
            onFocusDestination={() => {
              setActiveField('destination');
              setPinLocked(false);
            }}
          />

          <QuickActions actions={quickActions} onPress={handleQuickAction} />

          {picking ? (
            <>
              <DSText variant="overline" color={Palette.onSurfaceVariant} style={styles.sectionLabel}>
                {BookingCopy.savedPlaces.toUpperCase()}
              </DSText>
              <SavedPlacesList places={suggestions} onSelect={choose} />
            </>
          ) : (
            <>
              <DSText variant="overline" color={Palette.onSurfaceVariant} style={styles.sectionLabel}>
                {BookingCopy.paymentLabel.toUpperCase()}
              </DSText>
              <PaymentTiles
                methods={PaymentMethods}
                selected={payment}
                balances={{ wallet: walletBalance }}
                captions={{ cash: 'Bayar di tempat' }}
                requiredAmount={fare.total}
                onSelect={setPayment}
              />

              <PromoField
                onApply={handlePromo}
                appliedPromo={promo?.code}
                onClearPromo={clearPromo}
              />

              <View style={styles.fareCard}>
                <FareSummary
                  fare={fare}
                  distance={route ? formatDistance(route.distanceKm) : (backendQuote ? formatDistance(backendQuote.distanceKm) : null)}
                  perKm={backendQuote?.perKmPrice ?? FareRules[service].perKm}
                  minDistanceApplied={backendQuote?.minDistanceApplied}
                />
              </View>
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
          <Button
            label={BookingCopy.confirm}
            size="lg"
            disabled={!destination}
            onPress={handleConfirmOrder}
            style={styles.cta}
          />
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
  floatingGpsBtn: {
    position: 'absolute',
    bottom: Sizes.sheetHeight + Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Brand.ctaAction,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Sizes.sheetHeight,
    backgroundColor: Palette.surfaceContainerLowest,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
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
    backgroundColor: Neutral.gray200,
  },
  sheetContent: {
    paddingHorizontal: Spacing.screenMargin,
    paddingBottom: Sizes.sheetScrollPad,
  },
  sheetTitle: {
    marginBottom: Spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  sectionLabel: {
    marginBottom: Spacing.xs,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
    padding: Spacing.md,
    backgroundColor: Palette.surfaceContainerLowest,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Neutral.gray100,
  },
  fareCard: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Neutral.gray100,
    padding: Spacing.md,
  },
  cta: {
    width: '100%',
  },
});
