# 🌐 Configurar quimera.ai como Dominio Principal

**Fecha:** 29 de Diciembre 2025  
**Objetivo:** Hacer que `quimera.ai` sea el dominio predeterminado en Firebase y aparezca durante el login con Google

---

## 📋 Resumen de Pasos

| Paso | Descripción | Tiempo | Requiere |
|------|-------------|--------|----------|
| 1 | Agregar dominio en Firebase Hosting | 5 min | Consola Firebase |
| 2 | Configurar DNS en Cloudflare | 10 min | Panel Cloudflare |
| 3 | Autorizar dominio en Authentication | 2 min | Consola Firebase |
| 4 | Actualizar OAuth en Google Cloud | 5 min | Consola GCP |
| 5 | Cambiar authDomain en el código | 2 min | Variables de entorno |
| 6 | Desplegar | 5-10 min | Terminal |

---

## 🔧 Paso 1: Agregar Dominio en Firebase Hosting

1. Ve a [Firebase Console](https://console.firebase.google.com/project/quimeraai/hosting)
2. Haz clic en **"Add custom domain"** (Agregar dominio personalizado)
3. Ingresa: `quimera.ai`
4. Firebase te mostrará registros DNS que debes configurar:

```
Tipo: A
Nombre: @
Valor: 151.101.1.195 (o el IP que Firebase te indique)

Tipo: A  
Nombre: @
Valor: 151.101.65.195 (segundo IP si lo hay)
```

5. También agrega el subdominio `www`:
   - Dominio: `www.quimera.ai`
   - Configurar como redirect a `quimera.ai`

---

## 🌐 Paso 2: Configurar DNS en Cloudflare

Si tu dominio está en Cloudflare:

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Selecciona el dominio `quimera.ai`
3. Ve a **DNS** → **Records**
4. Agrega los registros que Firebase te proporcionó:

```
Tipo: A
Nombre: @
Contenido: [IP de Firebase]
Proxy: OFF (nube gris) ← IMPORTANTE para verificación inicial
TTL: Auto

Tipo: CNAME
Nombre: www
Contenido: quimera.ai
Proxy: ON (nube naranja)
TTL: Auto
```

⚠️ **IMPORTANTE:** Durante la verificación inicial, desactiva el proxy de Cloudflare (nube gris) para los registros A. Una vez verificado, puedes activarlo.

---

## 🔐 Paso 3: Autorizar Dominio en Firebase Authentication

1. Ve a [Firebase Auth Settings](https://console.firebase.google.com/project/quimeraai/authentication/settings)
2. En la pestaña **"Authorized domains"**
3. Haz clic en **"Add domain"**
4. Agrega:
   - `quimera.ai`
   - `www.quimera.ai` (opcional)

---

## 🔑 Paso 4: Actualizar OAuth en Google Cloud Console

1. Ve a [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials?project=quimeraai)
2. Edita tu **OAuth 2.0 Client ID** (tipo Web application)
3. En **"Authorized JavaScript origins"**, agrega:
   ```
   https://quimera.ai
   https://www.quimera.ai
   ```
4. En **"Authorized redirect URIs"**, agrega:
   ```
   https://quimera.ai/__/auth/handler
   https://www.quimera.ai/__/auth/handler
   ```
5. Guarda los cambios

---

## ⚙️ Paso 5: Cambiar authDomain en el Código

### Opción A: Variables de Entorno Local (.env)

Crea o edita el archivo `.env` en la raíz del proyecto:

```bash
VITE_FIREBASE_AUTH_DOMAIN=quimera.ai
```

### Opción B: Cloud Build (Producción)

Actualiza las substitutions en Cloud Build:

```bash
# En Google Cloud Console > Cloud Build > Triggers
# Edita el trigger y cambia:
_VITE_FIREBASE_AUTH_DOMAIN = quimera.ai
```

### Opción C: Firebase Functions Config

```bash
firebase functions:config:set app.auth_domain="quimera.ai"
```

---

## 🚀 Paso 6: Desplegar

### Desplegar Firebase Hosting

```bash
# Construir el proyecto
npm run build

# Desplegar hosting
firebase deploy --only hosting
```

### Desplegar con Cloud Build (SSR)

```bash
gcloud builds submit --config=cloudbuild-ssr.yaml \
  --substitutions=_VITE_FIREBASE_AUTH_DOMAIN="quimera.ai"
```

---

## ✅ Verificación

### 1. Verificar DNS
```bash
# Verificar registros A
dig quimera.ai A

# Verificar que apunta a Firebase
nslookup quimera.ai
```

### 2. Verificar SSL
Visita `https://quimera.ai` y verifica el certificado SSL (candado verde).

### 3. Verificar Login con Google
1. Ve a `https://quimera.ai`
2. Haz clic en "Iniciar sesión con Google"
3. Verifica que la pantalla de consentimiento muestre `quimera.ai` (no `quimeraai.firebaseapp.com`)

---

## 🔍 Troubleshooting

### Error: "This domain is not authorized"
- Verifica que `quimera.ai` está en la lista de dominios autorizados en Firebase Auth
- Verifica que las URIs de redirect en Google Cloud son correctas

### Error: SSL/Certificate issues
- Espera 24-48 horas para que Firebase emita el certificado SSL
- Verifica que el proxy de Cloudflare está desactivado durante la verificación

### Error: "redirect_uri_mismatch"
- Verifica que `https://quimera.ai/__/auth/handler` está en las URIs autorizadas de Google Cloud
- Asegúrate de usar HTTPS, no HTTP

### Login sigue mostrando firebaseapp.com
- Verifica que `VITE_FIREBASE_AUTH_DOMAIN=quimera.ai` está configurado
- Limpia la caché del navegador
- Haz un nuevo build y deploy

---

## 📊 Estado Final Esperado

Después de completar todos los pasos:

| Verificación | Estado |
|--------------|--------|
| `https://quimera.ai` carga correctamente | ✅ |
| Certificado SSL válido | ✅ |
| Login con Google funciona | ✅ |
| Pantalla de Google muestra "quimera.ai" | ✅ |
| Redirect después del login funciona | ✅ |

---

## 🕐 Tiempos de Propagación

- **DNS:** 5 minutos a 48 horas
- **SSL Certificate:** 15 minutos a 24 horas  
- **Google OAuth:** Inmediato después de guardar

---

**Última actualización:** 29 Diciembre 2025


