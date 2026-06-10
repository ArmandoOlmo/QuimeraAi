# 📋 Procedimiento: Agregar Nuevos Templates a QuimeraAi

> Guía paso a paso para integrar un nuevo template (diseñado en Stitch u otra herramienta)
> al sistema de templates de QuimeraAi usando el **Enfoque A (Data Preset)**.

---

## Índice

1. [Requisitos Previos](#1-requisitos-previos)
2. [Paso 1 — Analizar el Template Fuente](#2-paso-1--analizar-el-template-fuente)
3. [Paso 2 — Crear el Archivo de Preset](#3-paso-2--crear-el-archivo-de-preset)
4. [Paso 3 — Crear el Script Seeder](#4-paso-3--crear-el-script-seeder)
5. [Paso 4 — Agregar Botón en Super Admin (Temporal)](#5-paso-4--agregar-botón-en-super-admin-temporal)
6. [Paso 5 — Verificar Build](#6-paso-5--verificar-build)
7. [Paso 6 — Deploy y Seed](#7-paso-6--deploy-y-seed)
8. [Paso 7 — Verificar en Producción](#8-paso-7--verificar-en-producción)
9. [Paso 8 — Limpieza Post-Seed](#9-paso-8--limpieza-post-seed)
10. [Referencia: Estructura de Archivos](#10-referencia-estructura-de-archivos)
11. [Referencia: Tipos y Enums](#11-referencia-tipos-y-enums)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Requisitos Previos

- Acceso al repositorio `QuimeraAppCursor/QuimeraAi`
- Cuenta de Super Admin en Quimera.ai
- Template de referencia (Stitch, Figma, o diseño propio)
- Firebase CLI configurado para deploy

---

## 2. Paso 1 — Analizar el Template Fuente

### Objetivo
Mapear cada sección visual del template fuente a los componentes disponibles de QuimeraAi.

### Componentes Disponibles (PageSection)

| Componente | Uso Típico |
|---|---|
| `hero` | Sección principal con headline, CTA y fondo |
| `heroSplit` | Hero con imagen a un lado y texto al otro |
| `features` | Características / beneficios en grid |
| `services` | Servicios ofrecidos con tarjetas |
| `pricing` | Planes y precios |
| `team` | Miembros del equipo |
| `testimonials` | Reseñas de clientes |
| `faq` | Preguntas frecuentes |
| `howItWorks` | Proceso paso a paso |
| `portfolio` | Galería de proyectos |
| `menu` | Menú de restaurante |
| `leads` | Formulario de contacto / leads |
| `newsletter` | Suscripción a newsletter |
| `map` | Mapa de ubicación |
| `cta` | Call-to-action banner |
| `video` | Sección de video |
| `banner` | Banner informativo |
| `slideshow` | Carrusel de imágenes |
| `chatbot` | Widget de chat |
| `footer` | Pie de página |

### Qué anotar
- ✅ Qué secciones del template fuente mapean a qué componente
- ✅ Paleta de colores (background, accent, text, heading, surface, border)
- ✅ Tipografía (encabezados + cuerpo)
- ✅ Estilo general (dark/light mode, bordes redondeados/angular, etc.)
- ✅ Contenido de cada sección (textos, imágenes, items)

---

## 3. Paso 2 — Crear el Archivo de Preset

### Ubicación
```
QuimeraAi/data/presets/<nombreTemplate>Preset.ts
```

### Estructura del Archivo

```typescript
/**
 * <Nombre> Template Preset
 * 
 * Descripción breve del template y su estilo visual.
 */

import { PageData, ThemeData, PageSection, BrandIdentity, NavLink } from '../../types';

// =============================================================================
// COLORS
// =============================================================================
const COLORS = {
    bg: '#0a0a0a',          // Fondo principal
    bgAlt: '#111111',       // Fondo alternativo
    surface: '#1a1a1a',     // Superficie de tarjetas
    surfaceAlt: '#222222',  // Superficie alternativa
    accent: '#f2330d',      // Color de acento principal
    accentHover: '#ff4422', // Hover del acento
    text: '#a0a0a0',        // Texto del body
    textMuted: '#666666',   // Texto secundario
    heading: '#ffffff',     // Texto de encabezados
    border: '#2a2a2a',      // Bordes
    white: '#ffffff',
    black: '#000000',
};

// =============================================================================
// PAGE DATA — Toda la configuración de contenido
// =============================================================================
export const miPageData: PageData = {
    header: { /* ... config del header ... */ },
    hero: { /* ... sección hero ... */ },
    features: { /* ... sección features ... */ },
    services: { /* ... sección servicios ... */ },
    // ... más secciones ...
    footer: { /* ... pie de página ... */ },
} as PageData;

// =============================================================================
// THEME — Tipografía, bordes, colores globales
// =============================================================================
export const miTheme: ThemeData = {
    cardBorderRadius: 'none',     // 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
    buttonBorderRadius: 'none',
    fontFamilyHeader: 'oswald',   // Google Fonts en lowercase
    fontFamilyBody: 'mulish',
    fontFamilyButton: 'oswald',
    headingsAllCaps: true,
    buttonsAllCaps: true,
    navLinksAllCaps: true,
    pageBackground: COLORS.bg,
    globalColors: {
        primary: COLORS.accent,
        secondary: '#ff6644',
        accent: COLORS.accent,
        background: COLORS.bg,
        surface: COLORS.surface,
        text: COLORS.text,
        textMuted: COLORS.textMuted,
        heading: COLORS.heading,
        border: COLORS.border,
        success: '#22c55e',
        error: '#ef4444',
    },
};

// =============================================================================
// BRAND IDENTITY
// =============================================================================
export const miBrandIdentity: BrandIdentity = {
    name: 'Nombre del Negocio',
    industry: 'fitness-gym',        // Debe coincidir con INDUSTRIES
    targetAudience: 'Descripción del público objetivo',
    toneOfVoice: 'Professional',    // ⚠️ SOLO valores del enum ToneOfVoice
    coreValues: 'Valor1, Valor2, Valor3',
    language: 'English',            // o 'Spanish'
};

// =============================================================================
// COMPONENT ORDER & SECTION VISIBILITY
// =============================================================================
export const miComponentOrder: PageSection[] = [
    // Estructura base (siempre primero)
    'colors', 'typography', 'header',
    // Secciones de contenido (en orden de aparición)
    'hero', 'features', 'services', 'team', 'pricing',
    'faq', 'testimonials', 'howItWorks',
    // Engagement
    'leads', 'newsletter', 'map',
    // Extras (ocultos por defecto)
    'heroSplit', 'banner', 'slideshow', 'portfolio', 'cta', 'video', 'menu',
    // Ecommerce (ocultos por defecto)
    'storeSettings', 'products', 'featuredProducts', 'categoryGrid',
    'productHero', 'saleCountdown', 'trustBadges', 'recentlyViewed',
    'productReviews', 'collectionBanner', 'productBundle', 'announcementBar',
    // Multi-page
    'productDetail', 'categoryProducts', 'articleContent',
    'productGrid', 'cart', 'checkout',
    // Chat + Footer
    'chatbot', 'footer',
];

// Solo las secciones que estarán VISIBLES al usar el template
const visibleSections: PageSection[] = [
    'colors', 'typography', 'header',
    'hero', 'features', 'services', 'team', 'pricing',
    'faq', 'leads', 'newsletter', 'map',
    'chatbot', 'footer',
];

export const miSectionVisibility = miComponentOrder.reduce((acc, section) => {
    (acc as any)[section] = visibleSections.includes(section);
    return acc;
}, {} as Record<PageSection, boolean>);

// =============================================================================
// EXPORT FINAL — Listo para insertar en Firestore
// =============================================================================
export const miTemplatePreset = {
    name: 'Mi Template',              // Nombre visible para usuarios
    data: miPageData,
    theme: miTheme,
    brandIdentity: miBrandIdentity,
    componentOrder: miComponentOrder,
    sectionVisibility: miSectionVisibility,
    status: 'Template' as const,
    description: 'Descripción del template para la tarjeta de preview.',
    category: 'fitness',              // Categoría general
    tags: ['gym', 'fitness', 'dark'], // Tags para búsqueda
    industries: ['fitness-gym'],      // IDs de industries.ts
    thumbnailUrl: '',                 // Se genera automáticamente
};
```

> [!IMPORTANT]
> El campo `toneOfVoice` en `BrandIdentity` debe ser uno de los valores del enum:
> `'Professional'`, `'Friendly'`, `'Luxury'`, `'Playful'`, `'Corporate'`, `'Casual'`, `'Bold'`, `'Minimal'`
> 
> NO usar texto libre como _"Authoritative, intense, military-inspired"_ — causará error de build.

---

## 4. Paso 3 — Crear el Script Seeder

### Ubicación
```
QuimeraAi/scripts/seed<NombreTemplate>.ts
```

### Código Base

```typescript
/**
 * Seed Script: <Nombre del Template>
 * 
 * Inserts the template preset into the Firestore 'templates' collection.
 * Can be triggered from the Super Admin panel.
 */

import { db, collection, getDocs, addDoc } from '../firebase';
import { miTemplatePreset } from '../data/presets/<nombreTemplate>Preset';

/**
 * Seed the template into Firestore.
 * Checks for duplicates before inserting.
 */
export async function seedMiTemplate(): Promise<{
    success: boolean;
    message: string;
    templateId?: string;
}> {
    console.log('🎨 Seeding <Nombre> template...');

    try {
        const templatesCol = collection(db, 'templates');
        const snapshot = await getDocs(templatesCol);

        // Verificar duplicados por nombre
        const existing = snapshot.docs.find(
            doc => doc.data().name === miTemplatePreset.name
        );
        if (existing) {
            console.log('⚠️ Template already exists:', existing.id);
            return {
                success: false,
                message: `Template "${miTemplatePreset.name}" already exists (ID: ${existing.id}). Delete it first to re-seed.`,
            };
        }

        // Insertar template
        const now = new Date().toISOString();
        const templateData = {
            ...miTemplatePreset,
            createdAt: now,
            lastUpdated: now,
        };

        const docRef = await addDoc(templatesCol, templateData);

        console.log('✅ Template seeded successfully:', docRef.id);
        return {
            success: true,
            message: `Template "${miTemplatePreset.name}" created successfully!`,
            templateId: docRef.id,
        };

    } catch (error: any) {
        console.error('❌ Error seeding template:', error);
        return {
            success: false,
            message: `Error: ${error.message}`,
        };
    }
}

export default seedMiTemplate;
```

> [!NOTE]
> El seeder incluye detección de duplicados: si un template con el mismo `name` ya existe, no se inserta de nuevo.

---

## 5. Paso 4 — Agregar Botón en Super Admin (Temporal)

### Archivo
```
QuimeraAi/components/dashboard/admin/TemplateManagement.tsx
```

### Cambios Necesarios

**1. Agregar imports (al inicio del archivo):**

```typescript
// Icono para el botón
import { MiIcono } from 'lucide-react';
// Script seeder
import { seedMiTemplate } from '../../../scripts/seed<NombreTemplate>';
```

**2. Agregar botón en la barra de herramientas** (buscar la sección de botones existentes como "Ecommerce"):

```tsx
<button
    onClick={async () => {
        try {
            const result = await seedMiTemplate();
            if (result.success) {
                showToast('success', result.message);
                // Recargar la lista de templates
                if (typeof window !== 'undefined') window.location.reload();
            } else {
                showToast('warning', result.message);
            }
        } catch (err: any) {
            showToast('error', `Error: ${err.message}`);
        }
    }}
    className="toolbar-button"
    title="Seed Mi Template"
>
    <MiIcono size={16} />
    <span>Mi Template</span>
</button>
```

> [!WARNING]
> Este botón es **temporal**. Se debe eliminar después de hacer el seed exitosamente.
> Ver [Paso 8 — Limpieza](#9-paso-8--limpieza-post-seed).

---

## 6. Paso 5 — Verificar Build

```bash
cd QuimeraAi
npx tsc --noEmit
```

### Errores Comunes

| Error | Causa | Solución |
|---|---|---|
| `toneOfVoice` type error | Valor de texto libre | Usar enum: `'Professional'`, `'Luxury'`, etc. |
| `Property 'X' does not exist` | Sección mal tipada | Verificar `PageData` en `types.ts` |
| `Cannot find module` | Ruta de import incorrecta | Verificar rutas relativas |

---

## 7. Paso 6 — Deploy y Seed

### 1. Commit y push
```bash
git add -A
git commit -m "feat: add <NombreTemplate> template preset and seeder"
git push origin main
```

### 2. Build y deploy
```bash
cd QuimeraAi
npm run build
firebase deploy --only hosting
```

### 3. Hacer Seed
1. Ir a **https://quimeraai.web.app** → Login como Super Admin
2. Ir a **Super Admin → Plantillas de Sitios Web**
3. Click en el botón del nuevo template en la barra de herramientas
4. Esperar confirmación (toast de éxito)

---

## 8. Paso 7 — Verificar en Producción

### Checklist de Verificación

- [ ] **Super Admin → Plantillas**: El template aparece en la lista
- [ ] **Dashboard → Sitios Web → Plantillas**: Visible para usuarios
- [ ] **Nuevo Proyecto → Step 4 (Template)**: Disponible para selección
- [ ] **Sin duplicados**: El template aparece solo una vez
- [ ] **Thumbnail**: Se muestra correctamente
- [ ] **Crear proyecto**: Se puede crear un proyecto desde el template

---

## 9. Paso 8 — Limpieza Post-Seed

### Remover de `TemplateManagement.tsx`:

1. **Quitar el import del icono** (ej: `Dumbbell`, `Wine`)
2. **Quitar el import del seeder** (ej: `seedMiTemplate`)
3. **Quitar el botón completo** del JSX

### Commit de limpieza
```bash
git add -A
git commit -m "chore: remove <NombreTemplate> seed button after successful seeding"
git push origin main
```

### Re-deploy
```bash
npm run build && firebase deploy --only hosting
```

> [!TIP]
> Los archivos de preset (`data/presets/`) y seeder (`scripts/`) se **mantienen** en el repo.
> Solo se quita el botón del panel de admin. Los scripts pueden re-usarse si se necesita re-seedear.

---

## 10. Referencia: Estructura de Archivos

```
QuimeraAi/
├── data/
│   └── presets/
│       ├── gymBrutalistPreset.ts     ← Ejemplo: Gym
│       └── eliteLuxuryPreset.ts      ← Ejemplo: Restaurant
├── scripts/
│   ├── seedGymTemplate.ts            ← Seeder Gym
│   └── seedEliteTemplate.ts          ← Seeder Restaurant
├── components/
│   └── dashboard/
│       └── admin/
│           └── TemplateManagement.tsx ← Botón de seed (temporal)
└── types.ts                          ← Tipos: Project, PageData, ThemeData, etc.
```

---

## 11. Referencia: Tipos y Enums

### ToneOfVoice (valores válidos)
```
'Professional' | 'Friendly' | 'Luxury' | 'Playful' | 
'Corporate' | 'Casual' | 'Bold' | 'Minimal'
```

### PageSection (componentes disponibles)
```
'colors' | 'typography' | 'header' | 'hero' | 'heroSplit' | 
'features' | 'services' | 'pricing' | 'team' | 'testimonials' | 
'faq' | 'howItWorks' | 'portfolio' | 'menu' | 'leads' | 
'newsletter' | 'map' | 'cta' | 'video' | 'banner' | 
'slideshow' | 'chatbot' | 'footer' | ...ecommerce sections
```

### Categorías Comunes
```
'fitness' | 'restaurant' | 'ecommerce' | 'medical' | 
'technology' | 'education' | 'agency' | 'portfolio'
```

---

## 12. Troubleshooting

### Template aparece duplicado
El template se hizo seed más de una vez. Solución:
1. Ir a la consola de Firebase → Firestore → `templates`
2. Buscar documentos con el mismo `name`
3. Eliminar el duplicado manualmente

### Template no aparece después del seed
- Verificar que `status` sea `'Template'` (no `'Draft'`)
- Verificar que la colección es `templates` (no `projects`)
- Limpiar caché del navegador

### Error al crear proyecto desde template
- Verificar que `componentOrder` incluye **todos** los `PageSection` válidos
- Verificar que `sectionVisibility` tiene una entrada para cada sección en `componentOrder`
- Verificar que `data` (PageData) tiene configuración para cada sección visible

---

> **Última actualización**: Febrero 2026  
> **Templates creados con este procedimiento**: Dark Brutalist Gym, L'Élite Restaurant
