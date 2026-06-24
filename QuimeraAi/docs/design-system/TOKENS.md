# Tokens

Los tokens viven en CSS y TypeScript.

- CSS: `src/styles/tokens.css`
- TS: `src/design-system/tokens/tokens.ts`

## Color

- `--q-color-background`
- `--q-color-surface`
- `--q-color-surface-elevated`
- `--q-color-surface-muted`
- `--q-color-border`
- `--q-color-border-subtle`
- `--q-color-text-primary`
- `--q-color-text-secondary`
- `--q-color-text-muted`
- `--q-color-text-inverse`
- `--q-color-primary`
- `--q-color-primary-hover`
- `--q-color-primary-active`
- `--q-color-accent`
- `--q-color-success`
- `--q-color-warning`
- `--q-color-danger`
- `--q-color-info`

Light mode sigue usando la paleta calida/neutra existente con acento Quimera. Dark mode queda preparado mediante variables existentes en `main.css`.

## Typography

- `--q-font-sans`
- `--q-font-mono`
- `--q-font-size-caption`
- `--q-font-size-label`
- `--q-font-size-body`
- `--q-font-size-body-lg`
- `--q-font-size-heading-sm`
- `--q-font-size-heading-md`
- `--q-font-size-heading-lg`
- `--q-line-height-tight`
- `--q-line-height-body`

## Spacing

Escala requerida:

- 0: `--q-space-0`
- 2: `--q-space-0-5`
- 4: `--q-space-1`
- 6: `--q-space-1-5`
- 8: `--q-space-2`
- 10: `--q-space-2-5`
- 12: `--q-space-3`
- 16: `--q-space-4`
- 20: `--q-space-5`
- 24: `--q-space-6`
- 32: `--q-space-8`
- 40: `--q-space-10`
- 48: `--q-space-12`
- 64: `--q-space-16`

## Radius

- `--q-radius-none`
- `--q-radius-xs`
- `--q-radius-sm`
- `--q-radius-md`
- `--q-radius-lg`
- `--q-radius-xl`
- `--q-radius-2xl`
- `--q-radius-full`

## Borders / Shadows / Icons / Motion / Layout

- Borders: `--q-border-width`, `--q-border-divider`, `--q-border-panel`, `--q-border-card`, `--q-border-input`, `--q-focus-ring`
- Shadows: `--q-shadow-none`, `--q-shadow-subtle`, `--q-shadow-card`, `--q-shadow-dropdown`, `--q-shadow-modal`, `--q-shadow-floating-panel`
- Icons: `--q-icon-xs`, `--q-icon-sm`, `--q-icon-md`, `--q-icon-lg`, `--q-icon-xl`
- Motion: `--q-duration-fast`, `--q-duration-normal`, `--q-duration-slow`, `--q-ease-standard`, `--q-ease-emphasized`
- Layout: sidebar, topbar, inspector, builder panels, content width, dashboard gap
