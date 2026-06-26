/**
 * useUserEmailData
 *
 * User-scoped version of useAdminEmailData.
 * User campaign/audience data comes from the canonical Email Engine.
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../../../supabase';
import type { EmailAutomation } from '../../../../../types/email';
import type { CampaignStatus } from '../../../../../types/email';
import type {
    UserEmailCampaign,
    UserEmailAudience,
    UserEmailLog,
    EmailStats,
    MonthlyDataPoint,
} from '../types';

export interface UserEmailDataFilters {
    campaignSearch: string;
    campaignStatusFilter: CampaignStatus | 'all';
    audienceSearch: string;
    analyticsTimeRange: '7d' | '30d' | '90d' | '12m';
}

export interface UserEmailDataReturn {
    // Raw data
    campaigns: UserEmailCampaign[];
    setCampaigns: React.Dispatch<React.SetStateAction<UserEmailCampaign[]>>;
    audiences: UserEmailAudience[];
    setAudiences: React.Dispatch<React.SetStateAction<UserEmailAudience[]>>;
    emailLogs: UserEmailLog[];
    automations: EmailAutomation[];
    isLoading: boolean;

    // Computed
    stats: EmailStats;
    filteredCampaigns: UserEmailCampaign[];
    filteredAudiences: UserEmailAudience[];
    monthlyData: MonthlyDataPoint[];

    // Filters
    filters: UserEmailDataFilters;
    setCampaignSearch: (v: string) => void;
    setCampaignStatusFilter: (v: CampaignStatus | 'all') => void;
    setAudienceSearch: (v: string) => void;
    setAnalyticsTimeRange: (v: '7d' | '30d' | '90d' | '12m') => void;
}

export function useUserEmailData(userId: string, projectId: string): UserEmailDataReturn {
    // Data state
    const [campaigns, setCampaigns] = useState<UserEmailCampaign[]>([]);
    const [audiences, setAudiences] = useState<UserEmailAudience[]>([]);
    const [emailLogs, setEmailLogs] = useState<UserEmailLog[]>([]);
    const [automations, setAutomations] = useState<EmailAutomation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [campaignSearch, setCampaignSearch] = useState('');
    const [campaignStatusFilter, setCampaignStatusFilter] = useState<CampaignStatus | 'all'>('all');
    const [audienceSearch, setAudienceSearch] = useState('');
    const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

    const isValid = Boolean(userId && projectId && projectId !== 'default');

    // =========================================================================
    // REALTIME: Canonical campaigns
    // =========================================================================
    useEffect(() => {
        if (!isValid) {
            setCampaigns([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
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
                if (data?.success === false) throw new Error(data.error || 'Unable to load canonical campaigns');
                setCampaigns((data?.campaigns || []).map((campaign: Record<string, any>) => (
                    mapUserCampaignFromCanonical(campaign, userId, projectId)
                )));
            } catch (err) {
                if (!isMounted) return;
                console.warn('[UserEmailData] Canonical campaigns error:', err);
                setCampaigns([]);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchCampaigns();

        const channelId = `user_email_campaigns_${projectId}_${Math.random().toString(36).substring(2, 9)}`;
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
    }, [userId, projectId, isValid]);

    // =========================================================================
    // REALTIME: Canonical audiences
    // =========================================================================
    useEffect(() => {
        if (!isValid) { setAudiences([]); return; }

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
                if (data?.success === false) throw new Error(data.error || 'Unable to load canonical audiences');
                setAudiences((data?.audiences || []).map((audience: Record<string, any>) => (
                    mapUserAudienceFromCanonical(audience, userId, projectId)
                )));
            } catch (err) {
                if (!isMounted) return;
                console.warn('[UserEmailData] Canonical audiences error:', err);
                setAudiences([]);
            }
        };

        fetchAudiences();

        const channelId = `user_email_audiences_${projectId}_${Math.random().toString(36).substring(2, 9)}`;
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
    }, [userId, projectId, isValid]);

    // =========================================================================
    // REALTIME: Canonical email logs
    // =========================================================================
    useEffect(() => {
        if (!isValid) { setEmailLogs([]); return; }

        let isMounted = true;

        const fetchLogs = async () => {
            try {
                const { data, error } = await supabase
                    .from('email_logs')
                    .select('*')
                    .or(`project_id.eq.${projectId},store_id.eq.${projectId}`)
                    .order('sent_at', { ascending: false })
                    .limit(500);
                if (!isMounted) return;
                if (error) throw error;
                setEmailLogs((data || []).map(mapUserEmailLogFromCanonical));
            } catch (err) {
                if (!isMounted) return;
                console.warn('[UserEmailData] Canonical logs error:', err);
                setEmailLogs([]);
            }
        };

        fetchLogs();

        const channelId = `user_email_logs_${projectId}_${Math.random().toString(36).substring(2, 9)}`;
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
    }, [userId, projectId, isValid]);

    // =========================================================================
    // REALTIME: Canonical automations
    // =========================================================================
    useEffect(() => {
        if (!isValid) { setAutomations([]); return; }

        let isMounted = true;

        const fetchAutomations = async () => {
            try {
                const { data, error } = await supabase.functions.invoke('email-api', {
                    body: {
                        action: 'getAutomations',
                        projectId,
                    },
                });
                if (!isMounted) return;
                if (error) throw error;
                if (data?.success === false) throw new Error(data.error || 'Unable to load canonical automations');
                setAutomations((data?.automations || []).map(mapUserAutomationFromCanonical));
            } catch (err) {
                if (!isMounted) return;
                console.warn('[UserEmailData] Canonical automations error:', err);
                setAutomations([]);
            }
        };

        fetchAutomations();

        const channelId = `user_email_automations_${projectId}_${Math.random().toString(36).substring(2, 9)}`;
        const subscription = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'email_automations', filter: `project_id=eq.${projectId}` },
                () => {
                    if (isMounted) fetchAutomations();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(subscription);
        };
    }, [userId, projectId, isValid]);

    // =========================================================================
    // COMPUTED STATS
    // =========================================================================

    const stats = useMemo<EmailStats>(() => {
        const totalSent = emailLogs.length;
        const delivered = emailLogs.filter(l => ['delivered', 'sent', 'opened', 'clicked'].includes(l.status)).length;
        const opened = emailLogs.filter(l => l.status === 'opened' || l.opened).length;
        const clicked = emailLogs.filter(l => l.status === 'clicked' || l.clicked).length;
        const bounced = emailLogs.filter(l => l.status === 'bounced').length;
        const activeCampaigns = campaigns.filter(c => c.status === 'sending' || c.status === 'scheduled').length;
        const totalContacts = audiences.reduce((sum, a) => sum + (a.estimatedCount || a.staticMemberCount || 0), 0);

        return {
            totalSent,
            delivered,
            opened,
            clicked,
            bounced,
            activeCampaigns,
            totalContacts,
            totalCampaigns: campaigns.length,
            totalAudiences: audiences.length,
            openRate: delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : '0.0',
            clickRate: opened > 0 ? ((clicked / opened) * 100).toFixed(1) : '0.0',
            deliveryRate: totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(1) : '0.0',
            bounceRate: totalSent > 0 ? ((bounced / totalSent) * 100).toFixed(1) : '0.0',
        };
    }, [emailLogs, campaigns, audiences]);

    // Filtered campaigns
    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(c => {
            const matchesSearch = campaignSearch === '' ||
                c.name?.toLowerCase().includes(campaignSearch.toLowerCase()) ||
                c.subject?.toLowerCase().includes(campaignSearch.toLowerCase());
            const matchesStatus = campaignStatusFilter === 'all' || c.status === campaignStatusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [campaigns, campaignSearch, campaignStatusFilter]);

    // Filtered audiences
    const filteredAudiences = useMemo(() => {
        return audiences.filter(a => {
            return audienceSearch === '' ||
                a.name?.toLowerCase().includes(audienceSearch.toLowerCase());
        });
    }, [audiences, audienceSearch]);

    // Analytics monthly data
    const monthlyData = useMemo<MonthlyDataPoint[]>(() => {
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthMap = new Map<string, { sent: number; opened: number; clicked: number }>();
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            monthMap.set(`${date.getFullYear()}-${date.getMonth()}`, { sent: 0, opened: 0, clicked: 0 });
        }
        emailLogs.forEach(log => {
            if (!log.sentAt) return;
            const logDate = log.sentAt.seconds
                ? new Date(log.sentAt.seconds * 1000)
                : new Date(log.sentAt);
            const key = `${logDate.getFullYear()}-${logDate.getMonth()}`;
            const existing = monthMap.get(key);
            if (existing) {
                existing.sent++;
                if (log.status === 'opened' || log.opened) existing.opened++;
                if (log.status === 'clicked' || log.clicked) existing.clicked++;
            }
        });
        return Array.from(monthMap.entries()).map(([key, data]) => {
            const [, month] = key.split('-').map(Number);
            return { month: monthNames[month], ...data };
        }).slice(-6);
    }, [emailLogs]);

    return {
        campaigns,
        setCampaigns,
        audiences,
        setAudiences,
        emailLogs,
        automations,
        isLoading,
        stats,
        filteredCampaigns,
        filteredAudiences,
        monthlyData,
        filters: {
            campaignSearch,
            campaignStatusFilter,
            audienceSearch,
            analyticsTimeRange,
        },
        setCampaignSearch,
        setCampaignStatusFilter,
        setAudienceSearch,
        setAnalyticsTimeRange,
    };
}

function mapUserCampaignFromCanonical(
    campaign: Record<string, any>,
    userId: string,
    projectId: string,
): UserEmailCampaign {
    return {
        ...campaign,
        id: String(campaign.id || ''),
        name: String(campaign.name || ''),
        subject: String(campaign.subject || ''),
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
        stats: {
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
            ...(campaign.stats || {}),
        },
        tags: Array.isArray(campaign.tags) ? campaign.tags : [],
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
        createdBy: campaign.createdBy ?? campaign.created_by ?? userId,
        userId,
        projectId,
        createdAt: campaign.createdAt ?? campaign.created_at ?? new Date().toISOString(),
        updatedAt: campaign.updatedAt ?? campaign.updated_at ?? new Date().toISOString(),
    } as UserEmailCampaign;
}

function mapUserAutomationFromCanonical(automation: Record<string, any>): EmailAutomation {
    return {
        ...automation,
        id: String(automation.id || ''),
        name: String(automation.name || ''),
        description: automation.description || '',
        type: automation.type || 'welcome',
        category: automation.category || 'lifecycle',
        status: automation.status || 'draft',
        triggerConfig: automation.triggerConfig || automation.trigger_config || {},
        audienceId: automation.audienceId ?? automation.audience_id ?? '',
        steps: Array.isArray(automation.steps) ? automation.steps : [],
        templateId: automation.templateId ?? automation.template_id ?? '',
        subject: automation.subject || '',
        delayMinutes: Number(automation.delayMinutes ?? automation.delay_minutes ?? 0),
        stats: {
            triggered: 0,
            sent: 0,
            opened: 0,
            clicked: 0,
            converted: 0,
            ...(automation.stats || {}),
        },
        generatedByAI: automation.generatedByAI ?? automation.generated_by_ai,
        needsReview: automation.needsReview ?? automation.needs_review,
        userModified: automation.userModified ?? automation.user_modified,
        safeToEdit: automation.safeToEdit ?? automation.safe_to_edit,
        sendMode: automation.sendMode ?? automation.send_mode,
        sourceModule: automation.sourceModule ?? automation.source_module,
        sourceComponent: automation.sourceComponent ?? automation.source_component,
        sourceEvent: automation.sourceEvent ?? automation.source_event,
        sourceEntityType: automation.sourceEntityType ?? automation.source_entity_type,
        sourceEntityId: automation.sourceEntityId ?? automation.source_entity_id,
        correlationId: automation.correlationId ?? automation.correlation_id,
        idempotencyKey: automation.idempotencyKey ?? automation.idempotency_key,
        readiness: automation.readiness || {},
        metadata: automation.metadata || {},
        createdAt: automation.createdAt ?? automation.created_at ?? new Date().toISOString(),
        updatedAt: automation.updatedAt ?? automation.updated_at ?? new Date().toISOString(),
    } as EmailAutomation;
}

function mapUserEmailLogFromCanonical(log: Record<string, any>): UserEmailLog {
    const status = String(log.status || 'queued');
    return {
        id: String(log.id || ''),
        status,
        sentAt: log.sentAt ?? log.sent_at ?? log.created_at ?? new Date().toISOString(),
        opened: Boolean(log.opened || log.opened_at || status === 'opened'),
        clicked: Boolean(log.clicked || log.clicked_at || status === 'clicked'),
        recipientEmail: log.recipientEmail ?? log.recipient_email,
        subject: log.subject || '',
        type: log.type || log.email_kind || '',
    };
}

function mapUserAudienceFromCanonical(
    audience: Record<string, any>,
    userId: string,
    projectId: string,
): UserEmailAudience {
    const staticMembers = audience.staticMembers || audience.static_members || {};
    const members = Array.isArray(staticMembers.members)
        ? staticMembers.members
        : Array.isArray(audience.members)
            ? audience.members
            : [];

    return {
        id: String(audience.id || ''),
        name: String(audience.name || ''),
        description: audience.description || '',
        estimatedCount: Number(audience.estimatedCount ?? audience.estimated_count ?? members.length ?? 0),
        userId,
        projectId,
        createdAt: audience.createdAt || audience.created_at || new Date().toISOString(),
        filters: Array.isArray(audience.filters) ? audience.filters : [],
        tags: Array.isArray(audience.tags) ? audience.tags : [],
        acceptsMarketing: audience.acceptsMarketing ?? audience.accepts_marketing,
        hasOrdered: audience.hasOrdered ?? audience.has_ordered,
        staticMemberCount: Number(audience.staticMemberCount ?? audience.static_member_count ?? members.length ?? 0),
        members,
        ...(staticMembers ? { staticMembers } : {}),
    } as UserEmailAudience;
}
