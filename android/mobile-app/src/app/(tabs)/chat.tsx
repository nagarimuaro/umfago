import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThreadRow } from '@/components/chat/thread-row';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import { SampleDriver } from '@/constants/booking';
import { ChatArchiveNote, ChatThreads, isThreadRead, markThreadAsRead } from '@/constants/chat';
import { Palette, Radius, Sizes, Spacing, Typography } from '@/constants/design-system';
import { ENV } from '@/constants/env';
import { useAuth } from '@/hooks/use-auth';
import type { ChatThread } from '@/types/chat';

const SearchPlaceholder = 'Cari pesan...';

export default function ChatScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [serverThreads, setServerThreads] = useState<ChatThread[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrdersForChat = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${ENV.API_URL}/api/orders`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      const orders: any[] = data.orders || [];
      const unreadMap: Record<string, number> = data.unread_chats || {};

      // Ambil order yang aktif atau baru saja selesai
      const activeOrRecent = orders.filter(
        (o) => o.status === 'in_progress' || o.status === 'accepted' || o.status === 'arrived' || o.status === 'completed',
      );

      const dynamicThreads: ChatThread[] = activeOrRecent.map((o) => {
        const orderUUID = String(o.uuid || o.ID);
        const isOngoing = o.status !== 'completed' && o.status !== 'cancelled';
        const serviceLabel = o.service_type === 'car' || o.vehicle_type === 'car' ? 'UmfaCar' : 'UmfaRide';
        const driverName = o.driver?.name || (o.vehicle_type === 'car' ? 'Eko Prasetyo' : 'Budi Santoso');

        const orderDate = o.created_at ? new Date(o.created_at) : new Date();
        const timeLabel = isOngoing
          ? 'Aktif'
          : orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Cek unread count: jika user sudah membuka atau membaca thread ini, jadikan 0
        const isLocallyRead = isThreadRead(orderUUID);
        const unreadFromServer = unreadMap[orderUUID] ?? 0;
        const unreadCount = isLocallyRead ? 0 : unreadFromServer;

        return {
          id: orderUUID,
          kind: 'driver' as const,
          title: `${driverName} (${serviceLabel})`,
          driver: {
            id: String(o.driver_id || '1'),
            name: driverName,
            rating: 4.9,
            vehicle: o.vehicle_type === 'car' ? 'Toyota Avanza' : 'Honda Vario',
            plate: o.vehicle_type === 'car' ? 'BA 5678 AB' : 'BA 1234 XY',
            photo: SampleDriver.photo,
            etaMinutes: isOngoing ? 3 : 0,
          },
          preview: isOngoing
            ? 'Ketuk untuk membuka obrolan langsung dengan pengemudi'
            : 'Perjalanan selesai. Riwayat obrolan tersimpan.',
          timeLabel,
          unreadCount,
          archived: !isOngoing,
          messages: [],
        };
      });

      setServerThreads(dynamicThreads);
    } catch {
      // Fallback
    }
  }, [token]);

  // Muat ulang daftar pesan dan status terbaca setiap kali tab Chat aktif
  useFocusEffect(
    useCallback(() => {
      fetchOrdersForChat();
    }, [fetchOrdersForChat])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrdersForChat();
    setRefreshing(false);
  };

  const combinedThreads = useMemo(() => {
    if (serverThreads.length === 0) {
      return ChatThreads.map((t) => ({
        ...t,
        unreadCount: isThreadRead(t.id) ? 0 : t.unreadCount,
      }));
    }
    // Tambahkan thread customer service dari mock bila perlu
    const supportThread = ChatThreads.find((t) => t.id === 'thread-support');
    const processedSupport = supportThread
      ? { ...supportThread, unreadCount: isThreadRead(supportThread.id) ? 0 : supportThread.unreadCount }
      : null;
    return processedSupport ? [...serverThreads, processedSupport] : serverThreads;
  }, [serverThreads]);

  const threads = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return combinedThreads;

    return combinedThreads.filter(
      (thread) =>
        thread.title.toLowerCase().includes(needle) || thread.preview.toLowerCase().includes(needle),
    );
  }, [query, combinedThreads]);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <DSText variant="headlineLgMobile" color={Palette.primary}>
            Chat
          </DSText>
          <IconButton icon="call" accessibilityLabel="Call support" disabled />
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.searchIcon} pointerEvents="none">
            <Icon name="search" size={Sizes.iconMd} color={Palette.onSurfaceVariant} />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={SearchPlaceholder}
            placeholderTextColor={Palette.onSurfaceVariant}
            accessibilityLabel={SearchPlaceholder}
            returnKeyType="search"
            underlineColorAndroid="transparent"
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Palette.primary]} />}>
          <View style={styles.list}>
            {threads.map((thread, index) => (
              <ThreadRow
                key={thread.id}
                thread={thread}
                isLast={index === threads.length - 1}
                onPress={() => {
                  markThreadAsRead(thread.id);
                  router.push({ pathname: '/chat/[id]', params: { id: thread.id } });
                }}
              />
            ))}
          </View>

          {threads.length === 0 ? (
            <DSText variant="bodySm" color={Palette.onSurfaceVariant} style={styles.empty}>
              No chats match “{query.trim()}”.
            </DSText>
          ) : (
            <DSText variant="labelMd" color={Palette.onSurfaceVariant} style={styles.note}>
              {ChatArchiveNote}
            </DSText>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.surfaceContainerLow,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: Sizes.appBar,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.edgeMargin,
  },
  searchWrap: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.edgeMargin,
    paddingBottom: Spacing.md,
  },
  /* Sits inside the field's left inset, `absolute left-4` in the markup. */
  searchIcon: {
    position: 'absolute',
    left: Spacing.edgeMargin + Spacing.md,
    zIndex: 1,
  },
  searchInput: {
    ...Typography.bodyMd,
    height: Sizes.searchHeight,
    color: Palette.onSurface,
    paddingLeft: Sizes.searchHeight,
    paddingRight: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 0,
    backgroundColor: Palette.surfaceContainer,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  content: {
    paddingBottom: 90,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.surfaceVariant,
  },
  note: {
    marginTop: Spacing.md,
    padding: Spacing.lg,
    textAlign: 'center',
  },
  empty: {
    padding: Spacing.lg,
    textAlign: 'center',
  },
});