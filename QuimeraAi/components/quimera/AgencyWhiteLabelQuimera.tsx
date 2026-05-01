import React from 'react';
import { Users, Palette, CheckCircle2, ShieldCheck, Globe, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AgencyWhiteLabelQuimeraProps {
    title?: string;
    subtitle?: string;
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
    features?: Array<{
        title: string;
        description: string;
    }>;
    buttonText?: string;
    buttonLink?: string;
    imagePosition?: 'left' | 'right';
}

const AgencyWhiteLabelQuimera: React.FC<AgencyWhiteLabelQuimeraProps> = ({
    title,
    subtitle,
    features = [
        { title: 'Sin Rastros de Quimera', description: 'Tu logo en el login, editor y dashboard. Tus clientes nunca sabrán qué tecnología usas.' },
        { title: 'Cobra lo que Quieras', description: 'Nosotros te cobramos una tarifa plana. Tú estableces los precios para tus clientes y te quedas con el 100%.' },
        { title: 'Subcuentas Ilimitadas', description: 'Crea espacios de trabajo separados para cada cliente con permisos de acceso específicos.' },
        { title: 'Soporte Prioritario', description: 'Línea directa con nuestro equipo de ingenieros para resolver cualquier duda al instante.' }
    ],
    buttonText,
    buttonLink = '#',
    colors = {},
    textDropShadow = false,
    imagePosition = 'right'
}) => {
    const { t } = useTranslation();
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.05)';
    const cardBorder = colors.cardBorder || 'rgba(212,175,55,0.3)';
    const cardText = colors.cardText || textColor;
    const iconColor = colors.iconColor || accentColor;
    const secondaryColor = colors.secondaryText || '#9ca3af';

    const displayTitle = title || t('editor.placeholder.title', 'La Plataforma Definitiva para Agencias');
    const displaySubtitle = subtitle || t('editor.placeholder.subtitle', 'Escribe el subtítulo aquí...');
    const displayBtn = buttonText || t('editor.placeholder.button', 'Ver Precios de Agencia');

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[800px] bg-gradient-to-tr from-yellow-500/5 via-transparent to-white/5 rounded-full filter blur-[100px] opacity-50"></div>
                
                {/* Custom dot pattern */}
                <div className="absolute inset-0" style={{ 
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', 
                    backgroundSize: '24px 24px',
                    maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
                }}></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <div className={`flex flex-col ${imagePosition === 'left' ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-16`}>
                    
                    {/* Visual Side */}
                    <div className="w-full lg:w-1/2 relative">
                        {/* Mockup Container */}
                        <div className="relative bg-[#0a0a0a] rounded-3xl border border-white/10 p-2 pb-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                            
                            {/* Browser Header */}
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                <div className="mx-auto px-4 py-1 rounded bg-white/5 text-xs text-gray-500 font-mono">
                                    app.tu-agencia.com
                                </div>
                            </div>

                            {/* App Interface Mockup */}
                            <div className="flex">
                                {/* Sidebar */}
                                <div className="w-16 md:w-48 bg-[#050505] border-r border-white/10 h-80 p-4 flex flex-col gap-4">
                                    {/* Custom Logo Area */}
                                    <div className="h-8 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded flex items-center justify-center border border-blue-500/30">
                                        <span className="hidden md:block text-xs font-bold text-blue-400">TU LOGO</span>
                                        <div className="md:hidden w-4 h-4 rounded-full bg-blue-500"></div>
                                    </div>
                                    <div className="h-6 bg-white/5 rounded w-full"></div>
                                    <div className="h-6 bg-white/5 rounded w-3/4"></div>
                                    <div className="h-6 bg-white/5 rounded w-5/6"></div>
                                </div>
                                
                                {/* Main Content */}
                                <div className="flex-1 p-6 h-80 bg-gradient-to-br from-[#0a0a0a] to-[#111]">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="h-6 w-32 bg-white/10 rounded"></div>
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 text-xs font-body">A</div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                                            <div className="h-3 w-16 bg-white/10 rounded mb-2"></div>
                                            <div className="h-8 w-12 bg-white/20 rounded"></div>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                                            <div className="h-3 w-20 bg-white/10 rounded mb-2"></div>
                                            <div className="h-8 w-16 bg-white/20 rounded"></div>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 border border-white/10 h-24 rounded-xl p-4">
                                        <div className="h-4 w-full bg-white/10 rounded mb-2"></div>
                                        <div className="h-4 w-2/3 bg-white/10 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Badges */}
                        <div className="absolute -right-6 top-1/4 bg-[#111] border border-yellow-500/30 p-3 rounded-xl shadow-xl flex items-center gap-3 animate-[float_4s_ease-in-out_infinite]">
                            <Palette className="w-6 h-6 text-yellow-500" />
                            <div className="text-sm font-bold">Colores Propios</div>
                        </div>
                        <div className="absolute -left-6 bottom-1/4 bg-[#111] border border-yellow-500/30 p-3 rounded-xl shadow-xl flex items-center gap-3 animate-[float_5s_ease-in-out_infinite_reverse]">
                            <Globe className="w-6 h-6 text-yellow-500" />
                            <div className="text-sm font-bold">Dominio Propio</div>
                        </div>

                    </div>

                    {/* Content Side */}
                    <div className="w-full lg:w-1/2">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm font-medium mb-6">
                            <Users className="w-4 h-4" />
                            <span>Plan Agencia</span>
                        </div>

                        <h2 className={`text-4xl md:text-5xl font-bold mb-6 tracking-tight font-header heading-caps ${textDropShadow ? 'drop-shadow-xl' : ''}`}>
                            {displayTitle}
                        </h2>
                        
                        <p className={`text-xl font-light mb-10 font-body ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: secondaryColor }}>
                            {displaySubtitle}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {features.map((feature, i) => {
                                const displayFeatureTitle = feature.title || t('editor.placeholder.title', 'Título');
                                const displayFeatureDesc = feature.description || t('editor.placeholder.description', 'Descripción');
                                return (
                                <div key={i} className="flex gap-4">
                                    <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border" style={{ backgroundColor: `${accentColor}1A`, borderColor: `${accentColor}33` }}>
                                        <CheckCircle2 className="w-4 h-4" style={{ color: iconColor }} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1 font-header heading-caps" style={{ color: cardText }}>{displayFeatureTitle}</h4>
                                        <p className={`text-sm font-body ${textDropShadow ? 'drop-shadow-sm' : ''}`} style={{ color: secondaryColor }}>{displayFeatureDesc}</p>
                                    </div>
                                </div>
                            )})}
                        </div>

                        {buttonText && (
                            <div className="mt-10">
                                <a href={buttonLink || '#'} className="group inline-flex px-8 py-4 rounded-xl transition-all items-center gap-2 font-button button-caps border" style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}>
                                    <DollarSign className="w-5 h-5" style={{ color: iconColor }} />
                                    {displayBtn}
                                </a>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>
        </section>
    );
};

export default AgencyWhiteLabelQuimera;
