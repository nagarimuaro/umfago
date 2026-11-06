import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ds/icon';
import {
  Overlay,
  Palette,
  Radius,
  ShadowGlow,
  ShadowLifted,
  Sizes,
} from '@/constants/design-system';

/**
 * `subtle` is a toggle in its off state, `active` the same toggle switched on, and
 * `danger` the end-call button. Each tone carries its own box, glyph size and press
 * scale, so a call site picks the role and the design's measurements follow.
 */
export type CallControlTone = 'subtle' | 'active' | 'danger';

export type CallControlProps = {
  icon: IconName;
  /** Required: an icon-only control has no visible text to announce. */
  accessibilityLabel: string;
  tone?: CallControlTone;
  disabled?: boolean;
  onPress?: () => void;
};

const Box: Record<CallControlTone, number> = {
  subtle: Sizes.callControl,
  active: Sizes.callControl,
  danger: Sizes.callEnd,
};

const Glyph: Record<CallControlTone, number> = {
  subtle: Sizes.iconLg,
  active: Sizes.iconLg,
  danger: Sizes.iconXxl,
};

/** `active:scale-95` on the control row, `active:scale-90` on the end-call button. */
const PressScale: Record<CallControlTone, number> = {
  subtle: 0.95,
  active: 0.95,
  danger: 0.9,
};

const Foreground: Record<CallControlTone, string> = {
  subtle: Palette.onSecondary,
  active: Palette.onPrimaryContainer,
  danger: Palette.onError,
};

/**
 * A round control on the in-call screen.
 *
 * `IconButton` cannot express these: the design gives the toggles a hairline border it
 * has no prop for, and its `overflow: 'hidden'` would clip the active control's lime glow
 * and the end-call button's lift. `disabled` swaps the fill rather than only dimming,
 * because the design draws the unavailable video control at `bg-surface/5`.
 */
export function CallControl({
  icon,
  accessibilityLabel,
  tone = 'subtle',
  disabled = false,
  onPress,
}: CallControlProps) {
  const isToggle = tone !== 'danger';
  const box = Box[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: isToggle ? tone === 'active' : undefined }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { width: box, height: box },
        toneStyles[tone],
        disabled && styles.disabled,
        pressed && { transform: [{ scale: PressScale[tone] }] },
      ]}>
      <Icon
        name={icon}
        size={Glyph[tone]}
        color={disabled ? Overlay.onSecondaryDisabled : Foreground[tone]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  /** `bg-surface/5 border-surface/10` — the video control, which has no destination yet. */
  disabled: {
    backgroundColor: Overlay.onSecondaryFaint,
    borderColor: Overlay.onSecondarySubtle,
  },
});

const toneStyles = StyleSheet.create({
  subtle: {
    backgroundColor: Overlay.onSecondarySubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Overlay.onSecondaryStroke,
  },
  active: {
    backgroundColor: Palette.primaryContainer,
    ...ShadowGlow,
  },
  danger: {
    backgroundColor: Palette.error,
    ...ShadowLifted,
  },
});
