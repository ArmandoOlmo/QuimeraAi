
import { PageData, NavLink, ThemeData, PageSection, BrandIdentity } from '../types';

// FIX: Renamed original export to pageData and created a new initialData export structure
// that includes theme, componentOrder, and sectionVisibility to resolve type errors.
const pageData: PageData = {
  header: {
    style: 'sticky-solid',
    layout: 'minimal',
    isSticky: true,
    glassEffect: true,
    height: 80,
    logoType: 'text',
    logoText: 'Your Brand',
    logoImageUrl: '',
    logoWidth: 120,
    links: [
      { text: {
                  es: "Features",
                  en: "Features"
              }, href: '#features' },
      { text: {
                  es: "About",
                  en: "About"
              }, href: '#about' },
      { text: {
                  es: "Contact",
                  en: "Contact"
              }, href: '#contact' },
    ] as NavLink[],
    hoverStyle: 'simple',
    ctaText: {
            es: "Get Started",
            en: "Get Started"
        },
    showCta: true,
    showLogin: true,
    loginText: {
            es: "Log In",
            en: "Log In"
        },
    loginUrl: '#',
    colors: {
      background: '#4f46e5', // Solid brand color
      text: '#ffffff', // White text for contrast
      accent: '#ffffff',
    },
    buttonBorderRadius: 'xl',
    linkFontSize: 14,
  },
  hero: {
    heroVariant: 'modern',
    paddingY: 'lg',
    paddingX: 'md',
    headline: {
            es: "Transforma tu Visión en una <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600\">Experiencia Digital</span>",
            en: "Transform Your Vision into a <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600\">Digital Experience</span>"
        },
    subheadline: {
            es: "Crea, personaliza y despliega sitios web de alto impacto impulsados por Inteligencia Artificial. Sin código, sin límites.",
            en: "Create, customize, and deploy high-impact websites powered by Artificial Intelligence. No code, no limits."
        },
    primaryCta: {
            es: "Empezar Gratis",
            en: "Start Free"
        },
    secondaryCta: {
            es: "Ver Funciones",
            en: "View Features"
        },
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3",
    imageStyle: 'default',
    imageDropShadow: true,
    imageBorderRadius: 'xl',
    imageBorderSize: 'sm',
    imageBorderColor: '#ffffff',
    imageJustification: 'end',
    imagePosition: 'right',
    imageWidth: 100,
    imageHeight: 500,
    imageHeightEnabled: false,
    imageAspectRatio: 'auto',
    imageObjectFit: 'cover',
    sectionBorderSize: 'none',
    sectionBorderColor: '#334155',
    colors: {
      primary: '#4f46e5',
      secondary: '#10b981',
      background: '#0f172a', // bg-dark-900
      text: '#94a3b8', // slate-400
      heading: '#F9FAFB', // site-heading default
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
      secondaryButtonBackground: '#334155', // slate-700
      secondaryButtonText: '#ffffff',
    },
    secondaryButtonStyle: 'solid',
    secondaryButtonOpacity: 100,
    showBadge: true,
    badgeText: {
            es: "✨ Welcome",
            en: "✨ Welcome"
        },
    badgeIcon: 'sparkles',
    badgeColor: '#4f46e5',
    badgeBackgroundColor: '#4f46e515',
    buttonBorderRadius: 'xl',
    animationType: 'fade-in-up',
    primaryCtaLink: '#cta',
    primaryCtaLinkType: 'section',
    secondaryCtaLink: '#features',
    secondaryCtaLinkType: 'section',
  },
  heroSplit: {
    headline: {
              es: "Transform Your Vision",
              en: "Transform Your Vision"
          },
    subheadline: {
              es: "Experience the perfect blend of innovation and design. Our solutions help you stand out in a competitive market.",
              en: "Experience the perfect blend of innovation and design. Our solutions help you stand out in a competitive market."
          },
    buttonText: {
            es: "Get Started",
            en: "Get Started"
        },
    buttonUrl: "#cta",
    imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%23111827' width='800' height='600'/%3E%3Ctext fill='%236B7280' font-family='system-ui,sans-serif' font-size='32' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E800 × 600%3C/text%3E%3C/svg%3E",
    imagePosition: 'right',
    maxHeight: 500,
    angleIntensity: 15,
    colors: {
      textBackground: '#ffffff',
      imageBackground: '#000000',
      heading: '#111827',
      text: '#4b5563',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
    },
    headlineFontSize: 'lg',
    subheadlineFontSize: 'md',
    buttonBorderRadius: 'xl',
  },
  heroGallery: {
    slides: [
      {
        headline: {
                  es: "Curated Collection for Modern Living",
                  en: "Curated Collection for Modern Living"
              },
        subheadline: {
                  es: "In Store and Online",
                  en: "In Store and Online"
              },
        primaryCta: {
                es: "SHOP COLLECTION",
                en: "SHOP COLLECTION"
            },
        primaryCtaLink: '/#products',
        secondaryCta: {
                es: "MORE DETAILS",
                en: "MORE DETAILS"
            },
        secondaryCtaLink: '/#features',
        backgroundImage: '',
        backgroundColor: '#8B6F5C',
      },
    ],
    autoPlaySpeed: 6000,
    transitionDuration: 800,
    showArrows: true,
    showDots: true,
    dotStyle: 'circle',
    heroHeight: 80,
    headlineFontSize: 'lg',
    subheadlineFontSize: 'md',
    showGrain: true,
    overlayOpacity: 0.35,
    colors: {
      background: '#8B6F5C',
      text: '#ffffff',
      heading: '#ffffff',
      ctaText: '#ffffff',
      dotActive: '#ffffff',
      dotInactive: 'rgba(255,255,255,0.5)',
      arrowColor: '#ffffff',
    },
    buttonBorderRadius: 'none',
  },
  heroWave: {
    slides: [
      {
        headline: {
                  es: "Something Bold & Beautiful",
                  en: "Something Bold & Beautiful"
              },
        subheadline: {
                  es: "Your next big thing starts here",
                  en: "Your next big thing starts here"
              },
        primaryCta: {
                es: "GET STARTED",
                en: "GET STARTED"
            },
        primaryCtaLink: '/#cta',
        secondaryCta: {
                es: "LEARN MORE",
                en: "LEARN MORE"
            },
        secondaryCtaLink: '/#features',
        backgroundImage: '',
        backgroundColor: '#ff006e',
      },
    ],
    autoPlaySpeed: 6000,
    transitionDuration: 800,
    showArrows: true,
    showDots: true,
    dotStyle: 'circle',
    heroHeight: 75,
    headlineFontSize: 'xl',
    subheadlineFontSize: 'md',
    showGrain: false,
    overlayOpacity: 0.15,
    gradientAngle: 135,
    waveShape: 'bubbly',
    waveColor: '#ffffff',
    textAlign: 'center',
    gradientColors: ['#ff006e', '#fb5607', '#ffbe0b', '#38b000', '#00b4d8'],
    showTextStroke: false,
    colors: {
      background: '#ff006e',
      text: '#ffffff',
      heading: '#ffffff',
      ctaText: '#ffffff',
      dotActive: '#ffffff',
      dotInactive: 'rgba(255,255,255,0.5)',
      arrowColor: '#ffffff',
    },
    buttonBorderRadius: 'full',
  },
  heroNova: {
    slides: [
      {
        headline: {
                  es: "Comfort, Style, Durability: Our Seating Collection",
                  en: "Comfort, Style, Durability: Our Seating Collection"
              },
        subheadline: '',
        primaryCta: {
                es: "SHOP SEATING",
                en: "SHOP SEATING"
            },
        primaryCtaLink: '/#products',
        mediaType: 'image',
        backgroundImage: '',
        backgroundVideo: '',
        backgroundColor: '#1a1a1a',
      },
    ],
    displayText: 'NOVA',
    showDisplayText: true,
    autoPlaySpeed: 6000,
    transitionDuration: 700,
    showArrows: true,
    showDots: true,
    dotStyle: 'circle',
    heroHeight: 90,
    headlineFontSize: 'lg',
    overlayOpacity: 0.35,
    displayLetterSpacing: 0.35,
    colors: {
      background: '#1a1a1a',
      text: '#ffffff',
      heading: '#ffffff',
      displayText: 'rgba(255,255,255,0.85)',
      ctaText: '#1a1a1a',
      ctaBackground: '#ffffff',
      dotActive: '#ffffff',
      dotInactive: 'rgba(255,255,255,0.4)',
      arrowColor: '#ffffff',
    },
    buttonBorderRadius: 'full',
  },
  heroLead: {
    headline: {
              es: "Transform Your Business Today",
              en: "Transform Your Business Today"
          },
    subheadline: {
              es: "Get started with our premium services and take your company to the next level.",
              en: "Get started with our premium services and take your company to the next level."
          },
    badgeText: {
            es: "Limited Offer",
            en: "Limited Offer"
        },
    formTitle: 'Request a Consultation',
    formDescription: 'Fill out the form below and our team will get back to you within 24 hours.',
    namePlaceholder: 'Your Name',
    emailPlaceholder: 'your@email.com',
    companyPlaceholder: 'Your Company',
    phonePlaceholder: 'Your Phone',
    messagePlaceholder: 'How can we help you?',
    buttonText: {
            es: "Submit Request",
            en: "Submit Request"
        },
    successMessage: 'Thank you! We will be in touch shortly.',
    showCompanyField: true,
    showPhoneField: false,
    showMessageField: false,
    formPosition: 'right',
    paddingY: 'lg',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2670&ixlib=rb-4.0.3',
    overlayOpacity: 40,
    glassEffect: true,
    borderRadius: 'xl',
    colors: {
      background: '#0f172a',
      infoBackground: 'transparent',
      text: '#e2e8f0',
      heading: '#ffffff',
      accent: '#4f46e5',
      badgeBackground: '#4f46e5',
      badgeText: '#ffffff',
      formBackground: '#1e293b',
      formHeading: '#f8fafc',
      formText: '#94a3b8',
      borderColor: '#334155',
      inputBackground: '#0f172a',
      inputText: '#f8fafc',
      inputBorder: '#334155',
      inputPlaceholder: '#6b7280',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
    },
  },
  heroLumina: {
    headline: {
              es: "Welcome to Lumina",
              en: "Welcome to Lumina"
          },
    subheadline: {
              es: "Experience the next generation of web design.",
              en: "Experience the next generation of web design."
          },
    primaryCta: {
            es: "Get Started",
            en: "Get Started"
        },
    primaryCtaLink: '#',
    secondaryCta: {
            es: "Learn More",
            en: "Learn More"
        },
    secondaryCtaLink: '#',
  },
  heroNeon: {
    glassEffect: true,
    textPosition: 'bottom-left',
    slides: [
      {
        headline: {
                  es: "INNOVATION MEETS DESIGN",
                  en: "INNOVATION MEETS DESIGN"
              },
        subheadline: {
                  es: "Experience the next generation of web interfaces.",
                  en: "Experience the next generation of web interfaces."
              },
        primaryCta: {
                es: "Explore Now",
                en: "Explore Now"
            },
        secondaryCta: {
                es: "Learn More",
                en: "Learn More"
            },
        primaryCtaLink: '#',
        primaryCtaLinkType: 'section',
        secondaryCtaLink: '#',
        secondaryCtaLinkType: 'section',
        imageUrl: '',
      }
    ],
    // Legacy support fields
    headline: {
            es: "INNOVATION MEETS DESIGN",
            en: "INNOVATION MEETS DESIGN"
        },
    subheadline: {
            es: "Experience the next generation of web interfaces.",
            en: "Experience the next generation of web interfaces."
        },
    primaryCta: {
            es: "Explore Now",
            en: "Explore Now"
        },
    secondaryCta: {
            es: "Learn More",
            en: "Learn More"
        },
    primaryCtaLink: '#',
    secondaryCtaLink: '#',
    headlineFont: 'inter',
    subheadlineFont: 'inter',
    showTopDots: true,
    dotColors: ['#FF5F56', '#FFBD2E', '#27C93F', '#4A90E2', '#E14EAA', '#F8E71C'],
    showNeonLines: true,
    neonLineStyle: 'stacked',
    neonLinePosition: 'top-right',
    neonLineColors: ['#FF5F56', '#FFBD2E', '#27C93F', '#4A90E2'],
    cardBorderRadius: '3xl',
    glowIntensity: 50,
    colors: {
        background: '#0a0a0a',
        text: '#ffffff',
        heading: '#ffffff',
        neonGlow: '#FBB92B',
        cardBackground: 'rgba(20, 20, 20, 0.8)',
        buttonBackground: '#FBB92B',
        buttonText: '#000000',
    },
    buttonBorderRadius: 'full',
  },
  testimonialsNeon: {
    headline: {
              es: "LO QUE DICEN",
              en: "WHAT THEY SAY"
          },
    subheadline: {
              es: "Opiniones de clientes que confían en nosotros.",
              en: "Testimonials from clients who trust us."
          },
    testimonials: [
        {
            quote: {
                    es: "El mejor servicio que hemos contratado. El diseño es increíble.",
                    en: "The best service we have ever hired. The design is incredible."
                },
            authorName: 'Ana García',
            authorRole: 'Directora Creativa',
        },
        {
            quote: {
                    es: "La atención al detalle es excepcional. Muy recomendados.",
                    en: "The attention to detail is exceptional. Highly recommended."
                },
            authorName: 'Carlos Ruiz',
            authorRole: 'CEO de TechGroup',
        }
    ],
    glassEffect: true,
    glowIntensity: 50,
    cardBorderRadius: '3xl',
    colors: {
        background: '#0a0a0a',
        heading: '#ffffff',
        text: '#a0a0a0',
        neonGlow: '#FBB92B',
        cardBackground: 'rgba(20, 20, 20, 0.8)',
        cardText: '#ffffff',
    }
  },

  featuresNeon: {
    headline: {
              es: "CARACTERÍSTICAS",
              en: "FEATURES"
          },
    subheadline: {
              es: "Innovación y diseño en cada detalle",
              en: "Innovation and design in every detail"
          },
    features: [
        { title: {
                    es: "Velocidad",
                    en: "Speed"
                }, description: {
                    es: "Rendimiento optimizado para la mejor experiencia.",
                    en: "Optimized performance for the best experience."
                }, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 9.81h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14.19H4z"/></svg>' },
        { title: {
                    es: "Seguridad",
                    en: "Security"
                }, description: {
                    es: "Protección avanzada de datos.",
                    en: "Advanced data protection."
                }, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/></svg>' },
        { title: {
                    es: "Alcance Global",
                    en: "Global Reach"
                }, description: {
                    es: "Preparado para escalar internacionalmente.",
                    en: "Engineered for global scalability."
                }, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>' }
    ],
    glassEffect: true,
    glowIntensity: 50,
    cardBorderRadius: '3xl',
    colors: {
        background: '#0a0a0a',
        heading: '#ffffff',
        text: '#a0a0a0',
        neonGlow: '#FBB92B',
        cardBackground: 'rgba(20, 20, 20, 0.8)',
        cardText: '#ffffff',
    }
  },

  ctaNeon: {
    headline: {
              es: "¿LISTO PARA COMENZAR?",
              en: "READY TO START?"
          },
    subheadline: {
              es: "Únete a nuestra plataforma y transforma tu negocio hoy mismo.",
              en: "Join our platform and transform your business today."
          },
    buttonText: {
            es: "Empezar Ahora",
            en: "Get Started Now"
        },
    glassEffect: true,
    glowIntensity: 50,
    cardBorderRadius: '3xl',
    colors: {
        background: '#0a0a0a',
        heading: '#ffffff',
        text: '#a0a0a0',
        neonGlow: '#FBB92B',
        cardBackground: 'rgba(20, 20, 20, 0.8)',
        buttonBackground: '#FBB92B',
        buttonText: '#000000',
    }
  },

  portfolioNeon: {
    headline: {
              es: "NUESTRO TRABAJO",
              en: "OUR WORK"
          },
    subheadline: {
              es: "Proyectos recientes que destacan por su innovación.",
              en: "Recent projects showcasing our innovation."
          },
    projects: [
        {
            title: {
                    es: "Proyecto Alpha",
                    en: "Project Alpha"
                },
            category: {
                    es: "Diseño Web",
                    en: "Web Design"
                },
            imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop'
        },
        {
            title: {
                    es: "Proyecto Beta",
                    en: "Project Beta"
                },
            category: {
                    es: "Desarrollo App",
                    en: "App Development"
                },
            imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop'
        }
    ],
    glassEffect: true,
    glowIntensity: 50,
    cardBorderRadius: '3xl',
    colors: {
        background: '#0a0a0a',
        heading: '#ffffff',
        text: '#a0a0a0',
        neonGlow: '#FBB92B',
        cardBackground: 'rgba(20, 20, 20, 0.8)',
        cardText: '#ffffff',
    }
  },

  pricingNeon: {
    headline: {
              es: "PLANES Y PRECIOS",
              en: "PLANS AND PRICING"
          },
    subheadline: {
              es: "Opciones flexibles para cada necesidad.",
              en: "Flexible options for every need."
          },
    tiers: [
        {
            planName: 'Básico',
            price: {
                    es: "$29",
                    en: "$29"
                },
            frequency: '/mes',
            features: ['Soporte estándar', '1 Proyecto', 'Actualizaciones'],
            buttonText: {
                    es: "Elegir Básico",
                    en: "Choose Basic"
                }
        },
        {
            planName: 'Pro',
            price: {
                    es: "$99",
                    en: "$99"
                },
            frequency: '/mes',
            features: ['Soporte 24/7', 'Proyectos ilimitados', 'Analíticas avanzadas'],
            buttonText: {
                    es: "Elegir Pro",
                    en: "Choose Pro"
                },
            isFeatured: true
        }
    ],
    glassEffect: true,
    glowIntensity: 50,
    cardBorderRadius: '3xl',
    colors: {
        background: '#0a0a0a',
        heading: '#ffffff',
        text: '#a0a0a0',
        neonGlow: '#FBB92B',
        cardBackground: 'rgba(20, 20, 20, 0.8)',
        cardText: '#ffffff',
        priceColor: '#ffffff',
        featuredAccent: '#FBB92B'
    }
  },

  faqNeon: {
    headline: {
              es: "PREGUNTAS FRECUENTES",
              en: "FREQUENTLY ASKED QUESTIONS"
          },
    subheadline: {
              es: "Resolvemos tus dudas principales.",
              en: "Get answers to your main questions."
          },
    questions: [
        {
            question: '¿Tienen soporte técnico?',
            answer: 'Sí, ofrecemos soporte técnico 24/7 en todos nuestros planes premium.'
        },
        {
            question: '¿Puedo cancelar en cualquier momento?',
            answer: 'Claro, no hay contratos a largo plazo. Puedes cancelar tu suscripción cuando lo desees.'
        }
    ],
    glassEffect: true,
    glowIntensity: 50,
    cardBorderRadius: '3xl',
    colors: {
        background: '#0a0a0a',
        heading: '#ffffff',
        text: '#a0a0a0',
        neonGlow: '#FBB92B',
        cardBackground: 'rgba(20, 20, 20, 0.8)',
        cardText: '#ffffff',
    }
  },  featuresLumina: {
    headline: {
              es: "Core Features",
              en: "Core Features"
          },
    subheadline: {
              es: "Everything you need to succeed",
              en: "Everything you need to succeed"
          },
    features: [
        { title: {
                    es: "Lightning Fast",
                    en: "Lightning Fast"
                }, description: {
                    es: "Optimized for performance and speed.",
                    en: "Optimized for performance and speed."
                }, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 9.81h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14.19H4z"/></svg>' },
        { title: {
                    es: "Secure Design",
                    en: "Secure Design"
                }, description: {
                    es: "Built with modern security practices.",
                    en: "Built with modern security practices."
                }, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/></svg>' },
        { title: {
                    es: "Global Scale",
                    en: "Global Scale"
                }, description: {
                    es: "Ready for users around the world.",
                    en: "Ready for users around the world."
                }, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>' }
    ]
  },
  ctaLumina: {
    headline: {
              es: "Ready to Transform Your Business?",
              en: "Ready to Transform Your Business?"
          },
    subheadline: {
              es: "Join thousands of satisfied customers who are already using our platform to grow their business and achieve their goals.",
              en: "Join thousands of satisfied customers who are already using our platform to grow their business and achieve their goals."
          },
    primaryCta: {
            es: "Get Started Now",
            en: "Get Started Now"
        },
    primaryCtaLink: '#',
    secondaryCta: {
            es: "Talk to Sales",
            en: "Talk to Sales"
        },
    secondaryCtaLink: '#',
  },
  portfolioLumina: {
    headline: {
              es: "Our Recent Work",
              en: "Our Recent Work"
          },
    subheadline: {
              es: "Explore some of the amazing projects we have delivered for our clients.",
              en: "Explore some of the amazing projects we have delivered for our clients."
          },
    projects: [
        { title: {
                    es: "Project Alpha",
                    en: "Project Alpha"
                }, category: {
                    es: "Web Development",
                    en: "Web Development"
                }, imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3' },
        { title: {
                    es: "Project Beta",
                    en: "Project Beta"
                }, category: {
                    es: "Mobile App",
                    en: "Mobile App"
                }, imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070&ixlib=rb-4.0.3' },
        { title: {
                    es: "Project Gamma",
                    en: "Project Gamma"
                }, category: {
                    es: "UI/UX Design",
                    en: "UI/UX Design"
                }, imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=2000&ixlib=rb-4.0.3' }
    ]
  },
  pricingLumina: {
    headline: {
              es: "Simple, Transparent Pricing",
              en: "Simple, Transparent Pricing"
          },
    subheadline: {
              es: "Choose the plan that best fits your needs.",
              en: "Choose the plan that best fits your needs."
          },
    billingToggle: true,
    tiers: [
        {
            name: {
                    es: "Starter",
                    en: "Starter"
                },
            price: {
                    es: "$29",
                    en: "$29"
                },
            period: '/mo',
            description: {
                    es: "Perfect for small businesses just getting started.",
                    en: "Perfect for small businesses just getting started."
                },
            features: ['Up to 5 Projects', 'Basic Analytics', '24/7 Support', 'Custom Domain'],
            buttonText: {
                    es: "Start Free Trial",
                    en: "Start Free Trial"
                },
            buttonLink: '#',
            highlighted: false
        },
        {
            name: {
                    es: "Professional",
                    en: "Professional"
                },
            price: {
                    es: "$99",
                    en: "$99"
                },
            period: '/mo',
            description: {
                    es: "Ideal for growing companies with more demands.",
                    en: "Ideal for growing companies with more demands."
                },
            features: ['Unlimited Projects', 'Advanced Analytics', 'Priority Support', 'Custom Domain', 'Team Collaboration'],
            buttonText: {
                    es: "Get Started",
                    en: "Get Started"
                },
            buttonLink: '#',
            highlighted: true
        },
        {
            name: {
                    es: "Enterprise",
                    en: "Enterprise"
                },
            price: {
                    es: "$299",
                    en: "$299"
                },
            period: '/mo',
            description: {
                    es: "For large-scale organizations requiring dedicated resources.",
                    en: "For large-scale organizations requiring dedicated resources."
                },
            features: ['Everything in Pro', 'Dedicated Account Manager', 'Custom Integration', 'SLA Guarantee', 'On-premise Options'],
            buttonText: {
                    es: "Contact Sales",
                    en: "Contact Sales"
                },
            buttonLink: '#',
            highlighted: false
        }
    ]
  },
  testimonialsLumina: {
    headline: {
              es: "What Our Clients Say",
              en: "What Our Clients Say"
          },
    subheadline: {
              es: "Don't just take our word for it. Hear from some of our satisfied customers.",
              en: "Don't just take our word for it. Hear from some of our satisfied customers."
          },
    testimonials: [
        {
            quote: {
                    es: "This platform has completely transformed how we do business. The results have been incredible and the support is top-notch.",
                    en: "This platform has completely transformed how we do business. The results have been incredible and the support is top-notch."
                },
            author: {
                    es: "Sarah Johnson",
                    en: "Sarah Johnson"
                },
            role: {
                    es: "CEO, TechCorp",
                    en: "CEO, TechCorp"
                },
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&ixlib=rb-4.0.3'
        },
        {
            quote: {
                    es: "We saw a 200% increase in productivity within the first month. I couldn't recommend this solution enough to other agencies.",
                    en: "We saw a 200% increase in productivity within the first month. I couldn't recommend this solution enough to other agencies."
                },
            author: {
                    es: "Michael Chen",
                    en: "Michael Chen"
                },
            role: {
                    es: "Director, CreateDesign",
                    en: "Director, CreateDesign"
                },
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&ixlib=rb-4.0.3'
        },
        {
            quote: {
                    es: "The ease of use and powerful features make it the best tool in our stack. It paid for itself in a matter of days.",
                    en: "The ease of use and powerful features make it the best tool in our stack. It paid for itself in a matter of days."
                },
            author: {
                    es: "Emily Davis",
                    en: "Emily Davis"
                },
            role: {
                    es: "Founder, StartupInc",
                    en: "Founder, StartupInc"
                },
            avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200&ixlib=rb-4.0.3'
        }
    ]
  },
  faqLumina: {
    headline: {
              es: "Frequently Asked Questions",
              en: "Frequently Asked Questions"
          },
    subheadline: {
              es: "Find answers to common questions about our platform and services.",
              en: "Find answers to common questions about our platform and services."
          },
    faqs: [
        { question: 'What payment methods do you accept?', answer: 'We accept all major credit cards, PayPal, and bank transfers for annual plans.' },
        { question: 'Can I cancel my subscription at any time?', answer: 'Yes, you can cancel your subscription at any time. Your access will remain active until the end of your current billing period.' },
        { question: 'Do you offer a free trial?', answer: 'Yes, we offer a 14-day free trial on all our plans. No credit card required.' },
        { question: 'Is my data secure?', answer: 'Security is our top priority. We use industry-standard encryption and regularly audit our systems to ensure your data is safe.' }
    ]
  },
  features: {
    featuresVariant: 'bento-premium',
    paddingY: 'lg',
    paddingX: 'md',
    title: {
            es: "Why Choose Us",
            en: "Why Choose Us"
        },
    description: {
            es: "Discover the key benefits and features that set us apart from the competition.",
            en: "Discover the key benefits and features that set us apart from the competition."
        },
    items: [
      {
        title: {
                  es: "Diseño Inteligente",
                  en: "Intelligent Design"
              },
        description: {
                  es: "Nuestra IA analiza tu marca y genera automáticamente una estructura optimizada para conversiones.",
                  en: "Our AI analyzes your brand and automatically generates a conversion-optimized structure."
              },
        imageUrl: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=2670&ixlib=rb-4.0.3",
      },
      {
        title: {
                  es: "SEO Automatizado",
                  en: "Automated SEO"
              },
        description: {
                  es: "Cada página se construye siguiendo las mejores prácticas de SEO para asegurar la máxima visibilidad.",
                  en: "Every page is built following SEO best practices to ensure maximum visibility."
              },
        imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3",
      },
      {
        title: {
                  es: "Ecommerce Integrado",
                  en: "Integrated Ecommerce"
              },
        description: {
                  es: "Vende productos físicos o digitales con una plataforma de pagos robusta y fácil de configurar.",
                  en: "Sell physical or digital products with a robust and easy-to-configure payment platform."
              },
        imageUrl: "https://images.unsplash.com/photo-1557821552-17105176677c?auto=format&fit=crop&q=80&w=2664&ixlib=rb-4.0.3",
      },
    ],
    gridColumns: 3,
    imageHeight: 430,
    imageObjectFit: 'cover',
    animationType: 'fade-in-up',
    enableCardAnimation: true,
    borderRadius: 'xl',
    colors: {
      background: '#0f172a',
      accent: '#4f46e5',
      borderColor: '#334155',
      text: '#94a3b8',
      heading: '#F9FAFB',
      description: '#94a3b8',
      cardBackground: '#1e293b',
    },
  },
  testimonials: {
    testimonialsVariant: 'glassmorphism',
    paddingY: 'lg',
    paddingX: 'md',
    title: {
            es: "What Our Customers Say",
            en: "What Our Customers Say"
        },
    description: {
            es: "Hear from satisfied customers about their experience working with us.",
            en: "Hear from satisfied customers about their experience working with us."
        },
    titleFontSize: 'md',
    descriptionFontSize: 'md',
    borderRadius: 'xl',
    cardShadow: 'lg',
    borderStyle: 'solid',
    cardPadding: 32,
    animationType: 'fade-in-up',
    enableCardAnimation: true,
    items: [
      {
        quote: {
                  es: "This is an example testimonial. Replace it with a real quote from one of your satisfied customers to build trust and credibility.",
                  en: "This is an example testimonial. Replace it with a real quote from one of your satisfied customers to build trust and credibility."
              },
        name: {
                  es: "Customer Name",
                  en: "Customer Name"
              },
        title: {
                es: "Position, Company Name",
                en: "Position, Company Name"
            },
      },
      {
        quote: {
                  es: "Add another customer testimonial here. Specific results and benefits mentioned by customers are most effective.",
                  en: "Add another customer testimonial here. Specific results and benefits mentioned by customers are most effective."
              },
        name: {
                  es: "Another Customer",
                  en: "Another Customer"
              },
        title: {
                es: "Their Role, Their Company",
                en: "Their Role, Their Company"
            },
      },
      {
        quote: {
                  es: "Include a third testimonial to showcase diverse experiences. Consider featuring customers from different segments.",
                  en: "Include a third testimonial to showcase diverse experiences. Consider featuring customers from different segments."
              },
        name: {
                  es: "Third Customer",
                  en: "Third Customer"
              },
        title: {
                es: "Job Title, Organization",
                en: "Job Title, Organization"
            },
      },
    ],
    colors: {
      background: 'rgba(30, 41, 59, 0.5)',
      accent: '#4f46e5',
      borderColor: '#334155',
      text: '#d1d5db', // slate-300
      heading: '#F9FAFB',
      cardBackground: '#1f2937',
    },
  },
  slideshow: {
    slideshowVariant: 'classic',
    title: {
              es: "Our Gallery",
              en: "Our Gallery"
          },
    showTitle: true,
    fullWidth: false,
    paddingY: 'lg',
    paddingX: 'md',
    titleFontSize: 'md',
    borderRadius: 'xl',
    autoPlaySpeed: 5000,
    transitionEffect: 'slide',
    transitionDuration: 500,
    showArrows: true,
    showDots: true,
    arrowStyle: 'rounded',
    dotStyle: 'circle',
    kenBurnsIntensity: 'medium',
    thumbnailSize: 80,
    showCaptions: false,
    slideHeight: 600,
    items: [
      { imageUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2670&ixlib=rb-4.0.3", altText: 'Gallery image 1', caption: 'Modern Workspace' },
      { imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2670&ixlib=rb-4.0.3", altText: 'Gallery image 2', caption: 'Innovative Design' },
      { imageUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=2670&ixlib=rb-4.0.3", altText: 'Gallery image 3', caption: 'Team Collaboration' },
    ],
    colors: {
      background: '#1e293b',
      heading: '#F9FAFB',
      arrowBackground: 'rgba(0, 0, 0, 0.5)',
      arrowText: '#ffffff',
      dotActive: '#ffffff',
      dotInactive: 'rgba(255, 255, 255, 0.5)',
      captionBackground: 'rgba(0, 0, 0, 0.7)',
      captionText: '#ffffff',
    },
  },
  pricing: {
    pricingVariant: 'gradient',
    title: {
              es: "Our Plans",
              en: "Our Plans"
          },
    description: {
            es: "Choose the plan that best fits your needs. All plans include our core features.",
            en: "Choose the plan that best fits your needs. All plans include our core features."
        },
    paddingY: 'lg',
    paddingX: 'md',
    titleFontSize: 'md',
    descriptionFontSize: 'md',
    cardBorderRadius: 'xl',
    tiers: [
      {
        name: {
                  es: "Basic",
                  en: "Basic"
              },
        price: {
                  es: "$29",
                  en: "$29"
              },
        frequency: '/mes',
        description: {
                es: "Ideal para emprendedores que inician su viaje digital.",
                en: "Ideal for entrepreneurs starting their digital journey."
            },
        features: ['Hasta 5 páginas', 'Dominio personalizado', 'IA Básica', 'Soporte por email'],
        buttonText: {
                es: "Empezar ahora",
                en: "Get Started"
            },
        buttonLink: '#pricing',
        featured: false,
      },
      {
        name: {
                  es: "Pro",
                  en: "Pro"
              },
        price: {
                  es: "$79",
                  en: "$79"
              },
        frequency: '/mes',
        description: {
                es: "Para negocios en crecimiento que buscan escalar.",
                en: "For growing businesses looking to scale."
            },
        features: ['Páginas ilimitadas', 'Ecommerce completo', 'IA Avanzada', 'Soporte prioritario'],
        buttonText: {
                es: "Elegir Pro",
                en: "Choose Pro"
            },
        buttonLink: '#pricing',
        featured: true,
      },
      {
        name: {
                  es: "Enterprise",
                  en: "Enterprise"
              },
        price: {
                  es: "Personalizado",
                  en: "Custom"
              },
        frequency: '',
        description: {
                es: "Soluciones a medida para grandes organizaciones.",
                en: "Tailored solutions for large organizations."
            },
        features: ['Infraestructura dedicada', 'API de Quimera', 'Soporte 24/7', 'Contrato SLA'],
        buttonText: {
                es: "Contactar Ventas",
                en: "Contact Sales"
            },
        buttonLink: 'https://quimera.ai/contact',
        featured: false,
      },
    ],
    colors: {
      background: '#0f172a',
      accent: '#4f46e5',
      borderColor: '#334155',
      text: '#94a3b8',
      heading: '#F9FAFB',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
      checkmarkColor: '#10b981',
      cardBackground: '#1f2937',
      gradientStart: '#4f46e5',
      gradientEnd: '#10b981',
    },
    animationType: 'fade-in-up',
    enableCardAnimation: true,
  },
  faq: {
    title: {
              es: "Frequently Asked Questions",
              en: "Frequently Asked Questions"
          },
    description: {
              es: "Find answers to common questions. If you don't find what you're looking for, feel free to contact us.",
              en: "Find answers to common questions. If you don't find what you're looking for, feel free to contact us."
          },
    paddingY: 'lg',
    paddingX: 'md',
    items: [
      {
        question: "What is your first common question?",
        answer: "Provide a helpful and detailed answer to this frequently asked question. Be clear and concise while addressing the customer's concern."
      },
      {
        question: "How does your product/service work?",
        answer: "Explain your process or how customers can use your product or service. Include any important steps or information they should know."
      },
      {
        question: "What are your pricing options?",
        answer: "Describe your pricing structure and what's included. Help customers understand the value they receive at each tier."
      },
      {
        question: "How can I get support?",
        answer: "Explain your support options and how customers can reach you. Include response times and available channels."
      }
    ],
    colors: {
      background: '#1e293b', // bg-dark-800
      accent: '#4f46e5',
      borderColor: '#334155',
      text: '#94a3b8',
      heading: '#F9FAFB',
    }
  },
  leads: {
    leadsVariant: 'classic',
    title: {
              es: "Get in Touch",
              en: "Get in Touch"
          },
    description: {
            es: "Have questions? We'd love to hear from you. Fill out the form and we'll get back to you soon.",
            en: "Have questions? We'd love to hear from you. Fill out the form and we'll get back to you soon."
        },
    namePlaceholder: "Your Name",
    emailPlaceholder: "your@email.com",
    companyPlaceholder: "Your Company",
    messagePlaceholder: "How can we help you?",
    buttonText: {
            es: "Send Message",
            en: "Send Message"
        },
    paddingY: 'lg',
    paddingX: 'md',
    cardBorderRadius: 'xl',
    buttonBorderRadius: 'md',
    titleFontSize: 'md',
    descriptionFontSize: 'md',
    colors: {
      background: '#0f172a',
      accent: '#4f46e5',
      borderColor: '#334155',
      text: '#94a3b8',
      heading: '#F9FAFB',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
      cardBackground: '#1e293b',
      inputBackground: '#0f172a',
      inputText: '#F9FAFB',
      inputBorder: '#334155',
      gradientStart: '#4f46e5',
      gradientEnd: '#10b981',
    },
  },
  newsletter: {
    title: {
              es: "Stay Updated",
              en: "Stay Updated"
          },
    description: {
              es: "Subscribe to our newsletter for the latest updates, tips, and exclusive offers.",
              en: "Subscribe to our newsletter for the latest updates, tips, and exclusive offers."
          },
    placeholderText: "Enter your email",
    buttonText: {
            es: "Subscribe",
            en: "Subscribe"
        },
    paddingY: 'lg',
    paddingX: 'md',
    colors: {
      background: '#1e293b', // bg-dark-800
      accent: '#4f46e5',
      borderColor: '#334155',
      text: '#94a3b8',
      heading: '#F9FAFB',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
      cardBackground: 'rgba(79, 70, 229, 0.75)',
      inputBackground: '#111827',
      inputText: '#ffffff',
      inputBorder: '#374151',
    },
  },
  cta: {
    paddingY: 'lg',
    paddingX: 'md',
    title: {
            es: "Ready to Get Started?",
            en: "Ready to Get Started?"
        },
    description: {
            es: "Take the next step. Join our community and start your journey today.",
            en: "Take the next step. Join our community and start your journey today."
        },
    buttonText: {
            es: "Start Now",
            en: "Start Now"
        },
    secondaryText: "No credit card required • Cancel anytime",
    titleFontSize: 'md',
    descriptionFontSize: 'md',
    colors: {
        background: '#0f172a',
        gradientStart: '#4f46e5',
        gradientEnd: '#10b981',
        text: {
                es: "rgba(255, 255, 255, 0.8)",
                en: "rgba(255, 255, 255, 0.8)"
            },
        heading: '#FFFFFF',
        buttonBackground: '#ffffff',
        buttonText: '#4f46e5',
        secondaryText: 'rgba(255, 255, 255, 0.6)',
    },
  },
  portfolio: {
    paddingY: 'lg',
    paddingX: 'md',
    title: {
            es: "Our Work",
            en: "Our Work"
        },
    description: {
            es: "Take a look at some of our recent projects. We're proud of the work we do for our clients.",
            en: "Take a look at some of our recent projects. We're proud of the work we do for our clients."
        },
    items: [
      {
        title: {
                  es: "Project One",
                  en: "Project One"
              },
        description: {
                  es: "Brief description of this project and its goals.",
                  en: "Brief description of this project and its goals."
              },
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='400' viewBox='0 0 500 400'%3E%3Crect fill='%234B5563' width='500' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E500 × 400%3C/text%3E%3C/svg%3E",
      },
      {
        title: {
                  es: "Project Two",
                  en: "Project Two"
              },
        description: {
                  es: "Highlight the key aspects of this project.",
                  en: "Highlight the key aspects of this project."
              },
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='400' viewBox='0 0 500 400'%3E%3Crect fill='%234B5563' width='500' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E500 × 400%3C/text%3E%3C/svg%3E",
      },
      {
        title: {
                  es: "Project Three",
                  en: "Project Three"
              },
        description: {
                  es: "Showcase another successful project.",
                  en: "Showcase another successful project."
              },
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='400' viewBox='0 0 500 400'%3E%3Crect fill='%234B5563' width='500' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E500 × 400%3C/text%3E%3C/svg%3E",
      },
    ],
    animationType: 'fade-in-up',
    enableCardAnimation: true,
    colors: {
      background: '#0f172a',
      accent: '#4f46e5',
      borderColor: '#334155',
      text: '#94a3b8',
      heading: '#F9FAFB',
    },
  },
  services: {
    servicesVariant: 'cards',
    paddingY: 'lg',
    paddingX: 'md',
    title: {
            es: "Our Services",
            en: "Our Services"
        },
    description: {
            es: "We offer a range of services to help you achieve your goals.",
            en: "We offer a range of services to help you achieve your goals."
        },
    items: [
      {
        icon: 'code',
        title: {
                  es: "Service One",
                  en: "Service One"
              },
        description: {
                es: "Describe your first service offering and how it helps your customers.",
                en: "Describe your first service offering and how it helps your customers."
            },
      },
      {
        icon: 'brush',
        title: {
                  es: "Service Two",
                  en: "Service Two"
              },
        description: {
                es: "Explain your second service and the value it provides.",
                en: "Explain your second service and the value it provides."
            },
      },
      {
        icon: 'megaphone',
        title: {
                  es: "Service Three",
                  en: "Service Three"
              },
        description: {
                es: "Highlight your third service offering and its benefits.",
                en: "Highlight your third service offering and its benefits."
            },
      },
    ],
    animationType: 'fade-in-up',
    enableCardAnimation: true,
    colors: {
      background: '#1e293b', // bg-dark-800
      accent: '#4f46e5',
      borderColor: '#334155',
      text: '#94a3b8',
      heading: '#F9FAFB',
    },
  },
  team: {
    paddingY: 'lg',
    paddingX: 'md',
    title: {
            es: "Meet Our Team",
            en: "Meet Our Team"
        },
    description: {
            es: "Get to know the people behind our success.",
            en: "Get to know the people behind our success."
        },
    items: [
      {
        name: {
                  es: "Team Member",
                  en: "Team Member"
              },
        role: {
                  es: "Position",
                  en: "Position"
              },
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%234B5563' width='400' height='400'/%3E%3Ccircle cx='200' cy='140' r='60' fill='%236B7280'/%3E%3Cellipse cx='200' cy='300' rx='90' ry='70' fill='%236B7280'/%3E%3C/svg%3E",
      },
      {
        name: {
                  es: "Team Member",
                  en: "Team Member"
              },
        role: {
                  es: "Position",
                  en: "Position"
              },
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%234B5563' width='400' height='400'/%3E%3Ccircle cx='200' cy='140' r='60' fill='%236B7280'/%3E%3Cellipse cx='200' cy='300' rx='90' ry='70' fill='%236B7280'/%3E%3C/svg%3E",
      },
      {
        name: {
                  es: "Team Member",
                  en: "Team Member"
              },
        role: {
                  es: "Position",
                  en: "Position"
              },
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%234B5563' width='400' height='400'/%3E%3Ccircle cx='200' cy='140' r='60' fill='%236B7280'/%3E%3Cellipse cx='200' cy='300' rx='90' ry='70' fill='%236B7280'/%3E%3C/svg%3E",
      },
      {
        name: {
                  es: "Team Member",
                  en: "Team Member"
              },
        role: {
                  es: "Position",
                  en: "Position"
              },
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%234B5563' width='400' height='400'/%3E%3Ccircle cx='200' cy='140' r='60' fill='%236B7280'/%3E%3Cellipse cx='200' cy='300' rx='90' ry='70' fill='%236B7280'/%3E%3C/svg%3E",
      },
    ],
    animationType: 'fade-in-up',
    enableCardAnimation: true,
    colors: {
      background: '#0f172a',
      text: '#94a3b8',
      heading: '#F9FAFB',
    },
  },
  video: {
    paddingY: 'lg',
    paddingX: 'md',
    title: {
            es: "See It In Action",
            en: "See It In Action"
        },
    description: {
            es: "Watch this short video to learn more about what we offer.",
            en: "Watch this short video to learn more about what we offer."
        },
    source: 'youtube',
    videoId: 'dQw4w9WgXcQ',
    videoUrl: '',
    autoplay: false,
    loop: false,
    showControls: true,
    colors: {
      background: '#1e293b', // bg-dark-800
      text: '#94a3b8',
      heading: '#F9FAFB',
    },
  },
  howItWorks: {
    paddingY: 'lg',
    paddingX: 'md',
    title: {
            es: "How It Works",
            en: "How It Works"
        },
    description: {
            es: "Follow these simple steps to get started.",
            en: "Follow these simple steps to get started."
        },
    steps: 3,
    items: [
        { icon: 'upload', title: {
                    es: "Step 1",
                    en: "Step 1"
                }, description: {
                    es: "Describe the first step of your process.",
                    en: "Describe the first step of your process."
                } },
        { icon: 'process', title: {
                    es: "Step 2",
                    en: "Step 2"
                }, description: {
                    es: "Explain what happens next.",
                    en: "Explain what happens next."
                } },
        { icon: 'download', title: {
                    es: "Step 3",
                    en: "Step 3"
                }, description: {
                    es: "Detail the third step.",
                    en: "Detail the third step."
                } },
        { icon: 'share', title: {
                    es: "Step 4",
                    en: "Step 4"
                }, description: {
                    es: "Final step or outcome.",
                    en: "Final step or outcome."
                } },
    ],
    colors: {
        background: '#0f172a',
        accent: '#4f46e5',
        text: '#94a3b8',
        heading: '#F9FAFB',
    },
  },
  chatbot: {
    welcomeMessage: "Hello! How can I help you today?",
    placeholderText: "Type your question...",
    knowledgeBase: "This is a business website. Add your specific business information here to help the chatbot provide accurate answers.",
    position: 'bottom-right',
    colors: {
        primary: '#4f46e5',
        text: '#ffffff',
        background: '#0f172a'
    }
  },
  map: {
    title: {
              es: "Find Us",
              en: "Find Us"
          },
    description: {
              es: "Visit our location. We're conveniently located and easy to find.",
              en: "Visit Our Location. Conveniently located and easy to find."
          },
    address: {
            es: "123 Main Street, City, State 12345",
            en: "123 Main Street, City, State 12345"
        },
    lat: 40.7128,
    lng: -74.0060,
    zoom: 14,
    mapVariant: 'modern',
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || '', // Reads from .env file
    paddingY: 'lg',
    paddingX: 'md',
    height: 400,
    colors: {
        background: '#0f172a',
        text: '#94a3b8',
        heading: '#F9FAFB',
        accent: '#4f46e5',
        cardBackground: '#1e293b'
    },
    titleFontSize: 'md',
    descriptionFontSize: 'md',
    borderRadius: 'xl'
  },
  menu: {
    menuVariant: 'classic',
    title: {
              es: "Our Menu",
              en: "Our Menu"
          },
    description: {
            es: "Explore our offerings.",
            en: "Explore our offerings."
        },
    paddingY: 'lg',
    paddingX: 'md',
    items: [
      {
        name: {
                  es: "Item One",
                  en: "Item One"
              },
        description: {
                  es: "Description of your first menu item.",
                  en: "Description of your first menu item."
              },
        price: {
                es: "$XX.XX",
                en: "$XX.XX"
            },
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%234B5563' width='600' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E600 × 400%3C/text%3E%3C/svg%3E",
        category: {
                es: "Category",
                en: "Category"
            },
        isSpecial: true,
      },
      {
        name: {
                  es: "Item Two",
                  en: "Item Two"
              },
        description: {
                  es: "Description of your second menu item.",
                  en: "Description of your second menu item."
              },
        price: {
                es: "$XX.XX",
                en: "$XX.XX"
            },
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%234B5563' width='600' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E600 × 400%3C/text%3E%3C/svg%3E",
        category: {
                es: "Category",
                en: "Category"
            },
        isSpecial: false,
      },
      {
        name: {
                  es: "Item Three",
                  en: "Item Three"
              },
        description: {
                  es: "Description of your third menu item.",
                  en: "Description of your third menu item."
              },
        price: {
                es: "$XX.XX",
                en: "$XX.XX"
            },
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%234B5563' width='600' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E600 × 400%3C/text%3E%3C/svg%3E",
        category: {
                es: "Category",
                en: "Category"
            },
        isSpecial: true,
      },
      {
        name: {
                  es: "Item Four",
                  en: "Item Four"
              },
        description: {
                  es: "Description of your fourth menu item.",
                  en: "Description of your fourth menu item."
              },
        price: {
                es: "$XX.XX",
                en: "$XX.XX"
            },
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%234B5563' width='600' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E600 × 400%3C/text%3E%3C/svg%3E",
        category: {
                es: "Category",
                en: "Category"
            },
        isSpecial: false,
      },
      {
        name: {
                  es: "Item Five",
                  en: "Item Five"
              },
        description: {
                  es: "Description of your fifth menu item.",
                  en: "Description of your fifth menu item."
              },
        price: {
                es: "$XX.XX",
                en: "$XX.XX"
            },
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%234B5563' width='600' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E600 × 400%3C/text%3E%3C/svg%3E",
        category: {
                es: "Category",
                en: "Category"
            },
        isSpecial: true,
      },
      {
        name: {
                  es: "Item Six",
                  en: "Item Six"
              },
        description: {
                  es: "Description of your sixth menu item.",
                  en: "Description of your sixth menu item."
              },
        price: {
                es: "$XX.XX",
                en: "$XX.XX"
            },
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%234B5563' width='600' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E600 × 400%3C/text%3E%3C/svg%3E",
        category: {
                es: "Category",
                en: "Category"
            },
        isSpecial: false,
      },
    ],
    colors: {
      background: '#0f172a',
      accent: '#4f46e5',
      borderColor: '#334155',
      text: '#94a3b8',
      heading: '#F9FAFB',
      cardBackground: '#1e293b',
      priceColor: '#10b981',
    },
    titleFontSize: 'md',
    descriptionFontSize: 'md',
    borderRadius: 'xl',
    showCategories: true,
    animationType: 'fade-in-up',
    enableCardAnimation: true,
  },
  footer: {
    title: {
              es: "Your Brand",
              en: "Your Brand"
          },
    description: {
              es: "A brief description of your business goes here.",
              en: "A brief description of your business goes here."
          },
    linkColumns: [
      {
        title: {
                  es: "Quick Links",
                  en: "Quick Links"
              },
        links: [
          { text: {
                      es: "Home",
                      en: "Home"
                  }, href: '/' },
          { text: {
                      es: "About",
                      en: "About"
                  }, href: '#about' },
          { text: {
                      es: "Contact",
                      en: "Contact"
                  }, href: '#contact' },
        ],
      },
      {
        title: {
                  es: "Resources",
                  en: "Resources"
              },
        links: [
          { text: {
                      es: "FAQ",
                      en: "FAQ"
                  }, href: '#faq' },
          { text: {
                      es: "Support",
                      en: "Support"
                  }, href: '/contact' },
          { text: {
                      es: "Blog",
                      en: "Blog"
                  }, href: '/blog' },
          { text: {
                      es: "Changelog",
                      en: "Changelog"
                  }, href: '/changelog' },
        ],
      },
      {
        title: {
                  es: "Legal",
                  en: "Legal"
              },
        links: [
          { text: {
                      es: "Privacy Policy",
                      en: "Privacy Policy"
                  }, href: '/privacy-policy' },
          { text: {
                      es: "Terms of Service",
                      en: "Terms of Service"
                  }, href: '/terms-of-service' },
        ],
      },
    ],
    socialLinks: [
      { platform: 'twitter', href: 'https://twitter.com' },
      { platform: 'github', href: 'https://github.com' },
      { platform: 'facebook', href: 'https://facebook.com' },
    ],
    copyrightText: '© {YEAR} Your Brand. All rights reserved.',
    colors: {
      background: '#4f46e5', // Same as header - solid brand color
      border: '#6366f1', // Lighter border
      text: '#ffffff', // White text for contrast
      linkHover: '#e0e7ff', // Light hover color
      heading: '#ffffff',
    },
  },
  banner: {
    bannerVariant: 'classic',
    headline: {
              es: "Discover Something Amazing",
              en: "Discover Something Amazing"
          },
    subheadline: {
            es: "Join thousands of customers who have transformed their experience with our solution.",
            en: "Join thousands of customers who have transformed their experience with our solution."
        },
    buttonText: {
            es: "Get Started",
            en: "Get Started"
        },
    buttonUrl: '#cta',
    showButton: true,
    backgroundImageUrl: '',
    backgroundOverlayOpacity: 50,
    height: 400,
    textAlignment: 'center',
    paddingY: 'lg',
    paddingX: 'md',
    headlineFontSize: 'lg',
    subheadlineFontSize: 'md',
    colors: {
      background: '#0f172a',
      overlayColor: '#000000',
      heading: '#ffffff',
      text: '#ffffff',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
    },
  },
  topBar: {
    messages: [
      { text: {
                  es: "🚀 Free shipping on orders over $50",
                  en: "🚀 Free shipping on orders over $50"
              }, icon: 'truck', link: '#products', linkText: 'Shop Now' },
      { text: {
                  es: "⚡ New collection just dropped!",
                  en: "⚡ New collection just dropped!"
              }, icon: 'sparkles', link: '#features', linkText: 'Explore' },
    ],
    scrollEnabled: false,
    scrollSpeed: 30,
    pauseOnHover: true,
    dismissible: true,
    useGradient: false,
    gradientFrom: '#4f46e5',
    gradientTo: '#7c3aed',
    gradientAngle: 90,
    backgroundColor: '#1a1a1a',
    textColor: '#ffffff',
    linkColor: '#fbbf24',
    iconColor: '#fbbf24',
    fontSize: 'sm',
    separator: 'dot',
    showRotatingArrows: true,
    rotateSpeed: 4000,
    aboveHeader: true,
  },
  logoBanner: {
    title: {
              es: "Trusted by industry leaders",
              en: "Trusted by industry leaders"
          },
    subtitle: '',
    logos: [
      { imageUrl: '', alt: 'Brand 1', link: '', linkText: '' },
      { imageUrl: '', alt: 'Brand 2', link: '', linkText: '' },
      { imageUrl: '', alt: 'Brand 3', link: '', linkText: '' },
      { imageUrl: '', alt: 'Brand 4', link: '', linkText: '' },
      { imageUrl: '', alt: 'Brand 5', link: '', linkText: '' },
    ],
    scrollEnabled: true,
    scrollSpeed: 25,
    pauseOnHover: true,
    logoHeight: 40,
    logoGap: 48,
    grayscale: true,
    useGradient: false,
    backgroundColor: '#ffffff',
    titleColor: '#64748b',
    subtitleColor: '#94a3b8',
    titleFontSize: 'sm',
    subtitleFontSize: 'sm',
    paddingY: 'md',
    showDivider: false,
    dividerColor: '#e2e8f0',
  },
  products: {
    title: {
              es: "Nuestros Productos",
              en: "Our Products"
          },
    subtitle: {
              es: "Descubre nuestra selección de productos de alta calidad",
              en: "Discover our selection of high-quality products"
          },
    products: [], // Se cargan dinámicamente desde el ecommerce
    columns: 4,
    showFilters: true,
    showSearch: true,
    showPagination: true,
    productsPerPage: 12,
    layout: 'grid',
    cardStyle: 'modern',
    showAddToCart: true,
    showQuickView: false,
    showWishlist: false,
    style: 'modern',
    paddingY: 'lg',
    paddingX: 'md',
    titleFontSize: 'lg',
    descriptionFontSize: 'md',
    colors: {
      background: '#0f172a',
      text: '#94a3b8',
      heading: '#F9FAFB',
      accent: '#4f46e5',
      cardBackground: '#1e293b',
      cardText: '#94a3b8',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
    },
  },
  realEstateListings: {
    title: '',
    subtitle: '',
    buttonText: '',
    buttonLink: '#leads',
    maxItems: 6,
    featuredOnly: false,
    showPrice: true,
    showLocation: true,
    showStats: true,
    showDescription: true,
    paddingY: 'lg',
    paddingX: 'md',
    colors: {
      background: '',
      text: '',
      textMuted: '',
      heading: '',
      accent: '',
      cardBackground: '',
      border: '',
      buttonBackground: '',
      buttonText: '#ffffff',
    },
  },
  cmsFeed: {
    title: {
              es: "Latest Articles",
              en: "Latest Articles"
          },
    description: {
              es: "Stay up to date with our latest content",
              en: "Stay up to date with our latest content"
          },
    titleFontSize: 'md',
    descriptionFontSize: 'md',
    layout: 'grid',
    cardStyle: 'classic',
    columns: 3,
    maxPosts: 6,
    categoryFilter: 'all',
    showFeaturedImage: true,
    showExcerpt: true,
    showDate: true,
    showAuthor: true,
    showCategoryBadge: true,
    showReadMore: true,
    readMoreText: 'Read More',
    showOnlyPublished: true,
    viewAllText: 'View All Articles',
    viewAllLink: '/blog',
    imageStyle: 'rounded',
    paddingY: 'lg',
    paddingX: 'md',
    colors: {
      background: '#0f172a',
      heading: '#F9FAFB',
      text: '#94a3b8',
      cardBackground: '#1e293b',
      cardBorder: '#334155',
      cardHeading: '#f8fafc',
      cardText: '#cbd5e1',
      cardExcerpt: '#94a3b8',
      categoryBadgeBackground: '#4f46e5',
      categoryBadgeText: '#ffffff',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
    },
  },
  signupFloat: {
    headerText: 'Join Our Community',
    descriptionText: 'Sign up to receive exclusive updates, offers, and content delivered straight to your inbox.',
    imageUrl: '',
    imagePlacement: 'top' as const,
    showNameField: true,
    showEmailField: true,
    showPhoneField: false,
    showMessageField: false,
    namePlaceholder: 'Your Name',
    emailPlaceholder: 'your@email.com',
    phonePlaceholder: '+1 (555) 000-0000',
    messagePlaceholder: 'Tell us about yourself...',
    buttonText: {
            es: "Sign Up",
            en: "Sign Up"
        },
    socialLinks: [
      { platform: 'instagram' as const, href: '#' },
      { platform: 'twitter' as const, href: '#' },
      { platform: 'facebook' as const, href: '#' },
    ],
    showSocialLinks: true,
    floatPosition: 'center' as const,
    showOnLoad: true,
    showCloseButton: true,
    triggerDelay: 3,
    minimizeOnClose: true,
    minimizedLabel: '✉️ Sign Up',
    width: 400,
    borderRadius: 'xl',
    buttonBorderRadius: 'lg',
    imageHeight: 200,
    headerFontSize: 'lg',
    descriptionFontSize: 'sm',
    colors: {
      background: '#1e293b',
      heading: '#F9FAFB',
      text: '#94a3b8',
      accent: '#4f46e5',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
      inputBackground: '#0f172a',
      inputText: '#F9FAFB',
      inputBorder: '#334155',
      inputPlaceholder: '#6b7280',
      socialIconColor: '#94a3b8',
      overlayBackground: 'rgba(0,0,0,0.4)',
      cardShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    },
  },
  storeSettings: {
    showFilterSidebar: true,
    showSearchBar: true,
    showSortOptions: true,
    showViewModeToggle: true,
    defaultViewMode: 'grid' as const,
    productsPerPage: 12,
  },
  productBundle: {
    variant: 'horizontal',
    title: {
              es: "🎁 Pack Especial",
              en: "🎁 Special Pack"
          },
    description: {
            es: "Compra estos productos juntos y ahorra",
            en: "Buy these products together and save"
        },
    productIds: [], // Se seleccionan desde el editor
    discountPercent: 15,
    bundlePrice: 0, // Se calcula automáticamente
    originalPrice: 0, // Se calcula automáticamente
    showSavings: true,
    savingsText: 'Ahorra',
    showIndividualPrices: true,
    buttonText: {
            es: "Agregar Bundle al Carrito",
            en: "Add Bundle to Cart"
        },
    buttonUrl: '',
    showBadge: true,
    badgeText: {
            es: "Mejor Precio",
            en: "Best Price"
        },
    paddingY: 'lg',
    paddingX: 'md',
    titleFontSize: 'lg',
    descriptionFontSize: 'md',
    borderRadius: 'xl',
    colors: {
      background: '#1e293b',
      heading: '#F9FAFB',
      text: '#94a3b8',
      accent: '#4f46e5',
      cardBackground: '#0f172a',
      cardText: '#e2e8f0',
      priceColor: '#ffffff',
      savingsColor: '#10b981',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
      badgeBackground: '#10b981',
      badgeText: '#ffffff',
    },
  },
  // ==========================================================================
  // ECOMMERCE COMPONENTS - Featured Products
  // ==========================================================================
  featuredProducts: {
    variant: 'carousel',
    title: {
              es: "Productos Destacados",
              en: "Featured Products"
          },
    description: {
            es: "Descubre nuestra selección de productos más populares",
            en: "Discover our selection of most popular products"
        },
    paddingY: 'lg',
    paddingX: 'md',
    titleFontSize: 'lg',
    descriptionFontSize: 'md',
    sourceType: 'newest',
    categoryId: '',
    productIds: [],
    columns: 4,
    productsToShow: 8,
    autoScroll: true,
    scrollSpeed: 5000,
    showArrows: true,
    showDots: true,
    showBadge: true,
    showPrice: true,
    showRating: true,
    showAddToCart: true,
    showViewAll: true,
    viewAllUrl: '/tienda',
    cardStyle: 'modern',
    borderRadius: 'xl',
    animationType: 'fade-in-up',
    enableCardAnimation: true,
    colors: {
      background: '#0f172a',
      heading: '#F9FAFB',
      text: '#94a3b8',
      accent: '#4f46e5',
      cardBackground: '#1e293b',
      cardText: '#94a3b8',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
      badgeBackground: '#10b981',
      badgeText: '#ffffff',
    },
  },
  // ==========================================================================
  // ECOMMERCE COMPONENTS - Category Grid
  // ==========================================================================
  categoryGrid: {
    variant: 'cards',
    title: {
              es: "Compra por Categoría",
              en: "Shop by Category"
          },
    description: {
            es: "Explora nuestras colecciones",
            en: "Explore our collections"
        },
    categories: [], // Se cargan dinámicamente
    paddingY: 'lg',
    paddingX: 'md',
    titleFontSize: 'lg',
    descriptionFontSize: 'md',
    columns: 4,
    showProductCount: true,
    imageAspectRatio: '1:1',
    imageObjectFit: 'cover',
    borderRadius: 'xl',
    animationType: 'fade-in-up',
    enableCardAnimation: true,
    colors: {
      background: '#0f172a',
      heading: '#F9FAFB',
      text: '#94a3b8',
      accent: '#4f46e5',
      cardBackground: '#1e293b',
      cardText: '#ffffff',
      overlayStart: 'rgba(0, 0, 0, 0)',
      overlayEnd: 'rgba(0, 0, 0, 0.7)',
    },
  },
  // ==========================================================================
  // ECOMMERCE COMPONENTS - Product Hero
  // ==========================================================================
  productHero: {
    variant: 'featured',
    layout: 'single',
    headline: {
            es: "Descubre Nuestra Colección",
            en: "Discover Our Collection"
        },
    subheadline: {
            es: "Productos de alta calidad diseñados para ti",
            en: "High-quality products designed for you"
        },
    buttonText: {
            es: "Explorar Ahora",
            en: "Explore Now"
        },
    buttonUrl: '',  // Empty = navigate to featured product automatically
    backgroundImageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='600' viewBox='0 0 1200 600'%3E%3Crect fill='%231e293b' width='1200' height='600'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='32' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E1200 × 600%3C/text%3E%3C/svg%3E",
    productId: '',
    paddingY: 'lg',
    paddingX: 'md',
    height: 500,
    headlineFontSize: 'xl',
    subheadlineFontSize: 'md',
    overlayStyle: 'gradient',
    overlayOpacity: 50,
    textAlignment: 'left',
    contentPosition: 'left',
    showBadge: true,
    badgeText: {
            es: "✨ Nuevo",
            en: "✨ New"
        },
    buttonBorderRadius: 'xl',
    animationType: 'fade-in-up',
    showAddToCartButton: false,
    addToCartButtonText: 'Añadir al Carrito',
    colors: {
      background: '#0f172a',
      overlayColor: '#000000',
      heading: '#ffffff',
      text: '#ffffff',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
      badgeBackground: '#ef4444',
      badgeText: '#ffffff',
      addToCartBackground: '#10b981',
      addToCartText: '#ffffff',
    },
  },
  // ==========================================================================
  // ECOMMERCE COMPONENTS - Sale Countdown
  // ==========================================================================
  saleCountdown: {
    variant: 'banner',
    title: {
              es: "🔥 ¡Oferta Especial!",
              en: "🔥 Special Offer!"
          },
    description: {
            es: "No te pierdas nuestras ofertas exclusivas por tiempo limitado",
            en: "Don't miss our exclusive limited-time offers"
        },
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días desde ahora
    paddingY: 'md',
    paddingX: 'md',
    titleFontSize: 'lg',
    descriptionFontSize: 'md',
    height: 300,
    showDays: true,
    showHours: true,
    showMinutes: true,
    showSeconds: true,
    showProducts: false,
    productsToShow: 4,
    productIds: [],
    badgeText: {
            es: "🎉 Oferta",
            en: "🎉 Offer"
        },
    discountText: 'Hasta 50% OFF',
    borderRadius: 'xl',
    animationType: 'fade-in',
    colors: {
      background: '#1e293b',
      heading: '#ffffff',
      text: '#94a3b8',
      accent: '#ef4444',
      countdownBackground: '#0f172a',
      countdownText: '#ffffff',
      badgeBackground: '#ef4444',
      badgeText: '#ffffff',
      buttonBackground: '#ef4444',
      buttonText: '#ffffff',
    },
  },
  // ==========================================================================
  // ECOMMERCE COMPONENTS - Trust Badges
  // ==========================================================================
  trustBadges: {
    variant: 'horizontal',
    title: {
              es: "¿Por Qué Elegirnos?",
              en: "Why Choose Us?"
          },
    badges: [
      { icon: 'truck', title: {
                  es: "Envío Gratis",
                  en: "Free Shipping"
              }, description: {
                  es: "En pedidos superiores a $50",
                  en: "On orders over $50"
              } },
      { icon: 'shield', title: {
                  es: "Pago Seguro",
                  en: "Secure Payment"
              }, description: {
                  es: "Transacciones 100% protegidas",
                  en: "100% protected transactions"
              } },
      { icon: 'refresh-cw', title: {
                  es: "Devoluciones",
                  en: "Returns"
              }, description: {
                  es: "30 días de garantía",
                  en: "30-day guarantee"
              } },
      { icon: 'headphones', title: {
                  es: "Soporte 24/7",
                  en: "24/7 Support"
              }, description: {
                  es: "Atención personalizada",
                  en: "Personalized attention"
              } },
    ],
    paddingY: 'md',
    paddingX: 'md',
    titleFontSize: 'md',
    showLabels: true,
    iconSize: 'md',
    borderRadius: 'xl',
    colors: {
      background: '#1e293b',
      heading: '#F9FAFB',
      text: '#94a3b8',
      iconColor: '#4f46e5',
      borderColor: '#334155',
    },
  },
  // ==========================================================================
  // ECOMMERCE COMPONENTS - Recently Viewed
  // ==========================================================================
  recentlyViewed: {
    variant: 'carousel',
    title: {
              es: "Vistos Recientemente",
              en: "Recently Viewed"
          },
    description: {
            es: "Productos que has explorado",
            en: "Products you've explored"
        },
    paddingY: 'lg',
    paddingX: 'md',
    titleFontSize: 'lg',
    maxProducts: 10,
    columns: 5,
    autoScroll: false,
    scrollSpeed: 5000,
    showArrows: true,
    showPrice: true,
    showRating: false,
    cardStyle: 'minimal',
    borderRadius: 'xl',
    animationType: 'fade-in',
    colors: {
      background: '#0f172a',
      heading: '#F9FAFB',
      text: '#94a3b8',
      accent: '#4f46e5',
      cardBackground: '#1e293b',
      cardText: '#94a3b8',
    },
  },
  // ==========================================================================
  // ECOMMERCE COMPONENTS - Product Reviews
  // ==========================================================================
  productReviews: {
    variant: 'cards',
    title: {
              es: "Lo Que Dicen Nuestros Clientes",
              en: "What Our Customers Say"
          },
    description: {
            es: "Opiniones verificadas de compradores reales",
            en: "Verified reviews from real buyers"
        },
    reviews: [], // Se cargan dinámicamente
    paddingY: 'lg',
    paddingX: 'md',
    titleFontSize: 'lg',
    descriptionFontSize: 'md',
    showRatingDistribution: true,
    showPhotos: true,
    showVerifiedBadge: true,
    showProductInfo: false,
    sortBy: 'newest',
    maxReviews: 6,
    borderRadius: 'xl',
    animationType: 'fade-in-up',
    colors: {
      background: '#0f172a',
      heading: '#F9FAFB',
      text: '#94a3b8',
      accent: '#4f46e5',
      cardBackground: '#1e293b',
      cardText: '#94a3b8',
      starColor: '#fbbf24',
      verifiedBadgeColor: '#10b981',
    },
  },
  // ==========================================================================
  // ECOMMERCE COMPONENTS - Collection Banner
  // ==========================================================================
  collectionBanner: {
    variant: 'hero',
    title: {
              es: "Nueva Colección",
              en: "New Collection"
          },
    description: {
            es: "Descubre lo último en tendencias y estilo",
            en: "Discover the latest in trends and style"
        },
    backgroundImageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='400' viewBox='0 0 1200 400'%3E%3Crect fill='%231e293b' width='1200' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='32' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E1200 × 400%3C/text%3E%3C/svg%3E",
    buttonText: {
            es: "Ver Colección",
            en: "View Collection"
        },
    buttonUrl: '#products',
    collectionId: '',
    paddingY: 'lg',
    paddingX: 'md',
    height: 400,
    headlineFontSize: 'xl',
    descriptionFontSize: 'md',
    overlayStyle: 'gradient',
    overlayOpacity: 50,
    textAlignment: 'center',
    contentPosition: 'center',
    showButton: true,
    buttonBorderRadius: 'xl',
    animationType: 'fade-in',
    colors: {
      background: '#0f172a',
      overlayColor: '#000000',
      heading: '#ffffff',
      text: '#ffffff',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
    },
  },
  // ==========================================================================
  // ECOMMERCE COMPONENTS - Announcement Bar
  // ==========================================================================
  announcementBar: {
    variant: 'static',
    messages: [
      { text: {
                  es: "🚚 ¡Envío gratis en pedidos superiores a $50!",
                  en: "🚚 Free shipping on orders over $50!"
              }, linkText: 'Ver productos', link: '/tienda' },
      { text: {
                  es: "🎁 Usa el código WELCOME10 para 10% de descuento",
                  en: "🎁 Use code WELCOME10 for 10% off"
              }, linkText: 'Comprar ahora', link: '/tienda' },
    ],
    paddingY: 'sm',
    paddingX: 'md',
    fontSize: 'sm',
    height: 40,
    showIcon: true,
    icon: 'megaphone',
    dismissible: false,
    speed: 50,
    pauseOnHover: true,
    colors: {
      background: '#4f46e5',
      text: '#ffffff',
      linkColor: '#ffffff',
      iconColor: '#ffffff',
      borderColor: 'transparent',
    },
  },
  // ==========================================================================
  // MULTI-PAGE SECTIONS (Dynamic page templates)
  // ==========================================================================
  productDetail: {
    showGallery: true,
    showVariants: true,
    showDescription: true,
    showSpecifications: true,
    showRelatedProducts: true,
    relatedProductsCount: 4,
    showReviews: true,
    galleryLayout: 'vertical',
    paddingY: 'lg',
    paddingX: 'md',
    colors: {
      background: '#0f172a',
      heading: '#F9FAFB',
      text: '#94a3b8',
      accent: '#4f46e5',
      priceColor: '#10b981',
      salePriceColor: '#ef4444',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
    },
  },
  categoryProducts: {
    showCategoryDescription: true,
    showCategoryHero: true,
    showFilters: true,
    showSort: true,
    productsPerPage: 12,
    columns: 4,
    cardStyle: 'modern',
    paddingY: 'lg',
    paddingX: 'md',
    colors: {
      background: '#0f172a',
      heading: '#F9FAFB',
      text: '#94a3b8',
      accent: '#4f46e5',
      cardBackground: '#1e293b',
      cardText: '#94a3b8',
    },
  },
  articleContent: {
    showFeaturedImage: true,
    showAuthor: true,
    showDate: true,
    showTags: true,
    showRelatedArticles: true,
    relatedArticlesCount: 3,
    showShareButtons: true,
    showTableOfContents: false,
    maxWidth: 'lg',
    paddingY: 'lg',
    paddingX: 'md',
    colors: {
      background: '#0f172a',
      heading: '#F9FAFB',
      text: '#94a3b8',
      accent: '#4f46e5',
      linkColor: '#4f46e5',
    },
  },
  productGrid: {
    title: {
              es: "Todos los Productos",
              en: "All Products"
          },
    description: {
              es: "Explora nuestra colección completa",
              en: "Explore our complete collection"
          },
    sourceType: 'all',
    productsPerPage: 12,
    columns: 4,
    showFilters: true,
    showSearch: true,
    showPagination: true,
    cardStyle: 'modern',
    paddingY: 'lg',
    paddingX: 'md',
    titleFontSize: 'lg',
    descriptionFontSize: 'md',
    colors: {
      background: '#0f172a',
      heading: '#F9FAFB',
      text: '#94a3b8',
      accent: '#4f46e5',
      cardBackground: '#1e293b',
      cardText: '#94a3b8',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
    },
  },
  cart: {
    showSummary: true,
    showSuggestions: true,
    suggestionsCount: 4,
    showCouponInput: true,
    showShippingEstimate: true,
    paddingY: 'lg',
    paddingX: 'md',
    colors: {
      background: '#0f172a',
      heading: '#F9FAFB',
      text: '#94a3b8',
      accent: '#4f46e5',
      cardBackground: '#1e293b',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
    },
  },
  checkout: {
    showOrderSummary: true,
    showShippingOptions: true,
    showCouponInput: true,
    requiredFields: ['phone'],
    paymentMethods: ['card', 'paypal'],
    layout: 'two-column',
    paddingY: 'lg',
    paddingX: 'md',
    colors: {
      background: '#0f172a',
      heading: '#F9FAFB',
      text: '#94a3b8',
      accent: '#4f46e5',
      cardBackground: '#1e293b',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
      inputBackground: '#0f172a',
      inputBorder: '#334155',
    },
  },
  separator1: {
    height: 100,
    color: 'transparent',
  },
  separator2: {
    height: 100,
    color: 'transparent',
  },
  separator3: {
    height: 100,
    color: 'transparent',
  },
  separator4: {
    height: 100,
    color: 'transparent',
  },
  separator5: {
    height: 100,
    color: 'transparent',
  },
};

const theme: ThemeData = {
    cardBorderRadius: 'xl',
    buttonBorderRadius: 'xl',
    fontFamilyHeader: 'poppins',
    fontFamilyBody: 'inter',
    fontFamilyButton: 'poppins',
    headingsAllCaps: false,
    buttonsAllCaps: false,
    navLinksAllCaps: false,
    pageBackground: '#0f172a',
    globalColors: {
        primary: '#4f46e5',
        secondary: '#10b981',
        accent: '#f59e0b',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#e2e8f0',
        textMuted: '#94a3b8',
        heading: '#f8fafc',
        border: '#334155',
        success: '#10b981',
        error: '#ef4444'
    }
};

const brandIdentity: BrandIdentity = {
    name: {
            es: "Your Business",
            en: "Your Business"
        },
    industry: 'General',
    targetAudience: 'Your target customers',
    toneOfVoice: 'Professional',
    coreValues: 'Quality, Service, Trust',
    language: 'English',
};

const componentOrder: PageSection[] = [
    // Structure
    'colors', 'typography', 'header',
    // Content
    'hero', 'heroSplit', 'heroGallery', 'heroWave', 'heroNova', 'heroLead', 'heroLumina', 'heroNeon', 'topBar', 'logoBanner', 'banner', 'features', 'featuresLumina', 'featuresNeon', 'testimonials', 'testimonialsLumina', 'testimonialsNeon', 'slideshow',
    'separator1', 'separator2', 'separator3', 'separator4', 'separator5',
    'pricing', 'pricingLumina', 'pricingNeon', 'faq', 'faqLumina', 'faqNeon', 'portfolio', 'portfolioLumina', 'portfolioNeon', 'cta', 'ctaLumina', 'ctaNeon', 'services', 'team', 'video', 'howItWorks', 'menu',
    // Ecommerce
    'storeSettings', 'products', 'featuredProducts', 'categoryGrid', 'productHero', 'saleCountdown',
    'trustBadges', 'recentlyViewed', 'productReviews', 'collectionBanner', 'productBundle', 'announcementBar',
    // Multi-page sections (for dynamic pages)
    'productDetail', 'categoryProducts', 'articleContent', 'productGrid', 'realEstateListings', 'cart', 'checkout',
    // Integrations
    'leads', 'newsletter', 'map', 'chatbot', 'cmsFeed', 'signupFloat',
    // Footer
    'footer'
];

const sectionVisibility = componentOrder.reduce((acc, section) => {
    (acc as any)[section] = true;
    return acc;
}, {} as Record<PageSection, boolean>);

export const initialData = {
    data: pageData,
    theme,
    brandIdentity,
    componentOrder,
    sectionVisibility,
};
