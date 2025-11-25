#!/bin/bash

# Script para verificar el estado de configuración del dominio quimera.ai

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 Verificando estado de quimera.ai${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Verificar DNS
echo -e "${YELLOW}📡 1. Verificando DNS...${NC}"
DNS_IPS=$(dig quimera.ai A +short)
echo "   IPs actuales: $DNS_IPS"

if echo "$DNS_IPS" | grep -q "216.239"; then
    echo -e "   ${GREEN}✅ DNS apunta a Google Cloud${NC}"
elif echo "$DNS_IPS" | grep -q "151.101"; then
    echo -e "   ${GREEN}✅ DNS apunta a Firebase Hosting${NC}"
else
    echo -e "   ${YELLOW}⚠️  DNS puede necesitar actualización${NC}"
fi
echo ""

# 2. Verificar versión en quimeraai.web.app
echo -e "${YELLOW}📦 2. Verificando Firebase Hosting (quimeraai.web.app)...${NC}"
FIREBASE_VERSION=$(curl -sL https://quimeraai.web.app | grep -o 'assets/index-[^"]*\.js' | head -1)
echo "   Versión: $FIREBASE_VERSION"
if [ ! -z "$FIREBASE_VERSION" ]; then
    echo -e "   ${GREEN}✅ Firebase Hosting funcionando${NC}"
fi
echo ""

# 3. Verificar versión en quimera.ai
echo -e "${YELLOW}🌐 3. Verificando quimera.ai...${NC}"
DOMAIN_VERSION=$(curl -sL https://quimera.ai 2>/dev/null | grep -o 'assets/index-[^"]*\.js' | head -1)
if [ ! -z "$DOMAIN_VERSION" ]; then
    echo "   Versión: $DOMAIN_VERSION"
    
    if [ "$DOMAIN_VERSION" = "$FIREBASE_VERSION" ]; then
        echo -e "   ${GREEN}✅ ¡ÉXITO! quimera.ai tiene la misma versión que Firebase${NC}"
    else
        echo -e "   ${YELLOW}⚠️  quimera.ai tiene una versión diferente (puede ser caché)${NC}"
    fi
else
    echo -e "   ${RED}❌ No se pudo conectar a quimera.ai${NC}"
fi
echo ""

# 4. Verificar SSL
echo -e "${YELLOW}🔒 4. Verificando SSL...${NC}"
SSL_INFO=$(curl -sI https://quimera.ai 2>&1 | grep -i "HTTP/")
echo "   $SSL_INFO"
if echo "$SSL_INFO" | grep -q "200"; then
    echo -e "   ${GREEN}✅ SSL funcionando correctamente${NC}"
fi
echo ""

# 5. Resumen
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 RESUMEN${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "   Firebase: $FIREBASE_VERSION"
echo "   quimera.ai: $DOMAIN_VERSION"
echo ""

if [ "$DOMAIN_VERSION" = "$FIREBASE_VERSION" ]; then
    echo -e "${GREEN}✨ ¡TODO PERFECTO! quimera.ai está actualizado${NC}"
else
    echo -e "${YELLOW}⏳ Próximos pasos:${NC}"
    echo ""
    echo "   1. Ve a: https://console.firebase.google.com/project/quimeraai/hosting/sites/quimeraai"
    echo "   2. Click en 'Agregar un dominio personalizado'"
    echo "   3. Ingresa: quimera.ai"
    echo "   4. Sigue las instrucciones de DNS que Firebase te proporcione"
    echo ""
    echo "   📖 Guía completa en: CONFIGURAR_DOMINIO_FIREBASE.md"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

