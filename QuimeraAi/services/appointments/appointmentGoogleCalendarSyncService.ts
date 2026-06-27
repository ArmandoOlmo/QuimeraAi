import {
    createCipheriv,
    createDecipheriv,
    createHash,
    createHmac,
    randomBytes,
    randomUUID,
    timingSafeEqual,
} from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';

type SupabaseLike = Pick<SupabaseClient, 'from'>;

type JsonRecord = Record<string, any>;

export interface GoogleCalendarIntegrationRow {
    id: string;
    tenant_id?: string | null;
    project_id: string;
    provider?: string | null;
    calendar_id?: string | null;
    calendar_name?: string | null;
    google_account_email?: string | null;
    status?: string | null;
    sync_enabled?: boolean | null;
    sync_direction?: string | null;
    conflict_policy?: string | null;
    oauth_tokens_encrypted?: JsonRecord | null;
    oauth_token_expires_at?: string | null;
    oauth_scope?: string | null;
    sync_token?: string | null;
    sync_token_updated_at?: string | null;
    last_full_sync_at?: string | null;
    last_incremental_sync_at?: string | null;
    last_sync_status?: string | null;
    last_error?: string | null;
    watch_channel_id?: string | null;
    watch_resource_id?: string | null;
    watch_resource_uri?: string | null;
    watch_token_hash?: string | null;
    watch_expires_at?: string | null;
    watch_address?: string | null;
    webhook_pending_sync?: boolean | null;
    webhook_last_state?: string | null;
    webhook_last_message_number?: string | null;
    webhook_last_at?: string | null;
    metadata?: JsonRecord | null;
    created_by?: string | null;
    updated_by?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface GoogleCalendarOAuthStatePayload {
    projectId: string;
    userId: string;
    calendarId?: string;
    returnUrl?: string;
    nonce?: string;
    issuedAt?: number;
}

export interface GoogleCalendarOAuthEnv {
    clientId?: string | null;
    clientSecret?: string | null;
    redirectUri?: string | null;
    stateSecret?: string | null;
    encryptionKey?: string | null;
}

export interface GoogleCalendarSyncOptions {
    now?: string | Date;
    fetchImpl?: typeof fetch;
    clientId?: string | null;
    clientSecret?: string | null;
    encryptionKey?: string | null;
    webhookUrl?: string | null;
    watchTtlSeconds?: number;
    limit?: number;
    pushToGoogle?: boolean;
    pullFromGoogle?: boolean;
    forceFullSync?: boolean;
    renewWatch?: boolean;
    timeMin?: string | Date;
    timeMax?: string | Date;
}

export interface GoogleCalendarSyncSummary {
    integrationId: string;
    projectId: string;
    pushed: number;
    imported: number;
    updated: number;
    reviewQueued: number;
    skipped: number;
    errors: string[];
    syncToken?: string | null;
}

export interface GoogleCalendarWebhookResult {
    matched: boolean;
    integrationId?: string;
    projectId?: string;
    state?: string;
    messageNumber?: string;
    reason?: string;
}

interface GoogleCalendarTokens {
    accessToken?: string | null;
    refreshToken?: string | null;
    tokenType?: string | null;
    scope?: string | null;
}

interface GoogleCalendarEvent {
    id?: string;
    summary?: string;
    description?: string;
    location?: string;
    status?: string;
    htmlLink?: string;
    iCalUID?: string;
    etag?: string;
    created?: string;
    updated?: string;
    colorId?: string;
    start?: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end?: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    attendees?: Array<{
        email?: string;
        displayName?: string;
        responseStatus?: string;
        organizer?: boolean;
    }>;
    reminders?: {
        useDefault?: boolean;
        overrides?: Array<{ method?: string; minutes?: number }>;
    };
    conferenceData?: {
        createRequest?: JsonRecord;
        entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
    };
    extendedProperties?: {
        private?: Record<string, string>;
    };
    creator?: { email?: string; displayName?: string };
    organizer?: { email?: string; displayName?: string };
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
].join(' ');

const DEFAULT_PROVIDER = 'google_calendar';
const DEFAULT_CALENDAR_ID = 'primary';
const DEFAULT_WATCH_TTL_SECONDS = 604800;
const TOKEN_REFRESH_SKEW_MS = 60 * 1000;

const normalizeString = (value: unknown, maxLength = 2000): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

const normalizeRecord = (value: unknown): JsonRecord => (
    value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
);

const toIso = (value?: string | Date | null): string => {
    if (!value) return new Date().toISOString();
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return new Date().toISOString();
    return date.toISOString();
};

const addSeconds = (date: Date, seconds: number): Date => new Date(date.getTime() + seconds * 1000);

const base64UrlEncode = (input: Buffer | string): string =>
    Buffer.from(input).toString('base64url');

const base64UrlDecode = (input: string): Buffer => Buffer.from(input, 'base64url');

const hmac = (secret: string, value: string): string =>
    createHmac('sha256', secret).update(value).digest('base64url');

const safeEqual = (a: string, b: string): boolean => {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
};

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

function requireEnvValue(value: string | null | undefined, name: string): string {
    const normalized = normalizeString(value);
    if (!normalized) throw Object.assign(new Error(`${name} is required for Google Calendar sync.`), { status: 500 });
    return normalized;
}

function resolveGoogleEnv(env: GoogleCalendarOAuthEnv = {}) {
    return {
        clientId: requireEnvValue(env.clientId ?? process.env.GOOGLE_CALENDAR_CLIENT_ID ?? process.env.VITE_GOOGLE_CLIENT_ID, 'GOOGLE_CALENDAR_CLIENT_ID'),
        clientSecret: requireEnvValue(env.clientSecret ?? process.env.GOOGLE_CALENDAR_CLIENT_SECRET, 'GOOGLE_CALENDAR_CLIENT_SECRET'),
        redirectUri: requireEnvValue(env.redirectUri ?? process.env.GOOGLE_CALENDAR_REDIRECT_URI, 'GOOGLE_CALENDAR_REDIRECT_URI'),
        stateSecret: requireEnvValue(env.stateSecret ?? process.env.GOOGLE_CALENDAR_OAUTH_STATE_SECRET ?? process.env.CRON_SECRET, 'GOOGLE_CALENDAR_OAUTH_STATE_SECRET'),
        encryptionKey: requireEnvValue(env.encryptionKey ?? process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY, 'GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY'),
    };
}

function resolveEncryptionKey(secret: string): Buffer {
    const trimmed = secret.trim();
    if (/^[a-f0-9]{64}$/i.test(trimmed)) return Buffer.from(trimmed, 'hex');

    try {
        const decoded = Buffer.from(trimmed, 'base64');
        if (decoded.length === 32) return decoded;
    } catch (_error) {
        // Fall through to deterministic hashing.
    }

    return createHash('sha256').update(trimmed).digest();
}

export function encryptGoogleCalendarTokens(tokens: GoogleCalendarTokens, encryptionKey: string): JsonRecord {
    const iv = randomBytes(12);
    const key = resolveEncryptionKey(encryptionKey);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(tokens), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        v: 1,
        alg: 'aes-256-gcm',
        iv: iv.toString('base64url'),
        tag: tag.toString('base64url'),
        ciphertext: ciphertext.toString('base64url'),
    };
}

export function decryptGoogleCalendarTokens(encrypted: unknown, encryptionKey: string): GoogleCalendarTokens {
    const payload = normalizeRecord(encrypted);
    if (payload.v !== 1 || payload.alg !== 'aes-256-gcm') {
        throw Object.assign(new Error('Unsupported Google Calendar token payload.'), { status: 500 });
    }

    const decipher = createDecipheriv(
        'aes-256-gcm',
        resolveEncryptionKey(encryptionKey),
        base64UrlDecode(String(payload.iv || '')),
    );
    decipher.setAuthTag(base64UrlDecode(String(payload.tag || '')));
    const plaintext = Buffer.concat([
        decipher.update(base64UrlDecode(String(payload.ciphertext || ''))),
        decipher.final(),
    ]).toString('utf8');

    const tokens = JSON.parse(plaintext);
    return {
        accessToken: normalizeString(tokens.accessToken, 4000),
        refreshToken: normalizeString(tokens.refreshToken, 4000),
        tokenType: normalizeString(tokens.tokenType, 200),
        scope: normalizeString(tokens.scope, 4000),
    };
}

export function signGoogleCalendarOAuthState(
    payload: GoogleCalendarOAuthStatePayload,
    stateSecret: string,
): string {
    const body = base64UrlEncode(JSON.stringify({
        ...payload,
        calendarId: payload.calendarId || DEFAULT_CALENDAR_ID,
        nonce: payload.nonce || randomBytes(16).toString('base64url'),
        issuedAt: payload.issuedAt || Date.now(),
    }));
    return `${body}.${hmac(stateSecret, body)}`;
}

export function verifyGoogleCalendarOAuthState(
    state: string,
    stateSecret: string,
    maxAgeMs = 15 * 60 * 1000,
): GoogleCalendarOAuthStatePayload {
    const [body, signature] = state.split('.');
    if (!body || !signature || !safeEqual(signature, hmac(stateSecret, body))) {
        throw Object.assign(new Error('Invalid Google Calendar OAuth state.'), { status: 401 });
    }

    const payload = JSON.parse(base64UrlDecode(body).toString('utf8')) as GoogleCalendarOAuthStatePayload;
    const issuedAt = typeof payload.issuedAt === 'number' ? payload.issuedAt : 0;
    if (!payload.projectId || !payload.userId || !issuedAt || Date.now() - issuedAt > maxAgeMs) {
        throw Object.assign(new Error('Expired Google Calendar OAuth state.'), { status: 401 });
    }
    return payload;
}

export function buildGoogleCalendarOAuthUrl(
    payload: GoogleCalendarOAuthStatePayload,
    env: GoogleCalendarOAuthEnv = {},
): string {
    const resolved = resolveGoogleEnv(env);
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set('client_id', resolved.clientId);
    url.searchParams.set('redirect_uri', resolved.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', GOOGLE_SCOPES);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('state', signGoogleCalendarOAuthState(payload, resolved.stateSecret));
    return url.toString();
}

export async function exchangeGoogleCalendarCode(
    code: string,
    env: GoogleCalendarOAuthEnv = {},
    fetchImpl: typeof fetch = fetch,
) {
    const resolved = resolveGoogleEnv(env);
    const body = new URLSearchParams();
    body.set('code', code);
    body.set('client_id', resolved.clientId);
    body.set('client_secret', resolved.clientSecret);
    body.set('redirect_uri', resolved.redirectUri);
    body.set('grant_type', 'authorization_code');

    const data = await fetchGoogleJson<any>(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    }, fetchImpl);

    return normalizeTokenResponse(data);
}

export async function assertGoogleCalendarProjectAccess(
    client: SupabaseLike,
    userId: string,
    projectId: string,
): Promise<{ projectId: string; tenantId?: string | null; ownerUserId?: string | null }> {
    const { data: project, error } = await client
        .from('projects')
        .select('id, tenant_id, user_id')
        .eq('id', projectId)
        .maybeSingle();

    if (error) throw error;
    if (!project) throw Object.assign(new Error('Project not found.'), { status: 404 });
    if (project.user_id === userId) {
        return { projectId: project.id, tenantId: project.tenant_id || null, ownerUserId: project.user_id || null };
    }

    if (project.tenant_id) {
        const { data: membership, error: membershipError } = await client
            .from('tenant_members')
            .select('id')
            .eq('tenant_id', project.tenant_id)
            .eq('user_id', userId)
            .maybeSingle();
        if (membershipError) throw membershipError;
        if (membership) {
            return { projectId: project.id, tenantId: project.tenant_id || null, ownerUserId: project.user_id || null };
        }
    }

    throw Object.assign(new Error('Project access denied.'), { status: 403 });
}

export async function upsertGoogleCalendarIntegration(
    client: SupabaseLike,
    input: {
        projectId: string;
        tenantId?: string | null;
        userId?: string | null;
        calendarId?: string | null;
        calendarName?: string | null;
        googleAccountEmail?: string | null;
        tokens: {
            accessToken: string;
            refreshToken?: string | null;
            expiresIn?: number | null;
            tokenType?: string | null;
            scope?: string | null;
        };
    },
    env: GoogleCalendarOAuthEnv = {},
): Promise<GoogleCalendarIntegrationRow> {
    const resolved = resolveGoogleEnv(env);
    const calendarId = normalizeString(input.calendarId, 500) || DEFAULT_CALENDAR_ID;
    const now = new Date();

    const existing = await client
        .from('project_google_calendar_integrations')
        .select('*')
        .eq('project_id', input.projectId)
        .eq('provider', DEFAULT_PROVIDER)
        .eq('calendar_id', calendarId)
        .maybeSingle();
    if (existing.error) throw existing.error;

    let refreshToken = normalizeString(input.tokens.refreshToken, 4000);
    if (!refreshToken && existing.data?.oauth_tokens_encrypted) {
        try {
            refreshToken = decryptGoogleCalendarTokens(existing.data.oauth_tokens_encrypted, resolved.encryptionKey).refreshToken || undefined;
        } catch (_error) {
            // A reconnect without a refresh token should still proceed and surface refresh issues later.
        }
    }

    const expiresAt = input.tokens.expiresIn
        ? new Date(now.getTime() + Number(input.tokens.expiresIn) * 1000).toISOString()
        : null;
    const encryptedTokens = encryptGoogleCalendarTokens({
        accessToken: input.tokens.accessToken,
        refreshToken,
        tokenType: input.tokens.tokenType || 'Bearer',
        scope: input.tokens.scope,
    }, resolved.encryptionKey);

    const row = {
        tenant_id: input.tenantId || existing.data?.tenant_id || null,
        project_id: input.projectId,
        provider: DEFAULT_PROVIDER,
        calendar_id: calendarId,
        calendar_name: normalizeString(input.calendarName, 300) || existing.data?.calendar_name || 'Primary calendar',
        google_account_email: normalizeString(input.googleAccountEmail, 320) || existing.data?.google_account_email || null,
        status: 'connected',
        sync_enabled: true,
        sync_direction: 'bidirectional',
        conflict_policy: 'quimera_wins_owned_google_wins_external',
        oauth_tokens_encrypted: encryptedTokens,
        oauth_token_expires_at: expiresAt,
        oauth_scope: input.tokens.scope || existing.data?.oauth_scope || GOOGLE_SCOPES,
        last_sync_status: 'pending',
        last_error: null,
        metadata: {
            ...normalizeRecord(existing.data?.metadata),
            connectedAt: now.toISOString(),
            tokenStorage: 'server_encrypted',
        },
        created_by: existing.data?.created_by || input.userId || null,
        updated_by: input.userId || existing.data?.updated_by || null,
        updated_at: now.toISOString(),
    };

    if (existing.data) {
        const { data, error } = await client
            .from('project_google_calendar_integrations')
            .update(row)
            .eq('id', existing.data.id)
            .select('*')
            .single();
        if (error) throw error;
        return data as GoogleCalendarIntegrationRow;
    }

    const { data, error } = await client
        .from('project_google_calendar_integrations')
        .insert({
            ...row,
            created_at: now.toISOString(),
        })
        .select('*')
        .single();
    if (error) throw error;
    return data as GoogleCalendarIntegrationRow;
}

export async function getGoogleCalendarIntegrationStatus(
    client: SupabaseLike,
    projectId: string,
    calendarId = DEFAULT_CALENDAR_ID,
) {
    const { data, error } = await client
        .from('project_google_calendar_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('provider', DEFAULT_PROVIDER)
        .eq('calendar_id', calendarId)
        .maybeSingle();
    if (error) throw error;

    const row = data as GoogleCalendarIntegrationRow | null;
    return {
        configured: Boolean(
            (process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID)
            && process.env.GOOGLE_CALENDAR_CLIENT_SECRET
            && process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY
            && (process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.APP_BASE_URL || process.env.VITE_PUBLIC_APP_URL || process.env.VERCEL_URL)
        ),
        connected: row?.status === 'connected',
        projectId,
        integrationId: row?.id,
        calendarId: row?.calendar_id || calendarId,
        calendarName: row?.calendar_name || 'Primary calendar',
        syncEnabled: row?.sync_enabled !== false,
        syncStatus: row?.last_sync_status || 'not_synced',
        lastFullSyncAt: row?.last_full_sync_at || null,
        lastIncrementalSyncAt: row?.last_incremental_sync_at || null,
        lastSyncAt: row?.last_incremental_sync_at || row?.last_full_sync_at || null,
        lastError: row?.last_error || null,
        watchExpiresAt: row?.watch_expires_at || null,
        webhookPendingSync: Boolean(row?.webhook_pending_sync),
    };
}

export async function disconnectGoogleCalendarIntegration(
    client: SupabaseLike,
    projectId: string,
    calendarId = DEFAULT_CALENDAR_ID,
): Promise<void> {
    const now = new Date().toISOString();
    await updateOrThrow(client
        .from('project_google_calendar_integrations')
        .update({
            status: 'disconnected',
            sync_enabled: false,
            oauth_tokens_encrypted: {},
            oauth_token_expires_at: null,
            sync_token: null,
            watch_channel_id: null,
            watch_resource_id: null,
            watch_resource_uri: null,
            watch_token_hash: null,
            watch_expires_at: null,
            webhook_pending_sync: false,
            last_sync_status: 'not_synced',
            last_error: null,
            updated_at: now,
        })
        .eq('project_id', projectId)
        .eq('provider', DEFAULT_PROVIDER)
        .eq('calendar_id', calendarId));
}

export async function createOrRenewGoogleCalendarWatch(
    client: SupabaseLike,
    integration: GoogleCalendarIntegrationRow,
    options: GoogleCalendarSyncOptions = {},
): Promise<GoogleCalendarIntegrationRow> {
    const accessToken = await getValidGoogleAccessToken(client, integration, options);
    const now = new Date(toIso(options.now));
    const ttlSeconds = Math.max(3600, Math.min(options.watchTtlSeconds || DEFAULT_WATCH_TTL_SECONDS, DEFAULT_WATCH_TTL_SECONDS));
    const channelId = `qgc-${randomUUID()}`;
    const channelToken = randomBytes(24).toString('base64url');
    const address = requireEnvValue(
        options.webhookUrl ?? process.env.GOOGLE_CALENDAR_WEBHOOK_URL ?? buildWebhookUrlFromAppBase(),
        'GOOGLE_CALENDAR_WEBHOOK_URL',
    );
    const calendarId = encodeURIComponent(integration.calendar_id || DEFAULT_CALENDAR_ID);
    const response = await fetchGoogleJson<any>(`${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/watch`, {
        method: 'POST',
        headers: googleHeaders(accessToken),
        body: JSON.stringify({
            id: channelId,
            type: 'web_hook',
            address,
            token: channelToken,
            params: { ttl: String(ttlSeconds) },
        }),
    }, options.fetchImpl || fetch);

    const expiresAt = response.expiration
        ? new Date(Number(response.expiration)).toISOString()
        : addSeconds(now, ttlSeconds).toISOString();

    const { data, error } = await client
        .from('project_google_calendar_integrations')
        .update({
            watch_channel_id: channelId,
            watch_resource_id: response.resourceId || null,
            watch_resource_uri: response.resourceUri || null,
            watch_token_hash: sha256(channelToken),
            watch_expires_at: expiresAt,
            watch_address: address,
            updated_at: now.toISOString(),
        })
        .eq('id', integration.id)
        .select('*')
        .single();
    if (error) throw error;
    return data as GoogleCalendarIntegrationRow;
}

export async function markGoogleCalendarWebhookPending(
    client: SupabaseLike,
    headers: IncomingHttpHeaders | Record<string, string | string[] | undefined>,
    now: string | Date = new Date(),
): Promise<GoogleCalendarWebhookResult> {
    const channelId = readHeader(headers, 'x-goog-channel-id');
    const channelToken = readHeader(headers, 'x-goog-channel-token');
    const resourceId = readHeader(headers, 'x-goog-resource-id');
    const state = readHeader(headers, 'x-goog-resource-state');
    const messageNumber = readHeader(headers, 'x-goog-message-number');

    if (!channelId) return { matched: false, reason: 'missing_channel_id' };

    const { data, error } = await client
        .from('project_google_calendar_integrations')
        .select('*')
        .eq('watch_channel_id', channelId)
        .maybeSingle();
    if (error) throw error;
    const integration = data as GoogleCalendarIntegrationRow | null;
    if (!integration) return { matched: false, reason: 'unknown_channel' };
    if (integration.watch_resource_id && resourceId && integration.watch_resource_id !== resourceId) {
        return { matched: false, reason: 'resource_mismatch' };
    }
    if (integration.watch_token_hash && sha256(channelToken || '') !== integration.watch_token_hash) {
        return { matched: false, reason: 'token_mismatch' };
    }

    await updateOrThrow(client
        .from('project_google_calendar_integrations')
        .update({
            webhook_pending_sync: true,
            webhook_last_state: state || null,
            webhook_last_message_number: messageNumber || null,
            webhook_last_at: toIso(now),
            updated_at: toIso(now),
        })
        .eq('id', integration.id));

    return {
        matched: true,
        integrationId: integration.id,
        projectId: integration.project_id,
        state,
        messageNumber,
    };
}

export async function processGoogleCalendarSyncJobs(
    client: SupabaseLike,
    options: GoogleCalendarSyncOptions = {},
): Promise<{ processed: number; summaries: GoogleCalendarSyncSummary[] }> {
    const limit = Math.max(1, Math.min(options.limit || 25, 100));
    const { data, error } = await client
        .from('project_google_calendar_integrations')
        .select('*')
        .eq('provider', DEFAULT_PROVIDER)
        .eq('status', 'connected')
        .eq('sync_enabled', true)
        .limit(limit);
    if (error) throw error;

    const summaries: GoogleCalendarSyncSummary[] = [];
    for (const integration of (data || []) as GoogleCalendarIntegrationRow[]) {
        try {
            summaries.push(await syncGoogleCalendarIntegration(client, integration, options));
        } catch (error: any) {
            summaries.push({
                integrationId: integration.id,
                projectId: integration.project_id,
                pushed: 0,
                imported: 0,
                updated: 0,
                reviewQueued: 0,
                skipped: 0,
                errors: [error.message || 'Google Calendar sync failed.'],
                syncToken: integration.sync_token || null,
            });
            await updateOrThrow(client
                .from('project_google_calendar_integrations')
                .update({
                    last_sync_status: 'error',
                    last_error: error.message || 'Google Calendar sync failed.',
                    updated_at: toIso(options.now),
                })
                .eq('id', integration.id));
        }
    }

    return { processed: summaries.length, summaries };
}

export async function syncGoogleCalendarIntegration(
    client: SupabaseLike,
    integration: GoogleCalendarIntegrationRow,
    options: GoogleCalendarSyncOptions = {},
): Promise<GoogleCalendarSyncSummary> {
    const now = new Date(toIso(options.now));
    let current = integration;
    const summary: GoogleCalendarSyncSummary = {
        integrationId: integration.id,
        projectId: integration.project_id,
        pushed: 0,
        imported: 0,
        updated: 0,
        reviewQueued: 0,
        skipped: 0,
        errors: [],
        syncToken: integration.sync_token || null,
    };

    if (options.renewWatch !== false && shouldRenewWatch(current, now)) {
        try {
            current = await createOrRenewGoogleCalendarWatch(client, current, options);
        } catch (error: any) {
            summary.errors.push(`watch:${error.message || 'renew_failed'}`);
        }
    }

    const accessToken = await getValidGoogleAccessToken(client, current, options);

    if (options.pushToGoogle !== false) {
        const pushSummary = await pushQuimeraAppointmentsToGoogle(client, current, accessToken, options);
        summary.pushed += pushSummary.pushed;
        summary.skipped += pushSummary.skipped;
        summary.errors.push(...pushSummary.errors);
    }

    if (options.pullFromGoogle !== false) {
        const pullSummary = await pullGoogleEventsToQuimera(client, current, accessToken, options);
        summary.imported += pullSummary.imported;
        summary.updated += pullSummary.updated;
        summary.reviewQueued += pullSummary.reviewQueued;
        summary.skipped += pullSummary.skipped;
        summary.errors.push(...pullSummary.errors);
        summary.syncToken = pullSummary.syncToken;
    }

    const isFullSync = options.forceFullSync || !integration.sync_token;
    await updateOrThrow(client
        .from('project_google_calendar_integrations')
        .update({
            sync_token: summary.syncToken || current.sync_token || null,
            sync_token_updated_at: summary.syncToken ? now.toISOString() : current.sync_token_updated_at || null,
            last_full_sync_at: isFullSync ? now.toISOString() : current.last_full_sync_at || null,
            last_incremental_sync_at: now.toISOString(),
            last_sync_status: summary.errors.length ? 'error' : 'synced',
            last_error: summary.errors[0] || null,
            webhook_pending_sync: false,
            updated_at: now.toISOString(),
        })
        .eq('id', current.id));

    return summary;
}

async function getValidGoogleAccessToken(
    client: SupabaseLike,
    integration: GoogleCalendarIntegrationRow,
    options: GoogleCalendarSyncOptions,
): Promise<string> {
    const encryptionKey = requireEnvValue(options.encryptionKey ?? process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY, 'GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY');
    const tokens = decryptGoogleCalendarTokens(integration.oauth_tokens_encrypted, encryptionKey);
    const expiresAt = integration.oauth_token_expires_at ? new Date(integration.oauth_token_expires_at).getTime() : 0;
    const referenceNow = options.now ? new Date(options.now).getTime() : Date.now();
    const nowMs = Number.isNaN(referenceNow) ? Date.now() : referenceNow;
    if (tokens.accessToken && expiresAt > nowMs + TOKEN_REFRESH_SKEW_MS) return tokens.accessToken;
    if (!tokens.refreshToken) {
        throw Object.assign(new Error('Google Calendar refresh token is missing. Reconnect Google Calendar.'), { status: 401 });
    }

    const clientId = requireEnvValue(options.clientId ?? process.env.GOOGLE_CALENDAR_CLIENT_ID ?? process.env.VITE_GOOGLE_CLIENT_ID, 'GOOGLE_CALENDAR_CLIENT_ID');
    const clientSecret = requireEnvValue(options.clientSecret ?? process.env.GOOGLE_CALENDAR_CLIENT_SECRET, 'GOOGLE_CALENDAR_CLIENT_SECRET');
    const body = new URLSearchParams();
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    body.set('refresh_token', tokens.refreshToken);
    body.set('grant_type', 'refresh_token');

    const refreshed = normalizeTokenResponse(await fetchGoogleJson<any>(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    }, options.fetchImpl || fetch));
    const expiresAtIso = refreshed.expiresIn
        ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
        : integration.oauth_token_expires_at || null;
    const encrypted = encryptGoogleCalendarTokens({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken || tokens.refreshToken,
        tokenType: refreshed.tokenType || tokens.tokenType,
        scope: refreshed.scope || tokens.scope,
    }, encryptionKey);

    await updateOrThrow(client
        .from('project_google_calendar_integrations')
        .update({
            oauth_tokens_encrypted: encrypted,
            oauth_token_expires_at: expiresAtIso,
            oauth_scope: refreshed.scope || integration.oauth_scope,
            updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id));

    return refreshed.accessToken;
}

async function pushQuimeraAppointmentsToGoogle(
    client: SupabaseLike,
    integration: GoogleCalendarIntegrationRow,
    accessToken: string,
    options: GoogleCalendarSyncOptions,
) {
    const limit = Math.max(1, Math.min(options.limit || 50, 100));
    const { data, error } = await client
        .from('project_appointments')
        .select('*')
        .eq('project_id', integration.project_id)
        .neq('source', DEFAULT_PROVIDER)
        .limit(limit);
    if (error) throw error;

    const summary = { pushed: 0, skipped: 0, errors: [] as string[] };
    for (const appointment of data || []) {
        if (!appointment.start_date || !appointment.end_date) {
            summary.skipped += 1;
            continue;
        }
        try {
            const event = await upsertAppointmentToGoogleEvent(appointment, integration, accessToken, options);
            await updateOrThrow(client
                .from('project_appointments')
                .update({
                    google_sync: buildGoogleSyncPayload(event, integration.calendar_id || DEFAULT_CALENDAR_ID),
                    sync_key: appointment.sync_key || buildGoogleSyncKey(event, integration.calendar_id || DEFAULT_CALENDAR_ID),
                    metadata: {
                        ...normalizeRecord(appointment.metadata),
                        googleCalendar: {
                            ...normalizeRecord(normalizeRecord(appointment.metadata).googleCalendar),
                            calendarId: integration.calendar_id || DEFAULT_CALENDAR_ID,
                            eventId: event.id,
                            etag: event.etag,
                            htmlLink: event.htmlLink,
                            lastPushedAt: toIso(options.now),
                        },
                    },
                    updated_at: toIso(options.now),
                })
                .eq('id', appointment.id));
            summary.pushed += 1;
        } catch (error: any) {
            summary.errors.push(`${appointment.id}:${error.message || 'push_failed'}`);
        }
    }
    return summary;
}

async function upsertAppointmentToGoogleEvent(
    appointment: JsonRecord,
    integration: GoogleCalendarIntegrationRow,
    accessToken: string,
    options: GoogleCalendarSyncOptions,
): Promise<GoogleCalendarEvent> {
    const calendarId = encodeURIComponent(integration.calendar_id || DEFAULT_CALENDAR_ID);
    const eventId = normalizeString(normalizeRecord(appointment.google_sync).googleEventId, 500);
    const resource = appointmentRowToGoogleEvent(appointment);
    const fetchImpl = options.fetchImpl || fetch;

    if (eventId) {
        try {
            return await fetchGoogleJson<GoogleCalendarEvent>(
                `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1&sendUpdates=all`,
                {
                    method: 'PATCH',
                    headers: googleHeaders(accessToken),
                    body: JSON.stringify(resource),
                },
                fetchImpl,
            );
        } catch (error: any) {
            if (error.status !== 404 && error.status !== 410) throw error;
        }
    }

    return fetchGoogleJson<GoogleCalendarEvent>(
        `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events?conferenceDataVersion=1&sendUpdates=all`,
        {
            method: 'POST',
            headers: googleHeaders(accessToken),
            body: JSON.stringify(resource),
        },
        fetchImpl,
    );
}

async function pullGoogleEventsToQuimera(
    client: SupabaseLike,
    integration: GoogleCalendarIntegrationRow,
    accessToken: string,
    options: GoogleCalendarSyncOptions,
) {
    const summary = { imported: 0, updated: 0, reviewQueued: 0, skipped: 0, errors: [] as string[], syncToken: integration.sync_token || null as string | null };
    let pageToken: string | undefined;
    let clearedExpiredToken = false;

    while (true) {
        const url = buildGoogleEventsListUrl(integration, options, pageToken, clearedExpiredToken);
        try {
            const response = await fetchGoogleJson<any>(url, { headers: googleHeaders(accessToken) }, options.fetchImpl || fetch);
            for (const event of response.items || []) {
                const result = await upsertGoogleCalendarEventIntoAppointments(client, integration, event, options.now);
                summary[result.status] += 1;
            }
            pageToken = response.nextPageToken;
            if (response.nextSyncToken) summary.syncToken = response.nextSyncToken;
            if (!pageToken) break;
        } catch (error: any) {
            if (error.status === 410 && integration.sync_token && !clearedExpiredToken) {
                clearedExpiredToken = true;
                pageToken = undefined;
                summary.syncToken = null;
                await updateOrThrow(client
                    .from('project_google_calendar_integrations')
                    .update({
                        sync_token: null,
                        sync_token_updated_at: null,
                        last_sync_status: 'pending_full_resync',
                        updated_at: toIso(options.now),
                    })
                    .eq('id', integration.id));
                continue;
            }
            throw error;
        }
    }

    return summary;
}

export async function upsertGoogleCalendarEventIntoAppointments(
    client: SupabaseLike,
    integration: GoogleCalendarIntegrationRow,
    event: GoogleCalendarEvent,
    now: string | Date = new Date(),
): Promise<{ status: 'imported' | 'updated' | 'reviewQueued' | 'skipped' }> {
    const calendarId = integration.calendar_id || DEFAULT_CALENDAR_ID;
    const syncKey = buildGoogleSyncKey(event, calendarId);
    if (!syncKey) return { status: 'skipped' };

    const quimeraId = normalizeString(event.extendedProperties?.private?.quimeraId, 120);
    const existing = quimeraId
        ? await findAppointmentById(client, integration.project_id, quimeraId)
        : await findAppointmentBySyncKey(client, integration.project_id, syncKey);

    if (event.status === 'cancelled' && !existing) return { status: 'skipped' };

    if (existing && existing.source !== DEFAULT_PROVIDER) {
        await queueGoogleExternalReview(client, existing, event, calendarId, now);
        return { status: 'reviewQueued' };
    }

    const row = googleEventToAppointmentRow(event, integration, now);
    if (!row) return { status: 'skipped' };

    if (existing) {
        await updateOrThrow(client
            .from('project_appointments')
            .update({
                ...row,
                updated_at: toIso(now),
            })
            .eq('id', existing.id));
        return { status: 'updated' };
    }

    await insertOrThrow(client
        .from('project_appointments')
        .insert({
            ...row,
            created_at: toIso(now),
            updated_at: toIso(now),
        }));
    return { status: 'imported' };
}

function buildGoogleEventsListUrl(
    integration: GoogleCalendarIntegrationRow,
    options: GoogleCalendarSyncOptions,
    pageToken?: string,
    forceFullSync?: boolean,
): string {
    const calendarId = encodeURIComponent(integration.calendar_id || DEFAULT_CALENDAR_ID);
    const url = new URL(`${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events`);
    url.searchParams.set('maxResults', String(Math.max(1, Math.min(options.limit || 250, 2500))));
    url.searchParams.set('showDeleted', 'true');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const syncToken = !forceFullSync && !options.forceFullSync ? integration.sync_token : null;
    if (syncToken) {
        url.searchParams.set('syncToken', syncToken);
        return url.toString();
    }

    const now = new Date(toIso(options.now));
    const timeMin = options.timeMin ? new Date(toIso(options.timeMin)) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const timeMax = options.timeMax ? new Date(toIso(options.timeMax)) : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('timeMin', timeMin.toISOString());
    url.searchParams.set('timeMax', timeMax.toISOString());
    return url.toString();
}

function googleEventToAppointmentRow(
    event: GoogleCalendarEvent,
    integration: GoogleCalendarIntegrationRow,
    now: string | Date,
): JsonRecord | null {
    const calendarId = integration.calendar_id || DEFAULT_CALENDAR_ID;
    const parsedDate = parseGoogleEventDate(event);
    const syncKey = buildGoogleSyncKey(event, calendarId);
    if (!parsedDate || !syncKey) return null;
    const metadata = buildGoogleCalendarMetadata(event, calendarId, syncKey);
    const ext = event.extendedProperties?.private || {};

    return {
        tenant_id: integration.tenant_id || null,
        project_id: integration.project_id,
        title: normalizeString(event.summary, 250) || 'Google Calendar event',
        description: normalizeString(stripGoogleDescriptionMetadata(event.description), 5000) || '',
        type: ext.quimeraType || 'consultation',
        status: event.status === 'cancelled' ? 'cancelled' : (ext.quimeraStatus || 'scheduled'),
        priority: ext.quimeraPriority || 'medium',
        start_date: parsedDate.startIso,
        end_date: parsedDate.endIso,
        timezone: parsedDate.timezone,
        all_day: parsedDate.allDay,
        organizer_id: null,
        organizer_name: event.organizer?.displayName || event.creator?.displayName || null,
        organizer_email: event.organizer?.email || event.creator?.email || null,
        participants: mapGoogleParticipants(event),
        location: mapGoogleLocation(event),
        reminders: mapGoogleReminders(event),
        attachments: [],
        notes: [],
        follow_up_actions: [],
        ai_prep_enabled: false,
        linked_lead_ids: [],
        tags: extractGoogleTags(event.description),
        source: DEFAULT_PROVIDER,
        source_component: 'GoogleCalendar',
        source_module: 'appointments',
        sync_key: syncKey,
        idempotency_key: syncKey,
        created_by_system: true,
        needs_review: true,
        generated_by_ai: false,
        correlation_id: `google_calendar:${event.id || event.iCalUID || randomUUID()}`,
        google_sync: buildGoogleSyncPayload(event, calendarId),
        metadata: {
            ...metadata,
            importedAt: toIso(now),
        },
    };
}

async function queueGoogleExternalReview(
    client: SupabaseLike,
    existing: JsonRecord,
    event: GoogleCalendarEvent,
    calendarId: string,
    now: string | Date,
) {
    const syncKey = buildGoogleSyncKey(event, calendarId);
    await updateOrThrow(client
        .from('project_appointments')
        .update({
            google_sync: buildGoogleSyncPayload(event, calendarId),
            needs_review: true,
            metadata: {
                ...normalizeRecord(existing.metadata),
                googleCalendar: {
                    ...normalizeRecord(normalizeRecord(existing.metadata).googleCalendar),
                    ...normalizeRecord(buildGoogleCalendarMetadata(event, calendarId, syncKey || '').googleCalendar),
                    externalChangePendingReview: true,
                    externalChangeQueuedAt: toIso(now),
                    conflictPolicy: 'quimera_wins_owned_google_wins_external',
                },
            },
            updated_at: toIso(now),
        })
        .eq('id', existing.id));
}

async function findAppointmentById(client: SupabaseLike, projectId: string, appointmentId: string): Promise<JsonRecord | null> {
    const { data, error } = await client
        .from('project_appointments')
        .select('*')
        .eq('id', appointmentId)
        .eq('project_id', projectId)
        .maybeSingle();
    if (error) throw error;
    return data || null;
}

async function findAppointmentBySyncKey(client: SupabaseLike, projectId: string, syncKey: string): Promise<JsonRecord | null> {
    const { data, error } = await client
        .from('project_appointments')
        .select('*')
        .eq('project_id', projectId)
        .eq('sync_key', syncKey)
        .maybeSingle();
    if (error) throw error;
    return data || null;
}

function appointmentRowToGoogleEvent(appointment: JsonRecord): GoogleCalendarEvent {
    const event: GoogleCalendarEvent = {
        summary: normalizeString(appointment.title, 250) || 'Appointment',
        description: normalizeString(appointment.description, 5000) || '',
        status: appointment.status === 'cancelled' ? 'cancelled' : 'confirmed',
        start: {},
        end: {},
        extendedProperties: {
            private: {
                quimeraId: String(appointment.id || ''),
                quimeraProjectId: String(appointment.project_id || ''),
                quimeraType: String(appointment.type || ''),
                quimeraPriority: String(appointment.priority || ''),
                quimeraStatus: String(appointment.status || ''),
                quimeraOrganizerId: String(appointment.organizer_id || ''),
            },
        },
        reminders: buildGoogleReminderPayload(appointment.reminders),
    };

    if (appointment.all_day) {
        event.start = { date: String(appointment.start_date).slice(0, 10) };
        const end = new Date(appointment.end_date);
        end.setDate(end.getDate() + 1);
        event.end = { date: end.toISOString().slice(0, 10) };
    } else {
        event.start = {
            dateTime: toIso(appointment.start_date),
            timeZone: appointment.timezone || 'UTC',
        };
        event.end = {
            dateTime: toIso(appointment.end_date),
            timeZone: appointment.timezone || 'UTC',
        };
    }

    const location = normalizeRecord(appointment.location);
    if (location.type === 'physical' && location.address) event.location = String(location.address);
    if (location.type === 'virtual' && location.meetingUrl) event.location = String(location.meetingUrl);
    if (location.type === 'phone' && location.phoneNumber) event.location = `Tel: ${location.phoneNumber}`;

    const attendees = Array.isArray(appointment.participants) ? appointment.participants : [];
    event.attendees = attendees
        .filter((participant: JsonRecord) => normalizeString(participant.email, 320))
        .map((participant: JsonRecord) => ({
            email: participant.email,
            displayName: participant.name,
            responseStatus: participant.status === 'accepted' ? 'accepted' : 'needsAction',
        }));

    if (location.type === 'virtual' && !location.meetingUrl) {
        event.conferenceData = {
            createRequest: {
                requestId: `quimera-${appointment.id}-${Date.now()}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
        };
    }

    return event;
}

function parseGoogleEventDate(event: GoogleCalendarEvent) {
    if (!event.start || !event.end) return null;
    const allDay = Boolean(event.start.date && !event.start.dateTime);
    if (allDay) {
        const start = new Date(`${event.start.date}T00:00:00.000Z`);
        const end = new Date(`${event.end.date}T00:00:00.000Z`);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
        end.setDate(end.getDate() - 1);
        end.setUTCHours(23, 59, 59, 999);
        return {
            startIso: start.toISOString(),
            endIso: end.toISOString(),
            timezone: event.start.timeZone || 'UTC',
            allDay: true,
        };
    }

    const start = new Date(event.start.dateTime || '');
    const end = new Date(event.end.dateTime || '');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
    return {
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        timezone: event.start.timeZone || event.end.timeZone || 'UTC',
        allDay: false,
    };
}

function buildGoogleSyncKey(event: GoogleCalendarEvent, calendarId: string): string | undefined {
    const eventKey = event.id || event.iCalUID;
    return eventKey ? `${DEFAULT_PROVIDER}:${calendarId}:${eventKey}` : undefined;
}

function buildGoogleSyncPayload(event: GoogleCalendarEvent, calendarId: string) {
    return {
        enabled: true,
        googleEventId: event.id,
        googleCalendarId: calendarId,
        syncStatus: 'synced',
        lastSyncAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
        htmlLink: event.htmlLink,
        iCalUID: event.iCalUID,
        etag: event.etag,
    };
}

function buildGoogleCalendarMetadata(event: GoogleCalendarEvent, calendarId: string, syncKey: string) {
    return {
        source: DEFAULT_PROVIDER,
        sourceComponent: 'GoogleCalendar',
        sourceModule: 'appointments',
        syncKey,
        googleCalendar: {
            calendarId,
            eventId: event.id,
            iCalUID: event.iCalUID,
            etag: event.etag,
            htmlLink: event.htmlLink,
            status: event.status,
            created: event.created,
            updated: event.updated,
            creatorEmail: event.creator?.email,
            organizerEmail: event.organizer?.email,
            syncOwner: event.extendedProperties?.private?.quimeraId ? 'quimera' : 'google',
        },
    };
}

function mapGoogleParticipants(event: GoogleCalendarEvent) {
    return (event.attendees || [])
        .filter(attendee => normalizeString(attendee.email, 320))
        .map((attendee, index) => ({
            id: `google-${attendee.email}-${index}`,
            type: 'external',
            name: attendee.displayName || String(attendee.email).split('@')[0],
            email: attendee.email,
            role: attendee.organizer ? 'host' : 'attendee',
            status: attendee.responseStatus === 'accepted'
                ? 'accepted'
                : attendee.responseStatus === 'declined'
                    ? 'declined'
                    : attendee.responseStatus === 'tentative'
                        ? 'tentative'
                        : 'pending',
        }));
}

function mapGoogleLocation(event: GoogleCalendarEvent) {
    const meetUrl = event.conferenceData?.entryPoints?.find(entry => entry.entryPointType === 'video')?.uri;
    if (meetUrl) return { type: 'virtual', meetingUrl: meetUrl, platform: 'google_meet' };
    if (!event.location) return { type: 'virtual' };
    if (event.location.startsWith('http')) return { type: 'virtual', meetingUrl: event.location };
    if (event.location.startsWith('Tel:')) return { type: 'phone', phoneNumber: event.location.replace(/^Tel:\s*/, '') };
    return { type: 'physical', address: event.location };
}

function mapGoogleReminders(event: GoogleCalendarEvent) {
    return (event.reminders?.overrides || []).map((reminder, index) => ({
        id: `google-reminder-${index}`,
        type: reminder.method === 'email' ? 'email' : 'push',
        minutesBefore: typeof reminder.minutes === 'number' ? reminder.minutes : 60,
        sent: false,
        enabled: true,
    }));
}

function buildGoogleReminderPayload(reminders: unknown) {
    const list = Array.isArray(reminders) ? reminders : [];
    const enabled = list.filter((reminder: JsonRecord) => reminder.enabled !== false);
    if (!enabled.length) return { useDefault: true };
    return {
        useDefault: false,
        overrides: enabled.map((reminder: JsonRecord) => ({
            method: reminder.type === 'email' ? 'email' : 'popup',
            minutes: Number(reminder.minutesBefore || 60),
        })),
    };
}

function stripGoogleDescriptionMetadata(description?: string) {
    if (!description) return '';
    return description
        .split('\n')
        .filter(line => !line.trim().startsWith('#') && !line.includes('quimera.ai'))
        .join('\n')
        .trim();
}

function extractGoogleTags(description?: string): string[] {
    if (!description) return [];
    const matches = description.match(/#([a-zA-Z0-9_-]+)/g) || [];
    return Array.from(new Set(matches.map(tag => tag.slice(1))));
}

function shouldRenewWatch(integration: GoogleCalendarIntegrationRow, now: Date): boolean {
    if (!integration.watch_channel_id || !integration.watch_expires_at) return true;
    const expiresAt = new Date(integration.watch_expires_at).getTime();
    return Number.isNaN(expiresAt) || expiresAt - now.getTime() < 24 * 60 * 60 * 1000;
}

function buildWebhookUrlFromAppBase(): string | null {
    const base = process.env.APP_BASE_URL || process.env.VITE_PUBLIC_APP_URL || process.env.VERCEL_URL;
    if (!base) return null;
    const normalized = base.startsWith('http') ? base : `https://${base}`;
    return `${normalized.replace(/\/$/, '')}/api/appointments/google/webhook`;
}

function googleHeaders(accessToken: string) {
    return {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    };
}

function normalizeTokenResponse(data: JsonRecord) {
    const accessToken = normalizeString(data.access_token, 4000);
    if (!accessToken) throw Object.assign(new Error('Google Calendar token response is missing access_token.'), { status: 502 });
    return {
        accessToken,
        refreshToken: normalizeString(data.refresh_token, 4000),
        expiresIn: typeof data.expires_in === 'number' ? data.expires_in : undefined,
        tokenType: normalizeString(data.token_type, 200) || 'Bearer',
        scope: normalizeString(data.scope, 4000),
    };
}

async function fetchGoogleJson<T>(url: string, init: RequestInit, fetchImpl: typeof fetch): Promise<T> {
    const response = await fetchImpl(url, init);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw Object.assign(new Error(String(data?.error?.message || data?.error_description || data?.message || 'Google Calendar API request failed.')), {
            status: response.status,
            googleError: data,
        });
    }
    return data as T;
}

async function updateOrThrow(query: PromiseLike<{ data?: any; error?: any }>): Promise<void> {
    const { error } = await query;
    if (error) throw error;
}

async function insertOrThrow(query: PromiseLike<{ data?: any; error?: any }>): Promise<void> {
    const { error } = await query;
    if (error) throw error;
}

function readHeader(headers: IncomingHttpHeaders | Record<string, string | string[] | undefined>, name: string): string | undefined {
    const direct = headers[name] ?? headers[name.toLowerCase()];
    const value = Array.isArray(direct) ? direct[0] : direct;
    return normalizeString(value, 2000);
}
