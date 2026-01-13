# Quimera API v1 Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Endpoints](#endpoints)
6. [Code Examples](#code-examples)
7. [Webhooks](#webhooks)
8. [Best Practices](#best-practices)

---

## Introduction

The Quimera API allows you to programmatically manage your agency's sub-client tenants. This RESTful API uses standard HTTP methods and returns JSON responses.

### Base URL

```
https://api.quimera.ai/v1
```

### API Version

Current version: **v1**

Release date: January 2026

---

## Authentication

All API requests require authentication using an API key.

### Creating an API Key

1. Navigate to **Developer → API Keys**
2. Click **Create API Key**
3. Configure permissions
4. Save the generated key securely (shown only once)

### Using Your API Key

Include your API key in the `X-API-Key` header:

```bash
curl -X GET https://api.quimera.ai/v1/tenants \
  -H "X-API-Key: qai_your_api_key_here"
```

### API Key Format

```
qai_<64_hexadecimal_characters>
```

Example: `qai_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`

### Security Best Practices

- ✅ Store API keys in environment variables
- ✅ Never commit keys to version control
- ✅ Use different keys for dev/staging/production
- ✅ Rotate keys periodically
- ❌ Never expose keys in client-side code

---

## Rate Limiting

Rate limits are enforced per API key based on your subscription plan:

| Plan | Rate Limit |
|---|---|
| Agency | 100 requests/minute |
| Agency Plus | 500 requests/minute |
| Enterprise | 2,000 requests/minute |

### Rate Limit Headers

Every API response includes rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642089600
```

### Handling Rate Limits

When you exceed the rate limit, you'll receive:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "Rate limit exceeded",
  "message": "Rate limit of 100 requests/minute exceeded",
  "retryAfter": 60
}
```

**Recommendation:** Implement exponential backoff when receiving 429 responses.

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error type",
  "message": "Human-readable error description",
  "details": {
    "field": "Additional context"
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing API key |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

### Common Error Types

#### Invalid API Key
```json
{
  "error": "Invalid API key",
  "message": "API key not found or has been revoked"
}
```

#### Missing Permission
```json
{
  "error": "Forbidden",
  "message": "This API key does not have the 'create_tenants' permission",
  "requiredPermission": "create_tenants",
  "currentPermissions": ["read_tenants"]
}
```

#### Resource Not Found
```json
{
  "error": "Tenant not found",
  "message": "Tenant with ID abc123 does not exist"
}
```

---

## Endpoints

### Tenants

#### List Tenants

```http
GET /api/v1/tenants
```

Lists all sub-client tenants for your agency.

**Query Parameters:**

| Parameter | Type | Description | Default |
|---|---|---|---|
| `limit` | integer | Number of results (1-100) | 50 |
| `offset` | integer | Pagination offset | 0 |
| `status` | string | Filter by status (`active`, `trial`, `suspended`, `deleted`) | all |

**Example Request:**

```bash
curl -X GET "https://api.quimera.ai/v1/tenants?limit=10&offset=0&status=active" \
  -H "X-API-Key: qai_your_api_key"
```

**Example Response:**

```json
{
  "tenants": [
    {
      "id": "tenant_abc123",
      "name": "Café del Centro",
      "slug": "cafe-del-centro",
      "status": "active",
      "industry": "restaurant",
      "contactEmail": "contacto@cafedelcentro.com",
      "features": ["cms", "leads", "chatbot"],
      "usage": {
        "projects": 3,
        "users": 5,
        "leads": 245,
        "storageUsed": 12.5,
        "aiCreditsUsed": 1200
      },
      "createdAt": "2026-01-01T10:00:00.000Z"
    },
    {
      "id": "tenant_def456",
      "name": "Restaurante XYZ",
      "slug": "restaurante-xyz",
      "status": "trial",
      "industry": "restaurant",
      "contactEmail": "info@restaurantexyz.com",
      "features": ["cms", "ecommerce"],
      "usage": {
        "projects": 1,
        "users": 2,
        "leads": 50,
        "storageUsed": 3.2,
        "aiCreditsUsed": 300
      },
      "createdAt": "2026-01-10T15:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

---

#### Create Tenant

```http
POST /api/v1/tenants
```

Creates a new sub-client tenant.

**Required Permission:** `create_tenants`

**Request Body:**

```json
{
  "name": "Café del Centro",
  "email": "contacto@cafedelcentro.com",
  "industry": "restaurant",
  "features": ["cms", "leads", "chatbot"],
  "branding": {
    "logo": "https://example.com/logo.png",
    "primaryColor": "#3B82F6",
    "secondaryColor": "#10B981"
  }
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Business name |
| `email` | string | Yes | Contact email (must be valid) |
| `industry` | string | No | Industry type |
| `features` | array | No | Enabled features (default: []) |
| `branding` | object | No | Brand customization |

**Available Industries:**

- `restaurant`
- `retail`
- `professional_services`
- `healthcare`
- `real_estate`
- `education`
- `technology`
- `hospitality`
- `fitness`
- `other`

**Available Features:**

- `cms` - Content management system
- `leads` - Lead management
- `ecommerce` - E-commerce store
- `chatbot` - AI chatbot
- `email` - Email marketing
- `analytics` - Web analytics

**Example Request:**

```bash
curl -X POST https://api.quimera.ai/v1/tenants \
  -H "X-API-Key: qai_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Café del Centro",
    "email": "contacto@cafedelcentro.com",
    "industry": "restaurant",
    "features": ["cms", "leads"]
  }'
```

**Example Response:**

```json
{
  "id": "tenant_abc123",
  "name": "Café del Centro",
  "slug": "cafe-del-centro",
  "status": "trial",
  "createdAt": "2026-01-12T10:00:00.000Z"
}
```

---

#### Get Tenant Details

```http
GET /api/v1/tenants/:id
```

Retrieves detailed information about a specific tenant.

**Required Permission:** `read_tenants`

**Example Request:**

```bash
curl -X GET https://api.quimera.ai/v1/tenants/tenant_abc123 \
  -H "X-API-Key: qai_your_api_key"
```

**Example Response:**

```json
{
  "id": "tenant_abc123",
  "name": "Café del Centro",
  "slug": "cafe-del-centro",
  "status": "active",
  "industry": "restaurant",
  "subscriptionPlan": "agency",
  "contactInfo": {
    "email": "contacto@cafedelcentro.com",
    "phone": "+52 55 1234 5678"
  },
  "branding": {
    "companyName": "Café del Centro",
    "logo": "https://storage.quimera.ai/logos/abc123.png",
    "primaryColor": "#3B82F6",
    "secondaryColor": "#10B981"
  },
  "settings": {
    "enabledFeatures": ["cms", "leads", "chatbot"],
    "defaultLanguage": "es",
    "portalLanguage": "es",
    "autoTranslateContent": false
  },
  "usage": {
    "projectCount": 3,
    "userCount": 5,
    "storageUsedGB": 12.5,
    "aiCreditsUsed": 1200,
    "leads": 245
  },
  "limits": {
    "maxProjects": 50,
    "maxUsers": 20,
    "maxStorageGB": 100,
    "maxAiCredits": 5000
  },
  "createdAt": "2026-01-01T10:00:00.000Z",
  "updatedAt": "2026-01-12T08:30:00.000Z"
}
```

---

#### Update Tenant

```http
PATCH /api/v1/tenants/:id
```

Updates tenant information.

**Required Permission:** `update_tenants`

**Request Body (all fields optional):**

```json
{
  "name": "Café del Centro - Sucursal Norte",
  "status": "active",
  "industry": "restaurant",
  "features": ["cms", "leads", "ecommerce"],
  "branding": {
    "primaryColor": "#FF5722"
  },
  "contactInfo": {
    "phone": "+52 55 9876 5432"
  }
}
```

**Example Request:**

```bash
curl -X PATCH https://api.quimera.ai/v1/tenants/tenant_abc123 \
  -H "X-API-Key: qai_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Café del Centro - Sucursal Norte",
    "status": "active"
  }'
```

**Example Response:**

```json
{
  "id": "tenant_abc123",
  "message": "Tenant updated successfully",
  "updated": ["name", "status", "updatedAt"]
}
```

---

#### Delete Tenant

```http
DELETE /api/v1/tenants/:id
```

Soft deletes a tenant (sets status to `deleted`).

**Required Permission:** `delete_tenants`

**Example Request:**

```bash
curl -X DELETE https://api.quimera.ai/v1/tenants/tenant_abc123 \
  -H "X-API-Key: qai_your_api_key"
```

**Example Response:**

```json
{
  "id": "tenant_abc123",
  "message": "Tenant deleted successfully"
}
```

**Note:** This is a soft delete. The tenant record remains in the database with `status: "deleted"` and can be restored by support if needed.

---

### Members

#### Add Member

```http
POST /api/v1/tenants/:id/members
```

Invites a new member to a tenant.

**Required Permission:** `manage_members`

**Request Body:**

```json
{
  "email": "usuario@ejemplo.com",
  "name": "Juan Pérez",
  "role": "client"
}
```

**Available Roles:**

- `client_admin` - Full access (except billing)
- `client` - Standard user access
- `client_user` - Read-only access

**Example Request:**

```bash
curl -X POST https://api.quimera.ai/v1/tenants/tenant_abc123/members \
  -H "X-API-Key: qai_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez",
    "role": "client"
  }'
```

**Example Response:**

```json
{
  "inviteId": "invite_xyz789",
  "email": "usuario@ejemplo.com",
  "name": "Juan Pérez",
  "role": "client",
  "status": "pending",
  "message": "Invitation created successfully"
}
```

---

### Usage & Reports

#### Get Resource Usage

```http
GET /api/v1/tenants/:id/usage
```

Retrieves current resource usage and limits for a tenant.

**Required Permission:** `read_tenants`

**Example Request:**

```bash
curl -X GET https://api.quimera.ai/v1/tenants/tenant_abc123/usage \
  -H "X-API-Key: qai_your_api_key"
```

**Example Response:**

```json
{
  "tenantId": "tenant_abc123",
  "usage": {
    "projects": 3,
    "users": 5,
    "storageUsed": 12.5,
    "aiCreditsUsed": 1200,
    "leads": 245,
    "products": 0,
    "emailsSent": 1500
  },
  "limits": {
    "maxProjects": 50,
    "maxUsers": 20,
    "maxStorageGB": 100,
    "maxAiCredits": 5000,
    "maxLeads": 10000
  },
  "percentages": {
    "projects": 6.0,
    "storage": 12.5,
    "aiCredits": 24.0,
    "leads": 2.45
  },
  "alerts": {
    "highUsage": false,
    "criticalUsage": false
  }
}
```

**Alert Thresholds:**
- `highUsage`: true if any resource >80%
- `criticalUsage`: true if any resource >95%

---

#### Generate Report

```http
POST /api/v1/tenants/:id/reports
```

Generates a report for a specific tenant.

**Required Permission:** `generate_reports`

**Request Body:**

```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "metrics": ["leads", "visits", "sales"]
}
```

**Example Request:**

```bash
curl -X POST https://api.quimera.ai/v1/tenants/tenant_abc123/reports \
  -H "X-API-Key: qai_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-01-01",
    "endDate": "2026-01-31",
    "metrics": ["leads", "visits"]
  }'
```

**Example Response:**

```json
{
  "message": "Report generation started",
  "reportId": "report_1642089600",
  "status": "processing",
  "estimatedTime": "2-3 minutes"
}
```

**Note:** Report generation is asynchronous. Poll the report status or configure a webhook to receive notification when complete.

---

## Code Examples

### JavaScript / Node.js

```javascript
const axios = require('axios');

const API_KEY = process.env.QUIMERA_API_KEY;
const BASE_URL = 'https://api.quimera.ai/v1';

// Create HTTP client
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  }
});

// List tenants
async function listTenants() {
  try {
    const response = await client.get('/tenants', {
      params: {
        limit: 10,
        status: 'active'
      }
    });
    console.log('Tenants:', response.data.tenants);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response.data);
    throw error;
  }
}

// Create tenant
async function createTenant(data) {
  try {
    const response = await client.post('/tenants', {
      name: data.name,
      email: data.email,
      industry: data.industry,
      features: data.features || ['cms']
    });
    console.log('Created tenant:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response.data);
    throw error;
  }
}

// Get tenant usage
async function getTenantUsage(tenantId) {
  try {
    const response = await client.get(`/tenants/${tenantId}/usage`);
    console.log('Usage:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response.data);
    throw error;
  }
}

// Usage
(async () => {
  // List all tenants
  const tenants = await listTenants();

  // Create new tenant
  const newTenant = await createTenant({
    name: 'Test Café',
    email: 'test@cafe.com',
    industry: 'restaurant',
    features: ['cms', 'leads']
  });

  // Check usage
  const usage = await getTenantUsage(newTenant.id);
})();
```

### Python

```python
import requests
import os

API_KEY = os.environ.get('QUIMERA_API_KEY')
BASE_URL = 'https://api.quimera.ai/v1'

class QuimeraClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        })

    def list_tenants(self, limit=50, offset=0, status=None):
        """List all sub-client tenants"""
        params = {'limit': limit, 'offset': offset}
        if status:
            params['status'] = status

        response = self.session.get(
            f'{self.base_url}/tenants',
            params=params
        )
        response.raise_for_status()
        return response.json()

    def create_tenant(self, name, email, industry=None, features=None):
        """Create a new tenant"""
        data = {
            'name': name,
            'email': email,
            'industry': industry or 'other',
            'features': features or ['cms']
        }

        response = self.session.post(
            f'{self.base_url}/tenants',
            json=data
        )
        response.raise_for_status()
        return response.json()

    def get_tenant(self, tenant_id):
        """Get tenant details"""
        response = self.session.get(
            f'{self.base_url}/tenants/{tenant_id}'
        )
        response.raise_for_status()
        return response.json()

    def update_tenant(self, tenant_id, **kwargs):
        """Update tenant information"""
        response = self.session.patch(
            f'{self.base_url}/tenants/{tenant_id}',
            json=kwargs
        )
        response.raise_for_status()
        return response.json()

    def get_tenant_usage(self, tenant_id):
        """Get tenant resource usage"""
        response = self.session.get(
            f'{self.base_url}/tenants/{tenant_id}/usage'
        )
        response.raise_for_status()
        return response.json()

# Usage
client = QuimeraClient(API_KEY)

# List tenants
tenants = client.list_tenants(status='active')
print(f"Found {len(tenants['tenants'])} active tenants")

# Create tenant
new_tenant = client.create_tenant(
    name='Test Café',
    email='test@cafe.com',
    industry='restaurant',
    features=['cms', 'leads']
)
print(f"Created tenant: {new_tenant['id']}")

# Get usage
usage = client.get_tenant_usage(new_tenant['id'])
print(f"Storage used: {usage['usage']['storageUsed']} GB")
```

### PHP

```php
<?php

class QuimeraClient {
    private $apiKey;
    private $baseUrl = 'https://api.quimera.ai/v1';

    public function __construct($apiKey) {
        $this->apiKey = $apiKey;
    }

    private function request($method, $endpoint, $data = null) {
        $url = $this->baseUrl . $endpoint;

        $options = [
            'http' => [
                'method' => $method,
                'header' => [
                    'X-API-Key: ' . $this->apiKey,
                    'Content-Type: application/json'
                ]
            ]
        ];

        if ($data && ($method === 'POST' || $method === 'PATCH')) {
            $options['http']['content'] = json_encode($data);
        }

        $context = stream_context_create($options);
        $response = file_get_contents($url, false, $context);

        return json_decode($response, true);
    }

    public function listTenants($limit = 50, $offset = 0, $status = null) {
        $query = http_build_query([
            'limit' => $limit,
            'offset' => $offset,
            'status' => $status
        ]);

        return $this->request('GET', '/tenants?' . $query);
    }

    public function createTenant($name, $email, $industry = null, $features = []) {
        $data = [
            'name' => $name,
            'email' => $email,
            'industry' => $industry ?? 'other',
            'features' => $features ?: ['cms']
        ];

        return $this->request('POST', '/tenants', $data);
    }

    public function getTenant($tenantId) {
        return $this->request('GET', "/tenants/$tenantId");
    }

    public function getTenantUsage($tenantId) {
        return $this->request('GET', "/tenants/$tenantId/usage");
    }
}

// Usage
$client = new QuimeraClient(getenv('QUIMERA_API_KEY'));

// List tenants
$tenants = $client->listTenants();
echo "Found " . count($tenants['tenants']) . " tenants\n";

// Create tenant
$newTenant = $client->createTenant(
    'Test Café',
    'test@cafe.com',
    'restaurant',
    ['cms', 'leads']
);
echo "Created tenant: " . $newTenant['id'] . "\n";

?>
```

---

## Webhooks

### Setting Up Webhooks

Configure webhooks to receive real-time notifications about events.

**Available Events:**

- `tenant.created` - New tenant created
- `tenant.updated` - Tenant information updated
- `tenant.deleted` - Tenant deleted
- `tenant.suspended` - Tenant suspended
- `member.added` - New member invited
- `payment.succeeded` - Payment processed successfully
- `payment.failed` - Payment failed
- `usage.alert` - Resource usage >80%

### Webhook Payload Format

```json
{
  "event": "tenant.created",
  "timestamp": "2026-01-12T10:00:00.000Z",
  "data": {
    "tenantId": "tenant_abc123",
    "name": "Café del Centro",
    "status": "trial"
  }
}
```

### Signature Verification

All webhook requests include a signature header:

```
X-Webhook-Signature: sha256=<hmac_signature>
```

**Verify in Node.js:**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === `sha256=${expectedSignature}`;
}

// Express webhook handler
app.post('/webhooks/quimera', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifyWebhookSignature(
    req.body,
    signature,
    process.env.WEBHOOK_SECRET
  );

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook
  const { event, data } = req.body;
  console.log(`Received ${event} event:`, data);

  res.status(200).send('OK');
});
```

---

## Best Practices

### 1. Error Handling

Always implement proper error handling:

```javascript
async function safeApiCall() {
  try {
    const response = await client.get('/tenants');
    return response.data;
  } catch (error) {
    if (error.response) {
      // API returned error
      console.error('API Error:', error.response.data);

      if (error.response.status === 429) {
        // Rate limited - wait and retry
        await sleep(60000);
        return safeApiCall();
      }
    } else {
      // Network error
      console.error('Network Error:', error.message);
    }

    throw error;
  }
}
```

### 2. Rate Limit Handling

Implement exponential backoff:

```javascript
async function apiCallWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429) {
        const waitTime = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`Rate limited. Waiting ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}
```

### 3. Pagination

Always paginate when listing resources:

```javascript
async function getAllTenants() {
  const allTenants = [];
  let offset = 0;
  const limit = 50;
  let hasMore = true;

  while (hasMore) {
    const response = await client.get('/tenants', {
      params: { limit, offset }
    });

    allTenants.push(...response.data.tenants);
    hasMore = response.data.pagination.hasMore;
    offset += limit;
  }

  return allTenants;
}
```

### 4. Secure API Keys

Never hardcode API keys:

```javascript
// ❌ BAD
const API_KEY = 'qai_abc123...';

// ✅ GOOD
const API_KEY = process.env.QUIMERA_API_KEY;
```

Use a `.env` file:

```bash
# .env
QUIMERA_API_KEY=qai_your_api_key_here
```

And add to `.gitignore`:

```
.env
```

### 5. Caching

Cache responses to reduce API calls:

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedTenant(tenantId) {
  const cacheKey = `tenant_${tenantId}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await client.get(`/tenants/${tenantId}`);
  cache.set(cacheKey, {
    data: data.data,
    timestamp: Date.now()
  });

  return data.data;
}
```

---

## Support

Need help with the API?

- 📧 Email: api-support@quimera.ai
- 📚 Documentation: https://docs.quimera.ai/api
- 💬 Discord: https://discord.gg/quimera
- 🐛 Report bugs: https://github.com/quimeraai/api/issues

---

**API Version:** v1
**Last Updated:** January 12, 2026
**License:** © 2026 Quimera AI. All rights reserved.
