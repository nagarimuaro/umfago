import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, formatRupiah, rounded, spacing } from '../../constants/theme';
import { TripCard } from '../../components/history/TripCard';
import { useDriver } from '../../hooks/use-driver';
import { DriverOrder } from '../../types/order';

export default function HistoryScreen() {
  const router = useRouter();
  const { orderHistory, driver } = useDriver();
  const [activeTab, setActiveTab] = useState<'completed' | 'cancelled'>('completed');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orderHistory.filter((order) => {
    const matchesTab = activeTab === 'completed' ? order.status === 'completed' : order.status === 'cancelled';
    const matchesSearch =
      searchQuery.trim() === '' ||
      order.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.pickup.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.destination.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleSelectTrip = (order: DriverOrder) => {
    router.push({
      pathname: '/history/[id]',
      params: { id: order.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Riwayat Perjalanan</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            placeholder="Cari riwayat perjalanan..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs Toggle */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('completed')}
            style={[styles.tabButton, activeTab === 'completed' && styles.activeTabButton]}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
              Selesai ({orderHistory.filter((o) => o.status === 'completed').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('cancelled')}
            style={[styles.tabButton, activeTab === 'cancelled' && styles.activeTabButton]}
          >
            <Text style={[styles.tabText, activeTab === 'cancelled' && styles.activeTabText]}>
              Dibatalkan ({orderHistory.filter((o) => o.status === 'cancelled').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bento Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="trending-up" size={16} color={colors.primary} />
              <Text style={styles.summaryLabel}>Total Pendapatan</Text>
            </View>
            <Text style={styles.summaryValue}>{formatRupiah(driver.stats.todayEarnings)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="navigate-outline" size={16} color={colors.primary} />
              <Text style={styles.summaryLabel}>Total Pesanan</Text>
            </View>
            <Text style={styles.summaryValue}>{driver.stats.completedTrips}</Text>
          </View>
        </View>

        {/* List Section */}
        <View style={styles.listSection}>
          <Text style={styles.sectionHeader}>HARI INI</Text>

          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Tidak ada riwayat untuk filter ini</Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <TripCard key={order.id} order={order} onPress={handleSelectTrip} />
            ))
          )}
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
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    backgroundColor: '#131313',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#1B1C1C',
    borderRadius: rounded.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 13,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1B1C1C',
    borderRadius: rounded.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: rounded.sm,
  },
  activeTabButton: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  activeTabText: {
    color: colors.black,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1F2020',
    borderRadius: rounded.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  summaryValue: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  listSection: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
