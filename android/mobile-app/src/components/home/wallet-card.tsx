import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ds/button';
import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { IconButton } from '@/components/ds/icon-button';
import { formatRupiah } from '@/constants/booking';
import { FontFamily, Overlay, Palette, Radius, Sizes, Spacing } from '@/constants/design-system';
import { Wallet } from '@/constants/home-content';

export type WalletCardProps = {
  balance?: number;
  label?: string;
  onDetail?: () => void;
  onTopUp?: () => void;
  onPay?: () => void;
  onTransfer?: () => void;
};

export function WalletCard({
  balance,
  label = Wallet.label,
  onDetail,
  onTopUp,
  onPay,
  onTransfer,
}: WalletCardProps) {
  const currentBalance = balance !== undefined ? balance : Wallet.balance;

  return (
    <Card
      level={2}
      elevation="floating"
      radius="lg"
      padding="edgeMargin"
      background={Palette.onBackground}
      style={styles.card}>
      {/*
        The design blurs this decorative circle (`blur-2xl`). React Native has no
        equivalent without a native blur package, so it renders as a soft
        translucent disc — close in tone, harder-edged than the web original.
      */}
      <View style={[styles.decoration, { pointerEvents: 'none' }]} />

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Detail ${label}, saldo ${formatRupiah(currentBalance)}`}
          onPress={onDetail}
          style={styles.headerText}>
          <DSText variant="labelSm" color={Palette.surfaceContainer}>
            {label}
          </DSText>
          <DSText
            variant="headlineLgMobile"
            color={Palette.surfaceContainerLowest}
            style={styles.balance}>
            {formatRupiah(currentBalance)}
          </DSText>
        </Pressable>

        <IconButton
          icon="account-balance-wallet"
          accessibilityLabel="Detail OpenPay"
          onPress={onDetail}
          shape="rounded"
          box={Sizes.buttonCircle}
          size={Sizes.iconMd}
          color={Palette.surfaceContainerLowest}
          background={Overlay.onDarkSubtle}
        />
      </View>

      <View style={styles.actions}>
        <Button
          label="Top Up"
          icon="add-circle"
          variant="primary"
          size="sm"
          onPress={onTopUp}
          style={styles.action}
        />
        <Button
          label="Pay"
          icon="qr-code-scanner"
          variant="surface"
          size="sm"
          onPress={onPay}
          style={styles.action}
        />
        <Button
          label="Transfer"
          icon="send"
          variant="surface"
          size="sm"
          onPress={onTransfer}
          style={styles.action}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
    overflow: 'hidden',
  },
  decoration: {
    position: 'absolute',
    right: -Sizes.avatar,
    top: -Sizes.avatar,
    width: Sizes.promoCard,
    height: Sizes.promoCard,
    borderRadius: Radius.full,
    backgroundColor: Overlay.decoration,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    gap: Spacing.base,
  },
  balance: {
    fontFamily: FontFamily.headline,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.base,
  },
  action: {
    flex: 1,
  },
});
