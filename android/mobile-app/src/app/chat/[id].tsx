import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Composer } from '@/components/chat/composer';
import { MessageBubble } from '@/components/chat/message-bubble';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import { SampleDriver } from '@/constants/booking';
import { ChatDateStamp, QuickReplies, threadById, markThreadAsRead } from '@/constants/chat';
import { Accent, Palette, Radius, Sizes, Spacing } from '@/constants/design-system';
import { useAuth } from '@/hooks/use-auth';
import { ENV } from '@/constants/env';
import type { ChatMessage } from '@/types/chat';
import type { Driver } from '@/types/order';

const ComposerPlaceholder = 'Type a message...';

const BACKEND_URL = ENV.API_URL;

export default function ChatThreadScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token, refreshTokens } = useAuth();
  const presetThread = useMemo(() => (id ? threadById(id) : undefined), [id]);

  const [draft, setDraft] = useState('');
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [liveDriver, setLiveDriver] = useState<Driver | null>(null);
  const [chatClosed, setChatClosed] = useState(false);
  const [sent, setSent] = useState<readonly ChatMessage[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const isOrderUUID = useMemo(() => {
    return Boolean(id && !presetThread);
  }, [id, presetThread]);

  // Tandai pesan telah dibaca begitu layar percakapan dibuka
  useEffect(() => {
    if (id) {
      markThreadAsRead(id);
      if (token && isOrderUUID) {
        fetch(`${BACKEND_URL}/api/orders/${id}/chat/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }
  }, [id, token, isOrderUUID]);

  // Muat riwayat chat & driver jika `id` adalah order UUID
  useEffect(() => {
    if (!token || !id || !isOrderUUID) return;

    let isMounted = true;
    let ws: WebSocket | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    const fetchOrderAndChat = async () => {
      try {
        let currentToken = token;

        // Ambil info order & driver
        let orderRes = await fetch(`${BACKEND_URL}/api/orders/${id}`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });

        // Jika unauthorized (token expired), coba refresh token sekali
        if (orderRes.status === 401) {
          const freshToken = await refreshTokens();
          if (freshToken) {
            currentToken = freshToken;
            orderRes = await fetch(`${BACKEND_URL}/api/orders/${id}`, {
              headers: { Authorization: `Bearer ${currentToken}` },
            });
          } else {
            if (interval) clearInterval(interval);
            return;
          }
        }

        if (orderRes.ok) {
          const orderData = await orderRes.json();
          const d = orderData.driver;
          const o = orderData.order || orderData;
          if (isMounted) {
            if (d) {
              setLiveDriver({
                id: String(d.id),
                name: d.name || 'Driver UmfaGo',
                rating: Number(d.rating || 4.9),
                vehicle: d.vehicle || (o.vehicle_type === 'car' ? 'Toyota Avanza' : 'Honda Vario'),
                plate: d.plate || (o.vehicle_type === 'car' ? 'BA 5678 AB' : 'BA 1234 XY'),
                photo: d.photo?.startsWith('http') ? d.photo : SampleDriver.photo,
                etaMinutes: o.status === 'in_progress' ? 3 : 0,
              });
            } else if (o) {
              setLiveDriver({
                id: String(o.driver_id || '1'),
                name: o.vehicle_type === 'car' ? 'Eko Prasetyo' : 'Budi Santoso',
                rating: 4.9,
                vehicle: o.vehicle_type === 'car' ? 'Toyota Avanza' : 'Honda Vario',
                plate: o.vehicle_type === 'car' ? 'BA 5678 AB' : 'BA 1234 XY',
                photo: SampleDriver.photo,
                etaMinutes: 3,
              });
            }
          }
        }

        // Ambil riwayat chat
        const chatRes = await fetch(`${BACKEND_URL}/api/orders/${id}/chat`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (chatRes.ok && isMounted) {
          const chatData = await chatRes.json();
          setChatClosed(Boolean(chatData.chat_closed));
          const msgs: ChatMessage[] = (chatData.messages || []).map((m: any) => ({
            id: String(m.ID || m.id),
            author: m.sender_id === user?.id ? 'me' : 'them',
            text: m.message || '',
            timeLabel: m.created_at
              ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Baru saja',
          }));
          setLiveMessages(msgs);
        } else if (chatRes.status === 401) {
          if (interval) clearInterval(interval);
        }
      } catch {
        // Fallback gracefully
      }
    };

    fetchOrderAndChat();
    interval = setInterval(fetchOrderAndChat, 4000);

    // Sambungan WebSocket realtime untuk pesan instan
    try {
      ws = new WebSocket(`${ENV.WS_URL}?token=${token}`);
      ws.onerror = () => {
        // Abaikan error WS di browser/jaringan — polling 4 detik tetap aktif sebagai fallback
      };
      ws.onmessage = (event) => {
        try {
          const eventData = JSON.parse(event.data);
          if (eventData.type === 'chat_message' && eventData.payload) {
            const payload = typeof eventData.payload === 'string' ? JSON.parse(eventData.payload) : eventData.payload;
            if (payload.order_uuid === id && isMounted) {
              const newMsg: ChatMessage = {
                id: `ws-${Date.now()}`,
                author: payload.sender_id === user?.id ? 'me' : 'them',
                text: payload.message || '',
                timeLabel: payload.created_at
                  ? new Date(payload.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Baru saja',
              };
              setLiveMessages((prev) => [...prev, newMsg]);
            }
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
      if (ws) ws.close();
    };
  }, [token, id, isOrderUUID, user?.id, refreshTokens]);

  const isSendingRef = useRef(false);

  const handleSend = async () => {
    if (isSendingRef.current) return;
    const text = draft.trim();
    if (!text || chatClosed) return;
    isSendingRef.current = true;
    if (id) markThreadAsRead(id);

    const localMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      author: 'me',
      text,
      timeLabel: 'Baru saja',
    };

    setSent((current) => [...current, localMsg]);
    setDraft('');

    if (token && id && isOrderUUID) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/orders/${id}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: text }),
        });
        const resData = await res.json();
        if (resData.chat_closed) {
          setChatClosed(true);
        }
      } catch {
        // Pesan tetap terlihat di UI lokal
      } finally {
        isSendingRef.current = false;
      }
    } else {
      isSendingRef.current = false;
    }
  };

  const driver = liveDriver || presetThread?.driver || (isOrderUUID ? SampleDriver : undefined);
  const title = driver?.name ?? presetThread?.title ?? 'Chat Pengemudi';
  const baseMessages = isOrderUUID
    ? liveMessages.length > 0
      ? liveMessages
      : [
          {
            id: 'init-1',
            author: 'them' as const,
            text: 'Halo! Saya sedang menuju ke lokasi penjemputan Anda.',
            timeLabel: 'Baru saja',
          },
        ]
    : presetThread?.messages ?? [];

  // Gabungkan pesan server dan pesan lokal dengan deduplikasi agar tidak muncul 2 kali
  const messages = useMemo(() => {
    const result = [...baseMessages];
    for (const s of sent) {
      const alreadyInBase = baseMessages.some(
        (b) => b.author === 'me' && b.text.trim() === s.text.trim()
      );
      if (!alreadyInBase) {
        result.push(s);
      }
    }
    return result;
  }, [baseMessages, sent]);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <IconButton icon="arrow-back" accessibilityLabel="Go back" onPress={router.back} />
            <View style={styles.identity}>
              {driver ? (
                <Image
                  source={{ uri: driver.photo }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                  accessibilityIgnoresInvertColors
                />
              ) : null}
              <View style={styles.identityText}>
                <DSText variant="headlineSm" numberOfLines={1}>
                  {driver?.name ?? title}
                </DSText>
                {driver ? (
                  <View style={styles.meta}>
                    <Icon name="star" size={Sizes.iconXs} color={Accent.gold} />
                    <DSText variant="labelSm" color={Palette.onSurfaceVariant}>
                      {driver.rating}
                    </DSText>
                    <DSText variant="labelSm" color={Palette.onSurfaceVariant}>
                      •
                    </DSText>
                    <DSText
                      variant="labelSm"
                      color={Palette.onSurfaceVariant}
                      numberOfLines={1}
                      style={styles.vehicle}>
                      {`${driver.vehicle} - ${driver.plate}`}
                    </DSText>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
          <IconButton
            icon="call"
            accessibilityLabel={`Call ${driver?.name ?? title}`}
            color={Palette.primary}
            background={Palette.surfaceContainerLow}
            onPress={() =>
              router.push({
                pathname: '/call/[id]',
                params: {
                  id: id || 'demo',
                  name: driver?.name || 'Driver UmfaGo',
                  photo: driver?.photo || '',
                  vehicle: driver?.vehicle || '',
                  plate: driver?.plate || '',
                  phone: (driver as any)?.phone || '081234567891',
                },
              })
            }
          />
        </View>

        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.thread}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            <View style={styles.dateStamp}>
              <DSText variant="labelSm" color={Palette.onSurfaceVariant}>
                {ChatDateStamp}
              </DSText>
            </View>

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </ScrollView>

          {chatClosed ? (
            <SafeAreaView edges={['bottom']} style={styles.closedContainer}>
              <View style={styles.closedBanner}>
                <Icon name="lock" size={20} color={Palette.onSurfaceVariant} />
                <DSText variant="bodySm" color={Palette.onSurfaceVariant} style={styles.closedText}>
                  Percakapan ditutup karena perjalanan telah selesai. Riwayat pesan tetap tersimpan sebagai arsip perjalanan.
                </DSText>
              </View>
            </SafeAreaView>
          ) : (
            <SafeAreaView edges={['bottom']}>
              <Composer
                value={draft}
                onChangeText={setDraft}
                onSend={handleSend}
                onQuickReply={setDraft}
                quickReplies={QuickReplies}
                placeholder={ComposerPlaceholder}
              />
            </SafeAreaView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.surfaceBright,
  },
  safeArea: {
    flex: 1,
  },
  closedContainer: {
    padding: Spacing.md,
    backgroundColor: Palette.surfaceContainerLow,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.surfaceContainerHighest,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.surfaceContainerHighest,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  closedText: {
    flex: 1,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  header: {
    height: Sizes.appBar,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.edgeMargin,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.surfaceContainerHighest,
    backgroundColor: Palette.surface,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  identityText: {
    flex: 1,
  },
  avatar: {
    width: Sizes.avatar,
    height: Sizes.avatar,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceContainer,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  /* Keeps the plate on one line instead of pushing the call button off the bar. */
  vehicle: {
    flexShrink: 1,
  },
  body: {
    flex: 1,
  },
  thread: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dateStamp: {
    alignSelf: 'center',
    marginVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.base,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceContainerLow,
  },
});