import { describe, expect, it } from 'vitest';
import {
    getLegacyBlockedDateSource,
    migrateLegacyBlockedDatesToCanonical,
} from '../../services/appointments/appointmentBlockedDateMigrationService';

type TableData = Record<string, any[]>;

class FakeQuery {
    private operation: 'select' | 'insert' = 'select';
    private insertRow: Record<string, any> | null = null;
    private filters: Array<{ column: string; value: any }> = [];

    constructor(
        private readonly table: string,
        private readonly db: FakeSupabase,
    ) {}

    select() {
        return this;
    }

    insert(row: Record<string, any>) {
        this.operation = 'insert';
        this.insertRow = row;
        this.db.inserts.push({ table: this.table, row });
        return this;
    }

    eq(column: string, value: any) {
        this.filters.push({ column, value });
        return this;
    }

    single() {
        if (this.operation === 'insert') {
            const row = {
                id: `${this.table}-inserted-${this.db.inserts.length}`,
                ...this.insertRow,
            };
            this.db.tables[this.table] = [...(this.db.tables[this.table] || []), row];
            return Promise.resolve({ data: row, error: null });
        }

        return Promise.resolve({ data: this.resolveRows()[0] || null, error: null });
    }

    then(resolve: (value: { data: any[]; error: null }) => void, reject?: (reason: unknown) => void) {
        return Promise.resolve({ data: this.resolveRows(), error: null }).then(resolve, reject);
    }

    private resolveRows() {
        return (this.db.tables[this.table] || []).filter(row => (
            this.filters.every(filter => row[filter.column] === filter.value)
        ));
    }
}

class FakeSupabase {
    readonly inserts: Array<{ table: string; row: Record<string, any> }> = [];

    constructor(readonly tables: TableData = {}) {}

    from(table: string) {
        return new FakeQuery(table, this);
    }
}

describe('appointmentBlockedDateMigrationService', () => {
    it('migrates Firestore legacy blockedDates into canonical project_appointment_blocks', async () => {
        const supabase = new FakeSupabase();

        const result = await migrateLegacyBlockedDatesToCanonical(supabase as any, {
            tenantId: 'tenant-1',
            projectId: 'project-1',
            userId: 'user-1',
            createdBy: 'user-1',
            now: new Date('2026-06-25T12:00:00.000Z'),
            legacyBlocks: [{
                id: 'legacy:block-1',
                title: 'Vacation',
                startDate: { seconds: 1782900000, nanoseconds: 0 },
                endDate: { seconds: 1782986400, nanoseconds: 0 },
                allDay: true,
                metadata: {
                    legacySource: 'users/user-1/projects/project-1/blockedDates/block-1',
                },
            }],
        });

        expect(result).toMatchObject({ total: 1, migrated: 1, skipped: 0 });
        expect(supabase.inserts[0]).toMatchObject({
            table: 'project_appointment_blocks',
            row: {
                tenant_id: 'tenant-1',
                project_id: 'project-1',
                title: 'Vacation',
                all_day: true,
                source: 'legacy_firestore_migration',
                created_by: 'user-1',
            },
        });
        expect(supabase.inserts[0].row.metadata).toMatchObject({
            legacy_id: 'block-1',
            legacy_source: 'users/user-1/projects/project-1/blockedDates/block-1',
            migrated_from: 'users/{userId}/projects/{projectId}/blockedDates',
            migrated_by: 'user-1',
            deprecated_source: true,
        });
        expect(result.inserted[0].projectId).toBe('project-1');
    });

    it('skips already migrated legacy blocks by legacy source', async () => {
        const supabase = new FakeSupabase({
            project_appointment_blocks: [{
                id: 'block-canonical-1',
                project_id: 'project-1',
                start_date: '2026-07-01T10:00:00.000Z',
                end_date: '2026-07-01T11:00:00.000Z',
                created_at: '2026-06-25T12:00:00.000Z',
                metadata: {
                    legacy_source: 'users/user-1/projects/project-1/blockedDates/block-1',
                },
            }],
        });

        const result = await migrateLegacyBlockedDatesToCanonical(supabase as any, {
            projectId: 'project-1',
            userId: 'user-1',
            legacyBlocks: [{
                id: 'legacy:block-1',
                startDate: '2026-07-01T10:00:00.000Z',
                endDate: '2026-07-01T11:00:00.000Z',
                metadata: {
                    legacySource: 'users/user-1/projects/project-1/blockedDates/block-1',
                },
            }],
        });

        expect(result).toMatchObject({ total: 1, migrated: 0, skipped: 1 });
        expect(result.skippedItems[0]).toMatchObject({
            legacyId: 'block-1',
            reason: 'already_migrated',
        });
        expect(supabase.inserts).toHaveLength(0);
    });

    it('turns date-only all-day legacy blocks into a one-day canonical range', async () => {
        const supabase = new FakeSupabase();

        await migrateLegacyBlockedDatesToCanonical(supabase as any, {
            projectId: 'project-1',
            userId: 'user-1',
            legacyBlocks: [{
                id: 'legacy:block-2',
                date: '2026-07-04T00:00:00.000Z',
                allDay: true,
            }],
        });

        expect(supabase.inserts[0].row.start_date).toBe('2026-07-04T00:00:00.000Z');
        expect(supabase.inserts[0].row.end_date).toBe('2026-07-05T00:00:00.000Z');
    });

    it('skips invalid legacy ranges without writing canonical rows', async () => {
        const supabase = new FakeSupabase();

        const result = await migrateLegacyBlockedDatesToCanonical(supabase as any, {
            projectId: 'project-1',
            userId: 'user-1',
            legacyBlocks: [{
                id: 'legacy:block-invalid',
                startDate: '2026-07-01T11:00:00.000Z',
                endDate: '2026-07-01T10:00:00.000Z',
            }],
        });

        expect(result).toMatchObject({ total: 1, migrated: 0, skipped: 1 });
        expect(result.skippedItems[0]).toMatchObject({
            legacyId: 'block-invalid',
            reason: 'invalid_range',
        });
        expect(supabase.inserts).toHaveLength(0);
    });

    it('derives stable legacy source paths from hook-shaped legacy blocks', () => {
        expect(getLegacyBlockedDateSource({
            id: 'legacy:block-3',
            metadata: {},
        }, 'project-1', 'user-1')).toEqual({
            legacyId: 'block-3',
            legacySource: 'users/user-1/projects/project-1/blockedDates/block-3',
        });
    });
});
