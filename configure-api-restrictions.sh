#!/bin/bash

# Script para ayudar a configurar restricciones de API keys en Google Cloud
# Este script proporciona información y comandos para asegurar tus API keys

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 QuimeraAI - Configuración de Restricciones de API Keys${NC}"
echo -e "========================================${NC}"

# Obtener el proyecto actual
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  No se pudo obtener el proyecto automáticamente${NC}"
    PROJECT_ID="quimeraai"
    echo -e "${YELLOW}    Usando proyecto por defecto: $PROJECT_ID${NC}"
else
    echo -e "${GREEN}✅ Proyecto: $PROJECT_ID${NC}"
fi

# Obtener la URL del servicio Cloud Run
echo -e "\n${BLUE}📍 Obteniendo URL del servicio...${NC}"
SERVICE_URL=$(gcloud run services describe quimeraai2025 --region us-east1 --format="value(status.url)" 2>/dev/null)

if [ -z "$SERVICE_URL" ]; then
    echo -e "${YELLOW}⚠️  No se pudo obtener la URL automáticamente${NC}"
    SERVICE_URL="https://quimeraai2025-1034000853795.us-east1.run.app"
    echo -e "${YELLOW}    Usando URL por defecto: $SERVICE_URL${NC}"
else
    echo -e "${GREEN}✅ URL del servicio: $SERVICE_URL${NC}"
fi

# Extraer el dominio base del servicio
SERVICE_DOMAIN=$(echo $SERVICE_URL | sed 's|https://||' | sed 's|/.*||')

echo -e "\n${BLUE}🔍 Listando API Keys del proyecto...${NC}"
echo -e "${YELLOW}Ejecutando: gcloud services api-keys list --project=$PROJECT_ID${NC}"
gcloud services api-keys list --project=$PROJECT_ID 2>/dev/null || {
    echo -e "${YELLOW}⚠️  No se pudieron listar las API keys con gcloud${NC}"
    echo -e "${YELLOW}    Esto es normal - las API keys se gestionan mejor desde la consola web${NC}"
}

echo -e "\n${BLUE}📋 URLs y dominios para configurar restricciones:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n${YELLOW}Para FIREBASE API KEY y GEMINI API KEY:${NC}"
echo -e "  ${BLUE}1. Cloud Run (producción):${NC}"
echo -e "     https://$SERVICE_DOMAIN/*"
echo -e "     https://*.run.app/*  ${YELLOW}(wildcard para todos los servicios)${NC}"
echo -e "\n  ${BLUE}2. Desarrollo local:${NC}"
echo -e "     http://localhost:5173/*"
echo -e "     http://localhost:4173/*  ${YELLOW}(preview)${NC}"
echo -e "     http://localhost/*  ${YELLOW}(cualquier puerto)${NC}"

echo -e "\n${BLUE}🌐 URLs de configuración:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
CONSOLE_URL="https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo -e "\n${GREEN}📱 Consola de Google Cloud - Credentials:${NC}"
echo -e "   $CONSOLE_URL"

echo -e "\n${GREEN}🔑 Google AI Studio (para Gemini API):${NC}"
echo -e "   https://aistudio.google.com/app/apikey"

echo -e "\n${BLUE}📖 Pasos para configurar restricciones:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n${YELLOW}Para GEMINI API KEY:${NC}"
echo -e "  1. Ve a: https://aistudio.google.com/app/apikey"
echo -e "  2. O ve a: $CONSOLE_URL"
echo -e "  3. Busca tu API key de Gemini"
echo -e "  4. Click en 'Edit API key' (ícono de lápiz)"
echo -e "  5. En 'Application restrictions':"
echo -e "     - Selecciona 'HTTP referrers (web sites)'"
echo -e "     - Agrega: https://$SERVICE_DOMAIN/*"
echo -e "     - Agrega: http://localhost/*"
echo -e "  6. En 'API restrictions':"
echo -e "     - Selecciona 'Restrict key'"
echo -e "     - Marca solo: 'Generative Language API'"
echo -e "  7. Click 'Save'"

echo -e "\n${YELLOW}Para FIREBASE API KEY:${NC}"
echo -e "  1. Ve a: $CONSOLE_URL"
echo -e "  2. Busca 'Browser key (auto created by Firebase)'"
echo -e "  3. Click en 'Edit API key' (ícono de lápiz)"
echo -e "  4. En 'Application restrictions':"
echo -e "     - Selecciona 'HTTP referrers (web sites)'"
echo -e "     - Agrega: https://$SERVICE_DOMAIN/*"
echo -e "     - Agrega: http://localhost/*"
echo -e "  5. En 'API restrictions':"
echo -e "     - Puedes dejar 'Don't restrict key' (Firebase lo protege con reglas)"
echo -e "     - O restringir a: Firebase APIs necesarias"
echo -e "  6. Click 'Save'"

echo -e "\n${BLUE}🧪 Para probar después de configurar:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  1. Abre tu aplicación: $SERVICE_URL"
echo -e "  2. Abre las DevTools (F12) → Console"
echo -e "  3. Intenta usar la funcionalidad de AI"
echo -e "  4. Verifica que no hay errores de API key"

echo -e "\n${GREEN}✅ Script completado${NC}"
echo -e "\n${YELLOW}💡 TIP: Guarda este script, lo puedes ejecutar cuando necesites recordar las URLs${NC}"
echo -e "\n${BLUE}¿Quieres abrir la consola de Google Cloud ahora?${NC}"
echo -e "${YELLOW}Ejecuta: open \"$CONSOLE_URL\"${NC}"

