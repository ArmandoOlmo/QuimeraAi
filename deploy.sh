#!/bin/bash

# Script de deploy para Google Cloud Run
# Este script asegura que se use la API key correcta

echo "🚀 Iniciando deploy a Google Cloud Run..."

# Paso 1: Hacer backup del .env.local si existe
if [ -f .env.local ]; then
    echo "📦 Haciendo backup de .env.local..."
    cp .env.local .env.local.backup
    echo "✅ Backup creado: .env.local.backup"
fi

# Paso 2: Eliminar temporalmente el .env.local para el deploy
if [ -f .env.local ]; then
    echo "🗑️  Eliminando .env.local temporal para el deploy..."
    rm .env.local
fi

# Paso 3: Verificar que las API keys estén configuradas
echo "🔍 Verificando variables de entorno..."

if [ -z "$VITE_GEMINI_API_KEY" ]; then
    echo "❌ ERROR: VITE_GEMINI_API_KEY no está configurada"
    echo "Por favor, configura la variable de entorno antes de hacer deploy:"
    echo "  export VITE_GEMINI_API_KEY=your_api_key_here"
    exit 1
fi

# Firebase variables son opcionales (tienen fallbacks en el código)
# pero es mejor configurarlas explícitamente
if [ -z "$VITE_FIREBASE_API_KEY" ]; then
    echo "⚠️  WARNING: VITE_FIREBASE_API_KEY no está configurada (se usará fallback)"
else
    echo "✅ Firebase variables configuradas"
fi

# Paso 4: Hacer el deploy
echo "☁️  Desplegando a Cloud Run..."
TIMESTAMP=$(date +%s)
echo "🔄 Cache bust timestamp: $TIMESTAMP"

# Preparar las variables de build
BUILD_ENV_VARS="VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY,CACHEBUST=$TIMESTAMP"

# Agregar variables de Firebase si están configuradas
if [ ! -z "$VITE_FIREBASE_API_KEY" ]; then
    BUILD_ENV_VARS="$BUILD_ENV_VARS,VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY"
fi
if [ ! -z "$VITE_FIREBASE_AUTH_DOMAIN" ]; then
    BUILD_ENV_VARS="$BUILD_ENV_VARS,VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN"
fi
if [ ! -z "$VITE_FIREBASE_PROJECT_ID" ]; then
    BUILD_ENV_VARS="$BUILD_ENV_VARS,VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID"
fi
if [ ! -z "$VITE_FIREBASE_STORAGE_BUCKET" ]; then
    BUILD_ENV_VARS="$BUILD_ENV_VARS,VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET"
fi
if [ ! -z "$VITE_FIREBASE_MESSAGING_SENDER_ID" ]; then
    BUILD_ENV_VARS="$BUILD_ENV_VARS,VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID"
fi
if [ ! -z "$VITE_FIREBASE_APP_ID" ]; then
    BUILD_ENV_VARS="$BUILD_ENV_VARS,VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID"
fi
if [ ! -z "$VITE_FIREBASE_MEASUREMENT_ID" ]; then
    BUILD_ENV_VARS="$BUILD_ENV_VARS,VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID"
fi

echo "📦 Variables de build configuradas"

gcloud run deploy quimera2025 \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --platform managed \
  --set-build-env-vars "$BUILD_ENV_VARS"

DEPLOY_STATUS=$?

# Paso 5: Restaurar el .env.local desde el backup
if [ -f .env.local.backup ]; then
    echo "♻️  Restaurando .env.local..."
    mv .env.local.backup .env.local
    echo "✅ .env.local restaurado"
fi

if [ $DEPLOY_STATUS -eq 0 ]; then
    echo "✅ Deploy completado exitosamente!"
    echo "🌐 URL: https://quimera2025-1034000853795.us-east1.run.app"
else
    echo "❌ Deploy falló"
    exit 1
fi

