import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

export interface PortalActivity {
    id: string;
    agencyTenantId?: string | null;
    clientTenantId?: string | null;
    projectId?: string | null;
    type: string;
    title: string;
    description?: string | null;
    metadata: Record<string, unknown>;
    createdBy?: string | null;
    createdAt: string;
}

export interface PortalPerformanceSummary {
    totalRevenue: number;
    totalOrders: number;
    totalVisits: number;
    totalMrr: number;
    latestReportAt?: string | null;
}

const emptySummary: PortalPerformanceSummary = {
    totalRevenue: 0,
    totalOrders: 0,
    totalVisits: 0,
    totalMrr: 0,
    latestReportAt: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseJsonObject(value: unknown): Record<string, unknown> {
    if (isRecord(value)) return value;
    if (typeof value !== 'string' || !value.trim()) return {};

    try {
        const parsed = JSON.parse(value);
        return isRecord(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function readNumber(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function mapSummary(row: any): PortalPerformanceSummary {
    const data = parseJsonObject(row?.data);
    const summary = parseJsonObject(data.summary);

    return {
        totalRevenue: readNumber(summary.totalRevenue),
        totalOrders: readNumber(summary.totalOrders),
        totalVisits: readNumber(summary.totalVisits),
        totalMrr: readNumber(summary.totalMrr),
        latestReportAt: row?.created_at || null,
    };
}

function mapActivity(row: any): PortalActivity {
    const title = String(row.title || row.type || 'Activity');

    return {
        id: row.id,
        agencyTenantId: row.agency_tenant_id,
        clientTenantId: row.client_tenant_id,
        projectId: row.project_id,
        type: row.type || 'activity',
        title,
        description: row.description,
        metadata: parseJsonObject(row.metadata),
        createdBy: row.created_by,
        createdAt: row.created_at,
    };
}

export function usePortalOperations(clientTenantId?: string | null) {
    const [activities, setActivities] = useState<PortalActivity[]>([]);
    const [summary, setSummary] = useState<PortalPerformanceSummary>(emptySummary);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOperations = useCallback(async () => {
        if (!clientTenantId) {
            setActivities([]);
            setSummary(emptySummary);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const [activityResult, reportResult] = await Promise.all([
                supabase
                    .from('agency_activity')
                    .select('id,agency_tenant_id,client_tenant_id,project_id,type,title,description,metadata,created_by,created_at')
                    .eq('client_tenant_id', clientTenantId)
                    .order('created_at', { ascending: false })
                    .limit(10),
                supabase
                    .from('agency_reports')
                    .select('id,client_tenant_id,status,created_at,data')
                    .eq('client_tenant_id', clientTenantId)
                    .in('status', ['sent', 'published'])
                    .order('created_at', { ascending: false })
                    .limit(1),
            ]);

            if (activityResult.error) throw activityResult.error;
            if (reportResult.error) throw reportResult.error;

            setActivities((activityResult.data || []).map(mapActivity));
            setSummary(reportResult.data?.[0] ? mapSummary(reportResult.data[0]) : emptySummary);
        } catch (err: any) {
            setActivities([]);
            setSummary(emptySummary);
            setError(err?.message || 'Could not load portal operations');
        } finally {
            setIsLoading(false);
        }
    }, [clientTenantId]);

    useEffect(() => {
        fetchOperations();
    }, [fetchOperations]);

    const recentActivities = useMemo(() => activities.slice(0, 6), [activities]);

    return {
        activities,
        recentActivities,
        summary,
        isLoading,
        error,
        fetchOperations,
    };
}
