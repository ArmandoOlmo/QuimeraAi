import React from 'react';
import { ArrowRight, Sparkles, MessageSquareCode, Wand2, LayoutDashboard, CheckCircle2, Bot, User, Layout, Edit3, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AiWebStudioQuimeraProps {
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

const AiWebStudioQuimera: React.FC<AiWebStudioQuimeraProps> = ({
    title,
    subtitle,
    introText,
    differentiatorTitle,
    differentiatorText,
    primaryButtonText,
    primaryButtonLink = '/ai-studio',
    secondaryButtonText,
    secondaryButtonLink = '/templates',
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
    const displayTitle = title || t('aiWebStudioQuimera.title', 'Construye tu website conversando con AI Web Studio.');
    const displaySubtitle = subtitle || t('aiWebStudioQuimera.subtitle', 'Responde preguntas simples sobre tu negocio y Quimera AI genera una página web inicial con estructura, textos y secciones listas para personalizar.');
    const displayIntro = introText || t('aiWebStudioQuimera.introText', 'AI Web Studio funciona como un estratega, copywriter y diseñador inicial dentro de Quimera AI. Te guía paso a paso, entiende lo que vendes, quién es tu cliente y qué quieres lograr, y luego crea una primera versión de tu website para que puedas editar, mejorar y publicar más rápido.');

    const displayDiffTitle = differentiatorTitle || t('aiWebStudioQuimera.diffTitle', 'Tu website empieza con una conversación.');
    const displayDiffText = differentiatorText || t('aiWebStudioQuimera.diffText', 'AI Web Studio convierte ideas sueltas en una estructura clara: títulos, secciones, textos, llamadas a la acción y contenido inicial adaptado al tipo de negocio.');

    const displayPrimaryBtn = primaryButtonText || t('aiWebStudioQuimera.primaryBtn', 'Crear con AI Web Studio');
    const displaySecondaryBtn = secondaryButtonText || t('aiWebStudioQuimera.secondaryBtn', 'Explorar templates');
    const displayFlowText = flowText || t('aiWebStudioQuimera.flowText', 'Chat → Website Draft → Edit → Publish');

    // Bullet points translations
    const bullet1 = t('aiWebStudioQuimera.bullet1', 'Te hace las preguntas correctas.');
    const bullet2 = t('aiWebStudioQuimera.bullet2', 'Organiza la información de tu negocio.');
    const bullet3 = t('aiWebStudioQuimera.bullet3', 'Genera una primera versión de tu website.');

    // Chat mockup translations
    const chatMsg1 = t('aiWebStudioQuimera.chatMsg1', 'Tell me about your business. What do you offer and who do you serve?');
    const chatMsg2 = t('aiWebStudioQuimera.chatMsg2', 'I run a local service business and need a website to explain my services, capture leads and book appointments.');
    const chatMsg3 = t('aiWebStudioQuimera.chatMsg3', 'Great. I’ll create a homepage with your services, benefits, testimonials and a contact section.');
    
    // Website preview mockup labels
    const genStatus = t('aiWebStudioQuimera.genStatus', 'Generating website...');
    const badgeDraft = t('aiWebStudioQuimera.badgeDraft', 'AI Draft Ready');
    const badgeEditable = t('aiWebStudioQuimera.badgeEditable', 'Editable in Quimera');

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
                <div className={`flex flex-col ${imagePosition === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-16 lg:gap-8 items-center`}>
                    
                    {/* ═══════════════════════════════════════════════════════
                        RIGHT COLUMN (Now Content & CTAs)
                       ═══════════════════════════════════════════════════════ */}
                    <div className="flex flex-col gap-8 w-full lg:w-1/2">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-6 backdrop-blur-sm" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}25`, color: accentColor }}>
                                <MessageSquareCode className="w-4 h-4" />
                                <span className="text-sm font-semibold tracking-wide uppercase font-body">AI Web Studio</span>
                            </div>

                            <h2
                                className={`text-3xl md:text-4xl lg:text-5xl font-black mb-6 tracking-tight leading-tight font-header ${textDropShadow ? 'drop-shadow-xl' : ''}`}
                                style={{ textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}
                            >
                                {displayTitle}
                            </h2>

                            <p
                                className={`text-xl font-light mb-6 leading-relaxed font-body ${textDropShadow ? 'drop-shadow-md' : ''}`}
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

                            {/* Bullet Points */}
                            <ul className="flex flex-col gap-4 mb-8">
                                <li className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                                        <MessageSquareCode className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-base font-body" style={{ color: textColor }}>{bullet1}</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                                        <LayoutDashboard className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-base font-body" style={{ color: textColor }}>{bullet2}</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                                        <Wand2 className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-base font-body" style={{ color: textColor }}>{bullet3}</span>
                                </li>
                            </ul>
                        </div>

                        {/* Differentiator Block */}
                        <div
                            className="relative rounded-2xl p-6 md:p-8 overflow-hidden border backdrop-blur-sm"
                            style={{ backgroundColor: `${accentColor}08`, borderColor: `${accentColor}20` }}
                        >
                            <div className="flex items-start gap-4">
                                <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                                    <CheckCircle2 className="w-4 h-4" />
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
                        <div className="flex flex-col sm:flex-row gap-4 mt-2">
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
                                <Layout className="w-5 h-5" />
                                {displaySecondaryBtn}
                            </a>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════
                        LEFT COLUMN (Now Split-Screen Mockup)
                       ═══════════════════════════════════════════════════════ */}
                    <div className="relative w-full lg:w-1/2 max-w-2xl mx-auto lg:max-w-none mt-8 lg:mt-0">
                        
                        {/* Floating Badges */}
                        <div className="absolute -top-6 right-2 sm:-left-4 z-30 lg:z-10 lg:left-8">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md shadow-xl border" style={{ backgroundColor: accentColor, borderColor: accentColor, color: '#000' }}>
                                <Wand2 className="w-4 h-4" />
                                <span className="text-xs font-bold font-body">{badgeDraft}</span>
                            </div>
                        </div>

                        <div className="absolute -bottom-6 left-2 sm:-right-4 z-30">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md shadow-xl border" style={{ backgroundColor: 'rgba(15,15,15,0.9)', borderColor: `${accentColor}40`, color: textColor }}>
                                <Edit3 className="w-4 h-4" style={{ color: accentColor }} />
                                <span className="text-xs font-medium font-body">{badgeEditable}</span>
                            </div>
                        </div>

                        <div 
                            className="relative rounded-2xl overflow-hidden shadow-2xl border flex flex-col md:flex-row h-[400px] md:h-[450px]" 
                            style={{ 
                                backgroundColor: '#111111', 
                                borderColor: cardBorder,
                                boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 50px ${accentColor}15`
                            }}
                        >
                            {/* Panel 1: Chat Interface (Left side on desktop, top on mobile) */}
                            <div className="w-full md:w-5/12 h-1/2 md:h-full border-b md:border-b-0 md:border-r flex flex-col" style={{ borderColor: cardBorder, backgroundColor: '#0A0A0A' }}>
                                {/* Chat Header */}
                                <div className="h-12 border-b flex items-center px-4 gap-3" style={{ borderColor: cardBorder, backgroundColor: '#111111' }}>
                                    <div className="flex gap-1.5 mr-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                                    </div>
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/10">
                                        <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                                    </div>
                                    <span className="text-xs font-semibold text-white font-body">AI Web Studio</span>
                                </div>

                                {/* Chat Messages */}
                                <div className="flex-1 p-4 overflow-hidden flex flex-col gap-4">
                                    {/* AI Message */}
                                    <div className="flex gap-2">
                                        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1" style={{ backgroundColor: `${accentColor}20` }}>
                                            <Bot className="w-3.5 h-3.5" style={{ color: accentColor }} />
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-3 text-[11px] text-gray-300 font-body leading-relaxed">
                                            {chatMsg1}
                                        </div>
                                    </div>
                                    
                                    {/* User Message */}
                                    <div className="flex gap-2 justify-end">
                                        <div className="bg-blue-600/20 border border-blue-500/30 rounded-2xl rounded-tr-none p-3 text-[11px] text-blue-100 font-body leading-relaxed">
                                            {chatMsg2}
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center mt-1 border border-gray-700">
                                            <User className="w-3.5 h-3.5 text-gray-400" />
                                        </div>
                                    </div>

                                    {/* AI Message 2 */}
                                    <div className="flex gap-2">
                                        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1" style={{ backgroundColor: `${accentColor}20` }}>
                                            <Bot className="w-3.5 h-3.5" style={{ color: accentColor }} />
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-3 text-[11px] text-gray-300 font-body leading-relaxed">
                                            {chatMsg3}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Panel 2: Website Generation Preview (Right side on desktop, bottom on mobile) */}
                            <div className="w-full md:w-7/12 h-1/2 md:h-full relative overflow-hidden bg-white select-none">
                                {/* Generating Overlay */}
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full backdrop-blur-md border shadow-lg flex items-center gap-2" style={{ backgroundColor: 'rgba(0,0,0,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                                    <span className="text-[10px] font-medium text-white tracking-wide uppercase font-body">{genStatus}</span>
                                </div>

                                {/* Animated Scanning Line */}
                                <div className="absolute top-0 left-0 right-0 h-1 z-30 opacity-70 animate-[scan_3s_ease-in-out_infinite]" style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}, 0 0 20px ${accentColor}` }}></div>

                                {/* Website Mockup Content (Slightly faded/animating to simulate building) */}
                                <div className="p-4 pt-16 opacity-80 animate-pulse-slow">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="w-20 h-5 bg-gray-300 rounded"></div>
                                        <div className="flex gap-3">
                                            <div className="w-8 h-1.5 bg-gray-200 rounded"></div>
                                            <div className="w-10 h-1.5 bg-gray-200 rounded"></div>
                                            <div className="w-12 h-1.5 bg-gray-200 rounded"></div>
                                        </div>
                                    </div>

                                    {/* Hero */}
                                    <div className="text-center py-8 px-4 rounded-xl mb-6 relative overflow-hidden" style={{ backgroundColor: '#F1F5F9' }}>
                                        <div className="w-3/4 h-6 bg-gray-400 rounded mx-auto mb-3"></div>
                                        <div className="w-1/2 h-6 bg-gray-400 rounded mx-auto mb-4"></div>
                                        <div className="w-2/3 h-2 bg-gray-300 rounded mx-auto mb-2"></div>
                                        <div className="w-1/2 h-2 bg-gray-300 rounded mx-auto mb-6"></div>
                                        <div className="w-24 h-8 bg-blue-600 rounded-lg mx-auto"></div>
                                    </div>

                                    {/* Services / Blocks */}
                                    <div className="mb-6">
                                        <div className="w-24 h-4 bg-gray-300 rounded mx-auto mb-4"></div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <div className="w-6 h-6 bg-gray-200 rounded mb-2"></div>
                                                <div className="w-full h-2 bg-gray-400 rounded mb-1.5"></div>
                                                <div className="w-2/3 h-1.5 bg-gray-300 rounded"></div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <div className="w-6 h-6 bg-gray-200 rounded mb-2"></div>
                                                <div className="w-full h-2 bg-gray-400 rounded mb-1.5"></div>
                                                <div className="w-2/3 h-1.5 bg-gray-300 rounded"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Testimonials / Contact */}
                                    <div className="h-20 rounded-xl bg-gray-900 flex items-center justify-between p-4">
                                        <div>
                                            <div className="w-32 h-4 bg-white rounded mb-2"></div>
                                            <div className="w-20 h-2 bg-gray-400 rounded"></div>
                                        </div>
                                        <div className="w-16 h-6 bg-white rounded flex-shrink-0"></div>
                                    </div>
                                </div>
                            </div>
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

            {/* CSS for Scan Animation */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-pulse-slow {
                    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}} />
        </section>
    );
};

export default AiWebStudioQuimera;
