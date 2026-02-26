---
description: Instrucciones de diseño obligatorias para cualquier componente nuevo o modificado en QuimeraAi. Seguir siempre al diseñar.
---

# 📐 Instrucciones de Diseño — QuimeraAi

Estas reglas son **obligatorias** siempre que se cree, modifique o diseñe cualquier componente de la aplicación.

---

## 1. Internacionalización (i18n) — Todos los componentes traducidos

### Regla principal
- **Todo** texto visible al usuario debe usar el sistema `react-i18next` con `useTranslation()`.
- Nunca usar strings hardcodeados. Usar siempre `t('clave.subclave')`.
- Agregar las traducciones en **ambos** archivos de locales simultáneamente:
  - `locales/es/translation.json` (Español)
  - `locales/en/translation.json` (English)

### Naming Convention para keys de traducción
```
<seccion>.<subseccion>.<accion|elemento>
```
- Usar **camelCase** para cada segmento
- El primer segmento debe coincidir con la sección del componente (ej: `editor`, `dashboard`, `leads`, `ecommerce`)
- Reutilizar keys `common.*` para acciones genéricas (`common.save`, `common.cancel`, `common.delete`, etc.)

### Ejemplo completo
```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      {/* ✅ Correcto — usa t() con key de traducción */}
      <h2>{t('miComponente.titulo')}</h2>
      <p>{t('miComponente.descripcion')}</p>
      <button>{t('common.save')}</button>
      
      {/* ✅ Correcto — placeholders, titles, aria-labels también traducidos */}
      <input placeholder={t('miComponente.buscarPlaceholder')} />
      <button title={t('miComponente.editarTitulo')} aria-label={t('miComponente.editarTitulo')}>
        <EditIcon />
      </button>
      
      {/* ❌ INCORRECTO — strings hardcodeados */}
      <h2>Mi Título</h2>
      <button title="Delete">X</button>
      <input placeholder="Search..." />
    </div>
  );
};
```

### Qué traducir (checklist)
- [x] Textos visibles en JSX (`<h1>`, `<p>`, `<span>`, `<label>`, etc.)
- [x] Atributos `placeholder` de inputs
- [x] Atributos `title` y `aria-label` de botones/elementos interactivos
- [x] Mensajes de `toast` / notificaciones
- [x] Textos de estados vacíos ("No items found")
- [x] Mensajes de error y validación
- [x] Textos de modales de confirmación
- [x] Alt text de imágenes (cuando sea descriptivo)

### Qué NO traducir
- Nombres propios de marcas (Quimera, Stripe, Google, etc.)
- URLs, paths, IDs técnicos
- Keys de configuración o props internas
- Console.log/debug messages

### Verificación de sincronización
Después de agregar keys, ejecutar:
```bash
python3 scripts/sync-translations.py
```
Esto verificará que ambos archivos tienen las mismas keys.

---

## 2. Design Style — Usar el estilo de diseño de la App

### Tokens de color del tema
```css
/* Fondos */
bg-editor-panel-bg     /* Fondo del panel principal */
bg-card                /* Fondo de tarjetas */
bg-background          /* Fondo principal */
bg-muted               /* Fondo suave/atenuado */
bg-accent              /* Fondo de acento */

/* Textos */
text-editor-text-primary    /* Texto principal */
text-editor-text-secondary  /* Texto secundario */
text-foreground             /* Texto principal (fuera del editor) */
text-muted-foreground       /* Texto atenuado */
text-editor-accent          /* Texto de acento */

/* Bordes */
border-editor-border   /* Bordes del editor */
border-border          /* Bordes generales */
border-input           /* Bordes de inputs */

/* Acentos e interactivos */
bg-editor-accent       /* Fondo de acento */
ring-editor-accent     /* Ring de focus */
bg-primary             /* Botones primarios */
text-primary-foreground /* Texto en botones primarios */
hover:bg-primary/90    /* Hover de botones primarios */
```

### Variables CSS del tema
Usar las variables CSS para colores dinámicos según el tema:
```css
var(--editor-panel-bg)
var(--editor-text-primary)
var(--editor-text-secondary)
var(--editor-accent)
var(--editor-border)
var(--card)
var(--background)
var(--foreground)
var(--muted)
var(--muted-foreground)
var(--primary)
var(--border)
var(--input)
var(--ring)
```

### Reglas de diseño
1. **No** inventar colores o estilos ad-hoc. Reutilizar los tokens de diseño.
2. Usar iconos de `lucide-react` (ya instalado en el proyecto).
3. Mantener consistencia con la estética premium y dark mode de la app.
4. Usar `rounded-lg` o `rounded-xl` para bordes redondeados.
5. Usar `gap-*` y `space-*` de Tailwind para espaciado consistente.
6. Usar transiciones suaves: `transition-colors`, `transition-all duration-200`.
7. Hover states: usar `/10`, `/20` suffixes de opacidad (ej: `hover:bg-editor-accent/10`).
8. Focus states: usar `focus:ring-2 focus:ring-editor-accent focus:ring-offset-2`.
9. Tipografía: respetar la jerarquía (`text-sm` para controles, `text-base` para contenido, `text-lg`/`text-xl` para títulos).

### Patrones de componentes
```tsx
{/* Tarjeta estándar */}
<div className="bg-card border border-border rounded-xl p-4 space-y-3">

{/* Botón primario */}
<button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">

{/* Input estándar */}
<input className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-editor-accent" />

{/* Badge / chip */}
<span className="px-2 py-0.5 text-xs rounded-full bg-editor-accent/10 text-editor-accent">

{/* Sección del panel del editor */}
<div className="bg-editor-panel-bg border-b border-editor-border p-3">
  <h3 className="text-editor-text-primary text-sm font-medium">{t('...')}</h3>
  <p className="text-editor-text-secondary text-xs">{t('...')}</p>
</div>
```

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

- [ ] ¿Todos los textos visibles usan `t()` de `react-i18next`?
- [ ] ¿Se añadieron las traducciones en **ambos** archivos (`locales/es/translation.json` y `locales/en/translation.json`)?
- [ ] ¿Los placeholders, titles, y aria-labels también usan `t()`?
- [ ] ¿Las keys siguen el naming convention `seccion.subseccion.accion`?
- [ ] ¿Los estilos usan los tokens de diseño de la app (clases `editor-*`, `bg-card`, etc.)?
- [ ] ¿Los modales de confirmación usan `ConfirmationModal` y no `window.confirm()`?
- [ ] ¿Los selectores de color usan `ColorControl`?
- [ ] ¿La generación de imágenes usa `ImageGeneratorPanel` con `onUseImage`?
- [ ] ¿Se ejecutó `python3 scripts/sync-translations.py` para verificar sincronización?
