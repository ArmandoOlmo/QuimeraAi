#!/bin/bash

# Script para encontrar en qué proyecto de Firebase está configurado quimera.ai

echo "🔍 Buscando dominio quimera.ai en proyectos de Firebase..."
echo ""

PROJECTS=("quimeraai" "quimera-502e2" "quimera-469115" "quimeraapp" "quimerastudio")

for project in "${PROJECTS[@]}"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Proyecto: $project"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Intentar listar sitios
    sites=$(firebase hosting:sites:list --project=$project 2>&1)
    
    if echo "$sites" | grep -q "could not find sites"; then
        echo "❌ No tiene Firebase Hosting configurado"
    elif echo "$sites" | grep -q "Error"; then
        echo "❌ Error al acceder: $(echo "$sites" | head -1)"
    else
        echo "✅ Sitios encontrados:"
        echo "$sites"
        
        # Intentar obtener más información del sitio
        site_id=$(echo "$sites" | grep -o "$project[^ ]*" | head -1)
        if [ ! -z "$site_id" ]; then
            echo ""
            echo "🔗 Verificando último deploy..."
            firebase hosting:channel:list --project=$project --site=$site_id 2>&1 | grep -A 2 "live"
        fi
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Búsqueda completada"
echo ""
echo "💡 TIP: El proyecto que muestre quimera.ai como dominio personalizado"
echo "       es donde necesitas hacer el deploy"

