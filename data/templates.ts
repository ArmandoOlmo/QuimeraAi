
import { initialData } from './initialData';
import { Project, PageSection } from '../types';

const ALL_SECTIONS: PageSection[] = ['hero', 'features', 'services', 'howItWorks', 'team', 'video', 'testimonials', 'slideshow', 'pricing', 'faq', 'portfolio', 'leads', 'newsletter', 'cta', 'footer'];
const ALL_SECTIONS_VISIBLE = ALL_SECTIONS.reduce((acc, section) => {
    acc[section] = true;
    return acc;
}, {} as Record<PageSection, boolean>);

export const initialProjects: Project[] = [
  // 1. Restaurant Template
  {
    id: 'template-restaurant',
    name: 'Savor & Vine',
    thumbnailUrl: 'https://picsum.photos/seed/restaurant_thumb/800/600',
    status: 'Template',
    lastUpdated: 'Featured',
    isArchived: false,
    brandIdentity: {
        name: 'Savor & Vine',
        industry: 'Hospitality & Dining',
        targetAudience: 'Food enthusiasts, couples, families',
        toneOfVoice: 'Luxury',
        coreValues: 'Authenticity, Taste, Atmosphere',
        language: 'English',
    },
    componentOrder: ['hero', 'features', 'services', 'video', 'slideshow', 'team', 'pricing', 'testimonials', 'faq', 'newsletter', 'leads', 'cta', 'footer'],
    sectionVisibility: ALL_SECTIONS_VISIBLE,
    theme: {
      cardBorderRadius: 'md',
      buttonBorderRadius: 'full',
      fontFamilyHeader: 'playfair-display',
      fontFamilyBody: 'lato',
      fontFamilyButton: 'lato',
    },
    imagePrompts: {
        'hero.imageUrl': 'High-end restaurant interior, warm cinematic lighting, beautifully plated gourmet dish in foreground, luxury dining atmosphere',
        'services.items.0.imageUrl': 'Close up food photography of Truffle Risotto, creamy texture, steam rising, professional culinary art',
        'services.items.1.imageUrl': 'Pan-Seared Scallops on a white plate, garnished with lemon and herbs, restaurant lighting',
        'services.items.2.imageUrl': 'Premium Wagyu Beef steak grilled to perfection, roasted vegetables, moody elegant lighting',
        'slideshow.items.0.imageUrl': 'Elegant restaurant dining room, empty tables with white cloths, wine glasses, evening ambiance, cozy fireplace',
        'slideshow.items.1.imageUrl': 'Chef plating a complex dessert, chocolate and gold leaf, focus on hands and food, professional kitchen background blur',
        'slideshow.items.2.imageUrl': 'Sommelier pouring red wine into a crystal glass, elegant setting, focus on the liquid motion',
        'testimonials.items.0.avatar': 'Professional headshot of a food critic, woman in her 40s, stylish glasses, confident smile',
        'testimonials.items.1.avatar': 'Headshot of a happy male diner, casual chic attire, warm smile',
        'testimonials.items.2.avatar': 'Headshot of a female sommelier, holding a wine glass, professional attire',
        'team.items.0.imageUrl': 'Headshot of executive chef, chef coat, arms crossed, confident, kitchen background',
        'team.items.1.imageUrl': 'Headshot of sous chef, chopping herbs, action shot',
        'team.items.2.imageUrl': 'Headshot of restaurant manager, welcoming smile, suit',
        'team.items.3.imageUrl': 'Headshot of pastry chef, holding a dessert',
        'video.videoUrl': '', // Placeholder or upload
    },
    data: {
      ...initialData.data,
      header: {
        style: 'sticky-transparent', layout: 'center', isSticky: true, glassEffect: true, height: 100, logoType: 'text', logoText: 'Savor & Vine', logoImageUrl: '', logoWidth: 120,
        links: [{ text: 'Menu', href: '#services' }, { text: 'Gallery', href: '#slideshow' }, { text: 'Reservations', href: '#leads' }],
        hoverStyle: 'bracket',
        ctaText: 'Book a Table', showCta: true, colors: { background: 'rgba(20, 10, 5, 0.85)', text: '#FFF8E1', accent: '#D4A373' }, buttonBorderRadius: 'full',
        showLogin: false, loginText: 'Log In', loginUrl: '#'
      },
      hero: {
        headline: 'A Culinary Journey <span>For The Senses</span>',
        subheadline: 'Experience farm-to-table dining where fresh, local ingredients are crafted into unforgettable meals. A cozy atmosphere for any occasion.',
        primaryCta: 'View Menu', secondaryCta: 'Reservations', imageUrl: '',
        imageStyle: 'glow', imageDropShadow: true, imageBorderRadius: 'md', imageBorderSize: 'none', imageBorderColor: '#FFFFFF',
        imageJustification: 'center', imagePosition: 'right', 
        imageWidth: 100, imageHeight: 600, imageHeightEnabled: true, imageAspectRatio: '16:9', imageObjectFit: 'cover',
        paddingY: 'lg', paddingX: 'md', sectionBorderSize: 'none', sectionBorderColor: '#3E2723',
        colors: { primary: '#D4A373', secondary: '#FAEDCD', background: '#18100A', text: '#Eaddcf', heading: '#FAEDCD' },
      },
      features: {
        title: "Why Dine With Us",
        description: "We believe in more than just food; we believe in an experience.",
        paddingY: 'lg', paddingX: 'md',
        items: [
            { title: "Farm to Table", description: "Ingredients sourced daily from local organic farms.", imageUrl: "" },
            { title: "Award Winning Wine", description: "A cellar with over 500 vintage selections.", imageUrl: "" },
            { title: "Private Dining", description: "Exclusive rooms for your special events.", imageUrl: "" }
        ],
        gridColumns: 3, imageHeight: 250, imageObjectFit: 'cover',
        colors: { background: '#18100A', accent: '#D4A373', borderColor: '#3E2723', text: '#Eaddcf', heading: '#FAEDCD' }
      },
      services: { // Menu Highlights
        title: 'Signature Dishes', description: 'A selection of our chef\'s most celebrated creations.', paddingY: 'lg', paddingX: 'md',
        items: [
          { icon: 'brush', title: 'Truffle Risotto', description: 'Creamy arborio rice infused with black truffle oil and topped with parmesan crisp.' },
          { icon: 'code', title: 'Pan-Seared Scallops', description: 'Jumbo scallops served over a bed of cauliflower purée with lemon butter sauce.' },
          { icon: 'megaphone', title: 'Wagyu Beef', description: 'Premium A5 Wagyu grilled to perfection, served with roasted vegetables.' },
        ],
        colors: { background: '#241A15', accent: '#D4A373', borderColor: '#3E2723', text: '#Eaddcf', heading: '#FAEDCD' },
      },
      slideshow: {
        title: 'Ambiance & Plating', paddingY: 'lg', paddingX: 'md',
        items: [
          { imageUrl: '', altText: 'Elegant dining room' },
          { imageUrl: '', altText: 'Beautifully plated dessert' },
          { imageUrl: '', altText: 'Sommelier pouring wine' },
        ],
        colors: { background: '#18100A', heading: '#FAEDCD' },
      },
      team: {
          title: 'Meet the Kitchen', description: 'The masters behind the magic.', paddingY: 'lg', paddingX: 'md',
          items: [
              { name: 'Marco Rossi', role: 'Executive Chef', imageUrl: '' },
              { name: 'Julia Childers', role: 'Sous Chef', imageUrl: '' },
              { name: 'Henri V', role: 'Sommelier', imageUrl: '' },
              { name: 'Sophie D', role: 'Pastry Chef', imageUrl: '' }
          ],
          colors: { background: '#241A15', text: '#Eaddcf', heading: '#FAEDCD' }
      },
      pricing: {
          title: 'Tasting Menus', description: 'Curated experiences for the adventurous palate.', paddingY: 'lg', paddingX: 'md',
          tiers: [
              { name: 'The Classic', price: '$85', frequency: '/person', description: '3 Courses + Wine Pairing', features: ['Appetizer', 'Main Course', 'Dessert', 'House Wine'], buttonText: 'Book Now', featured: false },
              { name: 'The Chef\'s Table', price: '$150', frequency: '/person', description: '7 Courses + Premium Wine', features: ['Amuse-bouche', 'Fish & Meat', 'Cheese Platter', 'Reserve Wine'], buttonText: 'Book Now', featured: true },
              { name: 'Vegetarian', price: '$75', frequency: '/person', description: 'Plant-based excellence', features: ['Seasonal Salad', 'Vegetable Risotto', 'Fruit Sorbet', 'Herbal Tea'], buttonText: 'Book Now', featured: false }
          ],
          colors: { background: '#18100A', accent: '#D4A373', borderColor: '#3E2723', text: '#Eaddcf', heading: '#FAEDCD', buttonBackground: '#D4A373', buttonText: '#000000' }
      },
      testimonials: {
        title: 'Guest Experiences', description: 'Hear what our patrons have to say.', paddingY: 'md', paddingX: 'md',
        items: [
          { quote: "The best dining experience I've had in years. The ambiance is unmatched.", name: 'Eleanor R.', title: 'Food Critic', avatar: '' },
          { quote: "Exquisite flavors and impeccable service. Perfect for our anniversary.", name: 'James T.', title: 'Guest', avatar: '' },
          { quote: "The wine pairing was spot on. Highly recommend the tasting menu.", name: 'Sarah L.', title: 'Sommelier', avatar: '' },
        ],
        colors: { background: '#241A15', accent: '#D4A373', borderColor: '#3E2723', text: '#Eaddcf', heading: '#FAEDCD' },
      },
      video: {
          title: 'Behind the Scenes', description: 'Watch our kitchen in action during Friday night service.', source: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false, loop: true, showControls: true, paddingY: 'lg', paddingX: 'md',
          colors: { background: '#18100A', text: '#Eaddcf', heading: '#FAEDCD' }
      },
      faq: {
          title: 'Dining Information', description: 'Know before you go.', paddingY: 'md', paddingX: 'md',
          items: [
              { question: "Do you have a dress code?", answer: "We recommend smart casual. No flip-flops or beachwear." },
              { question: "Are children allowed?", answer: "We welcome children over the age of 8." },
              { question: "Do you cater to allergies?", answer: "Yes, please inform your server upon arrival." }
          ],
          colors: { background: '#241A15', accent: '#D4A373', borderColor: '#3E2723', text: '#Eaddcf', heading: '#FAEDCD' }
      },
      leads: { // Reservations
        title: 'Reserve Your Table', description: 'Join us for an unforgettable evening. For parties of 8 or more, please call.',
        namePlaceholder: 'Name', emailPlaceholder: 'Email', companyPlaceholder: 'Date & Time', messagePlaceholder: 'Special Requests / Allergies', buttonText: 'Request Reservation',
        paddingY: 'lg', paddingX: 'md',
        colors: { background: '#18100A', accent: '#D4A373', borderColor: '#3E2723', text: '#Eaddcf', heading: '#FAEDCD' },
      },
      newsletter: {
          title: 'Join the Culinary Club', description: 'Get invites to exclusive wine tastings and seasonal menu launches.', placeholderText: 'Email Address', buttonText: 'Subscribe', paddingY: 'md', paddingX: 'md',
          colors: { background: '#241A15', accent: '#D4A373', borderColor: '#3E2723', text: '#Eaddcf', heading: '#FAEDCD' }
      },
      cta: {
        title: 'Taste the Extraordinary', description: 'Open Tuesday - Sunday, 5pm - 11pm.',
        buttonText: 'View Full Menu', paddingY: 'lg', paddingX: 'md',
        colors: { gradientStart: '#18100A', gradientEnd: '#3E2723', text: '#D4A373', heading: '#FAEDCD' },
      },
      footer: {
        ...initialData.data.footer,
        title: 'Savor & Vine',
        description: 'Fine dining in the heart of the city.',
        copyrightText: '© {YEAR} Savor & Vine.',
        colors: { background: '#0D0805', border: '#241A15', text: '#9ca3af', linkHover: '#D4A373', heading: '#FAEDCD' }
      },
    },
  },

  // 2. Law Firm Template
  {
    id: 'template-law-firm',
    name: 'Justice & Partners',
    thumbnailUrl: 'https://picsum.photos/seed/law_thumb/800/600',
    status: 'Template',
    lastUpdated: 'Featured',
    isArchived: false,
    brandIdentity: {
        name: 'Justice & Partners',
        industry: 'Legal',
        targetAudience: 'Corporate clients, individuals in need of defense',
        toneOfVoice: 'Professional',
        coreValues: 'Integrity, Experience, Justice',
        language: 'English',
    },
    componentOrder: ['hero', 'features', 'services', 'video', 'team', 'testimonials', 'howItWorks', 'faq', 'leads', 'newsletter', 'cta', 'footer'],
    sectionVisibility: ALL_SECTIONS_VISIBLE,
    theme: {
      cardBorderRadius: 'none',
      buttonBorderRadius: 'none',
      fontFamilyHeader: 'merriweather',
      fontFamilyBody: 'open-sans',
      fontFamilyButton: 'open-sans',
    },
    imagePrompts: {
        'hero.imageUrl': 'Grand neoclassical courthouse columns, low angle view, symbolizing strength and justice, marble texture, golden hour sunlight',
        'features.items.0.imageUrl': 'Modern corporate office boardroom, glass walls, city skyline view, professional business meeting setting',
        'features.items.1.imageUrl': 'Warm family home interior, soft lighting, happy family silhouette in background, symbolizing protection and care',
        'features.items.2.imageUrl': 'Gavel on a wooden judge desk, scales of justice in background, dramatic lighting, focus on law',
        'team.items.0.imageUrl': 'Professional headshot of senior male lawyer, suit and tie, confident expression, library background',
        'team.items.1.imageUrl': 'Professional headshot of female managing partner, formal business attire, confident, modern office background',
        'team.items.2.imageUrl': 'Professional headshot of young male associate lawyer, suit, eager and sharp, blurred office background',
        'team.items.3.imageUrl': 'Professional headshot of female paralegal, smart business casual, organized desk background',
        'testimonials.items.0.avatar': 'Headshot of a middle-aged business owner, suit, confident',
        'testimonials.items.1.avatar': 'Headshot of a woman, calm and relieved expression',
        'testimonials.items.2.avatar': 'Headshot of a male CEO, modern casual business look',
        'header.logoImageUrl': 'Law firm logo, scales of justice icon, gold color on dark background, vector style'
    },
    data: {
      ...initialData.data,
      header: {
        style: 'sticky-solid', layout: 'classic', isSticky: true, glassEffect: false, height: 90, logoType: 'both', logoText: 'Justice & Partners', logoImageUrl: '', logoWidth: 50,
        links: [{ text: 'Practice Areas', href: '#features' }, { text: 'Attorneys', href: '#team' }, { text: 'FAQ', href: '#faq' }],
        hoverStyle: 'underline',
        ctaText: 'Free Consultation', showCta: true, colors: { background: '#0f172a', text: '#ffffff', accent: '#c29d59' }, buttonBorderRadius: 'none',
        showLogin: true, loginText: 'Client Portal', loginUrl: '#'
      },
      hero: {
        headline: 'Unwavering Dedication to <span>Your Rights</span>',
        subheadline: 'With over 30 years of combined experience, we provide aggressive representation and strategic legal counsel for complex cases.',
        primaryCta: 'Case Evaluation', secondaryCta: 'Our Firm', imageUrl: '',
        imageStyle: 'default', imageDropShadow: false, imageBorderRadius: 'none', imageBorderSize: 'none', imageBorderColor: 'transparent',
        imageJustification: 'end', imagePosition: 'right',
        imageWidth: 100, imageHeight: 550, imageHeightEnabled: true, imageAspectRatio: '4:3', imageObjectFit: 'cover',
        paddingY: 'lg', paddingX: 'md', sectionBorderSize: 'none', sectionBorderColor: 'transparent',
        colors: { primary: '#c29d59', secondary: '#94a3b8', background: '#ffffff', text: '#0f172a', heading: '#0f172a' },
      },
      features: { // Practice Areas
        title: 'Areas of Practice', description: 'Comprehensive legal solutions tailored to your specific needs.', paddingY: 'lg', paddingX: 'md',
        items: [
          { title: 'Corporate Law', description: 'Mergers, acquisitions, and contract negotiation for businesses.', imageUrl: '' },
          { title: 'Family Law', description: 'Compassionate guidance through divorce, custody, and estate planning.', imageUrl: '' },
          { title: 'Criminal Defense', description: 'Protecting your rights and freedom with vigorous defense strategies.', imageUrl: '' },
        ],
        gridColumns: 3, imageHeight: 220, imageObjectFit: 'cover',
        colors: { background: '#f8fafc', accent: '#c29d59', borderColor: '#e2e8f0', text: '#334155', heading: '#0f172a' },
      },
      services: {
          title: 'Our Services', description: 'Legal excellence in every field.', paddingY: 'md', paddingX: 'md',
          items: [
              { icon: 'code', title: 'Litigation', description: 'Representing you in court with unparalleled expertise.' },
              { icon: 'brush', title: 'Mediation', description: 'Resolving disputes efficiently outside the courtroom.' },
              { icon: 'megaphone', title: 'Consulting', description: 'Strategic advice for businesses and individuals.' }
          ],
          colors: { background: '#ffffff', accent: '#c29d59', borderColor: '#e2e8f0', text: '#0f172a', heading: '#0f172a' }
      },
      video: {
          title: 'The Justice Standard', description: 'Meet the team dedicated to your success.', source: 'upload', videoId: '', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', autoplay: false, loop: false, showControls: true, paddingY: 'lg', paddingX: 'md',
          colors: { background: '#f8fafc', text: '#0f172a', heading: '#0f172a' }
      },
      team: {
        title: 'Our Attorneys', description: 'Meet the experts fighting for you.', paddingY: 'lg', paddingX: 'md',
        items: [
          { name: 'Robert Specter', role: 'Senior Partner', imageUrl: '' },
          { name: 'Jessica Pearson', role: 'Managing Partner', imageUrl: '' },
          { name: 'Michael Ross', role: 'Associate', imageUrl: '' },
          { name: 'Rachel Zane', role: 'Paralegal', imageUrl: '' },
        ],
        colors: { background: '#ffffff', text: '#0f172a', heading: '#0f172a' },
      },
      testimonials: {
        title: 'Client Testimonials', description: 'We let our record speak for itself.', paddingY: 'lg', paddingX: 'md',
        items: [
          { quote: "They handled my case with professionalism and achieved a result better than I expected.", name: 'John D.', title: 'Business Owner', avatar: '' },
          { quote: "Responsive, knowledgeable, and empathetic. I felt supported every step of the way.", name: 'Sarah M.', title: 'Client', avatar: '' },
          { quote: "Top-tier legal representation. Worth every penny for the peace of mind.", name: 'David K.', title: 'CEO', avatar: '' },
        ],
        colors: { background: '#0f172a', accent: '#c29d59', borderColor: '#334155', text: '#f1f5f9', heading: '#ffffff' },
      },
      howItWorks: {
          title: 'Our Process', description: 'From consultation to resolution.', steps: 3,
          items: [
              { icon: 'search', title: 'Consultation', description: 'We review your case details.' },
              { icon: 'process', title: 'Strategy', description: 'We build a winning legal strategy.' },
              { icon: 'share', title: 'Resolution', description: 'We fight for the best outcome.' }
          ],
          paddingY: 'lg', paddingX: 'md',
          colors: { background: '#f8fafc', accent: '#c29d59', text: '#0f172a', heading: '#0f172a' }
      },
      faq: {
        title: 'Legal FAQ', description: 'Common questions about our process.', paddingY: 'md', paddingX: 'md',
        items: [
            { question: 'Do you offer free consultations?', answer: 'Yes, we offer a complimentary initial consultation to assess your case.' },
            { question: 'How do you charge for services?', answer: 'We work on both hourly rates and contingency fees, depending on the case type.' },
        ],
        colors: { background: '#ffffff', accent: '#c29d59', borderColor: '#e2e8f0', text: '#334155', heading: '#0f172a' }
      },
      leads: {
        title: 'Contact Us Today', description: 'Complete the form for a confidential review of your case.',
        namePlaceholder: 'Full Name', emailPlaceholder: 'Email Address', companyPlaceholder: 'Phone Number', messagePlaceholder: 'Brief details about your legal matter...', buttonText: 'Submit for Review',
        paddingY: 'lg', paddingX: 'md',
        colors: { background: '#f8fafc', accent: '#0f172a', borderColor: '#e2e8f0', text: '#334155', heading: '#0f172a' },
      },
      newsletter: {
          title: 'Legal Insights', description: 'Subscribe for the latest legal news and firm updates.', placeholderText: 'Email address', buttonText: 'Subscribe', paddingY: 'md', paddingX: 'md',
          colors: { background: '#0f172a', accent: '#c29d59', borderColor: '#334155', text: '#ffffff', heading: '#ffffff' }
      },
      cta: {
        title: 'Justice Delayed is Justice Denied', description: 'Do not wait. Secure the legal representation you deserve.',
        buttonText: 'Call Now: (555) 999-8888', paddingY: 'lg', paddingX: 'md',
        colors: { gradientStart: '#0f172a', gradientEnd: '#1e293b', text: '#c29d59', heading: '#ffffff' },
      },
      footer: {
        ...initialData.data.footer,
        title: 'Justice & Partners',
        copyrightText: '© {YEAR} Justice & Partners. Attorney Advertising.',
        colors: { background: '#0f172a', border: '#334155', text: '#94a3b8', linkHover: '#c29d59', heading: '#ffffff' }
      },
    },
  },

  // 3. Gym Template
  {
    id: 'template-gym',
    name: 'Iron Pulse Fitness',
    thumbnailUrl: 'https://picsum.photos/seed/gym_thumb/800/600',
    status: 'Template',
    lastUpdated: 'Featured',
    isArchived: false,
    brandIdentity: {
        name: 'Iron Pulse Fitness',
        industry: 'Health & Fitness',
        targetAudience: 'Athletes, fitness enthusiasts',
        toneOfVoice: 'Urgent',
        coreValues: 'Strength, Discipline, Community',
        language: 'English',
    },
    componentOrder: ['hero', 'features', 'services', 'video', 'slideshow', 'team', 'pricing', 'testimonials', 'faq', 'leads', 'newsletter', 'cta', 'footer'],
    sectionVisibility: ALL_SECTIONS_VISIBLE,
    theme: {
      cardBorderRadius: 'none',
      buttonBorderRadius: 'none',
      fontFamilyHeader: 'oswald',
      fontFamilyBody: 'roboto',
      fontFamilyButton: 'oswald',
    },
    imagePrompts: {
        'hero.imageUrl': 'Intense gym atmosphere, athlete lifting heavy weights, chalk dust in air, dramatic neon green and black lighting, high contrast, sweat texture',
        'features.items.0.imageUrl': 'Group of people doing HIIT workout, sprinting, high energy, blur motion, gym background',
        'features.items.1.imageUrl': 'Powerlifter performing a deadlift, heavy plates, focused expression, moody lighting',
        'features.items.2.imageUrl': 'Yoga session in a modern gym studio, stretching, mobility, calm but strong atmosphere',
        'team.items.0.imageUrl': 'Headshot of muscular male gym coach, arms crossed, intense look, gym background',
        'team.items.1.imageUrl': 'Headshot of female CrossFit trainer, athletic build, ponytail, smiling confidently',
        'team.items.2.imageUrl': 'Headshot of male strength coach, holding a clipboard, focused',
        'team.items.3.imageUrl': 'Headshot of female mobility specialist, yoga attire, relaxed pose',
    },
    data: {
      ...initialData.data,
      header: {
        style: 'floating', layout: 'minimal', isSticky: true, glassEffect: true, height: 80, logoType: 'text', logoText: 'IRON PULSE', logoImageUrl: '', logoWidth: 100,
        links: [{ text: 'Classes', href: '#features' }, { text: 'Trainers', href: '#team' }, { text: 'Membership', href: '#pricing' }],
        hoverStyle: 'highlight',
        ctaText: 'Join Now', showCta: true, colors: { background: '#000000', text: '#ffffff', accent: '#ccff00' }, buttonBorderRadius: 'none',
        showLogin: true, loginText: 'Member Login', loginUrl: '#'
      },
      hero: {
        headline: 'Forged in <span style="color:#ccff00">Sweat</span>. Built for <span style="color:#ccff00">Strength</span>.',
        subheadline: 'The premier high-performance training facility. Elite equipment, expert coaching, and an atmosphere that demands your best.',
        primaryCta: 'Start Free Trial', secondaryCta: 'View Schedule', imageUrl: '',
        imageStyle: 'default', imageDropShadow: false, imageBorderRadius: 'none', imageBorderSize: 'none', imageBorderColor: 'transparent',
        imageJustification: 'center', imagePosition: 'right',
        imageWidth: 100, imageHeight: 700, imageHeightEnabled: false, imageAspectRatio: '16:9', imageObjectFit: 'cover',
        paddingY: 'lg', paddingX: 'lg', sectionBorderSize: 'none', sectionBorderColor: 'transparent',
        colors: { primary: '#ccff00', secondary: '#ffffff', background: '#000000', text: '#d4d4d8', heading: '#ffffff' },
      },
      features: { // Classes
        title: 'Training Programs', description: 'Push your limits with our varied class selection.', paddingY: 'lg', paddingX: 'md',
        items: [
          { title: 'HIIT', description: 'High-intensity interval training to burn fat and build endurance.', imageUrl: '' },
          { title: 'Powerlifting', description: 'Focus on the big three: Squat, Bench, and Deadlift.', imageUrl: '' },
          { title: 'Mobility', description: 'Improve flexibility and recovery to prevent injury.', imageUrl: '' },
        ],
        gridColumns: 3, imageHeight: 250, imageObjectFit: 'cover',
        colors: { background: '#0a0a0a', accent: '#ccff00', borderColor: '#27272a', text: '#a1a1aa', heading: '#ffffff' },
      },
      services: {
          title: 'Amenities', description: 'Everything you need to succeed.', paddingY: 'md', paddingX: 'md',
          items: [
              { icon: 'brush', title: 'Sauna & Steam', description: 'Recover faster with heat therapy.' },
              { icon: 'scissors', title: 'Towel Service', description: 'Fresh towels every workout.' },
              { icon: 'chart', title: 'Juice Bar', description: 'Post-workout protein shakes and smoothies.' }
          ],
          colors: { background: '#000000', accent: '#ccff00', borderColor: '#27272a', text: '#ffffff', heading: '#ffffff' }
      },
      slideshow: {
          title: 'The Iron Grounds', paddingY: 'md', paddingX: 'md',
          items: [
              { imageUrl: '', altText: 'Main weight room' },
              { imageUrl: '', altText: 'Cardio deck' },
              { imageUrl: '', altText: 'Locker rooms' }
          ],
          colors: { background: '#0a0a0a', heading: '#ffffff' }
      },
      pricing: {
        title: 'Membership Options', description: 'No contracts. Just results.', paddingY: 'lg', paddingX: 'md',
        tiers: [
            { name: 'Day Pass', price: '$15', frequency: '/day', description: 'Access for one day.', features: ['Full Gym Access', 'Locker Room'], buttonText: 'Buy Pass', featured: false },
            { name: 'Unlimited', price: '$59', frequency: '/month', description: 'Total access, anytime.', features: ['24/7 Access', 'All Classes', 'Guest Privileges', 'Free Saunas'], buttonText: 'Join Now', featured: true },
            { name: 'Personal Training', price: '$199', frequency: '/month', description: 'Includes 4 sessions.', features: ['Unlimited Membership', '4 PT Sessions', 'Nutrition Plan'], buttonText: 'Get Started', featured: false },
        ],
        colors: { background: '#000000', accent: '#ccff00', borderColor: '#333', text: '#ffffff', heading: '#ffffff' }
      },
      team: {
        title: 'Elite Coaches', description: 'Train with the best.', paddingY: 'lg', paddingX: 'md',
        items: [
          { name: 'Jax', role: 'Head Coach', imageUrl: '' },
          { name: 'Sarah', role: 'CrossFit Pro', imageUrl: '' },
          { name: 'Mike', role: 'Strength Coach', imageUrl: '' },
          { name: 'Lisa', role: 'Mobility Specialist', imageUrl: '' },
        ],
        colors: { background: '#0a0a0a', text: '#ffffff', heading: '#ffffff' },
      },
      testimonials: {
          title: 'Real Results', description: 'Our members crush their goals.', paddingY: 'md', paddingX: 'md',
          items: [
              { quote: "Lost 20lbs in 3 months. The community here keeps me going.", name: 'Mark P.', title: 'Member', avatar: '' },
              { quote: "Best equipment in the city. No waiting for racks.", name: 'Jenny L.', title: 'Powerlifter', avatar: '' },
              { quote: "The coaches actually care about your form. Highly recommend.", name: 'Chris R.', title: 'Member', avatar: '' }
          ],
          colors: { background: '#000000', accent: '#ccff00', borderColor: '#333', text: '#ffffff', heading: '#ffffff' }
      },
      video: {
        title: 'Inside The Arena', description: 'See the energy. Feel the intensity.', source: 'youtube', videoId: 'dQw4w9WgXcQ', videoUrl: '', autoplay: false, loop: false, showControls: true, paddingY: 'lg', paddingX: 'md',
        colors: { background: '#000000', text: '#ffffff', heading: '#ffffff' }
      },
      faq: {
          title: 'Gym FAQ', description: 'Answers to common questions.', paddingY: 'md', paddingX: 'md',
          items: [
              { question: "Are you open 24/7?", answer: "Yes, for members with key fobs." },
              { question: "Can I bring a guest?", answer: "Unlimited members can bring one guest per visit." }
          ],
          colors: { background: '#0a0a0a', accent: '#ccff00', borderColor: '#333', text: '#ffffff', heading: '#ffffff' }
      },
      leads: {
          title: 'Claim Your Free Pass', description: 'Experience Iron Pulse for 3 days, on us.', namePlaceholder: 'Name', emailPlaceholder: 'Email', companyPlaceholder: 'Fitness Goal', messagePlaceholder: 'Any injuries?', buttonText: 'Get Pass', paddingY: 'lg', paddingX: 'md',
          colors: { background: '#000000', accent: '#ccff00', borderColor: '#333', text: '#ffffff', heading: '#ffffff' }
      },
      newsletter: {
          title: 'The Daily Pump', description: 'Workouts, nutrition tips, and motivation delivered to your inbox.', placeholderText: 'Enter email', buttonText: 'Subscribe', paddingY: 'md', paddingX: 'md',
          colors: { background: '#0a0a0a', accent: '#ccff00', borderColor: '#333', text: '#ffffff', heading: '#ffffff' }
      },
      cta: {
        title: 'Stop Waiting. Start Training.', description: 'Your first class is on us.',
        buttonText: 'Claim Free Pass', paddingY: 'lg', paddingX: 'md',
        colors: { gradientStart: '#ccff00', gradientEnd: '#aacc00', text: '#000000', heading: '#000000' },
      },
      footer: {
        ...initialData.data.footer,
        title: 'IRON PULSE',
        description: '24/7 High Performance Facility.',
        colors: { background: '#000000', border: '#333', text: '#71717a', linkHover: '#ccff00', heading: '#ffffff' }
      },
    },
  },

  // 4. Boutique Template
  {
    id: 'template-boutique',
    name: 'Lumina Fashion',
    thumbnailUrl: 'https://picsum.photos/seed/boutique_thumb/800/600',
    status: 'Template',
    lastUpdated: 'New',
    isArchived: false,
    brandIdentity: {
        name: 'Lumina Fashion',
        industry: 'Retail & Fashion',
        targetAudience: 'Fashion-forward women',
        toneOfVoice: 'Friendly',
        coreValues: 'Style, Comfort, Sustainability',
        language: 'English',
    },
    componentOrder: ['hero', 'features', 'portfolio', 'services', 'video', 'slideshow', 'team', 'testimonials', 'faq', 'leads', 'newsletter', 'cta', 'footer'],
    sectionVisibility: ALL_SECTIONS_VISIBLE,
    theme: {
      cardBorderRadius: 'xl',
      buttonBorderRadius: 'full',
      fontFamilyHeader: 'montserrat',
      fontFamilyBody: 'mulish',
      fontFamilyButton: 'montserrat',
    },
    imagePrompts: {
        'hero.imageUrl': 'Fashion editorial shot of a woman in a flowy pastel dress, golden hour sunlight, blurred garden background, high fashion pose, soft dreamy aesthetic',
        'features.items.0.imageUrl': 'Close up texture shot of linen fabric, beige and white tones, natural light, soft focus',
        'features.items.1.imageUrl': 'Elegant black evening gown on a model, studio lighting, dark background, luxury fashion',
        'features.items.2.imageUrl': 'Flat lay of gold jewelry and accessories on a marble surface, aesthetic arrangement, bright lighting',
        'slideshow.items.0.imageUrl': 'Street style fashion shot, urban setting, trendy outfit, candid pose, daylight',
        'slideshow.items.1.imageUrl': 'Woman drinking coffee in a cozy cafe, wearing a stylish sweater, warm tones, lifestyle photography',
        'slideshow.items.2.imageUrl': 'Beach fashion shoot, woman in summer dress walking on sand, ocean background, bright and airy',
        'testimonials.items.0.avatar': 'Headshot of young stylish woman, natural makeup, smiling, pastel background',
        'testimonials.items.1.avatar': 'Headshot of a woman with curly hair, laughing, vibrant background',
        'testimonials.items.2.avatar': 'Headshot of a fashion blogger, trendy sunglasses, cool attitude',
        'team.items.0.imageUrl': 'Headshot of fashion designer, creative studio background',
        'team.items.1.imageUrl': 'Headshot of stylist, chic outfit',
        'team.items.2.imageUrl': 'Headshot of store manager, friendly',
        'team.items.3.imageUrl': 'Headshot of buyer, professional',
        'portfolio.items.0.imageUrl': 'Model walking down runway, focus on dress',
        'portfolio.items.1.imageUrl': 'Studio shot of winter coat collection',
        'portfolio.items.2.imageUrl': 'Detail shot of handbag stitching',
    },
    data: {
      ...initialData.data,
      header: {
        style: 'sticky-solid', layout: 'center', isSticky: true, glassEffect: false, height: 100, logoType: 'text', logoText: 'L U M I N A', logoImageUrl: '', logoWidth: 120,
        links: [{ text: 'New Arrivals', href: '#hero' }, { text: 'Collections', href: '#features' }, { text: 'Lookbook', href: '#slideshow' }],
        hoverStyle: 'simple',
        ctaText: 'Shop Sale', showCta: true, colors: { background: '#ffffff', text: '#1f2937', accent: '#fb7185' }, buttonBorderRadius: 'full',
        showLogin: true, loginText: 'Sign In', loginUrl: '#'
      },
      hero: {
        headline: 'Effortless Style for the <span class="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500">Modern Muse</span>',
        subheadline: 'Discover our new spring collection. Sustainable fabrics, timeless cuts, and colors that pop.',
        primaryCta: 'Shop Collection', secondaryCta: 'Read Our Story', imageUrl: '',
        imageStyle: 'glow', imageDropShadow: true, imageBorderRadius: 'full', imageBorderSize: 'none', imageBorderColor: 'transparent',
        imageJustification: 'center', imagePosition: 'left',
        imageWidth: 80, imageHeight: 600, imageHeightEnabled: false, imageAspectRatio: '3:4', imageObjectFit: 'cover',
        paddingY: 'lg', paddingX: 'md', sectionBorderSize: 'none', sectionBorderColor: 'transparent',
        colors: { primary: '#fb7185', secondary: '#fda4af', background: '#fff1f2', text: '#881337', heading: '#881337' },
      },
      features: { // Collections
        title: 'Curated Collections', description: 'Pieces designed to be mixed, matched, and loved.', paddingY: 'lg', paddingX: 'md',
        items: [
          { title: 'The Linen Edit', description: 'Breathable fabrics for sunny days.', imageUrl: '' },
          { title: 'Evening Wear', description: 'Elegant dresses for special nights.', imageUrl: '' },
          { title: 'Accessories', description: 'The finishing touches.', imageUrl: '' },
        ],
        gridColumns: 3, imageHeight: 400, imageObjectFit: 'cover',
        colors: { background: '#ffffff', accent: '#fb7185', borderColor: '#fce7f3', text: '#4b5563', heading: '#1f2937' },
      },
      portfolio: {
          title: 'Spring Lookbook', description: 'Inspiration for the season.', paddingY: 'lg', paddingX: 'md',
          items: [
              { title: 'City Chic', description: 'Urban essentials.', imageUrl: '' },
              { title: 'Cozy Knits', description: 'Warmth meets style.', imageUrl: '' },
              { title: 'Accessories', description: 'Details matter.', imageUrl: '' }
          ],
          colors: { background: '#fff1f2', accent: '#fb7185', borderColor: '#fce7f3', text: '#881337', heading: '#881337' }
      },
      services: {
          title: 'Boutique Services', description: 'Enhancing your shopping experience.', paddingY: 'md', paddingX: 'md',
          items: [
              { icon: 'brush', title: 'Personal Styling', description: 'Book a session with our experts.' },
              { icon: 'scissors', title: 'Alterations', description: 'Perfect fit guaranteed.' },
              { icon: 'camera', title: 'Gift Wrapping', description: 'Beautiful packaging for special occasions.' }
          ],
          colors: { background: '#ffffff', accent: '#fb7185', borderColor: '#fce7f3', text: '#4b5563', heading: '#1f2937' }
      },
      video: {
          title: 'On The Runway', description: 'Highlights from our latest fashion show.', source: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false, loop: true, showControls: false, paddingY: 'md', paddingX: 'md',
          colors: { background: '#fff1f2', text: '#881337', heading: '#881337' }
      },
      slideshow: {
        title: '#LuminaGirls', paddingY: 'md', paddingX: 'md',
        items: [
            { imageUrl: '', altText: 'Street style' },
            { imageUrl: '', altText: 'Coffee shop vibes' },
            { imageUrl: '', altText: 'Beach day' },
        ],
        colors: { background: '#ffffff', heading: '#881337' }
      },
      team: {
          title: 'Our Stylists', description: 'Here to help you find your look.', paddingY: 'lg', paddingX: 'md',
          items: [
              { name: 'Alice', role: 'Head Stylist', imageUrl: '' },
              { name: 'Bella', role: 'Buyer', imageUrl: '' },
              { name: 'Coco', role: 'Store Manager', imageUrl: '' },
              { name: 'Daisy', role: 'Fashion Consultant', imageUrl: '' }
          ],
          colors: { background: '#fff1f2', text: '#881337', heading: '#881337' }
      },
      testimonials: {
        title: 'Love Letters', description: 'Why our customers keep coming back.', paddingY: 'lg', paddingX: 'md',
        items: [
            { quote: "The fabric quality is amazing! It feels so expensive but the price was great.", name: 'Chloe', title: 'Verified Buyer', avatar: '' },
            { quote: "Fast shipping and the packaging was so cute. I'm obsessed with the dress.", name: 'Mia', title: 'Verified Buyer', avatar: '' },
            { quote: "Finally found jeans that fit perfectly. Lumina is my new go-to.", name: 'Zoe', title: 'Verified Buyer', avatar: '' },
        ],
        colors: { background: '#ffffff', accent: '#fb7185', borderColor: '#fce7f3', text: '#4b5563', heading: '#1f2937' }
      },
      faq: {
          title: 'Shopping FAQ', description: 'Common questions.', paddingY: 'md', paddingX: 'md',
          items: [
              { question: "What is your return policy?", answer: "We accept returns within 30 days of purchase." },
              { question: "Do you ship internationally?", answer: "Yes, we ship worldwide." }
          ],
          colors: { background: '#fff1f2', accent: '#fb7185', borderColor: '#fce7f3', text: '#881337', heading: '#881337' }
      },
      leads: {
          title: 'Brand Ambassador Program', description: 'Love fashion? Apply to represent Lumina.', namePlaceholder: 'Name', emailPlaceholder: 'Email', companyPlaceholder: 'Instagram Handle', messagePlaceholder: 'Why do you love Lumina?', buttonText: 'Apply Now', paddingY: 'lg', paddingX: 'md',
          colors: { background: '#ffffff', accent: '#fb7185', borderColor: '#fce7f3', text: '#4b5563', heading: '#1f2937' }
      },
      newsletter: {
        title: 'Join the Inner Circle', description: 'Get 15% off your first order and early access to sales.',
        placeholderText: 'Your email address', buttonText: 'Unlock 15% Off', paddingY: 'lg', paddingX: 'md',
        colors: { background: '#fff0f5', accent: '#fb7185', borderColor: '#fbcfe8', text: '#881337', heading: '#881337' },
      },
      cta: {
        title: 'Your Closet is Calling', description: 'Shop the new collection before it sells out.',
        buttonText: 'Shop Now', paddingY: 'lg', paddingX: 'md',
        colors: { gradientStart: '#fb7185', gradientEnd: '#e11d48', text: '#ffffff', heading: '#ffffff' },
      },
      footer: {
        ...initialData.data.footer,
        title: 'L U M I N A',
        copyrightText: '© {YEAR} Lumina Fashion.',
        colors: { background: '#fff1f2', border: '#fbcfe8', text: '#881337', linkHover: '#fb7185', heading: '#881337' }
      },
    },
  },

  // 5. Auto Dealer Template
  {
    id: 'template-auto-dealer',
    name: 'Prestige Motors',
    thumbnailUrl: 'https://picsum.photos/seed/auto_thumb/800/600',
    status: 'Template',
    lastUpdated: 'Featured',
    isArchived: false,
    brandIdentity: {
        name: 'Prestige Motors',
        industry: 'Automotive',
        targetAudience: 'Car buyers, luxury vehicle enthusiasts',
        toneOfVoice: 'Professional',
        coreValues: 'Quality, Trust, Performance',
        language: 'English',
    },
    componentOrder: ['hero', 'portfolio', 'features', 'services', 'video', 'team', 'testimonials', 'pricing', 'faq', 'leads', 'newsletter', 'howItWorks', 'cta', 'footer'],
    sectionVisibility: ALL_SECTIONS_VISIBLE,
    theme: {
      cardBorderRadius: 'none',
      buttonBorderRadius: 'none',
      fontFamilyHeader: 'exo-2',
      fontFamilyBody: 'roboto',
      fontFamilyButton: 'exo-2',
    },
    imagePrompts: {
        'hero.imageUrl': 'Red luxury sports car speeding on a coastal highway at sunset, motion blur, photorealistic, cinematic lighting, sleek reflection',
        'portfolio.items.0.imageUrl': 'White sports coupe parked in modern showroom, studio lighting, gleaming paint',
        'portfolio.items.1.imageUrl': 'Black luxury SUV parked off-road in mountains, rugged but elegant, daytime',
        'portfolio.items.2.imageUrl': 'Futuristic electric sedan charging station, blue led lights, night time, sleek design',
        'features.items.0.imageUrl': 'Professional car mechanic working on an engine, clean workshop, focused expression',
        'features.items.1.imageUrl': 'Hand signing a car purchase contract, keys on table, close up, business setting',
        'features.items.2.imageUrl': 'Inspector checking car paint with a light, detailed inspection, professional',
        'testimonials.items.0.avatar': 'Headshot of middle-aged man, polo shirt, happy customer',
        'testimonials.items.1.avatar': 'Headshot of young woman holding car keys, smiling, showroom background',
        'testimonials.items.2.avatar': 'Headshot of older gentleman, suit, satisfied expression',
        'header.logoImageUrl': 'Minimalist car silhouette logo, metallic silver on dark background',
        'team.items.0.imageUrl': 'Headshot of sales manager, suit',
        'team.items.1.imageUrl': 'Headshot of service director, uniform',
        'team.items.2.imageUrl': 'Headshot of finance specialist, professional',
        'team.items.3.imageUrl': 'Headshot of customer relations, friendly'
    },
    data: {
      ...initialData.data,
      header: {
        style: 'sticky-solid', layout: 'classic', isSticky: true, glassEffect: false, height: 80, logoType: 'both', logoText: 'PRESTIGE MOTORS', logoImageUrl: '', logoWidth: 50,
        links: [{ text: 'Inventory', href: '#portfolio' }, { text: 'Services', href: '#features' }, { text: 'Financing', href: '#howItWorks' }],
        hoverStyle: 'glow',
        ctaText: 'Schedule Test Drive', showCta: true, colors: { background: '#111827', text: '#f3f4f6', accent: '#ef4444' }, buttonBorderRadius: 'none',
        showLogin: false, loginText: 'Login', loginUrl: '#'
      },
      hero: {
        headline: 'Drive the <span class="text-red-500">Extraordinary</span>',
        subheadline: 'Premier selection of luxury and performance vehicles. Certified pre-owned with comprehensive warranties.',
        primaryCta: 'Browse Inventory', secondaryCta: 'Value Your Trade', imageUrl: '',
        imageStyle: 'default', imageDropShadow: true, imageBorderRadius: 'none', imageBorderSize: 'none', imageBorderColor: 'transparent',
        imageJustification: 'center', imagePosition: 'right',
        imageWidth: 100, imageHeight: 600, imageHeightEnabled: false, imageAspectRatio: '16:9', imageObjectFit: 'cover',
        paddingY: 'lg', paddingX: 'md', sectionBorderSize: 'none', sectionBorderColor: 'transparent',
        colors: { primary: '#ef4444', secondary: '#d1d5db', background: '#1f2937', text: '#f3f4f6', heading: '#ffffff' },
      },
      portfolio: { // Inventory
        title: 'Featured Inventory', description: 'Hand-picked vehicles ready for the road.', paddingY: 'lg', paddingX: 'md',
        items: [
          { title: '2024 Sport Coupe', description: 'Twin-turbo V6, Leather Interior, 0-60 in 3.5s.', imageUrl: '' },
          { title: 'Luxury SUV', description: 'Panoramic sunroof, AWD, Third-row seating.', imageUrl: '' },
          { title: 'Electric Sedan', description: '300 mile range, Autopilot features, Premium sound.', imageUrl: '' },
        ],
        colors: { background: '#111827', accent: '#ef4444', borderColor: '#374151', text: '#d1d5db', heading: '#ffffff' },
      },
      features: { // Highlights
        title: 'Why Choose Prestige?', description: 'More than just a dealership.', paddingY: 'lg', paddingX: 'md',
        items: [
          { title: 'Certified Service', description: 'Factory-trained technicians using OEM parts.', imageUrl: '' },
          { title: 'Flexible Financing', description: 'Competitive rates for all credit types.', imageUrl: '' },
          { title: '100-Point Inspection', description: 'Every vehicle is rigorously tested for quality.', imageUrl: '' },
        ],
        gridColumns: 3, imageHeight: 200, imageObjectFit: 'cover',
        colors: { background: '#1f2937', accent: '#ef4444', borderColor: '#374151', text: '#f3f4f6', heading: '#ffffff' },
      },
      services: {
          title: 'Service Center', description: 'Keep your vehicle running like new.', paddingY: 'md', paddingX: 'md',
          items: [
              { icon: 'scissors', title: 'Oil Change', description: 'Quick and efficient service.' },
              { icon: 'brush', title: 'Detailing', description: 'Interior and exterior cleaning.' },
              { icon: 'code', title: 'Parts', description: 'Genuine parts and accessories.' }
          ],
          colors: { background: '#111827', accent: '#ef4444', borderColor: '#374151', text: '#d1d5db', heading: '#ffffff' }
      },
      video: {
          title: 'Experience Performance', description: 'Take a virtual test drive.', source: 'youtube', videoId: 'dQw4w9WgXcQ', autoplay: false, loop: false, showControls: true, paddingY: 'lg', paddingX: 'md',
          colors: { background: '#1f2937', text: '#ffffff', heading: '#ffffff' }
      },
      team: {
          title: 'Our Sales Team', description: 'Dedicated to finding you the perfect car.', paddingY: 'lg', paddingX: 'md',
          items: [
              { name: 'James Bond', role: 'Sales Manager', imageUrl: '' },
              { name: 'Tony Stark', role: 'Tech Specialist', imageUrl: '' },
              { name: 'Natasha R.', role: 'Finance', imageUrl: '' },
              { name: 'Steve R.', role: 'Service', imageUrl: '' }
          ],
          colors: { background: '#111827', text: '#ffffff', heading: '#ffffff' }
      },
      pricing: {
          title: 'Lease Specials', description: 'Limited time offers on select models.', paddingY: 'lg', paddingX: 'md',
          tiers: [
              { name: 'Sedan Special', price: '$299', frequency: '/mo', description: '36 months, $2k down', features: ['Maintenance Included', 'Roadside Assistance'], buttonText: 'View Details', featured: false },
              { name: 'SUV Special', price: '$459', frequency: '/mo', description: '36 months, $3k down', features: ['All-Wheel Drive', 'Premium Sound'], buttonText: 'View Details', featured: true },
              { name: 'Sports Car', price: '$699', frequency: '/mo', description: '36 months, $5k down', features: ['Performance Package', 'Track Day Invite'], buttonText: 'View Details', featured: false }
          ],
          colors: { background: '#1f2937', accent: '#ef4444', borderColor: '#374151', text: '#d1d5db', heading: '#ffffff', buttonBackground: '#ef4444', buttonText: '#ffffff' }
      },
      faq: {
          title: 'Financing FAQ', description: 'Answers to your buying questions.', paddingY: 'md', paddingX: 'md',
          items: [
              { question: "Do you accept trade-ins?", answer: "Yes, we offer competitive value for your trade-in." },
              { question: "What is the warranty?", answer: "All certified pre-owned vehicles come with a 1-year/12k mile warranty." }
          ],
          colors: { background: '#111827', accent: '#ef4444', borderColor: '#374151', text: '#d1d5db', heading: '#ffffff' }
      },
      leads: {
          title: 'Get Pre-Approved', description: 'Fill out the form to start your financing application.', namePlaceholder: 'Name', emailPlaceholder: 'Email', companyPlaceholder: 'Annual Income', messagePlaceholder: 'Vehicle of interest', buttonText: 'Apply Now', paddingY: 'lg', paddingX: 'md',
          colors: { background: '#1f2937', accent: '#ef4444', borderColor: '#374151', text: '#d1d5db', heading: '#ffffff' }
      },
      newsletter: {
          title: 'New Arrivals Alert', description: 'Be the first to know when new inventory hits the lot.', placeholderText: 'Email', buttonText: 'Sign Up', paddingY: 'md', paddingX: 'md',
          colors: { background: '#111827', accent: '#ef4444', borderColor: '#374151', text: '#d1d5db', heading: '#ffffff' }
      },
      howItWorks: { // Buying Process
        title: 'Seamless Buying Process', description: 'Get behind the wheel in 4 easy steps.', steps: 4,
        items: [
            { icon: 'search', title: 'Select Vehicle', description: 'Browse online or visit our showroom.' },
            { icon: 'process', title: 'Test Drive', description: 'Experience the performance firsthand.' },
            { icon: 'upload', title: 'Financing', description: 'Quick approval with our finance partners.' },
            { icon: 'share', title: 'Drive Away', description: 'Sign the papers and enjoy your new ride.' },
        ],
        paddingY: 'lg', paddingX: 'md',
        colors: { background: '#1f2937', accent: '#ef4444', text: '#d1d5db', heading: '#ffffff' },
      },
      testimonials: {
        title: 'Happy Drivers', description: 'Join the Prestige family.', paddingY: 'lg', paddingX: 'md',
        items: [
          { quote: "Easiest car buying experience ever. No pressure, great price.", name: 'Tom H.', title: 'Customer', avatar: '' },
          { quote: "Love my new SUV! The service department is also top notch.", name: 'Karen P.', title: 'Customer', avatar: '' },
          { quote: "They found me the exact model I wanted. Highly recommended.", name: 'Greg S.', title: 'Customer', avatar: '' },
        ],
        colors: { background: '#111827', accent: '#ef4444', borderColor: '#374151', text: '#f3f4f6', heading: '#ffffff' },
      },
      cta: {
        title: 'Your Dream Car Awaits', description: 'Visit us today for a test drive.',
        buttonText: 'Get Directions', paddingY: 'lg', paddingX: 'md',
        colors: { gradientStart: '#ef4444', gradientEnd: '#b91c1c', text: '#ffffff', heading: '#ffffff' },
      },
      footer: {
        ...initialData.data.footer,
        title: 'PRESTIGE MOTORS',
        description: 'Driving excellence since 1995.',
        copyrightText: '© {YEAR} Prestige Motors.',
        colors: { background: '#111827', border: '#374151', text: '#9ca3af', linkHover: '#ef4444', heading: '#ffffff' }
      },
    },
  },
];
