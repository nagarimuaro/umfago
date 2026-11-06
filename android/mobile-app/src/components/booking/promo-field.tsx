import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { Button } from '@/components/ds/button';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { BookingCopy } from '@/constants/booking-content';
import {
  Accent,
  Neutral,
  Palette,
  Radius,
  Sizes,
  Spacing,
  Typography,
} from '@/constants/design-system';

export type PromoFieldProps = {
  /** Returns true when the code was accepted, which clears the input. */
  onApply: (code: string) => Promise<boolean> | boolean;
  appliedPromo?: string | null;
  onClearPromo?: () => void;
};

export function PromoField({ onApply, appliedPromo, onClearPromo }: PromoFieldProps) {
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const apply = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    try {
      const ok = await onApply(code);
      if (ok) setCode('');
    } finally {
      setLoading(false);
    }
  };

  if (appliedPromo) {
    return (
      <View style={styles.appliedCard}>
        <View style={styles.appliedLeft}>
          <Icon name="local-offer" size={18} color={Accent.success} />
          <View>
            <DSText variant="labelSm" color={Accent.success}>
              Kupon Aktif
            </DSText>
            <DSText variant="bodySmMedium" color={Neutral.gray900}>
              {appliedPromo}
            </DSText>
          </View>
        </View>
        {onClearPromo && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Hapus kupon"
            onPress={onClearPromo}
            style={styles.removeBtn}>
            <Icon name="close" size={18} color={Neutral.gray500} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={[styles.ring, focused && styles.ringFocused]}>
        <View style={styles.leadingIcon} pointerEvents="none">
          <Icon name="local-offer" size={Sizes.iconSm} color={Neutral.gray400} />
        </View>

        <TextInput
          accessibilityLabel={BookingCopy.promoPlaceholder}
          value={code}
          onChangeText={setCode}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={apply}
          placeholder={BookingCopy.promoPlaceholder}
          placeholderTextColor={Neutral.gray400}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          editable={!loading}
          style={[styles.input, focused && styles.inputFocused]}
        />
      </View>

      <Button
        label={loading ? '' : BookingCopy.promoAction}
        variant="dark"
        size="sm"
        disabled={loading || !code.trim()}
        onPress={apply}
        style={styles.action}>
        {loading ? <ActivityIndicator size="small" color="#ffffff" /> : undefined}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  appliedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  appliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  removeBtn: {
    padding: 6,
  },
  ring: {
    flex: 1,
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: Spacing.hair,
    borderColor: 'transparent',
  },
  ringFocused: {
    borderColor: Palette.primaryContainer,
  },
  leadingIcon: {
    position: 'absolute',
    left: Spacing.sm,
    zIndex: 1,
  },
  input: {
    ...Typography.bodySmMedium,
    color: Neutral.gray900,
    paddingLeft: Sizes.avatar,
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.pill,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Neutral.gray200,
    backgroundColor: Palette.surfaceContainerLowest,
  },
  inputFocused: {
    borderColor: Palette.primaryContainer,
  },
  action: {
    paddingHorizontal: Spacing.screenMargin,
    borderRadius: Radius.md,
    minWidth: 70,
  },
});

