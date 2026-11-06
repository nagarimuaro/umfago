import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { MapBackdrop as MapAsset } from '@/constants/booking-content';
import { Overlay, Sizes } from '@/constants/design-system';

/**
 * Static map still behind the booking sheet. The design ships an image rather than a
 * live map, so this stays an image until a maps SDK is wired in; swapping it out later
 * means replacing this component's body only.
 */
export function MapBackdrop() {
  return (
    <View style={styles.map} pointerEvents="none">
      <Image
        source={MapAsset.uri}
        alt={MapAsset.alt}
        accessibilityLabel={MapAsset.alt}
        style={styles.image}
        contentFit="cover"
      />
      {/* Darkens the top strip so the floating back button stays legible. */}
      <LinearGradient
        colors={[Overlay.mapScrim, 'transparent']}
        style={styles.scrim}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Sizes.mapBackdrop,
  },
  image: {
    flex: 1,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Sizes.mapScrim,
  },
});
