# 🚀 Guía de Deploy - QuimeraAI

## URLs de Producción
- **Dominio principal**: https://quimera.ai
- **Dominio Firebase**: https://quimeraai.web.app

---

## 📝 Cómo hacer Deploy

### Opción 1: Deploy Automático (Recomendado)
Cada vez que hagas push a `main`, el deploy se ejecuta automáticamente.

```bash
# 1. Agrega tus cambios
git add .

# 2. Crea un commit con descripción
git commit -m "Descripción de los cambios"

# 3. Push a main
git push origin main
```

**⏱️ Tiempo de deploy: ~1-2 minutos**

---

### Opción 2: Deploy Manual desde GitHub
1. Ve a: https://github.com/ArmandoOlmo/QuimeraAi/actions
2. Click en **"🚀 Deploy to Firebase"**
3. Click en **"Run workflow"** → **"Run workflow"**

---

### Opción 3: Deploy sin cambios (Re-deploy)
```bash
git commit --allow-empty -m "Trigger deploy"
git push origin main
```

---

## ✅ Verificar el Deploy

1. **GitHub Actions**: https://github.com/ArmandoOlmo/QuimeraAi/actions
   - Busca el workflow "🚀 Deploy to Firebase"
   - Status verde = ✅ Deploy exitoso

2. **Probar la app**: https://quimeraai.web.app

---

## 🔧 Solución de Problemas

### El deploy falla
1. Ve a GitHub Actions
2. Click en el workflow fallido
3. Revisa los logs del paso que falló

### Cambios no aparecen en producción
- Espera 1-2 minutos después del push
- Haz hard refresh: `Ctrl+Shift+R` (Windows) o `Cmd+Shift+R` (Mac)
- Verifica que el workflow pasó en GitHub Actions

### Error de autenticación
Los secrets están configurados en: 
`GitHub → Settings → Secrets → Actions`

---

## 📋 Secrets Configurados

| Secret | Descripción |
|--------|-------------|
| `FIREBASE_SERVICE_ACCOUNT` | JSON de service account |
| `VITE_FIREBASE_API_KEY` | API Key de Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | quimera.ai |
| `VITE_FIREBASE_PROJECT_ID` | quimeraai |
| `VITE_FIREBASE_STORAGE_BUCKET` | quimeraai.firebasestorage.app |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ID del sender |
| `VITE_FIREBASE_APP_ID` | ID de la app |
| `VITE_FIREBASE_MEASUREMENT_ID` | ID de Analytics |
| `VITE_GEMINI_API_KEY` | API Key de Google AI |

---

## 🌐 Dominio Personalizado (quimera.ai)

Para usar `quimera.ai` como dominio principal y que aparezca en el login de Google:

```bash
# Ejecuta el script de configuración
chmod +x configurar-dominio-quimera.sh
./configurar-dominio-quimera.sh
```

O consulta la guía completa: [docs/CONFIGURAR_DOMINIO_QUIMERA.md](docs/CONFIGURAR_DOMINIO_QUIMERA.md)

---

## 🔗 Links Útiles

- **App en producción**: https://quimera.ai
- **App Firebase**: https://quimeraai.web.app
- **GitHub Actions**: https://github.com/ArmandoOlmo/QuimeraAi/actions
- **Firebase Console**: https://console.firebase.google.com/project/quimeraai
- **GitHub Secrets**: https://github.com/ArmandoOlmo/QuimeraAi/settings/secrets/actions























