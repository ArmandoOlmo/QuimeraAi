/**
 * Digital Edge — Agencia de Marketing Digital Template Preset
 * 
 * DARK MODE marketing agency landing page with blue accent (#3c83f6).
 * Imported from the Stitch template "Landing Page Agencia Marketing Digital".
 * 
 * Uses seeder at scripts/seedDigitalEdgeTemplate.ts.
 */

import { PageData, ThemeData, PageSection, BrandIdentity, NavLink } from '../../types';

// =============================================================================
// COLORS — Marketing Agency Dark Palette
// =============================================================================
const COLORS = {
    bg: '#0b1120',
    bgAlt: '#111827',
    surface: '#1e293b',
    surfaceAlt: '#334155',
    accent: '#3c83f6',
    accentHover: '#60a5fa',
    text: '#94a3b8',
    textMuted: '#64748b',
    heading: '#f1f5f9',
    border: '#1e293b',
    white: '#ffffff',
    black: '#030712',
    cardBg: '#0f172a',
};

// =============================================================================
// PAGE DATA
// =============================================================================
export const digitalEdgePageData: PageData = {
    header: {
        style: 'sticky-solid',
        layout: 'minimal',
        isSticky: true,
        glassEffect: true,
        height: 70,
        logoType: 'text',
        logoText: 'DIGITAL EDGE',
        logoImageUrl: '',
        logoWidth: 160,
        links: [
            { text: {
                        es: "Inicio",
                        en: "Home"
                    }, href: '#hero' },
            { text: {
                        es: "Servicios",
                        en: "Services"
                    }, href: '#services' },
            { text: {
                        es: "Portfolio",
                        en: "Portfolio"
                    }, href: '#portfolio' },
            { text: {
                        es: "Precios",
                        en: "Pricing"
                    }, href: '#pricing' },
        ] as NavLink[],
        hoverStyle: 'simple',
        ctaText: {
                es: "Empezar",
                en: "Get Started"
            },
        showCta: true,
        showLogin: false,
        loginText: '',
        loginUrl: '#',
        colors: {
            background: COLORS.bg,
            text: COLORS.text,
            accent: COLORS.accent,
        },
        buttonBorderRadius: 'lg',
        linkFontSize: 14,
    },
    hero: {
        heroVariant: 'modern',
        paddingY: 'xl',
        paddingX: 'lg',
        headline: {
                es: "Impulso <span class=\"text-transparent bg-clip-text\" style=\"-webkit-text-fill-color: transparent; background-image: linear-gradient(135deg, #3c83f6, #60a5fa)\">Digital Total.</span>",
                en: "Total Digital <span class=\"text-transparent bg-clip-text\" style=\"-webkit-text-fill-color: transparent; background-image: linear-gradient(135deg, #3c83f6, #60a5fa)\">Boost.</span>"
            },
        subheadline: {
                es: "Estrategias basadas en datos para marcas visionarias. Transformamos el ruido en resultados y visitantes en embajadores.",
                en: "Data-driven strategies for visionary brands. We turn noise into results and visitors into advocates."
            },
        primaryCta: {
                es: "Contactar Ahora",
                en: "Contact Now"
            },
        secondaryCta: {
                es: "Ver Proyectos",
                en: "View Projects"
            },
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2670',
        imageStyle: 'default',
        imageDropShadow: true,
        imageBorderRadius: 'lg',
        imageBorderSize: 'none',
        imageBorderColor: COLORS.border,
        imageJustification: 'end',
        imagePosition: 'right',
        imageWidth: 100,
        imageHeight: 600,
        imageHeightEnabled: false,
        imageAspectRatio: 'auto',
        imageObjectFit: 'cover',
        sectionBorderSize: 'none',
        sectionBorderColor: COLORS.border,
        colors: {
            primary: COLORS.accent,
            secondary: COLORS.surface,
            background: COLORS.bg,
            text: COLORS.text,
            heading: COLORS.heading,
            buttonBackground: COLORS.accent,
            buttonText: COLORS.white,
            secondaryButtonBackground: 'transparent',
            secondaryButtonText: COLORS.text,
        },
        secondaryButtonStyle: 'outline',
        secondaryButtonOpacity: 100,
        showBadge: true,
        badgeText: {
                es: "🚀 Crecimiento Mensual +124%",
                en: "🚀 Monthly Growth +124%"
            },
        badgeIcon: 'rocket',
        badgeColor: COLORS.accent,
        badgeBackgroundColor: `${COLORS.accent}15`,
        buttonBorderRadius: 'lg',
        animationType: 'fade-in-up',
        primaryCtaLink: '#leads',
        primaryCtaLinkType: 'section',
        secondaryCtaLink: '#portfolio',
        secondaryCtaLinkType: 'section',
        headlineFontSize: 'xl',
        subheadlineFontSize: 'md',
    },
    heroSplit: {
        headline: {
                es: "Impulso Digital Total.",
                en: "Total Digital Boost."
            },
        subheadline: {
                es: "Estrategias basadas en datos para marcas visionarias.",
                en: "Data-driven strategies for visionary brands."
            },
        buttonText: {
                es: "Contactar Ahora",
                en: "Contact Now"
            },
        buttonUrl: '#leads',
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2670',
        imagePosition: 'right',
        maxHeight: 500,
        angleIntensity: 0,
        colors: {
            textBackground: COLORS.bg,
            imageBackground: COLORS.bgAlt,
            heading: COLORS.heading,
            text: COLORS.text,
            buttonBackground: COLORS.accent,
            buttonText: COLORS.white,
        },
        headlineFontSize: 'lg',
        subheadlineFontSize: 'md',
        buttonBorderRadius: 'lg',
    },
    features: {
        featuresVariant: 'bento-premium',
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "Nuestro Enfoque",
                en: "Our Approach"
            },
        description: {
                es: "Tres pilares que impulsan cada campaña que creamos: datos, creatividad y escalabilidad.",
                en: "Three pillars drive every campaign we create: data, creativity, and scalability."
            },
        items: [
            {
                title: {
                        es: "Data Driven",
                        en: "Data-Driven"
                    },
                description: {
                        es: "Decision making basada en métricas reales. Optimizamos cada interacción para maximizar tu ROI.",
                        en: "Decision-making based on real metrics. We optimize every interaction to maximize your ROI."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2670',
            },
            {
                title: {
                        es: "Creative Tech",
                        en: "Creative Tech"
                    },
                description: {
                        es: "Fusión de diseño vanguardista y tecnología. Campañas que cautivan visualmente y convierten.",
                        en: "Fusion of cutting-edge design and technology. Visually captivating and converting campaigns."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&q=80&w=2670',
            },
            {
                title: {
                        es: "Scale Ready",
                        en: "Scalable"
                    },
                description: {
                        es: "Arquitectura digital preparada para crecer. Desde startups locales hasta ecosistemas globales.",
                        en: "Digital architecture ready for growth. From local startups to global ecosystems."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=2670',
            },
        ],
        gridColumns: 3,
        imageHeight: 200,
        imageObjectFit: 'cover',
        animationType: 'fade-in-up',
        enableCardAnimation: true,
        borderRadius: 'lg',
        colors: {
            background: COLORS.bg,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            description: COLORS.text,
            cardBackground: COLORS.cardBg,
        },
    },
    testimonials: {
        testimonialsVariant: 'glassmorphism',
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "Voces de Clientes",
                en: "Client Testimonials"
            },
        description: {
                es: "Lo que dicen quienes han confiado en nosotros.",
                en: "What those who have trusted us say."
            },
        titleFontSize: 'md',
        descriptionFontSize: 'md',
        borderRadius: 'lg',
        cardShadow: 'lg',
        borderStyle: 'solid',
        cardPadding: 32,
        animationType: 'fade-in-up',
        enableCardAnimation: true,
        items: [
            {
                quote: {
                        es: "\"Digital Edge transformó nuestra presencia online por completo. Las ventas se dispararon en solo 3 meses.\"",
                        en: "\"Digital Edge completely transformed our online presence. Sales skyrocketed in just 3 months.\""
                    },
                name: {
                        es: "Javier Gómez",
                        en: "Javier Gomez"
                    },
                title: {
                        es: "Director, TechNova",
                        en: "Director, TechNova"
                    },
            },
            {
                quote: {
                        es: "\"Su enfoque basado en datos es lo que necesitábamos. Dejamos de adivinar y empezamos a crecer de verdad.\"",
                        en: "\"Their data-driven approach was exactly what we needed. We stopped guessing and started truly growing.\""
                    },
                name: {
                        es: "María Silva",
                        en: "Maria Silva"
                    },
                title: {
                        es: "CMO, FashionWeek",
                        en: "CMO, FashionWeek"
                    },
            },
            {
                quote: {
                        es: "\"El equipo es increíblemente profesional y creativo. Siempre van un paso más allá de lo esperado.\"",
                        en: "\"The team is incredibly professional and creative. They always go above and beyond expectations.\""
                    },
                name: {
                        es: "Roberto Díaz",
                        en: "Roberto Diaz"
                    },
                title: {
                        es: "Founder, GreenEat",
                        en: "Founder, GreenEat"
                    },
            },
        ],
        colors: {
            background: COLORS.bgAlt,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            cardBackground: COLORS.cardBg,
        },
    },
    slideshow: {
        slideshowVariant: 'classic',
        title: {
                es: "Nuestro Trabajo",
                en: "Our Work"
            },
        showTitle: true,
        fullWidth: true,
        paddingY: 'lg',
        paddingX: 'none',
        titleFontSize: 'md',
        borderRadius: 'lg',
        autoPlaySpeed: 5000,
        transitionEffect: 'slide',
        transitionDuration: 500,
        showArrows: true,
        showDots: true,
        arrowStyle: 'rounded',
        dotStyle: 'circle',
        kenBurnsIntensity: 'medium',
        thumbnailSize: 80,
        showCaptions: true,
        slideHeight: 500,
        items: [
            { imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2670', altText: 'Análisis de Datos', caption: 'Dashboard de Análisis' },
            { imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&q=80&w=2670', altText: 'Diseño Creativo', caption: 'Campañas Visuales' },
            { imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=2670', altText: 'Estrategia Digital', caption: 'Planificación Estratégica' },
        ],
        colors: {
            background: COLORS.bg,
            heading: COLORS.heading,
            arrowBackground: 'rgba(255, 255, 255, 0.15)',
            arrowText: COLORS.white,
            dotActive: COLORS.accent,
            dotInactive: 'rgba(255, 255, 255, 0.2)',
            captionBackground: 'rgba(0, 0, 0, 0.6)',
            captionText: COLORS.white,
        },
    },
    pricing: {
        pricingVariant: 'gradient',
        title: {
                es: "Planes Escalables",
                en: "Scalable Plans"
            },
        description: {
                es: "Transparencia total, sin sorpresas. Elige el plan que mejor se adapte a tu negocio.",
                en: "Complete transparency, no surprises. Choose the plan that best suits your business."
            },
        paddingY: 'lg',
        paddingX: 'md',
        titleFontSize: 'md',
        descriptionFontSize: 'md',
        cardBorderRadius: 'lg',
        tiers: [
            {
                name: {
                        es: "Básico",
                        en: "Basic"
                    },
                price: {
                        es: "€999",
                        en: "€999"
                    },
                frequency: '/mes',
                description: {
                        es: "Ideal para negocios que empiezan a crecer online.",
                        en: "Ideal for businesses starting to grow online."
                    },
                features: [
                    'Gestión de Redes Sociales',
                    'SEO Básico',
                    'Informe Mensual',
                    'Soporte por email',
                ],
                buttonText: {
                        es: "Empezar",
                        en: "Get Started"
                    },
                buttonLink: '#leads',
                featured: false,
            },
            {
                name: {
                        es: "Pro",
                        en: "Pro"
                    },
                price: {
                        es: "€1.999",
                        en: "€1,999"
                    },
                frequency: '/mes',
                description: {
                        es: "Para empresas que buscan acelerar su crecimiento.",
                        en: "For companies looking to accelerate their growth."
                    },
                features: [
                    'Todo lo de Básico',
                    'SEO Avanzado & SEM',
                    'Email Marketing',
                    'Soporte Prioritario',
                    'Publicidad Pagada',
                ],
                buttonText: {
                        es: "Empezar",
                        en: "Get Started"
                    },
                buttonLink: '#leads',
                featured: true,
            },
            {
                name: {
                        es: "Enterprise",
                        en: "Enterprise"
                    },
                price: {
                        es: "Custom",
                        en: "Custom"
                    },
                frequency: '',
                description: {
                        es: "Solución completa para grandes organizaciones.",
                        en: "Complete solution for large organizations."
                    },
                features: [
                    'Estrategia 360°',
                    'Equipo Dedicado',
                    'Desarrollo a Medida',
                    'Consultoría Semanal',
                    'SLA garantizado',
                    'Reporting en tiempo real',
                ],
                buttonText: {
                        es: "Contactar",
                        en: "Contact"
                    },
                buttonLink: '#leads',
                featured: false,
            },
        ],
        colors: {
            background: COLORS.bg,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            buttonBackground: COLORS.accent,
            buttonText: COLORS.white,
            checkmarkColor: COLORS.accent,
            cardBackground: COLORS.cardBg,
            gradientStart: COLORS.accent,
            gradientEnd: '#60a5fa',
        },
        animationType: 'fade-in-up',
        enableCardAnimation: true,
    },
    faq: {
        title: {
                es: "Preguntas Frecuentes",
                en: "Frequently Asked Questions"
            },
        description: {
                es: "Todo lo que necesitas saber antes de empezar a trabajar con nosotros.",
                en: "Everything you need to know before working with us."
            },
        paddingY: 'lg',
        paddingX: 'md',
        items: [
            {
                question: '¿Cómo trabajan con nuevos clientes?',
                answer: 'Trabajamos en ciclos ágiles de 4 semanas. Comenzamos con una auditoría profunda, definimos KPIs claros, ejecutamos estrategias y revisamos resultados para optimizar continuamente.',
            },
            {
                question: '¿Cuánto tiempo tarda en verse resultados?',
                answer: 'Depende del servicio. Las campañas de pago (SEM/Social Ads) pueden generar tráfico inmediato. El SEO y el Content Marketing suelen requerir de 3 a 6 meses para mostrar un impacto significativo y sostenible.',
            },
            {
                question: '¿Trabajan con startups y PYMES?',
                answer: '¡Sí! Tenemos planes escalables diseñados específicamente para startups y PYMES que buscan un crecimiento agresivo pero controlado.',
            },
            {
                question: '¿Cómo miden los resultados?',
                answer: 'Creemos en la transparencia total. Recibirás un dashboard en tiempo real y un informe ejecutivo mensual con los hitos alcanzados y los próximos pasos.',
            },
        ],
        colors: {
            background: COLORS.bgAlt,
            accent: COLORS.accent,
            borderColor: COLORS.surface,
            text: COLORS.text,
            heading: COLORS.heading,
        },
    },
    leads: {
        leadsVariant: 'classic',
        title: {
                es: "Hablemos de futuro",
                en: "Let's talk about the future"
            },
        description: {
                es: "Déjanos tus datos. Un estratega digital analizará tu caso y te contactará en menos de 24h.",
                en: "Leave your details. A digital strategist will analyze your case and contact you within 24 hours."
            },
        namePlaceholder: 'Nombre completo',
        emailPlaceholder: 'tu@email.com',
        companyPlaceholder: 'Nombre de tu empresa',
        messagePlaceholder: 'Cuéntanos sobre tu proyecto y objetivos...',
        buttonText: {
                es: "Enviar Consulta",
                en: "Submit Inquiry"
            },
        paddingY: 'lg',
        paddingX: 'md',
        cardBorderRadius: 'lg',
        buttonBorderRadius: 'lg',
        titleFontSize: 'md',
        descriptionFontSize: 'md',
        colors: {
            background: COLORS.bg,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            buttonBackground: COLORS.accent,
            buttonText: COLORS.white,
            cardBackground: COLORS.cardBg,
            inputBackground: COLORS.surface,
            inputText: COLORS.heading,
            inputBorder: COLORS.surfaceAlt,
            gradientStart: COLORS.accent,
            gradientEnd: '#60a5fa',
        },
    },
    newsletter: {
        title: {
                es: "Newsletter Digital Edge",
                en: "Digital Edge Newsletter"
            },
        description: {
                es: "Recibe las últimas tendencias en marketing digital, estrategias y casos de éxito directamente en tu bandeja.",
                en: "Receive the latest trends in digital marketing, strategies, and success stories directly in your inbox."
            },
        placeholderText: 'tu@email.com',
        buttonText: {
                es: "Suscribirse",
                en: "Subscribe"
            },
        paddingY: 'lg',
        paddingX: 'md',
        colors: {
            background: COLORS.bgAlt,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            buttonBackground: COLORS.accent,
            buttonText: COLORS.white,
            cardBackground: COLORS.surface,
            inputBackground: COLORS.surface,
            inputText: COLORS.heading,
            inputBorder: COLORS.surfaceAlt,
        },
    },
    cta: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "¿Listo para impulsar tu marca?",
                en: "Ready to boost your brand?"
            },
        description: {
                es: "Agenda una consulta gratuita y descubre cómo podemos transformar tu presencia digital.",
                en: "Schedule a free consultation and discover how we can transform your digital presence."
            },
        buttonText: {
                es: "Solicitar Consulta Gratis",
                en: "Request Free Consultation"
            },
        titleFontSize: 'lg',
        descriptionFontSize: 'md',
        colors: {
            background: COLORS.accent,
            gradientStart: COLORS.accent,
            gradientEnd: '#60a5fa',
            text: COLORS.white,
            heading: COLORS.white,
            buttonBackground: COLORS.white,
            buttonText: COLORS.accent,
        },
    },
    portfolio: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "Casos de Éxito",
                en: "Success Stories"
            },
        description: {
                es: "Resultados tangibles. Diseño impecable.",
                en: "Tangible results. Impeccable design."
            },
        items: [
            {
                title: {
                        es: "E-commerce X",
                        en: "E-commerce X"
                    },
                description: {
                        es: "Incremento del 200% en conversiones mediante UX optimizada y checkout simplificado.",
                        en: "200% increase in conversions through optimized UX and simplified checkout."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=2670',
            },
            {
                title: {
                        es: "TechNova Landing",
                        en: "TechNova Landing"
                    },
                description: {
                        es: "Rediseño completo que multiplicó por 3 la tasa de registro en la plataforma SaaS.",
                        en: "Complete redesign that tripled the registration rate on the SaaS platform."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2670',
            },
            {
                title: {
                        es: "FashionWeek Social",
                        en: "FashionWeek Social"
                    },
                description: {
                        es: "Campaña de redes sociales que generó +500K impresiones y 40% más de engagement.",
                        en: "Social media campaign that generated +500K impressions and 40% more engagement."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&q=80&w=2670',
            },
        ],
        animationType: 'fade-in-up',
        enableCardAnimation: true,
        colors: {
            background: COLORS.bgAlt,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
        },
    },
    services: {
        servicesVariant: 'cards',
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "Soluciones 360°",
                en: "360° Solutions"
            },
        description: {
                es: "Un ecosistema completo de servicios digitales diseñados para cubrir cada punto de contacto con tu cliente.",
                en: "A complete ecosystem of digital services designed to cover every customer touchpoint."
            },
        items: [
            {
                icon: 'search',
                title: {
                        es: "SEO & SEM",
                        en: "SEO & SEM"
                    },
                description: {
                        es: "Dominio total de los motores de búsqueda. Estrategias orgánicas y pagadas para posicionarte donde importa.",
                        en: "Total dominance of search engines. Organic and paid strategies to position you where it matters."
                    },
            },
            {
                icon: 'share2',
                title: {
                        es: "Social Media",
                        en: "Social Media"
                    },
                description: {
                        es: "Construcción de comunidades leales. Contenido viral y gestión de marca en las plataformas más relevantes.",
                        en: "Building loyal communities. Viral content and brand management on the most relevant platforms."
                    },
            },
            {
                icon: 'fileText',
                title: {
                        es: "Content Marketing",
                        en: "Content Marketing"
                    },
                description: {
                        es: "Storytelling que conecta. Blogs, whitepapers y producciones audiovisuales que establecen autoridad.",
                        en: "Storytelling that connects. Blogs, whitepapers, and audiovisual productions that establish authority."
                    },
            },
        ],
        animationType: 'fade-in-up',
        enableCardAnimation: true,
        colors: {
            background: COLORS.bg,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
        },
    },
    team: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "Mentes Brillantes",
                en: "Brilliant Minds"
            },
        description: {
                es: "El equipo detrás de la magia.",
                en: "The team behind the magic."
            },
        items: [
            {
                name: {
                        es: "Carlos Méndez",
                        en: "Carlos Méndez"
                    },
                role: {
                        es: "CEO & Fundador",
                        en: "CEO & Founder"
                    },
                imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=2670',
            },
            {
                name: {
                        es: "Ana Torres",
                        en: "Ana Torres"
                    },
                role: {
                        es: "Directora Creativa",
                        en: "Creative Director"
                    },
                imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=2670',
            },
            {
                name: {
                        es: "David Ruiz",
                        en: "David Ruiz"
                    },
                role: {
                        es: "Especialista SEO",
                        en: "SEO Specialist"
                    },
                imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=2670',
            },
            {
                name: {
                        es: "Elena Vega",
                        en: "Elena Vega"
                    },
                role: {
                        es: "Account Manager",
                        en: "Account Manager"
                    },
                imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=2670',
            },
        ],
        animationType: 'fade-in-up',
        enableCardAnimation: true,
        colors: {
            background: COLORS.bg,
            text: COLORS.text,
            heading: COLORS.heading,
        },
    },
    video: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "Cómo Trabajamos",
                en: "How We Work"
            },
        description: {
                es: "Descubre nuestro proceso de trabajo y cómo conseguimos resultados.",
                en: "Discover our work process and how we achieve results."
            },
        source: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        videoUrl: '',
        autoplay: false,
        loop: false,
        showControls: true,
        colors: {
            background: COLORS.bg,
            text: COLORS.text,
            heading: COLORS.heading,
        },
    },
    howItWorks: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "Nuestro Proceso",
                en: "Our Process"
            },
        description: {
                es: "De la estrategia a los resultados en 4 pasos.",
                en: "From strategy to results in 4 steps."
            },
        steps: 4,
        items: [
            { icon: 'upload', title: {
                        es: "Auditoría",
                        en: "Audit"
                    }, description: {
                        es: "Analizamos tu presencia digital actual y definimos KPIs claros.",
                        en: "We analyze your current digital presence and define clear KPIs."
                    } },
            { icon: 'process', title: {
                        es: "Estrategia",
                        en: "Strategy"
                    }, description: {
                        es: "Diseñamos un plan personalizado basado en datos y objetivos.",
                        en: "We design a personalized plan based on data and objectives."
                    } },
            { icon: 'download', title: {
                        es: "Ejecución",
                        en: "Execution"
                    }, description: {
                        es: "Implementamos campañas, contenido y optimizaciones.",
                        en: "We implement campaigns, content, and optimizations."
                    } },
            { icon: 'share', title: {
                        es: "Optimización",
                        en: "Optimization"
                    }, description: {
                        es: "Medimos, aprendemos y optimizamos continuamente.",
                        en: "We continuously measure, learn, and optimize."
                    } },
        ],
        colors: {
            background: COLORS.bgAlt,
            accent: COLORS.accent,
            text: COLORS.text,
            heading: COLORS.heading,
        },
    },
    chatbot: {
        welcomeMessage: 'Bienvenido a Digital Edge. ¿En qué podemos ayudarte? Pregúntanos sobre servicios, precios o cualquier duda.',
        placeholderText: 'Preguntar sobre servicios, precios, casos de éxito...',
        knowledgeBase: 'Digital Edge es una agencia de marketing digital especializada en SEO, SEM, Social Media y Content Marketing. Ofrecemos planes: Básico (€999/mes), Pro (€1.999/mes) y Enterprise (custom). Trabajamos con startups, PYMES y grandes organizaciones.',
        position: 'bottom-right',
        colors: {
            primary: COLORS.accent,
            text: COLORS.white,
            background: COLORS.cardBg,
        },
    },
    map: {
        title: {
                es: "Nuestra Oficina",
                en: "Our Office"
            },
        description: {
                es: "Digital Edge HQ. Calle de la Innovación 42, Madrid. Estamos encantados de recibirte.",
                en: "Digital Edge HQ. Innovation Street 42, Madrid. We are delighted to welcome you."
            },
        address: {
                es: "Calle de la Innovación 42, Madrid, 28020",
                en: "Innovation Street 42, Madrid, 28020"
            },
        lat: 40.4515,
        lng: -3.6883,
        zoom: 15,
        mapVariant: 'modern',
        apiKey: '',
        paddingY: 'lg',
        paddingX: 'md',
        height: 350,
        colors: {
            background: COLORS.bg,
            text: COLORS.text,
            heading: COLORS.heading,
            accent: COLORS.accent,
            cardBackground: COLORS.cardBg,
        },
        titleFontSize: 'md',
        descriptionFontSize: 'md',
        borderRadius: 'lg',
    },
    menu: {
        menuVariant: 'classic',
        title: {
                es: "Paquetes Adicionales",
                en: "Additional Packages"
            },
        description: {
                es: "Servicios complementarios a medida.",
                en: "Tailored Complementary Services"
            },
        paddingY: 'lg',
        paddingX: 'md',
        items: [
            {
                name: {
                        es: "Auditoría SEO Completa",
                        en: "Comprehensive SEO Audit"
                    },
                description: {
                        es: "Análisis técnico, de contenido y de enlaces con plan de acción detallado.",
                        en: "Technical, content, and link analysis with a detailed action plan."
                    },
                price: {
                        es: "€500",
                        en: "€500"
                    },
                imageUrl: '',
                category: {
                        es: "Auditorías",
                        en: "Audits"
                    },
                isSpecial: true,
            },
            {
                name: {
                        es: "Diseño de Landing Page",
                        en: "Landing Page Design"
                    },
                description: {
                        es: "Landing page optimizada para conversión con A/B testing incluido.",
                        en: "Conversion-optimized landing page with A/B testing included."
                    },
                price: {
                        es: "€1.500",
                        en: "€1,500"
                    },
                imageUrl: '',
                category: {
                        es: "Diseño",
                        en: "Design"
                    },
                isSpecial: false,
            },
            {
                name: {
                        es: "Gestión de Campañas Ads",
                        en: "Ads Campaign Management"
                    },
                description: {
                        es: "Configuración y optimización de Google Ads o Meta Ads durante un mes.",
                        en: "Google Ads or Meta Ads setup and optimization for one month."
                    },
                price: {
                        es: "€800",
                        en: "€800"
                    },
                imageUrl: '',
                category: {
                        es: "Publicidad",
                        en: "Advertising"
                    },
                isSpecial: false,
            },
        ],
        colors: {
            background: COLORS.bgAlt,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            cardBackground: COLORS.cardBg,
            priceColor: COLORS.accent,
        },
        titleFontSize: 'md',
        descriptionFontSize: 'md',
        borderRadius: 'lg',
        showCategories: true,
        animationType: 'fade-in-up',
        enableCardAnimation: true,
    },
    footer: {
        title: {
                es: "DIGITAL EDGE",
                en: "DIGITAL EDGE"
            },
        description: {
                es: "Agencia de marketing digital enfocada en resultados, tecnología y crecimiento escalable para la era moderna.",
                en: "Digital marketing agency focused on results, technology, and scalable growth for the modern era."
            },
        linkColumns: [
            {
                title: {
                        es: "Agencia",
                        en: "Agency"
                    },
                links: [
                    { text: {
                                es: "Sobre Nosotros",
                                en: "About Us"
                            }, href: '/about' },
                    { text: {
                                es: "Equipo",
                                en: "Team"
                            }, href: '#team' },
                    { text: {
                                es: "Carreras",
                                en: "Careers"
                            }, href: '/contact' },
                ],
            },
            {
                title: {
                        es: "Servicios",
                        en: "Services"
                    },
                links: [
                    { text: {
                                es: "SEO & SEM",
                                en: "SEO & SEM"
                            }, href: '#services' },
                    { text: {
                                es: "Social Media",
                                en: "Social Media"
                            }, href: '#services' },
                    { text: {
                                es: "Content Marketing",
                                en: "Content Marketing"
                            }, href: '#services' },
                ],
            },
            {
                title: {
                        es: "Legal",
                        en: "Legal"
                    },
                links: [
                    { text: {
                                es: "Privacidad",
                                en: "Privacy"
                            }, href: '/privacy-policy' },
                    { text: {
                                es: "Términos",
                                en: "Terms"
                            }, href: '/terms-of-service' },
                    { text: {
                                es: "Cookies",
                                en: "Cookies"
                            }, href: '/privacy-policy' },
                ],
            },
        ],
        socialLinks: [
            { platform: 'facebook', href: 'https://facebook.com' },
            { platform: 'instagram', href: 'https://instagram.com' },
            { platform: 'twitter', href: 'https://twitter.com' },
            { platform: 'linkedin', href: 'https://linkedin.com' },
        ],
        copyrightText: '© {YEAR} Digital Edge. Todos los derechos reservados.',
        colors: {
            background: COLORS.black,
            border: COLORS.surface,
            text: COLORS.textMuted,
            linkHover: COLORS.accent,
            heading: COLORS.heading,
        },
    },
    banner: {
        bannerVariant: 'classic',
        headline: {
                es: "¡Consultoría Estratégica Gratuita!",
                en: "Free Strategic Consulting!"
            },
        subheadline: {
                es: "Descubre cómo mejorar tu presencia digital en una sesión de 30 minutos con nuestros expertos.",
                en: "Discover how to improve your digital presence in a 30-minute session with our experts."
            },
        buttonText: {
                es: "Reservar Ahora",
                en: "Book Now"
            },
        buttonUrl: '#leads',
        showButton: true,
        backgroundImageUrl: '',
        backgroundOverlayOpacity: 70,
        height: 300,
        textAlignment: 'center',
        paddingY: 'lg',
        paddingX: 'md',
        headlineFontSize: 'lg',
        subheadlineFontSize: 'md',
        colors: {
            background: COLORS.accent,
            overlayColor: COLORS.black,
            text: COLORS.white,
            heading: COLORS.white,
            buttonBackground: COLORS.white,
            buttonText: COLORS.accent,
        },
    },
} as PageData;

// =============================================================================
// THEME
// =============================================================================
export const digitalEdgeTheme: ThemeData = {
    cardBorderRadius: 'lg',
    buttonBorderRadius: 'lg',
    fontFamilyHeader: 'inter',
    fontFamilyBody: 'inter',
    fontFamilyButton: 'inter',
    headingsAllCaps: false,
    buttonsAllCaps: false,
    navLinksAllCaps: false,
    pageBackground: COLORS.bg,
    globalColors: {
        primary: COLORS.accent,
        secondary: '#60a5fa',
        accent: COLORS.accent,
        background: COLORS.bg,
        surface: COLORS.surface,
        text: COLORS.text,
        textMuted: COLORS.textMuted,
        heading: COLORS.heading,
        border: COLORS.border,
        success: '#22c55e',
        error: '#ef4444',
    },
};

// =============================================================================
// BRAND IDENTITY
// =============================================================================
export const digitalEdgeBrandIdentity: BrandIdentity = {
    name: {
            es: "Digital Edge",
            en: "Digital Edge"
        },
    industry: 'marketing-advertising',
    targetAudience: 'Startups, PYMES y empresas que buscan crecer su presencia digital con estrategias basadas en datos y resultados medibles',
    toneOfVoice: 'Professional',
    coreValues: 'Datos, Creatividad, Escalabilidad, Transparencia',
    language: 'Español',
};

// =============================================================================
// COMPONENT ORDER & SECTION VISIBILITY
// =============================================================================
export const digitalEdgeComponentOrder: PageSection[] = [
    // Structure
    'colors', 'typography', 'header',
    // Content sections matching the Stitch template order
    'hero', 'features', 'services', 'portfolio', 'team', 'pricing',
    'testimonials', 'faq', 'howItWorks',
    // Engagement
    'leads', 'newsletter', 'map',
    // Extras (hidden by default)
    'heroSplit', 'banner', 'slideshow', 'cta', 'video', 'menu',
    // Ecommerce (hidden by default)
    'storeSettings', 'products', 'featuredProducts', 'categoryGrid', 'productHero', 'saleCountdown',
    'trustBadges', 'recentlyViewed', 'productReviews', 'collectionBanner', 'productBundle', 'announcementBar',
    // Multi-page sections
    'productDetail', 'categoryProducts', 'articleContent', 'productGrid', 'cart', 'checkout',
    // Chat
    'chatbot',
    // Footer
    'footer',
];

// Sections visible in the template
const visibleSections: PageSection[] = [
    'colors', 'typography', 'header',
    'hero', 'features', 'services', 'portfolio', 'team', 'pricing',
    'testimonials', 'faq', 'leads', 'newsletter', 'map',
    'chatbot', 'footer',
];

export const digitalEdgeSectionVisibility = digitalEdgeComponentOrder.reduce((acc, section) => {
    (acc as any)[section] = visibleSections.includes(section);
    return acc;
}, {} as Record<PageSection, boolean>);

// =============================================================================
// FULL TEMPLATE PRESET (ready for Firestore insertion)
// =============================================================================
export const digitalEdgeMarketingPreset = {
    name: {
            es: "Digital Edge — Agencia Marketing Digital",
            en: "Digital Edge — Digital Marketing Agency"
        },
    data: digitalEdgePageData,
    theme: digitalEdgeTheme,
    brandIdentity: digitalEdgeBrandIdentity,
    componentOrder: digitalEdgeComponentOrder,
    sectionVisibility: digitalEdgeSectionVisibility,
    status: 'Template' as const,
    description: {
            es: "Landing page dark mode para agencia de marketing digital con fondo navy (#0b1120), acento azul (#3c83f6) y tipografía Inter. Incluye hero, servicios 360°, portfolio, equipo, planes de precios, testimonios, FAQ y formulario de contacto.",
            en: "Dark mode landing page for a digital marketing agency with a navy background (#0b1120), blue accent (#3c83f6), and Inter typography. Includes hero, 360° services, portfolio, team, pricing plans, testimonials, FAQ, and contact form."
        },
    category: {
            es: "marketing",
            en: "marketing"
        },
    tags: ['marketing', 'agencia', 'digital', 'dark', 'blue', 'seo', 'social-media', 'profesional'],
    industries: ['marketing-advertising'],
    thumbnailUrl: '',
};
