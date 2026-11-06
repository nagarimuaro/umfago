import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Icon, type IconName } from '@/components/ds/icon';
import { Opacity, Palette, Radius, ShadowSoft, Sizes, Spacing } from '@/constants/design-system';
import type { ChatThread, ChatThreadKind } from '@/types/chat';

type Props = {
  thread: ChatThread;
  /** Suppresses the hairline under the last row of the list. */
  isLast?: boolean;
  onPress?: () => void;
};

/** Glyph tiles stand in for the threads that have no photo to show. */
const tileGlyphs: Record<Exclude<ChatThreadKind, 'driver'>, IconName> = {
  merchant: 'restaurant',
  support: 'support-agent',
};

function ThreadAvatar({ thread }: { thread: ChatThread }) {
  if (thread.kind === 'driver' && thread.driver) {
    return (
      <Image
        source={{ uri: thread.driver.photo }}
        style={styles.photo}
        contentFit="cover"
        transition={200}
        accessibilityIgnoresInvertColors
      />
    );
  }

  const merchant = thread.kind === 'merchant';

  return (
    <View style={[styles.tile, merchant ? styles.tileMerchant : styles.tileSupport]}>
      <Icon
        name={tileGlyphs[merchant ? 'merchant' : 'support']}
        size={Sizes.iconLg}
        color={merchant ? Palette.onSecondaryContainer : Palette.onSurfaceVariant}
      />
    </View>
  );
}

/**
 * One thread on the chat list.
 *
 * An unread thread draws its preview in the emphasised weight and its timestamp in the
 * primary colour, which is how the design separates it from a thread already read.
 */
export function ThreadRow({ thread, isLast = false, onPress }: Props) {
  const unread = thread.unreadCount > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${thread.title}. ${thread.preview}`}
      accessibilityHint={unread ? `${thread.unreadCount} unread` : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.divider,
        thread.archived && styles.archived,
        pressed && styles.pressed,
      ]}>
      <ThreadAvatar thread={thread} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <DSText variant="headlineBase" numberOfLines={1} style={styles.title}>
            {thread.title}
          </DSText>
          <DSText
            variant="labelSm"
            color={unread ? Palette.primary : Palette.onSurfaceVariant}
            style={styles.time}>
            {thread.timeLabel}
          </DSText>
        </View>
        <DSText
          variant={unread ? 'bodyMdSemi' : 'bodyMd'}
          color={unread ? Palette.onSurface : Palette.onSurfaceVariant}
          numberOfLines={1}>
          {thread.preview}
        </DSText>
      </View>

      {unread ? (
        <View style={styles.badge}>
          <DSText variant="labelSm" color={Palette.onPrimaryContainer}>
            {thread.unreadCount}
          </DSText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Palette.surfaceContainerLowest,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.surfaceVariant,
  },
  archived: {
    opacity: Opacity.dimmed,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
  photo: {
    width: Sizes.avatarMd,
    height: Sizes.avatarMd,
    borderRadius: Radius.full,
    borderWidth: Sizes.avatarRing,
    borderColor: Palette.primaryContainer,
    backgroundColor: Palette.surfaceContainer,
    ...ShadowSoft,
  },
  tile: {
    width: Sizes.avatarMd,
    height: Sizes.avatarMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileMerchant: {
    borderRadius: Radius.base,
    backgroundColor: Palette.secondaryContainer,
  },
  tileSupport: {
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceContainerHigh,
  },
  /* `min-w-0` in the markup: lets both text lines truncate instead of pushing the badge. */
  body: {
    flex: 1,
    minWidth: 0,
    marginLeft: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  title: {
    flexShrink: 1,
  },
  time: {
    marginLeft: Spacing.xs,
  },
  badge: {
    width: Sizes.badge,
    height: Sizes.badge,
    marginLeft: Spacing.sm,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primaryContainer,
  },
});