# Governance

## Owners

Design System ownership should sit with product design + frontend platform. Until formal owners exist, changes to `src/design-system`, `src/styles/tokens.css`, `src/styles/theme.css` and `componentRegistry` require senior frontend review.

## Visual Baseline Lock

DS-05 locks the approved builder/editor visual baseline. The Design System can keep normalizing structure, metadata, tokens and compatibility wrappers, but visual locked editors must not be redesigned as part of broad migration work.

Visual locked surfaces are documented in `VISUAL_BASELINE.md` and currently include:

- Website Builder
- Website Landing Page Studio
- Storefront Builder
- AI Editor / AI Studio editor surfaces
- `ComponentTree`
- `EditorControlPrimitives`
- `EcommerceControls`
- `ControlsShared`
- the existing Color Picker, sliders, toggles, inputs, background controls and gradient controls inside those editors

Audit findings in those files are baseline findings. They are allowed until a focused migration proves visual parity or product/design approves a visual change.

## Migration Modes

- `visual-and-structural`: component can be adopted visually and structurally in approved surfaces.
- `structural-only`: logic, wrappers, typing and routing can improve, but visual output should stay equivalent.
- `new-work-only`: component is available for new surfaces, but should not replace existing approved UI without review.
- `do-not-touch-visual`: visual output is locked; only docs, types, registry, bug fixes and accessibility work are allowed by default.

## Adding Components

1. Confirm no existing component covers the use case.
2. Add component in `src/design-system/components`.
3. Use tokens, not hardcoded colors/radius/shadows.
4. Add variants explicitly.
5. Add registry entry.
6. Document usage in `COMPONENTS.md`.
7. Run `npm run ds:audit`.

## Deprecating Components

1. Mark registry item as `deprecated`.
2. Add migration target in notes.
3. Search imports/usages with `rg`.
4. Migrate by surface, not by deleting globally.

## PR Rules

- New UI must use DS tokens/components.
- Hex/rgb colors in app/admin UI require justification.
- Raw `<button>` is allowed only for low-level primitives or highly local controls; otherwise use `Button`/`AppButton`.
- Icon-only buttons must have an accessible label.
- New builder controls must use `BuilderControl`, `InspectorGroup`, `Slider`, `Toggle`, `Select` or `ColorPickerField`.
- New dashboard/admin/settings pages should use `AppShell`, `AppShellTopbar`, `AppShellContent`, `PageContainer` and `PageHeader` where applicable.
- Shell/navigation icons should use `AppIcon` or `icon-*` classes; avoid inline `size={...}` on Lucide icons in app chrome.
- Sidebar or navigation changes must preserve route handling, permission checks, locked states, mobile behavior and workspace/project switchers.
- Do not touch visual locked editor files in broad DS cleanup PRs.
- Do not replace existing editor controls with canonical DS controls unless screenshots prove visual parity or a focused visual approval exists.
- Do not introduce a second Color Picker; `components/ui/ColorControl.tsx` remains the official picker source.
- Any PR touching locked editor visuals must include before/after localhost screenshots and the reason for the exception.
- Run `npm run ds:audit -- --visual-locked --baseline` when a PR touches editor/builder code.
- Run `npm run ds:audit -- --shell --baseline` when a PR touches dashboard shell/navigation code.

## Codex / Agent Rules

- Read `VISUAL_BASELINE.md` before migrating builder/editor UI.
- Prefer wrappers and metadata changes over visual rewrites in locked surfaces.
- If a user reports visual damage in an editor, stop migrating that surface and restore the approved look before continuing.
- Keep unrelated user changes in the worktree intact.

## Naming

- Component names: PascalCase
- Token names: semantic, not visual-only
- Registry ids: `ds.component-name`
- Variants: lowercase camelCase

## Versioning

Current DS version: `0.1.0`.

Increment minor version when adding stable components. Increment patch version for docs or token aliases.
