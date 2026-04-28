import React, { useState, useEffect } from 'react';
import { sanitizeHtml } from '../../../utils/sanitize';
import { useTranslation } from 'react-i18next';
import { Save, Globe, Bot, Shield, FileText, Plus, Edit2, Trash2, Menu } from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import { doc, setDoc, getDoc } from '../../../firebase';
import { db } from '../../../firebase';
import HeaderBackButton from '../../ui/HeaderBackButton';

interface GlobalSEOSettingsProps {
    onBack: () => void;
}

interface GlobalSEOConfig {
    defaultLanguage: string;
    defaultRobots: string;
    defaultSchemaType: string;
    aiCrawlingEnabled: boolean;
    defaultOgType: string;
    defaultTwitterCard: string;
    googleVerification: string;
    bingVerification: string;
    aiDescriptionTemplate: string;
    defaultAiTopics: string;
}

const GlobalSEOSettings: React.FC<GlobalSEOSettingsProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'defaults' | 'templates' | 'verifications' | 'ai'>('defaults');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Default Settings State
    const [defaultLanguage, setDefaultLanguage] = useState('es');
    const [defaultRobots, setDefaultRobots] = useState('index, follow');
    const [defaultSchemaType, setDefaultSchemaType] = useState('WebSite');
    const [defaultOgType, setDefaultOgType] = useState('website');
    const [defaultTwitterCard, setDefaultTwitterCard] = useState('summary_large_image');
    const [aiCrawlingEnabled, setAiCrawlingEnabled] = useState(true);

    // Verifications State
    const [googleVerification, setGoogleVerification] = useState('');
    const [bingVerification, setBingVerification] = useState('');

    // AI Config State
    const [aiDescriptionTemplate, setAiDescriptionTemplate] = useState('Built with Quimera.ai, a powerful no-code website builder. ');
    const [defaultAiTopics, setDefaultAiTopics] = useState('AI, Website Builder, No-Code');

    // Load settings from Firebase
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settingsRef = doc(db, 'globalSettings', 'seo');
                const settingsSnap = await getDoc(settingsRef);

                if (settingsSnap.exists()) {
                    const data = settingsSnap.data() as GlobalSEOConfig;
                    setDefaultLanguage(data.defaultLanguage || 'es');
                    setDefaultRobots(data.defaultRobots || 'index, follow');
                    setDefaultSchemaType(data.defaultSchemaType || 'WebSite');
                    setDefaultOgType(data.defaultOgType || 'website');
                    setDefaultTwitterCard(data.defaultTwitterCard || 'summary_large_image');
                    setAiCrawlingEnabled(data.aiCrawlingEnabled !== undefined ? data.aiCrawlingEnabled : true);
                    setGoogleVerification(data.googleVerification || '');
                    setBingVerification(data.bingVerification || '');
                    setAiDescriptionTemplate(data.aiDescriptionTemplate || 'Built with Quimera.ai, a powerful no-code website builder. ');
                    setDefaultAiTopics(data.defaultAiTopics || 'AI, Website Builder, No-Code');
                }
            } catch (error) {
                console.error('Error loading SEO settings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            const config: GlobalSEOConfig = {
                defaultLanguage,
                defaultRobots,
                defaultSchemaType,
                defaultOgType,
                defaultTwitterCard,
                aiCrawlingEnabled,
                googleVerification,
                bingVerification,
                aiDescriptionTemplate,
                defaultAiTopics,
            };

            const settingsRef = doc(db, 'globalSettings', 'seo');
            await setDoc(settingsRef, config, { merge: true });

            alert(t('common.saveSuccess', { defaultValue: '✅ Settings saved successfully!' }));
        } catch (error) {
            console.error('Error saving SEO settings:', error);
            alert(t('common.errorSaving', { defaultValue: '❌ Error saving settings. Please try again.' }));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-screen bg-q-bg text-q-text">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-q-bg border-b border-q-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="h-9 w-9 flex items-center justify-center text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/40 rounded-full lg:hidden mr-2 transition-colors"
                            title="Open menu"
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Globe className="text-q-accent w-5 h-5" />
                            <div>
                                <h1 className="text-lg font-semibold text-q-text">{t('superadmin.seo.title')}</h1>
                                <p className="text-xs text-q-text-secondary hidden sm:block">{t('superadmin.seo.subtitle')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <HeaderBackButton onClick={onBack} label={t('common.back')} className="border-q-border/60 bg-q-surface/60 text-q-text-secondary hover:bg-q-surface-overlay/40 hover:text-q-text focus:ring-q-accent/25" />
                        <button
                            onClick={handleSaveAll}
                            disabled={isSaving}
                            className="h-9 px-3 text-q-accent font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5 hover:text-q-accent"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? t('superadmin.seo.saving') : t('superadmin.seo.saveAll')}
                        </button>
                    </div>
                </header>

                {/* Tabs */}
                <div className="bg-q-surface border-b border-q-border px-6">
                    <div className="flex gap-4">
                        {[
                            { id: 'defaults', label: t('superadmin.seo.tabs.defaults'), icon: Globe },
                            { id: 'templates', label: t('superadmin.seo.tabs.templates'), icon: FileText },
                            { id: 'verifications', label: t('superadmin.seo.tabs.verifications'), icon: Shield },
                            { id: 'ai', label: t('superadmin.seo.tabs.ai'), icon: Bot }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-q-accent text-q-text'
                                    : 'border-transparent text-q-text-secondary hover:text-q-text'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="max-w-5xl mx-auto">

                        {/* Loading State */}
                        {isLoading && (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-12 h-12 border-4 border-q-accent border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}

                        {!isLoading && (<>


                            {/* Default Settings Tab */}
                            {activeTab === 'defaults' && (
                                <div className="space-y-6">
                                    <div className="bg-q-surface rounded-lg p-6 border border-q-border">
                                        <h2 className="text-xl font-semibold text-q-text mb-4">
                                            {t('superadmin.seo.defaults.title')}
                                        </h2>
                                        <p className="text-q-text-secondary mb-4">
                                            {t('superadmin.seo.defaults.description')}
                                        </p>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-q-text mb-2">
                                                    {t('superadmin.seo.defaults.language')}
                                                </label>
                                                <select
                                                    value={defaultLanguage}
                                                    onChange={(e) => setDefaultLanguage(e.target.value)}
                                                    className="w-full px-4 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent"
                                                >
                                                    <option value="es">Español</option>
                                                    <option value="en">English</option>
                                                    <option value="fr">Français</option>
                                                    <option value="de">Deutsch</option>
                                                    <option value="pt">Português</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-q-text mb-2">
                                                    {t('superadmin.seo.defaults.robots')}
                                                </label>
                                                <select
                                                    value={defaultRobots}
                                                    onChange={(e) => setDefaultRobots(e.target.value)}
                                                    className="w-full px-4 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent"
                                                >
                                                    <option value="index, follow">{t('superadmin.seo.defaults.robotsOptions.indexFollow')}</option>
                                                    <option value="noindex, follow">{t('superadmin.seo.defaults.robotsOptions.noindexFollow')}</option>
                                                    <option value="index, nofollow">{t('superadmin.seo.defaults.robotsOptions.indexNofollow')}</option>
                                                    <option value="noindex, nofollow">{t('superadmin.seo.defaults.robotsOptions.noindexNofollow')}</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-q-text mb-2">
                                                    {t('superadmin.seo.defaults.schemaType')}
                                                </label>
                                                <select
                                                    value={defaultSchemaType}
                                                    onChange={(e) => setDefaultSchemaType(e.target.value)}
                                                    className="w-full px-4 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent"
                                                >
                                                    <option value="WebSite">Website</option>
                                                    <option value="Organization">Organization</option>
                                                    <option value="LocalBusiness">Local Business</option>
                                                    <option value="Article">Article</option>
                                                    <option value="Product">Product</option>
                                                    <option value="Service">Service</option>
                                                </select>
                                            </div>

                                            <div className="flex items-center justify-between p-4 bg-q-bg rounded-lg">
                                                <div>
                                                    <label className="block text-sm font-medium text-q-text">
                                                        {t('superadmin.seo.defaults.aiCrawling')}
                                                    </label>
                                                    <p className="text-xs text-q-text-secondary mt-1">
                                                        {t('superadmin.seo.defaults.aiCrawlingDesc')}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setAiCrawlingEnabled(!aiCrawlingEnabled)}
                                                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${aiCrawlingEnabled ? 'bg-q-accent' : 'bg-gray-600'
                                                        }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aiCrawlingEnabled ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                    />
                                                </button>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-q-text mb-2">
                                                    {t('superadmin.seo.defaults.ogType')}
                                                </label>
                                                <select
                                                    value={defaultOgType}
                                                    onChange={(e) => setDefaultOgType(e.target.value)}
                                                    className="w-full px-4 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent"
                                                >
                                                    <option value="website">Website</option>
                                                    <option value="article">Article</option>
                                                    <option value="product">Product</option>
                                                    <option value="profile">Profile</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-q-text mb-2">
                                                    {t('superadmin.seo.defaults.twitterCard')}
                                                </label>
                                                <select
                                                    value={defaultTwitterCard}
                                                    onChange={(e) => setDefaultTwitterCard(e.target.value)}
                                                    className="w-full px-4 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent"
                                                >
                                                    <option value="summary">Summary</option>
                                                    <option value="summary_large_image">Summary Large Image</option>
                                                    <option value="app">App</option>
                                                    <option value="player">Player</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Templates Tab */}
                            {activeTab === 'templates' && (
                                <div className="space-y-6">
                                    <div className="bg-q-surface rounded-lg p-6 border border-q-border">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-xl font-semibold text-q-text">
                                                {t('superadmin.seo.templates.title')}
                                            </h2>
                                            <button className="px-3 py-2 text-q-accent hover:text-q-accent flex items-center gap-2 text-sm font-medium transition-colors">
                                                <Plus className="w-4 h-4" />
                                                {t('superadmin.seo.templates.create')}
                                            </button>
                                        </div>
                                        <p className="text-q-text-secondary mb-4">
                                            {t('superadmin.seo.templates.description')}
                                        </p>

                                        {/* Template List */}
                                        <div className="space-y-3">
                                            {[
                                                { name: t('superadmin.seo.templates.items.ecommerce.name'), description: t('superadmin.seo.templates.items.ecommerce.desc'), keywords: 'shop, buy, products' },
                                                { name: t('superadmin.seo.templates.items.blog.name'), description: t('superadmin.seo.templates.items.blog.desc'), keywords: 'blog, articles, news' },
                                                { name: t('superadmin.seo.templates.items.portfolio.name'), description: t('superadmin.seo.templates.items.portfolio.desc'), keywords: 'portfolio, work, projects' },
                                                { name: t('superadmin.seo.templates.items.local.name'), description: t('superadmin.seo.templates.items.local.desc'), keywords: 'local, business, services' },
                                                { name: t('superadmin.seo.templates.items.saas.name'), description: t('superadmin.seo.templates.items.saas.desc'), keywords: 'saas, software, platform' }
                                            ].map((template) => (
                                                <div key={template.name} className="flex items-center justify-between p-4 bg-q-bg rounded-lg border border-q-border hover:border-q-accent transition-colors">
                                                    <div className="flex-1">
                                                        <h3 className="font-medium text-q-text">{template.name}</h3>
                                                        <p className="text-sm text-q-text-secondary mt-1">{template.description}</p>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {template.keywords.split(', ').map(keyword => (
                                                                <span key={keyword} className="text-xs px-2 py-1 bg-q-accent/20 text-q-accent rounded">
                                                                    {keyword}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 ml-4">
                                                        <button className="p-2 text-q-text-secondary hover:text-q-accent transition-colors" title="Edit">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button className="p-2 text-q-text-secondary hover:text-red-500 transition-colors" title="Delete">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Verifications Tab */}
                            {activeTab === 'verifications' && (
                                <div className="space-y-6">
                                    <div className="bg-q-surface rounded-lg p-6 border border-q-border">
                                        <h2 className="text-xl font-semibold text-q-text mb-4">
                                            {t('superadmin.seo.verifications.title')}
                                        </h2>
                                        <p className="text-q-text-secondary mb-4">
                                            {t('superadmin.seo.verifications.description')}
                                        </p>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-q-text mb-2">
                                                    Google Search Console Verification
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Enter verification code"
                                                    value={googleVerification}
                                                    onChange={(e) => setGoogleVerification(e.target.value)}
                                                    className="w-full px-4 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent"
                                                />
                                                <p className="text-xs text-q-text-secondary mt-1">
                                                    {t('superadmin.seo.verifications.googleHelper')}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-q-text mb-2">
                                                    {t('superadmin.seo.verifications.googleLabel')}
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder={t('superadmin.seo.verifications.placeholder')}
                                                    value={bingVerification}
                                                    onChange={(e) => setBingVerification(e.target.value)}
                                                    className="w-full px-4 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent"
                                                />
                                                <p className="text-xs text-q-text-secondary mt-1">
                                                    {t('superadmin.seo.verifications.bingHelper')}
                                                </p>
                                            </div>

                                            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                                <h3 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                                                    <Shield className="w-4 h-4" />
                                                    {t('superadmin.seo.verifications.howTo.title')}
                                                </h3>
                                                <ul className="text-sm text-q-text-secondary space-y-2">
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-blue-400 mt-0.5">•</span>
                                                        <div>
                                                            <strong className="text-q-text">{t('superadmin.seo.verifications.howTo.google')}:</strong>
                                                            <br />
                                                            <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                                                https://search.google.com/search-console
                                                            </a>
                                                            <br />
                                                            <span className="text-xs">{t('superadmin.seo.verifications.howTo.googleStep')}</span>
                                                        </div>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-blue-400 mt-0.5">•</span>
                                                        <div>
                                                            <strong className="text-q-text">{t('superadmin.seo.verifications.howTo.bing')}:</strong>
                                                            <br />
                                                            <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                                                https://www.bing.com/webmasters
                                                            </a>
                                                            <br />
                                                            <span className="text-xs">{t('superadmin.seo.verifications.howTo.bingStep')}</span>
                                                        </div>
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                                                <h3 className="font-medium text-green-400 mb-2">✨ {t('superadmin.seo.verifications.benefits.title')}</h3>
                                                <ul className="text-sm text-q-text-secondary space-y-1">
                                                    {(() => { const list = t('superadmin.seo.verifications.benefits.list', { returnObjects: true }); return Array.isArray(list) ? list : []; })().map((benefit: string, i: number) => (
                                                        <li key={i}>• {benefit}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AI Bot Config Tab */}
                            {activeTab === 'ai' && (
                                <div className="space-y-6">
                                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                                        <div className="flex gap-3">
                                            <Bot className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h3 className="font-medium text-blue-400 mb-1">{t('superadmin.seo.ai.bannerTitle')}</h3>
                                                <p className="text-sm text-q-text-secondary">
                                                    {t('superadmin.seo.ai.bannerDesc')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-q-surface rounded-lg p-6 border border-q-border">
                                        <h2 className="text-xl font-semibold text-q-text mb-4">
                                            {t('superadmin.seo.ai.title')}
                                        </h2>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-q-text mb-2">
                                                    {t('superadmin.seo.ai.descTemplateLabel')}
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    placeholder={t('superadmin.seo.ai.descTemplatePlaceholder')}
                                                    value={aiDescriptionTemplate}
                                                    onChange={(e) => setAiDescriptionTemplate(e.target.value)}
                                                    className="w-full px-4 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent"
                                                />
                                                <p className="text-xs text-q-text-secondary mt-1">
                                                    {t('superadmin.seo.ai.descTemplateHelper')}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-q-text mb-2">
                                                    {t('superadmin.seo.ai.topicsLabel')}
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder={t('superadmin.seo.ai.topicsPlaceholder')}
                                                    value={defaultAiTopics}
                                                    onChange={(e) => setDefaultAiTopics(e.target.value)}
                                                    className="w-full px-4 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent"
                                                />
                                                <p className="text-xs text-q-text-secondary mt-1">
                                                    {t('superadmin.seo.ai.topicsHelper')}
                                                </p>
                                            </div>

                                            <div className="bg-q-bg rounded-lg p-4">
                                                <h3 className="font-medium text-q-text mb-3 flex items-center gap-2">
                                                    <Bot className="w-5 h-5 text-q-accent" />
                                                    {t('superadmin.seo.ai.supportedEngines')}
                                                </h3>
                                                <p className="text-sm text-q-text-secondary mb-3">
                                                    {t('superadmin.seo.ai.supportedEnginesDesc')}
                                                </p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[
                                                        { name: 'Perplexity AI', status: 'active' },
                                                        { name: 'ChatGPT (OpenAI)', status: 'active' },
                                                        { name: 'Google Gemini', status: 'active' },
                                                        { name: 'Bing Copilot', status: 'active' },
                                                        { name: 'Claude (Anthropic)', status: 'active' },
                                                        { name: 'You.com', status: 'active' }
                                                    ].map(engine => (
                                                        <div key={engine.name} className="flex items-center gap-2 text-q-text-secondary">
                                                            <div className={`w-2 h-2 rounded-full ${engine.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`} />
                                                            <span className="text-sm">{engine.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                                <h3 className="font-medium text-purple-400 mb-2">🚀 {t('superadmin.seo.ai.special.title')}</h3>
                                                <ul className="text-sm text-q-text-secondary space-y-2">
                                                    {(() => { const list = t('superadmin.seo.ai.special.list', { returnObjects: true }); return Array.isArray(list) ? list : []; })().map((box: string, i: number) => (
                                                        <li key={i}>• <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(box) }} /></li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-q-surface rounded-lg p-6 border border-q-border">
                                        <h2 className="text-xl font-semibold text-q-text mb-4">
                                            {t('superadmin.seo.ai.metaTags.title')}
                                        </h2>
                                        <p className="text-q-text-secondary mb-4">
                                            {t('superadmin.seo.ai.metaTags.description')}
                                        </p>

                                        <div className="space-y-3">
                                            <div className="p-3 bg-q-bg rounded-lg font-mono text-sm">
                                                <div className="text-q-text-secondary">&lt;meta name="<span className="text-q-accent">ai:crawlable</span>" content="true" /&gt;</div>
                                                <p className="text-xs text-q-text-secondary mt-1 font-sans">{t('superadmin.seo.ai.metaTags.crawlable')}</p>
                                            </div>
                                            <div className="p-3 bg-q-bg rounded-lg font-mono text-sm">
                                                <div className="text-q-text-secondary">&lt;meta name="<span className="text-q-accent">ai:description</span>" content="..." /&gt;</div>
                                                <p className="text-xs text-q-text-secondary mt-1 font-sans">{t('superadmin.seo.ai.metaTags.descriptionTag')}</p>
                                            </div>
                                            <div className="p-3 bg-q-bg rounded-lg font-mono text-sm">
                                                <div className="text-q-text-secondary">&lt;meta name="<span className="text-q-accent">ai:topics</span>" content="..." /&gt;</div>
                                                <p className="text-xs text-q-text-secondary mt-1 font-sans">{t('superadmin.seo.ai.metaTags.topicsTag')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalSEOSettings;
