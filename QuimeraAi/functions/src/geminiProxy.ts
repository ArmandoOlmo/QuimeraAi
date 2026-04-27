/**
 * Gemini API Proxy Cloud Functions
 * 
 * This proxy allows chatbots to work on any domain while keeping API keys secure.
 * Features:
 * - API key stored securely in backend
 * - Rate limiting per project
 * - Domain validation (CORS)
 * - Usage tracking
 * - Input validation
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';
import { isOwner } from './constants';
import { GEMINI_CONFIG, OPENROUTER_CONFIG } from './config';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// ============================================
// SECURITY: Allowed Origins for CORS
// ============================================
const ALLOWED_ORIGINS = [
    'https://quimera.ai',
    'https://www.quimera.ai',
    'https://quimeraai.web.app',
    'https://quimeraai.firebaseapp.com',
    // Development origins - include multiple ports for flexibility
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:4173',
    'http://localhost:4174',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:3003',
];

// Pattern for dynamic subdomains
const ALLOWED_ORIGIN_PATTERNS = [
    /^https:\/\/[a-z0-9-]+\.quimera\.app$/,
    /^https:\/\/[a-z0-9-]+--quimeraai\.web\.app$/,
];

/**
 * SECURITY: Validate and set CORS headers
 * Validates origin against ALLOWED_ORIGINS and dynamic patterns.
 * Reflects matched origin back; unrecognized origins get the default origin.
 */
function setCorsHeaders(req: functions.https.Request, res: functions.Response): boolean {
    const origin = (req.headers.origin as string) || '';
    const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
        ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin));

    if (isAllowed) {
        res.set('Access-Control-Allow-Origin', origin);
    } else {
        // For unknown origins (e.g. chatbot embeds on custom domains),
        // still allow the request but set a safe default origin
        res.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
    }
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    return true;
}

/**
 * SECURITY: Optional Firebase Auth verification.
 * If Authorization header with Firebase ID token is present, verify it and
 * return the authenticated UID. This prevents userId spoofing from dashboard.
 * Public chatbot requests (no auth header) will use the body userId + rate limiting.
 */
async function verifyOptionalAuth(req: functions.https.Request): Promise<string | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null; // No auth — public chatbot request
    }

    try {
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        // Invalid token — don't block, but don't trust userId either
        console.warn('[gemini-proxy] Invalid Firebase token presented, ignoring');
        return null;
    }
}

/**
 * SECURITY: Validate input strings to prevent injection
 */
function sanitizeString(str: unknown, maxLength: number = 10000): string {
    if (typeof str !== 'string') return '';
    // Trim and limit length
    return str.trim().slice(0, maxLength);
}

/**
 * SECURITY: Validate projectId format
 */
function isValidProjectId(projectId: string): boolean {
    // Allow alphanumeric, hyphens, and underscores, 1-100 chars
    return /^[a-zA-Z0-9_-]{1,100}$/.test(projectId);
}

/**
 * SECURITY: Validate userId format
 */
function isValidUserId(userId: string): boolean {
    // Firebase UIDs are typically 28 chars, but allow some flexibility
    return /^[a-zA-Z0-9_-]{1,128}$/.test(userId);
}

/**
 * SECURITY: Validate model name
 */
const ALLOWED_MODELS = [
    // Gemini 2.5 series (latest)
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    // Gemini 2.0 series
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash-exp',
    // Gemini 3.0 preview models (experimental)
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',          // Deprecated March 9, 2026 — use gemini-3.1-pro-preview
    'gemini-3-pro-image-preview',
    // Gemini 3.1 series
    'gemini-3.1-pro-preview',        // Flagship orchestrator (replaces gemini-3-pro-preview)
    'gemini-3.1-flash-live-preview', // Real-time voice/audio only
    'gemini-3.1-flash-tts-preview',  // Text-to-speech (April 2026)
    'gemini-3.1-flash-lite-preview', // Cost-efficient, thinking levels
    // Legacy native audio models (kept for backwards compatibility)
    'gemini-2.5-flash-native-audio-preview-12-2025',
    'gemini-2.5-flash-native-audio-preview-09-2025',
    // Legacy models (for backwards compatibility)
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    // Native Gemini image generation models
    'gemini-2.0-flash-exp-image-generation',
    'gemini-2.0-flash-preview-image-generation',
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-image',
    // Nano Banana series (Gemini native image generation)
    'gemini-3.1-flash-image-preview',  // Nano Banana 2 - Feb 2026
    'gemini-3-pro-image-preview',       // Nano Banana Pro
    // Image generation models - Imagen
    'imagen-3.0-generate-001',
    'imagen-3.0-fast-generate-001',
    'imagen-4.0-generate-001',
    'imagen-4.0-ultra-generate-001',
    'imagen-4.0-fast-generate-001',
    // Legacy alias (kept for backwards compatibility - maps to gemini-3.1-flash-image-preview)
    'imagen-4.0-nano-banana-002',
];

function isValidModel(model: string): boolean {
    return ALLOWED_MODELS.includes(model);
}

/**
 * Map internal Gemini model names to OpenRouter model identifiers.
 * OpenRouter hosts Gemini models under the 'google/' prefix.
 * Falls back to a safe default if the model isn't explicitly mapped.
 */
function mapModelToOpenRouter(model: string): string {
    const MODEL_MAP: Record<string, string> = {
        // Gemini 2.5
        'gemini-2.5-flash': 'google/gemini-2.5-flash',
        'gemini-2.5-flash-lite': 'google/gemini-2.5-flash-lite-preview',
        'gemini-2.5-pro': 'google/gemini-2.5-pro',
        // Gemini 2.0
        'gemini-2.0-flash': 'google/gemini-2.0-flash-001',
        'gemini-2.0-flash-lite': 'google/gemini-2.0-flash-lite-001',
        'gemini-2.0-flash-exp': 'google/gemini-2.0-flash-exp:free',
        // Gemini 3.x
        'gemini-3-flash-preview': 'google/gemini-2.5-flash',
        'gemini-3-pro-preview': 'google/gemini-2.5-pro',
        'gemini-3.1-pro-preview': 'google/gemini-2.5-pro',
        'gemini-3.1-flash-lite-preview': 'google/gemini-2.5-flash',
        // Legacy
        'gemini-1.5-flash': 'google/gemini-flash-1.5',
        'gemini-1.5-pro': 'google/gemini-pro-1.5',
    };
    return MODEL_MAP[model] || 'google/gemini-2.5-flash';
}

// Rate limiting configuration
const RATE_LIMITS = {
    FREE: { requestsPerMinute: 30, requestsPerDay: 2000 },
    PRO: { requestsPerMinute: 60, requestsPerDay: 10000 },
    ENTERPRISE: { requestsPerMinute: 200, requestsPerDay: 100000 }
};

/**
 * Internal/system project ID prefixes that bypass rate limiting.
 * These are used by the dashboard and generation flows, not public chatbots.
 */
const RATE_LIMIT_EXEMPT_PREFIXES = [
    'ai-website-studio',
    'onboarding-',
    'ai-',
    'content-',
    'enhance-',
    'cms-',
    'finance-',
    'domain-',
    'appointment-',
];

interface RateLimitCheck {
    allowed: boolean;
    remaining?: number;
    resetAt?: Date;
    message?: string;
}

/**
 * Check rate limit for a project
 */
async function checkRateLimit(projectId: string, userId: string, planType: string = 'FREE'): Promise<RateLimitCheck> {
    // Bypass rate limits for internal/system project IDs (dashboard operations, generation flows)
    if (RATE_LIMIT_EXEMPT_PREFIXES.some(prefix => projectId.startsWith(prefix))) {
        return { allowed: true, remaining: 1000 };
    }

    // SECURITY: Bypass rate limits for the OWNER
    try {
        // Fast direct check if userId is the email
        if (userId && isOwner(userId)) {
            return { allowed: true, remaining: 1000 };
        }

        if (userId && userId !== 'unknown' && userId !== 'anonymous' && userId !== 'system') {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const userRole = userData?.role;
                const userEmail = userData?.email;
                // Check role OR check if their email matches the owner email
                if (userRole === 'owner' || userRole === 'superadmin' || (userEmail && isOwner(userEmail))) {
                    return { allowed: true, remaining: 1000 };
                }
            }
        }
    } catch (e) {
        console.warn('Error checking owner status in rate limit:', e);
        // If we can't check owner status, allow through rather than blocking the owner
        return { allowed: true, remaining: 100 };
    }

    const now = new Date();
    // For templates, we limit by user to prevent one user from exhausting the template quota for everyone
    const limitKey = projectId.startsWith('template-') ? `${projectId}_${userId}` : projectId;

    const minuteKey = `${limitKey}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}_${now.getHours()}_${now.getMinutes()}`;
    const dayKey = `${limitKey}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;

    const limits = RATE_LIMITS[planType as keyof typeof RATE_LIMITS] || RATE_LIMITS.FREE;

    try {
        // Check minute limit
        const minuteRef = db.collection('rateLimits').doc('minutes').collection('entries').doc(minuteKey);
        const minuteDoc = await minuteRef.get();
        const minuteCount = minuteDoc.exists ? (minuteDoc.data()?.count || 0) : 0;

        if (minuteCount >= limits.requestsPerMinute) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: new Date(now.getTime() + 60000),
                message: 'Rate limit exceeded: Too many requests per minute'
            };
        }

        // Check day limit
        const dayRef = db.collection('rateLimits').doc('days').collection('entries').doc(dayKey);
        const dayDoc = await dayRef.get();
        const dayCount = dayDoc.exists ? (dayDoc.data()?.count || 0) : 0;

        if (dayCount >= limits.requestsPerDay) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            return {
                allowed: false,
                remaining: 0,
                resetAt: tomorrow,
                message: 'Rate limit exceeded: Daily quota exhausted'
            };
        }

        // Increment counters
        await minuteRef.set({
            count: admin.firestore.FieldValue.increment(1),
            projectId,
            userId,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        await dayRef.set({
            count: admin.firestore.FieldValue.increment(1),
            projectId,
            userId,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return {
            allowed: true,
            remaining: limits.requestsPerMinute - minuteCount - 1
        };

    } catch (error) {
        console.error('Rate limit check error:', error);
        // FAIL OPEN: If the rate-limit Firestore check itself errors (e.g. resource-exhausted),
        // allow the request through. Blocking users because Firestore is overloaded is worse
        // than temporarily losing rate-limit enforcement.
        return {
            allowed: true,
            remaining: 1,
            message: 'Rate limit check unavailable — request allowed'
        };
    }
}

interface ProjectDataResult {
    exists: boolean;
    data: {
        userId: string;
        planType: string;
        aiAssistantConfig: { isActive: boolean };
        [key: string]: any;
    } | null;
}

/**
 * Helper to get project data from various locations
 */
async function getProjectData(projectId: string, userId?: string): Promise<ProjectDataResult> {
    // 1. Handle Templates
    if (projectId.startsWith('template-')) {
        return {
            exists: true,
            data: {
                userId: userId || 'system',
                planType: 'FREE',
                aiAssistantConfig: { isActive: true }
            }
        };
    }

    // 2. Handle Global Assistant and special system contexts
    if (projectId === 'anonymous' ||
        projectId.startsWith('assistant-') ||
        projectId.startsWith('global-') ||
        projectId.startsWith('onboarding-') ||
        projectId.startsWith('cms-') ||
        projectId.startsWith('leads-') ||
        projectId.startsWith('finance-') ||
        projectId.startsWith('domain-') ||
        projectId.startsWith('appointment-') ||
        projectId.startsWith('content-') ||
        projectId.startsWith('enhance-') ||
        projectId.startsWith('ai-') ||
        projectId.startsWith('chatbot-') ||
        projectId.startsWith('quimera-chat-') ||
        (userId && projectId === userId)) {
        return {
            exists: true,
            data: {
                userId: userId || 'anonymous',
                planType: 'FREE',
                aiAssistantConfig: { isActive: true }
            }
        };
    }

    // 3. Handle User Projects (if userId is provided)
    if (userId) {
        const userProjectDoc = await db.collection('users').doc(userId).collection('projects').doc(projectId).get();
        if (userProjectDoc.exists) {
            const projectData = userProjectDoc.data() || {};
            // Ensure aiAssistantConfig exists with isActive true for user's own projects
            return {
                exists: true,
                data: {
                    ...projectData,
                    userId,
                    planType: projectData.planType || 'FREE',
                    // Default aiAssistantConfig if not present (allow user's own projects)
                    aiAssistantConfig: projectData.aiAssistantConfig || { isActive: true }
                }
            };
        }
    }

    // 4. Handle Top-Level Projects (Fallback)
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (projectDoc.exists) {
        const projectData = projectDoc.data() || {};
        return {
            exists: true,
            data: {
                ...projectData,
                userId: projectData.userId || 'unknown',
                planType: projectData.planType || 'FREE',
                // Default aiAssistantConfig if not present
                aiAssistantConfig: projectData.aiAssistantConfig || { isActive: true }
            }
        };
    }

    // 5. Handle Public Stores (for public preview/custom domains)
    // This allows chatbots to work on published sites without user authentication
    const publicStoreDoc = await db.collection('publicStores').doc(projectId).get();
    if (publicStoreDoc.exists) {
        const storeData = publicStoreDoc.data() || {};
        console.log(`[getProjectData] Found project in publicStores: ${projectId}`);
        return {
            exists: true,
            data: {
                ...storeData,
                userId: storeData.userId || 'public',
                planType: storeData.planType || 'FREE',
                // Public stores should have AI assistant enabled if the project has it configured
                aiAssistantConfig: storeData.aiAssistantConfig || { isActive: true }
            }
        };
    }

    return { exists: false, data: null };
}

/**
 * Token-based credit calculation multipliers per model
 * Formula: Math.ceil(tokensUsed / 1000) * multiplier
 */
const MODEL_TOKEN_MULTIPLIERS: Record<string, number> = {
    // Gemini Flash models: 1x multiplier (most economical)
    'gemini-2.5-flash': 1,
    'gemini-2.5-flash-lite': 1,
    'gemini-2.0-flash': 1,
    'gemini-2.0-flash-lite': 1,
    'gemini-2.0-flash-exp': 1,
    'gemini-3-flash-preview': 1,
    'gemini-1.5-flash': 1,
    // Gemini 3.1 Flash-Lite: 1x multiplier (most economical)
    'gemini-3.1-flash-lite-preview': 1,
    // Gemini 3.1 Live API (real-time voice): 2x multiplier
    'gemini-3.1-flash-live-preview': 2,
    'gemini-2.5-flash-native-audio-preview-12-2025': 2,
    'gemini-2.5-flash-native-audio-preview-09-2025': 2,
    // Gemini Pro models: 3x multiplier
    'gemini-2.5-pro': 3,
    'gemini-3-pro-preview': 3,
    'gemini-3.1-pro-preview': 3,     // Flagship orchestrator
    'gemini-3-pro-image-preview': 3,
    'gemini-1.5-pro': 3,
    // Gemini 3.1 TTS: 2x multiplier
    'gemini-3.1-flash-tts-preview': 2,
    // Image generation - Imagen Ultra: 10x multiplier
    'imagen-4.0-ultra-generate-001': 10,
    // Nano Banana 2 (gemini-3.1-flash-image-preview): 5x multiplier
    'gemini-3.1-flash-image-preview': 5,
    'imagen-4.0-nano-banana-002': 5,  // legacy alias
    // Other image models: 5x multiplier
    'gemini-2.5-flash-image': 5,
    'gemini-2.0-flash-image': 5,
    'gemini-2.0-flash-exp-image-generation': 5,
    'gemini-2.0-flash-preview-image-generation': 5,
    'imagen-3.0-generate-001': 5,
    'imagen-4.0-generate-001': 5,
    // Fast image models: 3x multiplier
    'imagen-3.0-fast-generate-001': 3,
    'imagen-4.0-fast-generate-001': 3,
};

/** Tokens required for 1 credit base unit */
const TOKENS_PER_CREDIT = 1000;

/**
 * Calculate credits based on tokens consumed and model multiplier
 * @param tokensUsed - Total tokens consumed (input + output)
 * @param model - Model name to get multiplier
 * @returns Credits to charge (minimum 1)
 */
function calculateCreditsFromTokens(tokensUsed: number, model: string): number {
    const multiplier = MODEL_TOKEN_MULTIPLIERS[model] || 1;
    // Minimum 1 credit per request, scale up based on tokens
    return Math.max(1, Math.ceil(tokensUsed / TOKENS_PER_CREDIT) * multiplier);
}

/**
 * Get minimum credit cost for a model (backwards compatibility)
 * Used when tokens are unknown (e.g., errors, image generation)
 */
function getCreditCostForModel(model: string): number {
    return MODEL_TOKEN_MULTIPLIERS[model] || 1;
}

/**
 * CREDIT GATE: Check if user has credits before allowing API request
 * Returns { allowed: true } or { allowed: false, creditsRemaining, message }
 * Owners/superadmins always bypass this check.
 */
async function checkCreditsBeforeRequest(
    userId: string,
    tenantId?: string
): Promise<{ allowed: boolean; creditsRemaining?: number; message?: string; tenantId?: string }> {
    try {
        // Resolve tenantId
        const effectiveTenantId = tenantId || await getTenantIdForUser(userId);
        if (!effectiveTenantId) {
            // No tenant found — allow (could be public chatbot or system)
            return { allowed: true };
        }

        // Bypass for owner/superadmin
        if (userId && isOwner(userId)) {
            return { allowed: true, tenantId: effectiveTenantId };
        }
        if (userId && userId !== 'unknown' && userId !== 'anonymous' && userId !== 'system') {
            const userDoc = await db.collection('users').doc(userId).get();
            const userRole = userDoc.exists ? userDoc.data()?.role : null;
            if (userRole === 'owner' || userRole === 'superadmin') {
                return { allowed: true, tenantId: effectiveTenantId };
            }
        }

        // Check credits in aiCreditsUsage collection
        const usageDoc = await db.collection('aiCreditsUsage').doc(effectiveTenantId).get();
        if (!usageDoc.exists) {
            // No usage doc yet — allow (first-time user)
            return { allowed: true, tenantId: effectiveTenantId };
        }

        const usageData = usageDoc.data()!;
        const creditsRemaining = usageData.creditsRemaining ?? (usageData.creditsIncluded ?? 0) - (usageData.creditsUsed ?? 0);

        if (creditsRemaining <= 0) {
            console.warn(`[CREDIT GATE] Blocked request for tenant ${effectiveTenantId}: 0 credits remaining (userId: ${userId})`);
            return {
                allowed: false,
                creditsRemaining: 0,
                tenantId: effectiveTenantId,
                message: 'No tienes créditos de IA disponibles. Compra más créditos o actualiza tu plan para continuar.',
            };
        }

        return { allowed: true, creditsRemaining, tenantId: effectiveTenantId };
    } catch (error) {
        console.error('[CREDIT GATE] Error checking credits:', error);
        // Fail open to avoid blocking users on transient errors
        return { allowed: true };
    }
}

/**
 * Track API usage for analytics and consume AI credits
 */
async function trackUsage(
    projectId: string,
    userId: string,
    tokensUsed: number,
    model: string,
    tenantId?: string,
    operationType?: string
) {
    try {
        // Calculate credits based on tokens consumed (new token-based billing)
        const creditsUsed = calculateCreditsFromTokens(tokensUsed, model);

        // Track in apiUsage collection (existing behavior)
        await db.collection('apiUsage').add({
            projectId,
            userId,
            tokensUsed,
            model,
            creditsUsed,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            type: 'gemini-proxy'
        });

        // If tenantId is provided, also track in aiCreditsTransactions
        const effectiveTenantId = tenantId || await getTenantIdForUser(userId);

        if (effectiveTenantId) {
            // Check if owner/superadmin (they have unlimited credits but we still track usage)
            let isOwnerUser = false;
            if (userId && isOwner(userId)) {
                isOwnerUser = true;
            } else {
                const userDoc = await db.collection('users').doc(userId).get();
                const userRole = userDoc.exists ? userDoc.data()?.role : null;
                if (userRole === 'owner' || userRole === 'superadmin') {
                    isOwnerUser = true;
                }
            }

            if (!isOwnerUser) {
                // Record the credit transaction with token details (only for non-owners)
                await db.collection('aiCreditsTransactions').add({
                    tenantId: effectiveTenantId,
                    userId,
                    projectId,
                    operation: operationType || getOperationTypeFromModel(model),
                    creditsUsed,
                    model,
                    tokensTotal: tokensUsed,
                    tokensInput: Math.floor(tokensUsed * 0.3),  // Estimate (API doesn't split input/output)
                    tokensOutput: Math.floor(tokensUsed * 0.7), // Estimate
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });
            }

            // Always update usage tracking (even for owners) so dashboard shows usage
            await updateCreditsUsage(effectiveTenantId, creditsUsed, operationType || getOperationTypeFromModel(model), projectId, tokensUsed);
        }

    } catch (error) {
        console.error('Usage tracking error:', error);
    }
}

/**
 * Get tenant ID for a user
 */
async function getTenantIdForUser(userId: string): Promise<string | null> {
    if (!userId || userId === 'unknown' || userId === 'anonymous' || userId === 'system') {
        return null;
    }

    try {
        // First check if there's a tenant membership
        const membershipQuery = await db.collection('tenantMemberships')
            .where('userId', '==', userId)
            .limit(1)
            .get();

        if (!membershipQuery.empty) {
            return membershipQuery.docs[0].data().tenantId;
        }

        // Fallback: use userId as tenantId for individual users
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return userData?.tenantId || userId;
        }

        return null;
    } catch (error) {
        console.error('Error getting tenant ID for user:', error);
        return null;
    }
}

/**
 * Determine operation type from model name
 */
function getOperationTypeFromModel(model: string): string {
    if (model.includes('imagen') || model.includes('image')) {
        if (model.includes('fast')) return 'image_generation_fast';
        if (model.includes('ultra')) return 'image_generation_ultra';
        return 'image_generation';
    }
    if (model.includes('pro')) return 'ai_assistant_complex';
    return 'ai_assistant_request';
}

/**
 * Update the credits usage document for a tenant
 */
async function updateCreditsUsage(
    tenantId: string,
    creditsUsed: number,
    operation: string,
    projectId?: string,
    tokensTotal?: number
): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const usageRef = db.collection('aiCreditsUsage').doc(tenantId);

    try {
        const usageDoc = await usageRef.get();

        if (!usageDoc.exists) {
            // Initialize usage document if it doesn't exist
            const initialData: Record<string, any> = {
                tenantId,
                periodStart: admin.firestore.FieldValue.serverTimestamp(),
                periodEnd: admin.firestore.FieldValue.serverTimestamp(), // Will be updated
                creditsIncluded: 30, // Default to free plan
                creditsUsed,
                creditsRemaining: 30 - creditsUsed,
                creditsOverage: 0,
                usageByOperation: { [operation]: creditsUsed },
                dailyUsage: [{ date: today, credits: creditsUsed }],
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            };

            // Track per-project usage
            if (projectId) {
                initialData.usageByProject = {
                    [projectId]: {
                        tokensUsed: tokensTotal || 0,
                        creditsUsed,
                        lastUsed: admin.firestore.FieldValue.serverTimestamp(),
                    }
                };
            }

            await usageRef.set(initialData);
            return;
        }

        const currentData = usageDoc.data()!;
        const newCreditsUsed = (currentData.creditsUsed || 0) + creditsUsed;
        const newCreditsRemaining = Math.max(0, (currentData.creditsIncluded || 30) - newCreditsUsed);
        const newCreditsOverage = Math.max(0, newCreditsUsed - (currentData.creditsIncluded || 30));

        // Update usage by operation
        const usageByOperation = currentData.usageByOperation || {};
        usageByOperation[operation] = (usageByOperation[operation] || 0) + creditsUsed;

        // Update daily usage
        let dailyUsage = currentData.dailyUsage || [];
        const todayEntry = dailyUsage.find((d: any) => d.date === today);
        if (todayEntry) {
            todayEntry.credits += creditsUsed;
        } else {
            dailyUsage.push({ date: today, credits: creditsUsed });
            if (dailyUsage.length > 30) {
                dailyUsage = dailyUsage.slice(-30);
            }
        }

        // Update per-project usage
        const updateData: Record<string, any> = {
            creditsUsed: newCreditsUsed,
            creditsRemaining: newCreditsRemaining,
            creditsOverage: newCreditsOverage,
            usageByOperation,
            dailyUsage,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (projectId) {
            const usageByProject = currentData.usageByProject || {};
            const projectEntry = usageByProject[projectId] || { tokensUsed: 0, creditsUsed: 0 };
            updateData[`usageByProject.${projectId}`] = {
                tokensUsed: (projectEntry.tokensUsed || 0) + (tokensTotal || 0),
                creditsUsed: (projectEntry.creditsUsed || 0) + creditsUsed,
                lastUsed: admin.firestore.FieldValue.serverTimestamp(),
            };
        }

        await usageRef.update(updateData);

    } catch (error) {
        console.error('Error updating credits usage:', error);
    }
}

/**
 * Gemini API Proxy - Generate Content
 * 
 * POST /api/gemini/generate
 */
export const generateContent = functions.runWith({ timeoutSeconds: 540, memory: '1GB' }).https.onRequest(async (req, res) => {
    // SECURITY: Set CORS headers
    const isOriginAllowed = setCorsHeaders(req, res);

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    // SECURITY: Check origin for non-OPTIONS requests
    if (!isOriginAllowed && process.env.NODE_ENV === 'production') {
        res.status(403).json({ error: 'Origin not allowed' });
        return;
    }

    try {
        // SECURITY: If a Firebase token is provided, use the verified UID
        const verifiedUid = await verifyOptionalAuth(req);

        // SECURITY: Sanitize and validate inputs
        const projectId = sanitizeString(req.body.projectId, 100);
        const prompt = sanitizeString(req.body.prompt, 50000); // Max 50k chars
        // Use verified UID when available, fall back to body userId for public chatbot
        const userId = verifiedUid || sanitizeString(req.body.userId, 128);
        const model = sanitizeString(req.body.model, 50) || 'gemini-2.5-flash';
        const config = req.body.config || {};

        // MULTIMODAL: Get images array if provided
        const images: Array<{ mimeType: string; data: string }> = [];
        if (Array.isArray(req.body.images)) {
            const ALLOWED_MIME_TYPES = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'video/mp4', 'video/webm', 'video/quicktime'
            ];
            const MAX_MEDIA = 10;

            for (const img of req.body.images.slice(0, MAX_MEDIA)) {
                if (img && typeof img.mimeType === 'string' && typeof img.data === 'string') {
                    // Validate MIME type
                    if (!ALLOWED_MIME_TYPES.includes(img.mimeType)) {
                        continue; // Skip invalid MIME types
                    }
                    // Validate base64 data (basic check) - 50MB limit for video, 20MB for images
                    const maxSize = img.mimeType.startsWith('video/') ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
                    if (img.data.length > 0 && img.data.length < maxSize) {
                        images.push({ mimeType: img.mimeType, data: img.data });
                    }
                }
            }
            if (images.length > 0) {
                console.log(`[gemini-generate] Multimodal request with ${images.length} image(s)`);
            }
        }

        // Validate required fields
        if (!projectId || !prompt) {
            res.status(400).json({
                error: 'Missing required fields',
                required: ['projectId', 'prompt']
            });
            return;
        }

        // SECURITY: Validate projectId format
        if (!isValidProjectId(projectId)) {
            res.status(400).json({ error: 'Invalid projectId format' });
            return;
        }

        // SECURITY: Validate model
        if (!isValidModel(model)) {
            res.status(400).json({ error: 'Invalid model specified' });
            return;
        }

        // Verify project exists and is active
        const { exists, data: projectData } = await getProjectData(projectId, userId);

        if (!exists || !projectData) {
            console.warn(`[gemini-generate] Project not found: projectId=${projectId}, userId=${userId}`);
            res.status(404).json({ error: 'Project not found', details: { projectId, userId: userId ? 'provided' : 'missing' } });
            return;
        }

        const finalUserId = projectData.userId || userId || 'unknown';
        const planType = projectData.planType || 'FREE';

        // Check if AI assistant is active (default to true for user's own projects)
        const isActive = projectData.aiAssistantConfig?.isActive ?? true;
        if (!isActive) {
            if (verifiedUid && verifiedUid === projectData.userId) {
                console.log(`[gemini-generate] Owner testing inactive chatbot: projectId=${projectId}`);
            } else {
                console.warn(`[gemini-generate] AI assistant not active: projectId=${projectId}`);
                res.status(403).json({ error: 'AI assistant is not active for this project' });
                return;
            }
        }

        // Rate limiting
        const rateLimitCheck = await checkRateLimit(projectId, finalUserId, planType);
        if (!rateLimitCheck.allowed) {
            res.status(429).json({
                error: rateLimitCheck.message,
                resetAt: rateLimitCheck.resetAt
            });
            return;
        }

        // CREDIT GATE: Block if user has no credits remaining
        const creditCheck = await checkCreditsBeforeRequest(finalUserId);
        if (!creditCheck.allowed) {
            res.status(402).json({
                error: 'CREDITS_EXHAUSTED',
                message: creditCheck.message,
                creditsRemaining: creditCheck.creditsRemaining ?? 0,
            });
            return;
        }

        // MULTI-TURN: Check if conversation history is provided
        const history: Array<{ role: string; text: string }> = Array.isArray(req.body.history) ? req.body.history : [];
        const systemInstruction: string | undefined = sanitizeString(req.body.systemInstruction, 100000);

        // TOOLS: Get optional tools array for function calling
        const tools: any[] | undefined = req.body.tools;

        // ============================================================
        // PRIMARY: Direct Gemini API (with OpenRouter fallback)
        // ============================================================
        let geminiError: any = null;
        let tryOpenRouterFallback = false;

        const apiKey = GEMINI_CONFIG.apiKey;

        if (apiKey) {
            // --- Direct Gemini API path ---
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            console.log(`[gemini-generate] Direct Gemini request: model=${model}, prompt length: ${prompt.length}, images: ${images.length}`);

            // Build content parts (text + optional images)
            const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
            parts.push({ text: prompt });
            for (const img of images) {
                parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
            }

            let contents: any[];
            if (history.length > 0) {
                contents = history.map((msg: { role: string; text: string }) => ({
                    role: msg.role === 'model' ? 'model' : 'user',
                    parts: [{ text: sanitizeString(msg.text, 50000) }]
                }));
                contents.push({ role: 'user', parts });
                console.log(`[gemini-generate] Multi-turn request with ${history.length} history messages`);
            } else {
                contents = [{ parts }];
            }

            const generationConfig: Record<string, any> = {
                temperature: Math.min(Math.max(config.temperature || 0.7, 0), 2),
                topK: Math.min(Math.max(config.topK || 40, 1), 100),
                topP: Math.min(Math.max(config.topP || 0.95, 0), 1),
                maxOutputTokens: Math.min(config.maxOutputTokens || 8192, 32000),
            };

            if (config.responseMimeType) {
                generationConfig.responseMimeType = config.responseMimeType;
            }

            if (config.thinkingLevel && ['minimal', 'low', 'medium', 'high'].includes(config.thinkingLevel)) {
                generationConfig.thinkingConfig = { thinkingLevel: config.thinkingLevel.toUpperCase() };
            }

            const requestBody: Record<string, any> = {
                contents,
                generationConfig,
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
                ]
            };

            if (systemInstruction) {
                requestBody.system_instruction = { parts: [{ text: systemInstruction }] };
            }

            if (Array.isArray(tools) && tools.length > 0) {
                requestBody.tools = tools.slice(0, 64);
            }

            try {
                const geminiResponse = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                if (!geminiResponse.ok) {
                    const errorText = await geminiResponse.text();
                    let errorData: any = {};
                    try { errorData = JSON.parse(errorText); } catch { errorData = { rawError: errorText }; }
                    console.error(`[gemini-generate] Gemini API error (${geminiResponse.status}):`, JSON.stringify(errorData));
                    throw new Error(JSON.stringify({ status: geminiResponse.status, data: errorData }));
                }

                const data = await geminiResponse.json();
                const tokensUsed = data.usageMetadata?.totalTokenCount || 0;
                trackUsage(projectId, finalUserId, tokensUsed, model).catch(console.error);

                res.set('X-RateLimit-Remaining', String(rateLimitCheck.remaining || 0));
                res.status(200).json({
                    response: data,
                    metadata: {
                        tokensUsed,
                        model,
                        provider: 'gemini-direct',
                        remaining: rateLimitCheck.remaining
                    }
                });
                return;
            } catch (error: any) {
                console.error(`[gemini-generate] Gemini API failed, attempting fallback to OpenRouter... Error:`, error.message);
                geminiError = error.message;
                tryOpenRouterFallback = true;
            }
        } else {
            console.warn('[gemini-generate] GEMINI_API_KEY not configured, falling back to OpenRouter');
            tryOpenRouterFallback = true;
        }

        // ============================================================
        // FALLBACK: OpenRouter
        // ============================================================
        if (tryOpenRouterFallback && OPENROUTER_CONFIG.enabled) {
            // --- OpenRouter path (OpenAI-compatible with vision) ---
            const orModel = mapModelToOpenRouter(model);
            console.log(`[gemini-generate] OpenRouter request: model=${orModel} (from ${model}), prompt length: ${prompt.length}, images: ${images.length}`);

            // Build messages array (OpenAI Chat format)
            const messages: Array<{ role: string; content: any }> = [];

            // System instruction → system message
            if (systemInstruction) {
                messages.push({ role: 'system', content: systemInstruction });
            }

            // Conversation history
            if (history.length > 0) {
                for (const msg of history) {
                    messages.push({
                        role: msg.role === 'model' ? 'assistant' : 'user',
                        content: sanitizeString(msg.text, 50000)
                    });
                }
            }

            // Current user message — with optional images (OpenAI vision format)
            if (images.length > 0) {
                // Multimodal: use content array with text + image_url parts
                const contentParts: Array<any> = [
                    { type: 'text', text: prompt }
                ];
                for (const img of images) {
                    contentParts.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:${img.mimeType};base64,${img.data}`
                        }
                    });
                }
                messages.push({ role: 'user', content: contentParts });
            } else {
                messages.push({ role: 'user', content: prompt });
            }

            const orBody: Record<string, any> = {
                model: orModel,
                messages,
                temperature: Math.min(Math.max(config.temperature || 0.7, 0), 2),
                top_p: Math.min(Math.max(config.topP || 0.95, 0), 1),
                max_tokens: Math.min(config.maxOutputTokens || 8192, 32000),
            };

            // Enforce JSON Mode via OpenRouter when requested
            if (config.responseMimeType === 'application/json') {
                orBody.response_format = { type: 'json_object' };
            }

            // Add tools for function calling if provided
            if (Array.isArray(tools) && tools.length > 0) {
                orBody.tools = tools.slice(0, 64);
                console.log(`[gemini-generate] Function calling enabled with ${orBody.tools.length} tool declaration(s)`);
            }

            const orResponse = await fetch(`${OPENROUTER_CONFIG.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_CONFIG.apiKey}`,
                    'HTTP-Referer': 'https://quimera.ai',
                    'X-Title': 'Quimera AI',
                },
                body: JSON.stringify(orBody)
            });

            if (!orResponse.ok) {
                const errorText = await orResponse.text();
                let errorData: any = {};
                try { errorData = JSON.parse(errorText); } catch { errorData = { rawError: errorText }; }
                console.error(`[gemini-generate] OpenRouter API error (${orResponse.status}):`, JSON.stringify(errorData));
                res.status(orResponse.status).json({
                    error: 'AI API error',
                    details: errorData,
                    model: orModel,
                    status: orResponse.status
                });
                return;
            }

            const orData = await orResponse.json();

            // Extract token usage
            const tokensUsed = (orData.usage?.prompt_tokens || 0) + (orData.usage?.completion_tokens || 0);
            const responseText = orData.choices?.[0]?.message?.content || '';

            // Track usage asynchronously
            trackUsage(projectId, finalUserId, tokensUsed, model).catch(console.error);

            // Convert OpenAI response → Gemini format for frontend compatibility
            const geminiFormatData = {
                candidates: [{
                    content: {
                        parts: [{ text: responseText }],
                        role: 'model'
                    },
                    finishReason: orData.choices?.[0]?.finish_reason === 'stop' ? 'STOP' : (orData.choices?.[0]?.finish_reason || 'STOP').toUpperCase(),
                }],
                usageMetadata: {
                    promptTokenCount: orData.usage?.prompt_tokens || 0,
                    candidatesTokenCount: orData.usage?.completion_tokens || 0,
                    totalTokenCount: tokensUsed,
                }
            };

            res.set('X-RateLimit-Remaining', String(rateLimitCheck.remaining || 0));
            res.status(200).json({
                response: geminiFormatData,
                metadata: {
                    tokensUsed,
                    model,
                    provider: 'openrouter',
                    remaining: rateLimitCheck.remaining
                }
            });
            return;

        } else if (tryOpenRouterFallback) {
            // Neither succeeded or OpenRouter was not enabled
            let parsedError: any = {};
            let status = 500;
            try {
                if (geminiError) {
                    const parsed = JSON.parse(geminiError);
                    status = parsed.status || 500;
                    parsedError = parsed.data || {};
                } else {
                    parsedError = { message: 'API configuration error' };
                }
            } catch {
                parsedError = { message: geminiError || 'API configuration error' };
            }
            res.status(status).json({
                error: 'Gemini API error',
                details: parsedError,
                model: model,
                status: status
            });
            return;
        }

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Gemini API Proxy - Stream Generate Content
 */
export const streamContent = functions.runWith({ timeoutSeconds: 540, memory: '1GB' }).https.onRequest(async (req, res) => {
    // SECURITY: Set CORS headers
    const isOriginAllowed = setCorsHeaders(req, res);

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    // SECURITY: Check origin for non-OPTIONS requests
    if (!isOriginAllowed && process.env.NODE_ENV === 'production') {
        res.status(403).json({ error: 'Origin not allowed' });
        return;
    }

    try {
        // SECURITY: If a Firebase token is provided, use the verified UID
        const verifiedUid = await verifyOptionalAuth(req);

        // SECURITY: Sanitize inputs
        const projectId = sanitizeString(req.body.projectId, 100);
        const prompt = sanitizeString(req.body.prompt, 50000);
        // Use verified UID when available, fall back to body userId for public chatbot
        const userId = verifiedUid || sanitizeString(req.body.userId, 128);
        const model = sanitizeString(req.body.model, 50) || 'gemini-2.5-flash';
        const config = req.body.config || {};

        if (!projectId || !prompt) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        if (!isValidProjectId(projectId) || !isValidModel(model)) {
            res.status(400).json({ error: 'Invalid input format' });
            return;
        }

        // Verify project and rate limit
        const { exists, data: projectData } = await getProjectData(projectId, userId);

        if (!exists || !projectData) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const finalUserId = projectData.userId || userId || 'unknown';
        const planType = projectData.planType || 'FREE';

        if (!projectData.aiAssistantConfig?.isActive) {
            res.status(403).json({ error: 'AI assistant is not active' });
            return;
        }

        const rateLimitCheck = await checkRateLimit(projectId, finalUserId, planType);
        if (!rateLimitCheck.allowed) {
            res.status(429).json({ error: rateLimitCheck.message });
            return;
        }

        // CREDIT GATE: Block if user has no credits remaining
        const creditCheck = await checkCreditsBeforeRequest(finalUserId);
        if (!creditCheck.allowed) {
            res.status(402).json({
                error: 'CREDITS_EXHAUSTED',
                message: creditCheck.message,
                creditsRemaining: creditCheck.creditsRemaining ?? 0,
            });
            return;
        }

        // Set up SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // ============================================================
        // OPENROUTER: Streaming via OpenAI-compatible SSE
        // Falls back to direct Gemini if OpenRouter is not configured
        // ============================================================
        if (OPENROUTER_CONFIG.enabled) {
            const orModel = mapModelToOpenRouter(model);
            console.log(`[gemini-stream] OpenRouter stream: model=${orModel}`);

            const orResponse = await fetch(`${OPENROUTER_CONFIG.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_CONFIG.apiKey}`,
                    'HTTP-Referer': 'https://quimera.ai',
                    'X-Title': 'Quimera AI',
                },
                body: JSON.stringify({
                    model: orModel,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: Math.min(Math.max(config.temperature || 0.7, 0), 2),
                    max_tokens: Math.min(config.maxOutputTokens || 2048, 32000),
                    stream: true,
                })
            });

            if (!orResponse.ok) {
                res.write(`data: ${JSON.stringify({ error: 'AI API error' })}\n\n`);
                res.end();
                return;
            }

            const reader = orResponse.body?.getReader();
            if (!reader) {
                res.write(`data: ${JSON.stringify({ error: 'No response stream' })}\n\n`);
                res.end();
                return;
            }

            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                // Convert OpenAI SSE chunks to Gemini SSE format for frontend compatibility
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
                        try {
                            const orChunk = JSON.parse(line.slice(6));
                            const text = orChunk.choices?.[0]?.delta?.content || '';
                            if (text) {
                                // Re-emit in Gemini SSE format
                                const geminiChunk = {
                                    candidates: [{
                                        content: { parts: [{ text }] },
                                    }]
                                };
                                res.write(`data: ${JSON.stringify(geminiChunk)}\n\n`);
                            }
                        } catch { /* skip invalid chunks */ }
                    }
                }
            }
            res.end();

        } else {
            // --- Direct Gemini streaming fallback ---
            const apiKey = GEMINI_CONFIG.apiKey;
            if (!apiKey) {
                res.write(`data: ${JSON.stringify({ error: 'API configuration error' })}\n\n`);
                res.end();
                return;
            }

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

            const geminiResponse = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: Math.min(Math.max(config.temperature || 0.7, 0), 2),
                        maxOutputTokens: Math.min(config.maxOutputTokens || 2048, 32000),
                    }
                })
            });

            if (!geminiResponse.ok) {
                res.write(`data: ${JSON.stringify({ error: 'Gemini API error' })}\n\n`);
                res.end();
                return;
            }

            const reader = geminiResponse.body?.getReader();
            if (!reader) {
                res.write(`data: ${JSON.stringify({ error: 'No response stream' })}\n\n`);
                res.end();
                return;
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
            res.end();
        }

    } catch (error) {
        console.error('Stream proxy error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.end();
        }
    }
});

/**
 * Gemini API Proxy - Generate Image
 */
export const generateImage = functions.runWith({ timeoutSeconds: 300, memory: '512MB' }).https.onRequest(async (req, res) => {
    // SECURITY: Set CORS headers
    const isOriginAllowed = setCorsHeaders(req, res);

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    // SECURITY: Check origin
    if (!isOriginAllowed && process.env.NODE_ENV === 'production') {
        res.status(403).json({ error: 'Origin not allowed' });
        return;
    }

    try {
        // SECURITY: Sanitize inputs
        const userId = sanitizeString(req.body.userId, 128);
        const projectId = sanitizeString(req.body.projectId, 100);
        const prompt = sanitizeString(req.body.prompt, 10000);
        const model = sanitizeString(req.body.model, 50) || 'gemini-3-pro-image-preview';
        const aspectRatio = sanitizeString(req.body.aspectRatio, 10) || '1:1';
        const style = sanitizeString(req.body.style, 50);
        const resolution = sanitizeString(req.body.resolution, 10) || '1K';
        const thinkingLevel = sanitizeString(req.body.thinkingLevel, 20) || 'high';
        const personGeneration = sanitizeString(req.body.personGeneration, 20) || 'allow_adult';
        const temperature = typeof req.body.temperature === 'number' ?
            Math.min(Math.max(req.body.temperature, 0), 2) : 1.0;
        const negativePrompt = sanitizeString(req.body.negativePrompt, 2000);
        const referenceImages = Array.isArray(req.body.referenceImages) ?
            req.body.referenceImages.slice(0, 14) : []; // Max 14 images
        const config = req.body.config || {};

        // Validate required fields
        if (!userId || !prompt) {
            res.status(400).json({
                error: 'Missing required fields',
                required: ['userId', 'prompt']
            });
            return;
        }

        // SECURITY: Validate userId
        if (!isValidUserId(userId)) {
            res.status(400).json({ error: 'Invalid userId format' });
            return;
        }

        // Rate limiting
        const rateLimitCheck = await checkRateLimit(`image-gen-${userId}`, userId, 'PRO');
        if (!rateLimitCheck.allowed) {
            res.status(429).json({
                error: rateLimitCheck.message,
                resetAt: rateLimitCheck.resetAt
            });
            return;
        }

        // CREDIT GATE: Block if user has no credits remaining
        const creditCheck = await checkCreditsBeforeRequest(userId);
        if (!creditCheck.allowed) {
            res.status(402).json({
                error: 'CREDITS_EXHAUSTED',
                message: creditCheck.message,
                creditsRemaining: creditCheck.creditsRemaining ?? 0,
            });
            return;
        }

        // Build enhanced prompt
        let enhancedPrompt = prompt;
        if (style && style !== 'None') {
            enhancedPrompt = `${prompt}, ${style} style`;
        }

        if (aspectRatio && aspectRatio !== '1:1') {
            enhancedPrompt = `${enhancedPrompt}, aspect ratio ${aspectRatio}`;
        }

        // Add visual controls from config
        if (config.lighting) enhancedPrompt = `${enhancedPrompt}, ${sanitizeString(config.lighting, 100)}`;
        if (config.cameraAngle) enhancedPrompt = `${enhancedPrompt}, ${sanitizeString(config.cameraAngle, 100)}`;
        if (config.colorGrading) enhancedPrompt = `${enhancedPrompt}, ${sanitizeString(config.colorGrading, 100)}`;
        if (config.themeColors) enhancedPrompt = `${enhancedPrompt}, ${sanitizeString(config.themeColors, 100)}`;
        if (config.depthOfField) enhancedPrompt = `${enhancedPrompt}, ${sanitizeString(config.depthOfField, 100)}`;

        enhancedPrompt = `${enhancedPrompt}, high quality, professional, detailed`;

        if (negativePrompt) {
            enhancedPrompt = `${enhancedPrompt}. Avoid: ${negativePrompt}`;
        }

        // ============================================================
        // OPENROUTER: Image generation via chat completions
        // Uses Gemini image models available on OpenRouter
        // ============================================================
        if (OPENROUTER_CONFIG.enabled) {
            // All image generation uses the highest quality, most recent model
            // gemini-2.5-flash-image is fast + high quality; gemini-3-pro is highest quality but slow
            const orModel = 'google/gemini-2.5-flash-image';
            console.log(`[gemini-image] OpenRouter image gen: model=${orModel} (from ${model}), prompt length: ${enhancedPrompt.length}`);

            // Build content parts for the user message
            const contentParts: Array<any> = [];

            // Add reference images if provided (OpenAI vision format)
            if (referenceImages && referenceImages.length > 0) {
                for (const imgDataUrl of referenceImages) {
                    if (typeof imgDataUrl !== 'string') continue;
                    try {
                        const matches = imgDataUrl.match(/^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.+)$/);
                        if (matches && matches.length === 4) {
                            const base64Data = matches[3];
                            // SECURITY: Limit image size (max 10MB base64)
                            if (base64Data.length > 10 * 1024 * 1024) {
                                console.warn('Reference image too large, skipping');
                                continue;
                            }
                            contentParts.push({
                                type: 'image_url',
                                image_url: { url: imgDataUrl }
                            });
                        }
                    } catch (err) {
                        console.warn('Error processing reference image:', err);
                    }
                }
                contentParts.push({
                    type: 'text',
                    text: `Using the provided reference images as style guide, generate an image: ${enhancedPrompt}`
                });
            } else {
                contentParts.push({
                    type: 'text',
                    text: `Generate an image: ${enhancedPrompt}`
                });
            }

            try {
                const orResponse = await fetch(`${OPENROUTER_CONFIG.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENROUTER_CONFIG.apiKey}`,
                        'HTTP-Referer': 'https://quimera.ai',
                        'X-Title': 'Quimera AI',
                    },
                    body: JSON.stringify({
                        model: orModel,
                        messages: [{
                            role: 'user',
                            content: contentParts.length === 1 && contentParts[0].type === 'text'
                                ? contentParts[0].text
                                : contentParts
                        }],
                        temperature: temperature,
                        modalities: ["image"],
                        image_config: {
                            aspect_ratio: aspectRatio
                        }
                    })
                });

                if (!orResponse.ok) {
                    const errorText = await orResponse.text();
                    let errorData: any = {};
                    try { errorData = JSON.parse(errorText); } catch { errorData = { rawError: errorText }; }
                    console.error(`[gemini-image] OpenRouter API error (${orResponse.status}):`, JSON.stringify(errorData));
                    res.status(orResponse.status).json({
                        error: 'Image generation failed',
                        details: errorData,
                        model: orModel,
                        status: orResponse.status
                    });
                    return;
                }

                const orData = await orResponse.json();
                const message = orData.choices?.[0]?.message;
                const responseContent = message?.content;

                // Extract base64 image from response
                let imageBase64: string | null = null;

                // PRIMARY: Check message.images array (OpenRouter's image generation format)
                if (Array.isArray(message?.images) && message.images.length > 0) {
                    for (const img of message.images) {
                        if (img?.image_url?.url) {
                            const urlMatch = img.image_url.url.match(/data:image\/[a-zA-Z]+;base64,([A-Za-z0-9+/=\s]+)/);
                            if (urlMatch) {
                                imageBase64 = urlMatch[1].replace(/\s/g, '');
                                break;
                            }
                        }
                    }
                }

                // FALLBACK 1: Check content for base64 data URL
                if (!imageBase64 && typeof responseContent === 'string') {
                    const dataUrlMatch = responseContent.match(/data:image\/[a-zA-Z]+;base64,([A-Za-z0-9+/=]+)/);
                    if (dataUrlMatch) {
                        imageBase64 = dataUrlMatch[1];
                    }
                }

                // FALLBACK 2: Check structured content parts (array format)
                if (!imageBase64 && Array.isArray(responseContent)) {
                    for (const part of responseContent) {
                        if (part?.type === 'image_url' && part?.image_url?.url) {
                            const urlMatch = part.image_url.url.match(/data:image\/[a-zA-Z]+;base64,([A-Za-z0-9+/=]+)/);
                            if (urlMatch) {
                                imageBase64 = urlMatch[1];
                                break;
                            }
                        }
                    }
                }

                if (!imageBase64) {
                    console.error('[gemini-image] No image found in OpenRouter response. Response:', JSON.stringify(orData).slice(0, 500));
                    res.status(500).json({
                        error: 'No image generated',
                        details: 'The model did not return an image'
                    });
                    return;
                }

                // Track usage
                const tokensUsed = (orData.usage?.prompt_tokens || 0) + (orData.usage?.completion_tokens || 0);
                trackUsage(projectId || `image-gen-${userId}`, userId, tokensUsed || TOKENS_PER_CREDIT, model).catch(console.error);

                res.set('X-RateLimit-Remaining', String(rateLimitCheck.remaining || 0));
                res.status(200).json({
                    success: true,
                    image: imageBase64,
                    mimeType: 'image/png',
                    metadata: {
                        model: model,
                        actualModel: orModel,
                        provider: 'openrouter',
                        aspectRatio,
                        style,
                        resolution,
                        thinkingLevel,
                        remaining: rateLimitCheck.remaining
                    }
                });

            } catch (sdkError: any) {
                console.error('Image generation OpenRouter error:', sdkError);
                res.status(500).json({
                    error: 'Image generation failed',
                    message: sdkError?.message || 'Unknown error'
                });
            }

        } else {
            // --- Direct Gemini API fallback (when OpenRouter is not configured) ---
            const apiKey = GEMINI_CONFIG.apiKey;
            if (!apiKey) {
                console.error('[GeminiProxy] GEMINI_API_KEY not configured in .env');
                res.status(500).json({ error: 'API configuration error' });
                return;
            }

            let actualModel = model;
            if (model === 'imagen-4.0-nano-banana-002') {
                actualModel = 'gemini-3.1-flash-image-preview';
            } else if (model === 'imagen-4.0-fast-generate-001') {
                actualModel = 'imagen-3.0-fast-generate-001';
            } else if (model === 'imagen-4.0-generate-001' || model === 'imagen-4.0-ultra-generate-001') {
                actualModel = 'imagen-3.0-generate-001';
            }

            const genAI = new GoogleGenAI({ apiKey });

            try {
                let imageBase64: string | null = null;

                if (actualModel.includes('imagen')) {
                    const imageConfig: any = {
                        numberOfImages: 1,
                        aspectRatio: aspectRatio as any,
                        personGeneration: personGeneration,
                    };
                    if (resolution === '4K' || resolution === '2K') {
                        imageConfig.imageSize = '2K';
                    } else {
                        imageConfig.imageSize = '1K';
                    }
                    const response = await genAI.models.generateImages({
                        model: actualModel,
                        prompt: enhancedPrompt,
                        config: imageConfig,
                    });
                    imageBase64 = response.generatedImages?.[0]?.image?.imageBytes || null;
                } else {
                    const generationConfig: any = {
                        responseModalities: ['IMAGE', 'TEXT'],
                        temperature: temperature,
                    };
                    if (thinkingLevel && thinkingLevel !== 'none') {
                        generationConfig.thinkingLevel = thinkingLevel;
                    }
                    const contentParts: any[] = [];
                    if (referenceImages && referenceImages.length > 0) {
                        for (const imgDataUrl of referenceImages) {
                            if (typeof imgDataUrl !== 'string') continue;
                            try {
                                const matches = imgDataUrl.match(/^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.+)$/);
                                if (matches && matches.length === 4) {
                                    if (matches[3].length > 10 * 1024 * 1024) continue;
                                    contentParts.push({ inlineData: { mimeType: matches[1], data: matches[3] } });
                                }
                            } catch (err) { console.warn('Error processing reference image:', err); }
                        }
                        contentParts.push({ text: `Using the provided reference images as style guide, generate an image: ${enhancedPrompt}` });
                    } else {
                        contentParts.push({ text: `Generate an image: ${enhancedPrompt}` });
                    }
                    const response = await genAI.models.generateContent({
                        model: actualModel,
                        contents: [{ role: 'user', parts: contentParts }],
                        config: generationConfig
                    });
                    if (response.candidates?.[0]?.content?.parts) {
                        for (const part of response.candidates[0].content.parts) {
                            if ((part as any).inlineData?.data) {
                                imageBase64 = (part as any).inlineData.data;
                                break;
                            }
                        }
                    }
                }

                if (!imageBase64) {
                    res.status(500).json({ error: 'No image generated', details: 'The model did not return an image' });
                    return;
                }

                trackUsage(projectId || `image-gen-${userId}`, userId, TOKENS_PER_CREDIT, model).catch(console.error);
                res.set('X-RateLimit-Remaining', String(rateLimitCheck.remaining || 0));
                res.status(200).json({
                    success: true,
                    image: imageBase64,
                    mimeType: 'image/png',
                    metadata: { model, actualModel, provider: 'gemini-direct', aspectRatio, style, resolution, thinkingLevel, remaining: rateLimitCheck.remaining }
                });

            } catch (sdkError: any) {
                console.error('Image generation SDK error:', sdkError);
                res.status(500).json({ error: 'Image generation failed', message: sdkError?.message || 'Unknown SDK error' });
            }
        }

    } catch (error) {
        console.error('Image generation proxy error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * SECURE: Get Gemini API Key for Live API (Voice Sessions)
 * 
 * The Gemini Live API (real-time voice/audio via WebSocket) is NOT available
 * through OpenRouter — it requires a direct connection to Google's servers.
 * This endpoint securely provides the Gemini API key ONLY to authenticated
 * owner/superadmin users for the Live API voice feature.
 * 
 * POST /api/gemini/liveApiKey
 * Requires Firebase Auth token in Authorization header.
 */
export const getLiveApiKey = functions.runWith({ timeoutSeconds: 120, memory: '256MB' }).https.onRequest(async (req, res) => {
    // SECURITY: Set CORS headers
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // SECURITY: Require Firebase Auth token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        let uid: string;
        try {
            const idToken = authHeader.split('Bearer ')[1];
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            uid = decodedToken.uid;
        } catch (authError) {
            console.error('[getLiveApiKey] Invalid Firebase token:', authError);
            res.status(401).json({ error: 'Invalid authentication token' });
            return;
        }

        // SECURITY: Only allow owner/superadmin users
        let isAuthorized = false;

        // Check if UID matches owner config
        if (isOwner(uid)) {
            isAuthorized = true;
        }

        // Check user document for role
        if (!isAuthorized) {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const role = userData?.role;
                const email = userData?.email;
                if (role === 'owner' || role === 'superadmin' || (email && isOwner(email))) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            console.warn(`[getLiveApiKey] Unauthorized access attempt by user: ${uid}`);
            res.status(403).json({ error: 'Insufficient permissions. Only owner/superadmin can access the Live API.' });
            return;
        }

        // Return the API key for Live API usage (User requested OpenRouter)
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            console.error('[getLiveApiKey] OPENROUTER_API_KEY not configured in backend');
            res.status(500).json({ error: 'OpenRouter API key not configured' });
            return;
        }

        console.log(`[getLiveApiKey] ✅ Providing OpenRouter API key to authorized user: ${uid}`);
        res.status(200).json({ apiKey });

    } catch (error) {
        console.error('[getLiveApiKey] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Get usage statistics for a project
 */
export const getUsageStats = functions.runWith({ timeoutSeconds: 120, memory: '256MB' }).https.onRequest(async (req, res) => {
    // SECURITY: Set CORS headers
    const isOriginAllowed = setCorsHeaders(req, res);

    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    // SECURITY: Check origin
    if (!isOriginAllowed && process.env.NODE_ENV === 'production') {
        res.status(403).json({ error: 'Origin not allowed' });
        return;
    }

    try {
        const projectId = sanitizeString(req.path.split('/').pop(), 100);

        if (!projectId || !isValidProjectId(projectId)) {
            res.status(400).json({ error: 'Valid Project ID required' });
            return;
        }

        // Get usage from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const usageSnapshot = await db.collection('apiUsage')
            .where('projectId', '==', projectId)
            .where('timestamp', '>=', thirtyDaysAgo)
            .orderBy('timestamp', 'desc')
            .limit(1000)
            .get();

        const usage = usageSnapshot.docs.map(doc => doc.data());

        // Calculate statistics
        const totalRequests = usage.length;
        const totalTokens = usage.reduce((sum, u) => sum + (u.tokensUsed || 0), 0);

        res.status(200).json({
            projectId,
            period: '30days',
            totalRequests,
            totalTokens,
            averageTokensPerRequest: totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0,
            usage: usage.slice(0, 100)
        });

    } catch (error) {
        console.error('Usage stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
