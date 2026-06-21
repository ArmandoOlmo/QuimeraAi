
import React, { useRef, useState } from 'react';
import { useFiles } from '../../contexts/files';
import { useAI } from '../../contexts/ai';
import { useProject } from '../../contexts/project';
import { useToast } from '../../contexts/ToastContext';
import { useAssetLibrary } from '../../hooks/useAssetLibrary';
import { FileRecord } from '../../types';
import { FileText, Upload, Trash2, Download, Sparkles, ChevronDown, Zap, X, Calendar, HardDrive, Search, Filter, ArrowUpDown, CheckSquare, Square, Wand2, Loader2, Plus, ImageIcon, AlertTriangle, Film } from 'lucide-react';
import DragDropZone from '../ui/DragDropZone';
import ImageDetailModal from '../ui/ImageDetailModal';
import ConfirmationModal from '../ui/ConfirmationModal';
import MediaGeneratorPanel from '../media-generator/MediaGeneratorPanel';
import { formatBytes, formatFileDate } from '../../utils/fileHelpers';
import { useTranslation } from 'react-i18next';
import AppSelect from '../ui/AppSelect';

// Constants for controls
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

const RESOLUTIONS = [
    { label: 'Standard', value: '1K' },
    { label: 'High Quality (2K)', value: '2K' },
    { label: 'Ultra HD (4K)', value: '4K' },
];

const LIGHTING_OPTIONS = [
    'None', 'Natural Lighting', 'Soft Lighting', 'Dramatic Lighting',
    'Golden Hour', 'Blue Hour', 'Studio Lighting', 'Neon Lighting',
    'Rim Lighting', 'Volumetric Lighting'
];

const CAMERA_ANGLES = [
    'None', 'Eye Level', 'Low Angle', 'High Angle', 'Bird\'s Eye View',
    'Worm\'s Eye View', 'Dutch Angle', 'Over the Shoulder', 'Close-up',
    'Wide Shot', 'Aerial View'
];

const COLOR_GRADING = [
    'None', 'Warm Tones', 'Cool Tones', 'Vibrant', 'Desaturated',
    'High Contrast', 'Low Contrast', 'Cinematic', 'Vintage',
    'Black and White', 'Sepia'
];

const DEPTH_OF_FIELD = [
    'None', 'Shallow (Bokeh Background)', 'Deep (All in Focus)',
    'Medium (Balanced)', 'Tilt-Shift Effect'
];

// ImageDetailModal is now imported from ../ui/ImageDetailModal

const FileItem: React.FC<{
    file: FileRecord;
    variant: 'widget' | 'full' | 'gallery-only';
    onPreview: (file: FileRecord) => void;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    isSelectionMode?: boolean;
    onAddToReference?: (base64Data: string) => Promise<void>;
    onCreateVideo?: (imageUrl: string) => void;
    onDelete?: (file: FileRecord) => void;
}> = ({ file, variant, onPreview, isSelected, onToggleSelect, isSelectionMode, onAddToReference, onCreateVideo, onDelete }) => {
    const { t } = useTranslation();
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const [isAdding, setIsAdding] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Try to convert rendered img element to base64 using canvas
    // Note: This will fail for cross-origin images without proper CORS headers
    const getImageAsBase64 = (): string | null => {
        const imgElement = imgRef.current;
        if (!imgElement || !imgElement.complete || imgElement.naturalWidth === 0) return null;

        try {
            const canvas = document.createElement('canvas');
            canvas.width = imgElement.naturalWidth;
            canvas.height = imgElement.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            ctx.drawImage(imgElement, 0, 0);
            // This will throw SecurityError for tainted canvas (cross-origin without CORS)
            return canvas.toDataURL('image/jpeg', 0.85);
        } catch (error) {
            // Canvas is tainted due to cross-origin image
            console.warn('Canvas tainted - cross-origin image without CORS:', error);
            return null;
        }
    };

    const handleDragStart = (e: React.DragEvent) => {
        if (isImage) {
            const base64 = getImageAsBase64();
            if (base64) {
                e.dataTransfer.setData('application/x-library-image-base64', base64);
            }
            e.dataTransfer.setData('text/plain', file.downloadURL);
            e.dataTransfer.setData('application/x-library-image', file.downloadURL);
            e.dataTransfer.effectAllowed = 'copy';
        }
    };

    const handleAddToReference = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isImage && onAddToReference && !isAdding) {
            setIsAdding(true);
            try {
                const base64 = getImageAsBase64();
                if (base64) {
                    await onAddToReference(base64);
                } else {
                    // Fallback: try to fetch and convert (won't work with CORS issues)
                    await onAddToReference(file.downloadURL);
                }
            } finally {
                setIsAdding(false);
            }
        }
    };

    return (
        <div
            className={`rounded-xl transition-all duration-200 group relative overflow-hidden h-full ${isSelected ? 'ring-2 ring-primary' : ''} ${isImage ? 'cursor-grab active:cursor-grabbing' : ''}`}
            draggable={isImage}
            onDragStart={handleDragStart}
        >
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
                title={isSelectionMode ? t('dashboard.assets.preview.clickToSelect') : isImage ? t('dashboard.assets.preview.dragToUse') : t('dashboard.assets.preview.doubleClick')}
            >
                {isImage ? (
                    <img
                        ref={imgRef}
                        src={file.downloadURL}
                        alt={file.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        draggable={false}
                    />
                ) : isVideo ? (
                    <video
                        src={file.downloadURL}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
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
                            className="p-1.5 bg-q-surface dark:bg-gray-800 rounded-md shadow-lg"
                        >
                            {isSelected ? (
                                <CheckSquare size={20} className="text-primary" />
                            ) : (
                                <Square size={20} className="text-q-text-muted" />
                            )}
                        </button>
                    </div>
                )}

                {/* Add to Reference button - only for images when not in selection mode */}
                {isImage && !isSelectionMode && onAddToReference && (
                    <button
                        onClick={handleAddToReference}
                        disabled={isAdding}
                        className={`absolute top-2 right-2 z-10 p-1.5 bg-primary hover:bg-primary/80 text-primary-foreground rounded-md shadow-lg transition-all transform hover:scale-110 ${isAdding ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        title={t('dashboard.assets.preview.addAsReference')}
                    >
                        {isAdding ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Plus size={14} />
                        )}
                    </button>
                )}
                {isImage && !isSelectionMode && onCreateVideo && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCreateVideo(file.downloadURL);
                        }}
                        className="absolute top-10 right-2 z-10 p-1.5 bg-q-accent hover:bg-q-accent text-q-text-on-accent rounded-md shadow-lg transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100"
                        title={t('mediaGeneration.createVideo', { defaultValue: 'Create video' })}
                    >
                        <Film size={14} />
                    </button>
                )}

                {/* Delete button - shown on hover when not in selection mode */}
                {!isSelectionMode && onDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(file); }}
                        className="absolute bottom-2 right-2 z-10 p-1.5 bg-q-error/90 hover:bg-q-error text-white rounded-md shadow-lg transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100"
                        title={t('common.delete', 'Eliminar')}
                    >
                        <Trash2 size={14} />
                    </button>
                )}

                {/* Filename overlay on hover - only for images */}
                {isImage && !isSelectionMode && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-medium truncate">{file.name}</p>
                        <p className="text-primary-foreground/70 text-[10px] mt-0.5">{t('dashboard.assets.preview.dragToUse')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

interface FileHistoryProps {
    variant?: 'widget' | 'full' | 'gallery-only';
    onAddReferenceImage?: (base64Data: string) => Promise<void>;
    onCreateVideo?: (imageUrl: string) => void;
}

const FileHistory: React.FC<FileHistoryProps> = ({ variant = 'widget', onAddReferenceImage, onCreateVideo }) => {
    const { t } = useTranslation();
    const { files, isFilesLoading, uploadFile, deleteFile, hasActiveProject } = useFiles();
    const { projects, activeProject } = useProject();
    const { generateImage, enhancePrompt } = useAI();
    const { success, error: showError } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const referenceFileInputRef = useRef<HTMLInputElement>(null);

    // State for integrated generator
    const [prompt, setPrompt] = useState('A beautiful sunset over mountains'); // DEBUG: Initial prompt for testing
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [style, setStyle] = useState('None');
    const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('2K');
    const [lighting, setLighting] = useState('None');
    const [cameraAngle, setCameraAngle] = useState('None');
    const [colorGrading, setColorGrading] = useState('None');
    const [depthOfField, setDepthOfField] = useState('None');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
    const [fileToDelete, setFileToDelete] = useState<FileRecord | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');

    // Use the custom hook for asset management
    const library = useAssetLibrary({
        files,
        itemsPerPage: variant === 'widget' ? 12 : 24
    });

    // Reference images handlers
    const processFiles = (files: FileList | File[]) => {
        const remainingSlots = 14 - referenceImages.length;

        if (remainingSlots <= 0) {
            alert(t('dashboard.assets.generator.maxReferences'));
            return;
        }

        const filesToProcess = Array.from(files).slice(0, remainingSlots);

        filesToProcess.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setReferenceImages(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            }
        });
    };

    const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            processFiles(e.target.files);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        // First try base64 data (converted during drag)
        const base64Data = e.dataTransfer.getData('application/x-library-image-base64');
        if (base64Data) {
            // Already base64, add directly
            if (referenceImages.length >= 14) {
                showError(t('dashboard.assets.generator.maxReferences'));
                return;
            }
            if (referenceImages.includes(base64Data)) {
                showError(t('dashboard.assets.generator.alreadyAdded'));
                return;
            }
            setReferenceImages(prev => [...prev, base64Data]);
            window.dispatchEvent(new CustomEvent('assets:add-reference-image', { detail: base64Data }));
            success(t('dashboard.assets.generator.imageAdded'));
            return;
        }

        // Fallback: try URL and convert
        const libraryImageUrl = e.dataTransfer.getData('application/x-library-image');
        if (libraryImageUrl) {
            await addImageToReference(libraryImageUrl);
            return;
        }

        // Otherwise process as file upload
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    };

    // Convert URL to base64 data URL using canvas (avoids CORS issues)
    const urlToBase64 = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }

                    ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    resolve(dataUrl);
                } catch (error) {
                    console.error('Error converting image to base64:', error);
                    reject(error);
                }
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            // Add cache buster to avoid CORS cache issues
            const separator = url.includes('?') ? '&' : '?';
            img.src = `${url}${separator}t=${Date.now()}`;
        });
    };

    // Add image as base64 to reference images (from library)
    const addImageToReference = async (imageData: string) => {
        if (referenceImages.length >= 14) {
            showError(t('dashboard.assets.generator.maxReferences'));
            return;
        }

        // Check if already a base64 data URL
        if (imageData.startsWith('data:')) {
            if (referenceImages.includes(imageData)) {
                showError(t('dashboard.assets.generator.alreadyAdded'));
                return;
            }
            setReferenceImages(prev => [...prev, imageData]);
            window.dispatchEvent(new CustomEvent('assets:add-reference-image', { detail: imageData }));
            success(t('dashboard.assets.generator.imageAdded'));
            return;
        }

        // If it's a URL, try to convert using fetch+canvas (may fail with CORS)
        try {
            const fullUrl = imageData.startsWith('//') ? `https:${imageData}` : imageData;
            const converted = await urlToBase64(fullUrl);
            setReferenceImages(prev => [...prev, converted]);
            window.dispatchEvent(new CustomEvent('assets:add-reference-image', { detail: converted }));
            success(t('dashboard.assets.generator.imageAdded'));
        } catch (error) {
            // CORS error - show helpful message
            showError(t('dashboard.assets.generator.cannotAdd'));
            console.warn('CORS error adding image to reference. Use local upload instead:', error);
        }
    };

    const handleRemoveReferenceImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
        if (referenceFileInputRef.current) {
            referenceFileInputRef.current.value = '';
        }
    };

    const handleGenerate = async () => {
        console.log('🎨 [FileHistory] handleGenerate called');
        console.log('🎨 [FileHistory] prompt:', prompt);
        console.log('🎨 [FileHistory] generateImage function:', typeof generateImage);

        if (!prompt.trim()) {
            console.log('🎨 [FileHistory] Prompt is empty, returning');
            return;
        }

        setIsGenerating(true);
        try {
            const options = {
                aspectRatio,
                style,
                destination: 'user' as const,
                resolution,
                lighting: lighting !== 'None' ? lighting : undefined,
                cameraAngle: cameraAngle !== 'None' ? cameraAngle : undefined,
                colorGrading: colorGrading !== 'None' ? colorGrading : undefined,
                depthOfField: depthOfField !== 'None' ? depthOfField : undefined,
                referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
            };

            console.log('🎨 [FileHistory] Calling generateImage with options:', options);
            const result = await generateImage(prompt, options);
            console.log('🎨 [FileHistory] generateImage result:', result);

            success(t('dashboard.assets.generator.generated'));
            setPrompt('');
            setReferenceImages([]);
        } catch (error: any) {
            console.error('🎨 [FileHistory] Error generating image:', error);
            console.error('🎨 [FileHistory] Error details:', error?.message, error?.stack);
            showError(t('dashboard.assets.generator.generationFailed'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEnhancePrompt = async () => {
        if (!prompt.trim()) return;
        setIsEnhancing(true);
        try {
            const enhanced = await enhancePrompt(
                prompt,
                referenceImages.length > 0 ? referenceImages : undefined,
                {
                    usage: 'project-library',
                    destination: 'user',
                    aspectRatio,
                    style,
                    lighting,
                    cameraAngle,
                    colorGrading,
                    depthOfField,
                }
            );
            setPrompt(enhanced);
            success(t('dashboard.assets.generator.enhanced'));
        } catch (error) {
            console.error(error);
            showError('Failed to enhance prompt');
        } finally {
            setIsEnhancing(false);
        }
    };

    // Group files by project
    const filesByProject = React.useMemo(() => {
        const grouped: { [key: string]: FileRecord[] } = {
            'no-project': []
        };

        library.allFiles.forEach(file => {
            const projectKey = file.projectId || 'no-project';
            if (!grouped[projectKey]) {
                grouped[projectKey] = [];
            }
            grouped[projectKey].push(file);
        });

        return grouped;
    }, [library.allFiles]);

    // Get project names for display
    const projectNames = React.useMemo(() => {
        const names: { [key: string]: string } = {
            'no-project': 'Unassigned Assets'
        };

        projects.forEach(project => {
            names[project.id] = project.name;
        });

        return names;
    }, [projects]);

    // Filter files by selected project
    const filteredFilesByProject = React.useMemo(() => {
        if (selectedProjectFilter === 'all') {
            return filesByProject;
        }

        if (filesByProject[selectedProjectFilter]) {
            return { [selectedProjectFilter]: filesByProject[selectedProjectFilter] };
        }

        return {};
    }, [filesByProject, selectedProjectFilter]);

    const handleFileUpload = async (file: File) => {
        try {
            await uploadFile(file);
            success(`${file.name} ${t('dashboard.assets.actions.uploadSuccess')}`);
        } catch (err) {
            showError('Failed to upload file');
        }
    };

    // Single file delete handler
    const handleSingleDelete = async () => {
        if (!fileToDelete) return;
        setIsDeleting(true);
        try {
            await deleteFile(fileToDelete.id, fileToDelete.storagePath);
            success(`${fileToDelete.name} ${t('common.deleted', 'eliminado')}`);
        } catch (err) {
            showError(t('common.deleteFailed', 'Error al eliminar'));
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
            setFileToDelete(null);
        }
    };

    const handleBulkDelete = async () => {
        if (library.selectedFiles.length === 0) return;
        setShowBulkDeleteConfirm(true);
    };

    const confirmBulkDelete = async () => {
        setIsDeleting(true);
        try {
            await Promise.all(
                library.selectedFiles.map(f => deleteFile(f.id, f.storagePath))
            );
            success(t('dashboard.assets.actions.bulkDeleted', { count: library.selectedFiles.length }));
            library.clearSelection();
            library.toggleSelectionMode();
        } catch (err) {
            showError('Failed to delete some files');
        } finally {
            setIsDeleting(false);
            setShowBulkDeleteConfirm(false);
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
        ? "bg-q-surface/50 rounded-2xl border border-q-border p-5 backdrop-blur-sm"
        : "h-full flex flex-col";

    const gridClasses = variant === 'widget'
        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
        : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6";

    // Show message when no project is active
    if (!hasActiveProject && (variant === 'full' || variant === 'gallery-only')) {
        return (
            <section className={containerClasses}>
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="text-center max-w-md">
                        <ImageIcon className="w-16 h-16 text-q-text-muted mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-foreground mb-2">
                            {t('dashboard.assets.noProjectSelected', 'No hay proyecto seleccionado')}
                        </h2>
                        <p className="text-q-text-muted mb-6">
                            {t('dashboard.assets.selectProjectMessage', 'Selecciona un proyecto desde el menú lateral para ver y gestionar los archivos de ese proyecto.')}
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className={containerClasses}>
            {/* Asset Preview Modal */}
            {previewFile && (
                <ImageDetailModal
                    file={previewFile}
                    isOpen={!!previewFile}
                    onClose={() => setPreviewFile(null)}
                />
            )}

            {/* MEDIA GENERATOR - Only show in full Assets view, not in dashboard widget or gallery-only */}
            {variant === 'full' && (
                <div className="mb-8 overflow-hidden rounded-2xl border border-q-border bg-q-surface/80">
                    <MediaGeneratorPanel
                        destination="user"
                        projectId={hasActiveProject ? activeProject?.id : undefined}
                        className="h-[680px]"
                    />
                </div>
            )}

            {/* ASSET LIBRARY SECTION */}
            <div className="border-t border-q-border/50 pt-6">
                {/* Header */}
                <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${variant === 'widget' ? 'mb-4' : 'mb-6'}`}>
                    <div className="flex items-center gap-3">
                        <h2 className={`font-bold text-q-text-muted uppercase tracking-wider ${variant === 'widget' ? 'text-sm' : 'text-base'}`}>
                            Generated Images
                        </h2>
                        {library.stats.filtered < library.stats.total && (
                            <span className="text-xs text-q-text-muted bg-secondary px-2 py-1 rounded-md">
                                {library.stats.filtered} of {library.stats.total}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        {/* Search */}
                        <div className="flex items-center gap-2 flex-1 sm:flex-initial sm:w-48 bg-q-surface-overlay/40 rounded-lg px-3 py-1.5">
                            <Search size={14} className="text-q-text-secondary flex-shrink-0" />
                            <input
                                type="text"
                                value={library.searchQuery}
                                onChange={(e) => library.setSearchQuery(e.target.value)}
                                placeholder="Search assets..."
                                className="flex-1 bg-transparent outline-none text-xs min-w-0"
                            />
                            {library.searchQuery && (
                                <button onClick={() => library.setSearchQuery('')} className="text-q-text-secondary hover:text-q-text flex-shrink-0">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Filter Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center justify-center px-3 py-1.5 text-xs font-bold transition-colors ${showFilters ? 'text-primary' : 'text-q-text-muted hover:text-foreground'}`}
                            title="Filters"
                        >
                            <Filter size={14} />
                        </button>

                        {/* Selection Mode Toggle */}
                        <button
                            onClick={library.toggleSelectionMode}
                            className={`flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all ${library.isSelectionMode ? 'text-primary' : 'text-q-text-muted hover:text-foreground'}`}
                            title="Selection Mode"
                        >
                            <CheckSquare className="w-4 h-4" />
                            {library.isSelectionMode && library.selectedIds.size > 0 && (
                                <span>({library.selectedIds.size})</span>
                            )}
                        </button>

                        {/* Upload (with drag & drop) */}
                        <DragDropZone
                            onFileSelect={handleFileUpload}
                            accept="*"
                            maxSizeMB={10}
                            variant="compact"
                        >
                            <button className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-q-text-muted hover:text-foreground hover:bg-secondary">
                                <Upload className="w-4 h-4" />
                                Upload
                            </button>
                        </DragDropZone>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="mb-4 p-4 bg-secondary/50 rounded-lg border border-q-border animate-fade-in-up">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Project Filter */}
                            <div>
                                <label className="block text-xs font-bold text-q-text-muted mb-2 uppercase">Project</label>
                                <AppSelect
                                    value={selectedProjectFilter}
                                    onChange={(e) => setSelectedProjectFilter(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs bg-q-bg border border-q-border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                                >
                                    <option value="all">All Projects</option>
                                    {projects.map(project => (
                                        <option key={project.id} value={project.id}>{project.name}</option>
                                    ))}
                                    <option value="no-project">Unassigned Assets</option>
                                </AppSelect>
                            </div>

                            {/* Type Filter */}
                            <div>
                                <label className="block text-xs font-bold text-q-text-muted mb-2 uppercase">Type</label>
                                <AppSelect
                                    value={library.typeFilter}
                                    onChange={(e) => library.setTypeFilter(e.target.value as any)}
                                    className="w-full px-3 py-1.5 text-xs bg-q-bg border border-q-border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                                >
                                    <option value="all">All Files</option>
                                    <option value="image">Images Only</option>
                                    <option value="document">Documents Only</option>
                                    <option value="other">Other</option>
                                </AppSelect>
                            </div>

                            {/* Sort By */}
                            <div>
                                <label className="block text-xs font-bold text-q-text-muted mb-2 uppercase">Sort By</label>
                                <AppSelect
                                    value={library.sortBy}
                                    onChange={(e) => library.setSortBy(e.target.value as any)}
                                    className="w-full px-3 py-1.5 text-xs bg-q-bg border border-q-border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                                >
                                    <option value="date">Date</option>
                                    <option value="name">Name</option>
                                    <option value="size">Size</option>
                                    <option value="type">Type</option>
                                </AppSelect>
                            </div>

                            {/* Sort Order */}
                            <div>
                                <label className="block text-xs font-bold text-q-text-muted mb-2 uppercase">Order</label>
                                <button
                                    onClick={library.toggleSortOrder}
                                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs bg-q-bg border border-q-border rounded-lg hover:bg-secondary transition-colors"
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
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-q-accent text-q-text-on-accent hover:bg-q-accent rounded-lg transition-colors"
                            >
                                <Download size={14} /> Download
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-q-error text-white hover:bg-q-error rounded-lg transition-colors"
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                    </div>
                )}

                {/* Files Grid - Grouped by Project */}
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                    {isFilesLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 text-q-text-muted">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                            <span className="text-xs">Syncing...</span>
                        </div>
                    ) : Object.keys(filteredFilesByProject).length > 0 ? (
                        <div className="space-y-6">
                            {Object.entries(filteredFilesByProject).map(([projectId, projectFiles]) => {
                                if (projectFiles.length === 0) return null;

                                return (
                                    <div key={projectId} className="space-y-3">
                                        {/* Project Header */}
                                        <div className="flex items-center gap-2 pb-2 border-b border-q-border/50">
                                            <h3 className="text-sm font-bold text-foreground">
                                                {projectNames[projectId] || 'Unknown Project'}
                                            </h3>
                                            <span className="text-xs text-q-text-muted bg-secondary px-2 py-0.5 rounded-md">
                                                {projectFiles.length} {projectFiles.length === 1 ? 'asset' : 'assets'}
                                            </span>
                                        </div>

                                        {/* Project Files Grid */}
                                        <div className={gridClasses}>
                                            {projectFiles.map(file => (
                                                <div key={file.id} className="h-full">
                                                    <FileItem
                                                        file={file}
                                                        variant={variant}
                                                        onPreview={setPreviewFile}
                                                        isSelected={library.isSelected(file.id)}
                                                        onToggleSelect={() => library.toggleSelection(file.id)}
                                                        isSelectionMode={library.isSelectionMode}
                                                        onAddToReference={onAddReferenceImage || (variant !== 'widget' ? addImageToReference : undefined)}
                                                        onCreateVideo={onCreateVideo}
                                                        onDelete={(f) => { setFileToDelete(f); setShowDeleteConfirm(true); }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 px-4 border-2 border-dashed border-q-border rounded-xl bg-secondary/20">
                            <ImageIcon size={32} className="mx-auto mb-2 text-q-text-muted opacity-50" />
                            <p className="text-sm font-medium text-foreground mb-1">No images yet</p>
                            <p className="text-xs text-q-text-muted">Generate your first image above to get started</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Single Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onConfirm={handleSingleDelete}
                onCancel={() => { setShowDeleteConfirm(false); setFileToDelete(null); }}
                title={t('common.confirmDelete', '¿Estás seguro?')}
                message={t('common.confirmDeleteMessage', 'Esta acción no se puede deshacer. El elemento será eliminado permanentemente.')}
                variant="danger"
                isLoading={isDeleting}
            />

            {/* Bulk Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showBulkDeleteConfirm}
                onConfirm={confirmBulkDelete}
                onCancel={() => setShowBulkDeleteConfirm(false)}
                title={t('common.confirmDelete', '¿Estás seguro?')}
                message={t('common.confirmDeleteMessagePlural', { count: library.selectedFiles.length, defaultValue: `Esta acción eliminará ${library.selectedFiles.length} elemento(s) permanentemente.` })}
                variant="danger"
                isLoading={isDeleting}
                count={library.selectedFiles.length}
            />
        </section>
    );
};

export default FileHistory;
