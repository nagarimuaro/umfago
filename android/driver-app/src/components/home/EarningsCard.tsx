import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { colors, formatRupiah, rounded, spacing } from '../../constants/theme';
import { useDriver } from '../../hooks/use-driver';

interface EarningsCardProps {
  onPressWallet?: () => void;
  onPressShiftSummary?: () => void;
}

export const EarningsCard: React.FC<EarningsCardProps> = ({ onPressWallet, onPressShiftSummary }) => {
  const { driver } = useDriver();

  const formatActiveDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}j ${mins}m`;
  };

  return (
    <View style={styles.card}>
      {/* Earnings Header */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.titleLabel}>Pendapatan Hari Ini</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountText}>{formatRupiah(driver.stats.todayEarnings)}</Text>
            <View style={styles.growthBadge}>
              <Text style={styles.growthText}>+18%</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={onPressWallet} style={styles.walletButton}>
          <Text style={styles.walletText}>Dompet</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 3 Sub-stat items Bento Grid */}
      <View style={styles.statsGrid}>
        {/* Orders */}
        <View style={styles.statBox}>
          <MaterialIcons name="two-wheeler" size={20} color={colors.textSecondary} />
          <Text style={styles.statValue}>{driver.stats.completedTrips}</Text>
          <Text style={styles.statLabel}>ORDER</Text>
        </View>

        {/* Rating */}
        <View style={styles.statBox}>
          <FontAwesome name="star" size={18} color={colors.primary} />
          <Text style={styles.statValue}>{driver.stats.rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>RATING</Text>
        </View>

        {/* Active Hours */}
        <View style={styles.statBox}>
          <MaterialIcons name="timer" size={20} color={colors.textSecondary} />
          <Text style={styles.statValue}>{formatActiveDuration(driver.stats.onlineDurationMinutes)}</Text>
          <Text style={styles.statLabel}>AKTIF</Text>
        </View>
      </View>

      {/* Status Footer */}
      <TouchableOpacity activeOpacity={0.8} onPress={onPressShiftSummary} style={styles.footerRow}>
        <View style={styles.footerLeft}>
          <MaterialIcons name="shield" size={16} color={colors.primary} />
          <Text style={styles.footerStatus}>Status: Aktif & Siaga</Text>
        </View>
        <View style={styles.footerRight}>
          <Text style={styles.footerCode}>JKT-ID</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1B1C1C',
    borderRadius: rounded.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 2,
  },
  amountText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -0.5,
  },
  growthBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#1C290D',
  },
  growthText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  walletText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#131414',
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: '#232525',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131414',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: '#232525',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerStatus: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerCode: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
