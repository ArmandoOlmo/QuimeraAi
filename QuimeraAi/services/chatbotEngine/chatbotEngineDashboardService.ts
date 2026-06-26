import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { recordChatbotEngineEvent } from './chatbotEngineEventService';

type SupabaseLike = Pick<SupabaseClient, 'from'>;

type HandoffDashboardAction = 'assign' | 'resolve';

export interface ChatbotEngineRuntimeEvent {
    id: string;
    eventType: string;
    actionType?: string | null;
    actionStatus: string;
    sourceSurface?: string | null;
    sourceModule?: string | null;
    conversationId?: string | null;
    leadId?: string | null;
    appointmentId?: string | null;
    correlationId?: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
}

export interface ChatbotEngineRuntimeConversation {
    id: string;
    channel: string;
    participantName?: string | null;
    participantEmail?: string | null;
    status: string;
    lastMessageAt?: string | null;
    messageCount: number;
    unreadCount: number;
    leadId?: string | null;
    assignedTo?: string | null;
    tags: string[];
    metadata: Record<string, unknown>;
}

export interface ChatbotEngineRuntimeHandoff {
    conversationId: string;
    participantName?: string | null;
    participantEmail?: string | null;
    leadId?: string | null;
    assignedTo?: string | null;
    reason: string;
    priority: string;
    summary?: string | null;
    requesterName?: string | null;
    requesterEmail?: string | null;
    requesterPhone?: string | null;
    sourceSurface?: string | null;
    sourceModule?: string | null;
    requestedAt?: string | null;
    lastMessageAt?: string | null;
    status: string;
    unreadCount: number;
}

export interface ChatbotEngineRuntimeSnapshot {
    projectId: string;
    events: ChatbotEngineRuntimeEvent[];
    conversations: ChatbotEngineRuntimeConversation[];
    handoffs: ChatbotEngineRuntimeHandoff[];
    analytics: {
        totalEvents: number;
        executedActions: number;
        blockedActions: number;
        observedEvents: number;
        duplicateActions: number;
        failedActions: number;
        leadEvents: number;
        appointmentEvents: number;
        handoffEvents: number;
        ecommerceEvents: number;
        emailMarketingEvents: number;
        financeEvents: number;
        restaurantEvents: number;
        realtyEvents: number;
        voiceEvents: number;
        highIntentEvents: number;
        lastEventAt?: string;
        actionBreakdown: Array<{ actionType: string; count: number }>;
        intentBreakdown: Array<{ intent: string; count: number }>;
        surfaceBreakdown: Array<{ sourceSurface: string; count: number }>;
        moduleBreakdown: Array<{ sourceModule: string; count: number }>;
    };
    inbox: {
        activeConversations: number;
        pendingConversations: number;
        escalatedConversations: number;
        unreadMessages: number;
        linkedLeads: number;
        lastConversationAt?: string;
    };
    warnings: string[];
}

export interface ChatbotEngineHandoffMutationInput {
    conversationId: string;
    actorId?: string | null;
    assigneeId?: string | null;
    note?: string | null;
    idempotencyKey?: string | null;
    now?: string;
}

export interface ChatbotEngineHandoffMutationResult {
    projectId: string;
    conversationId: string;
    action: HandoffDashboardAction;
    status: string;
    assignedTo?: string | null;
    duplicate: boolean;
    eventId?: string;
    warnings: string[];
}

const EMPTY_ANALYTICS: ChatbotEngineRuntimeSnapshot['analytics'] = {
    totalEvents: 0,
    executedActions: 0,
    blockedActions: 0,
    observedEvents: 0,
    duplicateActions: 0,
    failedActions: 0,
    leadEvents: 0,
    appointmentEvents: 0,
    handoffEvents: 0,
    ecommerceEvents: 0,
    emailMarketingEvents: 0,
    financeEvents: 0,
    restaurantEvents: 0,
    realtyEvents: 0,
    voiceEvents: 0,
    highIntentEvents: 0,
    actionBreakdown: [],
    intentBreakdown: [],
    surfaceBreakdown: [],
    moduleBreakdown: [],
};

const ECOMMERCE_ACTIONS = new Set([
    'search_products',
    'recommend_products',
    'check_order_status',
    'explain_shipping',
    'explain_returns',
    'create_product_inquiry',
    'back_in_stock_request',
    'start_checkout',
]);

const EMAIL_MARKETING_ACTIONS = new Set([
    'subscribe_email_audience',
    'queue_email_follow_up',
    'send_internal_alert',
]);

const FINANCE_ACTIONS = new Set([
    'create_finance_quote_request',
]);

const RESTAURANT_ACTIONS = new Set([
    'request_restaurant_reservation',
]);

const REALTY_ACTIONS = new Set([
    'request_realty_showing',
    'register_open_house',
]);

function eventIsVoiceRuntime(event: ChatbotEngineRuntimeEvent): boolean {
    const eventType = normalizeString(event.eventType, '').toLowerCase();
    const sourceSurface = normalizeString(event.sourceSurface, '').toLowerCase();
    const metadata = normalizeRecord(event.metadata);
    return eventType.includes('voice')
        || sourceSurface === 'voice'
        || metadata.runtimeEventType === 'chatbot_voice_session_requested'
        || metadata.runtimeEventType === 'chatbot_voice_session_started'
        || metadata.runtimeEventType === 'chatbot_voice_session_blocked'
        || metadata.runtimeEventType === 'chatbot_voice_session_failed'
        || metadata.runtimeEventType === 'chatbot_voice_session_ended'
        || Object.keys(normalizeRecord(metadata.voice)).length > 0;
}

const EMPTY_INBOX: ChatbotEngineRuntimeSnapshot['inbox'] = {
    activeConversations: 0,
    pendingConversations: 0,
    escalatedConversations: 0,
    unreadMessages: 0,
    linkedLeads: 0,
};

function normalizeRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeString(value: unknown, fallback = ''): string {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
}

function requireDashboardString(value: unknown, maxLength = 240): string {
    const cleaned = normalizeString(value).slice(0, maxLength);
    if (!cleaned) {
        throw Object.assign(new Error('ES: Faltan campos requeridos para ejecutar la accion.\nEN: Required fields are missing for this action.'), { status: 400 });
    }
    return cleaned;
}

function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function toNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

function buildHandoffDashboardIdempotencyKey(
    projectId: string,
    action: HandoffDashboardAction,
    conversationId: string,
    actorId?: string | null,
    targetId?: string | null,
): string {
    return ['chatbot-engine-dashboard', projectId, 'handoff', action, conversationId, actorId || 'system', targetId || 'none']
        .map(part => String(part).trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'none')
        .join(':')
        .slice(0, 240);
}

function withoutHandoffTags(tags: string[]): string[] {
    return tags.filter(tag => tag !== 'chatbot-handoff' && !tag.startsWith('handoff:'));
}

function appendConversationNote(existing: unknown, note: string): string | null {
    const current = normalizeString(existing, '');
    const next = normalizeString(note, '');
    if (!next) return current || null;
    return current ? `${current}\n${next}` : next;
}

function eventMatchesDomain(
    event: ChatbotEngineRuntimeEvent,
    actions: Set<string>,
    moduleTerms: string[],
    eventTerms: string[],
): boolean {
    const actionType = normalizeString(event.actionType, '');
    const sourceModule = normalizeString(event.sourceModule, '').toLowerCase();
    const eventType = normalizeString(event.eventType, '').toLowerCase();

    return actions.has(actionType)
        || moduleTerms.some(term => sourceModule.includes(term))
        || eventTerms.some(term => eventType.includes(term));
}

function normalizeEvent(row: Record<string, any>): ChatbotEngineRuntimeEvent {
    return {
        id: String(row.id),
        eventType: String(row.event_type || 'chatbot_event'),
        actionType: row.action_type || null,
        actionStatus: String(row.action_status || 'observed'),
        sourceSurface: row.source_surface || null,
        sourceModule: row.source_module || null,
        conversationId: row.conversation_id || null,
        leadId: row.lead_id || null,
        appointmentId: row.appointment_id || null,
        correlationId: row.correlation_id || null,
        metadata: normalizeRecord(row.metadata),
        createdAt: String(row.created_at || new Date(0).toISOString()),
    };
}

function normalizeConversation(row: Record<string, any>): ChatbotEngineRuntimeConversation {
    return {
        id: String(row.id),
        channel: String(row.channel || 'web'),
        participantName: row.participant_name || null,
        participantEmail: row.participant_email || null,
        status: String(row.status || 'active'),
        lastMessageAt: row.last_message_at || null,
        messageCount: toNumber(row.message_count),
        unreadCount: toNumber(row.unread_count),
        leadId: row.lead_id || null,
        assignedTo: row.assigned_to || null,
        tags: normalizeStringArray(row.tags),
        metadata: normalizeRecord(row.metadata),
    };
}

function conversationHasHandoff(conversation: ChatbotEngineRuntimeConversation): boolean {
    const handoff = normalizeRecord(conversation.metadata.chatbotEngineHandoff);
    if (conversation.status === 'closed' || normalizeString(handoff.status) === 'resolved' || normalizeString(handoff.resolvedAt)) {
        return false;
    }
    if (conversation.status === 'escalated') return true;
    if (conversation.tags.some(tag => tag === 'chatbot-handoff' || tag.startsWith('handoff:'))) return true;
    return Object.keys(handoff).length > 0;
}

function normalizeHandoff(conversation: ChatbotEngineRuntimeConversation): ChatbotEngineRuntimeHandoff {
    const handoff = normalizeRecord(conversation.metadata.chatbotEngineHandoff);
    const reasonFromTag = conversation.tags.find(tag => tag.startsWith('handoff:'))?.replace(/^handoff:/, '');

    return {
        conversationId: conversation.id,
        participantName: conversation.participantName,
        participantEmail: conversation.participantEmail,
        leadId: conversation.leadId || null,
        assignedTo: conversation.assignedTo || null,
        reason: normalizeString(handoff.reason, reasonFromTag || 'human_requested'),
        priority: normalizeString(handoff.priority, 'normal'),
        summary: normalizeString(handoff.summary) || null,
        requesterName: normalizeString(handoff.requesterName) || null,
        requesterEmail: normalizeString(handoff.requesterEmail) || conversation.participantEmail || null,
        requesterPhone: normalizeString(handoff.requesterPhone) || null,
        sourceSurface: normalizeString(handoff.sourceSurface) || normalizeString(conversation.metadata.sourceSurface) || null,
        sourceModule: normalizeString(handoff.sourceModule) || normalizeString(conversation.metadata.sourceModule) || null,
        requestedAt: normalizeString(handoff.requestedAt) || conversation.lastMessageAt || null,
        lastMessageAt: conversation.lastMessageAt,
        status: conversation.status,
        unreadCount: conversation.unreadCount,
    };
}

export function buildChatbotEngineRuntimeSnapshot(input: {
    projectId: string;
    events?: ChatbotEngineRuntimeEvent[];
    conversations?: ChatbotEngineRuntimeConversation[];
    warnings?: string[];
}): ChatbotEngineRuntimeSnapshot {
    const events = input.events || [];
    const conversations = input.conversations || [];
    const handoffs = conversations
        .filter(conversationHasHandoff)
        .map(normalizeHandoff)
        .sort((a, b) => String(b.requestedAt || b.lastMessageAt || '').localeCompare(String(a.requestedAt || a.lastMessageAt || '')));
    const actionCounts = new Map<string, number>();
    const intentCounts = new Map<string, number>();
    const surfaceCounts = new Map<string, number>();
    const moduleCounts = new Map<string, number>();

    events.forEach(event => {
        if (event.actionType) actionCounts.set(event.actionType, (actionCounts.get(event.actionType) || 0) + 1);
        const intent = normalizeRecord(event.metadata.intent);
        const primaryIntent = typeof intent.primaryIntent === 'string' ? intent.primaryIntent : '';
        if (primaryIntent) intentCounts.set(primaryIntent, (intentCounts.get(primaryIntent) || 0) + 1);
        const sourceSurface = normalizeString(event.sourceSurface, '');
        const sourceModule = normalizeString(event.sourceModule, '');
        if (sourceSurface) surfaceCounts.set(sourceSurface, (surfaceCounts.get(sourceSurface) || 0) + 1);
        if (sourceModule) moduleCounts.set(sourceModule, (moduleCounts.get(sourceModule) || 0) + 1);
    });

    return {
        projectId: input.projectId,
        events,
        conversations,
        handoffs,
        analytics: {
            totalEvents: events.length,
            executedActions: events.filter(event => event.actionStatus === 'executed').length,
            blockedActions: events.filter(event => event.actionStatus === 'blocked').length,
            observedEvents: events.filter(event => event.actionStatus === 'observed').length,
            duplicateActions: events.filter(event => event.actionStatus === 'duplicate').length,
            failedActions: events.filter(event => event.actionStatus === 'failed').length,
            leadEvents: events.filter(event => event.leadId || event.eventType.includes('lead') || event.actionType?.includes('lead')).length,
            appointmentEvents: events.filter(event => (
                event.appointmentId || event.eventType.includes('appointment') || event.actionType?.includes('appointment')
            )).length,
            handoffEvents: events.filter(event => event.eventType.includes('handoff') || event.actionType === 'handoff_to_human').length,
            ecommerceEvents: events.filter(event => eventMatchesDomain(
                event,
                ECOMMERCE_ACTIONS,
                ['ecommerce', 'storefront', 'checkout'],
                ['product', 'checkout', 'order', 'shipping', 'returns', 'stock'],
            )).length,
            emailMarketingEvents: events.filter(event => eventMatchesDomain(
                event,
                EMAIL_MARKETING_ACTIONS,
                ['email-marketing', 'email_marketing'],
                ['email', 'audience', 'campaign'],
            )).length,
            financeEvents: events.filter(event => eventMatchesDomain(
                event,
                FINANCE_ACTIONS,
                ['finance', 'accounting'],
                ['finance', 'invoice', 'quote'],
            )).length,
            restaurantEvents: events.filter(event => eventMatchesDomain(
                event,
                RESTAURANT_ACTIONS,
                ['restaurants', 'restaurant'],
                ['restaurant', 'reservation'],
            )).length,
            realtyEvents: events.filter(event => eventMatchesDomain(
                event,
                REALTY_ACTIONS,
                ['realty', 'real-estate', 'real_estate'],
                ['realty', 'property', 'showing', 'open_house'],
            )).length,
            voiceEvents: events.filter(eventIsVoiceRuntime).length,
            highIntentEvents: events.filter(event => normalizeRecord(event.metadata.intent).urgency === 'high').length,
            lastEventAt: events[0]?.createdAt,
            actionBreakdown: Array.from(actionCounts.entries())
                .map(([actionType, count]) => ({ actionType, count }))
                .sort((a, b) => b.count - a.count),
            intentBreakdown: Array.from(intentCounts.entries())
                .map(([intent, count]) => ({ intent, count }))
                .sort((a, b) => b.count - a.count),
            surfaceBreakdown: Array.from(surfaceCounts.entries())
                .map(([sourceSurface, count]) => ({ sourceSurface, count }))
                .sort((a, b) => b.count - a.count || a.sourceSurface.localeCompare(b.sourceSurface)),
            moduleBreakdown: Array.from(moduleCounts.entries())
                .map(([sourceModule, count]) => ({ sourceModule, count }))
                .sort((a, b) => b.count - a.count || a.sourceModule.localeCompare(b.sourceModule)),
        },
        inbox: {
            activeConversations: conversations.filter(conversation => conversation.status === 'active').length,
            pendingConversations: conversations.filter(conversation => conversation.status === 'pending').length,
            escalatedConversations: handoffs.length,
            unreadMessages: conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
            linkedLeads: conversations.filter(conversation => Boolean(conversation.leadId)).length,
            lastConversationAt: conversations[0]?.lastMessageAt || undefined,
        },
        warnings: input.warnings || [],
    };
}

export async function getChatbotEngineRuntimeSnapshot(
    projectId: string,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineRuntimeSnapshot> {
    const warnings: string[] = [];
    let events: ChatbotEngineRuntimeEvent[] = [];
    let conversations: ChatbotEngineRuntimeConversation[] = [];

    const eventsResult = await client
        .from('chatbot_engine_events')
        .select('id,event_type,action_type,action_status,source_surface,source_module,conversation_id,lead_id,appointment_id,correlation_id,metadata,created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (eventsResult.error) {
        warnings.push(`events:${eventsResult.error.message}`);
    } else {
        events = (eventsResult.data || []).map(row => normalizeEvent(row as Record<string, any>));
    }

    const conversationsResult = await client
        .from('social_conversations')
        .select('id,channel,participant_name,participant_email,status,last_message_at,message_count,unread_count,lead_id,assigned_to,tags,metadata')
        .eq('project_id', projectId)
        .order('last_message_at', { ascending: false })
        .limit(25);

    if (conversationsResult.error) {
        warnings.push(`conversations:${conversationsResult.error.message}`);
    } else {
        conversations = (conversationsResult.data || []).map(row => normalizeConversation(row as Record<string, any>));
    }

    return buildChatbotEngineRuntimeSnapshot({
        projectId,
        events,
        conversations,
        warnings,
    });
}

async function loadHandoffConversation(projectId: string, conversationId: string, client: SupabaseLike): Promise<Record<string, any>> {
    const { data, error } = await client
        .from('social_conversations')
        .select('id,status,tags,metadata,notes,lead_id,assigned_to,unread_count')
        .eq('id', conversationId)
        .eq('project_id', projectId)
        .maybeSingle();

    if (error) throw error;
    if (!data?.id) {
        throw Object.assign(new Error('ES: La conversacion no existe o no pertenece a este proyecto.\nEN: The conversation does not exist or does not belong to this project.'), { status: 404 });
    }
    return data as Record<string, any>;
}

async function recordHandoffDashboardEvent(
    projectId: string,
    conversation: Record<string, any>,
    action: HandoffDashboardAction,
    input: ChatbotEngineHandoffMutationInput,
    idempotencyKey: string,
    now: string,
    status: 'executed' | 'duplicate',
    metadata: Record<string, unknown>,
    client: SupabaseLike,
) {
    return recordChatbotEngineEvent(client, {
        tenant_id: null,
        project_id: projectId,
        conversation_id: conversation.id,
        lead_id: normalizeString(conversation.lead_id) || null,
        event_type: action === 'assign' ? 'chatbot_handoff_assigned' : 'chatbot_handoff_resolved',
        action_type: 'handoff_to_human',
        action_status: status,
        source_surface: 'admin_dashboard',
        source_module: 'chatbot-engine-dashboard',
        idempotency_key: idempotencyKey,
        correlation_id: `${action}:${conversation.id}`,
        actor_type: input.actorId ? 'project_user' : 'system',
        actor_id: normalizeString(input.actorId, '') || null,
        metadata: {
            handoffDashboardAction: action,
            conversationStatus: normalizeString(conversation.status, 'active'),
            ...metadata,
        },
        created_at: now,
    });
}

export async function assignChatbotEngineHandoff(
    projectId: string,
    input: ChatbotEngineHandoffMutationInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineHandoffMutationResult> {
    const conversationId = requireDashboardString(input.conversationId, 120);
    const assigneeId = requireDashboardString(input.assigneeId || input.actorId, 120);
    const actorId = normalizeString(input.actorId, '');
    const now = normalizeString(input.now) || new Date().toISOString();
    const idempotencyKey = normalizeString(input.idempotencyKey, '')
        || buildHandoffDashboardIdempotencyKey(projectId, 'assign', conversationId, actorId, assigneeId);
    const conversation = await loadHandoffConversation(projectId, conversationId, client);
    const metadata = normalizeRecord(conversation.metadata);
    const handoff = normalizeRecord(metadata.chatbotEngineHandoff);

    if (handoff.assignmentIdempotencyKey === idempotencyKey && normalizeString(conversation.assigned_to) === assigneeId) {
        const event = await recordHandoffDashboardEvent(projectId, conversation, 'assign', input, `${idempotencyKey}:duplicate`, now, 'duplicate', {
            assigneeId,
        }, client);
        return {
            projectId,
            conversationId,
            action: 'assign',
            status: normalizeString(conversation.status, 'escalated'),
            assignedTo: assigneeId,
            duplicate: true,
            eventId: event.id,
            warnings: event.warning ? [event.warning] : [],
        };
    }

    const reason = normalizeString(handoff.reason, 'human_requested');
    const tags = Array.from(new Set([
        ...normalizeStringArray(conversation.tags),
        'chatbot-handoff',
        `handoff:${reason}`,
    ]));
    const nextHandoff = {
        ...handoff,
        requestedAt: normalizeString(handoff.requestedAt) || now,
        reason,
        priority: normalizeString(handoff.priority, 'normal'),
        status: 'assigned',
        assignedAt: now,
        assignedBy: actorId || null,
        assigneeId,
        assignmentIdempotencyKey: idempotencyKey,
        updatedAt: now,
    };

    const { data: updated, error: updateError } = await client
        .from('social_conversations')
        .update({
            assigned_to: assigneeId,
            status: 'escalated',
            tags,
            metadata: {
                ...metadata,
                chatbotEngineHandoff: nextHandoff,
            },
        })
        .eq('id', conversationId)
        .eq('project_id', projectId)
        .select('id,status,assigned_to')
        .maybeSingle();

    if (updateError) throw updateError;

    const event = await recordHandoffDashboardEvent(projectId, conversation, 'assign', input, idempotencyKey, now, 'executed', {
        assigneeId,
        previousAssigneeId: normalizeString(conversation.assigned_to) || null,
    }, client);

    return {
        projectId,
        conversationId,
        action: 'assign',
        status: normalizeString(updated?.status, 'escalated'),
        assignedTo: normalizeString(updated?.assigned_to, assigneeId),
        duplicate: false,
        eventId: event.id,
        warnings: event.warning ? [event.warning] : [],
    };
}

export async function resolveChatbotEngineHandoff(
    projectId: string,
    input: ChatbotEngineHandoffMutationInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineHandoffMutationResult> {
    const conversationId = requireDashboardString(input.conversationId, 120);
    const actorId = normalizeString(input.actorId, '');
    const now = normalizeString(input.now) || new Date().toISOString();
    const idempotencyKey = normalizeString(input.idempotencyKey, '')
        || buildHandoffDashboardIdempotencyKey(projectId, 'resolve', conversationId, actorId);
    const conversation = await loadHandoffConversation(projectId, conversationId, client);
    const metadata = normalizeRecord(conversation.metadata);
    const handoff = normalizeRecord(metadata.chatbotEngineHandoff);

    if (handoff.resolutionIdempotencyKey === idempotencyKey || (conversation.status === 'closed' && normalizeString(handoff.status) === 'resolved')) {
        const event = await recordHandoffDashboardEvent(projectId, conversation, 'resolve', input, `${idempotencyKey}:duplicate`, now, 'duplicate', {}, client);
        return {
            projectId,
            conversationId,
            action: 'resolve',
            status: 'closed',
            assignedTo: normalizeString(conversation.assigned_to) || null,
            duplicate: true,
            eventId: event.id,
            warnings: event.warning ? [event.warning] : [],
        };
    }

    const resolutionNote = normalizeString(input.note, '');
    const noteLine = resolutionNote ? `[${now}] Chatbot handoff resolved: ${resolutionNote}` : `[${now}] Chatbot handoff resolved.`;
    const nextHandoff = {
        ...handoff,
        requestedAt: normalizeString(handoff.requestedAt) || now,
        reason: normalizeString(handoff.reason, 'human_requested'),
        priority: normalizeString(handoff.priority, 'normal'),
        status: 'resolved',
        resolvedAt: now,
        resolvedBy: actorId || null,
        resolutionNote: resolutionNote || null,
        resolutionIdempotencyKey: idempotencyKey,
        updatedAt: now,
    };

    const { data: updated, error: updateError } = await client
        .from('social_conversations')
        .update({
            status: 'closed',
            unread_count: 0,
            tags: withoutHandoffTags(normalizeStringArray(conversation.tags)),
            notes: appendConversationNote(conversation.notes, noteLine),
            metadata: {
                ...metadata,
                chatbotEngineHandoff: nextHandoff,
            },
        })
        .eq('id', conversationId)
        .eq('project_id', projectId)
        .select('id,status,assigned_to')
        .maybeSingle();

    if (updateError) throw updateError;

    const event = await recordHandoffDashboardEvent(projectId, conversation, 'resolve', input, idempotencyKey, now, 'executed', {
        resolutionNote: resolutionNote || null,
        previousStatus: normalizeString(conversation.status, 'active'),
    }, client);

    return {
        projectId,
        conversationId,
        action: 'resolve',
        status: normalizeString(updated?.status, 'closed'),
        assignedTo: normalizeString(updated?.assigned_to) || null,
        duplicate: false,
        eventId: event.id,
        warnings: event.warning ? [event.warning] : [],
    };
}

export function createEmptyChatbotEngineRuntimeSnapshot(projectId: string): ChatbotEngineRuntimeSnapshot {
    return {
        projectId,
        events: [],
        conversations: [],
        handoffs: [],
        analytics: { ...EMPTY_ANALYTICS },
        inbox: { ...EMPTY_INBOX },
        warnings: [],
    };
}
