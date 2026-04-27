/**
 * useAIWebsiteStudio
 *
 * Conversational onboarding hook that uses AI to extract business information
 * through natural conversation, then generates a complete website from scratch.
 *
 * Models:
 *  - Chat: gemini-3.1-pro-preview (best available)
 *  - Voice: gemini-3.1-flash-live-preview
 *  - Images: gemini-3-pro-image-preview
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useProject } from '../../../../contexts/project';
import { useEditor } from '../../../../contexts/EditorContext';
import { useAdmin } from '../../../../contexts/admin';
import { useUI } from '../../../../contexts/core/UIContext';
import { useTranslation } from 'react-i18next';
import {
    generateChatContentViaProxy,
    extractTextFromResponse,
    type ChatMessage,
} from '../../../../utils/geminiProxyClient';
import { logApiCall } from '../../../../services/apiLoggingService';
import { LiveServerMessage, Modality } from '@google/genai';
import { getGoogleGenAI } from '../../../../utils/genAiClient';
import { generateComponentColorMappings, generateHeroWaveGradientColors } from '../../../ui/GlobalStylesControl';
import { generateAiAssistantConfig, GlobalColors } from '../../../../utils/chatbotConfigGenerator';
import { generatePagesFromLegacyProject } from '../../../../utils/legacyMigration';
import { extractHeroImage } from '../../../../contexts/project/ProjectContext';
import { PageSection, SitePage } from '../../../../types';
import { db, collection, addDoc, serverTimestamp, doc, updateDoc, setDoc } from '../../../../firebase';

// ── Models ──────────────────────────────────────────────────────────────────
const MODEL_CHAT = 'gemini-3.1-pro-preview';  // Flagship orchestrator (replaces deprecated gemini-3-pro-preview)
const MODEL_VOICE = 'gemini-3.1-flash-live-preview';
const MODEL_IMAGE = 'gemini-3-pro-image-preview';

// ── Voice helpers (same as email studio) ────────────────────────────────────
const base64ToBytes = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
};
const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
};
const floatTo16BitPCM = (input: Float32Array): ArrayBuffer => {
    const output = new ArrayBuffer(input.length * 2);
    const view = new DataView(output);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return output;
};
const decodeAudioData = async (bytes: Uint8Array, ctx: AudioContext, sampleRate: number, channels: number): Promise<AudioBuffer> => {
    const numSamples = bytes.length / 2;
    const buffer = ctx.createBuffer(channels, numSamples, sampleRate);
    const channelData = buffer.getChannelData(0);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < numSamples; i++) channelData[i] = view.getInt16(i * 2, true) / 32768;
    return buffer;
};

const isDev = import.meta.env.DEV;

// ── Types ───────────────────────────────────────────────────────────────────

interface DisplayMessage {
    role: 'user' | 'model';
    text: string;
    isVoice?: boolean;
    timestamp: number;
}

export interface BusinessBrief {
    businessName: string;
    industry: string;
    subIndustry?: string;
    description: string;
    tagline: string;
    services: { name: string; description: string }[];
    contactInfo: {
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        businessHours?: string;
        facebook?: string;
        instagram?: string;
        twitter?: string;
        tiktok?: string;
    };
    hasEcommerce: boolean;
    ecommerceType?: string;
    colorPalette: { primary: string; secondary: string; accent: string; background: string; surface: string; text: string; };
    fontPairing: { header: string; body: string; button: string; };
    suggestedComponents: PageSection[];
    readinessScore: number;
    missingFields: string[];
    /** How the user wants reference images applied (e.g. "Use this person as the owner in all photos") */
    referenceImageContext?: string;
}

export interface GenerationEvent {
    timestamp: number;
    type: 'start' | 'content' | 'image_start' | 'image_done' | 'image_fail' | 'assemble' | 'save' | 'done' | 'error';
    message: string;
    imageUrl?: string;
    imageKey?: string;
}

export interface GenerationPhase {
    phase: 'content' | 'images' | 'finalizing' | 'done';
    progress: number; // 0-100
    currentStep: string;
    imagesTotal: number;
    imagesCompleted: number;
    imagesFailed: number;
    events: GenerationEvent[];
    generatedImages: { key: string; url: string }[];
}

const createEmptyBrief = (): BusinessBrief => ({
    businessName: '',
    industry: '',
    description: '',
    tagline: '',
    services: [],
    contactInfo: {},
    hasEcommerce: false,
    colorPalette: { primary: '#6366f1', secondary: '#8b5cf6', accent: '#f59e0b', background: '#0f0f14', surface: '#1a1a24', text: '#e4e4e7' },
    fontPairing: { header: 'playfair-display', body: 'inter', button: 'inter' },
    suggestedComponents: [],
    readinessScore: 0,
    missingFields: ['businessName', 'industry', 'description'],
    referenceImageContext: '',
});

// ── ALL_SECTIONS constant ───────────────────────────────────────────────────
const ALL_SECTIONS: PageSection[] = [
    'colors', 'typography', 'header',
    'hero', 'heroSplit', 'heroGallery', 'heroWave', 'heroNova', 'heroLead',
    'heroLumina', 'featuresLumina', 'ctaLumina', 'portfolioLumina', 'pricingLumina', 'testimonialsLumina', 'faqLumina',
    'heroNeon', 'testimonialsNeon', 'featuresNeon', 'ctaNeon', 'portfolioNeon', 'pricingNeon', 'faqNeon',
    'topBar', 'logoBanner', 'banner', 'features', 'testimonials', 'slideshow',
    'pricing', 'faq', 'portfolio', 'cta', 'services', 'team', 'video', 'howItWorks', 'menu', 'realEstateListings',
    'leads', 'newsletter', 'map', 'chatbot', 'cmsFeed', 'signupFloat', 'footer',
    'separator1', 'separator2', 'separator3', 'separator4', 'separator5',
];

function buildVisibility(enabledSections: PageSection[]): Record<string, boolean> {
    const vis: Record<string, boolean> = {};
    for (const s of ALL_SECTIONS) vis[s] = enabledSections.includes(s);
    vis['colors'] = true;
    vis['typography'] = true;
    vis['header'] = true;
    vis['footer'] = true;
    return vis;
}

// ── Safe JSON parse ─────────────────────────────────────────────────────────
const safeJsonParse = (text: string, fallback: any = {}): any => {
    if (!text || text.trim() === '') return fallback;
    try {
        let cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
        const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
        if (jsonMatch) cleaned = jsonMatch[0];
        cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
        return JSON.parse(cleaned);
    } catch {
        return fallback;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useAdminTemplateStudio(onSuccess?: () => void) {
    const { user } = useAuth();
    const { refreshProjects } = useProject();
    const { generateImage } = useEditor();
    const { getPrompt } = useAdmin();
    const { setIsOnboardingOpen } = useUI();
    const { t, i18n } = useTranslation();

    // ── Chat state ──────────────────────────────────────────────────────────
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const chatRef = useRef<HTMLDivElement>(null);
    const historyRef = useRef<ChatMessage[]>([]);

    // ── Brief state ─────────────────────────────────────────────────────────
    const [businessBrief, setBusinessBrief] = useState<BusinessBrief>(createEmptyBrief());

    // ── Reference images state ──────────────────────────────────────────────
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const referenceImagesRef = useRef<string[]>([]);
    // Keep ref in sync
    useEffect(() => { referenceImagesRef.current = referenceImages; }, [referenceImages]);

    // ── Generation state ────────────────────────────────────────────────────
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationPhase, setGenerationPhase] = useState<GenerationPhase | null>(null);
    const isGeneratingRef = useRef(false);

    // ── Voice state ─────────────────────────────────────────────────────────
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
    const [liveUserTranscript, setLiveUserTranscript] = useState('');
    const [liveModelTranscript, setLiveModelTranscript] = useState('');
    const sessionRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const isConnectedRef = useRef(false);
    const nextStartTimeRef = useRef(0);
    const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const currentModelResponseRef = useRef<string>('');
    const currentUserTranscriptRef = useRef<string>('');

    // ── Website extraction state ────────────────────────────────────────────
    const [showUrlModal, setShowUrlModal] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    // ── Computed ─────────────────────────────────────────────────────────────
    const canGenerate = businessBrief.readinessScore >= 70 && !isGenerating;

    // ═════════════════════════════════════════════════════════════════════════
    // SYSTEM PROMPT
    // ═════════════════════════════════════════════════════════════════════════

    const buildSystemPrompt = useCallback(() => {
        const lang = i18n.language === 'es' ? 'Spanish' : 'English';
        return `You are Quimera AI — a Senior Creative Director & Web Design Expert with over 20 years of experience at world-class digital agencies. You specialize in color theory, typography, modern UI/UX trends, and conversion-focused web design. You help users create stunning, award-worthy websites through natural conversation.

YOUR EXPERTISE:
- Color Theory: 60-30-10 rule, color temperature, WCAG AA contrast, psychological color associations
- Typography: Expert font pairing, readability hierarchies, industry-appropriate typeface selection
- Modern Trends (2025-2026): Glassmorphism, bento grids, oversized typography, scroll-driven animations, soft gradients, neobrutalism accents, warm neutrals, clay palettes
- Conversion Design: Strategic CTA placement, visual hierarchy, trust signals, social proof positioning

YOUR GOAL: Extract all the business information needed to generate a complete website, then propose a design using your expert knowledge.

CONVERSATION PHASES:
1. DISCOVERY — Ask about the business: name, industry/type, what makes it special
2. VALUE PROPOSITION — Understand services/products, unique selling points, target audience
3. CONTACT & LOCATION — Get contact details, address, social media, business hours
4. E-COMMERCE — Ask if they sell products online (if relevant to their industry)
5. DESIGN PROPOSAL — Propose colors, components, typography and overall aesthetic based on industry. Explain WHY you chose each color and font (e.g., "I chose Playfair Display for your headers because serif fonts convey the elegance and trust your law firm needs")
6. CONFIRMATION — Summarize everything and ask if they're ready to generate

CRITICAL RULES:
1. Be conversational, warm, and enthusiastic. This is a creative collaboration, not a form.
2. Ask 1-2 questions at a time, never overwhelm with many questions.
3. After EVERY response, include a hidden brief update tag with ALL currently known information:
   <!--BRIEF:{"businessName":"[GENERATE_TEXT]","industry":"[GENERATE_TEXT]","description":"[GENERATE_TEXT]","tagline":"[GENERATE_TEXT]","services":[{"name":"[GENERATE_TEXT]","description":"[GENERATE_TEXT]"}],"contactInfo":{"email":"[GENERATE_TEXT]","phone":"[GENERATE_TEXT]","address":"[GENERATE_TEXT]","city":"[GENERATE_TEXT]","state":"[GENERATE_TEXT]","country":"[GENERATE_TEXT]","businessHours":"[GENERATE_TEXT]","instagram":"[GENERATE_TEXT]","facebook":"[GENERATE_TEXT]","twitter":"[GENERATE_TEXT]","tiktok":"[GENERATE_TEXT]"},"hasEcommerce":false,"colorPalette":{"primary":"#hex","secondary":"#hex","accent":"#hex","background":"#hex","surface":"#hex","text":"#hex"},"fontPairing":{"header":"[FONT_KEY_FROM_GUIDE]","body":"[FONT_KEY_FROM_GUIDE]","button":"[FONT_KEY_FROM_GUIDE]"},"suggestedComponents":["hero","services","features","testimonials","faq","cta","leads","newsletter","map","signupFloat"],"readinessScore":0,"missingFields":["businessName","industry"],"referenceImageContext":""}-->
4. Update readinessScore progressively: 0-20 (just started), 20-40 (basic info), 40-60 (good detail), 60-80 (almost ready), 80-100 (ready to generate)
5. For suggestedComponents, pick from: hero, heroSplit, heroGallery, heroWave, heroNova, heroLead, topBar, logoBanner, banner, features, testimonials, pricing, faq, cta, services, video, howItWorks, menu, realEstateListings, leads, newsletter, map, signupFloat, separator1, separator2, separator3. NEVER include: slideshow, portfolio, team. heroLead is a split hero with integrated lead form. Use realEstateListings only for realtor/property websites, and pair it with the existing leads component.
   - IF THE USER REQUESTS "Lumina Suite", OR if the industry is related to AI, Luxury, Enterprise, or Data, you MUST exclusively use Lumina components (heroLumina, featuresLumina, ctaLumina, portfolioLumina, pricingLumina, testimonialsLumina, faqLumina) instead of the standard ones.
   - IF THE USER REQUESTS "Neon Suite", OR if the industry is related to Tech, Gaming, Web3, Cyber, or eSports, you MUST exclusively use Neon components (heroNeon, featuresNeon, ctaNeon, portfolioNeon, pricingNeon, testimonialsNeon, faqNeon) instead of the standard ones.
6. Apply your expert color theory knowledge to choose palettes (see COLOR PALETTES section below)
7. Apply your expert typography knowledge to choose font pairings (see TYPOGRAPHY section below). ALWAYS include fontPairing in the BRIEF tag using the exact font key strings from the available fonts list (e.g. "playfair-display", "space-grotesk", "inter"). Choose fonts that match the industry personality.
8. When readinessScore >= 80, you MUST do the following:
   a. Summarize all the information gathered in a clear list.
   b. Tell the user that you have everything you need.
   c. Explicitly instruct them to press the **"🚀 Generate Website"** button on the right panel (or on mobile, tap the "Brief" button first).
   d. Warn them that the generation process takes **several minutes** (approximately 3-5 minutes) because the AI needs to generate all the content, create custom images, and assemble everything. Tell them to be patient and NOT close the window.
   e. Example: "¡Tengo todo lo que necesito! Para comenzar, presiona el botón **🚀 Generate Website** en el panel derecho. El proceso toma entre 3-5 minutos porque voy a generar todo el contenido, crear imágenes personalizadas y ensamblar tu sitio completo. ¡No cierres la ventana y verás el progreso en tiempo real!"
9. ALWAYS respond in ${lang}. The BRIEF tag must always use English field names but values in the user's language.
10. Use markdown formatting for clear, readable responses. Use **bold** for emphasis, bullet lists for options.
11. If the user provides a URL or existing website, acknowledge it and extract whatever info you can from the conversation.

═══════════════════════════════════════════════════════════
COMPONENT SELECTION GUIDE BY INDUSTRY
═══════════════════════════════════════════════════════════
- Restaurant/Café/Bar: [HERO: heroGallery OR heroNova OR heroSplit], topBar, menu, features, testimonials, howItWorks, faq, leads, newsletter, cta, banner, map, signupFloat
- Healthcare/Dental/Clinic: [HERO: heroLead OR heroSplit OR heroWave], topBar, services, features, testimonials, pricing, faq, leads, newsletter, cta, banner, map, signupFloat
- Fitness/Gym/Wellness: [HERO: heroWave OR heroNova OR heroLead], topBar, services, features, testimonials, pricing, howItWorks, faq, leads, newsletter, cta, banner, map, signupFloat
- Agency/Consulting/Marketing: [HERO: heroLead OR heroSplit OR heroNova], logoBanner, services, features, testimonials, howItWorks, faq, leads, newsletter, cta, banner, signupFloat
- Photography/Videography: [HERO: heroGallery OR heroNova OR heroSplit], testimonials, services, faq, leads, cta, banner, signupFloat
- Legal/Accounting/Finance: [HERO: heroLead OR heroSplit OR heroWave], topBar, services, features, testimonials, faq, leads, newsletter, cta, banner, map
- Ecommerce/Retail/Online Store: [HERO: heroNova OR heroGallery OR heroWave], topBar, features, testimonials, faq, newsletter, cta, banner, signupFloat
- Real Estate/Property: [HERO: heroLead OR heroGallery OR heroNova], topBar, realEstateListings, features, services, testimonials, faq, leads, map, cta, banner, signupFloat
- Beauty/Spa/Salon: [HERO: heroGallery OR heroSplit OR heroNova], topBar, services, features, pricing, testimonials, faq, leads, newsletter, map, banner, signupFloat
- Education/Academy/Coaching: [HERO: hero OR heroWave OR heroSplit], topBar, services, features, howItWorks, testimonials, pricing, faq, leads, newsletter, cta, banner, signupFloat
- Music/Audio/Entertainment: [HERO: heroNova OR heroWave OR heroGallery], topBar, features, services, testimonials, faq, leads, newsletter, cta, banner, signupFloat
- Architecture/Interior Design: [HERO: heroGallery OR heroNova OR heroSplit], services, features, testimonials, faq, leads, cta, banner, signupFloat
- Construction/Home Services: [HERO: hero OR heroSplit OR heroNova], topBar, services, features, howItWorks, testimonials, faq, leads, map, cta, banner, signupFloat
- Tech/SaaS/Startup: [HERO: heroWave OR heroNova OR heroSplit], logoBanner, features, services, howItWorks, pricing, testimonials, faq, leads, newsletter, cta, banner, signupFloat
- Non-Profit/NGO/Foundation: [HERO: hero OR heroWave OR heroSplit], topBar, features, howItWorks, testimonials, faq, leads, newsletter, cta, banner, signupFloat

HERO SELECTION RULE: For [HERO: A OR B OR C], you MUST randomly pick ONE from the options listed. Do NOT always default to the first option. Vary your choice across different conversations.
HEADER SELECTION RULE: NEVER default to the same header style. Vary between sticky-solid, floating-glass, floating-pill, transparent-blur, edge-minimal, edge-bordered, transparent-gradient-dark, etc. Match the style to the industry vibe.
BANNER: ALWAYS include a banner component in suggestedComponents. It is REQUIRED for every website.

═══════════════════════════════════════════════════════════
EXPERT COLOR THEORY — PALETTE DESIGN RULES
═══════════════════════════════════════════════════════════

**The 60-30-10 Rule (ALWAYS follow this):**
- 60% = Background/dominant color (your "background" color — sets the mood)
- 30% = Secondary surfaces (cards, sections, header — your "primary" brand color)
- 10% = Accent pop (CTAs, highlights, hover states — your "accent" color)

**Color Temperature & Psychology:**
- WARM tones (reds, oranges, yellows, golds) → Energy, appetite, urgency, passion
- COOL tones (blues, teals, greens, purples) → Trust, calm, professionalism, health
- NEUTRAL tones (grays, off-whites, tans, charcoals) → Sophistication, timelessness, luxury

**Contrast Requirements (WCAG AA):**
- Text on background must have at least 4.5:1 ratio
- Dark backgrounds (#0a0a0a to #1a1a2e) → Use white (#ffffff) or very light text
- Light backgrounds (#fafafa to #ffffff) → Use very dark text (#111827 or #1a1a1a)

**Typography & Component Rules (CRITICAL):**
- Typography color over any colored background MUST ALWAYS be white (#ffffff), unless it is a specific character detail that requires another color for design reasons. THIS IS EXTREMELY IMPORTANT for the navigation and the Hero section, which must strictly enforce white text over colored backgrounds.
- The footer background MUST NEVER be white (#ffffff). It must be a solid color or match the header color.

**Modern Palette Trends 2025-2026:**
- Clay & earth palettes: warm neutrals with terracotta accents
- Deep cool: midnight navy/charcoal with electric blue or mint accents
- Moody gradients: dark purple-to-blue backgrounds with golden/amber accents
- Neo-luxury: black/dark gray with champagne gold or rose gold accents
- Digital fresh: clean whites with vibrant coral, teal, or chartreuse accents
- Organic warm: sage green + warm beige + burnt orange

═══════════════════════════════════════════════════════════
EXPERT COLOR PALETTES BY INDUSTRY
═══════════════════════════════════════════════════════════
Choose the best palette for the client's industry. These are reference starting points — adjust based on the brand personality:

**Restaurant/Café:**
  Warm & Appetizing: primary #c8a97e, secondary #8b6f47, accent #d4a053, background #0f0d0a, text #ffffff
  Modern Bistro: primary #b8860b, secondary #2d2926, accent #e8c547, background #1a1612, text #f5f0e8

**Healthcare/Medical/Dental:**
  Trust & Clean: primary #0ea5e9, secondary #0369a1, accent #38bdf8, background #f0f9ff, text #1e3a5f
  Medical Dark: primary #38bdf8, secondary #1e40af, accent #06b6d4, background #0f172a, text #f1f5f9

**Fitness/Gym/Wellness:**
  Bold Energy: primary #ef4444, secondary #1a1a1a, accent #f97316, background #0a0a0a, text #ffffff
  Modern Wellness: primary #10b981, secondary #064e3b, accent #34d399, background #0a0f0d, text #ecfdf5

**Legal/Finance/Consulting:**
  Authoritative: primary #1e3a5f, secondary #1e40af, accent #d4a853, background #0f1729, text #f1f5f9
  Classic Trust: primary #1e40af, secondary #1e3a5f, accent #f59e0b, background #fafbfe, text #1a1a2e

**Tech/SaaS/Startup:**
  Digital Edge: primary #8b5cf6, secondary #6366f1, accent #06b6d4, background #0f0b1a, text #f5f3ff
  Clean Tech: primary #3b82f6, secondary #1d4ed8, accent #10b981, background #f8fafc, text #1e293b

**Real Estate/Property:**
  Luxury Estate: primary #b8860b, secondary #2c2c2c, accent #d4a853, background #111111, text #f5f0e8
  Modern Living: primary #0d9488, secondary #134e4a, accent #f97316, background #fafaf9, text #1c1917

**Beauty/Spa/Salon:**
  Elegant Rose: primary #be185d, secondary #831843, accent #f472b6, background #0f0a0d, text #fdf2f8
  Natural Glow: primary #d4a853, secondary #92400e, accent #fbbf24, background #fffbeb, text #451a03

**Ecommerce/Retail:**
  Bold Commerce: primary #f97316, secondary #c2410c, accent #fbbf24, background #0a0a0a, text #ffffff
  Premium Store: primary #1a1a2e, secondary #2d2b55, accent #e8c547, background #fafafa, text #1a1a2e

**Education/Academy:**
  Knowledge: primary #2563eb, secondary #1d4ed8, accent #f59e0b, background #eff6ff, text #1e3a5f
  Digital Campus: primary #7c3aed, secondary #5b21b6, accent #06b6d4, background #0f0a1a, text #f5f3ff

**Music/Audio/Entertainment:**
  Electric Night: primary #e8c547, secondary #b8860b, accent #f59e0b, background #0a0a0a, text #ffffff
  Studio Pro: primary #8b5cf6, secondary #6d28d9, accent #f97316, background #0f0b15, text #ede9fe

**Architecture/Interior Design:**
  Minimal Lux: primary #1a1a1a, secondary #737373, accent #d4a853, background #fafafa, text #171717
  Dark Portfolio: primary #a3a3a3, secondary #525252, accent #f97316, background #0a0a0a, text #fafafa

**Construction/Home Services:**
  Industrial: primary #f97316, secondary #9a3412, accent #fbbf24, background #1c1917, text #fafaf9
  Reliable Pro: primary #2563eb, secondary #1d4ed8, accent #f59e0b, background #fafafa, text #1e293b

**Non-Profit/NGO:**
  Compassion: primary #059669, secondary #047857, accent #f59e0b, background #ecfdf5, text #064e3b
  Impact Dark: primary #10b981, secondary #065f46, accent #fbbf24, background #0a0f0d, text #d1fae5

**Photography/Creative:**
  Noir Gallery: primary #ffffff, secondary #a3a3a3, accent #e8c547, background #0a0a0a, text #fafafa
  Light & Airy: primary #1a1a1a, secondary #525252, accent #f472b6, background #fafafa, text #171717

═══════════════════════════════════════════════════════════
EXPERT TYPOGRAPHY — FONT PAIRING GUIDE
═══════════════════════════════════════════════════════════
Available fonts (43 Google Fonts in app): inter, inter-tight, dm-sans, outfit, figtree, urbanist, manrope, sora, montserrat, poppins, raleway, public-sans, open-sans, work-sans, space-grotesk, bricolage-grotesque, ibm-plex-sans, libre-franklin, fira-sans, barlow-condensed, archivo-narrow, red-hat-display, syne, unbounded, instrument-sans, ubuntu, playfair-display, instrument-serif, eb-garamond, libre-baskerville, merriweather, newsreader, fraunces, dm-serif-text, biorhyme, bree-serif, eczar, inknut-antiqua, marcellus, neuton, dm-mono, space-mono, noto-sans-mono

**RECOMMENDED PAIRINGS BY INDUSTRY:**

Tech/SaaS/Startup:
  Header: space-grotesk | sora | inter-tight  Body: inter | dm-sans | work-sans  Button: inter-tight | space-grotesk

Luxury/Premium/Real Estate:
  Header: playfair-display | instrument-serif | fraunces  Body: dm-sans | inter | outfit  Button: dm-sans | montserrat

Legal/Finance/Corporate:
  Header: eb-garamond | libre-baskerville | merriweather  Body: ibm-plex-sans | work-sans | libre-franklin  Button: work-sans | ibm-plex-sans

Healthcare/Medical:
  Header: outfit | manrope | inter  Body: ibm-plex-sans | open-sans | inter  Button: outfit | manrope

Restaurant/Café/Food:
  Header: instrument-serif | fraunces | playfair-display  Body: figtree | dm-sans | inter  Button: figtree | dm-sans

Fitness/Sports/Energy:
  Header: barlow-condensed | montserrat | unbounded  Body: inter | dm-sans | fira-sans  Button: barlow-condensed | montserrat

Beauty/Spa/Fashion:
  Header: instrument-serif | playfair-display | marcellus  Body: dm-sans | outfit | urbanist  Button: dm-sans | outfit

Education/Academy:
  Header: merriweather | libre-baskerville | outfit  Body: inter | open-sans | work-sans  Button: inter | outfit

Agency/Creative/Design:
  Header: syne | bricolage-grotesque | red-hat-display  Body: inter | dm-sans | urbanist  Button: syne | space-grotesk

Architecture/Construction:
  Header: archivo-narrow | barlow-condensed | space-grotesk  Body: inter | work-sans | public-sans  Button: archivo-narrow | space-grotesk

Music/Entertainment:
  Header: syne | unbounded | bricolage-grotesque  Body: inter | dm-sans | outfit  Button: syne | unbounded

Non-Profit/Community:
  Header: outfit | manrope | figtree  Body: inter | open-sans | dm-sans  Button: outfit | manrope

Ecommerce/Retail:
  Header: montserrat | red-hat-display | outfit  Body: inter | dm-sans | figtree  Button: montserrat | outfit

**FONT PERSONALITY RULES:**
- Serif fonts (playfair-display, instrument-serif, eb-garamond) → Elegance, tradition, authority, luxury
- Geometric sans (montserrat, poppins, outfit) → Modern, clean, approachable, tech-friendly
- Humanist sans (inter, dm-sans, figtree) → Warm, readable, universal — safe for any industry
- Grotesque sans (space-grotesk, bricolage-grotesque, sora) → Futuristic, technical, edgy, startup vibes
- Condensed (barlow-condensed, archivo-narrow) → Bold impact, sports, industrial, space-efficient
- Display (syne, unbounded, red-hat-display) → Creative, attention-grabbing, for headlines only
- Monospace (dm-mono, space-mono) → Developer, tech, data-driven brands

═══════════════════════════════════════════════════════════
REFERENCE IMAGES — STYLE TRANSFER & VISUAL GUIDANCE
═══════════════════════════════════════════════════════════
The user can upload reference images via the right panel. When the user uploads reference images, you MUST:
1. Acknowledge that you see they uploaded reference image(s)
2. Ask HOW they want the reference images applied. Examples:
   - "I want this person to appear as the owner/model in all website photos"
   - "Use this location/place as the setting for all photos"
   - "Match the visual style, lighting, and mood of these images"
   - "This is our product — feature it prominently"
   - "Use these as inspiration for the overall aesthetic"
3. Store their answer in the referenceImageContext field of the BRIEF tag
4. Confirm back to the user how you'll use the reference images during generation

In the BRIEF tag, include: "referenceImageContext":"[user's description of how to apply reference images]"
Example: "referenceImageContext":"Use this person as the business owner in hero and team photos. Match the warm, golden-hour lighting style."

${referenceImagesRef.current.length > 0 ? `⚠️ The user has currently uploaded ${referenceImagesRef.current.length} reference image(s). If you haven't already asked how they want them used, ASK NOW.` : ''}

Remember: You are building a COMPLETE website — every component needs full, rich content. Be thorough in your information gathering.`;
    }, [i18n.language, referenceImages.length]);

    // ═════════════════════════════════════════════════════════════════════════
    // INIT
    // ═════════════════════════════════════════════════════════════════════════

    const initStudio = useCallback(() => {
        const welcomeText = `${t('aiWebsiteStudio.welcome.greeting')}

${t('aiWebsiteStudio.welcome.description')}

${t('aiWebsiteStudio.welcome.whatINeed')}
- ${t('aiWebsiteStudio.welcome.businessName')}
- ${t('aiWebsiteStudio.welcome.services')}
- ${t('aiWebsiteStudio.welcome.style')}
- ${t('aiWebsiteStudio.welcome.contact')}

${t('aiWebsiteStudio.welcome.voiceHint')}

${t('aiWebsiteStudio.welcome.existingWebsite')}

${t('aiWebsiteStudio.welcome.startQuestion')}`;

        const welcomeMsg: DisplayMessage = { role: 'model', text: welcomeText, timestamp: Date.now() };
        setMessages([welcomeMsg]);
        setBusinessBrief(createEmptyBrief());
        setGenerationPhase(null);
        setIsGenerating(false);

        const systemContext = buildSystemPrompt();
        historyRef.current = [
            { role: 'user', text: `[SYSTEM] ${systemContext}` },
            { role: 'model', text: welcomeText },
        ];
    }, [t, buildSystemPrompt]);

    // ═════════════════════════════════════════════════════════════════════════
    // WEBSITE EXTRACTION — Deep scrape of existing website
    // ═════════════════════════════════════════════════════════════════════════

    const extractWebsiteData = useCallback(async (url: string) => {
        setIsExtracting(true);
        setShowUrlModal(false);

        // Add user message
        const userMsg: DisplayMessage = { role: 'user', text: url, timestamp: Date.now() };
        setMessages(prev => [...prev, { role: 'model', text: t('aiWebsiteStudio.extraction.analyzing'), timestamp: Date.now() }]);

        try {
            // 1. Call the server-side analyzeWebsite Cloud Function
            //    This uses OpenRouter + Gemini to analyze the URL directly
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const functions = getFunctions();
            const analyzeWebsiteFn = httpsCallable(functions, 'agencyOnboarding-analyzeWebsite', { timeout: 60000 });

            const response = await analyzeWebsiteFn({ url });
            const cfData = response.data as { success: boolean; result: any };

            if (!cfData.success || !cfData.result) {
                throw new Error('Analysis returned no data');
            }

            const result = cfData.result;
            const pagesScraped = (cfData as any).meta?.pagesScraped || 1;

            // 2. Map Cloud Function result into our BusinessBrief
            const lang = i18n.language === 'es' ? 'es' : 'en';
            setBusinessBrief(prev => ({
                ...prev,
                businessName: result.businessName || prev.businessName,
                industry: result.industry || prev.industry,
                description: result.description || prev.description,
                tagline: result.tagline || prev.tagline,
                services: result.services?.length
                    ? result.services.map((s: any) => ({ name: s.name, description: s.description || '' }))
                    : prev.services,
                contactInfo: {
                    ...prev.contactInfo,
                    email: result.contactInfo?.email || prev.contactInfo.email,
                    phone: result.contactInfo?.phone || prev.contactInfo.phone,
                    address: result.contactInfo?.address || prev.contactInfo.address,
                    businessHours: result.contactInfo?.businessHours
                        ? (typeof result.contactInfo.businessHours === 'string'
                            ? result.contactInfo.businessHours
                            : JSON.stringify(result.contactInfo.businessHours))
                        : prev.contactInfo.businessHours,
                },
                // Map branding into colorPalette
                colorPalette: result.branding ? {
                    ...prev.colorPalette,
                    primary: result.branding.primaryColor || prev.colorPalette.primary,
                    secondary: result.branding.secondaryColor || prev.colorPalette.secondary,
                    accent: result.branding.accentColor || prev.colorPalette.accent,
                    background: result.branding.backgroundColor || prev.colorPalette.background,
                } : prev.colorPalette,
                readinessScore: Math.min(70, (prev.readinessScore || 0) + 30),
            }));

            // 3. Build a summary message for the chat so the AI has context
            const socialLinks = [
                result.contactInfo?.facebook && `Facebook: ${result.contactInfo.facebook}`,
                result.contactInfo?.instagram && `Instagram: ${result.contactInfo.instagram}`,
                result.contactInfo?.twitter && `Twitter: ${result.contactInfo.twitter}`,
                result.contactInfo?.linkedin && `LinkedIn: ${result.contactInfo.linkedin}`,
                result.contactInfo?.youtube && `YouTube: ${result.contactInfo.youtube}`,
                result.contactInfo?.tiktok && `TikTok: ${result.contactInfo.tiktok}`,
            ].filter(Boolean);

            // Build branding summary
            const brandingInfo = result.branding;
            const brandingLines = brandingInfo ? [
                brandingInfo.primaryColor && `🎨 ${lang === 'es' ? 'Color primario' : 'Primary color'}: ${brandingInfo.primaryColor}`,
                brandingInfo.secondaryColor && `🎨 ${lang === 'es' ? 'Color secundario' : 'Secondary color'}: ${brandingInfo.secondaryColor}`,
                brandingInfo.accentColor && `🎨 ${lang === 'es' ? 'Color acento' : 'Accent color'}: ${brandingInfo.accentColor}`,
                brandingInfo.fonts?.length && `🔤 ${lang === 'es' ? 'Fuentes' : 'Fonts'}: ${brandingInfo.fonts.join(', ')}`,
                brandingInfo.visualStyle && `✨ ${lang === 'es' ? 'Estilo visual' : 'Visual style'}: ${brandingInfo.visualStyle}`,
                brandingInfo.isDarkTheme != null && `${brandingInfo.isDarkTheme ? '🌙' : '☀️'} ${lang === 'es' ? 'Tema' : 'Theme'}: ${brandingInfo.isDarkTheme ? (lang === 'es' ? 'Oscuro' : 'Dark') : (lang === 'es' ? 'Claro' : 'Light')}`,
            ].filter(Boolean) : [];

            const summaryText = lang === 'es'
                ? `✅ **Sitio analizado:** ${url} (${pagesScraped} ${pagesScraped === 1 ? 'página' : 'páginas'} escaneadas)\n\n` +
                  `**Negocio:** ${result.businessName || 'No detectado'}\n` +
                  `**Industria:** ${result.industry || 'No detectada'}\n` +
                  `**Descripción:** ${result.description || 'No disponible'}\n` +
                  `**Tagline:** ${result.tagline || 'No disponible'}\n` +
                  (result.services?.length ? `**Servicios:** ${result.services.map((s: any) => s.name).join(', ')}\n` : '') +
                  (result.contactInfo?.email ? `**Email:** ${result.contactInfo.email}\n` : '') +
                  (result.contactInfo?.phone ? `**Teléfono:** ${result.contactInfo.phone}\n` : '') +
                  (result.contactInfo?.address ? `**Dirección:** ${result.contactInfo.address}\n` : '') +
                  (socialLinks.length ? `**Redes sociales:** ${socialLinks.join(', ')}\n` : '') +
                  (brandingLines.length ? `\n**Branding detectado:**\n${brandingLines.join('\n')}\n` : '') +
                  `\nHe importado toda la información disponible. ¿Hay algo que quieras ajustar o agregar antes de generar tu sitio web?`
                : `✅ **Website analyzed:** ${url} (${pagesScraped} ${pagesScraped === 1 ? 'page' : 'pages'} scraped)\n\n` +
                  `**Business:** ${result.businessName || 'Not detected'}\n` +
                  `**Industry:** ${result.industry || 'Not detected'}\n` +
                  `**Description:** ${result.description || 'Not available'}\n` +
                  `**Tagline:** ${result.tagline || 'Not available'}\n` +
                  (result.services?.length ? `**Services:** ${result.services.map((s: any) => s.name).join(', ')}\n` : '') +
                  (result.contactInfo?.email ? `**Email:** ${result.contactInfo.email}\n` : '') +
                  (result.contactInfo?.phone ? `**Phone:** ${result.contactInfo.phone}\n` : '') +
                  (result.contactInfo?.address ? `**Address:** ${result.contactInfo.address}\n` : '') +
                  (socialLinks.length ? `**Social media:** ${socialLinks.join(', ')}\n` : '') +
                  (brandingLines.length ? `\n**Branding detected:**\n${brandingLines.join('\n')}\n` : '') +
                  `\nI've imported all available information. Would you like to adjust or add anything before generating your website?`;

            // 4. Update chat messages
            setMessages(prev => {
                const filtered = prev.filter(m => m.text !== t('aiWebsiteStudio.extraction.analyzing'));
                return [...filtered, userMsg, { role: 'model', text: summaryText, timestamp: Date.now() }];
            });

            // 5. Update history for AI context
            historyRef.current = [
                ...historyRef.current,
                { role: 'user', text: `I have an existing website: ${url}` },
                { role: 'model', text: `I analyzed the website (${pagesScraped} pages) and extracted: Business name: ${result.businessName}, Industry: ${result.industry}, Services: ${result.services?.map((s: any) => s.name).join(', ') || 'none found'}. Contact: ${result.contactInfo?.email || 'no email'}, ${result.contactInfo?.phone || 'no phone'}. Branding: ${brandingInfo ? `primary=${brandingInfo.primaryColor}, fonts=${brandingInfo.fonts?.join(',')}` : 'not detected'}. The brief has been populated with this data.` },
            ];

        } catch (error) {
            console.error('[AIWebsiteStudio] Website extraction failed:', error);
            setMessages(prev => {
                const filtered = prev.filter(m => m.text !== t('aiWebsiteStudio.extraction.analyzing'));
                return [...filtered, userMsg, {
                    role: 'model',
                    text: t('aiWebsiteStudio.extraction.error'),
                    timestamp: Date.now(),
                }];
            });
        } finally {
            setIsExtracting(false);
        }
    }, [user, t, i18n.language]);

    // ═════════════════════════════════════════════════════════════════════════
    // BRIEF EXTRACTION — Parse <!--BRIEF:{...}--> from AI responses
    // ═════════════════════════════════════════════════════════════════════════

    const extractAndUpdateBrief = useCallback((text: string): string => {
        const briefMatch = text.match(/<!--BRIEF:([\s\S]*?)-->/);
        if (!briefMatch) return text;

        try {
            const briefData = JSON.parse(briefMatch[1]);
            setBusinessBrief(prev => {
                const updated = { ...prev };
                if (briefData.businessName) updated.businessName = briefData.businessName;
                if (briefData.industry) updated.industry = briefData.industry;
                if (briefData.subIndustry) updated.subIndustry = briefData.subIndustry;
                if (briefData.description) updated.description = briefData.description;
                if (briefData.tagline) updated.tagline = briefData.tagline;
                if (briefData.services && Array.isArray(briefData.services)) updated.services = briefData.services;
                if (briefData.contactInfo) updated.contactInfo = { ...prev.contactInfo, ...briefData.contactInfo };
                if (briefData.hasEcommerce !== undefined) updated.hasEcommerce = briefData.hasEcommerce;
                if (briefData.ecommerceType) updated.ecommerceType = briefData.ecommerceType;
                if (briefData.colorPalette) updated.colorPalette = { ...prev.colorPalette, ...briefData.colorPalette };
                if (briefData.fontPairing) updated.fontPairing = { ...prev.fontPairing, ...briefData.fontPairing };
                if (briefData.suggestedComponents && Array.isArray(briefData.suggestedComponents)) {
                    updated.suggestedComponents = briefData.suggestedComponents as PageSection[];
                }
                if (typeof briefData.readinessScore === 'number') updated.readinessScore = briefData.readinessScore;
                if (briefData.missingFields && Array.isArray(briefData.missingFields)) updated.missingFields = briefData.missingFields;
                if (briefData.referenceImageContext) updated.referenceImageContext = briefData.referenceImageContext;
                return updated;
            });
        } catch (e) {
            if (isDev) console.warn('[AIWebsiteStudio] Failed to parse brief:', e);
        }

        // Remove the brief tag from visible text
        return text.replace(/<!--BRIEF:[\s\S]*?-->/g, '').trim();
    }, []);

    // ═════════════════════════════════════════════════════════════════════════
    // SEND MESSAGE
    // ═════════════════════════════════════════════════════════════════════════

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isThinking) return;

        const userMsg: DisplayMessage = { role: 'user', text: text.trim(), timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);

        historyRef.current.push({ role: 'user', text: text.trim() });

        try {
            const systemPrompt = buildSystemPrompt();
            // Use proper multi-turn history to avoid re-sending entire conversation each time
            const chatHistory = historyRef.current
                .filter(m => !m.text.startsWith('[SYSTEM]'));

            const response = await generateChatContentViaProxy(
                'ai-website-studio',
                chatHistory,
                text.trim(),
                systemPrompt,
                MODEL_CHAT,
                { temperature: 1.0, thinkingLevel: 'medium', maxOutputTokens: 8192 },
                user?.uid
            );

            const responseText = extractTextFromResponse(response);
            if (responseText) {
                const cleanedText = extractAndUpdateBrief(responseText);
                const aiMsg: DisplayMessage = { role: 'model', text: cleanedText, timestamp: Date.now() };
                setMessages(prev => [...prev, aiMsg]);
                historyRef.current.push({ role: 'model', text: responseText }); // Store full including brief
            }

            logApiCall({
                userId: user?.uid || '',
                model: MODEL_CHAT,
                feature: 'ai-website-studio-chat',
                success: true,
            });
        } catch (error) {
            console.error('[AIWebsiteStudio] Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'model',
                text: t('aiWebsiteStudio.chat.errorMessage'),
                timestamp: Date.now(),
            }]);
        } finally {
            setIsThinking(false);
        }
    }, [isThinking, user, buildSystemPrompt, extractAndUpdateBrief]);

    // Auto-scroll
    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [messages, isThinking, liveUserTranscript, liveModelTranscript]);

    // ═════════════════════════════════════════════════════════════════════════
    // VOICE MODE
    // ═════════════════════════════════════════════════════════════════════════

    const stopVoiceSession = useCallback(() => {
        isConnectedRef.current = false;
        if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
        if (inputAudioContextRef.current) { inputAudioContextRef.current.close().catch(() => {}); inputAudioContextRef.current = null; }
        activeSourcesRef.current.forEach(s => { try { s.stop(); } catch (_e) {} });
        activeSourcesRef.current = [];
        if (sessionRef.current) { try { sessionRef.current.close?.(); } catch (_e) {} sessionRef.current = null; }
        // Flush leftover transcripts
        if (currentUserTranscriptRef.current.trim()) {
            const leftover = currentUserTranscriptRef.current.trim();
            setMessages(prev => [...prev, { role: 'user', text: leftover, isVoice: true, timestamp: Date.now() }]);
            historyRef.current.push({ role: 'user', text: leftover });
        }
        if (currentModelResponseRef.current.trim()) {
            const leftover = currentModelResponseRef.current.trim();
            const cleaned = extractAndUpdateBrief(leftover);
            setMessages(prev => [...prev, { role: 'model', text: cleaned, isVoice: true, timestamp: Date.now() }]);
            historyRef.current.push({ role: 'model', text: leftover });
        }
        setLiveUserTranscript(''); setLiveModelTranscript('');
        currentUserTranscriptRef.current = ''; currentModelResponseRef.current = '';
        setIsVoiceActive(false); setIsVoiceConnecting(false);
    }, [extractAndUpdateBrief]);

    const startVoiceSession = useCallback(async () => {
        setIsVoiceConnecting(true);
        try {
            const ai = await getGoogleGenAI();
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const outputCtx = new AudioCtx({ sampleRate: 24000 });
            const inputCtx = new AudioCtx({ sampleRate: 16000 });
            audioContextRef.current = outputCtx;
            inputAudioContextRef.current = inputCtx;
            nextStartTimeRef.current = outputCtx.currentTime;

            const baseSystemPrompt = buildSystemPrompt();
            const conversationHistory = historyRef.current
                .filter(m => !m.text.startsWith('[SYSTEM]'))
                .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`)
                .join('\n\n');

            const systemPromptWithHistory = conversationHistory
                ? `${baseSystemPrompt}\n\n--- PREVIOUS CONVERSATION ---\n${conversationHistory}\n--- END ---\n\nContinue the conversation naturally. The user is now speaking by voice. IMPORTANT: Include <!--BRIEF:{...}--> tags in your responses with updated business information.`
                : baseSystemPrompt;

            let resolvedSession: any = null;

            const session = await ai.live.connect({
                model: MODEL_VOICE,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
                    systemInstruction: systemPromptWithHistory,
                    contextWindowCompression: { slidingWindow: {} },
                    sessionResumption: {},
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => { setIsVoiceConnecting(false); setIsVoiceActive(true); isConnectedRef.current = true; },
                    onmessage: async (message: LiveServerMessage) => {
                        const msg = message as any;
                        if (message.serverContent?.interrupted) {
                            activeSourcesRef.current.forEach(s => { try { s.stop(); } catch (_e) {} });
                            activeSourcesRef.current = [];
                            if (audioContextRef.current) nextStartTimeRef.current = audioContextRef.current.currentTime;
                            return;
                        }
                        const inputTranscript = msg.serverContent?.inputTranscription?.text || msg.serverContent?.inputTranscript;
                        const outputTranscript = msg.serverContent?.outputTranscription?.text || msg.serverContent?.outputTranscript;
                        if (inputTranscript) { currentUserTranscriptRef.current += inputTranscript; setLiveUserTranscript(currentUserTranscriptRef.current); }
                        if (outputTranscript) { currentModelResponseRef.current += outputTranscript; setLiveModelTranscript(currentModelResponseRef.current); }
                        const turnComplete = msg.serverContent?.turnComplete || msg.serverContent?.generationComplete;
                        if (turnComplete) {
                            if (currentUserTranscriptRef.current.trim()) {
                                const ut = currentUserTranscriptRef.current.trim();
                                setMessages(prev => [...prev, { role: 'user', text: ut, isVoice: true, timestamp: Date.now() }]);
                                historyRef.current.push({ role: 'user', text: ut });
                                currentUserTranscriptRef.current = ''; setLiveUserTranscript('');
                            }
                            if (currentModelResponseRef.current.trim()) {
                                const mt = currentModelResponseRef.current.trim();
                                const cleaned = extractAndUpdateBrief(mt);
                                setMessages(prev => [...prev, { role: 'model', text: cleaned, isVoice: true, timestamp: Date.now() }]);
                                historyRef.current.push({ role: 'model', text: mt });
                                currentModelResponseRef.current = ''; setLiveModelTranscript('');
                            }
                        }
                        const modelParts = message.serverContent?.modelTurn?.parts;
                        const audioData = modelParts?.[0]?.inlineData?.data;
                        if (audioData && audioContextRef.current) {
                            const ctx = audioContextRef.current;
                            const bytes = base64ToBytes(audioData);
                            const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
                            const source = ctx.createBufferSource();
                            source.buffer = buffer; source.connect(ctx.destination);
                            const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            source.start(startTime); nextStartTimeRef.current = startTime + buffer.duration;
                            activeSourcesRef.current.push(source);
                            source.onended = () => { activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source); };
                        }
                    },
                    onclose: () => stopVoiceSession(),
                    onerror: (e: any) => { console.error('[AIWebsiteStudio Voice] Error:', e); },
                },
            });

            resolvedSession = session;
            sessionRef.current = session;

            // Mic setup
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                const source = inputCtx.createMediaStreamSource(stream);
                const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;
                processor.onaudioprocess = (e) => {
                    if (!isConnectedRef.current || !resolvedSession) return;
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcm16 = floatTo16BitPCM(inputData);
                    const base64Data = bytesToBase64(new Uint8Array(pcm16));
                    try { resolvedSession.sendRealtimeInput({ audio: { mimeType: 'audio/pcm;rate=16000', data: base64Data } }); } catch (_err) { /* ignore */ }
                };
                source.connect(processor); processor.connect(inputCtx.destination);
            } catch (micErr) { console.error('[AIWebsiteStudio] Mic error:', micErr); stopVoiceSession(); }
        } catch (error) { console.error('[AIWebsiteStudio] Voice session error:', error); setIsVoiceConnecting(false); }
    }, [buildSystemPrompt, stopVoiceSession, extractAndUpdateBrief]);

    // Cleanup voice on unmount
    useEffect(() => { return () => { stopVoiceSession(); }; }, [stopVoiceSession]);

    // ═════════════════════════════════════════════════════════════════════════
    // WEBSITE GENERATION — Project-First Architecture
    // Flow: Create project → Generate content → Map data → Scan for empty
    //       imageUrl fields → Generate images → Write directly to fields
    // ═════════════════════════════════════════════════════════════════════════

    const startGeneration = useCallback(async () => {
        if (isGeneratingRef.current || !user) return;
        isGeneratingRef.current = true;
        setIsGenerating(true);

        const brief = businessBrief;
        if (isDev) console.log('[AIWebsiteStudio] Starting website generation for:', brief.businessName);

        const addEvent = (type: GenerationEvent['type'], message: string, imageUrl?: string, imageKey?: string) => {
            const event: GenerationEvent = { timestamp: Date.now(), type, message, imageUrl, imageKey };
            setGenerationPhase(prev => prev ? { ...prev, events: [...prev.events, event] } : prev);
        };

        try {
            const isSpanish = i18n.language === 'es';

            // ══════════════════════════════════════════════════════════════════
            // PHASE 1: Create project skeleton (0-5%)
            // ══════════════════════════════════════════════════════════════════
            setGenerationPhase({ phase: 'content', progress: 2, currentStep: 'Creating project...', imagesTotal: 0, imagesCompleted: 0, imagesFailed: 0, events: [{ timestamp: Date.now(), type: 'start', message: `Starting website generation for "${brief.businessName}"` }], generatedImages: [] });

            const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            addEvent('content', 'Creating project...');

            // Build theme from brief
            const theme = {
                cardBorderRadius: 'md',
                buttonBorderRadius: 'md',
                fontFamilyHeader: brief.fontPairing?.header || 'playfair-display',
                fontFamilyBody: brief.fontPairing?.body || 'inter',
                fontFamilyButton: brief.fontPairing?.button || 'inter',
                fontWeightHeader: 400,
                headingsAllCaps: false,
                buttonsAllCaps: true,
                navLinksAllCaps: false,
                pageBackground: brief.colorPalette.background,
                globalColors: {
                    primary: brief.colorPalette.primary,
                    secondary: brief.colorPalette.secondary,
                    accent: brief.colorPalette.accent,
                    background: brief.colorPalette.background,
                    surface: brief.colorPalette.surface,
                    text: brief.colorPalette.text,
                    textMuted: brief.colorPalette.text + '99',
                    heading: brief.colorPalette.text,
                    border: brief.colorPalette.surface,
                    success: '#7fb069',
                    error: '#c75c5c',
                },
            };

            // Minimal memory skeleton — will be filled with AI content, only saved at the very end
            const skeletonProject = {
                id: projectId,
                name: brief.businessName || 'My Website',
                thumbnailUrl: '',
                status: 'Draft' as const,
                lastUpdated: new Date().toISOString(),
                data: {} as any,
                theme,
                brandIdentity: {
                    name: brief.businessName,
                    industry: brief.industry,
                    targetAudience: 'General',
                    toneOfVoice: 'Professional' as const,
                    coreValues: brief.description?.substring(0, 100) || '',
                    language: isSpanish ? 'Spanish' : 'English',
                },
                componentOrder: brief.suggestedComponents || ['colors', 'typography', 'header', 'hero', 'services', 'features', 'cta', 'footer'],
                sectionVisibility: {} as Record<string, boolean>,
                pages: [] as SitePage[],
                menus: [] as any[],
                generatedWith: 'AI Website Studio',
            };

            const finalProjectId = projectId;
            if (isDev) console.log('[AIWebsiteStudio] In-memory Project initialized with ID:', finalProjectId);

            setGenerationPhase(prev => prev ? { ...prev, progress: 5, currentStep: 'Project created! Generating content...' } : prev);

            // ══════════════════════════════════════════════════════════════════
            // PHASE 2: Generate content with AI (5-35%)
            // ══════════════════════════════════════════════════════════════════
            addEvent('content', 'Generating website structure & content with AI...');

            const contentPrompt = buildContentGenerationPrompt(brief, isSpanish);

            const contentResponse = await generateChatContentViaProxy(
                'ai-website-studio-gen',
                [],
                contentPrompt,
                'Generate complete website JSON data. Return ONLY valid JSON.',
                MODEL_CHAT,
                { temperature: 0.7, thinkingLevel: 'high', maxOutputTokens: 32768 },
                user.uid
            );

            logApiCall({ userId: user.uid, model: MODEL_CHAT, feature: 'ai-website-studio-content', success: true });

            const contentText = extractTextFromResponse(contentResponse) || '{}';
            const websiteData = safeJsonParse(contentText, null);

            if (!websiteData || !websiteData.data) {
                throw new Error('Failed to generate website content — invalid AI response');
            }

            const componentCount = Object.keys(websiteData.data).length;
            addEvent('content', `Content generated — ${componentCount} components created`);
            if (isDev) console.log('[AIWebsiteStudio] Generated components:', Object.keys(websiteData.data));

            // ══════════════════════════════════════════════════════════════════
            // PHASE 3: Map content to components & save project (35-40%)
            // ══════════════════════════════════════════════════════════════════
            setGenerationPhase(prev => prev ? { ...prev, progress: 35, currentStep: 'Mapping content to components...' } : prev);
            addEvent('content', 'Mapping content to components...');

            // Merge AI theme with brief theme
            const finalTheme = websiteData.theme ? { ...theme, ...websiteData.theme, globalColors: { ...theme.globalColors, ...(websiteData.theme.globalColors || {}) } } : theme;

            // Build the data
            const finalData = websiteData.data;

            // Ensure all components have required fields
            ensureComponentCompleteness(finalData, brief, isSpanish);

            // Apply fonts
            applyFontsToComponents(finalData, finalTheme);

            // Apply color mappings
            const globalColors = finalTheme.globalColors;
            const componentColorMappings = generateComponentColorMappings(globalColors);
            for (const [componentId, componentColors] of Object.entries(componentColorMappings)) {
                if (finalData[componentId] && typeof finalData[componentId] === 'object') {
                    finalData[componentId] = { ...finalData[componentId], colors: { ...(finalData[componentId].colors || {}), ...componentColors } };
                }
            }
            if (!finalData.heroWave || typeof finalData.heroWave !== 'object') finalData.heroWave = {} as any;
            finalData.heroWave.gradientColors = generateHeroWaveGradientColors(globalColors);

            // TopBar uses flat fields (backgroundColor, textColor, etc.), not a colors sub-object
            if (finalData.topBar && typeof finalData.topBar === 'object') {
                const tbColors = finalData.topBar.colors || {};
                if (tbColors.background && !finalData.topBar.backgroundColor) finalData.topBar.backgroundColor = tbColors.background;
                if (tbColors.text && !finalData.topBar.textColor) finalData.topBar.textColor = tbColors.text;
                if (tbColors.linkColor && !finalData.topBar.linkColor) finalData.topBar.linkColor = tbColors.linkColor;
                if (tbColors.iconColor && !finalData.topBar.iconColor) finalData.topBar.iconColor = tbColors.iconColor;
                delete finalData.topBar.colors; // TopBar doesn't use colors sub-object
            }

            // Build component order & visibility
            const componentOrder: PageSection[] = websiteData.componentOrder || brief.suggestedComponents || ['colors', 'typography', 'header', 'hero', 'services', 'features', 'cta', 'footer'];
            if (!componentOrder.includes('colors')) componentOrder.unshift('colors');
            if (!componentOrder.includes('typography')) componentOrder.splice(1, 0, 'typography');
            if (!componentOrder.includes('header')) componentOrder.splice(2, 0, 'header');
            if (!componentOrder.includes('footer')) componentOrder.push('footer');

            // Enforce banner right before footer
            const bannerIdx = componentOrder.indexOf('banner');
            if (bannerIdx !== -1) componentOrder.splice(bannerIdx, 1);
            const footerIdx = componentOrder.indexOf('footer');
            if (footerIdx !== -1) {
                componentOrder.splice(footerIdx, 0, 'banner');
            } else {
                componentOrder.push('banner');
            }

            const sectionVisibility = buildVisibility(componentOrder.filter(c => !['colors', 'typography', 'header', 'footer'].includes(c)));

            // Build menus
            const projectMenus = [{
                id: 'main', title: 'Main Menu', handle: 'main-menu', items: [
                    { id: 'nav-1', text: isSpanish ? 'Inicio' : 'Home', href: '/', type: 'section' as const },
                    { id: 'nav-2', text: isSpanish ? 'Servicios' : 'Services', href: '/#services', type: 'section' as const },
                    { id: 'nav-3', text: isSpanish ? 'Nosotros' : 'About', href: '/#about', type: 'section' as const },
                    { id: 'nav-4', text: isSpanish ? 'Contacto' : 'Contact', href: '/#contact', type: 'section' as const },
                ],
            }];

            // Build AI Assistant config
            const chatbotGlobalColors: GlobalColors = {
                primary: globalColors.primary, secondary: globalColors.secondary,
                accent: globalColors.accent, background: globalColors.background,
                surface: globalColors.surface, text: globalColors.text, border: globalColors.border,
            };
            const aiAssistantConfig = generateAiAssistantConfig({
                businessName: brief.businessName, industry: brief.industry,
                description: brief.description,
                services: brief.services?.map((s, i) => ({ id: `svc-${i}`, name: s.name, description: s.description, isAIGenerated: true })),
                contactInfo: brief.contactInfo, language: i18n.language,
            } as any, chatbotGlobalColors);

            // Generate pages
            const projectPages: SitePage[] = generatePagesFromLegacyProject(componentOrder, sectionVisibility, finalData);

            // Aggregate content in memory (no images yet) 
            addEvent('save', 'Compiled content in memory...');
            const stateUpdates = {
                data: finalData,
                theme: finalTheme,
                componentOrder,
                sectionVisibility,
                pages: projectPages,
                menus: projectMenus,
                aiAssistantConfig,
                thumbnailUrl: extractHeroImage(finalData, componentOrder) || '',
                lastUpdated: new Date().toISOString(),
            };

            if (isDev) console.log('[AIWebsiteStudio] Project content compiled successfully in-memory');

            setGenerationPhase(prev => prev ? { ...prev, progress: 40, currentStep: 'Content compiled! Scanning for images...' } : prev);

            // ══════════════════════════════════════════════════════════════════
            // PHASE 4: Scan for empty imageUrl fields (40%)
            // ══════════════════════════════════════════════════════════════════
            const imageSlots = collectImageSlots(finalData, brief, componentOrder);
            addEvent('content', `Found ${imageSlots.length} images to generate`);
            if (isDev) console.log('[AIWebsiteStudio] Image slots:', imageSlots.map(s => s.path));

            // ══════════════════════════════════════════════════════════════════
            // PHASE 5: Generate images → Write directly to correct fields (40-95%)
            // ══════════════════════════════════════════════════════════════════
            setGenerationPhase(prev => prev ? { ...prev, phase: 'images', progress: 40, currentStep: 'Generating images...', imagesTotal: imageSlots.length } : prev);

            const DELAY_BETWEEN = 3000;
            const MAX_RETRIES = 2;
            let completed = 0;
            let failed = 0;

            for (let i = 0; i < imageSlots.length; i++) {
                const slot = imageSlots[i];
                const imgProgress = 40 + ((i / imageSlots.length) * 50);
                const slotLabel = slot.path.split('.').pop() || slot.path;

                setGenerationPhase(prev => prev ? {
                    ...prev,
                    progress: imgProgress,
                    currentStep: `Generating image ${i + 1}/${imageSlots.length}: ${slotLabel}`,
                    imagesCompleted: completed,
                    imagesFailed: failed,
                } : prev);

                addEvent('image_start', `Generating: ${slotLabel}...`, undefined, slot.path);

                if (i > 0) await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN));

                // Build context-aware prompt
                const imagePrompt = buildSmartImagePrompt(brief, slot);

                let imageUrl: string | null = null;
                let abortImages = false;
                for (let retry = 0; retry <= MAX_RETRIES; retry++) {
                    try {
                        imageUrl = await generateImage(imagePrompt, {
                            aspectRatio: slot.aspectRatio,
                            style: 'Photorealistic',
                            resolution: '1K',
                            model: MODEL_IMAGE,
                            destination: 'admin',
                            adminCategory: 'template',
                            personGeneration: 'allow_adult',
                            lighting: 'natural golden hour',
                            depthOfField: 'shallow cinematic bokeh',
                            projectId: finalProjectId,
                            referenceImages: referenceImagesRef.current.length > 0 ? referenceImagesRef.current : undefined,
                        });
                        if (imageUrl) break;
                    } catch (err: any) {
                        const errMsg = err?.message || String(err);
                        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('CREDITS_EXHAUSTED') || errMsg.includes('billing')) {
                            console.warn(`[AIWebsiteStudio] Billing limit reached. Aborting image generation.`);
                            addEvent('image_fail', `Billing limit reached. Aborting all remaining images.`);
                            abortImages = true;
                            break;
                        }
                        if (retry < MAX_RETRIES) {
                            addEvent('image_fail', `Retry ${retry + 1}/${MAX_RETRIES} for ${slotLabel}: ${errMsg}`);
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        }
                    }
                }

                if (abortImages) {
                    break;
                }

                if (imageUrl) {
                    // Write directly to the correct field in finalData
                    setNestedValue(finalData, slot.path, imageUrl);
                    completed++;
                    addEvent('image_done', `${slotLabel}`, imageUrl, slot.path);
                    setGenerationPhase(prev => prev ? {
                        ...prev,
                        imagesCompleted: completed,
                        generatedImages: [...prev.generatedImages, { key: slot.path, url: imageUrl! }],
                    } : prev);
                    if (isDev) console.log(`[AIWebsiteStudio] [${i + 1}/${imageSlots.length}] Image set: ${slot.path}`);
                } else {
                    failed++;
                    addEvent('image_fail', `Failed: ${slotLabel} (skipped)`);
                    setGenerationPhase(prev => prev ? { ...prev, imagesFailed: failed } : prev);
                    console.warn(`[AIWebsiteStudio] All retries failed for: ${slot.path}`);
                }
            }

            if (isDev) console.log(`[AIWebsiteStudio] Images: ${completed}/${imageSlots.length} (${failed} failed)`);

            // ══════════════════════════════════════════════════════════════════
            // PHASE 5.5: Propagate hero image as background to glass sections
            // ══════════════════════════════════════════════════════════════════
            const heroImageForBg =
                finalData.hero?.imageUrl
                || finalData.heroSplit?.imageUrl
                || finalData.heroGallery?.slides?.[0]?.backgroundImage
                || finalData.heroWave?.slides?.[0]?.backgroundImage
                || finalData.heroNova?.slides?.[0]?.backgroundImage
                || finalData.heroNeon?.slides?.[0]?.imageUrl
                || '';

            if (heroImageForBg) {
                const glassBgSections = [
                    'features', 'services', 'testimonials', 'pricing', 'faq',
                    'cta', 'leads', 'newsletter', 'video', 'howItWorks',
                ];
                for (const comp of glassBgSections) {
                    if (finalData[comp] && typeof finalData[comp] === 'object' && finalData[comp].glassEffect) {
                        finalData[comp].backgroundImageUrl = heroImageForBg;
                        finalData[comp].backgroundOverlayEnabled = true;
                        finalData[comp].backgroundOverlayOpacity = 75;
                    }
                }
                if (isDev) console.log(`[AIWebsiteStudio] Glass backgrounds set for sections using hero image`);
            }

            // ══════════════════════════════════════════════════════════════════
            // PHASE 6: Final project update with images (95-100%)
            // ══════════════════════════════════════════════════════════════════
            addEvent('save', `Saving final website with ${completed} images...`);
            setGenerationPhase(prev => prev ? { ...prev, phase: 'finalizing', progress: 95, currentStep: 'Saving final website...' } : prev);

            // Build the complete project object
            const fullProject = {
                id: finalProjectId,
                name: brief.businessName || 'My Template',
                thumbnailUrl: extractHeroImage(finalData, componentOrder) || '',
                status: 'Template' as const,
                lastUpdated: new Date().toISOString(),
                data: finalData,
                theme: finalTheme,
                brandIdentity: skeletonProject.brandIdentity,
                componentOrder,
                sectionVisibility,
                pages: projectPages,
                menus: projectMenus,
                aiAssistantConfig: stateUpdates.aiAssistantConfig,
                generatedWith: 'Admin AI Template Studio',
            } as any;

            // Perform single atomic save to Firestore
            try {
                await Promise.race([
                    setDoc(doc(db, 'templates', finalProjectId), fullProject).then(() => refreshProjects()),
                    new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Final save timeout')), 30000)),
                ]);
            } catch (finalSaveErr) {
                console.warn('[AIWebsiteStudio] Final save failed:', finalSaveErr);
                throw new Error('Failed to save the website to the database. Please try again.');
            }

            addEvent('done', 'Website created successfully!');
            setGenerationPhase(prev => prev ? { ...prev, phase: 'done', progress: 100, currentStep: 'Website created successfully!' } : prev);

            if (isDev) console.log('[AIWebsiteStudio] Website created successfully!');

            const successMsg = t('aiWebsiteStudio.generation.success', {
                sections: Object.keys(finalData).length,
                images: completed,
            });
            setMessages(prev => [...prev, { role: 'model', text: successMsg, timestamp: Date.now() }]);

            // ══════════════════════════════════════════════════════════════════
            // AUTO-CLOSE: Close the modal
            // ══════════════════════════════════════════════════════════════════
            setTimeout(() => {
                setGenerationPhase(null);
                if (onSuccess) onSuccess();
            }, 3000);

        } catch (error) {
            console.error('[AIWebsiteStudio] Generation failed:', error);
            setGenerationPhase(null);
            const errorMsg = t('aiWebsiteStudio.generation.error', {
                error: error instanceof Error ? error.message : String(error),
            });
            setMessages(prev => [...prev, { role: 'model', text: errorMsg, timestamp: Date.now() }]);
        } finally {
            isGeneratingRef.current = false;
            setIsGenerating(false);
        }
    }, [businessBrief, user, t, generateImage, refreshProjects, i18n.language, onSuccess]);

    // ═════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═════════════════════════════════════════════════════════════════════════

    // ── Brief editing callbacks ───────────────────────────────────────────────
    const updateBriefColor = useCallback((colorKey: string, newColor: string) => {
        setBusinessBrief(prev => ({
            ...prev,
            colorPalette: { ...prev.colorPalette, [colorKey]: newColor },
        }));
    }, []);

    const updateBriefFont = useCallback((fontKey: 'header' | 'body' | 'button', newFont: string) => {
        setBusinessBrief(prev => ({
            ...prev,
            fontPairing: { ...prev.fontPairing, [fontKey]: newFont },
        }));
    }, []);

    const toggleBriefComponent = useCallback((component: PageSection) => {
        setBusinessBrief(prev => {
            const exists = prev.suggestedComponents.includes(component);
            return {
                ...prev,
                suggestedComponents: exists
                    ? prev.suggestedComponents.filter(c => c !== component)
                    : [...prev.suggestedComponents, component],
            };
        });
    }, []);

    // ── Reference image callbacks ────────────────────────────────────────────
    const addReferenceImage = useCallback((base64: string) => {
        setReferenceImages(prev => {
            if (prev.length >= 14 || prev.includes(base64)) return prev;
            return [...prev, base64];
        });
    }, []);

    const removeReferenceImage = useCallback((index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
    }, []);

    return {
        // Chat
        messages, input, setInput, isThinking,
        chatRef, sendMessage,
        // Voice
        isVoiceActive, isVoiceConnecting,
        liveUserTranscript, liveModelTranscript,
        startVoiceSession, stopVoiceSession,
        // Brief
        businessBrief, updateBriefColor, updateBriefFont, toggleBriefComponent,
        // Reference Images
        referenceImages, addReferenceImage, removeReferenceImage,
        // Generation
        isGenerating, generationPhase, canGenerate, startGeneration,
        // Website extraction
        showUrlModal, setShowUrlModal, isExtracting, extractWebsiteData,
        // Init
        initStudio,
        // Models
        MODEL_CHAT, MODEL_VOICE,
    };
}

// ═════════════════════════════════════════════════════════════════════════════
// IMAGE SLOT DETECTION — Scans component data for empty imageUrl fields
// ═════════════════════════════════════════════════════════════════════════════

interface ImageSlot {
    path: string;           // e.g. "heroGallery.items.0.imageUrl"
    componentType: string;  // e.g. "heroGallery"
    context: string;        // Title/description for smart prompt generation
    aspectRatio: string;    // Based on component type
}

function collectImageSlots(data: any, brief: any, componentOrder: string[]): ImageSlot[] {
    const slots: ImageSlot[] = [];
    if (!data || typeof data !== 'object') return slots;

    // ══════════════════════════════════════════════════════════════════════
    // TOKEN OPTIMIZATION: Only generate images for HERO + BANNER
    // All other components use icons/text only — no AI image generation.
    // ══════════════════════════════════════════════════════════════════════

    // ── Hero variants ─────────────────────────────────────────────────────
    // Standard hero, heroSplit, and heroLead use top-level imageUrl
    for (const heroKey of ['hero', 'heroSplit', 'heroLead']) {
        if (componentOrder.includes(heroKey) && data[heroKey] && typeof data[heroKey] === 'object') {
            if (!data[heroKey].imageUrl) {
                slots.push({
                    path: `${heroKey}.imageUrl`,
                    componentType: heroKey,
                    context: data[heroKey].headline || data[heroKey].title || data[heroKey].subheadline || brief.tagline || brief.businessName,
                    aspectRatio: heroKey === 'heroSplit' ? '4:3' : '16:9',
                });
            }
        }
    }

    // heroNeon uses slides[].imageUrl
    if (componentOrder.includes('heroNeon')) {
        const heroData = data['heroNeon'];
        if (heroData && typeof heroData === 'object') {
            const slides = heroData.slides;
            if (Array.isArray(slides) && slides.length > 0) {
                // Only generate image for the first slide
                if (!slides[0].imageUrl) {
                    slots.push({
                        path: `heroNeon.slides.0.imageUrl`,
                        componentType: 'heroNeon',
                        context: slides[0].headline || slides[0].subheadline || brief.tagline || brief.businessName,
                        aspectRatio: '16:9',
                    });
                }
            } else {
                // No slides array — create one with an empty imageUrl
                data['heroNeon'].slides = [{
                    headline: brief.tagline || brief.businessName,
                    subheadline: brief.description?.substring(0, 80) || '',
                    primaryCta: 'Get Started',
                    primaryCtaLink: '/#services',
                    imageUrl: '',
                }];
                slots.push({
                    path: `heroNeon.slides.0.imageUrl`,
                    componentType: 'heroNeon',
                    context: brief.tagline || brief.businessName,
                    aspectRatio: '16:9',
                });
            }
        }
    }

    // heroWave and heroNova use slides[].backgroundImage (NOT top-level)
    for (const heroKey of ['heroWave', 'heroNova']) {
        if (!componentOrder.includes(heroKey)) continue;
        if (data[heroKey] && typeof data[heroKey] === 'object') {
            const slides = data[heroKey].slides;
            if (Array.isArray(slides) && slides.length > 0) {
                // Only generate image for the first slide (one hero image)
                if (!slides[0].backgroundImage) {
                    slots.push({
                        path: `${heroKey}.slides.0.backgroundImage`,
                        componentType: heroKey,
                        context: slides[0].headline || slides[0].subheadline || brief.tagline || brief.businessName,
                        aspectRatio: '16:9',
                    });
                }
            } else {
                // No slides array — create one with an empty backgroundImage
                data[heroKey].slides = [{
                    headline: brief.tagline || brief.businessName,
                    subheadline: brief.description?.substring(0, 80) || '',
                    primaryCta: 'Get Started',
                    primaryCtaLink: '/#services',
                    backgroundImage: '',
                }];
                slots.push({
                    path: `${heroKey}.slides.0.backgroundImage`,
                    componentType: heroKey,
                    context: brief.tagline || brief.businessName,
                    aspectRatio: '16:9',
                });
            }
        }
    }

    // ── HeroGallery slides ─────────────────────────────────────────────────
    if (componentOrder.includes('heroGallery')) {
        if (data.heroGallery?.slides && Array.isArray(data.heroGallery.slides)) {
            data.heroGallery.slides.forEach((slide: any, i: number) => {
            if (!slide.backgroundImage) {
                slots.push({
                    path: `heroGallery.slides.${i}.backgroundImage`,
                    componentType: 'heroGallery',
                    context: slide.headline || slide.subheadline || `Gallery image ${i + 1} for ${brief.businessName}`,
                    aspectRatio: '16:9',
                });
            }
        });
    } else if (data.heroGallery && !data.heroGallery.slides) {
        data.heroGallery.slides = [
            { backgroundImage: '', headline: brief.tagline || brief.businessName, subheadline: brief.description?.substring(0, 80) || '', primaryCta: 'Explore', primaryCtaLink: '/#services' },
            { backgroundImage: '', headline: brief.services?.[0]?.name || 'Our Services', subheadline: brief.services?.[0]?.description?.substring(0, 80) || '', primaryCta: 'Learn More', primaryCtaLink: '/#features' },
            { backgroundImage: '', headline: brief.services?.[1]?.name || 'Quality & Excellence', subheadline: brief.services?.[1]?.description?.substring(0, 80) || '', primaryCta: 'Contact Us', primaryCtaLink: '/#leads' },
        ];
        data.heroGallery.slides.forEach((slide: any, i: number) => {
            slots.push({
                path: `heroGallery.slides.${i}.backgroundImage`,
                componentType: 'heroGallery',
                context: slide.headline || `Gallery ${i + 1}`,
                aspectRatio: '16:9',
            });
        });
    }
    }

    // ── Banner background image (ultra-wide) ────────────────────────────
    if (componentOrder.includes('banner')) {
        // Force initialize banner if it doesn't exist so we can generate an image for it
        if (!data.banner || typeof data.banner !== 'object') {
            data.banner = {
                headline: brief.tagline || brief.businessName,
                subheadline: brief.description?.substring(0, 80) || '',
                buttonText: 'Get Started',
                backgroundImageUrl: '',
            };
        }
        if (!data.banner.backgroundImageUrl) {
            slots.push({
                path: 'banner.backgroundImageUrl',
                componentType: 'banner',
                context: data.banner.headline || data.banner.subheadline || brief.tagline || brief.businessName,
                aspectRatio: '21:9',
            });
        }
    }

    // ── Features items ─────────────────────────────────────────────────────
    if (componentOrder.includes('features')) {
        if (data.features?.items && Array.isArray(data.features.items)) {
            data.features.items.forEach((item: any, i: number) => {
                if (!item.imageUrl) {
                    slots.push({
                        path: `features.items.${i}.imageUrl`,
                        componentType: 'features',
                        context: item.title || item.description || `Feature image ${i + 1}`,
                        aspectRatio: '4:3',
                    });
                }
            });
        }
    }

    // NOTE: No images for services, menu, testimonials, signupFloat, etc.
    return slots;
}

// ═════════════════════════════════════════════════════════════════════════════
// SMART IMAGE PROMPT — Context-aware prompt generation from component data
// ═════════════════════════════════════════════════════════════════════════════

function buildSmartImagePrompt(brief: BusinessBrief, slot: ImageSlot): string {
    // Location context
    const locationParts: string[] = [];
    if (brief.contactInfo?.city) locationParts.push(brief.contactInfo.city);
    if (brief.contactInfo?.state) locationParts.push(brief.contactInfo.state);
    if (brief.contactInfo?.country) locationParts.push(brief.contactInfo.country);
    const locationStr = locationParts.join(', ') || 'a premium setting';

    // Component-specific instructions
    const typeInstructions: Record<string, string> = {
        hero: `A stunning wide establishing shot for the hero banner. Magazine-cover-worthy, showing the essence of the business. Wide angle, dramatic lighting.`,
        heroSplit: `A side image for a split-hero layout. Should complement the text content. Medium shot, professional.`,
        heroGallery: `A gallery image for a rotating hero carousel. Immersive, full-width, showcasing different aspects of the business.`,
        heroWave: `A hero background with flowing, dynamic composition. Atmospheric, wide angle.`,
        heroNova: `A modern hero image with bold, clean composition. Contemporary feel.`,
        heroLead: `A professional hero background for a lead-capture section. Clean, premium, and trustworthy.`,
        heroNeon: `A vibrant, high-contrast hero background. Perfect for dark mode, with dynamic colors and deep shadows. Cyber, tech, or premium modern feel.`,
        features: `A detail shot representing this specific feature/benefit. Clean composition, focused subject.`,
        services: `A photo showing this service being performed or its result. Action-oriented, professional.`,
        slideshow: `A showcase image for a slideshow. Immersive, high-impact, telling a story.`,
        menu: `Commercial food/product photography. Overhead or 45-degree angle, carefully styled, appetizing.`,
        team: `A professional headshot/portrait. Natural expression, clean background, warm lighting.`,
        portfolio: `A portfolio showcase image demonstrating quality work/results.`,
        cta: `A slightly blurred atmospheric background that works behind text. Moody, ambient.`,
        banner: `A stunning ultra-wide panoramic background image. Cinematic composition, atmospheric depth, dramatic lighting.`,
    };

    const typeInstruction = typeInstructions[slot.componentType] || 'A professional, high-quality image.';

    // Reference image context — user-specified instructions for how to apply reference images
    const refContext = brief.referenceImageContext
        ? `\n\nREFERENCE IMAGE GUIDANCE (from user):\n${brief.referenceImageContext}\nUse the provided reference images as visual guidance following the user's instructions above.`
        : '';

    return `Ultra-realistic editorial commercial photography for a ${brief.industry} business called "${brief.businessName}" located in ${locationStr}.

COMPONENT: ${slot.componentType}
CONTEXT: ${slot.context}
PURPOSE: ${typeInstruction}${refContext}

REQUIREMENTS:
- Shot on a high-end full-frame camera (Sony A7R V or Canon R5)
- Natural golden-hour or soft diffused lighting
- Shallow depth of field with creamy bokeh (f/1.8-f/2.8)
- Color grading: warm/neutral with shadows leaning toward ${brief.colorPalette.primary} tones
- Ultra high-resolution, no noise, no artifacts
- The scene must feel authentic to ${locationStr} — local architecture, vegetation, demographics
- Subtly incorporate brand colors (${brief.colorPalette.primary}, ${brief.colorPalette.accent}) through props, environment, or color grading
- Professional, premium, aspirational mood
- NO text, watermarks, logos, or UI elements
- Professional composition using rule of thirds or centered symmetry
- STRICT RULE: Generate exactly ONE SINGLE PHOTOGRAPH in the frame. DO NOT generate collages, split-screens, or multiple images stitched together.`;
}

// ═════════════════════════════════════════════════════════════════════════════
// UTILITY: Set a nested value in an object using a dot-path with array indices
// e.g. "heroGallery.items.0.imageUrl" → data.heroGallery.items[0].imageUrl
// ═════════════════════════════════════════════════════════════════════════════

function setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const index = Number(part);
        if (!isNaN(index)) {
            if (!current[index]) current[index] = {};
            current = current[index];
        } else {
            if (!current[part]) current[part] = {};
            current = current[part];
        }
    }
    const lastPart = parts[parts.length - 1];
    const lastIndex = Number(lastPart);
    if (!isNaN(lastIndex)) {
        current[lastIndex] = value;
    } else {
        current[lastPart] = value;
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: Build content generation prompt (IMPROVED)
// ═════════════════════════════════════════════════════════════════════════════

function buildContentGenerationPrompt(brief: BusinessBrief, isSpanish: boolean): string {
    const lang = isSpanish ? 'Spanish' : 'English';
    // Removed old topBar contact info mapping. The topBar will now be generated by the AI as an announcement bar.

    // Filter out excluded components from generation
    const EXCLUDED_COMPONENTS = ['slideshow', 'portfolio', 'team'];

    // Default to a rich set of components if suggestedComponents is somehow empty
    const baseComponents = (brief.suggestedComponents && brief.suggestedComponents.length > 0)
        ? brief.suggestedComponents
        : ['hero', 'services', 'features', 'testimonials', 'faq', 'cta', 'banner', 'footer'];

    let filteredComponents = baseComponents.filter(c => !EXCLUDED_COMPONENTS.includes(c));
    
    // Ensure at least one hero variant is always present
    const hasAnyHero = filteredComponents.some(c => c.startsWith('hero'));
    if (!hasAnyHero) {
        filteredComponents.unshift('hero');
    }
    
    // Ensure banner is always present
    if (!filteredComponents.includes('banner')) {
        filteredComponents.push('banner');
    }

    const hasHeroGallery = filteredComponents.includes('heroGallery');
    const hasMenu = filteredComponents.includes('menu');

    let componentExamples = '';
    const safeStr = (str: string | undefined | null) => (str || '').replace(/"/g, '\\"').replace(/\n/g, '\\n');

    componentExamples += `
    "topBar": {
      "messages": [
        {"text": "[GENERATE_TEXT]", "icon": "megaphone", "link": "/#features", "linkText": "${isSpanish ? 'Ver Detalles' : 'See Details'}"},
        {"text": "[GENERATE_TEXT]", "icon": "star", "link": "/#services", "linkText": "${isSpanish ? 'Más Info' : 'More Info'}"}
      ],
      "scrollEnabled": true,
      "showSocialLinks": true,
      "aboveHeader": true,
      "socialLinks": { "facebook": "", "instagram": "", "whatsapp": "${safeStr(brief.contactInfo?.phone || '')}" }
    },`;
    // Build nav links dynamically based on which components are actually enabled
    const navLinkMap: Record<string, { es: string; en: string; href: string }> = {
        services:     { es: 'Servicios',       en: 'Services',      href: '/#services' },
        features:     { es: 'Características',  en: 'Features',      href: '/#features' },
        menu:         { es: 'Menú',             en: 'Menu',          href: '/#menu' },
        testimonials: { es: 'Testimonios',      en: 'Testimonials',  href: '/#testimonials' },
        team:         { es: 'Equipo',           en: 'Team',          href: '/#team' },
        pricing:      { es: 'Precios',          en: 'Pricing',       href: '/#pricing' },
        portfolio:    { es: 'Portafolio',       en: 'Portfolio',     href: '/#portfolio' },
        faq:          { es: 'FAQ',              en: 'FAQ',           href: '/#faq' },
        leads:        { es: 'Contacto',         en: 'Contact',       href: '/#leads' },
        realEstateListings: { es: 'Listados',   en: 'Listings',      href: '/#realEstateListings' },
        map:          { es: 'Ubicación',        en: 'Location',      href: '/#map' },
        howItWorks:   { es: 'Cómo Funciona',    en: 'How it Works',  href: '/#how-it-works' },
    };
    const headerLinks = [{ text: isSpanish ? 'Inicio' : 'Home', href: '/' }];
    for (const comp of filteredComponents) {
        const link = navLinkMap[comp];
        if (link) headerLinks.push({ text: isSpanish ? link.es : link.en, href: link.href });
        if (headerLinks.length >= 6) break; // Max 6 nav links
    }


    // Map industry to aesthetically recommended header styles
    const industryLower = (brief.industry || '').toLowerCase();
    let recommendedHeaderStyles: string[];
    
    if (/restaurant|caf[eé]|bar|food|bakery|pizza/i.test(industryLower)) {
        recommendedHeaderStyles = ['transparent-gradient-dark', 'edge-solid', 'sticky-solid'];
    } else if (/tech|saas|startup|software|app/i.test(industryLower)) {
        recommendedHeaderStyles = ['floating-glass', 'floating-pill', 'transparent-blur'];
    } else if (/law|legal|financ|account|consult/i.test(industryLower)) {
        recommendedHeaderStyles = ['edge-minimal', 'sticky-solid', 'edge-bordered'];
    } else if (/beauty|spa|salon|fashion|luxury/i.test(industryLower)) {
        recommendedHeaderStyles = ['transparent-blur', 'floating-shadow', 'transparent-bordered'];
    } else if (/fitness|gym|sport|wellness/i.test(industryLower)) {
        recommendedHeaderStyles = ['sticky-solid', 'edge-bordered', 'floating-pill'];
    } else if (/health|medic|dental|clinic|doctor/i.test(industryLower)) {
        recommendedHeaderStyles = ['edge-minimal', 'sticky-solid', 'floating-glass'];
    } else if (/real.?estate|property|architect/i.test(industryLower)) {
        recommendedHeaderStyles = ['transparent-gradient-dark', 'floating-shadow', 'transparent-blur'];
    } else if (/photo|video|creative|design|art/i.test(industryLower)) {
        recommendedHeaderStyles = ['transparent-bordered', 'floating-glass', 'transparent-blur'];
    } else if (/ecommerce|retail|store|shop/i.test(industryLower)) {
        recommendedHeaderStyles = ['sticky-solid', 'edge-solid', 'floating-pill'];
    } else if (/music|entertain|event/i.test(industryLower)) {
        recommendedHeaderStyles = ['transparent-gradient-dark', 'floating-glass', 'transparent-blur'];
    } else if (/education|academy|coach|school/i.test(industryLower)) {
        recommendedHeaderStyles = ['edge-minimal', 'sticky-solid', 'floating-glass'];
    } else if (/construction|home.?service|plumb|electric/i.test(industryLower)) {
        recommendedHeaderStyles = ['sticky-solid', 'edge-solid', 'edge-bordered'];
    } else if (/non.?profit|ngo|foundation|church/i.test(industryLower)) {
        recommendedHeaderStyles = ['edge-minimal', 'sticky-transparent', 'floating-shadow'];
    } else if (/agenc|market|consult/i.test(industryLower)) {
        recommendedHeaderStyles = ['floating-glass', 'floating-pill', 'transparent-bordered'];
    } else {
        recommendedHeaderStyles = ['floating-glass', 'edge-minimal', 'sticky-solid'];
    }

    const allHeaderStyles = 'sticky-solid|sticky-transparent|floating|edge-solid|edge-minimal|edge-bordered|floating-pill|floating-glass|floating-shadow|transparent-blur|transparent-bordered|transparent-gradient|transparent-gradient-dark|tabbed|segmented-pill';

    componentExamples += `
    "header": {
      "style": "[SELECT ONE for ${brief.industry || 'this industry'}. RECOMMENDED: ${recommendedHeaderStyles.join(' or ')}. All options: ${allHeaderStyles}]",
      "layout": "[SELECT: minimal|center|stack|classic]",
      "isSticky": true,
      "height": 95,
      "logoType": "text",
      "logoText": "${safeStr(brief.businessName)}",
      "showCta": true,
      "ctaText": "${isSpanish ? '¡Comienza Ya!' : 'Get Started'}",
      "ctaUrl": "/#leads",
      "colors": {
        "background": "[GENERATE HEX COLOR MATCHING BRAND OR DARK THEME — NEVER use white #ffffff]",
        "text": "#ffffff",
        "buttonBackground": "${brief.colorPalette.accent}",
        "buttonText": "[GENERATE HEX COLOR that strongly contrasts with buttonBackground]",
        "gradientDarkColor": "[IF style IS 'transparent-gradient-dark' THEN generate a DARKER shade of the header background color — NEVER use pure black #000000, ELSE omit]",
        "gradientFadeColor": "[IF style IS 'transparent-gradient' THEN generate a LIGHTER shade of the header background color — NEVER use pure white #ffffff, ELSE omit]"
      },
      "gradientFadeSize": "[IF style IS 'transparent-gradient' OR 'transparent-gradient-dark' THEN SELECT number between 10 and 30 for gradient size, default 15, ELSE omit]",
      "links": ${JSON.stringify(headerLinks)}
    },`;

    const hasHeroLumina = filteredComponents.includes('heroLumina');
    const hasHeroNeon = filteredComponents.includes('heroNeon');
    const hasHeroNova = filteredComponents.includes('heroNova');
    const hasHeroWave = filteredComponents.includes('heroWave');
    const hasHeroSplit = filteredComponents.includes('heroSplit');
    const hasHeroLead = filteredComponents.includes('heroLead');

    if (hasHeroGallery) {
        componentExamples += `
    "heroGallery": {
      "slides": [
        {"headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "primaryCta": "${isSpanish ? 'Explorar' : 'Explore'}", "primaryCtaLink": "/#services", "backgroundImage": ""},
        {"headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "primaryCta": "${isSpanish ? 'Ver Más' : 'Learn More'}", "primaryCtaLink": "/#features", "backgroundImage": ""},
        {"headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "primaryCta": "${isSpanish ? 'Contactar' : 'Contact Us'}", "primaryCtaLink": "/#leads", "backgroundImage": ""}
      ],
      "overlayOpacity": 0.35,
      "showArrows": true,
      "showDots": true
    },`;
    } else if (hasHeroNova) {
        componentExamples += `
    "heroNova": {
      "slides": [
        {"headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "primaryCta": "${isSpanish ? 'Comenzar' : 'Get Started'}", "primaryCtaLink": "/#services", "backgroundImage": ""}
      ],
      "showDisplayText": true,
      "displayText": "${safeStr(brief.businessName)}",
      "overlayOpacity": 0.30
    },`;
    } else if (hasHeroWave) {
        componentExamples += `
    "heroWave": {
      "slides": [
        {"headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "primaryCta": "${isSpanish ? 'Ver Más' : 'Learn More'}", "primaryCtaLink": "/#services", "backgroundImage": ""}
      ],
      "waveShape": "[SELECT: smooth|bubbly|sharp|layered]",
      "textAlign": "[SELECT: left|center|right]"
    },`;
    } else if (hasHeroLead) {
        componentExamples += `
    "heroLead": {
      "headline": "[GENERATE_TEXT]",
      "subheadline": "[GENERATE_TEXT]",
      "badgeText": "[GENERATE_SHORT_TEXT: e.g. 'Free Consultation', 'Limited Offer']",
      "formTitle": "${isSpanish ? 'Solicita tu consulta' : 'Request a Consultation'}",
      "formDescription": "[GENERATE_TEXT: Short description encouraging form submission]",
      "namePlaceholder": "${isSpanish ? 'Tu nombre' : 'Your name'}",
      "emailPlaceholder": "${isSpanish ? 'Tu email' : 'Your email'}",
      "companyPlaceholder": "${isSpanish ? 'Tu empresa' : 'Your company'}",
      "phonePlaceholder": "${isSpanish ? 'Tu teléfono' : 'Your phone'}",
      "messagePlaceholder": "${isSpanish ? '¿Cómo podemos ayudarte?' : 'How can we help you?'}",
      "buttonText": "${isSpanish ? 'Enviar solicitud' : 'Submit Request'}",
      "successMessage": "${isSpanish ? 'Nos pondremos en contacto pronto' : 'We will get back to you soon'}",
      "showCompanyField": true,
      "showPhoneField": true,
      "showMessageField": true,
      "formPosition": "[SELECT: left|right]",
      "overlayOpacity": 60,
      "imageUrl": ""
    },`;
    } else if (hasHeroSplit) {
        componentExamples += `
    "heroSplit": {
      "headline": "[GENERATE_TEXT]",
      "subheadline": "[GENERATE_TEXT]",
      "buttonText": "${isSpanish ? 'Saber Más' : 'Learn More'}",
      "buttonUrl": "/#features",
      "imageUrl": "",
      "imagePosition": "[SELECT: left|right]"
    },`;
    } else if (hasHeroNeon) {
        componentExamples += `
    "heroNeon": {
      "slides": [
        {"headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "primaryCta": "${isSpanish ? 'Comenzar' : 'Get Started'}", "primaryCtaLink": "/#services", "imageUrl": ""}
      ],
      "textPosition": "bottom-left",
      "showTopDots": true,
      "dotColors": ["#FF5F56", "#FFBD2E", "#27C93F"],
      "showNeonLines": true,
      "neonLineStyle": "stacked",
      "neonLinePosition": "top-right",
      "neonLineColors": ["#FF5F56", "#FFBD2E", "#27C93F", "#4A90E2", "#E14EAA"],
      "glowIntensity": 50,
      "colors": {
        "background": "transparent",
        "text": "#ffffff",
        "heading": "#ffffff",
        "neonGlow": "[GENERATE_HEX_COLOR_MATCHING_BRAND]",
        "cardBackground": "rgba(20, 20, 20, 0.8)",
        "buttonBackground": "[GENERATE_HEX_COLOR_MATCHING_BRAND]",
        "buttonText": "#000000"
      }
    },`;
    } else if (hasHeroLumina) {
        componentExamples += `
    "heroLumina": {
      "headline": "[GENERATE_TEXT]",
      "subheadline": "[GENERATE_TEXT]",
      "primaryCta": "${isSpanish ? 'Comenzar' : 'Get Started'}",
      "primaryCtaLink": "/#services",
      "secondaryCta": "${isSpanish ? 'Saber Más' : 'Learn More'}",
      "secondaryCtaLink": "/#features",
      "textLayout": "center",
      "glassEffect": true,
      "luminaAnimation": {
        "enabled": true,
        "colors": ["[GENERATE_HEX_COLOR]", "[GENERATE_HEX_COLOR]"],
        "pulseSpeed": 1.0,
        "interactionStrength": 1.0
      },
      "colors": {
        "panelBackground": "rgba(255, 255, 255, 0.05)",
        "heading": "#ffffff",
        "text": "#e2e8f0",
        "primaryButtonBackground": "[GENERATE_HEX_COLOR]",
        "primaryButtonText": "#ffffff"
      }
    },`;
    } else {
        const heroBaseKey = filteredComponents.find(c => c.startsWith('hero') && !['heroGallery', 'heroWave', 'heroNova', 'heroLead', 'heroSplit'].includes(c)) || 'hero';
        componentExamples += `
    "${heroBaseKey}": {
      "heroVariant": "[SELECT: classic|modern|gradient|cinematic|cinematic-gym|minimal|overlap|verticalSplit|stacked]",
      "headline": "[GENERATE_TEXT]",
      "subheadline": "[GENERATE_TEXT]",
      "primaryCta": "${isSpanish ? 'Comenzar' : 'Get Started'}",
      "secondaryCta": "${isSpanish ? 'Saber Más' : 'Learn More'}",
      "imageUrl": "",
      "overlayOpacity": 0.50
    },`;
    }

    // Services: Always limit to exactly 3 items
    const serviceItems = brief.services.slice(0, 3);
    const serviceItemsStr = serviceItems.length > 0
        ? serviceItems.map(s => `{"title": "${safeStr(s.name)}", "description": "${safeStr(s.description.substring(0, 100))}", "icon": "Star"}`).join(', ')
        : '{"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "icon": "Star"}, {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "icon": "Zap"}, {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "icon": "Heart"}';

    componentExamples += `
    "${filteredComponents.find(c => c.startsWith('services')) || 'services'}": {
      "servicesVariant": "[SELECT: cards|grid|minimal]",
      "title": "${isSpanish ? 'Nuestros Servicios' : 'Our Services'}",
      "cornerGradient": {"enabled": true, "position": "[SELECT: none|top-left|top-right|bottom-left|bottom-right]", "color": "${brief.colorPalette.accent}", "opacity": 10, "size": 40},
      "items": [${serviceItemsStr}]
    },`;

    componentExamples += `
`;

    const featuresKey = filteredComponents.find(c => c.startsWith('features')) || 'features';
    if (hasHeroNeon && featuresKey === 'featuresNeon') {
        componentExamples += `
    "featuresNeon": {
      "headline": "${isSpanish ? 'Características' : 'Features'}",
      "subheadline": "[GENERATE_TEXT]",
      "glassEffect": true,
      "glowIntensity": 50,
      "showTopDots": true,
      "showBackgroundGrid": true,
      "colors": { "background": "${brief.colorPalette.background}", "heading": "#ffffff", "text": "#a1a1aa", "cardBackground": "#141414", "neonGlow": "${brief.colorPalette.accent}" },
      "features": [
        {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "imageUrl": ""},
        {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "imageUrl": ""},
        {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "imageUrl": ""},
        {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "imageUrl": ""}
      ]
    },`;
    } else if (hasHeroLumina && featuresKey === 'featuresLumina') {
        componentExamples += `
    "featuresLumina": {
      "headline": "${isSpanish ? 'Características' : 'Features'}",
      "subheadline": "[GENERATE_TEXT]",
      "glassEffect": true,
      "luminaAnimation": { "enabled": true, "colors": ["${brief.colorPalette.primary}", "${brief.colorPalette.secondary}"], "pulseSpeed": 1.0, "interactionStrength": 1.0 },
      "colors": { "background": "${brief.colorPalette.background}", "heading": "#ffffff", "text": "#e2e8f0", "panelBackground": "rgba(255, 255, 255, 0.05)" },
      "features": [
        {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "icon": "Award", "image": ""},
        {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "icon": "Heart", "image": ""},
        {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "icon": "CheckCircle", "image": ""},
        {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "icon": "Star", "image": ""}
      ]
    },`;
    } else {
        componentExamples += `
    "${featuresKey}": {
      "featuresVariant": "[SELECT: classic|modern|bento-premium|bento-overlay|image-overlay]",
      "gridColumns": "[IF featuresVariant IS 'image-overlay' THEN select 4 ELSE select 2 or 3]",
      "title": "${isSpanish ? 'Características' : 'Features'}",
      "imageHeight": 430,
      "cornerGradient": {"enabled": true, "position": "[SELECT: none|top-left|top-right|bottom-left|bottom-right]", "color": "${brief.colorPalette.primary}", "opacity": 15, "size": 35},
      "items": [
        {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "icon": "Award", "imageUrl": ""},
        {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "icon": "Heart", "imageUrl": ""},
        {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "icon": "CheckCircle", "imageUrl": ""},
        {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "icon": "Star", "imageUrl": ""}
      ]
    },`;
    }

    componentExamples += ``;

    if (hasMenu) {
        componentExamples += `
    "menu": {
      "title": "${isSpanish ? 'Nuestro Menú' : 'Our Menu'}",
      "menuVariant": "text-only",
      "categories": ["${isSpanish ? 'Entradas' : 'Starters'}", "${isSpanish ? 'Platos Principales' : 'Main Courses'}", "${isSpanish ? 'Postres' : 'Desserts'}"],
      "items": [
        {"name": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "price": "$...", "category": "[GENERATE_TEXT]"},
        {"name": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "price": "$...", "category": "[GENERATE_TEXT]"},
        {"name": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "price": "$...", "category": "[GENERATE_TEXT]"},
        {"name": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "price": "$...", "category": "[GENERATE_TEXT]"},
        {"name": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "price": "$...", "category": "[GENERATE_TEXT]"},
        {"name": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "price": "$...", "category": "[GENERATE_TEXT]"}
      ]
    },`;
    }

    // Build full address string for map (must be computed BEFORE the template literal)
    const mapAddressParts: string[] = [];
    if (brief.contactInfo?.address) mapAddressParts.push(safeStr(brief.contactInfo.address));
    if (brief.contactInfo?.city) mapAddressParts.push(safeStr(brief.contactInfo.city));
    if (brief.contactInfo?.state) mapAddressParts.push(safeStr(brief.contactInfo.state));
    if (brief.contactInfo?.country) mapAddressParts.push(safeStr(brief.contactInfo.country));
    const fullMapAddress = mapAddressParts.join(', ') || 'Business Address';

    componentExamples += `
    "${filteredComponents.find(c => c.startsWith('howItWorks')) || 'howItWorks'}": {"title": "${isSpanish ? 'Cómo Funciona' : 'How It Works'}", "description": "[GENERATE_TEXT]", "steps": 3, "items": [{"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "icon": "magic-wand"}, {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "icon": "process"}, {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "icon": "check"}]},
    "${filteredComponents.find(c => c.startsWith('leads')) || 'leads'}": {"leadsVariant": "[SELECT: classic|split-gradient|floating-glass|minimal-border]", "title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "cornerGradient": {"enabled": true, "position": "[SELECT: none|top-left|top-right|bottom-left|bottom-right]", "color": "${brief.colorPalette.primary}", "opacity": 20, "size": 50}, "buttonText": "[GENERATE_TEXT]", "fields": [{"label": "${isSpanish ? 'Nombre' : 'Name'}", "type": "text", "placeholder": "[GENERATE_TEXT]"}, {"label": "Email", "type": "email", "placeholder": "[GENERATE_TEXT]"}]},`;

    const testimonialsKey = filteredComponents.find(c => c.startsWith('testimonials')) || 'testimonials';
    if (hasHeroNeon && testimonialsKey === 'testimonialsNeon') {
        componentExamples += `
    "testimonialsNeon": {"headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "glassEffect": true, "showNeonLines": true, "glowIntensity": 50, "colors": {"background": "${brief.colorPalette.background}", "cardBackground": "#141414", "neonGlow": "${brief.colorPalette.accent}"}, "testimonials": [{"quote": "[GENERATE_TEXT]", "author": "[GENERATE_TEXT]", "role": "[GENERATE_TEXT]"}, {"quote": "[GENERATE_TEXT]", "author": "[GENERATE_TEXT]", "role": "[GENERATE_TEXT]"}]},`;
    } else if (hasHeroLumina && testimonialsKey === 'testimonialsLumina') {
        componentExamples += `
    "testimonialsLumina": {"headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "glassEffect": true, "luminaAnimation": {"enabled": true}, "testimonials": [{"quote": "[GENERATE_TEXT]", "authorName": "[GENERATE_TEXT]", "authorRole": "[GENERATE_TEXT]"}, {"quote": "[GENERATE_TEXT]", "authorName": "[GENERATE_TEXT]", "authorRole": "[GENERATE_TEXT]"}]},`;
    } else {
        componentExamples += `
    "${testimonialsKey}": {"testimonialsVariant": "[SELECT: classic|minimal-cards|glassmorphism|gradient-glow|neon-border|floating-cards|gradient-shift]", "title": "[GENERATE_TEXT]", "cornerGradient": {"enabled": true, "position": "[SELECT: none|top-left|top-right|bottom-left|bottom-right]", "color": "${brief.colorPalette.secondary}", "opacity": 10, "size": 40}, "items": [{"quote": "[GENERATE_TEXT]", "name": "[GENERATE_TEXT]", "title": "[GENERATE_TEXT]"}, {"quote": "[GENERATE_TEXT]", "name": "[GENERATE_TEXT]", "title": "[GENERATE_TEXT]"}, {"quote": "[GENERATE_TEXT]", "name": "[GENERATE_TEXT]", "title": "[GENERATE_TEXT]"}]},`;
    }

    const faqKey = filteredComponents.find(c => c.startsWith('faq')) || 'faq';
    if (hasHeroNeon && faqKey === 'faqNeon') {
        componentExamples += `
    "faqNeon": {"headline": "FAQ", "subheadline": "[GENERATE_TEXT]", "glassEffect": true, "glowIntensity": 50, "colors": {"background": "${brief.colorPalette.background}", "cardBackground": "#141414", "neonGlow": "${brief.colorPalette.accent}"}, "faqs": [{"question": "[GENERATE_TEXT]", "answer": "[GENERATE_TEXT]"}, {"question": "[GENERATE_TEXT]", "answer": "[GENERATE_TEXT]"}]},`;
    } else if (hasHeroLumina && faqKey === 'faqLumina') {
        componentExamples += `
    "faqLumina": {"headline": "FAQ", "subheadline": "[GENERATE_TEXT]", "glassEffect": true, "luminaAnimation": {"enabled": true}, "faqs": [{"question": "[GENERATE_TEXT]", "answer": "[GENERATE_TEXT]"}, {"question": "[GENERATE_TEXT]", "answer": "[GENERATE_TEXT]"}]},`;
    } else {
        componentExamples += `
    "${faqKey}": {"faqVariant": "[SELECT: classic|cards|gradient|minimal]", "title": "[GENERATE_TEXT]", "cornerGradient": {"enabled": true, "position": "[SELECT: none|top-left|top-right|bottom-left|bottom-right]", "color": "${brief.colorPalette.accent}", "opacity": 15, "size": 30}, "items": [{"question": "[GENERATE_TEXT]", "answer": "[GENERATE_TEXT]"}, {"question": "[GENERATE_TEXT]", "answer": "[GENERATE_TEXT]"}]},`;
    }

    const ctaKey = filteredComponents.find(c => c.startsWith('cta')) || 'cta';
    if (hasHeroNeon && ctaKey === 'ctaNeon') {
        componentExamples += `
    "ctaNeon": {"headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "primaryCta": "[GENERATE_TEXT]", "secondaryCta": "[GENERATE_TEXT]", "glassEffect": true, "glowIntensity": 50, "colors": {"background": "${brief.colorPalette.background}", "cardBackground": "#141414", "neonGlow": "${brief.colorPalette.accent}"}},`;
    } else if (hasHeroLumina && ctaKey === 'ctaLumina') {
        componentExamples += `
    "ctaLumina": {"headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "primaryCta": "[GENERATE_TEXT]", "secondaryCta": "[GENERATE_TEXT]", "glassEffect": true, "luminaAnimation": {"enabled": true}},`;
    } else {
        componentExamples += `
    "${ctaKey}": {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "buttonText": "[GENERATE_TEXT]", "secondaryText": "[GENERATE_TEXT]"},`;
    }

    const portfolioKey = filteredComponents.find(c => c.startsWith('portfolio')) || 'portfolio';
    if (hasHeroNeon && portfolioKey === 'portfolioNeon') {
        componentExamples += `
    "portfolioNeon": {"headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "glassEffect": true, "glowIntensity": 50, "projects": [{"title": "[GENERATE_TEXT]", "category": "[GENERATE_TEXT]", "imageUrl": ""}, {"title": "[GENERATE_TEXT]", "category": "[GENERATE_TEXT]", "imageUrl": ""}]},`;
    } else if (hasHeroLumina && portfolioKey === 'portfolioLumina') {
        componentExamples += `
    "portfolioLumina": {"headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "glassEffect": true, "projects": [{"title": "[GENERATE_TEXT]", "category": "[GENERATE_TEXT]", "imageUrl": ""}, {"title": "[GENERATE_TEXT]", "category": "[GENERATE_TEXT]", "imageUrl": ""}]},`;
    } else {
        componentExamples += `
    "${portfolioKey}": {"title": "[GENERATE_TEXT]", "projects": [{"title": "[GENERATE_TEXT]", "category": "[GENERATE_TEXT]", "imageUrl": ""}]},`;
    }

    const pricingKey = filteredComponents.find(c => c.startsWith('pricing')) || 'pricing';
    if (hasHeroNeon && pricingKey === 'pricingNeon') {
        componentExamples += `
    "pricingNeon": {"headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "glassEffect": true, "glowIntensity": 50, "tiers": [{"name": "[GENERATE_TEXT]", "price": "$...", "period": "/mo", "description": "[GENERATE_TEXT]", "features": ["[GENERATE_TEXT]"], "isPopular": true, "buttonText": "[GENERATE_TEXT]"}]},`;
    } else if (hasHeroLumina && pricingKey === 'pricingLumina') {
        componentExamples += `
    "pricingLumina": {"headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "glassEffect": true, "luminaAnimation": {"enabled": true}, "tiers": [{"name": "[GENERATE_TEXT]", "price": "$...", "period": "/mo", "description": "[GENERATE_TEXT]", "features": ["[GENERATE_TEXT]"], "isPopular": true, "buttonText": "[GENERATE_TEXT]"}]},`;
    } else {
        componentExamples += `
    "${pricingKey}": {"title": "[GENERATE_TEXT]", "tiers": [{"name": "[GENERATE_TEXT]", "price": "$...", "features": ["[GENERATE_TEXT]"], "isPopular": true}]},`;
    }

    componentExamples += `
    "realEstateListings": {"title": "${isSpanish ? 'Propiedades destacadas' : 'Featured properties'}", "subtitle": "[GENERATE_TEXT]", "buttonText": "${isSpanish ? 'Solicitar información' : 'Request information'}", "buttonLink": "#leads", "maxItems": 6, "featuredOnly": false, "showPrice": true, "showLocation": true, "showStats": true, "showDescription": true, "colors": {"background": "${brief.colorPalette.background}", "heading": "${brief.colorPalette.text}", "text": "${brief.colorPalette.text}", "textMuted": "${brief.colorPalette.text}99", "accent": "${brief.colorPalette.primary}", "cardBackground": "${brief.colorPalette.surface}", "border": "${brief.colorPalette.surface}", "buttonBackground": "${brief.colorPalette.primary}", "buttonText": "#ffffff"}},
    "banner": {"headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "buttonText": "${isSpanish ? 'Ver Más' : 'Learn More'}", "backgroundImageUrl": "", "overlayEnabled": true, "backgroundOverlayOpacity": 50, "height": 400},
    "newsletter": {"title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "buttonText": "[GENERATE_TEXT]"},
        "logoBanner": {"title": "${isSpanish ? 'Confían en nosotros' : 'Trusted By'}", "scrollEnabled": true, "scrollSpeed": 30, "pauseOnHover": true, "grayscale": true, "useGradient": false, "logos": [{"imageUrl": "", "alt": "Logo 1"}, {"imageUrl": "", "alt": "Logo 2"}, {"imageUrl": "", "alt": "Logo 3"}, {"imageUrl": "", "alt": "Logo 4"}, {"imageUrl": "", "alt": "Logo 5"}]},
    "map": {"title": "${isSpanish ? 'Ubicación' : 'Location'}", "description": "${isSpanish ? 'Encuéntranos aquí' : 'Find us here'}", "address": "${fullMapAddress}", "city": "${safeStr(brief.contactInfo?.city || '')}", "state": "${safeStr(brief.contactInfo?.state || '')}", "lat": 0, "lng": 0, "zoom": 15, "mapVariant": "[SELECT: modern|minimal|dark-tech|night]", "height": 400, "phone": "${safeStr(brief.contactInfo?.phone || '')}", "email": "${safeStr(brief.contactInfo?.email || '')}", "businessHours": "${isSpanish ? 'Lun-Vie 9:00-18:00' : 'Mon-Fri 9:00AM-6:00PM'}", "buttonText": "${isSpanish ? 'Cómo Llegar' : 'Get Directions'}"},
    "footer": {"title": "${safeStr(brief.businessName)}", "description": "${isSpanish ? 'Síguenos en nuestras redes' : 'Follow us on social media'}", "linkColumns": [{"title": "Enlaces", "links": [{"text": "Inicio", "url": "/"}, {"text": "Servicios", "url": "/#services"}]}], "contactInfo": {"address": "${safeStr(brief.contactInfo?.address || '')}", "phone": "${safeStr(brief.contactInfo?.phone || '')}", "businessHours": {"monday": {"isOpen": true, "openTime": "09:00", "closeTime": "18:00"}, "tuesday": {"isOpen": true, "openTime": "09:00", "closeTime": "18:00"}, "wednesday": {"isOpen": true, "openTime": "09:00", "closeTime": "18:00"}, "thursday": {"isOpen": true, "openTime": "09:00", "closeTime": "18:00"}, "friday": {"isOpen": true, "openTime": "09:00", "closeTime": "18:00"}}}, "socialLinks": [{"platform": "facebook", "href": "https://facebook.com"}, {"platform": "instagram", "href": "https://instagram.com"}, {"platform": "whatsapp", "href": "https://wa.me/${(brief.contactInfo?.phone || '').replace(/[^0-9]/g, '')}"}]},
    "signupFloat": {"headerText": "[GENERATE_TEXT]", "descriptionText": "[GENERATE_TEXT]", "buttonText": "${isSpanish ? 'Registrarse' : 'Sign Up'}"}`;

    return `You are a professional website designer. Generate a COMPLETE website data structure as a single JSON object.

BUSINESS INFORMATION:
- Name: ${brief.businessName}
- Industry: ${brief.industry}${brief.subIndustry ? ` / ${brief.subIndustry}` : ''}
- Description: ${brief.description}
- Tagline: ${brief.tagline || 'Generate a catchy tagline'}
- Services: ${brief.services.map(s => `${s.name}: ${s.description}`).join('; ') || 'Generate appropriate services'}
- Has E-commerce: ${brief.hasEcommerce}
- Contact: ${JSON.stringify(brief.contactInfo)}

COLOR PALETTE:
- Primary: ${brief.colorPalette.primary}
- Secondary: ${brief.colorPalette.secondary}
- Accent: ${brief.colorPalette.accent}
- Background: ${brief.colorPalette.background}
- Surface: ${brief.colorPalette.surface}
- Text: ${brief.colorPalette.text}

COMPONENTS TO GENERATE: ${filteredComponents.join(', ')}

LANGUAGE: All content MUST be in ${lang}.

OUTPUT FORMAT: Return a single JSON object with this EXACT structure:
{
  "componentOrder": ["colors", "typography", "header", ${filteredComponents.filter(c => !['colors', 'typography', 'header', 'footer', 'banner'].includes(c)).map(c => `"${c}"`).join(', ')}, "banner", "footer"],
  "theme": {
    "cardBorderRadius": "md",
    "buttonBorderRadius": "md",
    "fontFamilyHeader": "${brief.fontPairing?.header || 'playfair-display'}",
    "fontFamilyBody": "${brief.fontPairing?.body || 'inter'}",
    "fontFamilyButton": "${brief.fontPairing?.button || 'inter'}",
    "fontWeightHeader": 400,
    "headingsAllCaps": false,
    "buttonsAllCaps": true,
    "navLinksAllCaps": false,
    "pageBackground": "${brief.colorPalette.background}",
    "globalColors": { "primary": "${brief.colorPalette.primary}", "secondary": "${brief.colorPalette.secondary}", "accent": "${brief.colorPalette.accent}", "background": "${brief.colorPalette.background}", "surface": "${brief.colorPalette.surface}", "text": "${brief.colorPalette.text}", "textMuted": "${brief.colorPalette.text}99", "heading": "${brief.colorPalette.text}", "border": "${brief.colorPalette.surface}", "success": "#7fb069", "error": "#c75c5c" }
  },
  "data": {${componentExamples}
  }
}

CRITICAL RULES:
1. ONLY set imageUrl/backgroundImageUrl to empty string "" for: hero/heroGallery, banner, and features. ALL other components MUST NOT have image fields.
2. Include RICH, detailed, REAL content for EVERY component — no lorem ipsum, no placeholder text.
3. Each component's items array MUST have the correct number of items with full content.
4. For topBar: messages MUST be promotional announcements or call-to-actions (e.g. sales, special discounts, free shipping). NEVER put address or phone numbers here. Use only these icons: megaphone, tag, gift, truck, percent, sparkles, star, zap, heart, flame.
5. For heroGallery: generate exactly 3 slides with real headlines and subheadlines. Each slide must have: headline, subheadline, primaryCta, primaryCtaLink, backgroundImage (empty string).
6. For menu: generate EXACTLY 6 realistic menu items with real names, descriptions, and prices. TEXT ONLY — NO imageUrl or placeholders.
7. For header links: the "href" values MUST point to the actual sections on the page using anchors (e.g. "/#services", "/#features", "/#menu", "/#testimonials", "/#realEstateListings", "/#leads"). Only link to sections that exist in the componentOrder.
8. For features: generate EXACTLY 4 items with specific benefits and icons. Include "imageUrl": "" in each item.
9. For services: generate EXACTLY 3 items. Use the business's ACTUAL services from the brief (max 3). TEXT ONLY — no imageUrl.
10. For testimonials: generate EXACTLY 3 realistic testimonials with names. TEXT ONLY - NO imageUrl or placeholders.
11. For FAQ: generate 5-8 relevant questions and answers.
12. For leads: include proper form fields with labels and placeholders.
13. For footer: Include real contact info inside the 'contactInfo' object. 'linkColumns' is strictly for page navigation links like 'Inicio' or 'Servicios'.
14. For howItWorks: generate EXACTLY 3 steps with titles, descriptions, and valid lucide icons.
15. NEVER include slideshow, portfolio, or team components.
16. For properties marked with [SELECT: a|b|c...], you MUST intelligently choose exactly ONE of the provided options based on what best fits the industry's aesthetic. Do not output the brackets.
17. For header.style: VARY it based on the industry. Examples: restaurants/bars → 'transparent-gradient-dark' or 'edge-solid'; tech/SaaS → 'floating-glass' or 'floating-pill'; fitness/gym → 'sticky-solid' or 'edge-bordered'; luxury/spa → 'transparent-blur' or 'floating-shadow'; professional/corporate → 'edge-minimal' or 'sticky-solid'; creative/portfolio → 'transparent-bordered' or 'floating-glass'. NEVER always pick the same style.
18. For map: use the COMPLETE address including street, city, state, and country. The address field must contain the full location string.

RESPOND WITH ONLY VALID JSON. NO MARKDOWN, NO BACKTICKS, NO EXPLANATION.`;
}

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: Ensure all components have required fields filled
// ═════════════════════════════════════════════════════════════════════════════

function ensureComponentCompleteness(data: any, brief: any, isSpanish: boolean): void {
    if (!data || typeof data !== 'object') return;

    // Header defaults
    if (data.header && typeof data.header === 'object') {
        if (!data.header.logoText) data.header.logoText = brief.businessName || 'My Business';
        if (!data.header.logoType) data.header.logoType = 'text';
        if (!data.header.style) data.header.style = 'floating-glass';
        if (!data.header.layout) data.header.layout = 'minimal';
        if (data.header.isSticky === undefined) data.header.isSticky = true;

        // Enforce white text for navigation
        if (!data.header.colors) data.header.colors = {};
        data.header.colors.text = '#ffffff';

        // Normalize: AI may generate 'navLinks' but HeaderData uses 'links'
        if (data.header.navLinks && !data.header.links) {
            data.header.links = data.header.navLinks;
            delete data.header.navLinks;
        }

        // ── FORCE: Build nav links from actual componentOrder ──
        // The AI often omits or generates incorrect links.
        // We deterministically build them from enabled components.
        const componentOrder: string[] = data.componentOrder || [];
        const navLinkMap: Record<string, { es: string; en: string; href: string }> = {
            services:     { es: 'Servicios',       en: 'Services',      href: '/#services' },
            features:     { es: 'Características',  en: 'Features',      href: '/#features' },
            menu:         { es: 'Menú',             en: 'Menu',          href: '/#menu' },
            testimonials: { es: 'Testimonios',      en: 'Testimonials',  href: '/#testimonials' },
            team:         { es: 'Equipo',           en: 'Team',          href: '/#team' },
            pricing:      { es: 'Precios',          en: 'Pricing',       href: '/#pricing' },
            portfolio:    { es: 'Portafolio',       en: 'Portfolio',     href: '/#portfolio' },
            faq:          { es: 'FAQ',              en: 'FAQ',           href: '/#faq' },
            leads:        { es: 'Contacto',         en: 'Contact',       href: '/#leads' },
            realEstateListings: { es: 'Listados',   en: 'Listings',      href: '/#realEstateListings' },
            map:          { es: 'Ubicación',        en: 'Location',      href: '/#map' },
            howItWorks:   { es: 'Cómo Funciona',    en: 'How it Works',  href: '/#how-it-works' },
        };
        const forcedLinks: Array<{ text: string; href: string }> = [
            { text: isSpanish ? 'Inicio' : 'Home', href: '/' },
        ];
        for (const comp of componentOrder) {
            const entry = navLinkMap[comp];
            if (entry) {
                forcedLinks.push({ text: isSpanish ? entry.es : entry.en, href: entry.href });
            }
            if (forcedLinks.length >= 6) break; // Max 6 nav links
        }
        // Only override if we built meaningful links (more than just "Home")
        if (forcedLinks.length > 1) {
            data.header.links = forcedLinks;
        }
    }

    // TopBar: ensure aboveHeader is true so it renders above the Header, not in the component loop
    if (data.topBar && typeof data.topBar === 'object') {
        if (data.topBar.aboveHeader === undefined) data.topBar.aboveHeader = true;
        if (data.topBar.scrollEnabled === undefined) data.topBar.scrollEnabled = true;
        if (data.topBar.pauseOnHover === undefined) data.topBar.pauseOnHover = true;
    }

    // Hero defaults
    // Standard hero variants: use headline/subheadline/primaryCta (matching HeroData)
    const heroKeys = Object.keys(data).filter(k => k.startsWith('hero'));
    for (const heroKey of heroKeys) {
        const hero = data[heroKey];
        if (hero && typeof hero === 'object') {
            // Normalize: if AI used title/subtitle, convert to headline/subheadline
            if (hero.title && !hero.headline) { hero.headline = hero.title; delete hero.title; }
            if (hero.subtitle && !hero.subheadline) { hero.subheadline = hero.subtitle; delete hero.subtitle; }
            if (hero.primaryCtaText && !hero.primaryCta) { hero.primaryCta = hero.primaryCtaText; delete hero.primaryCtaText; }
            if (hero.buttonText && !hero.primaryCta) { hero.primaryCta = hero.buttonText; }
            // Hero uses imageUrl for background; if AI sent backgroundImage, map it
            if (heroKey === 'hero' && hero.backgroundImage && !hero.imageUrl) {
                hero.imageUrl = hero.backgroundImage;
                delete hero.backgroundImage;
            }
            // Set defaults if still missing
            if (!hero.headline) hero.headline = brief.tagline || brief.businessName || '';
            if (!hero.subheadline) hero.subheadline = brief.description?.substring(0, 150) || '';
            if (!hero.primaryCta) hero.primaryCta = isSpanish ? 'Comenzar' : 'Get Started';
            if (!hero.secondaryCta) hero.secondaryCta = isSpanish ? 'Saber Más' : 'Learn More';
            if (hero.overlayOpacity === undefined) hero.overlayOpacity = 0.50;
            // Normalize: if AI sent integer (e.g. 30) instead of decimal (0.30), convert
            if (hero.overlayOpacity > 1) hero.overlayOpacity = hero.overlayOpacity / 100;
        }
    }

    // HeroGallery: uses slides array with headline/subheadline/backgroundImage (matching HeroGalleryData)
    if (data.heroGallery && typeof data.heroGallery === 'object') {
        // Normalize: if AI generated 'items' instead of 'slides', fix it
        if (data.heroGallery.items && !data.heroGallery.slides) {
            data.heroGallery.slides = data.heroGallery.items.map((item: any) => ({
                headline: item.headline || item.title || '',
                subheadline: item.subheadline || item.subtitle || '',
                primaryCta: item.primaryCta || item.buttonText || (isSpanish ? 'Explorar' : 'Explore'),
                primaryCtaLink: item.primaryCtaLink || '/#services',
                backgroundImage: item.backgroundImage || item.imageUrl || '',
            }));
            delete data.heroGallery.items;
        }
        // Normalize individual slide fields
        if (data.heroGallery.slides && Array.isArray(data.heroGallery.slides)) {
            data.heroGallery.slides.forEach((slide: any) => {
                if (slide.title && !slide.headline) { slide.headline = slide.title; delete slide.title; }
                if (slide.subtitle && !slide.subheadline) { slide.subheadline = slide.subtitle; delete slide.subtitle; }
                if (slide.imageUrl && !slide.backgroundImage) { slide.backgroundImage = slide.imageUrl; delete slide.imageUrl; }
                if (!slide.primaryCta) slide.primaryCta = isSpanish ? 'Explorar' : 'Explore';
                if (!slide.primaryCtaLink) slide.primaryCtaLink = '/#services';
            });
        }
        // Create default slides if none exist
        if (!data.heroGallery.slides || !Array.isArray(data.heroGallery.slides) || data.heroGallery.slides.length === 0) {
            data.heroGallery.slides = [
                { headline: brief.tagline || brief.businessName, subheadline: brief.description?.substring(0, 80) || '', primaryCta: isSpanish ? 'Explorar' : 'Explore', primaryCtaLink: '/#services', backgroundImage: '' },
                { headline: brief.services?.[0]?.name || (isSpanish ? 'Nuestros Servicios' : 'Our Services'), subheadline: brief.services?.[0]?.description?.substring(0, 80) || '', primaryCta: isSpanish ? 'Ver Más' : 'Learn More', primaryCtaLink: '/#features', backgroundImage: '' },
                { headline: brief.services?.[1]?.name || (isSpanish ? 'Calidad Premium' : 'Premium Quality'), subheadline: brief.services?.[1]?.description?.substring(0, 80) || '', primaryCta: isSpanish ? 'Contactar' : 'Contact Us', primaryCtaLink: '/#leads', backgroundImage: '' },
            ];
        }
        if (data.heroGallery.overlayOpacity === undefined) data.heroGallery.overlayOpacity = 0.35;
    }

    // Services defaults
    if (data.services && typeof data.services === 'object') {
        if (!data.services.title) data.services.title = isSpanish ? 'Nuestros Servicios' : 'Our Services';
        if (!data.services.items || !Array.isArray(data.services.items) || data.services.items.length === 0) {
            data.services.items = brief.services?.map((s: any) => ({
                title: s.name, description: s.description, icon: 'Star', imageUrl: '',
            })) || [{ title: isSpanish ? 'Servicio Principal' : 'Main Service', description: brief.description || '', icon: 'Star', imageUrl: '' }];
        }
    }

    // Features defaults
    if (data.features && typeof data.features === 'object') {
        if (!data.features.title) data.features.title = isSpanish ? 'Características' : 'Features';
        if (!data.features.imageHeight) data.features.imageHeight = 430;
        if (!data.features.items || !Array.isArray(data.features.items) || data.features.items.length === 0) {
            data.features.items = [
                { title: isSpanish ? 'Calidad Premium' : 'Premium Quality', description: isSpanish ? 'Ofrecemos la más alta calidad en todos nuestros servicios.' : 'We offer the highest quality across all our services.', icon: 'Award', imageUrl: '' },
                { title: isSpanish ? 'Atención Personalizada' : 'Personalized Attention', description: isSpanish ? 'Cada cliente recibe un trato único y especial.' : 'Every client receives unique and special treatment.', icon: 'Heart', imageUrl: '' },
                { title: isSpanish ? 'Resultados Garantizados' : 'Guaranteed Results', description: isSpanish ? 'Nos comprometemos con resultados excepcionales.' : 'We commit to exceptional results.', icon: 'CheckCircle', imageUrl: '' },
                { title: isSpanish ? 'Innovación Constante' : 'Constant Innovation', description: isSpanish ? 'Siempre a la vanguardia con las últimas tendencias y tecnologías.' : 'Always at the forefront with the latest trends and technologies.', icon: 'Star', imageUrl: '' },
            ];
        }
    }

    // Testimonials defaults
    if (data.testimonials && typeof data.testimonials === 'object') {
        if (!data.testimonials.title) data.testimonials.title = isSpanish ? 'Lo Que Dicen Nuestros Clientes' : 'What Our Clients Say';
        if (!data.testimonials.items || !Array.isArray(data.testimonials.items) || data.testimonials.items.length === 0) {
            data.testimonials.items = [
                { quote: isSpanish ? 'Excelente servicio, superó mis expectativas.' : 'Excellent service, exceeded my expectations.', name: 'María García', title: isSpanish ? 'Cliente' : 'Client' },
                { quote: isSpanish ? 'Profesionales de primera. Muy recomendados.' : 'Top-notch professionals. Highly recommended.', name: 'Carlos López', title: isSpanish ? 'Empresario' : 'Entrepreneur' },
            ];
        }
    }

    // FAQ defaults
    if (data.faq && typeof data.faq === 'object') {
        if (!data.faq.title) data.faq.title = isSpanish ? 'Preguntas Frecuentes' : 'Frequently Asked Questions';
        if (!data.faq.items || !Array.isArray(data.faq.items) || data.faq.items.length === 0) {
            data.faq.items = [
                { question: isSpanish ? '¿Cómo puedo contactarlos?' : 'How can I contact you?', answer: isSpanish ? `Puede contactarnos a través de ${brief.contactInfo?.email || 'nuestro formulario de contacto'}.` : `You can reach us at ${brief.contactInfo?.email || 'our contact form'}.` },
            ];
        }
    }

    // CTA defaults
    if (data.cta && typeof data.cta === 'object') {
        if (!data.cta.title) data.cta.title = isSpanish ? '¿Listo para Comenzar?' : 'Ready to Get Started?';
        if (!data.cta.description) data.cta.description = brief.description?.substring(0, 120) || '';
        if (!data.cta.buttonText) data.cta.buttonText = isSpanish ? 'Contáctanos' : 'Contact Us';
    }

    // --- Neon & Lumina Completeness Fallbacks ---
    const neonLuminaKeys = [
        'featuresNeon', 'featuresLumina',
        'ctaNeon', 'ctaLumina',
        'portfolioNeon', 'portfolioLumina',
        'pricingNeon', 'pricingLumina',
        'testimonialsNeon', 'testimonialsLumina',
        'faqNeon', 'faqLumina'
    ];
    
    neonLuminaKeys.forEach(key => {
        if (data[key] && typeof data[key] === 'object') {
            if (!data[key].headline) data[key].headline = key.replace(/Neon|Lumina/, '');
            
            // Fix arrays
            if (key.startsWith('features') && (!data[key].features || !Array.isArray(data[key].features))) {
                data[key].features = data[key].items || [
                    { title: 'Feature 1', description: 'Description 1' },
                    { title: 'Feature 2', description: 'Description 2' }
                ];
            }
            if (key.startsWith('portfolio') && (!data[key].projects || !Array.isArray(data[key].projects))) {
                data[key].projects = data[key].items || [
                    { title: 'Project 1', category: 'Category' }
                ];
            }
            if (key.startsWith('pricing') && (!data[key].tiers || !Array.isArray(data[key].tiers))) {
                data[key].tiers = data[key].items || [
                    { name: 'Basic', price: '$10', features: ['Feature 1'] }
                ];
            }
            if (key.startsWith('testimonials') && (!data[key].testimonials || !Array.isArray(data[key].testimonials))) {
                data[key].testimonials = data[key].items || [
                    { quote: 'Great!', author: 'John Doe', authorName: 'John Doe', role: 'CEO', authorRole: 'CEO' }
                ];
            }
            if (key.startsWith('faq') && (!data[key].faqs || !Array.isArray(data[key].faqs))) {
                data[key].faqs = data[key].items || [
                    { question: 'Question?', answer: 'Answer.' }
                ];
            }
        }
    });

    // LogoBanner defaults
    if (data.logoBanner && typeof data.logoBanner === 'object') {
        if (!data.logoBanner.logos || !Array.isArray(data.logoBanner.logos) || data.logoBanner.logos.length === 0) {
            data.logoBanner.logos = [
                { imageUrl: '', alt: 'Logo 1' },
                { imageUrl: '', alt: 'Logo 2' },
                { imageUrl: '', alt: 'Logo 3' },
                { imageUrl: '', alt: 'Logo 4' }
            ];
        }
    }

    // Footer defaults
    if (data.footer && typeof data.footer === 'object') {
        if (!data.footer.title) data.footer.title = brief.businessName || '';
        if (!data.footer.description) data.footer.description = brief.description?.substring(0, 200) || '';
    }

    // Leads / Newsletter defaults
    if (data.leads && typeof data.leads === 'object') {
        if (!data.leads.title) data.leads.title = isSpanish ? 'Contáctanos' : 'Contact Us';
        if (!data.leads.buttonText) data.leads.buttonText = isSpanish ? 'Enviar' : 'Send';
    }
    if (data.newsletter && typeof data.newsletter === 'object') {
        if (!data.newsletter.title) data.newsletter.title = isSpanish ? 'Suscríbete' : 'Subscribe';
        if (!data.newsletter.buttonText) data.newsletter.buttonText = isSpanish ? 'Suscribirse' : 'Subscribe';
    }

    // Map defaults — populate ALL contact info from the brief
    if (data.map && typeof data.map === 'object') {
        if (!data.map.title) data.map.title = isSpanish ? 'Ubicación' : 'Location';
        if (!data.map.address && brief.contactInfo?.address) {
            const parts: string[] = [];
            if (brief.contactInfo.address) parts.push(brief.contactInfo.address);
            if (brief.contactInfo.city) parts.push(brief.contactInfo.city);
            if (brief.contactInfo.state) parts.push(brief.contactInfo.state);
            if (brief.contactInfo.country) parts.push(brief.contactInfo.country);
            data.map.address = parts.join(', ');
        }
        if (!data.map.phone && brief.contactInfo?.phone) data.map.phone = brief.contactInfo.phone;
        if (!data.map.email && brief.contactInfo?.email) data.map.email = brief.contactInfo.email;
        if (!data.map.businessHours && brief.contactInfo?.businessHours) data.map.businessHours = brief.contactInfo.businessHours;
        if (!data.map.businessHours && !brief.contactInfo?.businessHours) {
            data.map.businessHours = isSpanish ? 'Lun-Vie 9:00-18:00' : 'Mon-Fri 9:00AM-6:00PM';
        }
        if (!data.map.buttonText) data.map.buttonText = isSpanish ? 'Cómo Llegar' : 'Get Directions';
    }

    // Team defaults
    if (data.team && typeof data.team === 'object') {
        if (!data.team.title) data.team.title = isSpanish ? 'Nuestro Equipo' : 'Our Team';
    }

    // Pricing defaults
    if (data.pricing && typeof data.pricing === 'object') {
        if (!data.pricing.title) data.pricing.title = isSpanish ? 'Planes y Precios' : 'Plans & Pricing';
    }

    // HowItWorks defaults
    if (data.howItWorks && typeof data.howItWorks === 'object') {
        if (!data.howItWorks.title) data.howItWorks.title = isSpanish ? 'Cómo Funciona' : 'How It Works';
    }

    // TopBar defaults
    if (data.topBar && typeof data.topBar === 'object') {
        if (!data.topBar.messages || !Array.isArray(data.topBar.messages) || data.topBar.messages.length === 0) {
            data.topBar.messages = [
                { text: brief.tagline || `${isSpanish ? 'Bienvenido a' : 'Welcome to'} ${brief.businessName}` },
            ];
        }
        if (data.topBar.scrollEnabled === undefined) data.topBar.scrollEnabled = true;
    }

    // SignupFloat defaults
    if (data.signupFloat && typeof data.signupFloat === 'object') {
        if (!data.signupFloat.headerText) data.signupFloat.headerText = isSpanish ? '¿Te interesa?' : 'Interested?';
        if (!data.signupFloat.descriptionText) data.signupFloat.descriptionText = isSpanish ? 'Déjanos tus datos y te contactamos' : 'Leave your info and we\'ll reach out';
        if (!data.signupFloat.buttonText) data.signupFloat.buttonText = isSpanish ? 'Registrarse' : 'Sign Up';
        if (!data.signupFloat.position) data.signupFloat.position = 'bottom-left';
        // Map backgroundImage → imageUrl (component uses imageUrl)
        if (data.signupFloat.backgroundImage && !data.signupFloat.imageUrl) {
            data.signupFloat.imageUrl = data.signupFloat.backgroundImage;
            delete data.signupFloat.backgroundImage;
        }
    }

    // Separator defaults
    for (let i = 1; i <= 5; i++) {
        const sepKey = `separator${i}`;
        if (data[sepKey] && typeof data[sepKey] === 'object') {
            if (!data[sepKey].type) data[sepKey].type = 'invisible';
            if (data[sepKey].height === undefined) data[sepKey].height = 64;
            if (data[sepKey].glassEffect === undefined) data[sepKey].glassEffect = true;
        }
    }

    // ── GLASSMORPHISM: Enable by default for all generated websites ──
    // This gives every AI-generated site an immersive, modern glass effect.
    const glassComponents = [
        'hero', 'heroSplit', 'heroGallery', 'heroWave', 'heroNova', 'heroLead',
        'features', 'services', 'testimonials', 'pricing', 'faq',
        'cta', 'leads', 'newsletter', 'video', 'howItWorks', 'slideshow',
        'team', 'portfolio',
    ];
    for (const comp of glassComponents) {
        if (data[comp] && typeof data[comp] === 'object') {
            data[comp].glassEffect = true;
        }
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// FIX 4: Apply theme fonts to all components
// ═════════════════════════════════════════════════════════════════════════════

function applyFontsToComponents(data: any, theme: any): void {
    if (!data || typeof data !== 'object' || !theme) return;

    const headerFont = theme.fontFamilyHeader || 'playfair-display';
    const bodyFont = theme.fontFamilyBody || 'inter';
    const buttonFont = theme.fontFamilyButton || bodyFont;
    const fontWeightHeader = theme.fontWeightHeader || 700;

    // Apply to typography component so the editor renders fonts correctly
    if (!data.typography || typeof data.typography !== 'object') {
        data.typography = {};
    }
    data.typography.fontFamilyHeader = headerFont;
    data.typography.fontFamilyBody = bodyFont;
    data.typography.fontFamilyButton = buttonFont;
    data.typography.fontWeightHeader = fontWeightHeader;

    // Propagate to each component's typography field
    const componentsToApplyFonts = [
        'hero', 'heroSplit', 'heroGallery', 'heroWave', 'heroNova', 'heroLead',
        'header', 'footer', 'services', 'features', 'testimonials',
        'team', 'pricing', 'faq', 'portfolio', 'cta', 'howItWorks',
        'leads', 'newsletter', 'banner', 'video', 'slideshow', 'menu',
        'map', 'topBar', 'signupFloat', 'cmsFeed',
        'separator1', 'separator2', 'separator3', 'separator4', 'separator5',
    ];

    for (const compId of componentsToApplyFonts) {
        if (data[compId] && typeof data[compId] === 'object') {
            if (!data[compId].typography) data[compId].typography = {};
            data[compId].typography.fontFamilyHeader = headerFont;
            data[compId].typography.fontFamilyBody = bodyFont;
            data[compId].typography.fontFamilyButton = buttonFont;
            data[compId].typography.fontWeightHeader = fontWeightHeader;
        }
    }
}

export default useAdminTemplateStudio;
