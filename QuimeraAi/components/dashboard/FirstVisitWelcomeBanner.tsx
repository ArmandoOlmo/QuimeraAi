/**
 * FirstVisitWelcomeBanner
 * 
 * Displays a welcome message when the user opens the dashboard for the first time
 * after generating their website. Explains that this is their starting website
 * and that all parameters are fully editable.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Sparkles, Palette, Type, Image, Layout, MousePointerClick } from 'lucide-react';

interface FirstVisitWelcomeBannerProps {
    /** Whether the user has any projects */
    hasProjects: boolean;
}

const STORAGE_KEY = 'quimera_first_visit_banner_dismissed';

const FirstVisitWelcomeBanner: React.FC<FirstVisitWelcomeBannerProps> = ({ hasProjects }) => {
    const { t, i18n } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);

    const isSpanish = i18n.language === 'es';

    useEffect(() => {
        // Only show if user has projects and hasn't dismissed the banner before
        const wasDismissed = localStorage.getItem(STORAGE_KEY);
        if (hasProjects && !wasDismissed) {
            // Small delay so it appears after the dashboard renders
            const timer = setTimeout(() => setIsVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, [hasProjects]);

    const handleDismiss = () => {
        setIsAnimatingOut(true);
        setTimeout(() => {
            setIsVisible(false);
            localStorage.setItem(STORAGE_KEY, 'true');
        }, 400);
    };

    if (!isVisible) return null;

    const tips = isSpanish
        ? [
            { icon: <Palette size={18} />, text: 'Cambia los colores globales desde el panel de estilos' },
            { icon: <Type size={18} />, text: 'Personaliza las fuentes y tipografía de tu sitio' },
            { icon: <Image size={18} />, text: 'Reemplaza cualquier imagen con una nueva o generada por IA' },
            { icon: <Layout size={18} />, text: 'Reordena, oculta o agrega secciones a tu página' },
            { icon: <MousePointerClick size={18} />, text: 'Haz clic en cualquier texto para editarlo directamente' },
        ]
        : [
            { icon: <Palette size={18} />, text: 'Change global colors from the styles panel' },
            { icon: <Type size={18} />, text: 'Customize your site\'s fonts and typography' },
            { icon: <Image size={18} />, text: 'Replace any image with a new one or AI-generated' },
            { icon: <Layout size={18} />, text: 'Reorder, hide, or add sections to your page' },
            { icon: <MousePointerClick size={18} />, text: 'Click on any text to edit it directly' },
        ];

    return (
        <div
            className={`
                relative w-full rounded-2xl overflow-hidden
                bg-gradient-to-br from-primary/10 via-orange-500/5 to-pink-500/10
                border border-primary/20
                backdrop-blur-sm
                transition-all duration-500 ease-out
                ${isAnimatingOut ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'}
            `}
            role="alert"
            aria-live="polite"
        >
            {/* Decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-orange-500 to-pink-500" />

            {/* Close button */}
            <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-background/50 hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors z-10"
                aria-label={isSpanish ? 'Cerrar' : 'Close'}
            >
                <X size={16} />
            </button>

            <div className="p-6 md:p-8">
                {/* Header */}
                <div className="flex items-start gap-4 mb-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-lg shadow-primary/20">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">
                            {isSpanish
                                ? '🎉 ¡Tu website está listo!'
                                : '🎉 Your website is ready!'}
                        </h2>
                        <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                            {isSpanish
                                ? 'Este es tu sitio web de inicio generado con IA. Puedes personalizar absolutamente todo — colores, textos, imágenes, secciones y más. ¡Hazlo tuyo!'
                                : 'This is your AI-generated starter website. You can customize absolutely everything — colors, texts, images, sections, and more. Make it yours!'}
                        </p>
                    </div>
                </div>

                {/* Tips grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tips.map((tip, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50 hover:border-primary/30 hover:bg-background/80 transition-all duration-200"
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                {tip.icon}
                            </div>
                            <p className="text-sm text-foreground/80 leading-snug">{tip.text}</p>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="mt-5 flex items-center gap-3">
                    <button
                        onClick={handleDismiss}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-orange-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 hover:scale-105"
                    >
                        {isSpanish ? '¡Entendido, vamos!' : 'Got it, let\'s go!'}
                    </button>
                    <span className="text-xs text-muted-foreground">
                        {isSpanish
                            ? 'Selecciona tu proyecto para empezar a editar'
                            : 'Select your project to start editing'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default FirstVisitWelcomeBanner;
