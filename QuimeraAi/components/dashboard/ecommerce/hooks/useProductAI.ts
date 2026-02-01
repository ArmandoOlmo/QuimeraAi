/**
 * useProductAI Hook
 * Hook para generación de contenido de productos con AI
 */

import { useState, useCallback } from 'react';
import { generateContentViaProxy, extractTextFromResponse } from '../../../../utils/geminiProxyClient';
import { logApiCall } from '../../../../services/apiLoggingService';

interface GeneratedDescription {
    description: string;
    shortDescription: string;
}

interface GeneratedSEO {
    metaTitle: string;
    metaDescription: string;
}

interface GeneratedContent {
    description: string;
    shortDescription: string;
    metaTitle: string;
    metaDescription: string;
    tags: string[];
}

interface ProductDataForAI {
    name: string;
    category?: string;
    features?: string;
    currentDescription?: string;
}

interface UseProductAIReturn {
    // Generation functions
    generateDescription: (data: ProductDataForAI) => Promise<GeneratedDescription>;
    generateSEO: (name: string, description: string) => Promise<GeneratedSEO>;
    generateTags: (name: string, description: string, category?: string) => Promise<string[]>;
    generateAll: (data: ProductDataForAI) => Promise<GeneratedContent>;
    
    // Loading states
    isGeneratingDescription: boolean;
    isGeneratingSEO: boolean;
    isGeneratingTags: boolean;
    isGeneratingAll: boolean;
    
    // Error state
    error: string | null;
    clearError: () => void;
}

// Helper to detect language from text (simple heuristic)
const detectLanguage = (text: string): 'es' | 'en' => {
    const spanishPatterns = /[áéíóúüñ¿¡]/i;
    const spanishWords = /\b(el|la|los|las|de|del|para|con|por|que|una|uno|es|son|tiene|nuevo|nueva)\b/i;
    
    if (spanishPatterns.test(text) || spanishWords.test(text)) {
        return 'es';
    }
    return 'en';
};

// Clean JSON from markdown code blocks
const cleanJsonResponse = (text: string): string => {
    let cleaned = text.replace(/```json\n?|```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    return cleaned;
};

export const useProductAI = (userId?: string, storeId?: string): UseProductAIReturn => {
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
    const [isGeneratingTags, setIsGeneratingTags] = useState(false);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const projectId = storeId || userId || 'ecommerce-ai';

    const clearError = useCallback(() => setError(null), []);

    /**
     * Generate product description and short description
     */
    const generateDescription = useCallback(async (data: ProductDataForAI): Promise<GeneratedDescription> => {
        setIsGeneratingDescription(true);
        setError(null);

        try {
            const language = detectLanguage(data.name);
            const languageInstruction = language === 'es' 
                ? 'Responde completamente en español.' 
                : 'Respond completely in English.';

            const prompt = `You are an expert ecommerce copywriter. Generate a compelling product description.

Product Name: ${data.name}
${data.category ? `Category: ${data.category}` : ''}
${data.features ? `Features/Details: ${data.features}` : ''}

Requirements:
- Main description: 150-300 words, persuasive but informative
- Short description: 1-2 sentences, max 100 characters, for product cards
- Highlight key benefits and features
- Use natural SEO keywords
- ${languageInstruction}

Respond in JSON format ONLY (no markdown, no explanation):
{
    "description": "full product description here",
    "shortDescription": "brief description here"
}`;

            const response = await generateContentViaProxy(projectId, prompt, 'gemini-2.5-flash', {
                temperature: 0.7,
                maxOutputTokens: 1024
            }, userId);

            // Log successful API call
            if (userId) {
                logApiCall({
                    userId,
                    projectId,
                    model: 'gemini-2.5-flash',
                    feature: 'ecommerce-product-description',
                    success: true
                });
            }

            const text = extractTextFromResponse(response);
            const cleaned = cleanJsonResponse(text);
            const parsed = JSON.parse(cleaned);

            return {
                description: parsed.description || '',
                shortDescription: parsed.shortDescription || ''
            };
        } catch (err: any) {
            // Log failed API call
            if (userId) {
                logApiCall({
                    userId,
                    projectId,
                    model: 'gemini-2.5-flash',
                    feature: 'ecommerce-product-description',
                    success: false,
                    errorMessage: err.message || 'Unknown error'
                });
            }
            console.error('Error generating description:', err);
            setError(err.message || 'Error al generar descripción');
            throw err;
        } finally {
            setIsGeneratingDescription(false);
        }
    }, [projectId, userId]);

    /**
     * Generate SEO meta title and description
     */
    const generateSEO = useCallback(async (name: string, description: string): Promise<GeneratedSEO> => {
        setIsGeneratingSEO(true);
        setError(null);

        try {
            const language = detectLanguage(name);
            const languageInstruction = language === 'es' 
                ? 'Responde en español.' 
                : 'Respond in English.';

            const prompt = `You are an SEO expert. Generate optimized meta tags for this product.

Product Name: ${name}
Product Description: ${description.substring(0, 500)}

Requirements:
- Meta Title: maximum 60 characters, include product name and key benefit
- Meta Description: maximum 155 characters, compelling call-to-action
- ${languageInstruction}

Respond in JSON format ONLY (no markdown):
{
    "metaTitle": "SEO title here",
    "metaDescription": "SEO description here"
}`;

            const response = await generateContentViaProxy(projectId, prompt, 'gemini-2.5-flash', {
                temperature: 0.6,
                maxOutputTokens: 512
            }, userId);

            // Log successful API call
            if (userId) {
                logApiCall({
                    userId,
                    projectId,
                    model: 'gemini-2.5-flash',
                    feature: 'ecommerce-product-seo',
                    success: true
                });
            }

            const text = extractTextFromResponse(response);
            const cleaned = cleanJsonResponse(text);
            const parsed = JSON.parse(cleaned);

            return {
                metaTitle: (parsed.metaTitle || '').substring(0, 60),
                metaDescription: (parsed.metaDescription || '').substring(0, 155)
            };
        } catch (err: any) {
            // Log failed API call
            if (userId) {
                logApiCall({
                    userId,
                    projectId,
                    model: 'gemini-2.5-flash',
                    feature: 'ecommerce-product-seo',
                    success: false,
                    errorMessage: err.message || 'Unknown error'
                });
            }
            console.error('Error generating SEO:', err);
            setError(err.message || 'Error al generar SEO');
            throw err;
        } finally {
            setIsGeneratingSEO(false);
        }
    }, [projectId, userId]);

    /**
     * Generate product tags
     */
    const generateTags = useCallback(async (name: string, description: string, category?: string): Promise<string[]> => {
        setIsGeneratingTags(true);
        setError(null);

        try {
            const language = detectLanguage(name);
            const languageInstruction = language === 'es' 
                ? 'Genera tags en español.' 
                : 'Generate tags in English.';

            const prompt = `You are an ecommerce tagging expert. Generate relevant product tags.

Product Name: ${name}
${category ? `Category: ${category}` : ''}
Description: ${description.substring(0, 300)}

Requirements:
- Generate 5-8 relevant tags
- Tags should be lowercase, single words or short phrases
- Include category-related, feature-related, and search-friendly tags
- ${languageInstruction}

Respond in JSON format ONLY (no markdown):
{
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

            const response = await generateContentViaProxy(projectId, prompt, 'gemini-2.5-flash', {
                temperature: 0.5,
                maxOutputTokens: 256
            }, userId);

            // Log successful API call
            if (userId) {
                logApiCall({
                    userId,
                    projectId,
                    model: 'gemini-2.5-flash',
                    feature: 'ecommerce-product-tags',
                    success: true
                });
            }

            const text = extractTextFromResponse(response);
            const cleaned = cleanJsonResponse(text);
            const parsed = JSON.parse(cleaned);

            return Array.isArray(parsed.tags) ? parsed.tags : [];
        } catch (err: any) {
            // Log failed API call
            if (userId) {
                logApiCall({
                    userId,
                    projectId,
                    model: 'gemini-2.5-flash',
                    feature: 'ecommerce-product-tags',
                    success: false,
                    errorMessage: err.message || 'Unknown error'
                });
            }
            console.error('Error generating tags:', err);
            setError(err.message || 'Error al generar etiquetas');
            throw err;
        } finally {
            setIsGeneratingTags(false);
        }
    }, [projectId, userId]);

    /**
     * Generate all content at once (description, SEO, tags)
     */
    const generateAll = useCallback(async (data: ProductDataForAI): Promise<GeneratedContent> => {
        setIsGeneratingAll(true);
        setError(null);

        try {
            const language = detectLanguage(data.name);
            const languageInstruction = language === 'es' 
                ? 'Responde completamente en español.' 
                : 'Respond completely in English.';

            const prompt = `You are an expert ecommerce copywriter and SEO specialist. Generate complete product content.

Product Name: ${data.name}
${data.category ? `Category: ${data.category}` : ''}
${data.features ? `Features/Details: ${data.features}` : ''}

Generate:
1. Full description (150-300 words, persuasive, highlight benefits)
2. Short description (1-2 sentences, max 100 chars, for product cards)
3. SEO meta title (max 60 chars)
4. SEO meta description (max 155 chars, with call-to-action)
5. Product tags (5-8 relevant, lowercase tags)

Requirements:
- Use natural SEO keywords throughout
- ${languageInstruction}

Respond in JSON format ONLY (no markdown, no explanation):
{
    "description": "full product description",
    "shortDescription": "brief description",
    "metaTitle": "SEO title",
    "metaDescription": "SEO description",
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

            const response = await generateContentViaProxy(projectId, prompt, 'gemini-2.5-flash', {
                temperature: 0.7,
                maxOutputTokens: 2048
            }, userId);

            // Log successful API call
            if (userId) {
                logApiCall({
                    userId,
                    projectId,
                    model: 'gemini-2.5-flash',
                    feature: 'ecommerce-product-all',
                    success: true
                });
            }

            const text = extractTextFromResponse(response);
            const cleaned = cleanJsonResponse(text);
            const parsed = JSON.parse(cleaned);

            return {
                description: parsed.description || '',
                shortDescription: parsed.shortDescription || '',
                metaTitle: (parsed.metaTitle || '').substring(0, 60),
                metaDescription: (parsed.metaDescription || '').substring(0, 155),
                tags: Array.isArray(parsed.tags) ? parsed.tags : []
            };
        } catch (err: any) {
            // Log failed API call
            if (userId) {
                logApiCall({
                    userId,
                    projectId,
                    model: 'gemini-2.5-flash',
                    feature: 'ecommerce-product-all',
                    success: false,
                    errorMessage: err.message || 'Unknown error'
                });
            }
            console.error('Error generating all content:', err);
            setError(err.message || 'Error al generar contenido');
            throw err;
        } finally {
            setIsGeneratingAll(false);
        }
    }, [projectId, userId]);

    return {
        generateDescription,
        generateSEO,
        generateTags,
        generateAll,
        isGeneratingDescription,
        isGeneratingSEO,
        isGeneratingTags,
        isGeneratingAll,
        error,
        clearError
    };
};

export default useProductAI;











