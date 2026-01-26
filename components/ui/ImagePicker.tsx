import React, { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFiles } from '../../contexts/files';
import { useAI } from '../../contexts/ai';
import { useProject } from '../../contexts/project';
import { useToast } from '../../contexts/ToastContext';
import { usePublicProducts } from '../../hooks/usePublicProducts';
import { Image, Upload, Zap, Grid, X, Check, Loader2, Wand2, Search, Brain, Users, Thermometer, Sparkles, Eye, Flame, Layers, Rocket, FolderOpen, ShoppingBag, Maximize2, Plus } from 'lucide-react';
import DragDropZone from './DragDropZone';
import { searchFiles } from '../../utils/fileHelpers';
import ImageDetailModal from './ImageDetailModal';
import { FileRecord } from '../../types';

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
}

const ASPECT_RATIOS = [
    { label: 'Square (1:1)', value: '1:1' },
    { label: 'Landscape (16:9)', value: '16:9' },
    { label: 'Portrait (9:16)', value: '9:16' },
    { label: 'Classic (4:3)', value: '4:3' },
    { label: 'Tall (3:4)', value: '3:4' },
    { label: 'Cinematic (21:9)', value: '21:9' },
];

const STYLES = [
    'None', 'Photorealistic', 'Cinematic', 'Anime', 'Digital Art',
    'Oil Painting', '3D Render', 'Minimalist', 'Cyberpunk', 'Watercolor'
];

// Quimera AI Model Options
const MODELS = [
    { label: 'Vision Pro', value: 'gemini-3-pro-image-preview', description: 'Best quality, text in images', icon: 'vision' },
    { label: 'Ultra', value: 'imagen-4.0-ultra-generate-001', description: 'Highest quality', icon: 'ultra' },
    { label: 'Std', value: 'imagen-4.0-generate-001', description: 'Balanced', icon: 'standard' },
    { label: 'Fast', value: 'imagen-4.0-fast-generate-001', description: 'Fastest', icon: 'fast' },
];

const THINKING_LEVELS = [
    { label: 'None', value: 'none' },
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
];

const ImagePicker: React.FC<ImagePickerProps> = ({ label, value, onChange, storeId, defaultOpen = false, onClose }) => {
    const { t } = useTranslation();
    const { files, uploadFile } = useFiles();
    const { generateImage, enhancePrompt } = useAI();
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

    // Generator State
    const [prompt, setPrompt] = useState('');
    const [isSavingGenerated, setIsSavingGenerated] = useState(false);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [style, setStyle] = useState('None');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    // Quimera AI Controls
    const [selectedModel, setSelectedModel] = useState('gemini-3-pro-image-preview');
    const [thinkingLevel, setThinkingLevel] = useState('high');
    const [personGeneration, setPersonGeneration] = useState('allow_adult');
    const [temperature, setTemperature] = useState(1.0);
    const [negativePrompt, setNegativePrompt] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Reference Images State
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [isDraggingRef, setIsDraggingRef] = useState(false);
    const referenceFileInputRef = useRef<HTMLInputElement>(null);

    // Detailed preview state
    const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);

    const handleFileUpload = async (file: File) => {
        try {
            // Upload file to active project (project is automatically set by FilesContext)
            await uploadFile(file);
            success(t('dashboard.imagePicker.uploadSuccess', { name: file.name }));
            setIsLibraryOpen(true);
            setActiveTab('library');
        } catch (err) {
            showError(t('dashboard.imagePicker.uploadError'));
        }
    };

    // Helper function to convert base64 data URL to File
    const base64ToFile = (base64: string, filename: string): File => {
        const arr = base64.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    // Helper function to convert File to base64 data URL
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Reference images handlers
    const processReferenceFiles = async (files: FileList | File[]) => {
        const remainingSlots = 14 - referenceImages.length;
        if (remainingSlots <= 0) {
            showError(t('dashboard.imagePicker.maxReferences', 'Maximum 14 reference images'));
            return;
        }

        const filesToProcess = Array.from(files).slice(0, remainingSlots);
        const successfulBase64s: string[] = [];

        for (const file of filesToProcess) {
            if (file.type.startsWith('image/')) {
                try {
                    const base64DataUrl = await fileToBase64(file);
                    if (base64DataUrl) {
                        successfulBase64s.push(base64DataUrl);
                    }
                } catch (error) {
                    console.error(`Error converting ${file.name} to base64:`, error);
                }
            }
        }

        if (successfulBase64s.length > 0) {
            setReferenceImages(prev => [...prev, ...successfulBase64s]);
        }
    };

    const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            processReferenceFiles(e.target.files);
        }
    };

    const handleRefDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingRef(true);
    };

    const handleRefDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingRef(false);
    };

    const handleRefDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingRef(false);
        if (e.dataTransfer.files) {
            processReferenceFiles(e.dataTransfer.files);
        }
    };

    const handleRemoveReferenceImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
        if (referenceFileInputRef.current) {
            referenceFileInputRef.current.value = '';
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            const options = {
                aspectRatio,
                style,
                // Quimera AI specific options
                model: selectedModel,
                thinkingLevel: thinkingLevel !== 'none' ? thinkingLevel : undefined,
                personGeneration,
                temperature,
                negativePrompt: negativePrompt.trim() || undefined,
                referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
            };
            console.log('✨ [ImagePicker] Quimera options:', options);
            const imageDataUrl = await generateImage(prompt, options);
            setGeneratedImage(imageDataUrl);

            // Save to library if we have an active project
            if (activeProjectId) {
                try {
                    const timestamp = Date.now();
                    const filename = `quimera-${timestamp}.png`;
                    const file = base64ToFile(imageDataUrl, filename);
                    await uploadFile(file);
                    console.log('✅ [ImagePicker] Image saved to project library');
                    success(t('dashboard.imagePicker.generateSuccess'));
                } catch (saveError) {
                    console.error('Failed to save to library:', saveError);
                    success(t('dashboard.imagePicker.generateSuccess'));
                }
            } else {
                success(t('dashboard.imagePicker.generateSuccess'));
            }
        } catch (error) {
            console.error(error);
            showError(t('dashboard.imagePicker.generateError'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEnhancePrompt = async () => {
        if (!prompt.trim()) return;
        setIsEnhancing(true);
        try {
            const enhanced = await enhancePrompt(prompt);
            setPrompt(enhanced);
            success(t('dashboard.imagePicker.enhanceSuccess'));
        } catch (error) {
            console.error(error);
            showError(t('dashboard.imagePicker.enhanceError'));
        } finally {
            setIsEnhancing(false);
        }
    };

    // Filter and search image files - ONLY from current project
    const imageFiles = useMemo(() => {
        let result = files.filter(f => f.type.startsWith('image/'));

        // Only show images from the current project
        if (activeProjectId) {
            result = result.filter(f => f.projectId === activeProjectId);
        }

        if (searchQuery) {
            result = searchFiles(result, searchQuery);
        }

        return result;
    }, [files, searchQuery, activeProjectId]);

    return (
        <>
            {/* Inline UI - Only show when NOT using defaultOpen */}
            {!defaultOpen && (
                <div className="mb-3">
                    <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
                    <div className="flex gap-2">
                        {/* Hidden Input for value storage */}
                        <input
                            type="hidden"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                        />

                        {/* Preview Only */}
                        <div
                            onClick={() => {
                                if (value) {
                                    const file = files.find(f => f.downloadURL === value);
                                    if (file) {
                                        setPreviewFile(file);
                                    } else {
                                        // Fallback: create a temporary FileRecord for preview if not in library
                                        setPreviewFile({
                                            id: 'temp',
                                            name: label || 'Preview',
                                            downloadURL: value,
                                            storagePath: '',
                                            size: 0,
                                            type: 'image/jpeg',
                                            createdAt: new Date().toISOString()
                                        });
                                    }
                                }
                            }}
                            className={`relative flex-grow h-10 bg-editor-panel-bg border border-editor-border rounded-md overflow-hidden flex items-center justify-center ${value ? 'cursor-pointer hover:border-editor-accent group' : ''}`}
                        >
                            {value ? (
                                <>
                                    <img src={value} alt="Preview" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                                        <Maximize2 size={14} className="text-white opacity-0 group-hover:opacity-100" />
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-2 text-editor-text-secondary text-sm">
                                    <Image size={16} className="text-editor-text-secondary" />
                                    <span>{t('dashboard.imagePicker.noImageSelected')}</span>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <button
                            onClick={() => { setIsLibraryOpen(true); setActiveTab('library'); }}
                            className="p-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-secondary hover:text-editor-text-primary hover:border-editor-accent transition-all"
                            title={t('dashboard.imagePicker.openLibrary')}
                        >
                            <Grid size={18} />
                        </button>
                        <button
                            onClick={() => { setIsLibraryOpen(true); setActiveTab('generate'); }}
                            className="p-2 bg-editor-bg border border-editor-border rounded-md text-editor-accent hover:bg-editor-accent hover:text-editor-bg transition-all"
                            title={t('dashboard.imagePicker.generateWithAI')}
                        >
                            <Zap size={18} />
                        </button>
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
                                    <div className="mb-4">
                                        <p className="text-sm text-editor-text-secondary">
                                            {t('dashboard.imagePicker.selectFromProducts', 'Selecciona una imagen de tus productos')}
                                        </p>
                                    </div>

                                    {isLoadingProducts ? (
                                        <div className="flex-grow flex items-center justify-center">
                                            <Loader2 className="animate-spin text-editor-accent" size={32} />
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

                            {/* GENERATE TAB */}
                            {activeTab === 'generate' && (
                                <div className="h-full flex flex-col">
                                    <div className="flex gap-6 h-full">
                                        {/* Controls Side */}
                                        <div className="w-1/3 flex flex-col h-full">
                                            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-4">
                                                {/* Model Selector */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Sparkles size={12} className="text-editor-accent" />
                                                        <label className="block text-xs font-bold text-editor-text-secondary uppercase">{t('dashboard.imagePicker.quimeraModel')}</label>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {MODELS.map(model => (
                                                            <button
                                                                key={model.value}
                                                                onClick={() => setSelectedModel(model.value)}
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${selectedModel === model.value
                                                                    ? 'bg-editor-accent/10 border-editor-accent text-editor-accent shadow-[0_0_8px_rgba(249,115,22,0.1)]'
                                                                    : 'bg-editor-panel-bg border-editor-border text-editor-text-secondary hover:border-editor-accent/40'
                                                                    }`}
                                                                title={model.description}
                                                            >
                                                                <div className="flex-shrink-0">
                                                                    {model.icon === 'vision' && <Eye size={14} />}
                                                                    {model.icon === 'ultra' && <Flame size={14} />}
                                                                    {model.icon === 'standard' && <Layers size={14} />}
                                                                    {model.icon === 'fast' && <Rocket size={14} />}
                                                                </div>
                                                                <span className="text-[10px] font-bold uppercase tracking-tight whitespace-nowrap">
                                                                    {model.label.split(' ')[1] || model.label}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Prompt */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="block text-sm font-bold text-editor-text-primary">{t('dashboard.imagePicker.prompt')}</label>
                                                        <button
                                                            onClick={handleEnhancePrompt}
                                                            disabled={isEnhancing || !prompt}
                                                            className="flex items-center text-xs text-editor-accent hover:text-editor-text-primary transition-colors disabled:opacity-50"
                                                            title={t('dashboard.imagePicker.enhanceTooltip')}
                                                        >
                                                            {isEnhancing ? <Loader2 size={12} className="animate-spin mr-1" /> : <Wand2 size={12} className="mr-1" />}
                                                            {t('dashboard.imagePicker.enhance')}
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        value={prompt}
                                                        onChange={(e) => setPrompt(e.target.value)}
                                                        placeholder={t('dashboard.imagePicker.promptPlaceholder')}
                                                        className="w-full bg-editor-panel-bg border-2 border-editor-border rounded-lg p-3 text-sm text-editor-text-primary focus:border-editor-accent outline-none resize-none h-40 transition-colors"
                                                    />
                                                </div>

                                                {/* Negative Prompt */}
                                                <div>
                                                    <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-1">{t('dashboard.imagePicker.negativePrompt')}</label>
                                                    <input
                                                        type="text"
                                                        value={negativePrompt}
                                                        onChange={(e) => setNegativePrompt(e.target.value)}
                                                        placeholder={t('dashboard.imagePicker.negativePromptPlaceholder')}
                                                        className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-1.5 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                                    />
                                                </div>

                                                {/* Reference Images */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="block text-xs font-bold text-editor-text-secondary uppercase">
                                                            {t('dashboard.imagePicker.referenceImages', 'Reference Images')}
                                                        </label>
                                                        <span className="text-xs text-editor-text-secondary bg-editor-panel-bg px-2 py-0.5 rounded-full">
                                                            {referenceImages.length}/14
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        ref={referenceFileInputRef}
                                                        accept="image/*"
                                                        multiple
                                                        onChange={handleReferenceImageUpload}
                                                        className="hidden"
                                                    />
                                                    <div
                                                        className={`
                                                            border-2 border-dashed rounded-lg p-2 transition-all cursor-pointer
                                                            ${isDraggingRef
                                                                ? 'border-editor-accent bg-editor-accent/10'
                                                                : 'border-editor-border hover:border-editor-text-secondary hover:bg-editor-panel-bg/50'
                                                            }
                                                        `}
                                                        onDragOver={handleRefDragOver}
                                                        onDragLeave={handleRefDragLeave}
                                                        onDrop={handleRefDrop}
                                                        onClick={() => referenceFileInputRef.current?.click()}
                                                    >
                                                        {referenceImages.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                                {referenceImages.map((img, idx) => (
                                                                    <div key={idx} className="relative w-10 h-10 rounded-md overflow-hidden group border border-editor-border">
                                                                        <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                                                                        <button
                                                                            onClick={() => handleRemoveReferenceImage(idx)}
                                                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                                        >
                                                                            <X size={12} className="text-white" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                {referenceImages.length < 14 && (
                                                                    <button
                                                                        onClick={() => referenceFileInputRef.current?.click()}
                                                                        className="w-10 h-10 flex items-center justify-center border border-dashed border-editor-border rounded-md hover:border-editor-accent hover:bg-editor-panel-bg text-editor-text-secondary hover:text-editor-accent transition-all"
                                                                    >
                                                                        <Plus size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center py-2 text-editor-text-secondary">
                                                                <Upload size={16} className="mb-1" />
                                                                <span className="text-[10px] font-medium">{t('dashboard.imagePicker.clickOrDragRef', 'Click or drag images')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Aspect Ratio */}
                                                <div>
                                                    <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2">{t('dashboard.imagePicker.aspectRatio')}</label>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        {ASPECT_RATIOS.map(ratio => (
                                                            <button
                                                                key={ratio.value}
                                                                onClick={() => setAspectRatio(ratio.value)}
                                                                className={`text-xs py-1.5 rounded-md border transition-all ${aspectRatio === ratio.value ? 'bg-editor-accent text-editor-bg border-editor-accent font-bold' : 'bg-editor-bg text-editor-text-secondary border-editor-border hover:border-editor-text-secondary'}`}
                                                            >
                                                                {ratio.value}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Style */}
                                                <div>
                                                    <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2">{t('dashboard.imagePicker.style')}</label>
                                                    <select
                                                        value={style}
                                                        onChange={(e) => setStyle(e.target.value)}
                                                        className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-1.5 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                                    >
                                                        {STYLES.map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Advanced Controls Toggle */}
                                                <div className="pt-2">
                                                    <button
                                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                                        className="text-xs text-editor-text-secondary hover:text-editor-accent transition-colors flex items-center gap-2 w-full"
                                                    >
                                                        <Eye size={12} />
                                                        <span className="font-medium">{t('dashboard.imagePicker.visionProControls')}</span>
                                                        <span className="ml-auto text-editor-accent">{showAdvanced ? '−' : '+'}</span>
                                                    </button>
                                                </div>

                                                {/* Advanced Controls - Clean Design */}
                                                {showAdvanced && selectedModel === 'gemini-3-pro-image-preview' && (
                                                    <div className="space-y-3 pt-2">
                                                        {/* Thinking Level */}
                                                        <div>
                                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                                <Brain size={11} className="text-editor-text-secondary" />
                                                                <label className="text-xs text-editor-text-secondary">{t('dashboard.imagePicker.thinking')}</label>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                {THINKING_LEVELS.map(level => (
                                                                    <button
                                                                        key={level.value}
                                                                        onClick={() => setThinkingLevel(level.value)}
                                                                        className={`text-xs py-1 px-2 rounded-full transition-all ${thinkingLevel === level.value
                                                                            ? 'bg-editor-accent text-editor-bg font-medium'
                                                                            : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg'
                                                                            }`}
                                                                    >
                                                                        {level.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Person Generation */}
                                                        <div>
                                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                                <Users size={11} className="text-editor-text-secondary" />
                                                                <label className="text-xs text-editor-text-secondary">{t('dashboard.imagePicker.people')}</label>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => setPersonGeneration('allow_adult')}
                                                                    className={`text-xs py-1 px-2 rounded-full transition-all ${personGeneration === 'allow_adult'
                                                                        ? 'bg-editor-accent text-editor-bg font-medium'
                                                                        : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg'
                                                                        }`}
                                                                >
                                                                    {t('dashboard.imagePicker.allow')}
                                                                </button>
                                                                <button
                                                                    onClick={() => setPersonGeneration('dont_allow')}
                                                                    className={`text-xs py-1 px-2 rounded-full transition-all ${personGeneration === 'dont_allow'
                                                                        ? 'bg-editor-accent text-editor-bg font-medium'
                                                                        : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg'
                                                                        }`}
                                                                >
                                                                    {t('dashboard.imagePicker.dontAllow')}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Temperature */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Thermometer size={11} className="text-editor-text-secondary" />
                                                                    <label className="text-xs text-editor-text-secondary">{t('dashboard.imagePicker.creativity')}</label>
                                                                </div>
                                                                <span className="text-xs text-editor-accent font-mono">{temperature.toFixed(1)}</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="2"
                                                                step="0.1"
                                                                value={temperature}
                                                                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                                                className="w-full h-1 bg-editor-border rounded-full appearance-none cursor-pointer accent-editor-accent"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-3 flex items-center h-[57px] flex-shrink-0">
                                                <button
                                                    onClick={handleGenerate}
                                                    disabled={isGenerating || !prompt}
                                                    className="w-full py-2.5 bg-gradient-to-r from-editor-accent to-orange-500 text-white font-bold rounded-lg shadow-lg hover:shadow-editor-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                                                >
                                                    {isGenerating ? <Loader2 className="animate-spin mr-2" size={18} /> : <Zap className="mr-2" size={18} />}
                                                    {isGenerating ? t('dashboard.imagePicker.dreaming') : t('dashboard.imagePicker.generateImage')}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Preview Side */}
                                        <div className="w-2/3 flex flex-col h-full">
                                            <div className="flex-grow flex items-center justify-center bg-black/20 rounded-xl border border-editor-border overflow-hidden relative">
                                                {isGenerating ? (
                                                    <div className="text-center">
                                                        <div className="w-16 h-16 border-4 border-editor-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                                        <p className="text-editor-accent font-medium animate-pulse">{t('dashboard.imagePicker.creatingMasterpiece')}</p>
                                                        <p className="text-xs text-editor-text-secondary mt-2">{t('dashboard.imagePicker.poweredByQuimera')}</p>
                                                    </div>
                                                ) : generatedImage ? (
                                                    <div className="relative w-full h-full group flex items-center justify-center bg-black">
                                                        <img src={generatedImage} alt="Generated" className="max-w-full max-h-full object-contain" />
                                                    </div>
                                                ) : (
                                                    <div className="text-center text-editor-text-secondary opacity-50">
                                                        <Zap size={48} className="mx-auto mb-4" />
                                                        <p>{t('dashboard.imagePicker.enterPromptToStart')}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {generatedImage && (
                                                <div className="pt-3 flex justify-end">
                                                    <button
                                                        onClick={async () => {
                                                            // Upload to Storage first to get a URL (base64 exceeds Firebase field limit)
                                                            setIsSavingGenerated(true);
                                                            try {
                                                                const timestamp = Date.now();
                                                                const filename = `quimera-featured-${timestamp}.png`;
                                                                const file = base64ToFile(generatedImage, filename);
                                                                const downloadURL = await uploadFile(file);

                                                                if (downloadURL) {
                                                                    onChange(downloadURL);
                                                                    console.log('✅ [ImagePicker] Image saved to project library');
                                                                } else {
                                                                    // Fallback: use base64 (might fail for large images)
                                                                    console.warn('[ImagePicker] Upload returned no URL, using base64');
                                                                    onChange(generatedImage);
                                                                }
                                                                handleClose();
                                                                success(t('dashboard.imagePicker.generatedImageApplied'));
                                                            } catch (err) {
                                                                console.error('[ImagePicker] Failed to save generated image:', err);
                                                                showError(t('dashboard.imagePicker.uploadError'));
                                                            } finally {
                                                                setIsSavingGenerated(false);
                                                            }
                                                        }}
                                                        disabled={isSavingGenerated}
                                                        className="flex items-center gap-2 bg-editor-accent text-editor-bg px-6 py-2 rounded-lg font-bold shadow-lg transform transition-all hover:scale-105 hover:bg-editor-panel-bg hover:text-editor-accent disabled:opacity-50"
                                                    >
                                                        {isSavingGenerated ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} {t('dashboard.imagePicker.useThisImage')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
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