# Ejemplos Prácticos de Responsive Design

## 📱 Cómo Funciona el Sistema Responsive

Este documento te muestra **ejemplos reales** de cómo tu sitio se adapta a diferentes dispositivos.

---

## 🎯 Ejemplo 1: Hero Section

### En Móvil (< 768px)
```
┌─────────────────────┐
│                     │
│   [LOGO]           │
│   ☰ Menu          │
│                     │
│   ┌─────────┐      │
│   │ IMAGEN  │      │
│   │  HERO   │      │
│   └─────────┘      │
│                     │
│   Título Grande    │
│   Subtítulo aquí   │
│                     │
│  [Botón Primario]  │
│  [Botón Secundario]│
│                     │
└─────────────────────┘
```

### En Desktop (> 768px)
```
┌──────────────────────────────────────────────┐
│  [LOGO]    Inicio Features Pricing    Login │
├──────────────────────────────────────────────┤
│                     │                        │
│   Título Grande     │    ┌────────────┐    │
│   Subtítulo aquí    │    │            │    │
│                     │    │   IMAGEN   │    │
│   [Primario] [Sec.] │    │    HERO    │    │
│                     │    │            │    │
│                     │    └────────────┘    │
└──────────────────────────────────────────────┘
```

### Código Real:

```tsx
// Hero.tsx - Línea 240
<section className="
  flex flex-col md:flex-row
  //      ↑            ↑
  //   Móvil      Desktop
">
  <div className="md:w-1/2">
    {/* Contenido texto */}
  </div>
  <div className="md:w-1/2">
    {/* Imagen */}
  </div>
</section>
```

---

## 🎯 Ejemplo 2: Grid de Features

### En Móvil (< 768px)
```
┌─────────────────────┐
│  ┌───────────────┐  │
│  │   Feature 1   │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │   Feature 2   │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │   Feature 3   │  │
│  └───────────────┘  │
└─────────────────────┘
     1 columna
```

### En Tablet (768px - 1024px)
```
┌────────────────────────────────┐
│  ┌──────────┐  ┌──────────┐   │
│  │Feature 1 │  │Feature 2 │   │
│  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐   │
│  │Feature 3 │  │Feature 4 │   │
│  └──────────┘  └──────────┘   │
└────────────────────────────────┘
         2 columnas
```

### En Desktop (> 1024px)
```
┌─────────────────────────────────────────────────┐
│  ┌────────┐  ┌────────┐  ┌────────┐           │
│  │ Feat 1 │  │ Feat 2 │  │ Feat 3 │           │
│  └────────┘  └────────┘  └────────┘           │
│  ┌────────┐  ┌────────┐  ┌────────┐           │
│  │ Feat 4 │  │ Feat 5 │  │ Feat 6 │           │
│  └────────┘  └────────┘  └────────┘           │
└─────────────────────────────────────────────────┘
              3 columnas
```

### Código Real:

```tsx
// Features.tsx
<div className="
  grid 
  grid-cols-1         // Móvil: 1 columna
  md:grid-cols-2      // Tablet: 2 columnas
  lg:grid-cols-3      // Desktop: 3 columnas
  gap-8
">
  {features.map(feature => (
    <FeatureCard {...feature} />
  ))}
</div>
```

---

## 🎯 Ejemplo 3: Navegación

### Móvil - Menú Cerrado
```
┌─────────────────────┐
│ [LOGO]          ☰  │
└─────────────────────┘
```

### Móvil - Menú Abierto
```
┌─────────────────────┐
│ [LOGO]          ✕  │
├─────────────────────┤
│                     │
│      Inicio         │
│                     │
│      Features       │
│                     │
│      Pricing        │
│                     │
│      [Login]        │
│                     │
└─────────────────────┘
```

### Desktop
```
┌──────────────────────────────────────────────┐
│  [LOGO]   Inicio Features Pricing   [Login] │
└──────────────────────────────────────────────┘
```

### Código Real:

```tsx
// Header.tsx
<header>
  <Logo />
  
  {/* Desktop Navigation */}
  <nav className="hidden md:flex">
    <NavLinks links={links} />
  </nav>
  
  {/* Mobile Hamburger */}
  <button className="md:hidden" onClick={toggleMenu}>
    {isOpen ? <X /> : <Menu />}
  </button>
  
  {/* Mobile Menu */}
  {isOpen && (
    <div className="md:hidden">
      <MobileNavLinks />
    </div>
  )}
</header>
```

---

## 🎯 Ejemplo 4: Tipografía Responsive

### Cómo cambian los tamaños:

```
Móvil (375px):
  H1: 24px   ← Legible pero no gigante
  H2: 20px
  P:  16px

Tablet (768px):
  H1: 36px   ← Más grande
  H2: 28px
  P:  16px

Desktop (1280px):
  H1: 56px   ← Impactante
  H2: 40px
  P:  18px
```

### Código Real:

```tsx
// titleSizeClasses en cualquier componente
const titleSizeClasses = {
  sm: 'text-2xl md:text-3xl',
  //   ↑ Móvil    ↑ Desktop
  md: 'text-3xl md:text-4xl',
  lg: 'text-4xl md:text-5xl',
  xl: 'text-5xl md:text-7xl'
};

// Uso:
<h1 className="text-4xl md:text-6xl">
  Título Grande
</h1>
```

---

## 🎯 Ejemplo 5: Botones

### En Móvil
```
┌─────────────────────┐
│                     │
│  ┌───────────────┐  │
│  │Botón Primario│  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │   Secundario  │  │
│  └───────────────┘  │
│                     │
└─────────────────────┘
   (Apilados vertical)
```

### En Desktop
```
┌────────────────────────────────┐
│  [Primario]  [Secundario]     │
└────────────────────────────────┘
      (Lado a lado)
```

### Código Real:

```tsx
// Hero.tsx - Línea 274
<div className="
  flex 
  flex-col        // Móvil: vertical
  sm:flex-row     // Desktop: horizontal
  gap-4
">
  <button>Primario</button>
  <button>Secundario</button>
</div>
```

---

## 🎯 Ejemplo 6: Pricing Cards

### Móvil
```
┌─────────────────────┐
│  ┌───────────────┐  │
│  │   STARTER     │  │
│  │   $29/mes     │  │
│  │   [Comprar]   │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │     PRO       │  │
│  │   $79/mes     │  │
│  │   [Comprar]   │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │  ENTERPRISE   │  │
│  │   Custom      │  │
│  │   [Contacto]  │  │
│  └───────────────┘  │
└─────────────────────┘
```

### Desktop
```
┌─────────────────────────────────────────────┐
│  ┌──────┐  ┌─────────┐  ┌──────────┐      │
│  │START │  │   PRO   │  │ENTERPRISE│      │
│  │$29/m │  │ $79/mes │  │  Custom  │      │
│  │[Buy] │  │ [Buy]   │  │ [Contact]│      │
│  └──────┘  └─────────┘  └──────────┘      │
└─────────────────────────────────────────────┘
```

### Código Real:

```tsx
// Pricing.tsx - Línea 89
<div className="
  grid 
  grid-cols-1           // Móvil: 1 card
  md:grid-cols-2        // Tablet: 2 cards
  lg:grid-cols-3        // Desktop: 3 cards
  gap-8
">
  {tiers.map(tier => (
    <PricingCard {...tier} />
  ))}
</div>
```

---

## 🎯 Ejemplo 7: Footer

### Móvil
```
┌─────────────────────┐
│                     │
│   [LOGO]           │
│   Descripción      │
│                     │
│   PRODUCTO         │
│   - Features       │
│   - Pricing        │
│                     │
│   EMPRESA          │
│   - About          │
│   - Contact        │
│                     │
│   © 2025           │
│   [Social Icons]   │
│                     │
└─────────────────────┘
    (Todo vertical)
```

### Desktop
```
┌────────────────────────────────────────────────┐
│                                                │
│  [LOGO]      PRODUCTO    EMPRESA    SOPORTE   │
│  Descripción - Features  - About   - Help     │
│              - Pricing   - Contact - Docs     │
│              - Demo      - Blog    - FAQ      │
│                                                │
│  © 2025 QuimeraAI        [Social Icons]       │
│                                                │
└────────────────────────────────────────────────┘
```

### Código Real:

```tsx
// Footer.tsx - Línea 55
<div className="
  grid 
  grid-cols-1           // Móvil: todo apilado
  sm:grid-cols-2        // Tablet: 2 columnas
  lg:grid-cols-12       // Desktop: grid complejo
  gap-8
">
  <div className="sm:col-span-2 lg:col-span-4">
    <Logo />
  </div>
  {linkColumns.map(column => (
    <div className="lg:col-span-2">
      <LinkColumn {...column} />
    </div>
  ))}
</div>
```

---

## 🎯 Ejemplo 8: Espaciado (Padding)

### Visualización del padding adaptativo:

```
Móvil (py-10):
┌─────────────────┐
│     ↕ 40px     │  ← Menos espacio
│   Contenido    │
│     ↕ 40px     │
└─────────────────┘

Desktop (md:py-16):
┌─────────────────┐
│     ↕ 64px     │  ← Más espacio
│                │
│   Contenido    │
│                │
│     ↕ 64px     │
└─────────────────┘
```

### Código Real:

```tsx
// Sistema de padding usado en todos los componentes
const paddingYClasses = {
  sm: 'py-10 md:py-16',  // Pequeño → Mediano
  md: 'py-16 md:py-24',  // Mediano → Grande
  lg: 'py-20 md:py-32'   // Grande → Extra Grande
};

// Uso:
<section className={paddingYClasses[paddingY]}>
  {/* contenido */}
</section>
```

---

## 📱 Breakpoints Detallados

### Cómo funciona cada breakpoint:

```css
/* Sin prefijo = Móvil (todos los tamaños) */
.py-10          /* Siempre activo */

/* sm: = 640px+ (móviles grandes) */
.sm:py-12       /* Activo desde 640px */

/* md: = 768px+ (tablets) */
.md:py-16       /* Activo desde 768px */

/* lg: = 1024px+ (laptops) */
.lg:py-20       /* Activo desde 1024px */

/* xl: = 1280px+ (desktops) */
.xl:py-24       /* Activo desde 1280px */
```

### Ejemplo real combinado:

```tsx
<div className="
  py-10          // Base: 40px en móvil
  md:py-16       // 64px desde tablet
  lg:py-24       // 96px desde laptop
  
  text-2xl       // Base: 24px en móvil
  md:text-4xl    // 36px desde tablet
  lg:text-6xl    // 60px desde laptop
  
  px-4           // Base: 16px en móvil
  md:px-6        // 24px desde tablet
  lg:px-8        // 32px desde laptop
">
  Contenido responsive
</div>
```

---

## 🎨 Patrones Comunes

### Patrón 1: Stack → Row
```tsx
// Vertical en móvil, horizontal en desktop
className="flex flex-col md:flex-row"
```

### Patrón 2: Full Width → Contained
```tsx
// Ancho completo en móvil, contenido en desktop
className="w-full md:w-1/2"
```

### Patrón 3: Hidden → Visible
```tsx
// Oculto en móvil, visible en desktop
className="hidden md:block"

// Visible en móvil, oculto en desktop
className="block md:hidden"
```

### Patrón 4: Small → Large
```tsx
// Pequeño en móvil, grande en desktop
className="text-base md:text-xl"
className="p-4 md:p-8"
className="gap-4 md:gap-8"
```

### Patrón 5: Center → Align
```tsx
// Centrado en móvil, alineado en desktop
className="text-center md:text-left"
className="justify-center md:justify-start"
```

---

## 🔍 Cómo Detectar Problemas

### Problema 1: Texto demasiado grande en móvil
```tsx
❌ Malo:
<h1 className="text-8xl">
  Título
</h1>

✅ Bueno:
<h1 className="text-4xl md:text-8xl">
  Título
</h1>
```

### Problema 2: Demasiadas columnas en móvil
```tsx
❌ Malo:
<div className="grid grid-cols-3">
  {/* Cards muy pequeñas en móvil */}
</div>

✅ Bueno:
<div className="grid grid-cols-1 md:grid-cols-3">
  {/* Una columna en móvil, 3 en desktop */}
</div>
```

### Problema 3: Poco espacio táctil
```tsx
❌ Malo:
<button className="p-1 text-xs">
  Click
</button>

✅ Bueno:
<button className="p-3 py-3 px-8 text-base">
  Click
</button>
```

---

## 🎉 Resumen

Todos estos patrones ya están implementados en tu sitio:

1. ✅ **Layout adaptativo** - Stack en móvil, grid en desktop
2. ✅ **Tipografía escalable** - Pequeña en móvil, grande en desktop
3. ✅ **Navegación responsive** - Hamburger en móvil, completa en desktop
4. ✅ **Espaciado inteligente** - Compacto en móvil, generoso en desktop
5. ✅ **Imágenes flexibles** - Se adaptan al contenedor
6. ✅ **Botones táctiles** - Tamaño óptimo para dedos
7. ✅ **Grids adaptativos** - 1→2→3 columnas según pantalla
8. ✅ **Ocultar/mostrar elementos** - Según dispositivo

**Tu sitio ya funciona perfectamente en todos los dispositivos. No necesitas hacer nada más. 🎉**

---

## 📚 Referencias Rápidas

### Archivos clave con ejemplos:
- `Hero.tsx` - Layout adaptativo
- `Header.tsx` - Navegación móvil
- `Features.tsx` - Grid responsive
- `Pricing.tsx` - Cards adaptativos
- `Footer.tsx` - Layout complejo responsive
- `TrustedBy.tsx` - Marquee responsive

### Para más detalles técnicos:
Ver `VERIFICACION_RESPONSIVE_MOBILE.md`

### Para guía rápida:
Ver `MOBILE_QUICK_GUIDE.md`

---

**Última actualización:** 28 de Noviembre, 2025






