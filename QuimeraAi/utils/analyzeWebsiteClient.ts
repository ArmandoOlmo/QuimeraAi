/**
 * Client for server-side website analysis (scraping + AI extraction).
 * Uses the ai-proxy edge function which is already deployed in production.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL ||
    import.meta.env.VITE_VIDEO_PROXY_URL ||
    `${SUPABASE_URL}/functions/v1/ai-proxy`;

export interface AnalyzeWebsiteResult {
    success: boolean;
    result: any;
    meta?: {
        pagesScraped?: number;
        subpagesVisited?: Array<{ url: string; title: string }>;
    };
    error?: string;
}

export async function analyzeWebsite(url: string): Promise<AnalyzeWebsiteResult> {
    const response = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyzeWebsite', url }),
    });

    const data = await response.json().catch(() => null) as AnalyzeWebsiteResult | { error?: string; response?: unknown } | null;

    if (!response.ok) {
        throw new Error(data?.error || `Website analysis failed (${response.status})`);
    }

    if (!data || !('success' in data) || !data.success || !data.result) {
        if (data && 'response' in data) {
            throw new Error(
                'La extracción de sitios web aún no está desplegada. Ejecuta: npx supabase login && npx supabase functions deploy ai-proxy --project-ref elfcrnhffuvntlfuvumd'
            );
        }
        throw new Error(data?.error || 'Analysis returned no data');
    }

    return data;
}
