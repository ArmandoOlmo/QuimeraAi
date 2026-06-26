import type { CanonicalEmailSourceModule } from './emailModuleIntentService.ts';

export const EMAIL_REVIEW_QUEUE_PATH = '/email';
export const EMAIL_REVIEW_QUEUE_TAB = 'review';

export interface EmailReviewQueueFilter {
    sourceModule?: CanonicalEmailSourceModule | string | null;
    sourceEntityType?: string | null;
    sourceEntityId?: string | null;
}

export interface EmailReviewQueueLinkInput extends EmailReviewQueueFilter {
    projectId?: string | null;
    basePath?: string;
}

export interface ParsedEmailReviewQueueParams {
    projectId?: string;
    tab?: typeof EMAIL_REVIEW_QUEUE_TAB;
    filters: EmailReviewQueueFilter;
    hasFilter: boolean;
}

export function buildEmailReviewQueueUrl(input: EmailReviewQueueLinkInput = {}): string {
    const params = new URLSearchParams();
    appendParam(params, 'projectId', input.projectId);
    appendParam(params, 'tab', EMAIL_REVIEW_QUEUE_TAB);
    appendParam(params, 'sourceModule', input.sourceModule);
    appendParam(params, 'sourceEntityType', input.sourceEntityType);
    appendParam(params, 'sourceEntityId', input.sourceEntityId);

    const query = params.toString();
    const basePath = normalizeBasePath(input.basePath);
    return query ? `${basePath}?${query}` : basePath;
}

export function parseEmailReviewQueueParams(search: string | URLSearchParams): ParsedEmailReviewQueueParams {
    const params = search instanceof URLSearchParams
        ? search
        : new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const tabParam = readParam(params, 'tab') || readParam(params, 'emailTab');
    const reviewFlag = readParam(params, 'emailReview');
    const filters = normalizeEmailReviewQueueFilter({
        sourceModule: readParam(params, 'sourceModule'),
        sourceEntityType: readParam(params, 'sourceEntityType'),
        sourceEntityId: readParam(params, 'sourceEntityId'),
    });

    return {
        projectId: readParam(params, 'projectId') || undefined,
        tab: tabParam === EMAIL_REVIEW_QUEUE_TAB || reviewFlag === '1' ? EMAIL_REVIEW_QUEUE_TAB : undefined,
        filters,
        hasFilter: hasEmailReviewQueueFilter(filters),
    };
}

export function normalizeEmailReviewQueueFilter(filter?: EmailReviewQueueFilter | null): EmailReviewQueueFilter {
    if (!filter) return {};
    const normalized: EmailReviewQueueFilter = {};
    const sourceModule = normalizeValue(filter.sourceModule);
    const sourceEntityType = normalizeValue(filter.sourceEntityType);
    const sourceEntityId = normalizeValue(filter.sourceEntityId);
    if (sourceModule) normalized.sourceModule = sourceModule;
    if (sourceEntityType) normalized.sourceEntityType = sourceEntityType;
    if (sourceEntityId) normalized.sourceEntityId = sourceEntityId;
    return normalized;
}

export function hasEmailReviewQueueFilter(filter?: EmailReviewQueueFilter | null): boolean {
    const normalized = normalizeEmailReviewQueueFilter(filter);
    return Boolean(normalized.sourceModule || normalized.sourceEntityType || normalized.sourceEntityId);
}

export function describeEmailReviewQueueFilter(filter?: EmailReviewQueueFilter | null): string {
    const normalized = normalizeEmailReviewQueueFilter(filter);
    const parts = [
        normalized.sourceModule,
        normalized.sourceEntityType,
        normalized.sourceEntityId,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : 'All pending reviews';
}

function appendParam(params: URLSearchParams, key: string, value: unknown): void {
    const normalized = normalizeValue(value);
    if (normalized) params.set(key, normalized);
}

function readParam(params: URLSearchParams, key: string): string {
    return normalizeValue(params.get(key));
}

function normalizeBasePath(basePath?: string): string {
    const value = normalizeValue(basePath);
    return value || EMAIL_REVIEW_QUEUE_PATH;
}

function normalizeValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : '';
}
