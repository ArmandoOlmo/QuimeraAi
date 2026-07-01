import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { ClientMetrics, AggregatedReportData } from '../../types/reports';

vi.mock('../../supabase', () => ({
    supabase: {
        from: vi.fn(),
        auth: {
            getUser: vi.fn(),
        },
    },
}));

import {
    buildAgencyReportAISummary,
    calculateAgencyModuleReadiness,
    calculateAgencyReportSummary,
    isMissingAgencyReportingTable,
    readCanonicalOrderTotal,
    readClientMonthlyRecurringRevenue,
} from '../../services/reportingService';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

function clientMetric(overrides: Partial<ClientMetrics>): ClientMetrics {
    return {
        clientId: 'client-1',
        clientName: 'Client One',
        monthlyRecurringRevenue: 0,
        totalLeads: 0,
        newLeads: 0,
        convertedLeads: 0,
        conversionRate: 0,
        leadsBySource: {},
        totalVisits: 0,
        uniqueVisitors: 0,
        pageViews: 0,
        avgSessionDuration: 0,
        bounceRate: 0,
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        conversionToSale: 0,
        projectIds: [],
        emailsSent: 0,
        emailsOpened: 0,
        emailsClicked: 0,
        openRate: 0,
        clickRate: 0,
        aiCreditsUsed: 0,
        storageUsedGB: 0,
        activeUsers: 0,
        activeProjects: 0,
        trends: {
            leadsChange: 0,
            visitsChange: 0,
            revenueChange: 0,
            emailPerformanceChange: 0,
        },
        ...overrides,
    };
}

describe('ReportingService canonical helpers', () => {
    it('reads store order totals from canonical columns, pricing, and JSON fallbacks', () => {
        expect(readCanonicalOrderTotal({ total_amount: 125 })).toBe(125);
        expect(readCanonicalOrderTotal({ total_amount: 0, data: { total: 89 } })).toBe(89);
        expect(readCanonicalOrderTotal({ data: JSON.stringify({ pricing: { total: '42.50' } }) })).toBe(42.5);
        expect(readCanonicalOrderTotal({ pricing: { total_amount: 210 } })).toBe(210);
        expect(readCanonicalOrderTotal({ total_amount: 0, total: 0 })).toBe(0);
    });

    it('derives client MRR from canonical billing fallbacks', () => {
        expect(readClientMonthlyRecurringRevenue({ billing: { mode: 'direct', mrr: 99 }, billingInfo: {} })).toBe(99);
        expect(readClientMonthlyRecurringRevenue({ billing: { mode: 'direct', monthlyPrice: 149 }, billingInfo: {} })).toBe(149);
        expect(readClientMonthlyRecurringRevenue({ billing: { mode: 'direct' }, billingInfo: { mrr: 59 } })).toBe(59);
    });

    it('summarizes orders, revenue, AOV, MRR, usage, and conversion across clients', () => {
        const summary = calculateAgencyReportSummary([
            clientMetric({
                clientId: 'client-a',
                clientName: 'Client A',
                totalLeads: 10,
                convertedLeads: 2,
                conversionRate: 20,
                totalRevenue: 400,
                totalOrders: 4,
                monthlyRecurringRevenue: 99,
                totalVisits: 120,
                emailsSent: 300,
                aiCreditsUsed: 500,
                storageUsedGB: 1.5,
            }),
            clientMetric({
                clientId: 'client-b',
                clientName: 'Client B',
                totalLeads: 6,
                conversionRate: 10,
                totalRevenue: 200,
                totalOrders: 1,
                monthlyRecurringRevenue: 149,
                totalVisits: 80,
                emailsSent: 100,
                aiCreditsUsed: 250,
                storageUsedGB: 0.5,
            }),
        ]);

        expect(summary).toMatchObject({
            totalClients: 2,
            totalLeads: 16,
            totalRevenue: 600,
            totalOrders: 5,
            averageOrderValue: 120,
            totalMrr: 248,
            totalVisits: 200,
            totalEmailsSent: 400,
            avgConversionRate: 15,
            totalAiCreditsUsed: 750,
            totalStorageUsedGB: 2,
            moduleReadiness: {
                clientsWithAgencyOperatingSystem: 0,
                activeModuleSlots: 0,
                totalModuleSlots: 0,
                moduleReadinessRate: 0,
            },
        });
    });

    it('summarizes Agency OS module readiness across report clients', () => {
        const moduleReadiness = calculateAgencyModuleReadiness([
            clientMetric({
                clientId: 'client-a',
                agencyOperatingSystem: { source: 'agency-engine' },
                enabledClient360ModuleIds: ['website-builder', 'analytics', 'ecommerce'],
                generatedModuleIds: ['website-builder', 'analytics-engine', 'ecommerce-engine'],
                activeClient360ModuleSlots: 3,
                totalClient360ModuleSlots: 12,
            }),
            clientMetric({
                clientId: 'client-b',
                agencyOperatingSystem: { source: 'agency-engine' },
                enabledClient360ModuleIds: ['website-builder', 'crm-leads'],
                generatedModuleIds: ['website-builder', 'crm-leads'],
                activeClient360ModuleSlots: 2,
                totalClient360ModuleSlots: 10,
            }),
        ]);

        expect(moduleReadiness).toEqual({
            clientsWithAgencyOperatingSystem: 2,
            activeModuleSlots: 5,
            totalModuleSlots: 22,
            moduleReadinessRate: 23,
            enabledClient360ModuleIds: ['analytics', 'crm-leads', 'ecommerce', 'website-builder'],
            generatedModuleIds: ['analytics-engine', 'crm-leads', 'ecommerce-engine', 'website-builder'],
        });
    });

    it('builds an AI operational summary from canonical report data', () => {
        const reportData: AggregatedReportData = {
            summary: calculateAgencyReportSummary([
                clientMetric({
                    clientId: 'client-a',
                    clientName: 'Client A',
                    totalLeads: 10,
                    totalRevenue: 400,
                    totalOrders: 4,
                    monthlyRecurringRevenue: 99,
                }),
            ]),
            byClient: [],
            trends: {
                topPerformingClients: [{ clientId: 'client-a', clientName: 'Client A', metric: 'Ingresos', value: 400 }],
                underperformingClients: [],
                periodOverPeriodComparison: { leadsGrowth: 0, revenueGrowth: 0, trafficGrowth: 0 },
            },
            recommendations: [],
            generatedAt: new Date('2026-06-27T12:00:00.000Z'),
            dateRange: {
                start: new Date('2026-06-01T00:00:00.000Z'),
                end: new Date('2026-06-27T00:00:00.000Z'),
            },
            includedClients: ['client-a'],
            metrics: ['leads', 'sales'],
        };

        expect(buildAgencyReportAISummary(reportData)).toContain('Client A');
        expect(buildAgencyReportAISummary(reportData)).toContain('$400');
        expect(buildAgencyReportAISummary(reportData)).toContain('$99');
        expect(buildAgencyReportAISummary(reportData)).toContain('Agency OS readiness');
    });

    it('only treats real missing Agency reporting tables as legacy fallback candidates', () => {
        expect(isMissingAgencyReportingTable({ code: '42P01', message: 'relation does not exist' }, 'agency_clients')).toBe(true);
        expect(isMissingAgencyReportingTable({ code: 'PGRST205', message: 'Could not find the table agency_clients' }, 'agency_clients')).toBe(true);
        expect(isMissingAgencyReportingTable({ message: 'Could not find the table agency_clients in the schema cache' }, 'agency_clients')).toBe(true);
        expect(isMissingAgencyReportingTable({ code: '42501', message: 'permission denied for table agency_clients' }, 'agency_clients')).toBe(false);
        expect(isMissingAgencyReportingTable({ message: 'permission denied for table agency_service_plans' }, 'agency_service_plans')).toBe(false);
    });
});

describe('Agency reporting canonical contract', () => {
    const reportingService = read('services/reportingService.ts');
    const agencyActivityService = read('services/agency/agencyActivityService.ts');
    const reportsGenerator = read('components/dashboard/agency/ReportsGenerator.tsx');
    const pdfGenerator = read('services/pdfGenerator.ts');
    const architectureDoc = read('docs/AGENCY_ENGINE_ARCHITECTURE.md');

    it('uses store_orders as the revenue source and avoids the legacy orders table', () => {
        expect(reportingService).toContain(".from('store_orders')");
        expect(reportingService).toContain(".select('*')");
        expect(reportingService).not.toContain(".from('orders')");
        expect(reportingService).not.toContain('.from("orders")');
    });

    it('discovers agency report clients from canonical agency_clients with legacy fallback', () => {
        expect(reportingService).toContain("function fetchAgencyClientTenantRows");
        expect(reportingService).toContain(".from('agency_clients')");
        expect(reportingService).toContain(".select('client_tenant_id')");
        expect(reportingService).toContain(".eq('agency_tenant_id', agencyTenantId)");
        expect(reportingService).toContain(".eq('owner_tenant_id', agencyTenantId)");
        expect(reportingService).toContain('isMissingAgencyReportingTable(error,');
        expect(reportingService).not.toContain("message.includes('agency_clients')");
        expect(reportingService).not.toContain("return null;");
        expect(reportingService).toContain('throw relationshipError');
        expect(reportingService).toContain('throw plansError');
    });

    it('persists generated agency reports and activity snapshots', () => {
        expect(reportingService).toContain(".from('agency_reports')");
        expect(reportingService).toContain("source: 'agency_reporting_service'");
        expect(reportingService).toContain('publishToClientPortal?: boolean');
        expect(reportingService).toContain("const reportStatus = canPublishToClientPortal ? 'sent' : 'draft'");
        expect(reportingService).toContain("clientPortal: {");
        expect(reportingService).toContain("status: reportStatus");
        expect(reportingService).toContain("portalPublicationStatus");
        expect(reportingService).toContain(".from('agency_activity')");
        expect(reportingService).toContain('buildAgencyReportGeneratedActivity');
        expect(agencyActivityService).toContain("type: 'report_generated'");
        expect(agencyActivityService).toContain('clientPortalVisible');
        expect(reportingService).toContain('metadata.agencyOperatingSystem');
        expect(agencyActivityService).toContain('moduleReadinessRate: input.summary.moduleReadiness.moduleReadinessRate');
        expect(agencyActivityService).toContain('activeModuleSlots: input.summary.moduleReadiness.activeModuleSlots');
        expect(reportsGenerator).toContain('reportingService.generateAgencyReport');
        expect(reportsGenerator).toContain('persistenceStatus');
        expect(reportsGenerator).toContain('publishToClientPortal: canPublishToClientPortal && publishToClientPortal');
        expect(reportsGenerator).toContain("dashboard.agency.reports.publishToPortal");
        expect(reportsGenerator).toContain('portalPublicationStatus');
    });

    it('surfaces Agency OS readiness in visible report previews and exports', () => {
        expect(reportsGenerator).toContain("dashboard.agency.reports.agencyOs");
        expect(reportsGenerator).toContain("dashboard.agency.reports.agencyOsReadiness");
        expect(reportsGenerator).toContain('moduleReadiness.moduleReadinessRate');
        expect(reportsGenerator).toContain('client.moduleReadinessRate');
        expect(reportsGenerator).toContain('activeClient360ModuleSlots');
        expect(reportsGenerator).toContain('generatedModuleIds');
        expect(reportsGenerator).toContain('formatCsvCell');
        expect(pdfGenerator).toContain('Agency OS Readiness');
        expect(pdfGenerator).toContain('enabledClient360ModuleIds');
        expect(pdfGenerator).toContain('generatedModuleIds');
    });

    it('documents the canonical report storage contract', () => {
        expect(architectureDoc).toContain('ReportingService.generateAgencyReport');
        expect(architectureDoc).toContain('agency_reports');
        expect(architectureDoc).toContain('Store order reads intentionally use `select');
        expect(architectureDoc).toContain('Agency OS module readiness');
        expect(architectureDoc).toContain('PDF/CSV exports surface the same readiness fields');
    });
});
