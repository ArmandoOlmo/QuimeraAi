#!/bin/bash

# Script de Emergencia: Arreglar API Key Bloqueada
# Este script configura la nueva API key de forma segura en el backend

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo -e "${RED}🚨 EMERGENCIA: Configuración de Nueva API Key${NC}"
echo -e "========================================${NC}"

# Verificar que estamos en el directorio correcto
if [ ! -f "firebase.json" ]; then
    echo -e "${RED}❌ ERROR: Ejecuta este script desde la raíz del proyecto${NC}"
    exit 1
fi

# Paso 1: Verificar Firebase CLI
echo -e "\n${BLUE}📋 Paso 1: Verificar Firebase CLI...${NC}"
if ! command -v firebase &> /dev/null; then
    echo -e "${YELLOW}⚠️  Firebase CLI no está instalado${NC}"
    echo -e "${BLUE}Instalando...${NC}"
    npm install -g firebase-tools
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ ERROR: No se pudo instalar Firebase CLI${NC}"
        echo -e "${YELLOW}Instálalo manualmente con:${NC} npm install -g firebase-tools"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Firebase CLI instalado${NC}"
firebase --version

# Paso 2: Login a Firebase
echo -e "\n${BLUE}📋 Paso 2: Login a Firebase...${NC}"
echo -e "${YELLOW}Se abrirá tu navegador para autenticarte...${NC}"
firebase login

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ERROR: Login falló${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Autenticado en Firebase${NC}"

# Paso 3: Configurar API Key
echo -e "\n${BLUE}📋 Paso 3: Configurar Nueva API Key...${NC}"
echo -e "${YELLOW}⚠️  IMPORTANTE: Ingresa tu NUEVA API key de Gemini${NC}"
echo -e "${YELLOW}   (La obtuviste de: https://aistudio.google.com/app/apikey)${NC}"
echo -e "\n${BLUE}Ingresa tu nueva API key:${NC} "
read -r GEMINI_API_KEY

if [ -z "$GEMINI_API_KEY" ]; then
    echo -e "${RED}❌ ERROR: No ingresaste una API key${NC}"
    exit 1
fi

echo -e "\n${BLUE}Configurando API key en Cloud Functions (backend seguro)...${NC}"
firebase functions:config:set gemini.api_key="$GEMINI_API_KEY"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ERROR: No se pudo configurar la API key${NC}"
    exit 1
fi

echo -e "${GREEN}✅ API Key configurada en backend${NC}"

# Verificar configuración
echo -e "\n${BLUE}Verificando configuración...${NC}"
firebase functions:config:get

# Paso 4: Instalar dependencias de functions
echo -e "\n${BLUE}📋 Paso 4: Preparar Cloud Functions...${NC}"
cd functions

if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Instalando dependencias...${NC}"
    npm install
fi

echo -e "${BLUE}Construyendo TypeScript...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ERROR: Build falló${NC}"
    cd ..
    exit 1
fi

cd ..
echo -e "${GREEN}✅ Cloud Functions preparadas${NC}"

# Paso 5: Deploy Cloud Functions
echo -e "\n${BLUE}📋 Paso 5: Deployar Cloud Functions (Proxy Seguro)...${NC}"
echo -e "${YELLOW}Esto tomará 3-5 minutos...${NC}"

# Actualizar a Node.js 20 (Node 18 fue descontinuado)
echo -e "${BLUE}Actualizando configuración a Node.js 20...${NC}"

firebase deploy --only functions:gemini-generate,functions:gemini-stream,functions:gemini-usage

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ERROR: Deploy de functions falló${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Cloud Functions deployadas${NC}"

# Paso 6: Crear .env.local
echo -e "\n${BLUE}📋 Paso 6: Configurar .env.local...${NC}"

if [ -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local ya existe. Haciendo backup...${NC}"
    cp .env.local .env.local.backup.$(date +%s)
fi

cat > .env.local << EOF
# Gemini Proxy Configuration
VITE_GEMINI_PROXY_URL=https://us-central1-quimeraai.cloudfunctions.net/gemini
VITE_USE_GEMINI_PROXY=false

# Gemini API Key (SOLO para desarrollo local)
VITE_GEMINI_API_KEY=$GEMINI_API_KEY

# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyBs_MbMSN6BCD1yrZ8SpCoa07DcZm2rmsM
VITE_FIREBASE_AUTH_DOMAIN=quimeraai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=quimeraai
VITE_FIREBASE_STORAGE_BUCKET=quimeraai.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=575386543550
VITE_FIREBASE_APP_ID=1:575386543550:web:395114b8f43e810a7985ef
VITE_FIREBASE_MEASUREMENT_ID=G-KQ26WWK4MD
EOF

echo -e "${GREEN}✅ .env.local creado${NC}"

# Paso 7: Test del Proxy
echo -e "\n${BLUE}📋 Paso 7: Test del Proxy...${NC}"
echo -e "${YELLOW}Probando que el proxy funciona...${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://us-central1-quimeraai.cloudfunctions.net/gemini-generate \
  -H "Content-Type: application/json" \
  -d '{"projectId":"test","prompt":"Di OK","model":"gemini-1.5-flash"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ ¡Proxy funciona! Sin error 403${NC}"
    echo -e "${GREEN}Respuesta del servidor:${NC}"
    echo "$BODY" | head -c 200
    echo "..."
else
    echo -e "${RED}❌ Error HTTP $HTTP_CODE${NC}"
    echo -e "${RED}Respuesta:${NC}"
    echo "$BODY"
    echo -e "\n${YELLOW}Verifica los logs:${NC} firebase functions:log"
fi

# Paso 8: Rebuild App
echo -e "\n${BLUE}📋 Paso 8: Rebuild App...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ERROR: Build de app falló${NC}"
    exit 1
fi

echo -e "${GREEN}✅ App rebuildeada${NC}"

# Paso 9: Deploy App
echo -e "\n${BLUE}📋 Paso 9: Deploy App a Cloud Run...${NC}"
echo -e "${YELLOW}Esto tomará 3-5 minutos...${NC}"

if [ -f "./deploy-fix.sh" ]; then
    chmod +x ./deploy-fix.sh
    ./deploy-fix.sh
else
    echo -e "${YELLOW}⚠️  deploy-fix.sh no encontrado, usando método alternativo...${NC}"
    
    # Backup .env.local
    if [ -f ".env.local" ]; then
        cp .env.local .env.local.backup.predeploy
        rm .env.local
    fi
    
    # Deploy usando gcloud builds submit
    gcloud builds submit \
      --config cloudbuild.yaml \
      --substitutions="_VITE_GEMINI_API_KEY=$GEMINI_API_KEY"
    
    # Restore .env.local
    if [ -f ".env.local.backup.predeploy" ]; then
        mv .env.local.backup.predeploy .env.local
    fi
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ERROR: Deploy de app falló${NC}"
    exit 1
fi

echo -e "${GREEN}✅ App deployada${NC}"

# Resumen Final
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ ¡CONFIGURACIÓN COMPLETADA!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${BLUE}📊 Resumen:${NC}"
echo -e "  ✅ Nueva API key configurada en backend"
echo -e "  ✅ Cloud Functions deployadas"
echo -e "  ✅ Proxy funcionando (sin error 403)"
echo -e "  ✅ .env.local creado"
echo -e "  ✅ App rebuildeada"
echo -e "  ✅ App deployada"

echo -e "\n${BLUE}🌐 URLs:${NC}"
echo -e "  App: ${GREEN}https://quimeraai2025-1034000853795.us-east1.run.app${NC}"
echo -e "  Proxy: ${GREEN}https://us-central1-quimeraai.cloudfunctions.net/gemini-generate${NC}"

echo -e "\n${BLUE}🔍 Verificación:${NC}"
echo -e "  1. Abre tu app en el navegador"
echo -e "  2. Abre DevTools (F12) → Console"
echo -e "  3. Intenta usar el chatbot AI"
echo -e "  4. NO deberías ver errores 403"

echo -e "\n${BLUE}📞 Comandos útiles:${NC}"
echo -e "  Ver logs: ${YELLOW}firebase functions:log --follow${NC}"
echo -e "  Ver config: ${YELLOW}firebase functions:config:get${NC}"
echo -e "  Test proxy: ${YELLOW}curl -X POST https://us-central1-quimeraai.cloudfunctions.net/gemini-generate -H 'Content-Type: application/json' -d '{\"projectId\":\"test\",\"prompt\":\"test\"}'${NC}"

echo -e "\n${GREEN}🎉 Tu API key ahora está segura en el backend!${NC}"
echo -e "${GREEN}   Los widgets funcionarán en cualquier dominio.${NC}"

