import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
const readJson = (relativePath: string) => JSON.parse(read(relativePath)) as Record<string, unknown>;

function getNestedValue(source: Record<string, unknown>, keyPath: string): unknown {
    return keyPath.split('.').reduce<unknown>((cursor, key) => {
        if (!cursor || typeof cursor !== 'object') return undefined;
        return (cursor as Record<string, unknown>)[key];
    }, source);
}

describe('Agency Client 360 contract', () => {
    const clientList = read('components/dashboard/agency/ClientListTable.tsx');
    const client360Panel = read('components/dashboard/agency/Client360Panel.tsx');
    const activityDisplay = read('components/dashboard/agency/agencyActivityDisplay.ts');
    const activityFeed = read('components/dashboard/agency/ClientActivityFeed.tsx');
    const globalAssistant = read('components/ui/GlobalAiAssistant.tsx');
    const executionEngine = read('services/globalAssistant/globalAssistantExecutionEngine.ts');
    const entryBridge = read('services/globalAssistant/globalAssistantEntryBridge.ts');
    const actionHandlers = read('services/globalAssistant/globalAssistantActionHandlers.ts');
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
        expect(client360Panel).toContain("t('dashboard.agency.client360.moduleMap'");
        expect(client360Panel).toContain('buildClient360ModuleSignals(client, metrics)');
        expect(client360Panel).toContain('getAgencyEngineOperatingSystemManifest().client360Modules');
        expect(client360Panel).toContain('CLIENT_360_MODULE_ICONS');
        expect(client360Panel).toContain('module.activationSignals');
        expect(client360Panel).toContain('readClientAgencyOperatingSystem(client)');
        expect(client360Panel).toContain('readAgencyOperatingModuleState(module, agencyOperatingSystem)');
        expect(client360Panel).toContain('agencyOperatingSystem.enabledClient360ModuleIds');
        expect(client360Panel).toContain('agencyOperatingSystem.generatedModuleIds');
        expect(client360Panel).toContain('module.route');
        expect(client360Panel).toContain("t('dashboard.agency.client360.activity'");
        expect(client360Panel).toContain('ROUTES.AGENCY_BILLING');
        expect(client360Panel).toContain('ROUTES.AGENCY_REPORTS');
        expect(client360Panel).toContain('ROUTES.AGENCY_PROJECTS');
        expect(registry).toContain('AGENCY_ENGINE_CLIENT_360_MODULES');
        expect(registry).toContain("id: 'businessBlueprint'");
        expect(registry).toContain("id: 'website-builder'");
        expect(registry).toContain("id: 'storefront-builder'");
        expect(registry).toContain("id: 'ecommerce'");
        expect(registry).toContain("id: 'crm-leads'");
        expect(registry).toContain("id: 'email-marketing'");
        expect(registry).toContain("id: 'appointments'");
        expect(registry).toContain("id: 'restaurants'");
        expect(registry).toContain("id: 'realty'");
        expect(registry).toContain("id: 'bio-page'");
        expect(registry).toContain("id: 'chatcore'");
        expect(registry).toContain("id: 'media-ai'");
        expect(registry).toContain("id: 'finance'");
        expect(registry).toContain("id: 'analytics'");
    });

    it('hands Client 360 report generation to the Agency AI operating layer with client context', () => {
        expect(entryBridge).toContain("| 'agency_client_360'");
        expect(client360Panel).toContain('dispatchGlobalAssistantEntryRequest(createGlobalAssistantEntryPayload(prompt');
        expect(client360Panel).toContain("source: 'agency_client_360'");
        expect(client360Panel).toContain("sourceComponent: 'Client360Panel'");
        expect(client360Panel).toContain("activeModule: 'agency'");
        expect(client360Panel).toContain("quickActionId: 'create_agency_report'");
        expect(client360Panel).toContain("quickActionCategory: 'analyze'");
        expect(client360Panel).toContain('publishToClientPortal: true');
        expect(client360Panel).toContain("clientPortalDelivery: 'single_client'");
        expect(client360Panel).toContain("activeEntityType: 'agency_client'");
        expect(client360Panel).toContain('clientTenantId: client.id');
        expect(client360Panel).toContain('agencyOperatingSystemAvailable: Boolean(agencyOperatingSystem)');
        expect(client360Panel).toContain('agencyOperatingSystemModuleIds: agencyOperatingSystem?.enabledClient360ModuleIds || null');
        expect(client360Panel).toContain('activeModuleIds: activeModuleSignals.map(module => module.id)');
        expect(client360Panel).toContain('pendingModuleIds: pendingModuleSignals.map(module => module.id)');
        expect(client360Panel).toContain("'dashboard.agency.client360.generateAiReport'");
        expect(client360Panel).toContain("'dashboard.agency.client360.aiReportPrompt'");

        expect(globalAssistant).toContain('const activeEntityType = typeof entryMetadata.activeEntityType');
        expect(globalAssistant).toContain('activeEntityType,');
        expect(globalAssistant).toContain('activeEntityId,');
        expect(executionEngine).toContain("definition.actionType === 'create_agency_report'");
        expect(executionEngine).toContain('isAgencyClientEntityType(context.activeEntityType)');
        expect(executionEngine).toContain('actionInput.clientTenantId = clientTenantId');
        expect(executionEngine).toContain('actionInput.publishToClientPortal = publishToClientPortal');
    });

    it('surfaces Client Portal report delivery state in Client 360 and Command Center timelines', () => {
        expect(activityDisplay).toContain('getPortalReportDeliveryStatus');
        expect(activityDisplay).toContain("activity.type !== 'report_generated'");
        expect(activityDisplay).toContain('metadata.clientPortalVisible');
        expect(activityDisplay).toContain('metadata.portalPublicationStatus');
        expect(activityDisplay).toContain("status === 'published' || status === 'sent'");

        expect(client360Panel).toContain('getPortalReportDeliveryStatus(activity)');
        expect(client360Panel).toContain("dashboard.agency.client360.portalReportSent");
        expect(client360Panel).toContain("dashboard.agency.client360.portalReportPublished");

        expect(activityFeed).toContain('getPortalReportDeliveryStatus(activity)');
        expect(activityFeed).toContain("dashboard.agency.activityFeed.portalSent");
        expect(activityFeed).toContain("dashboard.agency.activityFeed.portalPublished");
        expect(docs).toContain('Agency Command Center and Client 360 consume the same `agency_activity.metadata.clientPortalVisible`');
    });

    it('feeds Agency Operating System module context into Global Assistant client snapshots', () => {
        expect(actionHandlers).toContain('const relationshipMetadata = asRecord(relationship.metadata)');
        expect(actionHandlers).toContain('const agencyOperatingSystem = asRecord(relationshipMetadata.agencyOperatingSystem)');
        expect(actionHandlers).toContain('enabledClient360ModuleIds');
        expect(actionHandlers).toContain('generatedModuleIds');
        expect(actionHandlers).toContain('agencyOperatingSystem: Object.keys(agencyOperatingSystem).length > 0 ? agencyOperatingSystem : null');
    });

    it('ships all Client 360 labels through ES, EN, and FR locale files', () => {
        const requiredKeys = Array.from(new Set([
            ...Array.from(client360Panel.matchAll(/dashboard\.agency\.client360(?:\.[A-Za-z0-9]+)+/g)),
            ...Array.from(registry.matchAll(/dashboard\.agency\.client360(?:\.[A-Za-z0-9]+)+/g)),
        ]))
            .map(match => match[0]);
        const locales = {
            es: readJson('locales/es/translation.json'),
            en: readJson('locales/en/translation.json'),
            fr: readJson('locales/fr/translation.json'),
        };

        for (const [locale, messages] of Object.entries(locales)) {
            for (const key of requiredKeys) {
                expect(getNestedValue(messages, key), `${locale}:${key}`).toEqual(expect.any(String));
            }
        }
    });

    it('tracks the documented AG2 Client 360 consolidation item', () => {
        expect(docs).toContain('AG2 Client 360 UX consolidation');
        expect(docs).toContain('Client 360');
    });
});
