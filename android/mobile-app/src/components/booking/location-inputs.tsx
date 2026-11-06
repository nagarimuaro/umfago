import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { BookingCopy } from '@/constants/booking-content';
import {
  Brand,
  Palette,
  Radius,
  ShadowSoft,
  Sizes,
  Spacing,
  Typography,
} from '@/constants/design-system';

export type LocationInputsProps = {
  pickup: string;
  pickupDetail: string;
  destination: string;
  destinationDetail: string;
  onPickupChange?: (text: string) => void;
  onPickupDetailChange?: (text: string) => void;
  onDestinationChange?: (text: string) => void;
  onDestinationDetailChange?: (text: string) => void;
  onFocusPickup?: () => void;
  onFocusDestination?: () => void;
  onClearPickup?: () => void;
  onClearDestination?: () => void;
};

/**
 * Dua pasang kolom rute penjemputan dan pengantaran:
 * - Titik Penjemputan + Kolom Detail Patokan tepat di bawahnya (style seragam, max 100 karakter)
 * - Titik Pengantaran + Kolom Detail Patokan tepat di bawahnya (style seragam, max 100 karakter)
 */
export function LocationInputs({
  pickup,
  pickupDetail,
  destination,
  destinationDetail,
  onPickupChange,
  onPickupDetailChange,
  onDestinationChange,
  onDestinationDetailChange,
  onFocusPickup,
  onFocusDestination,
  onClearPickup,
  onClearDestination,
}: LocationInputsProps) {
  const [focused, setFocused] = useState<
    'pickup' | 'pickupDetail' | 'destination' | 'destinationDetail' | null
  >(null);

  return (
    <View style={styles.wrap}>
      {/* ── 1. Titik Penjemputan ── */}
      <View style={styles.groupBlock}>
        <View
          style={[
            styles.field,
            styles.pickupField,
            focused === 'pickup' && styles.fieldFocused,
          ]}>
          <View style={styles.dot} />
          <TextInput
            accessibilityLabel={BookingCopy.pickupLabel}
            value={pickup}
            onChangeText={onPickupChange}
            onFocus={() => {
              setFocused('pickup');
              onFocusPickup?.();
            }}
            onBlur={() => setFocused(null)}
            placeholder={BookingCopy.pickupPlaceholder}
            placeholderTextColor={Palette.onSurfaceVariant}
            style={styles.input}
          />
          {Boolean(pickup) && onClearPickup && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Hapus titik jemput"
              onPress={onClearPickup}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearBtn}>
              <Icon name="close" size={16} color={Palette.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Detail Patokan Penjemputan tepat di bawah titik jemput */}
        <View
          style={[
            styles.field,
            styles.detailField,
            focused === 'pickupDetail' && styles.fieldFocused,
          ]}>
          <View style={styles.detailIconPlaceholder}>
            <Icon name="info-outline" size={14} color={Palette.secondary} />
          </View>
          <TextInput
            maxLength={100}
            value={pickupDetail}
            onChangeText={onPickupDetailChange}
            onFocus={() => setFocused('pickupDetail')}
            onBlur={() => setFocused(null)}
            placeholder="Detail Alamat"
            placeholderTextColor={Palette.secondary}
            style={styles.detailInput}
          />
          <DSText variant="caption" color={Palette.secondary} style={styles.charCount}>
            {(pickupDetail || '').length}/100
          </DSText>
        </View>
      </View>

      {/* ── 2. Titik Pengantaran / Tujuan ── */}
      <View style={styles.groupBlock}>
        <View
          style={[
            styles.field,
            styles.destinationField,
            focused === 'destination' && styles.fieldFocused,
          ]}>
          <View style={styles.square} />
          <TextInput
            accessibilityLabel={BookingCopy.destinationLabel}
            value={destination}
            onChangeText={onDestinationChange}
            onFocus={() => {
              setFocused('destination');
              onFocusDestination?.();
            }}
            onBlur={() => setFocused(null)}
            placeholder={BookingCopy.destinationPlaceholder}
            placeholderTextColor={Palette.onSurfaceVariant}
            style={styles.input}
          />
          {Boolean(destination) && onClearDestination && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Hapus titik tujuan"
              onPress={onClearDestination}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearBtn}>
              <Icon name="close" size={16} color={Palette.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Detail Patokan Pengantaran tepat di bawah titik tujuan */}
        <View
          style={[
            styles.field,
            styles.detailField,
            focused === 'destinationDetail' && styles.fieldFocused,
          ]}>
          <View style={styles.detailIconPlaceholder}>
            <Icon name="info-outline" size={14} color={Palette.secondary} />
          </View>
          <TextInput
            maxLength={100}
            value={destinationDetail}
            onChangeText={onDestinationDetailChange}
            onFocus={() => setFocused('destinationDetail')}
            onBlur={() => setFocused(null)}
            placeholder="Detail Tujuan"
            placeholderTextColor={Palette.secondary}
            style={styles.detailInput}
          />
          <DSText variant="caption" color={Palette.secondary} style={styles.charCount}>
            {(destinationDetail || '').length}/100
          </DSText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  groupBlock: {
    gap: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.base,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickupField: {
    backgroundColor: Palette.surfaceContainer,
    borderColor: 'transparent',
  },
  destinationField: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderColor: Palette.outlineVariant,
    ...ShadowSoft,
  },
  detailField: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderColor: Palette.outlineVariant,
    marginLeft: Spacing.md,
    opacity: 0.95,
  },
  fieldFocused: {
    borderColor: Palette.onSurface,
  },
  dot: {
    width: Spacing.pill,
    height: Spacing.pill,
    borderRadius: Radius.full,
    backgroundColor: Palette.secondary,
  },
  square: {
    width: Spacing.pill,
    height: Spacing.pill,
    backgroundColor: Palette.primary,
  },
  detailIconPlaceholder: {
    width: Spacing.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    ...Typography.bodyMd,
    flex: 1,
    minHeight: Sizes.iconLg,
    padding: 0,
    color: Palette.onSurface,
  },
  detailInput: {
    ...Typography.bodySm,
    flex: 1,
    minHeight: 32,
    padding: 0,
    color: Palette.onSurface,
  },
  charCount: {
    fontSize: 10,
    marginRight: 2,
  },
  clearBtn: {
    padding: 4,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
