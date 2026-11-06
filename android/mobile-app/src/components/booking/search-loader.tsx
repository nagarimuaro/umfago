import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ds/icon';
import { Opacity, Palette, Radius, Sizes } from '@/constants/design-system';

/** One full revolution of the arc. */
const SpinDurationMs = 1200;

export type SearchLoaderProps = {
  /** Glyph centred in the loader, tinted with `on-primary-container`. */
  icon?: IconName;
};

/**
 * Circular loader on the finding-driver sheet: a spinning arc around a filled disc.
 */
export function SearchLoader({ icon = 'search' }: SearchLoaderProps) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: SpinDurationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinAnim.start();
    return () => {
      spinAnim.stop();
    };
  }, [spin]);

  const spinRotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.track} />
      <Animated.View
        style={[
          styles.arc,
          {
            transform: [{ rotate: spinRotation }],
          },
        ]}
      />

      <View style={styles.core}>
        <Icon name={icon} size={Sizes.iconBase} color={Palette.onPrimaryContainer} />
      </View>
    </View>
  );
}

/** Track and arc share every box property; only their border colors differ. */
const ring = {
  position: 'absolute',
  width: Sizes.loader,
  height: Sizes.loader,
  borderRadius: Radius.full,
  borderWidth: Sizes.loaderStroke,
} as const;

const styles = StyleSheet.create({
  wrap: {
    width: Sizes.loader,
    height: Sizes.loader,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    ...ring,
    borderColor: Palette.surfaceVariant,
    opacity: Opacity.watermark,
  },
  arc: {
    ...ring,
    borderColor: 'transparent',
    borderTopColor: Palette.primary,
    borderRightColor: Palette.primary,
  },
  core: {
    width: Sizes.loaderCore,
    height: Sizes.loaderCore,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primaryContainer,
  },
});
