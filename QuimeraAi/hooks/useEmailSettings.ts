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

interface UseEmailSettingsOptions {
    realtime?: boolean;
}

type EmailSettingsRow = {
    provider?: string | null;
    api_key_configured?: boolean | null;
    from_email?: string | null;
    from_name?: string | null;
    reply_to?: string | null;
    logo_url?: string | null;
    primary_color?: string | null;
    footer_text?: string | null;
    social_links?: EmailSocialLinks | null;
    transactional?: Partial<TransactionalEmailSettings> | null;
    marketing?: Partial<MarketingEmailSettings> | null;
    created_at?: string | null;
    updated_at?: string | null;
};

const compactPayload = (payload: Record<string, any>) =>
    Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

const mapEmailSettingsFromDB = (row: EmailSettingsRow): Partial<EmailSettings> => ({
    provider: row.provider === 'sendgrid' ? 'sendgrid' : 'resend',
    apiKeyConfigured: Boolean(row.api_key_configured),
    fromEmail: row.from_email || '',
    fromName: row.from_name || '',
    replyTo: row.reply_to || undefined,
    logoUrl: row.logo_url || undefined,
    primaryColor: row.primary_color || defaultEmailSettings.primaryColor,
    footerText: row.footer_text || undefined,
    socialLinks: row.social_links || undefined,
    transactional: {
        ...defaultTransactionalSettings,
        ...(row.transactional || {}),
    },
    marketing: {
        ...defaultMarketingSettings,
        ...(row.marketing || {}),
    },
    createdAt: row.created_at as any,
    updatedAt: row.updated_at as any,
});

const mapEmailSettingsToDB = (settings: Partial<EmailSettings>, projectId: string) =>
    compactPayload({
        store_id: projectId,
        provider: settings.provider,
        api_key_configured: settings.apiKeyConfigured,
        from_email: settings.fromEmail,
        from_name: settings.fromName,
        reply_to: settings.replyTo,
        logo_url: settings.logoUrl,
        primary_color: settings.primaryColor,
        footer_text: settings.footerText,
        social_links: settings.socialLinks,
        transactional: settings.transactional,
        marketing: settings.marketing,
        updated_at: new Date().toISOString(),
    });

const mapEmailCampaignFromDB = (row: any) => ({
    ...row,
    storeId: row.store_id,
    previewText: row.preview_text,
    htmlContent: row.html_content,
    emailDocument: row.email_document,
    audienceType: row.audience_type,
    audienceSegmentId: row.audience_segment_id,
    customRecipientEmails: row.custom_recipient_emails,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const mapEmailCampaignToDB = (data: any, projectId?: string, userId?: string) =>
    compactPayload({
        store_id: projectId,
        name: data.name,
        subject: data.subject,
        preview_text: data.previewText,
        type: data.type,
        html_content: data.htmlContent ?? data.content,
        email_document: data.emailDocument,
        audience_type: data.audienceType,
        audience_segment_id: data.audienceSegmentId,
        custom_recipient_emails: data.customRecipientEmails,
        status: data.status,
        stats: data.stats,
        tags: data.tags,
        created_by: userId,
        updated_at: data.updatedAt,
    });

const mapEmailLogFromDB = (row: any) => ({
    ...row,
    storeId: row.store_id,
    templateId: row.template_id,
    campaignId: row.campaign_id,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name,
    customerId: row.customer_id,
    providerMessageId: row.provider_message_id,
    openCount: row.open_count,
    clickCount: row.click_count,
    bounceType: row.bounce_type,
    bounceMessage: row.bounce_message,
    errorMessage: row.error_message,
    errorCode: row.error_code,
    clickedLinks: row.clicked_links,
    sentAt: row.sent_at,
    deliveredAt: row.delivered_at,
    openedAt: row.opened_at,
    clickedAt: row.clicked_at,
    bouncedAt: row.bounced_at,
    complainedAt: row.complained_at,
    opened: row.status === 'opened' || Number(row.open_count || 0) > 0,
    clicked: row.status === 'clicked' || Number(row.click_count || 0) > 0,
});

const mapEmailAudienceFromDB = (row: any) => ({
    ...row,
    storeId: row.store_id,
    acceptsMarketing: row.accepts_marketing,
    hasOrdered: row.has_ordered,
    minOrders: row.min_orders,
    maxOrders: row.max_orders,
    minTotalSpent: row.min_total_spent,
    maxTotalSpent: row.max_total_spent,
    excludeTags: row.exclude_tags,
    lastOrderDaysAgo: row.last_order_days_ago,
    staticMembers: row.static_members,
    staticMemberCount: row.static_member_count,
    estimatedCount: row.estimated_count,
    lastCountUpdate: row.last_count_update,
    isDefault: row.is_default,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const mapEmailAudienceToDB = (data: any, projectId?: string, userId?: string) =>
    compactPayload({
        store_id: projectId,
        name: data.name,
        description: data.description,
        filters: data.filters,
        accepts_marketing: data.acceptsMarketing,
        has_ordered: data.hasOrdered,
        min_orders: data.minOrders,
        max_orders: data.maxOrders,
        min_total_spent: data.minTotalSpent,
        max_total_spent: data.maxTotalSpent,
        tags: data.tags,
        exclude_tags: data.excludeTags,
        last_order_days_ago: data.lastOrderDaysAgo,
        source: data.source,
        static_members: data.staticMembers,
        static_member_count: data.staticMemberCount,
        estimated_count: data.estimatedCount,
        is_default: data.isDefault,
        created_by: userId,
        updated_at: data.updatedAt,
    });

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

                if (error) {
                    throw error;
                }

                if (data) {
                    setSettings(mapEmailSettingsFromDB(data));
                    setError(null);
                } else {
                    setSettings(defaultEmailSettings);
                    setError(null);
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
                            setSettings(mapEmailSettingsFromDB(payload.new));
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
                const updatedPayload = {
                    ...defaultEmailSettings,
                    ...settings,
                    ...updates,
                };

                const { error } = await supabase
                    .from('email_settings')
                    .upsert(mapEmailSettingsToDB(updatedPayload, projectId), { onConflict: 'store_id' });

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
                if (data) setCampaigns(data.map(mapEmailCampaignFromDB));
                
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
            const finalCampaign = {
                ...campaignData,
                status: 'draft',
                stats: {
                    totalRecipients: 0,
                    sent: 0,
                    delivered: 0,
                    opened: 0,
                    uniqueOpens: 0,
                    clicked: 0,
                    uniqueClicks: 0,
                    bounced: 0,
                    complained: 0,
                    unsubscribed: 0,
                },
            };

            const { data, error } = await supabase
                .from('email_campaigns')
                .insert(mapEmailCampaignToDB(finalCampaign, projectId, userId))
                .select()
                .single();

            if (error) throw error;
            return mapEmailCampaignFromDB(data);
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
            const { error } = await supabase
                .from('email_campaigns')
                .update(mapEmailCampaignToDB({
                    ...updates,
                    updatedAt: new Date().toISOString(),
                }))
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
                let query = supabase
                    .from('email_logs')
                    .select('*')
                    .eq('store_id', projectId)
                    .order('sent_at', { ascending: false });

                if (options?.limit) {
                    query = query.limit(options.limit);
                }

                const { data, error } = await query;

                if (!isMounted) return;

                if (error) throw error;

                if (data) {
                    const mappedLogs = data.map(mapEmailLogFromDB);
                    setLogs(mappedLogs);
                    const calculatedStats = mappedLogs.reduce(
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
                    setAudiences(data.map(mapEmailAudienceFromDB));
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
            const newAudience = {
                ...audienceData,
                estimatedCount: 0,
                isDefault: false,
            };

            const { data, error } = await supabase
                .from('email_audiences')
                .insert(mapEmailAudienceToDB(newAudience, projectId, userId))
                .select()
                .single();

            if (error) throw error;
            return mapEmailAudienceFromDB(data);
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
                .update(mapEmailAudienceToDB({
                    ...updates,
                    updatedAt: new Date().toISOString(),
                }))
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
