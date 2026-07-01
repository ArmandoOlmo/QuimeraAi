import { createClient } from '@supabase/supabase-js';
import { shouldCountSupabaseFetchFailure } from './utils/supabaseFetchGuards';

const nodeEnv = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>;

function readViteEnvValue(read: () => string | undefined): string {
  try {
    return read() || '';
  } catch {
    return '';
  }
}

const supabaseUrl = readViteEnvValue(() => import.meta.env.VITE_SUPABASE_URL) || nodeEnv.SUPABASE_URL || nodeEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = readViteEnvValue(() => import.meta.env.VITE_SUPABASE_ANON_KEY) || nodeEnv.SUPABASE_ANON_KEY || nodeEnv.VITE_SUPABASE_ANON_KEY || '';
const supabaseFetchTimeoutMs = Number(readViteEnvValue(() => import.meta.env.VITE_SUPABASE_FETCH_TIMEOUT_MS) || nodeEnv.VITE_SUPABASE_FETCH_TIMEOUT_MS || 9000);
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
  if (typeof window === 'undefined') return;

  try {
    const storage = window.localStorage;
    if (storage.getItem(SUPABASE_AUTH_STORAGE_KEY)) return;

    const legacyKey = LEGACY_AUTH_STORAGE_KEYS.find(key => storage.getItem(key));
    if (!legacyKey) return;

    const legacySession = storage.getItem(legacyKey);
    if (legacySession) {
      storage.setItem(SUPABASE_AUTH_STORAGE_KEY, legacySession);
    }
  } catch (error) {
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

function createSupabaseFetch(): typeof fetch {
  return async (input, init) => {
    const now = Date.now();
    if (supabaseCircuitOpenUntil > now) {
      const error = new Error('Supabase temporarily unavailable after repeated network failures');
      error.name = 'SupabaseUnavailableError';
      throw error;
    }

    const controller = new AbortController();
    const upstreamSignal = init?.signal;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      const timeoutError = typeof DOMException !== 'undefined'
        ? new DOMException('Supabase request timed out', 'TimeoutError')
        : Object.assign(new Error('Supabase request timed out'), { name: 'TimeoutError' });
      controller.abort(timeoutError);
    }, supabaseFetchTimeoutMs);
    const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);

    if (upstreamSignal?.aborted) {
      controller.abort(upstreamSignal.reason);
    } else {
      upstreamSignal?.addEventListener('abort', abortFromUpstream, { once: true });
    }

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      if (shouldCountSupabaseFetchFailure(null, { status: response.status })) {
        markSupabaseFetchFailure();
      } else {
        markSupabaseFetchSuccess();
      }

      return response;
    } catch (error) {
      if (shouldCountSupabaseFetchFailure(error, {
        timedOut,
        abortedByUpstream: Boolean(upstreamSignal?.aborted && !timedOut),
      })) {
        markSupabaseFetchFailure();
      }
      throw error;
    } finally {
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

(globalThis as any).__QUIMERA_SUPABASE_CLIENT__ = supabase;
