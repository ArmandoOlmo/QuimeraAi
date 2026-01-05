import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFiles } from '../../contexts/files';
import { useAI } from '../../contexts/ai';
import { useProject } from '../../contexts/project';
import { useToast } from '../../contexts/ToastContext';
import { Image, Upload, Zap, Grid, X, Check, Loader2, Wand2, Globe, Search, Brain, Users, Thermometer, Sparkles, Eye, Flame, Layers, Rocket, FolderOpen } from 'lucide-react';
import DragDropZone from './DragDropZone';
import { searchFiles, filterFilesByType, FileTypeFilter } from '../../utils/fileHelpers';

interface ImagePickerProps {
    label: string;
    value: string;
    onChange: (url: string) => void;
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

const ImagePicker: React.FC<ImagePickerProps> = ({ label, value, onChange }) => {
    const { t } = useTranslation();
    const { files, globalFiles, uploadFile } = useFiles();
    const { generateImage, enhancePrompt } = useAI();
    const { projects, activeProjectId, activeProject } = useProject();
    const { success, error: showError } = useToast();
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'library' | 'generate'>('library');
    const [librarySource, setLibrarySource] = useState<'user' | 'global'>('user');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Library filters - default to current project if available
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>(activeProjectId || 'all');
    
    // Update filter when active project changes
    useEffect(() => {
        if (activeProjectId && librarySource === 'user') {
            setSelectedProjectFilter(activeProjectId);
        }
    }, [activeProjectId, librarySource]);
    
    // Generator State
    const [prompt, setPrompt] = useState('');
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

    const handleFileUpload = async (file: File) => {
        try {
            // Upload file to active project (project is automatically set by FilesContext)
            await uploadFile(file);
            success(t('dashboard.imagePicker.uploadSuccess', { name: file.name }));
            setIsLibraryOpen(true);
            setActiveTab('library');
            setLibrarySource('user');
            // Auto-select the current project filter if there's an active project
            if (activeProjectId) {
                setSelectedProjectFilter(activeProjectId);
            }
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

    // Filter and search image files
    const sourceFiles = librarySource === 'user' ? files : globalFiles;
    const imageFiles = useMemo(() => {
        let result = sourceFiles.filter(f => f.type.startsWith('image/'));
        
        if (searchQuery) {
            result = searchFiles(result, searchQuery);
        }
        
        return result;
    }, [sourceFiles, searchQuery]);

    // Group images by project (only for user files)
    const imagesByProject = useMemo(() => {
        if (librarySource === 'global') {
            return { 'global': imageFiles };
        }

        const grouped: { [key: string]: typeof imageFiles } = {
            'no-project': []
        };

        imageFiles.forEach(file => {
            const projectKey = file.projectId || 'no-project';
            if (!grouped[projectKey]) {
                grouped[projectKey] = [];
            }
            grouped[projectKey].push(file);
        });

        return grouped;
    }, [imageFiles, librarySource]);

    // Get project names for display
    const projectNames = useMemo(() => {
        const names: { [key: string]: string } = {
            'no-project': t('dashboard.imagePicker.unassignedImages'),
            'global': t('dashboard.imagePicker.globalLibrary')
        };

        projects.forEach(project => {
            names[project.id] = project.name;
        });

        return names;
    }, [projects, t]);

    // Filter images by selected project
    const filteredImagesByProject = useMemo(() => {
        if (selectedProjectFilter === 'all') {
            return imagesByProject;
        }
        
        if (imagesByProject[selectedProjectFilter]) {
            return { [selectedProjectFilter]: imagesByProject[selectedProjectFilter] };
        }
        
        return {};
    }, [imagesByProject, selectedProjectFilter]);

    return (
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
                <div className="relative flex-grow h-10 bg-editor-panel-bg border border-editor-border rounded-md overflow-hidden flex items-center justify-center">
                    {value ? (
                        <img src={value} alt="Preview" className="h-full w-full object-cover" />
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

            {/* Main Modal (Combined Library & Generator) */}
            {isLibraryOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up"
                    onClick={() => setIsLibraryOpen(false)}
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
                            <button 
                                onClick={() => setActiveTab('generate')}
                                className={`pb-1 border-b-2 text-sm font-bold transition-colors flex items-center gap-1 ${activeTab === 'generate' ? 'border-editor-accent text-editor-accent' : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'}`}
                            >
                                <Zap size={14} /> Quimera.ai
                            </button>
                        </div>
                        <button onClick={() => setIsLibraryOpen(false)} className="p-1 rounded-full hover:bg-editor-border"><X size={20}/></button>
                    </div>

                    {/* Content */}
                    <div className="flex-grow overflow-hidden p-6 bg-editor-bg">
                        
                        {/* LIBRARY TAB */}
                        {activeTab === 'library' && (
                            <div className="h-full flex flex-col">
                                {/* Library Controls */}
                                <div className="space-y-3 mb-4">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <div className="flex space-x-2 bg-editor-panel-bg p-1 rounded-lg border border-editor-border">
                                            <button 
                                                onClick={() => { setLibrarySource('user'); setSelectedProjectFilter('all'); }}
                                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${librarySource === 'user' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                                            >
                                                {t('dashboard.imagePicker.myUploads')}
                                            </button>
                                            <button 
                                                onClick={() => { setLibrarySource('global'); setSelectedProjectFilter('all'); }}
                                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center ${librarySource === 'global' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                                            >
                                                <Globe size={12} className="mr-1"/> {t('dashboard.imagePicker.globalLibrary')}
                                            </button>
                                        </div>
                                        
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            {/* Search */}
                                            <div className="flex items-center gap-2 flex-1 sm:flex-initial sm:w-48 bg-editor-border/40 rounded-lg px-3 py-1.5">
                                                <Search size={14} className="text-editor-text-secondary flex-shrink-0" />
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder={t('dashboard.imagePicker.searchImages')}
                                                    className="flex-1 bg-transparent outline-none text-xs min-w-0"
                                                />
                                                {searchQuery && (
                                                    <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                                        <X size={12} />
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
                                                <button className="flex items-center gap-2 bg-editor-accent text-editor-bg px-4 py-2 rounded-lg text-sm font-bold hover:bg-editor-accent-hover transition-colors whitespace-nowrap">
                                                    <Upload size={16} /> {t('dashboard.imagePicker.upload')}
                                                </button>
                                            </DragDropZone>
                                        </div>
                                    </div>

                                    {/* Project Filter - Always visible for user library */}
                                    {librarySource === 'user' && (
                                        <div className="p-3 bg-editor-panel-bg rounded-lg border border-editor-border">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs font-bold text-editor-text-secondary uppercase">{t('dashboard.imagePicker.filterByProject')}</label>
                                                {activeProjectId && selectedProjectFilter !== activeProjectId && (
                                                    <button
                                                        onClick={() => setSelectedProjectFilter(activeProjectId)}
                                                        className="text-xs text-editor-accent hover:underline"
                                                    >
                                                        {t('dashboard.imagePicker.showCurrentProject')}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                <button
                                                    onClick={() => setSelectedProjectFilter('all')}
                                                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                                        selectedProjectFilter === 'all' 
                                                            ? 'bg-editor-accent text-editor-bg font-bold' 
                                                            : 'bg-editor-bg border border-editor-border text-editor-text-secondary hover:border-editor-accent'
                                                    }`}
                                                >
                                                    {t('dashboard.imagePicker.allProjects')}
                                                </button>
                                                {projects.filter(p => p.status !== 'Template').map(project => (
                                                    <button
                                                        key={project.id}
                                                        onClick={() => setSelectedProjectFilter(project.id)}
                                                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
                                                            selectedProjectFilter === project.id 
                                                                ? 'bg-editor-accent text-editor-bg font-bold' 
                                                                : project.id === activeProjectId
                                                                    ? 'bg-editor-accent/20 border border-editor-accent text-editor-accent'
                                                                    : 'bg-editor-bg border border-editor-border text-editor-text-secondary hover:border-editor-accent'
                                                        }`}
                                                    >
                                                        {project.id === activeProjectId && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                        )}
                                                        {project.name}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setSelectedProjectFilter('no-project')}
                                                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                                        selectedProjectFilter === 'no-project' 
                                                            ? 'bg-editor-accent text-editor-bg font-bold' 
                                                            : 'bg-editor-bg border border-editor-border text-editor-text-secondary hover:border-editor-accent'
                                                    }`}
                                                >
                                                    {t('dashboard.imagePicker.unassignedImages')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Images Grid - Grouped by Project */}
                                <div className="flex-grow overflow-y-auto custom-scrollbar">
                                    {Object.keys(filteredImagesByProject).length > 0 && Object.values(filteredImagesByProject).some(arr => arr.length > 0) ? (
                                        <div className="space-y-6">
                                            {Object.entries(filteredImagesByProject).map(([projectId, projectImages]) => {
                                                if (projectImages.length === 0) return null;
                                                
                                                return (
                                                    <div key={projectId} className="space-y-3">
                                                        {/* Project Header (only show if user library and not filtered to single project) */}
                                                        {librarySource === 'user' && selectedProjectFilter === 'all' && (
                                                            <div className="flex items-center gap-2 pb-2 border-b border-editor-border/50">
                                                                <h3 className="text-sm font-bold text-editor-text-primary">
                                                                    {projectNames[projectId] || 'Unknown Project'}
                                                                </h3>
                                                                <span className="text-xs text-editor-text-secondary bg-editor-panel-bg px-2 py-0.5 rounded-md">
                                                                    {projectImages.length} {projectImages.length === 1 ? t('dashboard.imagePicker.image') : t('dashboard.imagePicker.images')}
                                                                </span>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Project Images Grid */}
                                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                                            {projectImages.map(file => (
                                                                <div 
                                                                    key={file.id} 
                                                                    onClick={() => { onChange(file.downloadURL); setIsLibraryOpen(false); success(t('dashboard.imagePicker.imageSelected')); }}
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
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : searchQuery || (selectedProjectFilter !== 'all' && librarySource === 'user') ? (
                                        <div className="h-full flex flex-col items-center justify-center text-editor-text-secondary">
                                            <Search size={48} className="mb-4 opacity-50" />
                                            <p className="font-medium mb-2">{t('dashboard.imagePicker.noImagesFound')}</p>
                                            <p className="text-sm mb-4">{t('dashboard.imagePicker.tryAdjustingFilters')}</p>
                                            <button 
                                                onClick={() => { setSearchQuery(''); setSelectedProjectFilter('all'); }}
                                                className="text-editor-accent hover:underline text-sm"
                                            >
                                                {t('dashboard.imagePicker.clearFilters')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-editor-text-secondary border-2 border-dashed border-editor-border rounded-xl">
                                            <Image size={48} className="mb-4 opacity-50" />
                                            <p className="mb-2">{librarySource === 'user' ? t('dashboard.imagePicker.noImagesInLibrary') : t('dashboard.imagePicker.noGlobalImages')}</p>
                                            {librarySource === 'user' && (
                                                <DragDropZone
                                                    onFileSelect={handleFileUpload}
                                                    accept="image/*"
                                                    maxSizeMB={10}
                                                    variant="compact"
                                                >
                                                    <button className="mt-4 text-editor-accent hover:underline">{t('dashboard.imagePicker.uploadOneNow')}</button>
                                                </DragDropZone>
                                            )}
                                        </div>
                                    )}
                                </div>
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
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                                                            selectedModel === model.value 
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
                                                <label className="block text-sm font-bold text-white">{t('dashboard.imagePicker.prompt')}</label>
                                                <button 
                                                    onClick={handleEnhancePrompt}
                                                    disabled={isEnhancing || !prompt}
                                                    className="flex items-center text-xs text-editor-accent hover:text-white transition-colors disabled:opacity-50"
                                                    title={t('dashboard.imagePicker.enhanceTooltip')}
                                                >
                                                    {isEnhancing ? <Loader2 size={12} className="animate-spin mr-1"/> : <Wand2 size={12} className="mr-1"/>}
                                                    {t('dashboard.imagePicker.enhance')}
                                                </button>
                                            </div>
                                            <textarea 
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                placeholder={t('dashboard.imagePicker.promptPlaceholder')}
                                                className="w-full bg-editor-panel-bg border-2 border-editor-border rounded-lg p-3 text-sm text-white focus:border-editor-accent outline-none resize-none h-40 transition-colors"
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
                                                className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-editor-accent"
                                            />
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
                                                className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-editor-accent"
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
                                                                className={`text-xs py-1 px-2 rounded-full transition-all ${
                                                                    thinkingLevel === level.value 
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
                                                            className={`text-xs py-1 px-2 rounded-full transition-all ${
                                                                personGeneration === 'allow_adult' 
                                                                    ? 'bg-editor-accent text-editor-bg font-medium' 
                                                                    : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg'
                                                            }`}
                                                        >
                                                            {t('dashboard.imagePicker.allow')}
                                                        </button>
                                                        <button
                                                            onClick={() => setPersonGeneration('dont_allow')}
                                                            className={`text-xs py-1 px-2 rounded-full transition-all ${
                                                                personGeneration === 'dont_allow' 
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
                                                    onClick={() => { onChange(generatedImage); setIsLibraryOpen(false); success(t('dashboard.imagePicker.generatedImageApplied')); }}
                                                    className="flex items-center gap-2 bg-editor-accent text-editor-bg px-6 py-2 rounded-lg font-bold shadow-lg transform transition-all hover:scale-105 hover:bg-white"
                                                >
                                                    <Check size={18} /> {t('dashboard.imagePicker.useThisImage')}
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
        </div>
    );
};

export default ImagePicker;