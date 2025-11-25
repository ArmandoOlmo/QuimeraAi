
import React, { useRef, useState } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { useToast } from '../../contexts/ToastContext';
import { useAssetLibrary } from '../../hooks/useAssetLibrary';
import { FileRecord } from '../../types';
import { FileText, Upload, Trash2, Download, Sparkles, ChevronDown, Zap, X, Calendar, HardDrive, Search, Filter, ArrowUpDown, CheckSquare, Square, Wand2, Loader2, Plus, ImageIcon } from 'lucide-react';
import DragDropZone from '../ui/DragDropZone';
import Modal from '../ui/Modal';
import { formatBytes, formatFileDate } from '../../utils/fileHelpers';

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
    const { files, isFilesLoading, uploadFile, deleteFile, projects, generateImage, enhancePrompt } = useEditor();
    const { success, error: showError } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const referenceFileInputRef = useRef<HTMLInputElement>(null);
    
    // State for integrated generator
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [style, setStyle] = useState('None');
    const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('4K');
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
            alert("Maximum 14 reference images allowed.");
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

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            processFiles(e.dataTransfer.files);
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
            success('Image generated successfully!');
            setPrompt('');
            setReferenceImages([]);
        } catch (error) {
            console.error(error);
            showError("Generation failed. Check console details.");
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
            success('Prompt enhanced!');
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

    return (
        <section className={containerClasses}>
            {/* Asset Preview Modal */}
            <Modal isOpen={!!previewFile} onClose={() => setPreviewFile(null)}>
                {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
            </Modal>

            {/* IMAGE GENERATOR - INTEGRATED */}
            <div className="mb-8 p-6 bg-gradient-to-br from-purple-600/10 via-pink-600/10 to-orange-500/10 border-2 border-purple-500/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Quimera Image Generator</h2>
                        <p className="text-sm text-muted-foreground">Create stunning AI images with advanced controls</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Prompt */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-foreground">Prompt</label>
                            <button 
                                onClick={handleEnhancePrompt}
                                disabled={isEnhancing || !prompt}
                                className="flex items-center text-xs text-purple-600 hover:text-purple-700 transition-colors disabled:opacity-50"
                                title="Use AI to improve your prompt"
                            >
                                {isEnhancing ? <Loader2 size={12} className="animate-spin mr-1"/> : <Wand2 size={12} className="mr-1"/>}
                                Enhance
                            </button>
                        </div>
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the image you want to generate..."
                            className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:ring-2 focus:ring-purple-500 outline-none resize-none h-24"
                        />
                    </div>

                    {/* Reference Images */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-muted-foreground uppercase">Reference Images (Optional)</label>
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
                            className={`border-2 border-dashed rounded-lg p-4 transition-all ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-border hover:border-purple-500 hover:bg-purple-500/5'}`}
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
                                            <span className="text-[10px]">Add</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => referenceFileInputRef.current?.click()}
                                    className="w-full flex flex-col items-center gap-2 text-muted-foreground py-4"
                                >
                                    <Upload size={24} />
                                    <span className="text-xs font-medium">Click or Drag to upload</span>
                                    <span className="text-xs opacity-70">Up to 14 images supported</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quick Controls Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Aspect Ratio</label>
                            <select 
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value)}
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                {ASPECT_RATIOS.map(ratio => (
                                    <option key={ratio.value} value={ratio.value}>{ratio.label}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Style</label>
                            <select 
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                {STYLES.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Resolution</label>
                            <select 
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value as '1K' | '2K' | '4K')}
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                {RESOLUTIONS.map(res => (
                                    <option key={res.value} value={res.value}>{res.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Advanced Controls Toggle */}
                    <div className="border-t border-border/50 pt-3">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-xs text-purple-600 hover:text-purple-700 font-bold uppercase transition-colors flex items-center justify-between w-full"
                        >
                            <span>Advanced Controls</span>
                            <span className="text-lg">{showAdvanced ? '−' : '+'}</span>
                        </button>
                    </div>

                    {showAdvanced && (
                        <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Lighting</label>
                                <select 
                                    value={lighting}
                                    onChange={(e) => setLighting(e.target.value)}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    {LIGHTING_OPTIONS.map(l => (
                                        <option key={l} value={l}>{l}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Camera Angle</label>
                                <select 
                                    value={cameraAngle}
                                    onChange={(e) => setCameraAngle(e.target.value)}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    {CAMERA_ANGLES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Color Grading</label>
                                <select 
                                    value={colorGrading}
                                    onChange={(e) => setColorGrading(e.target.value)}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    {COLOR_GRADING.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Depth of Field</label>
                                <select 
                                    value={depthOfField}
                                    onChange={(e) => setDepthOfField(e.target.value)}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center hover:scale-[1.02]"
                    >
                        {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Zap className="mr-2" />}
                        {isGenerating ? 'Generating...' : 'Generate Image'}
                    </button>
                </div>
            </div>

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
                            className={`flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all ${library.isSelectionMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
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
