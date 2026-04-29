import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CtaQuimeraProps {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    buttonLink?: string;
    secondaryButtonText?: string;
    secondaryButtonLink?: string;
    colors?: {
        background?: string;
        text?: string;
        accent?: string;
    };
    onNavigate?: (href: string) => void;
}

const CtaQuimera: React.FC<CtaQuimeraProps> = ({
    title = '¿Listo para escalar tu negocio digital?',
    subtitle = 'Únete a la plataforma todo en uno impulsada por IA y comienza a construir el futuro hoy mismo.',
    buttonText = 'Empezar Gratis',
    buttonLink = '/register',
    secondaryButtonText = 'Ver Demo',
    secondaryButtonLink = '/demo',
    colors = {},
    onNavigate
}) => {
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (onNavigate) {
            e.preventDefault();
            onNavigate(href);
        }
    };

    return (
        <section className="py-32 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            
            {/* Background elements */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-screen filter grayscale"></div>
                
                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-[#050505]"></div>
                
                {/* Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full filter blur-[150px]"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-sm font-medium mb-8 backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    <span>Sin tarjeta de crédito requerida</span>
                </div>

                <h2 className="text-5xl md:text-6xl font-black mb-8 tracking-tight">
                    {title}
                </h2>
                
                <p className="text-xl md:text-2xl text-gray-400 font-light mb-12 max-w-3xl mx-auto leading-relaxed">
                    {subtitle}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <a
                        href={buttonLink}
                        onClick={(e) => handleNavigate(e, buttonLink)}
                        className="group relative px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-all shadow-[0_0_30px_rgba(234,179,8,0.2)] hover:shadow-[0_0_50px_rgba(234,179,8,0.4)] hover:-translate-y-1 w-full sm:w-auto flex items-center justify-center gap-2 text-lg overflow-hidden"
                    >
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                        {buttonText} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </a>
                    
                    {secondaryButtonText && (
                        <a
                            href={secondaryButtonLink}
                            onClick={(e) => handleNavigate(e, secondaryButtonLink)}
                            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium rounded-xl transition-all w-full sm:w-auto flex items-center justify-center text-lg backdrop-blur-sm"
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
