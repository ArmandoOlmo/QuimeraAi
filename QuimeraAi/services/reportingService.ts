/**
 * ReportingService
 * Service for aggregating data from multiple clients and generating reports
 */

import { supabase } from '../supabase';
import type { Tenant, TenantUsage } from '../types/multiTenant';
import type {
    ReportMetric,
    ReportDateRange,
    AggregatedReportData,
    ClientMetrics,
    ReportTemplate,
    AgencyReportModuleReadiness,
} from '../types/reports';

type JsonRecord = Record<string, any>;

interface AgencyClientRelationship {
    servicePlanId?: string;
    servicePlanName?: string;
    lifecycleStage?: string;
    billingMode?: string;
    billingStatus?: string;
    healthScore?: number;
    onboardingStatus?: string;
    projectCount?: number;
    primaryProjectId?: string;
    agencyOperatingSystem?: JsonRecord | null;
    enabledClient360ModuleIds?: string[];
    generatedModuleIds?: string[];
    activeClient360ModuleSlots?: number;
    totalClient360ModuleSlots?: number;
    moduleReadinessRate?: number;
}

interface GenerateAgencyReportInput {
    agencyTenantId: string;
    clientIds: string[];
    dateRange: ReportDateRange;
    metrics: ReportMetric[];
    template: ReportTemplate;
    generatedBy?: string | null;
    includeTrends?: boolean;
    includeRecommendations?: boolean;
    persist?: boolean;
    publishToClientPortal?: boolean;
}

interface PersistAgencyReportInput {
    agencyTenantId: string;
    data: AggregatedReportData;
    template: ReportTemplate;
    generatedBy?: string | null;
    status?: 'draft' | 'sent' | 'published';
    includeTrends?: boolean;
    includeRecommendations?: boolean;
    publishToClientPortal?: boolean;
}

interface PersistAgencyReportResult {
    reportId?: string;
    status: 'saved' | 'failed';
    error?: string;
}

function isRecord(value: unknown): value is JsonRecord {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseJsonObject(value: unknown): JsonRecord {
    if (isRecord(value)) return value;
    if (typeof value !== 'string' || value.trim().length === 0) return {};
    try {
        const parsed = JSON.parse(value);
        return isRecord(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function readFiniteNumber(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function readMoneyAmount(...values: unknown[]): number {
    let finiteFallback: number | null = null;

    for (const value of values) {
        if (value === null || value === undefined || value === '') continue;
        const number = Number(value);
        if (!Number.isFinite(number)) continue;
        if (number > 0) return number;
        if (finiteFallback === null) finiteFallback = number;
    }

    return finiteFallback ?? 0;
}

function readPositiveNumber(...values: unknown[]): number {
    for (const value of values) {
        const number = readFiniteNumber(value);
        if (number > 0) return number;
    }
    return 0;
}

function readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(
        value
            .map(item => String(item || '').trim())
            .filter(Boolean)
    ));
}

function readAgencyOperatingSystemStats(value: unknown) {
    const agencyOperatingSystem = parseJsonObject(value);

    if (Object.keys(agencyOperatingSystem).length === 0) {
        return {
            agencyOperatingSystem: null,
            enabledClient360ModuleIds: [],
            generatedModuleIds: [],
            activeClient360ModuleSlots: 0,
            totalClient360ModuleSlots: 0,
            moduleReadinessRate: 0,
        };
    }

    const enabledClient360ModuleIds = readStringArray(agencyOperatingSystem.enabledClient360ModuleIds);
    const generatedModuleIds = readStringArray(agencyOperatingSystem.generatedModuleIds);
    const totalModuleIds = readStringArray(agencyOperatingSystem.client360ModuleIds);
    const client360Rows = Array.isArray(agencyOperatingSystem.client360Modules)
        ? agencyOperatingSystem.client360Modules
        : [];
    const totalFromRows = readStringArray(
        client360Rows.map(row => isRecord(row) ? row.id : null)
    );
    const totalForClient = totalModuleIds.length > 0 ? totalModuleIds : totalFromRows;
    const totalClient360ModuleSlots = totalForClient.length > 0
        ? totalForClient.length
        : enabledClient360ModuleIds.length;

    return {
        agencyOperatingSystem,
        enabledClient360ModuleIds,
        generatedModuleIds,
        activeClient360ModuleSlots: enabledClient360ModuleIds.length,
        totalClient360ModuleSlots,
        moduleReadinessRate: totalClient360ModuleSlots > 0
            ? Math.round((enabledClient360ModuleIds.length / totalClient360ModuleSlots) * 100)
            : 0,
    };
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
            .in('id', chunk);

        if (error) throw error;
        rows.push(...(data || []));
    }

    return rows;
}

async function fetchAgencyClientTenantRows(
    agencyTenantId: string,
    clientIds: string[]
): Promise<any[]> {
    const tenantsById = new Map<string, any>();
    let relationshipQuery = supabase
        .from('agency_clients')
        .select('client_tenant_id')
        .eq('agency_tenant_id', agencyTenantId);

    if (clientIds.length > 0) {
        relationshipQuery = relationshipQuery.in('client_tenant_id', clientIds);
    }

    const { data: relationships, error: relationshipError } = await relationshipQuery;

    if (relationshipError && !isMissingAgencyRelationshipTable(relationshipError)) {
        throw relationshipError;
    }

    if (!relationshipError && relationships?.length) {
        const canonicalClientIds = relationships
            .map(row => row.client_tenant_id)
            .filter(Boolean);
        const canonicalRows = await fetchTenantRowsByIds(canonicalClientIds);
        canonicalRows.forEach(row => tenantsById.set(row.id, row));
    }

    let legacyQuery = supabase
        .from('tenants')
        .select('*')
        .eq('owner_tenant_id', agencyTenantId);

    if (clientIds.length > 0) {
        legacyQuery = legacyQuery.in('id', clientIds);
    }

    const { data: legacyRows, error: legacyError } = await legacyQuery;
    if (legacyError) throw legacyError;
    (legacyRows || []).forEach(row => tenantsById.set(row.id, row));

    return Array.from(tenantsById.values());
}

function formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function readCanonicalOrderTotal(order: unknown): number {
    const row = isRecord(order) ? order : {};
    const data = parseJsonObject(row.data);
    const pricing = parseJsonObject(row.pricing ?? data.pricing);
    return readMoneyAmount(
        row.total_amount,
        row.total,
        row.amount_total,
        data.total_amount,
        data.totalAmount,
        data.amount_total,
        data.total,
        pricing.total_amount,
        pricing.totalAmount,
        pricing.amount_total,
        pricing.total,
        pricing.grandTotal,
    );
}

export function readClientMonthlyRecurringRevenue(client: Pick<Tenant, 'billing' | 'billingInfo'>): number {
    return readPositiveNumber(
        client.billing?.mrr,
        client.billing?.monthlyPrice,
        client.billingInfo?.mrr,
    );
}

export function calculateAgencyModuleReadiness(clientMetrics: ClientMetrics[]): AgencyReportModuleReadiness {
    let clientsWithAgencyOperatingSystem = 0;
    let activeModuleSlots = 0;
    let totalModuleSlots = 0;
    const enabledClient360ModuleIds = new Set<string>();
    const generatedModuleIds = new Set<string>();

    clientMetrics.forEach(client => {
        if (!client.agencyOperatingSystem) return;

        clientsWithAgencyOperatingSystem += 1;
        activeModuleSlots += readFiniteNumber(client.activeClient360ModuleSlots);
        totalModuleSlots += readFiniteNumber(client.totalClient360ModuleSlots);
        (client.enabledClient360ModuleIds || []).forEach(moduleId => enabledClient360ModuleIds.add(moduleId));
        (client.generatedModuleIds || []).forEach(moduleId => generatedModuleIds.add(moduleId));
    });

    return {
        clientsWithAgencyOperatingSystem,
        activeModuleSlots,
        totalModuleSlots,
        moduleReadinessRate: totalModuleSlots > 0 ? Math.round((activeModuleSlots / totalModuleSlots) * 100) : 0,
        enabledClient360ModuleIds: Array.from(enabledClient360ModuleIds).sort(),
        generatedModuleIds: Array.from(generatedModuleIds).sort(),
    };
}

export function calculateAgencyReportSummary(clientMetrics: ClientMetrics[]): AggregatedReportData['summary'] {
    const totalOrders = clientMetrics.reduce((sum, client) => sum + client.totalOrders, 0);
    const totalRevenue = clientMetrics.reduce((sum, client) => sum + client.totalRevenue, 0);

    return {
        totalClients: clientMetrics.length,
        totalLeads: clientMetrics.reduce((sum, c) => sum + c.totalLeads, 0),
        totalRevenue,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        totalMrr: clientMetrics.reduce((sum, c) => sum + c.monthlyRecurringRevenue, 0),
        totalVisits: clientMetrics.reduce((sum, c) => sum + c.totalVisits, 0),
        totalEmailsSent: clientMetrics.reduce((sum, c) => sum + c.emailsSent, 0),
        avgConversionRate:
            clientMetrics.length > 0
                ? clientMetrics.reduce((sum, c) => sum + c.conversionRate, 0) /
                clientMetrics.length
                : 0,
        totalAiCreditsUsed: clientMetrics.reduce((sum, c) => sum + c.aiCreditsUsed, 0),
        totalStorageUsedGB: clientMetrics.reduce((sum, c) => sum + c.storageUsedGB, 0),
        moduleReadiness: calculateAgencyModuleReadiness(clientMetrics),
    };
}

export function buildAgencyReportAISummary(data: AggregatedReportData): string {
    const topClient = data.trends.topPerformingClients[0];
    const period = `${formatDateOnly(data.dateRange.start)} - ${formatDateOnly(data.dateRange.end)}`;
    const readiness = data.summary.moduleReadiness;
    const moduleReadiness = readiness.totalModuleSlots > 0
        ? ` Agency OS readiness ${readiness.moduleReadinessRate}% (${readiness.activeModuleSlots}/${readiness.totalModuleSlots} slots Client 360 activos).`
        : ' Agency OS readiness sin slots Client 360 registrados.';
    const base = `Reporte Agency Engine (${period}): ${data.summary.totalClients} clientes, ${data.summary.totalLeads} leads, ${data.summary.totalOrders} ordenes pagadas, $${Math.round(data.summary.totalRevenue).toLocaleString()} en revenue y $${Math.round(data.summary.totalMrr).toLocaleString()} en MRR administrado.${moduleReadiness}`;

    if (!topClient) {
        return `${base} No hay suficientes datos de revenue o leads para destacar un cliente principal.`;
    }

    return `${base} Cliente con mejor performance: ${topClient.clientName} con $${Math.round(topClient.value).toLocaleString()} en revenue atribuido.`;
}

export class ReportingService {
    async generateAgencyReport(input: GenerateAgencyReportInput): Promise<AggregatedReportData> {
        const publishRequested = input.publishToClientPortal === true;
        const canPublishToClientPortal = publishRequested && input.clientIds.length === 1;
        const reportStatus = canPublishToClientPortal ? 'sent' : 'draft';
        const data = await this.aggregateClientData(
            input.agencyTenantId,
            input.clientIds,
            input.dateRange,
            input.metrics,
            {
                includeTrends: input.includeTrends,
                includeRecommendations: input.includeRecommendations,
            }
        );

        const aiSummary = buildAgencyReportAISummary(data);
        const reportData: AggregatedReportData = {
            ...data,
            aiSummary,
            persistenceStatus: input.persist === false ? 'not_requested' : 'failed',
            portalPublicationStatus: publishRequested
                ? (canPublishToClientPortal ? 'failed' : 'not_eligible')
                : 'not_requested',
        };

        if (input.persist === false) {
            return reportData;
        }

        const persistence = await this.persistAgencyReport({
            agencyTenantId: input.agencyTenantId,
            data: reportData,
            template: input.template,
            generatedBy: input.generatedBy,
            includeTrends: input.includeTrends,
            includeRecommendations: input.includeRecommendations,
            status: reportStatus,
            publishToClientPortal: canPublishToClientPortal,
        });

        return {
            ...reportData,
            savedReportId: persistence.reportId,
            persistenceStatus: persistence.status,
            portalPublicationStatus: persistence.status === 'saved'
                ? (canPublishToClientPortal ? 'sent' : (publishRequested ? 'not_eligible' : 'not_requested'))
                : 'failed',
        };
    }

    /**
     * Aggregate data from multiple clients
     */
    async aggregateClientData(
        agencyTenantId: string,
        clientIds: string[],
        dateRange: ReportDateRange,
        metrics: ReportMetric[],
        options: {
            includeTrends?: boolean;
            includeRecommendations?: boolean;
        } = {}
    ): Promise<AggregatedReportData> {
        const clientsData = await fetchAgencyClientTenantRows(agencyTenantId, clientIds).catch(error => {
            console.error('[ReportingService] Error fetching clients:', error);
            return null;
        });
        if (!clientsData) return this.getEmptyReport(dateRange, clientIds, metrics);

        const clients: Tenant[] = (clientsData || []).map(doc => ({
            id: doc.id,
            name: doc.name,
            slug: doc.slug,
            email: doc.email,
            companyName: doc.company_name,
            type: doc.type,
            ownerUserId: doc.owner_user_id,
            ownerTenantId: doc.owner_tenant_id,
            domain: doc.domain,
            memberUserIds: doc.member_user_ids || [],
            projectIds: doc.project_ids || [],
            subscriptionPlan: doc.subscription_plan,
            status: doc.status,
            createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
            updatedAt: doc.updated_at ? new Date(doc.updated_at) : new Date(),
            settings: parseJsonObject(doc.settings),
            usage: {
                ...this.getDefaultUsage(),
                ...parseJsonObject(doc.usage),
            },
            limits: parseJsonObject(doc.limits),
            branding: parseJsonObject(doc.branding),
            billing: parseJsonObject(doc.billing),
            billingInfo: parseJsonObject(doc.billing_info),
            lastActiveAt: doc.last_active_at,
        } as Tenant));

        const relationships = await this.getAgencyClientRelationships(
            agencyTenantId,
            clients.map(client => client.id)
        );

        // Calculate metrics for each client
        const clientMetrics: ClientMetrics[] = [];
        for (const client of clients) {
            const metrics = await this.getClientMetrics(
                client,
                dateRange,
                options.includeTrends !== false,
                relationships.get(client.id)
            );
            clientMetrics.push(metrics);
        }

        // Calculate summary totals
        const summary = this.calculateSummary(clientMetrics);

        // Calculate trends
        const trends = options.includeTrends === false
            ? this.getEmptyTrends()
            : await this.calculateTrends(clientMetrics, dateRange);

        // Generate recommendations
        const recommendations = options.includeRecommendations === false
            ? []
            : this.generateRecommendations(clientMetrics, trends);

        return {
            summary,
            byClient: clientMetrics,
            trends,
            recommendations,
            aiSummary: buildAgencyReportAISummary({
                summary,
                byClient: clientMetrics,
                trends,
                recommendations,
                generatedAt: new Date(),
                dateRange,
                includedClients: clientIds,
                metrics,
            }),
            persistenceStatus: 'not_requested',
            generatedAt: new Date(),
            dateRange,
            includedClients: clientIds,
            metrics: metrics,
        };
    }

    private getEmptyReport(dateRange: ReportDateRange, clientIds: string[], metrics: ReportMetric[]): AggregatedReportData {
        return {
            summary: this.calculateSummary([]),
            byClient: [],
            trends: this.getEmptyTrends(),
            recommendations: ['No data available'],
            aiSummary: '',
            persistenceStatus: 'not_requested',
            generatedAt: new Date(),
            dateRange,
            includedClients: clientIds,
            metrics
        };
    }

    private getEmptyTrends(): AggregatedReportData['trends'] {
        return {
            topPerformingClients: [],
            underperformingClients: [],
            periodOverPeriodComparison: { leadsGrowth: 0, revenueGrowth: 0, trafficGrowth: 0 },
        };
    }

    private async getAgencyClientRelationships(
        agencyTenantId: string,
        clientIds: string[]
    ): Promise<Map<string, AgencyClientRelationship>> {
        const relationships = new Map<string, AgencyClientRelationship>();
        if (!agencyTenantId || clientIds.length === 0) return relationships;

        const { data, error } = await supabase
            .from('agency_clients')
            .select('client_tenant_id,agency_plan_id,billing_mode,lifecycle_stage,health_score,onboarding_status,project_count,primary_project_id,metadata')
            .eq('agency_tenant_id', agencyTenantId)
            .in('client_tenant_id', clientIds);

        if (error || !data?.length) {
            if (error) console.warn('[ReportingService] Error fetching agency relationships:', error);
            return relationships;
        }

        const planIds = Array.from(new Set(
            data.map(row => row.agency_plan_id).filter(Boolean)
        ));
        const planNames = new Map<string, string>();

        if (planIds.length > 0) {
            const { data: plans, error: plansError } = await supabase
                .from('agency_service_plans')
                .select('id,name')
                .in('id', planIds);

            if (plansError) {
                console.warn('[ReportingService] Error fetching agency service plans:', plansError);
            } else {
                (plans || []).forEach(plan => {
                    if (plan.id) planNames.set(plan.id, plan.name || plan.id);
                });
            }
        }

        data.forEach(row => {
            const metadata = parseJsonObject(row.metadata);
            const agencyOperatingSystemStats = readAgencyOperatingSystemStats(metadata.agencyOperatingSystem);
            relationships.set(row.client_tenant_id, {
                servicePlanId: row.agency_plan_id || metadata.agencyPlanId || metadata.effectivePlanId,
                servicePlanName: row.agency_plan_id ? planNames.get(row.agency_plan_id) : undefined,
                billingMode: row.billing_mode,
                lifecycleStage: row.lifecycle_stage,
                billingStatus: metadata.billingStatus || metadata.paymentStatus,
                healthScore: readFiniteNumber(row.health_score),
                onboardingStatus: row.onboarding_status,
                projectCount: readFiniteNumber(row.project_count),
                primaryProjectId: row.primary_project_id,
                agencyOperatingSystem: agencyOperatingSystemStats.agencyOperatingSystem,
                enabledClient360ModuleIds: agencyOperatingSystemStats.enabledClient360ModuleIds,
                generatedModuleIds: agencyOperatingSystemStats.generatedModuleIds,
                activeClient360ModuleSlots: agencyOperatingSystemStats.activeClient360ModuleSlots,
                totalClient360ModuleSlots: agencyOperatingSystemStats.totalClient360ModuleSlots,
                moduleReadinessRate: agencyOperatingSystemStats.moduleReadinessRate,
            });
        });

        return relationships;
    }

    async persistAgencyReport(input: PersistAgencyReportInput): Promise<PersistAgencyReportResult> {
        const reportPayload = this.serializeReportData(input.data, {
            template: input.template,
            includeTrends: input.includeTrends,
            includeRecommendations: input.includeRecommendations,
            reportStatus: input.status || 'draft',
            publishToClientPortal: input.publishToClientPortal === true,
        });
        const singleClientId = input.data.includedClients.length === 1 ? input.data.includedClients[0] : null;
        const generatedBy = input.generatedBy ?? (await this.getCurrentUserId());
        const reportStatus = input.status || 'draft';

        const { data, error } = await supabase
            .from('agency_reports')
            .insert({
                agency_tenant_id: input.agencyTenantId,
                client_tenant_id: singleClientId,
                report_type: input.template,
                period_start: formatDateOnly(input.data.dateRange.start),
                period_end: formatDateOnly(input.data.dateRange.end),
                data: reportPayload,
                ai_summary: input.data.aiSummary || buildAgencyReportAISummary(input.data),
                status: reportStatus,
                generated_by: generatedBy,
            })
            .select('id')
            .single();

        if (error) {
            console.warn('[ReportingService] Error persisting agency report:', error);
            return { status: 'failed', error: error.message || 'Unable to persist report' };
        }

        await this.logReportActivity({
            agencyTenantId: input.agencyTenantId,
            clientTenantId: singleClientId,
            reportId: data?.id,
            template: input.template,
            generatedBy,
            summary: input.data.summary,
            aiSummary: input.data.aiSummary || buildAgencyReportAISummary(input.data),
            reportStatus,
            publishToClientPortal: input.publishToClientPortal === true,
        });

        return { status: 'saved', reportId: data?.id };
    }

    private async getCurrentUserId(): Promise<string | null> {
        const { data } = await supabase.auth.getUser();
        return data.user?.id || null;
    }

    private serializeReportData(
        data: AggregatedReportData,
        options: {
            template: ReportTemplate;
            includeTrends?: boolean;
            includeRecommendations?: boolean;
            reportStatus?: 'draft' | 'sent' | 'published';
            publishToClientPortal?: boolean;
        }
    ) {
        const clientTenantId = data.includedClients.length === 1 ? data.includedClients[0] : null;
        const reportStatus = options.reportStatus || 'draft';
        return {
            schemaVersion: 1,
            source: 'agency_reporting_service',
            template: options.template,
            generatedAt: data.generatedAt.toISOString(),
            dateRange: {
                start: data.dateRange.start.toISOString(),
                end: data.dateRange.end.toISOString(),
            },
            includedClients: data.includedClients,
            metrics: data.metrics,
            options: {
                includeTrends: options.includeTrends !== false,
                includeRecommendations: options.includeRecommendations !== false,
            },
            clientPortal: {
                publishRequested: options.publishToClientPortal === true,
                visible: options.publishToClientPortal === true && Boolean(clientTenantId) && ['sent', 'published'].includes(reportStatus),
                status: reportStatus,
                clientTenantId,
                requiresSingleClient: true,
            },
            summary: data.summary,
            byClient: data.byClient,
            trends: data.trends,
            recommendations: data.recommendations,
            aiSummary: data.aiSummary,
        };
    }

    private async logReportActivity(input: {
        agencyTenantId: string;
        clientTenantId: string | null;
        reportId?: string;
        template: ReportTemplate;
        generatedBy: string | null;
        summary: AggregatedReportData['summary'];
        aiSummary: string;
        reportStatus: 'draft' | 'sent' | 'published';
        publishToClientPortal: boolean;
    }) {
        const { error } = await supabase
            .from('agency_activity')
            .insert({
                agency_tenant_id: input.agencyTenantId,
                client_tenant_id: input.clientTenantId,
                type: 'report_generated',
                title: 'Reporte Agency Engine generado',
                description: input.aiSummary,
                metadata: {
                    reportId: input.reportId,
                    template: input.template,
                    totalClients: input.summary.totalClients,
                    totalRevenue: input.summary.totalRevenue,
                    totalOrders: input.summary.totalOrders,
                    totalMrr: input.summary.totalMrr,
                    reportStatus: input.reportStatus,
                    clientPortalVisible: input.publishToClientPortal && input.reportStatus !== 'draft',
                    portalPublicationStatus: input.publishToClientPortal ? input.reportStatus : 'not_requested',
                    moduleReadinessRate: input.summary.moduleReadiness.moduleReadinessRate,
                    activeModuleSlots: input.summary.moduleReadiness.activeModuleSlots,
                    totalModuleSlots: input.summary.moduleReadiness.totalModuleSlots,
                    clientsWithAgencyOperatingSystem: input.summary.moduleReadiness.clientsWithAgencyOperatingSystem,
                },
                created_by: input.generatedBy,
            });

        if (error) {
            console.warn('[ReportingService] Error logging report activity:', error);
        }
    }

    /**
     * Get metrics for a single client
     */
    async getClientMetrics(
        client: Tenant,
        dateRange: ReportDateRange,
        includeTrends: boolean = true,
        relationship?: AgencyClientRelationship
    ): Promise<ClientMetrics> {
        // Get leads data
        const leadsData = await this.getLeadsMetrics(client.id, dateRange.start, dateRange.end);

        // Get traffic data
        const trafficData = await this.getTrafficMetrics(client.id, dateRange.start, dateRange.end);

        // Get sales data
        const salesData = await this.getSalesMetrics(client.id, dateRange.start, dateRange.end);

        // Get email data
        const emailData = await this.getEmailMetrics(client.id, dateRange.start, dateRange.end);

        // Get resource usage
        const usage = client.usage || this.getDefaultUsage();

        // Calculate trends (vs previous period) if requested
        let trends = {
            leadsChange: 0,
            visitsChange: 0,
            revenueChange: 0,
            emailPerformanceChange: 0,
        };

        if (includeTrends) {
            const previousDateRange = this.getPreviousPeriodRange(dateRange);
            const previousMetrics = await this.getClientMetrics(client, previousDateRange, false);

            trends = {
                leadsChange: this.calculatePercentageChange(leadsData.totalLeads, previousMetrics.totalLeads),
                visitsChange: this.calculatePercentageChange(trafficData.totalVisits, previousMetrics.totalVisits),
                revenueChange: this.calculatePercentageChange(salesData.totalRevenue, previousMetrics.totalRevenue),
                emailPerformanceChange: this.calculatePercentageChange(emailData.openRate, previousMetrics.openRate),
            };
        }

        return {
            clientId: client.id,
            clientName: client.name,
            subscriptionPlan: client.subscriptionPlan,
            servicePlanId: relationship?.servicePlanId,
            servicePlanName: relationship?.servicePlanName,
            lifecycleStage: relationship?.lifecycleStage,
            billingMode: relationship?.billingMode || client.billing?.mode,
            billingStatus: relationship?.billingStatus || (client.billing?.cancelAtPeriodEnd ? 'cancelling' : 'active'),
            monthlyRecurringRevenue: readClientMonthlyRecurringRevenue(client),
            healthScore: relationship?.healthScore,
            agencyOperatingSystem: relationship?.agencyOperatingSystem || null,
            enabledClient360ModuleIds: relationship?.enabledClient360ModuleIds || [],
            generatedModuleIds: relationship?.generatedModuleIds || [],
            activeClient360ModuleSlots: relationship?.activeClient360ModuleSlots || 0,
            totalClient360ModuleSlots: relationship?.totalClient360ModuleSlots || 0,
            moduleReadinessRate: relationship?.moduleReadinessRate || 0,
            ...leadsData,
            ...trafficData,
            ...salesData,
            ...emailData,
            aiCreditsUsed: usage.aiCreditsUsed || 0,
            storageUsedGB: usage.storageUsedGB || 0,
            activeUsers: usage.userCount || 0,
            activeProjects: salesData.activeProjectCount || relationship?.projectCount || usage.projectCount || 0,
            trends,
        };
    }

    /**
     * Get leads metrics for a client
     */
    private async getLeadsMetrics(
        tenantId: string,
        startDate: Date,
        endDate: Date
    ) {
        const { data: leads, error } = await supabase
            .from('leads')
            .select('status, source')
            .eq('tenant_id', tenantId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (error) {
            console.error('[ReportingService] Error fetching leads metrics:', error);
            return { totalLeads: 0, newLeads: 0, convertedLeads: 0, conversionRate: 0, leadsBySource: {} };
        }

        const totalLeads = leads.length;
        const newLeads = leads.filter((l) => l.status === 'new').length;
        const convertedLeads = leads.filter((l) => l.status === 'converted').length;
        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

        // Group by source
        const leadsBySource: Record<string, number> = {};
        leads.forEach((lead) => {
            const source = lead.source || 'unknown';
            leadsBySource[source] = (leadsBySource[source] || 0) + 1;
        });

        return {
            totalLeads,
            newLeads,
            convertedLeads,
            conversionRate,
            leadsBySource,
        };
    }

    /**
     * Get traffic metrics for a client
     */
    private async getTrafficMetrics(
        tenantId: string,
        startDate: Date,
        endDate: Date
    ) {
        // Assume an 'analytics' table will exist in Supabase
        const { data: sessions, error } = await supabase
            .from('analytics')
            .select('visitor_id, page_views, duration')
            .eq('tenant_id', tenantId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (error || !sessions) {
            return { totalVisits: 0, uniqueVisitors: 0, pageViews: 0, avgSessionDuration: 0, bounceRate: 0 };
        }

        const totalVisits = sessions.length;
        const uniqueVisitors = new Set(sessions.map((s) => s.visitor_id)).size;
        const pageViews = sessions.reduce((sum, s) => sum + (Number(s.page_views) || 1), 0);

        // Calculate average session duration
        const totalDuration = sessions.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
        const avgSessionDuration = totalVisits > 0 ? totalDuration / totalVisits : 0;

        // Calculate bounce rate
        const bounces = sessions.filter((s) => Number(s.page_views) === 1 && Number(s.duration) < 30).length;
        const bounceRate = totalVisits > 0 ? (bounces / totalVisits) * 100 : 0;

        return {
            totalVisits,
            uniqueVisitors,
            pageViews,
            avgSessionDuration,
            bounceRate,
        };
    }

    /**
     * Get sales metrics for a client
     */
    private readOrderTotal(order: any): number {
        return readCanonicalOrderTotal(order);
    }

    private async getSalesMetrics(
        tenantId: string,
        startDate: Date,
        endDate: Date
    ) {
        const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('is_archived', false);

        if (projectsError || !projects?.length) {
            return {
                totalRevenue: 0,
                totalOrders: 0,
                averageOrderValue: 0,
                conversionToSale: 0,
                projectIds: [],
                activeProjectCount: 0,
            };
        }

        const projectIds = projects.map(project => project.id).filter(Boolean);
        const { data: orders, error } = await supabase
            .from('store_orders')
            .select('*')
            .in('project_id', projectIds)
            .or('payment_status.eq.paid,status.eq.paid,status.eq.completed')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (error || !orders) {
            if (error) console.warn('[ReportingService] Error fetching store_orders metrics:', error);
            return {
                totalRevenue: 0,
                totalOrders: 0,
                averageOrderValue: 0,
                conversionToSale: 0,
                projectIds,
                activeProjectCount: projectIds.length,
            };
        }

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + this.readOrderTotal(order), 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const conversionToSale = 0; // Placeholder

        return {
            totalRevenue,
            totalOrders,
            averageOrderValue,
            conversionToSale,
            projectIds,
            activeProjectCount: projectIds.length,
        };
    }

    /**
     * Get email marketing metrics for a client
     */
    private async getEmailMetrics(
        tenantId: string,
        startDate: Date,
        endDate: Date
    ) {
        // Assume an 'email_campaigns' table will exist in Supabase
        const { data: campaigns, error } = await supabase
            .from('email_campaigns')
            .select('recipient_count, opens_count, clicks_count')
            .eq('tenant_id', tenantId)
            .gte('sent_at', startDate.toISOString())
            .lte('sent_at', endDate.toISOString());

        if (error || !campaigns) {
            return { emailsSent: 0, emailsOpened: 0, emailsClicked: 0, openRate: 0, clickRate: 0 };
        }

        const emailsSent = campaigns.reduce((sum, c) => sum + (Number(c.recipient_count) || 0), 0);
        const emailsOpened = campaigns.reduce((sum, c) => sum + (Number(c.opens_count) || 0), 0);
        const emailsClicked = campaigns.reduce((sum, c) => sum + (Number(c.clicks_count) || 0), 0);

        const openRate = emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0;
        const clickRate = emailsSent > 0 ? (emailsClicked / emailsSent) * 100 : 0;

        return {
            emailsSent,
            emailsOpened,
            emailsClicked,
            openRate,
            clickRate,
        };
    }

    /**
     * Calculate summary totals
     */
    private calculateSummary(clientMetrics: ClientMetrics[]) {
        return calculateAgencyReportSummary(clientMetrics);
    }

    /**
     * Calculate trends and insights
     */
    private async calculateTrends(
        clientMetrics: ClientMetrics[],
        dateRange: ReportDateRange
    ) {
        // Top performing clients
        const topPerformingClients = clientMetrics
            .filter((c) => c.totalLeads > 0 || c.totalRevenue > 0)
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, 5)
            .map((c) => ({
                clientId: c.clientId,
                clientName: c.clientName,
                metric: 'Ingresos',
                value: c.totalRevenue,
            }));

        // Underperforming clients
        const underperformingClients = clientMetrics
            .filter((c) => c.conversionRate < 5 || c.bounceRate > 70)
            .slice(0, 5)
            .map((c) => ({
                clientId: c.clientId,
                clientName: c.clientName,
                metric: c.conversionRate < 5 ? 'Conversión' : 'Bounce Rate',
                value: c.conversionRate < 5 ? c.conversionRate : c.bounceRate,
                recommendation:
                    c.conversionRate < 5
                        ? 'Optimizar funnel de conversión'
                        : 'Mejorar experiencia de usuario',
            }));

        // Period over period comparison (aggregate)
        const avgLeadsGrowth =
            clientMetrics.length > 0
                ? clientMetrics.reduce((sum, c) => sum + c.trends.leadsChange, 0) /
                clientMetrics.length
                : 0;
        const avgRevenueGrowth =
            clientMetrics.length > 0
                ? clientMetrics.reduce((sum, c) => sum + c.trends.revenueChange, 0) /
                clientMetrics.length
                : 0;
        const avgTrafficGrowth =
            clientMetrics.length > 0
                ? clientMetrics.reduce((sum, c) => sum + c.trends.visitsChange, 0) /
                clientMetrics.length
                : 0;

        return {
            topPerformingClients,
            underperformingClients,
            periodOverPeriodComparison: {
                leadsGrowth: avgLeadsGrowth,
                revenueGrowth: avgRevenueGrowth,
                trafficGrowth: avgTrafficGrowth,
            },
        };
    }

    /**
     * Generate recommendations based on data
     */
    private generateRecommendations(
        clientMetrics: ClientMetrics[],
        trends: any
    ): string[] {
        const recommendations: string[] = [];

        // Check for low conversion rates
        const lowConversionClients = clientMetrics.filter((c) => c.conversionRate < 5);
        if (lowConversionClients.length > 0) {
            recommendations.push(
                `${lowConversionClients.length} clientes tienen tasas de conversión bajas (<5%). Considera revisar sus funnels de ventas.`
            );
        }

        // Check for high bounce rates
        const highBounceClients = clientMetrics.filter((c) => c.bounceRate > 70);
        if (highBounceClients.length > 0) {
            recommendations.push(
                `${highBounceClients.length} clientes tienen bounce rates altos (>70%). Revisa la experiencia de usuario y velocidad del sitio.`
            );
        }

        // Check for low email engagement
        const lowEmailEngagement = clientMetrics.filter(
            (c) => c.emailsSent > 0 && c.openRate < 15
        );
        if (lowEmailEngagement.length > 0) {
            recommendations.push(
                `${lowEmailEngagement.length} clientes tienen bajas tasas de apertura de emails (<15%). Mejora los subject lines y segmentación.`
            );
        }

        // Check for overall growth
        if (trends.periodOverPeriodComparison.revenueGrowth < 0) {
            recommendations.push(
                'Los ingresos generales disminuyeron vs el período anterior. Analiza las causas y ajusta estrategias.'
            );
        }

        // Default recommendation
        if (recommendations.length === 0) {
            recommendations.push(
                'Rendimiento general positivo. Continúa monitoreando métricas clave.'
            );
        }

        return recommendations;
    }

    /**
     * Helper functions
     */
    private getPreviousPeriodRange(dateRange: ReportDateRange): ReportDateRange {
        const duration = dateRange.end.getTime() - dateRange.start.getTime();
        return {
            start: new Date(dateRange.start.getTime() - duration),
            end: new Date(dateRange.start.getTime()),
        };
    }

    private calculatePercentageChange(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }

    private getDefaultUsage(): TenantUsage {
        return {
            projectCount: 0,
            userCount: 0,
            storageUsedGB: 0,
            aiCreditsUsed: 0,
        };
    }
}

// Singleton instance
export const reportingService = new ReportingService();
