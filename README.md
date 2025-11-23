# Quimera AI - Website Builder

<p align="center">
  <img src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032" alt="Quimera AI" width="200"/>
</p>

<p align="center">
  <strong>AI-Powered Website Builder con Sistema de Componentes de Primera Categoría</strong>
</p>

<p align="center">
  <a href="#características">Características</a> •
  <a href="#instalación">Instalación</a> •
  <a href="#uso">Uso</a> •
  <a href="#arquitectura">Arquitectura</a> •
  <a href="#documentación">Documentación</a>
</p>

---

## 🚀 Características

### Para Usuarios
- 🤖 **AI Web Builder** - Genera websites completos con inteligencia artificial
- 🎨 **Editor Visual** - Personaliza cada elemento sin código
- 📱 **Responsive** - Diseños que funcionan en todos los dispositivos
- 🔄 **CMS Integrado** - Gestiona contenido fácilmente
- 🎯 **Templates** - Plantillas pre-diseñadas para comenzar rápido
- 🌐 **Dominios Personalizados** - Conecta tu propio dominio

### Para Super Admin
- 🎛️ **Component Library** - Gestión global de componentes
- 🔧 **Component Designer** - Crea y personaliza componentes
- 📊 **Analytics** - Estadísticas de uso de componentes
- 🎨 **Design Tokens** - Sistema de tokens de diseño global
- 🔐 **Permisos Granulares** - Control de acceso por usuario
- 📦 **Import/Export** - Comparte componentes entre proyectos
- ⏮️ **Versionado** - Historial y rollback de cambios
- 🧪 **A/B Testing** - Experimenta con diferentes variantes

### Sistema Avanzado
- ✅ **Versionado Automático** - Historial de 10 versiones por componente
- ✅ **Conditional Rendering** - Reglas para mostrar/ocultar dinámicamente
- ✅ **Performance Optimizado** - Caching, lazy loading, virtual scrolling
- ✅ **Type Safety** - TypeScript completo
- ✅ **Validación Robusta** - Validación de datos antes de guardar
- ✅ **Marketplace Ready** - Infraestructura para compartir componentes

---

## 📦 Instalación

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Cuenta de Firebase
- API Key de Google Gemini

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/quimera-ai.git
cd quimera-ai
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar Firebase y API de Google**

Crea un archivo `.env` en la raíz del proyecto:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google Gemini API Key (requerido para funciones de IA)
VITE_GEMINI_API_KEY=tu_api_key_de_google_aqui
# O usa: VITE_GOOGLE_AI_API_KEY=tu_api_key_de_google_aqui
```

**Importante para Deployment:** Las variables de entorno en deployment deben tener el prefijo `VITE_` para que sean accesibles en el cliente. Configura `VITE_GEMINI_API_KEY` o `VITE_GOOGLE_AI_API_KEY` en tu plataforma de deployment (Vercel, Netlify, Firebase Hosting, etc.).

4. **Configurar Firestore**

Crea las siguientes colecciones en Firebase:
- `users/` - Datos de usuarios
- `settings/` - Configuraciones globales
- `componentStyles/` - Estilos de componentes
- `customComponents/` - Componentes personalizados

5. **Inicializar datos**

Ejecuta los scripts de inicialización:

```bash
npm run setup:firebase
```

6. **Ejecutar en desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

---

## 🎯 Uso

### Para Usuarios Normales

#### Crear tu Primera Website

1. **Login** - Inicia sesión con Google o email
2. **AI Builder** - Completa el formulario del asistente AI:
   - Nombre de tu negocio
   - Industria
   - Descripción
   - Estilo visual (Minimalist, Bold, Elegant, Tech)
3. **Generar** - El AI creará tu website automáticamente
4. **Editar** - Personaliza colores, textos, imágenes
5. **Publicar** - Publica tu sitio en línea

#### Editar Components

```
Panel Lateral → Selecciona Componente → Panel Derecho
├── Content (textos, imágenes)
├── Colors (paleta de colores)
├── Spacing (padding, margins)
└── Typography (fuentes, tamaños)
```

### Para Super Admin

#### Gestionar Componentes Globales

```bash
Super Admin Dashboard → Component Library
```

**Acciones disponibles:**
- ✅ Enable/Disable componentes
- 🔍 Buscar y filtrar
- 📊 Ver estadísticas de uso
- 🎨 Editar estilos globales

#### Crear Custom Component

```bash
Super Admin Dashboard → Component Designer → New Component
```

1. Nombre del componente
2. Seleccionar base component
3. Personalizar estilos
4. Agregar variantes (opcional)
5. Configurar permisos
6. Guardar (crea versión automática)

#### Gestionar Design Tokens

```bash
Super Admin Dashboard → Design Tokens
```

Configura tokens globales:
- 🎨 Paletas de colores
- 📏 Sistema de espaciado
- 🔤 Tipografía
- 🌓 Sombras
- ⚡ Animaciones

---

## 🏗️ Arquitectura

### Estructura del Proyecto

```
quimera-ai/
├── components/          # Componentes React
│   ├── dashboard/      # Dashboards (Admin, CMS, etc)
│   ├── ui/            # UI Components
│   └── *.tsx          # Componentes de website
├── contexts/          # React Context (EditorContext)
├── data/             # Data inicial y prompts
├── scripts/          # Scripts de migración
├── types.ts          # TypeScript types
├── utils/            # Utilidades
│   ├── conditionalEngine.ts
│   ├── abTestingEngine.ts
│   ├── componentValidator.ts
│   ├── permissionsManager.ts
│   └── performanceOptimizations.ts
└── docs/             # Documentación
```

### Stack Tecnológico

**Frontend:**
- ⚛️ React 18
- 📘 TypeScript
- 🎨 Tailwind CSS
- 🔥 Firebase (Auth, Firestore)
- 🤖 Google Gemini AI

**Características:**
- 🎯 Context API (Estado global)
- 🔄 Real-time updates (Firestore)
- 🎨 Design System completo
- 📱 Responsive design
- ⚡ Performance optimizado

### Flujo de Datos

```
User Action → Context → Firebase → Real-time Update → UI
     ↓
Validation → Permissions Check → Sanitization
     ↓
Version Creation → Tracking → Cache Update
```

---

## 📚 Documentación

### Guías Principales

1. **[COMPONENT_SYSTEM_DOCS.md](./COMPONENT_SYSTEM_DOCS.md)**
   - Documentación técnica completa
   - API Reference
   - Arquitectura del sistema
   - Best practices

2. **[USER_GUIDE.md](./USER_GUIDE.md)**
   - Guía para usuarios
   - Tutorial paso a paso
   - Consejos y trucos
   - Solución de problemas

3. **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)**
   - Resumen de implementación
   - Features completadas
   - Roadmap

### API Reference

#### EditorContext

```typescript
// Gestión de componentes
createNewCustomComponent(name, baseComponent): Promise<CustomComponent>
updateComponentStyle(componentId, newStyles, isCustom): Promise<void>
saveComponent(componentId, changeDescription?): Promise<void>
deleteCustomComponent(componentId): Promise<void>
duplicateComponent(componentId): Promise<CustomComponent>

// Import/Export
exportComponent(componentId): string
importComponent(jsonString): Promise<CustomComponent>

// Versionado
revertToVersion(componentId, versionNumber): Promise<void>

// Analytics
trackComponentUsage(projectId, componentIds): Promise<void>

// Design Tokens
updateDesignTokens(tokens): Promise<void>

// Component Status
updateComponentStatus(componentId, isEnabled): Promise<void>
```

#### Utilities

```typescript
// Conditional Engine
evaluateRule(rule, context): boolean
shouldShowComponent(rules, context): boolean
applyConditionalStyles(baseStyles, rules, context): any

// Component Validator
validateComponent(component): ValidationResult
validateStyles(styles, baseComponent): ValidationResult
sanitizeComponent(component): Partial<CustomComponent>

// Permissions Manager
canViewComponent(component, userId, userRole): boolean
canEditComponent(component, userId, userRole): boolean
getPermissionLevel(component, userId, userRole): PermissionLevel

// Performance
memoize(func): Function
debounce(func, waitMs): Function
throttle(func, limitMs): Function
lazyLoadImage(imgElement, src): void
```

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Estructura de Tests

```
tests/
├── unit/              # Unit tests
│   ├── utils/
│   └── components/
├── integration/       # Integration tests
└── e2e/              # End-to-end tests
```

---

## 🚀 Deployment

### Build para Producción

```bash
npm run build
```

Genera archivos optimizados en `/dist`

### Plataformas de Deployment

#### Google Cloud Run (Recomendado)

Para deployment en Google Cloud Run con la API de Google Gemini correctamente configurada, consulta la guía completa:

📖 **[GOOGLE_CLOUD_DEPLOYMENT.md](GOOGLE_CLOUD_DEPLOYMENT.md)**

Quick start:
```bash
gcloud run deploy quimeraai \
  --source . \
  --build-arg VITE_GEMINI_API_KEY=tu_api_key_aqui \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Firebase Hosting

```bash
npm run deploy
```

#### Vercel / Netlify

Asegúrate de configurar las variables de entorno en tu plataforma. Ver: [DEPLOYMENT_API_KEY_SETUP.md](DEPLOYMENT_API_KEY_SETUP.md)

### Variables de Entorno

**Producción:**
```env
VITE_FIREBASE_API_KEY=prod_key
VITE_FIREBASE_PROJECT_ID=prod_project
VITE_GEMINI_API_KEY=tu_api_key_de_google
```

---

## 🤝 Contribuir

### Workflow

1. Fork el repositorio
2. Crea una branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Estándares de Código

- ✅ TypeScript strict mode
- ✅ ESLint + Prettier
- ✅ Componentes funcionales con hooks
- ✅ Documentación en JSDoc
- ✅ Tests para nuevas features

### Commits

Formato: `<type>(<scope>): <message>`

Tipos:
- `feat`: Nueva feature
- `fix`: Bug fix
- `docs`: Documentación
- `style`: Formato (no afecta código)
- `refactor`: Refactoring
- `test`: Tests
- `chore`: Mantenimiento

Ejemplo:
```bash
git commit -m "feat(components): add variant system to custom components"
```

---

## 🔧 Scripts Disponibles

```bash
npm run dev              # Desarrollo
npm run build            # Build producción
npm run preview          # Preview build
npm run lint             # Linting
npm run type-check       # TypeScript check
npm run test             # Run tests
npm run migrate:components  # Migrar componentes
npm run migrate:projects   # Migrar proyectos
```

---

## 📊 Performance

### Métricas

- ⚡ First Contentful Paint: < 1.5s
- 🎯 Time to Interactive: < 3.5s
- 📦 Bundle Size: ~450KB (gzipped)
- 🔄 Cache Hit Rate: ~85%

### Optimizaciones Implementadas

- ✅ Code splitting
- ✅ Lazy loading de imágenes
- ✅ Virtual scrolling para listas
- ✅ Memoization de componentes
- ✅ Debouncing de inputs
- ✅ Caching con TTL
- ✅ Optimización de assets

---

## 🔒 Seguridad

### Implementado

- ✅ Firebase Authentication
- ✅ Firestore Security Rules
- ✅ Validación de inputs
- ✅ Sanitización de datos
- ✅ HTTPS only
- ✅ Rate limiting (Firebase)
- ✅ Permissions system

### Best Practices

- 🔐 Nunca expongas API keys en código
- 🛡️ Valida datos en cliente y servidor
- 🔒 Usa Security Rules de Firebase
- 📝 Audita accesos de Super Admin
- 🔑 Rota credentials regularmente

---

## 📝 Changelog

### v2.0.0 (Noviembre 2025)

**Sistema de Componentes de Primera Categoría**

✅ **Agregado:**
- Sistema completo de gestión de componentes
- Versionado automático (10 versiones)
- Permissions system granular
- Design Tokens globales
- Conditional rendering engine
- A/B Testing engine
- Component validator
- Performance optimizations (caching, lazy loading)
- Import/Export de componentes
- Analytics de uso
- Documentación completa (1,400+ líneas)
- Scripts de migración

🔧 **Mejorado:**
- AI Web Builder ahora respeta componentStatus
- ComponentLibrary con búsqueda y filtros
- EditorContext refactorizado
- Types extendidos (~200 líneas nuevas)

📚 **Documentación:**
- COMPONENT_SYSTEM_DOCS.md (800+ líneas)
- USER_GUIDE.md (600+ líneas)
- IMPLEMENTATION_SUMMARY.md
- README.md actualizado

### v1.0.0 (Versión inicial)
- Editor básico de websites
- AI Web Builder
- CMS básico
- Templates

---

## 🙏 Agradecimientos

- **Firebase** - Backend y hosting
- **Google Gemini** - IA para generación
- **Tailwind CSS** - Sistema de diseño
- **Lucide Icons** - Iconografía
- **React** - Framework UI

---

## 📞 Soporte

- 📧 Email: contacto@quimeraai.com
- 🌐 Website: https://quimeraai.com
- 💬 Discord: [Comunidad](https://discord.gg/quimeraai)
- 📺 YouTube: [Tutoriales](https://youtube.com/quimeraai)

---

## 📄 Licencia

Este proyecto es privado. Todos los derechos reservados.

Copyright © 2025 Quimera AI

---

<p align="center">
  Hecho con ❤️ por el equipo de Quimera AI
</p>
