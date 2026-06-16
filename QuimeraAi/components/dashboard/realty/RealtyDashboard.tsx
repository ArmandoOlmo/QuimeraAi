import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BarChart3,
    Building2,
    CalendarDays,
    Check,
    Copy,
    Eye,
    Home,
    Loader2,
    Megaphone,
    Menu,
    MessageSquare,
    Plus,
    Save,
    Settings,
    Sparkles,
    Trash2,
    Users,
    Wand2,
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
import type {
    CampaignType,
    PropertyCampaign,
    PropertyOpenHouse,
    RealtyAiLanguage,
    RealtyCampaignAiOutput,
    RealtyCampaignStatus,
    RealtyAiListingOutput,
    RealtyAiTone,
    RealtyImage,
    RealtyLead,
    RealtyListingScore,
    RealtyOpenHouseStatus,
    RealtyProperty,
    RealtyPropertyStatus,
    RealtyPropertyType,
} from '../../../types/realty';
import {
    calculateRealtyListingScore,
    formatRealtyPrice,
    isRealtyCrmLead,
    mapCrmLeadToRealtyLead,
    realtyCampaignStatuses,
    realtyCampaignTypes,
    realtyLeadStatuses,
    realtyOpenHouseStatuses,
    realtyPropertyStatuses,
    realtyPropertyTypes,
    toRealtySlug,
} from '../../../utils/realty';
import {
    buildRealtyAiPropertyPatch,
    formatRealtyCampaignOutput,
    formatRealtyAiListingOutput,
    generateRealtyCampaignContent,
    generateRealtyListingContent,
    getGeneratedRealtyFields,
    normalizeRealtyCampaignOutput,
    REALTY_AI_DEFAULT_MODEL,
    REALTY_AI_MODELS,
    REALTY_AI_TONES,
} from '../../../utils/realtyAiClient';

type RealtyTab = 'overview' | 'properties' | 'leads' | 'campaigns' | 'openHouses' | 'ai' | 'settings';

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
const getLocalTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Puerto_Rico';
const toDatetimeLocalValue = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
};
const fromDatetimeLocalValue = (value: string) => value ? new Date(value).toISOString() : null;
const parseCampaignContentInput = (value: string): Record<string, unknown> => {
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
        const parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : { mainCopy: trimmed };
    } catch {
        return { mainCopy: trimmed };
    }
};
const getCampaignPreview = (content?: Record<string, unknown>) => {
    const normalized = normalizeRealtyCampaignOutput(content || {});
    return normalized.mainCopy || normalized.socialPost || normalized.emailSubject || normalized.adHeadline || '';
};

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
    const [propertyImageAssets, setPropertyImageAssets] = useState<Record<string, Partial<RealtyImage>>>({});
    const [aiPropertyId, setAiPropertyId] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiTone, setAiTone] = useState<RealtyAiTone>('luxury');
    const [aiLanguage, setAiLanguage] = useState<RealtyAiLanguage>(i18n.language?.startsWith('en') ? 'en' : 'es');
    const [aiModel, setAiModel] = useState(REALTY_AI_DEFAULT_MODEL);
    const [aiResult, setAiResult] = useState<{
        output: RealtyAiListingOutput;
        prompt: string;
        model: string;
        generatedFields: string[];
        mode: 'full' | 'fix';
    } | null>(null);
    const [editingCampaign, setEditingCampaign] = useState<Partial<PropertyCampaign> | null>(null);
    const [campaignContentInput, setCampaignContentInput] = useState('');
    const [campaignPrompt, setCampaignPrompt] = useState('');
    const [campaignAiResult, setCampaignAiResult] = useState<{
        output: RealtyCampaignAiOutput;
        prompt: string;
        model: string;
        generatedFields: string[];
    } | null>(null);
    const [isGeneratingCampaignAi, setIsGeneratingCampaignAi] = useState(false);
    const [editingOpenHouse, setEditingOpenHouse] = useState<Partial<PropertyOpenHouse> | null>(null);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [isSavingAiGeneration, setIsSavingAiGeneration] = useState(false);
    const [lastAiSavedAt, setLastAiSavedAt] = useState<string | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);
    const [localWarning, setLocalWarning] = useState<string | null>(null);

    const tabs = useMemo(() => [
        { id: 'overview' as const, label: t('realty.tabs.overview'), icon: BarChart3, visible: access.canView },
        { id: 'properties' as const, label: t('realty.tabs.properties'), icon: Building2, visible: access.canManageProperties },
        { id: 'leads' as const, label: t('realty.tabs.leads'), icon: Users, visible: access.canManageLeads },
        { id: 'campaigns' as const, label: t('realty.tabs.campaigns'), icon: Megaphone, visible: access.canManageProperties || access.canManage },
        { id: 'openHouses' as const, label: t('realty.tabs.openHouses'), icon: CalendarDays, visible: access.canManageProperties || access.canManage },
        { id: 'ai' as const, label: t('realty.tabs.ai'), icon: Sparkles, visible: access.canUseAi },
        { id: 'settings' as const, label: t('realty.tabs.settings'), icon: Settings, visible: access.canManageSettings },
    ].filter(item => item.visible), [access.canManage, access.canManageLeads, access.canManageProperties, access.canManageSettings, access.canUseAi, access.canView, t]);

    const displayProperties = suite.properties;
    const crmRealtyLeads = useMemo(
        () => crm.leads.filter(isRealtyCrmLead).map(mapCrmLeadToRealtyLead),
        [crm.leads]
    );
    const suiteLeadIds = useMemo(() => new Set(suite.leads.map(lead => lead.id)), [suite.leads]);
    const displayLeads = useMemo(() => {
        const crmIdsSyncedToSuite = new Set(
            suite.leads
                .map(lead => lead.crmLeadId || (typeof lead.metadata?.sourceLeadId === 'string' ? lead.metadata.sourceLeadId : ''))
                .filter(Boolean)
        );
        const suiteIdentityKeys = new Set(
            suite.leads.map(lead => `${lead.email.toLowerCase()}::${lead.propertyId || ''}`)
        );
        const unsyncedCrmLeads = crmRealtyLeads.filter(lead => {
            if (crmIdsSyncedToSuite.has(lead.id)) return false;
            return !suiteIdentityKeys.has(`${lead.email.toLowerCase()}::${lead.propertyId || ''}`);
        });
        return [...suite.leads, ...unsyncedCrmLeads].sort((a, b) => getDateMs(b.createdAt) - getDateMs(a.createdAt));
    }, [crmRealtyLeads, suite.leads]);
    const displayNewLeads = displayLeads.filter(lead => lead.status === 'new');
    const propertyTitleById = useMemo(
        () => new Map(displayProperties.map(property => [property.id, property.title])),
        [displayProperties]
    );
    const displayActiveProperties = displayProperties.filter(property => property.status === 'active');
    const selectedAiProperty = displayProperties.find(property => property.id === aiPropertyId) || displayProperties[0];
    const propertyScores = useMemo(
        () => new Map(displayProperties.map(property => [property.id, calculateRealtyListingScore(property)])),
        [displayProperties]
    );
    const averageListingScore = displayProperties.length > 0
        ? Math.round(displayProperties.reduce((total, property) => total + (propertyScores.get(property.id)?.score || 0), 0) / displayProperties.length)
        : 0;
    const selectedAiScore = selectedAiProperty ? propertyScores.get(selectedAiProperty.id) || calculateRealtyListingScore(selectedAiProperty) : null;
    const latestSavedGeneration = useMemo(() => {
        const source = suite.aiGenerations.find(generation => generation.propertyId === selectedAiProperty?.id) || suite.aiGenerations[0];
        if (!source?.output) return '';
        try {
            return JSON.stringify(JSON.parse(source.output), null, 2);
        } catch {
            return source.output;
        }
    }, [selectedAiProperty?.id, suite.aiGenerations]);

    const getLeadPropertyTitle = (lead: RealtyLead) => {
        const metadataTitle = typeof lead.metadata?.propertyTitle === 'string' ? lead.metadata.propertyTitle : '';
        return metadataTitle || (lead.propertyId ? propertyTitleById.get(lead.propertyId) : '') || '';
    };

    const getPropertyTitle = (propertyId?: string | null) =>
        propertyId ? propertyTitleById.get(propertyId) || t('realty.selectProperty') : t('realty.selectProperty');

    const getOpenHouseTitle = (openHouse: Partial<PropertyOpenHouse>) =>
        openHouse.title
        || (typeof openHouse.metadata?.title === 'string' ? openHouse.metadata.title : '')
        || (openHouse.propertyId ? getPropertyTitle(openHouse.propertyId) : t('realty.openHouses.defaultTitle'));

    const startCreateCampaign = () => {
        if (!activeProjectId) return;
        const defaultProperty = displayProperties[0];
        setEditingCampaign({
            projectId: activeProjectId,
            tenantId: currentTenantId,
            userId: user?.id || '',
            propertyId: defaultProperty?.id || null,
            campaignType: 'just_listed',
            title: defaultProperty ? t('realty.campaigns.defaultTitle', { property: defaultProperty.title }) : '',
            status: 'draft',
            content: {},
            scheduledAt: null,
            metadata: {},
        });
        setCampaignContentInput('');
        setCampaignPrompt('');
        setCampaignAiResult(null);
        setLocalError(null);
        setLocalWarning(null);
    };

    const startEditCampaign = (campaign: PropertyCampaign) => {
        setEditingCampaign(campaign);
        setCampaignContentInput(Object.keys(campaign.content || {}).length > 0 ? JSON.stringify(campaign.content, null, 2) : '');
        setCampaignPrompt('');
        setCampaignAiResult(null);
        setLocalError(null);
        setLocalWarning(null);
    };

    const saveCampaign = async () => {
        if (!editingCampaign || !activeProjectId) return;
        if (!editingCampaign.propertyId) {
            setLocalError(t('realty.campaigns.errors.propertyRequired'));
            return;
        }
        setLocalError(null);
        try {
            const content = parseCampaignContentInput(campaignContentInput);
            await suite.saveCampaign({
                ...editingCampaign,
                projectId: activeProjectId,
                tenantId: currentTenantId,
                userId: user?.id || editingCampaign.userId,
                title: editingCampaign.title || t('realty.campaigns.defaultTitle', { property: getPropertyTitle(editingCampaign.propertyId) }),
                content,
            });
            setEditingCampaign(null);
            setCampaignContentInput('');
            setCampaignAiResult(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : t('realty.campaigns.errors.save');
            setLocalError(message);
        }
    };

    const generateCampaignAi = async () => {
        if (!editingCampaign?.propertyId || !activeProjectId) {
            setLocalError(t('realty.campaigns.errors.propertyRequired'));
            return;
        }
        setLocalError(null);
        setLocalWarning(null);
        setIsGeneratingCampaignAi(true);
        try {
            const result = await generateRealtyCampaignContent({
                projectId: activeProjectId,
                propertyId: editingCampaign.propertyId,
                campaignType: (editingCampaign.campaignType || 'just_listed') as CampaignType,
                language: aiLanguage,
                tone: aiTone,
                userPrompt: campaignPrompt || t('realty.campaigns.aiDefaultPrompt'),
                model: aiModel,
            });
            const nextCampaign = {
                ...editingCampaign,
                title: editingCampaign.title || result.output.title,
                content: result.output as unknown as Record<string, unknown>,
            };
            const savedId = await suite.saveCampaign({
                ...nextCampaign,
                projectId: activeProjectId,
                tenantId: currentTenantId,
                userId: user?.id || editingCampaign.userId,
            });
            await suite.saveAiGeneration({
                tenantId: currentTenantId,
                projectId: activeProjectId,
                propertyId: editingCampaign.propertyId,
                userId: user?.id || null,
                kind: 'social_post',
                prompt: result.prompt,
                output: JSON.stringify(result.output, null, 2),
                metadata: {
                    provider: 'openrouter',
                    model: result.model,
                    campaignType: editingCampaign.campaignType || 'just_listed',
                    generatedFields: result.generatedFields,
                },
            });
            setCampaignAiResult(result);
            setCampaignContentInput(JSON.stringify(result.output, null, 2));
            setEditingCampaign({ ...nextCampaign, id: savedId || editingCampaign.id });
            setLocalWarning(t('realty.campaigns.aiSaved'));
        } catch (err) {
            const message = err instanceof Error ? err.message : t('realty.campaigns.errors.generate');
            setLocalError(message);
        } finally {
            setIsGeneratingCampaignAi(false);
        }
    };

    const copyCampaign = async (campaign?: Partial<PropertyCampaign>) => {
        const content = campaign?.content || parseCampaignContentInput(campaignContentInput);
        await navigator.clipboard.writeText(formatRealtyCampaignOutput(content));
        setLocalWarning(t('realty.campaigns.copied'));
    };

    const deleteCampaign = async (campaignId: string) => {
        if (!window.confirm(t('realty.campaigns.confirmDelete'))) return;
        try {
            await suite.deleteCampaign(campaignId);
        } catch (err) {
            const message = err instanceof Error ? err.message : t('realty.campaigns.errors.delete');
            setLocalError(message);
        }
    };

    const startCreateOpenHouse = () => {
        if (!activeProjectId) return;
        const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        startsAt.setMinutes(0, 0, 0);
        const endsAt = new Date(startsAt.getTime() + 90 * 60 * 1000);
        const defaultProperty = displayProperties[0];
        setEditingOpenHouse({
            projectId: activeProjectId,
            tenantId: currentTenantId,
            userId: user?.id || '',
            propertyId: defaultProperty?.id || '',
            title: defaultProperty ? t('realty.openHouses.defaultTitleWithProperty', { property: defaultProperty.title }) : t('realty.openHouses.defaultTitle'),
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            timezone: getLocalTimezone(),
            status: 'scheduled',
            notes: '',
            registrationEnabled: true,
            metadata: { capacity: 12 },
        });
        setLocalError(null);
        setLocalWarning(null);
    };

    const startEditOpenHouse = (openHouse: PropertyOpenHouse) => {
        setEditingOpenHouse(openHouse);
        setLocalError(null);
        setLocalWarning(null);
    };

    const saveOpenHouse = async () => {
        if (!editingOpenHouse || !activeProjectId) return;
        if (!editingOpenHouse.propertyId) {
            setLocalError(t('realty.openHouses.errors.propertyRequired'));
            return;
        }
        setLocalError(null);
        try {
            await suite.saveOpenHouse({
                ...editingOpenHouse,
                projectId: activeProjectId,
                tenantId: currentTenantId,
                userId: user?.id || editingOpenHouse.userId,
                title: getOpenHouseTitle(editingOpenHouse),
            });
            setEditingOpenHouse(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : t('realty.openHouses.errors.save');
            setLocalError(message);
        }
    };

    const deleteOpenHouse = async (openHouseId: string) => {
        if (!window.confirm(t('realty.openHouses.confirmDelete'))) return;
        try {
            await suite.deleteOpenHouse(openHouseId);
        } catch (err) {
            const message = err instanceof Error ? err.message : t('realty.openHouses.errors.delete');
            setLocalError(message);
        }
    };

    const getScoreToneClass = (score: RealtyListingScore) => {
        if (score.grade === 'excellent') return 'border-q-success/30 bg-q-success/10 text-q-success';
        if (score.grade === 'good') return 'border-q-accent/30 bg-q-accent/10 text-q-accent';
        if (score.grade === 'needs_work') return 'border-q-warning/30 bg-q-warning/10 text-q-warning';
        return 'border-q-error/30 bg-q-error/10 text-q-error';
    };

    const translateScoreField = (field: string) => t(`realty.score.fields.${field}`, field);
    const translateRecommendation = (key: string) => t(`realty.score.recommendations.${key}`, key);

    const fieldsWithExistingContent = (property: RealtyProperty, output: RealtyAiListingOutput) => {
        const fields: string[] = [];
        if (output.title && property.title) fields.push(t('realty.form.title'));
        if (output.descriptionShort && property.descriptionShort) fields.push(t('realty.ai.fields.descriptionShort'));
        if (output.descriptionLong && (property.descriptionLong || property.description)) fields.push(t('realty.form.description'));
        if (output.highlights.length > 0 && (property.highlights || []).length > 0) fields.push(t('realty.ai.fields.highlights'));
        if (output.features.length > 0 && (property.features || []).length > 0) fields.push(t('realty.ai.fields.features'));
        if (output.seoTitle && property.seoTitle) fields.push(t('realty.ai.fields.seoTitle'));
        if (output.seoDescription && property.seoDescription) fields.push(t('realty.ai.fields.seoDescription'));
        return fields;
    };

    const startCreate = () => {
        if (!activeProjectId) return;
        const draft = emptyProperty(activeProjectId, currentTenantId, user?.id || null);
        setEditingProperty(draft);
        setAmenitiesInput('');
        setPropertyImageUrls([]);
        setPropertyImageAssets({});
        setLocalWarning(null);
        setLocalError(null);
    };

    const startEdit = (property: RealtyProperty) => {
        setEditingProperty(property);
        setAmenitiesInput((property.amenities || []).join('\n'));
        setPropertyImageUrls((property.images || []).map(image => image.url).filter(Boolean));
        setPropertyImageAssets(Object.fromEntries((property.images || []).filter(image => image.url).map(image => [image.url, image])));
        setLocalWarning(null);
        setLocalError(null);
    };

    const updatePropertyImage = (index: number, url: string, asset?: Partial<RealtyImage>) => {
        const normalizedUrl = url.trim();
        setPropertyImageUrls(prev => {
            const next = [...prev];
            next[index] = normalizedUrl;
            return next;
        });
        if (normalizedUrl || asset?.storagePath) {
            setPropertyImageAssets(prev => ({
                ...prev,
                [normalizedUrl]: {
                    ...prev[normalizedUrl],
                    ...asset,
                    url: normalizedUrl,
                    position: index,
                },
            }));
        }
    };

    const removePropertyImage = (index: number) => {
        const removedUrl = propertyImageUrls[index];
        setPropertyImageUrls(prev => prev.filter((_, itemIndex) => itemIndex !== index));
        if (removedUrl) {
            setPropertyImageAssets(prev => {
                const next = { ...prev };
                delete next[removedUrl];
                return next;
            });
        }
    };

    const addPropertyImageSlot = () => {
        setPropertyImageUrls(prev => prev.length === 0 ? ['', ''] : [...prev, '']);
    };

    const saveProperty = async () => {
        if (!editingProperty || !activeProjectId) return;
        setLocalError(null);
        setLocalWarning(null);
        try {
            const nextSlug = editingProperty.slug || toRealtySlug(editingProperty.title || '');
            const existingImagesByUrl = new Map((editingProperty.images || []).filter(image => image.url).map(image => [image.url, image]));
            const nextImages = cleanImageUrls(propertyImageUrls).map((url, index) => {
                const asset = propertyImageAssets[url] || existingImagesByUrl.get(url) || {};
                return {
                    id: asset.id || `image-${index}`,
                    url,
                    storagePath: asset.storagePath || null,
                    mediaType: asset.mediaType || 'image',
                    position: index,
                    altText: editingProperty.title || asset.altText || '',
                    isPrimary: index === 0,
                    metadata: asset.metadata || {},
                };
            });
            if (editingProperty.status === 'active') {
                const requiredMissing = [
                    !editingProperty.title?.trim() ? t('realty.form.title') : '',
                    !nextSlug ? t('realty.form.slug') : '',
                    !editingProperty.propertyType ? t('realty.form.type') : '',
                ].filter(Boolean);
                const recommendedMissing = [
                    !editingProperty.price ? t('realty.form.price') : '',
                    nextImages.length === 0 ? t('realty.form.images') : '',
                    !editingProperty.description?.trim() ? t('realty.form.description') : '',
                ].filter(Boolean);

                if (requiredMissing.length > 0) {
                    setLocalError(t('realty.errors.publishRequired', { fields: requiredMissing.join(', ') }));
                    setLocalWarning(t('realty.warnings.publishMissing', { fields: [...requiredMissing, ...recommendedMissing].join(', ') }));
                    return;
                }

                if (recommendedMissing.length > 0) {
                    setLocalWarning(t('realty.warnings.publishMissing', { fields: recommendedMissing.join(', ') }));
                }
            }

            await suite.saveProperty({
                ...editingProperty,
                projectId: activeProjectId,
                tenantId: currentTenantId,
                createdBy: user?.id || editingProperty.createdBy,
                slug: nextSlug,
                amenities: parseLines(amenitiesInput),
                images: nextImages,
            });
            setEditingProperty(null);
            setPropertyImageUrls([]);
            setPropertyImageAssets({});
        } catch (err: any) {
            setLocalError(err.message || t('realty.errors.saveProperty'));
        }
    };

    const generateAiCopy = async (mode: 'full' | 'fix' = 'full', propertyOverride?: RealtyProperty) => {
        const targetProperty = propertyOverride || selectedAiProperty;
        if (!targetProperty || !activeProjectId) return;
        setLocalError(null);
        setLocalWarning(null);
        setLastAiSavedAt(null);
        setIsGeneratingAi(true);
        try {
            const score = propertyScores.get(targetProperty.id) || calculateRealtyListingScore(targetProperty);
            const result = await generateRealtyListingContent({
                projectId: activeProjectId,
                propertyId: targetProperty.id,
                tone: aiTone,
                language: aiLanguage,
                userPrompt: aiPrompt || t('realty.ai.defaultPrompt'),
                model: aiModel,
                mode,
                score,
            });
            setAiPropertyId(targetProperty.id);
            setAiResult({
                output: result.output,
                prompt: result.prompt,
                model: result.model,
                generatedFields: result.generatedFields,
                mode: result.mode,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : t('realty.ai.errors.generate');
            setLocalError(message);
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const saveAiGeneration = async () => {
        if (!aiResult || !selectedAiProperty || !activeProjectId) return;
        setIsSavingAiGeneration(true);
        setLocalError(null);
        try {
            await suite.saveAiGeneration({
                tenantId: currentTenantId,
                projectId: activeProjectId,
                propertyId: selectedAiProperty.id,
                userId: user?.id || null,
                kind: 'listing_description',
                prompt: aiResult.prompt,
                output: JSON.stringify(aiResult.output, null, 2),
                metadata: {
                    tone: aiTone,
                    language: aiLanguage,
                    model: aiResult.model,
                    provider: 'openrouter',
                    generatedFields: aiResult.generatedFields.length > 0 ? aiResult.generatedFields : getGeneratedRealtyFields(aiResult.output),
                    mode: aiResult.mode,
                },
            });
            setLastAiSavedAt(new Date().toISOString());
        } catch (err) {
            const message = err instanceof Error ? err.message : t('realty.ai.errors.save');
            setLocalError(message);
        } finally {
            setIsSavingAiGeneration(false);
        }
    };

    const copyAiOutput = async () => {
        if (!aiResult) return;
        await navigator.clipboard.writeText(formatRealtyAiListingOutput(aiResult.output));
        setLocalWarning(t('realty.ai.copied'));
    };

    const applyAiContentToProperty = async () => {
        if (!aiResult || !selectedAiProperty) return;
        setLocalError(null);
        setLocalWarning(null);
        try {
            const existingFields = fieldsWithExistingContent(selectedAiProperty, aiResult.output);
            const overwriteExisting = existingFields.length === 0
                ? true
                : window.confirm(t('realty.ai.confirmOverwrite', { fields: existingFields.join(', ') }));
            if (!overwriteExisting && existingFields.length > 0) return;
            const patch = buildRealtyAiPropertyPatch(selectedAiProperty, aiResult.output, overwriteExisting);
            await suite.saveProperty({
                ...patch,
                listingScore: calculateRealtyListingScore(patch).score,
            });
            setLocalWarning(t('realty.ai.applied'));
        } catch (err) {
            const message = err instanceof Error ? err.message : t('realty.ai.errors.apply');
            setLocalError(message);
        }
    };

    const fixPropertyWithAi = (property: RealtyProperty) => {
        setAiPropertyId(property.id);
        setActiveTab('ai');
        void generateAiCopy('fix', property);
    };

    const renderPropertyForm = () => {
        if (!editingProperty) return null;
        const update = (patch: Partial<RealtyProperty>) => setEditingProperty(prev => ({ ...prev, ...patch }));
        const imageSlots = propertyImageUrls.length > 0 ? propertyImageUrls : [''];
        const editingScore = calculateRealtyListingScore({
            ...editingProperty,
            amenities: parseLines(amenitiesInput),
            images: cleanImageUrls(propertyImageUrls).map((url, index) => ({ id: `preview-${index}`, url, position: index })),
        });
        const savedEditingProperty = editingProperty.id
            ? displayProperties.find(property => property.id === editingProperty.id)
            : null;

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
                    <div className="rounded-lg border border-q-border bg-q-bg p-4 md:col-span-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-q-text">{t('realty.score.title')}</p>
                                <p className="mt-1 text-xs text-q-text-secondary">{t(`realty.score.grade.${editingScore.grade}`)}</p>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-sm font-bold ${getScoreToneClass(editingScore)}`}>{editingScore.score}%</span>
                        </div>
                        {(editingScore.missingRequired.length > 0 || editingScore.missingRecommended.length > 0) && (
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {editingScore.missingRequired.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-q-error">{t('realty.score.required')}</p>
                                        <ul className="mt-2 space-y-1 text-sm text-q-text-secondary">
                                            {editingScore.missingRequired.map(field => <li key={field}>• {translateScoreField(field)}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {editingScore.missingRecommended.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-q-warning">{t('realty.score.recommended')}</p>
                                        <ul className="mt-2 space-y-1 text-sm text-q-text-secondary">
                                            {editingScore.missingRecommended.slice(0, 6).map(field => <li key={field}>• {translateScoreField(field)}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                        {editingScore.recommendations.length > 0 && (
                            <div className="mt-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('realty.score.recommendationsTitle')}</p>
                                <ul className="mt-2 space-y-1 text-sm text-q-text-secondary">
                                    {editingScore.recommendations.slice(0, 4).map(item => <li key={item}>• {translateRecommendation(item)}</li>)}
                                </ul>
                            </div>
                        )}
                        <div className="mt-4 flex justify-end">
                            <Button type="button" size="sm" variant="secondary" disabled={!savedEditingProperty || isGeneratingAi} onClick={() => savedEditingProperty && fixPropertyWithAi(savedEditingProperty)}>
                                <Wand2 size={15} />{t('realty.ai.fixWithAi')}
                            </Button>
                        </div>
                    </div>
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
                                    onSelectAsset={(asset) => updatePropertyImage(index, asset.url || asset.downloadURL || imageUrl, {
                                        id: asset.id || `image-${index}`,
                                        url: asset.url || asset.downloadURL || imageUrl,
                                        storagePath: asset.storagePath || null,
                                        mediaType: asset.type?.startsWith('video/') ? 'video' : 'image',
                                        altText: asset.name || editingProperty.title || '',
                                        metadata: {
                                            source: 'image-picker',
                                            assetId: asset.id,
                                            fileName: asset.name,
                                            size: asset.size,
                                            type: asset.type,
                                        },
                                    })}
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

    const renderCampaignForm = () => {
        if (!editingCampaign) return null;
        const update = (patch: Partial<PropertyCampaign>) => setEditingCampaign(prev => ({ ...prev, ...patch }));
        const selectedProperty = displayProperties.find(property => property.id === editingCampaign.propertyId);
        const contentPreview = getCampaignPreview(parseCampaignContentInput(campaignContentInput));

        return (
            <div className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-q-text">{editingCampaign.id ? t('realty.campaigns.edit') : t('realty.campaigns.create')}</h3>
                        {selectedProperty && <p className="mt-1 text-sm text-q-text-secondary">{selectedProperty.title}</p>}
                    </div>
                    <button type="button" onClick={() => setEditingCampaign(null)} className="rounded-lg p-2 text-q-text-secondary hover:bg-q-surface-overlay hover:text-q-text"><X size={18} /></button>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                    <Field label={t('realty.selectProperty')}>
                        <DashboardSelect
                            value={editingCampaign.propertyId || ''}
                            onChange={value => update({ propertyId: value })}
                            options={displayProperties.map(property => ({ value: property.id, label: property.title }))}
                            placeholder={t('realty.selectProperty')}
                        />
                    </Field>
                    <Field label={t('realty.campaigns.type')}>
                        <DashboardSelect
                            value={editingCampaign.campaignType || 'just_listed'}
                            onChange={value => update({ campaignType: value as CampaignType })}
                            options={realtyCampaignTypes.map(type => ({ value: type, label: t(`realty.campaigns.types.${type}`) }))}
                        />
                    </Field>
                    <Field label={t('realty.form.title')}>
                        <Input value={editingCampaign.title || ''} onChange={event => update({ title: event.target.value })} />
                    </Field>
                    <Field label={t('realty.form.status')}>
                        <DashboardSelect
                            value={editingCampaign.status || 'draft'}
                            onChange={value => update({ status: value as RealtyCampaignStatus })}
                            options={realtyCampaignStatuses.map(status => ({ value: status, label: t(`realty.campaigns.status.${status}`) }))}
                        />
                    </Field>
                    <Field label={t('realty.campaigns.scheduledAt')}>
                        <Input
                            type="datetime-local"
                            value={toDatetimeLocalValue(editingCampaign.scheduledAt)}
                            onChange={event => update({ scheduledAt: fromDatetimeLocalValue(event.target.value) })}
                        />
                    </Field>
                    <Field label={t('realty.ai.prompt')}>
                        <Input value={campaignPrompt} onChange={event => setCampaignPrompt(event.target.value)} placeholder={t('realty.campaigns.aiDefaultPrompt')} />
                    </Field>
                    <Field className="md:col-span-2" label={t('realty.campaigns.content')}>
                        <textarea
                            rows={9}
                            className="w-full rounded-md border border-q-border bg-transparent px-3 py-2.5 font-mono text-xs text-q-text outline-none focus:border-q-accent"
                            value={campaignContentInput}
                            onChange={event => setCampaignContentInput(event.target.value)}
                            placeholder={t('realty.campaigns.contentPlaceholder')}
                        />
                    </Field>
                </div>
                {(contentPreview || campaignAiResult) && (
                    <div className="mt-5 rounded-lg border border-q-border bg-q-bg p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('realty.campaigns.preview')}</p>
                        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-q-text">{contentPreview || formatRealtyCampaignOutput(campaignAiResult?.output || {})}</p>
                    </div>
                )}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => setEditingCampaign(null)}>{t('common.cancel')}</Button>
                    <Button type="button" variant="secondary" onClick={() => copyCampaign()} disabled={!campaignContentInput.trim()}><Copy size={16} />{t('realty.campaigns.copy')}</Button>
                    <Button type="button" variant="secondary" onClick={generateCampaignAi} disabled={!editingCampaign.propertyId || isGeneratingCampaignAi}>
                        {isGeneratingCampaignAi ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {t('realty.campaigns.generateWithAi')}
                    </Button>
                    <Button type="button" onClick={saveCampaign} disabled={suite.isSaving}><Save size={16} />{t('realty.campaigns.save')}</Button>
                </div>
            </div>
        );
    };

    const renderOpenHouseForm = () => {
        if (!editingOpenHouse) return null;
        const update = (patch: Partial<PropertyOpenHouse>) => setEditingOpenHouse(prev => ({ ...prev, ...patch }));
        const metadata = editingOpenHouse.metadata || {};
        const capacity = typeof metadata.capacity === 'number' || typeof metadata.capacity === 'string' ? String(metadata.capacity) : '12';

        return (
            <div className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-q-text">{editingOpenHouse.id ? t('realty.openHouses.edit') : t('realty.openHouses.create')}</h3>
                    <button type="button" onClick={() => setEditingOpenHouse(null)} className="rounded-lg p-2 text-q-text-secondary hover:bg-q-surface-overlay hover:text-q-text"><X size={18} /></button>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                    <Field label={t('realty.selectProperty')}>
                        <DashboardSelect
                            value={editingOpenHouse.propertyId || ''}
                            onChange={value => update({ propertyId: value })}
                            options={displayProperties.map(property => ({ value: property.id, label: property.title }))}
                            placeholder={t('realty.selectProperty')}
                        />
                    </Field>
                    <Field label={t('realty.form.title')}>
                        <Input value={getOpenHouseTitle(editingOpenHouse)} onChange={event => update({ title: event.target.value, metadata: { ...metadata, title: event.target.value } })} />
                    </Field>
                    <Field label={t('realty.openHouses.startsAt')}>
                        <Input type="datetime-local" value={toDatetimeLocalValue(editingOpenHouse.startsAt)} onChange={event => update({ startsAt: fromDatetimeLocalValue(event.target.value) || new Date().toISOString() })} />
                    </Field>
                    <Field label={t('realty.openHouses.endsAt')}>
                        <Input type="datetime-local" value={toDatetimeLocalValue(editingOpenHouse.endsAt)} onChange={event => update({ endsAt: fromDatetimeLocalValue(event.target.value) })} />
                    </Field>
                    <Field label={t('realty.openHouses.timezone')}>
                        <Input value={editingOpenHouse.timezone || getLocalTimezone()} onChange={event => update({ timezone: event.target.value })} />
                    </Field>
                    <Field label={t('realty.openHouses.capacity')}>
                        <Input type="number" value={capacity} onChange={event => update({ metadata: { ...metadata, capacity: Number(event.target.value) || 0 } })} />
                    </Field>
                    <Field label={t('realty.form.status')}>
                        <DashboardSelect
                            value={editingOpenHouse.status || 'scheduled'}
                            onChange={value => update({ status: value as RealtyOpenHouseStatus })}
                            options={realtyOpenHouseStatuses.map(status => ({ value: status, label: t(`realty.openHouses.status.${status}`) }))}
                        />
                    </Field>
                    <label className="flex items-center gap-2 pt-6 text-sm font-medium text-q-text">
                        <input type="checkbox" checked={editingOpenHouse.registrationEnabled !== false} onChange={event => update({ registrationEnabled: event.target.checked })} />
                        {t('realty.openHouses.registrationEnabled')}
                    </label>
                    <Field className="md:col-span-2" label={t('realty.openHouses.notes')}>
                        <textarea rows={4} className="w-full rounded-md border border-q-border bg-transparent px-3 py-2.5 text-sm text-q-text outline-none focus:border-q-accent" value={editingOpenHouse.notes || ''} onChange={event => update({ notes: event.target.value })} />
                    </Field>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => setEditingOpenHouse(null)}>{t('common.cancel')}</Button>
                    <Button type="button" onClick={saveOpenHouse} disabled={suite.isSaving}><Save size={16} />{t('realty.openHouses.save')}</Button>
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
                            const score = propertyScores.get(property.id) || calculateRealtyListingScore(property);
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
                                                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getScoreToneClass(score)}`}>{t('realty.score.badge', { score: score.score })}</span>
                                                {property.isFeatured && <span className="rounded-full bg-q-accent/15 px-2 py-0.5 text-xs text-q-accent">{t('realty.website.featured')}</span>}
                                            </div>
                                            <p className="mt-1 text-sm text-q-text-secondary">{formatRealtyPrice(property.price, i18n.language, property.currency)} · {[property.address, property.city].filter(Boolean).join(', ')}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 md:justify-end">
                                            <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(property)}>{t('common.edit')}</Button>
                                            <Button type="button" size="sm" variant="secondary" onClick={() => fixPropertyWithAi(property)} disabled={isGeneratingAi}><Wand2 size={15} />{t('realty.ai.fixWithAi')}</Button>
                                            <Button type="button" size="sm" variant="secondary" onClick={() => suite.updatePropertyStatus(property.id, property.status === 'active' ? 'draft' : 'active')}>{property.status === 'active' ? t('realty.actions.unpublish') : t('realty.actions.publish')}</Button>
                                            <Button type="button" size="icon-sm" variant="ghost" onClick={() => suite.deleteProperty(property.id)}><Trash2 size={15} /></Button>
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
                        const propertyTitle = getLeadPropertyTitle(lead);
                        const isSuiteLead = suiteLeadIds.has(lead.id);
                        return (
                            <div key={lead.id} className="grid gap-4 border-b border-q-border p-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_13rem] md:items-start md:p-5">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-bold text-q-accent">{lead.name}</p>
                                    </div>
                                    <p className="mt-1 text-sm text-q-text-secondary">{lead.email} {lead.phone ? `· ${lead.phone}` : ''}</p>
                                    {propertyTitle && <p className="mt-1 text-xs text-q-text-secondary">{t('realty.leads.property')}: <span className="font-medium text-q-accent">{propertyTitle}</span></p>}
                                    {lead.message && <p className="mt-2 text-sm text-q-text">{lead.message}</p>}
                                </div>
                                <DashboardSelect
                                    className="w-full md:w-52"
                                    value={lead.status}
                                    onChange={value => {
                                        if (isSuiteLead) {
                                            void suite.updateLeadStatus(lead.id, value as LeadStatus);
                                        } else {
                                            void crm.updateLeadStatus(lead.id, value as LeadStatus);
                                        }
                                    }}
                                    options={realtyLeadStatuses.map(status => ({ value: status, label: t(`realty.leadStatus.${status}`) }))}
                                />
                            </div>
                        );
                    })}
                </div>
            );
        }

        if (activeTab === 'campaigns') {
            return (
                <div className="space-y-5">
                    {renderCampaignForm()}
                    <div className="flex justify-end"><Button type="button" onClick={startCreateCampaign}><Plus size={16} />{t('realty.campaigns.create')}</Button></div>
                    {suite.campaigns.length === 0 && !editingCampaign ? (
                        <EmptyPanel icon={Megaphone} title={t('realty.campaigns.emptyTitle')} description={t('realty.campaigns.emptyDescription')} />
                    ) : (
                        <div className="grid gap-5 md:grid-cols-2">
                            {suite.campaigns.map(campaign => {
                                const scheduledAt = campaign.scheduledAt ? new Date(campaign.scheduledAt) : null;
                                const scheduledLabel = scheduledAt && Number.isFinite(scheduledAt.getTime())
                                    ? scheduledAt.toLocaleString(i18n.language?.startsWith('en') ? 'en-US' : 'es-US', { dateStyle: 'medium', timeStyle: 'short' })
                                    : t('realty.campaigns.unscheduled');
                                const preview = getCampaignPreview(campaign.content);
                                return (
                                    <div key={campaign.id} className="rounded-xl border border-q-border bg-q-surface p-5 transition-colors hover:border-q-accent/40">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t(`realty.campaigns.types.${campaign.campaignType}`)}</p>
                                                <h3 className="mt-1 truncate text-lg font-bold text-q-accent">{campaign.title}</h3>
                                                <p className="mt-1 truncate text-sm text-q-text-secondary">{getPropertyTitle(campaign.propertyId)}</p>
                                            </div>
                                            <DashboardSelect
                                                className="w-36 shrink-0"
                                                value={campaign.status || 'draft'}
                                                onChange={value => void suite.updateCampaignStatus(campaign.id, value as RealtyCampaignStatus)}
                                                options={realtyCampaignStatuses.map(status => ({ value: status, label: t(`realty.campaigns.status.${status}`) }))}
                                            />
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <span className="rounded-full bg-q-surface-overlay px-2 py-1 text-xs text-q-text-secondary">{scheduledLabel}</span>
                                            {campaign.content && Object.keys(campaign.content).length > 0 && <span className="rounded-full bg-q-accent/10 px-2 py-1 text-xs text-q-accent">{t('realty.campaigns.hasContent')}</span>}
                                        </div>
                                        <p className="mt-4 min-h-12 line-clamp-3 text-sm leading-6 text-q-text-secondary">{preview || t('realty.campaigns.noContent')}</p>
                                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                                            <Button type="button" size="sm" variant="secondary" onClick={() => copyCampaign(campaign)} disabled={!preview}><Copy size={15} />{t('realty.campaigns.copy')}</Button>
                                            <Button type="button" size="sm" variant="secondary" onClick={() => startEditCampaign(campaign)}>{t('common.edit')}</Button>
                                            <Button type="button" size="icon-sm" variant="ghost" onClick={() => deleteCampaign(campaign.id)}><Trash2 size={15} /></Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        if (activeTab === 'openHouses') {
            return (
                <div className="space-y-5">
                    {renderOpenHouseForm()}
                    <div className="flex justify-end"><Button type="button" onClick={startCreateOpenHouse}><Plus size={16} />{t('realty.openHouses.create')}</Button></div>
                    {suite.openHouses.length === 0 && !editingOpenHouse ? (
                        <EmptyPanel icon={CalendarDays} title={t('realty.openHouses.emptyTitle')} description={t('realty.openHouses.emptyDescription')} />
                    ) : (
                        <div className="grid gap-5 md:grid-cols-2">
                            {suite.openHouses.map(openHouse => {
                                const startsAt = new Date(openHouse.startsAt);
                                const endsAt = openHouse.endsAt ? new Date(openHouse.endsAt) : null;
                                const startsLabel = Number.isFinite(startsAt.getTime())
                                    ? startsAt.toLocaleString(i18n.language?.startsWith('en') ? 'en-US' : 'es-US', { dateStyle: 'medium', timeStyle: 'short' })
                                    : openHouse.startsAt;
                                const endsLabel = endsAt && Number.isFinite(endsAt.getTime())
                                    ? endsAt.toLocaleTimeString(i18n.language?.startsWith('en') ? 'en-US' : 'es-US', { hour: 'numeric', minute: '2-digit' })
                                    : '';
                                return (
                                    <div key={openHouse.id} className="rounded-xl border border-q-border bg-q-surface p-5 transition-colors hover:border-q-accent/40">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <h3 className="truncate text-lg font-bold text-q-accent">{getOpenHouseTitle(openHouse)}</h3>
                                                <p className="mt-1 truncate text-sm text-q-text-secondary">{getPropertyTitle(openHouse.propertyId)}</p>
                                            </div>
                                            <DashboardSelect
                                                className="w-36 shrink-0"
                                                value={openHouse.status || 'scheduled'}
                                                onChange={value => void suite.updateOpenHouseStatus(openHouse.id, value as RealtyOpenHouseStatus)}
                                                options={realtyOpenHouseStatuses.map(status => ({ value: status, label: t(`realty.openHouses.status.${status}`) }))}
                                            />
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <span className="rounded-full bg-q-surface-overlay px-2 py-1 text-xs text-q-text-secondary">{endsLabel ? `${startsLabel} - ${endsLabel}` : startsLabel}</span>
                                            <span className={`rounded-full px-2 py-1 text-xs ${openHouse.registrationEnabled ? 'bg-q-success/10 text-q-success' : 'bg-q-surface-overlay text-q-text-secondary'}`}>
                                                {openHouse.registrationEnabled ? t('realty.openHouses.registrationOn') : t('realty.openHouses.registrationOff')}
                                            </span>
                                        </div>
                                        {openHouse.notes && <p className="mt-4 line-clamp-3 text-sm leading-6 text-q-text-secondary">{openHouse.notes}</p>}
                                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                                            <Button type="button" size="sm" variant="secondary" onClick={() => startEditOpenHouse(openHouse)}>{t('common.edit')}</Button>
                                            <Button type="button" size="icon-sm" variant="ghost" onClick={() => deleteOpenHouse(openHouse.id)}><Trash2 size={15} /></Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        if (activeTab === 'ai') {
            const aiOutputText = aiResult ? formatRealtyAiListingOutput(aiResult.output) : latestSavedGeneration;
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
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                                <Field label={t('realty.ai.tone')}>
                                    <DashboardSelect
                                        value={aiTone}
                                        onChange={value => setAiTone(value as RealtyAiTone)}
                                        options={REALTY_AI_TONES.map(tone => ({ value: tone, label: t(`realty.ai.tones.${tone}`) }))}
                                    />
                                </Field>
                                <Field label={t('realty.ai.language')}>
                                    <DashboardSelect
                                        value={aiLanguage}
                                        onChange={value => setAiLanguage(value as RealtyAiLanguage)}
                                        options={[
                                            { value: 'es', label: t('realty.ai.languages.es') },
                                            { value: 'en', label: t('realty.ai.languages.en') },
                                        ]}
                                    />
                                </Field>
                            </div>
                            <Field label={t('realty.ai.model')}>
                                <DashboardSelect
                                    value={aiModel}
                                    onChange={setAiModel}
                                    options={REALTY_AI_MODELS.map(model => ({ value: model.value, label: model.label }))}
                                />
                            </Field>
                            <Field label={t('realty.ai.prompt')}>
                                <textarea rows={5} className="w-full rounded-md border border-q-border bg-transparent px-3 py-2.5 text-sm text-q-text outline-none focus:border-q-accent" value={aiPrompt} onChange={event => setAiPrompt(event.target.value)} placeholder={t('realty.ai.defaultPrompt')} />
                            </Field>
                            {selectedAiScore && (
                                <div className="rounded-lg border border-q-border bg-q-bg p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-semibold text-q-text">{t('realty.score.title')}</span>
                                        <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${getScoreToneClass(selectedAiScore)}`}>{selectedAiScore.score}%</span>
                                    </div>
                                    {selectedAiScore.recommendations.length > 0 && (
                                        <ul className="mt-3 space-y-1 text-xs text-q-text-secondary">
                                            {selectedAiScore.recommendations.slice(0, 3).map(item => <li key={item}>• {translateRecommendation(item)}</li>)}
                                        </ul>
                                    )}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                <Button type="button" onClick={() => generateAiCopy('full')} disabled={!selectedAiProperty || isGeneratingAi}>
                                    {isGeneratingAi ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                    {t('realty.ai.generate')}
                                </Button>
                                <Button type="button" variant="secondary" onClick={() => generateAiCopy('fix')} disabled={!selectedAiProperty || isGeneratingAi}>
                                    <Wand2 size={16} />{t('realty.ai.fixWithAi')}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-q-text">{t('realty.ai.output')}</h3>
                                {aiResult && <p className="mt-1 text-xs text-q-text-secondary">{t('realty.ai.generatedWith', { model: aiResult.model })}</p>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button type="button" size="sm" variant="secondary" onClick={copyAiOutput} disabled={!aiResult}><Copy size={15} />{t('realty.ai.copyOutput')}</Button>
                                <Button type="button" size="sm" variant="secondary" onClick={saveAiGeneration} disabled={!aiResult || isSavingAiGeneration}>
                                    {isSavingAiGeneration ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                    {t('realty.ai.saveGeneration')}
                                </Button>
                                <Button type="button" size="sm" onClick={applyAiContentToProperty} disabled={!aiResult || suite.isSaving}><Check size={15} />{t('realty.ai.applyToProperty')}</Button>
                            </div>
                        </div>
                        {lastAiSavedAt && <p className="mt-3 text-xs text-q-success">{t('realty.ai.saved')}</p>}
                        <div className="mt-5 min-h-64 whitespace-pre-wrap rounded-lg border border-q-border bg-q-bg p-4 text-sm leading-6 text-q-text">
                            {aiOutputText || t('realty.ai.empty')}
                        </div>
                        {aiResult && aiResult.generatedFields.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {aiResult.generatedFields.map(field => <span key={field} className="rounded-full bg-q-accent/10 px-2 py-1 text-xs text-q-accent">{t(`realty.ai.fields.${field}`, field)}</span>)}
                            </div>
                        )}
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
                    <StatCard icon={Sparkles} label={t('realty.metrics.qualityScore')} value={`${averageListingScore}%`} />
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
                            {displayLeads.slice(0, 4).map(lead => <div key={lead.id} className="rounded-lg border border-q-border p-4"><p className="min-w-0 truncate text-sm font-medium text-q-accent">{lead.name}</p><p className="mt-1 truncate text-xs text-q-text-secondary">{lead.email}</p></div>)}
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
                    {localWarning && (
                        <div className="mb-4 rounded-lg border border-q-warning/30 bg-q-warning/10 p-3 text-sm text-q-warning">{localWarning}</div>
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
