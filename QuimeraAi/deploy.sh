#!/bin/bash

# Script de deploy para Google Cloud Run
# Este script asegura que se use la API key correcta

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 QuimeraAI - Deploy a Google Cloud Run${NC}"
echo "========================================"
echo ""

# Función para cleanup en caso de error
cleanup() {
    if [ -f .env.local.backup ]; then
        echo -e "${YELLOW}♻️  Restaurando .env.local desde backup...${NC}"
        mv .env.local.backup .env.local
    fi
}

# Registrar cleanup para ejecutar en caso de error
trap cleanup EXIT

# Cargar variables desde .env.local si existe
if [ -f .env.local ]; then
    echo "📥 Cargando variables desde .env.local..."
    # Exportar variables ignorando comentarios y líneas vacías
    export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
fi

# Paso 1: Hacer backup del .env.local si existe
if [ -f .env.local ]; then
    echo "📦 Haciendo backup de .env.local..."
    cp .env.local .env.local.backup
    echo -e "${GREEN}✅ Backup creado: .env.local.backup${NC}"
fi

# Paso 2: Eliminar temporalmente el .env.local para el deploy
if [ -f .env.local ]; then
    echo "🗑️  Eliminando .env.local temporal para el deploy..."
    rm .env.local
fi

# Paso 3: Verificar que las API keys estén configuradas
echo ""
echo "🔍 Verificando variables de entorno..."

if [ -z "$VITE_GEMINI_API_KEY" ]; then
    echo -e "${RED}❌ ERROR: VITE_GEMINI_API_KEY no está configurada${NC}"
    echo ""
    echo "Por favor, configura la variable de entorno antes de hacer deploy:"
    echo -e "${BLUE}  export VITE_GEMINI_API_KEY=your_api_key_here${NC}"
    echo ""
    echo "Para obtener tu API key:"
    echo "  https://aistudio.google.com/app/apikey"
    exit 1
else
    KEY_LENGTH=${#VITE_GEMINI_API_KEY}
    echo -e "${GREEN}✅ VITE_GEMINI_API_KEY configurada (longitud: $KEY_LENGTH)${NC}"
fi

# Firebase variables son opcionales (tienen fallbacks en el código)
# pero es mejor configurarlas explícitamente
if [ -z "$VITE_FIREBASE_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  WARNING: VITE_FIREBASE_API_KEY no está configurada (se usará fallback)${NC}"
else
    echo -e "${GREEN}✅ Firebase variables configuradas${NC}"
fi

# Verificar gcloud
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ ERROR: gcloud CLI no está instalado${NC}"
    echo "Instala gcloud desde: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ ERROR: No hay proyecto de Google Cloud configurado${NC}"
    echo "Configura un proyecto con: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi
echo -e "${GREEN}✅ Proyecto Google Cloud: $PROJECT_ID${NC}"

# Paso 4: Hacer el deploy
echo ""
echo "☁️  Desplegando a Cloud Run..."
TIMESTAMP=$(date +%s)
echo "🔄 Cache bust timestamp: $TIMESTAMP"

# Preparar las variables de build
BUILD_ENV_VARS="VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY,CACHEBUST=$TIMESTAMP"

# Agregar variables de Firebase si están configuradas
if [ ! -z "$VITE_FIREBASE_API_KEY" ]; then
    BUILD_ENV_VARS="$BUILD_ENV_VARS,VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY"
fi
if [ ! -z "$VITE_FIREBASE_AUTH_DOMAIN" ]; then
    BUILD_ENV_VARS="$BUILD_ENV_VARS,VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN"
fi
if [ ! -z "$VITE_FIREBASE_PROJECT_ID" ]; then
    BUILD_ENV_VARS="$BUILD_ENV_VARS,VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID"
fi
if [ ! -z "$VITE_FIREBASE_STORAGE_BUCKET" ]; then
    BUILD_ENV_VARS="$BUILD_ENV_VARS,VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET"
fi
if [ ! -z "$VITE_FIREBASE_MESSAGING_SENDER_ID" ]; then
    BUILD_ENV_VARS="$BUILD_ENV_VARS,VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID"
fi
if [ ! -z "$VITE_FIREBASE_APP_ID" ]; then
    BUILD_ENV_VARS="$BUILD_ENV_VARS,VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID"
fi
if [ ! -z "$VITE_FIREBASE_MEASUREMENT_ID" ]; then
    BUILD_ENV_VARS="$BUILD_ENV_VARS,VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID"
fi

echo "📦 Variables de build configuradas"
echo ""

# Preguntar confirmación antes de desplegar (opcional, comentar si se quiere auto-deploy)
# read -p "¿Desplegar a us-east1? (y/N): " -n 1 -r
# echo
# if [[ ! $REPLY =~ ^[Yy]$ ]]; then
#     echo "Deploy cancelado"
#     exit 0
# fi

echo -e "${BLUE}🚢 Desplegando...${NC}"
echo "Esto puede tomar varios minutos..."
echo ""

echo -e "${BLUE}🔨 Construyendo imagen de Docker...${NC}"
echo "Esto puede tomar varios minutos..."
echo ""

# Construir la imagen usando Cloud Build y pasar los argumentos de build via substitutions
gcloud builds submit --config cloudbuild.yaml \
  --substitutions _VITE_GEMINI_API_KEY="$VITE_GEMINI_API_KEY",_VITE_FIREBASE_API_KEY="$VITE_FIREBASE_API_KEY",_VITE_FIREBASE_AUTH_DOMAIN="$VITE_FIREBASE_AUTH_DOMAIN",_VITE_FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID",_VITE_FIREBASE_STORAGE_BUCKET="$VITE_FIREBASE_STORAGE_BUCKET",_VITE_FIREBASE_MESSAGING_SENDER_ID="$VITE_FIREBASE_MESSAGING_SENDER_ID",_VITE_FIREBASE_APP_ID="$VITE_FIREBASE_APP_ID",_VITE_FIREBASE_MEASUREMENT_ID="$VITE_FIREBASE_MEASUREMENT_ID",_REGION="us-central1" \
  .

BUILD_STATUS=$?

if [ $BUILD_STATUS -ne 0 ]; then
    echo -e "${RED}❌ Build falló${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🚢 Desplegando imagen a Cloud Run...${NC}"
echo ""

set +e  # No salir automáticamente si falla
gcloud run deploy quimeraai2025 \
  --image gcr.io/$PROJECT_ID/quimeraai2025 \
  --region us-east1 \
  --allow-unauthenticated \
  --platform managed \
  --memory 512Mi \
  --timeout 300

DEPLOY_STATUS=$?
set -e  # Volver a activar exit on error

echo ""

# Paso 5: Restaurar el .env.local desde el backup
if [ -f .env.local.backup ]; then
    echo "♻️  Restaurando .env.local..."
    mv .env.local.backup .env.local
    echo -e "${GREEN}✅ .env.local restaurado${NC}"
fi

if [ $DEPLOY_STATUS -eq 0 ]; then
    echo ""
    echo "========================================"
    echo -e "${GREEN}✅ Deploy completado exitosamente!${NC}"
    echo "========================================"
    echo ""
    SERVICE_URL=$(gcloud run services describe quimeraai2025 --region us-east1 --format="value(status.url)" 2>/dev/null || echo "https://quimeraai2025-971520973424.us-east1.run.app")
    echo -e "${BLUE}🌐 URL del servicio:${NC}"
    echo "   $SERVICE_URL"
    echo ""
    echo -e "${YELLOW}🔍 Para verificar que todo funciona:${NC}"
    echo "   1. Abre la URL en tu navegador"
    echo "   2. Abre la consola del navegador (F12)"
    echo "   3. Busca mensajes que confirmen que la API key está configurada"
    echo "   4. El asistente IA debe estar 'Online' (no 'API key required')"
    echo ""
    echo -e "${BLUE}📊 Ver logs:${NC}"
    echo "   gcloud run services logs read quimeraai2025 --region us-east1"
    echo ""
else
    echo ""
    echo "========================================"
    echo -e "${RED}❌ Deploy falló${NC}"
    echo "========================================"
    echo ""
    echo "Verifica los logs de error arriba."
    echo ""
    echo "Comandos útiles para debugging:"
    echo "  - Ver builds recientes: gcloud builds list --limit=5"
    echo "  - Ver logs del build: gcloud builds log [BUILD_ID]"
    echo "  - Ver logs del servicio: gcloud run services logs read quimeraai2025 --region us-east1"
    echo ""
    exit 1
fi

# Desregistrar el trap ya que todo salió bien
trap - EXIT

