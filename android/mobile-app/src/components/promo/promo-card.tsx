import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { Button } from '@/components/ds/button';
import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import {
  FontFamily,
  Opacity,
  Palette,
  Radius,
  Spacing,
} from '@/constants/design-system';
import type { PromoItem } from './types';

export type PromoCardProps = {
  promo: PromoItem;
  onSelect: (promo: PromoItem) => void;
  onApply: (promo: PromoItem) => void;
  onCopyCode?: (code: string) => void;
};

export function PromoCard({ promo, onSelect, onApply, onCopyCode }: PromoCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(promo.code);
    }
    setCopied(true);
    onCopyCode?.(promo.code);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card level={2} elevation="soft" radius="lg" padding="none" style={styles.card}>
      {/* Top Banner WebP Image */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${promo.title}, ${promo.discountHighlight}`}
        onPress={() => onSelect(promo)}
        style={styles.imageContainer}>
        <Image
          source={promo.image}
          style={styles.promoImage}
          contentFit="cover"
          transition={250}
          accessibilityIgnoresInvertColors
        />

        {/* Floating Category Tag */}
        <View style={styles.imageOverlayTop}>
          <View style={styles.categoryPill}>
            <Icon name={promo.icon} size={14} color="#ffffff" />
            <DSText variant="labelXs" color="#ffffff" style={styles.categoryPillText}>
              {promo.categoryLabel.toUpperCase()}
            </DSText>
          </View>

          {promo.badge ? (
            <View style={styles.badgePill}>
              <DSText variant="labelXs" style={styles.badgePillText}>
                {promo.badge}
              </DSText>
            </View>
          ) : null}
        </View>
      </Pressable>

      {/* Main Content Body */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${promo.title}, ${promo.discountHighlight}`}
        onPress={() => onSelect(promo)}
        style={styles.cardBody}>
        <View style={styles.discountRow}>
          <DSText variant="headlineMd" style={styles.discountHighlight}>
            {promo.discountHighlight}
          </DSText>
        </View>

        <DSText variant="bodyMdSemi" style={styles.title}>
          {promo.title}
        </DSText>

        <DSText variant="bodySm" color="#4B5563" numberOfLines={2} style={styles.description}>
          {promo.description}
        </DSText>

        {/* Info Meta Row with Badges */}
        <View style={styles.metaRow}>
          {promo.minFare ? (
            <View style={styles.metaBadge}>
              <Icon name="receipt-long" size={13} color="#475569" />
              <DSText variant="labelXs" color="#334155" style={styles.metaText}>
                Min. Rp {promo.minFare.toLocaleString('id-ID')}
              </DSText>
            </View>
          ) : null}

          <View style={styles.metaBadge}>
            <Icon name="calendar-today" size={13} color="#475569" />
            <DSText variant="labelXs" color="#334155" style={styles.metaText}>
              S/d {promo.expiryDate}
            </DSText>
          </View>
        </View>
      </Pressable>

      {/* Perforated Ticket Divider with Notches */}
      <View style={styles.dashedContainer}>
        <View style={styles.cutoutLeft} />
        <View style={styles.dashedLine} />
        <View style={styles.cutoutRight} />
      </View>

      {/* Voucher Action Footer */}
      <View style={styles.footer}>
        {/* Promo Code Chip */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Salin kode ${promo.code}`}
          onPress={handleCopy}
          style={({ pressed }) => [
            styles.codeChip,
            copied && styles.codeChipCopied,
            pressed && styles.pressed,
          ]}>
          <Icon
            name={copied ? 'check-circle' : 'content-copy'}
            size={14}
            color={copied ? '#059669' : '#0F172A'}
          />
          <DSText
            variant="labelSm"
            color={copied ? '#059669' : '#0F172A'}
            style={styles.codeText}>
            {copied ? 'Tersalin!' : promo.code}
          </DSText>
        </Pressable>

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onSelect(promo)}
            style={styles.detailButton}>
            <DSText variant="labelSm" color="#4B5563" style={styles.detailText}>
              S&K Detail
            </DSText>
          </Pressable>

          <Button
            label="Pakai"
            size="sm"
            variant="primary"
            onPress={() => onApply(promo)}
            style={styles.applyButton}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
  },
  imageContainer: {
    width: '100%',
    height: 145,
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  promoImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayTop: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryPillText: {
    fontWeight: '800',
    letterSpacing: 0.6,
    fontSize: 10,
  },
  badgePill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  badgePillText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  cardBody: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountHighlight: {
    color: '#0F172A',
    fontWeight: '800',
    fontFamily: FontFamily.headline,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  title: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 15,
  },
  description: {
    lineHeight: 18,
    color: '#64748B',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  metaText: {
    fontWeight: '600',
    fontSize: 11,
  },
  dashedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
    position: 'relative',
  },
  cutoutLeft: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Palette.surface,
    marginLeft: -8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  cutoutRight: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Palette.surface,
    marginRight: -8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  codeChipCopied: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderStyle: 'solid',
  },
  codeText: {
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 13,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailButton: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  detailText: {
    fontWeight: '600',
    fontSize: 13,
  },
  applyButton: {
    minWidth: 80,
  },
  pressed: {
    opacity: Opacity.pressedSubtle,
  },
});
