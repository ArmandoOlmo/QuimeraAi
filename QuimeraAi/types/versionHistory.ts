import type { BusinessBlueprint, BusinessBlueprintModuleKey } from './businessBlueprint';

export type BlueprintSnapshotScope = 'project' | 'businessBlueprint' | 'module' | 'section';

export type SnapshotSource =
    | 'ai_regeneration'
    | 'ai_action'
    | 'manual_save'
    | 'publish'
    | 'restore'
    | 'system'
    | 'import';

export type SnapshotChangeType =
    | 'before_regeneration'
    | 'before_restore'
    | 'manual_checkpoint'
    | 'publish_checkpoint'
    | 'system_checkpoint';

export interface SnapshotMetadata {
    projectName?: string;
    tenantId?: string | null;
    userId?: string | null;
    createdBy?: string | null;
    actionId?: string;
    actionType?: string;
    taskId?: string | null;
    module?: string;
    moduleKey?: BusinessBlueprintModuleKey;
    sectionId?: string;
    protectedPaths?: string[];
    changeCount?: number;
    summary?: string;
    [key: string]: unknown;
}

export interface BlueprintSnapshot {
    id: string;
    projectId: string;
    createdAt: string;
    source: SnapshotSource;
    scope: BlueprintSnapshotScope;
    changeType: SnapshotChangeType;
    moduleKey?: BusinessBlueprintModuleKey;
    sectionId?: string;
    label: string;
    summary: string;
    metadata: SnapshotMetadata;
    snapshotData: Record<string, unknown>;
    businessBlueprint?: BusinessBlueprint;
}

export interface SnapshotDiff {
    changedPaths: string[];
    addedPaths: string[];
    removedPaths: string[];
    changedModules: BusinessBlueprintModuleKey[];
    protectedPaths: string[];
    summary: string;
}

export interface RestoreTarget {
    scope: BlueprintSnapshotScope;
    moduleKey?: BusinessBlueprintModuleKey;
    sectionId?: string;
    confirmOverwriteProtected?: boolean;
}

export interface RestoreResult {
    restored: boolean;
    snapshotId: string;
    target: RestoreTarget;
    nextProjectData: Record<string, unknown>;
    restoredPaths: string[];
    skippedPaths: string[];
    protectedPaths: string[];
    warnings: string[];
}

export interface BlueprintVersionHistory {
    blueprintSnapshots: BlueprintSnapshot[];
    lastSnapshotAt?: string;
    lastRestoredAt?: string;
    lastRestoredSnapshotId?: string;
}
