import { supabase } from '../../supabase';
import type { BioPageBlueprint } from '../../types/businessBlueprint';
import type {
    BioPageBlock,
    BioPageBlockType,
    BioPageData,
    BioPageLink,
    BioPageProduct,
    BioPageProfile,
    BioPageRuntimeStatus,
    BioPageSEO,
    BioPageSettings,
    BioPageTheme,
} from './bioPageTypes';

type SupabaseClient = typeof supabase;
type AnyRecord = Record<string, any>;
export type BioPageBlockInput = Pick<BioPageBlock, 'type' | 'title'> & Partial<Omit<BioPageBlock, 'type' | 'title'>>;
export type BioPageLinkInput = Pick<BioPageLink, 'title' | 'url'> & Partial<Omit<BioPageLink, 'title' | 'url'>>;

const RESERVED_SLUGS = new Set([
    'admin',
    'api',
    'app',
    'assets',
    'auth',
    'blog',
    'checkout',
    'dashboard',
    'editor',
    'email',
    'help',
    'login',
    'logout',
    'pricing',
    'preview',
    'register',
    'settings',
    'store',
    'support',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DEFAULT_BIO_PROFILE: BioPageProfile = {
    name: '',
    displayName: '',
    handle: '',
    bio: '',
    avatarUrl: '',
};

export const DEFAULT_BIO_THEME: BioPageTheme = {
    preset: 'default',
    layoutVariant: 'creator',
    backgroundColor: '#0f0f0f',
    backgroundType: 'solid',
    gradientColor: '#1a1a2e',
    buttonStyle: 'fill',
    buttonShape: 'rounded',
    buttonShadow: 'none',
    buttonColor: '#facc15',
    buttonTextColor: '#000000',
    textColor: '#ffffff',
    titleFont: 'Inter',
    titleColor: '#ffffff',
    bodyFont: 'Inter',
    bodyColor: '#ffffff',
    profileLayout: 'circle',
    profileSize: 'small',
    titleStyle: 'text',
    showQuimeraFooter: true,
    cardRadius: 16,
};

export function normalizeBioSlug(value: string): string {
    return (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 48);
}

export function validateBioSlug(value: string): { ok: true; slug: string } | { ok: false; error: string; slug: string } {
    const slug = normalizeBioSlug(value);
    if (slug.length < 3) return { ok: false, error: 'Slug must be at least 3 characters.', slug };
    if (RESERVED_SLUGS.has(slug)) return { ok: false, error: 'This slug is reserved.', slug };
    return { ok: true, slug };
}

function isBioSlugConflictError(error: unknown): boolean {
    const candidate = error as { code?: string; message?: string } | null;
    return candidate?.code === '23505'
        || /bio_pages_slug_unique_idx|duplicate key|unique constraint/i.test(candidate?.message || '');
}

function bioSlugTakenError(slug: string): Error {
    return new Error(`Bio Page slug "${slug}" is already in use.`);
}

function hasBioPagePublishPlaceholder(value: string | undefined): boolean {
    return /\[generate_text\]|\[todo\]|:projectid|your-|example\.com|placeholder/i.test(value || '');
}

function formatBioPageBlockLabel(type: string): string {
    return type.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function readText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function getPublishBlockFields(block: BioPageBlock): Array<{ id: string; label: string; type: string; required: boolean }> {
    const fields = Array.isArray(block.data?.fields) ? block.data.fields : [];
    return fields
        .slice(0, 12)
        .map((field, index) => {
            if (!field || typeof field !== 'object' || Array.isArray(field)) return null;
            const record = field as AnyRecord;
            return {
                id: readText(record.id) || `field-${index + 1}`,
                label: readText(record.label),
                type: readText(record.type) || 'text',
                required: record.required !== false,
            };
        })
        .filter((field): field is { id: string; label: string; type: string; required: boolean } => Boolean(field));
}

function pushBioPageFormPublishIssues(block: BioPageBlock, label: string, issues: string[]): void {
    if (block.type === 'lead_form') {
        const fields = getPublishBlockFields(block);
        if (!fields.length) issues.push(`Block "${label}" needs at least one lead field.`);
        if (!fields.some(field => field.type === 'email')) issues.push(`Block "${label}" needs an email field.`);
        if (fields.some(field => !field.label)) issues.push(`Block "${label}" has a field without a label.`);
        if (block.data?.consentRequired === true && !readText(block.data?.consentText)) {
            issues.push(`Block "${label}" needs consent copy.`);
        }
        if (!readText(block.data?.successMessage)) issues.push(`Block "${label}" needs a success message.`);
    }

    if (block.type === 'email_subscribe') {
        if (!readText(block.data?.placeholder)) issues.push(`Block "${label}" needs an email placeholder.`);
        if (!readText(block.data?.buttonText)) issues.push(`Block "${label}" needs subscribe button text.`);
        if (block.data?.consentRequired === false) issues.push(`Block "${label}" must require marketing consent.`);
        if (!readText(block.data?.consentText)) issues.push(`Block "${label}" needs marketing consent copy.`);
        if (!readText(block.data?.successMessage)) issues.push(`Block "${label}" needs a success message.`);
    }
}

function createBioPageLocalId(prefix: string): string {
    const randomId = globalThis.crypto?.randomUUID?.();
    return randomId || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nextBioPageOrder(items: Array<{ order?: number; orderIndex?: number }>): number {
    return Math.max(-1, ...items.map(item => Number(item.order ?? item.orderIndex ?? -1))) + 1;
}

function cloneBioPageRecord(value?: Record<string, unknown>): Record<string, unknown> {
    const record = value || {};
    if (typeof globalThis.structuredClone === 'function') {
        return globalThis.structuredClone(record);
    }
    return JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
}

function isBioPageSystemBlock(block: Pick<BioPageBlock, 'type'>): boolean {
    return block.type === 'profile' || block.type === 'link';
}

export function reindexBioPageLinks(links: BioPageLink[]): BioPageLink[] {
    return links.map((link, index) => ({ ...link, order: index, orderIndex: index }));
}

export function reindexBioPageBlocks(blocks: BioPageBlock[]): BioPageBlock[] {
    return blocks.map((block, index) => ({ ...block, order: index }));
}

export function sortBioPageLinks(links: BioPageLink[]): BioPageLink[] {
    return [...links].sort((a, b) => (a.order ?? a.orderIndex ?? 0) - (b.order ?? b.orderIndex ?? 0));
}

export function sortBioPageBlocks(blocks: BioPageBlock[]): BioPageBlock[] {
    return [...blocks].sort((a, b) => a.order - b.order);
}

export function duplicateBioPageLinkDraft(links: BioPageLink[], linkId: string): BioPageLink[] {
    const orderedLinks = sortBioPageLinks(links);
    const sourceIndex = orderedLinks.findIndex(link => link.id === linkId);
    if (sourceIndex === -1) throw new Error(`Bio Page link "${linkId}" was not found.`);

    const source = orderedLinks[sourceIndex];
    const duplicate: BioPageLink = {
        ...source,
        id: createBioPageLocalId('bio-link'),
        title: `${source.title || 'Link'} copy`,
        clicks: 0,
        needsReview: false,
        generatedByAI: false,
        userModified: true,
        metadata: {
            ...(source.metadata || {}),
            clicks: 0,
            duplicatedFrom: source.id,
            needsReview: false,
            generatedByAI: false,
            userModified: true,
        },
    };

    return reindexBioPageLinks([
        ...orderedLinks.slice(0, sourceIndex + 1),
        duplicate,
        ...orderedLinks.slice(sourceIndex + 1),
    ]);
}

export function prioritizeBioPageLinkDraft(links: BioPageLink[], linkId: string): BioPageLink[] {
    const orderedLinks = sortBioPageLinks(links);
    const source = orderedLinks.find(link => link.id === linkId);
    if (!source) throw new Error(`Bio Page link "${linkId}" was not found.`);

    return reindexBioPageLinks([
        { ...source, userModified: true },
        ...orderedLinks.filter(link => link.id !== linkId),
    ]);
}

export function duplicateBioPageBlockDraft(blocks: BioPageBlock[], blockId: string): BioPageBlock[] {
    const orderedBlocks = sortBioPageBlocks(blocks);
    const sourceIndex = orderedBlocks.findIndex(block => block.id === blockId);
    if (sourceIndex === -1) throw new Error(`Bio Page block "${blockId}" was not found.`);

    const source = orderedBlocks[sourceIndex];
    if (isBioPageSystemBlock(source)) {
        throw new Error(`System Bio Page block "${blockId}" cannot be duplicated.`);
    }

    const duplicate: BioPageBlock = {
        ...source,
        id: createBioPageLocalId('bio-block'),
        title: `${source.title || formatBioPageBlockLabel(source.type)} copy`,
        status: source.visible === false || source.status === 'hidden' ? 'hidden' : 'configured',
        needsReview: false,
        generatedByAI: false,
        userModified: true,
        data: cloneBioPageRecord(source.data),
        settings: cloneBioPageRecord(source.settings),
    };

    return reindexBioPageBlocks([
        ...orderedBlocks.slice(0, sourceIndex + 1),
        duplicate,
        ...orderedBlocks.slice(sourceIndex + 1),
    ]);
}

export function prioritizeBioPageBlockDraft(blocks: BioPageBlock[], blockId: string): BioPageBlock[] {
    const orderedBlocks = sortBioPageBlocks(blocks);
    const source = orderedBlocks.find(block => block.id === blockId);
    if (!source) throw new Error(`Bio Page block "${blockId}" was not found.`);

    const systemBlocks = orderedBlocks.filter(block => isBioPageSystemBlock(block) && block.id !== blockId);
    const otherBlocks = orderedBlocks.filter(block => !isBioPageSystemBlock(block) && block.id !== blockId);
    const nextBlocks = isBioPageSystemBlock(source)
        ? [{ ...source, userModified: true }, ...systemBlocks, ...otherBlocks]
        : [...systemBlocks, { ...source, userModified: true }, ...otherBlocks];

    return reindexBioPageBlocks(nextBlocks);
}

export function getBioPagePublishIssues(page: BioPageData): string[] {
    const issues: string[] = [];
    if (!page.projectId) issues.push('Bio Page is missing project scope.');
    if (!page.profile?.displayName && !page.profile?.name) issues.push('Profile display name is required before publishing.');
    if (page.profile?.needsReview) issues.push('Profile still needs review.');

    page.links
        .filter(link => link.enabled !== false && link.visible !== false)
        .forEach(link => {
            const label = link.title || link.id || 'Untitled link';
            if (link.needsReview) issues.push(`Link "${label}" still needs review.`);
            if (link.linkType !== 'chatbot') {
                const sanitizedUrl = sanitizeBioUrl(link.url);
                if (!sanitizedUrl) issues.push(`Link "${label}" needs a safe URL.`);
                if (hasBioPagePublishPlaceholder(link.url)) issues.push(`Link "${label}" still uses a placeholder URL.`);
            }
        });

    page.blocks
        .filter(block => block.visible !== false && block.status !== 'hidden')
        .forEach(block => {
            const label = block.title || formatBioPageBlockLabel(block.type);
            if (block.needsReview || block.status === 'needs_review') {
                issues.push(`Block "${label}" still needs review.`);
            }
            if (block.type === 'featured_banner' || block.type === 'contact') {
                const url = typeof block.data?.url === 'string' ? block.data.url : '';
                if (url && !sanitizeBioUrl(url)) issues.push(`Block "${label}" has an unsafe URL.`);
                if (hasBioPagePublishPlaceholder(url)) issues.push(`Block "${label}" still uses a placeholder URL.`);
            }
            if (block.type === 'booking') {
                const url = typeof block.data?.url === 'string' ? block.data.url : '';
                if (url && !sanitizeBioUrl(url)) issues.push(`Block "${label}" has an unsafe booking URL.`);
                if (hasBioPagePublishPlaceholder(url)) issues.push(`Block "${label}" still uses a placeholder URL.`);
            }
            pushBioPageFormPublishIssues(block, label, issues);
            if (block.type === 'featured_media') {
                const url = typeof block.data?.url === 'string' ? block.data.url : '';
                if (!url || !sanitizeBioMediaUrl(url)) issues.push(`Block "${label}" needs a safe media URL.`);
            }
            if (block.type === 'portfolio_grid') {
                const items = Array.isArray(block.data?.items) ? block.data.items : [];
                const hasRenderableItem = items.some(item => {
                    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
                    const candidate = item as Record<string, unknown>;
                    const url = typeof candidate.url === 'string'
                        ? candidate.url
                        : typeof candidate.imageUrl === 'string'
                          ? candidate.imageUrl
                          : '';
                    return Boolean(url && sanitizeBioMediaUrl(url));
                });
                if (!hasRenderableItem) issues.push(`Block "${label}" needs at least one safe portfolio item.`);
            }
        });

    return Array.from(new Set(issues));
}

function assertBioPageReadyToPublish(page: BioPageData): void {
    const issues = getBioPagePublishIssues(page);
    if (!issues.length) return;
    throw new Error(`Bio Page is not ready to publish. ${issues.slice(0, 4).join(' ')}`);
}

export async function isBioSlugAvailable(input: {
    slug: string;
    excludePageId?: string | null;
}, client: SupabaseClient = supabase): Promise<{ ok: true; slug: string } | { ok: false; slug: string; error: string }> {
    const validation = validateBioSlug(input.slug);
    if (validation.ok === false) return validation;

    let query = client
        .from('bio_pages')
        .select('id')
        .eq('slug', validation.slug)
        .limit(1);

    if (input.excludePageId) {
        query = query.neq('id', input.excludePageId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (data) {
        return { ok: false, slug: validation.slug, error: `Bio Page slug "${validation.slug}" is already in use.` };
    }
    return { ok: true, slug: validation.slug };
}

async function assertBioSlugAvailable(input: {
    slug: string;
    excludePageId?: string | null;
}, client: SupabaseClient): Promise<string> {
    const availability = await isBioSlugAvailable(input, client);
    if (availability.ok === false) throw new Error(availability.error);
    return availability.slug;
}

export function sanitizeBioUrl(value: string): string {
    const raw = (value || '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();

    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
        return '';
    }

    if (raw.startsWith('/') || raw.startsWith('#')) return raw;
    if (/^(mailto|tel|sms):/i.test(raw)) return raw;

    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        const url = new URL(candidate);
        return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
    } catch {
        return '';
    }
}

export function sanitizeBioMediaUrl(value: string): string {
    const raw = (value || '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();

    if (
        lower.startsWith('javascript:')
        || lower.startsWith('data:')
        || lower.startsWith('vbscript:')
        || /^(mailto|tel|sms):/i.test(raw)
        || raw.startsWith('#')
    ) {
        return '';
    }

    if (raw.startsWith('//')) {
        try {
            const url = new URL(`https:${raw}`);
            return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
        } catch {
            return '';
        }
    }

    if (raw.startsWith('/')) return raw;

    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        const url = new URL(candidate);
        return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
    } catch {
        return '';
    }
}

export function normalizeLinkType(value?: string): BioPageLink['linkType'] {
    if (!value || value === 'link') return 'external';
    if (value === 'form') return 'lead_form';
    if (value === 'embed') return 'video';
    return value as BioPageLink['linkType'];
}

function isUuid(value?: string | null): boolean {
    return Boolean(value && UUID_RE.test(value));
}

function toIso(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function rowProfile(row: AnyRecord): BioPageProfile {
    const profile = (row.profile || {}) as BioPageProfile;
    return {
        ...DEFAULT_BIO_PROFILE,
        ...profile,
        name: profile.name || profile.displayName || row.title || '',
        displayName: profile.displayName || profile.name || row.title || '',
        handle: profile.handle || row.slug || '',
    };
}

function rowTheme(row: AnyRecord): BioPageTheme {
    return {
        ...DEFAULT_BIO_THEME,
        ...((row.theme || {}) as Partial<BioPageTheme>),
    };
}

function rowSettings(row: AnyRecord): BioPageSettings {
    return (row.settings || {}) as BioPageSettings;
}

function mapBlockRow(row: AnyRecord): BioPageBlock {
    return {
        id: row.id,
        type: row.type as BioPageBlockType,
        title: row.title || '',
        description: row.description || undefined,
        order: Number(row.order_index || 0),
        visible: row.visible !== false,
        status: row.visible === false ? 'hidden' : row.needs_review ? 'needs_review' : 'configured',
        sourceModule: row.source_module || undefined,
        sourceEntityId: row.source_entity_id || undefined,
        data: row.data || {},
        settings: row.settings || {},
        needsReview: row.needs_review === true,
        generatedByAI: row.generated_by_ai === true,
        userModified: row.user_modified === true,
        lockedFromRegeneration: row.locked_from_regeneration === true,
    };
}

function mapLinkRow(row: AnyRecord): BioPageLink {
    const metadata = row.metadata || {};
    return {
        id: row.id,
        title: row.title || '',
        url: row.url || '',
        enabled: row.visible !== false,
        visible: row.visible !== false,
        clicks: Number(metadata.clicks || 0),
        linkType: row.link_type || 'external',
        platform: row.platform || undefined,
        icon: row.icon || undefined,
        thumbnail: row.image_url || undefined,
        imageUrl: row.image_url || undefined,
        description: row.description || undefined,
        order: Number(row.order_index || 0),
        orderIndex: Number(row.order_index || 0),
        clickTrackingEnabled: row.click_tracking_enabled !== false,
        needsReview: metadata.needsReview === true,
        generatedByAI: metadata.generatedByAI === true,
        userModified: metadata.userModified === true,
        lockedFromRegeneration: metadata.lockedFromRegeneration === true,
        metadata,
    };
}

function mapBioPageRow(row: AnyRecord, links: BioPageLink[], blocks: BioPageBlock[]): BioPageData {
    const settings = rowSettings(row);
    const status = (row.status || 'draft') as BioPageRuntimeStatus;
    const profile = rowProfile(row);
    return {
        id: row.id,
        projectId: row.project_id,
        tenantId: row.tenant_id || null,
        userId: row.user_id || null,
        username: row.slug,
        slug: row.slug,
        title: row.title || profile.displayName || profile.name || row.slug,
        description: row.description || '',
        profile,
        theme: rowTheme(row),
        links,
        blocks: blocks.length ? blocks : createDefaultBlocks({ links, profile, settings }),
        products: [],
        emailSignupEnabled: settings.emailSignupEnabled === true,
        isPublished: status === 'published',
        status,
        seo: row.seo || {},
        settings,
        aiAssistant: settings.aiAssistant || null,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
        publishedAt: row.published_at || null,
    };
}

export function createDefaultBlocks(input: {
    links?: BioPageLink[];
    profile?: BioPageProfile;
    settings?: BioPageSettings;
}): BioPageBlock[] {
    const links = input.links || [];
    const socialLinks = links.filter(link => link.enabled !== false && link.visible !== false && link.linkType === 'social');
    const mainLinks = socialLinks.length
        ? links.filter(link => !socialLinks.some(socialLink => socialLink.id === link.id))
        : links;
    const settings = input.settings || {};
    const blocks: BioPageBlock[] = [
        {
            id: 'profile',
            type: 'profile',
            title: input.profile?.displayName || input.profile?.name || 'Profile',
            order: 0,
            visible: true,
            status: 'configured',
            data: {},
        },
        {
            id: 'links',
            type: 'link',
            title: 'Links',
            order: 1,
            visible: true,
            status: 'configured',
            data: { linkIds: mainLinks.map(link => link.id) },
        },
    ];

    if (socialLinks.length) {
        blocks.push({
            id: 'social-links',
            type: 'social_links',
            title: 'Social links',
            order: blocks.length,
            visible: true,
            status: 'configured',
            data: { linkIds: socialLinks.map(link => link.id), layout: 'icons' },
        });
    }

    if (settings.shopEnabled) {
        blocks.push({
            id: 'shop',
            type: 'product_grid',
            title: 'Shop',
            order: blocks.length,
            visible: true,
            status: 'needs_review',
            sourceModule: 'ecommerce',
            data: { productIds: [] },
            needsReview: true,
        });
    }

    if (settings.bookingEnabled) {
        blocks.push({
            id: 'booking',
            type: 'booking',
            title: 'Book',
            order: blocks.length,
            visible: true,
            status: 'needs_review',
            sourceModule: 'appointments',
            data: {},
            needsReview: true,
        });
    }

    if (settings.leadCaptureEnabled) {
        blocks.push({
            id: 'lead-capture',
            type: 'lead_form',
            title: 'Contact',
            order: blocks.length,
            visible: true,
            status: 'configured',
            sourceModule: 'crm',
            data: {
                tags: ['bio-page', 'link-in-bio'],
                fields: [
                    { id: 'name', label: 'Name', type: 'text', required: true },
                    { id: 'email', label: 'Email', type: 'email', required: true },
                    { id: 'message', label: 'Message', type: 'textarea', required: false },
                ],
                consentRequired: true,
                consentText: 'I agree to be contacted about this request.',
                successMessage: 'Thanks. We will be in touch soon.',
            },
        });
    }

    if (settings.emailSignupEnabled) {
        blocks.push({
            id: 'email-subscribe',
            type: 'email_subscribe',
            title: 'Subscribe',
            order: blocks.length,
            visible: true,
            status: 'configured',
            sourceModule: 'email-marketing',
            data: {
                audienceId: null,
                placeholder: 'Email address',
                buttonText: 'Subscribe',
                consentRequired: true,
                consentText: 'I agree to receive marketing emails.',
                successMessage: 'Thanks for subscribing.',
            },
        });
    }

    if (settings.chatbotEnabled) {
        blocks.push({
            id: 'chatbot',
            type: 'chatbot_cta',
            title: 'Chat',
            order: blocks.length,
            visible: true,
            status: 'configured',
            sourceModule: 'chatcore',
            data: {},
        });
    }

    return blocks;
}

function pagePayload(input: {
    projectId: string;
    tenantId?: string | null;
    userId: string;
    slug: string;
    title?: string;
    description?: string;
    profile?: BioPageProfile;
    theme?: BioPageTheme;
    seo?: BioPageSEO;
    settings?: BioPageSettings;
    status?: BioPageRuntimeStatus;
}): AnyRecord {
    return {
        project_id: input.projectId,
        tenant_id: input.tenantId || null,
        user_id: input.userId,
        slug: normalizeBioSlug(input.slug),
        title: input.title || input.profile?.displayName || input.profile?.name || input.slug,
        description: input.description || input.profile?.bio || '',
        profile: input.profile || DEFAULT_BIO_PROFILE,
        theme: input.theme || DEFAULT_BIO_THEME,
        seo: input.seo || {},
        settings: input.settings || {},
        status: input.status || 'draft',
        updated_at: new Date().toISOString(),
    };
}

function blockPayload(block: BioPageBlock, page: Pick<BioPageData, 'id' | 'projectId' | 'tenantId'>): AnyRecord {
    const payload: AnyRecord = {
        tenant_id: page.tenantId || null,
        project_id: page.projectId,
        bio_page_id: page.id,
        type: block.type,
        title: block.title || '',
        description: block.description || null,
        order_index: block.order || 0,
        visible: block.visible !== false,
        data: block.data || {},
        settings: block.settings || {},
        source_module: block.sourceModule || null,
        source_entity_id: block.sourceEntityId || null,
        generated_by_ai: block.generatedByAI === true,
        needs_review: block.needsReview === true || block.status === 'needs_review',
        user_modified: block.userModified === true,
        locked_from_regeneration: block.lockedFromRegeneration === true,
        updated_at: new Date().toISOString(),
    };
    if (isUuid(block.id)) payload.id = block.id;
    return payload;
}

function linkPayload(link: BioPageLink, page: Pick<BioPageData, 'id' | 'projectId' | 'tenantId'>, index: number): AnyRecord {
    const sanitizedUrl = sanitizeBioUrl(link.url);
    const payload: AnyRecord = {
        tenant_id: page.tenantId || null,
        project_id: page.projectId,
        bio_page_id: page.id,
        title: link.title || 'Link',
        url: sanitizedUrl,
        description: link.description || null,
        icon: link.icon || null,
        image_url: link.imageUrl || link.thumbnail || null,
        platform: link.platform || null,
        link_type: normalizeLinkType(link.linkType),
        order_index: link.order ?? link.orderIndex ?? index,
        visible: link.enabled !== false && link.visible !== false && Boolean(sanitizedUrl || link.linkType === 'chatbot'),
        click_tracking_enabled: link.clickTrackingEnabled !== false,
        metadata: {
            ...(link.metadata || {}),
            clicks: link.clicks || 0,
            needsReview: link.needsReview === true,
            generatedByAI: link.generatedByAI === true,
            userModified: link.userModified === true,
            lockedFromRegeneration: link.lockedFromRegeneration === true,
            legacyId: isUuid(link.id) ? undefined : link.id,
        },
        updated_at: new Date().toISOString(),
    };
    if (isUuid(link.id)) payload.id = link.id;
    return payload;
}

async function loadPageChildren(client: SupabaseClient, pageId: string) {
    const [{ data: linkRows, error: linksError }, { data: blockRows, error: blocksError }] = await Promise.all([
        client.from('bio_page_links').select('*').eq('bio_page_id', pageId).order('order_index', { ascending: true }),
        client.from('bio_page_blocks').select('*').eq('bio_page_id', pageId).order('order_index', { ascending: true }),
    ]);
    if (linksError) throw linksError;
    if (blocksError) throw blocksError;
    return {
        links: (linkRows || []).map(mapLinkRow),
        blocks: (blockRows || []).map(mapBlockRow),
    };
}

export async function getBioPageByProject(projectId: string, client: SupabaseClient = supabase): Promise<BioPageData | null> {
    const { data, error } = await client
        .from('bio_pages')
        .select('*')
        .eq('project_id', projectId)
        .neq('status', 'archived')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const children = await loadPageChildren(client, data.id);
    return mapBioPageRow(data, children.links, children.blocks);
}

export async function getBioPageById(pageId: string, client: SupabaseClient = supabase): Promise<BioPageData | null> {
    const { data, error } = await client.from('bio_pages').select('*').eq('id', pageId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const children = await loadPageChildren(client, data.id);
    return mapBioPageRow(data, children.links, children.blocks);
}

export async function createBioPageDraft(input: {
    projectId: string;
    tenantId?: string | null;
    userId: string;
    slug: string;
    profile?: BioPageProfile;
    theme?: BioPageTheme;
    links?: BioPageLink[];
    blocks?: BioPageBlock[];
    seo?: BioPageSEO;
    settings?: BioPageSettings;
}, client: SupabaseClient = supabase): Promise<BioPageData> {
    const validation = validateBioSlug(input.slug);
    if (!validation.ok) {
        throw new Error('error' in validation ? validation.error : 'Invalid bio page slug.');
    }
    const safeSlug = await assertBioSlugAvailable({ slug: validation.slug }, client);

    const { data: pageRow, error } = await client
        .from('bio_pages')
        .insert(pagePayload({
            projectId: input.projectId,
            tenantId: input.tenantId,
            userId: input.userId,
            slug: safeSlug,
            profile: input.profile,
            theme: input.theme,
            seo: input.seo,
            settings: input.settings,
            status: 'draft',
        }))
        .select('*')
        .single();

    if (error) {
        if (isBioSlugConflictError(error)) throw bioSlugTakenError(safeSlug);
        throw error;
    }

    const page = mapBioPageRow(pageRow, [], []);
    const links = input.links || [];
    const blocks = input.blocks?.length ? input.blocks : createDefaultBlocks({ links, profile: page.profile, settings: page.settings });
    await replaceBioPageChildren(page, { links, blocks }, client);
    return (await getBioPageById(page.id, client)) || page;
}

export async function updateBioPageDraft(input: {
    page: BioPageData;
    slug?: string;
    profile: BioPageProfile;
    theme: BioPageTheme;
    links: BioPageLink[];
    blocks?: BioPageBlock[];
    products?: BioPageProduct[];
    emailSignupEnabled?: boolean;
    seo?: BioPageSEO;
    settings?: BioPageSettings;
}, client: SupabaseClient = supabase): Promise<BioPageData> {
    const settings = {
        ...(input.page.settings || {}),
        ...(input.settings || {}),
        emailSignupEnabled: input.emailSignupEnabled === true,
    };
    const slugValidation = validateBioSlug(input.slug || input.page.slug || input.page.username);
    if (!slugValidation.ok) {
        throw new Error('error' in slugValidation ? slugValidation.error : 'Invalid bio page slug.');
    }
    const safeSlug = await assertBioSlugAvailable({
        slug: slugValidation.slug,
        excludePageId: input.page.id,
    }, client);

    const { error } = await client
        .from('bio_pages')
        .update(pagePayload({
            projectId: input.page.projectId,
            tenantId: input.page.tenantId,
            userId: input.page.userId || '',
            slug: safeSlug,
            title: input.profile.displayName || input.profile.name || input.page.title,
            description: input.profile.bio || input.page.description,
            profile: input.profile,
            theme: input.theme,
            seo: input.seo || input.page.seo,
            settings,
            status: input.page.status === 'published' ? 'published' : 'draft',
        }))
        .eq('id', input.page.id);

    if (error) {
        if (isBioSlugConflictError(error)) throw bioSlugTakenError(safeSlug);
        throw error;
    }

    const blocks = input.blocks?.length
        ? input.blocks
        : createDefaultBlocks({ links: input.links, profile: input.profile, settings });
    await replaceBioPageChildren(input.page, { links: input.links, blocks }, client);
    return (await getBioPageById(input.page.id, client)) || input.page;
}

async function saveBioPageStructure(
    page: BioPageData,
    input: { links?: BioPageLink[]; blocks?: BioPageBlock[]; profile?: BioPageProfile; theme?: BioPageTheme },
    client: SupabaseClient,
): Promise<BioPageData> {
    return updateBioPageDraft({
        page,
        profile: input.profile || page.profile,
        theme: input.theme || page.theme,
        links: input.links || page.links,
        blocks: input.blocks || page.blocks,
        seo: page.seo,
        settings: page.settings,
        emailSignupEnabled: page.emailSignupEnabled,
    }, client);
}

export async function updateBioPageProfile(
    page: BioPageData,
    profile: BioPageProfile,
    client: SupabaseClient = supabase,
): Promise<BioPageData> {
    return saveBioPageStructure(page, { profile: { ...profile, userModified: true } }, client);
}

export async function updateBioPageTheme(
    page: BioPageData,
    theme: BioPageTheme,
    client: SupabaseClient = supabase,
): Promise<BioPageData> {
    return saveBioPageStructure(page, { theme }, client);
}

export async function createBioPageBlock(
    page: BioPageData,
    blockInput: BioPageBlockInput,
    client: SupabaseClient = supabase,
): Promise<BioPageData> {
    const block: BioPageBlock = {
        id: blockInput.id || createBioPageLocalId('bio-block'),
        type: blockInput.type,
        title: blockInput.title,
        description: blockInput.description,
        order: blockInput.order ?? nextBioPageOrder(page.blocks),
        visible: blockInput.visible !== false,
        status: blockInput.status || (blockInput.needsReview ? 'needs_review' : 'configured'),
        sourceModule: blockInput.sourceModule,
        sourceEntityId: blockInput.sourceEntityId,
        data: blockInput.data || {},
        settings: blockInput.settings || {},
        needsReview: blockInput.needsReview,
        generatedByAI: blockInput.generatedByAI,
        userModified: blockInput.userModified ?? true,
        lockedFromRegeneration: blockInput.lockedFromRegeneration,
    };
    return saveBioPageStructure(page, { blocks: [...page.blocks, block] }, client);
}

export async function updateBioPageBlock(
    page: BioPageData,
    blockId: string,
    patch: Partial<Omit<BioPageBlock, 'id'>>,
    client: SupabaseClient = supabase,
): Promise<BioPageData> {
    let found = false;
    const blocks = page.blocks.map(block => {
        if (block.id !== blockId) return block;
        found = true;
        return {
            ...block,
            ...patch,
            id: block.id,
            userModified: patch.userModified ?? true,
        };
    });
    if (!found) throw new Error(`Bio Page block "${blockId}" was not found.`);
    return saveBioPageStructure(page, { blocks }, client);
}

export async function deleteBioPageBlock(
    page: BioPageData,
    blockId: string,
    client: SupabaseClient = supabase,
): Promise<BioPageData> {
    if (!page.blocks.some(block => block.id === blockId)) throw new Error(`Bio Page block "${blockId}" was not found.`);
    return saveBioPageStructure(page, { blocks: page.blocks.filter(block => block.id !== blockId) }, client);
}

export async function toggleBlockVisibility(
    page: BioPageData,
    blockId: string,
    visible: boolean,
    client: SupabaseClient = supabase,
): Promise<BioPageData> {
    return updateBioPageBlock(page, blockId, {
        visible,
        status: visible ? 'configured' : 'hidden',
    }, client);
}

export async function duplicateBioPageBlock(
    page: BioPageData,
    blockId: string,
    client: SupabaseClient = supabase,
): Promise<BioPageData> {
    return saveBioPageStructure(page, { blocks: duplicateBioPageBlockDraft(page.blocks, blockId) }, client);
}

export async function prioritizeBioPageBlock(
    page: BioPageData,
    blockId: string,
    client: SupabaseClient = supabase,
): Promise<BioPageData> {
    return saveBioPageStructure(page, { blocks: prioritizeBioPageBlockDraft(page.blocks, blockId) }, client);
}

export async function createBioPageLink(
    page: BioPageData,
    linkInput: BioPageLinkInput,
    client: SupabaseClient = supabase,
): Promise<BioPageData> {
    const link: BioPageLink = {
        id: linkInput.id || createBioPageLocalId('bio-link'),
        title: linkInput.title,
        url: linkInput.url,
        enabled: linkInput.enabled !== false,
        visible: linkInput.visible !== false,
        clicks: linkInput.clicks || 0,
        linkType: linkInput.linkType || 'external',
        platform: linkInput.platform,
        icon: linkInput.icon,
        thumbnail: linkInput.thumbnail,
        imageUrl: linkInput.imageUrl,
        description: linkInput.description,
        order: linkInput.order ?? linkInput.orderIndex ?? nextBioPageOrder(page.links),
        orderIndex: linkInput.orderIndex,
        openInNewTab: linkInput.openInNewTab,
        clickTrackingEnabled: linkInput.clickTrackingEnabled !== false,
        needsReview: linkInput.needsReview,
        generatedByAI: linkInput.generatedByAI,
        userModified: linkInput.userModified ?? true,
        lockedFromRegeneration: linkInput.lockedFromRegeneration,
        metadata: linkInput.metadata,
    };
    return saveBioPageStructure(page, { links: [...page.links, link] }, client);
}

export async function updateBioPageLink(
    page: BioPageData,
    linkId: string,
    patch: Partial<Omit<BioPageLink, 'id'>>,
    client: SupabaseClient = supabase,
): Promise<BioPageData> {
    let found = false;
    const links = page.links.map(link => {
        if (link.id !== linkId) return link;
        found = true;
        return {
            ...link,
            ...patch,
            id: link.id,
            userModified: patch.userModified ?? true,
        };
    });
    if (!found) throw new Error(`Bio Page link "${linkId}" was not found.`);
    return saveBioPageStructure(page, { links }, client);
}

export async function deleteBioPageLink(
    page: BioPageData,
    linkId: string,
    client: SupabaseClient = supabase,
): Promise<BioPageData> {
    if (!page.links.some(link => link.id === linkId)) throw new Error(`Bio Page link "${linkId}" was not found.`);
    return saveBioPageStructure(page, { links: page.links.filter(link => link.id !== linkId) }, client);
}

export async function toggleLinkVisibility(
    page: BioPageData,
    linkId: string,
    visible: boolean,
    client: SupabaseClient = supabase,
): Promise<BioPageData> {
    return updateBioPageLink(page, linkId, {
        enabled: visible,
        visible,
    }, client);
}

export async function duplicateBioPageLink(
    page: BioPageData,
    linkId: string,
    client: SupabaseClient = supabase,
): Promise<BioPageData> {
    return saveBioPageStructure(page, { links: duplicateBioPageLinkDraft(page.links, linkId) }, client);
}

export async function prioritizeBioPageLink(
    page: BioPageData,
    linkId: string,
    client: SupabaseClient = supabase,
): Promise<BioPageData> {
    return saveBioPageStructure(page, { links: prioritizeBioPageLinkDraft(page.links, linkId) }, client);
}

async function replaceBioPageChildren(
    page: Pick<BioPageData, 'id' | 'projectId' | 'tenantId'>,
    input: { links: BioPageLink[]; blocks: BioPageBlock[] },
    client: SupabaseClient,
): Promise<void> {
    const [{ error: linksDeleteError }, { error: blocksDeleteError }] = await Promise.all([
        client.from('bio_page_links').delete().eq('bio_page_id', page.id),
        client.from('bio_page_blocks').delete().eq('bio_page_id', page.id),
    ]);
    if (linksDeleteError) throw linksDeleteError;
    if (blocksDeleteError) throw blocksDeleteError;

    const blockRows = input.blocks
        .sort((a, b) => a.order - b.order)
        .map(block => blockPayload(block, page));
    if (blockRows.length) {
        const { error } = await client.from('bio_page_blocks').insert(blockRows);
        if (error) throw error;
    }

    const linkRows = input.links
        .sort((a, b) => (a.order ?? a.orderIndex ?? 0) - (b.order ?? b.orderIndex ?? 0))
        .map((link, index) => linkPayload(link, page, index));
    if (linkRows.length) {
        const { error } = await client.from('bio_page_links').insert(linkRows);
        if (error) throw error;
    }
}

export async function publishBioPage(pageId: string, client: SupabaseClient = supabase): Promise<BioPageData> {
    const currentPage = await getBioPageById(pageId, client);
    if (!currentPage) throw new Error('Bio page not found before publish.');
    await assertBioSlugAvailable({ slug: currentPage.slug, excludePageId: pageId }, client);
    assertBioPageReadyToPublish(currentPage);

    const { error } = await client
        .from('bio_pages')
        .update({
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', pageId);
    if (error) throw error;
    const page = await getBioPageById(pageId, client);
    if (!page) throw new Error('Bio page not found after publish.');
    return page;
}

export async function unpublishBioPage(pageId: string, client: SupabaseClient = supabase): Promise<void> {
    const { error } = await client
        .from('bio_pages')
        .update({ status: 'draft', published_at: null, updated_at: new Date().toISOString() })
        .eq('id', pageId);
    if (error) throw error;
}

export async function archiveBioPage(pageId: string, client: SupabaseClient = supabase): Promise<void> {
    const { error } = await client
        .from('bio_pages')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', pageId);
    if (error) throw error;
}

export async function reorderBioPageBlocks(page: BioPageData, blockIds: string[], client: SupabaseClient = supabase): Promise<void> {
    const order = new Map(blockIds.map((id, index) => [id, index]));
    const nextBlocks = page.blocks.map(block => ({ ...block, order: order.get(block.id) ?? block.order }));
    await replaceBioPageChildren(page, { links: page.links, blocks: nextBlocks }, client);
}

export async function reorderBioPageLinks(page: BioPageData, linkIds: string[], client: SupabaseClient = supabase): Promise<void> {
    const order = new Map(linkIds.map((id, index) => [id, index]));
    const nextLinks = page.links.map(link => ({ ...link, order: order.get(link.id) ?? link.order ?? 0 }));
    await replaceBioPageChildren(page, { links: nextLinks, blocks: page.blocks }, client);
}

export function createBioPageFromBlueprint(input: {
    projectId: string;
    tenantId?: string | null;
    userId: string;
    blueprint: BioPageBlueprint;
}): Omit<Parameters<typeof createBioPageDraft>[0], 'projectId' | 'tenantId' | 'userId'> {
    const blueprint = input.blueprint;
    const profile: BioPageProfile = {
        name: blueprint.profile.displayName,
        displayName: blueprint.profile.displayName,
        handle: blueprint.profile.handle,
        bio: blueprint.profile.bio,
        avatarUrl: blueprint.profile.avatarUrl,
        coverImageUrl: blueprint.profile.coverImageUrl,
        category: blueprint.profile.category,
        location: blueprint.profile.location,
        verifiedBadgeEnabled: blueprint.profile.verifiedBadgeEnabled,
    };

    const theme: BioPageTheme = {
        ...DEFAULT_BIO_THEME,
        preset: blueprint.theme.layoutVariant,
        layoutVariant: blueprint.theme.layoutVariant,
        backgroundType: blueprint.theme.backgroundType === 'glass' ? 'blur' : blueprint.theme.backgroundType,
        backgroundColor: blueprint.theme.colors.background || DEFAULT_BIO_THEME.backgroundColor,
        gradientColor: blueprint.theme.colors.secondary || DEFAULT_BIO_THEME.gradientColor,
        buttonStyle: blueprint.theme.buttonStyle === 'solid' ? 'fill' : blueprint.theme.buttonStyle,
        buttonColor: blueprint.theme.colors.primary || DEFAULT_BIO_THEME.buttonColor,
        buttonTextColor: blueprint.theme.colors.text || DEFAULT_BIO_THEME.buttonTextColor,
        textColor: blueprint.theme.colors.text || DEFAULT_BIO_THEME.textColor,
        titleColor: blueprint.theme.colors.text || DEFAULT_BIO_THEME.titleColor,
        bodyColor: blueprint.theme.colors.text || DEFAULT_BIO_THEME.bodyColor,
        titleFont: blueprint.theme.typography.heading || DEFAULT_BIO_THEME.titleFont,
        bodyFont: blueprint.theme.typography.body || DEFAULT_BIO_THEME.bodyFont,
        cardRadius: blueprint.theme.cardRadius,
        showQuimeraFooter: blueprint.theme.showQuimeraFooter,
    };

    return {
        slug: blueprint.publicSlug,
        profile,
        theme,
        seo: blueprint.seo,
        settings: {
            emailSignupEnabled: blueprint.emailSubscribe.enabled,
            leadCaptureEnabled: blueprint.leadCapture.enabled,
            chatbotEnabled: blueprint.chatbot.enabled,
            shopEnabled: blueprint.shop.enabled,
            bookingEnabled: blueprint.booking.enabled,
            showQuimeraFooter: blueprint.theme.showQuimeraFooter,
        },
        links: blueprint.links.map((link, index) => ({
            id: link.id,
            title: link.title,
            url: link.url,
            enabled: link.visible,
            visible: link.visible,
            clicks: 0,
            linkType: link.linkType,
            platform: link.platform,
            icon: link.icon,
            imageUrl: link.imageUrl,
            description: link.description,
            openInNewTab: link.openInNewTab,
            order: index,
            clickTrackingEnabled: link.clickTrackingEnabled,
            needsReview: link.needsReview,
            generatedByAI: link.generatedByAI,
            userModified: link.userModified,
            lockedFromRegeneration: link.lockedFromRegeneration,
        })),
        blocks: blueprint.blocks.map(block => ({
            id: block.id,
            type: block.type,
            title: block.title,
            description: block.description,
            order: block.order,
            visible: block.visible,
            status: block.status,
            sourceModule: block.sourceModule,
            sourceEntityId: block.sourceEntityId,
            data: block.data,
            settings: block.settings,
            needsReview: block.needsReview,
            generatedByAI: block.generatedByAI,
            userModified: block.userModified,
            lockedFromRegeneration: block.lockedFromRegeneration,
        })),
    };
}
