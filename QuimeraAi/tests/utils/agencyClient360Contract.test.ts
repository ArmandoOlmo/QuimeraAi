import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency Client 360 contract', () => {
    const clientList = read('components/dashboard/agency/ClientListTable.tsx');
    const client360Panel = read('components/dashboard/agency/Client360Panel.tsx');
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

    it('tracks the documented AG2 Client 360 consolidation item', () => {
        expect(docs).toContain('AG2 Client 360 UX consolidation');
        expect(docs).toContain('Client 360');
    });
});
