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
import { GEMINI_CONFIG } from './config';

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
 */
function setCorsHeaders(req: functions.https.Request, res: functions.Response): boolean {
    // For a website builder platform, we need to support user's custom domains.
    // We allow all origins, but rely on projectId/API key validation for security.
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    return true;
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
    'gemini-3-pro-preview',
    'gemini-3-pro-image-preview',
    // Legacy models (for backwards compatibility)
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    // Native Gemini image generation models
    'gemini-2.0-flash-exp-image-generation',
    'gemini-2.0-flash-preview-image-generation',
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-image',
    // Image generation models - Imagen (may require Vertex AI)
    'imagen-3.0-generate-001',
    'imagen-3.0-fast-generate-001',
    'imagen-4.0-generate-001',
    'imagen-4.0-ultra-generate-001',
    'imagen-4.0-fast-generate-001',
];

function isValidModel(model: string): boolean {
    return ALLOWED_MODELS.includes(model);
}

// Rate limiting configuration
const RATE_LIMITS = {
    FREE: { requestsPerMinute: 10, requestsPerDay: 1000 },
    PRO: { requestsPerMinute: 50, requestsPerDay: 10000 },
    ENTERPRISE: { requestsPerMinute: 200, requestsPerDay: 100000 }
};

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
    // SECURITY: Bypass rate limits for the OWNER (Armando)
    try {
        // Fast direct check if userId is the email (sometimes happens in certain flows)
        // or if we can verify the role quickly.
        if (userId && isOwner(userId)) {
            return { allowed: true, remaining: 1000 };
        }

        if (userId && userId !== 'unknown' && userId !== 'anonymous' && userId !== 'system') {
            const userDoc = await db.collection('users').doc(userId).get();
            const userRole = userDoc.exists ? userDoc.data()?.role : null;
            if (userRole === 'owner' || userRole === 'superadmin') {
                return { allowed: true, remaining: 1000 };
            }
        }
    } catch (e) {
        console.warn('Error checking owner status in rate limit:', e);
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
        // SECURITY: Fail closed - deny request if rate limit check fails
        return {
            allowed: false,
            message: 'Rate limit service unavailable. Please try again later.'
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
 * AI Credit costs per operation type
 * ~$0.01 USD real cost per credit
 */
const AI_CREDIT_COSTS = {
    // Gemini 2.5 series (latest)
    'gemini-2.5-flash': 1,              // ~$0.01 per request
    'gemini-2.5-flash-lite': 1,         // ~$0.01 per request
    'gemini-2.5-pro': 3,                // ~$0.03 per request
    // Gemini 2.0 series
    'gemini-2.0-flash': 1,              // ~$0.01 per request
    'gemini-2.0-flash-lite': 1,         // ~$0.01 per request
    'gemini-2.0-flash-exp': 1,          // ~$0.01 per request
    // Gemini 3.0 preview models (experimental)
    'gemini-3-pro-preview': 3,          // ~$0.03 per request
    'gemini-3-pro-image-preview': 4,    // ~$0.04 per request
    // Legacy models
    'gemini-1.5-flash': 1,              // ~$0.01 per request
    'gemini-1.5-pro': 2,                // ~$0.02 per request
    // Image generation - Imagen 3.0
    'gemini-2.5-flash-image': 4,        // ~$0.04 per image
    'gemini-2.0-flash-image': 4,        // ~$0.04 per image
    'imagen-3.0-generate-001': 4,       // ~$0.04 per image
    'imagen-3.0-fast-generate-001': 2,  // ~$0.02 per image
    // Image generation - Imagen 4.0
    'imagen-4.0-generate-001': 4,       // ~$0.04 per image
    'imagen-4.0-ultra-generate-001': 6, // ~$0.06 per image (highest quality)
    'imagen-4.0-fast-generate-001': 2,  // ~$0.02 per image
};

/**
 * Get credit cost for a model
 */
function getCreditCostForModel(model: string): number {
    return AI_CREDIT_COSTS[model as keyof typeof AI_CREDIT_COSTS] || 1;
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
        // Calculate credits to consume
        const creditsUsed = getCreditCostForModel(model);

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
            // SECURITY: Skip credit consumption for the OWNER
            if (userId && isOwner(userId)) {
                console.log(`[trackUsage] Bypassing credit consumption for owner: ${userId}`);
                return;
            }

            const userDoc = await db.collection('users').doc(userId).get();
            const userRole = userDoc.exists ? userDoc.data()?.role : null;
            if (userRole === 'owner' || userRole === 'superadmin') {
                console.log(`[trackUsage] Bypassing credit consumption for owner/superadmin: ${userId}`);
                return;
            }

            // Record the credit transaction
            await db.collection('aiCreditsTransactions').add({
                tenantId: effectiveTenantId,
                userId,
                projectId,
                operation: operationType || getOperationTypeFromModel(model),
                creditsUsed,
                model,
                tokensInput: Math.floor(tokensUsed * 0.3),  // Estimate
                tokensOutput: Math.floor(tokensUsed * 0.7), // Estimate
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Update the usage document
            await updateCreditsUsage(effectiveTenantId, creditsUsed, operationType || getOperationTypeFromModel(model));
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
    operation: string
): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const usageRef = db.collection('aiCreditsUsage').doc(tenantId);

    try {
        const usageDoc = await usageRef.get();

        if (!usageDoc.exists) {
            // Initialize usage document if it doesn't exist
            await usageRef.set({
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
            });
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

        await usageRef.update({
            creditsUsed: newCreditsUsed,
            creditsRemaining: newCreditsRemaining,
            creditsOverage: newCreditsOverage,
            usageByOperation,
            dailyUsage,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });

    } catch (error) {
        console.error('Error updating credits usage:', error);
    }
}

/**
 * Gemini API Proxy - Generate Content
 * 
 * POST /api/gemini/generate
 */
export const generateContent = functions.https.onRequest(async (req, res) => {
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
        // SECURITY: Sanitize and validate inputs
        const projectId = sanitizeString(req.body.projectId, 100);
        const prompt = sanitizeString(req.body.prompt, 50000); // Max 50k chars
        const userId = sanitizeString(req.body.userId, 128);
        const model = sanitizeString(req.body.model, 50) || 'gemini-2.5-flash';
        const config = req.body.config || {};

        // MULTIMODAL: Get images array if provided
        const images: Array<{ mimeType: string; data: string }> = [];
        if (Array.isArray(req.body.images)) {
            const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            const MAX_IMAGES = 10;

            for (const img of req.body.images.slice(0, MAX_IMAGES)) {
                if (img && typeof img.mimeType === 'string' && typeof img.data === 'string') {
                    // Validate MIME type
                    if (!ALLOWED_MIME_TYPES.includes(img.mimeType)) {
                        continue; // Skip invalid MIME types
                    }
                    // Validate base64 data (basic check)
                    if (img.data.length > 0 && img.data.length < 20 * 1024 * 1024) { // Max ~15MB per image
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
            console.warn(`[gemini-generate] AI assistant not active: projectId=${projectId}`);
            res.status(403).json({ error: 'AI assistant is not active for this project' });
            return;
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

        // Get API key from environment variable
        const apiKey = GEMINI_CONFIG.apiKey;

        if (!apiKey) {
            console.error('[GeminiProxy] GEMINI_API_KEY not configured in .env');
            res.status(500).json({ error: 'API configuration error' });
            return;
        }

        // Make request to Gemini API
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        console.log(`[gemini-generate] Making request to model: ${model}, prompt length: ${prompt.length}, images: ${images.length}`);

        // Build content parts (text + optional images)
        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

        // Add text prompt first
        parts.push({ text: prompt });

        // Add images if provided (multimodal request)
        for (const img of images) {
            parts.push({
                inlineData: {
                    mimeType: img.mimeType,
                    data: img.data
                }
            });
        }

        const requestBody = {
            contents: [{
                parts
            }],
            generationConfig: {
                temperature: Math.min(Math.max(config.temperature || 0.7, 0), 2),
                topK: Math.min(Math.max(config.topK || 40, 1), 100),
                topP: Math.min(Math.max(config.topP || 0.95, 0), 1),
                maxOutputTokens: Math.min(config.maxOutputTokens || 8192, 32000),
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
            ]
        };

        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            let errorData: any = {};
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { rawError: errorText };
            }
            console.error(`[gemini-generate] Gemini API error (${geminiResponse.status}):`, JSON.stringify(errorData));
            res.status(geminiResponse.status).json({
                error: 'Gemini API error',
                details: errorData,
                model: model,
                status: geminiResponse.status
            });
            return;
        }

        const data = await geminiResponse.json();

        // Extract token usage for tracking
        const tokensUsed = data.usageMetadata?.totalTokenCount || 0;

        // Track usage asynchronously
        trackUsage(projectId, finalUserId, tokensUsed, model).catch(console.error);

        // Return response with rate limit headers
        res.set('X-RateLimit-Remaining', String(rateLimitCheck.remaining || 0));
        res.status(200).json({
            response: data,
            metadata: {
                tokensUsed,
                model,
                remaining: rateLimitCheck.remaining
            }
        });

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
export const streamContent = functions.https.onRequest(async (req, res) => {
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
        // SECURITY: Sanitize inputs
        const projectId = sanitizeString(req.body.projectId, 100);
        const prompt = sanitizeString(req.body.prompt, 50000);
        const userId = sanitizeString(req.body.userId, 128);
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

        const apiKey = GEMINI_CONFIG.apiKey;

        if (!apiKey) {
            console.error('[GeminiProxy] GEMINI_API_KEY not configured in .env');
            res.status(500).json({ error: 'API configuration error' });
            return;
        }

        // Set up SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
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

        // Stream the response
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
export const generateImage = functions.https.onRequest(async (req, res) => {
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

        const apiKey = GEMINI_CONFIG.apiKey;

        if (!apiKey) {
            console.error('[GeminiProxy] GEMINI_API_KEY not configured in .env');
            res.status(500).json({ error: 'API configuration error' });
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

        const actualModel = model;
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

                // SECURITY: Validate reference images
                if (referenceImages && referenceImages.length > 0) {
                    for (const imgDataUrl of referenceImages) {
                        if (typeof imgDataUrl !== 'string') continue;
                        try {
                            const matches = imgDataUrl.match(/^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.+)$/);
                            if (matches && matches.length === 4) {
                                const mimeType = matches[1];
                                const base64Data = matches[3];

                                // SECURITY: Limit image size (max 10MB base64)
                                if (base64Data.length > 10 * 1024 * 1024) {
                                    console.warn('Reference image too large, skipping');
                                    continue;
                                }

                                contentParts.push({
                                    inlineData: {
                                        mimeType: mimeType,
                                        data: base64Data
                                    }
                                });
                            }
                        } catch (err) {
                            console.warn('Error processing reference image:', err);
                        }
                    }

                    contentParts.push({
                        text: `Using the provided reference images as style guide, generate an image: ${enhancedPrompt}`
                    });
                } else {
                    contentParts.push({
                        text: `Generate an image: ${enhancedPrompt}`
                    });
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
                console.error('No image in response');
                res.status(500).json({
                    error: 'No image generated',
                    details: 'The model did not return an image'
                });
                return;
            }

            // Track usage asynchronously
            trackUsage(`image-gen-${userId}`, userId, 1, model).catch(console.error);

            // Return response
            res.set('X-RateLimit-Remaining', String(rateLimitCheck.remaining || 0));
            res.status(200).json({
                success: true,
                image: imageBase64,
                mimeType: 'image/png',
                metadata: {
                    model: model,
                    actualModel: actualModel,
                    aspectRatio,
                    style,
                    resolution,
                    thinkingLevel,
                    remaining: rateLimitCheck.remaining
                }
            });

        } catch (sdkError: any) {
            console.error('Image generation SDK error:', sdkError);
            res.status(500).json({
                error: 'Image generation failed',
                message: sdkError?.message || 'Unknown SDK error'
            });
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
 * Get usage statistics for a project
 */
export const getUsageStats = functions.https.onRequest(async (req, res) => {
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
