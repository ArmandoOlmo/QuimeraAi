
import React, { useState, useRef, useEffect } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { FunctionDeclaration, Type, LiveServerMessage, Modality, FunctionCallingConfigMode } from '@google/genai';
import { Send, Loader2, ChevronDown, Maximize2, Minimize2, Trash2, Mic, PhoneOff, Bot, Wand2, X, User as UserIcon, Shield, KeyRound } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { initialData } from '../../data/initialData';
import { LeadStatus, CMSPost, Lead, PageData } from '../../types';
import { getGoogleGenAI } from '../../utils/genAiClient';
import { PROMPT_TEMPLATES, compileTemplates, getDefaultEnabledTemplates } from '../../data/promptTemplates';
import { logApiCall } from '../../services/apiLoggingService';

// --- Types ---
interface Message {
    role: 'user' | 'model';
    text: string;
    isToolOutput?: boolean;
}

// --- Tools Definition ---
const TOOLS: FunctionDeclaration[] = [
    {
        name: 'change_view',
        description: 'Navigate to a different section. Views: dashboard, websites, editor, cms, assets, navigation, superadmin, ai-assistant, leads, domains.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                viewName: {
                    type: Type.STRING,
                    enum: ["dashboard", "websites", "editor", "cms", "assets", "navigation", "superadmin", "ai-assistant", "leads", "domains"]
                }
            },
            required: ['viewName']
        }
    },
    {
        name: 'manage_cms_post',
        description: 'Manage CMS posts.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['create', 'update', 'delete'] },
                id: { type: Type.STRING, description: 'Post ID (for update/delete).' },
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                status: { type: Type.STRING, enum: ['draft', 'published'] }
            },
            required: ['action']
        }
    },
    {
        name: 'manage_lead',
        description: 'Manage CRM leads.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['create', 'update', 'delete'] },
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                email: { type: Type.STRING },
                status: { type: Type.STRING, enum: ['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'] },
                notes: { type: Type.STRING },
                value: { type: Type.NUMBER }
            },
            required: ['action']
        }
    },
    {
        name: 'update_chat_config',
        description: 'Update Chatbot config.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                agentName: { type: Type.STRING },
                welcomeMessage: { type: Type.STRING },
                tone: { type: Type.STRING },
                isActive: { type: Type.BOOLEAN },
                enableLiveVoice: { type: Type.BOOLEAN }
            }
        }
    },
    {
        name: 'manage_domain',
        description: 'Manage domains.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['add', 'delete', 'verify'] },
                domainName: { type: Type.STRING },
                id: { type: Type.STRING }
            },
            required: ['action']
        }
    },
    {
        name: 'generate_image_asset',
        description: 'Generate image via AI.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                prompt: { type: Type.STRING },
                style: { type: Type.STRING, enum: ['Photorealistic', 'Cinematic', 'Anime', 'Digital Art', 'Oil Painting', '3D Render', 'Minimalist', 'Cyberpunk', 'Watercolor'] },
                aspectRatio: { type: Type.STRING, enum: ['1:1', '16:9', '9:16', '4:3', '3:4'] }
            },
            required: ['prompt']
        }
    },
    {
        name: 'navigate_admin',
        description: 'Super Admin navigation.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                adminViewName: {
                    type: Type.STRING,
                    enum: ['main', 'tenants', 'prompts', 'stats', 'billing', 'templates', 'components', 'images', 'global-assistant']
                }
            },
            required: ['adminViewName']
        }
    },
    {
        name: 'change_theme',
        description: 'Change theme mode.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                mode: {
                    type: Type.STRING,
                    enum: ['light', 'dark', 'black']
                }
            },
            required: ['mode']
        }
    },
    {
        name: 'update_site_content',
        description: 'Update site content/settings.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: "Dot-notation path" },
                value: { type: Type.STRING }
            },
            required: ['path', 'value']
        }
    },
    {
        name: 'load_project',
        description: 'Open project.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                identifier: { type: Type.STRING }
            },
            required: ['identifier']
        }
    },
    {
        name: 'create_website',
        description: 'Create new website.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                businessName: { type: Type.STRING },
                industry: { type: Type.STRING },
                description: { type: Type.STRING },
                tone: { type: Type.STRING }
            },
            required: ['businessName', 'industry', 'description']
        }
    },
    {
        name: 'manage_section_items',
        description: 'Add, update, or remove items from section arrays (features, testimonials, pricing tiers, FAQ items, portfolio items, services, team members, slides, how-it-works steps).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                section: { 
                    type: Type.STRING, 
                    enum: ['features', 'testimonials', 'pricing', 'faq', 'portfolio', 'services', 'team', 'slideshow', 'howItWorks'],
                    description: 'Section containing items to manage'
                },
                action: { 
                    type: Type.STRING, 
                    enum: ['add', 'update', 'delete'],
                    description: 'Action to perform on items'
                },
                index: { 
                    type: Type.NUMBER, 
                    description: 'Item index (0-based, required for update/delete)' 
                },
                itemData: { 
                    type: Type.OBJECT, 
                    description: 'Item data as JSON object (required for add/update). Structure depends on section type.'
                }
            },
            required: ['section', 'action']
        }
    },
    {
        name: 'update_brand_identity',
        description: 'Update brand identity settings (business name, industry, target audience, tone of voice, core values, language).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: 'Business/brand name' },
                industry: { type: Type.STRING, description: 'Industry or business sector' },
                targetAudience: { type: Type.STRING, description: 'Target audience description' },
                toneOfVoice: { 
                    type: Type.STRING, 
                    enum: ['Professional', 'Playful', 'Urgent', 'Luxury', 'Friendly', 'Minimalist'],
                    description: 'Brand tone of voice'
                },
                coreValues: { type: Type.STRING, description: 'Core brand values' },
                language: { type: Type.STRING, description: 'Primary language' }
            }
        }
    },
    {
        name: 'manage_sections',
        description: 'Show/hide sections or change their display order on the website.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { 
                    type: Type.STRING, 
                    enum: ['show', 'hide', 'reorder'],
                    description: 'Action to perform'
                },
                section: { 
                    type: Type.STRING,
                    description: 'Section name (required for show/hide)'
                },
                newOrder: { 
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'New section order as array of section names (required for reorder)'
                }
            },
            required: ['action']
        }
    }
];

const TOOL_NAMES = TOOLS.map(tool => tool.name);

const DATA_SCHEMA_HINT = `
*** COMPLETE PATHS GUIDE (update_site_content) ***

THEME (Global):
- theme.fontFamilyHeader, theme.fontFamilyBody, theme.fontFamilyButton
- theme.cardBorderRadius, theme.buttonBorderRadius

HEADER:
- header.logoText, header.style, header.layout, header.logoType
- header.colors.background, header.colors.text, header.colors.accent
- header.showCta, header.ctaText, header.showLogin

HERO:
- hero.headline, hero.subheadline, hero.primaryCta, hero.secondaryCta
- hero.headlineFontSize, hero.subheadlineFontSize
- hero.colors.primary, hero.colors.secondary, hero.colors.background, hero.colors.heading, hero.colors.text
- hero.colors.buttonBackground, hero.colors.buttonText
- hero.imageUrl, hero.imageStyle, hero.paddingY, hero.paddingX

FEATURES:
- features.title, features.description, features.titleFontSize, features.descriptionFontSize
- features.colors.background, features.colors.accent, features.colors.borderColor, features.colors.text, features.colors.heading
- features.gridColumns, features.paddingY, features.paddingX
- features.imageHeight, features.imageObjectFit

TESTIMONIALS:
- testimonials.title, testimonials.description, testimonials.titleFontSize, testimonials.descriptionFontSize
- testimonials.colors.background, testimonials.colors.accent, testimonials.colors.borderColor, testimonials.colors.text, testimonials.colors.heading
- testimonials.paddingY, testimonials.paddingX

SLIDESHOW:
- slideshow.title, slideshow.titleFontSize
- slideshow.colors.background, slideshow.colors.heading
- slideshow.paddingY, slideshow.paddingX

PRICING:
- pricing.title, pricing.description, pricing.titleFontSize, pricing.descriptionFontSize
- pricing.colors.background, pricing.colors.accent, pricing.colors.borderColor, pricing.colors.text, pricing.colors.heading
- pricing.colors.buttonBackground, pricing.colors.buttonText
- pricing.paddingY, pricing.paddingX

FAQ:
- faq.title, faq.description, faq.titleFontSize, faq.descriptionFontSize
- faq.colors.background, faq.colors.accent, faq.colors.borderColor, faq.colors.text, faq.colors.heading
- faq.paddingY, faq.paddingX

LEADS (Contact Form):
- leads.title, leads.description, leads.buttonText, leads.titleFontSize, leads.descriptionFontSize
- leads.colors.background, leads.colors.accent, leads.colors.borderColor, leads.colors.text, leads.colors.heading
- leads.colors.buttonBackground, leads.colors.buttonText
- leads.paddingY, leads.paddingX

NEWSLETTER:
- newsletter.title, newsletter.description, newsletter.buttonText, newsletter.placeholderText
- newsletter.titleFontSize, newsletter.descriptionFontSize
- newsletter.colors.background, newsletter.colors.accent, newsletter.colors.borderColor, newsletter.colors.text, newsletter.colors.heading
- newsletter.colors.buttonBackground, newsletter.colors.buttonText
- newsletter.paddingY, newsletter.paddingX

CTA (Call to Action):
- cta.title, cta.description, cta.buttonText, cta.titleFontSize, cta.descriptionFontSize
- cta.colors.gradientStart, cta.colors.gradientEnd, cta.colors.text, cta.colors.heading
- cta.colors.buttonBackground, cta.colors.buttonText
- cta.paddingY, cta.paddingX

PORTFOLIO:
- portfolio.title, portfolio.description, portfolio.titleFontSize, portfolio.descriptionFontSize
- portfolio.colors.background, portfolio.colors.accent, portfolio.colors.borderColor, portfolio.colors.text, portfolio.colors.heading
- portfolio.paddingY, portfolio.paddingX

SERVICES:
- services.title, services.description, services.titleFontSize, services.descriptionFontSize
- services.colors.background, services.colors.accent, services.colors.borderColor, services.colors.text, services.colors.heading
- services.paddingY, services.paddingX

TEAM:
- team.title, team.description, team.titleFontSize, team.descriptionFontSize
- team.colors.background, team.colors.text, team.colors.heading
- team.paddingY, team.paddingX

VIDEO:
- video.title, video.description, video.titleFontSize, video.descriptionFontSize
- video.source, video.videoId, video.videoUrl, video.autoplay, video.loop, video.showControls
- video.colors.background, video.colors.text, video.colors.heading
- video.paddingY, video.paddingX

HOWITWORKS:
- howItWorks.title, howItWorks.description, howItWorks.steps, howItWorks.titleFontSize, howItWorks.descriptionFontSize
- howItWorks.colors.background, howItWorks.colors.accent, howItWorks.colors.text, howItWorks.colors.heading
- howItWorks.paddingY, howItWorks.paddingX

FOOTER:
- footer.title, footer.description, footer.copyrightText, footer.titleFontSize, footer.descriptionFontSize
- footer.colors.background, footer.colors.border, footer.colors.text, footer.colors.linkHover, footer.colors.heading

CHATBOT:
- chatbot.welcomeMessage, chatbot.placeholderText, chatbot.knowledgeBase, chatbot.position, chatbot.isActive
- chatbot.colors.primary, chatbot.colors.text, chatbot.colors.background

EXAMPLES:
- Change hero headline: path="hero.headline", value="Welcome to Our Site!"
- Change title size: path="hero.headlineFontSize", value="6xl"
- Change background: path="hero.colors.background", value="#1a1a1a"
- Change padding: path="hero.paddingY", value="xl"
- Change font family: path="theme.fontFamilyHeader", value="playfair-display"
- Change button color: path="hero.colors.buttonBackground", value="#ff6b6b"
- Enable chatbot: path="chatbot.isActive", value="true"
- Change grid columns: path="features.gridColumns", value="3"
`;

const ACTION_PROTOCOL = `
*** EXECUTION PROTOCOL ***

YOU ARE A HELPFUL, INTELLIGENT ASSISTANT WITH DEEP ACCESS TO THE ENTIRE APP.

CORE BEHAVIOR:
1. **UNDERSTAND INTENT**: Interpret what the user wants even if poorly written, with typos, or incomplete
2. **BE SMART**: Use context clues and common sense to figure out ambiguous requests
3. **ASK WHEN UNCLEAR**: If you genuinely don't understand or need critical info, ask clarifying questions
4. **EXECUTE CONFIDENTLY**: When you understand the request, execute immediately without asking permission
5. **BE CONVERSATIONAL**: Respond naturally - you're helpful, not robotic

CAPABILITIES:
1. Navigate: dashboard, websites, editor, cms, leads, domains, superadmin
2. Edit Content: All 17 sections (hero, features, testimonials, pricing, faq, cta, services, team, portfolio, video, slideshow, newsletter, leads, howItWorks, header, footer, chatbot)
3. Edit Styling: fonts, colors, sizes, padding, borders for ANY section
4. Manage Data: CMS posts, Leads, Domains, Chatbot config, Brand Identity
5. Manage Arrays: Add/edit/delete items in features, testimonials, pricing, FAQ, portfolio, services, team, slides, steps
6. Section Control: Show/hide sections, reorder sections
7. Create: New websites, leads, posts, domains, images
8. Admin: Access all Super Admin panels (only for authorized users)

UNDERSTANDING USER INTENT:
- "cambia el titulo" = "change the hero title" → execute it
- "pon el hero azul" = "make hero background blue" → execute it
- "agrega una cosa en features" = "add a feature" → ASK what feature details they want
- "quiero cambiar algo" = too vague → ASK what they want to change
- "abre el editor" / "ve al editor" / "editor" → navigate to editor
- "hazlo mas grande" (with context of title) → increase font size
- "cambiar color" → ASK which element and which color

WHEN TO ASK CLARIFYING QUESTIONS:
❓ Missing critical information (e.g., "add a feature" - need title/description)
❓ Truly ambiguous (e.g., "change it" - change what?)
❓ Multiple valid interpretations (e.g., "make it blue" - background? text? button?)
❓ User says "something" or "thing" without clear context

WHEN TO EXECUTE WITHOUT ASKING:
✅ Clear intent even with typos ("cambia el titlo del hero" → change hero title)
✅ Context makes it obvious ("make it bigger" after discussing hero title)
✅ Common/obvious requests ("open editor", "show me leads", "change background to dark")
✅ You have all the info needed

EXECUTION PATTERNS:
- Editing content/style → use update_site_content with path
- Managing list items → use manage_section_items
- Navigation → use change_view or navigate_admin
- Brand changes → use update_brand_identity
- Section visibility → use manage_sections

PATH EXAMPLES (update_site_content):
- "Change hero title" → path="hero.headline", value="New Title"
- "Make hero title bigger" → path="hero.headlineFontSize", value="6xl"
- "Change hero background to dark" → path="hero.colors.background", value="#1a1a1a"
- "Change main font to Playfair" → path="theme.fontFamilyHeader", value="playfair-display"
- "Update CTA button text" → path="cta.buttonText", value="Get Started Now"
- "Enable chatbot" → path="chatbot.isActive", value="true"

ARRAY OPERATIONS (manage_section_items):
- "Add a new feature" → section="features", action="add", itemData={title, description, imageUrl}
- "Delete second testimonial" → section="testimonials", action="delete", index=1

COMMON COMMAND VARIATIONS (all variations = same action):

CHANGE/EDIT/MODIFY/UPDATE:
- "cambia" / "cambiar" / "change"
- "edita" / "editar" / "edit"
- "modifica" / "modificar" / "modify"
- "actualiza" / "actualizar" / "update"
- "pon" / "poner" / "put" / "set"

MAKE BIGGER/SMALLER:
- "mas grande" / "más grande" / "bigger" / "larger" / "increase size" / "hazlo mas grande" / "agrandar"
- "mas pequeño" / "más pequeño" / "smaller" / "reduce size" / "hazlo mas pequeño" / "achicar"

NAVIGATE/OPEN/GO TO:
- "abre" / "abrir" / "open"
- "ve a" / "ir a" / "go to"
- "muestra" / "mostrar" / "show"
- "lleva" / "llevar" / "take me to"
- "quiero ver" / "want to see"

ADD/CREATE/NEW:
- "agrega" / "agregar" / "add"
- "añade" / "añadir" / "append"
- "crea" / "crear" / "create"
- "nuevo" / "nueva" / "new"

DELETE/REMOVE/HIDE:
- "elimina" / "eliminar" / "delete"
- "borra" / "borrar" / "erase"
- "quita" / "quitar" / "remove"
- "oculta" / "ocultar" / "hide"
- "esconde" / "esconder" / "conceal"

COMMON TYPOS/ABBREVIATIONS:
- "titulo"/"titlo"/"tit"/"title" → headline or title
- "hero"/"heroe"/"inicio"/"header" → hero section (note: header is different but users may confuse)
- "fondo"/"fonfo"/"backgrnd"/"bg" → background
- "color"/"colour"/"col" → color
- "fuente"/"fuente"/"font"/"letra" → font family
- "tamaño"/"tamanio"/"size"/"tam" → size
- "boton"/"botón"/"btn"/"button" → button
- "imagen"/"img"/"image"/"pic" → image
- "seccion"/"sección"/"section"/"sec" → section

SECTION NAME VARIATIONS:
- "caracteristicas"/"features"/"feat" → features section
- "testimonios"/"testimonials"/"reviews" → testimonials section
- "precios"/"pricing"/"plans"/"prices" → pricing section
- "equipo"/"team"/"nosotros" → team section
- "servicios"/"services"/"serv" → services section
- "contacto"/"contact"/"leads"/"formulario" → leads/contact section
- "pie de pagina"/"footer"/"pie" → footer section

*** MULTILINGUAL TERM MAPPING (Spanish ↔ English) ***

ACTIONS (all equivalents):
- cambiar/cambia/change/modify/modifica/edit/edita/update/actualiza
- agregar/agrega/add/añade/añadir/create/crea/crear
- eliminar/elimina/delete/remove/quita/quitar/borrar/borra
- ocultar/oculta/hide/esconder/esconde
- mostrar/muestra/show/display/enseñar
- abrir/abre/open/go to/ve a/ir a
- hacer/haz/make/do

PROPERTIES (Spanish ↔ English):
- titulo/title → headline or title
- subtitulo/subtitle → subheadline
- fondo/background/bg → background
- color/colour/col → color
- texto/text → text
- fuente/font/letra/typeface → font family
- tamaño/size/tam → size
- grande/big/bigger/large/larger → increase size
- pequeño/small/smaller/chico → decrease size
- imagen/image/img/picture/foto → image
- boton/button/btn → button
- seccion/section/sec → section
- pagina/page/pag → page
- menu/menú → menu
- estilo/style → style
- padding/espaciado/espacio → padding
- margen/margin → margin
- borde/border → border
- ancho/width → width
- alto/height → height
- alinear/align/alineacion → alignment

SECTIONS (Spanish ↔ English):
- inicio/hero/heroe/header/portada → hero section
- caracteristicas/features/feat/ventajas → features
- testimonios/testimonials/reviews/opiniones/reseñas → testimonials
- precios/pricing/planes/plans/tarifas → pricing
- preguntas/faq/faqs/preguntas frecuentes → faq
- contacto/contact/formulario/leads/form → leads/contact
- equipo/team/nosotros/about us → team
- servicios/services/serv → services
- portafolio/portfolio/trabajos/galeria/gallery → portfolio
- llamada a accion/cta/call to action → cta
- pie de pagina/footer/pie → footer
- cabecera/header/encabezado/navegacion → header
- boletin/newsletter/suscripcion → newsletter
- video/vídeo → video
- carrusel/slideshow/slider/galeria → slideshow
- como funciona/how it works/proceso → howItWorks
- chatbot/chat/asistente → chatbot

COLORS (Spanish ↔ English):
- azul/blue → blue
- rojo/red → red
- verde/green → green
- amarillo/yellow → yellow
- negro/black/oscuro/dark → black/dark
- blanco/white/claro/light → white/light
- gris/gray/grey → gray
- naranja/orange → orange
- morado/purple/violeta → purple
- rosa/pink → pink
- celeste/cyan/aqua → cyan
- turquesa/teal → teal

COMMON PHRASES (Spanish → English):
- "hazlo más grande" → "make it bigger"
- "ponlo azul" → "make it blue"
- "ve al editor" → "go to editor"
- "abre el cms" → "open cms"
- "cambia el titulo" → "change the title"
- "agrega una característica" → "add a feature"
- "elimina la segunda" → "delete the second one"
- "oculta la sección" → "hide the section"
- "muestra los precios" → "show pricing"
- "actualiza el texto" → "update the text"

FONT SIZES: xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl, 7xl, 8xl, 9xl
PADDING SIZES: none, xs, sm, md, lg, xl, 2xl, 3xl
FONT FAMILIES: roboto, open-sans, lato, montserrat, playfair-display, oswald, source-sans-pro, raleway, poppins, inter
`;

const cleanJson = (text: string) => {
    let cleaned = text.replace(/```json\n?|```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    return cleaned;
};

function base64ToBytes(base64: string) {
    const binaryString = atob(base64);
    const length = binaryString.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
}

const normalizeText = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

const GlobalAiAssistant: React.FC = () => {
    const { 
        userDocument, setAdminView, data, setData, themeMode, setThemeMode, loadProject, activeProject,
        hasApiKey, promptForKeySelection, handleApiError, globalAssistantConfig, onSectionSelect,
        theme, setTheme, setIsOnboardingOpen, isOnboardingOpen, onboardingState, setOnboardingState,
        getPrompt, addNewProject, 
        // Added context items
        leads, addLead, updateLead, updateLeadStatus, deleteLead,
        cmsPosts, saveCMSPost, deleteCMSPost,
        aiAssistantConfig, saveAiAssistantConfig,
        domains, addDomain, deleteDomain, verifyDomain,
        generateImage,
        projects, setView, view, user,
        brandIdentity, setBrandIdentity,
        componentOrder, setComponentOrder,
        sectionVisibility, setSectionVisibility,
        // Component system
        componentStatus, customComponents
    } = useEditor();

    // State
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([{ role: 'model', text: globalAssistantConfig.greeting }]);
    const [isThinking, setIsThinking] = useState(false);
    const [isExecutingCommands, setIsExecutingCommands] = useState(false);
    
    // Voice State
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [visualizerLevels, setVisualizerLevels] = useState([1, 1, 1, 1]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Audio Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const sessionRef = useRef<any>(null); 
    const visualizerIntervalRef = useRef<number | null>(null);
    
    // Data Refs
    const dataRef = useRef(data);
    const themeRef = useRef(theme);
    const projectsRef = useRef(projects);
    const loadProjectRef = useRef(loadProject);
    const themeModeRef = useRef(themeMode);
    const onSectionSelectRef = useRef(onSectionSelect);
    const setViewRef = useRef(setView);
    const setAdminViewRef = useRef(setAdminView);
    const setThemeModeRef = useRef(setThemeMode);
    const setThemeRef = useRef(setTheme);
    const userDocumentRef = useRef(userDocument);
    const getPromptRef = useRef(getPrompt);
    const componentStatusRef = useRef(componentStatus);
    const customComponentsRef = useRef(customComponents);
    const lastToolCallRef = useRef<{ name: string; args: string; timestamp: number } | null>(null);
    const addNewProjectRef = useRef(addNewProject);
    const setIsOnboardingOpenRef = useRef(setIsOnboardingOpen);
    const isOnboardingOpenRef = useRef(isOnboardingOpen);
    const setOnboardingStateRef = useRef(setOnboardingState);
    const onboardingStateRef = useRef(onboardingState);
    const leadsRef = useRef(leads);
    const addLeadRef = useRef(addLead);
    const updateLeadRef = useRef(updateLead);
    const updateLeadStatusRef = useRef(updateLeadStatus);
    const deleteLeadRef = useRef(deleteLead);
    const cmsPostsRef = useRef(cmsPosts);
    const saveCMSPostRef = useRef(saveCMSPost);
    const deleteCMSPostRef = useRef(deleteCMSPost);
    const aiConfigRef = useRef(aiAssistantConfig);
    const saveAiConfigRef = useRef(saveAiAssistantConfig);
    const domainsRef = useRef(domains);
    const addDomainRef = useRef(addDomain);
    const deleteDomainRef = useRef(deleteDomain);
    const verifyDomainRef = useRef(verifyDomain);
    const generateImageRef = useRef(generateImage);
    const activeProjectRef = useRef(activeProject);
    const viewRef = useRef(view);
    const brandIdentityRef = useRef(brandIdentity);
    const setBrandIdentityRef = useRef(setBrandIdentity);
    const componentOrderRef = useRef(componentOrder);
    const setComponentOrderRef = useRef(setComponentOrder);
    const sectionVisibilityRef = useRef(sectionVisibility);
    const setSectionVisibilityRef = useRef(setSectionVisibility);

    // Sync Refs
    useEffect(() => { dataRef.current = data; }, [data]);
    useEffect(() => { themeRef.current = theme; }, [theme]);
    useEffect(() => { projectsRef.current = projects; }, [projects]);
    useEffect(() => { loadProjectRef.current = loadProject; }, [loadProject]);
    useEffect(() => { themeModeRef.current = themeMode; }, [themeMode]);
    useEffect(() => { onSectionSelectRef.current = onSectionSelect; }, [onSectionSelect]);
    useEffect(() => { setViewRef.current = setView; }, [setView]);
    useEffect(() => { setAdminViewRef.current = setAdminView; }, [setAdminView]);
    useEffect(() => { setThemeModeRef.current = setThemeMode; }, [setThemeMode]);
    useEffect(() => { setThemeRef.current = setTheme; }, [setTheme]);
    useEffect(() => { userDocumentRef.current = userDocument; }, [userDocument]);
    useEffect(() => { getPromptRef.current = getPrompt; }, [getPrompt]);
    useEffect(() => { componentStatusRef.current = componentStatus; }, [componentStatus]);
    useEffect(() => { customComponentsRef.current = customComponents; }, [customComponents]);
    useEffect(() => { addNewProjectRef.current = addNewProject; }, [addNewProject]);
    useEffect(() => { setIsOnboardingOpenRef.current = setIsOnboardingOpen; }, [setIsOnboardingOpen]);
    useEffect(() => { isOnboardingOpenRef.current = isOnboardingOpen; }, [isOnboardingOpen]);
    useEffect(() => { setOnboardingStateRef.current = setOnboardingState; }, [setOnboardingState]);
    useEffect(() => { onboardingStateRef.current = onboardingState; }, [onboardingState]);
    useEffect(() => { leadsRef.current = leads; }, [leads]);
    useEffect(() => { addLeadRef.current = addLead; }, [addLead]);
    useEffect(() => { updateLeadRef.current = updateLead; }, [updateLead]);
    useEffect(() => { updateLeadStatusRef.current = updateLeadStatus; }, [updateLeadStatus]);
    useEffect(() => { deleteLeadRef.current = deleteLead; }, [deleteLead]);
    useEffect(() => { cmsPostsRef.current = cmsPosts; }, [cmsPosts]);
    useEffect(() => { saveCMSPostRef.current = saveCMSPost; }, [saveCMSPost]);
    useEffect(() => { deleteCMSPostRef.current = deleteCMSPost; }, [deleteCMSPost]);
    useEffect(() => { aiConfigRef.current = aiAssistantConfig; }, [aiAssistantConfig]);
    useEffect(() => { saveAiConfigRef.current = saveAiAssistantConfig; }, [saveAiAssistantConfig]);
    useEffect(() => { domainsRef.current = domains; }, [domains]);
    useEffect(() => { addDomainRef.current = addDomain; }, [addDomain]);
    useEffect(() => { deleteDomainRef.current = deleteDomain; }, [deleteDomain]);
    useEffect(() => { verifyDomainRef.current = verifyDomain; }, [verifyDomain]);
    useEffect(() => { generateImageRef.current = generateImage; }, [generateImage]);
    useEffect(() => { activeProjectRef.current = activeProject; }, [activeProject]);
    useEffect(() => { viewRef.current = view; }, [view]);
    useEffect(() => { brandIdentityRef.current = brandIdentity; }, [brandIdentity]);
    useEffect(() => { setBrandIdentityRef.current = setBrandIdentity; }, [setBrandIdentity]);
    useEffect(() => { componentOrderRef.current = componentOrder; }, [componentOrder]);
    useEffect(() => { setComponentOrderRef.current = setComponentOrder; }, [setComponentOrder]);
    useEffect(() => { sectionVisibilityRef.current = sectionVisibility; }, [sectionVisibility]);
    useEffect(() => { setSectionVisibilityRef.current = setSectionVisibility; }, [setSectionVisibility]);

    const isConnectedRef = useRef(false);

    useEffect(() => {
        if (messages.length <= 1 && messages[0].role === 'model') {
             setMessages([{ role: 'model', text: globalAssistantConfig.greeting }]);
        }
    }, [globalAssistantConfig.greeting]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen, isExpanded]);
    useEffect(() => { if (isOpen && !isLiveActive) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen, isLiveActive]);

    useEffect(() => {
        if (isLiveActive) {
            visualizerIntervalRef.current = window.setInterval(() => {
                setVisualizerLevels([
                    Math.random() * 20 + 10,
                    Math.random() * 40 + 10,
                    Math.random() * 30 + 10,
                    Math.random() * 20 + 10,
                ]);
            }, 100);
        } else {
            if (visualizerIntervalRef.current) clearInterval(visualizerIntervalRef.current);
            setVisualizerLevels([4, 4, 4, 4]);
        }
        return () => { if (visualizerIntervalRef.current) clearInterval(visualizerIntervalRef.current); };
    }, [isLiveActive]);

    const performHeadlessGeneration = async (businessName: string, industry: string, description: string, tone: string) => {
        const ai = await getGoogleGenAI();
        const getPrompt = getPromptRef.current;

        const designPrompt = getPrompt('onboarding-design-plan');
        if (!designPrompt) throw new Error("Design prompt not found");
        
        try {
            const designResponse = await ai.models.generateContent({
                model: designPrompt.model,
                contents: designPrompt.template.replace('{{businessName}}', businessName).replace('{{industry}}', industry).replace('{{tone}}', tone || 'Professional').replace('{{goal}}', 'Generate Leads').replace('{{summary}}', description).replace('{{availableFonts}}', "Roboto, Open Sans, Lato, Montserrat, Playfair Display").replace('{{allSections}}', "hero, features, testimonials, footer, cta"),
                config: { responseMimeType: 'application/json' }
            });
            
            // Log API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: designPrompt.model,
                    feature: 'onboarding-design-plan',
                    success: true
                });
            }
            
            const designPlan = JSON.parse(cleanJson(designResponse.text));

            const websitePrompt = getPrompt('onboarding-website-json');
            if (!websitePrompt) throw new Error("Website generation prompt not found");

            const websiteResponse = await ai.models.generateContent({
                model: websitePrompt.model,
                contents: websitePrompt.template.replace('{{businessName}}', businessName).replace('{{industry}}', industry).replace('{{summary}}', description).replace('{{audience}}', 'General').replace('{{offerings}}', 'Services').replace('{{tone}}', tone || 'Professional').replace('{{goal}}', 'Generate Leads').replace('{{designPlanTypography}}', JSON.stringify(designPlan.typography)).replace('{{designPlanPalette}}', JSON.stringify(designPlan.palette)).replace('{{designPlanComponentOrder}}', JSON.stringify(designPlan.componentOrder)).replace('{{designPlanImageStyle}}', designPlan.imageStyleDescription),
                config: { responseMimeType: 'application/json' }
            });
            
            // Log API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: websitePrompt.model,
                    feature: 'onboarding-website-generation',
                    success: true
                });
            }

            const result = JSON.parse(cleanJson(websiteResponse.text));
            let generatedData = result.pageConfig?.data || result.data;
            if (!generatedData && result.hero) generatedData = result;

            const generatedTheme = result.pageConfig?.theme || result.theme || designPlan;
            const generatedPrompts = result.imagePrompts || result.pageConfig?.imagePrompts || {};

            const safeData = JSON.parse(JSON.stringify(initialData.data));
            if (generatedData) {
                Object.keys(generatedData).forEach((sectionKey: any) => {
                    if (safeData[sectionKey]) {
                        const genSection = generatedData[sectionKey];
                        const defaultColors = safeData[sectionKey].colors || {};
                        const { colors: genColors, ...otherProps } = genSection;
                        safeData[sectionKey] = { ...safeData[sectionKey], ...otherProps };
                        if (genColors) { safeData[sectionKey].colors = { ...defaultColors, ...genColors }; }
                    }
                });
            }

            const newProject = {
                id: `proj_${Date.now()}`,
                name: businessName,
                thumbnailUrl: 'https://picsum.photos/seed/newproject/800/600',
                status: 'Draft' as 'Draft',
                lastUpdated: new Date().toISOString(),
                data: safeData,
                theme: {
                    ...generatedTheme,
                    fontFamilyHeader: (designPlan.typography?.header || 'Inter').toLowerCase().replace(/\s/g, '-'),
                    fontFamilyBody: (designPlan.typography?.body || 'Inter').toLowerCase().replace(/\s/g, '-'),
                    fontFamilyButton: (designPlan.typography?.button || 'Inter').toLowerCase().replace(/\s/g, '-'),
                    cardBorderRadius: generatedTheme?.cardBorderRadius || 'xl',
                    buttonBorderRadius: generatedTheme?.buttonBorderRadius || 'xl',
                },
                brandIdentity: { name: businessName, industry, targetAudience: 'General', toneOfVoice: tone as any, coreValues: 'Quality', language: 'English' },
                componentOrder: result.pageConfig?.componentOrder || designPlan.componentOrder || initialData.componentOrder,
                sectionVisibility: result.pageConfig?.sectionVisibility || initialData.sectionVisibility,
                imagePrompts: generatedPrompts,
                aiAssistantConfig: {
                    agentName: `${businessName} Assistant`,
                    tone: tone || 'Professional',
                    languages: 'English, Spanish',
                    businessProfile: description,
                    productsServices: '',
                    policiesContact: '',
                    specialInstructions: '',
                    faqs: [],
                    widgetColor: designPlan.palette?.primary || '#4f46e5',
                    isActive: true,
                    leadCaptureEnabled: true,
                    enableLiveVoice: false,
                    voiceName: 'Zephyr' as const
                }
            };

            await addNewProjectRef.current(newProject);
        } catch (error: any) {
            // Log failed API calls
            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: designPrompt?.model || 'unknown',
                    feature: 'onboarding-generation',
                    success: false,
                    errorMessage: error.message || 'Unknown error'
                });
            }
            throw error;
        }
    };

    const updateDataPath = (path: string, value: any) => {
        if (!dataRef.current) {
            console.warn("Cannot update data: No project loaded.");
            return false;
        }
        
        const deepSet = (obj: any, p: string, v: any) => {
            const keys = p.split('.');
            let cur = obj;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!cur[key]) cur[key] = {};
                if (typeof cur[key] !== 'object') {
                    console.warn(`Cannot traverse path '${p}' at '${key}': value is primitive.`);
                    return;
                }
                cur = cur[key];
            }
            cur[keys[keys.length - 1]] = v;
        }

        try {
            const mutableClone = JSON.parse(JSON.stringify(dataRef.current));
            deepSet(mutableClone, path, value);
            dataRef.current = mutableClone; 
        } catch(e) { console.warn("Optimistic ref update failed", e); }

        setData(prevData => {
            if (!prevData) return null;
            const newData = JSON.parse(JSON.stringify(prevData));
            deepSet(newData, path, value); 
            return newData;
        });
        
        return true;
    };

    const executeTool = async (name: string, args: any): Promise<{ result?: string, error?: string }> => {
        console.log(`[Tool Execution] ${name}`, {
            args,
            timestamp: new Date().toISOString()
        });
        try {
            const serializedArgs = JSON.stringify(args ?? {});
            const now = Date.now();
            const lastCall = lastToolCallRef.current;
            if (lastCall && lastCall.name === name && lastCall.args === serializedArgs && now - lastCall.timestamp < 2000) {
                console.log(`[Tool Execution] Duplicate call ignored: ${name}`);
                return { result: `Ignored duplicate ${name} call.` };
            }

            lastToolCallRef.current = { name, args: serializedArgs, timestamp: now };

            if (name === 'change_view') {
                const newView = args['viewName'] as any;
                if (viewRef.current === newView) {
                    const result = { result: `Already in ${newView}.` };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                }
                setViewRef.current(newView);
                const result = { result: `Navigated to ${newView}.` };
                console.log(`[Tool Result] ${name}`, result);
                return result;
            }
            else if (name === 'navigate_admin') {
                const adminViewName = args['adminViewName'] as any;
                if (userDocumentRef.current?.role !== 'superadmin') {
                    const result = { error: "Unauthorized: Only Super Admins can access admin panels." };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                }
                setViewRef.current('superadmin');
                setAdminViewRef.current(adminViewName);
                const result = { result: `Navigated to Super Admin > ${adminViewName}.` };
                console.log(`[Tool Result] ${name}`, result);
                return result;
            }
            else if (name === 'change_theme') {
                const mode = args['mode'] as any;
                if (['light', 'dark', 'black'].includes(mode)) {
                    setThemeModeRef.current(mode);
                    const result = { result: `Switched theme to ${mode}.` };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                }
                const result = { error: 'Invalid theme mode.' };
                console.log(`[Tool Result] ${name}`, result);
                return result;
            }
            else if (name === 'update_site_content') {
                if (!dataRef.current) {
                    const result = { error: "No active project loaded. Tell user to open a project first." };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                }
                const path = args['path'] as string;
                let val: any = args['value'];
                if (val === undefined || val === null) {
                    const result = { error: "Value required." };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                }
                if (typeof val === 'string') {
                    const lowerVal = val.toLowerCase().trim();
                    if (lowerVal === 'true') val = true;
                    else if (lowerVal === 'false') val = false;
                    else if (!isNaN(Number(val)) && val.trim() !== '') val = Number(val);
                    else if ((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}'))) {
                        try { val = JSON.parse(val); } catch(e) {}
                    }
                }
                if (path.startsWith('theme.')) {
                    const themeKey = path.split('.')[1];
                    if (themeKey && themeRef.current) {
                        setThemeRef.current(prev => ({...prev, [themeKey]: val}));
                        const result = { result: `Updated global theme ${themeKey}.` };
                        console.log(`[Tool Result] ${name}`, result);
                        return result;
                    }
                }
                const success = updateDataPath(path, val);
                const result = { result: success ? `Updated ${path}.` : `Path ${path} not found.` };
                console.log(`[Tool Result] ${name}`, result);
                return result;
            }
            else if (name === 'load_project') {
                const identifier = args['identifier'];
                const target = normalizeText(identifier);
                const project = projectsRef.current.find(p => {
                    const pName = normalizeText(p.name);
                    return p.id === identifier || pName === target || pName.includes(target) || target.includes(pName);
                });
                if (project) {
                    if (activeProjectRef.current?.id === project.id) {
                        const result = { result: `Project '${project.name}' is already active.` };
                        console.log(`[Tool Result] ${name}`, result);
                        return result;
                    }
                    loadProjectRef.current(project.id);
                    activeProjectRef.current = project;
                    dataRef.current = project.data;
                    const result = { result: `Project '${project.name}' loaded.` };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                } else {
                    const available = projectsRef.current.slice(0, 5).map(p => p.name).join(', ');
                    const result = { error: `Project not found. Available: ${available}...` };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                }
            }
            else if (name === 'create_website') {
                const { businessName, industry, description, tone } = args;
                await performHeadlessGeneration(businessName, industry, description, tone);
                const result = { result: `Website '${businessName}' created.` };
                console.log(`[Tool Result] ${name}`, result);
                return result;
            }
            
            // --- CONTENT MANAGER TOOLS ---
            else if (name === 'manage_cms_post') {
                const { action, id, title, content, status } = args;
                if (action === 'create') {
                    const newPost: CMSPost = {
                        id: `post_${Date.now()}`,
                        title: title || 'Untitled',
                        slug: title?.toLowerCase().replace(/\s+/g, '-') || 'untitled',
                        content: content || '',
                        excerpt: '',
                        featuredImage: '',
                        status: status || 'draft',
                        authorId: userDocumentRef.current?.id || '',
                        seoTitle: '',
                        seoDescription: '',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                    await saveCMSPostRef.current(newPost);
                    return { result: `Created post "${newPost.title}".` };
                } else if (action === 'update') {
                    let targetId = id;
                    if (!targetId && title) {
                        const found = cmsPostsRef.current.find(p => normalizeText(p.title).includes(normalizeText(title)));
                        if (found) targetId = found.id;
                    }
                    if (!targetId) return { error: "Post not found." };
                    const existing = cmsPostsRef.current.find(p => p.id === targetId);
                    if (!existing) return { error: "Post not found." };
                    await saveCMSPostRef.current({ ...existing, ...args, id: targetId });
                    return { result: `Updated post "${existing.title}".` };
                } else if (action === 'delete') {
                    if (!id) return { error: "Post ID required." };
                    await deleteCMSPostRef.current(id);
                    return { result: "Post deleted." };
                }
            }

            // --- LEAD CRM TOOLS ---
            else if (name === 'manage_lead') {
                const { action, id, name: leadName, email, status, notes, value } = args;
                if (action === 'create') {
                    await addLeadRef.current({
                        name: leadName, email, company: '', value: value || 0, 
                        status: status || 'new', source: 'manual', notes: notes || ''
                    });
                    return { result: `Created lead: ${leadName}` };
                } else if (action === 'update') {
                    let targetId = id;
                    if (!targetId && leadName) {
                        const found = leadsRef.current.find(l => normalizeText(l.name).includes(normalizeText(leadName)));
                        if (found) targetId = found.id;
                    }
                    if (!targetId) return { error: "Lead not found." };
                    if (status) await updateLeadStatusRef.current(targetId, status);
                    if (notes || value || email || leadName) await updateLeadRef.current(targetId, { notes, value, email, name: leadName });
                    return { result: "Lead updated." };
                } else if (action === 'delete') {
                    if (!id) return { error: "Lead ID required." };
                    await deleteLeadRef.current(id);
                    return { result: "Lead deleted." };
                }
            }

            // --- CHATBOT CONFIG ---
            else if (name === 'update_chat_config') {
                const newConfig = { ...aiConfigRef.current, ...args };
                await saveAiConfigRef.current(newConfig);
                return { result: "Chatbot config updated." };
            }

            // --- DOMAIN MANAGEMENT ---
            else if (name === 'manage_domain') {
                const { action, domainName, id } = args;
                if (action === 'add') {
                    await addDomainRef.current({
                        id: `dom_${Date.now()}`,
                        name: domainName,
                        status: 'pending',
                        provider: 'External',
                        createdAt: new Date().toISOString()
                    });
                    return { result: `Domain ${domainName} added.` };
                } else if (action === 'delete') {
                    if (!id) return { error: "Domain ID required." };
                    await deleteDomainRef.current(id);
                    return { result: "Domain removed." };
                } else if (action === 'verify') {
                    if (!id) return { error: "Domain ID required." };
                    const success = await verifyDomainRef.current(id);
                    return { result: success ? "Verified." : "Verification failed." };
                }
            }

            // --- ASSET GENERATION ---
            else if (name === 'generate_image_asset') {
                const { prompt, style, aspectRatio } = args;
                const url = await generateImageRef.current(prompt, { style, aspectRatio, destination: 'user' });
                return { result: `Image generated: ${url}` };
            }

            // --- SECTION ITEMS MANAGEMENT ---
            else if (name === 'manage_section_items') {
                if (!dataRef.current) {
                    const result = { error: "No active project loaded." };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                }
                const { section, action, index, itemData } = args;
                
                const sectionData = dataRef.current[section as keyof PageData] as any;
                if (!sectionData || !sectionData.items) {
                    const result = { error: `Section '${section}' not found or has no items array.` };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                }

                if (action === 'add') {
                    if (!itemData) {
                        const result = { error: "itemData required for add action." };
                        console.log(`[Tool Result] ${name}`, result);
                        return result;
                    }
                    const newItems = [...sectionData.items, itemData];
                    const success = updateDataPath(`${section}.items`, newItems);
                    const result = { result: success ? `Added item to ${section}.` : `Failed to add item.` };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                } 
                else if (action === 'update') {
                    if (index === undefined || index === null) {
                        const result = { error: "index required for update action." };
                        console.log(`[Tool Result] ${name}`, result);
                        return result;
                    }
                    if (!itemData) {
                        const result = { error: "itemData required for update action." };
                        console.log(`[Tool Result] ${name}`, result);
                        return result;
                    }
                    if (index < 0 || index >= sectionData.items.length) {
                        const result = { error: "Index out of range." };
                        console.log(`[Tool Result] ${name}`, result);
                        return result;
                    }
                    const newItems = [...sectionData.items];
                    newItems[index] = { ...newItems[index], ...itemData };
                    const success = updateDataPath(`${section}.items`, newItems);
                    const result = { result: success ? `Updated item ${index} in ${section}.` : `Failed to update item.` };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                } 
                else if (action === 'delete') {
                    if (index === undefined || index === null) {
                        const result = { error: "index required for delete action." };
                        console.log(`[Tool Result] ${name}`, result);
                        return result;
                    }
                    if (index < 0 || index >= sectionData.items.length) {
                        const result = { error: "Index out of range." };
                        console.log(`[Tool Result] ${name}`, result);
                        return result;
                    }
                    const newItems = sectionData.items.filter((_: any, i: number) => i !== index);
                    const success = updateDataPath(`${section}.items`, newItems);
                    const result = { result: success ? `Deleted item ${index} from ${section}.` : `Failed to delete item.` };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                }
                const result = { error: "Invalid action for manage_section_items." };
                console.log(`[Tool Result] ${name}`, result);
                return result;
            }

            // --- BRAND IDENTITY MANAGEMENT ---
            else if (name === 'update_brand_identity') {
                const updates = args;
                const currentIdentity = brandIdentityRef.current;
                const newIdentity = { ...currentIdentity, ...updates };
                setBrandIdentityRef.current(newIdentity);
                
                const updatedFields = Object.keys(updates).join(', ');
                const result = { result: `Brand identity updated: ${updatedFields}.` };
                console.log(`[Tool Result] ${name}`, result);
                return result;
            }

            // --- SECTION VISIBILITY & ORDER ---
            else if (name === 'manage_sections') {
                const { action, section, newOrder } = args;
                
                if (action === 'show') {
                    if (!section) {
                        const result = { error: "section required for show action." };
                        console.log(`[Tool Result] ${name}`, result);
                        return result;
                    }
                    const newVisibility = { ...sectionVisibilityRef.current, [section]: true };
                    setSectionVisibilityRef.current(newVisibility);
                    const result = { result: `Section '${section}' is now visible.` };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                } 
                else if (action === 'hide') {
                    if (!section) {
                        const result = { error: "section required for hide action." };
                        console.log(`[Tool Result] ${name}`, result);
                        return result;
                    }
                    const newVisibility = { ...sectionVisibilityRef.current, [section]: false };
                    setSectionVisibilityRef.current(newVisibility);
                    const result = { result: `Section '${section}' is now hidden.` };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                } 
                else if (action === 'reorder') {
                    if (!newOrder || !Array.isArray(newOrder)) {
                        const result = { error: "newOrder array required for reorder action." };
                        console.log(`[Tool Result] ${name}`, result);
                        return result;
                    }
                    setComponentOrderRef.current(newOrder as any);
                    const result = { result: `Section order updated.` };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                }
                const result = { error: "Invalid action for manage_sections." };
                console.log(`[Tool Result] ${name}`, result);
                return result;
            }

            const unknownResult = { error: `Unknown tool: ${name}` };
            console.log(`[Tool Result] ${name}`, unknownResult);
            return unknownResult;
        } catch (err: any) {
            console.error(`[Tool Execution Error] ${name}:`, err);
            const errorResult = { error: `Failed: ${err.message}` };
            console.log(`[Tool Result] ${name}`, errorResult);
            return errorResult;
        }
    };

    const getEffectiveSystemInstruction = (mode: 'chat' | 'voice') => {
        const config = globalAssistantConfig;
        
        // 1. Start with base system instruction (editable by user)
        const promptConfig = getPromptRef.current('global-assistant-main');
        const baseInstruction = promptConfig ? promptConfig.template : config.systemInstruction;
        
        // 2. Get enabled templates (or use defaults if not set)
        const enabledTemplates = config.enabledTemplates || getDefaultEnabledTemplates();
        const templatesInstruction = compileTemplates(enabledTemplates, config.customInstructions);
        
        // 3. Build scope and permissions text
        const permissions = config.permissions || {};
        const allowedScopes = Object.keys(permissions).filter(key => permissions[key]?.[mode] === true);
        const isSuperAdmin = userDocumentRef.current?.role === 'superadmin';
        
        let scopeText = "";
        if (isSuperAdmin) {
            scopeText = `ACCESS: SUPER ADMIN.`;
        } else {
             if (Object.keys(permissions).length > 0) {
                 if (allowedScopes.length > 0) scopeText = `ACCESS: RESTRICTED. Allowed: ${allowedScopes.join(', ')}.`;
                 else scopeText = `ACCESS: READ ONLY.`;
             } else scopeText = "ACCESS: OWNER.";
        }

        // 4. Inject contextual data (fast, truncated for speed)
        const LIMIT = 20;
        const activeProject = activeProjectRef.current;

        const cmsContext = cmsPostsRef.current.length > 0 
            ? `Recent Posts: ${cmsPostsRef.current.slice(0, LIMIT).map(p => `"${p.title}" (ID:${p.id})`).join(', ')}.`
            : "CMS: Empty.";

        const leadsContext = leadsRef.current.length > 0
            ? `Recent Leads: ${leadsRef.current.slice(0, LIMIT).map(l => `"${l.name}" (${l.status}, ID:${l.id})`).join(', ')}.`
            : "CRM: Empty.";

        const domainsContext = domainsRef.current.length > 0
            ? `Domains: ${domainsRef.current.map(d => `"${d.name}" (ID:${d.id})`).join(', ')}.`
            : "Domains: Empty.";

        const projectList = projectsRef.current.slice(0, 15).map(p => `"${p.name}"`).join(', ');
        const projectContext = `Projects: [${projectList}].`;

        const activeContext = `STATE: Active Project: ${activeProject ? activeProject.name : "None"}. View: ${viewRef.current}.`;

        // Components context
        const enabledComponents = Object.entries(componentStatusRef.current || {})
            .filter(([_, enabled]) => enabled)
            .map(([key, _]) => key)
            .join(', ');
        const componentsContext = enabledComponents 
            ? `Available Components: ${enabledComponents}.`
            : "Components: All standard components available.";

        const customComponentsList = (customComponentsRef.current || [])
            .slice(0, 10)
            .map(c => `"${c.name}" (based on ${c.baseComponent})`)
            .join(', ');
        const customContext = customComponentsList 
            ? `Custom Components: ${customComponentsList}.`
            : "";

        // 5. Compile final instruction
        return `${baseInstruction}\n\n${templatesInstruction}\n\n${scopeText}\n\n${projectContext}\n${cmsContext}\n${leadsContext}\n${domainsContext}\n${componentsContext}\n${customContext}\n${activeContext}`;
    };

    // DEPRECATED: Old hardcoded content (now in prompt templates)
    // Kept here temporarily for reference, will be removed
    const _DEPRECATED_intelligenceNote = `
*** CRITICAL: MULTILINGUAL INTELLIGENT UNDERSTANDING ***

LANGUAGE CAPABILITIES:
- FULL BILINGUAL: Understand and respond in Spanish and English fluently
- AUTO-DETECT: Automatically detect user's language and respond in the same language
- MIXED LANGUAGES: Handle Spanglish and code-switching seamlessly
- TRANSLATE INTENT: Map concepts between languages intelligently

UNDERSTANDING RULES:
1. Focus on INTENT, not exact words
2. Recognize synonyms and similar concepts across languages
3. Handle typos, spelling mistakes, and abbreviations in both languages
4. Understand Spanish, English, and mixes (Spanglish)
5. Use context from previous messages
6. Infer missing details when reasonable
7. ALWAYS respond in the user's language (or match their language)

COMMON VARIATIONS YOU MUST UNDERSTAND:

NAVIGATION REQUESTS (all mean: go to editor):
- "abre el editor" / "abrir editor" / "open editor"
- "ve al editor" / "ir al editor" / "go to editor"
- "muestra el editor" / "show editor" / "editor"
- "quiero editar" / "want to edit"
- "lleva al editor" / "take me to editor"

CHANGE HERO TITLE (all mean: change hero headline):
- "cambia el titulo del hero" / "cambiar titulo hero"
- "modifica el titulo del hero" / "modificar titulo"
- "edita el titulo del hero" / "editar titulo"
- "pon el titulo del hero" / "poner titulo"
- "actualiza el titulo del hero" / "update hero title"
- "change hero title" / "change the hero title"
- WITH TYPOS: "cambia el titlo", "canbia el titulo", "titulo heroe"

CHANGE BACKGROUND COLOR (all mean: change background):
- "cambia el fondo a azul" / "cambiar fondo azul"
- "pon el fondo azul" / "poner fondo azul"
- "fondo azul" / "background blue"
- "color de fondo azul" / "background color blue"
- "hazlo azul" (with context) / "make it blue"
- WITH TYPOS: "cambia el fonfo", "ponlo asul", "cambiar el findo"

MAKE TEXT BIGGER (all mean: increase font size):
- "hazlo mas grande" / "make it bigger"
- "aumenta el tamaño" / "increase size"
- "pon el texto mas grande" / "make text bigger"
- "mas grande" / "bigger"
- "agrandar" / "agrandar texto"
- WITH TYPOS: "haslo mas grande", "mas grnade", "texto mas grannde"

ADD FEATURE (all mean: add feature item):
- "agrega una caracteristica" / "add a feature"
- "añade una feature" / "add feature"
- "crea una nueva caracteristica" / "create new feature"
- "pon una caracteristica" / "put a feature"
- "nueva feature" / "new feature"
- WITH TYPOS: "agrega una carateristica", "agregar feture"

HIDE SECTION (all mean: hide section):
- "oculta la seccion de precios" / "hide pricing section"
- "esconde los precios" / "hide pricing"
- "no mostrar precios" / "don't show pricing"
- "quita los precios" / "remove pricing"
- WITH TYPOS: "oculatar la seccion", "esconder los presios"

CHANGE FONT (all mean: change font family):
- "cambia la fuente a roboto" / "change font to roboto"
- "pon la letra en roboto" / "put font in roboto"
- "usa la fuente roboto" / "use roboto font"
- "fuente roboto" / "font roboto"
- WITH TYPOS: "cambiar la funte", "fuenta roboto"

KEY INSIGHT: If the user's intent is about EDITING, CHANGING, MODIFYING, UPDATING something → extract WHAT and TO WHAT, then execute.

EXAMPLE REASONING:
User: "ponlo mas grande"
→ Intent: increase size
→ Context needed: of what? (check previous messages or current view)
→ If talking about hero title: increase hero.headlineFontSize
→ Execute immediately

User: "cambia el fonfo del heroe a verde"
→ Intent: change background color (fonfo = typo for fondo)
→ Target: hero section
→ New value: green/verde
→ Execute: update hero.colors.background to green

WHEN TO ASK vs EXECUTE:
❓ ASK if: Truly don't know WHAT to change (e.g., "cambia algo")
✅ EXECUTE if: You know WHAT to change, even if request has typos/variations
✅ EXECUTE if: Context makes it obvious (they're in editor, discussing hero)
✅ EXECUTE if: It's a common reasonable interpretation

LANGUAGE DETECTION & RESPONSE RULES:
1. **AUTO-DETECT**: Identify if user is speaking Spanish, English, or mixed
2. **MATCH LANGUAGE**: Always respond in the same language as the user
3. **SPANGLISH OK**: If user mixes languages, pick dominant language or match their style
4. **CONSISTENCY**: Once you detect user's preferred language, keep using it
5. **NATURAL TONE**: Sound fluent and natural in both languages

RESPONSE STYLE:
- Match user's language (Spanish/English/Spanglish)
- Be brief and natural
- Confirm actions clearly in their language
- Ask SHORT clarifying questions when needed
- Use appropriate punctuation (¿? ¡! for Spanish)
- Cultural awareness (formal "usted" vs informal "tú" - use "tú" by default)

SPANISH RESPONSE PATTERNS:
- "✓ Cambié..." / "✓ Actualicé..." / "✓ Agregué..."
- "¿Qué [noun] quieres...?" / "¿Cuál es...?"
- "Listo" / "Hecho" / "Perfecto"

ENGLISH RESPONSE PATTERNS:
- "✓ Changed..." / "✓ Updated..." / "✓ Added..."
- "What [noun] would you like...?" / "Which...?"
- "Done" / "Complete" / "Perfect"
`;
        
        const conversationExamples = `
*** EXAMPLE CONVERSATIONS (learn from these) ***

Example 1: Spanish - Clear intent with typo
User: "cambia el titlo del hero a Bienvenido"
You: *calls update_site_content(path="hero.headline", value="Bienvenido")*
You: "✓ Cambié el título del hero a 'Bienvenido'"

Example 2: English - Same action
User: "change the hero title to Welcome"
You: *calls update_site_content(path="hero.headline", value="Welcome")*
You: "✓ Changed hero title to 'Welcome'"

Example 3: Spanish - Vague with context
User: "ponlo mas grande"
[Context: Just discussed hero title]
You: *calls update_site_content(path="hero.headlineFontSize", value="5xl")*
You: "✓ Aumenté el tamaño del título del hero"

Example 4: English - Vague with context
User: "make it bigger"
[Context: Discussing features title]
You: *calls update_site_content(path="features.titleFontSize", value="4xl")*
You: "✓ Increased the features title size"

Example 5: Spanish - Missing info, ask in Spanish
User: "agrega una feature"
You: "¿Qué característica quieres agregar? Necesito al menos el título y la descripción."

Example 6: English - Missing info, ask in English
User: "add a testimonial"
You: "What testimonial would you like to add? I need at least the quote and the person's name."

Example 7: Spanglish - Mixed language
User: "abre el editor please"
You: *calls change_view(viewName="editor")*
You: "✓ Abrí el editor"

Example 8: Spanish - Multiple variations
User: "esconde la seccion de precios"
You: *calls manage_sections(action="hide", section="pricing")*
You: "✓ Oculté la sección de precios"

Example 9: English - Same action
User: "hide the pricing section"
You: *calls manage_sections(action="hide", section="pricing")*
You: "✓ Hidden the pricing section"

Example 10: Spanish - Color change
User: "hazlo azul oscuro"
[Context: Discussing hero background]
You: *calls update_site_content(path="hero.colors.background", value="#1a2a4a")*
You: "✓ Cambié el fondo del hero a azul oscuro"

Example 11: English - Color change
User: "make it dark blue"
[Context: Discussing hero background]
You: *calls update_site_content(path="hero.colors.background", value="#1a2a4a")*
You: "✓ Changed hero background to dark blue"

Example 12: Spanish - Truly ambiguous
User: "cambia eso"
You: "¿Qué quieres cambiar? Por ejemplo:
- El título o texto de alguna sección
- Los colores o estilo
- El orden de las secciones
- La configuración del chatbot"

Example 13: English - Truly ambiguous
User: "change that"
You: "What would you like to change? For example:
- The title or text of a section
- Colors or styling
- Section order
- Chatbot configuration"

Example 14: Spanish - Navigate with typos
User: "llevame al edidor"
You: *calls change_view(viewName="editor")*
You: "✓ Te llevé al editor"

Example 15: English - Complex request
User: "increase the hero button size and make it green"
You: *calls update_site_content(path="hero.colors.buttonBackground", value="#22c55e")*
You: *calls update_site_content(path="hero.buttonSize", value="lg")* [if exists]
You: "✓ Made the hero button green and increased its size"
`;
    // END DEPRECATED

    const stopLiveSession = () => {
        isConnectedRef.current = false;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (processorRef.current && inputAudioContextRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (inputAudioContextRef.current) {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
        activeSourcesRef.current.forEach(source => source.stop());
        activeSourcesRef.current = [];
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (sessionRef.current) {
             sessionRef.current = null;
        }
        setIsLiveActive(false);
        setIsConnecting(false);
        nextStartTimeRef.current = 0;
    };

    const startLiveSession = async () => {
        if (hasApiKey === false) { await promptForKeySelection(); return; }
        setIsConnecting(true);
        try {
            const ai = await getGoogleGenAI();
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const outputCtx = new AudioContextClass({ sampleRate: 24000 });
            const inputCtx = new AudioContextClass({ sampleRate: 16000 });
            audioContextRef.current = outputCtx;
            inputAudioContextRef.current = inputCtx;
            nextStartTimeRef.current = outputCtx.currentTime;

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: globalAssistantConfig.voiceName } } },
                    tools: [{ functionDeclarations: TOOLS }],
                    systemInstruction: getEffectiveSystemInstruction('voice'),
                },
                callbacks: {
                    onopen: async () => {
                        setIsConnecting(false);
                        setIsLiveActive(true);
                        isConnectedRef.current = true;
                        try {
                            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                            streamRef.current = stream;
                            const source = inputCtx.createMediaStreamSource(stream);
                            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                            processorRef.current = processor;
                            processor.onaudioprocess = (e) => {
                                if (!isConnectedRef.current) return;
                                const inputData = e.inputBuffer.getChannelData(0);
                                const pcm16 = floatTo16BitPCM(inputData);
                                const base64Data = bytesToBase64(new Uint8Array(pcm16));
                                sessionPromise.then(session => {
                                     if (!isConnectedRef.current) return;
                                     try { session.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: base64Data } }); } catch (err) {}
                                });
                            };
                            source.connect(processor);
                            processor.connect(inputCtx.destination);
                        } catch (micErr) { stopLiveSession(); alert("Could not access microphone."); }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.interrupted) {
                            console.log('[Voice Mode] Audio interrupted');
                            activeSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
                            activeSourcesRef.current = [];
                            if (audioContextRef.current) nextStartTimeRef.current = audioContextRef.current.currentTime;
                            return;
                        }
                        if (message.toolCall) {
                            console.log('[Voice Mode] Function calls detected:', message.toolCall.functionCalls.map(fc => ({
                                name: fc.name,
                                args: fc.args
                            })));
                            const functionResponses = [];
                            for (const fc of message.toolCall.functionCalls) {
                                const { result, error } = await executeTool(fc.name, fc.args);
                                functionResponses.push({ id: fc.id, name: fc.name, response: { result: result || error || "Done" } });
                            }
                            console.log('[Voice Mode] Sending tool responses back to model');
                            sessionPromise.then(session => { if (isConnectedRef.current) session.sendToolResponse({ functionResponses }); });
                        }
                        const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (audioData && audioContextRef.current) {
                            console.log('[Voice Mode] Received audio response from model');
                            const ctx = audioContextRef.current;
                            const bytes = base64ToBytes(audioData);
                            const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
                            const source = ctx.createBufferSource();
                            source.buffer = buffer;
                            source.connect(ctx.destination);
                            const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            source.start(startTime);
                            nextStartTimeRef.current = startTime + buffer.duration;
                            activeSourcesRef.current.push(source);
                            source.onended = () => { activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source); };
                        }
                    },
                    onclose: () => stopLiveSession(),
                    onerror: () => { if (!isConnectedRef.current) return; }
                }
            });
            sessionRef.current = sessionPromise;
        } catch (error) { 
            handleApiError(error);
            setIsConnecting(false); 
            alert("Failed to start voice session."); 
        }
    };

    const handleTextSend = async () => {
        if (!input.trim()) return;
        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        
        if (!isLiveActive) {
            if (hasApiKey === false) { await promptForKeySelection(); return; }
            setIsThinking(true);
            try {
                 const ai = await getGoogleGenAI();
                 const chat = ai.chats.create({
                    // Use gemini-2.5-pro for better function calling obedience
                    model: 'gemini-2.5-pro', 
                    config: { 
                        systemInstruction: getEffectiveSystemInstruction('chat'), 
                        tools: [{ functionDeclarations: TOOLS }],
                        toolConfig: {
                            functionCallingConfig: {
                                mode: FunctionCallingConfigMode.AUTO,
                            }
                        }
                    },
                    history: messages.filter(m => !m.isToolOutput).map(m => ({ role: m.role, parts: [{ text: m.text }] }))
                 });
                 
                 let response = await chat.sendMessage({ message: userMsg });
                 console.log('[Global Assistant] Model Response:', {
                    text: response.text,
                    hasFunctionCalls: !!response.functionCalls,
                    functionCallsCount: response.functionCalls?.length || 0
                 });
                 
                 let functionCalls = response.functionCalls;
                 let turnCount = 0;
                 
                 // Loop for multi-step tool execution
                 while (functionCalls && functionCalls.length > 0 && turnCount < 5) {
                    turnCount++;
                    console.log(`[Global Assistant] Function calls detected (turn ${turnCount}):`, functionCalls.map(fc => ({
                        name: fc.name,
                        args: fc.args
                    })));
                    const functionResponses = [];
                    setIsExecutingCommands(true);

                    for (const call of functionCalls) {
                        const { result, error } = await executeTool(call.name, call.args);
                        const feedback = result || error || "Done";
                        // Don't show tool outputs in chat - just execute silently
                        functionResponses.push({ id: call.id, name: call.name, response: { result: feedback } });
                    }
                    
                    // Send results back to model
                    const toolParts = functionResponses.map(resp => ({ functionResponse: { id: resp.id, name: resp.name, response: resp.response } }));
                    response = await chat.sendMessage({ message: toolParts });
                    console.log('[Global Assistant] Model Response after tool execution:', {
                        text: response.text,
                        hasFunctionCalls: !!response.functionCalls,
                        functionCallsCount: response.functionCalls?.length || 0
                    });
                    functionCalls = response.functionCalls;
                 }
                setIsExecutingCommands(false);

                 // Final response from model after tools are done
                 if (response.text) {
                     setMessages(prev => [...prev, { role: 'model', text: response.text }]);
                 } else if (turnCount > 0) {
                     // If model executed tools but returned no text, confirm completion
                     setMessages(prev => [...prev, { role: 'model', text: "✓ Listo" }]);
                 } else {
                     // No tools called and no text response - shouldn't happen with AUTO mode
                     setMessages(prev => [...prev, { role: 'model', text: "Lo siento, no pude procesar esa solicitud." }]);
                 }

            } catch (e: any) { 
                console.error(e); 
                handleApiError(e); 
                const errorMessage = typeof e?.message === 'string' ? e.message : "Error processing request.";
                setMessages(prev => [...prev, { role: 'model', text: `Error: ${errorMessage}` }]); 
            } finally { 
                setIsThinking(false); 
                setIsExecutingCommands(false);
            }
        }
    };

    useEffect(() => { return () => stopLiveSession(); }, []);

    if (!isOpen) return (
        <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground p-3 rounded-full shadow-2xl hover:scale-110 transition-transform border-4 border-background animate-pulse-slow flex items-center justify-center group" title="Open Global Assistant">
            <img src={LOGO_URL} alt="Quimera" className="w-10 h-10 object-contain group-hover:rotate-12 transition-transform"/>
            <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        </button>
    );

    return (
        <div className={`fixed z-[60] bg-card border border-border shadow-2xl transition-all duration-300 flex flex-col overflow-hidden ${isExpanded ? 'inset-4 rounded-2xl' : 'bottom-6 right-6 w-[400px] h-[600px] rounded-2xl'}`}>
            <div className="p-4 flex justify-between items-center bg-primary text-primary-foreground shrink-0 cursor-pointer" onDoubleClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3">
                    <div className="relative"><img src={LOGO_URL} alt="Quimera Logo" className="w-10 h-10 object-contain bg-white/10 rounded-full p-1 border border-white/20" /><div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-primary ${isLiveActive ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`}></div></div>
                    <div><h3 className="font-bold text-sm leading-tight">Quimera Assistant</h3><p className="text-[10px] opacity-90 font-medium">{isLiveActive ? 'Listening...' : 'Online (Fast Mode)'}</p></div>
                </div>
                <div className="flex gap-1 items-center">
                    <button onClick={() => { setIsOnboardingOpenRef.current(true); setIsOpen(false); }} className="p-1.5 hover:bg-white/20 rounded-md transition-colors mr-1"><Wand2 size={18} /></button>
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-white/20 rounded-md transition-colors">{isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
                    <button onClick={() => { setIsOpen(false); stopLiveSession(); }} className="p-1.5 hover:bg-white/20 rounded-md transition-colors"><ChevronDown size={18} /></button>
                </div>
            </div>
            <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
                {hasApiKey === false && (
                    <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur flex flex-col items-center justify-center text-center p-6 gap-3">
                        <KeyRound size={40} className="text-primary" />
                        <h3 className="text-lg font-semibold">API key required</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Selecciona una clave de Google AI Studio para que el asistente pueda ejecutar acciones y responder.
                        </p>
                        <button
                            onClick={promptForKeySelection}
                            className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold shadow hover:opacity-90 transition"
                        >
                            Seleccionar API key
                        </button>
                    </div>
                )}
                {isLiveActive && (
                    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center text-foreground animate-fade-in-up">
                        <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-8 relative"><div className="absolute inset-0 rounded-full border border-primary/30 animate-ping opacity-30"></div><img src={LOGO_URL} alt="Quimera Logo" className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]" /></div>
                        <div className="flex items-center gap-1.5 h-16 mb-8">{visualizerLevels.map((height, i) => <div key={i} className="w-2 bg-primary rounded-full transition-all duration-75" style={{ height: `${height}px`, opacity: 0.5 + (height/50) }} />)}</div>
                        <p className="text-lg font-medium mb-2">Listening...</p>
                        <p className="text-xs text-muted-foreground text-center max-w-xs mb-8">Ask me to change colors, manage leads, update content, or create assets.</p>
                        <button onClick={stopLiveSession} className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-full text-sm font-bold transition-colors flex items-center border border-red-500/50"><PhoneOff size={16} className="mr-2" /> End Voice Session</button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-secondary/5">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && !msg.isToolOutput && <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mr-2 shrink-0 overflow-hidden"><img src={LOGO_URL} alt="Bot" className="w-5 h-5 object-contain" /></div>}
                            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : msg.isToolOutput ? 'bg-secondary/50 text-muted-foreground text-xs font-mono border border-dashed border-border w-full' : 'bg-card text-foreground border border-border rounded-tl-sm'}`}>
                                {msg.role === 'model' && !msg.isToolOutput ? <ReactMarkdown>{msg.text}</ReactMarkdown> : msg.text}
                            </div>
                             {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-secondary/50 border border-border flex items-center justify-center ml-2 shrink-0 overflow-hidden">{user?.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full object-cover" /> : <UserIcon size={16} className="text-muted-foreground" />}</div>}
                        </div>
                    ))}
                    {isExecutingCommands && (
                        <div className="flex justify-start">
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mr-2 shrink-0 overflow-hidden">
                                <img src={LOGO_URL} alt="Bot" className="w-5 h-5 object-contain animate-pulse" />
                            </div>
                            <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 size={14} className="animate-spin text-primary" />
                                <span>Ejecutando acciones...</span>
                            </div>
                        </div>
                    )}
                    {isThinking && <div className="flex justify-start"><div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mr-2 shrink-0 overflow-hidden"><img src={LOGO_URL} alt="Bot" className="w-5 h-5 object-contain" /></div><div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin text-primary" /><span>Thinking...</span></div></div>}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 bg-card border-t border-border shrink-0 opacity-100 transition-opacity" style={{ opacity: hasApiKey === false ? 0.4 : 1 }}>
                    <div className="flex items-center gap-2 bg-secondary/30 p-1.5 rounded-full border border-border focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                         <button onClick={() => setMessages([])} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-secondary rounded-full transition-colors" title="Clear Chat"><Trash2 size={18} /></button>
                        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTextSend()} placeholder="Type a message..." className="flex-1 bg-transparent px-2 text-sm outline-none text-foreground placeholder:text-muted-foreground/50" disabled={isLiveActive} />
                        {globalAssistantConfig.enableLiveVoice && <button onClick={startLiveSession} disabled={isConnecting || isLiveActive} className={`p-2 rounded-full transition-all ${isConnecting ? 'text-muted-foreground animate-spin' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`} title="Start Voice Mode">{isConnecting ? <Loader2 size={20} /> : <Mic size={20} />}</button>}
                        <button onClick={handleTextSend} disabled={!input.trim() || isThinking || isLiveActive || hasApiKey === false} className="p-2 bg-primary text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all hover:scale-105"><Send size={18} /></button>
                    </div>
                     <div className="mt-2 flex justify-between items-center px-2">
                         <p className="text-[10px] text-muted-foreground flex items-center"><span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${activeProject ? 'bg-green-500' : 'bg-gray-400'}`}></span> {activeProject ? `Active: ${activeProject.name}` : 'Dashboard Mode'}</p>
                         <div className="flex items-center gap-2">{userDocument?.role === 'superadmin' && <Shield size={10} className="text-yellow-500" />}<p className="text-[10px] text-muted-foreground">{userDocument?.role === 'superadmin' ? 'Admin Access' : 'User Access'}</p></div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalAiAssistant;
