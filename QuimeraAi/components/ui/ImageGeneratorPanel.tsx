import React, { useState, useRef } from 'react';
import { useAI } from '../../contexts/ai';
import { useFiles } from '../../contexts/files';
import { useTranslation } from 'react-i18next';
import {
    Zap, Loader2, Wand2, X, Download, Upload, Image as ImageIcon, Plus,
    AlertTriangle, Sparkles, Brain, Users, Thermometer, Eye,
    ChevronDown, Settings2, Palette, Camera, Sun, Check, CheckCircle2,
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
    projectId?: string;
    /** Generation context hint. 'background' optimizes defaults and prompt for website section backgrounds. */
    generationContext?: 'background' | 'general';
}

const ImageGeneratorPanel: React.FC<ImageGeneratorPanelProps> = ({ destination, className = '', onClose, onCollapse, hidePreview = false, onImageGenerated, onUseImage, projectId, generationContext = 'general' }) => {
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

    // Quimera AI Model - Nano Banana 2 (gemini-3.1-flash-image-preview)
    const DEFAULT_MODEL = {
        id: 'nano-banana-2',
        label: 'Quimera Nano Banana 2',
        value: 'gemini-3.1-flash-image-preview',
        icon: Zap,
        badge: 'NEW',
        color: 'from-yellow-400 to-amber-600'
    };

    const THINKING_LEVELS = [
        { label: t('editor.none', { defaultValue: 'None' }), value: 'none' },
        { label: t('editor.low', { defaultValue: 'Low' }), value: 'low' },
        { label: t('editor.medium', { defaultValue: 'Medium' }), value: 'medium' },
        { label: t('editor.high', { defaultValue: 'High' }), value: 'high' },
    ];

    // State
    const [prompt, setPrompt] = useState('');
    const selectedModel = 'gemini-3.1-flash-image-preview';
    const [thinkingLevel, setThinkingLevel] = useState('high');
    const [personGeneration, setPersonGeneration] = useState('allow_adult');
    const [temperature, setTemperature] = useState(1.0);
    const [negativePrompt, setNegativePrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState(generationContext === 'background' ? '16:9' : '1:1');
    const [style, setStyle] = useState(generationContext === 'background' ? 'Photorealistic' : 'None');
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
                projectId,
                generationContext,
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

            // Save the generated image to the project library (Firebase Storage + Firestore)
            // useAI().generateImage only returns a base64 data URL, it does NOT persist
            const savedUrl = await saveToLibrary(imageDataUrl, prompt);

            // Call callback with saved URL (Firebase Storage) or fallback to data URL
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

    const currentModel = DEFAULT_MODEL;
    const isVisionPro = true;

    return (
        <div className={`bg-[#2D1854] text-[#FAFAFA] font-sans flex flex-col h-full overflow-hidden ${className}`}>
            <style>{`
            .vector-bg-container { background-color: hsl(272, 45%, 14%); background-image: radial-gradient(circle at 50% 50%, hsl(272, 45%, 18%) 0%, hsl(272, 45%, 10%) 100%); position: relative; }
            .vector-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px); background-size: 40px 40px; mask-image: radial-gradient(circle at center, black 40%, transparent 100%); }
            .vector-glow-points { position: absolute; inset: 0; background-image: radial-gradient(circle at center, rgba(147, 51, 234, 0.15) 0%, transparent 50%); }
            .vector-lines { position: absolute; inset: 0; background: linear-gradient(135deg, transparent 49.5%, rgba(255, 255, 255, 0.02) 49.5%, rgba(255, 255, 255, 0.02) 50.5%, transparent 50.5%); background-size: 100px 100px; mask-image: radial-gradient(circle at center, black 60%, transparent 100%); }
            input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #F2B90D; cursor: pointer; margin-top: -6px; }
            `}</style>

            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 bg-[#2D1854]/80 backdrop-blur-md px-6 py-3 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="w-6 h-6 text-[#F2B90D] flex items-center justify-center">
                        <Wand2 size={24} />
                    </div>
                    <h2 className="text-[#FAFAFA] text-lg font-bold leading-tight tracking-[-0.015em]">
                        {t('editor.quimeraImageGenerator', { defaultValue: 'Image Generator' })}
                    </h2>
                    {generationContext === 'background' && (
                        <span className="flex items-center gap-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full text-xs font-medium">
                            <ImageIcon size={12} />
                            {t('editor.generatingForBackground', { defaultValue: 'Generating for: Background' })}
                        </span>
                    )}
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center rounded-lg w-10 h-10 hover:bg-[#3A2460] text-white/60 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}
            </header>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Main Content Area */}
                <main className="hidden md:flex flex-1 flex-col relative bg-[#1A0D35] overflow-hidden">
                    <div className="flex-1 flex flex-col relative w-full h-full vector-bg-container overflow-y-auto">
                        <div className="vector-grid pointer-events-none"></div>
                        <div className="vector-lines pointer-events-none"></div>
                        <div className="vector-glow-points pointer-events-none"></div>

                        <div className="w-full h-full flex items-center justify-center p-4 md:p-8 lg:p-12 min-h-[300px] md:min-h-[600px] relative z-10">
                            <div className="relative w-full max-w-4xl aspect-video bg-black/20 shadow-2xl flex flex-col rounded-xl overflow-hidden border border-white/5">
                                {isGenerating ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center">
                                        <Loader2 size={48} className="animate-spin text-[#F2B90D] mb-4" />
                                        <p className="text-white/70 font-medium tracking-wide">
                                            {t('editor.creatingInResolution', { resolution, defaultValue: `Creating in ${resolution}...` })}
                                        </p>
                                    </div>
                                ) : generatedImage ? (
                                    <>
                                        <div className="absolute top-4 left-0 w-full flex items-center justify-center gap-4 z-20">
                                            {onUseImage && (
                                                <button
                                                    onClick={() => onUseImage(savedImageUrl || generatedImage)}
                                                    className="flex items-center gap-2 bg-[#F2B90D] hover:bg-[#D9A60C] text-[#2D1854] px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-[#F2B90D]/20 transition-all hover:-translate-y-0.5"
                                                >
                                                    <Check size={20} />
                                                    <span>{t('editor.useThisImage', { defaultValue: 'Use in Project' })}</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (referenceImages.length < 14) {
                                                        setReferenceImages(prev => [...prev, generatedImage]);
                                                    }
                                                }}
                                                disabled={referenceImages.length >= 14}
                                                className="flex items-center gap-2 bg-[#3A2460] hover:bg-[#4C3575] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50"
                                            >
                                                <ImageIcon size={20} />
                                                <span>{t('editor.useAsReference', { defaultValue: 'Use as Reference' })}</span>
                                            </button>
                                        </div>
                                        <div className="w-full h-full relative group cursor-pointer" onClick={() => setShowImageDetail(true)}>
                                            <img alt="Generated result" className="w-full h-full object-contain" src={generatedImage} />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#2D1854]/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-white/80 text-sm font-medium">Prompt: {prompt.substring(0, 50)}...</p>
                                                        <p className="text-white/50 text-xs">Model: Quimera Nano Banana 2 • Res: {resolution}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <a
                                                            href={savedImageUrl || generatedImage}
                                                            download={`quimera-${Date.now()}.png`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors backdrop-blur-sm"
                                                            title="Download"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Download size={20} />
                                                        </a>
                                                        <button
                                                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors backdrop-blur-sm"
                                                            title="Expand"
                                                        >
                                                            <Eye size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
                                        <div className="w-24 h-24 rounded-3xl border border-white/5 bg-white/[0.02] flex items-center justify-center mb-6">
                                            <ImageIcon size={48} className="text-slate-600" />
                                        </div>
                                        <h3 className="text-2xl font-medium text-white tracking-tight mb-2">Ready to generate</h3>
                                        <p className="text-slate-500 text-sm max-w-sm text-center">
                                            Enter a prompt below and adjust settings in the sidebar to create your image.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Prompt Bar */}
                    <div className="w-full p-6 bg-[#2D1854]/60 backdrop-blur-xl border-t border-white/10 shrink-0 z-30">
                        <div className="max-w-4xl mx-auto w-full">
                            <div className="flex w-full items-stretch rounded-xl bg-[#3A2460] border border-white/5 transition-all relative">
                                <div className="pl-4 flex items-center justify-center text-[#F2B90D]">
                                    <Sparkles size={24} className={isGenerating ? 'animate-pulse' : ''} />
                                </div>
                                <input
                                    className="flex-1 bg-transparent border-none text-[#FAFAFA] placeholder:text-white/30 px-4 py-4 focus:ring-0 text-base font-medium"
                                    placeholder={t('editor.describeImage', { defaultValue: 'Describe your image...' })}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
                                />
                                <div className="flex items-center pr-2 gap-3 pl-2 border-l border-white/10 my-2">
                                    <button
                                        onClick={handleEnhancePrompt}
                                        disabled={isEnhancing || !prompt}
                                        className="p-2 text-[#F2B90D] bg-transparent transition-colors hover:text-[#D9A60C] relative flex items-center justify-center disabled:opacity-50"
                                        title={t('editor.enhance', { defaultValue: 'Enhance Prompt' })}
                                    >
                                        {isEnhancing ? <Loader2 size={24} className="animate-spin" /> : <Wand2 size={24} />}
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating || !prompt}
                                        className="hidden sm:flex items-center justify-center gap-2 bg-[#F2B90D] hover:bg-[#D9A60C] text-[#2D1854] px-6 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed w-[120px]"
                                    >
                                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <><span>Generate</span><Zap size={16} /></>}
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !prompt}
                                className="sm:hidden mt-3 w-full flex items-center justify-center gap-2 bg-[#F2B90D] hover:bg-[#D9A60C] text-[#2D1854] px-6 py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
                            >
                                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <><span>Generate</span><Zap size={16} /></>}
                            </button>
                        </div>
                    </div>
                </main>

                {/* Sidebar Configuration */}
                {/* Mobile-only generated image preview */}
                {generatedImage && (
                    <div className="md:hidden w-full bg-[#1A0D35] p-4 border-b border-white/10 shrink-0">
                        <div className="relative w-full aspect-video bg-black/20 shadow-lg rounded-xl overflow-hidden border border-white/5">
                            <img alt="Generated result" className="w-full h-full object-contain" src={generatedImage} />
                            <div className="absolute top-2 left-0 w-full flex items-center justify-center gap-2 z-20">
                                {onUseImage && (
                                    <button
                                        onClick={() => onUseImage(savedImageUrl || generatedImage)}
                                        className="flex items-center gap-1.5 bg-[#F2B90D] hover:bg-[#D9A60C] text-[#2D1854] px-3 py-1.5 rounded-lg font-bold text-xs shadow-lg shadow-[#F2B90D]/20 transition-all"
                                    >
                                        <Check size={14} />
                                        <span>{t('editor.useThisImage', { defaultValue: 'Use in Project' })}</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (referenceImages.length < 14) {
                                            setReferenceImages(prev => [...prev, generatedImage]);
                                        }
                                    }}
                                    disabled={referenceImages.length >= 14}
                                    className="flex items-center gap-1.5 bg-[#3A2460] hover:bg-[#4C3575] text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-lg transition-all disabled:opacity-50"
                                >
                                    <ImageIcon size={14} />
                                    <span>{t('editor.useAsReference', { defaultValue: 'Reference' })}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/10 bg-[#3A2460] flex flex-col shrink-0 overflow-hidden relative z-40 flex-1 md:flex-none">
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <h3 className="text-[#FAFAFA] font-bold text-sm uppercase tracking-wider">Configuration</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                        {/* Reference Images */}
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wide">Reference Image</label>
                                    <span className="text-xs text-white/50">{referenceImages.length}/14</span>
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
                                    className={`w-full border-2 border-dashed rounded-xl transition-colors cursor-pointer group p-6 flex flex-col items-center justify-center gap-3 ${isDragging ? 'border-[#F2B90D] bg-[#F2B90D]/10' : 'border-white/10 hover:border-[#F2B90D]/50 bg-[#2D1854]/30'}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {isUploading ? (
                                        <Loader2 size={32} className="animate-spin text-[#F2B90D]" />
                                    ) : (
                                        <>
                                            <div className="size-10 rounded-full bg-white/5 group-hover:bg-[#F2B90D]/10 flex items-center justify-center transition-colors">
                                                <Upload size={20} className="text-white/30 group-hover:text-[#F2B90D] transition-colors" />
                                            </div>
                                            <span className="text-xs font-medium text-white/40 group-hover:text-[#F2B90D] transition-colors text-center">Upload Reference Image</span>
                                        </>
                                    )}
                                </div>

                                {referenceImages.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {referenceImages.map((img, idx) => (
                                            <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden group border border-white/10">
                                                <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveReferenceImage(idx); }}
                                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                >
                                                    <X size={14} className="text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Aspect Ratio */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wide">Aspect Ratio</label>
                                <span className="text-xs text-[#F2B90D] font-mono font-bold">{aspectRatio}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {ASPECT_RATIOS.slice(0, 6).map(ratio => (
                                    <button
                                        key={ratio.value}
                                        onClick={() => setAspectRatio(ratio.value)}
                                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-lg border transition-all ${aspectRatio === ratio.value ? 'border-[#F2B90D] bg-[#F2B90D]/10 text-[#F2B90D]' : 'border-white/10 hover:bg-[#2D1854] text-white/40 hover:text-[#F2B90D]'}`}
                                    >
                                        <span className="text-sm font-bold">{ratio.value}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Resolution */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wide">Resolution</label>
                                <span className="text-xs text-[#F2B90D] font-mono font-bold">{resolution}</span>
                            </div>
                            <div className="flex gap-2">
                                {RESOLUTIONS.map(res => (
                                    <button
                                        key={res.value}
                                        onClick={() => setResolution(res.value as '1K' | '2K' | '4K')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${resolution === res.value ? 'border-[#F2B90D] bg-[#F2B90D]/10 text-[#F2B90D]' : 'border-white/10 hover:bg-[#2D1854] text-white/40 hover:text-[#FAFAFA]'}`}
                                    >
                                        {res.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Style Presets */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wide">Style</label>
                            </div>
                            <div className="relative">
                                <select
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                    className="w-full bg-[#2D1854]/80 border border-white/10 rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-[#F2B90D]/50 focus:border-[#F2B90D]/50 outline-none appearance-none cursor-pointer text-white"
                                >
                                    {STYLES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
                            </div>
                        </div>

                        {/* Advanced Collapsible */}
                        <div className="pt-2 border-t border-white/10">
                            <details className="group">
                                <summary className="flex items-center justify-between cursor-pointer list-none text-[#FAFAFA] font-medium text-sm py-2">
                                    <span className="flex items-center gap-2"><Settings2 size={16} /> Advanced Settings</span>
                                    <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
                                </summary>
                                <div className="pt-4 space-y-5">
                                    {/* Nano Banana 2 Thinking Level */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-white/50 uppercase tracking-wide">Thinking Level</label>
                                        <div className="flex gap-1">
                                            {THINKING_LEVELS.map(level => (
                                                <button
                                                    key={level.value}
                                                    onClick={() => setThinkingLevel(level.value)}
                                                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border ${thinkingLevel === level.value ? 'bg-[#F2B90D] text-[#2D1854] border-transparent' : 'bg-[#2D1854] text-white/60 border-white/5 hover:text-white'}`}
                                                >
                                                    {level.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Negative Prompt */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-white/50 uppercase tracking-wide">Negative Prompt</label>
                                        <textarea
                                            value={negativePrompt}
                                            onChange={(e) => setNegativePrompt(e.target.value)}
                                            className="w-full bg-[#2D1854] border border-white/10 text-[#FAFAFA] text-xs rounded-lg focus:ring-[#F2B90D] focus:border-[#F2B90D] block p-3 resize-none placeholder:text-white/20"
                                            placeholder="Describe what you want to exclude..."
                                            rows={3}
                                        />
                                    </div>

                                    {/* Lighting */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-white/40 uppercase">Lighting</label>
                                        <div className="relative">
                                            <select
                                                value={lighting}
                                                onChange={(e) => setLighting(e.target.value)}
                                                className="w-full bg-[#2D1854] border border-white/5 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-[#F2B90D] focus:border-[#F2B90D] outline-none appearance-none cursor-pointer text-white/80"
                                            >
                                                {LIGHTING_OPTIONS.map(l => (
                                                    <option key={l.value} value={l.value}>{l.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Camera Angle */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-white/40 uppercase">Camera Angle</label>
                                        <div className="relative">
                                            <select
                                                value={cameraAngle}
                                                onChange={(e) => setCameraAngle(e.target.value)}
                                                className="w-full bg-[#2D1854] border border-white/5 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-[#F2B90D] focus:border-[#F2B90D] outline-none appearance-none cursor-pointer text-white/80"
                                            >
                                                {CAMERA_ANGLES.map(c => (
                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                                        </div>
                                    </div>

                                </div>
                            </details>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Mobile-only bottom prompt bar */}
            <div className="md:hidden w-full p-3 bg-[#2D1854]/90 backdrop-blur-xl border-t border-white/10 shrink-0 z-50">
                <div className="flex w-full items-stretch rounded-xl bg-[#3A2460] border border-white/5 transition-all relative">
                    <div className="pl-3 flex items-center justify-center text-[#F2B90D]">
                        <Sparkles size={20} className={isGenerating ? 'animate-pulse' : ''} />
                    </div>
                    <input
                        className="flex-1 bg-transparent border-none text-[#FAFAFA] placeholder:text-white/30 px-3 py-3 focus:ring-0 text-sm font-medium min-w-0"
                        placeholder={t('editor.describeImage', { defaultValue: 'Describe la imagen...' })}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
                    />
                    <div className="flex items-center pr-2 gap-2 pl-2 border-l border-white/10 my-2">
                        <button
                            onClick={handleEnhancePrompt}
                            disabled={isEnhancing || !prompt}
                            className="p-1.5 text-[#F2B90D] bg-transparent transition-colors hover:text-[#D9A60C] flex items-center justify-center disabled:opacity-50"
                            title={t('editor.enhance', { defaultValue: 'Enhance Prompt' })}
                        >
                            {isEnhancing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                        </button>
                    </div>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-[#F2B90D] hover:bg-[#D9A60C] text-[#2D1854] px-6 py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
                >
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <><span>Generate</span><Zap size={16} /></>}
                </button>
            </div>

            {/* Image Details Modal omitted for brevity, logic remains in state, but view might not be needed if it's rendered inline. To keep it functional, we can add a simple wrapper if showImageDetail is true, but the new UI design displays the tools directly on the image hover so we mapped it there. */}

            {showImageDetail && generatedImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setShowImageDetail(false)}
                >
                    <div className="bg-[#2D1854] border border-white/10 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col lg:flex-row relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowImageDetail(false)} className="absolute top-4 right-4 z-50 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"><X size={20} /></button>
                        <div className="flex-1 bg-black/50 flex items-center justify-center p-6 min-h-[400px]">
                            <img src={generatedImage} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-xl" />
                        </div>
                        <div className="w-full lg:w-[380px] p-6 overflow-y-auto bg-[#3A2460]">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Sparkles className="text-[#F2B90D]" /> Details</h3>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs text-white/50 uppercase font-bold tracking-wide mb-2">Prompt</h4>
                                    <p className="text-sm bg-black/20 p-3 rounded-lg border border-white/5">{generatedPrompt || prompt}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs text-white/50 uppercase font-bold tracking-wide mb-2">Settings</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                            <span className="text-[10px] text-white/40 uppercase block">Model</span>
                                            <span className="text-sm font-medium">{generatedOptions?.model || 'Nano Banana 2'}</span>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                            <span className="text-[10px] text-white/40 uppercase block">Ratio</span>
                                            <span className="text-sm font-medium">{generatedOptions?.aspectRatio || aspectRatio}</span>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                            <span className="text-[10px] text-white/40 uppercase block">Resolution</span>
                                            <span className="text-sm font-medium">{generatedOptions?.resolution || resolution}</span>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                            <span className="text-[10px] text-white/40 uppercase block">Style</span>
                                            <span className="text-sm font-medium">{generatedOptions?.style || style}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                                    <a href={savedImageUrl || generatedImage} download={`quimera-${Date.now()}.png`} target="_blank" className="flex items-center justify-center gap-2 w-full py-3 bg-[#F2B90D] text-[#2D1854] rounded-xl text-sm font-bold hover:bg-[#D9A60C] transition-colors">
                                        <Download size={18} /> Download Image
                                    </a>
                                    {onUseImage && (
                                        <button onClick={() => { onUseImage(savedImageUrl || generatedImage); setShowImageDetail(false); }} className="flex items-center justify-center gap-2 w-full py-3 bg-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/20 transition-colors">
                                            <Check size={18} /> Use in Project
                                        </button>
                                    )}
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
