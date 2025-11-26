# 🚀 Guía Maestra de Despliegue: QuimeraAI

Esta guía contiene las instrucciones completas y actualizadas para desplegar QuimeraAI en Google Cloud Platform (Cloud Run + Cloud Functions).

## 📋 Prerrequisitos

Asegúrate de tener instaladas las siguientes herramientas:

1.  **Google Cloud CLI (`gcloud`)**: [Instalar](https://cloud.google.com/sdk/docs/install)
2.  **Firebase CLI**: `npm install -g firebase-tools`
3.  **Node.js**: v18 o superior

## 🔑 1. Configuración Inicial

### Autenticación
```bash
# Login en Google Cloud
gcloud auth login
gcloud config set project quimeraapp

# Login en Firebase
firebase login
firebase use quimeraai
```

### Variables de Entorno
Asegúrate de tener tu archivo `.env.local` configurado con las claves necesarias. Si no lo tienes, crea uno basado en `.env.example`.

**Variables críticas:**
- `VITE_GEMINI_API_KEY`: Tu API Key de Google AI Studio.
- `VITE_GEMINI_PROXY_URL`: La URL de tus Cloud Functions (se obtiene en el paso 2).

## ☁️ 2. Despliegue del Backend (Cloud Functions)

El backend actúa como proxy seguro para la API de Gemini.

1.  Ejecuta el script de despliegue:
    ```bash
    ./deploy-cloud-functions.sh
    ```
2.  Sigue las instrucciones en pantalla.
3.  Al finalizar, el script te mostrará la **URL del Proxy** (ej. `https://us-central1-quimeraai.cloudfunctions.net/gemini`).
4.  **IMPORTANTE:** Copia esta URL y actualiza `VITE_GEMINI_PROXY_URL` en tu archivo `.env.local`.

## 🚢 3. Despliegue del Frontend (Cloud Run)

La aplicación web se despliega en Cloud Run usando Docker.

1.  Asegúrate de que `VITE_GEMINI_API_KEY` esté configurada en tu entorno actual o en `.env.local`.
    ```bash
    export VITE_GEMINI_API_KEY="AIza..."
    ```
2.  Ejecuta el script de despliegue:
    ```bash
    ./deploy.sh
    ```
    Este script:
    *   Construye la imagen Docker usando Cloud Build.
    *   Inyecta las variables de entorno de forma segura durante el build.
    *   Despliega la imagen en Cloud Run.

## 🌐 4. Configuración de Dominio

Para que tu aplicación sea accesible en `quimera.ai`:

1.  Revisa el archivo `CONFIGURACION_DNS.md` generado en la raíz del proyecto.
2.  Configura los registros DNS (A y CNAME) en tu proveedor de dominio.
3.  Google Cloud Run gestionará automáticamente el certificado SSL.

## 🧪 5. Verificación

1.  Abre tu dominio (`https://quimera.ai` o la URL de Cloud Run).
2.  Abre la consola del desarrollador (F12).
3.  Verifica que no haya errores de "API Key missing".
4.  Prueba el chat con un mensaje de prueba.

## 🆘 Solución de Problemas Comunes

*   **Error "API Key required"**: Significa que la variable `VITE_GEMINI_API_KEY` no se pasó correctamente durante el build. Asegúrate de exportarla antes de ejecutar `./deploy.sh`.
*   **Error 404/500 en el chat**: Verifica que `VITE_GEMINI_PROXY_URL` apunte a la URL correcta de tus Cloud Functions y que las funciones estén desplegadas.
*   **Dominio no funciona**: La propagación de DNS puede tardar hasta 24 horas. Verifica tus registros con `dig quimera.ai`.
