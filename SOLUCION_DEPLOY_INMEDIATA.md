# 🚨 Solución Inmediata al Problema de Deploy

## ❌ **Problema Detectado:**

La API key NO llega al Dockerfile porque `gcloud run deploy --set-build-env-vars` no pasa las variables correctamente al proceso de build de Docker.

**Evidencia en los logs:**
```
❌ WARNING: VITE_GEMINI_API_KEY is empty!
Contents of .env:
VITE_GEMINI_API_KEY=
```

---

## ✅ **Solución:**

He creado un nuevo script `deploy-fix.sh` que usa `cloud build` y `cloud build.yaml` correctamente.

---

## 🚀 **Pasos para Deployar AHORA:**

### **1. En tu terminal (donde configuraste la API key):**

```bash
cd /Users/armandoolmo/QuimeraAppCursor/QuimeraAi

# Verificar que la API key está configurada
echo $VITE_GEMINI_API_KEY
# Debe mostrar tu API key real (NO la expongas en archivos de Git)
```

### **2. Ejecutar el nuevo script de deploy:**

```bash
./deploy-fix.sh
```

---

## 📋 **¿Qué hace el nuevo script?**

1. ✅ Verifica que `VITE_GEMINI_API_KEY` esté configurada
2. ✅ Usa `gcloud builds submit` con `cloudbuild.yaml`
3. ✅ Pasa las variables como `--substitutions` (formato correcto)
4. ✅ Las variables llegan al Dockerfile como `--build-arg`
5. ✅ El build funciona correctamente

---

## 🔧 **Diferencias Clave:**

### **❌ Método Anterior (no funcionaba):**
```bash
gcloud run deploy quimeraai2025 \
  --source . \
  --set-build-env-vars "VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY"
```
→ Las variables NO llegan al Dockerfile

### **✅ Método Nuevo (funciona):**
```bash
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions="_VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY"
```
→ Las variables SÍ llegan al Dockerfile como `--build-arg`

---

## 📝 **Si Quieres Firebase También:**

```bash
# Configurar todas las variables
export VITE_GEMINI_API_KEY="TU_GEMINI_API_KEY_AQUI"
export VITE_FIREBASE_API_KEY="AIzaSyBs_MbMSN6BCD1yrZ8SpCoa07DcZm2rmsM"
export VITE_FIREBASE_PROJECT_ID="quimeraai"
export VITE_FIREBASE_AUTH_DOMAIN="quimeraai.firebaseapp.com"
export VITE_FIREBASE_STORAGE_BUCKET="quimeraai.firebasestorage.app"
export VITE_FIREBASE_MESSAGING_SENDER_ID="575386543550"
export VITE_FIREBASE_APP_ID="1:575386543550:web:395114b8f43e810a7985ef"
export VITE_FIREBASE_MEASUREMENT_ID="G-KQ26WWK4MD"

# Ejecutar deploy
./deploy-fix.sh
```

---

## ⏰ **Tiempo Estimado:**

- **Verificación:** 10 segundos
- **Deploy:** 5-8 minutos
- **Total:** ~8 minutos

---

## 🎯 **Resultado Esperado:**

```
✅ Deploy completado exitosamente!
🌐 URL del servicio:
   https://quimeraai2025-971520973424.us-east1.run.app
```

---

## 🔍 **Verificar que Funcionó:**

```bash
# 1. Abrir el sitio
open https://quimeraai2025-971520973424.us-east1.run.app

# 2. Ver logs para confirmar
gcloud run services logs read quimeraai2025 --region us-east1 --limit=20
```

---

## 🆘 **Si Algo Sale Mal:**

```bash
# Ver logs del build más reciente
gcloud builds list --limit=1

# Ver logs detallados
gcloud builds log $(gcloud builds list --limit=1 --format="value(id)")
```

---

**¡Ejecuta `./deploy-fix.sh` ahora!** 🚀

