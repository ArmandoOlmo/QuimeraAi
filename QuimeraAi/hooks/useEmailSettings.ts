/**
 * useEmailSettings Hook
 * Hook para gestionar la configuracion de email de una tienda
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import {
    EmailSettings,
    EmailSocialLinks,
    TransactionalEmailSettings,
    MarketingEmailSettings,
} from '../types/email';
import {
    getEmailAnalytics,
    type CanonicalEmailAnalytics,
} from '../services/email/emailAnalyticsService.ts';

// Default settings
const defaultTransactionalSettings: TransactionalEmailSettings = {
    orderConfirmation: false,
    orderShipped: false,
    orderDelivered: false,
    orderCancelled: false,
    orderRefunded: false,
    paymentFailed: false,
    reviewRequest: false,
    reviewRequestDelayDays: 3,
    newOrderNotification: false,
    lowStockNotification: false,
    appointments: false,
    appointmentEmails: false,
    appointmentRequestReceived: false,
    appointmentConfirmation: false,
    appointmentCancellation: false,
    appointmentFollowUp: false,
    appointmentReminder: false,
    appointmentTemplates: {},
    restaurants: false,
    restaurantReservations: false,
    reservationReceived: false,
    crm: false,
    leadEmails: false,
    chatcore: false,
    chatLeadEmails: false,
    realty: false,
    realtyPropertyInquiry: false,
    realtyShowingRequest: false,
    realtyOpenHouseRegistration: false,
    websiteBuilder: false,
    websiteFormEmails: false,
    aiStudio: false,
    aiStudioReviewedEmails: false,
};

const defaultMarketingSettings: MarketingEmailSettings = {
    enabled: false,
    welcomeEmail: true,
    abandonedCartEnabled: false,
    abandonedCartDelayHours: 1,
    winBackEnabled: false,
    winBackDelayDays: 30,
};

const defaultComplianceSettings = {
    requireMarketingConsent: true,
    consentSources: ['manual', 'newsletter', 'checkout', 'lead-form', 'chatcore', 'realty', 'website-builder'],
    unsubscribeFooterEnabled: true,
    suppressionEnabled: true,
    doubleOptInEnabled: false,
    privacyNotice: '',
    complianceRegion: 'global' as const,
    physicalAddress: '',
};

const defaultTrackingSettings = {
    openTracking: false,
    clickTracking: false,
    utmDefaults: {},
};

const defaultRateLimitSettings = {};

const defaultEmailSettings: Partial<EmailSettings> = {
    provider: 'resend',
    apiKeyConfigured: false,
    providerStatus: 'not_configured',
    fromEmail: '',
    fromName: '',
    sendingDomain: '',
    domainStatus: 'not_configured',
    dkimStatus: 'not_configured',
    spfStatus: 'not_configured',
    dmarcStatus: 'not_configured',
    webhookConfigured: false,
    primaryColor: '#4f46e5',
    transactional: defaultTransactionalSettings,
    marketing: defaultMarketingSettings,
    compliance: defaultComplianceSettings,
    tracking: defaultTrackingSettings,
    rateLimits: defaultRateLimitSettings,
};

type EmailSettingsRow = Record<string, any>;

const mapEmailSettingsFromRow = (row: EmailSettingsRow | null | undefined): Partial<EmailSettings> => {
    if (!row) return defaultEmailSettings;
    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    return {
        provider: (row.provider || 'resend') as EmailSettings['provider'],
        apiKeyConfigured: Boolean(row.api_key_configured),
        providerStatus: row.provider_status || (row.api_key_configured ? 'configured' : 'not_configured'),
        fromEmail: row.from_email || '',
        fromName: row.from_name || '',
        replyTo: row.reply_to || '',
        sendingDomain: row.sending_domain || '',
        domainStatus: row.domain_status || 'not_configured',
        dkimStatus: row.dkim_status || 'not_configured',
        spfStatus: row.spf_status || 'not_configured',
        dmarcStatus: row.dmarc_status || 'not_configured',
        webhookConfigured: Boolean(row.webhook_configured),
        testEmailSentAt: row.test_email_sent_at || null,
        providerReadiness: metadata.providerReadiness || metadata.provider_readiness || undefined,
        logoUrl: row.logo_url || '',
        primaryColor: row.primary_color || '#4f46e5',
        footerText: row.footer_text || '',
        socialLinks: row.social_links || undefined,
        transactional: {
            ...defaultTransactionalSettings,
            ...(row.transactional || {}),
        },
        marketing: {
            ...defaultMarketingSettings,
            ...(row.marketing || {}),
        },
        compliance: {
            ...defaultComplianceSettings,
            ...(row.compliance || {}),
        },
        tracking: {
            ...defaultTrackingSettings,
            ...(row.tracking || {}),
        },
        rateLimits: metadata.emailRateLimits || metadata.email_rate_limits || metadata.rateLimits || metadata.rate_limits || defaultRateLimitSettings,
        readiness: row.readiness,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};

const mapEmailSettingsFromCanonical = (settings: Record<string, any> | null | undefined): Partial<EmailSettings> => {
    if (!settings) return defaultEmailSettings;
    return {
        provider: (settings.provider || 'resend') as EmailSettings['provider'],
        apiKeyConfigured: Boolean(settings.providerConfigured),
        providerStatus: settings.providerStatus || (settings.providerConfigured ? 'configured' : 'not_configured'),
        fromEmail: settings.fromEmail || '',
        fromName: settings.fromName || '',
        replyTo: settings.replyTo || '',
        sendingDomain: settings.sendingDomain || '',
        domainStatus: settings.domainStatus || 'not_configured',
        dkimStatus: settings.dkimStatus || 'not_configured',
        spfStatus: settings.spfStatus || 'not_configured',
        dmarcStatus: settings.dmarcStatus || 'not_configured',
        webhookConfigured: Boolean(settings.webhookConfigured),
        testEmailSentAt: settings.testEmailSentAt || null,
        providerReadiness: settings.providerReadiness
            || settings.provider_readiness
            || settings.raw?.metadata?.providerReadiness
            || settings.raw?.metadata?.provider_readiness
            || undefined,
        logoUrl: settings.logoUrl || '',
        primaryColor: settings.primaryColor || '#4f46e5',
        footerText: settings.footerText || '',
        socialLinks: settings.socialLinks || undefined,
        transactional: {
            ...defaultTransactionalSettings,
            ...(settings.transactional || {}),
        },
        marketing: {
            ...defaultMarketingSettings,
            ...(settings.marketing || {}),
        },
        compliance: {
            ...defaultComplianceSettings,
            ...(settings.compliance || {}),
        },
        tracking: {
            ...defaultTrackingSettings,
            ...(settings.tracking || {}),
        },
        rateLimits: settings.rateLimits || defaultRateLimitSettings,
        readiness: settings.readiness,
        createdAt: settings.raw?.created_at,
        updatedAt: settings.raw?.updated_at,
    };
};

const stripUndefined = <T extends Record<string, any>>(value: T): T =>
    Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;

const sanitizeEmailSettingsUpdates = (updates: Partial<EmailSettings>): Partial<EmailSettings> => {
    const {
        apiKeyConfigured: _apiKeyConfigured,
        providerStatus: _providerStatus,
        domainStatus: _domainStatus,
        dkimStatus: _dkimStatus,
        spfStatus: _spfStatus,
        dmarcStatus: _dmarcStatus,
        webhookConfigured: _webhookConfigured,
        testEmailSentAt: _testEmailSentAt,
        readiness: _readiness,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...editable
    } = updates;

    return stripUndefined(editable);
};

const mapCampaignFromCanonical = (campaign: Record<string, any>) => ({
    ...campaign,
    id: campaign.id,
    name: campaign.name || '',
    subject: campaign.subject || '',
    previewText: campaign.previewText ?? campaign.preview_text ?? '',
    type: campaign.type || 'newsletter',
    htmlContent: campaign.htmlContent ?? campaign.html_content ?? '',
    emailDocument: campaign.emailDocument ?? campaign.email_document,
    audienceType: campaign.audienceType ?? campaign.audience_type ?? 'all',
    audienceSegmentId: campaign.audienceSegmentId ?? campaign.audience_segment_id,
    customRecipientEmails: campaign.customRecipientEmails ?? campaign.custom_recipient_emails ?? [],
    status: campaign.status || 'draft',
    scheduledAt: campaign.scheduledAt ?? campaign.scheduled_at,
    sentAt: campaign.sentAt ?? campaign.sent_at,
    stats: campaign.stats || {},
    tags: campaign.tags || [],
    generatedByAI: campaign.generatedByAI ?? campaign.generated_by_ai,
    needsReview: campaign.needsReview ?? campaign.needs_review,
    userModified: campaign.userModified ?? campaign.user_modified,
    safeToEdit: campaign.safeToEdit ?? campaign.safe_to_edit,
    sourceModule: campaign.sourceModule ?? campaign.source_module,
    sourceComponent: campaign.sourceComponent ?? campaign.source_component,
    sourceEvent: campaign.sourceEvent ?? campaign.source_event,
    sourceEntityType: campaign.sourceEntityType ?? campaign.source_entity_type,
    sourceEntityId: campaign.sourceEntityId ?? campaign.source_entity_id,
    correlationId: campaign.correlationId ?? campaign.correlation_id,
    idempotencyKey: campaign.idempotencyKey ?? campaign.idempotency_key,
    readiness: campaign.readiness || {},
    metadata: campaign.metadata || {},
    userId: campaign.userId ?? campaign.user_id,
    projectId: campaign.projectId ?? campaign.project_id ?? campaign.store_id,
    createdBy: campaign.createdBy ?? campaign.created_by,
    createdAt: campaign.createdAt ?? campaign.created_at,
    updatedAt: campaign.updatedAt ?? campaign.updated_at,
});

const mapAudienceFromCanonical = (audience: Record<string, any>) => {
    const staticMembers = audience.staticMembers || audience.static_members || {};
    const members = Array.isArray(staticMembers.members)
        ? staticMembers.members
        : Array.isArray(audience.members)
            ? audience.members
            : [];

    return {
        ...audience,
        id: audience.id,
        name: audience.name || '',
        description: audience.description || '',
        filters: audience.filters || [],
        acceptsMarketing: audience.acceptsMarketing ?? audience.accepts_marketing,
        hasOrdered: audience.hasOrdered ?? audience.has_ordered,
        minOrders: audience.minOrders ?? audience.min_orders,
        maxOrders: audience.maxOrders ?? audience.max_orders,
        minTotalSpent: audience.minTotalSpent ?? audience.min_total_spent,
        maxTotalSpent: audience.maxTotalSpent ?? audience.max_total_spent,
        tags: audience.tags || [],
        excludeTags: audience.excludeTags ?? audience.exclude_tags,
        lastOrderDaysAgo: audience.lastOrderDaysAgo ?? audience.last_order_days_ago,
        source: audience.source || [],
        staticMembers,
        staticMemberCount: audience.staticMemberCount ?? audience.static_member_count ?? members.length,
        estimatedCount: audience.estimatedCount ?? audience.estimated_count ?? members.length,
        isDefault: audience.isDefault ?? audience.is_default,
        members,
        userId: audience.userId ?? audience.user_id,
        projectId: audience.projectId ?? audience.project_id ?? audience.store_id,
        createdAt: audience.createdAt ?? audience.created_at,
        updatedAt: audience.updatedAt ?? audience.updated_at,
    };
};

interface UseEmailSettingsOptions {
    realtime?: boolean;
}

export const useEmailSettings = (
    userId: string,
    projectId: string,
    options: UseEmailSettingsOptions = {}
) => {
    const [settings, setSettings] = useState<Partial<EmailSettings> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { realtime = true } = options;

    // Fetch or subscribe to settings
    useEffect(() => {
        if (!userId || !projectId || projectId === 'default') {
            setSettings(defaultEmailSettings);
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const fetchSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('email_settings')
                    .select('*')
                    .or(`project_id.eq.${projectId},store_id.eq.${projectId}`)
                    .limit(1)
                    .maybeSingle();

                if (!isMounted) return;

                if (error && error.code !== 'PGRST116') {
                    throw error;
                }

                if (data) {
                    setSettings(mapEmailSettingsFromRow(data));
                } else {
                    setSettings(defaultEmailSettings);
                }
            } catch (err: any) {
                if (!isMounted) return;
                console.error('❌ [useEmailSettings] Error fetching settings:', err);
                setError(err.message);
                setSettings(defaultEmailSettings);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchSettings();

        let subscription: any;
        if (realtime) {
            const channelId = `email_settings_${projectId}_${Math.random().toString(36).substring(2, 9)}`;
            subscription = supabase
                .channel(channelId)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'email_settings', filter: `project_id=eq.${projectId}` },
                    (payload) => {
                        if (!isMounted) return;
                        if (payload.new) {
                            setSettings(mapEmailSettingsFromRow(payload.new));
                        } else {
                            setSettings(defaultEmailSettings);
                        }
                    }
                )
                .subscribe();
        }

        return () => {
            isMounted = false;
            if (subscription) {
                supabase.removeChannel(subscription);
            }
        };
    }, [userId, projectId, realtime]);

    // Update all settings
    const updateSettings = useCallback(
        async (updates: Partial<EmailSettings>) => {
            if (!userId || !projectId || projectId === 'default') return;

            setIsSaving(true);
            setError(null);

            try {
                const mergedSettings = sanitizeEmailSettingsUpdates({
                    ...defaultEmailSettings,
                    ...settings,
                    ...updates,
                });

                const { data, error } = await supabase.functions.invoke('email-api', {
                    body: {
                        action: 'updateSettings',
                        projectId,
                        updates: mergedSettings,
                    },
                });
                if (error) throw error;
                if (data?.success === false) throw new Error(data.error || 'Unable to update email settings');

                if (data?.settings) {
                    setSettings(mapEmailSettingsFromCanonical(data.settings));
                }

                if (!realtime) {
                    setSettings((prev) => ({ ...prev, ...sanitizeEmailSettingsUpdates(updates) }));
                }
            } catch (err: any) {
                console.error('Error updating email settings:', err);
                setError(err.message);
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [userId, projectId, realtime, settings]
    );

    const syncProviderReadiness = useCallback(async () => {
        if (!userId || !projectId || projectId === 'default') return null;

        setIsSaving(true);
        setError(null);

        try {
            const { data, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'syncProviderReadiness',
                    projectId,
                },
            });

            if (error) throw error;
            if (data?.success === false) throw new Error(data.error || 'Unable to sync provider readiness');
            if (data?.settings) setSettings(mapEmailSettingsFromCanonical(data.settings));
            return data?.providerReadiness || null;
        } catch (err: any) {
            console.error('Error syncing email provider readiness:', err);
            setError(err.message);
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [userId, projectId]);

    const provisionProviderDomain = useCallback(async (sendingDomain?: string | null) => {
        if (!userId || !projectId || projectId === 'default') return null;

        setIsSaving(true);
        setError(null);

        try {
            const { data, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'provisionProviderDomain',
                    projectId,
                    sendingDomain: sendingDomain || settings?.sendingDomain || undefined,
                },
            });

            if (error) throw error;
            if (data?.success === false) throw new Error(data.error || 'Unable to provision provider domain');
            if (data?.settings) setSettings(mapEmailSettingsFromCanonical(data.settings));
            return data?.providerDomain || null;
        } catch (err: any) {
            console.error('Error provisioning email provider domain:', err);
            setError(err.message);
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [userId, projectId, settings?.sendingDomain]);

    // Update sender info
    const updateSenderInfo = useCallback(
        async (senderInfo: { fromEmail: string; fromName: string; replyTo?: string }) => {
            return updateSettings(senderInfo);
        },
        [updateSettings]
    );

    // Update branding
    const updateBranding = useCallback(
        async (branding: {
            logoUrl?: string;
            primaryColor?: string;
            footerText?: string;
            socialLinks?: EmailSocialLinks;
        }) => {
            return updateSettings(branding);
        },
        [updateSettings]
    );

    // Update transactional email settings
    const updateTransactionalSettings = useCallback(
        async (transactionalSettings: Partial<TransactionalEmailSettings>) => {
            return updateSettings({
                transactional: {
                    ...defaultTransactionalSettings,
                    ...settings?.transactional,
                    ...transactionalSettings,
                },
            });
        },
        [updateSettings, settings?.transactional]
    );

    // Update marketing email settings
    const updateMarketingSettings = useCallback(
        async (marketingSettings: Partial<MarketingEmailSettings>) => {
            return updateSettings({
                marketing: {
                    ...defaultMarketingSettings,
                    ...settings?.marketing,
                    ...marketingSettings,
                },
            });
        },
        [updateSettings, settings?.marketing]
    );

    // Toggle individual transactional email
    const toggleTransactionalEmail = useCallback(
        async (emailType: keyof TransactionalEmailSettings, enabled: boolean) => {
            return updateTransactionalSettings({ [emailType]: enabled });
        },
        [updateTransactionalSettings]
    );

    // Toggle marketing enabled
    const toggleMarketing = useCallback(
        async (enabled: boolean) => {
            return updateMarketingSettings({ enabled });
        },
        [updateMarketingSettings]
    );

    // Check if API key is configured
    const checkApiKeyStatus = useCallback(async () => {
        return settings?.apiKeyConfigured || false;
    }, [settings?.apiKeyConfigured]);

    return {
        // State
        settings,
        isLoading,
        isSaving,
        error,

        // Actions
        updateSettings,
        updateSenderInfo,
        updateBranding,
        updateTransactionalSettings,
        updateMarketingSettings,
        toggleTransactionalEmail,
        toggleMarketing,
        checkApiKeyStatus,
        syncProviderReadiness,
        provisionProviderDomain,

        // Computed values
        isConfigured: settings?.apiKeyConfigured && settings?.fromEmail,
        transactionalEnabled: settings?.transactional || defaultTransactionalSettings,
        marketingEnabled: settings?.marketing?.enabled || false,
    };
};

// Hook for email campaigns
export const useEmailCampaigns = (userId: string, projectId: string) => {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch campaigns
    useEffect(() => {
        if (!userId || !projectId || projectId === 'default') {
            setCampaigns([]);
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const fetchCampaigns = async () => {
            try {
                const { data, error } = await supabase.functions.invoke('email-api', {
                    body: {
                        action: 'getCampaigns',
                        projectId,
                    },
                });

                if (!isMounted) return;

                if (error) throw error;
                if (data?.success === false) throw new Error(data.error || 'Unable to fetch email campaigns');
                setCampaigns((data?.campaigns || []).map(mapCampaignFromCanonical));

            } catch (err) {
                if (!isMounted) return;
                console.error('Error fetching campaigns:', err);
                setCampaigns([]);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchCampaigns();

        const channelId = `campaigns_${projectId}_${Math.random().toString(36).substring(2, 9)}`;
        const subscription = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'email_campaigns', filter: `project_id=eq.${projectId}` },
                () => {
                    if (isMounted) fetchCampaigns();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(subscription);
        };
    }, [userId, projectId]);

    // Create campaign
    const createCampaign = async (campaignData: {
        name: string;
        subject: string;
        type: string;
        content?: string;
        audienceType?: string;
        previewText?: string;
        htmlContent?: string;
        emailDocument?: any;
        audienceSegmentId?: string;
    }) => {
        if (!userId || !projectId || projectId === 'default') return null;

        setIsSaving(true);
        try {
            const { data, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'createCampaignDraft',
                    projectId,
                    campaign: campaignData,
                },
            });
            if (error) throw error;
            if (data?.success === false) throw new Error(data.error || 'Unable to create email campaign');
            const campaign = mapCampaignFromCanonical(data.campaign || {});
            setCampaigns(prev => [campaign, ...prev.filter(item => item.id !== campaign.id)]);
            return campaign;
        } catch (err) {
            console.error('Error creating campaign:', err);
            throw err;
        } finally {
            setIsSaving(false);
        }
    };

    // Update campaign
    const updateCampaign = async (campaignId: string, updates: any) => {
        if (!userId || !projectId || projectId === 'default') return;

        setIsSaving(true);
        try {
            const { data, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'updateCampaign',
                    projectId,
                    campaignId,
                    updates,
                },
            });
            if (error) throw error;
            if (data?.success === false) throw new Error(data.error || 'Unable to update email campaign');
            if (data?.campaign) {
                const campaign = mapCampaignFromCanonical(data.campaign);
                setCampaigns(prev => prev.map(item => item.id === campaignId ? campaign : item));
            }
        } catch (err) {
            console.error('Error updating campaign:', err);
            throw err;
        } finally {
            setIsSaving(false);
        }
    };

    // Delete campaign
    const deleteCampaign = async (campaignId: string) => {
        if (!userId || !projectId || projectId === 'default') return;

        try {
            const { data, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'deleteCampaign',
                    projectId,
                    campaignId,
                },
            });
            if (error) throw error;
            if (data?.success === false) throw new Error(data.error || 'Unable to delete email campaign');
            setCampaigns(prev => prev.filter(item => item.id !== campaignId));
        } catch (err) {
            console.error('Error deleting campaign:', err);
            throw err;
        }
    };

    return {
        campaigns,
        isLoading,
        isSaving,
        createCampaign,
        updateCampaign,
        deleteCampaign,
    };
};

// Hook for email logs
export const useEmailLogs = (userId: string, projectId: string, options?: { limit?: number }) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalSent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!userId || !projectId || projectId === 'default') {
            setLogs([]);
            setStats({ totalSent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 });
            setIsLoading(false);
            return;
        }

        let isMounted = true;
        setIsLoading(true);

        const fetchLogs = async () => {
            try {
                const { data, error } = await supabase
                    .from('email_logs')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('sent_at', { ascending: false });

                if (!isMounted) return;

                if (error) throw error;

                if (data) {
                    setLogs(data);
                    const calculatedStats = data.reduce(
                        (acc: any, log: any) => ({
                            totalSent: acc.totalSent + 1,
                            delivered: acc.delivered + (log.status === 'delivered' ? 1 : 0),
                            opened: acc.opened + (log.opened ? 1 : 0),
                            clicked: acc.clicked + (log.clicked ? 1 : 0),
                            bounced: acc.bounced + (log.status === 'bounced' ? 1 : 0),
                        }),
                        { totalSent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 }
                    );
                    setStats(calculatedStats);
                }
            } catch (err) {
                if (!isMounted) return;
                console.error('❌ [useEmailLogs] Error fetching email logs:', err);
                setLogs([]);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchLogs();

        const channelId = `logs_${projectId}_${Math.random().toString(36).substring(2, 9)}`;
        const subscription = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'email_logs', filter: `project_id=eq.${projectId}` },
                () => {
                    if (isMounted) fetchLogs();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(subscription);
        };
    }, [userId, projectId, options?.limit]);

    return {
        logs,
        isLoading,
        stats,
    };
};

export const useCanonicalEmailAnalytics = (
    userId: string,
    projectId: string,
    options?: { timeRange?: '7d' | '30d' | '90d' | '12m'; limit?: number },
) => {
    const [analytics, setAnalytics] = useState<CanonicalEmailAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async () => {
        if (!userId || !projectId || projectId === 'default') {
            setAnalytics(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        setIsLoading(true);
        try {
            const data = await getEmailAnalytics({
                supabase,
                projectId,
                since: getAnalyticsSince(options?.timeRange || '30d'),
                limit: options?.limit || 500,
            });
            setAnalytics(data);
            setError(null);
        } catch (err: any) {
            console.error('❌ [useCanonicalEmailAnalytics] Error fetching canonical analytics:', err);
            setAnalytics(null);
            setError(err?.message || 'Failed to load canonical email analytics');
        } finally {
            setIsLoading(false);
        }
    }, [userId, projectId, options?.timeRange, options?.limit]);

    useEffect(() => {
        let isMounted = true;
        const run = async () => {
            if (!isMounted) return;
            await fetchAnalytics();
        };
        run();

        if (!userId || !projectId || projectId === 'default') {
            return () => { isMounted = false; };
        }

        const channel = supabase
            .channel(`canonical_email_analytics_${projectId}_${Math.random().toString(36).slice(2)}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'email_logs', filter: `project_id=eq.${projectId}` }, fetchAnalytics)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'email_outbox', filter: `project_id=eq.${projectId}` }, fetchAnalytics)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'email_events', filter: `project_id=eq.${projectId}` }, fetchAnalytics)
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [userId, projectId, fetchAnalytics]);

    return { analytics, isLoading, error, refresh: fetchAnalytics };
};

function getAnalyticsSince(range: '7d' | '30d' | '90d' | '12m') {
    const date = new Date();
    const days = range === '7d' ? 7 : range === '90d' ? 90 : range === '12m' ? 365 : 30;
    date.setDate(date.getDate() - days);
    return date.toISOString();
}

// Hook for email audiences/segments
export const useEmailAudiences = (userId: string, projectId: string) => {
    const [audiences, setAudiences] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch audiences with realtime updates
    useEffect(() => {
        if (!userId || !projectId || projectId === 'default') {
            setAudiences([]);
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const fetchAudiences = async () => {
            try {
                const { data, error } = await supabase.functions.invoke('email-api', {
                    body: {
                        action: 'getAudiences',
                        projectId,
                    },
                });

                if (!isMounted) return;

                if (error) throw error;
                if (data?.success === false) throw new Error(data.error || 'Unable to fetch email audiences');

                setAudiences((data?.audiences || []).map(mapAudienceFromCanonical));
                setError(null);
            } catch (err: any) {
                if (!isMounted) return;
                console.error('❌ [useEmailAudiences] Error fetching audiences:', err);
                setAudiences([]);
                setError(err.message);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchAudiences();

        const channelId = `audiences_${projectId}_${Math.random().toString(36).substring(2, 9)}`;
        const subscription = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'email_audiences', filter: `project_id=eq.${projectId}` },
                () => {
                    if (isMounted) fetchAudiences();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(subscription);
        };
    }, [userId, projectId]);

    // Create audience
    const createAudience = useCallback(async (audienceData: {
        name: string;
        description?: string;
        acceptsMarketing?: boolean;
        hasOrdered?: boolean;
        minOrders?: number;
        maxOrders?: number;
        minTotalSpent?: number;
        maxTotalSpent?: number;
        tags?: string[];
        excludeTags?: string[];
        lastOrderDaysAgo?: number;
        source?: string[];
        filters?: any[];
    }) => {
        if (!userId || !projectId || projectId === 'default') return null;

        setIsSaving(true);
        setError(null);

        try {
            const { data, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'createAudience',
                    projectId,
                    audience: {
                        ...audienceData,
                        estimatedCount: 0,
                        isDefault: false,
                    },
                },
            });
            if (error) throw error;
            if (data?.success === false) throw new Error(data.error || 'Unable to create email audience');
            const audience = mapAudienceFromCanonical(data.audience || {});
            setAudiences(prev => [audience, ...prev.filter(item => item.id !== audience.id)]);
            return audience;
        } catch (err: any) {
            console.error('❌ [useEmailAudiences] Error creating audience:', err);
            setError(err.message);
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [userId, projectId]);

    // Update audience
    const updateAudience = useCallback(async (audienceId: string, updates: Partial<{
        name: string;
        description?: string;
        acceptsMarketing?: boolean;
        hasOrdered?: boolean;
        minOrders?: number;
        maxOrders?: number;
        minTotalSpent?: number;
        maxTotalSpent?: number;
        tags?: string[];
        excludeTags?: string[];
        lastOrderDaysAgo?: number;
        source?: string[];
        filters?: any[];
        estimatedCount?: number;
        staticMembers?: {
            leadIds?: string[];
            customerIds?: string[];
            emails?: string[];
        };
        staticMemberCount?: number;
    }>) => {
        if (!userId || !projectId || projectId === 'default') return;

        setIsSaving(true);
        setError(null);

        try {
            const { data, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'updateAudience',
                    projectId,
                    audienceId,
                    updates,
                },
            });
            if (error) throw error;
            if (data?.success === false) throw new Error(data.error || 'Unable to update email audience');
            if (data?.audience) {
                const audience = mapAudienceFromCanonical(data.audience);
                setAudiences(prev => prev.map(item => item.id === audienceId ? audience : item));
            }
        } catch (err: any) {
            console.error('❌ [useEmailAudiences] Error updating audience:', err);
            setError(err.message);
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [userId, projectId]);

    // Delete audience
    const deleteAudience = useCallback(async (audienceId: string) => {
        if (!userId || !projectId || projectId === 'default') return;

        try {
            const { data, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'deleteAudience',
                    projectId,
                    audienceId,
                },
            });
            if (error) throw error;
            if (data?.success === false) throw new Error(data.error || 'Unable to delete email audience');
            setAudiences(prev => prev.filter(item => item.id !== audienceId));
        } catch (err: any) {
            console.error('❌ [useEmailAudiences] Error deleting audience:', err);
            setError(err.message);
            throw err;
        }
    }, [userId, projectId]);

    // Duplicate audience
    const duplicateAudience = useCallback(async (audienceId: string) => {
        const original = audiences.find(a => a.id === audienceId);
        if (!original) return null;

        const { id, created_at, updated_at, createdAt, updatedAt, ...audienceData } = original;
        return createAudience({
            ...audienceData,
            name: `${audienceData.name} (copia)`,
        });
    }, [audiences, createAudience]);

    return {
        audiences,
        isLoading,
        isSaving,
        error,
        createAudience,
        updateAudience,
        deleteAudience,
        duplicateAudience,
    };
};

export default useEmailSettings;
