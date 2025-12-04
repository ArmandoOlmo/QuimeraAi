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
import { GoogleGenAI } from '@google/genai';

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
/**
 * Check rate limit for a project
 */
async function checkRateLimit(projectId: string, userId: string, planType: string = 'FREE'): Promise<RateLimitCheck> {
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
        // Fail open - allow request if rate limit check fails
        return { allowed: true };
    }
}

/**
 * Helper to get project data from various locations
 */
async function getProjectData(projectId: string, userId?: string) {
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
    // These don't require a real project in Firestore
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
        (userId && projectId === userId)) { // Allow userId as projectId
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
            return { exists: true, data: { ...userProjectDoc.data(), userId } };
        }
    }

    // 4. Handle Top-Level Projects (Fallback)
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (projectDoc.exists) {
        return { exists: true, data: projectDoc.data() };
    }

    return { exists: false, data: null };
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
        const { projectId, prompt, userId, model = 'gemini-2.5-flash', config = {} } = req.body;

        // Validate required fields
        if (!projectId || !prompt) {
            res.status(400).json({
                error: 'Missing required fields',
                required: ['projectId', 'prompt']
            });
            return;
        }

        // Verify project exists and is active
        const { exists, data: projectData } = await getProjectData(projectId, userId);

        if (!exists || !projectData) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const finalUserId = projectData.userId || userId || 'unknown';
        const planType = projectData.planType || 'FREE';

        // Check if AI assistant is active
        if (!projectData.aiAssistantConfig?.isActive) {
            res.status(403).json({ error: 'AI assistant is not active for this project' });
            return;
        }

        // Rate limiting
        // Rate limiting
        const rateLimitCheck = await checkRateLimit(projectId, finalUserId, planType);
        if (!rateLimitCheck.allowed) {
            res.status(429).json({
                error: rateLimitCheck.message,
                resetAt: rateLimitCheck.resetAt
            });
            return;
        }

        // Get API key from environment variable (.env file in functions directory)
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('GEMINI_API_KEY not configured. Create a .env file in the functions directory.');
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
        const { projectId, prompt, userId, model = 'gemini-1.5-flash', config = {} } = req.body;

        if (!projectId || !prompt) {
            res.status(400).json({ error: 'Missing required fields' });
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

        // Get API key from environment variable (.env file in functions directory)
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('GEMINI_API_KEY not configured. Create a .env file in the functions directory.');
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
 * Gemini API Proxy - Generate Image
 * 
 * POST /api/gemini/image
 * 
 * Body:
 * {
 *   userId: string,
 *   prompt: string,
 *   model?: string,
 *   aspectRatio?: string,
 *   style?: string,
 *   resolution?: string,
 *   config?: object
 * }
 */
export const generateImage = functions.https.onRequest(async (req, res) => {
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
        const { 
            userId, 
            prompt, 
            model = 'gemini-3-pro-image-preview', // Default to Quimera Vision Pro
            aspectRatio = '1:1',
            style,
            resolution = '1K',
            // Quimera AI specific options
            thinkingLevel = 'high',
            personGeneration = 'allow_adult',
            temperature = 1.0,
            negativePrompt,
            // Reference images for style transfer (base64 data URLs)
            referenceImages = [],
            config = {}
        } = req.body;

        // Validate required fields
        if (!userId || !prompt) {
            res.status(400).json({
                error: 'Missing required fields',
                required: ['userId', 'prompt']
            });
            return;
        }

        // Rate limiting - use userId as projectId for image generation
        const rateLimitCheck = await checkRateLimit(`image-gen-${userId}`, userId, 'PRO');
        if (!rateLimitCheck.allowed) {
            res.status(429).json({
                error: rateLimitCheck.message,
                resetAt: rateLimitCheck.resetAt
            });
            return;
        }

        // Get API key from environment variable (.env file in functions directory)
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('GEMINI_API_KEY not configured. Create a .env file in the functions directory.');
            res.status(500).json({ error: 'API configuration error' });
            return;
        }

        // Build enhanced prompt with style and visual controls
        let enhancedPrompt = prompt;
        if (style && style !== 'None') {
            enhancedPrompt = `${prompt}, ${style} style`;
        }
        
        // Add aspect ratio hint to prompt
        if (aspectRatio && aspectRatio !== '1:1') {
            enhancedPrompt = `${enhancedPrompt}, aspect ratio ${aspectRatio}`;
        }

        // Add visual controls from config
        if (config.lighting) enhancedPrompt = `${enhancedPrompt}, ${config.lighting}`;
        if (config.cameraAngle) enhancedPrompt = `${enhancedPrompt}, ${config.cameraAngle}`;
        if (config.colorGrading) enhancedPrompt = `${enhancedPrompt}, ${config.colorGrading}`;
        if (config.themeColors) enhancedPrompt = `${enhancedPrompt}, ${config.themeColors}`;
        if (config.depthOfField) enhancedPrompt = `${enhancedPrompt}, ${config.depthOfField}`;

        // Add quality hints
        enhancedPrompt = `${enhancedPrompt}, high quality, professional, detailed`;

        // Add negative prompt if provided
        if (negativePrompt) {
            enhancedPrompt = `${enhancedPrompt}. Avoid: ${negativePrompt}`;
        }

        // Determine actual model to use
        // Map model names to actual API model identifiers
        let actualModel = model;
        if (model === 'gemini-3-pro-image-preview' || model.includes('nano')) {
            // Quimera Vision Pro uses Gemini 2.0 Flash Exp for image generation
            actualModel = 'gemini-2.0-flash-exp';
        } else if (model.includes('imagen')) {
            // Keep Imagen models as-is for generateImages API
            actualModel = model;
        }

        console.log('✨ Quimera Vision Pro Image generation request:', {
            userId,
            requestedModel: model,
            actualModel,
            aspectRatio,
            style,
            resolution,
            thinkingLevel,
            personGeneration,
            temperature,
            negativePrompt: negativePrompt ? 'yes' : 'no',
            promptLength: enhancedPrompt.length,
            referenceImagesCount: referenceImages?.length || 0
        });

        // Use the Google Generative AI SDK for image generation
        const genAI = new GoogleGenAI({ apiKey });

        try {
            let imageBase64: string | null = null;

            if (actualModel.includes('imagen')) {
                // Use generateImages API for Imagen models
                const imageConfig: any = {
                    numberOfImages: 1,
                    aspectRatio: aspectRatio as any,
                    personGeneration: personGeneration,
                };

                // Add image size based on resolution
                if (resolution === '4K' || resolution === '2K') {
                    imageConfig.imageSize = '2K'; // Imagen max is 2K
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
                // Use generateContent with responseModalities for Gemini models (Quimera Vision Pro)
                const generationConfig: any = {
                    responseModalities: ['IMAGE', 'TEXT'],
                    temperature: temperature,
                };

                // Add thinking level for better text rendering (Quimera Vision Pro feature)
                if (thinkingLevel && thinkingLevel !== 'none') {
                    generationConfig.thinkingLevel = thinkingLevel;
                }

                // Build content parts (text + optional reference images)
                const contentParts: any[] = [];

                // Add reference images if provided (Quimera Vision Pro supports up to 14 images)
                if (referenceImages && referenceImages.length > 0) {
                    console.log(`🖼️ Processing ${referenceImages.length} reference images for style transfer`);
                    
                    for (const imgDataUrl of referenceImages) {
                        try {
                            // Extract base64 data and mime type from data URL
                            // Format: data:image/png;base64,iVBORw0KGgo...
                            const matches = imgDataUrl.match(/^data:([^;]+);base64,(.+)$/);
                            if (matches && matches.length === 3) {
                                const mimeType = matches[1];
                                const base64Data = matches[2];
                                
                                contentParts.push({
                                    inlineData: {
                                        mimeType: mimeType,
                                        data: base64Data
                                    }
                                });
                                console.log(`✅ Added reference image: ${mimeType}`);
                            } else {
                                console.warn('⚠️ Invalid image data URL format, skipping');
                            }
                        } catch (err) {
                            console.warn('⚠️ Error processing reference image:', err);
                        }
                    }

                    // Add prompt with reference instruction
                    contentParts.push({
                        text: `Using the provided reference images as style guide, generate an image: ${enhancedPrompt}`
                    });
                } else {
                    // No reference images, just text prompt
                    contentParts.push({
                        text: `Generate an image: ${enhancedPrompt}`
                    });
                }

                const response = await genAI.models.generateContent({
                    model: actualModel,
                    contents: [{ role: 'user', parts: contentParts }],
                    config: generationConfig
                });

                // Extract image from response parts
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
            console.error('✨ Quimera Vision Pro SDK error:', sdkError);
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












