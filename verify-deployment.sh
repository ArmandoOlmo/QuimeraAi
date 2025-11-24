#!/bin/bash

# Script de verificación para deployment de QuimeraAI
# Este script verifica que tu deployment esté configurado correctamente

echo "🔍 QuimeraAI - Verificación de Deployment"
echo "========================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0
warnings=0

# Función para mostrar check
check_ok() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_error() {
    echo -e "${RED}❌ $1${NC}"
    ((errors++))
}

check_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((warnings++))
}

# 1. Verificar que gcloud esté instalado
echo "1. Verificando gcloud CLI..."
if command -v gcloud &> /dev/null; then
    check_ok "gcloud CLI instalado"
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        check_warning "No hay proyecto configurado en gcloud"
    else
        check_ok "Proyecto configurado: $PROJECT_ID"
    fi
else
    check_error "gcloud CLI no está instalado"
fi
echo ""

# 2. Verificar variables de entorno locales
echo "2. Verificando variables de entorno..."
if [ -z "$VITE_GEMINI_API_KEY" ]; then
    check_error "VITE_GEMINI_API_KEY no está configurada"
    echo "   Para configurarla: export VITE_GEMINI_API_KEY=tu_api_key"
else
    KEY_LENGTH=${#VITE_GEMINI_API_KEY}
    if [ $KEY_LENGTH -lt 30 ]; then
        check_warning "VITE_GEMINI_API_KEY parece muy corta (longitud: $KEY_LENGTH)"
    else
        check_ok "VITE_GEMINI_API_KEY configurada (longitud: $KEY_LENGTH)"
    fi
fi

if [ -z "$VITE_FIREBASE_API_KEY" ]; then
    check_warning "VITE_FIREBASE_API_KEY no está configurada (usará fallback)"
else
    check_ok "VITE_FIREBASE_API_KEY configurada"
fi

if [ -z "$VITE_FIREBASE_PROJECT_ID" ]; then
    check_warning "VITE_FIREBASE_PROJECT_ID no está configurada (usará fallback)"
else
    check_ok "VITE_FIREBASE_PROJECT_ID configurada: $VITE_FIREBASE_PROJECT_ID"
fi
echo ""

# 3. Verificar archivos necesarios
echo "3. Verificando archivos de deployment..."
files=("Dockerfile" "cloudbuild.yaml" "deploy.sh" "package.json" "vite.config.ts")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        check_ok "$file existe"
    else
        check_error "$file no encontrado"
    fi
done
echo ""

# 4. Verificar que node_modules existe
echo "4. Verificando dependencias..."
if [ -d "node_modules" ]; then
    check_ok "node_modules existe"
else
    check_warning "node_modules no existe. Ejecuta 'npm install'"
fi
echo ""

# 5. Verificar APIs habilitadas en Google Cloud
echo "5. Verificando APIs de Google Cloud..."
if command -v gcloud &> /dev/null && [ ! -z "$PROJECT_ID" ]; then
    # Cloud Run API
    if gcloud services list --enabled --filter="name:run.googleapis.com" --format="value(name)" 2>/dev/null | grep -q "run.googleapis.com"; then
        check_ok "Cloud Run API habilitada"
    else
        check_error "Cloud Run API no está habilitada. Ejecuta: gcloud services enable run.googleapis.com"
    fi
    
    # Cloud Build API
    if gcloud services list --enabled --filter="name:cloudbuild.googleapis.com" --format="value(name)" 2>/dev/null | grep -q "cloudbuild.googleapis.com"; then
        check_ok "Cloud Build API habilitada"
    else
        check_error "Cloud Build API no está habilitada. Ejecuta: gcloud services enable cloudbuild.googleapis.com"
    fi
else
    check_warning "No se pueden verificar APIs (gcloud no configurado)"
fi
echo ""

# 6. Verificar servicio desplegado
echo "6. Verificando servicio en Cloud Run..."
if command -v gcloud &> /dev/null && [ ! -z "$PROJECT_ID" ]; then
    SERVICE_NAME="quimeraai2025"
    REGION="us-east1"
    
    if gcloud run services describe "$SERVICE_NAME" --region="$REGION" &>/dev/null; then
        check_ok "Servicio $SERVICE_NAME existe en $REGION"
        SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)" 2>/dev/null)
        if [ ! -z "$SERVICE_URL" ]; then
            check_ok "URL del servicio: $SERVICE_URL"
        fi
    else
        check_warning "Servicio $SERVICE_NAME no encontrado en $REGION (aún no desplegado)"
    fi
else
    check_warning "No se puede verificar el servicio (gcloud no configurado)"
fi
echo ""

# Resumen
echo "========================================"
echo "📊 Resumen de Verificación"
echo "========================================"
if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✅ Todo perfecto! Listo para desplegar.${NC}"
    echo ""
    echo "Para desplegar, ejecuta:"
    echo "  ./deploy.sh"
    exit 0
elif [ $errors -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $warnings advertencia(s) encontrada(s)${NC}"
    echo ""
    echo "Puedes desplegar, pero revisa las advertencias."
    echo "Para desplegar, ejecuta:"
    echo "  ./deploy.sh"
    exit 0
else
    echo -e "${RED}❌ $errors error(es) encontrado(s)${NC}"
    if [ $warnings -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $warnings advertencia(s) encontrada(s)${NC}"
    fi
    echo ""
    echo "Por favor, corrige los errores antes de desplegar."
    exit 1
fi

