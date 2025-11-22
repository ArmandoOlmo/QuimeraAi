
import { PageData, NavLink, ThemeData, PageSection, BrandIdentity } from '../types';

// FIX: Renamed original export to pageData and created a new initialData export structure
// that includes theme, componentOrder, and sectionVisibility to resolve type errors.
const pageData: PageData = {
  header: {
    style: 'sticky-transparent',
    layout: 'classic',
    isSticky: true,
    glassEffect: true,
    height: 80,
    logoType: 'text',
    logoText: 'Quimera.ai',
    logoImageUrl: '',
    logoWidth: 120,
    links: [
      { text: 'Features', href: '#features' },
      { text: 'Testimonials', href: '#testimonials' },
      { text: 'Pricing', href: '#pricing' },
    ] as NavLink[],
    hoverStyle: 'simple',
    ctaText: 'Get Started',
    showCta: true,
    showLogin: true,
    loginText: 'Log In',
    loginUrl: '#',
    colors: {
      background: 'rgba(15, 23, 42, 0.7)', // dark-900 with transparency
      text: '#E2E8F0', // slate-200
      accent: '#4f46e5',
    },
    buttonBorderRadius: 'xl',
  },
  hero: {
    paddingY: 'lg',
    paddingX: 'md',
    headline: "Create Stunning Visuals with <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary\">Quimera.ai</span>",
    subheadline: "Unlock your creative potential. Generate breathtaking, unique images with our cutting-edge AI technology. Perfect for designers, artists, and marketers.",
    primaryCta: "Start Generating",
    secondaryCta: "Learn More",
    imageUrl: "https://picsum.photos/id/10/800/600",
    imageStyle: 'default',
    imageDropShadow: true,
    imageBorderRadius: 'xl',
    imageBorderSize: 'sm',
    imageBorderColor: '#4f46e5',
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
    showBadge: true,
    badgeText: 'AI-Powered Generation',
    badgeIcon: '✨',
    badgeColor: '#4f46e5',
    badgeBackgroundColor: '#4f46e515',
    showStats: true,
    stats: [
      { value: '10K+', label: 'Artworks Created' },
      { value: '5K+', label: 'Happy Users' },
      { value: '4.9★', label: 'User Rating' }
    ],
    statsValueColor: '#4f46e5',
    statsLabelColor: '#94a3b8',
  },
  features: {
    paddingY: 'lg',
    paddingX: 'md',
    title: "Powerful Features, Effortless Creation",
    description: "Our Quimera.ai is packed with features designed to give you complete creative control with unparalleled ease of use.",
    items: [
      {
        title: 'Text-to-Image',
        description: 'Transform your words into vibrant, high-resolution images. Describe anything you can imagine, and watch it come to life.',
        imageUrl: 'https://picsum.photos/seed/feature1/500/300',
      },
      {
        title: 'Image Editing',
        description: 'Effortlessly edit and enhance your creations. Add elements, change styles, or upscale your images with simple text commands.',
        imageUrl: 'https://picsum.photos/seed/feature2/500/300',
      },
      {
        title: 'Diverse Styles',
        description: 'Explore a vast library of artistic styles, from photorealistic to anime, abstract, and more. Find the perfect look for your project.',
        imageUrl: 'https://picsum.photos/seed/feature3/500/300',
      },
    ],
    gridColumns: 3,
    imageHeight: 200,
    imageObjectFit: 'cover',
    colors: {
      background: '#0f172a',
      accent: '#4f46e5',
      borderColor: '#334155',
      text: '#94a3b8',
      heading: '#F9FAFB',
    },
  },
  testimonials: {
    paddingY: 'lg',
    paddingX: 'md',
    title: "Loved by Creatives Worldwide",
    description: "Don't just take our word for it. Here's what our users are saying about their experience with Quimera.ai.",
    titleFontSize: 'md',
    descriptionFontSize: 'md',
    borderRadius: 'xl',
    cardShadow: 'lg',
    borderStyle: 'solid',
    cardPadding: 32,
    items: [
      {
        quote: "Quimera.ai has completely transformed my workflow. I can now visualize concepts in seconds that used to take hours. It's an indispensable tool for any creative professional.",
        name: 'Alex Johnson',
        title: 'Lead Designer, Creative Inc.',
        avatar: 'https://picsum.photos/seed/alex/100/100',
      },
      {
        quote: "The quality of the images generated is simply astounding. I've used other AI tools, but nothing comes close to the detail and artistic flair of this platform.",
        name: 'Samantha Lee',
        title: 'Digital Artist & Illustrator',
        avatar: 'https://picsum.photos/seed/samantha/100/100',
      },
      {
        quote: "As a marketer, generating compelling visuals for campaigns is crucial. This tool gives me an endless supply of unique, high-quality images that make our brand stand out.",
        name: 'Michael Chen',
        title: 'Marketing Director, TechSavvy',
        avatar: 'https://picsum.photos/seed/michael/100/100',
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
    title: "Our Work in Pixels",
    paddingY: 'lg',
    paddingX: 'md',
    items: [
      { imageUrl: 'https://picsum.photos/seed/slide1/1200/800', altText: 'AI generated cityscape at night' },
      { imageUrl: 'https://picsum.photos/seed/slide2/1200/800', altText: 'AI generated abstract art' },
      { imageUrl: 'https://picsum.photos/seed/slide3/1200/800', altText: 'AI generated fantasy landscape' },
    ],
    colors: {
      background: '#1e293b', // bg-dark-800
      heading: '#F9FAFB',
    },
  },
  pricing: {
    title: "Choose Your Plan",
    description: "Simple, transparent pricing. No hidden fees. Choose the plan that's right for you and start creating today.",
    paddingY: 'lg',
    paddingX: 'md',
    titleFontSize: 'md',
    descriptionFontSize: 'md',
    cardBorderRadius: 'xl',
    tiers: [
      {
        name: 'Starter',
        price: '$29',
        frequency: '/month',
        description: 'For individuals and hobbyists getting started.',
        features: ['1,000 credits/month', 'Basic image generation', 'Standard resolution', 'Community support'],
        buttonText: 'Get Started',
        buttonLink: '#pricing',
        featured: false,
      },
      {
        name: 'Pro',
        price: '$99',
        frequency: '/month',
        description: 'For professionals and small teams who need more power.',
        features: ['5,000 credits/month', 'Advanced generation tools', 'High-resolution images', 'Priority support', 'Commercial license'],
        buttonText: 'Choose Pro',
        buttonLink: '#pricing',
        featured: true,
      },
      {
        name: 'Enterprise',
        price: 'Custom',
        frequency: '',
        description: 'For large organizations with custom needs.',
        features: ['Unlimited credits', 'Custom model training', 'API access', 'Dedicated support', 'Team management'],
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
    }
  },
  faq: {
    title: "Frequently Asked Questions",
    description: "Have questions? We've got answers. If you can't find what you're looking for, feel free to contact us.",
    paddingY: 'lg',
    paddingX: 'md',
    items: [
      {
        question: "How does the text-to-image generation work?",
        answer: "Our AI model has been trained on a massive dataset of images and text descriptions. When you provide a text prompt, the AI uses its understanding of this data to generate a unique image that matches your description. It's a blend of art and complex algorithms."
      },
      {
        question: "What kind of images can I create?",
        answer: "Virtually anything you can imagine! From photorealistic portraits and landscapes to abstract art, anime characters, and technical diagrams. The more descriptive your prompt, the more detailed the result will be."
      },
      {
        question: "Can I use the generated images commercially?",
        answer: "Yes, with our Pro and Enterprise plans, you receive a full commercial license for any images you create. The Starter plan is limited to personal, non-commercial use."
      },
      {
        question: "What are credits and how are they used?",
        answer: "Credits are used to perform actions on our platform. One standard image generation costs one credit. More complex tasks, like upscaling or advanced editing, may cost more. Your monthly credits reset at the start of your billing cycle."
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
    title: "Let's Get in Touch",
    description: "Fill out the form below and we'll get back to you as soon as possible. We're excited to hear about your project!",
    namePlaceholder: "Your Full Name",
    emailPlaceholder: "your.email@example.com",
    companyPlaceholder: "Your Company Name",
    messagePlaceholder: "Tell us about your project...",
    buttonText: "Send Message",
    paddingY: 'lg',
    paddingX: 'md',
    colors: {
      background: '#0f172a',
      accent: '#4f46e5',
      borderColor: '#334155',
      text: '#94a3b8',
      heading: '#F9FAFB',
      buttonBackground: '#4f46e5',
      buttonText: '#ffffff',
    },
  },
  newsletter: {
    title: "Join Our Newsletter",
    description: "Stay up to date with the latest features, news, and special offers from Quimera.ai.",
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
    },
  },
  cta: {
    paddingY: 'lg',
    paddingX: 'md',
    title: "Ready to Create?",
    description: "Join thousands of creators and start bringing your ideas to life today. No credit card required to start.",
    buttonText: "Start for Free",
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
    title: "Our Recent Work",
    description: "Here are a few projects we're proud of. We're passionate about creating beautiful and functional digital experiences.",
    items: [
      {
        title: 'Project Alpha',
        description: 'A complete branding and website overhaul for a leading tech startup.',
        imageUrl: 'https://picsum.photos/seed/projectalpha/500/400',
      },
      {
        title: 'Project Beta',
        description: 'An innovative e-commerce platform with a focus on user experience.',
        imageUrl: 'https://picsum.photos/seed/projectbeta/500/400',
      },
      {
        title: 'Project Gamma',
        description: 'A mobile application designed to connect local communities.',
        imageUrl: 'https://picsum.photos/seed/projectgamma/500/400',
      },
    ],
    colors: {
      background: '#0f172a',
      accent: '#4f46e5',
      borderColor: '#334155',
      text: '#94a3b8',
      heading: '#F9FAFB',
    },
  },
  services: {
    paddingY: 'lg',
    paddingX: 'md',
    title: "What We Offer",
    description: "We provide a wide range of services to help you achieve your goals. Our team is dedicated to delivering high-quality results.",
    items: [
      {
        icon: 'code',
        title: 'Web Development',
        description: 'Building modern, responsive, and high-performance websites from the ground up to meet your specific business needs.',
      },
      {
        icon: 'brush',
        title: 'UI/UX Design',
        description: 'Crafting intuitive and beautiful user interfaces that provide an exceptional user experience and drive engagement.',
      },
      {
        icon: 'megaphone',
        title: 'Digital Marketing',
        description: 'Creating and executing strategic marketing campaigns to boost your online presence and grow your audience.',
      },
    ],
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
    description: "The talented individuals behind our success. We're a group of passionate creators, thinkers, and innovators.",
    items: [
      {
        name: 'Jane Doe',
        role: 'Founder & CEO',
        imageUrl: 'https://picsum.photos/seed/team1/400/400',
      },
      {
        name: 'John Smith',
        role: 'Lead Developer',
        imageUrl: 'https://picsum.photos/seed/team2/400/400',
      },
      {
        name: 'Emily White',
        role: 'Head of Design',
        imageUrl: 'https://picsum.photos/seed/team3/400/400',
      },
      {
        name: 'Michael Brown',
        role: 'Marketing Specialist',
        imageUrl: 'https://picsum.photos/seed/team4/400/400',
      },
    ],
    colors: {
      background: '#0f172a',
      text: '#94a3b8',
      heading: '#F9FAFB',
    },
  },
  video: {
    paddingY: 'lg',
    paddingX: 'md',
    title: "See Our Product in Action",
    description: "A picture is worth a thousand words, but a video is worth a million. Watch this short demo to see how our product can help you.",
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
    description: "Follow these simple steps to get started and bring your ideas to life.",
    steps: 3,
    items: [
        { icon: 'upload', title: 'Step 1: Upload', description: 'Start by uploading your document or image.' },
        { icon: 'process', title: 'Step 2: AI Magic', description: 'Our AI processes and enhances your content.' },
        { icon: 'download', title: 'Step 3: Download', description: 'Download your new and improved file.' },
        { icon: 'share', title: 'Step 4: Share', description: 'Share your creation with the world.' },
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
    placeholderText: "Ask me anything about our business...",
    knowledgeBase: "This is a website for Quimera.ai, an AI website builder. We help people build stunning websites in minutes.",
    position: 'bottom-right',
    colors: {
        primary: '#4f46e5',
        text: '#ffffff',
        background: '#0f172a'
    }
  },
  footer: {
    title: 'Quimera.ai',
    description: 'AI-powered design at the speed of thought. Create stunning visuals instantly.',
    linkColumns: [
      {
        title: 'Product',
        links: [
          { text: 'Features', href: '#features' },
          { text: 'Pricing', href: '#pricing' },
          { text: 'API', href: '#' },
        ],
      },
      {
        title: 'Company',
        links: [
          { text: 'About Us', href: '#' },
          { text: 'Careers', href: '#' },
          { text: 'Contact', href: '#contact' },
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
    copyrightText: '© {YEAR} Quimera.ai. All rights reserved.',
    colors: {
      background: '#1e293b', // bg-dark-800
      border: '#334155', // border-dark-700
      text: '#94a3b8', // text-slate-400
      linkHover: '#4f46e5', // hover:text-primary
      heading: '#F9FAFB',
    },
  },
};

const theme: ThemeData = {
    cardBorderRadius: 'xl',
    buttonBorderRadius: 'xl',
    fontFamilyHeader: 'poppins',
    fontFamilyBody: 'mulish',
    fontFamilyButton: 'poppins',
};

const brandIdentity: BrandIdentity = {
    name: 'My Business',
    industry: 'Technology',
    targetAudience: 'Small business owners and creators',
    toneOfVoice: 'Professional',
    coreValues: 'Innovation, Speed, Reliability',
    language: 'English',
};

const componentOrder: PageSection[] = ['hero', 'features', 'testimonials', 'slideshow', 'pricing', 'faq', 'portfolio', 'leads', 'newsletter', 'cta', 'services', 'team', 'video', 'howItWorks', 'chatbot', 'footer'];

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
