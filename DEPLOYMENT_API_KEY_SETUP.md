# 🔑 Configuración de API Key de Google para Deployment

Este documento explica cómo configurar la API key de Google Gemini para que funcione correctamente en tu aplicación desplegada.

## ⚠️ Problema Común

Si ves el mensaje **"API key required"** en el widget de Quimera Assistant después del deployment, significa que la API key no está configurada correctamente en tu plataforma de deployment.

## 📋 Pasos para Configurar la API Key

### 1. Obtener tu API Key de Google

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crea una nueva API key o usa una existente
3. Copia la API key (comienza con `AIza...`)

### 2. Configurar en tu Plataforma de Deployment

**IMPORTANTE:** La variable de entorno **DEBE** tener el prefijo `VITE_` para que Vite la exponga al cliente durante el build.

#### Para Vercel:

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Ve a **Settings** → **Environment Variables**
3. Agrega una nueva variable:
   - **Name:** `VITE_GEMINI_API_KEY`
   - **Value:** `tu_api_key_aqui` (pega tu API key)
   - **Environment:** Selecciona Production, Preview, y Development
4. Haz clic en **Save**
5. **IMPORTANTE:** Ve a **Deployments** y haz clic en **Redeploy** para que los cambios surtan efecto

#### Para Netlify:

1. Ve a tu sitio en [Netlify Dashboard](https://app.netlify.com)
2. Ve a **Site settings** → **Environment variables**
3. Haz clic en **Add a variable**
4. Agrega:
   - **Key:** `VITE_GEMINI_API_KEY`
   - **Value:** `tu_api_key_aqui` (pega tu API key)
   - **Scopes:** Selecciona todos los ambientes necesarios
5. Haz clic en **Save**
6. Ve a **Deployments** y haz clic en **Trigger deploy** → **Clear cache and deploy site**

#### Para Firebase Hosting:

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Ve a **Functions** → **Config**
4. O configura la variable antes del build:
   ```bash
   export VITE_GEMINI_API_KEY=tu_api_key_aqui
   npm run build
   firebase deploy
   ```

#### Para Docker:

Agrega la variable al Dockerfile o docker-compose.yml:

```dockerfile
# En Dockerfile
ENV VITE_GEMINI_API_KEY=tu_api_key_aqui

# O en docker-compose.yml
environment:
  - VITE_GEMINI_API_KEY=tu_api_key_aqui
```

## 🔍 Verificación

Después de configurar la variable y redesplegar:

1. Abre tu aplicación desplegada
2. Abre la consola del navegador (F12)
3. Ejecuta en la consola:
   ```javascript
   console.log('API Key:', typeof process !== 'undefined' ? process.env.API_KEY : 'process no disponible');
   ```
4. Deberías ver tu API key (o al menos confirmar que no es `null` o `undefined`)
5. El widget de Quimera Assistant debería mostrar **"Online"** en lugar de **"API key required"**

## 🛠️ Troubleshooting

### La API key aún no funciona después de configurarla:

1. **Verifica que la variable tenga el prefijo `VITE_`**
   - ✅ Correcto: `VITE_GEMINI_API_KEY`
   - ❌ Incorrecto: `GEMINI_API_KEY` o `API_KEY`

2. **Asegúrate de haber redesplegado después de agregar la variable**
   - En Vercel: Ve a Deployments → Redeploy
   - En Netlify: Trigger deploy → Clear cache and deploy site

3. **Verifica que el build incluya la variable**
   - Revisa los logs de build en tu plataforma de deployment
   - Busca mensajes como "✅ Google API Key encontrada" (solo en modo desarrollo)

4. **Limpia la caché del navegador**
   - Presiona Ctrl+Shift+R (o Cmd+Shift+R en Mac) para hacer un hard refresh

5. **Verifica que la API key sea válida**
   - Asegúrate de que la API key no haya expirado
   - Verifica que tenga los permisos correctos en Google AI Studio

## 📝 Variables de Entorno Soportadas

El código busca la API key en este orden:

1. `VITE_GEMINI_API_KEY` (recomendado)
2. `VITE_GOOGLE_AI_API_KEY`
3. `GEMINI_API_KEY` (solo para build, requiere prefijo VITE_ en cliente)
4. `GOOGLE_AI_API_KEY` (solo para build, requiere prefijo VITE_ en cliente)

**Para deployment, usa siempre una variable con prefijo `VITE_`.**

## 🔐 Seguridad

- **NUNCA** commitees tu archivo `.env` con la API key al repositorio
- Las API keys con prefijo `VITE_` son visibles en el código del cliente (esto es normal para Vite)
- Considera usar restricciones de dominio en Google AI Studio para limitar el uso de tu API key
- Para aplicaciones críticas, considera usar un backend proxy para la API key

