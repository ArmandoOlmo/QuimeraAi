/**
 * Client for server-side website analysis (scraping + AI extraction).
 * Uses the ai-proxy edge function which is already deployed in production.
 */

import { supabase } from '../supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://auth.quimera.ai';
const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL ||
    import.meta.env.VITE_VIDEO_PROXY_URL ||
    `${SUPABASE_URL}/functions/v1/ai-proxy`;

export interface AnalyzeWebsiteResult {
    success: boolean;
    result: any;
    meta?: {
        pagesScraped?: number;
        subpagesVisited?: Array<{ url: string; title: string; purpose?: string; summary?: string }>;
        sitemapPagesFound?: number;
    };
    error?: string;
}

export async function analyzeWebsite(url: string): Promise<AnalyzeWebsiteResult> {
    const payload = { action: 'analyzeWebsite', url };
    const functionName = getSupabaseFunctionName(AI_PROXY_URL);

    if (functionName) {
        const { data, error } = await supabase.functions.invoke(functionName, {
            body: payload,
        });

        if (error) {
            const message = await getSupabaseFunctionErrorMessage(error);
            throw new Error(message || `Website analysis failed (${functionName})`);
        }

        return normalizeAnalyzeWebsiteResponse(data);
    }

    const response = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(data?.error || `Website analysis failed (${response.status})`);
    }

    return normalizeAnalyzeWebsiteResponse(data);
}

function normalizeAnalyzeWebsiteResponse(data: unknown): AnalyzeWebsiteResult {
    if (!data || typeof data !== 'object') {
        throw new Error('Analysis returned no data');
    }

    const payload = data as Partial<AnalyzeWebsiteResult> & { response?: unknown };

    if (!('success' in payload) && 'response' in payload) {
        throw new Error(
            'La extracción de sitios web aún no está desplegada. Ejecuta: npx supabase login && npx supabase functions deploy ai-proxy --project-ref elfcrnhffuvntlfuvumd'
        );
    }

    if (payload.success !== true) {
        throw new Error(payload.error || 'Analysis was not successful');
    }

    if (!payload.result || typeof payload.result !== 'object') {
        throw new Error(payload.error || 'Analysis returned no extracted website data');
    }

    return payload as AnalyzeWebsiteResult;
}

function getSupabaseFunctionName(endpoint: string): string | null {
    try {
        const endpointUrl = new URL(endpoint);
        const supabaseUrl = new URL(SUPABASE_URL);

        if (endpointUrl.origin !== supabaseUrl.origin) return null;

        const match = endpointUrl.pathname.match(/^\/functions\/v1\/([^/?#]+)/);
        return match?.[1] || null;
    } catch {
        return null;
    }
}

async function readJsonResponse(response: Response): Promise<{ error?: string } | AnalyzeWebsiteResult | null> {
    const text = await response.text().catch(() => '');
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

async function getSupabaseFunctionErrorMessage(error: unknown): Promise<string> {
    const err = error as { message?: string; context?: unknown };
    const context = err?.context;

    if (context instanceof Response) {
        const data = await readJsonResponse(context);
        if (data?.error) return data.error;
    }

    return err?.message || '';
}
