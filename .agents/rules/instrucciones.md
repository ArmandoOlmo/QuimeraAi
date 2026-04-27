---
trigger: always_on
---

## Sistema de Diseño

Antes de crear o modificar cualquier componente visual, CSS, o estilo de la aplicación, **lee el archivo `/DESIGN.md`** en la raíz del proyecto y usa sus tokens (colores, tipografía, radios, sombras, motion, componentes) como referencia obligatoria. No inventes valores de color, font-family, border-radius o sombras — usa los definidos en DESIGN.md.

## Internacionalización (i18n)

Todo texto visible al usuario debe usar `t()` de `react-i18next` — **nunca** escribir strings hardcodeados en JSX. Al crear o modificar cualquier componente:

1. Usa `const { t } = useTranslation();` y referencia claves con `t('namespace.key')`.
2. Añade la clave y su traducción en **ambos** archivos:
   - `locales/es/translation.json` (español)
   - `locales/en/translation.json` (inglés)
3. Agrupa las claves bajo el namespace lógico del componente (ej: `dashboard.`, `leads.`, `ecommerce.`).
4. Si modificas texto existente, actualiza ambos idiomas.

## Modales de Confirmación

**Nunca** usar diálogos nativos del navegador (`window.confirm()`, `window.alert()`, `window.prompt()`). Toda confirmación, alerta o entrada debe usar el componente interno `ConfirmationModal` (`components/ui/ConfirmationModal.tsx`). Esto garantiza un UX consistente, estilizado con el sistema de diseño, y con soporte de i18n.

## Tipografía en Componentes de Sección (Website Builder)

Todo componente de sección del website (`components/` que se renderice dentro de `PageRenderer` o `PublicWebsitePreview`) **debe** heredar las fuentes del proyecto mediante las clases CSS de Tailwind y las variables CSS inyectadas a nivel de página. **Nunca** dejar texto sin clase de fuente — el navegador usará la fuente por defecto y romperá la consistencia visual.

### Clases obligatorias

| Elemento | Clase Tailwind | Variable CSS subyacente |
|---|---|---|
| Títulos, headings (`h1`–`h6`), precios | `font-header` | `--font-header` |
| Texto de cuerpo, párrafos, badges, stats | `font-body` | `--font-body` |
| Botones, CTAs | `font-button` | `--font-button` |

### Estilos inline obligatorios

- **Headings**: añadir `style={{ textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}`
- **Botones**: añadir `style={{ textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}`

Estas variables controlan la opción "All Caps" del proyecto y deben respetarse siempre.

### Registro en ComponentTree

Al añadir un nuevo `PageSection` al tipo en `types/ui.ts`, **registrarlo también** en `components/ui/ComponentTree.tsx`:
1. Agregar entrada en `sectionIcons` con un ícono de Lucide.
2. Agregar entrada en `sectionLabels` usando `t('editor.<key>')` con fallback.
3. Añadir las claves de traducción en `locales/es/translation.json` y `locales/en/translation.json`.
