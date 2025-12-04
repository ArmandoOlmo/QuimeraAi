# 🚀 CONFIGURAR RESTRICCIONES DE API - GUÍA RÁPIDA

## ⏱️ Tiempo estimado: 5 minutos

---

## 🎯 Tu información específica

**URL de tu aplicación:**
```
https://quimeraai2025-1034000853795.us-east1.run.app
```

**Proyecto Google Cloud:**
```
quimeraai
```

---

## 📋 PASO 1: Configurar Gemini API Key

### 🔗 Abrir configuración

Ejecuta este comando para abrir la página correcta:

```bash
open "https://aistudio.google.com/app/apikey"
```

O ve manualmente a: https://aistudio.google.com/app/apikey

### ⚙️ Configurar restricciones

1. **Encuentra tu API key** en la lista
2. **Click en el ícono de configuración** (⚙️) o "..." → "Edit"
3. **Configura Application restrictions:**
   - Selecciona: `HTTP referrers (web sites)`
   - Click en "ADD AN ITEM"
   - Agrega estos **3 referrers** (uno por uno):
   
   ```
   https://*.run.app/*
   ```
   
   ```
   http://localhost/*
   ```
   
   ```
   http://localhost:5173/*
   ```

4. **Configura API restrictions:**
   - Selecciona: `Restrict key`
   - Busca y marca: `Generative Language API`
   - Desmarca todas las demás

5. **Click en "SAVE"**

### ✅ Verificación
- ¿Tienes los 3 referrers agregados? ✓
- ¿Solo está marcado "Generative Language API"? ✓
- ¿Guardaste los cambios? ✓

---

## 📋 PASO 2: Configurar Firebase API Key

### 🔗 Abrir configuración

Ejecuta este comando:

```bash
open "https://console.cloud.google.com/apis/credentials?project=quimeraai"
```

O ve manualmente a: https://console.cloud.google.com/apis/credentials?project=quimeraai

### ⚙️ Configurar restricciones

1. **Busca "Browser key (auto created by Firebase)"** o una key que diga "AIzaSyBs_MbMSN6BCD1..."

2. **Click en el ícono de lápiz** (Edit) a la derecha

3. **Configura Application restrictions:**
   - Selecciona: `HTTP referrers (web sites)`
   - Click en "ADD AN ITEM"
   - Agrega estos **3 referrers** (uno por uno):
   
   ```
   https://*.run.app/*
   ```
   
   ```
   http://localhost/*
   ```
   
   ```
   http://localhost:5173/*
   ```

4. **API restrictions:**
   - Puedes dejar: `Don't restrict key`
   - (Firebase ya tiene sus propias reglas de seguridad)

5. **Click en "SAVE"**

### ✅ Verificación
- ¿Tienes los 3 referrers agregados? ✓
- ¿Guardaste los cambios? ✓

---

## 🧪 PASO 3: Probar que funciona

### 1️⃣ Espera 1-2 minutos

Los cambios tardan un poco en propagarse. Tómate un café ☕

### 2️⃣ Prueba en producción

```bash
open "https://quimeraai2025-1034000853795.us-east1.run.app"
```

- Abre las DevTools (F12) → Console
- Intenta usar una funcionalidad con AI
- **NO deberías ver errores 403 o "API key restricted"**

### 3️⃣ Prueba en local

```bash
npm run dev
```

- Abre http://localhost:5173
- Intenta usar una funcionalidad con AI
- **Debería funcionar igual que antes**

---

## 🚨 Si algo falla

### Error: "API key not valid" o 403

**Solución:**
1. Verifica que usaste **exactamente** estos formatos:
   - `https://*.run.app/*` (no olvides `https://` y `/*`)
   - `http://localhost/*` (no olvides `http://` y `/*`)
2. Espera 2-3 minutos más (a veces tarda)
3. Limpia el caché del navegador (Cmd+Shift+R en Mac)
4. Recarga la página

### Error: "This API project is not authorized"

**Solución:**
1. Ve a API restrictions
2. Asegúrate de tener marcado: `Generative Language API`
3. Guarda de nuevo

### Sigue sin funcionar

Ejecuta estos comandos para ver los logs:

```bash
# Ver logs de tu aplicación
gcloud run services logs read quimeraai2025 --region us-east1 --limit=20

# Ver qué APIs están habilitadas
gcloud services list --enabled --project=quimeraai
```

---

## ✅ Checklist Final

- [ ] Configuré restricciones para Gemini API Key
  - [ ] Agregué `https://*.run.app/*`
  - [ ] Agregué `http://localhost/*`
  - [ ] Agregué `http://localhost:5173/*`
  - [ ] Solo marqué "Generative Language API"
  - [ ] Guardé los cambios

- [ ] Configuré restricciones para Firebase API Key
  - [ ] Agregué `https://*.run.app/*`
  - [ ] Agregué `http://localhost/*`
  - [ ] Agregué `http://localhost:5173/*`
  - [ ] Guardé los cambios

- [ ] Probé la aplicación
  - [ ] Funciona en producción (Cloud Run)
  - [ ] Funciona en local (localhost)
  - [ ] No hay errores en la consola

---

## 🎉 ¡Felicidades!

Tus API keys ahora están protegidas. Solo funcionarán en:
- ✅ Tu aplicación de Cloud Run
- ✅ Tu máquina local (desarrollo)
- ❌ Ningún otro sitio web

**Nivel de seguridad actual:** 🛡️🛡️🛡️🛡️ (4/5)

---

## 📞 Comandos útiles para copiar/pegar

```bash
# Abrir Google AI Studio (Gemini API)
open "https://aistudio.google.com/app/apikey"

# Abrir Google Cloud Console (Firebase API)
open "https://console.cloud.google.com/apis/credentials?project=quimeraai"

# Ver tu aplicación en producción
open "https://quimeraai2025-1034000853795.us-east1.run.app"

# Ver logs
gcloud run services logs read quimeraai2025 --region us-east1 --limit=20

# Iniciar servidor local
npm run dev

# Ver script con todos los detalles
./configure-api-restrictions.sh
```

---

## 🔄 Resumen en 3 pasos

1. **Gemini API:** https://aistudio.google.com/app/apikey
   - Agregar 3 dominios → Restringir a Generative Language API → Guardar

2. **Firebase API:** https://console.cloud.google.com/apis/credentials
   - Buscar "Browser key" → Agregar 3 dominios → Guardar

3. **Probar:** Abrir app → DevTools → Sin errores ✅

**¿Listo para empezar?** 🚀















