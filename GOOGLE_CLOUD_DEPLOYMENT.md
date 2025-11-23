# 🚀 Deployment en Google Cloud Run

Esta guía explica cómo desplegar QuimeraAI en Google Cloud Run con la API key de Google Gemini correctamente configurada.

## 📋 Prerequisitos

1. **Cuenta de Google Cloud** con facturación habilitada
2. **gcloud CLI** instalado y configurado ([Instalar gcloud](https://cloud.google.com/sdk/docs/install))
3. **API Key de Google Gemini** ([Obtener aquí](https://aistudio.google.com/app/apikey))

## 🛠️ Configuración Inicial

### 1. Configurar gcloud

```bash
# Iniciar sesión
gcloud auth login

# Configurar el proyecto
gcloud config set project YOUR_PROJECT_ID

# Habilitar las APIs necesarias
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 2. Verificar tu API Key

Asegúrate de tener tu API key de Google Gemini lista. La obtienes en:
- https://aistudio.google.com/app/apikey

## 🚢 Métodos de Deployment

### Opción 1: Deployment Directo con gcloud (Recomendado para pruebas rápidas)

```bash
# Desde la raíz del proyecto
gcloud run deploy quimeraai \
  --source . \
  --build-arg VITE_GEMINI_API_KEY=tu_api_key_aqui \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi
```

**Nota:** Reemplaza `tu_api_key_aqui` con tu API key real.

### Opción 2: Usando Cloud Build (Recomendado para producción)

El archivo `cloudbuild.yaml` ya está configurado. Despliega con:

```bash
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=_VITE_GEMINI_API_KEY="tu_api_key_aqui",_REGION="us-central1"
```

### Opción 3: Usando Secret Manager (Más Seguro)

#### Paso 1: Crear el secret

```bash
# Crear el secret con tu API key
echo -n "tu_api_key_aqui" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic"
```

#### Paso 2: Dar permisos al Cloud Build service account

```bash
# Obtener el número de proyecto
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) \
  --format="value(projectNumber)")

# Dar acceso al secret
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### Paso 3: Crear cloudbuild-secure.yaml

Crea un archivo `cloudbuild-secure.yaml`:

```yaml
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/gemini-api-key/versions/latest
      env: 'VITE_GEMINI_API_KEY'

steps:
  - name: 'gcr.io/cloud-builders/docker'
    secretEnv: ['VITE_GEMINI_API_KEY']
    args:
      - 'build'
      - '--build-arg'
      - 'VITE_GEMINI_API_KEY=$$VITE_GEMINI_API_KEY'
      - '-t'
      - 'gcr.io/$PROJECT_ID/quimeraai:$COMMIT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/quimeraai:latest'
      - '.'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/quimeraai:$COMMIT_SHA'

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'quimeraai'
      - '--image'
      - 'gcr.io/$PROJECT_ID/quimeraai:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'

images:
  - 'gcr.io/$PROJECT_ID/quimeraai:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/quimeraai:latest'

timeout: '1200s'
```

#### Paso 4: Desplegar con Secret Manager

```bash
gcloud builds submit --config cloudbuild-secure.yaml
```

## 🔍 Verificación del Deployment

### 1. Obtener la URL del servicio

```bash
gcloud run services describe quimeraai \
  --region us-central1 \
  --format="value(status.url)"
```

### 2. Verificar que la API key está funcionando

1. Abre la URL en tu navegador
2. Abre la consola del navegador (F12)
3. Busca el widget de "Quimera Assistant"
4. Debe mostrar **"Online"** en lugar de **"API key required"**

### 3. Ver logs del deployment

```bash
# Ver logs de Cloud Build
gcloud builds list --limit=5

# Ver logs de Cloud Run
gcloud run services logs read quimeraai --region us-central1
```

## 🔄 Actualizar el Deployment

Para actualizar la aplicación después de hacer cambios:

```bash
# Con gcloud directo
gcloud run deploy quimeraai \
  --source . \
  --build-arg VITE_GEMINI_API_KEY=tu_api_key_aqui \
  --platform managed \
  --region us-central1

# O con Cloud Build
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=_VITE_GEMINI_API_KEY="tu_api_key_aqui"
```

## ⚙️ Configuración Avanzada

### Configurar dominio personalizado

```bash
# Mapear un dominio a tu servicio
gcloud run domain-mappings create \
  --service quimeraai \
  --domain tudominio.com \
  --region us-central1
```

### Configurar autoscaling

```bash
gcloud run services update quimeraai \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 100 \
  --concurrency 80
```

### Configurar más memoria o CPU

```bash
gcloud run services update quimeraai \
  --region us-central1 \
  --memory 1Gi \
  --cpu 2
```

## 🛠️ Troubleshooting

### Error: "API key required" después del deployment

**Causa:** La API key no se pasó correctamente durante el build.

**Solución:**
1. Verifica que estás usando `--build-arg VITE_GEMINI_API_KEY=tu_api_key`
2. Asegúrate de que la API key es válida y no ha expirado
3. Verifica que el Dockerfile tiene las líneas `ARG` y `ENV`

### Error: "Container failed to start"

**Solución:**
```bash
# Ver logs detallados
gcloud run services logs read quimeraai --region us-central1 --limit 50

# Verificar el puerto
# Asegúrate de que el contenedor expone el puerto 8080
```

### Error: "Permission denied" en Secret Manager

**Solución:**
```bash
# Dar permisos al Cloud Build service account
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) \
  --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Verificar que la API key se inyectó correctamente

Durante el build, busca en los logs:
```bash
gcloud builds log [BUILD_ID]
```

Deberías ver mensajes como:
- `✅ Google API Key encontrada en variables de entorno` (en desarrollo)
- El build debe completarse sin errores

## 💰 Costos Estimados

Cloud Run cobra por:
- **Tiempo de CPU** durante las requests
- **Memoria** usada
- **Requests** recibidas

Con la configuración por defecto (512Mi RAM):
- ~$0.00002400 por segundo de CPU
- ~$0.00000250 por segundo de memoria
- ~$0.40 por millón de requests

**Tip:** Para reducir costos, usa `--min-instances 0` para que el servicio escale a 0 cuando no hay tráfico.

## 📚 Recursos Adicionales

- [Documentación de Cloud Run](https://cloud.google.com/run/docs)
- [Documentación de Cloud Build](https://cloud.google.com/build/docs)
- [Documentación de Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Pricing Calculator](https://cloud.google.com/products/calculator)

## 🔐 Seguridad

### Mejores Prácticas

1. **Usa Secret Manager** para la API key en producción
2. **Restringe la API key** en Google AI Studio a tu dominio de Cloud Run
3. **No commitees** la API key al repositorio
4. **Usa IAM** para controlar quién puede desplegar

### Restringir la API key por dominio

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Selecciona tu API key
3. En "Application restrictions", añade tu dominio de Cloud Run
4. Por ejemplo: `https://quimeraai-xxxx-uc.a.run.app`

## ✅ Checklist de Deployment

- [ ] gcloud CLI instalado y configurado
- [ ] API Key de Google Gemini obtenida
- [ ] APIs de Google Cloud habilitadas
- [ ] Dockerfile actualizado con ARG/ENV
- [ ] cloudbuild.yaml configurado (opcional)
- [ ] Deploy ejecutado exitosamente
- [ ] URL del servicio obtenida
- [ ] Widget de Quimera Assistant muestra "Online"
- [ ] Dominio personalizado configurado (opcional)
- [ ] API key restringida por dominio (recomendado)

---

¿Problemas? Revisa la sección de Troubleshooting o abre un issue en el repositorio.

