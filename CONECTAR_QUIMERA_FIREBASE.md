# 🌐 Conectar quimera.ai a Firebase Hosting

## 📋 Resumen

Este documento explica cómo conectar el dominio personalizado `quimera.ai` a Firebase Hosting para que tu aplicación sea accesible desde ese dominio.

## ✅ Prerrequisitos

1. **Firebase CLI instalado y autenticado**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Proyecto Firebase configurado**
   - Proyecto: `quimeraai`
   - Site ID: `quimeraai`

3. **Acceso al proveedor de DNS** (name.com)
   - URL: https://www.name.com/account/domain/details/quimera.ai#dns

## 🚀 Pasos de Configuración

### Paso 1: Ejecutar el Script de Configuración

```bash
./conectar-quimera-firebase.sh
```

Este script:
- ✅ Verifica la autenticación de Firebase
- ✅ Muestra el estado actual del DNS
- ✅ Proporciona instrucciones paso a paso
- ✅ Verifica el estado del deploy

### Paso 2: Agregar Dominio en Firebase Console

1. **Abre la consola de Firebase Hosting:**
   ```
   https://console.firebase.google.com/project/quimeraai/hosting/sites/quimeraai
   ```

2. **Haz clic en "Agregar un dominio personalizado"**
   - Botón azul en la sección "Dominios"

3. **Ingresa el dominio:**
   ```
   quimera.ai
   ```

4. **Haz clic en "Continuar"**

5. **Firebase te mostrará los registros DNS necesarios**
   - Anota estos registros, los necesitarás en el siguiente paso

### Paso 3: Configurar DNS en name.com

1. **Ve a la configuración DNS:**
   ```
   https://www.name.com/account/domain/details/quimera.ai#dns
   ```

2. **Configura los registros que Firebase te indicó**

   **Típicamente serán:**

   **Para el dominio raíz (@ o quimera.ai):**
   ```
   Tipo: A
   Host: @
   Valor: 151.101.1.195
   Valor: 151.101.65.195
   ```
   
   **O si Firebase indica CNAME:**
   ```
   Tipo: CNAME
   Host: @
   Valor: quimeraai.web.app
   ```

   **Para www (opcional):**
   ```
   Tipo: CNAME
   Host: www
   Valor: quimeraai.web.app
   ```

3. **IMPORTANTE:**
   - Si hay registros A antiguos (216.239.x.x), Firebase puede pedirte que los actualices
   - NO elimines registros sin verificar primero en Firebase Console
   - Firebase puede usar registros temporales para verificación

### Paso 4: Verificación y Espera

1. **Firebase verificará automáticamente el dominio**
   - Esto puede tardar **5-10 minutos**

2. **Una vez verificado, Firebase provisionará SSL automáticamente**
   - Esto puede tardar otros **15 minutos**

3. **Verifica el estado:**
   ```bash
   ./verificar-dominio.sh
   ```

   O manualmente:
   ```bash
   curl -sI https://quimera.ai | head -5
   dig quimera.ai A +short
   ```

## 🔍 Verificación

### Verificar que el dominio funciona:

```bash
# Verificar respuesta HTTP
curl -sI https://quimera.ai | head -5

# Verificar DNS
dig quimera.ai A +short

# Verificar versión (debe coincidir con Firebase)
curl -sL https://quimera.ai | grep -o 'assets/index-[^"]*\.js'
```

### Verificar en Firebase Console:

1. Ve a: https://console.firebase.google.com/project/quimeraai/hosting/sites/quimeraai
2. En la sección "Dominios" deberías ver:
   - ✅ `quimeraai.web.app` (siempre presente)
   - ✅ `quimera.ai` (debe aparecer como "Conectado" en verde)

## 🚀 Redesplegar (si es necesario)

Si necesitas actualizar la aplicación después de configurar el dominio:

```bash
# Construir la aplicación
npm run build

# Desplegar a Firebase Hosting
firebase deploy --only hosting --project=quimeraai
```

El dominio personalizado `quimera.ai` automáticamente servirá la última versión desplegada.

## 📊 URLs Finales

Una vez configurado, tendrás acceso desde:

- ✅ **Firebase Hosting**: https://quimeraai.web.app
- ✅ **Dominio personalizado**: https://quimera.ai
- ✅ **www (si configuraste)**: https://www.quimera.ai

Todos apuntan a la misma aplicación y se actualizan automáticamente con cada deploy.

## 🆘 Solución de Problemas

### El dominio no se verifica

1. **Verifica los registros DNS:**
   ```bash
   dig quimera.ai A +short
   ```
   Deben mostrar las IPs que Firebase indicó (típicamente 151.101.x.x)

2. **Espera más tiempo:**
   - La propagación DNS puede tardar hasta 24 horas
   - La verificación de Firebase puede tardar 5-10 minutos

3. **Verifica en Firebase Console:**
   - Ve a la sección de dominios
   - Revisa si hay mensajes de error

### El dominio muestra 404

1. **Verifica que el dominio esté "Conectado" en Firebase Console**
2. **Verifica que hayas hecho deploy:**
   ```bash
   firebase deploy --only hosting --project=quimeraai
   ```

### SSL no funciona

1. **Espera 15-30 minutos** después de la verificación del dominio
2. Firebase provisiona SSL automáticamente
3. Si después de 30 minutos no funciona, verifica en Firebase Console

### DNS apunta a otra ubicación

Si el DNS actualmente apunta a otra IP (como 199.36.158.100):

1. **Actualiza los registros A en name.com** con las IPs que Firebase indique
2. **Espera la propagación DNS** (5 minutos a 24 horas)
3. **Firebase verificará automáticamente** una vez que el DNS apunte correctamente

## 💡 Ventajas de Firebase Hosting

✅ **Caché inteligente** - Se actualiza automáticamente con cada deploy  
✅ **SSL gratuito** - Provisionado automáticamente  
✅ **CDN global** - Mejor performance mundial  
✅ **Integración con Cloud Functions** - Para las APIs de Gemini  
✅ **Sin costo por request** - A diferencia de Cloud Run  
✅ **Deploy automático** - El dominio se actualiza con cada deploy  

## 📝 Notas

- El dominio `quimera.ai` debe estar libre (sin mapeos en Cloud Run u otros servicios)
- Firebase Hosting puede usar diferentes IPs según la región
- Los registros DNS exactos los proporciona Firebase en la consola
- Una vez configurado, el dominio se mantiene automáticamente

---

**Última actualización**: Diciembre 2024


