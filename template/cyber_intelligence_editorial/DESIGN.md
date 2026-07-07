---
name: Cyber-Intelligence Editorial
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1b'
  surface-container: '#1f1f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#e4bebc'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#303030'
  outline: '#ab8987'
  outline-variant: '#5b403f'
  surface-tint: '#ffb3b1'
  primary: '#ffb3b1'
  on-primary: '#680011'
  primary-container: '#ff535b'
  on-primary-container: '#5b000e'
  inverse-primary: '#bb152c'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#c8c6c5'
  on-tertiary: '#313030'
  tertiary-container: '#929090'
  on-tertiary-container: '#2a2a2a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b1'
  on-primary-fixed: '#410007'
  on-primary-fixed-variant: '#92001c'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e2e2e2'
  surface-variant: '#353535'
  system-red: '#E63946'
  terminal-gray: '#212121'
  matrix-dim: '#0D1117'
  data-green: '#00FF41'
typography:
  headline-xl:
    fontFamily: Anton
    fontSize: 72px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Anton
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.1'
  headline-lg-mobile:
    fontFamily: Anton
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Anton
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.1em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: '1.4'
spacing:
  margin-page: 2rem
  gutter: 1.5rem
  section-gap: 4rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style

This design system is built for a high-stakes digital news environment that prioritizes investigative journalism and technological transparency. The aesthetic is a hybrid of **Corporate Modern** and **Futuristic HUD (Heads-Up Display)**, drawing inspiration from high-density data terminals and intelligence command centers.

The emotional response should be one of urgency, authority, and tactical precision. We utilize a high-contrast dark mode to create a focused, "lights-out" environment where content is the primary source of illumination. Subtle technical details—such as hairline borders, monospaced accents, and micro-interactions—evoke the feeling of navigating a secure system rather than a standard blog.

Key visual pillars include:
- **Technological Sophistication:** Clean lines and precise alignment.
- **Aggressive Editorial:** Bold, condensed typography for headlines that demand attention.
- **Digital Depth:** Layered interfaces using opacity and fine outlines rather than heavy shadows.

## Colors

The palette is strictly nocturnal, anchored by a "Pure Black" (`#000000`) background to maximize contrast and energy efficiency on OLED displays. 

- **Primary Red:** Used for critical alerts, breaking news tags, and high-priority calls to action. It represents the "hack" or the intervention in the system.
- **Monochrome Foundation:** White and varying shades of deep gray provide the structural hierarchy. Grays are used to differentiate "surface" layers (e.g., cards, navigation bars) from the deep background.
- **Accents:** A very limited use of "Data Green" is permitted for micro-labels or monospaced system status indicators to lean into the technical aesthetic. 

**Prohibition:** Blue is strictly excluded from the palette to differentiate the identity from traditional corporate or social media platforms.

## Typography

The typographic system uses a three-tier font strategy to balance impact with legibility:

1.  **Display (Anton):** Used for main headlines. Its condensed, bold nature mirrors the urgency of news tickers and tabloid-style investigative headers.
2.  **Body (Hanken Grotesk):** A modern, high-legibility sans-serif for articles. It provides a clean, neutral reading experience that offsets the aggressive headlines.
3.  **Technical (JetBrains Mono):** Used for metadata, timestamps, categories, and HUD elements. This monospaced font reinforces the "hacker" and technical narrative of the brand.

All headlines should favor tight line-heights and slight negative letter spacing to create a dense, "heavy" visual weight.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid Grid**. Content is housed within a 12-column system with a maximum width of 1440px for desktop to ensure line lengths remain readable.

- **High-Density Information:** In "News Feed" or "Intelligence Dashboard" views, gutters are reduced to 1rem to pack information efficiently, mimicking Bloomberg terminals.
- **Editorial Focus:** For long-form investigative pieces, the layout shifts to a single-column centered format with wide margins (at least 20% on each side) to minimize distractions.
- **Mobile Adaptation:** At the 768px breakpoint, the grid collapses to 4 columns. Headlines scale down significantly to ensure they do not break across too many lines.

## Elevation & Depth

This system avoids traditional shadows to maintain a flat, digital-first look. Depth is instead conveyed through:

- **Low-Contrast Outlines:** Surfaces are defined by 1px solid borders in `terminal-gray` or low-opacity white (10-15%).
- **Tonal Stepping:** The base background is `#000000`. Hovered cards or active containers lift into `#1A1A1A`. 
- **Backdrop Blurs:** On overlays or navigation menus, a heavy backdrop blur (20px+) with a 70% opacity dark tint is used to create a "glass terminal" effect.
- **HUD Lines:** Decorative vertical and horizontal hairlines that extend beyond the container edges suggest a continuous grid or scanning system.

## Shapes

The design system utilizes **Sharp (0px)** corners for all primary containers, buttons, and image wrappers. Rounded corners are seen as too "friendly" or "consumer-grade" for this aesthetic. 

Small exceptions can be made for "system pips" or status indicators (e.g., a "Live" recording dot), which remain perfectly circular. Otherwise, the geometry is strictly rectangular to reinforce the architectural and technical nature of the system.

## Components

### Buttons & Navigation
- **Primary Button:** Solid `system-red` background, black text (Anton), sharp corners. No gradients.
- **Ghost Button:** 1px `secondary-color` border, white text (JetBrains Mono).
- **Navigation:** Top-tier navigation uses all-caps JetBrains Mono with a red underline indicator for the active state.

### Cards & News Items
- **News Card:** No background fill by default. Separated by thin 1px horizontal lines. 
- **Image Treatment:** Images should have a slight desaturation or a very subtle dark-to-transparent gradient overlay to ensure text legibility if headlines overlap.

### HUD Elements
- **Data Tags:** Small monospaced labels in boxes (e.g., [TOP SECRET], [BREAKING], [SOURCE: ENCRYPTED]).
- **Matrix Backgrounds:** In specific "Deep Dive" sections or the footer, use a low-opacity (3-5%) scrolling code rain effect, restricted to a very dark gray to ensure it doesn't distract from the content.

### Inputs
- Inputs should look like terminal prompts. Use a 1px bottom border only, with a JetBrains Mono typeface and a blinking underscore cursor animation on focus.