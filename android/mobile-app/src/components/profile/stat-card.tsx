import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { Accent, Palette, Radius, Sizes, Spacing } from '@/constants/design-system';
import type { ProfileStat } from '@/constants/profile';

type Props = {
  stat: ProfileStat;
};

const discFills: Record<ProfileStat['tone'], string> = {
  tertiary: Palette.tertiaryContainer,
  gold: Accent.goldContainer,
};

const discGlyphs: Record<ProfileStat['tone'], string> = {
  tertiary: Palette.onTertiaryContainer,
  gold: Accent.gold,
};

/** One half of the profile screen's two-up stats row. */
export function StatCard({ stat }: Props) {
  return (
    <Card elevation="soft" padding="md" radius="lg" style={styles.card}>
      <View style={[styles.disc, { backgroundColor: discFills[stat.tone] }]}>
        <Icon name={stat.icon} size={Sizes.iconLg} color={discGlyphs[stat.tone]} />
      </View>
      <View style={styles.text}>
        <DSText variant="bodyXs" color={Palette.onSurfaceVariant}>
          {stat.label}
        </DSText>
        <DSText variant="headlineMd">{stat.value}</DSText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderColor: Palette.surfaceContainer,
  },
  disc: {
    width: Sizes.avatar,
    height: Sizes.avatar,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Lets a long value shrink instead of pushing the card past its column. */
  text: {
    flexShrink: 1,
  },
});