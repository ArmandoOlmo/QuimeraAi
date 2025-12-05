import React, { useState } from 'react';
import { PageSection } from '../../types';
import { useTranslation } from 'react-i18next';
import { 
    Layout, Image, List, Star, Users, DollarSign, 
    Briefcase, Mail, Send, MessageCircle, PlaySquare, 
    MonitorPlay, Grid, MessageSquare, Type, AlignJustify,
    HelpCircle, ChevronRight, ChevronDown, Eye, EyeOff,
    GripVertical, Plus, Search, X, MapPin, Trash2, UtensilsCrossed, Palette, Columns
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
    colors: Palette
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
    const [draggedItem, setDraggedItem] = useState<PageSection | null>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({
        structure: true,
        content: true,
        integrations: true
    });

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
        colors: t('editor.colorsSection')
    };

    const handleDragStart = (e: React.DragEvent, section: PageSection) => {
        setDraggedItem(section);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetSection: PageSection) => {
        e.preventDefault();
        if (!draggedItem || draggedItem === targetSection) return;

        const newOrder = [...componentOrder];
        const draggedIndex = newOrder.indexOf(draggedItem);
        const targetIndex = newOrder.indexOf(targetSection);

        newOrder.splice(draggedIndex, 1);
        // Adjust target index after removal
        const finalTargetIndex = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
        
        newOrder.splice(finalTargetIndex, 0, draggedItem);

        onReorder(newOrder);
        setDraggedItem(null);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    // Group sections by category - hero is now in content so it can be dragged
    // Fixed order: Colors → Typography → Navigation (header) → Footer
    // Colors and Typography are ALWAYS visible (global config sections)
    // Header and Footer depend on componentOrder
    const structureSections = [
        'colors' as PageSection,      // Always visible - global colors
        'typography' as PageSection,  // Always visible - global fonts
        ...(['header', 'footer'].filter(s => componentOrder.includes(s as PageSection)) as PageSection[])
    ];
    
    const contentSections = componentOrder.filter(s => 
        !['header', 'footer', 'typography', 'colors', 'chatbot', 'leads', 'newsletter'].includes(s) &&
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
        // Only colors, typography and footer are fixed positions - hero can be moved
        const isFixed = ['footer', 'typography', 'colors'].includes(section);

        return (
            <div
                key={section}
                draggable={isDraggable && !isFixed}
                onDragStart={(e) => isDraggable && !isFixed && handleDragStart(e, section)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, section)}
                onDragEnd={handleDragEnd}
                className={`
                    group flex items-center gap-2 px-3 py-2 cursor-pointer transition-all
                    ${isActive ? 'text-editor-accent' : 'text-editor-text-primary hover:text-editor-accent'}
                    ${draggedItem === section ? 'opacity-40' : ''}
                    ${!isVisible ? 'opacity-50' : ''}
                `}
                onClick={() => onSectionSelect(section)}
            >
                {/* Drag handle - only show for draggable items */}
                {isDraggable && !isFixed && (
                    <GripVertical 
                        size={14} 
                        className="flex-shrink-0 text-editor-text-secondary cursor-grab active:cursor-grabbing"
                    />
                )}
                <Icon 
                    size={16} 
                    className="flex-shrink-0"
                />
                
                <span className="flex-1 text-sm font-medium truncate">
                    {sectionLabels[section]}
                </span>

                {!isFixed && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleVisibility(section);
                            }}
                            className="flex-shrink-0 p-1 text-editor-text-secondary hover:text-editor-text-primary transition-colors"
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
                            className="flex-shrink-0 p-1 text-editor-text-secondary hover:text-red-500 transition-colors"
                            title={t('editor.deleteSection')}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
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
                    // Flat list when searching
                    <div className="space-y-1">
                        {filteredSections.map(section => renderSection(section, false))}
                    </div>
                ) : (
                    // Grouped view
                    <>
                        {renderGroup(t('editor.structure'), structureSections, 'structure', false)}
                        {renderGroup(t('editor.content'), contentSections, 'content', true)}
                        {renderGroup(t('editor.integrations'), integrationSections, 'integrations', true)}
                    </>
                )}
            </div>
        </div>
    );
};

export default ComponentTree;

