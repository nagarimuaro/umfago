import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { Opacity, Palette, Radius, Sizes, Spacing, Typography } from '@/constants/design-system';

type Props = {
  value: string;
  onChangeText: (next: string) => void;
  onSend: () => void;
  /** Fills the field with a canned reply instead of sending it, so the text stays editable. */
  onQuickReply: (reply: string) => void;
  quickReplies: readonly string[];
  placeholder: string;
};

/** Quick-reply chips plus the message field and send button at the foot of a thread. */
export function Composer({
  value,
  onChangeText,
  onSend,
  onQuickReply,
  quickReplies,
  placeholder,
}: Props) {
  const canSend = value.trim().length > 0;

  return (
    <View style={styles.footer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}>
        {quickReplies.map((reply) => (
          <Pressable
            key={reply}
            accessibilityRole="button"
            accessibilityLabel={reply}
            onPress={() => onQuickReply(reply)}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
            <DSText variant="labelSm">{reply}</DSText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <View style={styles.field}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={Palette.onSurfaceVariant}
            multiline
            style={styles.input}
            accessibilityLabel={placeholder}
            onSubmitEditing={onSend}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={onSend}
          style={({ pressed }) => [
            styles.send,
            !canSend && styles.sendDisabled,
            pressed && styles.pressed,
          ]}>
          <Icon name="send" size={Sizes.iconLg} color={Palette.onPrimaryContainer} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.surfaceContainerHighest,
    backgroundColor: Palette.surface,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.outlineVariant,
    backgroundColor: Palette.surfaceContainerLowest,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  field: {
    flex: 1,
    justifyContent: 'center',
    minHeight: Sizes.composerAction,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.surfaceContainerHighest,
    backgroundColor: Palette.surfaceContainerLow,
  },
  input: {
    ...Typography.bodyMd,
    color: Palette.onSurface,
    paddingVertical: Spacing.sm,
  },
  send: {
    width: Sizes.composerAction,
    height: Sizes.composerAction,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primaryContainer,
  },
  /** Dimmed rather than recoloured, so an empty field still shows where send will be. */
  sendDisabled: {
    opacity: Opacity.dimmed,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
});