import { StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { formatRupiah } from '@/constants/booking';
import { BookingCopy } from '@/constants/booking-content';
import { Accent, Neutral, Sizes, Spacing } from '@/constants/design-system';
import type { FareBreakdown } from '@/types/order';

function FareRow({
  label,
  value,
  color = Neutral.gray900,
  labelColor = Neutral.gray600,
  info = false,
}: {
  label: string;
  value: string;
  color?: string;
  labelColor?: string;
  info?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.label}>
        <DSText variant="bodySmMedium" color={labelColor}>
          {label}
        </DSText>
        {info ? <Icon name="info-outline" size={Sizes.iconXs} color={Neutral.gray400} /> : null}
      </View>
      <DSText variant="labelMd" color={color}>
        {value}
      </DSText>
    </View>
  );
}

export type FareSummaryProps = {
  fare: FareBreakdown;
  /** Routed distance, already formatted (e.g. "3,4 km"). Row hidden when absent. */
  distance?: string | null;
  /** Tariff per kilometre in rupiah. Row hidden when absent. */
  perKm?: number | null;
  /** Apakah aturan batas jarak/tarif minimum diterapkan oleh backend */
  minDistanceApplied?: boolean;
};

export function FareSummary({ fare, distance, perKm, minDistanceApplied }: FareSummaryProps) {
  return (
    <View>
      <View style={styles.list}>
        <DSText variant="headlineSm" color={Neutral.gray900} style={styles.title}>
          {BookingCopy.fareTitle}
        </DSText>

        {distance ? <FareRow label={BookingCopy.distance} value={distance} /> : null}
        {typeof perKm === 'number' ? (
          <FareRow label={BookingCopy.pricePerKm} value={formatRupiah(perKm)} />
        ) : null}

        <FareRow
          label={minDistanceApplied ? `${BookingCopy.tripFare} (Min. 3 km)` : BookingCopy.tripFare}
          value={formatRupiah(fare.tripFare)}
        />
        <FareRow label={BookingCopy.serviceFee} value={formatRupiah(fare.serviceFee)} info />

        {fare.discount > 0 ? (
          <FareRow
            label={BookingCopy.discount}
            value={`-${formatRupiah(fare.discount)}`}
            color={Accent.success}
            labelColor={Accent.success}
          />
        ) : null}
      </View>

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <DSText variant="headlineBase" color={Neutral.gray900}>
          {BookingCopy.total}
        </DSText>
        <DSText variant="priceTotal" color={Neutral.gray900}>
          {formatRupiah(fare.total)}
        </DSText>
      </View>

      <DSText variant="caption" color={Neutral.gray400} style={styles.disclaimer}>
        {BookingCopy.disclaimer}
      </DSText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.sm,
    marginBottom: Spacing.stack,
  },
  title: {
    marginBottom: Spacing.hair,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Neutral.gray200,
    borderStyle: 'dashed',
    marginBottom: Spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  disclaimer: {
    textAlign: 'right',
  },
});
