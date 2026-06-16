import type { GlobalColors, ThemeData } from '../types/ui';
import type { Lead, LeadStatus } from '../types/business';
import type {
    RealtyAiGeneration,
    RealtyImage,
    RealtyLead,
    RealtyModuleFlags,
    RealtyProperty,
    RealtyPropertyStatus,
    RealtyPropertyType,
    RealtyWebsiteColorConfig,
} from '../types/realty';
import { normalizeLeadStatus } from './leadData';

export const DEFAULT_REALTY_FLAGS: RealtyModuleFlags = {
    real_estate_enabled: true,
    real_estate_ai_enabled: true,
    real_estate_public_directory_enabled: true,
};

export const REALTY_PROPERTY_POST_TAG = 'realty:property';
export const REALTY_AI_POST_TAG = 'realty:ai-generation';
export const REALTY_LEAD_TAG = 'realty';
export const REALTY_LEAD_SOURCE = 'realty-website';
export const REALTY_POST_CONTENT_PREFIX = 'quimera-realty-property:';
export const REALTY_AI_CONTENT_PREFIX = 'quimera-realty-ai:';
export const PROJECT_TAG_PREFIX = 'project:';

export const realtyPropertyTypes: RealtyPropertyType[] = ['house', 'condo', 'apartment', 'townhouse', 'land', 'commercial'];
export const realtyPropertyStatuses: RealtyPropertyStatus[] = ['draft', 'active', 'pending', 'sold', 'archived'];
export const realtyLeadStatuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'];

export const toRealtySlug = (value: string): string =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 90) || 'property';

export const formatRealtyPrice = (value: number, locale: string, currency = 'USD'): string =>
    new Intl.NumberFormat(locale?.startsWith('en') ? 'en-US' : 'es-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(value || 0);

export const colorWithAlpha = (color: string | undefined, alpha: number, fallback = 'rgba(79, 70, 229, 0.1)'): string => {
    if (!color) return fallback;
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        const normalized = hex.length === 3 ? hex.split('').map(char => char + char).join('') : hex;
        if (normalized.length === 6) {
            const r = parseInt(normalized.slice(0, 2), 16);
            const g = parseInt(normalized.slice(2, 4), 16);
            const b = parseInt(normalized.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }
    if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    return color;
};

const contrastText = (background?: string, light = '#ffffff', dark = '#111827'): string => {
    if (!background || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(background)) return light;
    const hex = background.length === 4
        ? background.slice(1).split('').map(char => char + char).join('')
        : background.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.58 ? dark : light;
};

export const resolveRealtyWebsiteColors = (
    componentColors?: RealtyWebsiteColorConfig,
    globalColors?: Partial<GlobalColors> | Record<string, string>,
    theme?: ThemeData
): Required<RealtyWebsiteColorConfig> => {
    const c = componentColors || {};
    const g = globalColors || theme?.globalColors || {};
    const background = c.background || g.background || theme?.pageBackground || '#ffffff';
    const surface = c.surface || c.cardBackground || g.surface || '#ffffff';
    const primary = c.primary || g.primary || '#4f46e5';
    const secondary = c.secondary || g.secondary || '#10b981';
    const accent = c.accent || g.accent || primary;
    const heading = c.heading || c.cardHeading || g.heading || g.text || '#111827';
    const text = c.text || c.cardText || g.text || '#374151';
    const textMuted = c.textMuted || g.textMuted || g.text || '#6b7280';
    const border = c.border || g.border || 'rgba(148, 163, 184, 0.32)';
    const buttonBackground = c.buttonBackground || primary;

    return {
        background,
        surface,
        primary,
        secondary,
        accent,
        heading,
        text,
        textMuted,
        border,
        success: c.success || g.success || '#16a34a',
        error: c.error || g.error || '#dc2626',
        cardBackground: c.cardBackground || surface,
        cardHeading: c.cardHeading || heading,
        cardText: c.cardText || text,
        buttonBackground,
        buttonText: c.buttonText || contrastText(buttonBackground),
        badgeBackground: c.badgeBackground || accent,
        badgeText: c.badgeText || contrastText(accent),
        priceColor: c.priceColor || accent,
    };
};

const getProjectTag = (projectId: string) => `${PROJECT_TAG_PREFIX}${projectId}`;

const extractProjectIdFromTags = (tags: string[] = []) =>
    tags.find(tag => tag.startsWith(PROJECT_TAG_PREFIX))?.slice(PROJECT_TAG_PREFIX.length) || '';

const parsePrefixedJson = <T>(value: string | null | undefined, prefix: string): Partial<T> => {
    if (!value || !value.startsWith(prefix)) return {};
    try {
        return JSON.parse(value.slice(prefix.length).trim()) as Partial<T>;
    } catch {
        return {};
    }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const stringMeta = (value: unknown) => typeof value === 'string' ? value : '';

const numberMeta = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

export const normalizeRealtyLeadStatus = (status: unknown): LeadStatus => normalizeLeadStatus(status);

export const isRealtyCrmLead = (lead: Pick<Lead, 'source' | 'tags' | 'metadata'>): boolean => {
    const metadata = isRecord(lead.metadata) ? lead.metadata : {};
    return lead.source === REALTY_LEAD_SOURCE
        || (lead.tags || []).includes(REALTY_LEAD_TAG)
        || metadata.realtyLead === true
        || Boolean(metadata.realtyPropertyId || metadata.propertyId || metadata.realtyPropertySlug || metadata.propertySlug);
};

export const mapCrmLeadToRealtyLead = (lead: Lead): RealtyLead => {
    const metadata = isRecord(lead.metadata) ? lead.metadata : {};
    const propertyId = stringMeta(metadata.realtyPropertyId)
        || stringMeta(metadata.propertyId)
        || (lead.tags || []).find(tag => tag.startsWith('property:'))?.slice('property:'.length)
        || null;
    const budget = numberMeta(metadata.budget) ?? lead.value;

    return {
        id: lead.id,
        projectId: lead.projectId,
        propertyId,
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        message: lead.message || lead.notes || '',
        preferredDate: stringMeta(metadata.preferredDate),
        budget,
        status: normalizeRealtyLeadStatus(lead.status),
        source: lead.source === 'manual'
            ? 'manual'
            : lead.source === 'import-csv' || lead.source === 'import-excel' || lead.source === 'library-import'
                ? 'import'
                : lead.source === 'quimera-chat' || lead.source === 'chatbot' || lead.source === 'chatbot-widget' || lead.source === 'landing-chatbot'
                    ? 'ai'
                    : 'website',
        metadata: {
            ...metadata,
            propertyTitle: stringMeta(metadata.realtyPropertyTitle) || stringMeta(metadata.propertyTitle),
            sourceLeadId: lead.id,
        },
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt || lead.createdAt,
    };
};

export const serializeRealtyPropertyContent = (property: Partial<RealtyProperty>): string =>
    `${REALTY_POST_CONTENT_PREFIX}${JSON.stringify({
        version: 1,
        description: property.description || '',
        price: property.price || 0,
        currency: property.currency || 'USD',
        address: property.address || '',
        city: property.city || '',
        state: property.state || '',
        country: property.country || '',
        zipCode: property.zipCode || '',
        propertyType: property.propertyType || 'house',
        status: property.status || 'draft',
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        area: property.area || 0,
        areaUnit: property.areaUnit || 'sqft',
        lotSize: property.lotSize || null,
        parkingSpaces: property.parkingSpaces || null,
        yearBuilt: property.yearBuilt || null,
        latitude: property.latitude ?? null,
        longitude: property.longitude ?? null,
        amenities: property.amenities || [],
        images: property.images || [],
        videoUrl: property.videoUrl || '',
        virtualTourUrl: property.virtualTourUrl || '',
        metadata: property.metadata || {},
    })}`;

export const serializeRealtyAiContent = (generation: Omit<RealtyAiGeneration, 'id' | 'createdAt'>): string =>
    `${REALTY_AI_CONTENT_PREFIX}${JSON.stringify({
        version: 1,
        propertyId: generation.propertyId || null,
        kind: generation.kind,
        prompt: generation.prompt,
        output: generation.output,
        metadata: generation.metadata || {},
    })}`;

export const mapRealtyPostRow = (row: any): RealtyProperty => {
    const payload = parsePrefixedJson<RealtyProperty>(row.content, REALTY_POST_CONTENT_PREFIX);
    const images = Array.isArray(payload.images) ? payload.images : [];
    const featuredImage = row.featured_image
        ? [{ id: 'featured-image', url: row.featured_image, altText: row.title || '', position: 0 }, ...images.filter(image => image.url !== row.featured_image)]
        : images;

    return {
        id: row.id,
        tenantId: row.tenant_id ?? null,
        projectId: payload.projectId || extractProjectIdFromTags(row.tags || []),
        createdBy: row.user_id ?? payload.createdBy ?? null,
        title: row.title || '',
        slug: row.slug || toRealtySlug(row.title || row.id || 'property'),
        description: payload.description || row.excerpt || '',
        price: Number(payload.price || 0),
        currency: payload.currency || 'USD',
        address: payload.address || '',
        city: payload.city || '',
        state: payload.state || '',
        country: payload.country || '',
        zipCode: payload.zipCode || '',
        propertyType: (payload.propertyType || 'house') as RealtyPropertyType,
        status: (payload.status || (row.status === 'published' ? 'active' : 'draft')) as RealtyPropertyStatus,
        bedrooms: Number(payload.bedrooms || 0),
        bathrooms: Number(payload.bathrooms || 0),
        area: Number(payload.area || 0),
        areaUnit: payload.areaUnit || 'sqft',
        lotSize: payload.lotSize ? Number(payload.lotSize) : undefined,
        parkingSpaces: payload.parkingSpaces ? Number(payload.parkingSpaces) : undefined,
        yearBuilt: payload.yearBuilt ? Number(payload.yearBuilt) : undefined,
        latitude: payload.latitude === null || payload.latitude === undefined ? undefined : Number(payload.latitude),
        longitude: payload.longitude === null || payload.longitude === undefined ? undefined : Number(payload.longitude),
        amenities: Array.isArray(payload.amenities) ? payload.amenities : [],
        images: featuredImage,
        videoUrl: payload.videoUrl || '',
        virtualTourUrl: payload.virtualTourUrl || '',
        isFeatured: Boolean(row.is_featured),
        publishedAt: row.published_at,
        metadata: payload.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};

export const mapRealtyLeadRow = (row: any): RealtyLead => {
    const customData = isRecord(row.custom_data) ? row.custom_data : {};
    const metadata = isRecord(row.metadata) ? row.metadata : {};
    const mergedMetadata = { ...customData, ...metadata };
    const source = String(row.source || '');
    const rowPropertyId = typeof row.property_id === 'string' ? row.property_id : '';

    return {
        id: row.id,
        tenantId: row.tenant_id ?? null,
        projectId: row.project_id,
        propertyId: rowPropertyId || stringMeta(mergedMetadata.realtyPropertyId) || stringMeta(mergedMetadata.propertyId) || null,
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        message: stringMeta(mergedMetadata.message) || row.notes || '',
        preferredDate: row.preferred_date || stringMeta(mergedMetadata.preferredDate),
        budget: numberMeta(row.budget) ?? numberMeta(row.value),
        status: normalizeRealtyLeadStatus(row.status),
        source: source === 'manual'
            ? 'manual'
            : source === 'import'
                ? 'import'
                : source === 'ai'
                    ? 'ai'
                    : 'website',
        metadata: mergedMetadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
    };
};

export const mapRealtyPropertyToPostRow = (property: Partial<RealtyProperty>) => {
    const status = property.status || 'draft';
    const projectId = property.projectId || '';
    const tags = Array.from(new Set([
        REALTY_PROPERTY_POST_TAG,
        getProjectTag(projectId),
        `realty-status:${status}`,
        `realty-type:${property.propertyType || 'house'}`,
    ].filter(Boolean)));

    return {
        tenant_id: property.tenantId,
        user_id: property.createdBy ?? null,
        title: property.title || '',
        slug: property.slug || toRealtySlug(property.title || ''),
        content: serializeRealtyPropertyContent(property),
        excerpt: property.description || '',
        featured_image: property.images?.[0]?.url || null,
        category: 'realty',
        status: status === 'active' ? 'published' : 'draft',
        tags,
        is_featured: Boolean(property.isFeatured),
        published_at: status === 'active' ? (property.publishedAt || new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
    };
};
