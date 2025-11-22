# ⚡ Quick Start - Quimera AI

## 🚀 Inicio Rápido en 5 Minutos

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar Environment
```bash
# Copiar archivo ejemplo
cp .env.example .env

# Editar .env con tus credenciales
# VITE_FIREBASE_API_KEY=...
# VITE_FIREBASE_PROJECT_ID=...
# VITE_GEMINI_API_KEY=...
```

### 3. Iniciar Desarrollo
```bash
npm run dev
```

Abre http://localhost:5173

### 4. Crear Primer Usuario Super Admin

1. Registra una cuenta
2. Ve a Firebase Console → Firestore
3. En `/users/{tu-user-id}` agrega:
   ```json
   { "role": "superadmin" }
   ```

### 5. Inicializar Datos en Firestore

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
  "systemInstruction": "You are a helpful AI assistant.",
  "greeting": "Hello! How can I help?",
  "voiceName": "Puck"
}
```

---

## ✅ Verificar Instalación

### Checklist Básico
- [ ] App carga en localhost:5173
- [ ] Puedes hacer login
- [ ] Dashboard aparece
- [ ] AI Web Builder funciona
- [ ] Editor de proyectos funciona

### Checklist Super Admin
- [ ] Super Admin dashboard visible
- [ ] Component Library carga
- [ ] Puedes crear custom component
- [ ] Analytics muestra datos
- [ ] Import/Export funciona

---

## 📚 Documentación Completa

Para setup detallado ver: **[SETUP.md](./SETUP.md)**

Documentación técnica: **[COMPONENT_SYSTEM_DOCS.md](./COMPONENT_SYSTEM_DOCS.md)**

Guía de usuario: **[USER_GUIDE.md](./USER_GUIDE.md)**

---

## 🎯 Primeros Pasos

### Como Usuario Normal

1. **Crear Website con AI**
   - Dashboard → "Start with AI"
   - Completa formulario
   - Genera tu sitio

2. **Editar Website**
   - Selecciona proyecto
   - Click en sección para editar
   - Modifica colores, textos, imágenes
   - Guarda cambios

### Como Super Admin

1. **Gestionar Componentes**
   - Super Admin → Component Library
   - Enable/disable componentes
   - Ver estadísticas de uso

2. **Crear Custom Component**
   - Super Admin → Component Designer
   - New Component
   - Selecciona base + estilos
   - Guarda

3. **Configurar Design Tokens**
   - Super Admin → Design Tokens
   - Edita paletas globales
   - Aplica cambios

---

## 🐛 Problemas Comunes

### "Firebase not configured"
```bash
# Verifica que .env existe
ls -la .env

# Verifica contenido
cat .env

# Reinicia servidor
npm run dev
```

### "Permission denied"
```
# Verifica que eres super admin
Firebase Console → Firestore → users/{tu-id}
Agrega: { "role": "superadmin" }
```

### "Gemini API error"
```
# Verifica API key
echo $VITE_GEMINI_API_KEY

# Obtén nueva key
https://makersuite.google.com/app/apikey
```

---

## 📞 Ayuda

**Documentación detallada:** [SETUP.md](./SETUP.md)

**Problemas técnicos:** contacto@quimeraai.com

**Comunidad:** Discord/Slack (próximamente)

---

<p align="center">
  <strong>¡Listo para crear websites increíbles! 🎉</strong>
</p>

