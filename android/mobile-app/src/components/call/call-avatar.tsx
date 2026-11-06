import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Palette, Radius, ShadowDeep, Sizes } from '@/constants/design-system';

/** `animation: pulse-ring 2s ... infinite`, on both rings. */
const RingDurationMs = 2000;
/** The trailing ring's `animation-delay: 0.5s`. */
const RingDelayMs = 500;
/** The keyframes' `cubic-bezier(0.215, 0.61, 0.355, 1)`. */
const RingEasing = Easing.bezier(0.215, 0.61, 0.355, 1);
/** `pulse-ring` reaches `scale(1.5)` and full transparency at its 70% keyframe. */
const RingFadeEnd = 0.7;
const RingGrowth = 0.5;
/** The 0% keyframe's `opacity: 0.5`. */
const RingOpacity = 0.5;

/**
 * `pulse-ring` grows and fades over its first 70%, then holds at `opacity: 0` while it
 * snaps back to `scale(1)`. That tail is invisible, so only the growth phase is animated
 * here and the rest of the cycle is spent fully transparent.
 */
function ringStyle(progress: number) {
  'worklet';
  const grow = Math.min(progress, RingFadeEnd) / RingFadeEnd;

  return {
    transform: [{ scale: 1 + grow * RingGrowth }],
    opacity: progress < RingFadeEnd ? RingOpacity * (1 - grow) : 0,
  };
}

type CallAvatarProps = {
  /** Omitted for threads with no driver attached, e.g. merchant or support. */
  photo?: string;
  /** Announced in place of the portrait, which carries no information of its own. */
  name: string;
};

/**
 * The callee's portrait while a call rings: a 128pt round photo behind two lime rings
 * that expand out of it and fade, the second offset a quarter-cycle behind the first.
 * The rings are decorative, so they never take touches.
 */
export function CallAvatar({ photo, name }: CallAvatarProps) {
  const lead = useSharedValue(0);
  const trail = useSharedValue(0);

  useEffect(() => {
    const cycle = () =>
      withRepeat(withTiming(1, { duration: RingDurationMs, easing: RingEasing }), -1, false);

    lead.value = cycle();
    trail.value = withDelay(RingDelayMs, cycle());
  }, [lead, trail]);

  const leadStyle = useAnimatedStyle(() => ringStyle(lead.value));
  const trailStyle = useAnimatedStyle(() => ringStyle(trail.value));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.ring, leadStyle]} pointerEvents="none" />
      <Animated.View style={[styles.ring, trailStyle]} pointerEvents="none" />

      <Image
        source={photo ? { uri: photo } : undefined}
        style={styles.photo}
        contentFit="cover"
        transition={200}
        accessibilityLabel={name}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: Sizes.avatarXl,
    height: Sizes.avatarXl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Palette.primaryContainer,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.full,
    borderWidth: Sizes.avatarRingLg,
    borderColor: Palette.surface,
    backgroundColor: Palette.surface,
    ...ShadowDeep,
  },
});
