import { StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { IconButton } from '@/components/ds/icon-button';
import { FontFamily, Palette, Sizes, Spacing } from '@/constants/design-system';

export function TopAppBar({ onSearch, onAvatar }: { onSearch?: () => void; onAvatar?: () => void }) {
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <IconButton
          icon="person"
          accessibilityLabel="Akun saya"
          onPress={onAvatar}
          box={Sizes.avatar}
          size={Sizes.iconMd}
          color={Palette.secondary}
          background={Palette.surfaceVariant}
          style={styles.avatar}
        />
        {/* `font-bold` in the markup overrides the headline-md 600 weight. */}
        <DSText variant="headlineMd" color={Palette.primary} style={styles.wordmark}>
          OpenJek
        </DSText>
      </View>

      <IconButton
        icon="search"
        accessibilityLabel="Cari"
        onPress={onSearch}
        size={Sizes.iconLg}
        color={Palette.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: Sizes.appBar,
    paddingHorizontal: Spacing.edgeMargin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.outlineVariant,
  },
  wordmark: {
    fontFamily: FontFamily.headline,
    letterSpacing: -0.5,
  },
});
