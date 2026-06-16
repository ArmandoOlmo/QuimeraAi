import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Bath,
    BedDouble,
    Eye,
    Filter,
    Grid3X3,
    Home,
    List,
    Map,
    MapPin,
    RotateCcw,
    Ruler,
    Search,
    SlidersHorizontal,
    Sparkles,
    Star,
    X,
} from 'lucide-react';
import type { ThemeData } from '../../types';
import type { RealtyListingsSectionData, RealtyProperty, RealtyPropertyType, TransactionType } from '../../types/realty';
import { usePublicRealtyListings, type PublicRealtySort } from '../../hooks/usePublicRealtyListings';
import { colorWithAlpha, formatRealtyPrice, realtyPropertyTypes, resolveRealtyWebsiteColors } from '../../utils/realty';
import { getAnimationClass, getAnimationDelay } from '../../utils/animations';

interface PublicRealtyDirectoryProps {
    projectId: string;
    data?: RealtyListingsSectionData;
    theme?: ThemeData;
    globalColors?: Record<string, string>;
    isPreviewMode?: boolean;
    onNavigate?: (href: string) => void;
}

type ViewMode = 'grid' | 'list';

interface DirectoryFilters {
    search: string;
    city: string;
    propertyType: RealtyPropertyType | 'all';
    transactionType: TransactionType | 'all';
    minPrice: string;
    maxPrice: string;
    bedrooms: string;
    bathrooms: string;
    featuredOnly: boolean;
    sort: PublicRealtySort;
}

const DEFAULT_FILTERS: DirectoryFilters = {
    search: '',
    city: '',
    propertyType: 'all',
    transactionType: 'all',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: '',
    featuredOnly: false,
    sort: 'featured',
};

const transactionTypes: TransactionType[] = ['sale', 'rent', 'lease'];
const sortOptions: PublicRealtySort[] = ['featured', 'newest', 'price_asc', 'price_desc', 'beds_desc', 'area_desc'];
const previewLogicalRouteSegments = new Set(['listados', 'blog', 'tienda', 'producto', 'categoria', 'carrito', 'checkout', 'pedido']);

const radiusClasses: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-3xl',
};

const getPreviewBasePath = () => {
    if (typeof window === 'undefined') return '';
    const pathname = window.location.pathname;
    if (!pathname.startsWith('/preview/')) return '';
    const parts = pathname.replace('/preview/', '').split('/').filter(Boolean);
    if (parts.length === 0) return '/preview';
    if (parts.length === 1) return `/preview/${parts[0]}`;
    if (previewLogicalRouteSegments.has(parts[1])) return `/preview/${parts[0]}`;
    return `/preview/${parts[0]}/${parts[1]}`;
};

const navigateTo = (path: string) => {
    if (typeof window === 'undefined') return;
    const fullPath = `${getPreviewBasePath()}${path}`;
    window.history.pushState(null, '', fullPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
};

const isPropertyType = (value: string | null): value is RealtyPropertyType =>
    Boolean(value && realtyPropertyTypes.includes(value as RealtyPropertyType));

const isTransactionType = (value: string | null): value is TransactionType =>
    Boolean(value && transactionTypes.includes(value as TransactionType));

const isSortOption = (value: string | null): value is PublicRealtySort =>
    Boolean(value && sortOptions.includes(value as PublicRealtySort));

const readFiltersFromUrl = (): DirectoryFilters => {
    if (typeof window === 'undefined') return DEFAULT_FILTERS;
    const params = new URLSearchParams(window.location.search);
    const propertyType = params.get('type') || params.get('propertyType');
    const transactionType = params.get('transaction') || params.get('transactionType');
    const sort = params.get('sort');

    return {
        search: params.get('search') || params.get('q') || '',
        city: params.get('city') || '',
        propertyType: isPropertyType(propertyType) ? propertyType : 'all',
        transactionType: isTransactionType(transactionType) ? transactionType : 'all',
        minPrice: params.get('minPrice') || '',
        maxPrice: params.get('maxPrice') || '',
        bedrooms: params.get('beds') || params.get('bedrooms') || '',
        bathrooms: params.get('baths') || params.get('bathrooms') || '',
        featuredOnly: params.get('featured') === 'true',
        sort: isSortOption(sort) ? sort : 'featured',
    };
};

const readViewFromUrl = (): ViewMode => {
    if (typeof window === 'undefined') return 'grid';
    return new URLSearchParams(window.location.search).get('view') === 'list' ? 'list' : 'grid';
};

const writeFiltersToUrl = (filters: DirectoryFilters, viewMode: ViewMode) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.city.trim()) params.set('city', filters.city.trim());
    if (filters.propertyType !== 'all') params.set('type', filters.propertyType);
    if (filters.transactionType !== 'all') params.set('transaction', filters.transactionType);
    if (filters.minPrice.trim()) params.set('minPrice', filters.minPrice.trim());
    if (filters.maxPrice.trim()) params.set('maxPrice', filters.maxPrice.trim());
    if (filters.bedrooms.trim()) params.set('beds', filters.bedrooms.trim());
    if (filters.bathrooms.trim()) params.set('baths', filters.bathrooms.trim());
    if (filters.featuredOnly) params.set('featured', 'true');
    if (filters.sort !== 'featured') params.set('sort', filters.sort);
    if (viewMode !== 'grid') params.set('view', viewMode);

    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash || ''}`;
    if (`${window.location.pathname}${window.location.search}${window.location.hash || ''}` !== nextUrl) {
        window.history.replaceState(null, '', nextUrl);
    }
};

const getPropertyImage = (property: RealtyProperty) =>
    property.mainImageUrl ||
    property.images?.find(image => image.isPrimary)?.url ||
    property.images?.[0]?.url ||
    '';

const getShortDescription = (property: RealtyProperty) =>
    property.descriptionShort || property.descriptionLong || property.description || '';

const getLocationLabel = (property: RealtyProperty) =>
    [property.addressLine1 || property.address, property.city, property.state].filter(Boolean).join(', ');

const PublicRealtyDirectory: React.FC<PublicRealtyDirectoryProps> = ({
    projectId,
    data = {},
    theme,
    globalColors,
    isPreviewMode = false,
    onNavigate,
}) => {
    const { t, i18n } = useTranslation();
    const [filters, setFilters] = useState<DirectoryFilters>(() => readFiltersFromUrl());
    const [viewMode, setViewMode] = useState<ViewMode>(() => readViewFromUrl());
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const colors = resolveRealtyWebsiteColors(data.colors, globalColors || theme?.globalColors, theme);
    const cardRadius = radiusClasses[data.cardBorderRadius || theme?.cardBorderRadius || 'md'] || radiusClasses.md;
    const buttonRadius = radiusClasses[data.buttonBorderRadius || theme?.buttonBorderRadius || 'md'] || radiusClasses.md;
    const animationEnabled = data.enableCardAnimation !== false;
    const animationType = data.animationType || 'fade-in-up';

    const { properties, flags, isLoading, error, refetch, totalCount, filtersApplied } = usePublicRealtyListings(projectId || null, {
        search: filters.search,
        city: filters.city,
        propertyType: filters.propertyType,
        transactionType: filters.transactionType,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        bedrooms: filters.bedrooms,
        bathrooms: filters.bathrooms,
        featuredOnly: filters.featuredOnly,
        sort: filters.sort,
        limitCount: 48,
        realtime: isPreviewMode,
    });

    useEffect(() => {
        writeFiltersToUrl(filters, viewMode);
    }, [filters, viewMode]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const previousTitle = document.title;
        const title = t('realty.directory.seoTitle');
        const description = t('realty.directory.seoDescription');
        document.title = title;

        let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        const createdMeta = !meta;
        const previousDescription = meta?.getAttribute('content') || '';
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'description');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', description);

        return () => {
            if (document.title === title) document.title = previousTitle;
            if (createdMeta) meta?.remove();
            else meta?.setAttribute('content', previousDescription);
        };
    }, [t]);

    const updateFilter = useCallback(<K extends keyof DirectoryFilters>(key: K, value: DirectoryFilters[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS);
        setViewMode('grid');
        setShowMobileFilters(false);
    }, []);

    const goToProperty = useCallback((property: RealtyProperty) => {
        const path = `/listados/${property.slug}`;
        if (onNavigate) onNavigate(path);
        else navigateTo(path);
    }, [onNavigate]);

    const featuredProperties = useMemo(
        () => properties.filter(property => property.isFeatured).slice(0, 3),
        [properties]
    );

    const hasDirectoryAccess = flags.real_estate_enabled && flags.real_estate_public_directory_enabled;
    const showFeaturedSection = !filtersApplied && featuredProperties.length > 0;

    const fieldBaseClass = 'h-11 w-full rounded-md border px-3 text-sm font-body outline-none transition-colors';
    const fieldStyle = { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text };
    const mutedPanelStyle = { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text };

    const filterPanel = (
        <div className="grid gap-3 lg:grid-cols-12">
            <label className="lg:col-span-3">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide font-body" style={{ color: colors.textMuted }}>{t('realty.directory.keyword')}</span>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={17} style={{ color: colors.textMuted }} />
                    <input
                        value={filters.search}
                        onChange={event => updateFilter('search', event.target.value)}
                        placeholder={t('realty.directory.searchPlaceholder')}
                        className={`${fieldBaseClass} pl-10`}
                        style={fieldStyle}
                    />
                </div>
            </label>

            <label className="lg:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide font-body" style={{ color: colors.textMuted }}>{t('realty.directory.city')}</span>
                <input
                    value={filters.city}
                    onChange={event => updateFilter('city', event.target.value)}
                    placeholder={t('realty.directory.cityPlaceholder')}
                    className={fieldBaseClass}
                    style={fieldStyle}
                />
            </label>

            <label className="lg:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide font-body" style={{ color: colors.textMuted }}>{t('realty.directory.propertyType')}</span>
                <select
                    value={filters.propertyType}
                    onChange={event => updateFilter('propertyType', event.target.value as RealtyPropertyType | 'all')}
                    className={fieldBaseClass}
                    style={fieldStyle}
                >
                    <option value="all">{t('realty.directory.allTypes')}</option>
                    {realtyPropertyTypes.map(type => (
                        <option key={type} value={type}>{t(`realty.propertyTypes.${type}`)}</option>
                    ))}
                </select>
            </label>

            <label className="lg:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide font-body" style={{ color: colors.textMuted }}>{t('realty.directory.transactionType')}</span>
                <select
                    value={filters.transactionType}
                    onChange={event => updateFilter('transactionType', event.target.value as TransactionType | 'all')}
                    className={fieldBaseClass}
                    style={fieldStyle}
                >
                    <option value="all">{t('realty.directory.allTransactions')}</option>
                    {transactionTypes.map(type => (
                        <option key={type} value={type}>{t(`realty.transactionTypes.${type}`)}</option>
                    ))}
                </select>
            </label>

            <label className="lg:col-span-3">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide font-body" style={{ color: colors.textMuted }}>{t('realty.directory.sort')}</span>
                <select
                    value={filters.sort}
                    onChange={event => updateFilter('sort', event.target.value as PublicRealtySort)}
                    className={fieldBaseClass}
                    style={fieldStyle}
                >
                    {sortOptions.map(option => (
                        <option key={option} value={option}>{t(`realty.directory.sortOptions.${option}`)}</option>
                    ))}
                </select>
            </label>

            <label className="lg:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide font-body" style={{ color: colors.textMuted }}>{t('realty.directory.minPrice')}</span>
                <input
                    value={filters.minPrice}
                    onChange={event => updateFilter('minPrice', event.target.value)}
                    type="number"
                    min="0"
                    inputMode="numeric"
                    className={fieldBaseClass}
                    style={fieldStyle}
                />
            </label>

            <label className="lg:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide font-body" style={{ color: colors.textMuted }}>{t('realty.directory.maxPrice')}</span>
                <input
                    value={filters.maxPrice}
                    onChange={event => updateFilter('maxPrice', event.target.value)}
                    type="number"
                    min="0"
                    inputMode="numeric"
                    className={fieldBaseClass}
                    style={fieldStyle}
                />
            </label>

            <label className="lg:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide font-body" style={{ color: colors.textMuted }}>{t('realty.directory.bedrooms')}</span>
                <input
                    value={filters.bedrooms}
                    onChange={event => updateFilter('bedrooms', event.target.value)}
                    placeholder={t('realty.directory.anyBeds')}
                    type="number"
                    min="0"
                    inputMode="numeric"
                    className={fieldBaseClass}
                    style={fieldStyle}
                />
            </label>

            <label className="lg:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide font-body" style={{ color: colors.textMuted }}>{t('realty.directory.bathrooms')}</span>
                <input
                    value={filters.bathrooms}
                    onChange={event => updateFilter('bathrooms', event.target.value)}
                    placeholder={t('realty.directory.anyBaths')}
                    type="number"
                    min="0"
                    inputMode="numeric"
                    className={fieldBaseClass}
                    style={fieldStyle}
                />
            </label>

            <label className="flex h-11 items-center gap-3 self-end rounded-md border px-3 lg:col-span-2" style={fieldStyle}>
                <input
                    type="checkbox"
                    checked={filters.featuredOnly}
                    onChange={event => updateFilter('featuredOnly', event.target.checked)}
                    className="h-4 w-4 accent-current"
                    style={{ color: colors.accent }}
                />
                <span className="text-sm font-semibold font-body">{t('realty.directory.featuredOnly')}</span>
            </label>

            <button
                type="button"
                onClick={clearFilters}
                className={`inline-flex h-11 items-center justify-center gap-2 border px-3 text-sm font-semibold font-button transition-opacity hover:opacity-80 lg:col-span-2 ${buttonRadius}`}
                style={{ borderColor: colors.border, color: colors.accent, backgroundColor: 'transparent' }}
            >
                <RotateCcw size={15} />
                {t('realty.directory.clearFilters')}
            </button>
        </div>
    );

    const renderStats = (property: RealtyProperty) => (
        <div className="grid grid-cols-3 gap-2 text-sm font-body" style={{ color: colors.textMuted }}>
            <span className="inline-flex min-w-0 items-center gap-1"><BedDouble size={15} />{property.bedrooms || 0}</span>
            <span className="inline-flex min-w-0 items-center gap-1"><Bath size={15} />{property.bathrooms || 0}</span>
            <span className="inline-flex min-w-0 items-center gap-1"><Ruler size={15} />{(property.area || 0).toLocaleString(i18n.language)}</span>
        </div>
    );

    const renderImage = (property: RealtyProperty, compact = false) => {
        const image = getPropertyImage(property);
        return (
            <div className={`relative overflow-hidden ${compact ? 'aspect-[4/3] md:h-full md:aspect-auto' : 'aspect-[4/3]'}`} style={{ backgroundColor: colors.border }}>
                {image ? (
                    <img src={image} alt={property.images?.[0]?.altText || property.title} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center" style={{ color: colors.textMuted }}>
                        <Home size={42} />
                    </div>
                )}
                {property.isFeatured && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold font-body" style={{ backgroundColor: colors.badgeBackground, color: colors.badgeText }}>
                        <Star size={13} />
                        {t('realty.website.featured')}
                    </span>
                )}
            </div>
        );
    };

    const renderChips = (property: RealtyProperty) => (
        <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border px-3 py-1 text-xs font-semibold font-body" style={{ borderColor: colors.border, color: colors.textMuted }}>
                {t(`realty.propertyTypes.${property.propertyType}`)}
            </span>
            <span className="rounded-full px-3 py-1 text-xs font-semibold font-body" style={{ backgroundColor: colors.secondary, color: colors.buttonText }}>
                {t(`realty.transactionTypes.${property.transactionType || 'sale'}`)}
            </span>
        </div>
    );

    const renderGridCard = (property: RealtyProperty, index: number) => {
        const animationClass = getAnimationClass(animationType, animationEnabled);
        return (
            <article
                key={property.id}
                className={`overflow-hidden border transition-transform duration-300 hover:-translate-y-1 ${cardRadius} ${animationClass}`}
                style={{
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    animationDelay: animationClass ? getAnimationDelay(index) : undefined,
                }}
            >
                <button type="button" className="block w-full text-left" onClick={() => goToProperty(property)}>
                    {renderImage(property)}
                </button>
                <div className="p-5">
                    <p className="text-2xl font-bold font-header" style={{ color: colors.priceColor }}>
                        {formatRealtyPrice(property.price, i18n.language, property.currency)}
                    </p>
                    <h2 className="mt-2 line-clamp-2 text-xl font-semibold font-header" style={{ color: colors.accent }}>
                        {property.title}
                    </h2>
                    <p className="mt-2 flex items-start gap-2 text-sm font-body" style={{ color: colors.textMuted }}>
                        <MapPin size={15} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{getLocationLabel(property)}</span>
                    </p>
                    {renderChips(property)}
                    <div className="mt-4">{renderStats(property)}</div>
                    <p className="mt-4 line-clamp-3 text-sm leading-6 font-body" style={{ color: colors.text }}>
                        {getShortDescription(property)}
                    </p>
                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => goToProperty(property)}
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold font-button transition-opacity hover:opacity-90 ${buttonRadius}`}
                            style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}
                        >
                            <Eye size={16} />
                            {t('realty.directory.viewDetails')}
                        </button>
                        <button
                            type="button"
                            onClick={() => goToProperty(property)}
                            className={`inline-flex items-center justify-center gap-2 border px-4 py-2.5 text-sm font-semibold font-button transition-opacity hover:opacity-80 ${buttonRadius}`}
                            style={{ borderColor: colors.border, color: colors.accent }}
                        >
                            {t('realty.directory.contact')}
                        </button>
                    </div>
                </div>
            </article>
        );
    };

    const renderListCard = (property: RealtyProperty, index: number) => {
        const animationClass = getAnimationClass(animationType, animationEnabled);
        return (
            <article
                key={property.id}
                className={`grid gap-4 overflow-hidden border p-3 transition-transform duration-300 hover:-translate-y-0.5 md:grid-cols-[260px_minmax(0,1fr)_220px] ${cardRadius} ${animationClass}`}
                style={{
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    animationDelay: animationClass ? getAnimationDelay(index) : undefined,
                }}
            >
                <button type="button" className="text-left" onClick={() => goToProperty(property)}>
                    {renderImage(property, true)}
                </button>
                <div className="min-w-0 p-1">
                    <div className="flex flex-wrap items-center gap-2">
                        {property.isFeatured && (
                            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold font-body" style={{ backgroundColor: colors.badgeBackground, color: colors.badgeText }}>
                                <Star size={13} />
                                {t('realty.website.featured')}
                            </span>
                        )}
                    </div>
                    <h2 className="mt-2 text-xl font-semibold font-header" style={{ color: colors.accent }}>
                        {property.title}
                    </h2>
                    <p className="mt-2 flex items-start gap-2 text-sm font-body" style={{ color: colors.textMuted }}>
                        <MapPin size={15} className="mt-0.5 shrink-0" />
                        <span>{getLocationLabel(property)}</span>
                    </p>
                    {renderChips(property)}
                    <p className="mt-4 line-clamp-2 text-sm leading-6 font-body" style={{ color: colors.text }}>
                        {getShortDescription(property)}
                    </p>
                    <div className="mt-4 max-w-md">{renderStats(property)}</div>
                </div>
                <div className="flex flex-col justify-between gap-4 p-1 md:items-end">
                    <p className="text-2xl font-bold font-header" style={{ color: colors.priceColor }}>
                        {formatRealtyPrice(property.price, i18n.language, property.currency)}
                    </p>
                    <div className="grid w-full gap-2">
                        <button
                            type="button"
                            onClick={() => goToProperty(property)}
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold font-button transition-opacity hover:opacity-90 ${buttonRadius}`}
                            style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}
                        >
                            <Eye size={16} />
                            {t('realty.directory.viewDetails')}
                        </button>
                        <button
                            type="button"
                            onClick={() => goToProperty(property)}
                            className={`inline-flex items-center justify-center gap-2 border px-4 py-2.5 text-sm font-semibold font-button transition-opacity hover:opacity-80 ${buttonRadius}`}
                            style={{ borderColor: colors.border, color: colors.accent }}
                        >
                            {t('realty.directory.contact')}
                        </button>
                    </div>
                </div>
            </article>
        );
    };

    return (
        <section className="min-h-screen w-full font-body" style={{ backgroundColor: colors.background, color: colors.text }}>
            <div className="border-b" style={{ borderColor: colors.border, backgroundColor: colors.background }}>
                <div className="mx-auto max-w-7xl px-4 pb-10 pt-12 md:px-6 md:pb-14 md:pt-16">
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
                        <div className="max-w-3xl">
                            <p className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide font-body" style={{ borderColor: colors.border, color: colors.accent }}>
                                <Sparkles size={14} />
                                {t('realty.website.eyebrow')}
                            </p>
                            <h1 className="text-4xl font-bold leading-tight font-header md:text-5xl" style={{ color: colors.heading }}>
                                {data.title || t('realty.directory.heroTitle')}
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-7 font-body md:text-lg" style={{ color: colors.textMuted }}>
                                {data.subtitle || t('realty.directory.heroSubtitle')}
                            </p>
                        </div>
                        <div className={`border p-5 ${cardRadius}`} style={mutedPanelStyle}>
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-md" style={{ backgroundColor: colors.accent, color: colors.buttonText }}>
                                    <Home size={20} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold font-header" style={{ color: colors.heading }}>{totalCount}</p>
                                    <p className="text-sm font-body" style={{ color: colors.textMuted }}>{t('realty.directory.availableListings')}</p>
                                </div>
                            </div>
                            <div className="mt-5 border-t pt-4" style={{ borderColor: colors.border }}>
                                <p className="text-sm leading-6 font-body" style={{ color: colors.textMuted }}>{t('realty.directory.mapComingSoon')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="sticky top-0 z-20 border-b backdrop-blur-xl" style={{ borderColor: colors.border, backgroundColor: colorWithAlpha(colors.background, 0.95, colors.background) }}>
                <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowMobileFilters(prev => !prev)}
                                className={`inline-flex items-center justify-center gap-2 border px-3 py-2 text-sm font-semibold font-button lg:hidden ${buttonRadius}`}
                                style={{ borderColor: colors.border, color: colors.text }}
                            >
                                {showMobileFilters ? <X size={16} /> : <SlidersHorizontal size={16} />}
                                {t('realty.directory.mobileFilters')}
                            </button>
                            <button
                                type="button"
                                disabled
                                title={t('realty.directory.mapComingSoon')}
                                className={`inline-flex cursor-not-allowed items-center justify-center gap-2 border px-3 py-2 text-sm font-semibold opacity-60 font-button ${buttonRadius}`}
                                style={{ borderColor: colors.border, color: colors.textMuted }}
                            >
                                <Map size={16} />
                                {t('realty.directory.map')}
                            </button>
                        </div>
                        <div className="flex items-center justify-between gap-3 lg:justify-end">
                            <p className="text-sm font-semibold font-body" style={{ color: colors.textMuted }}>
                                {t('realty.directory.resultCount', { count: totalCount })}
                            </p>
                            <div className="flex rounded-md border p-1" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                                <button
                                    type="button"
                                    aria-label={t('realty.directory.gridView')}
                                    onClick={() => setViewMode('grid')}
                                    className="rounded px-3 py-2 transition-colors"
                                    style={{ backgroundColor: viewMode === 'grid' ? colors.accent : 'transparent', color: viewMode === 'grid' ? colors.buttonText : colors.textMuted }}
                                >
                                    <Grid3X3 size={16} />
                                </button>
                                <button
                                    type="button"
                                    aria-label={t('realty.directory.listView')}
                                    onClick={() => setViewMode('list')}
                                    className="rounded px-3 py-2 transition-colors"
                                    style={{ backgroundColor: viewMode === 'list' ? colors.accent : 'transparent', color: viewMode === 'list' ? colors.buttonText : colors.textMuted }}
                                >
                                    <List size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className={`${showMobileFilters ? 'mt-4 block' : 'hidden'} lg:mt-4 lg:block`}>
                        {filterPanel}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
                {!hasDirectoryAccess ? (
                    <div className={`border p-8 text-center ${cardRadius}`} style={mutedPanelStyle}>
                        <Filter className="mx-auto mb-3" size={28} style={{ color: colors.textMuted }} />
                        <h2 className="text-2xl font-bold font-header" style={{ color: colors.heading }}>{t('realty.directory.unavailableTitle')}</h2>
                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 font-body" style={{ color: colors.textMuted }}>{t('realty.directory.unavailableDescription')}</p>
                    </div>
                ) : error ? (
                    <div className={`border p-8 text-center ${cardRadius}`} style={mutedPanelStyle}>
                        <h2 className="text-2xl font-bold font-header" style={{ color: colors.heading }}>{t('realty.directory.errorTitle')}</h2>
                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 font-body" style={{ color: colors.textMuted }}>{error}</p>
                        <button
                            type="button"
                            onClick={() => { void refetch(); }}
                            className={`mt-5 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold font-button ${buttonRadius}`}
                            style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}
                        >
                            <RotateCcw size={15} />
                            {t('realty.directory.retry')}
                        </button>
                    </div>
                ) : isLoading && properties.length === 0 ? (
                    <div className={viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
                        {[0, 1, 2, 3, 4, 5].map(item => (
                            <div key={item} className={`h-96 animate-pulse border ${cardRadius}`} style={{ borderColor: colors.border, backgroundColor: colors.surface }} />
                        ))}
                    </div>
                ) : properties.length === 0 ? (
                    <div className={`border p-8 text-center ${cardRadius}`} style={mutedPanelStyle}>
                        <Search className="mx-auto mb-3" size={28} style={{ color: colors.textMuted }} />
                        <h2 className="text-2xl font-bold font-header" style={{ color: colors.heading }}>{t('realty.directory.emptyTitle')}</h2>
                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 font-body" style={{ color: colors.textMuted }}>{t('realty.directory.emptyDescription')}</p>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className={`mt-5 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold font-button ${buttonRadius}`}
                            style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}
                        >
                            <RotateCcw size={15} />
                            {t('realty.directory.clearFilters')}
                        </button>
                    </div>
                ) : (
                    <>
                        {showFeaturedSection && (
                            <div className="mb-10">
                                <div className="mb-4 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide font-body" style={{ color: colors.accent }}>
                                            <Star size={15} />
                                            {t('realty.directory.featuredSection')}
                                        </p>
                                        <h2 className="mt-1 text-2xl font-bold font-header" style={{ color: colors.heading }}>{t('realty.directory.featuredTitle')}</h2>
                                    </div>
                                </div>
                                <div className="grid gap-6 md:grid-cols-3">
                                    {featuredProperties.map((property, index) => renderGridCard(property, index))}
                                </div>
                            </div>
                        )}

                        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                            <div>
                                <h2 className="text-2xl font-bold font-header" style={{ color: colors.heading }}>{t('realty.directory.allListings')}</h2>
                                <p className="mt-1 text-sm font-body" style={{ color: colors.textMuted }}>
                                    {filtersApplied ? t('realty.directory.filtersApplied') : t('realty.directory.browseAll')}
                                </p>
                            </div>
                            {filtersApplied && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className={`inline-flex items-center justify-center gap-2 border px-3 py-2 text-sm font-semibold font-button transition-opacity hover:opacity-80 ${buttonRadius}`}
                                    style={{ borderColor: colors.border, color: colors.accent }}
                                >
                                    <RotateCcw size={15} />
                                    {t('realty.directory.clearFilters')}
                                </button>
                            )}
                        </div>

                        {viewMode === 'grid' ? (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {properties.map((property, index) => renderGridCard(property, index))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {properties.map((property, index) => renderListCard(property, index))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default PublicRealtyDirectory;
