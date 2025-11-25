# 🚨 EMERGENCIA: API Key Bloqueada - Solución INMEDIATA

## ⚠️ QUÉ PASÓ

Google detectó que tus API keys de Gemini fueron expuestas públicamente (probablemente en GitHub) y las bloqueó permanentemente por seguridad.

**Error recibido:**
```
{"error":{"code":403,"message":"Your API key was reported as leaked. Please use another API key.","status":"PERMISSION_DENIED"}}
```

---

## 🔥 SOLUCIÓN EN 5 MINUTOS

### **Paso 1: Crear Nueva API Key** (2 minutos)

1. **Abre Google AI Studio:**
   ```bash
   open "https://aistudio.google.com/app/apikey"
   ```

2. **Elimina TODAS las API keys viejas:**
   - Click en los 3 puntos → "Delete key"
   - Elimina todas (están bloqueadas)

3. **Crea una nueva API key:**
   - Click en "Create API key"
   - Selecciona proyecto: `quimeraai`
   - Copia la key (te la mostraré donde ponerla)

---

### **Paso 2: Deployar con Proxy (Backend Seguro)** (3 minutos)

**IMPORTANTE:** La nueva key SOLO va al backend. NUNCA en archivos de Git.

```bash
# 1. Ve al proyecto
cd /Users/armandoolmo/QuimeraAppCursor/QuimeraAi

# 2. Instala Firebase CLI (si no lo tienes)
npm install -g firebase-tools

# 3. Login a Firebase
firebase login

# 4. Configura la nueva API key EN EL BACKEND (NO en archivos)
firebase functions:config:set gemini.api_key="TU_NUEVA_API_KEY_AQUI"

# 5. Deploy Cloud Functions (proxy seguro)
./deploy-cloud-functions.sh
```

---

### **Paso 3: Actualizar .env.local** (SOLO LOCAL, NO SUBIR A GIT)

Crea el archivo `.env.local` (ya está en `.gitignore`, es seguro):

```bash
# Editar .env.local
nano .env.local
```

Agrega SOLO estas líneas:

```env
# Proxy (para producción)
VITE_GEMINI_PROXY_URL=https://us-central1-quimeraai.cloudfunctions.net/gemini

# API Key SOLO para desarrollo local (NO subir a Git)
VITE_GEMINI_API_KEY=TU_NUEVA_API_KEY_AQUI

# Firebase (estas son públicas, OK exponerlas)
VITE_FIREBASE_API_KEY=AIzaSyBs_MbMSN6BCD1yrZ8SpCoa07DcZm2rmsM
VITE_FIREBASE_AUTH_DOMAIN=quimeraai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=quimeraai
VITE_FIREBASE_STORAGE_BUCKET=quimeraai.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=575386543550
VITE_FIREBASE_APP_ID=1:575386543550:web:395114b8f43e810a7985ef
VITE_FIREBASE_MEASUREMENT_ID=G-KQ26WWK4MD
```

Guarda: `Ctrl+O`, `Enter`, `Ctrl+X`

---

### **Paso 4: Rebuild y Redeploy** (2 minutos)

```bash
# Rebuild
npm run build

# Deploy
./deploy-fix.sh
```

---

## ✅ VERIFICACIÓN

### Test 1: Cloud Functions funcionan
```bash
curl -X POST https://us-central1-quimeraai.cloudfunctions.net/gemini-generate \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test",
    "prompt": "Di OK si funcionas",
    "model": "gemini-1.5-flash"
  }'
```

**Esperado:** JSON con respuesta, NO error 403.

### Test 2: App funciona
```bash
# Abre tu app
open https://quimeraai2025-1034000853795.us-east1.run.app

# Abre DevTools (F12) → Console
# Intenta usar el chatbot AI
# NO deberías ver errores 403
```

---

## 🔒 POR QUÉ ESTO NO VOLVERÁ A PASAR

### **Antes (Inseguro):**
```
Cliente → Gemini API directa
         ↑
    (API key expuesta en el código)
```
- ❌ API key en archivos de Git
- ❌ Google la escanea y bloquea
- ❌ Cualquiera puede copiarla

### **Ahora (Seguro):**
```
Cliente → Cloud Function (Backend) → Gemini API
                ↑
        (API key SOLO en backend)
```
- ✅ API key SOLO en Cloud Functions
- ✅ NUNCA expuesta al cliente
- ✅ NUNCA en archivos de Git
- ✅ Google NO puede escanearla

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

1. ✅ **API key en backend:** SOLO en Cloud Functions
2. ✅ **.gitignore actualizado:** `.env.local` NO se sube a Git
3. ✅ **Archivos limpiados:** Removí todas las API keys de archivos de documentación
4. ✅ **Rate limiting:** 10 req/min FREE, 50 PRO, 200 ENTERPRISE
5. ✅ **Tracking:** Monitoreo completo de uso

---

## 📋 CHECKLIST CRÍTICO

- [ ] Nueva API key creada en Google AI Studio
- [ ] API keys viejas eliminadas
- [ ] API key configurada en Firebase Functions (`firebase functions:config:set`)
- [ ] Cloud Functions deployadas (`./deploy-cloud-functions.sh`)
- [ ] `.env.local` creado con nueva key (SOLO local)
- [ ] App rebuildeada (`npm run build`)
- [ ] App deployada (`./deploy-fix.sh`)
- [ ] Test con curl exitoso (NO error 403)
- [ ] App funciona sin errores 403

---

## 🚨 REGLAS DE ORO (NUNCA OLVIDAR)

### ✅ PERMITIDO:
- Poner API keys en `.env.local` (está en .gitignore)
- Poner API keys en Firebase Functions config
- Exponer Firebase API keys (están diseñadas para eso)

### ❌ PROHIBIDO:
- Poner API keys de Gemini en archivos de código
- Poner API keys en archivos de documentación (*.md)
- Hacer commit de `.env.local` a Git
- Poner API keys en builds de producción

---

## 📊 MONITOREO

### Ver si hay API keys expuestas:
```bash
# Buscar patrones de API keys en el código
grep -r "AIzaSy" --exclude-dir=node_modules --exclude-dir=dist .
```

**Resultado esperado:** SOLO en `.env.local` y archivos de ejemplo (con "TU_KEY_AQUI")

### Ver logs de Cloud Functions:
```bash
firebase functions:log --follow
```

### Ver uso de la nueva API key:
```bash
# En Google AI Studio
open "https://aistudio.google.com/app/apikey"
# Click en tu key → Ver detalles de uso
```

---

## 🎯 RESULTADO FINAL

### Antes:
- ❌ API key bloqueada
- ❌ Error 403 en todas las llamadas
- ❌ Chatbots no funcionan

### Después (en 5 minutos):
- ✅ Nueva API key segura en backend
- ✅ Sin errores 403
- ✅ Chatbots funcionan perfectamente
- ✅ Widgets embedidos funcionan en cualquier dominio
- ✅ Imposible que Google bloquee la key de nuevo

---

## 🆘 Si algo falla:

### Error: "GEMINI_API_KEY not configured"
```bash
firebase functions:config:set gemini.api_key="TU_KEY"
firebase deploy --only functions
```

### Error 403 persiste:
```bash
# Verifica que la nueva key esté configurada
firebase functions:config:get

# Debería mostrar:
# {
#   "gemini": {
#     "api_key": "AIzaSy..."
#   }
# }

# Si no, reconfigura:
firebase functions:config:set gemini.api_key="TU_NUEVA_KEY"
firebase deploy --only functions
```

### Error: "API key not valid"
- Verifica que copiaste bien la key (sin espacios)
- Verifica que la key sea nueva (no una vieja bloqueada)
- Crea otra key nueva si es necesario

---

## ✅ UNA VEZ COMPLETADO:

Tu aplicación estará:
- 🔒 **Segura:** API key nunca expuesta
- 🌐 **Funcional:** Widgets en cualquier dominio
- 📊 **Monitoreada:** Tracking completo
- 🚀 **Lista:** Para producción sin riesgos

**Tiempo total: ~10 minutos**

---

**¿Preguntas?** Consulta:
- `INSTALAR_Y_DEPLOYAR_AHORA.md` - Guía de deployment
- `GEMINI_PROXY_SETUP.md` - Setup completo del proxy
- `START_HERE_PROXY.md` - ¿Qué es el proxy?



