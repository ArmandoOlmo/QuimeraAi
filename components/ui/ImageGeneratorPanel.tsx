import React, { useState, useRef } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { useTranslation } from 'react-i18next';
import { Zap, Loader2, Wand2, X, Download, Upload, Image as ImageIcon, Plus } from 'lucide-react';

interface ImageGeneratorPanelProps {
    destination: 'user' | 'global';
    className?: string;
}

const ImageGeneratorPanel: React.FC<ImageGeneratorPanelProps> = ({ destination, className = '' }) => {
    const { generateImage, enhancePrompt } = useEditor();
    const { t } = useTranslation();
    
    // Translation-dependent constants
    const ASPECT_RATIOS = [
        { label: t('editor.square'), value: '1:1' },
        { label: t('editor.landscape'), value: '16:9' },
        { label: t('editor.portrait'), value: '9:16' },
        { label: t('editor.classic'), value: '4:3' },
        { label: t('editor.tall'), value: '3:4' },
        { label: t('editor.cinematic'), value: '21:9' },
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
        { label: t('editor.standard'), value: '1K' },
        { label: t('editor.highQuality'), value: '2K' },
        { label: t('editor.ultraHD'), value: '4K' },
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

    const THEME_COLORS = [
        { label: t('editor.none'), value: 'None' },
        { 
            label: t('editor.lightModePorcelain'), 
            value: 'Light Theme',
            description: t('editor.lightModeDesc')
        },
        { 
            label: t('editor.darkModePurple'), 
            value: 'Dark Theme',
            description: t('editor.darkModeDesc')
        },
        { 
            label: t('editor.blackModeOLED'), 
            value: 'Black Theme',
            description: t('editor.blackModeDesc')
        },
        {
            label: t('editor.quimeraBrand'),
            value: 'Quimera Brand',
            description: t('editor.quimeraBrandDesc')
        }
    ];

    const DEPTH_OF_FIELD = [
        { label: t('editor.none'), value: 'None' },
        { label: t('editor.shallow'), value: 'Shallow (Bokeh Background)' },
        { label: t('editor.deep'), value: 'Deep (All in Focus)' },
        { label: t('editor.medium'), value: 'Medium (Balanced)' },
        { label: t('editor.tiltShift'), value: 'Tilt-Shift Effect' }
    ];
    
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [style, setStyle] = useState('None');
    const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('4K');
    const [lighting, setLighting] = useState('None');
    const [cameraAngle, setCameraAngle] = useState('None');
    const [colorGrading, setColorGrading] = useState('None');
    const [themeColors, setThemeColors] = useState('None');
    const [depthOfField, setDepthOfField] = useState('None');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    
    // Reference Images State
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFiles = (files: FileList | File[]) => {
        const remainingSlots = 14 - referenceImages.length;
        
        if (remainingSlots <= 0) {
            alert(t('editor.maxImagesAlert'));
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
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            const options = {
                aspectRatio, 
                style, 
                destination,
                resolution,
                lighting: lighting !== 'None' ? lighting : undefined,
                cameraAngle: cameraAngle !== 'None' ? cameraAngle : undefined,
                colorGrading: colorGrading !== 'None' ? colorGrading : undefined,
                themeColors: themeColors !== 'None' ? themeColors : undefined,
                depthOfField: depthOfField !== 'None' ? depthOfField : undefined,
                referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
            };
            
            console.log('🖼️ [ImageGeneratorPanel] Sending options to generateImage:', options);
            
            const url = await generateImage(prompt, options);
            setGeneratedImage(url);
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
            // Pass reference images to the enhancer so it can analyze them
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
        setPrompt('');
        setReferenceImages([]);
    };

    return (
        <div className={`bg-editor-bg flex flex-col rounded-xl overflow-hidden shadow-sm border border-editor-border h-full ${className}`}>
             {/* Header */}
             <div className="p-4 border-b border-editor-border flex justify-between items-center bg-editor-panel-bg">
                 <div className="flex items-center gap-2 flex-wrap">
                    <Zap size={20} className="text-editor-accent" />
                    <h2 className="text-lg font-bold text-editor-text-primary">{t('editor.quimeraImageGenerator')}</h2>
                    <span className="text-xs text-editor-accent bg-editor-accent/10 px-2 py-0.5 rounded-full border border-editor-accent/30 font-semibold">
                        {t('editor.ultraHD')}
                    </span>
                 </div>
             </div>

             {/* Content */}
             <div className="flex-grow overflow-hidden p-6 bg-editor-bg">
                 <div className="flex gap-6 h-full flex-col md:flex-row">
                     {/* Controls Side */}
                     <div className="w-full md:w-1/3 flex flex-col gap-5 md:border-r border-editor-border md:pr-6 overflow-y-auto custom-scrollbar">
                         <div>
                             <div className="flex justify-between items-center mb-2">
                                 <label className="block text-sm font-bold text-editor-text-primary">{t('editor.prompt')}</label>
                                 <button 
                                    onClick={handleEnhancePrompt}
                                    disabled={isEnhancing || !prompt}
                                    className="flex items-center text-xs text-editor-accent hover:text-white transition-colors disabled:opacity-50"
                                    title={t('editor.enhancePromptTitle')}
                                 >
                                     {isEnhancing ? <Loader2 size={12} className="animate-spin mr-1"/> : <Wand2 size={12} className="mr-1"/>}
                                     {t('editor.enhance')}
                                 </button>
                             </div>
                             <textarea 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={t('editor.describeImage')}
                                className="w-full bg-editor-panel-bg border border-editor-border rounded-lg p-3 text-sm text-editor-text-primary focus:ring-2 focus:ring-editor-accent outline-none resize-none h-32 mb-4"
                             />
                         </div>

                         {/* Reference Image Upload */}
                         <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-editor-text-secondary uppercase">{t('editor.referenceImages')}</label>
                                <span className="text-xs text-editor-text-secondary">{referenceImages.length}/14</span>
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
                                className={`border-2 border-dashed rounded-lg p-4 transition-all ${isDragging ? 'border-editor-accent bg-editor-accent/10' : 'border-editor-border hover:border-editor-accent hover:bg-editor-panel-bg'}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                {referenceImages.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2 mb-2">
                                        {referenceImages.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-md overflow-hidden group border border-editor-border">
                                                <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveReferenceImage(idx); }}
                                                    className="absolute top-1 right-1 p-1 bg-destructive/90 hover:bg-destructive rounded-full text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                        {referenceImages.length < 14 && (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="aspect-square flex flex-col items-center justify-center gap-1 border border-editor-border rounded-md hover:bg-editor-panel-bg text-editor-text-secondary hover:text-editor-accent transition-colors"
                                            >
                                                <Plus size={16} />
                                                <span className="text-[10px]">{t('editor.add')}</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full flex flex-col items-center gap-2 text-editor-text-secondary py-4"
                                    >
                                        <Upload size={24} />
                                        <span className="text-xs font-medium">{t('editor.clickOrDrag')}</span>
                                        <span className="text-xs opacity-70">{t('editor.upToImages')}</span>
                                    </button>
                                )}
                            </div>
                         </div>

                         <div>
                             <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2">{t('editor.aspectRatio')}</label>
                             <div className="grid grid-cols-3 gap-2">
                                 {ASPECT_RATIOS.map(ratio => (
                                     <button
                                        key={ratio.value}
                                        onClick={() => setAspectRatio(ratio.value)}
                                        className={`text-xs py-2 rounded-md border transition-all ${aspectRatio === ratio.value ? 'bg-editor-accent text-editor-bg border-editor-accent font-bold' : 'bg-editor-bg text-editor-text-secondary border-editor-border hover:border-editor-text-secondary hover:text-editor-text-primary'}`}
                                        title={ratio.label}
                                     >
                                         {ratio.value}
                                     </button>
                                 ))}
                             </div>
                         </div>

                        <div>
                            <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2">{t('editor.style')}</label>
                            <select 
                               value={style}
                               onChange={(e) => setStyle(e.target.value)}
                               className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:border-editor-accent"
                            >
                                {STYLES.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2">{t('editor.resolution')}</label>
                            <div className="grid grid-cols-3 gap-2">
                                {RESOLUTIONS.map(res => (
                                    <button
                                       key={res.value}
                                       onClick={() => setResolution(res.value as '1K' | '2K' | '4K')}
                                       className={`text-xs py-2 rounded-md border transition-all ${resolution === res.value ? 'bg-editor-accent text-editor-bg border-editor-accent font-bold' : 'bg-editor-bg text-editor-text-secondary border-editor-border hover:border-editor-text-secondary hover:text-editor-text-primary'}`}
                                    >
                                        {res.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Advanced Controls Toggle */}
                        <div className="border-t border-editor-border pt-3">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="text-xs text-editor-accent hover:text-white transition-colors flex items-center justify-between w-full"
                            >
                                <span className="font-bold uppercase">{t('editor.advancedControls')}</span>
                                <span className="text-lg">{showAdvanced ? '−' : '+'}</span>
                            </button>
                        </div>

                        {showAdvanced && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2">{t('editor.lighting')}</label>
                                    <select 
                                       value={lighting}
                                       onChange={(e) => setLighting(e.target.value)}
                                       className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                    >
                                        {LIGHTING_OPTIONS.map(l => (
                                            <option key={l.value} value={l.value}>{l.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2">{t('editor.cameraAngle')}</label>
                                    <select 
                                       value={cameraAngle}
                                       onChange={(e) => setCameraAngle(e.target.value)}
                                       className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                    >
                                        {CAMERA_ANGLES.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2">{t('editor.colorGrading')}</label>
                                    <select 
                                       value={colorGrading}
                                       onChange={(e) => setColorGrading(e.target.value)}
                                       className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                    >
                                        {COLOR_GRADING.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2">{t('editor.depthOfField')}</label>
                                    <select 
                                       value={depthOfField}
                                       onChange={(e) => setDepthOfField(e.target.value)}
                                       className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                    >
                                        {DEPTH_OF_FIELD.map(d => (
                                            <option key={d.value} value={d.value}>{d.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="mt-auto pt-4 border-t border-editor-border">
                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating || !prompt}
                                className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                            >
                                {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Zap className="mr-2" />}
                                {isGenerating ? t('editor.dreaming') : t('editor.generateImage')}
                            </button>
                         </div>
                     </div>

                     {/* Preview Side */}
                     <div className="w-full md:w-2/3 flex flex-col h-full min-h-[300px]">
                         <div className="flex-grow flex items-center justify-center bg-black/20 rounded-xl border border-editor-border overflow-hidden relative mb-4">
                             {isGenerating ? (
                                 <div className="text-center">
                                     <div className="w-16 h-16 border-4 border-editor-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                     <p className="text-editor-accent font-medium animate-pulse">{t('editor.creatingInResolution', { resolution })}</p>
                                     <p className="text-xs text-editor-text-secondary mt-2">{t('editor.poweredByQuimera')}</p>
                                 </div>
                             ) : generatedImage ? (
                                 <div className="relative w-full h-full group flex items-center justify-center bg-black">
                                     <img src={generatedImage} alt="Generated" className="max-w-full max-h-full object-contain" />
                                 </div>
                             ) : (
                                 <div className="text-center text-editor-text-secondary opacity-50">
                                     <Zap size={48} className="mx-auto mb-4" />
                                     <p>{t('editor.enterPrompt')}</p>
                                 </div>
                             )}
                         </div>
                         
                         {generatedImage && (
                             <div className="flex justify-between items-center">
                                 <p className="text-sm text-editor-accent flex items-center"><span className="w-2 h-2 bg-editor-accent rounded-full mr-2 animate-pulse"></span>{t('editor.savedToLibrary')}</p>
                                 <div className="flex gap-3">
                                     <a 
                                        href={generatedImage}
                                        download={`generated-${Date.now()}.png`}
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="flex items-center gap-2 bg-editor-bg border border-editor-border text-editor-text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-editor-panel-bg transition-colors"
                                     >
                                         <Download size={16} /> {t('editor.download')}
                                     </a>
                                     <button 
                                        onClick={handleReset}
                                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-all"
                                     >
                                         {t('editor.generateAnother')}
                                     </button>
                                 </div>
                             </div>
                         )}
                     </div>
                 </div>
             </div>
        </div>
    );
};

export default ImageGeneratorPanel;
