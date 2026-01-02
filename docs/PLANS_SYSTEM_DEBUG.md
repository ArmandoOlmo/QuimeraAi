# Debug del Sistema de Planes de Suscripción

## Resumen del Sistema

El sistema de planes permite gestionar los planes de suscripción de Quimera AI desde el dashboard de administración.

---

## 1. Reglas de Firestore

### Ubicación: `firestore.rules` (líneas 682-687)

```javascript
match /subscriptionPlans/{planId} {
  // Lectura: cualquier usuario autenticado
  allow read: if request.auth != null;
  
  // Escritura: solo superadmin u owner
  allow write: if request.auth != null && isSuperAdminOrOwner();
}
```

### Función `isSuperAdminOrOwner()` (líneas 10-13)

```javascript
function isSuperAdminOrOwner() {
  let userRole = get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
  return userRole == 'superadmin' || userRole == 'owner';
}
```

### ✅ Requisitos para escribir planes:
1. Usuario debe estar autenticado (`request.auth != null`)
2. Documento `/users/{uid}` debe existir en Firestore
3. Campo `role` debe ser `'superadmin'` o `'owner'`

---

## 2. Roles y Permisos

### Ubicación: `constants/roles.ts`

| Rol | Puede escribir planes | OWNER_EMAIL |
|-----|----------------------|-------------|
| `owner` | ✅ Sí | `armandoolmomiranda@gmail.com` |
| `superadmin` | ✅ Sí | - |
| `admin` | ❌ No | - |
| `manager` | ❌ No | - |
| `user` | ❌ No | - |

### Auto-promoción a Owner
En `AuthContext.tsx`, si el email coincide con `OWNER_EMAIL`, el rol se actualiza automáticamente a `'owner'`.

---

## 3. Servicio de Planes (`plansService.ts`)

### Funciones CRUD:

| Función | userId requerido | Limpieza de undefined |
|---------|-----------------|----------------------|
| `savePlan()` | Opcional | ✅ `cleanForFirestore()` |
| `archivePlan()` | Opcional | ✅ Asignación explícita |
| `restorePlan()` | Opcional | ✅ Asignación explícita |
| `deletePlan()` | No usa | N/A |
| `initializePlansInFirestore()` | Opcional | ✅ `cleanForFirestore()` |

### Función `cleanForFirestore()`

```typescript
function cleanForFirestore(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key in obj) {
        if (obj[key] !== undefined) {
            result[key] = obj[key];
        }
    }
    return result;
}
```

**Importante**: Firestore NO acepta valores `undefined`. Esta función elimina todas las propiedades con valor `undefined` antes de guardar.

---

## 4. Componente de UI (`SubscriptionManagement.tsx`)

### Handlers que pasan `user?.uid`:

```typescript
const { user } = useAuth(); // Hook que obtiene el usuario

// Todos los handlers pasan user?.uid
handleSavePlan(plan) → savePlan(plan, user?.uid)
handleArchivePlan(planId) → archivePlan(planId, user?.uid)
handleRestorePlan(planId) → restorePlan(planId, user?.uid)
handleInitializePlans() → initializePlansInFirestore(user?.uid)
```

---

## 5. Flujo de Permisos

```
Usuario intenta guardar plan
          ↓
¿Está autenticado? → NO → Error: "permission-denied"
          ↓ SÍ
¿Tiene documento /users/{uid}? → NO → Error: "permission-denied"
          ↓ SÍ
¿Campo 'role' es 'owner' o 'superadmin'? → NO → Error: "permission-denied"
          ↓ SÍ
¿Datos tienen campos undefined? → SÍ → cleanForFirestore() los elimina
          ↓
✅ Escritura exitosa
```

---

## 6. Problemas Comunes y Soluciones

### Error: "Unsupported field value: undefined"
**Causa**: El objeto plan tiene propiedades con valor `undefined`
**Solución**: Usar `cleanForFirestore()` antes de escribir

### Error: "Missing or insufficient permissions"
**Causa**: 
1. Usuario no autenticado
2. Documento de usuario no existe en `/users/{uid}`
3. Campo `role` no es `'owner'` ni `'superadmin'`

**Solución**: 
1. Verificar que el usuario está logueado
2. Verificar en Firebase Console que existe el documento `/users/{uid}`
3. Verificar que el campo `role` tiene el valor correcto

### Error: Stripe sync failed
**Causa**: API key de Stripe inválida o Cloud Function no desplegada
**Solución**: El plan se guarda en Firestore aunque falle Stripe (se muestra warning)

---

## 7. Verificación en Firebase Console

### Verificar documento de usuario:
1. Ir a Firebase Console → Firestore
2. Navegar a `users/{tu-uid}`
3. Verificar que existe el campo `role: "owner"` (o `"superadmin"`)

### Verificar planes:
1. Ir a Firebase Console → Firestore
2. Navegar a `subscriptionPlans`
3. Deberían existir: `free`, `starter`, `pro`, `agency`, `enterprise`

---

## 8. Planes por Defecto

Los planes se definen en `types/subscription.ts` → `SUBSCRIPTION_PLANS`:

| ID | Nombre | Precio Mensual | Precio Anual |
|----|--------|----------------|--------------|
| `free` | Free | $0 | $0 |
| `starter` | Starter | $19 | $15 |
| `pro` | Pro | $49 | $39 |
| `agency` | Agency | $129 | $99 |
| `enterprise` | Enterprise | $299 | $249 |

---

## 9. Checklist de Debug

- [ ] Usuario está autenticado (ver consola: "User context set: {id, email, role}")
- [ ] Documento `/users/{uid}` existe en Firestore
- [ ] Campo `role` es `'owner'` o `'superadmin'`
- [ ] No hay errores de TypeScript en `plansService.ts`
- [ ] El servidor de desarrollo está corriendo (`npm run dev`)
- [ ] Las reglas de Firestore están desplegadas (`firebase deploy --only firestore:rules`)




