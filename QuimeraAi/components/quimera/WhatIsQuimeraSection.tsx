import React from 'react';
import {
    Globe, Paintbrush, FileText, Bot, Users, ShoppingBag,
    Workflow, Building2, ArrowRight, Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BenefitCard {
    icon: string;
    title: string;
    description: string;
}

interface WhatIsQuimeraSectionProps {
    title?: string;
    subtitle?: string;
    introText?: string;
    benefits?: BenefitCard[];
    differentiatorTitle?: string;
    differentiatorText?: string;
    primaryButtonText?: string;
    primaryButtonLink?: string;
    secondaryButtonText?: string;
    secondaryButtonLink?: string;
    footnote?: string;
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
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
    Globe,
    Paintbrush,
    FileText,
    Bot,
    Users,
    ShoppingBag,
    Workflow,
    Building2,
    Sparkles,
};

const getIcon = (iconName: string, className: string) => {
    const Icon = iconMap[iconName] || Sparkles;
    return <Icon className={className} />;
};

const WhatIsQuimeraSection: React.FC<WhatIsQuimeraSectionProps> = ({
    title,
    subtitle,
    introText,
    benefits,
    differentiatorTitle,
    differentiatorText,
    primaryButtonText,
    primaryButtonLink = '/register',
    secondaryButtonText,
    secondaryButtonLink = '#features',
    footnote,
    colors = {},
    textDropShadow = false,
    isPreviewMode = false,
}) => {
    const { t } = useTranslation();

    // ── Color Resolution ──
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';
    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.06)';
    const cardText = colors.cardText || textColor;
    const iconColor = colors.iconColor || accentColor;
    const secondaryColor = colors.secondaryText || '#9ca3af';

    // ── Content Resolution (props → i18n fallback) ──
    const displayTitle = title || t('quimera.whatis.title', 'Todo lo que tu negocio necesita para crecer en internet, impulsado por AI.');
    const displaySubtitle = subtitle || t('quimera.whatis.subtitle', 'Quimera AI combina creación de websites, contenido, automatización, ecommerce, leads y asistentes inteligentes en una sola plataforma diseñada para que cualquier negocio pueda lanzar, vender y operar más rápido.');
    const displayIntro = introText || t('quimera.whatis.introText', 'Quimera AI es una plataforma inteligente que convierte la información de tu negocio en una presencia digital completa. Desde un website profesional hasta herramientas de ventas, contenido, automatización y atención al cliente — todo trabaja conectado en un mismo ecosistema.');

    const getDefaultBenefits = (t: any): BenefitCard[] => [
        { icon: 'Globe', title: t('quimera.whatis.benefit1.title', 'Websites generados con AI'), description: t('quimera.whatis.benefit1.desc', 'Crea páginas profesionales a partir de una descripción simple de tu negocio, con estructura, textos y secciones listas para publicar.') },
        { icon: 'Paintbrush', title: t('quimera.whatis.benefit2.title', 'Editor visual fácil de usar'), description: t('quimera.whatis.benefit2.desc', 'Ajusta textos, colores, imágenes, secciones y estilo sin depender de procesos complicados.') },
        { icon: 'FileText', title: t('quimera.whatis.benefit3.title', 'Contenido inteligente'), description: t('quimera.whatis.benefit3.desc', 'Genera textos para páginas, productos, campañas, blogs, emails y redes sociales directamente desde la plataforma.') },
        { icon: 'Bot', title: t('quimera.whatis.benefit4.title', 'Chatbot y asistentes integrados'), description: t('quimera.whatis.benefit4.desc', 'Atiende visitantes, captura leads, responde preguntas frecuentes y guía clientes usando asistentes conectados a la información del negocio.') },
        { icon: 'Users', title: t('quimera.whatis.benefit5.title', 'Leads, citas y clientes'), description: t('quimera.whatis.benefit5.desc', 'Centraliza contactos, formularios, solicitudes, reservaciones y oportunidades para dar seguimiento desde un solo lugar.') },
        { icon: 'ShoppingBag', title: t('quimera.whatis.benefit6.title', 'Ecommerce y servicios'), description: t('quimera.whatis.benefit6.desc', 'Vende productos, servicios, membresías o recursos digitales con una experiencia integrada al website.') },
        { icon: 'Workflow', title: t('quimera.whatis.benefit7.title', 'Automatización de procesos'), description: t('quimera.whatis.benefit7.desc', 'Reduce tareas repetitivas con flujos automáticos para mensajes, seguimiento, contenido y operaciones internas.') },
        { icon: 'Building2', title: t('quimera.whatis.benefit8.title', 'Preparada para agencias'), description: t('quimera.whatis.benefit8.desc', 'Administra múltiples clientes, proyectos y websites desde una base escalable pensada para crecimiento.') },
    ];

    const displayBenefits = benefits && benefits.length > 0 ? benefits : getDefaultBenefits(t);

    const displayDiffTitle = differentiatorTitle || t('quimera.whatis.diffTitle', 'No es solo crear una página. Es construir el sistema digital de tu negocio.');
    const displayDiffText = differentiatorText || t('quimera.whatis.diffText', 'Mientras otras herramientas se enfocan únicamente en diseño o publicación, Quimera AI conecta las partes esenciales del negocio: presencia online, generación de contenido, captación de clientes, ventas, comunicación y automatización.');

    const displayPrimaryBtn = primaryButtonText || t('quimera.whatis.primaryBtn', 'Comienza con Quimera AI');
    const displaySecondaryBtn = secondaryButtonText || t('quimera.whatis.secondaryBtn', 'Ver cómo funciona');
    const displayFootnote = footnote || t('quimera.whatis.footnote', 'Diseñado para pequeños negocios, creadores, profesionales, realtors, restaurantes, tiendas online y agencias.');

    // Click handler that respects preview mode
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
                    className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full filter blur-[140px]"
                    style={{ backgroundColor: `${accentColor}08` }}
                />
                <div
                    className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full filter blur-[120px]"
                    style={{ backgroundColor: `${accentColor}06` }}
                />
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full filter blur-[160px]"
                    style={{ backgroundColor: `${accentColor}04` }}
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">

                {/* ═══════════════════════════════════════════════════════
                    1. INTRO BLOCK
                   ═══════════════════════════════════════════════════════ */}
                <div className="text-center mb-16 md:mb-20 max-w-4xl mx-auto">
                    <h2
                        className={`text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-black mb-6 tracking-tight leading-tight font-header ${textDropShadow ? 'drop-shadow-xl' : ''}`}
                        style={{ textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}
                    >
                        {displayTitle}
                    </h2>

                    <p
                        className={`text-lg md:text-xl font-light mb-8 leading-relaxed max-w-3xl mx-auto font-body ${textDropShadow ? 'drop-shadow-md' : ''}`}
                        style={{ color: secondaryColor }}
                    >
                        {displaySubtitle}
                    </p>

                    {/* Intro paragraph with subtle accent border */}
                    <div
                        className="relative inline-block max-w-3xl rounded-2xl px-6 py-5 md:px-8 md:py-6 backdrop-blur-sm border"
                        style={{
                            backgroundColor: `${accentColor}08`,
                            borderColor: `${accentColor}18`,
                        }}
                    >
                        <p
                            className={`text-base md:text-lg leading-relaxed font-body ${textDropShadow ? 'drop-shadow-sm' : ''}`}
                            style={{ color: secondaryColor }}
                        >
                            {displayIntro}
                        </p>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════
                    2. BENEFITS GRID — 8 cards in 2×4 / 4×2 responsive grid
                   ═══════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-16 md:mb-20">
                    {displayBenefits.map((benefit, index) => {
                        const bTitle = benefit.title || t('quimera.whatis.item.title', 'Título');
                        const bDesc = benefit.description || t('quimera.whatis.item.desc', 'Descripción');

                        return (
                            <div
                                key={index}
                                className="group relative p-5 md:p-6 rounded-2xl transition-all duration-500 overflow-hidden border"
                                style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                            >
                                {/* Hover gradient glow */}
                                <div
                                    className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
                                    style={{ background: `linear-gradient(135deg, ${accentColor}1A, transparent 60%)` }}
                                />

                                <div className="relative z-10">
                                    {/* Icon */}
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 border"
                                        style={{
                                            backgroundColor: `${iconColor}12`,
                                            color: iconColor,
                                            borderColor: `${iconColor}25`,
                                        }}
                                    >
                                        {getIcon(benefit.icon, 'w-6 h-6')}
                                    </div>

                                    {/* Title */}
                                    <h3
                                        className={`text-lg font-bold mb-2 font-header ${textDropShadow ? 'drop-shadow-md' : ''}`}
                                        style={{
                                            color: cardText,
                                            textTransform: 'var(--headings-transform, none)' as any,
                                            letterSpacing: 'var(--headings-spacing, normal)',
                                        }}
                                    >
                                        {bTitle}
                                    </h3>

                                    {/* Description */}
                                    <p
                                        className={`text-sm leading-relaxed font-light font-body ${textDropShadow ? 'drop-shadow-sm' : ''}`}
                                        style={{ color: secondaryColor }}
                                    >
                                        {bDesc}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ═══════════════════════════════════════════════════════
                    3. DIFFERENTIATOR BLOCK
                   ═══════════════════════════════════════════════════════ */}
                <div
                    className="relative rounded-3xl p-8 md:p-12 mb-16 md:mb-20 overflow-hidden border backdrop-blur-sm"
                    style={{
                        backgroundColor: `${accentColor}06`,
                        borderColor: `${accentColor}20`,
                    }}
                >
                    {/* Inner glow */}
                    <div
                        className="absolute top-0 right-0 w-80 h-80 rounded-full filter blur-[100px] pointer-events-none"
                        style={{ backgroundColor: `${accentColor}10` }}
                    />
                    <div
                        className="absolute bottom-0 left-0 w-60 h-60 rounded-full filter blur-[80px] pointer-events-none"
                        style={{ backgroundColor: `${accentColor}08` }}
                    />

                    <div className="relative z-10 max-w-3xl mx-auto text-center">
                        {/* Accent dot */}
                        <div className="flex justify-center mb-6">
                            <div
                                className="w-12 h-1 rounded-full"
                                style={{ backgroundColor: accentColor }}
                            />
                        </div>

                        <h3
                            className={`text-2xl md:text-3xl lg:text-4xl font-black mb-6 tracking-tight leading-tight font-header ${textDropShadow ? 'drop-shadow-xl' : ''}`}
                            style={{
                                color: textColor,
                                textTransform: 'var(--headings-transform, none)' as any,
                                letterSpacing: 'var(--headings-spacing, normal)',
                            }}
                        >
                            {displayDiffTitle}
                        </h3>

                        <p
                            className={`text-base md:text-lg leading-relaxed font-light font-body ${textDropShadow ? 'drop-shadow-md' : ''}`}
                            style={{ color: secondaryColor }}
                        >
                            {displayDiffText}
                        </p>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════
                    4. CTA BLOCK
                   ═══════════════════════════════════════════════════════ */}
                <div className="text-center">
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                        {/* Primary CTA */}
                        <a
                            href={primaryButtonLink}
                            onClick={(e) => handleClick(e, primaryButtonLink)}
                            className="group relative px-8 py-4 font-bold rounded-xl transition-all w-full sm:w-auto flex items-center justify-center gap-2 text-lg overflow-hidden font-button"
                            style={{
                                backgroundColor: accentColor,
                                color: '#000000',
                                boxShadow: `0 0 30px ${accentColor}33`,
                                textTransform: 'var(--buttons-transform, none)' as any,
                                letterSpacing: 'var(--buttons-spacing, normal)',
                            }}
                        >
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                            {displayPrimaryBtn}
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </a>

                        {/* Secondary CTA */}
                        <a
                            href={secondaryButtonLink}
                            onClick={(e) => handleClick(e, secondaryButtonLink)}
                            className="px-8 py-4 font-medium rounded-xl transition-all w-full sm:w-auto flex items-center justify-center text-lg backdrop-blur-sm font-button border"
                            style={{
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                color: textColor,
                                textTransform: 'var(--buttons-transform, none)' as any,
                                letterSpacing: 'var(--buttons-spacing, normal)',
                            }}
                        >
                            {displaySecondaryBtn}
                        </a>
                    </div>

                    {/* Footnote */}
                    <p
                        className={`text-sm font-light font-body ${textDropShadow ? 'drop-shadow-sm' : ''}`}
                        style={{ color: secondaryColor }}
                    >
                        {displayFootnote}
                    </p>
                </div>
            </div>
        </section>
    );
};

export default WhatIsQuimeraSection;
