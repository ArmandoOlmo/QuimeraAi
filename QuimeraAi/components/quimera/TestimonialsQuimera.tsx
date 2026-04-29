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
    title = 'Historias de Éxito',
    subtitle = 'Únete a miles de emprendedores y agencias que ya están escalando con QuimeraAi.',
    testimonials = defaultTestimonials,
    colors = {}
}) => {
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    return (
        <section className="py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-0 w-1/3 h-1/2 bg-yellow-500/5 rounded-full filter blur-[150px]"></div>
                <div className="absolute bottom-0 right-0 w-1/3 h-1/2 bg-yellow-600/5 rounded-full filter blur-[150px]"></div>
                
                {/* Subtle grid pattern */}
                <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <div 
                            key={index}
                            className="group relative p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-yellow-500/30 transition-all duration-500 flex flex-col"
                        >
                            <Quote className="w-10 h-10 text-yellow-500/20 mb-6 group-hover:text-yellow-500/40 transition-colors" />
                            
                            <div className="flex gap-1 mb-4">
                                {Array.from({ length: testimonial.rating }).map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                ))}
                            </div>

                            <p className="text-gray-300 leading-relaxed font-light mb-8 flex-grow">
                                "{testimonial.quote}"
                            </p>

                            <div className="flex items-center gap-4 mt-auto">
                                {testimonial.avatarUrl ? (
                                    <img 
                                        src={testimonial.avatarUrl} 
                                        alt={testimonial.author}
                                        className="w-12 h-12 rounded-full border border-white/10 object-cover"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 flex items-center justify-center text-yellow-500 font-bold">
                                        {testimonial.author.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold text-white">{testimonial.author}</h4>
                                    <p className="text-sm text-gray-400">
                                        {testimonial.role}, <span className="text-yellow-500/80">{testimonial.company}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TestimonialsQuimera;
