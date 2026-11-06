import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { DSText } from '@/components/ds/ds-text';
import { IconButton } from '@/components/ds/icon-button';
import { Palette, Radius, Sizes, Spacing } from '@/constants/design-system';

export function TopAppBar({
  onNotification,
  unreadCount = 0,
}: {
  onNotification?: () => void;
  onSearch?: () => void;
  onAvatar?: () => void;
  unreadCount?: number;
}) {
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="UmfaGo"
        />
      </View>

      <View style={styles.right}>
        <IconButton
          icon="notifications"
          accessibilityLabel="Notifikasi"
          onPress={onNotification}
          size={Sizes.iconLg}
          color={Palette.primary}
        />
        {unreadCount > 0 ? (
          <View style={styles.badgeDot}>
            <DSText variant="labelXs" color="#ffffff" style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </DSText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: Sizes.appBar,
    paddingHorizontal: Spacing.edgeMargin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 108,
    height: 36,
  },
  right: {
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: Radius.full,
    backgroundColor: Palette.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
});
