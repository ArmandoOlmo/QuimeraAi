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
import { safeClone } from '../../utils/sanitize';
import { useAdmin } from '../../contexts/admin';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import { initialData } from '../../data/initialData';
import { canAccessRegistryItem, componentHasEditableControls, getRegistryItem } from '../../data/componentRegistry';
import { isRetiredDesignSuiteSection } from '../../data/retiredSuites';
import { PageSection } from '../../types';
import { SitePage } from '../../types/project';
import { usePlanAccess } from '../../hooks/usePlanFeatures';
import { resolveProjectName } from '../../utils/resolveProjectName';
import { getInitialDataForLandingComponent } from '../../utils/landingSectionDefaults';
import PageSettings from '../dashboard/PageSettings';
import PageSelector from '../dashboard/PageSelector';
import { PageTemplateId, PAGE_TEMPLATES } from '../../types/onboarding';
import GlobalStylesControl from '../ui/GlobalStylesControl';
import MobileBottomSheet from '../ui/MobileBottomSheet';
import TabletSlidePanel from '../ui/TabletSlidePanel';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useViewportType } from '../../hooks/use-mobile';
import { useSafeUndo } from '../../contexts/undo';
import {
  Image, List, Star, PlaySquare, Users, DollarSign,
  Briefcase, MessageCircle, Mail, Send, Type,
  Settings, AlignJustify, MonitorPlay, Grid, HelpCircle, X, Palette,
  TrendingUp, MapIcon, ShoppingBag, Store, Waves, Bell,
  FileText, Layers, UserPlus, PanelRightClose, PanelRightOpen, MessageSquare, Minus, Building2, CalendarCheck,
  LayoutTemplate, MessageSquareCode, PaintBucket, Link as LinkIcon, BarChart3, Sparkles,
} from 'lucide-react';
import { usePublicProducts } from '../../hooks/usePublicProducts';
import { resolveProjectBackedStoreIdentity } from '../../utils/ecommerce/storeIdentity';
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
  renderHeroLeadControls,
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
  renderFAQControlsWithTabs, renderPortfolioControlsWithTabs, renderShowcaseControlsWithTabs,
  renderLeadsControlsWithTabs, renderCMSFeedControlsWithTabs,
  renderNewsletterControlsWithTabs, renderCTAControlsWithTabs,
  renderHowItWorksControlsWithTabs, renderMenuControlsWithTabs,
  renderBannerControlsWithTabs,
  renderProductsControlsWithTabs, renderSignupFloatControlsWithTabs,
  renderChatbotControlsWithTabs,
  renderSeparatorControlsWithTabs,
  renderRealEstateListingsControlsWithTabs,
  renderRestaurantReservationControlsWithTabs,
  renderHeroLuminaControls,
  renderFeaturesLuminaControls,
  renderCtaLuminaControls,
  renderPortfolioLuminaControls,
  renderPricingLuminaControls,
  renderTestimonialsLuminaControls,
  renderFaqLuminaControls,
} from './sections';

import { renderHeroNeonControls } from './sections/renderHeroNeonControls';
import { renderTestimonialsNeonControls } from './sections/renderTestimonialsNeonControls';
import { renderFeaturesNeonControls } from './sections/renderFeaturesNeonControls';
import { renderCtaNeonControls } from './sections/renderCtaNeonControls';
import { renderPortfolioNeonControls } from './sections/renderPortfolioNeonControls';
import { renderPricingNeonControls } from './sections/renderPricingNeonControls';
import { renderFaqNeonControls } from './sections/renderFaqNeonControls';
import {
  renderHeroQuimeraControls,
  renderFeaturesQuimeraControls,
  renderCtaQuimeraControls,
  renderPricingQuimeraControls,
  renderTestimonialsQuimeraControls,
  renderFaqQuimeraControls,
  renderMetricsQuimeraControls,
  renderGenericQuimeraControls,
  renderPlatformShowcaseQuimeraControls,
  renderAiCapabilitiesQuimeraControls,
  renderAgencyWhiteLabelQuimeraControls,
  renderIndustrySolutionsQuimeraControls,
  renderContentManagerQuimeraControls,
  renderImageGeneratorQuimeraControls,
  renderChatbotWorkflowQuimeraControls,
  renderChatbotBuilderQuimeraControls,
  renderLeadsManagerQuimeraControls,
  renderAppointmentsQuimeraControls,
  renderBioPageQuimeraControls,
  renderEmailMarketingQuimeraControls,
} from './landing/LandingQuimeraControls';
import { normalizeEditorControlData } from './normalizeControlData';

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
    syncWebsiteBlueprint,
    pages, activePage, setActivePage, addPage, updatePage, deletePage, duplicatePage,
    sectionVisibility: projectSectionVisibility,
    setSectionVisibility: setProjectSectionVisibility,
    theme, pushProjectUndoAction
  } = useProject();

  const editorContext = useEditor();
  const setEditorSectionVisibility = editorContext.setSectionVisibility;
  const setEditorComponentOrder = editorContext.setComponentOrder;

  // CRITICAL: Use EditorContext data as source of truth for the editor preview.
  // The LandingPage reads from editorContext.data when in editor mode, so we
  // must read AND write from it. We also sync to ProjectContext for persistence.
  const data = useMemo(
    () => normalizeEditorControlData(editorContext.data ?? projectData),
    [editorContext.data, projectData]
  );
  const setData: React.Dispatch<React.SetStateAction<any>> = (updater: any) => {
    setProjectData(updater);
    editorContext.setData(updater);
  };

  // Set active undo module
  const undoContext = useSafeUndo();
  useEffect(() => {
    if (undoContext?.setActiveModule) {
      undoContext.setActiveModule('project');
    }
  }, [undoContext?.setActiveModule]);

  const sectionVisibility = projectSectionVisibility;
  const setSectionVisibility = (updater: React.SetStateAction<Record<PageSection, boolean>>) => {
    setProjectSectionVisibility(updater);
    setEditorSectionVisibility(updater);
  };

  const { uploadFile } = useFiles();
  const { menus, categories } = useCMS();
  const [showPageSettings, setShowPageSettings] = useState<string | null>(null);
  const { componentStatus: rawComponentStatus, componentStyles } = useAdmin();
  const { isServicePublic, isLoading: isLoadingServiceAvailability } = useServiceAvailability();
  const { hasAccess: hasPlanAccess, isLoading: isLoadingPlanAccess } = usePlanAccess();

  const isComponentServiceAvailable = (section: PageSection): boolean => {
    const registryItem = getRegistryItem(section);
    if (!registryItem?.requiredService) return true;
    return canAccessRegistryItem(registryItem, {
      canAccessService: serviceId => !isLoadingServiceAvailability && isServicePublic(serviceId),
      hasPlanFeature: feature => !isLoadingPlanAccess && hasPlanAccess(feature),
    });
  };
  const isComponentPlanAvailable = (section: PageSection): boolean => {
    const requiredFeature = getRegistryItem(section)?.requiredFeature;
    if (!requiredFeature) return true;
    return !isLoadingPlanAccess && hasPlanAccess(requiredFeature);
  };
  const isComponentAccessAvailable = (section: PageSection): boolean =>
    isComponentServiceAvailable(section) && isComponentPlanAvailable(section);
  const componentStatus = useMemo(() => {
    const knownSections = new Set<PageSection>([
      ...(initialData.componentOrder as PageSection[]),
      ...(componentOrder || []),
      ...((activePage?.sections || []) as PageSection[]),
      ...(Object.keys(rawComponentStatus || {}) as PageSection[]),
    ]);
    const nextStatus = { ...(rawComponentStatus || {}) } as Record<PageSection, boolean>;
    knownSections.forEach(section => {
      nextStatus[section] = rawComponentStatus?.[section] !== false && isComponentAccessAvailable(section);
    });
    return nextStatus;
  }, [
    activePage?.sections,
    componentOrder,
    rawComponentStatus,
    isLoadingServiceAvailability,
    isServicePublic,
    isLoadingPlanAccess,
    hasPlanAccess,
  ]);
  const isComponentEnabled = (section: PageSection) =>
    componentStatus?.[section] !== false;
  useEffect(() => {
    if (activeSection && !isComponentEnabled(activeSection)) {
      onSectionSelect(null as any);
    }
  }, [activeSection, componentStatus, onSectionSelect]);

  const { navigate } = useRouter();
  const [aiAssistField, setAiAssistField] = useState<{ path: string, value: string, context: string } | null>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const addComponentRef = useRef<HTMLDivElement>(null);
  const [isControlsPanelOpen, setIsControlsPanelOpen] = useState(true);
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

  const ecommerceStoreId = useMemo(() => resolveProjectBackedStoreIdentity({
    projectId: activeProject?.id,
    project: activeProject,
    businessBlueprint: activeProject?.businessBlueprint,
  }).engineStoreId || '', [activeProject]);

  const { products: heroProducts, categories: heroCategories, isLoading: isLoadingHeroProducts } = usePublicProducts(ecommerceStoreId || null, { limitCount: 100 });

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
    if (page) { setActivePage(page.id); onSectionSelect(null as any); }
  };

  const handleAddPage = (templateId: PageTemplateId) => {
    const template = PAGE_TEMPLATES[templateId];
    if (template) {
      addPage(templateId).then((pageId) => {
        setActivePage(pageId);
      });
    }
  };
  const handleDuplicatePage = (pageId: string) => duplicatePage(pageId);
  const handleDeletePage = (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (page && !page.isHomePage) {
      deletePage(pageId);
      if (activePage?.id === pageId) { const hp = pages.find(p => p.isHomePage); if (hp) setActivePage(hp.id); }
    }
  };
  const handlePageSettings = (pageId: string) => setShowPageSettings(pageId);
  const handleSavePageSettings = (pageId: string, updates: Partial<SitePage>) => { updatePage(pageId, updates); setShowPageSettings(null); };
  const isSlugUnique = (slug: string, currentPageId: string): boolean => !pages.some(p => p.id !== currentPageId && p.slug === slug);
  const usesPageSections = Boolean(activePage?.sections?.length && !activePage.isHomePage);

  // ─── Effective component order & visibility ───────────────────────────────
  const effectiveComponentOrder = useMemo(() => {
    const raw = usesPageSections ? activePage!.sections : componentOrder;
    const seen = new Set<PageSection>();
    return raw.filter(s => {
      if (seen.has(s) || isRetiredDesignSuiteSection(s)) return false;
      seen.add(s);
      return true;
    });
  }, [activePage, componentOrder, usesPageSections]);

  const effectiveSectionVisibility = useMemo(() => {
    if (usesPageSections) {
      const vis: Record<string, boolean> = {};
      activePage!.sections.forEach(s => { vis[s] = sectionVisibility[s] ?? true; });
      vis.header = sectionVisibility.header ?? true;
      vis.footer = sectionVisibility.footer ?? true;
      return vis;
    }
    return sectionVisibility;
  }, [activePage, sectionVisibility, usesPageSections]);

  // ─── setNestedData helper ─────────────────────────────────────────────────
  const lastUpdatedSectionRef = useRef<string | null>(null);
  const setNestedData = (path: string, value: any) => {
    if (!data) return;

    const normalizedPath = path.replace(/\?\./g, '.');
    const sectionKey = normalizedPath.split('.')[0];
    lastUpdatedSectionRef.current = sectionKey;
    const newData = safeClone(data);
    const keys = normalizedPath.split('.');
    let current: any = newData;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const nextKey = keys[i + 1];
      if (!current[key]) current[key] = /^\d+$/.test(nextKey) ? [] : {};
      if (typeof current[key] !== 'object') {
        console.warn(`Controls: Cannot traverse path '${path}' at '${key}'`);
        return;
      }
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    setData(newData);
    syncWebsiteBlueprint({
      action: 'section_settings',
      touchedSection: sectionKey as PageSection,
      data: newData,
    });
  };

  // Multi-page sync
  useEffect(() => {
    if (!activePage || !updatePage || !data || !lastUpdatedSectionRef.current) return;
    if (activePage.isHomePage) {
      lastUpdatedSectionRef.current = null;
      return;
    }
    const sectionKey = lastUpdatedSectionRef.current;
    if (activePage?.sections?.includes(sectionKey as any)) {
      const sectionData = data[sectionKey as keyof typeof data];
      if (sectionData) {
        const tid = setTimeout(() => {
          // Extract the absolute latest data for all active sections to prevent stale state
          // overwrites when updatePage syncs back to global data.
          const updatedPageSectionData: any = { ...activePage.sectionData };
          activePage.sections?.forEach((sec: string) => {
            if (data[sec]) updatedPageSectionData[sec] = safeClone(data[sec]);
          });
          console.log(`[Controls] Syncing section '${sectionKey}' to ProjectContext updatePage. Keys updated:`, Object.keys(updatedPageSectionData));
          updatePage(activePage.id, { sectionData: updatedPageSectionData });
          lastUpdatedSectionRef.current = null;
        }, 500);
        return () => clearTimeout(tid);
      }
    }
    lastUpdatedSectionRef.current = null;
  }, [data, activePage, updatePage]);

  // Ecommerce control hooks
  const featuredProductsControls = useFeaturedProductsControls({ data, setNestedData, storeId: ecommerceStoreId });
  const categoryGridControls = useCategoryGridControls({ data, setNestedData, storeId: ecommerceStoreId });
  const productHeroControls = useProductHeroControls({ data, setNestedData, storeId: ecommerceStoreId });
  const trustBadgesControls = useTrustBadgesControls({ data, setNestedData });
  const saleCountdownControls = useSaleCountdownControls({ data, setNestedData });
  const announcementBarControls = useAnnouncementBarControls({ data, setNestedData, storeId: ecommerceStoreId });
  const collectionBannerControls = useCollectionBannerControls({ data, setNestedData, storeId: ecommerceStoreId });
  const recentlyViewedControls = useRecentlyViewedControls({ data, setNestedData });
  const productReviewsControls = useProductReviewsControls({ data, setNestedData });
  const productBundleControls = useProductBundleControls({ data, setNestedData, storeId: ecommerceStoreId });
  const storeSettingsControls = useStoreSettingsControls({ data, setNestedData });

  const handleAiApply = (text: string) => { if (aiAssistField) { setNestedData(aiAssistField.path, text); setAiAssistField(null); } };
  const toggleVisibility = (section: PageSection | 'header') => {
    if (section === 'header') return;
    const newVisibility = { ...sectionVisibility, [section as PageSection]: !sectionVisibility[section as PageSection] };
    setSectionVisibility(newVisibility);
    syncWebsiteBlueprint({
      action: 'section_visibility',
      touchedSection: section as PageSection,
      sectionVisibility: newVisibility,
    });
    
    pushProjectUndoAction(
        newVisibility[section as PageSection] ? `Mostró la sección ${section}` : `Ocultó la sección ${section}`,
        {
            data,
            theme,
            componentOrder,
            sectionVisibility: newVisibility,
            pages
        }
    );
  };
  const toggleSection = (section: PageSection | 'header') => {
    if (activeSection === section) (onSectionSelect as any)(null);
    else onSectionSelect(section as any);
  };

  // ─── Deps object passed to all section renderers ──────────────────────────
  const deps: ControlsDeps = {
    data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon,
    uploadFile,
    menus, categories, navigate,
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

  const getScopedSectionDeps = (section: PageSection): ControlsDeps & { allSections: Array<{ id: string; type: string }> } => ({
    ...deps,
    data: data?.[section] || {},
    setNestedData: (path: string, value: any) => {
      const normalizedPath = path.replace(/\?\./g, '.');
      setNestedData(`${section}.${normalizedPath}`, value);
    },
    setAiAssistField: field => {
      if (!field) {
        setAiAssistField(null);
        return;
      }
      const normalizedPath = field.path.replace(/\?\./g, '.');
      setAiAssistField({ ...field, path: `${section}.${normalizedPath}` });
    },
    allSections: effectiveComponentOrder.map(sectionType => ({
      id: sectionType,
      type: sectionType,
    })),
  });

  const getAliasSectionDeps = (section: PageSection, sourceKey: string): ControlsDeps => ({
    ...deps,
    data: {
      ...(data || {}),
      [sourceKey]: data?.[section] || {},
    },
    setNestedData: (path: string, value: any) => {
      const normalizedPath = path.replace(/\?\./g, '.');
      const mappedPath = normalizedPath === sourceKey || normalizedPath.startsWith(`${sourceKey}.`)
        ? `${section}${normalizedPath.slice(sourceKey.length)}`
        : normalizedPath;
      setNestedData(mappedPath, value);
    },
    setAiAssistField: field => {
      if (!field) {
        setAiAssistField(null);
        return;
      }
      const normalizedPath = field.path.replace(/\?\./g, '.');
      const mappedPath = normalizedPath === sourceKey || normalizedPath.startsWith(`${sourceKey}.`)
        ? `${section}${normalizedPath.slice(sourceKey.length)}`
        : normalizedPath;
      setAiAssistField({ ...field, path: mappedPath });
    },
  });

  const renderScopedControls = (
    section: PageSection,
    renderer: (deps: ControlsDeps & { allSections?: Array<{ id: string; type: string }> }) => React.ReactNode,
  ) => renderer(getScopedSectionDeps(section));

  // ─── Section config ───────────────────────────────────────────────────────
  const sectionConfig: Partial<Record<PageSection, { label: string; icon: React.ElementType; renderer: () => React.ReactNode }>> = {
    hero: { label: 'Hero Section', icon: Image, renderer: () => renderHeroControls(deps) },
    heroModern: { label: 'Hero Modern', icon: MonitorPlay, renderer: () => renderHeroControlsWithTabs(getAliasSectionDeps('heroModern', 'hero')) },
    heroGradient: { label: 'Hero Gradient', icon: MonitorPlay, renderer: () => renderHeroControlsWithTabs(getAliasSectionDeps('heroGradient', 'hero')) },
    heroSplit: { label: 'Hero Split', icon: Image, renderer: () => renderHeroSplitControls(deps) },
    heroGallery: { label: 'Hero Gallery', icon: Image, renderer: () => renderHeroGalleryControls(deps) },
    heroWave: { label: 'Hero Wave', icon: Waves, renderer: () => renderHeroWaveControls(deps) },
    heroNova: { label: 'Hero Nova', icon: MonitorPlay, renderer: () => renderHeroNovaControls(deps) },
    heroLead: { label: 'Hero Lead', icon: Mail, renderer: () => renderHeroLeadControls(deps) },
    features: { label: 'Features', icon: List, renderer: () => renderFeaturesControls(deps) },
    testimonials: { label: 'Testimonials', icon: Star, renderer: () => renderTestimonialsControls(deps) },
    services: { label: 'Services', icon: List, renderer: () => renderServicesControlsWithTabs(deps) },
    team: { label: 'Team', icon: Users, renderer: () => renderTeamControlsWithTabs(deps) },
    pricing: { label: 'Pricing', icon: DollarSign, renderer: () => renderPricingControls(deps) },
    faq: { label: 'FAQ', icon: HelpCircle, renderer: () => renderFAQControlsWithTabs(deps) },
    portfolio: { label: 'Portfolio', icon: Briefcase, renderer: () => renderPortfolioControlsWithTabs(deps) },
    showcase: { label: 'Showcase', icon: Grid, renderer: () => renderShowcaseControlsWithTabs(deps) },
    leads: { label: 'Lead Form', icon: Mail, renderer: () => renderLeadsControlsWithTabs(deps) },
    newsletter: { label: 'Newsletter', icon: Send, renderer: () => renderNewsletterControlsWithTabs(deps) },
    cta: { label: 'Call to Action', icon: MessageCircle, renderer: () => renderCTAControlsWithTabs(deps) },
    slideshow: { label: 'Slideshow', icon: PlaySquare, renderer: () => renderSlideshowControls(deps) },
    screenshotCarousel: { label: 'Screenshot Carousel', icon: PlaySquare, renderer: () => renderSlideshowControlsWithTabs(getAliasSectionDeps('screenshotCarousel', 'slideshow')) },
    video: { label: 'Video', icon: MonitorPlay, renderer: () => renderVideoControls(deps) },
    howItWorks: { label: 'How It Works', icon: Grid, renderer: () => renderHowItWorksControlsWithTabs(deps) },
    separator1: { label: 'Separador 1', icon: Minus, renderer: () => renderSeparatorControlsWithTabs(deps, 'separator1') },
    separator2: { label: 'Separador 2', icon: Minus, renderer: () => renderSeparatorControlsWithTabs(deps, 'separator2') },
    separator3: { label: 'Separador 3', icon: Minus, renderer: () => renderSeparatorControlsWithTabs(deps, 'separator3') },
    separator4: { label: 'Separador 4', icon: Minus, renderer: () => renderSeparatorControlsWithTabs(deps, 'separator4') },
    separator5: { label: 'Separador 5', icon: Minus, renderer: () => renderSeparatorControlsWithTabs(deps, 'separator5') },
    map: { label: 'Map', icon: MapIcon, renderer: () => renderMapControls(deps) },
    menu: { label: 'Restaurant Menu', icon: AlignJustify, renderer: () => renderMenuControlsWithTabs(deps) },
    footer: { label: 'Footer', icon: Type, renderer: () => renderFooterControls(deps) },
    header: { label: 'Navigation Bar', icon: AlignJustify, renderer: () => renderHeaderControls(deps) },
    colors: { label: 'Colores', icon: Palette, renderer: () => <GlobalStylesControl mode="colors" /> },
    typography: { label: 'Tipografía', icon: Type, renderer: () => <GlobalStylesControl mode="typography" /> },
    banner: { label: 'Banner', icon: Image, renderer: () => renderBannerControlsWithTabs(deps) },
    topBar: { label: 'Top Bar', icon: Bell, renderer: () => renderTopBarControls(deps) },
    logoBanner: { label: 'Logo Banner', icon: Layers, renderer: () => renderLogoBannerControls(deps) },
    products: { label: 'Products', icon: ShoppingBag, renderer: () => renderProductsControlsWithTabs(deps) },
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
    realEstateListings: { label: t('realEstate.websiteListings.builderLabel'), icon: Building2, renderer: () => renderRealEstateListingsControlsWithTabs(deps) },
    restaurantReservation: { label: t('editor.restaurantReservationSection'), icon: CalendarCheck, renderer: () => renderRestaurantReservationControlsWithTabs(deps) },
    cmsFeed: { label: 'CMS Feed', icon: FileText, renderer: () => renderCMSFeedControlsWithTabs(deps) },
    signupFloat: { label: 'Sign Up Float', icon: UserPlus, renderer: () => renderSignupFloatControlsWithTabs(deps) },
    chatbot: { label: 'Chatbot', icon: MessageSquare, renderer: () => renderChatbotControlsWithTabs(deps) },
    heroLumina: { label: 'Hero Lumina', icon: MonitorPlay, renderer: () => renderHeroLuminaControls(deps) },
    featuresLumina: { label: 'Features Lumina', icon: List, renderer: () => renderFeaturesLuminaControls(deps) },
    ctaLumina: { label: 'CTA Lumina', icon: MessageCircle, renderer: () => renderCtaLuminaControls(deps) },
    portfolioLumina: { label: 'Portfolio Lumina', icon: Briefcase, renderer: () => renderPortfolioLuminaControls(deps) },
    pricingLumina: { label: 'Pricing Lumina', icon: DollarSign, renderer: () => renderPricingLuminaControls(deps) },
    testimonialsLumina: { label: 'Testimonials Lumina', icon: Star, renderer: () => renderTestimonialsLuminaControls(deps) },
    faqLumina: { label: 'FAQ Lumina', icon: HelpCircle, renderer: () => renderFaqLuminaControls(deps) },
    heroNeon: { label: 'Hero Neon', icon: MonitorPlay, renderer: () => renderHeroNeonControls(deps) },
    testimonialsNeon: { label: 'Testimonials Neon', icon: Star, renderer: () => renderTestimonialsNeonControls(deps) },
    featuresNeon: { label: 'Features Neon', icon: List, renderer: () => renderFeaturesNeonControls(deps) },
    ctaNeon: { label: 'CTA Neon', icon: MessageCircle, renderer: () => renderCtaNeonControls(deps) },
    portfolioNeon: { label: 'Portfolio Neon', icon: Briefcase, renderer: () => renderPortfolioNeonControls(deps) },
    pricingNeon: { label: 'Pricing Neon', icon: DollarSign, renderer: () => renderPricingNeonControls(deps) },
    faqNeon: { label: 'FAQ Neon', icon: HelpCircle, renderer: () => renderFaqNeonControls(deps) },
    heroQuimera: { label: 'Hero Quimera', icon: MonitorPlay, renderer: () => renderScopedControls('heroQuimera', renderHeroQuimeraControls) },
    whatIsQuimera: { label: 'What is Quimera', icon: FileText, renderer: () => renderScopedControls('whatIsQuimera', renderGenericQuimeraControls) },
    templatesPreviewQuimera: { label: 'Templates Preview', icon: LayoutTemplate, renderer: () => renderScopedControls('templatesPreviewQuimera', renderGenericQuimeraControls) },
    aiWebStudioQuimera: { label: 'AI Web Studio', icon: MessageSquareCode, renderer: () => renderScopedControls('aiWebStudioQuimera', renderGenericQuimeraControls) },
    contentManagerQuimera: { label: 'Content Manager', icon: FileText, renderer: () => renderScopedControls('contentManagerQuimera', renderContentManagerQuimeraControls) },
    imageGeneratorQuimera: { label: 'Image Generator', icon: Image, renderer: () => renderScopedControls('imageGeneratorQuimera', renderImageGeneratorQuimeraControls) },
    chatbotWorkflowQuimera: { label: 'Chatbot Workflow', icon: Layers, renderer: () => renderScopedControls('chatbotWorkflowQuimera', renderChatbotWorkflowQuimeraControls) },
    chatbotBuilderQuimera: { label: 'Chatbot Builder', icon: PaintBucket, renderer: () => renderScopedControls('chatbotBuilderQuimera', renderChatbotBuilderQuimeraControls) },
    leadsManagerQuimera: { label: 'Leads Manager', icon: Users, renderer: () => renderScopedControls('leadsManagerQuimera', renderLeadsManagerQuimeraControls) },
    appointmentsQuimera: { label: 'Appointments', icon: CalendarCheck, renderer: () => renderScopedControls('appointmentsQuimera', renderAppointmentsQuimeraControls) },
    bioPageQuimera: { label: 'Bio Page', icon: LinkIcon, renderer: () => renderScopedControls('bioPageQuimera', renderBioPageQuimeraControls) },
    emailMarketingQuimera: { label: 'Email Marketing', icon: Send, renderer: () => renderScopedControls('emailMarketingQuimera', renderEmailMarketingQuimeraControls) },
    featuresQuimera: { label: 'Features Quimera', icon: List, renderer: () => renderScopedControls('featuresQuimera', renderFeaturesQuimeraControls) },
    platformShowcaseQuimera: { label: 'Platform Showcase', icon: Grid, renderer: () => renderScopedControls('platformShowcaseQuimera', renderPlatformShowcaseQuimeraControls) },
    bentoShowcaseQuimera: { label: 'Bento Showcase', icon: Grid, renderer: () => renderScopedControls('bentoShowcaseQuimera', renderFeaturesQuimeraControls) },
    agentDemonstrationQuimera: { label: 'Agent Demonstration', icon: MessageSquare, renderer: () => renderScopedControls('agentDemonstrationQuimera', renderAiCapabilitiesQuimeraControls) },
    pricingQuimera: { label: 'Pricing Quimera', icon: DollarSign, renderer: () => renderScopedControls('pricingQuimera', renderPricingQuimeraControls) },
    testimonialsQuimera: { label: 'Testimonials Quimera', icon: Star, renderer: () => renderScopedControls('testimonialsQuimera', renderTestimonialsQuimeraControls) },
    faqQuimera: { label: 'FAQ Quimera', icon: HelpCircle, renderer: () => renderScopedControls('faqQuimera', renderFaqQuimeraControls) },
    metricsQuimera: { label: 'Metrics Quimera', icon: BarChart3, renderer: () => renderScopedControls('metricsQuimera', renderMetricsQuimeraControls) },
    aiCapabilitiesQuimera: { label: 'AI Capabilities', icon: Sparkles, renderer: () => renderScopedControls('aiCapabilitiesQuimera', renderAiCapabilitiesQuimeraControls) },
    industrySolutionsQuimera: { label: 'Industry Solutions', icon: Building2, renderer: () => renderScopedControls('industrySolutionsQuimera', renderIndustrySolutionsQuimeraControls) },
    agencyWhiteLabelQuimera: { label: 'Agency White Label', icon: Users, renderer: () => renderScopedControls('agencyWhiteLabelQuimera', renderAgencyWhiteLabelQuimeraControls) },
    ctaQuimera: { label: 'CTA Quimera', icon: MessageCircle, renderer: () => renderScopedControls('ctaQuimera', renderCtaQuimeraControls) },
    finalCtaQuimera: { label: 'Final CTA Quimera', icon: MessageCircle, renderer: () => renderScopedControls('finalCtaQuimera', renderCtaQuimeraControls) },
  };

  if (!data) return null;

  const availableComponentsToAdd = (Object.keys(sectionConfig) as PageSection[]).filter(
    section => isComponentEnabled(section) &&
      componentHasEditableControls(section) &&
      section !== 'header' &&
      section !== 'typography' &&
      section !== 'footer' &&
      section !== 'colors' &&
      !isRetiredDesignSuiteSection(section)
  );

  const handleAddComponent = (section: PageSection) => {
    if (isRetiredDesignSuiteSection(section)) return;
    const newOrder = [...effectiveComponentOrder.filter(k => k !== 'footer'), section, 'footer' as PageSection];
    const nextComponentOrder = usesPageSections
      ? componentOrder.includes(section)
        ? componentOrder
        : [...componentOrder.filter(k => k !== 'footer'), section, 'footer' as PageSection]
      : newOrder;
    const nextPages = usesPageSections && activePage
      ? pages.map(page => page.id === activePage.id ? { ...page, sections: newOrder } : page)
      : pages;

    if (usesPageSections && activePage) updatePage(activePage.id, { sections: newOrder });
    setComponentOrder(nextComponentOrder as PageSection[]);
    setEditorComponentOrder(nextComponentOrder as PageSection[]);
    const globalDefault = (componentStyles && componentStyles[section]) ? componentStyles[section] : {};
    const newDataSnapshot = safeClone(data);
    const sectionDefaults = (initialData.data as any)[section] || getInitialDataForLandingComponent(section);
    const existingData = newDataSnapshot[section] || {};
    newDataSnapshot[section] = { ...sectionDefaults, ...existingData, ...globalDefault,
      colors: { ...sectionDefaults?.colors, ...existingData?.colors, ...(globalDefault as any)?.colors },
    };
    setData(newDataSnapshot);
    
    const newVisibility = { ...sectionVisibility, [section]: true };
    setSectionVisibility(newVisibility);
    syncWebsiteBlueprint({
      action: 'component_add',
      touchedSection: section,
      data: newDataSnapshot,
      componentOrder: nextComponentOrder as PageSection[],
      sectionVisibility: newVisibility,
      pages: nextPages,
    });
    setIsAddComponentOpen(false);
    onSectionSelect(section as any);
    
    pushProjectUndoAction(`Añadió la sección ${section}`, {
        data: newDataSnapshot,
        theme,
        componentOrder: nextComponentOrder as PageSection[],
        sectionVisibility: newVisibility,
        pages: nextPages
    });
  };

  const handleRemoveComponent = (section: PageSection) => {
    const newOrder = effectiveComponentOrder.filter(k => k !== section);
    const nextPages = usesPageSections && activePage
      ? pages.map(page => page.id === activePage.id ? { ...page, sections: newOrder } : page)
      : pages;
    if (usesPageSections && activePage) {
      updatePage(activePage.id, { sections: newOrder });
    } else {
      setComponentOrder(newOrder);
      setEditorComponentOrder(newOrder);
    }
    const newVisibility = usesPageSections ? sectionVisibility : { ...sectionVisibility, [section]: false };
    setSectionVisibility(newVisibility);
    syncWebsiteBlueprint({
      action: 'component_remove',
      touchedSection: section,
      componentOrder: usesPageSections ? componentOrder : newOrder,
      sectionVisibility: newVisibility,
      pages: nextPages,
    });
    if (activeSection === section) onSectionSelect(null as any);
    
    pushProjectUndoAction(`Eliminó la sección ${section}`, {
        data,
        theme,
        componentOrder: usesPageSections ? componentOrder : newOrder,
        sectionVisibility: newVisibility,
        pages: nextPages
    });
  };

  // ─── Section label helper ─────────────────────────────────────────────────
  const getSectionLabel = (section: PageSection): string => {
    const config = sectionConfig[section];
    return resolveProjectName(config?.label || section);
  };

  // ─── Active section renderer ──────────────────────────────────────────────
  const renderActiveSectionControls = () => {
    if (!activeSection) return null;
    const config = sectionConfig[activeSection];
    if (!config) return null;
    if (!isComponentEnabled(activeSection)) return null;

    switch (activeSection) {
      case 'hero': return renderHeroControlsWithTabs(deps);
      case 'heroModern': return renderHeroControlsWithTabs(getAliasSectionDeps('heroModern', 'hero'));
      case 'heroGradient': return renderHeroControlsWithTabs(getAliasSectionDeps('heroGradient', 'hero'));
      case 'features': return renderFeaturesControlsWithTabs(deps);
      case 'testimonials': return renderTestimonialsControlsWithTabs(deps);
      case 'services': return renderServicesControlsWithTabs(deps);
      case 'team': return renderTeamControlsWithTabs(deps);
      case 'faq': return renderFAQControlsWithTabs(deps);
      case 'portfolio': return renderPortfolioControlsWithTabs(deps);
      case 'showcase': return renderShowcaseControlsWithTabs(deps);
      case 'leads': return renderLeadsControlsWithTabs(deps);
      case 'newsletter': return renderNewsletterControlsWithTabs(deps);
      case 'cmsFeed': return renderCMSFeedControlsWithTabs(deps);
      case 'cta': return renderCTAControlsWithTabs(deps);
      case 'howItWorks': return renderHowItWorksControlsWithTabs(deps);
      case 'separator1': return renderSeparatorControlsWithTabs(deps, 'separator1');
      case 'separator2': return renderSeparatorControlsWithTabs(deps, 'separator2');
      case 'separator3': return renderSeparatorControlsWithTabs(deps, 'separator3');
      case 'separator4': return renderSeparatorControlsWithTabs(deps, 'separator4');
      case 'separator5': return renderSeparatorControlsWithTabs(deps, 'separator5');
      case 'chatbot': return renderChatbotControlsWithTabs(deps);
      case 'menu': return renderMenuControlsWithTabs(deps);
      case 'banner': return renderBannerControlsWithTabs(deps);
      case 'pricing': return renderPricingControlsWithTabs(deps);
      case 'slideshow': return renderSlideshowControlsWithTabs(deps);
      case 'screenshotCarousel': return renderSlideshowControlsWithTabs(getAliasSectionDeps('screenshotCarousel', 'slideshow'));
      case 'video': return renderVideoControlsWithTabs(deps);
      case 'header': return renderHeaderControlsWithTabs(deps);
      case 'footer': return renderFooterControlsWithTabs(deps);
      case 'products': return renderProductsControlsWithTabs(deps);
      case 'heroSplit': return renderHeroSplitControls(deps);
      case 'heroGallery': return renderHeroGalleryControls(deps);
      case 'heroWave': return renderHeroWaveControls(deps);
      case 'heroNova': return renderHeroNovaControls(deps);
      case 'heroLead': return renderHeroLeadControls(deps);
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
      case 'realEstateListings': return renderRealEstateListingsControlsWithTabs(deps);
      case 'restaurantReservation': return renderRestaurantReservationControlsWithTabs(deps);
      case 'heroLumina': return renderHeroLuminaControls(deps);
      case 'featuresLumina': return renderFeaturesLuminaControls(deps);
      case 'ctaLumina': return renderCtaLuminaControls(deps);
      case 'portfolioLumina': return renderPortfolioLuminaControls(deps);
      case 'pricingLumina': return renderPricingLuminaControls(deps);
      case 'testimonialsLumina': return renderTestimonialsLuminaControls(deps);
      case 'faqLumina': return renderFaqLuminaControls(deps);
      case 'heroNeon': return renderHeroNeonControls(deps);
      case 'testimonialsNeon': return renderTestimonialsNeonControls(deps);
      case 'featuresNeon': return renderFeaturesNeonControls(deps);
      case 'ctaNeon': return renderCtaNeonControls(deps);
      case 'portfolioNeon': return renderPortfolioNeonControls(deps);
      case 'pricingNeon': return renderPricingNeonControls(deps);
      case 'faqNeon': return renderFaqNeonControls(deps);
      case 'heroQuimera': return renderScopedControls('heroQuimera', renderHeroQuimeraControls);
      case 'featuresQuimera': return renderScopedControls('featuresQuimera', renderFeaturesQuimeraControls);
      case 'ctaQuimera': return renderScopedControls('ctaQuimera', renderCtaQuimeraControls);
      case 'pricingQuimera': return renderScopedControls('pricingQuimera', renderPricingQuimeraControls);
      case 'testimonialsQuimera': return renderScopedControls('testimonialsQuimera', renderTestimonialsQuimeraControls);
      case 'faqQuimera': return renderScopedControls('faqQuimera', renderFaqQuimeraControls);
      case 'metricsQuimera': return renderScopedControls('metricsQuimera', renderMetricsQuimeraControls);
      case 'platformShowcaseQuimera': return renderScopedControls('platformShowcaseQuimera', renderPlatformShowcaseQuimeraControls);
      case 'bentoShowcaseQuimera': return renderScopedControls('bentoShowcaseQuimera', renderFeaturesQuimeraControls);
      case 'agentDemonstrationQuimera': return renderScopedControls('agentDemonstrationQuimera', renderAiCapabilitiesQuimeraControls);
      case 'aiCapabilitiesQuimera': return renderScopedControls('aiCapabilitiesQuimera', renderAiCapabilitiesQuimeraControls);
      case 'agencyWhiteLabelQuimera': return renderScopedControls('agencyWhiteLabelQuimera', renderAgencyWhiteLabelQuimeraControls);
      case 'industrySolutionsQuimera': return renderScopedControls('industrySolutionsQuimera', renderIndustrySolutionsQuimeraControls);
      case 'finalCtaQuimera': return renderScopedControls('finalCtaQuimera', renderCtaQuimeraControls);
      case 'whatIsQuimera': return renderScopedControls('whatIsQuimera', renderGenericQuimeraControls);
      case 'templatesPreviewQuimera': return renderScopedControls('templatesPreviewQuimera', renderGenericQuimeraControls);
      case 'aiWebStudioQuimera': return renderScopedControls('aiWebStudioQuimera', renderGenericQuimeraControls);
      case 'contentManagerQuimera': return renderScopedControls('contentManagerQuimera', renderContentManagerQuimeraControls);
      case 'imageGeneratorQuimera': return renderScopedControls('imageGeneratorQuimera', renderImageGeneratorQuimeraControls);
      case 'chatbotWorkflowQuimera': return renderScopedControls('chatbotWorkflowQuimera', renderChatbotWorkflowQuimeraControls);
      case 'chatbotBuilderQuimera': return renderScopedControls('chatbotBuilderQuimera', renderChatbotBuilderQuimeraControls);
      case 'leadsManagerQuimera': return renderScopedControls('leadsManagerQuimera', renderLeadsManagerQuimeraControls);
      case 'appointmentsQuimera': return renderScopedControls('appointmentsQuimera', renderAppointmentsQuimeraControls);
      case 'bioPageQuimera': return renderScopedControls('bioPageQuimera', renderBioPageQuimeraControls);
      case 'emailMarketingQuimera': return renderScopedControls('emailMarketingQuimera', renderEmailMarketingQuimeraControls);
      default: return config.renderer();
    }
  };

  // ─── Reorder handler (shared) ─────────────────────────────────────────────
  const handleReorder = (newOrder: PageSection[]) => {
    const sanitizedOrder = newOrder.filter(section => !isRetiredDesignSuiteSection(section));
    const nextPages = usesPageSections && activePage
      ? pages.map(page => page.id === activePage.id ? { ...page, sections: sanitizedOrder } : page)
      : pages;
    if (usesPageSections && activePage) {
      updatePage(activePage.id, { sections: sanitizedOrder });
    } else {
      setComponentOrder(sanitizedOrder);
      setEditorComponentOrder(sanitizedOrder);
    }
    syncWebsiteBlueprint({
      action: 'component_reorder',
      componentOrder: usesPageSections ? componentOrder : sanitizedOrder,
      pages: nextPages,
    });
    
    pushProjectUndoAction(`Reordenó las secciones`, {
        data,
        theme,
        componentOrder: usesPageSections ? componentOrder : sanitizedOrder,
        sectionVisibility,
        pages: nextPages
    });
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
      <div className={`bg-q-surface/50 w-64 lg:w-72 flex-shrink-0 flex flex-col overflow-hidden
        fixed inset-y-0 left-0 z-40 transform duration-300 ease-in-out
        md:relative md:inset-auto md:z-auto md:transform-none md:h-full hidden md:flex`}>
        {pages.length > 0 && (
          <div className="p-3 border-b border-q-border">
            <PageSelector
              pages={pages}
              activePage={activePage}
              onSelectPage={handleSelectPage}
              onAddPage={handleAddPage}
              onDuplicatePage={handleDuplicatePage}
              onDeletePage={handleDeletePage}
              onPageSettings={handlePageSettings}
              compact
            />
          </div>
        )}
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
          {pages.length > 0 && (
            <div className="mb-3">
              <PageSelector
                pages={pages}
                activePage={activePage}
                onSelectPage={handleSelectPage}
                onAddPage={handleAddPage}
                onDuplicatePage={handleDuplicatePage}
                onDeletePage={handleDeletePage}
                onPageSettings={handlePageSettings}
                compact
              />
            </div>
          )}
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
          className={`fixed top-1/2 -translate-y-1/2 z-30 p-2 bg-q-surface border border-q-border shadow-lg hover:bg-q-surface-elevated transition-all duration-300 overflow-hidden rounded-lg ${
            isControlsPanelOpen ? 'right-[calc(20rem-18px)] lg:right-[calc(24rem-18px)]' : 'right-0 rounded-l-lg rounded-r-none'
          }`}
          title={isControlsPanelOpen ? 'Ocultar controles' : 'Mostrar controles'}>
          {isControlsPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>
      )}

      {/* Right Panel: Properties - Desktop */}
      {activeSection && isDesktop && (
        <div data-editor-controls-surface="web" className={`${isControlsPanelOpen ? 'w-80 lg:w-96' : 'w-0 overflow-hidden'} border-l border-q-border bg-q-surface/50 flex flex-col overflow-hidden flex-shrink-0 order-last hidden md:flex transition-all duration-300`}>
          <div className="p-4 border-b border-q-border flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Settings size={16} className="text-q-accent" />
              {t('landingEditor.editSection', 'Editar')}: <span className="capitalize">{getSectionLabel(activeSection)}</span>
            </h2>
            <button onClick={() => { onSectionSelect(null as any); setIsSidebarOpen(false); }}
              className="p-1.5 rounded-md text-q-text-muted hover:text-q-text hover:bg-q-surface-overlay transition-colors"
              title={t('controls.closePropertiesPanel')}>
              <X size={18} />
            </button>
          </div>
          <div data-editor-controls-scroll className="quimera-clean-controls flex-1 min-h-0 overflow-y-auto p-4">{renderActiveSectionControls()}</div>
        </div>
      )}

      {/* Mobile Bottom Sheet: Controls */}
      <MobileBottomSheet isOpen={!!activeSection && isMobile}
        onClose={() => { onSectionSelect(null as any); setIsSidebarOpen(true); }}
        title={activeSection ? getSectionLabel(activeSection) : ''}
        subtitle={t('landingEditor.editSection', 'Editar sección')}>
        <div data-editor-controls-surface="web-mobile" className="quimera-clean-controls p-4">{renderActiveSectionControls()}</div>
      </MobileBottomSheet>

      {/* Tablet Slide Panel: Sections */}
      <TabletSlidePanel isOpen={isTablet && isSidebarOpen && !activeSection}
        onClose={() => setIsSidebarOpen(false)} title={t('controls.sections', 'Secciones')} position="left">
        <div className="min-h-[60vh]">
          {pages.length > 0 && (
            <div className="mb-3">
              <PageSelector
                pages={pages}
                activePage={activePage}
                onSelectPage={handleSelectPage}
                onAddPage={handleAddPage}
                onDuplicatePage={handleDuplicatePage}
                onDeletePage={handleDeletePage}
                onPageSettings={handlePageSettings}
                compact
              />
            </div>
          )}
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
        <div data-editor-controls-surface="web-tablet" className="quimera-clean-controls p-4">{renderActiveSectionControls()}</div>
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
