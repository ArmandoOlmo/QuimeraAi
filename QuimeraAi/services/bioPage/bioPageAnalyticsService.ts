import { supabase } from '../../supabase';
import type { BioPageAnalyticsSummary, BioPageData, BioPageLink } from './bioPageTypes';

type SupabaseClient = typeof supabase;
type VisitorStorage = Pick<Storage, 'getItem' | 'setItem'>;

const BIO_PAGE_VISITOR_STORAGE_KEY = 'quimera:bio-page:anonymous-visitor-id';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type BioPageEventType =
    | 'bio_page_viewed'
    | 'bio_profile_shared'
    | 'bio_qr_scanned'
    | 'bio_link_clicked'
    | 'bio_social_clicked'
    | 'bio_product_clicked'
    | 'bio_collection_clicked'
    | 'bio_booking_started'
    | 'bio_booking_completed'
    | 'bio_lead_submitted'
    | 'bio_email_subscribed'
    | 'bio_chat_opened'
    | 'bio_tab_changed';

export function getBioPageUtm(search = typeof window !== 'undefined' ? window.location.search : ''): Record<string, string> {
    const params = new URLSearchParams(search);
    return Object.fromEntries(
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
            .map(key => [key, params.get(key) || ''] as const)
            .filter(([, value]) => Boolean(value)),
    );
}

function createAnonymousVisitorId(): string {
    const randomId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `bio_visitor_${randomId}`;
}

export function getBioPageAnonymousVisitorId(
    storage: VisitorStorage | null = typeof window !== 'undefined' ? window.localStorage : null,
): string | null {
    if (!storage) return null;

    try {
        const existing = storage.getItem(BIO_PAGE_VISITOR_STORAGE_KEY);
        if (existing && /^[a-zA-Z0-9:_-]{12,128}$/.test(existing)) {
            return existing;
        }

        const nextVisitorId = createAnonymousVisitorId();
        storage.setItem(BIO_PAGE_VISITOR_STORAGE_KEY, nextVisitorId);
        return nextVisitorId;
    } catch (_error) {
        return null;
    }
}

export async function recordBioPageEvent(input: {
    page: Pick<BioPageData, 'id' | 'projectId' | 'tenantId'>;
    eventType: BioPageEventType;
    blockId?: string | null;
    linkId?: string | null;
    source?: string | null;
    referrer?: string | null;
    utm?: Record<string, string>;
    metadata?: Record<string, unknown>;
}, client: SupabaseClient = supabase): Promise<void> {
    const safeBlockId = input.blockId && UUID_RE.test(input.blockId) ? input.blockId : null;
    const safeLinkId = input.linkId && UUID_RE.test(input.linkId) ? input.linkId : null;
    const metadata = {
        ...(input.metadata || {}),
        ...(input.blockId && !input.metadata?.blockId ? { blockId: input.blockId } : {}),
        ...(input.linkId && !input.metadata?.linkId ? { linkId: input.linkId } : {}),
    };

    const { error } = await client.from('bio_page_events').insert({
        tenant_id: input.page.tenantId || null,
        project_id: input.page.projectId,
        bio_page_id: input.page.id,
        block_id: safeBlockId,
        link_id: safeLinkId,
        event_type: input.eventType,
        source: input.source || null,
        referrer: input.referrer || (typeof document !== 'undefined' ? document.referrer : null),
        utm: input.utm || getBioPageUtm(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 512) : null,
        metadata,
    });

    if (error) {
        console.warn('[BioPageAnalytics] Event not recorded:', error.message);
    }
}

export async function recordBioPageView(
    page: BioPageData,
    client: SupabaseClient = supabase,
    storage: VisitorStorage | null = typeof window !== 'undefined' ? window.localStorage : null,
): Promise<void> {
    const visitorId = getBioPageAnonymousVisitorId(storage);
    await recordBioPageEvent({
        page,
        eventType: 'bio_page_viewed',
        metadata: visitorId ? { visitorId, anonymousVisitor: true } : {},
    }, client);
}

export async function recordBioPageClick(
    page: BioPageData,
    link: BioPageLink,
    blockId?: string | null,
    client: SupabaseClient = supabase,
): Promise<void> {
    const eventType = link.linkType === 'product'
        ? 'bio_product_clicked'
        : link.linkType === 'collection'
          ? 'bio_collection_clicked'
          : link.linkType === 'social'
            ? 'bio_social_clicked'
            : 'bio_link_clicked';
    const attributedBlockId = blockId || (typeof link.metadata?.blockId === 'string' ? link.metadata.blockId : null);

    await recordBioPageEvent({
        page,
        eventType,
        blockId: attributedBlockId,
        linkId: link.id,
        source: link.platform || link.linkType || 'link',
        metadata: {
            title: link.title,
            platform: link.platform,
            linkType: link.linkType,
            blockId: attributedBlockId,
        },
    }, client);
}

function incrementBreakdown(breakdown: Record<string, number>, key?: string | null): void {
    const normalizedKey = (key || '').trim() || 'direct';
    breakdown[normalizedKey] = (breakdown[normalizedKey] || 0) + 1;
}

function normalizeReferrer(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) return 'direct';
    try {
        return new URL(value).hostname.replace(/^www\./, '') || 'direct';
    } catch {
        return value.slice(0, 80);
    }
}

function getUtmValue(value: unknown, key: string): string {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
    const candidate = (value as Record<string, unknown>)[key];
    return typeof candidate === 'string' ? candidate.trim().slice(0, 120) : '';
}

function getDeviceType(userAgent: unknown): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
    if (typeof userAgent !== 'string' || !userAgent.trim()) return 'unknown';
    const normalized = userAgent.toLowerCase();
    if (/ipad|tablet|kindle|silk/.test(normalized)) return 'tablet';
    if (/mobi|iphone|android|phone/.test(normalized)) return 'mobile';
    return 'desktop';
}

function getEventVisitorId(metadata: unknown): string {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';
    const candidate = (metadata as Record<string, unknown>).visitorId;
    return typeof candidate === 'string' ? candidate.trim().slice(0, 128) : '';
}

function getEventMetadataId(metadata: unknown, key: 'blockId' | 'linkId'): string {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';
    const candidate = (metadata as Record<string, unknown>)[key];
    return typeof candidate === 'string' ? candidate.trim().slice(0, 160) : '';
}

export async function getBioPageAnalytics(input: {
    page: BioPageData;
    dateFrom?: string;
    dateTo?: string;
}, client: SupabaseClient = supabase): Promise<BioPageAnalyticsSummary> {
    let query = client
        .from('bio_page_events')
        .select('id, event_type, block_id, link_id, source, referrer, utm, user_agent, metadata, created_at')
        .eq('bio_page_id', input.page.id)
        .order('created_at', { ascending: false });

    if (input.dateFrom) query = query.gte('created_at', input.dateFrom);
    if (input.dateTo) query = query.lte('created_at', input.dateTo);

    const { data, error } = await query;
    if (error) throw error;

    const events = data || [];
    const eventBreakdown: Record<string, number> = {};
    const sourceBreakdown: Record<string, number> = {};
    const utmSourceBreakdown: Record<string, number> = {};
    const utmCampaignBreakdown: Record<string, number> = {};
    const referrerBreakdown: Record<string, number> = {};
    const deviceBreakdown: Record<string, number> = {};
    const blockBreakdown: Record<string, number> = {};
    const linkCounts = new Map<string, number>();
    const uniqueViewKeys = new Set<string>();

    events.forEach((event, index) => {
        eventBreakdown[event.event_type] = (eventBreakdown[event.event_type] || 0) + 1;
        incrementBreakdown(sourceBreakdown, event.source || getUtmValue(event.utm, 'utm_source') || normalizeReferrer(event.referrer));
        const utmSource = getUtmValue(event.utm, 'utm_source');
        const utmCampaign = getUtmValue(event.utm, 'utm_campaign');
        if (utmSource) incrementBreakdown(utmSourceBreakdown, utmSource);
        if (utmCampaign) incrementBreakdown(utmCampaignBreakdown, utmCampaign);
        incrementBreakdown(referrerBreakdown, normalizeReferrer(event.referrer));
        incrementBreakdown(deviceBreakdown, getDeviceType(event.user_agent));
        const blockId = event.block_id || getEventMetadataId(event.metadata, 'blockId');
        if (blockId) {
            blockBreakdown[blockId] = (blockBreakdown[blockId] || 0) + 1;
        }
        const linkId = event.link_id || getEventMetadataId(event.metadata, 'linkId');
        if (String(event.event_type).includes('clicked') && linkId) {
            linkCounts.set(linkId, (linkCounts.get(linkId) || 0) + 1);
        }
        if (event.event_type === 'bio_page_viewed') {
            const visitorId = getEventVisitorId(event.metadata);
            uniqueViewKeys.add(visitorId ? `visitor:${visitorId}` : `event:${event.id || index}`);
        }
    });

    const views = eventBreakdown.bio_page_viewed || 0;
    const uniqueViews = uniqueViewKeys.size || views;
    const clicks = Object.entries(eventBreakdown)
        .filter(([key]) => key.includes('clicked'))
        .reduce((sum, [, count]) => sum + count, 0);
    const subscribers = eventBreakdown.bio_email_subscribed || 0;
    const leads = eventBreakdown.bio_lead_submitted || 0;
    const bookingStarts = eventBreakdown.bio_booking_started || 0;
    const bookingCompletions = eventBreakdown.bio_booking_completed || 0;
    const productClicks = eventBreakdown.bio_product_clicked || 0;
    const collectionClicks = eventBreakdown.bio_collection_clicked || 0;
    const conversions = subscribers + leads + bookingStarts + bookingCompletions + productClicks + collectionClicks;

    return {
        views,
        uniqueViews,
        returningViews: Math.max(0, views - uniqueViews),
        clicks,
        subscribers,
        leads,
        bookings: bookingStarts + bookingCompletions,
        productClicks,
        conversions,
        ctr: views ? Math.round((clicks / views) * 1000) / 10 : 0,
        conversionRate: views ? Math.round((conversions / views) * 1000) / 10 : 0,
        qrScans: eventBreakdown.bio_qr_scanned || 0,
        shares: eventBreakdown.bio_profile_shared || 0,
        chatOpens: eventBreakdown.bio_chat_opened || 0,
        tabChanges: eventBreakdown.bio_tab_changed || 0,
        topLinks: input.page.links
            .map(link => ({ id: link.id, title: link.title, clicks: linkCounts.get(link.id) || link.clicks || 0 }))
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 10),
        sourceBreakdown,
        utmSourceBreakdown,
        utmCampaignBreakdown,
        referrerBreakdown,
        deviceBreakdown,
        blockBreakdown,
        eventBreakdown,
    };
}
