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
} from '../types/reports';

export class ReportingService {
    /**
     * Aggregate data from multiple clients
     */
    async aggregateClientData(
        agencyTenantId: string,
        clientIds: string[],
        dateRange: ReportDateRange,
        metrics: ReportMetric[]
    ): Promise<AggregatedReportData> {
        // Fetch all client data
        let query = supabase
            .from('tenants')
            .select('*')
            .eq('owner_tenant_id', agencyTenantId);

        if (clientIds.length > 0) {
            query = query.in('id', clientIds);
        }

        const { data: clientsData, error } = await query;
        if (error) {
            console.error('[ReportingService] Error fetching clients:', error);
            return this.getEmptyReport(dateRange, clientIds, metrics);
        }

        const clients: Tenant[] = (clientsData || []).map(doc => ({
            id: doc.id,
            name: doc.name,
            ownerTenantId: doc.owner_tenant_id,
            domain: doc.domain,
            plan: doc.plan,
            status: doc.status,
            createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
            updatedAt: doc.updated_at ? new Date(doc.updated_at) : new Date(),
            settings: doc.settings,
            usage: doc.usage
        }));

        // Calculate metrics for each client
        const clientMetrics: ClientMetrics[] = [];
        for (const client of clients) {
            const metrics = await this.getClientMetrics(client, dateRange);
            clientMetrics.push(metrics);
        }

        // Calculate summary totals
        const summary = this.calculateSummary(clientMetrics);

        // Calculate trends
        const trends = await this.calculateTrends(clientMetrics, dateRange);

        // Generate recommendations
        const recommendations = this.generateRecommendations(clientMetrics, trends);

        return {
            summary,
            byClient: clientMetrics,
            trends,
            recommendations,
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
            trends: {
                topPerformingClients: [],
                underperformingClients: [],
                periodOverPeriodComparison: { leadsGrowth: 0, revenueGrowth: 0, trafficGrowth: 0 }
            },
            recommendations: ['No data available'],
            generatedAt: new Date(),
            dateRange,
            includedClients: clientIds,
            metrics
        };
    }

    /**
     * Get metrics for a single client
     */
    async getClientMetrics(
        client: Tenant,
        dateRange: ReportDateRange,
        includeTrends: boolean = true
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
            ...leadsData,
            ...trafficData,
            ...salesData,
            ...emailData,
            aiCreditsUsed: usage.aiCreditsUsed || 0,
            storageUsedGB: usage.storageUsedGB || 0,
            activeUsers: usage.userCount || 0,
            activeProjects: usage.projectCount || 0,
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
    private async getSalesMetrics(
        tenantId: string,
        startDate: Date,
        endDate: Date
    ) {
        // Assume an 'orders' table will exist in Supabase
        const { data: orders, error } = await supabase
            .from('orders')
            .select('total')
            .eq('tenant_id', tenantId)
            .eq('status', 'paid')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (error || !orders) {
            return { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0, conversionToSale: 0 };
        }

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const conversionToSale = 0; // Placeholder

        return {
            totalRevenue,
            totalOrders,
            averageOrderValue,
            conversionToSale,
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
        return {
            totalClients: clientMetrics.length,
            totalLeads: clientMetrics.reduce((sum, c) => sum + c.totalLeads, 0),
            totalRevenue: clientMetrics.reduce((sum, c) => sum + c.totalRevenue, 0),
            totalVisits: clientMetrics.reduce((sum, c) => sum + c.totalVisits, 0),
            totalEmailsSent: clientMetrics.reduce((sum, c) => sum + c.emailsSent, 0),
            avgConversionRate:
                clientMetrics.length > 0
                    ? clientMetrics.reduce((sum, c) => sum + c.conversionRate, 0) /
                    clientMetrics.length
                    : 0,
            totalAiCreditsUsed: clientMetrics.reduce((sum, c) => sum + c.aiCreditsUsed, 0),
            totalStorageUsedGB: clientMetrics.reduce((sum, c) => sum + c.storageUsedGB, 0),
        };
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
