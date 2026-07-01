export type AgencyReadinessStatus = 'pass' | 'warn' | 'fail' | 'skip';

export interface AgencyReadinessCheck {
    name: string;
    status: AgencyReadinessStatus;
    evidence: string;
    severity?: 'critical' | 'warning' | 'info';
}

export interface AgencyReadinessResult {
    ok: boolean;
    checkedAt: string;
    summary: {
        passed: number;
        warnings: number;
        failed: number;
        skipped: number;
    };
    checks: AgencyReadinessCheck[];
}

type SupabaseLike = {
    from: (table: string) => any;
};

export type AgencyReadinessEnv = Record<string, string | undefined>;

export const AGENCY_READINESS_TABLES = [
    'tenants',
    'tenant_members',
    'subscription_plans',
    'subscriptions',
    'projects',
    'custom_domains',
    'agency_service_plans',
    'agency_clients',
    'agency_project_transfers',
    'agency_client_approvals',
    'agency_client_payment_links',
    'agency_reports',
    'agency_client_notes',
    'agency_activity',
    'agency_usage_ledger',
    'agency_billing_events',
    'agency_snapshots',
    'agency_snapshot_versions',
    'agency_snapshot_applications',
] as const;

export const AGENCY_READINESS_COLUMN_CHECKS = [
    {
        table: 'agency_usage_ledger',
        columns: [
            'id',
            'agency_tenant_id',
            'client_tenant_id',
            'source_module',
            'usage_type',
            'usage_quantity',
            'unit_cost',
            'platform_cost',
            'client_price',
            'agency_markup_type',
            'agency_markup_value',
            'margin_amount',
            'billing_status',
            'idempotency_key',
            'source_entity_type',
            'source_entity_id',
        ],
    },
    {
        table: 'agency_billing_events',
        columns: [
            'id',
            'agency_tenant_id',
            'client_tenant_id',
            'payment_link_id',
            'provider',
            'event_id',
            'provider_event_id',
            'idempotency_key',
            'stripe_checkout_session_id',
            'stripe_subscription_id',
            'status',
            'processed_at',
        ],
    },
    {
        table: 'agency_snapshot_versions',
        columns: ['id', 'snapshot_id', 'version', 'payload', 'included_modules', 'readiness', 'checksum'],
    },
    {
        table: 'agency_snapshot_applications',
        columns: [
            'id',
            'snapshot_id',
            'snapshot_version_id',
            'agency_tenant_id',
            'client_tenant_id',
            'target_project_id',
            'status',
            'preview',
            'applied_changes',
            'error',
            'completed_at',
            'idempotency_key',
        ],
    },
] as const;

export const AGENCY_READINESS_ENV_GROUPS = [
    { name: 'SUPABASE_URL_OR_VITE_SUPABASE_URL', anyOf: ['SUPABASE_URL', 'VITE_SUPABASE_URL'], required: true },
    { name: 'SUPABASE_ANON_KEY_OR_VITE_SUPABASE_ANON_KEY', anyOf: ['SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY'], required: true },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', anyOf: ['SUPABASE_SERVICE_ROLE_KEY'], required: true },
    { name: 'STRIPE_SECRET_KEY', anyOf: ['STRIPE_SECRET_KEY'], required: true },
    { name: 'STRIPE_WEBHOOK_SECRET_EDGE', anyOf: ['STRIPE_WEBHOOK_SECRET'], required: false, edgeSecret: true },
    { name: 'STRIPE_SYNC_SECRET_EDGE', anyOf: ['STRIPE_SYNC_SECRET'], required: false, edgeSecret: true },
    { name: 'VITE_STRIPE_PUBLISHABLE_KEY', anyOf: ['VITE_STRIPE_PUBLISHABLE_KEY'], required: true },
    { name: 'APP_BASE_URL_OR_VITE_PUBLIC_APP_URL', anyOf: ['APP_BASE_URL', 'VITE_PUBLIC_APP_URL'], required: true },
    { name: 'CRON_SECRET', anyOf: ['CRON_SECRET'], required: true },
    { name: 'CLOUDFLARE_ACCOUNT_ID', anyOf: ['CLOUDFLARE_ACCOUNT_ID'], required: false },
    { name: 'CLOUDFLARE_API_TOKEN', anyOf: ['CLOUDFLARE_API_TOKEN'], required: false },
] as const;

function hasAnyEnv(env: AgencyReadinessEnv, names: readonly string[]) {
    return names.some(name => Boolean(env[name]));
}

function missingTableEvidence(error?: { code?: string; message?: string } | null) {
    if (!error) return '';
    return error.code ? `${error.code}: ${error.message || 'query failed'}` : error.message || 'query failed';
}

async function probeSelect(supabase: SupabaseLike, table: string, columns: string) {
    const query = supabase.from(table).select(columns, { count: 'exact', head: true });
    if (typeof query.limit === 'function') return query.limit(0);
    return query as unknown as Promise<{ error?: { code?: string; message?: string } | null }>;
}

async function checkTable(supabase: SupabaseLike, table: string): Promise<AgencyReadinessCheck> {
    const { error } = await probeSelect(supabase, table, 'id');
    if (error) {
        return {
            name: `table:${table}`,
            status: 'fail',
            severity: 'critical',
            evidence: missingTableEvidence(error),
        };
    }
    return { name: `table:${table}`, status: 'pass', evidence: 'reachable with service role' };
}

async function checkColumns(supabase: SupabaseLike, table: string, columns: readonly string[]): Promise<AgencyReadinessCheck> {
    const { error } = await probeSelect(supabase, table, columns.join(','));
    if (error) {
        return {
            name: `columns:${table}`,
            status: 'fail',
            severity: 'critical',
            evidence: missingTableEvidence(error),
        };
    }
    return {
        name: `columns:${table}`,
        status: 'pass',
        evidence: `${columns.length} contract columns reachable`,
    };
}

function checkEnv(env: AgencyReadinessEnv, requireCloudflare: boolean): AgencyReadinessCheck[] {
    const cloudflareTokenConfigured = hasAnyEnv(env, ['CLOUDFLARE_API_TOKEN']);
    const cloudflareAccountConfigured = hasAnyEnv(env, ['CLOUDFLARE_ACCOUNT_ID']);
    const cloudflareConfigured = cloudflareTokenConfigured || cloudflareAccountConfigured;

    return AGENCY_READINESS_ENV_GROUPS.map(group => {
        const configured = hasAnyEnv(env, group.anyOf);
        const required = group.required || (requireCloudflare && group.name.startsWith('CLOUDFLARE_'));
        if (configured) {
            return { name: `env:${group.name}`, status: 'pass', evidence: 'configured' };
        }
        if (group.name.startsWith('CLOUDFLARE_') && !requireCloudflare && !cloudflareConfigured) {
            return {
                name: `env:${group.name}`,
                status: 'skip',
                severity: 'info',
                evidence: 'not required unless Cloudflare DNS automation is enabled',
            };
        }
        if ('edgeSecret' in group && group.edgeSecret) {
            return {
                name: `env:${group.name}`,
                status: 'warn',
                severity: 'warning',
                evidence: 'not visible to Vercel runtime; verify in Supabase Edge secrets',
            };
        }
        return {
            name: `env:${group.name}`,
            status: required ? 'fail' : 'warn',
            severity: required ? 'critical' : 'warning',
            evidence: 'missing',
        };
    });
}

export async function runAgencyReadinessChecks(input: {
    supabase: SupabaseLike;
    env?: AgencyReadinessEnv;
    requireCloudflare?: boolean;
    now?: Date;
}): Promise<AgencyReadinessResult> {
    const env = input.env || process.env;
    const checks: AgencyReadinessCheck[] = [
        ...checkEnv(env, Boolean(input.requireCloudflare)),
        ...(await Promise.all(AGENCY_READINESS_TABLES.map(table => checkTable(input.supabase, table)))),
        ...(await Promise.all(AGENCY_READINESS_COLUMN_CHECKS.map(check => checkColumns(input.supabase, check.table, check.columns)))),
    ];
    const failures = checks.filter(check => check.status === 'fail' && check.severity === 'critical');
    const warnings = checks.filter(check => check.status === 'warn' || check.severity === 'warning');
    const skipped = checks.filter(check => check.status === 'skip');

    return {
        ok: failures.length === 0,
        checkedAt: (input.now || new Date()).toISOString(),
        summary: {
            passed: checks.filter(check => check.status === 'pass').length,
            warnings: warnings.length,
            failed: failures.length,
            skipped: skipped.length,
        },
        checks,
    };
}
