import { describe, expect, it } from 'vitest';
import type { BusinessBlueprint } from '../../types/businessBlueprint';
import {
    createBlueprintSnapshot,
    createSnapshotBeforeManualSave,
    createSnapshotBeforeRegeneration,
    diffBlueprintSnapshots,
    getSnapshotLabel,
    getSnapshotSummary,
    getBlueprintSnapshots,
    restoreBlueprintModule,
    restoreBlueprintSection,
    restoreBlueprintSnapshot,
} from '../../utils/businessBlueprint';

const moduleState = (overrides: Record<string, unknown> = {}) => ({
    enabled: true,
    status: 'generated',
    needsReview: false,
    readiness: { isReady: true, blockers: [], warnings: [] },
    metadata: {
        generatedBy: 'ai',
        userModified: false,
        generatedAt: '2026-06-27T10:00:00.000Z',
    },
    ...overrides,
});

function buildBlueprint(overrides: Record<string, unknown> = {}): BusinessBlueprint {
    return {
        blueprintVersion: '1.0.0',
        schemaVersion: 1,
        generatedAt: '2026-06-27T10:00:00.000Z',
        updatedAt: '2026-06-27T10:00:00.000Z',
        source: 'manual',
        projectId: 'project-1',
        status: 'generated',
        readiness: { isReady: true, blockers: [], warnings: [] },
        sourceMap: {},
        metadata: {
            generatedBy: 'ai',
            userModified: false,
            generatedAt: '2026-06-27T10:00:00.000Z',
        },
        businessProfile: {
            ...moduleState(),
            businessName: 'Current Co',
            industry: 'services',
            description: 'Current description',
            services: [],
            contactInfo: {},
        },
        brandProfile: {
            ...moduleState(),
            colors: { primary: '#111111' },
        },
        websiteBlueprint: {
            ...moduleState(),
            pages: [{ id: 'home', title: 'Home', slug: '/', sections: ['hero'] }],
            sections: ['hero'],
            sectionBlueprints: [
                {
                    ...moduleState(),
                    id: 'hero-main',
                    type: 'hero',
                    order: 0,
                    visible: true,
                    settings: { headline: 'Current headline' },
                },
            ],
            ecommerceBlocks: [],
        },
        storefrontBlueprint: {
            ...moduleState(),
            routeStrategy: 'project-store',
            sections: [{ ...moduleState(), id: 'store-hero', type: 'hero', order: 0 }],
            templates: {},
        },
        ecommerceBlueprint: {
            ...moduleState(),
            categories: ['Current'],
            starterProducts: [],
            inventoryMode: 'manual',
            fulfillmentMode: 'shipping',
            discounts: [],
            giftCards: { enabled: false, status: 'draft' },
        },
        chatbotBlueprint: moduleState(),
        leadBlueprint: moduleState(),
        emailMarketingBlueprint: { ...moduleState(), flows: [], logEvents: [] },
        mediaBlueprint: { ...moduleState(), imageNeeds: [], videoNeeds: [], brandAssetNeeds: [] },
        appointmentsBlueprint: moduleState(),
        restaurantBlueprint: moduleState(),
        realEstateBlueprint: moduleState(),
        financeBlueprint: { ...moduleState(), trackedMetrics: [], revenueSources: [], refundSources: [] },
        analyticsBlueprint: { ...moduleState(), events: [], dashboards: [] },
        automationBlueprint: { ...moduleState(), flows: [] },
        ...overrides,
    } as unknown as BusinessBlueprint;
}

describe('blueprint version history', () => {
    it('creates a snapshot without embedding existing history', () => {
        const projectData = {
            data: { hero: { headline: 'Current' } },
            businessBlueprint: buildBlueprint(),
            versionHistory: { blueprintSnapshots: [{ id: 'old' }] },
        };

        const snapshot = createBlueprintSnapshot({
            projectId: 'project-1',
            projectData,
            source: 'manual_save',
            changeType: 'manual_checkpoint',
            now: '2026-06-27T12:00:00.000Z',
            metadata: {
                tenantId: 'tenant-1',
                createdBy: 'user-1',
            },
        });

        expect(snapshot.projectId).toBe('project-1');
        expect(snapshot.tenantId).toBe('tenant-1');
        expect(snapshot.createdBy).toBe('user-1');
        expect(snapshot.blueprintVersion).toBe('1.0.0');
        expect(snapshot.title).toBe(snapshot.label);
        expect(snapshot.businessBlueprint?.websiteBlueprint).toBeTruthy();
        expect(snapshot.snapshotData.versionHistory).toBeUndefined();
    });

    it('creates and appends a before-regeneration snapshot', () => {
        const projectData = {
            data: { hero: { headline: 'Before AI' } },
            businessBlueprint: buildBlueprint(),
        };

        const { snapshot, nextProjectData } = createSnapshotBeforeRegeneration(projectData, {
            projectId: 'project-1',
            moduleKey: 'websiteBlueprint',
            now: '2026-06-27T12:00:00.000Z',
        });

        expect(snapshot.changeType).toBe('before_regeneration');
        expect(snapshot.moduleKey).toBe('websiteBlueprint');
        expect(getBlueprintSnapshots(nextProjectData)).toHaveLength(1);
    });

    it('creates a manual checkpoint before an editor save changes the draft', () => {
        const projectData = {
            data: { hero: { headline: 'Before manual edit' } },
            businessBlueprint: buildBlueprint(),
            lastUpdated: '2026-06-27T11:00:00.000Z',
        };
        const nextDraft = {
            ...projectData,
            data: { hero: { headline: 'After manual edit' } },
            lastUpdated: '2026-06-27T12:00:00.000Z',
        };

        const { snapshot, nextProjectData, skipped } = createSnapshotBeforeManualSave(projectData, {
            projectId: 'project-1',
            now: '2026-06-27T12:00:00.000Z',
            nextProjectData: nextDraft,
            metadata: {
                createdBy: 'user-1',
                actionType: 'editor_manual_save',
            },
        });

        expect(skipped).toBe(false);
        expect(snapshot?.source).toBe('manual_save');
        expect(snapshot?.changeType).toBe('manual_checkpoint');
        expect(snapshot?.snapshotData.data).toEqual({ hero: { headline: 'Before manual edit' } });
        expect(getBlueprintSnapshots(nextProjectData)).toHaveLength(1);
    });

    it('skips manual checkpoints when only volatile save timestamps changed', () => {
        const projectData = {
            data: { hero: { headline: 'Same content' } },
            businessBlueprint: buildBlueprint(),
            lastUpdated: '2026-06-27T11:00:00.000Z',
        };
        const nextDraft = {
            ...projectData,
            lastUpdated: '2026-06-27T12:00:00.000Z',
        };

        const { snapshot, nextProjectData, skipped } = createSnapshotBeforeManualSave(projectData, {
            projectId: 'project-1',
            now: '2026-06-27T12:00:00.000Z',
            nextProjectData: nextDraft,
        });

        expect(skipped).toBe(true);
        expect(snapshot).toBeNull();
        expect(getBlueprintSnapshots(nextProjectData)).toHaveLength(0);
    });

    it('labels Agency Project Transfer checkpoints', () => {
        const checkpoint = {
            source: 'agency_transfer' as const,
            scope: 'project' as const,
            changeType: 'transfer_checkpoint' as const,
        };

        expect(getSnapshotLabel(checkpoint)).toBe('Agency transfer checkpoint: project');
        expect(getSnapshotSummary(checkpoint)).toBe('Captured the project before Agency Project Transfer.');
    });

    it('restores a full project while preserving protected modules', () => {
        const previousBlueprint = buildBlueprint({
            websiteBlueprint: {
                ...buildBlueprint().websiteBlueprint,
                sectionBlueprints: [
                    {
                        ...moduleState(),
                        id: 'hero-main',
                        type: 'hero',
                        order: 0,
                        visible: true,
                        settings: { headline: 'Snapshot headline' },
                    },
                ],
            },
            ecommerceBlueprint: {
                ...buildBlueprint().ecommerceBlueprint,
                categories: ['Snapshot category'],
            },
        });
        const currentBlueprint = buildBlueprint({
            websiteBlueprint: {
                ...buildBlueprint().websiteBlueprint,
                metadata: {
                    generatedBy: 'user',
                    userModified: true,
                    lockedFromRegeneration: true,
                },
                sectionBlueprints: [
                    {
                        ...moduleState(),
                        id: 'hero-main',
                        type: 'hero',
                        order: 0,
                        visible: true,
                        settings: { headline: 'Manual headline' },
                    },
                ],
            },
            ecommerceBlueprint: {
                ...buildBlueprint().ecommerceBlueprint,
                categories: ['Current category'],
            },
        });
        const snapshot = createBlueprintSnapshot({
            projectId: 'project-1',
            projectData: { data: {}, businessBlueprint: previousBlueprint },
            source: 'ai_regeneration',
            changeType: 'before_regeneration',
        });

        const result = restoreBlueprintSnapshot(
            { data: {}, businessBlueprint: currentBlueprint },
            snapshot,
            { scope: 'project' },
        );
        const restoredBlueprint = result.nextProjectData.businessBlueprint as BusinessBlueprint;

        expect(result.restored).toBe(true);
        expect(result.protectedPaths).toContain('businessBlueprint.websiteBlueprint');
        expect(restoredBlueprint.websiteBlueprint.sectionBlueprints?.[0]?.settings).toEqual({ headline: 'Manual headline' });
        expect(restoredBlueprint.ecommerceBlueprint.categories).toEqual(['Snapshot category']);
    });

    it('restores a module and blocks protected modules without confirmation', () => {
        const snapshot = createBlueprintSnapshot({
            projectId: 'project-1',
            projectData: {
                data: {},
                businessBlueprint: buildBlueprint({
                    ecommerceBlueprint: {
                        ...buildBlueprint().ecommerceBlueprint,
                        categories: ['Snapshot'],
                    },
                }),
            },
            source: 'ai_regeneration',
            changeType: 'before_regeneration',
        });
        const currentBlueprint = buildBlueprint({
            ecommerceBlueprint: {
                ...buildBlueprint().ecommerceBlueprint,
                categories: ['Manual'],
                metadata: {
                    generatedBy: 'user',
                    userModified: true,
                    lockedFromRegeneration: true,
                },
            },
        });

        const skipped = restoreBlueprintModule({ data: {}, businessBlueprint: currentBlueprint }, snapshot, 'ecommerceBlueprint');
        const restored = restoreBlueprintModule(
            { data: {}, businessBlueprint: currentBlueprint },
            snapshot,
            'ecommerceBlueprint',
            { confirmOverwriteProtected: true },
        );

        expect(skipped.restored).toBe(false);
        expect(skipped.protectedPaths).toContain('businessBlueprint.ecommerceBlueprint');
        expect((restored.nextProjectData.businessBlueprint as BusinessBlueprint).ecommerceBlueprint.categories).toEqual(['Snapshot']);
    });

    it('restores a section by id and respects locked sections', () => {
        const snapshot = createBlueprintSnapshot({
            projectId: 'project-1',
            projectData: {
                data: {},
                businessBlueprint: buildBlueprint({
                    websiteBlueprint: {
                        ...buildBlueprint().websiteBlueprint,
                        sectionBlueprints: [
                            {
                                ...moduleState(),
                                id: 'hero-main',
                                type: 'hero',
                                order: 0,
                                visible: true,
                                settings: { headline: 'Snapshot headline' },
                            },
                        ],
                    },
                }),
            },
            source: 'ai_regeneration',
            changeType: 'before_regeneration',
        });
        const currentBlueprint = buildBlueprint({
            websiteBlueprint: {
                ...buildBlueprint().websiteBlueprint,
                sectionBlueprints: [
                    {
                        ...moduleState({ metadata: { generatedBy: 'user', userModified: true, lockedFromRegeneration: true } }),
                        id: 'hero-main',
                        type: 'hero',
                        order: 0,
                        visible: true,
                        settings: { headline: 'Manual headline' },
                    },
                ],
            },
        });

        const skipped = restoreBlueprintSection({ data: {}, businessBlueprint: currentBlueprint }, snapshot, 'hero-main');
        const restored = restoreBlueprintSection(
            { data: {}, businessBlueprint: currentBlueprint },
            snapshot,
            'hero-main',
            { confirmOverwriteProtected: true },
        );

        expect(skipped.restored).toBe(false);
        expect((restored.nextProjectData.businessBlueprint as BusinessBlueprint).websiteBlueprint.sectionBlueprints?.[0]?.settings).toEqual({ headline: 'Snapshot headline' });
    });

    it('returns a basic diff between current data and a snapshot', () => {
        const snapshot = createBlueprintSnapshot({
            projectId: 'project-1',
            projectData: {
                data: { hero: { headline: 'Snapshot' } },
                businessBlueprint: buildBlueprint(),
            },
            source: 'manual_save',
            changeType: 'manual_checkpoint',
        });

        const diff = diffBlueprintSnapshots(
            {
                data: { hero: { headline: 'Current' } },
                businessBlueprint: buildBlueprint({
                    analyticsBlueprint: { ...buildBlueprint().analyticsBlueprint, dashboards: ['Current dashboard'] },
                }),
            },
            snapshot,
        );

        expect(diff.changedPaths).toContain('data.hero.headline');
        expect(diff.changedModules).toContain('analyticsBlueprint');
        expect(diff.summary).toContain('changed path');
    });
});
