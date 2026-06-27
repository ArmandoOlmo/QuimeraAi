import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency dashboard overflow contract', () => {
    const designSystem = read('components/dashboard/agency/AgencyDesignSystem.tsx');
    const dashboardMain = read('components/dashboard/agency/AgencyDashboardMain.tsx');
    const clientBillingManager = read('components/dashboard/agency/ClientBillingManager.tsx');
    const agencyPlanSelector = read('components/dashboard/agency/plans/AgencyPlanSelector.tsx');
    const projectTransferModal = read('components/dashboard/agency/ProjectTransferModal.tsx');
    const generatePaymentLink = read('components/dashboard/agency/GeneratePaymentLink.tsx');
    const legalPageEditor = read('components/dashboard/agency/AgencyLegalPageEditor.tsx');

    it('uses one scroll-safe Agency shell and content contract', () => {
        expect(designSystem).toContain('h-[100dvh]');
        expect(designSystem).toContain('overflow-hidden overscroll-contain');
        expect(designSystem).toContain('overflow-y-auto overflow-x-hidden overscroll-contain');
        expect(designSystem).toContain('quimera-dashboard-panel-card min-w-0 overflow-hidden');
        expect(dashboardMain).toContain('className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"');
        expect(dashboardMain).not.toContain('className="flex h-screen min-h-0 min-w-0 flex-1 flex-col overflow-hidden"');
    });

    it('keeps shared Agency panels and command metrics from widening the viewport', () => {
        expect(designSystem).toContain('flex min-w-0 items-center justify-between');
        expect(designSystem).toContain('title ? \'min-w-0 p-4 sm:p-5\'');
        expect(designSystem).toContain('grid min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-4');
        expect(designSystem).toContain('w-full min-w-0 lg:w-[320px]');
    });

    it('uses shared scroll-safe modal frames for billing and transfer workflows', () => {
        for (const source of [
            clientBillingManager,
            agencyPlanSelector,
            projectTransferModal,
            generatePaymentLink,
        ]) {
            expect(source).toContain('agencyModalOverlayClass');
            expect(source).toContain('agencyModalPanelClass');
            expect(source).toContain('agencyModalBodyClass');
        }

        expect(clientBillingManager).toContain('agencyModalFooterClass');
        expect(agencyPlanSelector).toContain('agencyModalFooterClass');
        expect(projectTransferModal).toContain('agencyModalFooterClass');
    });

    it('keeps the legal page editor inside the dashboard scroll hierarchy', () => {
        expect(legalPageEditor).toContain('className="flex h-full min-h-0 flex-col overflow-hidden bg-q-bg"');
        expect(legalPageEditor).toContain('className="min-h-0 flex-1 overflow-y-auto');
        expect(legalPageEditor).not.toContain('className="flex flex-col h-screen bg-q-bg"');
    });
});
