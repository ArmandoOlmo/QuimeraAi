# 🔒 Guía de Seguridad - Restricciones de API Keys

## 📊 Estado Actual

### API Keys en tu Aplicación

| API Key | Estado | Ubicación | Acción Requerida |
|---------|--------|-----------|------------------|
| **Gemini API Key** | ✅ Segura | Variables de entorno | Configurar restricciones |
| **Firebase API Key** | ⚠️ Expuesta (normal) | `firebase.ts` hardcoded | Configurar restricciones |

---

## 🎯 Por qué configurar restricciones

### Sin Restricciones (Estado Actual)
- ❌ Cualquier persona puede usar tu API key desde cualquier sitio web
- ❌ Puede generar costos no autorizados
- ❌ Puede exceder límites de cuota
- ❌ Riesgo de abuso

### Con Restricciones (Estado Objetivo)
- ✅ Solo tu dominio puede usar las API keys
- ✅ Controlas exactamente qué APIs puede acceder cada key
- ✅ Proteges contra abuso y costos inesperados
- ✅ Cumples con mejores prácticas de seguridad

---

## 🚀 Configuración Rápida (5 minutos)

### Paso 1: Obtener tus URLs

Ejecuta este script para obtener las URLs que necesitas:

```bash
./configure-api-restrictions.sh
```

O manualmente obtén tu URL de Cloud Run:

```bash
gcloud run services describe quimeraai2025 --region us-east1 --format="value(status.url)"
```

### Paso 2: Configurar Gemini API Key

#### Opción A: Desde Google AI Studio (Recomendado)

1. **Abre Google AI Studio:**
   ```
   https://aistudio.google.com/app/apikey
   ```

2. **Encuentra tu API key** y haz click en el ícono de configuración (⚙️)

3. **Configura "Application restrictions":**
   - Selecciona: `HTTP referrers (web sites)`
   - Agrega estos referrers:
     ```
     https://*.run.app/*
     http://localhost/*
     http://localhost:5173/*
     ```

4. **Configura "API restrictions":**
   - Selecciona: `Restrict key`
   - Marca solo: `Generative Language API`

5. **Guarda los cambios**

#### Opción B: Desde Google Cloud Console

1. **Abre la Consola de Credentials:**
   ```
   https://console.cloud.google.com/apis/credentials?project=YOUR_PROJECT_ID
   ```

2. **Busca tu API key** (la que usas para Gemini)

3. **Click en el ícono de lápiz** (Edit)

4. **Sigue los mismos pasos** de configuración que en la Opción A

### Paso 3: Configurar Firebase API Key

1. **Abre la Consola de Credentials:**
   ```
   https://console.cloud.google.com/apis/credentials?project=YOUR_PROJECT_ID
   ```

2. **Busca "Browser key (auto created by Firebase)"**

3. **Click en el ícono de lápiz** (Edit)

4. **Configura "Application restrictions":**
   - Selecciona: `HTTP referrers (web sites)`
   - Agrega estos referrers:
     ```
     https://*.run.app/*
     http://localhost/*
     http://localhost:5173/*
     ```

5. **API restrictions:** 
   - Puedes dejar `Don't restrict key` (Firebase usa reglas de seguridad)
   - O restringir a solo las APIs de Firebase que uses

6. **Guarda los cambios**

---

## 📝 Formatos de URL Correctos

### ✅ CORRECTO

```
https://quimeraai2025-1034000853795.us-east1.run.app/*
https://*.run.app/*
http://localhost/*
http://localhost:5173/*
```

### ❌ INCORRECTO

```
quimeraai2025-1034000853795.us-east1.run.app      (falta https://)
https://quimeraai2025...run.app                   (falta /*)
localhost                                          (falta http:// y /*)
*.run.app                                          (falta https:// y /*)
```

---

## 🧪 Verificación después de configurar

### 1. Prueba en Producción

```bash
# Abre tu aplicación
open https://quimeraai2025-1034000853795.us-east1.run.app

# En DevTools Console, verifica:
# - No hay errores 403
# - No hay mensajes de "API key restricted"
# - Las funciones de AI funcionan correctamente
```

### 2. Prueba en Local

```bash
# Inicia el servidor local
npm run dev

# Abre http://localhost:5173
# Verifica que todo funciona igual
```

### 3. Verifica los Logs

```bash
# Ver logs de Cloud Run
gcloud run services logs read quimeraai2025 --region us-east1 --limit=50

# Busca errores relacionados con API keys
```

---

## 🔧 Troubleshooting

### Error: "API key not valid. Please pass a valid API key."

**Causa:** La restricción de dominio está bloqueando tu request

**Solución:**
1. Verifica que agregaste `https://*.run.app/*` a los referrers permitidos
2. Verifica que incluiste `http://localhost/*` para desarrollo local
3. Espera 1-2 minutos para que los cambios se propaguen

### Error: "This API project is not authorized to use this API"

**Causa:** La restricción de API está muy estricta

**Solución:**
1. Ve a la configuración de la API key
2. En "API restrictions", agrega:
   - `Generative Language API` (para Gemini)
   - `Firebase` APIs relevantes (para Firebase)

### La restricción no funciona

**Posibles causas:**
- Los cambios pueden tardar 1-5 minutos en propagarse
- Limpia el caché del navegador
- Verifica que usaste el formato correcto de URLs

---

## 🛡️ Mejores Prácticas

### 1. Monitoreo Regular

```bash
# Revisa el uso de tus APIs
gcloud services quotas list --service=generativelanguage.googleapis.com

# Revisa alertas de seguridad
gcloud projects get-iam-policy YOUR_PROJECT_ID
```

### 2. Rotación de Keys

- Crea una nueva Gemini API key cada 3-6 meses
- Actualiza las variables de entorno
- Redeploy la aplicación
- Elimina la key antigua

### 3. Separación de Entornos

- Usa API keys diferentes para:
  - Desarrollo (`localhost`)
  - Staging
  - Producción

### 4. Monitoreo de Costos

1. Configura alertas de presupuesto en Google Cloud
2. Revisa el uso mensualmente
3. Implementa rate limiting en tu aplicación

---

## 🚀 Siguiente Nivel de Seguridad (Opcional)

### Mover Gemini API al Backend

Para máxima seguridad, considera mover la Gemini API key al backend:

1. **Crear Firebase Cloud Function:**
   ```typescript
   // functions/src/gemini.ts
   import { onRequest } from 'firebase-functions/v2/https';
   import { GoogleGenAI } from '@google/genai';
   
   export const callGemini = onRequest(async (request, response) => {
     const apiKey = process.env.GEMINI_API_KEY; // Almacenada en Secret Manager
     const genAi = new GoogleGenAI({ apiKey });
     
     // Tu lógica aquí
     const result = await genAi.generateContent(request.body.prompt);
     response.json(result);
   });
   ```

2. **Tu frontend llama a esta función** en lugar de usar la API directamente

3. **Beneficios:**
   - ✅ API key nunca se expone al cliente
   - ✅ Puedes implementar autenticación
   - ✅ Puedes implementar rate limiting más robusto
   - ✅ Puedes auditar todos los requests

---

## 📞 Comandos Útiles

```bash
# Ejecutar script de configuración
./configure-api-restrictions.sh

# Ver proyecto actual
gcloud config get-value project

# Ver servicios habilitados
gcloud services list --enabled

# Ver URL de Cloud Run
gcloud run services describe quimeraai2025 --region us-east1 --format="value(status.url)"

# Abrir consola de credentials
open "https://console.cloud.google.com/apis/credentials"

# Ver logs de errores de API
gcloud run services logs read quimeraai2025 --region us-east1 | grep -i "api"
```

---

## ✅ Checklist de Seguridad

- [ ] Ejecuté `./configure-api-restrictions.sh` para obtener mis URLs
- [ ] Configuré restricciones de dominio para Gemini API Key
- [ ] Configuré restricciones de API para Gemini API Key (solo Generative Language API)
- [ ] Configuré restricciones de dominio para Firebase API Key
- [ ] Probé mi aplicación en producción - funciona ✅
- [ ] Probé mi aplicación en local - funciona ✅
- [ ] No hay errores 403 en la consola del navegador
- [ ] Configuré alertas de presupuesto en Google Cloud
- [ ] Documenté dónde están mis API keys

---

## 🎉 ¡Listo!

Tus API keys ahora están protegidas. Tu aplicación solo funcionará en:
- ✅ Tu dominio de Cloud Run
- ✅ Localhost (desarrollo)
- ❌ Ningún otro sitio web

**Tiempo estimado:** 5-10 minutos
**Nivel de seguridad:** 🛡️🛡️🛡️🛡️ (4/5)

Para llegar a 5/5, considera mover la Gemini API al backend con Cloud Functions.



