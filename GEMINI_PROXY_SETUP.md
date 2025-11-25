# 🔒 Gemini API Proxy - Guía Completa de Setup

## 📋 Índice
1. [¿Qué es esto?](#qué-es-esto)
2. [¿Por qué necesitas esto?](#por-qué-necesitas-esto)
3. [Arquitectura](#arquitectura)
4. [Setup Paso a Paso](#setup-paso-a-paso)
5. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
6. [Deployment](#deployment)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 ¿Qué es esto?

Un **backend proxy** que permite a tus chatbots embedidos funcionar en **cualquier dominio** sin exponer tu API key de Gemini.

### Antes (Sin Proxy):
```
Widget en sitio externo → ❌ Llamada directa a Gemini → 🔑 API Key expuesta
```

### Después (Con Proxy):
```
Widget en sitio externo → ✅ Tu Cloud Function → 🔒 API Key segura → Gemini API
```

---

## 🔐 ¿Por qué necesitas esto?

### Problema sin Proxy:
1. ❌ **API keys expuestas** en el código del cliente
2. ❌ Los widgets embedidos **solo funcionan en dominios específicos** (por restricciones)
3. ❌ **No puedes escalar** (Google limita a 400 dominios)
4. ❌ Cualquiera puede copiar tu key y usarla

### Solución con Proxy:
1. ✅ **API keys nunca se exponen** al cliente
2. ✅ Los widgets **funcionan en cualquier dominio**
3. ✅ **Rate limiting** por proyecto
4. ✅ **Auditoría** de uso
5. ✅ **Control total** sobre quién usa tu API

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (Cualquier dominio)              │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐        │
│  │ Widget #1  │    │ Widget #2  │    │ Widget #3  │        │
│  │ client1.com│    │ client2.com│    │ client3.com│        │
│  └──────┬─────┘    └──────┬─────┘    └──────┬─────┘        │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          │  POST /gemini-generate             │
          │  { projectId, prompt }              │
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              FIREBASE CLOUD FUNCTIONS                       │
│  ┌────────────────────────────────────────────────────┐     │
│  │  geminiProxy.ts                                    │     │
│  │  • Valida projectId                                │     │
│  │  • Verifica que chatbot esté activo                │     │
│  │  • Rate limiting (10 req/min FREE, 50 PRO)         │     │
│  │  • Tracking de uso                                 │     │
│  └─────────────────────┬──────────────────────────────┘     │
└────────────────────────┼────────────────────────────────────┘
                         │
                         │ GEMINI_API_KEY (secure)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    GOOGLE GEMINI API                        │
│              https://generativelanguage.googleapis.com      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Setup Paso a Paso

### Paso 1: Instalar Dependencias de Cloud Functions

```bash
cd functions
npm install
```

Ya tienes todo lo necesario porque solo usamos `firebase-functions` y `firebase-admin`.

### Paso 2: Configurar la API Key en Cloud Functions

La API key de Gemini se pasa a Cloud Functions usando **Firebase Environment Config** o **Secret Manager**.

#### Opción A: Firebase Config (Más Simple)

```bash
# Configura la API key de Gemini
firebase functions:config:set gemini.api_key="TU_GEMINI_API_KEY_AQUI"

# Verifica que se configuró correctamente
firebase functions:config:get
```

#### Opción B: Secret Manager (Más Seguro - Recomendado para Producción)

```bash
# 1. Habilita Secret Manager API
gcloud services enable secretmanager.googleapis.com

# 2. Crea el secret
echo -n "TU_GEMINI_API_KEY_AQUI" | gcloud secrets create GEMINI_API_KEY --data-file=-

# 3. Da permisos a Cloud Functions
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:quimeraai@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 4. Actualiza functions/src/geminiProxy.ts para usar Secret Manager
# (código incluido abajo)
```

### Paso 3: Configurar Variables de Entorno en tu App Principal

Crea o actualiza `.env.local`:

```env
# URL base del proxy (ajusta según tu proyecto)
VITE_GEMINI_PROXY_URL=https://us-central1-quimeraai.cloudfunctions.net/gemini

# Forzar uso del proxy incluso en desarrollo (opcional)
VITE_USE_GEMINI_PROXY=false

# API Key para desarrollo local (opcional, si no usas proxy en dev)
VITE_GEMINI_API_KEY=TU_API_KEY_DESARROLLO
```

### Paso 4: Construir y Deployar Cloud Functions

```bash
# Desde la raíz del proyecto
cd functions

# Construir
npm run build

# Deploy solo las funciones de Gemini (primera vez)
firebase deploy --only functions:gemini-generate,functions:gemini-stream,functions:gemini-usage

# O deploy todas las funciones
firebase deploy --only functions
```

### Paso 5: Actualizar Configuración de Firebase Hosting (si es necesario)

Si quieres que las funciones estén disponibles en un path más amigable, actualiza `firebase.json`:

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/api/gemini/generate",
        "function": "gemini-generate"
      },
      {
        "source": "/api/gemini/stream",
        "function": "gemini-stream"
      },
      {
        "source": "/api/gemini/usage/**",
        "function": "gemini-usage"
      }
    ]
  }
}
```

### Paso 6: Rebuild y Redeploy tu App Principal

```bash
# Desde la raíz del proyecto
npm run build

# Deploy con las nuevas variables de entorno
./deploy-fix.sh
```

---

## 🔧 Configuración de Variables de Entorno

### Variables para Cloud Functions:

| Variable | Dónde | Valor |
|----------|-------|-------|
| `gemini.api_key` | Firebase Config | Tu Gemini API Key |
| `GEMINI_API_KEY` | Secret Manager (alt) | Tu Gemini API Key |

```bash
# Ver configuración actual
firebase functions:config:get

# Actualizar API key
firebase functions:config:set gemini.api_key="NUEVA_KEY"

# Después de cambiar config, redeploy functions
firebase deploy --only functions
```

### Variables para tu App (`.env.local`):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_GEMINI_PROXY_URL` | URL base del proxy | `https://us-central1-quimeraai.cloudfunctions.net/gemini` |
| `VITE_USE_GEMINI_PROXY` | Forzar uso del proxy | `true` o `false` |
| `VITE_GEMINI_API_KEY` | API key para desarrollo local | Solo si no usas proxy en dev |

---

## 🧪 Testing

### Test 1: Verificar que las Cloud Functions están deployadas

```bash
# Listar funciones deployadas
firebase functions:list

# Deberías ver:
# - gemini-generate
# - gemini-stream
# - gemini-usage
```

### Test 2: Test manual con curl

```bash
# Test de generate (reemplaza PROJECT_ID con un ID real de tu Firestore)
curl -X POST \
  https://us-central1-quimeraai.cloudfunctions.net/gemini-generate \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "TU_PROJECT_ID",
    "prompt": "Hola, ¿cómo estás?",
    "model": "gemini-1.5-flash"
  }'

# Respuesta esperada:
# {
#   "response": { ... },
#   "metadata": {
#     "tokensUsed": 25,
#     "model": "gemini-1.5-flash",
#     "remaining": 9
#   }
# }
```

### Test 3: Test desde tu app en desarrollo

```javascript
// Abre la consola del navegador en tu app
import { generateContentViaProxy } from './utils/geminiProxyClient';

const projectId = 'tu-project-id'; // Obtén de Firestore
const response = await generateContentViaProxy(
  projectId,
  'Hola, ¿cómo estás?',
  'gemini-1.5-flash'
);

console.log('Response:', response);
```

### Test 4: Verificar rate limiting

```bash
# Hacer 15 requests rápidos (debería fallar después de 10 en plan FREE)
for i in {1..15}; do
  echo "Request $i"
  curl -X POST https://us-central1-quimeraai.cloudfunctions.net/gemini-generate \
    -H "Content-Type: application/json" \
    -d '{"projectId":"test","prompt":"test"}' \
    | jq '.metadata.remaining'
done

# Las primeras 10 deberían tener remaining: 9, 8, 7...
# La request 11 debería retornar 429 con mensaje de rate limit
```

### Test 5: Verificar tracking de uso

```bash
# Ver uso de un proyecto
curl https://us-central1-quimeraai.cloudfunctions.net/gemini-usage/TU_PROJECT_ID

# Respuesta:
# {
#   "projectId": "...",
#   "period": "30days",
#   "totalRequests": 25,
#   "totalTokens": 1234,
#   "averageTokensPerRequest": 49,
#   "usage": [ ... ]
# }
```

---

## 🚨 Troubleshooting

### Error: "GEMINI_API_KEY not configured"

**Causa:** La API key no está configurada en Cloud Functions.

**Solución:**
```bash
firebase functions:config:set gemini.api_key="TU_KEY"
firebase deploy --only functions
```

### Error: "Project not found"

**Causa:** El projectId no existe en Firestore.

**Solución:**
- Verifica que el proyecto existe en Firestore collection `projects`
- Verifica que estás pasando el ID correcto (no el nombre)

### Error: "AI assistant is not active for this project"

**Causa:** El campo `aiAssistantConfig.isActive` es `false` o no existe.

**Solución:**
- Ve al dashboard de tu proyecto
- Activa el chatbot AI Assistant

### Error: "Rate limit exceeded"

**Causa:** Has excedido el límite de requests por minuto o por día.

**Solución:**
- Espera hasta que se resetee el límite
- Upgrade del plan FREE a PRO (si es tu proyecto)
- Verifica que no hay un loop infinito haciendo requests

### Error: "Gemini API error"

**Causa:** Problema con la llamada a Gemini API (API key inválida, cuota excedida, etc.)

**Solución:**
```bash
# Verificar logs de Cloud Functions
firebase functions:log --only gemini-generate

# Ver los últimos 50 logs
gcloud functions logs read gemini-generate --limit 50
```

### El proxy no se usa en producción

**Causa:** `shouldUseProxy()` retorna `false`.

**Solución:**
1. Verifica que estás en un dominio que no es localhost
2. O fuerza el uso del proxy:
   ```env
   VITE_USE_GEMINI_PROXY=true
   ```
3. Rebuild y redeploy:
   ```bash
   npm run build
   ./deploy-fix.sh
   ```

---

## 📊 Monitoreo

### Ver logs en tiempo real:

```bash
# Logs de generate function
firebase functions:log --only gemini-generate --follow

# Logs de todas las funciones
firebase functions:log --follow
```

### Ver métricas en Google Cloud Console:

1. Ve a: https://console.cloud.google.com/functions
2. Selecciona tu proyecto: `quimeraai`
3. Click en `gemini-generate`
4. Ve a la pestaña "METRICS"
5. Verás:
   - Invocations (requests)
   - Execution time
   - Memory usage
   - Error rate

### Configurar alertas:

```bash
# Alerta si error rate > 5%
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="Gemini Proxy Error Rate High" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s
```

---

## 🎯 Rate Limits

| Plan | Requests/Minuto | Requests/Día | Tokens/Día (aprox) |
|------|-----------------|--------------|-------------------|
| FREE | 10 | 1,000 | 50,000 |
| PRO | 50 | 10,000 | 500,000 |
| ENTERPRISE | 200 | 100,000 | 5,000,000 |

Para cambiar el plan de un proyecto, actualiza el campo `planType` en Firestore:

```javascript
// En Firestore console o código
db.collection('projects').doc(projectId).update({
  planType: 'PRO' // o 'ENTERPRISE'
});
```

---

## 🔒 Seguridad Adicional

### 1. Agregar autenticación de usuario (opcional)

Si quieres que solo usuarios autenticados puedan usar el proxy:

```typescript
// En geminiProxy.ts, agrega al inicio de generateContent:
const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  res.status(401).json({ error: 'Unauthorized' });
  return;
}

const token = authHeader.split('Bearer ')[1];
try {
  const decodedToken = await admin.auth().verifyIdToken(token);
  // Verificar que decodedToken.uid tiene acceso al projectId
} catch (error) {
  res.status(401).json({ error: 'Invalid token' });
  return;
}
```

### 2. Whitelist de dominios (opcional)

Si quieres limitar qué dominios pueden llamar al proxy:

```typescript
// En geminiProxy.ts
const allowedOrigins = [
  'https://quimeraai2025-*.run.app',
  'https://cliente-aprobado.com',
  'https://otro-cliente.com'
];

const origin = req.headers.origin || '';
const isAllowed = allowedOrigins.some(allowed => 
  new RegExp(allowed.replace('*', '.*')).test(origin)
);

if (!isAllowed) {
  res.status(403).json({ error: 'Origin not allowed' });
  return;
}
```

---

## ✅ Checklist de Deployment

- [ ] Cloud Functions instaladas y construidas
- [ ] API key configurada en Firebase Config
- [ ] Cloud Functions deployadas exitosamente
- [ ] Variables de entorno configuradas en `.env.local`
- [ ] App principal rebuilded y deployada
- [ ] Test manual con curl exitoso
- [ ] Test desde navegador exitoso
- [ ] Rate limiting verificado
- [ ] Tracking de uso funcionando
- [ ] Logs monitoreados sin errores
- [ ] Widgets embedidos funcionando en dominios externos

---

## 🎉 ¡Listo!

Tu Gemini API ahora está protegida detrás de un proxy seguro. Los chatbots de tus usuarios funcionarán en cualquier dominio sin exponer tu API key.

**Próximos pasos:**
1. ✅ Configurar restricciones en Firebase API (ya es seguro)
2. ✅ Monitorear uso y costos
3. ✅ Actualizar planes según uso real
4. ✅ Considerar agregar más features al proxy (ej: caching, analytics avanzados)

**¿Preguntas?** Consulta los logs y el código fuente en:
- `functions/src/geminiProxy.ts`
- `utils/geminiProxyClient.ts`
- `utils/genAiClient.ts`

