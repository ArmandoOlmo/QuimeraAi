import { useEffect, useState } from 'react';
import { db, doc, onSnapshot } from '../firebase';

const DEFAULT_LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032';

// Module-level cache to avoid multiple Firestore listeners
let cachedLogoUrl: string | null = null;
let listeners: Array<(url: string) => void> = [];
let unsubscribe: (() => void) | null = null;

function startListening() {
    if (unsubscribe) return; // Already listening

    const settingsRef = doc(db, 'globalSettings', 'appInfo');
    unsubscribe = onSnapshot(settingsRef, (snap) => {
        const data = snap.data();
        const url = data?.logoUrl || DEFAULT_LOGO_URL;
        cachedLogoUrl = url;
        listeners.forEach(fn => fn(url));
    }, (error) => {
        console.error('[useAppLogo] Firestore listener error:', error);
        cachedLogoUrl = DEFAULT_LOGO_URL;
        listeners.forEach(fn => fn(DEFAULT_LOGO_URL));
    });
}

/**
 * Hook that provides the global app logo URL from Firestore.
 * Uses a shared real-time listener so all consumers stay in sync
 * with zero redundant Firestore reads.
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

export default useAppLogo;
