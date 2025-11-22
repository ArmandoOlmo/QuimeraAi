
import React, { useRef, useState } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { useToast } from '../../contexts/ToastContext';
import { useAssetLibrary } from '../../hooks/useAssetLibrary';
import { FileRecord } from '../../types';
import { FileText, Upload, Trash2, Download, Sparkles, ChevronDown, Zap, X, Calendar, HardDrive, Search, Filter, ArrowUpDown, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import ImageGeneratorModal from '../ui/ImageGeneratorModal';
import DragDropZone from '../ui/DragDropZone';
import Modal from '../ui/Modal';
import { formatBytes, formatFileDate } from '../../utils/fileHelpers';

const FilePreviewModal: React.FC<{ file: FileRecord; onClose: () => void }> = ({ file, onClose }) => {
    const { deleteFile, updateFileNotes, generateFileSummary } = useEditor();
    const { success, error: showError } = useToast();
    const [notes, setNotes] = useState(file.notes);
    const notesTimeoutRef = useRef<number | null>(null);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNotes(e.target.value);
        if (notesTimeoutRef.current) {
            clearTimeout(notesTimeoutRef.current);
        }
        notesTimeoutRef.current = window.setTimeout(() => {
            updateFileNotes(file.id, e.target.value);
            success('Notes saved');
        }, 1000);
    };

    const handleDelete = async () => {
        if (window.confirm('Delete this file?')) {
            try {
                await deleteFile(file.id, file.storagePath);
                success('File deleted successfully');
                onClose();
            } catch (err) {
                showError('Failed to delete file');
            }
        }
    };

    const handleSummarize = async () => {
        try {
            await generateFileSummary(file.id, file.downloadURL);
            success('Summary generated');
        } catch (err) {
            showError('Failed to generate summary');
        }
    };

    const isSummarizable = file.type.startsWith('text/');

    return (
        <div className="flex flex-col h-full max-h-[85vh] bg-editor-panel-bg rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-editor-border flex justify-between items-center bg-editor-panel-bg z-10">
                <h3 className="font-bold text-lg text-editor-text-primary truncate max-w-[70%]">{file.name}</h3>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Image/File Preview */}
            <div className="flex-1 overflow-auto p-0 bg-black/90 flex items-center justify-center relative">
                {file.type.startsWith('image/') && (
                    <div
                        className="absolute inset-0 opacity-30 blur-3xl scale-110"
                        style={{ backgroundImage: `url(${file.downloadURL})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    />
                )}

                {file.type.startsWith('image/') ? (
                    <img
                        src={file.downloadURL}
                        alt={file.name}
                        className="max-w-full max-h-full object-contain shadow-2xl relative z-10"
                    />
                ) : (
                    <div className="flex flex-col items-center text-gray-400 relative z-10">
                        <FileText size={80} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">Preview not available for this file type</p>
                    </div>
                )}
            </div>

            {/* Details Section */}
            <div className="border-t border-editor-border bg-editor-panel-bg z-10">
                {/* Basic Info */}
                <div className="p-4 border-b border-editor-border/50">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                            <p className="text-sm font-bold text-editor-text-primary mb-1">File Information</p>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-editor-text-secondary">
                                <span className="flex items-center">
                                    <HardDrive size={14} className="mr-2 text-editor-accent" />
                                    {formatBytes(file.size)}
                                </span>
                                <span className="flex items-center">
                                    <Calendar size={14} className="mr-2 text-editor-accent" />
                                    {formatFileDate(file.createdAt)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="mb-3">
                        <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase">Notes</label>
                        <textarea
                            value={notes}
                            onChange={handleNotesChange}
                            rows={2}
                            placeholder="Add notes about this file..."
                            className="w-full bg-editor-bg text-sm text-editor-text-primary p-3 rounded-lg border border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none resize-none"
                        />
                    </div>

                    {/* AI Summary */}
                    {file.aiSummary && (
                        <div className="bg-editor-bg/50 p-3 rounded-lg border border-editor-border/50">
                            <div className="flex items-center mb-2">
                                <Sparkles size={14} className="text-editor-accent mr-2" />
                                <span className="text-xs font-bold text-editor-accent uppercase">AI Summary</span>
                            </div>
                            <p className="text-sm text-editor-text-primary leading-relaxed">{file.aiSummary}</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-4 flex justify-between items-center">
                    <div className="flex gap-2">
                        <button
                            onClick={handleSummarize}
                            disabled={!isSummarizable}
                            className="flex items-center text-xs font-bold py-2 px-4 rounded-lg bg-editor-accent/10 text-editor-accent hover:bg-editor-accent hover:text-editor-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Sparkles size={14} className="mr-1.5" /> Generate Summary
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex items-center text-xs font-bold py-2 px-4 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        >
                            <Trash2 size={14} className="mr-1.5" /> Delete
                        </button>
                    </div>
                    <a
                        href={file.downloadURL}
                        download={file.name}
                        className="flex items-center bg-editor-accent text-editor-bg px-6 py-2.5 rounded-lg font-bold shadow-lg hover:bg-editor-accent-hover transition-transform hover:scale-105 text-sm"
                    >
                        <Download size={16} className="mr-2" /> Download
                    </a>
                </div>
            </div>
        </div>
    );
};

const FileItem: React.FC<{ 
    file: FileRecord; 
    variant: 'widget' | 'full'; 
    onPreview: (file: FileRecord) => void;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    isSelectionMode?: boolean;
}> = ({ file, variant, onPreview, isSelected, onToggleSelect, isSelectionMode }) => {
    return (
        <div className={`rounded-xl transition-all duration-200 group relative overflow-hidden h-full ${isSelected ? 'ring-2 ring-primary' : ''}`}>
            {/* Image/File Preview */}
            <div 
                className="aspect-square w-full bg-secondary/30 relative cursor-pointer overflow-hidden" 
                onClick={() => {
                    if (isSelectionMode && onToggleSelect) {
                        onToggleSelect();
                    }
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!isSelectionMode) {
                        onPreview(file);
                    }
                }}
                title={isSelectionMode ? "Click to select" : "Double click to view details"}
            >
                {file.type.startsWith('image/') ? (
                    <img
                        src={file.downloadURL}
                        alt={file.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-primary bg-secondary/50">
                        <FileText size={48} />
                        <p className="text-xs mt-2 px-2 text-center truncate w-full">{file.name}</p>
                    </div>
                )}
                
                {/* Selection checkbox */}
                {isSelectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSelect?.();
                            }}
                            className="p-1.5 bg-white dark:bg-gray-800 rounded-md shadow-lg"
                        >
                            {isSelected ? (
                                <CheckSquare size={20} className="text-primary" />
                            ) : (
                                <Square size={20} className="text-muted-foreground" />
                            )}
                        </button>
                    </div>
                )}

                {/* Filename overlay on hover - only for images */}
                {file.type.startsWith('image/') && !isSelectionMode && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-medium truncate">{file.name}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

interface FileHistoryProps {
    variant?: 'widget' | 'full';
}

const FileHistory: React.FC<FileHistoryProps> = ({ variant = 'widget' }) => {
    const { files, isFilesLoading, uploadFile, deleteFile } = useEditor();
    const { success, error: showError } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Use the custom hook for asset management
    const library = useAssetLibrary({ 
        files, 
        itemsPerPage: variant === 'widget' ? 12 : 24 
    });

    const handleFileUpload = async (file: File) => {
        try {
            await uploadFile(file);
            success(`${file.name} uploaded successfully`);
        } catch (err) {
            showError('Failed to upload file');
        }
    };

    const handleBulkDelete = async () => {
        if (library.selectedFiles.length === 0) return;
        
        if (!window.confirm(`Delete ${library.selectedFiles.length} file(s)?`)) return;
        
        try {
            await Promise.all(
                library.selectedFiles.map(f => deleteFile(f.id, f.storagePath))
            );
            success(`${library.selectedFiles.length} file(s) deleted`);
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

    const containerClasses = variant === 'widget' 
        ? "bg-card/50 rounded-2xl border border-border p-5 backdrop-blur-sm"
        : "h-full flex flex-col";

    const gridClasses = variant === 'widget'
        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
        : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6";

    const scrollContainerClasses = variant === 'widget'
        ? "max-h-[500px] overflow-y-auto custom-scrollbar pr-1"
        : "flex-1 overflow-y-auto custom-scrollbar pr-1";

    return (
        <section className={containerClasses}>
            <ImageGeneratorModal isOpen={isGeneratorOpen} onClose={() => setIsGeneratorOpen(false)} destination="user" />
            
            {/* Asset Preview Modal */}
            <Modal isOpen={!!previewFile} onClose={() => setPreviewFile(null)}>
                {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
            </Modal>

            {/* Header */}
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${variant === 'widget' ? 'mb-4' : 'mb-6'}`}>
                <div className="flex items-center gap-3">
                    <h2 className={`font-bold text-muted-foreground uppercase tracking-wider ${variant === 'widget' ? 'text-sm' : 'text-base'}`}>
                        Asset Library
                    </h2>
                    {library.stats.filtered < library.stats.total && (
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                            {library.stats.filtered} of {library.stats.total}
                        </span>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:flex-initial sm:w-48">
                        <input
                            type="text"
                            value={library.searchQuery}
                            onChange={(e) => library.setSearchQuery(e.target.value)}
                            placeholder="Search assets..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary border border-border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                        <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${showFilters ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80 text-foreground'}`}
                        title="Filters"
                    >
                        <Filter size={14} />
                    </button>

                    {/* Selection Mode Toggle */}
                    <button
                        onClick={library.toggleSelectionMode}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${library.isSelectionMode ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80 text-foreground'}`}
                        title="Selection Mode"
                    >
                        <CheckSquare size={14} />
                        {library.isSelectionMode && library.selectedIds.size > 0 && (
                            <span>({library.selectedIds.size})</span>
                        )}
                    </button>

                    {/* AI Generate */}
                    <button
                        onClick={() => setIsGeneratorOpen(true)}
                        className="flex items-center justify-center bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
                        title="Generate Image"
                    >
                        <Zap size={14} className="text-yellow-400 mr-1.5" />
                        AI
                    </button>

                    {/* Upload (with drag & drop) */}
                    <DragDropZone
                        onFileSelect={handleFileUpload}
                        accept="*"
                        maxSizeMB={10}
                        variant="compact"
                    >
                        <button className="flex items-center justify-center bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold py-1.5 px-3 rounded-lg transition-colors">
                            <Upload size={14} className="mr-1.5" />
                            Upload
                        </button>
                    </DragDropZone>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="mb-4 p-4 bg-secondary/50 rounded-lg border border-border animate-fade-in-up">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Type Filter */}
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Type</label>
                            <select
                                value={library.typeFilter}
                                onChange={(e) => library.setTypeFilter(e.target.value as any)}
                                className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                            >
                                <option value="all">All Files</option>
                                <option value="image">Images Only</option>
                                <option value="document">Documents Only</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {/* Sort By */}
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Sort By</label>
                            <select
                                value={library.sortBy}
                                onChange={(e) => library.setSortBy(e.target.value as any)}
                                className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                            >
                                <option value="date">Date</option>
                                <option value="name">Name</option>
                                <option value="size">Size</option>
                                <option value="type">Type</option>
                            </select>
                        </div>

                        {/* Sort Order */}
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Order</label>
                            <button
                                onClick={library.toggleSortOrder}
                                className="w-full flex items-center justify-between px-3 py-1.5 text-xs bg-background border border-border rounded-lg hover:bg-secondary transition-colors"
                            >
                                <span>{library.sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
                                <ArrowUpDown size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Actions */}
            {library.isSelectionMode && library.selectedIds.size > 0 && (
                <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/30 flex items-center justify-between animate-fade-in-up">
                    <span className="text-sm font-medium">{library.selectedIds.size} selected</span>
                    <div className="flex gap-2">
                        <button
                            onClick={library.selectAll}
                            className="px-3 py-1.5 text-xs font-bold bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors"
                        >
                            Select All
                        </button>
                        <button
                            onClick={handleBulkDownload}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
                        >
                            <Download size={14} /> Download
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
                        >
                            <Trash2 size={14} /> Delete
                        </button>
                    </div>
                </div>
            )}

            {/* Files Grid */}
            <div className={scrollContainerClasses}>
                {isFilesLoading ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                        <span className="text-xs">Syncing...</span>
                    </div>
                ) : library.files.length > 0 ? (
                    <div className={gridClasses}>
                        {library.files.map(file => (
                            <div key={file.id} className="h-full">
                                <FileItem 
                                    file={file} 
                                    variant={variant} 
                                    onPreview={setPreviewFile}
                                    isSelected={library.isSelected(file.id)}
                                    onToggleSelect={() => library.toggleSelection(file.id)}
                                    isSelectionMode={library.isSelectionMode}
                                />
                            </div>
                        ))}
                    </div>
                ) : library.searchQuery || library.typeFilter !== 'all' ? (
                    <div className="text-center py-8 px-4 border-2 border-dashed border-border rounded-xl bg-secondary/20">
                        <Search size={32} className="mx-auto mb-2 text-muted-foreground opacity-50" />
                        <p className="text-sm font-medium text-foreground mb-1">No results found</p>
                        <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
                        <button
                            onClick={() => {
                                library.setSearchQuery('');
                                library.setTypeFilter('all');
                            }}
                            className="mt-3 text-xs text-primary hover:underline"
                        >
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <DragDropZone
                        onFileSelect={handleFileUpload}
                        accept="*"
                        maxSizeMB={10}
                        className="min-h-[300px]"
                    />
                )}
            </div>

            {/* Pagination */}
            {library.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-xs text-muted-foreground">
                        Page {library.currentPage} of {library.totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={library.prevPage}
                            disabled={!library.hasPrevPage}
                            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={library.nextPage}
                            disabled={!library.hasNextPage}
                            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};

export default FileHistory;
