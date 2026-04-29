import React, { useState } from 'react';
import { Building2, ShoppingBag, UtensilsCrossed, Briefcase, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface IndustrySolutionsQuimeraProps {
    title?: string;
    subtitle?: string;
    industries?: Array<{
        icon: string;
        name: string;
        title: string;
        description: string;
        featuresList: string;
        imageColor?: string;
    }>;
    colors?: {
        background?: string;
        text?: string;
        accent?: string;
    };
}

const IndustrySolutionsQuimera: React.FC<IndustrySolutionsQuimeraProps> = ({
    title = 'Soluciones por Industria',
    subtitle = 'Módulos especializados para cada tipo de negocio. Construye plataformas potentes, no solo páginas web.',
    industries = [
        {
            icon: 'Building2',
            name: 'Inmobiliarias',
            title: 'Motor de Búsqueda de Propiedades',
            description: 'Directorio completo de propiedades con filtros avanzados, mapas interactivos y galerías de imágenes. Gestiona agentes, listados y leads desde un panel especializado.',
            featuresList: 'Filtros avanzados (precio, ubicación, tipo)\nMapas integrados y geolocalización\nPáginas de detalle dinámicas por propiedad\nFormularios de contacto asignados por agente',
            imageColor: 'from-blue-900 to-black'
        },
        {
            icon: 'ShoppingBag',
            name: 'E-commerce',
            title: 'Tiendas Online Completas',
            description: 'Vende productos físicos o digitales con un carrito de compras nativo, pasarelas de pago integradas y gestión de inventario en tiempo real.',
            featuresList: 'Catálogo de productos dinámico\nCarrito de compras y Checkout fluido\nGestión de categorías y variantes\nIntegración con Stripe y PayPal',
            imageColor: 'from-purple-900 to-black'
        },
        {
            icon: 'UtensilsCrossed',
            name: 'Restaurantes',
            title: 'Menús y Reservas Digitales',
            description: 'Digitaliza tu restaurante con menús interactivos, sistema de reservas online y gestión de pedidos para llevar o entrega a domicilio.',
            featuresList: 'Menús digitales con categorías e imágenes\nSistema de reservas de mesas integrado\nPedidos online con horarios configurables\nGalerías de platos de alta conversión',
            imageColor: 'from-orange-900 to-black'
        },
        {
            icon: 'Briefcase',
            name: 'Servicios Profesionales',
            title: 'Agendamiento y Portafolios',
            description: 'Perfecto para consultores, clínicas, salones y agencias. Muestra tus servicios, testimonios y permite a los clientes agendar citas automáticamente.',
            featuresList: 'Calendario de reservas online\nPortafolios dinámicos de proyectos\nSecciones de equipo y servicios\nEmbudos de captación de leads',
            imageColor: 'from-emerald-900 to-black'
        }
    ],
    colors = {}
}) => {
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    const [activeTab, setActiveTab] = useState(0);

    // Ensure activeTab is valid
    const safeTab = (activeTab >= 0 && activeTab < industries.length) ? activeTab : 0;
    const currentIndustry = industries[safeTab];

    const renderIcon = (iconName: string, className: string) => {
        const IconComponent = { Building2, ShoppingBag, UtensilsCrossed, Briefcase }[iconName as keyof typeof import('lucide-react')] || Briefcase;
        // @ts-ignore
        return <IconComponent className={className} />;
    };

    return (
        <section className="py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            <div className="relative z-10 max-w-7xl mx-auto">
                
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                        {title}
                    </h2>
                    <p className="text-xl text-gray-400 font-light">
                        {subtitle}
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-12 items-start">
                    
                    {/* Tabs Navigation */}
                    <div className="w-full lg:w-1/3 flex flex-col gap-2">
                        {industries.map((industry, index) => (
                            <button
                                key={index}
                                onClick={() => setActiveTab(index)}
                                className={`w-full text-left flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 ${
                                    safeTab === index 
                                        ? 'bg-yellow-500 text-black shadow-[0_0_30px_rgba(212,175,55,0.2)]' 
                                        : 'bg-white/[0.02] border border-white/5 text-gray-400 hover:bg-white/[0.05] hover:text-white'
                                }`}
                            >
                                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                                    safeTab === index ? 'bg-black/10' : 'bg-white/5'
                                }`}>
                                    {renderIcon(industry.icon, "w-5 h-5")}
                                </div>
                                <span className="font-bold text-lg">{industry.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="w-full lg:w-2/3">
                        {currentIndustry && (
                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 md:p-10 relative overflow-hidden min-h-[500px] flex flex-col justify-center">
                                
                                {/* Abstract Graphic Background based on active tab */}
                                <div className={`absolute top-0 right-0 w-3/4 h-full bg-gradient-to-bl ${currentIndustry.imageColor || 'from-yellow-900 to-black'} opacity-20 pointer-events-none transition-colors duration-700`}></div>
                                <div className="absolute -right-20 -top-20 w-96 h-96 bg-yellow-500/10 rounded-full filter blur-[100px] pointer-events-none transition-all duration-700"></div>

                                <div className="relative z-10 max-w-xl">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-500 mb-6">
                                        {renderIcon(currentIndustry.icon, "w-6 h-6")}
                                    </div>
                                    
                                    <h3 className="text-3xl font-bold mb-4 animate-fade-in-up" key={`title-${safeTab}`}>
                                        {currentIndustry.title}
                                    </h3>
                                    
                                    <p className="text-gray-400 text-lg mb-8 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }} key={`desc-${safeTab}`}>
                                        {currentIndustry.description}
                                    </p>

                                    <ul className="space-y-3 mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }} key={`features-${safeTab}`}>
                                        {currentIndustry.featuresList.split('\n').filter(f => f.trim() !== '').map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0"></div>
                                                <span className="text-gray-300">{feature.trim()}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button className="group flex items-center gap-2 text-yellow-500 font-bold hover:text-yellow-400 transition-colors animate-fade-in-up" style={{ animationDelay: '0.3s' }} key={`btn-${safeTab}`}>
                                        Explorar solución para {currentIndustry.name} 
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </section>
    );
};

export default IndustrySolutionsQuimera;
