import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CtaQuimeraProps {
    title?: string;
    subtitle?: string;
    badgeText?: string;
    buttonText?: string;
    buttonLink?: string;
    secondaryButtonText?: string;
    secondaryButtonLink?: string;
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
    onNavigate?: (href: string) => void;
}

const CtaQuimera: React.FC<CtaQuimeraProps> = ({
    title,
    subtitle,
    badgeText,
    buttonText,
    buttonLink = '/register',
    secondaryButtonText,
    secondaryButtonLink = '/demo',
    colors = {},
    textDropShadow = false,
    onNavigate
}) => {
    const { t } = useTranslation();
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.05)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.1)';
    const secondaryColor = colors.secondaryText || '#9ca3af';

    const displayTitle = title || t('quimera.cta.title', '¿Listo para escalar tu negocio digital?');
    const displaySubtitle = subtitle || t('quimera.cta.subtitle', 'Escribe el subtítulo aquí...');
    const displayBtn = buttonText || t('quimera.cta.button', 'Empezar Gratis');
    const displayBadge = badgeText || t('quimera.cta.badge', 'Sin tarjeta de crédito requerida');

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (onNavigate) {
            e.preventDefault();
            onNavigate(href);
        }
    };

    return (
        <section className="py-16 md:py-32 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            
            {/* Background elements */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-screen filter grayscale"></div>
                
                <div 
                    className="absolute inset-0 opacity-50"
                    style={{ background: `linear-gradient(to bottom, ${bgColor}, transparent, ${bgColor})` }}
                ></div>
                <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${bgColor}, transparent, ${bgColor})` }}></div>
                
                {/* Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full filter blur-[150px]"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-sm font-medium mb-8 backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    <span>{displayBadge}</span>
                </div>

                <h2 className={`text-5xl md:text-6xl font-black mb-8 tracking-tight font-header heading-caps ${textDropShadow ? 'drop-shadow-xl' : ''}`}>
                    {displayTitle}
                </h2>
                
                <p className={`text-xl md:text-2xl font-light mb-12 max-w-3xl mx-auto leading-relaxed font-body ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: secondaryColor }}>
                    {displaySubtitle}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <a
                        href={buttonLink}
                        onClick={(e) => handleNavigate(e, buttonLink)}
                        className="group relative px-8 py-4 font-bold rounded-xl transition-all w-full sm:w-auto flex items-center justify-center gap-2 text-lg overflow-hidden font-button button-caps"
                        style={{ backgroundColor: accentColor, color: '#000000', boxShadow: `0 0 30px ${accentColor}33` }}
                    >
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                        {displayBtn} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </a>
                    
                    {secondaryButtonText && (
                        <a
                            href={secondaryButtonLink}
                            onClick={(e) => handleNavigate(e, secondaryButtonLink)}
                            className="px-8 py-4 font-medium rounded-xl transition-all w-full sm:w-auto flex items-center justify-center text-lg backdrop-blur-sm font-button button-caps border"
                            style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}
                        >
                            {secondaryButtonText}
                        </a>
                    )}
                </div>
            </div>
        </section>
    );
};

export default CtaQuimera;
