import React, { useState, useMemo } from 'react';
import { PageSection } from '../../types';
import { useTranslation } from 'react-i18next';
import {
    Layout, Image, List, Star, Users, DollarSign,
    Briefcase, Mail, Send, MessageCircle, PlaySquare,
    MonitorPlay, Grid, MessageSquare, Type, AlignJustify,
    HelpCircle, ChevronDown, Eye, EyeOff,
    GripVertical, Plus, Search, X, MapPin, Trash2, UtensilsCrossed, Palette, Columns,
    ShoppingBag, Clock, Shield, Package, Megaphone, Store
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
    chatbot: MessageSquare,
    footer: Type,
    header: AlignJustify,
    typography: Type,
    colors: Palette,
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
                ${isActive ? 'bg-editor-accent/10 text-editor-accent' : 'text-editor-text-primary hover:text-editor-accent hover:bg-editor-panel-bg/50'}
                ${isDragging ? 'opacity-50 shadow-lg bg-editor-panel-bg' : ''}
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
                        className="text-editor-text-secondary hover:text-editor-text-primary"
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
                        ✓
                    </button>
                    <button
                        onClick={() => setShowConfirm(false)}
                        className="px-2 py-0.5 text-xs font-medium rounded bg-editor-border/50 text-editor-text-secondary hover:bg-editor-border transition-colors"
                    >
                        ✕
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
                        className="flex-shrink-0 p-1.5 rounded text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/50 transition-colors"
                        title={isVisible ? hideLabel : showLabel}
                    >
                        {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowConfirm(true);
                        }}
                        className="flex-shrink-0 p-1.5 rounded text-editor-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
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
        <div className="flex items-center gap-2 px-3 py-2 bg-editor-panel-bg border border-editor-accent rounded-md shadow-xl">
            <GripVertical size={14} className="text-editor-accent" />
            <Icon size={16} className="text-editor-accent" />
            <span className="text-sm font-medium text-editor-text-primary">
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
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({
        structure: false,
        content: false,
        ecommerce: false,
        integrations: false
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
        chatbot: t('editor.aiChatbot'),
        footer: t('editor.footerSection'),
        header: t('editor.navigationSection'),
        typography: t('editor.typographySection'),
        colors: t('editor.colorsSection'),
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
            return !['header', 'footer', 'typography', 'colors', 'storeSettings', 'leads', 'newsletter', 'map', ...ECOMMERCE_SECTION_IDS].includes(s) &&
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

    const integrationSections = useMemo(() => {
        const seen = new Set<PageSection>();
        return componentOrder.filter(s => {
            if (seen.has(s)) return false;
            seen.add(s);
            return ['leads', 'newsletter', 'map'].includes(s) &&
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
        Array.from(new Set([...contentSections, ...ecommerceSections, ...integrationSections])),
        [contentSections, ecommerceSections, integrationSections]
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
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-bold text-editor-text-secondary uppercase tracking-wider hover:text-editor-text-primary transition-colors"
                    type="button"
                >
                    <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                        <ChevronDown size={14} />
                    </span>
                    {title}
                    <span className="text-editor-accent">({sections.length})</span>
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
        <div className="h-full flex flex-col bg-editor-bg border-r border-editor-border">
            {/* Header */}
            <div className="p-4 border-b border-editor-border">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-editor-text-primary uppercase tracking-wider">
                        {t('editor.pageStructure')}
                    </h3>
                    {availableComponents.length > 0 && (
                        <button
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className="p-1.5 text-editor-accent hover:text-editor-accent-hover transition-colors"
                            title={t('editor.addComponent')}
                        >
                            {showAddMenu ? <X size={14} /> : <Plus size={14} />}
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 bg-editor-border/40 rounded-lg px-3 py-2">
                    <Search size={14} className="text-editor-text-secondary flex-shrink-0" />
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
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-editor-text-secondary hover:text-editor-text-primary"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Add Component Menu */}
            {showAddMenu && availableComponents.length > 0 && (
                <div className="p-3 border-b border-editor-border bg-editor-panel-bg/50">
                    <div className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">
                        {t('editor.addComponent')}
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                        {availableComponents.map(section => {
                            const Icon = sectionIcons[section] || Layout;
                            return (
                                <button
                                    key={section}
                                    onClick={() => {
                                        onAddComponent(section);
                                        setShowAddMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-editor-bg transition-colors text-left"
                                >
                                    <Icon size={14} className="text-editor-accent" />
                                    <span className="text-sm text-editor-text-primary font-medium">
                                        {sectionLabels[section]}
                                    </span>
                                </button>
                            );
                        })}
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
                                {renderGroup(t('editor.structure'), structureSections, 'structure', false)}
                                {renderGroup(t('editor.content'), contentSections, 'content', true)}
                                {renderGroup('Ecommerce', ecommerceSections, 'ecommerce', true)}
                                {renderGroup(t('editor.integrations'), integrationSections, 'integrations', true)}
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
