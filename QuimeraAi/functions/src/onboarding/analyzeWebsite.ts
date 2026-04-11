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

            // Use Gemini 3.1 Flash Live Preview with URL Context tool
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

            const prompt = `Visit this website: ${normalizedUrl}

Analyze the website thoroughly and extract ALL available business information. Be very careful to separate address components into individual fields. Look in the footer, contact page, about page, and header for information.

Return ONLY a valid JSON object (no markdown, no code blocks, no explanations) with these EXACT fields:

{
  "businessName": "The business/company name as displayed on the website",
  "industry": "One of: restaurant, cafe, technology, healthcare, consulting, fitness-gym, photography, real-estate, beauty-spa, automotive, legal, finance, construction, education, travel, event-planning, retail, fashion, jewelry, electronics, home-decor, beauty-products, food-products, crafts, sports-equipment, ecommerce, other",
  "description": "A 2-3 sentence description of the business (in the same language as the website)",
  "tagline": "A short catchy tagline for the business (in the same language as the website)",
  "services": [
    { "name": "Service name", "description": "Brief description" }
  ],
  "contactInfo": {
    "email": "business email if found, or null",
    "phone": "phone number with country code if found, or null",
    "address": "street address only (e.g. '123 Main Street'), or null",
    "city": "city name only, or null",
    "state": "state/province/region, or null",
    "zipCode": "postal/zip code, or null",
    "country": "country name, or null",
    "facebook": "full Facebook URL if found, or null",
    "instagram": "full Instagram URL or @handle if found, or null",
    "twitter": "full Twitter/X URL or @handle if found, or null",
    "linkedin": "full LinkedIn URL if found, or null",
    "youtube": "full YouTube URL if found, or null",
    "tiktok": "full TikTok URL or @handle if found, or null",
    "businessHours": {
      "monday": { "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
      "tuesday": { "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
      "wednesday": { "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
      "thursday": { "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
      "friday": { "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
      "saturday": { "isOpen": false },
      "sunday": { "isOpen": false }
    }
  }
}

CRITICAL RULES for accurate extraction:
1. SEPARATE the address into individual fields: address (street), city, state, zipCode, country
   - Example: "123 Oak Ave, Miami, FL 33101, USA" → address: "123 Oak Ave", city: "Miami", state: "FL", zipCode: "33101", country: "USA"
   - DO NOT put the full address in the address field
2. For social media, extract the FULL URL (e.g. "https://facebook.com/business"), not just the platform name
3. For phone numbers, include country code if visible (e.g. "+1 305-555-1234")
4. For business hours, use 24-hour format (e.g. "09:00", "17:30"). If hours are not found, set all days to null
5. If business hours show "Mon-Fri 9-5" style, expand to individual days
6. Extract 3-6 services maximum, keeping descriptions concise
7. If a field is not found on the website, use null (not empty string)
8. The description and tagline should be in the SAME LANGUAGE as the website content
9. Return ONLY the JSON, nothing else`;

            const geminiResponse = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    tools: [{ url_context: {} }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 4000,
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

            // Sanitize: convert empty strings to null for cleaner data
            if (result.contactInfo) {
                for (const key of Object.keys(result.contactInfo)) {
                    if (result.contactInfo[key] === '' || result.contactInfo[key] === 'null') {
                        result.contactInfo[key] = null;
                    }
                }
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
                hasContactEmail: !!result.contactInfo?.email,
                hasContactPhone: !!result.contactInfo?.phone,
                hasAddress: !!result.contactInfo?.address,
                hasCity: !!result.contactInfo?.city,
                hasSocial: !!(result.contactInfo?.facebook || result.contactInfo?.instagram),
                hasBusinessHours: !!result.contactInfo?.businessHours,
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

