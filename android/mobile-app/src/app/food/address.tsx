import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { Button } from '@/components/ds/button';
import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { AddressMapPin } from '@/components/food/address-map-pin';
import { AddressSearch } from '@/components/food/address-search';
import {
  FontFamily,
  Palette,
  Radius,
  ShadowSheet,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import {
  FoodAddressCopy,
  FoodAddressMap,
  FoodRecentPlaces,
  FoodSavedAddresses,
} from '@/constants/food-address';
import { useAuth } from '@/hooks/use-auth';
import { useFoodOrder } from '@/hooks/use-food-order';
import type { FoodAddress } from '@/types/food';
import { ENV } from '@/constants/env';

const BACKEND_URL = ENV.API_URL;

export default function FoodAddressScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { setAddress } = useFoodOrder();
  const [remoteAddresses, setRemoteAddresses] = useState<FoodAddress[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch(`${BACKEND_URL}/api/user/addresses`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.addresses) && data.addresses.length > 0) {
          const mapped: FoodAddress[] = data.addresses.map((a: any) => ({
            id: String(a.id),
            label: a.label,
            address: a.address,
            area: a.area || 'Alamat Tersimpan',
            icon: a.icon === 'home' || a.icon === 'work' ? a.icon : 'location-on',
            note: a.note || undefined,
          }));
          setRemoteAddresses(mapped);
        }
      })
      .catch(() => {});
  }, [token]);

  const defaultAddresses = useMemo(() => {
    return FoodSavedAddresses.map((entry) => {
      if (entry.id === 'saved-home' && !entry.address && user?.address) {
        return { ...entry, address: user.address, area: 'Alamat Profil' };
      }
      return entry;
    });
  }, [user?.address]);

  const displaySaved = remoteAddresses.length > 0 ? remoteAddresses : defaultAddresses;

  const [selected, setSelected] = useState<FoodAddress>(
    displaySaved[0]?.address ? displaySaved[0] : displaySaved[1] || displaySaved[0],
  );

  useEffect(() => {
    if (displaySaved.length > 0 && !selected?.address) {
      const valid = displaySaved.find((a) => a.address);
      if (valid) setSelected(valid);
    }
  }, [displaySaved]);

  const handleSelectAddress = (addr: FoodAddress) => {
    setSelected(addr);
  };

  const handleConfirm = () => {
    setAddress(selected);
    router.back();
  };

  return (
    <View style={styles.screen}>
      {/* Background Map Canvas */}
      <View style={styles.mapCanvas}>
        <Image
          source={{ uri: FoodAddressMap.uri }}
          style={styles.mapImage}
          contentFit="cover"
          accessibilityLabel={FoodAddressMap.alt}
        />
        {/* Animated Map Pin in Center */}
        <AddressMapPin />
      </View>

      {/* Transparent Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            onPress={() => router.back()}
            style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={Palette.onSurface} />
          </TouchableOpacity>
          <DSText variant="headlineBaseSemi" style={styles.headerTitle}>
            {FoodAddressCopy.title}
          </DSText>
        </View>
      </SafeAreaView>

      {/* Bottom Sheet */}
      <View style={styles.sheet}>
        <View style={styles.handleBar}>
          <View style={styles.handle} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}>
          {/* Search Bar */}
          <AddressSearch placeholder={FoodAddressCopy.searchPlaceholder} />

          {/* Use Current Location Button */}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              const currentLocAddr: FoodAddress = {
                id: 'current-gps',
                label: 'Current Location',
                address: 'Jl. Sudirman No. 45, Jakarta Selatan',
                area: 'Senayan, Jakarta',
                icon: 'my-location',
                note: 'Tinggalkan di lobi gedung',
              };
              setSelected(currentLocAddr);
            }}
            style={styles.currentLocBtn}>
            <View style={styles.currentLocIconCircle}>
              <Icon name="my-location" size={18} color={Palette.primary} />
            </View>
            <DSText variant="bodyMdSemi" color={Palette.onSurface} style={styles.currentLocText}>
              {FoodAddressCopy.currentLocation}
            </DSText>
            <Icon name="chevron-right" size={20} color={Palette.secondary} />
          </TouchableOpacity>

          {/* Saved Addresses Section */}
          <View style={styles.section}>
            <DSText variant="labelSm" color={Palette.secondary} style={styles.sectionTitle}>
              {FoodAddressCopy.savedSection}
            </DSText>

            <View style={styles.addressList}>
              {displaySaved.map((item, idx) => {
                const isSelected = selected.id === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => item.address && handleSelectAddress(item)}
                    style={[
                      styles.addressRow,
                      idx > 0 && styles.rowBorderTop,
                      isSelected && styles.addressRowSelected,
                    ]}>
                    <View style={styles.rowIcon}>
                      <Icon name={item.icon} size={24} color={Palette.secondary} />
                    </View>
                    <View style={styles.rowMeta}>
                      <DSText variant="bodyMdSemi" color={Palette.onSurface}>
                        {item.label}
                      </DSText>
                      <DSText
                        variant="labelMd"
                        color={Palette.secondary}
                        numberOfLines={1}
                        style={styles.addressSub}>
                        {item.address || `Add ${item.label.toLowerCase()} address`}
                      </DSText>
                    </View>

                    {!item.address ? (
                      <DSText variant="labelSm" color={Palette.primary} style={styles.addText}>
                        {FoodAddressCopy.add}
                      </DSText>
                    ) : isSelected ? (
                      <Icon name="check-circle" size={20} color={Palette.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Recent Places Section */}
          <View style={styles.section}>
            <DSText variant="labelSm" color={Palette.secondary} style={styles.sectionTitle}>
              {FoodAddressCopy.recentSection}
            </DSText>

            <View style={styles.addressList}>
              {FoodRecentPlaces.map((item, idx) => {
                const isSelected = selected.id === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleSelectAddress(item)}
                    style={[
                      styles.addressRow,
                      idx > 0 && styles.rowBorderTop,
                      isSelected && styles.addressRowSelected,
                    ]}>
                    <View style={styles.recentIconCircle}>
                      <Icon name="history" size={18} color={Palette.secondary} />
                    </View>
                    <View style={styles.rowMeta}>
                      <DSText variant="bodyMdSemi" color={Palette.onSurface}>
                        {item.label}
                      </DSText>
                      <DSText
                        variant="labelMd"
                        color={Palette.secondary}
                        numberOfLines={1}
                        style={styles.addressSub}>
                        {item.address}
                      </DSText>
                    </View>

                    {isSelected ? (
                      <Icon name="check-circle" size={20} color={Palette.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Fixed Bottom Action Button */}
        <View style={styles.footer}>
          <Button
            label={FoodAddressCopy.confirm}
            variant="primary"
            size="lg"
            onPress={handleConfirm}
            style={styles.confirmBtn}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.surfaceDim,
  },
  mapCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.surfaceDim,
  },
  mapImage: {
    width: '100%',
    height: '60%',
  },
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: Palette.onSurface,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '68%',
    backgroundColor: Palette.surfaceContainerLowest,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    ...ShadowSheet,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: Palette.surfaceVariant,
  },
  sheetContent: {
    paddingHorizontal: Spacing.edgeMargin,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  currentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.surfaceVariant,
  },
  currentLocIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(200, 255, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  currentLocText: {
    flex: 1,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    letterSpacing: 0.8,
    fontWeight: '700',
    paddingHorizontal: Spacing.hair,
  },
  addressList: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.surfaceVariant,
    overflow: 'hidden',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  addressRowSelected: {
    backgroundColor: 'rgba(200, 255, 0, 0.08)',
  },
  rowBorderTop: {
    borderTopWidth: 1,
    borderTopColor: Palette.surfaceVariant,
  },
  rowIcon: {
    marginRight: 2,
  },
  recentIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMeta: {
    flex: 1,
    gap: 2,
  },
  addressSub: {
    lineHeight: 18,
  },
  addText: {
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: Spacing.edgeMargin,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.surfaceVariant,
    backgroundColor: Palette.surfaceContainerLowest,
  },
  confirmBtn: {
    width: '100%',
  },
});
