import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ds/button';
import { DSText } from '@/components/ds/ds-text';
import { Brand, Palette, Radius, Spacing } from '@/constants/design-system';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SlideItem {
  id: string;
  image: number;
  tag: string;
  title: string;
  subtitle: string;
}

const ONBOARDING_SLIDES: SlideItem[] = [
  {
    id: '1',
    image: require('@/assets/spalsh/spalsh1.png'),
    tag: 'RIDE & TRIP',
    title: 'Perjalanan Cepat & Hemat',
    subtitle: 'Ojek Motor dan Taksi Mobil siap antar Anda dengan tarif pasti.',
  },
  {
    id: '2',
    image: require('@/assets/spalsh/splash2.png'),
    tag: 'OPENJEK FOOD',
    title: 'Kuliner Lezat Tiba Cepat',
    subtitle: 'Pesan makanan favorit dari ribuan merchant terdekat langsung ke pintu Anda.',
  },
  {
    id: '3',
    image: require('@/assets/spalsh/spalsh3.png'),
    tag: 'E-WALLET & PROMO',
    title: 'Bayar Mudah & Banyak Diskon',
    subtitle: 'Gunakan saldo UmfaGo Wallet dan nikmati voucher hemat setiap hari.',
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < ONBOARDING_SLIDES.length) {
      setActiveIndex(index);
    }
  };

  const handleNext = () => {
    if (activeIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      router.replace('/auth/register');
    }
  };

  const handleSkip = () => {
    router.replace('/auth/register');
  };

  return (
    <View style={styles.container}>
      {/* Gambar Latar Fullscreen Geser (Fullscreen Swipe Carousel) */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={styles.fullSlide}>
            <Image
              source={item.image}
              style={styles.fullImage}
              contentFit="cover"
              transition={200}
            />
            {/* Shadow tipis di atas gambar untuk estetika visual & keterbacaan teks */}
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.25)', 'transparent', 'rgba(0, 0, 0, 0.65)']}
              locations={[0, 0.45, 1]}
              style={styles.imageOverlay}
            />
          </View>
        )}
      />

      {/* Scrim Gradien Atas untuk Tombol Lewati */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={[styles.topGradient, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.topBar}>
          <View />
          <TouchableOpacity onPress={handleSkip} hitSlop={12} style={styles.skipBtn}>
            <DSText variant="labelMd" color="#ffffff" style={styles.skipText}>
              Lewati
            </DSText>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Text Info Melayang Interaktif di Atas Gambar (Bukan di dalam Card) */}
      <View style={styles.floatingTextContainer}>
        <View style={styles.tagBadge}>
          <DSText variant="labelSm" color={Brand.ink} style={styles.tagText}>
            {ONBOARDING_SLIDES[activeIndex]?.tag}
          </DSText>
        </View>
        <DSText variant="headlineXl" color={Brand.ctaAction} style={styles.floatingTitle}>
          {ONBOARDING_SLIDES[activeIndex]?.title}
        </DSText>
        <DSText variant="bodyLg" color="#eaff96" style={styles.floatingSubtitle}>
          {ONBOARDING_SLIDES[activeIndex]?.subtitle}
        </DSText>
      </View>

      {/* Bottom Sheet Card: Rata Kiri, Kanan, dan Bawah Full, Sudut Atas Melengkung */}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + Spacing.md }]}>
        {/* Indikator Titik Geser */}
        <View style={styles.dotsRow}>
          {ONBOARDING_SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                activeIndex === idx ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Tombol Lanjut / Register & Masuk */}
        <View style={styles.actionRow}>
          <Button
            label={activeIndex === ONBOARDING_SLIDES.length - 1 ? 'Daftar Sekarang' : 'Lanjut'}
            variant="primary"
            size="lg"
            onPress={handleNext}
            style={styles.mainBtn}
          />
          <TouchableOpacity onPress={() => router.push('/auth/login')} style={styles.loginOption}>
            <DSText variant="bodyMd" color={Palette.secondary}>
              Sudah punya akun?{' '}
              <DSText variant="bodyMd" color={Palette.primary} style={styles.loginHighlight}>
                Masuk di sini
              </DSText>
            </DSText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.edgeMargin,
    paddingBottom: Spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  skipBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: Radius.full,
  },
  skipText: {
    fontWeight: '700',
  },
  floatingTextContainer: {
    position: 'absolute',
    bottom: 230,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.edgeMargin + Spacing.sm,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tagBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    backgroundColor: Brand.ctaAction,
    borderRadius: Radius.full,
    marginBottom: Spacing.xs,
  },
  tagText: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  floatingTitle: {
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 36,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  floatingSubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 8,
    paddingHorizontal: Spacing.sm,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: Palette.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.edgeMargin,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: Radius.full,
  },
  dotActive: {
    width: 28,
    backgroundColor: Brand.ink,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Palette.surfaceContainerHighest,
  },
  actionRow: {
    gap: Spacing.sm,
  },
  mainBtn: {
    width: '100%',
    borderRadius: Radius.xl,
  },
  loginOption: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  loginHighlight: {
    fontWeight: '800',
  },
});
