import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getAgencyEngineOperatingSystemManifest } from '../../registry/moduleRegistry';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency Client Portal operating surface contract', () => {
    const dashboard = read('components/dashboard/agency/AgencyDashboardMain.tsx');
    const clientPortalSettings = read('components/dashboard/agency/AgencyClientPortalSettings.tsx');
    const routes = read('routes/config.ts');
    const manifest = getAgencyEngineOperatingSystemManifest();

    it('registers Client Portal as an Agency dashboard surface backed by the canonical manifest', () => {
        expect(manifest.dashboardTabs.find(tab => tab.id === 'client-portal')).toMatchObject({
            surfaceId: 'client-portal',
            moduleId: 'agency-client-portal',
            route: '/agency/client-portal',
            requiredPermission: 'canManageSettings',
        });
        expect(dashboard).toContain('AgencyClientPortalSettings');
        expect(dashboard).toContain("'client-portal': Monitor");
        expect(dashboard).toContain("activeTab === 'client-portal'");
        expect(routes).toContain("AGENCY_CLIENT_PORTAL: '/agency/client-portal'");
        expect(routes).toContain('const AGENCY_CLIENT_PORTAL_ADMIN_ROUTE_GATE = {');
        expect(routes).toContain("moduleId: 'agency-client-portal'");
        expect(routes).toContain("requiredPermission: 'canManageSettings'");
    });

    it('routes Client Portal management through Service Access Engine without weakening client portal runtime access', () => {
        expect(clientPortalSettings).toContain("import { useServiceAccess }");
        expect(clientPortalSettings).toContain("serviceAccess.canAccessModule('agency-client-portal'");
        expect(clientPortalSettings).toContain("serviceId: 'agency'");
        expect(clientPortalSettings).toContain("featureKey: 'agencyModule'");
        expect(clientPortalSettings).toContain("requiredPermission: 'canManageSettings'");
        expect(clientPortalSettings).toContain('portalAccess.message');
        expect(routes).toContain('const AGENCY_CLIENT_PORTAL_ROUTE_GATE = {');
        expect(routes).toContain("requiredService: 'agency' as const");
        expect(routes).not.toContain(`const AGENCY_CLIENT_PORTAL_ROUTE_GATE = {
  ...AGENCY_ROUTE_GATE`);
    });

    it('connects portal operations to White Label, Reports, and Project Transfer workflows', () => {
        expect(clientPortalSettings).toContain('ROUTES.AGENCY_WHITE_LABEL');
        expect(clientPortalSettings).toContain('ROUTES.AGENCY_REPORTS');
        expect(clientPortalSettings).toContain('ROUTES.AGENCY_PROJECTS');
        expect(clientPortalSettings).toContain('ROUTES.PORTAL_DASHBOARD');
        expect(clientPortalSettings).toContain('Portal readiness');
        expect(clientPortalSettings).toContain('Transferred websites, storefronts, modules, and delivery status.');
        expect(clientPortalSettings).toContain('Shared performance reports, AI summaries, recommendations, and exports.');
        expect(clientPortalSettings).toContain('Plan, invoices, payment links, and agency-managed billing visibility.');
    });
});
