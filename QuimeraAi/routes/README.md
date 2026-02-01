# Sistema de Routing - Quimera AI

## Descripción General

El sistema de routing de Quimera AI está diseñado para manejar la navegación de manera centralizada usando hash-based routing (`#/path`). Esto permite una navegación fluida sin necesidad de configuración del servidor.

## Estructura de Archivos

```
routes/
├── config.ts          # Configuración de rutas y helpers
├── Router.tsx         # Componente principal del router
├── LoadingScreen.tsx  # Pantalla de carga
├── Link.tsx           # Componente Link para navegación
├── NavLink.tsx        # Componente NavLink con estado activo
├── guards/
│   ├── AuthGuard.tsx  # Protección de rutas autenticadas
│   └── RoleGuard.tsx  # Protección de rutas por rol
└── index.ts           # Exportaciones centralizadas
```

## Uso Básico

### Navegación Programática

```tsx
import { useRouter } from '../hooks/useRouter';
import { ROUTES } from '../routes/config';

function MyComponent() {
  const { navigate, navigateToView, navigateToEditor } = useRouter();
  
  // Navegar a una ruta específica
  navigate(ROUTES.DASHBOARD);
  
  // Navegar a una vista
  navigateToView('leads');
  
  // Navegar al editor con un proyecto
  navigateToEditor('project-123');
}
```

### Navegación Declarativa con Links

```tsx
import { Link, NavLink } from '../routes';
import { ROUTES } from '../routes/config';

// Link básico
<Link to={ROUTES.DASHBOARD}>
  Ir al Dashboard
</Link>

// Link con parámetros
<Link to={ROUTES.EDITOR} params={{ projectId: 'abc123' }}>
  Editar Proyecto
</Link>

// NavLink con estado activo
<NavLink 
  to={ROUTES.LEADS}
  activeClassName="text-primary font-bold"
  inactiveClassName="text-gray-500"
>
  Leads
</NavLink>
```

### Protección de Rutas

```tsx
import { AuthGuard, RoleGuard } from '../routes';

// Proteger por autenticación
<AuthGuard 
  isAuthenticated={!!user}
  isEmailVerified={user?.emailVerified}
>
  <PrivateContent />
</AuthGuard>

// Proteger por rol
<RoleGuard 
  userRole={user?.role}
  allowedRoles={['admin', 'superadmin']}
>
  <AdminContent />
</RoleGuard>
```

## Rutas Disponibles

### Rutas Públicas
- `/` - Landing Page
- `/login` - Inicio de sesión
- `/register` - Registro

### Rutas de Preview
- `/preview/:projectId` - Vista previa pública de un sitio

### Rutas Privadas (Dashboard)
- `/dashboard` - Panel principal
- `/websites` - Mis sitios web
- `/assets` - Galería de assets
- `/templates` - Plantillas

### Rutas de Funcionalidades
- `/cms` - Gestor de contenido
- `/navigation` - Configuración de navegación
- `/ai-assistant` - Asistente IA
- `/leads` - Gestión de leads
- `/appointments` - Citas
- `/domains` - Dominios
- `/seo` - SEO y meta
- `/finance` - Finanzas

### Rutas del Editor
- `/editor/:projectId` - Editor de proyecto

### Rutas de Admin
- `/admin` - Panel de administración
- `/admin/admins` - Gestión de admins
- `/admin/tenants` - Gestión de tenants
- `/admin/languages` - Idiomas
- `/admin/prompts` - Prompts de IA
- Y más...

## Hooks Disponibles

### useRouter

```tsx
const {
  // Estado
  path,          // Ruta actual
  params,        // Parámetros de la ruta
  route,         // Configuración de la ruta actual
  query,         // Query params
  
  // Computed
  isPublicRoute,
  isPrivateRoute,
  isAdminRoute,
  isPreviewRoute,
  isEditorRoute,
  
  // Acciones
  navigate,      // Navegar a una ruta
  navigateToView,// Navegar a una vista
  navigateToEditor, // Navegar al editor
  navigateToPreview, // Navegar a preview
  goBack,        // Ir atrás
  goForward,     // Ir adelante
  replace,       // Reemplazar ruta actual
  setQueryParam, // Establecer query param
  getQueryParam, // Obtener query param
} = useRouter();
```

### useRouteParams

```tsx
const { projectId } = useRouteParams();
```

### useQueryParams

```tsx
const { query, setQueryParam, getQueryParam } = useQueryParams();
```

## Navegación Fuera de Componentes

```tsx
import { router } from '../hooks/useRouter';

// En un servicio o utility
router.navigate('/dashboard');
router.navigateToEditor('project-id');
```

## Configuración de Rutas

Las rutas se configuran en `routes/config.ts`:

```tsx
export const routeConfigs: RouteConfig[] = [
  {
    path: '/mi-ruta',
    view: 'mi-vista',
    type: 'private',
    title: 'Mi Página',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['admin'], // Opcional: roles permitidos
    showInNav: true,  // Mostrar en navegación
    icon: 'IconName',
  },
];
```

## Añadir una Nueva Ruta

1. Añadir constante en `ROUTES`:
```tsx
export const ROUTES = {
  // ...
  MI_NUEVA_RUTA: '/mi-nueva-ruta',
};
```

2. Añadir configuración en `routeConfigs`:
```tsx
{
  path: ROUTES.MI_NUEVA_RUTA,
  view: 'mi-view',
  type: 'private',
  title: 'Mi Nueva Ruta',
  requiresAuth: true,
}
```

3. Si es necesario, añadir el case en `ViewRouter.tsx`

## Mejores Prácticas

1. **Usar constantes de ROUTES**: Siempre usa las constantes de `ROUTES` en lugar de strings hardcodeados.

2. **Usar hooks de router**: Prefiere `useRouter()` sobre manipulación directa del hash.

3. **Proteger rutas sensibles**: Usa `AuthGuard` y `RoleGuard` para proteger contenido.

4. **Mantener sincronía con EditorContext**: El router sincroniza automáticamente con `EditorContext.view`.

5. **Usar Link/NavLink para enlaces**: Para accesibilidad y SEO, usa los componentes `Link` y `NavLink`.




















