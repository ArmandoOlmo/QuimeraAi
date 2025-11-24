# Decisiones Técnicas y TODOs Pendientes

## 📋 Resumen

Este documento centraliza las decisiones técnicas pendientes y los TODOs del proyecto QuimeraAI.

**Última actualización:** 24 de Noviembre, 2025

---

## 🏗️ Refactorización Reciente (Nov 2025)

### 1. Modularización de Tipos

**Problema:** El archivo `types.ts` tenía 1644 líneas, dificultando el mantenimiento y navegación.

**Solución:** Se dividió en módulos organizados por dominio:

```
types/
├── index.ts              # Punto de entrada principal
├── ui.ts                 # Tipos básicos de UI
├── components.ts         # Tipos de componentes de página
├── business.ts           # Lógica de negocio (leads, users, tenants)
├── features.ts           # Features avanzadas (design tokens, responsive)
├── ai-assistant.ts       # Configuración de AI
├── navigation.ts         # Menús y navegación
├── seo.ts               # Configuración SEO
├── domains.ts           # Gestión de dominios
└── project.ts           # Tipo Project principal
```

**Beneficios:**
- ✅ Mejor organización y navegación
- ✅ Facilita el mantenimiento
- ✅ Separa responsabilidades
- ✅ Compatibilidad total con código existente (re-export desde `types.ts`)

### 2. Simplificación del Routing en App.tsx

**Problema:** Lógica de routing con múltiples if-else anidados difícil de mantener.

**Solución:** Creado componente `ViewRouter` con:
- Mapa de vistas para componentes simples
- Función auxiliar para permisos de admin
- Separación clara de responsabilidades
- Más fácil agregar nuevas vistas

**Ubicación:** `components/ViewRouter.tsx`

---

## 📝 TODOs Identificados

### 1. GlobalSEOSettings - Guardar en Firebase ✅ RESUELTO

**Archivo:** `components/dashboard/admin/GlobalSEOSettings.tsx:30`

**Status:** ✅ Completado (Nov 24, 2025)

**Implementación:**
- Creada interfaz `GlobalSEOConfig` con todos los campos
- Implementado guardado en Firestore: `globalSettings/seo`
- Agregado carga automática de configuración al montar componente
- Implementado estado de loading y mensajes de éxito/error
- Persistencia completa de:
  - Configuración por defecto (idioma, robots, schema type)
  - Verificaciones de Google y Bing
  - Configuración de AI Bot (descripción, topics)

**Resultado:** Funcionalidad completa implementada y probada

---

### 2. ThumbnailGenerator - Upload a Firebase Storage ✅ DOCUMENTADO

**Archivo:** `utils/thumbnailGenerator.ts:111`

**Status:** ✅ Documentado (Nov 24, 2025)

**Decisión Técnica:**
Se mantiene el uso de base64 Data URLs en lugar de Firebase Storage.

**Razón:**
- Thumbnails son pequeños (300x200px, ~10-30KB)
- Base64 en Firestore es aceptable para imágenes pequeñas
- Implementación más simple, sin gestión de cuotas de Storage
- Carga más rápida (sin request adicional)
- Documentos de Firestore soportan hasta 1MB, thumbnails ~2-3%

**Optimización Futura (si necesario):**
Si los thumbnails se vuelven un problema de rendimiento:
1. Upload a Firebase Storage: `storage/thumbnails/{componentId}.png`
2. Guardar URL de descarga en vez de base64
3. Implementar limpieza de thumbnails huérfanos
4. Agregar headers de caché CDN

**Conclusión:** Base64 es la elección pragmática para este caso de uso.

---

## 🎯 Mejoras Futuras Sugeridas

### Arquitectura

1. **Context API Optimization**
   - EditorContext es muy grande (~3200 líneas)
   - Considerar dividir en contextos más pequeños:
     - `ProjectContext` - Estado del proyecto actual
     - `UserContext` - Usuario y permisos
     - `AdminContext` - Funciones de administración
     - `LeadsContext` - Gestión de leads

2. **Custom Hooks Extraction**
   - Extraer lógica compleja de componentes a hooks reutilizables
   - Ejemplos: `useProjectManagement`, `useLeadManagement`, `useDeployment`

3. **Component Organization**
   - Los dashboards en `components/dashboard/` podrían organizarse mejor
   - Sugerencia: separar por feature en lugar de por tipo

### Performance

1. **Code Splitting**
   - Lazy loading de dashboards pesados
   - Reducir bundle inicial

2. **Memoization**
   - Revisar componentes que renderizan frecuentemente
   - Agregar `React.memo` donde sea apropiado

### Testing

1. **Unit Tests**
   - Agregar tests para utils críticos
   - Tests para validaciones de formularios
   - Tests para lógica de permisos

2. **Integration Tests**
   - Tests E2E para flujos críticos:
     - Onboarding completo
     - Creación y edición de proyectos
     - Gestión de leads
     - Deploy de proyectos

### Documentation

1. **Component Documentation**
   - Agregar JSDoc a componentes principales
   - Documentar props complejas
   - Ejemplos de uso

2. **Architecture Decision Records (ADR)**
   - Documentar decisiones arquitectónicas importantes
   - Mantener histórico de cambios estructurales

---

## 🔄 Proceso de Actualización

Cuando agregues un nuevo TODO al código:

1. Agrega un comentario descriptivo con contexto
2. Actualiza este documento con la decisión técnica
3. Clasifica la prioridad: 🔴 Alta / 🟡 Media / 🟢 Baja
4. Estima el esfuerzo
5. Define criterios de aceptación

---

## 📚 Referencias

- [Guía de Refactorización](./REFACTOR_SUMMARY.md)
- [Análisis de Refactorización](./REFACTOR_ANALYSIS.md)
- [Guía de Inicio](./START_HERE.md)
- [Documentación de Usuario](./USER_GUIDE.md)

