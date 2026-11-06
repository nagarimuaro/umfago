import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/ds/icon';
import {
  FontFamily,
  Overlay,
  Palette,
  Radius,
  ShadowXs,
  Sizes,
  Spacing,
  Typography,
} from '@/constants/design-system';

export type AddressSearchProps = {
  placeholder: string;
};

/**
 * The address search field on the select-address sheet.
 *
 * It looks like `SearchField` but cannot reuse it: that component is a read-only
 * `Pressable` that opens another screen, whereas the design here ships a real `<input>`
 * the user types into, at a taller height and a wider radius. The field owns its own text
 * — the design's own script never reads it, so nothing downstream filters on what is typed.
 */
export function AddressSearch({ placeholder }: AddressSearchProps) {
  const [query, setQuery] = useState('');

  return (
    <View style={styles.field}>
      {/* Absolute is required here: the glyph sits inside the input's left padding. */}
      <View style={styles.leading}>
        <Icon name="search" size={Sizes.iconLg} color={Palette.onSurfaceVariant} />
      </View>

      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={Overlay.onSurfaceVariantMuted}
        value={query}
        onChangeText={setQuery}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    justifyContent: 'center',
  },
  /* Absolute is required here: `left-4 top-1/2 -translate-y-1/2` pins the glyph. */
  leading: {
    position: 'absolute',
    left: Spacing.md,
    zIndex: 1,
  },
  /* `h-14 pl-12 pr-4 rounded-lg border` with the glyph occupying the left inset. */
  input: {
    height: Sizes.searchHeightTall,
    paddingLeft: Sizes.iconLg + Spacing.md * 2,
    paddingRight: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.surfaceVariant,
    backgroundColor: Palette.surfaceContainerLow,
    color: Palette.onSurface,
    fontFamily: FontFamily.body,
    fontSize: Typography.bodyLg.fontSize,
    ...ShadowXs,
  },
});
