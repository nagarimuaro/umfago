import { type Href } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DSText } from './ds/ds-text';
import { Icon, type IconName } from './ds/icon';

import {
  MinTouchTarget,
  Opacity,
  Palette,
  Radius,
  ShadowSoft,
  Sizes,
  Spacing,
} from '@/constants/design-system';

/**
 * The Stitch design's bottom bar marks the active destination with a filled
 * `primary-container` pill, which the platform tab bars cannot render. `expo-router/ui`
 * gives the same routing behaviour with a fully custom bar, so it is used on every
 * platform rather than `NativeTabs`.
 */
type TabItem = { name: string; href: Href; label: string; icon: IconName };

const TabItems: readonly TabItem[] = [
  { name: 'index', href: '/', label: 'Home', icon: 'home' },
  { name: 'activity', href: '/activity', label: 'History', icon: 'history' },
  { name: 'chat', href: '/chat', label: 'Chat', icon: 'chat-bubble-outline' },
  { name: 'promo', href: '/promo', label: 'Promo', icon: 'local-offer' },
  { name: 'account', href: '/account', label: 'Account', icon: 'person' },
];

type TabButtonProps = TabTriggerSlotProps & { icon: IconName };

function TabButton({ icon, children, isFocused, ...props }: TabButtonProps) {
  const fg = isFocused ? Palette.onPrimaryContainer : Palette.secondary;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      {...props}
      style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
      <View style={[styles.pill, isFocused && styles.pillActive]}>
        <Icon name={icon} size={Sizes.iconLg} color={fg} />
      </View>
      <DSText variant="labelSm" color={fg}>
        {children}
      </DSText>
    </Pressable>
  );
}

export default function AppTabs() {
  const insets = useSafeAreaInsets();

  /*
    `TabList asChild` renders this View through a Slot, which rejects array styles
    outright, so the dynamic safe-area padding has to be flattened in first.
  */
  const barStyle = StyleSheet.flatten([
    styles.bar,
    { paddingBottom: Math.max(insets.bottom, Spacing.xs) },
  ]);

  return (
    <View style={styles.container}>
      <Tabs style={styles.tabsRoot}>
        <TabSlot style={styles.slot} />
        <TabList asChild>
          <View style={barStyle}>
            {TabItems.map((item) => (
              <TabTrigger key={item.name} name={item.name} href={item.href} asChild>
                <TabButton icon={item.icon}>{item.label}</TabButton>
              </TabTrigger>
            ))}
          </View>
        </TabList>
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    position: 'relative',
    backgroundColor: Palette.surface,
  },
  tabsRoot: {
    flex: 1,
    height: '100%',
  },
  slot: {
    flex: 1,
    height: '100%',
  },
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    backgroundColor: Palette.surfaceContainerLowest,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.surfaceVariant,
    ...ShadowSoft,
  },
  trigger: {
    flex: 1,
    minHeight: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.base,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.base,
    borderRadius: Radius.full,
  },
  pillActive: {
    backgroundColor: Palette.primaryContainer,
  },
  pressed: {
    opacity: Opacity.pressedText,
  },
});
