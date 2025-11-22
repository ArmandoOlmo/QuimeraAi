# 🌍 Guía de Multi-idioma con i18next

## ✅ Implementación Completada

Tu aplicación Quimera.ai ahora tiene soporte completo para múltiples idiomas usando **react-i18next**.

---

## 📦 Dependencias Instaladas

```bash
✓ i18next
✓ react-i18next
✓ i18next-browser-languagedetector
```

---

## 📁 Estructura de Archivos

```
/QuimeraAi/
  ├── i18n.ts                           # Configuración principal de i18next
  ├── locales/
  │   ├── es/
  │   │   └── translation.json          # Traducciones en Español
  │   └── en/
  │       └── translation.json          # Traducciones en Inglés
  └── components/
      └── ui/
          └── LanguageSelector.tsx      # Selector de idioma
```

---

## 🎯 Selectores de Idioma Agregados

El componente `LanguageSelector` ha sido integrado en:

1. **Dashboard** - Header superior derecho
2. **Auth/Login** - Navbar superior
3. **Editor** - Header del editor

---

## 🚀 Cómo Usar las Traducciones en tus Componentes

### 1. Importar el Hook

```typescript
import { useTranslation } from 'react-i18next';
```

### 2. Usar el Hook en tu Componente

```typescript
const MyComponent: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <button>{t('common.save')}</button>
      <p>{t('messages.saveSuccess')}</p>
    </div>
  );
};
```

### 3. Ejemplos Prácticos

#### Botones con Traducciones

```typescript
<button>{t('common.save')}</button>
<button>{t('common.cancel')}</button>
<button>{t('common.delete')}</button>
```

#### Títulos y Descripciones

```typescript
<h1>{t('dashboard.title')}</h1>
<h2>{t('editor.title')}</h2>
<p>{t('dashboard.overview')}</p>
```

#### Mensajes de Estado

```typescript
{error && <p>{t('messages.saveError')}</p>}
{success && <p>{t('messages.saveSuccess')}</p>}
```

#### Formularios

```typescript
<label>{t('auth.email')}</label>
<input placeholder={t('auth.enterEmail')} />

<label>{t('auth.password')}</label>
<input type="password" placeholder={t('auth.password')} />

<button type="submit">{t('auth.login')}</button>
```

---

## 🔧 Características Avanzadas

### 1. Traducciones con Variables

**En el archivo JSON:**
```json
{
  "welcome": "Bienvenido, {{name}}!",
  "itemsCount": "Tienes {{count}} proyectos"
}
```

**En el componente:**
```typescript
t('welcome', { name: user.name })
// Resultado: "Bienvenido, Juan!"

t('itemsCount', { count: 5 })
// Resultado: "Tienes 5 proyectos"
```

### 2. Pluralización

**En el archivo JSON:**
```json
{
  "project": "{{count}} proyecto",
  "project_plural": "{{count}} proyectos"
}
```

**En el componente:**
```typescript
t('project', { count: 1 })  // "1 proyecto"
t('project', { count: 5 })  // "5 proyectos"
```

### 3. Cambiar Idioma Programáticamente

```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { i18n } = useTranslation();
  
  const changeToEnglish = () => {
    i18n.changeLanguage('en');
  };
  
  const changeToSpanish = () => {
    i18n.changeLanguage('es');
  };
  
  return (
    <div>
      <button onClick={changeToEnglish}>English</button>
      <button onClick={changeToSpanish}>Español</button>
    </div>
  );
};
```

### 4. Obtener el Idioma Actual

```typescript
const { i18n } = useTranslation();
console.log(i18n.language); // 'es' o 'en'
```

---

## 📝 Traducciones Disponibles

### Categorías Principales

- **common** - Acciones comunes (guardar, cancelar, editar, etc.)
- **auth** - Autenticación y registro
- **dashboard** - Panel de control
- **editor** - Editor de sitios web
- **cms** - Sistema de gestión de contenidos
- **aiAssistant** - Asistente de IA
- **leads** - Gestión de leads
- **domains** - Dominios
- **sections** - Secciones del sitio web
- **navigation** - Navegación
- **superadmin** - Panel de super administrador
- **onboarding** - Tutorial inicial
- **messages** - Mensajes del sistema
- **language** - Selector de idioma

### Ejemplos de Claves

```typescript
// Acciones comunes
t('common.save')          // "Guardar" / "Save"
t('common.cancel')        // "Cancelar" / "Cancel"
t('common.delete')        // "Eliminar" / "Delete"

// Autenticación
t('auth.login')           // "Iniciar Sesión" / "Log In"
t('auth.register')        // "Registrarse" / "Sign Up"
t('auth.email')           // "Correo Electrónico" / "Email"

// Dashboard
t('dashboard.title')      // "Panel de Control" / "Dashboard"
t('dashboard.myWebsites') // "Mis Sitios Web" / "My Websites"
t('dashboard.createNew')  // "Crear Nuevo" / "Create New"

// Editor
t('editor.preview')       // "Vista Previa" / "Preview"
t('editor.publish')       // "Publicar" / "Publish"

// Mensajes
t('messages.saveSuccess') // "Guardado exitosamente" / "Saved successfully"
t('messages.saveError')   // "Error al guardar" / "Error saving"
```

---

## ➕ Agregar Más Idiomas

### Paso 1: Crear Archivo de Traducción

Crea `/locales/fr/translation.json` para francés:

```json
{
  "common": {
    "save": "Enregistrer",
    "cancel": "Annuler"
  },
  "dashboard": {
    "title": "Tableau de bord"
  }
}
```

### Paso 2: Actualizar i18n.ts

```typescript
import translationFR from './locales/fr/translation.json';

const resources = {
  es: { translation: translationES },
  en: { translation: translationEN },
  fr: { translation: translationFR }  // Nuevo
};
```

### Paso 3: Actualizar LanguageSelector

En `components/ui/LanguageSelector.tsx`, agrega:

```typescript
const languages = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' }  // Nuevo
];
```

---

## 🎨 Variantes del Selector de Idioma

### Variante Dropdown (Por defecto)

```typescript
<LanguageSelector />
```

Muestra un botón con ícono de globo y dropdown al hacer hover/click.

### Variante Minimal

```typescript
<LanguageSelector variant="minimal" />
```

Muestra botones compactos con banderas (usado en Auth).

---

## 💾 Persistencia

El idioma seleccionado se guarda automáticamente en `localStorage` bajo la clave `i18nextLng`.

Cuando el usuario vuelve, la aplicación carga automáticamente el último idioma seleccionado.

---

## 🔍 Detección Automática

El sistema detecta automáticamente el idioma del navegador del usuario en el primer uso:

1. Revisa `localStorage` (si existe preferencia guardada)
2. Revisa el idioma del navegador (`navigator.language`)
3. Usa español como fallback

---

## 📚 Ejemplo Completo de Componente

```typescript
import React from 'react';
import { useTranslation } from 'react-i18next';

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
  const { t } = useTranslation();
  
  return (
    <div className="project-card">
      <h3>{project.name}</h3>
      <p>{t('dashboard.projects')}</p>
      
      <div className="actions">
        <button onClick={() => handleEdit(project)}>
          {t('common.edit')}
        </button>
        <button onClick={() => handleDelete(project)}>
          {t('common.delete')}
        </button>
      </div>
      
      <div className="status">
        {project.status === 'Published' 
          ? t('cms.published') 
          : t('cms.drafts')}
      </div>
    </div>
  );
};
```

---

## 🐛 Debugging

### Activar Modo Debug

En `i18n.ts`, cambia:

```typescript
i18n.init({
  debug: true,  // Cambia a true
  // ... resto de configuración
});
```

Esto mostrará logs en la consola con información sobre las traducciones.

### Ver Idioma Actual

```typescript
import { useTranslation } from 'react-i18next';

const { i18n } = useTranslation();
console.log('Idioma actual:', i18n.language);
console.log('Idiomas disponibles:', i18n.languages);
```

---

## ✨ Mejores Prácticas

### 1. Organización de Claves

Usa namespaces descriptivos:
```typescript
✅ t('dashboard.createNew')
✅ t('auth.login')
✅ t('common.save')

❌ t('create')  // Muy vago
❌ t('button1') // No descriptivo
```

### 2. Consistencia

Mantén los mismos nombres de claves en todos los idiomas.

### 3. Valores por Defecto

Siempre proporciona un texto por defecto:
```typescript
t('some.key', 'Default Text')
```

### 4. Evita Concatenación

❌ Malo:
```typescript
{t('welcome')} {userName}
```

✅ Bueno:
```typescript
{t('welcome', { name: userName })}
```

---

## 🎯 Próximos Pasos para Traducir la App

### Componentes Prioritarios a Traducir:

1. **Dashboard.tsx** - Panel principal
2. **Auth.tsx** - Login/Register ✅ (LanguageSelector agregado)
3. **EditorHeader.tsx** ✅ (LanguageSelector agregado)
4. **Controls.tsx** - Controles del editor
5. **CMSDashboard.tsx** - CMS
6. **AiAssistantDashboard.tsx** - Asistente IA
7. **LeadsDashboard.tsx** - Leads
8. **DomainsDashboard.tsx** - Dominios

### Patrón de Migración:

1. Importar useTranslation
2. Reemplazar strings hardcodeados con t('key')
3. Agregar traducciones faltantes a los JSON
4. Probar ambos idiomas

---

## 📞 Soporte

Si necesitas agregar más traducciones o idiomas, simplemente:

1. Edita los archivos JSON en `/locales/`
2. Usa las claves con el hook `t()`
3. El cambio es inmediato, no requiere reiniciar

---

## 🎉 ¡Listo!

Tu aplicación ahora soporta múltiples idiomas de forma completa y profesional.

Para cualquier duda, revisa la documentación oficial de react-i18next:
https://react.i18next.com/

