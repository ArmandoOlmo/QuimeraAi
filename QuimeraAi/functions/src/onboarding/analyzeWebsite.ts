/**
 * Analyze Website Cloud Function
 * Uses Gemini URL Context tool to fetch and analyze websites directly.
 * Google's infrastructure handles the fetching, so CDN/WAF blocking is not an issue.
 * Used in the onboarding flow (Step 0) for all users.
 */

import * as functions from 'firebase-functions';
import { GEMINI_CONFIG } from '../config';

// ============================================================================
// MAIN CLOUD FUNCTION
// ============================================================================

export const analyzeWebsite = functions
    .runWith({ timeoutSeconds: 60, memory: '512MB' })
    .https.onCall(async (data, context) => {
        const userId = context.auth?.uid;

        if (!userId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { url } = data;

        if (!url || typeof url !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'URL is required');
        }

        // Normalize URL
        let normalizedUrl = url.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = `https://${normalizedUrl}`;
        }

        functions.logger.info('Analyzing website with URL Context', { url: normalizedUrl, userId });

        try {
            const apiKey = GEMINI_CONFIG.apiKey;
            if (!apiKey) {
                throw new functions.https.HttpsError('internal', 'AI configuration error');
            }

            // Use Gemini URL Context tool — Google fetches the website, not us
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

            const prompt = `Visit this website: ${normalizedUrl}

Analyze the website and extract business information. Return ONLY a valid JSON object (no markdown, no code blocks, no explanations) with these fields:

{
  "businessName": "The business/company name",
  "industry": "One of: restaurant, technology, healthcare, consulting, fitness-gym, photography, real-estate, beauty-spa, automotive, legal, finance, construction, education, travel, event-planning, retail, fashion, jewelry, electronics, home-decor, beauty-products, food-products, crafts, sports-equipment, other",
  "description": "A 2-3 sentence description of the business (in the same language as the website)",
  "tagline": "A short catchy tagline for the business (in the same language as the website)",
  "services": [
    { "name": "Service name", "description": "Brief description" }
  ],
  "contactInfo": {
    "email": "email if found or null",
    "phone": "phone if found or null",
    "address": "address if found or null",
    "facebook": "facebook URL if found or null",
    "instagram": "instagram URL if found or null",
    "twitter": "twitter/X URL if found or null",
    "linkedin": "linkedin URL if found or null",
    "youtube": "youtube URL if found or null"
  }
}

Important rules:
- Extract 3-6 services maximum
- Keep descriptions concise
- If a field is not found, use null
- The description and tagline should be in the same language as the website
- Return ONLY the JSON, nothing else`;

            const geminiResponse = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    tools: [{ url_context: {} }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 2000,
                    },
                }),
            });

            if (!geminiResponse.ok) {
                const errorText = await geminiResponse.text();
                functions.logger.error('Gemini API error', { status: geminiResponse.status, error: errorText });
                throw new functions.https.HttpsError('internal', 'AI analysis failed. Please try again.');
            }

            const geminiData = await geminiResponse.json();

            // Extract text from response (may have multiple parts with URL context)
            const parts = geminiData?.candidates?.[0]?.content?.parts || [];
            let responseText = '';
            for (const part of parts) {
                if (part.text) {
                    responseText += part.text;
                }
            }

            if (!responseText) {
                functions.logger.error('Empty Gemini response', { geminiData: JSON.stringify(geminiData).slice(0, 500) });
                throw new functions.https.HttpsError('internal', 'Could not analyze the website. Please try a different URL.');
            }

            // Clean up response (remove markdown code blocks if present)
            const jsonText = responseText
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/g, '')
                .trim();

            let result;
            try {
                result = JSON.parse(jsonText);
            } catch (parseError) {
                functions.logger.error('Failed to parse Gemini response', { responseText: responseText.slice(0, 500) });
                throw new functions.https.HttpsError('internal', 'Failed to parse analysis results. Please try again.');
            }

            // Log URL context metadata if available
            const urlContextMetadata = geminiData?.candidates?.[0]?.urlContextMetadata;
            if (urlContextMetadata) {
                functions.logger.info('URL Context metadata', { metadata: JSON.stringify(urlContextMetadata).slice(0, 300) });
            }

            functions.logger.info('Website analysis complete', {
                url: normalizedUrl,
                businessName: result.businessName,
                industry: result.industry,
                servicesCount: result.services?.length || 0,
            });

            return {
                success: true,
                result,
            };

        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) {
                throw error;
            }

            functions.logger.error('Website analysis error', {
                url: normalizedUrl,
                error: error.message,
            });

            throw new functions.https.HttpsError('internal', `Analysis failed: ${error.message}`);
        }
    });
