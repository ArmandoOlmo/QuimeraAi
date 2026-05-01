import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Image as ImageIcon, Send, Paintbrush, Layers, Wand2 } from 'lucide-react';

interface ImageGeneratorQuimeraProps {
    title?: string;
    subtitle?: string;
    features?: Array<{
        title: string;
        description: string;
        icon: string;
    }>;
    colors?: {
        background?: string;
        text?: string;
        accent?: string;
        cardBackground?: string;
        cardBorder?: string;
        cardText?: string;
        iconColor?: string;
        secondaryText?: string;
    };
    textDropShadow?: boolean;
    isPreviewMode?: boolean;
    imagePosition?: 'left' | 'right';
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
    Sparkles, ImageIcon, Paintbrush, Layers, Wand2
};

const ImageGeneratorQuimera: React.FC<ImageGeneratorQuimeraProps> = ({
    title,
    subtitle,
    features,
    colors = {},
    textDropShadow = false,
    isPreviewMode = false,
    imagePosition = 'right',
}) => {
    const { t } = useTranslation();
    const [promptIndex, setPromptIndex] = useState(0);
    const [typedText, setTypedText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showImage, setShowImage] = useState(true);

    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#8B5CF6'; // Purple for AI magic
    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.05)';
    const secondaryColor = colors.secondaryText || '#9ca3af';

    const displayTitle = title || t('imageGeneratorQuimera.title', 'Crea Imágenes Increíbles con IA');
    const displaySubtitle = subtitle || t('imageGeneratorQuimera.subtitle', 'Describe lo que imaginas y deja que Quimera genere visuales profesionales, sin derechos de autor y listos para tu website o redes sociales en segundos.');

    const defaultFeatures = [
        {
            title: t('imageGeneratorQuimera.feat1Title', 'Generación desde Texto'),
            description: t('imageGeneratorQuimera.feat1Desc', 'Solo escribe un prompt detallado y la inteligencia artificial creará imágenes fotorrealistas, ilustraciones o logos únicos.'),
            icon: 'Sparkles'
        },
        {
            title: t('imageGeneratorQuimera.feat2Title', 'Sin Derechos de Autor'),
            description: t('imageGeneratorQuimera.feat2Desc', 'Úsalas libremente en tus artículos, productos y anuncios sin preocuparte por licencias de stock.'),
            icon: 'ImageIcon'
        },
        {
            title: t('imageGeneratorQuimera.feat3Title', 'Variaciones y Estilos'),
            description: t('imageGeneratorQuimera.feat3Desc', 'Cambia el estilo visual fácilmente: 3D, acuarela, minimalista, realista o cyberpunk con un clic.'),
            icon: 'Paintbrush'
        }
    ];

    const displayFeatures = features && features.length > 0 ? features : defaultFeatures;

    const prompts = [
        "A hyperrealistic photo of a futuristic coffee shop in neon Tokyo...",
        "A minimalist logo for a tech startup, geometric, flat vector...",
        "A professional headshot of a business woman, studio lighting..."
    ];

    const images = [
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800", // cafe/neon vibe placeholder
        "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=800", // abstract/logo vibe placeholder
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800"  // professional placeholder
    ];

    // Typing effect simulation
    useEffect(() => {
        if (isPreviewMode) {
            setTypedText(prompts[0]);
            return;
        }

        let timeout: NodeJS.Timeout;
        const currentPrompt = prompts[promptIndex];

        if (!showImage && !isGenerating) {
            // Typing phase
            if (typedText.length < currentPrompt.length) {
                timeout = setTimeout(() => {
                    setTypedText(currentPrompt.slice(0, typedText.length + 1));
                }, 50);
            } else {
                // Done typing, start generating
                timeout = setTimeout(() => {
                    setIsGenerating(true);
                }, 500);
            }
        } else if (isGenerating) {
            // Generating phase
            timeout = setTimeout(() => {
                setIsGenerating(false);
                setShowImage(true);
            }, 2000);
        } else if (showImage) {
            // Display phase
            timeout = setTimeout(() => {
                setShowImage(false);
                setTypedText('');
                setPromptIndex((prev) => (prev + 1) % prompts.length);
            }, 4000);
        }

        return () => clearTimeout(timeout);
    }, [typedText, showImage, isGenerating, promptIndex, isPreviewMode]);

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden flex items-center" style={{ backgroundColor: bgColor, color: textColor, minHeight: '80vh' }}>
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full filter blur-[150px]"></div>
                <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full filter blur-[120px]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto w-full">
                <div className={`flex flex-col ${imagePosition === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}>
                    
                    {/* Text & Features */}
                    <div className="w-full lg:w-1/2">
                        <div className="mb-10">
                            <h2 className={`text-4xl md:text-5xl lg:text-[3.5rem] font-black mb-6 tracking-tight leading-tight font-header ${textDropShadow ? 'drop-shadow-xl' : ''}`}
                                style={{ textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                                {displayTitle}
                            </h2>
                            <p className={`text-lg md:text-xl font-light font-body ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: secondaryColor }}>
                                {displaySubtitle}
                            </p>
                        </div>

                        <div className="space-y-6">
                            {displayFeatures.map((feature, idx) => {
                                const IconComp = iconMap[feature.icon] || Sparkles;
                                return (
                                    <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                                        <div className="flex-shrink-0 p-3 rounded-xl" style={{ backgroundColor: `${accentColor}15` }}>
                                            <IconComp className="w-6 h-6" style={{ color: accentColor }} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold font-header heading-caps mb-2">{feature.title}</h3>
                                            <p className="text-sm font-light font-body" style={{ color: secondaryColor }}>{feature.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Dynamic Mockup */}
                    <div className="w-full lg:w-1/2 relative mt-8 lg:mt-0">
                        {/* Editor Mockup */}
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl border flex flex-col"
                            style={{ 
                                backgroundColor: '#111111', 
                                borderColor: cardBorder,
                                boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px ${accentColor}20`
                            }}
                        >
                            {/* App Header */}
                            <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: cardBorder, backgroundColor: '#1A1A1A' }}>
                                <div className="flex items-center gap-2">
                                    <Wand2 className="w-5 h-5" style={{ color: accentColor }} />
                                    <span className="font-semibold text-sm">AI Image Studio</span>
                                </div>
                                <div className="px-3 py-1 text-xs rounded-full bg-white/5 text-white/50 border border-white/10">
                                    Beta
                                </div>
                            </div>

                            {/* Main Content Area */}
                            <div className="p-4 sm:p-6 flex-1 flex flex-col gap-4">
                                
                                {/* Image Display Area */}
                                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden relative border flex items-center justify-center bg-[#050505]" style={{ borderColor: cardBorder }}>
                                    
                                    {!showImage && !isGenerating && (
                                        <div className="text-gray-600 flex flex-col items-center gap-3">
                                            <ImageIcon className="w-12 h-12 opacity-50" />
                                            <span className="text-sm">Describe tu imagen para comenzar</span>
                                        </div>
                                    )}

                                    {isGenerating && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10">
                                            <Sparkles className="w-10 h-10 animate-spin mb-4" style={{ color: accentColor }} />
                                            <div className="text-sm font-medium animate-pulse" style={{ color: accentColor }}>Generando visuales...</div>
                                            <div className="w-48 h-1.5 bg-gray-800 rounded-full mt-4 overflow-hidden">
                                                <div className="h-full bg-purple-500 rounded-full animate-[progress_2s_ease-in-out_infinite]"></div>
                                            </div>
                                        </div>
                                    )}

                                    {showImage && (
                                        <div className="absolute inset-0 animate-in fade-in zoom-in duration-500">
                                            <img 
                                                src={images[promptIndex]} 
                                                alt="AI Generated" 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}

                                </div>

                                {/* Prompt Input Mockup */}
                                <div className="relative mt-2">
                                    <div className="w-full min-h-[60px] rounded-xl border p-3 pr-12 text-sm flex items-center"
                                        style={{ backgroundColor: '#1A1A1A', borderColor: isGenerating ? accentColor : cardBorder }}
                                    >
                                        <span className="text-gray-300">
                                            {typedText}
                                            {!showImage && !isGenerating && <span className="inline-block w-1 h-4 bg-purple-500 ml-1 animate-pulse"></span>}
                                        </span>
                                    </div>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <button className="p-2 rounded-lg transition-colors" style={{ backgroundColor: typedText.length > 5 ? accentColor : '#2A2A2A', color: typedText.length > 5 ? '#fff' : '#666' }}>
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Style Chips */}
                                <div className="flex gap-2 overflow-hidden mt-2">
                                    {['Fotorealista', '3D Render', 'Ilustración', 'Cyberpunk'].map((style, i) => (
                                        <div key={i} className="px-3 py-1 text-xs rounded-full border border-white/10 bg-white/5 text-gray-400 whitespace-nowrap">
                                            {style}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <style>{`
                @keyframes progress {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
            `}</style>
        </section>
    );
};

export default ImageGeneratorQuimera;
