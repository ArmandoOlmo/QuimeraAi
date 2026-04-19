/**
 * 🍕 Italian Restaurant Template Generator
 * 
 * Generates all images for the Tuscan Modern Italian Restaurant template
 * using the Quimera Nano Banana 2 API (gemini-3.1-flash-image-preview)
 * 
 * Usage:
 *   npx tsx scripts/generate-italian-template.ts
 * 
 * This script:
 * 1. Calls the Gemini Proxy image endpoint for each template image
 * 2. Saves generated images as base64 data URLs
 * 3. Outputs the complete PageData template ready for Firestore
 */

const PROXY_IMAGE_URL = 'https://us-central1-quimeraai.cloudfunctions.net/gemini-image';

// Your owner email — proxy's isOwner() will recognize this and bypass rate limits
// NOTE: Replace with your Firebase UID if the owner check fails with email
const OWNER_USER_ID = process.env.QUIMERA_OWNER_UID || 'armandoolmomiranda_at_gmail_com';
const PROJECT_ID = 'template-italian-tuscan';

interface ImageResult {
  success: boolean;
  image: string;       // base64
  mimeType: string;
  metadata: {
    model: string;
    aspectRatio: string;
    style?: string;
    resolution: string;
  };
}

/**
 * Generate a single image via the Nano Banana 2 proxy
 */
async function generateImage(
  prompt: string,
  options: {
    aspectRatio?: string;
    style?: string;
    resolution?: '1K' | '2K' | '4K';
    lighting?: string;
    cameraAngle?: string;
    colorGrading?: string;
    depthOfField?: string;
  } = {}
): Promise<string> {
  const body = {
    userId: OWNER_USER_ID,
    projectId: PROJECT_ID,
    prompt,
    model: 'gemini-3.1-flash-image-preview', // Nano Banana 2
    aspectRatio: options.aspectRatio || '16:9',
    style: options.style || 'Photorealistic',
    resolution: options.resolution || '2K',
    thinkingLevel: 'high',
    personGeneration: 'allow_adult',
    temperature: 1.0,
    negativePrompt: 'cartoon, anime, low quality, blurry, watermark, text overlay, stock photo watermark',
    config: {
      lighting: options.lighting,
      cameraAngle: options.cameraAngle,
      colorGrading: options.colorGrading,
      depthOfField: options.depthOfField,
    },
  };

  console.log(`  🎨 Generating: "${prompt.substring(0, 60)}..."`);

  const response = await fetch(PROXY_IMAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Image generation failed (${response.status}): ${JSON.stringify(errorData)}`);
  }

  const data: ImageResult = await response.json();

  if (!data.success || !data.image) {
    throw new Error('No image returned from Nano Banana 2');
  }

  console.log(`  ✅ Generated! (${data.metadata.resolution}, ${data.metadata.aspectRatio})`);
  return `data:${data.mimeType};base64,${data.image}`;
}

/**
 * Main generation pipeline
 */
async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🍕 Italian Tuscan Modern Restaurant Template Generator   ║');
  console.log('║  Model: Quimera Nano Banana 2 (gemini-3.1-flash-image)   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Define all the images we need to generate
  const imagePrompts = [
    {
      key: 'hero_slide_1',
      prompt: 'Interior of an upscale modern Italian restaurant with rustic Tuscan stone walls, exposed wooden ceiling beams, warm Edison bulb string lights, elegant dark wood tables with white linen napkins, candlelight ambiance, wine bottles displayed on stone shelves, terracotta tile floor with modern dark furniture, evening mood',
      options: { aspectRatio: '16:9', style: 'Cinematic', lighting: 'Golden Hour', colorGrading: 'Warm Tones', depthOfField: 'Shallow (Bokeh Background)' },
    },
    {
      key: 'hero_slide_2',
      prompt: 'Close-up of a chef making fresh pasta by hand on a marble counter dusted with flour, warm kitchen lighting from behind, rustic Italian kitchen with copper pots hanging on hooks, soft bokeh background with herb garden visible through a window, artisan craftsmanship, warm tones',
      options: { aspectRatio: '16:9', style: 'Cinematic', lighting: 'Natural Lighting', colorGrading: 'Warm Tones', depthOfField: 'Shallow (Bokeh Background)' },
    },
    {
      key: 'feature_pizza',
      prompt: 'Gourmet authentic Neapolitan wood-fired pizza Margherita with fresh basil leaves, bubbling mozzarella, San Marzano tomato sauce on charred crust, served on a dark rustic stone plate, wisps of smoke rising, dark moody restaurant background, high-end food photography',
      options: { aspectRatio: '4:3', style: 'Photorealistic', lighting: 'Dramatic Lighting', cameraAngle: 'High Angle', depthOfField: 'Shallow (Bokeh Background)' },
    },
    {
      key: 'feature_wine',
      prompt: 'An elegant glass of Chianti Classico red wine being held in front of a rustic Italian wine cellar with oak barrels stacked in rows, warm string lights in the background, deep burgundy wine color, crystal glass catching light reflections, sophisticated and moody atmosphere',
      options: { aspectRatio: '4:3', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'Warm Tones', depthOfField: 'Shallow (Bokeh Background)' },
    },
    {
      key: 'feature_pasta',
      prompt: 'Luxurious plate of fresh pappardelle pasta with wild boar ragù, shaved Parmigiano-Reggiano on top, served on a handmade ceramic plate, dark wood table with olive oil and fresh herbs nearby, warm directional lighting from the side, high-end Italian food photography',
      options: { aspectRatio: '4:3', style: 'Photorealistic', lighting: 'Natural Lighting', cameraAngle: 'High Angle', depthOfField: 'Shallow (Bokeh Background)' },
    },
    {
      key: 'menu_risotto',
      prompt: 'Creamy risotto ai funghi porcini topped with thin shaved black truffle slices and microgreens, parmesan crisp on top, served in a wide white bowl on dark slate, minimal garnish, fine dining Italian presentation, dramatic side lighting',
      options: { aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Dramatic Lighting', cameraAngle: 'High Angle', depthOfField: 'Shallow (Bokeh Background)' },
    },
    {
      key: 'menu_steak',
      prompt: 'Thick-cut Bistecca alla Fiorentina T-bone steak grilled to perfection, rare pink center visible on cross section, coarse sea salt, fresh rosemary sprig, drizzle of extra virgin olive oil, served on a hot cast iron plate, dark moody restaurant table, Italian fine dining',
      options: { aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Dramatic Lighting', cameraAngle: 'Eye Level', depthOfField: 'Shallow (Bokeh Background)' },
    },
    {
      key: 'menu_pappardelle',
      prompt: 'Wide ribbon pappardelle pasta twirled with a fork, rich slow-cooked meat ragù sauce, fresh basil leaf, pecorino shavings, served on artisanal terra cotta plate, rustic wooden table surface, warm tones, Italian comfort food photography',
      options: { aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', cameraAngle: 'High Angle', depthOfField: 'Shallow (Bokeh Background)' },
    },
    {
      key: 'menu_tiramisu',
      prompt: 'Classic Italian tiramisu dessert in a clear glass, layers of mascarpone cream and espresso-soaked ladyfingers visible, dusted with cocoa powder on top, small espresso cup beside it, dark elegant background, soft candlelight, Italian pasticceria style',
      options: { aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Soft Lighting', cameraAngle: 'Eye Level', depthOfField: 'Shallow (Bokeh Background)' },
    },
    {
      key: 'gallery_1',
      prompt: 'Elegant table setting at a modern Italian restaurant, white tablecloth, crystal wine glasses, small succulent centerpiece, warm candlelight creating bokeh, Tuscan stone wall backdrop with modern art, evening atmosphere',
      options: { aspectRatio: '16:9', style: 'Cinematic', lighting: 'Golden Hour', colorGrading: 'Warm Tones' },
    },
    {
      key: 'gallery_2',
      prompt: 'Outdoor terrace of a modern Tuscan restaurant at golden hour sunset, climbing ivy on old stone walls, modern bistro furniture, string lights overhead, Cypress trees in the distance, wine and antipasti on the table, romantic evening setting',
      options: { aspectRatio: '16:9', style: 'Cinematic', lighting: 'Golden Hour', colorGrading: 'Warm Tones' },
    },
    {
      key: 'gallery_3',
      prompt: 'Professional Italian chef plating a gourmet dish in an open kitchen, wearing traditional white uniform, modern stainless steel kitchen with hanging copper pans, focused concentration, smoke and steam from cooking, cinematic lighting',
      options: { aspectRatio: '16:9', style: 'Cinematic', lighting: 'Dramatic Lighting', depthOfField: 'Shallow (Bokeh Background)' },
    },
  ];

  const generatedImages: Record<string, string> = {};
  const failedImages: string[] = [];

  for (let i = 0; i < imagePrompts.length; i++) {
    const { key, prompt, options } = imagePrompts[i];
    console.log(`\n[${i + 1}/${imagePrompts.length}] Generating "${key}"...`);

    try {
      const dataUrl = await generateImage(prompt, options);
      generatedImages[key] = dataUrl;
    } catch (error) {
      console.error(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failedImages.push(key);
      // Use a placeholder for failed images
      generatedImages[key] = '';
    }

    // Rate limit protection: 2-second delay between generations
    if (i < imagePrompts.length - 1) {
      console.log('  ⏳ Waiting 2s...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════');
  console.log(`  ✅ Generated: ${Object.keys(generatedImages).length - failedImages.length}/${imagePrompts.length}`);
  if (failedImages.length > 0) {
    console.log(`  ❌ Failed: ${failedImages.join(', ')}`);
  }
  console.log('═══════════════════════════════════════════');

  // Now build the complete template with generated images
  const template = buildTemplate(generatedImages);

  // Output the final template as JSON
  const outputPath = new URL('../data/templates/italian-tuscan-modern.json', import.meta.url);
  const fs = await import('fs');
  const path = await import('path');
  const dir = path.dirname(outputPath.pathname);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath.pathname, JSON.stringify(template, null, 2));
  console.log(`\n📁 Template saved to: ${outputPath.pathname}`);
  console.log('   Copy this JSON into Firebase "templates" collection to make it available in QuimeraAi.');
}

/**
 * Build the complete PageData template from generated images
 */
function buildTemplate(images: Record<string, string>) {
  return {
    // Metadata for the template gallery
    _templateMeta: {
      name: 'Ristorante Toscano Moderno',
      description: 'Template premium para restaurante italiano con estética toscana moderna. Incluye menú con precios, galería de platos, sección de reservas y todas las imágenes generadas con IA.',
      category: 'restaurant',
      tags: ['italian', 'restaurant', 'tuscan', 'modern', 'food', 'fine-dining'],
      thumbnailUrl: images.hero_slide_1,
      createdAt: new Date().toISOString(),
      generatedWith: 'Quimera Nano Banana 2 (gemini-3.1-flash-image-preview)',
    },

    // Theme configuration
    theme: {
      cardBorderRadius: 'none' as const,
      buttonBorderRadius: 'none' as const,
      fontFamilyHeader: 'playfair-display' as const,
      fontFamilyBody: 'inter' as const,
      fontFamilyButton: 'inter' as const,
      fontWeightHeader: 700,
      fontWeightBody: 400,
      fontWeightButton: 600,
      fontStyleHeader: 'normal' as const,
      fontStyleBody: 'normal' as const,
      fontStyleButton: 'normal' as const,
      headingsAllCaps: false,
      buttonsAllCaps: true,
      navLinksAllCaps: true,
      pageBackground: '#0c0a09',
      globalColors: {
        primary: '#c2410c',
        secondary: '#854d0e',
        accent: '#c2410c',
        background: '#0c0a09',
        surface: '#1c1917',
        text: '#d6d3d1',
        textMuted: '#a8a29e',
        heading: '#fdfbf7',
        border: '#292524',
        success: '#15803d',
        error: '#dc2626',
      },
    },

    // Component order for the page
    componentOrder: [
      'topBar', 'header', 'heroGallery', 'features', 'menu',
      'slideshow', 'testimonials', 'leads', 'map', 'footer',
    ],

    // Section visibility
    sectionVisibility: {
      topBar: true,
      header: true,
      heroGallery: true,
      features: true,
      menu: true,
      slideshow: true,
      testimonials: true,
      leads: true,
      map: true,
      footer: true,
      // Hidden sections
      hero: false,
      heroSplit: false,
      heroWave: false,
      heroNova: false,
      pricing: false,
      faq: false,
      cta: false,
      services: false,
      team: false,
      video: false,
      howItWorks: false,
      portfolio: false,
      newsletter: false,
      chatbot: false,
      banner: false,
      logoBanner: false,
      products: false,
      cmsFeed: false,
      signupFloat: false,
    },

    // ─── COMPONENTS ─────────────────────────────────────────────

    topBar: {
      messages: [
        { text: '🍷 Reserva tu mesa para esta noche', icon: 'phone', link: '#leads', linkText: 'Reservar' },
        { text: '🌿 Nuevos platos de temporada disponibles', icon: 'sparkles', link: '#menu', linkText: 'Ver Menú' },
      ],
      speed: 4000,
      colors: {
        background: '#c2410c',
        text: '#ffffff',
        linkText: '#fdfbf7',
        border: '#ea580c',
      },
    },

    header: {
      style: 'sticky-solid',
      layout: 'minimal',
      isSticky: true,
      glassEffect: true,
      height: 80,
      logoType: 'text',
      logoText: 'LUMINA',
      logoImageUrl: '',
      logoWidth: 120,
      links: [
        { text: 'Menú', href: '#menu' },
        { text: 'Nuestra Historia', href: '#features' },
        { text: 'Galería', href: '#slideshow' },
        { text: 'Reservas', href: '#leads' },
      ],
      hoverStyle: 'simple',
      ctaText: 'Reservar Mesa',
      showCta: true,
      showLogin: false,
      loginText: '',
      loginUrl: '',
      colors: {
        background: '#1c1917',
        text: '#fdfbf7',
        accent: '#c2410c',
      },
      buttonBorderRadius: 'none',
      linkFontSize: 14,
    },

    heroGallery: {
      slides: [
        {
          headline: 'Tradición Toscana, Alma Moderna',
          subheadline: 'Una experiencia culinaria que eleva los sabores auténticos de Italia.',
          primaryCta: 'VER EL MENÚ',
          primaryCtaLink: '#menu',
          secondaryCta: 'RESERVAR AHORA',
          secondaryCtaLink: '#leads',
          backgroundImage: images.hero_slide_1,
          backgroundColor: '#1c1917',
        },
        {
          headline: 'Pasta Fatta a Mano',
          subheadline: 'Cada día, harina importada y manos artesanas dan vida a nuestra tradición.',
          primaryCta: 'DESCUBRIR',
          primaryCtaLink: '#features',
          secondaryCta: '',
          secondaryCtaLink: '',
          backgroundImage: images.hero_slide_2,
          backgroundColor: '#1c1917',
        },
      ],
      autoPlaySpeed: 5000,
      transitionDuration: 1000,
      showArrows: true,
      showDots: true,
      dotStyle: 'circle',
      heroHeight: 90,
      headlineFontSize: 'xl',
      subheadlineFontSize: 'md',
      showGrain: true,
      overlayOpacity: 0.55,
      colors: {
        background: '#1c1917',
        text: '#fdfbf7',
        heading: '#fdfbf7',
        ctaText: '#ffffff',
        dotActive: '#c2410c',
        dotInactive: 'rgba(253,251,247,0.4)',
        arrowColor: '#fdfbf7',
      },
      buttonBorderRadius: 'none',
    },

    features: {
      featuresVariant: 'bento-premium',
      paddingY: 'xl',
      paddingX: 'md',
      title: 'Nuestra Filosofía',
      description: 'Respeto absoluto por la materia prima. Técnicas ancestrales italianas fusionadas con innovación gastronómica.',
      items: [
        {
          title: 'Horno de Leña de Olivo',
          description: 'Auténticas pizzas napolitanas con bordes aireados y una cocción perfecta a 450°C en nuestro horno artesanal.',
          imageUrl: images.feature_pizza,
        },
        {
          title: 'Cava Seleccionada',
          description: 'Los mejores vinos de Chianti Classico y Brunello di Montalcino, seleccionados por nuestro sommelier.',
          imageUrl: images.feature_wine,
        },
        {
          title: 'Pasta Fresca del Día',
          description: 'Trefilada al bronce, amasada cada mañana frente a la mirada de nuestros comensales.',
          imageUrl: images.feature_pasta,
        },
      ],
      gridColumns: 3,
      imageHeight: 280,
      imageObjectFit: 'cover',
      animationType: 'fade-in-up',
      enableCardAnimation: true,
      borderRadius: 'none',
      colors: {
        background: '#fdfbf7',
        accent: '#c2410c',
        borderColor: '#e7e5e4',
        text: '#44403c',
        heading: '#1c1917',
        description: '#57534e',
        cardBackground: '#ffffff',
      },
    },

    menu: {
      menuVariant: 'classic',
      title: 'Le Specialità',
      description: 'Inspirado en las colinas de la Toscana.',
      paddingY: 'xl',
      paddingX: 'md',
      items: [
        {
          name: 'Risotto al Tartufo Nero',
          description: 'Arroz arborio, crema de trufa negra, champiñones porcini silvestres y Parmigiano Reggiano D.O.P.',
          price: '€ 24.00',
          imageUrl: images.menu_risotto,
          category: 'Principales',
          isSpecial: true,
        },
        {
          name: 'Bistecca alla Fiorentina',
          description: 'Corte grueso de lomo T-bone a la parrilla de carbón 500g, sal marina gruesa, aceite de oliva virgen extra.',
          price: '€ 65.00',
          imageUrl: images.menu_steak,
          category: 'Cortes',
          isSpecial: true,
        },
        {
          name: 'Pappardelle al Cinghiale',
          description: 'Pappardelle casero con ragú de jabalí cocinado a fuego lento durante 12 horas, pecorino toscano.',
          price: '€ 22.00',
          imageUrl: images.menu_pappardelle,
          category: 'Pasta',
          isSpecial: false,
        },
        {
          name: 'Tiramisù della Nonna',
          description: 'Mascarpone fresco, bizcochos bañados en espresso Lavazza y cacao amargo espolvoreado al momento.',
          price: '€ 12.00',
          imageUrl: images.menu_tiramisu,
          category: 'Postres',
          isSpecial: false,
        },
      ],
      colors: {
        background: '#1c1917',
        accent: '#c2410c',
        borderColor: '#292524',
        text: '#d6d3d1',
        heading: '#fdfbf7',
        cardBackground: '#292524',
        priceColor: '#fed7aa',
      },
      titleFontSize: 'lg',
      descriptionFontSize: 'md',
      borderRadius: 'none',
      showCategories: true,
      animationType: 'fade-in-up',
      enableCardAnimation: true,
    },

    slideshow: {
      slideshowVariant: 'classic',
      title: 'La Experiencia Lumina',
      showTitle: true,
      fullWidth: false,
      paddingY: 'xl',
      paddingX: 'md',
      titleFontSize: 'md',
      borderRadius: 'none',
      autoPlaySpeed: 5000,
      transitionEffect: 'slide',
      transitionDuration: 800,
      showArrows: true,
      showDots: true,
      arrowStyle: 'rounded',
      dotStyle: 'circle',
      kenBurnsIntensity: 'medium',
      thumbnailSize: 80,
      showCaptions: true,
      slideHeight: 550,
      items: [
        { imageUrl: images.gallery_1, altText: 'Mesa elegante del restaurante', caption: 'Ambiente Íntimo y Sofisticado' },
        { imageUrl: images.gallery_2, altText: 'Terraza al atardecer', caption: 'Terraza Toscana al Atardecer' },
        { imageUrl: images.gallery_3, altText: 'Chef en cocina abierta', caption: 'Cocina Abierta con Maestría Artesanal' },
      ],
      colors: {
        background: '#0c0a09',
        heading: '#fdfbf7',
        arrowBackground: 'rgba(28, 25, 23, 0.7)',
        arrowText: '#fdfbf7',
        dotActive: '#c2410c',
        dotInactive: 'rgba(253,251,247,0.3)',
        captionBackground: 'rgba(28, 25, 23, 0.85)',
        captionText: '#fdfbf7',
      },
    },

    testimonials: {
      testimonialsVariant: 'glassmorphism',
      paddingY: 'xl',
      paddingX: 'md',
      title: 'La Experiencia de Nuestros Comensales',
      description: 'Lo que dicen quienes se han sentado en nuestra mesa.',
      titleFontSize: 'md',
      descriptionFontSize: 'md',
      borderRadius: 'none',
      cardShadow: 'none',
      borderStyle: 'solid',
      cardPadding: 32,
      animationType: 'fade-in-up',
      enableCardAnimation: true,
      items: [
        {
          quote: 'El mejor Risotto que he probado fuera de Florencia. La atención a los detalles y la atmósfera moderna hacen que la experiencia sea rústica pero sofisticada a la vez.',
          name: 'Alessandro B.',
          title: 'Crítico Culinario, Guía Michelin',
        },
        {
          quote: 'Una cava impresionante. El sommelier nos recomendó un Brunello di Montalcino 2019 que maridó a la perfección con la Fiorentina. Un 10 absoluto.',
          name: 'María T.',
          title: 'Enóloga y Local Guide',
        },
        {
          quote: 'Celebramos nuestro aniversario aquí y fue mágico. La terraza al atardecer, la pasta fresca, el tiramisú... cada detalle cuida la experiencia.',
          name: 'Carlos y Elena',
          title: 'Clientes habituales',
        },
      ],
      colors: {
        background: '#fdfbf7',
        accent: '#c2410c',
        borderColor: '#e7e5e4',
        text: '#57534e',
        heading: '#1c1917',
        cardBackground: '#ffffff',
      },
    },

    leads: {
      leadsVariant: 'classic',
      title: 'Reserva Tu Mesa',
      description: 'Asegura tu lugar en Lumina. Para grupos de más de 8 personas, contacte directamente al +34 912 345 678.',
      namePlaceholder: 'Nombre para la reserva',
      emailPlaceholder: 'Email de confirmación',
      companyPlaceholder: 'Teléfono de contacto',
      messagePlaceholder: '¿Alguna alergia, evento especial o preferencia? (Ej: Aniversario, mesa terraza)',
      buttonText: 'Solicitar Reserva',
      paddingY: 'xl',
      paddingX: 'md',
      cardBorderRadius: 'none',
      buttonBorderRadius: 'none',
      titleFontSize: 'lg',
      descriptionFontSize: 'md',
      colors: {
        background: '#1c1917',
        accent: '#c2410c',
        borderColor: '#292524',
        text: '#d6d3d1',
        heading: '#fdfbf7',
        buttonBackground: '#c2410c',
        buttonText: '#ffffff',
        cardBackground: '#292524',
        inputBackground: '#1c1917',
        inputText: '#fdfbf7',
        inputBorder: '#44403c',
        gradientStart: '#c2410c',
        gradientEnd: '#ea580c',
      },
    },

    map: {
      title: 'Encuéntranos',
      description: 'Estamos en el corazón del Distrito Gastronómico.',
      address: 'Av. Principal 456, Distrito Gastronómico',
      lat: 40.4168,
      lng: -3.7038,
      zoom: 15,
      mapVariant: 'modern',
      apiKey: '',
      paddingY: 'lg',
      paddingX: 'md',
      height: 350,
      colors: {
        background: '#0c0a09',
        text: '#a8a29e',
        heading: '#fdfbf7',
        accent: '#c2410c',
        cardBackground: '#1c1917',
      },
      titleFontSize: 'md',
      descriptionFontSize: 'md',
      borderRadius: 'none',
    },

    footer: {
      title: 'LUMINA RISTORANTE',
      description: 'La Toscana Modernizada en el Corazón de la Ciudad.',
      linkColumns: [
        {
          title: 'Encuéntranos',
          links: [
            { text: 'Av. Principal 456, Distrito Gastronómico', href: '#map' },
            { text: 'Mar – Dom: 13:00 – 23:30', href: '#' },
            { text: 'Tel: +34 912 345 678', href: 'tel:+34912345678' },
          ],
        },
        {
          title: 'Legal',
          links: [
            { text: 'Política de Privacidad', href: '/privacy-policy' },
            { text: 'Aviso Legal', href: '/terms-of-service' },
          ],
        },
      ],
      socialLinks: [
        { platform: 'instagram', href: 'https://instagram.com' },
        { platform: 'facebook', href: 'https://facebook.com' },
      ],
      copyrightText: '© {YEAR} Lumina Ristorante. Todos los derechos reservados.',
      colors: {
        background: '#0c0a09',
        border: '#1c1917',
        text: '#a8a29e',
        linkHover: '#fdfbf7',
        heading: '#fdfbf7',
      },
    },
  };
}

// Run
main().catch(console.error);
