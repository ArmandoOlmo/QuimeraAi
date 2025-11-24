import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../contexts/EditorContext';
import { SEOConfig } from '../../types';
import DashboardSidebar from './DashboardSidebar';
import { Globe, Search, Share2, Code, CheckCircle, ArrowLeft, Menu } from 'lucide-react';

const SEODashboard: React.FC = () => {
  const { t } = useTranslation();
  const { 
    seoConfig, 
    updateSeoConfig, 
    activeProject, 
    setView,
    projects,
    activeProjectId,
    loadProject,
    isLoadingProjects
  } = useEditor();
  const [activeTab, setActiveTab] = useState<'basic' | 'social' | 'advanced' | 'ai'>('basic');
  const [localConfig, setLocalConfig] = useState<SEOConfig | null>(seoConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProjectId ?? '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const selectableProjects = projects;

  useEffect(() => {
    setLocalConfig(seoConfig);
  }, [seoConfig]);

  useEffect(() => {
    setSelectedProjectId(activeProjectId ?? '');
  }, [activeProjectId]);

  const handleUpdate = async () => {
    if (localConfig) {
      setIsSaving(true);
      await updateSeoConfig(localConfig);
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof SEOConfig, value: any) => {
    setLocalConfig(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleProjectSelect = async (projectId: string) => {
    if (!projectId || projectId === activeProjectId) return;
    setSelectedProjectId(projectId);
    await loadProject(projectId, false, false);
  };

  const renderMainContent = () => {
    if (!activeProject) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-8 w-full max-w-lg space-y-5 text-center">
            <div>
              <h2 className="text-2xl font-semibold text-editor-text-primary mb-2">
                {t('seo.title')}
              </h2>
              <p className="text-editor-text-secondary">
                Selecciona el proyecto al que quieres configurar SEO y metadata.
              </p>
            </div>

            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              disabled={isLoadingProjects || selectableProjects.length === 0}
              className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
            >
              <option value="">
                {isLoadingProjects ? 'Cargando proyectos...' : 'Elige un proyecto'}
              </option>
              {selectableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            {selectableProjects.length === 0 && (
              <button
                onClick={() => setView('websites')}
                className="w-full h-11 rounded-lg bg-editor-accent text-white font-medium hover:bg-editor-accent-hover transition-colors"
              >
                Crear proyecto
              </button>
            )}
          </div>
        </div>
      );
    }

    if (!seoConfig || !localConfig) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-editor-text-primary">Loading SEO configuration...</div>
        </div>
      );
    }

    return (
      <>
        {/* Tabs */}
        <div className="bg-editor-panel-bg border-b border-editor-border px-6">
          <div className="flex gap-4">
            {[
              { id: 'basic', label: t('seo.basicSEO'), icon: Globe },
              { id: 'social', label: t('seo.socialMedia'), icon: Share2 },
              { id: 'advanced', label: t('seo.advanced'), icon: Code },
              { id: 'ai', label: t('seo.aiOptimization'), icon: CheckCircle }
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
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Basic SEO Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="bg-editor-panel-bg rounded-lg p-6 border border-editor-border">
                  <h2 className="text-xl font-semibold text-editor-text-primary mb-4">
                    Basic Information
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        Page Title
                      </label>
                      <input
                        type="text"
                        value={localConfig.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                        placeholder="My Awesome Website"
                      />
                      <p className={`text-xs mt-1 ${localConfig.title.length > 60 ? 'text-red-500' : 'text-editor-text-secondary'}`}>
                        {localConfig.title.length} / 60 characters (recommended)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        Meta Description
                      </label>
                      <textarea
                        value={localConfig.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                        placeholder="A brief description of your website..."
                      />
                      <p className={`text-xs mt-1 ${localConfig.description.length > 160 ? 'text-red-500' : 'text-editor-text-secondary'}`}>
                        {localConfig.description.length} / 160 characters (recommended)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        Keywords (comma separated)
                      </label>
                      <input
                        type="text"
                        value={localConfig.keywords.join(', ')}
                        onChange={(e) => updateField('keywords', e.target.value.split(',').map(k => k.trim()).filter(k => k))}
                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                        placeholder="web design, AI, automation"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        Author
                      </label>
                      <input
                        type="text"
                        value={localConfig.author || ''}
                        onChange={(e) => updateField('author', e.target.value)}
                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                        placeholder="Your name or company"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        Language
                      </label>
                      <select
                        value={localConfig.language}
                        onChange={(e) => updateField('language', e.target.value)}
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
                        Canonical URL
                      </label>
                      <input
                        type="url"
                        value={localConfig.canonical || ''}
                        onChange={(e) => updateField('canonical', e.target.value)}
                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                        placeholder="https://example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        Robots Meta Tag
                      </label>
                      <select
                        value={localConfig.robots}
                        onChange={(e) => updateField('robots', e.target.value)}
                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                      >
                        <option value="index, follow">Index, Follow (Recommended)</option>
                        <option value="noindex, follow">No Index, Follow</option>
                        <option value="index, nofollow">Index, No Follow</option>
                        <option value="noindex, nofollow">No Index, No Follow</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div className="bg-editor-panel-bg rounded-lg p-6 border border-editor-border">
                  <h2 className="text-xl font-semibold text-editor-text-primary mb-4">
                    Structured Data (Schema.org)
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        Schema Type
                      </label>
                      <select
                        value={localConfig.schemaType}
                        onChange={(e) => updateField('schemaType', e.target.value)}
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
                  </div>
                </div>

                <div className="bg-editor-panel-bg rounded-lg p-6 border border-editor-border">
                  <h2 className="text-xl font-semibold text-editor-text-primary mb-4">
                    Site Verification
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        Google Site Verification
                      </label>
                      <input
                        type="text"
                        value={localConfig.googleSiteVerification || ''}
                        onChange={(e) => updateField('googleSiteVerification', e.target.value)}
                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                        placeholder="verification code"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        Bing Site Verification
                      </label>
                      <input
                        type="text"
                        value={localConfig.bingVerification || ''}
                        onChange={(e) => updateField('bingVerification', e.target.value)}
                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                        placeholder="verification code"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Optimization Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-400 mb-1">AI Bot Optimization</h3>
                      <p className="text-sm text-editor-text-secondary">
                        Optimize your website to be better understood and indexed by AI-powered search engines 
                        like Perplexity, ChatGPT, Claude, and other AI crawlers.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-editor-panel-bg rounded-lg p-6 border border-editor-border">
                  <h2 className="text-xl font-semibold text-editor-text-primary mb-4">
                    AI Crawlability
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-editor-text-primary">
                          Allow AI Crawling
                        </label>
                        <p className="text-xs text-editor-text-secondary mt-1">
                          Enable your site to be crawled and indexed by AI bots
                        </p>
                      </div>
                      <button
                        onClick={() => updateField('aiCrawlable', !localConfig.aiCrawlable)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          localConfig.aiCrawlable ? 'bg-editor-accent' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            localConfig.aiCrawlable ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {localConfig.aiCrawlable && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-editor-text-primary mb-2">
                            AI-Optimized Description
                          </label>
                          <textarea
                            value={localConfig.aiDescription || ''}
                            onChange={(e) => updateField('aiDescription', e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                            placeholder="A comprehensive description that helps AI understand your website's purpose, services, and value proposition..."
                          />
                          <p className="text-xs text-editor-text-secondary mt-1">
                            Be detailed and clear. AI bots use this to understand your content better.
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-editor-text-primary mb-2">
                            Key Topics (comma separated)
                          </label>
                          <input
                            type="text"
                            value={localConfig.aiKeyTopics?.join(', ') || ''}
                            onChange={(e) => updateField('aiKeyTopics', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                            className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                            placeholder="AI, Machine Learning, Web Development, SaaS"
                          />
                          <p className="text-xs text-editor-text-secondary mt-1">
                            Help AI categorize and understand your website's main topics
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-editor-panel-bg rounded-lg p-6 border border-editor-border">
                  <h2 className="text-xl font-semibold text-editor-text-primary mb-4">
                    AI Search Engines
                  </h2>
                  <p className="text-sm text-editor-text-secondary mb-4">
                    Your website will be optimized for these AI-powered search engines:
                  </p>
                  <ul className="space-y-2">
                    {[
                      'Perplexity AI',
                      'ChatGPT (OpenAI)',
                      'Google Gemini',
                      'Bing Copilot',
                      'Claude (Anthropic)',
                      'You.com'
                    ].map(engine => (
                      <li key={engine} className="flex items-center gap-2 text-editor-text-secondary">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {engine}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Social Media Tab */}
            {activeTab === 'social' && (
              <div className="space-y-6">
                {/* Open Graph */}
                <div className="bg-editor-panel-bg rounded-lg p-6 border border-editor-border">
                  <h2 className="text-xl font-semibold text-editor-text-primary mb-4">
                    Open Graph (Facebook, LinkedIn)
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        OG Type
                      </label>
                      <select
                        value={localConfig.ogType}
                        onChange={(e) => updateField('ogType', e.target.value)}
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
                        OG Title
                      </label>
                      <input
                        type="text"
                        value={localConfig.ogTitle || ''}
                        onChange={(e) => updateField('ogTitle', e.target.value)}
                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                        placeholder="Leave empty to use page title"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        OG Description
                      </label>
                      <textarea
                        value={localConfig.ogDescription || ''}
                        onChange={(e) => updateField('ogDescription', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                        placeholder="Leave empty to use meta description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        OG Image URL
                      </label>
                      <input
                        type="url"
                        value={localConfig.ogImage || ''}
                        onChange={(e) => updateField('ogImage', e.target.value)}
                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                        placeholder="https://example.com/image.jpg"
                      />
                      <p className="text-xs text-editor-text-secondary mt-1">
                        Recommended: 1200x630px
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        OG Site Name
                      </label>
                      <input
                        type="text"
                        value={localConfig.ogSiteName || ''}
                        onChange={(e) => updateField('ogSiteName', e.target.value)}
                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                        placeholder="Your site name"
                      />
                    </div>
                  </div>
                </div>

                {/* Twitter Card */}
                <div className="bg-editor-panel-bg rounded-lg p-6 border border-editor-border">
                  <h2 className="text-xl font-semibold text-editor-text-primary mb-4">
                    Twitter Card
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        Card Type
                      </label>
                      <select
                        value={localConfig.twitterCard}
                        onChange={(e) => updateField('twitterCard', e.target.value)}
                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                      >
                        <option value="summary">Summary</option>
                        <option value="summary_large_image">Summary Large Image</option>
                        <option value="app">App</option>
                        <option value="player">Player</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        Twitter Site (@username)
                      </label>
                      <input
                        type="text"
                        value={localConfig.twitterSite || ''}
                        onChange={(e) => updateField('twitterSite', e.target.value)}
                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                        placeholder="@yoursite"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-editor-text-primary mb-2">
                        Twitter Creator (@username)
                      </label>
                      <input
                        type="text"
                        value={localConfig.twitterCreator || ''}
                        onChange={(e) => updateField('twitterCreator', e.target.value)}
                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                        placeholder="@yourcreator"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-editor-bg text-editor-text-primary">
      <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-editor-panel-bg border-b border-editor-border h-14 px-4 sm:px-6">
          <div className="h-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-full lg:hidden transition-colors"
                title={t('common.openMenu', { defaultValue: 'Open menu' })}
              >
                <Menu className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('dashboard')}
                className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-full transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-editor-text-secondary" />
                  <h1 className="text-lg font-semibold text-editor-text-primary">
                    {t('seo.title')}
                  </h1>
                </div>
                <p className="text-xs text-editor-text-secondary hidden sm:block">
                  {t('seo.subtitle')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-editor-text-secondary uppercase tracking-wide hidden sm:inline">
                {t('seo.projectLabel', { defaultValue: 'Proyecto' })}
              </span>
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectSelect(e.target.value)}
                disabled={selectableProjects.length === 0}
                className="h-9 rounded-md bg-editor-bg border border-editor-border text-sm px-3 text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
              >
                {!selectedProjectId && (
                  <option value="" disabled>
                    {t('seo.selectProject', { defaultValue: 'Elige un proyecto' })}
                  </option>
                )}
                {selectableProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleUpdate}
              disabled={isSaving || !activeProject || !localConfig}
              className="h-9 px-4 bg-editor-accent text-white font-medium text-sm rounded-md hover:bg-editor-accent-hover transition-colors disabled:opacity-50 shadow-sm"
            >
              {isSaving ? t('seo.saving') : t('seo.saveChanges')}
            </button>
          </div>
        </div>

        {renderMainContent()}
      </div>
    </div>
  );
};

export default SEODashboard;

