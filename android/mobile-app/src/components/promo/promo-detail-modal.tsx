import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';

import { Button } from '@/components/ds/button';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import {
  FontFamily,
  Palette,
  Radius,
  ShadowSheet,
  Sizes,
  Spacing,
} from '@/constants/design-system';
import type { PromoItem } from './types';

export type PromoDetailModalProps = {
  visible: boolean;
  promo: PromoItem | null;
  onClose: () => void;
  onApply: (promo: PromoItem) => void;
};

export function PromoDetailModal({ visible, promo, onClose, onApply }: PromoDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!promo) return null;

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(promo.code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUsePromo = () => {
    onClose();
    onApply(promo);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Tutup dialog"
        />

        <View style={styles.sheetContainer}>
          {/* Top Hero Image Banner */}
          <View style={styles.heroImageWrap}>
            <Image
              source={promo.image}
              style={styles.heroImage}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />

            {/* Dark Gradient Overlay for legibility */}
            <View style={styles.imageOverlay} />

            {/* Top Bar with Handle & Close */}
            <View style={styles.topBar}>
              <View style={styles.handle} />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Tutup detail promo"
                onPress={onClose}
                style={styles.closeButton}>
                <Icon name="close" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Floating Hero Info */}
            <View style={styles.heroInfoFloating}>
              <View style={styles.categoryBadgeRow}>
                <View style={styles.heroIconCircle}>
                  <Icon name={promo.icon} size={Sizes.iconSm} color="#ffffff" />
                </View>
                <DSText variant="labelSm" color="#ffffff" style={styles.heroCategoryText}>
                  {promo.categoryLabel.toUpperCase()}
                </DSText>
                {promo.badge ? (
                  <View style={styles.heroBadge}>
                    <DSText variant="labelXs" style={styles.heroBadgeText}>
                      {promo.badge}
                    </DSText>
                  </View>
                ) : null}
              </View>

              <DSText variant="headlineLg" color="#ffffff" style={styles.heroDiscountText}>
                {promo.discountHighlight}
              </DSText>
            </View>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {/* Promo Title & Description */}
            <View style={styles.section}>
              <DSText variant="headlineBaseSemi" style={styles.promoTitle}>
                {promo.title}
              </DSText>
              <DSText variant="bodyMd" color="#4B5563" style={styles.promoDesc}>
                {promo.description}
              </DSText>
            </View>

            {/* Voucher Code Box */}
            <View style={styles.codeBox}>
              <View style={styles.codeInfo}>
                <DSText variant="labelXs" color="#64748B" style={styles.codeSubtitle}>
                  KODE VOUCHER
                </DSText>
                <DSText variant="headlineMd" style={styles.codeText}>
                  {promo.code}
                </DSText>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Salin kode promo"
                onPress={handleCopy}
                style={[styles.copyBtn, copied && styles.copyBtnSuccess]}>
                <Icon
                  name={copied ? 'check' : 'content-copy'}
                  size={16}
                  color={copied ? '#ffffff' : '#0F172A'}
                />
                <DSText
                  variant="labelSm"
                  color={copied ? '#ffffff' : '#0F172A'}
                  style={styles.copyBtnText}>
                  {copied ? 'Tersalin!' : 'Salin'}
                </DSText>
              </TouchableOpacity>
            </View>

            {/* Key Information Grid */}
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <View style={[styles.infoIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Icon name="calendar-today" size={16} color="#2563EB" />
                </View>
                <View style={styles.infoTextWrap}>
                  <DSText variant="labelXs" color="#64748B">
                    Masa Berlaku
                  </DSText>
                  <DSText variant="bodySmMedium" color="#0F172A">
                    S/d {promo.expiryDate}
                  </DSText>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={[styles.infoIconWrap, { backgroundColor: '#ECFDF5' }]}>
                  <Icon name="receipt-long" size={16} color="#059669" />
                </View>
                <View style={styles.infoTextWrap}>
                  <DSText variant="labelXs" color="#64748B">
                    Min. Transaksi
                  </DSText>
                  <DSText variant="bodySmMedium" color="#0F172A">
                    {promo.minFare ? `Rp ${promo.minFare.toLocaleString('id-ID')}` : 'Tanpa Min.'}
                  </DSText>
                </View>
              </View>

              {promo.maxDiscount ? (
                <View style={styles.infoItem}>
                  <View style={[styles.infoIconWrap, { backgroundColor: '#FEF3C7' }]}>
                    <Icon name="local-offer" size={16} color="#D97706" />
                  </View>
                  <View style={styles.infoTextWrap}>
                    <DSText variant="labelXs" color="#64748B">
                      Maks. Potongan
                    </DSText>
                    <DSText variant="bodySmMedium" color="#0F172A">
                      Rp {promo.maxDiscount.toLocaleString('id-ID')}
                    </DSText>
                  </View>
                </View>
              ) : null}

              <View style={styles.infoItem}>
                <View style={[styles.infoIconWrap, { backgroundColor: '#F3E8FF' }]}>
                  <Icon name="account-balance-wallet" size={16} color="#7C3AED" />
                </View>
                <View style={styles.infoTextWrap}>
                  <DSText variant="labelXs" color="#64748B">
                    Metode Bayar
                  </DSText>
                  <DSText variant="bodySmMedium" color="#0F172A">
                    OpenPay & Tunai
                  </DSText>
                </View>
              </View>
            </View>

            {/* Syarat & Ketentuan */}
            <View style={styles.termsSection}>
              <View style={styles.termsTitleRow}>
                <Icon name="info" size={18} color="#00870F" />
                <DSText variant="bodyMdSemi" style={styles.termsHeaderTitle}>
                  Syarat & Ketentuan
                </DSText>
              </View>

              <View style={styles.termsList}>
                {promo.terms.map((term, index) => (
                  <View key={index} style={styles.termRow}>
                    <View style={styles.termBadgeDot}>
                      <DSText variant="labelXs" color="#007A14" style={styles.termNumber}>
                        {index + 1}
                      </DSText>
                    </View>
                    <DSText variant="bodySm" color="#334155" style={styles.termText}>
                      {term}
                    </DSText>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Sticky Bottom CTA */}
          <View style={styles.ctaFooter}>
            <Button
              label="Gunakan Promo Ini"
              variant="primary"
              size="lg"
              onPress={handleUsePromo}
              style={styles.usePromoBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '90%',
    overflow: 'hidden',
    ...ShadowSheet,
  },
  heroImageWrap: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  topBar: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignSelf: 'center',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfoFloating: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.lg,
    right: Spacing.lg,
    gap: 4,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  heroIconCircle: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCategoryText: {
    fontWeight: '800',
    letterSpacing: 0.8,
    fontSize: 12,
  },
  heroBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  heroBadgeText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 10,
  },
  heroDiscountText: {
    fontFamily: FontFamily.headline,
    fontWeight: '800',
    fontSize: 24,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.xs,
  },
  promoTitle: {
    color: '#0F172A',
    fontWeight: '700',
  },
  promoDesc: {
    lineHeight: 20,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  codeInfo: {
    gap: 2,
  },
  codeSubtitle: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  codeText: {
    fontFamily: FontFamily.headline,
    fontWeight: '800',
    color: '#007A14',
    letterSpacing: 1.5,
    fontSize: 20,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.base,
  },
  copyBtnSuccess: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  copyBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    width: '47%',
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: {
    flex: 1,
  },
  termsSection: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  termsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  termsHeaderTitle: {
    color: '#0F172A',
    fontWeight: '700',
  },
  termsList: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  termBadgeDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termNumber: {
    fontWeight: '800',
  },
  termText: {
    flex: 1,
    lineHeight: 19,
  },
  ctaFooter: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#ffffff',
  },
  usePromoBtn: {
    width: '100%',
  },
});
