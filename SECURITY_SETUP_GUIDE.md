# 🚀 Guía Rápida de Configuración de Seguridad

Esta guía te ayudará a configurar tu entorno local de forma segura.

## 📋 Paso 1: Crear archivo .env.local

```bash
# Copiar el template
cp ENV_EXAMPLE.txt .env.local
```

## 🔑 Paso 2: Configurar tus API Keys

Edita `.env.local` y reemplaza los valores:

### Google Gemini API (Requerido)
1. Ve a https://aistudio.google.com/app/apikey
2. Crea o copia tu API key
3. Pégala en `.env.local`:
```bash
VITE_GEMINI_API_KEY=AIzaSy_tu_key_aqui
```

### Firebase (Ya configurado con fallbacks)
Si quieres usar tus propias credenciales de Firebase:
1. Ve a https://console.firebase.google.com
2. Selecciona tu proyecto
3. Ve a Project Settings > General
4. Scroll down a "Your apps" > "Firebase SDK snippet"
5. Copia los valores a `.env.local`

## 🔒 Paso 3: Configurar Restricciones de API

### Para Gemini API:
1. Ve a https://aistudio.google.com/app/apikey
2. Click en tu API key
3. Configura restricciones:
   - **Application restrictions:** HTTP referrers
   - **Allowed referrers:**
     ```
     http://localhost:3000/*
     https://tudominio.com/*
     ```
   - **API restrictions:** Solo "Generative Language API"

### Para Firebase:
1. Ve a https://console.firebase.google.com
2. Selecciona tu proyecto
3. Ve a Authentication > Settings > Authorized domains
4. Agrega tus dominios de producción

## ✅ Paso 4: Verificar

```bash
# Iniciar servidor de desarrollo
npm run dev

# La consola debe mostrar:
# ✅ Google API Key encontrada en variables de entorno
```

## 🚀 Paso 5: Deploy Seguro

### Para Google Cloud Run:

```bash
# Configurar variables de entorno
export VITE_GEMINI_API_KEY=tu_key_aqui

# (Opcional) Configurar Firebase
export VITE_FIREBASE_API_KEY=tu_firebase_key
export VITE_FIREBASE_PROJECT_ID=tu_project_id
# ... etc

# Ejecutar deploy
./deploy.sh
```

### Usando Secret Manager (Más Seguro):

```bash
# Crear secret para Gemini
echo -n "tu_api_key" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic"

# Ver GOOGLE_CLOUD_DEPLOYMENT.md para más detalles
```

## 🛡️ Seguridad Adicional

Lee los siguientes documentos:
- **SECURITY.md** - Políticas completas de seguridad
- **GOOGLE_CLOUD_DEPLOYMENT.md** - Deployment seguro en Cloud

## ⚠️ IMPORTANTE

- **NUNCA** commitees `.env.local` a Git (ya está en .gitignore)
- **NUNCA** compartas tus API keys públicamente
- **ROTA** tus keys cada 60-90 días
- **USA** diferentes keys para dev y producción

## 🔍 Verificación de Seguridad

Ejecuta este checklist:

```bash
# 1. Verificar que .env.local está en .gitignore
git check-ignore .env.local
# Debe mostrar: .env.local

# 2. Verificar que no hay keys en el código
git grep -i "AIza" -- . ':!ENV_EXAMPLE.txt' ':!*.md'
# No debe encontrar nada

# 3. Verificar Firebase Security Rules
cat firestore.rules
# Debe tener reglas restrictivas
```

## 🆘 Necesitas Ayuda?

- **Documentación completa:** Ver SECURITY.md
- **Problemas de deployment:** Ver GOOGLE_CLOUD_DEPLOYMENT.md
- **Issues:** Abre un issue en el repositorio

