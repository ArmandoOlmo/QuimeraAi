/**
 * API Authentication Middleware
 * Handles API key authentication and rate limiting
 */

import * as admin from 'firebase-admin';
import * as express from 'express';
import * as functions from 'firebase-functions';
import * as crypto from 'crypto';

const db = admin.firestore();

// ============================================================================
// TYPES
// ============================================================================

export interface ApiKeyData {
  id: string;
  tenantId: string;
  name: string;
  keyHash: string;
  permissions: string[];
  status: 'active' | 'revoked';
  createdAt: admin.firestore.Timestamp;
  lastUsedAt?: admin.firestore.Timestamp;
  expiresAt?: admin.firestore.Timestamp;
  rateLimit: number; // Requests per minute
}

export interface AuthenticatedRequest extends express.Request {
  apiAuth?: {
    tenantId: string;
    permissions: string[];
    keyId: string;
    rateLimit: number;
  };
}

// ============================================================================
// RATE LIMIT CONFIGURATION
// ============================================================================

const RATE_LIMITS = {
  agency: 100, // 100 requests/minute
  agency_plus: 500, // 500 requests/minute
  enterprise: 2000, // 2000 requests/minute
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Hash an API key
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate a random API key
 */
export function generateApiKey(): string {
  const prefix = 'qai_'; // Quimera AI prefix
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}${randomBytes}`;
}

/**
 * Check rate limit for an API key
 */
async function checkRateLimit(
  tenantId: string,
  keyId: string,
  limit: number
): Promise<boolean> {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Count API calls in the last minute
  const recentCallsSnapshot = await db
    .collection('apiUsage')
    .where('keyId', '==', keyId)
    .where('timestamp', '>', oneMinuteAgo)
    .count()
    .get();

  const count = recentCallsSnapshot.data().count;

  if (count >= limit) {
    return false; // Rate limit exceeded
  }

  return true; // Within rate limit
}

/**
 * Log API usage
 */
async function logApiUsage(
  tenantId: string,
  keyId: string,
  method: string,
  path: string,
  statusCode: number,
  responseTime: number
): Promise<void> {
  try {
    await db.collection('apiUsage').add({
      tenantId,
      keyId,
      method,
      path,
      statusCode,
      responseTime,
      timestamp: Date.now(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error logging API usage:', error);
    // Don't throw - logging shouldn't break the API
  }
}

/**
 * Get rate limit for tenant based on plan
 */
async function getRateLimitForTenant(tenantId: string): Promise<number> {
  const tenantDoc = await db.collection('tenants').doc(tenantId).get();

  if (!tenantDoc.exists) {
    return RATE_LIMITS.agency; // Default
  }

  const tenantData = tenantDoc.data();
  const plan = tenantData?.subscriptionPlan || 'agency';

  return RATE_LIMITS[plan as keyof typeof RATE_LIMITS] || RATE_LIMITS.agency;
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Authenticate API Key Middleware
 * Validates API key and checks rate limits
 */
export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const startTime = Date.now();

  try {
    // 1. Extract API key from header
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        error: 'API key required',
        message: 'Include your API key in the X-API-Key header',
      });
      return;
    }

    // 2. Validate API key format
    if (!apiKey.startsWith('qai_')) {
      res.status(401).json({
        error: 'Invalid API key format',
        message: 'API key must start with qai_',
      });
      return;
    }

    // 3. Hash the key and look it up in database
    const keyHash = hashApiKey(apiKey);

    const apiKeySnapshot = await db
      .collection('apiKeys')
      .where('keyHash', '==', keyHash)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (apiKeySnapshot.empty) {
      res.status(401).json({
        error: 'Invalid API key',
        message: 'API key not found or has been revoked',
      });
      return;
    }

    const keyDoc = apiKeySnapshot.docs[0];
    const keyData = keyDoc.data() as ApiKeyData;

    // 4. Check if key has expired
    if (keyData.expiresAt && keyData.expiresAt.toDate() < new Date()) {
      res.status(401).json({
        error: 'API key expired',
        message: 'This API key has expired',
      });
      return;
    }

    // 5. Get rate limit for tenant
    const rateLimit = await getRateLimitForTenant(keyData.tenantId);

    // 6. Check rate limit
    const withinLimit = await checkRateLimit(
      keyData.tenantId,
      keyDoc.id,
      rateLimit
    );

    if (!withinLimit) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Rate limit of ${rateLimit} requests/minute exceeded`,
        retryAfter: 60,
      });
      return;
    }

    // 7. Update last used timestamp
    await keyDoc.ref.update({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 8. Attach auth data to request
    req.apiAuth = {
      tenantId: keyData.tenantId,
      permissions: keyData.permissions,
      keyId: keyDoc.id,
      rateLimit,
    };

    // 9. Log usage (async, don't wait)
    const responseTime = Date.now() - startTime;
    logApiUsage(
      keyData.tenantId,
      keyDoc.id,
      req.method,
      req.path,
      200,
      responseTime
    ).catch(console.error);

    // 10. Continue to next middleware/route
    next();
  } catch (error: any) {
    console.error('Authentication error:', error);

    res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication',
    });
  }
}

/**
 * Check Permission Middleware
 * Verifies the API key has specific permissions
 */
export function requirePermission(permission: string) {
  return (
    req: AuthenticatedRequest,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (!req.apiAuth) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!req.apiAuth.permissions.includes(permission)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This API key does not have the '${permission}' permission`,
        requiredPermission: permission,
        currentPermissions: req.apiAuth.permissions,
      });
      return;
    }

    next();
  };
}

/**
 * Error Handler Middleware
 * Catches and formats errors
 */
export function errorHandler(
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  console.error('API Error:', err);

  // Log error to Firestore
  if ((req as AuthenticatedRequest).apiAuth) {
    const auth = (req as AuthenticatedRequest).apiAuth!;
    db.collection('apiErrors')
      .add({
        tenantId: auth.tenantId,
        keyId: auth.keyId,
        method: req.method,
        path: req.path,
        error: err.message,
        stack: err.stack,
        timestamp: Date.now(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      .catch(console.error);
  }

  // Format error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: err.name || 'Error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Not Found Handler
 */
export function notFoundHandler(
  req: express.Request,
  res: express.Response
) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      'POST /api/v1/tenants',
      'GET /api/v1/tenants',
      'GET /api/v1/tenants/:id',
      'PATCH /api/v1/tenants/:id',
      'DELETE /api/v1/tenants/:id',
      'POST /api/v1/tenants/:id/members',
      'GET /api/v1/tenants/:id/usage',
      'POST /api/v1/tenants/:id/reports',
    ],
  });
}

/**
 * CORS Middleware
 */
export function corsMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.set('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  next();
}

/**
 * Request Logger Middleware
 */
export function requestLogger(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(
      `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
}
