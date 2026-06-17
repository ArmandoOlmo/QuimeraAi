# QuimeraAi App Design System V2 Foundation

This is the app-local design system audit for `QuimeraAi/`. It documents the current implementation on the new v2 foundation branch. It does not authorize component edits by itself.

## Current Base Branch: ui/design-system-v2-foundation from main f5dfe5e

- Workspace: `/Users/armandoolmo/Desktop/quimera-main-workspace`
- App folder: `/Users/armandoolmo/Desktop/quimera-main-workspace/QuimeraAi`
- Current branch: `ui/design-system-v2-foundation`
- Source of truth: `origin/main`
- Base SHA: `f5dfe5e8826e43c0ff3ac9feef5fbd81e16abf3b`

## Do Not Use Old Design-System Branches

Do not use these branches for new v2 work:

- `ui/design-system-clean`
- `ui/chunk-4a-sidebar-footer`
- `ui/design-system-safe-chunks`

Do not use old local folders. Do not copy component code from old chunk branches into this branch.

## Chunk 1 Boundary

This chunk is documentation and analysis only.

Do not modify:

- Components
- Routes
- Logic
- Permissions
- Firebase/Auth
- Plans
- Supabase
- Vercel
- `components/dashboard/DashboardSidebar.tsx`
- `components/dashboard/DashboardHeader.tsx`
- `components/dashboard/Dashboard.tsx`

## Implementation Map

Core styling files:

- `src/styles/main.css`: theme variables, Tailwind v4 `@theme`, utility classes, dashboard visual utilities, editor cleanup helpers, scrollbars, preview scaling.
- `components/ui/primitives/Button.tsx`: current shared button primitive.
- `components/ui/primitives/Card.tsx`: current shared card primitive.
- `components/ui/EditorControlPrimitives.tsx`: current editor inputs, selects, switches, segmented selectors, sliders, and position grid controls.

Primary app surfaces:

- `components/dashboard/Dashboard.tsx`: dashboard shell and view orchestration.
- `components/dashboard/DashboardSidebar.tsx`: main navigation shell.
- `components/dashboard/DashboardHeader.tsx`: sticky internal header.
- `components/dashboard/DashboardWelcome.tsx`: dashboard greeting, AI launcher, account CTAs, status cards.
- `components/dashboard/DashboardStatusCards.tsx`: responsive dashboard metric cards.
- `components/dashboard/DashboardDraggableSection.tsx`: collapsible/draggable section wrapper.
- `components/Header.tsx`: public website header.
- `components/Footer.tsx`: public website footer.
- `components/LandingPage.tsx`: public website/page renderer and editor-preview bridge.

## Current Tokens

Tokens are CSS custom properties mapped into Tailwind utilities through `@theme`.

### Base Themes

The current base themes are:

- `html.light`: warm parchment light mode.
- `html.dark`: Night Violet dark mode.
- `html.black`: OLED black mode.

Primary Quimera tokens:

| Token | Role |
| --- | --- |
| `--q-bg` | App/page background |
| `--q-bg-secondary` | Secondary background band |
| `--q-surface` | Cards, panels, sidebar surfaces |
| `--q-surface-elevated` | Elevated panels |
| `--q-surface-overlay` | Hover and overlay surfaces |
| `--q-border` | Default border |
| `--q-border-strong` | Stronger border |
| `--q-accent` | Primary accent, default `#FBB92B` |
| `--q-accent-secondary` | Secondary accent surface |
| `--q-accent-tertiary` | Tertiary/violet accent |
| `--q-text` | Primary text |
| `--q-text-secondary` | Secondary text |
| `--q-text-muted` | Muted text |
| `--q-text-on-accent` | Text on accent backgrounds |
| `--q-success` | Success status |
| `--q-warning` | Warning status |
| `--q-error` | Error/destructive status |
| `--q-info` | Informational status |

Legacy tokens are still active:

- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--border`, `--input`, `--ring`

Do not remove legacy tokens in a visual chunk. Prefer `--q-*` for touched app UI and leave untouched legacy surfaces alone.

### Accent Palettes

Available accent palettes:

- Cadmium Yellow: `#FBB92B`
- Blue Violet: `#7F22DD`
- Amber Glow: `#FF9D00`
- Emerald Teal: `#10B981`
- Rose Coral: `#F43F5E`

Cadmium Yellow is the default brand action color.

### Tailwind Utilities

The app uses Tailwind v4 with `@import "tailwindcss" source(none)` and explicit `@source` entries in `main.css`.

Important utilities created by `@theme`:

- Color: `bg-q-bg`, `bg-q-surface`, `bg-q-surface-elevated`, `bg-q-surface-overlay`
- Text: `text-q-text`, `text-q-text-secondary`, `text-q-text-muted`, `text-q-text-on-accent`
- Border: `border-q-border`, `border-q-border-strong`
- Accent: `bg-q-accent`, `text-q-accent`, `ring-q-accent`
- Public site: `text-site-heading`, `text-site-body`
- Fonts: `font-header`, `font-body`, `font-button`
- Breakpoint: `nav` at `1300px`

### Typography

Current state:

- Global body uses `'Ubuntu', 'Plus Jakarta Sans', sans-serif`.
- `font-header`, `font-body`, and `font-button` are runtime-controlled CSS variable classes.
- Public website previews can override font variables from project theme data in `LandingPage.tsx`.
- Public nav, headings, body, and buttons also support runtime text transform and letter spacing variables.
- Dashboard currently uses regular Tailwind typography plus semantic token colors.

Rule for future chunks: do not introduce a second font system. Use existing CSS variables and classes.

## Layout Structure

### Dashboard Shell

Current shell:

- Root: `flex h-screen bg-q-bg text-foreground`.
- Sidebar: `DashboardSidebar`.
- Main column: `flex-1 flex flex-col overflow-hidden relative`.
- Header: `DashboardHeader`.
- Main content: `flex-1 overflow-y-auto scroll-smooth`.
- Dashboard home padding: `p-3 sm:p-6 lg:p-8`.
- Content max width: `max-w-7xl mx-auto`.

Dashboard home uses `quimera-dashboard-home-bg` with theme-specific radial gradients.

### Sidebar

Current sidebar:

- Desktop expanded width: `w-72`.
- Desktop collapsed width: `w-[80px]`.
- Mobile drawer: `fixed`, `85vw`, `max-w-[320px]`.
- Background: `bg-q-bg/95`.
- Effects: `backdrop-blur-xl`, right border, desktop shadow.
- Structure: logo, optional workspace switcher, project switcher, nav, footer controls.
- Nav sections: fixed dashboard item, websites, ecommerce, tools, agency/admin items, settings.
- Supports drag reorder with `@dnd-kit`.
- Supports mobile swipe-to-close.
- Footer includes theme switcher, language selector, credits widget, plan attention alert, user identity, logout.

Do not modify the sidebar until a future chunk names it explicitly.

### Dashboard Home

Current dashboard home:

- `DashboardWelcome` displays greeting, tenant/app logo, account CTA area, subtitle, and AI prompt launcher.
- AI prompt launcher uses `quimera-ai-launcher` and `quimera-ai-launcher-enter`.
- `DashboardStatusCards` renders a responsive metric grid.
- `DashboardDraggableSection` wraps projects, templates, leads, and news.
- `quimera-dashboard-section-deck` frames the draggable section stack.

Dashboard home should keep its brand strength until a future chunk defines a different target.

### Headers

Internal dashboard header:

- Height: `h-14`.
- Position: `sticky top-0`.
- Class: `quimera-dashboard-header-bar`.
- Left: mobile menu, Lucide section icon, title.
- Right: search button, shared `HeaderBackButton`.
- Uses `text-q-text`, `text-q-text-muted`, `hover:bg-q-surface-overlay`.

Public website header:

- Component: `Header.tsx`.
- Supports sticky, transparent, glass, floating, bordered, gradient, segmented, and centered layouts.
- Uses editor-provided colors and inline styles.
- Uses `font-header`, nav transform variables, mobile portal drawer, optional cart/search/login/CTA controls.

Do not change dashboard header behavior in a documentation chunk.

## Component Families

### Buttons

Current shared primitive:

- `components/ui/primitives/Button.tsx`.
- Variants: `primary`, `secondary`, `ghost`, `destructive`, `default`, `outline`, `link`.
- Sizes: `sm`, `md`, `lg`, `icon`, `icon-sm`, `icon-lg`.
- Shape: `rounded-[var(--q-radius-md,6px)]`.
- Focus: `focus-visible:ring-2 focus-visible:ring-q-accent/25`.
- Active: `active:scale-[0.98]`.

Current reality: many dashboard/public/editor surfaces still use local class stacks. Future chunks should migrate only the targeted surface.

### Cards

Current shared primitive:

- `components/ui/primitives/Card.tsx`.
- Variants: `default`, `glass`, `elevated`.
- Hover: `none`, `lift`, `glow`.
- Uses `bg-q-surface`, `bg-q-surface-elevated`, `border-q-border`, `text-q-text`.

Current dashboard cards:

- Status cards are local button cards.
- They use `rounded-xl sm:rounded-2xl`, `border-q-border/60`, `bg-q-surface/80`, `backdrop-blur-xl`, and gradient blobs.
- Mobile grid is compact: `grid-cols-2`.

Rule: avoid nested framed surfaces. Use one meaningful card container per repeated item or modal.

### Editor Surfaces

Current editor primitives:

- Inputs and textareas: `bg-q-bg/80`, `border-q-border/80`, `rounded-md`, `text-q-text`.
- Select popovers: `bg-q-surface`, `border-q-border`, `shadow-xl`.
- Segmented controls: `bg-q-surface`, `border-q-border`, active `bg-q-accent text-q-bg`.
- Slider: native range with `accent-editor-accent`.
- Position grid: Lucide directional icons.
- Clean control helper: `.quimera-clean-controls` flattens older nested cards into section dividers.

Known current issues to handle in future scoped chunks:

- Some editor actions still use inline SVG icons.
- The current medium switch primitive uses `translate-x-5`, while the target rule is exact 44x24 track, 20x20 knob, 2px margins.

Do not fix these during documentation-only work.

### Public Website Components

Current public rendering:

- `LandingPage.tsx` resolves editor/project data and renders public sections.
- `Header.tsx` and `Footer.tsx` are public-site components, not dashboard components.
- Public components support per-site colors, fonts, visibility, ecommerce state, blog/CMS routes, realty routes, and checkout/product pages.
- Public components may use inline styles by design because generated sites need per-project customization.

Rule: do not apply dashboard cleanup rules to public website output unless the chunk explicitly targets public website components.

## Visual Rules For Future Chunks

- Use `--q-*` tokens for touched app UI.
- Keep internal app surfaces calm and operational.
- Preserve the public website renderer's data-driven styling model.
- Prefer Lucide icons for functional controls when editing a surface.
- Do not add decorative wrappers around controls.
- Do not create cards inside cards.
- Keep mobile targets at least 44px where practical.
- Keep dashboard header identity consistent: section icon, title, right-side actions, shared back button.
- Keep sidebar changes isolated to a sidebar chunk.
- Keep dashboard home changes isolated to a dashboard-home chunk.
- Keep editor-control changes isolated to an editor-controls chunk.
- Verify UI chunks in browser after implementation.

## Suggested Future Chunk Order

1. Token audit cleanup: align docs and any missing CSS custom properties without changing components.
2. Shared primitives audit: Button/Card usage inventory only, then targeted migrations.
3. Editor controls pass: icons, switches, flattened groups, and consistency.
4. Dashboard header pass: only if new requirements appear.
5. Sidebar pass: navigation density, active states, footer controls, and mobile drawer.
6. Dashboard home pass: AI launcher, status cards, section deck, and mobile layout.
7. Public website pass: header/footer/landing components with generated-site constraints.

Each chunk should make the smallest useful change and commit independently.
