#!/bin/bash

# Script para configurar y verificar la conexión de localhost con Firebase

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_ID="quimeraai"
AUTH_DOMAIN="quimeraai.firebaseapp.com"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🖥️  Configurando localhost para Firebase${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Verificar archivo .env.local
echo -e "${YELLOW}📁 1. Verificando archivo .env.local...${NC}"
if [ -f ".env.local" ]; then
    echo -e "   ${GREEN}✅ .env.local existe${NC}"
    
    # Verificar variables de Firebase
    if grep -q "VITE_FIREBASE_API_KEY" .env.local && grep -q "VITE_FIREBASE_PROJECT_ID" .env.local; then
        echo -e "   ${GREEN}✅ Variables de Firebase configuradas${NC}"
        
        # Mostrar authDomain
        AUTH_DOMAIN_ENV=$(grep "VITE_FIREBASE_AUTH_DOMAIN" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
        if [ ! -z "$AUTH_DOMAIN_ENV" ]; then
            echo -e "   ${CYAN}   authDomain: ${AUTH_DOMAIN_ENV}${NC}"
        fi
    else
        echo -e "   ${YELLOW}⚠️  Variables de Firebase incompletas${NC}"
        echo -e "   ${YELLOW}   Copia ENV_EXAMPLE.txt a .env.local y completa los valores${NC}"
    fi
else
    echo -e "   ${RED}❌ .env.local no existe${NC}"
    echo -e "   ${YELLOW}   Creando desde ENV_EXAMPLE.txt...${NC}"
    
    if [ -f "ENV_EXAMPLE.txt" ]; then
        cp ENV_EXAMPLE.txt .env.local
        echo -e "   ${GREEN}✅ .env.local creado${NC}"
        echo -e "   ${YELLOW}   ⚠️  IMPORTANTE: Edita .env.local y completa tus credenciales de Firebase${NC}"
    else
        echo -e "   ${RED}❌ ENV_EXAMPLE.txt no encontrado${NC}"
    fi
fi
echo ""

# 2. Verificar configuración de Firebase Auth para localhost
echo -e "${YELLOW}🔐 2. Verificando configuración de Firebase Authentication...${NC}"
echo -e "   ${CYAN}Para que localhost funcione, necesitas:${NC}"
echo ""
echo -e "   ${YELLOW}1. Agregar localhost a dominios autorizados:${NC}"
echo -e "      ${CYAN}https://console.firebase.google.com/project/${PROJECT_ID}/authentication/settings${NC}"
echo ""
echo -e "   ${YELLOW}2. En 'Dominios autorizados', agrega:${NC}"
echo -e "      ${GREEN}   • localhost${NC}"
echo -e "      ${GREEN}   • 127.0.0.1${NC}"
echo -e "      ${GREEN}   • localhost:3000${NC}"
echo -e "      ${GREEN}   • localhost:5173${NC}"
echo ""
echo -e "   ${YELLOW}3. Verifica que 'authDomain' en .env.local sea:${NC}"
echo -e "      ${CYAN}   VITE_FIREBASE_AUTH_DOMAIN=${AUTH_DOMAIN}${NC}"
echo ""

# 3. Verificar restricciones de API
echo -e "${YELLOW}🔑 3. Verificando restricciones de API de Google...${NC}"
echo -e "   ${CYAN}Para que localhost funcione con Gemini API:${NC}"
echo ""
echo -e "   ${YELLOW}1. Ve a Google Cloud Console:${NC}"
echo -e "      ${CYAN}https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}${NC}"
echo ""
echo -e "   ${YELLOW}2. En 'Restricciones de aplicación', agrega:${NC}"
echo -e "      ${GREEN}   • http://localhost/*${NC}"
echo -e "      ${GREEN}   • http://localhost:3000/*${NC}"
echo -e "      ${GREEN}   • http://localhost:5173/*${NC}"
echo ""
echo -e "   ${YELLOW}💡 O ejecuta el script:${NC}"
echo -e "      ${CYAN}   ./configure-api-restrictions.sh${NC}"
echo ""

# 4. Verificar puerto del servidor
echo -e "${YELLOW}🌐 4. Verificando configuración del servidor...${NC}"
if [ -f "vite.config.ts" ]; then
    PORT=$(grep -A 5 "server:" vite.config.ts | grep "port:" | grep -oE "[0-9]+" | head -1)
    if [ ! -z "$PORT" ]; then
        echo -e "   ${GREEN}✅ Puerto configurado: ${PORT}${NC}"
        echo -e "   ${CYAN}   La app estará disponible en: http://localhost:${PORT}${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Puerto no encontrado en vite.config.ts (usará puerto por defecto: 5173)${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  vite.config.ts no encontrado${NC}"
fi
echo ""

# 5. Instrucciones para iniciar
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 PRÓXIMOS PASOS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}1. Completa el archivo .env.local con tus credenciales:${NC}"
echo -e "   ${YELLOW}   nano .env.local${NC}"
echo ""

echo -e "${CYAN}2. Configura Firebase Authentication para localhost:${NC}"
echo -e "   ${YELLOW}   https://console.firebase.google.com/project/${PROJECT_ID}/authentication/settings${NC}"
echo -e "   ${YELLOW}   → Dominios autorizados → Agregar: localhost${NC}"
echo ""

echo -e "${CYAN}3. Configura restricciones de API (si usas Gemini):${NC}"
echo -e "   ${YELLOW}   ./configure-api-restrictions.sh${NC}"
echo ""

echo -e "${CYAN}4. Inicia el servidor de desarrollo:${NC}"
echo -e "   ${GREEN}   npm run dev${NC}"
echo ""

echo -e "${CYAN}5. Abre en el navegador:${NC}"
if [ ! -z "$PORT" ]; then
    echo -e "   ${GREEN}   http://localhost:${PORT}${NC}"
else
    echo -e "   ${GREEN}   http://localhost:5173${NC}"
fi
echo ""

# 6. Verificar si el servidor está corriendo
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 ESTADO ACTUAL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${GREEN}✅ Servidor corriendo en puerto 3000${NC}"
elif lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${GREEN}✅ Servidor corriendo en puerto 5173${NC}"
else
    echo -e "${YELLOW}⏳ Servidor no está corriendo${NC}"
    echo -e "   ${CYAN}   Ejecuta: npm run dev${NC}"
fi
echo ""

echo -e "${GREEN}✨ Configuración completada${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"







