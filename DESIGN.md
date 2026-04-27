---
name: Quimera AI
colors:
  # ── Light Mode (Default) ─────────────────────────────────────────────────
  light:
    surface: "#F2F0EB"
    surface-dim: "#E8E5DE"
    surface-bright: "#FDFCFA"
    surface-container-lowest: "#FFFFFF"
    surface-container-low: "#FDFCFA"
    surface-container: "#F5F4F0"
    surface-container-high: "#EFEDE7"
    surface-container-highest: "#E8E5DE"
    on-surface: "#1A1816"
    on-surface-variant: "#4A4640"
    inverse-surface: "#1A1816"
    inverse-on-surface: "#F5F4F0"
    outline: "#B5B0A5"
    outline-variant: "#D1CEC5"
    primary: "#FBB92B"
    on-primary: "#1A1610"
    primary-container: "#FFEDB3"
    on-primary-container: "#4A3A10"
    inverse-primary: "#FBB92B"
    secondary: "#E2DFD6"
    on-secondary: "#1E1C17"
    secondary-container: "#E2DFD6"
    on-secondary-container: "#1E1C17"
    tertiary: "#7F22DD"
    on-tertiary: "#FFFFFF"
    tertiary-container: "#F2E9FC"
    on-tertiary-container: "#4C1584"
    error: "#DC2626"
    on-error: "#FFFFFF"
    error-container: "#FEE2E2"
    on-error-container: "#991B1B"
    background: "#F2F0EB"
    on-background: "#1A1816"
    surface-variant: "#E8E5DE"

  # ── Dark Mode ("Night Violet") ───────────────────────────────────────────
  dark:
    surface: "#1E1535"
    surface-dim: "#150E28"
    surface-bright: "#3D3060"
    surface-container-lowest: "#120C22"
    surface-container-low: "#1E1535"
    surface-container: "#251B42"
    surface-container-high: "#30254D"
    surface-container-highest: "#3B2F58"
    on-surface: "#F7F7F7"
    on-surface-variant: "#A49EBD"
    inverse-surface: "#F7F7F7"
    inverse-on-surface: "#1E1535"
    outline: "#524A6E"
    outline-variant: "#3D3060"
    surface-tint: "#FBB92B"
    primary: "#FBB92B"
    on-primary: "#150E28"
    primary-container: "#4A3A10"
    on-primary-container: "#FFEDB3"
    inverse-primary: "#FBB92B"
    secondary: "#402E6B"
    on-secondary: "#FFFFFF"
    secondary-container: "#402E6B"
    on-secondary-container: "#FFFFFF"
    tertiary: "#A855F7"
    on-tertiary: "#FFFFFF"
    tertiary-container: "#4C1584"
    on-tertiary-container: "#E5D3F8"
    error: "#EF4444"
    on-error: "#FFFFFF"
    error-container: "#7F1D1D"
    on-error-container: "#FECACA"
    background: "#1E1535"
    on-background: "#F7F7F7"
    surface-variant: "#30254D"

  # ── OLED Black Mode ──────────────────────────────────────────────────────
  black:
    surface: "#000000"
    surface-dim: "#000000"
    surface-bright: "#1A1A1A"
    surface-container-lowest: "#000000"
    surface-container-low: "#0A0A0A"
    surface-container: "#0F0F0F"
    surface-container-high: "#1A1A1A"
    surface-container-highest: "#262626"
    on-surface: "#FFFFFF"
    on-surface-variant: "#B3B3B3"
    outline: "#333333"
    outline-variant: "#262626"
    primary: "#FBB92B"
    on-primary: "#000000"
    background: "#000000"
    on-background: "#FFFFFF"
    surface-variant: "#1A1A1A"

  # ── Accent Palettes (user-selectable) ────────────────────────────────────
  accent-palettes:
    cadmium-yellow:
      primary: "#FBB92B"
      50: "#FFF9E6"
      100: "#FFF3CC"
      500: "#FBB92B"
      700: "#C48A00"
      900: "#5C4000"
    blue-violet:
      primary: "#7F22DD"
      50: "#F2E9FC"
      100: "#E5D3F8"
      500: "#7F22DD"
      700: "#4C1584"
      900: "#19072C"
    amber-glow:
      primary: "#FF9D00"
      50: "#FFF5E5"
      100: "#FFEBCC"
      500: "#FF9D00"
      700: "#995E00"
      900: "#331F00"
    emerald-teal:
      primary: "#10B981"
      50: "#ECFDF5"
      100: "#D1FAE5"
      500: "#10B981"
      700: "#047857"
      900: "#064E3B"
    rose-coral:
      primary: "#F43F5E"
      50: "#FFF1F2"
      100: "#FFE4E6"
      500: "#F43F5E"
      700: "#BE123C"
      900: "#881337"

typography:
  display-lg:
    fontFamily: Ubuntu
    fontSize: 60px
    fontWeight: "700"
    lineHeight: 66px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Ubuntu
    fontSize: 36px
    fontWeight: "700"
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Ubuntu
    fontSize: 24px
    fontWeight: "700"
    lineHeight: 32px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: "600"
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: "400"
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: "600"
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 16px
    letterSpacing: 0.02em
  label-xs:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: "700"
    lineHeight: 14px
    letterSpacing: 0.08em
    textTransform: uppercase

rounded:
  xs: 0.125rem
  sm: 0.25rem
  DEFAULT: 0.375rem
  md: 0.5rem
  lg: 0.75rem
  xl: 1.25rem
  2xl: 1.5rem
  full: 9999px

spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
  section-padding: 24px
  card-gap: 16px
  section-margin: 40px
  container-max-width: 1280px

elevation:
  glass-blur-standard: 24px
  glass-blur-elevated: 40px
  glass-saturation: 1.6
  shadow-sm: "0 1px 2px rgba(0, 0, 0, 0.05)"
  shadow-md: "0 4px 12px rgba(0, 0, 0, 0.08)"
  shadow-lg: "0 8px 32px rgba(0, 0, 0, 0.12)"
  shadow-xl: "0 16px 48px rgba(0, 0, 0, 0.18)"
  shadow-card-hover: "0 20px 40px -12px rgba(0, 0, 0, 0.25)"
  shadow-glow-primary: "0 0 20px rgba(251, 185, 43, 0.3)"
  shadow-glow-violet: "0 0 20px rgba(127, 34, 221, 0.3)"

motion:
  duration-fast: 150ms
  duration-normal: 200ms
  duration-slow: 350ms
  duration-dramatic: 600ms
  easing-default: "ease-out"
  easing-spring: "cubic-bezier(0.22, 1, 0.36, 1)"
  easing-bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)"
  easing-drawer: "cubic-bezier(0.32, 0.72, 0, 1)"

components:
  glass-card-standard:
    backgroundColor: "rgba(var(--card-rgb), 0.55)"
    backdropFilter: "blur(24px) saturate(1.6)"
    border: "1px solid rgba(var(--border-rgb), 0.35)"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  glass-card-elevated:
    backgroundColor: "rgba(var(--card-rgb), 0.60)"
    backdropFilter: "blur(16px) saturate(1.4)"
    border: "1px solid rgba(var(--border-rgb), 0.30)"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  button-primary:
    backgroundColor: "{colors.dark.primary}"
    textColor: "{colors.dark.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.DEFAULT}"
    height: 36px
    padding: 0 16px
  button-primary-hover:
    backgroundColor: "rgba(251, 185, 43, 0.9)"
  button-secondary:
    backgroundColor: "{colors.dark.secondary}"
    textColor: "{colors.dark.on-secondary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.DEFAULT}"
    height: 36px
    padding: 0 16px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.dark.on-surface-variant}"
    typography: "{typography.label-md}"
    rounded: "{rounded.DEFAULT}"
  button-destructive:
    backgroundColor: "{colors.dark.error}"
    textColor: "#FFFFFF"
    typography: "{typography.label-md}"
    rounded: "{rounded.DEFAULT}"
  input-field:
    backgroundColor: transparent
    textColor: "{colors.dark.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.DEFAULT}"
    border: "1px solid {colors.dark.outline}"
    height: 36px
    padding: 0 12px
  editor-control-section:
    backgroundColor: transparent
    border: "0 0 1px 0 solid rgba(var(--editor-border-rgb), 0.55)"
    rounded: 0
    padding: "0 0 16px 0"
    gap: 12px
  editor-control-input:
    backgroundColor: "rgba(var(--editor-bg-rgb), 0.80)"
    border: "1px solid rgba(var(--editor-border-rgb), 0.70)"
    rounded: "{rounded.DEFAULT}"
    height: 36px
    padding: "0 12px"
    focusRing: "0 0 0 2px rgba(var(--editor-accent-rgb), 0.25)"
  editor-switch-small:
    track: "36px x 20px"
    knob: "16px x 16px"
    knobOffset: 2px
    checkedTranslateX: 16px
  editor-switch-medium:
    track: "44px x 24px"
    knob: "20px x 20px"
    knobOffset: 2px
    checkedTranslateX: 20px
  stat-card-premium:
    backgroundColor: "rgba(var(--card-rgb), 0.60)"
    backdropFilter: "blur(16px) saturate(1.4)"
    border: "1px solid rgba(var(--border-rgb), 0.30)"
    rounded: "{rounded.2xl}"
    padding: "{spacing.lg}"
  nav-pill-active:
    backgroundColor: "{colors.dark.primary}"
    textColor: "{colors.dark.on-primary}"
    rounded: "{rounded.lg}"
    fontWeight: "700"
  sidebar-item:
    backgroundColor: transparent
    textColor: "{colors.dark.on-surface-variant}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  sidebar-item-hover:
    backgroundColor: "rgba(var(--secondary-rgb), 0.80)"
    textColor: "{colors.dark.on-surface}"
  sidebar-item-active:
    backgroundColor: "{colors.dark.primary}"
    textColor: "#FFFFFF"
    fontWeight: "700"
---

## Brand & Style

Quimera AI's design system embodies a **premium SaaS builder aesthetic** — the marriage of a powerful, feature-dense admin dashboard with a clean, modern editor that produces client-facing marketing websites. The brand personality is **confident, warm, and sophisticated**, inspired by the Claude/Anthropic warmth palette crossed with a regal night-violet depth.

The product operates in two distinct visual contexts: the **Admin Dashboard** (where the owner manages websites, leads, e-commerce, and analytics) and the **Website Builder / Preview** (where generated client websites are rendered). The design system described here covers the Admin Dashboard, which is the product's primary interface.

The emotional tone is **professional luxury without pretension**. Glassmorphism, ambient glows, and carefully calibrated transparency layers create a sense of depth and refinement. The signature **Cadmium Yellow** (#FBB92B) accent cuts through the deep violet canvas like a warm beacon — functional, optimistic, and instantly recognizable.

## Colors

The palette is built on a tri-modal theming system: **Light**, **Dark (Night Violet)**, and **OLED Black**. Each mode shares the same accent hierarchy but shifts the neutrals dramatically.

### Light Mode — "Warm Parchment"
A Claude-inspired canvas with warm off-white backgrounds (#F2F0EB — reminiscent of sunlit parchment) and deep charcoal text (#1A1816). Borders carry a barely-perceptible warmth (hsl 36° saturation) to avoid the clinical coldness of pure gray UIs.

### Dark Mode — "Night Violet"
The signature mode. Deep saturated violet (hsl 270° 48% 11% → #1E1535) forms the base canvas, with card surfaces lifted into slightly brighter violet layers (hsl 268° 38% 18%). This creates a jewel-toned depth reminiscent of a nighttime luxury interface. Muted violet (#A49EBD) serves as secondary text, while pure near-white (#F7F7F7) ensures WCAG AA contrast for body copy.

### OLED Black Mode
True black (#000000) with minimal gray surfaces (#0F0F0F cards). Designed for power users who prefer maximum contrast and battery savings on OLED displays.

### Accent System
The **Cadmium Yellow** (#FBB92B) is the default and signature primary accent — it appears on active navigation pills, CTA buttons, focus rings, and editor highlights. Users can swap to four alternative palettes: **Blue Violet** (#7F22DD), **Amber Glow** (#FF9D00), **Emerald Teal** (#10B981), and **Rose Coral** (#F43F5E). Each palette overrides the primary, ring, and accent tokens while preserving the base surface system.

### Semantic Roles
- **Primary (Cadmium Yellow):** Active states, CTA buttons, focus rings, navigation pills, editor highlights
- **Secondary (Muted Violet / Warm Sand):** Hover backgrounds, secondary containers, section headers
- **Destructive (Red):** Error states, delete confirmations, destructive actions
- **Muted (Low-contrast Violet / Sand):** Disabled states, secondary text, placeholder content

## Typography

The system uses a deliberate **two-font pairing** to create visual hierarchy between structural elements and content:

- **Ubuntu** (300–700): Used for headers, navigation branding, and display text. Its humanist, rounded terminals create a friendly yet authoritative presence. The thin weight (300) is used for oversized decorative numerals on status cards.
- **Plus Jakarta Sans** (400–700): Used for body copy, labels, and form elements. Its geometric clarity and excellent x-height make it highly legible at small scales, complementing Ubuntu's more expressive character at larger sizes.

### Hierarchy Strategy
- **Display:** Ubuntu Bold at 60px with -0.03em tracking — used for hero headlines in generated websites.
- **Headlines:** Ubuntu Bold 36→24px with negative tracking for tight, impactful section titles.
- **Body:** Plus Jakarta Sans Regular 16–18px with generous 24–28px line heights for comfortable reading.
- **Labels:** Plus Jakarta Sans Semi-Bold 14px with slight tracking expansion for buttons and metadata.
- **Micro:** Plus Jakarta Sans Bold 11px, uppercase with 0.08em tracking — used for section dividers and badges ("RESUMEN", "WEBSITES", "E-COMMERCE").

The dashboard sidebar uses font-size 15px on mobile and 14px (text-sm) on desktop to optimize for touch targets versus information density.

## Layout & Spacing

The layout follows a **sidebar-plus-content** architecture. The sidebar is collapsible (80px icon-only → 288px expanded) with a smooth spring-eased transition. The main content area uses a max-width of 1280px with 24–32px outer padding.

- **Grid System:** CSS Grid for dashboard cards (1→2→3 columns at responsive breakpoints). Flex for sidebar navigation and card interiors.
- **Spacing Scale:** An 8px base unit governs all spacing, with named stops from 4px (xs) through 64px (2xl).
- **Section Rhythm:** Dashboard sections are separated by 40px vertical margins. Cards within a section use 16px gaps.
- **Container Queries:** The website preview pane uses CSS Container Queries (not viewport queries) for responsive behavior, allowing the preview to react to its own container width regardless of the desktop panel layout.

## Elevation & Depth

Depth is achieved through a sophisticated **glassmorphism layering system** combined with ambient glow effects:

### The Glass Stack
- **Level 0 (Canvas):** Solid background color. In dark mode, this is the deep Night Violet (#1E1535).
- **Level 1 (Sidebar):** 95% opacity background with 12px blur. A subtle 1px border-right at 25% opacity separates it from the content.
- **Level 2 (Glass Card):** 55% card opacity + 24px blur + 1.6× saturation. A triple shadow stack (1px close + 8px spread + inner top highlight at 4% white) creates floating depth.
- **Level 3 (Stat Card / Modal):** 60% card opacity + 16px blur + 1.4× saturation. A gradient overlay (primary color at 4% → transparent) adds a warm wash.
- **Level 4 (Elevated Hover):** Cards lift with translateY(-8px) and intensified shadows on hover.

### Ambient Glows
Large radial gradients float behind the glass stack:
- **Violet Glow:** A 60% width, 50% height ellipse of hsl(268° 60% 50% / 0.08), blurred at 60px, slowly drifts via a 15s animation.
- **Gold Glow:** A 50% width, 40% height ellipse of hsl(41° 96% 58% / 0.06), blurred at 50px, drifts in reverse.

These glows are never directly visible — they are perceived as a subtle, living luminosity behind the frosted glass surfaces.

### Inner Shine
A 1px horizontal gradient line (transparent → 8% white → 12% white → 8% white → transparent) sits at the top edge of glass surfaces, simulating a light source above the interface.

## Shapes

The shape language is **subtly rounded** — professional enough for a SaaS platform, but never cold or rigid.

### Buttons & Inputs
Buttons use `rounded-md` (6px) — a compact, functional radius that conveys precision. Input fields share this radius. Focus rings use the primary accent color at 50% opacity with a 3px spread.

### Cards & Containers
Dashboard cards use `rounded-2xl` (24px) for status cards and `rounded-xl` (20px) for checkout/modal surfaces. Glassmorphic cards use `rounded-lg` (12px). This graduated system creates a clear hierarchy: larger = more important / more elevated.

### Navigation
Active sidebar pills use `rounded-lg` (12px) with a full-width fill of the primary color. Collapsed sidebar items use the same radius but with a centered 48px width.

### Icons
Functional icons must come from `lucide-react`. Navigation uses 22px icons with 2px stroke weight, page sections use 18px, and inline/editor actions use 14-16px. Editor control panels use `strokeWidth={1.8}` for a cleaner technical feel. Do not use unicode arrows, checks, crosses, dots, or decorative glyphs for editor controls; use Lucide equivalents such as `ArrowUp`, `ArrowDownRight`, `CircleDot`, `Check`, and `X`.

## Editor Control Design

The Web Editor, Template Editor, Landing Page Editor, and Agency Editor must share one control-panel treatment. The goal is a clean builder surface that keeps the original Quimera premium feel, but removes excess nested boxes so users can scan, understand, and act quickly.

The Real Estate Listings controls are the reference treatment for editor panels: compact section headers with Lucide icons, clear grouping, generous but controlled spacing, and no unnecessary framed cards around every option. Editor controls should feel like a professional tool surface, not a stack of decorative cards.

### Panel Structure
- Use `.quimera-clean-controls` on editor side panels and modal form panels that contain grouped controls.
- Control groups are separated with subtle bottom borders and spacing, not heavy card backgrounds.
- Avoid cards inside cards. Use transparent group backgrounds, no extra shadows, and no rounded container when a divider is enough.
- Keep the hierarchy to three levels: panel, section group, individual control. Do not add extra wrappers unless needed for layout.
- Each major control group should have a small Lucide icon and an 11px uppercase label. Use concise labels that describe the control area, not explanatory text.

### Inputs & Selectors
- Inputs, selects, and textareas use a quiet editor surface: `bg-editor-bg/80`, a 1px editor border, 6px radius, and a 2px accent focus ring at low opacity.
- Keep control padding consistent: 12px horizontal padding for text fields, 10-12px internal gaps for rows, and 12-16px vertical rhythm between related controls.
- Segmented tabs should be flat and subtle. Use a light editor surface for the tab rail and an accent-tinted active state; avoid oversized pill cards.
- Icon-only buttons are preferred for standard tool actions when the icon is widely understood. Add a title or tooltip for clarity.

### Switches
Switches must use absolute knob positioning so the knob has equal spacing in the off and on states. The visual margin at the left edge and right edge must match exactly.

- Small editor switch: track `w-9 h-5` (36x20), knob `w-4 h-4` (16x16), knob offset `left-0.5 top-0.5` (2px), checked transform `translate-x-[16px]`.
- Medium editor switch: track `w-11 h-6` (44x24), knob `w-5 h-5` (20x20), knob offset `top: 2px`. Prefer explicit anchors: unchecked `left: 2px`, checked `right: 2px`, with no transform. If transform is used, it must be exactly `translate-x-[20px]`.
- Do not center switch knobs with flex, padding math, or approximate transforms. These cause the checked state to look tighter on the right side or push the knob outside the track.
- The active track may use the editor accent color. The inactive track should stay neutral with a visible border.

### Icon Hierarchy
- Every editor section header should use a Lucide icon so the panel has a consistent visual rhythm.
- Repeated row actions use 14-16px Lucide icons.
- Drag handles, visibility states, validation states, close buttons, checks, and directional controls must be Lucide icons, not text symbols.
- Keep icons visually calm: `strokeWidth={1.8}` in editor controls, muted color by default, accent color only for active or selected state.

### Editor Consistency
- The Web Editor, Template Editor, Landing Page Editor, and Agency Editor must receive the same spacing, icon, switch, and grouping rules.
- Preserve each editor's purpose and content model. Standardize the treatment, not the feature set.
- When adding a new editor control, match the clean-control pattern before creating a new visual variant.

## App-Wide UI Unification

The clean editor treatment also applies to every application surface: Dashboard, Agency, E-commerce, Email, CRM, Finance, Appointments, Tenant Portal, and Super Admin. Each area can keep its workflow-specific layout, but shared controls, cards, buttons, tabs, switches, and icons must follow one Quimera visual language.

### Global Priorities
- Use shared primitives before creating a local UI pattern. Prefer existing `components/ui` controls and design tokens over custom one-off class stacks.
- Reduce nested framed surfaces. A page may use cards for meaningful repeated items, modals, summaries, and tables, but should not wrap every small control in its own decorated card.
- Keep dense operational screens quiet: subtle borders, restrained shadows, compact headers, and enough whitespace for scanning.
- Preserve strong visual treatment for high-level dashboard cards and marketing/public pages. The cleanup target is clutter, not brand personality.

### Cards & Panels
- Dashboard content cards should use one clear container level: `bg-card` or `bg-card/80`, `border border-border/60`, `rounded-xl` or `rounded-2xl` only when the card is a primary content object.
- Control panels and settings forms should use flatter sections with separators, not nested `rounded-xl` panels inside another card.
- Repeated settings rows should use 12-16px gaps and a single divider or soft background, not full card treatment per row.
- Avoid combining large radius, strong shadow, gradient background, and border on the same small control surface.

### Tabs & Segmented Controls
- Tabs across editors, email, dashboards, and admin tools should use a subtle rail: thin border, quiet surface, 4-6px radius, and an accent-tinted active state.
- Avoid heavy active pills with strong shadows unless the tab is primary navigation.
- Tab icons should be Lucide, 14-16px, muted by default and accent-colored when active.

### Switches Across The App
- All app switches use the same geometry rules as editor switches.
- Small switch: 36x20 track, 16x16 knob, 2px offset, checked movement 16px.
- Medium switch: 44x24 track, 20x20 knob, 2px offset, checked movement 20px.
- Legacy switches that use `translate-x-6`, `translate-x-5`, `translate-x-full`, or left-position tricks must be migrated to the same visual result. The checked state must leave the same right margin as the off state leaves on the left.

### Icons Across The App
- Functional icons must be Lucide across all admin and app surfaces.
- Use brand SVGs only for external brand marks where Lucide does not apply, such as Google, Meta, or payment/provider logos.
- Replace text-only functional symbols (`✓`, `✕`, arrows used as controls, dot indicators used as controls) with Lucide icons.
- Decorative copy may still use punctuation or arrows when it is content, not an interactive control.

### Headers & Sidebars
- Internal app headers use a consistent 56px height, bottom border, quiet background, and left-to-right order: mobile sidebar button, section icon/title, contextual controls, primary actions, back button.
- Header identity is uniform everywhere: one Lucide section icon followed by one title. The section icon uses 20px on dense app surfaces or 24px only when the existing header already has that scale; titles use the same `text-lg font-semibold text-foreground` treatment, or `text-editor-text-primary` on editor/admin dark surfaces.
- Every internal app header must include the shared `HeaderBackButton` on the far right side. Do not place the back button on the left side or hide it behind page-specific controls.
- The back button uses Lucide `ArrowLeft`, visible `Volver` text, 36px height, 12px horizontal padding, muted text, a subtle secondary background, a light border, and the same hover state everywhere.
- Mobile menu buttons and sidebar toggles sit on the left beside the title. The back button stays in the right action area so users always find it in the same place.
- Header action icons use Lucide only, align in the same right action group, and keep 16-20px sizing with consistent 8-12px gaps. Do not mix icon-only back buttons, text-only back links, or page-specific boxed variants.
- Header icons are 20-24px for section identity and 16-20px for actions. Use the same muted/default and primary/active color logic as the sidebar.
- Sidebars use Lucide icons only, 18px for navigation rows, compact 8-12px row padding, and one active-state treatment: accent-tinted background, primary text/icon, no heavy shadow.
- Do not create page-specific back buttons unless wrapping the shared `HeaderBackButton`; icon-only back buttons are not allowed in app headers.

## Interactive Behaviors

### Card Hover Animations
Five distinct card hover presets are available, selectable per component:
- **Lift:** translateY(-8px) with enhanced diffused shadow
- **Glow:** Colored halo ring using the card's accent color
- **Tilt:** Subtle 3D perspective rotation (2° X, -2° Y)
- **Shine Sweep:** A 60%-width translucent gradient slides across the card surface
- **Border Glow:** Border brightens and emits a soft inner glow

### Micro-Animations
- **Stagger Children:** Elements within a section fade-in-up with 100ms stagger delays
- **Float Gentle:** Ambient float animation (15px Y translation + 1° rotation) on 5s loop
- **Blob:** Organic movement for decorative background elements (8s loop)
- **Marquee:** Infinite horizontal scroll for logo banners (25s linear)
- **Voice Orb:** Pulsing, glowing, morphing sphere for AI voice interactions

### Theme Transitions
All color-related properties (background-color, border-color, color, fill, stroke, box-shadow) transition at 200ms ease-out when switching between Light/Dark/Black modes. Images, videos, and canvas elements are excluded from transitions to prevent visual artifacts.

### Touch Interactions
- Minimum 44px touch targets on mobile
- Active state: scale(0.98) compression on buttons
- Swipe-to-close gesture on mobile sidebar with momentum and 100px threshold
- Disable hover effects on `hover: none` devices

## Scrollbar

Custom scrollbar styling uses a 6px-wide track with transparent background and a rounded pill thumb colored at 60% border opacity. On hover, the thumb transitions to 70% primary color — a small but premium detail that reinforces the accent palette throughout the interface.
