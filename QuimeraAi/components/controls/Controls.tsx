/**
 * Controls.tsx — Orchestrator
 *
 * Refactored from 9,653 lines to ~450 lines.
 * All section render functions have been extracted to components/controls/sections/*.
 * This file handles: state management, context integration, layout, and delegation.
 */
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../contexts/EditorContext';
import { useUI } from '../../contexts/core/UIContext';
import { useProject } from '../../contexts/project';
import { useFiles } from '../../contexts/files';
import { useCMS } from '../../contexts/cms';
import { useAdmin } from '../../contexts/admin';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import { initialData } from '../../data/initialData';
import { PageSection, SitePage } from '../../types';
import PageSettings from '../dashboard/PageSettings';
import { PageTemplateId, PAGE_TEMPLATES } from '../../types/onboarding';
import GlobalStylesControl from '../ui/GlobalStylesControl';
import MobileBottomSheet from '../ui/MobileBottomSheet';
import TabletSlidePanel from '../ui/TabletSlidePanel';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useViewportType } from '../../hooks/use-mobile';
import {
  Image, List, Star, PlaySquare, Users, DollarSign,
  Briefcase, MessageCircle, Mail, Send, Type,
  Settings, AlignJustify, MonitorPlay, Grid, HelpCircle, X, Palette,
  TrendingUp, MapIcon, ShoppingBag, Store, Check, Waves, Bell,
  FileText, Layers, UserPlus, PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { usePublicProducts } from '../../hooks/usePublicProducts';
import AIContentAssistant from '../ui/AIContentAssistant';
import ComponentTree from '../ui/ComponentTree';
import TabbedControls from '../ui/TabbedControls';
import { useServiceAvailability } from '../../hooks/useServiceAvailability';
import {
  useFeaturedProductsControls, useCategoryGridControls, useProductHeroControls,
  useTrustBadgesControls, useSaleCountdownControls, useAnnouncementBarControls,
  useCollectionBannerControls, useRecentlyViewedControls, useProductReviewsControls,
  useProductBundleControls, useStoreSettingsControls,
} from '../ui/EcommerceControls';
import type { ControlsDeps } from './ControlsShared';

// ─── Imported section renderers ─────────────────────────────────────────────
import {
  renderHeroControls, renderHeroControlsWithTabs,
  renderHeroSplitControls, renderHeroGalleryControls,
  renderHeroWaveControls, renderHeroNovaControls,
  renderHeaderControls, renderHeaderControlsWithTabs,
  renderFeaturesControls, renderFeaturesControlsWithTabs,
  renderListSectionControls as _renderListSectionControls,
  renderPricingControls, renderPricingControlsWithTabs,
  renderTestimonialsControls, renderTestimonialsControlsWithTabs,
  renderSlideshowControls, renderSlideshowControlsWithTabs,
  renderVideoControls, renderVideoControlsWithTabs,
  renderFooterControls, renderFooterControlsWithTabs,
  renderMapControls,
  renderTopBarControls, renderLogoBannerControls,
  renderServicesControlsWithTabs, renderTeamControlsWithTabs,
  renderFAQControlsWithTabs, renderPortfolioControlsWithTabs,
  renderLeadsControlsWithTabs, renderCMSFeedControlsWithTabs,
  renderNewsletterControlsWithTabs, renderCTAControlsWithTabs,
  renderHowItWorksControlsWithTabs, renderMenuControlsWithTabs,
  renderBannerControlsWithTabs,
  renderProductsControlsWithTabs, renderSignupFloatControlsWithTabs,
} from './sections';

// ─── Main Component ─────────────────────────────────────────────────────────
const Controls: React.FC = () => {
  const { t } = useTranslation();
  const viewportType = useViewportType();
  const isMobile = viewportType === 'mobile';
  const isTablet = viewportType === 'tablet';
  const isDesktop = viewportType === 'desktop';
  const { activeSection, onSectionSelect, activeSectionItem, isSidebarOpen, setIsSidebarOpen } = useUI();
  const {
    data: projectData, setData: setProjectData,
    componentOrder, setComponentOrder, activeProject, updateProjectFavicon,
    saveProject,
    pages, activePage, setActivePage, addPage, updatePage, deletePage, duplicatePage,
    sectionVisibility: projectSectionVisibility,
    setSectionVisibility: setProjectSectionVisibility,
  } = useProject();

  const editorContext = useEditor();
  const setEditorSectionVisibility = editorContext.setSectionVisibility;
  const setEditorComponentOrder = editorContext.setComponentOrder;

  // CRITICAL: Use EditorContext data as source of truth for the editor preview.
  // The LandingPage reads from editorContext.data when in editor mode, so we
  // must read AND write from it. We also sync to ProjectContext for persistence.
  const data = editorContext.data ?? projectData;
  const setData: React.Dispatch<React.SetStateAction<any>> = (updater: any) => {
    setProjectData(updater);
    editorContext.setData(updater);
  };

  const sectionVisibility = projectSectionVisibility;
  const setSectionVisibility = (updater: React.SetStateAction<Record<PageSection, boolean>>) => {
    setProjectSectionVisibility(updater);
    setEditorSectionVisibility(updater);
  };

  const { uploadImageAndGetURL } = useFiles();
  const { menus, categories } = useCMS();
  const [showPageSettings, setShowPageSettings] = useState<string | null>(null);
  const { componentStatus: rawComponentStatus, componentStyles } = useAdmin();
  const { canAccessService } = useServiceAvailability();
  const canAccessEcommerce = canAccessService('ecommerce');

  const ECOMMERCE_SECTIONS: Set<string> = useMemo(() => new Set([
    'products', 'storeSettings', 'featuredProducts', 'categoryGrid',
    'productHero', 'saleCountdown', 'trustBadges', 'recentlyViewed',
    'productReviews', 'collectionBanner', 'productBundle', 'announcementBar',
  ]), []);

  const componentStatus = useMemo(() => {
    const merged = { ...rawComponentStatus };
    if (!canAccessEcommerce) {
      ECOMMERCE_SECTIONS.forEach(section => {
        merged[section as PageSection] = false;
      });
    }
    return merged;
  }, [rawComponentStatus, canAccessEcommerce, ECOMMERCE_SECTIONS]);

  const { navigate } = useRouter();
  const [aiAssistField, setAiAssistField] = useState<{ path: string, value: string, context: string } | null>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const addComponentRef = useRef<HTMLDivElement>(null);
  const [isControlsPanelOpen, setIsControlsPanelOpen] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [heroPrimaryLinkType, setHeroPrimaryLinkType] = useState<'manual' | 'product' | 'collection' | 'section'>('section');
  const [heroSecondaryLinkType, setHeroSecondaryLinkType] = useState<'manual' | 'product' | 'collection' | 'section'>('section');
  const [showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker] = useState(false);
  const [showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker] = useState(false);
  const [showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker] = useState(false);
  const [showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker] = useState(false);
  const [heroProductSearch, setHeroProductSearch] = useState('');
  const [showHeroImagePicker, setShowHeroImagePicker] = useState(false);

  const { products: heroProducts, categories: heroCategories, isLoading: isLoadingHeroProducts } = usePublicProducts(activeProject?.id || null, { limitCount: 100 });

  // Scroll to section item when assistant selects one
  useEffect(() => {
    if (!activeSectionItem || !activeSection || activeSectionItem.section !== activeSection) return;
    const selector = `[data-section-item="${activeSection}:${activeSectionItem.index}"]`;
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector(selector);
      if (el && 'scrollIntoView' in el) {
        try { (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [activeSectionItem, activeSection]);

  useClickOutside(addComponentRef, () => setIsAddComponentOpen(false));

  // ─── Page management handlers ─────────────────────────────────────────────
  const handleSelectPage = (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (page) { setActivePage(page); onSectionSelect(null as any); }
  };

  const handleAddPage = (templateId: PageTemplateId) => {
    const template = PAGE_TEMPLATES[templateId];
    if (template) {
      const now = new Date().toISOString();
      const newPage: SitePage = {
        id: `page-${Date.now()}`, title: template.title,
        slug: `/${templateId === 'home' ? '' : templateId}`,
        type: template.type || 'static', sections: template.sections as PageSection[],
        sectionData: {}, seo: { title: template.title, description: '' },
        isHomePage: templateId === 'home', showInNavigation: true,
        navigationOrder: pages.length + 1, createdAt: now, updatedAt: now,
      };
      if (template.dynamicSource) newPage.dynamicSource = template.dynamicSource;
      addPage(newPage); setActivePage(newPage);
    }
  };
  const handleDuplicatePage = (pageId: string) => duplicatePage(pageId);
  const handleDeletePage = (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (page && !page.isHomePage) {
      deletePage(pageId);
      if (activePage?.id === pageId) { const hp = pages.find(p => p.isHomePage); if (hp) setActivePage(hp); }
    }
  };
  const handlePageSettings = (pageId: string) => setShowPageSettings(pageId);
  const handleSavePageSettings = (pageId: string, updates: Partial<SitePage>) => { updatePage(pageId, updates); setShowPageSettings(null); };
  const isSlugUnique = (slug: string, currentPageId: string): boolean => !pages.some(p => p.id !== currentPageId && p.slug === slug);

  // ─── Effective component order & visibility ───────────────────────────────
  const effectiveComponentOrder = useMemo(() => {
    const raw = activePage?.sections?.length ? activePage.sections : componentOrder;
    const seen = new Set<PageSection>();
    return raw.filter(s => { if (seen.has(s)) return false; seen.add(s); return true; });
  }, [activePage, componentOrder]);

  const effectiveSectionVisibility = useMemo(() => {
    if (activePage?.sections?.length) {
      const vis: Record<string, boolean> = {};
      activePage.sections.forEach(s => { vis[s] = sectionVisibility[s] ?? true; });
      return vis;
    }
    return sectionVisibility;
  }, [activePage, sectionVisibility]);

  // ─── setNestedData helper ─────────────────────────────────────────────────
  const lastUpdatedSectionRef = useRef<string | null>(null);
  const setNestedData = (path: string, value: any) => {
    const sectionKey = path.split('.')[0];
    lastUpdatedSectionRef.current = sectionKey;
    setData(prevData => {
      if (!prevData) return null;
      const newData = JSON.parse(JSON.stringify(prevData));
      const keys = path.split('.');
      let current: any = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const nextKey = keys[i + 1];
        if (!current[key]) current[key] = /^\d+$/.test(nextKey) ? [] : {};
        if (typeof current[key] !== 'object') { console.warn(`Controls: Cannot traverse path '${path}' at '${key}'`); return prevData; }
        current = current[key];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  // Multi-page sync
  useEffect(() => {
    if (!activePage || !updatePage || !data || !lastUpdatedSectionRef.current) return;
    const sectionKey = lastUpdatedSectionRef.current;
    if (activePage.sections.includes(sectionKey as any)) {
      const sectionData = data[sectionKey as keyof typeof data];
      if (sectionData) {
        const tid = setTimeout(() => {
          updatePage(activePage.id, { sectionData: { ...activePage.sectionData, [sectionKey]: JSON.parse(JSON.stringify(sectionData)) } });
          lastUpdatedSectionRef.current = null;
        }, 500);
        return () => clearTimeout(tid);
      }
    }
    lastUpdatedSectionRef.current = null;
  }, [data, activePage, updatePage]);

  // Ecommerce control hooks
  const featuredProductsControls = useFeaturedProductsControls({ data, setNestedData, storeId: activeProject?.id || '' });
  const categoryGridControls = useCategoryGridControls({ data, setNestedData });
  const productHeroControls = useProductHeroControls({ data, setNestedData, storeId: activeProject?.id || '' });
  const trustBadgesControls = useTrustBadgesControls({ data, setNestedData });
  const saleCountdownControls = useSaleCountdownControls({ data, setNestedData });
  const announcementBarControls = useAnnouncementBarControls({ data, setNestedData, storeId: activeProject?.id || '' });
  const collectionBannerControls = useCollectionBannerControls({ data, setNestedData, storeId: activeProject?.id || '' });
  const recentlyViewedControls = useRecentlyViewedControls({ data, setNestedData });
  const productReviewsControls = useProductReviewsControls({ data, setNestedData });
  const productBundleControls = useProductBundleControls({ data, setNestedData, storeId: activeProject?.id || '' });
  const storeSettingsControls = useStoreSettingsControls({ data, setNestedData });

  const handleAiApply = (text: string) => { if (aiAssistField) { setNestedData(aiAssistField.path, text); setAiAssistField(null); } };
  const toggleVisibility = (section: PageSection | 'header') => {
    if (section === 'header') return;
    setSectionVisibility(prev => ({ ...prev, [section]: !prev[section as PageSection] }));
  };
  const toggleSection = (section: PageSection | 'header') => {
    if (activeSection === section) (onSectionSelect as any)(null);
    else onSectionSelect(section as any);
  };

  // ─── Deps object passed to all section renderers ──────────────────────────
  const deps: ControlsDeps = {
    data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon,
    menus, categories, navigate, uploadImageAndGetURL,
    heroProducts, heroCategories, isLoadingHeroProducts,
    heroProductSearch, setHeroProductSearch,
    showHeroImagePicker, setShowHeroImagePicker,
    showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker,
    showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker,
    showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker,
    showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker,
    heroPrimaryLinkType, setHeroPrimaryLinkType,
    heroSecondaryLinkType, setHeroSecondaryLinkType,
    isGeocoding, setIsGeocoding, geocodeError, setGeocodeError,
    faviconInputRef, isUploadingFavicon, setIsUploadingFavicon,
    componentStyles,
    renderListSectionControls: (sk: string, il: string, fields: any[]) => _renderListSectionControls(deps, sk, il, fields),
  };

  // ─── Section config ───────────────────────────────────────────────────────
  const sectionConfig: Record<PageSection, { label: string; icon: React.ElementType; renderer: () => React.ReactNode }> = {
    hero: { label: 'Hero Section', icon: Image, renderer: () => renderHeroControls(deps) },
    heroSplit: { label: 'Hero Split', icon: Image, renderer: () => renderHeroSplitControls(deps) },
    heroGallery: { label: 'Hero Gallery', icon: Image, renderer: () => renderHeroGalleryControls(deps) },
    heroWave: { label: 'Hero Wave', icon: Waves, renderer: () => renderHeroWaveControls(deps) },
    heroNova: { label: 'Hero Nova', icon: MonitorPlay, renderer: () => renderHeroNovaControls(deps) },
    features: { label: 'Features', icon: List, renderer: () => renderFeaturesControls(deps) },
    testimonials: { label: 'Testimonials', icon: Star, renderer: () => renderTestimonialsControls(deps) },
    services: { label: 'Services', icon: List, renderer: () => null },
    team: { label: 'Team', icon: Users, renderer: () => null },
    pricing: { label: 'Pricing', icon: DollarSign, renderer: () => renderPricingControls(deps) },
    faq: { label: 'FAQ', icon: HelpCircle, renderer: () => null },
    portfolio: { label: 'Portfolio', icon: Briefcase, renderer: () => null },
    leads: { label: 'Lead Form', icon: Mail, renderer: () => null },
    newsletter: { label: 'Newsletter', icon: Send, renderer: () => null },
    cta: { label: 'Call to Action', icon: MessageCircle, renderer: () => null },
    slideshow: { label: 'Slideshow', icon: PlaySquare, renderer: () => renderSlideshowControls(deps) },
    video: { label: 'Video', icon: MonitorPlay, renderer: () => renderVideoControls(deps) },
    howItWorks: { label: 'How It Works', icon: Grid, renderer: () => null },
    map: { label: 'Map', icon: MapIcon, renderer: () => renderMapControls(deps) },
    menu: { label: 'Restaurant Menu', icon: AlignJustify, renderer: () => null },
    footer: { label: 'Footer', icon: Type, renderer: () => renderFooterControls(deps) },
    header: { label: 'Navigation Bar', icon: AlignJustify, renderer: () => renderHeaderControls(deps) },
    colors: { label: 'Colores', icon: Palette, renderer: () => <GlobalStylesControl mode="colors" /> },
    typography: { label: 'Tipografía', icon: Type, renderer: () => <GlobalStylesControl mode="typography" /> },
    banner: { label: 'Banner', icon: Image, renderer: () => null },
    topBar: { label: 'Top Bar', icon: Bell, renderer: () => renderTopBarControls(deps) },
    logoBanner: { label: 'Logo Banner', icon: Layers, renderer: () => renderLogoBannerControls(deps) },
    products: { label: 'Products', icon: ShoppingBag, renderer: () => null },
    storeSettings: { label: 'Store Settings', icon: Store, renderer: () => null },
    featuredProducts: { label: 'Featured Products', icon: ShoppingBag, renderer: () => null },
    categoryGrid: { label: 'Category Grid', icon: Grid, renderer: () => null },
    productHero: { label: 'Product Hero', icon: Image, renderer: () => null },
    saleCountdown: { label: 'Sale Countdown', icon: TrendingUp, renderer: () => null },
    trustBadges: { label: 'Trust Badges', icon: Star, renderer: () => null },
    recentlyViewed: { label: 'Recently Viewed', icon: List, renderer: () => null },
    productReviews: { label: 'Product Reviews', icon: Star, renderer: () => null },
    collectionBanner: { label: 'Collection Banner', icon: Image, renderer: () => null },
    productBundle: { label: 'Product Bundle', icon: ShoppingBag, renderer: () => null },
    announcementBar: { label: 'Announcement Bar', icon: MessageCircle, renderer: () => null },
    cmsFeed: { label: 'CMS Feed', icon: FileText, renderer: () => null },
    signupFloat: { label: 'Sign Up Float', icon: UserPlus, renderer: () => null },
  };

  if (!data) return null;

  const sortableSections = effectiveComponentOrder.filter(k => k !== 'footer' && componentStatus[k as PageSection]);
  const availableComponentsToAdd = (Object.keys(sectionConfig) as PageSection[]).filter(
    section => componentStatus[section] && section !== 'typography' && section !== 'footer' && section !== 'colors'
  );

  const handleAddComponent = (section: PageSection) => {
    const newOrder = [...effectiveComponentOrder.filter(k => k !== 'footer'), section, 'footer' as PageSection];
    if (activePage) updatePage(activePage.id, { sections: newOrder });
    setComponentOrder(newOrder as PageSection[]);
    setEditorComponentOrder(newOrder as PageSection[]);
    const globalDefault = (componentStyles && componentStyles[section]) ? componentStyles[section] : {};
    setData(prevData => {
      if (!prevData) return null;
      const newData = JSON.parse(JSON.stringify(prevData));
      const sectionDefaults = (initialData.data as any)[section] || {};
      const existingData = newData[section] || {};
      newData[section] = { ...sectionDefaults, ...existingData, ...globalDefault,
        colors: { ...sectionDefaults?.colors, ...existingData?.colors, ...(globalDefault as any)?.colors },
      };
      return newData;
    });
    setSectionVisibility(prev => ({ ...prev, [section]: true }));
    setIsAddComponentOpen(false);
    onSectionSelect(section as any);
  };

  const handleRemoveComponent = (section: PageSection) => {
    const newOrder = effectiveComponentOrder.filter(k => k !== section);
    if (activePage) updatePage(activePage.id, { sections: newOrder });
    setComponentOrder(newOrder);
    setEditorComponentOrder(newOrder);
    setSectionVisibility(prev => ({ ...prev, [section]: false }));
    if (activeSection === section) onSectionSelect(null as any);
  };

  // ─── Section label helper ─────────────────────────────────────────────────
  const getSectionLabel = (section: PageSection): string => {
    const config = sectionConfig[section];
    return config?.label || section;
  };

  // ─── Active section renderer ──────────────────────────────────────────────
  const renderActiveSectionControls = () => {
    if (!activeSection) return null;
    const config = sectionConfig[activeSection];
    if (!config) return null;

    switch (activeSection) {
      case 'hero': return renderHeroControlsWithTabs(deps);
      case 'features': return renderFeaturesControlsWithTabs(deps);
      case 'testimonials': return renderTestimonialsControlsWithTabs(deps);
      case 'services': return renderServicesControlsWithTabs(deps);
      case 'team': return renderTeamControlsWithTabs(deps);
      case 'faq': return renderFAQControlsWithTabs(deps);
      case 'portfolio': return renderPortfolioControlsWithTabs(deps);
      case 'leads': return renderLeadsControlsWithTabs(deps);
      case 'newsletter': return renderNewsletterControlsWithTabs(deps);
      case 'cmsFeed': return renderCMSFeedControlsWithTabs(deps);
      case 'cta': return renderCTAControlsWithTabs(deps);
      case 'howItWorks': return renderHowItWorksControlsWithTabs(deps);
      case 'menu': return renderMenuControlsWithTabs(deps);
      case 'banner': return renderBannerControlsWithTabs(deps);
      case 'pricing': return renderPricingControlsWithTabs(deps);
      case 'slideshow': return renderSlideshowControlsWithTabs(deps);
      case 'video': return renderVideoControlsWithTabs(deps);
      case 'header': return renderHeaderControlsWithTabs(deps);
      case 'footer': return renderFooterControlsWithTabs(deps);
      case 'products': return renderProductsControlsWithTabs(deps);
      case 'heroSplit': return renderHeroSplitControls(deps);
      case 'heroGallery': return renderHeroGalleryControls(deps);
      case 'heroWave': return renderHeroWaveControls(deps);
      case 'heroNova': return renderHeroNovaControls(deps);
      case 'topBar': return renderTopBarControls(deps);
      case 'logoBanner': return renderLogoBannerControls(deps);
      case 'map': return renderMapControls(deps);
      case 'signupFloat': return renderSignupFloatControlsWithTabs(deps);
      // Ecommerce 
      case 'featuredProducts': return featuredProductsControls ? <TabbedControls contentTab={featuredProductsControls.contentTab} styleTab={featuredProductsControls.styleTab} /> : null;
      case 'categoryGrid': return categoryGridControls ? <TabbedControls contentTab={categoryGridControls.contentTab} styleTab={categoryGridControls.styleTab} /> : null;
      case 'productHero': return productHeroControls ? <TabbedControls contentTab={productHeroControls.contentTab} styleTab={productHeroControls.styleTab} /> : null;
      case 'trustBadges': return trustBadgesControls ? <TabbedControls contentTab={trustBadgesControls.contentTab} styleTab={trustBadgesControls.styleTab} /> : null;
      case 'saleCountdown': return saleCountdownControls ? <TabbedControls contentTab={saleCountdownControls.contentTab} styleTab={saleCountdownControls.styleTab} /> : null;
      case 'announcementBar': return announcementBarControls ? <TabbedControls contentTab={announcementBarControls.contentTab} styleTab={announcementBarControls.styleTab} /> : null;
      case 'collectionBanner': return collectionBannerControls ? <TabbedControls contentTab={collectionBannerControls.contentTab} styleTab={collectionBannerControls.styleTab} /> : null;
      case 'recentlyViewed': return recentlyViewedControls ? <TabbedControls contentTab={recentlyViewedControls.contentTab} styleTab={recentlyViewedControls.styleTab} /> : null;
      case 'productReviews': return productReviewsControls ? <TabbedControls contentTab={productReviewsControls.contentTab} styleTab={productReviewsControls.styleTab} /> : null;
      case 'productBundle': return productBundleControls ? <TabbedControls contentTab={productBundleControls.contentTab} styleTab={productBundleControls.styleTab} /> : null;
      case 'storeSettings': return storeSettingsControls ? <TabbedControls contentTab={storeSettingsControls.contentTab} styleTab={storeSettingsControls.styleTab} /> : null;
      default: return config.renderer();
    }
  };

  // ─── Save handler (shared between desktop/mobile/tablet) ──────────────────
  const handleSave = async () => {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      await saveProject();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving:', error);
      setSaveStatus('idle');
    }
  };

  const saveButtonClass = `w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
    saveStatus === 'saved' ? 'bg-green-500 text-white'
    : saveStatus === 'saving' ? 'bg-primary/70 text-primary-foreground cursor-wait'
    : 'bg-primary text-primary-foreground hover:opacity-90'
  }`;

  const saveButtonText = saveStatus === 'saving'
    ? t('common.saving', 'Guardando...')
    : saveStatus === 'saved'
      ? t('common.saved', '¡Guardado!')
      : t('landingEditor.applyChanges', 'Aplicar cambios');

  // ─── Reorder handler (shared) ─────────────────────────────────────────────
  const handleReorder = (newOrder: PageSection[]) => {
    if (activePage) updatePage(activePage.id, { sections: newOrder });
    setComponentOrder(newOrder);
    setEditorComponentOrder(newOrder);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* Left Panel: Sections List - Desktop */}
      <div className={`bg-card/50 border-r border-border/50 w-64 lg:w-72 flex-shrink-0 flex flex-col overflow-hidden
        fixed inset-y-0 left-0 z-40 transform duration-300 ease-in-out
        md:relative md:inset-auto md:z-auto md:transform-none md:h-full hidden md:flex`}>
        <div className="flex-1 min-h-0 overflow-hidden">
          <ComponentTree
            componentOrder={effectiveComponentOrder} activeSection={activeSection}
            sectionVisibility={effectiveSectionVisibility} componentStatus={componentStatus}
            onSectionSelect={(s) => onSectionSelect(s as any)}
            onToggleVisibility={toggleVisibility}
            onReorder={handleReorder}
            onAddComponent={handleAddComponent} onRemoveComponent={handleRemoveComponent}
            availableComponents={availableComponentsToAdd}
          />
        </div>
        <AIContentAssistant isOpen={!!aiAssistField} onClose={() => setAiAssistField(null)}
          onApply={handleAiApply} initialText={aiAssistField?.value || ''} contextPrompt={aiAssistField?.context || ''} />
      </div>

      {/* Mobile Bottom Sheet: Sections */}
      <MobileBottomSheet isOpen={isMobile && isSidebarOpen && !activeSection}
        onClose={() => setIsSidebarOpen(false)} title={t('controls.sections', 'Secciones')}>
        <div className="min-h-[50vh]">
          <ComponentTree componentOrder={effectiveComponentOrder} activeSection={activeSection}
            sectionVisibility={effectiveSectionVisibility} componentStatus={componentStatus}
            onSectionSelect={(s) => onSectionSelect(s as any)}
            onToggleVisibility={toggleVisibility} onReorder={handleReorder}
            onAddComponent={handleAddComponent} onRemoveComponent={handleRemoveComponent}
            availableComponents={availableComponentsToAdd} />
        </div>
      </MobileBottomSheet>

      {/* Controls Panel Toggle - Desktop */}
      {activeSection && isDesktop && (
        <button onClick={() => setIsControlsPanelOpen(!isControlsPanelOpen)}
          className={`fixed top-1/2 -translate-y-1/2 z-30 p-2 bg-card border border-border shadow-lg hover:bg-accent transition-all duration-300 overflow-hidden rounded-lg ${
            isControlsPanelOpen ? 'right-[calc(20rem-18px)] lg:right-[calc(24rem-18px)]' : 'right-0 rounded-l-lg rounded-r-none'
          }`}
          title={isControlsPanelOpen ? 'Ocultar controles' : 'Mostrar controles'}>
          {isControlsPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>
      )}

      {/* Right Panel: Properties - Desktop */}
      {activeSection && isDesktop && (
        <div className={`${isControlsPanelOpen ? 'w-80 lg:w-96' : 'w-0 overflow-hidden'} border-l border-border bg-card/50 flex flex-col overflow-hidden flex-shrink-0 order-last hidden md:flex transition-all duration-300`}>
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Settings size={16} className="text-primary" />
              {t('landingEditor.editSection', 'Editar')}: <span className="capitalize">{getSectionLabel(activeSection)}</span>
            </h2>
            <button onClick={() => { onSectionSelect(null as any); setIsSidebarOpen(false); }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title={t('controls.closePropertiesPanel')}>
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">{renderActiveSectionControls()}</div>
          <div className="p-4 border-t border-border flex-shrink-0">
            <button onClick={handleSave} disabled={saveStatus === 'saving'} className={saveButtonClass}>
              <Check size={16} /> {saveButtonText}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Sheet: Controls */}
      <MobileBottomSheet isOpen={!!activeSection && isMobile}
        onClose={() => { onSectionSelect(null as any); setIsSidebarOpen(true); }}
        title={activeSection ? getSectionLabel(activeSection) : ''}
        subtitle={t('landingEditor.editSection', 'Editar sección')}>
        <div className="p-4">{renderActiveSectionControls()}</div>
        <div className="sticky bottom-0 p-4 border-t border-border bg-card flex-shrink-0">
          <button onClick={handleSave} disabled={saveStatus === 'saving'} className={saveButtonClass}>
            <Check size={16} /> {saveButtonText}
          </button>
        </div>
      </MobileBottomSheet>

      {/* Tablet Slide Panel: Sections */}
      <TabletSlidePanel isOpen={isTablet && isSidebarOpen && !activeSection}
        onClose={() => setIsSidebarOpen(false)} title={t('controls.sections', 'Secciones')} position="left">
        <div className="min-h-[60vh]">
          <ComponentTree componentOrder={effectiveComponentOrder} activeSection={activeSection}
            sectionVisibility={effectiveSectionVisibility} componentStatus={componentStatus}
            onSectionSelect={(s) => onSectionSelect(s as any)}
            onToggleVisibility={toggleVisibility} onReorder={handleReorder}
            onAddComponent={handleAddComponent} onRemoveComponent={handleRemoveComponent}
            availableComponents={availableComponentsToAdd} />
        </div>
      </TabletSlidePanel>

      {/* Tablet Slide Panel: Controls */}
      <TabletSlidePanel isOpen={isTablet && !!activeSection}
        onClose={() => { onSectionSelect(null as any); setIsSidebarOpen(true); }}
        title={activeSection ? getSectionLabel(activeSection) : ''} position="left">
        <div className="p-4">{renderActiveSectionControls()}</div>
        <div className="sticky bottom-0 p-4 border-t border-border bg-card flex-shrink-0">
          <button onClick={handleSave} disabled={saveStatus === 'saving'} className={saveButtonClass}>
            <Check size={16} /> {saveButtonText}
          </button>
        </div>
      </TabletSlidePanel>

      {/* Page Settings Modal */}
      {showPageSettings && (
        <PageSettings page={pages.find(p => p.id === showPageSettings)!}
          onSave={handleSavePageSettings} onClose={() => setShowPageSettings(null)} isSlugUnique={isSlugUnique} />
      )}
    </>
  );
};

export default Controls;
