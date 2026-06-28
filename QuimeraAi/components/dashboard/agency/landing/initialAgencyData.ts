import { PageData, ThemeData, PageSection } from '../../../../types';
import { initialData } from '../../../../data/initialData';

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
        ...initialData.data,
        header: {
          ...initialData.data.header,
          style: 'floating-glass',
          showGlobalButton: true,
          globalButtonText: "Contactar",
          colors: {
            ...initialData.data.header.colors,
            background: "#020617",
            text: "#f8fafc",
            accent: "#eab308",
            border: "#1e293b",
            surface: "#0f172a",
            surfaceAlt: "#111827",
            panelBackground: "#0f172a",
            panelText: "#f8fafc",
            mutedText: "#94a3b8",
            linkHover: "#eab308",
            separator: "#1e293b",
            cartBadge: "#eab308",
            buttonBackground: "#eab308",
            buttonText: "#111827"
          }
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
            featuresVariant: "strategy-cards",
            title: "Por qué elegirnos",
            description: "Aportamos valor real a cada proyecto.",
            columns: 3,
            gridColumns: 3,
            imageHeight: 320,
            imageObjectFit: "cover",
            paddingY: "lg",
            paddingX: "md",
            borderRadius: "xl",
            items: [
                {
                    title: "Enfoque en Resultados",
                    description: "No solo diseñamos, creamos embudos que venden.",
                    icon: "Target",
                    eyebrow: "Performance",
                    imageUrl: ""
                },
                {
                    title: "Tecnología Moderna",
                    description: "Usamos el stack más avanzado de la industria.",
                    icon: "Zap",
                    eyebrow: "Stack",
                    imageUrl: ""
                },
                {
                    title: "Soporte Continuo",
                    description: "Estamos contigo antes, durante y después del lanzamiento.",
                    icon: "LifeBuoy",
                    eyebrow: "Operación",
                    imageUrl: ""
                },
                {
                    title: "Agente Integrado",
                    description: "Conectamos contenido, automatización y medición para que tu web trabaje contigo.",
                    icon: "Bot",
                    eyebrow: "AI",
                    imageUrl: ""
                }
            ],
            colors: {
                background: "#020617",
                heading: "#ffffff",
                description: "#94a3b8",
                text: "#cbd5e1",
                accent: "#6366f1",
                cardBackground: "#0f172a",
                cardHeading: "#ffffff",
                cardText: "#cbd5e1",
                borderColor: "#1e293b",
                glowColor: "#6366f1",
                cardGradientStart: "#0f172a",
                cardGradientEnd: "#020617",
                overlayText: "#ffffff",
                overlayMuted: "#cbd5e1"
            }
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
    } as unknown as PageData,

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
    } as unknown as Record<PageSection, boolean>
};
