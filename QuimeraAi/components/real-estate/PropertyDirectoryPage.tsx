import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Bath,
    BedDouble,
    ChevronDown,
    Grid3X3,
    Home,
    List,
    Map,
    MapPin,
    RotateCcw,
    Ruler,
    Search,
    SlidersHorizontal,
    Star,
    X,
} from 'lucide-react';
import { ThemeData } from '../../types';
import { Property, PropertyType } from '../../types/realEstate';
import { usePublicRealEstateListings } from '../../hooks/usePublicRealEstateListings';

interface PropertyDirectoryPageProps {
    projectId: string;
    data?: any;
    theme?: ThemeData;
    globalColors?: Record<string, string>;
}

type ViewMode = 'grid' | 'list' | 'map';
type SortMode = 'featured' | 'priceAsc' | 'priceDesc' | 'newest';

const propertyTypes: Array<PropertyType | 'all'> = ['all', 'house', 'condo', 'apartment', 'townhouse', 'land', 'commercial'];

const formatPrice = (value: number, locale: string) => {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value || 0);
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

const getDateMs = (property: Property) => {
    const raw = property.publishedAt || property.updatedAt || property.createdAt;
    const date = (raw as any)?.toDate?.() || (typeof raw === 'string' ? new Date(raw) : null);
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

const PropertyDirectoryPage: React.FC<PropertyDirectoryPageProps> = ({ projectId, data = {}, theme, globalColors }) => {
    const { t, i18n } = useTranslation();
    const { properties, isLoading, error } = usePublicRealEstateListings(projectId || null, {
        limitCount: 50,
        featuredOnly: false,
        realtime: false,
    });

    const themeColors = globalColors || theme?.globalColors || {};
    const dataColors = data.colors || {};
    const colors = {
        background: dataColors.background || themeColors.background || theme?.pageBackground || '#ffffff',
        surface: dataColors.cardBackground || themeColors.surface || '#ffffff',
        heading: dataColors.heading || themeColors.heading || themeColors.text || '#111827',
        text: dataColors.text || themeColors.text || '#374151',
        muted: dataColors.textMuted || themeColors.textMuted || '#6b7280',
        border: dataColors.border || themeColors.border || 'rgba(148, 163, 184, 0.32)',
        accent: dataColors.accent || themeColors.primary || themeColors.accent || '#4f46e5',
        buttonText: dataColors.buttonText || '#ffffff',
    };

    const [query, setQuery] = useState('');
    const [type, setType] = useState<PropertyType | 'all'>('all');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [beds, setBeds] = useState(0);
    const [baths, setBaths] = useState(0);
    const [minSqft, setMinSqft] = useState('');
    const [sort, setSort] = useState<SortMode>('featured');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [visibleCount, setVisibleCount] = useState(12);

    const filtered = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        const min = Number(minPrice) || 0;
        const max = Number(maxPrice) || Number.MAX_SAFE_INTEGER;
        const sqft = Number(minSqft) || 0;

        const result = properties.filter(property => {
            const searchable = [property.title, property.address, property.city, property.description]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
            if (type !== 'all' && property.propertyType !== type) return false;
            if ((property.price || 0) < min || (property.price || 0) > max) return false;
            if ((property.bedrooms || 0) < beds) return false;
            if ((property.bathrooms || 0) < baths) return false;
            if ((property.squareFeet || 0) < sqft) return false;
            return true;
        });

        return result.sort((a, b) => {
            if (sort === 'priceAsc') return (a.price || 0) - (b.price || 0);
            if (sort === 'priceDesc') return (b.price || 0) - (a.price || 0);
            if (sort === 'newest') return getDateMs(b) - getDateMs(a);
            if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
            return getDateMs(b) - getDateMs(a);
        });
    }, [baths, beds, maxPrice, minPrice, minSqft, properties, query, sort, type]);

    const visibleProperties = filtered.slice(0, visibleCount);
    const mappedProperties = filtered.filter(property => typeof property.latitude === 'number' && typeof property.longitude === 'number');
    const mapCenter = mappedProperties[0];

    const resetFilters = () => {
        setQuery('');
        setType('all');
        setMinPrice('');
        setMaxPrice('');
        setBeds(0);
        setBaths(0);
        setMinSqft('');
        setSort('featured');
        setVisibleCount(12);
    };

    const activePills = [
        query ? { label: query, clear: () => setQuery('') } : null,
        type !== 'all' ? { label: t(`realEstate.propertyTypes.${type}`), clear: () => setType('all') } : null,
        minPrice ? { label: `${t('realEstate.directory.minPrice', 'Min')} ${formatPrice(Number(minPrice), i18n.language)}`, clear: () => setMinPrice('') } : null,
        maxPrice ? { label: `${t('realEstate.directory.maxPrice', 'Max')} ${formatPrice(Number(maxPrice), i18n.language)}`, clear: () => setMaxPrice('') } : null,
        beds ? { label: `${beds}+ ${t('realEstate.units.beds')}`, clear: () => setBeds(0) } : null,
        baths ? { label: `${baths}+ ${t('realEstate.units.baths')}`, clear: () => setBaths(0) } : null,
        minSqft ? { label: `${Number(minSqft).toLocaleString()}+ ${t('realEstate.units.sqft')}`, clear: () => setMinSqft('') } : null,
    ].filter(Boolean) as Array<{ label: string; clear: () => void }>;

    const inputClass = 'h-11 rounded-md border px-3 text-sm outline-none transition focus:ring-2';
    const selectClass = `${inputClass} appearance-none pr-9`;

    const renderStatusBadge = (property: Property) => (
        <span
            className="rounded-full px-3 py-1 text-xs font-semibold capitalize"
            style={{ backgroundColor: `${colors.accent}18`, color: colors.accent }}
        >
            {t(`realEstate.status.${property.status}`)}
        </span>
    );

    const renderStats = (property: Property) => (
        <div className="grid grid-cols-3 gap-2 text-sm" style={{ color: colors.muted }}>
            <span className="inline-flex items-center gap-1"><BedDouble size={15} />{property.bedrooms || 0}</span>
            <span className="inline-flex items-center gap-1"><Bath size={15} />{property.bathrooms || 0}</span>
            <span className="inline-flex items-center gap-1"><Ruler size={15} />{(property.squareFeet || 0).toLocaleString()}</span>
        </div>
    );

    const renderImage = (property: Property, className = 'aspect-[4/3]') => {
        const image = property.images?.[0]?.url;
        return (
            <div className={`relative overflow-hidden ${className}`} style={{ backgroundColor: colors.border }}>
                {image ? (
                    <img src={image} alt={property.images?.[0]?.altText || property.title} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center" style={{ color: colors.muted }}>
                        <Home size={42} />
                    </div>
                )}
                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    {property.isFeatured && (
                        <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: colors.accent, color: colors.buttonText }}>
                            <Star size={13} />
                            {t('realEstate.websiteListings.featured')}
                        </span>
                    )}
                    {renderStatusBadge(property)}
                </div>
            </div>
        );
    };

    const renderGridCard = (property: Property) => (
        <article
            key={property.id}
            className="overflow-hidden rounded-lg border transition hover:-translate-y-1 hover:shadow-lg"
            style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
            <button type="button" className="block w-full text-left" onClick={() => navigateTo(`/listados/${property.slug}`)}>
                {renderImage(property)}
            </button>
            <div className="p-5">
                <p className="text-2xl font-bold" style={{ color: colors.accent }}>{formatPrice(property.price, i18n.language)}</p>
                <h2 className="mt-2 line-clamp-2 text-lg font-semibold" style={{ color: colors.heading }}>{property.title}</h2>
                <p className="mt-2 flex items-start gap-2 text-sm" style={{ color: colors.muted }}>
                    <MapPin size={15} className="mt-0.5 shrink-0" />
                    <span>{[property.address, property.city].filter(Boolean).join(', ')}</span>
                </p>
                <div className="mt-4">{renderStats(property)}</div>
                <button
                    type="button"
                    onClick={() => navigateTo(`/listados/${property.slug}`)}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                    style={{ backgroundColor: colors.accent, color: colors.buttonText }}
                >
                    {t('realEstate.websiteListings.viewDetails')}
                </button>
            </div>
        </article>
    );

    const renderListRow = (property: Property) => (
        <article key={property.id} className="grid gap-4 rounded-lg border p-3 md:grid-cols-[240px_1fr_auto]" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
            <button type="button" className="text-left" onClick={() => navigateTo(`/listados/${property.slug}`)}>
                {renderImage(property, 'aspect-[4/3] rounded-md')}
            </button>
            <div className="min-w-0 p-1">
                <div className="mb-2 flex flex-wrap gap-2">{property.isFeatured ? <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: colors.accent, color: colors.buttonText }}><Star size={13} />{t('realEstate.websiteListings.featured')}</span> : null}{renderStatusBadge(property)}</div>
                <h2 className="text-xl font-semibold" style={{ color: colors.heading }}>{property.title}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm" style={{ color: colors.muted }}><MapPin size={15} />{[property.address, property.city].filter(Boolean).join(', ')}</p>
                <p className="mt-3 line-clamp-2 text-sm leading-6" style={{ color: colors.text }}>{property.description}</p>
                <div className="mt-4 max-w-sm">{renderStats(property)}</div>
            </div>
            <div className="flex flex-col justify-between gap-4 p-1 md:min-w-44 md:items-end">
                <p className="text-2xl font-bold" style={{ color: colors.accent }}>{formatPrice(property.price, i18n.language)}</p>
                <button type="button" onClick={() => navigateTo(`/listados/${property.slug}`)} className="rounded-md px-4 py-2 text-sm font-semibold" style={{ backgroundColor: colors.accent, color: colors.buttonText }}>
                    {t('realEstate.websiteListings.viewDetails')}
                </button>
            </div>
        </article>
    );

    return (
        <section className="min-h-screen w-full" style={{ backgroundColor: colors.background, color: colors.text }}>
            <div className="sticky top-0 z-20 border-b backdrop-blur-xl" style={{ borderColor: colors.border, backgroundColor: `${colors.background}F2` }}>
                <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: colors.muted }} />
                            <input
                                value={query}
                                onChange={event => setQuery(event.target.value)}
                                placeholder={t('realEstate.directory.searchPlaceholder', 'Search by city, address, or property name')}
                                className={`${inputClass} w-full pl-10`}
                                style={{ borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, ['--tw-ring-color' as any]: colors.accent }}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(['grid', 'list', 'map'] as ViewMode[]).map(mode => {
                                const Icon = mode === 'grid' ? Grid3X3 : mode === 'list' ? List : Map;
                                return (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setViewMode(mode)}
                                        className="inline-flex h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold"
                                        style={{ borderColor: viewMode === mode ? colors.accent : colors.border, backgroundColor: viewMode === mode ? `${colors.accent}14` : colors.surface, color: viewMode === mode ? colors.accent : colors.text }}
                                    >
                                        <Icon size={16} />
                                        {t(`realEstate.directory.views.${mode}`, mode)}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="relative">
                            <select value={sort} onChange={event => setSort(event.target.value as SortMode)} className={selectClass} style={{ borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }}>
                                <option value="featured">{t('realEstate.directory.sortFeatured', 'Featured')}</option>
                                <option value="newest">{t('realEstate.directory.sortNewest', 'Newest')}</option>
                                <option value="priceAsc">{t('realEstate.directory.sortPriceAsc', 'Price: low to high')}</option>
                                <option value="priceDesc">{t('realEstate.directory.sortPriceDesc', 'Price: high to low')}</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" size={16} />
                        </div>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-6">
                        <div className="relative">
                            <select value={type} onChange={event => setType(event.target.value as PropertyType | 'all')} className={`${selectClass} w-full`} style={{ borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }}>
                                {propertyTypes.map(item => <option key={item} value={item}>{item === 'all' ? t('realEstate.directory.allTypes', 'All types') : t(`realEstate.propertyTypes.${item}`)}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" size={16} />
                        </div>
                        <input value={minPrice} onChange={event => setMinPrice(event.target.value)} inputMode="numeric" placeholder={t('realEstate.directory.minPrice', 'Min price')} className={inputClass} style={{ borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }} />
                        <input value={maxPrice} onChange={event => setMaxPrice(event.target.value)} inputMode="numeric" placeholder={t('realEstate.directory.maxPrice', 'Max price')} className={inputClass} style={{ borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }} />
                        <select value={beds} onChange={event => setBeds(Number(event.target.value))} className={selectClass} style={{ borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }}>
                            {[0, 1, 2, 3, 4].map(value => <option key={value} value={value}>{value ? `${value}+ ${t('realEstate.units.beds')}` : t('realEstate.directory.anyBeds', 'Any beds')}</option>)}
                        </select>
                        <select value={baths} onChange={event => setBaths(Number(event.target.value))} className={selectClass} style={{ borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }}>
                            {[0, 1, 2, 3].map(value => <option key={value} value={value}>{value ? `${value}+ ${t('realEstate.units.baths')}` : t('realEstate.directory.anyBaths', 'Any baths')}</option>)}
                        </select>
                        <input value={minSqft} onChange={event => setMinSqft(event.target.value)} inputMode="numeric" placeholder={t('realEstate.directory.minSqft', 'Min sqft')} className={inputClass} style={{ borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: colors.muted }}>
                            <SlidersHorizontal size={16} />
                            {t('realEstate.directory.resultsFound', '{{count}} properties found', { count: filtered.length })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {activePills.map(pill => (
                                <button key={pill.label} type="button" onClick={pill.clear} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: colors.border, color: colors.text }}>
                                    {pill.label}<X size={13} />
                                </button>
                            ))}
                            {activePills.length > 0 && (
                                <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold" style={{ color: colors.accent }}>
                                    <RotateCcw size={13} />{t('realEstate.directory.clearFilters', 'Clear filters')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
                {error && <div className="mb-6 rounded-md border p-4 text-sm" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>{error}</div>}
                {isLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-96 animate-pulse rounded-lg" style={{ backgroundColor: colors.surface }} />)}</div>
                ) : filtered.length === 0 ? (
                    <div className="rounded-lg border p-10 text-center" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                        <Home className="mx-auto mb-4" size={42} style={{ color: colors.accent }} />
                        <h2 className="text-2xl font-bold" style={{ color: colors.heading }}>{t('realEstate.directory.emptyTitle', 'No properties match your filters')}</h2>
                        <p className="mx-auto mt-2 max-w-xl" style={{ color: colors.muted }}>{t('realEstate.directory.emptyDescription', 'Try adjusting price, location, bedrooms, or property type to see more listings.')}</p>
                        <button type="button" onClick={resetFilters} className="mt-6 rounded-md px-4 py-2 text-sm font-semibold" style={{ backgroundColor: colors.accent, color: colors.buttonText }}>{t('realEstate.directory.clearFilters', 'Clear filters')}</button>
                    </div>
                ) : viewMode === 'map' ? (
                    <div className="grid min-h-[720px] overflow-hidden rounded-lg border lg:grid-cols-[420px_1fr]" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                        <div className="max-h-[720px] overflow-y-auto border-b p-4 lg:border-b-0 lg:border-r" style={{ borderColor: colors.border }}>
                            <div className="space-y-4">{visibleProperties.map(renderGridCard)}</div>
                        </div>
                        <div className="relative min-h-[520px]">
                            {mapCenter ? (
                                <iframe
                                    title={t('realEstate.directory.mapTitle', 'Property map')}
                                    className="absolute inset-0 h-full w-full"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${(mapCenter.longitude || 0) - 0.08},${(mapCenter.latitude || 0) - 0.06},${(mapCenter.longitude || 0) + 0.08},${(mapCenter.latitude || 0) + 0.06}&layer=mapnik&marker=${mapCenter.latitude},${mapCenter.longitude}`}
                                />
                            ) : (
                                <div className="flex h-full min-h-[520px] items-center justify-center p-8 text-center">
                                    <div>
                                        <MapPin className="mx-auto mb-4" size={44} style={{ color: colors.accent }} />
                                        <h2 className="text-2xl font-bold" style={{ color: colors.heading }}>{t('realEstate.directory.noCoordinatesTitle', 'Map coordinates unavailable')}</h2>
                                        <p className="mx-auto mt-2 max-w-md" style={{ color: colors.muted }}>{t('realEstate.directory.noCoordinatesDescription', 'Add latitude and longitude to your properties to see them on the map.')}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="space-y-4">{visibleProperties.map(renderListRow)}</div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{visibleProperties.map(renderGridCard)}</div>
                )}

                {visibleCount < filtered.length && viewMode !== 'map' && (
                    <div className="mt-10 text-center">
                        <button type="button" onClick={() => setVisibleCount(count => count + 12)} className="rounded-md border px-5 py-3 text-sm font-semibold" style={{ borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }}>
                            {t('realEstate.directory.loadMore', 'Load more properties')}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default PropertyDirectoryPage;
