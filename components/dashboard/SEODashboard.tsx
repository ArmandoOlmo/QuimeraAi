import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../contexts/EditorContext';
import { SEOConfig } from '../../types';
import DashboardSidebar from './DashboardSidebar';
import { Globe, Search, Share2, Code, CheckCircle, ArrowLeft, Menu, Clock, LayoutGrid } from 'lucide-react';

type SeoTab = 'basic' | 'social' | 'advanced' | 'ai';

interface SEODashboardProps {
  initialTab?: SeoTab;
}

const SEODashboard: React.FC<SEODashboardProps> = ({ initialTab = 'basic' }) => {
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
  const [activeTab, setActiveTab] = useState<SeoTab>(initialTab);
  const [localConfig, setLocalConfig] = useState<SEOConfig | null>(seoConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProjectId ?? '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const selectableProjects = projects;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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
        <div className="flex-1 overflow-y-auto p-8 bg-secondary/10">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">{t('seo.title')}</h2>
              <p className="text-muted-foreground max-w-lg mx-auto text-lg">
                {t('seo.selectProject')}
              </p>
            </div>

            {selectableProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {selectableProjects.map(project => (
                  <button 
                    key={project.id}
                    onClick={() => handleProjectSelect(project.id)}
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
                          {t('seo.updated')} {new Date(project.lastUpdated).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                <LayoutGrid className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-bold mb-2">{t('seo.noProjectsAvailable')}</h3>
                <p className="text-sm text-muted-foreground mb-6">{t('seo.createProjectToConfigureSEO')}</p>
                <button
                  onClick={() => setView('websites')}
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-colors font-bold"
                >
                  {t('seo.createProject')}
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (!seoConfig || !localConfig) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-foreground">{t('seo.loadingSEOConfiguration')}</div>
        </div>
      );
    }

    return (
      <>
        {/* Tabs */}
        <div className="bg-secondary/20 border-b border-border px-6">
          <div className="flex gap-4">
            {[
              { id: 'basic', label: t('seo.basicSEO'), icon: Globe },
              { id: 'social', label: t('seo.socialMedia'), icon: Share2 },
              { id: 'advanced', label: t('seo.advanced'), icon: Code },
              { id: 'ai', label: t('seo.aiOptimization'), icon: CheckCircle }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SeoTab)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-secondary/5">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Basic SEO Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    {t('seo.basicInformation')}
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.pageTitle')}
                      </label>
                      <input
                        type="text"
                        value={localConfig.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder={t('seo.myAwesomeWebsite')}
                      />
                      <p className={`text-xs mt-1 ${localConfig.title.length > 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {localConfig.title.length} / 60 {t('seo.charactersRecommended')}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.metaDescription')}
                      </label>
                      <textarea
                        value={localConfig.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder={t('seo.briefDescriptionOfWebsite')}
                      />
                      <p className={`text-xs mt-1 ${localConfig.description.length > 160 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {localConfig.description.length} / 160 {t('seo.charactersRecommended')}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.keywordsCommaSeparated')}
                      </label>
                      <input
                        type="text"
                        value={localConfig.keywords.join(', ')}
                        onChange={(e) => updateField('keywords', e.target.value.split(',').map(k => k.trim()).filter(k => k))}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder={t('seo.keywordsPlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.author')}
                      </label>
                      <input
                        type="text"
                        value={localConfig.author || ''}
                        onChange={(e) => updateField('author', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder={t('seo.authorPlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.language')}
                      </label>
                      <select
                        value={localConfig.language}
                        onChange={(e) => updateField('language', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="pt">Português</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.canonicalURL')}
                      </label>
                      <input
                        type="url"
                        value={localConfig.canonical || ''}
                        onChange={(e) => updateField('canonical', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="https://example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.robotsMetaTag')}
                      </label>
                      <select
                        value={localConfig.robots}
                        onChange={(e) => updateField('robots', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="index, follow">{t('seo.indexFollow')}</option>
                        <option value="noindex, follow">{t('seo.noIndexFollow')}</option>
                        <option value="index, nofollow">{t('seo.indexNoFollow')}</option>
                        <option value="noindex, nofollow">{t('seo.noIndexNoFollow')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    {t('seo.structuredData')}
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.schemaType')}
                      </label>
                      <select
                        value={localConfig.schemaType}
                        onChange={(e) => updateField('schemaType', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="WebSite">{t('seo.website')}</option>
                        <option value="Organization">{t('seo.organization')}</option>
                        <option value="LocalBusiness">{t('seo.localBusiness')}</option>
                        <option value="Article">{t('seo.article')}</option>
                        <option value="Product">{t('seo.product')}</option>
                        <option value="Service">{t('seo.service')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    {t('seo.siteVerification')}
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.googleSiteVerification')}
                      </label>
                      <input
                        type="text"
                        value={localConfig.googleSiteVerification || ''}
                        onChange={(e) => updateField('googleSiteVerification', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder={t('seo.verificationCode')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.bingSiteVerification')}
                      </label>
                      <input
                        type="text"
                        value={localConfig.bingVerification || ''}
                        onChange={(e) => updateField('bingVerification', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder={t('seo.verificationCode')}
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
                      <h3 className="font-medium text-blue-400 mb-1">{t('seo.aiBotOptimization')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('seo.optimizeWebsiteForAI')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    {t('seo.aiCrawlability')}
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-foreground">
                          {t('seo.allowAICrawling')}
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('seo.allowAICrawlingDesc')}
                        </p>
                      </div>
                      <button
                        onClick={() => updateField('aiCrawlable', !localConfig.aiCrawlable)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          localConfig.aiCrawlable ? 'bg-primary' : 'bg-gray-600'
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
                          <label className="block text-sm font-medium text-foreground mb-2">
                            {t('seo.aiOptimizedDescription')}
                          </label>
                          <textarea
                            value={localConfig.aiDescription || ''}
                            onChange={(e) => updateField('aiDescription', e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder={t('seo.aiOptimizedDescPlaceholder')}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('seo.aiOptimizedDescHelp')}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            {t('seo.keyTopicsCommaSeparated')}
                          </label>
                          <input
                            type="text"
                            value={localConfig.aiKeyTopics?.join(', ') || ''}
                            onChange={(e) => updateField('aiKeyTopics', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder={t('seo.keyTopicsPlaceholder')}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('seo.keyTopicsHelp')}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    {t('seo.aiSearchEngines')}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('seo.aiSearchEnginesDesc')}
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
                      <li key={engine} className="flex items-center gap-2 text-muted-foreground">
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
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    {t('seo.openGraph')}
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.ogType')}
                      </label>
                      <select
                        value={localConfig.ogType}
                        onChange={(e) => updateField('ogType', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="website">{t('seo.website')}</option>
                        <option value="article">{t('seo.article')}</option>
                        <option value="product">{t('seo.product')}</option>
                        <option value="profile">{t('seo.profile')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.ogTitle')}
                      </label>
                      <input
                        type="text"
                        value={localConfig.ogTitle || ''}
                        onChange={(e) => updateField('ogTitle', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder={t('seo.leaveEmptyToUsePageTitle')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.ogDescription')}
                      </label>
                      <textarea
                        value={localConfig.ogDescription || ''}
                        onChange={(e) => updateField('ogDescription', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder={t('seo.leaveEmptyToUseMetaDescription')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.ogImageURL')}
                      </label>
                      <input
                        type="url"
                        value={localConfig.ogImage || ''}
                        onChange={(e) => updateField('ogImage', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="https://example.com/image.jpg"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('seo.recommendedSize')}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.ogSiteName')}
                      </label>
                      <input
                        type="text"
                        value={localConfig.ogSiteName || ''}
                        onChange={(e) => updateField('ogSiteName', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder={t('seo.yourSiteName')}
                      />
                    </div>
                  </div>
                </div>

                {/* Twitter Card */}
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    {t('seo.twitterCard')}
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.cardType')}
                      </label>
                      <select
                        value={localConfig.twitterCard}
                        onChange={(e) => updateField('twitterCard', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="summary">{t('seo.summary')}</option>
                        <option value="summary_large_image">{t('seo.summaryLargeImage')}</option>
                        <option value="app">{t('seo.app')}</option>
                        <option value="player">{t('seo.player')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.twitterSite')}
                      </label>
                      <input
                        type="text"
                        value={localConfig.twitterSite || ''}
                        onChange={(e) => updateField('twitterSite', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="@yoursite"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.twitterCreator')}
                      </label>
                      <input
                        type="text"
                        value={localConfig.twitterCreator || ''}
                        onChange={(e) => updateField('twitterCreator', e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
    <div className="flex h-screen bg-background text-foreground">
      <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 px-6 border-b border-border flex items-center justify-between bg-background z-20 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/40 rounded-full transition-colors"
              title={t('common.openMenu', { defaultValue: 'Open menu' })}
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Search className="text-primary w-5 h-5" />
              <h1 className="text-lg font-semibold text-foreground">
                {t('seo.title')}
              </h1>
            </div>
          </div>

          {activeProject && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:inline">
                {t('seo.projectLabel', { defaultValue: 'Proyecto' })}
              </span>
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectSelect(e.target.value)}
                disabled={selectableProjects.length === 0}
                className="h-9 rounded-md bg-secondary/30 border border-border text-sm px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              <button
                onClick={handleUpdate}
                disabled={isSaving || !activeProject || !localConfig}
                className="h-9 px-4 bg-primary text-primary-foreground font-medium text-sm rounded-md hover:opacity-90 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isSaving ? t('seo.saving') : t('seo.saveChanges')}
              </button>
            </div>
          )}
        </header>

        {renderMainContent()}
      </div>
    </div>
  );
};

export default SEODashboard;

