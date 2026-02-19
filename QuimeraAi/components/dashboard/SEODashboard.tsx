import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../contexts/core/UIContext';
import { useProject } from '../../contexts/project';
import { useEditor } from '../../contexts/EditorContext';
import { SEOConfig, AdPixelConfig } from '../../types';
import DashboardSidebar from './DashboardSidebar';
import DashboardWaveRibbons from './DashboardWaveRibbons';
import ProjectSelectorPage from './seo/ProjectSelectorPage';
import ImagePicker from '../ui/ImagePicker';
import SEOAiAssistant from './seo/SEOAiAssistant';
import { Globe, Search, Share2, Code, CheckCircle, Menu, Store, ChevronDown, Check, Layers, Activity, ExternalLink, Sparkles } from 'lucide-react';

type SeoTab = 'basic' | 'social' | 'advanced' | 'ai' | 'pixels';

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
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
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

  const handleAiResult = (seoData: Partial<SEOConfig>) => {
    setLocalConfig(prev => prev ? { ...prev, ...seoData } : null);
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
              { id: 'ai', label: t('seo.aiOptimization'), icon: CheckCircle },
              { id: 'pixels', label: t('seo.trackingPixels', 'Píxeles'), icon: Activity }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SeoTab)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
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
                        className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.aiCrawlable ? 'bg-primary' : 'bg-gray-600'
                          }`}
                      >
                        <span
                          className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.aiCrawlable ? 'translate-x-6' : 'translate-x-1'
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

            {/* Tracking Pixels Tab */}
            {activeTab === 'pixels' && (
              <div className="space-y-6">
                {/* Info Banner */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Activity className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-purple-400 mb-1">
                        {t('seo.trackingPixelsTitle', 'Píxeles de Publicidad')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t('seo.trackingPixelsDesc', 'Configura los píxeles de tracking de las plataformas publicitarias para medir conversiones, crear audiencias y optimizar tus campañas.')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Facebook/Meta Pixel */}
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1877F2] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Meta Pixel</h2>
                        <p className="text-xs text-muted-foreground">Facebook, Instagram, Messenger Ads</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateField('adPixels', {
                        ...localConfig.adPixels,
                        facebookPixelEnabled: !localConfig.adPixels?.facebookPixelEnabled
                      })}
                      className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.adPixels?.facebookPixelEnabled ? 'bg-[#1877F2]' : 'bg-gray-600'
                        }`}
                    >
                      <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.adPixels?.facebookPixelEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                  </div>

                  {localConfig.adPixels?.facebookPixelEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Pixel ID
                        </label>
                        <input
                          type="text"
                          value={localConfig.adPixels?.facebookPixelId || ''}
                          onChange={(e) => updateField('adPixels', {
                            ...localConfig.adPixels,
                            facebookPixelId: e.target.value
                          })}
                          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#1877F2]/50"
                          placeholder="123456789012345"
                        />
                      </div>
                      <a
                        href="https://business.facebook.com/events_manager2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#1877F2] hover:underline"
                      >
                        <ExternalLink size={12} />
                        {t('seo.findInEventManager', 'Buscar en Events Manager')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Google Tag Manager */}
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#246FDB] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                          <path d="M12.003 0L1.5 6v12l10.503 6L22.5 18V6L12.003 0zm-.003 2.29l8.5 4.86v9.71l-8.5 4.86-8.5-4.86V7.15l8.5-4.86z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Google Tag Manager</h2>
                        <p className="text-xs text-muted-foreground">{t('seo.gtmDesc', 'Contenedor universal para todos tus tags')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateField('adPixels', {
                        ...localConfig.adPixels,
                        googleTagManagerEnabled: !localConfig.adPixels?.googleTagManagerEnabled
                      })}
                      className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.adPixels?.googleTagManagerEnabled ? 'bg-[#246FDB]' : 'bg-gray-600'
                        }`}
                    >
                      <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.adPixels?.googleTagManagerEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                  </div>

                  {localConfig.adPixels?.googleTagManagerEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Container ID
                        </label>
                        <input
                          type="text"
                          value={localConfig.adPixels?.googleTagManagerId || ''}
                          onChange={(e) => updateField('adPixels', {
                            ...localConfig.adPixels,
                            googleTagManagerId: e.target.value
                          })}
                          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#246FDB]/50"
                          placeholder="GTM-XXXXXXX"
                        />
                      </div>
                      <a
                        href="https://tagmanager.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#246FDB] hover:underline"
                      >
                        <ExternalLink size={12} />
                        {t('seo.openGTM', 'Abrir Google Tag Manager')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Google Ads */}
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#4285F4] via-[#EA4335] to-[#FBBC05] flex items-center justify-center">
                        <span className="text-white font-bold text-lg">G</span>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Google Ads</h2>
                        <p className="text-xs text-muted-foreground">{t('seo.gadsDesc', 'Conversiones y Remarketing')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateField('adPixels', {
                        ...localConfig.adPixels,
                        googleAdsEnabled: !localConfig.adPixels?.googleAdsEnabled
                      })}
                      className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.adPixels?.googleAdsEnabled ? 'bg-[#4285F4]' : 'bg-gray-600'
                        }`}
                    >
                      <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.adPixels?.googleAdsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                  </div>

                  {localConfig.adPixels?.googleAdsEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Google Ads ID
                        </label>
                        <input
                          type="text"
                          value={localConfig.adPixels?.googleAdsId || ''}
                          onChange={(e) => updateField('adPixels', {
                            ...localConfig.adPixels,
                            googleAdsId: e.target.value
                          })}
                          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#4285F4]/50"
                          placeholder="AW-123456789"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('seo.gadsHelp', 'Formato: AW-XXXXXXXXX (Google Ads → Herramientas → Conversiones)')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Google Analytics 4 */}
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#F9AB00] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                          <path d="M22.84 2.998v17.958c0 1.66-1.36 3.002-3.04 3.002h-.72c-1.68 0-3.04-1.34-3.04-3.002V6.6c0-1.66 1.36-3.002 3.04-3.002h.72c1.68-.6 3.04.74 3.04 2.4zM7.92 11.998v8.958c0 1.66-1.36 3.002-3.04 3.002h-.72c-1.68 0-3.04-1.34-3.04-3.002v-8.958c0-1.66 1.36-3.002 3.04-3.002h.72c1.68 0 3.04 1.34 3.04 3.002zm5.04 4.48a3.04 3.04 0 100 6.08 3.04 3.04 0 000-6.08z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Google Analytics 4</h2>
                        <p className="text-xs text-muted-foreground">{t('seo.ga4Desc', 'Analytics avanzado y audiencias')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateField('adPixels', {
                        ...localConfig.adPixels,
                        googleAnalyticsEnabled: !localConfig.adPixels?.googleAnalyticsEnabled
                      })}
                      className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.adPixels?.googleAnalyticsEnabled ? 'bg-[#F9AB00]' : 'bg-gray-600'
                        }`}
                    >
                      <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.adPixels?.googleAnalyticsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                  </div>

                  {localConfig.adPixels?.googleAnalyticsEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Measurement ID
                        </label>
                        <input
                          type="text"
                          value={localConfig.adPixels?.googleAnalyticsId || ''}
                          onChange={(e) => updateField('adPixels', {
                            ...localConfig.adPixels,
                            googleAnalyticsId: e.target.value
                          })}
                          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#F9AB00]/50"
                          placeholder="G-XXXXXXXXXX"
                        />
                      </div>
                      <a
                        href="https://analytics.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#F9AB00] hover:underline"
                      >
                        <ExternalLink size={12} />
                        {t('seo.openGA4', 'Abrir Google Analytics')}
                      </a>
                    </div>
                  )}
                </div>

                {/* TikTok Pixel */}
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">TikTok Pixel</h2>
                        <p className="text-xs text-muted-foreground">TikTok Ads Manager</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateField('adPixels', {
                        ...localConfig.adPixels,
                        tiktokPixelEnabled: !localConfig.adPixels?.tiktokPixelEnabled
                      })}
                      className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.adPixels?.tiktokPixelEnabled ? 'bg-black' : 'bg-gray-600'
                        }`}
                    >
                      <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.adPixels?.tiktokPixelEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                  </div>

                  {localConfig.adPixels?.tiktokPixelEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Pixel ID
                        </label>
                        <input
                          type="text"
                          value={localConfig.adPixels?.tiktokPixelId || ''}
                          onChange={(e) => updateField('adPixels', {
                            ...localConfig.adPixels,
                            tiktokPixelId: e.target.value
                          })}
                          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="XXXXXXXXXXXXXXXX"
                        />
                      </div>
                      <a
                        href="https://ads.tiktok.com/i18n/events_manager"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        <ExternalLink size={12} />
                        {t('seo.openTikTokAds', 'Abrir TikTok Ads Manager')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Twitter/X Pixel */}
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">X (Twitter) Pixel</h2>
                        <p className="text-xs text-muted-foreground">X Ads / Twitter Ads</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateField('adPixels', {
                        ...localConfig.adPixels,
                        twitterPixelEnabled: !localConfig.adPixels?.twitterPixelEnabled
                      })}
                      className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.adPixels?.twitterPixelEnabled ? 'bg-black' : 'bg-gray-600'
                        }`}
                    >
                      <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.adPixels?.twitterPixelEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                  </div>

                  {localConfig.adPixels?.twitterPixelEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Pixel ID
                        </label>
                        <input
                          type="text"
                          value={localConfig.adPixels?.twitterPixelId || ''}
                          onChange={(e) => updateField('adPixels', {
                            ...localConfig.adPixels,
                            twitterPixelId: e.target.value
                          })}
                          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="xxxxx"
                        />
                      </div>
                      <a
                        href="https://ads.twitter.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        <ExternalLink size={12} />
                        {t('seo.openXAds', 'Abrir X Ads')}
                      </a>
                    </div>
                  )}
                </div>

                {/* LinkedIn Insight Tag */}
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#0A66C2] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">LinkedIn Insight Tag</h2>
                        <p className="text-xs text-muted-foreground">{t('seo.linkedinDesc', 'B2B Tracking y Audiencias')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateField('adPixels', {
                        ...localConfig.adPixels,
                        linkedinEnabled: !localConfig.adPixels?.linkedinEnabled
                      })}
                      className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.adPixels?.linkedinEnabled ? 'bg-[#0A66C2]' : 'bg-gray-600'
                        }`}
                    >
                      <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.adPixels?.linkedinEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                  </div>

                  {localConfig.adPixels?.linkedinEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Partner ID
                        </label>
                        <input
                          type="text"
                          value={localConfig.adPixels?.linkedinPartnerId || ''}
                          onChange={(e) => updateField('adPixels', {
                            ...localConfig.adPixels,
                            linkedinPartnerId: e.target.value
                          })}
                          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/50"
                          placeholder="123456"
                        />
                      </div>
                      <a
                        href="https://www.linkedin.com/campaignmanager"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#0A66C2] hover:underline"
                      >
                        <ExternalLink size={12} />
                        {t('seo.openLinkedInAds', 'Abrir LinkedIn Campaign Manager')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Pinterest Tag */}
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#E60023] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Pinterest Tag</h2>
                        <p className="text-xs text-muted-foreground">{t('seo.pinterestDesc', 'E-commerce y Shopping Ads')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateField('adPixels', {
                        ...localConfig.adPixels,
                        pinterestEnabled: !localConfig.adPixels?.pinterestEnabled
                      })}
                      className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.adPixels?.pinterestEnabled ? 'bg-[#E60023]' : 'bg-gray-600'
                        }`}
                    >
                      <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.adPixels?.pinterestEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                  </div>

                  {localConfig.adPixels?.pinterestEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Tag ID
                        </label>
                        <input
                          type="text"
                          value={localConfig.adPixels?.pinterestTagId || ''}
                          onChange={(e) => updateField('adPixels', {
                            ...localConfig.adPixels,
                            pinterestTagId: e.target.value
                          })}
                          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#E60023]/50"
                          placeholder="123456789012345"
                        />
                      </div>
                      <a
                        href="https://ads.pinterest.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#E60023] hover:underline"
                      >
                        <ExternalLink size={12} />
                        {t('seo.openPinterestAds', 'Abrir Pinterest Ads')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Snapchat Pixel */}
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#FFFC00] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-black fill-current">
                          <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.509 0-.904.074-1.274.149-.18.029-.359.06-.494.06-.074 0-.149 0-.224-.016-.255-.045-.449-.194-.509-.449-.06-.193-.09-.404-.149-.643-.029-.119-.074-.329-.12-.449-1.858-.27-2.906-.69-3.146-1.26-.03-.074-.045-.148-.045-.222-.015-.232.165-.457.42-.494 3.264-.54 4.73-3.879 4.791-4.02l.015-.029c.181-.345.224-.645.119-.869-.195-.434-.884-.658-1.333-.809-.121-.029-.24-.074-.346-.119-.809-.329-1.229-.72-1.229-1.181 0-.389.299-.721.779-.855.119-.045.254-.074.404-.089.119 0 .283.015.434.089.389.18.75.3 1.049.3.182 0 .299-.029.391-.089-.015-.18-.03-.359-.045-.539-.03-.18-.03-.359-.045-.539-.105-1.692-.24-3.72.284-4.899C7.653 1.069 11.003.793 12.001.793h.205z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Snapchat Pixel</h2>
                        <p className="text-xs text-muted-foreground">Snapchat Ads</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateField('adPixels', {
                        ...localConfig.adPixels,
                        snapchatEnabled: !localConfig.adPixels?.snapchatEnabled
                      })}
                      className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.adPixels?.snapchatEnabled ? 'bg-[#FFFC00]' : 'bg-gray-600'
                        }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${localConfig.adPixels?.snapchatEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                  </div>

                  {localConfig.adPixels?.snapchatEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Pixel ID
                        </label>
                        <input
                          type="text"
                          value={localConfig.adPixels?.snapchatPixelId || ''}
                          onChange={(e) => updateField('adPixels', {
                            ...localConfig.adPixels,
                            snapchatPixelId: e.target.value
                          })}
                          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#FFFC00]/50"
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        />
                      </div>
                      <a
                        href="https://ads.snapchat.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        <ExternalLink size={12} />
                        {t('seo.openSnapchatAds', 'Abrir Snapchat Ads')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Microsoft/Bing Ads */}
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#00A4EF] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                          <path d="M0 0v11.408h11.408V0zm12.594 0v11.408H24V0zM0 12.594V24h11.408V12.594zm12.594 0V24H24V12.594z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Microsoft Ads (UET)</h2>
                        <p className="text-xs text-muted-foreground">Bing Ads / Microsoft Advertising</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateField('adPixels', {
                        ...localConfig.adPixels,
                        microsoftUetEnabled: !localConfig.adPixels?.microsoftUetEnabled
                      })}
                      className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.adPixels?.microsoftUetEnabled ? 'bg-[#00A4EF]' : 'bg-gray-600'
                        }`}
                    >
                      <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.adPixels?.microsoftUetEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                  </div>

                  {localConfig.adPixels?.microsoftUetEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          UET Tag ID
                        </label>
                        <input
                          type="text"
                          value={localConfig.adPixels?.microsoftUetId || ''}
                          onChange={(e) => updateField('adPixels', {
                            ...localConfig.adPixels,
                            microsoftUetId: e.target.value
                          })}
                          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#00A4EF]/50"
                          placeholder="123456789"
                        />
                      </div>
                      <a
                        href="https://ads.microsoft.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#00A4EF] hover:underline"
                      >
                        <ExternalLink size={12} />
                        {t('seo.openMicrosoftAds', 'Abrir Microsoft Advertising')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Reddit Pixel */}
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#FF4500] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Reddit Pixel</h2>
                        <p className="text-xs text-muted-foreground">Reddit Ads</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateField('adPixels', {
                        ...localConfig.adPixels,
                        redditPixelEnabled: !localConfig.adPixels?.redditPixelEnabled
                      })}
                      className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.adPixels?.redditPixelEnabled ? 'bg-[#FF4500]' : 'bg-gray-600'
                        }`}
                    >
                      <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.adPixels?.redditPixelEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                  </div>

                  {localConfig.adPixels?.redditPixelEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Pixel ID
                        </label>
                        <input
                          type="text"
                          value={localConfig.adPixels?.redditPixelId || ''}
                          onChange={(e) => updateField('adPixels', {
                            ...localConfig.adPixels,
                            redditPixelId: e.target.value
                          })}
                          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#FF4500]/50"
                          placeholder="a2_xxxxxxxxxx"
                        />
                      </div>
                      <a
                        href="https://ads.reddit.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#FF4500] hover:underline"
                      >
                        <ExternalLink size={12} />
                        {t('seo.openRedditAds', 'Abrir Reddit Ads')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Custom Scripts Section */}
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    {t('seo.customScripts', 'Scripts Personalizados')}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('seo.customScriptsDesc', 'Agrega scripts personalizados para otros píxeles de tracking o herramientas no listadas arriba.')}
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.customHeadScripts', 'Scripts en <head>')}
                      </label>
                      <textarea
                        value={localConfig.adPixels?.customHeadScripts || ''}
                        onChange={(e) => updateField('adPixels', {
                          ...localConfig.adPixels,
                          customHeadScripts: e.target.value
                        })}
                        rows={4}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="<script>...</script>"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('seo.customHeadScriptsHelp', 'Se inyectarán en el <head> del documento')}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t('seo.customBodyScripts', 'Scripts en <body>')}
                      </label>
                      <textarea
                        value={localConfig.adPixels?.customBodyScripts || ''}
                        onChange={(e) => updateField('adPixels', {
                          ...localConfig.adPixels,
                          customBodyScripts: e.target.value
                        })}
                        rows={4}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="<script>...</script>"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('seo.customBodyScriptsHelp', 'Se inyectarán al final del <body>')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Active Pixels Summary */}
                {(localConfig.adPixels?.facebookPixelEnabled ||
                  localConfig.adPixels?.googleTagManagerEnabled ||
                  localConfig.adPixels?.googleAdsEnabled ||
                  localConfig.adPixels?.googleAnalyticsEnabled ||
                  localConfig.adPixels?.tiktokPixelEnabled ||
                  localConfig.adPixels?.twitterPixelEnabled ||
                  localConfig.adPixels?.linkedinEnabled ||
                  localConfig.adPixels?.pinterestEnabled ||
                  localConfig.adPixels?.snapchatEnabled ||
                  localConfig.adPixels?.microsoftUetEnabled ||
                  localConfig.adPixels?.redditPixelEnabled) && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-green-400 mb-2">
                            {t('seo.activePixels', 'Píxeles Activos')}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {localConfig.adPixels?.facebookPixelEnabled && (
                              <span className="px-2 py-1 bg-[#1877F2]/20 text-[#1877F2] rounded text-xs">Meta Pixel</span>
                            )}
                            {localConfig.adPixels?.googleTagManagerEnabled && (
                              <span className="px-2 py-1 bg-[#246FDB]/20 text-[#246FDB] rounded text-xs">GTM</span>
                            )}
                            {localConfig.adPixels?.googleAdsEnabled && (
                              <span className="px-2 py-1 bg-[#4285F4]/20 text-[#4285F4] rounded text-xs">Google Ads</span>
                            )}
                            {localConfig.adPixels?.googleAnalyticsEnabled && (
                              <span className="px-2 py-1 bg-[#F9AB00]/20 text-[#F9AB00] rounded text-xs">GA4</span>
                            )}
                            {localConfig.adPixels?.tiktokPixelEnabled && (
                              <span className="px-2 py-1 bg-white/10 text-foreground rounded text-xs">TikTok</span>
                            )}
                            {localConfig.adPixels?.twitterPixelEnabled && (
                              <span className="px-2 py-1 bg-white/10 text-foreground rounded text-xs">X/Twitter</span>
                            )}
                            {localConfig.adPixels?.linkedinEnabled && (
                              <span className="px-2 py-1 bg-[#0A66C2]/20 text-[#0A66C2] rounded text-xs">LinkedIn</span>
                            )}
                            {localConfig.adPixels?.pinterestEnabled && (
                              <span className="px-2 py-1 bg-[#E60023]/20 text-[#E60023] rounded text-xs">Pinterest</span>
                            )}
                            {localConfig.adPixels?.snapchatEnabled && (
                              <span className="px-2 py-1 bg-[#FFFC00]/20 text-[#FFFC00] rounded text-xs">Snapchat</span>
                            )}
                            {localConfig.adPixels?.microsoftUetEnabled && (
                              <span className="px-2 py-1 bg-[#00A4EF]/20 text-[#00A4EF] rounded text-xs">Microsoft</span>
                            )}
                            {localConfig.adPixels?.redditPixelEnabled && (
                              <span className="px-2 py-1 bg-[#FF4500]/20 text-[#FF4500] rounded text-xs">Reddit</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* AI SEO Assistant Modal */}
      {isAiAssistantOpen && (
        <SEOAiAssistant
          onClose={() => setIsAiAssistantOpen(false)}
          onApply={handleAiResult}
          currentConfig={localConfig}
        />
      )}

      <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <DashboardWaveRibbons />
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
                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors ${project.id === effectiveProjectId ? 'bg-primary/10' : ''
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

          {effectiveProject && localConfig && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAiAssistantOpen(true)}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-bold transition-all text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">{t('seo.optimizeWithAI', 'Optimizar con IA')}</span>
                <span className="sm:hidden">IA</span>
              </button>
              <button
                onClick={handleUpdate}
                disabled={isSaving}
                className="h-9 px-4 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 shadow-sm"
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

