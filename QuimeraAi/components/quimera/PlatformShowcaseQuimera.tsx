import React from 'react';
import { Layout, Palette, Code, Smartphone, Zap, Shield, Search, Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PlatformShowcaseQuimeraProps {
    title?: string;
    subtitle?: string;
    colors?: {
        background?: string;
        text?: string;
        accent?: string;
    };
}

const PlatformShowcaseQuimera: React.FC<PlatformShowcaseQuimeraProps> = ({
    title = 'Plataforma Todo en Uno',
    subtitle = 'Todo lo que necesitas para escalar tu negocio digital en un solo lugar',
    colors = {}
}) => {
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    return (
        <section className="py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-yellow-500/5 to-transparent"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                        {title}
                    </h2>
                    <p className="text-xl text-gray-400 font-light">
                        {subtitle}
                    </p>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[300px]">
                    
                    {/* Large Cell - Web Editor */}
                    <div className="md:col-span-2 md:row-span-2 group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-yellow-500/30 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden flex flex-col">
                        <div className="absolute -inset-px bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none" />
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-6">
                            <Layout className="w-6 h-6" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4">Web Editor Avanzado</h3>
                        <p className="text-gray-400 text-lg mb-8 max-w-md">
                            Crea sitios impresionantes con nuestro editor drag & drop. Diseños premium pre-construidos y personalización total sin código.
                        </p>
                        <div className="mt-auto relative w-full h-48 rounded-xl bg-[#0a0a0a] border border-white/10 overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                            {/* Editor mock UI */}
                            <div className="absolute top-0 w-full h-8 bg-white/5 border-b border-white/10 flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <div className="absolute top-8 left-0 w-1/4 h-full bg-white/5 border-r border-white/10 p-4 space-y-3">
                                <div className="h-4 w-full bg-white/10 rounded"></div>
                                <div className="h-4 w-3/4 bg-white/10 rounded"></div>
                                <div className="h-4 w-5/6 bg-white/10 rounded"></div>
                            </div>
                            <div className="absolute top-12 left-1/4 w-3/4 h-full p-6 flex flex-col items-center justify-center gap-4">
                                <div className="w-32 h-8 bg-yellow-500/20 rounded-full"></div>
                                <div className="w-64 h-4 bg-white/10 rounded"></div>
                                <div className="w-48 h-4 bg-white/10 rounded"></div>
                            </div>
                        </div>
                    </div>

                    {/* Medium Cell - CRM/Database */}
                    <div className="md:col-span-2 group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-yellow-500/30 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 filter blur-[50px] group-hover:bg-yellow-500/20 transition-all duration-500"></div>
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-6">
                            <Database className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">Gestión de Leads (CRM)</h3>
                        <p className="text-gray-400">
                            Captura, gestiona y nutre a tus clientes potenciales desde un dashboard centralizado. Formularios dinámicos integrados.
                        </p>
                    </div>

                    {/* Small Cell - SEO */}
                    <div className="md:col-span-1 group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-yellow-500/30 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-6 group-hover:-translate-y-1 transition-transform">
                            <Search className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">SEO Automático</h3>
                        <p className="text-sm text-gray-400">
                            Sitemaps, meta tags y robots.txt generados y actualizados automáticamente (SSR).
                        </p>
                    </div>

                    {/* Small Cell - Mobile */}
                    <div className="md:col-span-1 group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-yellow-500/30 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-6 group-hover:-translate-y-1 transition-transform">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Mobile First</h3>
                        <p className="text-sm text-gray-400">
                            Previsualizador móvil en tiempo real y componentes nativamente responsivos.
                        </p>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default PlatformShowcaseQuimera;
