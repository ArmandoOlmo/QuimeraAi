import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    Bath,
    BedDouble,
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    DollarSign,
    Home,
    Info,
    LineChart,
    Mail,
    MapPin,
    Maximize2,
    MessageSquare,
    Phone,
    PieChart,
    Ruler,
    Share2,
    Star,
    Tag,
    TrendingUp,
    Wand2,
    X,
} from 'lucide-react';
import { ThemeData } from '../../types';
import { Property } from '../../types/realEstate';
import { usePublicRealEstateListings } from '../../hooks/usePublicRealEstateListings';
import { extractTextFromResponse, generateContentViaProxy } from '../../utils/geminiProxyClient';
import { useSafeEditor } from '../../contexts/EditorContext';
import { db, collection, addDoc, serverTimestamp } from '../../firebase';

interface PropertyDetailSectionProps {
    projectId: string;
    ownerId?: string;
    propertySlug?: string;
    colors?: { background?: string; heading?: string; text?: string; accent?: string };
    theme?: ThemeData;
    globalColors?: Record<string, string>;
    onNavigateToListings?: () => void;
    onNavigateToProperty?: (slug: string) => void;
    onNavigateHome?: () => void;
}

type ModalType = 'tour' | 'info' | 'offer' | 'financing' | null;

interface LeadFormState {
    name: string;
    email: string;
    phone: string;
    preferredDate: string;
    offerAmount: string;
    message: string;
}

const initialLeadForm: LeadFormState = {
    name: '',
    email: '',
    phone: '',
    preferredDate: '',
    offerAmount: '',
    message: '',
};

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

const buildPropertyContext = (property: Property) => [
    `Title: ${property.title}`,
    `Price: ${property.price}`,
    `Address: ${[property.address, property.city, property.state, property.zipCode].filter(Boolean).join(', ')}`,
    `Type: ${property.propertyType}`,
    `Beds: ${property.bedrooms}`,
    `Baths: ${property.bathrooms}`,
    `Sqft: ${property.squareFeet}`,
    `Year built: ${property.yearBuilt || 'N/A'}`,
    `Amenities: ${(property.amenities || []).join(', ') || 'N/A'}`,
    `Description: ${property.description}`,
].join('\n');

const deterministicScore = (property: Property, offset: number) => {
    const base = Math.round(((property.price || 0) / Math.max(property.squareFeet || 1, 1)) % 4);
    return Math.min(10, Math.max(6, 7 + ((property.bedrooms || 0) + (property.bathrooms || 0) + base + offset) % 4));
};

const estimateRent = (property: Property) => {
    const priceRent = (property.price || 0) * 0.006;
    const sqftRent = (property.squareFeet || 0) * 1.9;
    return Math.max(1200, Math.round((priceRent + sqftRent) / 2));
};

const buildOsmSrc = (lat: number, lng: number) => {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.025},${lat - 0.018},${lng + 0.025},${lat + 0.018}&layer=mapnik&marker=${lat},${lng}`;
};

const colorWithAlpha = (color: string | undefined, alpha: number, fallback = 'rgba(79, 70, 229, 0.1)') => {
    if (!color) return fallback;
    if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        const normalized = hex.length === 3 ? hex.split('').map(char => char + char).join('') : hex;
        if (normalized.length === 6) {
            const r = parseInt(normalized.slice(0, 2), 16);
            const g = parseInt(normalized.slice(2, 4), 16);
            const b = parseInt(normalized.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }
    if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    if (color.startsWith('rgba(')) return color;
    return color;
};

const PropertyDetailSection: React.FC<PropertyDetailSectionProps> = ({
    projectId,
    ownerId,
    propertySlug = '',
    colors: propColors,
    theme,
    globalColors,
    onNavigateToListings,
    onNavigateToProperty,
    onNavigateHome,
}) => {
    const { t, i18n } = useTranslation();
    const { properties, isLoading, error } = usePublicRealEstateListings(projectId || null, {
        limitCount: 50,
        featuredOnly: false,
        realtime: false,
    });

    const themeColors = globalColors || theme?.globalColors || {};
    const accent = propColors?.accent || themeColors.primary || themeColors.accent || '#4f46e5';
    const colors = {
        background: propColors?.background || themeColors.background || theme?.pageBackground || '#ffffff',
        surface: themeColors.surface || themeColors.cardBackground || '#ffffff',
        surfaceAlt: themeColors.surfaceAlt || themeColors.cardAlt || themeColors.background || '#f8fafc',
        heading: propColors?.heading || themeColors.heading || themeColors.text || '#111827',
        text: propColors?.text || themeColors.text || '#374151',
        muted: themeColors.textMuted || themeColors.muted || '#6b7280',
        border: themeColors.border || 'rgba(148, 163, 184, 0.32)',
        accent,
        accentSoft: colorWithAlpha(accent, 0.1),
        accentSofter: colorWithAlpha(accent, 0.08),
        buttonBackground: themeColors.buttonBackground || accent,
        buttonText: themeColors.buttonText || '#ffffff',
        inputBackground: themeColors.inputBackground || themeColors.background || '#0f172a',
        inputText: themeColors.inputText || themeColors.text || '#111827',
        inputBorder: themeColors.inputBorder || themeColors.border || 'rgba(148, 163, 184, 0.5)',
        overlay: themeColors.overlay || 'rgba(0, 0, 0, 0.55)',
        imageOverlay: themeColors.imageOverlay || 'rgba(17, 24, 39, 0.82)',
        badgeBackground: themeColors.badgeBackground || themeColors.surface || 'rgba(255, 255, 255, 0.92)',
        badgeText: themeColors.badgeText || themeColors.heading || '#111827',
        success: themeColors.success || '#16a34a',
        error: themeColors.error || '#dc2626',
    };

    const property = useMemo(() => properties.find(item => item.slug === propertySlug), [properties, propertySlug]);
    const related = useMemo(() => {
        if (!property) return [];
        return properties
            .filter(item => item.id !== property.id)
            .map(item => ({
                item,
                score:
                    (item.propertyType === property.propertyType ? 2 : 0) +
                    (Math.abs((item.price || 0) - (property.price || 0)) < (property.price || 1) * 0.25 ? 2 : 0) +
                    (item.city === property.city ? 1 : 0),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(result => result.item);
    }, [properties, property]);

    const [selectedImage, setSelectedImage] = useState(0);
    const [investmentMode, setInvestmentMode] = useState(false);
    const [downPayment, setDownPayment] = useState(20);
    const [interestRate, setInterestRate] = useState(6.75);
    const [loanTerm, setLoanTerm] = useState(30);
    const [modal, setModal] = useState<ModalType>(null);
    const [form, setForm] = useState<LeadFormState>(initialLeadForm);
    const [leadStatus, setLeadStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [geocodedPoint, setGeocodedPoint] = useState<{ lat: number; lng: number } | null>(null);
    const [floatingHeaderOffset, setFloatingHeaderOffset] = useState(0);

    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.getPropertyValue('--property-detail-bg');
        root.style.setProperty('--property-detail-bg', colors.background);
        return () => {
            if (previous) {
                root.style.setProperty('--property-detail-bg', previous);
            } else {
                root.style.removeProperty('--property-detail-bg');
            }
        };
    }, [colors.background]);

    useEffect(() => {
        const measureHeaderOffset = () => {
            const header = document.querySelector('[data-site-header="true"]') as HTMLElement | null;
            if (!header) {
                setFloatingHeaderOffset(0);
                return;
            }

            const position = window.getComputedStyle(header).position;
            const rect = header.getBoundingClientRect();
            const shouldReserveSpace = position === 'fixed' || position === 'absolute';
            setFloatingHeaderOffset(shouldReserveSpace ? Math.max(0, Math.ceil(rect.bottom + 16)) : 0);
        };

        measureHeaderOffset();
        const raf = window.requestAnimationFrame(measureHeaderOffset);
        window.addEventListener('resize', measureHeaderOffset);
        window.addEventListener('scroll', measureHeaderOffset, { passive: true });

        const header = document.querySelector('[data-site-header="true"]') as HTMLElement | null;
        const observer = header && 'ResizeObserver' in window ? new ResizeObserver(measureHeaderOffset) : null;
        if (header && observer) observer.observe(header);

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('resize', measureHeaderOffset);
            window.removeEventListener('scroll', measureHeaderOffset);
            observer?.disconnect();
        };
    }, []);

    useEffect(() => {
        setSelectedImage(0);
    }, [propertySlug]);
    useEffect(() => {
        if (!property || typeof property.latitude === 'number' || typeof property.longitude === 'number') {
            setGeocodedPoint(null);
            return;
        }
        const address = [property.address, property.city, property.state, property.zipCode].filter(Boolean).join(', ');
        if (!address) return;
        let cancelled = false;
        fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`, {
            headers: { Accept: 'application/json' },
        })
            .then(response => response.ok ? response.json() : [])
            .then(results => {
                if (cancelled || !Array.isArray(results) || !results[0]) return;
                const lat = Number(results[0].lat);
                const lng = Number(results[0].lon);
                if (Number.isFinite(lat) && Number.isFinite(lng)) setGeocodedPoint({ lat, lng });
            })
            .catch(() => setGeocodedPoint(null));
        return () => {
            cancelled = true;
        };
    }, [property?.id]);

    const fallbackInsights = (item: Property) => [
        t('realEstate.detail.insightSaleTime', 'Estimated sale time: competitive if priced near recent local activity.'),
        t('realEstate.detail.insightPriceComparison', 'Price comparison: review nearby listings before submitting an offer.'),
        t('realEstate.detail.insightDemand', 'Zone demand level: healthy demand for well-presented properties in this area.'),
        t('realEstate.detail.insightImprovements', 'Improvement suggestion: highlight outdoor, parking, storage, and energy features.'),
    ];

    const mortgage = useMemo(() => {
        if (!property) return null;
        const price = property.price || 0;
        const down = price * (downPayment / 100);
        const principal = Math.max(price - down, 0);
        const monthlyRate = interestRate / 100 / 12;
        const months = loanTerm * 12;
        const principalInterest = monthlyRate > 0
            ? principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
            : principal / months;
        const tax = price * 0.009 / 12;
        const insurance = price * 0.0035 / 12;
        return {
            down,
            principalInterest,
            tax,
            insurance,
            monthly: principalInterest + tax + insurance,
        };
    }, [downPayment, interestRate, loanTerm, property]);

    const investment = useMemo(() => {
        if (!property || !mortgage) return null;
        const rent = estimateRent(property);
        const annualRent = rent * 12;
        const expenses = annualRent * 0.35;
        const noi = annualRent - expenses;
        const capRate = property.price ? (noi / property.price) * 100 : 0;
        const cashInvested = mortgage.down || property.price * 0.2;
        const cashFlow = annualRent - expenses - mortgage.principalInterest * 12;
        const cashOnCash = cashInvested ? (cashFlow / cashInvested) * 100 : 0;
        const roi = property.price ? ((noi - mortgage.principalInterest * 12) / property.price) * 100 : 0;
        return { rent, roi, capRate, cashOnCash };
    }, [mortgage, property]);

    const scores = useMemo(() => {
        if (!property) return [];
        return [
            { label: t('realEstate.detail.valueScore', 'Value Score'), value: deterministicScore(property, 0) },
            { label: t('realEstate.detail.locationScore', 'Location Score'), value: deterministicScore(property, 1) },
            { label: t('realEstate.detail.conditionScore', 'Condition Score'), value: deterministicScore(property, 2) },
            { label: t('realEstate.detail.investmentScore', 'Investment Score'), value: deterministicScore(property, 3) },
        ];
    }, [property, t]);

    const editorContext = useSafeEditor();
    const addLead = editorContext?.addLead;

    const resolvedOwnerId = ownerId || editorContext?.activeProject?.userId || '';
    const resolvedProjectId = projectId || editorContext?.activeProject?.id || '';

    const submitLead = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!property) return;
        setLeadStatus('saving');
        
        const leadPayload = {
            name: form.name,
            email: form.email,
            phone: form.phone,
            message: [
                form.message,
                form.preferredDate ? `Preferred date: ${form.preferredDate}` : '',
                form.offerAmount ? `Offer amount: ${form.offerAmount}` : '',
            ].filter(Boolean).join('\n'),
            source: 'property-detail',
            status: 'new' as const,
            value: 0,
            leadScore: 50,
            tags: ['real-estate', `property:${property.slug}`, modal || 'property-detail'],
            propertyId: property.id,
            propertyTitle: property.title,
        };
        
        try {
            if (addLead) {
                // Inside editor — use EditorContext
                await addLead(leadPayload);
            } else if (resolvedOwnerId && resolvedProjectId) {
                // Public site — write directly to Firestore
                const leadsPath = `users/${resolvedOwnerId}/projects/${resolvedProjectId}/leads`;
                await addDoc(collection(db, leadsPath), {
                    ...leadPayload,
                    projectId: resolvedProjectId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            } else {
                throw new Error('Missing owner or project ID for lead submission');
            }
            setLeadStatus('saved');
            setForm(initialLeadForm);
            window.setTimeout(() => {
                setModal(null);
                setLeadStatus('idle');
            }, 900);
        } catch (err) {
            console.error('Property lead capture failed:', err);
            setLeadStatus('error');
        }
    };

    if (isLoading) {
        return <div className="min-h-screen animate-pulse font-body" style={{ backgroundColor: colors.background, fontFamily: 'var(--font-body)', paddingTop: floatingHeaderOffset ? `${floatingHeaderOffset}px` : undefined }} />;
    }

    if (error || !property) {
        return (
            <section className="flex min-h-screen items-center justify-center px-4 font-body" style={{ backgroundColor: colors.background, color: colors.text, fontFamily: 'var(--font-body)', paddingTop: floatingHeaderOffset ? `${floatingHeaderOffset}px` : undefined }}>
                <div className="max-w-lg rounded-lg border p-8 text-center" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                    <Home className="mx-auto mb-4" size={44} style={{ color: colors.accent }} />
                    <h1 className="text-2xl font-bold font-header" style={{ color: colors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{t('realEstate.detail.notFoundTitle', 'Property not found')}</h1>
                    <p className="mt-2" style={{ color: colors.muted }}>{error || t('realEstate.detail.notFoundDescription', 'This listing is unavailable or no longer active.')}</p>
                    <button type="button" onClick={onNavigateToListings || (() => navigateTo('/listados'))} className="mt-6 rounded-md px-4 py-2 text-sm font-semibold font-button" style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText, textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}>
                        {t('realEstate.detail.backToListings', 'Back to listings')}
                    </button>
                </div>
            </section>
        );
    }

    const images = property.images?.length ? property.images : [];
    const mainImage = images[selectedImage]?.url;
    const mapLat = typeof property.latitude === 'number' ? property.latitude : geocodedPoint?.lat;
    const mapLng = typeof property.longitude === 'number' ? property.longitude : geocodedPoint?.lng;
    const fullAddress = [property.address, property.city, property.state, property.zipCode].filter(Boolean).join(', ');

    const openModal = (type: ModalType) => {
        setLeadStatus('idle');
        setForm(initialLeadForm);
        setModal(type);
    };

    const modalTitle = {
        tour: t('realEstate.detail.schedulePrivateTour', 'Schedule Private Tour'),
        info: t('realEstate.detail.requestMoreInfo', 'Request More Info'),
        offer: t('realEstate.detail.makeAnOffer', 'Make an Offer'),
        financing: t('realEstate.detail.getFinancingInfo', 'Get Financing Info'),
    }[modal || 'info'];

    return (
        <section className="min-h-screen w-full font-body" style={{ backgroundColor: colors.background, color: colors.text, fontFamily: 'var(--font-body)', paddingTop: floatingHeaderOffset ? `${floatingHeaderOffset}px` : undefined }}>
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
                <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm" style={{ color: colors.muted }}>
                    <button type="button" onClick={onNavigateHome || (() => navigateTo('/'))} className="hover:underline">{t('realEstate.detail.home', 'Home')}</button>
                    <span>/</span>
                    <button type="button" onClick={onNavigateToListings || (() => navigateTo('/listados'))} className="hover:underline">{t('realEstate.detail.listings', 'Listings')}</button>
                    <span>/</span>
                    <span style={{ color: colors.text }}>{property.title}</span>
                </nav>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
                    <div className="overflow-hidden rounded-lg border" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                        <div className="relative aspect-[16/10] overflow-hidden" style={{ backgroundColor: colors.border }}>
                            {mainImage ? (
                                <img src={mainImage} alt={images[selectedImage]?.altText || property.title} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center"><Home size={64} style={{ color: colors.muted }} /></div>
                            )}
                            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                                {property.isFeatured && <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}><Star size={13} />{t('realEstate.websiteListings.featured')}</span>}
                                <span className="rounded-full px-3 py-1 text-xs font-semibold capitalize" style={{ backgroundColor: colors.accentSoft, color: colors.accent }}>{t(`realEstate.status.${property.status}`)}</span>
                                <span className="rounded-full px-3 py-1 text-xs font-semibold capitalize" style={{ backgroundColor: colors.badgeBackground, color: colors.badgeText }}>{t(`realEstate.propertyTypes.${property.propertyType}`)}</span>
                            </div>
                            <button type="button" className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold font-button" style={{ backgroundColor: colors.imageOverlay, color: colors.buttonText }}>
                                <Maximize2 size={16} />{t('realEstate.detail.gallery', 'Gallery')}
                            </button>
                        </div>
                        {images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto p-3">
                                {images.map((image, index) => (
                                    <button key={image.id || image.url} type="button" onClick={() => setSelectedImage(index)} className="h-20 w-28 shrink-0 overflow-hidden rounded-md border" style={{ borderColor: selectedImage === index ? colors.accent : colors.border }}>
                                        <img src={image.url} alt={image.altText || `${property.title} ${index + 1}`} className="h-full w-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <aside className="rounded-lg border p-6 lg:sticky lg:top-6 lg:self-start" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                        <button type="button" onClick={onNavigateToListings || (() => navigateTo('/listados'))} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold font-button" style={{ color: colors.accent }}>
                            <ArrowLeft size={16} />{t('realEstate.detail.backToListings', 'Back to listings')}
                        </button>
                        <p className="text-3xl font-bold font-header" style={{ color: colors.accent }}>{formatPrice(property.price, i18n.language)}</p>
                        <h1 className="mt-2 text-3xl font-bold leading-tight font-header" style={{ color: colors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{property.title}</h1>
                        <p className="mt-3 flex items-start gap-2" style={{ color: colors.muted }}><MapPin size={18} className="mt-1 shrink-0" />{fullAddress}</p>
                        <div className="mt-6 grid grid-cols-2 gap-3">
                            {[
                                { icon: BedDouble, label: t('realEstate.units.beds'), value: property.bedrooms || 0 },
                                { icon: Bath, label: t('realEstate.units.baths'), value: property.bathrooms || 0 },
                                { icon: Ruler, label: t('realEstate.units.sqft'), value: (property.squareFeet || 0).toLocaleString() },
                                { icon: CalendarDays, label: t('realEstate.detail.yearBuilt', 'Year built'), value: property.yearBuilt || t('realEstate.detail.notAvailable', 'N/A') },
                            ].map(stat => (
                                <div key={stat.label} className="rounded-md border p-3" style={{ borderColor: colors.border }}>
                                    <stat.icon size={18} style={{ color: colors.accent }} />
                                    <p className="mt-2 text-xl font-bold font-header" style={{ color: colors.heading }}>{stat.value}</p>
                                    <p className="text-xs" style={{ color: colors.muted }}>{stat.label}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 grid gap-2">
                            <button type="button" onClick={() => openModal('tour')} className="rounded-md px-4 py-3 text-sm font-semibold font-button" style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText, textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}>{t('realEstate.detail.scheduleTour', 'Schedule Tour')}</button>
                            <button type="button" onClick={() => openModal('info')} className="rounded-md border px-4 py-3 text-sm font-semibold font-button" style={{ borderColor: colors.border, color: colors.text, textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}>{t('realEstate.detail.contactAgent', 'Contact Agent')}</button>
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => navigator.share?.({ title: property.title, url: window.location.href })} className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold font-button" style={{ borderColor: colors.border, textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}><Share2 size={16} />{t('realEstate.detail.share', 'Share')}</button>
                                <button type="button" className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold font-button" style={{ borderColor: colors.border, textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}><Star size={16} />{t('realEstate.detail.save', 'Save')}</button>
                            </div>
                        </div>
                    </aside>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-6">
                        <Panel colors={colors} title={t('realEstate.detail.propertyScore', 'Property Score')} icon={<LineChart size={20} />}>
                            <div className="grid gap-4 md:grid-cols-2">
                                {scores.map(score => (
                                    <div key={score.label} className="rounded-lg border p-5" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold font-header" style={{ color: colors.heading }}>{score.label}</p>
                                            <span className="text-2xl font-bold font-header" style={{ color: colors.accent }}>{score.value}/10</span>
                                        </div>
                                        <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: colors.border }}>
                                            <div className="h-full rounded-full" style={{ width: `${score.value * 10}%`, backgroundColor: colors.accent }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Panel>

                        <Panel colors={colors} title={t('realEstate.detail.description', 'Description')} icon={<Info size={20} />}>
                            <p className="whitespace-pre-line leading-8">{property.description}</p>
                        </Panel>

                        <Panel colors={colors} title={t('realEstate.detail.featuresDetails', 'Features & Details')} icon={<Tag size={20} />}>
                            <div className="grid gap-3 md:grid-cols-2">
                                {[
                                    [t('realEstate.form.propertyType'), t(`realEstate.propertyTypes.${property.propertyType}`)],
                                    [t('realEstate.detail.yearBuilt', 'Year built'), property.yearBuilt || t('realEstate.detail.notAvailable', 'N/A')],
                                    [t('realEstate.detail.parking', 'Parking'), property.parkingSpaces ? `${property.parkingSpaces}` : t('realEstate.detail.notAvailable', 'N/A')],
                                    [t('realEstate.detail.lotSize', 'Lot size'), property.lotSize ? `${property.lotSize.toLocaleString()} ${t('realEstate.units.sqft')}` : t('realEstate.detail.notAvailable', 'N/A')],
                                    [t('realEstate.form.address'), fullAddress],
                                    [t('realEstate.form.status'), t(`realEstate.status.${property.status}`)],
                                ].map(([label, value]) => (
                                    <div key={String(label)} className="rounded-md border p-4" style={{ borderColor: colors.border }}>
                                        <p className="text-xs uppercase" style={{ color: colors.muted }}>{label}</p>
                                        <p className="mt-1 font-semibold font-header" style={{ color: colors.heading }}>{value}</p>
                                    </div>
                                ))}
                            </div>
                            {property.amenities?.length > 0 && (
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {property.amenities.map(amenity => <span key={amenity} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold" style={{ backgroundColor: colors.accentSofter, color: colors.accent }}><Check size={14} />{amenity}</span>)}
                                </div>
                            )}
                        </Panel>

                        <Panel colors={colors} title={t('realEstate.detail.locationMap', 'Location Map')} icon={<MapPin size={20} />}>
                            <div className="overflow-hidden rounded-lg border" style={{ borderColor: colors.border }}>
                                {typeof mapLat === 'number' && typeof mapLng === 'number' ? (
                                    <iframe title={property.title} className="h-[420px] w-full" style={{ border: 0 }} loading="lazy" src={buildOsmSrc(mapLat, mapLng)} />
                                ) : (
                                    <div className="flex h-[320px] items-center justify-center p-8 text-center" style={{ backgroundColor: colors.surface }}>
                                        <div><MapPin className="mx-auto mb-3" style={{ color: colors.accent }} /><p style={{ color: colors.muted }}>{t('realEstate.detail.mapPending', 'Map coordinates are not available yet.')}</p></div>
                                    </div>
                                )}
                            </div>
                            <p className="mt-3 text-sm" style={{ color: colors.muted }}>{fullAddress}</p>
                        </Panel>
                    </div>

                    <div className="space-y-6">
                        {(property.videoUrl || property.virtualTourUrl) && (
                            <Panel colors={colors} title={t('realEstate.detail.mediaTour', 'Media / Virtual Tour')} icon={<Maximize2 size={20} />}>
                                <div className="grid gap-4">
                                    {property.videoUrl && <ResponsiveFrame title={t('realEstate.detail.video', 'Video')} src={property.videoUrl} colors={colors} />}
                                    {property.virtualTourUrl && <ResponsiveFrame title={t('realEstate.detail.virtualTour', 'Virtual tour')} src={property.virtualTourUrl} colors={colors} />}
                                </div>
                            </Panel>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Panel colors={colors} title={t('realEstate.detail.mortgageCalculator', 'Mortgage Calculator')} icon={<DollarSign size={20} />}>
                            <div className="space-y-4">
                                <NumberInput label={t('realEstate.detail.downPayment', 'Down payment %')} value={downPayment} setValue={setDownPayment} colors={colors} min={0} max={90} step={1} />
                                <NumberInput label={t('realEstate.detail.interestRate', 'Interest rate %')} value={interestRate} setValue={setInterestRate} colors={colors} min={0.1} max={20} step={0.05} />
                                <NumberInput label={t('realEstate.detail.loanTerm', 'Loan term')} value={loanTerm} setValue={setLoanTerm} colors={colors} min={5} max={40} step={1} />
                            </div>
                            {mortgage && (
                                <div className="mt-5 rounded-lg border p-4" style={{ borderColor: colors.border }}>
                                    <p className="text-sm" style={{ color: colors.muted }}>{t('realEstate.detail.estimatedMonthlyPayment', 'Estimated monthly payment')}</p>
                                    <p className="mt-1 text-3xl font-bold font-header" style={{ color: colors.accent }}>{formatPrice(mortgage.monthly, i18n.language)}</p>
                                    <div className="mt-4 space-y-2 text-sm">
                                        <Breakdown label={t('realEstate.detail.principalInterest', 'Principal & Interest')} value={mortgage.principalInterest} locale={i18n.language} colors={colors} />
                                        <Breakdown label={t('realEstate.detail.propertyTax', 'Property Tax')} value={mortgage.tax} locale={i18n.language} colors={colors} />
                                        <Breakdown label={t('realEstate.detail.insurance', 'Insurance')} value={mortgage.insurance} locale={i18n.language} colors={colors} />
                                    </div>
                                    <p className="mt-3 text-xs" style={{ color: colors.muted }}>{t('realEstate.detail.mortgageDisclaimer', 'Estimate only. Taxes, insurance, PMI, HOA, and lender terms may vary.')}</p>
                                </div>
                            )}
                        </Panel>

                        <Panel colors={colors} title={t('realEstate.detail.investmentMode', 'Investment Mode')} icon={<PieChart size={20} />}>
                            <label className="mb-4 flex cursor-pointer items-center justify-between gap-4">
                                <span className="font-semibold font-header">{t('realEstate.detail.investmentAnalysis', 'Investment Analysis')}</span>
                                <input type="checkbox" checked={investmentMode} onChange={event => setInvestmentMode(event.target.checked)} className="h-5 w-5 accent-current" style={{ color: colors.accent }} />
                            </label>
                            {investmentMode && investment && (
                                <div className="grid gap-3">
                                    <InvestmentMetric label={t('realEstate.detail.estimatedRent', 'Estimated Monthly Rent')} value={formatPrice(investment.rent, i18n.language)} colors={colors} />
                                    <InvestmentMetric label={t('realEstate.detail.annualRoi', 'Annual ROI')} value={`${investment.roi.toFixed(1)}%`} colors={colors} />
                                    <InvestmentMetric label={t('realEstate.detail.capRate', 'Cap Rate')} value={`${investment.capRate.toFixed(1)}%`} colors={colors} />
                                    <InvestmentMetric label={t('realEstate.detail.cashOnCash', 'Cash-on-Cash Return')} value={`${investment.cashOnCash.toFixed(1)}%`} colors={colors} />
                                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: colors.accentSofter, color: colors.accent }}>{t('realEstate.detail.aiEstimatedDisclaimer', 'AI Estimated - Not financial advice')}</span>
                                </div>
                            )}
                        </Panel>

                        <Panel colors={colors} title={t('realEstate.detail.takeAction', 'Take Action')} icon={<MessageSquare size={20} />}>
                            <div className="grid gap-3">
                                <ActionButton icon={<CalendarDays size={17} />} label={t('realEstate.detail.schedulePrivateTour', 'Schedule Private Tour')} onClick={() => openModal('tour')} colors={colors} />
                                <ActionButton icon={<Mail size={17} />} label={t('realEstate.detail.requestMoreInfo', 'Request More Info')} onClick={() => openModal('info')} colors={colors} />
                                <ActionButton icon={<TrendingUp size={17} />} label={t('realEstate.detail.makeAnOffer', 'Make an Offer')} onClick={() => openModal('offer')} colors={colors} />
                                <ActionButton icon={<DollarSign size={17} />} label={t('realEstate.detail.getFinancingInfo', 'Get Financing Info')} onClick={() => openModal('financing')} colors={colors} />
                            </div>
                        </Panel>
                    </div>
                </div>

                {related.length > 0 && (
                    <Panel colors={colors} title={t('realEstate.detail.relatedProperties', 'Related Properties')} icon={<Home size={20} />} className="mt-8">
                        <div className="grid gap-6 md:grid-cols-3">
                            {related.map(item => (
                                <button key={item.id} type="button" onClick={() => onNavigateToProperty ? onNavigateToProperty(item.slug) : navigateTo(`/listados/${item.slug}`)} className="overflow-hidden rounded-lg border text-left transition hover:-translate-y-1" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                                    <div className="aspect-[4/3] overflow-hidden" style={{ backgroundColor: colors.border }}>
                                        {item.images?.[0]?.url ? <img src={item.images[0].url} alt={item.title} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center"><Home style={{ color: colors.muted }} /></div>}
                                    </div>
                                    <div className="p-4">
                                        <p className="text-lg font-bold font-header" style={{ color: colors.accent }}>{formatPrice(item.price, i18n.language)}</p>
                                        <p className="mt-1 font-semibold font-header" style={{ color: colors.heading }}>{item.title}</p>
                                        <p className="mt-2 text-sm" style={{ color: colors.muted }}>{item.city}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={onNavigateToListings || (() => navigateTo('/listados'))} className="mt-6 rounded-md border px-4 py-2 text-sm font-semibold font-button" style={{ borderColor: colors.border, textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}>
                            {t('realEstate.detail.viewAllProperties', 'View All Properties')}
                        </button>
                    </Panel>
                )}
            </div>

            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: colors.overlay }}>
                    <div className="w-full max-w-lg rounded-lg border p-6 shadow-2xl" style={{ borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }}>
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <h2 className="text-xl font-bold font-header" style={{ color: colors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{modalTitle}</h2>
                            <button type="button" onClick={() => setModal(null)} className="rounded-md p-2 hover:opacity-70"><X size={20} /></button>
                        </div>
                        <form onSubmit={submitLead} className="space-y-3">
                            <LeadInput label={t('realEstate.leads.name')} value={form.name} onChange={value => setForm(current => ({ ...current, name: value }))} required colors={colors} />
                            <LeadInput label={t('realEstate.leads.email')} type="email" value={form.email} onChange={value => setForm(current => ({ ...current, email: value }))} required colors={colors} />
                            {(modal === 'tour' || modal === 'financing') && <LeadInput label={t('realEstate.leads.phone')} value={form.phone} onChange={value => setForm(current => ({ ...current, phone: value }))} colors={colors} />}
                            {modal === 'tour' && <CalendarPicker label={t('realEstate.detail.preferredDate', 'Preferred date')} value={form.preferredDate} onChange={value => setForm(current => ({ ...current, preferredDate: value }))} colors={colors} />}
                            {modal === 'offer' && <LeadInput label={t('realEstate.detail.offerAmount', 'Offer amount')} value={form.offerAmount} onChange={value => setForm(current => ({ ...current, offerAmount: value }))} colors={colors} />}
                            <label className="block text-sm font-semibold font-body">
                                {t('realEstate.leads.message')}
                                <textarea value={form.message} onChange={event => setForm(current => ({ ...current, message: event.target.value }))} rows={4} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none font-body transition-colors focus:ring-1" style={{ borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.inputText, ['--tw-ring-color' as any]: colors.accent }} />
                            </label>
                            <button type="submit" disabled={leadStatus === 'saving'} className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold font-button" style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText, textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}>
                                {leadStatus === 'saving' ? <Clock size={16} /> : <Phone size={16} />}
                                {leadStatus === 'saving' ? t('common.saving', 'Saving...') : modalTitle}
                            </button>
                            {leadStatus === 'saved' && <p className="text-sm" style={{ color: colors.success }}>{t('realEstate.detail.leadSaved', 'Thanks. Your request was sent.')}</p>}
                            {leadStatus === 'error' && <p className="text-sm" style={{ color: colors.error }}>{t('realEstate.detail.leadError', 'We could not send the request. Please try again.')}</p>}
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

const Panel: React.FC<{ colors: any; title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ colors, title, icon, children, className = '' }) => (
    <section className={`rounded-lg border p-5 ${className}`} style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
        <div className="mb-4 flex items-center gap-2">
            <span style={{ color: colors.accent }}>{icon}</span>
            <h2 className="text-xl font-bold font-header" style={{ color: colors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{title}</h2>
        </div>
        {children}
    </section>
);

const NumberInput: React.FC<{ label: string; value: number; setValue: (value: number) => void; colors: any; min: number; max: number; step: number }> = ({ label, value, setValue, colors, min, max, step }) => (
    <label className="block text-sm font-semibold font-body">
        <span className="flex justify-between"><span>{label}</span><span style={{ color: colors.muted }}>{value}</span></span>
        <input type="range" min={min} max={max} step={step} value={value} onChange={event => setValue(Number(event.target.value))} className="mt-2 w-full accent-current" style={{ color: colors.accent }} />
    </label>
);

const Breakdown: React.FC<{ label: string; value: number; locale: string; colors: any }> = ({ label, value, locale, colors }) => (
    <div className="flex justify-between gap-4"><span style={{ color: colors.muted }}>{label}</span><span className="font-semibold font-header" style={{ color: colors.heading }}>{formatPrice(value, locale)}</span></div>
);

const InvestmentMetric: React.FC<{ label: string; value: string; colors: any }> = ({ label, value, colors }) => (
    <div className="flex items-center justify-between rounded-md border p-3" style={{ borderColor: colors.border }}>
        <span className="text-sm" style={{ color: colors.muted }}>{label}</span>
        <span className="font-bold font-header" style={{ color: colors.heading }}>{value}</span>
    </div>
);

const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; colors: any }> = ({ icon, label, onClick, colors }) => (
    <button type="button" onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-semibold font-button" style={{ borderColor: colors.border, color: colors.text, textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}>
        {icon}{label}
    </button>
);

const ResponsiveFrame: React.FC<{ title: string; src: string; colors: any }> = ({ title, src, colors }) => (
    <div className="aspect-video overflow-hidden rounded-lg border" style={{ borderColor: colors.border, backgroundColor: colors.surfaceAlt }}>
        <iframe title={title} src={src} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
    </div>
);

const LeadInput: React.FC<{ label: string; value: string; onChange: (value: string) => void; colors: any; type?: string; required?: boolean }> = ({ label, value, onChange, colors, type = 'text', required = false }) => (
    <label className="block text-sm font-semibold font-body">
        {label}
        <input type={type} value={value} onChange={event => onChange(event.target.value)} required={required} className="mt-1 h-11 w-full rounded-md border px-3 text-sm outline-none font-body transition-colors focus:ring-1" style={{ borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.inputText, ['--tw-ring-color' as any]: colors.accent }} />
    </label>
);

/* ── Custom Calendar Picker (replaces native date input) ── */
const DAYS_ES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const DAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const CalendarPicker: React.FC<{ label: string; value: string; onChange: (value: string) => void; colors: any }> = ({ label, value, onChange, colors }) => {
    const { i18n } = useTranslation();
    const isEs = i18n.language?.startsWith('es');
    const dayNames = isEs ? DAYS_ES : DAYS_EN;
    const monthNames = isEs ? MONTHS_ES : MONTHS_EN;
    const [open, setOpen] = useState(false);
    const today = new Date();
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const pad = (n: number) => String(n).padStart(2, '0');
    const selectedDateStr = value; // yyyy-mm-dd

    const selectDay = (day: number) => {
        const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
        onChange(iso);
        setOpen(false);
    };

    const goMonth = (delta: number) => {
        let m = viewMonth + delta;
        let y = viewYear;
        if (m < 0) { m = 11; y--; }
        if (m > 11) { m = 0; y++; }
        setViewMonth(m);
        setViewYear(y);
    };

    const displayValue = value
        ? (() => {
            const [y, m, d] = value.split('-').map(Number);
            return `${d} ${monthNames[m - 1]?.slice(0, 3)} ${y}`;
        })()
        : '';

    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    return (
        <div ref={containerRef} className="relative block text-sm font-semibold font-body">
            <span>{label}</span>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="mt-1 flex h-11 w-full items-center justify-between rounded-md border px-3 text-sm font-normal font-body transition-colors"
                style={{ borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: value ? colors.inputText : colors.muted }}
            >
                <span>{displayValue || (isEs ? 'Seleccionar fecha' : 'Select date')}</span>
                <CalendarDays size={16} style={{ color: colors.muted }} />
            </button>

            {open && (
                <div className="absolute left-0 z-50 mt-1 w-full min-w-[280px] rounded-lg border p-3 shadow-xl" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                    {/* Header */}
                    <div className="mb-2 flex items-center justify-between">
                        <button type="button" onClick={() => goMonth(-1)} className="rounded-md p-1 hover:opacity-70" style={{ color: colors.text }}><ChevronLeft size={18} /></button>
                        <span className="text-sm font-semibold font-header" style={{ color: colors.heading }}>{monthNames[viewMonth]} {viewYear}</span>
                        <button type="button" onClick={() => goMonth(1)} className="rounded-md p-1 hover:opacity-70" style={{ color: colors.text }}><ChevronRight size={18} /></button>
                    </div>
                    {/* Day names */}
                    <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-semibold" style={{ color: colors.muted }}>
                        {dayNames.map(d => <span key={d} className="py-1">{d}</span>)}
                    </div>
                    {/* Day cells */}
                    <div className="grid grid-cols-7 gap-0.5 text-center text-sm">
                        {cells.map((day, idx) => {
                            if (day === null) return <span key={`e-${idx}`} />;
                            const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
                            const isSelected = dateStr === selectedDateStr;
                            const isToday = dateStr === todayStr;
                            const isPast = new Date(viewYear, viewMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    disabled={isPast}
                                    onClick={() => selectDay(day)}
                                    className="rounded-md py-1.5 text-sm transition-colors"
                                    style={{
                                        backgroundColor: isSelected ? colors.accent : 'transparent',
                                        color: isSelected ? colors.buttonText : isPast ? colors.muted : colors.text,
                                        fontWeight: isToday || isSelected ? 700 : 400,
                                        opacity: isPast ? 0.4 : 1,
                                        cursor: isPast ? 'default' : 'pointer',
                                        border: isToday && !isSelected ? `1px solid ${colors.accent}` : '1px solid transparent',
                                    }}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyDetailSection;
