import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getAgencyEngineOperatingSystemManifest } from '../../registry/moduleRegistry';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency dashboard Service Access contract', () => {
    const dashboard = read('components/dashboard/agency/AgencyDashboardMain.tsx');
    const sidebar = read('components/dashboard/DashboardSidebar.tsx');
    const designSystem = read('components/dashboard/agency/AgencyDesignSystem.tsx');
    const routes = read('routes/config.ts');
    const registry = read('registry/moduleRegistry.ts');
    const manifest = getAgencyEngineOperatingSystemManifest();

    const tabContracts = [
        ['overview', 'agency-command-center', 'canViewAnalytics', 'AGENCY_OVERVIEW', '/agency/overview'],
        ['analytics', 'agency-command-center', 'canViewAnalytics', 'AGENCY_ANALYTICS', '/agency/analytics'],
        ['landing', 'agency-white-label', 'canManageSettings', 'AGENCY_LANDING', '/agency/landing'],
        ['billing', 'agency-billing', 'canManageBilling', 'AGENCY_BILLING', '/agency/billing'],
        ['reports', 'agency-reports', 'canViewAnalytics', 'AGENCY_REPORTS', '/agency/reports'],
        ['new-client', 'agency-client-provisioning', 'canManageSettings', 'AGENCY_NEW_CLIENT', '/agency/new-client'],
        ['addons', 'agency-service-plans', 'canManageBilling', 'AGENCY_ADDONS', '/agency/addons'],
        ['plans', 'agency-service-plans', 'canManageBilling', 'AGENCY_PLANS', '/agency/plans'],
        ['cms', 'agency-white-label', 'canManageSettings', 'AGENCY_CMS', '/agency/cms'],
        ['navigation', 'agency-white-label', 'canManageSettings', 'AGENCY_NAVIGATION', '/agency/navigation'],
        ['projects', 'agency-project-transfer', 'canManageProjects', 'AGENCY_PROJECTS', '/agency/projects'],
        ['white-label', 'agency-white-label', 'canManageSettings', 'AGENCY_WHITE_LABEL', '/agency/white-label'],
        ['client-portal', 'agency-client-portal', 'canManageSettings', 'AGENCY_CLIENT_PORTAL', '/agency/client-portal'],
    ] as const;

    it('routes every internal Agency tab through the Service Access Engine', () => {
        expect(dashboard).toContain("import { useServiceAccess }");
        expect(dashboard).toContain("import { getAgencyEngineOperatingSystemManifest, type AgencyEngineDashboardTabId }");
        expect(dashboard).toContain('const agencyEngineManifest = getAgencyEngineOperatingSystemManifest();');
        expect(dashboard).toContain('const agencyDashboardTabs = agencyEngineManifest.dashboardTabs;');
        expect(dashboard).toContain('Object.fromEntries(');
        expect(dashboard).toContain('agencyDashboardTabs.map(tab =>');
        expect(dashboard).toContain('AGENCY_ENGINE_OPERATING_MODULE_IDS');
        expect(dashboard).toContain('agencyEngineManifest.moduleIds');
        expect(dashboard).toContain('export const AGENCY_TAB_ACCESS');
        expect(dashboard).toContain('AGENCY_TAB_ICONS');
        expect(dashboard).toContain('AgencyClientPortalSettings');
        expect(dashboard).toContain("activeTab === 'client-portal'");
        expect(dashboard).toContain('path === tab.route || path.startsWith(`${tab.route}/`)');
        expect(dashboard).toContain('rawTabs.filter((tab) => AGENCY_ENGINE_OPERATING_MODULE_IDS.has(AGENCY_TAB_ACCESS[tab.id].moduleId))');
        expect(dashboard).toContain('serviceAccess.canAccessModule(access.moduleId');
        expect(dashboard).toContain("serviceId: 'agency'");
        expect(dashboard).toContain("featureKey: 'agencyModule'");
        expect(dashboard).toContain('disabled={isDisabled}');
        expect(dashboard).toContain('<Lock size={13}');

        for (const [tab, moduleId, permission, routeKey, route] of tabContracts) {
            expect(manifest.dashboardTabs.find(item => item.id === tab)).toMatchObject({
                moduleId,
                route,
                requiredPermission: permission,
            });
            expect(routes).toContain(`${routeKey}: '${route}'`);
        }
    });

    it('mirrors every canonical Agency dashboard tab in the global dashboard sidebar', () => {
        expect(sidebar).toContain("import { getAgencyEngineOperatingSystemManifest, type AgencyEngineDashboardTabId }");
        expect(sidebar).toContain('const agencyDashboardTabs = getAgencyEngineOperatingSystemManifest().dashboardTabs;');
        expect(sidebar).toContain('const AGENCY_SIDEBAR_ICONS: Record<AgencyEngineDashboardTabId, LucideIcon>');
        expect(sidebar).toContain('const agencyItems: NavItemData[] = agencyDashboardTabs.map(tab => ({');
        expect(sidebar).toContain('id: `agency-${tab.id}`');
        expect(sidebar).toContain('label: t(tab.labelKey, tab.label)');
        expect(sidebar).toContain("serviceId: 'agency'");
        expect(sidebar).toContain('moduleId: tab.moduleId');
        expect(sidebar).toContain("requiredFeature: 'agencyModule'");
        expect(sidebar).toContain('requiredPermission: tab.requiredPermission');
        expect(sidebar).toContain("toggleSection('agency')");
        expect(sidebar).toContain('{hasAccessibleItems(agencyItems) && (');
        expect(sidebar).toContain('agencyItems.filter(isItemVisible).map((item, index)');
        expect(sidebar).toContain('Agency surfaces from canonical manifest');
        expect(sidebar).not.toContain('const agencyItem: NavItemData');
        expect(sidebar).not.toContain("id: 'agency',");

        for (const [tab, moduleId, permission, , route] of tabContracts) {
            expect(manifest.dashboardTabs.find(item => item.id === tab)).toMatchObject({
                moduleId,
                route,
                requiredPermission: permission,
            });
        }
    });

    it('redirects blocked active tabs to the first allowed Agency submodule', () => {
        expect(dashboard).toContain('const firstAllowedTab = useMemo(');
        expect(dashboard).toContain('if (activeTabAccess.allowed) return;');
        expect(dashboard).toContain('navigate(AGENCY_TAB_ACCESS[firstAllowedTab].route)');
        expect(dashboard).toContain('navigate(ROUTES.DASHBOARD)');
    });

    it('keeps tab modules registered as canonical Agency Engine modules', () => {
        for (const [, moduleId] of tabContracts) {
            expect(registry).toContain(`id: '${moduleId}'`);
            expect(registry).toContain("canonicalSystem: 'agency'");
            expect(registry).toContain("requiredService: 'agency'");
            expect(registry).toContain("requiredFeature: 'agencyModule'");
        }
    });

    it('keeps route gates aligned with the internal Agency tab modules', () => {
        for (const [, moduleId, permission] of tabContracts) {
            expect(routes).toContain(`moduleId: '${moduleId}'`);
            expect(routes).toContain(`requiredPermission: '${permission}'`);
        }
    });

    it('centralizes Agency dashboard scrolling inside the content viewport', () => {
        expect(designSystem).toContain("agencyShellClass = 'quimera-agency-dashboard flex h-[100dvh] min-h-0 overflow-hidden");
        expect(designSystem).toContain("agencyContentClass = 'min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden");
        expect(dashboard).toContain('className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"');
        expect(dashboard).toContain('className="flex-1 min-h-0 min-w-0 overflow-hidden"');
        expect(dashboard).toContain('className={agencyContentClass}');
        expect(dashboard).toContain('quimera-dashboard-header-bar sticky top-0 z-40');
        expect(dashboard).not.toContain('sticky top-0 z-40 relative');
    });
});
