import { supabase } from '../../supabase';
import type { Lead } from '../../types';
import { loadPublicStorefrontCatalog } from '../../utils/ecommerce/publicStorefrontCatalog';
import { getBioPageById, sanitizeBioMediaUrl, sanitizeBioUrl, validateBioSlug } from './bioPageEngineService';
import { recordBioPageEvent } from './bioPageAnalyticsService';
import { filterBioPageProductsForBlock, getBioPageEligibleStorefrontProducts, mapStorefrontProductToBioPageProduct } from './bioPageProductGuard';
import type { BioPageBlock, BioPageData, BioPageLink } from './bioPageTypes';

type SupabaseClient = typeof supabase;
type BioPageTrafficChannel = 'share' | 'qr';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAYMENT_RETURN_STORAGE_PREFIX = 'quimera:bio-page:appointment-payment-return';
const BIO_PAGE_TRAFFIC_DEFAULTS: Record<BioPageTrafficChannel, { source: string; medium: string }> = {
    share: { source: 'bio_page', medium: 'share' },
    qr: { source: 'qr', medium: 'bio_page' },
};

type PaymentReturnStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface BioPageAppointmentPaymentReturn {
    status: 'success' | 'cancelled';
    appointmentId?: string;
    orderId?: string;
    blockId?: string;
}

function isDuplicateLeadError(error: unknown): boolean {
    const candidate = error as { code?: string; message?: string } | null;
    return candidate?.code === '23505'
        || /leads_bio_page_project_email_source_unique_idx|duplicate key|unique constraint/i.test(candidate?.message || '');
}

const BIO_PAGE_ANALYTICS_METADATA_ALLOWED_KEYS = new Set([
    'bioPageId',
    'bioSlug',
    'blockId',
    'linkId',
    'source',
    'sourceModule',
    'sourceComponent',
    'sourceEvent',
    'emailMarketingSource',
    'audienceId',
    'audienceSync',
    'crmWrite',
    'duplicate',
    'consentRequired',
]);

const BIO_PAGE_ANALYTICS_METADATA_BLOCKED_KEY_RE = /(email|phone|name|message|note|address|recipient|dedupe|canonical|sourceEntity|subscriberId|leadId|audienceError|leadForm)/i;

function sanitizeBioPageAnalyticsValue(value: unknown): unknown {
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'string') return value.trim().slice(0, 160);
    return undefined;
}

export function sanitizeBioPageAnalyticsMetadata(metadata: Record<string, unknown> = {}): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    Object.entries(metadata).forEach(([key, value]) => {
        if (!BIO_PAGE_ANALYTICS_METADATA_ALLOWED_KEYS.has(key)) return;
        if (key !== 'emailMarketingSource' && BIO_PAGE_ANALYTICS_METADATA_BLOCKED_KEY_RE.test(key)) return;
        const sanitizedValue = sanitizeBioPageAnalyticsValue(value);
        if (sanitizedValue !== undefined) sanitized[key] = sanitizedValue;
    });

    return sanitized;
}

export function getPublicRenderableBioPage(page: BioPageData): BioPageData | null {
    if (page.status !== 'published' || page.isPublished !== true) return null;

    return {
        ...page,
        links: (page.links || []).filter(link => link.enabled !== false && link.visible !== false),
        blocks: (page.blocks || []).filter(block => block.visible !== false && block.status !== 'hidden'),
    };
}

async function hydratePublicBioPageProducts(page: BioPageData): Promise<BioPageData> {
    if (!page.projectId || !page.blocks.some(block => block.visible !== false && ['product_grid', 'product_collection'].includes(block.type))) {
        return page;
    }

    try {
        const catalog = await loadPublicStorefrontCatalog(page.projectId, { maxProducts: 12 });
        const renderableProducts = getBioPageEligibleStorefrontProducts(catalog)
            .map(product => mapStorefrontProductToBioPageProduct(product, page.projectId));
        const requestedProductIds = new Set<string>();
        const requestedCollectionIds = new Set<string>();

        page.blocks
            .filter(block => ['product_grid', 'product_collection'].includes(block.type))
            .forEach(block => {
                filterBioPageProductsForBlock(renderableProducts, block)
                    .forEach(product => requestedProductIds.add(product.id));
                if (Array.isArray(block.data?.collectionIds)) {
                    block.data.collectionIds
                        .filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
                        .forEach(id => requestedCollectionIds.add(id));
                }
            });

        const products = (requestedProductIds.size
            ? renderableProducts.filter(product => requestedProductIds.has(product.id))
            : renderableProducts)
            .slice(0, requestedCollectionIds.size ? 12 : 8);

        return { ...page, products };
    } catch (error) {
        console.warn('[BioPagePublic] Ecommerce products were not hydrated:', error);
        return page;
    }
}

export async function getPublicBioPageBySlug(slugInput: string, client: SupabaseClient = supabase): Promise<BioPageData | null> {
    const validation = validateBioSlug(slugInput);
    if (!validation.ok) return null;

    const { data, error } = await client
        .from('bio_pages')
        .select('id')
        .eq('slug', validation.slug)
        .eq('status', 'published')
        .maybeSingle();

    if (error) throw error;
    if (!data?.id) return null;
    const page = await getBioPageById(data.id, client);
    const publicPage = page ? getPublicRenderableBioPage(page) : null;
    return publicPage ? hydratePublicBioPageProducts(publicPage) : null;
}

export function getPublicBioPageUrl(slug: string, origin = typeof window !== 'undefined' ? window.location.origin : ''): string {
    const validation = validateBioSlug(slug);
    const safeSlug = validation.slug || 'bio';
    return `${origin.replace(/\/$/, '')}/bio/${safeSlug}`;
}

function sanitizeBioUtmValue(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9._~-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

function appendBioPageQueryParams(url: string, params: Record<string, string>): string {
    const entries = Object.entries(params).filter(([, value]) => Boolean(value));
    if (!entries.length) return url;
    const [withoutHash, hash = ''] = url.split('#');
    const separator = withoutHash.includes('?') ? '&' : '?';
    const query = new URLSearchParams(entries).toString();
    return `${withoutHash}${separator}${query}${hash ? `#${hash}` : ''}`;
}

export function buildBioPageTrackedUrl(input: {
    page: Pick<BioPageData, 'slug' | 'settings'>;
    origin?: string;
    channel?: BioPageTrafficChannel;
    utm?: Partial<Record<'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term', string>>;
}): string {
    const channel = input.channel || 'share';
    const defaults = BIO_PAGE_TRAFFIC_DEFAULTS[channel];
    const settings = input.page.settings || {};
    const channelPrefix = channel === 'qr' ? 'qr' : 'share';
    const configuredSource = sanitizeBioUtmValue(settings[`${channelPrefix}UtmSource`]);
    const configuredMedium = sanitizeBioUtmValue(settings[`${channelPrefix}UtmMedium`]);
    const configuredCampaign = sanitizeBioUtmValue(settings[`${channelPrefix}UtmCampaign`]);
    const overrideUtm = Object.fromEntries(
        Object.entries(input.utm || {})
            .map(([key, value]) => [key, sanitizeBioUtmValue(value)] as const)
            .filter(([, value]) => Boolean(value)),
    );

    return appendBioPageQueryParams(getPublicBioPageUrl(input.page.slug, input.origin), {
        utm_source: configuredSource || defaults.source,
        utm_medium: configuredMedium || defaults.medium,
        ...(configuredCampaign ? { utm_campaign: configuredCampaign } : {}),
        ...overrideUtm,
    });
}

export function getSafeBioLinkUrl(link: BioPageLink): string {
    if (link.linkType === 'chatbot') return '';
    return sanitizeBioUrl(link.url);
}

export function getSafeBioBlockUrl(block: Pick<BioPageBlock, 'data'>, fallbackUrl = ''): string {
    const rawUrl = typeof block.data?.url === 'string' ? block.data.url : fallbackUrl;
    return rawUrl ? sanitizeBioUrl(rawUrl) : '';
}

export function getSafeBioBlockMediaUrl(block: Pick<BioPageBlock, 'data'>, fallbackUrl = ''): string {
    const rawUrl = typeof block.data?.url === 'string' ? block.data.url : fallbackUrl;
    return rawUrl ? sanitizeBioMediaUrl(rawUrl) : '';
}

function readPaymentReturnParam(params: URLSearchParams, key: string, maxLength = 160): string | undefined {
    const value = params.get(key);
    return value?.trim().slice(0, maxLength) || undefined;
}

export function parseBioPageAppointmentPaymentReturn(
    search = typeof window !== 'undefined' ? window.location.search : '',
): BioPageAppointmentPaymentReturn | null {
    const params = new URLSearchParams(search);
    const status = params.get('appointmentPayment');
    if (status !== 'success' && status !== 'cancelled') return null;

    return {
        status,
        appointmentId: readPaymentReturnParam(params, 'appointmentId'),
        orderId: readPaymentReturnParam(params, 'orderId'),
        blockId: readPaymentReturnParam(params, 'bioBlockId') || readPaymentReturnParam(params, 'blockId'),
    };
}

function paymentReturnStorageKey(page: Pick<BioPageData, 'id'>, paymentReturn: BioPageAppointmentPaymentReturn): string {
    return `${PAYMENT_RETURN_STORAGE_PREFIX}:${page.id}:${paymentReturn.appointmentId || paymentReturn.orderId || 'unknown'}`;
}

function hasStoredPaymentReturn(storage: PaymentReturnStorage | null, key: string): boolean {
    if (!storage) return false;
    try {
        return storage.getItem(key) === '1';
    } catch (_error) {
        return false;
    }
}

function storePaymentReturn(storage: PaymentReturnStorage | null, key: string): void {
    if (!storage) return;
    try {
        storage.setItem(key, '1');
    } catch (_error) {
        // Ignore storage failures; analytics should not block public page rendering.
    }
}

export async function trackBioPageAppointmentPaymentReturn(
    page: BioPageData,
    search = typeof window !== 'undefined' ? window.location.search : '',
    storage: PaymentReturnStorage | null = typeof window !== 'undefined' ? window.sessionStorage : null,
    client: SupabaseClient = supabase,
): Promise<boolean> {
    const paymentReturn = parseBioPageAppointmentPaymentReturn(search);
    if (!paymentReturn || paymentReturn.status !== 'success') return false;
    if (!paymentReturn.appointmentId && !paymentReturn.orderId) return false;

    const storageKey = paymentReturnStorageKey(page, paymentReturn);
    if (hasStoredPaymentReturn(storage, storageKey)) return false;

    await trackBioPageBookingCompleted(page, paymentReturn.blockId || null, {
        appointmentId: paymentReturn.appointmentId,
        orderId: paymentReturn.orderId,
        paymentRequired: true,
        paymentStatus: 'checkout_return_success',
        checkoutProvider: 'stripe',
    }, client);
    storePaymentReturn(storage, storageKey);
    return true;
}

export async function submitBioPageLead(input: {
    page: BioPageData;
    lead: Partial<Lead> & { name?: string; email?: string; phone?: string; message?: string };
    source?: 'bio_page' | 'bio_page_chat';
    blockId?: string | null;
    metadata?: Record<string, unknown>;
}, client: SupabaseClient = supabase): Promise<string | null> {
    const source = input.source || 'bio_page';
    if (!input.page.projectId || !input.page.tenantId) return null;
    const email = typeof input.lead.email === 'string' ? input.lead.email.trim().toLowerCase() : '';
    const bioPageDedupeKey = email ? `email:${email}` : '';
    const leadMetadata = {
        ...(((input.lead as any).customData || {}) as Record<string, unknown>),
        ...((input.lead.metadata || {}) as Record<string, unknown>),
        ...(input.metadata || {}),
        bioPageId: input.page.id,
        bioSlug: input.page.slug,
        blockId: input.blockId || null,
        source,
        sourceModule: 'bio-page-engine',
        ...(bioPageDedupeKey ? { bioPageDedupeKey } : {}),
    };

    const tags = Array.from(new Set([
        'bio-page',
        'link-in-bio',
        input.blockId ? 'bio-page-block' : '',
        ...(Array.isArray(input.lead.tags) ? input.lead.tags : []),
    ].filter(Boolean)));

    const payload = {
        tenant_id: input.page.tenantId,
        project_id: input.page.projectId,
        name: input.lead.name || '',
        email,
        phone: input.lead.phone || '',
        company: input.lead.company || null,
        status: input.lead.status || 'new',
        source,
        tags,
        notes: input.lead.message || input.lead.notes || null,
        custom_data: leadMetadata,
    };
    const analyticsMetadata = sanitizeBioPageAnalyticsMetadata(leadMetadata);

    const { data, error } = await client.from('leads').insert(payload).select('id').single();
    if (error) {
        if (isDuplicateLeadError(error)) {
            await recordBioPageEvent({
                page: input.page,
                eventType: 'bio_lead_submitted',
                blockId: input.blockId,
                source,
                metadata: { ...analyticsMetadata, crmWrite: 'duplicate', duplicate: true },
            }, client);
            return null;
        }
        console.warn('[BioPagePublic] CRM lead was not created:', error.message);
        await recordBioPageEvent({
            page: input.page,
            eventType: 'bio_lead_submitted',
            blockId: input.blockId,
            source,
            metadata: { ...analyticsMetadata, crmWrite: 'blocked' },
        }, client);
        return null;
    }

    await recordBioPageEvent({
        page: input.page,
        eventType: 'bio_lead_submitted',
        blockId: input.blockId,
        source,
        metadata: { ...analyticsMetadata, crmWrite: 'created' },
    }, client);

    return data.id;
}

export async function subscribeBioPageEmail(input: {
    page: BioPageData;
    email: string;
    name?: string;
    consent: boolean;
    audienceId?: string | null;
    blockId?: string | null;
    metadata?: Record<string, unknown>;
}, client: SupabaseClient = supabase): Promise<{ ok: true; duplicate?: boolean } | { ok: false; error: string }> {
    const email = input.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { ok: false, error: 'Invalid email address.' };
    if (!input.consent) return { ok: false, error: 'Consent is required.' };
    const audienceId = input.audienceId || (input.page.settings?.audienceId as string | undefined) || null;
    const metadata = {
        ...(input.metadata || {}),
        bioPageId: input.page.id,
        bioSlug: input.page.slug,
        blockId: input.blockId || null,
        emailMarketingSource: 'bio_page',
        sourceModule: 'bio-page-engine',
    };

    const edgeResult = await subscribeBioPageEmailViaEdge({
        page: input.page,
        email,
        name: input.name,
        consent: input.consent,
        audienceId,
        blockId: input.blockId,
        metadata,
    }, client);
    if (edgeResult) return edgeResult;

    const { error } = await client
        .from('bio_page_subscribers')
        .insert({
            tenant_id: input.page.tenantId || null,
            project_id: input.page.projectId,
            bio_page_id: input.page.id,
            email,
            name: input.name || null,
            consent: true,
            source: 'bio_page',
            audience_id: audienceId,
            metadata,
        });

    if (error) {
        if (error.code === '23505') return { ok: true, duplicate: true };
        return { ok: false, error: error.message };
    }

    await recordBioPageEvent({
        page: input.page,
        eventType: 'bio_email_subscribed',
        blockId: input.blockId,
        source: 'email_subscribe',
        metadata: sanitizeBioPageAnalyticsMetadata({
            audienceId,
            audienceSync: audienceId ? 'deferred' : 'not_configured',
            ...metadata,
        }),
    }, client);

    return { ok: true };
}

async function subscribeBioPageEmailViaEdge(input: {
    page: BioPageData;
    email: string;
    name?: string;
    consent: boolean;
    audienceId?: string | null;
    blockId?: string | null;
    metadata?: Record<string, unknown>;
}, client: SupabaseClient): Promise<{ ok: true; duplicate?: boolean } | { ok: false; error: string } | null> {
    const functionsClient = (client as any).functions;
    if (!functionsClient?.invoke) return null;

    try {
        const { data, error } = await functionsClient.invoke('email-api', {
            body: {
                action: 'subscribeBioPageEmail',
                bioPageId: input.page.id,
                slug: input.page.slug,
                projectId: input.page.projectId,
                email: input.email,
                name: input.name,
                consent: input.consent,
                audienceId: input.audienceId,
                blockId: input.blockId,
                metadata: input.metadata,
            },
        });

        if (error) {
            console.warn('[BioPagePublic] Email API subscribe fallback engaged:', error.message || error);
            return null;
        }
        if (data?.success === true) {
            return { ok: true, duplicate: data.duplicate === true };
        }
        if (data?.success === false) {
            return { ok: false, error: String(data.error || 'Unable to subscribe.') };
        }
    } catch (error) {
        console.warn('[BioPagePublic] Email API subscribe unavailable:', error);
    }

    return null;
}

export async function trackBioPageShare(page: BioPageData, client: SupabaseClient = supabase): Promise<void> {
    await recordBioPageEvent({ page, eventType: 'bio_profile_shared', source: 'share' }, client);
}

export async function trackBioPageTabChange(page: BioPageData, tab: string, client: SupabaseClient = supabase): Promise<void> {
    await recordBioPageEvent({
        page,
        eventType: 'bio_tab_changed',
        source: 'tab',
        metadata: { tab },
    }, client);
}

export async function trackBioPageChatOpen(page: BioPageData, blockId?: string | null, client: SupabaseClient = supabase): Promise<void> {
    await recordBioPageEvent({ page, eventType: 'bio_chat_opened', blockId, source: 'chatcore' }, client);
}

export async function trackBioPageBookingStarted(page: BioPageData, blockId?: string | null, client: SupabaseClient = supabase): Promise<void> {
    await recordBioPageEvent({ page, eventType: 'bio_booking_started', blockId, source: 'appointments' }, client);
}

export async function trackBioPageBookingCompleted(
    page: BioPageData,
    blockId?: string | null,
    metadata: Record<string, unknown> = {},
    client: SupabaseClient = supabase,
): Promise<void> {
    await recordBioPageEvent({
        page,
        eventType: 'bio_booking_completed',
        blockId,
        source: 'appointments',
        metadata,
    }, client);
}

export async function trackBioPageProductClick(page: BioPageData, productId: string, blockId?: string | null, client: SupabaseClient = supabase): Promise<void> {
    await recordBioPageEvent({
        page,
        eventType: 'bio_product_clicked',
        blockId,
        source: 'ecommerce',
        metadata: { productId },
    }, client);
}
