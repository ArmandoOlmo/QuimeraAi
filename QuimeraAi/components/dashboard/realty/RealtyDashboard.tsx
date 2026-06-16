import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BarChart3,
    Building2,
    Check,
    Eye,
    Home,
    Loader2,
    Mail,
    Menu,
    MessageSquare,
    Plus,
    Save,
    Settings,
    Sparkles,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import HeaderBackButton from '../../ui/HeaderBackButton';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import ImagePicker from '../../ui/ImagePicker';
import DashboardSelect from '../../ui/DashboardSelect';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useUI } from '../../../contexts/core/UIContext';
import { useCRM } from '../../../contexts/crm/CRMContext';
import { useProject } from '../../../contexts/project';
import { useSafeTenant } from '../../../contexts/tenant';
import { useRealtyAccess } from '../../../hooks/realty/useRealtyAccess';
import { useRealtySuite } from '../../../hooks/realty/useRealtySuite';
import type { LeadStatus } from '../../../types/business';
import type { RealtyLead, RealtyProperty, RealtyPropertyStatus, RealtyPropertyType } from '../../../types/realty';
import { formatRealtyPrice, isRealtyCrmLead, mapCrmLeadToRealtyLead, realtyLeadStatuses, realtyPropertyStatuses, realtyPropertyTypes, toRealtySlug } from '../../../utils/realty';
import { createDemoRealtyLeads, createDemoRealtyListings, isDemoRealtyLead, isDemoRealtyProperty, mergeRealtyPropertiesWithPendingDemos } from '../../realty/realtyDemo';

type RealtyTab = 'overview' | 'properties' | 'leads' | 'ai' | 'settings';

const emptyProperty = (projectId: string, tenantId?: string | null, userId?: string | null): Partial<RealtyProperty> => ({
    projectId,
    tenantId,
    createdBy: userId,
    title: '',
    slug: '',
    description: '',
    price: 0,
    currency: 'USD',
    address: '',
    city: '',
    state: '',
    country: 'US',
    zipCode: '',
    propertyType: 'house',
    status: 'draft',
    bedrooms: 3,
    bathrooms: 2,
    area: 1500,
    areaUnit: 'sqft',
    amenities: [],
    images: [],
    isFeatured: false,
});

const parseLines = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean);
const getDateMs = (value: unknown) => {
    if (value && typeof value === 'object' && 'seconds' in value && typeof (value as { seconds?: unknown }).seconds === 'number') {
        return (value as { seconds: number }).seconds * 1000;
    }
    return new Date(String(value || 0)).getTime();
};
const cleanImageUrls = (urls: string[]) => urls.map(url => url.trim()).filter(Boolean);

const StatCard = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) => (
    <div className="min-w-0 rounded-xl border border-q-border bg-q-surface p-5 transition-colors hover:border-q-accent/40 md:p-6">
        <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-q-text-secondary">{label}</p>
            <Icon size={18} className="text-q-accent" />
        </div>
        <p className="mt-3 text-3xl font-bold text-q-text">{value}</p>
    </div>
);

const RealtyDashboard: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { setView } = useUI();
    const { activeProjectId, activeProject } = useProject();
    const tenantContext = useSafeTenant();
    const currentTenantId = tenantContext?.currentTenant?.id || user?.id || null;
    const access = useRealtyAccess();
    const crm = useCRM();
    const suite = useRealtySuite({
        projectId: activeProjectId,
        tenantId: currentTenantId,
        userId: user?.id || null,
    });

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<RealtyTab>('overview');
    const [editingProperty, setEditingProperty] = useState<Partial<RealtyProperty> | null>(null);
    const [amenitiesInput, setAmenitiesInput] = useState('');
    const [propertyImageUrls, setPropertyImageUrls] = useState<string[]>([]);
    const [aiPropertyId, setAiPropertyId] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiOutput, setAiOutput] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const tabs = useMemo(() => [
        { id: 'overview' as const, label: t('realty.tabs.overview'), icon: BarChart3, visible: access.canView },
        { id: 'properties' as const, label: t('realty.tabs.properties'), icon: Building2, visible: access.canManageProperties },
        { id: 'leads' as const, label: t('realty.tabs.leads'), icon: Users, visible: access.canManageLeads },
        { id: 'ai' as const, label: t('realty.tabs.ai'), icon: Sparkles, visible: access.canUseAi },
        { id: 'settings' as const, label: t('realty.tabs.settings'), icon: Settings, visible: access.canManageSettings },
    ].filter(item => item.visible), [access.canManageLeads, access.canManageProperties, access.canManageSettings, access.canUseAi, access.canView, t]);

    const demoProperties = useMemo(() => {
        if (!activeProjectId) return [];
        return createDemoRealtyListings(t).map(property => ({
            ...property,
            projectId: activeProjectId,
            tenantId: currentTenantId,
            createdBy: user?.id || null,
        }));
    }, [activeProjectId, currentTenantId, t, user?.id]);
    const displayProperties = useMemo(
        () => mergeRealtyPropertiesWithPendingDemos(suite.properties, demoProperties),
        [demoProperties, suite.properties]
    );
    const demoLeads = useMemo(() => {
        if (!activeProjectId) return [];
        return createDemoRealtyLeads(
            t,
            displayProperties,
            activeProjectId,
            currentTenantId
        );
    }, [activeProjectId, currentTenantId, displayProperties, t]);
    const crmRealtyLeads = useMemo(
        () => crm.leads.filter(isRealtyCrmLead).map(mapCrmLeadToRealtyLead),
        [crm.leads]
    );
    const displayLeads = useMemo(
        () => [...crmRealtyLeads, ...demoLeads].sort((a, b) => getDateMs(b.createdAt) - getDateMs(a.createdAt)),
        [crmRealtyLeads, demoLeads]
    );
    const displayNewLeads = displayLeads.filter(lead => lead.status === 'new');
    const propertyTitleById = useMemo(
        () => new Map(displayProperties.map(property => [property.id, property.title])),
        [displayProperties]
    );
    const displayActiveProperties = displayProperties.filter(property => property.status === 'active');
    const displayFeaturedProperties = displayProperties.filter(property => property.isFeatured);
    const selectedAiProperty = displayProperties.find(property => property.id === aiPropertyId) || displayProperties[0];

    const getLeadPropertyTitle = (lead: RealtyLead) => {
        const metadataTitle = typeof lead.metadata?.propertyTitle === 'string' ? lead.metadata.propertyTitle : '';
        return metadataTitle || (lead.propertyId ? propertyTitleById.get(lead.propertyId) : '') || '';
    };

    const startCreate = () => {
        if (!activeProjectId) return;
        const draft = emptyProperty(activeProjectId, currentTenantId, user?.id || null);
        setEditingProperty(draft);
        setAmenitiesInput('');
        setPropertyImageUrls([]);
    };

    const startEdit = (property: RealtyProperty) => {
        if (isDemoRealtyProperty(property)) {
            const { id, createdAt, updatedAt, ...demoDraft } = property;
            setEditingProperty({
                ...demoDraft,
                projectId: activeProjectId || property.projectId,
                tenantId: currentTenantId,
                createdBy: user?.id || property.createdBy,
                metadata: {
                    ...demoDraft.metadata,
                    demoId: id,
                    demoSlug: property.slug,
                },
            });
        } else {
            setEditingProperty(property);
        }
        setAmenitiesInput((property.amenities || []).join('\n'));
        setPropertyImageUrls((property.images || []).map(image => image.url).filter(Boolean));
    };

    const updatePropertyImage = (index: number, url: string) => {
        setPropertyImageUrls(prev => {
            const next = [...prev];
            next[index] = url;
            return next;
        });
    };

    const removePropertyImage = (index: number) => {
        setPropertyImageUrls(prev => prev.filter((_, itemIndex) => itemIndex !== index));
    };

    const addPropertyImageSlot = () => {
        setPropertyImageUrls(prev => prev.length === 0 ? ['', ''] : [...prev, '']);
    };

    const saveProperty = async () => {
        if (!editingProperty || !activeProjectId) return;
        setLocalError(null);
        try {
            await suite.saveProperty({
                ...editingProperty,
                projectId: activeProjectId,
                tenantId: currentTenantId,
                createdBy: user?.id || editingProperty.createdBy,
                slug: editingProperty.slug || toRealtySlug(editingProperty.title || ''),
                amenities: parseLines(amenitiesInput),
                images: cleanImageUrls(propertyImageUrls).map((url, index) => ({ id: `image-${index}`, url, position: index, altText: editingProperty.title || '' })),
            });
            setEditingProperty(null);
            setPropertyImageUrls([]);
        } catch (err: any) {
            setLocalError(err.message || t('realty.errors.saveProperty'));
        }
    };

    const generateAiCopy = async () => {
        if (!selectedAiProperty || !activeProjectId) return;
        const prompt = aiPrompt || t('realty.ai.defaultPrompt');
        const output = t('realty.ai.generatedListing', {
            title: selectedAiProperty.title,
            city: selectedAiProperty.city,
            price: formatRealtyPrice(selectedAiProperty.price, i18n.language, selectedAiProperty.currency),
            beds: selectedAiProperty.bedrooms,
            baths: selectedAiProperty.bathrooms,
            area: selectedAiProperty.area.toLocaleString(),
            description: selectedAiProperty.description,
            prompt,
        });
        setAiOutput(output);
        try {
            await suite.saveAiGeneration({
                tenantId: currentTenantId,
                projectId: activeProjectId,
                propertyId: selectedAiProperty.id,
                userId: user?.id || null,
                kind: 'listing_description',
                prompt,
                output,
                metadata: { source: 'realty-dashboard' },
            });
        } catch (err) {
            console.warn('[RealtyDashboard] Could not persist AI output', err);
        }
    };

    const renderPropertyForm = () => {
        if (!editingProperty) return null;
        const update = (patch: Partial<RealtyProperty>) => setEditingProperty(prev => ({ ...prev, ...patch }));
        const imageSlots = propertyImageUrls.length > 0 ? propertyImageUrls : [''];

        return (
            <div className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-q-text">{editingProperty.id ? t('realty.properties.edit') : t('realty.properties.create')}</h3>
                    <button type="button" onClick={() => setEditingProperty(null)} className="rounded-lg p-2 text-q-text-secondary hover:bg-q-surface-overlay hover:text-q-text"><X size={18} /></button>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                    <Field label={t('realty.form.title')}><Input value={editingProperty.title || ''} onChange={event => update({ title: event.target.value, slug: toRealtySlug(event.target.value) })} /></Field>
                    <Field label={t('realty.form.price')}><Input type="number" value={editingProperty.price || 0} onChange={event => update({ price: Number(event.target.value) })} /></Field>
                    <Field label={t('realty.form.address')}><Input value={editingProperty.address || ''} onChange={event => update({ address: event.target.value })} /></Field>
                    <Field label={t('realty.form.city')}><Input value={editingProperty.city || ''} onChange={event => update({ city: event.target.value })} /></Field>
                    <Field label={t('realty.form.type')}>
                        <DashboardSelect
                            value={editingProperty.propertyType || 'house'}
                            onChange={value => update({ propertyType: value as RealtyPropertyType })}
                            options={realtyPropertyTypes.map(type => ({ value: type, label: t(`realty.propertyTypes.${type}`) }))}
                        />
                    </Field>
                    <Field label={t('realty.form.status')}>
                        <DashboardSelect
                            value={editingProperty.status || 'draft'}
                            onChange={value => update({ status: value as RealtyPropertyStatus })}
                            options={realtyPropertyStatuses.map(status => ({ value: status, label: t(`realty.status.${status}`) }))}
                        />
                    </Field>
                    <Field label={t('realty.form.bedrooms')}><Input type="number" value={editingProperty.bedrooms || 0} onChange={event => update({ bedrooms: Number(event.target.value) })} /></Field>
                    <Field label={t('realty.form.bathrooms')}><Input type="number" value={editingProperty.bathrooms || 0} onChange={event => update({ bathrooms: Number(event.target.value) })} /></Field>
                    <Field label={t('realty.form.area')}><Input type="number" value={editingProperty.area || 0} onChange={event => update({ area: Number(event.target.value) })} /></Field>
                    <label className="flex items-center gap-2 pt-6 text-sm font-medium text-q-text">
                        <input type="checkbox" checked={Boolean(editingProperty.isFeatured)} onChange={event => update({ isFeatured: event.target.checked })} />
                        {t('realty.form.featured')}
                    </label>
                    <Field className="md:col-span-2" label={t('realty.form.description')}>
                        <textarea rows={4} className="w-full rounded-md border border-q-border bg-transparent px-3 py-2.5 text-sm text-q-text outline-none focus:border-q-accent" value={editingProperty.description || ''} onChange={event => update({ description: event.target.value })} />
                    </Field>
                    <Field className="md:col-span-2" label={t('realty.form.amenities')}>
                        <textarea rows={3} className="w-full rounded-md border border-q-border bg-transparent px-3 py-2.5 text-sm text-q-text outline-none focus:border-q-accent" value={amenitiesInput} onChange={event => setAmenitiesInput(event.target.value)} />
                    </Field>
                    <div className="space-y-4 md:col-span-2">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('realty.form.images')}</span>
                            <Button type="button" size="sm" variant="secondary" onClick={addPropertyImageSlot}><Plus size={15} />{t('realty.actions.addImage')}</Button>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                            {imageSlots.map((imageUrl, index) => (
                                <ImagePicker
                                    key={`${index}-${imageUrl || 'empty'}`}
                                    label={t('realty.form.imageSlot', { index: index + 1 })}
                                    value={imageUrl}
                                    onChange={(url) => updatePropertyImage(index, url)}
                                    onRemove={() => removePropertyImage(index)}
                                    destination="user"
                                    hideUrlInput
                                    generationContext="general"
                                    contentId={editingProperty.id}
                                    contentType="realty-property"
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => setEditingProperty(null)}>{t('common.cancel')}</Button>
                    <Button type="button" onClick={saveProperty} disabled={suite.isSaving}><Save size={16} />{t('realty.form.save')}</Button>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (!activeProjectId) {
            return <EmptyPanel icon={Home} title={t('realty.empty.noProject')} description={t('realty.empty.noProjectDesc')} />;
        }
        if (!access.canView) {
            return <EmptyPanel icon={Home} title={t('realty.empty.noAccess')} description={t('realty.empty.noAccessDesc')} />;
        }
        if (suite.isLoading || access.isLoading || crm.isLoadingLeads) {
            return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-q-accent" /></div>;
        }

        if (activeTab === 'properties') {
            return (
                <div className="space-y-5">
                    {renderPropertyForm()}
                    <div className="flex justify-end"><Button type="button" onClick={startCreate}><Plus size={16} />{t('realty.properties.create')}</Button></div>
                    <div className="grid gap-5">
                        {displayProperties.map(property => {
                            const isDemo = isDemoRealtyProperty(property);
                            return (
                            <div key={property.id} className="rounded-xl border border-q-border bg-q-surface p-4 transition-colors hover:border-q-accent/40 md:p-5">
                                <div className="grid gap-4 md:grid-cols-[96px_minmax(0,1fr)_auto] md:items-center">
                                    <div className="h-20 overflow-hidden rounded-lg bg-q-surface-overlay">
                                        {property.images?.[0]?.url ? <img src={property.images[0].url} alt={property.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-q-text-muted"><Home size={24} /></div>}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="truncate font-bold text-q-accent">{property.title}</h3>
                                            <span className="rounded-full bg-q-surface-overlay px-2 py-0.5 text-xs text-q-text-secondary">{t(`realty.status.${property.status}`)}</span>
                                            {isDemo && <span className="rounded-full bg-q-surface-overlay px-2 py-0.5 text-xs text-q-text-secondary">{t('realty.website.demo')}</span>}
                                            {property.isFeatured && <span className="rounded-full bg-q-accent/15 px-2 py-0.5 text-xs text-q-accent">{t('realty.website.featured')}</span>}
                                        </div>
                                        <p className="mt-1 text-sm text-q-text-secondary">{formatRealtyPrice(property.price, i18n.language, property.currency)} · {[property.address, property.city].filter(Boolean).join(', ')}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 md:justify-end">
                                        <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(property)}>{isDemo ? t('realty.actions.useDemo') : t('common.edit')}</Button>
                                        {!isDemo && <Button type="button" size="sm" variant="secondary" onClick={() => suite.updatePropertyStatus(property.id, property.status === 'active' ? 'draft' : 'active')}>{property.status === 'active' ? t('realty.actions.unpublish') : t('realty.actions.publish')}</Button>}
                                        {!isDemo && <Button type="button" size="icon-sm" variant="ghost" onClick={() => suite.deleteProperty(property.id)}><Trash2 size={15} /></Button>}
                                    </div>
                                </div>
                            </div>
                        );
                        })}
                    </div>
                </div>
            );
        }

        if (activeTab === 'leads') {
            return (
                <div className="rounded-xl border border-q-border bg-q-surface">
                    {displayLeads.length === 0 ? <EmptyPanel icon={Users} title={t('realty.empty.noLeads')} description={t('realty.empty.noLeadsDesc')} /> : displayLeads.map(lead => {
                        const isDemo = isDemoRealtyLead(lead);
                        const propertyTitle = getLeadPropertyTitle(lead);
                        return (
                            <div key={lead.id} className="grid gap-4 border-b border-q-border p-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_13rem] md:items-start md:p-5">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-bold text-q-accent">{lead.name}</p>
                                        {isDemo && <span className="rounded-full bg-q-surface-overlay px-2 py-0.5 text-xs text-q-text-secondary">{t('realty.website.demo')}</span>}
                                    </div>
                                    <p className="mt-1 text-sm text-q-text-secondary">{lead.email} {lead.phone ? `· ${lead.phone}` : ''}</p>
                                    {propertyTitle && <p className="mt-1 text-xs text-q-text-secondary">{t('realty.leads.property')}: <span className="font-medium text-q-accent">{propertyTitle}</span></p>}
                                    {lead.message && <p className="mt-2 text-sm text-q-text">{lead.message}</p>}
                                </div>
                                <DashboardSelect
                                    className="w-full md:w-52"
                                    value={lead.status}
                                    disabled={isDemo}
                                    onChange={value => crm.updateLeadStatus(lead.id, value as LeadStatus)}
                                    options={realtyLeadStatuses.map(status => ({ value: status, label: t(`realty.leadStatus.${status}`) }))}
                                />
                            </div>
                        );
                    })}
                </div>
            );
        }

        if (activeTab === 'ai') {
            return (
                <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                    <div className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                        <h3 className="font-bold text-q-text">{t('realty.ai.title')}</h3>
                        <div className="mt-5 space-y-5">
                            <Field label={t('realty.selectProperty')}>
                                <DashboardSelect
                                    value={aiPropertyId || selectedAiProperty?.id || ''}
                                    onChange={setAiPropertyId}
                                    options={displayProperties.map(property => ({ value: property.id, label: property.title }))}
                                    placeholder={t('realty.selectProperty')}
                                />
                            </Field>
                            <Field label={t('realty.ai.prompt')}>
                                <textarea rows={5} className="w-full rounded-md border border-q-border bg-transparent px-3 py-2.5 text-sm text-q-text outline-none focus:border-q-accent" value={aiPrompt} onChange={event => setAiPrompt(event.target.value)} placeholder={t('realty.ai.defaultPrompt')} />
                            </Field>
                            <Button type="button" onClick={generateAiCopy} disabled={!selectedAiProperty}><Sparkles size={16} />{t('realty.ai.generate')}</Button>
                        </div>
                    </div>
                    <div className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                        <h3 className="font-bold text-q-text">{t('realty.ai.output')}</h3>
                        <div className="mt-5 min-h-64 whitespace-pre-wrap rounded-lg border border-q-border bg-q-bg p-4 text-sm leading-6 text-q-text">
                            {aiOutput || suite.aiGenerations[0]?.output || t('realty.ai.empty')}
                        </div>
                    </div>
                </div>
            );
        }

        if (activeTab === 'settings') {
            return (
                <div className="max-w-2xl rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                    <h3 className="font-bold text-q-text">{t('realty.settings.title')}</h3>
                    <div className="mt-6 space-y-4">
                        <ToggleRow disabled={suite.isSaving} label={t('realty.settings.moduleEnabled')} checked={suite.flags.real_estate_enabled} onChange={value => suite.upsertProjectModule({ real_estate_enabled: value }, value)} />
                        <ToggleRow disabled={suite.isSaving} label={t('realty.settings.aiEnabled')} checked={suite.flags.real_estate_ai_enabled} onChange={value => suite.upsertProjectModule({ real_estate_ai_enabled: value })} />
                        <ToggleRow disabled={suite.isSaving} label={t('realty.settings.publicDirectoryEnabled')} checked={suite.flags.real_estate_public_directory_enabled} onChange={value => suite.upsertProjectModule({ real_estate_public_directory_enabled: value })} />
                    </div>
                    <div className="mt-6 rounded-lg border border-q-border bg-q-bg p-4 text-sm text-q-text-secondary">
                        <p className="font-medium text-q-text">{t('realty.settings.publicPath')}</p>
                        <p className="mt-1">/listados</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-q-text">{t('realty.title')}</h1>
                    <p className="mt-1 text-sm text-q-text-secondary">{activeProject?.name || t('realty.selectProject')}</p>
                </div>
                <div className="grid gap-5 md:grid-cols-4">
                    <StatCard icon={Building2} label={t('realty.metrics.properties')} value={displayProperties.length} />
                    <StatCard icon={Eye} label={t('realty.metrics.active')} value={displayActiveProperties.length} />
                    <StatCard icon={Users} label={t('realty.metrics.leads')} value={displayNewLeads.length} />
                    <StatCard icon={Mail} label={t('realty.metrics.featured')} value={displayFeaturedProperties.length} />
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                    <div className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                        <h2 className="font-bold text-q-text">{t('realty.overview.recentProperties')}</h2>
                        <div className="mt-5 space-y-3">
                            {displayProperties.slice(0, 4).map(property => <button key={property.id} type="button" onClick={() => { setActiveTab('properties'); startEdit(property); }} className="flex w-full min-w-0 items-center justify-between gap-4 rounded-lg border border-q-border p-4 text-left hover:border-q-accent/40"><span className="min-w-0 truncate text-sm font-medium text-q-accent">{property.title}</span><span className="shrink-0 text-xs text-q-text-secondary">{formatRealtyPrice(property.price, i18n.language, property.currency)}</span></button>)}
                        </div>
                    </div>
                    <div className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                        <h2 className="font-bold text-q-text">{t('realty.overview.recentLeads')}</h2>
                        <div className="mt-5 space-y-3">
                            {displayLeads.slice(0, 4).map(lead => <div key={lead.id} className="rounded-lg border border-q-border p-4"><div className="flex min-w-0 flex-wrap items-center gap-2"><p className="min-w-0 truncate text-sm font-medium text-q-accent">{lead.name}</p>{isDemoRealtyLead(lead) && <span className="shrink-0 rounded-full bg-q-surface-overlay px-2 py-0.5 text-xs text-q-text-secondary">{t('realty.website.demo')}</span>}</div><p className="mt-1 truncate text-xs text-q-text-secondary">{lead.email}</p></div>)}
                            {displayLeads.length === 0 && <p className="text-sm text-q-text-secondary">{t('realty.empty.noLeadsDesc')}</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen overflow-hidden bg-q-bg text-q-text">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="hidden w-56 flex-col border-r border-q-border bg-q-surface/50 md:flex lg:w-64">
                <div className="flex h-14 items-center gap-2 border-b border-q-border px-4">
                    <Home size={20} className="text-q-accent" />
                    <h2 className="truncate text-sm font-bold text-q-text">{t('realty.title')}</h2>
                </div>
                <nav className="flex-1 overflow-y-auto p-2">
                    {tabs.map(item => {
                        const Icon = item.icon;
                        const active = activeTab === item.id;
                        return (
                            <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-q-accent/15 text-q-accent' : 'text-q-text-secondary hover:bg-q-surface-overlay hover:text-q-text'}`}>
                                <Icon size={17} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <main className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-14 items-center justify-between border-b border-q-border bg-q-surface/80 px-4 backdrop-blur">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setIsMobileMenuOpen(true)} className="rounded-lg p-2 text-q-text-secondary hover:bg-q-surface-overlay md:hidden"><Menu size={20} /></button>
                        <HeaderBackButton onClick={() => setView('dashboard')} />
                        <div>
                            <p className="text-sm font-bold text-q-text">{t('realty.title')}</p>
                            <p className="hidden text-xs text-q-text-secondary sm:block">{activeProject?.name || t('realty.selectProject')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-q-border px-3 py-1 text-xs text-q-text-secondary">
                        <Check size={13} className={access.canView ? 'text-q-success' : 'text-q-text-muted'} />
                        {access.canView ? t('realty.access.enabled') : t('realty.access.disabled')}
                    </div>
                </header>

                <div className="border-b border-q-border bg-q-surface/60 px-4 py-2 md:hidden">
                    <div className="flex gap-2 overflow-x-auto">
                        {tabs.map(item => <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${activeTab === item.id ? 'bg-q-accent text-q-bg' : 'bg-q-surface-overlay text-q-text-secondary'}`}>{item.label}</button>)}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
                    {(suite.error || localError) && (
                        <div className="mb-4 rounded-lg border border-q-error/30 bg-q-error/10 p-3 text-sm text-q-error">{localError || suite.error}</div>
                    )}
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

const Field = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
    <label className={`block space-y-2 ${className}`}>
        <span className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{label}</span>
        {children}
    </label>
);

const ToggleRow = ({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (value: boolean) => void | Promise<void>; disabled?: boolean }) => (
    <div className="flex items-center justify-between rounded-lg border border-q-border bg-q-bg p-4">
        <span className="min-w-0 pr-4 text-sm font-medium text-q-text">{label}</span>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-disabled={disabled}
            data-state={checked ? 'checked' : 'unchecked'}
            disabled={disabled}
            onClick={(event) => {
                event.stopPropagation();
                if (disabled) return;
                void Promise.resolve(onChange(!checked)).catch(() => undefined);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            draggable={false}
            className={`${checked ? 'bg-q-accent' : 'bg-q-surface-overlay/80'} ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} quimera-editor-switch relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-q-accent/40 focus:ring-offset-2 focus:ring-offset-q-bg`}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'quimera-editor-switch-knob-on translate-x-5' : 'quimera-editor-switch-knob-off translate-x-0'} quimera-editor-switch-knob pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);

const EmptyPanel = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) => (
    <div className="rounded-xl border border-q-border bg-q-surface p-8 text-center">
        <Icon className="mx-auto mb-4 text-q-accent" size={36} />
        <h2 className="text-lg font-bold text-q-text">{title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-q-text-secondary">{description}</p>
    </div>
);

export default RealtyDashboard;
