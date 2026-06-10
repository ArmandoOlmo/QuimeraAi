# Name.com Reseller API Setup

Esta guía explica cómo configurar la integración con Name.com para la compra de dominios.

## 1. Obtener credenciales de Name.com

1. Crea una cuenta en [Name.com](https://www.name.com)
2. Ve a **Settings** → **Security** → **API Tokens**
3. Haz clic en **Create API Token**
4. Acepta el acuerdo de API
5. Guarda tu **username** y **token**

## 2. Configurar variables de entorno

### Para Cloud Functions (Firebase)

```bash
# Configurar usando Firebase CLI
firebase functions:config:set namecom.username="TU_USERNAME" namecom.token="TU_API_TOKEN" namecom.environment="production"

# Para desarrollo/testing
firebase functions:config:set namecom.environment="development"
```

### Verificar configuración

```bash
firebase functions:config:get
```

Deberías ver:

```json
{
  "namecom": {
    "username": "tu_username",
    "token": "tu_token",
    "environment": "production"
  }
}
```

## 3. Desplegar Cloud Functions

```bash
cd functions
npm run deploy
```

## 4. Endpoints disponibles

| Función | Descripción |
|---------|-------------|
| `domains-searchSuggestions` | Busca dominios disponibles por palabra clave |
| `domains-checkAvailability` | Verifica disponibilidad de dominios específicos |
| `domains-purchase` | Compra/registra un dominio |
| `domains-getPricing` | Obtiene precios de TLDs comunes |

## 5. Márgenes de precio

Por defecto, la API agrega un **20% de margen** sobre el precio base de Name.com. Esto se puede modificar en `functions/src/domains/nameComApi.ts`:

```typescript
const MARGIN_PERCENTAGE = 0.20; // 20% margin
```

## 6. Modo desarrollo vs producción

- **Producción**: `https://api.name.com/v4`
- **Desarrollo**: `https://api.dev.name.com/v4` (usa tokens de prueba)

Para usar el modo desarrollo, configura:

```bash
firebase functions:config:set namecom.environment="development"
```

## 7. Estructura de datos

### Orden de dominio (Firestore: `domainOrders`)

```typescript
{
  id: string;
  userId: string;
  domainName: string;
  years: number;
  purchasePrice: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Timestamp;
  completedAt?: Timestamp;
  error?: string;
}
```

### Dominio del usuario (Firestore: `users/{userId}/domains/{domainName}`)

```typescript
{
  id: string;
  name: string;
  status: 'active';
  provider: 'Quimera';
  purchasedVia: 'Name.com';
  purchasePrice: number;
  years: number;
  expiryDate: string;
  orderId: string;
}
```

## 8. Seguridad

- Las credenciales de API **nunca** se exponen al cliente
- Todas las llamadas pasan por Cloud Functions
- Los usuarios deben estar autenticados para comprar dominios
- Se validan todos los inputs antes de procesar

## 9. Troubleshooting

### Error: "Name.com API credentials not configured"

Verifica que hayas configurado las variables de entorno:

```bash
firebase functions:config:get
```

### Error: "Domain is not available for purchase"

El dominio ya está registrado o no está disponible. Intenta con otro nombre.

### Error de autenticación

Verifica que tu token de API sea válido y no haya expirado en Name.com.

## 10. Precios de referencia (aproximados)

| TLD | Precio base | Con margen (20%) |
|-----|-------------|------------------|
| .com | ~$12 | ~$14.40 |
| .io | ~$40 | ~$48.00 |
| .co | ~$30 | ~$36.00 |
| .app | ~$18 | ~$21.60 |
| .dev | ~$15 | ~$18.00 |

*Los precios pueden variar según Name.com*











