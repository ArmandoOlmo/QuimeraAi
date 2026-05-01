/**
 * L'Élite Landing Page de Lujo — Template Preset
 * 
 * Luxurious dark restaurant landing page with gold accents (#d4a373).
 * Inspired by the Stitch template of the same name.
 * 
 * Uses seeder at scripts/seedEliteTemplate.ts.
 */

import { PageData, ThemeData, PageSection, BrandIdentity, NavLink } from '../../types';

// =============================================================================
// COLORS — Luxury Gold Palette
// =============================================================================
const COLORS = {
    bg: '#0c0a09',
    bgAlt: '#1a1714',
    surface: '#1c1917',
    surfaceAlt: '#292524',
    accent: '#d4a373',
    accentHover: '#e0b68a',
    accentDark: '#a67c52',
    text: '#a8a29e',
    textMuted: '#78716c',
    heading: '#fafaf9',
    border: '#292524',
    white: '#ffffff',
    black: '#000000',
    cream: '#f5f0eb',
};

// =============================================================================
// PAGE DATA
// =============================================================================
export const elitePageData: PageData = {
    header: {
        style: 'sticky-solid',
        layout: 'minimal',
        isSticky: true,
        glassEffect: false,
        height: 70,
        logoType: 'text',
        logoText: "L'ÉLITE",
        logoImageUrl: '',
        logoWidth: 140,
        links: [
            { text: {
                        es: "Menú",
                        en: "Menu"
                    }, href: '#menu' },
            { text: {
                        es: "Servicios",
                        en: "Services"
                    }, href: '#services' },
            { text: {
                        es: "Equipo",
                        en: "Team"
                    }, href: '#team' },
            { text: {
                        es: "Reservas",
                        en: "Reservations"
                    }, href: '#leads' },
        ] as NavLink[],
        hoverStyle: 'simple',
        ctaText: {
                es: "Reservar Mesa",
                en: "Book a Table"
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
        buttonBorderRadius: 'lg',
        linkFontSize: 13,
    },
    hero: {
        heroVariant: 'modern',
        paddingY: 'xl',
        paddingX: 'lg',
        headline: {
                es: "Una Experiencia <span class=\"text-transparent bg-clip-text\" style=\"-webkit-text-fill-color: transparent; background-image: linear-gradient(135deg, #d4a373, #e0b68a)\">Sensorial Inolvidable</span>",
                en: "An Unforgettable <span class=\"text-transparent bg-clip-text\" style=\"-webkit-text-fill-color: transparent; background-image: linear-gradient(135deg, #d4a373, #e0b68a)\">Sensory Experience</span>"
            },
        subheadline: {
                es: "Donde la gastronomía se encuentra con el arte. Una experiencia culinaria diseñada para los paladares más exigentes, en un entorno de sofisticación absoluta.",
                en: "Where gastronomy meets art. A culinary experience designed for the most discerning palates, in an environment of absolute sophistication."
            },
        primaryCta: {
                es: "Reservar Mesa",
                en: "Book a Table"
            },
        secondaryCta: {
                es: "Ver Menú",
                en: "View Menu"
            },
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=2670',
        imageStyle: 'default',
        imageDropShadow: false,
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
            secondary: COLORS.surfaceAlt,
            background: COLORS.bg,
            text: COLORS.text,
            heading: COLORS.heading,
            buttonBackground: COLORS.accent,
            buttonText: COLORS.bg,
            secondaryButtonBackground: 'transparent',
            secondaryButtonText: COLORS.accent,
        },
        secondaryButtonStyle: 'outline',
        secondaryButtonOpacity: 100,
        showBadge: true,
        badgeText: {
                es: "✦ Fine Dining Experience",
                en: "✦ Fine Dining Experience"
            },
        badgeIcon: 'sparkles',
        badgeColor: COLORS.accent,
        badgeBackgroundColor: `${COLORS.accent}15`,
        buttonBorderRadius: 'lg',
        animationType: 'fade-in-up',
        primaryCtaLink: '#leads',
        primaryCtaLinkType: 'section',
        secondaryCtaLink: '#menu',
        secondaryCtaLinkType: 'section',
        headlineFontSize: 'xl',
        subheadlineFontSize: 'md',
    },
    heroSplit: {
        headline: {
                es: "Una Experiencia Sensorial Inolvidable",
                en: "An Unforgettable Sensory Experience"
            },
        subheadline: {
                es: "Donde la gastronomía se encuentra con el arte.",
                en: "Where gastronomy meets art."
            },
        buttonText: {
                es: "Reservar Mesa",
                en: "Book a Table"
            },
        buttonUrl: '#leads',
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=2670',
        imagePosition: 'right',
        maxHeight: 500,
        angleIntensity: 0,
        colors: {
            textBackground: COLORS.bg,
            imageBackground: COLORS.black,
            heading: COLORS.heading,
            text: COLORS.text,
            buttonBackground: COLORS.accent,
            buttonText: COLORS.bg,
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
                es: "Nuestra Esencia",
                en: "Our Essence"
            },
        description: {
                es: "Tres pilares que definen la experiencia L'Élite: ingredientes excepcionales, maestría culinaria y una bodega incomparable.",
                en: "Three pillars define the L'Élite experience: exceptional ingredients, culinary mastery, and an unparalleled wine cellar."
            },
        items: [
            {
                title: {
                        es: "Ingredientes Orgánicos",
                        en: "Organic Ingredients"
                    },
                description: {
                        es: "Seleccionados diariamente de nuestros huertos locales para garantizar la máxima frescura y sabor.",
                        en: "Selected daily from our local gardens to ensure maximum freshness and flavor."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&q=80&w=2670',
            },
            {
                title: {
                        es: "Chef de Estrella Michelin",
                        en: "Michelin Star Chef"
                    },
                description: {
                        es: "Liderado por el visionario Jean-Luc Dubois, transformando ingredientes en obras de arte culinario.",
                        en: "Led by visionary Jean-Luc Dubois, transforming ingredients into culinary works of art."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=2670',
            },
            {
                title: {
                        es: "Cava Privada",
                        en: "Private Cellar"
                    },
                description: {
                        es: "Una colección exclusiva de más de 500 etiquetas de los viñedos más prestigiosos del mundo.",
                        en: "An exclusive collection of over 500 labels from the world's most prestigious vineyards."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&q=80&w=2670',
            },
        ],
        gridColumns: 3,
        imageHeight: 200,
        imageObjectFit: 'cover',
        animationType: 'fade-in-up',
        enableCardAnimation: true,
        borderRadius: 'lg',
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
                es: "Voces de L'Élite",
                en: "Voices of L'Élite"
            },
        description: {
                es: "Lo que dicen quienes han vivido la experiencia.",
                en: "What those who have experienced it say."
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
                        es: "\"Una sinfonía de sabores que desafía la imaginación. El maridaje fue exquisito y el servicio, simplemente de otro mundo.\"",
                        en: "\"A symphony of flavors that defies imagination. The wine pairing was exquisite, and the service, simply out of this world.\""
                    },
                name: {
                        es: "Carlos Mendoza",
                        en: "Carlos Mendoza"
                    },
                title: {
                        es: "Crítico Gastronómico",
                        en: "Gastronomic Critic"
                    },
            },
            {
                quote: {
                        es: "\"El ambiente es la definición de lujo discreto. Celebrar nuestro aniversario aquí convirtió una noche especial en un recuerdo eterno.\"",
                        en: "\"The ambiance is the definition of discreet luxury. Celebrating our anniversary here turned a special night into an everlasting memory.\""
                    },
                name: {
                        es: "Sofía Valderrama",
                        en: "Sofía Valderrama"
                    },
                title: {
                        es: "Empresaria",
                        en: "Entrepreneur"
                    },
            },
            {
                quote: {
                        es: "\"La atención al detalle es obsesiva. Desde la cristalería hasta la presentación del postre, todo en L'Élite respira perfección.\"",
                        en: "\"The attention to detail is obsessive. From the glassware to the dessert presentation, everything at L'Élite breathes perfection.\""
                    },
                name: {
                        es: "David Alarcón",
                        en: "David Alarcón"
                    },
                title: {
                        es: "Sommelier Internacional",
                        en: "International Sommelier"
                    },
            },
        ],
        colors: {
            background: `rgba(28, 25, 23, 0.5)`,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            cardBackground: COLORS.surface,
        },
    },
    slideshow: {
        slideshowVariant: 'classic',
        title: {
                es: "El Espacio",
                en: "The Space"
            },
        showTitle: true,
        fullWidth: true,
        paddingY: 'lg',
        paddingX: 'none',
        titleFontSize: 'md',
        borderRadius: 'lg',
        autoPlaySpeed: 5000,
        transitionEffect: 'slide',
        transitionDuration: 600,
        showArrows: true,
        showDots: true,
        arrowStyle: 'rounded',
        dotStyle: 'circle',
        kenBurnsIntensity: 'medium',
        thumbnailSize: 80,
        showCaptions: true,
        slideHeight: 500,
        items: [
            { imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=2670', altText: 'Salón Principal', caption: 'Salón Principal' },
            { imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=2670', altText: 'Zona Privada', caption: 'Zona Privada' },
            { imageUrl: 'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&q=80&w=2670', altText: 'La Cava', caption: 'La Cava' },
        ],
        colors: {
            background: COLORS.bg,
            heading: COLORS.heading,
            arrowBackground: 'rgba(0, 0, 0, 0.6)',
            arrowText: COLORS.heading,
            dotActive: COLORS.accent,
            dotInactive: 'rgba(255, 255, 255, 0.3)',
            captionBackground: 'rgba(0, 0, 0, 0.7)',
            captionText: COLORS.heading,
        },
    },
    pricing: {
        pricingVariant: 'gradient',
        title: {
                es: "Menús Degustación",
                en: "Tasting Menus"
            },
        description: {
                es: "Tres experiencias gastronómicas diseñadas para transportarle a un viaje sensorial único.",
                en: "Three gastronomic experiences designed to transport you on a unique sensory journey."
            },
        paddingY: 'lg',
        paddingX: 'md',
        titleFontSize: 'md',
        descriptionFontSize: 'md',
        cardBorderRadius: 'lg',
        tiers: [
            {
                name: {
                        es: "Experiencia Esencial",
                        en: "Essential Experience"
                    },
                price: {
                        es: "€120",
                        en: "€120"
                    },
                frequency: '/persona',
                description: {
                        es: "5 pases de temporada con aperitivo de bienvenida.",
                        en: "5 seasonal courses with a welcome aperitif."
                    },
                features: [
                    '5 Pases de temporada',
                    'Aperitivo de bienvenida',
                    'Café y Petit Fours',
                    'Pan artesanal de la casa',
                ],
                buttonText: {
                        es: "Reservar",
                        en: "Book"
                    },
                buttonLink: '#leads',
                featured: false,
            },
            {
                name: {
                        es: "Gran Degustación",
                        en: "Grand Tasting"
                    },
                price: {
                        es: "€195",
                        en: "€195"
                    },
                frequency: '/persona',
                description: {
                        es: "8 pases exclusivos con maridaje de vinos.",
                        en: "8 exclusive courses with wine pairing."
                    },
                features: [
                    '8 Pases exclusivos',
                    'Maridaje de vinos locales',
                    'Selección de quesos artesanos',
                    'Café y Petit Fours Premium',
                    'Aperitivo especial del Chef',
                ],
                buttonText: {
                        es: "Reservar",
                        en: "Book"
                    },
                buttonLink: '#leads',
                featured: true,
            },
            {
                name: {
                        es: "Elite Signature",
                        en: "Elite Signature"
                    },
                price: {
                        es: "€320",
                        en: "€320"
                    },
                frequency: '/persona',
                description: {
                        es: "La experiencia completa de 12 pases con servicio premium.",
                        en: "The complete 12-course experience with premium service."
                    },
                features: [
                    '12 Pases — Menú Completo',
                    'Maridaje Internacional Premium',
                    'Mesa en zona privada',
                    'Regalo del Chef',
                    'Servicio de sommelier dedicado',
                    'Digestivo exclusivo',
                ],
                buttonText: {
                        es: "Reservar",
                        en: "Book"
                    },
                buttonLink: '#leads',
                featured: false,
            },
        ],
        colors: {
            background: COLORS.bgAlt,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            buttonBackground: COLORS.accent,
            buttonText: COLORS.bg,
            checkmarkColor: COLORS.accent,
            cardBackground: COLORS.surface,
            gradientStart: COLORS.accent,
            gradientEnd: COLORS.accentHover,
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
                es: "Todo lo que necesita saber para disfrutar de su visita a L'Élite.",
                en: "Everything you need to know to enjoy your visit to L'Élite."
            },
        paddingY: 'lg',
        paddingX: 'md',
        items: [
            {
                question: '¿Es necesario reservar con antelación?',
                answer: 'Sí, recomendamos reservar con al menos 48 horas de antelación. Para los menús degustación Elite Signature, sugerimos una semana de antelación para garantizar la mejor experiencia.',
            },
            {
                question: '¿Tienen opciones para dietas especiales?',
                answer: 'Absolutamente. Nuestro equipo puede adaptar cualquier menú a necesidades dietéticas específicas: vegetariana, vegana, sin gluten, alergias alimentarias, etc. Infórmenos al momento de la reserva.',
            },
            {
                question: '¿Cuál es el código de vestimenta?',
                answer: 'Elegante casual. Sugerimos traje o vestimenta formal para cenas, especialmente en los salones privados. No se permite ropa deportiva ni calzado informal.',
            },
            {
                question: '¿Ofrecen servicio para eventos privados?',
                answer: 'Sí, disponemos de salones privados para eventos de 8 a 40 comensales. Creamos menús personalizados y ofrecemos decoración temática, servicio de sommelier y atención dedicada.',
            },
        ],
        colors: {
            background: COLORS.bg,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
        },
    },
    leads: {
        leadsVariant: 'classic',
        title: {
                es: "Reserve su Mesa",
                en: "Reserve Your Table"
            },
        description: {
                es: "Déjenos saber sus preferencias y nos encargaremos de preparar una velada inolvidable para usted.",
                en: "Let us know your preferences and we'll craft an unforgettable evening for you."
            },
        namePlaceholder: 'Nombre completo',
        emailPlaceholder: 'su@email.com',
        companyPlaceholder: 'Número de comensales',
        messagePlaceholder: 'Ocasión especial, preferencias dietéticas, peticiones...',
        buttonText: {
                es: "Solicitar Reserva",
                en: "Request Reservation"
            },
        paddingY: 'lg',
        paddingX: 'md',
        cardBorderRadius: 'lg',
        buttonBorderRadius: 'lg',
        titleFontSize: 'md',
        descriptionFontSize: 'md',
        colors: {
            background: COLORS.bgAlt,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            buttonBackground: COLORS.accent,
            buttonText: COLORS.bg,
            cardBackground: COLORS.surface,
            inputBackground: COLORS.bg,
            inputText: COLORS.heading,
            inputBorder: COLORS.border,
            gradientStart: COLORS.accent,
            gradientEnd: COLORS.accentHover,
        },
    },
    newsletter: {
        title: {
                es: "La Gazette de L'Élite",
                en: "The Gazette of L'Élite"
            },
        description: {
                es: "Reciba en primicia menús de temporada, eventos exclusivos e invitaciones especiales.",
                en: "Be the first to receive seasonal menus, exclusive events, and special invitations."
            },
        placeholderText: 'su@email.com',
        buttonText: {
                es: "Suscribirse",
                en: "Subscribe"
            },
        paddingY: 'lg',
        paddingX: 'md',
        colors: {
            background: COLORS.surface,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            buttonBackground: COLORS.accent,
            buttonText: COLORS.bg,
            cardBackground: `${COLORS.accent}15`,
            inputBackground: COLORS.bg,
            inputText: COLORS.heading,
            inputBorder: COLORS.border,
        },
    },
    cta: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "¿Listo para una Experiencia Inolvidable?",
                en: "Ready for an Unforgettable Experience?"
            },
        description: {
                es: "Reserve su mesa y permítanos crear un momento que recordará por siempre.",
                en: "Reserve your table and let us create a moment you'll cherish forever."
            },
        buttonText: {
                es: "Reservar Ahora",
                en: "Book Now"
            },
        titleFontSize: 'lg',
        descriptionFontSize: 'md',
        colors: {
            background: COLORS.bg,
            gradientStart: COLORS.accent,
            gradientEnd: COLORS.accentHover,
            text: COLORS.text,
            heading: COLORS.heading,
            buttonBackground: COLORS.heading,
            buttonText: COLORS.bg,
        },
    },
    portfolio: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "Nuestras Creaciones",
                en: "Our Creations"
            },
        description: {
                es: "Una selección de los platos que definen nuestra propuesta culinaria.",
                en: "A selection of dishes that define our culinary vision."
            },
        items: [
            {
                title: {
                        es: "Carpaccio de Wagyu",
                        en: "Wagyu Carpaccio"
                    },
                description: {
                        es: "Trufa negra, parmesano reggiano 24 meses, aceite de oliva virgen.",
                        en: "Black truffle, 24-month Parmigiano Reggiano, extra virgin olive oil."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=2670',
            },
            {
                title: {
                        es: "Vieiras Braseadas",
                        en: "Seared Scallops"
                    },
                description: {
                        es: "Puré de coliflor, espuma de cítricos, caviar de beluga.",
                        en: "Cauliflower purée, citrus foam, beluga caviar."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=2670',
            },
            {
                title: {
                        es: "Solomillo Rossini",
                        en: "Rossini Tenderloin"
                    },
                description: {
                        es: "Foie gras, reducción de Pedro Ximénez, gratín dauphinois.",
                        en: "Foie gras, Pedro Ximénez reduction, gratin dauphinois."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=2670',
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
    services: {
        servicesVariant: 'cards',
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "Nuestros Servicios",
                en: "Our Services"
            },
        description: {
                es: "Experiencias diseñadas para cada ocasión, con el sello inconfundible de L'Élite.",
                en: "Experiences crafted for every occasion, with L'Élite's unmistakable signature."
            },
        items: [
            {
                icon: 'utensils',
                title: {
                        es: "Cenas Privadas",
                        en: "Private Dining"
                    },
                description: {
                        es: "Espacios íntimos diseñados para celebraciones exclusivas con menús personalizados a su gusto.",
                        en: "Intimate spaces designed for exclusive celebrations with personalized menus."
                    },
            },
            {
                icon: 'building',
                title: {
                        es: "Eventos Corporativos",
                        en: "Corporate Events"
                    },
                description: {
                        es: "Impresione a sus socios y clientes con un servicio impecable en un entorno de sofisticación absoluta.",
                        en: "Impress your partners and clients with impeccable service in a setting of absolute sophistication."
                    },
            },
            {
                icon: 'wine',
                title: {
                        es: "Cata de Vinos",
                        en: "Wine Tasting"
                    },
                description: {
                        es: "Sesiones guiadas por nuestros expertos sommeliers para descubrir los secretos de las mejores añadas.",
                        en: "Guided sessions with our expert sommeliers to discover the secrets of the finest vintages."
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
                es: "Maestros de la Excelencia",
                en: "Masters of Excellence"
            },
        description: {
                es: "El talento detrás de cada experiencia en L'Élite.",
                en: "The talent behind every experience at L'Élite."
            },
        items: [
            {
                name: {
                        es: "Jean-Luc Dubois",
                        en: "Jean-Luc Dubois"
                    },
                role: {
                        es: "Chef Ejecutivo",
                        en: "Executive Chef"
                    },
                imageUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=2670',
            },
            {
                name: {
                        es: "Elena Rostova",
                        en: "Elena Rostova"
                    },
                role: {
                        es: "Head Sommelier",
                        en: "Head Sommelier"
                    },
                imageUrl: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&q=80&w=2670',
            },
            {
                name: {
                        es: "Alessandro Ricci",
                        en: "Alessandro Ricci"
                    },
                role: {
                        es: "Maître D'",
                        en: "Maître D'"
                    },
                imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=2670',
            },
        ],
        animationType: 'fade-in-up',
        enableCardAnimation: true,
        colors: {
            background: COLORS.bgAlt,
            text: COLORS.text,
            heading: COLORS.heading,
        },
    },
    video: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "Detrás de Escena",
                en: "Behind the Scenes"
            },
        description: {
                es: "Descubra la pasión y el arte que hay detrás de cada plato.",
                en: "Discover the passion and artistry behind every dish."
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
                es: "Su Experiencia",
                en: "Your Experience"
            },
        description: {
                es: "Cuatro pasos hacia una velada inolvidable.",
                en: "Four steps to an unforgettable evening."
            },
        steps: 4,
        items: [
            { icon: 'upload', title: {
                        es: "Reserve",
                        en: "Reserve"
                    }, description: {
                        es: "Solicite su mesa y comparta sus preferencias con nosotros.",
                        en: "Request your table and share your preferences with us."
                    } },
            { icon: 'process', title: {
                        es: "Confirmación",
                        en: "Confirmation"
                    }, description: {
                        es: "Nuestro equipo confirmará su reserva y atenderá sus peticiones.",
                        en: "Our team will confirm your reservation and address your requests."
                    } },
            { icon: 'download', title: {
                        es: "Bienvenida",
                        en: "Welcome"
                    }, description: {
                        es: "Un aperitivo de cortesía le recibirá a su llegada.",
                        en: "A complimentary aperitif awaits your arrival."
                    } },
            { icon: 'share', title: {
                        es: "Disfrute",
                        en: "Enjoy"
                    }, description: {
                        es: "Relájese y déjese llevar por una experiencia gastronómica única.",
                        en: "Relax and indulge in a unique gastronomic experience."
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
        welcomeMessage: 'Bienvenido a L\'Élite. ¿En qué podemos ayudarle? Puede preguntarnos sobre el menú, reservas o eventos privados.',
        placeholderText: 'Preguntar sobre menú, reservas, eventos...',
        knowledgeBase: 'L\'Élite es un restaurante de alta cocina en Madrid. Ofrecemos menús degustación: Experiencia Esencial (€120, 5 pases), Gran Degustación (€195, 8 pases) y Elite Signature (€320, 12 pases). Horario: Mar-Jue 19:00-23:00, Vie-Sáb 19:00-00:00, Dom 13:00-16:00. Cerrado lunes.',
        position: 'bottom-right',
        colors: {
            primary: COLORS.accent,
            text: COLORS.bg,
            background: COLORS.bg,
        },
    },
    map: {
        title: {
                es: "Encuéntrenos",
                en: "Find Us"
            },
        description: {
                es: "Av. de la Libertad 45, Madrid. Aparcamiento privado disponible para nuestros comensales.",
                en: "Av. de la Libertad 45, Madrid. Private parking available for our guests."
            },
        address: {
                es: "Av. de la Libertad 45, Madrid, 28013",
                en: "Av. de la Libertad 45, Madrid, 28013"
            },
        lat: 40.4168,
        lng: -3.7038,
        zoom: 16,
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
            cardBackground: COLORS.surface,
        },
        titleFontSize: 'md',
        descriptionFontSize: 'md',
        borderRadius: 'lg',
    },
    menu: {
        menuVariant: 'classic',
        title: {
                es: "Menú de Temporada",
                en: "Seasonal Menu"
            },
        description: {
                es: "Nuestra selección de platos de temporada, cuidadosamente elaborados con ingredientes de la más alta calidad.",
                en: "Our selection of seasonal dishes, carefully prepared with the highest quality ingredients."
            },
        paddingY: 'lg',
        paddingX: 'md',
        items: [
            {
                name: {
                        es: "Carpaccio de Wagyu",
                        en: "Wagyu Carpaccio"
                    },
                description: {
                        es: "Trufa negra, parmesano reggiano 24 meses, aceite de oliva virgen.",
                        en: "Black truffle, 24-month aged Parmigiano Reggiano, extra virgin olive oil."
                    },
                price: {
                        es: "€38",
                        en: "€38"
                    },
                imageUrl: '',
                category: {
                        es: "Entrantes",
                        en: "Starters"
                    },
                isSpecial: true,
            },
            {
                name: {
                        es: "Vieiras Braseadas",
                        en: "Seared Scallops"
                    },
                description: {
                        es: "Puré de coliflor, espuma de cítricos, caviar de beluga.",
                        en: "Cauliflower puree, citrus foam, beluga caviar."
                    },
                price: {
                        es: "€42",
                        en: "€42"
                    },
                imageUrl: '',
                category: {
                        es: "Entrantes",
                        en: "Starters"
                    },
                isSpecial: false,
            },
            {
                name: {
                        es: "Lubina Salvaje",
                        en: "Wild Sea Bass"
                    },
                description: {
                        es: "Risotto de azafrán, espárragos trigueros, salsa beurre blanc.",
                        en: "Saffron risotto, wild asparagus, beurre blanc sauce."
                    },
                price: {
                        es: "€48",
                        en: "€48"
                    },
                imageUrl: '',
                category: {
                        es: "Platos Principales",
                        en: "Main Courses"
                    },
                isSpecial: false,
            },
            {
                name: {
                        es: "Solomillo Rossini",
                        en: "Rossini Tenderloin"
                    },
                description: {
                        es: "Foie gras, reducción de Pedro Ximénez, gratín dauphinois.",
                        en: "Foie gras, Pedro Ximénez reduction, dauphinois gratin."
                    },
                price: {
                        es: "€56",
                        en: "€56"
                    },
                imageUrl: '',
                category: {
                        es: "Platos Principales",
                        en: "Main Courses"
                    },
                isSpecial: true,
            },
            {
                name: {
                        es: "Esfera de Chocolate",
                        en: "Chocolate Sphere"
                    },
                description: {
                        es: "Oro comestible, frutos rojos, salsa de caramelo salado caliente.",
                        en: "Edible gold, red berries, warm salted caramel sauce."
                    },
                price: {
                        es: "€22",
                        en: "€22"
                    },
                imageUrl: '',
                category: {
                        es: "Postres",
                        en: "Desserts"
                    },
                isSpecial: true,
            },
            {
                name: {
                        es: "Soufflé de Grand Marnier",
                        en: "Grand Marnier Soufflé"
                    },
                description: {
                        es: "Helado de vainilla de Madagascar, zest de naranja confitada.",
                        en: "Madagascar vanilla ice cream, candied orange zest."
                    },
                price: {
                        es: "€24",
                        en: "€24"
                    },
                imageUrl: '',
                category: {
                        es: "Postres",
                        en: "Desserts"
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
            cardBackground: COLORS.surface,
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
                es: "L'ÉLITE",
                en: "L'ÉLITE"
            },
        description: {
                es: "Donde la gastronomía se encuentra con el arte. Una experiencia diseñada para los paladares más exigentes.",
                en: "Where gastronomy meets art. An experience crafted for the most discerning palates."
            },
        linkColumns: [
            {
                title: {
                        es: "Descubrir",
                        en: "Discover"
                    },
                links: [
                    { text: {
                                es: "Nuestra Historia",
                                en: "Our Story"
                            }, href: '/about' },
                    { text: {
                                es: "El Chef",
                                en: "The Chef"
                            }, href: '#team' },
                    { text: {
                                es: "Filosofía Sostenible",
                                en: "Sustainable Philosophy"
                            }, href: '/about' },
                    { text: {
                                es: "Blog Culinario",
                                en: "Culinary Blog"
                            }, href: '/blog' },
                ],
            },
            {
                title: {
                        es: "Experiencia",
                        en: "Experience"
                    },
                links: [
                    { text: {
                                es: "Menú Degustación",
                                en: "Tasting Menu"
                            }, href: '#pricing' },
                    { text: {
                                es: "Carta de Vinos",
                                en: "Wine List"
                            }, href: '#menu' },
                    { text: {
                                es: "Eventos Privados",
                                en: "Private Events"
                            }, href: '#services' },
                    { text: {
                                es: "Tarjetas Regalo",
                                en: "Gift Cards"
                            }, href: '/contact' },
                ],
            },
            {
                title: {
                        es: "Horario",
                        en: "Hours"
                    },
                links: [
                    { text: {
                                es: "Mar - Jue: 19:00 - 23:00",
                                en: "Tue - Thu: 7:00 PM - 11:00 PM"
                            }, href: '/contact' },
                    { text: {
                                es: "Vie - Sáb: 19:00 - 00:00",
                                en: "Fri - Sat: 7:00 PM - 12:00 AM"
                            }, href: '/contact' },
                    { text: {
                                es: "Dom: 13:00 - 16:00",
                                en: "Sun: 1:00 PM - 4:00 PM"
                            }, href: '/contact' },
                    { text: {
                                es: "Cerrado los Lunes",
                                en: "Closed on Mondays"
                            }, href: '/contact' },
                ],
            },
        ],
        socialLinks: [
            { platform: 'instagram', href: 'https://instagram.com' },
            { platform: 'facebook', href: 'https://facebook.com' },
        ],
        copyrightText: '© {YEAR} L\'Élite Restaurant. Todos los derechos reservados.',
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
                es: "Velada Especial de San Valentín",
                en: "Valentine's Special Evening"
            },
        subheadline: {
                es: "Menú exclusivo de 8 pases con maridaje premium y música en vivo. Plazas limitadas.",
                en: "Exclusive 8-course menu with premium wine pairing and live music. Limited seating."
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
            text: COLORS.bg,
            heading: COLORS.bg,
            buttonBackground: COLORS.bg,
            buttonText: COLORS.accent,
        },
    },
} as PageData;

// =============================================================================
// THEME
// =============================================================================
export const eliteTheme: ThemeData = {
    cardBorderRadius: 'lg',
    buttonBorderRadius: 'lg',
    fontFamilyHeader: 'playfair-display',
    fontFamilyBody: 'inter',
    fontFamilyButton: 'inter',
    headingsAllCaps: false,
    buttonsAllCaps: false,
    navLinksAllCaps: false,
    pageBackground: COLORS.bg,
    globalColors: {
        primary: COLORS.accent,
        secondary: COLORS.accentHover,
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
export const eliteBrandIdentity: BrandIdentity = {
    name: {
            es: "L'Élite Restaurant",
            en: "L'Élite Restaurant"
        },
    industry: 'restaurant-bar',
    targetAudience: 'Personas exigentes que buscan experiencias gastronómicas de alta cocina, celebraciones especiales y eventos corporativos de lujo',
    toneOfVoice: 'Luxury',
    coreValues: 'Excelencia, Sostenibilidad, Arte Culinario, Hospitalidad',
    language: 'Español',
};

// =============================================================================
// COMPONENT ORDER & SECTION VISIBILITY
// =============================================================================
export const eliteComponentOrder: PageSection[] = [
    // Structure
    'colors', 'typography', 'header',
    // Content sections matching the Stitch template
    'hero', 'features', 'services', 'menu', 'team', 'pricing',
    'testimonials', 'faq', 'howItWorks',
    // Engagement
    'leads', 'newsletter', 'map',
    // Extras (hidden by default)
    'heroSplit', 'banner', 'slideshow', 'portfolio', 'cta', 'video',
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
    'hero', 'features', 'services', 'menu', 'team', 'pricing',
    'testimonials', 'leads', 'newsletter', 'map',
    'chatbot', 'footer',
];

export const eliteSectionVisibility = eliteComponentOrder.reduce((acc, section) => {
    (acc as any)[section] = visibleSections.includes(section);
    return acc;
}, {} as Record<PageSection, boolean>);

// =============================================================================
// FULL TEMPLATE PRESET (ready for Firestore insertion)
// =============================================================================
export const eliteLuxuryPreset = {
    name: {
            es: "L'Élite Landing Page de Lujo",
            en: "L'Élite Luxury Landing Page"
        },
    data: elitePageData,
    theme: eliteTheme,
    brandIdentity: eliteBrandIdentity,
    componentOrder: eliteComponentOrder,
    sectionVisibility: eliteSectionVisibility,
    status: 'Template' as const,
    description: {
            es: "Elegante landing page para restaurante de alta cocina con estética oscura y acentos dorados. Incluye menú de temporada, secciones de servicios, equipo, precios de menú degustación y reservas.",
            en: "Elegant landing page for a high-end restaurant with a dark aesthetic and gold accents. Features seasonal menu, service sections, team, tasting menu prices, and reservations."
        },
    category: {
            es: "restaurant",
            en: "restaurant"
        },
    tags: ['luxury', 'restaurant', 'fine-dining', 'dark', 'gold', 'elegant', 'gastronomía'],
    industries: ['restaurant-bar'],
    thumbnailUrl: '',
};
