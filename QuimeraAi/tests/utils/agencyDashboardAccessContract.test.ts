import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency dashboard Service Access contract', () => {
    const dashboard = read('components/dashboard/agency/AgencyDashboardMain.tsx');
    const designSystem = read('components/dashboard/agency/AgencyDesignSystem.tsx');
    const routes = read('routes/config.ts');
    const registry = read('registry/moduleRegistry.ts');

    const tabContracts = [
        ['overview', 'agency-command-center', 'canViewAnalytics', 'AGENCY_OVERVIEW'],
        ['analytics', 'agency-command-center', 'canViewAnalytics', 'AGENCY_ANALYTICS'],
        ['landing', 'agency-white-label', 'canManageSettings', 'AGENCY_LANDING'],
        ['billing', 'agency-billing', 'canManageBilling', 'AGENCY_BILLING'],
        ['reports', 'agency-reports', 'canViewAnalytics', 'AGENCY_REPORTS'],
        ['new-client', 'agency-client-provisioning', 'canManageSettings', 'AGENCY_NEW_CLIENT'],
        ['addons', 'agency-service-plans', 'canManageBilling', 'AGENCY_ADDONS'],
        ['plans', 'agency-service-plans', 'canManageBilling', 'AGENCY_PLANS'],
        ['cms', 'agency-white-label', 'canManageSettings', 'AGENCY_CMS'],
        ['navigation', 'agency-white-label', 'canManageSettings', 'AGENCY_NAVIGATION'],
        ['projects', 'agency-project-transfer', 'canManageProjects', 'AGENCY_PROJECTS'],
        ['white-label', 'agency-white-label', 'canManageSettings', 'AGENCY_WHITE_LABEL'],
    ] as const;

    it('routes every internal Agency tab through the Service Access Engine', () => {
        expect(dashboard).toContain("import { useServiceAccess }");
        expect(dashboard).toContain("import { getAgencyEngineOperatingSystemManifest }");
        expect(dashboard).toContain('AGENCY_ENGINE_OPERATING_MODULE_IDS');
        expect(dashboard).toContain('getAgencyEngineOperatingSystemManifest().moduleIds');
        expect(dashboard).toContain('export const AGENCY_TAB_ACCESS');
        expect(dashboard).toContain('rawTabs.filter((tab) => AGENCY_ENGINE_OPERATING_MODULE_IDS.has(AGENCY_TAB_ACCESS[tab.id].moduleId))');
        expect(dashboard).toContain('serviceAccess.canAccessModule(access.moduleId');
        expect(dashboard).toContain("serviceId: 'agency'");
        expect(dashboard).toContain("featureKey: 'agencyModule'");
        expect(dashboard).toContain('disabled={isDisabled}');
        expect(dashboard).toContain('<Lock size={13}');

        for (const [tab, moduleId, permission, routeKey] of tabContracts) {
            const key = tab.includes('-') ? `'${tab}'` : tab;
            expect(dashboard).toContain(`${key}: { route: ROUTES.${routeKey}, moduleId: '${moduleId}', requiredPermission: '${permission}' }`);
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
