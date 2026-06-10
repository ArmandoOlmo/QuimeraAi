# 🚀 Instalación y Configuración - QuimeraAI

## 📋 Pre-requisitos

- Node.js 18+ instalado
- npm o yarn
- Cuenta de Firebase
- (Opcional) Cuenta de Sentry para error tracking
- (Opcional) API Keys de OpenAI/Anthropic/Google AI

---

## 1️⃣ Instalación Básica

```bash
# Clonar el repositorio
git clone <tu-repo>
cd QuimeraAi

# Instalar dependencias
npm install
```

---

## 2️⃣ Configuración de Variables de Entorno

### Crear archivo .env.local

```bash
# Copiar el ejemplo
cp .env.example .env.local
```

### Llenar variables obligatorias:

```env
# Firebase (OBLIGATORIO)
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=quimera.ai
VITE_FIREBASE_PROJECT_ID=tu-proyecto-id
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123

# AI API Keys (AL MENOS UNA REQUERIDA)
VITE_OPENAI_API_KEY=sk-proj-...
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_GOOGLE_AI_API_KEY=AIza...
```

---

## 3️⃣ Instalación de Dependencias Opcionales

### Para E2E Testing (Playwright)

```bash
npm install -D @playwright/test
npx playwright install
```

### Para Accessibility Checker Avanzado

```bash
npm install -D @axe-core/react
```

### Para Error Tracking (Sentry)

```bash
npm install @sentry/react
```

**Luego descomentar código en:**
- `utils/monitoring.ts`
- `components/ErrorBoundary.tsx`

**Y agregar tu Sentry DSN en .env.local:**
```env
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 4️⃣ Iniciar Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

---

## 5️⃣ Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo

# Build
npm run build            # Build para producción
npm run preview          # Preview del build

# Testing
npm run test             # Tests en modo watch
npm run test:run         # Tests una vez
npm run test:ui          # Tests con interfaz visual
npm run test:coverage    # Tests con coverage report
npm run test:integration # Tests de integración
npm run test:e2e         # Tests E2E con Playwright
npm run test:e2e:ui      # Tests E2E con UI

# Calidad de Código
npm run type-check       # Verificar tipos TypeScript
npm run lint             # Linter
```

---

## 6️⃣ Configuración de Firebase

### Firestore Security Rules

Asegúrate de tener las siguientes colecciones configuradas:

```
/users/{userId}
  /projects/{projectId}
/customComponents/{componentId}
/settings/
  - components (componentStatus global)
  - designTokens (tokens globales)
```

### Firebase Hosting (Opcional)

Para desplegar:

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar (si no está configurado)
firebase init hosting

# Deploy
npm run build
firebase deploy --only hosting
```

---

## 7️⃣ CI/CD (GitHub Actions)

### Configurar Secrets en GitHub

En tu repositorio de GitHub, ve a `Settings > Secrets and variables > Actions` y agrega:

```
FIREBASE_SERVICE_ACCOUNT: <JSON del service account>
CODECOV_TOKEN: <tu token de CodeCov> (opcional)
SNYK_TOKEN: <tu token de Snyk> (opcional)
SENTRY_AUTH_TOKEN: <token de Sentry> (opcional)
```

### El pipeline automáticamente:

- ✅ Ejecuta lint y type-check
- ✅ Corre tests unitarios e integración
- ✅ Genera build
- ✅ Despliega a Firebase Hosting (en push a main)

---

## 8️⃣ Estructura del Proyecto

```
QuimeraAi/
├── components/           # Componentes React
│   ├── dashboard/       # Dashboards y admin UIs
│   │   └── admin/      # UIs de Super Admin
│   └── ui/             # Componentes UI reutilizables
├── contexts/            # React Contexts
├── hooks/              # Custom React Hooks
├── utils/              # Utilidades y helpers
├── tests/              # Tests
│   ├── integration/    # Tests de integración
│   └── e2e/           # Tests end-to-end
├── data/              # Data inicial y prompts
└── types.ts           # TypeScript types globales
```

---

## 9️⃣ Features Implementadas

### ✅ UIs Avanzadas (11)
- Responsive Config Editor
- Permissions Manager
- Documentation Editor/Viewer
- Conditional Rules Editor
- Animation Configurator
- Component Marketplace
- Rating System
- A/B Testing Dashboard
- Accessibility Checker
- Preview States Selector

### ✅ Backend Features (2)
- Design Tokens Applier
- Responsive Styles Hook

### ✅ Testing (2)
- Integration Tests
- E2E Tests (Playwright)

### ✅ DevOps (2)
- CI/CD Pipeline (GitHub Actions)
- Error Tracking & Monitoring

---

## 🆘 Troubleshooting

### Error: "Cannot find module '@sentry/react'"

Si no instalaste Sentry, el código está preparado para funcionar sin él. Solo verás warnings en consola.

Para eliminarlo completamente, comenta las importaciones en:
- `utils/monitoring.ts`
- `App.tsx`

### Error: "Playwright not installed"

Instala Playwright:
```bash
npm install -D @playwright/test
npx playwright install
```

### Error de Firebase

Verifica que tus credenciales en `.env.local` sean correctas y que el proyecto de Firebase esté activo.

---

## 📚 Documentación Adicional

- [Plan de Implementación](./sistema-compon.plan.md)
- [Guía de Componentes](./COMPONENT_SYSTEM_DOCS.md)
- [Guía de Usuario](./USER_GUIDE.md)
- [Tests README](./tests/README.md)

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

[Tu licencia aquí]

---

## 👥 Soporte

Para soporte, email: [tu-email] o abre un issue en GitHub.

