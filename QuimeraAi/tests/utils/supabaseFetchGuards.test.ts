import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    isTransientSupabaseAvailabilityError,
    shouldCountSupabaseFetchFailure,
} from '../../utils/supabaseFetchGuards';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Supabase fetch availability guards', () => {
    it('does not open the global circuit breaker for caller-cancelled requests', () => {
        const abortError = Object.assign(new Error('signal is aborted without reason'), { name: 'AbortError' });

        expect(shouldCountSupabaseFetchFailure(abortError)).toBe(false);
        expect(shouldCountSupabaseFetchFailure(abortError, { abortedByUpstream: true })).toBe(false);
    });

    it('counts real Supabase availability failures', () => {
        expect(shouldCountSupabaseFetchFailure(null, { status: 500 })).toBe(true);
        expect(shouldCountSupabaseFetchFailure(null, { status: 503 })).toBe(true);
        expect(shouldCountSupabaseFetchFailure(null, { status: 400 })).toBe(false);
        expect(shouldCountSupabaseFetchFailure(Object.assign(new Error('timeout'), { name: 'TimeoutError' }))).toBe(true);
        expect(shouldCountSupabaseFetchFailure(new Error('Failed to fetch'))).toBe(true);
    });

    it('keeps credits usage transient errors out of the noisy console error path', () => {
        expect(isTransientSupabaseAvailabilityError(Object.assign(new Error('aborted'), { name: 'AbortError' }))).toBe(true);
        expect(isTransientSupabaseAvailabilityError(Object.assign(new Error('timeout'), { name: 'TimeoutError' }))).toBe(true);
        expect(isTransientSupabaseAvailabilityError(Object.assign(new Error('open'), { name: 'SupabaseUnavailableError' }))).toBe(true);
        expect(isTransientSupabaseAvailabilityError(new Error('permission denied'))).toBe(false);
    });

    it('deduplicates credits usage requests by tenant before hitting Supabase', () => {
        const source = read('hooks/useCreditsUsage.ts');

        expect(source).toContain('const subscriptionUsageRequests = new Map<string, Promise<SubscriptionUsageRow | null>>();');
        expect(source).toContain('const inFlight = subscriptionUsageRequests.get(tenantId);');
        expect(source).toContain('if (inFlight)');
        expect(source).toContain('return inFlight;');
        expect(source).toContain('subscriptionUsageCache.set(tenantId');
        expect(source).toContain('refresh: () => loadUsage({ force: true })');
    });
});
