/**
 * Dark Brutalist Gym Template Preset
 * 
 * Datos pre-configurados para el template "Dark Brutalist Gym" inspirado en
 * estética brutalist con dark mode y acento rojo (#f2330d).
 * 
 * Este preset se usa con el seeder en scripts/seedGymTemplate.ts para
 * insertar un template completo en Firestore.
 */

import { PageData, ThemeData, PageSection, BrandIdentity, NavLink } from '../../types';

// =============================================================================
// COLORS — Brutalist Gym Palette
// =============================================================================
const COLORS = {
    bg: '#0a0a0a',
    bgAlt: '#111111',
    surface: '#1a1a1a',
    surfaceAlt: '#222222',
    accent: '#f2330d',
    accentHover: '#ff4422',
    text: '#a0a0a0',
    textMuted: '#666666',
    heading: '#ffffff',
    border: '#2a2a2a',
    white: '#ffffff',
    black: '#000000',
};

// =============================================================================
// PAGE DATA
// =============================================================================
export const gymPageData: PageData = {
    header: {
        style: 'sticky-solid',
        layout: 'minimal',
        isSticky: true,
        glassEffect: false,
        height: 70,
        logoType: 'text',
        logoText: 'IRON TEMPLE',
        logoImageUrl: '',
        logoWidth: 160,
        links: [
            { text: {
                        es: "MANIFESTO",
                        en: "MANIFESTO"
                    }, href: '#features' },
            { text: {
                        es: "PROGRAMS",
                        en: "PROGRAMS"
                    }, href: '#services' },
            { text: {
                        es: "TEAM",
                        en: "TEAM"
                    }, href: '#team' },
            { text: {
                        es: "PLANS",
                        en: "PLANS"
                    }, href: '#pricing' },
        ] as NavLink[],
        hoverStyle: 'simple',
        ctaText: {
                es: "ACCESS PORTAL",
                en: "ACCESS PORTAL"
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
        buttonBorderRadius: 'none',
        linkFontSize: 12,
    },
    hero: {
        heroVariant: 'fitness',
        paddingY: 'xl',
        paddingX: 'lg',
        headline: {
                es: "RECONSTRUCT <span class=\"text-transparent bg-clip-text\" style=\"-webkit-text-fill-color: transparent; background-image: linear-gradient(135deg, #f2330d, #ff6644)\">YOURSELF</span>",
                en: "RECONSTRUCT <span class=\"text-transparent bg-clip-text\" style=\"-webkit-text-fill-color: transparent; background-image: linear-gradient(135deg, #f2330d, #ff6644)\">YOURSELF</span>"
            },
        subheadline: {
                es: "We don't build bodies. We engineer machines. Raw iron. Zero compromise. Every rep is a declaration of war against mediocrity.",
                en: "We don't build bodies. We engineer machines. Raw iron. Zero compromise. Every rep is a declaration of war against mediocrity."
            },
        primaryCta: {
                es: "BEGIN PROTOCOL",
                en: "BEGIN PROTOCOL"
            },
        secondaryCta: {
                es: "VIEW PROGRAMS",
                en: "VIEW PROGRAMS"
            },
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=2670',
        imageStyle: 'default',
        imageDropShadow: false,
        imageBorderRadius: 'none',
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
        secondaryButtonStyle: 'solid',
        secondaryButtonOpacity: 100,
        showBadge: true,
        badgeText: {
                es: "⚡ NO EXCUSES",
                en: "⚡ NO EXCUSES"
            },
        badgeIcon: 'zap',
        badgeColor: COLORS.accent,
        badgeBackgroundColor: `${COLORS.accent}15`,
        buttonBorderRadius: 'none',
        animationType: 'fade-in-up',
        primaryCtaLink: '#pricing',
        primaryCtaLinkType: 'section',
        secondaryCtaLink: '#services',
        secondaryCtaLinkType: 'section',
        headlineFontSize: 'xl',
        subheadlineFontSize: 'md',
    },
    heroSplit: {
        headline: {
                es: "RECONSTRUCT YOURSELF",
                en: "RECONSTRUCT YOURSELF"
            },
        subheadline: {
                es: "Raw iron. Zero compromise.",
                en: "Raw iron. Zero compromise."
            },
        buttonText: {
                es: "BEGIN PROTOCOL",
                en: "BEGIN PROTOCOL"
            },
        buttonUrl: '#pricing',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=2670',
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
        buttonBorderRadius: 'none',
    },
    features: {
        featuresVariant: 'bento-premium',
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "THE MANIFESTO",
                en: "THE MANIFESTO"
            },
        description: {
                es: "This isn't a fitness center. This is a reconstruction facility. We believe in the relentless pursuit of physical excellence through discipline, science, and raw determination.",
                en: "This isn't a fitness center. This is a reconstruction facility. We believe in the relentless pursuit of physical excellence through discipline, science, and raw determination."
            },
        items: [
            {
                title: {
                        es: "RAW DISCIPLINE",
                        en: "RAW DISCIPLINE"
                    },
                description: {
                        es: "Every session is engineered for maximum output. No distractions. No shortcuts. Only controlled aggression toward your goals.",
                        en: "Every session is engineered for maximum output. No distractions. No shortcuts. Only controlled aggression toward your goals."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&q=80&w=2670',
            },
            {
                title: {
                        es: "SCIENTIFIC APPROACH",
                        en: "SCIENTIFIC APPROACH"
                    },
                description: {
                        es: "Periodized programming backed by sports science. Every variable—volume, intensity, frequency—optimized for your transformation.",
                        en: "Periodized programming backed by sports science. Every variable—volume, intensity, frequency—optimized for your transformation."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=2670',
            },
            {
                title: {
                        es: "ZERO COMPROMISE",
                        en: "ZERO COMPROMISE"
                    },
                description: {
                        es: "We don't do half measures. Premium equipment, elite coaching, and an environment engineered for intensity.",
                        en: "We don't do half measures. Premium equipment, elite coaching, and an environment engineered for intensity."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=2670',
            },
        ],
        gridColumns: 3,
        imageHeight: 200,
        imageObjectFit: 'cover',
        animationType: 'fade-in-up',
        enableCardAnimation: true,
        borderRadius: 'none',
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
                es: "RESULTS SPEAK",
                en: "RESULTS SPEAK"
            },
        description: {
                es: "Real athletes. Real transformations. No filters.",
                en: "Real athletes. Real transformations. No filters."
            },
        titleFontSize: 'md',
        descriptionFontSize: 'md',
        borderRadius: 'none',
        cardShadow: 'lg',
        borderStyle: 'solid',
        cardPadding: 32,
        animationType: 'fade-in-up',
        enableCardAnimation: true,
        items: [
            {
                quote: {
                        es: "\"I came in as a beginner. 6 months later I deadlifted 200kg. The programming here is surgical.\"",
                        en: "\"I came in as a beginner. 6 months later I deadlifted 200kg. The programming here is surgical.\""
                    },
                name: {
                        es: "Marcus Kaine",
                        en: "Marcus Kaine"
                    },
                title: {
                        es: "Powerlifter, 2 years",
                        en: "Powerlifter, 2 years"
                    },
            },
            {
                quote: {
                        es: "\"No BS, no gimmicks. Just pure training science and an environment that pushes you beyond limits.\"",
                        en: "\"No BS, no gimmicks. Just pure training science and an environment that pushes you beyond limits.\""
                    },
                name: {
                        es: "Sarah Voss",
                        en: "Sarah Voss"
                    },
                title: {
                        es: "CrossFit Competitor",
                        en: "CrossFit Competitor"
                    },
            },
            {
                quote: {
                        es: "\"The coaches don't let you settle. Every session is calculated progression. This place changed my life.\"",
                        en: "\"The coaches don't let you settle. Every session is calculated progression. This place changed my life.\""
                    },
                name: {
                        es: "Dmitri Volkov",
                        en: "Dmitri Volkov"
                    },
                title: {
                        es: "Bodybuilder, 3 years",
                        en: "Bodybuilder, 3 years"
                    },
            },
        ],
        colors: {
            background: `rgba(26, 26, 26, 0.5)`,
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
                es: "THE FACILITY",
                en: "THE FACILITY"
            },
        showTitle: true,
        fullWidth: true,
        paddingY: 'lg',
        paddingX: 'none',
        titleFontSize: 'md',
        borderRadius: 'none',
        autoPlaySpeed: 4000,
        transitionEffect: 'slide',
        transitionDuration: 500,
        showArrows: true,
        showDots: true,
        arrowStyle: 'rounded',
        dotStyle: 'circle',
        kenBurnsIntensity: 'medium',
        thumbnailSize: 80,
        showCaptions: false,
        slideHeight: 500,
        items: [
            { imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=2670', altText: 'Main Training Floor', caption: 'Main Training Floor' },
            { imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=2670', altText: 'Free Weights Area', caption: 'Free Weights Area' },
            { imageUrl: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&q=80&w=2670', altText: 'Conditioning Zone', caption: 'Conditioning Zone' },
        ],
        colors: {
            background: COLORS.bg,
            heading: COLORS.heading,
            arrowBackground: 'rgba(0, 0, 0, 0.7)',
            arrowText: COLORS.heading,
            dotActive: COLORS.accent,
            dotInactive: 'rgba(255, 255, 255, 0.3)',
            captionBackground: 'rgba(0, 0, 0, 0.8)',
            captionText: COLORS.heading,
        },
    },
    pricing: {
        pricingVariant: 'gradient',
        title: {
                es: "MEMBERSHIP PLANS",
                en: "MEMBERSHIP PLANS"
            },
        description: {
                es: "Select your protocol. All memberships include facility access, locker rooms, and basic programming.",
                en: "Select your protocol. All memberships include facility access, locker rooms, and basic programming."
            },
        paddingY: 'lg',
        paddingX: 'md',
        titleFontSize: 'md',
        descriptionFontSize: 'md',
        cardBorderRadius: 'none',
        tiers: [
            {
                name: {
                        es: "BASIC ACCESS",
                        en: "BASIC ACCESS"
                    },
                price: {
                        es: "$49",
                        en: "$49"
                    },
                frequency: '/mo',
                description: {
                        es: "Open gym access during standard hours.",
                        en: "Open gym access during standard hours."
                    },
                features: [
                    'Full facility access (6AM-10PM)',
                    'Locker room & showers',
                    'Basic equipment orientation',
                    'Community Discord access',
                ],
                buttonText: {
                        es: "SELECT PLAN",
                        en: "SELECT PLAN"
                    },
                buttonLink: '#leads',
                featured: false,
            },
            {
                name: {
                        es: "FULL PROTOCOL",
                        en: "FULL PROTOCOL"
                    },
                price: {
                        es: "$99",
                        en: "$99"
                    },
                frequency: '/mo',
                description: {
                        es: "Complete training system with coaching.",
                        en: "Complete training system with coaching."
                    },
                features: [
                    '24/7 unlimited access',
                    'Personalized programming',
                    'Monthly progress assessment',
                    'Nutrition guidelines',
                    'Group training sessions',
                ],
                buttonText: {
                        es: "SELECT PLAN",
                        en: "SELECT PLAN"
                    },
                buttonLink: '#leads',
                featured: true,
            },
            {
                name: {
                        es: "ELITE",
                        en: "ELITE"
                    },
                price: {
                        es: "$199",
                        en: "$199"
                    },
                frequency: '/mo',
                description: {
                        es: "Premium 1-on-1 coaching experience.",
                        en: "Premium 1-on-1 coaching experience."
                    },
                features: [
                    'Everything in Full Protocol',
                    '1-on-1 personal coaching (3x/week)',
                    'Custom nutrition plan',
                    'Recovery & mobility sessions',
                    'Competition preparation',
                    'Priority scheduling',
                ],
                buttonText: {
                        es: "SELECT PLAN",
                        en: "SELECT PLAN"
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
            buttonText: COLORS.white,
            checkmarkColor: COLORS.accent,
            cardBackground: COLORS.surface,
            gradientStart: COLORS.accent,
            gradientEnd: '#ff6644',
        },
        animationType: 'fade-in-up',
        enableCardAnimation: true,
    },
    faq: {
        title: {
                es: "FREQUENTLY ASKED",
                en: "FREQUENTLY ASKED"
            },
        description: {
                es: "Everything you need to know before stepping through our doors.",
                en: "Everything you need to know before stepping through our doors."
            },
        paddingY: 'lg',
        paddingX: 'md',
        items: [
            {
                question: 'Do I need prior training experience?',
                answer: 'No. We welcome all levels. Our coaches will assess your current fitness and design a program specifically for your starting point. What we do require is commitment and consistency.',
            },
            {
                question: 'What are your operating hours?',
                answer: 'Basic Access members: 6AM-10PM daily. Full Protocol and Elite members enjoy 24/7 unrestricted access with key fob entry.',
            },
            {
                question: 'Can I freeze my membership?',
                answer: 'Yes. Memberships can be frozen for up to 30 days per year for medical reasons or travel. Contact our team to arrange.',
            },
            {
                question: 'What equipment do you have?',
                answer: 'Competition-grade power racks, calibrated plates, specialty bars, cable stations, cardio equipment, rowing machines, assault bikes, sleds, and a dedicated stretching zone.',
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
                es: "START YOUR PROTOCOL",
                en: "START YOUR PROTOCOL"
            },
        description: {
                es: "Fill out the form. We'll contact you within 24 hours to schedule your free assessment session.",
                en: "Complete the form. We will contact you within 24 hours to schedule your free assessment session."
            },
        namePlaceholder: 'Full Name',
        emailPlaceholder: 'your@email.com',
        companyPlaceholder: 'Current Training Experience',
        messagePlaceholder: 'Tell us about your goals...',
        buttonText: {
                es: "SUBMIT APPLICATION",
                en: "SUBMIT APPLICATION"
            },
        paddingY: 'lg',
        paddingX: 'md',
        cardBorderRadius: 'none',
        buttonBorderRadius: 'none',
        titleFontSize: 'md',
        descriptionFontSize: 'md',
        colors: {
            background: COLORS.bgAlt,
            accent: COLORS.accent,
            borderColor: COLORS.border,
            text: COLORS.text,
            heading: COLORS.heading,
            buttonBackground: COLORS.accent,
            buttonText: COLORS.white,
            cardBackground: COLORS.surface,
            inputBackground: COLORS.bg,
            inputText: COLORS.heading,
            inputBorder: COLORS.border,
            gradientStart: COLORS.accent,
            gradientEnd: '#ff6644',
        },
    },
    newsletter: {
        title: {
                es: "DAILY DIRECTIVES",
                en: "DAILY DIRECTIVES"
            },
        description: {
                es: "Subscribe for training tips, programming updates, and members-only content. No spam. Only signal.",
                en: "Subscribe for training tips, programming updates, and members-only content. No spam. Only signal."
            },
        placeholderText: 'Enter your email',
        buttonText: {
                es: "SUBSCRIBE",
                en: "SUBSCRIBE"
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
            buttonText: COLORS.white,
            cardBackground: `${COLORS.accent}20`,
            inputBackground: COLORS.bg,
            inputText: COLORS.heading,
            inputBorder: COLORS.border,
        },
    },
    cta: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "READY TO TRANSFORM?",
                en: "READY TO TRANSFORM?"
            },
        description: {
                es: "Stop thinking. Start lifting. Your first session is on us.",
                en: "Stop thinking. Start lifting. Your first session is free."
            },
        buttonText: {
                es: "CLAIM FREE SESSION",
                en: "CLAIM FREE SESSION"
            },
        titleFontSize: 'lg',
        descriptionFontSize: 'md',
        colors: {
            background: COLORS.bg,
            gradientStart: COLORS.accent,
            gradientEnd: '#ff6644',
            text: COLORS.text,
            heading: COLORS.heading,
            buttonBackground: COLORS.white,
            buttonText: COLORS.accent,
        },
    },
    portfolio: {
        paddingY: 'lg',
        paddingX: 'md',
        title: {
                es: "TRANSFORMATIONS",
                en: "TRANSFORMATIONS"
            },
        description: {
                es: "Real results from our members.",
                en: "Real results from our members."
            },
        items: [
            {
                title: {
                        es: "Marcus K. — Powerlifting",
                        en: "Marcus K. — Powerlifting"
                    },
                description: {
                        es: "From 80kg squat to 180kg in 12 months of structured programming.",
                        en: "From 80kg squat to 180kg in 12 months with structured programming."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=2670',
            },
            {
                title: {
                        es: "Sarah V. — Competition Prep",
                        en: "Sarah V. — Competition Prep"
                    },
                description: {
                        es: "First place at regional CrossFit qualifier after 8 months of coaching.",
                        en: "First place at regional CrossFit qualifier after 8 months of coaching."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1550345332-09e3ac987658?auto=format&fit=crop&q=80&w=2670',
            },
            {
                title: {
                        es: "Dmitri V. — Bodybuilding",
                        en: "Dmitri V. — Bodybuilding"
                    },
                description: {
                        es: "Complete body recomposition: -15kg fat, +8kg lean mass in 18 months.",
                        en: "Complete body recomposition: -15kg fat, +8kg lean mass in 18 months."
                    },
                imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=2670',
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
                es: "TRAINING PROTOCOLS",
                en: "TRAINING PROTOCOLS"
            },
        description: {
                es: "Scientifically structured programs designed for specific outcomes. Choose your path.",
                en: "Scientifically structured programs designed for specific outcomes. Choose your path."
            },
        items: [
            {
                icon: 'dumbbell',
                title: {
                        es: "HYPERTROPHY PROTOCOL",
                        en: "HYPERTROPHY PROTOCOL"
                    },
                description: {
                        es: "Volume-based progressive overload programming. Focused on muscle growth through mechanical tension, metabolic stress, and controlled progressive resistance.",
                        en: "Volume-based progressive overload programming. Focused on muscle growth through mechanical tension, metabolic stress, and controlled progressive resistance."
                    },
            },
            {
                icon: 'trophy',
                title: {
                        es: "POWERLIFTING PROGRAM",
                        en: "POWERLIFTING PROGRAM"
                    },
                description: {
                        es: "Periodized strength programming centered on the squat, bench press, and deadlift. Peaking cycles for competition or personal records.",
                        en: "Periodized strength programming centered on the squat, bench press, and deadlift. Peaking cycles for competition or personal records."
                    },
            },
            {
                icon: 'flame',
                title: {
                        es: "METABOLIC CONDITIONING",
                        en: "METABOLIC CONDITIONING"
                    },
                description: {
                        es: "High-intensity interval training combined with functional movements. Designed to maximize cardiovascular capacity and fat oxidation.",
                        en: "High-intensity interval training combined with functional movements. Designed to maximize cardiovascular capacity and fat oxidation."
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
                es: "THE INSTRUCTORS",
                en: "THE INSTRUCTORS"
            },
        description: {
                es: "Certified professionals with competition experience and a passion for results.",
                en: "Certified professionals with competition experience and a passion for results."
            },
        items: [
            {
                name: {
                        es: "Viktor Hale",
                        en: "Viktor Hale"
                    },
                role: {
                        es: "Head Coach — Powerlifting",
                        en: "Head Coach — Powerlifting"
                    },
                imageUrl: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&q=80&w=2670',
            },
            {
                name: {
                        es: "Elena Cross",
                        en: "Elena Cross"
                    },
                role: {
                        es: "Strength & Conditioning",
                        en: "Strength & Conditioning"
                    },
                imageUrl: 'https://images.unsplash.com/photo-1609899464726-209befb42482?auto=format&fit=crop&q=80&w=2670',
            },
            {
                name: {
                        es: "Kai Nomura",
                        en: "Kai Nomura"
                    },
                role: {
                        es: "Hypertrophy Specialist",
                        en: "Hypertrophy Specialist"
                    },
                imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&q=80&w=2670',
            },
            {
                name: {
                        es: "Aria Stone",
                        en: "Aria Stone"
                    },
                role: {
                        es: "Metabolic Conditioning",
                        en: "Metabolic Conditioning"
                    },
                imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=2670',
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
                es: "INSIDE THE TEMPLE",
                en: "INSIDE THE TEMPLE"
            },
        description: {
                es: "See what a typical training session looks like.",
                en: "See what a typical training session looks like."
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
                es: "YOUR JOURNEY",
                en: "YOUR JOURNEY"
            },
        description: {
                es: "From first contact to full transformation.",
                en: "From first contact to full transformation."
            },
        steps: 4,
        items: [
            { icon: 'upload', title: {
                        es: "APPLY",
                        en: "APPLY"
                    }, description: {
                        es: "Submit your application and tell us about your goals.",
                        en: "Submit your application and tell us about your goals."
                    } },
            { icon: 'process', title: {
                        es: "ASSESS",
                        en: "ASSESS"
                    }, description: {
                        es: "Free 1-on-1 assessment to evaluate your current level.",
                        en: "Free 1-on-1 assessment to evaluate your current level."
                    } },
            { icon: 'download', title: {
                        es: "PROGRAM",
                        en: "PROGRAM"
                    }, description: {
                        es: "Receive your personalized training protocol.",
                        en: "Receive your personalized training protocol."
                    } },
            { icon: 'share', title: {
                        es: "EXECUTE",
                        en: "EXECUTE"
                    }, description: {
                        es: "Train with purpose. Track progress. Evolve.",
                        en: "Train with purpose. Track progress. Evolve."
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
        welcomeMessage: 'Welcome to Iron Temple. How can we help you with your training goals?',
        placeholderText: 'Ask about programs, pricing, schedules...',
        knowledgeBase: 'Iron Temple is a brutalist-style gym focused on powerlifting, hypertrophy, and metabolic conditioning. We offer Basic ($49/mo), Full Protocol ($99/mo), and Elite ($199/mo) membership tiers.',
        position: 'bottom-right',
        colors: {
            primary: COLORS.accent,
            text: COLORS.white,
            background: COLORS.bg,
        },
    },
    map: {
        title: {
                es: "COORDINATES",
                en: "COORDINATES"
            },
        description: {
                es: "Iron Temple Headquarters. Street parking available. 24/7 access for Full Protocol and Elite members.",
                en: "Iron Temple Headquarters. Street parking available. 24/7 access for Full Protocol and Elite members."
            },
        address: {
                es: "742 Industrial Blvd, Downtown, NY 10001",
                en: "742 Industrial Blvd, Downtown, NY 10001"
            },
        lat: 40.7484,
        lng: -73.9967,
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
            cardBackground: COLORS.surface,
        },
        titleFontSize: 'md',
        descriptionFontSize: 'md',
        borderRadius: 'none',
    },
    menu: {
        menuVariant: 'classic',
        title: {
                es: "SUPPLEMENTS",
                en: "SUPPLEMENTS"
            },
        description: {
                es: "Available at the front desk.",
                en: "Available at the front desk."
            },
        paddingY: 'lg',
        paddingX: 'md',
        items: [
            {
                name: {
                        es: "Pre-Workout Blend",
                        en: "Pre-Workout Blend"
                    },
                description: {
                        es: "High-stimulant formula for maximum training intensity.",
                        en: "High-stimulant formula for maximum training intensity."
                    },
                price: {
                        es: "$3.50",
                        en: "$3.50"
                    },
                imageUrl: '',
                category: {
                        es: "Performance",
                        en: "Performance"
                    },
                isSpecial: true,
            },
            {
                name: {
                        es: "Whey Protein Shake",
                        en: "Whey Protein Shake"
                    },
                description: {
                        es: "30g protein. Post-workout recovery.",
                        en: "30g protein. Post-workout recovery."
                    },
                price: {
                        es: "$5.00",
                        en: "$5.00"
                    },
                imageUrl: '',
                category: {
                        es: "Recovery",
                        en: "Recovery"
                    },
                isSpecial: false,
            },
            {
                name: {
                        es: "BCAA Hydration",
                        en: "BCAA Hydration"
                    },
                description: {
                        es: "Intra-workout amino acid formula.",
                        en: "Intra-workout amino acid formula."
                    },
                price: {
                        es: "$3.00",
                        en: "$3.00"
                    },
                imageUrl: '',
                category: {
                        es: "Performance",
                        en: "Performance"
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
        borderRadius: 'none',
        showCategories: true,
        animationType: 'fade-in-up',
        enableCardAnimation: true,
    },
    footer: {
        title: {
                es: "IRON TEMPLE",
                en: "IRON TEMPLE"
            },
        description: {
                es: "We don't build bodies. We engineer machines.",
                en: "We don't build bodies. We engineer machines."
            },
        linkColumns: [
            {
                title: {
                        es: "SITEMAP",
                        en: "SITEMAP"
                    },
                links: [
                    { text: {
                                es: "Manifesto",
                                en: "Manifesto"
                            }, href: '#features' },
                    { text: {
                                es: "Programs",
                                en: "Programs"
                            }, href: '#services' },
                    { text: {
                                es: "Team",
                                en: "Team"
                            }, href: '#team' },
                    { text: {
                                es: "Pricing",
                                en: "Pricing"
                            }, href: '#pricing' },
                ],
            },
            {
                title: {
                        es: "LEGAL",
                        en: "LEGAL"
                    },
                links: [
                    { text: {
                                es: "Terms of Service",
                                en: "Terms of Service"
                            }, href: '/terms-of-service' },
                    { text: {
                                es: "Privacy Policy",
                                en: "Privacy Policy"
                            }, href: '/privacy-policy' },
                    { text: {
                                es: "Waiver",
                                en: "Waiver"
                            }, href: '/terms-of-service' },
                ],
            },
            {
                title: {
                        es: "CONNECT",
                        en: "CONNECT"
                    },
                links: [
                    { text: {
                                es: "Instagram",
                                en: "Instagram"
                            }, href: 'https://instagram.com' },
                    { text: {
                                es: "YouTube",
                                en: "YouTube"
                            }, href: 'https://youtube.com' },
                    { text: {
                                es: "Discord",
                                en: "Discord"
                            }, href: 'https://discord.com' },
                ],
            },
        ],
        socialLinks: [
            { platform: 'instagram', href: 'https://instagram.com' },
            { platform: 'youtube', href: 'https://youtube.com' },
        ],
        copyrightText: '© {YEAR} IRON TEMPLE. ALL RIGHTS RESERVED. NO PAIN, NO REIGN.',
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
                es: "NEW MEMBERS: FIRST WEEK FREE",
                en: "NEW MEMBERS: FIRST WEEK FREE"
            },
        subheadline: {
                es: "No commitment. No credit card required. Just show up and work.",
                en: "No commitment. No credit card required. Just show up and work."
            },
        buttonText: {
                es: "CLAIM OFFER",
                en: "CLAIM OFFER"
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
export const gymTheme: ThemeData = {
    cardBorderRadius: 'none',
    buttonBorderRadius: 'none',
    fontFamilyHeader: 'montserrat',
    fontFamilyBody: 'inter',
    fontFamilyButton: 'montserrat',
    headingsAllCaps: true,
    buttonsAllCaps: true,
    navLinksAllCaps: true,
    pageBackground: COLORS.bg,
    globalColors: {
        primary: COLORS.accent,
        secondary: '#ff6644',
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
export const gymBrandIdentity: BrandIdentity = {
    name: {
            es: "Iron Temple",
            en: "Iron Temple"
        },
    industry: 'fitness-gym',
    targetAudience: 'Serious athletes, powerlifters, bodybuilders, and fitness enthusiasts seeking structured training programs',
    toneOfVoice: 'Professional',
    coreValues: 'Discipline, Science, Intensity, Results',
    language: 'English',
};

// =============================================================================
// COMPONENT ORDER & SECTION VISIBILITY
// =============================================================================
export const gymComponentOrder: PageSection[] = [
    // Structure
    'colors', 'typography', 'header',
    // Content sections matching the Stitch template order
    'hero', 'features', 'services', 'team', 'pricing',
    'faq', 'testimonials', 'howItWorks',
    // Engagement
    'leads', 'newsletter', 'map',
    // Extras (hidden by default)
    'heroSplit', 'banner', 'slideshow', 'portfolio', 'cta', 'video', 'menu',
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

// Sections that are visible in the template
const visibleSections: PageSection[] = [
    'colors', 'typography', 'header',
    'hero', 'features', 'services', 'team', 'pricing',
    'faq', 'leads', 'newsletter', 'map',
    'chatbot', 'footer',
];

export const gymSectionVisibility = gymComponentOrder.reduce((acc, section) => {
    (acc as any)[section] = visibleSections.includes(section);
    return acc;
}, {} as Record<PageSection, boolean>);

// =============================================================================
// FULL TEMPLATE PRESET (ready for Firestore insertion)
// =============================================================================
export const gymBrutalistPreset = {
    name: {
            es: "Dark Brutalist Gym",
            en: "Dark Brutalist Gym"
        },
    data: gymPageData,
    theme: gymTheme,
    brandIdentity: gymBrandIdentity,
    componentOrder: gymComponentOrder,
    sectionVisibility: gymSectionVisibility,
    status: 'Template' as const,
    description: {
            es: "A dark, brutalist-style gym template with bold typography, red accent (#f2330d), and angular design. Includes hero, manifesto, training programs, team, pricing, FAQ, and contact sections.",
            en: "A dark, brutalist-style gym template with bold typography, red accent (#f2330d), and angular design. Includes hero, manifesto, training programs, team, pricing, FAQ, and contact sections."
        },
    category: {
            es: "fitness",
            en: "fitness"
        },
    tags: ['gym', 'fitness', 'brutalist', 'dark', 'powerlifting', 'bodybuilding'],
    industries: ['fitness-gym'],
    thumbnailUrl: '',
};
