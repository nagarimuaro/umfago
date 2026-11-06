import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { FoodAddressCopy } from '@/constants/food-address';
import {
  Overlay,
  Palette,
  Radius,
  ShadowMd,
  ShadowRaised,
  Sizes,
  Spacing,
} from '@/constants/design-system';

/** Tailwind runs both `animate-bounce` and `animate-ping` at one second per cycle. */
const BounceDurationMs = 1000;
const PingDurationMs = 1000;

/** `animate-bounce` lifts the element by a quarter of its own height. */
const BounceTravel = Sizes.mapPinHead / 4;

/** `animate-ping` scales the ring to twice its size while fading it out. */
const PingScale = 2;

/**
 * The pin marking the point being picked on the select-address map: a lime head that
 * bounces, a ring pinging out behind it, a tooltip above, and a ground shadow that stays
 * put while the head moves.
 *
 * The whole thing is decorative — the map is a still image, so nothing here takes touches.
 */
export function AddressMapPin() {
  const bounce = useSharedValue(0);
  const ping = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(
      withTiming(1, { duration: BounceDurationMs, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    ping.value = withRepeat(
      withTiming(1, { duration: PingDurationMs, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
  }, [bounce, ping]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -bounce.value * BounceTravel }],
  }));

  const pingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ping.value * (PingScale - 1) }],
    opacity: 1 - ping.value,
  }));

  return (
    <View style={styles.stack} pointerEvents="none">
      <View style={styles.tooltip}>
        <DSText variant="labelBase" color={Palette.inverseOnSurface}>
          {FoodAddressCopy.pinTooltip}
        </DSText>

        {/* Absolute is required here: the arrow hangs off the bubble's bottom edge. */}
        <View style={styles.arrowSlot}>
          <View style={styles.arrow} />
        </View>
      </View>

      <Animated.View style={[styles.pin, bounceStyle]}>
        <Animated.View style={[styles.ping, pingStyle]} />

        {/* Drawn before the head so the head paints over the four points they share. */}
        <View style={styles.tailSlot}>
          <View style={styles.tail} />
        </View>

        <View style={styles.head}>
          <Icon name="location-on" size={Sizes.iconLg} color={Palette.onPrimaryContainer} />
        </View>
      </Animated.View>

      <View style={styles.ground} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignItems: 'center',
  },
  /* `mb-8` between the bubble and the pin below it. */
  tooltip: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.lg,
    backgroundColor: Palette.inverseSurface,
    ...ShadowMd,
  },
  /* Absolute is required here: `-bottom-1` hangs the arrow below the bubble. */
  arrowSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -Spacing.base,
    alignItems: 'center',
  },
  /* A square turned 45 degrees, the way the markup draws it — not a border triangle. */
  arrow: {
    width: Sizes.tooltipArrowWidth,
    height: Sizes.tooltipArrowHeight,
    backgroundColor: Palette.inverseSurface,
    transform: [{ rotate: '45deg' }],
  },
  /**
   * The tail is absolutely positioned, so it adds no height; the margin reserves the
   * `-bottom-3` it hangs by, keeping the ground shadow clear of it.
   */
  pin: {
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  /* Absolute is required here: `-inset-4` centres the ring on the head behind it. */
  ping: {
    position: 'absolute',
    width: Sizes.mapPinPulse,
    height: Sizes.mapPinPulse,
    borderRadius: Radius.full,
    backgroundColor: Overlay.primaryPulse,
  },
  /* Absolute is required here: `-bottom-3 left-1/2` points the tail at the map. */
  tailSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -Spacing.sm,
    alignItems: 'center',
  },
  /**
   * `border-l-[12px] border-r-[12px] border-t-[16px]` — a border triangle, so the width
   * token is one side and the visible point spans twice it.
   */
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: Sizes.mapPinTailWidth,
    borderRightWidth: Sizes.mapPinTailWidth,
    borderTopWidth: Sizes.mapPinTailHeight,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Palette.primaryContainer,
  },
  head: {
    width: Sizes.mapPinHead,
    height: Sizes.mapPinHead,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primaryContainer,
    borderWidth: Sizes.mapPinRing,
    borderColor: Palette.surfaceContainerLowest,
    ...ShadowRaised,
  },
  /**
   * `w-6 h-2 bg-black/20 rounded-[50%]` — the ellipse on the ground under the pin. The
   * export positions it against the full-screen overlay with `top-[60%]`, which does not
   * survive the port; it sits directly under the tail here, cleared by its `mt-2`.
   */
  ground: {
    marginTop: Spacing.xs,
    width: Sizes.mapPinShadowWidth,
    height: Sizes.mapPinShadowHeight,
    borderRadius: Radius.full,
    backgroundColor: Overlay.mapScrim,
  },
});
