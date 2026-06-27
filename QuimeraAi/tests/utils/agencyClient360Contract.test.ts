import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency Client 360 contract', () => {
    const clientList = read('components/dashboard/agency/ClientListTable.tsx');
    const client360Panel = read('components/dashboard/agency/Client360Panel.tsx');
    const entryBridge = read('services/globalAssistant/globalAssistantEntryBridge.ts');
    const registry = read('registry/moduleRegistry.ts');
    const docs = read('docs/AGENCY_ENGINE_ARCHITECTURE.md');

    it('opens a canonical in-dashboard Client 360 surface instead of an unregistered client route', () => {
        expect(registry).toContain("id: 'agency-client-360'");
        expect(clientList).toContain("import { Client360Panel } from './Client360Panel'");
        expect(clientList).toContain('onSelectClient?: (clientId: string) => void');
        expect(clientList).toContain('handleOpenClient(client.id)');
        expect(clientList).toContain('setSelectedClientId(clientId)');
        expect(clientList).not.toContain('/dashboard/agency/clients/${client.id}');
        expect(clientList).not.toContain('ROUTES.AGENCY_CLIENT');
    });

    it('summarizes operations, usage, billing, activity, and handoffs from Client 360', () => {
        expect(client360Panel).toContain("t('dashboard.agency.client360.eyebrow'");
        expect(client360Panel).toContain("t('dashboard.agency.client360.usage'");
        expect(client360Panel).toContain("t('dashboard.agency.client360.billing'");
        expect(client360Panel).toContain("t('dashboard.agency.client360.activity'");
        expect(client360Panel).toContain('ROUTES.AGENCY_BILLING');
        expect(client360Panel).toContain('ROUTES.AGENCY_REPORTS');
        expect(client360Panel).toContain('ROUTES.AGENCY_PROJECTS');
    });

    it('hands Client 360 report generation to the Agency AI operating layer with client context', () => {
        expect(entryBridge).toContain("| 'agency_client_360'");
        expect(client360Panel).toContain('dispatchGlobalAssistantEntryRequest(createGlobalAssistantEntryPayload(prompt');
        expect(client360Panel).toContain("source: 'agency_client_360'");
        expect(client360Panel).toContain("sourceComponent: 'Client360Panel'");
        expect(client360Panel).toContain("activeModule: 'agency'");
        expect(client360Panel).toContain("quickActionId: 'create_agency_report'");
        expect(client360Panel).toContain("quickActionCategory: 'analyze'");
        expect(client360Panel).toContain("activeEntityType: 'agency_client'");
        expect(client360Panel).toContain('clientTenantId: client.id');
        expect(client360Panel).toContain("'dashboard.agency.client360.generateAiReport'");
        expect(client360Panel).toContain("'dashboard.agency.client360.aiReportPrompt'");
    });

    it('tracks the documented AG2 Client 360 consolidation item', () => {
        expect(docs).toContain('AG2 Client 360 UX consolidation');
        expect(docs).toContain('Client 360');
    });
});
