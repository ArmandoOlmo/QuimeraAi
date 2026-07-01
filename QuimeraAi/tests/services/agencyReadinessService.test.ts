import { describe, expect, it } from 'vitest';
import {
    AGENCY_READINESS_COLUMN_CHECKS,
    AGENCY_READINESS_TABLES,
    runAgencyReadinessChecks,
} from '../../services/agency/agencyReadinessService';

class FakeQuery {
    constructor(
        private readonly table: string,
        private readonly columns: string,
        private readonly failures: Record<string, { code?: string; message?: string }>,
        private readonly calls: Array<{ table: string; columns: string }>,
    ) {}

    async limit(_count: number) {
        this.calls.push({ table: this.table, columns: this.columns });
        const key = `${this.table}:${this.columns}`;
        return { error: this.failures[key] || this.failures[this.table] || null };
    }
}

function createSupabase(failures: Record<string, { code?: string; message?: string }> = {}) {
    const calls: Array<{ table: string; columns: string }> = [];
    return {
        calls,
        from(table: string) {
            return {
                select(columns: string) {
                    return new FakeQuery(table, columns, failures, calls);
                },
            };
        },
    };
}

const requiredEnv = {
    SUPABASE_URL: 'https://auth.quimera.ai',
    VITE_SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    STRIPE_SECRET_KEY: 'sk_live_test',
    VITE_STRIPE_PUBLISHABLE_KEY: 'pk_live_test',
    APP_BASE_URL: 'https://www.quimera.ai',
    CRON_SECRET: 'cron-secret',
};

describe('agencyReadinessService', () => {
    it('checks required Agency tables and production contract columns without leaking secret values', async () => {
        const supabase = createSupabase();
        const result = await runAgencyReadinessChecks({
            supabase,
            env: requiredEnv,
            now: new Date('2026-07-01T20:20:00.000Z'),
        });

        expect(result.ok).toBe(true);
        expect(result.checkedAt).toBe('2026-07-01T20:20:00.000Z');
        expect(result.summary.failed).toBe(0);
        expect(result.checks).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'env:SUPABASE_ANON_KEY_OR_VITE_SUPABASE_ANON_KEY', status: 'pass', evidence: 'configured' }),
            expect.objectContaining({ name: 'env:SUPABASE_SERVICE_ROLE_KEY', status: 'pass', evidence: 'configured' }),
            expect.objectContaining({ name: 'table:agency_usage_ledger', status: 'pass' }),
            expect.objectContaining({ name: 'columns:agency_usage_ledger', status: 'pass' }),
            expect.objectContaining({ name: 'columns:agency_snapshot_applications', status: 'pass' }),
            expect.objectContaining({ name: 'env:CLOUDFLARE_API_TOKEN', status: 'skip' }),
            expect.objectContaining({ name: 'env:CLOUDFLARE_ACCOUNT_ID', status: 'skip' }),
        ]));
        expect(result.summary.skipped).toBe(2);
        expect(JSON.stringify(result)).not.toContain('service-role-key');
        expect(JSON.stringify(result)).not.toContain('anon-key');
        expect(supabase.calls.length).toBe(AGENCY_READINESS_TABLES.length + AGENCY_READINESS_COLUMN_CHECKS.length);
    });

    it('fails required env checks and can make Cloudflare required for DNS automation readiness', async () => {
        const result = await runAgencyReadinessChecks({
            supabase: createSupabase(),
            env: {},
            requireCloudflare: true,
        });

        expect(result.ok).toBe(false);
        expect(result.checks).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'env:SUPABASE_SERVICE_ROLE_KEY', status: 'fail' }),
            expect.objectContaining({ name: 'env:CLOUDFLARE_API_TOKEN', status: 'fail' }),
            expect.objectContaining({ name: 'env:STRIPE_WEBHOOK_SECRET_EDGE', status: 'warn' }),
        ]));
    });

    it('warns on partial optional Cloudflare configuration without making DNS automation mandatory', async () => {
        const result = await runAgencyReadinessChecks({
            supabase: createSupabase(),
            env: {
                ...requiredEnv,
                CLOUDFLARE_ACCOUNT_ID: 'ccb57f67da1dab2a06002657d8ea5fb1',
            },
        });

        expect(result.ok).toBe(true);
        expect(result.checks).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'env:CLOUDFLARE_ACCOUNT_ID', status: 'pass' }),
            expect.objectContaining({ name: 'env:CLOUDFLARE_API_TOKEN', status: 'warn', severity: 'warning' }),
        ]));
    });

    it('surfaces missing contract columns as critical failures', async () => {
        const columnKey = 'agency_usage_ledger:id,agency_tenant_id,client_tenant_id,source_module,usage_type,usage_quantity,unit_cost,platform_cost,client_price,agency_markup_type,agency_markup_value,margin_amount,billing_status,idempotency_key,source_entity_type,source_entity_id';
        const result = await runAgencyReadinessChecks({
            supabase: createSupabase({
                [columnKey]: { code: 'PGRST204', message: 'Could not find source_module column' },
            }),
            env: requiredEnv,
        });

        expect(result.ok).toBe(false);
        expect(result.checks).toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: 'columns:agency_usage_ledger',
                status: 'fail',
                severity: 'critical',
                evidence: 'PGRST204: Could not find source_module column',
            }),
        ]));
    });
});
