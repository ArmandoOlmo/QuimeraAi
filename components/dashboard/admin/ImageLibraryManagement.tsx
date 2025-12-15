
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFiles } from '../../../contexts/files';
import { useToast } from '../../../contexts/ToastContext';
import { useAssetLibrary } from '../../../hooks/useAssetLibrary';
import DashboardSidebar from '../DashboardSidebar';
import { ArrowLeft, Image, Upload, Trash2, Download, Zap, Search, Filter, ArrowUpDown, CheckSquare, Square, ChevronLeft, ChevronRight, Menu, Sparkles, X } from 'lucide-react';
import { FileRecord } from '../../../types';
import ImageGeneratorModal from '../../ui/ImageGeneratorModal';
import DragDropZone from '../../ui/DragDropZone';
import { formatBytes } from '../../../utils/fileHelpers';

interface ImageLibraryManagementProps {
    onBack: () => void;
}

const ImageLibraryManagement: React.FC<ImageLibraryManagementProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { globalFiles, isGlobalFilesLoading, fetchGlobalFiles, uploadGlobalFile, deleteGlobalFile } = useFiles();
    const { success, error: showError } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            success(t('superadmin.imageLibraryManagement.uploaded', { name: file.name, defaultValue: `${file.name} uploaded to global library` }));
        } catch (err) {
            showError(t('superadmin.imageLibraryManagement.uploadError', 'Failed to upload file'));
        }
    };

    const handleBulkDelete = async () => {
        if (library.selectedFiles.length === 0) return;

        if (!window.confirm(t('superadmin.imageLibraryManagement.deleteConfirm', { count: library.selectedFiles.length, defaultValue: `Delete ${library.selectedFiles.length} global asset(s)? This action cannot be undone.` }))) return;

        try {
            await Promise.all(
                library.selectedFiles.map(f => deleteGlobalFile(f.id, f.storagePath))
            );
            success(t('superadmin.imageLibraryManagement.deleted', { count: library.selectedFiles.length, defaultValue: `${library.selectedFiles.length} asset(s) deleted from global library` }));
            library.clearSelection();
            library.toggleSelectionMode();
        } catch (err) {
            showError(t('superadmin.imageLibraryManagement.deleteError', 'Failed to delete some files'));
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

        success(t('superadmin.imageLibraryManagement.downloading', { count: library.selectedFiles.length, defaultValue: `Downloading ${library.selectedFiles.length} file(s)` }));
    };

    const handleSingleDelete = async (file: FileRecord) => {
        if (!window.confirm(t('superadmin.imageLibraryManagement.deleteSingleConfirm', 'Delete this global asset?'))) return;

        try {
            await deleteGlobalFile(file.id, file.storagePath);
            success(t('superadmin.imageLibraryManagement.assetDeleted', 'Asset deleted successfully'));
        } catch (err) {
            showError(t('superadmin.imageLibraryManagement.assetDeletedError', 'Failed to delete asset'));
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
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                        <div className="flex items-center">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-full lg:hidden mr-2 transition-colors"
                                title={t('common.openMenu', 'Open menu')}
                            >
                                <Menu className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2">
                                <Image className="text-editor-accent w-5 h-5" />
                                <h1 className="text-lg font-semibold text-editor-text-primary">{t('superadmin.imageLibraryManagement.title', 'Global Image Library')}</h1>
                            </div>
                            {library.stats.filtered < library.stats.total && (
                                <span className="ml-3 text-xs text-editor-text-secondary bg-editor-border px-2 py-1 rounded-md">
                                    {library.stats.filtered} of {library.stats.total}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={onBack} className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40">
                                <ArrowLeft className="w-4 h-4" />
                                {t('superadmin.backToAdmin', 'Back to Admin')}
                            </button>
                            <button
                                onClick={() => setIsGeneratorOpen(true)}
                                className="flex items-center gap-2 h-9 px-3 text-sm font-bold transition-all text-purple-500 hover:text-purple-400"
                            >
                                <Zap className="w-4 h-4" />
                                {t('superadmin.imageLibraryManagement.generateImage', 'Generate Image')}
                            </button>
                            <DragDropZone
                                onFileSelect={handleFileUpload}
                                accept="image/*"
                                maxSizeMB={10}
                                variant="compact"
                            >
                                <button className="flex items-center text-sm font-semibold py-2 px-3 text-editor-accent hover:text-editor-accent-hover transition-colors">
                                    <Upload size={16} className="mr-1.5" />
                                    {t('superadmin.imageLibraryManagement.uploadImage', 'Upload Image')}
                                </button>
                            </DragDropZone>
                        </div>
                    </header>

                    <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
                        <p className="text-editor-text-secondary mb-6">{t('superadmin.imageLibraryManagement.manageDesc', 'Manage the global stock images available to all users in their Asset Library.')}</p>

                        {/* Search & Filters Bar */}
                        <div className="mb-6 flex flex-wrap gap-3">
                            {/* Search */}
                            <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-editor-border/40 rounded-lg px-3 py-2">
                                <Search size={16} className="text-editor-text-secondary flex-shrink-0" />
                                <input
                                    type="text"
                                    value={library.searchQuery}
                                    onChange={(e) => library.setSearchQuery(e.target.value)}
                                    placeholder={t('common.search', 'Search global assets...')}
                                    className="flex-1 bg-transparent outline-none text-sm min-w-0"
                                />
                                {library.searchQuery && (
                                    <button onClick={() => library.setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Filter Toggle */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-colors ${showFilters ? 'text-editor-accent' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                            >
                                <Filter size={16} />
                                {t('superadmin.imageLibraryManagement.filters', 'Filters')}
                            </button>

                            {/* Selection Mode Toggle */}
                            <button
                                onClick={library.toggleSelectionMode}
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-colors ${library.isSelectionMode ? 'text-editor-accent' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                            >
                                <CheckSquare size={16} />
                                {t('superadmin.imageLibraryManagement.select', 'Select')}
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
                                        <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase">{t('superadmin.imageLibraryManagement.type', 'Type')}</label>
                                        <select
                                            value={library.typeFilter}
                                            onChange={(e) => library.setTypeFilter(e.target.value as any)}
                                            className="w-full px-3 py-2 text-sm bg-editor-bg border border-editor-border rounded-lg focus:ring-2 focus:ring-editor-accent focus:outline-none"
                                        >
                                            <option value="all">{t('superadmin.imageLibraryManagement.allFiles', 'All Files')}</option>
                                            <option value="image">{t('superadmin.imageLibraryManagement.imagesOnly', 'Images Only')}</option>
                                            <option value="document">{t('superadmin.imageLibraryManagement.documentsOnly', 'Documents Only')}</option>
                                            <option value="other">{t('superadmin.imageLibraryManagement.other', 'Other')}</option>
                                        </select>
                                    </div>

                                    {/* Sort By */}
                                    <div>
                                        <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase">{t('superadmin.imageLibraryManagement.sortBy', 'Sort By')}</label>
                                        <select
                                            value={library.sortBy}
                                            onChange={(e) => library.setSortBy(e.target.value as any)}
                                            className="w-full px-3 py-2 text-sm bg-editor-bg border border-editor-border rounded-lg focus:ring-2 focus:ring-editor-accent focus:outline-none"
                                        >
                                            <option value="date">{t('superadmin.imageLibraryManagement.date', 'Date')}</option>
                                            <option value="name">{t('superadmin.imageLibraryManagement.name', 'Name')}</option>
                                            <option value="size">{t('superadmin.imageLibraryManagement.size', 'Size')}</option>
                                            <option value="type">{t('superadmin.imageLibraryManagement.type', 'Type')}</option>
                                        </select>
                                    </div>

                                    {/* Sort Order */}
                                    <div>
                                        <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase">{t('superadmin.imageLibraryManagement.order', 'Order')}</label>
                                        <button
                                            onClick={library.toggleSortOrder}
                                            className="w-full flex items-center justify-between px-3 py-2 text-sm bg-editor-bg border border-editor-border rounded-lg hover:bg-editor-panel-bg transition-colors"
                                        >
                                            <span>{library.sortOrder === 'asc' ? t('superadmin.imageLibraryManagement.ascending', 'Ascending') : t('superadmin.imageLibraryManagement.descending', 'Descending')}</span>
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
                                    {t('superadmin.imageLibraryManagement.selectedAssets', { count: library.selectedIds.size, defaultValue: `${library.selectedIds.size} asset(s) selected` })}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={library.selectAll}
                                        className="px-4 py-2 text-sm font-semibold bg-editor-accent/20 hover:bg-editor-accent/30 rounded-lg transition-colors"
                                    >
                                        {t('superadmin.imageLibraryManagement.selectAll', 'Select All')}
                                    </button>
                                    <button
                                        onClick={handleBulkDownload}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
                                    >
                                        <Download size={16} /> {t('superadmin.imageLibraryManagement.download', 'Download')}
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} /> {t('superadmin.imageLibraryManagement.delete', 'Delete')}
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
                                    <p className="text-editor-text-primary font-medium mb-2">{t('common.noResults', 'No results found')}</p>
                                    <p className="text-editor-text-secondary text-sm mb-4">{t('superadmin.tenant.noTenantsDesc', 'Try adjusting your filters')}</p>
                                    <button
                                        onClick={() => {
                                            library.setSearchQuery('');
                                            library.setTypeFilter('all');
                                        }}
                                        className="text-sm text-editor-accent hover:underline"
                                    >
                                        {t('superadmin.imageLibraryManagement.clearFilters', 'Clear filters')}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* AI Generator Card - Global Library */}
                                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/10 via-pink-600/10 to-orange-500/10 border-2 border-purple-500/20 p-10 text-center group hover:border-purple-500/40 transition-all">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-110 transition-transform"></div>

                                        <div className="relative z-10">
                                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 mb-6 shadow-xl group-hover:scale-110 transition-transform">
                                                <Zap className="w-10 h-10 text-white animate-pulse" />
                                            </div>

                                            <h3 className="text-2xl font-bold text-editor-text-primary mb-3">
                                                {t('superadmin.imageLibraryManagement.generator.title', 'Generate AI Images for Global Library')}
                                            </h3>

                                            <p className="text-base text-editor-text-secondary mb-8 max-w-2xl mx-auto">
                                                {t('superadmin.imageLibraryManagement.generator.description', 'Create stunning 4K images with Quimera AI. Perfect for reusing across multiple projects. Features advanced controls for lighting, camera angles, and style customization.')}
                                            </p>

                                            <button
                                                onClick={() => setIsGeneratorOpen(true)}
                                                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-bold transition-all bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 transform"
                                            >
                                                <Zap className="w-6 h-6" />
                                                {t('superadmin.imageLibraryManagement.generator.open', 'Open Image Generator')}
                                            </button>

                                            <div className="mt-8 flex items-center justify-center gap-8 text-sm text-editor-text-secondary">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles size={16} className="text-purple-400" />
                                                    <span>{t('superadmin.imageLibraryManagement.generator.resolution', 'Up to 4K Resolution')}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Sparkles size={16} className="text-pink-400" />
                                                    <span>{t('superadmin.imageLibraryManagement.generator.lighting', 'Advanced Lighting & Camera')}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Sparkles size={16} className="text-orange-400" />
                                                    <span>{t('superadmin.imageLibraryManagement.generator.reference', 'Reference Image Support')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Upload Zone */}
                                    <div className="text-center py-3">
                                        <p className="text-sm text-editor-text-secondary mb-4">{t('superadmin.imageLibraryManagement.generator.orUpload', 'Or upload existing images to the global library')}</p>
                                        <DragDropZone
                                            onFileSelect={handleFileUpload}
                                            accept="image/*"
                                            maxSizeMB={10}
                                            className="min-h-[250px]"
                                        />
                                    </div>
                                </div>
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
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105 no-theme-transition"
                                                    loading="lazy"
                                                    decoding="async"
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
                                            {t('superadmin.imageLibraryManagement.pagination', { current: library.currentPage, total: library.totalPages, count: library.stats.filtered })}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={library.prevPage}
                                                disabled={!library.hasPrevPage}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-editor-panel-bg hover:bg-editor-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronLeft size={16} />
                                                {t('superadmin.imageLibraryManagement.previous', 'Previous')}
                                            </button>
                                            <button
                                                onClick={library.nextPage}
                                                disabled={!library.hasNextPage}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-editor-panel-bg hover:bg-editor-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {t('superadmin.imageLibraryManagement.next', 'Next')}
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
