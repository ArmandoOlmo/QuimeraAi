# 🛡️ Configuración Segura de API Keys - Firebase/Google Cloud

> **IMPORTANTE**: Esta configuración debe realizarse manualmente en la [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

## Contexto

Las API Keys de Firebase son **públicas por diseño**. Google exige "Restricciones de Referer" para que solo tus dominios autorizados puedan usarlas. Sin estas restricciones, cualquier sitio web podría usar tu API Key.

---

## 1. Acceso a la Configuración

1. Abre [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Selecciona el proyecto: **`quimeraai`**
3. En la sección "API Keys", haz clic en la key que usa tu aplicación web

---

## 2. Restricción por Sitio Web (Capa de Aplicación)

Esta capa asegura que la llave **solo funcione en tus dominios**.

### Configuración

En **"Application restrictions"** → selecciona **"HTTP referrers (websites)"**

Añade estos patrones en **"Website restrictions"**:

```
https://quimera.ai/*
https://quimeraai.web.app/*
https://quimeraai--*.web.app/*
```

### ¿Por qué estos patrones?

| Patrón | Propósito |
|--------|-----------|
| `https://quimera.ai/*` | Tu dominio de producción oficial |
| `https://quimeraai.web.app/*` | El dominio base de Firebase Hosting |
| `https://quimeraai--*.web.app/*` | **CLAVE**: El doble guion (`--`) autoriza SOLO los subdominios de preview que Firebase genera para tus deploys de staging (ej: `quimeraai--preview-abc123.web.app`), bloqueando el resto de sitios genéricos de `.web.app` |

---

## 3. Restricción por Servicio (Capa de API)

Esta capa asegura que, **aunque alguien robara la llave**, solo pueda usarla para los servicios que tú definas.

### Configuración

En **"API restrictions"** → selecciona **"Restrict key"**

Marca **únicamente** estos servicios:

| Servicio | Función |
|----------|---------|
| ✅ **Identity Toolkit API** | Autenticación de usuarios (login) |
| ✅ **Cloud Firestore API** | Lectura/escritura en base de datos |
| ✅ **Token Service API** | Mantener sesiones activas |
| ✅ **Cloud Storage API** | *Opcional: Solo si usas subida de archivos* |

> ⚠️ **NO marques** otras APIs como Maps, Places, etc. a menos que tu aplicación las use específicamente.

---

## 4. Guardar y Verificar

### Pasos

1. Haz clic en **SAVE** para guardar los cambios
2. **Espera ~5 minutos** para que la configuración se propague

### Verificación Obligatoria

La nueva configuración **no surtirá efecto** si el navegador tiene cache antiguo:

- **Opción A**: Abre una **ventana de incógnito** y prueba la aplicación
- **Opción B**: Limpia el almacenamiento local del navegador:
  1. DevTools (F12) → Application → Storage
  2. Click "Clear site data"
  3. Recarga la página

---

## 5. Checklist de Verificación

Después de configurar, verifica que:

- [ ] El login con Google funciona en `https://quimera.ai`
- [ ] El login funciona en URLs de staging (`quimeraai--*.web.app`)
- [ ] La lectura/escritura de Firestore funciona normalmente
- [ ] Las subidas de archivos funcionan (si aplica)

---

## Troubleshooting

### Error: "API key not valid"
- Verifica que los patrones de URL estén correctamente escritos
- Asegúrate de incluir `https://` al inicio y `/*` al final

### Error: "Request blocked by API restrictions"
- Revisa que hayas marcado todas las APIs necesarias en la sección de restricciones
- Verifica que `Identity Toolkit API` y `Token Service API` estén habilitadas

### Los cambios no surten efecto
- Espera 5-10 minutos adicionales
- Usa modo incógnito para evitar cache
- Limpia completamente el almacenamiento del navegador

---

## Referencias

- [Firebase: Restrict API Key Usage](https://firebase.google.com/docs/projects/api-keys#restrict_key)
- [Google Cloud: API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)

---

*Última actualización: Febrero 2026*
