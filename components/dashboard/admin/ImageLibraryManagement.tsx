
import React, { useEffect, useRef, useState } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { useToast } from '../../../contexts/ToastContext';
import { useAssetLibrary } from '../../../hooks/useAssetLibrary';
import DashboardSidebar from '../DashboardSidebar';
import { ArrowLeft, Image, Upload, Trash2, Download, Zap, Search, Filter, ArrowUpDown, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { FileRecord } from '../../../types';
import ImageGeneratorModal from '../../ui/ImageGeneratorModal';
import DragDropZone from '../../ui/DragDropZone';
import { formatBytes } from '../../../utils/fileHelpers';

interface ImageLibraryManagementProps {
    onBack: () => void;
}

const ImageLibraryManagement: React.FC<ImageLibraryManagementProps> = ({ onBack }) => {
    const { globalFiles, isGlobalFilesLoading, fetchGlobalFiles, uploadGlobalFile, deleteGlobalFile } = useEditor();
    const { success, error: showError } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Use the custom hook for asset management
    const library = useAssetLibrary({ 
        files: globalFiles, 
        itemsPerPage: 30 
    });

    useEffect(() => {
        fetchGlobalFiles();
    }, []);

    const handleFileUpload = async (file: File) => {
        try {
            await uploadGlobalFile(file);
            success(`${file.name} uploaded to global library`);
        } catch (err) {
            showError('Failed to upload file');
        }
    };

    const handleBulkDelete = async () => {
        if (library.selectedFiles.length === 0) return;
        
        if (!window.confirm(`Delete ${library.selectedFiles.length} global asset(s)? This action cannot be undone.`)) return;
        
        try {
            await Promise.all(
                library.selectedFiles.map(f => deleteGlobalFile(f.id, f.storagePath))
            );
            success(`${library.selectedFiles.length} asset(s) deleted from global library`);
            library.clearSelection();
            library.toggleSelectionMode();
        } catch (err) {
            showError('Failed to delete some files');
        }
    };

    const handleBulkDownload = () => {
        if (library.selectedFiles.length === 0) return;
        
        library.selectedFiles.forEach(file => {
            const link = document.createElement('a');
            link.href = file.downloadURL;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
        
        success(`Downloading ${library.selectedFiles.length} file(s)`);
    };

    const handleSingleDelete = async (file: FileRecord) => {
        if (!window.confirm('Delete this global asset?')) return;
        
        try {
            await deleteGlobalFile(file.id, file.storagePath);
            success('Asset deleted successfully');
        } catch (err) {
            showError('Failed to delete asset');
        }
    };

    return (
        <>
            <ImageGeneratorModal 
                isOpen={isGeneratorOpen} 
                onClose={() => setIsGeneratorOpen(false)} 
                destination="global"
            />
            <div className="flex h-screen bg-editor-bg text-editor-text-primary">
                <DashboardSidebar isMobileOpen={false} onClose={() => {}} />
                
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <header className="h-[65px] bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                        <div className="flex items-center">
                            <button onClick={onBack} className="p-2 text-editor-text-secondary hover:text-editor-text-primary md:hidden mr-2" title="Back to Admin">
                                <ArrowLeft />
                            </button>
                            <div className="flex items-center space-x-2">
                                <Image className="text-editor-accent" />
                                <h1 className="text-xl font-bold text-editor-text-primary">Global Image Library</h1>
                            </div>
                            {library.stats.filtered < library.stats.total && (
                                <span className="ml-3 text-xs text-editor-text-secondary bg-editor-border px-2 py-1 rounded-md">
                                    {library.stats.filtered} of {library.stats.total}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center space-x-3">
                            <button onClick={onBack} className="hidden sm:flex items-center text-sm font-semibold py-2 px-4 rounded-lg bg-editor-border text-editor-text-secondary hover:bg-editor-accent hover:text-editor-bg transition-colors">
                                <ArrowLeft size={16} className="mr-1.5" />
                                Back to Admin
                            </button>
                            <button 
                                onClick={() => setIsGeneratorOpen(true)}
                                className="flex items-center text-sm font-semibold py-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-editor-accent text-white hover:opacity-90 transition-all shadow-lg shadow-editor-accent/20"
                            >
                                <Zap size={16} className="mr-1.5" />
                                Generate Image
                            </button>
                            <DragDropZone
                                onFileSelect={handleFileUpload}
                                accept="image/*"
                                maxSizeMB={10}
                                variant="compact"
                            >
                                <button className="flex items-center text-sm font-semibold py-2 px-4 rounded-lg bg-editor-accent text-editor-bg hover:bg-editor-accent-hover transition-colors">
                                    <Upload size={16} className="mr-1.5" />
                                    Upload Image
                                </button>
                            </DragDropZone>
                        </div>
                    </header>

                    <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
                        <p className="text-editor-text-secondary mb-6">Manage the global stock images available to all users in their Asset Library.</p>

                        {/* Search & Filters Bar */}
                        <div className="mb-6 flex flex-wrap gap-3">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[200px]">
                                <input
                                    type="text"
                                    value={library.searchQuery}
                                    onChange={(e) => library.setSearchQuery(e.target.value)}
                                    placeholder="Search global assets..."
                                    className="w-full pl-10 pr-4 py-2 text-sm bg-editor-panel-bg border border-editor-border rounded-lg focus:ring-2 focus:ring-editor-accent focus:outline-none"
                                />
                                <Search size={16} className="absolute left-3 top-3 text-editor-text-secondary" />
                            </div>

                            {/* Filter Toggle */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${showFilters ? 'bg-editor-accent text-editor-bg' : 'bg-editor-panel-bg hover:bg-editor-border text-editor-text-primary'}`}
                            >
                                <Filter size={16} />
                                Filters
                            </button>

                            {/* Selection Mode Toggle */}
                            <button
                                onClick={library.toggleSelectionMode}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${library.isSelectionMode ? 'bg-editor-accent text-editor-bg' : 'bg-editor-panel-bg hover:bg-editor-border text-editor-text-primary'}`}
                            >
                                <CheckSquare size={16} />
                                Select
                                {library.isSelectionMode && library.selectedIds.size > 0 && (
                                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                        {library.selectedIds.size}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Filters Panel */}
                        {showFilters && (
                            <div className="mb-6 p-4 bg-editor-panel-bg rounded-lg border border-editor-border animate-fade-in-up">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* Type Filter */}
                                    <div>
                                        <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase">Type</label>
                                        <select
                                            value={library.typeFilter}
                                            onChange={(e) => library.setTypeFilter(e.target.value as any)}
                                            className="w-full px-3 py-2 text-sm bg-editor-bg border border-editor-border rounded-lg focus:ring-2 focus:ring-editor-accent focus:outline-none"
                                        >
                                            <option value="all">All Files</option>
                                            <option value="image">Images Only</option>
                                            <option value="document">Documents Only</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    {/* Sort By */}
                                    <div>
                                        <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase">Sort By</label>
                                        <select
                                            value={library.sortBy}
                                            onChange={(e) => library.setSortBy(e.target.value as any)}
                                            className="w-full px-3 py-2 text-sm bg-editor-bg border border-editor-border rounded-lg focus:ring-2 focus:ring-editor-accent focus:outline-none"
                                        >
                                            <option value="date">Date</option>
                                            <option value="name">Name</option>
                                            <option value="size">Size</option>
                                            <option value="type">Type</option>
                                        </select>
                                    </div>

                                    {/* Sort Order */}
                                    <div>
                                        <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase">Order</label>
                                        <button
                                            onClick={library.toggleSortOrder}
                                            className="w-full flex items-center justify-between px-3 py-2 text-sm bg-editor-bg border border-editor-border rounded-lg hover:bg-editor-panel-bg transition-colors"
                                        >
                                            <span>{library.sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
                                            <ArrowUpDown size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bulk Actions */}
                        {library.isSelectionMode && library.selectedIds.size > 0 && (
                            <div className="mb-6 p-4 bg-editor-accent/10 rounded-lg border border-editor-accent/30 flex items-center justify-between animate-fade-in-up">
                                <span className="text-sm font-medium text-editor-text-primary">
                                    {library.selectedIds.size} asset(s) selected
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={library.selectAll}
                                        className="px-4 py-2 text-sm font-semibold bg-editor-accent/20 hover:bg-editor-accent/30 rounded-lg transition-colors"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={handleBulkDownload}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
                                    >
                                        <Download size={16} /> Download
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} /> Delete
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Content */}
                        {isGlobalFilesLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-8 h-8 border-4 border-editor-accent border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : library.files.length === 0 ? (
                            library.searchQuery || library.typeFilter !== 'all' ? (
                                <div className="text-center py-16 border-2 border-dashed border-editor-border rounded-xl">
                                    <Search size={48} className="mx-auto text-editor-text-secondary opacity-50 mb-4" />
                                    <p className="text-editor-text-primary font-medium mb-2">No results found</p>
                                    <p className="text-editor-text-secondary text-sm mb-4">Try adjusting your search or filters</p>
                                    <button
                                        onClick={() => {
                                            library.setSearchQuery('');
                                            library.setTypeFilter('all');
                                        }}
                                        className="text-sm text-editor-accent hover:underline"
                                    >
                                        Clear filters
                                    </button>
                                </div>
                            ) : (
                                <DragDropZone
                                    onFileSelect={handleFileUpload}
                                    accept="image/*"
                                    maxSizeMB={10}
                                    className="min-h-[400px]"
                                />
                            )
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                    {library.files.map((file) => (
                                        <div 
                                            key={file.id} 
                                            className={`group relative rounded-lg border overflow-hidden hover:border-editor-accent transition-all ${library.isSelected(file.id) ? 'border-editor-accent ring-2 ring-editor-accent' : 'border-editor-border'}`}
                                        >
                                            <div 
                                                className="aspect-square bg-editor-bg overflow-hidden cursor-pointer relative"
                                                onClick={() => {
                                                    if (library.isSelectionMode) {
                                                        library.toggleSelection(file.id);
                                                    }
                                                }}
                                            >
                                                <img 
                                                    src={file.downloadURL} 
                                                    alt={file.name} 
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                                    loading="lazy" 
                                                />
                                                
                                                {/* Filename overlay on hover - only when not in selection mode */}
                                                {!library.isSelectionMode && (
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <p className="text-white text-xs font-medium truncate">{file.name}</p>
                                                        <p className="text-white/70 text-[10px] mt-0.5">{formatBytes(file.size)}</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Selection checkbox */}
                                            {library.isSelectionMode && (
                                                <div className="absolute top-2 left-2 z-10">
                                                    <button 
                                                        onClick={() => library.toggleSelection(file.id)}
                                                        className="p-1.5 bg-white dark:bg-gray-800 rounded-md shadow-lg"
                                                    >
                                                        {library.isSelected(file.id) ? (
                                                            <CheckSquare size={18} className="text-editor-accent" />
                                                        ) : (
                                                            <Square size={18} className="text-editor-text-secondary" />
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                            
                                            {/* Action buttons */}
                                            {!library.isSelectionMode && (
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <a 
                                                        href={file.downloadURL} 
                                                        download={file.name}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1.5 bg-black/60 text-white rounded-md hover:bg-editor-accent transition-colors"
                                                        title="Download/View"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Download size={14} />
                                                    </a>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSingleDelete(file);
                                                        }}
                                                        className="p-1.5 bg-black/60 text-white rounded-md hover:bg-red-500 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {library.totalPages > 1 && (
                                    <div className="mt-8 flex items-center justify-between border-t border-editor-border pt-6">
                                        <span className="text-sm text-editor-text-secondary">
                                            Page {library.currentPage} of {library.totalPages} • {library.stats.filtered} asset(s)
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={library.prevPage}
                                                disabled={!library.hasPrevPage}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-editor-panel-bg hover:bg-editor-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronLeft size={16} />
                                                Previous
                                            </button>
                                            <button
                                                onClick={library.nextPage}
                                                disabled={!library.hasNextPage}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-editor-panel-bg hover:bg-editor-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Next
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
};

export default ImageLibraryManagement;
