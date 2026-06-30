import { isValidEmail, normalizeEmail } from './emailProviderService.ts';
export async function getAudiences(input) {
    const { data, error } = await input.supabase
        .from('email_audiences')
        .select('*')
        .or(`project_id.eq.${input.projectId},store_id.eq.${input.projectId}`)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    return data || [];
}
export async function createAudience(input) {
    const now = new Date().toISOString();
    const payload = mapAudienceDraftToRow(input.projectId, input.userId, input.audience, now);
    const { data, error } = await input.supabase
        .from('email_audiences')
        .insert(payload)
        .select('*')
        .maybeSingle();
    if (error)
        throw error;
    return data || payload;
}
export async function updateAudience(input) {
    const { data, error } = await input.supabase
        .from('email_audiences')
        .update(mapAudienceUpdatesToRow(input.updates))
        .eq('id', input.audienceId)
        .or(`project_id.eq.${input.projectId},store_id.eq.${input.projectId}`)
        .select('*')
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
export async function deleteAudience(input) {
    const { error } = await input.supabase
        .from('email_audiences')
        .delete()
        .eq('id', input.audienceId)
        .or(`project_id.eq.${input.projectId},store_id.eq.${input.projectId}`);
    if (error)
        throw error;
    return { deleted: true };
}
export async function addAudienceMembers(input) {
    const audience = await loadAudience(input.supabase, input.projectId, input.audienceId);
    if (!audience)
        throw new Error('Audience not found');
    const currentMembers = readStaticMembers(audience);
    const nextMembers = mergeAudienceMembers(currentMembers, input.members);
    return updateAudienceStaticMembers({
        supabase: input.supabase,
        projectId: input.projectId,
        audienceId: input.audienceId,
        members: nextMembers,
    });
}
export async function removeAudienceMembers(input) {
    const audience = await loadAudience(input.supabase, input.projectId, input.audienceId);
    if (!audience)
        throw new Error('Audience not found');
    const emails = new Set((input.emails || []).map(normalizeEmail).filter(Boolean));
    const leadIds = new Set((input.leadIds || []).map(String).filter(Boolean));
    const customerIds = new Set((input.customerIds || []).map(String).filter(Boolean));
    const nextMembers = readStaticMembers(audience).filter((member) => {
        const email = normalizeEmail(member.email);
        if (email && emails.has(email))
            return false;
        if (member.leadId && leadIds.has(String(member.leadId)))
            return false;
        if (member.customerId && customerIds.has(String(member.customerId)))
            return false;
        return true;
    });
    return updateAudienceStaticMembers({
        supabase: input.supabase,
        projectId: input.projectId,
        audienceId: input.audienceId,
        members: nextMembers,
    });
}
export async function loadAudience(supabase, projectId, audienceId) {
    const { data, error } = await supabase
        .from('email_audiences')
        .select('*')
        .or(`project_id.eq.${projectId},store_id.eq.${projectId}`)
        .eq('id', audienceId)
        .maybeSingle();
    if (error)
        throw error;
    return data || null;
}
async function updateAudienceStaticMembers(input) {
    const staticMembers = {
        emails: input.members.map((member) => member.email).filter(Boolean),
        leadIds: input.members.map((member) => member.leadId).filter(Boolean),
        customerIds: input.members.map((member) => member.customerId).filter(Boolean),
        members: input.members,
    };
    return updateAudience({
        supabase: input.supabase,
        projectId: input.projectId,
        audienceId: input.audienceId,
        updates: {
            staticMembers,
            staticMemberCount: input.members.length,
            estimatedCount: input.members.length,
        },
    });
}
function mergeAudienceMembers(currentMembers, incomingMembers) {
    const byKey = new Map();
    const aliases = new Map();
    for (const member of currentMembers) {
        const normalized = normalizeAudienceMember(member);
        if (!normalized)
            continue;
        const key = findMemberKey(normalized, aliases) || primaryMemberKey(normalized);
        if (!key)
            continue;
        const existing = byKey.get(key);
        byKey.set(key, mergeNormalizedMember(existing, normalized));
        registerMemberAliases(normalized, key, aliases);
    }
    for (const member of incomingMembers) {
        const normalized = normalizeAudienceMember(member);
        if (!normalized)
            continue;
        const key = findMemberKey(normalized, aliases) || primaryMemberKey(normalized);
        if (!key)
            continue;
        const existing = byKey.get(key);
        byKey.set(key, mergeNormalizedMember(existing, normalized));
        registerMemberAliases(normalized, key, aliases);
    }
    return Array.from(byKey.values());
}
function normalizeAudienceMember(member) {
    const email = normalizeEmail(member.email);
    const leadId = readOptionalString(member.leadId);
    const customerId = readOptionalString(member.customerId);
    const validEmail = email && isValidEmail(email) ? email : undefined;
    if (!validEmail && !leadId && !customerId)
        return null;
    return {
        email: validEmail,
        name: readOptionalString(member.name),
        source: readOptionalString(member.source) || 'manual',
        leadId,
        customerId,
        acceptsMarketing: member.acceptsMarketing !== false,
        metadata: readObject(member.metadata),
    };
}
function mergeNormalizedMember(existing, incoming) {
    return {
        ...(existing || {}),
        ...incoming,
        metadata: {
            ...(existing?.metadata || {}),
            ...(incoming.metadata || {}),
        },
    };
}
function findMemberKey(member, aliases) {
    for (const alias of memberAliases(member)) {
        const existing = aliases.get(alias);
        if (existing)
            return existing;
    }
    return null;
}
function primaryMemberKey(member) {
    return memberAliases(member)[0] || null;
}
function registerMemberAliases(member, key, aliases) {
    for (const alias of memberAliases(member))
        aliases.set(alias, key);
}
function memberAliases(member) {
    return [
        member.email ? `email:${normalizeEmail(member.email)}` : null,
        member.leadId ? `lead:${member.leadId}` : null,
        member.customerId ? `customer:${member.customerId}` : null,
    ].filter(Boolean);
}
function readStaticMembers(audience) {
    const staticMembers = audience.static_members || audience.staticMembers || {};
    const members = Array.isArray(staticMembers)
        ? staticMembers
        : Array.isArray(staticMembers.members)
            ? staticMembers.members
            : Array.isArray(audience.members)
                ? audience.members
                : [];
    const normalized = members
        .map((member) => normalizeAudienceMember({
        email: typeof member === 'string' ? member : member.email,
        name: typeof member === 'string' ? undefined : member.name,
        source: typeof member === 'string' ? 'audience-static' : member.source,
        leadId: typeof member === 'string' ? undefined : member.leadId || member.lead_id,
        customerId: typeof member === 'string' ? undefined : member.customerId || member.customer_id,
        acceptsMarketing: typeof member === 'string' ? true : member.acceptsMarketing ?? member.accepts_marketing,
        metadata: typeof member === 'string' ? undefined : member.metadata,
    }))
        .filter((member) => Boolean(member));
    const emails = Array.isArray(staticMembers.emails) ? staticMembers.emails : [];
    const rawLeadIds = staticMembers.leadIds || staticMembers.lead_ids;
    const rawCustomerIds = staticMembers.customerIds || staticMembers.customer_ids;
    const leadIds = Array.isArray(rawLeadIds) ? rawLeadIds : [];
    const customerIds = Array.isArray(rawCustomerIds) ? rawCustomerIds : [];
    return mergeAudienceMembers(normalized, [
        ...emails.map((email) => ({ email, source: 'audience-static' })),
        ...leadIds.map((leadId) => ({ leadId, source: 'crm' })),
        ...customerIds.map((customerId) => ({ customerId, source: 'ecommerce' })),
    ]);
}
function mapAudienceDraftToRow(projectId, userId, audience, now) {
    const members = readInputMembers(audience);
    const staticMembers = {
        emails: members.map((member) => member.email).filter(Boolean),
        leadIds: members.map((member) => member.leadId).filter(Boolean),
        customerIds: members.map((member) => member.customerId).filter(Boolean),
        members,
    };
    const staticMemberCount = readNumber(audience.staticMemberCount ?? audience.static_member_count) ?? members.length;
    return stripUndefined({
        project_id: projectId,
        store_id: projectId,
        user_id: userId || null,
        name: String(audience.name || 'Untitled audience').trim(),
        description: readOptionalString(audience.description) || null,
        filters: readArray(audience.filters),
        accepts_marketing: audience.acceptsMarketing !== false && audience.accepts_marketing !== false,
        has_ordered: readOptionalBoolean(audience.hasOrdered ?? audience.has_ordered),
        min_orders: readNumber(audience.minOrders ?? audience.min_orders),
        max_orders: readNumber(audience.maxOrders ?? audience.max_orders),
        min_total_spent: readNumber(audience.minTotalSpent ?? audience.min_total_spent),
        max_total_spent: readNumber(audience.maxTotalSpent ?? audience.max_total_spent),
        tags: readArray(audience.tags),
        exclude_tags: readArray(audience.excludeTags ?? audience.exclude_tags),
        last_order_days_ago: readNumber(audience.lastOrderDaysAgo ?? audience.last_order_days_ago),
        source: readArray(audience.source),
        static_members: staticMembers,
        static_member_count: staticMemberCount,
        estimated_count: readNumber(audience.estimatedCount ?? audience.estimated_count) ?? staticMemberCount,
        is_default: audience.isDefault === true || audience.is_default === true,
        created_by: userId || audience.created_by || null,
        generated_by_ai: Boolean(audience.generatedByAI || audience.generated_by_ai),
        needs_review: audience.needsReview !== undefined ? Boolean(audience.needsReview) : Boolean(audience.generatedByAI || audience.generated_by_ai),
        user_modified: Boolean(audience.userModified || audience.user_modified),
        safe_to_edit: audience.safeToEdit !== false && audience.safe_to_edit !== false,
        source_module: readOptionalString(audience.sourceModule || audience.source_module) || 'email-marketing',
        source_component: readOptionalString(audience.sourceComponent || audience.source_component) || null,
        source_event: readOptionalString(audience.sourceEvent || audience.source_event) || null,
        source_entity_type: readOptionalString(audience.sourceEntityType || audience.source_entity_type) || null,
        source_entity_id: readOptionalString(audience.sourceEntityId || audience.source_entity_id) || null,
        correlation_id: readOptionalString(audience.correlationId || audience.correlation_id) || null,
        idempotency_key: readOptionalString(audience.idempotencyKey || audience.idempotency_key) || null,
        source_map: readObject(audience.sourceMap || audience.source_map),
        readiness: readObject(audience.readiness),
        metadata: readObject(audience.metadata),
        created_at: now,
        updated_at: now,
    });
}
function mapAudienceUpdatesToRow(updates) {
    const mapped = { updated_at: new Date().toISOString() };
    const aliases = {
        acceptsMarketing: 'accepts_marketing',
        hasOrdered: 'has_ordered',
        minOrders: 'min_orders',
        maxOrders: 'max_orders',
        minTotalSpent: 'min_total_spent',
        maxTotalSpent: 'max_total_spent',
        excludeTags: 'exclude_tags',
        lastOrderDaysAgo: 'last_order_days_ago',
        staticMembers: 'static_members',
        staticMemberCount: 'static_member_count',
        estimatedCount: 'estimated_count',
        lastCountUpdate: 'last_count_update',
        isDefault: 'is_default',
        generatedByAI: 'generated_by_ai',
        needsReview: 'needs_review',
        userModified: 'user_modified',
        safeToEdit: 'safe_to_edit',
        sourceModule: 'source_module',
        sourceComponent: 'source_component',
        sourceEvent: 'source_event',
        sourceEntityType: 'source_entity_type',
        sourceEntityId: 'source_entity_id',
        correlationId: 'correlation_id',
        idempotencyKey: 'idempotency_key',
        sourceMap: 'source_map',
    };
    const allowed = new Set([
        'name',
        'description',
        'filters',
        'accepts_marketing',
        'has_ordered',
        'min_orders',
        'max_orders',
        'min_total_spent',
        'max_total_spent',
        'tags',
        'exclude_tags',
        'last_order_days_ago',
        'source',
        'static_members',
        'static_member_count',
        'estimated_count',
        'last_count_update',
        'is_default',
        'generated_by_ai',
        'needs_review',
        'user_modified',
        'safe_to_edit',
        'source_module',
        'source_component',
        'source_event',
        'source_entity_type',
        'source_entity_id',
        'correlation_id',
        'idempotency_key',
        'source_map',
        'readiness',
        'metadata',
    ]);
    for (const [key, value] of Object.entries(updates)) {
        const column = aliases[key] || key;
        if (!allowed.has(column))
            continue;
        mapped[column] = normalizeAudienceUpdateValue(column, value);
    }
    return stripUndefined(mapped);
}
function normalizeAudienceUpdateValue(column, value) {
    if (['filters', 'tags', 'exclude_tags', 'source'].includes(column))
        return readArray(value);
    if (['source_map', 'readiness', 'metadata'].includes(column))
        return readObject(value);
    if (column === 'static_members')
        return value && typeof value === 'object' ? value : { emails: [], members: [] };
    if (['static_member_count', 'estimated_count', 'min_orders', 'max_orders', 'last_order_days_ago'].includes(column))
        return readNumber(value);
    if (['min_total_spent', 'max_total_spent'].includes(column))
        return readNumber(value);
    if (['accepts_marketing', 'has_ordered', 'is_default', 'generated_by_ai', 'needs_review', 'user_modified', 'safe_to_edit'].includes(column))
        return readOptionalBoolean(value);
    if (column === 'description')
        return readOptionalString(value) || null;
    return value;
}
function readInputMembers(audience) {
    const staticMembers = audience.staticMembers || audience.static_members || {};
    const rawLeadIds = staticMembers.leadIds || staticMembers.lead_ids || audience.leadIds || audience.lead_ids;
    const rawCustomerIds = staticMembers.customerIds || staticMembers.customer_ids || audience.customerIds || audience.customer_ids;
    const candidates = [
        ...(Array.isArray(audience.members) ? audience.members : []),
        ...(Array.isArray(staticMembers.members) ? staticMembers.members : []),
        ...(Array.isArray(staticMembers.emails) ? staticMembers.emails.map((email) => ({ email, source: 'audience-static' })) : []),
        ...(Array.isArray(rawLeadIds) ? rawLeadIds.map((leadId) => ({ leadId, source: 'crm' })) : []),
        ...(Array.isArray(rawCustomerIds) ? rawCustomerIds.map((customerId) => ({ customerId, source: 'ecommerce' })) : []),
    ];
    return mergeAudienceMembers([], candidates);
}
function readObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function readArray(value) {
    if (Array.isArray(value))
        return value;
    if (typeof value === 'string')
        return value.split(',').map((item) => item.trim()).filter(Boolean);
    return [];
}
function readNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function readOptionalBoolean(value) {
    return typeof value === 'boolean' ? value : undefined;
}
function readOptionalString(value) {
    const text = String(value || '').trim();
    return text || undefined;
}
function stripUndefined(value) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
//# sourceMappingURL=emailAudienceService.js.map