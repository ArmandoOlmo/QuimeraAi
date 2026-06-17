# Quimera Design System V2 Foundation

This document is the repository-level design system baseline for the new v2 design work. It records the current visual state from `origin/main` and sets rules for future chunks. This chunk is documentation-only.

## Current Base Branch: ui/design-system-v2-foundation from main f5dfe5e

- Workspace: `/Users/armandoolmo/Desktop/quimera-main-workspace`
- App folder: `QuimeraAi/`
- Current work branch: `ui/design-system-v2-foundation`
- Source of truth branch: `origin/main`
- Base commit: `f5dfe5e8826e43c0ff3ac9feef5fbd81e16abf3b`
- Base commit short label: `f5dfe5e fix(auth): add google identity sign-in fallback`

## Do Not Use Old Design-System Branches

Do not use or copy from these old branches unless the user explicitly asks for a historical comparison:

- `ui/design-system-clean`
- `ui/chunk-4a-sidebar-footer`
- `ui/design-system-safe-chunks`

Do not use old local folders. Future work should start from this workspace and this branch.

## Scope Of Chunk 1

Chunk 1 is an audit and documentation baseline only.

Allowed:

- Read the current app structure.
- Document current tokens, layout, and component patterns.
- Update design documentation files.

Not allowed in this chunk:

- Do not modify logic.
- Do not modify visual components.
- Do not modify routes.
- Do not modify permissions.
- Do not touch Firebase/Auth.
- Do not touch plans.
- Do not touch Supabase.
- Do not touch Vercel.
- Do not refactor.
- Do not touch `DashboardSidebar.tsx`.
- Do not touch `DashboardHeader.tsx`.
- Do not touch `Dashboard.tsx`.
- Do not create `START_HERE_AGENT.md` unless the user approves it first.

## Documentation Map

- `DESIGN.md`: repository-level baseline and chunk rules.
- `QuimeraAi/DESIGN.md`: app-level implementation audit and practical design rules.
- `QuimeraAi/src/styles/main.css`: current token implementation and Tailwind v4 `@theme` mapping.
- `QuimeraAi/components/ui/primitives/Button.tsx`: current button primitive.
- `QuimeraAi/components/ui/primitives/Card.tsx`: current card primitive.
- `QuimeraAi/components/ui/EditorControlPrimitives.tsx`: current editor control primitives.
- `QuimeraAi/components/dashboard/`: dashboard shell, sidebar, header, welcome, cards, and sections.
- `QuimeraAi/components/Header.tsx` and `QuimeraAi/components/Footer.tsx`: public website header and footer components.
- `QuimeraAi/components/LandingPage.tsx`: public website renderer and editor-preview bridge.

## Current Visual Audit Summary

The current app from main opens successfully as a Vite React app. The public home renders as a dark Quimera landing page with cadmium-yellow accents, a top nav, hero, product sections, industry sections, pricing, FAQ, and footer. The dashboard implementation uses the same semantic token family but has its own internal shell, sidebar, sticky header, AI launcher, status cards, draggable sections, and editor/admin surfaces.

The current visual language is a premium SaaS builder aesthetic:

- Dark-first brand impression with deep violet/black surfaces and yellow primary action color.
- Light and OLED modes exist through CSS variables.
- Glass and blur are common in dashboard panels and launchers.
- Public website components are highly configurable by data and editor theme.
- Dashboard surfaces mix newer `--q-*` semantic tokens with legacy `background`, `foreground`, `primary`, `secondary`, `muted`, and direct utility colors.

## Current Token System

Tokens are implemented in `QuimeraAi/src/styles/main.css` using CSS custom properties and Tailwind v4 `@theme`.

### Theme Modes

The app currently supports three base modes:

- Light: warm parchment, off-white surfaces, dark text.
- Dark: Night Violet, deep purple canvas, light text.
- Black: OLED black, true black canvas, high contrast.

Core semantic tokens:

- `--q-bg`: app background.
- `--q-bg-secondary`: secondary background band.
- `--q-surface`: cards, panels, sidebar sections.
- `--q-surface-elevated`: lifted panels and stronger surfaces.
- `--q-surface-overlay`: hover and overlay surfaces.
- `--q-border`: default border.
- `--q-border-strong`: stronger border.
- `--q-accent`: primary Quimera accent, currently `#FBB92B`.
- `--q-accent-secondary`: secondary accent surface.
- `--q-accent-tertiary`: violet accent, especially visible in dark mode.
- `--q-text`: primary text.
- `--q-text-secondary`: secondary text.
- `--q-text-muted`: muted text.
- `--q-text-on-accent`: text over accent buttons.
- `--q-success`, `--q-warning`, `--q-error`, `--q-info`: semantic status colors.

Legacy shadcn-style tokens still exist and are widely used:

- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`

Future chunks should prefer `--q-*` and `bg-q-*`, `text-q-*`, `border-q-*` utilities for new or touched app UI. Existing legacy tokens may remain until a scoped migration chunk touches that surface.

### Accent Palettes

The current CSS exposes selectable accent palettes:

- Cadmium Yellow: `#FBB92B`
- Blue Violet: `#7F22DD`
- Amber Glow: `#FF9D00`
- Emerald Teal: `#10B981`
- Rose Coral: `#F43F5E`

Cadmium Yellow remains the brand anchor and default primary CTA color.

### Tailwind V4 Mapping

Tailwind utilities are defined through `@theme` in `main.css`, not a classic `tailwind.config` file. Important mapped utilities include:

- `bg-q-bg`, `bg-q-surface`, `bg-q-surface-elevated`, `bg-q-surface-overlay`
- `text-q-text`, `text-q-text-secondary`, `text-q-text-muted`, `text-q-text-on-accent`
- `border-q-border`, `border-q-border-strong`
- `bg-q-accent`, `text-q-accent`, `ring-q-accent`
- `font-header`, `font-body`, `font-button`
- `text-site-heading`, `text-site-body`

The custom navigation breakpoint is `nav` at `1300px`.

### Typography

Current implementation details:

- Global body fallback is `'Ubuntu', 'Plus Jakarta Sans', sans-serif`.
- `font-header`, `font-body`, and `font-button` are CSS-variable driven classes.
- Public preview and generated websites can override `--font-header`, `--font-body`, and `--font-button` at runtime from `LandingPage.tsx`.
- Current Tailwind defaults for the public font variables are `Inter`, but runtime editor settings can replace them.
- Public website components use `font-header`, `font-body`, and `font-button` heavily.
- Dashboard screens currently use a mix of regular Tailwind font weights and tokenized color classes.

Future chunks should avoid introducing a new font system. Work with the existing variable-based model.

### Radius, Spacing, Motion, Elevation

Current observed patterns:

- Buttons and compact controls: commonly `rounded-md`, `rounded-lg`, or full pill depending on context.
- Dashboard cards: `rounded-xl` to `rounded-2xl`.
- AI launcher and section decks: larger radius, including `1.5rem`, `1.75rem`, and `2rem`.
- Base spacing follows an 8px rhythm through Tailwind utilities.
- Theme transitions apply globally to color, border, fill, stroke, and box-shadow at `200ms ease-out`.
- Dashboard and card animations use `framer-motion`.
- Glass surfaces use `backdrop-blur`, translucent `bg-q-surface`, and soft borders.

## Layout Structure

### App Shell

The app folder is a Vite React app under `QuimeraAi/`. The dashboard shell is implemented as:

- Root flex container: `flex h-screen bg-q-bg text-foreground`.
- Sidebar: `DashboardSidebar`.
- Main column: `flex-1 flex flex-col overflow-hidden`.
- Sticky dashboard header: `DashboardHeader`.
- Scrollable main content: `main#main-content`.
- Dashboard home background: `quimera-dashboard-home-bg`.
- Content width: `max-w-7xl mx-auto`.

### Sidebar

Current sidebar implementation:

- File: `QuimeraAi/components/dashboard/DashboardSidebar.tsx`.
- Desktop width: collapsed `80px`, expanded `18rem` (`w-72`).
- Mobile width: `85vw`, max `320px`, fixed overlay drawer.
- Shell: `bg-q-bg/95`, `backdrop-blur-xl`, `border-r border-q-border`.
- Uses Lucide icons for navigation.
- Includes mobile swipe-to-close logic.
- Includes workspace switcher, project switcher, grouped nav sections, draggable ordering, theme controls, language selector, credits widget, plan attention button, user avatar, and logout.
- Active and hover states mix `text-q-*`, `bg-secondary`, `bg-primary`, and legacy `foreground` classes.

Do not modify `DashboardSidebar.tsx` until a future chunk explicitly targets sidebar cleanup.

### Dashboard

Current dashboard implementation:

- File: `QuimeraAi/components/dashboard/Dashboard.tsx`.
- Dashboard home uses `quimera-dashboard-home-bg`, a multi-radial gradient canvas.
- Welcome hero lives in `DashboardWelcome.tsx`.
- AI prompt launcher uses `quimera-ai-launcher`.
- Summary cards live in `DashboardStatusCards.tsx`.
- Dashboard sections are draggable/collapsible through `DashboardDraggableSection.tsx`.
- Section deck uses `quimera-dashboard-section-deck`.
- Motion uses `framer-motion` with reduced-motion support.

Do not modify `Dashboard.tsx` until a future chunk explicitly targets dashboard layout.

### Headers

Dashboard header:

- File: `QuimeraAi/components/dashboard/DashboardHeader.tsx`.
- Height: `h-14`.
- Sticky top: `sticky top-0`.
- Surface: `quimera-dashboard-header-bar`.
- Left side: mobile menu button, Lucide section icon, title.
- Right side: search icon where applicable, shared `HeaderBackButton`.
- Uses `text-q-text`, `text-q-text-muted`, `hover:bg-q-surface-overlay`.

Public website header:

- File: `QuimeraAi/components/Header.tsx`.
- Highly configurable: sticky, transparent, floating, glass, bordered, segmented, centered, and mobile drawer modes.
- Styling is driven by props and inline styles from editor data.
- Uses `font-header`, runtime nav text transforms, public color props, and mobile portal drawer.

Do not modify `DashboardHeader.tsx` until a future chunk explicitly targets header cleanup.

### Buttons

Current primitive:

- File: `QuimeraAi/components/ui/primitives/Button.tsx`.
- Variants: `primary`, `secondary`, `ghost`, `destructive`, plus legacy `default`, `outline`, `link`.
- Sizes: `default`, `sm`, `md`, `lg`, `icon`, `icon-sm`, `icon-lg`.
- Uses `bg-q-accent`, `text-q-text-on-accent`, `bg-q-surface`, `border-q-border`, `text-q-text-secondary`, and `bg-q-error`.
- Focus ring: `focus-visible:ring-q-accent/25`.
- Active state: `active:scale-[0.98]`.

Current reality: many app components still use local button class stacks instead of this primitive. Future chunks should migrate only within the scope they are assigned.

### Cards

Current primitive:

- File: `QuimeraAi/components/ui/primitives/Card.tsx`.
- Variants: `default`, `glass`, `elevated`.
- Hover modes: `none`, `lift`, `glow`.
- Uses `bg-q-surface`, `bg-q-surface-elevated`, `border-q-border`, `text-q-text`, and CSS variables for glass opacity/blur.

Current dashboard status cards are local button-card surfaces with `rounded-xl/2xl`, `border-q-border/60`, `bg-q-surface`, `backdrop-blur-xl`, and motion. Do not force all cards into the primitive in one broad refactor.

### Editor Surfaces

Current editor control implementation:

- File: `QuimeraAi/components/ui/EditorControlPrimitives.tsx`.
- Inputs/textareas: `bg-q-bg/80`, `border-q-border/80`, `rounded-md`, `text-q-text`, `focus:ring-q-accent/25`.
- Selects: custom popover with `bg-q-surface`, `border-q-border`, selected `bg-q-accent/15 text-q-accent`.
- Segmented controls: `bg-q-surface`, `border-q-border`, active `bg-q-accent text-q-bg`.
- Position grid uses Lucide directional icons.
- `quimera-clean-controls` in `main.css` flattens older nested editor cards into dividers.

Known current inconsistency: some editor buttons still use inline SVG icons and the switch primitive currently uses `translate-x-5`. Do not correct this in documentation chunks. Record it and fix only in a future scoped editor-control chunk.

### Public Website Components

Public website rendering is data-driven:

- Main renderer: `QuimeraAi/components/LandingPage.tsx`.
- Header: `Header.tsx`.
- Footer: `Footer.tsx`.
- Public pages include blog, bio, realty directory/detail, restaurant, ecommerce, product, checkout, and CMS surfaces.
- Font variables, text transforms, section visibility, page routing, and colors are driven by editor/project data.
- Public components often rely on inline styles because generated websites must honor per-site design settings.

Future app design-system chunks must not accidentally standardize public website output into dashboard styling. Public website components need their own scoped pass.

## Rules For Future Chunks

1. Start every chunk from `ui/design-system-v2-foundation` unless the user creates a newer base branch.
2. Verify branch and clean status before edits.
3. Keep each chunk small and scoped to named files or surfaces.
4. Prefer `--q-*` tokens and mapped Tailwind utilities for touched app UI.
5. Do not refactor logic while doing visual cleanup.
6. Do not touch auth, permissions, Firebase, plans, Supabase, or Vercel unless the user explicitly requests it.
7. Do not change routes as part of design-system work.
8. Do not alter public website rendering while cleaning dashboard/admin surfaces unless that chunk is explicitly about public components.
9. Do not migrate all components to primitives in one sweep.
10. Do not copy old chunk branch code into this branch.
11. Use Lucide icons for functional app controls when changing a surface.
12. Keep cards to one meaningful container level. Avoid adding cards inside cards.
13. Keep dense admin screens quiet: subtle borders, restrained shadows, compact headers, predictable spacing.
14. Verify visual changes in browser when a chunk touches UI.
15. Documentation-only chunks should run `git diff --check` and should not require build/test runs.

## Known Audit Notes For Future Planning

- The current docs previously mixed aspirational rules with implementation details. This v2 foundation separates current state from future rules.
- The app already has a semantic `--q-*` token layer, but legacy classes remain.
- Dashboard header is already relatively aligned with the v2 direction.
- Sidebar is feature-rich and should be treated as its own future chunk.
- Dashboard home has strong branded treatment and should not be flattened without a specific design target.
- Editor controls already have a clean-control direction, but some legacy icon/switch patterns remain.
- Public website components are intentionally configurable and should be audited separately from internal dashboard/admin UI.
