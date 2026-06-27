import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

export type PortalReportStatus = 'sent' | 'published';

export interface PortalReportSummary {
    totalClients: number;
    totalLeads: number;
    totalRevenue: number;
    totalOrders: number;
    totalMrr: number;
    totalVisits: number;
}

export interface PortalReport {
    id: string;
    agencyTenantId: string;
    clientTenantId: string;
    reportType: string;
    periodStart?: string | null;
    periodEnd?: string | null;
    status: PortalReportStatus;
    aiSummary?: string | null;
    createdAt: string;
    data: Record<string, unknown>;
    summary: PortalReportSummary;
    recommendations: string[];
}

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

function readSummary(data: Record<string, unknown>): PortalReportSummary {
    const summary = parseJsonObject(data.summary);

    return {
        totalClients: readNumber(summary.totalClients),
        totalLeads: readNumber(summary.totalLeads),
        totalRevenue: readNumber(summary.totalRevenue),
        totalOrders: readNumber(summary.totalOrders),
        totalMrr: readNumber(summary.totalMrr),
        totalVisits: readNumber(summary.totalVisits),
    };
}

function readRecommendations(data: Record<string, unknown>): string[] {
    return Array.isArray(data.recommendations)
        ? data.recommendations.map((item) => String(item)).filter(Boolean)
        : [];
}

function mapReport(row: any): PortalReport {
    const data = parseJsonObject(row.data);

    return {
        id: row.id,
        agencyTenantId: row.agency_tenant_id,
        clientTenantId: row.client_tenant_id,
        reportType: row.report_type || 'performance',
        periodStart: row.period_start,
        periodEnd: row.period_end,
        status: row.status === 'published' ? 'published' : 'sent',
        aiSummary: row.ai_summary || (typeof data.aiSummary === 'string' ? data.aiSummary : null),
        createdAt: row.created_at,
        data,
        summary: readSummary(data),
        recommendations: readRecommendations(data),
    };
}

export function usePortalReports(clientTenantId?: string | null) {
    const [reports, setReports] = useState<PortalReport[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReports = useCallback(async () => {
        if (!clientTenantId) {
            setReports([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('agency_reports')
                .select('id,agency_tenant_id,client_tenant_id,report_type,period_start,period_end,status,ai_summary,created_at,data')
                .eq('client_tenant_id', clientTenantId)
                .in('status', ['sent', 'published'])
                .order('created_at', { ascending: false })
                .limit(12);

            if (fetchError) throw fetchError;
            setReports((data || []).map(mapReport));
        } catch (err: any) {
            setError(err?.message || 'Could not load reports');
            setReports([]);
        } finally {
            setIsLoading(false);
        }
    }, [clientTenantId]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const latestReport = useMemo(() => reports[0] || null, [reports]);

    return {
        reports,
        latestReport,
        isLoading,
        error,
        fetchReports,
    };
}
