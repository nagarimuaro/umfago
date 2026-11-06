---
name: Lanturan Digital
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1c1c'
  surface-container: '#1f2020'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e4e2e1'
  on-surface-variant: '#c4caac'
  inverse-surface: '#e4e2e1'
  inverse-on-surface: '#303030'
  outline: '#8e9479'
  outline-variant: '#434933'
  surface-tint: '#a8d700'
  primary: '#ffffff'
  on-primary: '#273500'
  primary-container: '#c0f500'
  on-primary-container: '#546d00'
  inverse-primary: '#4f6600'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#ffffff'
  on-tertiary: '#2f3131'
  tertiary-container: '#e2e2e2'
  on-tertiary-container: '#636565'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c0f500'
  primary-fixed-dim: '#a8d700'
  on-primary-fixed: '#161f00'
  on-primary-fixed-variant: '#3b4d00'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#131313'
  on-background: '#e4e2e1'
  surface-variant: '#353535'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  currency-display:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

The design system is engineered for high-growth Indonesian startups, blending **Modern Corporate** reliability with **High-Contrast Bold** energy. It targets a tech-savvy audience that demands speed and clarity. The interface prioritizes high-impact visual hierarchies to drive conversion and trust.

The aesthetic utilizes a "Dark Mode First" philosophy, leaning into a charcoal and lime green palette that feels premium yet disruptive. White space is used strategically to prevent visual fatigue, while bold accents guide the user toward key transactional actions. All interface copy is strictly in Indonesian to ensure local resonance and accessibility.

## Colors

The palette is anchored by a high-visibility Lime Green (`#C8FF00`), used exclusively for primary actions and critical highlights. To ensure WCAG 2.1 compliance, all text placed on Lime Green surfaces must be absolute black (`#000000`).

- **Primary:** Lime Green (`#C8FF00`) — Success states, primary buttons, active indicators.
- **Surface:** Charcoal Grey (`#1A1A1A`) — Backgrounds and deep containers.
- **Elevated Surface:** Medium Grey (`#2D2D2D`) — Cards, modals, and input fields.
- **Typography:** White (`#FFFFFF`) for primary text on dark backgrounds; Black (`#000000`) for text on Lime Green.

## Typography

Typography uses a tri-font system to balance character and utility. **Hanken Grotesk** provides a sharp, contemporary look for headlines. **Inter** handles the bulk of the Indonesian body copy for maximum legibility. **JetBrains Mono** is used sparingly for labels and data-heavy points to evoke a technical, precise feel.

**Currency Formatting:** All monetary values must be prefixed with "Rp" followed by a space and period-separated thousands (e.g., Rp 1.500.000). Use the `currency-display` token for balance overviews.

## Layout & Spacing

This design system utilizes a **Fluid Grid** model based on an 8px square baseline. 

- **Desktop:** 12-column grid with 24px gutters and 64px side margins.
- **Tablet:** 8-column grid with 16px gutters and 32px side margins.
- **Mobile:** 4-column grid with 16px gutters and 16px side margins.

Horizontal spacing between related elements (like an icon and a label) should use `xs` (4px) or `base` (8px). Vertical section spacing should typically follow the `lg` (48px) token to maintain a sense of openness despite the dark color scheme.

## Elevation & Depth

Depth is achieved through **Tonal Layers** rather than heavy shadows. In a dark environment, elevation is communicated by lightening the surface color.

1.  **Level 0 (Base):** Charcoal Grey (`#1A1A1A`) for the main canvas.
2.  **Level 1 (Cards/Items):** Medium Grey (`#2D2D2D`) with a subtle 1px border of `#3D3D3D`.
3.  **Level 2 (Modals/Popovers):** Lightened Grey (`#3D3D3D`) with a soft, diffused black shadow (0px 8px 24px rgba(0,0,0,0.5)).

Avoid using glows on Lime Green elements; keep them flat to maintain a "Brutalist-Lite" edge.

## Shapes

The shape language is **Soft** but disciplined. 
- Standard components (Buttons, Inputs) use a 0.25rem (4px) radius to maintain a professional, slightly technical appearance.
- Larger containers like Cards use `rounded-lg` (8px).
- Status badges and Tags use `rounded-xl` (12px) for distinct visual separation from functional buttons.

## Components

### Buttons
- **Primary:** Lime Green background, Black text, Bold weight. Label: "Simpan," "Lanjut," or "Bayar Sekarang."
- **Secondary:** Charcoal background, 1px Lime Green border, Lime Green text.
- **Ghost:** No background, White text.

### Input Fields
- Background: `#2D2D2D`. Border: 1px `#3D3D3D`. 
- Placeholder text in light grey. 
- On focus: Border changes to Lime Green.

### Chips/Badges
- Small, uppercase labels using JetBrains Mono. 
- Success states: Lime Green background with Black text.

### Cards
- Background: `#2D2D2D`. 
- Padding: `md` (24px).
- Use for grouping transaction details or product info.

### List Items
- Divided by 1px `#2D2D2D` lines. 
- Standard Indonesian labels: "Riwayat Transaksi," "Pengaturan Akun," "Keluar."

### Currency Input
- Fixed "Rp" prefix on the left side of the input field. 
- Auto-formatting for thousands separators during user entry.