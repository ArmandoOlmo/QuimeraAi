# 🚀 INICIO RÁPIDO - Gemini Proxy

## ✅ ¿Qué se implementó?

Se creó un **backend proxy seguro** que permite a tus chatbots embedidos funcionar en **cualquier dominio** sin exponer tu API key de Gemini.

### Beneficios:
1. ✅ **API keys seguras** - Nunca expuestas al cliente
2. ✅ **Widgets funcionan en cualquier dominio** - Sin restricciones
3. ✅ **Rate limiting automático** - Control de uso
4. ✅ **Escalable** - No hay límite de dominios
5. ✅ **Auditoría completa** - Tracking de uso y tokens

---

## 📋 3 Pasos para Activar

### Paso 1: Configurar API Key en Cloud Functions (1 minuto)

```bash
firebase functions:config:set gemini.api_key="TU_GEMINI_API_KEY"
```

> **Obtén tu API key en:** https://aistudio.google.com/app/apikey

### Paso 2: Deployar Cloud Functions (3-5 minutos)

```bash
./deploy-cloud-functions.sh
```

Este script:
- ✅ Instala dependencias
- ✅ Construye TypeScript  
- ✅ Deploya 3 funciones (generate, stream, usage)
- ✅ Muestra las URLs de las funciones

### Paso 3: Actualizar Variables de Entorno (30 segundos)

Agrega a tu `.env.local`:

```env
VITE_GEMINI_PROXY_URL=https://us-central1-quimeraai.cloudfunctions.net/gemini
VITE_USE_GEMINI_PROXY=false
```

> **Nota:** En producción (Cloud Run), el proxy se activa automáticamente.

---

## 🧪 Test Rápido

Después del deployment, prueba con:

```bash
curl -X POST https://us-central1-quimeraai.cloudfunctions.net/gemini-generate \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test",
    "prompt": "Hola, ¿cómo estás?",
    "model": "gemini-1.5-flash"
  }'
```

**Respuesta esperada:**
```json
{
  "response": {
    "candidates": [{
      "content": {
        "parts": [{ "text": "¡Hola! Estoy bien, gracias por preguntar..." }]
      }
    }]
  },
  "metadata": {
    "tokensUsed": 25,
    "model": "gemini-1.5-flash",
    "remaining": 9
  }
}
```

---

## 🎯 ¿Qué pasa ahora con tus usuarios?

### Antes:
- ❌ Los widgets embedidos solo funcionaban en dominios específicos
- ❌ Limitado a 400 dominios
- ❌ API key expuesta

### Después:
- ✅ Los widgets funcionan en **cualquier dominio**
- ✅ **Sin límites** de dominios
- ✅ API key **100% segura**
- ✅ Rate limiting automático
- ✅ Tracking de uso

**¡Tus usuarios pueden embeber chatbots donde quieran!** 🎉

---

## 🔒 ¿Ahora puedo configurar restricciones?

### SÍ, pero con un cambio:

#### Para Firebase API Key:
✅ **SÍ configura restricciones** (como antes):
- `https://*.run.app/*`
- `http://localhost/*`

Ejecuta:
```bash
./configure-api-restrictions.sh
```

#### Para Gemini API Key:
✅ **Ya NO necesitas restricciones de dominio** 🎉
- La API key nunca se expone al cliente
- Solo restringe a "Generative Language API" (por seguridad)

---

## 📊 Rate Limiting Configurado

| Plan | Requests/Minuto | Requests/Día |
|------|----------------|--------------|
| FREE | 10 | 1,000 |
| PRO | 50 | 10,000 |
| ENTERPRISE | 200 | 100,000 |

Se aplica automáticamente por proyecto.

---

## 📚 Documentación Completa

- **Setup detallado:** `GEMINI_PROXY_SETUP.md`
- **Resumen técnico:** `PROXY_IMPLEMENTATION_SUMMARY.md`
- **Configuración de seguridad:** `SEGURIDAD_API_KEYS.md`

---

## 🔧 Archivos Creados

### Backend:
- `functions/src/geminiProxy.ts` - Cloud Functions del proxy
- `functions/src/index.ts` - Exportaciones (actualizado)

### Frontend:
- `utils/geminiProxyClient.ts` - Cliente JavaScript
- `utils/genAiClient.ts` - Integración (actualizado)

### Scripts:
- `deploy-cloud-functions.sh` - Deploy automatizado

### Documentación:
- `GEMINI_PROXY_SETUP.md` - Guía completa
- `PROXY_IMPLEMENTATION_SUMMARY.md` - Resumen técnico
- `ENV_PROXY_EXAMPLE.txt` - Template de variables
- `START_HERE_PROXY.md` - Este archivo

---

## 🆘 Troubleshooting

### "GEMINI_API_KEY not configured"
```bash
firebase functions:config:set gemini.api_key="TU_KEY"
firebase deploy --only functions
```

### "Project not found"
- Verifica que el proyecto existe en Firestore
- Verifica que el chatbot está activo

### Logs de Cloud Functions:
```bash
firebase functions:log --follow
```

### Ver configuración actual:
```bash
firebase functions:config:get
```

---

## ✅ Checklist de Deployment

- [ ] API key configurada en Cloud Functions
- [ ] Cloud Functions deployadas exitosamente
- [ ] Variables agregadas a `.env.local`
- [ ] Test con curl exitoso
- [ ] App principal rebuilded
- [ ] App principal deployada
- [ ] Restricciones de Firebase API configuradas
- [ ] Todo funciona sin errores

---

## 🎉 ¡Listo!

Con esto, tus chatbots ahora están protegidos y funcionan en cualquier dominio.

**Siguiente paso:** Rebuild y redeploy tu app principal:

```bash
npm run build
./deploy-fix.sh
```

---

## 📞 Comandos Útiles

```bash
# Ver funciones deployadas
firebase functions:list

# Ver logs en tiempo real
firebase functions:log --follow

# Ver configuración
firebase functions:config:get

# Redeploy solo funciones
firebase deploy --only functions

# Test rápido
curl -X POST [URL]/gemini-generate \
  -H "Content-Type: application/json" \
  -d '{"projectId":"test","prompt":"test"}'
```

---

**¿Preguntas?** Consulta `GEMINI_PROXY_SETUP.md` para guía completa.












