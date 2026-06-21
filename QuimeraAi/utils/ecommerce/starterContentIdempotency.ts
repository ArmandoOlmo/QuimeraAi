export type StarterContentItemType = 'category' | 'product' | 'gift-card' | 'collection';

export interface StarterContentRecord {
    id: string;
    name?: string | null;
    slug?: string | null;
    data?: Record<string, unknown> | null;
}

export interface AiBlueprintContentKeyInput {
    projectId: string;
    storeId: string;
    blueprintVersion?: string;
    itemType: StarterContentItemType;
    name: string;
    slug?: string;
}

export interface StarterContentMatchInput {
    key: string;
    name: string;
    slug: string;
}

const readRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export const readStarterContentMetadata = (record: StarterContentRecord): Record<string, unknown> =>
    readRecord(record.data);

export const normalizeStarterContentName = (value: unknown): string => {
    if (value === undefined || value === null) return '';

    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
};

export const slugifyStarterContentName = (value: unknown, fallback = 'draft-item'): string => {
    const normalized = normalizeStarterContentName(value).replace(/\s+/g, '-');
    return normalized || fallback;
};

export const createAiBlueprintContentKey = ({
    projectId,
    storeId,
    blueprintVersion,
    itemType,
    name,
    slug,
}: AiBlueprintContentKeyInput): string => {
    const version = slugifyStarterContentName(blueprintVersion || 'unknown-version', 'unknown-version');
    const normalizedProjectId = slugifyStarterContentName(projectId, 'project');
    const normalizedStoreId = slugifyStarterContentName(storeId || projectId, 'store');
    const normalizedSlug = slugifyStarterContentName(slug || name, itemType);

    return [
        'ai-studio',
        'ecommerce-blueprint',
        normalizedProjectId,
        normalizedStoreId,
        version,
        itemType,
        normalizedSlug,
    ].join(':');
};

export const isAiGeneratedStarterContent = (record: StarterContentRecord): boolean => {
    const metadata = readStarterContentMetadata(record);

    return metadata.generatedByAI === true ||
        metadata.generatedBy === 'ai' ||
        metadata.source === 'ai-studio' ||
        typeof metadata.aiBlueprintContentKey === 'string';
};

export const isUserModifiedStarterContent = (record: StarterContentRecord): boolean => {
    const metadata = readStarterContentMetadata(record);

    return metadata.userModified === true || metadata.lockedFromRegeneration === true;
};

export const findStarterContentMatch = (
    records: StarterContentRecord[],
    candidate: StarterContentMatchInput,
): StarterContentRecord | undefined => {
    const candidateName = normalizeStarterContentName(candidate.name);
    const candidateSlug = slugifyStarterContentName(candidate.slug || candidate.name);

    return records.find((record) => {
        const metadata = readStarterContentMetadata(record);
        if (metadata.aiBlueprintContentKey === candidate.key) return true;

        const recordSlug = slugifyStarterContentName(record.slug || metadata.slug || metadata.name || record.name);
        if (recordSlug && recordSlug === candidateSlug) return true;

        const recordName = normalizeStarterContentName(record.name || metadata.name);
        return Boolean(recordName && recordName === candidateName);
    });
};
