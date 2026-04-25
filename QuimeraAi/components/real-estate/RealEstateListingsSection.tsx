import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Bath, BedDouble, Home, MapPin, Ruler, Star } from 'lucide-react';
import { Property } from '../../types/realEstate';
import { ThemeData } from '../../types';
import { usePublicRealEstateListings } from '../../hooks/usePublicRealEstateListings';

interface RealEstateListingsSectionProps {
    data?: any;
    projectId?: string | null;
    isPreviewMode?: boolean;
    theme?: ThemeData;
    globalColors?: Record<string, string>;
    onNavigate?: (href: string) => void;
}

const formatPrice = (value: number, locale: string) => {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value || 0);
};

const paddingYClasses: Record<string, string> = {
    none: 'py-0',
    sm: 'py-10 md:py-16',
    md: 'py-16 md:py-24',
    lg: 'py-20 md:py-32',
    xl: 'py-24 md:py-40',
};

const paddingXClasses: Record<string, string> = {
    none: 'px-0',
    sm: 'px-4',
    md: 'px-6',
    lg: 'px-8',
    xl: 'px-12',
};

const borderRadiusClasses: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-3xl',
};

const createDemoListings = (t: (key: string) => string): Property[] => [
    {
        id: 'demo-ocean',
        projectId: 'demo',
        title: t('realEstate.demo.properties.ocean.title'),
        slug: 'ocean-residence-condado',
        description: t('realEstate.demo.properties.ocean.description'),
        price: 875000,
        address: t('realEstate.demo.properties.ocean.address'),
        city: t('realEstate.demo.properties.ocean.city'),
        propertyType: 'condo',
        bedrooms: 4,
        bathrooms: 3,
        squareFeet: 3200,
        amenities: [],
        images: [{ id: 'demo-ocean-image', url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=1200', position: 0 }],
        status: 'active',
        isFeatured: true,
        createdAt: null as any,
        updatedAt: null as any,
    },
    {
        id: 'demo-family',
        projectId: 'demo',
        title: t('realEstate.demo.properties.family.title'),
        slug: 'garden-home-guaynabo',
        description: t('realEstate.demo.properties.family.description'),
        price: 428000,
        address: t('realEstate.demo.properties.family.address'),
        city: t('realEstate.demo.properties.family.city'),
        propertyType: 'house',
        bedrooms: 4,
        bathrooms: 2,
        squareFeet: 2400,
        amenities: [],
        images: [{ id: 'demo-family-image', url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=1200', position: 0 }],
        status: 'active',
        isFeatured: false,
        createdAt: null as any,
        updatedAt: null as any,
    },
    {
        id: 'demo-penthouse',
        projectId: 'demo',
        title: t('realEstate.demo.properties.penthouse.title'),
        slug: 'penthouse-miramar-skyline',
        description: t('realEstate.demo.properties.penthouse.description'),
        price: 615000,
        address: t('realEstate.demo.properties.penthouse.address'),
        city: t('realEstate.demo.properties.penthouse.city'),
        propertyType: 'condo',
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1850,
        amenities: [],
        images: [{ id: 'demo-penthouse-image', url: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=1200', position: 0 }],
        status: 'active',
        isFeatured: false,
        createdAt: null as any,
        updatedAt: null as any,
    },
];

const previewLogicalRouteSegments = new Set(['listados', 'blog', 'tienda', 'producto', 'categoria', 'carrito', 'checkout', 'pedido']);

const getPreviewBasePath = () => {
    const pathname = window.location.pathname;
    if (!pathname.startsWith('/preview/')) return '';
    const parts = pathname.replace('/preview/', '').split('/').filter(Boolean);
    if (parts.length === 0) return '/preview';
    if (parts.length === 1) return `/preview/${parts[0]}`;
    if (previewLogicalRouteSegments.has(parts[1])) return `/preview/${parts[0]}`;
    return `/preview/${parts[0]}/${parts[1]}`;
};

const navigateTo = (path: string) => {
    const fullPath = `${getPreviewBasePath()}${path}`;
    window.history.pushState(null, '', fullPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
};

const RealEstateListingsSection: React.FC<RealEstateListingsSectionProps> = ({
    data = {},
    projectId = null,
    isPreviewMode = false,
    theme,
    globalColors,
    onNavigate,
}) => {
    const { t, i18n } = useTranslation();
    const maxItems = Number(data.maxItems || 6);
    const featuredOnly = Boolean(data.featuredOnly);
    const themeColors = globalColors || theme?.globalColors || {};
    const { properties, isLoading } = usePublicRealEstateListings(projectId || null, {
        limitCount: maxItems,
        featuredOnly,
        realtime: isPreviewMode,
    });

    const listings = useMemo(() => {
        if (properties.length > 0) return properties;
        return isPreviewMode ? createDemoListings(t).slice(0, maxItems) : [];
    }, [isPreviewMode, maxItems, properties, t]);

    const dataColors = data.colors || {};
    const colors = {
        background: dataColors.background || themeColors.background || theme?.pageBackground || '#ffffff',
        heading: dataColors.heading || themeColors.heading || themeColors.text || '#111827',
        text: dataColors.text || themeColors.text || '#374151',
        textMuted: dataColors.textMuted || dataColors.description || themeColors.textMuted || themeColors.text || '#6b7280',
        accent: dataColors.accent || themeColors.primary || themeColors.accent || '#4f46e5',
        cardBackground: dataColors.cardBackground || themeColors.surface || '#ffffff',
        border: dataColors.border || dataColors.borderColor || themeColors.border || 'rgba(148, 163, 184, 0.28)',
        buttonBackground: dataColors.buttonBackground || dataColors.accent || themeColors.primary || '#4f46e5',
        buttonText: dataColors.buttonText || '#ffffff',
    };
    const showPrice = data.showPrice !== false;
    const showLocation = data.showLocation !== false;
    const showStats = data.showStats !== false;
    const showDescription = data.showDescription !== false;
    const cardRadius = borderRadiusClasses[data.cardBorderRadius || theme?.cardBorderRadius || 'md'] || borderRadiusClasses.md;
    const buttonRadius = borderRadiusClasses[data.buttonBorderRadius || theme?.buttonBorderRadius || 'md'] || borderRadiusClasses.md;
    const paddingY = paddingYClasses[data.paddingY || 'lg'] || paddingYClasses.lg;
    const paddingX = paddingXClasses[data.paddingX || 'md'] || paddingXClasses.md;
    return (
        <section
            id="realEstateListings"
            className={`w-full ${paddingY} ${paddingX}`}
            style={{
                backgroundColor: colors.background,
                color: colors.text,
            }}
        >
            <div className="mx-auto max-w-7xl">
                <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-3xl">
                        <p className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase font-body"
                            style={{ borderColor: colors.border, color: colors.accent }}>
                            <Home size={14} />
                            {t('realEstate.websiteListings.eyebrow')}
                        </p>
                        <h2 className="text-3xl font-bold font-header md:text-4xl" style={{ color: colors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                            {data.title || t('realEstate.websiteListings.defaultTitle')}
                        </h2>
                        <p className="mt-3 max-w-2xl text-base font-body md:text-lg" style={{ color: colors.textMuted }}>
                            {data.subtitle || t('realEstate.websiteListings.defaultSubtitle')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onNavigate ? onNavigate('/listados') : navigateTo('/listados')}
                        className={`inline-flex items-center justify-center gap-2 border px-4 py-2 text-sm font-semibold font-button transition-opacity hover:opacity-80 ${buttonRadius}`}
                        style={{ borderColor: colors.border, color: colors.accent, textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}
                    >
                        {t('realEstate.websiteListings.viewAll', 'View all listings')}
                        <ArrowRight size={16} />
                    </button>
                </div>

                {isLoading && listings.length === 0 ? (
                    <div className="grid gap-5 md:grid-cols-3">
                        {[0, 1, 2].map(item => (
                            <div key={item} className={`h-80 animate-pulse ${cardRadius}`} style={{ backgroundColor: colors.cardBackground }} />
                        ))}
                    </div>
                ) : listings.length === 0 ? (
                    <div className={`border p-8 text-center ${cardRadius}`} style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}>
                        <p className="font-body" style={{ color: colors.textMuted }}>{t('realEstate.websiteListings.empty')}</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {listings.map(property => {
                            const image = property.images?.[0]?.url;
                            return (
                                <article
                                    key={property.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onNavigate ? onNavigate(`/listados/${property.slug}`) : navigateTo(`/listados/${property.slug}`)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            onNavigate ? onNavigate(`/listados/${property.slug}`) : navigateTo(`/listados/${property.slug}`);
                                        }
                                    }}
                                    className={`cursor-pointer overflow-hidden border transition-transform hover:-translate-y-1 ${cardRadius}`}
                                    style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}
                                >
                                    <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: colors.border }}>
                                        {image ? (
                                            <img src={image} alt={property.title} className="h-full w-full object-cover" loading="lazy" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center" style={{ color: colors.textMuted }}>
                                                <Home size={42} />
                                            </div>
                                        )}
                                        {property.isFeatured && (
                                            <div className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold font-body"
                                                style={{ backgroundColor: colors.accent, color: colors.buttonText }}>
                                                <Star size={13} />
                                                {t('realEstate.websiteListings.featured')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5">
                                        {showPrice && (
                                            <p className="mb-2 text-2xl font-bold font-header" style={{ color: colors.accent }}>
                                                {formatPrice(property.price, i18n.language)}
                                            </p>
                                        )}
                                        <h3 className="text-xl font-semibold font-header" style={{ color: colors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{property.title}</h3>
                                        {showLocation && (
                                            <p className="mt-2 flex items-center gap-2 text-sm font-body" style={{ color: colors.textMuted }}>
                                                <MapPin size={15} />
                                                {[property.address, property.city].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                        {showDescription && (
                                            <p className="mt-3 line-clamp-2 text-sm leading-6 font-body" style={{ color: colors.text }}>
                                                {property.description}
                                            </p>
                                        )}
                                        {showStats && (
                                            <div className="mt-5 grid grid-cols-3 gap-2 text-sm font-body" style={{ color: colors.textMuted }}>
                                                <span className="inline-flex items-center gap-1"><BedDouble size={15} />{property.bedrooms}</span>
                                                <span className="inline-flex items-center gap-1"><Bath size={15} />{property.bathrooms}</span>
                                                <span className="inline-flex items-center gap-1"><Ruler size={15} />{property.squareFeet.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onNavigate ? onNavigate(`/listados/${property.slug}`) : navigateTo(`/listados/${property.slug}`);
                                            }}
                                            className={`mt-5 inline-flex w-full items-center justify-center px-4 py-2 text-sm font-semibold font-button transition-opacity hover:opacity-90 ${buttonRadius}`}
                                            style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText, textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}
                                        >
                                            {data.buttonText || t('realEstate.websiteListings.viewDetails')}
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
                {listings.length > 0 && (
                    <div className="mt-10 text-center">
                        <button
                            type="button"
                            onClick={() => onNavigate ? onNavigate('/listados') : navigateTo('/listados')}
                            className={`inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold font-button transition-opacity hover:opacity-90 ${buttonRadius}`}
                            style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText, textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}
                        >
                            {t('realEstate.websiteListings.viewAll', 'View all listings')}
                            <ArrowRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default RealEstateListingsSection;
