/**
 * OpenJek design system tokens.
 *
 * Ported from the OpenJek design spec. Values in the spec are CSS (px / rem / em);
 * they are converted here to the unitless density-independent numbers React Native
 * expects. Letter spacing is converted from `em` to points (em x fontSize).
 *
 * The spec defines a light palette only — there is no dark-mode token set yet.
 */

import { TextStyle } from 'react-native';

export const Palette = {
  surface: '#f9f9fc',
  surfaceDim: '#d9dadd',
  surfaceBright: '#f9f9fc',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f3f6',
  surfaceContainer: '#edeef1',
  surfaceContainerHigh: '#e8e8eb',
  surfaceContainerHighest: '#e2e2e5',
  onSurface: '#1a1c1e',
  onSurfaceVariant: '#434933',
  inverseSurface: '#2f3133',
  inverseOnSurface: '#f0f0f3',
  surfaceTint: '#4f6600',
  primary: '#4f6600',
  onPrimary: '#ffffff',
  primaryContainer: '#c8ff00',
  onPrimaryContainer: '#597300',
  inversePrimary: '#a8d700',
  secondary: '#5e5d6b',
  onSecondary: '#ffffff',
  secondaryContainer: '#e3e0f2',
  onSecondaryContainer: '#646371',
  tertiary: '#005ac2',
  onTertiary: '#ffffff',
  tertiaryContainer: '#e7ecff',
  onTertiaryContainer: '#0466d9',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  primaryFixed: '#c0f500',
  primaryFixedDim: '#a8d700',
  onPrimaryFixed: '#161f00',
  onPrimaryFixedVariant: '#3b4d00',
  secondaryFixed: '#e3e0f2',
  secondaryFixedDim: '#c7c5d5',
  onSecondaryFixed: '#1a1a26',
  onSecondaryFixedVariant: '#464553',
  tertiaryFixed: '#d8e2ff',
  tertiaryFixedDim: '#adc6ff',
  onTertiaryFixed: '#001a42',
  onTertiaryFixedVariant: '#004395',
  background: '#f9f9fc',
  onBackground: '#1a1c1e',
  surfaceVariant: '#e2e2e5',
  outline: '#747a60',
  outlineVariant: '#c4caac',
} as const;

/**
 * Component-level colors called out in the spec prose rather than the token block.
 * The prose names `#c8ff00` "primary" and `#1a1a26` "secondary"; in the token set
 * those are `primaryContainer` and `onSecondaryFixed`. The prose wins for these two
 * because it specifies concrete component treatment.
 */
export const Brand = {
  /** Primary call-to-action fill. Always pair with `ctaOnAction`. */
  ctaAction: Palette.primaryContainer,
  ctaOnAction: Palette.onSecondaryFixed,
  /** Grounding color for headers and driver-mode surfaces. */
  ink: Palette.onSecondaryFixed,
  /** 1px hairline for level-1 cards. */
  cardStroke: Palette.surfaceVariant,
} as const;

export const Spacing = {
  hair: 2,
  base: 4,
  tight: 6,
  xs: 8,
  pill: 10,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  edgeMargin: 16,
  gutter: 12,
  /**
   * The spec's `margin-mobile`. Its layout section calls for 20px outside margins on
   * mobile, which the booking sheet uses; `edgeMargin` (16) stays for the home screen.
   */
  screenMargin: 20,
  /** The booking sheet's 20px vertical rhythm between related blocks (`space-y-5`). */
  stack: 20,
} as const;

/**
 * Fixed pixel sizes read off the Stitch markup's Tailwind utilities, e.g. `size-14`
 * (3.5rem = 56) and `h-40` (10rem = 160). Centralized so no component hardcodes them.
 */
export const Sizes = {
  /** `text-[14px]` — the info glyph inline with the service-fee label. */
  iconXs: 14,
  iconSm: 16,
  iconBase: 18,
  iconMd: 20,
  iconLg: 24,
  iconXl: 28,
  /** `text-4xl` — the end-call glyph on the in-call screen. */
  iconXxl: 36,
  /** Decorative watermark glyph on the ride promo. */
  iconWatermark: 100,
  /** Circular icon button that sits inside a card. */
  buttonCircle: 32,
  /** Circular button floating over the store hero photo, `w-10 h-10`. */
  heroAction: 40,
  avatar: 40,
  /** Service grid tile and other square affordances. */
  tile: 56,
  appBar: 64,
  /** Restaurant card cover image. */
  cover: 128,
  /** Full-width merchant card cover on the food category screen, `h-48`. */
  coverWide: 192,
  /** Store hero photo on the merchant menu screen, `h-64`. */
  storeHero: 256,
  /** Menu item thumbnail on that screen, `w-28 h-28`. */
  menuThumb: 112,
  /** Order-summary line thumbnail on the checkout screen, `w-16 h-16`. */
  orderThumb: 64,
  promoCard: 160,
  restaurantCard: 200,
  promoCardMin: 280,
  /** Corner accent square on the Food service tile. */
  tileAccent: 16,
  /** Separator dot between restaurant meta values. */
  metaDot: 3,
  /** Unread dot on the food app bar's basket button, `w-2 h-2`. */
  badgeDot: 8,
  /** Map backdrop behind the booking sheet, `h-[442px]`. */
  mapBackdrop: 442,
  /** Booking sheet resting height, `h-[574px]`. */
  sheetHeight: 574,
  /** Drag handle on the booking sheet, `w-12 h-1.5`. */
  sheetHandleWidth: 48,
  sheetHandleHeight: 6,
  /** Pickup dot / destination square on the route timeline, `size-4`. */
  timelineNode: 16,
  /** Dashed connector between the two timeline nodes, `h-10`. */
  timelineConnector: 40,
  /** Ring drawn around each timeline node, `shadow-[0_0_0_3px_...]`. */
  timelineRing: 3,
  /** Column the timeline graphic occupies, `w-6`. */
  timelineColumn: 24,
  /** Full-width confirm button, `h-14`. */
  ctaHeight: 56,
  /** Gradient scrim over the map for top-bar legibility, `h-32`. */
  mapScrim: 128,
  /** Bottom padding that keeps sheet content clear of the sticky footer, `pb-24`. */
  sheetScrollPad: 96,
  /** The same job on the store screen, whose floating cart bar sits higher: `pb-32`. */
  cartScrollPad: 128,
  /** The same job on the checkout screen, under its taller action bar: `pb-[120px]`. */
  checkoutScrollPad: 120,
  /** The cart bar stops widening past this on a tablet, `max-w-md`. */
  cartBarMax: 448,
  /** Quick-action chip on the booking sheet, `py-2` over a 20px glyph. */
  quickAction: 40,
  /** Circular loader on the finding-driver sheet, `w-14 h-14`. */
  loader: 56,
  /** Filled disc centred inside that loader, `w-8 h-8`. */
  loaderCore: 32,
  /**
   * Ring thickness of that loader. The design draws it as `stroke-width: 3` on a
   * 24-unit viewBox, which at 56dp scales to 7.
   */
  loaderStroke: 7,
  /** User marker core on the finding-driver map, `w-10 h-10`. */
  mapMarker: 40,
  /** Marker's white ring, `border-4`. */
  mapMarkerRing: 4,
  /** Middle pulse disc behind the marker, `w-24 h-24`. */
  mapPulse: 96,
  /** Outer ping disc behind the marker, `w-48 h-48`. */
  mapPing: 192,
  /** Nearby-driver chip on the map, `w-8 h-8`. */
  driverMarker: 32,
  /** Route timeline node on the finding-driver sheet, `w-6 h-6`. */
  routeNode: 24,
  /** Profile header portrait, `w-20 h-20`. */
  avatarLg: 80,
  /** Chat list thread avatar and merchant glyph tile, `w-12 h-12`. */
  avatarMd: 48,
  /** Ring drawn around the profile portrait and the driver thread avatar, `border-2`. */
  avatarRing: 2,
  /** Unread-count badge on a chat thread row, `w-6 h-6`. */
  badge: 24,
  /** Composer send button on the conversation screen, `h-12 w-12`. */
  composerAction: 48,
  /** Search field on the chat list, `h-12`. */
  searchHeight: 48,
  /** Shorter search field on the food category screen, `h-9`. */
  searchHeightCompact: 36,
  /** Taller search field on the select-address sheet, `h-14`. */
  searchHeightTall: 56,
  /** Head of the draggable pin on the select-address map, `w-12 h-12`. */
  mapPinHead: 48,
  /** Ring pulsing out of that head, `-inset-4` around it. */
  mapPinPulse: 80,
  /**
   * `mb-32` on the pin overlay, which lifts the pin off the sheet covering the map's
   * lower half so it lands in the visible strip.
   */
  mapPinLift: 128,
  /**
   * The pin's downward point, drawn as a border triangle: `border-l-[12px]
   * border-r-[12px] border-t-[16px]`. The width is one side border, so the visible
   * triangle spans twice it.
   */
  mapPinTailWidth: 12,
  mapPinTailHeight: 16,
  /** Ground shadow ellipse under that pin, `w-6 h-2`. */
  mapPinShadowWidth: 24,
  mapPinShadowHeight: 8,
  /** White ring around the pin head, `border-2`. */
  mapPinRing: 2,
  /** Arrow under the pin's tooltip, a `w-3 h-3` square turned 45 degrees. */
  tooltipArrowWidth: 12,
  tooltipArrowHeight: 12,
  /** Callee portrait on the in-call screen, `w-32 h-32`. */
  avatarXl: 128,
  /** Ring drawn around that portrait, `border-4`. */
  avatarRingLg: 4,
  /** Mute / speaker / video control on the in-call screen, `w-14 h-14`. */
  callControl: 56,
  /** End-call button on the in-call screen, `w-20 h-20`. */
  callEnd: 80,
} as const;

/**
 * Translucent overlays from the markup's `bg-white/10`-style utilities. These have no
 * Material 3 token equivalent because they composite over an arbitrary backdrop.
 */
export const Overlay = {
  /** `bg-white/10` — icon button on the dark wallet card. */
  onDarkSubtle: 'rgba(255, 255, 255, 0.1)',
  /** `bg-white/20` — "NEW USERS" badge on the primary-filled promo. */
  onDarkStrong: 'rgba(255, 255, 255, 0.2)',
  /** The wallet card's blurred decorative disc, tinted with `primaryContainer`. */
  decoration: 'rgba(200, 255, 0, 0.08)',
  /**
   * `bg-primary/20` — the payment method's icon disc, and the 3px ring drawn around
   * the pickup node on the route timeline.
   */
  primarySoft: 'rgba(200, 255, 0, 0.2)',
  /** Ring around the destination node, `0 0 0 3px rgba(0,0,0,0.1)`. */
  ringInk: 'rgba(0, 0, 0, 0.1)',
  /** `bg-surface-variant/50` — resting fill of the payment method selector. */
  surfaceVariantSoft: 'rgba(243, 244, 246, 0.5)',
  /** Top of the map scrim, `from-black/20`. Fades to transparent. */
  mapScrim: 'rgba(0, 0, 0, 0.2)',
  /** Back button over the map, `bg-white/90`. */
  onMapSurface: 'rgba(255, 255, 255, 0.9)',
  /**
   * `bg-surface/50` — dims the map on the finding-driver screen. The design pairs it
   * with a 2px backdrop blur, which React Native cannot express without a blur view;
   * the tint alone carries the same contrast job.
   */
  surfaceHalf: 'rgba(249, 249, 252, 0.5)',
  /** `bg-error-container/40` — resting fill of the cancel-request button. */
  errorContainerSoft: 'rgba(255, 218, 214, 0.4)',
  /** `from-secondary/80` — top of the in-call screen's scrim over the blurred portrait. */
  secondarySoft: 'rgba(94, 93, 107, 0.8)',
  /**
   * `bg-surface/10`, also used for `border-surface/10`. The in-call controls pair this
   * with `backdrop-blur-md`, which React Native cannot express without a blur view; the
   * translucent fill alone carries the separation from the portrait behind it.
   */
  onSecondarySubtle: 'rgba(249, 249, 252, 0.1)',
  /** `bg-surface/5` — fill of the disabled video control. */
  onSecondaryFaint: 'rgba(249, 249, 252, 0.05)',
  /** `border-surface/20` — hairline around an enabled in-call control. */
  onSecondaryStroke: 'rgba(249, 249, 252, 0.2)',
  /** `text-on-secondary/30` — glyph of the disabled video control. */
  onSecondaryDisabled: 'rgba(255, 255, 255, 0.3)',
  /**
   * `bg-surface/80` — the favorite button floating over a merchant's cover art. The
   * design pairs it with `backdrop-blur-sm`, which React Native cannot express without
   * a blur view; the translucent fill alone carries the separation from the photo.
   */
  onImageSurface: 'rgba(249, 249, 252, 0.8)',
  /** `border-outline-variant/30` — hairline around a merchant card. */
  outlineVariantSoft: 'rgba(196, 202, 172, 0.3)',
  /**
   * `border-surface-variant/50` — the rule above the select-address sheet's sticky
   * footer. `surfaceVariantSoft` above shares the class name but carries an older
   * export's grey, so the two are not interchangeable.
   */
  surfaceVariantHalf: 'rgba(226, 226, 229, 0.5)',
  /** `placeholder:text-on-surface-variant/60` — the address search field's placeholder. */
  onSurfaceVariantMuted: 'rgba(67, 73, 51, 0.6)',
  /** `bg-primary-container/30` — the ring pulsing out of the draggable map pin. */
  primaryPulse: 'rgba(200, 255, 0, 0.3)',
  /**
   * `bg-surface-container-lowest/80` — the back and search buttons floating over the
   * store's hero photo. As with `onImageSurface` the design pairs it with
   * `backdrop-blur-sm`, which React Native cannot express without a blur view.
   */
  onHeroSurface: 'rgba(255, 255, 255, 0.8)',
} as const;

/** Opacities the markup applies directly, rather than via a color token. */
export const Opacity = {
  watermark: 0.2,
  /** `opacity-30` — the blurred portrait behind the in-call screen. */
  backdrop: 0.3,
  /** `opacity-75` — an archived chat thread row. */
  dimmed: 0.75,
  muted: 0.9,
  pressed: 0.7,
  pressedSubtle: 0.85,
  pressedText: 0.6,
} as const;

/** One-off accents in the markup that are outside the Material 3 token set. */
export const Accent = {
  /** Rating star, Tailwind `text-orange-500`. */
  star: '#f97316',
  /**
   * Promo savings and completed-trip states. The spec's colour section calls for
   * "standard Emerald for successful transactions"; the booking screen resolves that
   * to Tailwind `emerald-500`.
   */
  success: '#10b981',
  /**
   * Gold membership tier on the profile screen. The design writes these as literal hex
   * values rather than tokens, because the Material 3 set has no amber ramp: `#fff8e1`
   * fill, `#f57f17` glyph and text, `#ffe082` hairline.
   */
  gold: '#f57f17',
  goldContainer: '#fff8e1',
  goldStroke: '#ffe082',
} as const;

/**
 * Neutral ramp used by the booking sheet. The spec's Material 3 palette is tinted
 * toward the lime brand, which reads wrong against a map backdrop, so the booking
 * screens fall back to Tailwind's untinted grays. Values are Tailwind's own.
 */
export const Neutral = {
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
} as const;

export const Radius = {
  /**
   * Tailwind's own `rounded-sm` (0.125rem) and `rounded-md` (0.375rem). The design's
   * Tailwind config overrides DEFAULT/lg/xl/2xl but leaves these two at their stock
   * values, so they cannot be expressed on the spec's own scale.
   */
  tiny: 2,
  chip: 6,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  /** `rounded-2xl` on the booking sheet's top corners. Above the spec's `xl`. */
  xxl: 32,
  full: 9999,
} as const;

/** Minimum touch target height required by the spec. */
export const MinTouchTarget = 48;

/**
 * Level 2 elevation: white surface with a diffused 10% shadow.
 * Reserved for floating and temporary UI.
 */
export const ElevationLevel2 = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 20,
  elevation: 4,
} as const;

/** Tailwind `shadow-soft`: 0px 4px 20px rgba(0,0,0,0.05). */
export const ShadowSoft = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 20,
  elevation: 2,
} as const;

/** Tailwind `shadow-sm`: 0px 1px 2px rgba(0,0,0,0.05) — a badge over cover art. */
export const ShadowXs = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
} as const;

/**
 * Tailwind `shadow-md`, `0 4px 6px -1px rgba(0,0,0,0.1)` — a button floating over the
 * store hero. The CSS spread has no React Native equivalent and is folded into the radius.
 */
export const ShadowMd = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 5,
  shadowOpacity: 0.1,
  elevation: 3,
} as const;

/**
 * Tailwind `shadow-lg`, `0 10px 15px -3px rgba(0,0,0,0.1)` — the floating cart bar.
 * The CSS spread is folded into the radius, as with `ShadowMd`.
 */
export const ShadowRaised = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 10 },
  shadowRadius: 12,
  shadowOpacity: 0.1,
  elevation: 6,
} as const;

/**
 * `shadow-[0px_-4px_20px_rgba(0,0,0,0.05)]` — an upward shadow that separates a surface
 * from what sits above it, e.g. the store's info sheet lifting over the hero photo.
 */
export const ShadowRise = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: -4 },
  shadowRadius: 20,
  shadowOpacity: 0.05,
  elevation: 4,
} as const;

/**
 * `shadow-[0_-4px_20px_rgba(0,0,0,0.1)]` — the select-address sheet. Same geometry as
 * `ShadowRise` at twice the opacity, since the sheet floats over a map rather than a page.
 */
export const ShadowSheetRise = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: -4 },
  shadowRadius: 20,
  shadowOpacity: 0.1,
  elevation: 8,
} as const;

/** Tailwind `shadow-floating`: 0px 8px 30px rgba(0,0,0,0.1). */
export const ShadowFloating = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 8 },
  shadowRadius: 30,
  shadowOpacity: 0.1,
  elevation: 8,
} as const;

/**
 * The booking sheet's upward shadow, `0 -8px 20px -5px rgba(0,0,0,0.1)`. The CSS
 * spread (-5px) has no React Native equivalent, so it is folded into a tighter radius.
 */
export const ShadowSheet = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: -8 },
  shadowRadius: 15,
  shadowOpacity: 0.1,
  elevation: 16,
} as const;

/**
 * Tailwind `shadow-2xl`, `0 25px 50px -12px rgba(0,0,0,0.25)` — the in-call portrait.
 * As with `ShadowSheet`, the CSS spread has no React Native equivalent and is folded
 * into a tighter radius.
 */
export const ShadowDeep = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 25 },
  shadowRadius: 38,
  shadowOpacity: 0.25,
  elevation: 24,
} as const;

/** Tailwind `shadow-xl`, `0 20px 25px -5px rgba(0,0,0,0.1)` — the end-call button. */
export const ShadowLifted = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 20 },
  shadowRadius: 20,
  shadowOpacity: 0.1,
  elevation: 12,
} as const;

/**
 * `shadow-[0_4px_20px_rgba(200,255,0,0.3)]` — the lime glow under an active in-call
 * control. Android has no tinted elevation, so it renders as a plain lift there.
 */
export const ShadowGlow = {
  shadowColor: Palette.primaryContainer,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 20,
  shadowOpacity: 0.3,
  elevation: 8,
} as const;

/**
 * Both Stitch screens map `font-headline`/`font-display` to Plus Jakarta Sans and
 * `font-body`/`font-label` to Inter, so headings and text sit on different families.
 * Components reference these rather than spelling out a face name.
 */
export const FontFamily = {
  headline: 'PlusJakartaSans_700Bold',
  headlineSemi: 'PlusJakartaSans_600SemiBold',
  headlineBlack: 'PlusJakartaSans_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  /**
   * The in-call screen is the first to map `font-label` to Geist rather than Inter. Its
   * Google Fonts link requests only `Geist:wght@500;600`, and the one place it is used
   * asks for the lighter of the two, so 500 Medium is the face that ships.
   */
  label: 'Geist_500Medium',
  /**
   * The heavier of those two Geist weights. The store screen writes `font-bold` on its
   * label text, and 600 is the boldest face its own font link requests.
   */
  labelSemi: 'Geist_600SemiBold',
} as const;

export const Typography = {
  headlineXl: {
    fontFamily: FontFamily.headline,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.32,
  },
  /** `text-3xl font-bold` — the callee's name on the in-call screen. */
  headlineDisplay: {
    fontFamily: FontFamily.headline,
    fontSize: 30,
    lineHeight: 36,
  },
  headlineLg: {
    fontFamily: FontFamily.headline,
    fontSize: 24,
    lineHeight: 32,
  },
  headlineLgMobile: {
    fontFamily: FontFamily.headline,
    fontSize: 22,
    lineHeight: 28,
  },
  headlineMd: {
    fontFamily: FontFamily.headlineSemi,
    fontSize: 20,
    lineHeight: 28,
  },
  /** `font-headline font-bold text-lg` — the booking sheet's "Total dibayar" label. */
  headlineBase: {
    fontFamily: FontFamily.headline,
    fontSize: 18,
    lineHeight: 28,
  },
  /** `font-headline text-lg font-semibold` — a menu item's name on the store screen. */
  headlineBaseSemi: {
    fontFamily: FontFamily.headlineSemi,
    fontSize: 18,
    lineHeight: 28,
  },
  /** `font-headline font-bold text-base` — section titles inside the booking sheet. */
  headlineSm: {
    fontFamily: FontFamily.headline,
    fontSize: 16,
    lineHeight: 20,
  },
  /** `font-headline font-semibold text-base` — the cart bar's "View Cart". */
  headlineSmSemi: {
    fontFamily: FontFamily.headlineSemi,
    fontSize: 16,
    lineHeight: 20,
  },
  /**
   * `font-headline text-[15px] font-semibold` — the card headings on the food checkout
   * screen, half a step below `headlineSmSemi`. Tokenised rather than inlined for the same
   * reason `caption` tokenises the design's `text-[11px]`.
   */
  headlineXsSemi: {
    fontFamily: FontFamily.headlineSemi,
    fontSize: 15,
    lineHeight: 20,
  },
  bodyLg: {
    fontFamily: FontFamily.body,
    fontSize: 18,
    lineHeight: 28,
  },
  /** `text-lg font-medium` — the callee's role under their name on the in-call screen. */
  bodyLgMedium: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 18,
    lineHeight: 28,
  },
  bodyMd: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
  },
  /** `text-body-md font-semibold` — the unread preview line on a chat thread row. */
  bodyMdSemi: {
    fontFamily: FontFamily.bodySemi,
    fontSize: 16,
    lineHeight: 24,
  },
  /** `text-sm` body copy — fare rows, payment method labels. */
  bodySm: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
  },
  /** `text-sm font-medium` — fare-row labels and the promo code input. */
  bodySmMedium: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  /** `text-xs font-medium` — the balance under a payment method name. */
  bodyXs: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  /**
   * `text-xs font-medium uppercase tracking-wider` — the JEMPUT / TUJUAN labels above
   * each route stop. `tracking-wider` is 0.05em, which at 12px is 0.6pt.
   */
  overline: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
  },
  /**
   * `text-xl font-label tracking-widest uppercase` — the ringing status on the in-call
   * screen. `tracking-widest` is 0.1em, which at 20px is 2pt. The uppercasing is applied
   * at the usage site, matching how `overline` is consumed.
   */
  overlineLg: {
    fontFamily: FontFamily.label,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 2,
  },
  labelMd: {
    fontFamily: FontFamily.bodySemi,
    fontSize: 14,
    lineHeight: 20,
  },
  /**
   * `font-label text-label-sm uppercase tracking-wider` — the SAVED ADDRESSES and RECENT
   * PLACES section headers on the select-address sheet. Same size and tracking as
   * `overline`, but drawn in the label family the way the markup asks. The uppercasing is
   * applied at the usage site, as with the other overline variants.
   */
  overlineLabel: {
    fontFamily: FontFamily.label,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
  },
  /** `font-label text-sm` — the store's distance and ETA, and the cart bar's item count. */
  labelBase: {
    fontFamily: FontFamily.label,
    fontSize: 14,
    lineHeight: 20,
  },
  /** `font-label text-sm font-semibold` — a category tab on the store screen. */
  labelBaseSemi: {
    fontFamily: FontFamily.labelSemi,
    fontSize: 14,
    lineHeight: 20,
  },
  /**
   * `font-label font-bold` at the body base size — a menu item's price and the quantity
   * between the stepper's two glyphs.
   */
  priceLabel: {
    fontFamily: FontFamily.labelSemi,
    fontSize: 16,
    lineHeight: 24,
  },
  /**
   * `font-label text-headline-md font-bold` — the grand total on the food checkout screen
   * and the same figure repeated in its bottom bar. Geist ships no 700 face here, so 600
   * SemiBold is the boldest weight available, as with `labelBaseSemi`.
   */
  priceHeadline: {
    fontFamily: FontFamily.labelSemi,
    fontSize: 20,
    lineHeight: 28,
  },
  labelSm: {
    fontFamily: FontFamily.bodySemi,
    fontSize: 12,
    lineHeight: 16,
  },
  /** `text-[10px] font-bold uppercase tracking-wider` — badge labels in the markup. */
  labelXs: {
    fontFamily: FontFamily.bodySemi,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
  /**
   * `text-[10px]` timestamps under a chat bubble. Same size as `labelXs` but without
   * that variant's badge tracking, which the design does not apply here.
   */
  timestamp: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    lineHeight: 14,
  },
  /** `text-[11px]` fine print, e.g. the fare disclaimer under the total. */
  caption: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
  },
  /**
   * The spec's `price-display` token. Its typography section requires every Rupiah
   * value to use this, so financial figures stay the most legible thing on screen.
   */
  priceDisplay: {
    fontFamily: FontFamily.headline,
    fontSize: 22,
    lineHeight: 24,
  },
  /**
   * Grand total, `font-headline font-black text-2xl`. Plus Jakarta Sans ships no 900
   * weight, so 800 ExtraBold is the closest available.
   */
  priceTotal: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 24,
    lineHeight: 32,
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof Typography;
