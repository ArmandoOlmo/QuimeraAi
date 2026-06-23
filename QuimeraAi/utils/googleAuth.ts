import { supabase } from '../supabase';

const getDefaultRedirectTo = (): string | undefined => {
    return typeof window !== 'undefined' ? window.location.origin : undefined;
};

export const signInWithGoogle = async (
    redirectTo: string | undefined = getDefaultRedirectTo(),
): Promise<{ redirected: boolean }> => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo,
            skipBrowserRedirect: true,
        },
    });

    if (error) throw error;

    if (typeof window !== 'undefined') {
        if (!data?.url) {
            throw new Error('No se pudo iniciar Google OAuth.');
        }

        window.location.assign(data.url);

        // Keep callers from doing SPA navigation while the OAuth redirect starts.
        await new Promise<never>(() => {});
    }

    return { redirected: true };
};
