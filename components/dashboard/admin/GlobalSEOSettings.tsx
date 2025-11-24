import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Globe, Bot, Shield, FileText, Plus, Edit2, Trash2, Menu } from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import { useEditor } from '../../../contexts/EditorContext';
import { doc, setDoc, getDoc } from '../../../firebase';
import { db } from '../../../firebase';

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
            
            alert('✅ Settings saved successfully!');
        } catch (error) {
            console.error('Error saving SEO settings:', error);
            alert('❌ Error saving settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-full lg:hidden mr-2 transition-colors"
                            title="Open menu"
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Globe className="text-editor-accent w-5 h-5" />
                            <div>
                                <h1 className="text-lg font-semibold text-editor-text-primary">Global SEO Settings</h1>
                                <p className="text-xs text-editor-text-secondary hidden sm:block">Configure system-wide SEO defaults</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleSaveAll}
                            disabled={isSaving}
                            className="h-9 px-4 bg-editor-accent text-white font-medium text-sm rounded-md hover:bg-editor-accent-hover transition-colors disabled:opacity-50 shadow-sm flex items-center gap-1.5"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saving...' : 'Save All'}
                        </button>
                        <button
                            onClick={onBack}
                            className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Admin
                        </button>
                    </div>
                </header>

            {/* Tabs */}
            <div className="bg-editor-panel-bg border-b border-editor-border px-6">
                <div className="flex gap-4">
                    {[
                        { id: 'defaults', label: 'Default Settings', icon: Globe },
                        { id: 'templates', label: 'SEO Templates', icon: FileText },
                        { id: 'verifications', label: 'Site Verifications', icon: Shield },
                        { id: 'ai', label: 'AI Bot Config', icon: Bot }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-editor-accent text-editor-text-primary'
                                    : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'
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
                            <div className="w-12 h-12 border-4 border-editor-accent border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                    
                    {!isLoading && (<>
                        
                    
                    {/* Default Settings Tab */}
                    {activeTab === 'defaults' && (
                        <div className="space-y-6">
                            <div className="bg-editor-panel-bg rounded-lg p-6 border border-editor-border">
                                <h2 className="text-xl font-semibold text-editor-text-primary mb-4">
                                    Default SEO Configuration
                                </h2>
                                <p className="text-editor-text-secondary mb-4">
                                    These settings will be applied to all new projects by default.
                                </p>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-editor-text-primary mb-2">
                                            Default Language
                                        </label>
                                        <select 
                                            value={defaultLanguage}
                                            onChange={(e) => setDefaultLanguage(e.target.value)}
                                            className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                        >
                                            <option value="es">Español</option>
                                            <option value="en">English</option>
                                            <option value="fr">Français</option>
                                            <option value="de">Deutsch</option>
                                            <option value="pt">Português</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-editor-text-primary mb-2">
                                            Default Robots Setting
                                        </label>
                                        <select 
                                            value={defaultRobots}
                                            onChange={(e) => setDefaultRobots(e.target.value)}
                                            className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                        >
                                            <option value="index, follow">Index, Follow (Recommended)</option>
                                            <option value="noindex, follow">No Index, Follow</option>
                                            <option value="index, nofollow">Index, No Follow</option>
                                            <option value="noindex, nofollow">No Index, No Follow</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-editor-text-primary mb-2">
                                            Default Schema Type
                                        </label>
                                        <select 
                                            value={defaultSchemaType}
                                            onChange={(e) => setDefaultSchemaType(e.target.value)}
                                            className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                        >
                                            <option value="WebSite">Website</option>
                                            <option value="Organization">Organization</option>
                                            <option value="LocalBusiness">Local Business</option>
                                            <option value="Article">Article</option>
                                            <option value="Product">Product</option>
                                            <option value="Service">Service</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-editor-bg rounded-lg">
                                        <div>
                                            <label className="block text-sm font-medium text-editor-text-primary">
                                                Enable AI Crawling by Default
                                            </label>
                                            <p className="text-xs text-editor-text-secondary mt-1">
                                                New projects will allow AI bots to crawl by default
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => setAiCrawlingEnabled(!aiCrawlingEnabled)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                aiCrawlingEnabled ? 'bg-editor-accent' : 'bg-gray-600'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    aiCrawlingEnabled ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-editor-text-primary mb-2">
                                            Default OG Type
                                        </label>
                                        <select 
                                            value={defaultOgType}
                                            onChange={(e) => setDefaultOgType(e.target.value)}
                                            className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                        >
                                            <option value="website">Website</option>
                                            <option value="article">Article</option>
                                            <option value="product">Product</option>
                                            <option value="profile">Profile</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-editor-text-primary mb-2">
                                            Default Twitter Card Type
                                        </label>
                                        <select 
                                            value={defaultTwitterCard}
                                            onChange={(e) => setDefaultTwitterCard(e.target.value)}
                                            className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
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
                            <div className="bg-editor-panel-bg rounded-lg p-6 border border-editor-border">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold text-editor-text-primary">
                                        SEO Templates
                                    </h2>
                                    <button className="px-4 py-2 bg-editor-accent text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2">
                                        <Plus className="w-4 h-4" />
                                        Create Template
                                    </button>
                                </div>
                                <p className="text-editor-text-secondary mb-4">
                                    Create reusable SEO templates that users can apply to their projects.
                                </p>
                                
                                {/* Template List */}
                                <div className="space-y-3">
                                    {[
                                        { name: 'E-commerce', description: 'Optimized for online stores', keywords: 'shop, buy, products' },
                                        { name: 'Blog/News', description: 'Perfect for content sites', keywords: 'blog, articles, news' },
                                        { name: 'Portfolio', description: 'Showcase your work', keywords: 'portfolio, work, projects' },
                                        { name: 'Local Business', description: 'For local services', keywords: 'local, business, services' },
                                        { name: 'SaaS Product', description: 'Software as a Service', keywords: 'saas, software, platform' }
                                    ].map((template) => (
                                        <div key={template.name} className="flex items-center justify-between p-4 bg-editor-bg rounded-lg border border-editor-border hover:border-editor-accent transition-colors">
                                            <div className="flex-1">
                                                <h3 className="font-medium text-editor-text-primary">{template.name}</h3>
                                                <p className="text-sm text-editor-text-secondary mt-1">{template.description}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {template.keywords.split(', ').map(keyword => (
                                                        <span key={keyword} className="text-xs px-2 py-1 bg-editor-accent/20 text-editor-accent rounded">
                                                            {keyword}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 ml-4">
                                                <button className="p-2 text-editor-text-secondary hover:text-editor-accent transition-colors" title="Edit">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 text-editor-text-secondary hover:text-red-500 transition-colors" title="Delete">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                <h3 className="font-medium text-blue-400 mb-2">💡 Pro Tip</h3>
                                <p className="text-sm text-editor-text-secondary">
                                    SEO templates help users quickly set up optimized metadata for their projects. Each template should include:
                                    recommended keywords, schema types, and best practices for that industry.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Verifications Tab */}
                    {activeTab === 'verifications' && (
                        <div className="space-y-6">
                            <div className="bg-editor-panel-bg rounded-lg p-6 border border-editor-border">
                                <h2 className="text-xl font-semibold text-editor-text-primary mb-4">
                                    Global Site Verifications
                                </h2>
                                <p className="text-editor-text-secondary mb-4">
                                    Configure verification codes that will be applied to all deployed sites.
                                </p>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-editor-text-primary mb-2">
                                            Google Search Console Verification
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter verification code"
                                            value={googleVerification}
                                            onChange={(e) => setGoogleVerification(e.target.value)}
                                            className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                        />
                                        <p className="text-xs text-editor-text-secondary mt-1">
                                            This will add the meta tag: &lt;meta name="google-site-verification" content="..." /&gt;
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-editor-text-primary mb-2">
                                            Bing Webmaster Tools Verification
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter verification code"
                                            value={bingVerification}
                                            onChange={(e) => setBingVerification(e.target.value)}
                                            className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                        />
                                        <p className="text-xs text-editor-text-secondary mt-1">
                                            This will add the meta tag: &lt;meta name="msvalidate.01" content="..." /&gt;
                                        </p>
                                    </div>

                                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                        <h3 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                                            <Shield className="w-4 h-4" />
                                            How to get verification codes
                                        </h3>
                                        <ul className="text-sm text-editor-text-secondary space-y-2">
                                            <li className="flex items-start gap-2">
                                                <span className="text-blue-400 mt-0.5">•</span>
                                                <div>
                                                    <strong className="text-editor-text-primary">Google Search Console:</strong>
                                                    <br />
                                                    <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                                        https://search.google.com/search-console
                                                    </a>
                                                    <br />
                                                    <span className="text-xs">Choose "HTML tag" verification method</span>
                                                </div>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-blue-400 mt-0.5">•</span>
                                                <div>
                                                    <strong className="text-editor-text-primary">Bing Webmaster Tools:</strong>
                                                    <br />
                                                    <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                                        https://www.bing.com/webmasters
                                                    </a>
                                                    <br />
                                                    <span className="text-xs">Select "Meta tag" verification option</span>
                                                </div>
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                                        <h3 className="font-medium text-green-400 mb-2">✨ Benefits</h3>
                                        <ul className="text-sm text-editor-text-secondary space-y-1">
                                            <li>• Monitor search performance across all deployed sites</li>
                                            <li>• Submit sitemaps automatically</li>
                                            <li>• Receive crawl error notifications</li>
                                            <li>• Track indexing status</li>
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
                                        <h3 className="font-medium text-blue-400 mb-1">AI Bot Configuration</h3>
                                        <p className="text-sm text-editor-text-secondary">
                                            Configure how AI search engines like ChatGPT, Perplexity, Claude, and others index and understand 
                                            websites built with Quimera.ai. This is cutting-edge SEO optimization!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-editor-panel-bg rounded-lg p-6 border border-editor-border">
                                <h2 className="text-xl font-semibold text-editor-text-primary mb-4">
                                    Default AI Optimization
                                </h2>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-editor-text-primary mb-2">
                                            Platform AI Description Template
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder="Template that will be used as base for AI descriptions..."
                                            value={aiDescriptionTemplate}
                                            onChange={(e) => setAiDescriptionTemplate(e.target.value)}
                                            className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                        />
                                        <p className="text-xs text-editor-text-secondary mt-1">
                                            This text will be appended to user-generated descriptions to help AI understand the platform context.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-editor-text-primary mb-2">
                                            Default AI Topics (comma separated)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="AI, Machine Learning, Web Development"
                                            value={defaultAiTopics}
                                            onChange={(e) => setDefaultAiTopics(e.target.value)}
                                            className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                        />
                                        <p className="text-xs text-editor-text-secondary mt-1">
                                            These topics help AI categorize and understand the platform better.
                                        </p>
                                    </div>

                                    <div className="bg-editor-bg rounded-lg p-4">
                                        <h3 className="font-medium text-editor-text-primary mb-3 flex items-center gap-2">
                                            <Bot className="w-5 h-5 text-editor-accent" />
                                            Supported AI Search Engines
                                        </h3>
                                        <p className="text-sm text-editor-text-secondary mb-3">
                                            Quimera.ai optimizes for the following AI-powered search engines:
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
                                                <div key={engine.name} className="flex items-center gap-2 text-editor-text-secondary">
                                                    <div className={`w-2 h-2 rounded-full ${engine.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`} />
                                                    <span className="text-sm">{engine.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                        <h3 className="font-medium text-purple-400 mb-2">🚀 What makes this special?</h3>
                                        <ul className="text-sm text-editor-text-secondary space-y-2">
                                            <li>• <strong>AI-specific meta tags</strong> that help AI bots understand content better</li>
                                            <li>• <strong>Structured topics</strong> for better categorization in AI search results</li>
                                            <li>• <strong>Enhanced descriptions</strong> optimized for conversational queries</li>
                                            <li>• <strong>Future-proof</strong> SEO that works with emerging AI search engines</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-editor-panel-bg rounded-lg p-6 border border-editor-border">
                                <h2 className="text-xl font-semibold text-editor-text-primary mb-4">
                                    AI Meta Tags
                                </h2>
                                <p className="text-editor-text-secondary mb-4">
                                    Quimera.ai uses custom meta tags specifically designed for AI crawlers:
                                </p>
                                
                                <div className="space-y-3">
                                    <div className="p-3 bg-editor-bg rounded-lg font-mono text-sm">
                                        <div className="text-editor-text-secondary">&lt;meta name="<span className="text-editor-accent">ai:crawlable</span>" content="true" /&gt;</div>
                                        <p className="text-xs text-editor-text-secondary mt-1 font-sans">Signals to AI bots that content can be indexed</p>
                                    </div>
                                    <div className="p-3 bg-editor-bg rounded-lg font-mono text-sm">
                                        <div className="text-editor-text-secondary">&lt;meta name="<span className="text-editor-accent">ai:description</span>" content="..." /&gt;</div>
                                        <p className="text-xs text-editor-text-secondary mt-1 font-sans">Optimized description for AI understanding</p>
                                    </div>
                                    <div className="p-3 bg-editor-bg rounded-lg font-mono text-sm">
                                        <div className="text-editor-text-secondary">&lt;meta name="<span className="text-editor-accent">ai:topics</span>" content="..." /&gt;</div>
                                        <p className="text-xs text-editor-text-secondary mt-1 font-sans">Key topics for AI categorization</p>
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

