import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFiles } from '../../contexts/files';
import { useProject } from '../../contexts/project';
import { useToast } from '../../contexts/ToastContext';
import { usePublicProducts } from '../../hooks/usePublicProducts';
import { Image, Upload, Zap, Grid, X, Check, Search, FolderOpen, ShoppingBag, Maximize2, Trash2 } from 'lucide-react';
import DragDropZone from './DragDropZone';
import { searchFiles } from '../../utils/fileHelpers';
import { FileRecord } from '../../types';
import ImageGeneratorPanel from './ImageGeneratorPanel';
import ImageDetailModal from './ImageDetailModal';

interface ImagePickerProps {
    label: string;
    value: string;
    onChange: (url: string) => void;
    /** Optional store ID to show product images */
    storeId?: string;
    /** When true, opens the modal immediately without showing the inline preview. 
     * Must be used with onClose to properly unmount the component. */
    defaultOpen?: boolean;
    /** Callback when the modal is closed. Required when using defaultOpen. */
    onClose?: () => void;
    /** Optional callback to remove/clear the image or item (shows trash icon) */
    onRemove?: () => void;
    /** Destination for uploads and generation. Defaults to 'user' (project files). 'global' uses Super Admin library. */
    destination?: 'user' | 'global';
    /** Optional flag to hide the raw URL text input */
    hideUrlInput?: boolean;
}

const ImagePicker: React.FC<ImagePickerProps> = ({ label, value, onChange, storeId, defaultOpen = false, onClose, onRemove, destination = 'user', hideUrlInput = true }) => {
    const { t } = useTranslation();
    const {
        files, uploadFile,
        globalFiles, uploadGlobalFile,
        isFilesLoading, isGlobalFilesLoading
    } = useFiles();
    const { activeProjectId, activeProject } = useProject();
    const { success, error: showError } = useToast();
    const [isLibraryOpen, setIsLibraryOpen] = useState(defaultOpen);
    const [activeTab, setActiveTab] = useState<'library' | 'generate' | 'products'>('library');

    // Handle closing the modal
    const handleClose = () => {
        setIsLibraryOpen(false);
        if (onClose) {
            onClose();
        }
    };

    // Product images - only fetch if storeId is provided
    const { products: storeProducts, isLoading: isLoadingProducts } = usePublicProducts(
        storeId || null,
        { limitCount: 100 }
    );

    // Filter products that have images
    const productImages = useMemo(() => {
        return storeProducts
            .filter(p => p.image && p.image.trim() !== '')
            .map(p => ({
                id: p.id,
                name: p.name,
                imageUrl: p.image!,
            }));
    }, [storeProducts]);

    // Library filters
    const [searchQuery, setSearchQuery] = useState('');

    // Detailed preview state
    const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);

    const handleFileUpload = async (file: File) => {
        try {
            if (destination === 'global') {
                await uploadGlobalFile(file);
                success(t('dashboard.imagePicker.uploadGlobalSuccess', { name: file.name, defaultValue: 'Archivo subido a librería global' }));
            } else {
                await uploadFile(file);
                success(t('dashboard.imagePicker.uploadSuccess', { name: file.name }));
            }
            setIsLibraryOpen(true);
            setActiveTab('library');
        } catch (err) {
            showError(t('dashboard.imagePicker.uploadError'));
        }
    };

    // Filter and search image files based on destination
    const imageFiles = useMemo(() => {
        // Choose source array based on destination
        const sourceFiles = destination === 'global' ? globalFiles : files;

        let result = sourceFiles.filter(f => f.type.startsWith('image/'));

        // Only filter by project if using user destination
        if (destination === 'user' && activeProjectId) {
            result = result.filter(f => f.projectId === activeProjectId);
        }

        if (searchQuery) {
            result = searchFiles(result, searchQuery);
        }

        return result;
    }, [files, globalFiles, searchQuery, activeProjectId, destination]);

    return (
        <>
            {/* Inline UI - Only show when NOT using defaultOpen */}
            {!defaultOpen && (
                <div className="mb-3">
                    {label && (
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{label}</label>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        {/* Thumbnail Preview */}
                        <div
                            className="w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-editor-panel-bg border border-editor-border relative group cursor-pointer"
                            onClick={() => {
                                if (value) {
                                    // Preview logic
                                    const file = files.find(f => f.downloadURL === value);
                                    if (file) setPreviewFile(file);
                                    else setPreviewFile({
                                        id: 'temp', name: label || 'Preview', downloadURL: value, storagePath: '', size: 0, type: 'image/jpeg',
                                        createdAt: new Date().toISOString(), projectId: activeProjectId || ''
                                    });
                                }
                            }}
                        >
                            {value ? (
                                <img src={value} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-editor-text-secondary">
                                    <Image size={16} />
                                </div>
                            )}
                        </div>

                        {/* URL Input */}
                        {!hideUrlInput && (
                            <div className="flex-1 min-w-0">
                                <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => onChange(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-editor-panel-bg border border-editor-border rounded-lg px-3 py-2 text-xs text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent placeholder:text-editor-text-secondary/50 truncate font-mono"
                                />
                            </div>
                        )}

                        {/* Action Buttons */}
                        <button
                            onClick={() => { setIsLibraryOpen(true); setActiveTab('library'); }}
                            className="shrink-0 p-2 rounded-lg bg-editor-panel-bg border border-editor-border text-editor-text-secondary hover:text-editor-text-primary hover:border-editor-primary transition-colors"
                            title={t('dashboard.imagePicker.openLibrary')}
                        >
                            <Grid size={16} />
                        </button>
                        <button
                            onClick={() => { setIsLibraryOpen(true); setActiveTab('generate'); }}
                            className="shrink-0 p-2 rounded-lg bg-editor-accent/10 border border-editor-accent/20 text-editor-accent hover:bg-editor-accent/20 transition-colors"
                            title={t('dashboard.imagePicker.generateWithAI')}
                        >
                            <Zap size={16} />
                        </button>

                        {/* Optional Remove Button */}
                        {onRemove && (
                            <button
                                onClick={onRemove}
                                className="shrink-0 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors"
                                title={t('common.remove')}
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Main Modal (Combined Library & Generator) - Always rendered when isLibraryOpen is true */}
            {isLibraryOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up"
                    onClick={handleClose}
                >
                    <div
                        className="bg-editor-bg w-full max-w-4xl h-[85vh] flex flex-col rounded-xl overflow-hidden shadow-2xl border border-editor-border"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-editor-border flex justify-between items-center bg-editor-panel-bg">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setActiveTab('library')}
                                    className={`pb-1 border-b-2 text-sm font-bold transition-colors ${activeTab === 'library' ? 'border-editor-accent text-editor-text-primary' : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'}`}
                                >
                                    {t('dashboard.imagePicker.assetLibrary')}
                                </button>
                                {storeId && (
                                    <button
                                        onClick={() => setActiveTab('products')}
                                        className={`pb-1 border-b-2 text-sm font-bold transition-colors flex items-center gap-1 ${activeTab === 'products' ? 'border-editor-accent text-editor-accent' : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'}`}
                                    >
                                        <ShoppingBag size={14} /> {t('dashboard.imagePicker.productImages', 'Productos')}
                                    </button>
                                )}
                                <button
                                    onClick={() => setActiveTab('generate')}
                                    className={`pb-1 border-b-2 text-sm font-bold transition-colors flex items-center gap-1 ${activeTab === 'generate' ? 'border-editor-accent text-editor-accent' : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'}`}
                                >
                                    <Zap size={14} /> Quimera.ai
                                </button>
                            </div>
                            <button onClick={handleClose} className="p-1 rounded-full hover:bg-editor-border"><X size={20} /></button>
                        </div>

                        {/* Content */}
                        <div className="flex-grow overflow-hidden p-6 bg-editor-bg">

                            {/* LIBRARY TAB */}
                            {activeTab === 'library' && (
                                <div className="h-full flex flex-col">
                                    {/* Library Controls - Compact */}
                                    <div className="flex items-center gap-3 mb-4">
                                        {/* Project indicator */}
                                        <div className="flex items-center gap-1.5 text-editor-text-secondary">
                                            <FolderOpen size={14} className="text-editor-accent" />
                                            <span className="text-xs font-medium text-editor-text-primary">{activeProject?.name}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 bg-editor-panel-bg rounded">
                                                {imageFiles.length} {imageFiles.length === 1 ? t('dashboard.imagePicker.image') : t('dashboard.imagePicker.images')}
                                            </span>
                                            {destination === 'global' && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded border border-blue-500/20 ml-2">
                                                    GLOBAL
                                                </span>
                                            )}
                                        </div>

                                        {/* Spacer */}
                                        <div className="flex-1" />

                                        {/* Search */}
                                        <div className="flex items-center gap-1.5 bg-editor-border/40 rounded-lg px-2.5 py-1.5 w-44">
                                            <Search size={12} className="text-editor-text-secondary flex-shrink-0" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder={t('dashboard.imagePicker.searchImages')}
                                                className="flex-1 bg-transparent outline-none text-xs min-w-0"
                                            />
                                            {searchQuery && (
                                                <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Upload Button */}
                                        <DragDropZone
                                            onFileSelect={handleFileUpload}
                                            accept="image/*"
                                            maxSizeMB={10}
                                            variant="compact"
                                        >
                                            <button className="flex items-center gap-1.5 bg-editor-accent text-editor-bg px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-editor-accent-hover transition-colors whitespace-nowrap">
                                                <Upload size={14} /> {t('dashboard.imagePicker.upload')}
                                            </button>
                                        </DragDropZone>
                                    </div>

                                    {/* Images Grid */}
                                    <div className="flex-grow overflow-y-auto custom-scrollbar">
                                        {imageFiles.length > 0 ? (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                                {imageFiles.map(file => (
                                                    <div
                                                        key={file.id}
                                                        onClick={() => { onChange(file.downloadURL); handleClose(); success(t('dashboard.imagePicker.imageSelected')); }}
                                                        className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer group relative transition-all ${value === file.downloadURL ? 'border-editor-accent ring-2 ring-editor-accent/50' : 'border-transparent hover:border-editor-text-secondary'}`}
                                                    >
                                                        <img src={file.downloadURL} alt={file.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                        {value === file.downloadURL ? (
                                                            <div className="absolute inset-0 bg-editor-accent/20 flex items-center justify-center">
                                                                <div className="bg-editor-accent text-editor-bg rounded-full p-2">
                                                                    <Check size={20} />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <span className="text-white text-xs font-bold">{t('dashboard.imagePicker.select')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : searchQuery ? (
                                            <div className="h-full flex flex-col items-center justify-center text-editor-text-secondary">
                                                <Search size={48} className="mb-4 opacity-50" />
                                                <p className="font-medium mb-2">{t('dashboard.imagePicker.noImagesFound')}</p>
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    className="text-editor-accent hover:underline text-sm"
                                                >
                                                    {t('dashboard.imagePicker.clearFilters')}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-editor-text-secondary border-2 border-dashed border-editor-border rounded-xl">
                                                <Image size={48} className="mb-4 opacity-50" />
                                                <p className="mb-2">{t('dashboard.imagePicker.noImagesInLibrary')}</p>
                                                <DragDropZone
                                                    onFileSelect={handleFileUpload}
                                                    accept="image/*"
                                                    maxSizeMB={10}
                                                    variant="compact"
                                                >
                                                    <button className="mt-4 text-editor-accent hover:underline">{t('dashboard.imagePicker.uploadOneNow')}</button>
                                                </DragDropZone>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* PRODUCTS TAB */}
                            {activeTab === 'products' && storeId && (
                                <div className="h-full flex flex-col">
                                    {/* ... Product tab content (kept same) ... */}
                                    <div className="mb-4">
                                        <p className="text-sm text-editor-text-secondary">
                                            {t('dashboard.imagePicker.selectFromProducts', 'Selecciona una imagen de tus productos')}
                                        </p>
                                    </div>

                                    {isLoadingProducts ? (
                                        <div className="flex-grow flex items-center justify-center">
                                            <div className="animate-spin w-8 h-8 border-2 border-editor-accent border-t-transparent rounded-full" />
                                        </div>
                                    ) : productImages.length > 0 ? (
                                        <div className="flex-grow overflow-y-auto custom-scrollbar">
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                                {productImages.map(product => (
                                                    <div
                                                        key={product.id}
                                                        onClick={() => { onChange(product.imageUrl); handleClose(); success(t('dashboard.imagePicker.imageSelected')); }}
                                                        className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer group relative transition-all ${value === product.imageUrl ? 'border-editor-accent ring-2 ring-editor-accent/50' : 'border-transparent hover:border-editor-text-secondary'}`}
                                                    >
                                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                        {value === product.imageUrl ? (
                                                            <div className="absolute inset-0 bg-editor-accent/20 flex items-center justify-center">
                                                                <div className="bg-editor-accent text-editor-bg rounded-full p-2">
                                                                    <Check size={20} />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                                                                <span className="text-white text-xs font-bold text-center line-clamp-2">{product.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-grow flex flex-col items-center justify-center text-editor-text-secondary">
                                            <ShoppingBag size={48} className="mb-4 opacity-50" />
                                            <p className="font-medium mb-2">{t('dashboard.imagePicker.noProductImages', 'No hay imágenes de productos')}</p>
                                            <p className="text-sm text-center max-w-md">
                                                {t('dashboard.imagePicker.addProductImagesHint', 'Agrega imágenes a tus productos en la sección de Productos para verlas aquí.')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* GENERATE TAB - REPLACED WITH ImageGeneratorPanel */}
                            {activeTab === 'generate' && (
                                <ImageGeneratorPanel
                                    destination={destination}
                                    className="h-full"
                                    onUseImage={(url) => {
                                        onChange(url);
                                        handleClose();
                                        success(t('dashboard.imagePicker.imageSelected'));
                                    }}
                                // No onClose passed here because we don't want the X button in the panel header
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Preview Modal */}
            {previewFile && (
                <ImageDetailModal
                    file={previewFile}
                    isOpen={!!previewFile}
                    onClose={() => setPreviewFile(null)}
                />
            )}
        </>
    );
};

export default ImagePicker;