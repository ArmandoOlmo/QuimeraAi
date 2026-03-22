
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../contexts/EditorContext';
import { useUI } from '../contexts/core/UIContext';
import { useProject } from '../contexts/project';
import { useFiles } from '../contexts/files';
import { useCMS } from '../contexts/cms';
import { useAdmin } from '../contexts/admin';
import { useRouter } from '../hooks/useRouter';
import { ROUTES } from '../routes/config';
import { PageSection, PricingTier, ServiceIcon, SitePage, SocialPlatform } from '../types';
import PageSelector from './dashboard/PageSelector';
import PageSettings from './dashboard/PageSettings';
import { PageTemplateId, PAGE_TEMPLATES } from '../types/onboarding';
import ColorControl from './ui/ColorControl';
import GlobalStylesControl from './ui/GlobalStylesControl';
import ImagePicker from './ui/ImagePicker';
import IconSelector from './ui/IconSelector';
import MobileBottomSheet from './ui/MobileBottomSheet';
import TabletSlidePanel from './ui/TabletSlidePanel';
import { useClickOutside } from '../hooks/useClickOutside';
import { useViewportType } from '../hooks/use-mobile';
import {
  Trash2, Plus, ChevronDown, ChevronRight, ChevronLeft, ChevronUp, ArrowLeft, HelpCircle,
  Layout, Image, List, Star, PlaySquare, Users, DollarSign,
  Briefcase, MessageCircle, Mail, Send, Type, MousePointerClick,
  Settings, AlignJustify, MonitorPlay, Grid, GripVertical, Upload, Menu as MenuIcon, MessageSquare, FileText, PlusCircle, X, Palette, AlertCircle, TrendingUp, Sparkles, MapPin, Map as MapIcon, Columns, Search, Loader2, ShoppingBag, Info, Store, SlidersHorizontal, LayoutGrid, Check, Link, FolderOpen, Maximize2, Clock, PanelRightClose, PanelRightOpen, Zap,
  Twitter, Facebook, Instagram, Linkedin, Github, Youtube, Music, Pin, Ghost, Gamepad2, AtSign, Share2
} from 'lucide-react';
import { usePublicProducts } from '../hooks/usePublicProducts';
import AIFormControl from './ui/AIFormControl';
import AIContentAssistant from './ui/AIContentAssistant';
import ComponentTree from './ui/ComponentTree';
import TabbedControls from './ui/TabbedControls';
import SocialLinksEditor from './ui/SocialLinksEditor';
import AnimationControls from './ui/AnimationControls';
import {
  useFeaturedProductsControls,
  useCategoryGridControls,
  useProductHeroControls,
  useTrustBadgesControls,
  useSaleCountdownControls,
  useAnnouncementBarControls,
  useCollectionBannerControls,
  useRecentlyViewedControls,
  useProductReviewsControls,
  useProductBundleControls,
  useStoreSettingsControls,
  SingleProductSelector,
  SingleCollectionSelector,
  SingleContentSelector
} from './ui/EcommerceControls';

// --- Helper Components (extracted to shared file) ---
import { Input, TextArea, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector } from './ui/EditorControlPrimitives';



// Corner Gradient Control - Diagonal gradient overlay from corners
interface CornerGradientControlProps {
  enabled: boolean;
  position: 'none' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  color: string;
  opacity: number;
  size: number;
  onEnabledChange: (enabled: boolean) => void;
  onPositionChange: (position: 'none' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void;
  onColorChange: (color: string) => void;
  onOpacityChange: (opacity: number) => void;
  onSizeChange: (size: number) => void;
}

const CornerGradientControl: React.FC<CornerGradientControlProps> = ({
  enabled,
  position,
  color,
  opacity,
  size,
  onEnabledChange,
  onPositionChange,
  onColorChange,
  onOpacityChange,
  onSizeChange,
}) => {
  const { t } = useTranslation();
  const cornerPositions = [
    { value: 'top-left', label: '↖', title: t('editor.controls.startPosition') + ' TL' }, // Approximating title as it was hardcoded English "Top Left"
    { value: 'top-right', label: '↗', title: t('editor.controls.startPosition') + ' TR' },
    { value: 'bottom-left', label: '↙', title: t('editor.controls.startPosition') + ' BL' },
    { value: 'bottom-right', label: '↘', title: t('editor.controls.startPosition') + ' BR' },
  ] as const;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
          <Palette size={14} />
          {t('editor.controls.cornerGradient')}
        </label>
        <ToggleControl
          checked={enabled}
          onChange={onEnabledChange}
        />
      </div>

      {enabled && (
        <div className="space-y-3 animate-fade-in-up bg-editor-bg/50 p-3 rounded-lg">
          {/* Corner Position Selector */}
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider">
              {t('editor.controls.startPosition')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {cornerPositions.map((pos) => (
                <button
                  key={pos.value}
                  onClick={() => onPositionChange(pos.value)}
                  className={`py-2 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${position === pos.value
                    ? 'bg-editor-accent text-editor-bg'
                    : 'bg-editor-panel-bg text-editor-text-secondary hover:bg-editor-border border border-editor-border'
                    }`}
                  title={pos.title}
                >
                  <span className="text-lg">{pos.label}</span>
                  <span className="text-xs">{pos.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <ColorControl
            label={t('editor.controls.gradientColor')}
            value={color}
            onChange={onColorChange}
          />

          {/* Opacity Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.opacity')}
              </label>
              <span className="text-xs text-editor-text-primary">{opacity}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={opacity}
              onChange={(e) => onOpacityChange(parseInt(e.target.value))}
              className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
          </div>

          {/* Size Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.size')}
              </label>
              <span className="text-xs text-editor-text-primary">{size}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={size}
              onChange={(e) => onSizeChange(parseInt(e.target.value))}
              className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
            <p className="text-xs text-editor-text-secondary mt-1 italic">
              {t('editor.controls.size')}
            </p>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider">
              {t('editor.controls.preview')}
            </label>
            <div
              className="w-full h-20 rounded-md border border-editor-border relative overflow-hidden"
              style={{ backgroundColor: '#1e293b' }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: (() => {
                    const gradientDirections: Record<string, string> = {
                      'top-left': 'to bottom right',
                      'top-right': 'to bottom left',
                      'bottom-left': 'to top right',
                      'bottom-right': 'to top left',
                    };
                    const direction = gradientDirections[position] || 'to bottom right';
                    const hexToRgba = (hex: string, alpha: number) => {
                      const r = parseInt(hex.slice(1, 3), 16);
                      const g = parseInt(hex.slice(3, 5), 16);
                      const b = parseInt(hex.slice(5, 7), 16);
                      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                    };
                    return `linear-gradient(${direction}, ${hexToRgba(color, opacity / 100)} 0%, transparent ${size}%)`;
                  })()
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface AccordionItemProps {
  title: string;
  icon?: React.ElementType;
  isOpen: boolean;
  onDoubleClick: () => void;
  isVisible: boolean;
  onToggleVisibility: (val: boolean) => void;
  children: React.ReactNode;
  dragHandlers?: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  onRemove?: () => void;
  canRemove?: boolean;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  icon: Icon,
  isOpen,
  onDoubleClick,
  isVisible,
  onToggleVisibility,
  children,
  dragHandlers,
  onRemove,
  canRemove = false
}) => {
  return (
    <div
      className={`border-b border-editor-border bg-editor-bg transition-colors ${isOpen ? 'bg-editor-bg' : ''}`}
      style={dragHandlers?.style}
      onDragOver={dragHandlers?.draggable ? dragHandlers.onDragOver : undefined}
      onDrop={dragHandlers?.draggable ? dragHandlers.onDrop : undefined}
    >
      <div
        className={`flex items-center justify-between p-4 hover:bg-editor-panel-bg/50 transition-colors select-none ${isOpen ? 'bg-editor-panel-bg/50' : ''}`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {dragHandlers?.draggable && (
            <div
              className="text-editor-text-secondary hover:text-editor-text-primary -ml-1 cursor-grab active:cursor-grabbing flex-shrink-0"
              draggable={true}
              onDragStart={dragHandlers.onDragStart}
              onDragEnd={dragHandlers.onDragEnd}
            >
              <GripVertical size={16} />
            </div>
          )}
          <div
            className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDoubleClick();
            }}
          >
            {Icon && <Icon size={18} className={`text-editor-text-secondary ${isOpen ? 'text-editor-accent' : ''} flex-shrink-0 transition-colors duration-200`} />}
            <span className={`font-semibold text-sm ${isOpen ? 'text-editor-accent' : 'text-editor-text-primary'} truncate transition-colors duration-200`}>{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canRemove && onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 text-editor-text-secondary hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          <ToggleControl checked={isVisible} onChange={onToggleVisibility} />
          <button
            className="cursor-pointer p-1 hover:bg-editor-panel-bg rounded transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDoubleClick();
            }}
            type="button"
          >
            <span className={`block transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
              <ChevronDown size={16} className="text-editor-text-secondary" />
            </span>
          </button>
        </div>
      </div>
      <div
        className={`
                    overflow-hidden transition-all duration-300 ease-in-out
                    ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}
                `}
      >
        <div className="p-4 bg-editor-panel-bg border-t border-editor-border cursor-default">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Helper: Extract video ID from YouTube/Vimeo URLs ---
const extractVideoId = (input: string, source: string): string => {
  if (!input) return '';
  const trimmed = input.trim();

  if (source === 'youtube') {
    // Match various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?.*v=)([\w-]{11})/,           // youtube.com/watch?v=ID
      /(?:youtu\.be\/)([\w-]{11})/,                          // youtu.be/ID
      /(?:youtube\.com\/embed\/)([\w-]{11})/,                // youtube.com/embed/ID
      /(?:youtube\.com\/shorts\/)([\w-]{11})/,               // youtube.com/shorts/ID
      /(?:youtube\.com\/live\/)([\w-]{11})/,                 // youtube.com/live/ID
      /(?:youtube\.com\/v\/)([\w-]{11})/,                    // youtube.com/v/ID
    ];
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) return match[1];
    }
    // If it looks like a bare 11-char ID, return as-is
    if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
    // Return whatever user typed (might be wrong, but don't lose their input)
    return trimmed;
  }

  if (source === 'vimeo') {
    // Match Vimeo URL: vimeo.com/123456789
    const match = trimmed.match(/(?:vimeo\.com\/)([\d]+)/);
    if (match) return match[1];
    // Bare numeric ID
    if (/^\d+$/.test(trimmed)) return trimmed;
    return trimmed;
  }

  return trimmed;
};

// --- Main Component ---

const Controls: React.FC = () => {
  const { t } = useTranslation();
  const viewportType = useViewportType();
  const isMobile = viewportType === 'mobile';
  const isTablet = viewportType === 'tablet';
  const isDesktop = viewportType === 'desktop';
  const { activeSection, onSectionSelect, activeSectionItem, isSidebarOpen, setIsSidebarOpen } = useUI();
  const {
    data, setData,
    componentOrder, setComponentOrder, activeProject, updateProjectFavicon,
    saveProject,
    // Page management
    pages, activePage, setActivePage, addPage, updatePage, deletePage, duplicatePage,
    sectionVisibility: projectSectionVisibility,
    setSectionVisibility: setProjectSectionVisibility,
  } = useProject();

  // EditorContext for dual-sync
  const editorContext = useEditor();
  const setEditorSectionVisibility = editorContext.setSectionVisibility;
  const setEditorComponentOrder = editorContext.setComponentOrder;

  // LandingPage may read from either ProjectContext or EditorContext depending on isEditorMode.
  // To guarantee the preview always reflects changes, we update BOTH contexts.
  const sectionVisibility = projectSectionVisibility;
  const setSectionVisibility = (updater: React.SetStateAction<Record<PageSection, boolean>>) => {
    setProjectSectionVisibility(updater);
    setEditorSectionVisibility(updater);
  };

  const { uploadImageAndGetURL } = useFiles();
  const { menus } = useCMS();

  // Page settings modal state
  const [showPageSettings, setShowPageSettings] = useState<string | null>(null);
  const { componentStatus, componentStyles } = useAdmin();
  const { navigate } = useRouter();

  const [aiAssistField, setAiAssistField] = useState<{ path: string, value: string, context: string } | null>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const addComponentRef = useRef<HTMLDivElement>(null);
  const [isTreeHiddenMobile, setIsTreeHiddenMobile] = useState(false);
  const [isControlsPanelOpen, setIsControlsPanelOpen] = useState(true);

  // State for save button feedback
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // State for map geocoding
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // State for Hero CTA link pickers
  const [heroPrimaryLinkType, setHeroPrimaryLinkType] = useState<'manual' | 'product' | 'collection' | 'section'>('section');
  const [heroSecondaryLinkType, setHeroSecondaryLinkType] = useState<'manual' | 'product' | 'collection' | 'section'>('section');
  const [showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker] = useState(false);
  const [showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker] = useState(false);
  const [showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker] = useState(false);
  const [showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker] = useState(false);
  const [heroProductSearch, setHeroProductSearch] = useState('');
  const [showHeroImagePicker, setShowHeroImagePicker] = useState(false);

  // Load products for Hero CTA pickers
  const { products: heroProducts, categories: heroCategories, isLoading: isLoadingHeroProducts } = usePublicProducts(activeProject?.id || null, { limitCount: 100 });

  // When the assistant selects a specific item (feature #2, tier #1, etc),
  // scroll the Properties panel to that card.
  useEffect(() => {
    if (!activeSectionItem) return;
    if (!activeSection) return;
    if (activeSectionItem.section !== activeSection) return;

    const selector = `[data-section-item="${activeSection}:${activeSectionItem.index}"]`;
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector(selector);
      if (el && 'scrollIntoView' in el) {
        try {
          (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch { }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [activeSectionItem, activeSection]);

  // Auto-hide tree on mobile when a section is selected, show when closed
  React.useEffect(() => {
    if (activeSection) {
      setIsTreeHiddenMobile(true);
    } else {
      setIsTreeHiddenMobile(false);
    }
  }, [activeSection]);

  // Close add component dropdown when clicking outside
  useClickOutside(addComponentRef, () => setIsAddComponentOpen(false));

  // Page management handlers
  const handleSelectPage = (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (page) {
      setActivePage(page);
      // Clear active section when switching pages
      onSectionSelect(null as any);
    }
  };

  const handleAddPage = (templateId: PageTemplateId) => {
    const template = PAGE_TEMPLATES[templateId];
    if (template) {
      const now = new Date().toISOString();
      const newPage: SitePage = {
        id: `page-${Date.now()}`,
        title: template.title,
        slug: `/${templateId === 'home' ? '' : templateId}`,
        type: template.type || 'static',
        sections: template.sections as PageSection[],
        sectionData: {},
        seo: {
          title: template.title,
          description: '',
        },
        isHomePage: templateId === 'home',
        showInNavigation: true,
        navigationOrder: pages.length + 1,
        createdAt: now,
        updatedAt: now,
      };
      // Solo añadir dynamicSource si está definido (evita undefined en Firebase)
      if (template.dynamicSource) {
        newPage.dynamicSource = template.dynamicSource;
      }
      addPage(newPage);
      setActivePage(newPage);
    }
  };

  const handleDuplicatePage = (pageId: string) => {
    duplicatePage(pageId);
  };

  const handleDeletePage = (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (page && !page.isHomePage) {
      deletePage(pageId);
      // If we deleted the active page, switch to home
      if (activePage?.id === pageId) {
        const homePage = pages.find(p => p.isHomePage);
        if (homePage) setActivePage(homePage);
      }
    }
  };

  const handlePageSettings = (pageId: string) => {
    setShowPageSettings(pageId);
  };

  const handleSavePageSettings = (pageId: string, updates: Partial<SitePage>) => {
    updatePage(pageId, updates);
    setShowPageSettings(null);
  };

  const isSlugUnique = (slug: string, currentPageId: string): boolean => {
    return !pages.some(p => p.id !== currentPageId && p.slug === slug);
  };

  // Use active page's sections if available, otherwise fall back to componentOrder
  // Deduplicate: keep only the first occurrence of each section to prevent
  // duplicated components in the preview and component tree
  const effectiveComponentOrder = useMemo(() => {
    const raw = activePage?.sections?.length ? activePage.sections : componentOrder;
    const seen = new Set<PageSection>();
    return raw.filter(s => {
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
  }, [activePage, componentOrder]);

  // Update section visibility based on active page
  const effectiveSectionVisibility = useMemo(() => {
    if (activePage?.sections?.length) {
      const visibility: Record<string, boolean> = {};
      activePage.sections.forEach(s => {
        visibility[s] = sectionVisibility[s] ?? true;
      });
      return visibility;
    }
    return sectionVisibility;
  }, [activePage, sectionVisibility]);

  // Helper to update nested data safely with functional updates
  // Uses a ref to track the last updated section for page sync
  const lastUpdatedSectionRef = useRef<string | null>(null);

  const setNestedData = (path: string, value: any) => {
    const sectionKey = path.split('.')[0]; // e.g., 'hero' from 'hero.headline'
    lastUpdatedSectionRef.current = sectionKey;

    setData(prevData => {
      if (!prevData) return null;
      // Create a deep copy to avoid mutation and ensure React detects changes
      const newData = JSON.parse(JSON.stringify(prevData));

      const keys = path.split('.');
      let current: any = newData;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const nextKey = keys[i + 1];

        // If current[key] doesn't exist, create it as an array or object based on nextKey
        if (!current[key]) {
          // If nextKey is a number, create an array; otherwise create an object
          current[key] = /^\d+$/.test(nextKey) ? [] : {};
        }

        // CRITICAL FIX: Prevent traversing primitive values to avoid "Cannot create property..." error
        if (typeof current[key] !== 'object') {
          console.warn(`Controls: Cannot traverse path '${path}' at '${key}': value is primitive.`);
          return prevData; // Return previous state to abort invalid update
        }

        current = current[key];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  // Multi-page sync: Sync project data changes to active page's sectionData
  // This effect runs after data changes and updates the active page
  useEffect(() => {
    if (!activePage || !updatePage || !data || !lastUpdatedSectionRef.current) return;

    const sectionKey = lastUpdatedSectionRef.current;
    // Only sync if this section is part of the active page
    if (activePage.sections.includes(sectionKey as any)) {
      const sectionData = data[sectionKey as keyof typeof data];
      if (sectionData) {
        // Debounced update to avoid too many writes
        const timeoutId = setTimeout(() => {
          updatePage(activePage.id, {
            sectionData: {
              ...activePage.sectionData,
              [sectionKey]: JSON.parse(JSON.stringify(sectionData)), // Deep copy
            },
          });
          lastUpdatedSectionRef.current = null;
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
      }
    }
    lastUpdatedSectionRef.current = null;
  }, [data, activePage, updatePage]);

  // Call all ecommerce control hooks unconditionally to comply with Rules of Hooks
  // These must be called after setNestedData is defined since they use it
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

  const handleAiApply = (text: string) => {
    if (aiAssistField) {
      setNestedData(aiAssistField.path, text);
      setAiAssistField(null);
    }
  };

  const toggleVisibility = (section: PageSection | 'header') => {
    if (section === 'header') return; // Header usually always visible or handled differently
    setSectionVisibility(prev => ({
      ...prev,
      [section]: !prev[section as PageSection]
    }));
  };

  const toggleSection = (section: PageSection | 'header') => {
    if (activeSection === section) {
      (onSectionSelect as any)(null); // Close if active
    } else {
      onSectionSelect(section as any);
    }
  };

  // Helper to get merged ecommerce data (componentStyles + user data)
  const getMergedEcommerceData = (componentKey: string) => {
    const styles = componentStyles[componentKey as keyof typeof componentStyles];
    const userData = data[componentKey as keyof typeof data];
    if (!styles && !userData) return undefined;
    if (!userData) return styles;
    if (!styles) return userData;
    // Merge styles with user data, user data takes priority
    return {
      ...styles,
      ...userData,
      colors: {
        ...(styles as any)?.colors,
        ...(userData as any)?.colors,
      },
    };
  };

  // Create merged data object for ecommerce controls
  const mergedEcommerceData = {
    ...data,
    featuredProducts: getMergedEcommerceData('featuredProducts'),
    categoryGrid: getMergedEcommerceData('categoryGrid'),
    productHero: getMergedEcommerceData('productHero'),
    trustBadges: getMergedEcommerceData('trustBadges'),
    saleCountdown: getMergedEcommerceData('saleCountdown'),
    announcementBar: getMergedEcommerceData('announcementBar'),
    collectionBanner: getMergedEcommerceData('collectionBanner'),
    recentlyViewed: getMergedEcommerceData('recentlyViewed'),
    productReviews: getMergedEcommerceData('productReviews'),
    productBundle: getMergedEcommerceData('productBundle'),
  };


  // --- Background Image Control (reusable for all sections) ---
  const BackgroundImageControl = ({ sectionKey }: { sectionKey: string }) => {
    const sectionData = (data as any)?.[sectionKey];
    const hasImage = !!sectionData?.backgroundImageUrl;
    const [showPicker, setShowPicker] = useState(false);

    return (
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Image size={14} />
          {t('editor.controls.common.backgroundImage', 'Background Image')}
        </label>

        {/* Prominent Image Preview with overlaid controls */}
        <div className="relative rounded-lg overflow-hidden border border-editor-border group">
          {hasImage ? (
            <>
              <div className="aspect-video">
                <img src={sectionData.backgroundImageUrl} alt="Background" className="w-full h-full object-cover" />
              </div>
              {/* Bottom gradient for contrast behind controls */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
              {/* Overlaid action buttons at bottom-right */}
              <div className="absolute bottom-2.5 right-2.5 flex gap-1.5">
                <button
                  onClick={() => setShowPicker(true)}
                  className="p-2 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 transition-all duration-200"
                  title={t('dashboard.imagePicker.openLibrary')}
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setShowPicker(true)}
                  className="p-2 rounded-lg bg-editor-accent/80 backdrop-blur-md border border-editor-accent/40 text-white hover:bg-editor-accent transition-all duration-200"
                  title={t('dashboard.imagePicker.generateWithAI')}
                >
                  <Zap size={14} />
                </button>
                <button
                  onClick={() => setNestedData(`${sectionKey}.backgroundImageUrl`, '')}
                  className="p-2 rounded-lg bg-red-500/60 backdrop-blur-md border border-red-500/30 text-white hover:bg-red-500/80 transition-all duration-200"
                  title={t('common.remove')}
                >
                  <X size={14} />
                </button>
              </div>
            </>
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center bg-editor-bg text-editor-text-secondary gap-2">
              <Image size={32} className="opacity-30" />
              <span className="text-[10px] uppercase tracking-wider opacity-50">Sin imagen</span>
            </div>
          )}
        </div>

        {/* ImagePicker rendered with defaultOpen when triggered */}
        {showPicker && (
          <ImagePicker
            label=""
            value={sectionData?.backgroundImageUrl || ''}
            onChange={(url) => setNestedData(`${sectionKey}.backgroundImageUrl`, url)}
            generationContext="background"
            defaultOpen
            onClose={() => setShowPicker(false)}
          />
        )}

        {/* Action buttons when no image */}
        {!hasImage && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowPicker(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-editor-bg border border-editor-border text-editor-text-secondary hover:text-editor-text-primary hover:border-editor-accent/30 transition-all text-xs font-medium"
            >
              <Grid size={12} /> Librería
            </button>
            <button
              onClick={() => setShowPicker(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-editor-accent/10 border border-editor-accent/20 text-editor-accent hover:bg-editor-accent/20 transition-all text-xs font-medium"
            >
              <Zap size={12} /> Generar IA
            </button>
          </div>
        )}

        {/* Overlay Controls - only shown when background image is set */}
        {hasImage && (
          <div className="mt-4 pt-4 border-t border-editor-border/50 space-y-3 animate-fade-in-up">
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Overlay</h5>
            <ToggleControl
              label={t('editor.controls.common.enableOverlay')}
              checked={sectionData?.backgroundOverlayEnabled !== false}
              onChange={(v) => setNestedData(`${sectionKey}.backgroundOverlayEnabled`, v)}
            />

            {sectionData?.backgroundOverlayEnabled !== false && (
              <div className="space-y-3 animate-fade-in-up">
                <ColorControl
                  label={t('editor.controls.common.overlayColor')}
                  value={sectionData?.backgroundOverlayColor || sectionData?.colors?.background || '#000000'}
                  onChange={(v) => setNestedData(`${sectionKey}.backgroundOverlayColor`, v)}
                />
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-medium text-editor-text-secondary">Overlay Opacity</label>
                    <span className="text-[10px] text-editor-accent font-mono bg-editor-accent/10 px-2 py-0.5 rounded-full">{sectionData?.backgroundOverlayOpacity ?? 60}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="5"
                    value={sectionData?.backgroundOverlayOpacity ?? 60}
                    onChange={(e) => setNestedData(`${sectionKey}.backgroundOverlayOpacity`, parseInt(e.target.value))}
                    className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-editor-text-secondary/50">Claro</span>
                    <span className="text-[9px] text-editor-text-secondary/50">Oscuro</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- Section Renderers ---

  const renderHeaderControls = () => {
    if (!data?.header) return null;

    const activeMenuId = data.header.menuId || '';

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.header.layout')}</label>
            <select
              value={data.header.layout}
              onChange={(e) => setNestedData('header.layout', e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-2 py-2 text-sm text-editor-text-primary"
            >
              <option value="minimal">{t('editor.controls.header.minimal')}</option>
              <option value="classic">Classic</option>
              <option value="center">Center</option>
              <option value="stack">Stack</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.header.style')}</label>
            <select
              value={data.header.style}
              onChange={(e) => setNestedData('header.style', e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-2 py-2 text-sm text-editor-text-primary"
            >
              <optgroup label={`── ${t('editor.controls.header.classic')} ──`}>
                <option value="sticky-solid">Solid</option>
                <option value="sticky-transparent">Transparent</option>
                <option value="floating">Floating</option>
              </optgroup>
              <optgroup label="── Edge-to-Edge ──">
                <option value="edge-solid">Edge Solid</option>
                <option value="edge-minimal">Edge Minimal</option>
                <option value="edge-bordered">Edge Bordered</option>
              </optgroup>
              <optgroup label="── Floating ──">
                <option value="floating-pill">Floating Pill</option>
                <option value="floating-glass">{t('editor.controls.header.glass')}</option>
                <option value="floating-shadow">Floating Shadow</option>
              </optgroup>
              <optgroup label="── Transparent ──">
                <option value="transparent-blur">Transparent Blur</option>
                <option value="transparent-bordered">Transparent Bordered</option>
                <option value="transparent-gradient">Transparent Gradient</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Logo Type</label>
          <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border mb-3">
            {['text', 'image', 'both'].map(type => (
              <button
                key={type}
                onClick={() => setNestedData('header.logoType', type)}
                className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors capitalize ${data.header.logoType === type ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary'}`}
              >
                {type}
              </button>
            ))}
          </div>

          {(data.header.logoType === 'text' || data.header.logoType === 'both') && (
            <Input label={t('editor.controls.header.logoText')} value={data.header.logoText} onChange={(e) => setNestedData('header.logoText', e.target.value)} />
          )}

          {(data.header.logoType === 'image' || data.header.logoType === 'both') && (
            <div className="space-y-3 mt-3">
              <ImagePicker
                label={t('editor.controls.header.logoImage')}
                value={data.header.logoImageUrl}
                onChange={(url) => {
                  setNestedData('header.logoImageUrl', url);
                  // If uploading/selecting, ensure image mode is active if previously text only
                  if (data.header.logoType === 'text') {
                    setNestedData('header.logoType', 'image');
                  }
                }}
              />
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.header.logoWidth')}</label>
                  <span className="text-xs text-editor-text-primary">{data.header.logoWidth}px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="300"
                  step="5"
                  value={data.header.logoWidth}
                  onChange={(e) => setNestedData('header.logoWidth', parseInt(e.target.value))}
                  className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Favicon Upload Section */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.header.favicon')}</label>
          <p className="text-xs text-editor-text-secondary">{t('editor.controls.header.uploadFavicon')}</p>

          <div className="flex items-center gap-4">
            {activeProject?.faviconUrl ? (
              <div className="relative">
                <img
                  src={activeProject.faviconUrl}
                  alt="Favicon"
                  className="w-12 h-12 rounded-lg border border-editor-border object-contain bg-editor-bg p-1"
                />
                <button
                  onClick={() => {
                    // TODO: Implement removeFavicon functionality
                    // When implemented, use ConfirmationModal instead of window.confirm
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                  title="Remove favicon"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg border-2 border-dashed border-editor-border flex items-center justify-center bg-editor-bg">
                <Upload size={16} className="text-editor-text-secondary" />
              </div>
            )}

            <input
              ref={faviconInputRef}
              type="file"
              accept=".ico,.png,.svg,image/png,image/svg+xml,image/x-icon"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file && activeProject) {
                  setIsUploadingFavicon(true);
                  try {
                    await updateProjectFavicon(activeProject.id, file);
                  } catch (error) {
                    console.error('Failed to upload favicon:', error);
                  } finally {
                    setIsUploadingFavicon(false);
                  }
                }
                e.target.value = '';
              }}
            />

            <button
              onClick={() => faviconInputRef.current?.click()}
              disabled={isUploadingFavicon}
              className="flex items-center gap-2 px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-sm text-editor-text-primary hover:bg-editor-panel-bg transition-colors disabled:opacity-50"
            >
              {isUploadingFavicon ? (
                <>
                  <span className="w-4 h-4 border-2 border-editor-accent border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  {activeProject?.faviconUrl ? t('editor.controls.header.change') : t('editor.controls.header.upload')}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        <div className="grid grid-cols-2 gap-4">
          <ToggleControl label={t('editor.controls.header.sticky')} checked={data.header.isSticky} onChange={(v) => setNestedData('header.isSticky', v)} />
          <ToggleControl label={t('editor.controls.header.glass')} checked={data.header.glassEffect} onChange={(v) => setNestedData('header.glassEffect', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        <div className="space-y-3">
          <ToggleControl label={t('editor.controls.navigation.showLogin')} checked={data.header.showLogin !== false} onChange={(v) => setNestedData('header.showLogin', v)} />

          {data.header.showLogin !== false && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
              <Input label={t('editor.controls.common.text')} value={data.header.loginText || 'Login'} onChange={(e) => setNestedData('header.loginText', e.target.value)} className="mb-0" />
              <Input label={t('editor.controls.common.url')} value={data.header.loginUrl || '#'} onChange={(e) => setNestedData('header.loginUrl', e.target.value)} className="mb-0" />
            </div>
          )}
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Search Controls */}
        <div className="space-y-3">
          <ToggleControl label={t('editor.controls.navigation.showSearch')} checked={data.header.showSearch === true} onChange={(v) => setNestedData('header.showSearch', v)} />

          {data.header.showSearch === true && (
            <div className="animate-fade-in-up">
              <Input label={t('editor.controls.navigation.placeholder')} value={data.header.searchPlaceholder || `${t('editor.controls.common.search')}...`} onChange={(e) => setNestedData('header.searchPlaceholder', e.target.value)} className="mb-0" />
            </div>
          )}
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Navigation Menu Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.source')}</label>
          <div className="flex gap-2 mb-3">
            <select
              value={activeMenuId}
              onChange={(e) => {
                const val = e.target.value;
                setNestedData('header.menuId', val === '' ? undefined : val);
              }}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-2 py-2 text-sm text-editor-text-primary focus:ring-1 focus:ring-editor-accent focus:outline-none"
            >
              <option value="">{t('editor.controls.navigation.manual')}</option>
              {menus.map(menu => (
                <option key={menu.id} value={menu.id}>{menu.title}</option>
              ))}
            </select>
            <button
              onClick={() => navigate(ROUTES.NAVIGATION)}
              className="p-2 bg-editor-bg border border-editor-border rounded text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg"
              title="Manage Menus"
            >
              <Settings size={16} />
            </button>
          </div>

          {activeMenuId ? (
            <div className="p-3 bg-editor-accent/10 border border-editor-accent/20 rounded text-xs text-editor-text-primary mb-2">
              Links are currently being pulled from the <strong>{menus.find(m => m.id === activeMenuId)?.title || 'selected'}</strong> menu.
            </div>
          ) : (
            <>
              <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.navigation.customLinks')}</label>
              {(data.header.links || []).map((link, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input className="flex-1 bg-editor-bg border border-editor-border rounded px-2 py-1 text-sm text-editor-text-primary" value={link.text} onChange={(e) => setNestedData(`header.links.${i}.text`, e.target.value)} />
                  <input className="flex-1 bg-editor-bg border border-editor-border rounded px-2 py-1 text-sm text-editor-text-primary" value={link.href} onChange={(e) => setNestedData(`header.links.${i}.href`, e.target.value)} />
                  <button
                    onClick={() => {
                      const newLinks = data.header.links.filter((_, idx) => idx !== i);
                      setNestedData('header.links', newLinks);
                    }}
                    className="text-editor-text-secondary hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setNestedData('header.links', [...(data.header.links || []), { text: 'New Link', href: '#' }])}
                className="text-xs text-editor-accent hover:underline flex items-center mt-1"
              >
                <Plus size={12} className="mr-1" /> {t('editor.controls.navigation.addLink')}
              </button>
            </>
          )}
        </div>

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Height & Hover</label>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.navigation.height')}</label>
            <span className="text-xs text-editor-text-primary">{data.header.height || 70}px</span>
          </div>
          <input
            type="range" min="50" max="120" step="5"
            value={data.header.height || 70}
            onChange={(e) => setNestedData('header.height', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.hoverStyle')}</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'simple', label: 'Simple' },
              { value: 'underline', label: 'Underline' },
              { value: 'bracket', label: 'Bracket' },
              { value: 'highlight', label: 'Highlight' },
              { value: 'glow', label: 'Glow' }
            ].map(style => (
              <button
                key={style.value}
                onClick={() => setNestedData('header.hoverStyle', style.value)}
                className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors ${data.header.hoverStyle === style.value ? 'bg-editor-accent text-editor-bg' : 'bg-editor-bg text-editor-text-secondary hover:bg-editor-border border border-editor-border'}`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.navigation.linkFontSize')}</label>
            <span className="text-xs text-editor-text-primary">{data.header.linkFontSize || 14}px</span>
          </div>
          <input
            type="range"
            min="10"
            max="24"
            step="1"
            value={data.header.linkFontSize || 14}
            onChange={(e) => setNestedData('header.linkFontSize', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.navigation.ctaButton')}</label>
        <ToggleControl label={t('editor.controls.navigation.showCta')} checked={data.header.showCta !== false} onChange={(v) => setNestedData('header.showCta', v)} />

        {data.header.showCta !== false && (
          <div className="space-y-3 animate-fade-in-up">
            <Input label={t('editor.controls.navigation.buttonText')} value={data.header.ctaText || 'Get Started'} onChange={(e) => setNestedData('header.ctaText', e.target.value)} />
            <div>
              <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.buttonRadius')}</label>
              <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
                {[{ v: 'none', l: 'None' }, { v: 'md', l: 'Med' }, { v: 'xl', l: 'Lg' }, { v: 'full', l: 'Full' }].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setNestedData('header.buttonBorderRadius', opt.v)}
                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${data.header.buttonBorderRadius === opt.v ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.common.colors')}</label>
        <ColorControl label={t('editor.controls.common.background')} value={data.header.colors?.background} onChange={(v) => setNestedData('header.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.text')} value={data.header.colors?.text} onChange={(v) => setNestedData('header.colors.text', v)} />
        <ColorControl label={t('editor.controls.common.accent')} value={data.header.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('header.colors.accent', v)} />
      </div>
    )
  }

  const renderHeroControls = () => {
    if (!data?.hero) return null;

    return (
      <div className="space-y-4">
        {/* ========== TEXT LAYOUT ========== */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Layout size={14} />
            Ubicación del Texto
          </label>
          {/* Visual 3x3 position grid */}
          <div className="relative bg-editor-bg rounded-lg border border-editor-border p-3">
            {/* Preview area with position indicator */}
            <div className="relative aspect-video bg-gradient-to-br from-editor-panel-bg to-editor-bg rounded-md border border-editor-border/50 overflow-hidden mb-2">
              {/* Decorative lines representing text */}
              {(() => {
                const tl = data.hero.textLayout || 'left-top';
                const isLeft = tl.startsWith('left');
                const isRight = tl.startsWith('right');
                const isTop = tl.endsWith('-top') || tl === 'center-top';
                const isBottom = tl.endsWith('-bottom') || tl === 'center-bottom';
                const hPos = isLeft ? 'left-3' : isRight ? 'right-3' : 'left-1/2 -translate-x-1/2';
                const vPos = isTop ? 'top-2.5' : isBottom ? 'bottom-2.5' : 'top-1/2 -translate-y-1/2';
                const textAlign = isLeft ? 'items-start' : isRight ? 'items-end' : 'items-center';
                return (
                  <div className={`absolute ${hPos} ${vPos} flex flex-col gap-1 ${textAlign} transition-all duration-300 ease-out`}>
                    <div className="h-1.5 w-14 rounded-full bg-editor-accent/80" />
                    <div className="h-1 w-10 rounded-full bg-editor-accent/40" />
                    <div className="h-1 w-8 rounded-full bg-editor-accent/25" />
                  </div>
                );
              })()}
            </div>
            {/* 3x3 clickable grid */}
            <div className="grid grid-cols-3 gap-1">
              {([
                { value: 'left-top',      row: 0, col: 0 },
                { value: 'center-top',    row: 0, col: 1 },
                { value: 'right-top',     row: 0, col: 2 },
                { value: 'center',        row: 1, col: 1 },
                { value: 'left-bottom',   row: 2, col: 0 },
                { value: 'center-bottom', row: 2, col: 1 },
                { value: 'right-bottom',  row: 2, col: 2 },
              ] as const).map(pos => {
                const isSelected = (data.hero.textLayout || 'left-top') === pos.value;
                const labels: Record<string, string> = {
                  'left-top': 'Arriba Izquierda', 'center-top': 'Arriba Centro', 'right-top': 'Arriba Derecha',
                  'center': 'Centro',
                  'left-bottom': 'Abajo Izquierda', 'center-bottom': 'Abajo Centro', 'right-bottom': 'Abajo Derecha',
                };
                return (
                  <button
                    key={pos.value}
                    title={labels[pos.value]}
                    onClick={() => setNestedData('hero.textLayout', pos.value)}
                    className={`flex items-center justify-center h-7 rounded transition-all duration-200 ${
                      isSelected
                        ? 'bg-editor-accent/20 border border-editor-accent/50'
                        : 'bg-editor-panel-bg/50 border border-transparent hover:bg-editor-border/50 hover:border-editor-border'
                    }`}
                    style={{ gridRow: pos.row + 1, gridColumn: pos.col + 1 }}
                  >
                    <div className={`rounded-full transition-all duration-200 ${
                      isSelected
                        ? 'w-2.5 h-2.5 bg-editor-accent shadow-[0_0_8px_var(--editor-accent)]'
                        : 'w-1.5 h-1.5 bg-editor-text-secondary/40'
                    }`} />
                  </button>
                );
              })}
              {/* Empty cells for middle row left/right (no left-center or right-center options) */}
              <div className="h-7" style={{ gridRow: 2, gridColumn: 1 }} />
              <div className="h-7" style={{ gridRow: 2, gridColumn: 3 }} />
            </div>
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* ========== BACKGROUND IMAGE ========== */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Image size={14} />
            Imagen de Fondo
          </label>

          {/* Prominent Image Preview with overlaid controls */}
          <div className="relative rounded-lg overflow-hidden border border-editor-border group">
            {data.hero.imageUrl ? (
              <>
                <div className="aspect-video">
                  <img src={data.hero.imageUrl} alt="Hero Background" className="w-full h-full object-cover" />
                </div>
                {/* Bottom gradient for contrast behind controls */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                {/* Overlaid action buttons at bottom-right */}
                <div className="absolute bottom-2.5 right-2.5 flex gap-1.5">
                  <button
                    onClick={() => setShowHeroImagePicker(true)}
                    className="p-2 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 transition-all duration-200"
                    title="Librería de Imágenes"
                  >
                    <Grid size={14} />
                  </button>
                  <button
                    onClick={() => setShowHeroImagePicker(true)}
                    className="p-2 rounded-lg bg-editor-accent/80 backdrop-blur-md border border-editor-accent/40 text-white hover:bg-editor-accent transition-all duration-200"
                    title="Generar con IA"
                  >
                    <Zap size={14} />
                  </button>
                  <button
                    onClick={() => setNestedData('hero.imageUrl', '')}
                    className="p-2 rounded-lg bg-red-500/60 backdrop-blur-md border border-red-500/30 text-white hover:bg-red-500/80 transition-all duration-200"
                    title="Eliminar imagen"
                  >
                    <X size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center bg-editor-bg text-editor-text-secondary gap-2">
                <Image size={32} className="opacity-30" />
                <span className="text-[10px] uppercase tracking-wider opacity-50">Sin imagen</span>
              </div>
            )}
          </div>

          {/* ImagePicker rendered with defaultOpen when triggered */}
          {showHeroImagePicker && (
            <ImagePicker
              label=""
              value={data.hero.imageUrl}
              onChange={(url) => setNestedData('hero.imageUrl', url)}
              generationContext="background"
              defaultOpen
              onClose={() => setShowHeroImagePicker(false)}
            />
          )}

          {/* Action row when no image */}
          {!data.hero.imageUrl && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowHeroImagePicker(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-editor-bg border border-editor-border text-editor-text-secondary hover:text-editor-text-primary hover:border-editor-accent/30 transition-all text-xs font-medium"
              >
                <Grid size={12} /> Librería
              </button>
              <button
                onClick={() => setShowHeroImagePicker(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-editor-accent/10 border border-editor-accent/20 text-editor-accent hover:bg-editor-accent/20 transition-all text-xs font-medium"
              >
                <Zap size={12} /> Generar IA
              </button>
            </div>
          )}

          {/* Overlay Opacity */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-editor-text-secondary">Oscurecimiento</span>
              <span className="text-[10px] text-editor-accent font-mono bg-editor-accent/10 px-2 py-0.5 rounded-full">{data.hero.overlayOpacity ?? 50}%</span>
            </div>
            <input
              type="range" min="0" max="100" step="5"
              value={data.hero.overlayOpacity ?? 50}
              onChange={(e) => setNestedData('hero.overlayOpacity', parseInt(e.target.value))}
              className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-editor-text-secondary/50">Claro</span>
              <span className="text-[9px] text-editor-text-secondary/50">Oscuro</span>
            </div>
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* ========== HERO HEIGHT ========== */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <AlignJustify size={14} />
            {t('controls.heroHeight')}
          </label>
          <div className="bg-editor-bg/50 p-3 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-editor-text-secondary">{t('controls.sectionHeight')}</span>
              <span className="text-[10px] text-editor-accent font-mono bg-editor-accent/10 px-2 py-0.5 rounded-full">
                {data.hero.heroHeight ? `${data.hero.heroHeight}vh` : t('controls.auto')}
              </span>
            </div>
            <input
              type="range" min="0" max="100" step="5"
              value={data.hero.heroHeight ?? 0}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setNestedData('hero.heroHeight', val === 0 ? undefined : val);
              }}
              className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-editor-text-secondary/50">{t('controls.auto')}</span>
              <span className="text-[9px] text-editor-text-secondary/50">100vh</span>
            </div>
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* ========== CONTENT ========== */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Type size={14} />
            {t('controls.content')}
          </label>

          <AIFormControl label={t('editor.controls.hero.headline')} onAssistClick={() => setAiAssistField({ path: 'hero.headline', value: data.hero.headline, context: 'Hero Headline' })}>
            <TextArea value={data.hero.headline} onChange={(e) => setNestedData('hero.headline', e.target.value)} rows={2} />
          </AIFormControl>
          <FontSizeSelector label={`${t('editor.controls.hero.headline')} ${t('editor.controls.common.size', { defaultValue: 'Size' })}`} value={data.hero.headlineFontSize || 'lg'} onChange={(v) => setNestedData('hero.headlineFontSize', v)} />

          <AIFormControl label={t('editor.controls.hero.subheadline')} onAssistClick={() => setAiAssistField({ path: 'hero.subheadline', value: data.hero.subheadline, context: 'Hero Subheadline' })}>
            <TextArea value={data.hero.subheadline} onChange={(e) => setNestedData('hero.subheadline', e.target.value)} rows={3} />
          </AIFormControl>
          <FontSizeSelector label={`${t('editor.controls.hero.subheadline')} ${t('editor.controls.common.size', { defaultValue: 'Size' })}`} value={data.hero.subheadlineFontSize || 'lg'} onChange={(v) => setNestedData('hero.subheadlineFontSize', v)} />

          <div className="grid grid-cols-2 gap-4">
            <Input label={t('editor.controls.hero.primaryCta')} value={data.hero.primaryCta} onChange={(e) => setNestedData('hero.primaryCta', e.target.value)} />
            <Input label={t('editor.controls.hero.secondaryCta')} value={data.hero.secondaryCta} onChange={(e) => setNestedData('hero.secondaryCta', e.target.value)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* ========== COLORS ========== */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Settings size={14} />
            {t('editor.controls.common.colors')}
          </label>

          <div className="space-y-3">
            <ColorControl label={t('editor.controls.common.background')} value={data.hero.colors?.background} onChange={(v) => setNestedData('hero.colors.background', v)} />
            <ColorControl label={t('editor.controls.common.title')} value={data.hero.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('hero.colors.heading', v)} />
            <ColorControl label={t('editor.controls.common.text')} value={data.hero.colors?.text} onChange={(v) => setNestedData('hero.colors.text', v)} />
            <ColorControl label={t('editor.controls.common.accent', { defaultValue: 'Primary Accent' })} value={data.hero.colors?.primary} onChange={(v) => setNestedData('hero.colors.primary', v)} />

            <div className="pt-2">
              <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.primaryButton')}</h5>
              <div className="grid grid-cols-2 gap-3">
                <ColorControl label={t('editor.background')} value={data.hero.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('hero.colors.buttonBackground', v)} />
                <ColorControl label={t('editor.text')} value={data.hero.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('hero.colors.buttonText', v)} />
              </div>
            </div>

            <div className="pt-2">
              <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.secondaryButton')}</h5>

              {/* Button Style Selector */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-editor-text-secondary mb-1">{t('editor.controls.common.style')}</label>
                <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
                  {['solid', 'outline', 'ghost'].map(style => (
                    <button
                      key={style}
                      onClick={() => setNestedData('hero.secondaryButtonStyle', style)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${(data.hero.secondaryButtonStyle || 'solid') === style
                        ? 'bg-editor-accent text-editor-bg'
                        : 'text-editor-text-secondary hover:bg-editor-border'
                        }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ColorControl label={t('editor.background')} value={data.hero.colors?.secondaryButtonBackground || '#334155'} onChange={(v) => setNestedData('hero.colors.secondaryButtonBackground', v)} />
                <ColorControl label={t('editor.text')} value={data.hero.colors?.secondaryButtonText || '#ffffff'} onChange={(v) => setNestedData('hero.colors.secondaryButtonText', v)} />
              </div>

              {/* Opacity Slider - only for solid style */}
              {(data.hero.secondaryButtonStyle || 'solid') === 'solid' && (
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-medium text-editor-text-secondary">Opacity</label>
                    <span className="text-[10px] text-editor-accent font-mono bg-editor-accent/10 px-2 py-0.5 rounded-full">{data.hero.secondaryButtonOpacity ?? 100}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="5"
                    value={data.hero.secondaryButtonOpacity ?? 100}
                    onChange={(e) => setNestedData('hero.secondaryButtonOpacity', parseInt(e.target.value))}
                    className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    );
  };

  const renderFeaturesControls = () => {
    if (!data?.features) return null;

    // Get current variant from data, fallback to classic
    const currentVariant = (data.features as any).featuresVariant || 'classic';

    return (
      <div className="space-y-4">
        <Input label={t('editor.controls.common.title')} value={data.features.title} onChange={(e) => setNestedData('features.title', e.target.value)} />
        <FontSizeSelector label={`${t('editor.controls.common.title')} ${t('editor.controls.common.size')}`} value={data.features.titleFontSize || 'md'} onChange={(v) => setNestedData('features.titleFontSize', v)} />

        <TextArea label={t('editor.controls.common.description')} value={data.features.description} onChange={(e) => setNestedData('features.description', e.target.value)} rows={2} />
        <FontSizeSelector label={`${t('editor.controls.common.description')} ${t('editor.controls.common.size')}`} value={data.features.descriptionFontSize || 'md'} onChange={(v) => setNestedData('features.descriptionFontSize', v)} />

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.features.sectionStyle')}</label>
        <div>
          <div className="grid grid-cols-4 gap-1 bg-editor-bg p-1 rounded-md border border-editor-border">
            <button
              onClick={() => setNestedData('features.featuresVariant', 'classic')}
              className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentVariant === 'classic' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
            >
              {t('editor.controls.hero.classic')}
            </button>
            <button
              onClick={() => setNestedData('features.featuresVariant', 'modern')}
              className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentVariant === 'modern' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
            >
              {t('editor.controls.features.bento')}
            </button>
            <button
              onClick={() => setNestedData('features.featuresVariant', 'bento-premium')}
              className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentVariant === 'bento-premium' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
            >
              {t('editor.controls.features.premium')}
            </button>
            <button
              onClick={() => setNestedData('features.featuresVariant', 'image-overlay')}
              className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentVariant === 'image-overlay' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
            >
              {t('editor.controls.features.overlay')}
            </button>
            <button
              onClick={() => setNestedData('features.featuresVariant', 'cinematic-gym')}
              className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentVariant === 'cinematic-gym' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
            >
              Brutalist
            </button>
          </div>
          <p className="text-xs text-editor-text-secondary mt-2">
            {currentVariant === 'classic'
              ? t('editor.controls.features.descClassic')
              : currentVariant === 'modern'
                ? t('editor.controls.features.descBento')
                : currentVariant === 'bento-premium'
                  ? t('editor.controls.features.descPremium')
                  : t('editor.controls.features.descOverlay')}
          </p>
        </div>

        {/* Overlay-specific controls */}
        {currentVariant === 'image-overlay' && (
          <>
            <div className="border-t border-editor-border/30 my-1" />
            <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.features.overlaySettings')}</label>
            <div>
              <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.features.textAlignment')}</label>
              <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
                {(['left', 'center', 'right'] as const).map(align => (
                  <button
                    key={align}
                    onClick={() => setNestedData('features.overlayTextAlignment', align)}
                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors capitalize ${(data.features as any).overlayTextAlignment === align || (!((data.features as any).overlayTextAlignment) && align === 'left') ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                  >
                    {align === 'left' ? '⬅️ Left' : align === 'center' ? '↔️ Center' : '➡️ Right'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Show Section Header</label>
              <button
                onClick={() => setNestedData('features.showSectionHeader', !((data.features as any).showSectionHeader !== false))}
                className={`relative w-10 h-5 rounded-full transition-colors ${(data.features as any).showSectionHeader !== false ? 'bg-editor-accent' : 'bg-editor-border'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${(data.features as any).showSectionHeader !== false ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </>
        )}

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.features.gridLayout')}</label>
        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.features.columnsDesktop')}</label>
          <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
            {[2, 3, 4].map(cols => (
              <button
                key={cols}
                onClick={() => setNestedData('features.gridColumns', cols)}
                className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${data.features.gridColumns === cols ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
              >
                {cols}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.features.cardImage')}</label>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.features.imageHeight')}</label>
            <span className="text-xs text-editor-text-primary">{data.features.imageHeight || 200}px</span>
          </div>
          <input
            type="range" min="100" max="600" step="10"
            value={data.features.imageHeight || 200}
            onChange={(e) => setNestedData('features.imageHeight', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Object Fit</label>
          <div className="grid grid-cols-3 gap-1 bg-editor-bg p-1 rounded-md border border-editor-border">
            {['cover', 'contain', 'fill', 'none', 'scale-down'].map(fit => (
              <button
                key={fit}
                onClick={() => setNestedData('features.imageObjectFit', fit)}
                className={`py-1 px-2 text-xs font-semibold rounded-sm transition-colors capitalize ${data.features.imageObjectFit === fit ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
              >
                {fit === 'scale-down' ? 'Scale' : fit}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.common.spacing')}</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label={t('editor.controls.common.vertical')} value={data.features.paddingY || 'md'} onChange={(v) => setNestedData('features.paddingY', v)} />
            <PaddingSelector label={t('editor.controls.common.horizontal')} value={data.features.paddingX || 'md'} onChange={(v) => setNestedData('features.paddingX', v)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.common.colors')}</label>
        <ColorControl label={t('editor.controls.common.background')} value={data.features.colors?.background || '#000000'} onChange={(v) => setNestedData('features.colors.background', v)} />
        <ColorControl label={t('editor.controls.features.showSectionHeader')} value={data.features.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('features.colors.heading', v)} />
        <ColorControl label={t('editor.controls.common.description')} value={data.features.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('features.colors.description', v)} />
        <ColorControl label={t('editor.controls.common.accent')} value={data.features.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('features.colors.accent', v)} />

        <div className="border-t border-editor-border/30 my-1" />
        <p className="text-[10px] text-editor-text-secondary uppercase tracking-wider font-bold">{t('editor.controls.features.cardColors')}</p>

        <ColorControl label={`${t('editor.controls.features.cardImage')} ${t('editor.controls.common.background')}`} value={data.features.colors?.cardBackground || '#1a1a2e'} onChange={(v) => setNestedData('features.colors.cardBackground', v)} />
        <ColorControl label={`${t('editor.controls.features.cardImage')} ${t('editor.controls.common.title')}`} value={(data.features.colors as any)?.cardHeading || '#ffffff'} onChange={(v) => setNestedData('features.colors.cardHeading', v)} />
        <ColorControl label={`${t('editor.controls.features.cardImage')} ${t('editor.controls.common.text')}`} value={(data.features.colors as any)?.cardText || '#94a3b8'} onChange={(v) => setNestedData('features.colors.cardText', v)} />
        <ColorControl label={t('editor.controls.hero.borderColor')} value={data.features.colors?.borderColor || 'transparent'} onChange={(v) => setNestedData('features.colors.borderColor', v)} />

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.features.featureList')}</label>
        {(data.features.items || []).map((item, index) => (
          <div key={index} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group">
            <ImagePicker
              label={`${t('editor.controls.features.feature')} #${index + 1}`}
              value={item.imageUrl}
              onChange={(url) => setNestedData(`features.items.${index}.imageUrl`, url)}
              onRemove={() => {
                const newItems = data.features.items.filter((_, i) => i !== index);
                setNestedData('features.items', newItems);
              }}
            />
            <Input
              placeholder="Title"
              value={item.title}
              onChange={(e) => setNestedData(`features.items.${index}.title`, e.target.value)}
              className="mb-2 mt-2"
            />
            <textarea
              placeholder="Description"
              value={item.description}
              onChange={(e) => setNestedData(`features.items.${index}.description`, e.target.value)}
              rows={2}
              className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
            />
          </div>
        ))}
        <button
          onClick={() => {
            setNestedData('features.items', [...(data.features.items || []), { title: '', description: '', imageUrl: '' }]);
          }}
          className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus size={14} /> {t('editor.controls.features.addFeature')}
        </button>
      </div>
    );
  };
  // Helper to determine list title based on section key
  const getListTitle = (sectionKey: string, itemLabel: string) => {
    switch (sectionKey) {
      case 'services': return t('editor.controls.services.services');
      case 'faq': return t('editor.controls.faq.questions');
      case 'menu': return t('editor.controls.menu.dishes');
      case 'howItWorks': return t('editor.controls.list.steps');
      default: return itemLabel + 's';
    }
  };

  const renderListSectionControls = (sectionKey: string, itemLabel: string, fields: { key: string, label: string, type: 'input' | 'textarea' | 'select' | 'image' | 'icon-selector', options?: string[] }[]) => {
    if (!data) return null;
    const sectionData = (data as any)[sectionKey];
    if (!sectionData) return null;

    return (
      <div className="space-y-4">
        <Input label={t('editor.controls.common.title')} value={sectionData.title} onChange={(e) => setNestedData(`${sectionKey}.title`, e.target.value)} />
        <FontSizeSelector label={`${t('editor.controls.common.title')} ${t('editor.controls.common.size')}`} value={sectionData.titleFontSize || 'md'} onChange={(v) => setNestedData(`${sectionKey}.titleFontSize`, v)} />

        {sectionData.description !== undefined && (
          <>
            <TextArea label={t('editor.controls.common.description')} value={sectionData.description} onChange={(e) => setNestedData(`${sectionKey}.description`, e.target.value)} rows={2} />
            <FontSizeSelector label={`${t('editor.controls.common.description')} ${t('editor.controls.common.size')}`} value={sectionData.descriptionFontSize || 'md'} onChange={(v) => setNestedData(`${sectionKey}.descriptionFontSize`, v)} />
          </>
        )}

        {/* Specific Controls for some sections */}
        {sectionKey === 'howItWorks' && (
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.list.stepsCount')}</label>
            <select
              value={sectionData.steps}
              onChange={(e) => setNestedData(`${sectionKey}.steps`, parseInt(e.target.value))}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary"
            >
              <option value={3}>3 {t('editor.controls.list.steps') || 'Steps'}</option>
              <option value={4}>4 {t('editor.controls.list.steps') || 'Steps'}</option>
            </select>
          </div>
        )}

        <div className="border-t border-editor-border/30 my-1" />

        {/* Padding Controls */}
        {sectionData.paddingY !== undefined && sectionData.paddingX !== undefined && (
          <>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.common.spacing')}</label>
              <div className="grid grid-cols-2 gap-3">
                <PaddingSelector label={t('editor.controls.common.vertical')} value={sectionData.paddingY || 'md'} onChange={(v) => setNestedData(`${sectionKey}.paddingY`, v)} />
                <PaddingSelector label={t('editor.controls.common.horizontal')} value={sectionData.paddingX || 'md'} onChange={(v) => setNestedData(`${sectionKey}.paddingX`, v)} />
              </div>
            </div>
            <div className="border-t border-editor-border/30 my-1" />
          </>
        )}

        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{getListTitle(sectionKey, itemLabel)}</label>
        {(sectionData.items || []).map((item: any, index: number) => (
          <div
            key={index}
            data-section-item={`${sectionKey}:${index}`}
            className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-editor-text-secondary">{itemLabel} #{index + 1}</span>
              <button
                onClick={() => {
                  const newItems = (sectionData.items || []).filter((_: any, i: number) => i !== index);
                  setNestedData(`${sectionKey}.items`, newItems);
                }}
                className="text-editor-text-secondary hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {fields.map(field => (
              <div key={field.key} className="mb-2 last:mb-0">
                {field.type === 'textarea' ? (
                  <textarea
                    placeholder={field.label}
                    value={item[field.key]}
                    onChange={(e) => setNestedData(`${sectionKey}.items.${index}.${field.key}`, e.target.value)}
                    rows={2}
                    className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                  />
                ) : field.type === 'icon-selector' ? (
                  <IconSelector
                    label={field.label}
                    value={item[field.key]}
                    onChange={(icon) => setNestedData(`${sectionKey}.items.${index}.${field.key}`, icon)}
                    size="sm"
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={item[field.key]}
                    onChange={(e) => setNestedData(`${sectionKey}.items.${index}.${field.key}`, e.target.value)}
                    className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                  >
                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : field.type === 'image' ? (
                  <ImagePicker
                    label={field.label}
                    value={item[field.key]}
                    onChange={(url) => setNestedData(`${sectionKey}.items.${index}.${field.key}`, url)}
                  />
                ) : (
                  <input
                    placeholder={field.label}
                    value={item[field.key]}
                    onChange={(e) => setNestedData(`${sectionKey}.items.${index}.${field.key}`, e.target.value)}
                    className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
        <button
          onClick={() => {
            const newItem = fields.reduce((acc, field) => ({ ...acc, [field.key]: '' }), {});
            setNestedData(`${sectionKey}.items`, [...(sectionData.items || []), newItem]);
          }}
          className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus size={14} /> {t('editor.controls.list.add')} {itemLabel}
        </button>

        <div className="border-t border-editor-border/30 my-1" />
        {sectionData.colors?.background && <ColorControl label={t('editor.controls.common.background')} value={sectionData.colors?.background} onChange={(v) => setNestedData(`${sectionKey}.colors?.background`, v)} />}
        {sectionData.colors?.heading && <ColorControl label={t('editor.controls.common.title')} value={sectionData.colors?.heading} onChange={(v) => setNestedData(`${sectionKey}.colors?.heading`, v)} />}
        {sectionData.colors?.text && <ColorControl label={t('editor.controls.common.text')} value={sectionData.colors?.text} onChange={(v) => setNestedData(`${sectionKey}.colors?.text`, v)} />}
      </div>
    )
  }


  const renderPricingControls = () => {
    if (!data?.pricing) return null;
    const currentVariant = data.pricing.pricingVariant || 'classic';

    return (
      <div className="space-y-4">
        {/* Variant Selector */}
        <div className="mb-4">
          <Select
            label={t('editor.controls.pricing.styleVariant')}
            value={currentVariant || 'classic'}
            onChange={(v) => setNestedData('pricing.pricingVariant', v)}
            options={[
              { value: 'classic', label: `${t('editor.controls.pricing.classic')} - ${t('editor.controls.pricing.classicDesc')}` },
              { value: 'gradient', label: `${t('editor.controls.pricing.gradient')} - ${t('editor.controls.pricing.gradientDesc')}` },
              { value: 'glassmorphism', label: `${t('editor.controls.pricing.glassmorphism')} - ${t('editor.controls.pricing.glassmorphismDesc')}` },
              { value: 'minimalist', label: `${t('editor.controls.pricing.minimalist')} - ${t('editor.controls.pricing.minimalistDesc')}` },
              { value: 'comparison', label: `Comparison - Detailed` }
            ]}
          />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        <Input label={t('editor.controls.common.title')} value={data.pricing.title} onChange={(e) => setNestedData('pricing.title', e.target.value)} />
        <FontSizeSelector label={`${t('editor.controls.common.title')} ${t('editor.controls.common.size')}`} value={data.pricing.titleFontSize || 'md'} onChange={(v) => setNestedData('pricing.titleFontSize', v)} />

        <TextArea label={t('editor.controls.common.description')} value={data.pricing.description} onChange={(e) => setNestedData('pricing.description', e.target.value)} rows={2} />
        <FontSizeSelector label={`${t('editor.controls.common.description')} ${t('editor.controls.common.size')}`} value={data.pricing.descriptionFontSize || 'md'} onChange={(v) => setNestedData('pricing.descriptionFontSize', v)} />

        <div className="border-t border-editor-border/30 my-1" />
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.common.spacing')}</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label={t('editor.controls.common.vertical')} value={data.pricing.paddingY || 'md'} onChange={(v) => setNestedData('pricing.paddingY', v)} />
            <PaddingSelector label={t('editor.controls.common.horizontal')} value={data.pricing.paddingX || 'md'} onChange={(v) => setNestedData('pricing.paddingX', v)} />
          </div>
        </div>

        <BorderRadiusSelector label={t('editor.controls.pricing.cardCorners')} value={data.pricing.cardBorderRadius || 'xl'} onChange={(v) => setNestedData('pricing.cardBorderRadius', v)} />

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.pricing.sectionColors')}</label>
        <ColorControl label={t('editor.controls.common.background')} value={data.pricing.colors?.background} onChange={(v) => setNestedData('pricing.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.title')} value={data.pricing.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.heading', v)} />
        <ColorControl label={t('editor.controls.common.description')} value={data.pricing.colors?.description || data.pricing.colors?.text} onChange={(v) => setNestedData('pricing.colors.description', v)} />
        <ColorControl label={t('editor.controls.common.text')} value={data.pricing.colors?.text} onChange={(v) => setNestedData('pricing.colors.text', v)} />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data.pricing.cornerGradient?.enabled || false}
          position={data.pricing.cornerGradient?.position || 'top-left'}
          color={data.pricing.cornerGradient?.color || '#4f46e5'}
          opacity={data.pricing.cornerGradient?.opacity || 30}
          size={data.pricing.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('pricing.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('pricing.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('pricing.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('pricing.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('pricing.cornerGradient.size', v)}
        />

        {/* Gradient Colors - Only for gradient variant */}
        {currentVariant === 'gradient' && (
          <>
            <div className="border-t border-editor-border/30 my-1" />
            <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
              <Sparkles size={14} className="text-editor-accent" />
              {t('editor.controls.pricing.gradientColors')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <ColorControl label={t('editor.controls.pricing.gradientStart')} value={data.pricing.colors?.gradientStart || '#4f46e5'} onChange={(v) => setNestedData('pricing.colors.gradientStart', v)} />
              <ColorControl label={t('editor.controls.pricing.gradientEnd')} value={data.pricing.colors?.gradientEnd || '#10b981'} onChange={(v) => setNestedData('pricing.colors.gradientEnd', v)} />
            </div>
            <div className="mt-2 p-3 rounded-lg" style={{
              backgroundImage: `linear-gradient(135deg, ${data.pricing.colors?.gradientStart || '#4f46e5'}, ${data.pricing.colors?.gradientEnd || '#10b981'})`
            }}>
              <p className="text-xs text-white font-semibold text-center">{t('editor.controls.pricing.gradientPreview')}</p>
            </div>
          </>
        )}

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.pricing.cardColors')}</label>
        <ColorControl label={t('editor.controls.pricing.cardBackground')} value={data.pricing.colors?.cardBackground || '#1f2937'} onChange={(v) => setNestedData('pricing.colors.cardBackground', v)} />
        <ColorControl label={t('editor.controls.pricing.cardTitle')} value={data.pricing.colors?.cardHeading || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.cardHeading', v)} />
        <ColorControl label={t('editor.controls.pricing.cardText')} value={data.pricing.colors?.cardText || '#94a3b8'} onChange={(v) => setNestedData('pricing.colors.cardText', v)} />
        <ColorControl label={t('editor.controls.pricing.priceColor')} value={data.pricing.colors?.priceColor || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.priceColor', v)} />
        <ColorControl label={t('editor.controls.pricing.borderColor')} value={data.pricing.colors?.borderColor || '#374151'} onChange={(v) => setNestedData('pricing.colors.borderColor', v)} />
        <ColorControl label={t('editor.controls.pricing.featuredAccent')} value={data.pricing.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('pricing.colors.accent', v)} />
        <ColorControl label={t('editor.controls.pricing.checkmarkIcon')} value={data.pricing.colors?.checkmarkColor || '#10b981'} onChange={(v) => setNestedData('pricing.colors.checkmarkColor', v)} />

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.pricing.defaultButtonColors')}</label>
        <div className="grid grid-cols-2 gap-3">
          <ColorControl label={t('editor.controls.common.background')} value={data.pricing.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('pricing.colors.buttonBackground', v)} />
          <ColorControl label={t('editor.controls.common.text')} value={data.pricing.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.buttonText', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.pricing.pricingTiers')}</label>
        {(data.pricing.tiers || []).map((tier, index) => (
          <div key={index} className="bg-editor-bg p-4 rounded-lg border border-editor-border mb-3 group">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-editor-text-secondary">{t('editor.controls.pricing.tier')} #{index + 1}</span>
              <button onClick={() => {
                const newTiers = data.pricing.tiers.filter((_, i) => i !== index);
                setNestedData('pricing.tiers', newTiers);
              }} className="text-editor-text-secondary hover:text-red-400"><Trash2 size={14} /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={t('editor.controls.pricing.planName')} value={tier.name} onChange={(e) => setNestedData(`pricing.tiers.${index}.name`, e.target.value)} className="mb-0" />
                <Input placeholder={t('editor.controls.pricing.price')} value={tier.price} onChange={(e) => setNestedData(`pricing.tiers.${index}.price`, e.target.value)} className="mb-0" />
              </div>

              <Input placeholder={t('editor.controls.pricing.frequency')} value={tier.frequency} onChange={(e) => setNestedData(`pricing.tiers.${index}.frequency`, e.target.value)} className="mb-0" />

              <TextArea
                placeholder={`${t('editor.controls.common.description')} (${t('editor.controls.common.optional') || 'Optional'})`}
                value={tier.description || ''}
                onChange={(e) => setNestedData(`pricing.tiers.${index}.description`, e.target.value)}
                rows={2}
                className="mb-0"
              />

              <div>
                <label className="block text-[10px] font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.pricing.featuresHelp')}</label>
                <textarea
                  value={tier.features.join('\n')}
                  onChange={(e) => setNestedData(`pricing.tiers.${index}.features`, e.target.value.split('\n').filter(f => f.trim()))}
                  rows={4}
                  placeholder={t('editor.controls.pricing.featurePlaceholder')}
                  className="w-full bg-editor-panel-bg border border-editor-border rounded px-3 py-2 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Button Text"
                  value={tier.buttonText}
                  onChange={(e) => setNestedData(`pricing.tiers.${index}.buttonText`, e.target.value)}
                  className="mb-0"
                />
                <Input
                  placeholder="Button Link"
                  value={tier.buttonLink || ''}
                  onChange={(e) => setNestedData(`pricing.tiers.${index}.buttonLink`, e.target.value)}
                  className="mb-0"
                />
              </div>

              <ToggleControl
                label={t('editor.controls.pricing.featuredPlan')}
                checked={tier.featured}
                onChange={(v) => setNestedData(`pricing.tiers.${index}.featured`, v)}
              />
            </div>
          </div>
        ))}

        <button
          onClick={() => setNestedData('pricing.tiers', [
            ...data.pricing.tiers,
            { name: 'New Plan', price: '$0', frequency: '/mo', description: '', features: [], buttonText: 'Get Started', buttonLink: '#', featured: false }
          ])}
          className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus size={14} /> {t('editor.controls.pricing.addTier')}
        </button>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Animation Controls */}
        <AnimationControls
          animationType={data.pricing.animationType || 'fade-in-up'}
          enableCardAnimation={data.pricing.enableCardAnimation !== false}
          onChangeAnimationType={(type) => setNestedData('pricing.animationType', type)}
          onToggleAnimation={(enabled) => setNestedData('pricing.enableCardAnimation', enabled)}
          label={t('editor.controls.pricing.animation')}
        />
      </div>
    );
  }

  const renderTestimonialsControls = () => {
    if (!data?.testimonials) return null;
    return (
      <div className="space-y-4">
        <Input label={t('editor.controls.common.title')} value={data.testimonials.title} onChange={(e) => setNestedData('testimonials.title', e.target.value)} />
        <FontSizeSelector label={`${t('editor.controls.common.title')} ${t('editor.controls.common.size')}`} value={data.testimonials.titleFontSize || 'md'} onChange={(v) => setNestedData('testimonials.titleFontSize', v)} />

        <TextArea label={t('editor.controls.common.description')} value={data.testimonials.description} onChange={(e) => setNestedData('testimonials.description', e.target.value)} rows={2} />
        <FontSizeSelector label={`${t('editor.controls.common.description')} ${t('editor.controls.common.size')}`} value={data.testimonials.descriptionFontSize || 'md'} onChange={(v) => setNestedData('testimonials.descriptionFontSize', v)} />

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.testimonials.cardStyling')}</label>

        <ColorControl label={t('editor.controls.testimonials.cardBackground')} value={data.testimonials.colors?.cardBackground || '#1f2937'} onChange={(v) => setNestedData('testimonials.colors.cardBackground', v)} />

        <BorderRadiusSelector label={t('editor.controls.testimonials.cardCorners')} value={data.testimonials.borderRadius || 'xl'} onChange={(v) => setNestedData('testimonials.borderRadius', v)} />

        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.testimonials.cardShadow')}</label>
          <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
            {['none', 'sm', 'md', 'lg', 'xl'].map((shadow) => (
              <button
                key={shadow}
                onClick={() => setNestedData('testimonials.cardShadow', shadow)}
                className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors uppercase ${(data.testimonials.cardShadow || 'lg') === shadow ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
              >
                {shadow}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.testimonials.borderStyle')}</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'none', label: t('editor.controls.testimonials.none') },
              { value: 'solid', label: t('editor.controls.testimonials.solid') },
              { value: 'gradient', label: t('editor.controls.testimonials.gradient') },
              { value: 'glow', label: t('editor.controls.testimonials.glow') }
            ].map(style => (
              <button
                key={style.value}
                onClick={() => setNestedData('testimonials.borderStyle', style.value)}
                className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors ${(data.testimonials.borderStyle || 'solid') === style.value ? 'bg-editor-accent text-editor-bg' : 'bg-editor-bg text-editor-text-secondary hover:bg-editor-border border border-editor-border'}`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        <ColorControl label={t('editor.controls.testimonials.borderColor')} value={data.testimonials.colors?.borderColor || '#374151'} onChange={(v) => setNestedData('testimonials.colors.borderColor', v)} />

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Card Padding</label>
            <span className="text-xs text-editor-text-primary">{data.testimonials.cardPadding || 32}px</span>
          </div>
          <input
            type="range" min="16" max="64" step="4"
            value={data.testimonials.cardPadding || 32}
            onChange={(e) => setNestedData('testimonials.cardPadding', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>

        <div className="border-t border-editor-border/30 my-1" />
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data.testimonials.paddingY || 'md'} onChange={(v) => setNestedData('testimonials.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data.testimonials.paddingX || 'md'} onChange={(v) => setNestedData('testimonials.paddingX', v)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Section Colors</label>
        <ColorControl label={t('editor.controls.common.background')} value={data.testimonials.colors?.background || '#000000'} onChange={(v) => setNestedData('testimonials.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.title')} value={data.testimonials.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('testimonials.colors.heading', v)} />
        <ColorControl label={t('editor.controls.common.description')} value={data.testimonials.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('testimonials.colors.description', v)} />
        <ColorControl label="Text" value={data.testimonials.colors?.text || '#ffffff'} onChange={(v) => setNestedData('testimonials.colors.text', v)} />
        <ColorControl label="Person Title" value={data.testimonials.colors?.subtitleColor || data.testimonials.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('testimonials.colors.subtitleColor', v)} />
        <ColorControl label="Accent" value={data.testimonials.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('testimonials.colors.accent', v)} />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data.testimonials.cornerGradient?.enabled || false}
          position={data.testimonials.cornerGradient?.position || 'top-left'}
          color={data.testimonials.cornerGradient?.color || '#4f46e5'}
          opacity={data.testimonials.cornerGradient?.opacity || 30}
          size={data.testimonials.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('testimonials.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('testimonials.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('testimonials.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('testimonials.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('testimonials.cornerGradient.size', v)}
        />

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Testimonials</label>
        {(data.testimonials.items || []).map((item: any, index: number) => (
          <div
            key={index}
            data-section-item={`testimonials:${index}`}
            className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-editor-text-secondary">Testimonial #{index + 1}</span>
              <button
                onClick={() => {
                  const newItems = (data.testimonials.items || []).filter((_: any, i: number) => i !== index);
                  setNestedData('testimonials.items', newItems);
                }}
                className="text-editor-text-secondary hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <ImagePicker
              label={`Avatar #${index + 1}`}
              value={item.imageUrl || ''}
              onChange={(url) => setNestedData(`testimonials.items.${index}.imageUrl`, url)}
              onRemove={() => setNestedData(`testimonials.items.${index}.imageUrl`, '')}
            />
            <textarea
              placeholder="Quote"
              value={item.quote}
              onChange={(e) => setNestedData(`testimonials.items.${index}.quote`, e.target.value)}
              rows={2}
              className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
            />
            <input
              placeholder="Name"
              value={item.name}
              onChange={(e) => setNestedData(`testimonials.items.${index}.name`, e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
            />
            <input
              placeholder="Role"
              value={item.title}
              onChange={(e) => setNestedData(`testimonials.items.${index}.title`, e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
            />
          </div>
        ))}
        <button
          onClick={() => {
            const newItem = { quote: '', name: '', title: '', imageUrl: '' };
            setNestedData('testimonials.items', [...(data.testimonials.items || []), newItem]);
          }}
          className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus size={14} /> Add Testimonial
        </button>
      </div>
    );
  }

  const renderSlideshowControls = () => {
    if (!data?.slideshow) return null;
    return (
      <div className="space-y-4">
        <Input label={t('editor.controls.common.title')} value={data.slideshow.title} onChange={(e) => setNestedData('slideshow.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.slideshow.titleFontSize || 'md'} onChange={(v) => setNestedData('slideshow.titleFontSize', v)} />

        <div className="border-t border-editor-border/30 my-1" />

        <Select
          label={t('editor.controls.common.styleVariant')}
          value={data.slideshow.slideshowVariant || 'classic'}
          onChange={(v) => setNestedData('slideshow.slideshowVariant', v)}
          options={[
            { value: 'classic', label: 'Classic Slide' },
            { value: 'kenburns', label: 'Ken Burns Effect' },
            { value: 'cards3d', label: '3D Cards Stack' },
            { value: 'thumbnails', label: 'Thumbnail Gallery' }
          ]}
        />

        <BorderRadiusSelector
          label={t('editor.controls.common.borderRadius')}
          value={data.slideshow.borderRadius || 'xl'}
          onChange={(v) => setNestedData('slideshow.borderRadius', v)}
        />

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider mb-2">Animation</label>

        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Transition Effect</label>
          <select
            value={data.slideshow.transitionEffect || 'slide'}
            onChange={(e) => setNestedData('slideshow.transitionEffect', e.target.value)}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
          >
            <option value="slide">Slide</option>
            <option value="fade">Fade</option>
            <option value="zoom">Zoom</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Transition Duration (ms)</label>
          <input
            type="number"
            min="200"
            max="2000"
            step="100"
            value={data.slideshow.transitionDuration || 500}
            onChange={(e) => setNestedData('slideshow.transitionDuration', parseInt(e.target.value))}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Autoplay Speed (ms)</label>
          <input
            type="number"
            min="1000"
            max="10000"
            step="500"
            value={data.slideshow.autoPlaySpeed || 5000}
            onChange={(e) => setNestedData('slideshow.autoPlaySpeed', parseInt(e.target.value))}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
          />
        </div>

        {(data.slideshow.slideshowVariant === 'kenburns') && (
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Ken Burns Intensity</label>
            <select
              value={data.slideshow.kenBurnsIntensity || 'medium'}
              onChange={(e) => setNestedData('slideshow.kenBurnsIntensity', e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
            >
              <option value="low">Low (5% zoom)</option>
              <option value="medium">Medium (10% zoom)</option>
              <option value="high">High (25% zoom)</option>
            </select>
          </div>
        )}

        {(data.slideshow.slideshowVariant === 'thumbnails') && (
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Thumbnail Height (px)</label>
            <input
              type="number"
              min="60"
              max="150"
              step="10"
              value={data.slideshow.thumbnailSize || 80}
              onChange={(e) => setNestedData('slideshow.thumbnailSize', parseInt(e.target.value))}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
            />
          </div>
        )}

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider mb-2">Navigation</label>

        <div className="space-y-2">
          <ToggleControl label={t('editor.controls.common.showArrows')} checked={data.slideshow.showArrows ?? true} onChange={(v) => setNestedData('slideshow.showArrows', v)} />
          <ToggleControl label={t('editor.controls.common.showDots')} checked={data.slideshow.showDots ?? true} onChange={(v) => setNestedData('slideshow.showDots', v)} />
          <ToggleControl label={t('editor.controls.common.showCaptions')} checked={data.slideshow.showCaptions ?? false} onChange={(v) => setNestedData('slideshow.showCaptions', v)} />
        </div>

        {(data.slideshow.showArrows ?? true) && (
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Arrow Style</label>
            <select
              value={data.slideshow.arrowStyle || 'rounded'}
              onChange={(e) => setNestedData('slideshow.arrowStyle', e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
            >
              <option value="rounded">Rounded</option>
              <option value="square">Square</option>
              <option value="minimal">Minimal</option>
              <option value="floating">Floating</option>
            </select>
          </div>
        )}

        {(data.slideshow.showDots ?? true) && (
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Dot Style</label>
            <select
              value={data.slideshow.dotStyle || 'circle'}
              onChange={(e) => setNestedData('slideshow.dotStyle', e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
            >
              <option value="circle">Circle</option>
              <option value="line">Line</option>
              <option value="square">Square</option>
              <option value="pill">Pill</option>
            </select>
          </div>
        )}

        <div className="border-t border-editor-border/30 my-1" />
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data.slideshow.paddingY || 'md'} onChange={(v) => setNestedData('slideshow.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data.slideshow.paddingX || 'md'} onChange={(v) => setNestedData('slideshow.paddingX', v)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider mb-2">Colors</label>
        <ColorControl label={t('editor.controls.common.background')} value={data.slideshow.colors?.background} onChange={(v) => setNestedData('slideshow.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.title')} value={data.slideshow.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.heading', v)} />

        {(data.slideshow.showArrows ?? true) && (
          <>
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mt-3">Arrows</h5>
            <ColorControl label="Arrow Background" value={data.slideshow.colors?.arrowBackground || 'rgba(0, 0, 0, 0.5)'} onChange={(v) => setNestedData('slideshow.colors.arrowBackground', v)} />
            <ColorControl label="Arrow Icon" value={data.slideshow.colors?.arrowText || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.arrowText', v)} />
          </>
        )}

        {(data.slideshow.showDots ?? true) && (
          <>
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mt-3">Dots</h5>
            <ColorControl label="Active Dot" value={data.slideshow.colors?.dotActive || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.dotActive', v)} />
            <ColorControl label="Inactive Dot" value={data.slideshow.colors?.dotInactive || 'rgba(255, 255, 255, 0.5)'} onChange={(v) => setNestedData('slideshow.colors.dotInactive', v)} />
          </>
        )}

        {(data.slideshow.showCaptions ?? false) && (
          <>
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mt-3">Captions</h5>
            <ColorControl label="Caption Background" value={data.slideshow.colors?.captionBackground || 'rgba(0, 0, 0, 0.7)'} onChange={(v) => setNestedData('slideshow.colors.captionBackground', v)} />
            <ColorControl label="Caption Text" value={data.slideshow.colors?.captionText || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.captionText', v)} />
          </>
        )}

        <div className="border-t border-editor-border/30 my-1" />

        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data.slideshow.cornerGradient?.enabled || false}
          position={data.slideshow.cornerGradient?.position || 'top-left'}
          color={data.slideshow.cornerGradient?.color || '#4f46e5'}
          opacity={data.slideshow.cornerGradient?.opacity || 30}
          size={data.slideshow.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('slideshow.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('slideshow.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('slideshow.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('slideshow.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('slideshow.cornerGradient.size', v)}
        />

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Slides</label>
        {(data.slideshow.items || []).map((item: any, index: number) => (
          <div key={index} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group">
            <ImagePicker
              label={`Slide #${index + 1}`}
              value={item.imageUrl}
              onChange={(url) => setNestedData(`slideshow.items.${index}.imageUrl`, url)}
              onRemove={() => {
                const newItems = (data.slideshow.items || []).filter((_: any, i: number) => i !== index);
                setNestedData('slideshow.items', newItems);
              }}
            />
            <input
              placeholder="Alt Text"
              value={item.altText}
              onChange={(e) => setNestedData(`slideshow.items.${index}.altText`, e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mt-2"
            />
            {(data.slideshow.showCaptions ?? false) && (
              <input
                placeholder="Caption (optional)"
                value={item.caption || ''}
                onChange={(e) => setNestedData(`slideshow.items.${index}.caption`, e.target.value)}
                className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mt-2"
              />
            )}
          </div>
        ))}
        <button
          onClick={() => {
            const newItems = [...(data.slideshow.items || []), { imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800', altText: 'New slide', caption: '' }];
            setNestedData('slideshow.items', newItems);
          }}
          className="w-full py-2 bg-editor-accent text-editor-bg rounded-md hover:bg-editor-accent/90 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Plus size={16} /> Add Slide
        </button>
      </div>
    )
  }

  const renderVideoControls = () => {
    if (!data?.video) return null;
    return (
      <div className="space-y-4">
        <Input label={t('editor.controls.common.title')} value={data.video.title} onChange={(e) => setNestedData('video.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.video.titleFontSize || 'md'} onChange={(v) => setNestedData('video.titleFontSize', v)} />

        <TextArea label={t('editor.controls.common.description')} value={data.video.description} onChange={(e) => setNestedData('video.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.video.descriptionFontSize || 'md'} onChange={(v) => setNestedData('video.descriptionFontSize', v)} />

        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Source</label>
          <select
            value={data.video.source}
            onChange={(e) => setNestedData('video.source', e.target.value)}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
          >
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
            <option value="upload">Direct URL</option>
          </select>
        </div>
        {data.video.source === 'upload' ? (
          <Input label="Video URL" value={data.video.videoUrl} onChange={(e) => setNestedData('video.videoUrl', e.target.value)} />
        ) : (
          <Input
            label={data.video.source === 'youtube' ? 'YouTube URL or Video ID' : 'Vimeo URL or Video ID'}
            value={data.video.videoId}
            onChange={(e) => setNestedData('video.videoId', extractVideoId(e.target.value, data.video.source))}
            placeholder={data.video.source === 'youtube' ? 'https://www.youtube.com/watch?v=... or dQw4w9WgXcQ' : 'https://vimeo.com/123456789 or 123456789'}
          />
        )}
        <div className="space-y-2">
          <ToggleControl label="Autoplay (Muted)" checked={data.video.autoplay} onChange={(v) => setNestedData('video.autoplay', v)} />
          <ToggleControl label={t('editor.controls.common.loop')} checked={data.video.loop} onChange={(v) => setNestedData('video.loop', v)} />
          <ToggleControl label={t('editor.controls.common.showControls')} checked={data.video.showControls} onChange={(v) => setNestedData('video.showControls', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data.video.paddingY || 'md'} onChange={(v) => setNestedData('video.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data.video.paddingX || 'md'} onChange={(v) => setNestedData('video.paddingX', v)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />
        <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider mb-2">Colors</label>
        <ColorControl label={t('editor.controls.common.background')} value={data.video.colors?.background} onChange={(v) => setNestedData('video.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.title')} value={data.video.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('video.colors.heading', v)} />
        <ColorControl label="Text" value={data.video.colors?.text} onChange={(v) => setNestedData('video.colors.text', v)} />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data.video.cornerGradient?.enabled || false}
          position={data.video.cornerGradient?.position || 'top-left'}
          color={data.video.cornerGradient?.color || '#4f46e5'}
          opacity={data.video.cornerGradient?.opacity || 30}
          size={data.video.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('video.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('video.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('video.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('video.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('video.cornerGradient.size', v)}
        />
      </div>
    )
  }

  const renderFooterControls = () => {
    if (!data?.footer) return null;

    return (
      <div className="space-y-4">
        {/* Logo Type Selector */}
        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Logo Type</label>
          <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
            {['text', 'image'].map(type => (
              <button
                key={type}
                onClick={() => setNestedData('footer.logoType', type)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${(data.footer.logoType || 'text') === type
                  ? 'bg-editor-accent text-editor-bg'
                  : 'text-editor-text-secondary hover:bg-editor-border'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Logo Image Upload - only shown when logoType is 'image' */}
        {data.footer.logoType === 'image' && (
          <ImagePicker
            label={t('editor.controls.common.logoImage')}
            value={data.footer.logoImageUrl || ''}
            onChange={(url) => setNestedData('footer.logoImageUrl', url)}
          />
        )}

        <Input label={t('editor.controls.common.title')} value={data.footer.title} onChange={(e) => setNestedData('footer.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.footer.titleFontSize || 'sm'} onChange={(v) => setNestedData('footer.titleFontSize', v)} />

        <TextArea label={t('editor.controls.common.description')} value={data.footer.description} onChange={(e) => setNestedData('footer.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.footer.descriptionFontSize || 'sm'} onChange={(v) => setNestedData('footer.descriptionFontSize', v)} />

        <Input label={t('editor.controls.common.copyright')} value={data.footer.copyrightText} onChange={(e) => setNestedData('footer.copyrightText', e.target.value)} />
        <div className="border-t border-editor-border/30 my-1" />
        <div className="space-y-4">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Link Columns</label>
          {(data.footer.linkColumns || []).map((col, colIndex) => (
            <div key={colIndex} className="bg-editor-bg p-3 rounded border border-editor-border space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <input placeholder="Column Title" value={col.title} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.title`, e.target.value)} className="bg-transparent border-b border-editor-border focus:border-editor-accent flex-1 text-sm font-bold text-editor-text-primary px-1 min-w-0 focus:outline-none" />
                <button onClick={() => {
                  const newCols = (data.footer.linkColumns || []).filter((_, i) => i !== colIndex);
                  setNestedData('footer.linkColumns', newCols);
                }} className="text-red-400 hover:text-red-500 flex-shrink-0 hover:bg-red-500/10 rounded p-1 transition-colors"><Trash2 size={14} /></button>
              </div>

              {/* Menu Selector per Column */}
              <select
                value={col.menuId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setNestedData(`footer.linkColumns.${colIndex}.menuId`, val === '' ? undefined : val);
                }}
                className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary mb-2"
              >
                <option value="">Manual Links</option>
                {menus.map(menu => (
                  <option key={menu.id} value={menu.id}>{menu.title}</option>
                ))}
              </select>

              {/* Conditional Link List */}
              {col.menuId ? (
                <p className="text-[10px] text-editor-text-secondary italic">Using links from menu: {menus.find(m => m.id === col.menuId)?.title}</p>
              ) : (
                <>
                  {(col.links || []).map((link, linkIndex) => (
                    <div key={linkIndex} className="flex gap-2 items-center mb-1">
                      <input placeholder="Text" value={link.text} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.text`, e.target.value)} className="flex-1 bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary min-w-0 focus:outline-none focus:ring-1 focus:ring-editor-accent" />
                      <input placeholder="Href" value={link.href} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.href`, e.target.value)} className="flex-1 bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary min-w-0 focus:outline-none focus:ring-1 focus:ring-editor-accent" />
                      <button onClick={() => {
                        const newLinks = (col.links || []).filter((_, i) => i !== linkIndex);
                        setNestedData(`footer.linkColumns.${colIndex}.links`, newLinks);
                      }} className="text-editor-text-secondary hover:text-red-400 flex-shrink-0"><Trash2 size={12} /></button>
                    </div>
                  ))}
                  <button onClick={() => {
                    const newLinks = [...(col.links || []), { text: 'New Link', href: '#' }];
                    setNestedData(`footer.linkColumns.${colIndex}.links`, newLinks);
                  }} className="text-xs text-editor-accent hover:underline mt-1">+ Add Link</button>
                </>
              )}
            </div>
          ))}
          <button onClick={() => setNestedData('footer.linkColumns', [...(data.footer.linkColumns || []), { title: 'New Column', links: [] }])} className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"><Plus size={14} /> Add Column</button>
        </div>
        <SocialLinksEditor
          socialLinks={data.footer.socialLinks}
          onUpdate={(newLinks) => setNestedData('footer.socialLinks', newLinks)}
          onUpdateHref={(index, href) => setNestedData(`footer.socialLinks.${index}.href`, href)}
        />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Contact Information */}
        <div className="space-y-4">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
            <MapPin size={14} className="text-editor-accent" />
            Contact Information
          </label>
          <Input
            label={t('editor.controls.common.address')}
            value={data.footer.contactInfo?.address || ''}
            onChange={(e) => setNestedData('footer.contactInfo.address', e.target.value)}
            placeholder="123 Main Street"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label={t('editor.controls.common.city')}
              value={data.footer.contactInfo?.city || ''}
              onChange={(e) => setNestedData('footer.contactInfo.city', e.target.value)}
              placeholder="City"
            />
            <Input
              label={t('editor.controls.common.state')}
              value={data.footer.contactInfo?.state || ''}
              onChange={(e) => setNestedData('footer.contactInfo.state', e.target.value)}
              placeholder="State"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label={t('editor.controls.common.zipCode')}
              value={data.footer.contactInfo?.zipCode || ''}
              onChange={(e) => setNestedData('footer.contactInfo.zipCode', e.target.value)}
              placeholder="12345"
            />
            <Input
              label={t('editor.controls.common.country')}
              value={data.footer.contactInfo?.country || ''}
              onChange={(e) => setNestedData('footer.contactInfo.country', e.target.value)}
              placeholder="Country"
            />
          </div>
          <Input
            label={t('editor.controls.common.phone')}
            value={data.footer.contactInfo?.phone || ''}
            onChange={(e) => setNestedData('footer.contactInfo.phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
          <Input
            label={t('editor.controls.common.email')}
            value={data.footer.contactInfo?.email || ''}
            onChange={(e) => setNestedData('footer.contactInfo.email', e.target.value)}
            placeholder="contact@example.com"
          />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Business Hours */}
        <div className="space-y-4">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
            <Clock size={14} className="text-editor-accent" />
            Business Hours
          </label>

          {/* Quick copy buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                const businessHours = data.footer.contactInfo?.businessHours || {};
                const monHours = businessHours.monday || { isOpen: true, openTime: '09:00', closeTime: '17:00' };
                const newHours: any = {};
                ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                  newHours[day] = { ...monHours };
                });
                setNestedData('footer.contactInfo.businessHours', { ...businessHours, ...newHours });
              }}
              className="text-xs px-2 py-1 bg-editor-accent/20 text-editor-accent rounded hover:bg-editor-accent/30 transition-colors"
            >
              Copy Mon → Weekdays
            </button>
            <button
              onClick={() => {
                const businessHours = data.footer.contactInfo?.businessHours || {};
                const monHours = businessHours.monday || { isOpen: true, openTime: '09:00', closeTime: '17:00' };
                const newHours: any = {};
                ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
                  newHours[day] = { ...monHours };
                });
                setNestedData('footer.contactInfo.businessHours', newHours);
              }}
              className="text-xs px-2 py-1 bg-editor-accent/20 text-editor-accent rounded hover:bg-editor-accent/30 transition-colors"
            >
              Copy Mon → All Days
            </button>
          </div>

          {/* Days */}
          <div className="space-y-2 bg-editor-bg p-3 rounded-lg border border-editor-border">
            {[
              { key: 'monday', label: 'Mon' },
              { key: 'tuesday', label: 'Tue' },
              { key: 'wednesday', label: 'Wed' },
              { key: 'thursday', label: 'Thu' },
              { key: 'friday', label: 'Fri' },
              { key: 'saturday', label: 'Sat' },
              { key: 'sunday', label: 'Sun' },
            ].map(({ key, label }) => {
              // Safer access to potentially undefined nested objects
              const contactInfo = data.footer.contactInfo || {};
              const businessHours = contactInfo.businessHours || {};
              const dayHours = businessHours[key as keyof typeof businessHours] || { isOpen: false, openTime: '09:00', closeTime: '17:00' };

              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-10 text-xs font-medium text-editor-text-secondary">{label}</span>
                  <button
                    onClick={() => {
                      // When toggling, we need to handle the case where contactInfo or businessHours don't exist yet
                      if (!dayHours.isOpen) {
                        // Turning ON: Set the full object to ensure structure exists
                        setNestedData(`footer.contactInfo.businessHours.${key}`, {
                          isOpen: true,
                          openTime: dayHours.openTime || '09:00',
                          closeTime: dayHours.closeTime || '17:00'
                        });
                      } else {
                        // Turning OFF: Just update the flag
                        setNestedData(`footer.contactInfo.businessHours.${key}.isOpen`, false);
                      }
                    }}
                    className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${dayHours.isOpen ? 'bg-green-500' : 'bg-editor-border'
                      }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${dayHours.isOpen ? 'left-5' : 'left-0.5'
                        }`}
                    />
                  </button>
                  {dayHours.isOpen ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="time"
                        value={dayHours.openTime || '09:00'}
                        onChange={(e) => setNestedData(`footer.contactInfo.businessHours.${key}.openTime`, e.target.value)}
                        className="w-[90px] bg-editor-panel-bg border border-editor-border rounded px-1.5 py-0.5 text-xs text-editor-text-primary"
                      />
                      <span className="text-editor-text-secondary text-xs">-</span>
                      <input
                        type="time"
                        value={dayHours.closeTime || '17:00'}
                        onChange={(e) => setNestedData(`footer.contactInfo.businessHours.${key}.closeTime`, e.target.value)}
                        className="w-[90px] bg-editor-panel-bg border border-editor-border rounded px-1.5 py-0.5 text-xs text-editor-text-primary"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-editor-text-secondary italic">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />
        <div className="space-y-2">
          <ColorControl label={t('editor.controls.common.background')} value={data.footer.colors?.background} onChange={(v) => setNestedData('footer.colors.background', v)} />
          <ColorControl label={t('editor.controls.common.title')} value={data.footer.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('footer.colors.heading', v)} />
          <ColorControl label="Text" value={data.footer.colors?.text} onChange={(v) => setNestedData('footer.colors.text', v)} />
        </div>
      </div>
    );
  }

  // Map section IDs to Icons and Renderers
  // Helper to get section label
  const getSectionLabel = (section: PageSection): string => {
    const labels: Record<PageSection, string> = {
      hero: 'Hero Section',
      heroSplit: 'Hero Split',
      features: 'Features',
      testimonials: 'Testimonials',
      services: 'Services',
      team: 'Team',
      pricing: 'Pricing',
      faq: 'FAQ',
      portfolio: 'Portfolio',
      leads: 'Lead Form',
      newsletter: 'Newsletter',
      cta: 'Call to Action',
      slideshow: 'Slideshow',
      video: 'Video',
      howItWorks: 'How It Works',
      map: 'Location Map',
      menu: 'Restaurant Menu',
      chatbot: 'AI Chatbot',
      footer: 'Footer',
      header: 'Navigation',
      typography: 'Typography',
      colors: 'Global Colors',
      banner: 'Banner',
      products: 'Products Grid',
      storeSettings: 'Store Settings',
      // Ecommerce sections
      featuredProducts: 'Featured Products',
      categoryGrid: 'Category Grid',
      productHero: 'Product Hero',
      saleCountdown: 'Sale Countdown',
      trustBadges: 'Trust Badges',
      recentlyViewed: 'Recently Viewed',
      productReviews: 'Product Reviews',
      collectionBanner: 'Collection Banner',
      productBundle: 'Product Bundle',
      announcementBar: 'Announcement Bar',
    };
    return labels[section] || section;
  };

  // Function to geocode address - uses Google Maps client Geocoder or Nominatim fallback
  const geocodeAddress = async () => {
    const address = data?.map?.address;
    if (!address || address.trim() === '') {
      setGeocodeError('Please enter an address first');
      return;
    }

    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      // Method 1: Try using Google Maps client Geocoder if available
      if (typeof window !== 'undefined' && window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();

        geocoder.geocode({ address }, (results, status) => {
          setIsGeocoding(false);

          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            const lat = location.lat();
            const lng = location.lng();
            setNestedData('map.lat', lat);
            setNestedData('map.lng', lng);
            setGeocodeError(null);
          } else if (status === 'ZERO_RESULTS') {
            setGeocodeError('Location not found. Try a more specific address.');
          } else {
            // Fallback to Nominatim if Google fails
            geocodeWithNominatim(address);
          }
        });
        return;
      }

      // Method 2: Fallback to Nominatim (OpenStreetMap) - free and no API key needed
      await geocodeWithNominatim(address);

    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodeError('Error searching location. Please try again.');
      setIsGeocoding(false);
    }
  };

  // Helper function for Nominatim geocoding (OpenStreetMap - free)
  const geocodeWithNominatim = async (address: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'QuimeraAI/1.0'
          }
        }
      );
      const results = await response.json();

      if (results && results.length > 0) {
        const { lat, lon } = results[0];
        setNestedData('map.lat', parseFloat(lat));
        setNestedData('map.lng', parseFloat(lon));
        setGeocodeError(null);
      } else {
        setGeocodeError('Location not found. Try a more specific address.');
      }
    } catch (error) {
      console.error('Nominatim geocoding error:', error);
      setGeocodeError('Error searching location. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const renderMapControls = () => {
    const contentTab = (
      <div className="space-y-4">
        <Input label={t('editor.controls.common.title')} value={data?.map.title} onChange={(e) => setNestedData('map.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.map.titleFontSize || 'md'} onChange={(v) => setNestedData('map.titleFontSize', v)} />

        <TextArea label={t('editor.controls.common.description')} value={data?.map.description} onChange={(e) => setNestedData('map.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.map.descriptionFontSize || 'md'} onChange={(v) => setNestedData('map.descriptionFontSize', v)} />

        <div className="border-t border-editor-border/30 my-1" />

        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <MapPin size={14} />
          Location
        </label>

        {/* Address input with search button */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Address</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={data?.map.address || ''}
              onChange={(e) => setNestedData('map.address', e.target.value)}
              placeholder="e.g. 123 Main St, City, Country"
              className="flex-1 bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent transition-all placeholder:text-editor-text-secondary/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  geocodeAddress();
                }
              }}
            />
            <button
              onClick={geocodeAddress}
              disabled={isGeocoding}
              className="px-3 py-2 bg-editor-accent text-white rounded-md hover:bg-editor-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
              title="Search location"
            >
              {isGeocoding ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              <span className="text-xs font-medium">Find</span>
            </button>
          </div>

          {/* Error message */}
          {geocodeError && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              {geocodeError}
            </p>
          )}

          {/* Success indicator when coordinates are set */}
          {data?.map.lat && data?.map.lng && !geocodeError && (
            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
              <MapPin size={12} />
              Location set: {data.map.lat.toFixed(4)}, {data.map.lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* Manual coordinate inputs (collapsible) */}
        <details className="mt-3">
          <summary className="text-xs font-medium text-editor-text-secondary cursor-pointer hover:text-editor-text-primary transition-colors">
            Manual coordinates (advanced)
          </summary>
          <div className="grid grid-cols-2 gap-3 mt-2 pl-2 border-l-2 border-editor-border">
            <Input label="Latitude" type="number" step="0.0001" value={data?.map.lat} onChange={(e) => setNestedData('map.lat', parseFloat(e.target.value))} />
            <Input label="Longitude" type="number" step="0.0001" value={data?.map.lng} onChange={(e) => setNestedData('map.lng', parseFloat(e.target.value))} />
          </div>
        </details>

        <div className="mt-2">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Zoom Level: {data?.map.zoom}</label>
          <input
            type="range" min="1" max="20"
            value={data?.map.zoom || 14}
            onChange={(e) => setNestedData('map.zoom', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="map" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Map Variant */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <Select
            label={t('editor.controls.common.mapStyle')}
            value={data?.map.mapVariant || 'modern'}
            onChange={(v) => setNestedData('map.mapVariant', v)}
            options={[
              { value: 'modern', label: '🏢 Modern Split - Info card + map' },
              { value: 'minimal', label: '✨ Minimal - Clean with badge' },
              { value: 'dark-tech', label: '🌃 Dark Tech - Tech overlay' },
              { value: 'night', label: '🌙 Night Bar - Bottom info bar' }
            ]}
          />
        </div>

        {/* Map Height */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Map Height</label>
            <span className="text-xs text-editor-text-primary">{data?.map.height || 400}px</span>
          </div>
          <input
            type="range" min="200" max="800" step="50"
            value={data?.map.height || 400}
            onChange={(e) => setNestedData('map.height', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>

        {/* Spacing */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Settings size={14} />
            Spacing
          </label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data?.map.paddingY || 'md'} onChange={(v) => setNestedData('map.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data?.map.paddingX || 'md'} onChange={(v) => setNestedData('map.paddingX', v)} />
          </div>
        </div>

        {/* Section Colors */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Palette size={14} />
            Colors
          </label>
          <ColorControl label={t('editor.controls.common.background')} value={data?.map.colors?.background || '#0f172a'} onChange={(v) => setNestedData('map.colors.background', v)} />
          <ColorControl label={t('editor.controls.common.title')} value={data?.map.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('map.colors.heading', v)} />
          <ColorControl label="Text" value={data?.map.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('map.colors.text', v)} />
          <ColorControl label="Marker/Accent" value={data?.map.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('map.colors.accent', v)} />
          {(data?.map.mapVariant === 'modern' || data?.map.mapVariant === 'card-overlay') && (
            <ColorControl label="Card Background" value={data?.map.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('map.colors.cardBackground', v)} />
          )}

          <div className="border-t border-editor-border/30 my-1" />

          {/* Corner Gradient */}
          <CornerGradientControl
            enabled={data?.map?.cornerGradient?.enabled || false}
            position={data?.map?.cornerGradient?.position || 'top-left'}
            color={data?.map?.cornerGradient?.color || '#4f46e5'}
            opacity={data?.map?.cornerGradient?.opacity || 30}
            size={data?.map?.cornerGradient?.size || 50}
            onEnabledChange={(v) => setNestedData('map.cornerGradient.enabled', v)}
            onPositionChange={(v) => setNestedData('map.cornerGradient.position', v)}
            onColorChange={(v) => setNestedData('map.cornerGradient.color', v)}
            onOpacityChange={(v) => setNestedData('map.cornerGradient.opacity', v)}
            onSizeChange={(v) => setNestedData('map.cornerGradient.size', v)}
          />
        </div>
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // ========== HERO SPLIT CONTROLS ==========
  const renderHeroSplitControls = () => {
    if (!data?.heroSplit) return null;

    const contentTab = (
      <div className="space-y-4">
        {/* Content Section */}
        <div>
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Type size={14} />
            {t('controls.content')}
          </label>

          <AIFormControl label={t('controls.headline')} onAssistClick={() => setAiAssistField({ path: 'heroSplit.headline', value: data.heroSplit.headline, context: 'Hero Split Headline' })}>
            <TextArea value={data.heroSplit.headline} onChange={(e) => setNestedData('heroSplit.headline', e.target.value)} rows={2} />
          </AIFormControl>
          <FontSizeSelector label={t('controls.headlineSize')} value={data.heroSplit.headlineFontSize || 'lg'} onChange={(v) => setNestedData('heroSplit.headlineFontSize', v)} />

          <AIFormControl label={t('controls.subheadline')} onAssistClick={() => setAiAssistField({ path: 'heroSplit.subheadline', value: data.heroSplit.subheadline, context: 'Hero Split Description' })}>
            <TextArea value={data.heroSplit.subheadline} onChange={(e) => setNestedData('heroSplit.subheadline', e.target.value)} rows={3} />
          </AIFormControl>
          <FontSizeSelector label={t('controls.subheadlineSize')} value={data.heroSplit.subheadlineFontSize || 'md'} onChange={(v) => setNestedData('heroSplit.subheadlineFontSize', v)} />

          <Input label={t('editor.controls.common.buttonText')} value={data.heroSplit.buttonText} onChange={(e) => setNestedData('heroSplit.buttonText', e.target.value)} />

          {/* Link Type Selector */}
          <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Link Type</label>
            <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
              {[
                { value: 'manual', label: 'Manual URL' },
                { value: 'product', label: 'Product' },
                { value: 'collection', label: 'Collection' },
                { value: 'content', label: 'Contenido' }
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setNestedData('heroSplit.linkType', type.value)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(data.heroSplit.linkType || 'manual') === type.value
                    ? 'bg-editor-accent text-editor-bg'
                    : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Inputs based on Link Type */}
          {(data.heroSplit.linkType === 'manual' || !data.heroSplit.linkType) && (
            <Input label={t('editor.controls.common.url')} value={data.heroSplit.buttonUrl || '#cta'} onChange={(e) => setNestedData('heroSplit.buttonUrl', e.target.value)} />
          )}

          {data.heroSplit.linkType === 'product' && (
            <SingleProductSelector
              storeId={activeProject?.id || ''}
              selectedProductId={data.heroSplit.buttonUrl?.startsWith('/product/') ? data.heroSplit.buttonUrl.split('/product/')[1] : undefined}
              onSelect={(id) => {
                if (id) {
                  setNestedData('heroSplit.buttonUrl', `/product/${id}`);
                } else {
                  setNestedData('heroSplit.buttonUrl', '');
                }
              }}
              label={t('editor.controls.common.selectProduct')}
            />
          )}

          {data.heroSplit.linkType === 'collection' && (
            <SingleCollectionSelector
              storeId={activeProject?.id || ''}
              gridCategories={data.categoryGrid?.categories || []}
              selectedCollectionId={data.heroSplit.collectionId}
              onSelect={(id) => {
                setNestedData('heroSplit.collectionId', id || null);
                if (id) {
                  // For heroSplit, we'll likely want to use the buttonUrl for navigation, 
                  // but if it supports collectionId internally like Banner, we clear buttonUrl.
                  // Assuming standardization: 
                  setNestedData('heroSplit.buttonUrl', '');
                }
              }}
              label={t('editor.controls.common.selectCollection')}
            />
          )}
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Image */}
        <div>
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Image size={14} />
            Image
          </label>
          <ImagePicker label={t('editor.controls.hero.image')} value={data.heroSplit.imageUrl} onChange={(url) => setNestedData('heroSplit.imageUrl', url)} />
        </div>
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="heroSplit" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Layout */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Layout size={14} />
            Layout
          </label>

          {/* Image Position Toggle */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-editor-text-secondary mb-2">Image Position</label>
            <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
              {['left', 'right'].map(pos => (
                <button
                  key={pos}
                  onClick={() => setNestedData('heroSplit.imagePosition', pos)}
                  className={`flex-1 py-2 text-sm font-medium rounded-sm capitalize ${data.heroSplit.imagePosition === pos
                    ? 'bg-editor-accent text-editor-bg'
                    : 'text-editor-text-secondary hover:bg-editor-border'
                    }`}
                >
                  {pos === 'left' ? '← Image Left' : 'Image Right →'}
                </button>
              ))}
            </div>
            <p className="text-xs text-editor-text-secondary mt-1 italic">
              Switch between image on left or right side
            </p>
          </div>

          {/* Max Height */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-editor-text-secondary">Max Height</label>
              <span className="text-xs text-editor-text-primary">{data.heroSplit.maxHeight || 500}px</span>
            </div>
            <input
              type="range" min="300" max="800" step="50"
              value={data.heroSplit.maxHeight || 500}
              onChange={(e) => setNestedData('heroSplit.maxHeight', parseInt(e.target.value))}
              className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
          </div>

          {/* Angle Intensity */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-editor-text-secondary">Angle Intensity</label>
              <span className="text-xs text-editor-text-primary">{data.heroSplit.angleIntensity || 15}%</span>
            </div>
            <input
              type="range" min="0" max="30" step="5"
              value={data.heroSplit.angleIntensity || 15}
              onChange={(e) => setNestedData('heroSplit.angleIntensity', parseInt(e.target.value))}
              className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
            <p className="text-xs text-editor-text-secondary mt-1 italic">
              0 = straight line, higher = more diagonal
            </p>
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Colors */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Palette size={14} />
            Colors
          </label>

          <div className="space-y-3">
            <ColorControl label="Text Side Background" value={data.heroSplit.colors?.textBackground || '#ffffff'} onChange={(v) => setNestedData('heroSplit.colors.textBackground', v)} />
            <ColorControl label="Image Side Background" value={data.heroSplit.colors?.imageBackground || '#000000'} onChange={(v) => setNestedData('heroSplit.colors.imageBackground', v)} />

            <div className="border-t border-editor-border/30 my-1" />

            <ColorControl label="Headline Color" value={data.heroSplit.colors?.heading || '#111827'} onChange={(v) => setNestedData('heroSplit.colors.heading', v)} />
            <ColorControl label="Text Color" value={data.heroSplit.colors?.text || '#4b5563'} onChange={(v) => setNestedData('heroSplit.colors.text', v)} />

            <div className="border-t border-editor-border/30 my-1" />
            <p className="text-[10px] text-editor-text-secondary uppercase tracking-wider font-bold">Button</p>

            <ColorControl label="Button Background" value={data.heroSplit.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('heroSplit.colors.buttonBackground', v)} />
            <ColorControl label={t('editor.controls.common.buttonText')} value={data.heroSplit.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('heroSplit.colors.buttonText', v)} />

            <BorderRadiusSelector label="Button Corners" value={data.heroSplit.buttonBorderRadius || 'xl'} onChange={(v) => setNestedData('heroSplit.buttonBorderRadius', v)} />

            <div className="border-t border-editor-border/30 my-1" />

            {/* Corner Gradient */}
            <CornerGradientControl
              enabled={data.heroSplit.cornerGradient?.enabled || false}
              position={data.heroSplit.cornerGradient?.position || 'top-left'}
              color={data.heroSplit.cornerGradient?.color || '#4f46e5'}
              opacity={data.heroSplit.cornerGradient?.opacity || 30}
              size={data.heroSplit.cornerGradient?.size || 50}
              onEnabledChange={(v) => setNestedData('heroSplit.cornerGradient.enabled', v)}
              onPositionChange={(v) => setNestedData('heroSplit.cornerGradient.position', v)}
              onColorChange={(v) => setNestedData('heroSplit.cornerGradient.color', v)}
              onOpacityChange={(v) => setNestedData('heroSplit.cornerGradient.opacity', v)}
              onSizeChange={(v) => setNestedData('heroSplit.cornerGradient.size', v)}
            />
          </div>
        </div>
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  const sectionConfig: Record<PageSection, { label: string, icon: React.ElementType, renderer: () => React.ReactNode }> = {
    hero: { label: 'Hero Section', icon: Image, renderer: renderHeroControls },
    heroSplit: { label: 'Hero Split', icon: Columns, renderer: renderHeroSplitControls },
    features: { label: 'Features', icon: List, renderer: renderFeaturesControls },
    testimonials: { label: 'Testimonials', icon: Star, renderer: renderTestimonialsControls },
    services: { label: 'Services', icon: Layout, renderer: () => null },
    team: { label: 'Team', icon: Users, renderer: () => null },
    pricing: { label: 'Pricing', icon: DollarSign, renderer: renderPricingControls },
    faq: { label: 'FAQ', icon: HelpCircle, renderer: () => null },
    portfolio: { label: 'Portfolio', icon: Briefcase, renderer: () => null },
    leads: { label: 'Lead Form', icon: Mail, renderer: () => null },
    newsletter: { label: 'Newsletter', icon: Send, renderer: () => null },
    cta: { label: 'Call to Action', icon: MessageCircle, renderer: () => null },
    slideshow: { label: 'Slideshow', icon: PlaySquare, renderer: renderSlideshowControls },
    video: { label: 'Video', icon: MonitorPlay, renderer: renderVideoControls },
    howItWorks: { label: 'How It Works', icon: Grid, renderer: () => null },
    map: { label: 'Map', icon: MapIcon, renderer: renderMapControls },
    menu: { label: 'Restaurant Menu', icon: MenuIcon, renderer: () => null },
    // chatbot removed - deprecated, now using AI Assistant Dashboard
    footer: { label: 'Footer', icon: Type, renderer: renderFooterControls },
    header: { label: 'Navigation Bar', icon: AlignJustify, renderer: renderHeaderControls },
    colors: { label: 'Colores', icon: Palette, renderer: () => <GlobalStylesControl mode="colors" /> },
    typography: { label: 'Tipografía', icon: Type, renderer: () => <GlobalStylesControl mode="typography" /> },
    banner: { label: 'Banner', icon: Image, renderer: () => null },
    products: { label: 'Products', icon: ShoppingBag, renderer: () => null },
    storeSettings: { label: 'Store Settings', icon: Store, renderer: () => null },
    // Ecommerce section components - use separate controls file

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
  };

  if (!data) return null;

  const sortableSections = effectiveComponentOrder.filter(k => k !== 'footer' && componentStatus[k as PageSection]);

  // Get available components to add - users can add any component multiple times
  // Only colors, typography and footer are restricted (one instance each)
  const availableComponentsToAdd = (Object.keys(sectionConfig) as PageSection[]).filter(
    section => componentStatus[section] && section !== 'typography' && section !== 'footer' && section !== 'colors'
  );

  const handleAddComponent = (section: PageSection) => {
    // Add component to the order (before footer)
    const newOrder = [...effectiveComponentOrder.filter(k => k !== 'footer'), section, 'footer' as PageSection];

    // Update active page sections if we have an active page
    if (activePage) {
      updatePage(activePage.id, { sections: newOrder });
    }
    // Always update both ProjectContext and EditorContext componentOrder
    // LandingPage reads from EditorContext in editor mode
    setComponentOrder(newOrder as PageSection[]);
    setEditorComponentOrder(newOrder as PageSection[]);

    // Apply global default styles if available (merging on top of existing data to preserve content but update style)
    if (componentStyles && componentStyles[section]) {
      const globalDefault = componentStyles[section];
      // We merge globalDefault into the existing section data
      // This ensures new/re-added components pick up the latest style choices (e.g. Bento Grid)
      // while hopefully preserving user content if it exists.
      // Note: setNestedData merges at the path, but here we want to merge properties of the section object.

      // We need to use setData directly for this merge to be clean
      setData(prevData => {
        if (!prevData) return null;
        const newData = JSON.parse(JSON.stringify(prevData));

        // Merge global defaults deeply into the section data
        // We prioritize global defaults for style properties, but we should be careful not to overwrite content.
        // Actually, componentStyles usually only contains style props (colors, padding, variants), not content.
        // So merging componentStyles[section] on top of newData[section] updates the style.
        newData[section] = {
          ...newData[section],
          ...globalDefault,
          colors: {
            ...newData[section]?.colors,
            ...globalDefault.colors
          }
        };

        return newData;
      });
    }

    // Make it visible
    setSectionVisibility(prev => ({
      ...prev,
      [section]: true
    }));

    // Close the dropdown
    setIsAddComponentOpen(false);

    // Select the newly added component
    onSectionSelect(section as any);
  };

  const handleRemoveComponent = (section: PageSection) => {
    // Remove component from the order
    const newOrder = effectiveComponentOrder.filter(k => k !== section);

    // Update active page sections if we have an active page
    if (activePage) {
      updatePage(activePage.id, { sections: newOrder });
    }
    // Always update both contexts for immediate preview sync
    setComponentOrder(newOrder);
    setEditorComponentOrder(newOrder);

    // Hide it
    setSectionVisibility(prev => ({
      ...prev,
      [section]: false
    }));

    // If it was selected, deselect
    if (activeSection === section) {
      onSectionSelect(null as any);
    }
  };

  // Organize controls for specific sections into tabs
  const renderHeroControlsWithTabs = () => {
    if (!data?.hero) return null;
    const currentVariant = data.hero.heroVariant || 'classic';

    const contentTab = (
      <div className="space-y-4">
        {/* Content */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Type size={14} />
            {t('controls.content')}
          </label>

          <AIFormControl label={t('controls.headline')} onAssistClick={() => setAiAssistField({ path: 'hero.headline', value: data.hero.headline, context: 'Hero Headline' })}>
            <TextArea value={data.hero.headline} onChange={(e) => setNestedData('hero.headline', e.target.value)} rows={2} />
          </AIFormControl>
          <FontSizeSelector label={t('controls.headlineSize')} value={data.hero.headlineFontSize || 'lg'} onChange={(v) => setNestedData('hero.headlineFontSize', v)} />

          <AIFormControl label={t('controls.subheadline')} onAssistClick={() => setAiAssistField({ path: 'hero.subheadline', value: data.hero.subheadline, context: 'Hero Subheadline' })}>
            <TextArea value={data.hero.subheadline} onChange={(e) => setNestedData('hero.subheadline', e.target.value)} rows={3} />
          </AIFormControl>
          <FontSizeSelector label={t('controls.subheadlineSize')} value={data.hero.subheadlineFontSize || 'lg'} onChange={(v) => setNestedData('hero.subheadlineFontSize', v)} />

          <div className="grid grid-cols-2 gap-4">
            <Input label={t('controls.primaryCTA')} value={data.hero.primaryCta} onChange={(e) => setNestedData('hero.primaryCta', e.target.value)} />
            <Input label={t('controls.secondaryCTA')} value={data.hero.secondaryCta} onChange={(e) => setNestedData('hero.secondaryCta', e.target.value)} />
          </div>
        </div>

        {/* Logo / Headline Image — optional override */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Image size={14} />
            Logo / Imagen del Título (opcional)
          </label>
          <p className="text-xs text-editor-text-secondary mb-3">Si subes una imagen, se mostrará en lugar del texto del título.</p>
          <ImagePicker
            label="Logo del Título"
            value={data.hero.headlineImageUrl || ''}
            onChange={(url) => setNestedData('hero.headlineImageUrl', url)}
          />
          {data.hero.headlineImageUrl && (
            <button
              onClick={() => setNestedData('hero.headlineImageUrl', '')}
              className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
            >
              Quitar imagen y usar texto
            </button>
          )}
        </div>

        {/* Primary CTA Link */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Link size={14} />
            Enlace Botón Principal
          </label>

          {/* Link Type Selector */}
          <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border mb-3">
            {[
              { value: 'section', label: 'Sección' },
              { value: 'product', label: 'Producto' },
              { value: 'collection', label: 'Colección' },
              { value: 'content', label: 'Contenido' },
              { value: 'manual', label: 'URL' },
            ].map(type => (
              <button
                key={type.value}
                onClick={() => {
                  setNestedData('hero.primaryCtaLinkType', type.value);
                  if (type.value === 'section') {
                    setNestedData('hero.primaryCtaLink', '#cta');
                  } else if (type.value !== 'manual') {
                    setNestedData('hero.primaryCtaLink', '');
                  }
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors ${(data.hero.primaryCtaLinkType || 'section') === type.value
                  ? 'bg-editor-accent text-editor-bg'
                  : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                  }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Section Selector */}
          {(data.hero.primaryCtaLinkType || 'section') === 'section' && (
            <div>
              <select
                value={data.hero.primaryCtaLink || '/#cta'}
                onChange={(e) => setNestedData('hero.primaryCtaLink', e.target.value)}
                className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
              >
                <option value="/">Inicio</option>
                <option value="/#features">Features</option>
                <option value="/#services">Services</option>
                <option value="/#pricing">Pricing</option>
                <option value="/#testimonials">Testimonials</option>
                <option value="/#team">Team</option>
                <option value="/#faq">FAQ</option>
                <option value="/#contact">Contact</option>
                <option value="/#cta">CTA</option>
                <option value="/#portfolio">Portfolio</option>
                <option value="/#heroSplit">Hero Split</option>
                <option value="/#leads">Leads</option>
                <option value="/#newsletter">Newsletter</option>
                <option value="/#howItWorks">How It Works</option>
                <option value="/#video">Video</option>
                <option value="/#slideshow">Slideshow</option>
                <option value="/#map">Map</option>
                <option value="/#menu">Menu</option>
                <option value="/#banner">Banner</option>
                <option value="/#products">Products</option>
                <option value="/tienda">Tienda</option>
              </select>
            </div>
          )}

          {/* Manual URL Input */}
          {data.hero.primaryCtaLinkType === 'manual' && (
            <Input
              label=""
              value={data.hero.primaryCtaLink || ''}
              onChange={(e) => setNestedData('hero.primaryCtaLink', e.target.value)}
              placeholder="https://... o /pagina"
              className="mb-0"
            />
          )}

          {/* Product Picker */}
          {data.hero.primaryCtaLinkType === 'product' && (
            <SingleProductSelector
              storeId={activeProject?.id || ''}
              selectedProductId={data.hero.primaryCtaLink && (data.hero.primaryCtaLink.includes('/tienda/producto/') || data.hero.primaryCtaLink.includes('product/'))
                ? data.hero.primaryCtaLink.split('/').pop()
                : undefined}
              onSelect={(id) => {
                if (id) {
                  setNestedData('hero.primaryCtaLink', `/product/${id}`);
                } else {
                  setNestedData('hero.primaryCtaLink', '');
                }
              }}
              label={t('editor.controls.common.selectProduct')}
            />
          )}

          {/* Collection Picker */}
          {data.hero.primaryCtaLinkType === 'collection' && (
            <SingleCollectionSelector
              storeId={activeProject?.id || ''}
              gridCategories={data.categoryGrid?.categories || []}
              selectedCollectionId={data.hero.primaryCtaLink && (data.hero.primaryCtaLink.includes('/tienda/categoria/') || data.hero.primaryCtaLink.includes('category/'))
                ? data.hero.primaryCtaLink.split('/').pop()
                : undefined}
              onSelect={(id) => {
                if (id) {
                  setNestedData('hero.primaryCtaLink', `/collection/${id}`);
                } else {
                  setNestedData('hero.primaryCtaLink', '');
                }
              }}
              label="Seleccionar Colección"
            />
          )}

          {/* Content Picker */}
          {data.hero.primaryCtaLinkType === 'content' && (
            <SingleContentSelector
              selectedContentPath={data.hero.primaryCtaLink}
              onSelect={(path) => {
                setNestedData('hero.primaryCtaLink', path || '');
              }}
              label={t('editor.controls.common.selectContent')}
            />
          )}
        </div>

        {/* Secondary CTA Link */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Link size={14} />
            Enlace Botón Secundario
          </label>

          {/* Link Type Selector */}
          <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border mb-3">
            {[
              { value: 'section', label: 'Sección' },
              { value: 'product', label: 'Producto' },
              { value: 'collection', label: 'Colección' },
              { value: 'content', label: 'Contenido' },
              { value: 'manual', label: 'URL' },
            ].map(type => (
              <button
                key={type.value}
                onClick={() => {
                  setNestedData('hero.secondaryCtaLinkType', type.value);
                  if (type.value === 'section') {
                    setNestedData('hero.secondaryCtaLink', '#features');
                  } else if (type.value !== 'manual') {
                    setNestedData('hero.secondaryCtaLink', '');
                  }
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors ${(data.hero.secondaryCtaLinkType || 'section') === type.value
                  ? 'bg-editor-accent text-editor-bg'
                  : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                  }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Section Selector */}
          {(data.hero.secondaryCtaLinkType || 'section') === 'section' && (
            <div>
              <select
                value={data.hero.secondaryCtaLink || '/#features'}
                onChange={(e) => setNestedData('hero.secondaryCtaLink', e.target.value)}
                className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
              >
                <option value="/">Inicio</option>
                <option value="/#features">Features</option>
                <option value="/#services">Services</option>
                <option value="/#pricing">Pricing</option>
                <option value="/#testimonials">Testimonials</option>
                <option value="/#team">Team</option>
                <option value="/#faq">FAQ</option>
                <option value="/#contact">Contact</option>
                <option value="/#cta">CTA</option>
                <option value="/#portfolio">Portfolio</option>
                <option value="/#heroSplit">Hero Split</option>
                <option value="/#leads">Leads</option>
                <option value="/#newsletter">Newsletter</option>
                <option value="/#howItWorks">How It Works</option>
                <option value="/#video">Video</option>
                <option value="/#slideshow">Slideshow</option>
                <option value="/#map">Map</option>
                <option value="/#menu">Menu</option>
                <option value="/#banner">Banner</option>
                <option value="/#products">Products</option>
                <option value="/tienda">Tienda</option>
              </select>
            </div>
          )}

          {/* Manual URL Input */}
          {data.hero.secondaryCtaLinkType === 'manual' && (
            <Input
              label=""
              value={data.hero.secondaryCtaLink || ''}
              onChange={(e) => setNestedData('hero.secondaryCtaLink', e.target.value)}
              placeholder="https://... o /pagina"
              className="mb-0"
            />
          )}

          {/* Product Picker */}
          {data.hero.secondaryCtaLinkType === 'product' && (
            <SingleProductSelector
              storeId={activeProject?.id || ''}
              selectedProductId={data.hero.secondaryCtaLink && (data.hero.secondaryCtaLink.includes('/tienda/producto/') || data.hero.secondaryCtaLink.includes('product/'))
                ? data.hero.secondaryCtaLink.split('/').pop()
                : undefined}
              onSelect={(id) => {
                if (id) {
                  setNestedData('hero.secondaryCtaLink', `/product/${id}`);
                } else {
                  setNestedData('hero.secondaryCtaLink', '');
                }
              }}
              label={t('editor.controls.common.selectProduct')}
            />
          )}

          {/* Collection Picker */}
          {data.hero.secondaryCtaLinkType === 'collection' && (
            <SingleCollectionSelector
              storeId={activeProject?.id || ''}
              gridCategories={data.categoryGrid?.categories || []}
              selectedCollectionId={data.hero.secondaryCtaLink && (data.hero.secondaryCtaLink.includes('/tienda/categoria/') || data.hero.secondaryCtaLink.includes('category/'))
                ? data.hero.secondaryCtaLink.split('/').pop()
                : undefined}
              onSelect={(id) => {
                if (id) {
                  setNestedData('hero.secondaryCtaLink', `/collection/${id}`);
                } else {
                  setNestedData('hero.secondaryCtaLink', '');
                }
              }}
              label="Seleccionar Colección"
            />
          )}

          {/* Content Picker */}
          {data.hero.secondaryCtaLinkType === 'content' && (
            <SingleContentSelector
              selectedContentPath={data.hero.secondaryCtaLink}
              onSelect={(path) => {
                setNestedData('hero.secondaryCtaLink', path || '');
              }}
              label={t('editor.controls.common.selectContent')}
            />
          )}
        </div>

      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        {/* ========== TEXT LAYOUT ========== */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Layout size={14} />
            Ubicación del Texto
          </label>
          {/* Visual 3x3 position grid */}
          <div className="relative bg-editor-bg rounded-lg border border-editor-border p-3">
            {/* Preview area with position indicator */}
            <div className="relative aspect-video bg-gradient-to-br from-editor-panel-bg to-editor-bg rounded-md border border-editor-border/50 overflow-hidden mb-2">
              {/* Decorative lines representing text */}
              {(() => {
                const tl = data.hero.textLayout || 'left-top';
                const isLeft = tl.startsWith('left');
                const isRight = tl.startsWith('right');
                const isTop = tl.endsWith('-top') || tl === 'center-top';
                const isBottom = tl.endsWith('-bottom') || tl === 'center-bottom';
                const hPos = isLeft ? 'left-3' : isRight ? 'right-3' : 'left-1/2 -translate-x-1/2';
                const vPos = isTop ? 'top-2.5' : isBottom ? 'bottom-2.5' : 'top-1/2 -translate-y-1/2';
                const textAlign = isLeft ? 'items-start' : isRight ? 'items-end' : 'items-center';
                return (
                  <div className={`absolute ${hPos} ${vPos} flex flex-col gap-1 ${textAlign} transition-all duration-300 ease-out`}>
                    <div className="h-1.5 w-14 rounded-full bg-editor-accent/80" />
                    <div className="h-1 w-10 rounded-full bg-editor-accent/40" />
                    <div className="h-1 w-8 rounded-full bg-editor-accent/25" />
                  </div>
                );
              })()}
            </div>
            {/* 3x3 clickable grid */}
            <div className="grid grid-cols-3 gap-1">
              {([
                { value: 'left-top',      row: 0, col: 0 },
                { value: 'center-top',    row: 0, col: 1 },
                { value: 'right-top',     row: 0, col: 2 },
                { value: 'center',        row: 1, col: 1 },
                { value: 'left-bottom',   row: 2, col: 0 },
                { value: 'center-bottom', row: 2, col: 1 },
                { value: 'right-bottom',  row: 2, col: 2 },
              ] as const).map(pos => {
                const isSelected = (data.hero.textLayout || 'left-top') === pos.value;
                const labels: Record<string, string> = {
                  'left-top': 'Arriba Izquierda', 'center-top': 'Arriba Centro', 'right-top': 'Arriba Derecha',
                  'center': 'Centro',
                  'left-bottom': 'Abajo Izquierda', 'center-bottom': 'Abajo Centro', 'right-bottom': 'Abajo Derecha',
                };
                return (
                  <button
                    key={pos.value}
                    title={labels[pos.value]}
                    onClick={() => setNestedData('hero.textLayout', pos.value)}
                    className={`flex items-center justify-center h-7 rounded transition-all duration-200 ${
                      isSelected
                        ? 'bg-editor-accent/20 border border-editor-accent/50'
                        : 'bg-editor-panel-bg/50 border border-transparent hover:bg-editor-border/50 hover:border-editor-border'
                    }`}
                    style={{ gridRow: pos.row + 1, gridColumn: pos.col + 1 }}
                  >
                    <div className={`rounded-full transition-all duration-200 ${
                      isSelected
                        ? 'w-2.5 h-2.5 bg-editor-accent shadow-[0_0_8px_var(--editor-accent)]'
                        : 'w-1.5 h-1.5 bg-editor-text-secondary/40'
                    }`} />
                  </button>
                );
              })}
              {/* Empty cells for middle row left/right (no left-center or right-center options) */}
              <div className="h-7" style={{ gridRow: 2, gridColumn: 1 }} />
              <div className="h-7" style={{ gridRow: 2, gridColumn: 3 }} />
            </div>
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* ========== BACKGROUND IMAGE ========== */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Image size={14} />
            Imagen de Fondo
          </label>

          {/* Prominent Image Preview with overlaid controls */}
          <div className="relative rounded-lg overflow-hidden border border-editor-border group">
            {data.hero.imageUrl ? (
              <>
                <div className="aspect-video">
                  <img src={data.hero.imageUrl} alt="Hero Background" className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                <div className="absolute bottom-2.5 right-2.5 flex gap-1.5">
                  <button
                    onClick={() => setShowHeroImagePicker(true)}
                    className="p-2 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 transition-all duration-200"
                    title="Librería de Imágenes"
                  >
                    <Grid size={14} />
                  </button>
                  <button
                    onClick={() => setShowHeroImagePicker(true)}
                    className="p-2 rounded-lg bg-editor-accent/80 backdrop-blur-md border border-editor-accent/40 text-white hover:bg-editor-accent transition-all duration-200"
                    title="Generar con IA"
                  >
                    <Zap size={14} />
                  </button>
                  <button
                    onClick={() => setNestedData('hero.imageUrl', '')}
                    className="p-2 rounded-lg bg-red-500/60 backdrop-blur-md border border-red-500/30 text-white hover:bg-red-500/80 transition-all duration-200"
                    title="Eliminar imagen"
                  >
                    <X size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center bg-editor-bg text-editor-text-secondary gap-2">
                <Image size={32} className="opacity-30" />
                <span className="text-[10px] uppercase tracking-wider opacity-50">Sin imagen</span>
              </div>
            )}
          </div>

          {showHeroImagePicker && (
            <ImagePicker
              label=""
              value={data.hero.imageUrl}
              onChange={(url) => setNestedData('hero.imageUrl', url)}
              generationContext="background"
              defaultOpen
              onClose={() => setShowHeroImagePicker(false)}
            />
          )}

          {!data.hero.imageUrl && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowHeroImagePicker(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-editor-bg border border-editor-border text-editor-text-secondary hover:text-editor-text-primary hover:border-editor-accent/30 transition-all text-xs font-medium"
              >
                <Grid size={12} /> Librería
              </button>
              <button
                onClick={() => setShowHeroImagePicker(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-editor-accent/10 border border-editor-accent/20 text-editor-accent hover:bg-editor-accent/20 transition-all text-xs font-medium"
              >
                <Zap size={12} /> Generar IA
              </button>
            </div>
          )}

          {/* Overlay Opacity */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-editor-text-secondary">Oscurecimiento</span>
              <span className="text-[10px] text-editor-accent font-mono bg-editor-accent/10 px-2 py-0.5 rounded-full">{data.hero.overlayOpacity ?? 50}%</span>
            </div>
            <input
              type="range" min="0" max="100" step="5"
              value={data.hero.overlayOpacity ?? 50}
              onChange={(e) => setNestedData('hero.overlayOpacity', parseInt(e.target.value))}
              className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-editor-text-secondary/50">Claro</span>
              <span className="text-[9px] text-editor-text-secondary/50">Oscuro</span>
            </div>
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* ========== HERO HEIGHT ========== */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <AlignJustify size={14} />
            Altura de Sección
          </label>
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-editor-text-secondary">Altura</span>
              <span className="text-xs text-editor-text-primary font-mono">
                {data.hero.heroHeight ? `${data.hero.heroHeight}vh` : t('controls.auto')}
              </span>
            </div>
            <input
              type="range" min="0" max="100" step="5"
              value={data.hero.heroHeight ?? 0}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setNestedData('hero.heroHeight', val === 0 ? undefined : val);
              }}
              className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
            <div className="flex justify-between">
              <span className="text-[9px] text-editor-text-secondary">{t('controls.auto')}</span>
              <span className="text-[9px] text-editor-text-secondary">100vh</span>
            </div>
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* ========== COLORS ========== */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Palette size={14} />
            Colors
          </label>
          <div className="space-y-3">
            <ColorControl label={t('editor.controls.common.background')} value={data.hero.colors?.background} onChange={(v) => setNestedData('hero.colors.background', v)} />
            <ColorControl label="Primary Color" value={data.hero.colors?.primary || '#4f46e5'} onChange={(v) => setNestedData('hero.colors.primary', v)} />
            <ColorControl label="Secondary Color" value={data.hero.colors?.secondary || '#10b981'} onChange={(v) => setNestedData('hero.colors.secondary', v)} />
            <ColorControl label="Heading" value={data.hero.colors?.heading} onChange={(v) => setNestedData('hero.colors.heading', v)} />
            <ColorControl label="Text" value={data.hero.colors?.text} onChange={(v) => setNestedData('hero.colors.text', v)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <MousePointerClick size={14} />
            Button Colors
          </label>
          <div className="space-y-3">
            <ColorControl label="Primary Button BG" value={data.hero.colors?.buttonBackground} onChange={(v) => setNestedData('hero.colors.buttonBackground', v)} />
            <ColorControl label="Primary Button Text" value={data.hero.colors?.buttonText} onChange={(v) => setNestedData('hero.colors.buttonText', v)} />
            <ColorControl label="Secondary Button BG" value={data.hero.colors?.secondaryButtonBackground} onChange={(v) => setNestedData('hero.colors.secondaryButtonBackground', v)} />
            <ColorControl label="Secondary Button Text" value={data.hero.colors?.secondaryButtonText} onChange={(v) => setNestedData('hero.colors.secondaryButtonText', v)} />
          </div>

          {/* Secondary Button Style */}
          <div className="mt-4 pt-3 border-t border-editor-border/50">
            <label className="block text-xs font-medium text-editor-text-secondary mb-2">Secondary Button Style</label>
            <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
              {['solid', 'outline', 'ghost'].map(style => (
                <button
                  key={style}
                  onClick={() => setNestedData('hero.secondaryButtonStyle', style)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${(data.hero.secondaryButtonStyle || 'solid') === style
                    ? 'bg-editor-accent text-editor-bg'
                    : 'text-editor-text-secondary hover:bg-editor-border'
                    }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity Slider - only for solid style */}
          {(data.hero.secondaryButtonStyle || 'solid') === 'solid' && (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-editor-text-secondary">Opacity</label>
                <span className="text-[10px] text-editor-accent font-mono bg-editor-accent/10 px-2 py-0.5 rounded-full">{data.hero.secondaryButtonOpacity ?? 100}%</span>
              </div>
              <input
                type="range" min="0" max="100" step="5"
                value={data.hero.secondaryButtonOpacity ?? 100}
                onChange={(e) => setNestedData('hero.secondaryButtonOpacity', parseInt(e.target.value))}
                className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
              />
            </div>
          )}
        </div>

        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <SlidersHorizontal size={14} />
            Button Style
          </label>
          <BorderRadiusSelector label="Button Radius" value={data.hero.buttonBorderRadius || 'md'} onChange={(v) => setNestedData('hero.buttonBorderRadius', v)} />
        </div>
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // Organize Features controls into tabs
  const renderFeaturesControlsWithTabs = () => {
    if (!data?.features) return null;
    const currentVariant = (data.features as any).featuresVariant || 'classic';

    const contentTab = (
      <div className="space-y-4">
        {/* Title and Description */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <FileText size={14} />
            Section Header
          </label>
          <Input label={t('editor.controls.common.title')} value={data.features.title} onChange={(e) => setNestedData('features.title', e.target.value)} />
          <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.features.titleFontSize || 'md'} onChange={(v) => setNestedData('features.titleFontSize', v)} />
          <TextArea label={t('editor.controls.common.description')} value={data.features.description} onChange={(e) => setNestedData('features.description', e.target.value)} rows={2} />
          <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.features.descriptionFontSize || 'md'} onChange={(v) => setNestedData('features.descriptionFontSize', v)} />
        </div>

        {/* Features Items */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <List size={14} />
            Features List
          </label>
          {(data.features.items || []).map((item, index) => (
            <div
              key={index}
              data-section-item={`features:${index}`}
              className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-editor-text-secondary">Feature #{index + 1}</span>
                <button
                  onClick={() => {
                    const newItems = data.features.items.filter((_, i) => i !== index);
                    setNestedData('features.items', newItems);
                  }}
                  className="text-editor-text-secondary hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <Input placeholder="Title" value={item.title} onChange={(e) => setNestedData(`features.items.${index}.title`, e.target.value)} className="mb-2" />
              <textarea
                placeholder="Description"
                value={item.description}
                onChange={(e) => setNestedData(`features.items.${index}.description`, e.target.value)}
                rows={2}
                className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
              />
              <ImagePicker
                label={t('editor.controls.common.image')}
                value={item.imageUrl}
                onChange={(url) => setNestedData(`features.items.${index}.imageUrl`, url)}
              />

              {/* Link Controls */}
              <div className="mt-3 pt-3 border-t border-editor-border/50">
                <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Link</label>
                <input
                  placeholder="Link Text (e.g. Learn more)"
                  value={item.linkText || ''}
                  onChange={(e) => setNestedData(`features.items.${index}.linkText`, e.target.value)}
                  className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
                />
                <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1 mb-2">
                  {[
                    { value: 'manual', label: 'URL' },
                    { value: 'product', label: 'Product' },
                    { value: 'collection', label: 'Collection' },
                    { value: 'content', label: 'Contenido' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setNestedData(`features.items.${index}.linkType`, type.value)}
                      className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(item.linkType || 'manual') === type.value
                        ? 'bg-editor-accent text-editor-bg'
                        : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                        }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                {(item.linkType === 'manual' || !item.linkType) && (
                  <>
                    <input
                      placeholder="https://example.com or #section"
                      value={item.linkUrl || ''}
                      onChange={(e) => setNestedData(`features.items.${index}.linkUrl`, e.target.value)}
                      className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                    />
                    <p className="text-xs text-editor-text-secondary mt-1">
                      Use URLs for external links or # for page sections
                    </p>
                  </>
                )}
                {item.linkType === 'product' && (
                  <SingleProductSelector
                    storeId={activeProject?.id || ''}
                    selectedProductId={item.linkUrl?.startsWith('/product/') ? item.linkUrl.split('/product/')[1] : undefined}
                    onSelect={(id) => {
                      if (id) {
                        setNestedData(`features.items.${index}.linkUrl`, `/product/${id}`);
                      } else {
                        setNestedData(`features.items.${index}.linkUrl`, '');
                      }
                    }}
                    label={t('editor.controls.common.selectProduct')}
                  />
                )}
                {item.linkType === 'collection' && (
                  <SingleCollectionSelector
                    storeId={activeProject?.id || ''}
                    gridCategories={data.categoryGrid?.categories || []}
                    selectedCollectionId={(item as any).collectionId}
                    onSelect={(id) => {
                      setNestedData(`features.items.${index}.collectionId`, id || null);
                      if (id) {
                        setNestedData(`features.items.${index}.linkUrl`, '');
                      }
                    }}
                    label={t('editor.controls.common.selectCollection')}
                  />
                )}
                {item.linkType === 'content' && (
                  <SingleContentSelector
                    selectedContentPath={item.linkUrl}
                    onSelect={(path) => {
                      setNestedData(`features.items.${index}.linkUrl`, path || '');
                    }}
                    label={t('editor.controls.common.selectContent')}
                  />
                )}
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              setNestedData('features.items', [...(data.features.items || []), { title: '', description: '', imageUrl: '' }]);
            }}
            className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus size={14} /> Add Feature
          </button>
        </div>
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="features" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Section Style */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Layout size={14} />
            {t('editor.controls.features.sectionStyle')}
          </label>
          <div className="mb-4">
            <Select
              label={t('editor.controls.features.styleVariant')}
              value={currentVariant}
              onChange={(v) => setNestedData('features.featuresVariant', v)}
              options={[
                { value: 'classic', label: 'Classic (Grid Uniforme)' },
                { value: 'modern', label: 'Modern (Bento Asimétrico)' },
                { value: 'bento-premium', label: 'Premium (Bento Destacado)' },
                { value: 'image-overlay', label: 'Overlay (Tarjetas Completas)' },
                { value: 'cinematic-gym', label: 'Brutalist' }
              ]}
            />
            <p className="text-xs text-editor-text-secondary mt-2">
              {currentVariant === 'classic'
                ? '📦 Layout de cuadrícula tradicional'
                : currentVariant === 'modern'
                  ? '✨ Layout moderno bento asimétrico'
                  : currentVariant === 'bento-premium'
                    ? '🎯 Bento premium con primera tarjeta destacada'
                    : currentVariant === 'cinematic-gym'
                      ? '⛓️ Texto interactivo y tarjetas con scroll flotante'
                      : '🖼️ Imágenes completas con texto superpuesto'}
            </p>
          </div>

          {currentVariant === 'cinematic-gym' && (
            <div className="mb-4">
              <Select
                label="Alineación del Layout"
                value={(data.features as any)?.layoutAlignment || 'left'}
                onChange={(v) => setNestedData('features.layoutAlignment', v)}
                options={[
                  { value: 'left', label: 'Texto a la Izquierda, Tarjetas a la Derecha' },
                  { value: 'right', label: 'Texto a la Derecha, Tarjetas a la Izquierda' }
                ]}
              />
            </div>
          )}

          {/* Overlay Settings - only shown when image-overlay variant is selected */}
          {currentVariant === 'image-overlay' && (
            <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
              <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
                <Image size={14} />
                Overlay Settings
              </label>
              <div>
                <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Text Alignment</label>
                <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
                  {(['left', 'center', 'right'] as const).map(align => (
                    <button
                      key={align}
                      onClick={() => setNestedData('features.overlayTextAlignment', align)}
                      className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors capitalize ${(data.features as any).overlayTextAlignment === align || (!((data.features as any).overlayTextAlignment) && align === 'left') ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                    >
                      {align === 'left' ? '⬅️ Left' : align === 'center' ? '↔️ Center' : '➡️ Right'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Show Section Header</label>
                <button
                  onClick={() => setNestedData('features.showSectionHeader', !((data.features as any).showSectionHeader !== false))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${(data.features as any).showSectionHeader !== false ? 'bg-editor-accent' : 'bg-editor-border'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${(data.features as any).showSectionHeader !== false ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Grid Layout */}
        {currentVariant !== 'cinematic-gym' && (
          <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
            <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
              <Grid size={14} />
              Grid Layout
            </label>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Columns (Desktop)</label>
            <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
              {[2, 3, 4].map(cols => (
                <button
                  key={cols}
                  onClick={() => setNestedData('features.gridColumns', cols)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${data.features.gridColumns === cols ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                >
                  {cols}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Card Image */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Image size={14} />
            Card Image
          </label>
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Image Height</label>
              <span className="text-xs text-editor-text-primary">{data.features.imageHeight || 200}px</span>
            </div>
            <input
              type="range" min="100" max="600" step="10"
              value={data.features.imageHeight || 200}
              onChange={(e) => setNestedData('features.imageHeight', parseInt(e.target.value))}
              className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
          </div>
          {currentVariant !== 'cinematic-gym' && (
            <div>
              <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Object Fit</label>
              <div className="grid grid-cols-3 gap-1 bg-editor-bg p-1 rounded-md border border-editor-border">
                {['cover', 'contain', 'fill', 'none', 'scale-down'].map(fit => (
                  <button
                    key={fit}
                    onClick={() => setNestedData('features.imageObjectFit', fit)}
                    className={`py-1 px-2 text-xs font-semibold rounded-sm transition-colors capitalize ${data.features.imageObjectFit === fit ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                  >
                    {fit === 'scale-down' ? 'Scale' : fit}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Spacing */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Settings size={14} />
            Spacing
          </label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data.features.paddingY || 'md'} onChange={(v) => setNestedData('features.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data.features.paddingX || 'md'} onChange={(v) => setNestedData('features.paddingX', v)} />
          </div>
        </div>

        {/* Colors */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Palette size={14} />
            Colors
          </label>
          <ColorControl label={t('editor.controls.common.background')} value={data.features.colors?.background || '#000000'} onChange={(v) => setNestedData('features.colors.background', v)} />
          <ColorControl label="Section Title" value={data.features.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('features.colors.heading', v)} />
          <ColorControl label="Section Description" value={data.features.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('features.colors.description', v)} />
          <ColorControl label="Accent" value={data.features.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('features.colors.accent', v)} />

          <div className="border-t border-editor-border/30 my-1" />
          <p className="text-[10px] text-editor-text-secondary uppercase tracking-wider font-bold">Card Colors</p>

          <ColorControl label="Card Background" value={data.features.colors?.cardBackground || '#1a1a2e'} onChange={(v) => setNestedData('features.colors.cardBackground', v)} />
          <ColorControl label="Card Title" value={data.features.colors?.cardHeading || '#ffffff'} onChange={(v) => setNestedData('features.colors.cardHeading', v)} />
          <ColorControl label="Card Text" value={data.features.colors?.cardText || '#94a3b8'} onChange={(v) => setNestedData('features.colors.cardText', v)} />
          <ColorControl label="Border" value={data.features.colors?.borderColor || 'transparent'} onChange={(v) => setNestedData('features.colors.borderColor', v)} />
        </div>

        {/* Animations */}
        <AnimationControls
          animationType={data.features.animationType || 'fade-in-up'}
          enableCardAnimation={data.features.enableCardAnimation !== false}
          onChangeAnimationType={(type) => setNestedData('features.animationType', type)}
          onToggleAnimation={(enabled) => setNestedData('features.enableCardAnimation', enabled)}
        />
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // Organize Testimonials controls into tabs
  const renderTestimonialsControlsWithTabs = () => {
    if (!data?.testimonials) return null;

    const contentTab = (
      <div className="space-y-4">
        {/* Title and Description */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <FileText size={14} />
            Section Header
          </label>
          <Input label={t('editor.controls.common.title')} value={data.testimonials.title} onChange={(e) => setNestedData('testimonials.title', e.target.value)} />
          <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.testimonials.titleFontSize || 'md'} onChange={(v) => setNestedData('testimonials.titleFontSize', v)} />
          <TextArea label={t('editor.controls.common.description')} value={data.testimonials.description} onChange={(e) => setNestedData('testimonials.description', e.target.value)} rows={2} />
          <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.testimonials.descriptionFontSize || 'md'} onChange={(v) => setNestedData('testimonials.descriptionFontSize', v)} />
        </div>

        {/* Testimonials Items */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <MessageSquare size={14} />
            Testimonials List
          </label>
          {(data.testimonials.items || []).map((item: any, index: number) => (
            <div key={index} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-editor-text-secondary">Testimonial #{index + 1}</span>
                <button
                  onClick={() => {
                    const newItems = (data.testimonials.items || []).filter((_: any, i: number) => i !== index);
                    setNestedData('testimonials.items', newItems);
                  }}
                  className="text-editor-text-secondary hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <ImagePicker
                label={`Avatar #${index + 1}`}
                value={item.imageUrl || ''}
                onChange={(url) => setNestedData(`testimonials.items.${index}.imageUrl`, url)}
                onRemove={() => setNestedData(`testimonials.items.${index}.imageUrl`, '')}
              />
              <textarea
                placeholder="Quote"
                value={item.quote}
                onChange={(e) => setNestedData(`testimonials.items.${index}.quote`, e.target.value)}
                rows={3}
                className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
              />
              <Input placeholder="Name" value={item.name} onChange={(e) => setNestedData(`testimonials.items.${index}.name`, e.target.value)} className="mb-2" />
              <Input placeholder="Title/Role" value={item.title} onChange={(e) => setNestedData(`testimonials.items.${index}.title`, e.target.value)} className="mb-2" />
            </div>
          ))}
          <button
            onClick={() => {
              setNestedData('testimonials.items', [...(data.testimonials.items || []), { quote: '', name: '', title: '', imageUrl: '' }]);
            }}
            className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus size={14} /> Add Testimonial
          </button>
        </div>
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="testimonials" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Card Styling */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Layout size={14} />
            Card Styling
          </label>

          <ColorControl label="Card Background" value={data.testimonials.colors?.cardBackground || '#1f2937'} onChange={(v) => setNestedData('testimonials.colors.cardBackground', v)} />

          <BorderRadiusSelector label="Card Corners" value={data.testimonials.borderRadius || 'xl'} onChange={(v) => setNestedData('testimonials.borderRadius', v)} />

          <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Card Shadow</label>
            <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
              {['none', 'sm', 'md', 'lg', 'xl'].map((shadow) => (
                <button
                  key={shadow}
                  onClick={() => setNestedData('testimonials.cardShadow', shadow)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors uppercase ${(data.testimonials.cardShadow || 'lg') === shadow ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                >
                  {shadow}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Border Style</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'none', label: 'None' },
                { value: 'solid', label: 'Solid' },
                { value: 'gradient', label: 'Gradient' },
                { value: 'glow', label: 'Glow' }
              ].map(style => (
                <button
                  key={style.value}
                  onClick={() => setNestedData('testimonials.borderStyle', style.value)}
                  className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors ${(data.testimonials.borderStyle || 'solid') === style.value ? 'bg-editor-accent text-editor-bg' : 'bg-editor-bg text-editor-text-secondary hover:bg-editor-border border border-editor-border'}`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          <ColorControl label="Border Color" value={data.testimonials.colors?.borderColor || '#374151'} onChange={(v) => setNestedData('testimonials.colors.borderColor', v)} />

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Card Padding</label>
              <span className="text-xs text-editor-text-primary">{data.testimonials.cardPadding || 32}px</span>
            </div>
            <input
              type="range" min="16" max="64" step="4"
              value={data.testimonials.cardPadding || 32}
              onChange={(e) => setNestedData('testimonials.cardPadding', parseInt(e.target.value))}
              className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
          </div>
        </div>

        {/* Spacing */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Settings size={14} />
            Spacing
          </label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data.testimonials.paddingY || 'md'} onChange={(v) => setNestedData('testimonials.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data.testimonials.paddingX || 'md'} onChange={(v) => setNestedData('testimonials.paddingX', v)} />
          </div>
        </div>

        {/* Section Colors */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Palette size={14} />
            Section Colors
          </label>
          <ColorControl label={t('editor.controls.common.background')} value={data.testimonials.colors?.background || '#000000'} onChange={(v) => setNestedData('testimonials.colors.background', v)} />
          <ColorControl label={t('editor.controls.common.title')} value={data.testimonials.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('testimonials.colors.heading', v)} />
          <ColorControl label={t('editor.controls.common.description')} value={data.testimonials.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('testimonials.colors.description', v)} />
          <ColorControl label="Text" value={data.testimonials.colors?.text || '#ffffff'} onChange={(v) => setNestedData('testimonials.colors.text', v)} />
          <ColorControl label="Person Title" value={data.testimonials.colors?.subtitleColor || data.testimonials.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('testimonials.colors.subtitleColor', v)} />
          <ColorControl label="Accent" value={data.testimonials.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('testimonials.colors.accent', v)} />

          <hr className="border-editor-border/50 my-3" />

          {/* Corner Gradient */}
          <CornerGradientControl
            enabled={data.testimonials.cornerGradient?.enabled || false}
            position={data.testimonials.cornerGradient?.position || 'top-left'}
            color={data.testimonials.cornerGradient?.color || '#4f46e5'}
            opacity={data.testimonials.cornerGradient?.opacity || 30}
            size={data.testimonials.cornerGradient?.size || 50}
            onEnabledChange={(v) => setNestedData('testimonials.cornerGradient.enabled', v)}
            onPositionChange={(v) => setNestedData('testimonials.cornerGradient.position', v)}
            onColorChange={(v) => setNestedData('testimonials.cornerGradient.color', v)}
            onOpacityChange={(v) => setNestedData('testimonials.cornerGradient.opacity', v)}
            onSizeChange={(v) => setNestedData('testimonials.cornerGradient.size', v)}
          />
        </div>

        {/* Animation Controls */}
        <AnimationControls
          animationType={data.testimonials.animationType || 'fade-in-up'}
          enableCardAnimation={data.testimonials.enableCardAnimation !== false}
          onChangeAnimationType={(type) => setNestedData('testimonials.animationType', type)}
          onToggleAnimation={(enabled) => setNestedData('testimonials.enableCardAnimation', enabled)}
          label={t('editor.controls.common.cardAnimations')}
        />
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // Services Controls with Tabs
  const renderServicesControlsWithTabs = () => {
    if (!data?.services) return null;

    const contentTab = (
      <div className="space-y-4">
        {/* Services Variant Selector */}
        <div className="bg-editor-panel-bg/50 p-3 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">
            Services Style
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['cards', 'grid', 'minimal'].map((variant) => (
              <button
                key={variant}
                onClick={() => setNestedData('services.servicesVariant', variant)}
                className={`px-2 py-2 rounded-md border text-xs transition-all capitalize ${(data?.services?.servicesVariant || 'cards') === variant
                  ? 'bg-editor-accent text-editor-bg border-editor-accent shadow-sm font-bold'
                  : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                  }`}
              >
                {variant}
              </button>
            ))}
          </div>
          <p className="text-xs text-editor-text-secondary mt-2 italic">
            {(data?.services?.servicesVariant || 'cards') === 'cards' && '✨ Standard centered cards with hover effects.'}
            {(data?.services?.servicesVariant || 'cards') === 'grid' && '🎨 Modern bento-style grid with left alignment.'}
            {(data?.services?.servicesVariant || 'cards') === 'minimal' && '📋 Clean list layout for a professional look.'}
          </p>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Service Items */}
        {renderListSectionControls('services', 'Service', [
          { key: 'title', label: 'Title', type: 'input' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'icon', label: 'Icon', type: 'icon-selector' }
        ])}
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="services" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Section Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Section Colors</label>
          <ColorControl label={t('editor.controls.common.background')} value={data?.services?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('services.colors.background', v)} />
          <ColorControl label="Section Title" value={data?.services?.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('services.colors.heading', v)} />
          <ColorControl label="Section Description" value={data?.services?.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('services.colors.description', v)} />
          <ColorControl label="Accent" value={data?.services?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('services.colors.accent', v)} />
        </div>

        <hr className="border-editor-border/30" />

        {/* Card Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Card Colors</label>
          <ColorControl label="Card Background" value={data?.services?.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('services.colors.cardBackground', v)} />
          <ColorControl label="Card Title" value={data?.services?.colors?.cardHeading || '#ffffff'} onChange={(v) => setNestedData('services.colors.cardHeading', v)} />
          <ColorControl label="Card Text" value={data?.services?.colors?.cardText || '#94a3b8'} onChange={(v) => setNestedData('services.colors.cardText', v)} />
          <ColorControl label="Border Color" value={data?.services?.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('services.colors.borderColor', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Spacing */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data?.services?.paddingY || 'md'} onChange={(v) => setNestedData('services.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data?.services?.paddingX || 'md'} onChange={(v) => setNestedData('services.paddingX', v)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data?.services?.cornerGradient?.enabled || false}
          position={data?.services?.cornerGradient?.position || 'top-left'}
          color={data?.services?.cornerGradient?.color || '#4f46e5'}
          opacity={data?.services?.cornerGradient?.opacity || 30}
          size={data?.services?.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('services.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('services.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('services.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('services.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('services.cornerGradient.size', v)}
        />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Animation Controls */}
        <AnimationControls
          animationType={data?.services?.animationType || 'fade-in-up'}
          enableCardAnimation={data?.services?.enableCardAnimation !== false}
          onChangeAnimationType={(type) => setNestedData('services.animationType', type)}
          onToggleAnimation={(enabled) => setNestedData('services.enableCardAnimation', enabled)}
          label={t('editor.controls.common.cardAnimations')}
        />
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // Team Controls with Tabs
  const renderTeamControlsWithTabs = () => {
    if (!data?.team) return null;

    const contentTab = (
      <div className="space-y-4">
        {/* Team Variant Selector */}
        <div className="bg-editor-panel-bg/50 p-3 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Team Style</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'classic', label: 'Classic' },
              { value: 'cards', label: 'Cards' },
              { value: 'minimal', label: 'Minimal' },
              { value: 'overlay', label: 'Overlay' }
            ].map((variant) => (
              <button
                key={variant.value}
                onClick={() => setNestedData('team.teamVariant', variant.value)}
                className={`p-2 text-xs font-medium rounded-md border transition-all ${(data?.team?.teamVariant || 'classic') === variant.value
                  ? 'bg-editor-accent text-editor-bg border-editor-accent'
                  : 'bg-editor-panel-bg text-editor-text-secondary border-editor-border hover:border-editor-accent'
                  }`}
              >
                {variant.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Content */}
        <Input label={t('editor.controls.common.title')} value={data?.team?.title} onChange={(e) => setNestedData('team.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.team?.titleFontSize || 'md'} onChange={(v) => setNestedData('team.titleFontSize', v)} />

        <TextArea label={t('editor.controls.common.description')} value={data?.team?.description} onChange={(e) => setNestedData('team.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.team?.descriptionFontSize || 'md'} onChange={(v) => setNestedData('team.descriptionFontSize', v)} />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Team Members */}
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Team Members</label>
        {(data?.team?.items || []).map((member: any, index: number) => (
          <div key={index} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3">
            <ImagePicker
              label={`${t('editor.controls.team.member')} #${index + 1}`}
              value={member.imageUrl}
              onChange={(url) => setNestedData(`team.items.${index}.imageUrl`, url)}
              onRemove={() => {
                const newItems = [...(data?.team?.items || [])];
                newItems.splice(index, 1);
                setNestedData('team.items', newItems);
              }}
            />
            <Input label="Name" value={member.name} onChange={(e) => setNestedData(`team.items.${index}.name`, e.target.value)} className="mt-2" />
            <Input label="Role" value={member.role} onChange={(e) => setNestedData(`team.items.${index}.role`, e.target.value)} />
            <Input label="Bio (Overlay)" value={member.bio || ''} onChange={(e) => setNestedData(`team.items.${index}.bio`, e.target.value)} placeholder="Short bio shown on hover" />

            {/* Link Controls */}
            <div className="mt-3 pt-3 border-t border-editor-border/50">
              <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider flex items-center gap-1">
                <Link size={12} />
                Perfil / Enlace
              </label>
              <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1 mb-2">
                {[
                  { value: 'manual', label: 'URL' },
                  { value: 'content', label: 'Contenido' }
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setNestedData(`team.items.${index}.linkType`, type.value)}
                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(member.linkType || 'manual') === type.value
                      ? 'bg-editor-accent text-editor-bg'
                      : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                      }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              {(member.linkType === 'manual' || !member.linkType) && (
                <input
                  placeholder="https://... o /pagina"
                  value={member.linkUrl || ''}
                  onChange={(e) => setNestedData(`team.items.${index}.linkUrl`, e.target.value)}
                  className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                />
              )}
              {member.linkType === 'content' && (
                <SingleContentSelector
                  selectedContentPath={member.linkUrl}
                  onSelect={(path) => {
                    setNestedData(`team.items.${index}.linkUrl`, path || '');
                  }}
                  label={t('editor.controls.common.selectContent')}
                />
              )}
            </div>
          </div>
        ))}
        <button
          onClick={() => {
            const newItems = [...(data?.team?.items || []), { name: 'New Member', role: 'Role', imageUrl: '' }];
            setNestedData('team.items', newItems);
          }}
          className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus size={14} /> Add Member
        </button>
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="team" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Section Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Section Colors</label>
          <ColorControl label={t('editor.controls.common.background')} value={data?.team?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('team.colors.background', v)} />
          <ColorControl label="Section Title" value={data?.team?.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('team.colors.heading', v)} />
          <ColorControl label="Section Description" value={data?.team?.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('team.colors.description', v)} />
          <ColorControl label="Accent" value={data?.team?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('team.colors.accent', v)} />
        </div>

        <hr className="border-editor-border/30" />

        {/* Card Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Card Colors</label>
          <ColorControl label="Card Background" value={data?.team?.colors?.cardBackground || 'rgba(30, 41, 59, 0.5)'} onChange={(v) => setNestedData('team.colors.cardBackground', v)} />
          <ColorControl label="Card Name" value={data?.team?.colors?.cardHeading || '#ffffff'} onChange={(v) => setNestedData('team.colors.cardHeading', v)} />
          <ColorControl label="Card Role" value={data?.team?.colors?.cardText || '#94a3b8'} onChange={(v) => setNestedData('team.colors.cardText', v)} />
          <ColorControl label="Photo Border" value={data?.team?.colors?.photoBorderColor || '#4f46e5'} onChange={(v) => setNestedData('team.colors.photoBorderColor', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Spacing */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data?.team?.paddingY || 'md'} onChange={(v) => setNestedData('team.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data?.team?.paddingX || 'md'} onChange={(v) => setNestedData('team.paddingX', v)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data?.team?.cornerGradient?.enabled || false}
          position={data?.team?.cornerGradient?.position || 'top-left'}
          color={data?.team?.cornerGradient?.color || '#4f46e5'}
          opacity={data?.team?.cornerGradient?.opacity || 30}
          size={data?.team?.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('team.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('team.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('team.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('team.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('team.cornerGradient.size', v)}
        />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Animation Controls */}
        <AnimationControls
          animationType={data?.team?.animationType || 'fade-in-up'}
          enableCardAnimation={data?.team?.enableCardAnimation !== false}
          onChangeAnimationType={(type) => setNestedData('team.animationType', type)}
          onToggleAnimation={(enabled) => setNestedData('team.enableCardAnimation', enabled)}
          label={t('editor.controls.common.cardAnimations')}
        />
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // FAQ Controls with Tabs
  const renderFAQControlsWithTabs = () => {
    if (!data?.faq) return null;

    const contentTab = (
      <div className="space-y-4">
        {/* FAQ Variant Selector */}
        <div className="bg-editor-panel-bg/50 p-3 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">
            FAQ Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['classic', 'cards', 'gradient', 'minimal'].map((variant) => (
              <button
                key={variant}
                onClick={() => setNestedData('faq.faqVariant', variant)}
                className={`px-2 py-2 rounded-md border text-xs transition-all capitalize ${(data?.faq?.faqVariant || 'classic') === variant
                  ? 'bg-editor-accent text-editor-bg border-editor-accent shadow-sm font-bold'
                  : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                  }`}
              >
                {variant}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* FAQ Items */}
        {renderListSectionControls('faq', 'Question', [{ key: 'question', label: 'Question', type: 'input' }, { key: 'answer', label: 'Answer', type: 'textarea' }])}
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="faq" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Section Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Section Colors</label>
          <ColorControl label={t('editor.controls.common.background')} value={data?.faq?.colors?.background || '#1e293b'} onChange={(v) => setNestedData('faq.colors.background', v)} />
          <ColorControl label="Section Title" value={data?.faq?.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('faq.colors.heading', v)} />
          <ColorControl label="Section Description" value={data?.faq?.colors?.description || data?.faq?.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('faq.colors.description', v)} />
          <ColorControl label="Accent" value={data?.faq?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('faq.colors.accent', v)} />
        </div>

        <hr className="border-editor-border/30" />

        {/* Card Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Card Colors</label>
          <ColorControl label="Card Background" value={data?.faq?.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('faq.colors.cardBackground', v)} />
          <ColorControl label="Question Text" value={data?.faq?.colors?.text || '#F9FAFB'} onChange={(v) => setNestedData('faq.colors.text', v)} />
          <ColorControl label="Border Color" value={data?.faq?.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('faq.colors.borderColor', v)} />
        </div>

        {/* Gradient Colors (for gradient variant) */}
        {(data?.faq?.faqVariant === 'gradient') && (
          <>
            <div className="border-t border-editor-border/30 my-1" />
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Gradient</label>
              <ColorControl label="Gradient Start" value={data?.faq?.colors?.gradientStart || '#4f46e5'} onChange={(v) => setNestedData('faq.colors.gradientStart', v)} />
              <ColorControl label="Gradient End" value={data?.faq?.colors?.gradientEnd || '#7c3aed'} onChange={(v) => setNestedData('faq.colors.gradientEnd', v)} />
            </div>
          </>
        )}
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // Portfolio Controls with Tabs
  const renderPortfolioControlsWithTabs = () => {
    if (!data?.portfolio) return null;
    const currentPortfolioVariant = (data?.portfolio as any)?.portfolioVariant || 'classic';

    const contentTab = (
      <div className="space-y-4">
        {/* Style Variant */}
        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Portfolio Style</label>
          <div className="grid grid-cols-2 gap-1 bg-editor-bg p-1 rounded-md border border-editor-border">
            <button
              onClick={() => setNestedData('portfolio.portfolioVariant', 'classic')}
              className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentPortfolioVariant === 'classic' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
            >
              Classic
            </button>
            <button
              onClick={() => setNestedData('portfolio.portfolioVariant', 'image-overlay')}
              className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentPortfolioVariant === 'image-overlay' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
            >
              Overlay
            </button>
          </div>
          <p className="text-xs text-editor-text-secondary mt-1">
            {currentPortfolioVariant === 'classic'
              ? '📦 Card-based grid layout'
              : '🖼️ Full-width images with text overlay'}
          </p>
        </div>

        {/* Overlay-specific controls */}
        {currentPortfolioVariant === 'image-overlay' && (
          <>
            <div className="border-t border-editor-border/30 my-1" />
            <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Overlay Settings</label>
            <div>
              <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Grid Columns</label>
              <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
                {[2, 3, 4].map(cols => (
                  <button
                    key={cols}
                    onClick={() => setNestedData('portfolio.gridColumns', cols)}
                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(data?.portfolio as any)?.gridColumns === cols || (!((data?.portfolio as any)?.gridColumns) && cols === 3) ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                  >
                    {cols}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Image Height</label>
                <span className="text-xs text-editor-text-primary">{(data?.portfolio as any)?.imageHeight || 300}px</span>
              </div>
              <input
                type="range" min="150" max="600" step="10"
                value={(data?.portfolio as any)?.imageHeight || 300}
                onChange={e => setNestedData('portfolio.imageHeight', parseInt(e.target.value, 10))}
                className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Text Alignment</label>
              <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
                {(['left', 'center', 'right'] as const).map(align => (
                  <button
                    key={align}
                    onClick={() => setNestedData('portfolio.overlayTextAlignment', align)}
                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors capitalize ${(data?.portfolio as any)?.overlayTextAlignment === align || (!((data?.portfolio as any)?.overlayTextAlignment) && align === 'left') ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                  >
                    {align === 'left' ? '⬅️ Left' : align === 'center' ? '↔️ Center' : '➡️ Right'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Show Section Header</label>
              <button
                onClick={() => setNestedData('portfolio.showSectionHeader', !((data?.portfolio as any)?.showSectionHeader !== false))}
                className={`relative w-10 h-5 rounded-full transition-colors ${(data?.portfolio as any)?.showSectionHeader !== false ? 'bg-editor-accent' : 'bg-editor-border'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${(data?.portfolio as any)?.showSectionHeader !== false ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </>
        )}

        <div className="border-t border-editor-border/30 my-1" />

        {/* Title & Description */}
        <Input label={t('editor.controls.common.title')} value={data?.portfolio?.title} onChange={(e) => setNestedData('portfolio.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.portfolio?.titleFontSize || 'md'} onChange={(v) => setNestedData('portfolio.titleFontSize', v)} />

        <TextArea label={t('editor.controls.common.description')} value={data?.portfolio?.description} onChange={(e) => setNestedData('portfolio.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.portfolio?.descriptionFontSize || 'md'} onChange={(v) => setNestedData('portfolio.descriptionFontSize', v)} />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Projects */}
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Projects</label>
        {(data?.portfolio?.items || []).map((item: any, index: number) => (
          <div key={index} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-editor-text-secondary">Project #{index + 1}</span>
              <button
                onClick={() => {
                  const newItems = (data?.portfolio?.items || []).filter((_: any, i: number) => i !== index);
                  setNestedData('portfolio.items', newItems);
                }}
                className="text-editor-text-secondary hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <input
              placeholder="Title"
              value={item.title}
              onChange={(e) => setNestedData(`portfolio.items.${index}.title`, e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
            />
            <textarea
              placeholder="Description"
              value={item.description}
              onChange={(e) => setNestedData(`portfolio.items.${index}.description`, e.target.value)}
              rows={2}
              className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
            />
            <ImagePicker
              label={t('editor.controls.common.image')}
              value={item.imageUrl}
              onChange={(url) => setNestedData(`portfolio.items.${index}.imageUrl`, url)}
            />

            {/* Link Controls */}
            <div className="mt-3 pt-3 border-t border-editor-border/50">
              <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Link</label>
              <input
                placeholder="Link Text (e.g. View Project)"
                value={item.linkText || ''}
                onChange={(e) => setNestedData(`portfolio.items.${index}.linkText`, e.target.value)}
                className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
              />
              <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1 mb-2">
                {[
                  { value: 'manual', label: 'URL' },
                  { value: 'product', label: 'Product' },
                  { value: 'collection', label: 'Collection' },
                  { value: 'content', label: 'Contenido' }
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setNestedData(`portfolio.items.${index}.linkType`, type.value)}
                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(item.linkType || 'manual') === type.value
                      ? 'bg-editor-accent text-editor-bg'
                      : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                      }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              {(item.linkType === 'manual' || !item.linkType) && (
                <>
                  <input
                    placeholder="https://example.com or #section"
                    value={item.linkUrl || ''}
                    onChange={(e) => setNestedData(`portfolio.items.${index}.linkUrl`, e.target.value)}
                    className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                  />
                  <p className="text-xs text-editor-text-secondary mt-1">
                    Use URLs for external links or # for page sections
                  </p>
                </>
              )}
              {item.linkType === 'product' && (
                <SingleProductSelector
                  storeId={activeProject?.id || ''}
                  selectedProductId={item.linkUrl?.startsWith('/product/') ? item.linkUrl.split('/product/')[1] : undefined}
                  onSelect={(id) => {
                    if (id) {
                      setNestedData(`portfolio.items.${index}.linkUrl`, `/product/${id}`);
                    } else {
                      setNestedData(`portfolio.items.${index}.linkUrl`, '');
                    }
                  }}
                  label={t('editor.controls.common.selectProduct')}
                />
              )}
              {item.linkType === 'collection' && (
                <SingleCollectionSelector
                  storeId={activeProject?.id || ''}
                  gridCategories={data.categoryGrid?.categories || []}
                  selectedCollectionId={(item as any).collectionId}
                  onSelect={(id) => {
                    setNestedData(`portfolio.items.${index}.collectionId`, id || null);
                    if (id) {
                      setNestedData(`portfolio.items.${index}.linkUrl`, '');
                    }
                  }}
                  label={t('editor.controls.common.selectCollection')}
                />
              )}
              {item.linkType === 'content' && (
                <SingleContentSelector
                  selectedContentPath={item.linkUrl}
                  onSelect={(path) => {
                    setNestedData(`portfolio.items.${index}.linkUrl`, path || '');
                  }}
                  label={t('editor.controls.common.selectContent')}
                />
              )}
            </div>
          </div>
        ))}
        <button
          onClick={() => {
            const newItems = [...(data?.portfolio?.items || []), { title: 'New Project', description: 'Project description', imageUrl: 'pending:placeholder' }];
            setNestedData('portfolio.items', newItems);
          }}
          className="w-full px-4 py-2 rounded-md text-xs font-bold border border-dashed border-editor-accent/50 text-editor-accent hover:bg-editor-accent/10 transition-colors"
        >
          + Add Project
        </button>
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="portfolio" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Section Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Section Colors</label>
          <ColorControl label={t('editor.controls.common.background')} value={data?.portfolio?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('portfolio.colors.background', v)} />
          <ColorControl label="Heading" value={data?.portfolio?.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('portfolio.colors.heading', v)} />
          <ColorControl label="Text" value={data?.portfolio?.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('portfolio.colors.text', v)} />
          <ColorControl label="Accent" value={data?.portfolio?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('portfolio.colors.accent', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Card Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Card Colors</label>
          <ColorControl label="Card Background" value={data?.portfolio?.colors?.cardBackground || 'rgba(0,0,0,0.8)'} onChange={(v) => setNestedData('portfolio.colors.cardBackground', v)} />
          <ColorControl label="Card Title" value={data?.portfolio?.colors?.cardTitleColor || '#ffffff'} onChange={(v) => setNestedData('portfolio.colors.cardTitleColor', v)} />
          <ColorControl label="Card Text" value={data?.portfolio?.colors?.cardTextColor || 'rgba(255,255,255,0.9)'} onChange={(v) => setNestedData('portfolio.colors.cardTextColor', v)} />
          <ColorControl label="Border Color" value={data?.portfolio?.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('portfolio.colors.borderColor', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Card Overlay Gradient */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Card Overlay Gradient</label>
          <ColorControl label="Overlay Start (Bottom)" value={data?.portfolio?.colors?.cardOverlayStart || 'rgba(0,0,0,0.9)'} onChange={(v) => setNestedData('portfolio.colors.cardOverlayStart', v)} />
          <ColorControl label="Overlay End (Top)" value={data?.portfolio?.colors?.cardOverlayEnd || 'rgba(0,0,0,0.2)'} onChange={(v) => setNestedData('portfolio.colors.cardOverlayEnd', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Spacing */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data?.portfolio?.paddingY || 'md'} onChange={(v) => setNestedData('portfolio.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data?.portfolio?.paddingX || 'md'} onChange={(v) => setNestedData('portfolio.paddingX', v)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data?.portfolio?.cornerGradient?.enabled || false}
          position={data?.portfolio?.cornerGradient?.position || 'top-left'}
          color={data?.portfolio?.cornerGradient?.color || '#4f46e5'}
          opacity={data?.portfolio?.cornerGradient?.opacity || 30}
          size={data?.portfolio?.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('portfolio.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('portfolio.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('portfolio.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('portfolio.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('portfolio.cornerGradient.size', v)}
        />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Animation Controls */}
        <AnimationControls
          animationType={data?.portfolio?.animationType || 'fade-in-up'}
          enableCardAnimation={data?.portfolio?.enableCardAnimation !== false}
          onChangeAnimationType={(type) => setNestedData('portfolio.animationType', type)}
          onToggleAnimation={(enabled) => setNestedData('portfolio.enableCardAnimation', enabled)}
          label={t('editor.controls.common.cardAnimations')}
        />
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // Leads Controls with Tabs
  const renderLeadsControlsWithTabs = () => {
    if (!data?.leads) return null;

    const contentTab = (
      <div className="space-y-4">
        {/* Variant Selector */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider">Estilo de Formulario</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'classic', label: 'Clásico' },
              { value: 'split-gradient', label: 'Gradiente Dividido' },
              { value: 'floating-glass', label: 'Vidrio Flotante' },
              { value: 'minimal-border', label: 'Borde Minimalista' }
            ].map((variant) => (
              <button
                key={variant.value}
                onClick={() => setNestedData('leads.leadsVariant', variant.value)}
                className={`p-3 text-xs font-medium rounded-md border-2 transition-all ${(data?.leads?.leadsVariant || 'classic') === variant.value
                  ? 'bg-editor-accent text-editor-bg border-editor-accent'
                  : 'bg-editor-panel-bg text-editor-text-secondary border-editor-border hover:border-editor-accent'
                  }`}
              >
                {variant.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Content */}
        <Input label={t('editor.controls.common.title')} value={data?.leads.title} onChange={(e) => setNestedData('leads.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.leads.titleFontSize || 'md'} onChange={(v) => setNestedData('leads.titleFontSize', v)} />

        <TextArea label={t('editor.controls.common.description')} value={data?.leads.description} onChange={(e) => setNestedData('leads.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.leads.descriptionFontSize || 'md'} onChange={(v) => setNestedData('leads.descriptionFontSize', v)} />

        <Input label={t('editor.controls.common.buttonText')} value={data?.leads.buttonText} onChange={(e) => setNestedData('leads.buttonText', e.target.value)} />
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="leads" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Border Radius Controls */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Border Radius</label>
          <BorderRadiusSelector label="Card Radius" value={data?.leads?.cardBorderRadius || 'xl'} onChange={(v) => setNestedData('leads.cardBorderRadius', v)} />
          <BorderRadiusSelector label="Input Radius" value={data?.leads?.inputBorderRadius || 'md'} onChange={(v) => setNestedData('leads.inputBorderRadius', v)} />
          <BorderRadiusSelector label="Button Radius" value={data?.leads?.buttonBorderRadius || 'md'} onChange={(v) => setNestedData('leads.buttonBorderRadius', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Spacing */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data?.leads?.paddingY || 'md'} onChange={(v) => setNestedData('leads.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data?.leads?.paddingX || 'md'} onChange={(v) => setNestedData('leads.paddingX', v)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Section Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Section Colors</label>
          <ColorControl label={t('editor.controls.common.background')} value={data?.leads.colors?.background || '#0f172a'} onChange={(v) => setNestedData('leads.colors.background', v)} />
          <ColorControl label={t('editor.controls.common.title')} value={data?.leads.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('leads.colors.heading', v)} />
          <ColorControl label={t('editor.controls.common.subtitle')} value={data?.leads.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('leads.colors.description', v)} />
          <ColorControl label="Accent" value={data?.leads.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('leads.colors.accent', v)} />

          <div className="border-t border-editor-border/30 my-1" />

          {/* Corner Gradient */}
          <CornerGradientControl
            enabled={data?.leads?.cornerGradient?.enabled || false}
            position={data?.leads?.cornerGradient?.position || 'top-left'}
            color={data?.leads?.cornerGradient?.color || '#4f46e5'}
            opacity={data?.leads?.cornerGradient?.opacity || 30}
            size={data?.leads?.cornerGradient?.size || 50}
            onEnabledChange={(v) => setNestedData('leads.cornerGradient.enabled', v)}
            onPositionChange={(v) => setNestedData('leads.cornerGradient.position', v)}
            onColorChange={(v) => setNestedData('leads.cornerGradient.color', v)}
            onOpacityChange={(v) => setNestedData('leads.cornerGradient.opacity', v)}
            onSizeChange={(v) => setNestedData('leads.cornerGradient.size', v)}
          />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Card Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Card Colors</label>
          <ColorControl label="Card Background" value={data?.leads.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('leads.colors.cardBackground', v)} />
          <ColorControl label="Label Text" value={data?.leads.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('leads.colors.text', v)} />
          <ColorControl label="Border Color" value={data?.leads.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('leads.colors.borderColor', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Input Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Input Colors</label>
          <ColorControl label="Input Background" value={data?.leads.colors?.inputBackground || '#0f172a'} onChange={(v) => setNestedData('leads.colors.inputBackground', v)} />
          <ColorControl label="Input Text" value={data?.leads.colors?.inputText || '#F9FAFB'} onChange={(v) => setNestedData('leads.colors.inputText', v)} />
          <ColorControl label="Placeholder" value={data?.leads.colors?.inputPlaceholder || '#6b7280'} onChange={(v) => setNestedData('leads.colors.inputPlaceholder', v)} />
          <ColorControl label="Input Border" value={data?.leads.colors?.inputBorder || '#334155'} onChange={(v) => setNestedData('leads.colors.inputBorder', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Button & Gradient Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Button & Gradient</label>
          <ColorControl label="Button Background" value={data?.leads.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('leads.colors.buttonBackground', v)} />
          <ColorControl label={t('editor.controls.common.buttonText')} value={data?.leads.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('leads.colors.buttonText', v)} />
          <ColorControl label="Gradient Start" value={data?.leads.colors?.gradientStart || '#4f46e5'} onChange={(v) => setNestedData('leads.colors.gradientStart', v)} />
          <ColorControl label="Gradient End" value={data?.leads.colors?.gradientEnd || '#10b981'} onChange={(v) => setNestedData('leads.colors.gradientEnd', v)} />
        </div>
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // Newsletter Controls with Tabs
  const renderNewsletterControlsWithTabs = () => {
    if (!data?.newsletter) return null;

    const contentTab = (
      <div className="space-y-4">
        <Input label={t('editor.controls.common.title')} value={data?.newsletter.title} onChange={(e) => setNestedData('newsletter.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.newsletter.titleFontSize || 'md'} onChange={(v) => setNestedData('newsletter.titleFontSize', v)} />

        <TextArea label={t('editor.controls.common.description')} value={data?.newsletter.description} onChange={(e) => setNestedData('newsletter.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.newsletter.descriptionFontSize || 'md'} onChange={(v) => setNestedData('newsletter.descriptionFontSize', v)} />

        <Input label={t('editor.controls.common.buttonText')} value={data?.newsletter.buttonText} onChange={(e) => setNestedData('newsletter.buttonText', e.target.value)} />
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="newsletter" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Spacing */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data?.newsletter?.paddingY || 'md'} onChange={(v) => setNestedData('newsletter.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data?.newsletter?.paddingX || 'md'} onChange={(v) => setNestedData('newsletter.paddingX', v)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Section Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Section Colors</label>
          <ColorControl label={t('editor.controls.common.background')} value={data?.newsletter.colors?.background || '#000000'} onChange={(v) => setNestedData('newsletter.colors.background', v)} />
          <ColorControl label="Section Title" value={data?.newsletter.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('newsletter.colors.heading', v)} />
          <ColorControl label="Section Description" value={data?.newsletter.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('newsletter.colors.text', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Card Box */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Card Box</label>
          <ColorControl label="Card Background" value={data?.newsletter.colors?.cardBackground || 'rgba(79, 70, 229, 0.75)'} onChange={(v) => setNestedData('newsletter.colors.cardBackground', v)} />
          <ColorControl label="Card Border" value={data?.newsletter.colors?.borderColor || '#374151'} onChange={(v) => setNestedData('newsletter.colors.borderColor', v)} />
          <ColorControl label="Card Heading" value={data?.newsletter.colors?.cardHeading || '#ffffff'} onChange={(v) => setNestedData('newsletter.colors.cardHeading', v)} />
          <ColorControl label="Card Text" value={data?.newsletter.colors?.cardText || '#ffffff'} onChange={(v) => setNestedData('newsletter.colors.cardText', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Input Field */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Input Field</label>
          <ColorControl label="Input Background" value={data?.newsletter.colors?.inputBackground || '#111827'} onChange={(v) => setNestedData('newsletter.colors.inputBackground', v)} />
          <ColorControl label="Input Text" value={data?.newsletter.colors?.inputText || '#ffffff'} onChange={(v) => setNestedData('newsletter.colors.inputText', v)} />
          <ColorControl label="Placeholder" value={data?.newsletter.colors?.inputPlaceholder || '#6b7280'} onChange={(v) => setNestedData('newsletter.colors.inputPlaceholder', v)} />
          <ColorControl label="Input Border" value={data?.newsletter.colors?.inputBorder || '#374151'} onChange={(v) => setNestedData('newsletter.colors.inputBorder', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Button */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Button</label>
          <ColorControl label="Button Background" value={data?.newsletter.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('newsletter.colors.buttonBackground', v)} />
          <ColorControl label={t('editor.controls.common.buttonText')} value={data?.newsletter.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('newsletter.colors.buttonText', v)} />
        </div>
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // CTA Controls with Tabs
  const renderCTAControlsWithTabs = () => {
    if (!data?.cta) return null;

    const contentTab = (
      <div className="space-y-4">
        <Input label={t('editor.controls.common.title')} value={data?.cta.title} onChange={(e) => setNestedData('cta.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.cta.titleFontSize || 'md'} onChange={(v) => setNestedData('cta.titleFontSize', v)} />

        <TextArea label={t('editor.controls.common.description')} value={data?.cta.description} onChange={(e) => setNestedData('cta.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.cta.descriptionFontSize || 'md'} onChange={(v) => setNestedData('cta.descriptionFontSize', v)} />

        <Input label={t('editor.controls.common.buttonText')} value={data?.cta.buttonText} onChange={(e) => setNestedData('cta.buttonText', e.target.value)} />

        {/* Link Type Selector */}
        <div className="mb-3">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Link Type</label>
          <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
            {[
              { value: 'manual', label: 'Manual URL' },
              { value: 'product', label: 'Product' },
              { value: 'collection', label: 'Collection' },
              { value: 'content', label: 'Contenido' }
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setNestedData('cta.linkType', type.value)}
                className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(data?.cta.linkType || 'manual') === type.value
                  ? 'bg-editor-accent text-editor-bg'
                  : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                  }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {(data?.cta.linkType === 'manual' || !data?.cta.linkType) && (
          <>
            <Input
              label={t('editor.controls.common.buttonLink')}
              value={data?.cta.buttonUrl || ''}
              onChange={(e) => setNestedData('cta.buttonUrl', e.target.value)}
              placeholder="https://example.com or #section"
            />
            <p className="text-xs text-editor-text-secondary -mt-2">
              Use URLs for external links or # for page sections (e.g., #contact)
            </p>
          </>
        )}

        {data?.cta.linkType === 'product' && (
          <SingleProductSelector
            storeId={activeProject?.id || ''}
            selectedProductId={data?.cta.buttonUrl?.startsWith('/product/') ? data?.cta.buttonUrl.split('/product/')[1] : undefined}
            onSelect={(id) => {
              if (id) {
                setNestedData('cta.buttonUrl', `/product/${id}`);
              } else {
                setNestedData('cta.buttonUrl', '');
              }
            }}
            label={t('editor.controls.common.selectProduct')}
          />
        )}

        {data?.cta.linkType === 'collection' && (
          <SingleCollectionSelector
            storeId={activeProject?.id || ''}
            gridCategories={data.categoryGrid?.categories || []}
            selectedCollectionId={data?.cta.collectionId}
            onSelect={(id) => {
              setNestedData('cta.collectionId', id || null);
              if (id) {
                setNestedData('cta.buttonUrl', '');
              }
            }}
            label={t('editor.controls.common.selectCollection')}
          />
        )}

        {data?.cta.linkType === 'content' && (
          <SingleContentSelector
            selectedContentPath={data?.cta.buttonUrl}
            onSelect={(path) => {
              setNestedData('cta.buttonUrl', path || '');
            }}
            label={t('editor.controls.common.selectContent')}
          />
        )}
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="cta" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Spacing */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data?.cta?.paddingY || 'md'} onChange={(v) => setNestedData('cta.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data?.cta?.paddingX || 'md'} onChange={(v) => setNestedData('cta.paddingX', v)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Colors</label>
          <ColorControl label="Section Background" value={data?.cta.colors?.background || '#0f172a'} onChange={(v) => setNestedData('cta.colors.background', v)} />
        </div>

        <hr className="border-editor-border/30" />

        {/* Card Gradient */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Card Gradient</label>
          <ColorControl label="Gradient Start" value={data?.cta.colors?.gradientStart || '#000'} onChange={(v) => setNestedData('cta.colors.gradientStart', v)} />
          <ColorControl label="Gradient End" value={data?.cta.colors?.gradientEnd || '#000'} onChange={(v) => setNestedData('cta.colors.gradientEnd', v)} />
        </div>

        <hr className="border-editor-border/30" />

        {/* Text & Button */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Text & Button</label>
          <ColorControl label={t('editor.controls.common.title')} value={data?.cta.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('cta.colors.heading', v)} />
          <ColorControl label={t('editor.controls.common.description')} value={data?.cta.colors?.text || '#ffffff'} onChange={(v) => setNestedData('cta.colors.text', v)} />
          <ColorControl label="Button Background" value={data?.cta.colors?.buttonBackground || '#ffffff'} onChange={(v) => setNestedData('cta.colors.buttonBackground', v)} />
          <ColorControl label={t('editor.controls.common.buttonText')} value={data?.cta.colors?.buttonText || '#4f46e5'} onChange={(v) => setNestedData('cta.colors.buttonText', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data?.cta?.cornerGradient?.enabled || false}
          position={data?.cta?.cornerGradient?.position || 'top-left'}
          color={data?.cta?.cornerGradient?.color || '#ffffff'}
          opacity={data?.cta?.cornerGradient?.opacity || 20}
          size={data?.cta?.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('cta.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('cta.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('cta.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('cta.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('cta.cornerGradient.size', v)}
        />
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // HowItWorks Controls with Tabs
  const renderHowItWorksControlsWithTabs = () => {
    if (!data?.howItWorks) return null;

    const contentTab = (
      <div className="space-y-4">
        {/* Content */}
        <Input label={t('editor.controls.common.title')} value={data?.howItWorks?.title} onChange={(e) => setNestedData('howItWorks.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.howItWorks?.titleFontSize || 'md'} onChange={(v) => setNestedData('howItWorks.titleFontSize', v)} />

        <TextArea label={t('editor.controls.common.description')} value={data?.howItWorks?.description} onChange={(e) => setNestedData('howItWorks.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.howItWorks?.descriptionFontSize || 'md'} onChange={(v) => setNestedData('howItWorks.descriptionFontSize', v)} />

        {/* Steps Count */}
        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Steps Count</label>
          <select
            value={data?.howItWorks?.steps || 3}
            onChange={(e) => setNestedData('howItWorks.steps', parseInt(e.target.value))}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary"
          >
            <option value={3}>3 Steps</option>
            <option value={4}>4 Steps</option>
          </select>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Steps Items */}
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Steps</label>
        {(data?.howItWorks?.items || []).map((item: any, index: number) => (
          <div key={index} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-editor-text-secondary">Step #{index + 1}</span>
              <button
                onClick={() => {
                  const newItems = (data?.howItWorks?.items || []).filter((_: any, i: number) => i !== index);
                  setNestedData('howItWorks.items', newItems);
                }}
                className="text-editor-text-secondary hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <input
              placeholder="Title"
              value={item.title}
              onChange={(e) => setNestedData(`howItWorks.items.${index}.title`, e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
            />
            <textarea
              placeholder="Description"
              value={item.description}
              onChange={(e) => setNestedData(`howItWorks.items.${index}.description`, e.target.value)}
              rows={2}
              className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
            />
            <select
              value={item.icon}
              onChange={(e) => setNestedData(`howItWorks.items.${index}.icon`, e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
            >
              {['upload', 'process', 'magic-wand', 'download', 'share', 'search'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        ))}
        <button
          onClick={() => {
            const newItems = [...(data?.howItWorks?.items || []), { title: 'New Step', description: 'Step description', icon: 'upload' }];
            setNestedData('howItWorks.items', newItems);
          }}
          className="w-full py-2 border-2 border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:border-editor-accent hover:text-editor-accent transition-colors text-sm"
        >
          + Add Step
        </button>
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="howItWorks" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Section Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Section Colors</label>
          <ColorControl label={t('editor.controls.common.background')} value={data?.howItWorks?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('howItWorks.colors.background', v)} />
          <ColorControl label="Section Title" value={data?.howItWorks?.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('howItWorks.colors.heading', v)} />
          <ColorControl label="Section Description" value={data?.howItWorks?.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('howItWorks.colors.description', v)} />
        </div>

        <hr className="border-editor-border/30" />

        {/* Step Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Step Colors</label>
          <ColorControl label="Circle Background" value={data?.howItWorks?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('howItWorks.colors.accent', v)} />
          <ColorControl label="Icon Color" value={data?.howItWorks?.colors?.iconColor || '#ffffff'} onChange={(v) => setNestedData('howItWorks.colors.iconColor', v)} />
          <ColorControl label="Step Title" value={data?.howItWorks?.colors?.stepTitle || '#ffffff'} onChange={(v) => setNestedData('howItWorks.colors.stepTitle', v)} />
          <ColorControl label="Step Description" value={data?.howItWorks?.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('howItWorks.colors.text', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Spacing */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data?.howItWorks?.paddingY || 'md'} onChange={(v) => setNestedData('howItWorks.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data?.howItWorks?.paddingX || 'md'} onChange={(v) => setNestedData('howItWorks.paddingX', v)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data?.howItWorks?.cornerGradient?.enabled || false}
          position={data?.howItWorks?.cornerGradient?.position || 'top-left'}
          color={data?.howItWorks?.cornerGradient?.color || '#4f46e5'}
          opacity={data?.howItWorks?.cornerGradient?.opacity || 30}
          size={data?.howItWorks?.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('howItWorks.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('howItWorks.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('howItWorks.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('howItWorks.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('howItWorks.cornerGradient.size', v)}
        />
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // Menu Controls with Tabs
  const renderMenuControlsWithTabs = () => {
    if (!data?.menu) return null;

    const contentTab = (
      <div className="space-y-4">
        {/* Menu Variant Selector */}
        <div className="bg-editor-panel-bg/50 p-3 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
            <Layout size={14} />
            Menu Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'classic', label: '🍽️ Classic' },
              { value: 'modern-grid', label: '✨ Modern' },
              { value: 'elegant-list', label: '📋 Elegant' },
              { value: 'full-image', label: '📷 Full Photo' }
            ].map((variant) => (
              <button
                key={variant.value}
                onClick={() => setNestedData('menu.menuVariant', variant.value)}
                className={`px-2 py-2 rounded-md border text-xs transition-all ${(data?.menu?.menuVariant || 'classic') === variant.value
                  ? 'bg-editor-accent text-editor-bg border-editor-accent shadow-sm font-bold'
                  : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                  }`}
              >
                {variant.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-editor-text-secondary mt-2 italic">
            {(data?.menu?.menuVariant || 'classic') === 'classic' && '🍽️ Traditional grid cards with images on top.'}
            {(data?.menu?.menuVariant || 'classic') === 'modern-grid' && '✨ Bento-style grid with dynamic layouts.'}
            {(data?.menu?.menuVariant || 'classic') === 'elegant-list' && '📋 Magazine-style horizontal list layout.'}
            {(data?.menu?.menuVariant || 'classic') === 'full-image' && '📷 Full photo cards with text overlay at bottom.'}
          </p>

          {/* Text Alignment - Only for full-image variant */}
          {data?.menu?.menuVariant === 'full-image' && (
            <div className="mt-4 pt-4 border-t border-editor-border/50 animate-fade-in-up">
              <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">
                Text Alignment
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'left', icon: '◀', label: 'Left' },
                  { value: 'center', icon: '●', label: 'Center' },
                  { value: 'right', icon: '▶', label: 'Right' }
                ].map((align) => (
                  <button
                    key={align.value}
                    onClick={() => setNestedData('menu.textAlignment', align.value)}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-md border text-xs transition-all ${(data?.menu?.textAlignment || 'center') === align.value
                      ? 'bg-editor-accent text-editor-bg border-editor-accent font-bold'
                      : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                      }`}
                    title={align.label}
                  >
                    <span>{align.icon}</span>
                    <span className="hidden sm:inline">{align.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Content Controls */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Content</label>
          <Input label={t('editor.controls.common.title')} value={data?.menu?.title || ''} onChange={(e) => setNestedData('menu.title', e.target.value)} />
          <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.menu?.titleFontSize || 'md'} onChange={(v) => setNestedData('menu.titleFontSize', v)} />
          <TextArea label={t('editor.controls.common.description')} value={data?.menu?.description || ''} onChange={(e) => setNestedData('menu.description', e.target.value)} rows={2} />
          <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.menu?.descriptionFontSize || 'md'} onChange={(v) => setNestedData('menu.descriptionFontSize', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Section Icon */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Section Icon</label>
          <ToggleControl
            label={t('editor.controls.common.showSectionIcon')}
            checked={data?.menu?.showIcon !== false}
            onChange={(v) => setNestedData('menu.showIcon', v)}
          />
          {data?.menu?.showIcon !== false && (
            <IconSelector
              label={t('editor.controls.common.icon')}
              value={data?.menu?.icon || 'utensils-crossed'}
              onChange={(v) => setNestedData('menu.icon', v)}
            />
          )}
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Menu Items */}
        {renderListSectionControls('menu', 'Dish', [
          { key: 'name', label: 'Dish Name', type: 'input' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'price', label: 'Price', type: 'input' },
          { key: 'imageUrl', label: 'Photo', type: 'image' },
          { key: 'category', label: 'Category', type: 'input' }
        ])}
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="menu" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Section Colors */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Section Colors</label>
          <ColorControl label={t('editor.controls.common.background')} value={data?.menu?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('menu.colors.background', v)} />
          <ColorControl label="Section Title" value={data?.menu?.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('menu.colors.heading', v)} />
          <ColorControl label="Section Text" value={data?.menu?.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('menu.colors.text', v)} />
          <ColorControl label="Accent" value={data?.menu?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('menu.colors.accent', v)} />
        </div>

        <hr className="border-editor-border/30" />

        {/* Card Colors */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Card Colors</label>
          <ColorControl label="Card Background" value={data?.menu?.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('menu.colors.cardBackground', v)} />
          <ColorControl label="Card Title" value={data?.menu?.colors?.cardTitleColor || '#ffffff'} onChange={(v) => setNestedData('menu.colors.cardTitleColor', v)} />
          <ColorControl label="Card Text" value={data?.menu?.colors?.cardText || '#94a3b8'} onChange={(v) => setNestedData('menu.colors.cardText', v)} />
          <ColorControl label="Price Color" value={data?.menu?.colors?.priceColor || '#10b981'} onChange={(v) => setNestedData('menu.colors.priceColor', v)} />
          <ColorControl label="Border Color" value={data?.menu?.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('menu.colors.borderColor', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Spacing */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data?.menu?.paddingY || 'md'} onChange={(v) => setNestedData('menu.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data?.menu?.paddingX || 'md'} onChange={(v) => setNestedData('menu.paddingX', v)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data?.menu?.cornerGradient?.enabled || false}
          position={data?.menu?.cornerGradient?.position || 'top-left'}
          color={data?.menu?.cornerGradient?.color || '#4f46e5'}
          opacity={data?.menu?.cornerGradient?.opacity || 30}
          size={data?.menu?.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('menu.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('menu.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('menu.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('menu.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('menu.cornerGradient.size', v)}
        />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Animation Controls */}
        <AnimationControls
          animationType={data?.menu?.animationType || 'fade-in-up'}
          enableCardAnimation={data?.menu?.enableCardAnimation !== false}
          onChangeAnimationType={(type) => setNestedData('menu.animationType', type)}
          onToggleAnimation={(enabled) => setNestedData('menu.enableCardAnimation', enabled)}
          label={t('editor.controls.common.cardAnimations')}
        />
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // Banner Controls with Tabs
  const renderBannerControlsWithTabs = () => {
    if (!data?.banner) return null;

    const contentTab = (
      <div className="space-y-4">
        {/* Content */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Type size={14} />
            Content
          </label>

          <AIFormControl label={t('editor.controls.common.headline')} onAssistClick={() => setAiAssistField({ path: 'banner.headline', value: data?.banner?.headline || '', context: 'Banner Headline' })}>
            <Input value={data?.banner?.headline || ''} onChange={(e) => setNestedData('banner.headline', e.target.value)} />
          </AIFormControl>
          <FontSizeSelector label="Headline Size" value={data?.banner?.headlineFontSize || 'lg'} onChange={(v) => setNestedData('banner.headlineFontSize', v)} />

          <AIFormControl label={t('editor.controls.common.subheadline')} onAssistClick={() => setAiAssistField({ path: 'banner.subheadline', value: data?.banner?.subheadline || '', context: 'Banner Subheadline' })}>
            <TextArea value={data?.banner?.subheadline || ''} onChange={(e) => setNestedData('banner.subheadline', e.target.value)} rows={2} />
          </AIFormControl>
          <FontSizeSelector label="Subheadline Size" value={data?.banner?.subheadlineFontSize || 'md'} onChange={(v) => setNestedData('banner.subheadlineFontSize', v)} />

          <hr className="border-editor-border/50 my-3" />

          <ToggleControl label={t('editor.controls.common.showButton')} checked={data?.banner?.showButton !== false} onChange={(v) => setNestedData('banner.showButton', v)} />
          {data?.banner?.showButton !== false && (
            <div className="space-y-3 animate-fade-in-up">
              <AIFormControl label={t('editor.controls.common.buttonText')} onAssistClick={() => setAiAssistField({ path: 'banner.buttonText', value: data?.banner?.buttonText || 'Get Started', context: 'Banner Button' })}>
                <Input value={data?.banner?.buttonText || 'Get Started'} onChange={(e) => setNestedData('banner.buttonText', e.target.value)} />
              </AIFormControl>

              {/* Link Type Selector */}
              <div className="mb-3">
                <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Link Type</label>
                <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                  {[
                    { value: 'manual', label: 'Manual URL' },
                    { value: 'product', label: 'Product' },
                    { value: 'collection', label: 'Collection' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setNestedData('banner.linkType', type.value)}
                      className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(data?.banner?.linkType || 'manual') === type.value
                        ? 'bg-editor-accent text-editor-bg'
                        : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                        }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Inputs based on Link Type */}
              {(data?.banner?.linkType === 'manual' || !data?.banner?.linkType) && (
                <Input
                  label={t('editor.controls.common.url')}
                  value={data?.banner?.buttonUrl || '#'}
                  onChange={(e) => setNestedData('banner.buttonUrl', e.target.value)}
                  placeholder="https://example.com"
                />
              )}

              {data?.banner?.linkType === 'product' && (
                <SingleProductSelector
                  storeId={activeProject?.id || ''}
                  selectedProductId={data?.banner?.buttonUrl?.startsWith('/product/') ? data?.banner?.buttonUrl.split('/product/')[1] : undefined}
                  onSelect={(id) => {
                    if (id) {
                      // Find product to get slug if needed, for now assuming ID usage or simple path
                      // Ideally we'd map ID to slug, but simple ID path works for many setups
                      // Or fetch product details. For this UI, we just store the path.
                      // Note: Real-world app likely needs slug. Here we use ID for simplicity as standard.
                      // BUT `SingleProductSelector` returns ID. Let's try to find slug from hook if accessible, 
                      // OR just use /product/[id] which is commonly supported. 
                      // Let's rely on ID for now or check if we have access to products map.
                      // We don't have easy access to products list here without hook. 
                      // So we'll save as /product/[id]. 
                      setNestedData('banner.buttonUrl', `/product/${id}`);
                      setNestedData('banner.collectionId', null); // Clear other types
                    } else {
                      setNestedData('banner.buttonUrl', '');
                    }
                  }}
                  label={t('editor.controls.common.selectProduct')}
                />
              )}

              {data?.banner?.linkType === 'collection' && (
                <SingleCollectionSelector
                  storeId={activeProject?.id || ''}
                  gridCategories={data.categoryGrid?.categories || []}
                  selectedCollectionId={data?.banner?.collectionId}
                  onSelect={(id) => {
                    setNestedData('banner.collectionId', id || null);
                    if (id) {
                      // Optionally clear buttonUrl or set it to collection path if your handling needs it
                      // Banner component prioritizes buttonUrl usually, so let's clear it or set it to collection path
                      // CollectionBanner logic: if (buttonUrl) window.location.href = buttonUrl; else if (collectionId) onCollectionClick
                      // So for collectionId to work, buttonUrl should probably be empty or we set buttonUrl to collection path.
                      // Let's clear buttonUrl to let CollectionBanner use collectionId logic or set a proper path:
                      setNestedData('banner.buttonUrl', '');
                    }
                  }}
                  label={t('editor.controls.common.selectCollection')}
                />
              )}
            </div>
          )}
        </div>

        {/* Background Image */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Image size={14} />
            Background Image
          </label>
          <ImagePicker
            label={t('editor.controls.common.backgroundImage')}
            value={data?.banner?.backgroundImageUrl || ''}
            onChange={(url) => setNestedData('banner.backgroundImageUrl', url)}
            generationContext="background"
          />
        </div>
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="banner" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Layout & Size */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Layout size={14} />
            Layout & Size
          </label>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Banner Height</label>
              <span className="text-xs text-editor-text-primary">{data?.banner?.height || 400}px</span>
            </div>
            <input
              type="range" min="200" max="800" step="50"
              value={data?.banner?.height || 400}
              onChange={(e) => setNestedData('banner.height', parseInt(e.target.value))}
              className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider">Text Alignment</label>
            <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => setNestedData('banner.textAlignment', align)}
                  className={`flex-1 py-2 text-xs font-medium rounded-sm transition-colors capitalize ${(data?.banner?.textAlignment || 'center') === align
                    ? 'bg-editor-accent text-editor-bg'
                    : 'text-editor-text-secondary hover:text-editor-text-primary'
                    }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical Padding" value={data?.banner?.paddingY || 'md'} onChange={(v) => setNestedData('banner.paddingY', v)} />
            <PaddingSelector label="Horizontal Padding" value={data?.banner?.paddingX || 'md'} onChange={(v) => setNestedData('banner.paddingX', v)} />
          </div>
        </div>

        {/* Colors */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Palette size={14} />
            Colors
          </label>

          <ColorControl label="Background Color" value={data?.banner?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('banner.colors.background', v)} />

          <hr className="border-editor-border/50 my-3" />
          <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Overlay</h5>
          <ToggleControl label={t('editor.controls.common.enableOverlay')} checked={data?.banner?.overlayEnabled !== false} onChange={(v) => setNestedData('banner.overlayEnabled', v)} />

          {data?.banner?.overlayEnabled !== false && (
            <div className="space-y-3 animate-fade-in-up mt-3">
              <ColorControl label={t('editor.controls.common.overlayColor')} value={data?.banner?.colors?.overlayColor || '#000000'} onChange={(v) => setNestedData('banner.colors.overlayColor', v)} />

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Overlay Opacity</label>
                  <span className="text-xs text-editor-text-primary">{data?.banner?.backgroundOverlayOpacity ?? 50}%</span>
                </div>
                <input
                  type="range" min="0" max="100" step="5"
                  value={data?.banner?.backgroundOverlayOpacity ?? 50}
                  onChange={(e) => setNestedData('banner.backgroundOverlayOpacity', parseInt(e.target.value))}
                  className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                />
              </div>
            </div>
          )}

          <hr className="border-editor-border/50 my-3" />
          <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Text</h5>
          <ColorControl label="Headline Color" value={data?.banner?.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('banner.colors.heading', v)} />
          <ColorControl label="Subheadline Color" value={data?.banner?.colors?.text || '#ffffff'} onChange={(v) => setNestedData('banner.colors.text', v)} />

          {data?.banner?.showButton !== false && (
            <>
              <hr className="border-editor-border/50 my-3" />
              <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Button</h5>
              <ColorControl label="Button Background" value={data?.banner?.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('banner.colors.buttonBackground', v)} />
              <ColorControl label={t('editor.controls.common.buttonText')} value={data?.banner?.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('banner.colors.buttonText', v)} />
            </>
          )}
        </div>
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // Pricing Controls with Tabs
  const renderPricingControlsWithTabs = () => {
    if (!data?.pricing) return null;
    const currentVariant = data.pricing.pricingVariant || 'classic';

    const contentTab = (
      <div className="space-y-4">
        {/* Variant Selector */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider">Style Variant</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'classic', label: 'Classic', desc: 'Traditional card layout' },
              { value: 'gradient', label: 'Gradient', desc: 'Vibrant gradients' },
              { value: 'glassmorphism', label: 'Glass', desc: 'Frosted glass effect' },
              { value: 'minimalist', label: 'Minimal', desc: 'Clean & simple' }
            ].map((variant) => (
              <button
                key={variant.value}
                onClick={() => setNestedData('pricing.pricingVariant', variant.value)}
                className={`
                  p-3 text-left rounded-lg border transition-all
                  ${currentVariant === variant.value
                    ? 'bg-editor-accent border-editor-accent text-editor-bg'
                    : 'bg-editor-panel-bg border-editor-border text-editor-text-secondary hover:border-editor-accent/50'
                  }
                `}
              >
                <div className={`text-xs font-bold mb-1 ${currentVariant === variant.value ? 'text-editor-bg' : 'text-editor-text-primary'}`}>
                  {variant.label}
                </div>
                <div className={`text-[10px] ${currentVariant === variant.value ? 'text-editor-bg/80' : 'text-editor-text-secondary'}`}>
                  {variant.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        <Input label={t('editor.controls.common.title')} value={data.pricing.title} onChange={(e) => setNestedData('pricing.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.pricing.titleFontSize || 'md'} onChange={(v) => setNestedData('pricing.titleFontSize', v)} />

        <TextArea label={t('editor.controls.common.description')} value={data.pricing.description} onChange={(e) => setNestedData('pricing.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.pricing.descriptionFontSize || 'md'} onChange={(v) => setNestedData('pricing.descriptionFontSize', v)} />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Pricing Tiers */}
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Pricing Tiers</label>
        {(data.pricing.tiers || []).map((tier: any, index: number) => (
          <div
            key={index}
            data-section-item={`pricing:${index}`}
            className="bg-editor-bg p-4 rounded-lg border border-editor-border mb-3 group"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-editor-text-secondary">Tier #{index + 1}</span>
              <button onClick={() => {
                const newTiers = data.pricing.tiers.filter((_: any, i: number) => i !== index);
                setNestedData('pricing.tiers', newTiers);
              }} className="text-editor-text-secondary hover:text-red-400"><Trash2 size={14} /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Plan Name" value={tier.name} onChange={(e) => setNestedData(`pricing.tiers.${index}.name`, e.target.value)} className="mb-0" />
                <Input placeholder="Price" value={tier.price} onChange={(e) => setNestedData(`pricing.tiers.${index}.price`, e.target.value)} className="mb-0" />
              </div>

              <Input placeholder="Frequency (e.g. /month)" value={tier.frequency} onChange={(e) => setNestedData(`pricing.tiers.${index}.frequency`, e.target.value)} className="mb-0" />

              <TextArea
                placeholder="Description (optional)"
                value={tier.description || ''}
                onChange={(e) => setNestedData(`pricing.tiers.${index}.description`, e.target.value)}
                rows={2}
                className="mb-0"
              />

              <div>
                <label className="block text-[10px] font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Features (One per line)</label>
                <textarea
                  value={tier.features.join('\n')}
                  onChange={(e) => setNestedData(`pricing.tiers.${index}.features`, e.target.value.split('\n').filter((f: string) => f.trim()))}
                  rows={4}
                  placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                  className="w-full bg-editor-panel-bg border border-editor-border rounded px-3 py-2 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Button Text"
                  value={tier.buttonText}
                  onChange={(e) => setNestedData(`pricing.tiers.${index}.buttonText`, e.target.value)}
                  className="mb-0"
                />
                <Input
                  placeholder="Button Link"
                  value={tier.buttonLink || ''}
                  onChange={(e) => setNestedData(`pricing.tiers.${index}.buttonLink`, e.target.value)}
                  className="mb-0"
                />
              </div>

              <ToggleControl
                label="Featured Plan (Highlighted)"
                checked={tier.featured}
                onChange={(v) => setNestedData(`pricing.tiers.${index}.featured`, v)}
              />
            </div>
          </div>
        ))}

        <button
          onClick={() => setNestedData('pricing.tiers', [
            ...data.pricing.tiers,
            { name: 'New Plan', price: '$0', frequency: '/mo', description: '', features: [], buttonText: 'Get Started', buttonLink: '#', featured: false }
          ])}
          className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus size={14} /> Add Pricing Tier
        </button>
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="pricing" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Spacing */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data.pricing.paddingY || 'md'} onChange={(v) => setNestedData('pricing.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data.pricing.paddingX || 'md'} onChange={(v) => setNestedData('pricing.paddingX', v)} />
          </div>
        </div>

        <BorderRadiusSelector label="Card Corners" value={data.pricing.cardBorderRadius || 'xl'} onChange={(v) => setNestedData('pricing.cardBorderRadius', v)} />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Section Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Section Colors</label>
          <ColorControl label={t('editor.controls.common.background')} value={data.pricing.colors?.background} onChange={(v) => setNestedData('pricing.colors.background', v)} />
          <ColorControl label={t('editor.controls.common.title')} value={data.pricing.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.heading', v)} />
          <ColorControl label={t('editor.controls.common.description')} value={data.pricing.colors?.description || data.pricing.colors?.text} onChange={(v) => setNestedData('pricing.colors.description', v)} />
          <ColorControl label="Text" value={data.pricing.colors?.text} onChange={(v) => setNestedData('pricing.colors.text', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Card Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Card Colors</label>
          <ColorControl label="Card Background" value={data.pricing.colors?.cardBackground || '#1f2937'} onChange={(v) => setNestedData('pricing.colors.cardBackground', v)} />
          <ColorControl label="Card Title" value={data.pricing.colors?.cardHeading || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.cardHeading', v)} />
          <ColorControl label="Card Text" value={data.pricing.colors?.cardText || '#94a3b8'} onChange={(v) => setNestedData('pricing.colors.cardText', v)} />
          <ColorControl label="Price Color" value={data.pricing.colors?.priceColor || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.priceColor', v)} />
          <ColorControl label="Border Color" value={data.pricing.colors?.borderColor || '#374151'} onChange={(v) => setNestedData('pricing.colors.borderColor', v)} />
          <ColorControl label="Featured Accent" value={data.pricing.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('pricing.colors.accent', v)} />
          <ColorControl label="Checkmark Icon" value={data.pricing.colors?.checkmarkColor || '#10b981'} onChange={(v) => setNestedData('pricing.colors.checkmarkColor', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Button Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Button Colors</label>
          <div className="grid grid-cols-2 gap-3">
            <ColorControl label={t('editor.controls.common.background')} value={data.pricing.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('pricing.colors.buttonBackground', v)} />
            <ColorControl label="Text" value={data.pricing.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.buttonText', v)} />
          </div>
        </div>

        {/* Gradient Colors - Only for gradient variant */}
        {currentVariant === 'gradient' && (
          <>
            <div className="border-t border-editor-border/30 my-1" />
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={14} className="text-editor-accent" />
                Gradient Colors
              </label>
              <div className="grid grid-cols-2 gap-3">
                <ColorControl label="Start" value={data.pricing.colors?.gradientStart || '#4f46e5'} onChange={(v) => setNestedData('pricing.colors.gradientStart', v)} />
                <ColorControl label="End" value={data.pricing.colors?.gradientEnd || '#10b981'} onChange={(v) => setNestedData('pricing.colors.gradientEnd', v)} />
              </div>
              <div className="mt-2 p-3 rounded-lg" style={{
                backgroundImage: `linear-gradient(135deg, ${data.pricing.colors?.gradientStart || '#4f46e5'}, ${data.pricing.colors?.gradientEnd || '#10b981'})`
              }}>
                <p className="text-xs text-white font-semibold text-center">Gradient Preview</p>
              </div>
            </div>
          </>
        )}

        <div className="border-t border-editor-border/30 my-1" />

        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data.pricing.cornerGradient?.enabled || false}
          position={data.pricing.cornerGradient?.position || 'top-left'}
          color={data.pricing.cornerGradient?.color || '#4f46e5'}
          opacity={data.pricing.cornerGradient?.opacity || 30}
          size={data.pricing.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('pricing.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('pricing.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('pricing.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('pricing.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('pricing.cornerGradient.size', v)}
        />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Animation Controls */}
        <AnimationControls
          animationType={data.pricing.animationType || 'fade-in-up'}
          enableCardAnimation={data.pricing.enableCardAnimation !== false}
          onChangeAnimationType={(type) => setNestedData('pricing.animationType', type)}
          onToggleAnimation={(enabled) => setNestedData('pricing.enableCardAnimation', enabled)}
          label={t('editor.controls.common.cardAnimations')}
        />
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // Slideshow/Gallery Controls with Tabs
  const renderSlideshowControlsWithTabs = () => {
    if (!data?.slideshow) return null;

    const contentTab = (
      <div className="space-y-4">
        <Input label={t('editor.controls.common.title')} value={data.slideshow.title} onChange={(e) => setNestedData('slideshow.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.slideshow.titleFontSize || 'md'} onChange={(v) => setNestedData('slideshow.titleFontSize', v)} />

        <div className="border-t border-editor-border/30 my-1" />

        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Style Variant</label>
          <select
            value={data.slideshow.slideshowVariant || 'classic'}
            onChange={(e) => setNestedData('slideshow.slideshowVariant', e.target.value)}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
          >
            <option value="classic">Classic Slide</option>
            <option value="kenburns">Ken Burns Effect</option>
            <option value="cards3d">3D Cards Stack</option>
            <option value="thumbnails">Thumbnail Gallery</option>
          </select>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Slides */}
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Slides</label>
        {(data.slideshow.items || []).map((item: any, index: number) => (
          <div key={index} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group">
            <ImagePicker
              label={`Slide #${index + 1}`}
              value={item.imageUrl}
              onChange={(url) => setNestedData(`slideshow.items.${index}.imageUrl`, url)}
              onRemove={() => {
                const newItems = (data.slideshow.items || []).filter((_: any, i: number) => i !== index);
                setNestedData('slideshow.items', newItems);
              }}
            />
            <input
              placeholder="Alt Text"
              value={item.altText}
              onChange={(e) => setNestedData(`slideshow.items.${index}.altText`, e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mt-2"
            />
            {(data.slideshow.showCaptions ?? false) && (
              <input
                placeholder="Caption (optional)"
                value={item.caption || ''}
                onChange={(e) => setNestedData(`slideshow.items.${index}.caption`, e.target.value)}
                className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mt-2"
              />
            )}
          </div>
        ))}
        <button
          onClick={() => {
            const newItems = [...(data.slideshow.items || []), { imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800', altText: 'New slide', caption: '' }];
            setNestedData('slideshow.items', newItems);
          }}
          className="w-full py-2 bg-editor-accent text-editor-bg rounded-md hover:bg-editor-accent/90 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Plus size={16} /> Add Slide
        </button>
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="slideshow" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Border Radius */}
        <BorderRadiusSelector
          label={t('editor.controls.common.borderRadius')}
          value={data.slideshow.borderRadius || 'xl'}
          onChange={(v) => setNestedData('slideshow.borderRadius', v)}
        />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Animation Settings */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Animation</label>

          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Transition Effect</label>
            <select
              value={data.slideshow.transitionEffect || 'slide'}
              onChange={(e) => setNestedData('slideshow.transitionEffect', e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
            >
              <option value="slide">Slide</option>
              <option value="fade">Fade</option>
              <option value="zoom">Zoom</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Transition Duration (ms)</label>
            <input
              type="number"
              min="200"
              max="2000"
              step="100"
              value={data.slideshow.transitionDuration || 500}
              onChange={(e) => setNestedData('slideshow.transitionDuration', parseInt(e.target.value))}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Autoplay Speed (ms)</label>
            <input
              type="number"
              min="1000"
              max="10000"
              step="500"
              value={data.slideshow.autoPlaySpeed || 5000}
              onChange={(e) => setNestedData('slideshow.autoPlaySpeed', parseInt(e.target.value))}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
            />
          </div>

          {(data.slideshow.slideshowVariant === 'kenburns') && (
            <div>
              <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Ken Burns Intensity</label>
              <select
                value={data.slideshow.kenBurnsIntensity || 'medium'}
                onChange={(e) => setNestedData('slideshow.kenBurnsIntensity', e.target.value)}
                className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
              >
                <option value="low">Low (5% zoom)</option>
                <option value="medium">Medium (10% zoom)</option>
                <option value="high">High (25% zoom)</option>
              </select>
            </div>
          )}

          {(data.slideshow.slideshowVariant === 'thumbnails') && (
            <div>
              <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Thumbnail Height (px)</label>
              <input
                type="number"
                min="60"
                max="150"
                step="10"
                value={data.slideshow.thumbnailSize || 80}
                onChange={(e) => setNestedData('slideshow.thumbnailSize', parseInt(e.target.value))}
                className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
              />
            </div>
          )}
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Navigation */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Navigation</label>
          <ToggleControl label={t('editor.controls.common.showArrows')} checked={data.slideshow.showArrows ?? true} onChange={(v) => setNestedData('slideshow.showArrows', v)} />
          <ToggleControl label={t('editor.controls.common.showDots')} checked={data.slideshow.showDots ?? true} onChange={(v) => setNestedData('slideshow.showDots', v)} />
          <ToggleControl label={t('editor.controls.common.showCaptions')} checked={data.slideshow.showCaptions ?? false} onChange={(v) => setNestedData('slideshow.showCaptions', v)} />
        </div>

        {(data.slideshow.showArrows ?? true) && (
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Arrow Style</label>
            <select
              value={data.slideshow.arrowStyle || 'rounded'}
              onChange={(e) => setNestedData('slideshow.arrowStyle', e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
            >
              <option value="rounded">Rounded</option>
              <option value="square">Square</option>
              <option value="minimal">Minimal</option>
              <option value="floating">Floating</option>
            </select>
          </div>
        )}

        {(data.slideshow.showDots ?? true) && (
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Dot Style</label>
            <select
              value={data.slideshow.dotStyle || 'circle'}
              onChange={(e) => setNestedData('slideshow.dotStyle', e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
            >
              <option value="circle">Circle</option>
              <option value="line">Line</option>
              <option value="square">Square</option>
              <option value="pill">Pill</option>
            </select>
          </div>
        )}

        <div className="border-t border-editor-border/30 my-1" />

        {/* Spacing */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data.slideshow.paddingY || 'md'} onChange={(v) => setNestedData('slideshow.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data.slideshow.paddingX || 'md'} onChange={(v) => setNestedData('slideshow.paddingX', v)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Colors</label>
          <ColorControl label={t('editor.controls.common.background')} value={data.slideshow.colors?.background} onChange={(v) => setNestedData('slideshow.colors.background', v)} />
          <ColorControl label={t('editor.controls.common.title')} value={data.slideshow.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.heading', v)} />
        </div>

        {(data.slideshow.showArrows ?? true) && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Arrow Colors</label>
            <ColorControl label="Arrow Background" value={data.slideshow.colors?.arrowBackground || 'rgba(0, 0, 0, 0.5)'} onChange={(v) => setNestedData('slideshow.colors.arrowBackground', v)} />
            <ColorControl label="Arrow Icon" value={data.slideshow.colors?.arrowText || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.arrowText', v)} />
          </div>
        )}

        {(data.slideshow.showDots ?? true) && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Dot Colors</label>
            <ColorControl label="Active Dot" value={data.slideshow.colors?.dotActive || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.dotActive', v)} />
            <ColorControl label="Inactive Dot" value={data.slideshow.colors?.dotInactive || 'rgba(255, 255, 255, 0.5)'} onChange={(v) => setNestedData('slideshow.colors.dotInactive', v)} />
          </div>
        )}

        {(data.slideshow.showCaptions ?? false) && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Caption Colors</label>
            <ColorControl label="Caption Background" value={data.slideshow.colors?.captionBackground || 'rgba(0, 0, 0, 0.7)'} onChange={(v) => setNestedData('slideshow.colors.captionBackground', v)} />
            <ColorControl label="Caption Text" value={data.slideshow.colors?.captionText || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.captionText', v)} />
          </div>
        )}

        <div className="border-t border-editor-border/30 my-1" />

        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data.slideshow.cornerGradient?.enabled || false}
          position={data.slideshow.cornerGradient?.position || 'top-left'}
          color={data.slideshow.cornerGradient?.color || '#4f46e5'}
          opacity={data.slideshow.cornerGradient?.opacity || 30}
          size={data.slideshow.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('slideshow.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('slideshow.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('slideshow.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('slideshow.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('slideshow.cornerGradient.size', v)}
        />
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // Video Controls with Tabs
  const renderVideoControlsWithTabs = () => {
    if (!data?.video) return null;

    const contentTab = (
      <div className="space-y-4">
        <Input label={t('editor.controls.common.title')} value={data.video.title} onChange={(e) => setNestedData('video.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.video.titleFontSize || 'md'} onChange={(v) => setNestedData('video.titleFontSize', v)} />

        <TextArea label={t('editor.controls.common.description')} value={data.video.description} onChange={(e) => setNestedData('video.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.video.descriptionFontSize || 'md'} onChange={(v) => setNestedData('video.descriptionFontSize', v)} />

        <div className="border-t border-editor-border/30 my-1" />

        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Source</label>
          <select
            value={data.video.source}
            onChange={(e) => setNestedData('video.source', e.target.value)}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
          >
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
            <option value="upload">Direct URL</option>
          </select>
        </div>
        {data.video.source === 'upload' ? (
          <Input label="Video URL" value={data.video.videoUrl} onChange={(e) => setNestedData('video.videoUrl', e.target.value)} />
        ) : (
          <Input
            label={data.video.source === 'youtube' ? 'YouTube URL or Video ID' : 'Vimeo URL or Video ID'}
            value={data.video.videoId}
            onChange={(e) => setNestedData('video.videoId', extractVideoId(e.target.value, data.video.source))}
            placeholder={data.video.source === 'youtube' ? 'https://www.youtube.com/watch?v=... or dQw4w9WgXcQ' : 'https://vimeo.com/123456789 or 123456789'}
          />
        )}

        <div className="border-t border-editor-border/30 my-1" />

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Playback Options</label>
          <ToggleControl label="Autoplay (Muted)" checked={data.video.autoplay} onChange={(v) => setNestedData('video.autoplay', v)} />
          <ToggleControl label={t('editor.controls.common.loop')} checked={data.video.loop} onChange={(v) => setNestedData('video.loop', v)} />
          <ToggleControl label={t('editor.controls.common.showControls')} checked={data.video.showControls} onChange={(v) => setNestedData('video.showControls', v)} />
        </div>
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        <BackgroundImageControl sectionKey="video" />
        <div className="border-t border-editor-border/30 my-1" />
        {/* Spacing */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
          <div className="grid grid-cols-2 gap-3">
            <PaddingSelector label="Vertical" value={data.video.paddingY || 'md'} onChange={(v) => setNestedData('video.paddingY', v)} />
            <PaddingSelector label="Horizontal" value={data.video.paddingX || 'md'} onChange={(v) => setNestedData('video.paddingX', v)} />
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Colors */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Colors</label>
          <ColorControl label={t('editor.controls.common.background')} value={data.video.colors?.background} onChange={(v) => setNestedData('video.colors.background', v)} />
          <ColorControl label={t('editor.controls.common.title')} value={data.video.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('video.colors.heading', v)} />
          <ColorControl label="Text" value={data.video.colors?.text} onChange={(v) => setNestedData('video.colors.text', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data.video.cornerGradient?.enabled || false}
          position={data.video.cornerGradient?.position || 'top-left'}
          color={data.video.cornerGradient?.color || '#4f46e5'}
          opacity={data.video.cornerGradient?.opacity || 30}
          size={data.video.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('video.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('video.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('video.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('video.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('video.cornerGradient.size', v)}
        />
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // Render controls for active section with tabs
  // --- Header controls organized into Content/Style tabs ---
  const renderHeaderControlsWithTabs = () => {
    if (!data?.header) return null;
    const activeMenuId = data.header.menuId || '';

    const contentTab = (
      <div className="space-y-4">
        {/* Logo */}
        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Logo Type</label>
          <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border mb-3">
            {['text', 'image', 'both'].map(type => (
              <button
                key={type}
                onClick={() => setNestedData('header.logoType', type)}
                className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors capitalize ${data.header.logoType === type ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary'}`}
              >
                {type}
              </button>
            ))}
          </div>

          {(data.header.logoType === 'text' || data.header.logoType === 'both') && (
            <Input label={t('editor.controls.header.logoText')} value={data.header.logoText} onChange={(e) => setNestedData('header.logoText', e.target.value)} />
          )}

          {(data.header.logoType === 'image' || data.header.logoType === 'both') && (
            <div className="space-y-3 mt-3">
              <ImagePicker
                label={t('editor.controls.header.logoImage')}
                value={data.header.logoImageUrl}
                onChange={(url) => {
                  setNestedData('header.logoImageUrl', url);
                  if (data.header.logoType === 'text') {
                    setNestedData('header.logoType', 'image');
                  }
                }}
              />
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.header.logoWidth')}</label>
                  <span className="text-xs text-editor-text-primary">{data.header.logoWidth}px</span>
                </div>
                <input
                  type="range" min="40" max="300" step="5"
                  value={data.header.logoWidth}
                  onChange={(e) => setNestedData('header.logoWidth', parseInt(e.target.value))}
                  className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Favicon */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.header.favicon')}</label>
          <p className="text-xs text-editor-text-secondary">{t('editor.controls.header.uploadFavicon')}</p>

          <div className="flex items-center gap-4">
            {activeProject?.faviconUrl ? (
              <div className="relative">
                <img
                  src={activeProject.faviconUrl}
                  alt="Favicon"
                  className="w-12 h-12 rounded-lg border border-editor-border object-contain bg-editor-bg p-1"
                />
                <button
                  onClick={async () => {
                    if (activeProject) {
                      try {
                        await updateProjectFavicon(activeProject.id, null as any);
                      } catch (error) {
                        console.error('Failed to remove favicon:', error);
                      }
                    }
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                  title="Remove favicon"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg border-2 border-dashed border-editor-border flex items-center justify-center bg-editor-bg">
                <Upload size={16} className="text-editor-text-secondary" />
              </div>
            )}

            <input
              ref={faviconInputRef}
              type="file"
              accept=".ico,.png,.svg,image/png,image/svg+xml,image/x-icon"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file && activeProject) {
                  setIsUploadingFavicon(true);
                  try {
                    await updateProjectFavicon(activeProject.id, file);
                  } catch (error) {
                    console.error('Failed to upload favicon:', error);
                  } finally {
                    setIsUploadingFavicon(false);
                  }
                }
                e.target.value = '';
              }}
            />

            <button
              onClick={() => faviconInputRef.current?.click()}
              disabled={isUploadingFavicon}
              className="flex items-center gap-2 px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-sm text-editor-text-primary hover:bg-editor-panel-bg transition-colors disabled:opacity-50"
            >
              {isUploadingFavicon ? (
                <>
                  <span className="w-4 h-4 border-2 border-editor-accent border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  {activeProject?.faviconUrl ? t('editor.controls.header.change') : t('editor.controls.header.upload')}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Login Button */}
        <div className="space-y-3">
          <ToggleControl label={t('editor.controls.navigation.showLogin')} checked={data.header.showLogin !== false} onChange={(v) => setNestedData('header.showLogin', v)} />
          {data.header.showLogin !== false && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
              <Input label={t('editor.controls.common.text')} value={data.header.loginText || 'Login'} onChange={(e) => setNestedData('header.loginText', e.target.value)} className="mb-0" />
              <Input label={t('editor.controls.common.url')} value={data.header.loginUrl || '#'} onChange={(e) => setNestedData('header.loginUrl', e.target.value)} className="mb-0" />
            </div>
          )}
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Search */}
        <div className="space-y-3">
          <ToggleControl label={t('editor.controls.navigation.showSearch')} checked={data.header.showSearch === true} onChange={(v) => setNestedData('header.showSearch', v)} />
          {data.header.showSearch === true && (
            <div className="animate-fade-in-up">
              <Input label={t('editor.controls.navigation.placeholder')} value={data.header.searchPlaceholder || `${t('editor.controls.common.search')}...`} onChange={(e) => setNestedData('header.searchPlaceholder', e.target.value)} className="mb-0" />
            </div>
          )}
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Navigation Links */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.source')}</label>
          <div className="flex gap-2 mb-3">
            <select
              value={activeMenuId}
              onChange={(e) => {
                const val = e.target.value;
                setNestedData('header.menuId', val === '' ? undefined : val);
              }}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-2 py-2 text-sm text-editor-text-primary focus:ring-1 focus:ring-editor-accent focus:outline-none"
            >
              <option value="">{t('editor.controls.navigation.manual')}</option>
              {menus.map(menu => (
                <option key={menu.id} value={menu.id}>{menu.title}</option>
              ))}
            </select>
            <button
              onClick={() => navigate(ROUTES.NAVIGATION)}
              className="p-2 bg-editor-bg border border-editor-border rounded text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg"
              title="Manage Menus"
            >
              <Settings size={16} />
            </button>
          </div>

          {activeMenuId ? (
            <div className="p-3 bg-editor-accent/10 border border-editor-accent/20 rounded text-xs text-editor-text-primary mb-2">
              Links are currently being pulled from the <strong>{menus.find(m => m.id === activeMenuId)?.title || 'selected'}</strong> menu.
            </div>
          ) : (
            <>
              <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.navigation.customLinks')}</label>
              {(data.header.links || []).map((link, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input className="flex-1 bg-editor-bg border border-editor-border rounded px-2 py-1 text-sm text-editor-text-primary" value={link.text} onChange={(e) => setNestedData(`header.links.${i}.text`, e.target.value)} />
                  <input className="flex-1 bg-editor-bg border border-editor-border rounded px-2 py-1 text-sm text-editor-text-primary" value={link.href} onChange={(e) => setNestedData(`header.links.${i}.href`, e.target.value)} />
                  <button
                    onClick={() => {
                      const newLinks = data.header.links.filter((_, idx) => idx !== i);
                      setNestedData('header.links', newLinks);
                    }}
                    className="text-editor-text-secondary hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setNestedData('header.links', [...(data.header.links || []), { text: 'New Link', href: '#' }])}
                className="text-xs text-editor-accent hover:underline flex items-center mt-1"
              >
                <Plus size={12} className="mr-1" /> {t('editor.controls.navigation.addLink')}
              </button>
            </>
          )}
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* CTA Button */}
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.navigation.ctaButton')}</label>
        <ToggleControl label={t('editor.controls.navigation.showCta')} checked={data.header.showCta !== false} onChange={(v) => setNestedData('header.showCta', v)} />

        {data.header.showCta !== false && (
          <div className="space-y-3 animate-fade-in-up">
            <Input label={t('editor.controls.navigation.buttonText')} value={data.header.ctaText || 'Get Started'} onChange={(e) => setNestedData('header.ctaText', e.target.value)} />
          </div>
        )}
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        {/* Layout & Style */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.header.layout')}</label>
            <select
              value={data.header.layout}
              onChange={(e) => setNestedData('header.layout', e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-2 py-2 text-sm text-editor-text-primary"
            >
              <option value="minimal">{t('editor.controls.header.minimal')}</option>
              <option value="classic">Classic</option>
              <option value="center">Center</option>
              <option value="stack">Stack</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.header.style')}</label>
            <select
              value={data.header.style}
              onChange={(e) => setNestedData('header.style', e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-2 py-2 text-sm text-editor-text-primary"
            >
              <optgroup label={`── ${t('editor.controls.header.classic')} ──`}>
                <option value="sticky-solid">Solid</option>
                <option value="sticky-transparent">Transparent</option>
                <option value="floating">Floating</option>
              </optgroup>
              <optgroup label="── Edge-to-Edge ──">
                <option value="edge-solid">Edge Solid</option>
                <option value="edge-minimal">Edge Minimal</option>
                <option value="edge-bordered">Edge Bordered</option>
              </optgroup>
              <optgroup label="── Floating ──">
                <option value="floating-pill">Floating Pill</option>
                <option value="floating-glass">{t('editor.controls.header.glass')}</option>
                <option value="floating-shadow">Floating Shadow</option>
              </optgroup>
              <optgroup label="── Transparent ──">
                <option value="transparent-blur">Transparent Blur</option>
                <option value="transparent-bordered">Transparent Bordered</option>
                <option value="transparent-gradient">Transparent Gradient</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Sticky & Glass */}
        <div className="grid grid-cols-2 gap-4">
          <ToggleControl label={t('editor.controls.header.sticky')} checked={data.header.isSticky} onChange={(v) => setNestedData('header.isSticky', v)} />
          <ToggleControl label={t('editor.controls.header.glass')} checked={data.header.glassEffect} onChange={(v) => setNestedData('header.glassEffect', v)} />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Height & Hover */}
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Height & Hover</label>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.navigation.height')}</label>
            <span className="text-xs text-editor-text-primary">{data.header.height || 70}px</span>
          </div>
          <input
            type="range" min="50" max="120" step="5"
            value={data.header.height || 70}
            onChange={(e) => setNestedData('header.height', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.hoverStyle')}</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'simple', label: 'Simple' },
              { value: 'underline', label: 'Underline' },
              { value: 'bracket', label: 'Bracket' },
              { value: 'highlight', label: 'Highlight' },
              { value: 'glow', label: 'Glow' }
            ].map(style => (
              <button
                key={style.value}
                onClick={() => setNestedData('header.hoverStyle', style.value)}
                className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors ${data.header.hoverStyle === style.value ? 'bg-editor-accent text-editor-bg' : 'bg-editor-bg text-editor-text-secondary hover:bg-editor-border border border-editor-border'}`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.navigation.linkFontSize')}</label>
            <span className="text-xs text-editor-text-primary">{data.header.linkFontSize || 14}px</span>
          </div>
          <input
            type="range" min="10" max="24" step="1"
            value={data.header.linkFontSize || 14}
            onChange={(e) => setNestedData('header.linkFontSize', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* CTA Button Style */}
        {data.header.showCta !== false && (
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.buttonRadius')}</label>
            <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
              {[{ v: 'none', l: 'None' }, { v: 'md', l: 'Med' }, { v: 'xl', l: 'Lg' }, { v: 'full', l: 'Full' }].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setNestedData('header.buttonBorderRadius', opt.v)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${data.header.buttonBorderRadius === opt.v ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-editor-border/30 my-1" />

        {/* Colors */}
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.common.colors')}</label>
        <ColorControl label={t('editor.controls.common.background')} value={data.header.colors?.background} onChange={(v) => setNestedData('header.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.text')} value={data.header.colors?.text} onChange={(v) => setNestedData('header.colors.text', v)} />
        <ColorControl label={t('editor.controls.common.accent')} value={data.header.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('header.colors.accent', v)} />
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // --- Footer controls organized into Content/Style tabs ---
  const renderFooterControlsWithTabs = () => {
    if (!data?.footer) return null;

    const contentTab = (
      <div className="space-y-4">
        {/* Logo */}
        <div>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Logo Type</label>
          <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
            {['text', 'image'].map(type => (
              <button
                key={type}
                onClick={() => setNestedData('footer.logoType', type)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${(data.footer.logoType || 'text') === type
                  ? 'bg-editor-accent text-editor-bg'
                  : 'text-editor-text-secondary hover:bg-editor-border'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {data.footer.logoType === 'image' && (
          <ImagePicker
            label={t('editor.controls.common.logoImage')}
            value={data.footer.logoImageUrl || ''}
            onChange={(url) => setNestedData('footer.logoImageUrl', url)}
          />
        )}

        <Input label={t('editor.controls.common.title')} value={data.footer.title} onChange={(e) => setNestedData('footer.title', e.target.value)} />
        <TextArea label={t('editor.controls.common.description')} value={data.footer.description} onChange={(e) => setNestedData('footer.description', e.target.value)} rows={2} />
        <Input label={t('editor.controls.common.copyright')} value={data.footer.copyrightText} onChange={(e) => setNestedData('footer.copyrightText', e.target.value)} />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Link Columns */}
        <div className="space-y-4">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Link Columns</label>
          {(data.footer.linkColumns || []).map((col, colIndex) => (
            <div key={colIndex} className="bg-editor-bg p-3 rounded border border-editor-border space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <input placeholder="Column Title" value={col.title} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.title`, e.target.value)} className="bg-transparent border-b border-editor-border focus:border-editor-accent flex-1 text-sm font-bold text-editor-text-primary px-1 min-w-0 focus:outline-none" />
                <button onClick={() => {
                  const newCols = (data.footer.linkColumns || []).filter((_, i) => i !== colIndex);
                  setNestedData('footer.linkColumns', newCols);
                }} className="text-red-400 hover:text-red-500 flex-shrink-0 hover:bg-red-500/10 rounded p-1 transition-colors"><Trash2 size={14} /></button>
              </div>

              <select
                value={col.menuId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setNestedData(`footer.linkColumns.${colIndex}.menuId`, val === '' ? undefined : val);
                }}
                className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary mb-2"
              >
                <option value="">Manual Links</option>
                {menus.map(menu => (
                  <option key={menu.id} value={menu.id}>{menu.title}</option>
                ))}
              </select>

              {col.menuId ? (
                <p className="text-[10px] text-editor-text-secondary italic">Using links from menu: {menus.find(m => m.id === col.menuId)?.title}</p>
              ) : (
                <>
                  {(col.links || []).map((link, linkIndex) => (
                    <div key={linkIndex} className="flex gap-2 items-center mb-1">
                      <input placeholder="Text" value={link.text} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.text`, e.target.value)} className="flex-1 bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary min-w-0 focus:outline-none focus:ring-1 focus:ring-editor-accent" />
                      <input placeholder="Href" value={link.href} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.href`, e.target.value)} className="flex-1 bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary min-w-0 focus:outline-none focus:ring-1 focus:ring-editor-accent" />
                      <button onClick={() => {
                        const newLinks = (col.links || []).filter((_, i) => i !== linkIndex);
                        setNestedData(`footer.linkColumns.${colIndex}.links`, newLinks);
                      }} className="text-editor-text-secondary hover:text-red-400 flex-shrink-0"><Trash2 size={12} /></button>
                    </div>
                  ))}
                  <button onClick={() => {
                    const newLinks = [...(col.links || []), { text: 'New Link', href: '#' }];
                    setNestedData(`footer.linkColumns.${colIndex}.links`, newLinks);
                  }} className="text-xs text-editor-accent hover:underline mt-1">+ Add Link</button>
                </>
              )}
            </div>
          ))}
          <button onClick={() => setNestedData('footer.linkColumns', [...(data.footer.linkColumns || []), { title: 'New Column', links: [] }])} className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"><Plus size={14} /> Add Column</button>
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Social Links */}
        <SocialLinksEditor
          socialLinks={data.footer.socialLinks}
          onUpdate={(newLinks) => setNestedData('footer.socialLinks', newLinks)}
          onUpdateHref={(index, href) => setNestedData(`footer.socialLinks.${index}.href`, href)}
        />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Contact Information */}
        <div className="space-y-4">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
            <MapPin size={14} className="text-editor-accent" />
            Contact Information
          </label>
          <Input label={t('editor.controls.common.address')} value={data.footer.contactInfo?.address || ''} onChange={(e) => setNestedData('footer.contactInfo.address', e.target.value)} placeholder="123 Main Street" />
          <div className="grid grid-cols-2 gap-2">
            <Input label={t('editor.controls.common.city')} value={data.footer.contactInfo?.city || ''} onChange={(e) => setNestedData('footer.contactInfo.city', e.target.value)} placeholder="City" />
            <Input label={t('editor.controls.common.state')} value={data.footer.contactInfo?.state || ''} onChange={(e) => setNestedData('footer.contactInfo.state', e.target.value)} placeholder="State" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label={t('editor.controls.common.zipCode')} value={data.footer.contactInfo?.zipCode || ''} onChange={(e) => setNestedData('footer.contactInfo.zipCode', e.target.value)} placeholder="12345" />
            <Input label={t('editor.controls.common.country')} value={data.footer.contactInfo?.country || ''} onChange={(e) => setNestedData('footer.contactInfo.country', e.target.value)} placeholder="Country" />
          </div>
          <Input label={t('editor.controls.common.phone')} value={data.footer.contactInfo?.phone || ''} onChange={(e) => setNestedData('footer.contactInfo.phone', e.target.value)} placeholder="+1 (555) 123-4567" />
          <Input label={t('editor.controls.common.email')} value={data.footer.contactInfo?.email || ''} onChange={(e) => setNestedData('footer.contactInfo.email', e.target.value)} placeholder="contact@example.com" />
        </div>

        <div className="border-t border-editor-border/30 my-1" />

        {/* Business Hours */}
        <div className="space-y-4">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
            <Clock size={14} className="text-editor-accent" />
            Business Hours
          </label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                const businessHours = data.footer.contactInfo?.businessHours || {};
                const monHours = businessHours.monday || { isOpen: true, openTime: '09:00', closeTime: '17:00' };
                const newHours: any = {};
                ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                  newHours[day] = { ...monHours };
                });
                setNestedData('footer.contactInfo.businessHours', { ...businessHours, ...newHours });
              }}
              className="text-xs px-2 py-1 bg-editor-accent/20 text-editor-accent rounded hover:bg-editor-accent/30 transition-colors"
            >
              Copy Mon → Weekdays
            </button>
            <button
              onClick={() => {
                const businessHours = data.footer.contactInfo?.businessHours || {};
                const monHours = businessHours.monday || { isOpen: true, openTime: '09:00', closeTime: '17:00' };
                const newHours: any = {};
                ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
                  newHours[day] = { ...monHours };
                });
                setNestedData('footer.contactInfo.businessHours', newHours);
              }}
              className="text-xs px-2 py-1 bg-editor-accent/20 text-editor-accent rounded hover:bg-editor-accent/30 transition-colors"
            >
              Copy Mon → All Days
            </button>
          </div>

          <div className="space-y-2 bg-editor-bg p-3 rounded-lg border border-editor-border">
            {[
              { key: 'monday', label: 'Mon' },
              { key: 'tuesday', label: 'Tue' },
              { key: 'wednesday', label: 'Wed' },
              { key: 'thursday', label: 'Thu' },
              { key: 'friday', label: 'Fri' },
              { key: 'saturday', label: 'Sat' },
              { key: 'sunday', label: 'Sun' },
            ].map(({ key, label }) => {
              const contactInfo = data.footer.contactInfo || {};
              const businessHours = contactInfo.businessHours || {};
              const dayHours = businessHours[key as keyof typeof businessHours] || { isOpen: false, openTime: '09:00', closeTime: '17:00' };

              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-10 text-xs font-medium text-editor-text-secondary">{label}</span>
                  <button
                    onClick={() => {
                      if (!dayHours.isOpen) {
                        setNestedData(`footer.contactInfo.businessHours.${key}`, {
                          isOpen: true,
                          openTime: dayHours.openTime || '09:00',
                          closeTime: dayHours.closeTime || '17:00'
                        });
                      } else {
                        setNestedData(`footer.contactInfo.businessHours.${key}.isOpen`, false);
                      }
                    }}
                    className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${dayHours.isOpen ? 'bg-green-500' : 'bg-editor-border'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${dayHours.isOpen ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  {dayHours.isOpen ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input type="time" value={dayHours.openTime || '09:00'} onChange={(e) => setNestedData(`footer.contactInfo.businessHours.${key}.openTime`, e.target.value)} className="w-[90px] bg-editor-panel-bg border border-editor-border rounded px-1.5 py-0.5 text-xs text-editor-text-primary" />
                      <span className="text-editor-text-secondary text-xs">-</span>
                      <input type="time" value={dayHours.closeTime || '17:00'} onChange={(e) => setNestedData(`footer.contactInfo.businessHours.${key}.closeTime`, e.target.value)} className="w-[90px] bg-editor-panel-bg border border-editor-border rounded px-1.5 py-0.5 text-xs text-editor-text-primary" />
                    </div>
                  ) : (
                    <span className="text-xs text-editor-text-secondary italic">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        {/* Font Sizes */}
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.footer.titleFontSize || 'sm'} onChange={(v) => setNestedData('footer.titleFontSize', v)} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.footer.descriptionFontSize || 'sm'} onChange={(v) => setNestedData('footer.descriptionFontSize', v)} />

        <div className="border-t border-editor-border/30 my-1" />

        {/* Colors */}
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.common.colors')}</label>
        <div className="space-y-2">
          <ColorControl label={t('editor.controls.common.background')} value={data.footer.colors?.background} onChange={(v) => setNestedData('footer.colors.background', v)} />
          <ColorControl label={t('editor.controls.common.title')} value={data.footer.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('footer.colors.heading', v)} />
          <ColorControl label="Text" value={data.footer.colors?.text} onChange={(v) => setNestedData('footer.colors.text', v)} />
        </div>
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  // --- Products controls organized into Content/Style tabs ---
  const renderProductsControlsWithTabs = () => {
    if (!data?.products) return null;

    const contentTab = (
      <div className="space-y-4">
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Type size={14} />
            Content
          </label>
          <Input label={t('editor.controls.common.title')} value={data?.products?.title || 'Nuestros Productos'} onChange={(e) => setNestedData('products.title', e.target.value)} />
          <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.products?.titleFontSize || 'lg'} onChange={(v) => setNestedData('products.titleFontSize', v)} />
          <TextArea label={t('editor.controls.common.subtitle')} value={data?.products?.subtitle || ''} onChange={(e) => setNestedData('products.subtitle', e.target.value)} rows={2} />
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-xs text-blue-400 flex items-start gap-2">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <span>Products are loaded from your Ecommerce store. Go to the Ecommerce Dashboard to add and manage products.</span>
          </p>
        </div>
      </div>
    );

    const styleTab = (
      <div className="space-y-4">
        {/* Layout */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Layout size={14} />
            Layout
          </label>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-editor-text-secondary mb-1">Style</label>
              <select
                value={data?.products?.style || 'modern'}
                onChange={(e) => setNestedData('products.style', e.target.value)}
                className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1.5 text-xs text-editor-text-primary"
              >
                <option value="minimal">Minimal</option>
                <option value="modern">Modern</option>
                <option value="elegant">Elegant</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-editor-text-secondary mb-1">Columns</label>
              <select
                value={data?.products?.columns || 4}
                onChange={(e) => setNestedData('products.columns', parseInt(e.target.value))}
                className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1.5 text-xs text-editor-text-primary"
              >
                <option value={2}>2 Columns</option>
                <option value={3}>3 Columns</option>
                <option value={4}>4 Columns</option>
                <option value={5}>5 Columns</option>
                <option value={6}>6 Columns</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-editor-text-secondary mb-1">Products Per Page</label>
              <select
                value={data?.products?.productsPerPage || 12}
                onChange={(e) => setNestedData('products.productsPerPage', parseInt(e.target.value))}
                className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1.5 text-xs text-editor-text-primary"
              >
                <option value={8}>8</option>
                <option value={12}>12</option>
                <option value={16}>16</option>
                <option value={24}>24</option>
              </select>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Settings size={14} />
            Features
          </label>
          <div className="space-y-2">
            <ToggleControl label={t('editor.controls.common.showSearch')} checked={data?.products?.showSearch !== false} onChange={(v) => setNestedData('products.showSearch', v)} />
            <ToggleControl label={t('editor.controls.common.showFilters')} checked={data?.products?.showFilters !== false} onChange={(v) => setNestedData('products.showFilters', v)} />
            <ToggleControl label={t('editor.controls.common.showPagination')} checked={data?.products?.showPagination !== false} onChange={(v) => setNestedData('products.showPagination', v)} />
            <ToggleControl label={t('editor.controls.common.showAddToCart')} checked={data?.products?.showAddToCart !== false} onChange={(v) => setNestedData('products.showAddToCart', v)} />
            <ToggleControl label={t('editor.controls.common.showQuickView')} checked={data?.products?.showQuickView === true} onChange={(v) => setNestedData('products.showQuickView', v)} />
            <ToggleControl label={t('editor.controls.common.showWishlist')} checked={data?.products?.showWishlist === true} onChange={(v) => setNestedData('products.showWishlist', v)} />
          </div>
        </div>

        {/* Colors */}
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
            <Palette size={14} />
            Colors
          </label>
          <ColorControl label={t('editor.controls.common.background')} value={data?.products?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('products.colors.background', v)} />
          <ColorControl label="Heading" value={data?.products?.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('products.colors.heading', v)} />
          <ColorControl label="Text" value={data?.products?.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('products.colors.text', v)} />
          <ColorControl label="Accent" value={data?.products?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('products.colors.accent', v)} />
          <ColorControl label="Card Background" value={data?.products?.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('products.colors.cardBackground', v)} />
          <ColorControl label="Card Text" value={data?.products?.colors?.cardText || '#F9FAFB'} onChange={(v) => setNestedData('products.colors.cardText', v)} />
          <ColorControl label="Button Background" value={data?.products?.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('products.colors.buttonBackground', v)} />
          <ColorControl label={t('editor.controls.common.buttonText')} value={data?.products?.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('products.colors.buttonText', v)} />
        </div>
      </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
  };

  const renderActiveSectionControls = () => {
    if (!activeSection) return null;

    const config = sectionConfig[activeSection];
    if (!config) return null;

    // Use tabbed controls for all major sections
    switch (activeSection) {
      case 'hero':
        return renderHeroControlsWithTabs();
      case 'features':
        return renderFeaturesControlsWithTabs();
      case 'testimonials':
        return renderTestimonialsControlsWithTabs();
      case 'services':
        return renderServicesControlsWithTabs();
      case 'team':
        return renderTeamControlsWithTabs();
      case 'faq':
        return renderFAQControlsWithTabs();
      case 'portfolio':
        return renderPortfolioControlsWithTabs();
      case 'leads':
        return renderLeadsControlsWithTabs();
      case 'newsletter':
        return renderNewsletterControlsWithTabs();
      case 'cta':
        return renderCTAControlsWithTabs();
      case 'howItWorks':
        return renderHowItWorksControlsWithTabs();
      case 'menu':
        return renderMenuControlsWithTabs();
      case 'banner':
        return renderBannerControlsWithTabs();
      case 'pricing':
        return renderPricingControlsWithTabs();
      case 'slideshow':
        return renderSlideshowControlsWithTabs();
      case 'video':
        return renderVideoControlsWithTabs();
      case 'header':
        return renderHeaderControlsWithTabs();
      case 'footer':
        return renderFooterControlsWithTabs();
      case 'products':
        return renderProductsControlsWithTabs();
      case 'heroSplit':
        return renderHeroSplitControls();
      case 'map':
        return renderMapControls();
      // Ecommerce components - use pre-computed results from hooks called at component top level
      // These hooks return { contentTab, styleTab } objects that must be wrapped in TabbedControls
      case 'featuredProducts':
        return featuredProductsControls ? <TabbedControls contentTab={featuredProductsControls.contentTab} styleTab={featuredProductsControls.styleTab} /> : null;
      case 'categoryGrid':
        return categoryGridControls ? <TabbedControls contentTab={categoryGridControls.contentTab} styleTab={categoryGridControls.styleTab} /> : null;
      case 'productHero':
        return productHeroControls ? <TabbedControls contentTab={productHeroControls.contentTab} styleTab={productHeroControls.styleTab} /> : null;
      case 'trustBadges':
        return trustBadgesControls ? <TabbedControls contentTab={trustBadgesControls.contentTab} styleTab={trustBadgesControls.styleTab} /> : null;
      case 'saleCountdown':
        return saleCountdownControls ? <TabbedControls contentTab={saleCountdownControls.contentTab} styleTab={saleCountdownControls.styleTab} /> : null;
      case 'announcementBar':
        return announcementBarControls ? <TabbedControls contentTab={announcementBarControls.contentTab} styleTab={announcementBarControls.styleTab} /> : null;
      case 'collectionBanner':
        return collectionBannerControls ? <TabbedControls contentTab={collectionBannerControls.contentTab} styleTab={collectionBannerControls.styleTab} /> : null;
      case 'recentlyViewed':
        return recentlyViewedControls ? <TabbedControls contentTab={recentlyViewedControls.contentTab} styleTab={recentlyViewedControls.styleTab} /> : null;
      case 'productReviews':
        return productReviewsControls ? <TabbedControls contentTab={productReviewsControls.contentTab} styleTab={productReviewsControls.styleTab} /> : null;
      case 'productBundle':
        return productBundleControls ? <TabbedControls contentTab={productBundleControls.contentTab} styleTab={productBundleControls.styleTab} /> : null;
      case 'storeSettings':
        return storeSettingsControls ? <TabbedControls contentTab={storeSettingsControls.contentTab} styleTab={storeSettingsControls.styleTab} /> : null;
      default:
        // For sections without tabbed controls (header, footer, colors, typography, etc.)
        const controls = config.renderer();
        return controls;
    }
  };

  return (
    <>
      {/* Mobile Overlay - Click to close sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Panel: Sections List - Desktop only */}
      <div className={`
        bg-card/50 border-r border-border w-64 lg:w-72 flex-shrink-0 flex flex-col overflow-hidden
        fixed inset-y-0 left-0 z-40 transform duration-300 ease-in-out
        md:relative md:inset-auto md:z-auto md:transform-none md:h-full
        hidden md:flex
      `}>
        {/* Component Tree for active page */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ComponentTree
            componentOrder={effectiveComponentOrder}
            activeSection={activeSection}
            sectionVisibility={effectiveSectionVisibility}
            componentStatus={componentStatus}
            onSectionSelect={(section) => onSectionSelect(section as any)}
            onToggleVisibility={toggleVisibility}
            onReorder={(newOrder) => {
              if (activePage) {
                updatePage(activePage.id, { sections: newOrder });
              }
              setComponentOrder(newOrder);
              setEditorComponentOrder(newOrder);
            }}
            onAddComponent={handleAddComponent}
            onRemoveComponent={handleRemoveComponent}
            availableComponents={availableComponentsToAdd}
          />
        </div>

        <AIContentAssistant
          isOpen={!!aiAssistField}
          onClose={() => setAiAssistField(null)}
          onApply={handleAiApply}
          initialText={aiAssistField?.value || ''}
          contextPrompt={aiAssistField?.context || ''}
        />
      </div>

      {/* Mobile Bottom Sheet: Sections List */}
      <MobileBottomSheet
        isOpen={isMobile && isSidebarOpen && !activeSection}
        onClose={() => setIsSidebarOpen(false)}
        title={t('controls.sections', 'Secciones')}
      >
        <div className="min-h-[50vh]">
          <ComponentTree
            componentOrder={effectiveComponentOrder}
            activeSection={activeSection}
            sectionVisibility={effectiveSectionVisibility}
            componentStatus={componentStatus}
            onSectionSelect={(section) => {
              // Select section and close sections sheet (controls sheet will open)
              onSectionSelect(section as any);
            }}
            onToggleVisibility={toggleVisibility}
            onReorder={(newOrder) => {
              if (activePage) {
                updatePage(activePage.id, { sections: newOrder });
              }
              setComponentOrder(newOrder);
              setEditorComponentOrder(newOrder);
            }}
            onAddComponent={handleAddComponent}
            onRemoveComponent={handleRemoveComponent}
            availableComponents={availableComponentsToAdd}
          />
        </div>
      </MobileBottomSheet>

      {/* Controls Panel Toggle Button - Desktop only, only when section is selected, centered on border line */}
      {activeSection && isDesktop && (
        <button
          onClick={() => setIsControlsPanelOpen(!isControlsPanelOpen)}
          className={`fixed top-1/2 -translate-y-1/2 z-30 p-2 bg-card border border-border shadow-lg hover:bg-accent transition-all duration-300 overflow-hidden rounded-lg ${isControlsPanelOpen
            ? 'right-[calc(20rem-18px)] lg:right-[calc(24rem-18px)]'
            : 'right-0 rounded-l-lg rounded-r-none'
            }`}
          title={isControlsPanelOpen ? 'Ocultar controles' : 'Mostrar controles'}
        >
          {isControlsPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>
      )}

      {/* Right Panel: Properties/Controls - Desktop only */}
      {activeSection && isDesktop && (
        <div className={`${isControlsPanelOpen ? 'w-80 lg:w-96' : 'w-0 overflow-hidden'} border-l border-border bg-card/50 flex flex-col overflow-hidden flex-shrink-0 order-last hidden md:flex transition-all duration-300`}>
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Settings size={16} className="text-primary" />
              {t('landingEditor.editSection', 'Editar')}: <span className="capitalize">{getSectionLabel(activeSection)}</span>
            </h2>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSectionSelect(null as any);
                // Close sidebar on mobile when closing properties
                setIsSidebarOpen(false);
              }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title={t('controls.closePropertiesPanel')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Controls */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {renderActiveSectionControls()}
          </div>

          {/* Apply Changes Button */}
          <div className="p-4 border-t border-border flex-shrink-0">
            <button
              onClick={async () => {
                if (saveStatus === 'saving') return;
                setSaveStatus('saving');
                try {
                  await saveProject();
                  setSaveStatus('saved');
                  // Reset to idle after 2 seconds
                  setTimeout(() => setSaveStatus('idle'), 2000);
                } catch (error) {
                  console.error('Error saving:', error);
                  setSaveStatus('idle');
                }
              }}
              disabled={saveStatus === 'saving'}
              className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${saveStatus === 'saved'
                ? 'bg-green-500 text-white'
                : saveStatus === 'saving'
                  ? 'bg-primary/70 text-primary-foreground cursor-wait'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
                }`}
            >
              <Check size={16} />
              {saveStatus === 'saving'
                ? t('common.saving', 'Guardando...')
                : saveStatus === 'saved'
                  ? t('common.saved', '¡Guardado!')
                  : t('landingEditor.applyChanges', 'Aplicar cambios')}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Sheet for Controls */}
      <MobileBottomSheet
        isOpen={!!activeSection && isMobile}
        onClose={() => {
          // Deselect section and re-open sections sheet
          onSectionSelect(null as any);
          setIsSidebarOpen(true);
        }}
        title={activeSection ? getSectionLabel(activeSection) : ''}
        subtitle={t('landingEditor.editSection', 'Editar sección')}
      >
        {/* Controls */}
        <div className="p-4">
          {renderActiveSectionControls()}
        </div>

        {/* Apply Changes Button - Sticky at bottom */}
        <div className="sticky bottom-0 p-4 border-t border-border bg-card flex-shrink-0">
          <button
            onClick={async () => {
              if (saveStatus === 'saving') return;
              setSaveStatus('saving');
              try {
                await saveProject();
                setSaveStatus('saved');
                // Reset to idle after 2 seconds
                setTimeout(() => setSaveStatus('idle'), 2000);
              } catch (error) {
                console.error('Error saving:', error);
                setSaveStatus('idle');
              }
            }}
            disabled={saveStatus === 'saving'}
            className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${saveStatus === 'saved'
              ? 'bg-green-500 text-white'
              : saveStatus === 'saving'
                ? 'bg-primary/70 text-primary-foreground cursor-wait'
                : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
          >
            <Check size={16} />
            {saveStatus === 'saving'
              ? t('common.saving', 'Guardando...')
              : saveStatus === 'saved'
                ? t('common.saved', '¡Guardado!')
                : t('landingEditor.applyChanges', 'Aplicar cambios')}
          </button>
        </div>
      </MobileBottomSheet>

      {/* Tablet Slide Panel: Sections List */}
      <TabletSlidePanel
        isOpen={isTablet && isSidebarOpen && !activeSection}
        onClose={() => setIsSidebarOpen(false)}
        title={t('controls.sections', 'Secciones')}
        position="left"
      >
        <div className="min-h-[60vh]">
          <ComponentTree
            componentOrder={effectiveComponentOrder}
            activeSection={activeSection}
            sectionVisibility={effectiveSectionVisibility}
            componentStatus={componentStatus}
            onSectionSelect={(section) => {
              onSectionSelect(section as any);
            }}
            onToggleVisibility={toggleVisibility}
            onReorder={(newOrder) => {
              if (activePage) {
                updatePage(activePage.id, { sections: newOrder });
              }
              setComponentOrder(newOrder);
              setEditorComponentOrder(newOrder);
            }}
            onAddComponent={handleAddComponent}
            onRemoveComponent={handleRemoveComponent}
            availableComponents={availableComponentsToAdd}
          />
        </div>
      </TabletSlidePanel>

      {/* Tablet Slide Panel: Controls */}
      <TabletSlidePanel
        isOpen={isTablet && !!activeSection}
        onClose={() => {
          onSectionSelect(null as any);
          setIsSidebarOpen(true);
        }}
        title={activeSection ? getSectionLabel(activeSection) : ''}
        position="left"
      >
        {/* Controls */}
        <div className="p-4">
          {renderActiveSectionControls()}
        </div>

        {/* Apply Changes Button - Sticky at bottom */}
        <div className="sticky bottom-0 p-4 border-t border-border bg-card flex-shrink-0">
          <button
            onClick={async () => {
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
            }}
            disabled={saveStatus === 'saving'}
            className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${saveStatus === 'saved'
              ? 'bg-green-500 text-white'
              : saveStatus === 'saving'
                ? 'bg-primary/70 text-primary-foreground cursor-wait'
                : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
          >
            <Check size={16} />
            {saveStatus === 'saving'
              ? t('common.saving', 'Guardando...')
              : saveStatus === 'saved'
                ? t('common.saved', '¡Guardado!')
                : t('landingEditor.applyChanges', 'Aplicar cambios')}
          </button>
        </div>
      </TabletSlidePanel>

      {/* Page Settings Modal */}
      {showPageSettings && (
        <PageSettings
          page={pages.find(p => p.id === showPageSettings)!}
          onSave={handleSavePageSettings}
          onClose={() => setShowPageSettings(null)}
          isSlugUnique={isSlugUnique}
        />
      )}
    </>
  );
};

export default Controls;

