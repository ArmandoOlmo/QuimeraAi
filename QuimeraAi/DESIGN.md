---
name: QuimeraAi Design System
version: 2.1.0
chunk: 1
scope: documentation-only
source_files:
  - src/styles/main.css
  - components/ui/button.tsx
  - components/ui/input.tsx
  - components/dashboard/Dashboard.tsx
  - components/dashboard/DashboardHeader.tsx
  - components/dashboard/DashboardSidebar.tsx
  - components/dashboard/DashboardWelcome.tsx
  - components/dashboard/DashboardDraggableSection.tsx
  - components/dashboard/SuperAdminDashboard.tsx
---

# QuimeraAi Design System

This document is the working source of truth for incremental UI consistency work in Quimera.ai. It documents the current visual system and the migration rules for the safe-chunk design-system branch.

## 1. Scope And Non-Goals

Design-system work must be incremental. Do not change business logic, routes, permissions, Firebase/Auth behavior, plan access, service availability checks, or existing feature behavior while applying visual cleanup.

Each chunk must be small enough to review and revert on its own. Prefer adding shared UI primitives first, then replacing local class stacks one surface at a time.

For this branch, the migration order is:

1. Document current visual rules.
2. Add base components in `components/ui/system/`.
3. Apply those components only to Dashboard Home.
4. Improve Sidebar incrementally: footer, nav item, section headers, collapsed/mobile behavior.
5. Normalize headers: `DashboardHeader`, `HeaderBackButton`, `AdminViewLayout`.
6. Apply the system to Super Admin dashboard home only.

## 2. Visual Theme

Quimera.ai uses a warm premium SaaS interface with three app themes:

- Light: warm parchment surfaces with dark charcoal text.
- Dark: Night Violet surfaces with soft purple depth.
- Black: OLED black surfaces with high contrast and minimal gray elevation.

The constant brand anchor is Cadmium Yellow `#FBB92B`. Use it for primary CTAs, active states, focus rings, important links, and selected controls. Do not replace it with generic Tailwind yellow classes.

The app should feel operational and refined. Dashboards, admin panels, CRM views, finance views, and settings screens should stay dense, quiet, and scannable. Avoid marketing-style hero layouts inside the product UI.

## 3. App Tokens

App chrome and dashboards use semantic CSS variables from `src/styles/main.css`. New app components should prefer `q-*` Tailwind utilities over raw Tailwind palette colors.

### Core App Tokens

| Role | Utility | CSS variable | Use |
| --- | --- | --- | --- |
| App background | `bg-q-bg` | `--q-bg` | Page and app shell canvas |
| Secondary background | `bg-q-bg-secondary` | `--q-bg-secondary` | Subtle full-page gradients and deeper bands |
| Surface | `bg-q-surface` | `--q-surface` | Cards, panels, sidebars, modals |
| Elevated surface | `bg-q-surface-elevated` | `--q-surface-elevated` | Higher cards and popovers |
| Surface overlay | `bg-q-surface-overlay` | `--q-surface-overlay` | Hover states, rails, soft controls |
| Border | `border-q-border` | `--q-border` | Standard dividers and outlines |
| Strong border | `border-q-border-strong` | `--q-border-strong` | Focused containers and stronger separators |
| Accent | `bg-q-accent` | `--q-accent` | Primary action and selected state |
| Tertiary accent | `text-q-accent-tertiary` | `--q-accent-tertiary` | Violet accent, mostly dark theme support |
| Primary text | `text-q-text` | `--q-text` | Headings and main body copy |
| Secondary text | `text-q-text-secondary` | `--q-text-secondary` | Labels and supporting copy |
| Muted text | `text-q-text-muted` | `--q-text-muted` | Metadata, placeholders, inactive icons |
| Text on accent | `text-q-text-on-accent` | `--q-text-on-accent` | Text/icons on accent buttons |
| Success | `text-q-success` | `--q-success` | Positive state |
| Warning | `text-q-warning` | `--q-warning` | Warning state |
| Error | `text-q-error` | `--q-error` | Error/destructive state |
| Info | `text-q-info` | `--q-info` | Informational state |

### Theme Values

| Token | Light | Dark | Black |
| --- | --- | --- | --- |
| `--q-bg` | `#F2F0EB` | `#1E1535` | `#000000` |
| `--q-bg-secondary` | `#E8E5DE` | `#251B42` | `#0A0A0A` |
| `--q-surface` | `hsl(40 20% 99%)` | `hsl(268 38% 18%)` | `hsl(0 0% 6%)` |
| `--q-surface-elevated` | `#FDFCFA` | `hsl(268 38% 20%)` | `#1A1A1A` |
| `--q-surface-overlay` | `#F5F4F0` | `hsl(268 42% 16%)` | `#0F0F0F` |
| `--q-border` | `hsl(36 10% 79%)` | `hsl(266 24% 26%)` | `hsl(0 0% 20%)` |
| `--q-accent` | `#FBB92B` | `#FBB92B` | `#FBB92B` |
| `--q-text` | `#1A1816` | `#F7F7F7` | `#FFFFFF` |
| `--q-text-secondary` | `#4A4640` | `#A49EBD` | `#B3B3B3` |
| `--q-text-on-accent` | `#1A1610` | `#150E28` | `#000000` |

## 4. Editor Tokens

Editor and builder panels use a separate token group so client website previews can keep their own brand colors.

| Role | Utility | CSS variable | Use |
| --- | --- | --- | --- |
| Editor canvas | `bg-editor-bg` | `--editor-bg` | Builder background |
| Editor panel | `bg-editor-panel-bg` | `--editor-panel-bg` | Sidebar panels and control surfaces |
| Editor border | `border-editor-border` | `--editor-border` | Inputs, section separators, panel borders |
| Editor accent | `text-editor-accent` | `--editor-accent` | Active controls and focus |
| Editor primary text | `text-editor-text-primary` | `--editor-text-primary` | Editor labels/headings |
| Editor secondary text | `text-editor-text-secondary` | `--editor-text-secondary` | Helper text and muted controls |

Editor controls should follow the clean-control pattern:

- Use `.quimera-clean-controls` when available for grouped editor panels.
- Prefer section dividers over nested cards.
- Keep control hierarchy to panel, group, individual control.
- Inputs use transparent or editor-surface backgrounds, `border-editor-border`, 6px radius, and a low-opacity accent focus ring.
- Switches use exact geometry: small `36x20` track with `16x16` knob and 2px offset; medium `44x24` track with `20x20` knob and 2px offset.

## 5. Generated Website Tokens

Generated/public websites are not app chrome. They may use project-level design tokens and should not blindly inherit `q-*` app tokens except inside admin/editor UI around the preview.

Generated website typography and style are controlled through:

- `font-header`, `font-body`, and `font-button`.
- Runtime CSS variables such as `--font-header`, `--font-body`, `--font-button`.
- Text transforms such as `--headings-transform`, `--buttons-transform`, and `--navlinks-transform`.
- Public color roles in project data such as `background`, `text`, `heading`, `accent`, `borderColor`, `cardBackground`, `buttonBackground`, and `buttonText`.
- Website defaults such as `--site-heading-color` and `--site-body-color` in `src/styles/main.css`.

Rules for public/generated websites:

- Preserve project-specific brand colors and generated content structure.
- Keep button text contrast readable against `buttonBackground`.
- Use `font-header` for website headings, `font-body` for paragraphs, and `font-button` for CTAs.
- Do not replace public website colors with app dashboard tokens unless the surface is an app/editor wrapper.
- Generated HTML may use inline styles where export/deployment requires it, but app React components should use semantic utilities.

## 6. Typography

Current app base typography is defined in `src/styles/main.css`:

- `body` uses `'Ubuntu', 'Plus Jakarta Sans', sans-serif`.
- `--font-sans` uses `'Ubuntu', 'Plus Jakarta Sans', sans-serif`.
- `font-header`, `font-body`, and `font-button` default to Inter-compatible runtime variables and can be overridden by `appTokenApplier`.

Operational UI guidance:

- Page titles: `text-lg` to `text-xl`, `font-semibold` or `font-bold`, `text-q-text`.
- Dashboard welcome headline: can use larger responsive sizes, currently up to `md:text-6xl`.
- Section headers: `text-lg` to `text-2xl`, bold, compact line height.
- Body copy: `text-sm` to `text-base`, `text-q-text` or `text-q-text-secondary`.
- Micro labels: `text-xs` or `text-[10px]`, uppercase, `tracking-wider`, `font-bold`.
- Avoid viewport-scaled typography in app controls.

## 7. Spacing

Use an 8px rhythm.

| Token | Value | Use |
| --- | --- | --- |
| `xs` | `4px` | Tight icon/text gaps |
| `sm` | `8px` | Button gaps, nav row gaps |
| `md` | `16px` | Card inner rhythm, stacked controls |
| `lg` | `24px` | Card padding, section padding |
| `xl` | `40px` | Major vertical rhythm |
| `2xl` | `64px` | Large page separation |

Current app spacing patterns:

- Page content: `p-4 sm:p-6 lg:p-8`.
- Main dashboard max width: `max-w-7xl` / approximately `1280px`.
- Dashboard grids: `gap-3 sm:gap-6` for project/template cards; `gap-2 sm:gap-4` for compact status cards.
- Dashboard sections: `mb-3 lg:mb-6` below section headers.
- Sidebar nav: `px-3 md:px-4`, `py-4 md:py-6`, row spacing `space-y-1 md:space-y-2`.
- Header controls: 36px height.

## 8. Radius

The CSS base radius is `--radius: 0.375rem`. Tailwind theme mappings expose `rounded-sm`, `rounded-md`, and `rounded-lg` around that base, while the app also uses standard `rounded-xl`, `rounded-2xl`, and custom large radii for dashboard surfaces.

Use radius by purpose:

- Functional buttons: `rounded-md` or `rounded-lg`.
- Icon buttons: `rounded-lg`, fixed square dimensions.
- Pills, badges, avatars, counters: `rounded-full`.
- Standard content cards: `rounded-xl`.
- Prominent dashboard/status cards: `rounded-xl sm:rounded-2xl`.
- Dashboard section decks: large radius from `.quimera-dashboard-section-deck` (`1.75rem`, `2rem` on desktop).
- Avoid stacking large-radius cards inside other large-radius cards.

## 9. Buttons

Existing primitive: `components/ui/button.tsx`.

Default button structure:

- `inline-flex items-center justify-center gap-2`.
- `h-9 px-4 py-2` for default.
- `h-8` for small, `h-10` for large.
- `size-9`, `size-8`, `size-10` for icon buttons.
- `rounded-md`, `text-sm`, `font-medium`.
- `disabled:pointer-events-none disabled:opacity-50`.
- `focus-visible:ring-[3px]`.

System button rules for CHUNK 2:

- `AppButton` should wrap these visual decisions without changing behavior.
- Primary: `bg-q-accent text-q-text-on-accent hover:bg-q-accent/90`.
- Secondary: `bg-secondary text-secondary-foreground hover:bg-secondary/80` or quiet `bg-q-surface-overlay/50`.
- Outline: `border border-q-border bg-transparent hover:bg-q-surface-overlay`.
- Ghost: transparent with `hover:bg-q-surface-overlay`.
- Destructive: `bg-q-error text-white hover:bg-q-error/90`.
- Link/action text: use `text-q-accent`, not hardcoded yellow classes.
- Buttons should accept icons; use Lucide icons for functional actions.

## 10. Cards And Panels

Cards should create one clear container level. Avoid card-in-card layouts unless the inner card is a distinct repeated item, modal, table row, or meaningful object.

Standard app card:

- `bg-q-surface` or `bg-q-surface/80`.
- `border border-q-border/60`.
- `rounded-xl`.
- `p-4` to `p-6`.
- Soft or no shadow; rely on border and backdrop blur for elevation.

Dashboard section deck:

- Class: `.quimera-dashboard-section-deck`.
- Uses `border`, `color-mix` surface background, `backdrop-filter: blur(24px)`, large radius, and responsive padding.
- Used around draggable dashboard sections.

Dashboard panel card:

- Class: `.quimera-dashboard-panel-card`.
- Uses `rounded-2xl`-like radius, subtle border, surface background, blur, and no heavy shadow.
- Good for settings/forms where one panel contains multiple controls.

Status cards:

- `rounded-xl sm:rounded-2xl`.
- `border-q-border/60`.
- `bg-q-surface/80 dark:bg-q-surface/40`.
- `min-h-[100px] sm:min-h-[140px]`.
- Hover may scale slightly (`hover:scale-[1.02]`) but must not shift surrounding layout.

## 11. Headers

Internal app headers use the shared visual treatment in `.quimera-dashboard-header-bar`:

- Height: `h-14` / 56px.
- Background: `color-mix` surface with blur.
- Border bottom: `1px solid var(--q-border)`.
- Control height: 36px through `--q-header-control-height`.
- Left order: mobile sidebar button, section icon, title.
- Right order: contextual controls, search/action buttons, back button only when applicable.

Important migration rule for CHUNK 5:

- `HeaderBackButton` must appear only on secondary/detail/admin subviews where there is a meaningful destination back.
- It should not appear on primary dashboard home.
- Back buttons must use the shared `HeaderBackButton`; avoid local text links or icon-only variants outside the primitive.

Current `HeaderBackButton` visual target:

- 36px square or 36px-height control.
- `ArrowLeft` Lucide icon.
- `rounded-lg`.
- `border-q-border/50`.
- Quiet secondary/surface background.
- `text-q-text-muted`, hover to foreground.
- `focus:ring-primary/25` or `focus:ring-q-accent/25`.

## 12. Sidebar

Current sidebar structure:

- Expanded desktop width: `md:w-72`.
- Collapsed desktop width: `md:w-[80px]`.
- Mobile width: `w-[85vw] max-w-[320px]`.
- Background: `bg-q-bg/95 backdrop-blur-xl`.
- Border: `border-r border-q-border`.
- Mobile overlay: `bg-black/60 backdrop-blur-sm`.

Sidebar nav row target:

- Touch-aware row: `min-h-[40px] md:min-h-[36px]`.
- Padding: `py-2 px-3`.
- Expanded radius: `rounded-lg`.
- Collapsed item width: `w-12 mx-auto`.
- Icon size: currently `22px`; keep consistent unless a later chunk intentionally normalizes to 18-20px.
- Label: `text-[15px] md:text-sm font-medium`.
- Active state should move toward a single treatment: accent-tinted background with primary/accent text and icon, without heavy shadow.
- Locked state must continue showing plan restrictions and must not bypass upgrade modal behavior.

Sidebar section header target:

- Button with `px-3 py-2.5 rounded-lg`.
- Section icon at 18px.
- Label: `text-xs font-bold uppercase tracking-wider`.
- Chevron rotation only; do not change collapse state behavior.

Sidebar footer target:

- One visible user/account area.
- Theme/language controls in one compact rail.
- Credits widget remains visible and plan warnings remain functional.
- Collapsed footer must preserve compact credits and expand/collapse controls.

## 13. Dashboard Home

Dashboard Home is the first application surface to receive the base system components.

Current key surfaces:

- `DashboardWelcome`: greeting, plan/upgrade callouts, AI launcher, status cards.
- `DashboardStatusCards`: compact responsive metric/action cards.
- `DashboardDraggableSection`: draggable/collapsible section shell.
- `DashboardProjectsSection`: recent project grid and empty state.
- `DashboardTemplatesSection`: template grid.
- `DashboardLeadsSection`: wraps `RecentLeads`.
- `DashboardNewsSection`: wraps `NewsUpdates`.

Rules for CHUNK 3:

- Keep all props and logic unchanged.
- Replace visual wrappers gradually with `PageContainer`, `SectionHeader`, `AppCard`, `AppButton`, `SearchInput`, and `StatusBadge` only where the behavior is unchanged.
- Preserve drag handlers, collapse state, search state, project/template slicing, loading states, empty states, plan callouts, and navigation callbacks.
- Keep grid breakpoints and item counts unless the user explicitly asks for layout behavior changes.

## 14. Dashboard Sections

Section header target:

- Left group: optional drag handle, section icon, title, collapse chevron.
- Title: compact bold type, `text-q-text`.
- Icon: accent color, Lucide.
- Right action: compact button/link using shared `AppButton` variant when migrated.
- Collapsed sections keep header visible and content hidden.

Section body target:

- Content should animate only if existing animation is already present.
- Do not add decorative wrappers around each child when the section deck already provides structure.
- Empty states remain full-width and readable.

## 15. Search Inputs

Existing primitive: `components/ui/input.tsx`.

Search input target for CHUNK 2:

- Wrap `Input`.
- Left search icon using Lucide `Search`.
- Height: 36px or 40px depending surface density.
- Background: transparent or `bg-q-surface-overlay/40`.
- Border: `border-q-border`.
- Placeholder: `placeholder:text-q-text-muted`.
- Focus: `focus-visible:border-q-accent focus-visible:ring-q-accent/25`.
- Do not change search state, filtering logic, debounce behavior, or modal visibility while migrating visuals.

## 16. Status Badges

Status badges should be compact and semantic:

- Base: `inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold`.
- Neutral: `bg-q-surface-overlay text-q-text-secondary border border-q-border/60`.
- Success: `bg-q-success/12 text-q-success border-q-success/25`.
- Warning: `bg-q-warning/12 text-q-warning border-q-warning/25`.
- Error: `bg-q-error/12 text-q-error border-q-error/25`.
- Info: `bg-q-info/12 text-q-info border-q-info/25`.
- Premium/new: use accent or a semantic state, not ad hoc hardcoded color stacks.

## 17. Super Admin Home

Super Admin dashboard home currently has local `AdminCard`, `CategoryChip`, view-mode controls, mobile search, and feature filtering.

Rules for CHUNK 6:

- Only apply the system to the Super Admin home grid, filters, category chips, header, and cards.
- Do not touch lazy-loaded internal admin modules in this chunk.
- Preserve role filtering, routes, `adminView`, search, category filters, and view modes.
- Use `PageHeader`/`PageContainer` only if they do not alter routing or permissions.
- Use `StatusBadge` for `isNew` and premium indicators where appropriate.

## 18. Icons

Use `lucide-react` for functional UI icons in app/admin surfaces.

- Navigation: currently 22px; future normalization should be incremental.
- Header identity icons: 20px.
- Header action icons: 16-20px.
- Editor row actions: 14-16px, `strokeWidth={1.8}` when matching editor controls.
- Avoid unicode arrows, checks, close symbols, or dot controls where a Lucide icon exists.

Brand SVGs are allowed only for brand marks, provider logos, or product identity.

## 19. Motion And Interaction

Existing app motion uses subtle transitions and occasional Framer Motion variants.

- Standard transition duration: 150-300ms.
- Theme transitions: 200ms ease-out from `main.css`.
- Sidebar width/mobile transitions: 300ms with `cubic-bezier(0.32,0.72,0,1)`.
- Hover scale should be restrained (`1.02` for cards, `1.05` only for intentional CTAs).
- Respect `useReducedMotion` where already used.
- Do not add new animation systems during visual normalization chunks.

## 20. Implementation Rules

- Use existing primitives before creating local variants.
- CHUNK 2 primitives must live in `components/ui/system/`.
- New primitives must be visual wrappers only; they should not own business logic.
- Preserve existing props while migrating components.
- Do not rename routes, view ids, translation keys, service ids, feature flags, or plan feature keys.
- Do not remove existing fallbacks or loading states.
- Keep visible text internationalized with `react-i18next`.
- Use semantic `q-*`, `editor-*`, or website/project tokens by context.
- Avoid hardcoded `gray/slate/zinc` class stacks in app components unless preserving legacy code outside the current chunk.
