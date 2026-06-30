export function normalizeCrossModuleSyncName(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'draft';
}
export function createCrossModuleSyncKey(input) {
    return [
        input.projectId,
        input.module,
        input.itemType,
        normalizeCrossModuleSyncName(input.name),
        input.blueprintVersion || 'unknown-version',
    ].join(':');
}
export function isUserModifiedCrossModuleDraft(draft) {
    return draft.userModified === true || draft.metadata?.userModified === true;
}
export function isAiGeneratedCrossModuleDraft(draft) {
    return draft.generatedByAI === true || draft.metadata?.generatedByAI === true;
}
export function findCrossModuleDraftMatch(existingDrafts, candidate) {
    const syncKeyMatch = existingDrafts.find(draft => draft.syncKey === candidate.syncKey);
    if (syncKeyMatch)
        return { draft: syncKeyMatch, reason: 'sync_key' };
    const candidateName = normalizeCrossModuleSyncName(candidate.name);
    const nameMatch = existingDrafts.find(draft => (draft.itemType === candidate.itemType &&
        normalizeCrossModuleSyncName(draft.name) === candidateName));
    return nameMatch ? { draft: nameMatch, reason: 'name' } : null;
}
//# sourceMappingURL=crossModuleSyncIdempotency.js.map