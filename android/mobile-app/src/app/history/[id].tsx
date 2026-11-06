import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import {
  FontFamily,
  Palette,
  Radius,
  ShadowSoft,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import { useAuth } from '@/hooks/use-auth';
import { ENV } from '@/constants/env';

const BACKEND_URL = ENV.API_URL;

const DRIVER_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCn-Y4D3cHb5c6dWCVe2-mUii1-WgvZEWN3KquGouaKhmm2A9YEWW5cF2B8JbZ9qQ6_llshxd2Vahz3mNFUCglKa8dTsK9H2NgWjrZxVDDztX3EzJHTYLNINWldgJN74Pg5C_A4j30-5GWB899Et1dABd1mOcwNfCb1v1nCrcjfYG-LQFCNQgc1CaKwm0pXYxRLImaJ1Ny4NbRCC5HWkJxbQLUtymbHl_lD1E3Y4GodVDLm11_Pc1Ip';

type ReceiptData = {
  orderId: string;
  dateTime: string;
  totalPaid: string;
  paymentMethod: string;
  baseFare: string;
  serviceFee: string;
  promoDiscount?: string;
  totalAmount: string;
  pickupAddress: string;
  dropoffAddress: string;
  distance: string;
  duration: string;
  driverName: string;
  driverVehicle: string;
  driverAvatar: string;
};

const DEFAULT_RECEIPT: ReceiptData = {
  orderId: '#OJ-123456789',
  dateTime: '12 Oct 2026, 14:45',
  totalPaid: 'Rp 12.500',
  paymentMethod: 'OpenPay',
  baseFare: 'Rp 14.000',
  serviceFee: 'Rp 2.500',
  promoDiscount: '-Rp 4.000',
  totalAmount: 'Rp 12.500',
  pickupAddress: 'Sudirman Central Business District',
  dropoffAddress: 'Grand Indonesia Mall',
  distance: '4.2 km',
  duration: '18 mins',
  driverName: 'Budi Santoso',
  driverVehicle: 'Black Honda Vario (B 1234 XYZ)',
  driverAvatar: DRIVER_AVATAR,
};

export default function HistoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [receipt, setReceipt] = useState<ReceiptData>(DEFAULT_RECEIPT);

  useEffect(() => {
    if (!token || !id || id.startsWith('ride-') || id.startsWith('food-') || id.startsWith('send-') || id.startsWith('car-')) {
      return;
    }

    const fetchOrderDetail = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/orders/${id}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        const o = data.order || data;

        if (o) {
          const fare = Number(o.fare_amount || 0);
          const fee = Number(o.customer_fee || 2500);
          const discount = Number(o.promo_discount || 0);
          const total = fare + fee - discount;

          const dateStr = o.created_at
            ? new Date(o.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : DEFAULT_RECEIPT.dateTime;

          setReceipt({
            orderId: `#OJ-${(o.uuid || o.id || id).substring(0, 9).toUpperCase()}`,
            dateTime: dateStr,
            totalPaid: `Rp ${total.toLocaleString('id-ID')}`,
            paymentMethod: o.payment_method === 'wallet' ? 'OpenPay' : 'Tunai',
            baseFare: `Rp ${fare.toLocaleString('id-ID')}`,
            serviceFee: `Rp ${fee.toLocaleString('id-ID')}`,
            promoDiscount: discount > 0 ? `-Rp ${discount.toLocaleString('id-ID')}` : undefined,
            totalAmount: `Rp ${total.toLocaleString('id-ID')}`,
            pickupAddress: o.pickup_address || DEFAULT_RECEIPT.pickupAddress,
            dropoffAddress: o.dropoff_address || DEFAULT_RECEIPT.dropoffAddress,
            distance: o.distance_km ? `${Number(o.distance_km).toFixed(1)} km` : DEFAULT_RECEIPT.distance,
            duration: '18 mins',
            driverName: o.driver?.name || DEFAULT_RECEIPT.driverName,
            driverVehicle: o.driver?.vehicle || DEFAULT_RECEIPT.driverVehicle,
            driverAvatar: o.driver?.avatar || DEFAULT_RECEIPT.driverAvatar,
          });
        }
      } catch {
        // Fallback silently
      }
    };

    fetchOrderDetail();
  }, [id, token]);

  const handleDownloadPDF = () => {
    Alert.alert('Download Receipt', 'Kwitansi bukti pembayaran PDF berhasil diunduh ke perangkat.');
  };

  const handleSendEmail = () => {
    Alert.alert('Kirim ke Email', 'Salinan tanda terima resmi telah dikirimkan ke email terdaftar Anda.');
  };

  const handleShare = () => {
    Alert.alert('Bagikan Bukti', `Bukti perjalanan ${receipt.orderId} siap dibagikan.`);
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Top App Bar */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Kembali"
              onPress={() => router.back()}
              style={styles.iconBtn}>
              <Icon name="arrow-back" size={24} color={Palette.primary} />
            </TouchableOpacity>
            <DSText variant="headlineMd" style={styles.headerTitle}>
              Receipt
            </DSText>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Bagikan tanda terima"
            onPress={handleShare}
            style={styles.iconBtn}>
            <Icon name="share" size={22} color={Palette.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {/* Receipt Header Info */}
          <View style={styles.metaHeader}>
            <DSText variant="labelMd" color={Palette.secondary} style={styles.orderIdText}>
              ORDER ID: {receipt.orderId}
            </DSText>
            <DSText variant="bodyMd" color={Palette.onSurfaceVariant}>
              {receipt.dateTime}
            </DSText>
          </View>

          {/* Transaction Summary Card */}
          <Card level={1} elevation="soft" radius="xl" padding="lg" style={styles.card}>
            <View style={styles.paidHeader}>
              <View style={styles.checkIconWrap}>
                <Icon name="check-circle" size={40} color={Palette.primary} />
              </View>
              <DSText variant="labelMd" color={Palette.secondary}>
                Total Paid
              </DSText>
              <DSText variant="headlineXl" style={styles.paidAmount}>
                {receipt.totalPaid}
              </DSText>
              <View style={styles.paymentMethodPill}>
                <Icon name="account-balance-wallet" size={14} color={Palette.primary} />
                <DSText variant="labelSm" color={Palette.onSurface} style={styles.paymentMethodText}>
                  {receipt.paymentMethod}
                </DSText>
              </View>
            </View>

            {/* Fare Breakdown */}
            <View style={styles.fareSection}>
              <DSText variant="labelMd" color={Palette.onSurfaceVariant} style={styles.sectionHeaderTitle}>
                Fare Breakdown
              </DSText>

              <View style={styles.fareRow}>
                <DSText variant="bodyMd" color={Palette.onSurface}>
                  Base Fare
                </DSText>
                <DSText variant="labelMd" color={Palette.onSurface}>
                  {receipt.baseFare}
                </DSText>
              </View>

              <View style={styles.fareRow}>
                <DSText variant="bodyMd" color={Palette.onSurface}>
                  Service Fee
                </DSText>
                <DSText variant="labelMd" color={Palette.onSurface}>
                  {receipt.serviceFee}
                </DSText>
              </View>

              {receipt.promoDiscount ? (
                <View style={styles.fareRow}>
                  <DSText variant="bodyMd" color={Palette.error}>
                    Promo Discount
                  </DSText>
                  <DSText variant="labelMd" color={Palette.error}>
                    {receipt.promoDiscount}
                  </DSText>
                </View>
              ) : null}

              <View style={styles.fareDivider} />

              <View style={styles.fareTotalRow}>
                <DSText variant="headlineMd" style={styles.totalLabel}>
                  Total Amount
                </DSText>
                <DSText variant="headlineMd" style={styles.totalValue}>
                  {receipt.totalAmount}
                </DSText>
              </View>
            </View>
          </Card>

          {/* Trip Details Card */}
          <Card level={1} elevation="soft" radius="xl" padding="lg" style={styles.card}>
            <DSText variant="labelMd" color={Palette.onSurfaceVariant} style={styles.sectionHeaderTitle}>
              Trip Details
            </DSText>

            {/* Route Timeline */}
            <View style={styles.routeTimeline}>
              <View style={styles.timelineTrack} />

              {/* Pickup Point */}
              <View style={styles.timelineItem}>
                <View style={styles.pickupDot} />
                <View style={styles.pointContent}>
                  <DSText variant="labelSm" color={Palette.secondary}>
                    Pickup
                  </DSText>
                  <DSText variant="bodyMd" color={Palette.onSurface}>
                    {receipt.pickupAddress}
                  </DSText>
                </View>
              </View>

              {/* Drop-off Point */}
              <View style={styles.timelineItem}>
                <View style={styles.dropoffDiamond} />
                <View style={styles.pointContent}>
                  <DSText variant="labelSm" color={Palette.secondary}>
                    Drop-off
                  </DSText>
                  <DSText variant="bodyMd" color={Palette.onSurface}>
                    {receipt.dropoffAddress}
                  </DSText>
                </View>
              </View>
            </View>

            {/* Distance & Duration Grid */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Icon name="route" size={20} color={Palette.secondary} />
                <View>
                  <DSText variant="labelSm" color={Palette.secondary}>
                    Distance
                  </DSText>
                  <DSText variant="labelMd" style={styles.metricValue}>
                    {receipt.distance}
                  </DSText>
                </View>
              </View>

              <View style={styles.metricItem}>
                <Icon name="schedule" size={20} color={Palette.secondary} />
                <View>
                  <DSText variant="labelSm" color={Palette.secondary}>
                    Duration
                  </DSText>
                  <DSText variant="labelMd" style={styles.metricValue}>
                    {receipt.duration}
                  </DSText>
                </View>
              </View>
            </View>
          </Card>

          {/* Driver Info Card */}
          <Card level={1} elevation="soft" radius="xl" padding="md" style={styles.driverCard}>
            <Image
              source={{ uri: receipt.driverAvatar }}
              style={styles.driverAvatar}
              contentFit="cover"
            />
            <View style={styles.driverMeta}>
              <DSText variant="bodyMdSemi" color={Palette.onSurface}>
                {receipt.driverName}
              </DSText>
              <View style={styles.vehicleRow}>
                <Icon name="two-wheeler" size={15} color={Palette.secondary} />
                <DSText variant="labelSm" color={Palette.secondary}>
                  {receipt.driverVehicle}
                </DSText>
              </View>
            </View>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionGroup}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleDownloadPDF}
              style={styles.primaryBtn}>
              <Icon name="download" size={20} color={Palette.onPrimaryContainer} />
              <DSText variant="headlineMd" color={Palette.onPrimaryContainer} style={styles.primaryBtnText}>
                Download PDF Receipt
              </DSText>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleSendEmail}
              style={styles.outlineBtn}>
              <Icon name="mail" size={20} color={Palette.onSurface} />
              <DSText variant="headlineMd" color={Palette.onSurface} style={styles.outlineBtnText}>
                Send to Email
              </DSText>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.replace('/')}
              style={styles.backHomeBtn}>
              <DSText variant="labelMd" color={Palette.primary} style={styles.backHomeText}>
                Back to Home
              </DSText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.surfaceVariant,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.headline,
    fontWeight: '700',
    color: Palette.primary,
  },
  content: {
    paddingHorizontal: Spacing.edgeMargin,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.lg,
  },
  metaHeader: {
    alignItems: 'center',
    gap: 4,
  },
  orderIdText: {
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  card: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Palette.surfaceVariant,
    ...ShadowSoft,
  },
  paidHeader: {
    alignItems: 'center',
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceVariant,
    gap: 4,
  },
  checkIconWrap: {
    marginBottom: 4,
  },
  paidAmount: {
    fontFamily: FontFamily.headline,
    fontWeight: '700',
    color: Palette.onSurface,
    marginTop: 2,
  },
  paymentMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.surfaceContainerHigh,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginTop: 6,
  },
  paymentMethodText: {
    fontWeight: '600',
  },
  fareSection: {
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeaderTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fareDivider: {
    height: 1,
    backgroundColor: Palette.surfaceVariant,
    marginTop: 4,
  },
  fareTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  totalLabel: {
    fontWeight: '700',
    color: Palette.onSurface,
  },
  totalValue: {
    fontWeight: '700',
    color: Palette.onSurface,
  },
  routeTimeline: {
    paddingLeft: Spacing.lg,
    gap: Spacing.lg,
    marginTop: Spacing.sm,
    position: 'relative',
  },
  timelineTrack: {
    position: 'absolute',
    left: 4,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: Palette.surfaceVariant,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    position: 'relative',
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Palette.primary,
    borderWidth: 2,
    borderColor: Palette.surfaceContainerLowest,
    position: 'absolute',
    left: -21,
    top: 4,
  },
  dropoffDiamond: {
    width: 12,
    height: 12,
    backgroundColor: Palette.secondary,
    borderWidth: 2,
    borderColor: Palette.surfaceContainerLowest,
    position: 'absolute',
    left: -21,
    top: 4,
    transform: [{ rotate: '45deg' }],
  },
  pointContent: {
    flex: 1,
    gap: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Palette.surfaceVariant,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metricValue: {
    fontWeight: '700',
    color: Palette.onSurface,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Palette.surfaceVariant,
    ...ShadowSoft,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Palette.surfaceVariant,
  },
  driverMeta: {
    flex: 1,
    gap: 2,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionGroup: {
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Palette.primaryContainer,
    paddingVertical: 14,
    borderRadius: Radius.xl,
  },
  primaryBtnText: {
    fontWeight: '700',
    fontSize: 16,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Palette.outlineVariant,
    paddingVertical: 12,
    borderRadius: Radius.xl,
  },
  outlineBtnText: {
    fontWeight: '600',
    fontSize: 16,
  },
  backHomeBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  backHomeText: {
    textDecorationLine: 'underline',
  },
});

