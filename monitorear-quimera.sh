#!/bin/bash

# Script de monitoreo para verificar cuándo quimera.ai esté listo

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

clear
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔄 Monitoreando quimera.ai${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Contador de intentos
ATTEMPT=1
MAX_ATTEMPTS=20
WAIT_TIME=30

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo -e "${YELLOW}📍 Intento $ATTEMPT de $MAX_ATTEMPTS${NC} ($(date '+%H:%M:%S'))"
    echo ""
    
    # 1. Verificar DNS
    echo -n "   DNS A Record: "
    DNS_IP=$(dig quimera.ai A +short | head -1)
    if [ ! -z "$DNS_IP" ]; then
        echo -e "${GREEN}$DNS_IP ✅${NC}"
    else
        echo -e "${RED}No configurado ❌${NC}"
    fi
    
    # 2. Verificar HTTP
    echo -n "   HTTP (puerto 80): "
    HTTP_STATUS=$(curl -sL --max-time 5 -o /dev/null -w "%{http_code}" http://quimera.ai 2>/dev/null)
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
        echo -e "${GREEN}$HTTP_STATUS ✅${NC}"
    else
        echo -e "${YELLOW}$HTTP_STATUS ⏳${NC}"
    fi
    
    # 3. Verificar HTTPS
    echo -n "   HTTPS (SSL): "
    HTTPS_RESPONSE=$(curl -sL --max-time 5 https://quimera.ai 2>&1)
    
    if echo "$HTTPS_RESPONSE" | grep -q "assets/index-"; then
        VERSION=$(echo "$HTTPS_RESPONSE" | grep -o 'assets/index-[^"]*\.js' | head -1)
        echo -e "${GREEN}$VERSION ✅${NC}"
        
        # Comparar con Firebase
        FIREBASE_VERSION=$(curl -sL https://quimeraai.web.app 2>/dev/null | grep -o 'assets/index-[^"]*\.js' | head -1)
        
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✨ ¡ÉXITO! quimera.ai está funcionando${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "   🌐 quimera.ai: ${GREEN}$VERSION${NC}"
        echo -e "   📦 Firebase: $FIREBASE_VERSION"
        echo ""
        
        if [ "$VERSION" = "$FIREBASE_VERSION" ]; then
            echo -e "${GREEN}   ✅ ¡Las versiones coinciden! Todo perfecto.${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Versiones diferentes (puede ser caché temporal)${NC}"
        fi
        
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        # Abrir el sitio en el navegador
        echo ""
        read -p "¿Quieres abrir quimera.ai en el navegador? (s/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[SsYy]$ ]]; then
            open "https://quimera.ai"
        fi
        
        exit 0
    else
        echo -e "${YELLOW}No disponible ⏳${NC}"
    fi
    
    echo ""
    
    # Si no es el último intento, esperar
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo -e "${BLUE}   ⏱️  Esperando ${WAIT_TIME} segundos antes del próximo intento...${NC}"
        echo ""
        sleep $WAIT_TIME
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⏰ Tiempo de espera agotado${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "El certificado SSL puede tardar hasta 24 horas en algunos casos."
echo "Por favor verifica el estado en:"
echo "https://console.firebase.google.com/project/quimeraai/hosting/sites/quimeraai"
echo ""



