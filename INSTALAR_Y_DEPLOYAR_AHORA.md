# 🚀 INSTALAR Y DEPLOYAR AHORA - Guía de 5 Minutos

## ✅ Todo está listo, solo falta ejecutar comandos

Todos los archivos ya están creados. Solo necesitas:
1. Instalar Firebase CLI
2. Ejecutar comandos

---

## 📋 COMANDOS LISTOS PARA COPIAR Y PEGAR

### Paso 1: Instalar Firebase CLI (1 minuto)

Abre una terminal nueva y ejecuta:

```bash
npm install -g firebase-tools
```

Verifica la instalación:

```bash
firebase --version
```

Deberías ver algo como: `13.0.0` o similar.

---

### Paso 2: Login a Firebase (30 segundos)

```bash
firebase login
```

Se abrirá tu navegador para autenticarte. Acepta los permisos.

---

### Paso 3: Ve a tu proyecto (5 segundos)

```bash
cd /Users/armandoolmo/QuimeraAppCursor/QuimeraAi
```

---

### Paso 4: Configurar API Key de Gemini (30 segundos)

**IMPORTANTE:** Primero obtén tu API key de Gemini:
- Ve a: https://aistudio.google.com/app/apikey
- Copia tu API key

Luego ejecuta (reemplaza con tu key real):

```bash
firebase functions:config:set gemini.api_key="TU_GEMINI_API_KEY_AQUI"
```

Verifica que se configuró:

```bash
firebase functions:config:get
```

Deberías ver:
```json
{
  "gemini": {
    "api_key": "TU_KEY..."
  }
}
```

---

### Paso 5: Deploy Cloud Functions (3-5 minutos)

Ejecuta el script automatizado:

```bash
chmod +x deploy-cloud-functions.sh
./deploy-cloud-functions.sh
```

O manualmente:

```bash
# Instalar dependencias de functions
cd functions
npm install

# Construir TypeScript
npm run build

# Volver a raíz
cd ..

# Deploy las funciones
firebase deploy --only functions:gemini-generate,functions:gemini-stream,functions:gemini-usage
```

**Espera de 3-5 minutos** mientras se despliegan las funciones.

---

### Paso 6: Verificar Deployment ✅

Después del deployment exitoso, verifica:

```bash
firebase functions:list
```

Deberías ver:
```
✔ gemini-generate
✔ gemini-stream
✔ gemini-usage
```

URLs de tus funciones:
```
https://us-central1-quimeraai.cloudfunctions.net/gemini-generate
https://us-central1-quimeraai.cloudfunctions.net/gemini-stream
https://us-central1-quimeraai.cloudfunctions.net/gemini-usage
```

---

### Paso 7: Test Rápido (30 segundos)

Prueba que funciona:

```bash
curl -X POST https://us-central1-quimeraai.cloudfunctions.net/gemini-generate \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test",
    "prompt": "Hola, responde con una sola palabra",
    "model": "gemini-1.5-flash"
  }'
```

**Respuesta esperada:**
```json
{
  "response": {
    "candidates": [...],
    ...
  },
  "metadata": {
    "tokensUsed": 10,
    "model": "gemini-1.5-flash",
    "remaining": 9
  }
}
```

---

## 🎉 SI EL TEST FUNCIONA:

### Paso 8: Actualizar .env.local

Crea o actualiza el archivo `.env.local` en la raíz del proyecto:

```bash
# Crea/edita el archivo
nano .env.local
```

Agrega estas líneas:

```env
# Gemini Proxy
VITE_GEMINI_PROXY_URL=https://us-central1-quimeraai.cloudfunctions.net/gemini
VITE_USE_GEMINI_PROXY=false

# Gemini API Key (solo para desarrollo local)
VITE_GEMINI_API_KEY=TU_API_KEY_AQUI

# Firebase (si no las tienes ya)
VITE_FIREBASE_API_KEY=AIzaSyBs_MbMSN6BCD1yrZ8SpCoa07DcZm2rmsM
VITE_FIREBASE_AUTH_DOMAIN=quimeraai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=quimeraai
VITE_FIREBASE_STORAGE_BUCKET=quimeraai.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=575386543550
VITE_FIREBASE_APP_ID=1:575386543550:web:395114b8f43e810a7985ef
VITE_FIREBASE_MEASUREMENT_ID=G-KQ26WWK4MD
```

Guarda con: `Ctrl+O`, `Enter`, `Ctrl+X`

---

### Paso 9: Rebuild y Redeploy App Principal

```bash
# Rebuild
npm run build

# Deploy
./deploy-fix.sh
```

---

## 🔒 PASO FINAL: Configurar Restricciones

Ahora que el proxy está activo, configura restricciones de Firebase API:

```bash
./configure-api-restrictions.sh
```

O abre manualmente:

```bash
open "https://console.cloud.google.com/apis/credentials?project=quimeraai"
```

**Para Firebase API Key:**
1. Busca "Browser key (auto created by Firebase)"
2. Click en editar (lápiz)
3. Application restrictions → HTTP referrers
4. Agrega:
   - `https://*.run.app/*`
   - `http://localhost/*`
   - `http://localhost:5173/*`
5. Guarda

**Para Gemini API Key:**
1. Ve a: https://aistudio.google.com/app/apikey
2. Click en tu API key → Settings
3. API restrictions → Restrict key
4. Marca solo: `Generative Language API`
5. ✅ **NO agregues restricciones de dominio** (ya está en el backend)
6. Guarda

---

## ✅ CHECKLIST COMPLETO

- [ ] Firebase CLI instalado (`firebase --version`)
- [ ] Login a Firebase (`firebase login`)
- [ ] API key configurada (`firebase functions:config:get`)
- [ ] Cloud Functions deployadas (`firebase functions:list`)
- [ ] Test con curl exitoso (respuesta JSON)
- [ ] `.env.local` actualizado
- [ ] App rebuilded (`npm run build`)
- [ ] App deployada (`./deploy-fix.sh`)
- [ ] Restricciones de Firebase API configuradas
- [ ] Restricciones de Gemini API configuradas
- [ ] Todo funciona sin errores ✅

---

## 🚨 Si algo falla:

### Ver logs:
```bash
firebase functions:log --follow
```

### Ver configuración:
```bash
firebase functions:config:get
```

### Redeploy funciones:
```bash
firebase deploy --only functions
```

### Test de una función específica:
```bash
firebase functions:log --only gemini-generate
```

---

## 📊 RESULTADO ESPERADO:

### Antes:
- ❌ API key expuesta en el cliente
- ❌ Widgets solo funcionan en dominios específicos
- ❌ Limitado a 400 dominios

### Después:
- ✅ API key 100% segura en backend
- ✅ Widgets funcionan en CUALQUIER dominio
- ✅ Rate limiting automático
- ✅ Tracking de uso completo
- ✅ Sin límites de dominios

---

## 🎉 ¡Listo!

Una vez completado todo el checklist, tu aplicación estará:
- 🔒 Segura (API keys protegidas)
- ♾️ Escalable (sin límites de dominios)
- 📊 Monitoreada (tracking completo)
- 🚀 Lista para producción

---

## 📞 Comandos de Monitoreo

```bash
# Ver funciones deployadas
firebase functions:list

# Ver logs en tiempo real
firebase functions:log --follow

# Ver uso de una función específica
firebase functions:log --only gemini-generate --limit 50

# Ver configuración actual
firebase functions:config:get

# Ver estadísticas en Google Cloud Console
open "https://console.cloud.google.com/functions?project=quimeraai"
```

---

## 🎯 TIEMPO ESTIMADO TOTAL

- Firebase CLI install: **1 minuto**
- Login: **30 segundos**
- Configurar API key: **30 segundos**
- Deploy functions: **3-5 minutos**
- Test: **30 segundos**
- Actualizar .env: **1 minuto**
- Rebuild app: **2 minutos**
- Deploy app: **3-5 minutos**
- Restricciones: **2 minutos**

**TOTAL: ~15-20 minutos**

---

**¿Preguntas?** Consulta:
- `START_HERE_PROXY.md` - Guía rápida
- `GEMINI_PROXY_SETUP.md` - Setup completo
- `PROXY_IMPLEMENTATION_SUMMARY.md` - Resumen técnico

