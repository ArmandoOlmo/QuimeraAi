import { describe, expect, it } from 'vitest';
import { buildGlobalCommandItems } from '../../services/globalAssistant/globalCommandSearch.ts';
import enTranslations from '../../locales/en/translation.json';
import esTranslations from '../../locales/es/translation.json';

const projects = [
    {
        id: 'project-2',
        name: 'Bikeca',
        status: 'Draft',
        tenantId: 'tenant-1',
        userId: 'user-1',
    },
    {
        id: 'project-1',
        name: 'Casa Luna',
        status: 'Published',
        tenantId: 'tenant-1',
        userId: 'user-1',
    },
] as any[];

const getTranslationValue = (translations: Record<string, any>, key: string): unknown =>
    key.split('.').reduce<unknown>((current, segment) => {
        if (!current || typeof current !== 'object') return undefined;
        return (current as Record<string, unknown>)[segment];
    }, translations);

const expectTranslatedKey = (key: string) => {
    for (const translations of [enTranslations, esTranslations] as Record<string, any>[]) {
        const value = getTranslationValue(translations, key);
        expect(value, key).toEqual(expect.any(String));
        expect((value as string).trim(), key).not.toBe('');
    }
};

describe('globalCommandSearch', () => {
    it('puts a freeform assistant request at the top for non-empty queries', () => {
        const items = buildGlobalCommandItems({
            query: 'genera una imagen para el hero',
            projects,
            activeProjectId: 'project-1',
            canAccessAdmin: false,
            canAccessService: () => true,
        });

        expect(items[0]).toMatchObject({
            id: 'assistant:request',
            type: 'assistant_request',
            prompt: 'genera una imagen para el hero',
        });
        expect(items.find(item => item.id === 'action:generate-image')).toMatchObject({
            assistantModule: 'media',
        });
    });

    it('filters disabled services and admin commands while keeping core website navigation', () => {
        const items = buildGlobalCommandItems({
            query: 'admin ai studio edit website email ecommerce bio page',
            projects,
            activeProjectId: 'project-1',
            canAccessAdmin: false,
            canAccessService: serviceId => (
                serviceId !== 'aiFeatures'
                && serviceId !== 'emailMarketing'
                && serviceId !== 'ecommerce'
                && serviceId !== 'bioPage'
            ),
        });

        expect(items.some(item => item.id === 'action:create-website')).toBe(false);
        expect(items.some(item => item.id === 'action:generate-image')).toBe(false);
        expect(items.some(item => item.id === 'nav:assets')).toBe(false);
        expect(items.some(item => item.id === 'nav:email')).toBe(false);
        expect(items.some(item => item.id === 'nav:ecommerce')).toBe(false);
        expect(items.some(item => item.id === 'nav:biopage')).toBe(false);
        expect(items.some(item => item.id === 'action:create-bio-page')).toBe(false);
        expect(items.some(item => item.id === 'action:edit-website')).toBe(true);
        expect(items.some(item => item.id === 'nav:editor')).toBe(true);
        expect(items.some(item => item.type === 'admin')).toBe(false);
        expect(items[0].type).toBe('assistant_request');
    });

    it('prioritizes the active project and excludes templates/deleted projects', () => {
        const items = buildGlobalCommandItems({
            query: '',
            projects: [
                ...projects,
                { id: 'template-1', name: 'Template', status: 'Template' },
                { id: 'deleted-1', name: 'Deleted', status: 'Draft', deletedAt: '2026-06-26T12:00:00.000Z' },
            ] as any[],
            activeProjectId: 'project-1',
            canAccessAdmin: true,
            canAccessService: () => true,
        });

        const projectItems = items.filter(item => item.type === 'project');
        expect(projectItems[0]).toMatchObject({ id: 'project:project-1', label: 'Casa Luna' });
        expect(projectItems.map(item => item.id)).not.toContain('project:template-1');
        expect(projectItems.map(item => item.id)).not.toContain('project:deleted-1');
    });

    it('ignores malformed project entries instead of crashing the palette search', () => {
        const items = buildGlobalCommandItems({
            query: 'project',
            projects: [
                null,
                undefined,
                { name: 'Missing ID', status: 'Draft' },
                { id: 'project-4', name: 42, status: 'Draft' },
            ] as any[],
            activeProjectId: 'project-4',
            canAccessAdmin: true,
            canAccessService: () => true,
        });

        const projectItems = items.filter(item => item.type === 'project');
        expect(projectItems).toHaveLength(1);
        expect(projectItems[0]).toMatchObject({
            id: 'project:project-4',
            label: '42',
            projectId: 'project-4',
        });
    });

    it('ignores a malformed project collection instead of crashing the palette search', () => {
        expect(() => buildGlobalCommandItems({
            query: 'dashboard',
            projects: { id: 'not-an-array' } as any,
            canAccessAdmin: true,
            canAccessService: () => true,
        })).not.toThrow();
    });

    it('omits project-required commands when no project is active', () => {
        const items = buildGlobalCommandItems({
            query: 'edit website',
            projects,
            activeProjectId: null,
            canAccessAdmin: true,
            canAccessService: () => true,
        });

        expect(items.some(item => item.id === 'nav:editor')).toBe(false);
        expect(items.some(item => item.id === 'action:edit-website')).toBe(false);
        expect(items[0].type).toBe('assistant_request');
    });

    it('exposes guide-only command-center actions for supporting modules', () => {
        const items = buildGlobalCommandItems({
            query: 'blog domains seo finance agency restaurants realty owner',
            projects,
            activeProjectId: 'project-1',
            canAccessAdmin: true,
            canAccessService: () => true,
            maxItems: 100,
        });

        expect(items).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'action:use-blog-hub', type: 'action', assistantModule: 'website' }),
            expect.objectContaining({ id: 'action:use-domains', type: 'action', assistantModule: 'settings' }),
            expect.objectContaining({ id: 'action:use-seo', type: 'action', assistantModule: 'website' }),
            expect.objectContaining({ id: 'action:use-finance', type: 'action', assistantModule: 'finance' }),
            expect.objectContaining({ id: 'action:use-agency', type: 'action', assistantModule: 'agency', serviceId: 'agency' }),
            expect.objectContaining({ id: 'action:use-restaurants', type: 'action', assistantModule: 'restaurants' }),
            expect.objectContaining({ id: 'action:use-realty', type: 'action', assistantModule: 'realEstate' }),
            expect.objectContaining({ id: 'action:use-owner-mode', type: 'action', assistantModule: 'admin', requiresAdmin: true }),
        ]));
        expect(items.find(item => item.id === 'action:use-blog-hub')?.prompt).toBe('Blog Hub');
        expect(items.find(item => item.id === 'action:use-domains')?.prompt).toBe('Domains');
        expect(items.find(item => item.id === 'action:use-agency')?.prompt).toBe('Open Agency Command Center');
    });

    it('surfaces Agency Engine operating actions through Global Assistant prompts', () => {
        const items = buildGlobalCommandItems({
            query: 'agency create client search clients client 360 performance report transfer project',
            projects,
            activeProjectId: 'project-1',
            canAccessAdmin: false,
            canAccessService: () => true,
            maxItems: 100,
        });

        const agencyActionIds = [
            'action:use-agency',
            'action:agency-create-client',
            'action:agency-client-360',
            'action:agency-search-clients',
            'action:agency-performance-summary',
            'action:agency-create-report',
            'action:agency-transfer-project',
        ];

        expect(items).toEqual(expect.arrayContaining(
            agencyActionIds.map(id => expect.objectContaining({
                id,
                type: 'action',
                assistantModule: 'agency',
                serviceId: 'agency',
            })),
        ));
        expect(items.find(item => item.id === 'action:agency-create-client')?.prompt)
            .toBe('Create a new agency client with AI provisioning');
        expect(items.find(item => item.id === 'action:agency-search-clients')?.prompt)
            .toBe('Search agency clients by name, email, lifecycle, billing, or service plan');
        expect(items.find(item => item.id === 'action:agency-transfer-project')?.prompt)
            .toBe('Transfer an agency project to a managed client');
    });

    it('keeps project and admin boundaries for new guide-only command actions', () => {
        const noProjectItems = buildGlobalCommandItems({
            query: 'cms domains finance templates agency owner',
            projects,
            activeProjectId: null,
            canAccessAdmin: false,
            canAccessService: () => true,
            maxItems: 100,
        });

        expect(noProjectItems.some(item => item.id === 'action:use-cms')).toBe(false);
        expect(noProjectItems.some(item => item.id === 'action:use-domains')).toBe(false);
        expect(noProjectItems.some(item => item.id === 'action:use-finance')).toBe(false);
        expect(noProjectItems.some(item => item.id === 'action:use-owner-mode')).toBe(false);
        expect(noProjectItems).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'action:use-templates', assistantModule: 'project' }),
            expect.objectContaining({ id: 'action:use-agency', assistantModule: 'agency' }),
        ]));

        const noAgencyServiceItems = buildGlobalCommandItems({
            query: 'agency command center',
            projects,
            activeProjectId: null,
            canAccessAdmin: true,
            canAccessService: serviceId => serviceId !== 'agency',
            maxItems: 100,
        });

        expect(noAgencyServiceItems.some(item => item.id === 'action:use-agency')).toBe(false);
        expect(noAgencyServiceItems.some(item => item.id === 'action:agency-create-client')).toBe(false);
        expect(noAgencyServiceItems.some(item => item.id === 'action:agency-client-360')).toBe(false);
        expect(noAgencyServiceItems.some(item => item.id === 'action:agency-search-clients')).toBe(false);
        expect(noAgencyServiceItems.some(item => item.id === 'action:agency-performance-summary')).toBe(false);
        expect(noAgencyServiceItems.some(item => item.id === 'action:agency-create-report')).toBe(false);
        expect(noAgencyServiceItems.some(item => item.id === 'action:agency-transfer-project')).toBe(false);
        expect(noAgencyServiceItems.some(item => item.id === 'nav:agency')).toBe(false);
    });

    it('exposes i18n keys for command labels, descriptions, and prompts', () => {
        const items = [
            ...buildGlobalCommandItems({
                query: '',
                projects: [
                    ...projects,
                    { id: 'project-3', name: '', status: 'Draft' },
                ] as any[],
                activeProjectId: 'project-1',
                canAccessAdmin: true,
                canAccessService: () => true,
                maxItems: 100,
            }),
            ...buildGlobalCommandItems({
                query: 'crear imagen',
                projects,
                activeProjectId: 'project-1',
                canAccessAdmin: true,
                canAccessService: () => true,
                maxItems: 100,
            }),
            ...buildGlobalCommandItems({
                query: 'agency command center',
                projects,
                activeProjectId: 'project-1',
                canAccessAdmin: true,
                canAccessService: () => true,
                maxItems: 100,
            }),
        ];

        expect(items.some(item => item.id === 'action:train-chatcore')).toBe(true);
        expect(items.some(item => item.id === 'assistant:request')).toBe(true);
        expect(items.find(item => item.id === 'action:train-chatcore')).toMatchObject({
            assistantModule: 'chatbot',
        });

        for (const item of items) {
            if (item.labelKey) expectTranslatedKey(item.labelKey);
            if (item.descriptionKey) expectTranslatedKey(item.descriptionKey);
            if (item.promptKey) expectTranslatedKey(item.promptKey);
        }
    });
});
