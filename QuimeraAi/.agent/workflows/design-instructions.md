---
description: Instrucciones de diseño obligatorias para cualquier componente nuevo o modificado en QuimeraAi. Seguir siempre al diseñar.
---

# 📐 Instrucciones de Diseño — QuimeraAi

Estas reglas son **obligatorias** siempre que se cree, modifique o diseñe cualquier componente de la aplicación.

---

## 1. Internacionalización (i18n) — Todos los componentes traducidos

- **Todo** texto visible al usuario debe usar el sistema `react-i18next` con `useTranslation()`.
- Nunca usar strings hardcodeados. Usar siempre `t('clave.subclave')`.
- Agregar las traducciones en **ambos** archivos de locales:
  - `locales/es/translation.json` (Español)
  - `locales/en/translation.json` (English)
- Ejemplo:
```tsx
const { t } = useTranslation();
// ✅ Correcto
<h2>{t('miComponente.titulo')}</h2>
// ❌ Incorrecto
<h2>Mi Título</h2>
```

---

## 2. Design Style — Usar el estilo de diseño de la App

- Usar las clases CSS del design system ya existente:
  - Fondos: `bg-editor-panel-bg`, `bg-card`, `bg-background`
  - Textos: `text-editor-text-primary`, `text-editor-text-secondary`, `text-foreground`, `text-muted-foreground`
  - Bordes: `border-editor-border`, `border-border`, `border-input`
  - Acentos: `text-editor-accent`, `bg-editor-accent`, `ring-editor-accent`
- Usar las variables CSS del tema para colores (`--editor-*`, `--card`, `--background`, etc.)
- Mantener consistencia con la estética premium y dark mode de la app.
- Usar iconos de `lucide-react` (ya instalado en el proyecto).
- **No** inventar colores o estilos ad-hoc. Reutilizar los tokens de diseño.

---

## 3. Modales de Confirmación — Usar `ConfirmationModal`

- **Nunca** usar `window.confirm()`, `window.alert()`, ni diálogos nativos del navegador.
- Siempre usar el componente:
  ```
  components/ui/ConfirmationModal.tsx
  ```
- Importación:
  ```tsx
  import ConfirmationModal from '../../components/ui/ConfirmationModal';
  ```
- Props disponibles:
  - `isOpen`, `onConfirm`, `onCancel` (obligatorios)
  - `title`, `message`, `confirmText`, `cancelText` (opcionales, se traducen automáticamente)
  - `variant`: `'danger'` | `'warning'` | `'info'`
  - `isLoading`: para operaciones async
  - `icon`: icono personalizado
  - `count`: para operaciones en lote
- Ejemplo:
```tsx
<ConfirmationModal
  isOpen={showDeleteModal}
  onConfirm={handleDelete}
  onCancel={() => setShowDeleteModal(false)}
  title={t('miComponente.confirmDeleteTitle')}
  message={t('miComponente.confirmDeleteMessage')}
  variant="danger"
/>
```

---

## 4. Color Picker — Usar `ColorControl`

- En **cualquier lugar** donde el usuario necesite seleccionar un color, usar el componente:
  ```
  components/ui/ColorControl.tsx
  ```
- Importación:
  ```tsx
  import ColorControl from '../../components/ui/ColorControl';
  ```
- **No** crear color pickers nuevos, inputs de tipo `color` nativos, ni soluciones ad-hoc.
- Props:
  - `label`: etiqueta del control (string)
  - `value`: color actual (hex, rgba, etc.)
  - `onChange`: callback al cambiar color
  - `paletteColors`: (opcional) se obtienen automáticamente del tema global
  - `recentPalettes`: (opcional) paletas recientes
- El componente ya incluye: selector de saturación, hue, opacidad, entrada hex/RGB, colores preset, colores recientes y paleta del tema.
- Ejemplo:
```tsx
<ColorControl
  label={t('miComponente.colorLabel')}
  value={color}
  onChange={(newColor) => setColor(newColor)}
/>
```

---

## 5. Generación de Imagen — Usar `ImageGeneratorPanel`

Cuando un componente necesite **generación de imágenes con IA**:

### Componente principal:
```
components/ui/ImageGeneratorPanel.tsx
```

### Importación:
```tsx
import ImageGeneratorPanel from '../../components/ui/ImageGeneratorPanel';
```

### Props clave:
- `destination`: `'user'` | `'global'`
- `onImageGenerated`: callback cuando se genera una imagen
- `onUseImage`: **OBLIGATORIO** — callback para el botón "Usar imagen". Cuando el usuario genera una imagen, debe haber un botón para aplicarla directamente.
- `onClose` / `onCollapse`: para cerrar/colapsar el panel
- `hidePreview`: ocultar vista previa

### Regla obligatoria:
- Siempre pasar la prop `onUseImage` para que el usuario pueda aplicar la imagen generada con un botón "Usar imagen".
- Ejemplo:
```tsx
<ImageGeneratorPanel
  destination="user"
  onImageGenerated={(url) => console.log('Generated:', url)}
  onUseImage={(url) => {
    // Aplicar la imagen al componente
    updateImage(url);
    setShowGenerator(false);
  }}
  onClose={() => setShowGenerator(false)}
/>
```

### Componentes complementarios (usar cuando aplique):
- `components/ui/ImagePlaceholder.tsx` — Placeholder cuando no hay imagen, con botón para generar.
- `components/ui/GeneratingState.tsx` — Estado de progreso durante la generación.
- `components/ui/ImagePickerModal.tsx` — Modal para seleccionar imágenes de la biblioteca.

---

## Checklist Rápido

Antes de considerar terminado cualquier componente nuevo o modificado:

- [ ] ¿Todos los textos usan `t()` de `react-i18next`?
- [ ] ¿Se añadieron las traducciones en `locales/es/translation.json` y `locales/en/translation.json`?
- [ ] ¿Los estilos usan los tokens de diseño de la app (clases `editor-*`, `bg-card`, etc.)?
- [ ] ¿Los modales de confirmación usan `ConfirmationModal` y no `window.confirm()`?
- [ ] ¿Los selectores de color usan `ColorControl`?
- [ ] ¿La generación de imágenes usa `ImageGeneratorPanel` con `onUseImage`?
