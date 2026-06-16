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
    TransactionType,
} from '../types/realty';
import { normalizeLeadStatus } from './leadData';

export const DEFAULT_REALTY_FLAGS: RealtyModuleFlags = {
    real_estate_enabled: true,
    real_estate_ai_enabled: true,
    real_estate_public_directory_enabled: true,
};

export const REALTY_LEAD_TAG = 'realty';
export const REALTY_LEAD_SOURCE = 'realty-website';

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

const nullableNumber = (value: unknown): number | undefined => {
    const parsed = numberMeta(value);
    return parsed === undefined ? undefined : parsed;
};

const toStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map(item => {
            if (typeof item === 'string') return item;
            if (isRecord(item)) {
                return stringMeta(item.name) || stringMeta(item.title) || stringMeta(item.label) || stringMeta(item.value);
            }
            return '';
        })
        .map(item => item.trim())
        .filter(Boolean);
};

const normalizeImages = (value: unknown): RealtyImage[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map((item, index): RealtyImage | null => {
            if (typeof item === 'string') {
                return { id: `image-${index}`, url: item, position: index, isPrimary: index === 0 };
            }
            if (!isRecord(item)) return null;
            const url = stringMeta(item.url) || stringMeta(item.downloadURL) || stringMeta(item.src);
            if (!url) return null;
            return {
                id: stringMeta(item.id) || `image-${index}`,
                url,
                storagePath: stringMeta(item.storagePath) || stringMeta(item.storage_path) || null,
                mediaType: stringMeta(item.mediaType) || stringMeta(item.media_type) || 'image',
                altText: stringMeta(item.altText) || stringMeta(item.alt_text),
                position: numberMeta(item.position) ?? index,
                isPrimary: Boolean(item.isPrimary ?? item.is_primary ?? index === 0),
                metadata: isRecord(item.metadata) ? item.metadata : {},
            };
        })
        .filter((item): item is RealtyImage => item !== null)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
};

const resolveRowTimestamp = (value: unknown, fallback = new Date().toISOString()): string =>
    typeof value === 'string' && value ? value : fallback;

const toIsoTimestamp = (value: unknown): string => {
    if (typeof value === 'string' && value) return value;
    if (value instanceof Date) return value.toISOString();
    if (isRecord(value) && typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000).toISOString();
    }
    if (typeof value === 'number') {
        const date = new Date(value);
        return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
    }
    return new Date().toISOString();
};

const normalizePropertyStatus = (value: unknown): RealtyPropertyStatus => {
    const status = String(value || 'draft');
    return (realtyPropertyStatuses as string[]).includes(status) ? status as RealtyPropertyStatus : 'draft';
};

const normalizePropertyType = (value: unknown): RealtyPropertyType => {
    const type = String(value || 'house');
    return (realtyPropertyTypes as string[]).includes(type) ? type as RealtyPropertyType : 'house';
};

const normalizeTransactionType = (value: unknown): TransactionType => {
    const transactionType = String(value || 'sale');
    return ['sale', 'rent', 'lease'].includes(transactionType) ? transactionType as TransactionType : 'sale';
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
        createdAt: toIsoTimestamp(lead.createdAt),
        updatedAt: toIsoTimestamp(lead.updatedAt || lead.createdAt),
    };
};

export const mapRealtyMediaRow = (row: any): RealtyImage & {
    userId?: string | null;
    tenantId?: string | null;
    projectId?: string | null;
    propertyId?: string | null;
    createdAt?: string;
    updatedAt?: string;
} => ({
    id: row.id,
    userId: row.user_id ?? null,
    tenantId: row.tenant_id ?? null,
    projectId: row.project_id ?? null,
    propertyId: row.property_id ?? null,
    url: row.url || '',
    storagePath: row.storage_path ?? null,
    mediaType: row.media_type || 'image',
    altText: row.alt_text || '',
    position: Number(row.position || 0),
    isPrimary: Boolean(row.is_primary),
    metadata: isRecord(row.metadata) ? row.metadata : {},
    createdAt: resolveRowTimestamp(row.created_at),
    updatedAt: resolveRowTimestamp(row.updated_at || row.created_at),
});

export const mapRealtyPropertyRow = (row: any, mediaRows: any[] = []): RealtyProperty => {
    const mediaImages = mediaRows.map(mapRealtyMediaRow).filter(image => image.url);
    const legacyImages = normalizeImages(row.images);
    const mainImage = row.main_image_url
        ? [{ id: 'main-image', url: row.main_image_url, altText: row.title || '', position: 0, isPrimary: true }]
        : [];
    const images = mediaImages.length > 0
        ? mediaImages
        : legacyImages.length > 0
            ? legacyImages
            : mainImage;
    const descriptionLong = row.description_long || row.description || '';
    const zipCode = row.postal_code || row.zip_code || '';
    const addressLine1 = row.address_line_1 || row.address || '';

    return {
        id: row.id,
        tenantId: row.tenant_id ?? null,
        projectId: row.project_id || '',
        userId: row.user_id ?? null,
        createdBy: row.user_id ?? null,
        title: row.title || '',
        slug: row.slug || toRealtySlug(row.title || row.id || 'property'),
        description: descriptionLong || row.description_short || '',
        descriptionShort: row.description_short || '',
        descriptionLong,
        price: Number(row.price || 0),
        currency: row.currency || 'USD',
        transactionType: normalizeTransactionType(row.transaction_type),
        address: addressLine1,
        addressLine1,
        addressLine2: row.address_line_2 || '',
        city: row.city || '',
        state: row.state || '',
        country: row.country || '',
        zipCode,
        postalCode: zipCode,
        propertyType: normalizePropertyType(row.property_type),
        status: normalizePropertyStatus(row.status),
        bedrooms: Number(row.bedrooms || 0),
        bathrooms: Number(row.bathrooms || 0),
        halfBathrooms: nullableNumber(row.half_bathrooms),
        area: Number(row.area_sqft || row.square_feet || 0),
        areaUnit: 'sqft',
        lotSize: nullableNumber(row.lot_sqft) ?? nullableNumber(row.lot_size),
        lotSqft: nullableNumber(row.lot_sqft) ?? nullableNumber(row.lot_size),
        parkingSpaces: nullableNumber(row.parking_spaces),
        yearBuilt: row.year_built ? Number(row.year_built) : undefined,
        hoaFee: nullableNumber(row.hoa_fee),
        taxes: nullableNumber(row.taxes),
        latitude: nullableNumber(row.latitude),
        longitude: nullableNumber(row.longitude),
        amenities: toStringArray(row.amenities),
        features: toStringArray(row.features),
        highlights: toStringArray(row.highlights),
        images,
        mainImageUrl: row.main_image_url || images[0]?.url || '',
        videoUrl: row.video_url || '',
        virtualTourUrl: row.virtual_tour_url || '',
        agentId: row.agent_id ?? null,
        seoTitle: row.seo_title || '',
        seoDescription: row.seo_description || '',
        listingScore: Number(row.listing_score || 0),
        leadCount: Number(row.lead_count || 0),
        isFeatured: Boolean(row.is_featured),
        publicEnabled: Boolean(row.public_enabled),
        publishedAt: row.published_at || null,
        metadata: isRecord(row.metadata) ? row.metadata : {},
        createdAt: resolveRowTimestamp(row.created_at),
        updatedAt: resolveRowTimestamp(row.updated_at || row.created_at),
    };
};

export const mapRealtyPropertyToRow = (
    property: Partial<RealtyProperty>,
    userId: string,
    projectId: string,
    tenantId?: string | null
) => {
    const status = property.status || 'draft';
    const images = normalizeImages(property.images || []);
    const descriptionLong = property.descriptionLong || property.description || '';
    const addressLine1 = property.addressLine1 || property.address || '';
    const postalCode = property.postalCode || property.zipCode || '';
    const mainImageUrl = property.mainImageUrl || images[0]?.url || null;

    return {
        user_id: userId,
        tenant_id: tenantId || null,
        project_id: projectId,
        title: property.title || '',
        slug: property.slug || toRealtySlug(property.title || ''),
        description: descriptionLong,
        description_short: property.descriptionShort || (descriptionLong ? descriptionLong.slice(0, 240) : null),
        description_long: descriptionLong,
        price: property.price ?? 0,
        currency: property.currency || 'USD',
        transaction_type: property.transactionType || 'sale',
        property_type: property.propertyType || 'house',
        status,
        address: addressLine1,
        address_line_1: addressLine1,
        address_line_2: property.addressLine2 || null,
        city: property.city || '',
        state: property.state || null,
        country: property.country || null,
        zip_code: postalCode,
        postal_code: postalCode,
        latitude: property.latitude ?? null,
        longitude: property.longitude ?? null,
        bedrooms: property.bedrooms ?? 0,
        bathrooms: property.bathrooms ?? 0,
        half_bathrooms: property.halfBathrooms ?? null,
        parking_spaces: property.parkingSpaces ?? null,
        square_feet: property.area ?? null,
        area_sqft: property.area ?? null,
        lot_size: property.lotSize ?? property.lotSqft ?? null,
        lot_sqft: property.lotSqft ?? property.lotSize ?? null,
        year_built: property.yearBuilt ?? null,
        hoa_fee: property.hoaFee ?? null,
        taxes: property.taxes ?? null,
        amenities: property.amenities || [],
        features: property.features || [],
        highlights: property.highlights || [],
        images,
        main_image_url: mainImageUrl,
        video_url: property.videoUrl || null,
        virtual_tour_url: property.virtualTourUrl || null,
        agent_id: property.agentId || null,
        seo_title: property.seoTitle || null,
        seo_description: property.seoDescription || null,
        listing_score: property.listingScore ?? 0,
        is_featured: Boolean(property.isFeatured),
        public_enabled: status === 'active' ? property.publicEnabled ?? true : property.publicEnabled ?? false,
        published_at: status === 'active' ? (property.publishedAt || new Date().toISOString()) : null,
        metadata: property.metadata || {},
        updated_at: new Date().toISOString(),
    };
};

export const mapRealtyMediaToRow = (
    image: RealtyImage,
    property: Pick<RealtyProperty, 'id' | 'projectId' | 'tenantId' | 'userId' | 'createdBy' | 'title'>,
    index: number,
    userId: string
) => ({
    user_id: userId,
    tenant_id: property.tenantId || null,
    project_id: property.projectId,
    property_id: property.id,
    url: image.url,
    storage_path: image.storagePath || null,
    media_type: image.mediaType || 'image',
    alt_text: image.altText || property.title || '',
    position: image.position ?? index,
    is_primary: image.isPrimary ?? index === 0,
    metadata: image.metadata || {},
    updated_at: new Date().toISOString(),
});

export const mapPropertyLeadRow = (row: any): RealtyLead => {
    const metadata = isRecord(row.metadata) ? row.metadata : {};
    const source = String(row.source || '');

    return {
        id: row.id,
        tenantId: row.tenant_id ?? null,
        projectId: row.project_id || '',
        propertyId: row.property_id ?? null,
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        message: row.message || stringMeta(metadata.message),
        preferredDate: row.preferred_date || stringMeta(metadata.preferredDate),
        budget: numberMeta(row.budget),
        status: normalizeRealtyLeadStatus(row.stage || row.status),
        leadType: row.lead_type || 'buyer',
        crmLeadId: row.crm_lead_id ?? null,
        source: source === 'manual'
            ? 'manual'
            : source === 'import'
                ? 'import'
                : source === 'ai'
                    ? 'ai'
                    : 'website',
        metadata: {
            ...metadata,
            sourceLeadId: row.crm_lead_id || metadata.sourceLeadId,
        },
        createdAt: resolveRowTimestamp(row.created_at),
        updatedAt: resolveRowTimestamp(row.updated_at || row.created_at),
    };
};

export const mapRealtyAiGenerationRow = (row: any): RealtyAiGeneration => ({
    id: row.id,
    tenantId: row.tenant_id ?? null,
    projectId: row.project_id || '',
    propertyId: row.property_id ?? null,
    userId: row.user_id ?? null,
    kind: row.kind || 'listing_description',
    prompt: row.prompt || '',
    output: row.output || '',
    metadata: isRecord(row.metadata) ? row.metadata : {},
    createdAt: resolveRowTimestamp(row.created_at),
    updatedAt: resolveRowTimestamp(row.updated_at || row.created_at),
});

export const mapRealtyAiGenerationToRow = (
    generation: Omit<RealtyAiGeneration, 'id' | 'createdAt'>,
    userId: string,
    tenantId?: string | null
) => ({
    user_id: userId,
    tenant_id: tenantId || generation.tenantId || null,
    project_id: generation.projectId,
    property_id: generation.propertyId || null,
    kind: generation.kind,
    prompt: generation.prompt,
    output: generation.output,
    metadata: generation.metadata || {},
    updated_at: new Date().toISOString(),
});

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
        createdAt: resolveRowTimestamp(row.created_at),
        updatedAt: resolveRowTimestamp(row.updated_at || row.created_at),
    };
};
