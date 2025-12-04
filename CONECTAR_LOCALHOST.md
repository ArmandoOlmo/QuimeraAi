# 🖥️ Conectar localhost a Firebase

## ✅ Estado Actual

- ✅ `.env.local` existe y está configurado
- ✅ `authDomain`: `quimeraai.firebaseapp.com`
- ✅ Servidor configurado en puerto `3000`
- ⏳ Pendiente: Configurar dominios autorizados en Firebase

## 🚀 Inicio Rápido

### 1. Ejecutar el script de configuración

```bash
./configurar-localhost.sh
```

Este script verifica:
- ✅ Archivo `.env.local`
- ✅ Variables de Firebase
- ✅ Configuración del servidor
- ✅ Estado del servidor

### 2. Configurar Firebase Authentication

**IMPORTANTE**: Para que localhost funcione, debes agregar dominios autorizados:

1. **Abre Firebase Console:**
   ```
   https://console.firebase.google.com/project/quimeraai/authentication/settings
   ```

2. **Ve a "Dominios autorizados"**

3. **Agrega los siguientes dominios:**
   - `localhost`
   - `127.0.0.1`
   - `localhost:3000`
   - `localhost:5173`

4. **Guarda los cambios**

### 3. Configurar Restricciones de API (Gemini)

Si usas la API de Gemini, también necesitas permitir localhost:

**Opción A: Usar el script automático**
```bash
./configure-api-restrictions.sh
```

**Opción B: Configuración manual**

1. Ve a Google Cloud Console:
   ```
   https://console.cloud.google.com/apis/credentials?project=quimeraai
   ```

2. Selecciona tu API Key

3. En "Restricciones de aplicación", agrega:
   - `http://localhost/*`
   - `http://localhost:3000/*`
   - `http://localhost:5173/*`

4. Guarda los cambios

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en:
- **http://localhost:3000**

## 🔍 Verificación

### Verificar que todo funciona:

1. **Inicia el servidor:**
   ```bash
   npm run dev
   ```

2. **Abre en el navegador:**
   ```
   http://localhost:3000
   ```

3. **Prueba la autenticación:**
   - Intenta iniciar sesión con Google
   - Debe funcionar sin errores de CORS

4. **Verifica la consola del navegador:**
   - No debe haber errores de Firebase
   - No debe haber errores de CORS

## 📋 Checklist de Configuración

- [ ] `.env.local` existe y tiene todas las variables de Firebase
- [ ] `VITE_FIREBASE_AUTH_DOMAIN=quimeraai.firebaseapp.com` en `.env.local`
- [ ] Dominios autorizados configurados en Firebase Authentication
- [ ] Restricciones de API configuradas (si usas Gemini)
- [ ] Servidor de desarrollo iniciado (`npm run dev`)
- [ ] Aplicación carga correctamente en `http://localhost:3000`
- [ ] Autenticación funciona sin errores

## 🆘 Solución de Problemas

### Error: "auth/unauthorized-domain"

**Causa**: localhost no está en los dominios autorizados de Firebase.

**Solución**:
1. Ve a Firebase Console → Authentication → Settings
2. Agrega `localhost` y `127.0.0.1` a dominios autorizados
3. Recarga la aplicación

### Error: "CORS policy"

**Causa**: Restricciones de API no permiten localhost.

**Solución**:
1. Ve a Google Cloud Console → APIs & Services → Credentials
2. Selecciona tu API Key
3. Agrega `http://localhost/*` a restricciones de aplicación

### Error: "Firebase configuration is incomplete"

**Causa**: Faltan variables en `.env.local`.

**Solución**:
1. Verifica que `.env.local` existe
2. Copia `ENV_EXAMPLE.txt` a `.env.local` si no existe
3. Completa todas las variables con `VITE_` prefix
4. Reinicia el servidor de desarrollo

### El servidor no inicia

**Solución**:
```bash
# Verificar que el puerto no esté en uso
lsof -i :3000

# Si está en uso, mata el proceso o cambia el puerto en vite.config.ts
```

### Firebase Analytics no funciona en localhost

**Nota**: Firebase Analytics puede no funcionar correctamente en localhost. Esto es normal y no afecta el desarrollo.

## 📝 Variables de Entorno Requeridas

Asegúrate de tener estas variables en `.env.local`:

```env
VITE_FIREBASE_API_KEY=tu-api-key
VITE_FIREBASE_AUTH_DOMAIN=quimeraai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=quimeraai
VITE_FIREBASE_STORAGE_BUCKET=quimeraai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
VITE_FIREBASE_APP_ID=tu-app-id
VITE_FIREBASE_MEASUREMENT_ID=tu-measurement-id
VITE_GEMINI_API_KEY=tu-gemini-api-key (opcional)
```

## 🎯 URLs Importantes

- **Aplicación local**: http://localhost:3000
- **Firebase Console**: https://console.firebase.google.com/project/quimeraai
- **Firebase Auth Settings**: https://console.firebase.google.com/project/quimeraai/authentication/settings
- **Google Cloud Console**: https://console.cloud.google.com/apis/credentials?project=quimeraai

## 💡 Tips

1. **Usa el script de configuración** antes de empezar:
   ```bash
   ./configurar-localhost.sh
   ```

2. **Verifica los logs del servidor** para ver errores de configuración

3. **Revisa la consola del navegador** (F12) para errores de Firebase

4. **Si cambias `.env.local`**, reinicia el servidor de desarrollo

5. **Mantén los dominios autorizados actualizados** cuando cambies de puerto

---

**Última actualización**: Diciembre 2024







