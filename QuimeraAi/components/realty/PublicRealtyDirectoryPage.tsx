import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bath, BedDouble, Grid3X3, Home, List, MapPin, RotateCcw, Ruler, Search, Star } from 'lucide-react';
import type { ThemeData } from '../../types';
import type { RealtyListingsSectionData, RealtyProperty, RealtyPropertyType } from '../../types/realty';
import { usePublicRealtyListings } from '../../hooks/usePublicRealtyListings';
import { formatRealtyPrice, realtyPropertyTypes, resolveRealtyWebsiteColors } from '../../utils/realty';
import { getAnimationClass, getAnimationDelay } from '../../utils/animations';
import { createDemoRealtyListings, mergeRealtyPropertiesWithPendingDemos } from './realtyDemo';

interface PublicRealtyDirectoryPageProps {
    projectId: string;
    data?: RealtyListingsSectionData;
    theme?: ThemeData;
    globalColors?: Record<string, string>;
    isPreviewMode?: boolean;
}

type SortMode = 'featured' | 'priceAsc' | 'priceDesc' | 'newest';
type ViewMode = 'grid' | 'list';

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

const getDateMs = (property: RealtyProperty) => new Date(String(property.publishedAt || property.updatedAt || property.createdAt || 0)).getTime();

const PublicRealtyDirectoryPage: React.FC<PublicRealtyDirectoryPageProps> = ({ projectId, data = {}, theme, globalColors, isPreviewMode = false }) => {
    const { t, i18n } = useTranslation();
    const { properties, isLoading } = usePublicRealtyListings(projectId || null, {
        limitCount: 60,
        featuredOnly: false,
        realtime: isPreviewMode,
    });
    const colors = resolveRealtyWebsiteColors(data.colors, globalColors || theme?.globalColors, theme);
    const listings = useMemo(
        () => mergeRealtyPropertiesWithPendingDemos(properties, createDemoRealtyListings(t)),
        [properties, t]
    );

    const [query, setQuery] = useState('');
    const [type, setType] = useState<RealtyPropertyType | 'all'>('all');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [beds, setBeds] = useState(0);
    const [sort, setSort] = useState<SortMode>('featured');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    const filtered = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        const min = Number(minPrice) || 0;
        const max = Number(maxPrice) || Number.MAX_SAFE_INTEGER;
        return listings
            .filter(property => {
                const searchable = [property.title, property.address, property.city, property.description].join(' ').toLowerCase();
                if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
                if (type !== 'all' && property.propertyType !== type) return false;
                if ((property.price || 0) < min || (property.price || 0) > max) return false;
                if ((property.bedrooms || 0) < beds) return false;
                return true;
            })
            .sort((a, b) => {
                if (sort === 'priceAsc') return a.price - b.price;
                if (sort === 'priceDesc') return b.price - a.price;
                if (sort === 'newest') return getDateMs(b) - getDateMs(a);
                if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
                return getDateMs(b) - getDateMs(a);
            });
    }, [beds, listings, maxPrice, minPrice, query, sort, type]);

    const resetFilters = () => {
        setQuery('');
        setType('all');
        setMinPrice('');
        setMaxPrice('');
        setBeds(0);
        setSort('featured');
    };

    const animationEnabled = data.enableCardAnimation !== false;
    const animationType = data.animationType || 'fade-in-up';

    const renderImage = (property: RealtyProperty) => {
        const image = property.images?.[0]?.url;
        return (
            <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: colors.border }}>
                {image ? (
                    <img src={image} alt={property.images?.[0]?.altText || property.title} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center" style={{ color: colors.textMuted }}>
                        <Home size={42} />
                    </div>
                )}
                {property.isFeatured && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: colors.badgeBackground, color: colors.badgeText }}>
                        <Star size={13} />
                        {t('realty.website.featured')}
                    </span>
                )}
            </div>
        );
    };

    const renderStats = (property: RealtyProperty) => (
        <div className="grid grid-cols-3 gap-2 text-sm" style={{ color: colors.textMuted }}>
            <span className="inline-flex items-center gap-1"><BedDouble size={15} />{property.bedrooms || 0}</span>
            <span className="inline-flex items-center gap-1"><Bath size={15} />{property.bathrooms || 0}</span>
            <span className="inline-flex items-center gap-1"><Ruler size={15} />{(property.area || 0).toLocaleString()}</span>
        </div>
    );

    return (
        <section className="min-h-screen w-full font-body" style={{ backgroundColor: colors.background, color: colors.text }}>
            <div className="sticky top-0 z-20 border-b backdrop-blur-xl" style={{ borderColor: colors.border, backgroundColor: `${colors.background}F2` }}>
                <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: colors.textMuted }} />
                            <input
                                value={query}
                                onChange={event => setQuery(event.target.value)}
                                placeholder={t('realty.directory.searchPlaceholder')}
                                className="h-11 w-full rounded-md border px-3 pl-10 text-sm outline-none transition focus:ring-2"
                                style={{ borderColor: colors.border, backgroundColor: colors.cardBackground, color: colors.text, ['--tw-ring-color' as any]: colors.accent }}
                            />
                        </div>
                        <select value={sort} onChange={event => setSort(event.target.value as SortMode)} className="h-11 rounded-md border px-3 text-sm outline-none" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground, color: colors.text }}>
                            <option value="featured">{t('realty.directory.sortFeatured')}</option>
                            <option value="newest">{t('realty.directory.sortNewest')}</option>
                            <option value="priceAsc">{t('realty.directory.sortPriceAsc')}</option>
                            <option value="priceDesc">{t('realty.directory.sortPriceDesc')}</option>
                        </select>
                        <div className="flex rounded-md border p-1" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}>
                            <button type="button" aria-label={t('realty.directory.gridView')} onClick={() => setViewMode('grid')} className="rounded px-3 py-2" style={{ backgroundColor: viewMode === 'grid' ? colors.accent : 'transparent', color: viewMode === 'grid' ? colors.buttonText : colors.textMuted }}><Grid3X3 size={16} /></button>
                            <button type="button" aria-label={t('realty.directory.listView')} onClick={() => setViewMode('list')} className="rounded px-3 py-2" style={{ backgroundColor: viewMode === 'list' ? colors.accent : 'transparent', color: viewMode === 'list' ? colors.buttonText : colors.textMuted }}><List size={16} /></button>
                        </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-5">
                        <select value={type} onChange={event => setType(event.target.value as RealtyPropertyType | 'all')} className="h-10 rounded-md border px-3 text-sm" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground, color: colors.text }}>
                            <option value="all">{t('realty.directory.allTypes')}</option>
                            {realtyPropertyTypes.map(item => <option key={item} value={item}>{t(`realty.propertyTypes.${item}`)}</option>)}
                        </select>
                        <input value={minPrice} onChange={event => setMinPrice(event.target.value)} placeholder={t('realty.directory.minPrice')} type="number" className="h-10 rounded-md border px-3 text-sm" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground, color: colors.text }} />
                        <input value={maxPrice} onChange={event => setMaxPrice(event.target.value)} placeholder={t('realty.directory.maxPrice')} type="number" className="h-10 rounded-md border px-3 text-sm" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground, color: colors.text }} />
                        <input value={beds || ''} onChange={event => setBeds(Number(event.target.value) || 0)} placeholder={t('realty.directory.beds')} type="number" className="h-10 rounded-md border px-3 text-sm" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground, color: colors.text }} />
                        <button type="button" onClick={resetFilters} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold" style={{ borderColor: colors.border, color: colors.accent }}>
                            <RotateCcw size={15} />
                            {t('realty.directory.reset')}
                        </button>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
                <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="font-header text-3xl font-bold" style={{ color: colors.heading }}>{t('realty.directory.title')}</h1>
                        <p className="mt-2 text-sm" style={{ color: colors.textMuted }}>{t('realty.directory.resultCount', { count: filtered.length })}</p>
                    </div>
                </div>

                {isLoading && filtered.length === 0 ? (
                    <div className="grid gap-5 md:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-80 animate-pulse rounded-lg" style={{ backgroundColor: colors.cardBackground }} />)}</div>
                ) : filtered.length === 0 ? (
                    <div className="rounded-lg border p-8 text-center" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}>
                        <p style={{ color: colors.textMuted }}>{t('realty.directory.empty')}</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((property, index) => {
                            const animationClass = getAnimationClass(animationType, animationEnabled);
                            return (
                                <article key={property.id} className={`overflow-hidden rounded-lg border transition-transform duration-300 hover:-translate-y-1 ${animationClass}`} style={{ borderColor: colors.border, backgroundColor: colors.cardBackground, animationDelay: animationClass ? getAnimationDelay(index) : undefined }}>
                                    <button type="button" className="block w-full text-left" onClick={() => navigateTo(`/listados/${property.slug}`)}>{renderImage(property)}</button>
                                    <div className="p-5">
                                        <p className="text-2xl font-bold font-header" style={{ color: colors.priceColor }}>{formatRealtyPrice(property.price, i18n.language, property.currency)}</p>
                                        <h2 className="mt-2 line-clamp-2 text-lg font-semibold font-header" style={{ color: colors.cardHeading }}>{property.title}</h2>
                                        <p className="mt-2 flex items-start gap-2 text-sm" style={{ color: colors.textMuted }}><MapPin size={15} className="mt-0.5 shrink-0" />{[property.address, property.city].filter(Boolean).join(', ')}</p>
                                        <div className="mt-4">{renderStats(property)}</div>
                                        <button type="button" onClick={() => navigateTo(`/listados/${property.slug}`)} className="mt-5 inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold" style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}>{t('realty.website.viewDetails')}</button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((property, index) => {
                            const animationClass = getAnimationClass(animationType, animationEnabled);
                            return (
                                <article key={property.id} className={`grid gap-4 rounded-lg border p-3 md:grid-cols-[240px_1fr_auto] ${animationClass}`} style={{ borderColor: colors.border, backgroundColor: colors.cardBackground, animationDelay: animationClass ? getAnimationDelay(index) : undefined }}>
                                    <button type="button" onClick={() => navigateTo(`/listados/${property.slug}`)}>{renderImage(property)}</button>
                                    <div className="min-w-0 p-1">
                                        <h2 className="text-xl font-semibold font-header" style={{ color: colors.cardHeading }}>{property.title}</h2>
                                        <p className="mt-2 flex items-center gap-2 text-sm" style={{ color: colors.textMuted }}><MapPin size={15} />{[property.address, property.city].filter(Boolean).join(', ')}</p>
                                        <p className="mt-3 line-clamp-2 text-sm leading-6" style={{ color: colors.cardText }}>{property.description}</p>
                                        <div className="mt-4 max-w-sm">{renderStats(property)}</div>
                                    </div>
                                    <div className="flex flex-col justify-between gap-4 p-1 md:min-w-44 md:items-end">
                                        <p className="text-2xl font-bold font-header" style={{ color: colors.priceColor }}>{formatRealtyPrice(property.price, i18n.language, property.currency)}</p>
                                        <button type="button" onClick={() => navigateTo(`/listados/${property.slug}`)} className="rounded-md px-4 py-2 text-sm font-semibold" style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}>{t('realty.website.viewDetails')}</button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default PublicRealtyDirectoryPage;
