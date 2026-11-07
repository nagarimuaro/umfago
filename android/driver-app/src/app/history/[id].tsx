import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { colors, formatRupiah, rounded, spacing } from '../../constants/theme';
import { useDriver } from '../../hooks/use-driver';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { orderHistory } = useDriver();

  const order = orderHistory.find((o) => o.id === id) || orderHistory[0];

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorText}>Pesanan tidak ditemukan.</Text>
      </SafeAreaView>
    );
  }

  const isCompleted = order.status === 'completed';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Perjalanan</Text>
        <Text style={styles.headerCode}>{order.code}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Spotlight Card */}
        <View style={styles.spotlightCard}>
          <View style={styles.servicePill}>
            <FontAwesome5
              name={order.serviceType === 'food' ? 'utensils' : 'motorcycle'}
              size={14}
              color={colors.black}
            />
            <Text style={styles.servicePillText}>
              {order.serviceType === 'food' ? 'UmfaFood' : 'UmfaRide'}
            </Text>
          </View>

          <Text style={styles.earningsTitle}>Pendapatan Bersih Driver</Text>
          <Text style={styles.earningsAmount}>{formatRupiah(order.driverEarnings)}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isCompleted ? '#162A14' : '#351010',
                borderColor: isCompleted ? '#23581E' : '#7A1C1C',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: isCompleted ? colors.primary : '#FF8A80' },
              ]}
            >
              {isCompleted ? 'PERJALANAN SELESAI' : 'DIBATALKAN'}
            </Text>
          </View>
        </View>

        {/* Route Details Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>RUTE PERJALANAN</Text>

          {/* Pickup */}
          <View style={styles.routeItem}>
            <View style={styles.pickupDot} />
            <View style={styles.routeTextGroup}>
              <Text style={styles.routeLabel}>TITIK PENJEMPUTAN</Text>
              <Text style={styles.routeAddress}>{order.restaurantName || order.pickup.address}</Text>
              {order.pickup.landmark && <Text style={styles.landmark}>Catatan: {order.pickup.landmark}</Text>}
            </View>
          </View>

          <View style={styles.routeConnector} />

          {/* Destination */}
          <View style={styles.routeItem}>
            <View style={styles.dropoffDot} />
            <View style={styles.routeTextGroup}>
              <Text style={styles.routeLabel}>TITIK TUJUAN</Text>
              <Text style={styles.routeAddress}>{order.destination.address}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Ionicons name="speedometer-outline" size={16} color={colors.primary} />
              <Text style={styles.metricText}>{order.distanceKm} KM</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="time-outline" size={16} color={colors.primary} />
              <Text style={styles.metricText}>{order.estimatedDurationMinutes} MENIT</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={styles.metricText}>{order.createdAt}</Text>
            </View>
          </View>
        </View>

        {/* Fare Breakdown Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>RINCIAN PENDAPATAN & TARIF</Text>

          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Tarif Perjalanan Pelanggan</Text>
            <Text style={styles.fareVal}>{formatRupiah(order.fareAmount)}</Text>
          </View>

          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Biaya Layanan Aplikasi (15%)</Text>
            <Text style={[styles.fareVal, { color: '#FF8A80' }]}>- {formatRupiah(order.platformFee)}</Text>
          </View>

          {order.tipAmount > 0 && (
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Tip Pelanggan (100% Driver)</Text>
              <Text style={[styles.fareVal, { color: colors.primary }]}>+ {formatRupiah(order.tipAmount)}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Bersih Diterima</Text>
            <Text style={styles.totalVal}>{formatRupiah(order.driverEarnings + order.tipAmount)}</Text>
          </View>
        </View>

        {/* Customer Information Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>INFORMASI PENUMPANG</Text>
          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <Ionicons name="person" size={20} color={colors.onSurface} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{order.customer.name}</Text>
              <Text style={styles.customerMeta}>⭐ {order.customer.rating} • Pembayaran Dompet UmfaGo</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#131313',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    backgroundColor: '#131313',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  headerCode: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 40,
  },
  spotlightCard: {
    backgroundColor: '#1F2020',
    borderRadius: rounded.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#353535',
    alignItems: 'center',
    gap: spacing.xs,
  },
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: rounded.full,
    marginBottom: spacing.xs,
  },
  servicePillText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: '800',
  },
  earningsTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  earningsAmount: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: rounded.full,
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sectionCard: {
    backgroundColor: '#1F2020',
    borderRadius: rounded.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  dropoffDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#FF5252',
    marginTop: 4,
  },
  routeConnector: {
    width: 2,
    height: 16,
    backgroundColor: colors.outlineVariant,
    marginLeft: 4,
    marginVertical: -4,
  },
  routeTextGroup: {
    flex: 1,
  },
  routeLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  routeAddress: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  landmark: {
    color: colors.primary,
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#131414',
    padding: spacing.md,
    borderRadius: rounded.md,
    marginTop: spacing.xs,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  fareVal: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2C2D2D',
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  totalLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  totalVal: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  customerMeta: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  errorText: {
    color: colors.white,
    textAlign: 'center',
    marginTop: 40,
  },
});

