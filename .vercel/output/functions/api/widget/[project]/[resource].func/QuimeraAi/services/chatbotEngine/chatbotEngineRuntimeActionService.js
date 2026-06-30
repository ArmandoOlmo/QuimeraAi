import { addAudienceMembers } from '../email/emailAudienceService.js';
import { findEmailLogByIdempotencyKey, recordEmailLog } from '../email/emailLogService.js';
import { buildCanonicalEmailDraftMetadata } from '../email/emailModuleIntentService.js';
import { isSuppressed } from '../email/emailSuppressionService.js';
import { getSafeProductPrice, isRenderableStorefrontProduct } from '../../utils/ecommerce/productDisplayGuards.js';
import { buildWidgetCustomerRequestNotes } from '../../utils/chatbotEngine/widgetCustomerRequestNotes.js';
import { buildReadableChatbotCustomerRequestNote } from '../../utils/chatbotEngine/customerRequestNotes.js';
import { calculateLeadScore, detectHighIntent } from '../../utils/leadScoring.js';
const BILINGUAL_REQUIRED = 'ES: Faltan campos requeridos para ejecutar la accion.\nEN: Required fields are missing for this action.';
const BILINGUAL_NOT_FOUND = 'ES: El recurso no existe o no pertenece a este proyecto.\nEN: The resource does not exist or does not belong to this project.';
const BILINGUAL_EMAIL_SUPPRESSED = 'ES: Este email no puede suscribirse porque esta suprimido para marketing.\nEN: This email cannot be subscribed because it is suppressed for marketing.';
const BILINGUAL_MARKETING_CONSENT = 'ES: Se requiere consentimiento de marketing antes de suscribir el contacto.\nEN: Marketing consent is required before subscribing the contact.';
const BILINGUAL_PAST_DATE = 'ES: La fecha y hora deben estar en el futuro.\nEN: Date and time must be in the future.';
const BILINGUAL_ORDER_VERIFICATION = 'ES: Para consultar una orden se requiere email o token de acceso valido.\nEN: A valid email or access token is required to look up an order.';
const BILINGUAL_POLICY_NOT_CONFIGURED = 'ES: Esta politica de ecommerce no esta configurada o revisada para responder publicamente.\nEN: This ecommerce policy is not configured or reviewed for public answers.';
const DEFAULT_EMAIL_FOLLOW_UP_SUBJECT = 'Seguimiento de tu conversación / Follow-up from your conversation';
const DEFAULT_EMAIL_FOLLOW_UP_HTML = [
    '<p>ES: Gracias por conversar con nuestro asistente. El equipo revisará tu solicitud y preparará un seguimiento personalizado.</p>',
    '<p>EN: Thank you for chatting with our assistant. The team will review your request and prepare a personalized follow-up.</p>',
].join('');
const DEFAULT_EMAIL_FOLLOW_UP_TEXT = [
    'ES: Gracias por conversar con nuestro asistente. El equipo revisará tu solicitud y preparará un seguimiento personalizado.',
    'EN: Thank you for chatting with our assistant. The team will review your request and prepare a personalized follow-up.',
].join('\n');
function cleanString(value, maxLength = 2000) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}
function cleanEmail(value) {
    return cleanString(value, 320).toLowerCase();
}
function cleanNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
function cleanBoolean(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'si', 'sí'].includes(normalized))
            return true;
        if (['false', '0', 'no'].includes(normalized))
            return false;
    }
    return null;
}
function compactMetadata(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    return Object.fromEntries(Object.entries(value).filter(([key]) => key.length <= 80).slice(0, 60));
}
function uniqueStrings(values) {
    return Array.from(new Set(values.map(value => cleanString(value, 120)).filter(Boolean)));
}
function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanString(value, 120));
}
function escapeSvgText(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function readMediaCategory(value) {
    const category = cleanString(value, 80);
    const allowed = new Set([
        'brand',
        'template',
        'article',
        'hero',
        'background',
        'icon',
        'component',
        'people',
        'product',
        'ai_generated',
        'other',
    ]);
    return allowed.has(category) ? category : 'ai_generated';
}
function titleFromMediaPrompt(prompt, fallback = 'ChatCore Media AI draft') {
    const compact = cleanString(prompt.replace(/\s+/g, ' '), 96);
    if (!compact)
        return fallback;
    return compact.length > 64 ? `${compact.slice(0, 61)}...` : compact;
}
function buildChatbotMediaDraftPlaceholderUrl(title) {
    const safeTitle = escapeSvgText(title).slice(0, 96);
    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
        '<rect width="1280" height="720" fill="#101828"/>',
        '<rect x="72" y="72" width="1136" height="576" rx="32" fill="#182230" stroke="#344054" stroke-width="3"/>',
        '<text x="108" y="178" fill="#f9fafb" font-family="Arial, sans-serif" font-size="48" font-weight="700">ChatCore Media AI draft</text>',
        `<text x="108" y="258" fill="#d0d5dd" font-family="Arial, sans-serif" font-size="30">${safeTitle}</text>`,
        '<text x="108" y="574" fill="#98a2b3" font-family="Arial, sans-serif" font-size="24">Pending generation and human review in Quimera Media AI</text>',
        '</svg>',
    ].join('');
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
function cleanStringList(value, maxItems = 12, maxLength = 240) {
    if (!Array.isArray(value))
        return [];
    return uniqueStrings(value.map(item => cleanString(item, maxLength))).slice(0, maxItems);
}
function buildRuntimeCustomerRequestNotes(input) {
    return buildWidgetCustomerRequestNotes({
        body: input.body,
        agentName: 'ChatCore',
        sourceSurface: cleanString(input.sourceSurface, 120) || cleanString(input.body.sourceSurface, 120) || null,
        sourceModule: cleanString(input.sourceModule, 120) || cleanString(input.body.sourceModule, 120) || 'chatcore',
        customerProvidedNotes: cleanString(input.customerProvidedNotes, 1800) || null,
        appointmentTitle: cleanString(input.appointmentTitle, 250) || null,
        appointmentDateTime: cleanString(input.appointmentDateTime, 250) || null,
        conversationId: cleanString(input.conversationId, 120) || null,
        leadId: cleanString(input.leadId, 120) || null,
        generatedAt: input.generatedAt,
    });
}
function resolveRuntimeNoteContact(body) {
    return {
        name: cleanString(body.name, 200)
            || cleanString(body.customerName, 200)
            || cleanString(body.participantName, 200)
            || cleanString(body.recipientName, 200)
            || null,
        email: cleanString(body.email, 320)
            || cleanString(body.customerEmail, 320)
            || cleanString(body.participantEmail, 320)
            || cleanString(body.recipientEmail, 320)
            || null,
        phone: cleanString(body.phone, 80)
            || cleanString(body.customerPhone, 80)
            || cleanString(body.participantPhone, 80)
            || null,
    };
}
function buildRuntimeCustomerRequestArtifacts(input) {
    const customerRequestSummary = buildRuntimeCustomerRequestNotes(input);
    const fallback = cleanString(input.customerProvidedNotes, 5000)
        || cleanString(input.body.message, 5000)
        || cleanString(input.body.notes, 5000)
        || cleanString(input.body.description, 5000)
        || null;
    const customerRequestNote = buildReadableChatbotCustomerRequestNote(customerRequestSummary, fallback, {
        customer: resolveRuntimeNoteContact(input.body),
        appointmentTitle: input.appointmentTitle || null,
        appointmentDateTime: input.appointmentDateTime || null,
    });
    return {
        customerRequestSummary,
        customerRequestNote: customerRequestNote || customerRequestSummary,
    };
}
function assertValidDateAndTime(date, time, now = new Date()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    }
    const parsed = new Date(`${date}T${time}:00`);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= now.getTime()) {
        throw Object.assign(new Error(BILINGUAL_PAST_DATE), { status: 400 });
    }
}
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function getNestedRecord(value, key) {
    if (!isRecord(value))
        return {};
    const nested = value[key];
    return isRecord(nested) ? nested : {};
}
function requireString(value, maxLength = 240) {
    const cleaned = cleanString(value, maxLength);
    if (!cleaned)
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    return cleaned;
}
async function sha256(value) {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle)
        return '';
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
function buildRuntimeIdempotencyKey(projectId, actionType, parts) {
    return ['chatbot-engine-runtime', projectId, actionType, ...parts]
        .map(part => String(part || 'none').trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'none')
        .join(':')
        .slice(0, 240);
}
function addDays(date, days) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}
function dateOnly(value) {
    return value.toISOString().slice(0, 10);
}
function cleanCurrency(value) {
    const cleaned = cleanString(value, 12).toUpperCase().replace(/[^A-Z]/g, '');
    return cleaned.length >= 3 ? cleaned.slice(0, 3) : 'USD';
}
function cleanLeadStatus(value) {
    const status = cleanString(value, 40).toLowerCase();
    return ['new', 'contacted', 'qualified', 'lost'].includes(status) ? status : 'new';
}
function resolveRuntimeNow(value) {
    const parsed = value instanceof Date
        ? value
        : value
            ? new Date(value)
            : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
function appendReadableNote(existing, note) {
    const current = cleanString(existing, 20000);
    const next = cleanString(note, 6000);
    if (!next)
        return current;
    if (current.includes(next.slice(0, 180)))
        return current;
    return [current, next].filter(Boolean).join('\n\n---\n');
}
function runtimeUpdateAlreadyApplied(customData, idempotencyKey) {
    const updates = Array.isArray(customData.chatbotEngineUpdates)
        ? customData.chatbotEngineUpdates
        : [];
    return updates.some((entry) => isRecord(entry) && entry.idempotencyKey === idempotencyKey);
}
function appendRuntimeUpdate(customData, update) {
    const updates = Array.isArray(customData.chatbotEngineUpdates)
        ? customData.chatbotEngineUpdates.filter(isRecord)
        : [];
    return [...updates, update].slice(-12);
}
function cleanInvoiceNumberPart(value) {
    return value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '')
        .slice(-8) || String(Date.now()).slice(-8);
}
function firstImageUrl(value) {
    if (!Array.isArray(value))
        return undefined;
    const first = value[0];
    if (typeof first === 'string')
        return cleanString(first, 2000) || undefined;
    if (isRecord(first))
        return cleanString(first.url, 2000) || cleanString(first.src, 2000) || undefined;
    return undefined;
}
function readData(row) {
    return isRecord(row.data) ? row.data : {};
}
function mapProductRow(row, categoriesById = new Map) {
    const data = readData(row);
    const name = cleanString(row.name, 240) || cleanString(data.name, 240) || cleanString(data.title, 240);
    const id = cleanString(row.id, 120);
    if (!id || !name)
        return null;
    const slug = cleanString(row.slug, 240) || cleanString(data.slug, 240) || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || id;
    const price = cleanNumber(row.price) ?? cleanNumber(data.price) ?? 0;
    const compareAtPrice = cleanNumber(row.compare_at_price) ?? cleanNumber(data.compareAtPrice) ?? undefined;
    const quantity = cleanNumber(row.inventory_quantity) ?? cleanNumber(row.quantity) ?? cleanNumber(data.inventoryQuantity) ?? cleanNumber(data.quantity) ?? undefined;
    const categoryId = cleanString(row.category_id, 120) || cleanString(data.categoryId, 120) || undefined;
    const category = categoryId ? categoriesById.get(categoryId) : undefined;
    const tags = uniqueStrings([
        ...(Array.isArray(row.tags) ? row.tags : []),
        ...(Array.isArray(data.tags) ? data.tags : []),
    ]);
    const product = {
        id,
        name,
        slug,
        title: name,
        description: cleanString(row.description, 5000) || cleanString(data.description, 5000) || '',
        shortDescription: cleanString(row.short_description, 500) || cleanString(data.shortDescription, 500) || undefined,
        price,
        compareAtPrice,
        currency: cleanString(row.currency, 12) || cleanString(data.currency, 12) || 'USD',
        imageUrl: firstImageUrl(row.images) || firstImageUrl(data.images),
        categoryId,
        categoryName: cleanString(category?.name, 200) || cleanString(data.categoryName, 200) || undefined,
        tags,
        trackInventory: cleanBoolean(row.track_inventory) ?? cleanBoolean(data.trackInventory) ?? true,
        quantity,
        inStock: quantity === undefined ? true : quantity > 0,
        isFeatured: cleanBoolean(row.is_featured) ?? cleanBoolean(data.isFeatured) ?? false,
        status: cleanString(row.status, 40) || cleanString(data.status, 40) || 'draft',
    };
    if (!isRenderableStorefrontProduct(product))
        return null;
    if (product.status !== 'active')
        return null;
    const safePrice = getSafeProductPrice(product);
    return {
        ...product,
        price: safePrice.value ?? product.price,
        productUrl: `/tienda/producto/${slug}`,
    };
}
async function loadProjectCategories(supabase, projectId) {
    const { data, error } = await supabase
        .from('store_categories')
        .select('*')
        .or(`project_id.eq.${projectId},store_id.eq.${projectId},public_store_id.eq.${projectId}`)
        .limit(200);
    if (error)
        throw error;
    return new Map((data || []).map((row) => [String(row.id), row]));
}
async function loadProjectProducts(input) {
    const categoriesById = await loadProjectCategories(input.supabase, input.projectId);
    const { data, error } = await input.supabase
        .from('store_products')
        .select('*')
        .or(`project_id.eq.${input.projectId},store_id.eq.${input.projectId},public_store_id.eq.${input.projectId}`)
        .limit(250);
    if (error)
        throw error;
    return (data || [])
        .map((row) => mapProductRow(row, categoriesById))
        .filter((product) => Boolean(product));
}
async function loadProjectStoreSettings(input) {
    const { data, error } = await input.supabase
        .from('store_settings')
        .select('*')
        .or(`project_id.eq.${input.projectId},store_id.eq.${input.projectId},public_store_id.eq.${input.projectId}`)
        .limit(1)
        .maybeSingle();
    if (error)
        throw error;
    return data || null;
}
function readSettingsData(row) {
    return isRecord(row?.data) ? row.data : {};
}
function readSettingsField(row, columnKey, dataKey = columnKey) {
    const data = readSettingsData(row);
    return row?.[columnKey] ?? data[dataKey];
}
function readPolicyRecord(settings, keys) {
    const data = readSettingsData(settings);
    for (const key of keys) {
        const direct = settings?.[key];
        if (isRecord(direct))
            return direct;
        const nested = data[key];
        if (isRecord(nested))
            return nested;
    }
    return {};
}
function makePolicyMessage(configured, configuredMessage) {
    return configured ? configuredMessage : BILINGUAL_POLICY_NOT_CONFIGURED;
}
function scoreProduct(product, input) {
    const query = cleanString(input.query, 240).toLowerCase();
    let score = 0;
    if (product.isFeatured)
        score += 2;
    if (product.inStock)
        score += 1;
    if (!query)
        return score;
    const haystack = [
        product.name,
        product.id,
        product.slug,
        product.description,
        product.shortDescription,
        product.categoryName,
        ...product.tags,
    ].join(' ').toLowerCase();
    if (product.name.toLowerCase().includes(query))
        score += 8;
    if (product.id.toLowerCase() === query || product.slug.toLowerCase() === query)
        score += 10;
    if (product.categoryName?.toLowerCase().includes(query))
        score += 4;
    if (product.tags.some(tag => tag.toLowerCase().includes(query)))
        score += 4;
    if (haystack.includes(query))
        score += 2;
    for (const term of query.split(/\s+/).filter(term => term.length > 2)) {
        if (haystack.includes(term))
            score += 1;
    }
    return score;
}
function filterProducts(products, input) {
    const categoryId = cleanString(input.categoryId, 120);
    const categorySlug = cleanString(input.categorySlug, 120).toLowerCase();
    const tags = uniqueStrings(input.tags || []).map(tag => tag.toLowerCase());
    const inStockOnly = input.inStockOnly !== false;
    const featuredOnly = input.featuredOnly === true;
    const query = cleanString(input.query, 240);
    return products
        .filter(product => !inStockOnly || product.inStock)
        .filter(product => !featuredOnly || product.isFeatured)
        .filter(product => !categoryId || product.categoryId === categoryId)
        .filter(product => !categorySlug || product.categoryName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') === categorySlug)
        .filter(product => tags.length === 0 || tags.some(tag => product.tags.map(item => item.toLowerCase()).includes(tag)))
        .map(product => ({ product, score: scoreProduct(product, { ...input, query }) }))
        .filter(item => !query || item.score > 0)
        .sort((a, b) => b.score - a.score || Number(b.product.isFeatured) - Number(a.product.isFeatured) || a.product.name.localeCompare(b.product.name))
        .map(item => item.product);
}
async function findProjectProduct(input) {
    const productId = cleanString(input.productId, 120);
    const productSlug = cleanString(input.productSlug, 240);
    if (!productId && !productSlug)
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    const products = await loadProjectProducts(input);
    const product = products.find(item => ((productId && item.id === productId) ||
        (productSlug && item.slug === productSlug)));
    if (!product)
        throw Object.assign(new Error(BILINGUAL_NOT_FOUND), { status: 404 });
    return product;
}
async function findExistingLead(input) {
    let query = input.supabase
        .from('leads')
        .select('id')
        .eq('project_id', input.projectId)
        .eq('email', input.email)
        .eq('source', input.source)
        .limit(1);
    if (input.customDataContains) {
        query = query.contains ? query.contains('custom_data', input.customDataContains) : query;
    }
    const { data, error } = await query.maybeSingle();
    if (error)
        throw error;
    return data?.id ? String(data.id) : null;
}
async function createRestaurantLead(input) {
    const existingLeadId = await findExistingLead({
        supabase: input.supabase,
        projectId: input.projectId,
        email: input.customerEmail,
        source: 'restaurant-reservation',
    });
    if (existingLeadId)
        return { leadId: existingLeadId, duplicate: true };
    const { data, error } = await input.supabase
        .from('leads')
        .insert({
        tenant_id: input.tenantId,
        project_id: input.projectId,
        name: input.customerName,
        email: input.customerEmail,
        phone: input.customerPhone || null,
        status: 'new',
        source: 'restaurant-reservation',
        value: 0,
        tags: ['restaurant', 'reservation', 'chatbot-widget'],
        notes: input.notes || null,
        custom_data: {
            reservationId: input.reservationId,
            restaurantId: input.restaurantId,
            partySize: input.partySize,
            date: input.date,
            time: input.time,
            sourceConversationId: input.conversationId || null,
            chatbotEngine: true,
            customerRequestSummary: input.customerRequestSummary || input.notes || null,
            customerRequestNote: input.customerRequestNote || input.notes || null,
            ...compactMetadata(input.metadata),
        },
    })
        .select('id')
        .maybeSingle();
    if (error)
        throw error;
    return { leadId: data?.id ? String(data.id) : undefined, duplicate: false };
}
export async function createChatbotLead(input) {
    const email = cleanEmail(input.email);
    const phone = cleanString(input.phone, 80);
    const name = cleanString(input.name, 200) || email || phone;
    const message = cleanString(input.message, 5000);
    if (!name && !email && !phone)
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    const parsedNow = input.now instanceof Date
        ? input.now
        : input.now
            ? new Date(input.now)
            : new Date();
    const now = Number.isNaN(parsedNow.getTime()) ? new Date() : parsedNow;
    const nowIso = now.toISOString();
    const conversationId = cleanString(input.conversationId, 120);
    const sourceSurface = cleanString(input.sourceSurface, 120) || 'website';
    const sourceModule = cleanString(input.sourceModule, 120) || 'chatcore';
    const idempotencyKey = cleanString(input.idempotencyKey, 240)
        || buildRuntimeIdempotencyKey(input.projectId, 'create_lead', [
            conversationId || sourceSurface,
            email || phone || name,
            message,
        ]);
    const existing = await input.supabase
        .from('leads')
        .select('id,email,status,custom_data')
        .eq('project_id', input.projectId)
        .contains('custom_data', {
        chatbotEngine: true,
        actionType: 'create_lead',
        idempotencyKey,
    })
        .limit(1)
        .maybeSingle();
    if (existing.error)
        throw existing.error;
    if (existing.data?.id) {
        return {
            leadId: String(existing.data.id),
            email: cleanEmail(existing.data.email),
            status: cleanLeadStatus(existing.data.status),
            duplicate: true,
            created: false,
            reviewRequired: true,
        };
    }
    const leadRequest = buildRuntimeCustomerRequestArtifacts({
        body: {
            name,
            email,
            phone,
            company: input.company,
            message,
            aiAnalysis: 'ES: Lead capturado por ChatCore para revision y seguimiento en CRM. EN: Lead captured by ChatCore for CRM review and follow-up.',
            recommendedAction: 'ES: Revisar intencion, datos de contacto y proximo paso antes de contactar. EN: Review intent, contact details, and next step before follow-up.',
            sourceSurface,
            sourceModule,
            metadata: {
                sourceConversationId: conversationId || null,
            },
        },
        sourceSurface,
        sourceModule,
        customerProvidedNotes: message,
        conversationId,
        generatedAt: now,
    });
    const leadValue = Math.max(cleanNumber(input.value) ?? 0, 0);
    const tags = uniqueStrings([
        'chatbot',
        'chatcore',
        'chatbot-widget',
        sourceSurface,
        ...cleanStringList(input.tags, 20, 80),
    ]);
    const { data, error } = await input.supabase
        .from('leads')
        .insert({
        tenant_id: input.tenantId || null,
        project_id: input.projectId,
        name: name || 'ChatCore lead',
        email,
        phone: phone || null,
        company: cleanString(input.company, 200) || null,
        status: cleanLeadStatus(input.status),
        source: 'chatbot-widget',
        value: leadValue,
        tags,
        notes: leadRequest.customerRequestNote,
        custom_data: {
            ...compactMetadata(input.metadata),
            chatbotEngine: true,
            actionType: 'create_lead',
            sourceSurface,
            sourceModule,
            sourceConversationId: conversationId || null,
            customerRequestSummary: leadRequest.customerRequestSummary,
            customerRequestNote: leadRequest.customerRequestNote,
            customerRequestSummaryTarget: 'leads.custom_data.customerRequestSummary,leads.notes',
            needsReview: true,
            generatedByAI: true,
            idempotencyKey,
        },
        created_at: nowIso,
        updated_at: nowIso,
    })
        .select('id,email,status')
        .single();
    if (error)
        throw error;
    return {
        leadId: String(data?.id || ''),
        email: cleanEmail(data?.email || email),
        status: cleanLeadStatus(data?.status),
        duplicate: false,
        created: true,
        reviewRequired: true,
    };
}
export async function updateChatbotLead(input) {
    const leadId = cleanString(input.leadId, 120);
    if (!leadId)
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    const { data: lead, error: loadError } = await input.supabase
        .from('leads')
        .select('id,tenant_id,project_id,name,email,phone,company,status,value,tags,notes,custom_data')
        .eq('project_id', input.projectId)
        .eq('id', leadId)
        .maybeSingle();
    if (loadError)
        throw loadError;
    if (!lead?.id)
        throw Object.assign(new Error(BILINGUAL_NOT_FOUND), { status: 404 });
    const now = resolveRuntimeNow(input.now);
    const nowIso = now.toISOString();
    const sourceSurface = cleanString(input.sourceSurface, 120) || 'website';
    const sourceModule = cleanString(input.sourceModule, 120) || 'chatcore';
    const existingCustomData = isRecord(lead.custom_data) ? lead.custom_data : {};
    const message = cleanString(input.message, 5000)
        || cleanString(input.notes, 5000)
        || cleanString(input.metadata?.customerRequestSummary, 5000);
    const idempotencyKey = cleanString(input.idempotencyKey, 240)
        || buildRuntimeIdempotencyKey(input.projectId, 'update_lead', [
            leadId,
            cleanLeadStatus(input.status || lead.status),
            cleanNumber(input.value),
            message,
            cleanStringList(input.tags, 20, 80).join(','),
        ]);
    if (runtimeUpdateAlreadyApplied(existingCustomData, idempotencyKey)) {
        return {
            leadId,
            status: cleanLeadStatus(lead.status),
            duplicate: true,
            updated: false,
            reviewRequired: true,
        };
    }
    const artifacts = buildRuntimeCustomerRequestArtifacts({
        body: {
            name: input.name || lead.name,
            email: input.email || lead.email,
            phone: input.phone || lead.phone,
            company: input.company || lead.company,
            message,
            aiAnalysis: 'ES: Lead actualizado por ChatCore con nueva intención o seguimiento. EN: Lead updated by ChatCore with new intent or follow-up.',
            recommendedAction: 'ES: Revisar el cambio del lead y continuar el seguimiento desde CRM. EN: Review the lead change and continue follow-up from CRM.',
            sourceSurface,
            sourceModule,
            metadata: {
                sourceConversationId: cleanString(input.conversationId, 120) || null,
            },
        },
        sourceSurface,
        sourceModule,
        customerProvidedNotes: message,
        conversationId: cleanString(input.conversationId, 120),
        generatedAt: now,
    });
    const tags = uniqueStrings([
        ...(Array.isArray(lead.tags) ? lead.tags : []),
        'chatbot',
        'chatcore',
        'chatbot-updated',
        sourceSurface,
        ...cleanStringList(input.tags, 20, 80),
    ]);
    const nextCustomData = {
        ...existingCustomData,
        ...compactMetadata(input.metadata),
        chatbotEngine: true,
        actionType: 'update_lead',
        sourceSurface,
        sourceModule,
        sourceConversationId: cleanString(input.conversationId, 120) || existingCustomData.sourceConversationId || null,
        customerRequestSummary: artifacts.customerRequestSummary,
        customerRequestNote: artifacts.customerRequestNote,
        customerRequestSummaryTarget: 'leads.custom_data.customerRequestSummary,leads.notes',
        leadScore: cleanNumber(input.leadScore) ?? existingCustomData.leadScore,
        aiScore: cleanNumber(input.aiScore) ?? existingCustomData.aiScore,
        probability: cleanNumber(input.probability) ?? existingCustomData.probability,
        needsReview: true,
        generatedByAI: true,
        lastChatbotLeadUpdateAt: nowIso,
        chatbotEngineUpdates: appendRuntimeUpdate(existingCustomData, {
            idempotencyKey,
            updatedAt: nowIso,
            actionType: 'update_lead',
            sourceSurface,
            sourceModule,
            conversationId: cleanString(input.conversationId, 120) || null,
            status: cleanLeadStatus(input.status || lead.status),
        }),
    };
    const updatePayload = {
        ...(cleanString(input.name, 200) ? { name: cleanString(input.name, 200) } : {}),
        ...(cleanEmail(input.email) ? { email: cleanEmail(input.email) } : {}),
        ...(cleanString(input.phone, 80) ? { phone: cleanString(input.phone, 80) } : {}),
        ...(input.company !== undefined ? { company: cleanString(input.company, 200) || null } : {}),
        ...(input.status !== undefined ? { status: cleanLeadStatus(input.status) } : {}),
        ...(input.value !== undefined ? { value: Math.max(cleanNumber(input.value) ?? 0, 0) } : {}),
        tags,
        notes: appendReadableNote(lead.notes, artifacts.customerRequestNote),
        custom_data: nextCustomData,
        updated_at: nowIso,
    };
    const { data: updated, error: updateError } = await input.supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', leadId)
        .eq('project_id', input.projectId)
        .select('id,email,status,tags,custom_data')
        .maybeSingle();
    if (updateError)
        throw updateError;
    if (!updated?.id)
        throw Object.assign(new Error(BILINGUAL_NOT_FOUND), { status: 404 });
    return {
        leadId: String(updated.id),
        email: cleanEmail(updated.email || input.email || lead.email),
        status: cleanLeadStatus(updated.status),
        duplicate: false,
        updated: true,
        reviewRequired: true,
        tags: Array.isArray(updated.tags) ? updated.tags : tags,
    };
}
function calculateChatbotLeadProbability(input) {
    const statusBonus = {
        new: 8,
        contacted: 16,
        qualified: 34,
        negotiation: 54,
        won: 100,
        lost: 0,
    };
    const sourceBonus = {
        'chatbot-widget': 8,
        chatbot: 8,
        'landing-chatbot': 8,
        'embedded-widget': 8,
        'bio_page': 6,
        'realty-website': 9,
        'contact-form': 8,
        form: 8,
        referral: 10,
    };
    const probability = Math.round(input.score * 0.55
        + (statusBonus[input.status] ?? 8)
        + (sourceBonus[input.source] ?? 5)
        + (input.hasHighIntent ? 10 : 0)
        + Math.min(input.conversationLength, 8));
    return Math.max(0, Math.min(100, probability));
}
export async function scoreChatbotLead(input) {
    const leadId = cleanString(input.leadId, 120);
    if (!leadId)
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    const { data: lead, error: loadError } = await input.supabase
        .from('leads')
        .select('id,tenant_id,project_id,name,email,phone,company,status,source,tags,notes,custom_data,created_at')
        .eq('project_id', input.projectId)
        .eq('id', leadId)
        .maybeSingle();
    if (loadError)
        throw loadError;
    if (!lead?.id)
        throw Object.assign(new Error(BILINGUAL_NOT_FOUND), { status: 404 });
    const now = resolveRuntimeNow(input.now);
    const nowIso = now.toISOString();
    const sourceSurface = cleanString(input.sourceSurface, 120) || 'website';
    const sourceModule = cleanString(input.sourceModule, 120) || 'chatcore';
    const existingCustomData = isRecord(lead.custom_data) ? lead.custom_data : {};
    const tags = uniqueStrings([
        ...(Array.isArray(lead.tags) ? lead.tags : []),
        'chatbot-scored',
        sourceSurface,
    ]);
    const message = cleanString(input.message, 5000)
        || cleanString(input.metadata?.customerRequestSummary, 5000)
        || cleanString(existingCustomData.customerRequestSummary, 5000)
        || cleanString(lead.notes, 5000);
    const conversationTranscript = cleanString(input.conversationTranscript, 20000)
        || cleanString(existingCustomData.conversationTranscript, 20000);
    const conversationLength = Math.max(cleanNumber(input.conversationLength) ?? 0, conversationTranscript ? conversationTranscript.split('\n').filter(Boolean).length : 0);
    const source = cleanString(lead.source, 80) || 'chatbot-widget';
    const hasHighIntent = detectHighIntent([
        message,
        conversationTranscript,
        tags.join(' '),
    ].filter(Boolean).join(' '));
    const score = calculateLeadScore({
        hasEmail: Boolean(cleanEmail(lead.email)),
        hasPhone: Boolean(cleanString(lead.phone, 80)),
        hasName: Boolean(cleanString(lead.name, 200)),
        hasCompany: Boolean(cleanString(lead.company, 200)),
        messageLength: message.length,
        conversationLength,
        hasHighIntentKeywords: hasHighIntent,
        source: source,
        tags,
    });
    const probability = calculateChatbotLeadProbability({
        score,
        status: cleanLeadStatus(lead.status),
        source,
        hasHighIntent,
        conversationLength,
    });
    const idempotencyKey = cleanString(input.idempotencyKey, 240)
        || buildRuntimeIdempotencyKey(input.projectId, 'score_lead', [
            leadId,
            sourceSurface,
            sourceModule,
            score,
            probability,
        ]);
    if (runtimeUpdateAlreadyApplied(existingCustomData, idempotencyKey)) {
        return {
            leadId,
            score: cleanNumber(existingCustomData.leadScore) ?? score,
            aiScore: cleanNumber(existingCustomData.aiScore) ?? score,
            probability: cleanNumber(existingCustomData.probability) ?? probability,
            duplicate: true,
            scored: false,
            highIntent: hasHighIntent,
            reviewRequired: true,
        };
    }
    const nextCustomData = {
        ...existingCustomData,
        ...compactMetadata(input.metadata),
        chatbotEngine: true,
        actionType: 'score_lead',
        sourceSurface,
        sourceModule,
        leadScore: score,
        aiScore: score,
        probability,
        scoreLeadAt: nowIso,
        scoreSource: 'chatbot-engine',
        scoreSignals: {
            hasEmail: Boolean(cleanEmail(lead.email)),
            hasPhone: Boolean(cleanString(lead.phone, 80)),
            hasName: Boolean(cleanString(lead.name, 200)),
            hasCompany: Boolean(cleanString(lead.company, 200)),
            messageLength: message.length,
            conversationLength,
            highIntent: hasHighIntent,
            tagCount: tags.length,
            source,
        },
        chatbotEngineUpdates: appendRuntimeUpdate(existingCustomData, {
            idempotencyKey,
            updatedAt: nowIso,
            actionType: 'score_lead',
            sourceSurface,
            sourceModule,
            score,
            probability,
        }),
    };
    const { data: updated, error: updateError } = await input.supabase
        .from('leads')
        .update({
        tags,
        custom_data: nextCustomData,
        updated_at: nowIso,
    })
        .eq('id', leadId)
        .eq('project_id', input.projectId)
        .select('id,tags,custom_data')
        .maybeSingle();
    if (updateError)
        throw updateError;
    if (!updated?.id)
        throw Object.assign(new Error(BILINGUAL_NOT_FOUND), { status: 404 });
    return {
        leadId: String(updated.id),
        score,
        aiScore: score,
        probability,
        duplicate: false,
        scored: true,
        highIntent: hasHighIntent,
        reviewRequired: true,
        tags: Array.isArray(updated.tags) ? updated.tags : tags,
    };
}
export async function searchChatbotEcommerceProducts(input) {
    const products = await loadProjectProducts(input);
    const limit = Math.min(Math.max(cleanNumber(input.limit) || 6, 1), 12);
    const results = filterProducts(products, input).slice(0, limit);
    return {
        products: results,
        totalMatched: filterProducts(products, input).length,
        source: 'store_products',
    };
}
export async function recommendChatbotEcommerceProducts(input) {
    const activeProduct = input.activeProductId || input.activeProductSlug
        ? await findProjectProduct({
            ...input,
            productId: input.activeProductId,
            productSlug: input.activeProductSlug,
        }).catch(() => null)
        : null;
    const query = input.query || activeProduct?.categoryName || activeProduct?.tags?.[0] || '';
    const products = await loadProjectProducts(input);
    const limit = Math.min(Math.max(cleanNumber(input.limit) || 4, 1), 8);
    const candidates = filterProducts(products, {
        ...input,
        query,
        categoryId: input.categoryId || activeProduct?.categoryId,
        tags: input.tags?.length ? input.tags : activeProduct?.tags,
        inStockOnly: input.inStockOnly !== false,
    }).filter(product => product.id !== activeProduct?.id);
    return {
        products: candidates.slice(0, limit),
        activeProductId: activeProduct?.id || null,
        source: 'store_products',
    };
}
export async function explainChatbotEcommerceShippingPolicy(input) {
    const settings = await loadProjectStoreSettings(input);
    const shippingZones = Array.isArray(readSettingsField(settings, 'shipping_zones', 'shippingZones'))
        ? readSettingsField(settings, 'shipping_zones', 'shippingZones')
        : [];
    const currency = cleanString(readSettingsField(settings, 'currency', 'currency'), 12) || 'USD';
    const freeShippingThreshold = cleanNumber(readSettingsField(settings, 'free_shipping_threshold', 'freeShippingThreshold'));
    const methods = shippingZones.flatMap((zone, zoneIndex) => {
        const rates = Array.isArray(zone?.rates) ? zone.rates : [];
        return rates.map((rate, rateIndex) => ({
            id: cleanString(rate.id, 120) || `zone-${zoneIndex + 1}-rate-${rateIndex + 1}`,
            zoneName: cleanString(zone?.name, 200) || null,
            countries: cleanStringList(zone?.countries, 50, 80),
            name: cleanString(rate.name, 200) || cleanString(rate.label, 200) || 'Shipping',
            description: cleanString(rate.description, 500) || null,
            price: cleanNumber(rate.price) ?? 0,
            minOrder: cleanNumber(rate.minOrder) ?? cleanNumber(rate.minimumOrder) ?? null,
            estimatedDays: cleanString(rate.estimatedDays, 80) || cleanString(rate.deliveryEstimate, 80) || null,
        }));
    });
    const configured = methods.length > 0 || Boolean(freeShippingThreshold && freeShippingThreshold > 0);
    return {
        configured,
        message: makePolicyMessage(configured, 'ES: Politica de envio cargada desde la configuracion revisada de ecommerce.\nEN: Shipping policy loaded from reviewed ecommerce settings.'),
        storeName: cleanString(readSettingsField(settings, 'store_name', 'storeName'), 200) || null,
        currency,
        methods,
        freeShippingThreshold: freeShippingThreshold ?? null,
        termsUrl: cleanString(readSettingsField(settings, 'terms_and_conditions_url', 'termsAndConditionsUrl'), 1000) || null,
        source: 'store_settings',
    };
}
export async function explainChatbotEcommerceReturnsPolicy(input) {
    const settings = await loadProjectStoreSettings(input);
    const policy = readPolicyRecord(settings, ['returnPolicy', 'returnsPolicy', 'return_policy', 'returns']);
    const acceptsReturns = cleanBoolean(policy.acceptsReturns ?? policy.accepts_returns);
    const returnWindowDays = cleanNumber(policy.returnWindowDays ?? policy.returnWindow ?? policy.return_window_days ?? policy.return_window);
    const conditions = cleanStringList(policy.conditions, 12, 500);
    const process = cleanStringList(policy.process ?? policy.steps, 12, 500);
    const refundMethod = cleanString(policy.refundMethod ?? policy.refund_method, 500) || null;
    const shippingCost = cleanString(policy.shippingCost ?? policy.shipping_cost, 500) || null;
    const termsUrl = cleanString(readSettingsField(settings, 'terms_and_conditions_url', 'termsAndConditionsUrl'), 1000)
        || cleanString(policy.termsUrl, 1000)
        || null;
    const configured = Object.keys(policy).length > 0 || Boolean(termsUrl);
    return {
        configured,
        message: makePolicyMessage(configured, 'ES: Politica de devoluciones cargada desde la configuracion revisada de ecommerce.\nEN: Returns policy loaded from reviewed ecommerce settings.'),
        acceptsReturns,
        returnWindowDays: returnWindowDays ?? null,
        conditions,
        process,
        refundMethod,
        shippingCost,
        termsUrl,
        privacyPolicyUrl: cleanString(readSettingsField(settings, 'privacy_policy_url', 'privacyPolicyUrl'), 1000) || null,
        source: 'store_settings',
    };
}
export async function createChatbotEcommerceProductInquiry(input) {
    const product = await findProjectProduct(input);
    const name = requireString(input.name, 200);
    const email = cleanEmail(input.email);
    const phone = cleanString(input.phone, 80);
    if (!email && !phone)
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    const idempotencyKey = cleanString(input.idempotencyKey, 240)
        || buildRuntimeIdempotencyKey(input.projectId, 'create_product_inquiry', [product.id, email, phone, input.conversationId]);
    const existingLeadId = email
        ? await findExistingLead({
            supabase: input.supabase,
            projectId: input.projectId,
            email,
            source: 'product-inquiry',
            customDataContains: { productId: product.id },
        })
        : null;
    if (existingLeadId) {
        return {
            leadId: existingLeadId,
            product,
            duplicate: true,
        };
    }
    const quantity = cleanNumber(input.quantity);
    const message = cleanString(input.message, 5000);
    const sourceSurface = cleanString(input.sourceSurface, 120) || 'storefront';
    const sourceModule = cleanString(input.sourceModule, 120) || 'ecommerce';
    const productInquiryRequest = buildRuntimeCustomerRequestArtifacts({
        body: {
            name,
            email,
            phone,
            message: message || `ES: Consulta sobre ${product.name}. EN: Inquiry about ${product.name}.`,
            productName: product.name,
            productUrl: product.productUrl,
            quantity: quantity || null,
            aiAnalysis: `ES: Consulta de ecommerce para ${product.name}. EN: Ecommerce product inquiry for ${product.name}.`,
            recommendedAction: 'ES: Revisar disponibilidad y responder la pregunta del cliente. EN: Review availability and answer the customer question.',
            sourceSurface,
            sourceModule,
            metadata: {
                productId: product.id,
                productSlug: product.slug,
                productName: product.name,
                quantity: quantity || null,
                sourceConversationId: cleanString(input.conversationId, 120) || null,
                sourceSurface,
                sourceModule,
                ...compactMetadata(input.metadata),
            },
        },
        sourceSurface,
        sourceModule,
        customerProvidedNotes: message || null,
        conversationId: input.conversationId,
    });
    const { data, error } = await input.supabase
        .from('leads')
        .insert({
        tenant_id: input.tenantId,
        project_id: input.projectId,
        name,
        email: email || null,
        phone: phone || null,
        status: 'new',
        source: 'product-inquiry',
        value: product.price * Math.max(quantity || 1, 1),
        tags: uniqueStrings(['ecommerce', 'product-inquiry', 'chatbot-widget', `product:${product.id}`, product.categoryName]),
        notes: productInquiryRequest.customerRequestNote,
        custom_data: {
            productId: product.id,
            productSlug: product.slug,
            productName: product.name,
            productUrl: product.productUrl,
            quantity: quantity || null,
            sourceConversationId: cleanString(input.conversationId, 120) || null,
            sourceSurface,
            sourceModule,
            chatbotEngine: true,
            actionType: 'create_product_inquiry',
            customerRequestSummary: productInquiryRequest.customerRequestSummary,
            customerRequestNote: productInquiryRequest.customerRequestNote,
            idempotencyKey,
            ...compactMetadata(input.metadata),
        },
    })
        .select('id')
        .maybeSingle();
    if (error)
        throw error;
    return {
        leadId: data?.id ? String(data.id) : undefined,
        product,
        duplicate: false,
    };
}
export async function createChatbotEcommerceBackInStockRequest(input) {
    const product = await findProjectProduct(input);
    if (product.inStock) {
        throw Object.assign(new Error('ES: Este producto ya aparece disponible en el catalogo activo.\nEN: This product is already available in the active catalog.'), { status: 409 });
    }
    const email = cleanEmail(input.email);
    if (!email)
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    const idempotencyKey = cleanString(input.idempotencyKey, 240)
        || buildRuntimeIdempotencyKey(input.projectId, 'back_in_stock_request', [product.id, email, input.conversationId]);
    const { data: existingNotification, error: existingNotificationError } = await input.supabase
        .from('store_stock_notifications')
        .select('id,notified')
        .eq('project_id', input.projectId)
        .eq('product_id', product.id)
        .eq('email', email)
        .limit(1)
        .maybeSingle();
    if (existingNotificationError)
        throw existingNotificationError;
    const existingLeadId = await findExistingLead({
        supabase: input.supabase,
        projectId: input.projectId,
        email,
        source: 'back-in-stock-request',
        customDataContains: { productId: product.id },
    });
    let notificationId = existingNotification?.id ? String(existingNotification.id) : undefined;
    if (!notificationId) {
        const { data: notification, error: notificationError } = await input.supabase
            .from('store_stock_notifications')
            .insert({
            project_id: input.projectId,
            store_id: input.projectId,
            product_id: product.id,
            product_name: product.name,
            product_slug: product.slug,
            product_image: product.imageUrl || null,
            email,
            notified: false,
        })
            .select('id')
            .maybeSingle();
        if (notificationError)
            throw notificationError;
        notificationId = notification?.id ? String(notification.id) : undefined;
    }
    let leadId = existingLeadId || null;
    if (!leadId) {
        const sourceSurface = cleanString(input.sourceSurface, 120) || 'storefront';
        const sourceModule = cleanString(input.sourceModule, 120) || 'ecommerce';
        const backInStockRequest = buildRuntimeCustomerRequestArtifacts({
            body: {
                name: cleanString(input.name, 200) || email,
                email,
                message: `ES: Quiere recibir aviso cuando ${product.name} vuelva a estar disponible. EN: Wants to be notified when ${product.name} is back in stock.`,
                productName: product.name,
                productUrl: product.productUrl,
                aiAnalysis: `ES: Solicitud de inventario para ${product.name}. EN: Back-in-stock request for ${product.name}.`,
                recommendedAction: 'ES: Mantener la solicitud en la lista de avisos y notificar al reponer inventario. EN: Keep the request in the notification list and notify when inventory is replenished.',
                sourceSurface,
                sourceModule,
                metadata: {
                    productId: product.id,
                    productSlug: product.slug,
                    productName: product.name,
                    stockNotificationId: notificationId || null,
                    sourceConversationId: cleanString(input.conversationId, 120) || null,
                    sourceSurface,
                    sourceModule,
                    ...compactMetadata(input.metadata),
                },
            },
            sourceSurface,
            sourceModule,
            conversationId: input.conversationId,
        });
        const { data: lead, error: leadError } = await input.supabase
            .from('leads')
            .insert({
            tenant_id: input.tenantId,
            project_id: input.projectId,
            name: cleanString(input.name, 200) || email,
            email,
            status: 'new',
            source: 'back-in-stock-request',
            value: product.price,
            tags: uniqueStrings(['ecommerce', 'back-in-stock', 'chatbot-widget', `product:${product.id}`, product.categoryName]),
            notes: backInStockRequest.customerRequestNote,
            custom_data: {
                productId: product.id,
                productSlug: product.slug,
                productName: product.name,
                productUrl: product.productUrl,
                stockNotificationId: notificationId || null,
                sourceConversationId: cleanString(input.conversationId, 120) || null,
                sourceSurface,
                sourceModule,
                chatbotEngine: true,
                actionType: 'back_in_stock_request',
                customerRequestSummary: backInStockRequest.customerRequestSummary,
                customerRequestNote: backInStockRequest.customerRequestNote,
                idempotencyKey,
                ...compactMetadata(input.metadata),
            },
        })
            .select('id')
            .maybeSingle();
        if (leadError)
            throw leadError;
        leadId = lead?.id ? String(lead.id) : null;
    }
    return {
        notificationId: notificationId || null,
        leadId,
        product,
        duplicate: Boolean(existingNotification?.id),
        idempotencyKey,
    };
}
export async function checkChatbotEcommerceOrderStatus(input) {
    const orderId = cleanString(input.orderId, 120);
    const orderNumber = cleanString(input.orderNumber, 120);
    const email = cleanEmail(input.email);
    const token = cleanString(input.orderAccessToken, 500);
    if (!orderId && !orderNumber)
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    if (!email && !token)
        throw Object.assign(new Error(BILINGUAL_ORDER_VERIFICATION), { status: 403 });
    let query = input.supabase
        .from('store_orders')
        .select('*')
        .eq('project_id', input.projectId);
    query = orderId ? query.eq('id', orderId) : query.eq('order_number', orderNumber);
    const { data: order, error } = await query.maybeSingle();
    if (error)
        throw error;
    if (!order?.id)
        throw Object.assign(new Error(BILINGUAL_NOT_FOUND), { status: 404 });
    const orderData = isRecord(order.data) ? order.data : {};
    const storedEmail = cleanEmail(order.customer_email || orderData.customerEmail);
    const accessHash = cleanString(orderData.orderAccessTokenHash, 300);
    const tokenMatches = Boolean(accessHash && token && await sha256(token) === accessHash);
    const emailMatches = Boolean(email && storedEmail === email);
    if (!tokenMatches && !emailMatches) {
        throw Object.assign(new Error(BILINGUAL_ORDER_VERIFICATION), { status: 403 });
    }
    return {
        orderId: String(order.id),
        orderNumber: cleanString(order.order_number || orderData.orderNumber, 120),
        status: cleanString(order.status || orderData.status, 80) || 'pending',
        paymentStatus: cleanString(order.payment_status || orderData.paymentStatus, 80) || 'pending',
        fulfillmentStatus: cleanString(order.fulfillment_status || orderData.fulfillmentStatus, 80) || 'unfulfilled',
        trackingNumber: cleanString(order.tracking_number || orderData.trackingNumber, 240) || null,
        trackingUrl: cleanString(order.tracking_url || orderData.trackingUrl, 1000) || null,
        carrier: cleanString(order.carrier || orderData.carrier, 120) || null,
        total: cleanNumber(order.total) ?? cleanNumber(orderData.total) ?? 0,
        currency: cleanString(order.currency || orderData.currency, 12) || 'USD',
        itemCount: Array.isArray(order.items || orderData.items)
            ? (order.items || orderData.items).reduce((total, item) => total + Math.max(cleanNumber(item.quantity) || 0, 0), 0)
            : 0,
        createdAt: cleanString(order.created_at || orderData.createdAt, 120) || null,
        updatedAt: cleanString(order.updated_at || orderData.updatedAt, 120) || null,
    };
}
export async function startChatbotEcommerceCheckoutIntent(input) {
    if (!Array.isArray(input.items) || input.items.length === 0) {
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    }
    const products = await loadProjectProducts(input);
    const canonicalItems = input.items.slice(0, 25).map((item) => {
        const productId = cleanString(item.productId, 120);
        const productSlug = cleanString(item.productSlug, 240);
        const quantity = Math.min(Math.max(cleanNumber(item.quantity) || 1, 1), 100);
        const product = products.find(candidate => ((productId && candidate.id === productId) ||
            (productSlug && candidate.slug === productSlug)));
        if (!product)
            throw Object.assign(new Error(BILINGUAL_NOT_FOUND), { status: 404 });
        if (!product.inStock) {
            throw Object.assign(new Error('ES: Uno de los productos no tiene inventario disponible.\nEN: One of the products is not currently in stock.'), { status: 409 });
        }
        if (product.quantity !== undefined && product.quantity < quantity) {
            throw Object.assign(new Error('ES: La cantidad solicitada excede el inventario disponible.\nEN: Requested quantity exceeds available inventory.'), { status: 409 });
        }
        return {
            productId: product.id,
            productSlug: product.slug,
            variantId: cleanString(item.variantId, 120) || null,
            name: product.name,
            quantity,
            unitPrice: product.price,
            totalPrice: product.price * quantity,
        };
    });
    const subtotal = canonicalItems.reduce((total, item) => total + item.totalPrice, 0);
    const idempotencyKey = cleanString(input.idempotencyKey, 240)
        || buildRuntimeIdempotencyKey(input.projectId, 'start_checkout', canonicalItems.map(item => `${item.productId}:${item.quantity}`));
    return {
        checkoutUrl: '/checkout',
        storefrontCheckoutUrl: `/store/${input.projectId}/checkout`,
        idempotencyKey,
        items: canonicalItems,
        subtotal,
        currency: products[0]?.currency || 'USD',
        paymentCreated: false,
        requiresCheckoutPage: true,
        source: 'chatbot-engine-checkout-intent',
    };
}
export async function requestChatbotHumanHandoff(input) {
    const conversationId = requireString(input.conversationId, 120);
    const now = input.now || new Date().toISOString();
    const idempotencyKey = cleanString(input.idempotencyKey, 240)
        || buildRuntimeIdempotencyKey(input.projectId, 'handoff_to_human', [conversationId]);
    const { data: conversation, error: loadError } = await input.supabase
        .from('social_conversations')
        .select('id,status,tags,metadata,notes,lead_id,assigned_to')
        .eq('id', conversationId)
        .eq('project_id', input.projectId)
        .maybeSingle();
    if (loadError)
        throw loadError;
    if (!conversation?.id)
        throw Object.assign(new Error(BILINGUAL_NOT_FOUND), { status: 404 });
    const metadata = isRecord(conversation.metadata) ? conversation.metadata : {};
    const previousHandoff = getNestedRecord(metadata, 'chatbotEngineHandoff');
    const duplicate = conversation.status === 'escalated' && previousHandoff.idempotencyKey === idempotencyKey;
    if (duplicate) {
        return {
            conversationId,
            duplicate: true,
            status: 'escalated',
            leadId: conversation.lead_id || null,
        };
    }
    const reason = cleanString(input.reason, 120) || 'human_requested';
    const tags = uniqueStrings([
        ...(Array.isArray(conversation.tags) ? conversation.tags : []),
        'chatbot-handoff',
        `handoff:${reason}`,
    ]);
    const summary = cleanString(input.summary, 5000);
    const handoffNote = summary ? `[${now}] Chatbot handoff: ${summary}` : '';
    const notes = uniqueStrings([conversation.notes, handoffNote]).join('\n');
    const updatePayload = {
        status: 'escalated',
        tags,
        notes: notes || conversation.notes || null,
        metadata: {
            ...metadata,
            chatbotEngineHandoff: {
                requestedAt: now,
                reason,
                priority: cleanString(input.priority, 40) || 'normal',
                summary: summary || null,
                requesterName: cleanString(input.requesterName, 200) || null,
                requesterEmail: cleanEmail(input.requesterEmail) || null,
                requesterPhone: cleanString(input.requesterPhone, 80) || null,
                sourceSurface: cleanString(input.sourceSurface, 120) || null,
                sourceModule: cleanString(input.sourceModule, 120) || 'chatcore',
                idempotencyKey,
                ...compactMetadata(input.metadata),
            },
        },
    };
    const assignedTo = cleanString(input.assignedTo, 120);
    if (assignedTo)
        updatePayload.assigned_to = assignedTo;
    const { error: updateError } = await input.supabase
        .from('social_conversations')
        .update(updatePayload)
        .eq('id', conversationId)
        .eq('project_id', input.projectId);
    if (updateError)
        throw updateError;
    return {
        conversationId,
        duplicate: false,
        status: 'escalated',
        leadId: conversation.lead_id || null,
    };
}
export async function requestChatbotRestaurantReservation(input) {
    const restaurantId = requireString(input.restaurantId, 120);
    const customerName = requireString(input.customerName, 200);
    const customerEmail = cleanEmail(input.customerEmail);
    const date = requireString(input.date, 10);
    const time = requireString(input.time, 5);
    const partySize = cleanNumber(input.partySize);
    if (!customerEmail || !partySize || partySize < 1) {
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    }
    assertValidDateAndTime(date, time, input.now);
    const { data: restaurant, error: restaurantError } = await input.supabase
        .from('restaurants')
        .select('id,tenant_id,project_id,name,reservation_enabled,max_party_size,reservation_interval')
        .eq('id', restaurantId)
        .eq('project_id', input.projectId)
        .maybeSingle();
    if (restaurantError)
        throw restaurantError;
    if (!restaurant?.id)
        throw Object.assign(new Error(BILINGUAL_NOT_FOUND), { status: 404 });
    if (restaurant.reservation_enabled === false) {
        throw Object.assign(new Error('ES: Este restaurante no acepta reservas publicas.\nEN: This restaurant is not accepting public reservations.'), { status: 409 });
    }
    const maxPartySize = cleanNumber(restaurant.max_party_size);
    if (maxPartySize && partySize > maxPartySize) {
        throw Object.assign(new Error(`ES: El grupo no puede exceder ${maxPartySize} personas.\nEN: Party size cannot exceed ${maxPartySize}.`), { status: 400 });
    }
    const idempotencyKey = cleanString(input.idempotencyKey, 240)
        || buildRuntimeIdempotencyKey(input.projectId, 'request_restaurant_reservation', [restaurantId, customerEmail, date, time, partySize]);
    const source = 'aiAssistant';
    const existing = await input.supabase
        .from('restaurant_reservations')
        .select('id,status')
        .eq('project_id', input.projectId)
        .eq('restaurant_id', restaurantId)
        .eq('customer_email', customerEmail)
        .eq('date', date)
        .eq('time', time)
        .eq('source', source)
        .limit(1)
        .maybeSingle();
    if (existing.error)
        throw existing.error;
    if (existing.data?.id && existing.data.status !== 'cancelled') {
        return {
            reservationId: String(existing.data.id),
            duplicate: true,
            leadId: null,
            status: existing.data.status || 'pending',
        };
    }
    const sourceSurface = cleanString(input.sourceSurface, 120) || 'restaurant_menu';
    const sourceModule = cleanString(input.sourceModule, 120) || 'restaurants';
    const metadata = compactMetadata(input.metadata);
    const customerNotes = cleanString(input.notes, 5000);
    const reservationRequest = buildRuntimeCustomerRequestArtifacts({
        body: {
            customerName,
            customerEmail,
            customerPhone: input.customerPhone,
            message: customerNotes || `ES: Solicita una reserva para ${partySize} personas. EN: Requests a reservation for ${partySize} guests.`,
            notes: customerNotes,
            restaurantName: restaurant.name || null,
            tablePreference: input.tablePreference,
            partySize,
            date,
            time,
            sourceSurface,
            sourceModule,
            metadata: {
                ...metadata,
                restaurantId,
                restaurantName: restaurant.name || null,
                partySize,
                date,
                time,
                sourceConversationId: cleanString(input.conversationId, 120) || null,
            },
        },
        sourceSurface,
        sourceModule,
        customerProvidedNotes: customerNotes || null,
        appointmentTitle: `Restaurant reservation: ${restaurant.name || restaurantId}`,
        appointmentDateTime: `${date}T${time}:00`,
        conversationId: input.conversationId,
        generatedAt: input.now,
    });
    const { data: reservation, error: reservationError } = await input.supabase
        .from('restaurant_reservations')
        .insert({
        tenant_id: restaurant.tenant_id || input.tenantId,
        project_id: input.projectId,
        restaurant_id: restaurantId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: cleanString(input.customerPhone, 80) || null,
        date,
        time,
        party_size: partySize,
        table_preference: cleanString(input.tablePreference, 200) || null,
        status: 'pending',
        notes: reservationRequest.customerRequestNote,
        source,
    })
        .select('id,status')
        .maybeSingle();
    if (reservationError)
        throw reservationError;
    const lead = reservation?.id
        ? await createRestaurantLead({
            supabase: input.supabase,
            tenantId: restaurant.tenant_id || input.tenantId,
            projectId: input.projectId,
            reservationId: String(reservation.id),
            restaurantId,
            customerName,
            customerEmail,
            customerPhone: input.customerPhone,
            partySize,
            date,
            time,
            notes: reservationRequest.customerRequestNote,
            customerRequestSummary: reservationRequest.customerRequestSummary,
            customerRequestNote: reservationRequest.customerRequestNote,
            conversationId: input.conversationId,
            metadata: {
                ...metadata,
                sourceSurface,
                sourceModule,
                customerRequestSummary: reservationRequest.customerRequestSummary,
                customerRequestNote: reservationRequest.customerRequestNote,
                idempotencyKey,
            },
        })
        : { leadId: undefined, duplicate: false };
    return {
        reservationId: reservation?.id ? String(reservation.id) : undefined,
        duplicate: false,
        leadId: lead.leadId || null,
        status: reservation?.status || 'pending',
    };
}
async function loadProjectProperty(input) {
    const { data, error } = await input.supabase
        .from('properties')
        .select('id,user_id,tenant_id,project_id,title,status,public_enabled')
        .eq('id', input.propertyId)
        .eq('project_id', input.projectId)
        .maybeSingle();
    if (error)
        throw error;
    if (!data?.id)
        throw Object.assign(new Error(BILINGUAL_NOT_FOUND), { status: 404 });
    if (data.public_enabled === false || data.status !== 'active') {
        throw Object.assign(new Error('ES: La propiedad no esta publicada para solicitudes publicas.\nEN: This property is not published for public requests.'), { status: 409 });
    }
    return data;
}
async function assertOpenHouseAcceptsRegistrations(input) {
    const openHouseId = cleanString(input.openHouseId, 120);
    if (!openHouseId)
        return null;
    const { data, error } = await input.supabase
        .from('property_open_houses')
        .select('id,status,registration_enabled,starts_at,property_id')
        .eq('id', openHouseId)
        .eq('project_id', input.projectId)
        .eq('property_id', input.propertyId)
        .maybeSingle();
    if (error)
        throw error;
    if (!data?.id)
        throw Object.assign(new Error(BILINGUAL_NOT_FOUND), { status: 404 });
    if (data.registration_enabled === false || !['scheduled', 'active'].includes(String(data.status || ''))) {
        throw Object.assign(new Error('ES: Este open house no acepta registros publicos.\nEN: This open house is not accepting public registrations.'), { status: 409 });
    }
    return data;
}
export async function requestChatbotRealtyLead(input) {
    const propertyId = requireString(input.propertyId, 120);
    const name = requireString(input.name, 200);
    const email = cleanEmail(input.email);
    if (!email)
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    if (!input.projectUserId) {
        throw Object.assign(new Error('ES: El proyecto no tiene propietario para registrar solicitudes inmobiliarias.\nEN: Project owner is required to register real estate requests.'), { status: 500 });
    }
    const property = await loadProjectProperty(input);
    const openHouse = input.actionType === 'register_open_house'
        ? await assertOpenHouseAcceptsRegistrations(input)
        : null;
    const pipelineEventType = input.actionType === 'register_open_house'
        ? 'open_house_registration'
        : 'showing_request';
    const idempotencyKey = cleanString(input.idempotencyKey, 240)
        || buildRuntimeIdempotencyKey(input.projectId, input.actionType, [propertyId, openHouse?.id, email, input.preferredDate]);
    const existing = await input.supabase
        .from('property_leads')
        .select('id,crm_lead_id,stage')
        .eq('project_id', input.projectId)
        .eq('pipeline_idempotency_key', idempotencyKey)
        .limit(1)
        .maybeSingle();
    if (existing.error)
        throw existing.error;
    if (existing.data?.id) {
        return {
            propertyLeadId: String(existing.data.id),
            crmLeadId: existing.data.crm_lead_id ? String(existing.data.crm_lead_id) : null,
            duplicate: true,
            pipelineEventType,
        };
    }
    const preferredDate = cleanString(input.preferredDate, 120);
    const budget = cleanNumber(input.budget);
    const sourceSurface = cleanString(input.sourceSurface, 120) || 'realty_property';
    const sourceModule = cleanString(input.sourceModule, 120) || 'realty';
    const rawMessage = cleanString(input.message, 5000);
    const realtyRequest = buildRuntimeCustomerRequestArtifacts({
        body: {
            name,
            email,
            phone: input.phone,
            message: rawMessage || `ES: Solicita informacion sobre ${property.title || 'la propiedad'}. EN: Requests information about ${property.title || 'the property'}.`,
            propertyTitle: property.title || null,
            preferredDate,
            budget,
            aiAnalysis: input.actionType === 'register_open_house'
                ? `ES: Registro de open house para ${property.title || propertyId}. EN: Open house registration for ${property.title || propertyId}.`
                : `ES: Solicitud de visita inmobiliaria para ${property.title || propertyId}. EN: Realty showing request for ${property.title || propertyId}.`,
            recommendedAction: 'ES: Contactar al cliente, confirmar disponibilidad y registrar seguimiento en CRM. EN: Contact the customer, confirm availability, and log CRM follow-up.',
            sourceSurface,
            sourceModule,
            metadata: {
                propertyId,
                propertyTitle: property.title || null,
                openHouseId: openHouse?.id || null,
                openHouseStartsAt: openHouse?.starts_at || null,
                sourceConversationId: cleanString(input.conversationId, 120) || null,
                sourceSurface,
                sourceModule,
                rawMessage: rawMessage || null,
                ...compactMetadata(input.metadata),
            },
        },
        sourceSurface,
        sourceModule,
        customerProvidedNotes: rawMessage || null,
        appointmentTitle: input.actionType === 'register_open_house'
            ? `Open house registration: ${property.title || propertyId}`
            : `Realty showing request: ${property.title || propertyId}`,
        appointmentDateTime: preferredDate || null,
        conversationId: input.conversationId,
    });
    const metadata = {
        propertyTitle: property.title || null,
        openHouseId: openHouse?.id || null,
        openHouseStartsAt: openHouse?.starts_at || null,
        sourceConversationId: cleanString(input.conversationId, 120) || null,
        sourceSurface,
        sourceModule,
        rawMessage: rawMessage || null,
        customerRequestSummary: realtyRequest.customerRequestSummary,
        customerRequestNote: realtyRequest.customerRequestNote,
        chatbotEngine: true,
        actionType: input.actionType,
        idempotencyKey,
        ...compactMetadata(input.metadata),
    };
    const { data: created, error } = await input.supabase
        .from('property_leads')
        .insert({
        user_id: property.user_id || input.projectUserId,
        tenant_id: property.tenant_id || input.tenantId,
        project_id: input.projectId,
        property_id: propertyId,
        name,
        email,
        phone: cleanString(input.phone, 80) || null,
        message: realtyRequest.customerRequestNote,
        stage: 'new',
        lead_type: 'buyer',
        preferred_date: preferredDate || null,
        budget,
        source: 'chatbot-widget',
        pipeline_idempotency_key: idempotencyKey,
        pipeline_event_type: pipelineEventType,
        pipeline_source: 'chatbot-engine',
        lead_tags: uniqueStrings(['realty', 'chatbot-widget', pipelineEventType, `property:${propertyId}`]),
        needs_review: true,
        metadata,
    })
        .select('id,crm_lead_id')
        .maybeSingle();
    if (error)
        throw error;
    return {
        propertyLeadId: created?.id ? String(created.id) : undefined,
        crmLeadId: created?.crm_lead_id ? String(created.crm_lead_id) : null,
        duplicate: false,
        pipelineEventType,
    };
}
export async function createChatbotFinanceQuoteRequest(input) {
    const customerEmail = cleanEmail(input.customerEmail);
    const customerName = cleanString(input.customerName, 200);
    const description = cleanString(input.description, 1000) || 'Chatbot quote request / Solicitud de cotizacion desde chatbot';
    if (!customerEmail || !customerName)
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    const now = input.now || new Date();
    const leadId = cleanString(input.leadId, 120);
    const conversationId = cleanString(input.conversationId, 120);
    const sourceEntityType = leadId ? 'lead' : conversationId ? 'conversation' : 'chatbot_finance_quote';
    const sourceEntityId = leadId || conversationId || customerEmail;
    const sourceEvent = cleanString(input.sourceEvent, 120) || 'chatbot_finance_quote_request_created';
    const idempotencyKey = cleanString(input.idempotencyKey, 240)
        || buildRuntimeIdempotencyKey(input.projectId, 'create_finance_quote_request', [sourceEntityType, sourceEntityId, customerEmail, description]);
    const existing = await input.supabase
        .from('accounting_invoices')
        .select('id,invoice_number,status,total,currency,metadata')
        .eq('project_id', input.projectId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
    if (existing.error)
        throw existing.error;
    if (existing.data?.id) {
        return {
            invoiceId: String(existing.data.id),
            invoiceNumber: String(existing.data.invoice_number || ''),
            status: String(existing.data.status || 'draft'),
            total: cleanNumber(existing.data.total) ?? 0,
            currency: cleanCurrency(existing.data.currency),
            duplicate: true,
            reviewRequired: true,
            paymentCreated: false,
            paymentLinkCreated: false,
        };
    }
    const rawItems = Array.isArray(input.items) ? input.items.slice(0, 20) : [];
    const fallbackAmount = Math.max(cleanNumber(input.amount) ?? 0, 0);
    const normalizedItems = rawItems.map((item, index) => {
        const quantity = Math.max(cleanNumber(item.quantity) ?? 1, 1);
        const unitPrice = Math.max(cleanNumber(item.unitPrice) ?? 0, 0);
        const taxRate = Math.max(cleanNumber(item.taxRate) ?? 0, 0);
        const lineSubtotal = quantity * unitPrice;
        const total = lineSubtotal * (1 + taxRate / 100);
        return {
            id: `chatbot-finance-item-${index + 1}`,
            description: cleanString(item.description, 500) || description,
            quantity,
            unitPrice,
            taxRate,
            total,
        };
    }).filter(item => item.description && item.quantity > 0);
    const items = normalizedItems.length > 0
        ? normalizedItems
        : [{
                id: 'chatbot-finance-item-1',
                description,
                quantity: 1,
                unitPrice: fallbackAmount,
                taxRate: 0,
                total: fallbackAmount,
            }];
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate / 100), 0);
    const total = Math.max(subtotal + taxTotal, 0);
    const currency = cleanCurrency(input.currency);
    const sourceSurface = cleanString(input.sourceSurface, 120) || null;
    const sourceModule = cleanString(input.sourceModule, 120) || 'chatcore';
    const financeRequest = buildRuntimeCustomerRequestArtifacts({
        body: {
            customerName,
            customerEmail,
            customerAddress: input.customerAddress,
            message: description,
            description,
            amount: total,
            currency,
            items,
            aiAnalysis: 'ES: Solicitud de cotizacion financiera creada por ChatCore para revision humana. EN: Finance quote request created by ChatCore for human review.',
            recommendedAction: 'ES: Revisar totales, impuestos y terminos antes de enviar o crear pago en Stripe. EN: Review totals, taxes, and terms before sending or creating a Stripe payment.',
            sourceSurface,
            sourceModule,
            metadata: {
                sourceConversationId: conversationId || null,
                sourceLeadId: leadId || null,
                paymentProvider: 'stripe',
                stripePaymentCreated: false,
            },
        },
        sourceSurface,
        sourceModule,
        customerProvidedNotes: description,
        conversationId,
        leadId,
        generatedAt: now,
    });
    const dueDate = cleanString(input.dueDate, 20);
    const validDueDate = dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)
        ? dueDate
        : dateOnly(addDays(now, 7));
    const invoiceNumber = `QTE-${dateOnly(now).replace(/-/g, '')}-${cleanInvoiceNumberPart(idempotencyKey)}`;
    const { data, error } = await input.supabase
        .from('accounting_invoices')
        .insert({
        project_id: input.projectId,
        invoice_number: invoiceNumber,
        status: 'draft',
        issue_date: dateOnly(now),
        due_date: validDueDate,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_address: cleanString(input.customerAddress, 500) || null,
        items,
        subtotal,
        tax_total: taxTotal,
        discount_total: 0,
        total,
        currency,
        payment_terms: cleanString(input.paymentTerms, 200) || 'Due on receipt',
        reminder_note: 'Generated as a Chatbot Engine finance draft for human review.',
        notes: financeRequest.customerRequestNote,
        source_module: sourceModule,
        source_component: sourceModule,
        source_event: sourceEvent,
        source_entity_type: sourceEntityType,
        source_entity_id: sourceEntityId,
        idempotency_key: idempotencyKey,
        metadata: {
            chatbotEngine: true,
            financeQuoteRequest: true,
            generatedByAI: true,
            needsReview: true,
            safeToEdit: true,
            paymentProvider: 'stripe',
            stripePaymentCreated: false,
            paymentCreated: false,
            paymentLinkCreated: false,
            checkoutSessionCreated: false,
            ledgerEntryCreated: false,
            taxReviewed: false,
            sourceSurface,
            sourceModule,
            sourceEvent,
            leadId: leadId || null,
            conversationId: conversationId || null,
            customerRequestSummary: financeRequest.customerRequestSummary,
            customerRequestNote: financeRequest.customerRequestNote,
            customerRequestSummaryTarget: 'accounting_invoices.metadata.customerRequestSummary,accounting_invoices.notes',
            tenantId: input.tenantId || null,
            projectUserId: input.projectUserId || null,
            idempotencyKey,
            ...compactMetadata(input.metadata),
        },
    })
        .select('id,invoice_number,status,total,currency')
        .single();
    if (error)
        throw error;
    return {
        invoiceId: String(data?.id || ''),
        invoiceNumber: String(data?.invoice_number || invoiceNumber),
        status: String(data?.status || 'draft'),
        total: cleanNumber(data?.total) ?? total,
        currency: cleanCurrency(data?.currency || currency),
        duplicate: false,
        reviewRequired: true,
        paymentCreated: false,
        paymentLinkCreated: false,
    };
}
export async function requestChatbotMediaAssetDraft(input) {
    const prompt = cleanString(input.prompt, 5000) || cleanString(input.request, 5000);
    if (!prompt)
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    const now = input.now || new Date();
    const nowIso = now.toISOString();
    const conversationId = cleanString(input.conversationId, 120);
    const leadId = cleanString(input.leadId, 120);
    const sourceSurface = cleanString(input.sourceSurface, 120) || 'website';
    const sourceModule = cleanString(input.sourceModule, 120) || 'media-ai';
    const aspectRatio = cleanString(input.aspectRatio, 40) || '16:9';
    const category = readMediaCategory(input.category);
    const title = cleanString(input.title, 160) || titleFromMediaPrompt(prompt);
    const idempotencyKey = cleanString(input.idempotencyKey, 240)
        || buildRuntimeIdempotencyKey(input.projectId, 'request_media_asset', [
            conversationId || leadId || sourceSurface,
            category,
            aspectRatio,
            prompt,
        ]);
    const existing = await input.supabase
        .from('media_assets')
        .select('id,name,url,metadata')
        .contains('metadata', {
        projectId: input.projectId,
        chatbotEngine: true,
        actionType: 'request_media_asset',
        idempotencyKey,
    })
        .limit(1)
        .maybeSingle();
    if (existing.error)
        throw existing.error;
    if (existing.data?.id) {
        return {
            assetId: String(existing.data.id),
            name: String(existing.data.name || title),
            url: String(existing.data.url || ''),
            duplicate: true,
            reviewRequired: true,
            generationStarted: false,
            noAutoPublish: true,
        };
    }
    const mediaRequest = buildRuntimeCustomerRequestArtifacts({
        body: {
            title,
            message: prompt,
            aiAnalysis: 'ES: Solicitud de asset de Media AI creada por ChatCore para revision humana. EN: Media AI asset request created by ChatCore for human review.',
            recommendedAction: 'ES: Revisar el prompt, estilo y uso previsto antes de generar, adjuntar o publicar el asset. EN: Review the prompt, style, and intended use before generating, attaching, or publishing the asset.',
            sourceSurface,
            sourceModule,
            metadata: {
                sourceConversationId: conversationId || null,
                sourceLeadId: leadId || null,
                category,
                aspectRatio,
            },
        },
        sourceSurface,
        sourceModule,
        customerProvidedNotes: prompt,
        conversationId,
        leadId,
        generatedAt: now,
    });
    const createdBy = isUuid(input.projectUserId) ? input.projectUserId : null;
    const folderSafeKey = idempotencyKey.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'draft';
    const { data, error } = await input.supabase
        .from('media_assets')
        .insert({
        name: title,
        url: buildChatbotMediaDraftPlaceholderUrl(title),
        size: 0,
        type: 'image/svg+xml',
        category,
        folder_path: `media/ai-generated/chatcore/${folderSafeKey}`,
        tags: uniqueStrings([
            'chatbot-engine',
            'chatcore',
            'media-ai',
            'ai-generated',
            'needs-review',
            sourceSurface,
            aspectRatio,
        ]),
        description: mediaRequest.customerRequestNote,
        is_ai_generated: true,
        ai_prompt: prompt,
        is_system_asset: false,
        used_in: [],
        usage_count: 0,
        metadata: {
            ...compactMetadata(input.metadata),
            projectId: input.projectId,
            tenantId: input.tenantId || null,
            projectUserId: input.projectUserId || null,
            chatbotEngine: true,
            actionType: 'request_media_asset',
            sourceSurface,
            sourceModule,
            sourceEvent: 'chatbot_media_asset_requested',
            conversationId: conversationId || null,
            leadId: leadId || null,
            mediaKind: 'asset',
            generationStatus: 'draft_prompt',
            generationMode: 'draft_prompt',
            aspectRatio,
            style: cleanString(input.style, 120) || null,
            model: cleanString(input.model, 120) || null,
            generatedByAI: true,
            needsReview: true,
            safeToEdit: true,
            readyForMediaAI: true,
            noAutoPublish: true,
            generationStarted: false,
            providerJobCreated: false,
            attachedToSurface: false,
            published: false,
            customerRequestSummary: mediaRequest.customerRequestSummary,
            customerRequestNote: mediaRequest.customerRequestNote,
            customerRequestSummaryTarget: 'media_assets.metadata.customerRequestSummary,media_assets.description',
            idempotencyKey,
        },
        created_by: createdBy,
        created_at: nowIso,
        updated_at: nowIso,
    })
        .select('id,name,url,metadata')
        .maybeSingle();
    if (error)
        throw error;
    return {
        assetId: String(data?.id || ''),
        name: String(data?.name || title),
        url: String(data?.url || ''),
        duplicate: false,
        reviewRequired: true,
        generationStarted: false,
        noAutoPublish: true,
    };
}
export async function subscribeChatbotEmailAudience(input) {
    const audienceId = requireString(input.audienceId, 120);
    const email = cleanEmail(input.email);
    if (!email)
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    if (input.marketingConsent !== true) {
        throw Object.assign(new Error(BILINGUAL_MARKETING_CONSENT), { status: 403 });
    }
    const suppressed = await isSuppressed({
        supabase: input.supabase,
        projectId: input.projectId,
        email,
        scope: 'marketing',
    });
    if (suppressed) {
        throw Object.assign(new Error(BILINGUAL_EMAIL_SUPPRESSED), { status: 409 });
    }
    const audience = await addAudienceMembers({
        supabase: input.supabase,
        projectId: input.projectId,
        audienceId,
        members: [{
                email,
                name: cleanString(input.name, 200) || undefined,
                leadId: cleanString(input.leadId, 120) || undefined,
                customerId: cleanString(input.customerId, 120) || undefined,
                source: 'chatbot-engine',
                acceptsMarketing: true,
                metadata: {
                    consentSource: cleanString(input.consentSource, 120) || 'chatbot-widget',
                    sourceSurface: cleanString(input.sourceSurface, 120) || null,
                    sourceModule: cleanString(input.sourceModule, 120) || 'chatcore',
                    idempotencyKey: cleanString(input.idempotencyKey, 240) || null,
                    chatbotEngine: true,
                    ...compactMetadata(input.metadata),
                },
            }],
    });
    return {
        audienceId: String(audience?.id || audienceId),
        email,
        staticMemberCount: Number(audience?.static_member_count || audience?.staticMemberCount || 0),
    };
}
export async function queueChatbotEmailFollowUpDraft(input) {
    const email = cleanEmail(input.email);
    if (!email)
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    if (input.marketingConsent !== true) {
        throw Object.assign(new Error(BILINGUAL_MARKETING_CONSENT), { status: 403 });
    }
    const suppressed = await isSuppressed({
        supabase: input.supabase,
        projectId: input.projectId,
        email,
        scope: 'marketing',
    });
    if (suppressed) {
        throw Object.assign(new Error(BILINGUAL_EMAIL_SUPPRESSED), { status: 409 });
    }
    const leadId = cleanString(input.leadId, 120);
    const conversationId = cleanString(input.conversationId, 120);
    const sourceEntityType = leadId ? 'lead' : conversationId ? 'conversation' : 'chatbot_contact';
    const sourceEntityId = leadId || conversationId || email;
    const sourceEvent = cleanString(input.sourceEvent, 120) || 'chatbot_email_follow_up_queued';
    const idempotencyKey = cleanString(input.idempotencyKey, 240)
        || buildRuntimeIdempotencyKey(input.projectId, 'queue_email_follow_up', [sourceEvent, sourceEntityType, sourceEntityId, email]);
    const existing = await findEmailLogByIdempotencyKey({
        supabase: input.supabase,
        projectId: input.projectId,
        idempotencyKey,
    });
    if (existing) {
        return {
            emailLogId: String(existing.id || ''),
            email,
            duplicate: true,
            status: String(existing.status || 'skipped'),
            reviewRequired: true,
            reviewQueueUrl: `/email?projectId=${encodeURIComponent(input.projectId)}&tab=review&sourceModule=chatcore&sourceEntityType=${encodeURIComponent(sourceEntityType)}&sourceEntityId=${encodeURIComponent(sourceEntityId)}`,
        };
    }
    const subject = cleanString(input.subject, 240) || DEFAULT_EMAIL_FOLLOW_UP_SUBJECT;
    const html = cleanString(input.html, 12000) || DEFAULT_EMAIL_FOLLOW_UP_HTML;
    const text = cleanString(input.text, 12000) || DEFAULT_EMAIL_FOLLOW_UP_TEXT;
    const sourceSurface = cleanString(input.sourceSurface, 120) || null;
    const sourceModule = cleanString(input.sourceModule, 120) || 'chatcore';
    const emailRequest = buildRuntimeCustomerRequestArtifacts({
        body: {
            name: input.name,
            email,
            subject,
            message: cleanString(input.customerRequestSummary, 5000) || text || subject,
            conversationTranscript: input.conversationTranscript,
            aiAnalysis: 'ES: Draft de Email Marketing generado por ChatCore para revision humana. EN: Email Marketing draft generated by ChatCore for human review.',
            recommendedAction: 'ES: Revisar consentimiento, audiencia y contenido antes de enviar. EN: Review consent, audience, and content before sending.',
            sourceSurface,
            sourceModule,
            metadata: {
                sourceConversationId: conversationId || null,
                sourceLeadId: leadId || null,
                emailSubject: subject,
                sendMode: 'draft_only',
            },
        },
        sourceSurface,
        sourceModule,
        customerProvidedNotes: cleanString(input.customerRequestSummary, 5000) || text || null,
        conversationId,
        leadId,
    });
    const customerRequestSummary = emailRequest.customerRequestSummary;
    const customerRequestNote = emailRequest.customerRequestNote;
    const canonicalEmail = buildCanonicalEmailDraftMetadata({
        sourceModule: 'chatcore',
        sourceComponent: sourceModule,
        sourceEvent,
        sourceEntityType,
        sourceEntityId,
        projectId: input.projectId,
        recipientEmail: email,
        generatedByAI: true,
        needsReview: true,
        safeToEdit: true,
        consentSource: cleanString(input.consentSource, 120) || sourceModule,
        marketingConsent: true,
        transactionalConsent: null,
        extra: {
            chatbotEngine: true,
            sourceSurface,
            sourceModule,
            conversationId: conversationId || null,
            leadId: leadId || null,
            customerId: cleanString(input.customerId, 120) || null,
            customerRequestSummary,
            customerRequestNote,
            customerRequestSummaryTarget: 'email_logs.metadata.customerRequestSummary',
            ...compactMetadata(input.metadata),
        },
    });
    const log = await recordEmailLog({
        supabase: input.supabase,
        projectId: input.projectId,
        tenantId: input.tenantId,
        userId: input.projectUserId,
        type: 'chatbot_email_follow_up',
        emailKind: 'marketing',
        templateId: 'chatbot_email_follow_up',
        recipientEmail: email,
        recipientName: cleanString(input.name, 200) || null,
        subject,
        status: 'skipped',
        idempotencyKey,
        sourceModule: 'chatcore',
        sourceComponent: sourceModule,
        sourceEvent,
        sourceEntityType,
        sourceEntityId,
        correlationId: idempotencyKey,
        skippedReason: 'needs_review:chatbot_engine_email_follow_up',
        metadata: {
            canonicalEmail,
            canonicalEmailIntent: true,
            canonicalEmailIntentVersion: 1,
            generatedByAI: true,
            needsReview: true,
            safeToEdit: true,
            sendMode: 'draft_only',
            noEmailSent: true,
            subject,
            html,
            text,
            chatbotEngine: true,
            sourceSurface,
            conversationId: conversationId || null,
            leadId: leadId || null,
            customerId: cleanString(input.customerId, 120) || null,
            customerRequestSummary,
            customerRequestNote,
            customerRequestSummaryTarget: 'email_logs.metadata.customerRequestSummary,canonicalEmail.extra.customerRequestSummary',
        },
    });
    return {
        emailLogId: String(log?.id || ''),
        email,
        duplicate: false,
        status: String(log?.status || 'skipped'),
        reviewRequired: true,
        reviewQueueUrl: `/email?projectId=${encodeURIComponent(input.projectId)}&tab=review&sourceModule=chatcore&sourceEntityType=${encodeURIComponent(sourceEntityType)}&sourceEntityId=${encodeURIComponent(sourceEntityId)}`,
    };
}
export async function sendChatbotInternalAlert(input) {
    const recipientEmail = cleanEmail(input.recipientEmail);
    if (!recipientEmail)
        throw Object.assign(new Error(BILINGUAL_REQUIRED), { status: 400 });
    const conversationId = cleanString(input.conversationId, 120);
    const leadId = cleanString(input.leadId, 120);
    const appointmentId = cleanString(input.appointmentId, 120);
    const sourceEntityType = leadId ? 'lead' : appointmentId ? 'appointment' : conversationId ? 'conversation' : 'chatbot_internal_alert';
    const sourceEntityId = leadId || appointmentId || conversationId || recipientEmail;
    const sourceEvent = cleanString(input.sourceEvent, 120) || 'chatbot_internal_alert_requested';
    const alertType = cleanString(input.alertType, 120) || 'chatbot_internal_alert';
    const priority = cleanString(input.priority, 40) || 'normal';
    const subject = cleanString(input.subject, 240) || 'ChatCore internal alert / Alerta interna de ChatCore';
    const message = cleanString(input.message, 5000) || cleanString(input.summary, 5000) || subject;
    const sourceSurface = cleanString(input.sourceSurface, 120) || 'admin_preview';
    const sourceModule = cleanString(input.sourceModule, 120) || 'chatcore';
    const idempotencyKey = cleanString(input.idempotencyKey, 240)
        || buildRuntimeIdempotencyKey(input.projectId, 'send_internal_alert', [
            sourceEvent,
            sourceEntityType,
            sourceEntityId,
            recipientEmail,
            alertType,
        ]);
    const existing = await findEmailLogByIdempotencyKey({
        supabase: input.supabase,
        projectId: input.projectId,
        idempotencyKey,
    });
    if (existing) {
        return {
            emailLogId: String(existing.id || ''),
            recipientEmail,
            duplicate: true,
            status: String(existing.status || 'skipped'),
            reviewRequired: true,
            noEmailSent: true,
            reviewQueueUrl: `/email?projectId=${encodeURIComponent(input.projectId)}&tab=review&sourceModule=chatcore&sourceEntityType=${encodeURIComponent(sourceEntityType)}&sourceEntityId=${encodeURIComponent(sourceEntityId)}`,
        };
    }
    const alertRequest = buildRuntimeCustomerRequestArtifacts({
        body: {
            recipientEmail,
            recipientName: input.recipientName,
            subject,
            message,
            priority,
            alertType,
            aiAnalysis: 'ES: Alerta interna preparada por ChatCore para revision humana. EN: Internal alert prepared by ChatCore for human review.',
            recommendedAction: 'ES: Revisar el contexto antes de notificar al equipo o contactar al cliente. EN: Review context before notifying the team or contacting the customer.',
            sourceSurface,
            sourceModule,
            metadata: {
                sourceConversationId: conversationId || null,
                sourceLeadId: leadId || null,
                sourceAppointmentId: appointmentId || null,
                alertType,
                priority,
            },
        },
        sourceSurface,
        sourceModule,
        customerProvidedNotes: message,
        conversationId,
        leadId,
    });
    const canonicalEmail = buildCanonicalEmailDraftMetadata({
        sourceModule: 'chatcore',
        sourceComponent: sourceModule,
        sourceEvent,
        sourceEntityType,
        sourceEntityId,
        projectId: input.projectId,
        recipientEmail,
        generatedByAI: true,
        needsReview: true,
        safeToEdit: true,
        consentSource: sourceModule,
        marketingConsent: null,
        transactionalConsent: true,
        extra: {
            chatbotEngine: true,
            actionType: 'send_internal_alert',
            sourceSurface,
            sourceModule,
            conversationId: conversationId || null,
            leadId: leadId || null,
            appointmentId: appointmentId || null,
            alertType,
            priority,
            customerRequestSummary: alertRequest.customerRequestSummary,
            customerRequestNote: alertRequest.customerRequestNote,
            customerRequestSummaryTarget: 'email_logs.metadata.customerRequestSummary',
            ...compactMetadata(input.metadata),
        },
    });
    const log = await recordEmailLog({
        supabase: input.supabase,
        projectId: input.projectId,
        tenantId: input.tenantId,
        userId: input.projectUserId,
        type: 'chatbot_internal_alert',
        emailKind: 'transactional',
        templateId: 'chatbot_internal_alert',
        recipientEmail,
        recipientName: cleanString(input.recipientName, 200) || null,
        subject,
        status: 'skipped',
        idempotencyKey,
        sourceModule: 'chatcore',
        sourceComponent: sourceModule,
        sourceEvent,
        sourceEntityType,
        sourceEntityId,
        correlationId: idempotencyKey,
        skippedReason: 'needs_review:chatbot_engine_internal_alert',
        metadata: {
            canonicalEmail,
            canonicalEmailIntent: true,
            canonicalEmailIntentVersion: 1,
            generatedByAI: true,
            needsReview: true,
            safeToEdit: true,
            sendMode: 'draft_only',
            noEmailSent: true,
            chatbotEngine: true,
            actionType: 'send_internal_alert',
            sourceSurface,
            conversationId: conversationId || null,
            leadId: leadId || null,
            appointmentId: appointmentId || null,
            alertType,
            priority,
            subject,
            message,
            customerRequestSummary: alertRequest.customerRequestSummary,
            customerRequestNote: alertRequest.customerRequestNote,
            customerRequestSummaryTarget: 'email_logs.metadata.customerRequestSummary,canonicalEmail.extra.customerRequestSummary',
        },
    });
    return {
        emailLogId: String(log?.id || ''),
        recipientEmail,
        duplicate: false,
        status: String(log?.status || 'skipped'),
        reviewRequired: true,
        noEmailSent: true,
        reviewQueueUrl: `/email?projectId=${encodeURIComponent(input.projectId)}&tab=review&sourceModule=chatcore&sourceEntityType=${encodeURIComponent(sourceEntityType)}&sourceEntityId=${encodeURIComponent(sourceEntityId)}`,
    };
}
//# sourceMappingURL=chatbotEngineRuntimeActionService.js.map