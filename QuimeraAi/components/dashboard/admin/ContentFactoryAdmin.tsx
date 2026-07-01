import React, { useEffect, useMemo, useState } from 'react';
import { Factory, Menu, Save, Sparkles } from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import AdminPageHeader from './AdminPageHeader';
import ContentStudioShell from '../../content-studio/ContentStudioShell';
import { supabase } from '../../../supabase';
import { useAuth } from '../../../contexts/core/AuthContext';
import type {
    ContentAuditLogEntry,
    ContentFactoryAdminConfig,
    ContentPreset,
    ContentPresetStatus,
    ContentSafetyPolicy,
} from '../../../types/contentFactoryAdmin';
import type {
    ContentFlowStep,
    ContentFormat,
    ContentGenerationJob,
    ContentPlatform,
    ContentTypeId,
} from '../../../types/contentGeneration';
import {
    createContentCampaign,
    createDefaultContentFactoryAdminConfig,
    serializeContentExportPackage,
} from '../../../utils/contentStudio';

interface ContentFactoryAdminProps {
    onBack: () => void;
}

const SETTINGS_ID = 'contentFactoryAdmin';

const makePresetId = (label: string) => (
    `preset_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'content'}_${Date.now()}`
);

const normalizeConfig = (value: unknown, userId?: string): ContentFactoryAdminConfig => {
    const defaults = createDefaultContentFactoryAdminConfig(new Date().toISOString(), userId);

    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const config = value as Partial<ContentFactoryAdminConfig>;
        if (Array.isArray(config.presets)) {
            const safetyPolicies: ContentSafetyPolicy[] = Array.isArray(config.safetyPolicies)
                ? config.safetyPolicies.map((policy, index) => typeof policy === 'string' ? {
                    id: `legacy_policy_${index + 1}`,
                    label: 'Legacy safety policy',
                    description: policy,
                    category: 'brand_safety',
                    severity: 'warning',
                    isEnabled: true,
                    userMessage: policy,
                } : policy)
                : defaults.safetyPolicies;

            return {
                ...defaults,
                ...config,
                id: 'contentFactoryAdmin',
                presets: config.presets,
                stylePresets: config.stylePresets || defaults.stylePresets,
                formatPresets: config.formatPresets || defaults.formatPresets,
                templatePacks: config.templatePacks || defaults.templatePacks,
                providerRouting: config.providerRouting || defaults.providerRouting,
                generationJobs: config.generationJobs || defaults.generationJobs,
                usage: config.usage || defaults.usage,
                safetyPolicies,
                auditLogs: config.auditLogs || defaults.auditLogs,
            };
        }
    }

    return defaults;
};

const ContentFactoryAdmin: React.FC<ContentFactoryAdminProps> = ({ onBack }) => {
    const { user } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeStep, setActiveStep] = useState<ContentFlowStep>('adminOverview');
    const [config, setConfig] = useState<ContentFactoryAdminConfig>(() => createDefaultContentFactoryAdminConfig(new Date().toISOString(), user?.id));
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(config.presets[0]?.id || null);
    const [brief, setBrief] = useState('Generate a reusable campaign pack for a restaurant promo with food visuals, offer copy, storyboard, and export prompts.');
    const [contentType, setContentType] = useState<ContentTypeId>('template_preview');
    const [formats, setFormats] = useState<ContentFormat[]>(['website_hero', '9:16']);
    const [platforms, setPlatforms] = useState<ContentPlatform[]>(['template_marketplace', 'website']);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const selectedPreset = useMemo(() => (
        config.presets.find(preset => preset.id === selectedPresetId) || config.presets[0] || null
    ), [config.presets, selectedPresetId]);

    const testCampaign = useMemo(() => createContentCampaign({
        brief,
        title: selectedPreset?.label || 'Content Factory test generation',
        contentType,
        formats,
        platforms,
        preset: selectedPreset,
        createdBy: user?.id,
    }), [brief, contentType, formats, platforms, selectedPreset, user?.id]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            const { data, error } = await supabase
                .from('settings')
                .select('config')
                .eq('id', SETTINGS_ID)
                .maybeSingle();

            if (cancelled) return;
            if (error) {
                console.warn('[ContentFactoryAdmin] Could not load config:', error);
                setErrorMessage(error.message || 'Could not load Content Factory config.');
                return;
            }

            const nextConfig = normalizeConfig(data?.config, user?.id);
            setConfig(nextConfig);
            setSelectedPresetId(nextConfig.presets[0]?.id || null);
            setErrorMessage(null);
        };

        load();
        return () => { cancelled = true; };
    }, [user?.id]);

    const saveConfig = async () => {
        setIsSaving(true);
        setErrorMessage(null);
        const now = new Date().toISOString();
        const nextConfig = {
            ...config,
            updatedAt: now,
            updatedBy: user?.id,
        };
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({
                    id: SETTINGS_ID,
                    config: nextConfig,
                    updated_at: now,
                    updated_by: user?.id,
                });

            if (error) throw error;
            setConfig(nextConfig);
            setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } catch (error) {
            console.error('[ContentFactoryAdmin] Could not save config:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Could not save Content Factory config.');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleFormat = (format: ContentFormat) => {
        setFormats(prev => prev.includes(format) ? prev.filter(item => item !== format) : [...prev, format]);
    };

    const togglePlatform = (platform: ContentPlatform) => {
        setPlatforms(prev => prev.includes(platform) ? prev.filter(item => item !== platform) : [...prev, platform]);
    };

    const createPreset = () => {
        const now = new Date().toISOString();
        const base = createDefaultContentFactoryAdminConfig(now, user?.id).presets[0];
        const preset: ContentPreset = {
            ...base,
            id: makePresetId('New Preset'),
            label: 'New Preset',
            description: 'Draft content factory preset.',
            createdAt: now,
            updatedAt: now,
            createdBy: user?.id,
            status: 'admin_draft',
        };
        const auditLog: ContentAuditLogEntry = {
            id: `audit_preset_created_${Date.now()}`,
            action: 'preset_created',
            actorId: user?.id,
            targetId: preset.id,
            targetType: 'preset',
            message: `Created preset ${preset.label}.`,
            createdAt: now,
        };
        setConfig(prev => ({
            ...prev,
            presets: [preset, ...prev.presets],
            usage: {
                ...prev.usage,
                pendingReviewPresets: prev.usage.pendingReviewPresets + 1,
                updatedAt: now,
            },
            auditLogs: [auditLog, ...prev.auditLogs],
            updatedAt: now,
        }));
        setSelectedPresetId(preset.id);
    };

    const updatePreset = (presetId: string, updates: Partial<ContentPreset>) => {
        const now = new Date().toISOString();
        const auditLog: ContentAuditLogEntry = {
            id: `audit_preset_updated_${Date.now()}`,
            action: updates.status === 'published' ? 'preset_published' : 'preset_updated',
            actorId: user?.id,
            targetId: presetId,
            targetType: 'preset',
            message: updates.status ? `Preset moved to ${updates.status}.` : 'Preset updated.',
            createdAt: now,
        };
        setConfig(prev => ({
            ...prev,
            presets: prev.presets.map(preset => preset.id === presetId ? {
                ...preset,
                ...updates,
                updatedAt: now,
                ...(updates.status === 'published' ? { publishedAt: now } : {}),
            } : preset),
            auditLogs: [auditLog, ...prev.auditLogs].slice(0, 50),
            updatedAt: now,
        }));
    };

    const updatePresetStatus = (presetId: string, status: ContentPresetStatus) => {
        updatePreset(presetId, {
            status,
            ...(status === 'published' ? { visibility: 'public' as const } : {}),
        });
    };

    const publishSelectedPreset = () => {
        if (!selectedPreset) return;
        updatePresetStatus(selectedPreset.id, 'published');
        setActiveStep('publishing');
    };

    const testGenerate = () => {
        const now = new Date().toISOString();
        const generationJob: ContentGenerationJob = {
            id: `job_admin_test_${Date.now()}`,
            jobType: 'preset_test',
            status: 'queued',
            campaignId: testCampaign.id,
            providerId: 'quimera-orchestrator-placeholder',
            createdBy: user?.id,
            input: {
                presetId: selectedPreset?.id,
                contentType,
                formats,
                platforms,
                brief,
            },
            attempt: 1,
            createdAt: now,
            updatedAt: now,
        };
        const auditLog: ContentAuditLogEntry = {
            id: `audit_test_generation_${Date.now()}`,
            action: 'test_generation',
            actorId: user?.id,
            targetId: selectedPreset?.id,
            targetType: 'job',
            message: `Queued test generation for ${selectedPreset?.label || 'selected preset'}.`,
            createdAt: now,
        };
        setConfig(prev => ({
            ...prev,
            generationJobs: [generationJob, ...prev.generationJobs].slice(0, 50),
            usage: {
                ...prev.usage,
                generatedThisMonth: prev.usage.generatedThisMonth + 1,
                pendingReviewPresets: prev.presets.filter(preset => preset.status === 'admin_draft' || preset.status === 'testing').length,
                updatedAt: now,
            },
            auditLogs: [auditLog, ...prev.auditLogs].slice(0, 50),
            updatedAt: now,
        }));
        setActiveStep('storyboard');
    };

    return (
        <div className="flex h-screen bg-q-bg text-q-text">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <AdminPageHeader
                    title="Content Factory Admin"
                    icon={<Factory size={20} />}
                    onBack={onBack}
                    onMenuClick={() => setIsMobileMenuOpen(true)}
                    rightContent={
                        <button
                            type="button"
                            onClick={saveConfig}
                            disabled={isSaving}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-q-border bg-q-surface px-3 text-sm font-semibold text-q-text transition-colors hover:border-q-accent/40 disabled:opacity-50"
                        >
                            <Save size={16} />
                            {isSaving ? 'Saving' : 'Save config'}
                        </button>
                    }
                />
                <div className="lg:hidden flex h-12 items-center justify-between border-b border-q-border px-3">
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-q-text-secondary hover:bg-q-surface"
                    >
                        <Menu size={18} />
                    </button>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <Sparkles size={16} className="text-q-accent" />
                        Content Factory Admin
                    </div>
                </div>
                <ContentStudioShell
                    mode="admin"
                    title={`Content Factory Admin / ${selectedPreset?.label || 'Preset'}`}
                    subtitle={errorMessage || (lastSavedAt ? `Saved ${lastSavedAt}` : 'Admin presets, providers, safety, jobs, and publishing')}
                    statusLabel={selectedPreset?.status.replace(/_/g, ' ') || 'Admin Draft'}
                    autosaveLabel={lastSavedAt ? `Saved ${lastSavedAt}` : 'Manual save'}
                    activeStep={activeStep}
                    onStepChange={setActiveStep}
                    brief={brief}
                    onBriefChange={setBrief}
                    contentType={contentType}
                    onContentTypeChange={setContentType}
                    formats={formats}
                    onToggleFormat={toggleFormat}
                    platforms={platforms}
                    onTogglePlatform={togglePlatform}
                    campaign={testCampaign}
                    exportText={serializeContentExportPackage(testCampaign)}
                    isSaving={isSaving}
                    onGenerate={testGenerate}
                    onRegenerate={testGenerate}
                    onSaveVersion={saveConfig}
                    onSaveAdminConfig={saveConfig}
                    onExport={() => setActiveStep('export')}
                    onPublish={publishSelectedPreset}
                    onBack={onBack}
                    adminConfig={config}
                    selectedPresetId={selectedPreset?.id || null}
                    onSelectPreset={setSelectedPresetId}
                    onCreatePreset={createPreset}
                    onUpdatePreset={updatePreset}
                    onPresetStatusChange={updatePresetStatus}
                />
            </div>
        </div>
    );
};

export default ContentFactoryAdmin;
