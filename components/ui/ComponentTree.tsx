import React, { useState, useRef } from 'react';
import { PageSection } from '../../types';
import { useTranslation } from 'react-i18next';
import { 
    Layout, Image, List, Star, Users, DollarSign, 
    Briefcase, Mail, Send, MessageCircle, PlaySquare, 
    MonitorPlay, Grid, MessageSquare, Type, AlignJustify,
    HelpCircle, ChevronDown, Eye, EyeOff,
    GripVertical, Plus, Search, X, MapPin, Trash2, UtensilsCrossed, Palette, Columns,
    ShoppingBag, Tag, Clock, Shield, Package, Megaphone, TrendingUp
} from 'lucide-react';

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
        structure: true,
        content: true,
        ecommerce: true,
        integrations: true
    });
    
    // Drag state
    const draggedRef = useRef<PageSection | null>(null);
    const [draggedItem, setDraggedItem] = useState<PageSection | null>(null);
    const [dropTarget, setDropTarget] = useState<PageSection | null>(null);
    const [dropPosition, setDropPosition] = useState<'before' | 'after'>('after');

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

    const handleDragStart = (e: React.DragEvent, section: PageSection) => {
        draggedRef.current = section;
        setDraggedItem(section);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', section);
    };

    const handleDragOver = (e: React.DragEvent, targetSection: PageSection) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const dragged = draggedRef.current;
        if (!dragged || dragged === targetSection) {
            setDropTarget(null);
            return;
        }

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? 'before' : 'after';
        
        setDropTarget(targetSection);
        setDropPosition(position);
    };

    const handleDrop = (e: React.DragEvent, targetSection: PageSection) => {
        e.preventDefault();
        
        const dragged = draggedRef.current;
        if (!dragged || dragged === targetSection) {
            resetDrag();
            return;
        }

        const newOrder = [...componentOrder];
        const fromIndex = newOrder.indexOf(dragged);
        const toIndex = newOrder.indexOf(targetSection);

        if (fromIndex === -1 || toIndex === -1) {
            resetDrag();
            return;
        }

        newOrder.splice(fromIndex, 1);
        
        let insertIndex = newOrder.indexOf(targetSection);
        if (insertIndex === -1) {
            resetDrag();
            return;
        }
        
        if (dropPosition === 'after') {
            insertIndex++;
        }
        
        newOrder.splice(insertIndex, 0, dragged);
        onReorder(newOrder);
        resetDrag();
    };

    const handleDragEnd = () => {
        resetDrag();
    };

    const resetDrag = () => {
        draggedRef.current = null;
        setDraggedItem(null);
        setDropTarget(null);
    };

    // Ecommerce section identifiers
    const ecommerceSectionIds: PageSection[] = [
        'products', 'featuredProducts', 'categoryGrid', 'productHero', 
        'saleCountdown', 'trustBadges', 'recentlyViewed', 'productReviews', 
        'collectionBanner', 'productBundle', 'announcementBar'
    ];

    // Group sections by category
    const structureSections = [
        'colors' as PageSection,
        'typography' as PageSection,
        ...(['header', 'footer'].filter(s => componentOrder.includes(s as PageSection)) as PageSection[])
    ];
    
    const contentSections = componentOrder.filter(s => 
        !['header', 'footer', 'typography', 'colors', 'chatbot', 'leads', 'newsletter', 'map', ...ecommerceSectionIds].includes(s) &&
        componentStatus[s]
    );

    const ecommerceSections = componentOrder.filter(s => 
        ecommerceSectionIds.includes(s) &&
        componentStatus[s]
    );
    
    const integrationSections = componentOrder.filter(s => 
        ['chatbot', 'leads', 'newsletter', 'map'].includes(s) &&
        componentStatus[s]
    );

    const filteredSections = componentOrder.filter(section => {
        if (!searchTerm) return true;
        return sectionLabels[section]?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const renderSection = (section: PageSection, isDraggable = true) => {
        const Icon = sectionIcons[section] || Layout;
        const isActive = activeSection === section;
        const isVisible = sectionVisibility[section] ?? true;
        const isFixed = ['header', 'footer', 'typography', 'colors'].includes(section);
        const isDragging = draggedItem === section;
        const isDropTargetItem = dropTarget === section && !isDragging;
        const canDrag = isDraggable && !isFixed;

        return (
            <div
                key={section}
                className="relative"
            >
                {/* Drop indicator - before */}
                {isDropTargetItem && dropPosition === 'before' && (
                    <div className="absolute left-2 right-2 -top-px h-0.5 bg-editor-accent rounded-full z-20" />
                )}
                
                <div
                    draggable={canDrag}
                    onDragStart={canDrag ? (e) => handleDragStart(e, section) : undefined}
                    onDragOver={!isFixed ? (e) => handleDragOver(e, section) : undefined}
                    onDrop={!isFixed ? (e) => handleDrop(e, section) : undefined}
                    onDragEnd={handleDragEnd}
                    className={`
                        group relative flex items-center gap-2 px-3 py-2 cursor-pointer transition-all hover:z-10
                        ${isActive ? 'text-editor-accent' : 'text-editor-text-primary hover:text-editor-accent'}
                        ${isDragging ? 'opacity-40' : ''}
                        ${!isVisible ? 'opacity-50' : ''}
                    `}
                    onClick={() => onSectionSelect(section)}
                >
                    {/* Drag handle */}
                    {canDrag && (
                        <GripVertical 
                            size={14} 
                            className="flex-shrink-0 text-editor-text-secondary cursor-grab active:cursor-grabbing"
                        />
                    )}
                    <Icon size={16} className="flex-shrink-0" />
                    
                    <span className="flex-1 text-sm font-medium truncate">
                        {sectionLabels[section]}
                    </span>

                    {/* Action buttons */}
                    {!isFixed && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleVisibility(section);
                                }}
                                className="flex-shrink-0 p-1.5 rounded text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/50 transition-colors"
                                title={isVisible ? t('editor.hideSection') : t('editor.showSection')}
                            >
                                {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(t('editor.deleteSectionConfirm', { section: sectionLabels[section] }))) {
                                        onRemoveComponent(section);
                                    }
                                }}
                                className="flex-shrink-0 p-1.5 rounded text-editor-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                title={t('editor.deleteSection')}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Drop indicator - after */}
                {isDropTargetItem && dropPosition === 'after' && (
                    <div className="absolute left-2 right-2 -bottom-px h-0.5 bg-editor-accent rounded-full z-20" />
                )}
            </div>
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
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-editor-text-secondary" />
                    <input
                        type="text"
                        placeholder={t('editor.searchSections')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-editor-panel-bg border border-editor-border rounded-md text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-editor-accent"
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
                {searchTerm ? (
                    <div className="space-y-1">
                        {filteredSections.map(section => renderSection(section, false))}
                    </div>
                ) : (
                    <>
                        {renderGroup(t('editor.structure'), structureSections, 'structure', false)}
                        {renderGroup(t('editor.content'), contentSections, 'content', true)}
                        {renderGroup('Ecommerce', ecommerceSections, 'ecommerce', true)}
                        {renderGroup(t('editor.integrations'), integrationSections, 'integrations', true)}
                    </>
                )}
            </div>
        </div>
    );
};

export default ComponentTree;
