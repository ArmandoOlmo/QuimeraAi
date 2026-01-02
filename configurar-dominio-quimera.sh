#!/bin/bash

# ===========================================
# Script: Configurar quimera.ai como dominio principal
# ===========================================

set -e

echo "🌐 Configuración de quimera.ai como dominio principal"
echo "======================================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir pasos
print_step() {
    echo -e "${BLUE}[$1]${NC} $2"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "firebase.json" ]; then
    print_error "Este script debe ejecutarse desde la raíz del proyecto QuimeraAi"
    exit 1
fi

echo ""
echo "Este script te guiará en la configuración de quimera.ai"
echo "como dominio principal para Firebase Authentication."
echo ""
echo "-------------------------------------------"
echo ""

# ===========================================
# PASO 1: Verificar configuración actual
# ===========================================
print_step "1/6" "Verificando configuración actual..."

# Verificar si existe .env
if [ -f ".env" ]; then
    CURRENT_AUTH_DOMAIN=$(grep "VITE_FIREBASE_AUTH_DOMAIN" .env 2>/dev/null | cut -d '=' -f2 || echo "no configurado")
    echo "   Auth Domain actual: $CURRENT_AUTH_DOMAIN"
else
    echo "   No se encontró archivo .env"
    CURRENT_AUTH_DOMAIN="no configurado"
fi

echo ""

# ===========================================
# PASO 2: Instrucciones para Firebase Console
# ===========================================
print_step "2/6" "Configuración en Firebase Console (MANUAL)"
echo ""
echo "   📋 Abre estas URLs y sigue las instrucciones:"
echo ""
echo "   1. Firebase Hosting - Agregar dominio personalizado:"
echo "      ${BLUE}https://console.firebase.google.com/project/quimeraai/hosting${NC}"
echo "      → Haz clic en 'Add custom domain'"
echo "      → Ingresa: quimera.ai"
echo ""
echo "   2. Firebase Auth - Autorizar dominio:"
echo "      ${BLUE}https://console.firebase.google.com/project/quimeraai/authentication/settings${NC}"
echo "      → En 'Authorized domains', agrega: quimera.ai"
echo ""
read -p "   Presiona ENTER cuando hayas completado estos pasos..."

# ===========================================
# PASO 3: Instrucciones para Google Cloud
# ===========================================
print_step "3/6" "Configuración en Google Cloud Console (MANUAL)"
echo ""
echo "   📋 Abre esta URL:"
echo "      ${BLUE}https://console.cloud.google.com/apis/credentials?project=quimeraai${NC}"
echo ""
echo "   → Edita tu OAuth 2.0 Client ID (Web application)"
echo "   → En 'Authorized JavaScript origins', agrega:"
echo "      https://quimera.ai"
echo ""
echo "   → En 'Authorized redirect URIs', agrega:"
echo "      https://quimera.ai/__/auth/handler"
echo ""
read -p "   Presiona ENTER cuando hayas completado estos pasos..."

# ===========================================
# PASO 4: Actualizar .env local
# ===========================================
print_step "4/6" "Actualizando configuración local..."
echo ""

if [ -f ".env" ]; then
    # Hacer backup
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    print_success "Backup de .env creado"
    
    # Actualizar o agregar VITE_FIREBASE_AUTH_DOMAIN
    if grep -q "VITE_FIREBASE_AUTH_DOMAIN" .env; then
        # Reemplazar valor existente
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' 's/VITE_FIREBASE_AUTH_DOMAIN=.*/VITE_FIREBASE_AUTH_DOMAIN=quimera.ai/' .env
        else
            sed -i 's/VITE_FIREBASE_AUTH_DOMAIN=.*/VITE_FIREBASE_AUTH_DOMAIN=quimera.ai/' .env
        fi
        print_success "VITE_FIREBASE_AUTH_DOMAIN actualizado a quimera.ai"
    else
        echo "VITE_FIREBASE_AUTH_DOMAIN=quimera.ai" >> .env
        print_success "VITE_FIREBASE_AUTH_DOMAIN agregado"
    fi
else
    print_warning "No existe archivo .env"
    echo ""
    echo "   Crea un archivo .env con el siguiente contenido:"
    echo "   VITE_FIREBASE_AUTH_DOMAIN=quimera.ai"
    echo ""
fi

# ===========================================
# PASO 5: Construir proyecto
# ===========================================
print_step "5/6" "¿Deseas construir y desplegar ahora? (s/n)"
read -p "   > " BUILD_NOW

if [ "$BUILD_NOW" = "s" ] || [ "$BUILD_NOW" = "S" ]; then
    echo ""
    echo "   Construyendo proyecto..."
    npm run build
    
    print_success "Build completado"
    echo ""
    
    echo "   Desplegando a Firebase Hosting..."
    firebase deploy --only hosting
    
    print_success "Deploy completado"
else
    echo ""
    print_warning "Recuerda ejecutar estos comandos manualmente:"
    echo "   npm run build"
    echo "   firebase deploy --only hosting"
fi

# ===========================================
# PASO 6: Verificación
# ===========================================
echo ""
print_step "6/6" "Verificación final"
echo ""
echo "   📋 Checklist de verificación:"
echo ""
echo "   [ ] https://quimera.ai carga correctamente"
echo "   [ ] El certificado SSL es válido (candado verde)"
echo "   [ ] Login con Google funciona"
echo "   [ ] La pantalla de Google muestra 'quimera.ai'"
echo ""
echo "   ⏱️  Nota: La propagación DNS puede tardar hasta 48 horas"
echo "   ⏱️  El certificado SSL puede tardar hasta 24 horas"
echo ""

# ===========================================
# Resumen
# ===========================================
echo "======================================================"
echo "🎉 Configuración completada"
echo "======================================================"
echo ""
echo "📖 Para más detalles, consulta:"
echo "   docs/CONFIGURAR_DOMINIO_QUIMERA.md"
echo ""
echo "🔧 Si encuentras problemas, verifica:"
echo "   1. DNS configurado correctamente en Cloudflare"
echo "   2. Dominio autorizado en Firebase Auth"
echo "   3. OAuth URIs en Google Cloud Console"
echo ""


