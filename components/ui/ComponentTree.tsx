import React, { useState } from 'react';
import { PageSection } from '../../types';
import { 
    Layout, Image, List, Star, Users, DollarSign, 
    Briefcase, Mail, Send, MessageCircle, PlaySquare, 
    MonitorPlay, Grid, MessageSquare, Type, AlignJustify,
    HelpCircle, ChevronRight, ChevronDown, Eye, EyeOff,
    GripVertical, Plus, Search, X
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
    availableComponents: PageSection[];
}

const sectionIcons: Record<PageSection, React.ElementType> = {
    hero: Image,
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
    chatbot: MessageSquare,
    footer: Type,
    header: AlignJustify,
    typography: Type
};

const sectionLabels: Record<PageSection, string> = {
    hero: 'Hero Section',
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
    chatbot: 'AI Chatbot',
    footer: 'Footer',
    header: 'Navigation',
    typography: 'Typography'
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
    availableComponents
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [draggedItem, setDraggedItem] = useState<PageSection | null>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({
        structure: true,
        content: true,
        integrations: true
    });

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
        newOrder.splice(targetIndex, 0, draggedItem);

        onReorder(newOrder);
        setDraggedItem(null);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    // Group sections by category
    const structureSections = componentOrder.filter(s => 
        ['header', 'hero', 'footer'].includes(s)
    );
    
    const contentSections = componentOrder.filter(s => 
        !['header', 'hero', 'footer', 'typography', 'chatbot', 'leads', 'newsletter'].includes(s) &&
        componentStatus[s]
    );
    
    const integrationSections = componentOrder.filter(s => 
        ['chatbot', 'leads', 'newsletter'].includes(s) &&
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
        const isFixed = ['header', 'footer', 'typography'].includes(section);

        return (
            <div
                key={section}
                draggable={isDraggable && !isFixed}
                onDragStart={(e) => isDraggable && !isFixed && handleDragStart(e, section)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, section)}
                onDragEnd={handleDragEnd}
                className={`
                    group flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-all
                    ${isActive ? 'bg-editor-accent text-white shadow-sm' : 'hover:bg-editor-panel-bg'}
                    ${draggedItem === section ? 'opacity-40' : ''}
                    ${!isVisible ? 'opacity-50' : ''}
                `}
                onClick={() => onSectionSelect(section)}
            >
                {isDraggable && !isFixed && (
                    <GripVertical 
                        size={14} 
                        className={`flex-shrink-0 cursor-grab active:cursor-grabbing ${
                            isActive ? 'text-white/70' : 'text-editor-text-secondary opacity-0 group-hover:opacity-100'
                        }`}
                    />
                )}
                
                <Icon 
                    size={16} 
                    className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-editor-accent'}`}
                />
                
                <span className={`flex-1 text-sm font-medium truncate ${
                    isActive ? 'text-white' : 'text-editor-text-primary'
                }`}>
                    {sectionLabels[section]}
                </span>

                {!isFixed && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility(section);
                        }}
                        className={`flex-shrink-0 p-1 rounded transition-colors ${
                            isActive 
                                ? 'hover:bg-white/20 text-white' 
                                : 'hover:bg-editor-border text-editor-text-secondary'
                        }`}
                        title={isVisible ? 'Hide section' : 'Show section'}
                    >
                        {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
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
                    onClick={() => setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-bold text-editor-text-secondary uppercase tracking-wider hover:text-editor-text-primary transition-colors"
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {title}
                    <span className="text-editor-accent">({sections.length})</span>
                </button>
                
                {isExpanded && (
                    <div className="mt-1 space-y-1">
                        {sections.map(section => renderSection(section, isDraggable))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-editor-bg border-r border-editor-border">
            {/* Header */}
            <div className="p-4 border-b border-editor-border">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-editor-text-primary uppercase tracking-wider">
                        Page Structure
                    </h3>
                    {availableComponents.length > 0 && (
                        <button
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className="p-1.5 rounded-md bg-editor-accent text-white hover:bg-editor-accent-hover transition-colors"
                            title="Add Component"
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
                        placeholder="Search sections..."
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
                        Add Component
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
                        {renderGroup('Structure', structureSections, 'structure', false)}
                        {renderGroup('Content', contentSections, 'content', true)}
                        {renderGroup('Integrations', integrationSections, 'integrations', true)}
                        
                        {/* Global Typography - Always at bottom */}
                        {componentOrder.includes('typography' as PageSection) && (
                            <div className="pt-2 border-t border-editor-border mt-4">
                                {renderSection('typography' as PageSection, false)}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ComponentTree;

