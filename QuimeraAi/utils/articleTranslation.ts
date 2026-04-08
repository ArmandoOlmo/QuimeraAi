/**
 * Article Translation Utility
 * Translates AppArticle content between languages using Gemini AI
 */

import { AppArticle } from '../types/appContent';
import {
    generateContentViaProxy,
    extractTextFromResponse,
} from './geminiProxyClient';
import { logApiCall } from '../services/apiLoggingService';

const TRANSLATION_MODEL = 'gemini-2.5-flash';

/**
 * Generates a unique translation group ID
 */
export function generateTranslationGroupId(): string {
    return `tg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Returns the target language for translation
 */
export function getTargetLanguage(currentLang: 'es' | 'en'): 'es' | 'en' {
    return currentLang === 'es' ? 'en' : 'es';
}

/**
 * Returns a human-readable language name
 */
export function getLanguageName(lang: 'es' | 'en'): string {
    return lang === 'es' ? 'Español' : 'English';
}

/**
 * Translates an article's content fields using Gemini AI.
 * Returns translated fields ready to be merged into a new AppArticle.
 */
export async function translateArticleContent(
    article: AppArticle,
    targetLang: 'es' | 'en',
    userId?: string
): Promise<{
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    tags: string[];
    seo: {
        metaTitle: string;
        metaDescription: string;
        metaKeywords: string[];
    };
}> {
    const sourceLangName = article.language === 'es' ? 'Spanish' : 'English';
    const targetLangName = targetLang === 'es' ? 'Spanish' : 'English';

    // Truncate content if too large to avoid proxy payload limits
    const MAX_CONTENT_LENGTH = 15000;
    const contentForTranslation = article.content.length > MAX_CONTENT_LENGTH
        ? article.content.substring(0, MAX_CONTENT_LENGTH) + '<!-- TRUNCATED -->'
        : article.content;

    const prompt = `You are a professional translator specializing in web content and SEO.
Translate the following article from ${sourceLangName} to ${targetLangName}.

CRITICAL RULES:
1. Translate ALL fields accurately and naturally — not word-by-word, but with native fluency.
2. Preserve ALL HTML tags and formatting in the "content" field exactly as they appear. Only translate the text inside the tags.
3. Generate a proper URL-friendly "slug" in the target language (lowercase, hyphens, no special chars).
4. Adapt the tags and SEO metadata to be relevant in the target language.
5. Return ONLY valid JSON — no markdown code blocks, no explanations.

ARTICLE TO TRANSLATE:
Title: ${article.title}
Excerpt: ${article.excerpt}
Tags: ${JSON.stringify(article.tags)}
SEO Title: ${article.seo?.metaTitle || article.title}
SEO Description: ${article.seo?.metaDescription || article.excerpt}
SEO Keywords: ${JSON.stringify(article.seo?.metaKeywords || article.tags)}

Content (HTML — preserve all tags):
${contentForTranslation}

REQUIRED JSON OUTPUT FORMAT:
{
  "title": "translated title",
  "slug": "translated-slug-in-target-language",
  "content": "<p>translated HTML content...</p>",
  "excerpt": "translated excerpt",
  "tags": ["translated", "tags"],
  "seo": {
    "metaTitle": "translated SEO title",
    "metaDescription": "translated SEO description",
    "metaKeywords": ["translated", "keywords"]
  }
}`;

    try {
        console.log('[Translation] Starting translation...', {
            sourceLanguage: article.language,
            targetLanguage: targetLang,
            contentLength: article.content.length,
            truncated: article.content.length > MAX_CONTENT_LENGTH,
        });

        const response = await generateContentViaProxy(
            'content-article-translator',
            prompt,
            TRANSLATION_MODEL,
            {},
            userId
        );

        let responseText = extractTextFromResponse(response).trim();
        console.log('[Translation] Raw response length:', responseText.length);
        console.log('[Translation] Response preview:', responseText.substring(0, 200));

        // Clean markdown code blocks if present (handle all variations)
        responseText = responseText.replace(/^```json\s*/i, '').replace(/\s*```\s*$/, '');
        responseText = responseText.replace(/^```\s*/, '').replace(/\s*```\s*$/, '');
        responseText = responseText.trim();

        // Find the JSON object boundaries if there's extra text
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
            responseText = responseText.substring(jsonStart, jsonEnd + 1);
        }

        const parsed = JSON.parse(responseText);
        console.log('[Translation] Parsed successfully. Title:', parsed.title);
        console.log('[Translation] Parsed content length:', parsed.content?.length || 0);

        // Log success
        if (userId) {
            logApiCall({
                userId,
                projectId: 'app-content-admin',
                model: TRANSLATION_MODEL,
                feature: `article-translate-${article.language}-to-${targetLang}`,
                success: true,
            });
        }

        return {
            title: String(parsed.title || ''),
            slug: String(parsed.slug || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)+/g, ''),
            content: String(parsed.content || ''),
            excerpt: String(parsed.excerpt || ''),
            tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
            seo: {
                metaTitle: String(parsed.seo?.metaTitle || parsed.title || ''),
                metaDescription: String(parsed.seo?.metaDescription || parsed.excerpt || ''),
                metaKeywords: Array.isArray(parsed.seo?.metaKeywords)
                    ? parsed.seo.metaKeywords.map(String)
                    : (Array.isArray(parsed.tags) ? parsed.tags.map(String) : []),
            },
        };
    } catch (error) {
        console.error('[Translation] Error translating article:', error);
        // Log failure
        if (userId) {
            logApiCall({
                userId,
                projectId: 'app-content-admin',
                model: TRANSLATION_MODEL,
                feature: `article-translate-${article.language}-to-${targetLang}`,
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown',
            });
        }
        throw error;
    }
}

/**
 * Creates a full translated AppArticle object from the original + translated fields.
 */
export function buildTranslatedArticle(
    originalArticle: AppArticle,
    translatedFields: Awaited<ReturnType<typeof translateArticleContent>>,
    targetLang: 'es' | 'en',
): AppArticle {
    const now = new Date().toISOString();
    const translationGroup = originalArticle.translationGroup || generateTranslationGroupId();

    return {
        id: `article_${Date.now()}`,
        title: translatedFields.title,
        slug: translatedFields.slug,
        content: translatedFields.content,
        excerpt: translatedFields.excerpt,
        featuredImage: originalArticle.featuredImage || '', // Share the same image
        status: 'draft', // Always start as draft for review
        featured: originalArticle.featured,
        category: originalArticle.category,
        tags: translatedFields.tags,
        author: originalArticle.author,
        showAuthor: originalArticle.showAuthor ?? true,
        showDate: originalArticle.showDate ?? true,
        authorImage: originalArticle.authorImage || null,
        readTime: originalArticle.readTime || 1,
        views: 0,
        createdAt: now,
        updatedAt: now,
        publishedAt: undefined,
        language: targetLang,
        seo: translatedFields.seo,
        // Translation metadata
        translationGroup,
        translatedFrom: originalArticle.id,
        translationStatus: 'auto-translated',
    } as AppArticle;
}
