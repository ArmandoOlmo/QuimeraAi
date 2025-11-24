# 🔧 Solución: APIs de Google no funcionan en Deploy

## 📋 Problema

Las APIs de Google (Gemini AI) no están funcionando en el deployment de Google Cloud Run. Los usuarios ven errores como:
- "API key required"
- "Google API key is not configured"
- El asistente AI no funciona en producción

## 🔍 Causa del Problema

**Vite y variables de entorno con prefijo `VITE_`:**

Las variables de entorno que comienzan con `VITE_` se procesan durante el **build time**, NO en runtime:

1. Durante el build, Vite busca `process.env.VITE_GEMINI_API_KEY`
2. Si la encuentra, **reemplaza** todas las referencias a `import.meta.env.VITE_GEMINI_API_KEY` por el **valor literal** de la API key
3. El código JavaScript compilado contiene la API key como un string literal (no una variable de entorno)
4. En runtime, el código NO puede leer variables de entorno - solo puede usar los valores que se inyectaron durante el build

**Por qué falla:**

Si la variable `VITE_GEMINI_API_KEY` NO está presente durante el build:
- Vite reemplaza `import.meta.env.VITE_GEMINI_API_KEY` por `undefined`
- El código compilado tiene `undefined` en lugar de la API key
- Configurar variables de entorno en Cloud Run después del build NO ayuda porque el código ya está compilado

## ✅ Solución Implementada

He actualizado los siguientes archivos para resolver este problema:

### 1. ✅ `Dockerfile` - Mejorado

**Cambios:**
- ✅ Validación de que `VITE_GEMINI_API_KEY` no esté vacía antes del build
- ✅ Verificación de que la API key se inyectó correctamente en el código compilado
- ✅ Mejores mensajes de error y debugging

### 2. ✅ `cloudbuild.yaml` - Mejorado

**Cambios:**
- ✅ Nuevo Step 0: Valida que las variables estén configuradas antes de iniciar el build
- ✅ Agrega `CACHEBUST` usando `$BUILD_ID` para forzar rebuilds
- ✅ Configuración de timeout y CPU en Cloud Run

### 3. ✅ `deploy.sh` - Completamente Renovado

**Cambios:**
- ✅ Mejor manejo de errores con `set -e` y traps
- ✅ Colores en el output para mejor legibilidad
- ✅ Validación de gcloud CLI y proyecto configurado
- ✅ Verificación de longitud de API key
- ✅ Cleanup automático en caso de error
- ✅ Mensajes informativos post-deployment

### 4. ✅ `verify-deployment.sh` - Nuevo Script

**Nuevo archivo** que verifica:
- ✅ gcloud CLI instalado y configurado
- ✅ Variables de entorno configuradas correctamente
- ✅ Archivos necesarios presentes
- ✅ APIs de Google Cloud habilitadas
- ✅ Estado del servicio en Cloud Run

## 🚀 Cómo Usar la Solución

### Paso 1: Obtener tu API Key

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crea o copia una API key existente
3. La API key debe comenzar con `AIza...`

### Paso 2: Configurar Variables de Entorno

**Opción A: Variables de entorno persistentes (Recomendado)**

Agrega esto a tu `~/.bashrc` o `~/.zshrc`:

```bash
# QuimeraAI - API Keys para Deployment
export VITE_GEMINI_API_KEY="AIzaSy..."

# Firebase (opcional, tiene fallbacks)
export VITE_FIREBASE_API_KEY="AIza..."
export VITE_FIREBASE_AUTH_DOMAIN="quimeraai.firebaseapp.com"
export VITE_FIREBASE_PROJECT_ID="quimeraai"
export VITE_FIREBASE_STORAGE_BUCKET="quimeraai.firebasestorage.app"
export VITE_FIREBASE_MESSAGING_SENDER_ID="575386543550"
export VITE_FIREBASE_APP_ID="1:575386543550:web:..."
export VITE_FIREBASE_MEASUREMENT_ID="G-..."
```

Luego recarga tu shell:
```bash
source ~/.bashrc  # o source ~/.zshrc
```

**Opción B: Variables temporales (para una sola sesión)**

```bash
export VITE_GEMINI_API_KEY="AIzaSy..."
# ... otras variables ...
```

### Paso 3: Verificar Configuración

**Nuevo:** Ejecuta el script de verificación:

```bash
./verify-deployment.sh
```

Este script te dirá exactamente qué falta o está mal configurado.

### Paso 4: Desplegar

Una vez que `verify-deployment.sh` muestre ✅ todo OK:

```bash
./deploy.sh
```

El script de deploy ahora:
- ✅ Verifica automáticamente las variables
- ✅ Hace backup de tu `.env.local`
- ✅ Despliega con las variables correctas
- ✅ Restaura tu `.env.local` al final
- ✅ Muestra instrucciones de verificación

## 🔍 Verificar que Funciona

Después del deploy:

### 1. Verificar en el Navegador

```bash
# Obtener la URL del servicio
gcloud run services describe quimeraai2025 --region us-east1 --format="value(status.url)"
```

Abre esa URL y:
1. Abre la consola del navegador (F12)
2. Busca mensajes como "✅ API Key encontrada"
3. El asistente AI debe mostrar "Online" (no "API key required")

### 2. Verificar en los Logs de Build

```bash
# Ver el último build
gcloud builds list --limit=1

# Ver logs del build (reemplaza BUILD_ID)
gcloud builds log [BUILD_ID]
```

Busca en los logs:
- ✅ `Google API Key encontrada en variables de entorno`
- ✅ `API key found in compiled code`
- ❌ Si ves: `Google API Key NO encontrada` → La variable no llegó al build

### 3. Verificar en los Logs de Cloud Run

```bash
gcloud run services logs read quimeraai2025 --region us-east1 --limit=50
```

## 🐛 Troubleshooting

### Problema: "VITE_GEMINI_API_KEY is not set"

**Solución:**
```bash
# Verificar que la variable está configurada
echo $VITE_GEMINI_API_KEY

# Si está vacío, configurarla
export VITE_GEMINI_API_KEY="tu_api_key_aqui"
```

### Problema: "API key required" después del deploy

**Causas posibles:**

1. **La variable no se pasó durante el build**
   ```bash
   # Ver logs del último build
   gcloud builds list --limit=1
   gcloud builds log [BUILD_ID] | grep -i "api key"
   ```
   
   Si ves "API Key NO encontrada", la variable no llegó al build.

2. **La API key es inválida**
   - Verifica que la API key sea correcta en Google AI Studio
   - Verifica que no haya expirado
   - Verifica que tenga los permisos necesarios

3. **Problemas de cache**
   ```bash
   # Forzar un nuevo build sin cache
   CACHEBUST=$(date +%s) ./deploy.sh
   ```

### Problema: "Container failed to start"

**Solución:**
```bash
# Ver logs detallados
gcloud run services logs read quimeraai2025 --region us-east1 --limit=100

# Verificar el estado del servicio
gcloud run services describe quimeraai2025 --region us-east1
```

### Problema: Build muy lento o falla por timeout

**Solución:**
El `cloudbuild.yaml` ya está configurado con:
- Timeout de 1200s (20 minutos)
- Máquina `N1_HIGHCPU_8` para builds rápidos

Si aún es lento:
```bash
# Desplegar directamente (más rápido para pruebas)
gcloud run deploy quimera2025 \
  --source . \
  --region us-east1 \
  --set-build-env-vars "VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY"
```

## 📊 Diferencias entre Métodos de Deploy

### Método 1: `./deploy.sh` (Recomendado)

✅ **Ventajas:**
- Script mejorado con validaciones
- Backup automático de `.env.local`
- Mensajes claros y coloreados
- Cleanup automático si falla

```bash
export VITE_GEMINI_API_KEY="..."
./deploy.sh
```

### Método 2: `gcloud builds submit` con `cloudbuild.yaml`

✅ **Ventajas:**
- Más control sobre el proceso de build
- Mejor para CI/CD
- Validaciones pre-build

```bash
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=_VITE_GEMINI_API_KEY="$VITE_GEMINI_API_KEY",_REGION="us-east1"
```

### Método 3: `gcloud run deploy` directo

✅ **Ventajas:**
- Más simple
- Bueno para pruebas rápidas

```bash
gcloud run deploy quimera2025 \
  --source . \
  --region us-east1 \
  --set-build-env-vars "VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY"
```

## 🔐 Seguridad

### Mejores Prácticas

1. **NUNCA** commitees archivos `.env*` al repositorio
2. Usa **Secret Manager** para producción:
   ```bash
   # Crear secret
   echo -n "$VITE_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
   
   # Dar permisos
   PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
   gcloud secrets add-iam-policy-binding gemini-api-key \
     --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. **Restringe la API key** en Google AI Studio:
   - Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Configura "Application restrictions" para tu dominio de Cloud Run
   - Ejemplo: `https://quimeraai2025-*.us-east1.run.app`

4. **Rota las API keys periódicamente**

## 📚 Archivos Actualizados

| Archivo | Estado | Descripción |
|---------|--------|-------------|
| `Dockerfile` | ✅ Mejorado | Validaciones y verificaciones |
| `cloudbuild.yaml` | ✅ Mejorado | Validación pre-build, mejor configuración |
| `deploy.sh` | ✅ Renovado | Completamente mejorado con validaciones |
| `verify-deployment.sh` | ✅ Nuevo | Script de verificación pre-deploy |
| `SOLUCION_API_GOOGLE_DEPLOY.md` | ✅ Nuevo | Esta guía |

## ✅ Checklist de Deployment

Antes de cada deploy, verifica:

- [ ] ✅ API key obtenida de Google AI Studio
- [ ] ✅ Variable `VITE_GEMINI_API_KEY` configurada (`echo $VITE_GEMINI_API_KEY`)
- [ ] ✅ gcloud CLI instalado y configurado
- [ ] ✅ Proyecto de Google Cloud configurado
- [ ] ✅ APIs habilitadas (run.googleapis.com, cloudbuild.googleapis.com)
- [ ] ✅ Ejecutado `./verify-deployment.sh` sin errores
- [ ] ✅ Ejecutado `./deploy.sh`
- [ ] ✅ Verificado en el navegador que funciona
- [ ] ✅ Verificado logs de build y runtime

## 🆘 Soporte

Si sigues teniendo problemas después de seguir esta guía:

1. **Ejecuta el script de verificación:**
   ```bash
   ./verify-deployment.sh
   ```

2. **Recopila información de debug:**
   ```bash
   echo "API Key length: ${#VITE_GEMINI_API_KEY}"
   gcloud config get-value project
   gcloud builds list --limit=1
   gcloud run services describe quimera2025 --region us-east1
   ```

3. **Verifica los logs:**
   ```bash
   # Logs de build
   gcloud builds log $(gcloud builds list --limit=1 --format="value(id)")
   
   # Logs de runtime
   gcloud run services logs read quimera2025 --region us-east1 --limit=100
   ```

---

**Última actualización:** 24 de Noviembre, 2025
**Versión:** 2.0 - Solución completa con scripts mejorados

