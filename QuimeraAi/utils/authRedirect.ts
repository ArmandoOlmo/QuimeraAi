const POST_AUTH_REDIRECT_STORAGE_KEY = 'quimera:postAuthRedirect';
const DEFAULT_POST_AUTH_REDIRECT = '/dashboard';

export function getSafePostAuthRedirect(value: string | null | undefined): string {
    if (value?.startsWith('/') && !value.startsWith('//')) {
        return value;
    }
    return DEFAULT_POST_AUTH_REDIRECT;
}

export function getCurrentPostAuthRedirect(): string {
    if (typeof window === 'undefined') return DEFAULT_POST_AUTH_REDIRECT;
    return getSafePostAuthRedirect(new URLSearchParams(window.location.search).get('redirect'));
}

export function storePostAuthRedirect(value: string): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(POST_AUTH_REDIRECT_STORAGE_KEY, getSafePostAuthRedirect(value));
}

export function consumeStoredPostAuthRedirect(): string {
    if (typeof window === 'undefined') return DEFAULT_POST_AUTH_REDIRECT;

    const redirect = getSafePostAuthRedirect(window.sessionStorage.getItem(POST_AUTH_REDIRECT_STORAGE_KEY));
    window.sessionStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY);
    return redirect;
}

export function clearStoredPostAuthRedirect(): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY);
}
