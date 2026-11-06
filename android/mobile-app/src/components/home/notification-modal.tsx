import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { DSText } from '@/components/ds/ds-text';
import { Icon, type IconName } from '@/components/ds/icon';
import {
  Brand,
  FontFamily,
  Palette,
  Radius,
  ShadowSheet,
  ShadowSoft,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import { useAuth } from '@/hooks/use-auth';
import { ENV } from '@/constants/env';

const BACKEND_URL = ENV.API_URL;

export type NotificationItem = {
  id: string | number;
  type: string;
  title: string;
  body: string;
  data?: string;
  read_at?: string | null;
  created_at: string;
};

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    type: 'promo',
    title: 'Diskon Spesial UmfaGo Food s/d 40%!',
    body: 'Lapar siang ini? Pesan aneka burger, nasi padang, dan minuman segar dengan promo hemat.',
    created_at: 'Baru saja',
  },
  {
    id: 'n-2',
    type: 'wallet_topup',
    title: 'Isi Saldo OpenPay Berhasil',
    body: 'Top up saldo Rp 100.000 telah sukses masuk ke dompet digital Anda. Siap digunakan bertransaksi!',
    created_at: '2 jam lalu',
  },
  {
    id: 'n-3',
    type: 'trip_completed',
    title: 'Perjalanan Selesai',
    body: 'Terima kasih telah berkendara bersama UmfaGo Ride. Berikan ulasan untuk membantu mitra driver kami.',
    created_at: 'Kemarin',
  },
  {
    id: 'n-4',
    type: 'safety',
    title: 'Pusat Keselamatan Aktif 24/7',
    body: 'Gunakan tombol Darurat SOS dan Bagikan Rute Live kepada keluarga demi keamanan setiap perjalanan.',
    created_at: '2 hari lalu',
  },
];

function getNotifIcon(type: string): { icon: IconName; bg: string; fg: string } {
  switch (type) {
    case 'wallet_topup':
    case 'withdrawal_disbursed':
      return { icon: 'account-balance-wallet', bg: Palette.primaryContainer, fg: Palette.onPrimaryContainer };
    case 'promo':
      return { icon: 'local-offer', bg: '#FEF3C7', fg: '#D97706' };
    case 'trip_completed':
    case 'order_accepted':
    case 'driver_arrived':
      return { icon: 'two-wheeler', bg: Palette.tertiaryContainer, fg: Palette.onTertiaryContainer };
    case 'order_cancelled':
    case 'withdrawal_rejected':
      return { icon: 'cancel', bg: Palette.errorContainer, fg: Palette.onErrorContainer };
    case 'safety':
      return { icon: 'verified-user', bg: '#DCFCE7', fg: '#16A34A' };
    default:
      return { icon: 'notifications', bg: Palette.surfaceContainerHigh, fg: Palette.primary };
  }
}

export type NotificationModalProps = {
  visible: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
};

export function NotificationModal({ visible, onClose, onUnreadChange }: NotificationModalProps) {
  const router = useRouter();
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'promo'>('all');

  const fetchNotifications = async () => {
    if (!token) {
      setNotifications(DEFAULT_NOTIFICATIONS);
      onUnreadChange?.(2);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.notifications || [];
        if (items.length > 0) {
          setNotifications(items);
          const unreadCount = items.filter((n: any) => !n.read_at).length;
          onUnreadChange?.(unreadCount);
        } else {
          setNotifications(DEFAULT_NOTIFICATIONS);
          onUnreadChange?.(2);
        }
      }
    } catch {
      setNotifications(DEFAULT_NOTIFICATIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible, token]);

  const handleMarkAllRead = async () => {
    if (token) {
      try {
        await fetch(`${BACKEND_URL}/api/notifications/read-all`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
    );
    onUnreadChange?.(0);
  };

  const handleSelectNotification = async (item: NotificationItem) => {
    // Tandai sudah dibaca di backend
    if (token && !item.read_at && typeof item.id === 'number') {
      try {
        await fetch(`${BACKEND_URL}/api/notifications/${item.id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n))
    );

    onClose();

    // Navigasi kontekstual
    if (item.type.includes('wallet')) {
      router.push('/profile/payment');
    } else if (item.type === 'promo') {
      router.push('/promo');
    } else if (item.type === 'safety') {
      router.push('/profile/safety');
    } else if (item.type.includes('trip') || item.type.includes('order')) {
      router.push('/(tabs)/activity');
    }
  };

  const filteredItems = notifications.filter((item) => {
    if (filter === 'unread') return !item.read_at;
    if (filter === 'promo') return item.type === 'promo';
    return true;
  });

  const unreadTotal = notifications.filter((n) => !n.read_at).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Tutup notifikasi"
        />

        <View style={styles.sheetContainer}>
          {/* Top Handle */}
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <DSText variant="headlineMd" color={Palette.onSurface}>
                Notifikasi
              </DSText>
              <DSText variant="labelSm" color={Palette.secondary}>
                {unreadTotal > 0
                  ? `${unreadTotal} pemberitahuan belum dibaca`
                  : 'Semua pemberitahuan sudah dibaca'}
              </DSText>
            </View>

            {unreadTotal > 0 ? (
              <TouchableOpacity
                onPress={handleMarkAllRead}
                style={styles.markAllBtn}
                accessibilityRole="button"
                accessibilityLabel="Tandai semua dibaca">
                <Icon name="done-all" size={Sizes.iconXs} color={Palette.primary} />
                <DSText variant="labelSm" color={Palette.primary} style={styles.markAllText}>
                  Tandai Dibaca
                </DSText>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              onPress={() => setFilter('all')}
              style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}>
              <DSText
                variant="labelSm"
                color={filter === 'all' ? Palette.onPrimary : Palette.secondary}>
                Semua
              </DSText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilter('unread')}
              style={[styles.filterChip, filter === 'unread' && styles.filterChipActive]}>
              <DSText
                variant="labelSm"
                color={filter === 'unread' ? Palette.onPrimary : Palette.secondary}>
                Belum Dibaca {unreadTotal > 0 ? `(${unreadTotal})` : ''}
              </DSText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilter('promo')}
              style={[styles.filterChip, filter === 'promo' && styles.filterChipActive]}>
              <DSText
                variant="labelSm"
                color={filter === 'promo' ? Palette.onPrimary : Palette.secondary}>
                Promo & Info
              </DSText>
            </TouchableOpacity>
          </View>

          {/* List Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Palette.primary} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}>
              {filteredItems.map((item) => {
                const isUnread = !item.read_at;
                const iconInfo = getNotifIcon(item.type);

                return (
                  <TouchableOpacity
                    key={String(item.id)}
                    activeOpacity={0.7}
                    onPress={() => handleSelectNotification(item)}
                    style={[styles.notifCard, isUnread && styles.notifCardUnread]}>
                    <View style={[styles.iconBox, { backgroundColor: iconInfo.bg }]}>
                      <Icon name={iconInfo.icon} size={Sizes.iconMd} color={iconInfo.fg} />
                    </View>

                    <View style={styles.notifBody}>
                      <View style={styles.notifTitleRow}>
                        <DSText
                          variant="headlineSm"
                          color={Palette.onSurface}
                          numberOfLines={1}
                          style={styles.notifTitle}>
                          {item.title}
                        </DSText>
                        {isUnread ? <View style={styles.unreadDot} /> : null}
                      </View>

                      <DSText variant="bodySm" color={Palette.secondary} numberOfLines={2} style={styles.notifDesc}>
                        {item.body}
                      </DSText>

                      <DSText variant="labelXs" color={Palette.outline} style={styles.notifTime}>
                        {item.created_at}
                      </DSText>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {filteredItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon name="notifications-off" size={44} color={Palette.surfaceVariant} />
                  <DSText variant="headlineSm" color={Palette.onSurface} style={styles.emptyTitle}>
                    Tidak ada notifikasi
                  </DSText>
                  <DSText variant="bodySm" color={Palette.secondary} style={styles.emptySubtitle}>
                    Pemberitahuan terkait pesanan dan promo akan muncul di sini.
                  </DSText>
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '80%',
    paddingBottom: Spacing.xl,
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
    backgroundColor: Palette.surfaceVariant,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.edgeMargin,
    paddingVertical: Spacing.xs,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceContainerLow,
  },
  markAllText: {
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.edgeMargin,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.surfaceVariant,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceContainerLow,
  },
  filterChipActive: {
    backgroundColor: Palette.primary,
  },
  listContent: {
    paddingHorizontal: Spacing.edgeMargin,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.surfaceVariant,
  },
  notifCardUnread: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderColor: Palette.outlineVariant,
    ...ShadowSoft,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBody: {
    flex: 1,
    gap: 3,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifTitle: {
    flex: 1,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Palette.error,
    marginLeft: 6,
  },
  notifDesc: {
    lineHeight: 18,
  },
  notifTime: {
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: Spacing.xs,
  },
  emptyTitle: {
    marginTop: Spacing.sm,
    fontWeight: '600',
  },
  emptySubtitle: {
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
