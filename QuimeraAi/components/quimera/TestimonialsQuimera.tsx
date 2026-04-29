import React from 'react';
import { Quote, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Testimonial {
    quote: string;
    author: string;
    role: string;
    company: string;
    avatarUrl?: string;
    rating: number;
}

interface TestimonialsQuimeraProps {
    title?: string;
    subtitle?: string;
    testimonials?: Testimonial[];
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
}

const defaultTestimonials: Testimonial[] = [
    {
        quote: "QuimeraAi nos permitió lanzar nuestra plataforma de cursos en días, no meses. La IA generó copys que convirtieron desde el día uno.",
        author: "Laura Gómez",
        role: "Fundadora",
        company: "EduDigital",
        rating: 5
    },
    {
        quote: "Como agencia, la opción de marca blanca nos ha permitido ofrecer sitios web premium a nuestros clientes cobrando 3 veces más que antes. El editor es increíblemente fluido.",
        author: "Carlos Mendoza",
        role: "Director Creativo",
        company: "Elevate Agency",
        rating: 5
    },
    {
        quote: "El sistema de inmobiliarias cambió nuestro negocio. Podemos listar propiedades automáticamente y la interfaz luce como un sitio de medio millón de dólares.",
        author: "Elena Silva",
        role: "Broker",
        company: "Silva Real Estate",
        rating: 5
    }
];

const TestimonialsQuimera: React.FC<TestimonialsQuimeraProps> = ({
    title,
    subtitle,
    testimonials = defaultTestimonials,
    colors = {}
}) => {
    const { t } = useTranslation();
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.05)';
    const cardText = colors.cardText || textColor;
    const iconColor = colors.iconColor || accentColor;
    const secondaryColor = colors.secondaryText || '#9ca3af';

    const displayTitle = title || t('editor.placeholder.title', 'Historias de Éxito');
    const displaySubtitle = subtitle || t('editor.placeholder.subtitle', 'Escribe el subtítulo aquí...');

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-0 w-1/3 h-1/2 bg-yellow-500/5 rounded-full filter blur-[150px]"></div>
                <div className="absolute bottom-0 right-0 w-1/3 h-1/2 bg-yellow-600/5 rounded-full filter blur-[150px]"></div>
                
                {/* Subtle grid pattern */}
                <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight font-header heading-caps">
                        {displayTitle}
                    </h2>
                    <p className="text-xl font-light font-body" style={{ color: secondaryColor }}>
                        {displaySubtitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                    {testimonials.map((testimonial, index) => {
                        const displayQuote = testimonial.quote || t('editor.placeholder.quote', 'Testimonio increíble.');
                        const displayAuthor = testimonial.author || t('editor.placeholder.author', 'Nombre');
                        const displayRole = testimonial.role || t('editor.placeholder.role', 'Rol');
                        const displayCompany = testimonial.company || t('editor.placeholder.company', 'Empresa');

                        return (
                        <div 
                            key={index}
                            className="group relative p-6 md:p-8 rounded-2xl transition-all duration-500 flex flex-col border"
                            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                        >
                            <Quote className="w-10 h-10 mb-6 transition-colors" style={{ color: `${iconColor}33` }} />
                            
                            <div className="flex gap-1 mb-4">
                                {Array.from({ length: testimonial.rating || 5 }).map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-current" style={{ color: accentColor }} />
                                ))}
                            </div>

                            <p className="leading-relaxed font-light mb-8 flex-grow font-body" style={{ color: cardText }}>
                                "{displayQuote}"
                            </p>

                            <div className="flex items-center gap-4 mt-auto">
                                {testimonial.avatarUrl ? (
                                    <img 
                                        src={testimonial.avatarUrl} 
                                        alt={displayAuthor}
                                        className="w-12 h-12 rounded-full border border-white/10 object-cover"
                                        style={{ borderColor: cardBorder }}
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold border" style={{ backgroundColor: `${accentColor}1A`, borderColor: `${accentColor}33`, color: accentColor }}>
                                        {displayAuthor.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold font-header heading-caps" style={{ color: cardText }}>{displayAuthor}</h4>
                                    <p className="text-sm font-body" style={{ color: secondaryColor }}>
                                        {displayRole}, <span style={{ color: `${accentColor}CC` }}>{displayCompany}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        </section>
    );
};

export default TestimonialsQuimera;
