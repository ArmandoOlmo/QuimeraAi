# 🔧 Solución: Chatbot no funciona en Chrome

## 🎯 Problema
El chatbot funciona en el Browser de Cursor pero no en Chrome.

## 🔍 Causas Posibles

### 1. **Caché de Chrome** (más probable)
Chrome puede tener cacheada la versión antigua del código que llamaba directamente a la API.

**Solución:**
```
1. Abre Chrome
2. Presiona Cmd + Shift + Delete (Mac) o Ctrl + Shift + Delete (Windows)
3. Selecciona:
   - Imágenes y archivos en caché
   - Período de tiempo: "Desde siempre"
4. Click en "Borrar datos"
5. Recarga quimera.ai con Cmd + Shift + R (Mac) o Ctrl + Shift + R (Windows)
```

### 2. **Service Worker Antiguo**
El Service Worker puede estar sirviendo la versión antigua.

**Solución:**
```
1. Abre Chrome DevTools (F12 o Cmd + Opt + I)
2. Ve a la pestaña "Application"
3. En el menú izquierdo, click en "Service Workers"
4. Click en "Unregister" en todos los service workers de quimera.ai
5. Recarga la página
```

### 3. **Storage/IndexedDB**
Datos antiguos en el almacenamiento local.

**Solución:**
```
1. Abre Chrome DevTools (F12)
2. Ve a "Application" → "Storage"
3. Click en "Clear site data"
4. Marca todas las opciones
5. Click "Clear site data"
6. Recarga la página
```

## 🧪 Test Rápido

### Verificar si el problema persiste:

1. **Modo Incógnito:**
   ```
   1. Abre Chrome en modo incógnito (Cmd + Shift + N)
   2. Ve a https://quimera.ai
   3. Prueba el chatbot
   4. Si funciona → Es problema de caché
   5. Si no funciona → Es problema del código
   ```

2. **Test de Cloud Functions:**
   ```bash
   # En terminal:
   curl -X POST https://us-central1-quimeraai.cloudfunctions.net/gemini-generate \
     -H "Content-Type: application/json" \
     -d '{"projectId":"test","prompt":"Hola","model":"gemini-1.5-flash"}'
   ```
   
   Debería retornar JSON, NO HTML.

## 📊 Diagnóstico con DevTools

### Ver errores en Console:

1. Abre Chrome DevTools (F12)
2. Ve a la pestaña "Console"
3. Busca errores relacionados con:
   - "Unexpected token '<'"
   - "JSON.parse"
   - "gemini"
   - "generateContent"

### Ver requests en Network:

1. Abre Chrome DevTools (F12)
2. Ve a "Network"
3. Filtra por "gemini"
4. Envía un mensaje en el chatbot
5. Click en la request de "gemini-generate"
6. Ve a "Preview" o "Response"
7. Verifica:
   - ✅ Si es JSON → Todo bien
   - ❌ Si es HTML → Hay un problema

## ✅ Solución Definitiva

### Opción A: Limpiar todo (recomendada)

```bash
# En Chrome:
1. chrome://settings/clearBrowserData
2. Seleccionar "Avanzado"
3. Marcar TODO
4. Período: "Desde siempre"
5. Borrar datos
6. Reiniciar Chrome
7. Ir a quimera.ai
```

### Opción B: Forzar nuevo deploy

Si el problema persiste después de limpiar caché:

```bash
cd /Users/armandoolmo/QuimeraAppCursor/QuimeraAi

# 1. Verificar que el código esté actualizado
cat components/chat/ChatCore.tsx | grep -A 5 "isProxyMode()"

# 2. Nuevo build
npm run build

# 3. Nuevo deploy
firebase deploy --only hosting --project=quimeraai

# 4. Esperar 2-3 minutos

# 5. Verificar versión
curl -sL https://quimera.ai | grep -o 'assets/index-[^"]*\.js'
```

## 🚨 Si Nada Funciona

Puede ser que las Cloud Functions necesiten ser re-deployadas:

```bash
cd /Users/armandoolmo/QuimeraAppCursor/QuimeraAi

# Verify functions are running
firebase functions:list --project=quimeraai

# If needed, redeploy functions
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions --project=quimeraai
```

## 📞 Información de Debug

Para reportar el problema, incluye:

```javascript
// Ejecuta esto en Chrome Console (F12):
console.log({
    hostname: window.location.hostname,
    userAgent: navigator.userAgent,
    version: document.querySelector('script[src*="index-"]')?.src || 'not found'
});

// Y envía un mensaje en el chatbot para ver el error
```

---

**Última actualización:** 24 de noviembre 2025
**Versión deployada:** index-CoZdkv5s.js

