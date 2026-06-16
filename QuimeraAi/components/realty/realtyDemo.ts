import type { TFunction } from 'i18next';
import type { RealtyLead, RealtyLeadStatus, RealtyProperty } from '../../types/realty';

const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;
const normalizeKey = (value?: string | null) => (value || '').trim().toLowerCase();
const metadataString = (value: unknown) => typeof value === 'string' ? value : '';

export const isDemoRealtyProperty = (property: Pick<RealtyProperty, 'id'> | Partial<RealtyProperty>) =>
    Boolean(property.id?.startsWith('demo-'));

export const isDemoRealtyLead = (lead: Pick<RealtyLead, 'id'> | Partial<RealtyLead>) =>
    Boolean(lead.id?.startsWith('demo-lead-'));

export const mergeRealtyPropertiesWithPendingDemos = (
    properties: RealtyProperty[],
    demoProperties: RealtyProperty[]
): RealtyProperty[] => {
    const existingKeys = new Set<string>();
    properties.forEach(property => {
        const slug = normalizeKey(property.slug);
        const title = normalizeKey(property.title);
        const demoSlug = normalizeKey(typeof property.metadata?.demoSlug === 'string' ? property.metadata.demoSlug : '');
        const demoId = normalizeKey(typeof property.metadata?.demoId === 'string' ? property.metadata.demoId : '');
        [slug, title, demoSlug, demoId].filter(Boolean).forEach(key => existingKeys.add(key));
    });

    const pendingDemos = demoProperties.filter(demo => {
        const keys = [normalizeKey(demo.slug), normalizeKey(demo.title), normalizeKey(demo.id)].filter(Boolean);
        return !keys.some(key => existingKeys.has(key));
    });

    return [...properties, ...pendingDemos];
};

export const createDemoRealtyListings = (t: TFunction): RealtyProperty[] => [
    {
        id: 'demo-ocean-residence',
        projectId: 'demo',
        title: t('realty.demo.ocean.title'),
        slug: 'ocean-residence-condado',
        description: t('realty.demo.ocean.description'),
        price: 875000,
        currency: 'USD',
        address: t('realty.demo.ocean.address'),
        city: t('realty.demo.ocean.city'),
        state: 'PR',
        propertyType: 'condo',
        status: 'active',
        bedrooms: 4,
        bathrooms: 3,
        area: 3200,
        areaUnit: 'sqft',
        amenities: [t('realty.demo.amenities.oceanView'), t('realty.demo.amenities.pool'), t('realty.demo.amenities.security')],
        images: [{ id: 'demo-ocean-image', url: image('photo-1613490493576-7fde63acd811'), position: 0 }],
        isFeatured: true,
        createdAt: '',
        updatedAt: '',
    },
    {
        id: 'demo-garden-home',
        projectId: 'demo',
        title: t('realty.demo.family.title'),
        slug: 'garden-home-guaynabo',
        description: t('realty.demo.family.description'),
        price: 428000,
        currency: 'USD',
        address: t('realty.demo.family.address'),
        city: t('realty.demo.family.city'),
        state: 'PR',
        propertyType: 'house',
        status: 'active',
        bedrooms: 4,
        bathrooms: 2,
        area: 2400,
        areaUnit: 'sqft',
        amenities: [t('realty.demo.amenities.backyard'), t('realty.demo.amenities.solar'), t('realty.demo.amenities.smartHome')],
        images: [{ id: 'demo-family-image', url: image('photo-1600566753190-17f0baa2a6c3'), position: 0 }],
        isFeatured: false,
        createdAt: '',
        updatedAt: '',
    },
    {
        id: 'demo-penthouse',
        projectId: 'demo',
        title: t('realty.demo.penthouse.title'),
        slug: 'penthouse-miramar-skyline',
        description: t('realty.demo.penthouse.description'),
        price: 615000,
        currency: 'USD',
        address: t('realty.demo.penthouse.address'),
        city: t('realty.demo.penthouse.city'),
        state: 'PR',
        propertyType: 'apartment',
        status: 'active',
        bedrooms: 3,
        bathrooms: 2,
        area: 1850,
        areaUnit: 'sqft',
        amenities: [t('realty.demo.amenities.terrace'), t('realty.demo.amenities.concierge')],
        images: [{ id: 'demo-penthouse-image', url: image('photo-1600607687920-4e2a09cf159d'), position: 0 }],
        isFeatured: true,
        createdAt: '',
        updatedAt: '',
    },
    {
        id: 'demo-retail-loft',
        projectId: 'demo',
        title: t('realty.demo.retail.title'),
        slug: 'retail-loft-santurce',
        description: t('realty.demo.retail.description'),
        price: 720000,
        currency: 'USD',
        address: t('realty.demo.retail.address'),
        city: t('realty.demo.retail.city'),
        state: 'PR',
        propertyType: 'commercial',
        status: 'active',
        bedrooms: 0,
        bathrooms: 2,
        area: 4100,
        areaUnit: 'sqft',
        amenities: [t('realty.demo.amenities.streetAccess'), t('realty.demo.amenities.parking'), t('realty.demo.amenities.highCeilings')],
        images: [{ id: 'demo-retail-image', url: image('photo-1497366754035-f200968a6e72'), position: 0 }],
        isFeatured: false,
        createdAt: '',
        updatedAt: '',
    },
];

export const createDemoRealtyLeads = (
    t: TFunction,
    properties: RealtyProperty[],
    projectId = 'demo',
    tenantId?: string | null
): RealtyLead[] => {
    const propertyById = new Map(properties.map(property => [property.id, property]));
    const propertyByKey = new Map<string, RealtyProperty>();
    properties.forEach(property => {
        [
            property.id,
            property.slug,
            metadataString(property.metadata?.demoId),
            metadataString(property.metadata?.demoSlug),
        ].map(normalizeKey).filter(Boolean).forEach(key => {
            if (!propertyByKey.has(key)) propertyByKey.set(key, property);
        });
    });
    const configs: Array<{
        id: string;
        propertyId: string;
        propertySlug: string;
        nameKey: string;
        email: string;
        phone: string;
        messageKey: string;
        status: RealtyLeadStatus;
        budget: number;
        createdAt: string;
    }> = [
        {
            id: 'demo-lead-ocean-1',
            propertyId: 'demo-ocean-residence',
            propertySlug: 'ocean-residence-condado',
            nameKey: 'realty.demo.leads.maria.name',
            email: 'maria.rivera@example.com',
            phone: '+1 787 555 0141',
            messageKey: 'realty.demo.leads.maria.message',
            status: 'new',
            budget: 900000,
            createdAt: '2026-06-12T14:10:00.000Z',
        },
        {
            id: 'demo-lead-ocean-2',
            propertyId: 'demo-ocean-residence',
            propertySlug: 'ocean-residence-condado',
            nameKey: 'realty.demo.leads.carlos.name',
            email: 'carlos.mendez@example.com',
            phone: '+1 787 555 0188',
            messageKey: 'realty.demo.leads.carlos.message',
            status: 'qualified',
            budget: 875000,
            createdAt: '2026-06-11T16:35:00.000Z',
        },
        {
            id: 'demo-lead-family-1',
            propertyId: 'demo-garden-home',
            propertySlug: 'garden-home-guaynabo',
            nameKey: 'realty.demo.leads.sofia.name',
            email: 'sofia.torres@example.com',
            phone: '+1 787 555 0194',
            messageKey: 'realty.demo.leads.sofia.message',
            status: 'contacted',
            budget: 450000,
            createdAt: '2026-06-10T12:20:00.000Z',
        },
        {
            id: 'demo-lead-penthouse-1',
            propertyId: 'demo-penthouse',
            propertySlug: 'penthouse-miramar-skyline',
            nameKey: 'realty.demo.leads.andres.name',
            email: 'andres.cruz@example.com',
            phone: '+1 787 555 0127',
            messageKey: 'realty.demo.leads.andres.message',
            status: 'new',
            budget: 650000,
            createdAt: '2026-06-09T19:45:00.000Z',
        },
        {
            id: 'demo-lead-penthouse-2',
            propertyId: 'demo-penthouse',
            propertySlug: 'penthouse-miramar-skyline',
            nameKey: 'realty.demo.leads.lucia.name',
            email: 'lucia.santos@example.com',
            phone: '+1 787 555 0133',
            messageKey: 'realty.demo.leads.lucia.message',
            status: 'negotiation',
            budget: 610000,
            createdAt: '2026-06-08T10:05:00.000Z',
        },
        {
            id: 'demo-lead-retail-1',
            propertyId: 'demo-retail-loft',
            propertySlug: 'retail-loft-santurce',
            nameKey: 'realty.demo.leads.valeria.name',
            email: 'valeria.pena@example.com',
            phone: '+1 787 555 0162',
            messageKey: 'realty.demo.leads.valeria.message',
            status: 'new',
            budget: 750000,
            createdAt: '2026-06-07T15:55:00.000Z',
        },
    ];

    return configs
        .map<RealtyLead | null>(config => {
            const property = propertyById.get(config.propertyId)
                || propertyByKey.get(normalizeKey(config.propertyId))
                || propertyByKey.get(normalizeKey(config.propertySlug));
            if (!property) return null;
            return {
                id: config.id,
                tenantId,
                projectId,
                propertyId: property.id,
                name: t(config.nameKey),
                email: config.email,
                phone: config.phone,
                message: t(config.messageKey, { property: property.title }),
                budget: config.budget,
                status: config.status,
                source: 'website',
                metadata: {
                    isDemo: true,
                    propertyTitle: property.title,
                    propertySlug: property.slug,
                },
                createdAt: config.createdAt,
                updatedAt: config.createdAt,
            };
        })
        .filter((lead): lead is RealtyLead => Boolean(lead));
};
