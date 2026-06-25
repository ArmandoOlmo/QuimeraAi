import type { SupabaseClient } from '@supabase/supabase-js';
import type { BlockedDate } from '../../types';
import { mapBlockedTimeRowToBlockedDate } from './appointmentEngineService';

type SupabaseLike = Pick<SupabaseClient, 'from'>;

export interface LegacyBlockedDateInput {
    id?: string;
    title?: string;
    startDate?: unknown;
    endDate?: unknown;
    start?: unknown;
    end?: unknown;
    date?: unknown;
    allDay?: boolean;
    reason?: string;
    color?: string;
    recurring?: Record<string, unknown> | null;
    recurrence?: Record<string, unknown> | null;
    createdAt?: unknown;
    createdBy?: string;
    projectId?: string;
    source?: string;
    metadata?: Record<string, unknown>;
}

export interface MigrateLegacyBlockedDatesInput {
    projectId: string;
    tenantId?: string | null;
    userId?: string | null;
    createdBy?: string | null;
    legacyBlocks: LegacyBlockedDateInput[];
    fallbackTitle?: string;
    now?: Date;
}

export interface LegacyBlockedDateMigrationSkip {
    legacyId: string;
    legacySource?: string;
    reason: 'already_migrated' | 'invalid_date' | 'invalid_range' | 'missing_dates';
}

export interface LegacyBlockedDateMigrationResult {
    total: number;
    migrated: number;
    skipped: number;
    inserted: BlockedDate[];
    skippedItems: LegacyBlockedDateMigrationSkip[];
}

const LEGACY_MIGRATION_SOURCE = 'legacy_firestore_migration';

const cleanString = (value: unknown, maxLength = 500): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

const stripLegacyPrefix = (id?: string) => (id || '').replace(/^legacy:/, '').trim();

export const getLegacyBlockedDateSource = (
    block: LegacyBlockedDateInput,
    projectId: string,
    userId?: string | null,
): { legacyId: string; legacySource: string } => {
    const metadata = block.metadata || {};
    const metadataSource = cleanString(metadata.legacy_source || metadata.legacySource, 1000);
    const metadataId = cleanString(metadata.legacy_id || metadata.legacyId, 200);
    const legacyId = metadataId || stripLegacyPrefix(block.id) || `legacy_${Math.random().toString(36).slice(2, 10)}`;
    const fallbackPath = userId
        ? `users/${userId}/projects/${projectId}/blockedDates/${legacyId}`
        : `projects/${projectId}/blockedDates/${legacyId}`;

    return {
        legacyId,
        legacySource: metadataSource || fallbackPath,
    };
};

const dateFromValue = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'object') {
        const candidate = value as {
            seconds?: unknown;
            nanoseconds?: unknown;
            _seconds?: unknown;
            _nanoseconds?: unknown;
            toDate?: unknown;
        };
        if (typeof candidate.toDate === 'function') {
            const date = candidate.toDate();
            return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
        }
        const seconds = typeof candidate.seconds === 'number'
            ? candidate.seconds
            : typeof candidate._seconds === 'number'
                ? candidate._seconds
                : null;
        if (seconds !== null) {
            const nanoseconds = typeof candidate.nanoseconds === 'number'
                ? candidate.nanoseconds
                : typeof candidate._nanoseconds === 'number'
                    ? candidate._nanoseconds
                    : 0;
            const date = new Date((seconds * 1000) + Math.floor(nanoseconds / 1000000));
            return Number.isNaN(date.getTime()) ? null : date;
        }
    }
    return null;
};

const normalizeRange = (block: LegacyBlockedDateInput): { start: Date | null; end: Date | null; missing: boolean } => {
    const start = dateFromValue(block.startDate ?? block.start ?? block.date);
    const explicitEnd = dateFromValue(block.endDate ?? block.end);
    if (!start) return { start: null, end: null, missing: true };

    if (explicitEnd) return { start, end: explicitEnd, missing: false };
    if (block.allDay || block.date) {
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start, end, missing: false };
    }

    return { start, end: null, missing: true };
};

const legacySourceFromRow = (row: any): string | undefined => {
    const metadata = row?.metadata || {};
    return cleanString(metadata.legacy_source || metadata.legacySource, 1000);
};

export async function migrateLegacyBlockedDatesToCanonical(
    client: SupabaseLike,
    input: MigrateLegacyBlockedDatesInput,
): Promise<LegacyBlockedDateMigrationResult> {
    if (!input.projectId) {
        throw Object.assign(new Error('Project id is required.'), { status: 400, code: 'project_required' });
    }

    const { data: existingRows, error: existingError } = await client
        .from('project_appointment_blocks')
        .select('*')
        .eq('project_id', input.projectId);

    if (existingError) throw existingError;

    const existingLegacySources = new Set<string>();
    (existingRows || []).forEach((row: any) => {
        const source = legacySourceFromRow(row);
        if (source) existingLegacySources.add(source);
    });

    const inserted: BlockedDate[] = [];
    const skippedItems: LegacyBlockedDateMigrationSkip[] = [];
    const seenLegacySources = new Set(existingLegacySources);
    const now = input.now || new Date();
    const nowIso = now.toISOString();

    for (const block of input.legacyBlocks || []) {
        const { legacyId, legacySource } = getLegacyBlockedDateSource(block, input.projectId, input.userId);
        if (seenLegacySources.has(legacySource)) {
            skippedItems.push({ legacyId, legacySource, reason: 'already_migrated' });
            continue;
        }

        const range = normalizeRange(block);
        if (range.missing || !range.start || !range.end) {
            skippedItems.push({ legacyId, legacySource, reason: 'missing_dates' });
            continue;
        }

        if (Number.isNaN(range.start.getTime()) || Number.isNaN(range.end.getTime())) {
            skippedItems.push({ legacyId, legacySource, reason: 'invalid_date' });
            continue;
        }

        if (range.end <= range.start) {
            skippedItems.push({ legacyId, legacySource, reason: 'invalid_range' });
            continue;
        }

        const legacyMetadata = block.metadata || {};
        const metadata = {
            ...legacyMetadata,
            legacy_id: legacyId,
            legacy_source: legacySource,
            migrated_from: 'users/{userId}/projects/{projectId}/blockedDates',
            migrated_at: nowIso,
            migrated_by: input.createdBy || input.userId || null,
            deprecated_source: true,
            original_source: block.source || legacyMetadata.source || 'legacy_firestore',
        };

        const { data, error } = await client
            .from('project_appointment_blocks')
            .insert({
                tenant_id: input.tenantId || null,
                project_id: input.projectId,
                title: cleanString(block.title, 160) || cleanString(block.reason, 160) || input.fallbackTitle || 'Migrated block',
                start_date: range.start.toISOString(),
                end_date: range.end.toISOString(),
                all_day: Boolean(block.allDay),
                reason: cleanString(block.reason, 1000) || null,
                color: cleanString(block.color, 40) || null,
                recurrence: block.recurring || block.recurrence || null,
                source: LEGACY_MIGRATION_SOURCE,
                metadata,
                created_by: input.createdBy || input.userId || block.createdBy || null,
                updated_by: input.createdBy || input.userId || block.createdBy || null,
                created_at: nowIso,
                updated_at: nowIso,
            })
            .select('*')
            .single();

        if (error) {
            if ((error as any).code === '23505') {
                skippedItems.push({ legacyId, legacySource, reason: 'already_migrated' });
                seenLegacySources.add(legacySource);
                continue;
            }
            throw error;
        }

        seenLegacySources.add(legacySource);
        inserted.push(mapBlockedTimeRowToBlockedDate(data));
    }

    return {
        total: input.legacyBlocks?.length || 0,
        migrated: inserted.length,
        skipped: skippedItems.length,
        inserted,
        skippedItems,
    };
}

export { LEGACY_MIGRATION_SOURCE };
