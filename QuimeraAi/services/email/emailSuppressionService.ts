import { normalizeEmail } from './emailProviderService.ts';

type SupabaseClient = any;

export type EmailSuppressionReason = 'unsubscribe' | 'hard_bounce' | 'complaint' | 'manual' | 'invalid';

export interface EmailSuppressionInput {
    supabase: SupabaseClient;
    projectId: string;
    email: string;
    reason: EmailSuppressionReason;
    source?: string;
    campaignId?: string | null;
    emailLogId?: string | null;
    metadata?: Record<string, unknown>;
}

export async function addSuppression(input: EmailSuppressionInput) {
    const email = normalizeEmail(input.email);
    if (!email) throw new Error('email is required');

    const payload = {
        project_id: input.projectId,
        email,
        reason: input.reason,
        source: input.source || 'email-engine',
        campaign_id: input.campaignId || null,
        email_log_id: input.emailLogId || null,
        suppression_scope: 'marketing',
        active: true,
        metadata: input.metadata || {},
        updated_at: new Date().toISOString(),
    };

    const { data: existing, error: findError } = await input.supabase
        .from('email_suppressions')
        .select('id')
        .eq('project_id', input.projectId)
        .eq('email', email)
        .eq('suppression_scope', 'marketing')
        .eq('active', true)
        .limit(1)
        .maybeSingle();

    if (findError) throw findError;

    if (existing?.id) {
        const { data, error } = await input.supabase
            .from('email_suppressions')
            .update(payload)
            .eq('id', existing.id)
            .select('*')
            .maybeSingle();

        if (error) throw error;
        return data || { ...payload, id: existing.id };
    }

    const { data, error } = await input.supabase
        .from('email_suppressions')
        .insert(payload)
        .select('*')
        .maybeSingle();

    if (error) throw error;
    return data || payload;
}

export async function isSuppressed(input: {
    supabase: SupabaseClient;
    projectId: string;
    email: string;
    scope?: 'marketing' | 'transactional';
}) {
    const email = normalizeEmail(input.email);
    if (!email) return true;
    const scopes = input.scope === 'transactional' ? ['transactional'] : ['marketing', 'all'];

    const { data, error } = await input.supabase
        .from('email_suppressions')
        .select('id,reason,suppression_scope')
        .eq('project_id', input.projectId)
        .eq('active', true)
        .eq('email', email)
        .in('suppression_scope', scopes)
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return Boolean(data);
}

export async function filterSuppressedRecipients<T extends { email: string }>(input: {
    supabase: SupabaseClient;
    projectId: string;
    recipients: T[];
    scope?: 'marketing' | 'transactional';
}) {
    if (input.recipients.length === 0) return { allowed: [] as T[], suppressed: [] as T[] };
    const emails = input.recipients.map((recipient) => normalizeEmail(recipient.email)).filter(Boolean);
    const scopes = input.scope === 'transactional' ? ['transactional'] : ['marketing', 'all'];

    const { data, error } = await input.supabase
        .from('email_suppressions')
        .select('email')
        .eq('project_id', input.projectId)
        .eq('active', true)
        .in('suppression_scope', scopes)
        .in('email', emails);

    if (error) throw error;

    const suppressedEmails = new Set((data || []).map((row: any) => normalizeEmail(row.email)));
    return {
        allowed: input.recipients.filter((recipient) => !suppressedEmails.has(normalizeEmail(recipient.email))),
        suppressed: input.recipients.filter((recipient) => suppressedEmails.has(normalizeEmail(recipient.email))),
    };
}
