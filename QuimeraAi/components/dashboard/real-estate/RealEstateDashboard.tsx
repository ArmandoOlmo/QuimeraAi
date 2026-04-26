import React, { useMemo, useState } from 'react';
import {
    BarChart3,
    Bot,
    Calendar,
    CheckCircle2,
    Edit,
    Eye,
    Home,
    Loader2,
    MapPin,
    Menu,
    MessageSquare,
    Plus,
    Send,
    Sparkles,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardSidebar from '../DashboardSidebar';
import DashboardWaveRibbons from '../DashboardWaveRibbons';
import Modal from '../../ui/Modal';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import DashboardSelect from '../../ui/DashboardSelect';
import ImagePicker from '../../ui/ImagePicker';
import HeaderBackButton from '../../ui/HeaderBackButton';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useUI } from '../../../contexts/core/UIContext';
import { useProject } from '../../../contexts/project';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import { Property, PropertyImage, PropertyStatus, PropertyType } from '../../../types/realEstate';
import { useRealEstate } from './hooks/useRealEstate';

type Tab = 'overview' | 'properties' | 'preview' | 'assistant';

const emptyProperty = {
    title: '',
    description: '',
    price: 0,
    address: '',
    city: '',
    propertyType: 'house' as PropertyType,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1500,
    amenities: [] as string[],
    images: [] as PropertyImage[],
    videoUrl: '',
    virtualTourUrl: '',
    status: 'draft' as PropertyStatus,
    isFeatured: false,
};

const money = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);

const statusClass = (status: PropertyStatus) => {
    const classes: Record<PropertyStatus, string> = {
        draft: 'bg-muted text-muted-foreground',
        active: 'bg-green-500/15 text-green-400',
        pending: 'bg-amber-500/15 text-amber-400',
        sold: 'bg-primary/15 text-primary',
        archived: 'bg-secondary text-muted-foreground',
    };
    return classes[status];
};

const demoImage = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;

const getDemoProperties = (t: (key: string) => string): Array<Omit<Property, 'id' | 'projectId' | 'slug' | 'createdAt' | 'updatedAt'>> => [
    {
        title: t('realEstate.demo.properties.ocean.title'),
        description: t('realEstate.demo.properties.ocean.description'),
        price: 1285000,
        address: t('realEstate.demo.properties.ocean.address'),
        city: t('realEstate.demo.properties.ocean.city'),
        propertyType: 'condo',
        bedrooms: 3,
        bathrooms: 3,
        squareFeet: 2240,
        amenities: [
            t('realEstate.demo.amenities.oceanView'),
            t('realEstate.demo.amenities.pool'),
            t('realEstate.demo.amenities.security'),
            t('realEstate.demo.amenities.gym'),
        ],
        images: [
            { id: 'demo-ocean-1', url: demoImage('photo-1613490493576-7fde63acd811'), altText: t('realEstate.demo.properties.ocean.title'), position: 0 },
            { id: 'demo-ocean-2', url: demoImage('photo-1600585154340-be6161a56a0c'), altText: t('realEstate.demo.properties.ocean.title'), position: 1 },
        ],
        virtualTourUrl: 'https://example.com/tours/ocean-residence',
        status: 'active',
        isFeatured: true,
    },
    {
        title: t('realEstate.demo.properties.family.title'),
        description: t('realEstate.demo.properties.family.description'),
        price: 685000,
        address: t('realEstate.demo.properties.family.address'),
        city: t('realEstate.demo.properties.family.city'),
        propertyType: 'house',
        bedrooms: 4,
        bathrooms: 3,
        squareFeet: 2860,
        amenities: [
            t('realEstate.demo.amenities.backyard'),
            t('realEstate.demo.amenities.solar'),
            t('realEstate.demo.amenities.doubleGarage'),
            t('realEstate.demo.amenities.smartHome'),
        ],
        images: [
            { id: 'demo-family-1', url: demoImage('photo-1600607687939-ce8a6c25118c'), altText: t('realEstate.demo.properties.family.title'), position: 0 },
            { id: 'demo-family-2', url: demoImage('photo-1600566753190-17f0baa2a6c3'), altText: t('realEstate.demo.properties.family.title'), position: 1 },
        ],
        status: 'active',
        isFeatured: false,
    },
    {
        title: t('realEstate.demo.properties.penthouse.title'),
        description: t('realEstate.demo.properties.penthouse.description'),
        price: 2150000,
        address: t('realEstate.demo.properties.penthouse.address'),
        city: t('realEstate.demo.properties.penthouse.city'),
        propertyType: 'apartment',
        bedrooms: 3,
        bathrooms: 4,
        squareFeet: 3100,
        amenities: [
            t('realEstate.demo.amenities.privateTerrace'),
            t('realEstate.demo.amenities.elevator'),
            t('realEstate.demo.amenities.concierge'),
            t('realEstate.demo.amenities.wineRoom'),
        ],
        images: [
            { id: 'demo-penthouse-1', url: demoImage('photo-1600607687920-4e2a09cf159d'), altText: t('realEstate.demo.properties.penthouse.title'), position: 0 },
            { id: 'demo-penthouse-2', url: demoImage('photo-1600566753086-00f18fb6b3ea'), altText: t('realEstate.demo.properties.penthouse.title'), position: 1 },
        ],
        virtualTourUrl: 'https://example.com/tours/penthouse',
        status: 'pending',
        isFeatured: true,
    },
    {
        title: t('realEstate.demo.properties.investment.title'),
        description: t('realEstate.demo.properties.investment.description'),
        price: 425000,
        address: t('realEstate.demo.properties.investment.address'),
        city: t('realEstate.demo.properties.investment.city'),
        propertyType: 'commercial',
        bedrooms: 0,
        bathrooms: 2,
        squareFeet: 1850,
        amenities: [
            t('realEstate.demo.amenities.cornerLot'),
            t('realEstate.demo.amenities.parking'),
            t('realEstate.demo.amenities.highTraffic'),
            t('realEstate.demo.amenities.flexSpace'),
        ],
        images: [
            { id: 'demo-investment-1', url: demoImage('photo-1497366754035-f200968a6e72'), altText: t('realEstate.demo.properties.investment.title'), position: 0 },
            { id: 'demo-investment-2', url: demoImage('photo-1497366811353-6870744d04b2'), altText: t('realEstate.demo.properties.investment.title'), position: 1 },
        ],
        status: 'draft',
        isFeatured: false,
    },
];



const RealEstateDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { setView } = useUI();
    const { activeProjectId, activeProject } = useProject();
    const {
        properties,
        isLoading,
        addProperty,
        updateProperty,
        updatePropertyStatus,
        deleteProperty,
    } = useRealEstate(user?.uid, activeProjectId);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [propertyModalOpen, setPropertyModalOpen] = useState(false);
    const [editingProperty, setEditingProperty] = useState<Property | null>(null);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
    const [propertyForm, setPropertyForm] = useState(emptyProperty);
    const [amenityInput, setAmenityInput] = useState('');
    const [assistantPrompt, setAssistantPrompt] = useState(() => t('realEstate.assistant.defaultPrompt'));
    const [assistantResult, setAssistantResult] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSeedingDemo, setIsSeedingDemo] = useState(false);

    const propertyStatuses = useMemo<Array<{ value: PropertyStatus; label: string }>>(() => [
        { value: 'draft', label: t('realEstate.status.draft') },
        { value: 'active', label: t('realEstate.status.active') },
        { value: 'pending', label: t('realEstate.status.pending') },
        { value: 'sold', label: t('realEstate.status.sold') },
        { value: 'archived', label: t('realEstate.status.archived') },
    ], [t]);

    const propertyTypes = useMemo<Array<{ value: PropertyType; label: string }>>(() => [
        { value: 'house', label: t('realEstate.propertyTypes.house') },
        { value: 'condo', label: t('realEstate.propertyTypes.condo') },
        { value: 'apartment', label: t('realEstate.propertyTypes.apartment') },
        { value: 'townhouse', label: t('realEstate.propertyTypes.townhouse') },
        { value: 'land', label: t('realEstate.propertyTypes.land') },
        { value: 'commercial', label: t('realEstate.propertyTypes.commercial') },
    ], [t]);



    const statusLabels = useMemo(() => Object.fromEntries(propertyStatuses.map(status => [status.value, status.label])) as Record<PropertyStatus, string>, [propertyStatuses]);

    const selectedProperty = useMemo(
        () => properties.find(property => property.id === selectedPropertyId) || properties[0],
        [properties, selectedPropertyId]
    );

    const metrics = useMemo(() => ({
        total: properties.length,
        active: properties.filter(property => property.status === 'active').length,
        sold: properties.filter(property => property.status === 'sold').length,
    }), [properties]);

    const demoProperties = useMemo(() => getDemoProperties(t), [t]);

    const seedDemoListings = async () => {
        if (isSeedingDemo) return;
        setIsSeedingDemo(true);
        try {
            const existingTitles = new Set(properties.map(property => property.title.trim().toLowerCase()));
            const createdPropertyIds: string[] = [];

            for (const demoProperty of demoProperties) {
                if (existingTitles.has(demoProperty.title.trim().toLowerCase())) continue;
                const propertyId = await addProperty(demoProperty);
                if (propertyId) createdPropertyIds.push(propertyId);
            }

            const targetPropertyIds = createdPropertyIds.length > 0
                ? createdPropertyIds
                : properties.slice(0, 3).map(property => property.id);


        } finally {
            setIsSeedingDemo(false);
        }
    };

    const openPropertyForm = (property?: Property) => {
        if (property) {
            setEditingProperty(property);
            setPropertyForm({
                title: property.title,
                description: property.description,
                price: property.price,
                address: property.address,
                city: property.city,
                propertyType: property.propertyType,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                squareFeet: property.squareFeet,
                amenities: property.amenities || [],
                images: property.images || [],
                videoUrl: property.videoUrl || '',
                virtualTourUrl: property.virtualTourUrl || '',
                status: property.status,
                isFeatured: property.isFeatured,
            });
        } else {
            setEditingProperty(null);
            setPropertyForm(emptyProperty);
        }
        setPropertyModalOpen(true);
    };

    const saveProperty = async (event: React.FormEvent) => {
        event.preventDefault();
        if (editingProperty) {
            await updateProperty(editingProperty.id, propertyForm);
        } else {
            await addProperty(propertyForm);
        }
        setPropertyModalOpen(false);
        setEditingProperty(null);
    };

    const saveLead = async (event: React.FormEvent) => {
        event.preventDefault();
        const leadId = await addPropertyLead({
            ...leadForm,
            propertyId: leadForm.propertyId || undefined,
            stage: 'new',
            source: 'manual',
        });
        if (leadId && leadForm.propertyId) {
            await addShowing({
                propertyId: leadForm.propertyId,
                leadId,
                scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                status: 'scheduled',
                notes: t('realEstate.showings.autoCreatedNote'),
            });
        }
        setLeadForm({ name: '', email: '', phone: '', propertyId: '', message: '' });
        setLeadModalOpen(false);
    };

    const addAmenity = () => {
        const value = amenityInput.trim();
        if (!value || propertyForm.amenities.includes(value)) return;
        setPropertyForm(prev => ({ ...prev, amenities: [...prev.amenities, value] }));
        setAmenityInput('');
    };

    const addImageUrl = (url: string) => {
        if (!url || propertyForm.images.some(image => image.url === url)) return;
        setPropertyForm(prev => ({
            ...prev,
            images: [...prev.images, {
                id: `library-${Date.now()}`,
                url,
                altText: prev.title || t('realEstate.propertyImageAlt'),
                position: prev.images.length,
            }],
        }));
    };

    const generateAssistantContent = async (mode: 'description' | 'social' | 'followup' | 'score') => {
        if (!activeProjectId || !user?.uid) return;
        setIsGenerating(true);
        try {
            const propertyContext = selectedProperty
                ? t('realEstate.assistant.propertyContext', {
                    title: selectedProperty.title,
                    price: money(selectedProperty.price),
                    address: selectedProperty.address,
                    city: selectedProperty.city,
                    bedrooms: selectedProperty.bedrooms,
                    bathrooms: selectedProperty.bathrooms,
                    squareFeet: selectedProperty.squareFeet,
                    description: selectedProperty.description,
                })
                : t('realEstate.assistant.noPropertyContext');
            const prompt = t('realEstate.assistant.systemPrompt', {
                mode,
                request: assistantPrompt,
                propertyContext,
            });
            const response = await generateContentViaProxy(activeProjectId, prompt, 'gemini-2.5-flash', { temperature: 0.7, maxOutputTokens: 900 }, user.uid);
            const text = extractTextFromResponse(response);
            setAssistantResult(text);
            if (mode === 'description' && selectedProperty && text) {
                await updateProperty(selectedProperty.id, { description: text });
            }
        } catch (error) {
            console.error('[RealEstateDashboard] AI generation failed:', error);
            setAssistantResult(t('realEstate.assistant.error'));
        } finally {
            setIsGenerating(false);
        }
    };

    if (!activeProjectId) {
        return (
            <div className="flex h-screen bg-background text-foreground overflow-hidden">
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <RealEstateHeader
                        title={t('realEstate.title')}
                        projectName={activeProject?.name}
                        onOpenMenu={() => setIsMobileMenuOpen(true)}
                        onBack={() => setView('dashboard')}
                        t={t}
                    />
                    <main className="flex-1 min-w-0 overflow-y-auto p-6 md:p-8">
                        <div className="max-w-3xl mx-auto bg-card/60 border border-border rounded-xl p-8 text-center">
                            <Home className="mx-auto text-muted-foreground mb-4" size={44} />
                            <h1 className="text-2xl font-bold text-foreground">{t('realEstate.title')}</h1>
                            <p className="text-muted-foreground mt-2">{t('realEstate.selectProject')}</p>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <DashboardWaveRibbons className="absolute inset-x-0 top-28 h-72 z-0 pointer-events-none overflow-hidden" />
                <RealEstateHeader
                    title={t('realEstate.title')}
                    projectName={activeProject?.name}
                    onBack={() => setView('dashboard')}
                    onAddProperty={() => openPropertyForm()}
                    onSeedDemo={seedDemoListings}
                    isSeedingDemo={isSeedingDemo}
                    t={t}
                />
                <div className="px-4 sm:px-6 border-b border-border bg-card/30 z-10">
                    <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-hide" aria-label={t('realEstate.tabs.navigationLabel')}>
                        {[
                            ['overview', BarChart3, t('realEstate.tabs.dashboard')],
                            ['properties', Home, t('realEstate.tabs.properties')],
                            ['preview', Eye, t('realEstate.tabs.preview')],
                            ['assistant', Bot, t('realEstate.tabs.assistant')],
                        ].map(([id, Icon, label]) => {
                            const TabIcon = Icon as typeof Home;
                            return (
                                <button
                                    key={id as string}
                                    onClick={() => setActiveTab(id as Tab)}
                                    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === id ? 'border-primary text-foreground font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                >
                                    <TabIcon className="w-4 h-4" />
                                    {label as string}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <main className="flex-1 min-w-0 overflow-y-auto relative z-10 p-4 sm:p-6 lg:p-8">
                <div className="space-y-6">

                    {isLoading ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="animate-spin text-primary" size={32} />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                                        {[
                                            [t('realEstate.metrics.totalProperties'), metrics.total, Home],
                                            [t('realEstate.metrics.active'), metrics.active, CheckCircle2],
                                            [t('realEstate.metrics.newLeads'), metrics.newLeads, Users],
                                            [t('realEstate.metrics.showings'), metrics.showings, Calendar],
                                            [t('realEstate.metrics.sold'), metrics.sold, Sparkles],
                                        ].map(([label, value, Icon]) => {
                                            const MetricIcon = Icon as typeof Home;
                                            return (
                                                <div key={label as string} className="bg-card/60 border border-border rounded-xl p-4">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm text-muted-foreground">{label as string}</p>
                                                        <MetricIcon className="text-primary" size={18} />
                                                    </div>
                                                    <p className="text-3xl font-bold text-foreground mt-3">{value as number}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        <div className="lg:col-span-2 bg-card/60 border border-border rounded-xl p-5">
                                            <h2 className="font-bold text-lg mb-4">{t('realEstate.featuredProperties')}</h2>
                                            <div className="space-y-3">
                                                {properties.slice(0, 4).map(property => (
                                                    <PropertyRow key={property.id} property={property} statusLabels={statusLabels} onEdit={() => openPropertyForm(property)} onStatus={updatePropertyStatus} onPreview={() => { setSelectedPropertyId(property.id); setActiveTab('preview'); }} t={t} />
                                                ))}
                                                {properties.length === 0 && (
                                                    <EmptyState
                                                        label={t('realEstate.empty.createFirst')}
                                                        actionLabel={t('realEstate.demo.loadListings')}
                                                        onAction={seedDemoListings}
                                                        isActionLoading={isSeedingDemo}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-card/60 border border-border rounded-xl p-5">
                                            <h2 className="font-bold text-lg mb-4">{t('realEstate.quickActions')}</h2>
                                            <div className="space-y-2">
                                                <Button className="w-full justify-start" variant="secondary" onClick={() => openPropertyForm()}><Plus size={16} />{t('realEstate.actions.createProperty')}</Button>
                                                <Button className="w-full justify-start" variant="secondary" onClick={() => setActiveTab('assistant')}><Sparkles size={16} />{t('realEstate.actions.generateDescription')}</Button>
                                                <Button className="w-full justify-start" variant="secondary" onClick={() => setLeadModalOpen(true)}><Users size={16} />{t('realEstate.actions.addLead')}</Button>
                                                <Button className="w-full justify-start" variant="secondary" onClick={() => setActiveTab('preview')}><Eye size={16} />{t('realEstate.actions.previewListing')}</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'properties' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {properties.map(property => (
                                        <div key={property.id} className="bg-card/60 border border-border rounded-xl overflow-hidden">
                                            <div className="aspect-video bg-muted">
                                                {property.images[0]?.url ? <img src={property.images[0].url} alt={property.title} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-muted-foreground"><Home size={40} /></div>}
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <h3 className="font-bold line-clamp-1">{property.title}</h3>
                                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin size={14} />{property.city}</p>
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusClass(property.status)}`}>{statusLabels[property.status]}</span>
                                                </div>
                                                <p className="text-xl font-bold text-primary">{money(property.price)}</p>
                                                <p className="text-sm text-muted-foreground">{t('realEstate.propertyStats', { bedrooms: property.bedrooms, bathrooms: property.bathrooms, squareFeet: property.squareFeet.toLocaleString() })}</p>
                                                <div className="flex gap-2">
                                                    <Button variant="secondary" size="sm" onClick={() => openPropertyForm(property)}><Edit size={14} />{t('common.edit')}</Button>
                                                    <Button variant="secondary" size="sm" onClick={() => { setSelectedPropertyId(property.id); setActiveTab('preview'); }}><Eye size={14} />{t('realEstate.actions.preview')}</Button>
                                                    <Button variant="ghost" size="icon-sm" onClick={() => deleteProperty(property.id)}><Trash2 size={14} /></Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {properties.length === 0 && (
                                        <div className="md:col-span-2 xl:col-span-3">
                                            <EmptyState
                                                label={t('realEstate.empty.noProperties')}
                                                actionLabel={t('realEstate.demo.loadListings')}
                                                onAction={seedDemoListings}
                                                isActionLoading={isSeedingDemo}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'leads' && (
                                <div className="grid grid-cols-1 xl:grid-cols-6 gap-3">
                                    {leadStages.map(stage => (
                                        <div key={stage.value} className="bg-card/50 border border-border rounded-xl p-3 min-h-72">
                                            <h3 className="font-bold text-sm mb-3">{stage.label}</h3>
                                            <div className="space-y-2">
                                                {leads.filter(lead => lead.stage === stage.value).map(lead => (
                                                    <LeadCard key={lead.id} lead={lead} properties={properties} stageOptions={leadStages} noContactLabel={t('realEstate.noContactInfo')} onStage={value => updatePropertyLead(lead.id, { stage: value })} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'preview' && (
                                <ListingPreview property={selectedProperty} properties={properties} onSelect={setSelectedPropertyId} onPublish={(propertyId) => updatePropertyStatus(propertyId, 'active')} onUnpublish={(propertyId) => updatePropertyStatus(propertyId, 'draft')} t={t} />
                            )}

                            {activeTab === 'assistant' && (
                                <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
                                    <div className="bg-card/60 border border-border rounded-xl p-5 space-y-4">
                                        <h2 className="font-bold text-lg flex items-center gap-2"><Bot size={20} />{t('realEstate.assistant.title')}</h2>
                                        <DashboardSelect
                                            value={selectedProperty?.id || ''}
                                            onChange={setSelectedPropertyId}
                                            placeholder={t('realEstate.selectProperty')}
                                            options={properties.map(property => ({ value: property.id, label: property.title }))}
                                        />
                                        <textarea
                                            value={assistantPrompt}
                                            onChange={event => setAssistantPrompt(event.target.value)}
                                            className="w-full min-h-28 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                        />
                                        <div className="grid grid-cols-1 gap-2">
                                            <Button disabled={isGenerating} onClick={() => generateAssistantContent('description')}><Sparkles size={16} />{t('realEstate.assistant.propertyDescription')}</Button>
                                            <Button disabled={isGenerating} variant="secondary" onClick={() => generateAssistantContent('social')}><Send size={16} />{t('realEstate.assistant.socialPost')}</Button>
                                            <Button disabled={isGenerating} variant="secondary" onClick={() => generateAssistantContent('followup')}><MessageSquare size={16} />{t('realEstate.assistant.followUp')}</Button>
                                            <Button disabled={isGenerating} variant="secondary" onClick={() => generateAssistantContent('score')}><BarChart3 size={16} />{t('realEstate.assistant.listingScore')}</Button>
                                        </div>
                                    </div>
                                    <div className="bg-card/60 border border-border rounded-xl p-5 min-h-96">
                                        {isGenerating ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div> : (
                                            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm text-foreground">{assistantResult || t('realEstate.assistant.emptyOutput')}</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
            </div>

            <Modal isOpen={propertyModalOpen} onClose={() => setPropertyModalOpen(false)} maxWidth="max-w-5xl" fullScreenMobile>
                <form onSubmit={saveProperty} className="flex flex-col h-full flex-1 min-h-0">
                    <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
                        <h2 className="text-xl font-bold">{editingProperty ? t('realEstate.form.editProperty') : t('realEstate.form.createProperty')}</h2>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setPropertyModalOpen(false)} aria-label={t('common.close')}><X size={16} /></Button>
                    </div>
                    <div className="p-5 overflow-y-auto flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 custom-scrollbar">
                        <Field label={t('realEstate.form.title')}><Input required value={propertyForm.title} onChange={event => setPropertyForm(prev => ({ ...prev, title: event.target.value }))} /></Field>
                        <Field label={t('realEstate.form.price')}><Input type="number" value={propertyForm.price} onChange={event => setPropertyForm(prev => ({ ...prev, price: Number(event.target.value) }))} /></Field>
                        <Field label={t('realEstate.form.address')}><Input value={propertyForm.address} onChange={event => setPropertyForm(prev => ({ ...prev, address: event.target.value }))} /></Field>
                        <Field label={t('realEstate.form.city')}><Input value={propertyForm.city} onChange={event => setPropertyForm(prev => ({ ...prev, city: event.target.value }))} /></Field>
                        <Field label={t('realEstate.form.propertyType')}><DashboardSelect value={propertyForm.propertyType} onChange={value => setPropertyForm(prev => ({ ...prev, propertyType: value as PropertyType }))} options={propertyTypes} /></Field>
                        <Field label={t('realEstate.form.status')}><DashboardSelect value={propertyForm.status} onChange={value => setPropertyForm(prev => ({ ...prev, status: value as PropertyStatus }))} options={propertyStatuses} /></Field>
                        <Field label={t('realEstate.form.bedrooms')}><Input type="number" value={propertyForm.bedrooms} onChange={event => setPropertyForm(prev => ({ ...prev, bedrooms: Number(event.target.value) }))} /></Field>
                        <Field label={t('realEstate.form.bathrooms')}><Input type="number" value={propertyForm.bathrooms} onChange={event => setPropertyForm(prev => ({ ...prev, bathrooms: Number(event.target.value) }))} /></Field>
                        <Field label={t('realEstate.form.squareFeet')}><Input type="number" value={propertyForm.squareFeet} onChange={event => setPropertyForm(prev => ({ ...prev, squareFeet: Number(event.target.value) }))} /></Field>
                        <Field label={t('realEstate.form.virtualTourUrl')}><Input value={propertyForm.virtualTourUrl} onChange={event => setPropertyForm(prev => ({ ...prev, virtualTourUrl: event.target.value }))} /></Field>
                        <label className="lg:col-span-2 flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={propertyForm.isFeatured} onChange={event => setPropertyForm(prev => ({ ...prev, isFeatured: event.target.checked }))} />
                            {t('realEstate.form.featuredProperty')}
                        </label>
                        <Field label={t('realEstate.form.description')} className="lg:col-span-2">
                            <textarea value={propertyForm.description} onChange={event => setPropertyForm(prev => ({ ...prev, description: event.target.value }))} className="w-full min-h-32 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                        </Field>
                        <Field label={t('realEstate.form.amenities')} className="lg:col-span-2">
                            <div className="flex gap-2">
                                <Input value={amenityInput} onChange={event => setAmenityInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addAmenity(); } }} />
                                <Button type="button" variant="secondary" onClick={addAmenity}>{t('common.add')}</Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {propertyForm.amenities.map(amenity => <button type="button" key={amenity} onClick={() => setPropertyForm(prev => ({ ...prev, amenities: prev.amenities.filter(item => item !== amenity) }))} className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{amenity}</button>)}
                            </div>
                        </Field>
                        <Field label={t('realEstate.form.gallery')} className="lg:col-span-2">
                            <ImagePicker label="" value={propertyForm.images[0]?.url || ''} onChange={addImageUrl} />
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                                {propertyForm.images.map(image => <img key={image.id} src={image.url} alt={image.altText || ''} className="aspect-video rounded-lg object-cover border border-border" />)}
                            </div>
                        </Field>
                    </div>
                    <div className="p-5 border-t border-border flex justify-end gap-2 shrink-0">
                        <Button type="button" variant="secondary" onClick={() => setPropertyModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button type="submit">{t('realEstate.form.saveProperty')}</Button>
                    </div>
                </form>
            </Modal>

        </div>
    );
};

const RealEstateHeader = ({
    title,
    projectName,
    onOpenMenu,
    onBack,
    onAddProperty,
    onSeedDemo,
    isSeedingDemo,
    t,
}: {
    title: string;
    projectName?: string;
    onOpenMenu: () => void;
    onBack: () => void;
    onAddProperty?: () => void;
    onSeedDemo?: () => void;
    isSeedingDemo?: boolean;
    t: (key: string, options?: Record<string, unknown>) => string;
}) => (
    <header className="h-14 px-2 sm:px-6 border-b border-border flex items-center justify-between bg-background z-20 shrink-0">
        <div className="flex items-center gap-1 sm:gap-4 min-w-0">
            <button
                onClick={onOpenMenu}
                className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary rounded-lg transition-colors touch-manipulation"
                aria-label={t('common.openMenu')}
            >
                <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <Home className="text-primary w-5 h-5 flex-shrink-0" />
                <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate">{title}</h1>
                {projectName && (
                    <span className="hidden md:inline text-sm text-muted-foreground truncate max-w-[220px]">
                        {projectName}
                    </span>
                )}
            </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
            {onSeedDemo && (
                <Button variant="secondary" size="sm" onClick={onSeedDemo} disabled={isSeedingDemo} className="hidden lg:inline-flex">
                    {isSeedingDemo ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    {t('realEstate.demo.loadListings')}
                </Button>
            )}
            {onAddProperty && (
                <Button size="sm" onClick={onAddProperty}>
                    <Plus size={16} />
                    <span className="hidden sm:inline">{t('realEstate.actions.newProperty')}</span>
                </Button>
            )}
            <HeaderBackButton onClick={onBack} />
        </div>
    </header>
);

const Field = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
    <label className={`block space-y-2 ${className}`}>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
        {children}
    </label>
);

const EmptyState = ({ label, actionLabel, onAction, isActionLoading }: { label: string; actionLabel?: string; onAction?: () => void; isActionLoading?: boolean }) => (
    <div className="border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground">
        <p>{label}</p>
        {actionLabel && onAction && (
            <Button className="mt-4" variant="secondary" onClick={onAction} disabled={isActionLoading}>
                {isActionLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                {actionLabel}
            </Button>
        )}
    </div>
);

const PropertyRow = ({
    property,
    statusLabels,
    onEdit,
    onStatus,
    onPreview,
    t,
}: {
    property: Property;
    statusLabels: Record<PropertyStatus, string>;
    onEdit: () => void;
    onStatus: (id: string, status: PropertyStatus) => void;
    onPreview: () => void;
    t: (key: string) => string;
}) => (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background/60 border border-border">
        <div className="min-w-0">
            <p className="font-semibold truncate">{property.title}</p>
            <p className="text-sm text-muted-foreground">{money(property.price)} · {property.city}</p>
        </div>
        <div className="flex items-center gap-2">
            <span className={`hidden sm:inline text-xs px-2 py-1 rounded-full font-semibold ${statusClass(property.status)}`}>{statusLabels[property.status]}</span>
            <Button variant="ghost" size="icon-sm" onClick={onPreview} aria-label={t('realEstate.actions.preview')}><Eye size={14} /></Button>
            <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={t('common.edit')}><Edit size={14} /></Button>
            <Button variant="secondary" size="sm" onClick={() => onStatus(property.id, property.status === 'active' ? 'draft' : 'active')}>{property.status === 'active' ? t('realEstate.actions.unpublish') : t('realEstate.actions.publish')}</Button>
        </div>
    </div>
);


const ListingPreview = ({ property, properties, onSelect, onPublish, onUnpublish, t }: { property?: Property; properties: Property[]; onSelect: (id: string) => void; onPublish: (id: string) => void; onUnpublish: (id: string) => void; t: (key: string) => string }) => {
    if (!property) return <EmptyState label={t('realEstate.empty.previewProperty')} />;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
            <div className="bg-card/60 border border-border rounded-xl p-4 space-y-4">
                <DashboardSelect value={property.id} onChange={onSelect} options={properties.map(item => ({ value: item.id, label: item.title }))} />
                <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => onPublish(property.id)}>{t('realEstate.actions.publish')}</Button>
                    <Button className="flex-1" variant="secondary" onClick={() => onUnpublish(property.id)}>{t('realEstate.actions.unpublish')}</Button>
                </div>
                <p className="text-sm text-muted-foreground">{t('realEstate.preview.publicSync')}</p>
            </div>
            <article className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="aspect-[16/7] bg-muted">
                    {property.images[0]?.url ? <img src={property.images[0].url} alt={property.title} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-muted-foreground"><Home size={56} /></div>}
                </div>
                <div className="p-6 md:p-8 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-bold">{property.title}</h2>
                            <p className="text-muted-foreground flex items-center gap-2 mt-2"><MapPin size={16} />{property.address}, {property.city}</p>
                        </div>
                        <p className="text-3xl font-bold text-primary">{money(property.price)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-background/70 rounded-lg p-3 text-center"><p className="font-bold">{property.bedrooms}</p><p className="text-xs text-muted-foreground">{t('realEstate.units.beds')}</p></div>
                        <div className="bg-background/70 rounded-lg p-3 text-center"><p className="font-bold">{property.bathrooms}</p><p className="text-xs text-muted-foreground">{t('realEstate.units.baths')}</p></div>
                        <div className="bg-background/70 rounded-lg p-3 text-center"><p className="font-bold">{property.squareFeet.toLocaleString()}</p><p className="text-xs text-muted-foreground">{t('realEstate.units.sqft')}</p></div>
                    </div>
                    <p className="leading-7 text-foreground/90 whitespace-pre-wrap">{property.description || t('realEstate.preview.noDescription')}</p>
                    <div className="flex flex-wrap gap-2">{property.amenities.map(amenity => <span key={amenity} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">{amenity}</span>)}</div>
                </div>
            </article>
        </div>
    );
};

export default RealEstateDashboard;
