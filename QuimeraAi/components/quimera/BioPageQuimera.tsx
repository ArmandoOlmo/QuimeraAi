import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, Sparkles, Link as LinkIcon, Instagram, Twitter, LayoutTemplate, Wand2, ArrowRight, Share2, Music, Youtube } from 'lucide-react';

interface BioPageQuimeraProps {
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
        secondaryText?: string;
    };
    textDropShadow?: boolean;
    isPreviewMode?: boolean;
    imagePosition?: 'left' | 'right';
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
    Smartphone, Sparkles, Link: LinkIcon, LayoutTemplate, Wand2, Share2
};

const BioPageQuimera: React.FC<BioPageQuimeraProps> = ({
    title,
    subtitle,
    features,
    colors = {},
    textDropShadow = false,
    isPreviewMode = false,
    imagePosition = 'right',
}) => {
    const { t } = useTranslation();
    const [animationStep, setAnimationStep] = useState(0);

    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D946EF'; // Fuchsia for social media vibe
    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.05)';
    const secondaryColor = colors.secondaryText || '#9ca3af';

    const displayTitle = title || t('bioPageQuimera.title', 'Tu Enlace en Bio potenciado por IA');
    const displaySubtitle = subtitle || t('bioPageQuimera.subtitle', 'Reúne toda tu presencia online en una sola página optimizada. Solo dinos tus redes y la Inteligencia Artificial diseñará y ordenará tus enlaces para maximizar clics.');

    const defaultFeatures = [
        {
            title: t('bioPageQuimera.feat1Title', 'Generación Automática'),
            description: t('bioPageQuimera.feat1Desc', 'La IA extrae tu información de Instagram o TikTok y crea tu página en 10 segundos con tu identidad visual.'),
            icon: 'Wand2'
        },
        {
            title: t('bioPageQuimera.feat2Title', 'Enlaces Inteligentes'),
            description: t('bioPageQuimera.feat2Desc', 'Destaca automáticamente el enlace más importante (como tu último video o producto) usando algoritmos de atención.'),
            icon: 'Sparkles'
        },
        {
            title: t('bioPageQuimera.feat3Title', 'Analítica Predictiva'),
            description: t('bioPageQuimera.feat3Desc', 'Descubre de dónde vienen tus seguidores y qué enlace convierte mejor, con sugerencias de la IA para mejorar.'),
            icon: 'Share2'
        }
    ];

    const displayFeatures = features && features.length > 0 ? features : defaultFeatures;

    // Simulate AI building the bio page
    useEffect(() => {
        if (isPreviewMode) return;
        
        const interval = setInterval(() => {
            setAnimationStep((prev) => {
                if (prev >= 3) return 0;
                return prev + 1;
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [isPreviewMode]);

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden flex items-center" style={{ backgroundColor: bgColor, color: textColor, minHeight: '80vh' }}>
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 right-0 w-[400px] h-[400px] rounded-full filter blur-[120px] opacity-20" style={{ backgroundColor: accentColor }}></div>
                <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full filter blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto w-full">
                <div className={`flex flex-col ${imagePosition === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}>
                    
                    {/* Text & Features */}
                    <div className="w-full lg:w-1/2">
                        <div className="mb-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6 border" style={{ backgroundColor: `${accentColor}15`, color: accentColor, borderColor: `${accentColor}30` }}>
                                <Smartphone className="w-4 h-4" />
                                {t('bioPageQuimera.badge', 'Smart Bio Page')}
                            </div>
                            <h2 className={`text-4xl md:text-5xl lg:text-[3.5rem] font-black mb-6 tracking-tight leading-tight font-header ${textDropShadow ? 'drop-shadow-xl' : ''}`}
                                style={{ textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                                {displayTitle}
                            </h2>
                            <p className={`text-lg md:text-xl font-light font-body ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: secondaryColor }}>
                                {displaySubtitle}
                            </p>
                        </div>

                        {/* Interactive Features List */}
                        <div className="space-y-4">
                            {displayFeatures.map((feature, idx) => {
                                const IconComp = iconMap[feature.icon] || LinkIcon;

                                return (
                                    <div 
                                        key={idx}
                                        className="p-5 rounded-2xl border transition-all duration-300 hover:translate-x-1"
                                        style={{
                                            backgroundColor: cardBg,
                                            borderColor: cardBorder,
                                        }}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}10` }}>
                                                <IconComp className="w-5 h-5" style={{ color: accentColor }} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold font-header heading-caps mb-1" style={{ color: textColor }}>
                                                    {feature.title}
                                                </h3>
                                                <p className="text-sm font-light font-body" style={{ color: secondaryColor }}>
                                                    {feature.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Dynamic Mockup */}
                    <div className="w-full lg:w-1/2 relative mt-12 lg:mt-0 flex justify-center perspective-[1000px]">
                        
                        {/* AI Wand effect floating around */}
                        <div className={`absolute z-20 flex flex-col items-center gap-2 transition-all duration-1000
                            ${animationStep === 0 ? 'top-[20%] right-10 opacity-100' : 
                              animationStep === 1 ? 'top-[40%] left-10 opacity-100' : 
                              animationStep === 2 ? 'bottom-[20%] right-10 opacity-100' : 'opacity-0 scale-90'}
                        `}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-fuchsia-500/20 animate-pulse" style={{ backgroundColor: accentColor }}>
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] font-bold text-white px-2 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
                                {animationStep === 0 && 'Generando Perfil...'}
                                {animationStep === 1 && 'Optimizando Enlaces...'}
                                {animationStep === 2 && 'Diseño Completado!'}
                            </span>
                        </div>

                        {/* Smartphone Frame */}
                        <div className="relative w-[300px] h-[600px] bg-black rounded-[40px] border-[8px] border-gray-900 shadow-2xl overflow-hidden transform rotate-[-2deg] transition-transform duration-700 hover:rotate-0">
                            {/* Notch */}
                            <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-xl w-32 mx-auto z-50"></div>
                            
                            {/* Screen Content */}
                            <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a]">
                                
                                {/* AI Background Gradient generated in step 2 */}
                                <div className={`absolute inset-0 transition-opacity duration-1000 ${animationStep >= 2 ? 'opacity-100' : 'opacity-0'}`}
                                     style={{ background: `linear-gradient(to bottom, ${accentColor}40, transparent)` }}></div>

                                {/* Content Wrapper */}
                                <div className="p-6 flex flex-col items-center h-full pt-12 relative z-10">
                                    
                                    {/* Profile Avatar */}
                                    <div className={`w-24 h-24 rounded-full border-2 border-transparent p-1 transition-all duration-700 ${animationStep >= 0 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
                                         style={{ borderColor: animationStep >= 2 ? accentColor : 'transparent' }}>
                                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center overflow-hidden">
                                            <div className="text-4xl">👋</div>
                                        </div>
                                    </div>
                                    
                                    {/* Name & Bio */}
                                    <h3 className={`mt-4 text-lg font-bold text-white transition-all duration-500 delay-100 ${animationStep >= 0 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                        Quimera AI Studio
                                    </h3>
                                    <p className={`text-xs text-gray-400 text-center mt-2 transition-all duration-500 delay-200 ${animationStep >= 0 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                        Revolucionando el desarrollo web con Inteligencia Artificial. 🚀
                                    </p>

                                    {/* Social Icons */}
                                    <div className={`flex gap-4 mt-6 transition-all duration-500 delay-300 ${animationStep >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                                        <Instagram className="w-5 h-5 text-gray-400 hover:text-white" />
                                        <Twitter className="w-5 h-5 text-gray-400 hover:text-white" />
                                        <Youtube className="w-5 h-5 text-gray-400 hover:text-white" />
                                        <Music className="w-5 h-5 text-gray-400 hover:text-white" />
                                    </div>

                                    {/* Links Container */}
                                    <div className="w-full mt-8 space-y-3">
                                        
                                        {/* Link 1: Featured (AI Highlight) */}
                                        <div className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all duration-700 
                                            ${animationStep >= 1 ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
                                             style={{ 
                                                backgroundColor: animationStep >= 2 ? accentColor : '#222',
                                                boxShadow: animationStep >= 2 ? `0 0 20px ${accentColor}40` : 'none'
                                             }}>
                                            {animationStep >= 2 && <Sparkles className="w-4 h-4" />}
                                            Nuestra Nueva Web App
                                        </div>

                                        {/* Link 2 */}
                                        <div className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-gray-200 bg-[#222] border border-[#333] transition-all duration-700 delay-100
                                            ${animationStep >= 1 ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
                                            Último Video en YouTube
                                        </div>

                                        {/* Link 3 */}
                                        <div className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-gray-200 bg-[#222] border border-[#333] transition-all duration-700 delay-200
                                            ${animationStep >= 1 ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
                                            Reserva una Cita
                                        </div>

                                    </div>
                                </div>

                                {/* Floating AI Badge on phone */}
                                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-[10px] text-gray-400 font-medium">
                                        Powered by <Sparkles className="w-3 h-3 text-fuchsia-400" /> Quimera AI
                                    </div>
                                </div>

                            </div>
                        </div>
                        
                        {/* Decorative background blur for phone */}
                        <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 filter blur-3xl -z-10 rounded-full scale-110"></div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default BioPageQuimera;
