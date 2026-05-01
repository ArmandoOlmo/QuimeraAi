import React, { useState, useMemo } from 'react';
import { PageSection } from '../../types';
import { useTranslation } from 'react-i18next';
import MobileSearchModal from './MobileSearchModal';
import {
    Layout, Image, List, Star, Users, DollarSign,
    Briefcase, Mail, Send, MessageCircle, PlaySquare,
    MonitorPlay, Grid, MessageSquare, Type, AlignJustify,
    HelpCircle, ChevronDown, Eye, EyeOff, FileText,
    GripVertical, Plus, Search, X, MapPin, Trash2, UtensilsCrossed, Palette, Columns,
    ShoppingBag, Clock, Shield, Package, Megaphone, Store, Waves, Bell, Layers, Minus,
    Home, Building2, ShoppingCart, CreditCard, Newspaper, Check, CalendarCheck, MessageSquareHeart, Workflow, PaintBucket, Link as LinkIcon
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ComponentTreeProps {
    componentOrder: PageSection[];
    activeSection: PageSection | null;
    sectionVisibility: Record<string, boolean>;
    componentStatus: Record<PageSection, boolean>;
    onSectionSelect: (section: PageSection) => void;
    onToggleVisibility: (section: PageSection) => void;
    onReorder: (newOrder: PageSection[]) => void;
    onAddComponent: (section: PageSection) => void;
    onRemoveComponent: (section: PageSection) => void;
    availableComponents: PageSection[];
}

const sectionIcons: Record<PageSection, React.ElementType> = {
    hero: Image,
    heroSplit: Columns,
    heroGallery: Image,
    heroWave: Waves,
    heroNova: MonitorPlay,
    heroLead: Mail,
    features: List,
    testimonials: Star,
    services: Layout,
    team: Users,
    pricing: DollarSign,
    faq: HelpCircle,
    portfolio: Briefcase,
    leads: Mail,
    newsletter: Send,
    cta: MessageCircle,
    slideshow: PlaySquare,
    video: MonitorPlay,
    howItWorks: Grid,
    map: MapPin,
    menu: UtensilsCrossed,
    banner: Image,
    topBar: Bell,
    logoBanner: Layers,
    chatbot: MessageSquare,
    cmsFeed: FileText,
    footer: Type,
    header: AlignJustify,
    typography: Type,
    colors: Palette,
    // Lumina sections
    heroLumina: MonitorPlay,
    featuresLumina: List,
    ctaLumina: MessageCircle,
    portfolioLumina: Briefcase,
    pricingLumina: DollarSign,
    testimonialsLumina: Star,
    faqLumina: HelpCircle,
    // Neon sections
    heroNeon: MonitorPlay,
    testimonialsNeon: MessageSquareHeart,
    featuresNeon: List,
    ctaNeon: MessageCircle,
    portfolioNeon: Briefcase,
    pricingNeon: DollarSign,
    faqNeon: HelpCircle,
    // Quimera Suite
    heroQuimera: MonitorPlay,
    featuresQuimera: List,
    pricingQuimera: DollarSign,
    testimonialsQuimera: Star,
    faqQuimera: HelpCircle,
    ctaQuimera: MessageCircle,
    platformShowcaseQuimera: Layout,
    aiCapabilitiesQuimera: MessageSquare,
    industrySolutionsQuimera: Building2,
    agencyWhiteLabelQuimera: Users,
    contentManagerQuimera: FileText,
    imageGeneratorQuimera: Image,
    chatbotWorkflowQuimera: Workflow,
    chatbotBuilderQuimera: PaintBucket,
    leadsManagerQuimera: Users,
    appointmentsQuimera: CalendarCheck,
    bioPageQuimera: LinkIcon,
    emailMarketingQuimera: Send,

    // Ecommerce
    storeSettings: Store,
    products: ShoppingBag,
    featuredProducts: ShoppingBag,
    categoryGrid: Grid,
    productHero: Image,
    saleCountdown: Clock,
    trustBadges: Shield,
    recentlyViewed: Clock,
    productReviews: Star,
    collectionBanner: Image,
    productBundle: Package,
    announcementBar: Megaphone,
    signupFloat: Mail,
    separator1: Minus,
    separator2: Minus,
    separator3: Minus,
    separator4: Minus,
    separator5: Minus,
    // Dynamic page sections
    realEstateListings: Building2,
    propertyDirectory: Building2,
    propertyDetail: Home,
    productDetail: ShoppingBag,
    categoryProducts: Grid,
    articleContent: Newspaper,
    productGrid: Grid,
    cart: ShoppingCart,
    checkout: CreditCard,
    restaurantReservation: CalendarCheck,
};

// Fixed sections that cannot be reordered
const FIXED_SECTIONS = ['header', 'footer', 'typography', 'colors', 'storeSettings'];

// Ecommerce section identifiers - defined outside component to maintain referential stability
const ECOMMERCE_SECTION_IDS: PageSection[] = [
    'storeSettings', 'products', 'featuredProducts', 'categoryGrid', 'productHero',
    'saleCountdown', 'trustBadges', 'recentlyViewed', 'productReviews',
    'collectionBanner', 'productBundle', 'announcementBar'
];

// Sortable Item Component
interface SortableSectionItemProps {
    section: PageSection;
    isActive: boolean;
    isVisible: boolean;
    isFixed: boolean;
    isDraggable: boolean;
    sectionLabel: string;
    onSelect: () => void;
    onToggleVisibility: () => void;
    onRemove: () => void;
    hideLabel: string;
    showLabel: string;
    deleteLabel: string;
    deleteConfirmMessage: string;
}

const SortableSectionItem: React.FC<SortableSectionItemProps> = ({
    section,
    isActive,
    isVisible,
    isFixed,
    isDraggable,
    sectionLabel,
    onSelect,
    onToggleVisibility,
    onRemove,
    hideLabel,
    showLabel,
    deleteLabel,
    deleteConfirmMessage,
}) => {
    const [showConfirm, setShowConfirm] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: section,
        disabled: isFixed || !isDraggable,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    const Icon = sectionIcons[section] || Layout;
    const canDrag = isDraggable && !isFixed;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                group relative flex items-center gap-2 px-3 py-2 cursor-pointer transition-all rounded-md
                ${isActive ? 'bg-q-accent/10 text-q-accent' : 'text-q-text hover:text-q-accent hover:bg-q-surface/50'}
                ${isDragging ? 'opacity-50 shadow-lg bg-q-surface' : ''}
                ${!isVisible ? 'opacity-50' : ''}
            `}
            onClick={onSelect}
        >
            {/* Drag handle */}
            {canDrag && (
                <div
                    {...attributes}
                    {...listeners}
                    className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical
                        size={14}
                        className="text-q-text-secondary hover:text-q-text"
                    />
                </div>
            )}
            <Icon size={16} className="flex-shrink-0" />

            <span className="flex-1 text-sm font-medium truncate">
                {sectionLabel}
            </span>

            {/* Inline delete confirmation */}
            {showConfirm && !isFixed && (
                <div
                    className="flex items-center gap-1 animate-in fade-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            onRemove();
                            setShowConfirm(false);
                        }}
                        className="px-2 py-0.5 text-xs font-medium rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                        <Check size={12} />
                    </button>
                    <button
                        onClick={() => setShowConfirm(false)}
                        className="px-2 py-0.5 text-xs font-medium rounded bg-q-surface-overlay/50 text-q-text-secondary hover:bg-q-surface-overlay transition-colors"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}

            {/* Action buttons */}
            {!isFixed && !showConfirm && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility();
                        }}
                        className="flex-shrink-0 p-1.5 rounded text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/50 transition-colors"
                        title={isVisible ? hideLabel : showLabel}
                    >
                        {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowConfirm(true);
                        }}
                        className="flex-shrink-0 p-1.5 rounded text-q-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title={deleteLabel}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

// Drag Overlay Item (shown while dragging)
const DragOverlayItem: React.FC<{ section: PageSection; sectionLabel: string }> = ({ section, sectionLabel }) => {
    const Icon = sectionIcons[section] || Layout;

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-q-surface border border-q-accent rounded-md shadow-xl">
            <GripVertical size={14} className="text-q-accent" />
            <Icon size={16} className="text-q-accent" />
            <span className="text-sm font-medium text-q-text">
                {sectionLabel}
            </span>
        </div>
    );
};

const ComponentTree: React.FC<ComponentTreeProps> = ({
    componentOrder,
    activeSection,
    sectionVisibility,
    componentStatus,
    onSectionSelect,
    onToggleVisibility,
    onReorder,
    onAddComponent,
    onRemoveComponent,
    availableComponents
}) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({
        structure: false,
        content: false,
        ecommerce: false,
        luminaAdd: false,
        neonAdd: false,
        quimeraAdd: false,
        legacyAdd: false,
    });
    const [activeId, setActiveId] = useState<PageSection | null>(null);

    // Configure sensors for drag detection
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const sectionLabels: Record<PageSection, string> = {
        hero: t('editor.heroSection'),
        heroSplit: t('editor.heroSplitSection'),
        heroGallery: 'Hero Gallery',
        heroWave: 'Hero Wave',
        heroNova: 'Hero Nova',
        heroLead: t('sections.heroLead', 'Hero Lead (Form)'),
        features: t('editor.featuresSection'),
        testimonials: t('editor.testimonialsSection'),
        services: t('editor.servicesSection'),
        team: t('editor.teamSection'),
        pricing: t('editor.pricingSection'),
        faq: t('editor.faqSection'),
        portfolio: t('editor.portfolioSection'),
        leads: t('editor.leadForm'),
        newsletter: t('editor.newsletterSection'),
        cta: t('editor.ctaSection'),
        slideshow: t('editor.slideshowSection'),
        video: t('editor.videoSection'),
        howItWorks: t('editor.howItWorksSection'),
        map: t('editor.locationMap'),
        menu: t('editor.restaurantMenu'),
        banner: t('editor.bannerSection'),
        topBar: t('editor.topBarSection'),
        logoBanner: t('editor.logoBannerSection'),
        chatbot: t('editor.aiChatbot'),
        cmsFeed: t('editor.cmsFeedSection', 'CMS Feed'),
        footer: t('editor.footerSection'),
        header: t('editor.navigationSection'),
        typography: t('editor.typographySection'),
        colors: t('editor.colorsSection'),
        // Lumina sections
        heroLumina: t('editor.heroLumina', 'Hero Lumina'),
        featuresLumina: t('editor.featuresLumina', 'Features Lumina'),
        ctaLumina: t('editor.ctaLumina', 'CTA Lumina'),
        portfolioLumina: t('editor.portfolioLumina', 'Portfolio Lumina'),
        pricingLumina: t('editor.pricingLumina', 'Pricing Lumina'),
        testimonialsLumina: t('editor.testimonialsLumina', 'Testimonials Lumina'),
        faqLumina: t('editor.faqLumina', 'FAQ Lumina'),

        // Neon sections
        heroNeon: t('editor.heroNeon', 'Hero Neon'),
        testimonialsNeon: t('editor.testimonialsNeon', 'Testimonials Neon'),
        featuresNeon: t('editor.featuresNeon', 'Features Neon'),
        ctaNeon: t('editor.ctaNeon', 'CTA Neon'),
        portfolioNeon: t('editor.portfolioNeon', 'Portfolio Neon'),
        pricingNeon: t('editor.pricingNeon', 'Pricing Neon'),
        faqNeon: t('editor.faqNeon', 'FAQ Neon'),

        // Quimera Suite
        heroQuimera: t('editor.heroQuimera', 'Hero Quimera'),
        featuresQuimera: t('editor.featuresQuimera', 'Features Quimera'),
        pricingQuimera: t('editor.pricingQuimera', 'Pricing Quimera'),
        testimonialsQuimera: t('editor.testimonialsQuimera', 'Testimonials Quimera'),
        faqQuimera: t('editor.faqQuimera', 'FAQ Quimera'),
        ctaQuimera: t('editor.ctaQuimera', 'CTA Quimera'),
        platformShowcaseQuimera: t('editor.platformShowcaseQuimera', 'Platform Showcase'),
        aiCapabilitiesQuimera: t('editor.aiCapabilitiesQuimera', 'AI Capabilities'),
        industrySolutionsQuimera: t('editor.industrySolutionsQuimera', 'Industry Solutions'),
        agencyWhiteLabelQuimera: t('editor.agencyWhiteLabelQuimera', 'Agency White Label'),
        contentManagerQuimera: t('editor.contentManagerQuimera', 'Content Manager'),
        imageGeneratorQuimera: t('editor.imageGeneratorQuimera', 'Image Generator'),
        chatbotWorkflowQuimera: t('editor.chatbotWorkflowQuimera', 'Chatbot & CRM Flow'),
        chatbotBuilderQuimera: t('editor.chatbotBuilderQuimera', 'Chatbot Builder'),
        leadsManagerQuimera: t('editor.leadsManagerQuimera', 'Leads CRM'),
        appointmentsQuimera: t('editor.appointmentsQuimera', 'Appointments'),
        bioPageQuimera: t('editor.bioPageQuimera', 'Smart Bio Page'),
        emailMarketingQuimera: t('editor.emailMarketingQuimera', 'AI Newsletters'),

        // Ecommerce sections
        storeSettings: 'Store Settings',
        products: 'Products Grid',
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
        signupFloat: t('editor.signupFloatSection', 'Sign Up Float'),
        separator1: t('editor.separatorSection', 'Separador 1'),
        separator2: t('editor.separatorSection', 'Separador 2'),
        separator3: t('editor.separatorSection', 'Separador 3'),
        separator4: t('editor.separatorSection', 'Separador 4'),
        separator5: t('editor.separatorSection', 'Separador 5'),
        // Dynamic page sections
        realEstateListings: t('editor.realEstateListingsSection', 'Listados Inmobiliarios'),
        propertyDirectory: t('editor.propertyDirectorySection', 'Directorio de Propiedades'),
        propertyDetail: t('editor.propertyDetailSection', 'Detalle de Propiedad'),
        productDetail: t('editor.productDetailSection', 'Detalle de Producto'),
        categoryProducts: t('editor.categoryProductsSection', 'Productos por Categoría'),
        articleContent: t('editor.articleContentSection', 'Contenido de Artículo'),
        productGrid: t('editor.productGridSection', 'Cuadrícula de Productos'),
        cart: t('editor.cartSection', 'Carrito'),
        checkout: t('editor.checkoutSection', 'Checkout'),
        restaurantReservation: t('editor.restaurantReservationSection', 'Reservaciones'),
    };

    // Group sections by category
    const structureSections = useMemo(() => [
        'colors' as PageSection,
        'typography' as PageSection,
        ...(['header', 'footer'].filter(s => componentOrder.includes(s as PageSection)) as PageSection[]),
        ...(componentOrder.includes('storeSettings') ? ['storeSettings' as PageSection] : [])
    ], [componentOrder]);

    const contentSections = useMemo(() => {
        const seen = new Set<PageSection>();
        return componentOrder.filter(s => {
            if (seen.has(s)) return false;
            seen.add(s);
            return !['header', 'footer', 'typography', 'colors', 'storeSettings', ...ECOMMERCE_SECTION_IDS].includes(s) &&
                componentStatus[s];
        });
    }, [componentOrder, componentStatus]);

    const ecommerceSections = useMemo(() => {
        const seen = new Set<PageSection>();
        return componentOrder.filter(s => {
            if (seen.has(s)) return false;
            seen.add(s);
            return ECOMMERCE_SECTION_IDS.includes(s) &&
                s !== 'storeSettings' &&
                componentStatus[s];
        });
    }, [componentOrder, componentStatus]);

    const filteredSections = useMemo(() => {
        const seen = new Set<PageSection>();
        return componentOrder.filter(section => {
            if (seen.has(section)) return false;
            seen.add(section);
            if (!searchTerm) return true;
            return sectionLabels[section]?.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [componentOrder, searchTerm, sectionLabels]);

    // All draggable sections combined for the DnD context (deduplicated)
    const allDraggableSections = useMemo(() =>
        Array.from(new Set([...contentSections, ...ecommerceSections])),
        [contentSections, ecommerceSections]
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as PageSection);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || active.id === over.id) return;

        const oldIndex = componentOrder.indexOf(active.id as PageSection);
        const newIndex = componentOrder.indexOf(over.id as PageSection);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = arrayMove(componentOrder, oldIndex, newIndex);
            onReorder(newOrder);
        }
    };

    const renderSection = (section: PageSection, isDraggable = true) => {
        const isFixed = FIXED_SECTIONS.includes(section);

        return (
            <SortableSectionItem
                key={section}
                section={section}
                isActive={activeSection === section}
                isVisible={sectionVisibility[section] ?? true}
                isFixed={isFixed}
                isDraggable={isDraggable}
                sectionLabel={sectionLabels[section]}
                onSelect={() => onSectionSelect(section)}
                onToggleVisibility={() => onToggleVisibility(section)}
                onRemove={() => onRemoveComponent(section)}
                hideLabel={t('editor.hideSection')}
                showLabel={t('editor.showSection')}
                deleteLabel={t('editor.deleteSection')}
                deleteConfirmMessage={t('editor.deleteSectionConfirm', { section: sectionLabels[section] })}
            />
        );
    };

    const renderGroup = (
        title: string,
        sections: PageSection[],
        groupKey: keyof typeof expandedGroups,
        GroupIcon: React.ElementType,
        isDraggable = true
    ) => {
        if (sections.length === 0) return null;

        const isExpanded = expandedGroups[groupKey];

        return (
            <div className="mb-4">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-bold text-q-text-secondary uppercase tracking-wider hover:text-q-text transition-colors"
                    type="button"
                >
                    <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                        <ChevronDown size={14} />
                    </span>
                    <GroupIcon size={14} className="text-q-accent" />
                    {title}
                    <span className="text-q-accent">({sections.length})</span>
                </button>

                <div
                    className={`
                        overflow-hidden transition-all duration-300 ease-in-out
                        ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
                    `}
                >
                    <div className="mt-1 space-y-1">
                        {sections.map(section => renderSection(section, isDraggable))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-q-bg border-r border-q-border">
            {/* Header */}
            <div className="p-4 border-b border-q-border">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-q-text uppercase tracking-wider">
                        {t('editor.pageStructure')}
                    </h3>
                    {availableComponents.length > 0 && (
                        <button
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className="p-1.5 text-q-accent hover:text-q-accent transition-colors"
                            title={t('editor.addComponent')}
                        >
                            {showAddMenu ? <X size={14} /> : <Plus size={14} />}
                        </button>
                    )}
                </div>

                {/* Search Bar - Desktop */}
                <div className="hidden sm:flex items-center gap-2 bg-q-surface-overlay/40 rounded-lg px-3 py-2">
                    <Search size={14} className="text-q-text-secondary flex-shrink-0" />
                    <input
                        type="text"
                        placeholder={t('editor.searchSections')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm min-w-0"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-q-text-secondary hover:text-q-text"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Mobile Search Button */}
                <button
                    onClick={() => setIsMobileSearchOpen(true)}
                    className="sm:hidden flex items-center justify-center p-2 rounded-lg bg-q-surface-overlay/40 text-q-text-secondary hover:text-q-text transition-colors"
                >
                    <Search size={14} />
                </button>

                <MobileSearchModal
                    isOpen={isMobileSearchOpen}
                    searchQuery={searchTerm}
                    onSearchChange={setSearchTerm}
                    onClose={() => setIsMobileSearchOpen(false)}
                    placeholder={t('editor.searchSections')}
                />
            </div>

            {/* Add Component Menu */}
            {showAddMenu && availableComponents.length > 0 && (
                <div className="p-3 border-b border-q-border bg-q-surface/50">
                    <div className="text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">
                        {t('editor.addComponent')}
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                        {/* Legacy Suite in Add Menu */}
                        {availableComponents.filter(s => !s.toLowerCase().includes('lumina') && !s.toLowerCase().includes('neon') && !s.toLowerCase().includes('quimera')).length > 0 && (
                            <div className="mb-1">
                                <button
                                    onClick={() => setExpandedGroups(prev => ({ ...prev, legacyAdd: !prev.legacyAdd }))}
                                    className="w-full flex items-center justify-between px-2 py-2 text-sm font-bold text-q-text-secondary hover:text-q-text hover:bg-q-bg rounded-md transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <Layers size={14} /> Legacy Suite
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${expandedGroups.legacyAdd ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {expandedGroups.legacyAdd && (
                                    <div className="pl-4 mt-1 space-y-1">
                                        {availableComponents.filter(s => !s.toLowerCase().includes('lumina') && !s.toLowerCase().includes('neon') && !s.toLowerCase().includes('quimera')).sort((a, b) => (sectionLabels[a] || a).localeCompare(sectionLabels[b] || b)).map(section => {
                                            const Icon = sectionIcons[section] || Layout;
                                            return (
                                                <button
                                                    key={section}
                                                    onClick={() => {
                                                        onAddComponent(section);
                                                        setShowAddMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-q-bg transition-colors text-left"
                                                >
                                                    <Icon size={14} className="text-q-accent" />
                                                    <span className="text-sm text-q-text font-medium">
                                                        {sectionLabels[section]}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Lumina Group in Add Menu */}
                        {availableComponents.filter(s => s.toLowerCase().includes('lumina')).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-q-border/50">
                                <button
                                    onClick={() => setExpandedGroups(prev => ({ ...prev, luminaAdd: !prev.luminaAdd }))}
                                    className="w-full flex items-center justify-between px-2 py-2 text-sm font-bold text-[#10B981] hover:bg-q-bg rounded-md transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <Layers size={14} /> Lumina Suite
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${expandedGroups.luminaAdd ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {expandedGroups.luminaAdd && (
                                    <div className="pl-4 mt-1 space-y-1">
                                        {availableComponents.filter(s => s.toLowerCase().includes('lumina')).sort((a, b) => (sectionLabels[a] || a).localeCompare(sectionLabels[b] || b)).map(section => {
                                            const Icon = sectionIcons[section] || Layout;
                                            return (
                                                <button
                                                    key={section}
                                                    onClick={() => {
                                                        onAddComponent(section);
                                                        setShowAddMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-q-bg transition-colors text-left border-l border-transparent hover:border-[#10B981]/50"
                                                >
                                                    <Icon size={14} className="text-[#10B981]" />
                                                    <span className="text-sm text-q-text font-medium">
                                                        {sectionLabels[section]}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Neon Group in Add Menu */}
                        {availableComponents.filter(s => s.toLowerCase().includes('neon')).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-q-border/50">
                                <button
                                    onClick={() => setExpandedGroups(prev => ({ ...prev, neonAdd: !prev.neonAdd }))}
                                    className="w-full flex items-center justify-between px-2 py-2 text-sm font-bold text-[#FBB92B] hover:bg-q-bg rounded-md transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <Layers size={14} /> Neon Suite
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${expandedGroups.neonAdd ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {expandedGroups.neonAdd && (
                                    <div className="pl-4 mt-1 space-y-1">
                                        {availableComponents.filter(s => s.toLowerCase().includes('neon')).sort((a, b) => (sectionLabels[a] || a).localeCompare(sectionLabels[b] || b)).map(section => {
                                            const Icon = sectionIcons[section] || Layout;
                                            return (
                                                <button
                                                    key={section}
                                                    onClick={() => {
                                                        onAddComponent(section);
                                                        setShowAddMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-q-bg transition-colors text-left border-l border-transparent hover:border-[#FBB92B]/50"
                                                >
                                                    <Icon size={14} className="text-[#FBB92B]" />
                                                    <span className="text-sm text-q-text font-medium">
                                                        {sectionLabels[section]}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Quimera Group in Add Menu */}
                        {availableComponents.filter(s => s.toLowerCase().includes('quimera')).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-q-border/50">
                                <button
                                    onClick={() => setExpandedGroups(prev => ({ ...prev, quimeraAdd: !prev.quimeraAdd }))}
                                    className="w-full flex items-center justify-between px-2 py-2 text-sm font-bold text-[#D4AF37] hover:bg-q-bg rounded-md transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <Layers size={14} /> Quimera Suite
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${expandedGroups.quimeraAdd ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {expandedGroups.quimeraAdd && (
                                    <div className="pl-4 mt-1 space-y-1">
                                        {availableComponents.filter(s => s.toLowerCase().includes('quimera')).sort((a, b) => (sectionLabels[a] || a).localeCompare(sectionLabels[b] || b)).map(section => {
                                            const Icon = sectionIcons[section] || Layout;
                                            return (
                                                <button
                                                    key={section}
                                                    onClick={() => {
                                                        onAddComponent(section);
                                                        setShowAddMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-q-bg transition-colors text-left border-l border-transparent hover:border-[#D4AF37]/50"
                                                >
                                                    <Icon size={14} className="text-[#D4AF37]" />
                                                    <span className="text-sm text-q-text font-medium">
                                                        {sectionLabels[section]}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                        
                    </div>
                </div>
            )}

            {/* Component Tree */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={componentOrder}
                        strategy={verticalListSortingStrategy}
                    >
                        {searchTerm ? (
                            <div className="space-y-1">
                                {filteredSections.map(section => renderSection(section, true))}
                            </div>
                        ) : (
                            <>
                                {renderGroup(t('editor.structure'), structureSections, 'structure', Layers, false)}
                                {renderGroup(t('editor.content'), contentSections, 'content', FileText, true)}
                                {renderGroup('Ecommerce', ecommerceSections, 'ecommerce', ShoppingBag, true)}
                            </>
                        )}
                    </SortableContext>

                    {/* Drag Overlay - Shows item being dragged */}
                    <DragOverlay>
                        {activeId ? (
                            <DragOverlayItem
                                section={activeId}
                                sectionLabel={sectionLabels[activeId]}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
};

export default ComponentTree;
