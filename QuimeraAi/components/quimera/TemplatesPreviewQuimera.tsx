import React from 'react';
import { ArrowRight, Sparkles, LayoutTemplate, Palette, Type, Layers, Image as ImageIcon, Zap, Edit3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TemplatesPreviewQuimeraProps {
    title?: string;
    subtitle?: string;
    introText?: string;
    differentiatorTitle?: string;
    differentiatorText?: string;
    primaryButtonText?: string;
    primaryButtonLink?: string;
    secondaryButtonText?: string;
    secondaryButtonLink?: string;
    flowText?: string;
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

const TemplatesPreviewQuimera: React.FC<TemplatesPreviewQuimeraProps> = ({
    title,
    subtitle,
    introText,
    differentiatorTitle,
    differentiatorText,
    primaryButtonText,
    primaryButtonLink = '/templates',
    secondaryButtonText,
    secondaryButtonLink = '/register',
    flowText,
    colors = {},
    textDropShadow = false,
    isPreviewMode = false,
    imagePosition = 'right',
}) => {
    const { t } = useTranslation();

    // ── Color Resolution ──
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';
    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.06)';
    const secondaryColor = colors.secondaryText || '#9ca3af';

    // ── Content Resolution (props → i18n fallback) ──
    const displayTitle = title || t('templatesPreviewQuimera.title', 'Comienza con un template profesional y hazlo tuyo.');
    const displaySubtitle = subtitle || t('templatesPreviewQuimera.subtitle', 'Elige una base visual diseñada para tu industria y conviértela en un website único con la ayuda de Quimera AI.');
    const displayIntro = introText || t('templatesPreviewQuimera.introText', 'Los templates de Quimera AI no son páginas rígidas. Son puntos de partida inteligentes con estructura, diseño y secciones listas para personalizar. Cambia textos, colores, imágenes, llamadas a la acción y funcionalidades sin comenzar desde una página en blanco.');

    const displayDiffTitle = differentiatorTitle || t('templatesPreviewQuimera.diffTitle', 'No empiezas desde cero. Empiezas desde una ventaja.');
    const displayDiffText = differentiatorText || t('templatesPreviewQuimera.diffText', 'Los templates funcionan como una base inteligente: tienen estructura, diseño y secciones esenciales listas para adaptar a tu industria, tu marca y tus objetivos.');

    const displayPrimaryBtn = primaryButtonText || t('templatesPreviewQuimera.primaryBtn', 'Explorar templates');
    const displaySecondaryBtn = secondaryButtonText || t('templatesPreviewQuimera.secondaryBtn', 'Generar con AI');
    const displayFlowText = flowText || t('templatesPreviewQuimera.flowText', 'Choose template → Customize with AI → Launch website');

    // Badges translations
    const badgeColors = t('templatesPreviewQuimera.badgeColors', 'Change colors');
    const badgeCopy = t('templatesPreviewQuimera.badgeCopy', 'Rewrite copy');
    const badgeSections = t('templatesPreviewQuimera.badgeSections', 'Add sections');
    const badgeImages = t('templatesPreviewQuimera.badgeImages', 'Replace images');
    const badgePublish = t('templatesPreviewQuimera.badgePublish', 'Publish faster');
    const explainerText = t('templatesPreviewQuimera.explainerText', 'Puedes comenzar desde un template o generar tu website desde cero con inteligencia artificial.');

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, link: string) => {
        if (isPreviewMode) {
            e.preventDefault();
            return;
        }
    };

    return (
        <section
            className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden"
            style={{ backgroundColor: bgColor, color: textColor }}
        >
            {/* ── Background Ambient Glows ── */}
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full filter blur-[150px] opacity-30"
                    style={{ backgroundColor: `${accentColor}10` }}
                />
                <div
                    className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full filter blur-[120px] opacity-20"
                    style={{ backgroundColor: `${accentColor}08` }}
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <div className={`flex flex-col ${imagePosition === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-16 lg:gap-12 items-center`}>
                    
                    {/* ═══════════════════════════════════════════════════════
                        LEFT COLUMN: Content & CTAs
                       ═══════════════════════════════════════════════════════ */}
                    <div className="flex flex-col gap-8 w-full lg:w-1/2">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-6 backdrop-blur-sm" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}25`, color: accentColor }}>
                                <LayoutTemplate className="w-4 h-4" />
                                <span className="text-sm font-semibold tracking-wide uppercase font-body">Premium Templates</span>
                            </div>

                            <h2
                                className={`text-3xl md:text-4xl lg:text-5xl font-black mb-6 tracking-tight leading-tight font-header ${textDropShadow ? 'drop-shadow-xl' : ''}`}
                                style={{ textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}
                            >
                                {displayTitle}
                            </h2>

                            <p
                                className={`text-xl font-light mb-4 leading-relaxed font-body ${textDropShadow ? 'drop-shadow-md' : ''}`}
                                style={{ color: secondaryColor }}
                            >
                                {displaySubtitle}
                            </p>

                            <p
                                className={`text-base md:text-lg leading-relaxed font-body mb-8 ${textDropShadow ? 'drop-shadow-sm' : ''}`}
                                style={{ color: secondaryColor, opacity: 0.8 }}
                            >
                                {displayIntro}
                            </p>
                        </div>

                        {/* Differentiator Block */}
                        <div
                            className="relative rounded-2xl p-6 md:p-8 overflow-hidden border backdrop-blur-sm"
                            style={{ backgroundColor: `${accentColor}08`, borderColor: `${accentColor}20` }}
                        >
                            <div className="flex items-start gap-4">
                                <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                                    <Zap className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3
                                        className="text-xl font-bold mb-2 font-header"
                                        style={{ textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}
                                    >
                                        {displayDiffTitle}
                                    </h3>
                                    <p className="text-sm md:text-base leading-relaxed font-body" style={{ color: secondaryColor }}>
                                        {displayDiffText}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* CTAs */}
                        <div>
                            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                <a
                                    href={primaryButtonLink}
                                    onClick={(e) => handleClick(e, primaryButtonLink)}
                                    className="group relative px-8 py-4 font-bold rounded-xl transition-all w-full sm:w-auto flex items-center justify-center gap-2 text-base md:text-lg overflow-hidden font-button"
                                    style={{
                                        backgroundColor: accentColor,
                                        color: '#000000',
                                        boxShadow: `0 0 30px ${accentColor}33`,
                                        textTransform: 'var(--buttons-transform, none)' as any,
                                        letterSpacing: 'var(--buttons-spacing, normal)',
                                    }}
                                >
                                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                                    {displayPrimaryBtn}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </a>

                                <a
                                    href={secondaryButtonLink}
                                    onClick={(e) => handleClick(e, secondaryButtonLink)}
                                    className="px-8 py-4 font-medium rounded-xl transition-all w-full sm:w-auto flex items-center justify-center gap-2 text-base md:text-lg backdrop-blur-sm font-button border group hover:bg-white/5"
                                    style={{
                                        backgroundColor: cardBg,
                                        borderColor: cardBorder,
                                        color: textColor,
                                        textTransform: 'var(--buttons-transform, none)' as any,
                                        letterSpacing: 'var(--buttons-spacing, normal)',
                                    }}
                                >
                                    <Sparkles className="w-5 h-5 text-yellow-500" />
                                    {displaySecondaryBtn}
                                </a>
                            </div>
                            <p className="text-xs font-body" style={{ color: secondaryColor }}>
                                {explainerText}
                            </p>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════
                        RIGHT COLUMN: Browser Mockup & Floating Badges
                       ═══════════════════════════════════════════════════════ */}
                    <div className="relative mt-8 lg:mt-0 w-full lg:w-1/2">
                        
                        {/* Floating Badges */}
                        <div className="absolute top-10 left-2 sm:-left-6 z-20 animate-bounce-slow">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md shadow-xl border" style={{ backgroundColor: 'rgba(15,15,15,0.8)', borderColor: `${accentColor}40`, color: textColor }}>
                                <Palette className="w-4 h-4" style={{ color: accentColor }} />
                                <span className="text-xs font-medium font-body">{badgeColors}</span>
                            </div>
                        </div>

                        <div className="absolute top-1/3 right-2 sm:-right-8 z-20 animate-bounce-slow" style={{ animationDelay: '1s' }}>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md shadow-xl border" style={{ backgroundColor: 'rgba(15,15,15,0.8)', borderColor: `${accentColor}40`, color: textColor }}>
                                <Type className="w-4 h-4" style={{ color: accentColor }} />
                                <span className="text-xs font-medium font-body">{badgeCopy}</span>
                            </div>
                        </div>

                        <div className="absolute bottom-1/4 left-2 sm:-left-10 z-20 animate-bounce-slow" style={{ animationDelay: '0.5s' }}>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md shadow-xl border" style={{ backgroundColor: 'rgba(15,15,15,0.8)', borderColor: `${accentColor}40`, color: textColor }}>
                                <Layers className="w-4 h-4" style={{ color: accentColor }} />
                                <span className="text-xs font-medium font-body">{badgeSections}</span>
                            </div>
                        </div>

                        <div className="absolute bottom-8 right-4 z-20 animate-bounce-slow" style={{ animationDelay: '1.5s' }}>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md shadow-xl border" style={{ backgroundColor: 'rgba(15,15,15,0.8)', borderColor: `${accentColor}40`, color: textColor }}>
                                <ImageIcon className="w-4 h-4" style={{ color: accentColor }} />
                                <span className="text-xs font-medium font-body">{badgeImages}</span>
                            </div>
                        </div>

                        <div className="absolute -top-6 right-10 z-20">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md shadow-xl border" style={{ backgroundColor: accentColor, borderColor: accentColor, color: '#000' }}>
                                <Zap className="w-4 h-4" />
                                <span className="text-xs font-bold font-body">{badgePublish}</span>
                            </div>
                        </div>

                        {/* Browser Window */}
                        <div 
                            className="relative rounded-2xl overflow-hidden shadow-2xl border h-[400px] md:h-[450px] flex flex-col" 
                            style={{ 
                                backgroundColor: '#111111', 
                                borderColor: cardBorder,
                                boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px ${accentColor}15`
                            }}
                        >
                            {/* Browser Header */}
                            <div className="h-10 border-b flex items-center px-4" style={{ backgroundColor: '#1A1A1A', borderColor: cardBorder }}>
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                </div>
                                <div className="mx-auto flex-1 flex justify-center">
                                    <div className="h-5 w-48 rounded flex items-center justify-center text-[10px] text-gray-500 font-mono" style={{ backgroundColor: '#0A0A0A' }}>
                                        <span className="flex items-center gap-1"><Edit3 className="w-3 h-3" /> editor.quimera.ai/preview</span>
                                    </div>
                                </div>
                            </div>

                            {/* Mockup Content */}
                            <div className="p-4 bg-white select-none flex-1 overflow-hidden relative">
                                {/* Navbar Mockup */}
                                <div className="flex items-center justify-between mb-8">
                                    <div className="w-24 h-6 bg-gray-200 rounded"></div>
                                    <div className="hidden sm:flex gap-4">
                                        <div className="w-12 h-2 bg-gray-200 rounded"></div>
                                        <div className="w-16 h-2 bg-gray-200 rounded"></div>
                                        <div className="w-12 h-2 bg-gray-200 rounded"></div>
                                    </div>
                                    <div className="w-20 h-8 bg-black rounded-lg"></div>
                                </div>

                                {/* Hero Mockup */}
                                <div className="text-center py-12 px-4 rounded-2xl mb-8 relative overflow-hidden" style={{ backgroundColor: '#F8FAFC' }}>
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50"></div>
                                    <div className="relative z-10">
                                        <div className="w-3/4 h-10 bg-gray-900 rounded-lg mx-auto mb-4"></div>
                                        <div className="w-1/2 h-10 bg-gray-900 rounded-lg mx-auto mb-6"></div>
                                        <div className="w-2/3 h-3 bg-gray-400 rounded mx-auto mb-3"></div>
                                        <div className="w-1/2 h-3 bg-gray-400 rounded mx-auto mb-8"></div>
                                        <div className="w-32 h-10 bg-blue-600 rounded-lg mx-auto"></div>
                                    </div>
                                </div>

                                {/* Services Mockup */}
                                <div className="mb-8">
                                    <div className="w-32 h-6 bg-gray-800 rounded mx-auto mb-8"></div>
                                    <div className="grid grid-cols-3 gap-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                <div className="w-8 h-8 bg-gray-200 rounded-lg mb-3"></div>
                                                <div className="w-full h-3 bg-gray-800 rounded mb-2"></div>
                                                <div className="w-2/3 h-2 bg-gray-400 rounded"></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Banner Mockup */}
                                <div className="h-32 rounded-xl bg-gray-900 mb-8 flex items-center justify-between p-6">
                                    <div>
                                        <div className="w-40 h-6 bg-white rounded mb-2"></div>
                                        <div className="w-24 h-3 bg-gray-400 rounded"></div>
                                    </div>
                                    <div className="w-24 h-8 bg-white rounded-lg"></div>
                                </div>

                                {/* Footer Mockup */}
                                <div className="border-t border-gray-100 pt-6 flex justify-between">
                                    <div className="w-20 h-4 bg-gray-300 rounded"></div>
                                    <div className="flex gap-2">
                                        <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                                        <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                                        <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Overlay overlay representing "Edit Mode" */}
                            <div className="absolute inset-0 border-4 pointer-events-none rounded-xl" style={{ borderColor: `${accentColor}30` }}></div>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════
                    FLOW TEXT (Bottom)
                   ═══════════════════════════════════════════════════════ */}
                <div className="mt-16 md:mt-24 text-center">
                    <p className="inline-flex items-center gap-3 px-6 py-3 rounded-full text-sm font-semibold tracking-wide uppercase font-body border" style={{ backgroundColor: `${accentColor}05`, borderColor: `${accentColor}15`, color: secondaryColor }}>
                        {displayFlowText}
                    </p>
                </div>
            </div>
        </section>
    );
};

export default TemplatesPreviewQuimera;
