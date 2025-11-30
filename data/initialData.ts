
import { PageData, NavLink, ThemeData, PageSection, BrandIdentity } from '../types';

// FIX: Renamed original export to pageData and created a new initialData export structure
// that includes theme, componentOrder, and sectionVisibility to resolve type errors.
const pageData: PageData = {
  header: {
    style: 'sticky-solid',
    layout: 'classic',
    isSticky: true,
    glassEffect: false,
    height: 80,
    logoType: 'text',
    logoText: 'Your Brand',
    logoImageUrl: '',
    logoWidth: 120,
    links: [
      { text: 'Features', href: '#features' },
      { text: 'About', href: '#about' },
      { text: 'Contact', href: '#contact' },
    ] as NavLink[],
    hoverStyle: 'simple',
    ctaText: 'Get Started',
    showCta: true,
    showLogin: true,
    loginText: 'Log In',
    loginUrl: '#',
    colors: {
      background: '#4f46e5', // Solid brand color
      text: '#ffffff', // White text for contrast
      accent: '#ffffff',
    },
    buttonBorderRadius: 'xl',
  },
  hero: {
    heroVariant: 'modern',
    paddingY: 'lg',
    paddingX: 'md',
    headline: "Welcome to <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary\">Your Brand</span>",
    subheadline: "Add your compelling message here. Describe what makes your business unique and why customers should choose you.",
    primaryCta: "Get Started",
    secondaryCta: "Learn More",
    imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%23374151' width='800' height='600'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='32' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E800 × 600%3C/text%3E%3C/svg%3E",
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
    badgeText: '✨ Welcome',
    badgeIcon: 'sparkles',
    badgeColor: '#4f46e5',
    badgeBackgroundColor: '#4f46e515',
    buttonBorderRadius: 'xl',
    animationType: 'fade-in-up',
  },
  features: {
    featuresVariant: 'bento-premium',
    paddingY: 'lg',
    paddingX: 'md',
    title: "Why Choose Us",
    description: "Discover the key benefits and features that set us apart from the competition.",
    items: [
      {
        title: 'Feature One',
        description: 'Describe your first key feature or benefit here. What problem does it solve for your customers?',
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='300' viewBox='0 0 500 300'%3E%3Crect fill='%234B5563' width='500' height='300'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E500 × 300%3C/text%3E%3C/svg%3E",
      },
      {
        title: 'Feature Two',
        description: 'Highlight another important aspect of your product or service. What value does it provide?',
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='300' viewBox='0 0 500 300'%3E%3Crect fill='%234B5563' width='500' height='300'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E500 × 300%3C/text%3E%3C/svg%3E",
      },
      {
        title: 'Feature Three',
        description: 'Showcase a third compelling feature. How does it benefit your target audience?',
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='300' viewBox='0 0 500 300'%3E%3Crect fill='%234B5563' width='500' height='300'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E500 × 300%3C/text%3E%3C/svg%3E",
      },
    ],
    gridColumns: 3,
    imageHeight: 200,
    imageObjectFit: 'cover',
    animationType: 'fade-in-up',
    enableCardAnimation: true,
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
    title: "What Our Customers Say",
    description: "Hear from satisfied customers about their experience working with us.",
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
        quote: "This is an example testimonial. Replace it with a real quote from one of your satisfied customers to build trust and credibility.",
        name: 'Customer Name',
        title: 'Position, Company Name',
      },
      {
        quote: "Add another customer testimonial here. Specific results and benefits mentioned by customers are most effective.",
        name: 'Another Customer',
        title: 'Their Role, Their Company',
      },
      {
        quote: "Include a third testimonial to showcase diverse experiences. Consider featuring customers from different segments.",
        name: 'Third Customer',
        title: 'Job Title, Organization',
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
    title: "Our Gallery",
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
      { imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'%3E%3Crect fill='%23374151' width='1200' height='800'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='48' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E1200 × 800%3C/text%3E%3C/svg%3E", altText: 'Gallery image 1', caption: 'Image Caption One' },
      { imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'%3E%3Crect fill='%23374151' width='1200' height='800'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='48' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E1200 × 800%3C/text%3E%3C/svg%3E", altText: 'Gallery image 2', caption: 'Image Caption Two' },
      { imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'%3E%3Crect fill='%23374151' width='1200' height='800'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='48' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E1200 × 800%3C/text%3E%3C/svg%3E", altText: 'Gallery image 3', caption: 'Image Caption Three' },
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
    title: "Our Plans",
    description: "Choose the plan that best fits your needs. All plans include our core features.",
    paddingY: 'lg',
    paddingX: 'md',
    titleFontSize: 'md',
    descriptionFontSize: 'md',
    cardBorderRadius: 'xl',
    tiers: [
      {
        name: 'Basic',
        price: '$XX',
        frequency: '/month',
        description: 'Perfect for individuals getting started.',
        features: ['Feature one', 'Feature two', 'Feature three', 'Email support'],
        buttonText: 'Get Started',
        buttonLink: '#pricing',
        featured: false,
      },
      {
        name: 'Professional',
        price: '$XX',
        frequency: '/month',
        description: 'For growing businesses that need more.',
        features: ['Everything in Basic', 'Additional feature', 'Priority support', 'Custom options'],
        buttonText: 'Choose Plan',
        buttonLink: '#pricing',
        featured: true,
      },
      {
        name: 'Enterprise',
        price: 'Custom',
        frequency: '',
        description: 'For large organizations with custom needs.',
        features: ['Everything in Professional', 'Dedicated support', 'Custom integrations', 'SLA guarantee'],
        buttonText: 'Contact Us',
        buttonLink: 'mailto:sales@example.com',
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
    title: "Frequently Asked Questions",
    description: "Find answers to common questions. If you don't find what you're looking for, feel free to contact us.",
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
    title: "Get in Touch",
    description: "Have questions? We'd love to hear from you. Fill out the form and we'll get back to you soon.",
    namePlaceholder: "Your Name",
    emailPlaceholder: "your@email.com",
    companyPlaceholder: "Your Company",
    messagePlaceholder: "How can we help you?",
    buttonText: "Send Message",
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
    title: "Stay Updated",
    description: "Subscribe to our newsletter for the latest updates, tips, and exclusive offers.",
    placeholderText: "Enter your email",
    buttonText: "Subscribe",
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
    title: "Ready to Get Started?",
    description: "Take the next step. Join our community and start your journey today.",
    buttonText: "Start Now",
    titleFontSize: 'md',
    descriptionFontSize: 'md',
    colors: {
        background: '#0f172a',
        gradientStart: '#4f46e5',
        gradientEnd: '#10b981',
        text: 'rgba(255, 255, 255, 0.8)',
        heading: '#FFFFFF',
        buttonBackground: '#ffffff',
        buttonText: '#4f46e5',
    },
  },
  portfolio: {
    paddingY: 'lg',
    paddingX: 'md',
    title: "Our Work",
    description: "Take a look at some of our recent projects. We're proud of the work we do for our clients.",
    items: [
      {
        title: 'Project One',
        description: 'Brief description of this project and its goals.',
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='400' viewBox='0 0 500 400'%3E%3Crect fill='%234B5563' width='500' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E500 × 400%3C/text%3E%3C/svg%3E",
      },
      {
        title: 'Project Two',
        description: 'Highlight the key aspects of this project.',
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='400' viewBox='0 0 500 400'%3E%3Crect fill='%234B5563' width='500' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E500 × 400%3C/text%3E%3C/svg%3E",
      },
      {
        title: 'Project Three',
        description: 'Showcase another successful project.',
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
    title: "Our Services",
    description: "We offer a range of services to help you achieve your goals.",
    items: [
      {
        icon: 'code',
        title: 'Service One',
        description: 'Describe your first service offering and how it helps your customers.',
      },
      {
        icon: 'brush',
        title: 'Service Two',
        description: 'Explain your second service and the value it provides.',
      },
      {
        icon: 'megaphone',
        title: 'Service Three',
        description: 'Highlight your third service offering and its benefits.',
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
    title: "Meet Our Team",
    description: "Get to know the people behind our success.",
    items: [
      {
        name: 'Team Member',
        role: 'Position',
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%234B5563' width='400' height='400'/%3E%3Ccircle cx='200' cy='140' r='60' fill='%236B7280'/%3E%3Cellipse cx='200' cy='300' rx='90' ry='70' fill='%236B7280'/%3E%3C/svg%3E",
      },
      {
        name: 'Team Member',
        role: 'Position',
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%234B5563' width='400' height='400'/%3E%3Ccircle cx='200' cy='140' r='60' fill='%236B7280'/%3E%3Cellipse cx='200' cy='300' rx='90' ry='70' fill='%236B7280'/%3E%3C/svg%3E",
      },
      {
        name: 'Team Member',
        role: 'Position',
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%234B5563' width='400' height='400'/%3E%3Ccircle cx='200' cy='140' r='60' fill='%236B7280'/%3E%3Cellipse cx='200' cy='300' rx='90' ry='70' fill='%236B7280'/%3E%3C/svg%3E",
      },
      {
        name: 'Team Member',
        role: 'Position',
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
    title: "See It In Action",
    description: "Watch this short video to learn more about what we offer.",
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
    title: "How It Works",
    description: "Follow these simple steps to get started.",
    steps: 3,
    items: [
        { icon: 'upload', title: 'Step 1', description: 'Describe the first step of your process.' },
        { icon: 'process', title: 'Step 2', description: 'Explain what happens next.' },
        { icon: 'download', title: 'Step 3', description: 'Detail the third step.' },
        { icon: 'share', title: 'Step 4', description: 'Final step or outcome.' },
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
    title: "Find Us",
    description: "Visit our location. We're conveniently located and easy to find.",
    address: "123 Main Street, City, State 12345",
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
    title: "Our Menu",
    description: "Explore our offerings.",
    paddingY: 'lg',
    paddingX: 'md',
    items: [
      {
        name: 'Item One',
        description: 'Description of your first menu item.',
        price: '$XX.XX',
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%234B5563' width='600' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E600 × 400%3C/text%3E%3C/svg%3E",
        category: 'Category',
        isSpecial: true,
      },
      {
        name: 'Item Two',
        description: 'Description of your second menu item.',
        price: '$XX.XX',
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%234B5563' width='600' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E600 × 400%3C/text%3E%3C/svg%3E",
        category: 'Category',
        isSpecial: false,
      },
      {
        name: 'Item Three',
        description: 'Description of your third menu item.',
        price: '$XX.XX',
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%234B5563' width='600' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E600 × 400%3C/text%3E%3C/svg%3E",
        category: 'Category',
        isSpecial: true,
      },
      {
        name: 'Item Four',
        description: 'Description of your fourth menu item.',
        price: '$XX.XX',
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%234B5563' width='600' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E600 × 400%3C/text%3E%3C/svg%3E",
        category: 'Category',
        isSpecial: false,
      },
      {
        name: 'Item Five',
        description: 'Description of your fifth menu item.',
        price: '$XX.XX',
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%234B5563' width='600' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E600 × 400%3C/text%3E%3C/svg%3E",
        category: 'Category',
        isSpecial: true,
      },
      {
        name: 'Item Six',
        description: 'Description of your sixth menu item.',
        price: '$XX.XX',
        imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%234B5563' width='600' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E600 × 400%3C/text%3E%3C/svg%3E",
        category: 'Category',
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
    title: 'Your Brand',
    description: 'A brief description of your business goes here.',
    linkColumns: [
      {
        title: 'Quick Links',
        links: [
          { text: 'Home', href: '#' },
          { text: 'About', href: '#about' },
          { text: 'Contact', href: '#contact' },
        ],
      },
      {
        title: 'Resources',
        links: [
          { text: 'FAQ', href: '#faq' },
          { text: 'Support', href: '#' },
          { text: 'Blog', href: '#' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { text: 'Privacy Policy', href: '#' },
          { text: 'Terms of Service', href: '#' },
        ],
      },
    ],
    socialLinks: [
      { platform: 'twitter', href: '#' },
      { platform: 'github', href: '#' },
      { platform: 'facebook', href: '#' },
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
};

const theme: ThemeData = {
    cardBorderRadius: 'xl',
    buttonBorderRadius: 'xl',
    fontFamilyHeader: 'poppins',
    fontFamilyBody: 'mulish',
    fontFamilyButton: 'poppins',
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
    name: 'Your Business',
    industry: 'General',
    targetAudience: 'Your target customers',
    toneOfVoice: 'Professional',
    coreValues: 'Quality, Service, Trust',
    language: 'English',
};

const componentOrder: PageSection[] = ['colors', 'typography', 'header', 'hero', 'features', 'testimonials', 'slideshow', 'pricing', 'faq', 'portfolio', 'leads', 'newsletter', 'cta', 'services', 'team', 'video', 'howItWorks', 'map', 'menu', 'chatbot', 'footer'];

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
