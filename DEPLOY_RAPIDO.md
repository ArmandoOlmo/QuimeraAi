# 🚀 Deploy Rápido - QuimeraAI

## ⚡ Solución en 3 Pasos

### 1. Configurar API Key

```bash
export VITE_GEMINI_API_KEY="tu_api_key_de_google_aqui"
```

**¿No tienes tu API key?** → https://aistudio.google.com/app/apikey

### 2. Verificar

```bash
./verify-deployment.sh
```

Si todo está ✅ verde, continúa al paso 3.

### 3. Desplegar

```bash
./deploy.sh
```

---

## 🔧 Si hay problemas

Lee la **[GUÍA COMPLETA](./SOLUCION_API_GOOGLE_DEPLOY.md)** para troubleshooting detallado.

---

## 📝 Variables Opcionales (Firebase)

Si quieres configurar Firebase también (recomendado):

```bash
export VITE_FIREBASE_API_KEY="AIza..."
export VITE_FIREBASE_AUTH_DOMAIN="quimeraai.firebaseapp.com"
export VITE_FIREBASE_PROJECT_ID="quimeraai"
export VITE_FIREBASE_STORAGE_BUCKET="quimeraai.firebasestorage.app"
export VITE_FIREBASE_MESSAGING_SENDER_ID="575386543550"
export VITE_FIREBASE_APP_ID="1:575386543550:web:..."
export VITE_FIREBASE_MEASUREMENT_ID="G-..."
```

---

## ✅ ¿Funcionó?

Después del deploy, abre tu sitio y:
1. Presiona F12 (consola del navegador)
2. Busca: "✅ API Key encontrada"
3. El asistente debe estar "Online" 🟢

---

**Servicio deployado:** `quimeraai2025` en `us-east1`

**🆘 ¿Necesitas ayuda?** Lee [SOLUCION_API_GOOGLE_DEPLOY.md](./SOLUCION_API_GOOGLE_DEPLOY.md)

