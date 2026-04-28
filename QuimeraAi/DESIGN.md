---
name: QuimeraAi Design System
version: 2.0.0
colors:
  primary: "#FBB92B"
  semantic:
    bg: "var(--q-bg)"
    surface: "var(--q-surface)"
    surface-overlay: "var(--q-surface-overlay)"
    border: "var(--q-border)"
    accent: "var(--q-accent)"
    text: "var(--q-text)"
    text-secondary: "var(--q-text-secondary)"
    text-muted: "var(--q-text-muted)"
typography:
  fonts:
    heading: "Ubuntu"
    body: "Open Sans"
    classes:
      - "font-header"
      - "font-body"
      - "font-button"
radius:
  default: "rounded-lg"
  panels: "rounded-xl"
  buttons: "rounded-full"
themes:
  - name: "Light (Warm Parchment)"
    bg: "#F5F4F0"
  - name: "Dark (Night Violet)"
    bg: "#1C0D28"
  - name: "OLED (Black)"
    bg: "#000000"
---

# QuimeraAi Design System

This document is the **Source of Truth** for the QuimeraAi platform. It is designed to be machine-readable by AI agents (Claude, Cursor, Stitch) to enforce strict visual, structural, and behavioral consistency across all new features.

## 1. Visual Theme & Architecture

QuimeraAi operates on a **Semantic Multi-Theme Architecture**. The UI is built to instantly switch between three distinct visual identities:
- **Light (Warm Parchment):** Clean, airy, highly readable for daytime office work. Uses soft off-whites (`#F5F4F0`).
- **Dark (Night Violet):** The classic Quimera aesthetic. Deep, immersive purple (`#1C0D28`) for a modern, tech-forward vibe.
- **OLED (True Black):** Battery-saving, high-contrast environment (`#000000`).

**The Golden Rule:** The Quimera Accent Yellow (`#FBB92B`) is the unyielding anchor across all themes. It is used for primary CTAs, hover states, and critical focus rings.

## 2. Color Usage & Token Rules

> [!WARNING]
> **NEVER** use hardcoded utility colors from Tailwind (e.g., `bg-gray-100`, `text-slate-800`, `border-gray-200`) anywhere in the `components/` directory.

All components **must** use the following semantic tokens:
- `bg-q-bg`: The deepest background layer (app backdrop, body).
- `bg-q-surface`: Elevated elements (cards, panels, sidebars, modals).
- `hover:bg-q-surface-overlay`: Interactive hover states for surface items.
- `border-q-border`: All dividers, panel borders, and input outlines.
- `text-q-text`: Primary typography (headings, main body text).
- `text-q-text-secondary`: Supporting text, labels, subtle icons.
- `text-q-text-muted`: Disabled text, placeholders.
- `bg-q-accent` / `text-q-accent` / `border-q-accent`: The primary action color (Quimera Yellow).

## 3. Typography & Fonts

QuimeraAi uses a dual-font system to balance approachability with modern professionalism:
- **Headings (`h1`-`h6`):** **Ubuntu**. Used for big statements, titles, and section headers.
- **Body & Paragraphs:** **Open Sans**. Optimized for high legibility in dense dashboards and CRM tables.

### Editor Typography Classes
When building UI components inside the Editor or Public Previews, text **must** be wrapped with the semantic font classes:
- `font-header`: For Titles and Headings.
- `font-body`: For standard text and paragraphs.
- `font-button`: For CTAs.

*Note: Headings and Buttons must often inherit dynamic text transformations (e.g., `All Caps` configurations) using inline CSS variables like `style={{ textTransform: 'var(--headings-transform)' }}`.*

## 4. Components & Layout Principles

### Modals & Dialogs
**NEVER** use native browser prompts (`window.alert`, `window.confirm`, `window.prompt`).
- **Always** use the internal `ConfirmationModal` (`components/ui/ConfirmationModal.tsx`) for user confirmations. This guarantees i18n support and visual alignment with the active theme.

### Internationalization (i18n)
**NEVER** hardcode text strings in JSX.
- Import `useTranslation` from `react-i18next`.
- Wrap all visible strings in `t('namespace.key')`.
- Add the corresponding English and Spanish keys in `locales/en/translation.json` and `locales/es/translation.json`.

### Radius & Geometry
- **Buttons / Badges:** Pill-shaped (`rounded-full`).
- **Cards / Images:** Softly rounded (`rounded-lg`).
- **Main Editor Panels:** Generously rounded (`rounded-xl`).

### Glassmorphism & Depth
QuimeraAi heavily utilizes frosted glass effects, especially in section backgrounds and sticky headers.
- Combine `bg-q-surface/80` (or `bg-black/40` over imagery) with `backdrop-blur-md` or `backdrop-blur-xl`.
- Shadows should be kept minimal and soft (`shadow-sm`, `shadow-md`), relying more on subtle borders (`border-q-border`) to separate elevation layers.
