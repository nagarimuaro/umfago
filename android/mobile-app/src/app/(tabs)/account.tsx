import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ds/button';
import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { MembershipBadge } from '@/components/profile/membership-badge';
import { MenuRow } from '@/components/profile/menu-row';
import { StatCard } from '@/components/profile/stat-card';
import { Palette, Radius, Sizes, Spacing } from '@/constants/design-system';
import { ProfileAccount, ProfileLogoutLabel, ProfileMenu, ProfileStats } from '@/constants/profile';
import { useAuth } from '@/hooks/use-auth';

/**
 * Account profile screen.
 *
 * The menu rows have no destination screens yet, so they render without an `onPress`:
 * the chevrons stay for visual fidelity, but the rows are not announced as buttons. The
 * edit button is marked disabled for the same reason, which costs nothing visually. Log
 * Out stays enabled: `Button`'s disabled state dims it to 40%, which the design does not
 * draw, so it waits for an auth backend rather than losing its colour.
 */
export default function AccountScreen() {
  const { user, refreshProfile, logout } = useAuth();

  useEffect(() => {
    refreshProfile();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/onboarding');
  };

  const cleanName = (user?.name || ProfileAccount.name).replace(/\s*\(penumpang\)\s*/i, '').trim();

  const handleMenuPress = (id: string) => {
    switch (id) {
      case 'settings':
        router.push('/profile/edit');
        break;
      case 'payment':
        router.push('/profile/payment');
        break;
      case 'addresses':
        router.push('/profile/addresses');
        break;
      case 'safety':
        router.push('/profile/safety');
        break;
      case 'help':
        router.push('/profile/help');
        break;
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.identity}>
              <Image
                source={{ uri: ProfileAccount.photo }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
                accessibilityIgnoresInvertColors
              />
              <View style={styles.identityText}>
                <DSText variant="headlineLg">{cleanName}</DSText>
                <DSText variant="bodySm" color={Palette.secondary}>
                  {user?.phone || user?.email || 'Akun Terverifikasi'}
                </DSText>
                <MembershipBadge label={user?.email || ProfileAccount.membership} />
              </View>
            </View>
          </View>

          <View style={styles.stats}>
            {ProfileStats.map((stat) => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </View>

          <Card elevation="soft" padding="none" radius="xl" style={styles.menu}>
            {ProfileMenu.map((item, index) => (
              <MenuRow
                key={item.id}
                item={item}
                isLast={index === ProfileMenu.length - 1}
                onPress={() => handleMenuPress(item.id)}
              />
            ))}
          </Card>

          <Button
            variant="danger"
            icon="logout"
            label={ProfileLogoutLabel}
            onPress={handleLogout}
            style={styles.logout}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.surface,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.edgeMargin,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: Spacing.base,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexShrink: 1,
  },
  identityText: {
    gap: Spacing.xs,
    flexShrink: 1,
  },
  avatar: {
    width: Sizes.avatarLg,
    height: Sizes.avatarLg,
    borderRadius: Radius.full,
    borderWidth: Sizes.avatarRing,
    borderColor: Palette.primaryContainer,
    backgroundColor: Palette.surfaceContainer,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.gutter,
  },
  /* Clips the last row's corners to the card radius. */
  menu: {
    overflow: 'hidden',
    borderColor: Palette.surfaceContainer,
  },
  logout: {
    borderRadius: Radius.lg,
  },
});