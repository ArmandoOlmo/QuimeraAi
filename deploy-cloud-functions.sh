#!/bin/bash

# Script para deployar Cloud Functions de QuimeraAI
# Incluye configuración de API keys y deployment

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 QuimeraAI - Deploy Cloud Functions${NC}"
echo -e "========================================${NC}"

# Verificar que estamos en el directorio correcto
if [ ! -d "functions" ]; then
    echo -e "${RED}❌ ERROR: Directorio 'functions' no encontrado${NC}"
    echo -e "Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Verificar que Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ ERROR: Firebase CLI no está instalado${NC}"
    echo -e "Instala con: ${BLUE}npm install -g firebase-tools${NC}"
    exit 1
fi

# Verificar login de Firebase
echo -e "\n${BLUE}🔍 Verificando autenticación de Firebase...${NC}"
firebase projects:list &> /dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  No estás autenticado en Firebase${NC}"
    echo -e "${BLUE}Iniciando sesión...${NC}"
    firebase login
fi

# Obtener proyecto actual
PROJECT_ID=$(firebase projects:list | grep quimeraai | awk '{print $1}' | head -1)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  No se detectó el proyecto automáticamente${NC}"
    echo -e "Proyectos disponibles:"
    firebase projects:list
    echo -e "\n${BLUE}Configura el proyecto con:${NC} firebase use PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}✅ Proyecto: $PROJECT_ID${NC}"

# Paso 1: Verificar/Configurar API Key de Gemini
echo -e "\n${BLUE}🔑 Configuración de API Key de Gemini${NC}"
echo -e "========================================${NC}"

# Verificar si ya existe configuración
EXISTING_KEY=$(firebase functions:config:get gemini.api_key 2>/dev/null)

if [ ! -z "$EXISTING_KEY" ] && [ "$EXISTING_KEY" != "null" ]; then
    echo -e "${GREEN}✅ API Key ya está configurada${NC}"
    echo -e "${YELLOW}¿Quieres actualizarla? (y/N):${NC} "
    read -r UPDATE_KEY
    
    if [ "$UPDATE_KEY" = "y" ] || [ "$UPDATE_KEY" = "Y" ]; then
        echo -e "${BLUE}Ingresa tu Gemini API Key:${NC} "
        read -r GEMINI_KEY
        
        if [ ! -z "$GEMINI_KEY" ]; then
            firebase functions:config:set gemini.api_key="$GEMINI_KEY"
            echo -e "${GREEN}✅ API Key actualizada${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  No hay API Key configurada${NC}"
    echo -e "${BLUE}Ingresa tu Gemini API Key (o presiona Enter para configurar después):${NC} "
    read -r GEMINI_KEY
    
    if [ ! -z "$GEMINI_KEY" ]; then
        firebase functions:config:set gemini.api_key="$GEMINI_KEY"
        echo -e "${GREEN}✅ API Key configurada${NC}"
    else
        echo -e "${YELLOW}⚠️  Continuando sin configurar API Key${NC}"
        echo -e "${YELLOW}   Configúrala después con:${NC}"
        echo -e "${BLUE}   firebase functions:config:set gemini.api_key=\"YOUR_KEY\"${NC}"
    fi
fi

# Paso 2: Instalar dependencias
echo -e "\n${BLUE}📦 Instalando dependencias...${NC}"
cd functions
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ERROR: Falló la instalación de dependencias${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependencias instaladas${NC}"

# Paso 3: Construir TypeScript
echo -e "\n${BLUE}🔨 Construyendo TypeScript...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ERROR: Falló la construcción${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build completado${NC}"

cd ..

# Paso 4: Desplegar Functions
echo -e "\n${BLUE}☁️  Desplegando Cloud Functions...${NC}"
echo -e "${YELLOW}Esto puede tomar varios minutos...${NC}"

firebase deploy --only functions:gemini-generate,functions:gemini-stream,functions:gemini-usage

DEPLOY_STATUS=$?

if [ $DEPLOY_STATUS -eq 0 ]; then
    echo -e "\n${GREEN}✅ ¡Deployment exitoso!${NC}"
    echo -e "========================================${NC}"
    echo -e "\n${GREEN}📋 Funciones deployadas:${NC}"
    echo -e "  • ${BLUE}gemini-generate${NC}   - Generar contenido"
    echo -e "  • ${BLUE}gemini-stream${NC}     - Streaming de contenido"
    echo -e "  • ${BLUE}gemini-usage${NC}      - Estadísticas de uso"
    
    echo -e "\n${GREEN}🔗 URLs de las funciones:${NC}"
    REGION="us-central1"
    BASE_URL="https://${REGION}-${PROJECT_ID}.cloudfunctions.net"
    echo -e "  • Generate: ${BLUE}${BASE_URL}/gemini-generate${NC}"
    echo -e "  • Stream:   ${BLUE}${BASE_URL}/gemini-stream${NC}"
    echo -e "  • Usage:    ${BLUE}${BASE_URL}/gemini-usage${NC}"
    
    echo -e "\n${GREEN}📝 Siguiente paso:${NC}"
    echo -e "  Actualiza tu ${BLUE}.env.local${NC} con:"
    echo -e "  ${BLUE}VITE_GEMINI_PROXY_URL=${BASE_URL}/gemini${NC}"
    
    echo -e "\n${GREEN}🧪 Test rápido:${NC}"
    echo -e "  ${BLUE}curl -X POST ${BASE_URL}/gemini-generate \\${NC}"
    echo -e "  ${BLUE}  -H 'Content-Type: application/json' \\${NC}"
    echo -e "  ${BLUE}  -d '{\"projectId\":\"test\",\"prompt\":\"Hola\",\"model\":\"gemini-1.5-flash\"}'${NC}"
    
else
    echo -e "\n${RED}❌ Deployment falló${NC}"
    echo -e "========================================${NC}"
    echo -e "${YELLOW}Verifica los logs de error arriba${NC}"
    echo -e "\n${BLUE}Comandos útiles para debugging:${NC}"
    echo -e "  • Ver logs: ${BLUE}firebase functions:log${NC}"
    echo -e "  • Ver config: ${BLUE}firebase functions:config:get${NC}"
    echo -e "  • Reintentar: ${BLUE}./deploy-cloud-functions.sh${NC}"
    exit 1
fi

# Paso 5: Verificar deployment
echo -e "\n${BLUE}🔍 Verificando funciones deployadas...${NC}"
firebase functions:list | grep gemini
echo -e "${GREEN}✅ Verificación completa${NC}"

echo -e "\n${GREEN}🎉 ¡Todo listo!${NC}"
echo -e "\n${YELLOW}📚 Para más información, consulta:${NC}"
echo -e "  ${BLUE}GEMINI_PROXY_SETUP.md${NC}"

