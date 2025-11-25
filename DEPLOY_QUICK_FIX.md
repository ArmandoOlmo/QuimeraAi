# 🚀 Solución Rápida de Despliegue - QuimeraAI

## ❌ Problema Identificado

El comando de despliegue estaba usando la sintaxis incorrecta:
```bash
# ❌ INCORRECTO (sintaxis de Docker)
--build-arg VITE_GEMINI_API_KEY=...
```

## ✅ Solución

Usar la sintaxis correcta de `gcloud run deploy`:
```bash
# ✅ CORRECTO (sintaxis de gcloud)
--set-build-env-vars VITE_GEMINI_API_KEY=...
```

## 🔧 Cómo Desplegar Ahora

### Opción 1: Script Automatizado (Recomendado)

```bash
# 1. Configura tu API key de Gemini
export VITE_GEMINI_API_KEY="TU_GEMINI_API_KEY_AQUI"

# 2. Ejecuta el script de deploy
./deploy.sh
```

### Opción 2: Comando Manual

```bash
gcloud run deploy quimera2025 \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --platform managed \
  --set-build-env-vars "VITE_GEMINI_API_KEY=TU_GEMINI_API_KEY_AQUI"
```

### Opción 3: Con todas las variables de Firebase

```bash
export VITE_GEMINI_API_KEY="tu_gemini_api_key"
export VITE_FIREBASE_API_KEY="tu_firebase_api_key"
export VITE_FIREBASE_AUTH_DOMAIN="tu-app.firebaseapp.com"
export VITE_FIREBASE_PROJECT_ID="tu-project-id"
export VITE_FIREBASE_STORAGE_BUCKET="tu-app.appspot.com"
export VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
export VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
export VITE_FIREBASE_MEASUREMENT_ID="G-XXXXXXXXXX"

# Luego ejecuta
./deploy.sh
```

## 📝 Archivos Actualizados

- ✅ `deploy.sh` - Script corregido
- ✅ `GOOGLE_CLOUD_DEPLOYMENT.md` - Documentación actualizada
- ✅ `Dockerfile` - Ya estaba correcto

## 🎯 Próximos Pasos

1. **Ejecuta el comando de despliegue** usando una de las opciones de arriba
2. **Espera a que se complete** el build (puede tomar 3-5 minutos)
3. **Verifica la URL** que te dará al final del despliegue
4. **Abre la app** en tu navegador y verifica que funcione

## 🔍 Verificar que Funciona

Una vez desplegado, tu app estará en:
```
https://quimera2025-[PROJECT-NUMBER].us-east1.run.app
```

Para obtener la URL exacta:
```bash
gcloud run services describe quimera2025 --region us-east1 --format="value(status.url)"
```

## ⚠️ Notas Importantes

- **API Key de Gemini**: Es REQUERIDA para que la app funcione
- **Variables de Firebase**: Son opcionales (hay fallbacks en el código)
- **Región**: Actualmente configurada como `us-east1`
- **Permisos**: La app está configurada como pública (`--allow-unauthenticated`)

## 🐛 Si algo Falla

Ver logs en tiempo real:
```bash
gcloud run services logs read quimera2025 --region us-east1
```

Ver el estado del servicio:
```bash
gcloud run services describe quimera2025 --region us-east1
```

---

**¡Todo corregido!** Ahora puedes desplegar sin problemas.

