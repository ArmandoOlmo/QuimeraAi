type SupabaseClient = any;

export interface EmailAnalyticsInput {
    supabase: SupabaseClient;
    projectId: string;
    since?: string | Date | null;
    limit?: number;
}

export interface CanonicalEmailAnalytics {
    summary: {
        totalLogs: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        complained: number;
        unsubscribed: number;
        skipped: number;
        failed: number;
        queued: number;
        sending: number;
        deliveryRate: string;
        openRate: string;
        clickRate: string;
        bounceRate: string;
    };
    outbox: {
        total: number;
        queued: number;
        sending: number;
        sent: number;
        skipped: number;
        failed: number;
        due: number;
        locked: number;
    };
    events: {
        total: number;
        byType: Record<string, number>;
    };
    sourceModules: Array<{
        sourceModule: string;
        total: number;
        sent: number;
        failed: number;
        skipped: number;
    }>;
    journeys: Array<{
        automationId: string;
        sourceModule: string;
        total: number;
        queued: number;
        sent: number;
        skipped: number;
        failed: number;
        opened: number;
        clicked: number;
        revenue: number;
        paths: string[];
    }>;
    automationSteps: Array<{
        automationId: string;
        stepId: string;
        total: number;
        queued: number;
        sent: number;
        skipped: number;
        failed: number;
        opened: number;
        clicked: number;
        revenue: number;
        averageDelayMinutes: number;
    }>;
    revenue: {
        total: number;
        orders: number;
        bySourceModule: Array<{ sourceModule: string; revenue: number; orders: number }>;
        byAutomation: Array<{ automationId: string; revenue: number; orders: number }>;
    };
    recipientTimelines: Array<{
        recipientEmail: string;
        total: number;
        events: Array<{
            type: 'log' | 'event';
            at: string | null;
            status?: string;
            eventType?: string;
            subject?: string;
            logId?: string;
            eventId?: string;
            campaignId?: string | null;
            automationId?: string | null;
            automationStepId?: string | null;
            sourceModule?: string;
        }>;
    }>;
    recentLogs: Array<Record<string, any>>;
    recentEvents: Array<Record<string, any>>;
}

const SENT_STATUSES = new Set(['sent', 'delivered', 'opened', 'clicked']);

export async function getEmailAnalytics(input: EmailAnalyticsInput): Promise<CanonicalEmailAnalytics> {
    const limit = Math.max(25, Math.min(Number(input.limit || 500), 1000));
    const since = normalizeSince(input.since);

    const [logs, outbox, events] = await Promise.all([
        loadRows(input.supabase, 'email_logs', input.projectId, since, limit, 'created_at'),
        loadRows(input.supabase, 'email_outbox', input.projectId, since, limit, 'created_at'),
        loadRows(input.supabase, 'email_events', input.projectId, since, limit, 'received_at'),
    ]);

    const summary = summarizeLogs(logs);
    const outboxSummary = summarizeOutbox(outbox);
    const eventSummary = summarizeEvents(events);

    return {
        summary,
        outbox: outboxSummary,
        events: eventSummary,
        sourceModules: summarizeSourceModules(logs),
        journeys: summarizeJourneys(logs),
        automationSteps: summarizeAutomationSteps(logs),
        revenue: summarizeRevenue(logs),
        recipientTimelines: summarizeRecipientTimelines(logs, events),
        recentLogs: logs.slice(0, 25),
        recentEvents: events.slice(0, 25),
    };
}

async function loadRows(
    supabase: SupabaseClient,
    table: string,
    projectId: string,
    since: string | null,
    limit: number,
    orderColumn: string,
) {
    let query = supabase
        .from(table)
        .select('*')
        .eq('project_id', projectId)
        .order(orderColumn, { ascending: false })
        .limit(limit);
    if (since) query = query.gte(orderColumn, since);
    const { data, error } = await query;
    if (error) throw error;
    return Array.isArray(data) ? data : [];
}

function summarizeLogs(logs: Array<Record<string, any>>): CanonicalEmailAnalytics['summary'] {
    const sent = logs.filter(log => SENT_STATUSES.has(String(log.status || ''))).length;
    const delivered = logs.filter(log => ['delivered', 'opened', 'clicked'].includes(String(log.status || '')) || log.delivered_at).length;
    const opened = logs.filter(log => String(log.status || '') === 'opened' || Number(log.open_count || 0) > 0 || log.opened_at).length;
    const clicked = logs.filter(log => String(log.status || '') === 'clicked' || Number(log.click_count || 0) > 0 || log.clicked_at).length;
    const bounced = logs.filter(log => String(log.status || '') === 'bounced' || log.bounced_at).length;
    const complained = logs.filter(log => String(log.status || '') === 'complained' || log.complained_at).length;
    const unsubscribed = logs.filter(log => String(log.status || '') === 'unsubscribed' || log.skipped_reason === 'unsubscribed').length;
    const skipped = logs.filter(log => String(log.status || '') === 'skipped').length;
    const failed = logs.filter(log => String(log.status || '') === 'failed').length;
    const queued = logs.filter(log => String(log.status || '') === 'queued').length;
    const sending = logs.filter(log => String(log.status || '') === 'sending').length;

    return {
        totalLogs: logs.length,
        sent,
        delivered,
        opened,
        clicked,
        bounced,
        complained,
        unsubscribed,
        skipped,
        failed,
        queued,
        sending,
        deliveryRate: percent(delivered, sent || logs.length),
        openRate: percent(opened, delivered || sent),
        clickRate: percent(clicked, opened || delivered || sent),
        bounceRate: percent(bounced, sent || logs.length),
    };
}

function summarizeOutbox(rows: Array<Record<string, any>>): CanonicalEmailAnalytics['outbox'] {
    const now = Date.now();
    const initial: CanonicalEmailAnalytics['outbox'] = {
        total: 0,
        queued: 0,
        sending: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        due: 0,
        locked: 0,
    };

    return rows.reduce<CanonicalEmailAnalytics['outbox']>((acc, row) => {
        const status = String(row.status || 'queued');
        acc.total += 1;
        if (status in acc) (acc as any)[status] += 1;
        if (status === 'queued' && new Date(row.scheduled_at || 0).getTime() <= now) acc.due += 1;
        if (row.locked_at && status === 'sending') acc.locked += 1;
        return acc;
    }, initial);
}

function summarizeEvents(events: Array<Record<string, any>>): CanonicalEmailAnalytics['events'] {
    return {
        total: events.length,
        byType: events.reduce((acc, event) => {
            const type = String(event.event_type || 'unknown');
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
    };
}

function summarizeSourceModules(logs: Array<Record<string, any>>): CanonicalEmailAnalytics['sourceModules'] {
    const map = new Map<string, { sourceModule: string; total: number; sent: number; failed: number; skipped: number }>();
    for (const log of logs) {
        const sourceModule = String(log.source_module || log.metadata?.sourceModule || 'email');
        const row = map.get(sourceModule) || { sourceModule, total: 0, sent: 0, failed: 0, skipped: 0 };
        row.total += 1;
        if (SENT_STATUSES.has(String(log.status || ''))) row.sent += 1;
        if (String(log.status || '') === 'failed') row.failed += 1;
        if (String(log.status || '') === 'skipped') row.skipped += 1;
        map.set(sourceModule, row);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function summarizeJourneys(logs: Array<Record<string, any>>): CanonicalEmailAnalytics['journeys'] {
    const map = new Map<string, CanonicalEmailAnalytics['journeys'][number] & { pathSet: Set<string> }>();
    for (const log of logs) {
        const automationId = String(log.automation_id || log.metadata?.automationId || '').trim();
        if (!automationId) continue;
        const status = String(log.status || '');
        const row = map.get(automationId) || {
            automationId,
            sourceModule: String(log.source_module || log.metadata?.sourceModule || 'email-marketing'),
            total: 0,
            queued: 0,
            sent: 0,
            skipped: 0,
            failed: 0,
            opened: 0,
            clicked: 0,
            revenue: 0,
            paths: [],
            pathSet: new Set<string>(),
        };
        row.total += 1;
        if (status === 'queued') row.queued += 1;
        if (SENT_STATUSES.has(status)) row.sent += 1;
        if (status === 'skipped') row.skipped += 1;
        if (status === 'failed') row.failed += 1;
        if (status === 'opened' || Number(log.open_count || 0) > 0 || log.opened_at) row.opened += 1;
        if (status === 'clicked' || Number(log.click_count || 0) > 0 || log.clicked_at) row.clicked += 1;
        row.revenue += readRevenueAmount(log);
        const path = readJourneyPath(log);
        if (path && !row.pathSet.has(path)) {
            row.pathSet.add(path);
            row.paths.push(path);
        }
        map.set(automationId, row);
    }
    return Array.from(map.values())
        .map(({ pathSet: _pathSet, ...row }) => row)
        .sort((a, b) => b.total - a.total);
}

function summarizeAutomationSteps(logs: Array<Record<string, any>>): CanonicalEmailAnalytics['automationSteps'] {
    const map = new Map<string, CanonicalEmailAnalytics['automationSteps'][number] & { delayTotal: number; delayCount: number }>();
    for (const log of logs) {
        const automationId = String(log.automation_id || log.metadata?.automationId || '').trim();
        const stepId = String(log.automation_step_id || log.metadata?.automationStepId || '').trim();
        if (!automationId || !stepId) continue;
        const key = `${automationId}:${stepId}`;
        const status = String(log.status || '');
        const row = map.get(key) || {
            automationId,
            stepId,
            total: 0,
            queued: 0,
            sent: 0,
            skipped: 0,
            failed: 0,
            opened: 0,
            clicked: 0,
            revenue: 0,
            averageDelayMinutes: 0,
            delayTotal: 0,
            delayCount: 0,
        };
        row.total += 1;
        if (status === 'queued') row.queued += 1;
        if (SENT_STATUSES.has(status)) row.sent += 1;
        if (status === 'skipped') row.skipped += 1;
        if (status === 'failed') row.failed += 1;
        if (status === 'opened' || Number(log.open_count || 0) > 0 || log.opened_at) row.opened += 1;
        if (status === 'clicked' || Number(log.click_count || 0) > 0 || log.clicked_at) row.clicked += 1;
        row.revenue += readRevenueAmount(log);
        const delay = Number(log.metadata?.accumulatedDelayMinutes);
        if (Number.isFinite(delay)) {
            row.delayTotal += delay;
            row.delayCount += 1;
            row.averageDelayMinutes = Math.round(row.delayTotal / row.delayCount);
        }
        map.set(key, row);
    }
    return Array.from(map.values())
        .map(({ delayTotal: _delayTotal, delayCount: _delayCount, ...row }) => row)
        .sort((a, b) => b.total - a.total);
}

function summarizeRevenue(logs: Array<Record<string, any>>): CanonicalEmailAnalytics['revenue'] {
    const bySource = new Map<string, { sourceModule: string; revenue: number; orders: number }>();
    const byAutomation = new Map<string, { automationId: string; revenue: number; orders: number }>();
    let total = 0;
    let orders = 0;

    for (const log of logs) {
        const amount = readRevenueAmount(log);
        if (amount <= 0) continue;
        total += amount;
        orders += 1;

        const sourceModule = String(log.source_module || log.metadata?.sourceModule || 'email');
        const sourceRow = bySource.get(sourceModule) || { sourceModule, revenue: 0, orders: 0 };
        sourceRow.revenue += amount;
        sourceRow.orders += 1;
        bySource.set(sourceModule, sourceRow);

        const automationId = String(log.automation_id || log.metadata?.automationId || '').trim();
        if (automationId) {
            const automationRow = byAutomation.get(automationId) || { automationId, revenue: 0, orders: 0 };
            automationRow.revenue += amount;
            automationRow.orders += 1;
            byAutomation.set(automationId, automationRow);
        }
    }

    return {
        total,
        orders,
        bySourceModule: Array.from(bySource.values()).sort((a, b) => b.revenue - a.revenue),
        byAutomation: Array.from(byAutomation.values()).sort((a, b) => b.revenue - a.revenue),
    };
}

function summarizeRecipientTimelines(
    logs: Array<Record<string, any>>,
    events: Array<Record<string, any>>,
): CanonicalEmailAnalytics['recipientTimelines'] {
    const logById = new Map(logs.map(log => [String(log.id), log]));
    const map = new Map<string, CanonicalEmailAnalytics['recipientTimelines'][number]>();
    const add = (email: string, event: CanonicalEmailAnalytics['recipientTimelines'][number]['events'][number]) => {
        const recipientEmail = normalizeEmailValue(email);
        if (!recipientEmail) return;
        const row = map.get(recipientEmail) || { recipientEmail, total: 0, events: [] };
        row.events.push(event);
        row.total = row.events.length;
        map.set(recipientEmail, row);
    };

    for (const log of logs) {
        add(log.recipient_email || log.metadata?.recipientEmail || '', {
            type: 'log',
            at: String(log.created_at || log.sent_at || log.updated_at || '') || null,
            status: String(log.status || ''),
            subject: String(log.subject || ''),
            logId: String(log.id || ''),
            campaignId: log.campaign_id || null,
            automationId: log.automation_id || log.metadata?.automationId || null,
            automationStepId: log.automation_step_id || log.metadata?.automationStepId || null,
            sourceModule: String(log.source_module || log.metadata?.sourceModule || 'email'),
        });
    }

    for (const event of events) {
        const log = event.email_log_id ? logById.get(String(event.email_log_id)) : null;
        add(event.recipient_email || log?.recipient_email || '', {
            type: 'event',
            at: String(event.received_at || event.created_at || '') || null,
            eventType: String(event.event_type || 'unknown'),
            eventId: String(event.id || event.provider_event_id || ''),
            logId: event.email_log_id || log?.id || undefined,
            campaignId: event.campaign_id || log?.campaign_id || null,
            automationId: event.automation_id || log?.automation_id || log?.metadata?.automationId || null,
            automationStepId: event.automation_step_id || log?.automation_step_id || log?.metadata?.automationStepId || null,
            sourceModule: String(event.source_module || log?.source_module || log?.metadata?.sourceModule || 'provider'),
        });
    }

    return Array.from(map.values())
        .map(row => ({
            ...row,
            events: row.events
                .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
                .slice(0, 20),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
}

function readRevenueAmount(log: Record<string, any>) {
    const metadata = readObject(log.metadata);
    const payload = readObject(metadata.payload);
    const order = readObject(payload.order || metadata.order);
    const value = firstFiniteNumber([
        metadata.revenue,
        metadata.revenueAmount,
        metadata.revenue_amount,
        metadata.orderTotal,
        metadata.order_total,
        payload.revenue,
        payload.total,
        payload.totalAmount,
        payload.total_amount,
        order.total,
        order.totalAmount,
        order.total_amount,
    ]);
    return value > 0 ? value : 0;
}

function readJourneyPath(log: Record<string, any>) {
    const path = log.metadata?.journeyPath || log.metadata?.journey_path;
    return Array.isArray(path)
        ? path.map(item => String(item || '').trim()).filter(Boolean).join(' > ')
        : '';
}

function firstFiniteNumber(values: unknown[]) {
    for (const value of values) {
        if (value === undefined || value === null || value === '') continue;
        const parsed = typeof value === 'number' ? value : Number(String(value || '').replace(/[^0-9.-]+/g, ''));
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

function readObject(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function normalizeEmailValue(value: unknown) {
    return String(value || '').trim().toLowerCase();
}

function percent(part: number, total: number) {
    return total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';
}

function normalizeSince(value?: string | Date | null) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
