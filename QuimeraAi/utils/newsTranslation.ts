/**
 * News Translation Utility
 * Translates NewsItem content between languages using Gemini AI
 * Adapted from articleTranslation.ts for the News module
 */

import { NewsItem } from '../types/news';
import {
    generateContentViaProxy,
    extractTextFromResponse,
} from './geminiProxyClient';
import { logApiCall } from '../services/apiLoggingService';

const TRANSLATION_MODEL = 'gemini-2.5-flash';

/**
 * Generates a unique translation group ID for news
 */
export function generateNewsTranslationGroupId(): string {
    return `ntg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Returns the target language for translation
 */
export function getNewsTargetLanguage(currentLang: 'es' | 'en'): 'es' | 'en' {
    return currentLang === 'es' ? 'en' : 'es';
}

/**
 * Returns a human-readable language name
 */
export function getNewsLanguageName(lang: 'es' | 'en'): string {
    return lang === 'es' ? 'Español' : 'English';
}

/**
 * Translates a news item's content fields using Gemini AI.
 * Returns translated fields ready to be merged into a new NewsItem.
 */
export async function translateNewsContent(
    news: NewsItem,
    targetLang: 'es' | 'en',
    userId?: string
): Promise<{
    title: string;
    excerpt: string;
    body: string;
    tags: string[];
}> {
    const sourceLangName = news.language === 'es' ? 'Spanish' : 'English';
    const targetLangName = targetLang === 'es' ? 'Spanish' : 'English';

    // Truncate body if too large
    const MAX_CONTENT_LENGTH = 10000;
    const bodyForTranslation = news.body.length > MAX_CONTENT_LENGTH
        ? news.body.substring(0, MAX_CONTENT_LENGTH) + '<!-- TRUNCATED -->'
        : news.body;

    const prompt = `You are a professional translator specializing in internal dashboard communications and product updates.
Translate the following news/update item from ${sourceLangName} to ${targetLangName}.

CRITICAL RULES:
1. Translate ALL fields accurately and naturally — not word-by-word, but with native fluency.
2. Preserve ALL HTML tags and formatting in the "body" field exactly as they appear. Only translate the text inside the tags.
3. Keep the tone professional yet friendly, appropriate for a SaaS platform dashboard.
4. Adapt the tags to be relevant in the target language.
5. The excerpt should be max 200 characters in the target language.
6. Return ONLY valid JSON — no markdown code blocks, no explanations.

NEWS ITEM TO TRANSLATE:
Title: ${news.title}
Excerpt: ${news.excerpt}
Tags: ${JSON.stringify(news.tags)}

Body (HTML — preserve all tags):
${bodyForTranslation}

REQUIRED JSON OUTPUT FORMAT:
{
  "title": "translated title",
  "excerpt": "translated excerpt (max 200 chars)",
  "body": "<p>translated HTML body content...</p>",
  "tags": ["translated", "tags"]
}`;

    try {
        console.log('[NewsTranslation] Starting translation...', {
            sourceLanguage: news.language,
            targetLanguage: targetLang,
            bodyLength: news.body.length,
        });

        const response = await generateContentViaProxy(
            'content-article-translator',
            prompt,
            TRANSLATION_MODEL,
            {},
            userId
        );

        let responseText = extractTextFromResponse(response).trim();

        // Clean markdown code blocks if present
        responseText = responseText.replace(/^```json\s*/i, '').replace(/\s*```\s*$/, '');
        responseText = responseText.replace(/^```\s*/, '').replace(/\s*```\s*$/, '');
        responseText = responseText.trim();

        // Find the JSON object boundaries
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
            responseText = responseText.substring(jsonStart, jsonEnd + 1);
        }

        const parsed = JSON.parse(responseText);

        if (userId) {
            logApiCall({
                userId,
                projectId: 'content-article-translator',
                model: TRANSLATION_MODEL,
                feature: `news-translate-${news.language}-to-${targetLang}`,
                success: true,
            });
        }

        return {
            title: String(parsed.title || ''),
            excerpt: String(parsed.excerpt || '').substring(0, 200),
            body: String(parsed.body || ''),
            tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
        };
    } catch (error) {
        console.error('[NewsTranslation] Error:', error);
        if (userId) {
            logApiCall({
                userId,
                projectId: 'app-news-admin',
                model: TRANSLATION_MODEL,
                feature: `news-translate-${news.language}-to-${targetLang}`,
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown',
            });
        }
        throw error;
    }
}

/**
 * Creates a full translated NewsItem object from the original + translated fields.
 */
export function buildTranslatedNews(
    originalNews: NewsItem,
    translatedFields: Awaited<ReturnType<typeof translateNewsContent>>,
    targetLang: 'es' | 'en',
): NewsItem {
    const now = new Date().toISOString();
    const translationGroup = originalNews.translationGroup || generateNewsTranslationGroupId();

    return {
        id: `news_${Date.now()}`,
        title: translatedFields.title,
        excerpt: translatedFields.excerpt,
        body: translatedFields.body,
        imageUrl: originalNews.imageUrl,
        videoUrl: originalNews.videoUrl,
        cta: originalNews.cta,
        category: originalNews.category,
        tags: translatedFields.tags,
        status: 'draft', // Always start as draft for review
        publishAt: undefined,
        expireAt: undefined,
        targeting: { ...originalNews.targeting },
        featured: originalNews.featured,
        priority: originalNews.priority,
        views: 0,
        clicks: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: originalNews.createdBy,
        language: targetLang,
        // Translation metadata
        translationGroup,
        translatedFrom: originalNews.id,
        translationStatus: 'auto-translated',
    };
}
