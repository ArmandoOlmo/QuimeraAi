#!/bin/bash

# Script para conectar quimera.ai a Firebase Hosting
# Este script ayuda a configurar el dominio personalizado en Firebase

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_ID="quimeraai"
SITE_ID="quimeraai"
DOMAIN="quimera.ai"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🌐 Conectando ${CYAN}${DOMAIN}${BLUE} a Firebase Hosting${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar que Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI no está instalado${NC}"
    echo -e "${YELLOW}   Instala con: npm install -g firebase-tools${NC}"
    exit 1
fi

# Verificar autenticación
echo -e "${YELLOW}🔐 Verificando autenticación de Firebase...${NC}"
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}   No estás autenticado. Iniciando login...${NC}"
    firebase login
fi
echo -e "${GREEN}✅ Autenticado${NC}"
echo ""

# Verificar estado actual del dominio
echo -e "${YELLOW}📡 Verificando estado actual de ${DOMAIN}...${NC}"
DNS_IPS=$(dig ${DOMAIN} A +short 2>/dev/null | head -3)
if [ ! -z "$DNS_IPS" ]; then
    echo -e "   IPs actuales: ${CYAN}$DNS_IPS${NC}"
    
    if echo "$DNS_IPS" | grep -q "151.101"; then
        echo -e "   ${GREEN}✅ DNS ya apunta a Firebase Hosting${NC}"
    elif echo "$DNS_IPS" | grep -q "216.239"; then
        echo -e "   ${YELLOW}⚠️  DNS apunta a Google Cloud (Cloud Run)${NC}"
        echo -e "   ${YELLOW}   Necesitarás actualizar los registros DNS${NC}"
    else
        echo -e "   ${YELLOW}⚠️  DNS apunta a otra ubicación${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  No se encontraron registros A para ${DOMAIN}${NC}"
fi
echo ""

# Verificar si el dominio ya está en Firebase
echo -e "${YELLOW}🔍 Verificando si ${DOMAIN} ya está configurado en Firebase...${NC}"
DOMAIN_STATUS=$(firebase hosting:sites:get ${SITE_ID} --project=${PROJECT_ID} 2>&1)

# Intentar obtener información del dominio
echo -e "${CYAN}📋 Información del sitio Firebase:${NC}"
firebase hosting:sites:get ${SITE_ID} --project=${PROJECT_ID} 2>/dev/null || echo "   No se pudo obtener información del sitio"
echo ""

# Mostrar instrucciones
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📝 PASOS PARA CONFIGURAR EL DOMINIO${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}1. Abre la consola de Firebase Hosting:${NC}"
echo -e "   ${YELLOW}https://console.firebase.google.com/project/${PROJECT_ID}/hosting/sites/${SITE_ID}${NC}"
echo ""
echo -e "${CYAN}2. Haz clic en 'Agregar un dominio personalizado'${NC}"
echo ""
echo -e "${CYAN}3. Ingresa el dominio: ${GREEN}${DOMAIN}${NC}"
echo ""
echo -e "${CYAN}4. Firebase te mostrará los registros DNS que necesitas configurar${NC}"
echo ""
echo -e "${CYAN}5. Actualiza los registros DNS en tu proveedor (name.com):${NC}"
echo -e "   ${YELLOW}https://www.name.com/account/domain/details/${DOMAIN}#dns${NC}"
echo ""
echo -e "${CYAN}6. Los registros típicamente serán:${NC}"
echo -e "   ${YELLOW}Tipo A:${NC}"
echo -e "   ${YELLOW}   Host: @${NC}"
echo -e "   ${YELLOW}   Valor: 151.101.1.195 (o el que Firebase indique)${NC}"
echo -e "   ${YELLOW}   Valor: 151.101.65.195 (o el que Firebase indique)${NC}"
echo ""
echo -e "${CYAN}7. Para www (opcional):${NC}"
echo -e "   ${YELLOW}Tipo CNAME:${NC}"
echo -e "   ${YELLOW}   Host: www${NC}"
echo -e "   ${YELLOW}   Valor: ${SITE_ID}.web.app${NC}"
echo ""
echo -e "${CYAN}8. Espera 5-10 minutos para la verificación${NC}"
echo -e "   ${YELLOW}Firebase verificará automáticamente y provisionará SSL${NC}"
echo ""

# Verificar si hay un deploy reciente
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 VERIFICACIÓN DE DEPLOY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

FIREBASE_VERSION=$(curl -sL https://${SITE_ID}.web.app 2>/dev/null | grep -o 'assets/index-[^"]*\.js' | head -1)
if [ ! -z "$FIREBASE_VERSION" ]; then
    echo -e "${GREEN}✅ Firebase Hosting está funcionando${NC}"
    echo -e "   Versión actual: ${CYAN}${FIREBASE_VERSION}${NC}"
    echo ""
    echo -e "${YELLOW}💡 Si necesitas redesplegar:${NC}"
    echo -e "   ${CYAN}npm run build${NC}"
    echo -e "   ${CYAN}firebase deploy --only hosting --project=${PROJECT_ID}${NC}"
else
    echo -e "${YELLOW}⚠️  No se pudo verificar la versión en Firebase Hosting${NC}"
fi
echo ""

# Script de monitoreo
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 MONITOREO${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Para monitorear el estado del dominio después de configurar DNS:${NC}"
echo -e "   ${YELLOW}./verificar-dominio.sh${NC}"
echo ""
echo -e "${CYAN}O ejecuta este comando para verificar manualmente:${NC}"
echo -e "   ${YELLOW}curl -sI https://${DOMAIN} | head -5${NC}"
echo ""

echo -e "${GREEN}✨ Script completado${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"



