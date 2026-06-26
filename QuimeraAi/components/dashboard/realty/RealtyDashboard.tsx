import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import {
    AlertCircle,
    BarChart3,
    Bath,
    BedDouble,
    Building2,
    CalendarDays,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    Eye,
    FileText,
    Home,
    ImageIcon,
    Link,
    ListChecks,
    Loader2,
    Mail,
    MapPin,
    Megaphone,
    Menu,
    MessageSquare,
    Plus,
    RefreshCw,
    Ruler,
    Save,
    Search,
    Settings,
    ShieldCheck,
    Sparkles,
    Trash2,
    Users,
    Wand2,
    Workflow,
    X,
} from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import HeaderBackButton from '../../ui/HeaderBackButton';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import ImagePicker from '../../ui/ImagePicker';
import DashboardSelect from '../../ui/DashboardSelect';
import RealtyEngineControlPanel from './RealtyEngineControlPanel';
import RealtyModuleSettingsPanel from './RealtyModuleSettingsPanel';
import RealtyWorkspaceOverview from './RealtyWorkspaceOverview';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useUI } from '../../../contexts/core/UIContext';
import { useCRM } from '../../../contexts/crm/CRMContext';
import { useProject } from '../../../contexts/project';
import { useSafeTenant } from '../../../contexts/tenant';
import { useRealtyAccess } from '../../../hooks/realty/useRealtyAccess';
import { useRealtySuite } from '../../../hooks/realty/useRealtySuite';
import { supabase } from '../../../supabase';
import type { BusinessBlueprint, CrossModuleSyncStatus } from '../../../types/businessBlueprint';
import type {
    CampaignType,
    PropertyCampaign,
    PropertyOpenHouse,
    LeadStage,
    RealtyAiLanguage,
    RealtyCampaignAiOutput,
    RealtyCampaignStatus,
    RealtyAiListingOutput,
    RealtyAiTone,
    RealtyExternalListingDraft,
    RealtyImage,
    RealtyImportSource,
    RealtyImportSyncMode,
    RealtyLead,
    RealtyListingScore,
    RealtyOpenHouseStatus,
    RealtyProperty,
    RealtyPropertyStatus,
    RealtyPropertyType,
    TransactionType,
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
import { createRealtyEnginePlan } from '../../../utils/realtyEngine';
import {
    buildRealtyImportReviewMetadata,
    canPublishRealtyImportProperty,
    getRealtyImportDuplicateReviewStatus,
    getRealtyImportReviewMetadata,
    getRealtyImportReviewStatus,
    isRealtyImportReviewProperty,
    prepareRealtyImportReviewDrafts,
    REALTY_IMPORT_SOURCES,
    REALTY_IMPORT_STAGING_SOURCE,
} from '../../../utils/realtyImport';
import {
    applyCrossModuleSync,
    previewCrossModuleSync,
    type CrossModuleSyncResult,
} from '../../../utils/businessBlueprint/crossModuleSync';
import {
    buildRealtyMonetizationOfferDrafts,
} from '../../../utils/realtyMonetization';
import {
    applyRealtyBlueprintDraft,
    previewRealtyBlueprintSync,
    REALTY_BLUEPRINT_SOURCE,
    type RealtyBlueprintSyncResult,
} from '../../../services/realty/realtyBlueprintService';
import { mapRealtyStageToCrmStatus, type RealtyLeadPipelineEventType } from '../../../services/realty/realtyLeadPipelineService';
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
import { buildEmailReviewQueueUrl } from '../../../services/email/emailReviewQueueLinkService.ts';

type RealtyTab = 'engine' | 'overview' | 'properties' | 'leads' | 'campaigns' | 'openHouses' | 'ai' | 'settings';
type RealtyTabArea = 'workspace' | 'control';

interface RealtyTabItem {
    id: RealtyTab;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    visible: boolean;
    area: RealtyTabArea;
}

const emptyProperty = (projectId: string, tenantId?: string | null, userId?: string | null): Partial<RealtyProperty> => ({
    projectId,
    tenantId,
    createdBy: userId,
    title: '',
    slug: '',
    description: '',
    descriptionShort: '',
    descriptionLong: '',
    price: 0,
    currency: 'USD',
    transactionType: 'sale',
    address: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: 'US',
    zipCode: '',
    postalCode: '',
    propertyType: 'house',
    status: 'draft',
    bedrooms: 3,
    bathrooms: 2,
    halfBathrooms: 0,
    area: 1500,
    areaUnit: 'sqft',
    lotSize: undefined,
    lotSqft: undefined,
    parkingSpaces: 0,
    yearBuilt: undefined,
    hoaFee: undefined,
    taxes: undefined,
    amenities: [],
    features: [],
    highlights: [],
    images: [],
    videoUrl: '',
    virtualTourUrl: '',
    seoTitle: '',
    seoDescription: '',
    isFeatured: false,
    publicEnabled: false,
    metadata: {},
});

const parseLines = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean);
const parseUniqueLines = (value: string) => {
    const seen = new Set<string>();
    return parseLines(value).filter(item => {
        const key = item.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};
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
const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const getProjectBusinessBlueprint = (project: { businessBlueprint?: BusinessBlueprint; data?: unknown } | null | undefined): BusinessBlueprint | null => {
    if (project?.businessBlueprint) return project.businessBlueprint;
    return isPlainRecord(project?.data) && project.data.businessBlueprint
        ? project.data.businessBlueprint as BusinessBlueprint
        : null;
};
const getMetadataText = (metadata: unknown, key: string) =>
    isPlainRecord(metadata) && typeof metadata[key] === 'string' ? metadata[key] : '';
const getMetadataNumber = (metadata: unknown, key: string) =>
    isPlainRecord(metadata) && typeof metadata[key] === 'number' ? metadata[key] : 0;
const formatCrossModuleSyncError = (result: CrossModuleSyncResult): string | null =>
    result.errors.length > 0 ? result.errors.join(' ') : null;
const buildRealtyImportPropertyDraft = (draft: RealtyExternalListingDraft, importedAt: string, sourceId?: string): Partial<RealtyProperty> => {
    const importMetadata = isPlainRecord(draft.metadata?.import) ? draft.metadata.import : {};
    return {
        ...draft,
        id: undefined,
        status: 'draft',
        publicEnabled: false,
        isFeatured: false,
        metadata: {
            ...(isPlainRecord(draft.metadata) ? draft.metadata : {}),
            source: REALTY_IMPORT_STAGING_SOURCE,
            import: {
                ...importMetadata,
                sourceType: draft.sourceType,
                sourceName: draft.sourceName || '',
                sourceUrl: draft.sourceUrl || '',
                sourceId: sourceId || '',
                externalId: draft.externalId || '',
                importJobId: draft.importJobId || '',
                syncKey: draft.syncKey,
                importReviewStatus: draft.importReviewStatus,
                duplicateReviewStatus: draft.duplicateReviewStatus,
                duplicateMatches: draft.duplicateMatches,
                reviewWarnings: draft.reviewWarnings,
                sourceMap: draft.sourceMap,
                needsReview: true,
                noAutoPublish: true,
                importedAt,
            },
        },
    };
};
const stringifyFaqInput = (metadata: unknown) => {
    if (!isPlainRecord(metadata) || !Array.isArray(metadata.faq) || metadata.faq.length === 0) return '';
    return JSON.stringify(metadata.faq, null, 2);
};
const parseOptionalNumber = (value: string): number | undefined => {
    if (value.trim() === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};
const getPropertyLocation = (property: Partial<RealtyProperty>) =>
    [property.addressLine1 || property.address, property.city, property.state].filter(Boolean).join(', ');

const EngineMetric = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) => (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-q-border bg-q-bg p-3">
        <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{label}</p>
            <p className="mt-1 text-xl font-bold text-q-text">{value}</p>
        </div>
        <Icon size={18} className="shrink-0 text-q-accent" />
    </div>
);

const RealtyDashboard: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { setView } = useUI();
    const { activeProjectId, activeProject, loadProject } = useProject();
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
    const [featuresInput, setFeaturesInput] = useState('');
    const [highlightsInput, setHighlightsInput] = useState('');
    const [faqInput, setFaqInput] = useState('');
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
    const [realtyDraftSyncResult, setRealtyDraftSyncResult] = useState<RealtyBlueprintSyncResult | null>(null);
    const [realtyDraftSyncStatus, setRealtyDraftSyncStatus] = useState<'not_started' | 'previewed' | 'synced_draft' | null>(null);
    const [realtyDraftSyncAction, setRealtyDraftSyncAction] = useState<'preview' | 'create' | null>(null);
    const [realtyDraftSyncError, setRealtyDraftSyncError] = useState<string | null>(null);
    const [engineSyncResult, setEngineSyncResult] = useState<CrossModuleSyncResult | null>(null);
    const [engineSyncStatus, setEngineSyncStatus] = useState<CrossModuleSyncStatus | null>(null);
    const [engineSyncAction, setEngineSyncAction] = useState<'preview' | 'create' | null>(null);
    const [engineSyncError, setEngineSyncError] = useState<string | null>(null);
    const [offerSyncResult, setOfferSyncResult] = useState<CrossModuleSyncResult | null>(null);
    const [offerSyncStatus, setOfferSyncStatus] = useState<CrossModuleSyncStatus | null>(null);
    const [offerSyncAction, setOfferSyncAction] = useState<'preview' | 'create' | null>(null);
    const [offerSyncError, setOfferSyncError] = useState<string | null>(null);
    const [importSourceId, setImportSourceId] = useState('');
    const [importSourceType, setImportSourceType] = useState<RealtyImportSource>('csv');
    const [importSourceName, setImportSourceName] = useState('');
    const [importProviderName, setImportProviderName] = useState('');
    const [importFeedUrl, setImportFeedUrl] = useState('');
    const [importSyncMode, setImportSyncMode] = useState<RealtyImportSyncMode>('manual');
    const [importPayload, setImportPayload] = useState('');
    const [importDrafts, setImportDrafts] = useState<RealtyExternalListingDraft[]>([]);
    const [importStatus, setImportStatus] = useState<'not_started' | 'previewed' | 'synced_draft' | null>(null);
    const [importAction, setImportAction] = useState<'saveSource' | 'preview' | 'create' | null>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [importCreatedCount, setImportCreatedCount] = useState(0);
    const [localError, setLocalError] = useState<string | null>(null);
    const [localWarning, setLocalWarning] = useState<string | null>(null);

    const canAccessRealtyControl = access.isAdmin;
    const tabs = useMemo<RealtyTabItem[]>(() => {
        const items: RealtyTabItem[] = [
            { id: 'overview', label: t('realty.tabs.overview'), icon: BarChart3, visible: access.canView, area: 'workspace' },
            { id: 'properties', label: t('realty.tabs.properties'), icon: Building2, visible: access.canManageProperties, area: 'workspace' },
            { id: 'leads', label: t('realty.tabs.leads'), icon: Users, visible: access.canManageLeads, area: 'workspace' },
            { id: 'campaigns', label: t('realty.tabs.campaigns'), icon: Megaphone, visible: access.canManageProperties || access.canManage, area: 'workspace' },
            { id: 'openHouses', label: t('realty.tabs.openHouses'), icon: CalendarDays, visible: access.canManageProperties || access.canManage, area: 'workspace' },
            { id: 'ai', label: t('realty.tabs.ai'), icon: Sparkles, visible: access.canUseAi, area: 'workspace' },
            { id: 'engine', label: t('realty.tabs.engine'), icon: Workflow, visible: canAccessRealtyControl, area: 'control' },
            { id: 'settings', label: t('realty.tabs.settings'), icon: Settings, visible: canAccessRealtyControl, area: 'control' },
        ];
        return items.filter(item => item.visible);
    }, [access.canManage, access.canManageLeads, access.canManageProperties, access.canUseAi, access.canView, canAccessRealtyControl, t]);
    const tabsByArea = useMemo(() => ({
        workspace: tabs.filter(item => item.area === 'workspace'),
        control: tabs.filter(item => item.area === 'control'),
    }), [tabs]);
    const activeArea: RealtyTabArea = tabs.find(item => item.id === activeTab)?.area || 'workspace';

    useEffect(() => {
        if (tabs.length === 0) return;
        if (!tabs.some(item => item.id === activeTab)) {
            setActiveTab(tabs[0].id);
        }
    }, [activeTab, tabs]);
    const importSourceOptions = useMemo(
        () => REALTY_IMPORT_SOURCES.map(source => ({
            value: source,
            label: t(`realty.engine.import.sources.${source}`, source),
        })),
        [t]
    );
    const savedImportSourceOptions = useMemo(
        () => [
            { value: '', label: t('realty.engine.import.newSource') },
            ...suite.importSources.map(source => ({
                value: source.id,
                label: `${source.name} · ${t(`realty.engine.import.sources.${source.sourceType}`, source.sourceType)}`,
            })),
        ],
        [suite.importSources, t]
    );
    const importSyncModeOptions = useMemo(
        () => (['manual', 'scheduled', 'webhook', 'disabled'] as RealtyImportSyncMode[]).map(mode => ({
            value: mode,
            label: t(`realty.engine.import.syncModes.${mode}`, mode),
        })),
        [t]
    );
    const selectedImportSource = useMemo(
        () => suite.importSources.find(source => source.id === importSourceId) || null,
        [importSourceId, suite.importSources]
    );

    useEffect(() => {
        if (!selectedImportSource) return;
        setImportSourceType(selectedImportSource.sourceType);
        setImportSourceName(selectedImportSource.name || '');
        setImportProviderName(selectedImportSource.providerName || '');
        setImportFeedUrl(selectedImportSource.feedUrl || '');
        setImportSyncMode(selectedImportSource.syncMode || 'manual');
    }, [selectedImportSource]);

    const displayProperties = suite.properties;
    const importedReviewProperties = useMemo(
        () => displayProperties.filter(isRealtyImportReviewProperty),
        [displayProperties]
    );
    const importedNeedsReviewProperties = useMemo(
        () => importedReviewProperties.filter(property => getRealtyImportReviewStatus(property) === 'needs_review'),
        [importedReviewProperties]
    );
    const importedApprovedProperties = useMemo(
        () => importedReviewProperties.filter(property => getRealtyImportReviewStatus(property) === 'approved'),
        [importedReviewProperties]
    );
    const businessBlueprint = getProjectBusinessBlueprint(activeProject);
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
    const enginePlan = useMemo(() => createRealtyEnginePlan({
        businessBlueprint,
        flags: suite.flags,
        properties: displayProperties,
        leads: displayLeads,
        campaigns: suite.campaigns,
        openHouses: suite.openHouses,
        aiGenerations: suite.aiGenerations,
    }), [businessBlueprint, displayLeads, displayProperties, suite.aiGenerations, suite.campaigns, suite.flags, suite.openHouses]);
    const realtyOfferDrafts = useMemo(
        () => buildRealtyMonetizationOfferDrafts(businessBlueprint),
        [businessBlueprint]
    );

    const getLeadPropertyTitle = (lead: RealtyLead) => {
        const metadataTitle = typeof lead.metadata?.propertyTitle === 'string' ? lead.metadata.propertyTitle : '';
        return metadataTitle || (lead.propertyId ? propertyTitleById.get(lead.propertyId) : '') || '';
    };

    const getLeadPipelineEventType = (lead: RealtyLead): RealtyLeadPipelineEventType => {
        const metadata = isPlainRecord(lead.metadata) ? lead.metadata : {};
        const eventType = typeof metadata.pipelineEventType === 'string' ? metadata.pipelineEventType : '';
        if (eventType === 'showing_request' || eventType === 'open_house_registration' || eventType === 'property_inquiry') {
            return eventType;
        }
        if (isPlainRecord(metadata.showingRequest) || metadata.leadSourceDetail === 'showing_request') return 'showing_request';
        if (isPlainRecord(metadata.openHouse) || metadata.openHouseId || metadata.leadSourceDetail === 'open_house_registration') return 'open_house_registration';
        return 'property_inquiry';
    };

    const getLeadSourceToneClass = (eventType: RealtyLeadPipelineEventType) => {
        if (eventType === 'showing_request') return 'border-q-warning/30 bg-q-warning/10 text-q-warning';
        if (eventType === 'open_house_registration') return 'border-q-success/30 bg-q-success/10 text-q-success';
        return 'border-q-accent/30 bg-q-accent/10 text-q-accent';
    };

    const getLeadPipelineTags = (lead: RealtyLead) => {
        const metadata = isPlainRecord(lead.metadata) ? lead.metadata : {};
        const tags = Array.isArray(metadata.leadTags)
            ? metadata.leadTags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
            : [];
        return tags.slice(0, 5);
    };

    const getLeadDraftEventCount = (lead: RealtyLead) => {
        const metadata = isPlainRecord(lead.metadata) ? lead.metadata : {};
        return ['timelineEvents', 'emailEvents', 'analyticsEvents']
            .reduce((total, key) => total + (Array.isArray(metadata[key]) ? metadata[key].length : 0), 0);
    };

    const getLeadEmailReviewEntityId = (lead: RealtyLead) => {
        const metadata = isPlainRecord(lead.metadata) ? lead.metadata : {};
        if (typeof metadata.idempotencyKey === 'string' && metadata.idempotencyKey.trim()) return metadata.idempotencyKey;
        const emailEvent = Array.isArray(metadata.emailEvents)
            ? metadata.emailEvents.find((event): event is Record<string, unknown> => isPlainRecord(event))
            : null;
        const emailMetadata = isPlainRecord(emailEvent?.metadata) ? emailEvent.metadata : {};
        return typeof emailMetadata.sourceEntityId === 'string' && emailMetadata.sourceEntityId.trim()
            ? emailMetadata.sourceEntityId
            : lead.id;
    };

    const getLeadEmailReviewUrl = (lead: RealtyLead) => buildEmailReviewQueueUrl({
        projectId: lead.projectId || activeProjectId,
        sourceModule: 'realty',
        sourceEntityType: 'property_lead',
        sourceEntityId: getLeadEmailReviewEntityId(lead),
    });

    const hasLeadCrmSync = (lead: RealtyLead) =>
        Boolean(lead.crmLeadId || (isPlainRecord(lead.metadata) && typeof lead.metadata.sourceLeadId === 'string' && lead.metadata.sourceLeadId));

    const updateDisplayLeadStatus = (lead: RealtyLead, status: LeadStage, isSuiteLead: boolean) => {
        if (isSuiteLead) {
            void suite.updateLeadStatus(lead.id, status);
            return;
        }
        void crm.updateLeadStatus(lead.id, mapRealtyStageToCrmStatus(status));
    };

    const displayShowingRequests = displayLeads.filter(lead => getLeadPipelineEventType(lead) === 'showing_request');

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
    const openEngineModule = (moduleId: string) => {
        if (moduleId === 'website-builder') setView('editor');
        if (moduleId === 'crm-leads') setView('leads');
        if (moduleId === 'campaign-automation') setActiveTab('campaigns');
        if (moduleId === 'appointments-open-houses') setActiveTab('openHouses');
        if (moduleId === 'commerce-finance') setView('ecommerce');
        if (moduleId === 'business-blueprint') setActiveTab('ai');
    };

    const buildRealtyDraftSyncInput = (dryRun: boolean) => {
        if (!activeProject || !businessBlueprint?.realEstateBlueprint) {
            throw new Error(t('realty.engine.realtyDraftSyncMissingBlueprint'));
        }

        const currentUserId = user?.id || activeProject.userId || '';
        if (!currentUserId) {
            throw new Error(t('realty.engine.realtyDraftSyncMissingUser'));
        }

        return {
            projectId: activeProject.id,
            tenantId: currentTenantId,
            userId: currentUserId,
            blueprint: businessBlueprint.realEstateBlueprint,
            existing: {
                properties: displayProperties.map(property => ({
                    id: property.id,
                    slug: property.slug,
                    title: property.title,
                    metadata: property.metadata,
                })),
                campaigns: suite.campaigns.map(campaign => ({
                    id: campaign.id,
                    title: campaign.title,
                    campaignType: campaign.campaignType,
                    metadata: campaign.metadata,
                })),
                openHouses: suite.openHouses.map(openHouse => ({
                    id: openHouse.id,
                    title: openHouse.title,
                    metadata: openHouse.metadata,
                })),
            },
            options: {
                dryRun,
                overwriteExisting: false,
            },
        };
    };

    const persistRealtyModuleDraftSync = async (
        result: RealtyBlueprintSyncResult,
        refs: { propertyIds: string[]; campaignIds: string[] }
    ) => {
        if (!activeProject) throw new Error(t('realty.engine.realtyDraftSyncMissingBlueprint'));

        const now = new Date().toISOString();
        const existingData: Record<string, unknown> = isPlainRecord(activeProject.data) ? activeProject.data : {};
        const previousRealtyModule: Record<string, unknown> = isPlainRecord(existingData.realtyModule) ? existingData.realtyModule : {};
        const previousFlags = isPlainRecord(previousRealtyModule.flags) ? previousRealtyModule.flags : {};
        const nextRealtimeModuleDraft = result.websiteDataDraft?.realtyModule;
        const nextRealtyModule = {
            ...previousRealtyModule,
            ...(nextRealtimeModuleDraft || {}),
            flags: {
                ...previousFlags,
                ...(nextRealtimeModuleDraft?.flags || {}),
            },
            agentProfileDraft: result.agentProfileDraft || previousRealtyModule.agentProfileDraft,
            brokerageProfileDraft: result.brokerageProfileDraft || previousRealtyModule.brokerageProfileDraft,
            openHouseDrafts: result.openHouseDrafts,
            blueprintDraftSync: {
                status: 'synced_draft',
                source: REALTY_BLUEPRINT_SOURCE,
                syncedAt: now,
                summary: {
                    ...result.summary,
                    createdPropertyIds: refs.propertyIds,
                    createdCampaignIds: refs.campaignIds,
                },
                skippedItems: result.skippedItems,
                warnings: result.warnings,
            },
        };
        const nextData = {
            ...existingData,
            realtyModule: nextRealtyModule,
            lastUpdated: now,
        };

        const { error: updateError } = await supabase
            .from('projects')
            .update({
                data: nextData,
                last_updated: now,
            })
            .eq('id', activeProject.id);

        if (updateError) throw updateError;

        await loadProject(activeProject.id, false, false);
    };

    const previewRealtyBlueprintDrafts = () => {
        setRealtyDraftSyncAction('preview');
        setRealtyDraftSyncError(null);
        try {
            const previewResult = previewRealtyBlueprintSync(buildRealtyDraftSyncInput(true));
            setRealtyDraftSyncResult(previewResult);
            setRealtyDraftSyncStatus('previewed');
        } catch (err) {
            setRealtyDraftSyncError(err instanceof Error ? err.message : String(err));
        } finally {
            setRealtyDraftSyncAction(null);
        }
    };

    const createRealtyBlueprintDrafts = async () => {
        setRealtyDraftSyncAction('create');
        setRealtyDraftSyncError(null);
        try {
            const applyResult = applyRealtyBlueprintDraft(buildRealtyDraftSyncInput(false));
            const propertyIds: string[] = [];
            const campaignIds: string[] = [];

            for (const propertyDraft of applyResult.propertyDrafts) {
                const savedId = await suite.saveProperty(propertyDraft);
                if (savedId) propertyIds.push(savedId);
            }

            const campaignPropertyId = propertyIds[0] || displayProperties[0]?.id || '';
            if (campaignPropertyId) {
                for (const campaignDraft of applyResult.campaignDrafts) {
                    const savedCampaignId = await suite.saveCampaign({
                        ...campaignDraft,
                        propertyId: campaignPropertyId,
                    });
                    if (savedCampaignId) campaignIds.push(savedCampaignId);
                }
            }

            await persistRealtyModuleDraftSync(applyResult, { propertyIds, campaignIds });
            await suite.refetch();
            setRealtyDraftSyncResult(applyResult);
            setRealtyDraftSyncStatus('synced_draft');
        } catch (err) {
            setRealtyDraftSyncError(err instanceof Error ? err.message : String(err));
        } finally {
            setRealtyDraftSyncAction(null);
        }
    };

    const parseRealtyImportRows = () => {
        const trimmed = importPayload.trim();
        if (!trimmed) throw new Error(t('realty.engine.import.errors.emptyPayload'));

        try {
            const parsed = JSON.parse(trimmed);
            const candidates = Array.isArray(parsed)
                ? parsed
                : Array.isArray(parsed?.listings)
                    ? parsed.listings
                    : Array.isArray(parsed?.properties)
                        ? parsed.properties
                        : [parsed];
            const rows = candidates.filter(isPlainRecord);
            if (rows.length === 0) throw new Error(t('realty.engine.import.errors.emptyRows'));
            return rows;
        } catch (jsonError) {
            const csvResult = Papa.parse<Record<string, unknown>>(trimmed, {
                header: true,
                skipEmptyLines: true,
            });
            const rows = (csvResult.data || [])
                .filter(isPlainRecord)
                .filter(row => Object.values(row).some(value => String(value ?? '').trim()));

            if (rows.length === 0) {
                if (csvResult.errors.length > 0) throw new Error(t('realty.engine.import.errors.parseError'));
                throw jsonError instanceof Error ? jsonError : new Error(t('realty.engine.import.errors.parseError'));
            }

            return rows;
        }
    };

    const prepareImportDraftsFromPayload = () => {
        if (!activeProjectId) throw new Error(t('realty.engine.import.errors.missingProject'));
        const rows = parseRealtyImportRows();
        return prepareRealtyImportReviewDrafts(rows, {
            projectId: activeProjectId,
            tenantId: currentTenantId,
            userId: user?.id || null,
            sourceType: importSourceType,
            sourceName: importSourceName.trim() || t(`realty.engine.import.sources.${importSourceType}`, importSourceType),
            sourceUrl: importFeedUrl.trim() || undefined,
        }, displayProperties);
    };

    const previewRealtyImportDrafts = () => {
        setImportAction('preview');
        setImportError(null);
        try {
            const drafts = prepareImportDraftsFromPayload();
            setImportDrafts(drafts);
            setImportStatus('previewed');
            setImportCreatedCount(0);
        } catch (err) {
            setImportError(err instanceof Error ? err.message : String(err));
        } finally {
            setImportAction(null);
        }
    };

    const resetRealtyImportSourceConfig = () => {
        setImportSourceId('');
        setImportSourceType('csv');
        setImportSourceName('');
        setImportProviderName('');
        setImportFeedUrl('');
        setImportSyncMode('manual');
    };

    const saveRealtyImportSourceConfig = async () => {
        setImportAction('saveSource');
        setImportError(null);
        try {
            if (!activeProjectId) throw new Error(t('realty.engine.import.errors.missingProject'));
            if (!user?.id) throw new Error(t('realty.engine.import.errors.missingUser'));

            const savedId = await suite.saveImportSource({
                id: importSourceId || undefined,
                projectId: activeProjectId,
                tenantId: currentTenantId,
                userId: user.id,
                sourceType: importSourceType,
                name: importSourceName.trim() || t(`realty.engine.import.sources.${importSourceType}`, importSourceType),
                providerName: importProviderName.trim(),
                feedUrl: importFeedUrl.trim(),
                syncMode: importSyncMode,
                enabled: false,
                status: importSyncMode === 'disabled' ? 'disabled' : 'needs_review',
                metadata: {
                    noRuntimeSync: true,
                    noAutoPublish: true,
                    configuredFrom: 'realty-dashboard-import-staging',
                },
            });
            if (savedId) setImportSourceId(savedId);
            setLocalWarning(t('realty.engine.import.sourceSaved'));
        } catch (err) {
            setImportError(err instanceof Error ? err.message : String(err));
        } finally {
            setImportAction(null);
        }
    };

    const persistRealtyImportStaging = async (
        drafts: RealtyExternalListingDraft[],
        createdPropertyIds: string[],
        jobId?: string
    ) => {
        if (!activeProject) throw new Error(t('realty.engine.import.errors.missingProject'));

        const now = new Date().toISOString();
        const existingData: Record<string, unknown> = isPlainRecord(activeProject.data) ? activeProject.data : {};
        const previousRealtyModule: Record<string, unknown> = isPlainRecord(existingData.realtyModule) ? existingData.realtyModule : {};
        const previousFlags = isPlainRecord(previousRealtyModule.flags) ? previousRealtyModule.flags : {};
        const duplicateCount = drafts.filter(draft => draft.duplicateReviewStatus === 'possible_duplicate').length;
        const warningCount = drafts.filter(draft => draft.reviewWarnings.length > 0).length;
        const nextData = {
            ...existingData,
            realtyModule: {
                ...previousRealtyModule,
                flags: previousFlags,
                importStaging: {
                    status: 'synced_draft',
                    source: REALTY_IMPORT_STAGING_SOURCE,
                    sourceId: importSourceId || '',
                    sourceType: importSourceType,
                    sourceName: importSourceName.trim(),
                    providerName: importProviderName.trim(),
                    feedUrl: importFeedUrl.trim(),
                    syncMode: importSyncMode,
                    jobId: jobId || '',
                    syncedAt: now,
                    summary: {
                        totalRows: drafts.length,
                        createdDrafts: createdPropertyIds.length,
                        duplicateCount,
                        warningCount,
                        createdPropertyIds,
                    },
                    warnings: Array.from(new Set(drafts.flatMap(draft => draft.reviewWarnings))),
                },
            },
            lastUpdated: now,
        };

        const { error: updateError } = await supabase
            .from('projects')
            .update({
                data: nextData,
                last_updated: now,
            })
            .eq('id', activeProject.id);

        if (updateError) throw updateError;

        await loadProject(activeProject.id, false, false);
    };

    const createRealtyImportDrafts = async () => {
        setImportAction('create');
        setImportError(null);
        try {
            if (!activeProjectId) throw new Error(t('realty.engine.import.errors.missingProject'));
            if (!user?.id) throw new Error(t('realty.engine.import.errors.missingUser'));

            const drafts = importDrafts.length > 0 ? importDrafts : prepareImportDraftsFromPayload();
            const importedAt = new Date().toISOString();
            const createdPropertyIds: string[] = [];

            for (const draft of drafts) {
                const savedId = await suite.saveProperty(buildRealtyImportPropertyDraft(draft, importedAt, importSourceId || undefined));
                if (savedId) createdPropertyIds.push(savedId);
            }

            const duplicateCount = drafts.filter(draft => draft.duplicateReviewStatus === 'possible_duplicate').length;
            const warningCodes = Array.from(new Set(drafts.flatMap(draft => draft.reviewWarnings)));
            const importJobId = await suite.saveImportJob({
                projectId: activeProjectId,
                tenantId: currentTenantId,
                userId: user.id,
                sourceId: importSourceId || null,
                sourceType: importSourceType,
                status: 'completed',
                mapping: [],
                totalRows: drafts.length,
                draftCount: createdPropertyIds.length,
                duplicateCount,
                errorCount: drafts.length - createdPropertyIds.length,
                needsReview: true,
                noAutoPublish: true,
                startedAt: importedAt,
                completedAt: new Date().toISOString(),
                metadata: {
                    source: REALTY_IMPORT_STAGING_SOURCE,
                    sourceName: importSourceName.trim() || t(`realty.engine.import.sources.${importSourceType}`, importSourceType),
                    providerName: importProviderName.trim(),
                    feedUrl: importFeedUrl.trim(),
                    syncMode: importSyncMode,
                    warningCodes,
                    createdPropertyIds,
                    noRuntimeActivated: true,
                },
            });

            await persistRealtyImportStaging(drafts, createdPropertyIds, importJobId);
            await suite.refetch();
            setImportDrafts(drafts);
            setImportCreatedCount(createdPropertyIds.length);
            setImportStatus('synced_draft');
        } catch (err) {
            setImportError(err instanceof Error ? err.message : String(err));
        } finally {
            setImportAction(null);
        }
    };

    const reviewRealtyImportProperty = async (
        property: RealtyProperty,
        reviewStatus: 'approved' | 'rejected' | 'needs_review'
    ) => {
        setLocalError(null);
        setLocalWarning(null);
        try {
            const metadata = buildRealtyImportReviewMetadata(property, reviewStatus, user?.id || null);
            const patch: Partial<RealtyProperty> = {
                ...property,
                metadata,
                publicEnabled: false,
            };

            if (reviewStatus === 'rejected') {
                patch.status = 'archived';
                patch.isFeatured = false;
            } else if (property.status === 'archived') {
                patch.status = 'draft';
            }

            await suite.saveProperty(patch);
            if (editingProperty?.id === property.id) {
                setEditingProperty(prev => prev ? { ...prev, ...patch } : prev);
            }
            setLocalWarning(t(`realty.importReview.messages.${reviewStatus}`));
        } catch (err: any) {
            setLocalError(err.message || t('realty.errors.saveProperty'));
        }
    };

    const togglePropertyPublication = async (property: RealtyProperty) => {
        setLocalError(null);
        setLocalWarning(null);
        const nextStatus: RealtyPropertyStatus = property.status === 'active' ? 'draft' : 'active';
        if (nextStatus === 'active' && !canPublishRealtyImportProperty(property)) {
            setLocalError(t('realty.importReview.errors.approveBeforePublish'));
            return;
        }

        try {
            await suite.updatePropertyStatus(property.id, nextStatus);
        } catch (err: any) {
            setLocalError(err.message || t('realty.errors.saveProperty'));
        }
    };

    const buildEngineSyncInput = (dryRun: boolean, optionOverrides: Partial<NonNullable<Parameters<typeof applyCrossModuleSync>[0]['options']>> = {}) => {
        if (!activeProject || !businessBlueprint) {
            throw new Error(t('realty.engine.syncMissingBlueprint'));
        }

        const currentUserId = user?.id || activeProject.userId || '';
        if (!currentUserId) {
            throw new Error(t('realty.engine.syncMissingUser'));
        }

        return {
            projectId: activeProject.id,
            userId: currentUserId,
            storeId: activeProject.id,
            businessBlueprint,
            ecommerceBlueprint: businessBlueprint.ecommerceBlueprint,
            storefrontBlueprint: businessBlueprint.storefrontBlueprint,
            createdContentRefs: businessBlueprint.ecommerceBlueprint?.createdContentRefs,
            options: {
                dryRun,
                overwriteExisting: false,
                syncChatbot: true,
                syncLeads: true,
                syncEmailMarketing: true,
                syncAnalytics: true,
                syncAppointments: true,
                syncEcommerce: true,
                syncFinance: true,
                ...optionOverrides,
            },
        };
    };

    const buildRealtyOfferSyncInput = (dryRun: boolean) => buildEngineSyncInput(dryRun, {
        syncChatbot: false,
        syncLeads: false,
        syncEmailMarketing: false,
        syncAnalytics: false,
        syncAppointments: false,
        syncEcommerce: true,
        syncFinance: true,
    });

    const persistEngineBlueprint = async (nextBlueprint: BusinessBlueprint) => {
        if (!activeProject) throw new Error(t('realty.engine.syncMissingBlueprint'));

        const now = new Date().toISOString();
        const nextData = {
            ...(activeProject.data || {}),
            businessBlueprint: nextBlueprint,
            lastUpdated: now,
        };

        const { error: updateError } = await supabase
            .from('projects')
            .update({
                data: nextData,
                last_updated: now,
            })
            .eq('id', activeProject.id);

        if (updateError) throw updateError;

        await loadProject(activeProject.id, false, false);
    };

    const previewEngineIntegrationDrafts = () => {
        setEngineSyncAction('preview');
        setEngineSyncError(null);
        try {
            const previewResult = previewCrossModuleSync(buildEngineSyncInput(true));
            setEngineSyncResult(previewResult);

            const previewError = formatCrossModuleSyncError(previewResult);
            if (previewError) {
                setEngineSyncError(previewError);
                return;
            }

            setEngineSyncStatus('previewed');
        } catch (err) {
            setEngineSyncError(err instanceof Error ? err.message : String(err));
        } finally {
            setEngineSyncAction(null);
        }
    };

    const createEngineIntegrationDrafts = async () => {
        setEngineSyncAction('create');
        setEngineSyncError(null);
        try {
            const applyResult = applyCrossModuleSync(buildEngineSyncInput(false));
            setEngineSyncResult(applyResult);

            const applyError = formatCrossModuleSyncError(applyResult);
            if (applyError) {
                setEngineSyncError(applyError);
                return;
            }

            await persistEngineBlueprint(applyResult.businessBlueprint);
            setEngineSyncStatus('synced_draft');
        } catch (err) {
            setEngineSyncError(err instanceof Error ? err.message : String(err));
        } finally {
            setEngineSyncAction(null);
        }
    };

    const previewRealtyOfferDrafts = () => {
        setOfferSyncAction('preview');
        setOfferSyncError(null);
        try {
            const previewResult = previewCrossModuleSync(buildRealtyOfferSyncInput(true));
            setOfferSyncResult(previewResult);

            const previewError = formatCrossModuleSyncError(previewResult);
            if (previewError) {
                setOfferSyncError(previewError);
                return;
            }

            setOfferSyncStatus('previewed');
        } catch (err) {
            setOfferSyncError(err instanceof Error ? err.message : String(err));
        } finally {
            setOfferSyncAction(null);
        }
    };

    const createRealtyOfferDrafts = async () => {
        setOfferSyncAction('create');
        setOfferSyncError(null);
        try {
            const applyResult = applyCrossModuleSync(buildRealtyOfferSyncInput(false));
            setOfferSyncResult(applyResult);

            const applyError = formatCrossModuleSyncError(applyResult);
            if (applyError) {
                setOfferSyncError(applyError);
                return;
            }

            await persistEngineBlueprint(applyResult.businessBlueprint);
            setOfferSyncStatus('synced_draft');
        } catch (err) {
            setOfferSyncError(err instanceof Error ? err.message : String(err));
        } finally {
            setOfferSyncAction(null);
        }
    };

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
        setFeaturesInput('');
        setHighlightsInput('');
        setFaqInput('');
        setPropertyImageUrls([]);
        setPropertyImageAssets({});
        setLocalWarning(null);
        setLocalError(null);
    };

    const startEdit = (property: RealtyProperty) => {
        setEditingProperty(property);
        setAmenitiesInput((property.amenities || []).join('\n'));
        setFeaturesInput((property.features || []).join('\n'));
        setHighlightsInput((property.highlights || []).join('\n'));
        setFaqInput(stringifyFaqInput(property.metadata));
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

    const setPrimaryPropertyImage = (index: number) => {
        setPropertyImageUrls(prev => {
            const next = [...prev];
            const [selected] = next.splice(index, 1);
            if (!selected) return prev;
            return [selected, ...next];
        });
    };

    const updatePropertyImageAltText = (url: string, altText: string) => {
        if (!url) return;
        setPropertyImageAssets(prev => ({
            ...prev,
            [url]: {
                ...prev[url],
                url,
                altText,
            },
        }));
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
                    altText: asset.altText || editingProperty.title || '',
                    isPrimary: index === 0,
                    metadata: asset.metadata || {},
                };
            });

            const nextMetadata: Record<string, unknown> = { ...(editingProperty.metadata || {}) };
            if (faqInput.trim()) {
                try {
                    const parsedFaq = JSON.parse(faqInput);
                    if (!Array.isArray(parsedFaq)) throw new Error('FAQ must be an array.');
                    nextMetadata.faq = parsedFaq;
                } catch {
                    setLocalError(t('realty.errors.invalidFaqJson'));
                    return;
                }
            } else {
                delete nextMetadata.faq;
            }

            const nextDescriptionLong = editingProperty.descriptionLong || editingProperty.description || '';
            const propertyToSave: Partial<RealtyProperty> = {
                ...editingProperty,
                projectId: activeProjectId,
                tenantId: currentTenantId,
                createdBy: user?.id || editingProperty.createdBy,
                slug: nextSlug,
                address: editingProperty.addressLine1 || editingProperty.address || '',
                addressLine1: editingProperty.addressLine1 || editingProperty.address || '',
                zipCode: editingProperty.postalCode || editingProperty.zipCode || '',
                postalCode: editingProperty.postalCode || editingProperty.zipCode || '',
                description: nextDescriptionLong,
                descriptionLong: nextDescriptionLong,
                amenities: parseUniqueLines(amenitiesInput),
                features: parseUniqueLines(featuresInput),
                highlights: parseUniqueLines(highlightsInput),
                images: nextImages,
                mainImageUrl: nextImages[0]?.url || editingProperty.mainImageUrl || '',
                metadata: nextMetadata,
            };

            const nextScore = calculateRealtyListingScore(propertyToSave);
            if (propertyToSave.status === 'active' || propertyToSave.publicEnabled === true) {
                if (!canPublishRealtyImportProperty(propertyToSave)) {
                    setLocalError(t('realty.importReview.errors.approveBeforePublish'));
                    return;
                }

                if (nextScore.missingRequired.length > 0) {
                    const requiredMissing = nextScore.missingRequired.map(translateScoreField);
                    setLocalError(t('realty.errors.publishRequired', { fields: requiredMissing.join(', ') }));
                    setLocalWarning(t('realty.warnings.publishMissing', {
                        fields: [...nextScore.missingRequired, ...nextScore.missingRecommended].map(translateScoreField).join(', '),
                    }));
                    return;
                }

                if (nextScore.missingRecommended.length > 0) {
                    setLocalWarning(t('realty.warnings.publishMissing', {
                        fields: nextScore.missingRecommended.map(translateScoreField).join(', '),
                    }));
                }
            }

            await suite.saveProperty(propertyToSave);
            setEditingProperty(null);
            setAmenitiesInput('');
            setFeaturesInput('');
            setHighlightsInput('');
            setFaqInput('');
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

    const renderAdvancedPropertyForm = () => {
        if (!editingProperty) return null;
        const update = (patch: Partial<RealtyProperty>) => setEditingProperty(prev => ({ ...prev, ...patch }));
        const metadata = isPlainRecord(editingProperty.metadata) ? editingProperty.metadata : {};
        const updateMetadataText = (key: string, value: string) => {
            const nextMetadata: Record<string, unknown> = { ...metadata, [key]: value };
            if (!value.trim()) delete nextMetadata[key];
            update({ metadata: nextMetadata });
        };
        const imageSlots = propertyImageUrls.length > 0 ? propertyImageUrls : [''];
        const cleanPreviewImages = cleanImageUrls(propertyImageUrls);
        const previewImages = cleanPreviewImages.map((url, index) => ({
            id: `preview-${index}`,
            url,
            position: index,
            altText: propertyImageAssets[url]?.altText || editingProperty.title || '',
        }));
        const previewProperty: Partial<RealtyProperty> = {
            ...editingProperty,
            address: editingProperty.addressLine1 || editingProperty.address || '',
            addressLine1: editingProperty.addressLine1 || editingProperty.address || '',
            postalCode: editingProperty.postalCode || editingProperty.zipCode || '',
            zipCode: editingProperty.postalCode || editingProperty.zipCode || '',
            description: editingProperty.descriptionLong || editingProperty.description || '',
            descriptionLong: editingProperty.descriptionLong || editingProperty.description || '',
            amenities: parseUniqueLines(amenitiesInput),
            features: parseUniqueLines(featuresInput),
            highlights: parseUniqueLines(highlightsInput),
            images: previewImages,
            mainImageUrl: previewImages[0]?.url || editingProperty.mainImageUrl || '',
            metadata,
        };
        const editingScore = calculateRealtyListingScore(previewProperty);
        const savedEditingProperty = editingProperty.id
            ? displayProperties.find(property => property.id === editingProperty.id)
            : null;
        const isPublicationRequested = editingProperty.status === 'active' || editingProperty.publicEnabled === true;
        const primaryImage = previewImages[0]?.url || '';
        const location = getPropertyLocation(previewProperty);
        const publicListingPath = previewProperty.slug ? `/listados/${previewProperty.slug}` : '';
        const previewListingPath = activeProjectId && previewProperty.slug ? `/preview/${activeProjectId}/listados/${previewProperty.slug}` : '';
        const isImportedReviewListing = isRealtyImportReviewProperty(previewProperty);
        const importReviewMetadata = getRealtyImportReviewMetadata(previewProperty);
        const importReviewStatus = getRealtyImportReviewStatus(previewProperty);
        const importDuplicateStatus = getRealtyImportDuplicateReviewStatus(previewProperty);
        const importWarnings = Array.isArray(importReviewMetadata.reviewWarnings)
            ? importReviewMetadata.reviewWarnings.filter((warning): warning is string => typeof warning === 'string')
            : [];
        const importDuplicateMatches = Array.isArray(importReviewMetadata.duplicateMatches)
            ? importReviewMetadata.duplicateMatches
            : [];
        const importSourceLabel = typeof importReviewMetadata.sourceName === 'string' && importReviewMetadata.sourceName.trim()
            ? importReviewMetadata.sourceName
            : typeof importReviewMetadata.sourceType === 'string' && importReviewMetadata.sourceType.trim()
                ? t(`realty.engine.import.sources.${importReviewMetadata.sourceType}`, importReviewMetadata.sourceType)
                : t('realty.importReview.sourceUnknown');
        const importExternalId = typeof importReviewMetadata.externalId === 'string' && importReviewMetadata.externalId.trim()
            ? importReviewMetadata.externalId
            : t('realty.importReview.externalIdMissing');

        return (
            <div className="space-y-5">
                <div className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('realty.editor.propertyEditor')}</p>
                            <h3 className="mt-1 text-xl font-bold text-q-text">{editingProperty.id ? t('realty.properties.edit') : t('realty.properties.create')}</h3>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-q-text-secondary">{t('realty.editor.editorDescription')}</p>
                            {isImportedReviewListing && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="rounded-full border border-q-warning/30 bg-q-warning/10 px-2.5 py-1 text-xs font-semibold text-q-warning">
                                        {t(`realty.importReview.status.${importReviewStatus}`)}
                                    </span>
                                    <span className="rounded-full border border-q-border bg-q-bg px-2.5 py-1 text-xs font-semibold text-q-text-secondary">
                                        {importSourceLabel}
                                    </span>
                                    <span className="rounded-full border border-q-border bg-q-bg px-2.5 py-1 text-xs font-semibold text-q-text-secondary">
                                        {importExternalId}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {savedEditingProperty && (
                                <Button type="button" variant="secondary" size="sm" onClick={() => { setAiPropertyId(savedEditingProperty.id); setActiveTab('ai'); }}>
                                    <Sparkles size={15} />{t('realty.editor.generateAiCopy')}
                                </Button>
                            )}
                            <button type="button" onClick={() => setEditingProperty(null)} className="rounded-lg p-2 text-q-text-secondary hover:bg-q-surface-overlay hover:text-q-text"><X size={18} /></button>
                        </div>
                    </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-5">
                        <PropertyEditorSection icon={FileText} eyebrow={t('realty.editor.section')} title={t('realty.editor.basicInfo')} description={t('realty.editor.basicInfoDescription')}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <PropertyEditorField label={t('realty.form.title')}>
                                    <PropertyEditorInput value={editingProperty.title || ''} onChange={event => update({ title: event.target.value, slug: toRealtySlug(event.target.value) })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.slug')}>
                                    <PropertyEditorInput value={editingProperty.slug || ''} onChange={event => update({ slug: toRealtySlug(event.target.value) })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.price')}>
                                    <PropertyEditorInput type="number" value={editingProperty.price ?? ''} onChange={event => update({ price: Number(event.target.value) || 0 })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.currency')}>
                                    <PropertyEditorInput value={editingProperty.currency || 'USD'} onChange={event => update({ currency: event.target.value.toUpperCase().slice(0, 3) })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.transactionType')}>
                                    <DashboardSelect
                                        value={editingProperty.transactionType || 'sale'}
                                        onChange={value => update({ transactionType: value as TransactionType })}
                                        options={['sale', 'rent', 'lease'].map(type => ({ value: type, label: t(`realty.transactionTypes.${type}`) }))}
                                    />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.type')}>
                                    <DashboardSelect
                                        value={editingProperty.propertyType || 'house'}
                                        onChange={value => update({ propertyType: value as RealtyPropertyType })}
                                        options={realtyPropertyTypes.map(type => ({ value: type, label: t(`realty.propertyTypes.${type}`) }))}
                                    />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.status')}>
                                    <DashboardSelect
                                        value={editingProperty.status || 'draft'}
                                        onChange={value => update({ status: value as RealtyPropertyStatus })}
                                        options={realtyPropertyStatuses.map(status => ({ value: status, label: t(`realty.status.${status}`) }))}
                                    />
                                </PropertyEditorField>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <PropertyEditorToggle label={t('realty.form.featured')} checked={Boolean(editingProperty.isFeatured)} onChange={value => update({ isFeatured: value })} />
                                    <PropertyEditorToggle label={t('realty.form.publicEnabled')} checked={Boolean(editingProperty.publicEnabled)} onChange={value => update({ publicEnabled: value })} />
                                </div>
                            </div>
                        </PropertyEditorSection>

                        <PropertyEditorSection icon={MapPin} eyebrow={t('realty.editor.section')} title={t('realty.editor.location')} description={t('realty.editor.locationDescription')}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <PropertyEditorField label={t('realty.form.addressLine1')}>
                                    <PropertyEditorInput value={editingProperty.addressLine1 || editingProperty.address || ''} onChange={event => update({ addressLine1: event.target.value, address: event.target.value })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.addressLine2')}>
                                    <PropertyEditorInput value={editingProperty.addressLine2 || ''} onChange={event => update({ addressLine2: event.target.value })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.city')}>
                                    <PropertyEditorInput value={editingProperty.city || ''} onChange={event => update({ city: event.target.value })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.state')}>
                                    <PropertyEditorInput value={editingProperty.state || ''} onChange={event => update({ state: event.target.value })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.country')}>
                                    <PropertyEditorInput value={editingProperty.country || ''} onChange={event => update({ country: event.target.value })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.postalCode')}>
                                    <PropertyEditorInput value={editingProperty.postalCode || editingProperty.zipCode || ''} onChange={event => update({ postalCode: event.target.value, zipCode: event.target.value })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.latitude')}>
                                    <PropertyEditorInput type="number" value={editingProperty.latitude ?? ''} onChange={event => update({ latitude: parseOptionalNumber(event.target.value) })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.longitude')}>
                                    <PropertyEditorInput type="number" value={editingProperty.longitude ?? ''} onChange={event => update({ longitude: parseOptionalNumber(event.target.value) })} />
                                </PropertyEditorField>
                            </div>
                        </PropertyEditorSection>

                        <PropertyEditorSection icon={Ruler} eyebrow={t('realty.editor.section')} title={t('realty.editor.propertyFacts')} description={t('realty.editor.propertyFactsDescription')}>
                            <div className="grid gap-4 md:grid-cols-3">
                                <PropertyEditorField label={t('realty.form.bedrooms')}>
                                    <PropertyEditorInput type="number" value={editingProperty.bedrooms ?? ''} onChange={event => update({ bedrooms: Number(event.target.value) || 0 })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.bathrooms')}>
                                    <PropertyEditorInput type="number" value={editingProperty.bathrooms ?? ''} onChange={event => update({ bathrooms: Number(event.target.value) || 0 })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.halfBathrooms')}>
                                    <PropertyEditorInput type="number" value={editingProperty.halfBathrooms ?? ''} onChange={event => update({ halfBathrooms: parseOptionalNumber(event.target.value) })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.area')}>
                                    <PropertyEditorInput type="number" value={editingProperty.area ?? ''} onChange={event => update({ area: Number(event.target.value) || 0 })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.areaUnit')}>
                                    <DashboardSelect
                                        value={editingProperty.areaUnit || 'sqft'}
                                        onChange={value => update({ areaUnit: value as RealtyProperty['areaUnit'] })}
                                        options={[{ value: 'sqft', label: 'sqft' }, { value: 'sqm', label: 'sqm' }]}
                                    />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.lotSize')}>
                                    <PropertyEditorInput type="number" value={editingProperty.lotSize ?? editingProperty.lotSqft ?? ''} onChange={event => {
                                        const lotSize = parseOptionalNumber(event.target.value);
                                        update({ lotSize, lotSqft: lotSize });
                                    }} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.parkingSpaces')}>
                                    <PropertyEditorInput type="number" value={editingProperty.parkingSpaces ?? ''} onChange={event => update({ parkingSpaces: parseOptionalNumber(event.target.value) })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.yearBuilt')}>
                                    <PropertyEditorInput type="number" value={editingProperty.yearBuilt ?? ''} onChange={event => update({ yearBuilt: parseOptionalNumber(event.target.value) })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.hoaFee')}>
                                    <PropertyEditorInput type="number" value={editingProperty.hoaFee ?? ''} onChange={event => update({ hoaFee: parseOptionalNumber(event.target.value) })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.taxes')}>
                                    <PropertyEditorInput type="number" value={editingProperty.taxes ?? ''} onChange={event => update({ taxes: parseOptionalNumber(event.target.value) })} />
                                </PropertyEditorField>
                            </div>
                        </PropertyEditorSection>

                        <PropertyEditorSection icon={MessageSquare} eyebrow={t('realty.editor.section')} title={t('realty.editor.content')} description={t('realty.editor.contentDescription')}>
                            <div className="grid gap-4">
                                <PropertyEditorField label={t('realty.form.descriptionShort')} description={t('realty.editor.descriptionShortHelp')}>
                                    <PropertyEditorTextarea rows={3} value={editingProperty.descriptionShort || ''} onChange={event => update({ descriptionShort: event.target.value })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.descriptionLong')}>
                                    <PropertyEditorTextarea rows={7} value={editingProperty.descriptionLong || editingProperty.description || ''} onChange={event => update({ descriptionLong: event.target.value, description: event.target.value })} />
                                </PropertyEditorField>
                                <div className="grid gap-4 lg:grid-cols-3">
                                    <PropertyEditorField label={t('realty.form.highlights')} description={t('realty.editor.onePerLine')}>
                                        <PropertyEditorTextarea rows={5} value={highlightsInput} onChange={event => setHighlightsInput(event.target.value)} />
                                    </PropertyEditorField>
                                    <PropertyEditorField label={t('realty.form.features')} description={t('realty.editor.onePerLine')}>
                                        <PropertyEditorTextarea rows={5} value={featuresInput} onChange={event => setFeaturesInput(event.target.value)} />
                                    </PropertyEditorField>
                                    <PropertyEditorField label={t('realty.form.amenities')} description={t('realty.editor.onePerLine')}>
                                        <PropertyEditorTextarea rows={5} value={amenitiesInput} onChange={event => setAmenitiesInput(event.target.value)} />
                                    </PropertyEditorField>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <PropertyEditorField label={t('realty.form.videoUrl')}>
                                        <PropertyEditorInput value={editingProperty.videoUrl || ''} onChange={event => update({ videoUrl: event.target.value })} />
                                    </PropertyEditorField>
                                    <PropertyEditorField label={t('realty.form.virtualTourUrl')}>
                                        <PropertyEditorInput value={editingProperty.virtualTourUrl || ''} onChange={event => update({ virtualTourUrl: event.target.value })} />
                                    </PropertyEditorField>
                                </div>
                            </div>
                        </PropertyEditorSection>

                        <PropertyEditorSection icon={Search} eyebrow={t('realty.editor.section')} title={t('realty.editor.seoMarketing')} description={t('realty.editor.seoMarketingDescription')}>
                            <div className="grid gap-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <PropertyEditorField label={t('realty.form.seoTitle')}>
                                        <PropertyEditorInput value={editingProperty.seoTitle || ''} onChange={event => update({ seoTitle: event.target.value })} />
                                    </PropertyEditorField>
                                    <PropertyEditorField label={t('realty.form.cta')}>
                                        <PropertyEditorInput value={getMetadataText(metadata, 'cta')} onChange={event => updateMetadataText('cta', event.target.value)} />
                                    </PropertyEditorField>
                                </div>
                                <PropertyEditorField label={t('realty.form.seoDescription')}>
                                    <PropertyEditorTextarea rows={3} value={editingProperty.seoDescription || ''} onChange={event => update({ seoDescription: event.target.value })} />
                                </PropertyEditorField>
                                <PropertyEditorField label={t('realty.form.faq')} description={t('realty.editor.faqJsonHelp')}>
                                    <PropertyEditorTextarea rows={5} value={faqInput} onChange={event => setFaqInput(event.target.value)} placeholder={t('realty.editor.faqPlaceholder')} />
                                </PropertyEditorField>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <PropertyEditorField label={t('realty.form.socialPost')}>
                                        <PropertyEditorTextarea rows={4} value={getMetadataText(metadata, 'socialPost')} onChange={event => updateMetadataText('socialPost', event.target.value)} />
                                    </PropertyEditorField>
                                    <PropertyEditorField label={t('realty.form.emailCopy')}>
                                        <PropertyEditorTextarea rows={4} value={getMetadataText(metadata, 'emailCopy')} onChange={event => updateMetadataText('emailCopy', event.target.value)} />
                                    </PropertyEditorField>
                                    <PropertyEditorField label={t('realty.form.smsCopy')}>
                                        <PropertyEditorTextarea rows={4} value={getMetadataText(metadata, 'smsCopy')} onChange={event => updateMetadataText('smsCopy', event.target.value)} />
                                    </PropertyEditorField>
                                    <PropertyEditorField label={t('realty.form.adCopy')}>
                                        <PropertyEditorTextarea rows={4} value={getMetadataText(metadata, 'adCopy')} onChange={event => updateMetadataText('adCopy', event.target.value)} />
                                    </PropertyEditorField>
                                </div>
                            </div>
                        </PropertyEditorSection>

                        <PropertyEditorSection icon={ImageIcon} eyebrow={t('realty.editor.section')} title={t('realty.editor.media')} description={t('realty.editor.mediaDescription')}>
                            {cleanPreviewImages.length > 0 && (
                                <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    {cleanPreviewImages.map((imageUrl, index) => (
                                        <button
                                            key={`${imageUrl}-${index}`}
                                            type="button"
                                            onClick={() => setPrimaryPropertyImage(index)}
                                            className={`group overflow-hidden rounded-xl border text-left transition-colors ${index === 0 ? 'border-q-accent bg-q-accent/10' : 'border-q-border bg-q-bg hover:border-q-accent/40'}`}
                                        >
                                            <div className="aspect-[4/3] overflow-hidden bg-q-surface-overlay">
                                                <img src={imageUrl} alt={propertyImageAssets[imageUrl]?.altText || editingProperty.title || ''} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                            </div>
                                            <div className="flex items-center justify-between gap-2 px-3 py-2">
                                                <span className="truncate text-xs font-semibold text-q-text">{index === 0 ? t('realty.editor.mainImage') : t('realty.form.imageSlot', { index: index + 1 })}</span>
                                                {index === 0 && <CheckCircle2 size={14} className="text-q-accent" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <span className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('realty.form.images')}</span>
                                <Button type="button" size="sm" variant="secondary" onClick={addPropertyImageSlot}><Plus size={15} />{t('realty.actions.addImage')}</Button>
                            </div>
                            <div className="grid gap-5 md:grid-cols-2">
                                {imageSlots.map((imageUrl, index) => (
                                    <div key={`${index}-${imageUrl || 'empty'}`} className="space-y-3 rounded-xl border border-q-border bg-q-bg p-4">
                                        <ImagePicker
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
                                        {imageUrl && (
                                            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                                                <PropertyEditorField label={t('realty.form.altText')}>
                                                    <PropertyEditorInput value={propertyImageAssets[imageUrl]?.altText || ''} onChange={event => updatePropertyImageAltText(imageUrl, event.target.value)} />
                                                </PropertyEditorField>
                                                <Button type="button" size="sm" variant="secondary" onClick={() => setPrimaryPropertyImage(index)} disabled={index === 0}>
                                                    <ImageIcon size={15} />{t('realty.editor.setMainImage')}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </PropertyEditorSection>
                    </div>

                    <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
                        <div className="overflow-hidden rounded-xl border border-q-border bg-q-surface">
                            <div className="aspect-[4/3] bg-q-surface-overlay">
                                {primaryImage ? (
                                    <img src={primaryImage} alt={editingProperty.title || t('realty.editor.previewCard')} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-q-text-muted"><Home size={34} /></div>
                                )}
                            </div>
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('realty.editor.previewCard')}</p>
                                        <h4 className="mt-1 line-clamp-2 font-bold text-q-accent">{previewProperty.title || t('realty.properties.create')}</h4>
                                    </div>
                                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold ${getScoreToneClass(editingScore)}`}>{editingScore.score}%</span>
                                </div>
                                <p className="mt-3 text-lg font-bold text-q-text">{formatRealtyPrice(Number(previewProperty.price || 0), i18n.language, previewProperty.currency || 'USD')}</p>
                                {location && <p className="mt-1 line-clamp-2 text-sm text-q-text-secondary">{location}</p>}
                                <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-q-text-secondary">
                                    <PropertyEditorMetric icon={BedDouble} label={t('realty.form.bedrooms')} value={previewProperty.bedrooms || 0} />
                                    <PropertyEditorMetric icon={Bath} label={t('realty.form.bathrooms')} value={previewProperty.bathrooms || 0} />
                                    <PropertyEditorMetric icon={Ruler} label={t('realty.form.area')} value={previewProperty.area || 0} />
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {previewProperty.propertyType && <span className="rounded-full bg-q-surface-overlay px-2 py-1 text-xs text-q-text-secondary">{t(`realty.propertyTypes.${previewProperty.propertyType}`)}</span>}
                                    {previewProperty.transactionType && <span className="rounded-full bg-q-surface-overlay px-2 py-1 text-xs text-q-text-secondary">{t(`realty.transactionTypes.${previewProperty.transactionType}`)}</span>}
                                    {previewProperty.isFeatured && <span className="rounded-full bg-q-accent/15 px-2 py-1 text-xs text-q-accent">{t('realty.website.featured')}</span>}
                                </div>
                                <div className="mt-4 grid gap-2">
                                    <Button type="button" size="sm" variant="secondary" disabled={!previewListingPath} onClick={() => previewListingPath && window.open(previewListingPath, '_blank', 'noopener,noreferrer')}>
                                        <Eye size={15} />{t('realty.editor.previewDetail')}
                                    </Button>
                                    <Button type="button" size="sm" variant="secondary" disabled={!publicListingPath || previewProperty.status !== 'active' || !previewProperty.publicEnabled} onClick={() => publicListingPath && window.open(publicListingPath, '_blank', 'noopener,noreferrer')}>
                                        <Link size={15} />{t('realty.editor.viewPublicListing')}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {isImportedReviewListing && (
                            <PropertyEditorSection
                                icon={ShieldCheck}
                                eyebrow={t('realty.importReview.reviewCard')}
                                title={t('realty.importReview.title')}
                                description={canPublishRealtyImportProperty(previewProperty) ? t('realty.importReview.approvedNote') : t('realty.importReview.blockedPublish')}
                                compact
                            >
                                <div className="space-y-3">
                                    <div className="grid gap-2 text-xs text-q-text-secondary">
                                        <div className="flex items-center justify-between gap-3">
                                            <span>{t('realty.importReview.source')}</span>
                                            <span className="truncate font-semibold text-q-text">{importSourceLabel}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span>{t('realty.importReview.externalId')}</span>
                                            <span className="truncate font-semibold text-q-text">{importExternalId}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span>{t('realty.importReview.duplicateLabel')}</span>
                                            <span className="truncate font-semibold text-q-text">{t(`realty.importReview.duplicateStatus.${importDuplicateStatus}`)}</span>
                                        </div>
                                    </div>
                                    {(importWarnings.length > 0 || importDuplicateMatches.length > 0) && (
                                        <div className="rounded-lg border border-q-warning/30 bg-q-warning/10 p-3">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-q-warning">{t('realty.importReview.warningsLabel')}</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {importWarnings.slice(0, 5).map(warning => (
                                                    <span key={warning} className="rounded-full bg-q-bg px-2 py-0.5 text-xs text-q-text-secondary">
                                                        {t(`realty.engine.import.warnings.${warning}`, warning)}
                                                    </span>
                                                ))}
                                                {importDuplicateMatches.length > 0 && (
                                                    <span className="rounded-full bg-q-bg px-2 py-0.5 text-xs text-q-text-secondary">
                                                        {t('realty.importReview.duplicateMatches', { count: importDuplicateMatches.length })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid gap-2">
                                        <Button type="button" size="sm" variant="secondary" disabled={!savedEditingProperty || suite.isSaving || importReviewStatus === 'approved'} onClick={() => savedEditingProperty && reviewRealtyImportProperty(savedEditingProperty, 'approved')}>
                                            <CheckCircle2 size={15} />{t('realty.importReview.actions.approve')}
                                        </Button>
                                        <Button type="button" size="sm" variant="secondary" disabled={!savedEditingProperty || suite.isSaving} onClick={() => savedEditingProperty && reviewRealtyImportProperty(savedEditingProperty, 'needs_review')}>
                                            <RefreshCw size={15} />{t('realty.importReview.actions.reopen')}
                                        </Button>
                                        <Button type="button" size="sm" variant="ghost" disabled={!savedEditingProperty || suite.isSaving || importReviewStatus === 'rejected'} onClick={() => savedEditingProperty && reviewRealtyImportProperty(savedEditingProperty, 'rejected')}>
                                            <X size={15} />{t('realty.importReview.actions.reject')}
                                        </Button>
                                    </div>
                                </div>
                            </PropertyEditorSection>
                        )}

                        <PropertyEditorSection icon={ListChecks} eyebrow={t('realty.editor.publicationChecklist')} title={t('realty.score.title')} compact>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-q-text">{t(`realty.score.grade.${editingScore.grade}`)}</p>
                                    <p className="mt-1 text-xs text-q-text-secondary">{isPublicationRequested ? t('realty.editor.publicationMode') : t('realty.editor.draftSaved')}</p>
                                </div>
                                <span className={`rounded-full border px-3 py-1 text-sm font-bold ${getScoreToneClass(editingScore)}`}>{editingScore.score}%</span>
                            </div>
                            {(editingScore.missingRequired.length > 0 || editingScore.missingRecommended.length > 0) && (
                                <div className="mt-4 space-y-4">
                                    {editingScore.missingRequired.length > 0 && (
                                        <PropertyEditorChecklist icon={AlertCircle} title={t('realty.editor.missingRequiredFields')} toneClass="text-q-error" items={editingScore.missingRequired.map(translateScoreField)} />
                                    )}
                                    {editingScore.missingRecommended.length > 0 && (
                                        <PropertyEditorChecklist icon={ShieldCheck} title={t('realty.editor.recommendedImprovements')} toneClass="text-q-warning" items={editingScore.missingRecommended.slice(0, 8).map(translateScoreField)} />
                                    )}
                                </div>
                            )}
                            {editingScore.recommendations.length > 0 && (
                                <div className="mt-4 rounded-lg border border-q-border bg-q-bg p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('realty.score.recommendationsTitle')}</p>
                                    <ul className="mt-2 space-y-1 text-xs leading-5 text-q-text-secondary">
                                        {editingScore.recommendations.slice(0, 5).map(item => <li key={item}>• {translateRecommendation(item)}</li>)}
                                    </ul>
                                </div>
                            )}
                            <div className="mt-4 grid gap-2">
                                <Button type="button" size="sm" variant="secondary" disabled={!savedEditingProperty || isGeneratingAi} onClick={() => savedEditingProperty && fixPropertyWithAi(savedEditingProperty)}>
                                    <Wand2 size={15} />{t('realty.ai.fixWithAi')}
                                </Button>
                                <Button type="button" size="sm" variant="secondary" disabled={!savedEditingProperty} onClick={() => savedEditingProperty && (setAiPropertyId(savedEditingProperty.id), setActiveTab('ai'))}>
                                    <Sparkles size={15} />{t('realty.editor.generateAiCopy')}
                                </Button>
                                <Button type="button" size="sm" variant="secondary" disabled={!aiResult || !savedEditingProperty || selectedAiProperty?.id !== savedEditingProperty.id || suite.isSaving} onClick={applyAiContentToProperty}>
                                    <Check size={15} />{t('realty.ai.applyToProperty')}
                                </Button>
                            </div>
                        </PropertyEditorSection>
                    </aside>
                </div>

                <div className="sticky bottom-0 z-10 -mx-4 border-t border-q-border bg-q-bg/90 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-xs text-q-text-secondary">
                            {isPublicationRequested ? <AlertCircle size={14} className={editingScore.missingRequired.length ? 'text-q-warning' : 'text-q-success'} /> : <CheckCircle2 size={14} className="text-q-success" />}
                            <span>{isPublicationRequested ? t('realty.editor.publicationChecklist') : t('realty.editor.draftSaved')}</span>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="secondary" onClick={() => setEditingProperty(null)}>{t('common.cancel')}</Button>
                            <Button type="button" onClick={saveProperty} disabled={suite.isSaving}>
                                {suite.isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {t('realty.form.save')}
                            </Button>
                        </div>
                    </div>
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


    const renderAreaIntro = () => {
        const isControlArea = activeArea === 'control';
        return (
            <section className={`mb-5 rounded-xl border p-4 md:p-5 ${isControlArea ? 'border-q-warning/30 bg-q-warning/10' : 'border-q-border bg-q-surface'}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${isControlArea ? 'border-q-warning/30 bg-q-bg text-q-warning' : 'border-q-border bg-q-bg text-q-accent'}`}>
                                {isControlArea ? <ShieldCheck size={18} /> : <Home size={18} />}
                            </span>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">
                                    {isControlArea ? t('realty.areas.control.label') : t('realty.areas.workspace.label')}
                                </p>
                                <h1 className="text-xl font-bold text-q-text">
                                    {isControlArea ? t('realty.areas.control.title') : t('realty.areas.workspace.title')}
                                </h1>
                            </div>
                        </div>
                        <p className="mt-3 max-w-4xl text-sm leading-6 text-q-text-secondary">
                            {isControlArea ? t('realty.areas.control.description') : t('realty.areas.workspace.description')}
                        </p>
                    </div>
                    <div className="grid gap-2 text-xs text-q-text-secondary sm:grid-cols-3 lg:w-[32rem]">
                        {(isControlArea
                            ? ['drafts', 'imports', 'settings']
                            : ['listings', 'leads', 'content']
                        ).map(item => (
                            <div key={item} className="rounded-lg border border-q-border/70 bg-q-bg px-3 py-2">
                                <p className="font-semibold text-q-text">{t(`realty.areas.${activeArea}.points.${item}.title`)}</p>
                                <p className="mt-1 leading-5">{t(`realty.areas.${activeArea}.points.${item}.description`)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
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

        if (activeTab === 'engine') {
            if (!canAccessRealtyControl) {
                return <EmptyPanel icon={ShieldCheck} title={t('realty.empty.noControlAccess')} description={t('realty.empty.noControlAccessDesc')} />;
            }
            return (
                <RealtyEngineControlPanel
                    projectData={activeProject?.data}
                    enginePlan={enginePlan}
                    businessBlueprint={businessBlueprint}
                    realtyDraftSyncStatus={realtyDraftSyncStatus}
                    realtyDraftSyncAction={realtyDraftSyncAction}
                    realtyDraftSyncResult={realtyDraftSyncResult}
                    realtyDraftSyncError={realtyDraftSyncError}
                    engineSyncStatus={engineSyncStatus}
                    engineSyncAction={engineSyncAction}
                    engineSyncResult={engineSyncResult}
                    engineSyncError={engineSyncError}
                    offerSyncStatus={offerSyncStatus}
                    offerSyncAction={offerSyncAction}
                    offerSyncResult={offerSyncResult}
                    offerSyncError={offerSyncError}
                    realtyOfferDrafts={realtyOfferDrafts}
                    importStatus={importStatus}
                    importAction={importAction}
                    importError={importError}
                    importSourceId={importSourceId}
                    importSourceType={importSourceType}
                    importSourceName={importSourceName}
                    importProviderName={importProviderName}
                    importFeedUrl={importFeedUrl}
                    importSyncMode={importSyncMode}
                    importPayload={importPayload}
                    importDrafts={importDrafts}
                    importCreatedCount={importCreatedCount}
                    importJobs={suite.importJobs}
                    savedImportSourceOptions={savedImportSourceOptions}
                    importSourceOptions={importSourceOptions}
                    importSyncModeOptions={importSyncModeOptions}
                    onImportSourceIdChange={setImportSourceId}
                    onImportSourceTypeChange={setImportSourceType}
                    onImportSourceNameChange={setImportSourceName}
                    onImportProviderNameChange={setImportProviderName}
                    onImportFeedUrlChange={setImportFeedUrl}
                    onImportSyncModeChange={setImportSyncMode}
                    onImportPayloadChange={setImportPayload}
                    onPreviewRealtyBlueprintDrafts={previewRealtyBlueprintDrafts}
                    onCreateRealtyBlueprintDrafts={createRealtyBlueprintDrafts}
                    onSaveRealtyImportSourceConfig={saveRealtyImportSourceConfig}
                    onResetRealtyImportSourceConfig={resetRealtyImportSourceConfig}
                    onPreviewRealtyImportDrafts={previewRealtyImportDrafts}
                    onCreateRealtyImportDrafts={createRealtyImportDrafts}
                    onPreviewEngineIntegrationDrafts={previewEngineIntegrationDrafts}
                    onCreateEngineIntegrationDrafts={createEngineIntegrationDrafts}
                    onPreviewRealtyOfferDrafts={previewRealtyOfferDrafts}
                    onCreateRealtyOfferDrafts={createRealtyOfferDrafts}
                    onOpenEngineModule={openEngineModule}
                />
            );
        }

        if (activeTab === 'properties') {
            return (
                <div className="space-y-5">
                    {renderAdvancedPropertyForm()}
                    {importedReviewProperties.length > 0 && (
                        <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('realty.importReview.reviewCard')}</p>
                                    <h2 className="mt-1 text-lg font-bold text-q-text">{t('realty.importReview.title')}</h2>
                                    <p className="mt-1 max-w-3xl text-sm leading-6 text-q-text-secondary">{t('realty.importReview.description')}</p>
                                </div>
                                <div className="grid min-w-0 grid-cols-3 gap-2 sm:min-w-[24rem]">
                                    <EngineMetric icon={FileText} label={t('realty.importReview.total')} value={importedReviewProperties.length} />
                                    <EngineMetric icon={AlertCircle} label={t('realty.importReview.pending')} value={importedNeedsReviewProperties.length} />
                                    <EngineMetric icon={ShieldCheck} label={t('realty.importReview.approved')} value={importedApprovedProperties.length} />
                                </div>
                            </div>
                            <div className="mt-5 grid gap-3">
                                {(importedNeedsReviewProperties.length > 0 ? importedNeedsReviewProperties : importedReviewProperties.slice(0, 3)).map(property => {
                                    const importMetadata = getRealtyImportReviewMetadata(property);
                                    const reviewStatus = getRealtyImportReviewStatus(property);
                                    const duplicateStatus = getRealtyImportDuplicateReviewStatus(property);
                                    const sourceName = typeof importMetadata.sourceName === 'string' && importMetadata.sourceName.trim()
                                        ? importMetadata.sourceName
                                        : typeof importMetadata.sourceType === 'string' && importMetadata.sourceType.trim()
                                            ? t(`realty.engine.import.sources.${importMetadata.sourceType}`, importMetadata.sourceType)
                                            : t('realty.importReview.sourceUnknown');
                                    const externalId = typeof importMetadata.externalId === 'string' && importMetadata.externalId.trim()
                                        ? importMetadata.externalId
                                        : t('realty.importReview.externalIdMissing');

                                    return (
                                        <div key={`import-review-${property.id}`} className="grid gap-3 rounded-lg border border-q-border bg-q-bg p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="truncate font-bold text-q-accent">{property.title || t('realty.engine.import.untitled')}</h3>
                                                    <span className="rounded-full border border-q-warning/30 bg-q-warning/10 px-2 py-0.5 text-xs font-semibold text-q-warning">
                                                        {t(`realty.importReview.status.${reviewStatus}`)}
                                                    </span>
                                                    <span className="rounded-full border border-q-border bg-q-surface px-2 py-0.5 text-xs text-q-text-secondary">
                                                        {t(`realty.importReview.duplicateStatus.${duplicateStatus}`)}
                                                    </span>
                                                </div>
                                                <p className="mt-1 truncate text-sm text-q-text-secondary">{sourceName} · {externalId} · {formatRealtyPrice(property.price, i18n.language, property.currency)}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 lg:justify-end">
                                                <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(property)}>
                                                    <Eye size={15} />{t('realty.importReview.actions.openEditor')}
                                                </Button>
                                                <Button type="button" size="sm" variant="secondary" disabled={suite.isSaving || reviewStatus === 'approved'} onClick={() => reviewRealtyImportProperty(property, 'approved')}>
                                                    <CheckCircle2 size={15} />{t('realty.importReview.actions.approve')}
                                                </Button>
                                                <Button type="button" size="sm" variant="ghost" disabled={suite.isSaving || reviewStatus === 'rejected'} onClick={() => reviewRealtyImportProperty(property, 'rejected')}>
                                                    <X size={15} />{t('realty.importReview.actions.reject')}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                    <div className="flex justify-end"><Button type="button" onClick={startCreate}><Plus size={16} />{t('realty.properties.create')}</Button></div>
                    <div className="grid gap-5">
                        {displayProperties.map(property => {
                            const score = propertyScores.get(property.id) || calculateRealtyListingScore(property);
                            const isImportedReviewProperty = isRealtyImportReviewProperty(property);
                            const importReviewStatus = getRealtyImportReviewStatus(property);
                            const importPublishBlocked = isImportedReviewProperty && !canPublishRealtyImportProperty(property);
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
                                                {isImportedReviewProperty && (
                                                    <span className="rounded-full border border-q-warning/30 bg-q-warning/10 px-2 py-0.5 text-xs font-semibold text-q-warning">
                                                        {t(`realty.importReview.status.${importReviewStatus}`)}
                                                    </span>
                                                )}
                                                {importPublishBlocked && (
                                                    <span className="rounded-full border border-q-border bg-q-bg px-2 py-0.5 text-xs text-q-text-secondary">
                                                        {t('realty.importReview.publishBlockedBadge')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-sm text-q-text-secondary">{formatRealtyPrice(property.price, i18n.language, property.currency)} · {[property.address, property.city].filter(Boolean).join(', ')}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 md:justify-end">
                                            <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(property)}>{t('common.edit')}</Button>
                                            <Button type="button" size="sm" variant="secondary" onClick={() => fixPropertyWithAi(property)} disabled={isGeneratingAi}><Wand2 size={15} />{t('realty.ai.fixWithAi')}</Button>
                                            <Button type="button" size="sm" variant="secondary" onClick={() => togglePropertyPublication(property)}>{property.status === 'active' ? t('realty.actions.unpublish') : t('realty.actions.publish')}</Button>
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
                <div className="space-y-5">
                    <div className="grid gap-3 md:grid-cols-4">
                        <EngineMetric icon={Users} label={t('realty.leads.pipelineStats.total')} value={displayLeads.length} />
                        <EngineMetric icon={Sparkles} label={t('realty.leads.pipelineStats.new')} value={displayNewLeads.length} />
                        <EngineMetric icon={CalendarDays} label={t('realty.leads.pipelineStats.showingRequests')} value={displayShowingRequests.length} />
                        <EngineMetric icon={ShieldCheck} label={t('realty.leads.pipelineStats.crmSynced')} value={displayLeads.filter(hasLeadCrmSync).length} />
                    </div>

                    <div className="rounded-xl border border-q-border bg-q-surface">
                        {displayLeads.length === 0 ? <EmptyPanel icon={Users} title={t('realty.empty.noLeads')} description={t('realty.empty.noLeadsDesc')} /> : displayLeads.map(lead => {
                            const propertyTitle = getLeadPropertyTitle(lead);
                            const isSuiteLead = suiteLeadIds.has(lead.id);
                            const eventType = getLeadPipelineEventType(lead);
                            const pipelineTags = getLeadPipelineTags(lead);
                            const draftEventCount = getLeadDraftEventCount(lead);
                            const isShowingRequest = eventType === 'showing_request';
                            return (
                                <div key={lead.id} className="grid gap-4 border-b border-q-border p-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start md:p-5">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-bold text-q-accent">{lead.name}</p>
                                            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getLeadSourceToneClass(eventType)}`}>
                                                {t(`realty.leads.sources.${eventType}`)}
                                            </span>
                                            {hasLeadCrmSync(lead) && (
                                                <span className="rounded-full border border-q-success/30 bg-q-success/10 px-2 py-0.5 text-xs font-semibold text-q-success">
                                                    {t('realty.leads.crmSynced')}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-q-text-secondary">{lead.email} {lead.phone ? `· ${lead.phone}` : ''}</p>
                                        {propertyTitle && <p className="mt-1 text-xs text-q-text-secondary">{t('realty.leads.property')}: <span className="font-medium text-q-accent">{propertyTitle}</span></p>}
                                        {lead.message && <p className="mt-2 text-sm text-q-text">{lead.message}</p>}
                                        {(pipelineTags.length > 0 || draftEventCount > 0) && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {pipelineTags.map(tag => (
                                                    <span key={`${lead.id}-${tag}`} className="rounded-full bg-q-surface-overlay px-2 py-0.5 text-xs text-q-text-secondary">
                                                        {tag}
                                                    </span>
                                                ))}
                                                {draftEventCount > 0 && (
                                                    <span className="rounded-full bg-q-accent/10 px-2 py-0.5 text-xs font-semibold text-q-accent">
                                                        {t('realty.leads.draftEvents', { count: draftEventCount })}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <DashboardSelect
                                            className="w-full"
                                            value={lead.status}
                                            onChange={value => updateDisplayLeadStatus(lead, value as LeadStage, isSuiteLead)}
                                            options={realtyLeadStatuses.map(status => ({ value: status, label: t(`realty.leadStatus.${status}`) }))}
                                        />
                                        {isShowingRequest && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => updateDisplayLeadStatus(lead, 'showing_scheduled', isSuiteLead)}
                                                >
                                                    <CalendarDays size={15} />
                                                    {t('realty.leads.actions.confirmShowing')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => updateDisplayLeadStatus(lead, 'completed', isSuiteLead)}
                                                >
                                                    <CheckCircle2 size={15} />
                                                    {t('realty.leads.actions.markCompleted')}
                                                </Button>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-2">
                                            <a
                                                href={getLeadEmailReviewUrl(lead)}
                                                className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-q-text-secondary transition-colors hover:bg-q-surface-overlay hover:text-q-text"
                                            >
                                                <Mail size={15} />
                                                {t('realty.leads.actions.followUp')}
                                            </a>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setLocalWarning(t('realty.leads.actions.appointmentDraftReady'))}
                                            >
                                                <Clock size={15} />
                                                {t('realty.leads.actions.appointment')}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
            if (!canAccessRealtyControl) {
                return <EmptyPanel icon={ShieldCheck} title={t('realty.empty.noControlAccess')} description={t('realty.empty.noControlAccessDesc')} />;
            }
            return (
                <RealtyModuleSettingsPanel
                    flags={suite.flags}
                    isSaving={suite.isSaving}
                    onUpdateFlags={(nextFlags, enabled) => suite.upsertProjectModule(nextFlags, enabled)}
                />
            );
        }

        return (
            <RealtyWorkspaceOverview
                projectName={activeProject?.name || t('realty.selectProject')}
                properties={displayProperties}
                leads={displayLeads}
                activePropertyCount={displayActiveProperties.length}
                newLeadCount={displayNewLeads.length}
                averageListingScore={averageListingScore}
                language={i18n.language}
                onOpenProperty={property => {
                    setActiveTab('properties');
                    startEdit(property);
                }}
                onOpenTab={tab => setActiveTab(tab)}
            />
        );
    };

    const renderDesktopNavGroup = (area: RealtyTabArea, items: RealtyTabItem[]) => {
        if (items.length === 0) return null;
        return (
            <div className="mb-4">
                <div className="mb-2 px-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-q-text-muted">{t(`realty.areas.${area}.navLabel`)}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-q-text-secondary">{t(`realty.areas.${area}.navDescription`)}</p>
                </div>
                {items.map(item => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                        <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-q-accent/15 text-q-accent' : 'text-q-text-secondary hover:bg-q-surface-overlay hover:text-q-text'}`}>
                            <Icon size={17} />
                            {item.label}
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderMobileNavGroup = (area: RealtyTabArea, items: RealtyTabItem[]) => {
        if (items.length === 0) return null;
        return (
            <div className="shrink-0">
                <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-q-text-muted">{t(`realty.areas.${area}.navLabel`)}</p>
                <div className="flex gap-2">
                    {items.map(item => (
                        <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${activeTab === item.id ? 'bg-q-accent text-q-bg' : 'bg-q-surface-overlay text-q-text-secondary'}`}>
                            {item.label}
                        </button>
                    ))}
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
                    {renderDesktopNavGroup('workspace', tabsByArea.workspace)}
                    {renderDesktopNavGroup('control', tabsByArea.control)}
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
                    <div className="flex gap-4 overflow-x-auto">
                        {renderMobileNavGroup('workspace', tabsByArea.workspace)}
                        {renderMobileNavGroup('control', tabsByArea.control)}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
                    {(suite.error || localError) && (
                        <div className="mb-4 rounded-lg border border-q-error/30 bg-q-error/10 p-3 text-sm text-q-error">{localError || suite.error}</div>
                    )}
                    {localWarning && (
                        <div className="mb-4 rounded-lg border border-q-warning/30 bg-q-warning/10 p-3 text-sm text-q-warning">{localWarning}</div>
                    )}
                    {renderAreaIntro()}
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

const PropertyEditorSection = ({
    icon: Icon,
    eyebrow,
    title,
    description,
    children,
    compact = false,
}: {
    icon: React.ElementType;
    eyebrow: string;
    title: string;
    description?: string;
    children: React.ReactNode;
    compact?: boolean;
}) => (
    <section className={`rounded-xl border border-q-border bg-q-surface ${compact ? 'p-4' : 'p-5 md:p-6'}`}>
        <div className={compact ? 'mb-4 flex items-start gap-3' : 'mb-5 flex items-start gap-3'}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-q-border bg-q-bg text-q-accent">
                <Icon size={17} />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{eyebrow}</p>
                <h4 className="mt-1 font-bold text-q-text">{title}</h4>
                {description && <p className="mt-1 text-sm leading-6 text-q-text-secondary">{description}</p>}
            </div>
        </div>
        {children}
    </section>
);

const PropertyEditorField = ({
    label,
    description,
    children,
    className = '',
}: {
    label: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <label className={`block space-y-2 ${className}`}>
        <span className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{label}</span>
        {children}
        {description && <span className="block text-xs leading-5 text-q-text-muted">{description}</span>}
    </label>
);

const PropertyEditorInput = ({ className = '', ...props }: React.ComponentProps<typeof Input>) => (
    <Input className={`h-10 bg-q-bg/50 ${className}`} {...props} />
);

const PropertyEditorTextarea = ({ className = '', ...props }: React.ComponentProps<'textarea'>) => (
    <textarea
        className={`w-full rounded-md border border-q-border bg-q-bg/50 px-3 py-2.5 text-sm leading-6 text-q-text outline-none transition-colors placeholder:text-q-text-muted focus:border-q-accent focus:ring-2 focus:ring-q-accent/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        {...props}
    />
);

const PropertyEditorToggle = ({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`flex min-h-10 items-center justify-between gap-3 rounded-md border border-q-border px-3 py-2 text-left text-sm transition-colors ${checked ? 'bg-q-accent/10 text-q-text' : 'bg-q-bg/50 text-q-text-secondary hover:text-q-text'}`}
    >
        <span className="min-w-0 font-medium">{label}</span>
        <span className={`${checked ? 'bg-q-accent' : 'bg-q-surface-overlay'} relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors`}>
            <span className={`${checked ? 'translate-x-4' : 'translate-x-0'} absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-q-surface shadow transition-transform`} />
        </span>
    </button>
);

const PropertyEditorMetric = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) => (
    <div className="rounded-lg border border-q-border bg-q-bg p-2">
        <Icon size={14} className="text-q-accent" />
        <p className="mt-1 truncate text-[11px] uppercase tracking-wider text-q-text-muted">{label}</p>
        <p className="mt-0.5 font-bold text-q-text">{value}</p>
    </div>
);

const PropertyEditorChecklist = ({
    icon: Icon,
    title,
    items,
    toneClass,
}: {
    icon: React.ElementType;
    title: string;
    items: string[];
    toneClass: string;
}) => (
    <div>
        <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${toneClass}`}>
            <Icon size={14} />
            <span>{title}</span>
        </div>
        <ul className="mt-2 space-y-1 text-xs leading-5 text-q-text-secondary">
            {items.map(item => <li key={item}>• {item}</li>)}
        </ul>
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
