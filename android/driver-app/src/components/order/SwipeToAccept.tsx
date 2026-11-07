import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  LayoutChangeEvent,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface SwipeToAcceptProps {
  onAccept: () => void;
  title?: string;
  disabled?: boolean;
}

const KNOB_SIZE = 52;
const PADDING = 4;

export const SwipeToAccept: React.FC<SwipeToAcceptProps> = ({
  onAccept,
  title = 'Geser untuk Terima Order',
  disabled = false,
}) => {
  const windowWidth = Dimensions.get('window').width;
  const initialTrackWidth = Math.max(260, windowWidth - 32);

  const [trackWidth, setTrackWidth] = useState<number>(initialTrackWidth);
  const trackWidthRef = useRef<number>(initialTrackWidth);
  const slideX = useRef(new Animated.Value(0)).current;
  const isAcceptedRef = useRef(false);

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const onAcceptRef = useRef(onAccept);
  onAcceptRef.current = onAccept;

  // Reset when disabled changes or modal remounts
  useEffect(() => {
    isAcceptedRef.current = false;
    slideX.setValue(0);
  }, [disabled]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current && !isAcceptedRef.current,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !disabledRef.current && !isAcceptedRef.current && Math.abs(gestureState.dx) > 2,
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          !disabledRef.current && !isAcceptedRef.current && Math.abs(gestureState.dx) > 2,
        onPanResponderGrant: () => {
          if (disabledRef.current || isAcceptedRef.current) return;
        },
        onPanResponderMove: (_, gestureState) => {
          if (disabledRef.current || isAcceptedRef.current) return;

          const max = Math.max(0, trackWidthRef.current - KNOB_SIZE - PADDING * 2);
          if (max <= 0) return;

          const nextX = Math.max(0, Math.min(gestureState.dx, max));
          slideX.setValue(nextX);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (disabledRef.current || isAcceptedRef.current) return;

          const max = Math.max(0, trackWidthRef.current - KNOB_SIZE - PADDING * 2);
          if (max <= 0) {
            slideX.setValue(0);
            return;
          }

          // Trigger acceptance if dragged past 58% or fast rightward swipe
          const reached =
            gestureState.dx >= max * 0.58 ||
            (gestureState.vx > 0.5 && gestureState.dx > 30);

          if (reached) {
            isAcceptedRef.current = true;
            Animated.timing(slideX, {
              toValue: max,
              duration: 120,
              useNativeDriver: false,
            }).start(() => {
              onAcceptRef.current?.();
            });
          } else {
            Animated.spring(slideX, {
              toValue: 0,
              friction: 6,
              tension: 50,
              useNativeDriver: false,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          if (!isAcceptedRef.current) {
            Animated.spring(slideX, {
              toValue: 0,
              friction: 6,
              tension: 50,
              useNativeDriver: false,
            }).start();
          }
        },
      }),
    [slideX]
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - trackWidthRef.current) > 2) {
      trackWidthRef.current = width;
      setTrackWidth(width);
    }
  };

  const currentMax = Math.max(1, trackWidth - KNOB_SIZE - PADDING * 2);

  const fillWidth = slideX.interpolate({
    inputRange: [0, currentMax],
    outputRange: [KNOB_SIZE + PADDING * 2, trackWidth || 320],
    extrapolate: 'clamp',
  });

  const textOpacity = slideX.interpolate({
    inputRange: [0, currentMax * 0.5],
    outputRange: [1, 0.05],
    extrapolate: 'clamp',
  });

  const chevronRotate = slideX.interpolate({
    inputRange: [0, currentMax],
    outputRange: ['0deg', '90deg'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Background Track with PanResponder attached */}
      <View
        {...panResponder.panHandlers}
        style={styles.track}
      >
        {/* Dynamic Neon Lime Fill as thumb slides */}
        <Animated.View style={[styles.activeFill, { width: fillWidth }]} pointerEvents="none" />

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
          style={[
            styles.knob,
            {
              transform: [{ translateX: slideX }],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }} pointerEvents="none">
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
    userSelect: 'none',
    cursor: 'pointer',
  },
  activeFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(200, 255, 0, 0.25)',
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
    cursor: 'pointer',
  },
});
