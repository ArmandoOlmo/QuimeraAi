# ✅ Solución Final: API de Google en Deploy

## 🛠️ Resumen de Cambios Realizados

Se han corregido múltiples problemas que impedían el funcionamiento de la API de Gemini en el entorno de producción (Cloud Run):

1.  **Error "Project not found" en el Proxy:**
    *   **Causa:** El proxy buscaba proyectos en la colección raíz `projects`, pero la aplicación guarda los proyectos de usuario en `users/{userId}/projects`. Además, los templates (ej. `template-restaurant`) no existen en la base de datos.
    *   **Solución:** Se actualizó `functions/src/geminiProxy.ts` para:
        *   Buscar proyectos en `users/{userId}/projects` si se proporciona un `userId`.
        *   Permitir automáticamente IDs de templates (que comienzan con `template-`).
        *   Mantener la compatibilidad con proyectos en la raíz `projects`.

2.  **Error de Modelo "Not Found":**
    *   **Causa:** El modelo por defecto `gemini-1.5-flash` no estaba disponible en la API para la clave configurada o la región.
    *   **Solución:** Se actualizó el modelo por defecto a `gemini-2.5-flash` (que sí está disponible y es el que usa la aplicación) en:
        *   `functions/src/geminiProxy.ts`
        *   `utils/geminiProxyClient.ts`
        *   `utils/genAiClient.ts`

3.  **Falta de `userId` en las Peticiones:**
    *   **Causa:** El cliente no enviaba el ID del usuario al proxy, lo que impedía buscar el proyecto en la ruta correcta.
    *   **Solución:** Se actualizaron `ChatCore.tsx`, `genAiClient.ts` y `geminiProxyClient.ts` para enviar el `userId` en cada petición.

## 🚀 Pasos para Aplicar la Solución

### 1. Backend (Cloud Functions)
**YA REALIZADO.** He redesplegado las Cloud Functions con las correcciones.
*   Estado: ✅ **Funcionando**
*   Verificación: Se probó con `curl` simulando un template y respondió correctamente.

### 2. Frontend (Cloud Run)
**ACCIÓN REQUERIDA.** Debes redesplegar la aplicación frontend para que incluya los cambios en el código del cliente (envío de `userId` y corrección de modelos).

Ejecuta el siguiente comando en tu terminal:

```bash
./deploy.sh
```

Este script:
1.  Construirá la nueva imagen de Docker con los cambios.
2.  La subirá a Google Container Registry.
3.  Desplegará la nueva versión en Cloud Run.

## 🧪 Cómo Verificar

Una vez que termine el despliegue del frontend:
1.  Abre tu aplicación desplegada: `https://quimeraai2025-ucwtex7qka-ue.a.run.app`
2.  Abre un proyecto (o usa un template).
3.  Abre el chat y envía un mensaje (ej. "Hola").
4.  Deberías recibir una respuesta de la IA.

Si encuentras algún problema, revisa la consola del navegador (F12) para ver si hay errores de red (404, 500) en las llamadas a `/gemini-generate`.
