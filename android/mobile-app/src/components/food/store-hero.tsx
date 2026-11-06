import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/ds/icon-button';
import { Overlay, Palette, ShadowMd, Sizes, Spacing } from '@/constants/design-system';

export type StoreHeroProps = {
  image: string;
  onBack: () => void;
  /** Announced by the search button, which the design draws but nothing implements yet. */
  searchLabel: string;
};

/**
 * The store's hero photo with the two buttons that float over its corners.
 *
 * Search keeps the design's treatment but is disabled: there is no way to search inside a
 * menu yet, so it announces that rather than implying an action that cannot happen. Both
 * buttons scroll away with the photo, exactly as the design has them.
 */
export function StoreHero({ image, onBack, searchLabel }: StoreHeroProps) {
  return (
    <View style={styles.hero}>
      <Image
        source={{ uri: image }}
        style={styles.photo}
        contentFit="cover"
        transition={200}
        accessibilityIgnoresInvertColors
      />

      {/* Absolute is required here: the design floats both buttons over the photo. */}
      <IconButton
        icon="arrow-back"
        accessibilityLabel="Back"
        onPress={onBack}
        box={Sizes.heroAction}
        background={Overlay.onHeroSurface}
        style={styles.back}
      />

      <IconButton
        icon="search"
        accessibilityLabel={searchLabel}
        box={Sizes.heroAction}
        background={Overlay.onHeroSurface}
        disabled
        style={styles.search}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: Sizes.storeHero,
    backgroundColor: Palette.surfaceContainer,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  /* Absolute is required here: the buttons overlay the hero photo, as in the design. */
  back: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    ...ShadowMd,
  },
  search: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    ...ShadowMd,
  },
});
