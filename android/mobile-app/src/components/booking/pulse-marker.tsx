import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ds/icon';
import { Overlay, Palette, Radius, Sizes } from '@/constants/design-system';

/** One full cycle of the outer ping, `animate-[ping_3s_...]`. */
const PingDurationMs = 3000;
/** The middle disc's `animate-pulse`, which Tailwind runs at 2s. */
const PulseDurationMs = 2000;

/**
 * The passenger's location while a driver is being found: a lime core marker with two
 * concentric discs behind it — an outer ping that scales out and fades, and a middle
 * disc that breathes. Purely decorative, so it never takes touches.
 */
export function PulseMarker() {
  const ping = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pingAnim = Animated.loop(
      Animated.timing(ping, {
        toValue: 1,
        duration: PingDurationMs,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: PulseDurationMs / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: PulseDurationMs / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pingAnim.start();
    pulseAnim.start();

    return () => {
      pingAnim.stop();
      pulseAnim.stop();
    };
  }, [ping, pulse]);

  const pingScale = ping.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.0] });
  const pingOpacity = ping.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.0] });

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View
        style={[
          styles.ping,
          {
            transform: [{ scale: pingScale }],
            opacity: pingOpacity,
          },
        ]}
      />
      <Animated.View style={[styles.pulse, { opacity: pulseOpacity }]} />

      <View style={styles.core}>
        <Icon name="person" size={Sizes.iconBase} color={Palette.onPrimary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ping: {
    position: 'absolute',
    width: Sizes.mapPing,
    height: Sizes.mapPing,
    borderRadius: Radius.full,
    backgroundColor: Overlay.primarySoft,
  },
  pulse: {
    position: 'absolute',
    width: Sizes.mapPulse,
    height: Sizes.mapPulse,
    borderRadius: Radius.full,
    backgroundColor: Overlay.primarySoft,
  },
  core: {
    width: Sizes.mapMarker,
    height: Sizes.mapMarker,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    borderWidth: Sizes.mapMarkerRing,
    borderColor: Palette.surface,
  },
});
