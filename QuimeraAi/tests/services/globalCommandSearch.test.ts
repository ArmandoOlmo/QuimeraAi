import { describe, expect, it } from 'vitest';
import { buildGlobalCommandItems } from '../../services/globalAssistant/globalCommandSearch.ts';
import enTranslations from '../../locales/en/translation.json';
import esTranslations from '../../locales/es/translation.json';
import frTranslations from '../../locales/fr/translation.json';
import ptTranslations from '../../locales/pt/translation.json';

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
    for (const translations of [enTranslations, esTranslations, frTranslations, ptTranslations] as Record<string, any>[]) {
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

    it('filters disabled services and admin commands', () => {
        const items = buildGlobalCommandItems({
            query: 'admin email ecommerce',
            projects,
            activeProjectId: 'project-1',
            canAccessAdmin: false,
            canAccessService: serviceId => serviceId !== 'emailMarketing' && serviceId !== 'ecommerce',
        });

        expect(items.some(item => item.id === 'nav:email')).toBe(false);
        expect(items.some(item => item.id === 'nav:ecommerce')).toBe(false);
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
