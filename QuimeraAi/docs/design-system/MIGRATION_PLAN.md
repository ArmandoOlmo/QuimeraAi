# Migration Plan

## Migrated in This Pass

- Added token files and theme helpers.
- Added TS token inventory.
- Added canonical components.
- Added component registry for AI Studio/builders.
- Added gradient presets and background controls.
- Added design-system audit script and `npm run ds:audit`.
- Added DS-05 visual baseline governance and scoped audit modes.
- Prepared Button compatibility aliases for canonical variants.
- Updated `components/ui/input.tsx` to use DS Input.
- Updated `AppButton` to wrap DS Button.
- Updated dashboard EmptyState actions to use `AppButton`.

## Migrated in DS-02

- `components/ui/button.tsx` and `components/ui/primitives/Button.tsx` now reexport the canonical Button.
- `components/ui/primitives/Card.tsx` uses DS radius, motion and elevation tokens.
- `components/ui/system/AppCard.tsx` uses DS radius, spacing, motion and elevation tokens.
- `components/ui/system/StatusBadge.tsx` wraps canonical `Badge`.
- `components/ui/AppSelect.tsx` and `components/ui/DashboardSelect.tsx` use DS radius, shadow, motion and scrollbar tokens.
- `components/ui/Modal.tsx` removed inline animation-duration styles and uses tokenized durations/radius.
- `components/ui/sheet.tsx` uses DS floating-panel shadow and motion duration tokens.
- Added wrapper files for `textarea`, `select`, `tabs`, `alert`, `table` and `EmptyState`.
- Added `src/components/ui/*` wrappers for agency modules currently excluded from `tsconfig`.
- Added `Tabs` to `src/design-system/components` and to the component registry.

DS-02 audit progress:

- Findings: 10,683 -> 10,672
- Duplicate core component names: 7 -> 3
- Inline styles: 2,778 -> 2,776
- Legacy buttons: 3,296 -> 3,293
- Legacy cards: 168 -> 166

## Migrated in DS-03

- `BuilderControl` now supports helper text, error, required, disabled, action slot, tooltip help and compact density.
- `InspectorGroup` now supports optional collapsible groups for future builder adoption.
- `GradientControls` is available as an alias of `BackgroundControls`; no duplicate gradient or color picker logic was added.
- Editor visual adoption was rolled back after product review: `EditorControlPrimitives`, `ComponentTree`, `ControlsShared` and `EcommerceControls` keep their previous visual treatment.
- `componentRegistry` records DS availability for builder components, but does not claim visual adoption in the existing editors.
- `npm run ds:audit` now supports path and changed-file modes: `--path <file|dir>` and `--changed`.

DS-03 audit progress:

- Findings: 10,672 -> 10,639
- Arbitrary shadows: 136 -> 135
- Legacy buttons: 3,293 -> 3,261
- Duplicate core component names: unchanged at 3
- Inline styles: unchanged at 2,776

Post-review editor restoration:

- The visual editor files were restored to their previous look because the builder/editor UI was already approved.
- This intentionally brings back legacy editor audit findings in those files; do not re-migrate editor visuals without a focused design review.

## Migrated in DS-04

- Added canonical `AppShell`, `AppShellMain`, `AppShellTopbar` and `AppShellContent` layout primitives.
- `Dashboard` now uses the canonical app shell frame and keeps existing dashboard routing, section order and content logic.
- `DashboardHeader` uses `AppShellTopbar`, `AppButton` and `AppIcon` for mobile menu/search actions and title icon sizing.
- `DashboardSidebar` normalizes visible navigation buttons, section toggles, active/hover states, layout widths and icon sizing through DS wrappers/tokens while preserving permissions, mobile gestures, DnD order and route handling.
- `SettingsPage` now uses the canonical app shell, tokenized topbar, DS tabs, `StatusBadge`, `PageContainer`, `AppButton` and `AppIcon`.
- `SettingsStatCard` now uses `AppCard` and `AppIcon`.
- `components/ui/sidebar.tsx` uses layout width tokens and removes arbitrary outline shadows; the low-level rail button remains raw for primitive compatibility.
- `componentRegistry` now records `AppShell`, `PageHeader` and `SidebarNav`.

DS-04 audit progress:

- Findings after editor visual restoration: 10,649
- Arbitrary radius: 33 -> 32
- Arbitrary shadows: 135 -> 130
- Inline styles: 2,776 -> 2,775
- Legacy buttons after editor visual restoration: 3,282
- Legacy cards: 166 -> 162
- Duplicate core component names: unchanged at 3
- Changed-file audit after restoration: 5 findings, limited to legacy buttons in select primitives and the low-level sidebar rail.
- Scoped shell audit: 24 -> 1 finding; the remaining item is the low-level rail button in `components/ui/sidebar.tsx`.

## Migrated in DS-05

- Added `VISUAL_BASELINE.md` to lock the approved visual state for Website Builder, Landing Page Studio, Storefront Builder and AI Editor surfaces.
- Updated governance rules so broad DS migration PRs cannot redesign `EditorControlPrimitives`, `ComponentTree`, `ControlsShared`, `EcommerceControls`, `ColorControl`, editor panels, canvas chrome or color/gradient controls.
- Added registry metadata for visual status, migration mode, allowed change types, visual lock reason and visual approval requirements.
- Marked `AppShell`, `PageHeader` and `SidebarNav` as DS-normalized or migration-safe.
- Marked visual editor primitives as `visual-locked` / `do-not-touch-visual`.
- Extended `npm run ds:audit` with scoped baseline modes:
  - `npm run ds:audit -- --visual-locked --baseline`
  - `npm run ds:audit -- --shell --baseline`

DS-05 audit baseline:

- Global audit: 942 files scanned, 10,650 findings.
- Visual locked audit: 62 files scanned, 1,203 findings, 1,203 baseline-allowed, 0 needs-review.
- Shell audit: 13 files scanned, 5 findings, all legacy buttons in low-level sidebar/select primitives.
- Changed-file audit for DS-05 files: 17 files scanned, 0 findings.
- Editor visual debt is now tracked as approved baseline debt, not an automatic cleanup target.

## Recommended PR Sequence

### PR DS-00 Audit

- Keep `QUIMERA_DESIGN_SYSTEM_AUDIT.md` current.
- Add audit output snapshots to PR description.

### PR DS-01 Token Foundation

- Replace module-local app/admin colors with semantic tokens.
- Leave editable storefront content colors alone unless they are admin UI chrome.

### PR DS-02 Core Components - Completed

- Migrate `components/ui/primitives/Button.tsx`, `Card.tsx`, `StatusBadge`, Modal and Sheet.
- Reduce duplicate Button/Card/Input/Modal implementations.

### PR DS-03 Builder Components - Completed

- Adopt `SectionCard`, `InspectorGroup`, `BuilderControl`, `ColorPickerField`, `BackgroundControls` and `Tabs` in builder shared controls.
- Start with shared controls, not every section file.

### PR DS-04 App Shell Normalization - Completed

- Sidebar.
- Header/topbar.
- Dashboard cards.
- Settings layout.
- Icon sizing.
- Buttons HTML directos.
- Panels globales.
- Navegacion principal.

### PR DS-05 Visual Baseline Lock + Structural Guardrails - Completed

- Visual baseline documentation.
- Governance for locked editor surfaces.
- Registry metadata for visual status and migration mode.
- Scoped audit modes for visual locked and shell surfaces.

### PR DS-06 Product / Storefront / Ecommerce Surface Normalization

- Product rows.
- Collection rows.
- Storefront cards.
- Ecommerce admin cards.
- Product grid controls.
- Product badges.
- Price display.
- Inventory states.
- Cart/storefront UI surfaces.
- Reduce ecommerce/storefront-specific visual debt without changing commerce data flows.

### PR DS-07 Governance + QA

- Turn `npm run ds:audit -- --strict` on for changed files.
- Add visual regression coverage for dashboard, settings, builder inspector and ecommerce admin.

## Pending Risks

- Full `npm run type-check` currently fails from preexisting issues outside this DS pass.
- React type duplication appears in markdown/chat/sidebar primitives.
- Many storefront/marketing pages intentionally use inline editable styles; audit needs allowlists by surface.
- `legacy-button` count is high because raw buttons are common in old screens.
- Visual locked editor files intentionally keep baseline debt until a focused visual review approves otherwise.

## Acceptance Checklist

- Tokens exist and are imported.
- Components exist and support controlled variants.
- Registry exists and exposes AI-selectable components.
- Color picker wrapper uses existing picker.
- Background presets are reusable.
- Audit script runs.
- Migration plan identifies next PRs and risks.
- Visual locked editor surfaces are protected by docs, registry metadata and scoped audit output.
