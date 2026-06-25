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
    appointments: true,
    appointmentEmails: true,
    appointmentRequestReceived: true,
    appointmentConfirmation: true,
    appointmentCancellation: true,
    appointmentFollowUp: true,
    appointmentReminder: true,
    appointmentTemplates: {},
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

type EmailSettingsRow = Record<string, any>;

const mapEmailSettingsFromRow = (row: EmailSettingsRow | null | undefined): Partial<EmailSettings> => {
    if (!row) return defaultEmailSettings;
    return {
        provider: (row.provider || 'resend') as EmailSettings['provider'],
        apiKeyConfigured: Boolean(row.api_key_configured),
        fromEmail: row.from_email || '',
        fromName: row.from_name || '',
        replyTo: row.reply_to || '',
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
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};

const mapEmailSettingsToRow = (
    projectId: string,
    userId: string,
    updates: Partial<EmailSettings>,
): EmailSettingsRow => {
    const row: EmailSettingsRow = {
        project_id: projectId,
        store_id: projectId,
        user_id: userId,
        updated_at: new Date().toISOString(),
    };

    if (updates.provider !== undefined) row.provider = updates.provider;
    if (updates.apiKeyConfigured !== undefined) row.api_key_configured = updates.apiKeyConfigured;
    if (updates.fromEmail !== undefined) row.from_email = updates.fromEmail;
    if (updates.fromName !== undefined) row.from_name = updates.fromName;
    if (updates.replyTo !== undefined) row.reply_to = updates.replyTo;
    if (updates.logoUrl !== undefined) row.logo_url = updates.logoUrl;
    if (updates.primaryColor !== undefined) row.primary_color = updates.primaryColor;
    if (updates.footerText !== undefined) row.footer_text = updates.footerText;
    if (updates.socialLinks !== undefined) row.social_links = updates.socialLinks;
    if (updates.transactional !== undefined) row.transactional = updates.transactional;
    if (updates.marketing !== undefined) row.marketing = updates.marketing;

    return row;
};

const stripUndefined = <T extends Record<string, any>>(value: T): T =>
    Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;

const mapCampaignInputToRow = (campaignData: Record<string, any>) => stripUndefined({
    name: campaignData.name,
    subject: campaignData.subject,
    type: campaignData.type,
    preview_text: campaignData.previewText ?? campaignData.preview_text,
    html_content: campaignData.htmlContent ?? campaignData.html_content ?? campaignData.content,
    email_document: campaignData.emailDocument ?? campaignData.email_document,
    audience_type: campaignData.audienceType ?? campaignData.audience_type,
    audience_segment_id: campaignData.audienceSegmentId ?? campaignData.audience_segment_id,
    custom_recipient_emails: campaignData.customRecipientEmails ?? campaignData.custom_recipient_emails,
    status: campaignData.status,
    tags: campaignData.tags,
});

const mapAudienceInputToRow = (audienceData: Record<string, any>) => stripUndefined({
    name: audienceData.name,
    description: audienceData.description,
    filters: audienceData.filters,
    accepts_marketing: audienceData.acceptsMarketing ?? audienceData.accepts_marketing,
    has_ordered: audienceData.hasOrdered ?? audienceData.has_ordered,
    min_orders: audienceData.minOrders ?? audienceData.min_orders,
    max_orders: audienceData.maxOrders ?? audienceData.max_orders,
    min_total_spent: audienceData.minTotalSpent ?? audienceData.min_total_spent,
    max_total_spent: audienceData.maxTotalSpent ?? audienceData.max_total_spent,
    tags: audienceData.tags,
    exclude_tags: audienceData.excludeTags ?? audienceData.exclude_tags,
    last_order_days_ago: audienceData.lastOrderDaysAgo ?? audienceData.last_order_days_ago,
    source: audienceData.source,
    static_members: audienceData.staticMembers ?? audienceData.static_members,
    static_member_count: audienceData.staticMemberCount ?? audienceData.static_member_count,
    estimated_count: audienceData.estimatedCount ?? audienceData.estimated_count,
    is_default: audienceData.isDefault ?? audienceData.is_default,
});

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
                const mergedSettings = {
                    ...defaultEmailSettings,
                    ...settings,
                    ...updates,
                };
                const updatedPayload = mapEmailSettingsToRow(projectId, userId, mergedSettings);

                const { error } = await supabase
                    .from('email_settings')
                    .upsert(updatedPayload, { onConflict: 'project_id' });

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
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false });

                if (!isMounted) return;
                
                if (error) throw error;
                if (data) setCampaigns(data);
                
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
            const finalCampaign = {
                ...mapCampaignInputToRow(campaignData),
                project_id: projectId,
                store_id: projectId,
                user_id: userId,
                created_by: userId,
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
                .insert(finalCampaign)
                .select()
                .single();

            if (error) throw error;
            return data;
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
            const sanitizedUpdates = mapCampaignInputToRow(updates);

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
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false });

                if (!isMounted) return;

                if (error) throw error;

                if (data) {
                    setAudiences(data);
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
            const newAudience = {
                ...mapAudienceInputToRow(audienceData),
                estimated_count: 0,
                is_default: false,
                project_id: projectId,
                store_id: projectId,
                user_id: userId,
                created_by: userId,
            };

            const { data, error } = await supabase
                .from('email_audiences')
                .insert(newAudience)
                .select()
                .single();

            if (error) throw error;
            return data;
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
                .update(mapAudienceInputToRow(updates))
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
