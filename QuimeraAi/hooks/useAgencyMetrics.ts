/**
 * useAgencyMetrics Hook
 * Hook for fetching and monitoring agency-level metrics
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import type { Tenant, TenantUsage, TenantStatus } from '../types/multiTenant';
import { resolveProjectName } from '../utils/resolveProjectName';
import {
    fetchAgencyFinanceMetrics,
    getEmptyAgencyFinanceMetrics,
    readClientMrr,
    type AgencyFinancialMetrics,
} from '../services/agency/agencyUsageLedgerService';

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
    invalidLimit?: boolean;
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
    agencyFinance: AgencyFinancialMetrics;
    agencyOperatingSystem: AgencyOperatingSystemMetrics;
}

export type { AgencyFinancialMetrics } from '../services/agency/agencyUsageLedgerService';

export interface AgencyOperatingSystemMetrics {
    clientsWithOperatingSystem: number;
    activeModuleSlots: number;
    totalModuleSlots: number;
    moduleReadinessRate: number;
    enabledClient360ModuleIds: string[];
    generatedModuleIds: string[];
}

export interface ActivityEvent {
    id: string;
    type: 'client_created' | 'client_updated' | 'report_generated' | 'payment_received' | 'project_created' | 'project_published' | 'project_transferred' | 'approval_responded';
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

function parseJsonField<T>(value: T | string | null | undefined, fallback: T): T {
    if (!value) return fallback;
    if (typeof value !== 'string') return value as T;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}

function mapTenantRow(row: any): Tenant {
    const agencyRelationship = row.agency_relationship || {};
    const agencyMetadata = parseJsonField(agencyRelationship.metadata, {} as Record<string, unknown>);
    return {
        id: row.id,
        name: resolveProjectName(row.name),
        slug: row.slug,
        email: row.email,
        companyName: row.company_name,
        type: row.type,
        ownerUserId: row.owner_user_id,
        ownerTenantId: row.owner_tenant_id,
        memberUserIds: row.member_user_ids || [],
        projectIds: row.project_ids || [],
        subscriptionPlan: row.subscription_plan,
        status: row.status,
        limits: parseJsonField(row.limits, {} as Tenant['limits']),
        usage: parseJsonField(row.usage, {
            projectCount: 0,
            userCount: 0,
            storageUsedGB: 0,
            aiCreditsUsed: 0,
        }),
        branding: parseJsonField(row.branding, {} as Tenant['branding']),
        settings: parseJsonField(row.settings, {} as Tenant['settings']),
        billing: parseJsonField(row.billing, {} as Tenant['billing']),
        agencyTenantId: agencyRelationship.agency_tenant_id || row.owner_tenant_id,
        agencyPlanId: agencyRelationship.agency_plan_id || undefined,
        agencyBillingMode: agencyRelationship.billing_mode || undefined,
        agencyLifecycleStage: agencyRelationship.lifecycle_stage || agencyRelationship.status || undefined,
        agencyOnboardingStatus: agencyRelationship.onboarding_status || undefined,
        agencyClientMetadata: agencyMetadata,
        agencyOperatingSystem: agencyMetadata.agencyOperatingSystem || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastActiveAt: row.last_active_at,
    } as Tenant;
}

function isMissingAgencyRelationshipTable(error: unknown): boolean {
    const err = error as { code?: string; message?: string } | null;
    const message = String(err?.message || '').toLowerCase();
    return err?.code === '42P01' ||
        err?.code === 'PGRST205' ||
        message.includes('agency_clients') ||
        message.includes('could not find the table');
}

async function fetchTenantRowsByIds(clientIds: string[]): Promise<any[]> {
    const uniqueIds = Array.from(new Set(clientIds.filter(Boolean)));
    const rows: any[] = [];

    for (let i = 0; i < uniqueIds.length; i += 50) {
        const chunk = uniqueIds.slice(i, i + 50);
        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .in('id', chunk)
            .in('status', ['active', 'trial', 'suspended']);

        if (error) throw error;
        rows.push(...(data || []));
    }

    return rows;
}

async function fetchAgencyClientTenantRows(agencyTenantId: string): Promise<any[]> {
    const tenantsById = new Map<string, any>();
    const relationshipsByClientId = new Map<string, any>();

    const { data: relationships, error: relationshipError } = await supabase
        .from('agency_clients')
        .select('agency_tenant_id,client_tenant_id,agency_plan_id,billing_mode,onboarding_status,status,lifecycle_stage,metadata,updated_at')
        .eq('agency_tenant_id', agencyTenantId);

    if (relationshipError && !isMissingAgencyRelationshipTable(relationshipError)) {
        throw relationshipError;
    }

    if (!relationshipError && relationships?.length) {
        const canonicalClientIds = relationships
            .map(row => {
                if (row.client_tenant_id) relationshipsByClientId.set(row.client_tenant_id, row);
                return row.client_tenant_id;
            })
            .filter(Boolean);
        const canonicalRows = await fetchTenantRowsByIds(canonicalClientIds);
        canonicalRows.forEach(row => {
            const relationship = relationshipsByClientId.get(row.id);
            tenantsById.set(row.id, relationship ? { ...row, agency_relationship: relationship } : row);
        });
    }

    const { data: legacyRows, error: legacyError } = await supabase
        .from('tenants')
        .select('*')
        .eq('owner_tenant_id', agencyTenantId)
        .in('status', ['active', 'trial', 'suspended']);

    if (legacyError) throw legacyError;
    (legacyRows || []).forEach(row => {
        if (!tenantsById.has(row.id)) tenantsById.set(row.id, row);
    });

    return Array.from(tenantsById.values());
}

function isValidPositiveLimit(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function readOrderTotal(order: any): number {
    const data = typeof order.data === 'string' ? parseJsonField(order.data, {}) : (order.data || {});
    const pricing = typeof order.pricing === 'string'
        ? parseJsonField(order.pricing, {})
        : (order.pricing || (typeof data.pricing === 'object' ? data.pricing : {}));
    const values = [
        order.total_amount,
        order.total,
        order.amount_total,
        data.total_amount,
        data.totalAmount,
        data.total,
        pricing.total_amount,
        pricing.totalAmount,
        pricing.total,
    ];
    let fallback = 0;

    for (const value of values) {
        if (value === null || value === undefined || value === '') continue;
        const total = Number(value);
        if (!Number.isFinite(total)) continue;
        if (total > 0) return total;
        fallback = total;
    }

    return fallback;
}

function readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(
        value
            .map(item => String(item || '').trim())
            .filter(Boolean),
    ));
}

function readClientAgencyOperatingSystem(client: Tenant): Record<string, any> | null {
    const candidate = client.agencyOperatingSystem || client.agencyClientMetadata?.agencyOperatingSystem;
    return candidate && typeof candidate === 'object' ? candidate as Record<string, any> : null;
}

function calculateAgencyOperatingSystemMetrics(clients: Tenant[]): AgencyOperatingSystemMetrics {
    let clientsWithOperatingSystem = 0;
    let activeModuleSlots = 0;
    let totalModuleSlots = 0;
    const enabledClient360ModuleIds = new Set<string>();
    const generatedModuleIds = new Set<string>();

    clients.forEach(client => {
        const agencyOperatingSystem = readClientAgencyOperatingSystem(client);
        if (!agencyOperatingSystem) return;

        clientsWithOperatingSystem += 1;
        const enabledModules = readStringArray(agencyOperatingSystem.enabledClient360ModuleIds);
        const totalModules = readStringArray(agencyOperatingSystem.client360ModuleIds);
        const generatedModules = readStringArray(agencyOperatingSystem.generatedModuleIds);
        const client360Rows = Array.isArray(agencyOperatingSystem.client360Modules)
            ? agencyOperatingSystem.client360Modules
            : [];
        const totalFromRows = readStringArray(client360Rows.map((row: Record<string, unknown>) => row?.id));
        const totalForClient = totalModules.length > 0 ? totalModules : totalFromRows;

        activeModuleSlots += enabledModules.length;
        totalModuleSlots += totalForClient.length > 0 ? totalForClient.length : enabledModules.length;
        enabledModules.forEach(moduleId => enabledClient360ModuleIds.add(moduleId));
        generatedModules.forEach(moduleId => generatedModuleIds.add(moduleId));
    });

    return {
        clientsWithOperatingSystem,
        activeModuleSlots,
        totalModuleSlots,
        moduleReadinessRate: totalModuleSlots > 0 ? Math.round((activeModuleSlots / totalModuleSlots) * 100) : 0,
        enabledClient360ModuleIds: Array.from(enabledClient360ModuleIds).sort(),
        generatedModuleIds: Array.from(generatedModuleIds).sort(),
    };
}

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
        agencyFinance: getEmptyAgencyFinanceMetrics(),
        agencyOperatingSystem: {
            clientsWithOperatingSystem: 0,
            activeModuleSlots: 0,
            totalModuleSlots: 0,
            moduleReadinessRate: 0,
            enabledClient360ModuleIds: [],
            generatedModuleIds: [],
        },
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
            agencyFinance: getEmptyAgencyFinanceMetrics(),
            agencyOperatingSystem: calculateAgencyOperatingSystemMetrics(clients),
        };

        clients.forEach(client => {
            if (client.usage) {
                metrics.totalProjects += client.usage.projectCount || 0;
                metrics.totalUsers += client.usage.userCount || 0;
                metrics.storageUsedGB += client.usage.storageUsedGB || 0;
                metrics.aiCreditsUsed += client.usage.aiCreditsUsed || 0;
            }

            metrics.mrr += readClientMrr(client);
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
                if (!isValidPositiveLimit(check.limit)) {
                    alerts.push({
                        id: `${client.id}-${check.resource}-invalid-limit`,
                        clientId: client.id,
                        clientName: client.name,
                        resource: check.resource,
                        usage: check.usage,
                        limit: Number.isFinite(check.limit) ? check.limit : 0,
                        percentage: 100,
                        severity: 'critical',
                        invalidLimit: true,
                    });
                    return;
                }

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
                // Handle both Supabase timestamps and ISO strings
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
                const data = await fetchAgencyClientTenantRows(agencyTenantId);
                if (!isMounted) return;

                const clients: Tenant[] = [];
                data.forEach((doc: any) => {
                    clients.push(mapTenantRow(doc));
                });

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
                { event: '*', schema: 'public', table: 'agency_clients', filter: `agency_tenant_id=eq.${agencyTenantId}` },
                () => {
                    if (isMounted) fetchSubClients();
                }
            )
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
                const { data: projectsData, error: projectsError } = await supabase
                    .from('projects')
                    .select('id,tenant_id')
                    .in('tenant_id', clientIds)
                    .eq('is_archived', false);

                if (projectsError) {
                    throw projectsError;
                }

                const projectIds = (projectsData || []).map(project => project.id).filter(Boolean);
                // Supabase 'in' filter limit might apply, but generally it supports many items.
                // We'll chunk to be safe, e.g., max 50 items per query
                const chunks: string[][] = [];
                for (let i = 0; i < clientIds.length; i += 50) {
                    chunks.push(clientIds.slice(i, i + 50));
                }
                const projectChunks: string[][] = [];
                for (let i = 0; i < projectIds.length; i += 50) {
                    projectChunks.push(projectIds.slice(i, i + 50));
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

                }

                for (const chunk of projectChunks) {
                    const { data: ordersData, error: ordersError } = await supabase
                        .from('store_orders')
                        .select('*')
                        .in('project_id', chunk)
                        .or('payment_status.eq.paid,status.eq.paid,status.eq.completed')
                        .gte('created_at', startOfMonth);

                    if (!ordersError && ordersData) {
                        ordersData.forEach(order => {
                            totalRevenue += readOrderTotal(order);
                        });
                    } else if (ordersError) {
                        console.warn('Error aggregating agency revenue from store_orders:', ordersError);
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

    // Fetch production billing and margin controls
    useEffect(() => {
        if (!agencyTenantId) return;

        let isMounted = true;

        const fetchAgencyFinance = async () => {
            try {
                const finance = await fetchAgencyFinanceMetrics(supabase, agencyTenantId, subClients);

                if (isMounted) {
                    setAggregatedMetrics(prev => ({
                        ...prev,
                        agencyFinance: finance,
                    }));
                }
            } catch (err) {
                if (!isMounted) return;
                console.warn('Error fetching agency finance metrics:', err);
            }
        };

        fetchAgencyFinance();
        const interval = setInterval(fetchAgencyFinance, 5 * 60 * 1000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [agencyTenantId, subClients]);

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
            projects: isValidPositiveLimit(limits?.maxProjects) ? (usage.projectCount / limits.maxProjects) * 100 : 100,
            storage: isValidPositiveLimit(limits?.maxStorageGB) ? (usage.storageUsedGB / limits.maxStorageGB) * 100 : 100,
            aiCredits: isValidPositiveLimit(limits?.maxAiCredits) ? (usage.aiCreditsUsed / limits.maxAiCredits) * 100 : 100,
            users: isValidPositiveLimit(limits?.maxUsers) ? (usage.userCount / limits.maxUsers) * 100 : 100,
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
            mrr: readClientMrr(client),
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
        case 'project_transferred':
            return `Proyecto transferido a ${data.client_name || data.clientName || 'cliente'}`;
        case 'approval_responded':
            return `Aprobación respondida por ${data.client_name || data.clientName || 'cliente'}`;
        default:
            return 'Actividad registrada';
    }
}
