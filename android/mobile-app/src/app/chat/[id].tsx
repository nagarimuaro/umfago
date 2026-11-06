import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Composer } from '@/components/chat/composer';
import { MessageBubble } from '@/components/chat/message-bubble';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import { ChatDateStamp, QuickReplies, threadById } from '@/constants/chat';
import { Accent, Palette, Radius, Sizes, Spacing } from '@/constants/design-system';
import type { ChatMessage } from '@/types/chat';

const ComposerPlaceholder = 'Type a message...';

export default function ChatThreadScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const thread = useMemo(() => threadById(id), [id]);

  const [draft, setDraft] = useState('');
  /**
   * Sent messages live in screen state only. There is no messaging backend yet, so they
   * are appended locally and lost on unmount rather than written into the shared sample
   * content, which every other screen also reads.
   */
  const [sent, setSent] = useState<readonly ChatMessage[]>([]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;

    setSent((current) => [
      ...current,
      { id: `local-${current.length + 1}`, author: 'me', text, timeLabel: 'Just now' },
    ]);
    setDraft('');
  };

  if (!thread) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.missing}>
          <DSText variant="bodyMd" color={Palette.onSurfaceVariant}>
            This conversation is no longer available.
          </DSText>
        </SafeAreaView>
      </View>
    );
  }

  const driver = thread.driver;
  const messages = [...thread.messages, ...sent];

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
                  {driver?.name ?? thread.title}
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
            accessibilityLabel={`Call ${driver?.name ?? thread.title}`}
            color={Palette.primary}
            background={Palette.surfaceContainerLow}
            onPress={() => router.push({ pathname: '/call/[id]', params: { id: thread.id } })}
          />
        </View>

        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
            <View style={styles.dateStamp}>
              <DSText variant="labelSm" color={Palette.onSurfaceVariant}>
                {ChatDateStamp}
              </DSText>
            </View>

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </ScrollView>

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