import React from 'react';
import { Bot, Sparkles, MessageSquare, Image as ImageIcon, FileText, Zap } from 'lucide-react';

interface AiCapabilitiesQuimeraProps {
    title?: string;
    subtitle?: string;
    colors?: {
        background?: string;
        text?: string;
        accent?: string;
    };
    capabilities?: Array<{
        icon: string;
        title: string;
        description: string;
    }>;
}

const AiCapabilitiesQuimera: React.FC<AiCapabilitiesQuimeraProps> = ({
    title = 'Impulsado por Inteligencia Artificial',
    subtitle = 'Deja que nuestra IA haga el trabajo pesado. Genera contenido, diseño y código con simples instrucciones.',
    capabilities = [
        { icon: 'MessageSquare', title: 'Asistente Global Integrado', description: 'Un chatbot inteligente en tu panel de control listo para generar secciones enteras, escribir copys o sugerir paletas de colores.' },
        { icon: 'FileText', title: 'Copywriting Automatizado', description: 'Dile adiós al síndrome de la página en blanco. Nuestra IA redacta títulos persuasivos y descripciones de productos que convierten.' },
        { icon: 'ImageIcon', title: 'Sugerencias Visuales', description: 'Selección inteligente de imágenes de stock y generación de estilos CSS para que tu sitio siempre luzca profesional.' }
    ],
    colors = {}
}) => {
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    // Helper to render lucide icons dynamically
    const renderIcon = (iconName: string, className: string) => {
        const IconComponent = { MessageSquare, FileText, ImageIcon: ImageIcon, Bot, Sparkles, Zap }[iconName as keyof typeof import('lucide-react')] || Zap;
        // @ts-ignore
        return <IconComponent className={className} />;
    };

    return (
        <section className="py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[600px] pointer-events-none">
                {/* Simulated Neural Network grid / nodes background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.1)_0%,transparent_70%)] blur-[50px]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
                
                {/* Left Side: Text and Features */}
                <div className="lg:w-1/2">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm font-medium mb-6">
                        <Bot className="w-4 h-4" />
                        <span>Quimera AI Assistant</span>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight leading-tight">
                        {title}
                    </h2>
                    
                    <p className="text-xl text-gray-400 font-light mb-10">
                        {subtitle}
                    </p>

                    <div className="space-y-6">
                        {capabilities.map((cap, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-yellow-500">
                                    {renderIcon(cap.icon, "w-6 h-6")}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-2">{cap.title}</h3>
                                    <p className="text-gray-400">{cap.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Interactive AI Mockup */}
                <div className="lg:w-1/2 w-full">
                    <div className="relative rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-[0_0_50px_rgba(212,175,55,0.05)] overflow-hidden">
                        {/* Mock Chat Interface */}
                        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">Quimera AI</h4>
                                <p className="text-xs text-gray-500">En línea</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-6 min-h-[300px]">
                            {/* User Message */}
                            <div className="flex justify-end animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                                <div className="bg-white/10 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] text-sm">
                                    Crea una sección de Hero para una cafetería moderna. Usa tonos oscuros y dorados.
                                </div>
                            </div>

                            {/* AI Generating Indicator */}
                            <div className="flex justify-start items-end gap-2 animate-fade-in-up" style={{ animationDelay: '1.5s' }}>
                                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 flex-shrink-0">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] text-sm text-yellow-200">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-4 h-4 animate-pulse" />
                                        Generando componente y copy...
                                    </div>
                                </div>
                            </div>

                            {/* AI Result */}
                            <div className="flex justify-start items-end gap-2 animate-fade-in-up" style={{ animationDelay: '3s', animationFillMode: 'both' }}>
                                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 flex-shrink-0 opacity-0">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl rounded-tl-sm p-4 w-[85%]">
                                    <p className="text-sm text-gray-300 mb-3">¡Listo! He añadido la sección a tu página. Así es como se ve:</p>
                                    
                                    {/* Mini mockup of generated section */}
                                    <div className="w-full h-24 rounded-lg bg-black border border-white/10 overflow-hidden relative group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-black to-yellow-900/40"></div>
                                        <div className="absolute inset-0 p-3 flex flex-col justify-center">
                                            <div className="w-1/2 h-4 bg-white/80 rounded mb-2"></div>
                                            <div className="w-3/4 h-2 bg-white/40 rounded mb-4"></div>
                                            <div className="w-16 h-4 bg-yellow-500 rounded"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    disabled
                                    placeholder="Escribe tu prompt aquí..." 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-gray-400 cursor-not-allowed"
                                />
                                <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-yellow-500 text-black flex items-center justify-center">
                                    <Sparkles className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AiCapabilitiesQuimera;
