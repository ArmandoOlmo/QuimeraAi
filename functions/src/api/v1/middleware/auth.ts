/**
 * API Authentication Middleware
 * Handles API key authentication and rate limiting
 */

import * as express from 'express';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import * as functions from 'firebase-functions';

const db = admin.firestore();

// ============================================================================
// TYPES
// ============================================================================

export interface ApiAuthContext {
  tenantId: string;
  permissions: string[];
  keyId: string;
  rateLimit: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

async function getRateLimitForTenant(tenantId: string): Promise<number> {
  const tenantDoc = await db.collection('tenants').doc(tenantId).get();

  if (!tenantDoc.exists) {
    return 100;  // Default
  }

  const tenantData = tenantDoc.data()!;
  const plan = tenantData.subscriptionPlan;

  // Rate limits per plan
  const limits: Record<string, number> = {
    agency: 100,          // 100 requests/minute
    agency_plus: 500,     // 500 requests/minute
    enterprise: 2000,     // 2000 requests/minute
  };

  return limits[plan] || 100;
}

async function checkRateLimit(
  tenantId: string,
  keyId: string,
  rateLimit: number
): Promise<boolean> {
  const now = Date.now();
  const minuteWindow = now - 60000;  // Last minute

  // Count requests in the last minute
  const recentCalls = await db.collection('apiUsage')
    .where('keyId', '==', keyId)
    .where('timestamp', '>', admin.firestore.Timestamp.fromMillis(minuteWindow))
    .count()
    .get();

  const count = recentCalls.data().count;

  if (count >= rateLimit) {
    functions.logger.warn('Rate limit exceeded', { tenantId, keyId, count, limit: rateLimit });
    return false;
  }

  return true;
}

async function logApiUsage(
  tenantId: string,
  keyId: string,
  method: string,
  path: string,
  statusCode: number
): Promise<void> {
  await db.collection('apiUsage').add({
    tenantId,
    keyId,
    method,
    path,
    statusCode,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Authenticate API key
 */
export async function authenticateApiKey(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({
      error: 'API key required',
      message: 'Include X-API-Key header in your request',
    });
    return;
  }

  try {
    // Hash the API key
    const keyHash = hashApiKey(apiKey);

    // Look up API key in database
    const apiKeySnapshot = await db.collection('apiKeys')
      .where('keyHash', '==', keyHash)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (apiKeySnapshot.empty) {
      res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is invalid or has been revoked',
      });
      return;
    }

    const keyDoc = apiKeySnapshot.docs[0];
    const keyData = keyDoc.data();

    // Check expiration
    if (keyData.expiresAt && keyData.expiresAt.toMillis() < Date.now()) {
      res.status(401).json({
        error: 'API key expired',
        message: 'The provided API key has expired',
      });
      return;
    }

    // Get rate limit for tenant
    const rateLimit = await getRateLimitForTenant(keyData.tenantId);

    // Check rate limit
    const withinLimit = await checkRateLimit(keyData.tenantId, keyDoc.id, rateLimit);

    if (!withinLimit) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Rate limit of ${rateLimit} requests/minute exceeded`,
        retryAfter: 60,
      });
      return;
    }

    // Update last used timestamp (async, don't wait)
    keyDoc.ref.update({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(err => {
      functions.logger.error('Error updating lastUsedAt', { error: err.message });
    });

    // Attach auth context to request
    (req as any).apiAuth = {
      tenantId: keyData.tenantId,
      permissions: keyData.permissions || [],
      keyId: keyDoc.id,
      rateLimit,
    };

    next();
  } catch (error: any) {
    functions.logger.error('Error authenticating API key', { error: error.message });
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred while authenticating your request',
    });
  }
}

/**
 * Log API usage after response
 */
export function logUsage(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const apiAuth = (req as any).apiAuth as ApiAuthContext | undefined;

  if (!apiAuth) {
    next();
    return;
  }

  // Capture original send
  const originalSend = res.send;

  res.send = function (data: any) {
    // Log usage (async, don't wait)
    logApiUsage(
      apiAuth.tenantId,
      apiAuth.keyId,
      req.method,
      req.path,
      res.statusCode
    ).catch(err => {
      functions.logger.error('Error logging API usage', { error: err.message });
    });

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Require specific permission
 */
export function requirePermission(permission: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const apiAuth = (req as any).apiAuth as ApiAuthContext | undefined;

    if (!apiAuth) {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'This endpoint requires authentication',
      });
      return;
    }

    if (!apiAuth.permissions.includes(permission) && !apiAuth.permissions.includes('admin')) {
      res.status(403).json({
        error: 'Permission denied',
        message: `This action requires the '${permission}' permission`,
        requiredPermission: permission,
        yourPermissions: apiAuth.permissions,
      });
      return;
    }

    next();
  };
}

/**
 * Error handler middleware
 */
export function errorHandler(
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  functions.logger.error('API error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
  });

  res.status(err.statusCode || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
}
