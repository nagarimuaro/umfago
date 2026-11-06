import type { IconName } from '@/components/ds/icon';

/**
 * Placeholder account until an auth backend exists. Name, membership tier, stats and
 * menu labels are transcribed from the Stitch "Account Profile" screen.
 */
export const ProfileAccount = {
  name: 'Alex',
  membership: 'Gold Member',
  photo:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAHuMniJSC0CW0gpP2CuDm6U8ZfUwcSbaslJhX9WB88-cRt2mBb18YtSvnscP1DGoBw1NVogVIr9YvnxgV2NFfMLXesl5srije2-vGkJLuAnef8Eiwttec_hK5l3CVnATn_wh9TncxGR_asD4gsDP9CLU1oZam_oJ7-ZSA2XSDy_5YnLc9BbDOWiMP4w3nBAP10mmqQpuf0ins26pUGLnEcX1w36rEriX59o_kYJr8y0WJc9V2297a1',
} as const;

/** Which palette the stat card's icon disc uses. */
export type ProfileStatTone = 'tertiary' | 'gold';

export type ProfileStat = {
  id: string;
  label: string;
  value: string;
  icon: IconName;
  tone: ProfileStatTone;
};

export const ProfileStats: readonly ProfileStat[] = [
  {
    id: 'rides',
    label: 'Total Rides',
    value: '142',
    icon: 'directions-car',
    tone: 'tertiary',
  },
  {
    id: 'rating',
    label: 'Rating',
    value: '4.9',
    icon: 'star-rate',
    tone: 'gold',
  },
];

export type ProfileMenuItem = {
  id: string;
  label: string;
  icon: IconName;
};

export const ProfileMenu: readonly ProfileMenuItem[] = [
  { id: 'settings', label: 'Profile Settings', icon: 'person' },
  { id: 'addresses', label: 'Saved Addresses', icon: 'location-on' },
  { id: 'safety', label: 'Safety Center', icon: 'verified-user' },
  { id: 'help', label: 'Help & Support', icon: 'help' },
];

export const ProfileLogoutLabel = 'Log Out';