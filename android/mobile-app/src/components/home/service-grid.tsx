import { Pressable, StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { Opacity, Palette, Radius, ShadowSoft, Sizes, Spacing } from '@/constants/design-system';
import { HomeServices, type HomeService } from '@/constants/home-content';

const Columns = 4;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function ServiceTile({ service, onPress }: { service: HomeService; onPress?: () => void }) {
  const fg = service.muted ? Palette.secondary : Palette.onSurface;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={service.label}
      onPress={onPress}
      style={({ pressed }) => [styles.tileWrap, pressed && styles.pressed]}>
      <View style={[styles.tile, service.muted && styles.tileMuted]}>
        {service.accent ? <View style={styles.accent} /> : null}
        <Icon name={service.icon} size={Sizes.iconXl} color={fg} />
      </View>
      <DSText variant="labelSm" color={fg}>
        {service.label}
      </DSText>
    </Pressable>
  );
}

export function ServiceGrid({ onSelect }: { onSelect?: (service: HomeService) => void }) {
  const rows = chunk(HomeServices, Columns);

  return (
    <View style={styles.grid}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((service) => (
            <ServiceTile key={service.id} service={service} onPress={() => onSelect?.(service)} />
          ))}
          {/* Keep a short last row on the same 4-column rhythm. */}
          {row.length < Columns
            ? Array.from({ length: Columns - row.length }, (_, i) => (
                <View key={`spacer-${i}`} style={styles.tileWrap} />
              ))
            : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  tileWrap: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tile: {
    width: Sizes.tile,
    height: Sizes.tile,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...ShadowSoft,
  },
  tileMuted: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.surfaceVariant,
  },
  accent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: Sizes.tileAccent,
    height: Sizes.tileAccent,
    backgroundColor: Palette.error,
    borderBottomLeftRadius: Radius.base,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
});
