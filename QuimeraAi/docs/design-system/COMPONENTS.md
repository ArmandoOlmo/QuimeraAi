# Components

Canonical components live in `src/design-system/components`.

Canonical availability does not imply immediate visual adoption in approved editors. DS-05 locks the current builder/editor baseline; see `VISUAL_BASELINE.md` before replacing editor primitives.

## Foundation

- `Button`: `primary`, `secondary`, `ghost`, `subtle`, `destructive`, `link`, `icon`
- `IconButton`: icon-only button with controlled sizes and required label

## Forms

- `Input`: label, helper text, error, prefix, suffix, disabled, required
- `Select`: native select wrapper for simple option sets
- `Textarea`: multi-line input
- `Toggle`: binary state
- `Slider`: intensity, size, radius, opacity and similar numeric controls
- `ColorPickerField`: wrapper around existing `ColorControl`

## Layout

- `AppShell`: canonical application frame for dashboard/admin/settings surfaces
- `AppShellMain`: flex column region beside the sidebar
- `AppShellTopbar`: sticky tokenized topbar/header surface
- `AppShellContent`: scrollable main content region
- `Card`: `default`, `elevated`, `interactive`, `selected`, `muted`, `danger`, `dashboard`, `editor`
- `Panel`: `settings`, `inspector`, `sidebar`, `floating`
- `SectionCard`: shared section list item for Website Builder, Landing Studio and Storefront Builder
- `InspectorGroup`: grouped right-panel controls, with optional collapsible behavior
- `BuilderControl`: wrapper for content, color, gradient, intensity, spacing, radius, typography, layout, visibility and responsive controls
- `PageHeader`: page-level title/action pattern for new dashboard, admin and settings screens

## Feedback

- `Badge`: `default`, `success`, `warning`, `danger`, `info`, `primary`, `muted`
- `Alert`: `info`, `success`, `warning`, `danger`
- `EmptyState`: empty/no-result state with primary and secondary actions
- `Modal`: Radix Dialog modal using Quimera tokens
- `Drawer`: left/right side panel
- `Tooltip`: re-export of existing Radix tooltip wrapper

## Navigation

- `Tabs`: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `SidebarNav`: current dashboard sidebar implementation in `components/dashboard/DashboardSidebar.tsx`; DS-04 normalizes active/hover states, visible buttons, mobile/collapsed variants and icon sizing while preserving existing route and permission logic.
- `components/ui/sidebar.tsx`: low-level sidebar primitive compatible with Radix `Slot`; the rail control intentionally remains a raw primitive button.

## Icon Sizing

- `AppIcon`: preferred Lucide icon wrapper for app shell, dashboard, settings and admin chrome.
- Size classes: `icon-xs`, `icon-sm`, `icon-md`, `icon-lg`, `icon-xl`.
- Navigation icons should use `icon-md`; topbar title icons use `icon-lg`; compact badges/actions use `icon-xs` or `icon-sm`.

## Data Display

- `Table`: header, row, cell, empty and loading states

Compatibility wrappers also exist in `components/ui` for lowercase imports: `button`, `alert`, `select`, `table`, `tabs`, `textarea`, plus `EmptyState`.

## Builder Controls

- `EditorControlPrimitives`: legacy import path for builder inputs, textareas, selects, toggles, sliders and segmented controls. Keep its current visual treatment until a focused editor redesign is approved.
- `BackgroundControls`: reusable background editor for Soft Aurora, Radial Glow, Linear Premium and Mesh Soft.
- `GradientControls`: alias of `BackgroundControls` for gradient-focused builder UIs.
- `ColorPickerField`: the official DS wrapper around the existing `ColorControl`; do not create another picker.
- `ComponentTree`: keeps its legacy section-row UI for now.
- `ControlsShared`: keeps its legacy editor shell UI for now.
- `SectionCard`, `InspectorGroup` and `BuilderControl`: canonical DS contracts for new or explicitly approved builder work. Do not use them to visually replace approved editor surfaces without screenshot parity or design approval.
- Visual locked components are marked in `src/design-system/registry/componentRegistry.ts` with `visualStatus: "visual-locked"` and `migrationMode: "do-not-touch-visual"`.

## Ecommerce

- `ProductCard`: `minimal`, `marketplace`, `luxury`, `compact`, `imageFirst`, `quickBuy`
- `EcommerceControls`: storefront/editor controls keep their previous visual treatment for now.

Existing storefront variants still exist in `utils/productCard`. New AI-generated storefront UI should normalize variants through the registry before rendering.

For DS-06, normalize ecommerce/product/storefront surfaces structurally first. Do not change Storefront Builder editor controls unless the PR is explicitly scoped to visual review.
