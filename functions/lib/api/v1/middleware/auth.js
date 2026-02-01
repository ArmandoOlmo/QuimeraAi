"use strict";
/**
 * API Authentication Middleware
 * Handles API key authentication and rate limiting
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashApiKey = hashApiKey;
exports.generateApiKey = generateApiKey;
exports.authenticateApiKey = authenticateApiKey;
exports.requirePermission = requirePermission;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
exports.corsMiddleware = corsMiddleware;
exports.requestLogger = requestLogger;
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const db = admin.firestore();
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
function hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}
/**
 * Generate a random API key
 */
function generateApiKey() {
    const prefix = 'qai_'; // Quimera AI prefix
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}${randomBytes}`;
}
/**
 * Check rate limit for an API key
 */
async function checkRateLimit(tenantId, keyId, limit) {
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
async function logApiUsage(tenantId, keyId, method, path, statusCode, responseTime) {
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
    }
    catch (error) {
        console.error('Error logging API usage:', error);
        // Don't throw - logging shouldn't break the API
    }
}
/**
 * Get rate limit for tenant based on plan
 */
async function getRateLimitForTenant(tenantId) {
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
        return RATE_LIMITS.agency; // Default
    }
    const tenantData = tenantDoc.data();
    const plan = tenantData?.subscriptionPlan || 'agency';
    return RATE_LIMITS[plan] || RATE_LIMITS.agency;
}
// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================
/**
 * Authenticate API Key Middleware
 * Validates API key and checks rate limits
 */
async function authenticateApiKey(req, res, next) {
    const startTime = Date.now();
    try {
        // 1. Extract API key from header
        const apiKey = req.headers['x-api-key'];
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
        const keyData = keyDoc.data();
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
        const withinLimit = await checkRateLimit(keyData.tenantId, keyDoc.id, rateLimit);
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
        logApiUsage(keyData.tenantId, keyDoc.id, req.method, req.path, 200, responseTime).catch(console.error);
        // 10. Continue to next middleware/route
        next();
    }
    catch (error) {
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
function requirePermission(permission) {
    return (req, res, next) => {
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
function errorHandler(err, req, res, next) {
    console.error('API Error:', err);
    // Log error to Firestore
    if (req.apiAuth) {
        const auth = req.apiAuth;
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
function notFoundHandler(req, res) {
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
function corsMiddleware(req, res, next) {
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
function requestLogger(req, res, next) {
    const startTime = Date.now();
    // Log when response finishes
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    next();
}
//# sourceMappingURL=auth.js.map