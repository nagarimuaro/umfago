import { StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Brand, Palette, Radius, ShadowSoft, Spacing } from '@/constants/design-system';
import type { ChatMessage } from '@/types/chat';

type Props = {
  message: ChatMessage;
};

/**
 * One chat bubble with its timestamp underneath.
 *
 * The design only draws received messages. The sent variant mirrors it: same geometry,
 * flipped corner and side, filled with the primary container so the two directions read
 * apart at a glance.
 */
export function MessageBubble({ message }: Props) {
  const mine = message.author === 'me';

  return (
    <View style={mine ? styles.columnMine : styles.column}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <DSText variant="bodyMd" color={mine ? Brand.ctaOnAction : Palette.onSurface}>
          {message.text}
        </DSText>
      </View>
      <DSText variant="timestamp" color={Palette.onSurfaceVariant} style={styles.time}>
        {message.timeLabel}
      </DSText>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'flex-start',
    maxWidth: '80%',
  },
  columnMine: {
    alignItems: 'flex-end',
    maxWidth: '80%',
    alignSelf: 'flex-end',
  },
  bubble: {
    padding: Spacing.sm,
    borderRadius: Radius.base,
    borderWidth: StyleSheet.hairlineWidth,
    ...ShadowSoft,
  },
  /** The tucked corner points at the speaker, `rounded-tl-sm` in the markup. */
  bubbleTheirs: {
    borderTopLeftRadius: Radius.sm,
    backgroundColor: Palette.surfaceContainer,
    borderColor: Palette.surfaceContainerHighest,
  },
  bubbleMine: {
    borderTopRightRadius: Radius.sm,
    backgroundColor: Palette.primaryContainer,
    borderColor: Palette.primaryContainer,
  },
  time: {
    marginTop: Spacing.base,
    marginHorizontal: Spacing.base,
  },
});