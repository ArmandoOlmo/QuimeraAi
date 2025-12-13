
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../../contexts/EditorContext';
import { useAI } from '../../../contexts/ai/AIContext';
import { useProject } from '../../../contexts/project/ProjectContext';
import { useUI } from '../../../contexts/core/UIContext';
import DashboardSidebar from '../DashboardSidebar';
import {
    Menu, Bot, MessageSquare, Settings, Sliders, FileText,
    Save, Sparkles, User, Building2, Globe, Book, Activity, LayoutGrid, ChevronRight, Clock,
    Mic, Radio, BookOpen, ArrowLeft, Package, Shield
} from 'lucide-react';
import ChatSimulator from './ChatSimulator';
import { AiAssistantConfig } from '../../../types';
import FAQManager from './FAQManager';
import KnowledgeDocumentUploader from './KnowledgeDocumentUploader';
import LeadCaptureSettings from './LeadCaptureSettings';
import ChatCustomizationSettings from './ChatCustomizationSettings';

type Tab = 'overview' | 'knowledge' | 'personality' | 'voice' | 'leadCapture' | 'customization' | 'settings';

const voices: { name: AiAssistantConfig['voiceName']; description: string; gender: string }[] = [
    { name: 'Zephyr', description: 'Calm, balanced, professional.', gender: 'Female' },
    { name: 'Puck', description: 'Energetic, friendly, youthful.', gender: 'Male' },
    { name: 'Charon', description: 'Deep, authoritative, trustworthy.', gender: 'Male' },
    { name: 'Kore', description: 'Warm, nurturing, soft.', gender: 'Female' },
    { name: 'Fenrir', description: 'Strong, clear, direct.', gender: 'Male' },
];

const AiAssistantDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { aiAssistantConfig, saveAiAssistantConfig } = useAI();
    const { activeProject, projects, loadProject } = useProject();
    const { setView } = useUI();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [formData, setFormData] = useState<AiAssistantConfig>(aiAssistantConfig);
    const [isSaving, setIsSaving] = useState(false);

    // Sync form data if config updates
    useEffect(() => {
        if (aiAssistantConfig) {
            setFormData(aiAssistantConfig);
        }
    }, [aiAssistantConfig]);

    const handleSave = async () => {
        setIsSaving(true);
        await saveAiAssistantConfig(formData);
        setIsSaving(false);
    };

    const updateForm = (key: keyof AiAssistantConfig, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSelectProject = (projectId: string) => {
        loadProject(projectId, false, false);
    };

    const userProjects = projects.filter(p => p.status !== 'Template');

    if (!activeProject) {
        return (
            <div className="flex h-screen bg-background text-foreground">
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="h-14 px-6 border-b border-border flex items-center justify-between bg-background z-20 shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/40 rounded-full transition-colors">
                                <Menu className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2">
                                <Bot className="text-primary w-5 h-5" />
                                <h1 className="text-lg font-semibold text-foreground">{t('aiAssistant.dashboard.title')}</h1>
                            </div>
                        </div>
                        <button
                            onClick={() => setView('dashboard')}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                            aria-label={t('common.back', 'Volver')}
                        >
                            <ArrowLeft size={16} />
                            <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                        </button>
                    </header>

                    <main className="flex-1 overflow-y-auto p-8 bg-secondary/10">
                        <div className="max-w-5xl mx-auto">
                            <div className="text-center mb-12">
                                <h2 className="text-3xl font-bold mb-4">{t('aiAssistant.dashboard.selectProject')}</h2>
                                <p className="text-muted-foreground max-w-lg mx-auto text-lg">
                                    {t('aiAssistant.dashboard.selectProjectDesc')}
                                </p>
                            </div>

                            {userProjects.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {userProjects.map(project => (
                                        <button
                                            key={project.id}
                                            onClick={() => handleSelectProject(project.id)}
                                            className="group relative rounded-2xl overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 flex flex-col text-left h-[400px]"
                                        >
                                            {/* Full Background Image */}
                                            <img
                                                src={project.thumbnailUrl || 'https://placehold.co/600x400/1e293b/ffffff?text=Project'}
                                                alt={project.name}
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />

                                            {/* Dark Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

                                            {/* Hover Effect */}
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]" />

                                            {/* Content at Bottom */}
                                            <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                                                <h3 className="font-bold text-2xl text-white mb-2 line-clamp-2">{project.name}</h3>
                                                <div className="flex items-center text-white/90">
                                                    <Clock size={16} className="mr-2" />
                                                    <span className="text-sm font-medium">
                                                        Updated {new Date(project.lastUpdated).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                                    <LayoutGrid className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
                                    <h3 className="text-lg font-bold mb-2">{t('aiAssistant.dashboard.noProjects')}</h3>
                                    <p className="text-sm text-muted-foreground mb-6">{t('aiAssistant.dashboard.noProjectsDesc')}</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                            <h3 className="font-bold text-lg mb-4">{t('aiAssistant.dashboard.performanceOverview')}</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-secondary/20 rounded-lg text-center">
                                    <span className="block text-2xl font-bold text-primary">142</span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('aiAssistant.dashboard.chats')}</span>
                                </div>
                                <div className="p-4 bg-secondary/20 rounded-lg text-center">
                                    <span className="block text-2xl font-bold text-green-500">28</span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('aiAssistant.dashboard.leads')}</span>
                                </div>
                                <div className="p-4 bg-secondary/20 rounded-lg text-center">
                                    <span className="block text-2xl font-bold text-blue-500">1.2s</span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('aiAssistant.dashboard.latency')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-xl p-6">
                            <h3 className="font-bold text-lg mb-4">{t('aiAssistant.dashboard.configStatus')}</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border border-border/50">
                                    <div className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span> <span className="text-sm font-medium">{t('aiAssistant.dashboard.businessProfile')}</span></div>
                                    <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">{t('aiAssistant.dashboard.active')}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border border-border/50">
                                    <div className="flex items-center"><span className={`w-2 h-2 rounded-full mr-3 ${formData.enableLiveVoice ? 'bg-green-500' : 'bg-red-500'}`}></span> <span className="text-sm font-medium">{t('aiAssistant.dashboard.liveVoice')}</span></div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${formData.enableLiveVoice ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                                        {formData.enableLiveVoice ? t('aiAssistant.dashboard.enabled') : t('aiAssistant.dashboard.disabled')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'knowledge':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider">
                                <Building2 size={18} className="text-primary" />
                                {t('aiAssistant.dashboard.businessProfile')}
                            </label>
                            <textarea
                                className="w-full bg-card border border-border rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm leading-relaxed"
                                placeholder={t('aiAssistant.dashboard.placeholders.businessProfile')}
                                value={formData.businessProfile}
                                onChange={(e) => updateForm('businessProfile', e.target.value)}
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider">
                                <Package size={18} className="text-primary" />
                                {t('aiAssistant.dashboard.productsServices')}
                            </label>
                            <textarea
                                className="w-full bg-card border border-border rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm leading-relaxed"
                                placeholder={t('aiAssistant.dashboard.placeholders.productsServices')}
                                value={formData.productsServices}
                                onChange={(e) => updateForm('productsServices', e.target.value)}
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider">
                                <Shield size={18} className="text-primary" />
                                {t('aiAssistant.dashboard.policiesContact')}
                            </label>
                            <textarea
                                className="w-full bg-card border border-border rounded-xl p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm leading-relaxed"
                                placeholder={t('aiAssistant.dashboard.placeholders.policiesContact')}
                                value={formData.policiesContact}
                                onChange={(e) => updateForm('policiesContact', e.target.value)}
                            />
                        </div>

                        {/* FAQs Section */}
                        <div className="pt-6 border-t border-border">
                            <div className="flex items-center gap-2 mb-4">
                                <BookOpen size={20} className="text-primary" />
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                                    {t('aiAssistant.dashboard.faqSection')}
                                </h3>
                            </div>
                            <FAQManager
                                faqs={formData.faqs}
                                onFAQsChange={(faqs) => updateForm('faqs', faqs)}
                            />
                        </div>

                        {/* Knowledge Documents Section */}
                        <div className="pt-6 border-t border-border">
                            <div className="flex items-center gap-2 mb-4">
                                <FileText size={20} className="text-primary" />
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                                    {t('aiAssistant.dashboard.knowledgeDocs')}
                                </h3>
                            </div>
                            <KnowledgeDocumentUploader
                                documents={formData.knowledgeDocuments || []}
                                onDocumentsChange={(docs) => updateForm('knowledgeDocuments', docs)}
                            />
                        </div>
                    </div>
                );

            case 'personality':
                return (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                                    <Bot size={18} className="text-primary" />
                                    {t('aiAssistant.dashboard.assistantName')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.agentName}
                                    onChange={(e) => updateForm('agentName', e.target.value)}
                                    className="w-full bg-card border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                                    <Globe size={18} className="text-primary" />
                                    {t('aiAssistant.dashboard.languages')}
                                </label>
                                <div className="flex items-center bg-card border border-border rounded-xl px-3">
                                    <Globe size={18} className="text-muted-foreground mr-2" />
                                    <input
                                        type="text"
                                        value={formData.languages}
                                        onChange={(e) => updateForm('languages', e.target.value)}
                                        className="w-full bg-transparent py-3 focus:outline-none"
                                        placeholder={t('aiAssistant.dashboard.languagesPlaceholder')}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">{t('aiAssistant.dashboard.autoDetect')}</p>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-4">
                                <MessageSquare size={18} className="text-primary" />
                                {t('aiAssistant.dashboard.toneOfVoice')}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {['Professional', 'Playful', 'Urgent', 'Luxury', 'Friendly', 'Minimalist'].map(tone => (
                                    <button
                                        key={tone}
                                        onClick={() => updateForm('tone', tone)}
                                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${formData.tone === tone ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card border-border hover:border-primary/50'}`}
                                    >
                                        {tone}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                                <Sliders size={18} className="text-primary" />
                                {t('aiAssistant.dashboard.systemPrompt')}
                            </label>
                            <textarea
                                className="w-full bg-card border border-border rounded-xl p-4 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y font-mono text-xs"
                                value={formData.specialInstructions}
                                onChange={(e) => updateForm('specialInstructions', e.target.value)}
                            />
                        </div>
                    </div>
                );

            case 'voice':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg flex items-center"><Mic className="mr-2 text-primary" /> {t('aiAssistant.dashboard.enableLiveVoice')}</h3>
                                <p className="text-sm text-muted-foreground">{t('aiAssistant.dashboard.enableLiveVoiceDesc')}</p>
                            </div>
                            <button
                                onClick={() => updateForm('enableLiveVoice', !formData.enableLiveVoice)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.enableLiveVoice ? 'bg-primary' : 'bg-secondary'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.enableLiveVoice ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="bg-card border border-border p-6 rounded-xl">
                            <label className="block text-sm font-bold text-foreground mb-4 flex items-center"><Radio className="mr-2 text-primary" /> {t('aiAssistant.dashboard.selectVoice')}</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {voices.map(v => (
                                    <button
                                        key={v.name}
                                        onClick={() => updateForm('voiceName', v.name)}
                                        className={`p-4 rounded-xl border text-left transition-all hover:shadow-md flex items-center ${formData.voiceName === v.name ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-secondary/10 hover:border-primary/50'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${formData.voiceName === v.name ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                                            {v.gender === 'Male' ? 'M' : 'F'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">{v.name}</h4>
                                            <p className="text-xs text-muted-foreground">{v.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'leadCapture':
                return (
                    <div className="animate-fade-in-up">
                        <LeadCaptureSettings />
                    </div>
                );

            case 'customization':
                return (
                    <div className="animate-fade-in-up">
                        <ChatCustomizationSettings />
                    </div>
                );

            case 'settings':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">{t('aiAssistant.dashboard.activateAssistant')}</h3>
                                <p className="text-sm text-muted-foreground">{t('aiAssistant.dashboard.activateAssistantDesc')}</p>
                            </div>
                            <button
                                onClick={() => updateForm('isActive', !formData.isActive)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isActive ? 'bg-primary' : 'bg-secondary'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                );

            default: return null;
        }
    };

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-14 px-8 border-b border-border flex items-center justify-between bg-background z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center -ml-2 text-muted-foreground hover:text-foreground hover:bg-border/40 rounded-full transition-colors">
                            <Menu className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold text-foreground">{t('aiAssistant.dashboard.title')}</h1>
                            <span className="text-xs text-muted-foreground flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span> {activeProject.name}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 disabled:text-green-500 disabled:hover:bg-transparent"
                        >
                            {isSaving ? (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>{t('aiAssistant.dashboard.saving')}</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>{t('aiAssistant.dashboard.save')}</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => setView('dashboard')}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                            aria-label={t('common.back', 'Volver')}
                        >
                            <ArrowLeft size={16} />
                            <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">

                    {/* LEFT: Configuration Area (Scrollable) */}
                    <div className="lg:col-span-7 xl:col-span-5 flex flex-col border-r border-border bg-background overflow-hidden relative z-10 shadow-[5px_0_30px_-10px_rgba(0,0,0,0.1)]">
                        {/* Tabs Header */}
                        <div className="px-8 pt-8 pb-4">
                            <div className="flex space-x-1 bg-secondary/30 p-1 rounded-xl overflow-x-auto">
                                {[
                                    { id: 'overview', label: t('aiAssistant.dashboard.tabs.overview') },
                                    { id: 'knowledge', label: t('aiAssistant.dashboard.tabs.knowledge') },
                                    { id: 'personality', label: t('aiAssistant.dashboard.tabs.personality') },
                                    { id: 'voice', label: t('aiAssistant.dashboard.tabs.voice') },
                                    { id: 'leadCapture', label: t('aiAssistant.dashboard.tabs.leadCapture') },
                                    { id: 'customization', label: t('aiAssistant.dashboard.tabs.customization') },
                                    { id: 'settings', label: t('aiAssistant.dashboard.tabs.settings') },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as Tab)}
                                        className={`flex-1 py-2.5 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto px-8 pb-10 custom-scrollbar">
                            {renderTabContent()}
                        </div>
                    </div>

                    {/* RIGHT: Widget Preview Area (Fixed/Sticky Feel) */}
                    <div className="hidden lg:flex lg:col-span-5 xl:col-span-7 flex-col bg-muted/30 relative items-center justify-center p-10 overflow-hidden">
                        {/* Dot pattern - visible in both themes */}
                        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#d5d5d5_1px,transparent_1px)] dark:bg-[radial-gradient(#404040_1px,transparent_1px)] [background-size:16px_16px]"></div>

                        <div className="relative z-10 flex flex-col items-center">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-8">{t('aiAssistant.dashboard.liveSimulator')}</h3>

                            {/* iPhone-style Phone Mockup */}
                            <div className="relative">
                                {/* Phone Frame */}
                                <div className="w-[320px] h-[650px] bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-[50px] p-[10px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5),0_30px_60px_-30px_rgba(0,0,0,0.6)] relative">
                                    {/* Inner bezel highlight */}
                                    <div className="absolute inset-[2px] rounded-[48px] bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 pointer-events-none"></div>
                                    
                                    {/* Screen */}
                                    <div className="relative w-full h-full bg-card rounded-[40px] overflow-hidden flex flex-col">
                                        {/* Dynamic Island */}
                                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-black rounded-full z-30 flex items-center justify-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                                            <div className="w-3 h-3 rounded-full bg-zinc-800 ring-1 ring-zinc-700"></div>
                                        </div>

                                        {/* Status Bar */}
                                        <div className="h-12 px-6 flex items-end justify-between pb-1 text-[11px] font-semibold text-foreground z-20">
                                            <span>9:41</span>
                                            <div className="flex items-center gap-1">
                                                {/* Signal */}
                                                <div className="flex items-end gap-[2px] h-3">
                                                    <div className="w-[3px] h-[4px] bg-foreground rounded-sm"></div>
                                                    <div className="w-[3px] h-[6px] bg-foreground rounded-sm"></div>
                                                    <div className="w-[3px] h-[8px] bg-foreground rounded-sm"></div>
                                                    <div className="w-[3px] h-[10px] bg-foreground rounded-sm"></div>
                                                </div>
                                                {/* WiFi */}
                                                <svg className="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 18c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-4.9-2.1l1.4 1.4C9.4 18.1 10.6 18.5 12 18.5s2.6-.4 3.5-1.2l1.4-1.4c-1.3-1.2-3-1.9-4.9-1.9s-3.6.7-4.9 1.9zm-2.8-2.8l1.4 1.4c1.8-1.8 4.3-2.8 6.9-2.8s5.1 1 6.9 2.8l1.4-1.4C18.7 11 15.5 9.7 12 9.7s-6.7 1.3-8.7 3.4zm-2.8-2.8l1.4 1.4C5.3 9.3 8.5 7.7 12 7.7s6.7 1.6 9.1 4l1.4-1.4C19.8 7.5 16.1 5.7 12 5.7S4.2 7.5 1.5 10.3z"/>
                                                </svg>
                                                {/* Battery */}
                                                <div className="flex items-center gap-[2px]">
                                                    <div className="w-6 h-3 border border-foreground rounded-sm flex items-center p-[2px]">
                                                        <div className="w-full h-full bg-foreground rounded-[1px]"></div>
                                                    </div>
                                                    <div className="w-[2px] h-[5px] bg-foreground rounded-r-sm"></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Browser URL Bar */}
                                        <div className="px-3 pb-2">
                                            <div className="h-8 bg-muted/60 rounded-full flex items-center justify-center gap-2 px-3">
                                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                <span className="text-[10px] text-muted-foreground truncate">{activeProject.name.toLowerCase().replace(/\s+/g, '')}.com</span>
                                            </div>
                                        </div>

                                        {/* Website Content */}
                                        <div className="flex-1 overflow-hidden bg-background">
                                            {/* Hero Section */}
                                            <div className="h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent relative overflow-hidden">
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="text-center">
                                                        <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/20 flex items-center justify-center">
                                                            <span className="text-lg">🏪</span>
                                                        </div>
                                                        <span className="text-xs font-bold text-foreground">{activeProject.name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Content Skeleton */}
                                            <div className="p-4 space-y-4">
                                                {/* Product Cards */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-muted/50 rounded-xl p-2 space-y-2">
                                                        <div className="h-16 bg-secondary/60 rounded-lg"></div>
                                                        <div className="h-2 bg-secondary/60 rounded w-3/4"></div>
                                                        <div className="h-2 bg-secondary/60 rounded w-1/2"></div>
                                                    </div>
                                                    <div className="bg-muted/50 rounded-xl p-2 space-y-2">
                                                        <div className="h-16 bg-secondary/60 rounded-lg"></div>
                                                        <div className="h-2 bg-secondary/60 rounded w-3/4"></div>
                                                        <div className="h-2 bg-secondary/60 rounded w-1/2"></div>
                                                    </div>
                                                </div>
                                                
                                                {/* Text Skeleton */}
                                                <div className="space-y-2">
                                                    <div className="h-2 bg-secondary/40 rounded w-full"></div>
                                                    <div className="h-2 bg-secondary/40 rounded w-5/6"></div>
                                                    <div className="h-2 bg-secondary/40 rounded w-4/6"></div>
                                                </div>

                                                {/* CTA Button Skeleton */}
                                                <div className="h-10 bg-primary/20 rounded-full w-3/4 mx-auto"></div>
                                            </div>
                                        </div>

                                        {/* The Real Chat Widget */}
                                        <ChatSimulator config={formData} project={activeProject} />
                                        
                                        {/* Home Indicator */}
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-foreground/30 rounded-full"></div>
                                    </div>
                                </div>
                                
                                {/* Side buttons */}
                                <div className="absolute left-[-2px] top-28 w-[3px] h-8 bg-zinc-700 rounded-l-sm"></div>
                                <div className="absolute left-[-2px] top-44 w-[3px] h-14 bg-zinc-700 rounded-l-sm"></div>
                                <div className="absolute left-[-2px] top-60 w-[3px] h-14 bg-zinc-700 rounded-l-sm"></div>
                                <div className="absolute right-[-2px] top-36 w-[3px] h-20 bg-zinc-700 rounded-r-sm"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiAssistantDashboard;
