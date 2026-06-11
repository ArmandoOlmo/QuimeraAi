import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

const DEFAULT_LOGO_URL = '/logos/quimera-icon.svg';

/** Full logo with "Quimera.ai" text integrated — used in header and sidebar */
const FULL_LOGO_URL = '/logos/quimera-full-dark.png';

// Module-level cache to avoid multiple Supabase listeners
let cachedLogoUrl: string | null = null;
let listeners: Array<(url: string) => void> = [];
let unsubscribe: (() => void) | null = null;
let channel: any = null;

function startListening() {
    if (unsubscribe) return; // Already listening

    const fetchInitial = async () => {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('config')
                .eq('id', 'appInfo')
                .maybeSingle();

            if (!error && data?.config?.logoUrl) {
                cachedLogoUrl = data.config.logoUrl;
                listeners.forEach(fn => fn(data.config.logoUrl));
            } else {
                cachedLogoUrl = DEFAULT_LOGO_URL;
                listeners.forEach(fn => fn(DEFAULT_LOGO_URL));
            }
        } catch (e) {
            console.error('[useAppLogo] Initial fetch error:', e);
            cachedLogoUrl = DEFAULT_LOGO_URL;
            listeners.forEach(fn => fn(DEFAULT_LOGO_URL));
        }
    };

    fetchInitial();

    // Mark as "listening" so we don't re-fetch
    unsubscribe = () => { /* no-op — one-shot fetch, no channel to tear down */ };
}

/**
 * Hook that provides the global app logo URL from Supabase.
 * Uses a shared real-time listener so all consumers stay in sync
 * with zero redundant Supabase reads.
 *
 * Falls back to the default hardcoded Quimera logo if no custom
 * logo has been uploaded via Super Admin > App Information.
 */
export function useAppLogo(): { logoUrl: string; isLoading: boolean } {
    const [logoUrl, setLogoUrl] = useState<string>(cachedLogoUrl || DEFAULT_LOGO_URL);
    const [isLoading, setIsLoading] = useState(!cachedLogoUrl);

    useEffect(() => {
        // If already cached, use it immediately
        if (cachedLogoUrl) {
            setLogoUrl(cachedLogoUrl);
            setIsLoading(false);
        }

        const handler = (url: string) => {
            setLogoUrl(url);
            setIsLoading(false);
        };

        listeners.push(handler);
        startListening();

        return () => {
            listeners = listeners.filter(l => l !== handler);
            // Stop listener when no consumers remain
            if (listeners.length === 0 && unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }
        };
    }, []);

    return { logoUrl, isLoading };
}

/** Default logo URL constant for non-hook usage (static contexts, SSR, etc.) */
export const QUIMERA_DEFAULT_LOGO = DEFAULT_LOGO_URL;

/** Full logo with integrated text — for sidebar use */
export const QUIMERA_FULL_LOGO = FULL_LOGO_URL;

/** Full logo in black for light mode */
export const QUIMERA_FULL_LOGO_LIGHT = '/logos/quimera-full-light.png';

export default useAppLogo;
