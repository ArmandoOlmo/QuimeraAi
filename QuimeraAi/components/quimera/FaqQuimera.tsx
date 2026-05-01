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
        cardBackground?: string;
        cardBorder?: string;
        cardText?: string;
        iconColor?: string;
        secondaryText?: string;
    };
    textDropShadow?: boolean;
}

const getDefaultFaqs = (t: any): FaqItem[] => [
    {
        question: t('quimera.faq.item1.question', '¿Necesito conocimientos de programación?'),
        answer: t('quimera.faq.item1.answer', 'Absolutamente no. QuimeraAi está diseñado para que cualquier persona pueda crear sitios web profesionales, tiendas y plataformas complejas utilizando nuestro editor visual intuitivo y la ayuda de nuestra IA.')
    },
    {
        question: t('quimera.faq.item2.question', '¿Puedo conectar mi propio dominio?'),
        answer: t('quimera.faq.item2.answer', 'Sí. Todos nuestros planes de pago incluyen la posibilidad de conectar tu propio dominio personalizado. También proporcionamos certificados SSL gratuitos para todos los dominios.')
    },
    {
        question: t('quimera.faq.item3.question', '¿Cómo funciona la marca blanca para agencias?'),
        answer: t('quimera.faq.item3.answer', 'El plan Agencia te permite eliminar toda la marca de QuimeraAi del editor y del sitio final. Tus clientes verán tu logo, tus colores y tu dominio en el panel de control, permitiéndote ofrecer la plataforma como un servicio propio.')
    },
    {
        question: t('quimera.faq.item4.question', '¿Están los sitios web optimizados para SEO y móviles?'),
        answer: t('quimera.faq.item4.answer', 'Sí, todas las páginas generadas por QuimeraAi son 100% responsivas y están optimizadas técnicamente para SEO, incluyendo renderizado en el servidor (SSR), etiquetas automáticas y velocidades de carga ultrarrápidas.')
    },
    {
        question: t('quimera.faq.item5.question', '¿Puedo exportar mi código?'),
        answer: t('quimera.faq.item5.answer', 'QuimeraAi es una plataforma gestionada. No permitimos la exportación directa del código fuente, pero aseguramos que tus datos siempre te pertenezcan y puedes exportar tu contenido.')
    }
];

const FaqQuimera: React.FC<FaqQuimeraProps> = ({
    title,
    subtitle,
    faqs,
    colors = {},
    textDropShadow = false
}) => {
    const { t } = useTranslation();
    const displayFaqs = faqs || getDefaultFaqs(t);
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.05)';
    const cardText = colors.cardText || textColor;
    const iconColor = colors.iconColor || accentColor;
    const secondaryColor = colors.secondaryText || '#9ca3af';

    const displayTitle = title || t('quimera.faq.title', 'Preguntas Frecuentes');
    const displaySubtitle = subtitle || t('quimera.faq.subtitle', 'Escribe el subtítulo aquí...');

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-yellow-500/5 rounded-full filter blur-[150px]"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className={`text-4xl md:text-5xl font-bold mb-6 tracking-tight font-header heading-caps ${textDropShadow ? 'drop-shadow-xl' : ''}`}>
                        {displayTitle}
                    </h2>
                    <p className={`text-xl font-light font-body ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: secondaryColor }}>
                        {displaySubtitle}
                    </p>
                </div>

                <div className="space-y-4">
                    {displayFaqs.map((faq, index) => {
                        const displayQuestion = faq.question || t('quimera.faq.item.question', '¿Pregunta?');
                        const displayAnswer = faq.answer || t('quimera.faq.item.answer', 'Respuesta detallada.');

                        return (
                        <div 
                            key={index} 
                            className="rounded-2xl border transition-all duration-300 overflow-hidden"
                            style={{ 
                                backgroundColor: cardBg, 
                                borderColor: openIndex === index ? `${accentColor}4D` : cardBorder,
                                boxShadow: openIndex === index ? `0 0 20px ${accentColor}0D` : 'none'
                            }}
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full flex items-center justify-between p-4 md:p-6 text-left focus:outline-none font-button button-caps"
                            >
                                <h3 className="text-lg font-bold transition-colors" style={{ color: openIndex === index ? iconColor : cardText }}>
                                    {displayQuestion}
                                </h3>
                                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 border" style={{ backgroundColor: openIndex === index ? `${accentColor}1A` : 'rgba(255,255,255,0.05)', color: openIndex === index ? iconColor : secondaryColor, borderColor: openIndex === index ? 'transparent' : 'rgba(255,255,255,0.05)', transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                    <ChevronDown className="w-5 h-5 font-header heading-caps" />
                                </div>
                            </button>
                            
                            <div 
                                className={`transition-all duration-300 ease-in-out ${
                                    openIndex === index ? 'max-h-96 opacity-100 mb-6' : 'max-h-0 opacity-0'
                                }`}
                            >
                                <p className="px-6 leading-relaxed font-light font-body" style={{ color: secondaryColor }}>
                                    {displayAnswer}
                                </p>
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        </section>
    );
};

export default FaqQuimera;
