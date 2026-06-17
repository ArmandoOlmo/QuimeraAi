import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    Bath,
    BedDouble,
    Building2,
    CalendarDays,
    Car,
    Check,
    CheckCircle2,
    CircleAlert,
    Clock,
    DollarSign,
    Home,
    Info,
    Mail,
    MapPin,
    Phone,
    Ruler,
    Send,
    Sparkles,
    Star,
} from 'lucide-react';
import type { ThemeData } from '../../types';
import type { PropertyOpenHouse, RealtyImage, RealtyListingsSectionData, RealtyProperty } from '../../types/realty';
import { supabase } from '../../supabase';
import { usePublicRealtyListings } from '../../hooks/usePublicRealtyListings';
import { formatRealtyPrice, mapPropertyOpenHouseRow, REALTY_LEAD_SOURCE, resolveRealtyWebsiteColors } from '../../utils/realty';

interface PublicRealtyPropertyDetailProps {
    projectId: string;
    ownerId?: string;
    propertySlug?: string;
    data?: RealtyListingsSectionData;
    colors?: RealtyListingsSectionData['colors'];
    theme?: ThemeData;
    globalColors?: Record<string, string>;
    isPreviewMode?: boolean;
    onNavigateToListings?: () => void;
    onNavigateToProperty?: (slug: string) => void;
    onNavigateHome?: () => void;
}

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

const detailInputClass = 'h-10 w-full rounded-md border border-[var(--realty-border-soft)] bg-[var(--realty-surface-soft)] px-3 text-sm font-body text-[var(--realty-text)] outline-none transition-colors placeholder:text-[var(--realty-muted)] focus:border-[var(--realty-accent)] focus:ring-2 focus:ring-[var(--realty-accent-soft)]';

interface DetailPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    radiusClass?: string;
}

const DetailPanel = ({ children, className, radiusClass = 'rounded-xl', ...props }: DetailPanelProps) => (
    <div
        className={cx(
            'border border-[var(--realty-border-soft)] bg-[var(--realty-surface-soft)] shadow-[0_18px_60px_-36px_rgba(0,0,0,0.55)] backdrop-blur-2xl',
            radiusClass,
            className
        )}
        {...props}
    >
        {children}
    </div>
);

interface DetailButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    radiusClass?: string;
}

const DetailButton = ({
    children,
    className,
    radiusClass = 'rounded-md',
    variant = 'secondary',
    type = 'button',
    ...props
}: DetailButtonProps) => {
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

interface DetailInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
    icon?: React.ElementType;
    className?: string;
    inputClassName?: string;
}

const DetailInput = ({ icon: Icon, className, inputClassName, ...props }: DetailInputProps) => (
    <span className={cx('relative block', className)}>
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--realty-muted)]" size={15} />}
        <input
            className={cx(detailInputClass, Icon && 'pl-9', inputClassName)}
            {...props}
        />
    </span>
);

interface DetailTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
    className?: string;
}

const DetailTextarea = ({ className, ...props }: DetailTextareaProps) => (
    <textarea
        className={cx('min-h-[96px] w-full rounded-md border border-[var(--realty-border-soft)] bg-[var(--realty-surface-soft)] px-3 py-2 text-sm leading-6 font-body text-[var(--realty-text)] outline-none transition-colors placeholder:text-[var(--realty-muted)] focus:border-[var(--realty-accent)] focus:ring-2 focus:ring-[var(--realty-accent-soft)]', className)}
        {...props}
    />
);

interface DetailChipProps {
    children: React.ReactNode;
    variant?: 'outline' | 'accent' | 'soft';
    className?: string;
}

const DetailChip = ({ children, variant = 'outline', className }: DetailChipProps) => (
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

const SpecCard = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) => (
    <div className="min-w-0 rounded-xl border border-[var(--realty-border-soft)] bg-[var(--realty-surface-soft)] p-4">
        <Icon size={17} className="text-[var(--realty-accent)]" />
        <p className="mt-3 truncate text-xl font-bold leading-tight font-header text-[var(--realty-heading)]">{value}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] font-body text-[var(--realty-muted)]">{label}</p>
    </div>
);

const GalleryThumb = ({
    image,
    active,
    onClick,
    alt,
}: {
    image: RealtyImage;
    active: boolean;
    onClick: () => void;
    alt: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={cx(
            'h-16 w-24 shrink-0 overflow-hidden rounded-md border bg-[var(--realty-surface-strong)] transition-all duration-200 hover:-translate-y-0.5',
            active ? 'border-[var(--realty-accent)] ring-2 ring-[var(--realty-accent-soft)]' : 'border-[var(--realty-border-soft)]'
        )}
    >
        <img src={image.url} alt={image.altText || alt} className="h-full w-full object-cover" loading="lazy" />
    </button>
);

const StatusMessage = ({ status, children }: { status: 'success' | 'error'; children: React.ReactNode }) => {
    const Icon = status === 'success' ? CheckCircle2 : CircleAlert;
    return (
        <p className={cx('inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold', status === 'success' ? 'bg-[var(--realty-success-soft)] text-[var(--realty-success)]' : 'bg-[var(--realty-error-soft)] text-[var(--realty-error)]')}>
            <Icon size={15} />
            {children}
        </p>
    );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const stringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];

const getPropertyImage = (property: RealtyProperty) =>
    property.mainImageUrl ||
    property.images?.find(image => image.isPrimary)?.url ||
    property.images?.[0]?.url ||
    '';

const getLocationLabel = (property: RealtyProperty) =>
    [property.addressLine1 || property.address, property.city, property.state].filter(Boolean).join(', ');

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

const PublicRealtyPropertyDetail: React.FC<PublicRealtyPropertyDetailProps> = ({
    projectId,
    ownerId,
    propertySlug = '',
    data = {},
    colors: propColors,
    theme,
    globalColors,
    isPreviewMode = false,
    onNavigateToListings,
    onNavigateToProperty,
}) => {
    const { t, i18n } = useTranslation();
    const { properties, isLoading } = usePublicRealtyListings(projectId || null, { limitCount: 60, realtime: isPreviewMode });
    const listings = properties;
    const property = useMemo(() => listings.find(item => item.slug === propertySlug) || listings[0], [listings, propertySlug]);
    const related = useMemo(() => listings.filter(item => item.id !== property?.id).slice(0, 3), [listings, property?.id]);
    const colors = resolveRealtyWebsiteColors({ ...data.colors, ...propColors }, globalColors || theme?.globalColors, theme);
    const cardRadius = radiusClasses[data.cardBorderRadius || theme?.cardBorderRadius || 'xl'] || radiusClasses.xl;
    const buttonRadius = radiusClasses[data.buttonBorderRadius || theme?.buttonBorderRadius || 'md'] || radiusClasses.md;
    const [selectedImage, setSelectedImage] = useState(0);
    const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [openHouses, setOpenHouses] = useState<PropertyOpenHouse[]>([]);
    const [selectedOpenHouseId, setSelectedOpenHouseId] = useState('');
    const [openHouseForm, setOpenHouseForm] = useState({ name: '', email: '', phone: '', message: '' });
    const [openHouseStatus, setOpenHouseStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const goListings = () => onNavigateToListings ? onNavigateToListings() : navigateTo('/listados');
    const goProperty = (slug: string) => onNavigateToProperty ? onNavigateToProperty(slug) : navigateTo(`/listados/${slug}`);
    const selectedOpenHouse = openHouses.find(item => item.id === selectedOpenHouseId) || openHouses[0];

    useEffect(() => {
        let cancelled = false;

        const loadOpenHouses = async () => {
            if (!projectId || !property?.id) {
                setOpenHouses([]);
                setSelectedOpenHouseId('');
                return;
            }

            const { data: rows, error } = await supabase
                .from('property_open_houses')
                .select('*')
                .eq('project_id', projectId)
                .eq('property_id', property.id)
                .eq('registration_enabled', true)
                .in('status', ['scheduled', 'active'])
                .order('starts_at', { ascending: true });

            if (cancelled) return;

            if (error) {
                console.warn('[PublicRealtyPropertyDetail] open houses lookup failed', error);
                setOpenHouses([]);
                setSelectedOpenHouseId('');
                return;
            }

            const mapped = (rows || []).map(mapPropertyOpenHouseRow);
            setOpenHouses(mapped);
            setSelectedOpenHouseId(prev => mapped.some(item => item.id === prev) ? prev : mapped[0]?.id || '');
        };

        loadOpenHouses();
        return () => { cancelled = true; };
    }, [projectId, property?.id]);

    const submitLead = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!property || !form.name || !form.email) return;
        setStatus('saving');
        try {
            const propertyOwnerId = property.userId || property.createdBy || ownerId;
            if (!propertyOwnerId) throw new Error('Missing owner for Realty lead.');
            const leadMetadata = {
                realtyLead: true,
                realtyPropertyId: property.id,
                realtyPropertyTitle: property.title,
                realtyPropertySlug: property.slug,
                propertyId: property.id,
                propertyTitle: property.title,
                propertySlug: property.slug,
                message: form.message,
                sourceComponent: 'realty-property-detail',
            };

            const { error } = await supabase.from('property_leads').insert({
                user_id: propertyOwnerId,
                tenant_id: property.tenantId || null,
                project_id: projectId,
                property_id: property.id,
                name: form.name,
                email: form.email,
                phone: form.phone || null,
                message: form.message || t('realty.detail.defaultLeadMessage', { title: property.title }),
                stage: 'new',
                lead_type: 'buyer',
                budget: property.price || null,
                source: REALTY_LEAD_SOURCE,
                metadata: leadMetadata,
            });
            if (error) throw error;
            setStatus('saved');
            setForm({ name: '', email: '', phone: '', message: '' });
        } catch (err) {
            console.error('[PublicRealtyPropertyDetail] lead submit failed', err);
            setStatus('error');
        }
    };

    const submitOpenHouseRegistration = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!property || !selectedOpenHouse || !openHouseForm.name || !openHouseForm.email) return;
        setOpenHouseStatus('saving');
        try {
            const propertyOwnerId = property.userId || property.createdBy || ownerId;
            if (!propertyOwnerId) throw new Error('Missing owner for Realty open house lead.');
            const leadMetadata = {
                realtyLead: true,
                realtyPropertyId: property.id,
                realtyPropertyTitle: property.title,
                realtyPropertySlug: property.slug,
                propertyId: property.id,
                propertyTitle: property.title,
                propertySlug: property.slug,
                openHouseId: selectedOpenHouse.id,
                openHouseStartsAt: selectedOpenHouse.startsAt,
                message: openHouseForm.message,
                sourceComponent: 'realty-open-house',
            };

            const { error } = await supabase.from('property_leads').insert({
                user_id: propertyOwnerId,
                tenant_id: property.tenantId || null,
                project_id: projectId,
                property_id: property.id,
                name: openHouseForm.name,
                email: openHouseForm.email,
                phone: openHouseForm.phone || null,
                message: openHouseForm.message || t('realty.detail.openHouseDefaultMessage', { title: property.title }),
                stage: 'new',
                lead_type: 'buyer',
                budget: property.price || null,
                source: 'open_house',
                metadata: leadMetadata,
            });
            if (error) throw error;
            setOpenHouseStatus('saved');
            setOpenHouseForm({ name: '', email: '', phone: '', message: '' });
        } catch (err) {
            console.error('[PublicRealtyPropertyDetail] open house registration failed', err);
            setOpenHouseStatus('error');
        }
    };

    const directoryThemeStyle = {
        '--realty-bg': colors.background,
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
        '--realty-button': colors.buttonBackground,
        '--realty-button-text': colors.buttonText,
        '--realty-badge-text': colors.badgeText,
        '--realty-price': colors.priceColor,
        '--realty-success': colors.success,
        '--realty-success-soft': `color-mix(in srgb, ${colors.success} 14%, transparent)`,
        '--realty-error': colors.error,
        '--realty-error-soft': `color-mix(in srgb, ${colors.error} 14%, transparent)`,
        backgroundColor: colors.background,
        color: colors.text,
    } as React.CSSProperties;

    if (isLoading && !property) {
        return (
            <section className="min-h-screen bg-[var(--realty-bg)] p-4 font-body text-[var(--realty-text)] md:p-6" style={directoryThemeStyle}>
                <div className="mx-auto max-w-7xl space-y-5">
                    <div className="h-10 w-44 animate-pulse rounded-md bg-[var(--realty-surface-soft)]" />
                    <DetailPanel radiusClass={cardRadius} className="h-[560px] animate-pulse overflow-hidden">
                        <div className="h-full bg-[var(--realty-surface-strong)]" />
                    </DetailPanel>
                </div>
            </section>
        );
    }

    if (!property) {
        return (
            <section className="min-h-screen bg-[var(--realty-bg)] px-4 py-16 text-center font-body text-[var(--realty-text)] md:px-6" style={directoryThemeStyle}>
                <DetailPanel radiusClass={cardRadius} className="mx-auto max-w-xl p-8">
                    <Home className="mx-auto mb-4 text-[var(--realty-muted)]" size={40} />
                    <h1 className="font-header text-3xl font-bold text-[var(--realty-heading)]">{t('realty.detail.notFound')}</h1>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--realty-muted)]">{t('realty.detail.notFoundDescription')}</p>
                    <DetailButton onClick={goListings} variant="primary" radiusClass={buttonRadius} className="mt-6">
                        <ArrowLeft size={16} />
                        {t('realty.detail.backToListings')}
                    </DetailButton>
                </DetailPanel>
            </section>
        );
    }

    const images = property.images || [];
    const activeImage = images[selectedImage]?.url || getPropertyImage(property);
    const description = property.descriptionLong || property.description || property.descriptionShort || '';
    const highlights = stringArray(property.highlights);
    const features = stringArray(property.features);
    const amenities = stringArray(property.amenities);
    const metadata = property.metadata || {};
    const metadataFaq = Array.isArray(metadata.faq)
        ? metadata.faq.filter((item): item is { question: string; answer: string } =>
            isRecord(item) && typeof item.question === 'string' && typeof item.answer === 'string')
        : [];
    const metadataCta = typeof metadata.cta === 'string' ? metadata.cta : '';
    const location = getLocationLabel(property);
    const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-US';
    const scrollToContact = () => {
        if (typeof document === 'undefined') return;
        document.getElementById('realty-contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const facts = [
        { key: 'beds', icon: BedDouble, label: t('realty.units.beds'), value: property.bedrooms || 0, show: true },
        { key: 'baths', icon: Bath, label: t('realty.units.baths'), value: property.bathrooms || 0, show: true },
        { key: 'halfBaths', icon: Bath, label: t('realty.detail.halfBathrooms'), value: property.halfBathrooms || 0, show: Boolean(property.halfBathrooms) },
        { key: 'area', icon: Ruler, label: t('realty.units.area'), value: `${(property.area || 0).toLocaleString(i18n.language)} ${property.areaUnit || ''}`.trim(), show: true },
        { key: 'lot', icon: Building2, label: t('realty.detail.lotSize'), value: `${(property.lotSize || property.lotSqft || 0).toLocaleString(i18n.language)} ${property.areaUnit || ''}`.trim(), show: Boolean(property.lotSize || property.lotSqft) },
        { key: 'parking', icon: Car, label: t('realty.detail.parking'), value: property.parkingSpaces || 0, show: Boolean(property.parkingSpaces) },
        { key: 'year', icon: CalendarDays, label: t('realty.detail.yearBuilt'), value: property.yearBuilt || '', show: Boolean(property.yearBuilt) },
        { key: 'hoa', icon: DollarSign, label: t('realty.detail.hoaFee'), value: formatRealtyPrice(property.hoaFee || 0, i18n.language, property.currency), show: Boolean(property.hoaFee) },
        { key: 'taxes', icon: DollarSign, label: t('realty.detail.taxes'), value: formatRealtyPrice(property.taxes || 0, i18n.language, property.currency), show: Boolean(property.taxes) },
    ].filter(item => item.show);

    const renderOpenHouseDate = (openHouse: PropertyOpenHouse) => {
        const startsAt = new Date(openHouse.startsAt);
        const endsAt = openHouse.endsAt ? new Date(openHouse.endsAt) : null;
        const dateLabel = Number.isFinite(startsAt.getTime())
            ? startsAt.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
            : openHouse.startsAt;
        const endLabel = endsAt && Number.isFinite(endsAt.getTime())
            ? endsAt.toLocaleTimeString(locale, { timeStyle: 'short' })
            : '';
        return endLabel ? `${dateLabel} - ${endLabel}` : dateLabel;
    };

    return (
        <section className="min-h-screen bg-[var(--realty-bg)] font-body text-[var(--realty-text)]" style={directoryThemeStyle}>
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
                <DetailButton onClick={goListings} variant="ghost" radiusClass={buttonRadius} className="mb-5">
                    <ArrowLeft size={16} />
                    {t('realty.detail.backToListings')}
                </DetailButton>

                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <main className="min-w-0">
                        <DetailPanel radiusClass={cardRadius} className="group overflow-hidden">
                            <div className="relative aspect-[16/10] bg-[var(--realty-surface-strong)]">
                                {activeImage ? (
                                    <img src={activeImage} alt={property.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[var(--realty-muted)]">
                                        <Home size={56} />
                                    </div>
                                )}
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                                    {property.isFeatured && (
                                        <DetailChip variant="accent">
                                            <Star size={13} />
                                            {t('realty.website.featured')}
                                        </DetailChip>
                                    )}
                                    <DetailChip variant="soft">{t(`realty.propertyTypes.${property.propertyType}`)}</DetailChip>
                                    <DetailChip variant="outline">{t(`realty.transactionTypes.${property.transactionType || 'sale'}`)}</DetailChip>
                                </div>
                            </div>
                            {images.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto border-t border-[var(--realty-border-soft)] p-3">
                                    {images.map((image, index) => (
                                        <GalleryThumb
                                            key={image.id || image.url}
                                            image={image}
                                            active={index === selectedImage}
                                            onClick={() => setSelectedImage(index)}
                                            alt={property.title}
                                        />
                                    ))}
                                </div>
                            )}
                        </DetailPanel>

                        <div className="mt-8 grid gap-6">
                            <div>
                                <p className="font-header text-3xl font-bold leading-none text-[var(--realty-price)] md:text-4xl">{formatRealtyPrice(property.price, i18n.language, property.currency)}</p>
                                <h1 className="mt-4 max-w-4xl font-header text-3xl font-bold leading-tight text-[var(--realty-heading)] md:text-5xl">{property.title}</h1>
                                {location && (
                                    <p className="mt-3 flex items-start gap-2 text-base leading-6 text-[var(--realty-muted)]">
                                        <MapPin size={18} className="mt-0.5 shrink-0" />
                                        {location}
                                    </p>
                                )}
                                <div className="mt-5 flex flex-wrap gap-2">
                                    <DetailButton onClick={scrollToContact} variant="primary" radiusClass={buttonRadius}>
                                        <Send size={16} />
                                        {t('realty.detail.scrollToContact')}
                                    </DetailButton>
                                    {metadataCta && (
                                        <DetailButton onClick={scrollToContact} variant="secondary" radiusClass={buttonRadius}>
                                            <Sparkles size={16} />
                                            {metadataCta}
                                        </DetailButton>
                                    )}
                                </div>
                            </div>

                            <section aria-labelledby="property-facts">
                                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--realty-accent)]">{t('realty.detail.propertyFacts')}</p>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    {facts.map(item => (
                                        <SpecCard key={item.key} icon={item.icon} label={item.label} value={item.value} />
                                    ))}
                                </div>
                            </section>

                            <DetailPanel radiusClass={cardRadius} className="p-5 md:p-6">
                                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--realty-accent)]">{t('realty.detail.propertyOverview')}</p>
                                <h2 className="mt-2 font-header text-2xl font-bold text-[var(--realty-heading)]">{t('realty.detail.description')}</h2>
                                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--realty-text)] md:text-base">{description}</p>
                            </DetailPanel>

                            {(highlights.length > 0 || features.length > 0 || amenities.length > 0) && (
                                <DetailPanel radiusClass={cardRadius} className="grid gap-6 p-5 md:p-6 lg:grid-cols-3">
                                    {highlights.length > 0 && (
                                        <div>
                                            <h3 className="font-header text-xl font-bold text-[var(--realty-heading)]">{t('realty.detail.highlights')}</h3>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {highlights.map(item => (
                                                    <DetailChip key={item} variant="soft">{item}</DetailChip>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {features.length > 0 && (
                                        <div>
                                            <h3 className="font-header text-xl font-bold text-[var(--realty-heading)]">{t('realty.detail.features')}</h3>
                                            <div className="mt-4 space-y-3">
                                                {features.map(item => (
                                                    <p key={item} className="flex items-start gap-2 text-sm leading-6 text-[var(--realty-text)]">
                                                        <Check size={15} className="mt-1 shrink-0 text-[var(--realty-accent)]" />
                                                        {item}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {amenities.length > 0 && (
                                        <div>
                                            <h3 className="font-header text-xl font-bold text-[var(--realty-heading)]">{t('realty.detail.amenities')}</h3>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {amenities.map(item => (
                                                    <DetailChip key={item}>{item}</DetailChip>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </DetailPanel>
                            )}

                            {metadataFaq.length > 0 && (
                                <DetailPanel radiusClass={cardRadius} className="p-5 md:p-6">
                                    <h2 className="font-header text-2xl font-bold text-[var(--realty-heading)]">{t('realty.detail.faq')}</h2>
                                    <div className="mt-4 divide-y divide-[var(--realty-border-soft)]">
                                        {metadataFaq.map(item => (
                                            <div key={item.question} className="py-4 first:pt-0 last:pb-0">
                                                <p className="font-semibold text-[var(--realty-heading)]">{item.question}</p>
                                                <p className="mt-2 text-sm leading-6 text-[var(--realty-muted)]">{item.answer}</p>
                                            </div>
                                        ))}
                                    </div>
                                </DetailPanel>
                            )}
                        </div>
                    </main>

                    <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
                        <DetailPanel radiusClass={cardRadius} className="p-5" id="realty-contact">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--realty-accent)] text-[var(--realty-badge-text)]">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <h2 className="font-header text-xl font-bold text-[var(--realty-heading)]">{t('realty.detail.contactTitle')}</h2>
                                    <p className="mt-1 text-sm leading-6 text-[var(--realty-muted)]">{t('realty.detail.contactSubtitle')}</p>
                                </div>
                            </div>
                            <form onSubmit={submitLead} className="mt-5 space-y-3">
                                <DetailInput required value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} placeholder={t('realty.leads.name')} />
                                <DetailInput icon={Mail} required type="email" value={form.email} onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))} placeholder={t('realty.leads.email')} />
                                <DetailInput icon={Phone} value={form.phone} onChange={event => setForm(prev => ({ ...prev, phone: event.target.value }))} placeholder={t('realty.leads.phone')} />
                                <DetailTextarea value={form.message} onChange={event => setForm(prev => ({ ...prev, message: event.target.value }))} placeholder={t('realty.detail.messagePlaceholder')} rows={4} />
                                <DetailButton type="submit" disabled={status === 'saving'} variant="primary" radiusClass={buttonRadius} className="w-full">
                                    <Send size={16} />
                                    {status === 'saving' ? t('realty.detail.sending') : t('realty.detail.sendLead')}
                                </DetailButton>
                                {status === 'saved' && <StatusMessage status="success">{t('realty.detail.sent')}</StatusMessage>}
                                {status === 'error' && <StatusMessage status="error">{t('realty.detail.sendError')}</StatusMessage>}
                            </form>
                        </DetailPanel>

                        {openHouses.length > 0 && (
                            <DetailPanel radiusClass={cardRadius} className="p-5">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--realty-accent-soft)] text-[var(--realty-accent)]">
                                        <CalendarDays size={19} />
                                    </div>
                                    <div>
                                        <h2 className="font-header text-xl font-bold text-[var(--realty-heading)]">{t('realty.detail.openHouseTitle')}</h2>
                                        <p className="mt-1 text-sm leading-6 text-[var(--realty-muted)]">{t('realty.detail.openHouseSubtitle')}</p>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-2">
                                    {openHouses.map(openHouse => {
                                        const active = selectedOpenHouse?.id === openHouse.id;
                                        const capacity = isRecord(openHouse.metadata) && typeof openHouse.metadata.capacity === 'number'
                                            ? openHouse.metadata.capacity
                                            : null;
                                        return (
                                            <button
                                                key={openHouse.id}
                                                type="button"
                                                onClick={() => setSelectedOpenHouseId(openHouse.id)}
                                                className={cx(
                                                    'w-full rounded-md border px-3 py-3 text-left text-sm transition-all duration-200 hover:-translate-y-0.5',
                                                    active ? 'border-[var(--realty-accent)] bg-[var(--realty-accent-soft)]' : 'border-[var(--realty-border-soft)] bg-[var(--realty-surface-soft)]'
                                                )}
                                            >
                                                <span className="block font-semibold text-[var(--realty-heading)]">{openHouse.title || t('realty.detail.openHouseTitle')}</span>
                                                <span className="mt-1 flex items-start gap-2 text-xs leading-5 text-[var(--realty-muted)]">
                                                    <Clock size={13} className="mt-0.5 shrink-0" />
                                                    {renderOpenHouseDate(openHouse)}
                                                </span>
                                                <span className="mt-2 flex flex-wrap gap-2">
                                                    {openHouse.status && (
                                                        <DetailChip variant="outline">{t(`realty.openHouseStatuses.${openHouse.status}`, { defaultValue: openHouse.status })}</DetailChip>
                                                    )}
                                                    {capacity !== null && <DetailChip variant="soft">{t('realty.detail.capacity', { count: capacity })}</DetailChip>}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <form onSubmit={submitOpenHouseRegistration} className="mt-5 space-y-3">
                                    <DetailInput required value={openHouseForm.name} onChange={event => setOpenHouseForm(prev => ({ ...prev, name: event.target.value }))} placeholder={t('realty.leads.name')} />
                                    <DetailInput icon={Mail} required type="email" value={openHouseForm.email} onChange={event => setOpenHouseForm(prev => ({ ...prev, email: event.target.value }))} placeholder={t('realty.leads.email')} />
                                    <DetailInput icon={Phone} value={openHouseForm.phone} onChange={event => setOpenHouseForm(prev => ({ ...prev, phone: event.target.value }))} placeholder={t('realty.leads.phone')} />
                                    <DetailTextarea value={openHouseForm.message} onChange={event => setOpenHouseForm(prev => ({ ...prev, message: event.target.value }))} placeholder={t('realty.detail.openHouseMessagePlaceholder')} rows={3} />
                                    <DetailButton type="submit" disabled={openHouseStatus === 'saving'} variant="primary" radiusClass={buttonRadius} className="w-full">
                                        <Send size={16} />
                                        {openHouseStatus === 'saving' ? t('realty.detail.sending') : t('realty.detail.registerOpenHouse')}
                                    </DetailButton>
                                    {openHouseStatus === 'saved' && <StatusMessage status="success">{t('realty.detail.openHouseRegistered')}</StatusMessage>}
                                    {openHouseStatus === 'error' && <StatusMessage status="error">{t('realty.detail.openHouseRegisterError')}</StatusMessage>}
                                </form>
                            </DetailPanel>
                        )}

                        <DetailPanel radiusClass={cardRadius} className="p-4">
                            <div className="flex items-start gap-3">
                                <Info size={17} className="mt-0.5 shrink-0 text-[var(--realty-accent)]" />
                                <p className="text-sm leading-6 text-[var(--realty-muted)]">{t('realty.detail.leadPrivacyNote')}</p>
                            </div>
                        </DetailPanel>
                    </aside>
                </div>

                {related.length > 0 && (
                    <section className="mt-12">
                        <div className="mb-5 flex items-end justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--realty-accent)]">{t('realty.detail.similarListings')}</p>
                                <h2 className="mt-1 font-header text-2xl font-bold text-[var(--realty-heading)]">{t('realty.detail.related')}</h2>
                            </div>
                            <DetailButton onClick={goListings} variant="ghost" radiusClass={buttonRadius} className="hidden md:inline-flex">
                                {t('realty.directory.allListings')}
                            </DetailButton>
                        </div>
                        <div className="grid gap-5 md:grid-cols-3">
                            {related.map(item => {
                                const image = getPropertyImage(item);
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => goProperty(item.slug)}
                                        className={cx(
                                            'group overflow-hidden border border-[var(--realty-border-soft)] bg-[var(--realty-card)] text-left shadow-[0_16px_44px_-34px_rgba(0,0,0,0.65)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--realty-accent)]',
                                            cardRadius
                                        )}
                                    >
                                        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--realty-surface-strong)]">
                                            {image ? (
                                                <img src={image} alt={item.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" loading="lazy" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-[var(--realty-muted)]">
                                                    <Home size={36} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <p className="font-header text-lg font-bold text-[var(--realty-price)]">{formatRealtyPrice(item.price, i18n.language, item.currency)}</p>
                                            <p className="mt-1 line-clamp-2 font-semibold leading-snug text-[var(--realty-accent)]">{item.title}</p>
                                            <p className="mt-2 line-clamp-1 text-sm text-[var(--realty-muted)]">{getLocationLabel(item)}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </section>
    );
};

export default PublicRealtyPropertyDetail;
