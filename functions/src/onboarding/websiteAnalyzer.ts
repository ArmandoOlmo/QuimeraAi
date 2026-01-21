/**
 * Website Analyzer Cloud Function
 * 
 * Analyzes an existing website and extracts business information
 * for auto-populating the onboarding flow.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GEMINI_CONFIG } from '../config';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// =============================================================================
// TYPES
// =============================================================================

interface WebsiteAnalysisResult {
    businessName: string;
    industry: string;
    description: string;
    tagline: string;
    services: Array<{ name: string; description: string }>;
    contactInfo: {
        email?: string;
        phone?: string;
        address?: string;
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
        youtube?: string;
    };
    brandAnalysis: {
        tone: string;
        style: string;
        colors?: string[];
    };
    suggestions: string[];
}

interface ScrapedContent {
    title: string;
    metaDescription: string;
    headings: string[];
    mainContent: string;
    contactInfo: string;
    links: string[];
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract text content from HTML by removing tags
 */
function stripHtml(html: string): string {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract meta tag content
 */
function extractMetaContent(html: string, name: string): string {
    const regex = new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
    const reverseRegex = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i');
    const match = html.match(regex) || html.match(reverseRegex);
    return match ? match[1] : '';
}

/**
 * Extract title from HTML
 */
function extractTitle(html: string): string {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match ? match[1].trim() : '';
}

/**
 * Extract headings from HTML
 */
function extractHeadings(html: string): string[] {
    const headings: string[] = [];
    const regex = /<h[1-6][^>]*>([^<]*(?:<[^\/h][^>]*>[^<]*<\/[^h][^>]*>)*[^<]*)<\/h[1-6]>/gi;
    let match;
    while ((match = regex.exec(html)) !== null && headings.length < 20) {
        const text = stripHtml(match[1]).trim();
        if (text && text.length > 2 && text.length < 200) {
            headings.push(text);
        }
    }
    return headings;
}

/**
 * Extract contact-related information
 */
function extractContactInfo(html: string): string {
    const parts: string[] = [];

    // Email
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = html.match(emailRegex) || [];
    const validEmails = emails.filter(e => !e.includes('example') && !e.includes('test'));
    if (validEmails.length > 0) {
        parts.push(`Emails: ${validEmails.slice(0, 3).join(', ')}`);
    }

    // Phone
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = html.match(phoneRegex) || [];
    if (phones.length > 0) {
        parts.push(`Phones: ${phones.slice(0, 2).join(', ')}`);
    }

    // Social links
    const socialPatterns = [
        { name: 'Facebook', pattern: /facebook\.com\/[^"'\s<>]+/i },
        { name: 'Instagram', pattern: /instagram\.com\/[^"'\s<>]+/i },
        { name: 'Twitter', pattern: /(?:twitter|x)\.com\/[^"'\s<>]+/i },
        { name: 'LinkedIn', pattern: /linkedin\.com\/(?:company|in)\/[^"'\s<>]+/i },
        { name: 'YouTube', pattern: /youtube\.com\/(?:channel|c|user|@)[^"'\s<>]+/i },
    ];

    for (const social of socialPatterns) {
        const match = html.match(social.pattern);
        if (match) {
            parts.push(`${social.name}: ${match[0]}`);
        }
    }

    return parts.join('\n');
}

/**
 * Extract main content areas
 */
function extractMainContent(html: string): string {
    // Try to find main content areas
    const mainPatterns = [
        /<main[^>]*>([\s\S]*?)<\/main>/i,
        /<article[^>]*>([\s\S]*?)<\/article>/i,
        /<div[^>]*(?:class|id)=["'][^"']*(?:content|main|body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    ];

    let content = '';
    for (const pattern of mainPatterns) {
        const match = html.match(pattern);
        if (match) {
            content += stripHtml(match[1]) + '\n\n';
        }
    }

    // If no main content found, use body
    if (!content) {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
            content = stripHtml(bodyMatch[1]);
        }
    }

    // Limit content length
    return content.slice(0, 8000);
}

/**
 * Scrape website content
 */
async function scrapeWebsite(url: string): Promise<ScrapedContent> {
    console.log(`[websiteAnalyzer] Fetching URL: ${url}`);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; QuimeraBot/1.0; +https://quimera.ai)',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
        },
        redirect: 'follow',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    return {
        title: extractTitle(html),
        metaDescription: extractMetaContent(html, 'description') || extractMetaContent(html, 'og:description'),
        headings: extractHeadings(html),
        mainContent: extractMainContent(html),
        contactInfo: extractContactInfo(html),
        links: [], // Could extract navigation links if needed
    };
}

/**
 * Analyze scraped content using Gemini AI
 */
async function analyzeWithGemini(content: ScrapedContent, url: string): Promise<WebsiteAnalysisResult> {
    const apiKey = GEMINI_CONFIG.apiKey;

    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const prompt = `You are a business analyst AI. Analyze the following website content and extract structured business information.

**Website URL:** ${url}

**Page Title:** ${content.title}

**Meta Description:** ${content.metaDescription}

**Headings Found:**
${content.headings.join('\n')}

**Contact Information Found:**
${content.contactInfo}

**Main Content:**
${content.mainContent.slice(0, 6000)}

---

Based on this content, extract and return a JSON object with the following structure. Be thorough and accurate. If information is not clearly available, make a reasonable inference based on the content and mark it. Do NOT invent information that doesn't have any basis in the content.

{
  "businessName": "The name of the business",
  "industry": "One of: technology, healthcare, finance, education, retail, food-hospitality, real-estate, legal, marketing, consulting, fitness, beauty, automotive, travel, entertainment, nonprofit, other",
  "description": "A compelling 3-5 sentence description of the business",
  "tagline": "A short catchy phrase (if found or can be inferred)",
  "services": [
    { "name": "Service/Product 1", "description": "Brief description" },
    { "name": "Service/Product 2", "description": "Brief description" }
  ],
  "contactInfo": {
    "email": "email if found",
    "phone": "phone if found",
    "address": "address if found",
    "facebook": "facebook URL if found",
    "instagram": "instagram handle if found",
    "twitter": "twitter/x handle if found",
    "linkedin": "linkedin URL if found",
    "youtube": "youtube URL if found"
  },
  "brandAnalysis": {
    "tone": "professional, casual, friendly, formal, modern, traditional, etc.",
    "style": "minimalist, bold, elegant, playful, corporate, etc.",
    "colors": ["#hexcolor1", "#hexcolor2"] // if detectable
  },
  "suggestions": [
    "Brief suggestion for improvement 1",
    "Brief suggestion for improvement 2"
  ]
}

Return ONLY valid JSON, no markdown formatting or explanation.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 4096,
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[websiteAnalyzer] Gemini API error:', errorText);
        throw new Error('AI analysis failed');
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
        throw new Error('No response from AI');
    }

    // Clean JSON from markdown
    let cleanJson = textContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

    try {
        return JSON.parse(cleanJson);
    } catch (parseError) {
        console.error('[websiteAnalyzer] JSON parse error:', parseError);
        console.error('[websiteAnalyzer] Raw response:', textContent);
        throw new Error('Failed to parse AI response');
    }
}

// =============================================================================
// CLOUD FUNCTION
// =============================================================================

/**
 * Analyze a website URL and extract business information
 */
export const analyzeWebsite = functions.https.onCall(async (data, context) => {
    // Validate authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { url } = data;

    if (!url || typeof url !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'URL is required');
    }

    // Validate URL format
    try {
        new URL(url);
    } catch {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid URL format');
    }

    const userId = context.auth.uid;

    console.log(`[websiteAnalyzer] User ${userId} analyzing: ${url}`);

    try {
        // Step 1: Scrape the website
        const scrapedContent = await scrapeWebsite(url);

        if (!scrapedContent.title && !scrapedContent.mainContent) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Could not extract content from the website. Please check the URL and try again.'
            );
        }

        // Step 2: Analyze with Gemini
        const analysisResult = await analyzeWithGemini(scrapedContent, url);

        // Step 3: Log usage
        await db.collection('apiUsage').add({
            userId,
            operation: 'website_analysis',
            url,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            success: true,
        });

        console.log(`[websiteAnalyzer] Analysis complete for ${url}`);

        return {
            success: true,
            result: analysisResult,
        };

    } catch (error: any) {
        console.error('[websiteAnalyzer] Error:', error);

        // Log failure
        await db.collection('apiUsage').add({
            userId,
            operation: 'website_analysis',
            url,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            success: false,
            error: error.message,
        }).catch(() => { });

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Failed to analyze website'
        );
    }
});
