# 🔒 Política de Seguridad - QuimeraAI

## Resumen Ejecutivo

Este documento describe las políticas y mejores prácticas de seguridad para QuimeraAI, especialmente en lo que respecta al manejo de API keys y datos sensibles.

## 🔐 Manejo de API Keys

### Principios Fundamentales

1. **NUNCA** commitees API keys al repositorio
2. **SIEMPRE** usa variables de entorno para keys sensibles
3. **ROTA** las keys periódicamente (mínimo cada 90 días)
4. **USA** diferentes keys para desarrollo, staging y producción
5. **CONFIGURA** restricciones de dominio y API en los proveedores

### Variables de Entorno

#### Desarrollo Local

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Copiar desde ENV_EXAMPLE.txt
cp ENV_EXAMPLE.txt .env.local

# Editar con tus keys reales
nano .env.local
```

**⚠️ IMPORTANTE:** El archivo `.env.local` está en `.gitignore` y NO debe commiterse.

#### Producción

Para deployment en Google Cloud Run, usa uno de estos métodos:

**Opción 1: Build Args (simple, menos seguro)**
```bash
gcloud run deploy quimeraai \
  --source . \
  --set-build-env-vars VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
```

**Opción 2: Secret Manager (recomendado, más seguro)**
```bash
# Crear secret
echo -n "tu_api_key" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic"

# Usar en deployment (ver GOOGLE_CLOUD_DEPLOYMENT.md)
```

## 🛡️ Firebase Security

### API Key de Firebase

La API key de Firebase (`VITE_FIREBASE_API_KEY`) es **semi-pública** por diseño:
- Está expuesta en el código del cliente (navegador)
- Firebase la considera "identificador público", no secreto
- La seguridad real viene de Firebase Security Rules

**Sin embargo**, aún debes:
1. Configurar restricciones en Firebase Console
2. Limitar a tus dominios en producción
3. Usar Security Rules estrictas

### Security Rules Recomendadas

Actualiza `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        (request.auth.token.role == 'admin' || 
         request.auth.token.role == 'superadmin' ||
         request.auth.token.role == 'owner');
    }
    
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if isOwner(userId);
      
      match /projects/{projectId} {
        allow read, write: if isOwner(userId);
      }
      
      match /files/{fileId} {
        allow read, write: if isOwner(userId);
      }
      
      match /leads/{leadId} {
        allow read, write: if isOwner(userId);
      }
    }
    
    // Global settings - read for all authenticated, write for admins
    match /settings/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Actualiza `storage.rules`:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can only access their own files
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Global assets - read for authenticated, write for admins
    match /global/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.token.role == 'admin' || 
         request.auth.token.role == 'superadmin');
    }
    
    // Deny everything else
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Aplicar Security Rules

```bash
# Test locally
firebase emulators:start --only firestore

# Deploy to production
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## 🔑 Google Gemini API Security

### Restricciones Recomendadas

1. **Ve a** [Google AI Studio - API Keys](https://aistudio.google.com/app/apikey)
2. **Selecciona** tu API key
3. **Configura restricciones:**

   **Application restrictions:**
   - HTTP referrers (websites)
   - Agrega tus dominios:
     ```
     https://quimeraai.firebaseapp.com/*
     https://*.run.app/*
     https://tudominio.com/*
     ```

   **API restrictions:**
   - Restrict key
   - Selecciona solo: "Generative Language API"

4. **Configura cuotas:**
   - Establece límites diarios/mensuales
   - Configura alertas de uso

### Rate Limiting

Considera implementar rate limiting en el cliente:

```typescript
// utils/rateLimiter.ts
export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    return false;
  }
}
```

## 📊 Monitoreo y Auditoría

### Logs de Acceso

- Monitorea el uso de APIs en Google Cloud Console
- Configura alertas para uso inusual
- Revisa logs de Firebase Authentication regularmente

### Alertas Recomendadas

1. **Uso de API excesivo**
   - Threshold: >1000 requests/hora
   - Acción: Revisar y posiblemente rotar keys

2. **Intentos de acceso fallidos**
   - Threshold: >10 fallos en 5 minutos
   - Acción: Investigar posible ataque

3. **Cambios en Security Rules**
   - Acción: Revisar y aprobar manualmente

## 🔄 Rotación de Keys

### Calendario Recomendado

- **Desarrollo:** Cada 180 días
- **Staging:** Cada 90 días
- **Producción:** Cada 60 días
- **Después de violación:** Inmediatamente

### Proceso de Rotación

1. Crear nueva API key en el proveedor
2. Probar en entorno de desarrollo
3. Actualizar variables de entorno en staging
4. Verificar funcionamiento
5. Actualizar producción
6. Esperar 24-48 horas
7. Revocar la key antigua

## 🚨 Respuesta a Incidentes

### Si una API Key se Compromete

1. **INMEDIATAMENTE:**
   - Revoca la key comprometida
   - Crea nueva key con restricciones
   - Actualiza todos los entornos

2. **EN 24 HORAS:**
   - Revisa logs de acceso
   - Identifica uso no autorizado
   - Documenta el incidente

3. **EN 7 DÍAS:**
   - Implementa medidas adicionales
   - Actualiza documentación
   - Entrena al equipo

### Si Datos de Usuario se Filtran

1. **INMEDIATAMENTE:**
   - Revoca accesos comprometidos
   - Notifica a usuarios afectados
   - Contacta a las autoridades si aplica

2. **SEGÚN REQUIERA LA LEY:**
   - GDPR: 72 horas para notificar
   - CCPA: Sin demora indebida
   - Otras jurisdicciones: Consultar

## 📋 Checklist de Seguridad

### Desarrollo

- [ ] `.env.local` creado y configurado
- [ ] `.env.local` en `.gitignore`
- [ ] No hay keys hardcodeadas en el código
- [ ] Variables de entorno validadas al inicio

### Antes de Deployment

- [ ] Todas las keys usan variables de entorno
- [ ] Security Rules actualizadas y probadas
- [ ] Restricciones de API configuradas
- [ ] Rate limiting implementado
- [ ] Monitoreo configurado

### Post-Deployment

- [ ] Verificar que las keys funcionan
- [ ] Revisar logs por errores
- [ ] Probar restricciones de seguridad
- [ ] Documentar configuración

### Mantenimiento Regular

- [ ] Revisar logs semanalmente
- [ ] Auditar accesos mensualmente
- [ ] Rotar keys según calendario
- [ ] Actualizar Security Rules según necesidad

## 📞 Reportar Vulnerabilidades

Si encuentras una vulnerabilidad de seguridad:

1. **NO** la publiques públicamente
2. **CONTACTA:** [tu-email-seguridad@domain.com]
3. **INCLUYE:**
   - Descripción detallada
   - Pasos para reproducir
   - Impacto potencial
   - Sugerencias de mitigación

Responderemos en **72 horas** y trabajaremos contigo para resolverlo.

## 🔗 Referencias

- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

**Última actualización:** 2025-01-23
**Versión:** 1.0.0
**Mantenido por:** QuimeraAI Security Team









