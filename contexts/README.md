# Contexts - Arquitectura Modular

## 📋 Resumen

El sistema de contextos ha sido refactorizado de un único archivo masivo (`EditorContext.tsx` con ~4,900 líneas) a múltiples contextos especializados más pequeños y mantenibles.

## 🏗️ Estructura

```
contexts/
├── index.ts                 # Exportaciones principales
├── AppProviders.tsx         # Composición de todos los providers
├── EditorContext.tsx        # Contexto legacy (mantener compatibilidad)
├── EditorContextNew.tsx     # Nuevo wrapper de compatibilidad
│
├── core/                    # Contextos fundamentales
│   ├── AuthContext.tsx      # Autenticación y permisos (~125 líneas)
│   └── UIContext.tsx        # Estado de UI (~125 líneas)
│
├── project/                 # Gestión de proyectos
│   └── ProjectContext.tsx   # Proyectos, templates, export (~450 líneas)
│
├── files/                   # Gestión de archivos
│   └── FilesContext.tsx     # Storage, uploads (~200 líneas)
│
├── crm/                     # CRM y leads
│   └── CRMContext.tsx       # Leads, activities, tasks (~300 líneas)
│
├── cms/                     # Content Management
│   └── CMSContext.tsx       # Posts, menus (~150 líneas)
│
├── admin/                   # Administración
│   └── AdminContext.tsx     # Tenants, users, prompts (~450 líneas)
│
├── domains/                 # Dominios y deployment
│   └── DomainsContext.tsx   # Dominios, DNS, deploy (~200 líneas)
│
├── ai/                      # Inteligencia Artificial
│   └── AIContext.tsx        # Generación de imágenes, AI (~300 líneas)
│
└── compatibility/           # Compatibilidad con código legacy
    └── useEditorCompat.ts   # Hook que mapea nuevos contextos a vieja interfaz
```

## 🚀 Uso

### Para Código Nuevo (Recomendado)

Importa solo los hooks que necesitas:

```tsx
import { useAuth, useProject, useCRM } from '@/contexts';

function MyComponent() {
    const { user, canPerform } = useAuth();
    const { projects, loadProject } = useProject();
    const { leads, addLead } = useCRM();
    
    // ...
}
```

### Para Código Existente (Compatibilidad)

El viejo `useEditor()` sigue funcionando:

```tsx
import { useEditor } from '@/contexts/EditorContext';

function LegacyComponent() {
    const { user, projects, leads } = useEditor();
    // ...
}
```

## 📦 Hooks Disponibles

| Hook | Responsabilidad | Ejemplo de uso |
|------|----------------|----------------|
| `useAuth()` | Autenticación, usuario, permisos | `const { user, canPerform } = useAuth()` |
| `useUI()` | Sidebars, vistas, preview, theme | `const { view, setView, themeMode } = useUI()` |
| `useProject()` | Proyectos, templates, export | `const { projects, saveProject } = useProject()` |
| `useFiles()` | Archivos, storage, uploads | `const { files, uploadFile } = useFiles()` |
| `useCRM()` | Leads, activities, tasks | `const { leads, addLead } = useCRM()` |
| `useCMS()` | Posts, menus | `const { cmsPosts, saveCMSPost } = useCMS()` |
| `useAdmin()` | Tenants, users admin, prompts | `const { tenants, prompts } = useAdmin()` |
| `useDomains()` | Dominios, deployment | `const { domains, deployDomain } = useDomains()` |
| `useAI()` | Generación AI, config | `const { generateImage } = useAI()` |

## 🔄 Guía de Migración

### Paso 1: Identificar qué datos usa el componente

```tsx
// Antes
const { 
    user,           // → useAuth()
    projects,       // → useProject()
    leads,          // → useCRM()
    view,           // → useUI()
    themeMode,      // → useUI()
} = useEditor();
```

### Paso 2: Importar hooks específicos

```tsx
// Después
import { useAuth, useProject, useCRM, useUI } from '@/contexts';

function MyComponent() {
    const { user } = useAuth();
    const { projects } = useProject();
    const { leads } = useCRM();
    const { view, themeMode } = useUI();
}
```

### Paso 3: Actualizar gradualmente

No es necesario migrar todo de una vez. El código legacy seguirá funcionando.

## 📊 Beneficios

| Antes | Después |
|-------|---------|
| 1 archivo de ~4,900 líneas | 9 archivos de ~150-450 líneas |
| Todo se re-renderiza junto | Re-renders granulares |
| Difícil de mantener | Fácil de encontrar y modificar |
| Una única responsabilidad masiva | Responsabilidades claras |
| Tests difíciles | Tests unitarios simples |

## ⚠️ Notas Importantes

1. **El EditorContext.tsx original NO se eliminó** - sigue funcionando para compatibilidad
2. **AppProviders** envuelve todos los contextos en el orden correcto
3. **LightProviders** está disponible para rutas públicas (solo Auth + UI)
4. Los contextos tienen dependencias: Auth debe cargarse primero

## 🛠️ Desarrollo

### Agregar nuevo estado a un contexto

1. Agregar el estado al contexto correspondiente
2. Exportar en el index.ts del directorio
3. Agregar al hook de compatibilidad si es necesario

### Crear un nuevo contexto

1. Crear directorio en `contexts/`
2. Crear `[Name]Context.tsx` con Provider y hook
3. Crear `index.ts` con exports
4. Agregar al `AppProviders.tsx` en el orden correcto
5. Agregar export al `contexts/index.ts`











