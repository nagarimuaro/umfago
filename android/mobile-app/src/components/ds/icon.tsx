import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Palette } from '@/constants/design-system';

/**
 * The Stitch design uses Material Symbols Outlined. React Native ships Material
 * Icons through `@expo/vector-icons`, whose glyph names are the same identifiers
 * in kebab-case. This wrapper keeps call sites reading like the design markup.
 */
export type IconName = keyof typeof MaterialIcons.glyphMap;

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 24, color = Palette.onSurface }: IconProps) {
  return <MaterialIcons name={name} size={size} color={color} />;
}
