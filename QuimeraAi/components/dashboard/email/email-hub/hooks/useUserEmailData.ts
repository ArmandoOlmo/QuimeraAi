/**
 * useUserEmailData
 *
 * User-scoped version of useAdminEmailData.
 * All Firestore subscriptions are scoped to users/{userId}/projects/{projectId}/...
 */

import { useState, useEffect, useMemo } from 'react';
import {
    db, collection, query, orderBy, onSnapshot,
} from '../../../../../firebase';
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

    const basePath = `users/${userId}/projects/${projectId}`;
    const isValid = Boolean(userId && projectId && projectId !== 'default');

    // =========================================================================
    // REALTIME: Campaigns
    // =========================================================================
    useEffect(() => {
        if (!isValid) {
            setCampaigns([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const campaignsRef = collection(db, `${basePath}/emailCampaigns`);
        const q = query(campaignsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: UserEmailCampaign[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                userId,
                projectId,
            } as UserEmailCampaign));
            setCampaigns(data);
            setIsLoading(false);
        }, (err) => {
            console.warn('[UserEmailData] Campaigns snapshot error:', err);
            setCampaigns([]);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId, projectId, isValid]);

    // =========================================================================
    // REALTIME: Audiences
    // =========================================================================
    useEffect(() => {
        if (!isValid) { setAudiences([]); return; }

        const audiencesRef = collection(db, `${basePath}/emailAudiences`);
        const q = query(audiencesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: UserEmailAudience[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                userId,
                projectId,
            } as UserEmailAudience));
            setAudiences(data);
        }, (err) => {
            console.warn('[UserEmailData] Audiences snapshot error:', err);
            setAudiences([]);
        });

        return () => unsubscribe();
    }, [userId, projectId, isValid]);

    // =========================================================================
    // REALTIME: Email Logs
    // =========================================================================
    useEffect(() => {
        if (!isValid) { setEmailLogs([]); return; }

        const logsRef = collection(db, `${basePath}/emailLogs`);
        const q = query(logsRef, orderBy('sentAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: UserEmailLog[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
            } as UserEmailLog));
            setEmailLogs(data);
        }, (err) => {
            console.warn('[UserEmailData] Logs snapshot error:', err);
            setEmailLogs([]);
        });

        return () => unsubscribe();
    }, [userId, projectId, isValid]);

    // =========================================================================
    // REALTIME: Automations
    // =========================================================================
    useEffect(() => {
        if (!isValid) { setAutomations([]); return; }

        const automationsRef = collection(db, `${basePath}/emailAutomations`);
        const q = query(automationsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
            })) as EmailAutomation[];
            setAutomations(data);
        }, (err) => {
            console.warn('[UserEmailData] Automations listener error:', err);
            setAutomations([]);
        });

        return () => unsubscribe();
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
