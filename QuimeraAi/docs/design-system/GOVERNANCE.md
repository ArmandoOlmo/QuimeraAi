# Governance

## Owners

Design System ownership should sit with product design + frontend platform. Until formal owners exist, changes to `src/design-system`, `src/styles/tokens.css`, `src/styles/theme.css` and `componentRegistry` require senior frontend review.

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

## Naming

- Component names: PascalCase
- Token names: semantic, not visual-only
- Registry ids: `ds.component-name`
- Variants: lowercase camelCase

## Versioning

Current DS version: `0.1.0`.

Increment minor version when adding stable components. Increment patch version for docs or token aliases.
