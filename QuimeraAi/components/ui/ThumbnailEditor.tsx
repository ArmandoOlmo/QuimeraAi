import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Zap, Sparkles, Wand2, RefreshCw, Grid, Globe, Search, Check, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/core/AuthContext';
import { useAI } from '../../contexts/ai';
import { useFiles } from '../../contexts/files';
import { useProject } from '../../contexts/project';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { generateContentViaProxy, extractTextFromResponse } from '../../utils/geminiProxyClient';
import { Project } from '../../types';
import { searchFiles } from '../../utils/fileHelpers';
import { logApiCall } from '../../services/apiLoggingService';

interface ThumbnailEditorProps {
    project: Project;
    onClose: () => void;
    onUpdate?: () => void;
}

// Style options for AI generation


const ThumbnailEditor: React.FC<ThumbnailEditorProps> = ({ project, onClose, onUpdate }) => {
    const { t } = useTranslation();

    const THUMBNAIL_STYLES = useMemo(() => [
        { label: t('superadmin.templateEditor.styles.minimalist', 'Minimalist'), value: 'Minimalist' },
        { label: t('superadmin.templateEditor.styles.photorealistic', 'Photorealistic'), value: 'Photorealistic' },
        { label: t('superadmin.templateEditor.styles.digitalArt', 'Digital Art'), value: 'Digital Art' },
        { label: t('superadmin.templateEditor.styles.3dRender', '3D Render'), value: '3D Render' },
        { label: t('superadmin.templateEditor.styles.cyberpunk', 'Cyberpunk'), value: 'Cyberpunk' },
    ], [t]);

    const { user } = useAuth();
    const { generateImage, enhancePrompt, hasApiKey, promptForKeySelection, handleApiError } = useAI();
    const { files, globalFiles, fetchGlobalFiles } = useFiles();
    const { updateProjectThumbnail, activeProject } = useProject();
    const { success: showSuccess, error: showError } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>(project.thumbnailUrl || '');
    const [dragActive, setDragActive] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Tab state - now includes 'library'
    const [activeTab, setActiveTab] = useState<'upload' | 'generate' | 'library'>('library');

    // AI Generation state
    const [thumbnailPrompt, setThumbnailPrompt] = useState('');
    const [thumbnailStyle, setThumbnailStyle] = useState('Minimalist');
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
    const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);

    // Reference Images State
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [isDraggingRef, setIsDraggingRef] = useState(false);
    const referenceFileInputRef = useRef<HTMLInputElement>(null);

    // Library state
    const [librarySource, setLibrarySource] = useState<'user' | 'global'>('global');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectingImageId, setSelectingImageId] = useState<string | null>(null);

    // Fetch global files when tab and source are selected
    useEffect(() => {
        if (activeTab === 'library' && librarySource === 'global') {
            fetchGlobalFiles();
        }
    }, [activeTab, librarySource, fetchGlobalFiles]);

    // Reset image loaded state when preview URL changes
    useEffect(() => {
        setImageLoaded(false);

        // Fallback timeout in case image load/error events don't fire
        if (previewUrl && !previewUrl.includes('data:image/svg+xml')) {
            const timeout = setTimeout(() => {
                setImageLoaded(true);
            }, 5000); // 5 second timeout

            return () => clearTimeout(timeout);
        }
    }, [previewUrl]);

    // Memoize theme colors to prevent re-renders
    const themeColors = useMemo(() => {
        // Try globalColors first
        const gc = project.theme?.globalColors;
        if (gc?.primary || gc?.secondary || gc?.accent) {
            return [
                { name: 'Primary', color: gc.primary },
                { name: 'Secondary', color: gc.secondary },
                { name: 'Accent', color: gc.accent },
                { name: 'Background', color: gc.background },
                { name: 'Text', color: gc.text },
            ].filter(c => c.color) as { name: string; color: string }[];
        }

        // Fallback to hero colors
        const hc = project.data?.hero?.colors;
        if (hc) {
            return [
                { name: 'Primary', color: hc.primary },
                { name: 'Secondary', color: hc.secondary },
                { name: 'Background', color: hc.background },
                { name: 'Text', color: hc.text },
                { name: 'Heading', color: hc.heading },
            ].filter(c => c.color) as { name: string; color: string }[];
        }

        // Fallback to header colors
        const headerC = project.data?.header?.colors;
        if (headerC) {
            return [
                { name: 'Background', color: headerC.background },
                { name: 'Text', color: headerC.text },
                { name: 'Accent', color: headerC.accent },
            ].filter(c => c.color) as { name: string; color: string }[];
        }

        return [];
    }, [project.theme?.globalColors, project.data?.hero?.colors, project.data?.header?.colors]);

    // Filter and search image files for library
    const sourceFiles = librarySource === 'user' ? files : globalFiles;
    const imageFiles = useMemo(() => {
        let result = sourceFiles.filter(f => f.type.startsWith('image/'));

        if (searchQuery) {
            result = searchFiles(result, searchQuery);
        }

        return result;
    }, [sourceFiles, searchQuery]);

    // Handle image selection from library
    const handleSelectFromLibrary = async (imageUrl: string, fileId: string) => {
        console.log('[ThumbnailEditor] handleSelectFromLibrary called');
        console.log('[ThumbnailEditor] imageUrl:', imageUrl);
        console.log('[ThumbnailEditor] fileId:', fileId);

        setSelectingImageId(fileId);
        setIsUploading(true);

        try {
            // Fetch the image and convert to file
            console.log('[ThumbnailEditor] Fetching image...');
            const response = await fetch(imageUrl, { mode: 'cors' });

            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }

            console.log('[ThumbnailEditor] Fetch response ok, getting blob...');
            const blob = await response.blob();
            console.log('[ThumbnailEditor] Blob size:', blob.size, 'type:', blob.type);

            if (blob.size === 0) {
                throw new Error('Fetched image is empty');
            }

            const file = new File([blob], `thumbnail-${Date.now()}.png`, { type: blob.type || 'image/png' });
            console.log('[ThumbnailEditor] Created file:', file.name, file.size);

            console.log('[ThumbnailEditor] Calling updateProjectThumbnail...');
            await updateProjectThumbnail(project.id, file);
            console.log('[ThumbnailEditor] updateProjectThumbnail completed');

            setPreviewUrl(imageUrl);
            showSuccess(t('superadmin.templateEditor.thumbnailUpdated', 'Thumbnail updated successfully'));
            onUpdate?.();
            onClose();
        } catch (error) {
            console.error('[ThumbnailEditor] Error applying thumbnail from library:', error);
            showError(t('superadmin.templateEditor.errors.applyFailed', 'Failed to apply thumbnail. Please try again.'));
        } finally {
            setIsUploading(false);
            setSelectingImageId(null);
        }
    };

    // Analyze color palette for AI prompt generation
    const analyzeColorPalette = (colors: { name: string; color: string }[]): string => {
        if (colors?.length === 0) return 'No colors detected';

        const characteristics: string[] = [];

        colors?.forEach(({ color }) => {
            const hex = color.replace('#', '').toLowerCase();
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

            if (luminance < 0.3) characteristics.push('Dark theme');
            else characteristics.push('Light theme');

            if (r > 180 && g < 100 && b < 100) characteristics.push('red/warm tones');
            if (r < 100 && g > 180 && b < 100) characteristics.push('green tones');
            if (r < 100 && g < 100 && b > 180) characteristics.push('blue tones');
            if (r > 180 && g > 180 && b < 100) characteristics.push('gold/yellow tones');
            if (r > 150 && g < 100 && b > 150) characteristics.push('purple tones');
        });

        return [...new Set(characteristics)].join(', ');
    };

    // Generate AI prompt suggestion based on template
    const generatePromptSuggestion = async () => {
        if (hasApiKey === false) {
            await promptForKeySelection();
            return;
        }

        setIsEnhancingPrompt(true);
        try {
            const colorAnalysis = analyzeColorPalette(themeColors);
            const colorList = themeColors.map(c => c.color).join(', ');

            const prompt = `You are an expert in creating visual thumbnails for website templates.

Generate a detailed, creative prompt for an AI image generator to create a stunning thumbnail image for this website template.

**Template Information:**
- Name: ${project.name}
- Category: ${project.category || project.brandIdentity?.industry || 'Not specified'}
- Description: ${project.description || 'A professional website template'}

**Color Palette:**
${colorList}

**Color Analysis:**
${colorAnalysis}

**Guidelines:**
- The thumbnail should visually represent what the website looks like or what it's for
- Include elements that match the industry/category
- Use the color palette mentioned above
- Make it eye-catching and professional
- Include abstract shapes, mockups, or relevant imagery
- DON'T include any text in the image

Return ONLY the prompt text, nothing else. Make it 1-2 sentences maximum.`;

            const projectId = activeProject?.id || project.id || 'thumbnail-prompt';
            const response = await generateContentViaProxy(projectId, prompt, 'gemini-2.5-flash', {}, user?.uid);
            const responseText = extractTextFromResponse(response);

            // Log successful API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id || project.id,
                    model: 'gemini-2.5-flash',
                    feature: 'thumbnail-prompt-suggestion',
                    success: true
                });
            }

            setThumbnailPrompt(responseText.trim());
        } catch (error) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id || project.id,
                    model: 'gemini-2.5-flash',
                    feature: 'thumbnail-prompt-suggestion',
                    success: false,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            console.error('Error generating prompt suggestion:', error);
            handleApiError(error);
        } finally {
            setIsEnhancingPrompt(false);
        }
    };

    // Enhance existing prompt
    const handleEnhancePrompt = async () => {
        if (!thumbnailPrompt.trim()) return;

        if (hasApiKey === false) {
            await promptForKeySelection();
            return;
        }

        setIsEnhancingPrompt(true);
        try {
            const enhanced = await enhancePrompt(thumbnailPrompt);
            setThumbnailPrompt(enhanced);
        } catch (error) {
            console.error('Error enhancing prompt:', error);
            handleApiError(error);
        } finally {
            setIsEnhancingPrompt(false);
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

    // Reference images handlers
    const processReferenceFiles = async (files: FileList | File[]) => {
        const remainingSlots = 14 - referenceImages.length;
        if (remainingSlots <= 0) {
            showError(t('dashboard.thumbnailEditor.maxReferences', 'Maximum 14 reference images'));
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

    // Generate thumbnail with AI
    const handleGenerateThumbnail = async () => {
        console.log('[ThumbnailEditor] handleGenerateThumbnail called');
        console.log('[ThumbnailEditor] prompt:', thumbnailPrompt);
        console.log('[ThumbnailEditor] style:', thumbnailStyle);

        if (!thumbnailPrompt.trim()) {
            console.log('[ThumbnailEditor] Empty prompt, returning');
            return;
        }

        if (hasApiKey === false) {
            console.log('[ThumbnailEditor] No API key, prompting for selection');
            await promptForKeySelection();
            return;
        }

        setIsGeneratingThumbnail(true);
        try {
            console.log('[ThumbnailEditor] Calling generateImage...');
            const url = await generateImage(thumbnailPrompt, {
                aspectRatio: '16:9',
                style: thumbnailStyle,
                destination: 'user',
                resolution: '2K',
                referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
            });
            console.log('[ThumbnailEditor] Generated image URL:', url);
            setGeneratedThumbnail(url);
            setPreviewUrl(url);
        } catch (error) {
            console.error('[ThumbnailEditor] Error generating thumbnail:', error);
            handleApiError(error);
        } finally {
            setIsGeneratingThumbnail(false);
        }
    };

    // Apply generated thumbnail to the project
    const applyGeneratedThumbnail = async () => {
        console.log('[ThumbnailEditor] applyGeneratedThumbnail called');
        console.log('[ThumbnailEditor] generatedThumbnail:', generatedThumbnail?.substring(0, 100) + '...');
        console.log('[ThumbnailEditor] project.id:', project.id);

        if (!generatedThumbnail) {
            console.log('[ThumbnailEditor] No generatedThumbnail, returning early');
            return;
        }

        setIsUploading(true);
        try {
            let blob: Blob;

            // Handle data URLs (base64) directly
            if (generatedThumbnail.startsWith('data:')) {
                console.log('[ThumbnailEditor] Converting data URL to blob...');
                // Extract base64 data from data URL
                const [header, base64Data] = generatedThumbnail.split(',');
                const mimeMatch = header.match(/data:([^;]+)/);
                const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

                // Convert base64 to binary
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                blob = new Blob([bytes], { type: mimeType });
                console.log('[ThumbnailEditor] Created blob from data URL, size:', blob.size, 'type:', blob.type);
            } else {
                // Handle regular URLs
                console.log('[ThumbnailEditor] Fetching image from URL...');
                const response = await fetch(generatedThumbnail);
                console.log('[ThumbnailEditor] Fetch response status:', response.status);
                blob = await response.blob();
                console.log('[ThumbnailEditor] Blob size:', blob.size, 'type:', blob.type);
            }

            const file = new File([blob], `thumbnail-${Date.now()}.png`, { type: blob.type || 'image/png' });
            console.log('[ThumbnailEditor] Created file:', file.name, file.size);

            console.log('[ThumbnailEditor] Calling updateProjectThumbnail...');
            await updateProjectThumbnail(project.id, file);
            console.log('[ThumbnailEditor] updateProjectThumbnail completed successfully');

            showSuccess(t('superadmin.templateEditor.thumbnailUpdated', 'Thumbnail updated successfully'));
            onUpdate?.();
            onClose();
        } catch (error) {
            console.error('[ThumbnailEditor] Error applying thumbnail:', error);
            showError(t('superadmin.templateEditor.errors.applyFailed', 'Failed to apply thumbnail'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelect = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            showError(t('superadmin.templateEditor.errors.selectImage', 'Please select an image file'));
            return;
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            showError(t('superadmin.templateEditor.errors.imageSize', 'Image must be less than 5MB'));
            return;
        }

        setIsUploading(true);

        try {
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewUrl(e.target?.result as string);
            };
            reader.readAsDataURL(file);

            // Upload to storage
            await updateProjectThumbnail(project.id, file);

            showSuccess(t('superadmin.templateEditor.thumbnailUpdated', 'Thumbnail updated successfully'));
            onUpdate?.();
        } catch (error) {
            console.error('Error uploading thumbnail:', error);
            showError(t('superadmin.templateEditor.errors.uploadFailed', 'Failed to upload thumbnail'));
            setPreviewUrl(project.thumbnailUrl);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-background border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">{t('superadmin.templateEditor.changeThumbnail', 'Change Thumbnail')}</h2>
                            <p className="text-sm text-muted-foreground">{project.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-secondary transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border">
                    <button
                        onClick={() => setActiveTab('library')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'library'
                            ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/5'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Grid className="w-4 h-4" />
                        {t('superadmin.templateEditor.library', 'Library')}
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'upload'
                            ? 'text-primary border-b-2 border-primary bg-primary/5'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Upload className="w-4 h-4" />
                        {t('common.upload', 'Upload')}
                    </button>
                    <button
                        onClick={() => setActiveTab('generate')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'generate'
                            ? 'text-purple-500 border-b-2 border-purple-500 bg-purple-500/5'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Zap className="w-4 h-4" />
                        {t('superadmin.templateEditor.generateIATitle', 'Generate with AI')}
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
                    {/* Current Thumbnail Preview with Color Swatches */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary">
                        {previewUrl && !previewUrl.includes('data:image/svg+xml') ? (
                            <>
                                {!imageLoaded && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-secondary">
                                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                                <img
                                    src={previewUrl}
                                    alt="Thumbnail preview"
                                    className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                    onLoad={() => setImageLoaded(true)}
                                    onError={(e) => {
                                        console.warn('Thumbnail image failed to load:', previewUrl);
                                        setImageLoaded(true);
                                    }}
                                    crossOrigin="anonymous"
                                />
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-secondary/50">
                                <div className="text-center">
                                    <ImageIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">{t('superadmin.templateEditor.noThumbnail', 'No thumbnail')}</p>
                                </div>
                            </div>
                        )}

                        {/* Color Swatches - Bottom Right Corner */}
                        {themeColors.length > 0 && (
                            <div className="absolute bottom-3 right-3 flex gap-1">
                                {themeColors.map((item, index) => (
                                    <div
                                        key={index}
                                        className="w-4 h-4 rounded-[4px] shadow-lg border border-white/30 transition-transform hover:scale-125"
                                        style={{ backgroundColor: item.color }}
                                        title={`${item.name}: ${item.color}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Upload/Generate Overlay */}
                        {(isUploading || isGeneratingThumbnail) && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                                <p className="text-white text-sm mt-2">
                                    {isGeneratingThumbnail ? t('superadmin.templateEditor.generating', 'Generating...') : t('common.uploading', 'Uploading...')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Color Legend */}
                    {themeColors.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {themeColors.map((item, index) => (
                                <div key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <div
                                        className="w-3 h-3 rounded-[3px] border border-border"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span>{item.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Library Tab */}
                    {activeTab === 'library' && (
                        <div className="space-y-4">
                            {/* Source Toggle & Search */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div className="flex space-x-2 bg-secondary p-1 rounded-lg">
                                    <button
                                        onClick={() => setLibrarySource('global')}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${librarySource === 'global' ? 'bg-blue-500 text-white' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        <Globe size={12} /> {t('superadmin.templateEditor.globalLibrary', 'Global Library')}
                                    </button>
                                    <button
                                        onClick={() => setLibrarySource('user')}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${librarySource === 'user' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {t('superadmin.templateEditor.myUploads', 'My Uploads')}
                                    </button>
                                </div>

                                {/* Search */}
                                <div className="flex items-center gap-2 w-full sm:w-48 bg-editor-border/40 rounded-lg px-3 py-1.5">
                                    <Search size={14} className="text-editor-text-secondary flex-shrink-0" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t('common.search', 'Search...')}
                                        className="flex-1 bg-transparent outline-none text-xs min-w-0"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Images Grid */}
                            <div className="max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                                {imageFiles.length > 0 ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                        {imageFiles.map(file => {
                                            const isSelecting = selectingImageId === file.id;
                                            const isSelected = previewUrl === file.downloadURL;

                                            return (
                                                <button
                                                    key={file.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (!isSelecting && !isUploading) {
                                                            handleSelectFromLibrary(file.downloadURL, file.id);
                                                        }
                                                    }}
                                                    disabled={isUploading}
                                                    className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer group relative transition-all hover:scale-105 disabled:cursor-wait ${isSelected
                                                        ? 'border-primary ring-2 ring-primary/50'
                                                        : 'border-transparent hover:border-primary/50'
                                                        }`}
                                                >
                                                    <img
                                                        src={file.downloadURL}
                                                        alt={file.name}
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                    />
                                                    {isSelecting ? (
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                        </div>
                                                    ) : isSelected ? (
                                                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                            <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                                                                <Check size={16} />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="text-white text-xs font-bold">{t('common.select', 'Select')}</span>
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : searchQuery ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                        <Search size={32} className="mb-2 opacity-50" />
                                        <p className="text-sm">{t('common.noResults', 'No results found')}</p>
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="text-primary hover:underline text-xs mt-2"
                                        >
                                            {t('common.clearSearch', 'Clear search')}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                                        <ImageIcon size={32} className="mb-2 opacity-50" />
                                        <p className="text-sm">
                                            {librarySource === 'user'
                                                ? t('superadmin.templateEditor.noUserImages', 'No images in your library')
                                                : t('superadmin.templateEditor.noGlobalImages', 'No global images available')
                                            }
                                        </p>
                                        {librarySource === 'user' && (
                                            <button
                                                onClick={() => setActiveTab('upload')}
                                                className="text-primary hover:underline text-xs mt-2"
                                            >
                                                {t('superadmin.templateEditor.uploadOne', 'Upload one now')}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Upload Tab */}
                    {activeTab === 'upload' && (
                        <div
                            className={`
                                relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer
                                ${dragActive
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                                }
                            `}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleInputChange}
                                className="hidden"
                            />

                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Upload className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        {t('superadmin.templateEditor.clickOrDrag', 'Drag & drop or click to upload')}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        PNG, JPG, WebP up to 5MB
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Generate Tab */}
                    {activeTab === 'generate' && (
                        <div className="space-y-4 p-4 bg-gradient-to-r from-purple-900/10 to-pink-900/10 rounded-xl border border-purple-500/20">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                <span className="text-sm font-medium text-purple-300">
                                    {t('superadmin.templateEditor.generatorTitle', 'AI Thumbnail Generator')}
                                </span>
                            </div>

                            {/* Prompt Input */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs text-muted-foreground">
                                        {t('superadmin.templateEditor.promptLabel', 'Prompt')}
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={generatePromptSuggestion}
                                            disabled={isEnhancingPrompt}
                                            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
                                            title={t('superadmin.templateEditor.autoGenerate', 'Auto-generate prompt from template')}
                                        >
                                            {isEnhancingPrompt ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-3 h-3" />
                                            )}
                                            {t('superadmin.templateEditor.suggest', 'Suggest')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleEnhancePrompt}
                                            disabled={isEnhancingPrompt || !thumbnailPrompt}
                                            className="flex items-center gap-1 text-xs text-primary hover:text-foreground disabled:opacity-50"
                                        >
                                            {isEnhancingPrompt ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Wand2 className="w-3 h-3" />
                                            )}
                                            {t('superadmin.templateEditor.enhance', 'Enhance')}
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    value={thumbnailPrompt}
                                    onChange={(e) => setThumbnailPrompt(e.target.value)}
                                    placeholder={t('superadmin.templateEditor.describeThumbnail', 'Describe the thumbnail you want to generate...')}
                                    className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:ring-2 focus:ring-purple-500 outline-none resize-none h-24"
                                />
                            </div>

                            {/* Reference Images */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs text-muted-foreground">
                                        {t('dashboard.thumbnailEditor.referenceImages', 'Reference Images')}
                                    </label>
                                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
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
                                            ? 'border-purple-500 bg-purple-500/10'
                                            : 'border-border hover:border-purple-400 hover:bg-secondary/50'
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
                                                <div key={idx} className="relative w-10 h-10 rounded-md overflow-hidden group border border-border">
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
                                                    className="w-10 h-10 flex items-center justify-center border border-dashed border-border rounded-md hover:border-purple-400 hover:bg-secondary text-muted-foreground hover:text-purple-400 transition-all"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-2 text-muted-foreground">
                                            <Upload size={16} className="mb-1" />
                                            <span className="text-[10px] font-medium">{t('dashboard.thumbnailEditor.clickOrDragRef', 'Click or drag images')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Style Selector */}
                            <div>
                                <label className="block text-xs text-muted-foreground mb-2">
                                    {t('superadmin.templateEditor.styleLabel', 'Style')}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {THUMBNAIL_STYLES.map((s) => (
                                        <button
                                            key={s.value}
                                            type="button"
                                            onClick={() => setThumbnailStyle(s.value)}
                                            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${thumbnailStyle === s.value
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-secondary text-muted-foreground hover:bg-secondary/70'
                                                }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Generate Button */}
                            <button
                                type="button"
                                onClick={handleGenerateThumbnail}
                                disabled={isGeneratingThumbnail || !thumbnailPrompt.trim()}
                                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {isGeneratingThumbnail ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t('superadmin.templateEditor.generating', 'Generating...')}
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4" />
                                        {t('superadmin.templateEditor.generateImage', 'Generate Thumbnail')}
                                    </>
                                )}
                            </button>

                            {/* Regenerate hint */}
                            {generatedThumbnail && (
                                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                    <RefreshCw className="w-3 h-3" />
                                    <span>{t('superadmin.templateEditor.regenerate', 'Click generate again to try a new image')}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-5 border-t border-border bg-secondary/30">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >

                        {t('common.cancel', 'Cancel')}
                    </button>
                    {generatedThumbnail ? (
                        <button
                            onClick={applyGeneratedThumbnail}
                            disabled={isUploading}
                            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Zap className="w-4 h-4" />
                            )}
                            {t('common.save', 'Save')}
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            {t('common.save', 'Save')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ThumbnailEditor;

