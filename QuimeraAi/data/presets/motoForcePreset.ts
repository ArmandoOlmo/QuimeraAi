/**
 * MotoForce Motorcycle Dealer Template Preset
 * 
 * Datos pre-configurados para el template "MotoForce" inspirado en
 * estética oscura con acento naranja/ámbar (#f97316) para dealers de motos.
 * 
 * Este preset se usa con el seeder en scripts/seedMotoForceTemplate.ts para
 * insertar un template completo en Supabase como project status = "Template".
 */

import { PageData, ThemeData, PageSection, BrandIdentity, NavLink } from '../../types';

// =============================================================================
// COLORS — MotoForce Racing Palette
// =============================================================================
const COLORS = {
    bg: '#0d0d0d',
    bgAlt: '#151515',
    surface: '#1a1a1a',
    surfaceAlt: '#252525',
    accent: '#f97316',
    accentHover: '#fb923c',
    accentDark: '#ea580c',
    text: '#a3a3a3',
    textMuted: '#737373',
    heading: '#fafafa',
    border: '#262626',
    white: '#ffffff',
    black: '#000000',
    carbon: '#1c1c1c',
};

// =============================================================================
// PAGE DATA
// =============================================================================
export const motoForcePageData: PageData = {
    header: {
        style: 'sticky-solid',
        layout: 'minimal',
        isSticky: true,
        glassEffect: false,
        height: 70,
        logoType: 'text',
        logoText: 'MOTOFORCE',
        logoImageUrl: '',
        logoWidth: 180,
        links: [
            { text: {
                        es: "Modelos",
                        en: "Models"
                    }, href: '#services' },
            { text: {
                        es: "Galería",
                        en: "Gallery"
                    }, href: '#portfolio' },
            { text: {
                        es: "Servicio",
                        en: "Service"
                    }, href: '#features' },
            { text: {
                        es: "Contacto",
                        en: "Contact"
                    }, href: '#leads' },
        ] as NavLink[],
        hoverStyle: 'simple',
        ctaText: {
                es: "Cotizar Ahora",
                en: "Get a Quote"
            },
        showCta: true,
        showLogin: false,
        loginText: '',
        loginUrl: '#',
        colors: {
            background: COLORS.bg,
            text: COLORS.heading,
            accent: COLORS.accent,
        },
        buttonBorderRadius: 'md',
        linkFontSize: 13,
    },
    hero: {
        heroVariant: 'modern',
        paddingY: 'xl',
        paddingX: 'lg',
        headline: {
                es: "DOMINA EL ASFALTO CON <span class=\"text-transparent bg-clip-text\" style=\"-webkit-text-fill-color: transparent; background-image: linear-gradient(135deg, #f97316, #fb923c)\">MOTOFORCE</span>",
                en: "RULE THE ROAD WITH <span class=\"text-transparent bg-clip-text\" style=\"-webkit-text-fill-color: transparent; background-image: linear-gradient(135deg, #f97316, #fb923c)\">MOTOFORCE</span>"
            },
        subheadline: {
                es: "Tu distribuidor oficial de las mejores marcas. Desde motos deportivas hasta touring de lujo. Encuentra la máquina perfecta para cada ruta.",
                en: "Your official dealer of the world's best motorcycle brands. From sport bikes to luxury touring machines. Find your perfect ride."
            },
        primaryCta: {
                es: "VER MODELOS",
                en: "VIEW MODELS"
            },
        secondaryCta: {
                es: "AGENDAR PRUEBA",
                en: "BOOK TEST RIDE"
            },
        imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=2670',
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
        sectionBorderSize: 'sm',
        sectionBorderColor: COLORS.border,
        colors: {
            primary: COLORS.accent,
            secondary: COLORS.surfaceAlt,
            background: COLORS.bg,
            text: COLORS.text,
            heading: COLORS.heading,
            buttonBackground: COLORS.accent,
            buttonText: COLORS.white,
            secondaryButtonBackground: COLORS.surface,
            secondaryButtonText: COLORS.heading,
        },
        secondaryButtonStyle: 'outline',
        secondaryButtonOpacity: 100,
        showBadge: true,
        badgeText: {
                es: "🏍️ DEALER OFICIAL",
                en: "🏍️ OFFICIAL DEALER"
            },
        badgeIcon: 'zap',
        badgeColor: COLORS.accent,
        badgeBackgroundColor: `${COLORS.accent}15`,
        buttonBorderRadius: 'md',
        animationType: 'fade-in-up',
        primaryCtaLink: '#services',
        primaryCtaLinkType: 'section',
        secondaryCtaLink: '#leads',
        secondaryCtaLinkType: 'section',
        headlineFontSize: 'xl',
        subheadlineFontSize: 'md',
    },
    heroSplit: {
        headline: {
                es: "DOMINA EL ASFALTO",
                en: "RULE THE ROAD"
            },
        subheadline: {
                es: "Tu dealer oficial de motos de alto rendimiento.",
                en: "Your official high-performance motorcycle dealer."
            },
        buttonText: {
                es: "VER MODELOS",
                en: "VIEW MODELS"
            },
        buttonUrl: '#services',
        imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=2670',
        imagePosition: 'right',
        maxHeight: 500,
        angleIntensity: 0,
        colors: {
            textBackground: COLORS.bg,
            imageBackground: COLORS.black,
            heading: COLORS.heading,
            text: COLORS.text,
            buttonBackground: COLORS.accent,
            buttonText: COLORS.white,
        },
        headlineFontSize: 'lg',
        subheadlineFontSize: 'md',
        buttonBorderRadius: 'md',
    },
    features: {
        featuresVariant: 'bento-premium',
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "POR QUÉ ELEGIR MOTOFORCE",
                en: "WHY CHOOSE MOTOFORCE"
            },
        description: {
                es: "Más que un dealer, somos tu partner en la ruta. Ofrecemos la mejor selección de motocicletas, financiamiento flexible y un taller de servicio certificado para mantener tu máquina en óptimas condiciones.",
                en: "More than a dealer, we're your partner on the road. We offer the best motorcycle selection, flexible financing, and a certified service center to keep your machine in peak condition."
            },
        items: [
            {
                title: {
                        es: "STOCK PERMANENTE",
                        en: "PERMANENT STOCK"
                    },
                description: {
                        es: "Más de 50 modelos en exhibición. Desde naked bikes hasta adventure touring. Todas las marcas, todos los estilos, siempre disponibles para prueba inmediata.",
                        en: "Over 50 models on display. From naked bikes to adventure touring. All brands, all styles, always available for immediate test rides."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&q=80&w=2670',
            },
            {
                title: {
                        es: "FINANCIAMIENTO FLEXIBLE",
                        en: "FLEXIBLE FINANCING"
                    },
                description: {
                        es: "Planes a tu medida con las mejores tasas del mercado. Aprobación en 24 horas. Sin letra chica. Tu moto nueva te espera sin complicaciones.",
                        en: "Custom plans with the best market rates. Approval in 24 hours. No hidden fees. Your new bike is waiting without complications."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1566891439633-eac1875c3681?auto=format&fit=crop&q=80&w=2670',
            },
            {
                title: {
                        es: "TALLER CERTIFICADO",
                        en: "CERTIFIED WORKSHOP"
                    },
                description: {
                        es: "Técnicos especializados con certificación de fábrica. Mantenimiento preventivo, reparaciones mayores y personalización. Tu moto en manos expertas.",
                        en: "Factory-certified specialized technicians. Preventive maintenance, major repairs, and customization. Your bike in expert hands."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&q=80&w=2670',
            },
        ],
        gridColumns: 3,
        imageHeight: 200,
        imageObjectFit: 'cover',
        animationType: 'fade-in-up',
        enableCardAnimation: true,
        borderRadius: 'md',
        colors: {
            background: COLORS.bgAlt,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            description: COLORS.text,
            cardBackground: COLORS.surface,
        },
    },
    testimonials: {
        testimonialsVariant: 'glassmorphism',
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "LO QUE DICEN NUESTROS CLIENTES",
                en: "WHAT OUR RIDERS SAY"
            },
        description: {
                es: "Historias reales de quienes ya viven la experiencia MotoForce.",
                en: "Real stories from those already living the MotoForce experience."
            },
        titleFontSize: 'md',
        descriptionFontSize: 'md',
        borderRadius: 'md',
        cardShadow: 'lg',
        borderStyle: 'solid',
        cardPadding: 32,
        animationType: 'fade-in-up',
        enableCardAnimation: true,
        items: [
            {
                quote: {
                        es: "\"Compré mi primera deportiva aquí. El equipo me asesoró desde el primer día y el financiamiento fue rapidísimo. Un año después, sigo viniendo para los services.\"",
                        en: "\"I bought my first sport bike here. The team advised me from day one and financing was lightning fast. A year later, I still come back for servicing.\""
                    },
                name: {
                        es: "Carlos Mendoza",
                        en: "Carlos Mendoza"
                    },
                title: {
                        es: "Dueño de Kawasaki Ninja ZX-6R",
                        en: "Kawasaki Ninja ZX-6R Owner"
                    },
            },
            {
                quote: {
                        es: "\"El taller es increíble. Llevo mi BMW GS para todos los mantenimientos y nunca me han fallado. Son rápidos, honestos y saben lo que hacen.\"",
                        en: "\"The workshop is incredible. I bring my BMW GS for all maintenance and they've never let me down. Fast, honest, and they know what they're doing.\""
                    },
                name: {
                        es: "Laura Vega",
                        en: "Laura Vega"
                    },
                title: {
                        es: "Aventurera, BMW R 1250 GS",
                        en: "Adventurer, BMW R 1250 GS"
                    },
            },
            {
                quote: {
                        es: "\"Tenía dudas entre dos modelos y me dejaron probar ambos el mismo día. La atención es de otro nivel. Salí del dealer con mi moto y una sonrisa.\"",
                        en: "\"I was torn between two models and they let me test both on the same day. The service is next level. I left the dealership with my bike and a smile.\""
                    },
                name: {
                        es: "Diego Ramírez",
                        en: "Diego Ramírez"
                    },
                title: {
                        es: "Feliz propietario de Ducati Monster",
                        en: "Happy Ducati Monster Owner"
                    },
            },
        ],
        itemImageStyle: 'none',
        testimonialImageEnabled: false,
        testimonialsAutoRotate: false,
        testimonialsRotationInterval: 5,
        colors: {
            background: COLORS.bg,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            subheading: COLORS.textMuted,
            cardBackground: COLORS.surface,
            quoteMarks: COLORS.accent,
        },
    },
    services: {
        servicesVariant: 'cards-grid',
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "NUESTROS MODELOS DESTACADOS",
                en: "FEATURED MODELS"
            },
        description: {
                es: "Descubre nuestra selección premium de motocicletas. Cada una inspeccionada, certificada y lista para rodar.",
                en: "Discover our premium motorcycle selection. Each one inspected, certified, and ready to ride."
            },
        items: [
            {
                icon: 'zap',
                title: {
                        es: "Deportivas",
                        en: "Sport Bikes"
                    },
                description: {
                        es: "Máximo rendimiento y aerodinámica de competición. Yamaha R1, Kawasaki Ninja, Ducati Panigale y más. Para los que buscan adrenalina pura.",
                        en: "Maximum performance and racing aerodynamics. Yamaha R1, Kawasaki Ninja, Ducati Panigale and more. For those seeking pure adrenaline."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1566891439633-eac1875c3681?auto=format&fit=crop&q=80&w=2670',
                link: '#leads',
                price: 'Desde $15,000 USD',
            },
            {
                icon: 'map',
                title: {
                        es: "Adventure Touring",
                        en: "Adventure Touring"
                    },
                description: {
                        es: "Explora sin límites. BMW GS, Honda Africa Twin, KTM Adventure. Diseñadas para cualquier terreno, equipadas para cualquier viaje.",
                        en: "Explore without limits. BMW GS, Honda Africa Twin, KTM Adventure. Built for any terrain, equipped for any journey."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=2670',
                link: '#leads',
                price: 'Desde $18,000 USD',
            },
            {
                icon: 'sun',
                title: {
                        es: "Naked & Urban",
                        en: "Naked & Urban"
                    },
                description: {
                        es: "Estilo y versatilidad para la ciudad. Yamaha MT, Triumph Street Triple, KTM Duke. Agresivas, ligeras y perfectas para el día a día.",
                        en: "Style and versatility for the city. Yamaha MT, Triumph Street Triple, KTM Duke. Aggressive, lightweight, and perfect for everyday use."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&q=80&w=2670',
                link: '#leads',
                price: 'Desde $8,500 USD',
            },
            {
                icon: 'globe',
                title: {
                        es: "Touring de Lujo",
                        en: "Luxury Touring"
                    },
                description: {
                        es: "El máximo confort en carretera. Harley-Davidson Touring, Honda Gold Wing, Indian Roadmaster. Viajes largos con la mejor tecnología y comodidad.",
                        en: "Ultimate road comfort. Harley-Davidson Touring, Honda Gold Wing, Indian Roadmaster. Long trips with the best technology and comfort."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=2670',
                link: '#leads',
                price: 'Desde $25,000 USD',
            },
            {
                icon: 'shield',
                title: {
                        es: "Custom & Cruiser",
                        en: "Custom & Cruiser"
                    },
                description: {
                        es: "Personalidad y potencia clásica. Harley-Davidson Softail, Indian Scout, Triumph Bonneville. Máquinas con alma para los que buscan algo único.",
                        en: "Personality and classic power. Harley-Davidson Softail, Indian Scout, Triumph Bonneville. Soulful machines for those seeking something unique."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&q=80&w=2670',
                link: '#leads',
                price: 'Desde $12,000 USD',
            },
            {
                icon: 'battery-charging',
                title: {
                        es: "Eléctricas",
                        en: "Electric Bikes"
                    },
                description: {
                        es: "El futuro es ahora. Zero Motorcycles, LiveWire, Energica. Cero emisiones, aceleración instantánea y tecnología de punta para la nueva era.",
                        en: "The future is now. Zero Motorcycles, LiveWire, Energica. Zero emissions, instant acceleration, and cutting-edge tech for the new era."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&q=80&w=2670',
                link: '#leads',
                price: 'Desde $20,000 USD',
            },
        ],
        showIcons: true,
        animationType: 'fade-in-up',
        enableCardAnimation: true,
        gridColumns: 3,
        borderRadius: 'md',
        imageHeight: 160,
        imageObjectFit: 'cover',
        colors: {
            background: COLORS.bg,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            description: COLORS.text,
            cardBackground: COLORS.surface,
            iconColor: COLORS.accent,
        },
    },
    portfolio: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "GALERÍA MOTOFORCE",
                en: "MOTOFORCE GALLERY"
            },
        description: {
                es: "Explora nuestra colección. Cada moto cuenta una historia de ingeniería, diseño y pasión por las dos ruedas.",
                en: "Explore our collection. Each bike tells a story of engineering, design, and passion for two wheels."
            },
        portfolios: [
            {
                title: {
                        es: "Deportivas de Alto Rendimiento",
                        en: "High-Performance Sport Bikes"
                    },
                description: {
                        es: "Ingeniería de pista para la calle.",
                        en: "Track engineering for the street."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1566891439633-eac1875c3681?auto=format&fit=crop&q=80&w=2670',
                category: 'deportivas',
            },
            {
                title: {
                        es: "Adventure & Enduro",
                        en: "Adventure & Enduro"
                    },
                description: {
                        es: "Sin límites, sin fronteras.",
                        en: "No limits, no borders."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=2670',
                category: 'adventure',
            },
            {
                title: {
                        es: "Custom & Café Racer",
                        en: "Custom & Café Racer"
                    },
                description: {
                        es: "Estilo retro, alma moderna.",
                        en: "Retro style, modern soul."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&q=80&w=2670',
                category: 'custom',
            },
            {
                title: {
                        es: "Touring y Gran Turismo",
                        en: "Touring & Grand Touring"
                    },
                description: {
                        es: "El placer de viajar sin prisas.",
                        en: "The pleasure of traveling without rushing."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=2670',
                category: 'touring',
            },
        ],
        showCategories: true,
        categories: ['Todas', 'deportivas', 'adventure', 'custom', 'touring'],
        portfolioVariant: 'default',
        animationType: 'fade-in-up',
        borderRadius: 'md',
        imageFit: 'cover',
        imageHeight: 320,
        gridColumns: 4,
        colors: {
            background: COLORS.bgAlt,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            description: COLORS.textMuted,
            overlayColor: COLORS.black,
        },
    },
    team: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "NUESTRO EQUIPO",
                en: "OUR TEAM"
            },
        description: {
                es: "Conoce a los apasionados de las dos ruedas que hacen posible MotoForce.",
                en: "Meet the two-wheel enthusiasts who make MotoForce possible."
            },
        teamVariant: 'cards',
        members: [
            {
                name: {
                        es: "Andrés Fuentes",
                        en: "Andrés Fuentes"
                    },
                role: {
                        es: "Gerente General",
                        en: "General Manager"
                    },
                bio: {
                        es: "Más de 20 años en la industria. Ha corrido en pista, ha restaurado clásicas y conoce cada modelo como la palma de su mano.",
                        en: "Over 20 years in the industry. Track racer, classic restorer, and knows every model like the back of his hand."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
            },
            {
                name: {
                        es: "Mariana Castillo",
                        en: "Mariana Castillo"
                    },
                role: {
                        es: "Jefa de Taller",
                        en: "Workshop Manager"
                    },
                bio: {
                        es: "Ingeniera mecánica con certificación en 6 marcas. Si tu moto tiene un problema, Mariana encuentra la solución antes de que lo notes.",
                        en: "Mechanical engineer certified in 6 brands. If your bike has an issue, Mariana finds the solution before you notice it."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=800',
            },
            {
                name: {
                        es: "Ricardo Solís",
                        en: "Ricardo Solís"
                    },
                role: {
                        es: "Asesor de Ventas Senior",
                        en: "Senior Sales Advisor"
                    },
                bio: {
                        es: "No te va a vender una moto. Te va a encontrar LA moto. Sabe escuchar, entiende tu estilo y te guía sin presión.",
                        en: "He won't sell you a bike. He'll find you THE bike. He listens, understands your style, and guides you without pressure."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=800',
            },
            {
                name: {
                        es: "Paola Herrera",
                        en: "Paola Herrera"
                    },
                role: {
                        es: "Especialista en Financiamiento",
                        en: "Financing Specialist"
                    },
                bio: {
                        es: "Experta en hacer los números funcionar. Encuentra el plan perfecto para que te vayas rodando sin preocupaciones financieras.",
                        en: "Expert at making the numbers work. Finds the perfect plan so you ride away with zero financial worries."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=800',
            },
        ],
        cardPadding: 24,
        borderRadius: 'md',
        showBio: true,
        showSocials: false,
        animationType: 'fade-in-up',
        enableCardAnimation: true,
        gridColumns: 4,
        imageHeight: 260,
        imageFit: 'cover',
        colors: {
            background: COLORS.bg,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            role: COLORS.accent,
            cardBackground: COLORS.surface,
        },
    },
    pricing: {
        pricingVariant: 'default',
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "PLANES DE SERVICIO",
                en: "SERVICE PLANS"
            },
        description: {
                es: "Mantenimiento profesional para mantener tu moto en condiciones óptimas. Elige el plan que mejor se adapte a tu estilo de conducción.",
                en: "Professional maintenance to keep your bike in peak condition. Choose the plan that best fits your riding style."
            },
        plans: [
            {
                name: {
                        es: "Básico",
                        en: "Basic"
                    },
                price: "$149",
                period: {
                        es: "/servicio",
                        en: "/service"
                    },
                description: {
                        es: "Mantenimiento esencial para rodar seguro.",
                        en: "Essential maintenance for safe riding."
                    },
                features: [
                    {
                            es: "Cambio de aceite y filtro",
                            en: "Oil and filter change"
                        },
                    {
                            es: "Revisión de frenos",
                            en: "Brake inspection"
                        },
                    {
                            es: "Ajuste de cadena",
                            en: "Chain adjustment"
                        },
                    {
                            es: "Presión de neumáticos",
                            en: "Tire pressure check"
                        },
                    {
                            es: "Inspección visual general",
                            en: "General visual inspection"
                        },
                ],
                highlighted: false,
                ctaText: {
                        es: "Elegir Básico",
                        en: "Choose Basic"
                    },
                ctaUrl: '#leads',
            },
            {
                name: {
                        es: "Premium",
                        en: "Premium"
                    },
                price: "$299",
                period: {
                        es: "/servicio",
                        en: "/service"
                    },
                description: {
                        es: "El preferido por los que exigen lo mejor.",
                        en: "The favorite of those who demand the best."
                    },
                features: [
                    {
                            es: "Todo lo del plan Básico",
                            en: "Everything in Basic plan"
                        },
                    {
                            es: "Diagnóstico electrónico completo",
                            en: "Full electronic diagnosis"
                        },
                    {
                            es: "Cambio de líquido de frenos",
                            en: "Brake fluid change"
                        },
                    {
                            es: "Sincronización de inyección",
                            en: "Injection synchronization"
                        },
                    {
                            es: "Lavado y detallado exterior",
                            en: "Wash and exterior detailing"
                        },
                    {
                            es: "10% descuento en repuestos",
                            en: "10% discount on spare parts"
                        },
                ],
                highlighted: true,
                ctaText: {
                        es: "Elegir Premium",
                        en: "Choose Premium"
                    },
                ctaUrl: '#leads',
            },
            {
                name: {
                        es: "Full Racing",
                        en: "Full Racing"
                    },
                price: "$499",
                period: {
                        es: "/servicio",
                        en: "/service"
                    },
                description: {
                        es: "Para los que viven al límite en cada curva.",
                        en: "For those who live on the edge in every curve."
                    },
                features: [
                    {
                            es: "Todo lo del plan Premium",
                            en: "Everything in Premium plan"
                        },
                    {
                            es: "Cambio de bujías y filtro de aire",
                            en: "Spark plug and air filter change"
                        },
                    {
                            es: "Ajuste de suspensión personalizado",
                            en: "Custom suspension tuning"
                        },
                    {
                            es: "Balanceo de ruedas",
                            en: "Wheel balancing"
                        },
                    {
                            es: "Revisión de transmisión completa",
                            en: "Complete transmission check"
                        },
                    {
                            es: "Prioridad de agenda 24h",
                            en: "24h schedule priority"
                        },
                ],
                highlighted: false,
                ctaText: {
                        es: "Elegir Full Racing",
                        en: "Choose Full Racing"
                    },
                ctaUrl: '#leads',
            },
        ],
        currency: 'USD',
        borderRadius: 'md',
        animationType: 'fade-in-up',
        enableCardAnimation: true,
        gridColumns: 3,
        colors: {
            background: COLORS.bgAlt,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            cardBackground: COLORS.surface,
            highlightedCardBg: COLORS.surfaceAlt,
            buttonBackground: COLORS.accent,
            buttonText: COLORS.white,
            price: COLORS.heading,
        },
    },
    leads: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "SOLICITA TU COTIZACIÓN",
                en: "REQUEST A QUOTE"
            },
        description: {
                es: "Déjanos tus datos y uno de nuestros asesores te contactará en menos de 24 horas para ayudarte a encontrar la moto perfecta.",
                en: "Leave us your details and one of our advisors will contact you within 24 hours to help you find the perfect bike."
            },
        showName: true,
        showEmail: true,
        showPhone: true,
        showCompany: false,
        showMessage: true,
        showConsent: true,
        nameRequired: true,
        emailRequired: true,
        phoneRequired: true,
        messageLabel: {
                es: "¿Qué tipo de moto te interesa?",
                en: "What type of motorcycle are you interested in?"
            },
        messagePlaceholder: {
                es: "Cuéntanos qué buscas...",
                en: "Tell us what you're looking for..."
            },
        consentText: {
                es: "Acepto recibir información comercial sobre productos y servicios de MotoForce.",
                en: "I agree to receive commercial information about MotoForce products and services."
            },
        submitButtonText: {
                es: "Enviar Solicitud",
                en: "Send Request"
            },
        submitButtonLinkType: 'none',
        submitButtonLink: '',
        successMessage: {
                es: "¡Gracias! Te contactaremos pronto.",
                en: "Thank you! We'll contact you soon."
            },
        layout: 'centered-form',
        buttonBorderRadius: 'md',
        formWidth: 600,
        showTitle: true,
        showDescription: true,
        colors: {
            background: COLORS.bg,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            inputBackground: COLORS.surface,
            inputBorder: COLORS.border,
            buttonBackground: COLORS.accent,
            buttonText: COLORS.white,
            successBackground: '#065f46',
            successText: '#d1fae5',
        },
    },
    newsletter: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "ÚNETE A LA COMUNIDAD MOTOFORCE",
                en: "JOIN THE MOTOFORCE COMMUNITY"
            },
        description: {
                es: "Recibe las últimas noticias, lanzamientos exclusivos, eventos y ofertas especiales directamente en tu correo.",
                en: "Get the latest news, exclusive launches, events, and special offers straight to your inbox."
            },
        placeholderText: {
                es: "tu@email.com",
                en: "your@email.com"
            },
        buttonText: {
                es: "Suscribirme",
                en: "Subscribe"
            },
        showNameField: true,
        namePlaceholder: {
                es: "Tu nombre",
                en: "Your name"
            },
        successMessage: {
                es: "¡Bienvenido a la manada MotoForce!",
                en: "Welcome to the MotoForce pack!"
            },
        consentText: {
                es: "Al suscribirte aceptas nuestra política de privacidad.",
                en: "By subscribing you accept our privacy policy."
            },
        layout: 'centered',
        newsletterVariant: 'default',
        buttonBorderRadius: 'md',
        inputBorderRadius: 'md',
        colors: {
            background: COLORS.accent,
            text: COLORS.white,
            heading: COLORS.white,
            description: '#fed7aa',
            inputBackground: COLORS.white,
            inputText: COLORS.black,
            inputPlaceholder: COLORS.textMuted,
            buttonBackground: COLORS.black,
            buttonText: COLORS.white,
            borderColor: 'transparent',
        },
    },
    map: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "VISÍTANOS",
                en: "VISIT US"
            },
        description: {
                es: "Ven a nuestro showroom y descubre la experiencia MotoForce en persona. Te esperamos con un café y las llaves listas para tu prueba de manejo.",
                en: "Come to our showroom and discover the MotoForce experience in person. We'll have coffee ready and keys for your test ride."
            },
        showMap: true,
        address: {
                es: "Av. de la Velocidad 845, Col. Motorista, CDMX 11550",
                en: "845 Speed Ave, Motorista District, Mexico City 11550"
            },
        phone: {
                es: "+52 55 1234 5678",
                en: "+52 55 1234 5678"
            },
        email: 'contacto@motoforce.mx',
        hours: {
                es: "Lun-Vie: 9:00 - 19:00 | Sáb: 10:00 - 15:00",
                en: "Mon-Fri: 9:00 AM - 7:00 PM | Sat: 10:00 AM - 3:00 PM"
            },
        showHours: true,
        showPhone: true,
        showEmail: true,
        showDirections: true,
        mapHeight: 400,
        layout: 'side-by-side',
        mapZoom: 15,
        colors: {
            background: COLORS.bgAlt,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            infoBackground: COLORS.surface,
        },
    },
    faq: {
        faqVariant: 'default',
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "PREGUNTAS FRECUENTES",
                en: "FREQUENTLY ASKED QUESTIONS"
            },
        description: {
                es: "Respuestas claras a las dudas más comunes antes de comprar tu moto.",
                en: "Clear answers to the most common questions before buying your motorcycle."
            },
        items: [
            {
                question: {
                        es: "¿Ofrecen prueba de manejo?",
                        en: "Do you offer test rides?"
                    },
                answer: {
                        es: "¡Sí! Puedes agendar una prueba de manejo para cualquier modelo en exhibición. Solo necesitas licencia de motociclista vigente y una identificación oficial. La prueba dura aproximadamente 30 minutos acompañado por uno de nuestros asesores.",
                        en: "Yes! You can schedule a test ride for any model on display. You only need a valid motorcycle license and official ID. The test ride lasts approximately 30 minutes accompanied by one of our advisors."
                    },
            },
            {
                question: {
                        es: "¿Qué opciones de financiamiento tienen?",
                        en: "What financing options do you have?"
                    },
                answer: {
                        es: "Trabajamos con los principales bancos y financieras del país. Ofrecemos planes desde 12 hasta 60 meses, con enganches desde el 20%. También aceptamos tu moto actual como parte del pago. Nuestra especialista Paola te ayudará a encontrar la mejor opción.",
                        en: "We work with the country's top banks and financial institutions. We offer plans from 12 to 60 months, with down payments starting at 20%. We also accept your current motorcycle as a trade-in. Our specialist Paola will help you find the best option."
                    },
            },
            {
                question: {
                        es: "¿Incluyen garantía las motos nuevas?",
                        en: "Do new motorcycles include warranty?"
                    },
                answer: {
                        es: "Todas nuestras motos nuevas incluyen la garantía oficial del fabricante, que generalmente cubre 2 años o 24,000 km (lo que ocurra primero). Además, ofrecemos garantías extendidas y planes de mantenimiento prepagados para mayor tranquilidad.",
                        en: "All our new motorcycles include the official manufacturer's warranty, typically covering 2 years or 24,000 km (whichever comes first). We also offer extended warranties and prepaid maintenance plans for added peace of mind."
                    },
            },
            {
                question: {
                        es: "¿Hacen envíos a otros estados?",
                        en: "Do you ship to other states?"
                    },
                answer: {
                        es: "Sí, realizamos envíos a todo el país. El costo varía según la distancia y el tipo de moto. Podemos coordinar la entrega directamente en tu domicilio o en una agencia de carga. El tiempo estimado de entrega es de 3 a 7 días hábiles.",
                        en: "Yes, we ship nationwide. The cost varies depending on distance and motorcycle type. We can coordinate delivery directly to your home or to a freight agency. Estimated delivery time is 3 to 7 business days."
                    },
            },
            {
                question: {
                        es: "¿Compran motos usadas?",
                        en: "Do you buy used motorcycles?"
                    },
                answer: {
                        es: "Sí, aceptamos motos usadas como parte de pago y también las compramos directamente. Nuestro equipo de taller realiza una inspección completa de 50 puntos para determinar el valor justo de mercado. El proceso es rápido, transparente y sin compromiso.",
                        en: "Yes, we accept used motorcycles as trade-ins and also purchase them directly. Our workshop team performs a complete 50-point inspection to determine fair market value. The process is fast, transparent, and commitment-free."
                    },
            },
        ],
        layout: 'accordion',
        animationType: 'fade-in-up',
        borderRadius: 'md',
        colors: {
            background: COLORS.bg,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            description: COLORS.text,
        },
    },
    howItWorks: {
        howItWorksVariant: 'steps-timeline',
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "ASÍ DE FÁCIL ES ESTRENAR MOTO",
                en: "GETTING YOUR NEW BIKE IS THIS EASY"
            },
        description: {
                es: "En MotoForce hacemos que el proceso sea rápido, transparente y sin estrés. Cuatro pasos y estás rodando.",
                en: "At MotoForce we make the process fast, transparent, and stress-free. Four steps and you're riding."
            },
        steps: [
            {
                stepNumber: 1,
                title: {
                        es: "Elige tu Moto",
                        en: "Choose Your Bike"
                    },
                description: {
                        es: "Visita nuestro showroom o explora nuestro catálogo en línea. Nuestros asesores te ayudarán a encontrar el modelo ideal según tu estilo, experiencia y presupuesto.",
                        en: "Visit our showroom or explore our online catalog. Our advisors will help you find the ideal model based on your style, experience, and budget."
                    },
                icon: 'search',
            },
            {
                stepNumber: 2,
                title: {
                        es: "Pruébala",
                        en: "Test Ride"
                    },
                description: {
                        es: "Agenda tu prueba de manejo. Siente la potencia, el confort y la tecnología. Nada como vivir la experiencia en persona para tomar la decisión correcta.",
                        en: "Schedule your test ride. Feel the power, comfort, and technology. Nothing beats experiencing it in person to make the right decision."
                    },
                icon: 'bike',
            },
            {
                stepNumber: 3,
                title: {
                        es: "Financia sin Estrés",
                        en: "Stress-Free Financing"
                    },
                description: {
                        es: "Te presentamos las mejores opciones de financiamiento. Aprobación rápida, tasas competitivas y planes flexibles. Todo claro, sin sorpresas.",
                        en: "We present you with the best financing options. Fast approval, competitive rates, and flexible plans. Everything clear, no surprises."
                    },
                icon: 'credit-card',
            },
            {
                stepNumber: 4,
                title: {
                        es: "Rodando a Casa",
                        en: "Ride Home"
                    },
                description: {
                        es: "Firma los documentos, recibe las llaves y disfruta. Te entregamos tu moto con tanque lleno, revisada y lista para la aventura. ¡Bienvenido a la familia MotoForce!",
                        en: "Sign the documents, get the keys, and enjoy. We deliver your bike with a full tank, inspected, and ready for adventure. Welcome to the MotoForce family!"
                    },
                icon: 'flag',
            },
        ],
        showStepNumbers: true,
        showIcons: true,
        layout: 'horizontal',
        animationType: 'fade-in-up',
        colors: {
            background: COLORS.bgAlt,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            description: COLORS.text,
            stepNumberBackground: COLORS.accent,
            stepNumberText: COLORS.white,
        },
    },
    cta: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "¿LISTO PARA DOMINAR EL ASFALTO?",
                en: "READY TO RULE THE ROAD?"
            },
        description: {
                es: "Tu próxima moto te está esperando. Contáctanos hoy mismo y descubre por qué MotoForce es el dealer preferido de los verdaderos apasionados de las dos ruedas.",
                en: "Your next motorcycle is waiting. Contact us today and discover why MotoForce is the preferred dealer for true two-wheel enthusiasts."
            },
        primaryCta: {
                es: "Cotizar Ahora",
                en: "Get a Quote Now"
            },
        secondaryCta: {
                es: "Ver Modelos",
                en: "View Models"
            },
        primaryCtaLink: '#leads',
        secondaryCtaLink: '#services',
        ctaVariant: 'split',
        showImage: true,
        imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=2670',
        imageOverlay: true,
        imageOverlayOpacity: 60,
        animationType: 'fade-in-up',
        buttonBorderRadius: 'md',
        colors: {
            background: COLORS.bg,
            accent: COLORS.accent,
            text: COLORS.text,
            heading: COLORS.heading,
            description: COLORS.textMuted,
            primaryButtonBackground: COLORS.accent,
            primaryButtonText: COLORS.white,
            secondaryButtonBackground: 'transparent',
            secondaryButtonText: COLORS.heading,
            secondaryButtonBorder: COLORS.accent,
            overlayColor: COLORS.black,
        },
    },
    chatbot: {
        enabled: true,
        position: 'bottom-right',
        theme: 'dark',
        accentColor: COLORS.accent,
        welcomeMessage: {
                es: "¡Hola! Soy el asistente virtual de MotoForce. ¿En qué puedo ayudarte? Puedo mostrarte modelos, agendar una prueba de manejo o resolver tus dudas.",
                en: "Hello! I'm MotoForce's virtual assistant. How can I help you? I can show you models, schedule a test ride, or answer your questions."
            },
        placeholder: {
                es: "Escribe tu mensaje...",
                en: "Type your message..."
            },
        title: {
                es: "Asistente MotoForce",
                en: "MotoForce Assistant"
            },
        subtitle: {
                es: "Estamos aquí para ayudarte",
                en: "We're here to help"
            },
        showBranding: true,
    },
    footer: {
        paddingY: 'lg',
        paddingX: 'md',
        logoType: 'text',
        logoText: 'MOTOFORCE',
        logoImageUrl: '',
        logoWidth: 160,
        description: {
                es: "Tu dealer oficial de motocicletas de alto rendimiento. Pasión, ingeniería y compromiso en cada kilómetro.",
                en: "Your official high-performance motorcycle dealer. Passion, engineering, and commitment in every kilometer."
            },
        columns: [
            {
                title: {
                        es: "Modelos",
                        en: "Models"
                    },
                links: [
                    { text: {
                                es: "Deportivas",
                                en: "Sport Bikes"
                            }, href: '#services' },
                    { text: {
                                es: "Adventure",
                                en: "Adventure"
                            }, href: '#services' },
                    { text: {
                                es: "Naked",
                                en: "Naked"
                            }, href: '#services' },
                    { text: {
                                es: "Touring",
                                en: "Touring"
                            }, href: '#services' },
                ],
            },
            {
                title: {
                        es: "Servicios",
                        en: "Services"
                    },
                links: [
                    { text: {
                                es: "Mantenimiento",
                                en: "Maintenance"
                            }, href: '#pricing' },
                    { text: {
                                es: "Reparaciones",
                                en: "Repairs"
                            }, href: '#features' },
                    { text: {
                                es: "Personalización",
                                en: "Customization"
                            }, href: '#features' },
                    { text: {
                                es: "Garantía Extendida",
                                en: "Extended Warranty"
                            }, href: '#pricing' },
                ],
            },
            {
                title: {
                        es: "MotoForce",
                        en: "MotoForce"
                    },
                links: [
                    { text: {
                                es: "Sobre Nosotros",
                                en: "About Us"
                            }, href: '#team' },
                    { text: {
                                es: "Galería",
                                en: "Gallery"
                            }, href: '#portfolio' },
                    { text: {
                                es: "FAQ",
                                en: "FAQ"
                            }, href: '#faq' },
                    { text: {
                                es: "Contacto",
                                en: "Contact"
                            }, href: '#leads' },
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
                            }, href: '/privacy' },
                    { text: {
                                es: "Términos",
                                en: "Terms"
                            }, href: '/terms' },
                    { text: {
                                es: "Cookies",
                                en: "Cookies"
                            }, href: '/cookies' },
                ],
            },
        ],
        socialLinks: [
            { platform: 'instagram', href: 'https://instagram.com' },
            { platform: 'youtube', href: 'https://youtube.com' },
            { platform: 'facebook', href: 'https://facebook.com' },
            { platform: 'tiktok', href: 'https://tiktok.com' },
        ],
        copyrightText: '© {YEAR} MOTOFORCE. TODOS LOS DERECHOS RESERVADOS. DOMINA EL ASFALTO.',
        colors: {
            background: COLORS.black,
            border: COLORS.border,
            text: COLORS.textMuted,
            linkHover: COLORS.accent,
            heading: COLORS.heading,
        },
    },
    banner: {
        bannerVariant: 'classic',
        headline: {
                es: "EVENTO DE PRUEBA DE MANEJO — SÁBADO 24",
                en: "TEST RIDE EVENT — SATURDAY 24TH"
            },
        subheadline: {
                es: "Ven a probar los últimos modelos 2025. Música, café y premios. Regístrate gratis.",
                en: "Come test the latest 2025 models. Music, coffee, and prizes. Free registration."
            },
        buttonText: {
                es: "REGISTRARME",
                en: "REGISTER NOW"
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
    slideshow: {
        slideshowVariant: 'default',
        slides: [
            {
                imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=2670',
                title: { es: "", en: "" },
                subtitle: { es: "", en: "" },
            },
            {
                imageUrl: 'https://images.unsplash.com/photo-1566891439633-eac1875c3681?auto=format&fit=crop&q=80&w=2670',
                title: { es: "", en: "" },
                subtitle: { es: "", en: "" },
            },
            {
                imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=2670',
                title: { es: "", en: "" },
                subtitle: { es: "", en: "" },
            },
        ],
        autoplay: true,
        autoplayInterval: 5,
        showArrows: true,
        showDots: true,
        height: 500,
        colors: {
            background: COLORS.bg,
            arrowColor: COLORS.heading,
            dotColor: COLORS.textMuted,
            dotActiveColor: COLORS.accent,
        },
    },
    video: {
        videoVariant: 'default',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        title: {
                es: "MOTOFORCE EN ACCIÓN",
                en: "MOTOFORCE IN ACTION"
            },
        description: {
                es: "Vive la experiencia MotoForce.",
                en: "Experience MotoForce."
            },
        thumbnailUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=2670',
        autoplay: false,
        showControls: true,
        colors: {
            background: COLORS.bgAlt,
            accent: COLORS.accent,
            text: COLORS.text,
            heading: COLORS.heading,
        },
    },
    menu: {
        menuVariant: 'default',
        title: {
                es: "NUESTRO MENÚ",
                en: "OUR MENU"
            },
        description: {
                es: "",
                en: ""
            },
        categories: [],
        items: [],
        showPrices: true,
        colors: {
            background: COLORS.bg,
            accent: COLORS.accent,
            text: COLORS.text,
            heading: COLORS.heading,
        },
    },
    storeSettings: {
        storeName: 'MotoForce Parts & Gear',
        currency: 'USD',
        enableCart: false,
        enableWishlist: false,
        enableReviews: false,
        enableSearch: false,
        colors: {
            background: COLORS.bg,
            accent: COLORS.accent,
            text: COLORS.text,
            heading: COLORS.heading,
        },
    },
    products: { items: [], colors: { background: COLORS.bg, accent: COLORS.accent, text: COLORS.text, heading: COLORS.heading } },
    featuredProducts: { items: [], title: { es: "", en: "" }, colors: { background: COLORS.bg, accent: COLORS.accent, text: COLORS.text, heading: COLORS.heading } },
    categoryGrid: { categories: [], colors: { background: COLORS.bg, accent: COLORS.accent, text: COLORS.text, heading: COLORS.heading } },
    productHero: { title: { es: "", en: "" }, imageUrl: '', colors: { background: COLORS.bg, accent: COLORS.accent, text: COLORS.text, heading: COLORS.heading } },
    saleCountdown: { enabled: false, title: { es: "", en: "" }, endDate: '', colors: { background: COLORS.bg, accent: COLORS.accent, text: COLORS.text, heading: COLORS.heading } },
    trustBadges: { badges: [], colors: { background: COLORS.bg, accent: COLORS.accent, text: COLORS.text, heading: COLORS.heading } },
    recentlyViewed: { enabled: false, colors: { background: COLORS.bg, accent: COLORS.accent, text: COLORS.text, heading: COLORS.heading } },
    productReviews: { enabled: false, colors: { background: COLORS.bg, accent: COLORS.accent, text: COLORS.text, heading: COLORS.heading } },
    collectionBanner: { title: { es: "", en: "" }, imageUrl: '', colors: { background: COLORS.bg, accent: COLORS.accent, text: COLORS.text, heading: COLORS.heading } },
    productBundle: { enabled: false, title: { es: "", en: "" }, items: [], colors: { background: COLORS.bg, accent: COLORS.accent, text: COLORS.text, heading: COLORS.heading } },
    announcementBar: { enabled: false, text: { es: "", en: "" }, colors: { background: COLORS.accent, text: COLORS.white } },
    productDetail: { enabled: false, colors: { background: COLORS.bg, accent: COLORS.accent, text: COLORS.text, heading: COLORS.heading } },
    categoryProducts: { enabled: false, colors: { background: COLORS.bg, accent: COLORS.accent, text: COLORS.text, heading: COLORS.heading } },
    articleContent: { enabled: false, colors: { background: COLORS.bg, accent: COLORS.accent, text: COLORS.text, heading: COLORS.heading } },
    productGrid: { enabled: false, colors: { background: COLORS.bg, accent: COLORS.accent, text: COLORS.text, heading: COLORS.heading } },
    cart: { enabled: false },
    checkout: { enabled: false },
    colors: {
        primary: COLORS.accent,
        background: COLORS.bg,
        surface: COLORS.surface,
        text: COLORS.text,
        heading: COLORS.heading,
        border: COLORS.border,
        cardBackground: COLORS.surface,
    },
    typography: {
        fontFamilyHeader: 'barlow-condensed',
        fontFamilyBody: 'inter',
        fontScale: 1,
    },
} as PageData;

// =============================================================================
// THEME
// =============================================================================
export const motoForceTheme: ThemeData = {
    cardBorderRadius: 'md',
    buttonBorderRadius: 'md',
    fontFamilyHeader: 'barlow-condensed',
    fontFamilyBody: 'inter',
    fontFamilyButton: 'barlow-condensed',
    headingsAllCaps: true,
    buttonsAllCaps: true,
    navLinksAllCaps: true,
    pageBackground: COLORS.bg,
    globalColors: {
        primary: COLORS.accent,
        secondary: '#fb923c',
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
export const motoForceBrandIdentity: BrandIdentity = {
    name: {
            es: "MotoForce",
            en: "MotoForce"
        },
    industry: 'automotive-motorcycle',
    targetAudience: 'Entusiastas de las motocicletas, desde principiantes hasta pilotos experimentados que buscan máquinas de alto rendimiento, aventura y estilo de vida sobre dos ruedas',
    toneOfVoice: 'Professional',
    coreValues: 'Pasión, Rendimiento, Integridad, Comunidad',
    language: 'Español',
};

// =============================================================================
// COMPONENT ORDER & SECTION VISIBILITY
// =============================================================================
export const motoForceComponentOrder: PageSection[] = [
    // Structure
    'colors', 'typography', 'header',
    // Content sections
    'hero', 'features', 'services', 'portfolio', 'team', 'pricing',
    'testimonials', 'faq', 'howItWorks', 'cta',
    // Engagement
    'leads', 'newsletter', 'map',
    // Extras (hidden by default)
    'heroSplit', 'banner', 'slideshow', 'video', 'menu',
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

const visibleSections: PageSection[] = [
    'colors', 'typography', 'header',
    'hero', 'features', 'services', 'portfolio', 'team', 'pricing',
    'testimonials', 'faq', 'howItWorks', 'cta',
    'leads', 'newsletter', 'map',
    'chatbot', 'footer',
];

export const motoForceSectionVisibility = motoForceComponentOrder.reduce((acc, section) => {
    (acc as any)[section] = visibleSections.includes(section);
    return acc;
}, {} as Record<PageSection, boolean>);

// =============================================================================
// FULL TEMPLATE PRESET (ready for Supabase projects insertion)
// =============================================================================
export const motoForcePreset = {
    name: {
            es: "MotoForce - Dealer de Motos",
            en: "MotoForce - Motorcycle Dealer"
        },
    data: motoForcePageData,
    theme: motoForceTheme,
    brandIdentity: motoForceBrandIdentity,
    componentOrder: motoForceComponentOrder,
    sectionVisibility: motoForceSectionVisibility,
    status: 'Template' as const,
    description: {
            es: "Template para dealers de motocicletas con estética oscura y acentos naranja. Incluye catálogo de modelos, galería, planes de servicio, equipo, financiamiento, FAQ y contacto. Perfecto para concesionarios de motos deportivas, adventure y touring.",
            en: "Motorcycle dealer template with dark aesthetics and orange accents. Includes model catalog, gallery, service plans, team, financing, FAQ, and contact. Perfect for sport, adventure, and touring motorcycle dealerships."
        },
    category: {
            es: "automotriz",
            en: "automotive"
        },
    tags: ['motorcycle', 'dealer', 'motos', 'deportivas', 'adventure', 'touring', 'naranja', 'oscuro', 'racing'],
    industries: ['automotive-motorcycle'],
    thumbnailUrl: '',
};
