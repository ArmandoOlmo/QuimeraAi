# Quimera Design System Audit

Fecha de auditoria: 2026-06-24

## Resumen

Quimera ya tenia una base parcial de sistema visual: variables `--q-*`, Tailwind 4 con `@theme`, componentes shadcn-like en `components/ui`, wrappers de producto en `components/ui/system`, controles de builder en `components/ui/EditorControlPrimitives.tsx` y componentes ecommerce/storefront especializados. El problema principal no es ausencia total de tokens; es falta de gobierno, duplicacion de primitivas y adopcion irregular.

Nivel de madurez actual: **2.5 / 5**

- 0: estilos sueltos
- 1: componentes aislados
- 2: componentes reutilizados parcialmente
- 3: tokens + componentes
- 4: sistema documentado
- 5: sistema gobernado con metricas

La fundacion agregada en esta pasada eleva el sistema hacia nivel 3: tokens documentados, componentes canonicos, registry, backgrounds reutilizables y script de auditoria.

## Mapa de Superficies

- AI Studio: usa contexto de editor y generacion; necesita consumir `componentRegistry` para elegir componentes seguros.
- Dashboard: `components/dashboard/*`; ya usa `AppButton`, `MotionCard`, `StatusBadge`, sidebar/header tokenizados parcialmente.
- Website Builder: `components/controls/*`, `components/ui/EditorControlPrimitives.tsx`, `components/ui/ColorControl.tsx`.
- Website Landing Page Studio: `components/dashboard/admin/LandingPageEditor.tsx`, controles compartidos con builders.
- Storefront Builder: storefront/theme logic en `utils/storefrontTheme/*`, ecommerce sections en `components/ecommerce/sections/*`.
- Ecommerce Admin: `components/dashboard/ecommerce/*`, tablas/vistas con cards y botones mixtos.
- Product Management / Orders / Customers: `components/dashboard/ecommerce/views/*`.
- CRM / Leads: `components/dashboard/leads/*`.
- Email Marketing: `components/dashboard/email/*`, editor de email con controles propios.
- Chatbot: `components/dashboard/ai/*`, `components/chat/*`.
- Media AI: `components/media-generator/*`, `components/ui/ImageGenerator*`.
- Citas: `components/dashboard/appointments/*`.
- Restaurant: `components/dashboard/restaurants/*`.
- Real Estate: `components/dashboard/realty/*`.
- Finanzas: `components/dashboard/finance/*`.
- Analytics: `components/dashboard/admin/AnalyticsDashboard.tsx`, `components/dashboard/AnalyticsWidget.tsx`.
- Settings: `components/dashboard/settings/*`, `components/dashboard/tenant/*`.
- Super Admin: `components/dashboard/admin/*`.
- Auth / Onboarding: `components/Auth.tsx`, `components/ModernAuth.tsx`, `components/onboarding/*`.

## Inventario Actual

- Buttons: `components/ui/button.tsx`, `components/ui/primitives/Button.tsx`, `components/ui/system/AppButton.tsx`, botones HTML directos.
- Inputs: `components/ui/input.tsx`, `components/ui/EditorControlPrimitives.tsx`, inputs locales en modulos.
- Selects / Dropdowns: `AppSelect`, `DashboardSelect`, `EditorControlPrimitives.Select`, selects nativos locales.
- Textareas: `EditorControlPrimitives.TextArea`, textareas locales.
- Checkboxes / Toggles: `ToggleControl`, checkboxes locales.
- Sliders: `SliderControl`, range inputs locales.
- Color Picker: `components/ui/ColorControl.tsx` es el picker existente canonico.
- Cards: `components/ui/primitives/Card.tsx`, `components/ui/system/AppCard.tsx`, `MotionCard`, cards locales.
- Tables: multiples implementaciones por modulo; no hay tabla canonica global.
- Modals / Drawers: `components/ui/Modal.tsx`, Radix `sheet.tsx`, modales locales.
- Sidebars / Headers: `DashboardSidebar`, `DashboardHeader`, `components/ui/sidebar.tsx`.
- Tabs: settings/admin/email usan patrones locales.
- Badges / Alerts / Empty States: `StatusBadge`, `components/dashboard/EmptyState.tsx`, badges locales.
- Tooltips / Dropdowns / Command menus: Radix tooltip existe; command menu no esta consolidado.
- Product Cards: `components/dashboard/ecommerce/components/ProductCard.tsx`, `utils/productCard`, ecommerce sections.
- Section Cards / Builder Controls / Inspector Panels: existen como patrones en controls, no como contrato global.
- Preview Frames / Navigation components: existen en builders/dashboard, no todos tokenizados.

## Inconsistencias Detectadas

Resultado actualizado de `npm run ds:audit` en DS-04:

- Archivos escaneados: 938
- Hallazgos totales: 10,649
- Hex colors hardcodeados: 3,696
- `rgb/rgba` hardcodeados: 569
- `style={{ ... }}`: 2,775
- botones legacy / `<button>` directos: 3,282
- cards legacy / duplicadas: 162
- shadows arbitrarias no tokenizadas: 130
- radius arbitrarios no tokenizados: 32
- nombres duplicados de componentes core: 3

Audit por scope:

- Global: `npm run ds:audit`
- Archivos modificados del workspace: `npm run ds:audit -- --changed`
- Paths concretos: `npm run ds:audit -- --path components/ui/EditorControlPrimitives.tsx --path components/ui/EcommerceControls.tsx`
- Visual locked editors: `npm run ds:audit -- --visual-locked --baseline`
- Shell/navigation: `npm run ds:audit -- --shell --baseline`

Principales inconsistencias:

- Colores hardcodeados en marketing, auth, storefront, blog, ecommerce y presets.
- Multiples botones con variantes no gobernadas.
- Cards con radius y shadows propios por modulo.
- Iconos con tamanos mezclados (`size`, `w/h`, `icon-*`, hardcoded px).
- Builders mezclan contenido, estilo y avanzado en controles sin contrato comun.
- Ecommerce admin y storefront comparten nombres pero no responsabilidades visuales.
- Dark/light mode existe, pero muchas superficies tienen overrides locales incompletos.
- TypeScript global ya falla por deuda previa, incluyendo tipos React duplicados y tipos de datos antiguos.

## Riesgos

- Deuda visual creciente al agregar modulos nuevos.
- AI Studio puede generar UI fuera del sistema si no consulta el registry.
- Dificultad para mantener Website Builder, Landing Studio y Storefront Builder sincronizados.
- Riesgo de accesibilidad por focus states inconsistentes y botones icon-only sin labels.
- Riesgo de bugs por duplicacion de Button/Card/Input/Modal.
- Migraciones grandes pueden romper flujos criticos si se hacen de una vez.

## Decision de Implementacion

Se agrego una fundacion minima robusta sin redisenar toda la app:

- `src/styles/tokens.css`
- `src/styles/theme.css`
- `src/design-system/tokens/*`
- `src/design-system/components/*`
- `src/design-system/backgrounds/*`
- `src/design-system/registry/*`
- `scripts/audit-design-system.ts`

Adopcion inicial:

- `components/ui/button.tsx` reexporta el Button canonico.
- `components/ui/input.tsx` apunta al Input del DS.
- `components/ui/system/AppButton.tsx` envuelve el Button canonico.
- `components/dashboard/EmptyState.tsx` usa `AppButton`.

Adopcion DS-02:

- `components/ui/button.tsx` y `components/ui/primitives/Button.tsx` reexportan el Button canonico.
- `components/ui/primitives/Card.tsx` y `components/ui/system/AppCard.tsx` usan tokens globales de radius, motion y elevation.
- `components/ui/system/StatusBadge.tsx` envuelve `Badge`.
- `components/ui/AppSelect.tsx`, `DashboardSelect.tsx`, `Modal.tsx` y `sheet.tsx` quedaron normalizados con tokens.
- Se agregaron wrappers `textarea`, `select`, `tabs`, `alert`, `table` y `EmptyState` para imports nuevos.
- `src/components/ui/*` ahora existe como capa compatible para los modulos agency excluidos del type-check.

Adopcion DS-03:

- `BuilderControl` soporta helper text, error, required, disabled, action slot, tooltip/help y compact density.
- `InspectorGroup` soporta grupos colapsables opcionales.
- La adopcion visual de `EditorControlPrimitives`, `ComponentTree`, `ControlsShared` y `EcommerceControls` fue revertida para preservar el diseño aprobado de los editores.
- `BackgroundControls` y `GradientControls` quedan disponibles para builders compartidos sin duplicar Color Picker ni logica de gradients.
- `componentRegistry` documenta disponibilidad de `BuilderControl`, `InspectorGroup`, `SectionCard`, `BackgroundControls`, `GradientControls` y `EcommerceControls`, sin afirmar adopcion visual en editores existentes.

Adopcion DS-04:

- `src/design-system/components/AppShell.tsx` agrega `AppShell`, `AppShellMain`, `AppShellTopbar` y `AppShellContent`.
- `components/dashboard/Dashboard.tsx` usa el shell canonico sin cambiar rutas ni orden de secciones.
- `components/dashboard/DashboardHeader.tsx` usa `AppShellTopbar`, `AppButton` y `AppIcon`.
- `components/dashboard/DashboardSidebar.tsx` migra botones visibles de navegacion, toggles de secciones, toggles mobile/desktop, perfil y logout hacia wrappers DS; tambien normaliza icon sizing y layout widths.
- `components/dashboard/settings/SettingsPage.tsx` usa shell canonico, topbar tokenizado, DS tabs, `StatusBadge` y `PageContainer`.
- `components/dashboard/settings/SettingsStatCard.tsx` usa `AppCard` y `AppIcon`.
- `components/ui/sidebar.tsx` usa tokens de ancho y elimina sombras outline arbitrarias, manteniendo el rail raw por compatibilidad de primitive.
- `componentRegistry` incluye `AppShell`, `PageHeader` y `SidebarNav`.

Adopcion DS-05:

- `VISUAL_BASELINE.md` define el baseline visual aprobado y las superficies bloqueadas.
- `GOVERNANCE.md` ahora distingue migraciones visuales, estructurales, new-work-only y do-not-touch visual.
- `componentRegistry` agrega `visualStatus`, `migrationMode`, `visualLockReason`, `allowedChangeTypes` y `requiresVisualApproval`.
- `AppShell`, `PageHeader` y `SidebarNav` quedan marcados como DS-normalized o migration-safe.
- `EditorControlPrimitives`, `ControlsShared`, `ComponentTree`, `EcommerceControls` y `ColorControl` quedan marcados como visual-locked.
- `npm run ds:audit` reporta scopes y baseline debt para editores bloqueados y shell.

## Areas No Migradas Todavia

- `components/ui/sidebar.tsx` mantiene un rail `<button>` raw de bajo nivel por compatibilidad con el primitive y `Slot`.
- `components/ui/Modal.tsx` sigue usando API legacy por compatibilidad; visualmente ya usa tokens.
- Ecommerce storefront mantiene variantes visuales existentes.
- Settings internos (`TeamSettings`, `SubscriptionSettings`, `BrandingSettings`) aun conservan botones y paneles locales; DS-04 normalizo el shell y tabs base.
- Muchas secciones del builder aun importan `ColorControl` directamente; se conserva por compatibilidad y porque es el picker oficial.
- Presets/marketing siguen usando colores inline por ser contenido editable o legacy.
- Product/collection list rows dentro de `EcommerceControls` aun conservan botones HTML internos; los shells principales ya usan DS.

## Resultado DS-04

- Build: `npm run build` pasa; Vite mantiene warnings de chunks grandes.
- Audit global: `npm run ds:audit` pasa con 10,649 findings despues de restaurar visualmente los editores.
- Audit changed: `npm run ds:audit -- --changed` pasa con 5 findings, limitados a botones legacy en select primitives y el rail bajo nivel de sidebar.
- Type-check global sigue fallando por deuda existente, pero el filtro de archivos tocados por DS-04 no reporta errores nuevos.
- Audit scoped de shell/settings/dashboard: 24 -> 1 finding. El finding restante es el rail raw de `components/ui/sidebar.tsx`.

## Resultado DS-05

- Audit global: `npm run ds:audit` pasa con 942 archivos y 10,650 findings.
- Visual locked audit: `npm run ds:audit -- --visual-locked --baseline` pasa con 62 archivos, 1,203 findings, 1,203 baseline-allowed y 0 needs-review.
- Shell audit: `npm run ds:audit -- --shell --baseline` pasa con 13 archivos y 5 findings de botones legacy en primitives/selects de bajo nivel.
- Changed audit: `npm run ds:audit -- --changed --baseline` pasa con 17 archivos y 0 findings para los archivos DS-05 actuales.
- El script distingue scopes `visual-locked`, `shell`, `ds-internal` y `approved-legacy-wrapper`.
- La deuda visual de editores queda documentada como baseline aprobado, no como target automatico de migracion.
- No se deben tocar visualmente los editores bloqueados en PRs amplios del Design System.

## Recomendacion DS-06

PR DS-06 debe enfocarse en Product / Storefront / Ecommerce Surface Normalization:

- product rows
- collection rows
- storefront cards
- ecommerce admin cards
- product grid controls
- product badges
- price display
- inventory states
- cart/storefront UI surfaces
