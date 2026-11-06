import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PromoCarousel } from '@/components/home/promo-carousel';
import { SectionHeader } from '@/components/home/section-header';
import { Palette, Spacing } from '@/constants/design-system';

export default function PromoScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.inset}>
            <SectionHeader title="Promo untuk kamu" />
          </View>
          <PromoCarousel />
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  inset: {
    paddingHorizontal: Spacing.edgeMargin,
  },
});
