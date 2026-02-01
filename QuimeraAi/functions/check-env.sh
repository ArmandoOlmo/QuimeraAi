#!/bin/bash
# Script para verificar el estado de las APIs en .env

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Verificando APIs en functions/.env"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")"

if [ ! -f .env ]; then
    echo "❌ ERROR: No existe el archivo .env"
    exit 1
fi

cat .env | grep -E "^(GEMINI|STRIPE|RESEND|CLOUDFLARE|NAMECOM)_" | while read line; do
  key=$(echo "$line" | cut -d'=' -f1)
  value=$(echo "$line" | cut -d'=' -f2-)
  
  # Check if it's a placeholder
  if [[ "$value" == *"tu_"* ]] || [[ "$value" == *"your_"* ]] || [[ "$value" == *"aqui"* ]] || [[ "$value" == *"XXXX"* ]]; then
    echo "❌ $key: NO CONFIGURADO (placeholder)"
  elif [[ -z "$value" ]]; then
    echo "❌ $key: VACÍO"
  else
    echo "✅ $key: CONFIGURADO (${#value} caracteres)"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 APIs críticas para dominios:"
echo "   - CLOUDFLARE_API_TOKEN"
echo "   - CLOUDFLARE_ACCOUNT_ID"
echo ""
echo "💡 Si alguna API no está configurada,"
echo "   edita: functions/.env"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

