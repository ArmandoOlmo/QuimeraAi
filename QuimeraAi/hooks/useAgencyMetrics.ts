/**
 * useAgencyMetrics Hook
 * Hook for fetching and monitoring agency-level metrics
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import type { Tenant, TenantUsage, TenantStatus } from '../types/multiTenant';
import { resolveProjectName } from '../utils/resolveProjectName';

// =============================================================================
// TYPES
// =============================================================================

export interface ResourceAlert {
    id: string;
    clientId: string;
    clientName: string;
    resource: 'projects' | 'storage' | 'aiCredits' | 'users';
    usage: number;
    limit: number;
    percentage: number;
    severity: 'warning' | 'critical';  // warning: >80%, critical: >95%
}

export interface UpcomingRenewal {
    clientId: string;
    clientName: string;
    renewalDate: Date;
    daysUntilRenewal: number;
    monthlyPrice?: number;
    status: TenantStatus;
}

export interface AggregatedMetrics {
    totalProjects: number;
    totalLeads: number;
    totalRevenue: number;
    totalUsers: number;
    storageUsedGB: number;
    aiCreditsUsed: number;
    activeSubClients: number;
    mrr: number;  // Monthly Recurring Revenue
}

export interface ActivityEvent {
    id: string;
    type: 'client_created' | 'client_updated' | 'report_generated' | 'payment_received' | 'project_created' | 'project_published';
    clientId?: string;
    clientName?: string;
    description: string;
    timestamp: Date;
    userId?: string;
    userName?: string;
    metadata?: Record<string, any>;
}

export interface ClientMetricsSummary {
    clientId: string;
    clientName: string;
    status: Tenant['status'];
    subscriptionPlan: Tenant['subscriptionPlan'];
    usage: TenantUsage;
    limits: Tenant['limits'];
    usagePercentages: {
        projects: number;
        storage: number;
        aiCredits: number;
        users: number;
    };
    alerts: ResourceAlert[];
    lastActiveAt?: Date;
    mrr?: number;
}

// =============================================================================
// HOOK
// =============================================================================

export function useAgencyMetrics(agencyTenantId: string) {
    const [subClients, setSubClients] = useState<Tenant[]>([]);
    const [aggregatedMetrics, setAggregatedMetrics] = useState<AggregatedMetrics>({
        totalProjects: 0,
        totalLeads: 0,
        totalRevenue: 0,
        totalUsers: 0,
        storageUsedGB: 0,
        aiCreditsUsed: 0,
        activeSubClients: 0,
        mrr: 0,
    });
    const [resourceAlerts, setResourceAlerts] = useState<ResourceAlert[]>([]);
    const [upcomingRenewals, setUpcomingRenewals] = useState<UpcomingRenewal[]>([]);
    const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Calculate aggregated metrics from sub-clients
    const calculateMetrics = useCallback((clients: Tenant[]) => {
        const metrics: AggregatedMetrics = {
            totalProjects: 0,
            totalLeads: 0,
            totalRevenue: 0,
            totalUsers: 0,
            storageUsedGB: 0,
            aiCreditsUsed: 0,
            activeSubClients: clients.filter(c => c.status === 'active').length,
            mrr: 0,
        };

        clients.forEach(client => {
            if (client.usage) {
                metrics.totalProjects += client.usage.projectCount || 0;
                metrics.totalUsers += client.usage.userCount || 0;
                metrics.storageUsedGB += client.usage.storageUsedGB || 0;
                metrics.aiCreditsUsed += client.usage.aiCreditsUsed || 0;
            }

            if (client.billing?.mrr) {
                metrics.mrr += client.billing.mrr;
            }
        });

        return metrics;
    }, []);

    // Detect resource alerts
    const detectAlerts = useCallback((clients: Tenant[]): ResourceAlert[] => {
        const alerts: ResourceAlert[] = [];

        clients.forEach(client => {
            if (!client.usage || !client.limits) return;

            const checks: Array<{
                resource: ResourceAlert['resource'];
                usage: number;
                limit: number;
            }> = [
                    {
                        resource: 'projects',
                        usage: client.usage.projectCount || 0,
                        limit: client.limits.maxProjects,
                    },
                    {
                        resource: 'storage',
                        usage: client.usage.storageUsedGB || 0,
                        limit: client.limits.maxStorageGB,
                    },
                    {
                        resource: 'aiCredits',
                        usage: client.usage.aiCreditsUsed || 0,
                        limit: client.limits.maxAiCredits,
                    },
                    {
                        resource: 'users',
                        usage: client.usage.userCount || 0,
                        limit: client.limits.maxUsers,
                    },
                ];

            checks.forEach(check => {
                if (check.limit <= 0) return;  // Skip unlimited resources

                const percentage = (check.usage / check.limit) * 100;

                if (percentage >= 80) {
                    alerts.push({
                        id: `${client.id}-${check.resource}`,
                        clientId: client.id,
                        clientName: client.name,
                        resource: check.resource,
                        usage: check.usage,
                        limit: check.limit,
                        percentage: Math.round(percentage),
                        severity: percentage >= 95 ? 'critical' : 'warning',
                    });
                }
            });
        });

        // Sort by severity (critical first) then by percentage
        return alerts.sort((a, b) => {
            if (a.severity === 'critical' && b.severity !== 'critical') return -1;
            if (a.severity !== 'critical' && b.severity === 'critical') return 1;
            return b.percentage - a.percentage;
        });
    }, []);

    // Calculate upcoming renewals
    const calculateRenewals = useCallback((clients: Tenant[]): UpcomingRenewal[] => {
        const renewals: UpcomingRenewal[] = [];
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        clients.forEach(client => {
            let renewalDate: Date | null = null;

            // Check for trial end date
            if (client.trialEndsAt) {
                // Handle both Firestore timestamps and ISO strings
                renewalDate = typeof client.trialEndsAt === 'string' 
                    ? new Date(client.trialEndsAt)
                    : new Date((client.trialEndsAt as any).seconds * 1000);
            }
            // Check for billing period end
            else if (client.billing?.currentPeriodEnd) {
                renewalDate = typeof client.billing.currentPeriodEnd === 'string'
                    ? new Date(client.billing.currentPeriodEnd)
                    : new Date((client.billing.currentPeriodEnd as any).seconds * 1000);
            }

            if (renewalDate && renewalDate >= now && renewalDate <= thirtyDaysFromNow) {
                const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

                renewals.push({
                    clientId: client.id,
                    clientName: client.name,
                    renewalDate,
                    daysUntilRenewal,
                    monthlyPrice: client.billing?.monthlyPrice,
                    status: client.status,
                });
            }
        });

        // Sort by soonest renewal first
        return renewals.sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);
    }, []);

    // Fetch sub-clients in real-time
    useEffect(() => {
        if (!agencyTenantId) {
            setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);
        setError(null);

        const fetchSubClients = async () => {
            try {
                const { data, error } = await supabase
                    .from('tenants')
                    .select('*')
                    .eq('owner_tenant_id', agencyTenantId)
                    .in('status', ['active', 'trial', 'suspended']);

                if (!isMounted) return;

                if (error) throw error;

                const clients: Tenant[] = [];
                if (data) {
                    data.forEach((doc: any) => {
                        clients.push({
                            ...doc,
                            id: doc.id,
                            name: resolveProjectName(doc.name)
                        } as Tenant);
                    });
                }

                setSubClients(clients);

                // Calculate base metrics (usage and billing from tenant docs)
                const baseMetrics = calculateMetrics(clients);
                const alerts = detectAlerts(clients);
                const renewals = calculateRenewals(clients);

                setAggregatedMetrics(prev => ({
                    ...prev,
                    ...baseMetrics,
                    activeSubClients: clients.filter(c => c.status === 'active').length,
                }));
                setResourceAlerts(alerts);
                setUpcomingRenewals(renewals);

            } catch (err: any) {
                if (!isMounted) return;
                console.error('Error fetching sub-clients:', err);
                setError(err as Error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchSubClients();

        const channelId = `tenants_${agencyTenantId}_${Math.random().toString(36).substring(2, 9)}`;
        const subscription = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tenants', filter: `owner_tenant_id=eq.${agencyTenantId}` },
                () => {
                    if (isMounted) fetchSubClients();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(subscription);
        };
    }, [agencyTenantId, calculateMetrics, detectAlerts, calculateRenewals]);

    // Aggregate Leads and Revenue (Async)
    useEffect(() => {
        if (subClients.length === 0) return;

        let isMounted = true;

        const aggregateAsyncMetrics = async () => {
            try {
                const clientIds = subClients.map(c => c.id);
                // Supabase 'in' filter limit might apply, but generally it supports many items.
                // We'll chunk to be safe, e.g., max 50 items per query
                const chunks = [];
                for (let i = 0; i < clientIds.length; i += 50) {
                    chunks.push(clientIds.slice(i, i + 50));
                }

                let totalLeads = 0;
                let totalRevenue = 0;

                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

                for (const chunk of chunks) {
                    // Fetch Leads count
                    const { count: leadsCount, error: leadsError } = await supabase
                        .from('leads')
                        .select('*', { count: 'exact', head: true })
                        .in('tenant_id', chunk)
                        .gte('created_at', startOfMonth);

                    if (!leadsError && leadsCount !== null) {
                        totalLeads += leadsCount;
                    }

                    // Fetch Revenue (Orders)
                    const { data: ordersData, error: ordersError } = await supabase
                        .from('orders')
                        .select('total')
                        .in('tenant_id', chunk)
                        .in('status', ['paid', 'completed'])
                        .gte('created_at', startOfMonth);

                    if (!ordersError && ordersData) {
                        ordersData.forEach(doc => {
                            totalRevenue += (doc.total || 0);
                        });
                    }
                }

                if (isMounted) {
                    setAggregatedMetrics(prev => ({
                        ...prev,
                        totalLeads,
                        totalRevenue,
                    }));
                }
            } catch (err) {
                if (!isMounted) return;
                console.error('Error aggregating async agency metrics:', err);
            }
        };

        aggregateAsyncMetrics();
        // Refresh every 5 minutes
        const interval = setInterval(aggregateAsyncMetrics, 5 * 60 * 1000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [subClients]);

    // Fetch recent activity
    useEffect(() => {
        if (!agencyTenantId) return;

        let isMounted = true;

        const fetchActivity = async () => {
            try {
                const { data, error } = await supabase
                    .from('agency_activity')
                    .select('*')
                    .eq('agency_tenant_id', agencyTenantId)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (!isMounted) return;

                if (error) throw error;

                const activities: ActivityEvent[] = [];

                if (data) {
                    data.forEach((doc: any) => {
                        activities.push({
                            id: doc.id,
                            type: doc.type,
                            clientId: doc.client_tenant_id || doc.clientTenantId,
                            clientName: resolveProjectName(doc.client_name || doc.clientName),
                            description: doc.description || getActivityDescription(doc),
                            timestamp: new Date(doc.created_at || doc.timestamp),
                            userId: doc.created_by || doc.createdBy,
                            userName: doc.created_by_name || doc.createdByName,
                            metadata: doc.metadata,
                        });
                    });
                }

                setRecentActivity(activities);
            } catch (err: any) {
                if (!isMounted) return;
                // Suppress permission errors silently (expected for non-agency users)
                if (err?.code !== '42501') { // 42501 is Postgres Insufficient Privilege
                    console.warn('Error fetching activity:', err);
                }
            }
        };

        fetchActivity();

        // Refresh activity every 30 seconds
        const interval = setInterval(fetchActivity, 30000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [agencyTenantId]);

    // Get client metrics summary
    const getClientMetrics = useCallback((clientId: string): ClientMetricsSummary | null => {
        const client = subClients.find(c => c.id === clientId);
        if (!client) return null;

        const usage = client.usage || {
            projectCount: 0,
            userCount: 0,
            storageUsedGB: 0,
            aiCreditsUsed: 0,
        };

        const limits = client.limits;

        const usagePercentages = {
            projects: limits?.maxProjects > 0 ? (usage.projectCount / limits.maxProjects) * 100 : 0,
            storage: limits?.maxStorageGB > 0 ? (usage.storageUsedGB / limits.maxStorageGB) * 100 : 0,
            aiCredits: limits?.maxAiCredits > 0 ? (usage.aiCreditsUsed / limits.maxAiCredits) * 100 : 0,
            users: limits?.maxUsers > 0 ? (usage.userCount / limits.maxUsers) * 100 : 0,
        };

        const clientAlerts = resourceAlerts.filter(alert => alert.clientId === clientId);

        let lastActiveAt: Date | undefined;
        if (client.lastActiveAt) {
            lastActiveAt = typeof client.lastActiveAt === 'string' 
                ? new Date(client.lastActiveAt) 
                : new Date((client.lastActiveAt as any).seconds * 1000);
        }

        return {
            clientId: client.id,
            clientName: client.name,
            status: client.status,
            subscriptionPlan: client.subscriptionPlan,
            usage,
            limits,
            usagePercentages,
            alerts: clientAlerts,
            lastActiveAt,
            mrr: client.billing?.mrr,
        };
    }, [subClients, resourceAlerts]);

    // Manual refresh
    const refreshMetrics = useCallback(async () => {
        // Since we decoupled the main query to a useEffect with local state update
        // We could just trigger a state change, but usually realtime handles this.
        return Promise.resolve();
    }, []);

    return {
        // Data
        subClients,
        aggregatedMetrics,
        resourceAlerts,
        upcomingRenewals,
        recentActivity,

        // State
        loading,
        error,

        // Functions
        getClientMetrics,
        refreshMetrics,
    };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getActivityDescription(data: any): string {
    switch (data.type) {
        case 'client_created':
            return `Nuevo cliente creado: ${data.client_name || data.clientName}`;
        case 'client_updated':
            return `Cliente actualizado: ${data.client_name || data.clientName}`;
        case 'report_generated':
            return `Reporte generado para ${data.client_name || data.clientName || 'múltiples clientes'}`;
        case 'payment_received':
            return `Pago recibido de ${data.client_name || data.clientName}`;
        case 'project_created':
            return `Nuevo proyecto creado en ${data.client_name || data.clientName}`;
        case 'project_published':
            return `Proyecto publicado en ${data.client_name || data.clientName}`;
        default:
            return 'Actividad registrada';
    }
}
