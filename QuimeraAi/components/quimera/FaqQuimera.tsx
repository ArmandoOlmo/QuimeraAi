import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FaqItem {
    question: string;
    answer: string;
}

interface FaqQuimeraProps {
    title?: string;
    subtitle?: string;
    faqs?: FaqItem[];
    colors?: {
        background?: string;
        text?: string;
        accent?: string;
    };
}

const defaultFaqs: FaqItem[] = [
    {
        question: '¿Necesito conocimientos de programación?',
        answer: 'Absolutamente no. QuimeraAi está diseñado para que cualquier persona pueda crear sitios web profesionales, tiendas y plataformas complejas utilizando nuestro editor visual intuitivo y la ayuda de nuestra IA.'
    },
    {
        question: '¿Puedo conectar mi propio dominio?',
        answer: 'Sí. Todos nuestros planes de pago incluyen la posibilidad de conectar tu propio dominio personalizado. También proporcionamos certificados SSL gratuitos para todos los dominios.'
    },
    {
        question: '¿Cómo funciona la marca blanca para agencias?',
        answer: 'El plan Agencia te permite eliminar toda la marca de QuimeraAi del editor y del sitio final. Tus clientes verán tu logo, tus colores y tu dominio en el panel de control, permitiéndote ofrecer la plataforma como un servicio propio.'
    },
    {
        question: '¿Están los sitios web optimizados para SEO y móviles?',
        answer: 'Sí, todas las páginas generadas por QuimeraAi son 100% responsivas y están optimizadas técnicamente para SEO, incluyendo renderizado en el servidor (SSR), etiquetas automáticas y velocidades de carga ultrarrápidas.'
    },
    {
        question: '¿Puedo exportar mi código?',
        answer: 'QuimeraAi es una plataforma gestionada. No permitimos la exportación directa del código fuente, pero aseguramos que tus datos siempre te pertenezcan y puedes exportar tu contenido.'
    }
];

const FaqQuimera: React.FC<FaqQuimeraProps> = ({
    title = 'Preguntas Frecuentes',
    subtitle = 'Resolvemos tus dudas sobre la plataforma',
    faqs = defaultFaqs,
    colors = {}
}) => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    return (
        <section className="py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-yellow-500/5 rounded-full filter blur-[150px]"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                        {title}
                    </h2>
                    <p className="text-xl text-gray-400 font-light">
                        {subtitle}
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div 
                            key={index} 
                            className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                                openIndex === index 
                                    ? 'bg-white/[0.04] border-yellow-500/30 shadow-[0_0_20px_rgba(212,175,55,0.05)]' 
                                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                            }`}
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                            >
                                <h3 className={`text-lg font-bold transition-colors ${openIndex === index ? 'text-yellow-500' : 'text-white'}`}>
                                    {faq.question}
                                </h3>
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${openIndex === index ? 'bg-yellow-500/10 rotate-180 text-yellow-500' : 'bg-white/5 text-gray-400'}`}>
                                    <ChevronDown className="w-5 h-5" />
                                </div>
                            </button>
                            
                            <div 
                                className={`transition-all duration-300 ease-in-out ${
                                    openIndex === index ? 'max-h-96 opacity-100 mb-6' : 'max-h-0 opacity-0'
                                }`}
                            >
                                <p className="px-6 text-gray-400 leading-relaxed font-light">
                                    {faq.answer}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FaqQuimera;
