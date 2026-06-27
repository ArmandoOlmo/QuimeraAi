import { buildFromHeader, isValidEmail, type EmailProviderName } from './emailProviderService.ts';

type SupabaseClient = any;

export interface CanonicalEmailSettings {
    exists: boolean;
    projectId: string;
    tenantId?: string | null;
    provider: EmailProviderName;
    providerConfigured: boolean;
    providerStatus: 'not_configured' | 'configured' | 'needs_review';
    fromEmail: string;
    fromName: string;
    replyTo?: string;
    sendingDomain?: string;
    domainStatus: 'not_configured' | 'pending' | 'verified' | 'failed';
    dkimStatus: string;
    spfStatus: string;
    dmarcStatus: string;
    webhookConfigured: boolean;
    testEmailSentAt?: string | null;
    logoUrl?: string;
    primaryColor: string;
    footerText?: string;
    socialLinks: Record<string, unknown>;
    transactional: Record<string, unknown>;
    marketing: Record<string, unknown>;
    compliance: Record<string, unknown>;
    tracking: Record<string, unknown>;
    rateLimits: Record<string, unknown>;
    readiness: EmailReadiness;
    raw?: Record<string, unknown> | null;
}

export interface EmailReadiness {
    providerConfigured: boolean;
    senderConfigured: boolean;
    marketingEnabled: boolean;
    domainVerified: boolean;
    unsubscribeConfigured: boolean;
    suppressionConfigured: boolean;
    trackingConfigured: boolean;
    webhookConfigured: boolean;
    testEmailSent: boolean;
    canSendTest: boolean;
    canSendMarketing: boolean;
    canSendTransactional: boolean;
    readinessBlockers: string[];
    warnings: string[];
}

const DEFAULT_COMPLIANCE = {
    requireMarketingConsent: true,
    unsubscribeFooterEnabled: true,
    suppressionEnabled: true,
    doubleOptInEnabled: false,
    privacyNotice: '',
    complianceRegion: 'global',
};

const DEFAULT_TRACKING = {
    openTracking: false,
    clickTracking: false,
    utmDefaults: {},
};

export async function getEmailSettings(input: {
    supabase: SupabaseClient;
    projectId: string;
}): Promise<CanonicalEmailSettings> {
    const { data, error } = await input.supabase
        .from('email_settings')
        .select('*')
        .or(`project_id.eq.${input.projectId},store_id.eq.${input.projectId}`)
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return normalizeEmailSettings(data || null, input.projectId);
}

export async function updateEmailSettings(input: {
    supabase: SupabaseClient;
    projectId: string;
    userId?: string | null;
    updates: Record<string, unknown>;
}) {
    const row = mapSettingsUpdatesToRow(input.projectId, input.userId, input.updates);
    const { data, error } = await input.supabase
        .from('email_settings')
        .upsert(row, { onConflict: 'project_id' })
        .select('*')
        .maybeSingle();

    if (error) throw error;
    return normalizeEmailSettings(data || row, input.projectId);
}

export function normalizeEmailSettings(row: Record<string, any> | null, projectId: string): CanonicalEmailSettings {
    const compliance = { ...DEFAULT_COMPLIANCE, ...(row?.compliance || {}) };
    const tracking = { ...DEFAULT_TRACKING, ...(row?.tracking || {}) };
    const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const provider = (row?.provider || 'unset') as EmailProviderName;
    const settings: Omit<CanonicalEmailSettings, 'readiness'> = {
        exists: Boolean(row),
        projectId,
        tenantId: row?.tenant_id || null,
        provider,
        providerConfigured: Boolean(row?.api_key_configured),
        providerStatus: row?.provider_status || (row?.api_key_configured ? 'configured' : 'not_configured'),
        fromEmail: row?.from_email || '',
        fromName: row?.from_name || '',
        replyTo: row?.reply_to || '',
        sendingDomain: row?.sending_domain || '',
        domainStatus: row?.domain_status || 'not_configured',
        dkimStatus: row?.dkim_status || 'not_configured',
        spfStatus: row?.spf_status || 'not_configured',
        dmarcStatus: row?.dmarc_status || 'not_configured',
        webhookConfigured: Boolean(row?.webhook_configured),
        testEmailSentAt: row?.test_email_sent_at || null,
        logoUrl: row?.logo_url || '',
        primaryColor: row?.primary_color || '#4f46e5',
        footerText: row?.footer_text || '',
        socialLinks: row?.social_links || {},
        transactional: row?.transactional || {},
        marketing: row?.marketing || {},
        compliance,
        tracking,
        rateLimits: metadata.emailRateLimits || metadata.email_rate_limits || metadata.rateLimits || metadata.rate_limits || {},
        raw: row,
    };

    return {
        ...settings,
        readiness: getEmailReadiness(settings),
    };
}

export function getEmailReadiness(settings: Omit<CanonicalEmailSettings, 'readiness'>): EmailReadiness {
    const senderConfigured = isValidEmail(settings.fromEmail) && settings.fromName.trim().length > 0;
    const providerConfigured = Boolean(settings.providerConfigured && settings.provider !== 'unset');
    const marketingEnabled = settings.marketing.enabled === true;
    const unsubscribeConfigured = settings.compliance.unsubscribeFooterEnabled !== false;
    const suppressionConfigured = settings.compliance.suppressionEnabled !== false;
    const trackingConfigured = Boolean(settings.tracking.openTracking || settings.tracking.clickTracking);
    const domainVerified = settings.domainStatus === 'verified';
    const testEmailSent = Boolean(settings.testEmailSentAt);
    const readinessBlockers: string[] = [];
    const warnings: string[] = [];

    if (!providerConfigured) readinessBlockers.push('Email provider is not explicitly configured.');
    if (!senderConfigured) readinessBlockers.push('Sender name and from email are required.');
    if (!marketingEnabled) readinessBlockers.push('Email Marketing is not explicitly enabled.');
    if (!unsubscribeConfigured) readinessBlockers.push('Marketing unsubscribe footer must be enabled.');
    if (!suppressionConfigured) readinessBlockers.push('Suppression checks must be enabled.');
    if (settings.sendingDomain && !domainVerified) warnings.push('Sending domain is not verified yet.');
    if (!settings.webhookConfigured) warnings.push('Provider webhook is not configured; analytics may be incomplete.');
    if (!testEmailSent) warnings.push('No test email has been recorded for this project.');

    return {
        providerConfigured,
        senderConfigured,
        marketingEnabled,
        domainVerified,
        unsubscribeConfigured,
        suppressionConfigured,
        trackingConfigured,
        webhookConfigured: settings.webhookConfigured,
        testEmailSent,
        canSendTest: providerConfigured && senderConfigured,
        canSendMarketing: providerConfigured && senderConfigured && marketingEnabled && unsubscribeConfigured && suppressionConfigured,
        canSendTransactional: providerConfigured && senderConfigured,
        readinessBlockers,
        warnings,
    };
}

export function assertEmailReadiness(settings: CanonicalEmailSettings, mode: 'test' | 'marketing' | 'transactional') {
    if (mode === 'test' && settings.readiness.canSendTest) return;
    if (mode === 'marketing' && settings.readiness.canSendMarketing) return;
    if (mode === 'transactional' && settings.readiness.canSendTransactional) return;
    throw new Error(`Email sending is blocked: ${settings.readiness.readinessBlockers.join(' ') || 'readiness incomplete'}`);
}

export function getSenderHeader(settings: CanonicalEmailSettings) {
    return buildFromHeader({ fromEmail: settings.fromEmail, fromName: settings.fromName });
}

function mapSettingsUpdatesToRow(projectId: string, userId: string | null | undefined, updates: Record<string, unknown>) {
    const row: Record<string, unknown> = {
        project_id: projectId,
        store_id: projectId,
        user_id: userId || undefined,
        updated_at: new Date().toISOString(),
    };

    const map: Record<string, string> = {
        provider: 'provider',
        apiKeyConfigured: 'api_key_configured',
        providerStatus: 'provider_status',
        fromEmail: 'from_email',
        fromName: 'from_name',
        replyTo: 'reply_to',
        logoUrl: 'logo_url',
        primaryColor: 'primary_color',
        footerText: 'footer_text',
        socialLinks: 'social_links',
        transactional: 'transactional',
        marketing: 'marketing',
        sendingDomain: 'sending_domain',
        domainStatus: 'domain_status',
        dkimStatus: 'dkim_status',
        spfStatus: 'spf_status',
        dmarcStatus: 'dmarc_status',
        compliance: 'compliance',
        tracking: 'tracking',
        readiness: 'readiness',
        webhookConfigured: 'webhook_configured',
        testEmailSentAt: 'test_email_sent_at',
        metadata: 'metadata',
    };

    for (const [key, value] of Object.entries(updates)) {
        const column = map[key];
        if (column && value !== undefined) row[column] = value;
    }

    return row;
}
