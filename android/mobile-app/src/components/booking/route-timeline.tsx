import { StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { BookingCopy } from '@/constants/booking-content';
import {
  Brand,
  Neutral,
  Overlay,
  Palette,
  Radius,
  Sizes,
  Spacing,
} from '@/constants/design-system';

export type RouteTimelineProps = {
  pickup: string;
  destination: string;
  /** Routed distance badge, already formatted (e.g. "3,4 km"). Hidden when absent. */
  distance?: string | null;
};

/**
 * The design draws each node's ring with `shadow-[0_0_0_3px_...]`. React Native borders
 * are inset, so the ring is a slightly larger filled View sitting behind the node.
 */
function Node({ square = false }: { square?: boolean }) {
  const ring = Sizes.timelineNode + Sizes.timelineRing * 2;

  return (
    <View
      style={[
        styles.ring,
        {
          width: ring,
          height: ring,
          borderRadius: square ? Radius.tiny + Sizes.timelineRing : Radius.full,
          backgroundColor: square ? Overlay.ringInk : Overlay.primarySoft,
        },
      ]}>
      <View
        style={[
          styles.node,
          {
            borderRadius: square ? Radius.tiny : Radius.full,
            backgroundColor: square ? Brand.ink : Palette.primaryContainer,
          },
        ]}
      />
    </View>
  );
}

export function RouteTimeline({ pickup, destination, distance }: RouteTimelineProps) {
  return (
    <View style={styles.row}>
      <View style={styles.graphic}>
        <Node />
        {/*
          `w-0.5 h-10 bg-gray-200 border-l-2 border-dashed border-gray-300`. React Native
          only honours `borderStyle: 'dashed'` when the border is uniform on some
          Android builds, where this degrades to the solid gray-200 line underneath.
        */}
        <View style={styles.connector} />
        <Node square />
      </View>

      <View style={styles.stops}>
        <View>
          <DSText variant="overline" color={Neutral.gray500} style={styles.stopLabel}>
            {BookingCopy.pickupLabel.toUpperCase()}
          </DSText>
          <DSText variant="headlineSm" color={Neutral.gray900}>
            {pickup}
          </DSText>
        </View>

        <View style={styles.destination}>
          <View style={styles.destinationText}>
            <DSText variant="overline" color={Neutral.gray500} style={styles.stopLabel}>
              {BookingCopy.destinationLabel.toUpperCase()}
            </DSText>
            <DSText variant="headlineSm" color={Neutral.gray900}>
              {destination}
            </DSText>
          </View>

          {distance ? (
            <View style={styles.badge}>
              <DSText variant="labelSm" color={Neutral.gray700}>
                {distance}
              </DSText>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  graphic: {
    width: Sizes.timelineColumn,
    alignItems: 'center',
    marginTop: Spacing.base,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  node: {
    width: Sizes.timelineNode,
    height: Sizes.timelineNode,
  },
  connector: {
    width: Spacing.hair,
    height: Sizes.timelineConnector,
    marginVertical: Spacing.base,
    backgroundColor: Neutral.gray200,
    borderLeftWidth: Spacing.hair,
    borderLeftColor: Neutral.gray300,
    borderStyle: 'dashed',
  },
  stops: {
    flex: 1,
    gap: Spacing.stack,
  },
  stopLabel: {
    marginBottom: Spacing.hair,
  },
  destination: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  destinationText: {
    flex: 1,
  },
  badge: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.base,
    borderRadius: Radius.chip,
    backgroundColor: Neutral.gray100,
  },
});
