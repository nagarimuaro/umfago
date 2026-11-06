import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { formatDistance, formatRupiah } from '@/constants/booking';
import { BookingCopy } from '@/constants/booking-content';
import {
  Brand,
  Palette,
  Radius,
  ShadowSoft,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import { useAuth } from '@/hooks/use-auth';
import { useBooking } from '@/hooks/use-booking';

/** `shadow-sm` on the trip-details and rate-driver cards, as on the design. */
const cardStyles = {
  backgroundColor: Palette.surfaceContainerLowest,
  borderRadius: Radius.lg,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: Palette.surfaceVariant,
  padding: Spacing.md,
  ...ShadowSoft,
} as const;

const BACKEND_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

export default function OrderDoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { driver, route, fare, payment, orderUUID, reset } = useBooking();
  const { token } = useAuth();

  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = useCallback((tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }, []);

  const submit = async () => {
    if (submitting) return;

    if (rating > 0 && orderUUID && token) {
      setSubmitting(true);
      const fullNote = [tags.join(', '), comment.trim()].filter(Boolean).join(' - ');
      try {
        await fetch(`${BACKEND_URL}/api/orders/${orderUUID}/rate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rating: Math.max(1, Math.min(5, rating)),
            note: fullNote || 'Pelayanan sangat baik',
          }),
        });
        Alert.alert('Terima Kasih', 'Penilaian Anda untuk driver berhasil dikirim.');
      } catch {
        // Abaikan jika network gagal
      } finally {
        setSubmitting(false);
      }
    }
    reset();
    router.dismissAll();
  };

  return (
    <View style={styles.screen}>
      {/* Top bar — flat, no shadow, per the design. */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backPressed]}>
          <Icon name="arrow-back" size={Sizes.iconLg} color={Palette.primary} />
        </Pressable>
        <DSText variant="headlineMd" color={Palette.onSurface}>
          {BookingCopy.rideSummaryTitle}
        </DSText>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Spacing.xl + Sizes.ctaHeight + Spacing.md + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Success header. */}
        <View style={styles.success}>
          <View style={styles.checkCircle}>
            <Icon name="check-circle" size={32} color={Palette.onPrimaryContainer} />
          </View>
          <DSText variant="headlineLg" color={Palette.onSurface} style={styles.successTitle}>
            {BookingCopy.arrivedTitle}
          </DSText>
          <DSText variant="bodyMd" color={Palette.secondary}>
            {BookingCopy.arrivedSubtitle}
          </DSText>
        </View>

        {/* Trip details card. */}
        <View style={cardStyles}>
          <View style={styles.fareRow}>
            <View style={styles.fareLeft}>
              <DSText variant="bodySmMedium" color={Palette.secondary} style={styles.fareLabel}>
                {BookingCopy.totalFareLabel}
              </DSText>
              <DSText variant="headlineXl" color={Palette.onSurface}>
                {formatRupiah(fare.total)}
              </DSText>
            </View>
            <View style={styles.paymentBadge}>
              <Icon name="wallet" size={Sizes.iconXs} color={Palette.primary} />
              <DSText variant="labelMd" color={Palette.onSurface}>
                {payment === 'wallet' ? 'OpenPay' : 'Tunai'}
              </DSText>
            </View>
          </View>

          {route ? (
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <DSText variant="overline" color={Palette.secondary}>
                  {BookingCopy.distanceLabel}
                </DSText>
                <DSText variant="headlineSm" color={Palette.onSurface}>
                  {formatDistance(route.distanceKm)}
                </DSText>
              </View>
              <View style={styles.stat}>
                <DSText variant="overline" color={Palette.secondary}>
                  {BookingCopy.durationLabel}
                </DSText>
                <DSText variant="headlineSm" color={Palette.onSurface}>
                  {`${route.durationMinutes} ${BookingCopy.durationUnit}`}
                </DSText>
              </View>
            </View>
          ) : null}
        </View>

        {/* Rate driver section. */}
        {driver ? (
          <View style={cardStyles}>
            <View style={styles.sectionHead}>
              <DSText variant="headlineMd" color={Palette.onSurface}>
                {BookingCopy.rateTitle}
              </DSText>
            </View>

            <View style={styles.driverRow}>
              <View style={styles.driverPhotoWrap}>
                <Image
                  source={driver.photo}
                  alt={driver.name}
                  accessibilityLabel={driver.name}
                  style={styles.driverPhoto}
                  contentFit="cover"
                />
                <View style={styles.verifiedBadge}>
                  <Icon name="verified" size={Sizes.iconXs} color={Palette.primary} />
                </View>
              </View>
              <View>
                <DSText variant="headlineBase" color={Palette.onSurface}>
                  {driver.name}
                </DSText>
                <DSText variant="bodySmMedium" color={Palette.secondary}>
                  {`${driver.vehicle} • ${driver.plate}`}
                </DSText>
              </View>
            </View>

            {/* Star rating. */}
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= rating;
                return (
                  <Pressable
                    key={star}
                    accessibilityRole="button"
                    accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    onPress={() => setRating(star)}>
                    <Icon
                      name="star"
                      size={40}
                      color={filled ? Palette.primaryContainer : Palette.surfaceVariant}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* Quick feedback tags. */}
            <DSText variant="bodySmMedium" color={Palette.onSurface}>
              {BookingCopy.quickFeedback}
            </DSText>
            <View style={styles.tags}>
              {BookingCopy.feedbackTags.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    accessibilityRole="button"
                    accessibilityLabel={tag}
                    accessibilityState={{ selected: active }}
                    onPress={() => toggleTag(tag)}
                    style={[styles.tag, active && styles.tagActive]}>
                    <DSText
                      variant="bodySm"
                      color={active ? Palette.onSecondaryFixed : Palette.onSurfaceVariant}>
                      {tag}
                    </DSText>
                  </Pressable>
                );
              })}
            </View>

            {/* Comments textarea. */}
            <DSText variant="bodySmMedium" color={Palette.onSurface}>
              {BookingCopy.commentsLabel}
            </DSText>
            <TextInput
              accessibilityLabel={BookingCopy.commentsLabel}
              value={comment}
              onChangeText={setComment}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={BookingCopy.commentsPlaceholder}
              placeholderTextColor={Palette.secondary}
              multiline
              numberOfLines={3}
              style={[styles.textarea, focused && styles.textareaFocused]}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Fixed bottom CTA. */}
      <View style={[styles.ctaBar, { paddingBottom: Spacing.md + insets.bottom }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={BookingCopy.submitRating}
          onPress={submit}
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaPressed]}>
          <DSText variant="headlineBase" color={Brand.ctaOnAction}>
            {BookingCopy.submitRating}
          </DSText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.surface,
  },
  /* ---- Top bar ---- */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: Spacing.edgeMargin,
    backgroundColor: Palette.surface,
  },
  backBtn: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
    borderRadius: Radius.full,
  },
  backPressed: {
    opacity: 0.6,
  },
  spacer: {
    width: Sizes.avatar,
  },
  /* ---- Content ---- */
  content: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.edgeMargin,
    gap: Spacing.lg,
  },
  /* ---- Success ---- */
  success: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primaryContainer,
    marginBottom: Spacing.xs,
  },
  successTitle: {
    textAlign: 'center',
  },
  /* ---- Fare row ---- */
  fareRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.surfaceVariant,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
  },
  fareLeft: {
    flex: 1,
  },
  fareLabel: {
    marginBottom: Spacing.base,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Palette.surfaceContainerLow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.tight,
    borderRadius: Radius.full,
  },
  /* ---- Stats grid ---- */
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stat: {
    flex: 1,
  },
  /* ---- Rate section ---- */
  sectionHead: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.surfaceVariant,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.md,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  driverPhotoWrap: {
    position: 'relative',
  },
  driverPhoto: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Palette.surfaceVariant,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceContainerLowest,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.surfaceVariant,
  },
  /* ---- Stars ---- */
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  /* ---- Tags ---- */
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.outlineVariant,
  },
  tagActive: {
    backgroundColor: Palette.primaryContainer,
    borderColor: Palette.primaryContainer,
  },
  /* ---- Textarea ---- */
  textarea: {
    marginTop: Spacing.sm,
    borderRadius: Radius.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.surfaceVariant,
    backgroundColor: Palette.surfaceBright,
    color: Palette.onSurface,
    padding: Spacing.sm,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textareaFocused: {
    borderColor: Palette.onSurface,
  },
  /* ---- Bottom CTA ---- */
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.edgeMargin,
    backgroundColor: Palette.surfaceContainerLowest,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.surfaceVariant,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 20,
    shadowOpacity: 0.05,
    elevation: 4,
  },
  ctaBtn: {
    height: Sizes.ctaHeight,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.ctaAction,
  },
  ctaPressed: {
    opacity: 0.85,
  },
});
