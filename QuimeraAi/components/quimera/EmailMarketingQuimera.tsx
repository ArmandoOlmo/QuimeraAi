import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Sparkles, TrendingUp, Users, Send, Edit3, MessageSquare, Target, Zap, LayoutTemplate } from 'lucide-react';

interface EmailMarketingQuimeraProps {
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
    Mail, Sparkles, TrendingUp, Users, Edit3, Target, Zap, LayoutTemplate
};

const EmailMarketingQuimera: React.FC<EmailMarketingQuimeraProps> = ({
    title,
    subtitle,
    features,
    colors = {},
    textDropShadow = false,
    isPreviewMode = false,
    imagePosition = 'right',
}) => {
    const { t } = useTranslation();
    const [typingText, setTypingText] = useState("");
    const [animationStep, setAnimationStep] = useState(0);

    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#F59E0B'; // Amber/Orange for marketing/alerts
    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.05)';
    const secondaryColor = colors.secondaryText || '#9ca3af';

    const displayTitle = title || t('emailMarketingQuimera.title', 'Campañas de Email que se Escriben Solas');
    const displaySubtitle = subtitle || t('emailMarketingQuimera.subtitle', 'Aumenta tus tasas de apertura con la IA. Genera asuntos irresistibles, redacta newsletters completos y segmenta a tus suscriptores en un par de clics.');

    const defaultFeatures = [
        {
            title: t('emailMarketingQuimera.feat1Title', 'Redacción Asistida'),
            description: t('emailMarketingQuimera.feat1Desc', 'Dile a la IA qué quieres promocionar y obtén múltiples opciones de correos con el tono de voz de tu marca.'),
            icon: 'Edit3'
        },
        {
            title: t('emailMarketingQuimera.feat2Title', 'Asuntos de Alta Conversión'),
            description: t('emailMarketingQuimera.feat2Desc', 'Genera títulos optimizados psicológicamente para evitar la carpeta de spam y maximizar los clics.'),
            icon: 'Zap'
        },
        {
            title: t('emailMarketingQuimera.feat3Title', 'Segmentación Dinámica'),
            description: t('emailMarketingQuimera.feat3Desc', 'La IA agrupa automáticamente a tus leads según su comportamiento e intereses para enviar mensajes personalizados.'),
            icon: 'Target'
        }
    ];

    const displayFeatures = features && features.length > 0 ? features : defaultFeatures;

    const targetSubject = "Oferta Exclusiva: 50% en tu Próximo Proyecto 🚀";

    // Simulate AI writing the email subject
    useEffect(() => {
        if (isPreviewMode) return;
        
        let index = 0;
        let isWriting = true;
        
        const interval = setInterval(() => {
            if (isWriting) {
                setTypingText(targetSubject.substring(0, index));
                index++;
                
                if (index > targetSubject.length) {
                    isWriting = false;
                    setAnimationStep(1); // Writing done, show stats
                    setTimeout(() => {
                        setAnimationStep(2); // Stats go up
                        setTimeout(() => {
                            // Reset
                            isWriting = true;
                            index = 0;
                            setTypingText("");
                            setAnimationStep(0);
                        }, 4000);
                    }, 1000);
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isPreviewMode]);

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden flex items-center" style={{ backgroundColor: bgColor, color: textColor, minHeight: '80vh' }}>
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full filter blur-[120px] opacity-20" style={{ backgroundColor: accentColor }}></div>
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-red-500/10 rounded-full filter blur-[100px]"></div>
            </div>

            <div className={`relative z-10 max-w-7xl mx-auto w-full flex flex-col-reverse ${imagePosition === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}>
                
                {/* Left Column: Dynamic Editor Mockup */}
                <div className="w-full lg:w-1/2 relative mt-8 lg:mt-0">
                    
                    {/* Floating Metrics Card */}
                    <div className={`absolute -top-6 -right-6 z-20 bg-[#141414] border rounded-xl p-4 shadow-2xl transition-all duration-1000 ${animationStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                         style={{ borderColor: cardBorder, boxShadow: `0 10px 30px ${accentColor}20` }}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
                                <TrendingUp className="w-4 h-4" style={{ color: accentColor }} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Open Rate</p>
                                <p className="text-xl font-black text-white">48.2%</p>
                            </div>
                        </div>
                        <div className="text-xs text-green-400 font-medium flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> +12% vs. industry avg
                        </div>
                    </div>

                    {/* Email Editor Mockup */}
                    <div 
                        className="relative rounded-2xl overflow-hidden shadow-2xl border bg-[#0A0A0A] flex flex-col"
                        style={{ 
                            borderColor: cardBorder,
                            boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5)`
                        }}
                    >
                        {/* Editor Header */}
                        <div className="p-4 border-b flex items-center gap-4 bg-[#111]" style={{ borderColor: '#222' }}>
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <div className="text-xs font-semibold text-gray-400 flex items-center gap-2">
                                <Mail className="w-3 h-3" /> New Campaign
                            </div>
                            <div className="ml-auto">
                                <button className="px-4 py-1.5 rounded text-xs font-bold text-white flex items-center gap-2" style={{ backgroundColor: accentColor }}>
                                    <Send className="w-3 h-3" /> Send
                                </button>
                            </div>
                        </div>

                        {/* Editor Body */}
                        <div className="p-6 bg-[#0F0F0F] space-y-4 h-[350px]">
                            
                            {/* To Field */}
                            <div className="flex items-center border-b pb-2" style={{ borderColor: '#222' }}>
                                <span className="text-xs text-gray-500 w-16">To:</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-300 bg-[#222] px-2 py-1 rounded border border-[#333]">VIP Customers (1,240)</span>
                                </div>
                            </div>

                            {/* Subject Field with AI typing */}
                            <div className="flex items-center border-b pb-2 relative" style={{ borderColor: '#222' }}>
                                <span className="text-xs text-gray-500 w-16">Subject:</span>
                                <div className="flex-1 text-sm text-white font-medium">
                                    {typingText}
                                    <span className={`inline-block w-0.5 h-4 ml-0.5 align-middle ${animationStep === 0 ? 'animate-pulse bg-white' : 'bg-transparent'}`}></span>
                                </div>
                                
                                {/* AI Subject Generator Button */}
                                <div className="absolute right-0 top-0">
                                    <button className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border transition-colors"
                                        style={{ backgroundColor: `${accentColor}10`, color: accentColor, borderColor: `${accentColor}30` }}>
                                        <Sparkles className="w-3 h-3" /> AI Optimize
                                    </button>
                                </div>
                            </div>

                            {/* Email Content Area */}
                            <div className="mt-4 border rounded-xl p-4 bg-white/5 relative overflow-hidden" style={{ borderColor: '#222' }}>
                                {/* AI Scanning Overlay */}
                                <div className={`absolute inset-0 bg-gradient-to-b transition-all duration-1000 z-10 pointer-events-none mix-blend-overlay
                                     ${animationStep === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}
                                     style={{ backgroundImage: `linear-gradient(to bottom, transparent, ${accentColor}40)` }}>
                                </div>

                                <div className="w-16 h-16 bg-[#222] rounded-lg mb-4 flex items-center justify-center border border-[#333]">
                                    <LayoutTemplate className="w-6 h-6 text-gray-500" />
                                </div>
                                <div className="space-y-2">
                                    <div className="w-3/4 h-3 rounded bg-[#333]"></div>
                                    <div className="w-full h-2 rounded bg-[#222]"></div>
                                    <div className="w-5/6 h-2 rounded bg-[#222]"></div>
                                    <div className="w-4/6 h-2 rounded bg-[#222]"></div>
                                </div>
                                <div className="mt-6">
                                    <div className="w-24 h-8 rounded border flex items-center justify-center text-[10px] font-bold" style={{ borderColor: accentColor, color: accentColor }}>
                                        REDEEM OFFER
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Right Column: Text & Tabs */}
                <div className="w-full lg:w-1/2">
                    <div className="mb-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6 border" style={{ backgroundColor: `${accentColor}15`, color: accentColor, borderColor: `${accentColor}30` }}>
                            <Mail className="w-4 h-4" />
                            {t('emailMarketingQuimera.badge', 'AI Newsletters')}
                        </div>
                        <h2 className={`text-4xl md:text-5xl lg:text-[3.5rem] font-black mb-6 tracking-tight leading-tight font-header ${textDropShadow ? 'drop-shadow-xl' : ''}`}
                            style={{ textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                            {displayTitle}
                        </h2>
                        <p className={`text-lg md:text-xl font-light font-body ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: secondaryColor }}>
                            {displaySubtitle}
                        </p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-4">
                        {displayFeatures.map((feature, idx) => {
                            const IconComp = iconMap[feature.icon] || Mail;

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
                                            <h3 className="text-lg font-bold font-header heading-caps mb-2" style={{ color: textColor }}>
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

            </div>
        </section>
    );
};

export default EmailMarketingQuimera;
