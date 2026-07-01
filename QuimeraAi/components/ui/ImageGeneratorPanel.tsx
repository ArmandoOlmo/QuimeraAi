import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSafeAI } from '../../contexts/ai';
import { useSafeFiles } from '../../contexts/files';
import { useSafeMedia } from '../../contexts/media';
import type { MediaCategory } from '../../types/media';
import type { FileRecord } from '../../types';
import { useProject } from '../../contexts/project';
import { useTranslation } from 'react-i18next';
import {
    Zap, Loader2, Wand2, X, Download, Upload, Image as ImageIcon, Plus,
    AlertTriangle, Sparkles, Brain, Users, Thermometer, Eye,
    ChevronDown, Settings2, Palette, Camera, Sun, Check, CheckCircle2,
    PanelLeftClose, Search, Grid, Square, RectangleHorizontal, RectangleVertical, Monitor
} from 'lucide-react';
import ProgressBar3D from './ProgressBar3D';
import { searchFiles } from '../../utils/fileHelpers';
import { normalizeReferenceImagesForGeneration } from '../../utils/imageReferenceHelpers';
import { useVisualIdentityKit } from '../../hooks/useVisualIdentityKit';
import { IMAGE_REFERENCE_CATEGORY_COLORS } from '../../types/visualIdentity';
import type { ImageReferenceCategory } from '../../types/visualIdentity';
import AddToVisualKitModal from './AddToVisualKitModal';
import AppSelect from './AppSelect';
import { CollapsibleSection, CollapsiblePanelHeader, useCollapsibleSections } from './CollapsibleSection';
import {
    MEDIA_GENERATOR_LAUNCH_EVENT,
    consumeMediaGeneratorLaunchRequest,
    readMediaGeneratorLaunchEvent,
} from '../../utils/mediaGeneratorLaunch';

interface ImageGeneratorPanelProps {
    destination: 'user' | 'global' | 'admin';
    adminCategory?: string;
    className?: string;
    onClose?: () => void;
    onCollapse?: () => void;
    hidePreview?: boolean;
    /** Hide the built-in header (useful when parent provides its own toggle bar) */
    hideHeader?: boolean;
    onImageGenerated?: (imageUrl: string) => void;
    onUseImage?: (imageUrl: string) => void;
    projectId?: string;
    /** Generation context hint. 'background' optimizes defaults and prompt for website section backgrounds. */
    generationContext?: 'background' | 'general';
}

const ImageGeneratorPanel: React.FC<ImageGeneratorPanelProps> = ({ destination = 'user', adminCategory, className = '', onClose, onCollapse, hidePreview = false, hideHeader = false, onImageGenerated, onUseImage, projectId, generationContext = 'general' }) => {
    const ai = useSafeAI();
    const generateImage = ai?.generateImage || (async () => {
        throw new Error('AIProvider is not available yet.');
    });
    const enhancePrompt = ai?.enhancePrompt || (async (draftPrompt: string) => draftPrompt);
    const filesCtx = useSafeFiles();
    const mediaCtx = useSafeMedia();
    const uploadFile = filesCtx?.uploadFile || (async () => { throw new Error("Files context missing"); });
    const uploadGlobalFile = filesCtx?.uploadGlobalFile || (async () => { throw new Error("Files context missing"); });
    const uploadAdminAsset = filesCtx?.uploadAdminAsset || (async () => { throw new Error("Files context missing"); });
    const files = filesCtx?.files || [];
    const globalFiles = filesCtx?.globalFiles || [];
    const adminAssets = filesCtx?.adminAssets || [];
    const fetchGlobalFiles = filesCtx?.fetchGlobalFiles || (async () => {});
    const fetchAdminAssets = filesCtx?.fetchAdminAssets || (async () => {});
    const refreshFiles = filesCtx?.refreshFiles || (async () => {});
    const hasActiveProject = filesCtx?.hasActiveProject || false;
    const { activeProjectId } = useProject();
    const { t } = useTranslation();
    const effectiveDestination: 'user' | 'global' | 'admin' = destination;

    // Translation-dependent constants
    const ASPECT_RATIOS = [
        { label: '1:1', value: '1:1', Icon: Square },
        { label: '16:9', value: '16:9', Icon: RectangleHorizontal },
        { label: '9:16', value: '9:16', Icon: RectangleVertical },
        { label: '4:3', value: '4:3', Icon: RectangleHorizontal },
        { label: '3:4', value: '3:4', Icon: RectangleVertical },
        { label: '21:9', value: '21:9', Icon: RectangleHorizontal },
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

    // Available image generation models via OpenRouter
    const IMAGE_MODELS = useMemo(() => [
        {
            id: 'nano-banana-2',
            label: 'Nano Banana 2',
            provider: 'Google',
            value: 'gemini-3.1-flash-image-preview',
            icon: Zap,
            credits: '5x',
            description: t('editor.modelNanoBananaDesc', { defaultValue: 'Pro-level visual quality at Flash speed. Best for fast iterations with references.' })
        }
    ], [t]);

    const THINKING_LEVELS: { label: string; value: string; badge: string }[] = [
        { label: t('editor.none', { defaultValue: 'None' }), value: 'none', badge: '1X' },
        { label: t('editor.low', { defaultValue: 'Low' }), value: 'low', badge: '2X' },
        { label: t('editor.medium', { defaultValue: 'Medium' }), value: 'medium', badge: '3X' },
        { label: t('editor.high', { defaultValue: 'High' }), value: 'high', badge: '4X' },
    ];

    // State
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState(IMAGE_MODELS[0].value);
    const [showModelSelector, setShowModelSelector] = useState(false);
    const [showKitSaveModal, setShowKitSaveModal] = useState(false);
    const [thinkingLevel, setThinkingLevel] = useState('high');
    const [personGeneration, setPersonGeneration] = useState('allow_adult');
    const [temperature, setTemperature] = useState(1.0);
    const [negativePrompt, setNegativePrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState(generationContext === 'background' ? '16:9' : '1:1');
    const [showAspectRatioSelector, setShowAspectRatioSelector] = useState(false);
    const [style, setStyle] = useState(generationContext === 'background' ? 'Photorealistic' : 'None');
    const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('2K');
    const [showResolutionSelector, setShowResolutionSelector] = useState(false);
    const [lighting, setLighting] = useState('None');
    const [cameraAngle, setCameraAngle] = useState('None');
    const [colorGrading, setColorGrading] = useState('None');
    const [depthOfField, setDepthOfField] = useState('None');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
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
    const hasPreloadedRef = useRef(false);

    // Visual Identity Kit
    const effectiveProjectId = projectId || (hasActiveProject ? activeProjectId : undefined);
    const { kit, defaultReferences, defaultReferenceUrls, getContextualReferenceUrls } = useVisualIdentityKit(effectiveProjectId);
    const [kitEnabled, setKitEnabled] = useState(true);

    // Reset preloaded flag when project changes so we can auto-load the new project's references
    useEffect(() => {
        hasPreloadedRef.current = false;
    }, [effectiveProjectId]);

    // Pre-load kit references once when the kit first becomes available
    useEffect(() => {
        if (!kitEnabled || !kit || defaultReferenceUrls.length === 0 || hasPreloadedRef.current) return;
        hasPreloadedRef.current = true;
        setReferenceImages(prev => {
            const newRefs = defaultReferenceUrls.filter(url => !prev.includes(url));
            if (newRefs.length === 0) return prev;
            const combined = [...prev, ...newRefs].slice(0, 14);
            return combined;
        });
    // Only re-run when kitEnabled or kit availability changes (not defaultReferenceUrls)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kitEnabled, kit]);

    // Listen to external commands to add reference images
    useEffect(() => {
        const handleAddReferenceImage = (e: Event) => {
            const customEvent = e as CustomEvent<string>;
            const imageData = customEvent.detail;
            if (!imageData) return;

            setReferenceImages(prev => {
                if (prev.length >= 14 || prev.includes(imageData)) {
                    return prev;
                }
                return [...prev, imageData];
            });
        };

        window.addEventListener('assets:add-reference-image', handleAddReferenceImage);
        return () => window.removeEventListener('assets:add-reference-image', handleAddReferenceImage);
    }, []);

    // Library Browser State
    const [showLibraryBrowser, setShowLibraryBrowser] = useState(false);
    const [librarySearchQuery, setLibrarySearchQuery] = useState('');
    const [loadingLibraryImage, setLoadingLibraryImage] = useState<string | null>(null);

    useEffect(() => {
        if (mediaCtx) {
            if (effectiveDestination === 'admin') {
                mediaCtx.fetchMediaAssets(adminCategory as MediaCategory);
            } else if (effectiveDestination === 'global') {
                mediaCtx.fetchMediaAssets();
            }
        } else {
            if (effectiveDestination === 'admin') {
                fetchAdminAssets();
            } else if (effectiveDestination === 'global') {
                fetchGlobalFiles();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveDestination]);

    // Filter project images for the library browser (active editor project vs explicit prop)
    const libraryProjectId = activeProjectId || projectId;
    const libraryImages = useMemo(() => {
        const mediaFiles = (mediaCtx?.mediaAssets || []).map(a => ({
            id: a.id,
            name: a.name,
            url: a.url,
            downloadURL: a.downloadURL || a.url,
            size: a.size || 0,
            type: a.type || 'image/png',
            storagePath: a.storagePath || a.folderPath || '',
            projectId: '',
            createdAt: a.createdAt,
        } as FileRecord));

        let sourceFiles: FileRecord[] = files;
        if (effectiveDestination === 'global') {
            sourceFiles = mediaFiles.length ? mediaFiles : globalFiles;
        } else if (effectiveDestination === 'admin') {
            sourceFiles = mediaFiles.length ? mediaFiles : adminAssets;
            if (adminCategory) {
                sourceFiles = sourceFiles.filter(f => (f as any).category === adminCategory);
            }
        }

        let result = sourceFiles.filter(f => f.type?.startsWith('image/'));
        if (effectiveDestination === 'user' && libraryProjectId) {
            result = result.filter(f => f.projectId === libraryProjectId);
        }
        if (librarySearchQuery) {
            result = searchFiles(result, librarySearchQuery);
        }
        return result;
    }, [files, globalFiles, adminAssets, adminCategory, librarySearchQuery, libraryProjectId, effectiveDestination, mediaCtx?.mediaAssets]);

    // Add a library image as a reference (converts to base64 via img+canvas to avoid CORS)
    const handleAddLibraryImage = async (downloadURL: string) => {
        if (referenceImages.length >= 14) return;
        setLoadingLibraryImage(downloadURL);
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) { reject(new Error('Canvas context not available')); return; }
                        ctx.drawImage(img, 0, 0);
                        const dataUrl = canvas.toDataURL('image/png');
                        resolve(dataUrl);
                    } catch (canvasError) {
                        // If canvas is tainted (CORS), fall back to URL directly
                        console.warn('Canvas tainted, using URL directly:', canvasError);
                        resolve(downloadURL);
                    }
                };
                img.onerror = () => {
                    // If image fails to load with crossOrigin, use URL directly
                    console.warn('Image load with crossOrigin failed, using URL directly');
                    resolve(downloadURL);
                };
                img.src = downloadURL;
            });
            setReferenceImages(prev => [...prev, base64]);
        } catch (error) {
            console.error('Error loading library image as reference:', error);
            // Ultimate fallback: just use the URL
            setReferenceImages(prev => [...prev, downloadURL]);
        } finally {
            setLoadingLibraryImage(null);
        }
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
            // If the image is already uploaded by the new Supabase proxy (returns an HTTPS URL),
            // it has already been saved to the database by AIContext.saveGeneratedImageToLibrary.
            if (imageDataUrl.startsWith('http')) {
                console.log('✅ [ImageGeneratorPanel] Image was already saved by AIContext proxy');
                setSavedToLibrary(true);
                setSavedImageUrl(imageDataUrl);
                // Refresh the relevant library so the new image is available in the picker
                // immediately, without waiting for a realtime event or a manual reload.
                if (effectiveDestination === 'admin') {
                    await fetchAdminAssets();
                    if (mediaCtx) await mediaCtx.fetchMediaAssets();
                } else if (effectiveDestination === 'global') {
                    await fetchGlobalFiles();
                } else {
                    await refreshFiles();
                }
                return imageDataUrl;
            }

            // Fallback for data URLs (legacy or proxy fallback)
            const timestamp = Date.now();
            const filename = `quimera-${timestamp}.png`;
            const file = base64ToFile(imageDataUrl, filename);

            let savedUrl: string | undefined;

            if (effectiveDestination === 'admin') {
                if (mediaCtx) {
                    savedUrl = await mediaCtx.uploadMediaAsset(file, (adminCategory as MediaCategory) || 'ai_generated', {
                        description: `Generated AI image: ${promptText.substring(0, 50)}...`,
                        isAiGenerated: true,
                        aiPrompt: promptText,
                    });
                } else {
                    await uploadAdminAsset(file, (adminCategory as any) || 'ai_generated', {
                        description: `Generated AI image: ${promptText.substring(0, 50)}...`,
                        isAiGenerated: true,
                        aiPrompt: promptText,
                    });
                }
                console.log('✅ [ImageGeneratorPanel] Saved to admin library');
                setSavedToLibrary(true);
                savedUrl = savedUrl || imageDataUrl;
            } else if (effectiveDestination === 'global') {
                if (mediaCtx) {
                    savedUrl = await mediaCtx.uploadMediaAsset(file, 'other', {
                        description: `Generated AI image: ${promptText.substring(0, 50)}...`,
                        isAiGenerated: true,
                        aiPrompt: promptText,
                        legacyScope: 'global',
                    });
                } else {
                    savedUrl = await uploadGlobalFile(file);
                }
                console.log('✅ [ImageGeneratorPanel] Saved to global library:', savedUrl);
                if (savedUrl) {
                    setSavedToLibrary(true);
                    setSavedImageUrl(savedUrl);
                }
            } else if (hasActiveProject) {
                // Save to user's project files
                savedUrl = await uploadFile(file);
                console.log('✅ [ImageGeneratorPanel] Saved fallback to project files:', savedUrl);
                if (savedUrl) {
                    setSavedToLibrary(true);
                    setSavedImageUrl(savedUrl);
                }
            } else {
                console.warn('⚠️ [ImageGeneratorPanel] No active project, fallback image not saved to library');
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

    const handleGenerate = async (promptOverride?: string) => {
        const promptText = (promptOverride ?? prompt).trim();
        if (!promptText) return;
        setPrompt(promptText);
        setIsGenerating(true);
        setGenerationProgress(0);
        setSavedToLibrary(false);
        setSavedImageUrl(null);
        setShowImageDetail(false);

        // Simulate progress during generation
        const progressInterval = setInterval(() => {
            setGenerationProgress(prev => {
                if (prev >= 90) return prev;
                return prev + Math.random() * 8 + 2;
            });
        }, 500);

        try {
            // Collect all references: manual + kit (always/default) + contextual
            const allReferenceUrls = new Set(referenceImages);
            if (kitEnabled && kit) {
                // Add contextual references triggered by the prompt
                const contextualUrls = getContextualReferenceUrls(promptText);
                contextualUrls.forEach(url => allReferenceUrls.add(url));
            }

            // Collect aiPromptHints from active kit references
            const activeKitRefs = kitEnabled && kit
                ? kit.references.filter(r => allReferenceUrls.has(r.imageUrl) && r.aiPromptHint)
                : [];
            const aiPromptHints = activeKitRefs.map(r => r.aiPromptHint!).filter(Boolean);

            const rawRefList = allReferenceUrls.size > 0 ? Array.from(allReferenceUrls) : [];
            const normalizedRefList = rawRefList.length > 0
                ? await normalizeReferenceImagesForGeneration(rawRefList)
                : [];

            const options = {
                aspectRatio,
                style,
                destination: effectiveDestination,
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
                referenceImages: normalizedRefList.length > 0 ? normalizedRefList : undefined,
                projectId: effectiveProjectId || undefined,
                adminCategory,
                adminTags: [style, aspectRatio].filter(s => s !== 'None'),
                adminDescription: promptText,
                generationContext,
                visualReferences: activeKitRefs.length > 0 ? activeKitRefs : undefined,
                aiPromptHints: aiPromptHints.length > 0 ? aiPromptHints : undefined,
            };

            console.log('✨ [ImageGeneratorPanel] Quimera options:', options);
            console.log('✨ [ImageGeneratorPanel] effectiveProjectId:', effectiveProjectId, 'destination:', effectiveDestination);

            const imageDataUrl = await generateImage(promptText, options);
            setGeneratedImage(imageDataUrl);

            // Save the prompt and options used for the detail modal
            setGeneratedPrompt(promptText);
            setGeneratedOptions({
                model: selectedModel,
                aspectRatio,
                style,
                resolution,
                negativePrompt: negativePrompt.trim() || undefined,
            });

            // Save the generated image to the project library (legacy storage + Supabase)
            // useAI().generateImage only returns a base64 data URL, it does NOT persist
            const savedUrl = await saveToLibrary(imageDataUrl, promptText);

            // Call callback with saved URL (legacy storage) or fallback to data URL
            if (onImageGenerated) {
                onImageGenerated(savedUrl || imageDataUrl);
            }

        } catch (error) {
            console.error(error);
            alert(t('editor.generationFailed'));
        } finally {
            clearInterval(progressInterval);
            setGenerationProgress(100);
            setTimeout(() => setIsGenerating(false), 300);
        }
    };

    useEffect(() => {
        const runLaunchRequest = (request: ReturnType<typeof readMediaGeneratorLaunchEvent>) => {
            if (!request || request.mode !== 'image') return;
            if (request.projectId && (!effectiveProjectId || request.projectId !== effectiveProjectId)) return;

            const launchOptions = request.options || {};
            if (launchOptions.aspectRatio && ASPECT_RATIOS.some(option => option.value === launchOptions.aspectRatio)) {
                setAspectRatio(launchOptions.aspectRatio);
            }
            if (launchOptions.resolution && RESOLUTIONS.some(option => option.value === launchOptions.resolution)) {
                setResolution(launchOptions.resolution as '1K' | '2K' | '4K');
            }
            if (launchOptions.style && STYLES.some(option => option.value === launchOptions.style)) {
                setStyle(launchOptions.style);
            }
            setPrompt(request.prompt);
            if (request.autoStart) {
                window.setTimeout(() => {
                    void handleGenerate(request.prompt);
                }, 0);
            }
        };

        runLaunchRequest(consumeMediaGeneratorLaunchRequest('image', effectiveProjectId));

        const handleLaunchEvent = (event: Event) => {
            runLaunchRequest(readMediaGeneratorLaunchEvent(event));
        };

        window.addEventListener(MEDIA_GENERATOR_LAUNCH_EVENT, handleLaunchEvent);
        return () => window.removeEventListener(MEDIA_GENERATOR_LAUNCH_EVENT, handleLaunchEvent);
    }, [effectiveProjectId, handleGenerate]);

    const handleEnhancePrompt = async () => {
        if (!prompt.trim()) return;
        setIsEnhancing(true);
        try {
            const enhanced = await enhancePrompt(
                prompt,
                referenceImages.length > 0 ? referenceImages : undefined,
                {
                    usage: generationContext === 'background' ? 'section-background' : (effectiveDestination === 'admin' ? 'admin-asset' : 'component-image'),
                    generationContext,
                    destination: effectiveDestination,
                    adminCategory,
                    aspectRatio,
                    style,
                    lighting,
                    cameraAngle,
                    colorGrading,
                    depthOfField,
                }
            );
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

    const { openSections, toggle, expandAll, collapseAll } = useCollapsibleSections({
        reference: true,
        aspectRatio: true,
        resolution: true,
        style: true,
        advanced: false,
    });

    return (
        <div className={`bg-q-bg text-q-text font-sans flex flex-col h-full overflow-hidden ${className}`}>
            <style>{`
            input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: var(--editor-accent); cursor: pointer; margin-top: -6px; }
            `}</style>

            {/* Header */}
            {!hideHeader && (
            <header className="quimera-dashboard-header-bar flex items-center justify-between whitespace-nowrap px-3 lg:px-5 py-2.5 lg:py-3 shrink-0 z-20">
                <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 text-q-accent flex items-center justify-center shrink-0">
                        <Wand2 size={18} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-q-text text-sm lg:text-lg font-bold leading-tight truncate">
                            {t('editor.quimeraImageGenerator', { defaultValue: 'Image Generator' })}
                        </h2>
                        {generationContext === 'background' && (
                            <p className="text-[10px] lg:text-xs text-q-text-secondary">
                                {t('editor.generatingForBackground', { defaultValue: 'Generating for: Background' })}
                            </p>
                        )}
                    </div>
                    {generationContext === 'background' && (
                        <span className="hidden md:flex items-center gap-1.5 bg-primary/10 text-q-accent border border-primary/20 px-2.5 py-1 rounded-full text-xs font-medium">
                            <ImageIcon size={12} />
                            {t('editor.generatingForBackground', { defaultValue: 'Generating for: Background' })}
                        </span>
                    )}
                    {/* Model Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowModelSelector(!showModelSelector)}
                            className="flex items-center gap-2 bg-q-surface-overlay/40 hover:bg-primary/10 border border-q-border/50 rounded-lg px-3 py-1.5 text-xs font-medium text-q-text transition-colors"
                        >
                            {(() => {
                                const m = IMAGE_MODELS.find(m => m.value === selectedModel);
                                const Icon = m?.icon || Sparkles;
                                return <><Icon size={14} className="text-q-accent" /><span>{m?.label || selectedModel}</span><ChevronDown size={12} className="text-q-text-secondary" /></>;
                            })()}
                        </button>
                        {showModelSelector && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setShowModelSelector(false)} />
                                <div className="absolute top-full left-0 mt-2 w-72 bg-q-surface border border-q-border rounded-xl shadow-2xl z-40 overflow-hidden">
                                    {IMAGE_MODELS.map(model => {
                                        const Icon = model.icon;
                                        const isSelected = selectedModel === model.value;
                                        return (
                                            <button
                                                key={model.id}
                                                onClick={() => { setSelectedModel(model.value); setShowModelSelector(false); }}
                                                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-q-bg ${isSelected ? 'bg-q-bg ring-1 ring-inset ring-q-accent/30' : ''}`}
                                            >
                                                <div className="mt-0.5 shrink-0">
                                                    <Icon size={18} className={isSelected ? 'text-q-accent' : 'text-q-text-secondary'} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-q-text">{model.label}</span>
                                                        <span className="text-[10px] text-q-text-secondary bg-q-bg px-1.5 py-0.5 rounded">{model.provider}</span>
                                                    </div>
                                                    <p className="text-[11px] text-q-text-secondary mt-0.5 leading-tight">{model.description}</p>
                                                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-q-accent">
                                                        <Zap size={10} /> {model.credits} {t('editor.credits', { defaultValue: 'credits' })}
                                                    </span>
                                                </div>
                                                {isSelected && (
                                                    <CheckCircle2 size={16} className="text-q-accent shrink-0 mt-0.5" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {/* Visual Kit Toggle */}
                    {kit && kit.references.length > 0 && (
                        <button
                            onClick={() => setKitEnabled(!kitEnabled)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${
                                kitEnabled
                                    ? 'bg-q-accent/10 text-q-accent border-q-accent/30'
                                    : 'bg-q-surface text-q-text-secondary border-q-border/50 hover:text-q-text'
                            }`}
                            title={t('visualKit.toggleTooltip', { defaultValue: 'Toggle project visual identity references' })}
                        >
                            <Palette size={12} />
                            <span>Kit</span>
                            <span className={`w-2 h-2 rounded-full ${kitEnabled ? 'bg-q-accent' : 'bg-q-text-secondary/30'}`} />
                        </button>
                    )}
                    {onCollapse && (
                        <button
                            onClick={onCollapse}
                            className="flex items-center justify-center rounded-lg w-10 h-10 hover:bg-q-surface text-q-accent hover:text-q-accent/80 transition-colors"
                            title={t('common.collapse', { defaultValue: 'Minimizar generador' })}
                        >
                            <ChevronDown size={20} className="rotate-180" />
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center rounded-lg w-9 h-9 hover:bg-q-surface text-q-text-secondary hover:text-q-text transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </header>
            )}

            <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                {/* Main Content Area */}
                <main className="flex flex-1 flex-col relative overflow-hidden min-h-[360px] md:min-h-0">
                    <div className="flex-1 flex flex-col relative w-full h-full quimera-media-workspace overflow-y-auto">
                        <div className="w-full h-full flex items-center justify-center p-4 md:p-8 lg:p-10 min-h-[300px] md:min-h-[520px] relative z-10">
                            <div className="relative w-full max-w-4xl aspect-video bg-q-surface/45 shadow-2xl flex flex-col rounded-2xl overflow-hidden border border-q-border/60 backdrop-blur-sm">
                                {isGenerating ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8">
                                        <Loader2 size={48} className="animate-spin text-q-accent" />
                                        <div className="w-full max-w-sm space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-q-text-secondary font-medium">
                                                    {t('editor.creatingInResolution', { resolution, defaultValue: `Creating in ${resolution}...` })}
                                                </span>
                                                <span className="text-q-text font-medium">{Math.round(generationProgress)}%</span>
                                            </div>
                                            <ProgressBar3D
                                                percentage={generationProgress}
                                                size="lg"
                                            />
                                        </div>
                                        <p className="text-q-text-secondary text-xs">
                                            {t('editor.generatingPleaseWait', { defaultValue: 'This may take a few moments...' })}
                                        </p>
                                    </div>
                                ) : generatedImage ? (
                                    <>
                                        <div className="absolute top-4 left-0 w-full flex items-center justify-center gap-4 z-20">
                                            {onUseImage && (
                                                <button
                                                    onClick={() => onUseImage(savedImageUrl || generatedImage)}
                                                    className="flex items-center gap-2 bg-q-accent hover:bg-q-accent/80 text-primary-foreground px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all hover:-translate-y-0.5"
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
                                                className="flex items-center gap-2 bg-q-surface hover:bg-muted text-q-text px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50"
                                            >
                                                <ImageIcon size={20} />
                                                <span>{t('editor.useAsReference', { defaultValue: 'Use as Reference' })}</span>
                                            </button>
                                            <button
                                                onClick={() => setShowKitSaveModal(true)}
                                                className="flex items-center gap-2 bg-q-surface hover:bg-muted text-q-accent px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all hover:-translate-y-0.5"
                                            >
                                                <Palette size={20} />
                                                <span>{t('visualKit.saveToKit', { defaultValue: 'Save to Kit' })}</span>
                                            </button>
                                        </div>
                                        <div className="w-full h-full relative group cursor-pointer" onClick={() => setShowImageDetail(true)}>
                                            <img alt="Generated result" className="w-full h-full object-contain" src={generatedImage} />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-white/80 text-sm font-medium">Prompt: {prompt.substring(0, 50)}...</p>
                                                        <p className="text-white/50 text-xs">Model: {IMAGE_MODELS.find(m => m.value === selectedModel)?.label || 'Nano Banana 2'} • Res: {resolution}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <a
                                                            href={savedImageUrl || generatedImage}
                                                            download={`quimera-${Date.now()}.png`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-2 bg-q-surface/10 hover:bg-q-surface/20 rounded-lg text-white transition-colors backdrop-blur-sm"
                                                            title={t('imageGeneration.download')}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Download size={20} />
                                                        </a>
                                                        <button
                                                            className="p-2 bg-q-surface/10 hover:bg-q-surface/20 rounded-lg text-white transition-colors backdrop-blur-sm"
                                                            title={t('imageGeneration.expand')}
                                                        >
                                                            <Eye size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-q-surface/30 backdrop-blur-sm">
                                        <div className="w-20 h-20 rounded-2xl border border-q-border/50 bg-q-surface/50 flex items-center justify-center mb-5">
                                            <ImageIcon size={48} className="text-q-text-secondary/50" />
                                        </div>
                                        <h3 className="text-2xl font-medium text-q-text tracking-tight mb-2">Ready to generate</h3>
                                        <p className="text-q-text-secondary text-sm max-w-sm text-center">
                                            Enter a prompt below and adjust settings in the sidebar to create your image.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Prompt Bar */}
                    <div className="w-full border-t border-q-border/70 bg-q-bg/85 p-3 backdrop-blur-xl lg:p-5 shrink-0 z-30">
                        <div className="max-w-4xl mx-auto w-full">
                            <div className="quimera-ai-launcher">
                            <div className="flex w-full items-center gap-2">
                                <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-q-surface-overlay/40 text-q-accent">
                                    <Sparkles size={18} className={isGenerating ? 'animate-pulse' : ''} />
                                </div>
                                <input
                                    className="flex-1 bg-transparent border-none text-q-text placeholder:text-q-text-secondary/55 px-3 py-2.5 focus:ring-0 text-sm font-medium min-h-[40px]"
                                    placeholder={t('editor.describeImage', { defaultValue: 'Describe your image...' })}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            void handleGenerate();
                                        }
                                    }}
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleEnhancePrompt}
                                        disabled={isEnhancing || !prompt}
                                        className="h-10 w-10 flex-shrink-0 rounded-xl text-q-accent bg-q-surface-overlay/40 transition-colors hover:bg-primary/10 relative flex items-center justify-center disabled:opacity-50"
                                        title={t('editor.enhance', { defaultValue: 'Enhance Prompt' })}
                                    >
                                        {isEnhancing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                                    </button>
                                    <button
                                        onClick={() => void handleGenerate()}
                                        disabled={isGenerating || !prompt}
                                        className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-q-accent text-q-text-on-accent hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-30 disabled:hover:shadow-none"
                                        title={t('editor.generate', { defaultValue: 'Generate' })}
                                    >
                                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Zap size={16} />}
                                    </button>
                                </div>
                            </div>
                            </div>
                            <button
                                onClick={() => void handleGenerate()}
                                disabled={isGenerating || !prompt}
                                className="sm:hidden mt-3 w-full flex items-center justify-center gap-2 bg-q-accent hover:bg-q-accent/80 text-primary-foreground px-6 py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
                            >
                                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <><span>Generate</span><Zap size={16} /></>}
                            </button>
                        </div>
                    </div>
                </main>

                {/* Sidebar Configuration */}
                <aside className="w-full md:w-[360px] border-t md:border-t-0 md:border-l border-q-border/70 quimera-media-side-panel flex flex-col shrink-0 overflow-hidden relative z-40 flex-1 md:flex-none">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        <CollapsiblePanelHeader
                            title={t('editor.configuration', { defaultValue: 'Configuration' })}
                            onExpandAll={expandAll}
                            onCollapseAll={collapseAll}
                        />
                        {/* Reference Images */}
                        <CollapsibleSection
                            title="Reference Image"
                            icon={<ImageIcon size={14} />}
                            isOpen={openSections.reference}
                            onToggle={() => toggle('reference')}
                            badge={<span className="text-xs text-q-text-secondary">{referenceImages.length}/14</span>}
                        >
                            <div className="space-y-3">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    multiple
                                    onChange={handleReferenceImageUpload}
                                    className="hidden"
                                />
                                <div
                                    className={`w-full border-2 border-dashed rounded-xl transition-colors cursor-pointer group p-6 flex flex-col items-center justify-center gap-3 ${isDragging ? 'border-q-accent bg-q-accent/10' : 'border-q-border hover:border-q-accent/50 bg-q-bg/30'}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {isUploading ? (
                                        <Loader2 size={32} className="animate-spin text-q-accent" />
                                    ) : (
                                        <>
                                            <div className="size-10 rounded-full bg-q-surface-overlay/20 group-hover:bg-q-accent/10 flex items-center justify-center transition-colors">
                                                <Upload size={20} className="text-q-text-secondary group-hover:text-q-accent transition-colors" />
                                            </div>
                                            <span className="text-xs font-medium text-q-text-secondary group-hover:text-q-accent transition-colors text-center">Upload Reference Image</span>
                                        </>
                                    )}
                                </div>

                                {/* Browse Library Button */}
                                <button
                                    onClick={() => { setLibrarySearchQuery(''); setShowLibraryBrowser(true); }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-q-border hover:border-q-accent/50 bg-q-bg/30 hover:bg-q-accent/10 text-q-text-secondary hover:text-q-accent transition-all text-xs font-medium group"
                                >
                                    <Grid size={14} className="group-hover:text-q-accent transition-colors" />
                                    <span>{t('editor.browseLibrary', { defaultValue: effectiveDestination === 'admin' ? 'Browse Admin Library' : 'Browse Library' })}</span>
                                    <span className="text-[10px] opacity-60">({libraryImages.length})</span>
                                </button>

                                {referenceImages.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {referenceImages.map((img, idx) => {
                                            const isKitRef = kitEnabled && defaultReferenceUrls.includes(img);
                                            const kitRef = isKitRef ? defaultReferences.find(r => r.imageUrl === img) : null;
                                            return (
                                                <div key={idx} className={`relative w-12 h-12 rounded-lg overflow-hidden group border ${isKitRef ? 'ring-1 ring-q-accent/50' : 'border-q-border'}`}>
                                                    <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                                                    {isKitRef && kitRef && (
                                                        <span className={`absolute bottom-0 left-0 right-0 text-[8px] font-bold text-center truncate px-0.5 py-px ${IMAGE_REFERENCE_CATEGORY_COLORS[kitRef.category] || 'bg-q-surface/80 text-q-text'}`}>
                                                            {kitRef.label.substring(0, 8)}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveReferenceImage(idx); }}
                                                        className="absolute inset-0 bg-q-text/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                    >
                                                        <X size={14} className="text-white" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </CollapsibleSection>

                        {/* Aspect Ratio */}
                        <CollapsibleSection
                            title="Aspect Ratio"
                            icon={<RectangleHorizontal size={14} />}
                            isOpen={openSections.aspectRatio}
                            onToggle={() => toggle('aspectRatio')}
                            badge={<span className="text-xs text-q-accent font-mono font-bold">{aspectRatio}</span>}
                        >
                            <div className="relative">
                                {(() => {
                                    const selectedRatio = ASPECT_RATIOS.find(ratio => ratio.value === aspectRatio) || ASPECT_RATIOS[0];
                                    const SelectedIcon = selectedRatio.Icon;
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => setShowAspectRatioSelector(prev => !prev)}
                                            className="w-full flex items-center justify-between gap-3 rounded-lg border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text transition-colors hover:border-q-accent/50"
                                        >
                                            <span className="flex items-center gap-2">
                                                <SelectedIcon size={17} strokeWidth={2} className="text-q-accent" />
                                                <span className="font-bold">{selectedRatio.value}</span>
                                            </span>
                                            <ChevronDown size={16} className={`text-q-text-secondary transition-transform ${showAspectRatioSelector ? 'rotate-180' : ''}`} />
                                        </button>
                                    );
                                })()}
                                {showAspectRatioSelector && (
                                    <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-q-border bg-q-surface shadow-xl">
                                        {ASPECT_RATIOS.slice(0, 6).map(ratio => (
                                    <button
                                        key={ratio.value}
                                        type="button"
                                        onClick={() => {
                                            setAspectRatio(ratio.value);
                                            setShowAspectRatioSelector(false);
                                        }}
                                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${aspectRatio === ratio.value ? 'bg-q-accent/10 text-q-accent' : 'text-q-text-secondary hover:bg-q-bg hover:text-q-accent'}`}
                                        title={ratio.label}
                                    >
                                        <ratio.Icon size={17} strokeWidth={2} />
                                        <span className="font-bold">{ratio.value}</span>
                                    </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CollapsibleSection>

                        {/* Resolution */}
                        <CollapsibleSection
                            title="Resolution"
                            icon={<Monitor size={14} />}
                            isOpen={openSections.resolution}
                            onToggle={() => toggle('resolution')}
                            badge={<span className="text-xs text-q-accent font-mono font-bold">{resolution}</span>}
                        >
                            <div className="relative">
                                {(() => {
                                    const selectedResolution = RESOLUTIONS.find(res => res.value === resolution) || RESOLUTIONS[1];
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => setShowResolutionSelector(prev => !prev)}
                                            className="w-full flex items-center justify-between gap-3 rounded-lg border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text transition-colors hover:border-q-accent/50"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Monitor size={17} strokeWidth={2} className="text-q-accent" />
                                                <span className="font-bold">{selectedResolution.label}</span>
                                            </span>
                                            <ChevronDown size={16} className={`text-q-text-secondary transition-transform ${showResolutionSelector ? 'rotate-180' : ''}`} />
                                        </button>
                                    );
                                })()}
                                {showResolutionSelector && (
                                    <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-q-border bg-q-surface shadow-xl">
                                        {RESOLUTIONS.map(res => (
                                            <button
                                                key={res.value}
                                                type="button"
                                                onClick={() => {
                                                    setResolution(res.value as '1K' | '2K' | '4K');
                                                    setShowResolutionSelector(false);
                                                }}
                                                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${resolution === res.value ? 'bg-q-accent/10 text-q-accent' : 'text-q-text-secondary hover:bg-q-bg hover:text-q-accent'}`}
                                                title={`${res.label} - ${res.desc}`}
                                            >
                                                <Monitor size={17} strokeWidth={2} />
                                                <span className="font-bold">{res.label}</span>
                                                <span className="ml-auto text-xs font-medium opacity-70">{res.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CollapsibleSection>

                        {/* Style Presets */}
                        <CollapsibleSection
                            title="Style"
                            icon={<Palette size={14} />}
                            isOpen={openSections.style}
                            onToggle={() => toggle('style')}
                        >
                            <div className="relative">
                                <AppSelect
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                    className="w-full bg-q-bg/80 border border-q-border rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-q-accent/50 focus:border-q-accent/50 outline-none appearance-none cursor-pointer text-q-text"
                                >
                                    {STYLES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </AppSelect>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-q-text-secondary pointer-events-none" />
                            </div>
                        </CollapsibleSection>

                        {/* Advanced Collapsible */}
                        <CollapsibleSection
                            title={t('editor.advancedSettings', { defaultValue: 'Advanced Settings' })}
                            icon={<Settings2 size={14} />}
                            isOpen={openSections.advanced}
                            onToggle={() => toggle('advanced')}
                        >
                                <div className="pt-4 space-y-5">
                                    {/* Thinking Level (Gemini models only) */}
                                    {selectedModel.startsWith('gemini-') && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide flex items-center gap-1.5">
                                            <Brain size={12} className="text-q-text-secondary shrink-0" aria-hidden />
                                            <span>{t('editor.thinkingLevel', { defaultValue: 'Thinking Level' })}</span>
                                        </label>
                                        <div className="flex gap-1">
                                            {THINKING_LEVELS.map(level => {
                                                const selected = thinkingLevel === level.value;
                                                return (
                                                <button
                                                    key={level.value}
                                                    type="button"
                                                    title={`${level.badge} — ${level.label}`}
                                                    aria-label={`${level.badge}, ${level.label}`}
                                                    aria-pressed={selected}
                                                    onClick={() => setThinkingLevel(level.value)}
                                                    className={`flex-1 flex items-center justify-center min-h-9 rounded-lg transition-all border font-mono text-xs font-bold tracking-tight ${selected ? 'bg-q-accent text-primary-foreground border-transparent' : 'bg-q-bg text-q-text-secondary border-q-border/50 hover:text-q-text'}`}
                                                >
                                                    {level.badge}
                                                </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    )}

                                    {/* Negative Prompt */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide">Negative Prompt</label>
                                        <textarea
                                            value={negativePrompt}
                                            onChange={(e) => setNegativePrompt(e.target.value)}
                                            className="w-full bg-q-bg border border-q-border text-q-text text-xs rounded-lg focus:ring-q-accent focus:border-q-accent block p-3 resize-none placeholder:text-q-text-secondary/30"
                                            placeholder="Describe what you want to exclude..."
                                            rows={3}
                                        />
                                    </div>

                                    {/* Lighting */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-q-text-secondary uppercase">Lighting</label>
                                        <div className="relative">
                                            <AppSelect
                                                value={lighting}
                                                onChange={(e) => setLighting(e.target.value)}
                                                className="w-full bg-q-bg border border-q-border/50 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-q-accent focus:border-q-accent outline-none appearance-none cursor-pointer text-q-text"
                                            >
                                                {LIGHTING_OPTIONS.map(l => (
                                                    <option key={l.value} value={l.value}>{l.label}</option>
                                                ))}
                                            </AppSelect>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-q-text-secondary pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Camera Angle */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-q-text-secondary uppercase">Camera Angle</label>
                                        <div className="relative">
                                            <AppSelect
                                                value={cameraAngle}
                                                onChange={(e) => setCameraAngle(e.target.value)}
                                                className="w-full bg-q-bg border border-q-border/50 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-q-accent focus:border-q-accent outline-none appearance-none cursor-pointer text-q-text"
                                            >
                                                {CAMERA_ANGLES.map(c => (
                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                ))}
                                            </AppSelect>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-q-text-secondary pointer-events-none" />
                                        </div>
                                    </div>

                                </div>
                        </CollapsibleSection>
                    </div>
                </aside>
            </div>

            {/* Image Details Modal omitted for brevity, logic remains in state, but view might not be needed if it's rendered inline. To keep it functional, we can add a simple wrapper if showImageDetail is true, but the new UI design displays the tools directly on the image hover so we mapped it there. */}

            {showImageDetail && generatedImage && createPortal(
                <div
                    className="fixed inset-0 z-[100000] bg-q-text/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setShowImageDetail(false)}
                >
                    <div className="bg-q-bg border border-q-border rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col lg:flex-row relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowImageDetail(false)} className="absolute top-4 right-4 z-50 p-2 bg-q-text/50 text-white rounded-full hover:bg-q-text/70"><X size={20} /></button>
                        <div className="flex-1 bg-q-text/50 flex items-center justify-center p-6 min-h-[400px]">
                            <img src={generatedImage} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-xl" />
                        </div>
                        <div className="w-full lg:w-[380px] p-6 overflow-y-auto bg-q-surface">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Sparkles className="text-q-accent" /> Details</h3>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs text-q-text-secondary uppercase font-bold tracking-wide mb-2">Prompt</h4>
                                    <p className="text-sm bg-q-text/20 p-3 rounded-lg border border-q-border/50">{generatedPrompt || prompt}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs text-q-text-secondary uppercase font-bold tracking-wide mb-2">Settings</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-q-text/20 p-3 rounded-lg border border-q-border/50">
                                            <span className="text-[10px] text-q-text-secondary uppercase block">Model</span>
                                            <span className="text-sm font-medium">{generatedOptions?.model ? (IMAGE_MODELS.find(m => m.value === generatedOptions.model)?.label || generatedOptions.model) : IMAGE_MODELS[0].label}</span>
                                        </div>
                                        <div className="bg-q-text/20 p-3 rounded-lg border border-q-border/50">
                                            <span className="text-[10px] text-q-text-secondary uppercase block">Ratio</span>
                                            <span className="text-sm font-medium">{generatedOptions?.aspectRatio || aspectRatio}</span>
                                        </div>
                                        <div className="bg-q-text/20 p-3 rounded-lg border border-q-border/50">
                                            <span className="text-[10px] text-q-text-secondary uppercase block">Resolution</span>
                                            <span className="text-sm font-medium">{generatedOptions?.resolution || resolution}</span>
                                        </div>
                                        <div className="bg-q-text/20 p-3 rounded-lg border border-q-border/50">
                                            <span className="text-[10px] text-q-text-secondary uppercase block">Style</span>
                                            <span className="text-sm font-medium">{generatedOptions?.style || style}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-q-border flex flex-col gap-3">
                                    <a href={savedImageUrl || generatedImage} download={`quimera-${Date.now()}.png`} target="_blank" className="flex items-center justify-center gap-2 w-full py-3 bg-q-accent text-primary-foreground rounded-xl text-sm font-bold hover:bg-q-accent/80 transition-colors">
                                        <Download size={18} /> Download Image
                                    </a>
                                    {onUseImage && (
                                        <button onClick={() => { onUseImage(savedImageUrl || generatedImage); setShowImageDetail(false); }} className="flex items-center justify-center gap-2 w-full py-3 bg-q-surface-overlay/30 text-q-text rounded-xl text-sm font-bold hover:bg-q-surface-overlay/50 transition-colors">
                                            <Check size={18} /> Use in Project
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.getElementById('portal-root') || document.body
            )}

            {/* Library Browser Modal */}
            {showLibraryBrowser && createPortal(
                <div
                    className="fixed inset-0 z-[100020] bg-q-text/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setShowLibraryBrowser(false)}
                >
                    <div
                        className="bg-q-bg border border-q-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[70vh] flex flex-col overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-q-border bg-q-surface shrink-0">
                            <div className="flex items-center gap-2.5">
                                <Grid size={18} className="text-q-accent" />
                                <h3 className="text-q-text font-bold text-sm">
                                    {t('editor.selectFromLibrary', { defaultValue: 'Select from Library' })}
                                </h3>
                                <span className="text-[10px] px-1.5 py-0.5 bg-q-bg rounded text-q-text-secondary">
                                    {libraryImages.length} {libraryImages.length === 1 ? 'image' : 'images'}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowLibraryBrowser(false)}
                                className="p-1.5 rounded-lg hover:bg-q-surface-overlay text-q-text-secondary hover:text-q-text transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-3 border-b border-q-border/50 shrink-0">
                            <div className="flex items-center gap-2 bg-q-surface rounded-xl px-3 py-2 border border-q-border/50">
                                <Search size={14} className="text-q-text-secondary shrink-0" />
                                <input
                                    type="text"
                                    value={librarySearchQuery}
                                    onChange={(e) => setLibrarySearchQuery(e.target.value)}
                                    placeholder={t('editor.searchLibraryImages', { defaultValue: 'Search images...' })}
                                    className="flex-1 bg-transparent outline-none text-sm text-q-text placeholder:text-q-text-secondary/40"
                                    autoFocus
                                />
                                {librarySearchQuery && (
                                    <button
                                        onClick={() => setLibrarySearchQuery('')}
                                        className="text-q-text-secondary hover:text-q-text shrink-0"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Images Grid */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {libraryImages.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                    {libraryImages.map(file => {
                                        const isAlreadyUsed = referenceImages.some(ref => ref.includes(file.id));
                                        const isLoading = loadingLibraryImage === file.downloadURL;
                                        const isFull = referenceImages.length >= 14;
                                        return (
                                            <button
                                                key={file.id}
                                                onClick={() => handleAddLibraryImage(file.downloadURL)}
                                                disabled={isLoading || isFull}
                                                className={`aspect-square rounded-xl overflow-hidden border-2 cursor-pointer group relative transition-all ${isLoading ? 'border-q-accent animate-pulse' : isFull ? 'border-transparent opacity-40 cursor-not-allowed' : 'border-transparent hover:border-q-accent/60'}`}
                                            >
                                                <img
                                                    src={file.downloadURL}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                />
                                                {isLoading ? (
                                                    <div className="absolute inset-0 bg-q-text/60 flex items-center justify-center">
                                                        <Loader2 size={20} className="animate-spin text-q-accent" />
                                                    </div>
                                                ) : (
                                                    <div className="absolute inset-0 bg-q-text/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                                                        <Plus size={18} className="text-white" />
                                                        <span className="text-white text-[10px] font-bold">{t('editor.addAsReference', { defaultValue: 'Add as Reference' })}</span>
                                                    </div>
                                                )}
                                                {/* File name tooltip */}
                                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[9px] text-white/80 truncate block">{file.name}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : librarySearchQuery ? (
                                <div className="h-full flex flex-col items-center justify-center text-q-text-secondary py-12">
                                    <Search size={36} className="mb-3 opacity-40" />
                                    <p className="text-sm font-medium">{t('editor.noImagesFound', { defaultValue: 'No images found' })}</p>
                                    <button
                                        onClick={() => setLibrarySearchQuery('')}
                                        className="text-q-accent hover:underline text-xs mt-2"
                                    >
                                        {t('editor.clearSearch', { defaultValue: 'Clear search' })}
                                    </button>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-q-text-secondary py-12">
                                    <ImageIcon size={36} className="mb-3 opacity-40" />
                                    <p className="text-sm font-medium">{t('editor.noImagesInLibrary', { defaultValue: 'No images in library' })}</p>
                                    <p className="text-xs mt-1 opacity-60">{t('editor.uploadImagesFirst', { defaultValue: 'Upload images to your project first' })}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer with reference count */}
                        <div className="p-3 border-t border-q-border bg-q-surface/80 shrink-0">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-q-text-secondary">
                                    {t('editor.referencesSelected', { count: referenceImages.length, max: 14, defaultValue: `${referenceImages.length}/14 references` })}
                                </span>
                                <button
                                    onClick={() => setShowLibraryBrowser(false)}
                                    className="text-xs font-bold text-q-accent hover:text-q-accent/80 transition-colors"
                                >
                                    {t('common.done', { defaultValue: 'Done' })}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.getElementById('portal-root') || document.body
            )}

            {/* Save to Visual Kit Modal */}
            <AddToVisualKitModal
                isOpen={showKitSaveModal}
                onClose={() => setShowKitSaveModal(false)}
                imageUrl={savedImageUrl || generatedImage || ''}
                projectId={effectiveProjectId}
            />
        </div>
    );
};

export default ImageGeneratorPanel;
