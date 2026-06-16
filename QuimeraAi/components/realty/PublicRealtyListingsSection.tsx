import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Bath, BedDouble, Home, MapPin, Ruler, Star } from 'lucide-react';
import type { ThemeData } from '../../types';
import type { RealtyListingsSectionData, RealtyProperty } from '../../types/realty';
import { usePublicRealtyListings } from '../../hooks/usePublicRealtyListings';
import { formatRealtyPrice, resolveRealtyWebsiteColors } from '../../utils/realty';
import { getAnimationClass, getAnimationDelay } from '../../utils/animations';

interface PublicRealtyListingsSectionProps {
    data?: RealtyListingsSectionData;
    projectId?: string | null;
    isPreviewMode?: boolean;
    theme?: ThemeData;
    globalColors?: Record<string, string>;
    onNavigate?: (href: string) => void;
}

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

const radiusClasses: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-3xl',
};

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

const PropertyCard = ({
    property,
    index,
    data,
    colors,
    cardRadius,
    buttonRadius,
    locale,
    onNavigate,
}: {
    property: RealtyProperty;
    index: number;
    data: RealtyListingsSectionData;
    colors: ReturnType<typeof resolveRealtyWebsiteColors>;
    cardRadius: string;
    buttonRadius: string;
    locale: string;
    onNavigate?: (href: string) => void;
}) => {
    const { t } = useTranslation();
    const image = property.images?.[0]?.url;
    const detailPath = `/listados/${property.slug}`;
    const animationClass = getAnimationClass(data.animationType || 'fade-in-up', data.enableCardAnimation !== false);

    const go = () => onNavigate ? onNavigate(detailPath) : navigateTo(detailPath);

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={go}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    go();
                }
            }}
            className={`cursor-pointer overflow-hidden border transition-transform duration-300 hover:-translate-y-1 ${cardRadius} ${animationClass}`}
            style={{
                borderColor: colors.border,
                backgroundColor: colors.cardBackground,
                animationDelay: animationClass ? getAnimationDelay(index) : undefined,
            }}
        >
            <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: colors.border }}>
                {image ? (
                    <img src={image} alt={property.images?.[0]?.altText || property.title} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center" style={{ color: colors.textMuted }}>
                        <Home size={42} />
                    </div>
                )}
                {property.isFeatured && (
                    <div className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold font-body"
                        style={{ backgroundColor: colors.badgeBackground, color: colors.badgeText }}>
                        <Star size={13} />
                        {t('realty.website.featured')}
                    </div>
                )}
            </div>
            <div className="p-5">
                {data.showPrice !== false && (
                    <p className="mb-2 text-2xl font-bold font-header" style={{ color: colors.priceColor }}>
                        {formatRealtyPrice(property.price, locale, property.currency)}
                    </p>
                )}
                <h3 className="text-xl font-semibold font-header" style={{ color: colors.cardHeading }}>
                    {property.title}
                </h3>
                {data.showLocation !== false && (
                    <p className="mt-2 flex items-center gap-2 text-sm font-body" style={{ color: colors.textMuted }}>
                        <MapPin size={15} />
                        {[property.address, property.city].filter(Boolean).join(', ')}
                    </p>
                )}
                {data.showDescription !== false && (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 font-body" style={{ color: colors.cardText }}>
                        {property.description}
                    </p>
                )}
                {data.showStats !== false && (
                    <div className="mt-5 grid grid-cols-3 gap-2 text-sm font-body" style={{ color: colors.textMuted }}>
                        <span className="inline-flex items-center gap-1"><BedDouble size={15} />{property.bedrooms}</span>
                        <span className="inline-flex items-center gap-1"><Bath size={15} />{property.bathrooms}</span>
                        <span className="inline-flex items-center gap-1"><Ruler size={15} />{property.area.toLocaleString()}</span>
                    </div>
                )}
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        go();
                    }}
                    className={`mt-5 inline-flex w-full items-center justify-center px-4 py-2 text-sm font-semibold font-button transition-opacity hover:opacity-90 ${buttonRadius}`}
                    style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}
                >
                    {data.buttonText || t('realty.website.viewDetails')}
                </button>
            </div>
        </article>
    );
};

const PublicRealtyListingsSection: React.FC<PublicRealtyListingsSectionProps> = ({
    data = {},
    projectId = null,
    isPreviewMode = false,
    theme,
    globalColors,
    onNavigate,
}) => {
    const { t, i18n } = useTranslation();
    const maxItems = Number(data.maxItems || 6);
    const { properties, isLoading } = usePublicRealtyListings(projectId || null, {
        limitCount: maxItems,
        featuredOnly: Boolean(data.featuredOnly),
        realtime: isPreviewMode,
    });

    const listings = useMemo(() => {
        const filtered = data.featuredOnly ? properties.filter(property => property.isFeatured) : properties;
        return filtered.slice(0, maxItems);
    }, [data.featuredOnly, maxItems, properties]);

    const colors = resolveRealtyWebsiteColors(data.colors, globalColors || theme?.globalColors, theme);
    const cardRadius = radiusClasses[data.cardBorderRadius || theme?.cardBorderRadius || 'md'] || radiusClasses.md;
    const buttonRadius = radiusClasses[data.buttonBorderRadius || theme?.buttonBorderRadius || 'md'] || radiusClasses.md;
    const paddingY = paddingYClasses[data.paddingY || 'lg'] || paddingYClasses.lg;
    const paddingX = paddingXClasses[data.paddingX || 'md'] || paddingXClasses.md;

    return (
        <section
            id="realEstateListings"
            className={`w-full ${paddingY} ${paddingX}`}
            style={{ backgroundColor: colors.background, color: colors.text }}
        >
            <div className="mx-auto max-w-7xl">
                <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-3xl">
                        <p className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase font-body"
                            style={{ borderColor: colors.border, color: colors.accent }}>
                            <Home size={14} />
                            {t('realty.website.eyebrow')}
                        </p>
                        <h2 className="text-3xl font-bold font-header md:text-4xl" style={{ color: colors.heading }}>
                            {data.title || t('realty.website.defaultTitle')}
                        </h2>
                        <p className="mt-3 max-w-2xl text-base font-body md:text-lg" style={{ color: colors.textMuted }}>
                            {data.subtitle || t('realty.website.defaultSubtitle')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onNavigate ? onNavigate('/listados') : navigateTo('/listados')}
                        className={`inline-flex items-center justify-center gap-2 border px-4 py-2 text-sm font-semibold font-button transition-opacity hover:opacity-80 ${buttonRadius}`}
                        style={{ borderColor: colors.border, color: colors.accent }}
                    >
                        {t('realty.website.viewAll')}
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
                        <p className="font-body" style={{ color: colors.textMuted }}>{t('realty.website.empty')}</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {listings.map((property, index) => (
                            <PropertyCard
                                key={property.id}
                                property={property}
                                index={index}
                                data={data}
                                colors={colors}
                                cardRadius={cardRadius}
                                buttonRadius={buttonRadius}
                                locale={i18n.language}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </div>
                )}

                {listings.length > 0 && (
                    <div className="mt-10 text-center">
                        <button
                            type="button"
                            onClick={() => onNavigate ? onNavigate('/listados') : navigateTo('/listados')}
                            className={`inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold font-button transition-opacity hover:opacity-90 ${buttonRadius}`}
                            style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}
                        >
                            {t('realty.website.viewAll')}
                            <ArrowRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default PublicRealtyListingsSection;
