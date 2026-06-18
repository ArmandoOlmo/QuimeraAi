/**
 * useEmailSettings Hook
 * Hook para gestionar la configuracion de email de una tienda
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import {
    EmailSettings,
    TransactionalEmailSettings,
    MarketingEmailSettings,
    EmailSocialLinks,
} from '../types/email';

// Default settings
const defaultTransactionalSettings: TransactionalEmailSettings = {
    orderConfirmation: true,
    orderShipped: true,
    orderDelivered: true,
    orderCancelled: true,
    orderRefunded: true,
    reviewRequest: true,
    reviewRequestDelayDays: 3,
    newOrderNotification: true,
    lowStockNotification: true,
};

const defaultMarketingSettings: MarketingEmailSettings = {
    enabled: false,
    welcomeEmail: true,
    abandonedCartEnabled: false,
    abandonedCartDelayHours: 1,
    winBackEnabled: false,
    winBackDelayDays: 30,
};

const defaultEmailSettings: Partial<EmailSettings> = {
    provider: 'resend',
    apiKeyConfigured: false,
    fromEmail: '',
    fromName: '',
    primaryColor: '#4f46e5',
    transactional: defaultTransactionalSettings,
    marketing: defaultMarketingSettings,
};

const mapEmailSettingsFromRow = (row: any): Partial<EmailSettings> => {
    if (!row) return defaultEmailSettings;
    return {
        ...defaultEmailSettings,
        provider: row.provider || defaultEmailSettings.provider,
        apiKeyConfigured: row.api_key_configured ?? row.apiKeyConfigured ?? false,
        fromEmail: row.from_email ?? row.fromEmail ?? '',
        fromName: row.from_name ?? row.fromName ?? '',
        replyTo: row.reply_to ?? row.replyTo,
        logoUrl: row.logo_url ?? row.logoUrl,
        primaryColor: row.primary_color ?? row.primaryColor ?? defaultEmailSettings.primaryColor,
        footerText: row.footer_text ?? row.footerText,
        socialLinks: row.social_links ?? row.socialLinks,
        transactional: row.transactional ?? defaultTransactionalSettings,
        marketing: row.marketing ?? defaultMarketingSettings,
        createdAt: row.created_at ?? row.createdAt,
        updatedAt: row.updated_at ?? row.updatedAt,
    } as Partial<EmailSettings>;
};

const mapEmailSettingsToRow = (
    projectId: string,
    settings: Partial<EmailSettings> | null,
    updates: Partial<EmailSettings>
) => {
    const merged = {
        ...defaultEmailSettings,
        ...(settings || {}),
        ...updates,
    };

    return {
        store_id: projectId,
        provider: merged.provider || 'resend',
        api_key_configured: Boolean(merged.apiKeyConfigured),
        from_email: merged.fromEmail || null,
        from_name: merged.fromName || null,
        reply_to: merged.replyTo || null,
        logo_url: merged.logoUrl || null,
        primary_color: merged.primaryColor || '#4f46e5',
        footer_text: merged.footerText || null,
        social_links: merged.socialLinks || {},
        transactional: merged.transactional || defaultTransactionalSettings,
        marketing: merged.marketing || defaultMarketingSettings,
        updated_at: new Date().toISOString(),
    };
};

const defaultCampaignStats = {
    totalRecipients: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    totalOpens: 0,
    uniqueOpens: 0,
    clicked: 0,
    totalClicks: 0,
    uniqueClicks: 0,
    bounced: 0,
    complained: 0,
    unsubscribed: 0,
};

const mapCampaignFromRow = (row: any) => ({
    ...row,
    id: row.id,
    projectId: row.store_id ?? row.projectId,
    storeId: row.store_id ?? row.storeId,
    name: row.name || '',
    subject: row.subject || '',
    previewText: row.preview_text ?? row.previewText ?? '',
    type: row.type || 'newsletter',
    htmlContent: row.html_content ?? row.htmlContent ?? '',
    emailDocument: row.email_document ?? row.emailDocument,
    audienceType: row.audience_type ?? row.audienceType ?? 'all',
    audienceSegmentId: row.audience_segment_id ?? row.audienceSegmentId ?? '',
    customRecipientEmails: row.custom_recipient_emails ?? row.customRecipientEmails ?? [],
    status: row.status || 'draft',
    stats: row.stats || defaultCampaignStats,
    tags: row.tags || [],
    automationId: row.automation_id ?? row.automationId,
    automationStepId: row.automation_step_id ?? row.automationStepId,
    scheduledAt: row.scheduled_at ?? row.scheduledAt,
    sentAt: row.sent_at ?? row.sentAt,
    createdBy: row.created_by ?? row.createdBy,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
});

const mapCampaignToRow = (projectId: string, userId: string, campaignData: any) => ({
    store_id: projectId,
    name: campaignData.name || 'Sin nombre',
    subject: campaignData.subject || '',
    preview_text: campaignData.previewText || '',
    type: campaignData.type || 'newsletter',
    html_content: campaignData.htmlContent ?? campaignData.content ?? '',
    email_document: campaignData.emailDocument ?? null,
    audience_type: campaignData.audienceType || 'all',
    audience_segment_id: campaignData.audienceSegmentId || null,
    custom_recipient_emails: campaignData.customRecipientEmails || [],
    status: campaignData.status || 'draft',
    stats: campaignData.stats || defaultCampaignStats,
    tags: campaignData.tags || [],
    automation_id: campaignData.automationId || null,
    automation_step_id: campaignData.automationStepId || null,
    scheduled_at: campaignData.scheduledAt || null,
    sent_at: campaignData.sentAt || null,
    created_by: campaignData.createdBy || userId || null,
    updated_at: new Date().toISOString(),
});

const mapCampaignUpdatesToRow = (updates: any) => {
    const row: Record<string, any> = {};
    const set = (key: string, value: any) => {
        if (value !== undefined) row[key] = value;
    };

    set('name', updates.name);
    set('subject', updates.subject);
    set('preview_text', updates.previewText);
    set('type', updates.type);
    set('html_content', updates.htmlContent ?? updates.content);
    set('email_document', updates.emailDocument);
    set('audience_type', updates.audienceType);
    set('audience_segment_id', updates.audienceSegmentId || (updates.audienceSegmentId === '' ? null : undefined));
    set('custom_recipient_emails', updates.customRecipientEmails);
    set('status', updates.status);
    set('stats', updates.stats);
    set('tags', updates.tags);
    set('automation_id', updates.automationId);
    set('automation_step_id', updates.automationStepId);
    set('scheduled_at', updates.scheduledAt);
    set('sent_at', updates.sentAt);
    row.updated_at = new Date().toISOString();
    return row;
};

const mapLogFromRow = (row: any) => ({
    ...row,
    projectId: row.store_id ?? row.projectId,
    storeId: row.store_id ?? row.storeId,
    templateId: row.template_id ?? row.templateId,
    campaignId: row.campaign_id ?? row.campaignId,
    recipientEmail: row.recipient_email ?? row.recipientEmail,
    recipientName: row.recipient_name ?? row.recipientName,
    customerId: row.customer_id ?? row.customerId,
    providerMessageId: row.provider_message_id ?? row.providerMessageId,
    openCount: row.open_count ?? row.openCount ?? 0,
    clickCount: row.click_count ?? row.clickCount ?? 0,
    bounceType: row.bounce_type ?? row.bounceType,
    bounceMessage: row.bounce_message ?? row.bounceMessage,
    errorMessage: row.error_message ?? row.errorMessage,
    errorCode: row.error_code ?? row.errorCode,
    orderId: row.order_id ?? row.orderId,
    leadId: row.lead_id ?? row.leadId,
    sentAt: row.sent_at ?? row.sentAt,
    deliveredAt: row.delivered_at ?? row.deliveredAt,
    openedAt: row.opened_at ?? row.openedAt,
    clickedLinks: row.clicked_links ?? row.clickedLinks ?? [],
    clickedAt: row.clicked_at ?? row.clickedAt,
    bouncedAt: row.bounced_at ?? row.bouncedAt,
    complainedAt: row.complained_at ?? row.complainedAt,
    opened: Boolean(row.opened_at || row.open_count > 0 || row.opened),
    clicked: Boolean(row.clicked_at || row.click_count > 0 || row.clicked),
});

const mapAudienceFromRow = (row: any) => {
    const staticMembers = row.static_members ?? row.staticMembers;
    return {
        ...row,
        projectId: row.store_id ?? row.projectId,
        storeId: row.store_id ?? row.storeId,
        acceptsMarketing: row.accepts_marketing ?? row.acceptsMarketing,
        hasOrdered: row.has_ordered ?? row.hasOrdered,
        minOrders: row.min_orders ?? row.minOrders,
        maxOrders: row.max_orders ?? row.maxOrders,
        minTotalSpent: row.min_total_spent ?? row.minTotalSpent,
        maxTotalSpent: row.max_total_spent ?? row.maxTotalSpent,
        excludeTags: row.exclude_tags ?? row.excludeTags ?? [],
        lastOrderDaysAgo: row.last_order_days_ago ?? row.lastOrderDaysAgo,
        staticMembers,
        members: Array.isArray(staticMembers) ? staticMembers : row.members,
        staticMemberCount: row.static_member_count ?? row.staticMemberCount ?? 0,
        estimatedCount: row.estimated_count ?? row.estimatedCount ?? 0,
        lastCountUpdate: row.last_count_update ?? row.lastCountUpdate,
        isDefault: row.is_default ?? row.isDefault ?? false,
        createdBy: row.created_by ?? row.createdBy,
        createdAt: row.created_at ?? row.createdAt,
        updatedAt: row.updated_at ?? row.updatedAt,
    };
};

const mapAudienceToRow = (projectId: string, userId: string, audienceData: any) => ({
    store_id: projectId,
    name: audienceData.name,
    description: audienceData.description || null,
    filters: audienceData.filters || [],
    accepts_marketing: audienceData.acceptsMarketing ?? true,
    has_ordered: audienceData.hasOrdered ?? null,
    min_orders: audienceData.minOrders ?? null,
    max_orders: audienceData.maxOrders ?? null,
    min_total_spent: audienceData.minTotalSpent ?? null,
    max_total_spent: audienceData.maxTotalSpent ?? null,
    tags: audienceData.tags || [],
    exclude_tags: audienceData.excludeTags || [],
    last_order_days_ago: audienceData.lastOrderDaysAgo ?? null,
    source: audienceData.source || [],
    static_members: audienceData.staticMembers ?? audienceData.members ?? [],
    static_member_count: audienceData.staticMemberCount ?? 0,
    estimated_count: audienceData.estimatedCount ?? 0,
    last_count_update: audienceData.lastCountUpdate || null,
    is_default: audienceData.isDefault ?? false,
    created_by: audienceData.createdBy || userId || null,
    updated_at: new Date().toISOString(),
});

const mapAudienceUpdatesToRow = (updates: any) => {
    const row: Record<string, any> = {};
    const set = (key: string, value: any) => {
        if (value !== undefined) row[key] = value;
    };

    set('name', updates.name);
    set('description', updates.description);
    set('filters', updates.filters);
    set('accepts_marketing', updates.acceptsMarketing);
    set('has_ordered', updates.hasOrdered);
    set('min_orders', updates.minOrders);
    set('max_orders', updates.maxOrders);
    set('min_total_spent', updates.minTotalSpent);
    set('max_total_spent', updates.maxTotalSpent);
    set('tags', updates.tags);
    set('exclude_tags', updates.excludeTags);
    set('last_order_days_ago', updates.lastOrderDaysAgo);
    set('source', updates.source);
    set('static_members', updates.staticMembers ?? updates.members);
    set('static_member_count', updates.staticMemberCount);
    set('estimated_count', updates.estimatedCount);
    set('last_count_update', updates.lastCountUpdate);
    set('is_default', updates.isDefault);
    row.updated_at = new Date().toISOString();
    return row;
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
                    .eq('store_id', projectId)
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
                    { event: '*', schema: 'public', table: 'email_settings', filter: `store_id=eq.${projectId}` },
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
                const updatedPayload = mapEmailSettingsToRow(projectId, settings, updates);

                const { error } = await supabase
                    .from('email_settings')
                    .upsert(updatedPayload, { onConflict: 'store_id' });

                if (error) throw error;

                if (!realtime) {
                    setSettings((prev) => ({ ...prev, ...updates }));
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
                const { data, error } = await supabase
                    .from('email_campaigns')
                    .select('*')
                    .eq('store_id', projectId)
                    .order('created_at', { ascending: false });

                if (!isMounted) return;
                
                if (error) throw error;
                if (data) setCampaigns(data.map(mapCampaignFromRow));
                
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
                { event: '*', schema: 'public', table: 'email_campaigns', filter: `store_id=eq.${projectId}` },
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
            const finalCampaign = mapCampaignToRow(projectId, userId, campaignData);

            const { data, error } = await supabase
                .from('email_campaigns')
                .insert(finalCampaign)
                .select()
                .single();

            if (error) throw error;
            return data ? mapCampaignFromRow(data) : data;
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
            const sanitizedUpdates = mapCampaignUpdatesToRow(updates);

            const { error } = await supabase
                .from('email_campaigns')
                .update(sanitizedUpdates)
                .eq('id', campaignId);

            if (error) throw error;
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
            const { error } = await supabase
                .from('email_campaigns')
                .delete()
                .eq('id', campaignId);
            
            if (error) throw error;
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
                    .eq('store_id', projectId)
                    .order('sent_at', { ascending: false });

                if (!isMounted) return;

                if (error) throw error;

                if (data) {
                    const mappedLogs = data.map(mapLogFromRow);
                    setLogs(mappedLogs);
                    const calculatedStats = mappedLogs.reduce(
                        (acc: any, log: any) => ({
                            totalSent: acc.totalSent + 1,
                            delivered: acc.delivered + (['delivered', 'sent', 'opened', 'clicked'].includes(log.status) ? 1 : 0),
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
                { event: '*', schema: 'public', table: 'email_logs', filter: `store_id=eq.${projectId}` },
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
                const { data, error } = await supabase
                    .from('email_audiences')
                    .select('*')
                    .eq('store_id', projectId)
                    .order('created_at', { ascending: false });

                if (!isMounted) return;

                if (error) throw error;

                if (data) {
                    setAudiences(data.map(mapAudienceFromRow));
                    setError(null);
                }
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
                { event: '*', schema: 'public', table: 'email_audiences', filter: `store_id=eq.${projectId}` },
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
            const newAudience = mapAudienceToRow(projectId, userId, {
                ...audienceData,
                estimatedCount: 0,
                isDefault: false,
                createdBy: userId,
            });

            const { data, error } = await supabase
                .from('email_audiences')
                .insert(newAudience)
                .select()
                .single();

            if (error) throw error;
            return data ? mapAudienceFromRow(data) : data;
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
            const { error } = await supabase
                .from('email_audiences')
                .update(mapAudienceUpdatesToRow(updates))
                .eq('id', audienceId);

            if (error) throw error;
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
            const { error } = await supabase
                .from('email_audiences')
                .delete()
                .eq('id', audienceId);
                
            if (error) throw error;
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
