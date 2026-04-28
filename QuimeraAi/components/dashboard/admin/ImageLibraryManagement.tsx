
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { useFiles } from '../../../contexts/files';
import { useToast } from '../../../contexts/ToastContext';
import { useAssetLibrary } from '../../../hooks/useAssetLibrary';
import DashboardSidebar from '../DashboardSidebar';
import DashboardWaveRibbons from '../DashboardWaveRibbons';
import { Image, Upload, Trash2, Download, Zap, Search, Filter, ArrowUpDown, CheckSquare, Square, ChevronLeft, ChevronRight, Menu, Sparkles, X, Eye, Copy, Calendar, HardDrive, FileType, Star, Shapes, Layout, FolderOpen, Grid } from 'lucide-react';
import { FileRecord } from '../../../types';
import ImageGeneratorModal from '../../ui/ImageGeneratorModal';
import DragDropZone from '../../ui/DragDropZone';
import { formatBytes } from '../../../utils/fileHelpers';
import { DEFAULT_FOLDERS, BRAND_ASSETS, AssetFolder, BrandAsset } from '../../../constants/brandAssets';
import HeaderBackButton from '../../ui/HeaderBackButton';

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
    const [selectedImageForDetail, setSelectedImageForDetail] = useState<FileRecord | null>(null);

    // Folder state
    const [selectedFolder, setSelectedFolder] = useState<string>('all');
    const [isFolderPanelOpen, setIsFolderPanelOpen] = useState(true);

    // Folder icons mapping
    const FOLDER_ICONS: Record<string, React.ReactNode> = {
        grid: <Grid size={18} />,
        star: <Star size={18} />,
        shapes: <Shapes size={18} />,
        image: <Image size={18} />,
        layout: <Layout size={18} />,
        upload: <Upload size={18} />,
        sparkles: <Sparkles size={18} />,
    };

    // Combine global files with brand assets
    const allFiles = useMemo(() => {
        // Convert brand assets to FileRecord format
        const brandAssetFiles: FileRecord[] = BRAND_ASSETS.map(asset => ({
            id: asset.id,
            name: asset.name,
            downloadURL: asset.downloadURL,
            type: asset.type,
            size: asset.size,
            storagePath: '',
            folder: asset.folder,
            isSystemAsset: asset.isSystemAsset,
            createdAt: new Date().toISOString(),
        } as unknown as FileRecord));

        // Add folder property to user files (default to 'uploads')
        const userFiles = globalFiles.map(file => ({
            ...file,
            folder: (file as any).folder || 'uploads',
        }));

        return [...brandAssetFiles, ...userFiles];
    }, [globalFiles]);

    // Filter files by selected folder
    const filteredByFolder = useMemo(() => {
        if (selectedFolder === 'all') return allFiles;
        return allFiles.filter(file => (file as any).folder === selectedFolder);
    }, [allFiles, selectedFolder]);

    // Use the custom hook for asset management - now uses filteredByFolder
    const library = useAssetLibrary({
        files: filteredByFolder,
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

    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [pendingDeleteFile, setPendingDeleteFile] = useState<FileRecord | null>(null);

    const handleBulkDelete = () => {
        if (library.selectedFiles.length === 0) return;
        setShowBulkDeleteModal(true);
    };

    const confirmBulkDelete = async () => {
        setShowBulkDeleteModal(false);
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

    const handleSingleDelete = (file: FileRecord) => {
        // Protect system assets from deletion
        if ((file as any).isSystemAsset) {
            showError(t('superadmin.imageLibraryManagement.cannotDeleteSystem', 'Los assets del sistema no se pueden eliminar'));
            return;
        }
        setPendingDeleteFile(file);
    };

    const confirmSingleDelete = async () => {
        if (!pendingDeleteFile) return;
        try {
            await deleteGlobalFile(pendingDeleteFile.id, pendingDeleteFile.storagePath);
            success(t('superadmin.imageLibraryManagement.assetDeleted', 'Asset deleted successfully'));
        } catch (err) {
            showError(t('superadmin.imageLibraryManagement.assetDeletedError', 'Failed to delete asset'));
        }
        setPendingDeleteFile(null);
    };

    return (
        <>
            <ImageGeneratorModal
                isOpen={isGeneratorOpen}
                onClose={() => setIsGeneratorOpen(false)}
                destination="admin"
                adminCategory="ai_generated"
            />

            {/* Image Detail Modal */}
            {selectedImageForDetail && (
                <div
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setSelectedImageForDetail(null)}
                >
                    <div
                        className="bg-q-bg border border-q-border rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col lg:flex-row animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Image Preview */}
                        <div className="flex-1 min-h-[300px] lg:min-h-0 bg-black/50 flex items-center justify-center p-4">
                            <img
                                src={selectedImageForDetail.downloadURL}
                                alt={selectedImageForDetail.name}
                                className="max-w-full max-h-[60vh] lg:max-h-[80vh] object-contain rounded-lg shadow-xl"
                            />
                        </div>

                        {/* Details Panel */}
                        <div className="w-full lg:w-[380px] flex-shrink-0 border-t lg:border-t-0 lg:border-l border-q-border bg-q-surface/50 overflow-y-auto">
                            {/* Header */}
                            <div className="p-4 border-b border-q-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Image size={18} className="text-q-accent" />
                                    <h3 className="font-bold text-q-text">
                                        {t('superadmin.imageLibraryManagement.imageDetails', 'Image Details')}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setSelectedImageForDetail(null)}
                                    className="p-1.5 rounded-lg hover:bg-q-surface-overlay text-q-text-secondary hover:text-q-text transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-5">
                                {/* File Name */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-q-text-secondary uppercase tracking-wide mb-2">
                                        <FileType size={12} />
                                        {t('common.fileName', 'File Name')}
                                    </label>
                                    <div className="bg-q-bg border border-q-border rounded-xl p-3">
                                        <p className="text-sm text-q-text break-all">
                                            {selectedImageForDetail.name}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedImageForDetail.name);
                                            success(t('common.copied', 'Copied to clipboard'));
                                        }}
                                        className="mt-2 flex items-center gap-1 text-xs text-q-accent hover:text-q-accent transition-colors"
                                    >
                                        <Copy size={12} />
                                        {t('common.copyName', 'Copy name')}
                                    </button>
                                </div>

                                {/* URL */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-q-text-secondary uppercase tracking-wide mb-2">
                                        URL
                                    </label>
                                    <div className="bg-q-bg border border-q-border rounded-xl p-3">
                                        <p className="text-xs text-q-text-secondary break-all font-mono">
                                            {selectedImageForDetail.downloadURL.substring(0, 80)}...
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedImageForDetail.downloadURL);
                                            success(t('common.copied', 'Copied to clipboard'));
                                        }}
                                        className="mt-2 flex items-center gap-1 text-xs text-q-accent hover:text-q-accent transition-colors"
                                    >
                                        <Copy size={12} />
                                        {t('common.copyUrl', 'Copy URL')}
                                    </button>
                                </div>

                                {/* File Info */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-q-text-secondary uppercase tracking-wide mb-3">
                                        {t('common.fileInfo', 'File Information')}
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Size */}
                                        <div className="bg-q-bg border border-q-border rounded-xl p-3">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <HardDrive size={12} className="text-q-text-secondary" />
                                                <span className="text-[10px] text-q-text-secondary uppercase tracking-wide">
                                                    {t('common.size', 'Size')}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-q-text">
                                                {formatBytes(selectedImageForDetail.size)}
                                            </p>
                                        </div>

                                        {/* Type */}
                                        <div className="bg-q-bg border border-q-border rounded-xl p-3">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <FileType size={12} className="text-q-text-secondary" />
                                                <span className="text-[10px] text-q-text-secondary uppercase tracking-wide">
                                                    {t('common.type', 'Type')}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-q-text">
                                                {selectedImageForDetail.type.split('/')[1]?.toUpperCase() || 'Unknown'}
                                            </p>
                                        </div>

                                        {/* Created Date */}
                                        <div className="bg-q-bg border border-q-border rounded-xl p-3 col-span-2">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Calendar size={12} className="text-q-text-secondary" />
                                                <span className="text-[10px] text-q-text-secondary uppercase tracking-wide">
                                                    {t('common.created', 'Created')}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-q-text">
                                                {selectedImageForDetail.createdAt
                                                    ? new Date(selectedImageForDetail.createdAt).toLocaleString()
                                                    : 'Unknown'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Generated Info (if available) */}
                                {(selectedImageForDetail as any).aiPrompt && (
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-bold text-q-accent uppercase tracking-wide mb-2">
                                            <Sparkles size={12} />
                                            {t('common.aiPrompt', 'AI Prompt')}
                                        </label>
                                        <div className="bg-q-bg border border-q-accent/30 rounded-xl p-3">
                                            <p className="text-sm text-q-text leading-relaxed">
                                                {(selectedImageForDetail as any).aiPrompt}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText((selectedImageForDetail as any).aiPrompt);
                                                success(t('common.copied', 'Copied to clipboard'));
                                            }}
                                            className="mt-2 flex items-center gap-1 text-xs text-q-accent hover:text-q-accent transition-colors"
                                        >
                                            <Copy size={12} />
                                            {t('common.copyPrompt', 'Copy prompt')}
                                        </button>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="pt-3 border-t border-q-border space-y-2">
                                    <a
                                        href={selectedImageForDetail.downloadURL}
                                        download={selectedImageForDetail.name}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-q-accent text-q-bg rounded-xl text-sm font-bold hover:bg-q-accent transition-colors"
                                    >
                                        <Download size={16} />
                                        {t('common.downloadImage', 'Download Image')}
                                    </a>
                                    <button
                                        onClick={() => {
                                            setSelectedImageForDetail(null);
                                            handleSingleDelete(selectedImageForDetail);
                                        }}
                                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                        {t('common.deleteImage', 'Delete Image')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex h-screen bg-q-bg text-q-text">
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

                {/* Folder Sidebar */}
                {isFolderPanelOpen && (
                    <aside className="w-56 flex-shrink-0 bg-q-surface border-r border-q-border hidden md:flex flex-col overflow-y-auto">
                        <div className="p-4 border-b border-q-border">
                            <div className="flex items-center gap-2">
                                <FolderOpen size={18} className="text-q-accent" />
                                <h2 className="font-semibold text-sm">{t('superadmin.imageLibraryManagement.folders', 'Carpetas')}</h2>
                            </div>
                        </div>
                        <nav className="flex-1 p-2 space-y-1">
                            {DEFAULT_FOLDERS.map((folder) => (
                                <button
                                    key={folder.id}
                                    onClick={() => setSelectedFolder(folder.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${selectedFolder === folder.id
                                        ? 'bg-q-accent text-q-bg font-semibold'
                                        : 'text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/40'
                                        }`}
                                >
                                    <span className={`flex-shrink-0 ${selectedFolder === folder.id ? 'text-q-bg' : 'text-q-text-secondary'}`}>
                                        {FOLDER_ICONS[folder.icon] || <FolderOpen size={18} />}
                                    </span>
                                    <span className="truncate">{folder.name}</span>
                                    {folder.isSystemFolder && (
                                        <span className="ml-auto flex-shrink-0">
                                            <Star size={12} className={selectedFolder === folder.id ? 'text-q-bg' : 'text-yellow-500'} />
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>
                        {/* Folder stats */}
                        <div className="p-4 border-t border-q-border">
                            <p className="text-xs text-q-text-secondary">
                                {allFiles.length} {t('superadmin.imageLibraryManagement.totalImages', 'imágenes totales')}
                            </p>
                        </div>
                    </aside>
                )}

                <div className="flex-1 flex flex-col overflow-hidden relative">
                    <DashboardWaveRibbons className="absolute inset-x-0 top-[7rem] h-64 z-0 pointer-events-none overflow-hidden" />
                    {/* Header */}
                    <header className="h-14 bg-q-bg border-b border-q-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                        <div className="flex items-center">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="h-9 w-9 flex items-center justify-center text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/40 rounded-full lg:hidden mr-2 transition-colors"
                                title={t('common.openMenu', 'Open menu')}
                            >
                                <Menu className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2">
                                <Image className="text-q-accent w-5 h-5" />
                                <h1 className="text-lg font-semibold text-q-text">{t('superadmin.imageLibraryManagement.title', 'Global Image Library')}</h1>
                            </div>
                            {library.stats.filtered < library.stats.total && (
                                <span className="ml-3 text-xs text-q-text-secondary bg-q-surface-overlay px-2 py-1 rounded-md">
                                    {library.stats.filtered} of {library.stats.total}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <HeaderBackButton onClick={onBack} label={t('superadmin.backToAdmin', 'Back to Admin')} className="border-q-border/60 bg-q-surface/60 text-q-text-secondary hover:bg-q-surface-overlay/40 hover:text-q-text focus:ring-q-accent/25" />
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
                                <button className="flex items-center text-sm font-semibold py-2 px-3 text-q-accent hover:text-q-accent transition-colors">
                                    <Upload size={16} className="mr-1.5" />
                                    {t('superadmin.imageLibraryManagement.uploadImage', 'Upload Image')}
                                </button>
                            </DragDropZone>
                        </div>
                    </header>

                    <main className="flex-1 p-6 sm:p-8 overflow-y-auto relative z-[2]">
                        <div className="max-w-7xl mx-auto">
                            <div className="bg-q-surface/80 border border-q-border rounded-2xl p-6 sm:p-8">
                                <p className="text-q-text-secondary mb-6">{t('superadmin.imageLibraryManagement.manageDesc', 'Manage the global stock images available to all users in their Asset Library.')}</p>

                                {/* Search & Filters Bar */}
                                <div className="mb-6 flex flex-wrap gap-3">
                                    {/* Search */}
                                    <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-q-surface-overlay/40 rounded-lg px-3 py-2">
                                        <Search size={16} className="text-q-text-secondary flex-shrink-0" />
                                        <input
                                            type="text"
                                            value={library.searchQuery}
                                            onChange={(e) => library.setSearchQuery(e.target.value)}
                                            placeholder={t('common.search', 'Search global assets...')}
                                            className="flex-1 bg-transparent outline-none text-sm min-w-0"
                                        />
                                        {library.searchQuery && (
                                            <button onClick={() => library.setSearchQuery('')} className="text-q-text-secondary hover:text-q-text flex-shrink-0">
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Filter Toggle */}
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-colors ${showFilters ? 'text-q-accent' : 'text-q-text-secondary hover:text-q-text'}`}
                                    >
                                        <Filter size={16} />
                                        {t('superadmin.imageLibraryManagement.filters', 'Filters')}
                                    </button>

                                    {/* Selection Mode Toggle */}
                                    <button
                                        onClick={library.toggleSelectionMode}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-colors ${library.isSelectionMode ? 'text-q-accent' : 'text-q-text-secondary hover:text-q-text'}`}
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
                                    <div className="mb-6 p-4 bg-q-surface rounded-lg border border-q-border animate-fade-in-up">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {/* Type Filter */}
                                            <div>
                                                <label className="block text-xs font-bold text-q-text-secondary mb-2 uppercase">{t('superadmin.imageLibraryManagement.type', 'Type')}</label>
                                                <select
                                                    value={library.typeFilter}
                                                    onChange={(e) => library.setTypeFilter(e.target.value as any)}
                                                    className="w-full px-3 py-2 text-sm bg-q-bg border border-q-border rounded-lg focus:ring-2 focus:ring-q-accent focus:outline-none"
                                                >
                                                    <option value="all">{t('superadmin.imageLibraryManagement.allFiles', 'All Files')}</option>
                                                    <option value="image">{t('superadmin.imageLibraryManagement.imagesOnly', 'Images Only')}</option>
                                                    <option value="document">{t('superadmin.imageLibraryManagement.documentsOnly', 'Documents Only')}</option>
                                                    <option value="other">{t('superadmin.imageLibraryManagement.other', 'Other')}</option>
                                                </select>
                                            </div>

                                            {/* Sort By */}
                                            <div>
                                                <label className="block text-xs font-bold text-q-text-secondary mb-2 uppercase">{t('superadmin.imageLibraryManagement.sortBy', 'Sort By')}</label>
                                                <select
                                                    value={library.sortBy}
                                                    onChange={(e) => library.setSortBy(e.target.value as any)}
                                                    className="w-full px-3 py-2 text-sm bg-q-bg border border-q-border rounded-lg focus:ring-2 focus:ring-q-accent focus:outline-none"
                                                >
                                                    <option value="date">{t('superadmin.imageLibraryManagement.date', 'Date')}</option>
                                                    <option value="name">{t('superadmin.imageLibraryManagement.name', 'Name')}</option>
                                                    <option value="size">{t('superadmin.imageLibraryManagement.size', 'Size')}</option>
                                                    <option value="type">{t('superadmin.imageLibraryManagement.type', 'Type')}</option>
                                                </select>
                                            </div>

                                            {/* Sort Order */}
                                            <div>
                                                <label className="block text-xs font-bold text-q-text-secondary mb-2 uppercase">{t('superadmin.imageLibraryManagement.order', 'Order')}</label>
                                                <button
                                                    onClick={library.toggleSortOrder}
                                                    className="w-full flex items-center justify-between px-3 py-2 text-sm bg-q-bg border border-q-border rounded-lg hover:bg-q-surface transition-colors"
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
                                    <div className="mb-6 p-4 bg-q-accent/10 rounded-lg border border-q-accent/30 flex items-center justify-between animate-fade-in-up">
                                        <span className="text-sm font-medium text-q-text">
                                            {t('superadmin.imageLibraryManagement.selectedAssets', { count: library.selectedIds.size, defaultValue: `${library.selectedIds.size} asset(s) selected` })}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={library.selectAll}
                                                className="px-4 py-2 text-sm font-semibold bg-q-accent/20 hover:bg-q-accent/30 rounded-lg transition-colors"
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
                                        <div className="w-8 h-8 border-4 border-q-accent border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : library.files.length === 0 ? (
                                    library.searchQuery || library.typeFilter !== 'all' ? (
                                        <div className="text-center py-16 border-2 border-dashed border-q-border rounded-xl">
                                            <Search size={48} className="mx-auto text-q-text-secondary opacity-50 mb-4" />
                                            <p className="text-q-text font-medium mb-2">{t('common.noResults', 'No results found')}</p>
                                            <p className="text-q-text-secondary text-sm mb-4">{t('superadmin.tenant.noTenantsDesc', 'Try adjusting your filters')}</p>
                                            <button
                                                onClick={() => {
                                                    library.setSearchQuery('');
                                                    library.setTypeFilter('all');
                                                }}
                                                className="text-sm text-q-accent hover:underline"
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

                                                    <h3 className="text-2xl font-bold text-q-text mb-3">
                                                        {t('superadmin.imageLibraryManagement.generator.title', 'Generate AI Images for Global Library')}
                                                    </h3>

                                                    <p className="text-base text-q-text-secondary mb-8 max-w-2xl mx-auto">
                                                        {t('superadmin.imageLibraryManagement.generator.description', 'Create stunning 4K images with Quimera AI. Perfect for reusing across multiple projects. Features advanced controls for lighting, camera angles, and style customization.')}
                                                    </p>

                                                    <button
                                                        onClick={() => setIsGeneratorOpen(true)}
                                                        className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-bold transition-all bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 transform"
                                                    >
                                                        <Zap className="w-6 h-6" />
                                                        {t('superadmin.imageLibraryManagement.generator.open', 'Open Image Generator')}
                                                    </button>

                                                    <div className="mt-8 flex items-center justify-center gap-8 text-sm text-q-text-secondary">
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
                                                <p className="text-sm text-q-text-secondary mb-4">{t('superadmin.imageLibraryManagement.generator.orUpload', 'Or upload existing images to the global library')}</p>
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
                                                    className={`group relative rounded-lg border overflow-hidden hover:border-q-accent transition-all ${library.isSelected(file.id) ? 'border-q-accent ring-2 ring-q-accent' : 'border-q-border'}`}
                                                >
                                                    <div
                                                        className="aspect-square bg-q-bg overflow-hidden cursor-pointer relative"
                                                        onClick={() => {
                                                            if (library.isSelectionMode) {
                                                                library.toggleSelection(file.id);
                                                            }
                                                        }}
                                                        onDoubleClick={() => {
                                                            if (!library.isSelectionMode) {
                                                                setSelectedImageForDetail(file);
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

                                                        {/* View details button */}
                                                        {!library.isSelectionMode && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedImageForDetail(file);
                                                                }}
                                                                className="absolute top-2 left-2 p-1.5 bg-black/60 text-white rounded-md hover:bg-q-accent transition-colors opacity-0 group-hover:opacity-100 z-10"
                                                                title={t('common.viewDetails', 'View details')}
                                                            >
                                                                <Eye size={14} />
                                                            </button>
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
                                                                    <CheckSquare size={18} className="text-q-accent" />
                                                                ) : (
                                                                    <Square size={18} className="text-q-text-secondary" />
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
                                                                className="p-1.5 bg-black/60 text-white rounded-md hover:bg-q-accent transition-colors"
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
                                            <div className="mt-8 flex items-center justify-between border-t border-q-border pt-6">
                                                <span className="text-sm text-q-text-secondary">
                                                    {t('superadmin.imageLibraryManagement.pagination', { current: library.currentPage, total: library.totalPages, count: library.stats.filtered })}
                                                </span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={library.prevPage}
                                                        disabled={!library.hasPrevPage}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-q-surface hover:bg-q-surface-overlay disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <ChevronLeft size={16} />
                                                        {t('superadmin.imageLibraryManagement.previous', 'Previous')}
                                                    </button>
                                                    <button
                                                        onClick={library.nextPage}
                                                        disabled={!library.hasNextPage}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-q-surface hover:bg-q-surface-overlay disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {t('superadmin.imageLibraryManagement.next', 'Next')}
                                                        <ChevronRight size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showBulkDeleteModal}
                onConfirm={confirmBulkDelete}
                onCancel={() => setShowBulkDeleteModal(false)}
                title={t('superadmin.imageLibraryManagement.deleteTitle', 'Delete Assets?')}
                message={t('superadmin.imageLibraryManagement.deleteConfirm', { count: library.selectedFiles.length, defaultValue: `Delete ${library.selectedFiles.length} global asset(s)? This action cannot be undone.` })}
                variant="danger"
            />

            <ConfirmationModal
                isOpen={!!pendingDeleteFile}
                onConfirm={confirmSingleDelete}
                onCancel={() => setPendingDeleteFile(null)}
                title={t('superadmin.imageLibraryManagement.deleteSingleTitle', 'Delete Asset?')}
                message={t('superadmin.imageLibraryManagement.deleteSingleConfirm', 'Delete this global asset?')}
                variant="danger"
            />
        </>
    );
};

export default ImageLibraryManagement;
