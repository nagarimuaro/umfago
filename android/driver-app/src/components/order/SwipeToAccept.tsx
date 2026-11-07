import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, rounded } from '../../constants/theme';

interface SwipeToAcceptProps {
  onAccept: () => void;
  title?: string;
  disabled?: boolean;
}

export const SwipeToAccept: React.FC<SwipeToAcceptProps> = ({
  onAccept,
  title = 'Geser untuk Terima Order',
  disabled = false,
}) => {
  const [trackWidth, setTrackWidth] = useState<number>(0);
  const slideX = useRef(new Animated.Value(0)).current;
  const isAcceptedRef = useRef(false);

  const KNOB_SIZE = 52;
  const PADDING = 4;
  const maxSlide = Math.max(0, trackWidth - KNOB_SIZE - PADDING * 2);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !isAcceptedRef.current,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !disabled && !isAcceptedRef.current && Math.abs(gestureState.dx) > 3,
      onPanResponderMove: (_, gestureState) => {
        if (disabled || isAcceptedRef.current) return;
        if (gestureState.dx <= 0) {
          slideX.setValue(0);
        } else if (gestureState.dx >= maxSlide) {
          slideX.setValue(maxSlide);
        } else {
          slideX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (disabled || isAcceptedRef.current) return;

        // Threshold to accept: 68% of track or fast flick to the right
        const reachedThreshold = gestureState.dx >= maxSlide * 0.68 || gestureState.vx > 0.65;

        if (reachedThreshold && maxSlide > 0) {
          isAcceptedRef.current = true;
          Animated.timing(slideX, {
            toValue: maxSlide,
            duration: 140,
            useNativeDriver: false,
          }).start(() => {
            onAccept();
          });
        } else {
          Animated.spring(slideX, {
            toValue: 0,
            friction: 7,
            tension: 50,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== trackWidth) {
      setTrackWidth(width);
    }
  };

  // Interpolations for interactive visual feedback
  const fillWidth = slideX.interpolate({
    inputRange: [0, Math.max(1, maxSlide)],
    outputRange: [KNOB_SIZE + PADDING * 2, trackWidth || 300],
    extrapolate: 'clamp',
  });

  const textOpacity = slideX.interpolate({
    inputRange: [0, Math.max(1, maxSlide * 0.5)],
    outputRange: [1, 0.05],
    extrapolate: 'clamp',
  });

  const chevronRotate = slideX.interpolate({
    inputRange: [0, Math.max(1, maxSlide)],
    outputRange: ['0deg', '90deg'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Background Track */}
      <View style={styles.track}>
        {/* Dynamic Neon Lime Fill as thumb slides */}
        <Animated.View style={[styles.activeFill, { width: fillWidth }]} />

        {/* Shimmering Center Prompt Text */}
        <Animated.View style={[styles.textContainer, { opacity: textOpacity }]} pointerEvents="none">
          <Text style={styles.trackText}>{title}</Text>
          <View style={styles.chevronGroup}>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.primary}
              style={{ marginLeft: -8, opacity: 0.7 }}
            />
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.primary}
              style={{ marginLeft: -8, opacity: 0.4 }}
            />
          </View>
        </Animated.View>

        {/* Draggable Neon Thumb Knob */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.knob,
            {
              transform: [{ translateX: slideX }],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons name="arrow-forward-sharp" size={24} color={colors.black} />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 62,
    justifyContent: 'center',
  },
  track: {
    height: 60,
    backgroundColor: '#1E2020',
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#303434',
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  activeFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(200, 255, 0, 0.22)',
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
  },
  textContainer: {
    position: 'absolute',
    left: 64,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trackText: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
  },
  chevronGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  knob: {
    position: 'absolute',
    left: 4,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
});
