import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5, FontAwesome } from '@expo/vector-icons';
import { colors, formatRupiah, rounded, spacing } from '../../constants/theme';
import { useDriver } from '../../hooks/use-driver';

interface ShiftSummaryBentoProps {
  onBackToHome?: () => void;
}

export const ShiftSummaryBento: React.FC<ShiftSummaryBentoProps> = ({ onBackToHome }) => {
  const { driver } = useDriver();

  const totalEarningsWithTips = driver.stats.todayEarnings + driver.stats.todayTips;

  return (
    <View style={styles.container}>
      {/* Shift Ended Badge */}
      <View style={styles.badgeRow}>
        <View style={styles.pulseDot} />
        <Text style={styles.badgeText}>SHIFT HARI INI SELESAI</Text>
      </View>

      {/* Main Title */}
      <Text style={styles.heroTitle}>Selesai Narik</Text>
      <Text style={styles.heroSubtitle}>
        Kerja bagus hari ini! Semua order telah diselesaikan dengan aman. Waktunya istirahat dan pulihkan tenaga.
      </Text>

      {/* Bento Grid */}
      <View style={styles.bentoGrid}>
        {/* Featured Big Earnings Card */}
        <View style={styles.featuredCard}>
          <View style={styles.featuredTop}>
            <View>
              <Text style={styles.featuredLabel}>TOTAL PENDAPATAN HARI INI</Text>
              <Text style={styles.featuredSubLabel}>
                {driver.stats.completedTrips} Trip Diselesaikan
              </Text>
            </View>
            <View style={styles.walletIconCircle}>
              <MaterialIcons name="account-balance-wallet" size={20} color={colors.primary} />
            </View>
          </View>

          <View style={styles.featuredAmountRow}>
            <Text style={styles.featuredCurrency}>Rp</Text>
            <Text style={styles.featuredAmount}>
              {Math.round(totalEarningsWithTips).toLocaleString('id-ID')}
            </Text>
          </View>

          <View style={styles.featuredFooter}>
            <MaterialIcons name="card-giftcard" size={16} color={colors.primary} />
            <Text style={styles.tipText}>
              Termasuk tip pelanggan <Text style={styles.tipAmount}>{formatRupiah(driver.stats.todayTips)}</Text>
            </Text>
          </View>
        </View>

        {/* Two-Column Grid */}
        <View style={styles.twoColumnRow}>
          {/* Active Hours Card */}
          <View style={styles.smallCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={styles.cardHeaderLabel}>Waktu Aktif</Text>
            </View>
            <Text style={styles.cardValue}>
              {Math.floor(driver.stats.onlineDurationMinutes / 60)}j {driver.stats.onlineDurationMinutes % 60}m
            </Text>
            <Text style={styles.cardMeta}>Mulai {driver.stats.shiftStartedAt}</Text>
          </View>

          {/* Trips Completed Card */}
          <View style={styles.smallCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="local-taxi" size={18} color={colors.primary} />
              <Text style={styles.cardHeaderLabel}>Trip Selesai</Text>
            </View>
            <Text style={styles.cardValue}>{driver.stats.completedTrips}</Text>
            <Text style={styles.cardMeta}>{driver.stats.cancelledTrips} Dibatalkan</Text>
          </View>
        </View>

        {/* Rating Card */}
        <View style={styles.ratingCard}>
          <View style={styles.ratingLeft}>
            <View style={styles.cardHeader}>
              <FontAwesome name="star" size={16} color={colors.primary} />
              <Text style={styles.cardHeaderLabel}>Rating Hari Ini</Text>
            </View>
            <View style={styles.ratingValueRow}>
              <Text style={styles.ratingBigNumber}>{driver.stats.rating.toFixed(1)}</Text>
              <Text style={styles.ratingMax}>/ 5.0</Text>
              <Text style={styles.reviewCount}>({driver.stats.reviewCount} Ulasan)</Text>
            </View>
          </View>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <FontAwesome key={s} name="star" size={16} color={colors.primary} />
            ))}
          </View>
        </View>
      </View>

      {/* Bottom CTA Action Button */}
      {onBackToHome && (
        <TouchableOpacity activeOpacity={0.85} onPress={onBackToHome} style={styles.ctaButton}>
          <Text style={styles.ctaText}>Kembali ke Beranda</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.black} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E2020',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderCard,
    alignSelf: 'flex-start',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  bentoGrid: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  featuredCard: {
    backgroundColor: '#1F2020',
    borderRadius: rounded.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#353535',
    gap: spacing.md,
  },
  featuredTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  featuredSubLabel: {
    color: colors.outline,
    fontSize: 12,
    marginTop: 2,
  },
  walletIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  featuredAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  featuredCurrency: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  featuredAmount: {
    color: colors.primary,
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#2C2D2D',
    paddingTop: spacing.sm,
  },
  tipText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  tipAmount: {
    color: colors.white,
    fontWeight: '700',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  smallCard: {
    flex: 1,
    backgroundColor: '#1F2020',
    borderRadius: rounded.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#353535',
    justifyContent: 'space-between',
    minHeight: 110,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardHeaderLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardValue: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  cardMeta: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2020',
    borderRadius: rounded.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#353535',
  },
  ratingLeft: {
    gap: 4,
  },
  ratingValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  ratingBigNumber: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
  },
  ratingMax: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  reviewCount: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
    borderRadius: rounded.full,
    marginTop: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

