import { describe, expect, it, vi } from 'vitest';
import {
    decryptGoogleCalendarTokens,
    encryptGoogleCalendarTokens,
    markGoogleCalendarWebhookPending,
    signGoogleCalendarOAuthState,
    syncGoogleCalendarIntegration,
    upsertGoogleCalendarEventIntoAppointments,
    verifyGoogleCalendarOAuthState,
} from '../../services/appointments/appointmentGoogleCalendarSyncService';

type TableData = Record<string, any[]>;

class FakeQuery {
    private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
    private insertRow: Record<string, any> | null = null;
    private updateRow: Record<string, any> | null = null;
    private filters: Array<{ column: string; value: any; op: string }> = [];
    private rowLimit: number | null = null;

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
        return this;
    }

    update(row: Record<string, any>) {
        this.operation = 'update';
        this.updateRow = row;
        return this;
    }

    delete() {
        this.operation = 'delete';
        return this;
    }

    eq(column: string, value: any) {
        this.filters.push({ column, value, op: 'eq' });
        return this;
    }

    neq(column: string, value: any) {
        this.filters.push({ column, value, op: 'neq' });
        return this;
    }

    limit(value: number) {
        this.rowLimit = value;
        return this;
    }

    maybeSingle() {
        return Promise.resolve({ data: this.resolveRows()[0] || null, error: null });
    }

    single() {
        const result = this.execute();
        const row = Array.isArray(result.data) ? result.data[0] : result.data;
        return Promise.resolve({ data: row || null, error: null });
    }

    then(resolve: (value: { data: any[]; error: null }) => void, reject?: (reason: unknown) => void) {
        return Promise.resolve(this.execute()).then(resolve, reject);
    }

    private execute() {
        if (this.operation === 'insert') {
            const row = {
                id: `${this.table}-${(this.db.tables[this.table] || []).length + 1}`,
                ...this.insertRow,
            };
            this.db.tables[this.table] = [...(this.db.tables[this.table] || []), row];
            this.db.inserts.push({ table: this.table, row });
            return { data: [row], error: null };
        }

        if (this.operation === 'update') {
            const rows = this.db.tables[this.table] || [];
            const updated: any[] = [];
            rows.forEach((row, index) => {
                if (!this.matches(row)) return;
                rows[index] = { ...row, ...this.updateRow };
                updated.push(rows[index]);
                this.db.updates.push({ table: this.table, id: row.id, patch: this.updateRow || {} });
            });
            this.db.tables[this.table] = rows;
            return { data: updated, error: null };
        }

        return { data: this.resolveRows(), error: null };
    }

    private resolveRows() {
        const rows = (this.db.tables[this.table] || []).filter(row => this.matches(row));
        return this.rowLimit ? rows.slice(0, this.rowLimit) : rows;
    }

    private matches(row: Record<string, any>) {
        return this.filters.every(filter => {
            const value = row[filter.column];
            if (filter.op === 'eq') return value === filter.value;
            if (filter.op === 'neq') return value !== filter.value;
            return true;
        });
    }
}

class FakeSupabase {
    readonly inserts: Array<{ table: string; row: Record<string, any> }> = [];
    readonly updates: Array<{ table: string; id: string; patch: Record<string, any> }> = [];

    constructor(readonly tables: TableData = {}) {}

    from(table: string) {
        return new FakeQuery(table, this);
    }
}

const encryptionKey = 'test-google-calendar-token-encryption-key';

describe('appointmentGoogleCalendarSyncService', () => {
    it('signs OAuth state and encrypts tokens without storing raw token values', () => {
        const state = signGoogleCalendarOAuthState({
            projectId: 'project-1',
            userId: 'user-1',
            calendarId: 'primary',
            issuedAt: Date.now(),
        }, 'state-secret');

        expect(verifyGoogleCalendarOAuthState(state, 'state-secret')).toMatchObject({
            projectId: 'project-1',
            userId: 'user-1',
            calendarId: 'primary',
        });
        expect(() => verifyGoogleCalendarOAuthState(`${state}x`, 'state-secret')).toThrow('Invalid Google Calendar OAuth state.');

        const encrypted = encryptGoogleCalendarTokens({
            accessToken: 'access-token-1',
            refreshToken: 'refresh-token-1',
        }, encryptionKey);

        expect(JSON.stringify(encrypted)).not.toContain('access-token-1');
        expect(JSON.stringify(encrypted)).not.toContain('refresh-token-1');
        expect(decryptGoogleCalendarTokens(encrypted, encryptionKey)).toMatchObject({
            accessToken: 'access-token-1',
            refreshToken: 'refresh-token-1',
        });
    });

    it('marks Google webhook channels pending only when the channel token matches', async () => {
        const tokenHash = await import('node:crypto').then(({ createHash }) =>
            createHash('sha256').update('channel-token').digest('hex'));
        const supabase = new FakeSupabase({
            project_google_calendar_integrations: [{
                id: 'integration-1',
                project_id: 'project-1',
                watch_channel_id: 'channel-1',
                watch_resource_id: 'resource-1',
                watch_token_hash: tokenHash,
                status: 'connected',
            }],
        });

        const result = await markGoogleCalendarWebhookPending(supabase as any, {
            'x-goog-channel-id': 'channel-1',
            'x-goog-channel-token': 'channel-token',
            'x-goog-resource-id': 'resource-1',
            'x-goog-resource-state': 'exists',
            'x-goog-message-number': '7',
        }, '2026-06-25T12:00:00.000Z');

        expect(result).toMatchObject({
            matched: true,
            integrationId: 'integration-1',
            projectId: 'project-1',
            state: 'exists',
            messageNumber: '7',
        });
        expect(supabase.tables.project_google_calendar_integrations[0]).toMatchObject({
            webhook_pending_sync: true,
            webhook_last_state: 'exists',
            webhook_last_message_number: '7',
        });

        await expect(markGoogleCalendarWebhookPending(supabase as any, {
            'x-goog-channel-id': 'channel-1',
            'x-goog-channel-token': 'wrong-token',
        })).resolves.toMatchObject({ matched: false, reason: 'token_mismatch' });
    });

    it('clears expired sync tokens after Google returns 410 and completes a full sync', async () => {
        const supabase = new FakeSupabase({
            project_google_calendar_integrations: [{
                id: 'integration-1',
                project_id: 'project-1',
                calendar_id: 'primary',
                sync_token: 'expired-token',
                oauth_tokens_encrypted: encryptGoogleCalendarTokens({
                    accessToken: 'access-token-1',
                    refreshToken: 'refresh-token-1',
                }, encryptionKey),
                oauth_token_expires_at: '2026-06-25T13:00:00.000Z',
                status: 'connected',
                sync_enabled: true,
            }],
        });
        const fetchImpl = vi.fn(async (url: string) => {
            if (url.includes('syncToken=expired-token')) {
                return {
                    ok: false,
                    status: 410,
                    json: async () => ({ error: { message: 'Sync token expired' } }),
                } as any;
            }
            return {
                ok: true,
                status: 200,
                json: async () => ({ items: [], nextSyncToken: 'fresh-token' }),
            } as any;
        });

        const summary = await syncGoogleCalendarIntegration(
            supabase as any,
            supabase.tables.project_google_calendar_integrations[0],
            {
                fetchImpl: fetchImpl as any,
                encryptionKey,
                now: '2026-06-25T12:00:00.000Z',
                renewWatch: false,
                pushToGoogle: false,
            },
        );

        expect(summary.syncToken).toBe('fresh-token');
        expect(fetchImpl).toHaveBeenCalledTimes(2);
        expect(supabase.tables.project_google_calendar_integrations[0]).toMatchObject({
            sync_token: 'fresh-token',
            last_sync_status: 'synced',
            webhook_pending_sync: false,
        });
    });

    it('queues external Google edits for Quimera-owned appointments instead of overwriting core fields', async () => {
        const supabase = new FakeSupabase({
            project_appointments: [{
                id: 'appointment-1',
                project_id: 'project-1',
                title: 'Original Quimera title',
                source: 'dashboard',
                metadata: {},
            }],
        });

        const result = await upsertGoogleCalendarEventIntoAppointments(supabase as any, {
            id: 'integration-1',
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            calendar_id: 'primary',
        }, {
            id: 'google-event-1',
            summary: 'Changed in Google',
            status: 'confirmed',
            start: { dateTime: '2026-07-01T14:00:00.000Z', timeZone: 'UTC' },
            end: { dateTime: '2026-07-01T15:00:00.000Z', timeZone: 'UTC' },
            extendedProperties: {
                private: { quimeraId: 'appointment-1' },
            },
            etag: 'etag-1',
        }, '2026-06-25T12:00:00.000Z');

        expect(result.status).toBe('reviewQueued');
        expect(supabase.tables.project_appointments[0].title).toBe('Original Quimera title');
        expect(supabase.tables.project_appointments[0].needs_review).toBe(true);
        expect(supabase.tables.project_appointments[0].metadata.googleCalendar).toMatchObject({
            externalChangePendingReview: true,
            conflictPolicy: 'quimera_wins_owned_google_wins_external',
            eventId: 'google-event-1',
        });
    });

    it('imports Google-owned events directly into project_appointments without lead or email side effects', async () => {
        const supabase = new FakeSupabase();

        const result = await upsertGoogleCalendarEventIntoAppointments(supabase as any, {
            id: 'integration-1',
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            calendar_id: 'primary',
        }, {
            id: 'google-event-2',
            summary: 'External calendar hold',
            description: 'Discovery prep #sales',
            status: 'confirmed',
            start: { dateTime: '2026-07-02T14:00:00.000Z', timeZone: 'UTC' },
            end: { dateTime: '2026-07-02T15:00:00.000Z', timeZone: 'UTC' },
            attendees: [{ email: 'ana@example.com', displayName: 'Ana', responseStatus: 'accepted' }],
            htmlLink: 'https://calendar.google.com/event?eid=2',
            etag: 'etag-2',
        }, '2026-06-25T12:00:00.000Z');

        expect(result.status).toBe('imported');
        expect(supabase.inserts.map(insert => insert.table)).toEqual(['project_appointments']);
        expect(supabase.inserts[0].row).toMatchObject({
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            title: 'External calendar hold',
            source: 'google_calendar',
            source_module: 'appointments',
            source_component: 'GoogleCalendar',
            sync_key: 'google_calendar:primary:google-event-2',
            needs_review: true,
        });
        expect(supabase.inserts[0].row.participants[0]).toMatchObject({
            email: 'ana@example.com',
            status: 'accepted',
        });
        expect(supabase.inserts[0].row.tags).toEqual(['sales']);
    });
});
