import { supabase } from '../supabase';

const GOOGLE_IDENTITY_SCRIPT_ID = 'google-identity-services-script';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

class GoogleIdentityUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GoogleIdentityUnavailableError';
    }
}

const canUseGoogleIdentity = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
};

const getDefaultRedirectTo = (): string | undefined => {
    return typeof window !== 'undefined' ? window.location.origin : undefined;
};

const loadGoogleIdentityServices = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if ((window as any).google?.accounts?.id) {
            resolve();
            return;
        }

        const existingScript = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID) as HTMLScriptElement | null;
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => reject(new GoogleIdentityUnavailableError('No se pudo cargar Google Identity Services.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.id = GOOGLE_IDENTITY_SCRIPT_ID;
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new GoogleIdentityUnavailableError('No se pudo cargar Google Identity Services.'));
        document.head.appendChild(script);
    });
};

const getGoogleCredential = async (): Promise<string> => {
    if (!GOOGLE_CLIENT_ID) {
        throw new GoogleIdentityUnavailableError('VITE_GOOGLE_CLIENT_ID no esta configurado.');
    }
    if (!canUseGoogleIdentity()) {
        throw new GoogleIdentityUnavailableError('Google Identity Services requiere HTTPS o localhost.');
    }

    await loadGoogleIdentityServices();

    const googleAccounts = (window as any).google?.accounts?.id;
    if (!googleAccounts) {
        throw new GoogleIdentityUnavailableError('Google Identity Services no esta disponible.');
    }

    return new Promise((resolve, reject) => {
        let settled = false;

        const finish = (callback: () => void) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeout);
            callback();
        };

        const timeout = window.setTimeout(() => {
            finish(() => reject(new GoogleIdentityUnavailableError('Google Identity Services no mostro el selector de cuenta.')));
        }, 30000);

        googleAccounts.initialize({
            client_id: GOOGLE_CLIENT_ID,
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: true,
            callback: (response: { credential?: string }) => {
                if (response?.credential) {
                    finish(() => resolve(response.credential as string));
                } else {
                    finish(() => reject(new Error('Google no devolvio una credencial valida.')));
                }
            },
        });

        googleAccounts.prompt((notification: any) => {
            if (settled) return;

            if (notification?.isNotDisplayed?.()) {
                const reason = notification.getNotDisplayedReason?.() || 'not_displayed';
                finish(() => reject(new GoogleIdentityUnavailableError(`Google Identity Services no se mostro: ${reason}`)));
                return;
            }

            if (notification?.isSkippedMoment?.()) {
                const reason = notification.getSkippedReason?.() || 'skipped';
                finish(() => reject(new GoogleIdentityUnavailableError(`Google Identity Services fue omitido: ${reason}`)));
                return;
            }

            if (notification?.isDismissedMoment?.()) {
                const reason = notification.getDismissedReason?.() || 'dismissed';
                finish(() => reject(new Error(`Inicio de sesion con Google cancelado: ${reason}`)));
            }
        });
    });
};

const signInWithGoogleIdentity = async (): Promise<{ redirected: false }> => {
    const credential = await getGoogleCredential();
    const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
    });
    if (error) throw error;
    return { redirected: false };
};

export const signInWithGoogle = async (
    redirectTo: string | undefined = getDefaultRedirectTo(),
): Promise<{ redirected: boolean }> => {
    try {
        return await signInWithGoogleIdentity();
    } catch (error) {
        if (!(error instanceof GoogleIdentityUnavailableError)) {
            throw error;
        }

        console.warn('[GoogleAuth] Falling back to Supabase OAuth:', error.message);
    }

    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
    });
    if (error) throw error;
    return { redirected: true };
};
