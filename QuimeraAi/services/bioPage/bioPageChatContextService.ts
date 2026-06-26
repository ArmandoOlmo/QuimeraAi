import type { BioPageBlock, BioPageData, BioPageLink, BioPageProduct } from './bioPageTypes';

const MAX_LINKS = 20;
const MAX_BLOCKS = 20;
const MAX_PRODUCTS = 12;
const MAX_TEXT_LENGTH = 320;

export interface BioPageChatContext {
    section: 'bioPage';
    visibleSections: string[];
    pageData: {
        bioPage: {
            sourceModule: 'bio-page-engine';
            pageId: string;
            projectId: string;
            slug: string;
            title?: string;
            description?: string;
            activeBlockId?: string | null;
            profile: {
                displayName: string;
                handle?: string;
                bio?: string;
                category?: string;
                location?: string;
            };
            integrations: {
                shopEnabled: boolean;
                bookingEnabled: boolean;
                leadCaptureEnabled: boolean;
                emailSignupEnabled: boolean;
                chatbotEnabled: boolean;
            };
            links: Array<{
                id: string;
                title: string;
                url: string;
                linkType?: string;
                platform?: string;
                description?: string;
            }>;
            blocks: Array<{
                id: string;
                type: string;
                title: string;
                description?: string;
                sourceModule?: string;
                data: Record<string, unknown>;
            }>;
            products: Array<{
                id: string;
                name: string;
                price?: number;
                url?: string;
                status?: string;
            }>;
        };
    };
}

const truncate = (value: unknown, max = MAX_TEXT_LENGTH): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const text = value.trim();
    if (!text) return undefined;
    return text.length > max ? `${text.slice(0, max)}...` : text;
};

const readStringArray = (value: unknown, max = 8): string[] => (
    Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).slice(0, max)
        : []
);

const readRecordArray = (value: unknown, max = 8): Array<Record<string, unknown>> => (
    Array.isArray(value)
        ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)).slice(0, max)
        : []
);

function sanitizeBlockData(block: BioPageBlock, visibleLinkIds: Set<string>): Record<string, unknown> {
    const data = block.data || {};

    switch (block.type) {
        case 'booking':
            return {
                bookingMode: truncate(data.bookingMode, 80),
                durationMinutes: typeof data.durationMinutes === 'number' ? data.durationMinutes : undefined,
                serviceIds: readStringArray(data.serviceIds),
                services: readRecordArray(data.services, 5).map(service => ({
                    id: truncate(service.id, 120),
                    name: truncate(service.name, 160),
                    durationMinutes: typeof service.durationMinutes === 'number' ? service.durationMinutes : undefined,
                })),
                url: truncate(data.url, 500),
            };
        case 'lead_form':
            return {
                fields: readRecordArray(data.fields, 8).map(field => ({
                    id: truncate(field.id, 120),
                    label: truncate(field.label, 120),
                    type: truncate(field.type, 60),
                    required: field.required === true,
                })),
                tags: readStringArray(data.tags, 8),
                consentRequired: data.consentRequired === true,
            };
        case 'email_subscribe':
            return {
                placeholder: truncate(data.placeholder, 120),
                buttonText: truncate(data.buttonText, 120),
                consentRequired: data.consentRequired !== false,
                doubleOptIn: data.doubleOptIn === true,
            };
        case 'product_grid':
        case 'product_collection':
            return {
                productIds: readStringArray(data.productIds, 12),
                collectionIds: readStringArray(data.collectionIds, 8),
                showPrices: data.showPrices !== false,
            };
        case 'featured_media':
        case 'featured_banner':
            return {
                headline: truncate(data.headline || data.title, 180),
                subtitle: truncate(data.subtitle || data.description, 240),
                mediaType: truncate(data.mediaType, 80),
                url: truncate(data.url, 500),
                ctaLabel: truncate(data.ctaLabel, 120),
            };
        case 'portfolio_grid':
            return {
                items: readRecordArray(data.items, 9).map(item => ({
                    title: truncate(item.title, 160),
                    description: truncate(item.description, 240),
                    href: truncate(item.href, 500),
                    type: truncate(item.type, 80),
                })),
            };
        case 'testimonials':
            return {
                items: readRecordArray(data.items, 6)
                    .filter(item => typeof item.quote === 'string' && item.quote.trim())
                    .map(item => ({
                        quote: truncate(item.quote, 280),
                        author: truncate(item.author, 140),
                        role: truncate(item.role, 140),
                        rating: typeof item.rating === 'number' ? Math.min(Math.max(item.rating, 1), 5) : undefined,
                    })),
            };
        case 'faq':
            return {
                items: readRecordArray(data.items, 8).map(item => ({
                    question: truncate(item.question, 220),
                    answer: truncate(item.answer, 320),
                })),
            };
        case 'social_links':
            return {
                linkIds: readStringArray(data.linkIds, 12).filter(id => visibleLinkIds.has(id)),
                layout: truncate(data.layout, 80) || 'icons',
            };
        case 'chatbot_cta':
        case 'contact':
        case 'link':
        case 'profile':
        case 'divider':
        case 'spacer':
        case 'custom_html_placeholder':
        default:
            return {
                text: truncate(data.text || data.content || data.label, 240),
                url: truncate(data.url, 500),
            };
    }
}

const summarizeLink = (link: BioPageLink) => ({
    id: link.id,
    title: truncate(link.title, 160) || 'Link',
    url: link.url,
    linkType: link.linkType,
    platform: link.platform,
    description: truncate(link.description, 220),
});

const summarizeProduct = (product: BioPageProduct) => ({
    id: product.id,
    name: truncate(product.name, 180) || 'Product',
    price: typeof product.price === 'number' ? product.price : undefined,
    url: product.url,
    status: product.status,
});

export function buildBioPageChatContext(
    page: BioPageData,
    options: { activeBlockId?: string | null } = {},
): BioPageChatContext {
    const visibleLinks = (page.links || [])
        .filter(link => link.enabled !== false && link.visible !== false)
        .slice(0, MAX_LINKS)
        .map(summarizeLink);
    const visibleLinkIds = new Set(visibleLinks.map(link => link.id));
    const visibleBlocks = (page.blocks || [])
        .filter(block => block.visible !== false)
        .sort((a, b) => a.order - b.order)
        .slice(0, MAX_BLOCKS)
        .map(block => ({
            id: block.id,
            type: block.type,
            title: truncate(block.title, 180) || block.type,
            description: truncate(block.description, 240),
            sourceModule: block.sourceModule,
            data: sanitizeBlockData(block, visibleLinkIds),
        }));
    const visibleBlockTypes = new Set(visibleBlocks.map(block => block.type));

    return {
        section: 'bioPage',
        visibleSections: ['bioPage'],
        pageData: {
            bioPage: {
                sourceModule: 'bio-page-engine',
                pageId: page.id,
                projectId: page.projectId,
                slug: page.slug,
                title: truncate(page.title, 180),
                description: truncate(page.description || page.profile.bio, 320),
                activeBlockId: options.activeBlockId ?? null,
                profile: {
                    displayName: page.profile.displayName || page.profile.name || page.title || page.slug,
                    handle: page.profile.handle || page.slug,
                    bio: truncate(page.profile.bio, 320),
                    category: truncate(page.profile.category, 120),
                    location: truncate(page.profile.location, 160),
                },
                integrations: {
                    shopEnabled: page.settings?.shopEnabled === true || visibleBlockTypes.has('product_grid') || visibleBlockTypes.has('product_collection'),
                    bookingEnabled: page.settings?.bookingEnabled === true || visibleBlockTypes.has('booking'),
                    leadCaptureEnabled: page.settings?.leadCaptureEnabled === true || visibleBlockTypes.has('lead_form'),
                    emailSignupEnabled: page.emailSignupEnabled === true || page.settings?.emailSignupEnabled === true || visibleBlockTypes.has('email_subscribe'),
                    chatbotEnabled: page.settings?.chatbotEnabled === true || Boolean(page.aiAssistant) || visibleBlockTypes.has('chatbot_cta'),
                },
                links: visibleLinks,
                blocks: visibleBlocks,
                products: (page.products || []).slice(0, MAX_PRODUCTS).map(summarizeProduct),
            },
        },
    };
}
