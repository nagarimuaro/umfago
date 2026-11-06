import { StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { Accent, Radius, Sizes, Spacing } from '@/constants/design-system';

type Props = {
  label: string;
};

/**
 * Membership tier chip under the profile name.
 *
 * Kept separate from the shared `Pill`: this badge is drawn with a hairline stroke over
 * an amber fill, and `Pill` expresses neither a border nor a gold tone.
 */
export function MembershipBadge({ label }: Props) {
  return (
    <View style={styles.badge}>
      <Icon name="star" size={Sizes.iconSm} color={Accent.gold} />
      <DSText variant="labelSm" color={Accent.gold}>
        {label}
      </DSText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.base,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Accent.goldStroke,
    backgroundColor: Accent.goldContainer,
  },
});