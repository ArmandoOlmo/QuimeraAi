import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Zap, Sparkles, Wand2, RefreshCw, Grid, Globe, Search, Check } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { useTranslation } from 'react-i18next';
import { generateContentViaProxy, extractTextFromResponse } from '../../utils/geminiProxyClient';
import { Project } from '../../types';
import { searchFiles } from '../../utils/fileHelpers';

interface ThumbnailEditorProps {
    project: Project;
    onClose: () => void;
    onUpdate?: () => void;
}

// Style options for AI generation
const THUMBNAIL_STYLES = [
    { label: 'Minimalist', value: 'Minimalist' },
    { label: 'Photorealistic', value: 'Photorealistic' },
    { label: 'Digital Art', value: 'Digital Art' },
    { label: '3D Render', value: '3D Render' },
    { label: 'Cyberpunk', value: 'Cyberpunk' },
];

const ThumbnailEditor: React.FC<ThumbnailEditorProps> = ({ project, onClose, onUpdate }) => {
    const { t } = useTranslation();
    const { updateProjectThumbnail, generateImage, enhancePrompt, hasApiKey, promptForKeySelection, handleApiError, activeProject, user, files, globalFiles } = useEditor();
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
    
    // Library state
    const [librarySource, setLibrarySource] = useState<'user' | 'global'>('global');
    const [searchQuery, setSearchQuery] = useState('');

    // Reset image loaded state when preview URL changes
    useEffect(() => {
        setImageLoaded(false);
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
    const handleSelectFromLibrary = async (imageUrl: string) => {
        setIsUploading(true);
        try {
            // Fetch the image and convert to file
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], `thumbnail-${Date.now()}.png`, { type: blob.type || 'image/png' });
            
            await updateProjectThumbnail(project.id, file);
            setPreviewUrl(imageUrl);
            onUpdate?.();
            onClose();
        } catch (error) {
            console.error('Error applying thumbnail from library:', error);
            alert('Failed to apply thumbnail');
        } finally {
            setIsUploading(false);
        }
    };

    // Analyze color palette for AI prompt generation
    const analyzeColorPalette = (colors: { name: string; color: string }[]): string => {
        if (colors.length === 0) return 'No colors detected';

        const characteristics: string[] = [];

        colors.forEach(({ color }) => {
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
            const response = await generateContentViaProxy(projectId, prompt, 'gemini-2.0-flash', {}, user?.uid);
            const responseText = extractTextFromResponse(response);

            setThumbnailPrompt(responseText.trim());
        } catch (error) {
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

    // Generate thumbnail with AI
    const handleGenerateThumbnail = async () => {
        if (!thumbnailPrompt.trim()) return;

        if (hasApiKey === false) {
            await promptForKeySelection();
            return;
        }

        setIsGeneratingThumbnail(true);
        try {
            const url = await generateImage(thumbnailPrompt, {
                aspectRatio: '16:9',
                style: thumbnailStyle,
                destination: 'user',
                resolution: '2K',
            });
            setGeneratedThumbnail(url);
            setPreviewUrl(url);
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            handleApiError(error);
        } finally {
            setIsGeneratingThumbnail(false);
        }
    };

    // Apply generated thumbnail to the project
    const applyGeneratedThumbnail = async () => {
        if (!generatedThumbnail) return;

        setIsUploading(true);
        try {
            // Fetch the generated image and convert to file
            const response = await fetch(generatedThumbnail);
            const blob = await response.blob();
            const file = new File([blob], `thumbnail-${Date.now()}.png`, { type: 'image/png' });
            
            await updateProjectThumbnail(project.id, file);
            onUpdate?.();
            onClose();
        } catch (error) {
            console.error('Error applying thumbnail:', error);
            alert('Failed to apply thumbnail');
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelect = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB');
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
            
            onUpdate?.();
        } catch (error) {
            console.error('Error uploading thumbnail:', error);
            alert('Failed to upload thumbnail');
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
                            <h2 className="text-lg font-semibold text-foreground">{t('superadmin.templateThumbnail', { defaultValue: 'Change Thumbnail' })}</h2>
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
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'library'
                                ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/5'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Grid className="w-4 h-4" />
                        {t('editor.library', { defaultValue: 'Library' })}
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'upload'
                                ? 'text-primary border-b-2 border-primary bg-primary/5'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Upload className="w-4 h-4" />
                        {t('common.upload', { defaultValue: 'Upload' })}
                    </button>
                    <button
                        onClick={() => setActiveTab('generate')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'generate'
                                ? 'text-purple-500 border-b-2 border-purple-500 bg-purple-500/5'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Zap className="w-4 h-4" />
                        {t('editor.generateWithAI', { defaultValue: 'Generate with AI' })}
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
                                    onError={() => setImageLoaded(true)}
                                />
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-secondary/50">
                                <div className="text-center">
                                    <ImageIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">{t('superadmin.noThumbnail', { defaultValue: 'No thumbnail' })}</p>
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
                                    {isGeneratingThumbnail ? t('editor.dreaming', { defaultValue: 'Generating...' }) : 'Uploading...'}
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
                                        <Globe size={12} /> {t('editor.globalLibrary', { defaultValue: 'Global Library' })}
                                    </button>
                                    <button 
                                        onClick={() => setLibrarySource('user')}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${librarySource === 'user' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {t('editor.myUploads', { defaultValue: 'My Uploads' })}
                                    </button>
                                </div>
                                
                                {/* Search */}
                                <div className="relative w-full sm:w-48">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t('common.search', { defaultValue: 'Search...' })}
                                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary border border-border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                                    />
                                    <Search size={14} className="absolute left-2.5 top-2 text-muted-foreground" />
                                </div>
                            </div>
                            
                            {/* Images Grid */}
                            <div className="max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                                {imageFiles.length > 0 ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                        {imageFiles.map(file => (
                                            <div 
                                                key={file.id} 
                                                onClick={() => handleSelectFromLibrary(file.downloadURL)}
                                                className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer group relative transition-all hover:scale-105 ${
                                                    previewUrl === file.downloadURL 
                                                        ? 'border-primary ring-2 ring-primary/50' 
                                                        : 'border-transparent hover:border-primary/50'
                                                }`}
                                            >
                                                <img 
                                                    src={file.downloadURL} 
                                                    alt={file.name} 
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                                                />
                                                {previewUrl === file.downloadURL ? (
                                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                        <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                                                            <Check size={16} />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <span className="text-white text-xs font-bold">{t('common.select', { defaultValue: 'Select' })}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : searchQuery ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                        <Search size={32} className="mb-2 opacity-50" />
                                        <p className="text-sm">{t('common.noResults', { defaultValue: 'No images found' })}</p>
                                        <button 
                                            onClick={() => setSearchQuery('')}
                                            className="text-primary hover:underline text-xs mt-2"
                                        >
                                            {t('common.clearSearch', { defaultValue: 'Clear search' })}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                                        <ImageIcon size={32} className="mb-2 opacity-50" />
                                        <p className="text-sm">
                                            {librarySource === 'user' 
                                                ? t('editor.noUserImages', { defaultValue: 'No images in your library' })
                                                : t('editor.noGlobalImages', { defaultValue: 'No global images available' })
                                            }
                                        </p>
                                        {librarySource === 'user' && (
                                            <button 
                                                onClick={() => setActiveTab('upload')}
                                                className="text-primary hover:underline text-xs mt-2"
                                            >
                                                {t('editor.uploadOne', { defaultValue: 'Upload one now' })}
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
                                        {t('editor.clickOrDrag', { defaultValue: 'Drag & drop or click to upload' })}
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
                                    {t('superadmin.aiThumbnailGenerator', { defaultValue: 'AI Thumbnail Generator' })}
                                </span>
                            </div>

                            {/* Prompt Input */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs text-muted-foreground">
                                        {t('editor.prompt', { defaultValue: 'Prompt' })}
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={generatePromptSuggestion}
                                            disabled={isEnhancingPrompt}
                                            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
                                            title={t('superadmin.autoGeneratePrompt', { defaultValue: 'Auto-generate prompt from template' })}
                                        >
                                            {isEnhancingPrompt ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-3 h-3" />
                                            )}
                                            {t('superadmin.suggest', { defaultValue: 'Suggest' })}
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
                                            {t('editor.enhance', { defaultValue: 'Enhance' })}
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    value={thumbnailPrompt}
                                    onChange={(e) => setThumbnailPrompt(e.target.value)}
                                    placeholder={t('superadmin.describeThumbnail', { defaultValue: 'Describe the thumbnail you want to generate...' })}
                                    className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:ring-2 focus:ring-purple-500 outline-none resize-none h-24"
                                />
                            </div>

                            {/* Style Selector */}
                            <div>
                                <label className="block text-xs text-muted-foreground mb-2">
                                    {t('editor.style', { defaultValue: 'Style' })}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {THUMBNAIL_STYLES.map((s) => (
                                        <button
                                            key={s.value}
                                            type="button"
                                            onClick={() => setThumbnailStyle(s.value)}
                                            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                                                thumbnailStyle === s.value
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
                                        {t('editor.dreaming', { defaultValue: 'Generating...' })}
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4" />
                                        {t('editor.generateImage', { defaultValue: 'Generate Thumbnail' })}
                                    </>
                                )}
                            </button>

                            {/* Regenerate hint */}
                            {generatedThumbnail && (
                                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                    <RefreshCw className="w-3 h-3" />
                                    <span>{t('superadmin.regenerate', { defaultValue: 'Click generate again to try a new image' })}</span>
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
                        {t('common.cancel', { defaultValue: 'Cancel' })}
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
                            {t('common.save', { defaultValue: 'Save' })}
                        </button>
                    ) : (
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            {t('common.save', { defaultValue: 'Save' })}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ThumbnailEditor;

