# Setup Guide - Quimera AI

Esta guía te ayudará a configurar el proyecto desde cero.

## 📋 Prerrequisitos

- Node.js 18 o superior
- npm o yarn
- Cuenta de Firebase
- API Key de Google Gemini

## 🔧 Paso 1: Instalación Básica

```bash
# Clonar repositorio (si es necesario)
git clone <repo-url>
cd QuimeraAi

# Instalar dependencias
npm install
```

## 🔥 Paso 2: Configurar Firebase

### 2.1 Crear Proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita Authentication (Google, Email/Password)
4. Habilita Firestore Database
5. Habilita Storage

### 2.2 Configurar Variables de Entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de Firebase:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=quimera.ai
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_GEMINI_API_KEY=AIza...
```

### 2.3 Configurar Firestore

#### Estructura de Colecciones

Crea estas colecciones en Firestore:

```
/users/{userId}
  - role: string ('user' | 'superadmin')
  - email: string
  - displayName: string
  - photoURL: string
  - createdAt: timestamp
  
  /projects/{projectId}
    - name: string
    - data: object (pageData)
    - theme: object
    - componentOrder: array
    - sectionVisibility: object
    - status: string ('Draft' | 'Published')
    - lastUpdated: timestamp
    - imagePrompts: object (opcional)
    - sourceTemplateId: string (opcional)

/settings/components
  - status: object (Record<PageSection, boolean>)

/settings/designTokens
  - colors: object
  - spacing: object
  - typography: object
  - shadows: object
  - animations: object
  - breakpoints: object

/settings/global_assistant
  - systemInstruction: string
  - greeting: string
  - voiceName: string
  - enabledTemplates: array
  - permissions: object

/componentStyles/{componentId}
  - styles: object (estilos del componente)

/customComponents/{componentId}
  - name: string
  - description: string
  - baseComponent: string
  - styles: object
  - version: number
  - versionHistory: array
  - category: string
  - tags: array
  - thumbnail: string
  - variants: array
  - permissions: object
  - isPublic: boolean
  - createdBy: string
  - usageCount: number
  - projectsUsing: array
  - documentation: object
  - createdAt: timestamp
  - lastModified: timestamp
  - modifiedBy: string
```

#### Security Rules

Copia estas reglas en Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isSuperAdmin() {
      return isSignedIn() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin';
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // Users
    match /users/{userId} {
      allow read: if isSignedIn();
      allow write: if isOwner(userId) || isSuperAdmin();
      
      // User projects
      match /projects/{projectId} {
        allow read: if isOwner(userId);
        allow write: if isOwner(userId);
      }
    }
    
    // Settings (Super Admin only)
    match /settings/{document=**} {
      allow read: if isSignedIn();
      allow write: if isSuperAdmin();
    }
    
    // Component Styles (Super Admin only)
    match /componentStyles/{componentId} {
      allow read: if isSignedIn();
      allow write: if isSuperAdmin();
    }
    
    // Custom Components
    match /customComponents/{componentId} {
      allow read: if isSignedIn();
      allow create: if isSuperAdmin();
      allow update: if isSuperAdmin() || 
                       resource.data.createdBy == request.auth.uid;
      allow delete: if isSuperAdmin() || 
                       resource.data.createdBy == request.auth.uid;
    }
  }
}
```

### 2.4 Inicializar Datos

Puedes usar la consola de Firebase para crear los documentos iniciales:

**settings/components:**
```json
{
  "status": {
    "hero": true,
    "features": true,
    "services": true,
    "testimonials": true,
    "team": true,
    "cta": true,
    "slideshow": true,
    "pricing": true,
    "faq": true,
    "portfolio": true,
    "leads": true,
    "newsletter": true,
    "video": true,
    "howItWorks": true,
    "chatbot": true,
    "footer": true,
    "header": true,
    "typography": true
  }
}
```

**settings/global_assistant:**
```json
{
  "systemInstruction": "You are a helpful AI assistant for Quimera AI.",
  "greeting": "Hello! I'm your AI assistant. How can I help you today?",
  "voiceName": "Puck",
  "enabledTemplates": ["general"],
  "permissions": {}
}
```

## 🤖 Paso 3: Configurar Google Gemini

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea un API Key
3. Agrégala a `.env` como `VITE_GEMINI_API_KEY`

## 🎨 Paso 4: Configurar Primer Usuario

### 4.1 Crear Cuenta

1. Inicia la app: `npm run dev`
2. Registra una cuenta con email/password o Google
3. Toma nota del User ID (puedes verlo en Firebase Console)

### 4.2 Hacer Super Admin

En Firebase Console → Firestore → users/{userId}:

```json
{
  "role": "superadmin"
}
```

## 🚀 Paso 5: Verificar Instalación

### 5.1 Ejecutar en Desarrollo

```bash
npm run dev
```

Abre http://localhost:5173

### 5.2 Verificar Features

✅ Login funciona
✅ Dashboard carga
✅ Super Admin Dashboard visible (si eres super admin)
✅ AI Web Builder funciona
✅ Editor de proyectos funciona
✅ Component Library visible (super admin)

## 🔄 Paso 6: Migrar Datos Existentes (Opcional)

Si ya tienes datos de una versión anterior:

```bash
# Configurar Firebase en scripts
cd scripts
npm install firebase

# Editar firebaseConfig en scripts/migrateComponents.ts y migrateProjects.ts

# Ejecutar migraciones
npx ts-node migrateComponents.ts
npx ts-node migrateProjects.ts
```

## 📝 Paso 7: Configuración Opcional

### Storage Rules (para imágenes)

Firebase Console → Storage → Rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Hosting (para deployment)

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar
firebase init hosting

# Deploy
npm run build
firebase deploy
```

## 🐛 Troubleshooting

### Error: "Firebase not configured"
- Verifica que `.env` existe y tiene las variables correctas
- Reinicia el servidor de desarrollo

### Error: "Permission denied"
- Verifica las Security Rules en Firestore
- Asegúrate que el usuario esté autenticado
- Verifica que el rol sea correcto en `/users/{userId}`

### Error: "Gemini API error"
- Verifica que `VITE_GEMINI_API_KEY` esté configurado
- Verifica que el API Key sea válido
- Verifica límites de rate en Google AI Studio

### Components no aparecen
- Verifica que `settings/components` exista en Firestore
- Verifica que los componentes estén enabled
- Limpia cache del navegador

### AI no genera websites
- Verifica Gemini API Key
- Verifica que `defaultPrompts.ts` tenga los prompts
- Revisa la consola para errores

## 📚 Recursos

- [Documentación Técnica](./COMPONENT_SYSTEM_DOCS.md)
- [Guía de Usuario](./USER_GUIDE.md)
- [Resumen de Implementación](./IMPLEMENTATION_SUMMARY.md)
- [Firebase Docs](https://firebase.google.com/docs)
- [Google Gemini Docs](https://ai.google.dev/docs)

## 🆘 Soporte

Si tienes problemas:

1. Revisa la sección Troubleshooting arriba
2. Revisa los logs de la consola del navegador
3. Revisa los logs de Firebase Console
4. Contacta: contacto@quimeraai.com

---

¡Listo! Tu instalación de Quimera AI debería estar funcionando. 🎉

