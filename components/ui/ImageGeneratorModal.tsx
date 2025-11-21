
import React, { useState } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import Modal from './Modal';
import { Zap, Loader2, Wand2, X, Download } from 'lucide-react';

interface ImageGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    destination: 'user' | 'global';
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

const ImageGeneratorModal: React.FC<ImageGeneratorModalProps> = ({ isOpen, onClose, destination }) => {
    const { generateImage, enhancePrompt } = useEditor();
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [style, setStyle] = useState('None');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            const url = await generateImage(prompt, { aspectRatio, style, destination });
            setGeneratedImage(url);
        } catch (error) {
            console.error(error);
            alert("Generation failed. Check console details.");
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
        } catch (error) {
            console.error(error);
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleReset = () => {
        setGeneratedImage(null);
        setPrompt('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
             <div className="bg-editor-bg w-full max-w-4xl h-[85vh] flex flex-col rounded-xl overflow-hidden shadow-2xl border border-editor-border">
                 {/* Header */}
                 <div className="p-4 border-b border-editor-border flex justify-between items-center bg-editor-panel-bg">
                     <div className="flex items-center gap-2">
                        <Zap size={20} className="text-editor-accent" />
                        <h2 className="text-lg font-bold text-editor-text-primary">Quimera.ai Generator</h2>
                        <span className="text-xs text-editor-text-secondary bg-editor-bg px-2 py-0.5 rounded-full border border-editor-border">
                            {destination === 'global' ? 'Global Library' : 'Personal Asset Library'}
                        </span>
                     </div>
                     <button onClick={onClose} className="p-1 rounded-full hover:bg-editor-border text-editor-text-secondary"><X size={20}/></button>
                 </div>

                 {/* Content */}
                 <div className="flex-grow overflow-hidden p-6 bg-editor-bg">
                     <div className="flex gap-6 h-full flex-col md:flex-row">
                         {/* Controls Side */}
                         <div className="w-full md:w-1/3 flex flex-col gap-5 md:border-r border-editor-border md:pr-6 overflow-y-auto">
                             <div>
                                 <div className="flex justify-between items-center mb-2">
                                     <label className="block text-sm font-bold text-editor-text-primary">Prompt</label>
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
                                    className="w-full bg-editor-panel-bg border border-editor-border rounded-lg p-3 text-sm text-editor-text-primary focus:ring-2 focus:ring-editor-accent outline-none resize-none h-32 mb-4"
                                 />
                             </div>

                             <div>
                                 <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2">Aspect Ratio</label>
                                 <div className="grid grid-cols-3 gap-2">
                                     {ASPECT_RATIOS.map(ratio => (
                                         <button
                                            key={ratio.value}
                                            onClick={() => setAspectRatio(ratio.value)}
                                            className={`text-xs py-2 rounded-md border transition-all ${aspectRatio === ratio.value ? 'bg-editor-accent text-editor-bg border-editor-accent font-bold' : 'bg-editor-bg text-editor-text-secondary border-editor-border hover:border-editor-text-secondary hover:text-editor-text-primary'}`}
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
                                    className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:border-editor-accent"
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
                         <div className="w-full md:w-2/3 flex flex-col h-full min-h-[300px]">
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
                                 <div className="flex justify-between items-center">
                                     <p className="text-sm text-green-400 flex items-center"><span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>Saved to Library</p>
                                     <div className="flex gap-3">
                                         <a 
                                            href={generatedImage}
                                            download={`generated-${Date.now()}.png`}
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="flex items-center gap-2 bg-editor-bg border border-editor-border text-editor-text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-editor-panel-bg transition-colors"
                                         >
                                             <Download size={16} /> Download
                                         </a>
                                         <button 
                                            onClick={handleReset}
                                            className="flex items-center gap-2 bg-editor-accent text-editor-bg px-6 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-editor-accent-hover transition-all"
                                         >
                                             Generate Another
                                         </button>
                                     </div>
                                 </div>
                             )}
                         </div>
                     </div>
                 </div>
             </div>
        </Modal>
    );
};

export default ImageGeneratorModal;