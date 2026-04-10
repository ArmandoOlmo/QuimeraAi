/**
 * useAdminEmailData
 *
 * Custom hook that handles all Firestore realtime subscriptions and computed
 * statistics for the Admin Email Hub. Encapsulates data fetching, filtering,
 * and aggregation logic.
 */

import { useState, useEffect, useMemo } from 'react';
import { useAdmin } from '../../../../../contexts/admin/AdminContext';
import {
    db, collection, query, orderBy, onSnapshot,
} from '../../../../../firebase';
import type { EmailAutomation } from '../../../../../types/email';
import type { CampaignStatus } from '../../../../../types/email';
import type {
    CrossTenantCampaign,
    CrossTenantAudience,
    CrossTenantLog,
    EmailStats,
    MonthlyDataPoint,
    TenantPerformanceData,
} from '../types';

export interface AdminEmailDataFilters {
    campaignSearch: string;
    campaignStatusFilter: CampaignStatus | 'all';
    campaignTenantFilter: string;
    audienceSearch: string;
    analyticsTimeRange: '7d' | '30d' | '90d' | '12m';
}

export interface AdminEmailDataReturn {
    // Raw data
    campaigns: CrossTenantCampaign[];
    setCampaigns: React.Dispatch<React.SetStateAction<CrossTenantCampaign[]>>;
    audiences: CrossTenantAudience[];
    setAudiences: React.Dispatch<React.SetStateAction<CrossTenantAudience[]>>;
    emailLogs: CrossTenantLog[];
    automations: EmailAutomation[];
    isLoading: boolean;

    // Computed
    stats: EmailStats;
    filteredCampaigns: CrossTenantCampaign[];
    filteredAudiences: CrossTenantAudience[];
    adminAudiences: CrossTenantAudience[];
    monthlyData: MonthlyDataPoint[];
    tenantPerformance: TenantPerformanceData[];

    // Filters
    filters: AdminEmailDataFilters;
    setCampaignSearch: (v: string) => void;
    setCampaignStatusFilter: (v: CampaignStatus | 'all') => void;
    setCampaignTenantFilter: (v: string) => void;
    setAudienceSearch: (v: string) => void;
    setAnalyticsTimeRange: (v: '7d' | '30d' | '90d' | '12m') => void;
}

export function useAdminEmailData(): AdminEmailDataReturn {
    const { tenants, fetchAllUsers } = useAdmin();

    // Cross-tenant data state
    const [campaigns, setCampaigns] = useState<CrossTenantCampaign[]>([]);
    const [audiences, setAudiences] = useState<CrossTenantAudience[]>([]);
    const [emailLogs, setEmailLogs] = useState<CrossTenantLog[]>([]);
    const [automations, setAutomations] = useState<EmailAutomation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [campaignSearch, setCampaignSearch] = useState('');
    const [campaignStatusFilter, setCampaignStatusFilter] = useState<CampaignStatus | 'all'>('all');
    const [campaignTenantFilter, setCampaignTenantFilter] = useState<string>('all');
    const [audienceSearch, setAudienceSearch] = useState('');
    const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

    // Load users list for audience management
    useEffect(() => {
        fetchAllUsers().catch(() => {});
    }, []);

    // =========================================================================
    // REALTIME: Admin Campaigns
    // =========================================================================
    useEffect(() => {
        setIsLoading(true);
        const adminCampaignsRef = collection(db, 'adminEmailCampaigns');
        const q = query(adminCampaignsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const adminCampaigns: CrossTenantCampaign[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                tenantId: 'admin',
                tenantName: 'Super Admin',
                userId: d.data().createdBy || 'admin',
                projectId: 'admin',
            } as CrossTenantCampaign));

            setCampaigns(adminCampaigns);
            setIsLoading(false);
        }, (err) => {
            console.warn('[AdminEmailHub] Admin campaigns snapshot error:', err);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // =========================================================================
    // REALTIME: Admin Audiences
    // =========================================================================
    useEffect(() => {
        const adminAudiencesRef = collection(db, 'adminEmailAudiences');
        const q = query(adminAudiencesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const adminAudiences: CrossTenantAudience[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                tenantId: 'admin',
                tenantName: 'Super Admin',
                userId: d.data().createdBy || 'admin',
                projectId: 'admin',
            } as CrossTenantAudience));

            setAudiences(adminAudiences);
        }, (err) => {
            console.warn('[AdminEmailHub] Admin audiences snapshot error:', err);
        });

        return () => unsubscribe();
    }, []);

    // =========================================================================
    // REALTIME: Admin Email Logs
    // =========================================================================
    useEffect(() => {
        const adminLogsRef = collection(db, 'adminEmailLogs');
        const q = query(adminLogsRef, orderBy('sentAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const adminLogs: CrossTenantLog[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                tenantId: 'admin',
                tenantName: 'Super Admin',
            } as CrossTenantLog));

            setEmailLogs(adminLogs);
        }, (err) => {
            // Collection may not exist yet — that's fine
            console.warn('[AdminEmailHub] Admin logs snapshot error:', err);
        });

        return () => unsubscribe();
    }, []);

    // =========================================================================
    // REALTIME: Admin Automations
    // =========================================================================
    useEffect(() => {
        const automationsRef = collection(db, 'adminEmailAutomations');
        const q = query(automationsRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const automationsData = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
            })) as EmailAutomation[];
            setAutomations(automationsData);
        }, (err) => {
            console.warn('[AdminEmailHub] Automations listener error:', err);
        });

        return () => unsubscribe();
    }, []);

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
            const matchesTenant = campaignTenantFilter === 'all' || c.tenantId === campaignTenantFilter;
            return matchesSearch && matchesStatus && matchesTenant;
        });
    }, [campaigns, campaignSearch, campaignStatusFilter, campaignTenantFilter]);

    // Filtered audiences
    const filteredAudiences = useMemo(() => {
        return audiences.filter(a => {
            return audienceSearch === '' ||
                a.name?.toLowerCase().includes(audienceSearch.toLowerCase()) ||
                a.tenantName?.toLowerCase().includes(audienceSearch.toLowerCase());
        });
    }, [audiences, audienceSearch]);

    // Admin-only audiences
    const adminAudiences = useMemo(() =>
        filteredAudiences.filter(a => a.tenantId === 'admin'),
        [filteredAudiences]
    );

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

    // Top performing tenants for analytics
    const tenantPerformance = useMemo<TenantPerformanceData[]>(() => {
        const perf = new Map<string, { name: string; sent: number; opened: number; clicked: number; campaigns: number }>();
        campaigns.forEach(c => {
            const existing = perf.get(c.tenantId) || { name: c.tenantName, sent: 0, opened: 0, clicked: 0, campaigns: 0 };
            existing.campaigns++;
            existing.sent += c.stats?.sent || 0;
            existing.opened += c.stats?.uniqueOpens || 0;
            existing.clicked += c.stats?.uniqueClicks || 0;
            perf.set(c.tenantId, existing);
        });
        return Array.from(perf.values()).sort((a, b) => b.sent - a.sent).slice(0, 5);
    }, [campaigns]);

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
        adminAudiences,
        monthlyData,
        tenantPerformance,
        filters: {
            campaignSearch,
            campaignStatusFilter,
            campaignTenantFilter,
            audienceSearch,
            analyticsTimeRange,
        },
        setCampaignSearch,
        setCampaignStatusFilter,
        setCampaignTenantFilter,
        setAudienceSearch,
        setAnalyticsTimeRange,
    };
}
