# Solución Final: API de Gemini en Cloud Run

## 🔍 Problema Identificado

Encontramos **DOS problemas** que estaban causando que la API de Gemini no funcionara:

### 1. API Key Incorrecta en el Build ❌
Tu archivo `.env.local` contenía una API key antigua (`AIzaSyBs_MbMSN6BCD1yrZ8SpCoa07DcZm2rmsM`) que pertenece a tu proyecto de Firebase (`575386543550`), y este archivo se estaba copiando al contenedor Docker a pesar de estar en `.dockerignore`.

### 2. API de Generative Language No Habilitada en Firebase Project ❌
El proyecto de Firebase donde está tu API key antigua NO tenía habilitada la API de Generative Language, por lo que incluso si el código la usara, fallaría con el error:
```
API has not been used in project 575386543550 before or it is disabled
```

## ✅ Soluciones Implementadas

### 1. Creado Script de Deploy Automático
Creamos `/deploy.sh` que:
- Hace backup del `.env.local`
- Lo elimina temporalmente antes del build
- Despliega a Cloud Run con la API key correcta
- Restaura el `.env.local` después

**Uso:**
```bash
./deploy.sh
```

### 2. API de Generative Language Habilitada
Habilitamos la API de Generative Language en tu proyecto de Firebase (575386543550), por si acaso tu código intenta usar esa API key.

### 3. Dockerfile Mejorado
Modificamos el `Dockerfile` para que:
- Elimine forzosamente cualquier archivo `.env*` que se copie
- Cree un nuevo `.env` con la API key del ARG durante el build
- Muestre debugging info sobre la API key (sin exponerla)

## 📋 API Keys en Tu Proyecto

Tienes **DOS API keys diferentes**:

1. **Firebase API Key** (hardcodeada en `firebase.ts`):
   - `AIzaSyBs_MbMSN6BCD1yrZ8SpCoa07DcZm2rmsM`
   - Proyecto: `575386543550`
   - Uso: Solo para servicios de Firebase (Auth, Firestore, etc.)
   - ⚠️ NO usar para Gemini

2. **Gemini API Key** (pasada en deploy):
   - `AIzaSyCNgO6QWhKy2B00d4uu-nAagPow3RnQRNg`
   - Proyecto: `quimeraapp`
   - Uso: Para llamadas a la API de Gemini
   - ✅ Esta es la correcta para Gemini

## 🎯 Modelos de Gemini Actualizados

También corregimos los nombres de modelos obsoletos:
- ❌ `gemini-1.5-flash` → ✅ `gemini-2.5-flash`
- ✅ `gemini-3-pro-preview` (este sí existe y es correcto)

## 🚀 Cómo Desplegar de Ahora en Adelante

### Opción 1: Usar el Script de Deploy (Recomendado)
```bash
./deploy.sh
```

### Opción 2: Deploy Manual
```bash
# 1. Hacer backup y eliminar .env.local
cp .env.local .env.local.backup
rm .env.local

# 2. Desplegar
gcloud run deploy quimera2025 \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --set-build-env-vars VITE_GEMINI_API_KEY=AIzaSyCNgO6QWhKy2B00d4uu-nAagPow3RnQRNg

# 3. Restaurar .env.local
mv .env.local.backup .env.local
```

## 🔧 Verificar que Funciona

Después del deploy, verifica:

```bash
# Ver la revisión actual
gcloud run services describe quimera2025 --region us-east1 --format="value(status.latestReadyRevisionName)"

# Probar la API directamente
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyCNgO6QWhKy2B00d4uu-nAagPow3RnQRNg" \
-H 'Content-Type: application/json' \
-d '{"contents":[{"parts":[{"text":"Di OK si funcionas"}]}]}'
```

Deberías ver una respuesta exitosa con "OK" en el contenido.

## 📝 Archivos Modificados

1. **Dockerfile** - Mejorado para eliminar archivos `.env*` y crear uno nuevo con la API key correcta
2. **deploy.sh** - Nuevo script para automatizar el deploy
3. **.dockerignore** - Actualizado para ignorar mejor los archivos `.env.*`
4. **components/ChatbotWidget.tsx** - Actualizado modelo de `gemini-1.5-flash` a `gemini-2.5-flash`
5. **contexts/EditorContext.tsx** - Actualizado modelo cuando es necesario

## ⚠️ Importante

- **NUNCA** comitees archivos `.env.local` al repositorio
- La Firebase API Key en `firebase.ts` es DIFERENTE y está bien ahí (solo para Firebase)
- El script `deploy.sh` es la forma más segura de desplegar

## 🐛 Si Aún No Funciona

1. Verifica que la aplicación en el navegador no esté usando caché:
   - Abre DevTools (F12)
   - Ve a Network tab
   - Marca "Disable cache"
   - Recarga la página (Cmd/Ctrl + Shift + R)

2. Verifica los logs del navegador:
   ```javascript
   // Abre la consola del navegador y busca errores relacionados con Gemini
   ```

3. Verifica que la API key esté en el código compilado:
   ```bash
   curl -s "https://quimera2025-1034000853795.us-east1.run.app/assets/index-*.js" | grep -o "AIza[A-Za-z0-9_-]*"
   ```
   
   Deberías ver: `AIzaSyCNgO6QWhKy2B00d4uu-nAagPow3RnQRNg` (la correcta)
   NO: `AIzaSyBs_MbMSN6BCD1yrZ8SpCoa07DcZm2rmsM` (la de Firebase)

## 📞 Soporte

Si después de seguir estos pasos aún tienes problemas:
1. Verifica los logs de Cloud Run: `gcloud run services logs read quimera2025 --region us-east1`
2. Verifica la consola del navegador para errores específicos
3. Asegúrate de que la API de Generative Language está habilitada en `quimeraapp`

---

**Última Actualización**: $(date)
**Revisión Desplegada**: quimera2025-00006-xh7
**URL**: https://quimera2025-1034000853795.us-east1.run.app



