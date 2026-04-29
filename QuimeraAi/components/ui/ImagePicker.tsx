import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useSafeFiles } from '../../contexts/files';
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
    /** Destination for uploads and generation. Defaults to 'user' (project files). 'global' is kept as a legacy alias for 'admin'. */
    destination?: 'user' | 'global' | 'admin';
    /** Admin category for filtering and uploading when destination is 'admin' */
    adminCategory?: string;
    /** Optional flag to hide the raw URL text input */
    hideUrlInput?: boolean;
    /** Generation context hint for AI image generator. 'background' optimizes for website section backgrounds. */
    generationContext?: 'background' | 'general';
    /** Optional container element to portal the modal into, making it position relative to that container instead of the viewport */
    portalContainer?: HTMLElement | null;
}

const ImagePicker: React.FC<ImagePickerProps> = ({ label, value, onChange, storeId, defaultOpen = false, onClose, onRemove, destination: propDestination, adminCategory, hideUrlInput = true, generationContext = 'general', portalContainer }) => {
    const { t } = useTranslation();
    const { activeProjectId, activeProject } = useProject();

    // Determine the actual destination. Templates and legacy "global" calls use the admin asset library.
    const requestedDestination = propDestination || (activeProject?.status === 'Template' ? 'admin' : 'user');
    const destination: 'user' | 'admin' = requestedDestination === 'global' ? 'admin' : requestedDestination;

    const filesCtx = useSafeFiles();
    const files = filesCtx?.files || [];
    const uploadFile = filesCtx?.uploadFile || (async () => { throw new Error("Files context missing"); });
    const adminAssets = filesCtx?.adminAssets || [];
    const fetchAdminAssets = filesCtx?.fetchAdminAssets || (async () => {});
    const uploadAdminAsset = filesCtx?.uploadAdminAsset || (async () => { throw new Error("Files context missing"); });
    const isFilesLoading = filesCtx?.isFilesLoading || false;
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

    // Fetch the admin asset library only when this picker is in admin context.
    useEffect(() => {
        if (destination === 'admin' && isLibraryOpen) {
            fetchAdminAssets();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [destination, isLibraryOpen]);

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

    // Selected Category for Admin Uploads
    const defaultCategory = adminCategory || (activeProject?.status === 'Template' ? 'template' : 'other');
    const [selectedAdminCategory, setSelectedAdminCategory] = useState<string>(defaultCategory);

    useEffect(() => {
        if (adminCategory) setSelectedAdminCategory(adminCategory);
    }, [adminCategory]);

    const handleFileUpload = async (file: File) => {
        try {
            if (destination === 'admin') {
                await uploadAdminAsset(file, (selectedAdminCategory as any) || 'other', {
                    description: 'Uploaded via ImagePicker'
                });
                success(t('dashboard.imagePicker.uploadSuccess', { name: file.name }));
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
        // Choose source array based on destination.
        let sourceFiles = files;
        if (destination === 'admin') {
            sourceFiles = adminAssets;
            if (adminCategory) {
                sourceFiles = sourceFiles.filter(f => f.category === adminCategory);
            }
        }

        let result = sourceFiles.filter(f => f.type?.startsWith('image/'));

        // Project library must only show images owned by the active project.
        if (destination === 'user' && activeProjectId) {
            result = result.filter(f => f.projectId === activeProjectId);
        }

        if (searchQuery) {
            result = searchFiles(result, searchQuery);
        }

        return result;
    }, [files, adminAssets, searchQuery, activeProjectId, destination, adminCategory]);

    return (
        <>
            {/* Inline UI - Only show when NOT using defaultOpen */}
            {!defaultOpen && (
                <div className="mb-3">
                    {label && (
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">{label}</label>
                        </div>
                    )}

                    {/* Prominent Image Preview with overlaid controls */}
                    <div className="relative rounded-lg overflow-hidden border border-q-border group">
                        {value ? (
                            <>
                                <div className="aspect-video cursor-pointer" onClick={() => {
                                    const file = files.find(f => f.downloadURL === value);
                                    if (file) setPreviewFile(file);
                                    else setPreviewFile({
                                        id: 'temp', name: label || 'Preview', downloadURL: value, storagePath: '', size: 0, type: 'image/jpeg',
                                        createdAt: new Date().toISOString(), projectId: activeProjectId || ''
                                    });
                                }}>
                                    <img src={value} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                                {/* Bottom gradient for contrast */}
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                                {/* Overlaid action buttons at bottom-right */}
                                <div className="absolute bottom-2.5 right-2.5 flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => { setIsLibraryOpen(true); setActiveTab('library'); }}
                                        className="p-2 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 transition-all duration-200"
                                        title={t('dashboard.imagePicker.openLibrary')}
                                    >
                                        <Grid size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setIsLibraryOpen(true); setActiveTab('generate'); }}
                                        className="p-2 rounded-lg bg-q-accent/80 backdrop-blur-md border border-q-accent/40 text-white hover:bg-q-accent transition-all duration-200"
                                        title={t('dashboard.imagePicker.generateWithAI')}
                                    >
                                        <Zap size={14} />
                                    </button>
                                    {onRemove && (
                                        <button
                                            type="button"
                                            onClick={onRemove}
                                            className="p-2 rounded-lg bg-red-500/60 backdrop-blur-md border border-red-500/30 text-white hover:bg-red-500/80 transition-all duration-200"
                                            title={t('common.remove')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="aspect-video flex flex-col items-center justify-center bg-q-bg text-q-text-secondary gap-2">
                                <Image size={32} className="opacity-30" />
                                <span className="text-[10px] uppercase tracking-wider opacity-50">Sin imagen</span>
                            </div>
                        )}
                    </div>

                    {/* URL Input — only if not hidden */}
                    {!hideUrlInput && (
                        <div className="mt-2">
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-q-surface border border-q-border rounded-lg px-3 py-2 text-xs text-q-text focus:outline-none focus:ring-1 focus:ring-q-accent placeholder:text-q-text-secondary/50 truncate font-mono"
                            />
                        </div>
                    )}

                    {/* Action buttons when no image */}
                    {!value && (
                        <div className="flex gap-2 mt-3">
                            <button
                                type="button"
                                onClick={() => { setIsLibraryOpen(true); setActiveTab('library'); }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-q-bg border border-q-border text-q-text-secondary hover:text-q-text hover:border-q-accent/30 transition-all text-xs font-medium"
                            >
                                <Grid size={12} /> Librería
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsLibraryOpen(true); setActiveTab('generate'); }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-q-accent/10 border border-q-accent/20 text-q-accent hover:bg-q-accent/20 transition-all text-xs font-medium"
                            >
                                <Zap size={12} /> Generar IA
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Main Modal (Combined Library & Generator) - Always rendered when isLibraryOpen is true */}
            {isLibraryOpen && (() => {
                const modalContent = (
                    <div
                        className="fixed inset-0 bg-black/60 z-[100010] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in-up"
                        onClick={handleClose}
                    >
                        <div
                            className="bg-q-bg w-full max-w-4xl h-[100dvh] sm:h-[85vh] flex flex-col rounded-none sm:rounded-xl overflow-hidden shadow-2xl border-0 sm:border border-q-border"
                            onClick={(e) => e.stopPropagation()}
                        >
                        {/* Header */}
                        <div className="p-4 border-b border-q-border flex justify-between items-center bg-q-surface">
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('library')}
                                    className={`pb-1 border-b-2 text-sm font-bold transition-colors ${activeTab === 'library' ? 'border-q-accent text-q-text' : 'border-transparent text-q-text-secondary hover:text-q-text'}`}
                                >
                                    {t('dashboard.imagePicker.assetLibrary')}
                                </button>
                                {storeId && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('products')}
                                        className={`pb-1 border-b-2 text-sm font-bold transition-colors flex items-center gap-1 ${activeTab === 'products' ? 'border-q-accent text-q-accent' : 'border-transparent text-q-text-secondary hover:text-q-text'}`}
                                    >
                                        <ShoppingBag size={14} /> {t('dashboard.imagePicker.productImages', 'Productos')}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('generate')}
                                    className={`pb-1 border-b-2 text-sm font-bold transition-colors flex items-center gap-1 ${activeTab === 'generate' ? 'border-q-accent text-q-accent' : 'border-transparent text-q-text-secondary hover:text-q-text'}`}
                                >
                                    <Zap size={14} /> Quimera.ai
                                </button>
                            </div>
                            <button type="button" onClick={handleClose} className="w-9 h-9 rounded-lg hover:bg-q-surface-overlay flex items-center justify-center text-q-text-secondary hover:text-q-text transition-colors"><X size={20} /></button>
                        </div>

                        {/* Content */}
                        <div className={`flex-grow overflow-hidden bg-q-bg ${activeTab === 'generate' ? '' : 'p-6'}`}>

                            {/* LIBRARY TAB */}
                            {activeTab === 'library' && (
                                <div className="h-full flex flex-col">
                                    {/* Library Controls - Compact */}
                                    <div className="flex items-center gap-3 mb-4">
                                        {/* Project indicator */}
                                        <div className="flex items-center gap-1.5 text-q-text-secondary">
                                            <FolderOpen size={14} className="text-q-accent" />
                                            <span className="text-xs font-medium text-q-text">
                                                {destination === 'admin' ? 'Librería de administración' : activeProject?.name || t('dashboard.imagePicker.assetLibrary')}
                                            </span>
                                            <span className="text-[10px] px-1.5 py-0.5 bg-q-surface rounded">
                                                {imageFiles.length} {imageFiles.length === 1 ? t('dashboard.imagePicker.image') : t('dashboard.imagePicker.images')}
                                            </span>
                                            {destination === 'admin' && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded border border-blue-500/20 ml-2">
                                                    ADMIN
                                                </span>
                                            )}
                                        </div>

                                        {/* Spacer */}
                                        <div className="flex-1" />

                                        {/* Search */}
                                        <div className="flex items-center gap-1.5 bg-q-surface-overlay/40 rounded-lg px-2.5 py-1.5 w-44">
                                            <Search size={12} className="text-q-text-secondary flex-shrink-0" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder={t('dashboard.imagePicker.searchImages')}
                                                className="flex-1 bg-transparent outline-none text-xs min-w-0"
                                            />
                                            {searchQuery && (
                                                <button type="button" onClick={() => setSearchQuery('')} className="text-q-text-secondary hover:text-q-text flex-shrink-0">
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Upload Button & Admin Category Selector */}
                                        {activeTab === 'library' && (
                                            <div className="flex items-center gap-2">
                                                {destination === 'admin' && (
                                                    <select
                                                        value={selectedAdminCategory}
                                                        onChange={(e) => setSelectedAdminCategory(e.target.value)}
                                                        className="h-8 px-2 py-1 bg-q-surface border border-q-border rounded text-xs font-medium focus:outline-none focus:border-q-accent"
                                                    >
                                                        <option value="article">Artículos</option>
                                                        <option value="hero">Hero</option>
                                                        <option value="component">Componentes</option>
                                                        <option value="template">Plantillas</option>
                                                        <option value="background">Fondos</option>
                                                        <option value="logo">Logos</option>
                                                        <option value="testimonial">Testimonios</option>
                                                        <option value="team">Equipo</option>
                                                        <option value="product">Productos</option>
                                                        <option value="ai_generated">Generadas con IA</option>
                                                        <option value="icon">Íconos</option>
                                                        <option value="other">Otros</option>
                                                    </select>
                                                )}
                                                <DragDropZone
                                                    onFileSelect={handleFileUpload}
                                                    accept="image/*"
                                                    maxSizeMB={10}
                                                    variant="compact"
                                                >
                                                    <button type="button" className="flex items-center gap-1.5 bg-q-accent text-q-bg px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-q-accent transition-colors whitespace-nowrap">
                                                        <Upload size={14} /> {t('dashboard.imagePicker.upload')}
                                                    </button>
                                                </DragDropZone>
                                            </div>
                                        )}
                                    </div>

                                    {/* Images Grid */}
                                    <div className="flex-grow overflow-y-auto custom-scrollbar">
                                        {imageFiles.length > 0 ? (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                                {imageFiles.map(file => (
                                                    <div
                                                        key={file.id}
                                                        onClick={() => { onChange(file.downloadURL); handleClose(); success(t('dashboard.imagePicker.imageSelected')); }}
                                                        className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer group relative transition-all ${value === file.downloadURL ? 'border-q-accent ring-2 ring-q-accent/50' : 'border-transparent hover:border-q-text-secondary'}`}
                                                    >
                                                        <img src={file.downloadURL} alt={file.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                        {value === file.downloadURL ? (
                                                            <div className="absolute inset-0 bg-q-accent/20 flex items-center justify-center">
                                                                <div className="bg-q-accent text-q-bg rounded-full p-2">
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
                                            <div className="h-full flex flex-col items-center justify-center text-q-text-secondary">
                                                <Search size={48} className="mb-4 opacity-50" />
                                                <p className="font-medium mb-2">{t('dashboard.imagePicker.noImagesFound')}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setSearchQuery('')}
                                                    className="text-q-accent hover:underline text-sm"
                                                >
                                                    {t('dashboard.imagePicker.clearFilters')}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-q-text-secondary border-2 border-dashed border-q-border rounded-xl">
                                                <Image size={48} className="mb-4 opacity-50" />
                                                <p className="mb-2">{t('dashboard.imagePicker.noImagesInLibrary')}</p>
                                                {activeTab === 'library' && (
                                                    <div className="flex flex-col items-center gap-3 mt-2">
                                                        {destination === 'admin' && (
                                                            <select
                                                                value={selectedAdminCategory}
                                                                onChange={(e) => setSelectedAdminCategory(e.target.value)}
                                                                className="h-8 px-2 py-1 bg-q-surface border border-q-border rounded text-xs font-medium focus:outline-none focus:border-q-accent"
                                                            >
                                                                <option value="article">Artículos</option>
                                                                <option value="hero">Hero</option>
                                                                <option value="component">Componentes</option>
                                                                <option value="template">Plantillas</option>
                                                                <option value="background">Fondos</option>
                                                                <option value="logo">Logos</option>
                                                                <option value="testimonial">Testimonios</option>
                                                                <option value="team">Equipo</option>
                                                                <option value="product">Productos</option>
                                                                <option value="ai_generated">Generadas con IA</option>
                                                                <option value="icon">Íconos</option>
                                                                <option value="other">Otros</option>
                                                            </select>
                                                        )}
                                                        <DragDropZone
                                                            onFileSelect={handleFileUpload}
                                                            accept="image/*"
                                                            maxSizeMB={10}
                                                            variant="compact"
                                                        >
                                                            <button type="button" className="text-q-accent hover:underline">{t('dashboard.imagePicker.uploadOneNow')}</button>
                                                        </DragDropZone>
                                                    </div>
                                                )}
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
                                        <p className="text-sm text-q-text-secondary">
                                            {t('dashboard.imagePicker.selectFromProducts', 'Selecciona una imagen de tus productos')}
                                        </p>
                                    </div>

                                    {isLoadingProducts ? (
                                        <div className="flex-grow flex items-center justify-center">
                                            <div className="animate-spin w-8 h-8 border-2 border-q-accent border-t-transparent rounded-full" />
                                        </div>
                                    ) : productImages.length > 0 ? (
                                        <div className="flex-grow overflow-y-auto custom-scrollbar">
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                                {productImages.map(product => (
                                                    <div
                                                        key={product.id}
                                                        onClick={() => { onChange(product.imageUrl); handleClose(); success(t('dashboard.imagePicker.imageSelected')); }}
                                                        className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer group relative transition-all ${value === product.imageUrl ? 'border-q-accent ring-2 ring-q-accent/50' : 'border-transparent hover:border-q-text-secondary'}`}
                                                    >
                                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                        {value === product.imageUrl ? (
                                                            <div className="absolute inset-0 bg-q-accent/20 flex items-center justify-center">
                                                                <div className="bg-q-accent text-q-bg rounded-full p-2">
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
                                        <div className="flex-grow flex flex-col items-center justify-center text-q-text-secondary">
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
                                    adminCategory={adminCategory}
                                    className="h-full"
                                    generationContext={generationContext}
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
                );
                return createPortal(modalContent, document.getElementById('portal-root') || document.body);
            })()}

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
