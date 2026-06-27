import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency dashboard design contract', () => {
    const designSystem = read('components/dashboard/agency/AgencyDesignSystem.tsx');
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
});
