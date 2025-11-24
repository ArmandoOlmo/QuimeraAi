# Solución: API de Gemini no funciona en Google Cloud

## Problema
La API de Gemini no está funcionando en tu aplicación desplegada en Cloud Run.

## Causas Posibles
1. La API de Generative Language no está habilitada en tu proyecto de Google Cloud
2. La API Key no tiene los permisos correctos
3. La API Key no se está inyectando correctamente en el build

## Solución Paso a Paso

### Paso 1: Habilitar la API de Generative Language

Ejecuta este comando para habilitar la API:

```bash
gcloud services enable generativelanguage.googleapis.com
```

O visita: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com

### Paso 2: Verificar que tu API Key es válida

1. Ve a Google AI Studio: https://aistudio.google.com/app/apikey
2. Verifica que tu API Key existe: `AIzaSyCNgO6QWhKy2B00d4uu-nAagPow3RnQRNg`
3. Si no existe o está expirada, crea una nueva

**IMPORTANTE**: Las API Keys de Gemini se crean en Google AI Studio, NO en Google Cloud Console.

### Paso 3: Asegúrate de que la API Key esté en el archivo .env.local

Crea o edita tu archivo `.env.local` con:

```env
VITE_GEMINI_API_KEY=AIzaSyCNgO6QWhKy2B00d4uu-nAagPow3RnQRNg
```

### Paso 4: Prueba localmente primero

Antes de volver a desplegar, prueba localmente:

```bash
npm run dev
```

Intenta usar alguna funcionalidad de AI en la aplicación. Si funciona localmente pero no en Cloud Run, el problema es con el deploy.

### Paso 5: Vuelve a desplegar a Cloud Run con la API Key correcta

```bash
gcloud run deploy quimera2025 \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --set-build-env-vars VITE_GEMINI_API_KEY=AIzaSyCNgO6QWhKy2B00d4uu-nAagPow3RnQRNg
```

## Verificación de Errores Comunes

### Error: "API key not valid"
- Tu API key no existe o está mal escrita
- Solución: Crea una nueva en https://aistudio.google.com/app/apikey

### Error: "Requested entity was not found"
- La API no está habilitada en tu proyecto
- Solución: Ejecuta `gcloud services enable generativelanguage.googleapis.com`

### Error: "Quota exceeded"
- Has excedido el límite gratuito de la API
- Solución: Ve a la consola de Google Cloud y revisa tus cuotas

## Comandos Útiles

### Ver las APIs habilitadas en tu proyecto
```bash
gcloud services list --enabled
```

### Ver el proyecto actual
```bash
gcloud config get-value project
```

### Cambiar de proyecto (si es necesario)
```bash
gcloud config set project TU_PROYECTO_ID
```

### Ver los logs de Cloud Run para debugging
```bash
gcloud run logs read quimera2025 --region us-east1 --limit 50
```

## Alternativa: Usar Variables de Entorno en Runtime

Si el problema persiste con build-time variables, puedes usar runtime variables:

1. Edita tu `Dockerfile` para aceptar variables en runtime
2. Usa `--set-env-vars` en lugar de `--set-build-env-vars`

```bash
gcloud run deploy quimera2025 \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars VITE_GEMINI_API_KEY=AIzaSyCNgO6QWhKy2B00d4uu-nAagPow3RnQRNg
```

## Debugging en Tiempo Real

Para ver qué está pasando en tu aplicación desplegada:

```bash
# Ver logs en tiempo real
gcloud run logs tail quimera2025 --region us-east1

# Ver detalles del servicio
gcloud run services describe quimera2025 --region us-east1
```

## Nota Importante sobre API Keys de Gemini

Las API Keys de Gemini (que empiezan con AIza...) son diferentes de las credenciales de Google Cloud:

- **Google AI Studio API Keys**: Para usar Gemini API directamente (recomendado para desarrollo)
  - Se crean en: https://aistudio.google.com/app/apikey
  - Son simples y directas
  - Tienen límites gratuitos generosos

- **Google Cloud Vertex AI**: Para uso empresarial
  - Requiere configurar Service Accounts
  - Más complejo pero más escalable
  - Se factura en tu proyecto de Google Cloud

Tu aplicación está usando Google AI Studio API Keys, que es el approach correcto para este caso.

