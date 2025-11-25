# 🚀 Setup de GitHub Actions para QuimeraAI

## ✅ Archivos Creados

1. ✅ `.github/workflows/deploy-cloudrun.yml` - Workflow de deployment
2. ✅ `github-key.json` - Service account key para GitHub

---

## 📋 Pasos para Configurar GitHub

### **Paso 1: Subir el Código a GitHub**

Si aún no has creado el repositorio en GitHub:

1. Ve a https://github.com/new
2. Crea un nuevo repositorio (ejemplo: `QuimeraAI`)
3. **NO** marques "Initialize this repository with a README"

Luego ejecuta estos comandos:

```bash
cd /Users/armandoolmo/QuimeraAppCursor/QuimeraAi

# Si no has inicializado git aún
git init
git add .
git commit -m "Initial commit - QuimeraAI with Cloud Run deployment"

# Conectar con tu repositorio (cambia TU_USUARIO y TU_REPOSITORIO)
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# Subir el código
git branch -M main
git push -u origin main
```

---

### **Paso 2: Configurar Secrets en GitHub**

1. Ve a tu repositorio en GitHub
2. Click en **Settings** → **Secrets and variables** → **Actions**
3. Click en **New repository secret**

Agrega los siguientes secrets:

#### **Secret 1: GCP_SA_KEY**
- Name: `GCP_SA_KEY`
- Value: Copia TODO el contenido del archivo `github-key.json` (ver Paso 3)

#### **Secret 2: VITE_GEMINI_API_KEY**
- Name: `VITE_GEMINI_API_KEY`
- Value: `TU_GEMINI_API_KEY_AQUI` (NO expongas la real aquí)

#### **Secret 3-8: Firebase Variables** (Opcionales, tienen fallbacks)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

---

### **Paso 3: Copiar el Service Account Key**

Ejecuta este comando para ver el contenido:

```bash
cat /Users/armandoolmo/QuimeraAppCursor/QuimeraAi/github-key.json
```

Copia **TODO** el JSON y pégalo como el secret `GCP_SA_KEY` en GitHub.

---

## 🎯 Cómo Funciona

1. **Push a Main**: Cada vez que hagas `git push origin main`, se ejecutará automáticamente el deploy
2. **Manual Deploy**: También puedes ir a **Actions** → **Deploy to Cloud Run** → **Run workflow** para hacer deploy manual

---

## 🌐 URL del Servicio Actual

```
https://quimeraai2025-ucwtex7qka-ue.a.run.app
```

---

## 🔧 Service Account Creado

- **Email**: `github-actions@quimeraapp.iam.gserviceaccount.com`
- **Roles**:
  - Cloud Run Admin
  - Cloud Build Builder
  - Service Account User

---

## 🔒 Seguridad

⚠️ **IMPORTANTE**: El archivo `github-key.json` contiene credenciales sensibles.

**Ya está en `.gitignore`** para que NO se suba a GitHub.

Después de copiar el contenido a GitHub Secrets, puedes eliminarlo:

```bash
rm /Users/armandoolmo/QuimeraAppCursor/QuimeraAi/github-key.json
```

---

## ✅ Checklist

- [ ] Crear repositorio en GitHub
- [ ] Ejecutar `git push origin main`
- [ ] Agregar secret `GCP_SA_KEY` en GitHub
- [ ] Agregar secret `VITE_GEMINI_API_KEY` en GitHub
- [ ] (Opcional) Agregar Firebase secrets
- [ ] Ir a **Actions** y verificar que el deploy se ejecute
- [ ] Eliminar `github-key.json` local

---

## 🆘 Troubleshooting

### El workflow falla con "Permission denied"
- Verifica que agregaste el secret `GCP_SA_KEY` correctamente
- Asegúrate de copiar TODO el JSON, incluyendo las llaves `{}`

### El build falla con "API key not found"
- Verifica que agregaste el secret `VITE_GEMINI_API_KEY`
- El nombre debe ser exacto (case-sensitive)

### No se ejecuta el workflow
- Verifica que el código esté en la rama `main`
- Ve a **Actions** → habilita workflows si están deshabilitados

---

## 📞 Comandos Útiles

```bash
# Ver logs del último deploy en Cloud Run
gcloud run services logs read quimeraai2025 --region us-east1 --limit=50

# Ver el estado del servicio
gcloud run services describe quimeraai2025 --region us-east1

# Ver las últimas builds
gcloud builds list --limit=5
```

