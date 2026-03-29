import { PageData, ThemeData, PageSection } from '../../../../types';

export const initialAgencyData = {
    theme: {
        cardBorderRadius: 'xl',
        buttonBorderRadius: 'full',
        fontFamilyHeader: 'poppins',
        fontFamilyBody: 'inter',
        fontFamilyButton: 'poppins',
        headingsAllCaps: false,
        buttonsAllCaps: false,
        navLinksAllCaps: false,
        pageBackground: '#020617',
        globalColors: {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            accent: '#eab308',
            background: '#020617',
            surface: '#0f172a',
            text: '#f8fafc',
            textMuted: '#94a3b8',
            heading: '#ffffff',
            border: '#1e293b',
            success: '#22c55e',
            error: '#ef4444'
        }
    } as ThemeData,

    data: {
        header: {
          style: 'glass',
          showGlobalButton: true,
          globalButtonText: "Contactar"
        },
        hero: {
            headline: "Escalamos tu <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary\">Negocio Digital</span>",
            subheadline: "Somos tu partner estratégico para diseñar, desarrollar y lanzar productos digitales de alto impacto.",
            primaryCtaText: "Ver Servicios",
            secondaryCtaText: "Agendar Llamada",
            layout: "center",
            fullHeight: true
        },
        services: {
            title: "Nuestros Servicios",
            description: "Soluciones completas para el crecimiento de tu empresa.",
            items: [
                {
                    title: "Diseño Web",
                    description: "Creamos experiencias digitales que convierten visitantes en clientes.",
                    icon: "Layout"
                },
                {
                    title: "Desarrollo a Medida",
                    description: "Software robusto y escalable para tus necesidades específicas.",
                    icon: "Code"
                },
                {
                    title: "Marketing Digital",
                    description: "Estrategias de crecimiento que maximizan tu ROI.",
                    icon: "TrendingUp"
                }
            ],
            style: "cards"
        },
        features: {
            title: "Por qué elegirnos",
            description: "Aportamos valor real a cada proyecto.",
            columns: 3,
            items: [
                {
                    title: "Enfoque en Resultados",
                    description: "No solo diseñamos, creamos embudos que venden.",
                    icon: "Target"
                },
                {
                    title: "Tecnología Moderna",
                    description: "Usamos el stack más avanzado de la industria.",
                    icon: "Zap"
                },
                {
                    title: "Soporte Continuo",
                    description: "Estamos contigo antes, durante y después del lanzamiento.",
                    icon: "LifeBuoy"
                }
            ]
        },
        cta: {
            title: "¿Listo para empezar?",
            description: "Agenda una consultoría gratuita para analizar tu caso.",
            buttonText: "Agendar ahora",
            style: "accent"
        },
        footer: {
            description: "Tu socio en innovación digital.",
            showSocial: true,
            linkColumns: []
        }
    } as PageData,

    componentOrder: [
        'header',
        'hero',
        'services',
        'features',
        'cta',
        'footer'
    ] as PageSection[],

    sectionVisibility: {
        header: true,
        hero: true,
        services: true,
        features: true,
        cta: true,
        footer: true,
        heroSplit: true,
        testimonials: true,
        slideshow: true,
        pricing: true,
        faq: true,
        leads: true,
        portfolio: true,
        team: true,
        video: true,
        howItWorks: true,
        map: true,
        menu: true,
        banner: true,
        products: true,
        gallery: true,
        typography: true,
        colors: true
    } as Record<PageSection, boolean>
};
