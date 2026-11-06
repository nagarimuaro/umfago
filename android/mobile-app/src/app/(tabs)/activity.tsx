import { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon, type IconName } from '@/components/ds/icon';
import {
  FontFamily,
  Opacity,
  Palette,
  Radius,
  ShadowSoft,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import { useAuth } from '@/hooks/use-auth';
import { useBooking } from '@/hooks/use-booking';
import { ENV } from '@/constants/env';

const BACKEND_URL = ENV.API_URL;

const DEFAULT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCodNXQGTtqtT4llRzcRiElOc-ABUPXfcYvxbjdK1ptgGFJsVg2PzOiTf4GY6vwE8eJi0izz1N7mahLxtAKJ0T5IbmLnVPY9_2M1SfS2t0_s9S8flRT-3ZuHe-xPnqjcAWzmZZxV79L4r4-q5-rlNbK2VWQfiOjqEQbhY9PRos8GZxwirSFwAPbsEa-UmpdfFwwq2YkBQLhQSnlKynoUEBkKF_AAO_5XFDVxy9A-wWVHLg2Hyq1_-xg';

const FOOD_THUMB =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDo4EyBGt3MgT2NbN8X7FQRnB4kleZmd6Qwsc3XBqNquPTJDs2urD-HUAqIiYZG_k_pS-vPRLqC93gWHSrMX9Y1-NlMuQ4syuyeFL37tSKf4WI7BRS6Q5UzbnAmPjJhA452bdWaPrE31KVYETBOQJNVhavdrYFkEBDDnVER10hhVsEwNRw9ONbA2kCLNFTgztvtBgeUzipsypdAlZxDWPE41QCS3kj9nrMMRGOZKuS7WERbXZAge6Aq';

type HistoryItemType = 'ride' | 'food' | 'send' | 'car' | 'mart' | 'med';

type HistoryOrderItem = {
  id: string;
  type: HistoryItemType;
  serviceTitle: string;
  timeLabel: string;
  price: string;
  status: 'completed' | 'canceled' | 'ongoing';
  statusLabel: string;
  // Route details (Ride / Car)
  pickupAddress?: string;
  dropoffAddress?: string;
  // Food details
  merchantName?: string;
  foodSummary?: string;
  foodImage?: string;
  // Send details
  packageName?: string;
  recipient?: string;
};

const DEFAULT_COMPLETED_ORDERS: HistoryOrderItem[] = [
  {
    id: 'ride-1',
    type: 'ride',
    serviceTitle: 'UmfaRide',
    timeLabel: 'Hari ini, 10:30',
    price: 'Rp 12.500',
    status: 'completed',
    statusLabel: 'Selesai',
    pickupAddress: 'Jl. Sudirman No. 12',
    dropoffAddress: 'Mall Pelayanan Publik',
  },
  {
    id: 'food-2',
    type: 'food',
    serviceTitle: 'UmfaFood',
    timeLabel: 'Kemarin, 19:15',
    price: 'Rp 24.800',
    status: 'completed',
    statusLabel: 'Selesai',
    merchantName: 'Burger Joint Downtown',
    foodSummary: '2x Cheeseburger Combo, 1x Vanilla Shake',
    foodImage: FOOD_THUMB,
  },
  {
    id: 'send-3',
    type: 'send',
    serviceTitle: 'UmfaSend',
    timeLabel: '24 Okt, 14:00',
    price: 'Rp 8.000',
    status: 'completed',
    statusLabel: 'Selesai',
    packageName: 'Paket Dokumen',
    recipient: 'Penerima: Sarah',
  },
  {
    id: 'car-4',
    type: 'car',
    serviceTitle: 'UmfaCar',
    timeLabel: '20 Okt, 09:00',
    price: 'Rp 45.200',
    status: 'canceled',
    statusLabel: 'Dibatalkan',
    pickupAddress: 'Stasiun Kereta Api',
    dropoffAddress: 'Hotel Grand Mercure',
  },
];

export default function ActivityScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { status: bookingStatus, pickup, destination, fare, service } = useBooking();

  const [activeTab, setActiveTab] = useState<'completed' | 'ongoing'>('completed');
  const [completedOrders, setCompletedOrders] = useState<HistoryOrderItem[]>(DEFAULT_COMPLETED_ORDERS);
  const [ongoingOrders, setOngoingOrders] = useState<HistoryOrderItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch real order history from GET /api/orders
  const fetchOrders = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return;
      const data = await res.json();
      const serverOrders: any[] = data.orders || [];

      if (serverOrders.length === 0) return;

      const parsedCompleted: HistoryOrderItem[] = [];
      const parsedOngoing: HistoryOrderItem[] = [];

      serverOrders.forEach((o) => {
        const rawType = String(o.service_type || (o.merchant_id ? 'food' : o.vehicle_type === 'car' ? 'car' : 'ride')).toLowerCase();
        let itemType: HistoryItemType = 'ride';
        let serviceTitle = 'UmfaRide';
        if (rawType === 'food' || o.merchant_id) {
          itemType = 'food';
          serviceTitle = 'UmfaFood';
        } else if (rawType === 'car') {
          itemType = 'car';
          serviceTitle = 'UmfaCar';
        } else if (rawType === 'send') {
          itemType = 'send';
          serviceTitle = 'UmfaSend';
        } else if (rawType === 'mart') {
          itemType = 'mart';
          serviceTitle = 'UmfaMart';
        }

        const orderDate = o.created_at ? new Date(o.created_at) : new Date();
        const timeLabel = orderDate.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });

        const price = `Rp ${Number(o.fare_amount || 0).toLocaleString('id-ID')}`;

        if (o.status === 'completed' || o.status === 'cancelled') {
          parsedCompleted.push({
            id: String(o.id || o.uuid),
            type: itemType,
            serviceTitle,
            timeLabel,
            price,
            status: o.status === 'completed' ? 'completed' : 'canceled',
            statusLabel: o.status === 'completed' ? 'Completed' : 'Canceled',
            pickupAddress: o.pickup_address || 'Titik Jemput',
            dropoffAddress: o.dropoff_address || 'Titik Tujuan',
            merchantName: o.merchant?.name || 'Mitra Usaha',
            foodSummary: 'Pesanan Makanan & Minuman',
            foodImage: FOOD_THUMB,
          });
        } else {
          parsedOngoing.push({
            id: String(o.id || o.uuid),
            type: itemType,
            serviceTitle,
            timeLabel,
            price,
            status: 'ongoing',
            statusLabel: 'Ongoing',
            pickupAddress: o.pickup_address || 'Titik Jemput',
            dropoffAddress: o.dropoff_address || 'Titik Tujuan',
          });
        }
      });

      if (parsedCompleted.length > 0) {
        setCompletedOrders(parsedCompleted);
      }
      setOngoingOrders(parsedOngoing);
    } catch {
      // Fallback silently to defaults
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  // Include current active booking if one is active
  const activeBookingItem: HistoryOrderItem | null =
    bookingStatus === 'searching' || bookingStatus === 'pickup' || bookingStatus === 'onTrip'
      ? {
        id: 'live-booking',
        type: service === 'car' ? 'car' : 'ride',
        serviceTitle: service === 'car' ? 'OpenCar' : 'OpenRide',
        timeLabel: 'Saat ini berlangsung',
        price: `Rp ${fare.total.toLocaleString('id-ID')}`,
        status: 'ongoing',
        statusLabel: 'Sedang Berjalan',
        pickupAddress: pickup?.address || 'Lokasi jemput saat ini',
        dropoffAddress: destination?.address || 'Tujuan perjalanan',
      }
      : null;

  const currentOngoingList = activeBookingItem
    ? [activeBookingItem, ...ongoingOrders]
    : ongoingOrders;

  const displayedOrders = activeTab === 'completed' ? completedOrders : currentOngoingList;

  // Icon and badge styling by service type
  const getServiceIconConfig = (type: HistoryItemType) => {
    switch (type) {
      case 'ride':
        return {
          icon: 'two-wheeler' as IconName,
          bg: Palette.primaryContainer,
          fg: Palette.onPrimaryContainer,
        };
      case 'car':
        return {
          icon: 'directions-car' as IconName,
          bg: Palette.primaryContainer,
          fg: Palette.onPrimaryContainer,
        };
      case 'food':
        return {
          icon: 'fastfood' as IconName,
          bg: '#ffdad6',
          fg: '#93000a',
        };
      case 'send':
        return {
          icon: 'local-shipping' as IconName,
          bg: Palette.secondaryContainer,
          fg: Palette.onSecondaryContainer,
        };
      case 'mart':
        return {
          icon: 'shopping-basket' as IconName,
          bg: '#e8def8',
          fg: '#4a4458',
        };
      case 'med':
        return {
          icon: 'medical-services' as IconName,
          bg: '#e0f2fe',
          fg: '#0369a1',
        };
      default:
        return {
          icon: 'two-wheeler' as IconName,
          bg: Palette.primaryContainer,
          fg: Palette.onPrimaryContainer,
        };
    }
  };

  const getStatusBadgeConfig = (status: 'completed' | 'canceled' | 'ongoing') => {
    switch (status) {
      case 'completed':
        return {
          bg: Palette.tertiaryContainer,
          fg: Palette.onTertiaryContainer,
        };
      case 'canceled':
        return {
          bg: Palette.surfaceVariant,
          fg: Palette.secondary,
        };
      case 'ongoing':
        return {
          bg: Palette.primaryContainer,
          fg: Palette.onPrimaryContainer,
        };
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Palette.primary]}
              tintColor={Palette.primary}
            />
          }>
          {/* Page Title Header */}
          <View style={styles.titleSection}>
            <DSText variant="headlineXl" style={styles.pageTitle}>
              History
            </DSText>
            <DSText variant="bodyMd" color={Palette.secondary} style={styles.pageSubtitle}>
              Review your past rides and orders.
            </DSText>
          </View>

          {/* Sticky Tab System */}
          <View style={styles.tabContainer}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'completed' }}
              onPress={() => setActiveTab('completed')}
              style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}>
              <DSText
                variant="labelMd"
                color={activeTab === 'completed' ? Palette.primary : Palette.secondary}
                style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
                Completed
              </DSText>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'ongoing' }}
              onPress={() => setActiveTab('ongoing')}
              style={[styles.tabButton, activeTab === 'ongoing' && styles.tabButtonActive]}>
              <DSText
                variant="labelMd"
                color={activeTab === 'ongoing' ? Palette.primary : Palette.secondary}
                style={[styles.tabText, activeTab === 'ongoing' && styles.tabTextActive]}>
                Ongoing
              </DSText>
            </Pressable>
          </View>

          {/* History List (Bento-style layout) */}
          <View style={styles.listContainer}>
            {displayedOrders.length > 0 ? (
              displayedOrders.map((item) => {
                const iconCfg = getServiceIconConfig(item.type);
                const badgeCfg = getStatusBadgeConfig(item.status);
                const isCancelled = item.status === 'canceled';

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    accessibilityLabel={`Detail pesanan ${item.serviceTitle}`}
                    onPress={() => {
                      if (item.status === 'ongoing') {
                        router.push('/booking/trip');
                      } else {
                        router.push({ pathname: '/history/[id]', params: { id: item.id } });
                      }
                    }}>
                    <Card
                      level={1}
                      elevation="soft"
                      radius="xl"
                      padding="md"
                      style={styles.orderCard}>
                      {/* Header Row: Service Icon, Service Name, Date, Price, and Status Badge */}
                      <View style={styles.cardHeader}>
                        <View style={styles.cardHeaderLeft}>
                          <View style={[styles.serviceIconCircle, { backgroundColor: iconCfg.bg }]}>
                            <Icon name={iconCfg.icon} size={24} color={iconCfg.fg} />
                          </View>
                          <View style={styles.serviceMeta}>
                            <DSText variant="headlineMd" style={styles.serviceName}>
                              {item.serviceTitle}
                            </DSText>
                            <DSText variant="labelSm" color={Palette.secondary}>
                              {item.timeLabel}
                            </DSText>
                          </View>
                        </View>

                        <View style={styles.cardHeaderRight}>
                          <DSText variant="labelMd" style={styles.priceText}>
                            {item.price}
                          </DSText>
                          <View style={[styles.statusBadge, { backgroundColor: badgeCfg.bg }]}>
                            <DSText variant="labelXs" color={badgeCfg.fg} style={styles.statusBadgeText}>
                              {item.statusLabel}
                            </DSText>
                          </View>
                        </View>
                      </View>

                      {/* Body Content by Type */}
                      {/* 1. Ride / Car Timeline */}
                      {(item.type === 'ride' || item.type === 'car') && (
                        <View style={styles.timelineContainer}>
                          {/* Vertical connector line */}
                          <View
                            style={[
                              styles.timelineTrack,
                              isCancelled && styles.timelineTrackCancelled,
                            ]}
                          />

                          {/* Pickup Point */}
                          <View style={styles.timelineRow}>
                            <View
                              style={[
                                styles.timelineDot,
                                isCancelled ? styles.dotCancelled : styles.dotPickup,
                              ]}
                            />
                            <DSText
                              variant="bodyMd"
                              color={isCancelled ? Palette.secondary : Palette.onSurface}
                              numberOfLines={1}
                              style={[styles.addressText, isCancelled && styles.addressCancelled]}>
                              {item.pickupAddress}
                            </DSText>
                          </View>

                          {/* Dropoff Point */}
                          <View style={styles.timelineRow}>
                            <View
                              style={[
                                styles.timelineDot,
                                isCancelled ? styles.dotCancelled : styles.dotDropoff,
                              ]}
                            />
                            <DSText
                              variant="bodyMd"
                              color={isCancelled ? Palette.secondary : Palette.onSurface}
                              numberOfLines={1}
                              style={[styles.addressText, isCancelled && styles.addressCancelled]}>
                              {item.dropoffAddress}
                            </DSText>
                          </View>
                        </View>
                      )}

                      {/* 2. Food Order Body */}
                      {item.type === 'food' && (
                        <View style={styles.foodBody}>
                          <DSText variant="bodyMd" style={styles.merchantTitle}>
                            {item.merchantName}
                          </DSText>
                          <DSText variant="labelMd" color={Palette.secondary} numberOfLines={1}>
                            {item.foodSummary}
                          </DSText>
                          {item.foodImage ? (
                            <View style={styles.foodThumbRow}>
                              <Image
                                source={{ uri: item.foodImage }}
                                style={styles.foodThumb}
                                contentFit="cover"
                              />
                            </View>
                          ) : null}
                        </View>
                      )}

                      {/* 3. Send Order Body */}
                      {item.type === 'send' && (
                        <View style={styles.sendBody}>
                          <View style={styles.packageRow}>
                            <Icon name="inventory-2" size={16} color={Palette.secondary} />
                            <DSText variant="bodyMd" style={styles.packageName}>
                              {item.packageName}
                            </DSText>
                          </View>
                          <DSText variant="labelMd" color={Palette.secondary} numberOfLines={1}>
                            {item.recipient}
                          </DSText>
                        </View>
                      )}

                      {/* Ongoing CTA button if active order */}
                      {item.status === 'ongoing' && (
                        <TouchableOpacity
                          onPress={() => router.push('/booking/trip')}
                          style={styles.ongoingCTA}>
                          <DSText variant="labelSm" color={Palette.primary} style={styles.ongoingCTAText}>
                            Lihat Perjalanan Langsung
                          </DSText>
                          <Icon name="arrow-forward" size={16} color={Palette.primary} />
                        </TouchableOpacity>
                      )}
                    </Card>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Icon name="receipt-long" size={36} color={Palette.secondary} />
                </View>
                <DSText variant="headlineMd" style={styles.emptyTitle}>
                  {activeTab === 'completed'
                    ? 'Belum ada riwayat pesanan'
                    : 'Tidak ada pesanan aktif'}
                </DSText>
                <DSText variant="bodySm" color={Palette.secondary} style={styles.emptyDesc}>
                  {activeTab === 'completed'
                    ? 'Pesanan perjalanan atau makananmu yang selesai akan tampil di sini.'
                    : 'Pesan OpenRide, OpenFood, atau OpenSend untuk memulai perjalanan baru.'}
                </DSText>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.surface,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.edgeMargin,
    paddingTop: Spacing.md,
    paddingBottom: 110,
    gap: Spacing.md,
  },
  titleSection: {
    marginBottom: Spacing.sm,
  },
  pageTitle: {
    fontFamily: FontFamily.headline,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  pageSubtitle: {
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceVariant,
    backgroundColor: Palette.surface,
  },
  tabButton: {
    flex: 1,
    paddingBottom: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: Palette.primary,
  },
  tabText: {
    fontWeight: '500',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  listContainer: {
    gap: Spacing.gutter,
  },
  orderCard: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Palette.surfaceVariant,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...ShadowSoft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  serviceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceMeta: {
    gap: 2,
  },
  serviceName: {
    fontWeight: '600',
    color: Palette.onSurface,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontWeight: '700',
    color: Palette.onSurface,
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginTop: 4,
  },
  statusBadgeText: {
    fontWeight: '600',
  },
  timelineContainer: {
    paddingLeft: 56,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    position: 'relative',
  },
  timelineTrack: {
    position: 'absolute',
    left: 60,
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: Palette.surfaceVariant,
  },
  timelineTrackCancelled: {
    backgroundColor: Palette.surfaceVariant,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Palette.surfaceContainerLowest,
    marginLeft: -1,
  },
  dotPickup: {
    backgroundColor: Palette.primary,
  },
  dotDropoff: {
    backgroundColor: Palette.error,
  },
  dotCancelled: {
    backgroundColor: Palette.surfaceVariant,
  },
  addressText: {
    flex: 1,
  },
  addressCancelled: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  foodBody: {
    paddingLeft: 56,
    gap: 4,
    marginTop: Spacing.hair,
  },
  merchantTitle: {
    fontWeight: '600',
    color: Palette.onSurface,
  },
  foodThumbRow: {
    marginTop: 6,
  },
  foodThumb: {
    width: 32,
    height: 32,
    borderRadius: Radius.base,
  },
  sendBody: {
    paddingLeft: 56,
    gap: 4,
    marginTop: Spacing.hair,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  packageName: {
    color: Palette.onSurface,
  },
  ongoingCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.surfaceVariant,
  },
  ongoingCTAText: {
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 1.5,
    gap: Spacing.xs,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    color: Palette.onSurface,
    textAlign: 'center',
  },
  emptyDesc: {
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    lineHeight: 18,
  },
});
