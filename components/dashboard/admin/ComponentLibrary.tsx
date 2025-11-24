
import React, { useState, useMemo } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { PageSection, CustomComponent } from '../../../types';
import { Search, Filter, Package, BookOpen } from 'lucide-react';
import ComponentDocumentationViewer from './ComponentDocumentationViewer';

const Label: React.FC<{ children: React.ReactNode, htmlFor?: string }> = ({ children, htmlFor }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-editor-text-secondary mb-1">{children}</label>
);

const ToggleControl: React.FC<{ label?: string; checked: boolean; onChange: (checked: boolean) => void; }> = ({ label, checked, onChange }) => (
    <div className={`flex items-center ${label ? 'justify-between' : 'justify-start'}`}>
        {label && <Label>{label}</Label>}
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label || 'Enable section'}
            onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            draggable={false}
            className={`${checked ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-editor-accent focus:ring-offset-2 focus:ring-offset-editor-panel-bg`}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);

const componentNames: Record<PageSection, string> = {
    hero: 'Hero Section',
    features: 'Features Section',
    testimonials: 'Testimonials Section',
    slideshow: 'Slideshow Section',
    pricing: 'Pricing Section',
    faq: 'FAQ Section',
    portfolio: 'Portfolio Section',
    leads: 'Leads/Contact Section',
    newsletter: 'Newsletter Section',
    cta: 'CTA Section',
    services: 'Services Section',
    team: 'Team Section',
    video: 'Video Section',
    howItWorks: 'How It Works Section',
    map: 'Location Map',
    menu: 'Restaurant Menu',
    chatbot: 'AI Chatbot Widget',
    footer: 'Footer Section',
    header: 'Header / Navigation',
    typography: 'Global Typography',
};

const componentCategories: Record<PageSection, string> = {
    hero: 'hero',
    features: 'content',
    testimonials: 'content',
    slideshow: 'media',
    pricing: 'cta',
    faq: 'content',
    portfolio: 'media',
    leads: 'form',
    newsletter: 'form',
    cta: 'cta',
    services: 'content',
    team: 'content',
    video: 'media',
    howItWorks: 'content',
    map: 'other',
    menu: 'content',
    chatbot: 'other',
    footer: 'navigation',
    header: 'navigation',
    typography: 'other',
};

const ComponentLibrary: React.FC = () => {
    const { componentStatus, updateComponentStatus, projects, customComponents } = useEditor();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [viewingDocs, setViewingDocs] = useState<CustomComponent | null>(null);

    const categories = ['all', 'hero', 'cta', 'form', 'content', 'navigation', 'media', 'other'];

    const getUsageCount = (componentKey: PageSection) => {
        return projects.filter(p => 
            p.componentOrder && p.componentOrder.includes(componentKey) && 
            p.sectionVisibility && p.sectionVisibility[componentKey]
        ).length;
    };

    const filteredComponents = useMemo(() => {
        const components = Object.keys(componentNames) as PageSection[];
        
        return components.filter(key => {
            const name = componentNames[key].toLowerCase();
            const matchesSearch = name.includes(searchQuery.toLowerCase());
            
            const matchesStatus = filterStatus === 'all' || 
                (filterStatus === 'enabled' && componentStatus[key]) ||
                (filterStatus === 'disabled' && !componentStatus[key]);
            
            const matchesCategory = filterCategory === 'all' || 
                componentCategories[key] === filterCategory;
            
            return matchesSearch && matchesStatus && matchesCategory;
        });
    }, [searchQuery, filterStatus, filterCategory, componentStatus]);

    return (
        <div className="p-6 sm:p-8 overflow-y-auto h-full">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl font-bold text-editor-text-primary mb-2">Component Library</h2>
                <p className="text-editor-text-secondary mb-6">
                    Enable or disable components globally across the entire platform. Disabled components will not be available in the editor for any user.
                </p>

                {/* Search and Filters */}
                <div className="mb-6 space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-editor-text-secondary" size={20} />
                        <input
                            type="text"
                            placeholder="Search components..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-editor-panel-bg border border-editor-border rounded-lg text-editor-text-primary placeholder-editor-text-secondary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-editor-text-secondary" />
                            <span className="text-sm text-editor-text-secondary font-medium">Status:</span>
                            <div className="flex gap-2">
                                {['all', 'enabled', 'disabled'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status as any)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                            filterStatus === status
                                                ? 'bg-editor-accent text-editor-bg'
                                                : 'bg-editor-border text-editor-text-secondary hover:bg-editor-accent/20'
                                        }`}
                                    >
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-editor-text-secondary font-medium">Category:</span>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="px-3 py-1 bg-editor-panel-bg border border-editor-border rounded-lg text-editor-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Components List */}
                <div className="bg-editor-panel-bg border border-editor-border rounded-lg">
                    <div className="p-4 border-b border-editor-border">
                        <p className="text-sm text-editor-text-secondary">
                            Showing {filteredComponents.length} of {Object.keys(componentNames).length} components
                        </p>
                    </div>
                    <ul className="divide-y divide-editor-border">
                        {filteredComponents.map((key) => (
                            <li key={key} className="p-4 flex justify-between items-center hover:bg-editor-border/30 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <p className="font-semibold text-editor-text-primary">{componentNames[key]}</p>
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-editor-border text-editor-text-secondary">
                                            {componentCategories[key]}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1">
                                        <p className={`text-sm ${componentStatus[key] ? 'text-green-400' : 'text-red-400'}`}>
                                            {componentStatus[key] ? 'Enabled' : 'Disabled'}
                                        </p>
                                        <p className="text-sm text-editor-text-secondary">
                                            Used in {getUsageCount(key)} projects
                                        </p>
                                    </div>
                                </div>
                                <ToggleControl 
                                    checked={componentStatus[key]}
                                    onChange={(isEnabled) => updateComponentStatus(key, isEnabled)}
                                />
                            </li>
                        ))}
                    </ul>
                </div>

                {filteredComponents.length === 0 && (
                    <div className="text-center py-12 bg-editor-panel-bg border border-editor-border rounded-lg mt-4">
                        <p className="text-editor-text-secondary">No components found matching your filters.</p>
                    </div>
                )}

                {/* Custom Components Section */}
                {customComponents && customComponents.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-xl font-bold text-editor-text-primary mb-4 flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Custom Components
                        </h3>
                        <p className="text-editor-text-secondary mb-4">
                            Components created by Super Admins. These are always available for all users.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {customComponents.map((component) => {
                                const usageCount = projects.filter(p => 
                                    p.componentOrder && p.componentOrder.some(id => id === component.id)
                                ).length;

                                return (
                                    <div 
                                        key={component.id} 
                                        className="bg-editor-panel-bg border border-editor-border rounded-lg overflow-hidden hover:border-editor-accent transition-colors group"
                                    >
                                        {/* Thumbnail */}
                                        <div className="w-full h-40 bg-gradient-to-br from-purple-600 to-indigo-600 relative overflow-hidden">
                                            {component.styles?.thumbnail ? (
                                                <img 
                                                    src={(component.styles as any).thumbnail} 
                                                    alt={component.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <div className="text-center">
                                                        <Package className="w-12 h-12 text-white/70 mx-auto mb-2" />
                                                        <p className="text-white/90 text-sm font-medium">No thumbnail</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="p-4">
                                            <h4 className="font-semibold text-editor-text-primary mb-1 truncate">
                                                {component.name}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-editor-text-secondary mb-2">
                                                <span className="px-2 py-0.5 bg-editor-border rounded-full">
                                                    {component.baseComponent}
                                                </span>
                                                {component.version && (
                                                    <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded-full">
                                                        v{component.version}
                                                    </span>
                                                )}
                                            </div>
                                            {component.description && (
                                                <p className="text-sm text-editor-text-secondary line-clamp-2 mb-2">
                                                    {component.description}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between text-xs text-editor-text-secondary">
                                                <span>Used in {usageCount} projects</span>
                                                {component.usageCount && (
                                                    <span>{component.usageCount} total uses</span>
                                                )}
                                            </div>
                                            
                                            {/* View Docs Button */}
                                            {component.documentation && (
                                                <button
                                                    onClick={() => setViewingDocs(component)}
                                                    className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-sm font-medium text-editor-text-primary hover:bg-editor-border transition-colors"
                                                >
                                                    <BookOpen size={14} />
                                                    View Documentation
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {/* Documentation Viewer Modal */}
                {viewingDocs && viewingDocs.documentation && (
                    <ComponentDocumentationViewer
                        documentation={viewingDocs.documentation}
                        componentName={viewingDocs.name}
                        isOpen={!!viewingDocs}
                        onClose={() => setViewingDocs(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default ComponentLibrary;
