import React, { useState, useRef } from 'react';
import { useAI } from '../../contexts/ai';
import { useFiles } from '../../contexts/files';
import { useTranslation } from 'react-i18next';
import {
    Zap, Loader2, Wand2, X, Download, Upload, Image as ImageIcon, Plus,
    AlertTriangle, Sparkles, Brain, Users, Thermometer, Eye, Flame, Layers,
    Rocket, ChevronDown, Check, Settings2, Palette, Camera, Sun, CheckCircle2,
    PanelLeftClose
} from 'lucide-react';

interface ImageGeneratorPanelProps {
    destination: 'user' | 'global';
    className?: string;
    onClose?: () => void;
    onCollapse?: () => void;
    hidePreview?: boolean;
    onImageGenerated?: (imageUrl: string) => void;
    onUseImage?: (imageUrl: string) => void;
}

const ImageGeneratorPanel: React.FC<ImageGeneratorPanelProps> = ({ destination, className = '', onClose, onCollapse, hidePreview = false, onImageGenerated, onUseImage }) => {
    const { generateImage, enhancePrompt } = useAI();
    const { uploadGlobalFile, uploadFile, hasActiveProject } = useFiles();
    const { t } = useTranslation();

    // Translation-dependent constants
    const ASPECT_RATIOS = [
        { label: '1:1', value: '1:1', icon: '■' },
        { label: '16:9', value: '16:9', icon: '▬' },
        { label: '9:16', value: '9:16', icon: '▮' },
        { label: '4:3', value: '4:3', icon: '▭' },
        { label: '3:4', value: '3:4', icon: '▯' },
        { label: '21:9', value: '21:9', icon: '━' },
    ];

    const STYLES = [
        { label: t('editor.none'), value: 'None' },
        { label: t('editor.photorealistic'), value: 'Photorealistic' },
        { label: t('editor.cinematic'), value: 'Cinematic' },
        { label: t('editor.anime'), value: 'Anime' },
        { label: t('editor.digitalArt'), value: 'Digital Art' },
        { label: t('editor.oilPainting'), value: 'Oil Painting' },
        { label: t('editor.3dRender'), value: '3D Render' },
        { label: t('editor.minimalist'), value: 'Minimalist' },
        { label: t('editor.cyberpunk'), value: 'Cyberpunk' },
        { label: t('editor.watercolor'), value: 'Watercolor' }
    ];

    const RESOLUTIONS = [
        { label: '1K', value: '1K', desc: 'Fast' },
        { label: '2K', value: '2K', desc: 'Balanced' },
        { label: '4K', value: '4K', desc: 'Best' },
    ];

    const LIGHTING_OPTIONS = [
        { label: t('editor.none'), value: 'None' },
        { label: t('editor.naturalLighting'), value: 'Natural Lighting' },
        { label: t('editor.softLighting'), value: 'Soft Lighting' },
        { label: t('editor.dramaticLighting'), value: 'Dramatic Lighting' },
        { label: t('editor.goldenHour'), value: 'Golden Hour' },
        { label: t('editor.blueHour'), value: 'Blue Hour' },
        { label: t('editor.studioLighting'), value: 'Studio Lighting' },
        { label: t('editor.neonLighting'), value: 'Neon Lighting' },
        { label: t('editor.rimLighting'), value: 'Rim Lighting' },
        { label: t('editor.volumetricLighting'), value: 'Volumetric Lighting' }
    ];

    const CAMERA_ANGLES = [
        { label: t('editor.none'), value: 'None' },
        { label: t('editor.eyeLevel'), value: 'Eye Level' },
        { label: t('editor.lowAngle'), value: 'Low Angle' },
        { label: t('editor.highAngle'), value: 'High Angle' },
        { label: t('editor.birdsEyeView'), value: 'Bird\'s Eye View' },
        { label: t('editor.wormsEyeView'), value: 'Worm\'s Eye View' },
        { label: t('editor.dutchAngle'), value: 'Dutch Angle' },
        { label: t('editor.overTheShoulder'), value: 'Over the Shoulder' },
        { label: t('editor.closeUp'), value: 'Close-up' },
        { label: t('editor.wideShot'), value: 'Wide Shot' },
        { label: t('editor.aerialView'), value: 'Aerial View' }
    ];

    const COLOR_GRADING = [
        { label: t('editor.none'), value: 'None' },
        { label: t('editor.warmTones'), value: 'Warm Tones' },
        { label: t('editor.coolTones'), value: 'Cool Tones' },
        { label: t('editor.vibrant'), value: 'Vibrant' },
        { label: t('editor.desaturated'), value: 'Desaturated' },
        { label: t('editor.highContrast'), value: 'High Contrast' },
        { label: t('editor.lowContrast'), value: 'Low Contrast' },
        { label: t('editor.cinematic'), value: 'Cinematic' },
        { label: t('editor.vintage'), value: 'Vintage' },
        { label: t('editor.blackAndWhite'), value: 'Black and White' },
        { label: t('editor.sepia'), value: 'Sepia' }
    ];

    const DEPTH_OF_FIELD = [
        { label: t('editor.none'), value: 'None' },
        { label: t('editor.shallow'), value: 'Shallow (Bokeh Background)' },
        { label: t('editor.deep'), value: 'Deep (All in Focus)' },
        { label: t('editor.medium'), value: 'Medium (Balanced)' },
        { label: t('editor.tiltShift'), value: 'Tilt-Shift Effect' }
    ];

    // Quimera AI Model Controls
    const MODELS = [
        {
            id: 'vision-pro',
            label: 'Quimera Vision Pro',
            value: 'gemini-3-pro-image-preview',
            description: t('editor.quimeraUltraDesc', { defaultValue: 'Maximum quality, slower generation' }),
            icon: Eye,
            badge: 'PRO',
            color: 'from-violet-500 to-purple-600'
        },
        {
            id: 'ultra',
            label: 'Quimera Ultra',
            value: 'imagen-4.0-ultra-generate-001',
            description: t('editor.quimeraVisionProDesc', { defaultValue: 'Best for text and complex scenes' }),
            icon: Flame,
            badge: 'ULTRA',
            color: 'from-orange-500 to-red-500'
        },
        {
            id: 'vision',
            label: 'Quimera Vision',
            value: 'gemini-2.5-flash',
            description: t('editor.quimeraVisionDesc', { defaultValue: 'Balanced quality and speed' }),
            icon: Layers,
            badge: null,
            color: 'from-blue-500 to-cyan-500'
        },
        {
            id: 'fast',
            label: 'Quimera Fast',
            value: 'imagen-3.0-fast-generate-001',
            description: t('editor.quimeraFastDesc', { defaultValue: 'Fastest generation' }),
            icon: Rocket,
            badge: 'FAST',
            color: 'from-emerald-500 to-green-500'
        },
    ];

    const THINKING_LEVELS = [
        { label: t('editor.none', { defaultValue: 'None' }), value: 'none' },
        { label: t('editor.low', { defaultValue: 'Low' }), value: 'low' },
        { label: t('editor.medium', { defaultValue: 'Medium' }), value: 'medium' },
        { label: t('editor.high', { defaultValue: 'High' }), value: 'high' },
    ];

    // State
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('gemini-3-pro-image-preview');
    const [thinkingLevel, setThinkingLevel] = useState('high');
    const [personGeneration, setPersonGeneration] = useState('allow_adult');
    const [temperature, setTemperature] = useState(1.0);
    const [negativePrompt, setNegativePrompt] = useState('');
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
    const [isSaving, setIsSaving] = useState(false);
    const [savedToLibrary, setSavedToLibrary] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);
    const [showImageDetail, setShowImageDetail] = useState(false);
    const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
    const [generatedOptions, setGeneratedOptions] = useState<{
        model: string;
        aspectRatio: string;
        style: string;
        resolution: string;
        negativePrompt?: string;
    } | null>(null);

    // Reference Images State
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper function to convert File to base64 data URL
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
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

    // Save generated image to library
    const saveToLibrary = async (imageDataUrl: string, promptText: string): Promise<string | undefined> => {
        setIsSaving(true);
        try {
            const timestamp = Date.now();
            const filename = `quimera-${timestamp}.png`;
            const file = base64ToFile(imageDataUrl, filename);

            let savedUrl: string | undefined;

            if (destination === 'global') {
                // Save to global files library (Super Admin)
                await uploadGlobalFile(file);
                // uploadGlobalFile doesn't return URL, but the file is saved
                console.log('✅ [ImageGeneratorPanel] Saved to global library');
                setSavedToLibrary(true);
                // The URL comes from the globalFiles state update via FilesContext
            } else if (hasActiveProject) {
                // Save to user's project files
                savedUrl = await uploadFile(file);
                console.log('✅ [ImageGeneratorPanel] Saved to project files:', savedUrl);
                if (savedUrl) {
                    setSavedToLibrary(true);
                    setSavedImageUrl(savedUrl);
                }
            } else {
                console.warn('⚠️ [ImageGeneratorPanel] No active project, image not saved to library');
            }

            return savedUrl;
        } catch (error) {
            console.error('❌ [ImageGeneratorPanel] Error saving to library:', error);
            return undefined;
        } finally {
            setIsSaving(false);
        }
    };

    const processFiles = async (files: FileList | File[]) => {
        const remainingSlots = 14 - referenceImages.length;

        if (remainingSlots <= 0) {
            alert(t('editor.maxImagesAlert'));
            return;
        }

        const filesToProcess = Array.from(files).slice(0, remainingSlots);
        setIsUploading(true);

        const successfulBase64s: string[] = [];

        try {
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
        } catch (error) {
            console.error("Error processing reference images:", error);
        } finally {
            setIsUploading(false);
        }
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
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        setSavedToLibrary(false);
        setSavedImageUrl(null);
        setShowImageDetail(false);

        try {
            const options = {
                aspectRatio,
                style,
                destination,
                resolution,
                model: selectedModel,
                thinkingLevel: thinkingLevel !== 'none' ? thinkingLevel : undefined,
                personGeneration,
                temperature,
                negativePrompt: negativePrompt.trim() || undefined,
                lighting: lighting !== 'None' ? lighting : undefined,
                cameraAngle: cameraAngle !== 'None' ? cameraAngle : undefined,
                colorGrading: colorGrading !== 'None' ? colorGrading : undefined,
                depthOfField: depthOfField !== 'None' ? depthOfField : undefined,
                referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
            };

            console.log('✨ [ImageGeneratorPanel] Quimera options:', options);

            const imageDataUrl = await generateImage(prompt, options);
            setGeneratedImage(imageDataUrl);

            // Save the prompt and options used for the detail modal
            setGeneratedPrompt(prompt);
            setGeneratedOptions({
                model: selectedModel,
                aspectRatio,
                style,
                resolution,
                negativePrompt: negativePrompt.trim() || undefined,
            });

            // Automatically save to library after successful generation
            const savedUrl = await saveToLibrary(imageDataUrl, prompt);

            // Call callback with the saved URL or the data URL
            if (onImageGenerated) {
                onImageGenerated(savedUrl || imageDataUrl);
            }

        } catch (error) {
            console.error(error);
            alert(t('editor.generationFailed'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEnhancePrompt = async () => {
        if (!prompt.trim()) return;
        setIsEnhancing(true);
        try {
            const enhanced = await enhancePrompt(prompt, referenceImages.length > 0 ? referenceImages : undefined);
            setPrompt(enhanced);
        } catch (error) {
            console.error(error);
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleReset = () => {
        setGeneratedImage(null);
        setSavedToLibrary(false);
        setSavedImageUrl(null);
        setShowImageDetail(false);
        setGeneratedPrompt('');
        setGeneratedOptions(null);
        setPrompt('');
        setReferenceImages([]);
    };

    const currentModel = MODELS.find(m => m.value === selectedModel) || MODELS[0];
    const isVisionPro = selectedModel === 'gemini-3-pro-image-preview';

    return (
        <div className={`bg-editor-bg flex flex-col h-full overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 md:px-5 md:py-4 border-b border-editor-border bg-gradient-to-r from-editor-panel-bg to-editor-bg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-gradient-to-br ${currentModel.color} shadow-lg`}>
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-editor-text-primary flex items-center gap-2">
                                {t('editor.quimeraImageGenerator', { defaultValue: 'Generador de Imágenes Quimera' })}
                            </h2>
                            <p className="text-xs text-editor-text-secondary">
                                {currentModel.description}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {onCollapse && (
                            <button
                                onClick={onCollapse}
                                className="p-2 rounded-lg hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                                title={t('common.minimize', { defaultValue: 'Minimizar' })}
                            >
                                <PanelLeftClose size={18} />
                            </button>
                        )}
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Model Selector - Prominent Card Design */}
            <div className="flex-shrink-0 px-5 py-4 border-b border-editor-border bg-editor-panel-bg/30">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wide mb-3">
                    {t('editor.model', { defaultValue: 'Modelo' })}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {MODELS.map(model => {
                        const IconComponent = model.icon;
                        const isSelected = selectedModel === model.value;
                        return (
                            <button
                                key={model.id}
                                onClick={() => setSelectedModel(model.value)}
                                className={`
                                    relative p-3 rounded-xl border-2 transition-all duration-200 text-left group
                                    ${isSelected
                                        ? `border-transparent bg-gradient-to-br ${model.color} text-white shadow-lg scale-[1.02]`
                                        : 'border-editor-border bg-editor-bg hover:border-editor-text-secondary hover:bg-editor-panel-bg'
                                    }
                                `}
                            >
                                <div className="flex items-start justify-between mb-1.5">
                                    <IconComponent size={16} className={isSelected ? 'text-white' : 'text-editor-text-secondary group-hover:text-editor-accent'} />
                                    {model.badge && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-editor-accent/10 text-editor-accent'
                                            }`}>
                                            {model.badge}
                                        </span>
                                    )}
                                </div>
                                <div className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-editor-text-primary'}`}>
                                    {model.label.replace('Quimera ', '')}
                                </div>
                                {isSelected && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                                        <Check size={12} className="text-editor-accent" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            {/* Main Content Area */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden md:max-h-[765px]">
                {/* Left Panel - Controls */}
                <div className="w-full md:w-[320px] lg:w-[380px] flex-shrink-0 border-b md:border-b-0 md:border-r border-editor-border overflow-y-auto">
                    <div className="p-4 md:p-5 space-y-4 md:space-y-5">
                        {/* Prompt Section */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-bold text-editor-text-primary">
                                    {t('editor.prompt', { defaultValue: 'Prompt' })}
                                </label>
                                <button
                                    onClick={handleEnhancePrompt}
                                    disabled={isEnhancing || !prompt}
                                    className="flex items-center gap-1.5 text-xs font-medium text-editor-accent hover:text-editor-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isEnhancing ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                        <Wand2 size={12} />
                                    )}
                                    {t('editor.enhance', { defaultValue: 'Mejorar' })}
                                </button>
                            </div>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={t('editor.describeImage', { defaultValue: 'Describe the image you want to create...' })}
                                className="w-full h-28 bg-editor-panel-bg border border-editor-border rounded-xl p-3 text-sm text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:ring-2 focus:ring-editor-accent focus:border-transparent outline-none resize-none transition-all"
                            />
                        </div>

                        {/* Negative Prompt - Collapsible */}
                        <div className="bg-editor-panel-bg/50 rounded-xl p-3 border border-editor-border/50">
                            <label className="flex items-center gap-2 text-xs font-medium text-editor-text-secondary mb-2">
                                <X size={12} className="text-red-400" />
                                {t('editor.negativePrompt', { defaultValue: 'Negative Prompt' })}
                            </label>
                            <input
                                type="text"
                                value={negativePrompt}
                                onChange={(e) => setNegativePrompt(e.target.value)}
                                placeholder={t('editor.negativePromptPlaceholder', { defaultValue: 'Avoid: blurry, low quality...' })}
                                className="w-full bg-editor-bg border border-editor-border rounded-lg px-3 py-2 text-xs text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:ring-1 focus:ring-editor-accent focus:border-transparent outline-none"
                            />
                        </div>

                        {/* Reference Images */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wide">
                                    {t('editor.referenceImages', { defaultValue: 'Reference Images' })}
                                </label>
                                <span className="text-xs text-editor-text-secondary bg-editor-panel-bg px-2 py-0.5 rounded-full">
                                    {referenceImages.length}/14
                                </span>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                multiple
                                onChange={handleReferenceImageUpload}
                                className="hidden"
                            />
                            <div
                                className={`
                                    border-2 border-dashed rounded-xl p-3 transition-all cursor-pointer
                                    ${isDragging
                                        ? 'border-editor-accent bg-editor-accent/10'
                                        : 'border-editor-border hover:border-editor-text-secondary hover:bg-editor-panel-bg/50'
                                    }
                                `}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {referenceImages.length > 0 ? (
                                    <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                                        {referenceImages.map((img, idx) => (
                                            <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden group border border-editor-border">
                                                <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => handleRemoveReferenceImage(idx)}
                                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                >
                                                    <X size={14} className="text-white" />
                                                </button>
                                            </div>
                                        ))}
                                        {referenceImages.length < 14 && (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                                className="w-14 h-14 flex items-center justify-center border border-dashed border-editor-border rounded-lg hover:border-editor-accent hover:bg-editor-panel-bg text-editor-text-secondary hover:text-editor-accent transition-all"
                                            >
                                                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-3 text-editor-text-secondary">
                                        {isUploading ? (
                                            <Loader2 size={20} className="animate-spin text-editor-accent mb-2" />
                                        ) : (
                                            <Upload size={20} className="mb-2" />
                                        )}
                                        <span className="text-xs font-medium">{t('editor.clickOrDrag', { defaultValue: 'Click or drag images' })}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Settings Row */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Aspect Ratio */}
                            <div>
                                <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wide mb-2">
                                    {t('editor.aspectRatio', { defaultValue: 'Aspect Ratio' })}
                                </label>
                                <div className="flex flex-wrap gap-1">
                                    {ASPECT_RATIOS.map(ratio => (
                                        <button
                                            key={ratio.value}
                                            onClick={() => setAspectRatio(ratio.value)}
                                            className={`
                                                px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                                                ${aspectRatio === ratio.value
                                                    ? 'bg-editor-accent text-editor-bg'
                                                    : 'bg-editor-panel-bg text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border'
                                                }
                                            `}
                                        >
                                            {ratio.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Resolution */}
                            <div>
                                <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wide mb-2">
                                    {t('editor.resolution', { defaultValue: 'Resolution' })}
                                </label>
                                <div className="flex gap-1">
                                    {RESOLUTIONS.map(res => (
                                        <button
                                            key={res.value}
                                            onClick={() => setResolution(res.value as '1K' | '2K' | '4K')}
                                            className={`
                                                flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                                                ${resolution === res.value
                                                    ? 'bg-editor-accent text-editor-bg'
                                                    : 'bg-editor-panel-bg text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border'
                                                }
                                            `}
                                        >
                                            {res.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 4K Warning */}
                        {resolution === '4K' && (
                            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-amber-400">
                                    {t('editor.warning4K', { defaultValue: '4K generation takes longer and uses more resources.' })}
                                </p>
                            </div>
                        )}

                        {/* Style Selector */}
                        <div>
                            <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wide mb-2">
                                {t('editor.style', { defaultValue: 'Style' })}
                            </label>
                            <div className="relative">
                                <select
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                    className="w-full appearance-none bg-editor-panel-bg border border-editor-border rounded-xl px-3 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent focus:border-transparent cursor-pointer"
                                >
                                    {STYLES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-editor-text-secondary pointer-events-none" />
                            </div>
                        </div>

                        {/* Advanced Settings Toggle */}
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-between p-3 bg-editor-panel-bg/50 rounded-xl border border-editor-border/50 hover:border-editor-border transition-colors group"
                        >
                            <div className="flex items-center gap-2">
                                <Settings2 size={14} className="text-editor-text-secondary group-hover:text-editor-accent transition-colors" />
                                <span className="text-xs font-bold text-editor-text-secondary uppercase tracking-wide">
                                    {t('editor.advancedControls', { defaultValue: 'Advanced Settings' })}
                                </span>
                            </div>
                            <ChevronDown
                                size={16}
                                className={`text-editor-text-secondary transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {/* Advanced Controls */}
                        {showAdvanced && (
                            <div className="space-y-4 p-4 bg-editor-panel-bg/30 rounded-xl border border-editor-border/50">
                                {/* Vision Pro Controls */}
                                {isVisionPro && (
                                    <div className="space-y-4 pb-4 border-b border-editor-border/50">
                                        <div className="flex items-center gap-2 text-editor-accent">
                                            <Eye size={14} />
                                            <span className="text-xs font-bold uppercase">Vision Pro Controls</span>
                                        </div>

                                        {/* Thinking Level */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Brain size={12} className="text-editor-text-secondary" />
                                                <label className="text-xs text-editor-text-secondary">
                                                    {t('editor.thinkingLevel', { defaultValue: 'Thinking' })}
                                                </label>
                                            </div>
                                            <div className="flex gap-1">
                                                {THINKING_LEVELS.map(level => (
                                                    <button
                                                        key={level.value}
                                                        onClick={() => setThinkingLevel(level.value)}
                                                        className={`
                                                            flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                                                            ${thinkingLevel === level.value
                                                                ? 'bg-editor-accent text-editor-bg'
                                                                : 'bg-editor-bg text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border'
                                                            }
                                                        `}
                                                    >
                                                        {level.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Person Generation */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Users size={12} className="text-editor-text-secondary" />
                                                <label className="text-xs text-editor-text-secondary">
                                                    {t('editor.personGeneration', { defaultValue: 'People' })}
                                                </label>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setPersonGeneration('allow_adult')}
                                                    className={`
                                                        flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                                                        ${personGeneration === 'allow_adult'
                                                            ? 'bg-editor-accent text-editor-bg'
                                                            : 'bg-editor-bg text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border'
                                                        }
                                                    `}
                                                >
                                                    {t('editor.allowAdults', { defaultValue: 'Allow' })}
                                                </button>
                                                <button
                                                    onClick={() => setPersonGeneration('dont_allow')}
                                                    className={`
                                                        flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                                                        ${personGeneration === 'dont_allow'
                                                            ? 'bg-editor-accent text-editor-bg'
                                                            : 'bg-editor-bg text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border'
                                                        }
                                                    `}
                                                >
                                                    {t('editor.dontAllow', { defaultValue: "Don't Allow" })}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Temperature */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Thermometer size={12} className="text-editor-text-secondary" />
                                                    <label className="text-xs text-editor-text-secondary">
                                                        {t('editor.temperature', { defaultValue: 'Creativity' })}
                                                    </label>
                                                </div>
                                                <span className="text-xs text-editor-accent font-mono font-bold">{temperature.toFixed(1)}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="2"
                                                step="0.1"
                                                value={temperature}
                                                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                                className="w-full h-1.5 bg-editor-border rounded-full appearance-none cursor-pointer accent-editor-accent"
                                            />
                                            <div className="flex justify-between text-[10px] text-editor-text-secondary/60 mt-1">
                                                <span>{t('editor.precise', { defaultValue: 'Precise' })}</span>
                                                <span>{t('editor.creative', { defaultValue: 'Creative' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Visual Controls */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-editor-text-secondary">
                                        <Palette size={14} />
                                        <span className="text-xs font-bold uppercase">Visual Controls</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs text-editor-text-secondary mb-1.5">
                                                <Sun size={11} /> {t('editor.lighting', { defaultValue: 'Lighting' })}
                                            </label>
                                            <select
                                                value={lighting}
                                                onChange={(e) => setLighting(e.target.value)}
                                                className="w-full appearance-none bg-editor-bg border border-editor-border rounded-lg px-2.5 py-1.5 text-xs text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                            >
                                                {LIGHTING_OPTIONS.map(l => (
                                                    <option key={l.value} value={l.value}>{l.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs text-editor-text-secondary mb-1.5">
                                                <Camera size={11} /> {t('editor.cameraAngle', { defaultValue: 'Camera' })}
                                            </label>
                                            <select
                                                value={cameraAngle}
                                                onChange={(e) => setCameraAngle(e.target.value)}
                                                className="w-full appearance-none bg-editor-bg border border-editor-border rounded-lg px-2.5 py-1.5 text-xs text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                            >
                                                {CAMERA_ANGLES.map(c => (
                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs text-editor-text-secondary mb-1.5">
                                                <Palette size={11} /> {t('editor.colorGrading', { defaultValue: 'Colors' })}
                                            </label>
                                            <select
                                                value={colorGrading}
                                                onChange={(e) => setColorGrading(e.target.value)}
                                                className="w-full appearance-none bg-editor-bg border border-editor-border rounded-lg px-2.5 py-1.5 text-xs text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                            >
                                                {COLOR_GRADING.map(c => (
                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs text-editor-text-secondary mb-1.5">
                                                <Eye size={11} /> {t('editor.depthOfField', { defaultValue: 'Depth' })}
                                            </label>
                                            <select
                                                value={depthOfField}
                                                onChange={(e) => setDepthOfField(e.target.value)}
                                                className="w-full appearance-none bg-editor-bg border border-editor-border rounded-lg px-2.5 py-1.5 text-xs text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                            >
                                                {DEPTH_OF_FIELD.map(d => (
                                                    <option key={d.value} value={d.value}>{d.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt}
                            className={`
                                w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200
                                flex items-center justify-center gap-2 shadow-lg
                                ${isGenerating || !prompt
                                    ? 'bg-editor-border text-editor-text-secondary cursor-not-allowed'
                                    : `bg-gradient-to-r ${currentModel.color} text-white hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`
                                }
                            `}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    {t('editor.dreaming', { defaultValue: 'Creating...' })}
                                </>
                            ) : (
                                <>
                                    <Zap size={18} />
                                    {t('editor.generateImage', { defaultValue: 'Generate Image' })}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right Panel - Preview */}

                <div className="flex-1 min-w-0 flex flex-col p-5 bg-gradient-to-br from-editor-bg to-editor-panel-bg/30">
                    {/* Preview Area */}
                    <div className="flex-1 min-h-0 flex items-center justify-center bg-black/30 rounded-2xl border border-editor-border overflow-hidden backdrop-blur-sm">
                        {isGenerating ? (
                            <div className="text-center p-8">
                                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${currentModel.color} p-1 mx-auto mb-5`}>
                                    <div className="w-full h-full bg-editor-bg rounded-full flex items-center justify-center">
                                        <Loader2 size={32} className="animate-spin text-editor-accent" />
                                    </div>
                                </div>
                                <p className="text-lg font-semibold text-editor-text-primary mb-1">
                                    {t('editor.creatingInResolution', { resolution, defaultValue: `Creating in ${resolution}...` })}
                                </p>
                                <p className="text-sm text-editor-text-secondary">
                                    {t('editor.poweredByQuimera', { defaultValue: 'Powered by Quimera AI' })}
                                </p>
                            </div>
                        ) : generatedImage ? (
                            <div
                                className="w-full h-full flex items-center justify-center relative cursor-pointer group"
                                onClick={() => setShowImageDetail(true)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && setShowImageDetail(true)}
                            >
                                <img
                                    src={generatedImage}
                                    alt="Generated"
                                    className="max-w-full max-h-full object-contain transition-transform group-hover:scale-[1.02]"
                                />
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                                    <div className="bg-white/95 text-gray-800 px-5 py-2.5 rounded-full text-sm font-semibold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
                                        <Eye size={16} />
                                        {t('editor.clickToViewDetails', { defaultValue: 'View Details' })}
                                    </div>
                                </div>
                                {/* Info button always visible */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowImageDetail(true);
                                    }}
                                    className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors z-10"
                                    title={t('editor.viewDetails', { defaultValue: 'View details' })}
                                >
                                    <Eye size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="text-center p-8">
                                <div className="w-20 h-20 rounded-full bg-editor-panel-bg border border-editor-border flex items-center justify-center mx-auto mb-5">
                                    <ImageIcon size={32} className="text-editor-text-secondary/50" />
                                </div>
                                <p className="text-sm text-editor-text-secondary">
                                    {t('editor.enterPrompt', { defaultValue: 'Enter a prompt to generate an image' })}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {generatedImage && (
                        <div className="flex-shrink-0 flex items-center justify-between mt-4 pt-4 border-t border-editor-border/50">
                            <div className="flex items-center gap-2">
                                {isSaving ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin text-editor-accent" />
                                        <span className="text-xs font-medium text-editor-text-secondary">
                                            {t('editor.savingToLibrary', { defaultValue: 'Saving to library...' })}
                                        </span>
                                    </>
                                ) : savedToLibrary ? (
                                    <>
                                        <CheckCircle2 size={14} className="text-green-500" />
                                        <span className="text-xs font-medium text-green-500">
                                            {destination === 'global'
                                                ? t('editor.savedToGlobalLibrary', { defaultValue: 'Saved to global library' })
                                                : t('editor.savedToLibrary', { defaultValue: 'Saved to library' })
                                            }
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle size={14} className="text-amber-500" />
                                        <span className="text-xs font-medium text-amber-500">
                                            {t('editor.notSaved', { defaultValue: 'Not saved (no active project)' })}
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {onUseImage && (
                                    <button
                                        onClick={() => {
                                            onUseImage(savedImageUrl || generatedImage);
                                        }}
                                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-xs font-bold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        <Check size={14} />
                                        {t('editor.useThisImage', { defaultValue: 'Use this image' })}
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (referenceImages.length >= 14) return;
                                        // Use the base64 data URL directly for reference
                                        if (generatedImage) {
                                            setReferenceImages(prev => [...prev, generatedImage]);
                                        }
                                    }}
                                    disabled={referenceImages.length >= 14}
                                    className="flex items-center gap-2 px-4 py-2 bg-editor-panel-bg border border-editor-border rounded-lg text-xs font-medium text-editor-text-primary hover:bg-editor-border transition-colors disabled:opacity-50"
                                >
                                    <ImageIcon size={14} />
                                    {t('editor.useAsReference', { defaultValue: 'Use as Reference' })}
                                </button>
                                <a
                                    href={savedImageUrl || generatedImage}
                                    download={`quimera-${Date.now()}.png`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-editor-panel-bg border border-editor-border rounded-lg text-xs font-medium text-editor-text-primary hover:bg-editor-border transition-colors"
                                >
                                    <Download size={14} />
                                    {t('editor.download', { defaultValue: 'Download' })}
                                </a>
                                <button
                                    onClick={handleReset}
                                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r ${currentModel.color} hover:shadow-lg transition-all`}
                                >
                                    <Plus size={14} />
                                    {t('editor.generateAnother', { defaultValue: 'New' })}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Image Detail Modal */}
            {showImageDetail && generatedImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setShowImageDetail(false)}
                >
                    <div
                        className="bg-editor-bg border border-editor-border rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col lg:flex-row animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Image Preview */}
                        <div className="flex-1 min-h-[300px] lg:min-h-0 bg-black/50 flex items-center justify-center p-4">
                            <img
                                src={generatedImage}
                                alt="Generated"
                                className="max-w-full max-h-[60vh] lg:max-h-[80vh] object-contain rounded-lg shadow-xl"
                            />
                        </div>

                        {/* Details Panel */}
                        <div className="w-full lg:w-[380px] flex-shrink-0 border-t lg:border-t-0 lg:border-l border-editor-border bg-editor-panel-bg/50 overflow-y-auto">
                            {/* Header */}
                            <div className="p-4 border-b border-editor-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={18} className="text-editor-accent" />
                                    <h3 className="font-bold text-editor-text-primary">
                                        {t('editor.imageDetails', { defaultValue: 'Image Details' })}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowImageDetail(false)}
                                    className="p-1.5 rounded-lg hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-5">
                                {/* Prompt Used */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-editor-text-secondary uppercase tracking-wide mb-2">
                                        <Wand2 size={12} />
                                        {t('editor.promptUsed', { defaultValue: 'Prompt Used' })}
                                    </label>
                                    <div className="bg-editor-bg border border-editor-border rounded-xl p-3">
                                        <p className="text-sm text-editor-text-primary leading-relaxed">
                                            {generatedPrompt || prompt}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedPrompt || prompt);
                                        }}
                                        className="mt-2 text-xs text-editor-accent hover:text-editor-accent-hover transition-colors"
                                    >
                                        {t('editor.copyPrompt', { defaultValue: 'Copy prompt' })}
                                    </button>
                                </div>

                                {/* Negative Prompt */}
                                {generatedOptions?.negativePrompt && (
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-bold text-editor-text-secondary uppercase tracking-wide mb-2">
                                            <X size={12} className="text-red-400" />
                                            {t('editor.negativePrompt', { defaultValue: 'Negative Prompt' })}
                                        </label>
                                        <div className="bg-editor-bg border border-editor-border rounded-xl p-3">
                                            <p className="text-sm text-editor-text-secondary">
                                                {generatedOptions.negativePrompt}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Generation Settings */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-editor-text-secondary uppercase tracking-wide mb-3">
                                        <Settings2 size={12} />
                                        {t('editor.generationSettings', { defaultValue: 'Generation Settings' })}
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Model */}
                                        <div className="bg-editor-bg border border-editor-border rounded-xl p-3">
                                            <span className="text-[10px] text-editor-text-secondary uppercase tracking-wide">
                                                {t('editor.model', { defaultValue: 'Model' })}
                                            </span>
                                            <p className="text-sm font-medium text-editor-text-primary mt-0.5">
                                                {MODELS.find(m => m.value === generatedOptions?.model)?.label || 'Unknown'}
                                            </p>
                                        </div>

                                        {/* Aspect Ratio */}
                                        <div className="bg-editor-bg border border-editor-border rounded-xl p-3">
                                            <span className="text-[10px] text-editor-text-secondary uppercase tracking-wide">
                                                {t('editor.aspectRatio', { defaultValue: 'Aspect Ratio' })}
                                            </span>
                                            <p className="text-sm font-medium text-editor-text-primary mt-0.5">
                                                {generatedOptions?.aspectRatio || aspectRatio}
                                            </p>
                                        </div>

                                        {/* Resolution */}
                                        <div className="bg-editor-bg border border-editor-border rounded-xl p-3">
                                            <span className="text-[10px] text-editor-text-secondary uppercase tracking-wide">
                                                {t('editor.resolution', { defaultValue: 'Resolution' })}
                                            </span>
                                            <p className="text-sm font-medium text-editor-text-primary mt-0.5">
                                                {generatedOptions?.resolution || resolution}
                                            </p>
                                        </div>

                                        {/* Style */}
                                        <div className="bg-editor-bg border border-editor-border rounded-xl p-3">
                                            <span className="text-[10px] text-editor-text-secondary uppercase tracking-wide">
                                                {t('editor.style', { defaultValue: 'Style' })}
                                            </span>
                                            <p className="text-sm font-medium text-editor-text-primary mt-0.5">
                                                {generatedOptions?.style || style || 'None'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Save Status */}
                                <div className="pt-3 border-t border-editor-border">
                                    <div className="flex items-center gap-2 mb-4">
                                        {savedToLibrary ? (
                                            <>
                                                <CheckCircle2 size={16} className="text-green-500" />
                                                <span className="text-sm font-medium text-green-500">
                                                    {destination === 'global'
                                                        ? t('editor.savedToGlobalLibrary', { defaultValue: 'Saved to global library' })
                                                        : t('editor.savedToLibrary', { defaultValue: 'Saved to project library' })
                                                    }
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle size={16} className="text-amber-500" />
                                                <span className="text-sm font-medium text-amber-500">
                                                    {t('editor.notSaved', { defaultValue: 'Not saved' })}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2">
                                        {onUseImage && (
                                            <button
                                                onClick={() => {
                                                    onUseImage(savedImageUrl || generatedImage);
                                                    setShowImageDetail(false);
                                                }}
                                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all"
                                            >
                                                <Check size={16} />
                                                {t('editor.useThisImage', { defaultValue: 'Use this image' })}
                                            </button>
                                        )}
                                        <a
                                            href={savedImageUrl || generatedImage}
                                            download={`quimera-${Date.now()}.png`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-editor-accent text-editor-bg rounded-xl text-sm font-bold hover:bg-editor-accent-hover transition-colors"
                                        >
                                            <Download size={16} />
                                            {t('editor.downloadImage', { defaultValue: 'Download Image' })}
                                        </a>
                                        <button
                                            onClick={() => {
                                                if (referenceImages.length < 14 && generatedImage) {
                                                    setReferenceImages(prev => [...prev, generatedImage]);
                                                    setShowImageDetail(false);
                                                }
                                            }}
                                            disabled={referenceImages.length >= 14}
                                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-editor-panel-bg border border-editor-border rounded-xl text-sm font-medium text-editor-text-primary hover:bg-editor-border transition-colors disabled:opacity-50"
                                        >
                                            <ImageIcon size={16} />
                                            {t('editor.useAsReference', { defaultValue: 'Use as Reference' })}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageGeneratorPanel;
