import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../contexts/core/UIContext';
import { useProject } from '../../contexts/project';
import { useEditor } from '../../contexts/EditorContext';
import { SEOConfig } from '../../types';
import DashboardSidebar from './DashboardSidebar';
import ProjectSelectorPage from './seo/ProjectSelectorPage';
import ImagePicker from '../ui/ImagePicker';
import { Globe, Search, Share2, Code, CheckCircle, ArrowLeft, Menu, Clock, LayoutGrid, Store, ChevronDown, Check, Layers } from 'lucide-react';

type SeoTab = 'basic' | 'social' | 'advanced' | 'ai';

interface SEODashboardProps {
  initialTab?: SeoTab;
}

const SEODashboard: React.FC<SEODashboardProps> = ({ initialTab = 'basic' }) => {
  const { t } = useTranslation();
  const { setView } = useUI();
  const { 
    activeProject, 
    projects,
    activeProjectId,
    isLoadingProjects
  } = useProject();
  // seoConfig y loadProject vienen del EditorContext porque loadProject del Editor carga el seoConfig
  const { seoConfig, updateSeoConfig, loadProject } = useEditor();
  const [activeTab, setActiveTab] = useState<SeoTab>(initialTab);
  const [localConfig, setLocalConfig] = useState<SEOConfig | null>(seoConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProjectId);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const selectableProjects = projects.filter(p => p.status !== 'Template');
  
  // Determinar qué proyecto usar
  const effectiveProjectId = selectedProjectId || activeProjectId;
  const effectiveProject = projects.find(p => p.id === effectiveProjectId) || activeProject;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setLocalConfig(seoConfig);
  }, [seoConfig]);

  // Always sync when activeProjectId changes
  useEffect(() => {
    if (activeProjectId) {
      setSelectedProjectId(activeProjectId);
    }
  }, [activeProjectId]);

  // Cargar el proyecto en el EditorContext si hay un proyecto seleccionado pero no hay seoConfig
  useEffect(() => {
    if (effectiveProjectId && !seoConfig && !isLoadingProjects) {
      loadProject(effectiveProjectId, false, false);
    }
  }, [effectiveProjectId, seoConfig, isLoadingProjects, loadProject]);

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
    setSelectedProjectId(projectId);
    await loadProject(projectId, false, false);
  };

  // Mostrar página de selección de proyecto si no hay proyecto seleccionado
  if (!effectiveProjectId || selectableProjects.length === 0) {
    return (
      <ProjectSelectorPage
        onProjectSelect={handleProjectSelect}
      />
    );
  }

  const renderMainContent = () => {
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

                    {/* Favicon */}
                    <div>
                      <ImagePicker
                        label="Favicon"
                        value={localConfig.favicon || ''}
                        onChange={(url) => updateField('favicon', url)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('seo.faviconHelp', 'Sube o selecciona el favicon del proyecto (formato .ico, .png o .svg, 32x32px recomendado)')}
                      </p>
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
        <header className="h-14 px-4 sm:px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title={t('common.openMenu', { defaultValue: 'Open menu' })}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Search className="text-primary w-5 h-5" />
              <h1 className="text-lg font-semibold text-foreground">
                {t('seo.title')}
              </h1>
            </div>
            {/* Project Selector */}
            <div className="relative">
              <button
                onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Store size={14} />
                <span className="max-w-[200px] truncate">
                  {effectiveProject?.name || t('seo.selectProject', 'Seleccionar proyecto')}
                </span>
                <ChevronDown size={14} className={`transition-transform ${isProjectSelectorOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {isProjectSelectorOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProjectSelectorOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 py-2 max-h-96 overflow-auto">
                    <div className="px-4 py-2 border-b border-border/50 mb-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t('seo.quickSwitch', 'Cambio rápido')}
                      </p>
                    </div>
                    
                    {selectableProjects.slice(0, 5).map((project) => (
                      <button
                        key={project.id}
                        onClick={() => {
                          handleProjectSelect(project.id);
                          setIsProjectSelectorOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors ${
                          project.id === effectiveProjectId ? 'bg-primary/10' : ''
                        }`}
                      >
                        {project.thumbnailUrl ? (
                          <img 
                            src={project.thumbnailUrl} 
                            alt={project.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Layers size={16} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 text-left min-w-0">
                          <span className="text-sm font-medium text-foreground truncate block">
                            {project.name}
                          </span>
                          <span className={`text-xs ${project.status === 'Published' ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {project.status === 'Published' ? t('dashboard.published', 'Publicado') : t('dashboard.draft', 'Borrador')}
                          </span>
                        </div>
                        {project.id === effectiveProjectId && (
                          <Check size={16} className="text-primary flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {activeProject && localConfig && (
            <button
              onClick={handleUpdate}
              disabled={isSaving}
              className="h-9 px-4 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isSaving ? t('seo.saving') : t('seo.saveChanges')}
            </button>
          )}
        </header>

        {renderMainContent()}
      </div>
    </div>
  );
};

export default SEODashboard;

