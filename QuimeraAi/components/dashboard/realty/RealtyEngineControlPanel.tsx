import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertCircle,
    Building2,
    CalendarDays,
    DollarSign,
    Eye,
    FileText,
    Globe2,
    Link,
    ListChecks,
    LockKeyhole,
    Megaphone,
    PackageCheck,
    Plus,
    RefreshCw,
    Save,
    ShieldCheck,
    Sparkles,
    Users,
    Workflow,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import DashboardSelect from '../../ui/DashboardSelect';
import type { BusinessBlueprint, CrossModuleSyncDraft, CrossModuleSyncStatus } from '../../../types/businessBlueprint';
import type { RealtyExternalListingDraft, RealtyImportJob, RealtyImportSource, RealtyImportSyncMode } from '../../../types/realty';
import type { RealtyEnginePlan, RealtyEngineRegenerationMode, RealtyEngineRuntimeStatus } from '../../../utils/realtyEngine';
import { formatRealtyPrice } from '../../../utils/realty';
import { REALTY_IMPORT_SOURCES } from '../../../utils/realtyImport';
import type { CrossModuleSyncResult } from '../../../utils/businessBlueprint/crossModuleSync';
import { REALTY_MONETIZATION_BLOCKER_MESSAGES, type RealtyMonetizationOfferDraft, type RealtyMonetizationReadinessBlocker } from '../../../utils/realtyMonetization';
import type { RealtyBlueprintSyncResult } from '../../../services/realty/realtyBlueprintService';

type SelectOption = { value: string; label: string };
type RealtyDraftSyncStatus = 'not_started' | 'previewed' | 'synced_draft' | null;
type RealtyDraftSyncAction = 'preview' | 'create' | null;
type RealtyImportStatus = 'not_started' | 'previewed' | 'synced_draft' | null;
type RealtyImportAction = 'saveSource' | 'preview' | 'create' | null;
type EngineSyncAction = 'preview' | 'create' | null;

interface RealtyEngineControlPanelProps {
    projectData?: unknown;
    enginePlan: RealtyEnginePlan;
    businessBlueprint: BusinessBlueprint | null;
    realtyDraftSyncStatus: RealtyDraftSyncStatus;
    realtyDraftSyncAction: RealtyDraftSyncAction;
    realtyDraftSyncResult: RealtyBlueprintSyncResult | null;
    realtyDraftSyncError: string | null;
    engineSyncStatus: CrossModuleSyncStatus | null;
    engineSyncAction: EngineSyncAction;
    engineSyncResult: CrossModuleSyncResult | null;
    engineSyncError: string | null;
    offerSyncStatus: CrossModuleSyncStatus | null;
    offerSyncAction: EngineSyncAction;
    offerSyncResult: CrossModuleSyncResult | null;
    offerSyncError: string | null;
    realtyOfferDrafts: RealtyMonetizationOfferDraft[];
    importStatus: RealtyImportStatus;
    importAction: RealtyImportAction;
    importError: string | null;
    importSourceId: string;
    importSourceType: RealtyImportSource;
    importSourceName: string;
    importProviderName: string;
    importFeedUrl: string;
    importSyncMode: RealtyImportSyncMode;
    importPayload: string;
    importDrafts: RealtyExternalListingDraft[];
    importCreatedCount: number;
    importJobs: RealtyImportJob[];
    savedImportSourceOptions: SelectOption[];
    importSourceOptions: SelectOption[];
    importSyncModeOptions: SelectOption[];
    onImportSourceIdChange: (value: string) => void;
    onImportSourceTypeChange: (value: RealtyImportSource) => void;
    onImportSourceNameChange: (value: string) => void;
    onImportProviderNameChange: (value: string) => void;
    onImportFeedUrlChange: (value: string) => void;
    onImportSyncModeChange: (value: RealtyImportSyncMode) => void;
    onImportPayloadChange: (value: string) => void;
    onPreviewRealtyBlueprintDrafts: () => void;
    onCreateRealtyBlueprintDrafts: () => void | Promise<void>;
    onSaveRealtyImportSourceConfig: () => void | Promise<void>;
    onResetRealtyImportSourceConfig: () => void;
    onPreviewRealtyImportDrafts: () => void;
    onCreateRealtyImportDrafts: () => void | Promise<void>;
    onPreviewEngineIntegrationDrafts: () => void;
    onCreateEngineIntegrationDrafts: () => void | Promise<void>;
    onPreviewRealtyOfferDrafts: () => void;
    onCreateRealtyOfferDrafts: () => void | Promise<void>;
    onOpenEngineModule: (moduleId: string) => void;
}

const REALTY_IMPORT_SAMPLE = JSON.stringify([
    {
        external_id: 'MLS-12345',
        title: 'Condado Ocean View',
        price: '$850,000',
        address: '100 Ashford Avenue',
        city: 'San Juan',
        state: 'PR',
        postal_code: '00907',
        property_type: 'condo',
        transaction_type: 'sale',
        bedrooms: 2,
        bathrooms: 2,
        area_sqft: 1400,
        amenities: 'Pool, Security, Parking',
    },
], null, 2);

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const getMetadataText = (metadata: unknown, key: string) =>
    isPlainRecord(metadata) && typeof metadata[key] === 'string' ? metadata[key] : '';
const getMetadataNumber = (metadata: unknown, key: string) =>
    isPlainRecord(metadata) && typeof metadata[key] === 'number' ? metadata[key] : 0;

const getProjectRealtyDraftSyncStatus = (projectData: unknown) => {
    const data = isPlainRecord(projectData) ? projectData : {};
    const realtyModule = isPlainRecord(data.realtyModule) ? data.realtyModule : {};
    const draftSync = isPlainRecord(realtyModule.blueprintDraftSync) ? realtyModule.blueprintDraftSync : {};
    return typeof draftSync.status === 'string' ? draftSync.status : 'not_started';
};

const getProjectRealtyImportStagingStatus = (projectData: unknown) => {
    const data = isPlainRecord(projectData) ? projectData : {};
    const realtyModule = isPlainRecord(data.realtyModule) ? data.realtyModule : {};
    const importStaging = isPlainRecord(realtyModule.importStaging) ? realtyModule.importStaging : {};
    return typeof importStaging.status === 'string' ? importStaging.status : 'not_started';
};

const isRealtyChatbotKnowledgeDraft = (draft: CrossModuleSyncDraft) =>
    draft.module === 'chatbot'
    && isPlainRecord(draft.metadata)
    && draft.metadata.realEstateEngine === true
    && typeof draft.metadata.knowledgeType === 'string';

const EngineMetric = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) => (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-q-border bg-q-bg p-3">
        <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{label}</p>
            <p className="mt-1 text-xl font-bold text-q-text">{value}</p>
        </div>
        <Icon size={18} className="shrink-0 text-q-accent" />
    </div>
);

const ENGINE_MODULE_ICONS: Record<string, React.ElementType> = {
    'business-blueprint': Sparkles,
    'website-builder': Globe2,
    'crm-leads': Users,
    'campaign-automation': Megaphone,
    'appointments-open-houses': CalendarDays,
    'commerce-finance': DollarSign,
};

const ENGINE_MESSAGE_KEYS: Record<string, string> = {
    'BusinessBlueprint still needs review.': 'businessBlueprintNeedsReview',
    'Real estate blueprint is not enabled.': 'blueprintDisabled',
    'Website drafts should be reviewed in Website Builder before publishing.': 'websiteReview',
    'Agent or brokerage profile needs license/contact review.': 'profileReview',
    'Create at least one listing draft.': 'createListingDraft',
    'Publish at least one reviewed listing to generate public detail pages.': 'publishReviewedListing',
    'Directory needs reviewed public listings.': 'directoryNeedsListings',
    'Public directory is disabled.': 'directoryDisabled',
    'No open house draft exists yet.': 'noOpenHouse',
    'Confirm appointment availability before enabling automated showing confirmations.': 'confirmAvailability',
    'No real estate leads have been captured yet.': 'noLeads',
    'Generate at least one campaign draft for a listing.': 'generateCampaignDraft',
    'Chatbot knowledge stays draft-only until reviewed in Quimera Chat.': 'chatbotDraft',
    'Email automations are not sent until reviewed and activated in Email Marketing.': 'emailDraft',
    'Digital products and offers need pricing, payments, and fulfillment review.': 'commerceReview',
    'Finance tracking is a draft until payment sources are connected.': 'financeDraft',
    'Analytics event definitions are drafted; runtime tracking still needs implementation review.': 'analyticsDraft',
    'Realty module is disabled.': 'moduleDisabled',
    'AI Studio outputs remain draft or needsReview until a user reviews them.': 'guardrailDraft',
    'User-modified or locked artifacts are preserved during regeneration.': 'guardrailProtected',
    'No email send, chatbot publishing, payment product, appointment automation, or analytics tracking is activated automatically.': 'guardrailNoActivation',
    'Realty leads are routed through existing Supabase/RLS-backed lead sync instead of frontend service credentials.': 'guardrailRls',
    'featured listing promotion': 'opportunityFeaturedListing',
    'seller and buyer nurture sequences': 'opportunityNurture',
    'open house retargeting campaign': 'opportunityOpenHouse',
    'paid buyer consultation': 'opportunityBuyerConsultation',
    'seller valuation package': 'opportunitySellerValuation',
    'neighborhood report': 'opportunityNeighborhoodReport',
    'investment advisory session': 'opportunityInvestmentSession',
    'buyer guide': 'opportunityBuyerGuide',
    'seller consultation': 'opportunitySellerConsultation',
    'investment checklist': 'opportunityInvestmentChecklist',
};

const ENGINE_METRIC_KEYS: Record<string, string> = {
    status: 'status',
    routes: 'routes',
    profile: 'profile',
    properties: 'properties',
    quality: 'quality',
    public: 'public',
    directory: 'directory',
    'open houses': 'openHouses',
    requests: 'requests',
    leads: 'leads',
    sources: 'sources',
    campaigns: 'campaigns',
    drafts: 'drafts',
    'knowledge drafts': 'knowledgeDrafts',
    flows: 'flows',
    offers: 'offers',
    'revenue sources': 'revenueSources',
    events: 'events',
};

function RealtyEngineControlPanel({
    projectData,
    enginePlan,
    businessBlueprint,
    realtyDraftSyncStatus,
    realtyDraftSyncAction,
    realtyDraftSyncResult,
    realtyDraftSyncError,
    engineSyncStatus,
    engineSyncAction,
    engineSyncResult,
    engineSyncError,
    offerSyncStatus,
    offerSyncAction,
    offerSyncResult,
    offerSyncError,
    realtyOfferDrafts,
    importStatus,
    importAction,
    importError,
    importSourceId,
    importSourceType,
    importSourceName,
    importProviderName,
    importFeedUrl,
    importSyncMode,
    importPayload,
    importDrafts,
    importCreatedCount,
    importJobs,
    savedImportSourceOptions,
    importSourceOptions,
    importSyncModeOptions,
    onImportSourceIdChange,
    onImportSourceTypeChange,
    onImportSourceNameChange,
    onImportProviderNameChange,
    onImportFeedUrlChange,
    onImportSyncModeChange,
    onImportPayloadChange,
    onPreviewRealtyBlueprintDrafts,
    onCreateRealtyBlueprintDrafts,
    onSaveRealtyImportSourceConfig,
    onResetRealtyImportSourceConfig,
    onPreviewRealtyImportDrafts,
    onCreateRealtyImportDrafts,
    onPreviewEngineIntegrationDrafts,
    onCreateEngineIntegrationDrafts,
    onPreviewRealtyOfferDrafts,
    onCreateRealtyOfferDrafts,
    onOpenEngineModule,
}: RealtyEngineControlPanelProps) {
    const { t, i18n } = useTranslation();
    const translateEngineStatus = (status: RealtyEngineRuntimeStatus) =>
        t(`realty.engine.status.${status}`, status);
    const translateRegenerationMode = (mode: RealtyEngineRegenerationMode) =>
        t(`realty.engine.regeneration.${mode}`, mode);
    const translateEngineArtifact = (key: string, fallback: string) =>
        t(`realty.engine.artifactLabels.${key}`, fallback);
    const translateArtifactDescription = (key: string, fallback: string) =>
        t(`realty.engine.artifactDescriptions.${key}`, fallback);
    const translateEngineMessage = (message: string) => {
        const key = ENGINE_MESSAGE_KEYS[message];
        return key ? t(`realty.engine.messages.${key}`, message) : message;
    };
    const translateMetricLabel = (label: string) => {
        const key = ENGINE_METRIC_KEYS[label];
        return key ? t(`realty.engine.metricLabels.${key}`, label) : label;
    };
    const translateMetricValue = (label: string, value: string | number) => {
        if (typeof value !== 'string') return value;
        if (label === 'status' && ['draft', 'needs_review', 'configured', 'disabled'].includes(value)) {
            return translateEngineStatus(value as RealtyEngineRuntimeStatus);
        }
        if (label === 'directory' && ['on', 'off'].includes(value)) {
            return t(`realty.engine.metricValues.${value}`, value);
        }
        if (label === 'profile' && ['agent', 'brokerage'].includes(value)) {
            return t(`realty.engine.profileTypes.${value}`, value);
        }
        return value;
    };
    const translateModuleTitle = (moduleId: string, fallback: string) =>
        t(`realty.engine.moduleLabels.${moduleId}`, fallback);
    const translateModuleDescription = (moduleId: string, fallback: string) =>
        t(`realty.engine.moduleDescriptions.${moduleId}`, fallback);
    const translateOfferTitle = (type: string, fallback: string) =>
        t(`realty.engine.offers.types.${type}`, fallback);
    const translateOfferDescription = (type: string, fallback: string) =>
        t(`realty.engine.offers.descriptions.${type}`, fallback);
    const translateOfferCategory = (type: string, fallback: string) =>
        t(`realty.engine.offers.categories.${type}`, fallback);
    const translateOfferBlocker = (blocker: RealtyMonetizationReadinessBlocker) =>
        t(`realty.engine.offers.blockers.${blocker}`, REALTY_MONETIZATION_BLOCKER_MESSAGES[blocker]);
    const getEngineStatusToneClass = (status: RealtyEngineRuntimeStatus) => {
        if (status === 'configured') return 'border-q-success/30 bg-q-success/10 text-q-success';
        if (status === 'needs_review') return 'border-q-warning/30 bg-q-warning/10 text-q-warning';
        if (status === 'disabled') return 'border-q-border bg-q-surface-overlay text-q-text-secondary';
        return 'border-q-accent/30 bg-q-accent/10 text-q-accent';
    };
    const getRegenerationToneClass = (mode: RealtyEngineRegenerationMode) => {
        if (mode === 'locked') return 'border-q-warning/30 bg-q-warning/10 text-q-warning';
        if (mode === 'preserve_user_edits') return 'border-q-accent/30 bg-q-accent/10 text-q-accent';
        return 'border-q-success/30 bg-q-success/10 text-q-success';
    };

    const readinessTone = enginePlan.readinessScore >= 75
        ? 'text-q-success'
        : enginePlan.readinessScore >= 50
            ? 'text-q-warning'
            : 'text-q-error';
    const visibleWarnings = [...enginePlan.blockers, ...enginePlan.warnings].slice(0, 5);
    const primaryArtifacts = enginePlan.artifacts.slice(0, 9);
    const currentRealtyDraftSyncStatus = realtyDraftSyncStatus || getProjectRealtyDraftSyncStatus(projectData);
    const isRealtyDraftSyncBusy = Boolean(realtyDraftSyncAction);
    const isRealtyDraftSynced = currentRealtyDraftSyncStatus === 'synced_draft';
    const realtyDraftSummary = realtyDraftSyncResult?.summary;
    const currentSyncStatus = engineSyncStatus || businessBlueprint?.crossModuleSync?.status || 'not_started';
    const isEngineSyncBusy = Boolean(engineSyncAction);
    const isEngineSynced = currentSyncStatus === 'synced_draft';
    const syncSummary = engineSyncResult?.summary;
    const savedRealtyChatbotKnowledgeDrafts = businessBlueprint?.crossModuleSync?.chatbot?.drafts.filter(isRealtyChatbotKnowledgeDraft) || [];
    const previewRealtyChatbotKnowledgeDrafts = engineSyncResult?.chatbotDrafts.filter(isRealtyChatbotKnowledgeDraft) || [];
    const realtyChatbotKnowledgeDrafts = previewRealtyChatbotKnowledgeDrafts.length > 0
        ? previewRealtyChatbotKnowledgeDrafts
        : savedRealtyChatbotKnowledgeDrafts;
    const realtyChatbotKnowledgePreview = realtyChatbotKnowledgeDrafts.slice(0, 3);
    const savedRealtyOfferDraftCount = businessBlueprint?.crossModuleSync?.ecommerce?.drafts.filter(draft => draft.metadata?.realEstateEngine === true).length || 0;
    const currentOfferSyncStatus = offerSyncStatus || (savedRealtyOfferDraftCount > 0 ? 'synced_draft' : 'not_started');
    const isOfferSyncBusy = Boolean(offerSyncAction);
    const isOfferSynced = currentOfferSyncStatus === 'synced_draft';
    const offerSyncSummary = offerSyncResult?.summary;
    const offerMissingPriceCount = realtyOfferDrafts.filter(offer => offer.readinessBlockers.includes('missing_price')).length;
    const offerPaymentBlockerCount = realtyOfferDrafts.filter(offer => offer.readinessBlockers.includes('payment_not_configured')).length;
    const offerTaxBlockerCount = realtyOfferDrafts.filter(offer => offer.readinessBlockers.includes('tax_not_configured')).length;
    const currentImportStatus = importStatus || getProjectRealtyImportStagingStatus(projectData);
    const isImportBusy = Boolean(importAction);
    const importDuplicateCount = importDrafts.filter(draft => draft.duplicateReviewStatus === 'possible_duplicate').length;
    const importWarningCount = importDrafts.filter(draft => draft.reviewWarnings.length > 0).length;
    const importReadyCount = Math.max(importDrafts.length - importWarningCount, 0);

    return (
        <div className="space-y-6">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-q-border bg-q-bg text-q-accent">
                                    <Workflow size={18} />
                                </span>
                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getEngineStatusToneClass(enginePlan.status)}`}>
                                    {translateEngineStatus(enginePlan.status)}
                                </span>
                            </div>
                            <h1 className="mt-4 text-2xl font-bold text-q-text">{t('realty.engine.title')}</h1>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-q-text-secondary">{t('realty.engine.subtitle')}</p>
                        </div>
                        <div className="w-full rounded-xl border border-q-border bg-q-bg p-4 lg:w-52">
                            <div className="flex items-end justify-between gap-3">
                                <span className="text-sm font-semibold text-q-text-secondary">{t('realty.engine.readiness')}</span>
                                <span className={`text-3xl font-bold ${readinessTone}`}>{enginePlan.readinessScore}%</span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-q-surface-overlay">
                                <div className="h-full rounded-full bg-q-accent transition-all" style={{ width: `${enginePlan.readinessScore}%` }} />
                            </div>
                            <p className="mt-3 text-xs leading-5 text-q-text-secondary">{t('realty.engine.safeGeneration')}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                    <h2 className="font-bold text-q-text">{t('realty.engine.syncPreview')}</h2>
                    <div className="mt-5 grid gap-3">
                        <EngineMetric icon={ListChecks} label={t('realty.engine.needsReviewCount')} value={enginePlan.needsReviewCount} />
                        <EngineMetric icon={LockKeyhole} label={t('realty.engine.protectedCount')} value={enginePlan.protectedArtifactCount} />
                        <EngineMetric icon={ShieldCheck} label={t('realty.engine.connectedArtifacts')} value={enginePlan.artifacts.length} />
                    </div>
                </div>
            </div>

            <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-q-border bg-q-bg text-q-accent">
                                <Building2 size={19} />
                            </span>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-lg font-bold text-q-text">{t('realty.engine.realtyDraftSync')}</h2>
                                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${isRealtyDraftSynced ? 'border-q-success/30 bg-q-success/10 text-q-success' : 'border-q-accent/30 bg-q-accent/10 text-q-accent'}`}>
                                        {t(`realty.engine.realtyDraftStatus.${currentRealtyDraftSyncStatus}`)}
                                    </span>
                                </div>
                                <p className="mt-1 max-w-3xl text-sm leading-6 text-q-text-secondary">{t('realty.engine.realtyDraftSyncDescription')}</p>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-2 text-xs font-semibold text-q-text-secondary sm:grid-cols-2 lg:grid-cols-5">
                            <span className="rounded-md border border-q-border/70 bg-q-bg px-2.5 py-1">{t('realty.engine.realtyDraftModules.profiles')}</span>
                            <span className="rounded-md border border-q-border/70 bg-q-bg px-2.5 py-1">{t('realty.engine.realtyDraftModules.listings')}</span>
                            <span className="rounded-md border border-q-border/70 bg-q-bg px-2.5 py-1">{t('realty.engine.realtyDraftModules.campaigns')}</span>
                            <span className="rounded-md border border-q-border/70 bg-q-bg px-2.5 py-1">{t('realty.engine.realtyDraftModules.openHouses')}</span>
                            <span className="rounded-md border border-q-border/70 bg-q-bg px-2.5 py-1">{t('realty.engine.realtyDraftModules.website')}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row xl:shrink-0">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onPreviewRealtyBlueprintDrafts}
                            disabled={isRealtyDraftSyncBusy || !businessBlueprint?.realEstateBlueprint}
                        >
                            {realtyDraftSyncAction === 'preview' ? <RefreshCw size={16} className="animate-spin" /> : <Eye size={16} />}
                            {t('realty.engine.previewRealtyDrafts')}
                        </Button>
                        <Button
                            type="button"
                            onClick={onCreateRealtyBlueprintDrafts}
                            disabled={isRealtyDraftSyncBusy || !businessBlueprint?.realEstateBlueprint || isRealtyDraftSynced}
                        >
                            {realtyDraftSyncAction === 'create' ? <RefreshCw size={16} className="animate-spin" /> : <PackageCheck size={16} />}
                            {t('realty.engine.createRealtyDrafts')}
                        </Button>
                    </div>
                </div>

                {realtyDraftSyncError && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-q-error/30 bg-q-error/10 p-3 text-sm text-q-error">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{realtyDraftSyncError}</span>
                    </div>
                )}

                {realtyDraftSummary && (
                    <div className="mt-4 rounded-lg border border-q-border/70 bg-q-bg p-4">
                        <div className="grid gap-3 text-sm text-q-text-secondary sm:grid-cols-2 lg:grid-cols-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.realtyDraftShort.profiles')}</p>
                                <p className="mt-1 font-semibold text-q-text">{realtyDraftSummary.profileDrafts}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.realtyDraftShort.listings')}</p>
                                <p className="mt-1 font-semibold text-q-text">{realtyDraftSummary.propertyDrafts}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.realtyDraftShort.campaigns')}</p>
                                <p className="mt-1 font-semibold text-q-text">{realtyDraftSummary.campaignDrafts}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.realtyDraftShort.openHouses')}</p>
                                <p className="mt-1 font-semibold text-q-text">{realtyDraftSummary.openHouseDrafts}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.realtyDraftShort.website')}</p>
                                <p className="mt-1 font-semibold text-q-text">{realtyDraftSummary.websiteDataDrafts}</p>
                            </div>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-q-text-secondary">
                            {realtyDraftSummary.dryRun
                                ? t('realty.engine.realtyPreviewNote')
                                : t('realty.engine.realtyApplyNote', {
                                    created: realtyDraftSummary.created,
                                    skipped: realtyDraftSummary.skipped,
                                })}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-q-text-secondary">{t('realty.engine.realtyNoRuntimeSync')}</p>
                    </div>
                )}
            </section>

            <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-q-border bg-q-bg text-q-accent">
                                <FileText size={19} />
                            </span>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-lg font-bold text-q-text">{t('realty.engine.import.title')}</h2>
                                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${currentImportStatus === 'synced_draft' ? 'border-q-success/30 bg-q-success/10 text-q-success' : 'border-q-accent/30 bg-q-accent/10 text-q-accent'}`}>
                                        {t(`realty.engine.import.status.${currentImportStatus}`, currentImportStatus)}
                                    </span>
                                </div>
                                <p className="mt-1 max-w-3xl text-sm leading-6 text-q-text-secondary">{t('realty.engine.import.description')}</p>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-q-text-secondary">
                            {REALTY_IMPORT_SOURCES.map(source => (
                                <span key={source} className="rounded-md border border-q-border/70 bg-q-bg px-2.5 py-1">{t(`realty.engine.import.sources.${source}`, source)}</span>
                            ))}
                        </div>
                    </div>
                    <span className="rounded-full bg-q-warning/10 px-3 py-1 text-xs font-semibold text-q-warning xl:shrink-0">
                        {t('realty.engine.import.noAutoPublish')}
                    </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                    <div className="space-y-4">
                        <label className="block">
                            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.import.savedSource')}</span>
                            <DashboardSelect
                                value={importSourceId}
                                onChange={value => onImportSourceIdChange(value)}
                                options={savedImportSourceOptions}
                            />
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.import.sourceType')}</span>
                            <DashboardSelect
                                value={importSourceType}
                                onChange={value => onImportSourceTypeChange(value as RealtyImportSource)}
                                options={importSourceOptions}
                            />
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.import.sourceName')}</span>
                            <Input
                                value={importSourceName}
                                onChange={event => onImportSourceNameChange(event.target.value)}
                                placeholder={t('realty.engine.import.sourceNamePlaceholder')}
                            />
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.import.providerName')}</span>
                            <Input
                                value={importProviderName}
                                onChange={event => onImportProviderNameChange(event.target.value)}
                                placeholder={t('realty.engine.import.providerNamePlaceholder')}
                            />
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.import.feedUrl')}</span>
                            <Input
                                value={importFeedUrl}
                                onChange={event => onImportFeedUrlChange(event.target.value)}
                                placeholder={t('realty.engine.import.feedUrlPlaceholder')}
                            />
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.import.syncMode')}</span>
                            <DashboardSelect
                                value={importSyncMode}
                                onChange={value => onImportSyncModeChange(value as RealtyImportSyncMode)}
                                options={importSyncModeOptions}
                            />
                        </label>
                        <div className="grid gap-2">
                            <Button type="button" size="sm" variant="secondary" onClick={onSaveRealtyImportSourceConfig} disabled={isImportBusy}>
                                {importAction === 'saveSource' ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                                {importSourceId ? t('realty.engine.import.updateSource') : t('realty.engine.import.saveSource')}
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={onResetRealtyImportSourceConfig} disabled={isImportBusy}>
                                <Plus size={15} />{t('realty.engine.import.newSource')}
                            </Button>
                        </div>
                        <div className="rounded-lg border border-q-border/70 bg-q-bg p-3 text-xs leading-5 text-q-text-secondary">
                            {t('realty.engine.import.safeNote')}
                        </div>
                        {importJobs.length > 0 && (
                            <div className="rounded-lg border border-q-border/70 bg-q-bg p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.import.recentJobs')}</p>
                                <div className="mt-2 space-y-2">
                                    {importJobs.slice(0, 3).map(job => (
                                        <div key={job.id} className="flex items-center justify-between gap-3 text-xs text-q-text-secondary">
                                            <span className="truncate">{t(`realty.engine.import.sources.${job.sourceType}`, job.sourceType)} · {t(`realty.engine.import.jobStatus.${job.status}`, job.status)}</span>
                                            <span className="shrink-0 font-semibold text-q-text">{job.draftCount}/{job.totalRows}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="min-w-0 space-y-3">
                        <label className="block">
                            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.import.payload')}</span>
                            <textarea
                                value={importPayload}
                                onChange={event => onImportPayloadChange(event.target.value)}
                                placeholder={t('realty.engine.import.payloadPlaceholder')}
                                rows={8}
                                className="min-h-[180px] w-full resize-y rounded-xl border border-q-border bg-q-bg px-3 py-3 font-mono text-xs leading-5 text-q-text outline-none transition focus:border-q-accent focus:ring-2 focus:ring-q-accent/15"
                            />
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <Button type="button" variant="secondary" onClick={() => onImportPayloadChange(REALTY_IMPORT_SAMPLE)} disabled={isImportBusy}>
                                <FileText size={16} />{t('realty.engine.import.loadSample')}
                            </Button>
                            <Button type="button" variant="secondary" onClick={onPreviewRealtyImportDrafts} disabled={isImportBusy || !importPayload.trim()}>
                                {importAction === 'preview' ? <RefreshCw size={16} className="animate-spin" /> : <Eye size={16} />}
                                {t('realty.engine.import.preview')}
                            </Button>
                            <Button type="button" onClick={onCreateRealtyImportDrafts} disabled={isImportBusy || (!importPayload.trim() && importDrafts.length === 0)}>
                                {importAction === 'create' ? <RefreshCw size={16} className="animate-spin" /> : <PackageCheck size={16} />}
                                {t('realty.engine.import.create')}
                            </Button>
                        </div>
                    </div>
                </div>

                {importError && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-q-error/30 bg-q-error/10 p-3 text-sm text-q-error">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{importError}</span>
                    </div>
                )}

                {importDrafts.length > 0 ? (
                    <div className="mt-5 rounded-lg border border-q-border/70 bg-q-bg p-4">
                        <div className="grid gap-3 text-sm text-q-text-secondary sm:grid-cols-2 lg:grid-cols-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.import.summary.staged')}</p>
                                <p className="mt-1 font-semibold text-q-text">{importDrafts.length}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.import.summary.ready')}</p>
                                <p className="mt-1 font-semibold text-q-text">{importReadyCount}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.import.summary.duplicates')}</p>
                                <p className="mt-1 font-semibold text-q-text">{importDuplicateCount}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.import.summary.warnings')}</p>
                                <p className="mt-1 font-semibold text-q-text">{importWarningCount}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.import.summary.created')}</p>
                                <p className="mt-1 font-semibold text-q-text">{importCreatedCount}</p>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            {importDrafts.slice(0, 4).map((draft, index) => (
                                <div key={`${draft.syncKey}-${index}`} className="min-w-0 rounded-lg border border-q-border bg-q-surface p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="truncate text-sm font-bold text-q-text">{draft.title || t('realty.engine.import.untitled')}</h3>
                                            <p className="mt-1 truncate text-xs text-q-text-secondary">{[draft.address || draft.addressLine1, draft.city, draft.state].filter(Boolean).join(', ') || t('realty.engine.import.missingLocation')}</p>
                                        </div>
                                        <span className="shrink-0 text-sm font-semibold text-q-accent">{formatRealtyPrice(draft.price || 0, i18n.language, draft.currency)}</span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="rounded-full border border-q-warning/30 bg-q-warning/10 px-2 py-0.5 text-xs font-semibold text-q-warning">{t('realty.engine.import.needsReview')}</span>
                                        {draft.duplicateReviewStatus === 'possible_duplicate' && (
                                            <span className="rounded-full border border-q-error/30 bg-q-error/10 px-2 py-0.5 text-xs font-semibold text-q-error">{t('realty.engine.import.possibleDuplicate')}</span>
                                        )}
                                        {draft.reviewWarnings.map(warning => (
                                            <span key={`${draft.syncKey}-${warning}`} className="rounded-full border border-q-border bg-q-bg px-2 py-0.5 text-xs font-semibold text-q-text-secondary">
                                                {t(`realty.engine.import.warnings.${warning}`, warning)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="mt-3 text-xs leading-5 text-q-text-secondary">
                            {currentImportStatus === 'synced_draft'
                                ? t('realty.engine.import.applyNote', { created: importCreatedCount })
                                : t('realty.engine.import.previewNote')}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-q-text-secondary">{t('realty.engine.import.noRuntimeSync')}</p>
                    </div>
                ) : (
                    <p className="mt-4 rounded-lg border border-q-border/70 bg-q-bg p-3 text-sm text-q-text-secondary">{t('realty.engine.import.emptyPreview')}</p>
                )}
            </section>

            <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-q-border bg-q-bg text-q-accent">
                                <PackageCheck size={19} />
                            </span>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-lg font-bold text-q-text">{t('realty.engine.integrationDrafts')}</h2>
                                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${isEngineSynced ? 'border-q-success/30 bg-q-success/10 text-q-success' : 'border-q-accent/30 bg-q-accent/10 text-q-accent'}`}>
                                        {t(`realty.engine.syncStatus.${currentSyncStatus}`)}
                                    </span>
                                </div>
                                <p className="mt-1 max-w-3xl text-sm leading-6 text-q-text-secondary">{t('realty.engine.integrationDraftsDescription')}</p>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-2 text-xs font-semibold text-q-text-secondary sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                            <span className="rounded-md border border-q-border/70 bg-q-bg px-2.5 py-1">{t('realty.engine.syncModules.chatbot')}</span>
                            <span className="rounded-md border border-q-border/70 bg-q-bg px-2.5 py-1">{t('realty.engine.syncModules.crm')}</span>
                            <span className="rounded-md border border-q-border/70 bg-q-bg px-2.5 py-1">{t('realty.engine.syncModules.email')}</span>
                            <span className="rounded-md border border-q-border/70 bg-q-bg px-2.5 py-1">{t('realty.engine.syncModules.analytics')}</span>
                            <span className="rounded-md border border-q-border/70 bg-q-bg px-2.5 py-1">{t('realty.engine.syncModules.appointments')}</span>
                            <span className="rounded-md border border-q-border/70 bg-q-bg px-2.5 py-1">{t('realty.engine.syncModules.offers')}</span>
                            <span className="rounded-md border border-q-border/70 bg-q-bg px-2.5 py-1">{t('realty.engine.syncModules.finance')}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row xl:shrink-0">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onPreviewEngineIntegrationDrafts}
                            disabled={isEngineSyncBusy || !businessBlueprint}
                        >
                            {engineSyncAction === 'preview' ? <RefreshCw size={16} className="animate-spin" /> : <Eye size={16} />}
                            {t('realty.engine.previewDrafts')}
                        </Button>
                        <Button
                            type="button"
                            onClick={onCreateEngineIntegrationDrafts}
                            disabled={isEngineSyncBusy || !businessBlueprint || isEngineSynced}
                        >
                            {engineSyncAction === 'create' ? <RefreshCw size={16} className="animate-spin" /> : <PackageCheck size={16} />}
                            {t('realty.engine.createIntegrationDrafts')}
                        </Button>
                    </div>
                </div>

                {engineSyncError && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-q-error/30 bg-q-error/10 p-3 text-sm text-q-error">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{engineSyncError}</span>
                    </div>
                )}

                {syncSummary && (
                    <div className="mt-4 rounded-lg border border-q-border/70 bg-q-bg p-4">
                        <div className="grid gap-3 text-sm text-q-text-secondary sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.syncShort.chatbot')}</p>
                                <p className="mt-1 font-semibold text-q-text">{syncSummary.chatbotDrafts}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.syncShort.crm')}</p>
                                <p className="mt-1 font-semibold text-q-text">{syncSummary.leadDrafts}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.syncShort.email')}</p>
                                <p className="mt-1 font-semibold text-q-text">{syncSummary.emailDrafts}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.syncShort.analytics')}</p>
                                <p className="mt-1 font-semibold text-q-text">{syncSummary.analyticsDrafts}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.syncShort.appointments')}</p>
                                <p className="mt-1 font-semibold text-q-text">{syncSummary.appointmentDrafts}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.syncShort.offers')}</p>
                                <p className="mt-1 font-semibold text-q-text">{syncSummary.ecommerceDrafts}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.syncShort.finance')}</p>
                                <p className="mt-1 font-semibold text-q-text">{syncSummary.financeDrafts}</p>
                            </div>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-q-text-secondary">
                            {syncSummary.dryRun
                                ? t('realty.engine.previewNote')
                                : t('realty.engine.applyNote', {
                                    created: syncSummary.created,
                                    skipped: syncSummary.skipped,
                                })}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-q-text-secondary">{t('realty.engine.noRuntimeSync')}</p>
                        {realtyChatbotKnowledgeDrafts.length > 0 && (
                            <div className="mt-4 rounded-lg border border-q-border bg-q-surface p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-bold text-q-text">{t('realty.engine.chatbotKnowledge.title')}</h3>
                                        <p className="mt-1 max-w-3xl text-xs leading-5 text-q-text-secondary">{t('realty.engine.chatbotKnowledge.description')}</p>
                                    </div>
                                    <span className="w-fit rounded-full border border-q-warning/30 bg-q-warning/10 px-2.5 py-1 text-xs font-semibold text-q-warning">
                                        {t('realty.engine.chatbotKnowledge.draftCount', { count: realtyChatbotKnowledgeDrafts.length })}
                                    </span>
                                </div>
                                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                    {realtyChatbotKnowledgePreview.map(draft => {
                                        const knowledgeType = getMetadataText(draft.metadata, 'knowledgeType');
                                        const reviewedPublicListingCount = getMetadataNumber(draft.metadata, 'reviewedPublicListingCount');
                                        const draftListingCount = getMetadataNumber(draft.metadata, 'draftListingCount');
                                        const blockers = draft.readinessBlockers || [];

                                        return (
                                            <div key={draft.id} className="min-w-0 rounded-lg border border-q-border/70 bg-q-bg p-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-full border border-q-accent/30 bg-q-accent/10 px-2 py-0.5 text-xs font-semibold text-q-accent">
                                                        {t(`realty.engine.chatbotKnowledge.types.${knowledgeType}`, knowledgeType)}
                                                    </span>
                                                    <span className="rounded-full border border-q-warning/30 bg-q-warning/10 px-2 py-0.5 text-xs font-semibold text-q-warning">
                                                        {t('realty.engine.chatbotKnowledge.needsReview')}
                                                    </span>
                                                </div>
                                                <h4 className="mt-3 line-clamp-2 text-sm font-bold text-q-text">{draft.name}</h4>
                                                {draft.description && (
                                                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-q-text-secondary">{draft.description}</p>
                                                )}
                                                {knowledgeType === 'listing_summary' && (
                                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                                        <div className="rounded-md border border-q-border/70 bg-q-surface px-2.5 py-2">
                                                            <p className="font-bold text-q-text">{reviewedPublicListingCount}</p>
                                                            <p className="mt-0.5 text-q-text-secondary">{t('realty.engine.chatbotKnowledge.reviewedListings')}</p>
                                                        </div>
                                                        <div className="rounded-md border border-q-border/70 bg-q-surface px-2.5 py-2">
                                                            <p className="font-bold text-q-text">{draftListingCount}</p>
                                                            <p className="mt-0.5 text-q-text-secondary">{t('realty.engine.chatbotKnowledge.draftListings')}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {blockers.length > 0 && (
                                                    <div className="mt-3 space-y-1">
                                                        {blockers.slice(0, 2).map(blocker => (
                                                            <p key={blocker} className="line-clamp-2 text-xs leading-5 text-q-text-secondary">
                                                                <span className="font-semibold text-q-warning">{t('realty.engine.chatbotKnowledge.blockerPrefix')}</span> {blocker}
                                                            </p>
                                                        ))}
                                                        {blockers.length > 2 && (
                                                            <p className="text-xs font-semibold text-q-text-muted">{t('realty.engine.chatbotKnowledge.moreBlockers', { count: blockers.length - 2 })}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="mt-3 text-xs leading-5 text-q-text-secondary">{t('realty.engine.chatbotKnowledge.noRuntime')}</p>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-q-border bg-q-bg text-q-accent">
                                <DollarSign size={19} />
                            </span>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-lg font-bold text-q-text">{t('realty.engine.offers.title')}</h2>
                                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${isOfferSynced ? 'border-q-success/30 bg-q-success/10 text-q-success' : 'border-q-accent/30 bg-q-accent/10 text-q-accent'}`}>
                                        {t(`realty.engine.syncStatus.${currentOfferSyncStatus}`)}
                                    </span>
                                </div>
                                <p className="mt-1 max-w-3xl text-sm leading-6 text-q-text-secondary">{t('realty.engine.offers.description')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row xl:shrink-0">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onPreviewRealtyOfferDrafts}
                            disabled={isOfferSyncBusy || !businessBlueprint || realtyOfferDrafts.length === 0}
                        >
                            {offerSyncAction === 'preview' ? <RefreshCw size={16} className="animate-spin" /> : <Eye size={16} />}
                            {t('realty.engine.offers.preview')}
                        </Button>
                        <Button
                            type="button"
                            onClick={onCreateRealtyOfferDrafts}
                            disabled={isOfferSyncBusy || !businessBlueprint || realtyOfferDrafts.length === 0}
                        >
                            {offerSyncAction === 'create' ? <RefreshCw size={16} className="animate-spin" /> : <PackageCheck size={16} />}
                            {t('realty.engine.offers.create')}
                        </Button>
                    </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <EngineMetric icon={PackageCheck} label={t('realty.engine.offers.metrics.drafts')} value={realtyOfferDrafts.length} />
                    <EngineMetric icon={DollarSign} label={t('realty.engine.offers.metrics.missingPrice')} value={offerMissingPriceCount} />
                    <EngineMetric icon={LockKeyhole} label={t('realty.engine.offers.metrics.paymentBlockers')} value={offerPaymentBlockerCount} />
                    <EngineMetric icon={ShieldCheck} label={t('realty.engine.offers.metrics.savedDrafts')} value={savedRealtyOfferDraftCount} />
                </div>

                {offerSyncError && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-q-error/30 bg-q-error/10 p-3 text-sm text-q-error">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{offerSyncError}</span>
                    </div>
                )}

                {realtyOfferDrafts.length > 0 ? (
                    <div className="mt-5 grid gap-3 lg:grid-cols-3">
                        {realtyOfferDrafts.slice(0, 9).map(offer => (
                            <div key={offer.type} className="rounded-lg border border-q-border bg-q-bg p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="truncate font-bold text-q-text">{translateOfferTitle(offer.type, offer.title)}</h3>
                                        <p className="mt-1 truncate text-xs font-semibold uppercase tracking-wider text-q-text-muted">{translateOfferCategory(offer.type, offer.category)}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${getEngineStatusToneClass(offer.status === 'needs_review' ? 'needs_review' : offer.status === 'configured' ? 'configured' : offer.status === 'disabled' ? 'disabled' : 'draft')}`}>
                                        {translateEngineStatus(offer.status === 'needs_review' ? 'needs_review' : offer.status === 'configured' ? 'configured' : offer.status === 'disabled' ? 'disabled' : 'draft')}
                                    </span>
                                </div>
                                <p className="mt-3 line-clamp-2 text-sm leading-5 text-q-text-secondary">{translateOfferDescription(offer.type, offer.description)}</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="rounded-full border border-q-border bg-q-surface px-2 py-0.5 text-xs font-semibold text-q-text-secondary">
                                        {t(`realty.engine.offers.priceSource.${offer.priceSource}`, offer.priceSource)}
                                    </span>
                                    <span className="rounded-full border border-q-success/30 bg-q-success/10 px-2 py-0.5 text-xs font-semibold text-q-success">
                                        {t('realty.engine.offers.noStripeProduct')}
                                    </span>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {offer.readinessBlockers.slice(0, 3).map(blocker => (
                                        <div key={`${offer.type}-${blocker}`} className="flex items-start gap-2 text-xs leading-5 text-q-text-secondary">
                                            <AlertCircle size={13} className="mt-0.5 shrink-0 text-q-warning" />
                                            <span>{translateOfferBlocker(blocker)}</span>
                                        </div>
                                    ))}
                                    {offer.readinessBlockers.length > 3 && (
                                        <p className="text-xs font-semibold text-q-text-muted">
                                            {t('realty.engine.offers.moreBlockers', { count: offer.readinessBlockers.length - 3 })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-4 rounded-lg border border-q-border/70 bg-q-bg p-3 text-sm text-q-text-secondary">{t('realty.engine.offers.empty')}</p>
                )}

                {offerSyncSummary && (
                    <div className="mt-4 rounded-lg border border-q-border/70 bg-q-bg p-4">
                        <div className="grid gap-3 text-sm text-q-text-secondary sm:grid-cols-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.syncShort.offers')}</p>
                                <p className="mt-1 font-semibold text-q-text">{offerSyncSummary.ecommerceDrafts}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.syncShort.finance')}</p>
                                <p className="mt-1 font-semibold text-q-text">{offerSyncSummary.financeDrafts}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('realty.engine.offers.metrics.taxBlockers')}</p>
                                <p className="mt-1 font-semibold text-q-text">{offerTaxBlockerCount}</p>
                            </div>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-q-text-secondary">
                            {offerSyncSummary.dryRun
                                ? t('realty.engine.offers.previewNote')
                                : t('realty.engine.offers.applyNote', {
                                    created: offerSyncSummary.created,
                                    skipped: offerSyncSummary.skipped,
                                })}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-q-text-secondary">{t('realty.engine.offers.noRuntimeSync')}</p>
                    </div>
                )}
            </section>

            {visibleWarnings.length > 0 && (
                <div className="rounded-xl border border-q-warning/30 bg-q-warning/10 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={18} className="mt-0.5 shrink-0 text-q-warning" />
                        <div className="min-w-0">
                            <p className="font-semibold text-q-text">{t('realty.engine.reviewSignals')}</p>
                            <ul className="mt-2 space-y-1 text-sm leading-6 text-q-text-secondary">
                                {visibleWarnings.map(item => <li key={item}>• {translateEngineMessage(item)}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('realty.engine.modules')}</p>
                            <h2 className="mt-1 text-lg font-bold text-q-text">{t('realty.engine.connectedModules')}</h2>
                        </div>
                        <span className="rounded-full bg-q-accent/10 px-3 py-1 text-xs font-semibold text-q-accent">{t('realty.engine.noRuntimeActivation')}</span>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        {enginePlan.modules.map(module => {
                            const Icon = ENGINE_MODULE_ICONS[module.id] || Workflow;
                            return (
                                <div key={module.id} className="rounded-xl border border-q-border bg-q-bg p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-q-border bg-q-surface text-q-accent">
                                                <Icon size={17} />
                                            </span>
                                            <div className="min-w-0">
                                                <h3 className="truncate font-bold text-q-text">{translateModuleTitle(module.id, module.title)}</h3>
                                                <p className="mt-1 line-clamp-2 text-sm leading-5 text-q-text-secondary">{translateModuleDescription(module.id, module.description)}</p>
                                            </div>
                                        </div>
                                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${getEngineStatusToneClass(module.status)}`}>
                                            {translateEngineStatus(module.status)}
                                        </span>
                                    </div>
                                    {module.refs.length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {module.refs.slice(0, 3).map(ref => <span key={ref} className="max-w-full truncate rounded-full bg-q-surface-overlay px-2 py-1 text-xs text-q-text-secondary">{ref}</span>)}
                                        </div>
                                    )}
                                    <div className="mt-4 flex justify-end">
                                        <Button type="button" size="sm" variant="secondary" onClick={() => onOpenEngineModule(module.id)}>
                                            <Link size={15} />{t('realty.engine.openModule')}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <aside className="space-y-5">
                    <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('realty.engine.guardrails')}</p>
                        <div className="mt-4 space-y-3">
                            {enginePlan.guardrails.map(item => (
                                <div key={item} className="flex items-start gap-3 rounded-lg border border-q-border bg-q-bg p-3">
                                    <ShieldCheck size={16} className="mt-0.5 shrink-0 text-q-success" />
                                    <p className="text-sm leading-6 text-q-text-secondary">{translateEngineMessage(item)}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('realty.engine.opportunities')}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {enginePlan.opportunities.length > 0
                                ? enginePlan.opportunities.map(item => <span key={item} className="rounded-full bg-q-accent/10 px-3 py-1 text-xs font-semibold text-q-accent">{translateEngineMessage(item)}</span>)
                                : <p className="text-sm leading-6 text-q-text-secondary">{t('realty.engine.noOpportunities')}</p>}
                        </div>
                    </section>
                </aside>
            </div>

            <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('realty.engine.artifacts')}</p>
                        <h2 className="mt-1 text-lg font-bold text-q-text">{t('realty.engine.artifactPipeline')}</h2>
                    </div>
                    <span className="text-xs font-semibold text-q-text-secondary">{t('realty.engine.noOverwrite')}</span>
                </div>
                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                    {primaryArtifacts.map(artifact => (
                        <div key={artifact.id} className="rounded-xl border border-q-border bg-q-bg p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="truncate font-bold text-q-text">{translateEngineArtifact(artifact.key, artifact.title)}</h3>
                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-q-text-secondary">{translateArtifactDescription(artifact.key, artifact.description)}</p>
                                </div>
                                <span className="shrink-0 rounded-full bg-q-surface-overlay px-2 py-0.5 text-xs font-semibold text-q-text-secondary">{artifact.readinessScore}%</span>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getEngineStatusToneClass(artifact.runtimeStatus)}`}>
                                    {translateEngineStatus(artifact.runtimeStatus)}
                                </span>
                                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getRegenerationToneClass(artifact.regenerationMode)}`}>
                                    {translateRegenerationMode(artifact.regenerationMode)}
                                </span>
                            </div>
                            {artifact.metrics.length > 0 && (
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    {artifact.metrics.slice(0, 2).map(metric => (
                                        <div key={`${artifact.id}-${metric.label}`} className="rounded-lg border border-q-border bg-q-surface px-3 py-2">
                                            <p className="truncate text-[11px] uppercase tracking-wider text-q-text-muted">{translateMetricLabel(metric.label)}</p>
                                            <p className="mt-0.5 truncate text-sm font-bold text-q-text">{translateMetricValue(metric.label, metric.value)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );

}

export default RealtyEngineControlPanel;
