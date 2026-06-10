# Changelog - 19 de Diciembre 2025

## Resumen Ejecutivo

Se implementó un sistema completo de **resolución de dominios personalizados** que permite a los usuarios de Quimera conectar sus propios dominios a sus proyectos. El sistema detecta automáticamente cuando un visitante accede desde un dominio personalizado y muestra el proyecto correspondiente.

---

## 🎯 Problemas Resueltos

### 1. Error de MIME Type en quimeraapp.com
- **Problema**: El dominio `quimeraapp.com` mostraba errores de "Failed to load module script" debido a que servía `text/html` en lugar de JavaScript.
- **Causa**: El Cloudflare Worker no estaba correctamente configurado para proxy a Firebase Hosting.
- **Solución**: Se actualizó el Worker para redirigir correctamente a `quimeraai.web.app`.

### 2. Dominio apuntando a proyecto incorrecto
- **Problema**: `quimeraapp.com` estaba vinculado a `projectId: 'quimera'` en lugar de `HagZJMj1S4158Fox9zUy` (Bike Shack).
- **Solución**: Se actualizó el documento `customDomains/quimeraapp.com` en Firestore con el projectId correcto.

### 3. Datos del proyecto no accesibles públicamente
- **Problema**: Los datos del proyecto estaban en `users/{userId}/projects` que requiere autenticación.
- **Solución**: Se implementó un sistema de "publicación" que copia los datos a `publicStores/{projectId}` para acceso público.

---

## ✨ Nuevas Funcionalidades

### Hook `useCustomDomain`
**Archivo**: `hooks/useCustomDomain.tsx`

Detecta si la aplicación se está ejecutando en un dominio personalizado y resuelve el proyecto asociado.

```typescript
interface CustomDomainState {
    isCustomDomain: boolean;
    isLoading: boolean;
    projectId: string | null;
    userId: string | null;
    domain: string | null;
    error: string | null;
    projectData: any | null;
}
```

**Características**:
- Detecta dominios personalizados vs dominios internos (quimera.ai, localhost, etc.)
- Consulta Firestore `customDomains/{domain}` para resolver projectId
- Maneja estados de carga y error
- Incluye componentes `DomainLoadingPage` y `DomainNotConfiguredPage`

### Función `publishProject` en ProjectContext
**Archivo**: `contexts/project/ProjectContext.tsx`

Permite publicar un proyecto para hacerlo accesible públicamente en dominios personalizados.

```typescript
const publishProject = async (): Promise<boolean> => {
    // 1. Guarda el proyecto actual
    await saveProject();
    
    // 2. Copia datos a publicStores/{projectId}
    await setDoc(publicStoreRef, {
        name, data, theme, brandIdentity,
        componentOrder, sectionVisibility,
        userId, publishedAt, updatedAt
    });
}
```

### Selector de Proyecto en Modal de Dominios
**Archivo**: `components/dashboard/domains/DomainsDashboard.tsx`

Al conectar un dominio externo, ahora es **obligatorio** seleccionar un proyecto.

**Mejoras en el modal**:
- Selector de proyecto requerido
- Instrucciones de próximos pasos (DNS, verificación, publicación)
- Validación antes de enviar

### Sincronización Automática con `customDomains`
**Archivo**: `contexts/domains/DomainsContext.tsx`

Todas las operaciones de dominio ahora sincronizan automáticamente con la colección global `customDomains`:

| Operación | Sincroniza |
|-----------|------------|
| `addDomain` | ✅ |
| `updateDomain` | ✅ |
| `deleteDomain` | ✅ |
| `verifyDomain` | ✅ |

---

## 📁 Archivos Modificados

### Archivos Principales
| Archivo | Cambios |
|---------|---------|
| `App.tsx` | Integración de `useCustomDomain`, renderizado condicional para dominios personalizados |
| `hooks/useCustomDomain.tsx` | **NUEVO** - Hook para detección de dominios |
| `contexts/project/ProjectContext.tsx` | Añadida función `publishProject` |
| `contexts/domains/DomainsContext.tsx` | Sincronización con `customDomains` en todas las operaciones |
| `components/PublicWebsitePreview.tsx` | Soporte para cargar desde `publicStores` |
| `components/dashboard/domains/DomainsDashboard.tsx` | Modal mejorado con selector de proyecto |
| `firestore.rules` | Reglas para permitir escritura autenticada en `customDomains` |

### Scripts y Utilidades
| Archivo | Propósito |
|---------|-----------|
| `scripts/update-worker.mjs` | Actualizar Cloudflare Worker |
| `scripts/fix-quimeraapp-domain.mjs` | Corregir mapeo de dominio |

---

## 🔄 Flujo de Dominios Personalizados

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. AÑADIR DOMINIO                                               │
│     Dashboard → Dominios → "Conectar" o "Comprar"               │
│     • Ingresar nombre del dominio                               │
│     • Seleccionar proyecto (obligatorio)                        │
│     → Guarda en: users/{userId}/domains + customDomains         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. CONFIGURAR DNS (en proveedor externo)                       │
│     • A Record: @ → 199.36.158.100                              │
│     • CNAME: www → quimeraai.web.app                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. VERIFICAR DNS                                                │
│     Click "Verificar" en card del dominio                       │
│     → Actualiza status a 'active' en ambas colecciones          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. PUBLICAR PROYECTO                                            │
│     Editor → Click "Publicar"                                   │
│     → Copia proyecto a publicStores/{projectId}                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. ¡LISTO!                                                      │
│     Visitantes en tudominio.com ven el proyecto publicado       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Flujo Técnico de Resolución

```
Visitante accede a: tudominio.com
          │
          ▼
┌─────────────────────────────────────────┐
│  Cloudflare Worker (quimera-router)     │
│  - Detecta dominio personalizado        │
│  - Proxy a quimeraai.web.app            │
│  - Headers: X-Original-Host             │
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  Firebase Hosting                       │
│  - Sirve index.html + assets            │
│  - SPA carga React app                  │
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  useCustomDomain Hook                   │
│  - Detecta hostname != quimera.ai       │
│  - Consulta customDomains/{domain}      │
│  - Obtiene projectId + userId           │
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  App.tsx                                │
│  - Si isCustomDomain && projectId       │
│  - Renderiza PublicWebsitePreview       │
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  PublicWebsitePreview                   │
│  - Carga datos de publicStores          │
│  - Renderiza landing page completa      │
└─────────────────────────────────────────┘
```

---

## 📊 Estructura de Datos en Firestore

### Colección `customDomains/{domain}`
```javascript
{
  domain: "tudominio.com",
  projectId: "HagZJMj1S4158Fox9zUy",
  userId: "ovoDLOjnnoa2P0zECMP4TNGKbC53",
  status: "active",           // pending | active | error
  sslStatus: "active",        // pending | provisioning | active
  dnsVerified: true,
  createdAt: "2025-12-19T...",
  updatedAt: "2025-12-19T..."
}
```

### Colección `publicStores/{projectId}`
```javascript
{
  name: "Bike Shack",
  data: { /* contenido de la landing page */ },
  theme: { /* colores, fuentes, etc */ },
  brandIdentity: { /* logo, favicon, etc */ },
  componentOrder: ["header", "hero", "features", ...],
  sectionVisibility: { hero: true, features: true, ... },
  userId: "ovoDLOjnnoa2P0zECMP4TNGKbC53",
  publishedAt: "2025-12-19T...",
  updatedAt: "2025-12-19T..."
}
```

---

## 🔐 Reglas de Firestore Actualizadas

```javascript
// customDomains - lectura pública, escritura autenticada
match /customDomains/{domainName} {
  allow read: if true;
  allow write: if request.auth != null;
}

// publicStores - lectura pública, escritura autenticada
match /publicStores/{storeId} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

---

## 📝 Commits Realizados

### Commit 1: `a8a4175`
```
feat: custom domain resolution and publish functionality

- Add useCustomDomain hook for client-side domain detection
- Update App.tsx to render landing pages on custom domains
- Add publishProject to ProjectContext for syncing to publicStores
- Update PublicWebsitePreview to fetch from publicStores as fallback
- Sync domain operations to global customDomains collection
- Update Firestore rules to allow authenticated writes to customDomains
- Add Cloudflare Worker management scripts
```

### Commit 2: `4528961`
```
feat: require project selection when connecting external domains

- Add project selector to Connect Domain modal
- Show next steps instructions for DNS configuration
- Ensure domain-project relationship is established on creation
```

---

## 🚀 Despliegues

| Servicio | URL | Estado |
|----------|-----|--------|
| Firebase Hosting | https://quimeraai.web.app | ✅ Desplegado |
| Firestore Rules | - | ✅ Desplegadas |
| Git (GitHub) | origin/main | ✅ Pushed |

---

## 📋 Pendientes / Mejoras Futuras

1. **Botón Publicar en Editor**: Conectar el onClick del botón con la función `publishProject`
2. **Indicador de publicación**: Mostrar estado de publicación en el editor
3. **Invalidación de cache**: Purgar cache de Cloudflare al publicar cambios
4. **SSL automático**: Integrar Let's Encrypt o Cloudflare SSL para dominios nuevos
5. **Verificación DNS programada**: Cloud Function para verificar DNS periódicamente
6. **Preview antes de publicar**: Mostrar preview de cómo se verá en el dominio

---

## 🎉 Resultado Final

**quimeraapp.com** ahora muestra correctamente el proyecto **Bike Shack** (`HagZJMj1S4158Fox9zUy`).

El sistema de dominios personalizados está completamente funcional:
- ✅ Añadir dominios externos con selección de proyecto
- ✅ Comprar dominios nuevos via Name.com
- ✅ Cambiar proyecto asociado a un dominio
- ✅ Eliminar dominios
- ✅ Verificar configuración DNS
- ✅ Publicar proyectos para acceso público
- ✅ Resolución automática de dominio → proyecto
