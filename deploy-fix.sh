#!/bin/bash

# Script de deploy CORREGIDO para Google Cloud Run
# Este usa cloudbuild.yaml en lugar de --set-build-env-vars

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 QuimeraAI - Deploy (Método Corregido)${NC}"
echo "========================================"
echo ""

# Verificar API key
if [ -z "$VITE_GEMINI_API_KEY" ]; then
    echo -e "${RED}❌ ERROR: VITE_GEMINI_API_KEY no está configurada${NC}"
    echo ""
    echo "Por favor ejecuta:"
    echo -e "${BLUE}  export VITE_GEMINI_API_KEY=\"tu_api_key_aqui\"${NC}"
    exit 1
fi

echo -e "${GREEN}✅ VITE_GEMINI_API_KEY configurada (longitud: ${#VITE_GEMINI_API_KEY})${NC}"

# Verificar gcloud
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ ERROR: gcloud CLI no está instalado${NC}"
    exit 1
fi

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ ERROR: No hay proyecto configurado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Proyecto: $PROJECT_ID${NC}"
echo ""

# Preparar sustituciones
SUBSTITUTIONS="_VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY"

# Agregar Firebase si está configurado
if [ ! -z "$VITE_FIREBASE_API_KEY" ]; then
    SUBSTITUTIONS="$SUBSTITUTIONS,_VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY"
fi
if [ ! -z "$VITE_FIREBASE_AUTH_DOMAIN" ]; then
    SUBSTITUTIONS="$SUBSTITUTIONS,_VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN"
fi
if [ ! -z "$VITE_FIREBASE_PROJECT_ID" ]; then
    SUBSTITUTIONS="$SUBSTITUTIONS,_VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID"
fi
if [ ! -z "$VITE_FIREBASE_STORAGE_BUCKET" ]; then
    SUBSTITUTIONS="$SUBSTITUTIONS,_VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET"
fi
if [ ! -z "$VITE_FIREBASE_MESSAGING_SENDER_ID" ]; then
    SUBSTITUTIONS="$SUBSTITUTIONS,_VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID"
fi
if [ ! -z "$VITE_FIREBASE_APP_ID" ]; then
    SUBSTITUTIONS="$SUBSTITUTIONS,_VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID"
fi
if [ ! -z "$VITE_FIREBASE_MEASUREMENT_ID" ]; then
    SUBSTITUTIONS="$SUBSTITUTIONS,_VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID"
fi

SUBSTITUTIONS="$SUBSTITUTIONS,_REGION=us-east1"

echo -e "${BLUE}🚢 Desplegando con Cloud Build...${NC}"
echo "Esto puede tomar varios minutos..."
echo ""

gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions="$SUBSTITUTIONS"

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo -e "${GREEN}✅ Deploy completado exitosamente!${NC}"
    echo "========================================"
    echo ""
    SERVICE_URL=$(gcloud run services describe quimeraai2025 --region us-east1 --format="value(status.url)" 2>/dev/null)
    echo -e "${BLUE}🌐 URL del servicio:${NC}"
    echo "   $SERVICE_URL"
    echo ""
else
    echo ""
    echo "========================================"
    echo -e "${RED}❌ Deploy falló${NC}"
    echo "========================================"
    exit 1
fi









