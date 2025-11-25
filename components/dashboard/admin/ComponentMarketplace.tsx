import React, { useState, useMemo } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { CustomComponent } from '../../../types';
import { Search, Download, Star, Eye, Package, X, Check } from 'lucide-react';
import ComponentRating from './ComponentRating';

const ComponentMarketplace: React.FC = () => {
    const { customComponents, duplicateCustomComponent, userDocument } = useEditor();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedComponent, setSelectedComponent] = useState<CustomComponent | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Filter public components only
    const publicComponents = useMemo(() => {
        return customComponents.filter(c => c.permissions?.isPublic);
    }, [customComponents]);

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set<string>();
        publicComponents.forEach(c => {
            if (c.category) cats.add(c.category);
        });
        return ['all', ...Array.from(cats)];
    }, [publicComponents]);

    // Filtered components
    const filteredComponents = useMemo(() => {
        return publicComponents.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.description?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [publicComponents, searchTerm, selectedCategory]);

    const handleAddToLibrary = async (component: CustomComponent) => {
        if (!duplicateCustomComponent) {
            console.error('duplicateCustomComponent function not available');
            return;
        }
        
        await duplicateCustomComponent(component.id);
        alert(`"${component.name}" added to your library!`);
        setShowDetailModal(false);
    };

    const openDetailModal = (component: CustomComponent) => {
        setSelectedComponent(component);
        setShowDetailModal(true);
    };

    const getComponentRating = (component: CustomComponent) => {
        if (component.averageRating) return component.averageRating;
        if (component.ratings && component.ratings.length > 0) {
            return component.ratings.reduce((acc, r) => acc + r.rating, 0) / component.ratings.length;
        }
        return 0;
    };

    const getComponentDownloads = (component: CustomComponent) => {
        // Placeholder for download count
        // In a real app, this would come from component.downloadCount
        return Math.floor(Math.random() * 1000);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-editor-text-primary mb-2">Component Marketplace</h2>
                <p className="text-editor-text-secondary">Browse and add public components to your library</p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-editor-text-secondary" size={20} />
                    <input
                        type="text"
                        placeholder="Search components..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary placeholder-editor-text-secondary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                                selectedCategory === cat
                                    ? 'bg-editor-accent text-editor-bg'
                                    : 'bg-editor-bg text-editor-text-secondary hover:bg-editor-border'
                            }`}
                        >
                            {cat === 'all' ? 'All' : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Component Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredComponents.map(component => (
                    <div
                        key={component.id}
                        className="relative rounded-2xl overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 cursor-pointer h-[400px] group"
                        onClick={() => openDetailModal(component)}
                    >
                        {/* Full Background Image */}
                        <div className="absolute inset-0">
                            {component.thumbnail ? (
                                <img
                                    src={component.thumbnail}
                                    alt={component.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-editor-bg">
                                    <Package size={80} className="text-editor-text-secondary opacity-20" />
                                </div>
                            )}
                        </div>
                        
                        {/* Dark Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]" />

                        {/* Category Badge */}
                        {component.category && (
                            <div className="absolute top-4 left-4 z-20">
                                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border backdrop-blur-md shadow-lg bg-editor-accent/20 text-editor-accent border-editor-accent/30">
                                    {component.category}
                                </span>
                            </div>
                        )}

                        {/* Stats in Top Right */}
                        <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
                            <div className="flex items-center gap-1 text-white bg-black/30 backdrop-blur-md rounded-full px-3 py-1">
                                <Star size={14} fill="currentColor" className="text-yellow-400" />
                                <span className="text-sm font-semibold">{getComponentRating(component).toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-white bg-black/30 backdrop-blur-md rounded-full px-3 py-1">
                                <Download size={14} />
                                <span className="text-sm font-semibold">{getComponentDownloads(component)}</span>
                            </div>
                        </div>

                        {/* Content at Bottom */}
                        <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
                            <h3 className="font-bold text-2xl text-white mb-2 line-clamp-2">{component.name}</h3>
                            
                            {component.description && (
                                <p className="text-sm text-white/80 line-clamp-2 mb-3">{component.description}</p>
                            )}

                            {/* Creator */}
                            <div className="text-xs text-white/70">
                                by {component.createdBy || 'Anonymous'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredComponents.length === 0 && (
                <div className="text-center py-16">
                    <Package size={64} className="mx-auto text-editor-text-secondary opacity-50 mb-4" />
                    <h3 className="text-xl font-bold text-editor-text-primary mb-2">No components found</h3>
                    <p className="text-editor-text-secondary">
                        {searchTerm || selectedCategory !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'No public components available yet'}
                    </p>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedComponent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-editor-panel-bg border-b border-editor-border p-6 flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-editor-text-primary mb-1">{selectedComponent.name}</h2>
                                <p className="text-editor-text-secondary">{selectedComponent.category || 'Uncategorized'}</p>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Thumbnail/Preview */}
                            <div className="relative h-64 bg-editor-bg rounded-lg overflow-hidden">
                                {selectedComponent.thumbnail ? (
                                    <img
                                        src={selectedComponent.thumbnail}
                                        alt={selectedComponent.name}
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package size={96} className="text-editor-text-secondary opacity-50" />
                                    </div>
                                )}
                            </div>

                            {/* Stats Bar */}
                            <div className="flex items-center gap-6 p-4 bg-editor-bg rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Star size={20} className="text-yellow-400" fill="currentColor" />
                                    <span className="text-editor-text-primary font-bold">{getComponentRating(selectedComponent).toFixed(1)}</span>
                                    <span className="text-editor-text-secondary text-sm">(24 reviews)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Download size={20} className="text-editor-accent" />
                                    <span className="text-editor-text-primary font-bold">{getComponentDownloads(selectedComponent)}</span>
                                    <span className="text-editor-text-secondary text-sm">downloads</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Eye size={20} className="text-blue-400" />
                                    <span className="text-editor-text-primary font-bold">{getComponentDownloads(selectedComponent) * 3}</span>
                                    <span className="text-editor-text-secondary text-sm">views</span>
                                </div>
                            </div>

                            {/* Description */}
                            {selectedComponent.description && (
                                <div>
                                    <h3 className="text-lg font-bold text-editor-text-primary mb-2">Description</h3>
                                    <p className="text-editor-text-secondary">{selectedComponent.description}</p>
                                </div>
                            )}

                            {/* Documentation Preview */}
                            {selectedComponent.documentation && (
                                <div>
                                    <h3 className="text-lg font-bold text-editor-text-primary mb-2">Documentation</h3>
                                    <div className="p-4 bg-editor-bg rounded-lg">
                                        <p className="text-editor-text-secondary text-sm line-clamp-3">
                                            {selectedComponent.documentation.description}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Component Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-sm font-bold text-editor-text-secondary mb-1">Base Component</h4>
                                    <p className="text-editor-text-primary">{selectedComponent.baseComponent}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-editor-text-secondary mb-1">Version</h4>
                                    <p className="text-editor-text-primary">{selectedComponent.version || '1.0'}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-editor-text-secondary mb-1">Created By</h4>
                                    <p className="text-editor-text-primary">{selectedComponent.createdBy || 'Anonymous'}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-editor-text-secondary mb-1">Last Updated</h4>
                                    <p className="text-editor-text-primary">
                                        {selectedComponent.updatedAt ? new Date(selectedComponent.updatedAt).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Tags */}
                            {selectedComponent.tags && selectedComponent.tags.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold text-editor-text-secondary mb-2">Tags</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedComponent.tags.map(tag => (
                                            <span
                                                key={tag}
                                                className="px-3 py-1 bg-editor-bg text-editor-text-secondary text-sm rounded-full"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Ratings & Reviews */}
                            <div className="border-t border-editor-border pt-6">
                                <ComponentRating component={selectedComponent} />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 bg-editor-panel-bg border-t border-editor-border p-6 flex items-center justify-between">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-4 py-2 text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => handleAddToLibrary(selectedComponent)}
                                className="px-6 py-2 bg-editor-accent text-editor-bg font-bold rounded-lg hover:bg-opacity-90 transition-all flex items-center gap-2"
                            >
                                <Check size={20} />
                                Add to Library
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComponentMarketplace;

