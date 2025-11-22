
import React, { useState, useRef, useMemo } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { useToast } from '../../contexts/ToastContext';
import { Image, Upload, Zap, Grid, X, Check, Loader2, Wand2, Globe, Search, Filter } from 'lucide-react';
import Modal from './Modal';
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
];

const STYLES = [
    'None', 'Photorealistic', 'Cinematic', 'Anime', 'Digital Art', 
    'Oil Painting', '3D Render', 'Minimalist', 'Cyberpunk', 'Watercolor'
];

const ImagePicker: React.FC<ImagePickerProps> = ({ label, value, onChange }) => {
    const { files, globalFiles, uploadFile, generateImage, enhancePrompt } = useEditor();
    const { success, error: showError } = useToast();
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'library' | 'generate'>('library');
    const [librarySource, setLibrarySource] = useState<'user' | 'global'>('user');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Library filters
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    
    // Generator State
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [style, setStyle] = useState('None');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    const handleFileUpload = async (file: File) => {
        try {
            await uploadFile(file);
            success(`${file.name} uploaded successfully`);
            setIsLibraryOpen(true);
            setActiveTab('library');
            setLibrarySource('user');
        } catch (err) {
            showError('Failed to upload file');
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            const url = await generateImage(prompt, { aspectRatio, style });
            setGeneratedImage(url);
            success('Image generated successfully');
        } catch (error) {
            console.error(error);
            showError('Failed to generate image. Please try again.');
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
            success('Prompt enhanced');
        } catch (error) {
            console.error(error);
            showError('Failed to enhance prompt');
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
                            <span>No image selected</span>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <button 
                    onClick={() => { setIsLibraryOpen(true); setActiveTab('library'); }}
                    className="p-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-secondary hover:text-editor-text-primary hover:border-editor-accent transition-all"
                    title="Open Library / Upload"
                >
                    <Grid size={18} />
                </button>
                <button 
                    onClick={() => { setIsLibraryOpen(true); setActiveTab('generate'); }}
                    className="p-2 bg-editor-bg border border-editor-border rounded-md text-editor-accent hover:bg-editor-accent hover:text-editor-bg transition-all"
                    title="Generate with AI"
                >
                    <Zap size={18} />
                </button>
            </div>

            {/* Main Modal (Combined Library & Generator) */}
            <Modal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)}>
                <div className="bg-editor-bg w-full max-w-4xl h-[85vh] flex flex-col rounded-xl overflow-hidden shadow-2xl border border-editor-border">
                    {/* Header */}
                    <div className="p-4 border-b border-editor-border flex justify-between items-center bg-editor-panel-bg">
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setActiveTab('library')}
                                className={`pb-1 border-b-2 text-sm font-bold transition-colors ${activeTab === 'library' ? 'border-editor-accent text-editor-text-primary' : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'}`}
                            >
                                Asset Library
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
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                                    <div className="flex space-x-2 bg-editor-panel-bg p-1 rounded-lg border border-editor-border">
                                        <button 
                                            onClick={() => setLibrarySource('user')}
                                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${librarySource === 'user' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                                        >
                                            My Uploads
                                        </button>
                                        <button 
                                            onClick={() => setLibrarySource('global')}
                                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center ${librarySource === 'global' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                                        >
                                            <Globe size={12} className="mr-1"/> Global Library
                                        </button>
                                    </div>
                                    
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        {/* Search */}
                                        <div className="relative flex-1 sm:flex-initial sm:w-48">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search images..."
                                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-editor-panel-bg border border-editor-border rounded-lg focus:ring-1 focus:ring-editor-accent focus:outline-none"
                                            />
                                            <Search size={14} className="absolute left-2.5 top-2 text-editor-text-secondary" />
                                        </div>
                                        
                                        {/* Upload Button */}
                                        <DragDropZone
                                            onFileSelect={handleFileUpload}
                                            accept="image/*"
                                            maxSizeMB={10}
                                            variant="compact"
                                        >
                                            <button className="flex items-center gap-2 bg-editor-accent text-editor-bg px-4 py-2 rounded-lg text-sm font-bold hover:bg-editor-accent-hover transition-colors whitespace-nowrap">
                                                <Upload size={16} /> Upload
                                            </button>
                                        </DragDropZone>
                                    </div>
                                </div>
                                
                                {/* Images Grid */}
                                <div className="flex-grow overflow-y-auto custom-scrollbar">
                                    {imageFiles.length > 0 ? (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                            {imageFiles.map(file => (
                                                <div 
                                                    key={file.id} 
                                                    onClick={() => { onChange(file.downloadURL); setIsLibraryOpen(false); success('Image selected'); }}
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
                                                            <span className="text-white text-xs font-bold">Select</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : searchQuery ? (
                                        <div className="h-full flex flex-col items-center justify-center text-editor-text-secondary">
                                            <Search size={48} className="mb-4 opacity-50" />
                                            <p className="font-medium mb-2">No images found</p>
                                            <p className="text-sm mb-4">Try a different search term</p>
                                            <button 
                                                onClick={() => setSearchQuery('')}
                                                className="text-editor-accent hover:underline text-sm"
                                            >
                                                Clear search
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-editor-text-secondary border-2 border-dashed border-editor-border rounded-xl">
                                            <Image size={48} className="mb-4 opacity-50" />
                                            <p className="mb-2">{librarySource === 'user' ? 'No images found in your library.' : 'No global images available.'}</p>
                                            {librarySource === 'user' && (
                                                <DragDropZone
                                                    onFileSelect={handleFileUpload}
                                                    accept="image/*"
                                                    maxSizeMB={10}
                                                    variant="compact"
                                                >
                                                    <button className="mt-4 text-editor-accent hover:underline">Upload one now</button>
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
                                    <div className="w-1/3 flex flex-col gap-5 border-r border-editor-border pr-6 overflow-y-auto">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-sm font-bold text-white">Prompt</label>
                                                <button 
                                                    onClick={handleEnhancePrompt}
                                                    disabled={isEnhancing || !prompt}
                                                    className="flex items-center text-xs text-editor-accent hover:text-white transition-colors disabled:opacity-50"
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
                                                className="w-full bg-editor-panel-bg border border-editor-border rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-editor-accent outline-none resize-none h-32 mb-4"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2">Aspect Ratio</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {ASPECT_RATIOS.map(ratio => (
                                                    <button
                                                        key={ratio.value}
                                                        onClick={() => setAspectRatio(ratio.value)}
                                                        className={`text-xs py-2 rounded-md border transition-all ${aspectRatio === ratio.value ? 'bg-editor-accent text-editor-bg border-editor-accent font-bold' : 'bg-editor-bg text-editor-text-secondary border-editor-border hover:border-editor-text-secondary'}`}
                                                    >
                                                        {ratio.value}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2">Style</label>
                                            <select 
                                                value={style}
                                                onChange={(e) => setStyle(e.target.value)}
                                                className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-editor-accent"
                                            >
                                                {STYLES.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-editor-border">
                                            <button 
                                                onClick={handleGenerate}
                                                disabled={isGenerating || !prompt}
                                                className="w-full py-3 bg-gradient-to-r from-editor-accent to-orange-500 text-white font-bold rounded-lg shadow-lg hover:shadow-editor-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                                            >
                                                {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Zap className="mr-2" />}
                                                {isGenerating ? 'Dreaming...' : 'Generate Image'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Preview Side */}
                                    <div className="w-2/3 flex flex-col">
                                        <div className="flex-grow flex items-center justify-center bg-black/20 rounded-xl border border-editor-border overflow-hidden relative mb-4">
                                            {isGenerating ? (
                                                <div className="text-center">
                                                    <div className="w-16 h-16 border-4 border-editor-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                                    <p className="text-editor-accent font-medium animate-pulse">Creating masterpiece...</p>
                                                    <p className="text-xs text-editor-text-secondary mt-2">Powered by Quimera.ai</p>
                                                </div>
                                            ) : generatedImage ? (
                                                <div className="relative w-full h-full group flex items-center justify-center bg-black">
                                                    <img src={generatedImage} alt="Generated" className="max-w-full max-h-full object-contain" />
                                                </div>
                                            ) : (
                                                <div className="text-center text-editor-text-secondary opacity-50">
                                                    <Zap size={48} className="mx-auto mb-4" />
                                                    <p>Enter a prompt and adjust controls to start.</p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {generatedImage && (
                                            <div className="flex justify-end">
                                                <button 
                                                    onClick={() => { onChange(generatedImage); setIsLibraryOpen(false); success('Generated image applied'); }}
                                                    className="flex items-center gap-2 bg-editor-accent text-editor-bg px-6 py-2 rounded-lg font-bold shadow-lg transform transition-all hover:scale-105 hover:bg-white"
                                                >
                                                    <Check size={18} /> Use This Image
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ImagePicker;
