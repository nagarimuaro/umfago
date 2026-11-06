import { StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { IconButton } from '@/components/ds/icon-button';
import { FontFamily, Palette, Sizes, Spacing } from '@/constants/design-system';

export type CheckoutAppBarProps = {
  title: string;
  onBack: () => void;
};

/**
 * The checkout screen's top bar: a back button, a centred title, and a hairline rule.
 *
 * The design centres the title over the whole bar rather than in the space left by the
 * back button, so the text is absolutely positioned and a spacer the width of the button
 * balances the row. It is not shared with the select-address bar, which the design draws
 * transparent over the map with a left-aligned title.
 */
export function CheckoutAppBar({ title, onBack }: CheckoutAppBarProps) {
  return (
    <View style={styles.bar}>
      <IconButton
        icon="arrow-back"
        accessibilityLabel="Go back"
        onPress={onBack}
        box={Sizes.avatar}
        color={Palette.onSurface}
        style={styles.back}
      />

      {/* Absolute is required here: the design centres the title on the bar, not on the gap. */}
      <View style={styles.titleWrap} pointerEvents="none">
        <DSText variant="headlineMd" style={styles.title}>
          {title}
        </DSText>
      </View>

      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: Sizes.appBar,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.edgeMargin,
    backgroundColor: Palette.surfaceContainerLowest,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.surfaceVariant,
  },
  /* `-ml-2` pulls the button's padding back to the edge margin. */
  back: {
    marginLeft: -Spacing.xs,
  },
  titleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* `font-bold` in the markup overrides the headline-md 600 weight. */
  title: {
    fontFamily: FontFamily.headline,
  },
  spacer: {
    width: Sizes.avatar,
  },
});
