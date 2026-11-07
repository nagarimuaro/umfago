/**
 * Lanturan Digital Design System Theme Tokens
 * Dark Mode First for UmfaGo Driver Mobile App
 */

export const colors = {
  // Surface Hierarchy
  background: '#131313',
  surface: '#131313',
  surfaceDim: '#0E0E0E',
  surfaceLow: '#1B1C1C',
  surfaceContainer: '#1F2020',
  surfaceHigh: '#2A2A2A',
  surfaceHighest: '#353535',
  surfaceBright: '#393939',

  // Primary Accent (High visibility Electric Lime)
  primary: '#C8FF00',
  primaryFixed: '#C0F500',
  primaryFixedDim: '#A8D700',
  onPrimary: '#000000', // Absolute black for WCAG 2.1 compliance on lime surfaces
  primaryContainer: '#C8FF00',
  onPrimaryContainer: '#161F00',

  // Typography & Content
  onSurface: '#E4E2E1',
  onSurfaceVariant: '#C4CAAC',
  textSecondary: '#8E9479',
  textMuted: '#686D58',
  white: '#FFFFFF',
  black: '#000000',

  // Borders & Outlines
  outline: '#2C2D2D',
  outlineVariant: '#434933',
  borderCard: '#2A2A2A',
  borderSubtle: '#1E2020',

  // Semantic Status
  online: '#C8FF00',
  offline: '#555A5E',
  busy: '#FF9800',
  surge: '#FF3B30',
  surgeGlow: 'rgba(255, 59, 48, 0.25)',
  success: '#C8FF00',
  error: '#FFB4AB',
  errorContainer: '#93000A',
  warning: '#FFC107',
  info: '#64B5F6',

  // Translucent Overlays
  overlayBackdrop: 'rgba(10, 10, 10, 0.75)',
  radarGlow: 'rgba(200, 255, 0, 0.15)',
  radarWave: 'rgba(200, 255, 0, 0.25)',
};

export const typography = {
  headlineXl: {
    fontSize: 36,
    fontWeight: '800' as const,
    lineHeight: 42,
    letterSpacing: -0.8,
  },
  headlineLg: {
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  headlineMd: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 26,
  },
  bodyLg: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodyMd: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySm: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  labelCaps: {
    fontSize: 11,
    fontWeight: '700' as const,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  currencyDisplay: {
    fontSize: 24,
    fontWeight: '800' as const,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  gutter: 16,
};

export const rounded = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};

export const formatRupiah = (amount: number): string => {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
};

