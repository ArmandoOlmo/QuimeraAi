/**
 * API Authentication Middleware
 * Handles API key authentication and rate limiting
 */
import * as admin from 'firebase-admin';
import * as express from 'express';
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
    rateLimit: number;
}
export interface AuthenticatedRequest extends express.Request {
    apiAuth?: {
        tenantId: string;
        permissions: string[];
        keyId: string;
        rateLimit: number;
    };
}
/**
 * Hash an API key
 */
export declare function hashApiKey(apiKey: string): string;
/**
 * Generate a random API key
 */
export declare function generateApiKey(): string;
/**
 * Authenticate API Key Middleware
 * Validates API key and checks rate limits
 */
export declare function authenticateApiKey(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction): Promise<void>;
/**
 * Check Permission Middleware
 * Verifies the API key has specific permissions
 */
export declare function requirePermission(permission: string): (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => void;
/**
 * Error Handler Middleware
 * Catches and formats errors
 */
export declare function errorHandler(err: any, req: express.Request, res: express.Response, next: express.NextFunction): void;
/**
 * Not Found Handler
 */
export declare function notFoundHandler(req: express.Request, res: express.Response): void;
/**
 * CORS Middleware
 */
export declare function corsMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void;
/**
 * Request Logger Middleware
 */
export declare function requestLogger(req: express.Request, res: express.Response, next: express.NextFunction): void;
