function stripUndefined(value) {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
function isDuplicateEventError(error) {
    if (!error || typeof error !== 'object')
        return false;
    const record = error;
    const text = [record.message, record.details, record.hint]
        .filter((entry) => typeof entry === 'string')
        .join(' ')
        .toLowerCase();
    return record.code === '23505'
        || text.includes('duplicate key')
        || text.includes('chatbot_engine_events_project_event_idempotency_uidx');
}
async function findExistingIdempotentEvent(client, event) {
    if (!event.idempotency_key) {
        return { warning: 'chatbot_engine_event_duplicate_without_idempotency_key' };
    }
    try {
        const { data, error } = await client
            .from('chatbot_engine_events')
            .select('id')
            .eq('project_id', event.project_id)
            .eq('event_type', event.event_type)
            .eq('idempotency_key', event.idempotency_key)
            .maybeSingle();
        if (error)
            return { warning: `chatbot_engine_event_duplicate_lookup_failed:${error.message}` };
        if (typeof data?.id === 'string')
            return { id: data.id, duplicate: true };
        return { warning: 'chatbot_engine_event_duplicate_not_found' };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'unknown_error';
        return { warning: `chatbot_engine_event_duplicate_lookup_failed:${message}` };
    }
}
export async function recordChatbotEngineEvent(client, event) {
    if (!event.project_id || !event.event_type) {
        return { warning: 'chatbot_engine_event_skipped_missing_scope' };
    }
    try {
        const { data, error } = await client
            .from('chatbot_engine_events')
            .insert(stripUndefined(event))
            .select('id')
            .maybeSingle();
        if (error) {
            if (isDuplicateEventError(error)) {
                return findExistingIdempotentEvent(client, event);
            }
            return { warning: `chatbot_engine_event_insert_failed:${error.message}` };
        }
        return { id: typeof data?.id === 'string' ? data.id : undefined };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'unknown_error';
        return { warning: `chatbot_engine_event_insert_failed:${message}` };
    }
}
//# sourceMappingURL=chatbotEngineEventService.js.map