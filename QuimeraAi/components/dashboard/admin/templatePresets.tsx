/**
 * templatePresets.tsx
 * 
 * Complete template presets for the AI Template Generator.
 * Each preset maximizes the app's component library (14-18 components per template).
 */
import React from 'react';
import {
    UtensilsCrossed, Stethoscope, Dumbbell, Briefcase, Palette, Pizza,
} from 'lucide-react';
import { PageData, PageSection } from '../../../types';

// Template presets with industry-specific prompts
export interface TemplatePreset {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
    description: string;
    category: string;
    images: {
        key: string;
        prompt: string;
        aspectRatio: string;
        style: string;
        lighting?: string;
        colorGrading?: string;
        depthOfField?: string;
        cameraAngle?: string;
    }[];
    buildTemplate: (images: Record<string, string>) => {
        name: string;
        data: Partial<PageData>;
        theme: any;
        componentOrder: PageSection[];
        sectionVisibility: Record<string, boolean>;
        category: string;
        industries: string[];
        tags: string[];
    };
}

// ═══════════════════════════════════════════════════════════════════
// HELPER: Build full sectionVisibility from a list of ENABLED sections
// ═══════════════════════════════════════════════════════════════════
const ALL_SECTIONS: PageSection[] = [
    'colors', 'typography', 'header',
    'hero', 'heroSplit', 'heroGallery', 'heroWave', 'heroNova', 'heroLead',
    'topBar', 'logoBanner', 'banner', 'features', 'testimonials', 'slideshow',
    'pricing', 'faq', 'portfolio', 'cta', 'services', 'team', 'video', 'howItWorks', 'menu',
    'leads', 'newsletter', 'map', 'chatbot', 'cmsFeed', 'signupFloat', 'footer',
    'separator1', 'separator2', 'separator3', 'separator4', 'separator5',
];

function buildVisibility(enabledSections: PageSection[]): Record<string, boolean> {
    const vis: Record<string, boolean> = {};
    for (const s of ALL_SECTIONS) {
        vis[s] = enabledSections.includes(s);
    }
    // Always enable structural sections
    vis['colors'] = true;
    vis['typography'] = true;
    vis['header'] = true;
    vis['footer'] = true;
    return vis;
}


// ═══════════════════════════════════════════════════════════════════
//  1. ITALIAN RESTAURANT TOSCANO
// ═══════════════════════════════════════════════════════════════════
export const ITALIAN_RESTAURANT_PRESET: TemplatePreset = {
    id: 'italian-restaurant',
    name: 'Restaurante Italiano Toscano',
    icon: <UtensilsCrossed size={24} />,
    color: 'from-orange-500 to-red-600',
    description: 'Template premium: menú, galería, equipo, reseñas, mapa, reservas y más.',
    category: 'restaurant',
    images: [
        // HeroGallery slides (3)
        { key: 'hero_1', prompt: 'Interior of an upscale modern Italian restaurant, rustic Tuscan stone walls, exposed wooden ceiling beams, warm Edison bulb string lights, elegant dark wood tables with white linen napkins, candlelight ambiance, wine bottles on stone shelves, terracotta tile floor, evening mood, cinematic wide shot', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Golden Hour', colorGrading: 'Warm Tones', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'hero_2', prompt: 'Beautiful outdoor terrace of a Tuscan restaurant at golden hour sunset, climbing ivy on old stone walls, modern bistro furniture, string lights overhead, Cypress trees in distance, wine and antipasti on table, romantic evening, wide shot', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Golden Hour', colorGrading: 'Warm Tones' },
        { key: 'hero_3', prompt: 'Professional Italian chef in white uniform preparing fresh pasta in a traditional Tuscan kitchen, copper pots hanging, wood-fired oven glowing in background, flour dusted marble counter, action shot, warm lighting', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'Warm Tones' },
        // Menu items (6)
        { key: 'menu_1', prompt: 'Gourmet authentic Neapolitan wood-fired pizza Margherita with fresh basil leaves, bubbling mozzarella, San Marzano tomato sauce on charred crust, dark rustic stone plate, wisps of smoke rising, high-end food photography, overhead shot', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Dramatic Lighting', cameraAngle: 'High Angle', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'menu_2', prompt: 'Luxurious plate of fresh pappardelle pasta with wild boar ragù, shaved Parmigiano-Reggiano on handmade ceramic plate, dark wood table with olive oil, fresh herbs, warm side lighting, Italian fine dining food photography', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', cameraAngle: 'High Angle', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'menu_3', prompt: 'Elegant Italian tiramisu dessert in a crystal glass, layers of mascarpone cream and espresso-soaked ladyfingers, dusted with cocoa powder, fresh mint leaf garnish, dark moody background, fine dining presentation', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Dramatic Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'menu_4', prompt: 'Elegant bruschetta al tartufo appetizer on a dark slate plate, toasted ciabatta topped with black truffle cream, fresh burrata, aged balsamic drizzle, microgreens, warm side lighting, Italian fine dining', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Dramatic Lighting', cameraAngle: 'High Angle', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'menu_5', prompt: 'Beautiful ossobuco alla milanese on a white ceramic plate, slow-braised veal shank with saffron risotto, gremolata garnish, rich aromatic sauce, rustic dark wood table, Italian fine dining food photography', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', cameraAngle: 'High Angle', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'menu_6', prompt: 'Creamy risotto ai funghi porcini in a handmade ceramic bowl, wild porcini mushrooms, shaved truffle on top, drizzle of extra virgin olive oil, Grana Padano flakes, dark moody background, overhead shot', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Dramatic Lighting', cameraAngle: 'High Angle', depthOfField: 'Shallow (Bokeh Background)' },
        // Features/Wine
        { key: 'wine', prompt: 'Elegant glass of Chianti Classico red wine in front of a rustic Italian wine cellar with oak barrels, warm string lights in background, deep burgundy wine color, crystal glass catching light, sophisticated atmosphere', aspectRatio: '4:3', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'Warm Tones', depthOfField: 'Shallow (Bokeh Background)' },
        // Slideshow / Interior
        { key: 'interior_1', prompt: 'Private dining room in a high-end Italian restaurant, long rustic wooden table set for 12 guests, iron chandeliers, stone archway, wine rack wall, candles on table, warm ambient lighting, elegant event setting', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Golden Hour', colorGrading: 'Warm Tones' },
        { key: 'interior_2', prompt: 'Modern Italian restaurant bar area with marble counter, backlit premium liquor bottles, copper bar stools, espresso machine, fresh flowers, midnight blue accent lighting mixed with warm tones', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'Warm Tones' },
        // Team (4 members)
        { key: 'chef', prompt: 'Professional portrait of a confident Italian male chef in his 40s, white chef uniform and hat, arms crossed, warm smile, blurred luxury kitchen background with copper pots, warm golden lighting, editorial portrait style', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'sommelier', prompt: 'Professional portrait of an elegant Italian woman sommelier in her 30s, black vest over white blouse, holding a glass of red wine, warm confident smile, blurred wine cellar with oak barrels in background, editorial portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'pastry_chef', prompt: 'Professional portrait of a young Italian male pastry chef in his 20s, white chef uniform with chocolate stains, warm genuine smile, blurred pastry kitchen with desserts in background, editorial portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'manager', prompt: 'Professional portrait of a distinguished Italian man in his 50s wearing a dark suit with pocket square, restaurant manager, warm welcoming smile, blurred elegant restaurant dining room in background, editorial portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
    ],
    buildTemplate: (images) => ({
        name: 'Ristorante Toscano Moderno',
        category: 'restaurant',
        industries: ['restaurant', 'food-beverage'],
        tags: ['italian', 'restaurant', 'tuscan', 'modern', 'food', 'fine-dining', 'reservations'],
        theme: {
            cardBorderRadius: 'none',
            buttonBorderRadius: 'none',
            fontFamilyHeader: 'playfair-display',
            fontFamilyBody: 'inter',
            fontFamilyButton: 'inter',
            fontWeightHeader: 400,
            headingsAllCaps: false,
            buttonsAllCaps: true,
            navLinksAllCaps: true,
            pageBackground: '#1a1410',
            globalColors: {
                primary: '#c8a97e', secondary: '#8b6f47', accent: '#d4a853',
                background: '#1a1410', surface: '#2a2018', text: '#e8ddd0',
                textMuted: '#a89882', heading: '#f5efe7', border: '#3d3229',
                success: '#7fb069', error: '#c75c5c',
            },
        },
        componentOrder: [
            'colors', 'typography', 'header', 'topBar', 'heroGallery', 'logoBanner',
            'menu', 'features', 'slideshow', 'testimonials', 'team', 'howItWorks',
            'faq', 'leads', 'newsletter', 'cta', 'map', 'signupFloat', 'footer',
        ],
        sectionVisibility: buildVisibility([
            'topBar', 'heroGallery', 'logoBanner', 'menu', 'features', 'slideshow',
            'testimonials', 'team', 'howItWorks', 'faq', 'leads', 'newsletter', 'cta', 'map', 'signupFloat',
        ]),
        data: {
            topBar: {
                messages: [
                    { text: '🍕 Free delivery on orders over $30', icon: 'truck', link: '#menu', linkText: 'Order Now' },
                    { text: '📍 Open Mon-Sat 11am - 10pm', icon: 'clock', link: '#map', linkText: 'Directions' },
                ],
                scrollEnabled: true, scrollSpeed: 30, pauseOnHover: true, dismissible: true,
                useGradient: false, backgroundColor: '#2a2018', textColor: '#c8a97e',
                linkColor: '#d4a853', iconColor: '#d4a853', fontSize: 'sm',
                separator: 'dot', showRotatingArrows: true, rotateSpeed: 4000, aboveHeader: true,
            },
            header: {
                style: 'floating-glass', layout: 'minimal', isSticky: true, glassEffect: true, height: 75,
                logoType: 'text', logoText: 'La Toscana', logoWidth: 140,
                links: [
                    { text: 'Menu', href: '#menu' },
                    { text: 'Gallery', href: '#slideshow' },
                    { text: 'About', href: '#features' },
                    { text: 'Reservations', href: '#leads' },
                ],
                hoverStyle: 'underline', ctaText: 'Reserve Table', showCta: true, showLogin: false,
                colors: { background: 'rgba(26, 20, 16, 0.85)', text: '#e8ddd0', accent: '#c8a97e', buttonBackground: '#c8a97e', buttonText: '#1a1410' },
                buttonBorderRadius: 'none', linkFontSize: 13,
            },
            heroGallery: {
                slides: [
                    { headline: 'Authentic Tuscan Cuisine', subheadline: 'Where tradition meets modern elegance', primaryCta: 'VIEW MENU', primaryCtaLink: '#menu', secondaryCta: 'RESERVE TABLE', secondaryCtaLink: '#leads', backgroundImage: images.hero_1 || '', backgroundColor: '#2a2018' },
                    { headline: 'Al Fresco Dining', subheadline: 'Under the Tuscan sun', primaryCta: 'SEE GALLERY', primaryCtaLink: '#slideshow', secondaryCta: 'BOOK NOW', secondaryCtaLink: '#leads', backgroundImage: images.hero_2 || '', backgroundColor: '#2a2018' },
                    { headline: 'Handcrafted with Passion', subheadline: 'Every dish tells a story', primaryCta: 'OUR STORY', primaryCtaLink: '#features', secondaryCta: 'MEET THE CHEF', secondaryCtaLink: '#team', backgroundImage: images.hero_3 || '', backgroundColor: '#2a2018' },
                ],
                autoPlaySpeed: 6000, transitionDuration: 800, showArrows: true, showDots: true, dotStyle: 'line',
                heroHeight: 90, headlineFontSize: 'xl', subheadlineFontSize: 'md', showGrain: true, overlayOpacity: 0.4,
                colors: { background: '#2a2018', text: '#f5efe7', heading: '#f5efe7', ctaText: '#f5efe7', dotActive: '#c8a97e', dotInactive: 'rgba(200,169,126,0.4)', arrowColor: '#f5efe7' },
                buttonBorderRadius: 'none',
            },
            logoBanner: {
                title: 'Featured & Recognized', subtitle: '',
                logos: [
                    { imageUrl: '', alt: 'TripAdvisor', link: '', linkText: '' },
                    { imageUrl: '', alt: 'Michelin Guide', link: '', linkText: '' },
                    { imageUrl: '', alt: 'Yelp', link: '', linkText: '' },
                    { imageUrl: '', alt: 'OpenTable', link: '', linkText: '' },
                    { imageUrl: '', alt: 'Wine Spectator', link: '', linkText: '' },
                ],
                scrollEnabled: true, scrollSpeed: 25, pauseOnHover: true, logoHeight: 35, logoGap: 48,
                grayscale: true, useGradient: false, backgroundColor: '#1a1410', titleColor: '#a89882',
                subtitleColor: '#a89882', titleFontSize: 'sm', subtitleFontSize: 'sm', paddingY: 'sm',
                showDivider: false, dividerColor: '#3d3229',
            },
            menu: {
                menuVariant: 'classic',
                title: 'Il Nostro Menu', description: 'Seasonal ingredients, timeless recipes.',
                paddingY: 'lg', paddingX: 'md',
                items: [
                    { name: 'Pizza Margherita DOP', description: 'San Marzano tomatoes, Fior di Latte, fresh basil, extra virgin olive oil. Wood-fired at 900°F.', price: '$18', imageUrl: images.menu_1 || '', category: 'Primi', isSpecial: true },
                    { name: 'Pappardelle al Cinghiale', description: 'Handmade pappardelle with slow-braised wild boar ragù, Parmigiano-Reggiano, fresh thyme.', price: '$24', imageUrl: images.menu_2 || '', category: 'Primi', isSpecial: false },
                    { name: 'Tiramisù della Casa', description: 'Classic layered mascarpone cream, espresso-soaked ladyfingers, premium cocoa. Family recipe.', price: '$14', imageUrl: images.menu_3 || '', category: 'Dolci', isSpecial: true },
                    { name: 'Bruschetta al Tartufo', description: 'Toasted ciabatta, black truffle cream, burrata, aged balsamic reduction, microgreens.', price: '$16', imageUrl: images.menu_4 || '', category: 'Antipasti', isSpecial: false },
                    { name: 'Ossobuco alla Milanese', description: 'Slow-braised veal shank with saffron risotto, gremolata. A Lombardy classic.', price: '$36', imageUrl: images.menu_5 || '', category: 'Secondi', isSpecial: true },
                    { name: 'Risotto ai Funghi Porcini', description: 'Carnaroli rice, wild porcini, white truffle oil, aged Grana Padano.', price: '$28', imageUrl: images.menu_6 || '', category: 'Primi', isSpecial: false },
                ],
                colors: { background: '#1a1410', accent: '#c8a97e', borderColor: '#3d3229', text: '#a89882', heading: '#f5efe7', cardBackground: '#2a2018', priceColor: '#d4a853' },
                titleFontSize: 'lg', descriptionFontSize: 'md', borderRadius: 'none', showCategories: true,
                animationType: 'fade-in-up', enableCardAnimation: true,
            },
            features: {
                featuresVariant: 'image-overlay',
                paddingY: 'lg', paddingX: 'md',
                title: 'La Nostra Filosofia', description: 'Three pillars that define every dish we serve.',
                items: [
                    { title: 'Farm to Table', description: 'We source ingredients from local organic farms and import specialty items directly from Italy. Every tomato, every olive oil, every flour is carefully selected.', imageUrl: images.wine || '' },
                    { title: 'Family Recipes', description: 'Our recipes have been passed down through four generations of Italian chefs. Authentic flavors that transport you to the heart of Tuscany.', imageUrl: images.hero_3 || '' },
                    { title: 'Wine Selection', description: 'Our sommelier curates over 200 Italian wines, from bold Barolos to crisp Vermentinos. Pairings available for every dish on the menu.', imageUrl: images.interior_2 || '' },
                ],
                gridColumns: 3, imageHeight: 250, imageObjectFit: 'cover',
                animationType: 'fade-in-up', enableCardAnimation: true, borderRadius: 'none',
                colors: { background: '#2a2018', accent: '#c8a97e', borderColor: '#3d3229', text: '#a89882', heading: '#f5efe7', description: '#a89882', cardBackground: '#1a1410' },
            },
            slideshow: {
                slideshowVariant: 'classic', title: 'Our Space', showTitle: true, fullWidth: false,
                paddingY: 'lg', paddingX: 'md', titleFontSize: 'lg', borderRadius: 'none',
                autoPlaySpeed: 5000, transitionEffect: 'slide', transitionDuration: 500,
                showArrows: true, showDots: true, arrowStyle: 'rounded', dotStyle: 'circle',
                kenBurnsIntensity: 'medium', showCaptions: true, slideHeight: 500,
                items: [
                    { imageUrl: images.hero_1 || '', altText: 'Main dining room', caption: 'Main Dining Room' },
                    { imageUrl: images.interior_1 || '', altText: 'Private dining', caption: 'Private Dining Room' },
                    { imageUrl: images.interior_2 || '', altText: 'Bar area', caption: 'The Bar' },
                    { imageUrl: images.hero_2 || '', altText: 'Outdoor terrace', caption: 'Garden Terrace' },
                ],
                colors: { background: '#1a1410', heading: '#f5efe7', arrowBackground: 'rgba(0,0,0,0.5)', arrowText: '#f5efe7', dotActive: '#c8a97e', dotInactive: 'rgba(200,169,126,0.3)', captionBackground: 'rgba(0,0,0,0.7)', captionText: '#f5efe7' },
            },
            testimonials: {
                testimonialsVariant: 'glassmorphism',
                paddingY: 'lg', paddingX: 'md',
                title: 'Guest Reviews', description: 'What our guests say about their dining experience.',
                titleFontSize: 'md', descriptionFontSize: 'md', borderRadius: 'none',
                cardShadow: 'lg', borderStyle: 'solid', cardPadding: 32,
                animationType: 'fade-in-up', enableCardAnimation: true,
                items: [
                    { quote: 'The pappardelle al cinghiale was the best pasta I\'ve ever had outside of Italy. The ambiance transports you straight to Tuscany. An absolute gem.', name: 'Marco R.', title: 'Food & Wine Magazine' },
                    { quote: 'We celebrated our anniversary here and it was unforgettable. The private dining room, the wine selection, the service — everything was impeccable.', name: 'Sarah & James W.', title: 'Regular Guests' },
                    { quote: 'As an Italian native, I\'m very critical of Italian restaurants abroad. La Toscana exceeded my expectations. Truly authentic.', name: 'Giovanni L.', title: 'Italian Culinary Critic' },
                ],
                colors: { background: 'rgba(42,32,24,0.5)', accent: '#c8a97e', borderColor: '#3d3229', text: '#e8ddd0', heading: '#f5efe7', cardBackground: '#2a2018' },
            },
            team: {
                paddingY: 'lg', paddingX: 'md',
                title: 'Meet Our Team', description: 'The passionate people behind every dish.',
                items: [
                    { name: 'Chef Alessandro Bianchi', role: 'Executive Chef & Owner', imageUrl: images.chef || '' },
                    { name: 'Elena Rossi', role: 'Head Sommelier', imageUrl: images.sommelier || '' },
                    { name: 'Marco Ferretti', role: 'Pastry Chef', imageUrl: images.pastry_chef || '' },
                    { name: 'Giuseppe Conti', role: 'General Manager', imageUrl: images.manager || '' },
                ],
                animationType: 'fade-in-up', enableCardAnimation: true,
                colors: { background: '#1a1410', text: '#a89882', heading: '#f5efe7' },
            },
            howItWorks: {
                paddingY: 'lg', paddingX: 'md',
                title: 'Your Dining Experience', description: 'From reservation to unforgettable memories.',
                steps: 4,
                items: [
                    { icon: 'phone', title: 'Reserve', description: 'Book your table online or call us. We accommodate special requests and dietary needs.' },
                    { icon: 'utensils', title: 'Arrive & Be Seated', description: 'Enjoy a welcome glass of Prosecco as our team guides you to your table.' },
                    { icon: 'star', title: 'Savor Every Course', description: 'Let our chef take you on a culinary journey through Tuscany\'s finest flavors.' },
                    { icon: 'heart', title: 'Create Memories', description: 'Leave with a full heart and a desire to return. That\'s our promise.' },
                ],
                colors: { background: '#2a2018', accent: '#c8a97e', text: '#a89882', heading: '#f5efe7' },
            },
            faq: {
                title: 'Frequently Asked Questions', description: 'Everything you need to know before your visit.',
                paddingY: 'lg', paddingX: 'md',
                items: [
                    { question: 'Do you take reservations?', answer: 'Yes! We highly recommend reserving your table, especially for Friday and Saturday evenings. Book online through our website or call us at (555) 123-4567.' },
                    { question: 'Do you accommodate dietary restrictions?', answer: 'Absolutely. Our kitchen is well-versed in gluten-free, vegetarian, vegan, and allergen-friendly preparations. Please inform your server.' },
                    { question: 'Is there a dress code?', answer: 'Smart casual is our dress code. We want you to feel comfortable while enjoying an elevated dining experience.' },
                    { question: 'Do you offer private dining?', answer: 'Yes, our private dining room seats up to 24 guests. Perfect for celebrations, corporate events, and intimate gatherings. Contact us for custom menus.' },
                    { question: 'Is parking available?', answer: 'Complimentary valet parking is available Thursday through Saturday. Street parking is available at all other times.' },
                ],
                colors: { background: '#1a1410', accent: '#c8a97e', borderColor: '#3d3229', text: '#a89882', heading: '#f5efe7' },
            },
            leads: {
                leadsVariant: 'split-gradient',
                title: 'Reserve Your Table', description: 'Complete the form below and we\'ll confirm your reservation within 2 hours.',
                namePlaceholder: 'Full Name', emailPlaceholder: 'email@example.com',
                companyPlaceholder: 'Party Size', messagePlaceholder: 'Special requests, dietary needs, occasion...',
                buttonText: 'Request Reservation',
                paddingY: 'lg', paddingX: 'md', cardBorderRadius: 'none', buttonBorderRadius: 'none',
                titleFontSize: 'lg', descriptionFontSize: 'md',
                colors: {
                    background: '#2a2018', accent: '#c8a97e', borderColor: '#3d3229', text: '#a89882', heading: '#f5efe7',
                    buttonBackground: '#c8a97e', buttonText: '#1a1410', cardBackground: '#1a1410',
                    inputBackground: '#2a2018', inputText: '#f5efe7', inputBorder: '#3d3229',
                    gradientStart: '#c8a97e', gradientEnd: '#8b6f47',
                },
            },
            newsletter: {
                title: 'Join Our Famiglia', description: 'Receive seasonal menus, wine pairing tips, and exclusive invitations.',
                placeholderText: 'Your email address', buttonText: 'Subscribe',
                paddingY: 'md', paddingX: 'md',
                colors: {
                    background: '#1a1410', accent: '#c8a97e', borderColor: '#3d3229', text: '#a89882', heading: '#f5efe7',
                    buttonBackground: '#c8a97e', buttonText: '#1a1410', cardBackground: 'rgba(200,169,126,0.1)',
                    inputBackground: '#2a2018', inputText: '#f5efe7', inputBorder: '#3d3229',
                },
            },
            cta: {
                paddingY: 'lg', paddingX: 'md',
                title: 'An Unforgettable Evening Awaits', description: 'Reserve your table tonight and experience the heart of Tuscany.',
                buttonText: 'Make a Reservation', titleFontSize: 'lg', descriptionFontSize: 'md',
                colors: {
                    background: '#2a2018', gradientStart: '#c8a97e', gradientEnd: '#8b6f47',
                    text: 'rgba(245,239,231,0.8)', heading: '#f5efe7',
                    buttonBackground: '#f5efe7', buttonText: '#1a1410',
                },
            },
            map: {
                title: 'Visit Us', description: 'Located in the heart of downtown.',
                address: '123 Via Toscana, Downtown District', lat: 40.7580, lng: -73.9855, zoom: 15,
                mapVariant: 'modern', paddingY: 'lg', paddingX: 'md', height: 400,
                colors: { background: '#1a1410', text: '#a89882', heading: '#f5efe7', accent: '#c8a97e', cardBackground: '#2a2018' },
                titleFontSize: 'md', descriptionFontSize: 'md', borderRadius: 'none',
            },
            signupFloat: {
                headerText: '🍷 Reserve Your Table',
                descriptionText: 'Book now and enjoy a complimentary glass of Prosecco.',
                imageUrl: images.hero_2 || '', imagePlacement: 'top',
                showNameField: true, showEmailField: true, showPhoneField: true, showMessageField: false,
                namePlaceholder: 'Your Name', emailPlaceholder: 'email@example.com', phonePlaceholder: 'Phone number',
                buttonText: 'Reserve Now', socialLinks: [], showSocialLinks: false,
                floatPosition: 'center', showOnLoad: true, showCloseButton: true, triggerDelay: 8,
                minimizeOnClose: true, minimizedLabel: '🍷 Reserve', width: 380,
                borderRadius: 'lg', buttonBorderRadius: 'none', imageHeight: 160,
                headerFontSize: 'md', descriptionFontSize: 'sm',
                colors: {
                    background: '#2a2018', heading: '#f5efe7', text: '#a89882', accent: '#c8a97e',
                    buttonBackground: '#c8a97e', buttonText: '#1a1410',
                    inputBackground: '#1a1410', inputText: '#f5efe7', inputBorder: '#3d3229', inputPlaceholder: '#6b5d4e',
                    socialIconColor: '#a89882', overlayBackground: 'rgba(0,0,0,0.4)', cardShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                },
            },
            footer: {
                title: 'La Toscana', description: 'Authentic Tuscan cuisine in an intimate, modern setting. Family recipes since 1985.',
                linkColumns: [
                    { title: 'Explore', links: [{ text: 'Menu', href: '#menu' }, { text: 'Gallery', href: '#slideshow' }, { text: 'Our Story', href: '#features' }] },
                    { title: 'Visit', links: [{ text: 'Reservations', href: '#leads' }, { text: 'Location', href: '#map' }, { text: 'Hours', href: '#faq' }] },
                    { title: 'Connect', links: [{ text: 'Events', href: '#cta' }, { text: 'Newsletter', href: '#newsletter' }, { text: 'Gift Cards', href: '#' }] },
                ],
                socialLinks: [
                    { platform: 'instagram', href: '#' }, { platform: 'facebook', href: '#' }, { platform: 'twitter', href: '#' },
                ],
                copyrightText: '© {YEAR} La Toscana Ristorante. All rights reserved.',
                colors: { background: '#c8a97e', border: '#b3956b', text: '#1a1410', linkHover: '#2a2018', heading: '#1a1410' },
            },
        },
    }),
};


// ═══════════════════════════════════════════════════════════════════
//  2. DENTAL CLINIC PREMIUM
// ═══════════════════════════════════════════════════════════════════
export const DENTAL_CLINIC_PRESET: TemplatePreset = {
    id: 'dental-clinic',
    name: 'Clínica Dental Premium',
    icon: <Stethoscope size={24} />,
    color: 'from-cyan-400 to-blue-600',
    description: 'Template médico: servicios, equipo, precios, FAQ, citas, testimonios y mapa.',
    category: 'health',
    images: [
        { key: 'hero', prompt: 'Modern ultra-clean dental clinic reception area, white and light blue interior, minimalist design with curved reception desk, comfortable waiting chairs, indoor plants, large windows with natural light, premium healthcare facility, wide angle shot', aspectRatio: '16:9', style: 'Photorealistic', lighting: 'Natural Lighting', colorGrading: 'Cool Tones' },
        { key: 'treatment', prompt: 'State-of-the-art dental treatment room with modern dental chair, LED overhead light, digital screen showing dental scan, clean white and blue interior, ergonomic equipment, patient-friendly design', aspectRatio: '4:3', style: 'Photorealistic', lighting: 'Natural Lighting', colorGrading: 'Cool Tones' },
        { key: 'smile', prompt: 'Close-up portrait of a happy woman with perfect bright white smile, natural makeup, clean background, dental advertising style, warm natural lighting, professional beauty photography', aspectRatio: '16:9', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'team_1', prompt: 'Professional portrait of a friendly female dentist in her 30s wearing white lab coat with stethoscope, warm confident smile, modern clinic blurred in background, editorial healthcare portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'team_2', prompt: 'Professional portrait of a male orthodontist in his 40s wearing blue scrubs and white lab coat, friendly approachable smile, blurred modern dental clinic background, professional healthcare portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'team_3', prompt: 'Professional portrait of a young Hispanic female dental hygienist in her late 20s, teal scrubs, warm genuine smile, clean dental clinic blurred in background, editorial healthcare portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'team_4', prompt: 'Professional portrait of an Asian female pediatric dentist in her 30s, white lab coat with colorful stethoscope, bright cheerful smile, children-friendly dental office blurred in background, editorial portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'tech', prompt: 'Advanced 3D dental scanning technology in use, digital screen showing tooth model, modern clean dental lab, blue accent lighting, futuristic medical technology aesthetic', aspectRatio: '4:3', style: 'Photorealistic', lighting: 'Dramatic Lighting', colorGrading: 'Cool Tones' },
        { key: 'waiting', prompt: 'Premium dental clinic waiting room with comfortable modern furniture, calming blue and white color scheme, magazine rack, children play area in corner, reception desk with friendly staff, clean and welcoming', aspectRatio: '16:9', style: 'Photorealistic', lighting: 'Natural Lighting', colorGrading: 'Cool Tones' },
        { key: 'bg_pattern', prompt: 'Abstract soft blue and white gradient background with subtle molecular structure pattern, clean medical aesthetic, light and airy, suitable for website background', aspectRatio: '16:9', style: 'Photorealistic', lighting: 'Natural Lighting', colorGrading: 'Cool Tones' },
    ],
    buildTemplate: (images) => ({
        name: 'DentaCare Premium Clinic',
        category: 'health',
        industries: ['health', 'dental', 'medical'],
        tags: ['dental', 'clinic', 'healthcare', 'medical', 'teeth', 'smile', 'orthodontics'],
        theme: {
            cardBorderRadius: 'xl', buttonBorderRadius: 'xl',
            fontFamilyHeader: 'poppins', fontFamilyBody: 'inter', fontFamilyButton: 'poppins',
            fontWeightHeader: 600, headingsAllCaps: false, buttonsAllCaps: false, navLinksAllCaps: false,
            pageBackground: '#f8fbff',
            globalColors: {
                primary: '#0891b2', secondary: '#06b6d4', accent: '#0e7490',
                background: '#f8fbff', surface: '#ffffff', text: '#334155',
                textMuted: '#64748b', heading: '#0f172a', border: '#e2e8f0',
                success: '#10b981', error: '#ef4444',
            },
        },
        componentOrder: [
            'colors', 'typography', 'header', 'topBar', 'hero', 'logoBanner',
            'services', 'features', 'howItWorks', 'team', 'pricing',
            'testimonials', 'faq', 'map', 'leads', 'newsletter', 'cta', 'signupFloat', 'footer',
        ],
        sectionVisibility: buildVisibility([
            'topBar', 'hero', 'logoBanner', 'services', 'features', 'howItWorks',
            'team', 'pricing', 'testimonials', 'faq', 'map', 'leads', 'newsletter', 'cta', 'signupFloat',
        ]),
        data: {
            topBar: {
                messages: [
                    { text: '📞 24/7 Emergency Line: (555) 911-DENT', icon: 'phone', link: '#leads', linkText: 'Call Now' },
                    { text: '✨ First Consultation FREE — Limited Time', icon: 'sparkles', link: '#leads', linkText: 'Book Now' },
                ],
                scrollEnabled: true, scrollSpeed: 30, pauseOnHover: true, dismissible: true,
                useGradient: true, gradientFrom: '#0891b2', gradientTo: '#06b6d4', gradientAngle: 90,
                backgroundColor: '#0891b2', textColor: '#ffffff', linkColor: '#ffffff',
                iconColor: '#ffffff', fontSize: 'sm', separator: 'dot',
                showRotatingArrows: true, rotateSpeed: 4000, aboveHeader: true,
            },
            header: {
                style: 'edge-solid', layout: 'minimal', isSticky: true, glassEffect: false, height: 75,
                logoType: 'text', logoText: 'DentaCare', logoWidth: 140,
                links: [
                    { text: 'Services', href: '#services' }, { text: 'Our Team', href: '#team' },
                    { text: 'Pricing', href: '#pricing' }, { text: 'Contact', href: '#leads' },
                ],
                hoverStyle: 'highlight', ctaText: 'Book Appointment', showCta: true, showLogin: false,
                colors: { background: '#ffffff', text: '#334155', accent: '#0891b2', buttonBackground: '#0891b2', buttonText: '#ffffff' },
                buttonBorderRadius: 'xl', linkFontSize: 14,
            },
            hero: {
                heroVariant: 'gradient', paddingY: 'lg', paddingX: 'md',
                headline: 'Your Smile Deserves <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">The Very Best</span>',
                subheadline: 'Advanced technology, gentle care, and a team dedicated to transforming your smile. First consultation is completely free.',
                primaryCta: 'Book Free Consultation', secondaryCta: 'View Services',
                imageUrl: images.smile || '', imageStyle: 'default', imageDropShadow: true,
                imageBorderRadius: 'xl', imagePosition: 'right', imageWidth: 100,
                colors: {
                    primary: '#0891b2', secondary: '#06b6d4', background: '#f8fbff', text: '#64748b',
                    heading: '#0f172a', buttonBackground: '#0891b2', buttonText: '#ffffff',
                    secondaryButtonBackground: '#e0f2fe', secondaryButtonText: '#0891b2',
                },
                secondaryButtonStyle: 'solid', showBadge: true, badgeText: '✨ First Visit FREE',
                badgeIcon: 'sparkles', badgeColor: '#0891b2', badgeBackgroundColor: '#0891b215',
                buttonBorderRadius: 'xl', animationType: 'fade-in-up',
                primaryCtaLink: '#leads', secondaryCtaLink: '#services',
            },
            logoBanner: {
                title: 'Certified & Accredited', subtitle: '',
                logos: [
                    { imageUrl: '', alt: 'ADA Member', link: '', linkText: '' },
                    { imageUrl: '', alt: 'ISO 9001', link: '', linkText: '' },
                    { imageUrl: '', alt: 'JCI Accredited', link: '', linkText: '' },
                    { imageUrl: '', alt: 'AAO Member', link: '', linkText: '' },
                ],
                scrollEnabled: false, scrollSpeed: 25, pauseOnHover: true, logoHeight: 40, logoGap: 60,
                grayscale: true, useGradient: false, backgroundColor: '#ffffff', titleColor: '#64748b',
                subtitleColor: '#94a3b8', titleFontSize: 'sm', paddingY: 'sm', showDivider: true, dividerColor: '#e2e8f0',
            },
            services: {
                servicesVariant: 'grid', paddingY: 'lg', paddingX: 'md',
                title: 'Our Services', description: 'Comprehensive dental care for the whole family.',
                items: [
                    { icon: 'sparkles', title: 'Teeth Whitening', description: 'Professional in-office and take-home whitening treatments for a brighter, more confident smile.' },
                    { icon: 'shield', title: 'Dental Implants', description: 'Permanent, natural-looking tooth replacement with titanium implants. 98% success rate.' },
                    { icon: 'smile', title: 'Orthodontics', description: 'Invisible aligners and traditional braces for children and adults. Free smile assessment.' },
                    { icon: 'heart', title: 'Preventive Care', description: 'Regular cleanings, exams, and X-rays to keep your smile healthy for a lifetime.' },
                    { icon: 'zap', title: 'Emergency Dental', description: '24/7 emergency dental care. Same-day appointments available for urgent needs.' },
                    { icon: 'star', title: 'Cosmetic Dentistry', description: 'Veneers, bonding, and smile makeovers designed to give you the smile of your dreams.' },
                ],
                animationType: 'fade-in-up', enableCardAnimation: true,
                colors: { background: '#f8fbff', accent: '#0891b2', borderColor: '#e2e8f0', text: '#64748b', heading: '#0f172a' },
            },
            features: {
                featuresVariant: 'modern', paddingY: 'lg', paddingX: 'md',
                title: 'Why Choose DentaCare', description: 'Industry-leading technology and a patient-first approach.',
                items: [
                    { title: '3D Digital Scanning', description: 'No more messy impressions. Our iTero scanner creates precise 3D models of your teeth in minutes.', imageUrl: images.tech || '' },
                    { title: 'Painless Treatments', description: 'Advanced sedation options and laser technology ensure comfortable, stress-free dental procedures.', imageUrl: images.treatment || '' },
                    { title: 'Modern Facility', description: 'State-of-the-art equipment in a warm, welcoming environment designed to ease dental anxiety.', imageUrl: images.waiting || '' },
                ],
                gridColumns: 3, imageHeight: 200, imageObjectFit: 'cover',
                animationType: 'fade-in-up', enableCardAnimation: true, borderRadius: 'xl',
                colors: { background: '#ffffff', accent: '#0891b2', borderColor: '#e2e8f0', text: '#64748b', heading: '#0f172a', description: '#64748b', cardBackground: '#f8fbff' },
            },
            howItWorks: {
                paddingY: 'lg', paddingX: 'md',
                title: 'Your Journey to a Perfect Smile', description: 'Simple steps to world-class dental care.',
                steps: 4,
                items: [
                    { icon: 'phone', title: 'Book Online', description: 'Schedule your free consultation in seconds. Choose a time that works for you.' },
                    { icon: 'search', title: 'Comprehensive Exam', description: 'Full digital scans, X-rays, and a thorough evaluation of your oral health.' },
                    { icon: 'clipboard', title: 'Custom Treatment Plan', description: 'We create a personalized plan tailored to your needs, timeline, and budget.' },
                    { icon: 'sparkles', title: 'Your New Smile', description: 'Watch your transformation unfold with gentle, expert care every step of the way.' },
                ],
                colors: { background: '#f8fbff', accent: '#0891b2', text: '#64748b', heading: '#0f172a' },
            },
            team: {
                paddingY: 'lg', paddingX: 'md',
                title: 'Meet Your Care Team', description: 'Board-certified specialists dedicated to your comfort and health.',
                items: [
                    { name: 'Dr. Sarah Mitchell', role: 'Lead Dentist & Founder, DDS', imageUrl: images.team_1 || '' },
                    { name: 'Dr. James Park', role: 'Orthodontist, DMD', imageUrl: images.team_2 || '' },
                    { name: 'Maria González', role: 'Dental Hygienist, RDH', imageUrl: images.team_3 || '' },
                    { name: 'Dr. Emily Chen', role: 'Pediatric Dentist, DDS', imageUrl: images.team_4 || '' },
                ],
                animationType: 'fade-in-up', enableCardAnimation: true,
                colors: { background: '#ffffff', text: '#64748b', heading: '#0f172a' },
            },
            pricing: {
                pricingVariant: 'gradient', title: 'Transparent Pricing', description: 'No hidden fees. Insurance accepted. Flexible payment plans available.',
                paddingY: 'lg', paddingX: 'md', titleFontSize: 'lg', descriptionFontSize: 'md', cardBorderRadius: 'xl',
                tiers: [
                    { name: 'Essential', price: '$99', frequency: '/visit', description: 'Perfect for routine preventive care.', features: ['Cleaning & Polishing', 'Full Exam & X-rays', 'Oral Cancer Screening', 'Treatment Plan'], buttonText: 'Book Now', buttonLink: '#leads', featured: false },
                    { name: 'Complete', price: '$249', frequency: '/visit', description: 'Comprehensive care and cosmetic treatments.', features: ['Everything in Essential', 'Teeth Whitening', 'Fluoride Treatment', 'Custom Night Guard', 'Priority Scheduling'], buttonText: 'Most Popular', buttonLink: '#leads', featured: true },
                    { name: 'Family Plan', price: '$179', frequency: '/month', description: 'Coverage for the whole family. Up to 4 members.', features: ['All Services Included', 'Emergency Coverage 24/7', '20% off Cosmetic Work', 'Free Pediatric Visits', 'Annual Deep Cleaning'], buttonText: 'Enroll Family', buttonLink: '#leads', featured: false },
                ],
                colors: {
                    background: '#f8fbff', accent: '#0891b2', borderColor: '#e2e8f0', text: '#64748b', heading: '#0f172a',
                    buttonBackground: '#0891b2', buttonText: '#ffffff', checkmarkColor: '#10b981',
                    cardBackground: '#ffffff', gradientStart: '#0891b2', gradientEnd: '#06b6d4',
                },
                animationType: 'fade-in-up', enableCardAnimation: true,
            },
            testimonials: {
                testimonialsVariant: 'glassmorphism', paddingY: 'lg', paddingX: 'md',
                title: 'Patient Stories', description: 'Real results, real smiles.',
                titleFontSize: 'md', descriptionFontSize: 'md', borderRadius: 'xl',
                cardShadow: 'lg', borderStyle: 'solid', cardPadding: 32,
                animationType: 'fade-in-up', enableCardAnimation: true,
                items: [
                    { quote: 'I was terrified of dentists for 20 years. Dr. Mitchell and her team made me feel so comfortable. Now I actually look forward to my appointments!', name: 'Jennifer K.', title: 'Patient for 3 years' },
                    { quote: 'My Invisalign treatment was completed ahead of schedule. The 3D scanning technology made the whole process incredibly precise.', name: 'David M.', title: 'Orthodontics Patient' },
                    { quote: 'The whole family comes here — from my 4-year-old to my parents. The pediatric team is amazing with kids.', name: 'The Rodriguez Family', title: 'Family Plan Members' },
                ],
                colors: { background: 'rgba(8,145,178,0.05)', accent: '#0891b2', borderColor: '#e2e8f0', text: '#334155', heading: '#0f172a', cardBackground: '#ffffff' },
            },
            faq: {
                title: 'Common Questions', description: 'Find answers to your most common dental care questions.',
                paddingY: 'lg', paddingX: 'md',
                items: [
                    { question: 'What insurance plans do you accept?', answer: 'We accept most major PPO dental insurance plans including Delta Dental, Cigna, MetLife, Aetna, and more. We also offer affordable self-pay options and financing through CareCredit.' },
                    { question: 'Is the first consultation really free?', answer: 'Yes! Your initial consultation includes a comprehensive oral exam, digital X-rays, and a personalized treatment plan — all at no cost. We believe everyone deserves access to dental care information.' },
                    { question: 'Do you treat children?', answer: 'Absolutely! Our pediatric dentist, Dr. Chen, specializes in making dental visits fun and stress-free for kids of all ages. We recommend first visits by age 1.' },
                    { question: 'What are your office hours?', answer: 'Monday through Friday: 8am – 6pm. Saturday: 9am – 3pm. Emergency services are available 24/7 — call our emergency line anytime.' },
                ],
                colors: { background: '#ffffff', accent: '#0891b2', borderColor: '#e2e8f0', text: '#64748b', heading: '#0f172a' },
            },
            map: {
                title: 'Find Our Clinic', description: 'Conveniently located with free parking.',
                address: '456 Wellness Drive, Suite 200, Medical District', lat: 40.7489, lng: -73.9680, zoom: 15,
                mapVariant: 'modern', paddingY: 'lg', paddingX: 'md', height: 400,
                colors: { background: '#f8fbff', text: '#64748b', heading: '#0f172a', accent: '#0891b2', cardBackground: '#ffffff' },
                titleFontSize: 'md', descriptionFontSize: 'md', borderRadius: 'xl',
            },
            leads: {
                leadsVariant: 'floating-glass',
                title: 'Book Your Free Consultation', description: 'Fill in the form and we\'ll get back to you within 1 hour.',
                namePlaceholder: 'Full Name', emailPlaceholder: 'email@example.com',
                companyPlaceholder: 'Phone Number', messagePlaceholder: 'Tell us about your dental concern...',
                buttonText: 'Schedule My Appointment',
                paddingY: 'lg', paddingX: 'md', cardBorderRadius: 'xl', buttonBorderRadius: 'xl',
                titleFontSize: 'lg', descriptionFontSize: 'md',
                colors: {
                    background: '#f8fbff', accent: '#0891b2', borderColor: '#e2e8f0', text: '#64748b', heading: '#0f172a',
                    buttonBackground: '#0891b2', buttonText: '#ffffff', cardBackground: '#ffffff',
                    inputBackground: '#f8fbff', inputText: '#0f172a', inputBorder: '#e2e8f0',
                    gradientStart: '#0891b2', gradientEnd: '#06b6d4',
                },
            },
            newsletter: {
                title: 'Oral Health Tips', description: 'Get expert dental advice delivered weekly.',
                placeholderText: 'Your email', buttonText: 'Subscribe', paddingY: 'md', paddingX: 'md',
                colors: {
                    background: '#ffffff', accent: '#0891b2', borderColor: '#e2e8f0', text: '#64748b', heading: '#0f172a',
                    buttonBackground: '#0891b2', buttonText: '#ffffff', cardBackground: 'rgba(8,145,178,0.05)',
                    inputBackground: '#f8fbff', inputText: '#0f172a', inputBorder: '#e2e8f0',
                },
            },
            cta: {
                paddingY: 'lg', paddingX: 'md',
                title: 'Your First Visit is On Us', description: 'Experience world-class dental care — book your free consultation today.',
                buttonText: 'Book Free Consultation', titleFontSize: 'lg', descriptionFontSize: 'md',
                colors: {
                    background: '#0f172a', gradientStart: '#0891b2', gradientEnd: '#06b6d4',
                    text: 'rgba(255,255,255,0.8)', heading: '#ffffff',
                    buttonBackground: '#ffffff', buttonText: '#0891b2',
                },
            },
            signupFloat: {
                headerText: '😁 Free Smile Assessment',
                descriptionText: 'Book your complimentary consultation. Takes 30 seconds.',
                imageUrl: images.smile || '', imagePlacement: 'top',
                showNameField: true, showEmailField: true, showPhoneField: true, showMessageField: false,
                namePlaceholder: 'Your Name', emailPlaceholder: 'email@example.com', phonePlaceholder: 'Phone',
                buttonText: 'Book Free Visit', socialLinks: [], showSocialLinks: false,
                floatPosition: 'center', showOnLoad: true, showCloseButton: true, triggerDelay: 10,
                minimizeOnClose: true, minimizedLabel: '😁 Free Consultation', width: 360,
                borderRadius: 'xl', buttonBorderRadius: 'xl', imageHeight: 160,
                headerFontSize: 'md', descriptionFontSize: 'sm',
                colors: {
                    background: '#ffffff', heading: '#0f172a', text: '#64748b', accent: '#0891b2',
                    buttonBackground: '#0891b2', buttonText: '#ffffff',
                    inputBackground: '#f8fbff', inputText: '#0f172a', inputBorder: '#e2e8f0', inputPlaceholder: '#94a3b8',
                    socialIconColor: '#64748b', overlayBackground: 'rgba(0,0,0,0.2)', cardShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                },
            },
            footer: {
                title: 'DentaCare', description: 'Your trusted partner in dental health. Board-certified specialists, state-of-the-art technology.',
                linkColumns: [
                    { title: 'Services', links: [{ text: 'Teeth Whitening', href: '#services' }, { text: 'Implants', href: '#services' }, { text: 'Orthodontics', href: '#services' }] },
                    { title: 'Patient Info', links: [{ text: 'Pricing', href: '#pricing' }, { text: 'Insurance', href: '#faq' }, { text: 'FAQ', href: '#faq' }] },
                    { title: 'Contact', links: [{ text: 'Book Appointment', href: '#leads' }, { text: 'Location', href: '#map' }, { text: 'Emergency', href: '#' }] },
                ],
                socialLinks: [{ platform: 'instagram', href: '#' }, { platform: 'facebook', href: '#' }, { platform: 'youtube', href: '#' }],
                copyrightText: '© {YEAR} DentaCare Premium Clinic. All rights reserved.',
                colors: { background: '#0891b2', border: '#0e7490', text: '#ffffff', linkHover: '#e0f2fe', heading: '#ffffff' },
            },
        },
    }),
};


// ═══════════════════════════════════════════════════════════════════
//  3. GYM / CROSSFIT ELITE
// ═══════════════════════════════════════════════════════════════════
export const GYM_CROSSFIT_PRESET: TemplatePreset = {
    id: 'gym-crossfit',
    name: 'Gimnasio CrossFit Elite',
    icon: <Dumbbell size={24} />,
    color: 'from-red-500 to-orange-600',
    description: 'Template fitness: programas, equipo, precios, transformaciones y trial gratis.',
    category: 'fitness',
    images: [
        { key: 'hero', prompt: 'Dramatic wide shot of a CrossFit gym during intense workout, athletes doing box jumps and rope climbs, chalk dust in the air, dramatic overhead industrial lighting, raw concrete walls with motivational murals, intense atmosphere', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'High Contrast' },
        { key: 'training_1', prompt: 'Athletic woman performing heavy deadlift in a dark CrossFit box, chalk on hands, focused expression, barbell bending under weight, dramatic side lighting, gritty fitness photography', aspectRatio: '4:3', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'High Contrast', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'training_2', prompt: 'Group HIIT class in modern gym, diverse group of fit people doing battle rope exercises, energetic movement, LED strip lights in ceiling, motivational atmosphere, wide angle', aspectRatio: '4:3', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'High Contrast' },
        { key: 'training_3', prompt: 'Man doing muscle-ups on gymnastic rings in an industrial CrossFit gym, chalk dust visible, dramatic backlighting creating silhouette effect, raw and powerful athletic shot', aspectRatio: '4:3', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'High Contrast', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'coach', prompt: 'Professional portrait of a fit male CrossFit coach in his 30s, wearing black athletic tank top, muscular build, confident smile, arms crossed, blurred gym equipment in background, editorial fitness portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Dramatic Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'coach_2', prompt: 'Professional portrait of a fit athletic woman in her late 20s, wearing red CrossFit tank top, toned arms, energetic confident smile, blurred functional gym background with battle ropes, editorial fitness portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Dramatic Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'coach_3', prompt: 'Professional portrait of a female sports nutritionist in her 30s, white polo shirt, warm professional smile, measuring tape around neck, blurred clean laboratory/clinic background, editorial health portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'coach_4', prompt: 'Professional portrait of a male physiotherapist in his 40s, dark athletic polo, fit build, confident expression, blurred recovery/rehab room with foam rollers in background, editorial fitness portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'facility', prompt: 'Modern CrossFit gym interior wide shot, Olympic lifting platforms, pull-up rigs, kettlebells lined up, rubber flooring, industrial ceiling with exposed ducts, dramatic LED lighting, clean and organized', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'High Contrast' },
        { key: 'yoga', prompt: 'Peaceful yoga class in a loft studio, warm natural light streaming through large windows, diverse group in various yoga poses, wooden floors, plants, calm and serene atmosphere', aspectRatio: '16:9', style: 'Photorealistic', lighting: 'Natural Lighting', colorGrading: 'Warm Tones' },
        { key: 'banner_bg', prompt: 'Dark dramatic abstract background with red and orange light streaks, smoke effect, black background, high energy and intensity feeling, suitable for gym promotional banner', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'High Contrast' },
    ],
    buildTemplate: (images) => ({
        name: 'Iron Forge CrossFit',
        category: 'fitness',
        industries: ['fitness', 'sports', 'health'],
        tags: ['gym', 'crossfit', 'fitness', 'training', 'workout', 'HIIT', 'strength'],
        theme: {
            cardBorderRadius: 'md', buttonBorderRadius: 'md',
            fontFamilyHeader: 'outfit', fontFamilyBody: 'inter', fontFamilyButton: 'outfit',
            fontWeightHeader: 800, headingsAllCaps: true, buttonsAllCaps: true, navLinksAllCaps: true,
            pageBackground: '#0a0a0a',
            globalColors: {
                primary: '#ef4444', secondary: '#f97316', accent: '#f59e0b',
                background: '#0a0a0a', surface: '#171717', text: '#a3a3a3',
                textMuted: '#737373', heading: '#fafafa', border: '#262626',
                success: '#22c55e', error: '#ef4444',
            },
        },
        componentOrder: [
            'colors', 'typography', 'header', 'topBar', 'hero', 'logoBanner',
            'services', 'features', 'howItWorks', 'banner', 'team', 'pricing',
            'testimonials', 'slideshow', 'faq', 'leads', 'cta', 'signupFloat', 'footer',
        ],
        sectionVisibility: buildVisibility([
            'topBar', 'hero', 'logoBanner', 'services', 'features', 'howItWorks',
            'banner', 'team', 'pricing', 'testimonials', 'slideshow', 'faq', 'leads', 'cta', 'signupFloat',
        ]),
        data: {
            topBar: {
                messages: [
                    { text: '🔥 FREE TRIAL WEEK — No Commitment', icon: 'flame', link: '#leads', linkText: 'Claim Now' },
                    { text: '💪 NEW MEMBERS: 50% OFF First Month', icon: 'zap', link: '#pricing', linkText: 'View Plans' },
                ],
                scrollEnabled: true, scrollSpeed: 25, pauseOnHover: true, dismissible: true,
                useGradient: true, gradientFrom: '#ef4444', gradientTo: '#f97316', gradientAngle: 90,
                backgroundColor: '#ef4444', textColor: '#ffffff', linkColor: '#ffffff',
                iconColor: '#ffffff', fontSize: 'sm', separator: 'dot',
                showRotatingArrows: true, rotateSpeed: 3500, aboveHeader: true,
            },
            header: {
                style: 'floating-pill', layout: 'minimal', isSticky: true, glassEffect: false, height: 70,
                logoType: 'text', logoText: 'IRON FORGE', logoWidth: 160,
                links: [
                    { text: 'Programs', href: '#services' }, { text: 'Pricing', href: '#pricing' },
                    { text: 'Coaches', href: '#team' }, { text: 'Results', href: '#testimonials' },
                ],
                hoverStyle: 'glow', ctaText: 'FREE TRIAL', showCta: true, showLogin: false,
                colors: { background: '#171717', text: '#fafafa', accent: '#ef4444', buttonBackground: '#ef4444', buttonText: '#ffffff' },
                buttonBorderRadius: 'md', linkFontSize: 13,
            },
            hero: {
                heroVariant: 'fitness', paddingY: 'lg', paddingX: 'md',
                headline: 'BREAK YOUR <span class="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">LIMITS</span>',
                subheadline: 'Elite CrossFit training for every fitness level. Your first week is completely free.',
                primaryCta: 'START FREE TRIAL', secondaryCta: 'VIEW PROGRAMS',
                imageUrl: images.hero || '', imageStyle: 'default', imageDropShadow: false,
                imageBorderRadius: 'none', imagePosition: 'right', imageWidth: 100,
                backgroundImage: images.hero || '',
                colors: {
                    primary: '#ef4444', secondary: '#f97316', background: '#0a0a0a', text: '#a3a3a3',
                    heading: '#fafafa', buttonBackground: '#ef4444', buttonText: '#ffffff',
                    secondaryButtonBackground: 'transparent', secondaryButtonText: '#fafafa',
                },
                secondaryButtonStyle: 'outline', showBadge: true, badgeText: '🔥 #1 CrossFit Box',
                badgeIcon: 'flame', badgeColor: '#ef4444', badgeBackgroundColor: '#ef444415',
                buttonBorderRadius: 'md', animationType: 'fade-in-up',
                primaryCtaLink: '#leads', secondaryCtaLink: '#services',
            },
            logoBanner: {
                title: 'Trusted by athletes worldwide', subtitle: '',
                logos: [
                    { imageUrl: '', alt: 'CrossFit Affiliate', link: '', linkText: '' },
                    { imageUrl: '', alt: 'Nike Training', link: '', linkText: '' },
                    { imageUrl: '', alt: 'Rogue Fitness', link: '', linkText: '' },
                    { imageUrl: '', alt: 'Reebok', link: '', linkText: '' },
                ],
                scrollEnabled: true, scrollSpeed: 30, pauseOnHover: true, logoHeight: 35, logoGap: 60,
                grayscale: true, useGradient: false, backgroundColor: '#0a0a0a', titleColor: '#737373',
                subtitleColor: '#737373', titleFontSize: 'sm', paddingY: 'sm', showDivider: false,
            },
            services: {
                servicesVariant: 'cards', paddingY: 'lg', paddingX: 'md',
                title: 'OUR PROGRAMS', description: 'Something for every athlete, regardless of experience.',
                items: [
                    { icon: 'flame', title: 'CrossFit WOD', description: 'Daily programmed workouts combining gymnastics, weightlifting, and cardio. Scalable for all levels.' },
                    { icon: 'zap', title: 'HIIT Burn', description: 'High-intensity interval training designed to torch calories and build endurance in 45 minutes.' },
                    { icon: 'dumbbell', title: 'Olympic Lifting', description: 'Master the snatch and clean & jerk with certified Olympic lifting coaches.' },
                    { icon: 'heart', title: 'Yoga Flow', description: 'Active recovery and flexibility sessions to complement your training and prevent injury.' },
                    { icon: 'users', title: 'Personal Training', description: 'One-on-one sessions tailored to your specific goals, schedule, and fitness level.' },
                    { icon: 'target', title: 'Boxing / MMA', description: 'Strike training, bag work, and self-defense fundamentals in a high-energy setting.' },
                ],
                animationType: 'fade-in-up', enableCardAnimation: true,
                colors: { background: '#0a0a0a', accent: '#ef4444', borderColor: '#262626', text: '#a3a3a3', heading: '#fafafa' },
            },
            features: {
                featuresVariant: 'cinematic-gym', paddingY: 'lg', paddingX: 'md',
                title: 'WHY IRON FORGE', description: '',
                items: [
                    { title: 'TRAIN', description: 'World-class facility with competition-grade equipment. 15,000 sq ft of pure training space.', imageUrl: images.training_1 || '' },
                    { title: 'TRANSFORM', description: 'Expert programming backed by sports science. Average member sees results in just 30 days.', imageUrl: images.training_2 || '' },
                    { title: 'TRIUMPH', description: 'Join a community of 500+ athletes who have transformed their lives through discipline and grit.', imageUrl: images.training_3 || '' },
                ],
                gridColumns: 3, imageHeight: 300, imageObjectFit: 'cover',
                animationType: 'fade-in-up', enableCardAnimation: true, borderRadius: 'md',
                colors: { background: '#171717', accent: '#ef4444', borderColor: '#262626', text: '#a3a3a3', heading: '#fafafa', description: '#a3a3a3', cardBackground: '#0a0a0a' },
            },
            howItWorks: {
                paddingY: 'lg', paddingX: 'md',
                title: 'YOUR JOURNEY STARTS HERE', description: '',
                steps: 4,
                items: [
                    { icon: 'calendar', title: 'BOOK FREE TRIAL', description: 'Sign up online in 30 seconds. No credit card required.' },
                    { icon: 'clipboard', title: 'FITNESS ASSESSMENT', description: 'Our coaches evaluate your level and set personalized benchmarks.' },
                    { icon: 'target', title: 'START TRAINING', description: 'Jump into classes with full coaching support from day one.' },
                    { icon: 'trophy', title: 'SEE RESULTS', description: 'Track progress with monthly assessments and celebrate milestones.' },
                ],
                colors: { background: '#0a0a0a', accent: '#ef4444', text: '#a3a3a3', heading: '#fafafa' },
            },
            banner: {
                bannerVariant: 'classic',
                headline: 'BLACK FRIDAY: 70% OFF', subheadline: 'Unlimited classes. No lock-in contract. Join the forge.',
                buttonText: 'CLAIM OFFER', buttonUrl: '#leads', showButton: true,
                backgroundImageUrl: images.banner_bg || '', backgroundOverlayOpacity: 60, height: 350,
                textAlignment: 'center', paddingY: 'lg', paddingX: 'md',
                headlineFontSize: 'xl', subheadlineFontSize: 'md',
                colors: { background: '#0a0a0a', overlayColor: '#000000', heading: '#ffffff', text: '#ffffff', buttonBackground: '#ef4444', buttonText: '#ffffff' },
            },
            team: {
                paddingY: 'lg', paddingX: 'md',
                title: 'MEET YOUR COACHES', description: 'Certified professionals who live and breathe fitness.',
                items: [
                    { name: 'Coach Mike Torres', role: 'Head Coach — CrossFit L3', imageUrl: images.coach || '' },
                    { name: 'Coach Sarah Keane', role: 'HIIT & Conditioning Specialist', imageUrl: images.coach_2 || '' },
                    { name: 'Dr. Lisa Nguyen', role: 'Sports Nutritionist', imageUrl: images.coach_3 || '' },
                    { name: 'Carlos Rivera', role: 'Recovery & Mobility Coach', imageUrl: images.coach_4 || '' },
                ],
                animationType: 'fade-in-up', enableCardAnimation: true,
                colors: { background: '#171717', text: '#a3a3a3', heading: '#fafafa' },
            },
            pricing: {
                pricingVariant: 'classic', title: 'MEMBERSHIP PLANS', description: 'No hidden fees. Cancel anytime.',
                paddingY: 'lg', paddingX: 'md', titleFontSize: 'lg', descriptionFontSize: 'md', cardBorderRadius: 'md',
                tiers: [
                    { name: 'Drop-In', price: '$25', frequency: '/class', description: 'Try any single class.', features: ['Any class, any time', 'Full coaching', 'Equipment included', 'Shower & locker'], buttonText: 'Book Class', buttonLink: '#leads', featured: false },
                    { name: 'Unlimited', price: '$149', frequency: '/month', description: 'Most popular choice.', features: ['Unlimited classes', 'Open gym access', 'Monthly assessment', 'Nutrition guidance', 'Community events'], buttonText: 'Start Now', buttonLink: '#leads', featured: true },
                    { name: 'Elite', price: '$249', frequency: '/month', description: 'For the serious athlete.', features: ['Everything Unlimited', '2x Personal Training/week', 'Competition prep', 'Recovery sessions', 'Priority booking'], buttonText: 'Go Elite', buttonLink: '#leads', featured: false },
                ],
                colors: {
                    background: '#0a0a0a', accent: '#ef4444', borderColor: '#262626', text: '#a3a3a3', heading: '#fafafa',
                    buttonBackground: '#ef4444', buttonText: '#ffffff', checkmarkColor: '#22c55e',
                    cardBackground: '#171717', gradientStart: '#ef4444', gradientEnd: '#f97316',
                },
                animationType: 'fade-in-up', enableCardAnimation: true,
            },
            testimonials: {
                testimonialsVariant: 'glassmorphism', paddingY: 'lg', paddingX: 'md',
                title: 'RESULTS SPEAK', description: '',
                titleFontSize: 'lg', descriptionFontSize: 'md', borderRadius: 'md',
                cardShadow: 'lg', borderStyle: 'solid', cardPadding: 28,
                animationType: 'fade-in-up', enableCardAnimation: true,
                items: [
                    { quote: 'Lost 30 lbs in 4 months. Gained a community for life. Iron Forge changed everything for me.', name: 'Alex P.', title: 'Member since 2023' },
                    { quote: 'Went from zero pull-ups to 15 unbroken in 6 months. The coaches here actually care about your progress.', name: 'Maria S.', title: 'CrossFit Athlete' },
                    { quote: 'As a former D1 athlete, I was skeptical. This is the real deal. Best programming I\'ve ever followed.', name: 'Jason T.', title: 'Former College Football' },
                ],
                colors: { background: 'rgba(23,23,23,0.5)', accent: '#ef4444', borderColor: '#262626', text: '#a3a3a3', heading: '#fafafa', cardBackground: '#171717' },
            },
            slideshow: {
                slideshowVariant: 'classic', title: 'OUR FACILITY', showTitle: true, fullWidth: false,
                paddingY: 'lg', paddingX: 'md', titleFontSize: 'lg', borderRadius: 'md',
                autoPlaySpeed: 4000, transitionEffect: 'slide', transitionDuration: 500,
                showArrows: true, showDots: true, arrowStyle: 'rounded', dotStyle: 'circle',
                showCaptions: true, slideHeight: 500,
                items: [
                    { imageUrl: images.facility || '', altText: 'Main floor', caption: 'Training Floor — 15,000 sq ft' },
                    { imageUrl: images.training_2 || '', altText: 'HIIT area', caption: 'HIIT & Conditioning Zone' },
                    { imageUrl: images.yoga || '', altText: 'Yoga studio', caption: 'Yoga & Recovery Studio' },
                    { imageUrl: images.hero || '', altText: 'CrossFit', caption: 'CrossFit Competition Area' },
                ],
                colors: { background: '#0a0a0a', heading: '#fafafa', arrowBackground: 'rgba(0,0,0,0.6)', arrowText: '#ffffff', dotActive: '#ef4444', dotInactive: 'rgba(239,68,68,0.3)', captionBackground: 'rgba(0,0,0,0.7)', captionText: '#ffffff' },
            },
            faq: {
                title: 'FAQ', description: '',
                paddingY: 'lg', paddingX: 'md',
                items: [
                    { question: 'Do I need to be fit to start?', answer: 'Absolutely not. Every workout is scalable. We have complete beginners and competitive athletes training side by side. Our coaches modify everything for your level.' },
                    { question: 'What should I bring to my first class?', answer: 'Just wear comfortable workout clothes and bring a water bottle. We provide all equipment. Athletic shoes are recommended (no open-toed footwear).' },
                    { question: 'How does the free trial work?', answer: 'Sign up online, pick any class throughout the week, and show up! No credit card required. If you love it, we\'ll help you pick the right membership.' },
                    { question: 'Are there showers and lockers?', answer: 'Yes! Full locker rooms with showers, towels, and toiletries. Premium lockers available for monthly renters.' },
                ],
                colors: { background: '#171717', accent: '#ef4444', borderColor: '#262626', text: '#a3a3a3', heading: '#fafafa' },
            },
            leads: {
                leadsVariant: 'minimal-border',
                title: 'CLAIM YOUR FREE TRIAL', description: 'No commitment. No credit card. Just show up and work out.',
                namePlaceholder: 'Full Name', emailPlaceholder: 'email@example.com',
                companyPlaceholder: 'Phone Number', messagePlaceholder: 'What are your fitness goals?',
                buttonText: 'START FREE WEEK',
                paddingY: 'lg', paddingX: 'md', cardBorderRadius: 'md', buttonBorderRadius: 'md',
                titleFontSize: 'lg', descriptionFontSize: 'md',
                colors: {
                    background: '#0a0a0a', accent: '#ef4444', borderColor: '#262626', text: '#a3a3a3', heading: '#fafafa',
                    buttonBackground: '#ef4444', buttonText: '#ffffff', cardBackground: '#171717',
                    inputBackground: '#0a0a0a', inputText: '#fafafa', inputBorder: '#262626',
                    gradientStart: '#ef4444', gradientEnd: '#f97316',
                },
            },
            cta: {
                paddingY: 'lg', paddingX: 'md',
                title: 'YOUR TRANSFORMATION STARTS TODAY', description: 'Join 500+ members who chose to become their best selves.',
                buttonText: 'GET STARTED FREE', titleFontSize: 'lg', descriptionFontSize: 'md',
                colors: {
                    background: '#0a0a0a', gradientStart: '#ef4444', gradientEnd: '#f97316',
                    text: 'rgba(255,255,255,0.8)', heading: '#ffffff',
                    buttonBackground: '#ffffff', buttonText: '#ef4444',
                },
            },
            signupFloat: {
                headerText: '🔥 Free Trial Week',
                descriptionText: 'No credit card. No commitment. Just results.',
                imageUrl: images.training_1 || '', imagePlacement: 'top',
                showNameField: true, showEmailField: true, showPhoneField: false, showMessageField: false,
                namePlaceholder: 'Your Name', emailPlaceholder: 'email@example.com',
                buttonText: 'CLAIM FREE WEEK', socialLinks: [], showSocialLinks: false,
                floatPosition: 'center', showOnLoad: true, showCloseButton: true, triggerDelay: 6,
                minimizeOnClose: true, minimizedLabel: '🔥 Free Trial', width: 360,
                borderRadius: 'md', buttonBorderRadius: 'md', imageHeight: 160,
                headerFontSize: 'md', descriptionFontSize: 'sm',
                colors: {
                    background: '#171717', heading: '#fafafa', text: '#a3a3a3', accent: '#ef4444',
                    buttonBackground: '#ef4444', buttonText: '#ffffff',
                    inputBackground: '#0a0a0a', inputText: '#fafafa', inputBorder: '#262626', inputPlaceholder: '#737373',
                    socialIconColor: '#a3a3a3', overlayBackground: 'rgba(0,0,0,0.5)', cardShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
                },
            },
            footer: {
                title: 'IRON FORGE', description: 'Elite CrossFit & Fitness Training. Forge your strength.',
                linkColumns: [
                    { title: 'Programs', links: [{ text: 'CrossFit', href: '#services' }, { text: 'HIIT', href: '#services' }, { text: 'Personal Training', href: '#services' }] },
                    { title: 'Info', links: [{ text: 'Pricing', href: '#pricing' }, { text: 'Schedule', href: '#' }, { text: 'FAQ', href: '#faq' }] },
                    { title: 'Connect', links: [{ text: 'Free Trial', href: '#leads' }, { text: 'Coaches', href: '#team' }, { text: 'Contact', href: '#leads' }] },
                ],
                socialLinks: [{ platform: 'instagram', href: '#' }, { platform: 'youtube', href: '#' }, { platform: 'tiktok', href: '#' }],
                copyrightText: '© {YEAR} Iron Forge CrossFit. All rights reserved.',
                colors: { background: '#ef4444', border: '#dc2626', text: '#ffffff', linkHover: '#fecaca', heading: '#ffffff' },
            },
        },
    }),
};


// ═══════════════════════════════════════════════════════════════════
//  4. LAW FIRM
// ═══════════════════════════════════════════════════════════════════
export const LAW_FIRM_PRESET: TemplatePreset = {
    id: 'law-firm',
    name: 'Bufete de Abogados',
    icon: <Briefcase size={24} />,
    color: 'from-amber-600 to-yellow-700',
    description: 'Template corporativo: servicios legales, equipo, casos, FAQ y consultas. ',
    category: 'professional',
    images: [
        { key: 'hero', prompt: 'Prestigious law firm modern office interior, floor-to-ceiling windows with city skyline view at dusk, dark walnut wood paneling, leather chairs, law books on mahogany shelves, brass desk lamp, sophisticated and powerful atmosphere', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Golden Hour', colorGrading: 'Warm Tones' },
        { key: 'partner_1', prompt: 'Professional portrait of a distinguished male attorney in his 50s, navy blue suit with silk tie, silver hair, confident expression, modern office with city view blurred in background, editorial corporate portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'partner_2', prompt: 'Professional portrait of a confident female attorney in her 40s, charcoal gray suit, pearl earrings, warm professional smile, law library bookshelves blurred in background, editorial corporate portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'partner_3', prompt: 'Professional portrait of a distinguished African American male attorney in his 40s, dark charcoal suit, red tie, confident composed expression, modern glass conference room blurred in background, editorial corporate portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'partner_4', prompt: 'Professional portrait of a Hispanic female attorney in her 30s, navy pantsuit, minimal jewelry, sharp intelligent expression, floor-to-ceiling windows with city skyline blurred in background, editorial corporate portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'courtroom', prompt: 'Modern courtroom or conference room in a prestigious law firm, dark wood table, leather chairs, American flag, legal documents spread on table, dramatic window light creating strong shadows, powerful atmosphere', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'Warm Tones' },
        { key: 'office', prompt: 'Corner office of a senior partner at a major law firm, mahogany desk, leather executive chair, city skyline at golden hour through floor-to-ceiling windows, legal books, framed diplomas, brass accents', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Golden Hour', colorGrading: 'Warm Tones' },
        { key: 'meeting', prompt: 'Legal team in a glass-walled conference room, diverse group of attorneys reviewing documents, city view behind them, professional attire, warm natural lighting, collaborative corporate atmosphere', aspectRatio: '4:3', style: 'Photorealistic', lighting: 'Natural Lighting', colorGrading: 'Warm Tones' },
        { key: 'scales', prompt: 'Close-up of golden scales of justice on a dark walnut desk, blurred law books in background, warm side lighting creating dramatic shadows, symbolism of law and balance, high-end still life photography', aspectRatio: '4:3', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'Warm Tones', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'lobby', prompt: 'Grand lobby of a prestigious law firm, marble floors, dark wood reception desk, brass accents, subtle lighting, fresh flowers, corporate art on walls, refined and powerful entrance', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Natural Lighting', colorGrading: 'Warm Tones' },
    ],
    buildTemplate: (images) => ({
        name: 'Mitchell & Partners Law',
        category: 'professional',
        industries: ['legal', 'professional-services', 'corporate'],
        tags: ['law-firm', 'attorney', 'legal', 'corporate', 'professional', 'consultation'],
        theme: {
            cardBorderRadius: 'md', buttonBorderRadius: 'md',
            fontFamilyHeader: 'playfair-display', fontFamilyBody: 'inter', fontFamilyButton: 'inter',
            fontWeightHeader: 700, headingsAllCaps: false, buttonsAllCaps: false, navLinksAllCaps: false,
            pageBackground: '#faf8f5',
            globalColors: {
                primary: '#92700c', secondary: '#b8860b', accent: '#a67c00',
                background: '#faf8f5', surface: '#ffffff', text: '#44403c',
                textMuted: '#78716c', heading: '#1c1917', border: '#e7e5e4',
                success: '#15803d', error: '#b91c1c',
            },
        },
        componentOrder: [
            'colors', 'typography', 'header', 'heroSplit', 'logoBanner',
            'services', 'features', 'howItWorks', 'team', 'portfolio',
            'testimonials', 'faq', 'leads', 'newsletter', 'cta', 'map', 'footer',
        ],
        sectionVisibility: buildVisibility([
            'heroSplit', 'logoBanner', 'services', 'features', 'howItWorks',
            'team', 'portfolio', 'testimonials', 'faq', 'leads', 'newsletter', 'cta', 'map',
        ]),
        data: {
            header: {
                style: 'edge-bordered', layout: 'classic', isSticky: true, glassEffect: false, height: 80,
                logoType: 'text', logoText: 'Mitchell & Partners', logoWidth: 200,
                links: [
                    { text: 'Practice Areas', href: '#services' }, { text: 'Our Team', href: '#team' },
                    { text: 'Results', href: '#portfolio' }, { text: 'Contact', href: '#leads' },
                ],
                hoverStyle: 'underline', ctaText: 'Free Consultation', showCta: true, showLogin: false,
                colors: { background: '#ffffff', text: '#44403c', accent: '#92700c', buttonBackground: '#92700c', buttonText: '#ffffff' },
                buttonBorderRadius: 'md', linkFontSize: 14,
            },
            heroSplit: {
                headline: 'Protecting Your Rights Since 1998',
                subheadline: 'Over $500 million recovered for our clients. Nationally recognized trial attorneys fighting for justice and accountability.',
                buttonText: 'Free Case Evaluation', buttonUrl: '#leads',
                imageUrl: images.hero || '', imagePosition: 'right',
                maxHeight: 550, angleIntensity: 12,
                colors: { textBackground: '#faf8f5', imageBackground: '#1c1917', heading: '#1c1917', text: '#44403c', buttonBackground: '#92700c', buttonText: '#ffffff' },
                headlineFontSize: 'lg', subheadlineFontSize: 'md', buttonBorderRadius: 'md',
            },
            logoBanner: {
                title: 'As Featured In', subtitle: '',
                logos: [
                    { imageUrl: '', alt: 'Forbes', link: '', linkText: '' },
                    { imageUrl: '', alt: 'Bloomberg Law', link: '', linkText: '' },
                    { imageUrl: '', alt: 'The Wall Street Journal', link: '', linkText: '' },
                    { imageUrl: '', alt: 'Super Lawyers', link: '', linkText: '' },
                    { imageUrl: '', alt: 'Chambers & Partners', link: '', linkText: '' },
                ],
                scrollEnabled: true, scrollSpeed: 25, pauseOnHover: true, logoHeight: 35, logoGap: 55,
                grayscale: true, useGradient: false, backgroundColor: '#ffffff', titleColor: '#78716c',
                subtitleColor: '#a8a29e', titleFontSize: 'sm', paddingY: 'sm', showDivider: true, dividerColor: '#e7e5e4',
            },
            services: {
                servicesVariant: 'minimal', paddingY: 'lg', paddingX: 'md',
                title: 'Practice Areas', description: 'Comprehensive legal expertise across multiple disciplines.',
                items: [
                    { icon: 'building', title: 'Corporate Law', description: 'M&A, governance, compliance, and strategic counsel for businesses of all sizes.' },
                    { icon: 'shield', title: 'Litigation & Disputes', description: 'Aggressive trial advocacy with a 98% success rate. We fight to win.' },
                    { icon: 'file-text', title: 'Intellectual Property', description: 'Patent, trademark, and copyright protection. Trade secret litigation.' },
                    { icon: 'users', title: 'Employment Law', description: 'Workplace disputes, discrimination claims, executive contracts, and compliance.' },
                    { icon: 'home', title: 'Real Estate', description: 'Commercial transactions, development, zoning, and property disputes.' },
                    { icon: 'globe', title: 'International Law', description: 'Cross-border transactions, international arbitration, and regulatory compliance.' },
                ],
                animationType: 'fade-in-up', enableCardAnimation: true,
                colors: { background: '#faf8f5', accent: '#92700c', borderColor: '#e7e5e4', text: '#78716c', heading: '#1c1917' },
            },
            features: {
                featuresVariant: 'image-overlay', paddingY: 'lg', paddingX: 'md',
                title: 'Why Choose Mitchell & Partners', description: '',
                items: [
                    { title: '$500M+ Recovered', description: 'Our track record speaks for itself. We\'ve recovered over half a billion dollars for our clients across 2,000+ cases.', imageUrl: images.scales || '' },
                    { title: '98% Success Rate', description: 'Our meticulous preparation and aggressive advocacy deliver results. We take cases to trial when others won\'t.', imageUrl: images.courtroom || '' },
                    { title: '25+ Years Experience', description: 'Decades of combined legal experience. Partners who have argued before the Supreme Court and federal appellate courts.', imageUrl: images.meeting || '' },
                ],
                gridColumns: 3, imageHeight: 250, imageObjectFit: 'cover',
                animationType: 'fade-in-up', enableCardAnimation: true, borderRadius: 'md',
                colors: { background: '#ffffff', accent: '#92700c', borderColor: '#e7e5e4', text: '#78716c', heading: '#1c1917', description: '#78716c', cardBackground: '#faf8f5' },
            },
            howItWorks: {
                paddingY: 'lg', paddingX: 'md',
                title: 'How We Work', description: 'A clear, transparent process from first call to resolution.',
                steps: 4,
                items: [
                    { icon: 'phone', title: 'Free Consultation', description: 'We review your case during a confidential, no-obligation consultation.' },
                    { icon: 'search', title: 'Investigation', description: 'Deep research, evidence gathering, and expert analysis to build an airtight strategy.' },
                    { icon: 'sword', title: 'Aggressive Pursuit', description: 'Skilled negotiation or courtroom litigation — whatever it takes to protect your interests.' },
                    { icon: 'trophy', title: 'Resolution', description: 'We deliver results: settlements, verdicts, and peace of mind for our clients.' },
                ],
                colors: { background: '#faf8f5', accent: '#92700c', text: '#78716c', heading: '#1c1917' },
            },
            team: {
                paddingY: 'lg', paddingX: 'md',
                title: 'Our Partners', description: 'Nationally recognized attorneys with decades of combined experience.',
                items: [
                    { name: 'Richard Mitchell', role: 'Founding Partner — Corporate & Litigation', imageUrl: images.partner_1 || '' },
                    { name: 'Catherine Shaw', role: 'Managing Partner — IP & Tech Law', imageUrl: images.partner_2 || '' },
                    { name: 'David Reeves', role: 'Senior Partner — Employment & Labor', imageUrl: images.partner_3 || '' },
                    { name: 'Amanda Torres', role: 'Partner — International & Trade', imageUrl: images.partner_4 || '' },
                ],
                animationType: 'fade-in-up', enableCardAnimation: true,
                colors: { background: '#ffffff', text: '#78716c', heading: '#1c1917' },
            },
            portfolio: {
                paddingY: 'lg', paddingX: 'md',
                title: 'Notable Cases', description: 'Select victories that demonstrate our commitment to justice.',
                items: [
                    { title: 'Tech Corp vs. DataBreach Inc.', description: '$125M settlement in landmark data privacy case. Set new industry precedent for corporate accountability.', imageUrl: images.courtroom || '' },
                    { title: 'Workers\' Rights Coalition', description: 'Class action resulting in $50M recovery for 3,000+ workers denied overtime and benefits.', imageUrl: images.meeting || '' },
                    { title: 'Innovation IP Defense', description: 'Successfully defended Fortune 500 company\'s patent portfolio in multi-district litigation.', imageUrl: images.office || '' },
                ],
                animationType: 'fade-in-up', enableCardAnimation: true,
                colors: { background: '#faf8f5', accent: '#92700c', borderColor: '#e7e5e4', text: '#78716c', heading: '#1c1917' },
            },
            testimonials: {
                testimonialsVariant: 'glassmorphism', paddingY: 'lg', paddingX: 'md',
                title: 'Client Testimonials', description: '',
                titleFontSize: 'md', descriptionFontSize: 'md', borderRadius: 'md',
                cardShadow: 'lg', borderStyle: 'solid', cardPadding: 32,
                animationType: 'fade-in-up', enableCardAnimation: true,
                items: [
                    { quote: 'Mitchell & Partners fought relentlessly for our company. The $125M settlement exceeded our expectations. Their preparation was extraordinary.', name: 'CEO, Tech Corp', title: 'Corporate Client' },
                    { quote: 'When other firms said our case was too complex, Mitchell & Partners took it on and won. They changed my family\'s life.', name: 'Robert K.', title: 'Personal Injury Client' },
                    { quote: 'Professional, discreet, and incredibly effective. They protected our intellectual property when it mattered most.', name: 'General Counsel, Innovation Inc.', title: 'IP Client' },
                ],
                colors: { background: 'rgba(250,248,245,0.5)', accent: '#92700c', borderColor: '#e7e5e4', text: '#44403c', heading: '#1c1917', cardBackground: '#ffffff' },
            },
            faq: {
                title: 'Frequently Asked Questions', description: '',
                paddingY: 'lg', paddingX: 'md',
                items: [
                    { question: 'How much does a consultation cost?', answer: 'Initial consultations are completely free and confidential. We\'ll evaluate your case and provide honest guidance about your legal options.' },
                    { question: 'Do you work on contingency?', answer: 'For personal injury and certain litigation cases, we work on a contingency basis — you don\'t pay unless we win. Corporate and transactional matters are billed on an agreed-upon basis.' },
                    { question: 'What areas of law do you practice?', answer: 'Our firm covers corporate law, litigation, intellectual property, employment law, real estate, and international law. We have specialists in each area.' },
                    { question: 'How quickly can you respond to urgent matters?', answer: 'We offer same-day consultations for urgent legal matters. Our team is accessible 24/7 for existing clients with emergency needs.' },
                ],
                colors: { background: '#ffffff', accent: '#92700c', borderColor: '#e7e5e4', text: '#78716c', heading: '#1c1917' },
            },
            leads: {
                leadsVariant: 'classic',
                title: 'Schedule Your Free Consultation', description: 'Tell us about your case. All communications are confidential.',
                namePlaceholder: 'Full Name', emailPlaceholder: 'email@example.com',
                companyPlaceholder: 'Company (optional)', messagePlaceholder: 'Briefly describe your legal matter...',
                buttonText: 'Request Consultation',
                paddingY: 'lg', paddingX: 'md', cardBorderRadius: 'md', buttonBorderRadius: 'md',
                titleFontSize: 'lg', descriptionFontSize: 'md',
                colors: {
                    background: '#faf8f5', accent: '#92700c', borderColor: '#e7e5e4', text: '#78716c', heading: '#1c1917',
                    buttonBackground: '#92700c', buttonText: '#ffffff', cardBackground: '#ffffff',
                    inputBackground: '#faf8f5', inputText: '#1c1917', inputBorder: '#e7e5e4',
                    gradientStart: '#92700c', gradientEnd: '#b8860b',
                },
            },
            newsletter: {
                title: 'Legal Insights', description: 'Stay informed with our monthly legal analysis and industry updates.',
                placeholderText: 'Your email', buttonText: 'Subscribe', paddingY: 'md', paddingX: 'md',
                colors: {
                    background: '#ffffff', accent: '#92700c', borderColor: '#e7e5e4', text: '#78716c', heading: '#1c1917',
                    buttonBackground: '#92700c', buttonText: '#ffffff', cardBackground: 'rgba(146,112,12,0.05)',
                    inputBackground: '#faf8f5', inputText: '#1c1917', inputBorder: '#e7e5e4',
                },
            },
            cta: {
                paddingY: 'lg', paddingX: 'md',
                title: 'Protect What Matters Most', description: 'Our attorneys are ready to fight for you. The first consultation is free.',
                buttonText: 'Get Your Free Case Evaluation', titleFontSize: 'lg', descriptionFontSize: 'md',
                colors: {
                    background: '#1c1917', gradientStart: '#92700c', gradientEnd: '#b8860b',
                    text: 'rgba(255,255,255,0.8)', heading: '#ffffff',
                    buttonBackground: '#ffffff', buttonText: '#92700c',
                },
            },
            map: {
                title: 'Our Office', description: 'Located in the heart of the Financial District.',
                address: '200 Park Avenue, 35th Floor, Financial District', lat: 40.7527, lng: -73.9772, zoom: 15,
                mapVariant: 'modern', paddingY: 'lg', paddingX: 'md', height: 400,
                colors: { background: '#faf8f5', text: '#78716c', heading: '#1c1917', accent: '#92700c', cardBackground: '#ffffff' },
                titleFontSize: 'md', descriptionFontSize: 'md', borderRadius: 'md',
            },
            footer: {
                title: 'Mitchell & Partners', description: 'Excellence in legal representation since 1998. Nationally recognized trial attorneys.',
                linkColumns: [
                    { title: 'Practice Areas', links: [{ text: 'Corporate Law', href: '#services' }, { text: 'Litigation', href: '#services' }, { text: 'IP Law', href: '#services' }] },
                    { title: 'The Firm', links: [{ text: 'Our Team', href: '#team' }, { text: 'Results', href: '#portfolio' }, { text: 'News', href: '#newsletter' }] },
                    { title: 'Contact', links: [{ text: 'Consultation', href: '#leads' }, { text: 'Office', href: '#map' }, { text: 'Careers', href: '#' }] },
                ],
                socialLinks: [{ platform: 'linkedin', href: '#' }, { platform: 'twitter', href: '#' }],
                copyrightText: '© {YEAR} Mitchell & Partners LLP. All rights reserved. Attorney advertising.',
                colors: { background: '#1c1917', border: '#292524', text: '#d6d3d1', linkHover: '#fef3c7', heading: '#f5f5f4' },
            },
        },
    }),
};


// ═══════════════════════════════════════════════════════════════════
//  5. MARKETING AGENCY
// ═══════════════════════════════════════════════════════════════════
export const MARKETING_AGENCY_PRESET: TemplatePreset = {
    id: 'marketing-agency',
    name: 'Agencia de Marketing Digital',
    icon: <Palette size={24} />,
    color: 'from-violet-500 to-fuchsia-600',
    description: 'Template creativo: servicios, portafolio, equipo, precios, resultados y más.',
    category: 'agency',
    images: [
        { key: 'hero', prompt: 'Abstract dynamic 3D render of floating holographic UI screens, data visualizations, social media analytics dashboards, glowing purple and pink neon accents on dark background, futuristic digital marketing concept art, ultra-modern', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'Vibrant Colors' },
        { key: 'campaign_1', prompt: 'Modern laptop showing a vibrant social media marketing dashboard with engagement metrics and colorful graphs, creative workspace with plants and design tools, purple ambient lighting, productive creative atmosphere', aspectRatio: '4:3', style: 'Photorealistic', lighting: 'Natural Lighting', colorGrading: 'Vibrant Colors' },
        { key: 'campaign_2', prompt: 'Creative team brainstorming in a modern agency office, mood boards and post-it notes on glass wall, diverse young professionals collaborating, neon accent lighting, modern loft space, high energy', aspectRatio: '4:3', style: 'Photorealistic', lighting: 'Natural Lighting', colorGrading: 'Vibrant Colors' },
        { key: 'campaign_3', prompt: 'Stunning product photography setup in a studio, camera on tripod, colored gels creating purple and pink lighting, lifestyle products arranged artfully, behind-the-scenes of a professional photoshoot', aspectRatio: '4:3', style: 'Photorealistic', lighting: 'Dramatic Lighting', colorGrading: 'Vibrant Colors' },
        { key: 'portfolio_1', prompt: 'Mockup of a beautiful modern website design displayed on a large iMac monitor, gradient purple to blue color scheme, sleek UI elements, creative agency workspace, clean desk setup', aspectRatio: '16:9', style: 'Photorealistic', lighting: 'Natural Lighting', colorGrading: 'Vibrant Colors' },
        { key: 'portfolio_2', prompt: 'Collection of branded marketing materials — business cards, letterhead, social media posts, and packaging design — arranged flat lay style on a dark surface, purple and fuchsia color palette, premium brand identity design', aspectRatio: '16:9', style: 'Photorealistic', lighting: 'Natural Lighting', colorGrading: 'Vibrant Colors' },
        { key: 'team_creative', prompt: 'Professional portrait of a creative director in their 30s, modern casual attire with designer glasses, confident half-smile, colorful abstract art blurred in background, editorial creative portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'team_growth', prompt: 'Professional portrait of an Indian woman in her early 30s, smart casual blazer, warm confident smile, modern office with plants blurred in background, editorial tech/marketing portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'team_seo', prompt: 'Professional portrait of a Black male in his late 20s, trendy casual tech attire, friendly confident expression, monitor with analytics dashboard blurred in background, editorial creative tech portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'team_brand', prompt: 'Professional portrait of an East Asian woman in her late 20s, minimalist fashion, subtle confident smile, creative agency whiteboard with brand sketches blurred in background, editorial creative portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'office', prompt: 'Trendy digital marketing agency open office, standing desks, large monitors showing analytics, exposed brick walls, neon signs, plants everywhere, collaborative open space with lounge area, modern and vibrant', aspectRatio: '16:9', style: 'Photorealistic', lighting: 'Natural Lighting', colorGrading: 'Vibrant Colors' },
    ],
    buildTemplate: (images) => ({
        name: 'VORTEX Digital Agency',
        category: 'agency',
        industries: ['marketing', 'digital-agency', 'creative'],
        tags: ['marketing', 'agency', 'digital', 'creative', 'SEO', 'social-media', 'branding'],
        theme: {
            cardBorderRadius: 'xl', buttonBorderRadius: 'full',
            fontFamilyHeader: 'outfit', fontFamilyBody: 'inter', fontFamilyButton: 'outfit',
            fontWeightHeader: 700, headingsAllCaps: false, buttonsAllCaps: false, navLinksAllCaps: false,
            pageBackground: '#0c0a1a',
            globalColors: {
                primary: '#8b5cf6', secondary: '#d946ef', accent: '#a855f7',
                background: '#0c0a1a', surface: '#1a1630', text: '#a78bfa',
                textMuted: '#7c6bbd', heading: '#f5f3ff', border: '#2d2550',
                success: '#34d399', error: '#f87171',
            },
        },
        componentOrder: [
            'colors', 'typography', 'header', 'topBar', 'heroWave', 'logoBanner',
            'features', 'services', 'howItWorks', 'portfolio', 'slideshow', 'team',
            'pricing', 'testimonials', 'faq', 'leads', 'newsletter', 'cta', 'signupFloat', 'footer',
        ],
        sectionVisibility: buildVisibility([
            'topBar', 'heroWave', 'logoBanner', 'features', 'services', 'howItWorks',
            'portfolio', 'slideshow', 'team', 'pricing', 'testimonials', 'faq', 'leads', 'newsletter', 'cta', 'signupFloat',
        ]),
        data: {
            topBar: {
                messages: [
                    { text: '🚀 Free Brand Audit — Limited Spots', icon: 'sparkles', link: '#leads', linkText: 'Apply Now' },
                    { text: '📈 Average Client ROI: +500%', icon: 'trending-up', link: '#portfolio', linkText: 'See Results' },
                ],
                scrollEnabled: true, scrollSpeed: 28, pauseOnHover: true, dismissible: true,
                useGradient: true, gradientFrom: '#8b5cf6', gradientTo: '#d946ef', gradientAngle: 90,
                backgroundColor: '#8b5cf6', textColor: '#ffffff', linkColor: '#ffffff',
                iconColor: '#ffffff', fontSize: 'sm', separator: 'dot',
                showRotatingArrows: true, rotateSpeed: 4000, aboveHeader: true,
            },
            header: {
                style: 'floating-shadow', layout: 'minimal', isSticky: true, glassEffect: false, height: 70,
                logoType: 'text', logoText: 'VORTEX', logoWidth: 130,
                links: [
                    { text: 'Services', href: '#services' }, { text: 'Work', href: '#portfolio' },
                    { text: 'Team', href: '#team' }, { text: 'Pricing', href: '#pricing' },
                ],
                hoverStyle: 'glow', ctaText: 'Get Started', showCta: true, showLogin: false,
                colors: { background: '#1a1630', text: '#e0d4ff', accent: '#a855f7', buttonBackground: '#8b5cf6', buttonText: '#ffffff' },
                buttonBorderRadius: 'full', linkFontSize: 14,
            },
            heroWave: {
                slides: [
                    { headline: 'We Make Brands Unforgettable', subheadline: 'Strategy. Design. Growth. Results.', primaryCta: 'FREE BRAND AUDIT', primaryCtaLink: '#leads', secondaryCta: 'OUR WORK', secondaryCtaLink: '#portfolio', backgroundImage: images.hero || '', backgroundColor: '#8b5cf6' },
                ],
                autoPlaySpeed: 6000, transitionDuration: 800, showArrows: false, showDots: false, dotStyle: 'circle',
                heroHeight: 85, headlineFontSize: 'xl', subheadlineFontSize: 'md', showGrain: false, overlayOpacity: 0.2,
                gradientAngle: 135, waveShape: 'bubbly', waveColor: '#0c0a1a', textAlign: 'center',
                gradientColors: ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'],
                showTextStroke: false,
                colors: { background: '#8b5cf6', text: '#ffffff', heading: '#ffffff', ctaText: '#ffffff', dotActive: '#ffffff', dotInactive: 'rgba(255,255,255,0.5)', arrowColor: '#ffffff' },
                buttonBorderRadius: 'full',
            },
            logoBanner: {
                title: 'Trusted by 100+ brands worldwide', subtitle: '',
                logos: [
                    { imageUrl: '', alt: 'Startup Co', link: '', linkText: '' },
                    { imageUrl: '', alt: 'TechVenture', link: '', linkText: '' },
                    { imageUrl: '', alt: 'HealthPlus', link: '', linkText: '' },
                    { imageUrl: '', alt: 'EcoStore', link: '', linkText: '' },
                    { imageUrl: '', alt: 'FinanceHub', link: '', linkText: '' },
                ],
                scrollEnabled: true, scrollSpeed: 30, pauseOnHover: true, logoHeight: 35, logoGap: 50,
                grayscale: true, useGradient: false, backgroundColor: '#0c0a1a', titleColor: '#7c6bbd',
                subtitleColor: '#7c6bbd', titleFontSize: 'sm', paddingY: 'sm', showDivider: false,
            },
            features: {
                featuresVariant: 'bento-premium', paddingY: 'lg', paddingX: 'md',
                title: 'What We Do Best', description: 'Full-stack digital marketing that actually delivers results.',
                items: [
                    { title: 'SEO & Content', description: 'Dominate search rankings with data-driven SEO strategies and compelling content that converts.', imageUrl: images.campaign_1 || '' },
                    { title: 'Social Media', description: 'Build engaged communities across Instagram, TikTok, LinkedIn, and emerging platforms.', imageUrl: images.campaign_2 || '' },
                    { title: 'Paid Advertising', description: 'Google Ads, Meta Ads, and programmatic campaigns optimized for maximum ROAS.', imageUrl: images.campaign_3 || '' },
                ],
                gridColumns: 3, imageHeight: 220, imageObjectFit: 'cover',
                animationType: 'fade-in-up', enableCardAnimation: true, borderRadius: 'xl',
                colors: { background: '#1a1630', accent: '#8b5cf6', borderColor: '#2d2550', text: '#a78bfa', heading: '#f5f3ff', description: '#a78bfa', cardBackground: '#0c0a1a' },
            },
            services: {
                servicesVariant: 'grid', paddingY: 'lg', paddingX: 'md',
                title: 'Our Services', description: 'Everything you need to dominate your market.',
                items: [
                    { icon: 'search', title: 'SEO Optimization', description: 'Technical audits, keyword research, link building, and on-page optimization.' },
                    { icon: 'palette', title: 'Brand Identity', description: 'Logo design, visual systems, brand guidelines, and positioning strategy.' },
                    { icon: 'globe', title: 'Web Development', description: 'Fast, responsive, conversion-optimized websites built for growth.' },
                    { icon: 'volume', title: 'Social Media', description: 'Content creation, community management, and influencer partnerships.' },
                    { icon: 'mail', title: 'Email Marketing', description: 'Automated sequences, newsletters, and segmentation strategies.' },
                    { icon: 'video', title: 'Video Production', description: 'Brand films, product videos, social reels, and YouTube content.' },
                ],
                animationType: 'fade-in-up', enableCardAnimation: true,
                colors: { background: '#0c0a1a', accent: '#8b5cf6', borderColor: '#2d2550', text: '#a78bfa', heading: '#f5f3ff' },
            },
            howItWorks: {
                paddingY: 'lg', paddingX: 'md',
                title: 'Our Process', description: 'From discovery to domination.',
                steps: 4,
                items: [
                    { icon: 'search', title: 'Discover', description: 'We dive deep into your brand, market, audience, and competitors to find opportunities.' },
                    { icon: 'lightbulb', title: 'Strategize', description: 'Custom growth roadmap with clear KPIs, timelines, and channel strategy.' },
                    { icon: 'rocket', title: 'Launch', description: 'Execute with precision. Content, campaigns, and creative that move the needle.' },
                    { icon: 'bar-chart', title: 'Scale', description: 'Optimize, iterate, and scale what works. Monthly reporting with full transparency.' },
                ],
                colors: { background: '#1a1630', accent: '#8b5cf6', text: '#a78bfa', heading: '#f5f3ff' },
            },
            portfolio: {
                paddingY: 'lg', paddingX: 'md',
                title: 'Our Work', description: 'Selected case studies and campaign results.',
                items: [
                    { title: 'TechVenture — Series B Launch', description: 'Full digital campaign for Series B announcement. 10M impressions, 500K website visits in 30 days.', imageUrl: images.portfolio_1 || '' },
                    { title: 'EcoStore — Brand Rebrand', description: 'Complete brand identity overhaul. 300% increase in organic social engagement.', imageUrl: images.portfolio_2 || '' },
                    { title: 'HealthPlus — Patient Acquisition', description: 'SEO + Google Ads strategy that reduced cost per acquisition by 65%.', imageUrl: images.campaign_1 || '' },
                ],
                animationType: 'fade-in-up', enableCardAnimation: true,
                colors: { background: '#0c0a1a', accent: '#8b5cf6', borderColor: '#2d2550', text: '#a78bfa', heading: '#f5f3ff' },
            },
            slideshow: {
                slideshowVariant: 'classic', title: 'Behind the Scenes', showTitle: true, fullWidth: false,
                paddingY: 'lg', paddingX: 'md', titleFontSize: 'lg', borderRadius: 'xl',
                autoPlaySpeed: 4500, transitionEffect: 'slide', transitionDuration: 500,
                showArrows: true, showDots: true, arrowStyle: 'rounded', dotStyle: 'circle',
                showCaptions: true, slideHeight: 500,
                items: [
                    { imageUrl: images.office || '', altText: 'Our studio', caption: 'VORTEX Headquarters' },
                    { imageUrl: images.campaign_2 || '', altText: 'Team brainstorm', caption: 'Strategy Session' },
                    { imageUrl: images.campaign_3 || '', altText: 'Photoshoot', caption: 'Content Production' },
                    { imageUrl: images.portfolio_2 || '', altText: 'Brand work', caption: 'Brand Identity Work' },
                ],
                colors: { background: '#1a1630', heading: '#f5f3ff', arrowBackground: 'rgba(0,0,0,0.5)', arrowText: '#ffffff', dotActive: '#8b5cf6', dotInactive: 'rgba(139,92,246,0.3)', captionBackground: 'rgba(0,0,0,0.7)', captionText: '#ffffff' },
            },
            team: {
                paddingY: 'lg', paddingX: 'md',
                title: 'Meet the Minds', description: 'Creative strategists, growth hackers, and storytellers.',
                items: [
                    { name: 'Alex Rivera', role: 'Creative Director & Co-Founder', imageUrl: images.team_creative || '' },
                    { name: 'Priya Sharma', role: 'Head of Growth Marketing', imageUrl: images.team_growth || '' },
                    { name: 'Marcus Johnson', role: 'SEO & Analytics Lead', imageUrl: images.team_seo || '' },
                    { name: 'Sophie Chen', role: 'Brand Strategist', imageUrl: images.team_brand || '' },
                ],
                animationType: 'fade-in-up', enableCardAnimation: true,
                colors: { background: '#0c0a1a', text: '#a78bfa', heading: '#f5f3ff' },
            },
            pricing: {
                pricingVariant: 'gradient', title: 'Growth Plans', description: 'Transparent pricing. No long-term contracts. Results guaranteed.',
                paddingY: 'lg', paddingX: 'md', titleFontSize: 'lg', descriptionFontSize: 'md', cardBorderRadius: 'xl',
                tiers: [
                    { name: 'Starter', price: '$2,500', frequency: '/month', description: 'For startups ready to launch.', features: ['Social Media (2 platforms)', 'Basic SEO Audit', 'Monthly Content Calendar', 'Bi-weekly Reporting'], buttonText: 'Get Started', buttonLink: '#leads', featured: false },
                    { name: 'Growth', price: '$5,000', frequency: '/month', description: 'For businesses ready to scale.', features: ['Social Media (4 platforms)', 'Full SEO Strategy', 'Paid Ads Management', 'Content Production', 'Weekly Reporting', 'Dedicated Account Manager'], buttonText: 'Most Popular', buttonLink: '#leads', featured: true },
                    { name: 'Enterprise', price: 'Custom', frequency: '', description: 'For brands that demand the best.', features: ['Everything in Growth', 'Brand Strategy', 'Video Production', 'Influencer Marketing', 'PR & Communications', '24/7 Support', 'Quarterly Strategy Reviews'], buttonText: 'Contact Us', buttonLink: '#leads', featured: false },
                ],
                colors: {
                    background: '#1a1630', accent: '#8b5cf6', borderColor: '#2d2550', text: '#a78bfa', heading: '#f5f3ff',
                    buttonBackground: '#8b5cf6', buttonText: '#ffffff', checkmarkColor: '#34d399',
                    cardBackground: '#0c0a1a', gradientStart: '#8b5cf6', gradientEnd: '#d946ef',
                },
                animationType: 'fade-in-up', enableCardAnimation: true,
            },
            testimonials: {
                testimonialsVariant: 'glassmorphism', paddingY: 'lg', paddingX: 'md',
                title: 'Client Love', description: '',
                titleFontSize: 'lg', descriptionFontSize: 'md', borderRadius: 'xl',
                cardShadow: 'lg', borderStyle: 'solid', cardPadding: 28,
                animationType: 'fade-in-up', enableCardAnimation: true,
                items: [
                    { quote: 'VORTEX took our brand from invisible to unmissable. Our organic traffic grew 800% in 6 months. The ROI is insane.', name: 'Sarah K.', title: 'CEO, TechVenture' },
                    { quote: 'Their creative team is on another level. The brand identity they created for us gets compliments every single day.', name: 'Tom R.', title: 'Founder, EcoStore' },
                    { quote: 'We\'ve worked with 3 agencies before VORTEX. The difference is night and day. They actually care about results.', name: 'Maria L.', title: 'CMO, HealthPlus' },
                ],
                colors: { background: 'rgba(26,22,48,0.5)', accent: '#8b5cf6', borderColor: '#2d2550', text: '#c4b5fd', heading: '#f5f3ff', cardBackground: '#1a1630' },
            },
            faq: {
                title: 'Questions? We\'ve Got Answers.', description: '',
                paddingY: 'lg', paddingX: 'md',
                items: [
                    { question: 'How quickly will I see results?', answer: 'Most clients see initial traction within 30 days and significant growth within 90 days. SEO results typically take 3-6 months for major impact.' },
                    { question: 'Do you require long-term contracts?', answer: 'No. We work month-to-month because we believe results should earn your trust, not contracts. Most clients stay 2+ years because of results.' },
                    { question: 'What industries do you work with?', answer: 'We specialize in tech, healthcare, e-commerce, SaaS, and professional services — but our strategies adapt to any industry.' },
                    { question: 'How do you measure success?', answer: 'We track real business metrics: revenue, leads, conversion rates, and ROI — not vanity metrics. Monthly reports with full transparency.' },
                ],
                colors: { background: '#0c0a1a', accent: '#8b5cf6', borderColor: '#2d2550', text: '#a78bfa', heading: '#f5f3ff' },
            },
            leads: {
                leadsVariant: 'split-gradient',
                title: 'Let\'s Build Something Great', description: 'Tell us about your brand. We\'ll respond within 24 hours.',
                namePlaceholder: 'Full Name', emailPlaceholder: 'email@example.com',
                companyPlaceholder: 'Company', messagePlaceholder: 'Tell us about your goals and challenges...',
                buttonText: 'Get Your Free Audit',
                paddingY: 'lg', paddingX: 'md', cardBorderRadius: 'xl', buttonBorderRadius: 'full',
                titleFontSize: 'lg', descriptionFontSize: 'md',
                colors: {
                    background: '#1a1630', accent: '#8b5cf6', borderColor: '#2d2550', text: '#a78bfa', heading: '#f5f3ff',
                    buttonBackground: '#8b5cf6', buttonText: '#ffffff', cardBackground: '#0c0a1a',
                    inputBackground: '#1a1630', inputText: '#f5f3ff', inputBorder: '#2d2550',
                    gradientStart: '#8b5cf6', gradientEnd: '#d946ef',
                },
            },
            newsletter: {
                title: 'Marketing Insider', description: 'Weekly growth tactics and industry insights from our team.',
                placeholderText: 'Your email', buttonText: 'Join Newsletter', paddingY: 'md', paddingX: 'md',
                colors: {
                    background: '#0c0a1a', accent: '#8b5cf6', borderColor: '#2d2550', text: '#a78bfa', heading: '#f5f3ff',
                    buttonBackground: '#8b5cf6', buttonText: '#ffffff', cardBackground: 'rgba(139,92,246,0.08)',
                    inputBackground: '#1a1630', inputText: '#f5f3ff', inputBorder: '#2d2550',
                },
            },
            cta: {
                paddingY: 'lg', paddingX: 'md',
                title: 'Ready to Grow?', description: 'Schedule a free strategy call. No hard sell — just honest advice.',
                buttonText: 'Book Strategy Call', titleFontSize: 'xl', descriptionFontSize: 'md',
                colors: {
                    background: '#0c0a1a', gradientStart: '#8b5cf6', gradientEnd: '#d946ef',
                    text: 'rgba(255,255,255,0.8)', heading: '#ffffff',
                    buttonBackground: '#ffffff', buttonText: '#8b5cf6',
                },
            },
            signupFloat: {
                headerText: '🚀 Free Brand Audit',
                descriptionText: 'Get actionable insights in 48 hours. No strings attached.',
                imageUrl: images.campaign_1 || '', imagePlacement: 'top',
                showNameField: true, showEmailField: true, showPhoneField: false, showMessageField: false,
                namePlaceholder: 'Your Name', emailPlaceholder: 'email@example.com',
                buttonText: 'Get My Free Audit', socialLinks: [], showSocialLinks: false,
                floatPosition: 'center', showOnLoad: true, showCloseButton: true, triggerDelay: 12,
                minimizeOnClose: true, minimizedLabel: '🚀 Free Audit', width: 360,
                borderRadius: 'xl', buttonBorderRadius: 'full', imageHeight: 160,
                headerFontSize: 'md', descriptionFontSize: 'sm',
                colors: {
                    background: '#1a1630', heading: '#f5f3ff', text: '#a78bfa', accent: '#8b5cf6',
                    buttonBackground: '#8b5cf6', buttonText: '#ffffff',
                    inputBackground: '#0c0a1a', inputText: '#f5f3ff', inputBorder: '#2d2550', inputPlaceholder: '#7c6bbd',
                    socialIconColor: '#a78bfa', overlayBackground: 'rgba(0,0,0,0.4)', cardShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                },
            },
            footer: {
                title: 'VORTEX', description: 'Full-stack digital marketing agency. Strategy, design, and growth that delivers.',
                linkColumns: [
                    { title: 'Services', links: [{ text: 'SEO', href: '#services' }, { text: 'Social Media', href: '#services' }, { text: 'Paid Ads', href: '#services' }] },
                    { title: 'Company', links: [{ text: 'Our Work', href: '#portfolio' }, { text: 'Team', href: '#team' }, { text: 'Pricing', href: '#pricing' }] },
                    { title: 'Resources', links: [{ text: 'Blog', href: '#' }, { text: 'Free Audit', href: '#leads' }, { text: 'Newsletter', href: '#newsletter' }] },
                ],
                socialLinks: [{ platform: 'instagram', href: '#' }, { platform: 'linkedin', href: '#' }, { platform: 'twitter', href: '#' }, { platform: 'tiktok', href: '#' }],
                copyrightText: '© {YEAR} VORTEX Digital Agency. All rights reserved.',
                colors: { background: '#8b5cf6', border: '#7c3aed', text: '#ffffff', linkHover: '#e9d5ff', heading: '#ffffff' },
            },
        },
    }),
};


// ═══════════════════════════════════════════════════════════════════
//  6. NY PIZZERIA — URBAN INDUSTRIAL
// ═══════════════════════════════════════════════════════════════════
export const NY_PIZZERIA_PRESET: TemplatePreset = {
    id: 'ny-pizzeria',
    name: 'Pizzería New York',
    icon: <Pizza size={24} />,
    color: 'from-red-600 to-amber-500',
    description: 'Pizzería estilo NYC: menú con 6 pizzas, galería, equipo, reseñas, delivery y más.',
    category: 'restaurant',
    images: [
        // HeroGallery slides (3)
        { key: 'ny_hero_1', prompt: 'Interior of an authentic New York City pizzeria at night, exposed red brick walls, neon PIZZA sign glowing in red, black and white checkered floor, stainless steel pizza counter with fresh pies on display, industrial pendant lights, urban gritty atmosphere, cinematic wide shot', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'High Contrast' },
        { key: 'ny_hero_2', prompt: 'Pizza chef tossing fresh dough in the air inside a New York pizzeria, flour dust catching dramatic light, wood-fired brick oven glowing orange in background, red neon glow, action shot frozen motion, urban restaurant energy', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'High Contrast' },
        { key: 'ny_hero_3', prompt: 'Bustling New York City street corner at dusk with a classic corner pizzeria storefront, warm yellow light spilling onto sidewalk, neon open sign, people walking past, taxicab blur in street, autumn evening urban atmosphere', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Golden Hour', colorGrading: 'Warm Tones' },
        // Menu items (6 pizzas)
        { key: 'ny_pizza_1', prompt: 'Classic New York style cheese pizza slice being lifted with stretchy melted mozzarella, thin crispy crust folded, dark rustic background, dramatic overhead shot, wisps of steam rising, high-end food photography', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Dramatic Lighting', cameraAngle: 'High Angle', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'ny_pizza_2', prompt: 'Gourmet pepperoni pizza fresh from brick oven, crispy cup pepperoni with grease pools, bubbling cheese, charred leopard-spotted crust, rustic black iron pan, dark moody food photography, close-up overhead', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Dramatic Lighting', cameraAngle: 'High Angle', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'ny_pizza_3', prompt: 'White pizza with fresh ricotta, roasted garlic, arugula, lemon zest, and truffle oil on thin New York crust, elegant dark slate plate, rustic wood table, artisan food photography', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', cameraAngle: 'High Angle', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'ny_pizza_4', prompt: 'Meat lovers deep dish pizza cut open showing thick layer of Italian sausage, ground beef, bacon, prosciutto, melted provolone, chunky tomato sauce, steam rising, dark background, food photography', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Dramatic Lighting', cameraAngle: 'High Angle', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'ny_pizza_5', prompt: 'Margherita pizza Napoletana style with San Marzano tomatoes, fresh buffalo mozzarella, basil leaves, drizzle of olive oil, perfectly charred wood-fired crust, dark marble table, overhead food photography', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', cameraAngle: 'High Angle', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'ny_pizza_6', prompt: 'Gourmet BBQ chicken pizza with caramelized onions, smoked gouda, jalapeño, cilantro, tangy BBQ drizzle on crispy thin crust, dark wooden cutting board, rustic food photography', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Dramatic Lighting', cameraAngle: 'High Angle', depthOfField: 'Shallow (Bokeh Background)' },
        // Feature — Craft beer
        { key: 'ny_beer', prompt: 'Close-up of a frosted glass of craft IPA beer with golden amber color and foam head, next to a fresh pizza slice, neon bar sign blurred in background, dark moody bar atmosphere, warm glow', aspectRatio: '4:3', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'Warm Tones', depthOfField: 'Shallow (Bokeh Background)' },
        // Interior
        { key: 'ny_interior_1', prompt: 'New York pizzeria dining area with long communal wooden tables, exposed brick walls covered in framed black and white NYC photos, industrial pipe lighting, hanging chalkboard menu, vintage subway tile details', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'Warm Tones' },
        { key: 'ny_interior_2', prompt: 'The pizza counter of a NYC pizzeria, rows of whole pies behind glass, stainless steel counter, pizza boxes stacked, vintage cash register, neon signs, New York memorabilia on walls, late-night energy', aspectRatio: '16:9', style: 'Cinematic', lighting: 'Dramatic Lighting', colorGrading: 'High Contrast' },
        // Team (4 members)
        { key: 'ny_pizzaiolo', prompt: 'Professional portrait of a confident Italian-American male pizzaiolo in his 40s, white apron with flour stains, bandana on head, muscular forearms, proud smile, blurred brick oven in background, editorial portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Dramatic Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'ny_manager', prompt: 'Professional portrait of a tough but friendly Italian-American woman in her 50s, black polo shirt with shop logo, reading glasses on head, warm laugh, blurred pizzeria counter in background, editorial portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'ny_cook_2', prompt: 'Professional portrait of a young Dominican male line cook in his mid-20s, black chef coat, confident smile, tattoo on forearm, blurred commercial kitchen with pizza oven in background, editorial portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Dramatic Lighting', depthOfField: 'Shallow (Bokeh Background)' },
        { key: 'ny_delivery', prompt: 'Professional portrait of an energetic young woman in her early 20s, branded red delivery cap and jacket, helmet in hand, bright smile, blurred NYC street with pizza shop in background, editorial portrait', aspectRatio: '1:1', style: 'Photorealistic', lighting: 'Natural Lighting', depthOfField: 'Shallow (Bokeh Background)' },
    ],
    buildTemplate: (images) => ({
        name: 'Sal\'s Famous Pizzeria',
        category: 'restaurant',
        industries: ['restaurant', 'food-beverage', 'pizza'],
        tags: ['pizza', 'new-york', 'pizzeria', 'delivery', 'NYC', 'takeout', 'casual-dining'],
        theme: {
            cardBorderRadius: 'md',
            buttonBorderRadius: 'md',
            fontFamilyHeader: 'outfit',
            fontFamilyBody: 'inter',
            fontFamilyButton: 'outfit',
            fontWeightHeader: 800,
            headingsAllCaps: true,
            buttonsAllCaps: true,
            navLinksAllCaps: true,
            pageBackground: '#0f0f0f',
            globalColors: {
                primary: '#e63946', secondary: '#f4a261', accent: '#ff6b6b',
                background: '#0f0f0f', surface: '#1a1a1a', text: '#c4c4c4',
                textMuted: '#808080', heading: '#ffffff', border: '#2a2a2a',
                success: '#4caf50', error: '#f44336',
            },
        },
        componentOrder: [
            'colors', 'typography', 'header', 'topBar', 'heroGallery', 'logoBanner',
            'menu', 'features', 'slideshow', 'testimonials', 'team', 'howItWorks',
            'faq', 'leads', 'newsletter', 'cta', 'map', 'signupFloat', 'footer',
        ],
        sectionVisibility: buildVisibility([
            'topBar', 'heroGallery', 'logoBanner', 'menu', 'features', 'slideshow',
            'testimonials', 'team', 'howItWorks', 'faq', 'leads', 'newsletter', 'cta', 'map', 'signupFloat',
        ]),
        data: {
            topBar: {
                messages: [
                    { text: '🍕 FREE DELIVERY on orders over $25', icon: 'truck', link: '#menu', linkText: 'Order Now' },
                    { text: '⏰ Open till 2AM Fri & Sat', icon: 'clock', link: '#map', linkText: 'Directions' },
                    { text: '🔥 NEW: BBQ Chicken Pizza', icon: 'flame', link: '#menu', linkText: 'Try It' },
                ],
                scrollEnabled: true, scrollSpeed: 28, pauseOnHover: true, dismissible: true,
                useGradient: true, gradientFrom: '#e63946', gradientTo: '#c62828', gradientAngle: 90,
                backgroundColor: '#e63946', textColor: '#ffffff',
                linkColor: '#ffd54f', iconColor: '#ffd54f', fontSize: 'sm',
                separator: 'pipe', showRotatingArrows: true, rotateSpeed: 3500, aboveHeader: true,
            },
            header: {
                style: 'edge-solid', layout: 'classic', isSticky: true, glassEffect: false, height: 72,
                logoType: 'text', logoText: 'SAL\'S PIZZA', logoWidth: 180,
                links: [
                    { text: 'MENU', href: '#menu' },
                    { text: 'GALLERY', href: '#slideshow' },
                    { text: 'ABOUT', href: '#team' },
                    { text: 'CATERING', href: '#leads' },
                ],
                hoverStyle: 'highlight', ctaText: 'ORDER NOW', showCta: true, showLogin: false,
                colors: { background: '#0f0f0f', text: '#ffffff', accent: '#e63946', buttonBackground: '#e63946', buttonText: '#ffffff' },
                buttonBorderRadius: 'md', linkFontSize: 14,
            },
            heroGallery: {
                slides: [
                    { headline: 'REAL NEW YORK PIZZA', subheadline: 'Hand-tossed. Brick-oven fired. Since 1987.', primaryCta: 'SEE THE MENU', primaryCtaLink: '#menu', secondaryCta: 'ORDER NOW', secondaryCtaLink: '#leads', backgroundImage: images.ny_hero_1 || '', backgroundColor: '#1a1a1a' },
                    { headline: 'MADE FRESH DAILY', subheadline: 'Watch our pizzaiolos craft every pie by hand', primaryCta: 'OUR STORY', primaryCtaLink: '#team', secondaryCta: 'VIEW GALLERY', secondaryCtaLink: '#slideshow', backgroundImage: images.ny_hero_2 || '', backgroundColor: '#1a1a1a' },
                    { headline: 'A BROOKLYN LEGEND', subheadline: 'Three generations. One obsession. Perfect pizza.', primaryCta: 'FIND US', primaryCtaLink: '#map', secondaryCta: 'CALL NOW', secondaryCtaLink: 'tel:5551234567', backgroundImage: images.ny_hero_3 || '', backgroundColor: '#1a1a1a' },
                ],
                autoPlaySpeed: 5500, transitionDuration: 700, showArrows: true, showDots: true, dotStyle: 'line',
                heroHeight: 90, headlineFontSize: 'xl', subheadlineFontSize: 'md', showGrain: true, overlayOpacity: 0.45,
                colors: { background: '#1a1a1a', text: '#c4c4c4', heading: '#ffffff', ctaText: '#ffffff', dotActive: '#e63946', dotInactive: 'rgba(230,57,70,0.3)', arrowColor: '#ffffff' },
                buttonBorderRadius: 'md',
            },
            logoBanner: {
                title: 'As Seen On', subtitle: '',
                logos: [
                    { imageUrl: '', alt: 'Barstool Pizza', link: '', linkText: '' },
                    { imageUrl: '', alt: 'NY Post', link: '', linkText: '' },
                    { imageUrl: '', alt: 'Eater NY', link: '', linkText: '' },
                    { imageUrl: '', alt: 'Yelp Top 10', link: '', linkText: '' },
                    { imageUrl: '', alt: 'DoorDash', link: '', linkText: '' },
                ],
                scrollEnabled: true, scrollSpeed: 30, pauseOnHover: true, logoHeight: 30, logoGap: 50,
                grayscale: true, useGradient: false, backgroundColor: '#0f0f0f', titleColor: '#808080',
                subtitleColor: '#808080', titleFontSize: 'sm', paddingY: 'sm',
                showDivider: false,
            },
            menu: {
                menuVariant: 'modern-grid',
                title: 'THE MENU', description: 'Hand-tossed, brick-oven fired. The way pizza was meant to be.',
                paddingY: 'lg', paddingX: 'md',
                items: [
                    { name: 'The Classic NY Cheese', description: 'Hand-stretched thin crust, whole milk mozzarella, house-made tomato sauce. 18-inch pie.', price: '$22', imageUrl: images.ny_pizza_1 || '', category: 'Classic Pies', isSpecial: true },
                    { name: 'Pepperoni Supreme', description: 'Cup & char pepperoni, whole milk mozz, crushed San Marzano, garlic oil drizzle. Our #1 seller.', price: '$26', imageUrl: images.ny_pizza_2 || '', category: 'Classic Pies', isSpecial: true },
                    { name: 'White Truffle Ricotta', description: 'Fresh ricotta, roasted garlic, wild arugula, lemon zest, black truffle oil. No red sauce.', price: '$28', imageUrl: images.ny_pizza_3 || '', category: 'Specialty Pies', isSpecial: false },
                    { name: 'The Meat Monster', description: 'Italian sausage, ground beef, crispy bacon, prosciutto, smoked provolone, chunky red sauce.', price: '$30', imageUrl: images.ny_pizza_4 || '', category: 'Specialty Pies', isSpecial: true },
                    { name: 'Margherita DOC', description: 'San Marzano DOP, fresh buffalo mozzarella, basil, EVOO. Neapolitan-style in our brick oven.', price: '$24', imageUrl: images.ny_pizza_5 || '', category: 'Classic Pies', isSpecial: false },
                    { name: 'BBQ Chicken', description: 'Pulled chicken, caramelized onion, smoked gouda, jalapeño, cilantro, tangy BBQ drizzle.', price: '$27', imageUrl: images.ny_pizza_6 || '', category: 'Specialty Pies', isSpecial: false },
                ],
                colors: { background: '#0f0f0f', accent: '#e63946', borderColor: '#2a2a2a', text: '#808080', heading: '#ffffff', cardBackground: '#1a1a1a', priceColor: '#e63946' },
                titleFontSize: 'lg', descriptionFontSize: 'md', borderRadius: 'md', showCategories: true,
                animationType: 'fade-in-up', enableCardAnimation: true,
            },
            features: {
                featuresVariant: 'image-overlay',
                paddingY: 'lg', paddingX: 'md',
                title: 'WHY SAL\'S?', description: 'Three things that set us apart from every other slice shop.',
                items: [
                    { title: 'Brick Oven Since \'87', description: 'Our original coal-fired brick oven has been running nonstop for 37 years. It\'s seasoned with decades of flavor. There\'s no shortcut to that taste.', imageUrl: images.ny_hero_2 || '' },
                    { title: 'Fresh Dough Daily', description: 'We make our dough fresh every morning at 6AM. 72-hour cold fermentation. No frozen dough, no shortcuts, no exceptions.', imageUrl: images.ny_pizza_1 || '' },
                    { title: 'Craft Beer & Cocktails', description: 'Pair your pie with one of 16 craft beers on tap or a house cocktail. Happy hour Mon-Thu 4-7pm. Half-price apps.', imageUrl: images.ny_beer || '' },
                ],
                gridColumns: 3, imageHeight: 250, imageObjectFit: 'cover',
                animationType: 'fade-in-up', enableCardAnimation: true, borderRadius: 'md',
                colors: { background: '#1a1a1a', accent: '#e63946', borderColor: '#2a2a2a', text: '#808080', heading: '#ffffff', description: '#c4c4c4', cardBackground: '#0f0f0f' },
            },
            slideshow: {
                slideshowVariant: 'modern', title: 'THE SHOP', showTitle: true, fullWidth: false,
                paddingY: 'lg', paddingX: 'md', titleFontSize: 'lg', borderRadius: 'md',
                autoPlaySpeed: 4500, transitionEffect: 'fade', transitionDuration: 600,
                showArrows: true, showDots: true, arrowStyle: 'square', dotStyle: 'line',
                showCaptions: true, slideHeight: 480,
                items: [
                    { imageUrl: images.ny_hero_1 || '', altText: 'The pizzeria', caption: 'The Original Shop' },
                    { imageUrl: images.ny_interior_1 || '', altText: 'Dining area', caption: 'Our Dining Room' },
                    { imageUrl: images.ny_interior_2 || '', altText: 'Pizza counter', caption: 'The Counter' },
                    { imageUrl: images.ny_hero_3 || '', altText: 'Street view', caption: 'Corner of 5th & Atlantic' },
                ],
                colors: { background: '#0f0f0f', heading: '#ffffff', arrowBackground: 'rgba(230,57,70,0.8)', arrowText: '#ffffff', dotActive: '#e63946', dotInactive: 'rgba(230,57,70,0.25)', captionBackground: 'rgba(0,0,0,0.75)', captionText: '#ffffff' },
            },
            testimonials: {
                testimonialsVariant: 'cards',
                paddingY: 'lg', paddingX: 'md',
                title: 'WHAT THEY SAY', description: 'Don\'t take our word for it.',
                titleFontSize: 'lg', descriptionFontSize: 'md', borderRadius: 'md',
                cardShadow: 'md', borderStyle: 'solid', cardPadding: 28,
                animationType: 'fade-in-up', enableCardAnimation: true,
                items: [
                    { quote: 'Best slice in Brooklyn, period. The pepperoni has that perfect cup and char. I\'ve been coming here every week since 2003.', name: 'Tony M.', title: 'Brooklyn Local' },
                    { quote: 'Barstool gave it a 9.2 and honestly it deserves a 10. That crust is unbeatable. Sal\'s is the real deal.', name: 'Dave P.', title: 'Barstool Sports' },
                    { quote: 'We ordered 30 pies for our company party. Every single one was perfect. The catering team was phenomenal.', name: 'Jessica R.', title: 'Corporate Event' },
                ],
                colors: { background: '#1a1a1a', accent: '#e63946', borderColor: '#2a2a2a', text: '#c4c4c4', heading: '#ffffff', cardBackground: '#0f0f0f' },
            },
            team: {
                paddingY: 'lg', paddingX: 'md',
                title: 'THE CREW', description: 'The people who make the magic happen.',
                items: [
                    { name: 'Sal Moretti', role: 'Founder & Head Pizzaiolo', imageUrl: images.ny_pizzaiolo || '' },
                    { name: 'Maria Moretti', role: 'General Manager & Co-Owner', imageUrl: images.ny_manager || '' },
                    { name: 'Junior Reyes', role: 'Lead Line Cook', imageUrl: images.ny_cook_2 || '' },
                    { name: 'Alyssa Chen', role: 'Delivery & Catering Lead', imageUrl: images.ny_delivery || '' },
                ],
                animationType: 'fade-in-up', enableCardAnimation: true,
                colors: { background: '#0f0f0f', text: '#808080', heading: '#ffffff' },
            },
            howItWorks: {
                paddingY: 'lg', paddingX: 'md',
                title: 'HOW TO ORDER', description: 'Pizza to your door in 3 easy steps.',
                steps: 3,
                items: [
                    { icon: 'smartphone', title: 'Pick Your Pie', description: 'Browse our full menu online. Customize toppings, choose your size, add sides and drinks.' },
                    { icon: 'flame', title: 'We Fire It Up', description: 'Your order hits our brick oven within minutes. Every pie made fresh, never pre-made.' },
                    { icon: 'truck', title: 'Fast Delivery', description: 'Average delivery time: 28 minutes. Track your order live. Still hot when it arrives.' },
                ],
                colors: { background: '#1a1a1a', accent: '#e63946', text: '#c4c4c4', heading: '#ffffff' },
            },
            faq: {
                title: 'GOT QUESTIONS?', description: 'Here are the ones we hear most.',
                paddingY: 'lg', paddingX: 'md',
                items: [
                    { question: 'Do you deliver?', answer: 'Yes! Free delivery within a 3-mile radius on orders over $25. We also partner with DoorDash, UberEats, and Grubhub for extended delivery zones.' },
                    { question: 'Can I order for a large group or event?', answer: 'Absolutely. We do catering for groups of 10 to 500. Full-service catering includes setup, plates, and napkins. Call us at (718) 555-PIES for custom quotes.' },
                    { question: 'Do you have gluten-free options?', answer: 'Yes — we offer a 12-inch gluten-free crust option for any pizza on the menu. Add $3. Made in a shared kitchen, so not recommended for celiac.' },
                    { question: 'What are your hours?', answer: 'Mon-Thu: 11am-11pm, Fri-Sat: 11am-2am, Sunday: 12pm-10pm. We\'re open 365 days a year. Yes, even Christmas.' },
                    { question: 'Can I customize my pizza?', answer: 'Of course. Build your own pie with over 25 premium toppings. Extra cheese is always free — that\'s the Sal\'s promise.' },
                ],
                colors: { background: '#0f0f0f', accent: '#e63946', borderColor: '#2a2a2a', text: '#c4c4c4', heading: '#ffffff' },
            },
            leads: {
                leadsVariant: 'modern',
                title: 'CATERING & LARGE ORDERS', description: 'Need pizza for 10 or 500? We\'ve got you covered.',
                namePlaceholder: 'Your Name', emailPlaceholder: 'email@example.com',
                companyPlaceholder: 'Company / Event', messagePlaceholder: 'Tell us about your event — date, headcount, any special requests...',
                buttonText: 'Get a Quote',
                paddingY: 'lg', paddingX: 'md', cardBorderRadius: 'md', buttonBorderRadius: 'md',
                titleFontSize: 'lg', descriptionFontSize: 'md',
                colors: {
                    background: '#1a1a1a', accent: '#e63946', borderColor: '#2a2a2a', text: '#c4c4c4', heading: '#ffffff',
                    buttonBackground: '#e63946', buttonText: '#ffffff', cardBackground: '#0f0f0f',
                    inputBackground: '#1a1a1a', inputText: '#ffffff', inputBorder: '#2a2a2a',
                    gradientStart: '#e63946', gradientEnd: '#c62828',
                },
            },
            newsletter: {
                title: 'JOIN THE SLICE CLUB', description: 'Get exclusive deals, free slices on your birthday, and early access to new pies.',
                placeholderText: 'Your email address', buttonText: 'Join Free',
                paddingY: 'md', paddingX: 'md',
                colors: {
                    background: '#0f0f0f', accent: '#e63946', borderColor: '#2a2a2a', text: '#808080', heading: '#ffffff',
                    buttonBackground: '#e63946', buttonText: '#ffffff', cardBackground: 'rgba(230,57,70,0.08)',
                    inputBackground: '#1a1a1a', inputText: '#ffffff', inputBorder: '#2a2a2a',
                },
            },
            cta: {
                paddingY: 'lg', paddingX: 'md',
                title: 'HUNGRY? DON\'T WAIT.', description: 'Order now and get your pizza in under 30 minutes.',
                buttonText: 'ORDER NOW', titleFontSize: 'xl', descriptionFontSize: 'md',
                colors: {
                    background: '#1a1a1a', gradientStart: '#e63946', gradientEnd: '#c62828',
                    text: 'rgba(255,255,255,0.8)', heading: '#ffffff',
                    buttonBackground: '#ffffff', buttonText: '#e63946',
                },
            },
            map: {
                title: 'FIND US', description: 'Corner of 5th Ave & Atlantic. You can\'t miss the neon sign.',
                address: '456 5th Avenue, Brooklyn, NY 11215', lat: 40.6782, lng: -73.9442, zoom: 16,
                mapVariant: 'modern', paddingY: 'lg', paddingX: 'md', height: 400,
                colors: { background: '#0f0f0f', text: '#808080', heading: '#ffffff', accent: '#e63946', cardBackground: '#1a1a1a' },
                titleFontSize: 'md', descriptionFontSize: 'md', borderRadius: 'md',
            },
            signupFloat: {
                headerText: '🍕 First Order Deal',
                descriptionText: '15% OFF your first online order. Use code: FIRSTSLICE',
                imageUrl: images.ny_pizza_2 || '', imagePlacement: 'top',
                showNameField: true, showEmailField: true, showPhoneField: false, showMessageField: false,
                namePlaceholder: 'Your Name', emailPlaceholder: 'email@example.com',
                buttonText: 'Get My Code', socialLinks: [], showSocialLinks: false,
                floatPosition: 'center', showOnLoad: true, showCloseButton: true, triggerDelay: 6,
                minimizeOnClose: true, minimizedLabel: '🍕 15% OFF', width: 360,
                borderRadius: 'md', buttonBorderRadius: 'md', imageHeight: 160,
                headerFontSize: 'md', descriptionFontSize: 'sm',
                colors: {
                    background: '#1a1a1a', heading: '#ffffff', text: '#c4c4c4', accent: '#e63946',
                    buttonBackground: '#e63946', buttonText: '#ffffff',
                    inputBackground: '#0f0f0f', inputText: '#ffffff', inputBorder: '#2a2a2a', inputPlaceholder: '#666666',
                    socialIconColor: '#808080', overlayBackground: 'rgba(0,0,0,0.5)', cardShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
                },
            },
            footer: {
                title: 'SAL\'S FAMOUS PIZZERIA', description: 'Hand-tossed, brick-oven fired since 1987. Brooklyn\'s favorite slice.',
                linkColumns: [
                    { title: 'Menu', links: [{ text: 'Full Menu', href: '#menu' }, { text: 'Specials', href: '#menu' }, { text: 'Catering', href: '#leads' }] },
                    { title: 'Visit', links: [{ text: 'Location', href: '#map' }, { text: 'Hours', href: '#faq' }, { text: 'Gallery', href: '#slideshow' }] },
                    { title: 'More', links: [{ text: 'About Us', href: '#team' }, { text: 'Slice Club', href: '#newsletter' }, { text: 'Gift Cards', href: '#' }] },
                ],
                socialLinks: [
                    { platform: 'instagram', href: 'https://instagram.com' },
                    { platform: 'facebook', href: 'https://facebook.com' },
                    { platform: 'tiktok', href: 'https://tiktok.com' },
                ],
                copyrightText: '© {YEAR} Sal\'s Famous Pizzeria. All rights reserved. Brooklyn, NY.',
                colors: { background: '#0a0a0a', border: '#1a1a1a', text: '#808080', linkHover: '#e63946', heading: '#ffffff' },
            },
        },
    }),
};


// ═══════════════════════════════════════════════════════════════════
//  EXPORT ALL PRESETS
// ═══════════════════════════════════════════════════════════════════
export const TEMPLATE_PRESETS: TemplatePreset[] = [
    ITALIAN_RESTAURANT_PRESET,
    DENTAL_CLINIC_PRESET,
    GYM_CROSSFIT_PRESET,
    LAW_FIRM_PRESET,
    MARKETING_AGENCY_PRESET,
    NY_PIZZERIA_PRESET,
];
