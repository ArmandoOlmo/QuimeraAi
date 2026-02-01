#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🔧 Script para Configurar Cloudflare API Token
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 CONFIGURAR CLOUDFLARE API TOKEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar que se proporcionó el token
if [ -z "$1" ]; then
    echo "❌ ERROR: Debes proporcionar el token como argumento"
    echo ""
    echo "USO:"
    echo "   ./CONFIGURAR_CLOUDFLARE_TOKEN.sh YOUR_CLOUDFLARE_API_TOKEN"
    echo ""
    echo "EJEMPLO:"
    echo "   ./CONFIGURAR_CLOUDFLARE_TOKEN.sh abc123def456..."
    echo ""
    exit 1
fi

TOKEN="$1"

echo "📝 Token proporcionado: ${TOKEN:0:20}... (${#TOKEN} caracteres)"
echo ""

# Paso 1: Actualizar Firebase Functions Config
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Actualizando Firebase Functions Config..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

firebase functions:config:set cloudflare.api_token="$TOKEN"

if [ $? -eq 0 ]; then
    echo "✅ Firebase Config actualizado"
else
    echo "❌ Error al actualizar Firebase Config"
    exit 1
fi
echo ""

# Paso 2: Actualizar functions/.env (opcional, para desarrollo local)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Actualizando functions/.env..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "functions/.env" ]; then
    # Backup del archivo original
    cp functions/.env functions/.env.backup
    echo "📦 Backup creado: functions/.env.backup"
    
    # Actualizar el token
    if grep -q "CLOUDFLARE_API_TOKEN=" functions/.env; then
        sed -i '' "s|CLOUDFLARE_API_TOKEN=.*|CLOUDFLARE_API_TOKEN=$TOKEN|g" functions/.env
        echo "✅ functions/.env actualizado"
    else
        echo "CLOUDFLARE_API_TOKEN=$TOKEN" >> functions/.env
        echo "✅ CLOUDFLARE_API_TOKEN agregado a functions/.env"
    fi
else
    echo "⚠️  functions/.env no existe (no es necesario para producción)"
fi
echo ""

# Paso 3: Compilar funciones
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Compilando funciones..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd functions
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Funciones compiladas"
else
    echo "❌ Error al compilar funciones"
    exit 1
fi
cd ..
echo ""

# Paso 4: Desplegar funciones
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Desplegando funciones de dominios..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

firebase deploy --only functions:domains

if [ $? -eq 0 ]; then
    echo "✅ Funciones desplegadas"
else
    echo "❌ Error al desplegar funciones"
    exit 1
fi
echo ""

# Paso 5: Verificar configuración
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Verificando configuración..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CONFIG=$(firebase functions:config:get cloudflare.api_token 2>/dev/null)

if echo "$CONFIG" | grep -q "$TOKEN"; then
    echo "✅ API Token verificado en Firebase Config"
elif echo "$CONFIG" | grep -qv "TU_CLOUDFLARE_API_TOKEN"; then
    echo "✅ API Token configurado (valor diferente al placeholder)"
else
    echo "❌ API Token todavía es placeholder"
    exit 1
fi
echo ""

# Resumen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CONFIGURACIÓN COMPLETADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Resumen:"
echo "   ✅ API Token configurado en Firebase"
echo "   ✅ Funciones compiladas"
echo "   ✅ Funciones desplegadas"
echo ""
echo "🧪 PRÓXIMOS PASOS:"
echo "   1. Recarga tu aplicación web (Cmd+Shift+R)"
echo "   2. Ve a Dominios → Conectar Dominio"
echo "   3. Intenta configurar con Cloudflare"
echo "   4. Ahora debería funcionar sin errores"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

