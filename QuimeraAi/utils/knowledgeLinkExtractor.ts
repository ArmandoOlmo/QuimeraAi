/**
 * Knowledge Link Extractor
 * 
 * Client-side utility for extracting content from URLs via the 
 * extractContent Cloud Function.
 */

import { KnowledgeLink } from '../types';

const EXTRACT_URL = import.meta.env.VITE_EXTRACT_CONTENT_URL ||
    'https://us-central1-quimeraai.cloudfunctions.net/knowledge-extractContent';

/**
 * Detect if a URL is a YouTube link
 */
export function isYouTubeUrl(url: string): boolean {
    return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch|embed|shorts|playlist)|youtu\.be\/)/i.test(url);
}

/**
 * Validate a URL string
 */
export function isValidUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

/**
 * Extract content from a URL using the Cloud Function
 */
export async function extractLinkContent(
    url: string,
    projectId: string
): Promise<Omit<KnowledgeLink, 'id' | 'status'>> {
    const response = await fetch(EXTRACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, projectId }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(error.error || `Failed to extract content: ${response.status}`);
    }

    const data = await response.json();

    return {
        url: data.url,
        title: data.title,
        content: data.content,
        type: data.type || (isYouTubeUrl(url) ? 'youtube' : 'website'),
        contentLength: data.contentLength || data.content?.length || 0,
        thumbnailUrl: data.thumbnailUrl,
        extractedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    };
}
