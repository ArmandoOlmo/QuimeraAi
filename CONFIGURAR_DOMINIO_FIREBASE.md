# 🌐 Configurar quimera.ai en Firebase Hosting

## ✅ Estado Actual

- **Firebase Hosting**: `quimeraai.web.app` tiene los últimos cambios (index-FSpskM6L.js)
- **Dominio**: `quimera.ai` necesita ser configurado

## 📋 Pasos para Configurar el Dominio Personalizado

### 1️⃣ Agregar el Dominio en Firebase Console

1. **Abre la consola** (ya debería estar abierta):
   https://console.firebase.google.com/project/quimeraai/hosting/sites/quimeraai

2. **Click en "Agregar un dominio personalizado"** (botón azul en la sección "Dominios")

3. **Ingresa**: `quimera.ai`

4. **Click en "Continuar"**

### 2️⃣ Configurar DNS

Firebase te mostrará registros DNS que necesitas configurar. Típicamente serán:

#### Para el dominio raíz (quimera.ai):

```
Tipo: A
Nombre: @
Valor: 151.101.1.195
       151.101.65.195
```

O si usa CNAME:

```
Tipo: CNAME
Nombre: @
Valor: quimeraai.web.app
```

#### Para www (opcional):

```
Tipo: CNAME
Nombre: www
Valor: quimeraai.web.app
```

### 3️⃣ Actualizar DNS en name.com

1. Ve a: https://www.name.com/account/domain/details/quimera.ai#dns
2. Encuentra los registros A actuales que apuntan a Firebase (216.239.x.x)
3. **IMPORTANTE**: NO los elimines, Firebase los usa para verificación
4. Agrega los nuevos registros que Firebase te indique
5. Si Firebase pide cambiar los registros A, actualízalos

### 4️⃣ Verificación

Una vez configurado el DNS:
- Firebase verificará automáticamente el dominio
- Puede tardar **5-10 minutos** en verificarse
- Una vez verificado, el SSL se provisionará automáticamente (otros 15 min)

## 🚀 Comandos Útiles

### Verificar el estado del dominio:
```bash
# Ver dominios configurados
firebase hosting:channel:list --project=quimeraai --site=quimeraai

# Verificar la versión deployada
curl -sL https://quimeraai.web.app | grep -o 'assets/index-[^"]*\.js'
```

### Si necesitas redesplegar:
```bash
npm run build
firebase deploy --only hosting --project=quimeraai
```

## 📊 URLs Actuales

- **Firebase Hosting**: https://quimeraai.web.app ✅ (versión actual)
- **Cloud Run**: https://quimeraai2025-ucwtex7qka-ue.a.run.app ✅ (también actualizado)
- **Dominio personalizado**: https://quimera.ai ⏳ (pendiente de configurar)

## 💡 Ventajas de Firebase Hosting vs Cloud Run

✅ **Caché más inteligente** - Se actualiza automáticamente con cada deploy
✅ **SSL gratuito** - Provisionado automáticamente
✅ **CDN global** - Mejor performance
✅ **Integración con Cloud Functions** - Para las APIs de Gemini
✅ **Sin costo por request** - A diferencia de Cloud Run

## ⚠️ Nota Importante

El mapeo de dominio que teníamos en Cloud Run ya fue eliminado, así que quimera.ai
está libre para ser configurado en Firebase Hosting.

## 🆘 ¿Problemas?

Si tienes algún error:
1. Verifica que los DNS estén correctamente configurados en name.com
2. Espera 5-10 minutos para la propagación de DNS
3. Verifica en la consola de Firebase que el dominio esté "Conectado"

---

**Última actualización**: 24 de noviembre 2025, 15:50





