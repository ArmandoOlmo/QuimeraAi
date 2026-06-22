import type { CrossModuleSyncDraft, CrossModuleSyncModule } from '../../types/businessBlueprint';

export interface CrossModuleSyncKeyInput {
    projectId: string;
    module: CrossModuleSyncModule;
    itemType: string;
    name: string;
    blueprintVersion?: string;
}

export interface CrossModuleSyncDraftCandidate {
    syncKey: string;
    itemType: string;
    name: string;
    generatedByAI?: boolean;
    userModified?: boolean;
    metadata?: Record<string, unknown>;
}

export interface CrossModuleSyncDraftMatch {
    draft: CrossModuleSyncDraft;
    reason: 'sync_key' | 'name';
}

export function normalizeCrossModuleSyncName(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'draft';
}

export function createCrossModuleSyncKey(input: CrossModuleSyncKeyInput): string {
    return [
        input.projectId,
        input.module,
        input.itemType,
        normalizeCrossModuleSyncName(input.name),
        input.blueprintVersion || 'unknown-version',
    ].join(':');
}

export function isUserModifiedCrossModuleDraft(
    draft: Pick<CrossModuleSyncDraftCandidate, 'userModified' | 'metadata'>,
): boolean {
    return draft.userModified === true || draft.metadata?.userModified === true;
}

export function isAiGeneratedCrossModuleDraft(
    draft: Pick<CrossModuleSyncDraftCandidate, 'generatedByAI' | 'metadata'>,
): boolean {
    return draft.generatedByAI === true || draft.metadata?.generatedByAI === true;
}

export function findCrossModuleDraftMatch(
    existingDrafts: CrossModuleSyncDraft[],
    candidate: Pick<CrossModuleSyncDraftCandidate, 'syncKey' | 'itemType' | 'name'>,
): CrossModuleSyncDraftMatch | null {
    const syncKeyMatch = existingDrafts.find(draft => draft.syncKey === candidate.syncKey);
    if (syncKeyMatch) return { draft: syncKeyMatch, reason: 'sync_key' };

    const candidateName = normalizeCrossModuleSyncName(candidate.name);
    const nameMatch = existingDrafts.find(draft => (
        draft.itemType === candidate.itemType &&
        normalizeCrossModuleSyncName(draft.name) === candidateName
    ));

    return nameMatch ? { draft: nameMatch, reason: 'name' } : null;
}
