
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../../../contexts/admin';
import DashboardSidebar from '../DashboardSidebar';
import { ArrowLeft, MessageSquare, Mic, Radio, Save, CheckCircle, Sliders, Shield, Languages, Eye, Sparkles, X, Menu, RefreshCw, Edit } from 'lucide-react';
import { GlobalAssistantConfig, ScopePermission } from '../../../types';
import { PROMPT_TEMPLATES, getDefaultEnabledTemplates, compileTemplates } from '../../../data/promptTemplates';
import PromptEditorModal from './PromptEditorModal';
import { defaultPrompts } from '../../../data/defaultPrompts';

interface GlobalAssistantSettingsProps {
    onBack: () => void;
}

// Scopes will be translated dynamically
const ALL_SCOPES = [
    { id: 'dashboard', nameKey: 'superadmin.dashboardView', type: 'view' },
    { id: 'websites', nameKey: 'superadmin.websitesList', type: 'view' },
    { id: 'editor', nameKey: 'superadmin.editorView', type: 'view' },
    { id: 'cms', nameKey: 'superadmin.cmsDashboard', type: 'view' },
    { id: 'assets', nameKey: 'superadmin.assetLibrary', type: 'view' },
    { id: 'navigation', nameKey: 'superadmin.navigationManager', type: 'view' },
    { id: 'ai-assistant', nameKey: 'superadmin.aiAssistantView', type: 'view' },
    { id: 'leads', nameKey: 'superadmin.leadsView', type: 'view' },
    { id: 'domains', nameKey: 'superadmin.domainsView', type: 'view' },
    { id: 'seo', nameKey: 'superadmin.seoView', type: 'view' },
    { id: 'finance', nameKey: 'superadmin.financeView', type: 'view' },
    { id: 'templates', nameKey: 'superadmin.templatesView', type: 'view' },
    { id: 'appointments', nameKey: 'superadmin.appointmentsView', type: 'view' },
    { id: 'ecommerce', nameKey: 'superadmin.ecommerceView', type: 'view' },
    { id: 'email', nameKey: 'superadmin.emailView', type: 'view' },
    { id: 'superadmin', nameKey: 'superadmin.superAdminPanel', type: 'view' },
    { id: 'hero', nameKey: 'superadmin.heroSection', type: 'component' },
    { id: 'features', nameKey: 'superadmin.featuresSection', type: 'component' },
    { id: 'testimonials', nameKey: 'superadmin.testimonialsSection', type: 'component' },
    { id: 'pricing', nameKey: 'superadmin.pricingSection', type: 'component' },
    { id: 'faq', nameKey: 'superadmin.faqSection', type: 'component' },
    { id: 'cta', nameKey: 'superadmin.ctaSection', type: 'component' },
    { id: 'services', nameKey: 'superadmin.servicesSection', type: 'component' },
    { id: 'team', nameKey: 'superadmin.teamSection', type: 'component' },
    { id: 'video', nameKey: 'superadmin.videoSection', type: 'component' },
    { id: 'slideshow', nameKey: 'superadmin.slideshowSection', type: 'component' },
    { id: 'portfolio', nameKey: 'superadmin.portfolioSection', type: 'component' },
    { id: 'leads-form', nameKey: 'superadmin.leadsForm', type: 'component' },
    { id: 'newsletter', nameKey: 'superadmin.newsletterSection', type: 'component' },
    { id: 'howItWorks', nameKey: 'superadmin.howItWorksSection', type: 'component' },
    { id: 'footer', nameKey: 'superadmin.footerSection', type: 'component' },
];

const GlobalAssistantSettings: React.FC<GlobalAssistantSettingsProps> = ({ onBack }) => {
    const { t } = useTranslation();

    const voices: { name: GlobalAssistantConfig['voiceName']; description: string; gender: string; genderKey: 'M' | 'F' }[] = [
        { name: 'Zephyr', description: t('superadmin.globalAssistant.voices.zephyr', 'Calm, balanced, professional.'), gender: t('superadmin.female', 'Female'), genderKey: 'F' },
        { name: 'Puck', description: t('superadmin.globalAssistant.voices.puck', 'Energetic, friendly, youthful.'), gender: t('superadmin.male', 'Male'), genderKey: 'M' },
        { name: 'Charon', description: t('superadmin.globalAssistant.voices.charon', 'Deep, authoritative, trustworthy.'), gender: t('superadmin.male', 'Male'), genderKey: 'M' },
        { name: 'Kore', description: t('superadmin.globalAssistant.voices.kore', 'Warm, nurturing, soft.'), gender: t('superadmin.female', 'Female'), genderKey: 'F' },
        { name: 'Fenrir', description: t('superadmin.globalAssistant.voices.fenrir', 'Strong, clear, direct.'), gender: t('superadmin.male', 'Male'), genderKey: 'M' },
    ];
    const { globalAssistantConfig, saveGlobalAssistantConfig, prompts, fetchAllPrompts, syncPrompts } = useAdmin();
    const [formData, setFormData] = useState<GlobalAssistantConfig>(globalAssistantConfig);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
    const [showFinalPreview, setShowFinalPreview] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSyncingPrompts, setIsSyncingPrompts] = useState(false);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [promptToEdit, setPromptToEdit] = useState<any>(null);
    const [initialPrompt, setInitialPrompt] = useState<any>(null);

    useEffect(() => {
        // Ensure defaults for new fields if missing from DB
        setFormData({
            ...globalAssistantConfig,
            permissions: globalAssistantConfig.permissions || {},
            temperature: globalAssistantConfig.temperature ?? 1.0,
            maxTokens: globalAssistantConfig.maxTokens ?? 2048,
            autoDetectLanguage: globalAssistantConfig.autoDetectLanguage ?? true,
            supportedLanguages: globalAssistantConfig.supportedLanguages || 'English, Spanish, French',
            enabledTemplates: globalAssistantConfig.enabledTemplates || getDefaultEnabledTemplates(),
            customInstructions: globalAssistantConfig.customInstructions || ''
        });
    }, [globalAssistantConfig]);

    useEffect(() => {
        // Load prompts for inline editing (Super Admin)
        fetchAllPrompts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateForm = (key: keyof GlobalAssistantConfig, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        setShowSuccess(false);
    };

    const handlePermissionChange = (scopeId: string, type: 'chat' | 'voice', value: boolean) => {
        setFormData(prev => {
            const currentPerms = prev.permissions || {};
            const scopePerm = currentPerms[scopeId] || { chat: true, voice: true };

            return {
                ...prev,
                permissions: {
                    ...currentPerms,
                    [scopeId]: { ...scopePerm, [type]: value }
                }
            };
        });
    };

    const toggleAll = (type: 'chat' | 'voice', value: boolean) => {
        setFormData(prev => {
            const newPerms = { ...prev.permissions };
            ALL_SCOPES.forEach(scope => {
                const existing = newPerms[scope.id] || { chat: true, voice: true };
                newPerms[scope.id] = { ...existing, [type]: value };
            });
            return { ...prev, permissions: newPerms };
        });
    };

    const toggleTemplate = (templateId: string, enabled: boolean) => {
        setFormData(prev => {
            const current = prev.enabledTemplates || [];
            const updated = enabled
                ? [...current, templateId]
                : current.filter(id => id !== templateId);
            return { ...prev, enabledTemplates: updated };
        });
        setShowSuccess(false);
    };

    const isTemplateEnabled = (templateId: string) => {
        return formData.enabledTemplates?.includes(templateId) ?? false;
    };

    const handleSave = async () => {
        setIsSaving(true);
        await saveGlobalAssistantConfig(formData);
        setIsSaving(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const assistantPromptNames = Array.from(new Set([
        'global-assistant-main',
        ...defaultPrompts.filter(p => p.name.startsWith('global-assistant-')).map(p => p.name),
        'onboarding-design-plan',
        'onboarding-website-json',
    ]));

    const openPromptEditor = (name: string) => {
        const dbPrompt = prompts.find(p => p.name === name) || null;
        const defaultPrompt = defaultPrompts.find(p => p.name === name) || null;
        setPromptToEdit(dbPrompt);
        setInitialPrompt(dbPrompt ? null : defaultPrompt);
        setIsPromptModalOpen(true);
    };

    const handleSyncPrompts = async () => {
        setIsSyncingPrompts(true);
        await syncPrompts();
        await fetchAllPrompts();
        setIsSyncingPrompts(false);
    };

    return (
        <>
            <PromptEditorModal
                isOpen={isPromptModalOpen}
                onClose={() => setIsPromptModalOpen(false)}
                promptToEdit={promptToEdit}
                initialPrompt={initialPrompt}
            />
            <div className="flex h-screen bg-editor-bg text-editor-text-primary">
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                        <div className="flex items-center">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary lg:hidden mr-2 transition-colors"
                                title={t('common.openMenu')}
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <MessageSquare className="text-editor-accent w-5 h-5" />
                                <h1 className="text-lg font-semibold text-editor-text-primary">{t('superadmin.globalAssistant.title')}</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={onBack}
                                className="hidden sm:flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-editor-border/40 hover:bg-editor-border text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {t('common.back')}
                            </button>
                            {showSuccess && (
                                <span className="text-sm text-green-400 flex items-center animate-fade-in-up">
                                    <CheckCircle size={16} className="mr-1.5" /> {t('superadmin.globalAssistant.saved', 'Saved')}
                                </span>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {isSaving ? t('superadmin.globalAssistant.saving', 'Saving...') : t('superadmin.globalAssistant.save', 'Save')}
                            </button>
                        </div>
                    </header>

                    {/* Main Content */}
                    <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
                        <div className="max-w-5xl mx-auto space-y-8">

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left Column: General & Scope */}
                                <div className="space-y-8">
                                    {/* Status Section */}
                                    <div className="bg-editor-panel-bg border border-editor-border p-6 rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-lg mb-1">{t('superadmin.globalAssistant.status.title', 'Assistant Status')}</h3>
                                                <p className="text-sm text-editor-text-secondary">{t('superadmin.globalAssistant.status.description', 'Enable or disable global chat assistant.')}</p>
                                            </div>
                                            <button
                                                onClick={() => updateForm('isEnabled', !formData.isEnabled)}
                                                className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isEnabled ? 'bg-editor-accent' : 'bg-editor-border'}`}
                                            >
                                                <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Language Settings (NEW) */}
                                    <div className="bg-editor-panel-bg border border-editor-border p-6 rounded-xl space-y-6">
                                        <h3 className="font-bold text-lg border-b border-editor-border pb-2 flex items-center">
                                            <Languages className="mr-2 text-editor-accent" size={20} /> {t('superadmin.globalAssistant.language.title', 'Language & Intelligence')}
                                        </h3>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-bold text-editor-text-primary">{t('superadmin.globalAssistant.language.autoDetect', 'Auto-Detect Language')}</h4>
                                                <p className="text-xs text-editor-text-secondary">{t('superadmin.globalAssistant.language.autoDetectDesc', "Automatically reply in the user's language.")}</p>
                                            </div>
                                            <button
                                                onClick={() => updateForm('autoDetectLanguage', !formData.autoDetectLanguage)}
                                                className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.autoDetectLanguage ? 'bg-green-500' : 'bg-editor-border'}`}
                                            >
                                                <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.autoDetectLanguage ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>

                                        {!formData.autoDetectLanguage && (
                                            <div>
                                                <label className="block text-sm font-bold text-editor-text-primary mb-2">{t('superadmin.globalAssistant.language.primaryLanguage', 'Primary / Fallback Language')}</label>
                                                <input
                                                    type="text"
                                                    value={formData.supportedLanguages}
                                                    onChange={(e) => updateForm('supportedLanguages', e.target.value)}
                                                    className="w-full bg-editor-bg border border-editor-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-editor-accent outline-none"
                                                    placeholder={t('superadmin.globalAssistant.language.placeholder', 'e.g. English')}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Voice Settings */}
                                    <div className="bg-editor-panel-bg border border-editor-border p-6 rounded-xl space-y-6">
                                        <div className="flex items-center justify-between border-b border-editor-border pb-6">
                                            <div>
                                                <h3 className="font-bold text-lg mb-1 flex items-center"><Mic className="mr-2 text-editor-accent" /> {t('superadmin.globalAssistant.voice.title', 'Voice Settings')}</h3>
                                                <p className="text-sm text-editor-text-secondary">{t('superadmin.globalAssistant.voice.enable', 'Enable Live Voice')}</p>
                                            </div>
                                            <button
                                                onClick={() => updateForm('enableLiveVoice', !formData.enableLiveVoice)}
                                                className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.enableLiveVoice ? 'bg-green-500' : 'bg-editor-border'}`}
                                            >
                                                <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.enableLiveVoice ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-editor-text-primary mb-4 flex items-center"><Radio className="mr-2 text-editor-accent" /> {t('superadmin.globalAssistant.voice.select', 'Select Voice')}</label>
                                            <div className="grid grid-cols-1 gap-3">
                                                {voices.map(v => (
                                                    <button
                                                        key={v.name}
                                                        onClick={() => updateForm('voiceName', v.name)}
                                                        className={`p-3 rounded-xl border text-left transition-all hover:shadow-md flex items-center ${formData.voiceName === v.name ? 'border-editor-accent bg-editor-accent/10 ring-1 ring-editor-accent' : 'border-editor-border bg-editor-bg hover:border-editor-accent/50'}`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 shrink-0 ${formData.voiceName === v.name ? 'bg-editor-accent text-editor-bg' : 'bg-editor-border text-editor-text-secondary'}`}>
                                                            {v.genderKey}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-editor-text-primary text-sm">{v.name}</h4>
                                                            <p className="text-xs text-editor-text-secondary line-clamp-1">{v.description} - {t('superadmin.voiceGender')}: {v.gender}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Advanced Parameters */}
                                    <div className="bg-editor-panel-bg border border-editor-border p-6 rounded-xl space-y-6">
                                        <h3 className="font-bold text-lg border-b border-editor-border pb-2 flex items-center">
                                            <Sliders className="mr-2 text-editor-accent" size={20} /> {t('superadmin.globalAssistant.parameters.title', 'Model Parameters')}
                                        </h3>

                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-sm font-bold text-editor-text-primary">{t('superadmin.globalAssistant.parameters.temperature', 'Temperature (Creativity)')}</label>
                                                <span className="text-xs font-mono bg-editor-bg px-2 py-0.5 rounded border border-editor-border">{formData.temperature}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0" max="2" step="0.1"
                                                value={formData.temperature}
                                                onChange={(e) => updateForm('temperature', parseFloat(e.target.value))}
                                                className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                                            />
                                            <div className="flex justify-between text-xs text-editor-text-secondary mt-1">
                                                <span>{t('superadmin.globalAssistant.parameters.precise', 'Precise')}</span>
                                                <span>{t('superadmin.globalAssistant.parameters.balanced', 'Balanced')}</span>
                                                <span>{t('superadmin.globalAssistant.parameters.creative', 'Creative')}</span>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-sm font-bold text-editor-text-primary">{t('superadmin.globalAssistant.parameters.maxTokens', 'Max Output Tokens')}</label>
                                                <span className="text-xs font-mono bg-editor-bg px-2 py-0.5 rounded border border-editor-border">{formData.maxTokens}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="2048" max="8192" step="256"
                                                value={formData.maxTokens}
                                                onChange={(e) => updateForm('maxTokens', parseInt(e.target.value))}
                                                className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Scope & Permissions */}
                                <div className="space-y-8">
                                    <div className="bg-editor-panel-bg border border-editor-border p-6 rounded-xl flex flex-col">
                                        <div className="flex items-center justify-between border-b border-editor-border pb-4 mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg flex items-center">
                                                    <Shield className="mr-2 text-editor-accent" /> {t('superadmin.globalAssistant.scope.title', 'Scope & Permissions')}
                                                </h3>
                                                <p className="text-sm text-editor-text-secondary">{t('superadmin.globalAssistant.scope.description', 'Configure where the assistant is active and what capabilities it has per scope.')}</p>
                                            </div>
                                        </div>

                                        <div className="flex justify-end space-x-4 mb-2 text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                            <div className="flex items-center space-x-2">
                                                <span>{t('superadmin.globalAssistant.scope.chatEnabled', 'Chat Enabled')}</span>
                                                <button onClick={() => toggleAll('chat', true)} className="text-green-400 hover:underline">{t('superadmin.globalAssistant.scope.add', 'Add')}</button>
                                                <span>/</span>
                                                <button onClick={() => toggleAll('chat', false)} className="text-red-400 hover:underline">{t('superadmin.globalAssistant.scope.remove', 'Remove')}</button>
                                            </div>
                                            <div className="w-px h-4 bg-editor-border mx-2"></div>
                                            <div className="flex items-center space-x-2">
                                                <span>{t('superadmin.globalAssistant.scope.voiceEnabled', 'Voice Enabled')}</span>
                                                <button onClick={() => toggleAll('voice', true)} className="text-green-400 hover:underline">{t('superadmin.globalAssistant.scope.add', 'Add')}</button>
                                                <span>/</span>
                                                <button onClick={() => toggleAll('voice', false)} className="text-red-400 hover:underline">{t('superadmin.globalAssistant.scope.remove', 'Remove')}</button>
                                            </div>
                                        </div>

                                        <div className="mt-2">
                                            <table className="w-full">
                                                <thead className="bg-editor-panel-bg z-10">
                                                    <tr className="text-left text-xs font-bold text-editor-text-secondary uppercase tracking-wider border-b border-editor-border">
                                                        <th className="pb-3 pl-2">{t('superadmin.globalAssistant.scope.columnScope', 'Scope')}</th>
                                                        <th className="pb-3 text-center w-20">{t('superadmin.globalAssistant.scope.columnChat', 'Chat')}</th>
                                                        <th className="pb-3 text-center w-20">{t('superadmin.globalAssistant.scope.columnVoice', 'Voice')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-editor-border">
                                                    {ALL_SCOPES.map((scope) => {
                                                        const perm = formData.permissions?.[scope.id] || { chat: true, voice: true };
                                                        return (
                                                            <tr key={scope.id} className="hover:bg-editor-bg/50 transition-colors">
                                                                <td className="py-3 pl-2">
                                                                    <span className={`text-sm font-medium ${scope.type === 'view' ? 'text-editor-accent' : 'text-editor-text-primary'}`}>
                                                                        {t(scope.nameKey)}
                                                                    </span>
                                                                    <span className="ml-2 text-[10px] text-editor-text-secondary border border-editor-border rounded px-1">
                                                                        {scope.type}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={perm.chat}
                                                                        onChange={(e) => handlePermissionChange(scope.id, 'chat', e.target.checked)}
                                                                        className="w-4 h-4 rounded border-editor-border text-editor-accent focus:ring-editor-accent bg-editor-bg cursor-pointer"
                                                                    />
                                                                </td>
                                                                <td className="py-3 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={perm.voice}
                                                                        onChange={(e) => handlePermissionChange(scope.id, 'voice', e.target.checked)}
                                                                        className="w-4 h-4 rounded border-editor-border text-editor-accent focus:ring-editor-accent bg-editor-bg cursor-pointer"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Instruction Templates */}
                            <div className="bg-editor-panel-bg border border-editor-border p-6 rounded-xl space-y-6">
                                <div className="flex items-center gap-2 border-b border-editor-border pb-2">
                                    <Sparkles size={20} className="text-editor-accent" />
                                    <h3 className="font-bold text-lg">{t('superadmin.globalAssistant.templates.title', 'Instruction Templates')}</h3>
                                </div>
                                <p className="text-sm text-editor-text-secondary">
                                    {t('superadmin.globalAssistant.templates.description', 'Enable pre-defined instruction sets to shape the assistant\'s behavior.')}
                                </p>

                                <div className="space-y-3">
                                    {Object.values(PROMPT_TEMPLATES).map(template => (
                                        <div key={template.id} className="border border-editor-border rounded-lg p-4 hover:border-editor-accent/50 transition-colors">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-medium text-editor-text-primary">{template.name}</h4>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded ${template.category === 'core' ? 'bg-blue-500/20 text-blue-400' :
                                                            template.category === 'multilingual' ? 'bg-green-500/20 text-green-400' :
                                                                template.category === 'technical' ? 'bg-purple-500/20 text-purple-400' :
                                                                    'bg-orange-500/20 text-orange-400'
                                                            }`}>
                                                            {template.category === 'core' ? t('superadmin.categoryCore', 'Core') :
                                                                template.category === 'multilingual' ? t('superadmin.categoryMultilingual', 'Multilingual') :
                                                                    template.category === 'technical' ? t('superadmin.categoryTechnical', 'Technical') :
                                                                        t('superadmin.categoryOther', 'Other')}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-editor-text-secondary mb-2">{template.description}</p>
                                                    <button
                                                        onClick={() => setPreviewTemplate(template.id)}
                                                        className="text-xs text-editor-accent hover:underline"
                                                    >
                                                        <Eye size={12} className="inline mr-1" />
                                                        {t('superadmin.globalAssistant.templates.preview', 'Preview Template')}
                                                    </button>
                                                </div>

                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isTemplateEnabled(template.id)}
                                                        onChange={(e) => toggleTemplate(template.id, e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-editor-bg peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-editor-accent rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-editor-accent"></div>
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Preview Final Instructions Button */}
                                <div className="pt-4 border-t border-editor-border">
                                    <button
                                        onClick={() => setShowFinalPreview(true)}
                                        className="w-full flex items-center justify-center gap-2 bg-editor-accent/10 hover:bg-editor-accent/20 text-editor-accent font-semibold py-3 px-4 rounded-lg transition-colors border border-editor-accent/30"
                                    >
                                        <Eye size={18} />
                                        {t('superadmin.globalAssistant.templates.previewFinal', 'Preview Final Instructions')}
                                    </button>
                                    <p className="text-xs text-editor-text-secondary mt-2 text-center">
                                        {t('superadmin.globalAssistant.templates.selectToPreview', 'Select a template to preview its content')}
                                    </p>
                                </div>

                                {/* Custom Instructions */}
                                <div className="pt-4 border-t border-editor-border">
                                    <label className="block text-sm font-bold text-editor-text-primary mb-2">{t('superadmin.globalAssistant.systemPrompt.title', 'Base System Instruction')}</label>
                                    <p className="text-xs text-editor-text-secondary mb-3">
                                        {t('superadmin.globalAssistant.systemPrompt.description', 'Define the core personality and behavior rules...')}
                                    </p>
                                    <textarea
                                        className="w-full bg-editor-bg border border-editor-border rounded-lg p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-editor-accent resize-y font-mono text-xs text-editor-text-primary leading-relaxed"
                                        value={formData.customInstructions || ''}
                                        onChange={(e) => updateForm('customInstructions', e.target.value)}
                                        placeholder={t('superadmin.globalAssistant.systemPrompt.placeholder', 'Example: Always respond with enthusiasm...')}
                                    />
                                </div>
                            </div>

                            {/* Global Assistant Prompts (editable) */}
                            <div className="bg-editor-panel-bg border border-editor-border p-6 rounded-xl space-y-4">
                                <div className="flex items-center justify-between border-b border-editor-border pb-2">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={20} className="text-editor-accent" />
                                        <h3 className="font-bold text-lg">{t('superadmin.globalAssistant.prompts.title', 'Global Assistant Prompts')}</h3>
                                    </div>
                                    <button
                                        onClick={handleSyncPrompts}
                                        disabled={isSyncingPrompts}
                                        className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-editor-border hover:border-editor-accent/50 transition-colors disabled:opacity-50"
                                        title={t('superadmin.globalAssistant.prompts.syncTitle', 'Sync prompts from database')}
                                    >
                                        <RefreshCw size={14} className={isSyncingPrompts ? 'animate-spin' : ''} />
                                        {isSyncingPrompts ? t('superadmin.globalAssistant.prompts.syncing', 'Syncing...') : t('superadmin.globalAssistant.prompts.sync', 'Sync')}
                                    </button>
                                </div>

                                <p className="text-sm text-editor-text-secondary">
                                    {t('superadmin.globalAssistant.prompts.description', 'Edit the prompts used by the Global Assistant. The assistant uses global-assistant-main as the base instruction.')}
                                </p>

                                <div className="space-y-2">
                                    {assistantPromptNames.map((name) => {
                                        const dbPrompt = prompts.find(p => p.name === name);
                                        const fallback = defaultPrompts.find(p => p.name === name);
                                        const model = dbPrompt?.model || fallback?.model || '—';
                                        const version = dbPrompt?.version || fallback?.version || '—';
                                        const source = dbPrompt ? 'DB' : 'Default';
                                        return (
                                            <div key={name} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-editor-border bg-editor-bg/40">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-editor-text-primary truncate">{name}</p>
                                                        <span className="text-[10px] px-2 py-0.5 rounded border border-editor-border text-editor-text-secondary">
                                                            {source}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-editor-text-secondary font-mono">
                                                        {model} · v{version}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => openPromptEditor(name)}
                                                    className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-editor-accent/10 hover:bg-editor-accent/20 text-editor-accent border border-editor-accent/30 transition-colors"
                                                >
                                                    <Edit size={14} />
                                                    {t('superadmin.globalAssistant.prompts.edit', 'Edit')}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Instructions & Personality */}
                            <div className="bg-editor-panel-bg border border-editor-border p-6 rounded-xl space-y-6">
                                <h3 className="font-bold text-lg border-b border-editor-border pb-2">{t('superadmin.globalAssistant.systemPrompt.title', 'Base System Instruction')}</h3>

                                <div>
                                    <label className="block text-sm font-bold text-editor-text-primary mb-2">{t('superadmin.globalAssistant.systemPrompt.greeting', 'Initial Greeting')}</label>
                                    <input
                                        type="text"
                                        value={formData.greeting}
                                        onChange={(e) => updateForm('greeting', e.target.value)}
                                        className="w-full bg-editor-bg border border-editor-border rounded-lg p-3 focus:ring-2 focus:ring-editor-accent outline-none text-editor-text-primary"
                                        placeholder={t('superadmin.globalAssistant.systemPrompt.greetingPlaceholder', "Hi! I'm your Quimera Assistant...")}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-editor-text-primary mb-2">{t('superadmin.globalAssistant.systemPrompt.title', 'Base System Instruction')}</label>
                                    <p className="text-xs text-editor-text-secondary mb-3">
                                        {t('superadmin.globalAssistant.systemPrompt.description', 'Define the core personality and behavior rules...')}
                                    </p>
                                    <textarea
                                        className="w-full bg-editor-bg border border-editor-border rounded-lg p-4 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-editor-accent resize-y font-mono text-xs text-editor-text-primary leading-relaxed"
                                        value={formData.systemInstruction}
                                        onChange={(e) => updateForm('systemInstruction', e.target.value)}
                                        placeholder={t('superadmin.globalAssistant.systemPrompt.placeholder', 'You are the Quimera.ai Global Assistant...')}
                                    />
                                </div>
                            </div>

                        </div>
                    </main>
                </div>

                {/* Template Preview Modal */}
                {previewTemplate && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewTemplate(null)}>
                        <div className="bg-editor-panel-bg border border-editor-border rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-6 border-b border-editor-border">
                                <div>
                                    <h3 className="text-xl font-bold text-editor-text-primary">{PROMPT_TEMPLATES[previewTemplate]?.name}</h3>
                                    <p className="text-sm text-editor-text-secondary mt-1">{PROMPT_TEMPLATES[previewTemplate]?.description}</p>
                                </div>
                                <button onClick={() => setPreviewTemplate(null)} className="p-2 hover:bg-editor-bg rounded-lg transition-colors">
                                    <X size={20} className="text-editor-text-secondary" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                                <pre className="bg-editor-bg border border-editor-border rounded-lg p-4 text-xs text-editor-text-primary font-mono whitespace-pre-wrap leading-relaxed">
                                    {PROMPT_TEMPLATES[previewTemplate]?.content}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}

                {/* Final Instructions Preview Modal */}
                {showFinalPreview && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowFinalPreview(false)}>
                        <div className="bg-editor-panel-bg border border-editor-border rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-6 border-b border-editor-border">
                                <div>
                                    <h3 className="text-xl font-bold text-editor-text-primary">{t('superadmin.globalAssistant.templates.finalTitle', 'Final Compiled Instructions')}</h3>
                                    <p className="text-sm text-editor-text-secondary mt-1">{t('superadmin.globalAssistant.templates.finalDesc', 'This is exactly what will be sent to the AI model')}</p>
                                </div>
                                <button onClick={() => setShowFinalPreview(false)} className="p-2 hover:bg-editor-bg rounded-lg transition-colors">
                                    <X size={20} className="text-editor-text-secondary" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                                <div className="mb-4 flex items-center gap-2 text-sm text-editor-text-secondary">
                                    <Sparkles size={14} className="text-editor-accent" />
                                    <span>{t('superadmin.globalAssistant.templates.composition', 'Base Instruction + Enabled Templates + Custom Instructions')}</span>
                                </div>
                                <pre className="bg-editor-bg border border-editor-border rounded-lg p-4 text-xs text-editor-text-primary font-mono whitespace-pre-wrap leading-relaxed">
                                    {formData.systemInstruction}
                                    {'\n\n'}
                                    {'='.repeat(80)}
                                    {'\n\n'}
                                    {compileTemplates(formData.enabledTemplates || getDefaultEnabledTemplates(), formData.customInstructions)}
                                </pre>
                                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                    <p className="text-xs text-blue-400">
                                        <strong>Note:</strong> {t('superadmin.globalAssistant.templates.note', 'Scope permissions and contextual data (projects, leads, etc.) are added automatically at runtime and are not shown here.')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default GlobalAssistantSettings;
