# Visual Baseline

DS-05 locks the approved Quimera visual baseline. The goal is to let the Design System keep improving structure, tokens, wrappers and governance without silently redesigning editor surfaces that product has already approved.

## Approved Visual State

The current builder/editor look is approved as the visual baseline:

- Website Builder
- Website Landing Page Studio
- Storefront Builder
- AI Editor / AI Studio editor surfaces
- `ComponentTree`
- `EditorControlPrimitives`
- `EcommerceControls`
- `ControlsShared`
- existing color picker, sliders, toggles, inputs, background controls and gradient controls inside those editors

Audit findings in these areas are baseline debt, not automatic migration targets. They should be reduced only when the resulting UI is visually equivalent or when a focused redesign is approved.

## Visual Locked Areas

These files and surfaces are visual locked:

- `components/ui/EditorControlPrimitives.tsx`
- `components/ui/EcommerceControls.tsx`
- `components/controls/ControlsShared.tsx`
- `components/ui/ComponentTree.tsx`
- `components/ui/ColorControl.tsx`
- `components/controls/**`
- `components/dashboard/admin/LandingPageEditor.tsx`
- `components/dashboard/admin/LandingPageControls.tsx`
- `components/dashboard/BioPageBuilder.tsx`
- `components/dashboard/ecommerce/views/StorefrontEditorView.tsx`
- `components/dashboard/ai/AiAssistantDashboard.tsx`

Do not replace these visuals with `SectionCard`, `InspectorGroup`, `BuilderControl`, `ProductCard`, `AppCard`, `Button`, `Input`, `Select`, `Tabs` or other DS components as part of broad cleanup.

## Allowed Changes

Allowed without a focused visual review:

- Documentation updates.
- Registry and metadata updates.
- Type-only changes.
- Bug fixes that do not change visible UI.
- Accessibility fixes that preserve layout, spacing, color, radius and interaction affordances.
- Compatibility wrappers that keep existing DOM/CSS output visually equivalent.
- Audit categorization and allowlist changes.

## Blocked Changes

Blocked unless explicitly approved:

- New colors, shadows, radius, spacing or typography in visual locked editors.
- Swapping legacy controls for DS controls if the rendered editor changes.
- Reordering editor panels, groups, toolbars, tree rows or canvas chrome.
- Replacing the existing Color Picker.
- Changing slider, toggle, input, select or segmented-control visual treatment.
- Moving ecommerce admin forms into storefront canvas or storefront controls into ecommerce admin flows.

## Migration Rules

1. Shell/admin/dashboard areas may continue to normalize through DS tokens and components.
2. Visual locked editor areas are structural-only unless a focused visual PR is requested.
3. Existing builder business logic, route handling and storefront rendering must remain untouched during visual governance PRs.
4. New builder controls should use DS contracts, but only in new surfaces or with screenshot parity.
5. Color control work must use the existing `ColorControl` as the official picker source.
6. `npm run ds:audit -- --visual-locked --baseline` should show baseline debt separately from migration-safe debt.

## Review Checklist

- No diff in visual locked files unless the PR is specifically scoped to them.
- If a locked file changes, screenshots prove no visual drift or the PR includes explicit visual approval.
- Existing editor flows still open, select sections, edit controls and preview content.
- Color picker, background and gradient controls remain recognizable and usable.
- `npm run ds:audit` passes.
- `npm run ds:audit -- --changed` passes.
- `npm run ds:audit -- --visual-locked --baseline` passes and reports baseline findings as allowed.
- `npm run build` passes.

## Localhost Validation

Run the app and inspect the approved surfaces:

```bash
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/`.

Manual screens to compare:

- dashboard shell and settings shell
- Website Builder left tree, canvas and inspector
- Landing Page Studio left tree, canvas and inspector
- Storefront Builder ecommerce controls
- AI Editor control panels
- Color Picker, gradient controls, sliders, toggles, inputs and selects

## Exceptions

An exception is acceptable only when one of these is true:

- Product/design explicitly approves a visual change for a locked editor surface.
- The change fixes a production bug and any visual impact is documented.
- An accessibility issue cannot be fixed without a small visual adjustment, and that adjustment is reviewed.
- A new editor surface is being built and is not replacing the approved existing editor UI.
