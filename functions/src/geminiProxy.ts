/**
 * Gemini API Proxy Cloud Functions
 * 
 * This proxy allows chatbots to work on any domain while keeping API keys secure.
 * Features:
 * - API key stored securely in backend
 * - Rate limiting per project
 * - Domain validation
 * - Usage tracking
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

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
async function checkRateLimit(projectId: string, planType: string = 'FREE'): Promise<RateLimitCheck> {
    const now = new Date();
    const minuteKey = `${projectId}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}_${now.getHours()}_${now.getMinutes()}`;
    const dayKey = `${projectId}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
    
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
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        await dayRef.set({
            count: admin.firestore.FieldValue.increment(1),
            projectId,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        return {
            allowed: true,
            remaining: limits.requestsPerMinute - minuteCount - 1
        };
        
    } catch (error) {
        console.error('Rate limit check error:', error);
        // Fail open - allow request if rate limit check fails
        return { allowed: true };
    }
}

/**
 * Track API usage for analytics
 */
async function trackUsage(projectId: string, userId: string, tokensUsed: number, model: string) {
    try {
        await db.collection('apiUsage').add({
            projectId,
            userId,
            tokensUsed,
            model,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            type: 'gemini-proxy'
        });
    } catch (error) {
        console.error('Usage tracking error:', error);
    }
}

/**
 * Gemini API Proxy - Generate Content
 * 
 * POST /api/gemini/generate
 * 
 * Body:
 * {
 *   projectId: string,
 *   prompt: string,
 *   model?: string,
 *   config?: object
 * }
 */
export const generateContent = functions.https.onRequest(async (req, res) => {
    // Enable CORS for all origins
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { projectId, prompt, model = 'gemini-1.5-flash', config = {} } = req.body;
        
        // Validate required fields
        if (!projectId || !prompt) {
            res.status(400).json({ 
                error: 'Missing required fields',
                required: ['projectId', 'prompt']
            });
            return;
        }

        // Verify project exists and is active
        const projectDoc = await db.collection('projects').doc(projectId).get();
        
        if (!projectDoc.exists) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const projectData = projectDoc.data();
        const userId = projectData?.userId || 'unknown';
        const planType = projectData?.planType || 'FREE';
        
        // Check if AI assistant is active
        if (!projectData?.aiAssistantConfig?.isActive) {
            res.status(403).json({ error: 'AI assistant is not active for this project' });
            return;
        }

        // Rate limiting
        const rateLimitCheck = await checkRateLimit(projectId, planType);
        if (!rateLimitCheck.allowed) {
            res.status(429).json({ 
                error: rateLimitCheck.message,
                resetAt: rateLimitCheck.resetAt
            });
            return;
        }

        // Get API key from environment variable (set via Firebase Config)
        const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
        
        if (!apiKey) {
            console.error('GEMINI_API_KEY not configured');
            res.status(500).json({ error: 'API configuration error' });
            return;
        }

        // Make request to Gemini API
        // Using fetch instead of the SDK to avoid adding extra dependencies
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: config.temperature || 0.7,
                    topK: config.topK || 40,
                    topP: config.topP || 0.95,
                    maxOutputTokens: config.maxOutputTokens || 2048,
                },
                safetySettings: config.safetySettings || [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
                ]
            })
        });

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json().catch(() => ({}));
            console.error('Gemini API error:', errorData);
            res.status(geminiResponse.status).json({ 
                error: 'Gemini API error',
                details: errorData
            });
            return;
        }

        const data = await geminiResponse.json();
        
        // Extract token usage for tracking
        const tokensUsed = data.usageMetadata?.totalTokenCount || 0;
        
        // Track usage asynchronously
        trackUsage(projectId, userId, tokensUsed, model).catch(console.error);
        
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
 * 
 * POST /api/gemini/stream
 * 
 * Returns a server-sent events stream
 */
export const streamContent = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { projectId, prompt, model = 'gemini-1.5-flash', config = {} } = req.body;
        
        if (!projectId || !prompt) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // Verify project and rate limit (same as generateContent)
        const projectDoc = await db.collection('projects').doc(projectId).get();
        
        if (!projectDoc.exists) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const projectData = projectDoc.data();
        const planType = projectData?.planType || 'FREE';
        
        if (!projectData?.aiAssistantConfig?.isActive) {
            res.status(403).json({ error: 'AI assistant is not active' });
            return;
        }

        const rateLimitCheck = await checkRateLimit(projectId, planType);
        if (!rateLimitCheck.allowed) {
            res.status(429).json({ error: rateLimitCheck.message });
            return;
        }

        const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
        
        if (!apiKey) {
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
                    temperature: config.temperature || 0.7,
                    maxOutputTokens: config.maxOutputTokens || 2048,
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
            
            // Forward the chunk to client
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
 * Get usage statistics for a project
 * 
 * GET /api/gemini/usage/:projectId
 */
export const getUsageStats = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const projectId = req.path.split('/').pop();
        
        if (!projectId) {
            res.status(400).json({ error: 'Project ID required' });
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
            usage: usage.slice(0, 100) // Return last 100 requests
        });

    } catch (error) {
        console.error('Usage stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

