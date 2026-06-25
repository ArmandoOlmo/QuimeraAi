import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Bath,
    BedDouble,
    ChevronDown,
    CircleAlert,
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
import { formatRealtyPrice, realtyPropertyTypes, resolveRealtyWebsiteColors } from '../../utils/realty';
import { getAnimationClass, getAnimationDelay } from '../../utils/animations';
import { getRealtyRouteSegments, resolveRealtyDetailPath } from '../../utils/realtyWebsiteRoutes';
import AppSelect from '../ui/AppSelect';

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

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const directoryInputClass = 'h-10 w-full rounded-md border border-[var(--realty-border-soft)] bg-[var(--realty-surface-soft)] px-3 text-sm font-body text-[var(--realty-text)] outline-none transition-colors placeholder:text-[var(--realty-muted)] focus:border-[var(--realty-accent)] focus:ring-2 focus:ring-[var(--realty-accent-soft)]';

interface DirectoryPanelProps {
    children: React.ReactNode;
    className?: string;
    radiusClass?: string;
}

const DirectoryPanel = ({ children, className, radiusClass = 'rounded-xl' }: DirectoryPanelProps) => (
    <div
        className={cx(
            'border border-[var(--realty-border-soft)] bg-[var(--realty-surface-soft)] shadow-[0_18px_60px_-36px_rgba(0,0,0,0.55)] backdrop-blur-2xl',
            radiusClass,
            className
        )}
    >
        {children}
    </div>
);

interface DirectoryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    radiusClass?: string;
}

const DirectoryButton = ({
    children,
    className,
    radiusClass = 'rounded-md',
    variant = 'secondary',
    type = 'button',
    ...props
}: DirectoryButtonProps) => {
    const variants = {
        primary: 'border border-transparent bg-[var(--realty-button)] text-[var(--realty-button-text)] shadow-[0_14px_30px_-20px_var(--realty-button)] hover:brightness-105',
        secondary: 'border border-[var(--realty-border-soft)] bg-[var(--realty-surface-soft)] text-[var(--realty-text)] hover:border-[var(--realty-accent)] hover:bg-[var(--realty-surface-strong)]',
        ghost: 'border border-transparent bg-transparent text-[var(--realty-muted)] hover:bg-[var(--realty-accent-soft)] hover:text-[var(--realty-text)]',
    };

    return (
        <button
            type={type}
            className={cx(
                'inline-flex h-10 items-center justify-center gap-2 px-3 text-sm font-semibold font-button transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--realty-accent-soft)] disabled:pointer-events-none disabled:opacity-55',
                variants[variant],
                radiusClass,
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};

interface DirectoryInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
    label: string;
    icon?: React.ElementType;
    className?: string;
    inputClassName?: string;
}

const DirectoryInput = ({ label, icon: Icon, className, inputClassName, ...props }: DirectoryInputProps) => (
    <label className={cx('block min-w-0', className)}>
        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] font-body text-[var(--realty-muted)]">{label}</span>
        <span className="relative block">
            {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--realty-muted)]" size={16} />}
            <input
                className={cx(directoryInputClass, Icon && 'pl-9', inputClassName)}
                {...props}
            />
        </span>
    </label>
);

interface DirectorySelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
    label: string;
    className?: string;
    selectClassName?: string;
}

const DirectorySelect = ({ label, className, selectClassName, children, ...props }: DirectorySelectProps) => (
    <label className={cx('block min-w-0', className)}>
        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] font-body text-[var(--realty-muted)]">{label}</span>
        <span className="relative block">
            <AppSelect
                className={cx(directoryInputClass, 'appearance-none pr-9', selectClassName)}
                {...props}
            >
                {children}
            </AppSelect>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--realty-muted)]" size={15} />
        </span>
    </label>
);

interface DirectoryChipProps {
    children: React.ReactNode;
    variant?: 'outline' | 'accent' | 'soft';
    className?: string;
}

const DirectoryChip = ({ children, variant = 'outline', className }: DirectoryChipProps) => (
    <span
        className={cx(
            'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold uppercase tracking-[0.06em] font-body',
            variant === 'accent' && 'bg-[var(--realty-accent)] text-[var(--realty-badge-text)]',
            variant === 'soft' && 'bg-[var(--realty-accent-soft)] text-[var(--realty-accent)]',
            variant === 'outline' && 'border border-[var(--realty-border-soft)] text-[var(--realty-muted)]',
            className
        )}
    >
        {children}
    </span>
);

const getPreviewBasePath = (data?: RealtyListingsSectionData) => {
    if (typeof window === 'undefined') return '';
    const pathname = window.location.pathname;
    if (!pathname.startsWith('/preview/')) return '';
    const parts = pathname.replace('/preview/', '').split('/').filter(Boolean);
    const routeSegments = new Set([...previewLogicalRouteSegments, ...getRealtyRouteSegments(data)]);
    if (parts.length === 0) return '/preview';
    if (parts.length === 1) return `/preview/${parts[0]}`;
    if (routeSegments.has(parts[1])) return `/preview/${parts[0]}`;
    return `/preview/${parts[0]}/${parts[1]}`;
};

const navigateTo = (path: string, data?: RealtyListingsSectionData) => {
    if (typeof window === 'undefined') return;
    const fullPath = `${getPreviewBasePath(data)}${path}`;
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
        const path = resolveRealtyDetailPath(data, property.slug);
        if (onNavigate) onNavigate(path);
        else navigateTo(path, data);
    }, [data, onNavigate]);

    const featuredProperties = useMemo(
        () => properties.filter(property => property.isFeatured).slice(0, 3),
        [properties]
    );

    const hasDirectoryAccess = flags.real_estate_enabled && flags.real_estate_public_directory_enabled;
    const showFeaturedSection = !filtersApplied && featuredProperties.length > 0;

    const directoryThemeStyle = {
        '--realty-bg': colors.background,
        '--realty-bg-sticky': `color-mix(in srgb, ${colors.background} 92%, transparent)`,
        '--realty-surface': colors.surface,
        '--realty-card': colors.cardBackground,
        '--realty-surface-soft': `color-mix(in srgb, ${colors.surface} 86%, transparent)`,
        '--realty-surface-strong': `color-mix(in srgb, ${colors.surface} 96%, transparent)`,
        '--realty-border': colors.border,
        '--realty-border-soft': `color-mix(in srgb, ${colors.border} 74%, transparent)`,
        '--realty-text': colors.text,
        '--realty-muted': colors.textMuted,
        '--realty-heading': colors.heading,
        '--realty-accent': colors.accent,
        '--realty-accent-soft': `color-mix(in srgb, ${colors.accent} 16%, transparent)`,
        '--realty-secondary': colors.secondary,
        '--realty-button': colors.buttonBackground,
        '--realty-button-text': colors.buttonText,
        '--realty-badge-text': colors.badgeText,
        '--realty-price': colors.priceColor,
        backgroundColor: colors.background,
        color: colors.text,
    } as React.CSSProperties;

    const filterPanel = (
        <div className="grid gap-3 lg:grid-cols-12">
            <DirectoryInput
                label={t('realty.directory.keyword')}
                icon={Search}
                value={filters.search}
                onChange={event => updateFilter('search', event.target.value)}
                placeholder={t('realty.directory.searchPlaceholder')}
                className="lg:col-span-4"
            />

            <DirectoryInput
                label={t('realty.directory.city')}
                value={filters.city}
                onChange={event => updateFilter('city', event.target.value)}
                placeholder={t('realty.directory.cityPlaceholder')}
                className="lg:col-span-2"
            />

            <DirectorySelect
                label={t('realty.directory.propertyType')}
                value={filters.propertyType}
                onChange={event => updateFilter('propertyType', event.target.value as RealtyPropertyType | 'all')}
                className="lg:col-span-2"
            >
                <option value="all">{t('realty.directory.allTypes')}</option>
                {realtyPropertyTypes.map(type => (
                    <option key={type} value={type}>{t(`realty.propertyTypes.${type}`)}</option>
                ))}
            </DirectorySelect>

            <DirectorySelect
                label={t('realty.directory.transactionType')}
                value={filters.transactionType}
                onChange={event => updateFilter('transactionType', event.target.value as TransactionType | 'all')}
                className="lg:col-span-2"
            >
                <option value="all">{t('realty.directory.allTransactions')}</option>
                {transactionTypes.map(type => (
                    <option key={type} value={type}>{t(`realty.transactionTypes.${type}`)}</option>
                ))}
            </DirectorySelect>

            <DirectorySelect
                label={t('realty.directory.sort')}
                value={filters.sort}
                onChange={event => updateFilter('sort', event.target.value as PublicRealtySort)}
                className="lg:col-span-2"
            >
                {sortOptions.map(option => (
                    <option key={option} value={option}>{t(`realty.directory.sortOptions.${option}`)}</option>
                ))}
            </DirectorySelect>

            <DirectoryInput
                label={t('realty.directory.minPrice')}
                value={filters.minPrice}
                onChange={event => updateFilter('minPrice', event.target.value)}
                type="number"
                min="0"
                inputMode="numeric"
                className="lg:col-span-2"
            />

            <DirectoryInput
                label={t('realty.directory.maxPrice')}
                value={filters.maxPrice}
                onChange={event => updateFilter('maxPrice', event.target.value)}
                type="number"
                min="0"
                inputMode="numeric"
                className="lg:col-span-2"
            />

            <DirectoryInput
                label={t('realty.directory.bedrooms')}
                value={filters.bedrooms}
                onChange={event => updateFilter('bedrooms', event.target.value)}
                placeholder={t('realty.directory.anyBeds')}
                type="number"
                min="0"
                inputMode="numeric"
                className="lg:col-span-2"
            />

            <DirectoryInput
                label={t('realty.directory.bathrooms')}
                value={filters.bathrooms}
                onChange={event => updateFilter('bathrooms', event.target.value)}
                placeholder={t('realty.directory.anyBaths')}
                type="number"
                min="0"
                inputMode="numeric"
                className="lg:col-span-2"
            />

            <label className="flex h-10 items-center gap-3 self-end rounded-md border border-[var(--realty-border-soft)] bg-[var(--realty-surface-soft)] px-3 text-[var(--realty-text)] lg:col-span-2">
                <input
                    type="checkbox"
                    checked={filters.featuredOnly}
                    onChange={event => updateFilter('featuredOnly', event.target.checked)}
                    className="peer sr-only"
                />
                <span className="relative h-4 w-8 rounded-full bg-[var(--realty-border-soft)] transition-colors peer-checked:bg-[var(--realty-accent)] after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
                <span className="text-sm font-semibold font-body">{t('realty.directory.featuredOnly')}</span>
            </label>

            <DirectoryButton
                onClick={clearFilters}
                variant="ghost"
                radiusClass={buttonRadius}
                className="self-end lg:col-span-2"
            >
                <RotateCcw size={15} />
                {t('realty.directory.clearFilters')}
            </DirectoryButton>
        </div>
    );

    const renderStats = (property: RealtyProperty) => (
        <div className="grid grid-cols-3 gap-2 text-sm font-semibold font-body text-[var(--realty-muted)]">
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-[var(--realty-surface-soft)] px-2 py-1"><BedDouble size={14} />{property.bedrooms || 0}</span>
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-[var(--realty-surface-soft)] px-2 py-1"><Bath size={14} />{property.bathrooms || 0}</span>
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-[var(--realty-surface-soft)] px-2 py-1"><Ruler size={14} />{(property.area || 0).toLocaleString(i18n.language)}</span>
        </div>
    );

    const renderImage = (property: RealtyProperty, compact = false) => {
        const image = getPropertyImage(property);
        return (
            <div className={cx('relative overflow-hidden bg-[var(--realty-surface-strong)]', compact ? 'aspect-[4/3] md:h-full md:aspect-auto' : 'aspect-[4/3]')}>
                {image ? (
                    <img src={image} alt={property.images?.[0]?.altText || property.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" loading="lazy" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--realty-muted)]">
                        <Home size={38} />
                    </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" />
                {property.isFeatured && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[var(--realty-accent)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] font-body text-[var(--realty-badge-text)]">
                        <Star size={13} />
                        {t('realty.website.featured')}
                    </span>
                )}
            </div>
        );
    };

    const renderChips = (property: RealtyProperty) => (
        <div className="mt-3 flex flex-wrap gap-2">
            <DirectoryChip>{t(`realty.propertyTypes.${property.propertyType}`)}</DirectoryChip>
            <DirectoryChip variant="soft">{t(`realty.transactionTypes.${property.transactionType || 'sale'}`)}</DirectoryChip>
        </div>
    );

    const renderGridCard = (property: RealtyProperty, index: number) => {
        const animationClass = getAnimationClass(animationType, animationEnabled);
        return (
            <article
                key={property.id}
                className={cx(
                    'group overflow-hidden border border-[var(--realty-border-soft)] bg-[var(--realty-card)] shadow-[0_16px_44px_-34px_rgba(0,0,0,0.65)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--realty-accent)] hover:shadow-[0_24px_70px_-42px_rgba(0,0,0,0.8)]',
                    cardRadius,
                    animationClass
                )}
                style={{
                    animationDelay: animationClass ? getAnimationDelay(index) : undefined,
                }}
            >
                <button type="button" className="block w-full text-left" onClick={() => goToProperty(property)}>
                    {renderImage(property)}
                </button>
                <div className="p-5">
                    <p className="text-xl font-bold font-header text-[var(--realty-price)] md:text-2xl">
                        {formatRealtyPrice(property.price, i18n.language, property.currency)}
                    </p>
                    <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-snug font-header text-[var(--realty-accent)] md:text-xl">
                        {property.title}
                    </h2>
                    <p className="mt-2 flex items-start gap-2 text-sm leading-5 font-body text-[var(--realty-muted)]">
                        <MapPin size={15} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{getLocationLabel(property)}</span>
                    </p>
                    {renderChips(property)}
                    <div className="mt-4">{renderStats(property)}</div>
                    <p className="mt-4 line-clamp-3 text-sm leading-6 font-body text-[var(--realty-text)]">
                        {getShortDescription(property)}
                    </p>
                    <DirectoryButton
                        onClick={() => goToProperty(property)}
                        variant="primary"
                        radiusClass={buttonRadius}
                        className="mt-5 w-full"
                    >
                        <Eye size={16} />
                        {t('realty.directory.viewDetails')}
                    </DirectoryButton>
                </div>
            </article>
        );
    };

    const renderListCard = (property: RealtyProperty, index: number) => {
        const animationClass = getAnimationClass(animationType, animationEnabled);
        return (
            <article
                key={property.id}
                className={cx(
                    'group grid gap-4 overflow-hidden border border-[var(--realty-border-soft)] bg-[var(--realty-card)] p-3 shadow-[0_16px_44px_-36px_rgba(0,0,0,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--realty-accent)] md:grid-cols-[240px_minmax(0,1fr)_190px]',
                    cardRadius,
                    animationClass
                )}
                style={{
                    animationDelay: animationClass ? getAnimationDelay(index) : undefined,
                }}
            >
                <button type="button" className="text-left" onClick={() => goToProperty(property)}>
                    {renderImage(property, true)}
                </button>
                <div className="min-w-0 p-1">
                    <div className="flex flex-wrap items-center gap-2">
                        {property.isFeatured && (
                            <DirectoryChip variant="accent">
                                <Star size={13} />
                                {t('realty.website.featured')}
                            </DirectoryChip>
                        )}
                    </div>
                    <h2 className="mt-2 line-clamp-2 text-xl font-bold leading-snug font-header text-[var(--realty-accent)]">
                        {property.title}
                    </h2>
                    <p className="mt-2 flex items-start gap-2 text-sm leading-5 font-body text-[var(--realty-muted)]">
                        <MapPin size={15} className="mt-0.5 shrink-0" />
                        <span>{getLocationLabel(property)}</span>
                    </p>
                    {renderChips(property)}
                    <p className="mt-4 line-clamp-2 text-sm leading-6 font-body text-[var(--realty-text)]">
                        {getShortDescription(property)}
                    </p>
                    <div className="mt-4 max-w-md">{renderStats(property)}</div>
                </div>
                <div className="flex flex-col justify-between gap-4 p-1 md:items-end">
                    <p className="text-2xl font-bold font-header text-[var(--realty-price)]">
                        {formatRealtyPrice(property.price, i18n.language, property.currency)}
                    </p>
                    <DirectoryButton
                        onClick={() => goToProperty(property)}
                        variant="primary"
                        radiusClass={buttonRadius}
                        className="w-full"
                    >
                        <Eye size={16} />
                        {t('realty.directory.viewDetails')}
                    </DirectoryButton>
                </div>
            </article>
        );
    };

    return (
        <section
            className="min-h-screen w-full bg-[var(--realty-bg)] font-body text-[var(--realty-text)]"
            style={directoryThemeStyle}
        >
            <div className="border-b border-[var(--realty-border-soft)]">
                <div className="mx-auto max-w-7xl px-4 pb-10 pt-10 md:px-6 md:pb-12 md:pt-14">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
                        <div className="max-w-3xl">
                            <p className="mb-4 inline-flex h-8 items-center gap-2 rounded-full border border-[var(--realty-border-soft)] bg-[var(--realty-surface-soft)] px-3 text-[11px] font-bold uppercase tracking-[0.08em] font-body text-[var(--realty-accent)]">
                                <Sparkles size={14} />
                                {t('realty.directory.badge')}
                            </p>
                            <h1 className="max-w-3xl text-3xl font-bold leading-tight font-header text-[var(--realty-heading)] md:text-5xl">
                                {data.title || t('realty.directory.heroTitle')}
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-7 font-body text-[var(--realty-muted)]">
                                {data.subtitle || t('realty.directory.heroSubtitle')}
                            </p>
                        </div>

                        <DirectoryPanel radiusClass={cardRadius} className="p-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--realty-accent)] text-[var(--realty-badge-text)]">
                                    <Home size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-3xl font-bold leading-none font-header text-[var(--realty-heading)]">{totalCount}</p>
                                    <p className="mt-1 text-sm font-semibold font-body text-[var(--realty-muted)]">{t('realty.directory.availableListings')}</p>
                                </div>
                            </div>
                            <div className="mt-5 border-t border-[var(--realty-border-soft)] pt-4">
                                <p className="text-sm leading-6 font-body text-[var(--realty-muted)]">{t('realty.directory.mapComingSoon')}</p>
                            </div>
                        </DirectoryPanel>
                    </div>
                </div>
            </div>

            <div className="sticky top-0 z-20 border-b border-[var(--realty-border-soft)] bg-[var(--realty-bg-sticky)] backdrop-blur-2xl">
                <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
                    <DirectoryPanel radiusClass="rounded-xl" className="p-3 md:p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                                <DirectoryButton
                                    onClick={() => setShowMobileFilters(prev => !prev)}
                                    radiusClass={buttonRadius}
                                    className="lg:hidden"
                                >
                                    {showMobileFilters ? <X size={16} /> : <SlidersHorizontal size={16} />}
                                    {t('realty.directory.mobileFilters')}
                                </DirectoryButton>
                                <DirectoryButton
                                    disabled
                                    title={t('realty.directory.mapComingSoon')}
                                    variant="ghost"
                                    radiusClass={buttonRadius}
                                    className="cursor-not-allowed"
                                >
                                    <Map size={16} />
                                    {t('realty.directory.map')}
                                </DirectoryButton>
                            </div>

                            <div className="flex items-center justify-between gap-3 lg:justify-end">
                                <p className="text-sm font-semibold font-body text-[var(--realty-muted)]">
                                    {t('realty.directory.resultCount', { count: totalCount })}
                                </p>
                                <div className="flex rounded-md border border-[var(--realty-border-soft)] bg-[var(--realty-surface-soft)] p-1">
                                    <button
                                        type="button"
                                        aria-label={t('realty.directory.gridView')}
                                        onClick={() => setViewMode('grid')}
                                        className={cx(
                                            'inline-flex h-8 w-9 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--realty-accent-soft)]',
                                            viewMode === 'grid'
                                                ? 'bg-[var(--realty-accent)] text-[var(--realty-badge-text)]'
                                                : 'text-[var(--realty-muted)] hover:bg-[var(--realty-accent-soft)] hover:text-[var(--realty-text)]'
                                        )}
                                    >
                                        <Grid3X3 size={15} />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={t('realty.directory.listView')}
                                        onClick={() => setViewMode('list')}
                                        className={cx(
                                            'inline-flex h-8 w-9 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--realty-accent-soft)]',
                                            viewMode === 'list'
                                                ? 'bg-[var(--realty-accent)] text-[var(--realty-badge-text)]'
                                                : 'text-[var(--realty-muted)] hover:bg-[var(--realty-accent-soft)] hover:text-[var(--realty-text)]'
                                        )}
                                    >
                                        <List size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className={cx(showMobileFilters ? 'mt-4 block' : 'hidden', 'lg:mt-4 lg:block')}>
                            {filterPanel}
                        </div>
                    </DirectoryPanel>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
                {!hasDirectoryAccess ? (
                    <DirectoryPanel radiusClass={cardRadius} className="p-8 text-center">
                        <Filter className="mx-auto mb-3 text-[var(--realty-muted)]" size={28} />
                        <h2 className="text-2xl font-bold font-header text-[var(--realty-heading)]">{t('realty.directory.unavailableTitle')}</h2>
                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 font-body text-[var(--realty-muted)]">{t('realty.directory.unavailableDescription')}</p>
                    </DirectoryPanel>
                ) : error ? (
                    <DirectoryPanel radiusClass={cardRadius} className="p-8 text-center">
                        <CircleAlert className="mx-auto mb-3 text-[var(--realty-accent)]" size={28} />
                        <h2 className="text-2xl font-bold font-header text-[var(--realty-heading)]">{t('realty.directory.errorTitle')}</h2>
                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 font-body text-[var(--realty-muted)]">{error}</p>
                        <DirectoryButton
                            onClick={() => { void refetch(); }}
                            variant="primary"
                            radiusClass={buttonRadius}
                            className="mt-5"
                        >
                            <RotateCcw size={15} />
                            {t('realty.directory.retry')}
                        </DirectoryButton>
                    </DirectoryPanel>
                ) : isLoading && properties.length === 0 ? (
                    <div className={viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
                        {[0, 1, 2, 3, 4, 5].map(item => (
                            <DirectoryPanel key={item} radiusClass={cardRadius} className={cx('animate-pulse overflow-hidden', viewMode === 'grid' ? 'h-96' : 'h-52')}>
                                <div className="h-1/2 bg-[var(--realty-surface-strong)]" />
                                <div className="space-y-3 p-5">
                                    <div className="h-5 w-2/3 rounded bg-[var(--realty-border-soft)]" />
                                    <div className="h-4 w-5/6 rounded bg-[var(--realty-border-soft)]" />
                                    <div className="h-4 w-1/2 rounded bg-[var(--realty-border-soft)]" />
                                </div>
                            </DirectoryPanel>
                        ))}
                    </div>
                ) : properties.length === 0 ? (
                    <DirectoryPanel radiusClass={cardRadius} className="p-8 text-center">
                        <Search className="mx-auto mb-3 text-[var(--realty-muted)]" size={28} />
                        <h2 className="text-2xl font-bold font-header text-[var(--realty-heading)]">{t('realty.directory.emptyTitle')}</h2>
                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 font-body text-[var(--realty-muted)]">{t('realty.directory.emptyDescription')}</p>
                        {filtersApplied && (
                            <DirectoryButton
                                onClick={clearFilters}
                                variant="primary"
                                radiusClass={buttonRadius}
                                className="mt-5"
                            >
                                <RotateCcw size={15} />
                                {t('realty.directory.clearFilters')}
                            </DirectoryButton>
                        )}
                    </DirectoryPanel>
                ) : (
                    <>
                        {showFeaturedSection && (
                            <div className="mb-10">
                                <div className="mb-4 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] font-body text-[var(--realty-accent)]">
                                            <Star size={15} />
                                            {t('realty.directory.featuredSection')}
                                        </p>
                                        <h2 className="mt-1 text-2xl font-bold font-header text-[var(--realty-heading)]">{t('realty.directory.featuredTitle')}</h2>
                                    </div>
                                </div>
                                <div className="grid gap-6 md:grid-cols-3">
                                    {featuredProperties.map((property, index) => renderGridCard(property, index))}
                                </div>
                            </div>
                        )}

                        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                            <div>
                                <h2 className="text-2xl font-bold font-header text-[var(--realty-heading)]">{t('realty.directory.allListings')}</h2>
                                <p className="mt-1 text-sm font-body text-[var(--realty-muted)]">
                                    {filtersApplied ? t('realty.directory.filtersApplied') : t('realty.directory.browseAll')}
                                </p>
                            </div>
                            {filtersApplied && (
                                <DirectoryButton onClick={clearFilters} variant="ghost" radiusClass={buttonRadius}>
                                    <RotateCcw size={15} />
                                    {t('realty.directory.clearFilters')}
                                </DirectoryButton>
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
