import React, { useState, useMemo, useCallback } from 'react';
import { PageSection } from '../../types';
import { isRetiredDesignSuiteSection } from '../../data/retiredSuites';
import { getRegistryItem } from '../../data/componentRegistry';
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

const sectionIcons: Partial<Record<PageSection, React.ElementType>> = {
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
    appointmentBooking: CalendarCheck,
    restaurantReservation: CalendarCheck,
};

// Fixed sections that cannot be reordered
const FIXED_SECTIONS = ['header', 'footer', 'typography', 'colors', 'storeSettings'];

const isEcommerceSection = (section: PageSection): boolean =>
    getRegistryItem(section)?.role === 'ecommerce';

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
                group relative flex items-center gap-2 px-3 py-2 cursor-pointer transition-all rounded-[var(--q-radius-md)] border
                ${isActive
                    ? 'border-q-accent bg-q-accent text-q-text-on-accent shadow-[var(--shadow-card)] dark:bg-q-accent/10 dark:text-q-accent dark:border-q-accent/30 dark:shadow-none black:bg-q-accent/10 black:text-q-accent black:border-q-accent/30 black:shadow-none'
                    : 'border-transparent text-q-text hover:border-structure-control-border hover:bg-structure-control-hover hover:text-q-text hover:shadow-[inset_0_0_0_1px_hsl(var(--structure-control-border))]'
                }
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
                        className={isActive ? 'text-q-text-on-accent/75 hover:text-q-text-on-accent dark:text-q-accent/75 dark:hover:text-q-accent black:text-q-accent/75 black:hover:text-q-accent' : 'text-q-text-muted hover:text-q-text'}
                    />
                </div>
            )}
            <Icon size={16} className={isActive ? 'flex-shrink-0 text-q-text-on-accent dark:text-q-accent black:text-q-accent' : 'flex-shrink-0 text-q-text-muted group-hover:text-q-text'} />

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
                        className="px-2 py-0.5 text-xs font-medium rounded bg-q-error/20 text-q-error hover:bg-q-error/30 transition-colors"
                    >
                        <Check size={12} />
                    </button>
                    <button
                        onClick={() => setShowConfirm(false)}
                        className="px-2 py-0.5 text-xs font-medium rounded bg-structure-control text-q-text-muted hover:bg-structure-control-hover hover:text-q-text transition-colors"
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
                        className={isActive
                            ? 'flex-shrink-0 p-1.5 rounded text-q-text-on-accent/75 hover:text-q-text-on-accent hover:bg-q-text-on-accent/12 dark:text-q-accent/75 dark:hover:text-q-accent dark:hover:bg-q-accent/12 black:text-q-accent/75 black:hover:text-q-accent black:hover:bg-q-accent/12 transition-colors'
                            : 'flex-shrink-0 p-1.5 rounded text-q-text-muted hover:text-q-text hover:bg-structure-control-hover transition-colors'
                        }
                        title={isVisible ? hideLabel : showLabel}
                    >
                        {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowConfirm(true);
                        }}
                        className={isActive
                            ? 'flex-shrink-0 p-1.5 rounded text-q-text-on-accent/75 hover:text-q-error hover:bg-q-surface/25 dark:text-q-accent/75 dark:hover:text-q-error dark:hover:bg-q-error/10 black:text-q-accent/75 black:hover:text-q-error black:hover:bg-q-error/10 transition-colors'
                            : 'flex-shrink-0 p-1.5 rounded text-q-text-muted hover:text-q-error hover:bg-q-error/10 transition-colors'
                        }
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
        ecommerceAdd: false,
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

    const sectionLabels: Partial<Record<PageSection, string>> = {
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
        appointmentBooking: t('appointmentBooking.title', 'Appointment Booking'),
        restaurantReservation: t('editor.restaurantReservationSection', 'Reservaciones'),
    };

    const isComponentEnabled = useCallback((section: PageSection) => componentStatus?.[section] !== false, [componentStatus]);

    const visibleComponentOrder = useMemo(
        () => componentOrder.filter(section => !isRetiredDesignSuiteSection(section)),
        [componentOrder]
    );

    // Group sections by category
    const structureSections = useMemo(() => [
        'colors' as PageSection,
        'typography' as PageSection,
        ...(['header', 'footer'].filter(s => visibleComponentOrder.includes(s as PageSection)) as PageSection[]),
    ], [visibleComponentOrder]);

    const contentSections = useMemo(() => {
        const seen = new Set<PageSection>();
        return visibleComponentOrder.filter(s => {
            if (seen.has(s)) return false;
            seen.add(s);
            return !['header', 'footer', 'typography', 'colors'].includes(s) &&
                !isEcommerceSection(s) &&
                isComponentEnabled(s);
        });
    }, [visibleComponentOrder, isComponentEnabled]);

    const ecommerceSections = useMemo(() => {
        const seen = new Set<PageSection>();
        return visibleComponentOrder.filter(s => {
            if (seen.has(s)) return false;
            seen.add(s);
            return isEcommerceSection(s) &&
                isComponentEnabled(s);
        });
    }, [visibleComponentOrder, isComponentEnabled]);

    const filteredSections = useMemo(() => {
        const seen = new Set<PageSection>();
        return visibleComponentOrder.filter(section => {
            if (seen.has(section)) return false;
            seen.add(section);
            if (!searchTerm) return true;
            return sectionLabels[section]?.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [visibleComponentOrder, searchTerm, sectionLabels]);

    const legacyAddComponents = useMemo(
        () => availableComponents.filter(section =>
            !isEcommerceSection(section) &&
            !isRetiredDesignSuiteSection(section) &&
            !section.toLowerCase().includes('quimera')
        ),
        [availableComponents]
    );

    const ecommerceAddComponents = useMemo(
        () => availableComponents.filter(isEcommerceSection),
        [availableComponents]
    );

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

        const oldIndex = visibleComponentOrder.indexOf(active.id as PageSection);
        const newIndex = visibleComponentOrder.indexOf(over.id as PageSection);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = arrayMove(visibleComponentOrder, oldIndex, newIndex);
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
                    className="flex items-center gap-2 w-full px-3 py-1.5 rounded-[var(--q-radius-md)] text-xs font-bold text-q-text-muted uppercase tracking-wider hover:bg-structure-control-hover hover:text-q-text hover:shadow-[inset_0_0_0_1px_hsl(var(--structure-control-border))] transition-all"
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
                <div className="hidden sm:flex items-center gap-2 bg-structure-control border border-structure-control-border rounded-[var(--q-radius-md)] px-3 py-2">
                    <Search size={14} className="text-q-text-muted flex-shrink-0" />
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
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-q-text-muted hover:text-q-text"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Mobile Search Button */}
                <button
                    onClick={() => setIsMobileSearchOpen(true)}
                    className="sm:hidden flex items-center justify-center p-2 rounded-[var(--q-radius-md)] bg-structure-control border border-structure-control-border text-q-text-muted hover:bg-structure-control-hover hover:text-q-text transition-colors"
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
                <div className="p-3 border-b border-q-border bg-q-surface/70">
                    <div className="text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">
                        {t('editor.addComponent')}
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                        {/* Legacy Suite in Add Menu */}
                        {legacyAddComponents.length > 0 && (
                            <div className="mb-1">
                                <button
                                    onClick={() => setExpandedGroups(prev => ({ ...prev, legacyAdd: !prev.legacyAdd }))}
                                    className="w-full flex items-center justify-between px-2 py-2 text-sm font-bold text-q-text-muted hover:text-q-text hover:bg-structure-control-hover rounded-[var(--q-radius-md)] transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <Layers size={14} /> Legacy Suite
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${expandedGroups.legacyAdd ? 'rotate-180' : ''}`} />
                                </button>

                                {expandedGroups.legacyAdd && (
                                    <div className="pl-4 mt-1 space-y-1">
                                        {[...legacyAddComponents].sort((a, b) => (sectionLabels[a] || a).localeCompare(sectionLabels[b] || b)).map(section => {
                                            const Icon = sectionIcons[section] || Layout;
                                            return (
                                                <button
                                                    key={section}
                                                    onClick={() => {
                                                        if (!isRetiredDesignSuiteSection(section)) onAddComponent(section);
                                                        setShowAddMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-2 py-2 rounded-[var(--q-radius-md)] hover:bg-structure-control-hover transition-colors text-left"
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

                        {/* Ecommerce Suite in Add Menu */}
                        {ecommerceAddComponents.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-q-border/50">
                                <button
                                    onClick={() => setExpandedGroups(prev => ({ ...prev, ecommerceAdd: !prev.ecommerceAdd }))}
                                    className="w-full flex items-center justify-between px-2 py-2 text-sm font-bold text-q-info hover:bg-structure-control-hover rounded-[var(--q-radius-md)] transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <ShoppingBag size={14} /> Ecommerce Suite
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${expandedGroups.ecommerceAdd ? 'rotate-180' : ''}`} />
                                </button>

                                {expandedGroups.ecommerceAdd && (
                                    <div className="pl-4 mt-1 space-y-1">
                                        {[...ecommerceAddComponents].sort((a, b) => (sectionLabels[a] || a).localeCompare(sectionLabels[b] || b)).map(section => {
                                            const Icon = sectionIcons[section] || ShoppingBag;
                                            return (
                                                <button
                                                    key={section}
                                                    onClick={() => {
                                                        if (!isRetiredDesignSuiteSection(section)) onAddComponent(section);
                                                        setShowAddMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-2 py-2 rounded-[var(--q-radius-md)] hover:bg-structure-control-hover transition-colors text-left border-l border-transparent hover:border-q-info/50"
                                                >
                                                    <Icon size={14} className="text-q-info" />
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
                        items={visibleComponentOrder}
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
                                {renderGroup('Ecommerce Suite', ecommerceSections, 'ecommerce', ShoppingBag, true)}
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
