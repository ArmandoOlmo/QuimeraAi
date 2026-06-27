import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Portal client reports contract', () => {
    const hook = read('hooks/usePortalReports.ts');
    const operationsHook = read('hooks/usePortalOperations.ts');
    const panel = read('components/portal/PortalReportsPanel.tsx');
    const dashboard = read('components/portal/PortalDashboard.tsx');
    const exportsFile = read('components/portal/index.ts');
    const reportingService = read('services/reportingService.ts');
    const reportsGenerator = read('components/dashboard/agency/ReportsGenerator.tsx');
    const activityDisplay = read('components/dashboard/agency/agencyActivityDisplay.ts');
    const activityFeed = read('components/dashboard/agency/ClientActivityFeed.tsx');
    const client360Panel = read('components/dashboard/agency/Client360Panel.tsx');
    const actionHandlers = read('services/globalAssistant/globalAssistantActionHandlers.ts');
    const actionRegistry = read('services/globalAssistant/globalAssistantActionRegistry.ts');
    const migration = read('supabase/migrations/20260627071535_canonical_agency_engine.sql');
    const activityMigration = read('supabase/migrations/20260627072955_client_portal_activity_access.sql');
    const docs = read('docs/AGENCY_ENGINE_ARCHITECTURE.md');

    it('reads client-facing reports from canonical agency_reports only', () => {
        expect(hook).toContain(".from('agency_reports')");
        expect(hook).toContain(".eq('client_tenant_id', clientTenantId)");
        expect(hook).toContain(".in('status', ['sent', 'published'])");
        expect(hook).toContain(".order('created_at', { ascending: false })");
        expect(hook).not.toContain(".from('reports')");
        expect(hook).not.toContain(".from('orders')");
    });

    it('renders reports in the portal dashboard as a read-only client inbox', () => {
        expect(panel).toContain('usePortalReports(tenant?.id)');
        expect(panel).toContain("t('portal.reports.title'");
        expect(panel).toContain('executiveSummary');
        expect(panel).toContain('recommendations');
        expect(panel).not.toContain('.insert(');
        expect(panel).not.toContain('.update(');

        expect(dashboard).toContain("import PortalReportsPanel from './PortalReportsPanel'");
        expect(dashboard).toContain('<PortalReportsPanel />');
        expect(exportsFile).toContain("export { default as PortalReportsPanel } from './PortalReportsPanel'");
    });

    it('matches the RLS-backed client visibility contract', () => {
        expect(migration).toContain('Clients can view sent reports');
        expect(migration).toContain("status in ('sent', 'published')");
        expect(migration).toContain('client_tenant_id in (');

        expect(docs).toContain('PortalReportsPanel');
        expect(docs).toContain('agency_reports');
        expect(docs).toContain("status in ('sent', 'published')");
        expect(docs).toContain('clients do not write report rows from the portal');
    });

    it('publishes single-client Agency Reports into the portal with sent status', () => {
        expect(reportingService).toContain('publishToClientPortal?: boolean');
        expect(reportingService).toContain("const reportStatus = canPublishToClientPortal ? 'sent' : 'draft'");
        expect(reportingService).toContain("clientPortal: {");
        expect(reportingService).toContain("visible: options.publishToClientPortal === true && Boolean(clientTenantId) && ['sent', 'published'].includes(reportStatus)");
        expect(reportingService).toContain("clientPortalVisible: input.publishToClientPortal && input.reportStatus !== 'draft'");

        expect(reportsGenerator).toContain("dashboard.agency.reports.publishToPortal");
        expect(reportsGenerator).toContain('publishToClientPortal: canPublishToClientPortal && publishToClientPortal');
        expect(reportsGenerator).toContain("dashboard.agency.reports.portalShared");

        expect(actionRegistry).toContain('publishToClientPortal');
        expect(actionHandlers).toContain('const reportStatus = canPublishToClientPortal ?');
        expect(actionHandlers).toContain('portalPublicationStatus');
        expect(actionHandlers).toContain('clientPortalVisible: canPublishToClientPortal');

        expect(docs).toContain("agency_reports.status = 'sent'");
        expect(docs).toContain('Multi-client reports remain internal drafts');
    });

    it('keeps agency-side timelines aligned with portal report delivery metadata', () => {
        expect(activityDisplay).toContain('metadata.clientPortalVisible');
        expect(activityDisplay).toContain('metadata.portalPublicationStatus');
        expect(activityDisplay).toContain("activity.type !== 'report_generated'");
        expect(activityFeed).toContain('getPortalReportDeliveryStatus(activity)');
        expect(client360Panel).toContain('getPortalReportDeliveryStatus(activity)');
        expect(client360Panel).toContain('publishToClientPortal: true');
        expect(docs).toContain('label report delivery as shared or published in the Client Portal');
    });

    it('replaces portal placeholders with RLS-backed activity and report metrics', () => {
        expect(operationsHook).toContain(".from('agency_activity')");
        expect(operationsHook).toContain(".from('agency_reports')");
        expect(operationsHook).toContain(".eq('client_tenant_id', clientTenantId)");
        expect(operationsHook).toContain(".in('status', ['sent', 'published'])");

        expect(dashboard).toContain('usePortalOperations(tenant?.id)');
        expect(dashboard).toContain('portalSummary.totalVisits.toLocaleString()');
        expect(dashboard).toContain('recentActivities.map');
        expect(dashboard).not.toContain("value: '-'");
        expect(dashboard).not.toContain('Activity feed placeholder');

        expect(activityMigration).toContain('Agency and clients can view activity');
        expect(activityMigration).toContain('public.quimera_can_view_agency_relationship(agency_tenant_id::text, client_tenant_id::text)');
        expect(activityMigration).toContain('Clients can view sent reports');

        expect(docs).toContain('agency_activity');
        expect(docs).toContain('clients do not write activity rows from the portal');
    });
});
