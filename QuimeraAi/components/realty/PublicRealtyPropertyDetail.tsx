import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bath, BedDouble, CalendarDays, Check, Home, Mail, MapPin, Phone, Ruler, Send, Star } from 'lucide-react';
import type { ThemeData } from '../../types';
import type { PropertyOpenHouse, RealtyListingsSectionData } from '../../types/realty';
import { supabase } from '../../supabase';
import { usePublicRealtyListings } from '../../hooks/usePublicRealtyListings';
import { colorWithAlpha, formatRealtyPrice, mapPropertyOpenHouseRow, REALTY_LEAD_SOURCE, resolveRealtyWebsiteColors } from '../../utils/realty';

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

    if (isLoading && !property) {
        return <div className="min-h-screen animate-pulse" style={{ backgroundColor: colors.background }} />;
    }

    if (!property) {
        return (
            <section className="min-h-screen px-6 py-20 text-center" style={{ backgroundColor: colors.background, color: colors.text }}>
                <Home className="mx-auto mb-4" size={42} style={{ color: colors.textMuted }} />
                <h1 className="font-header text-3xl font-bold" style={{ color: colors.heading }}>{t('realty.detail.notFound')}</h1>
                <button type="button" onClick={goListings} className="mt-6 rounded-md px-5 py-3 font-button text-sm font-semibold" style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}>
                    {t('realty.detail.backToListings')}
                </button>
            </section>
        );
    }

    const images = property.images || [];
    const activeImage = images[selectedImage]?.url || images[0]?.url;

    return (
        <section className="min-h-screen font-body" style={{ backgroundColor: colors.background, color: colors.text }}>
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
                <button type="button" onClick={goListings} className="mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: colors.border, color: colors.accent }}>
                    <ArrowLeft size={16} />
                    {t('realty.detail.backToListings')}
                </button>

                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="min-w-0">
                        <div className="overflow-hidden rounded-lg border" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}>
                            <div className="relative aspect-[16/10]" style={{ backgroundColor: colors.border }}>
                                {activeImage ? (
                                    <img src={activeImage} alt={property.title} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center" style={{ color: colors.textMuted }}><Home size={56} /></div>
                                )}
                                {property.isFeatured && (
                                    <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: colors.badgeBackground, color: colors.badgeText }}>
                                        <Star size={13} />
                                        {t('realty.website.featured')}
                                    </span>
                                )}
                            </div>
                            {images.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto p-3">
                                    {images.map((image, index) => (
                                        <button key={image.id || image.url} type="button" onClick={() => setSelectedImage(index)} className="h-16 w-24 shrink-0 overflow-hidden rounded-md border" style={{ borderColor: index === selectedImage ? colors.accent : colors.border }}>
                                            <img src={image.url} alt={image.altText || property.title} className="h-full w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-8">
                            <p className="font-header text-3xl font-bold md:text-4xl" style={{ color: colors.priceColor }}>{formatRealtyPrice(property.price, i18n.language, property.currency)}</p>
                            <h1 className="mt-3 font-header text-3xl font-bold md:text-5xl" style={{ color: colors.heading }}>{property.title}</h1>
                            <p className="mt-3 flex items-center gap-2 text-base" style={{ color: colors.textMuted }}><MapPin size={18} />{[property.address, property.city, property.state].filter(Boolean).join(', ')}</p>
                            <div className="mt-6 grid grid-cols-3 gap-3">
                                <div className="rounded-lg border p-4" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}><BedDouble size={18} style={{ color: colors.accent }} /><p className="mt-2 font-header text-2xl font-bold">{property.bedrooms}</p><p className="text-xs" style={{ color: colors.textMuted }}>{t('realty.units.beds')}</p></div>
                                <div className="rounded-lg border p-4" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}><Bath size={18} style={{ color: colors.accent }} /><p className="mt-2 font-header text-2xl font-bold">{property.bathrooms}</p><p className="text-xs" style={{ color: colors.textMuted }}>{t('realty.units.baths')}</p></div>
                                <div className="rounded-lg border p-4" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}><Ruler size={18} style={{ color: colors.accent }} /><p className="mt-2 font-header text-2xl font-bold">{property.area.toLocaleString()}</p><p className="text-xs" style={{ color: colors.textMuted }}>{t('realty.units.area')}</p></div>
                            </div>
                            <div className="mt-8 rounded-lg border p-6" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}>
                                <h2 className="font-header text-2xl font-bold" style={{ color: colors.cardHeading }}>{t('realty.detail.description')}</h2>
                                <p className="mt-4 whitespace-pre-wrap leading-7" style={{ color: colors.cardText }}>{property.description}</p>
                                {property.amenities.length > 0 && (
                                    <div className="mt-6 flex flex-wrap gap-2">
                                        {property.amenities.map(item => <span key={item} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: colorWithAlpha(colors.accent, 0.12), color: colors.accent }}><Check size={13} />{item}</span>)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <aside className="lg:sticky lg:top-6 lg:self-start">
                        <form onSubmit={submitLead} className="rounded-lg border p-5" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}>
                            <h2 className="font-header text-xl font-bold" style={{ color: colors.cardHeading }}>{t('realty.detail.contactTitle')}</h2>
                            <p className="mt-2 text-sm" style={{ color: colors.textMuted }}>{t('realty.detail.contactSubtitle')}</p>
                            <div className="mt-5 space-y-3">
                                <input required value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} placeholder={t('realty.leads.name')} className="h-11 w-full rounded-md border px-3 text-sm" style={{ borderColor: colors.border, backgroundColor: colors.background, color: colors.text }} />
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: colors.textMuted }} />
                                    <input required type="email" value={form.email} onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))} placeholder={t('realty.leads.email')} className="h-11 w-full rounded-md border px-3 pl-9 text-sm" style={{ borderColor: colors.border, backgroundColor: colors.background, color: colors.text }} />
                                </div>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: colors.textMuted }} />
                                    <input value={form.phone} onChange={event => setForm(prev => ({ ...prev, phone: event.target.value }))} placeholder={t('realty.leads.phone')} className="h-11 w-full rounded-md border px-3 pl-9 text-sm" style={{ borderColor: colors.border, backgroundColor: colors.background, color: colors.text }} />
                                </div>
                                <textarea value={form.message} onChange={event => setForm(prev => ({ ...prev, message: event.target.value }))} placeholder={t('realty.detail.messagePlaceholder')} rows={4} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: colors.border, backgroundColor: colors.background, color: colors.text }} />
                                <button type="submit" disabled={status === 'saving'} className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 font-button text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}>
                                    <Send size={16} />
                                    {status === 'saving' ? t('realty.detail.sending') : t('realty.detail.sendLead')}
                                </button>
                                {status === 'saved' && <p className="text-sm" style={{ color: colors.success }}>{t('realty.detail.sent')}</p>}
                                {status === 'error' && <p className="text-sm" style={{ color: colors.error }}>{t('realty.detail.sendError')}</p>}
                            </div>
                        </form>

                        {openHouses.length > 0 && (
                            <div className="mt-5 rounded-lg border p-5" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}>
                                <div className="flex items-start gap-3">
                                    <CalendarDays size={20} style={{ color: colors.accent }} />
                                    <div>
                                        <h2 className="font-header text-xl font-bold" style={{ color: colors.cardHeading }}>{t('realty.detail.openHouseTitle')}</h2>
                                        <p className="mt-1 text-sm" style={{ color: colors.textMuted }}>{t('realty.detail.openHouseSubtitle')}</p>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-2">
                                    {openHouses.map(openHouse => {
                                        const startsAt = new Date(openHouse.startsAt);
                                        const dateLabel = Number.isFinite(startsAt.getTime())
                                            ? startsAt.toLocaleString(i18n.language?.startsWith('en') ? 'en-US' : 'es-US', { dateStyle: 'medium', timeStyle: 'short' })
                                            : openHouse.startsAt;
                                        const active = selectedOpenHouse?.id === openHouse.id;
                                        return (
                                            <button
                                                key={openHouse.id}
                                                type="button"
                                                onClick={() => setSelectedOpenHouseId(openHouse.id)}
                                                className="w-full rounded-md border px-3 py-3 text-left text-sm transition-transform hover:-translate-y-0.5"
                                                style={{
                                                    borderColor: active ? colors.accent : colors.border,
                                                    backgroundColor: active ? colorWithAlpha(colors.accent, 0.1) : colors.background,
                                                    color: colors.text,
                                                }}
                                            >
                                                <span className="block font-semibold" style={{ color: colors.cardHeading }}>{openHouse.title || t('realty.detail.openHouseTitle')}</span>
                                                <span className="mt-1 block text-xs" style={{ color: colors.textMuted }}>{dateLabel}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <form onSubmit={submitOpenHouseRegistration} className="mt-5 space-y-3">
                                    <input required value={openHouseForm.name} onChange={event => setOpenHouseForm(prev => ({ ...prev, name: event.target.value }))} placeholder={t('realty.leads.name')} className="h-11 w-full rounded-md border px-3 text-sm" style={{ borderColor: colors.border, backgroundColor: colors.background, color: colors.text }} />
                                    <input required type="email" value={openHouseForm.email} onChange={event => setOpenHouseForm(prev => ({ ...prev, email: event.target.value }))} placeholder={t('realty.leads.email')} className="h-11 w-full rounded-md border px-3 text-sm" style={{ borderColor: colors.border, backgroundColor: colors.background, color: colors.text }} />
                                    <input value={openHouseForm.phone} onChange={event => setOpenHouseForm(prev => ({ ...prev, phone: event.target.value }))} placeholder={t('realty.leads.phone')} className="h-11 w-full rounded-md border px-3 text-sm" style={{ borderColor: colors.border, backgroundColor: colors.background, color: colors.text }} />
                                    <textarea value={openHouseForm.message} onChange={event => setOpenHouseForm(prev => ({ ...prev, message: event.target.value }))} placeholder={t('realty.detail.openHouseMessagePlaceholder')} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: colors.border, backgroundColor: colors.background, color: colors.text }} />
                                    <button type="submit" disabled={openHouseStatus === 'saving'} className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 font-button text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}>
                                        <Send size={16} />
                                        {openHouseStatus === 'saving' ? t('realty.detail.sending') : t('realty.detail.registerOpenHouse')}
                                    </button>
                                    {openHouseStatus === 'saved' && <p className="text-sm" style={{ color: colors.success }}>{t('realty.detail.openHouseRegistered')}</p>}
                                    {openHouseStatus === 'error' && <p className="text-sm" style={{ color: colors.error }}>{t('realty.detail.openHouseRegisterError')}</p>}
                                </form>
                            </div>
                        )}
                    </aside>
                </div>

                {related.length > 0 && (
                    <div className="mt-12">
                        <h2 className="font-header text-2xl font-bold" style={{ color: colors.heading }}>{t('realty.detail.related')}</h2>
                        <div className="mt-5 grid gap-5 md:grid-cols-3">
                            {related.map(item => (
                                <button key={item.id} type="button" onClick={() => goProperty(item.slug)} className="overflow-hidden rounded-lg border text-left transition-transform hover:-translate-y-1" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}>
                                    <div className="aspect-[4/3]" style={{ backgroundColor: colors.border }}>
                                        {item.images?.[0]?.url ? <img src={item.images[0].url} alt={item.title} className="h-full w-full object-cover" /> : null}
                                    </div>
                                    <div className="p-4">
                                        <p className="font-header text-lg font-bold" style={{ color: colors.priceColor }}>{formatRealtyPrice(item.price, i18n.language, item.currency)}</p>
                                        <p className="mt-1 font-semibold" style={{ color: colors.cardHeading }}>{item.title}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default PublicRealtyPropertyDetail;
