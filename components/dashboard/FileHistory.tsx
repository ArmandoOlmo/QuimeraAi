
import React, { useRef, useState } from 'react';
import { useFiles } from '../../contexts/files';
import { useAI } from '../../contexts/ai';
import { useProject } from '../../contexts/project';
import { useToast } from '../../contexts/ToastContext';
import { useAssetLibrary } from '../../hooks/useAssetLibrary';
import { FileRecord } from '../../types';
import { FileText, Upload, Trash2, Download, Sparkles, ChevronDown, Zap, X, Calendar, HardDrive, Search, Filter, ArrowUpDown, CheckSquare, Square, Wand2, Loader2, Plus, ImageIcon, AlertTriangle } from 'lucide-react';
import DragDropZone from '../ui/DragDropZone';
import Modal from '../ui/Modal';
import { formatBytes, formatFileDate } from '../../utils/fileHelpers';
import { useTranslation } from 'react-i18next';

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

const FilePreviewModal: React.FC<{ file: FileRecord; onClose: () => void }> = ({ file, onClose }) => {
    const { t } = useTranslation();
    const { deleteFile, updateFileNotes, generateFileSummary } = useFiles();
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
            success(t('dashboard.assets.preview.notesSaved'));
        }, 1000);
    };

    const handleDelete = async () => {
        if (window.confirm(t('dashboard.assets.actions.deleteConfirm'))) {
            try {
                await deleteFile(file.id, file.storagePath);
                success(t('dashboard.assets.actions.deleted'));
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
                        <p className="text-lg font-medium">{t('dashboard.assets.preview.notAvailable')}</p>
                    </div>
                )}
            </div>

            {/* Details Section */}
            <div className="border-t border-editor-border bg-editor-panel-bg z-10">
                {/* Basic Info */}
                <div className="p-4 border-b border-editor-border/50">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                            <p className="text-sm font-bold text-editor-text-primary mb-1">{t('dashboard.assets.preview.title')}</p>
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
                        <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase">{t('dashboard.assets.preview.notes')}</label>
                        <textarea
                            value={notes}
                            onChange={handleNotesChange}
                            rows={2}
                            placeholder={t('dashboard.assets.preview.notes')}
                            className="w-full bg-editor-bg text-sm text-editor-text-primary p-3 rounded-lg border border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none resize-none"
                        />
                    </div>

                    {/* AI Summary */}
                    {file.aiSummary && (
                        <div className="bg-editor-bg/50 p-3 rounded-lg border border-editor-border/50">
                            <div className="flex items-center mb-2">
                                <Sparkles size={14} className="text-editor-accent mr-2" />
                                <span className="text-xs font-bold text-editor-accent uppercase">{t('dashboard.assets.preview.aiSummary')}</span>
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
                            <Sparkles size={14} className="mr-1.5" /> {t('dashboard.assets.preview.generateSummary')}
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex items-center text-xs font-bold py-2 px-4 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        >
                            <Trash2 size={14} className="mr-1.5" /> {t('dashboard.assets.actions.delete')}
                        </button>
                    </div>
                    <a
                        href={file.downloadURL}
                        download={file.name}
                        className="flex items-center bg-editor-accent text-editor-bg px-6 py-2.5 rounded-lg font-bold shadow-lg hover:bg-editor-accent-hover transition-transform hover:scale-105 text-sm"
                    >
                        <Download size={16} className="mr-2" /> {t('dashboard.assets.actions.download')}
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
    onAddToReference?: (base64Data: string) => Promise<void>;
}> = ({ file, variant, onPreview, isSelected, onToggleSelect, isSelectionMode, onAddToReference }) => {
    const { t } = useTranslation();
    const isImage = file.type.startsWith('image/');
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
    variant?: 'widget' | 'full';
}

const FileHistory: React.FC<FileHistoryProps> = ({ variant = 'widget' }) => {
    const { t } = useTranslation();
    const { files, isFilesLoading, uploadFile, deleteFile } = useFiles();
    const { projects } = useProject();
    const { generateImage, enhancePrompt } = useAI();
    const { success, error: showError } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const referenceFileInputRef = useRef<HTMLInputElement>(null);

    // State for integrated generator
    const [prompt, setPrompt] = useState('');
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
            success(t('dashboard.assets.generator.imageAdded'));
            return;
        }

        // If it's a URL, try to convert using fetch+canvas (may fail with CORS)
        try {
            const fullUrl = imageData.startsWith('//') ? `https:${imageData}` : imageData;
            const converted = await urlToBase64(fullUrl);
            setReferenceImages(prev => [...prev, converted]);
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
        if (!prompt.trim()) return;
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


            await generateImage(prompt, options);
            success(t('dashboard.assets.generator.generated'));
            setPrompt('');
            setReferenceImages([]);
        } catch (error) {
            console.error(error);
            showError(t('dashboard.assets.generator.generationFailed'));
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

    const handleBulkDelete = async () => {
        if (library.selectedFiles.length === 0) return;

        if (!window.confirm(t('dashboard.assets.actions.bulkDeleteConfirm', { count: library.selectedFiles.length }))) return;

        try {
            await Promise.all(
                library.selectedFiles.map(f => deleteFile(f.id, f.storagePath))
            );
            success(t('dashboard.assets.actions.bulkDeleted', { count: library.selectedFiles.length }));
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

    return (
        <section className={containerClasses}>
            {/* Asset Preview Modal */}
            <Modal isOpen={!!previewFile} onClose={() => setPreviewFile(null)}>
                {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
            </Modal>

            {/* IMAGE GENERATOR - Only show in full Assets view, not in dashboard widget */}
            {variant !== 'widget' && (
                <div className="mb-8 p-6 bg-primary/5 border-2 border-primary/20 rounded-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary rounded-lg">
                            <Zap className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">{t('dashboard.assets.generator.title')}</h2>
                            <p className="text-sm text-muted-foreground">{t('dashboard.assets.generator.subtitle')}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Prompt */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-foreground">{t('dashboard.assets.generator.promptLabel')}</label>
                                <button
                                    onClick={handleEnhancePrompt}
                                    disabled={isEnhancing || !prompt}
                                    className="flex items-center text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                                    title="Use AI to improve your prompt"
                                >
                                    {isEnhancing ? <Loader2 size={12} className="animate-spin mr-1" /> : <Wand2 size={12} className="mr-1" />}
                                    {t('dashboard.assets.generator.enhance')}
                                </button>
                            </div>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={t('dashboard.assets.generator.promptLabel')}
                                className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none resize-none h-24"
                            />
                        </div>

                        {/* Reference Images */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-muted-foreground uppercase">{t('dashboard.assets.generator.referenceImages')}</label>
                                <span className="text-xs text-muted-foreground">{referenceImages.length}/14</span>
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
                                className={`border-2 border-dashed rounded-lg p-4 transition-all ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary hover:bg-primary/5'}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                {referenceImages.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2 mb-2">
                                        {referenceImages.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-md overflow-hidden group border border-border">
                                                <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveReferenceImage(idx); }}
                                                    className="absolute top-1 right-1 p-1 bg-red-500/90 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                        {referenceImages.length < 14 && (
                                            <button
                                                onClick={() => referenceFileInputRef.current?.click()}
                                                className="aspect-square flex flex-col items-center justify-center gap-1 border border-border rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <Plus size={16} />
                                                <span className="text-[10px]">{t('dashboard.assets.generator.addButton')}</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => referenceFileInputRef.current?.click()}
                                        className="w-full flex flex-col items-center gap-2 text-muted-foreground py-4"
                                    >
                                        <Upload size={24} />
                                        <span className="text-xs font-medium">{t('dashboard.assets.generator.uploadText')}</span>
                                        <span className="text-xs opacity-70">{t('dashboard.assets.generator.dragText')}</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick Controls Row */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">{t('dashboard.assets.controls.aspectRatio')}</label>
                                <select
                                    value={aspectRatio}
                                    onChange={(e) => setAspectRatio(e.target.value)}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    {ASPECT_RATIOS.map(ratio => (
                                        <option key={ratio.value} value={ratio.value}>{ratio.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">{t('dashboard.assets.controls.style')}</label>
                                <select
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    {STYLES.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">{t('dashboard.assets.controls.resolution')}</label>
                                <select
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value as '1K' | '2K' | '4K')}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    {RESOLUTIONS.map(res => (
                                        <option key={res.value} value={res.value}>{res.label}</option>
                                    ))}
                                </select>
                                {/* 4K Warning */}
                                {resolution === '4K' && (
                                    <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
                                        <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-amber-600 dark:text-amber-400">
                                            4K images are large and may slow down your website. Consider using 2K for better performance.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Advanced Controls Toggle */}
                        <div className="border-t border-border/50 pt-3">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="text-xs text-primary hover:text-primary/80 font-bold uppercase transition-colors flex items-center justify-between w-full"
                            >
                                <span>{t('dashboard.assets.advancedControls')}</span>
                                <span className="text-lg">{showAdvanced ? '−' : '+'}</span>
                            </button>
                        </div>

                        {showAdvanced && (
                            <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">{t('dashboard.assets.controls.lighting')}</label>
                                    <select
                                        value={lighting}
                                        onChange={(e) => setLighting(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {LIGHTING_OPTIONS.map(l => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">{t('dashboard.assets.controls.cameraAngle')}</label>
                                    <select
                                        value={cameraAngle}
                                        onChange={(e) => setCameraAngle(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {CAMERA_ANGLES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">{t('dashboard.assets.controls.colorGrading')}</label>
                                    <select
                                        value={colorGrading}
                                        onChange={(e) => setColorGrading(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {COLOR_GRADING.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">{t('dashboard.assets.controls.depthOfField')}</label>
                                    <select
                                        value={depthOfField}
                                        onChange={(e) => setDepthOfField(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {DEPTH_OF_FIELD.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt}
                            className="w-full py-3 text-primary font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center hover:text-primary/80"
                        >
                            {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Zap className="mr-2" />}
                            {isGenerating ? t('dashboard.assets.generator.generating') : t('dashboard.assets.generator.generateButton')}
                        </button>
                    </div>
                </div>
            )}

            {/* ASSET LIBRARY SECTION */}
            <div className="border-t border-border/50 pt-6">
                {/* Header */}
                <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${variant === 'widget' ? 'mb-4' : 'mb-6'}`}>
                    <div className="flex items-center gap-3">
                        <h2 className={`font-bold text-muted-foreground uppercase tracking-wider ${variant === 'widget' ? 'text-sm' : 'text-base'}`}>
                            Generated Images
                        </h2>
                        {library.stats.filtered < library.stats.total && (
                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                                {library.stats.filtered} of {library.stats.total}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        {/* Search */}
                        <div className="flex items-center gap-2 flex-1 sm:flex-initial sm:w-48 bg-editor-border/40 rounded-lg px-3 py-1.5">
                            <Search size={14} className="text-editor-text-secondary flex-shrink-0" />
                            <input
                                type="text"
                                value={library.searchQuery}
                                onChange={(e) => library.setSearchQuery(e.target.value)}
                                placeholder="Search assets..."
                                className="flex-1 bg-transparent outline-none text-xs min-w-0"
                            />
                            {library.searchQuery && (
                                <button onClick={() => library.setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Filter Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center justify-center px-3 py-1.5 text-xs font-bold transition-colors ${showFilters ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            title="Filters"
                        >
                            <Filter size={14} />
                        </button>

                        {/* Selection Mode Toggle */}
                        <button
                            onClick={library.toggleSelectionMode}
                            className={`flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all ${library.isSelectionMode ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
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
                            <button className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-secondary">
                                <Upload className="w-4 h-4" />
                                Upload
                            </button>
                        </DragDropZone>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="mb-4 p-4 bg-secondary/50 rounded-lg border border-border animate-fade-in-up">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Project Filter */}
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Project</label>
                                <select
                                    value={selectedProjectFilter}
                                    onChange={(e) => setSelectedProjectFilter(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                                >
                                    <option value="all">All Projects</option>
                                    {projects.map(project => (
                                        <option key={project.id} value={project.id}>{project.name}</option>
                                    ))}
                                    <option value="no-project">Unassigned Assets</option>
                                </select>
                            </div>

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

                {/* Files Grid - Grouped by Project */}
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                    {isFilesLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
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
                                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                            <h3 className="text-sm font-bold text-foreground">
                                                {projectNames[projectId] || 'Unknown Project'}
                                            </h3>
                                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
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
                                                        onAddToReference={variant === 'full' ? addImageToReference : undefined}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 px-4 border-2 border-dashed border-border rounded-xl bg-secondary/20">
                            <ImageIcon size={32} className="mx-auto mb-2 text-muted-foreground opacity-50" />
                            <p className="text-sm font-medium text-foreground mb-1">No images yet</p>
                            <p className="text-xs text-muted-foreground">Generate your first image above to get started</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default FileHistory;
