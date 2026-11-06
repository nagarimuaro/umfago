import { StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { BookingCopy } from '@/constants/booking-content';
import { Neutral, Palette, Radius, Sizes, Spacing } from '@/constants/design-system';

export type RouteStop = {
  /** Short place name, e.g. "Grand Indonesia Mall". */
  name: string;
  /** Full address line under the name. Truncated to one line. */
  detail?: string | null;
};

export type RouteDetailsProps = {
  pickup: RouteStop;
  destination: RouteStop;
};

/**
 * Read-only route recap on the finding-driver sheet. Unlike `RouteTimeline` on the
 * confirm screen, each stop carries a secondary address line and the destination node is
 * a filled pin rather than a square — matching the finding-driver design.
 */
export function RouteDetails({ pickup, destination }: RouteDetailsProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.connector} />

      <View style={styles.stop}>
        <View style={styles.pickupNode}>
          <View style={styles.pickupCore} />
        </View>

        <View style={styles.text}>
          <DSText variant="overline" color={Palette.secondary} style={styles.label}>
            {BookingCopy.pickupLabel.toUpperCase()}
          </DSText>
          <DSText variant="headlineSm" color={Neutral.gray900}>
            {pickup.name}
          </DSText>
          {pickup.detail ? (
            <DSText variant="bodySm" color={Palette.secondary} numberOfLines={1}>
              {pickup.detail}
            </DSText>
          ) : null}
        </View>
      </View>

      <View style={styles.stop}>
        <View style={styles.destinationNode}>
          <Icon name="location-on" size={Sizes.iconXs} color={Palette.onPrimary} />
        </View>

        <View style={styles.text}>
          <DSText variant="overline" color={Palette.secondary} style={styles.label}>
            {BookingCopy.destinationLabel.toUpperCase()}
          </DSText>
          <DSText variant="headlineSm" color={Neutral.gray900}>
            {destination.name}
          </DSText>
          {destination.detail ? (
            <DSText variant="bodySm" color={Palette.secondary} numberOfLines={1}>
              {destination.detail}
            </DSText>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.stack,
    paddingHorizontal: Spacing.xs,
  },
  /** `absolute left-[15px] top-6 bottom-6 w-[2px]` — centred under both nodes. */
  connector: {
    position: 'absolute',
    left: Spacing.xs + (Sizes.routeNode - Spacing.hair) / 2,
    top: Sizes.routeNode,
    bottom: Sizes.routeNode,
    width: Spacing.hair,
    backgroundColor: Palette.surfaceVariant,
  },
  stop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  pickupNode: {
    width: Sizes.routeNode,
    height: Sizes.routeNode,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    borderWidth: Sizes.timelineRing,
    borderColor: Palette.primary,
  },
  pickupCore: {
    width: Spacing.tight,
    height: Spacing.tight,
    borderRadius: Radius.full,
    backgroundColor: Palette.primary,
  },
  destinationNode: {
    width: Sizes.routeNode,
    height: Sizes.routeNode,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
  },
  text: {
    flex: 1,
  },
  label: {
    marginBottom: Spacing.hair,
  },
});
