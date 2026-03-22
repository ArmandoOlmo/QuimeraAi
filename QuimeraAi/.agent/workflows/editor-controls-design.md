---
description: Design specification for editor control panels in Controls.tsx — follow this pattern for all new component controls.
---

# Editor Controls Design Specification

This document defines the **exact design pattern** all editor control panels must follow in `Controls.tsx`. Every new component's controls must use these classes, structures, and spacing rules to maintain visual coherence.

---

## 1. Root Container

Every `renderXxxControls` function (or tabbed `contentTab` / `styleTab`) must return a root `<div>` with `space-y-4`:

```tsx
const contentTab = (
  <div className="space-y-4">
    {/* Panels go here */}
  </div>
);
```

- **`space-y-4`** is the ONLY spacing mechanism between panels.
- **DO NOT** use `<hr>`, `<div className="border-t ...">`, or `mt-4` between panels.

---

## 2. Panel Card (Bordered Section)

Every logical group of controls MUST be wrapped in a **bordered panel card**:

```tsx
<div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
  {/* Panel content */}
</div>
```

### Required classes (exact, do not modify):
| Class | Purpose |
|---|---|
| `bg-editor-panel-bg/50` | Semi-transparent panel background |
| `p-4` | Inner padding (16px) |
| `rounded-lg` | Border radius |
| `border border-editor-border` | Subtle border |

---

## 3. Panel Header (Label with Icon)

Each panel starts with an **uppercase label** with an icon:

```tsx
<label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
  <Type size={14} />
  CONTENIDO
</label>
```

### Required classes (exact):
| Class | Purpose |
|---|---|
| `block` | Block display |
| `text-xs` | 12px font size |
| `font-bold` | Bold weight |
| `text-editor-text-secondary` | Muted color (NOT primary) |
| `uppercase` | ALL CAPS |
| `tracking-wider` | Letter spacing |
| `mb-3` | Bottom margin before content |
| `flex items-center gap-2` | Icon + text alignment |

### Icon rules:
- Use **Lucide React** icons only (`import { Type, Image, Layout, Settings, Palette, Link, SlidersHorizontal, FileText, MousePointerClick } from 'lucide-react'`)
- Icon size: **`size={14}`**
- Choose semantically relevant icon for the section

---

## 4. Sub-headers Inside Panels

For sub-groups within a panel (e.g., "Primary Button" inside a Colors panel):

```tsx
<h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">
  Primary Button
</h5>
```

Or for smaller inline labels:

```tsx
<label className="block text-xs font-medium text-editor-text-secondary mb-1">
  Label Text
</label>
```

---

## 5. Image Picker (Prominent Preview)

All image pickers use the `<ImagePicker>` component which renders inline with:

- **With image:** `aspect-video` preview, bottom gradient overlay (`bg-gradient-to-t from-black/80`), glassmorphic action buttons bottom-right (Library, AI Generate, Delete)
- **Without image:** Placeholder with dashed border, centered icon, two buttons ("Librería" + "Generar IA")

```tsx
<ImagePicker
  label="Background Image"
  value={data.section.imageUrl || ''}
  onChange={(url) => setNestedData('section.imageUrl', url)}
/>
```

---

## 6. Background Image Control (Shared Component)

For sections with background images + overlay opacity, use:

```tsx
<BackgroundImageControl sectionKey="sectionName" />
```

This renders the full image picker + overlay opacity slider in a single bordered panel automatically.

---

## 7. Slider Controls

All range sliders follow this pattern:

```tsx
<div>
  <div className="flex justify-between items-center mb-2">
    <label className="text-xs font-medium text-editor-text-secondary">
      Slider Label
    </label>
    <span className="text-[10px] text-editor-accent font-mono bg-editor-accent/10 px-2 py-0.5 rounded-full">
      {value}%
    </span>
  </div>
  <input
    type="range" min="0" max="100" step="5"
    value={value}
    onChange={(e) => setNestedData('path', parseInt(e.target.value))}
    className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
  />
</div>
```

### Value badge classes (exact):
| Class | Purpose |
|---|---|
| `text-[10px]` | Tiny font |
| `text-editor-accent` | Accent color |
| `font-mono` | Monospace for numbers |
| `bg-editor-accent/10` | Subtle accent background |
| `px-2 py-0.5` | Compact padding |
| `rounded-full` | Pill shape |

### Slider input classes (exact):
`w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent`

---

## 8. Toggle Selector (Segmented Control)

For variant/style selectors:

```tsx
<div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
  {['option1', 'option2', 'option3'].map(option => (
    <button
      key={option}
      onClick={() => setNestedData('path', option)}
      className={`flex-1 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${
        currentValue === option
          ? 'bg-editor-accent text-editor-bg'
          : 'text-editor-text-secondary hover:bg-editor-border'
      }`}
    >
      {option}
    </button>
  ))}
</div>
```

### Active state: `bg-editor-accent text-editor-bg`
### Inactive state: `text-editor-text-secondary hover:bg-editor-border`

---

## 9. Color Controls

Always group color controls inside a `<div className="space-y-3">`:

```tsx
<div className="space-y-3">
  <ColorControl label="Background" value={data.colors?.background} onChange={(v) => setNestedData('colors.background', v)} />
  <ColorControl label="Text" value={data.colors?.text} onChange={(v) => setNestedData('colors.text', v)} />
</div>
```

---

## 10. Item Lists (Features, Testimonials, etc.)

Each item in a list uses:

```tsx
<div className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group">
  {/* Item controls */}
</div>
```

---

## 11. Tabbed Controls

Components with many controls use the `<TabbedControls>` wrapper:

```tsx
const contentTab = ( <div className="space-y-4">{/* panels */}</div> );
const styleTab = ( <div className="space-y-4">{/* panels */}</div> );
return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
```

---

## 12. Complete Example — New Component

```tsx
const renderNewSectionControls = () => {
  if (!data?.newSection) return null;

  const contentTab = (
    <div className="space-y-4">
      {/* Content Panel */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText size={14} />
          Contenido
        </label>
        <Input label="Título" value={data.newSection.title} onChange={(e) => setNestedData('newSection.title', e.target.value)} />
        <FontSizeSelector label="Tamaño del Título" value={data.newSection.titleFontSize || 'md'} onChange={(v) => setNestedData('newSection.titleFontSize', v)} />
        <TextArea label="Descripción" value={data.newSection.description} onChange={(e) => setNestedData('newSection.description', e.target.value)} rows={2} />
      </div>

      {/* Items Panel */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <List size={14} />
          Items
        </label>
        {data.newSection.items.map((item, i) => (
          <div key={i} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group">
            <Input label={`Item #${i + 1}`} value={item.title} onChange={(e) => setNestedData(`newSection.items.${i}.title`, e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      {/* Background Image */}
      <BackgroundImageControl sectionKey="newSection" />

      {/* Colors Panel */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Palette size={14} />
          Colores
        </label>
        <div className="space-y-3">
          <ColorControl label="Fondo" value={data.newSection.colors?.background} onChange={(v) => setNestedData('newSection.colors.background', v)} />
          <ColorControl label="Texto" value={data.newSection.colors?.text} onChange={(v) => setNestedData('newSection.colors.text', v)} />
        </div>
      </div>

      {/* Spacing Panel */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <SlidersHorizontal size={14} />
          Espaciado
        </label>
        <div className="grid grid-cols-2 gap-3">
          <PaddingSelector label="Vertical" value={data.newSection.paddingY || 'md'} onChange={(v) => setNestedData('newSection.paddingY', v)} />
          <PaddingSelector label="Horizontal" value={data.newSection.paddingX || 'md'} onChange={(v) => setNestedData('newSection.paddingX', v)} />
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
```

---

## ❌ DO NOT

- Use `<h4>` for section headers — use `<label>` with the exact classes above
- Use `<hr>` or `border-t` dividers between panels — `space-y-4` handles spacing
- Use `mt-4` between panels — the root `space-y-4` is the only spacer
- Use `bg-editor-bg/50 p-3 rounded-lg` for panel backgrounds — use `bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border`
- Place controls outside a bordered panel — everything must be inside a panel card
- Use non-Lucide icons or `size={16}` — always `size={14}`
- Use `text-editor-text-primary` for panel headers — use `text-editor-text-secondary`
