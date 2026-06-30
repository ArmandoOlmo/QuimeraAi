import type {
    BusinessBlueprint,
    BusinessBlueprintModuleKey,
    BlueprintModuleState,
} from '../../types/businessBlueprint';
import type {
    BlueprintSnapshot,
    BlueprintSnapshotScope,
    BlueprintVersionHistory,
    RestoreResult,
    RestoreTarget,
    SnapshotChangeType,
    SnapshotDiff,
    SnapshotMetadata,
    SnapshotSource,
} from '../../types/versionHistory';
import { shouldProtectFromRegeneration as shouldProtectBlueprintModule } from './adapters.js';

export const BLUEPRINT_VERSION_HISTORY_KEY = 'versionHistory';
export const BLUEPRINT_SNAPSHOT_LIMIT = 50;

const BUSINESS_BLUEPRINT_MODULE_KEYS: BusinessBlueprintModuleKey[] = [
    'businessProfile',
    'brandProfile',
    'websiteBlueprint',
    'storefrontBlueprint',
    'ecommerceBlueprint',
    'chatbotBlueprint',
    'leadBlueprint',
    'emailMarketingBlueprint',
    'mediaBlueprint',
    'bioPageBlueprint',
    'appointmentsBlueprint',
    'restaurantBlueprint',
    'realEstateBlueprint',
    'financeBlueprint',
    'analyticsBlueprint',
    'automationBlueprint',
];

const ASSISTANT_MODULE_TO_BLUEPRINT_MODULE: Record<string, BusinessBlueprintModuleKey | undefined> = {
    businessBlueprint: undefined,
    aiStudio: undefined,
    project: undefined,
    website: 'websiteBlueprint',
    storefront: 'storefrontBlueprint',
    ecommerce: 'ecommerceBlueprint',
    chatbot: 'chatbotBlueprint',
    crm: 'leadBlueprint',
    emailMarketing: 'emailMarketingBlueprint',
    analytics: 'analyticsBlueprint',
    media: 'mediaBlueprint',
    appointments: 'appointmentsBlueprint',
    restaurants: 'restaurantBlueprint',
    realEstate: 'realEstateBlueprint',
    bioPage: 'bioPageBlueprint',
    finance: 'financeBlueprint',
    designSystem: 'brandProfile',
};

interface CreateBlueprintSnapshotInput {
    projectId: string;
    projectData?: Record<string, unknown>;
    businessBlueprint?: BusinessBlueprint | null;
    scope?: BlueprintSnapshotScope;
    moduleKey?: BusinessBlueprintModuleKey;
    sectionId?: string;
    source?: SnapshotSource;
    changeType?: SnapshotChangeType;
    now?: string;
    metadata?: SnapshotMetadata;
}

interface CreateSnapshotBeforeRegenerationInput extends Omit<CreateBlueprintSnapshotInput, 'source' | 'changeType'> {
    source?: SnapshotSource;
}

interface CreateSnapshotBeforeManualSaveInput extends Omit<CreateBlueprintSnapshotInput, 'source' | 'changeType' | 'projectData'> {
    nextProjectData?: Record<string, unknown>;
}

interface RestoreOptions {
    confirmOverwriteProtected?: boolean;
    restoredAt?: string;
}

const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const createSnapshotId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `snapshot_${crypto.randomUUID()}`;
    }
    return `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const isBlueprintModuleKey = (value: unknown): value is BusinessBlueprintModuleKey =>
    typeof value === 'string' && BUSINESS_BLUEPRINT_MODULE_KEYS.includes(value as BusinessBlueprintModuleKey);

export function mapAssistantModuleToBlueprintModuleKey(module?: string | null): BusinessBlueprintModuleKey | undefined {
    return module ? ASSISTANT_MODULE_TO_BLUEPRINT_MODULE[module] : undefined;
}

export function getProjectDataBusinessBlueprint(projectData: unknown): BusinessBlueprint | null {
    const data = asRecord(projectData);
    const nestedData = asRecord(data.data);
    return (data.businessBlueprint || nestedData.businessBlueprint || null) as BusinessBlueprint | null;
}

function setProjectDataBusinessBlueprint(
    projectData: Record<string, unknown>,
    businessBlueprint: BusinessBlueprint,
): Record<string, unknown> {
    const nestedData = asRecord(projectData.data);
    return {
        ...projectData,
        businessBlueprint,
        ...(Object.keys(nestedData).length
            ? { data: { ...nestedData, ...(nestedData.businessBlueprint ? { businessBlueprint } : {}) } }
            : {}),
    };
}

function stripVersionHistory(projectData: Record<string, unknown>): Record<string, unknown> {
    const copy = clone(projectData);
    delete copy[BLUEPRINT_VERSION_HISTORY_KEY];
    delete copy.blueprintSnapshots;
    return copy;
}

function stripVolatileSnapshotFields(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(item => stripVolatileSnapshotFields(item));
    }
    if (!value || typeof value !== 'object') return value;

    const output: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
        if (
            key === BLUEPRINT_VERSION_HISTORY_KEY ||
            key === 'blueprintSnapshots' ||
            key === 'lastUpdated' ||
            key === 'last_updated' ||
            key === 'updatedAt' ||
            key === 'updated_at'
        ) {
            return;
        }
        output[key] = stripVolatileSnapshotFields(entry);
    });
    return output;
}

export function hasMeaningfulSnapshotDataChange(
    currentProjectData: Record<string, unknown>,
    nextProjectData: Record<string, unknown>,
): boolean {
    return JSON.stringify(stripVolatileSnapshotFields(stripVersionHistory(currentProjectData))) !==
        JSON.stringify(stripVolatileSnapshotFields(stripVersionHistory(nextProjectData)));
}

function withVersionHistory(
    projectData: Record<string, unknown>,
    versionHistory: BlueprintVersionHistory,
): Record<string, unknown> {
    return {
        ...projectData,
        [BLUEPRINT_VERSION_HISTORY_KEY]: versionHistory,
    };
}

export function getBlueprintSnapshots(projectData: unknown): BlueprintSnapshot[] {
    const history = asRecord(asRecord(projectData)[BLUEPRINT_VERSION_HISTORY_KEY]);
    return asArray(history.blueprintSnapshots).filter(Boolean) as BlueprintSnapshot[];
}

export function getBlueprintVersionHistory(projectData: unknown): BlueprintVersionHistory {
    const history = asRecord(asRecord(projectData)[BLUEPRINT_VERSION_HISTORY_KEY]);
    return {
        blueprintSnapshots: getBlueprintSnapshots(projectData),
        lastSnapshotAt: typeof history.lastSnapshotAt === 'string' ? history.lastSnapshotAt : undefined,
        lastRestoredAt: typeof history.lastRestoredAt === 'string' ? history.lastRestoredAt : undefined,
        lastRestoredSnapshotId: typeof history.lastRestoredSnapshotId === 'string' ? history.lastRestoredSnapshotId : undefined,
    };
}

export function appendBlueprintSnapshot(
    projectData: Record<string, unknown>,
    snapshot: BlueprintSnapshot,
    limit = BLUEPRINT_SNAPSHOT_LIMIT,
): Record<string, unknown> {
    const history = getBlueprintVersionHistory(projectData);
    const snapshots = [
        snapshot,
        ...history.blueprintSnapshots.filter(item => item.id !== snapshot.id),
    ].slice(0, Math.max(1, limit));

    return withVersionHistory(projectData, {
        ...history,
        blueprintSnapshots: snapshots,
        lastSnapshotAt: snapshot.createdAt,
    });
}

function resolveSnapshotBusinessBlueprint(input: CreateBlueprintSnapshotInput): BusinessBlueprint | null {
    return input.businessBlueprint || getProjectDataBusinessBlueprint(input.projectData) || null;
}

function resolveSnapshotScope(input: CreateBlueprintSnapshotInput): BlueprintSnapshotScope {
    if (input.scope) return input.scope;
    if (input.sectionId) return 'section';
    if (input.moduleKey) return 'module';
    return 'project';
}

export function getSnapshotLabel(snapshot: Pick<BlueprintSnapshot, 'source' | 'scope' | 'moduleKey' | 'sectionId' | 'changeType'>): string {
    const sourceLabel: Record<SnapshotSource, string> = {
        ai_regeneration: 'AI regeneration',
        ai_action: 'AI action',
        manual_save: 'Manual save',
        publish: 'Publish',
        restore: 'Restore',
        agency_transfer: 'Agency transfer',
        system: 'System',
        import: 'Import',
    };
    const changeLabel: Record<SnapshotChangeType, string> = {
        before_regeneration: 'before regeneration',
        before_restore: 'before restore',
        transfer_checkpoint: 'transfer checkpoint',
        manual_checkpoint: 'manual checkpoint',
        publish_checkpoint: 'publish checkpoint',
        system_checkpoint: 'system checkpoint',
    };
    const target = snapshot.sectionId
        ? `section ${snapshot.sectionId}`
        : snapshot.moduleKey || snapshot.scope;
    if (snapshot.source === 'agency_transfer' && snapshot.changeType === 'transfer_checkpoint') {
        return `Agency transfer checkpoint: ${target}`;
    }
    return `${sourceLabel[snapshot.source]} ${changeLabel[snapshot.changeType]}: ${target}`;
}

export function getSnapshotSummary(snapshot: Pick<BlueprintSnapshot, 'scope' | 'moduleKey' | 'sectionId' | 'source' | 'changeType'>): string {
    if (snapshot.source === 'agency_transfer') return 'Captured the project before Agency Project Transfer.';
    if (snapshot.sectionId) return `Captured section ${snapshot.sectionId} before changes.`;
    if (snapshot.moduleKey) return `Captured ${snapshot.moduleKey} before changes.`;
    if (snapshot.scope === 'businessBlueprint') return 'Captured the Business Blueprint before changes.';
    return 'Captured the full project data before changes.';
}

export function createBlueprintSnapshot(input: CreateBlueprintSnapshotInput): BlueprintSnapshot {
    const now = input.now || new Date().toISOString();
    const businessBlueprint = resolveSnapshotBusinessBlueprint(input);
    const scope = resolveSnapshotScope(input);
    const source = input.source || 'system';
    const changeType = input.changeType || 'system_checkpoint';
    const snapshotData = input.projectData
        ? stripVersionHistory(input.projectData)
        : businessBlueprint
            ? { businessBlueprint }
            : {};

    const partial = {
        source,
        scope,
        moduleKey: input.moduleKey,
        sectionId: input.sectionId,
        changeType,
    };

    const label = input.metadata?.label as string || getSnapshotLabel(partial);
    const summary = input.metadata?.summary as string || getSnapshotSummary(partial);

    return {
        id: createSnapshotId(),
        projectId: input.projectId,
        ...(input.metadata?.tenantId !== undefined ? { tenantId: input.metadata.tenantId as string | null } : {}),
        ...(businessBlueprint?.blueprintVersion ? { blueprintVersion: businessBlueprint.blueprintVersion } : {}),
        createdAt: now,
        ...(input.metadata?.createdBy !== undefined ? { createdBy: input.metadata.createdBy as string | null } : {}),
        source,
        scope,
        changeType,
        ...(input.moduleKey ? { moduleKey: input.moduleKey } : {}),
        ...(input.sectionId ? { sectionId: input.sectionId } : {}),
        title: label,
        description: summary,
        label,
        summary,
        metadata: {
            ...(input.metadata || {}),
            ...(input.moduleKey ? { moduleKey: input.moduleKey } : {}),
            ...(input.sectionId ? { sectionId: input.sectionId } : {}),
        },
        snapshotData,
        ...(businessBlueprint ? { businessBlueprint } : {}),
    };
}

export function createSnapshotBeforeRegeneration(
    projectData: Record<string, unknown>,
    input: CreateSnapshotBeforeRegenerationInput,
): { snapshot: BlueprintSnapshot; nextProjectData: Record<string, unknown> } {
    const snapshot = createBlueprintSnapshot({
        ...input,
        projectData,
        source: input.source || 'ai_regeneration',
        changeType: 'before_regeneration',
    });

    return {
        snapshot,
        nextProjectData: appendBlueprintSnapshot(projectData, snapshot),
    };
}

export function createSnapshotBeforeManualSave(
    projectData: Record<string, unknown>,
    input: CreateSnapshotBeforeManualSaveInput,
): { snapshot: BlueprintSnapshot | null; nextProjectData: Record<string, unknown>; skipped: boolean } {
    if (input.nextProjectData && !hasMeaningfulSnapshotDataChange(projectData, input.nextProjectData)) {
        return {
            snapshot: null,
            nextProjectData: projectData,
            skipped: true,
        };
    }

    const snapshot = createBlueprintSnapshot({
        ...input,
        projectData,
        scope: input.scope || 'project',
        source: 'manual_save',
        changeType: 'manual_checkpoint',
        metadata: {
            ...(input.metadata || {}),
            actionType: input.metadata?.actionType || 'manual_project_save',
        },
    });

    return {
        snapshot,
        nextProjectData: appendBlueprintSnapshot(projectData, snapshot),
        skipped: false,
    };
}

function snapshotToProjectData(snapshot: BlueprintSnapshot): Record<string, unknown> {
    const data = asRecord(snapshot.snapshotData);
    if (Object.keys(data).length) return data;
    return snapshot.businessBlueprint ? { businessBlueprint: snapshot.businessBlueprint } : {};
}

function snapshotToBusinessBlueprint(snapshot: BlueprintSnapshot): BusinessBlueprint | null {
    return snapshot.businessBlueprint || getProjectDataBusinessBlueprint(snapshot.snapshotData);
}

function moduleIsProtected(value: unknown): boolean {
    const record = asRecord(value);
    if (!Object.keys(record).length) return false;
    const metadata = asRecord(record.metadata);
    if (Object.keys(metadata).length) {
        return shouldProtectBlueprintModule(record as Pick<BlueprintModuleState, 'metadata'>);
    }
    return record.userModified === true || record.lockedFromRegeneration === true;
}

export function shouldProtectFromRegeneration(value: unknown): boolean {
    return moduleIsProtected(value);
}

function protectablePathsForBlueprint(
    current: BusinessBlueprint | null,
    previous: BusinessBlueprint | null,
): string[] {
    if (!current || !previous) return [];
    return BUSINESS_BLUEPRINT_MODULE_KEYS.filter(key => {
        const currentModule = current[key];
        const previousModule = previous[key];
        return moduleIsProtected(currentModule) && JSON.stringify(currentModule) !== JSON.stringify(previousModule);
    }).map(key => `businessBlueprint.${key}`);
}

function applyProtectedModuleGuards(
    current: BusinessBlueprint,
    previous: BusinessBlueprint,
    confirmOverwriteProtected?: boolean,
): { next: BusinessBlueprint; protectedPaths: string[]; skippedPaths: string[] } {
    if (confirmOverwriteProtected) {
        return { next: previous, protectedPaths: [], skippedPaths: [] };
    }

    const next = clone(previous);
    const protectedPaths: string[] = [];
    const skippedPaths: string[] = [];

    BUSINESS_BLUEPRINT_MODULE_KEYS.forEach(key => {
        const currentModule = current[key];
        const previousModule = previous[key];
        if (!currentModule || !previousModule) return;
        if (moduleIsProtected(currentModule) && JSON.stringify(currentModule) !== JSON.stringify(previousModule)) {
            (next as unknown as Record<string, unknown>)[key] = clone(currentModule);
            protectedPaths.push(`businessBlueprint.${key}`);
            skippedPaths.push(`businessBlueprint.${key}`);
        }
    });

    return { next, protectedPaths, skippedPaths };
}

function restoreBlueprintIntoProjectData(
    currentProjectData: Record<string, unknown>,
    nextProjectData: Record<string, unknown>,
    nextBlueprint: BusinessBlueprint | null,
): Record<string, unknown> {
    const history = getBlueprintVersionHistory(currentProjectData);
    const restored = nextBlueprint
        ? setProjectDataBusinessBlueprint(nextProjectData, nextBlueprint)
        : nextProjectData;
    return withVersionHistory(stripVersionHistory(restored), history);
}

export function restoreBlueprintSnapshot(
    currentProjectData: Record<string, unknown>,
    snapshot: BlueprintSnapshot,
    target: RestoreTarget = { scope: 'project' },
): RestoreResult {
    const snapshotProjectData = snapshotToProjectData(snapshot);
    const currentBlueprint = getProjectDataBusinessBlueprint(currentProjectData);
    const previousBlueprint = snapshotToBusinessBlueprint(snapshot);
    const restoredAt = new Date().toISOString();
    const warnings: string[] = [];
    const restoredPaths: string[] = [];
    let protectedPaths: string[] = [];
    let skippedPaths: string[] = [];

    if (target.scope === 'module') {
        if (!target.moduleKey) {
            return buildRestoreResult(false, currentProjectData, snapshot, target, [], [], [], ['Module restore requires moduleKey.']);
        }
        return restoreBlueprintModule(currentProjectData, snapshot, target.moduleKey, target);
    }

    if (target.scope === 'section') {
        if (!target.sectionId) {
            return buildRestoreResult(false, currentProjectData, snapshot, target, [], [], [], ['Section restore requires sectionId.']);
        }
        return restoreBlueprintSection(currentProjectData, snapshot, target.sectionId, target);
    }

    let nextProjectData = stripVersionHistory(snapshotProjectData);
    let nextBlueprint = previousBlueprint;

    if (target.scope === 'businessBlueprint' || previousBlueprint) {
        if (!previousBlueprint) {
            return buildRestoreResult(false, currentProjectData, snapshot, target, [], [], [], ['Snapshot does not include a Business Blueprint.']);
        }
        if (currentBlueprint) {
            const guarded = applyProtectedModuleGuards(currentBlueprint, previousBlueprint, target.confirmOverwriteProtected);
            nextBlueprint = guarded.next;
            protectedPaths = guarded.protectedPaths;
            skippedPaths = guarded.skippedPaths;
            if (protectedPaths.length) {
                warnings.push('Protected modules were preserved. Confirm overwrite to restore them.');
            }
        }
        if (target.scope === 'businessBlueprint') {
            nextProjectData = currentProjectData;
        }
    }

    const nextHistory = {
        ...getBlueprintVersionHistory(currentProjectData),
        lastRestoredAt: restoredAt,
        lastRestoredSnapshotId: snapshot.id,
    };
    const restoredProjectData = withVersionHistory(
        stripVersionHistory(
            nextBlueprint
                ? setProjectDataBusinessBlueprint(nextProjectData, nextBlueprint)
                : nextProjectData,
        ),
        nextHistory,
    );

    restoredPaths.push(target.scope === 'businessBlueprint' ? 'businessBlueprint' : 'project');

    return buildRestoreResult(
        true,
        restoredProjectData,
        snapshot,
        target,
        restoredPaths,
        skippedPaths,
        protectedPaths,
        warnings,
    );
}

export function restoreBlueprintModule(
    currentProjectData: Record<string, unknown>,
    snapshot: BlueprintSnapshot,
    moduleKey: BusinessBlueprintModuleKey,
    options: RestoreOptions = {},
): RestoreResult {
    const currentBlueprint = getProjectDataBusinessBlueprint(currentProjectData);
    const previousBlueprint = snapshotToBusinessBlueprint(snapshot);
    const target: RestoreTarget = { scope: 'module', moduleKey, confirmOverwriteProtected: options.confirmOverwriteProtected };

    if (!currentBlueprint || !previousBlueprint) {
        return buildRestoreResult(false, currentProjectData, snapshot, target, [], [], [], ['Current project or snapshot is missing a Business Blueprint.']);
    }

    const previousModule = previousBlueprint[moduleKey];
    if (!previousModule) {
        return buildRestoreResult(false, currentProjectData, snapshot, target, [], [], [], [`Snapshot does not include ${moduleKey}.`]);
    }

    const currentModule = currentBlueprint[moduleKey];
    if (!options.confirmOverwriteProtected && moduleIsProtected(currentModule)) {
        const path = `businessBlueprint.${moduleKey}`;
        return buildRestoreResult(false, currentProjectData, snapshot, target, [], [path], [path], [`${moduleKey} is protected from regeneration.`]);
    }

    const nextBlueprint = {
        ...currentBlueprint,
        [moduleKey]: clone(previousModule),
        updatedAt: options.restoredAt || new Date().toISOString(),
    } as BusinessBlueprint;

    return buildRestoreResult(
        true,
        restoreBlueprintIntoProjectData(currentProjectData, currentProjectData, nextBlueprint),
        snapshot,
        target,
        [`businessBlueprint.${moduleKey}`],
        [],
        [],
        [],
    );
}

type SectionContainer = {
    moduleKey: BusinessBlueprintModuleKey;
    path: string;
    items: unknown[];
    apply: (items: unknown[]) => BusinessBlueprint;
};

function getSectionContainers(blueprint: BusinessBlueprint): SectionContainer[] {
    const containers: SectionContainer[] = [];

    if (Array.isArray(blueprint.websiteBlueprint?.sectionBlueprints)) {
        containers.push({
            moduleKey: 'websiteBlueprint',
            path: 'businessBlueprint.websiteBlueprint.sectionBlueprints',
            items: blueprint.websiteBlueprint.sectionBlueprints,
            apply: items => ({
                ...blueprint,
                websiteBlueprint: { ...blueprint.websiteBlueprint, sectionBlueprints: items as never },
            }),
        });
    }

    if (Array.isArray(blueprint.storefrontBlueprint?.sections)) {
        containers.push({
            moduleKey: 'storefrontBlueprint',
            path: 'businessBlueprint.storefrontBlueprint.sections',
            items: blueprint.storefrontBlueprint.sections,
            apply: items => ({
                ...blueprint,
                storefrontBlueprint: { ...blueprint.storefrontBlueprint, sections: items as never },
            }),
        });
    }

    const bioPageBlocks = asArray(asRecord(blueprint.bioPageBlueprint).blocks);
    if (bioPageBlocks.length) {
        containers.push({
            moduleKey: 'bioPageBlueprint',
            path: 'businessBlueprint.bioPageBlueprint.blocks',
            items: bioPageBlocks,
            apply: items => ({
                ...blueprint,
                bioPageBlueprint: { ...blueprint.bioPageBlueprint!, blocks: items as never },
            }),
        });
    }

    return containers;
}

function findSectionContainer(blueprint: BusinessBlueprint, sectionId: string): SectionContainer | null {
    return getSectionContainers(blueprint).find(container =>
        container.items.some(item => asRecord(item).id === sectionId),
    ) || null;
}

export function restoreBlueprintSection(
    currentProjectData: Record<string, unknown>,
    snapshot: BlueprintSnapshot,
    sectionId: string,
    options: RestoreOptions = {},
): RestoreResult {
    const currentBlueprint = getProjectDataBusinessBlueprint(currentProjectData);
    const previousBlueprint = snapshotToBusinessBlueprint(snapshot);
    const target: RestoreTarget = { scope: 'section', sectionId, confirmOverwriteProtected: options.confirmOverwriteProtected };

    if (!currentBlueprint || !previousBlueprint) {
        return buildRestoreResult(false, currentProjectData, snapshot, target, [], [], [], ['Current project or snapshot is missing a Business Blueprint.']);
    }

    const previousContainer = findSectionContainer(previousBlueprint, sectionId);
    const currentContainer = findSectionContainer(currentBlueprint, sectionId);
    if (!previousContainer) {
        return buildRestoreResult(false, currentProjectData, snapshot, target, [], [], [], [`Snapshot does not include section ${sectionId}.`]);
    }
    if (!currentContainer) {
        return buildRestoreResult(false, currentProjectData, snapshot, target, [], [], [], [`Current project does not include section ${sectionId}.`]);
    }

    const previousSection = previousContainer.items.find(item => asRecord(item).id === sectionId);
    const currentSection = currentContainer.items.find(item => asRecord(item).id === sectionId);
    const path = `${currentContainer.path}.${sectionId}`;

    if (!options.confirmOverwriteProtected && moduleIsProtected(currentSection)) {
        return buildRestoreResult(false, currentProjectData, snapshot, target, [], [path], [path], [`Section ${sectionId} is protected from regeneration.`]);
    }

    const nextItems = currentContainer.items.map(item =>
        asRecord(item).id === sectionId ? clone(previousSection) : item,
    );
    const nextBlueprint = {
        ...currentContainer.apply(nextItems),
        updatedAt: options.restoredAt || new Date().toISOString(),
    } as BusinessBlueprint;

    return buildRestoreResult(
        true,
        restoreBlueprintIntoProjectData(currentProjectData, currentProjectData, nextBlueprint),
        snapshot,
        target,
        [path],
        [],
        [],
        [],
    );
}

function buildRestoreResult(
    restored: boolean,
    nextProjectData: Record<string, unknown>,
    snapshot: BlueprintSnapshot,
    target: RestoreTarget,
    restoredPaths: string[],
    skippedPaths: string[],
    protectedPaths: string[],
    warnings: string[],
): RestoreResult {
    return {
        restored,
        snapshotId: snapshot.id,
        target,
        nextProjectData,
        restoredPaths,
        skippedPaths,
        protectedPaths,
        warnings,
    };
}

function flatten(value: unknown, prefix = '', output: Record<string, string> = {}): Record<string, string> {
    if (value === null || value === undefined || typeof value !== 'object') {
        output[prefix || '$'] = JSON.stringify(value);
        return output;
    }
    if (Array.isArray(value)) {
        value.forEach((item, index) => flatten(item, `${prefix}[${index}]`, output));
        if (value.length === 0) output[prefix || '$'] = '[]';
        return output;
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length === 0) {
        output[prefix || '$'] = '{}';
        return output;
    }
    keys.forEach(key => flatten(record[key], prefix ? `${prefix}.${key}` : key, output));
    return output;
}

function diffProjectData(currentData: Record<string, unknown>, previousData: Record<string, unknown>): Omit<SnapshotDiff, 'changedModules' | 'protectedPaths' | 'summary'> {
    const current = flatten(currentData);
    const previous = flatten(previousData);
    const currentKeys = Object.keys(current);
    const previousKeys = Object.keys(previous);
    const changedPaths = currentKeys.filter(key => key in previous && current[key] !== previous[key]);
    const addedPaths = currentKeys.filter(key => !(key in previous));
    const removedPaths = previousKeys.filter(key => !(key in current));
    return { changedPaths, addedPaths, removedPaths };
}

export function diffBlueprintSnapshots(
    current: BlueprintSnapshot | Record<string, unknown>,
    previous: BlueprintSnapshot | Record<string, unknown>,
): SnapshotDiff {
    const currentData = 'snapshotData' in current
        ? snapshotToProjectData(current as BlueprintSnapshot)
        : current as Record<string, unknown>;
    const previousData = 'snapshotData' in previous
        ? snapshotToProjectData(previous as BlueprintSnapshot)
        : previous as Record<string, unknown>;
    const pathDiff = diffProjectData(currentData, previousData);
    const currentBlueprint = getProjectDataBusinessBlueprint(currentData);
    const previousBlueprint = getProjectDataBusinessBlueprint(previousData);
    const changedModules = BUSINESS_BLUEPRINT_MODULE_KEYS.filter(key =>
        JSON.stringify(currentBlueprint?.[key]) !== JSON.stringify(previousBlueprint?.[key]),
    );
    const protectedPaths = protectablePathsForBlueprint(currentBlueprint, previousBlueprint);
    const changeCount = pathDiff.changedPaths.length + pathDiff.addedPaths.length + pathDiff.removedPaths.length;

    return {
        ...pathDiff,
        changedModules,
        protectedPaths,
        summary: changeCount === 0
            ? 'No differences detected.'
            : `${changeCount} changed path${changeCount === 1 ? '' : 's'} across ${changedModules.length} blueprint module${changedModules.length === 1 ? '' : 's'}.`,
    };
}

export function normalizeRestoreTarget(input: Partial<RestoreTarget> = {}, snapshot?: BlueprintSnapshot): RestoreTarget {
    const moduleKey = isBlueprintModuleKey(input.moduleKey) ? input.moduleKey : snapshot?.moduleKey;
    const sectionId = input.sectionId || snapshot?.sectionId;
    const scope = input.scope || (sectionId ? 'section' : moduleKey ? 'module' : 'project');
    return {
        scope,
        ...(moduleKey ? { moduleKey } : {}),
        ...(sectionId ? { sectionId } : {}),
        ...(input.confirmOverwriteProtected ? { confirmOverwriteProtected: true } : {}),
    };
}
