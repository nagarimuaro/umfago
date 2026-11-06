import type { IconName } from '@/components/ds/icon';
import type { PillTone } from '@/components/ds/pill';
import type { ServiceId } from '@/types/order';

export type PromoCategoryTab = 'all' | 'ride' | 'food' | 'send' | 'ppob';

export type PromoItem = {
  id: string;
  code: string;
  title: string;
  description: string;
  discountHighlight: string;
  category: 'ride' | 'car' | 'food' | 'send' | 'ppob';
  categoryLabel: string;
  badge?: string;
  badgeTone?: PillTone;
  minFare?: number;
  maxDiscount?: number;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  expiryDate: string;
  icon: IconName;
  gradient: readonly [string, string];
  accentFg: string;
  terms: string[];
  serviceType: ServiceId | 'ppob';
  image: any;
};
