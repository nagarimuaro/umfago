import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThreadRow } from '@/components/chat/thread-row';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import { ChatArchiveNote, ChatThreads } from '@/constants/chat';
import { Palette, Radius, Sizes, Spacing, Typography } from '@/constants/design-system';

const SearchPlaceholder = 'Search chats...';

export default function ChatScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const threads = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return ChatThreads;

    return ChatThreads.filter(
      (thread) =>
        thread.title.toLowerCase().includes(needle) || thread.preview.toLowerCase().includes(needle),
    );
  }, [query]);

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
            style={styles.searchInput}
          />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.list}>
            {threads.map((thread, index) => (
              <ThreadRow
                key={thread.id}
                thread={thread}
                isLast={index === threads.length - 1}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: thread.id } })}
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
    borderRadius: Radius.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.surfaceVariant,
    backgroundColor: Palette.surfaceContainer,
  },
  content: {
    paddingBottom: Spacing.xl,
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