import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseFetchTimeoutMs = Number(import.meta.env.VITE_SUPABASE_FETCH_TIMEOUT_MS || 9000);
const SUPABASE_AUTH_STORAGE_KEY = 'sb-elfcrnhffuvntlfuvumd-auth-token';
const LEGACY_AUTH_STORAGE_KEYS = ['sb-auth-auth-token'];
const CIRCUIT_FAILURE_THRESHOLD = 4;
const CIRCUIT_OPEN_MS = 12000;
let consecutiveSupabaseFetchFailures = 0;
let supabaseCircuitOpenUntil = 0;
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Faltan las variables de entorno de Supabase. Asegúrate de configurarlas en tu archivo .env');
}
function migrateLegacyAuthStorage() {
    if (typeof window === 'undefined')
        return;
    try {
        const storage = window.localStorage;
        if (storage.getItem(SUPABASE_AUTH_STORAGE_KEY))
            return;
        const legacyKey = LEGACY_AUTH_STORAGE_KEYS.find(key => storage.getItem(key));
        if (!legacyKey)
            return;
        const legacySession = storage.getItem(legacyKey);
        if (legacySession) {
            storage.setItem(SUPABASE_AUTH_STORAGE_KEY, legacySession);
        }
    }
    catch (error) {
        console.warn('[Supabase] No se pudo migrar la sesión local de autenticación:', error);
    }
}
function markSupabaseFetchSuccess() {
    consecutiveSupabaseFetchFailures = 0;
}
function markSupabaseFetchFailure() {
    consecutiveSupabaseFetchFailures += 1;
    if (consecutiveSupabaseFetchFailures >= CIRCUIT_FAILURE_THRESHOLD) {
        supabaseCircuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
        console.warn('[Supabase] Circuit breaker temporal activado por fallos repetidos de red.');
    }
}
function isNetworkFailure(error) {
    if (!error || typeof error !== 'object')
        return false;
    const candidate = error;
    return (candidate.name === 'AbortError' ||
        candidate.name === 'TimeoutError' ||
        candidate.name === 'SupabaseUnavailableError' ||
        candidate.message === 'Failed to fetch' ||
        candidate.message?.includes('NetworkError') === true);
}
function createSupabaseFetch() {
    return async (input, init) => {
        const now = Date.now();
        if (supabaseCircuitOpenUntil > now) {
            const error = new Error('Supabase temporarily unavailable after repeated network failures');
            error.name = 'SupabaseUnavailableError';
            throw error;
        }
        const controller = new AbortController();
        const upstreamSignal = init?.signal;
        const timeout = setTimeout(() => controller.abort(), supabaseFetchTimeoutMs);
        const abortFromUpstream = () => controller.abort();
        if (upstreamSignal?.aborted) {
            controller.abort();
        }
        else {
            upstreamSignal?.addEventListener('abort', abortFromUpstream, { once: true });
        }
        try {
            const response = await fetch(input, {
                ...init,
                signal: controller.signal,
            });
            if (response.status >= 500) {
                markSupabaseFetchFailure();
            }
            else {
                markSupabaseFetchSuccess();
            }
            return response;
        }
        catch (error) {
            if (isNetworkFailure(error)) {
                markSupabaseFetchFailure();
            }
            throw error;
        }
        finally {
            clearTimeout(timeout);
            upstreamSignal?.removeEventListener('abort', abortFromUpstream);
        }
    };
}
migrateLegacyAuthStorage();
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
        fetch: createSupabaseFetch(),
    },
    auth: {
        flowType: 'implicit',
        detectSessionInUrl: true,
        autoRefreshToken: true,
        persistSession: true,
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
    },
});
//# sourceMappingURL=supabase.js.map