import { StyleSheet, Text, type TextProps } from 'react-native';

import { Palette, Typography, type TypographyVariant } from '@/constants/design-system';

export type DSTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: string;
};

/** Text bound to the OpenJek typography scale. Defaults to body-md on-surface. */
export function DSText({ variant = 'bodyMd', color, style, ...rest }: DSTextProps) {
  return <Text style={[Typography[variant], { color: color ?? Palette.onSurface }, style]} {...rest} />;
}

export const textStyles = StyleSheet.create({});
