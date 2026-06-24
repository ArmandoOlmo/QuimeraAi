# Editor Patterns

## Shared Builder Model

Website Builder, Website Landing Page Studio and Storefront Builder should share editor primitives:

- left structure panel
- central canvas / preview
- right inspector panel
- section cards
- inspector groups
- builder controls
- color picker wrapper
- slider/toggle/select controls
- reusable background presets

## App Shell Boundary

DS-04 normalized the application shell outside the builders:

- `Dashboard` and `SettingsPage` use `AppShell`, `AppShellMain`, `AppShellTopbar` and `AppShellContent`.
- `DashboardHeader`, `DashboardSidebar`, settings tabs and settings stat cards now use DS wrappers/tokens for visible shell controls.
- Shell/navigation icon sizing should use `AppIcon` or the existing `icon-*` classes.

Builder canvas and inspector surfaces should not own app-shell layout. Existing editors keep their current visual treatment until a focused editor redesign is approved.

## Left Panel

Use the existing `ComponentTree` visual treatment for section ordering, visibility and selected state. Do not swap it to `SectionCard` without product/design approval.

Current adoption:

- `components/ui/ComponentTree.tsx` intentionally keeps its legacy live section rows.
- Drag, visibility, delete confirmation and selected state remain owned by the builder, not the DS.

## Canvas

Canvas should preview content only. Do not put ecommerce admin controls inside storefront canvas.

## Inspector Panel

Use the current editor inspector styling unless a focused editor migration is explicitly approved.

Control grouping order:

1. Content
2. Layout
3. Style
4. Background
5. Responsive
6. Advanced

`BuilderControl` is available for future editor work. It supports:

- label
- description/helper text
- error
- required
- disabled
- action slot
- tooltip/help
- compact density

Current adoption:

- `components/ui/EditorControlPrimitives.tsx` keeps its previous visual primitives.
- `components/ui/EcommerceControls.tsx` keeps its previous visual controls.
- `components/controls/ControlsShared.tsx` keeps its previous shared editor controls.

## Background Controls

Use `BackgroundControls` or `GradientControls` directly from `src/design-system/backgrounds/backgroundControls.tsx` for new focused work. Do not retrofit existing editor controls without design review.

Presets:

- Soft Aurora
- Radial Glow
- Linear Premium
- Mesh Soft

All presets accept primary, secondary, accent, intensity, focus X/Y, opacity, blur and enabled.

Use the value helpers:

- `createDefaultBackgroundControlValue`
- `createGradientBackground`
- `gradientPresets`

## Color Picker

Use `ColorPickerField`. It wraps the existing `components/ui/ColorControl.tsx`.

Do not add a second picker until the existing one is fully replaced.

Legacy controls that still import `ColorControl` directly are acceptable while migrating section-by-section, but new shared controls should use `ColorPickerField` or the `BackgroundControls` color fields.

## Storefront vs Ecommerce Admin

- Storefront Builder: visual theme, section order, product card style, product grid, collection layout, cart/checkout visual preview, draft/published template state.
- Ecommerce Admin: products, variants, price, inventory, discounts, orders, customers and analytics.

Do not use ecommerce admin forms to control storefront section styling.
