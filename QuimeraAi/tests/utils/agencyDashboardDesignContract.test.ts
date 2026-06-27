import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency dashboard design contract', () => {
    const designSystem = read('components/dashboard/agency/AgencyDesignSystem.tsx');
    const dashboardMain = read('components/dashboard/agency/AgencyDashboardMain.tsx');
    const legacyDashboard = read('components/dashboard/agency/AgencyDashboard.tsx');
    const dashboardSurfaces = [
        'components/dashboard/agency/AgencyOverview.tsx',
        'components/dashboard/agency/AgencyAnalytics.tsx',
        'components/dashboard/agency/BillingSettings.tsx',
        'components/dashboard/agency/AgencyProjects.tsx',
        'components/dashboard/agency/AddonsManager.tsx',
        'components/dashboard/agency/plans/AgencyPlanManager.tsx',
    ];

    it('exposes canonical Quimera agency dashboard primitives', () => {
        expect(designSystem).toContain('export function AgencyCommandCenter');
        expect(designSystem).toContain('export function AgencyReadinessPanel');
        expect(designSystem).toContain('export function AgencyNextAction');
    });

    it('keeps Agency Engine dashboards inside a bounded scroll shell', () => {
        expect(designSystem).toContain("agencyShellClass = 'quimera-agency-dashboard flex h-[100dvh] min-h-0 overflow-hidden");
        expect(designSystem).toContain("agencyContentClass = 'min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden");
        expect(dashboardMain).toContain('className={agencyShellClass}');
        expect(dashboardMain).toContain('className={agencyContentClass}');
        expect(dashboardMain).toContain('className="flex-1 min-h-0 min-w-0 overflow-hidden"');
        expect(dashboardMain).toContain('overflow-x-auto');
        expect(legacyDashboard).toContain("import { agencyContentClass } from './AgencyDesignSystem'");
        expect(legacyDashboard).not.toContain('h-screen');
    });

    it('uses command-center and readiness primitives across agency dashboards', () => {
        for (const surface of dashboardSurfaces) {
            const source = read(surface);
            expect(source, surface).toContain('AgencyCommandCenter');
            expect(source, surface).toContain('AgencyReadinessPanel');
        }
    });

    it('keeps operational client drilldowns inside Client 360 instead of loose client routes', () => {
        const overview = read('components/dashboard/agency/AgencyOverview.tsx');
        const alerts = read('components/dashboard/agency/ResourceAlertsPanel.tsx');
        const renewals = read('components/dashboard/agency/UpcomingRenewalsPanel.tsx');

        expect(overview).toContain('Client360Panel');
        expect(alerts).toContain('onSelectClient?.(alert.clientId)');
        expect(renewals).toContain('onSelectClient?.(renewal.clientId)');
        expect(`${alerts}\n${renewals}`).not.toContain('/dashboard/agency/clients/');
    });

    it('surfaces Agency Operating System module readiness in the command center', () => {
        const overview = read('components/dashboard/agency/AgencyOverview.tsx');
        const agencyMetrics = read('hooks/useAgencyMetrics.ts');

        expect(agencyMetrics).toContain('export interface AgencyOperatingSystemMetrics');
        expect(agencyMetrics).toContain('function calculateAgencyOperatingSystemMetrics(clients: Tenant[]): AgencyOperatingSystemMetrics');
        expect(agencyMetrics).toContain('clientsWithOperatingSystem');
        expect(agencyMetrics).toContain('activeModuleSlots');
        expect(agencyMetrics).toContain('moduleReadinessRate');
        expect(agencyMetrics).toContain('agencyOperatingSystem: calculateAgencyOperatingSystemMetrics(clients)');

        expect(overview).toContain('const agencyOperatingSystem = safeMetrics.agencyOperatingSystem');
        expect(overview).toContain('const operatingModuleValue = agencyOperatingSystem.totalModuleSlots > 0');
        expect(overview).toContain("t('dashboard.agency.overviewPage.aiModulesShort'");
        expect(overview).toContain("t('dashboard.agency.overviewPage.readinessModules'");
        expect(overview).toContain("t('dashboard.agency.overviewPage.operatingModules'");
    });
});
