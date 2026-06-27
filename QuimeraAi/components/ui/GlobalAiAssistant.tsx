
import React, { useState, useRef, useEffect } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { useAuth } from '../../contexts/core/AuthContext';
import { useUI } from '../../contexts/core/UIContext';
import { useProject } from '../../contexts/project';
import { useSafeTenant } from '../../contexts/tenant/TenantContext';
import { useCRM } from '../../contexts/crm';
import { useCMS } from '../../contexts/cms';
import { useAI } from '../../contexts/ai';
import { useDomains } from '../../contexts/domains';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import { FunctionDeclaration, Type, LiveServerMessage, Modality } from '@google/genai';
import { Send, Loader2, ChevronDown, Maximize2, Minimize2, Trash2, Mic, PhoneOff, Bot, X, User as UserIcon, Shield, Minus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { initialData } from '../../data/initialData';
import { LeadStatus, CMSPost, Lead, PageData } from '../../types';
import { getGoogleGenAI } from '../../utils/genAiClient';
import { generateContentViaProxy, extractTextFromResponse, generateMultimodalContentViaProxy } from '../../utils/geminiProxyClient';
import { captureCurrentView } from '../../utils/visionUtils';
import { PROMPT_TEMPLATES, compileTemplates, getDefaultEnabledTemplates } from '../../data/promptTemplates';
import { logApiCall } from '../../services/apiLoggingService';
import { supabase } from '../../supabase';
import { dateToTimestamp } from '../dashboard/appointments/utils/appointmentHelpers';
import { useTranslation } from 'react-i18next';
import { useServiceAvailability } from '../../hooks/useServiceAvailability';
import {
    buildCanonicalEmailDraftMetadata,
    createCanonicalEmailIdempotencyKey,
} from '../../services/email/emailModuleIntentService.ts';
import type { PlatformServiceId } from '../../types/serviceAvailability';
import {
    clearStoredGlobalAssistantEntryRequest,
    createGlobalAssistantEntryPayload,
    GLOBAL_ASSISTANT_ENTRY_EVENT,
    inferGlobalAssistantEntryModule,
    readStoredGlobalAssistantEntryRequest,
    type GlobalAssistantEntryPayload,
} from '../../services/globalAssistant/globalAssistantEntryBridge';
import {
    resolveOperatingLayerAccessContext,
    resolveOperatingLayerTenantContext,
} from '../../services/globalAssistant/globalAssistantCommandCenter';
import { resolveModuleFromRoute } from '../../services/globalAssistant/globalAssistantContextResolver';
import {
    isAssistantPlanCancellation,
    isAssistantPlanConfirmation,
} from '../../services/globalAssistant/globalAssistantConfirmation';
import { globalAssistantConversationService } from '../../services/globalAssistant/globalAssistantConversationService';
import {
    dispatchMediaGeneratorLaunchRequest,
    storeMediaGeneratorLaunchRequest,
} from '../../utils/mediaGeneratorLaunch';
import {
    isSpanishLocale,
    resolveComponentHelpGuideResponse,
    resolveDirectModuleGuideDecision,
    formatMissingProjectGuideMessage,
    resolveGuideOnlyActionResponse,
    resolveGuideOnlyFallbackResponse,
    resolveProjectMentionFromRequest,
    isProjectScopedGuideTarget,
} from '../../services/globalAssistant/globalAssistantModuleGuide';
import { globalAssistantRuntime } from '../../services/globalAssistant/globalAssistantRuntime';
import type {
    AssistantContextSnapshot,
    AssistantConversation,
    AssistantMessageRole,
    GlobalAssistantMode,
} from '../../types/globalAssistant';
import type { AdminView, View } from '../../types/ui';
// ... existing imports ...

// --- Types ---
interface Message {
    role: 'user' | 'model';
    text: string;
    isToolOutput?: boolean;
    contextSnapshotId?: string | null;
    memoryIds?: string[];
    actionIds?: string[];
    metadata?: Record<string, unknown>;
}

interface PendingOperatingLayerTask {
    taskId: string;
    context: AssistantContextSnapshot;
    actionLabels: string[];
}

// --- Tools Definition ---
const EDITOR_SECTION_IDS = [
    "header", "hero", "heroSplit", "features", "testimonials", "pricing", "faq", "cta",
    "services", "team", "video", "slideshow", "portfolio", "leads", "newsletter", "howItWorks",
    "map", "menu", "banner", "chatbot", "footer", "typography", "colors",
    "storeSettings", "products", "featuredProducts", "categoryGrid", "productHero",
    "saleCountdown", "trustBadges", "recentlyViewed", "productReviews", "collectionBanner",
    "productBundle", "announcementBar"
] as const;

type EditorSectionId = typeof EDITOR_SECTION_IDS[number];

const resolveEditorSectionId = (input: string): EditorSectionId | null => {
    const normalize = (s: string) =>
        String(s || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');

    const needle = normalize(input);
    if (!needle) return null;

    const synonyms: Record<string, EditorSectionId> = {
        // Core sections
        hero: 'hero',
        header: 'header',
        encabezado: 'header',
        cabecera: 'header',
        footer: 'footer',
        pie: 'footer',
        piedepagina: 'footer',
        // Content sections
        caracteristicas: 'features',
        features: 'features',
        testimonios: 'testimonials',
        testimonials: 'testimonials',
        precios: 'pricing',
        pricing: 'pricing',
        preguntas: 'faq',
        faq: 'faq',
        servicios: 'services',
        services: 'services',
        equipo: 'team',
        team: 'team',
        portafolio: 'portfolio',
        portfolio: 'portfolio',
        comofunciona: 'howItWorks',
        howitworks: 'howItWorks',
        pasos: 'howItWorks',
        // Additional sections
        cta: 'cta',
        llamadaalaaccion: 'cta',
        video: 'video',
        slideshow: 'slideshow',
        galeria: 'slideshow',
        carrusel: 'slideshow',
        leads: 'leads',
        formulario: 'leads',
        contacto: 'leads',
        newsletter: 'newsletter',
        boletin: 'newsletter',
        map: 'map',
        mapa: 'map',
        menu: 'menu',
        carta: 'menu',
        banner: 'banner',
        chatbot: 'chatbot',
        // Hero variants
        herosplit: 'heroSplit',
        // Styling
        tipografia: 'typography',
        typography: 'typography',
        fuentes: 'typography',
        colores: 'colors',
        colors: 'colors',
        paleta: 'colors',
        // Ecommerce
        storesettings: 'storeSettings',
        tienda: 'storeSettings',
        featuredproducts: 'featuredProducts',
        productosdestacados: 'featuredProducts',
        categorygrid: 'categoryGrid',
        categorias: 'categoryGrid',
        producthero: 'productHero',
        salecountdown: 'saleCountdown',
        oferta: 'saleCountdown',
        trustbadges: 'trustBadges',
        confianza: 'trustBadges',
        recentlyviewed: 'recentlyViewed',
        vistosrecientemente: 'recentlyViewed',
        productreviews: 'productReviews',
        resenas: 'productReviews',
        collectionbanner: 'collectionBanner',
        productbundle: 'productBundle',
        paquetes: 'productBundle',
        announcementbar: 'announcementBar',
        anuncio: 'announcementBar',
        products: 'products',
        productos: 'products',
    };
    if (synonyms[needle]) return synonyms[needle];

    for (const id of EDITOR_SECTION_IDS) {
        if (normalize(id) === needle) return id;
    }
    return null;
};

const OPEN_SECTION_TOOLS: FunctionDeclaration[] = EDITOR_SECTION_IDS.map((sectionName) => ({
    name: `open_${sectionName}`,
    description: `Open the editor Properties panel for the '${sectionName}' section.`,
    parameters: {
        type: Type.OBJECT,
        properties: {},
    },
}));

const SECTION_ITEM_TOOLS: FunctionDeclaration[] = [
    {
        name: 'open_features_item',
        description: 'Open Features and scroll to a specific feature item (1-based index).',
        parameters: { type: Type.OBJECT, properties: { index: { type: Type.NUMBER } }, required: ['index'] }
    },
    {
        name: 'open_testimonials_item',
        description: 'Open Testimonials and scroll to a specific testimonial (1-based index).',
        parameters: { type: Type.OBJECT, properties: { index: { type: Type.NUMBER } }, required: ['index'] }
    },
    {
        name: 'open_pricing_tier',
        description: 'Open Pricing and scroll to a specific pricing tier (1-based index).',
        parameters: { type: Type.OBJECT, properties: { index: { type: Type.NUMBER } }, required: ['index'] }
    },
    {
        name: 'open_services_item',
        description: 'Open Services and scroll to a specific service item (1-based index).',
        parameters: { type: Type.OBJECT, properties: { index: { type: Type.NUMBER } }, required: ['index'] }
    },
    {
        name: 'open_faq_item',
        description: 'Open FAQ and scroll to a specific question (1-based index).',
        parameters: { type: Type.OBJECT, properties: { index: { type: Type.NUMBER } }, required: ['index'] }
    },
    {
        name: 'open_menu_item',
        description: 'Open Menu and scroll to a specific dish item (1-based index).',
        parameters: { type: Type.OBJECT, properties: { index: { type: Type.NUMBER } }, required: ['index'] }
    },
    {
        name: 'open_howItWorks_step',
        description: 'Open How It Works and scroll to a specific step (1-based index).',
        parameters: { type: Type.OBJECT, properties: { index: { type: Type.NUMBER } }, required: ['index'] }
    },
    {
        name: 'open_section_item',
        description: 'Open an editor section and scroll to an item (1-based index).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                sectionName: { type: Type.STRING, enum: ["features", "testimonials", "pricing", "services", "faq", "menu", "howItWorks"] },
                index: { type: Type.NUMBER }
            },
            required: ['sectionName', 'index']
        }
    },
];

const TOOLS: FunctionDeclaration[] = [
    {
        name: 'change_view',
        description: 'Navigate to a different section. Views: dashboard, websites, editor, cms, assets, navigation, superadmin, ai-assistant, leads, domains, seo, finance, templates, appointments, ecommerce, email, biopage, agency, settings.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                viewName: {
                    type: Type.STRING,
                    enum: ["dashboard", "websites", "editor", "cms", "assets", "navigation", "superadmin", "ai-assistant", "leads", "domains", "seo", "finance", "templates", "appointments", "ecommerce", "email", "biopage", "agency", "settings"]
                }
            },
            required: ['viewName']
        }
    },
    // One tool per editor section (no args): open_hero, open_features, ...
    ...OPEN_SECTION_TOOLS,
    // Tools to focus list items inside Properties
    ...SECTION_ITEM_TOOLS,
    {
        name: 'deep_search',
        description: 'Search for ANY entity across the entire application (Products, Orders, Leads, Posts, etc.). Use this to find IDs or details.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: { type: Type.STRING, description: 'Search term (e.g. "invoice 123", "John Doe", "blue shirt")' },
                entities: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, enum: ['products', 'orders', 'leads', 'posts', 'appointments', 'campaigns'] },
                    description: 'Specific entities to search (optional, defaults to all)'
                }
            },
            required: ['query']
        }
    },
    {
        name: 'select_section',
        description: 'Open the editor controls for a specific website section/component and focus it in the sidebar.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                sectionName: {
                    type: Type.STRING,
                    enum: [
                        "header", "hero", "heroSplit", "features", "testimonials", "pricing", "faq", "cta",
                        "services", "team", "video", "slideshow", "portfolio", "leads", "newsletter", "howItWorks",
                        "map", "menu", "banner", "chatbot", "footer", "typography", "colors",
                        "storeSettings", "products", "featuredProducts", "categoryGrid", "productHero",
                        "saleCountdown", "trustBadges", "recentlyViewed", "productReviews", "collectionBanner",
                        "productBundle", "announcementBar"
                    ]
                }
            },
            required: ['sectionName']
        }
    },
    {
        name: 'update_project_theme',
        description: 'Update the active project theme (used by the Properties panel). Supports dot-paths like "buttonBorderRadius", "fontFamilyHeader", "palette.primary", etc.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: 'Dot-path to a theme field, e.g. "buttonBorderRadius" or "palette.primary".' },
                value: { type: Type.STRING, description: 'Value to set. If you need boolean/number/object/array, pass JSON (e.g. true, 12, {"a":1}).' }
            },
            required: ['path', 'value']
        }
    },
    {
        name: 'manage_cms_post',
        description: 'Manage CMS posts.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['create', 'update', 'delete', 'get'] },
                id: { type: Type.STRING, description: 'Post ID (required for update/delete/get).' },
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                status: { type: Type.STRING, enum: ['draft', 'published'] }
            },
            required: ['action']
        }
    },
    {
        name: 'manage_lead',
        description: 'Manage CRM leads. Use this to MOVE leads (e.g. "move lead to negotiation" -> update status), change status, or update details.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['create', 'update', 'delete', 'get'] },
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
                    enum: ['features', 'testimonials', 'pricing', 'faq', 'portfolio', 'services', 'team', 'slideshow', 'howItWorks', 'menu'],
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
    },
    {
        name: 'update_project_seo',
        description: 'Update SEO config for the active project.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                updates: { type: Type.OBJECT, description: 'Partial SEO config fields to merge (title, description, keywords, robots, canonical, og*, twitter*, etc.)' }
            },
            required: ['updates']
        }
    },
    {
        name: 'update_global_seo',
        description: 'Update global SEO defaults (Super Admin).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                defaultLanguage: { type: Type.STRING },
                defaultRobots: { type: Type.STRING },
                defaultSchemaType: { type: Type.STRING },
                defaultOgType: { type: Type.STRING },
                defaultTwitterCard: { type: Type.STRING },
                aiCrawlingEnabled: { type: Type.BOOLEAN },
                googleVerification: { type: Type.STRING },
                bingVerification: { type: Type.STRING },
                aiDescriptionTemplate: { type: Type.STRING },
                defaultAiTopics: { type: Type.STRING }
            }
        }
    },
    {
        name: 'manage_template',
        description: 'Create/duplicate/archive templates.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['create', 'duplicate', 'archive', 'unarchive'] },
                templateId: { type: Type.STRING }
            },
            required: ['action']
        }
    },
    {
        name: 'manage_appointment',
        description: 'Create/update/delete appointments.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['create', 'update', 'delete', 'status', 'get'] },
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                startDate: { type: Type.STRING, description: 'ISO datetime (e.g., 2025-12-12T15:00:00Z)' },
                endDate: { type: Type.STRING, description: 'ISO datetime (e.g., 2025-12-12T15:30:00Z)' },
                status: { type: Type.STRING, description: 'Appointment status (scheduled, confirmed, completed, cancelled, no_show, etc.)' }
            },
            required: ['action']
        }
    },
    {
        name: 'email_settings',
        description: 'Update email marketing settings for the active project.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                updates: { type: Type.OBJECT },
                projectId: { type: Type.STRING, description: 'Optional override; defaults to active project id.' }
            },
            required: ['updates']
        }
    },
    {
        name: 'email_campaign',
        description: 'Create/update/delete an email campaign for the active project.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['create', 'update', 'delete', 'get'] },
                projectId: { type: Type.STRING, description: 'Optional override; defaults to active project id.' },
                campaignId: { type: Type.STRING },
                campaign: { type: Type.OBJECT, description: 'Campaign fields (name, subject, type, content, audienceType, status, etc.)' }
            },
            required: ['action']
        }
    },
    {
        name: 'ecommerce_project',
        description: 'Enable/disable ecommerce for a project (storeId == projectId).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['enable', 'disable'] },
                projectId: { type: Type.STRING, description: 'Optional override; defaults to active project id.' },
                projectName: { type: Type.STRING, description: 'Optional; used for store naming on first enable.' }
            },
            required: ['action']
        }
    },
    {
        name: 'ecommerce_product',
        description: 'Create/update/delete a product in the active project store.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['create', 'update', 'delete', 'get'] },
                productId: { type: Type.STRING },
                projectId: { type: Type.STRING, description: 'Optional override; defaults to active project id.' },
                product: { type: Type.OBJECT, description: 'Product fields to set/merge' }
            },
            required: ['action']
        }
    },
    {
        name: 'ecommerce_order',
        description: 'Manage/Get orders in the active project store.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['update_status', 'get'] },
                orderId: { type: Type.STRING },
                projectId: { type: Type.STRING, description: 'Optional override; defaults to active project id.' },
                status: { type: Type.STRING, description: 'Order status (pending, paid, shipped, delivered, cancelled, refunded, etc.)' }
            },
            required: ['action']
        }
    },
    {
        name: 'finance_expense',
        description: 'Create/update/delete finance expenses for the active project.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['create', 'update', 'delete', 'get'] },
                projectId: { type: Type.STRING, description: 'Optional override; defaults to active project id.' },
                expenseId: { type: Type.STRING },
                expense: { type: Type.OBJECT, description: 'Expense fields (date, supplier, category, subtotal, tax, total, currency, items, status, originalFileUrl)' }
            },
            required: ['action']
        }
    }
];

const GUIDE_ONLY_TOOL_NAMES = new Set([
    'change_view',
    'navigate_admin',
    'load_project',
    'select_section',
    'open_section_item',
]);

const isGuideOnlyToolName = (toolName: string): boolean =>
    GUIDE_ONLY_TOOL_NAMES.has(toolName) || toolName.startsWith('open_');

const GLOBAL_ASSISTANT_GUIDE_ONLY_TOOLS = TOOLS.filter(tool => isGuideOnlyToolName(tool.name));
const TOOL_NAMES = TOOLS.map(tool => tool.name);

/**
 * Maps tool names to their required PlatformServiceId.
 * Tools not listed here have no service requirement (always available).
 * Also maps change_view viewName values to services.
 */
const TOOL_SERVICE_MAP: Record<string, PlatformServiceId> = {
    // Tool-level gate
    ecommerce_project: 'ecommerce',
    ecommerce_product: 'ecommerce',
    ecommerce_order: 'ecommerce',
    manage_cms_post: 'cms',
    manage_lead: 'crm',
    update_chat_config: 'chatbot',
    email_settings: 'emailMarketing',
    email_campaign: 'emailMarketing',
    manage_appointment: 'appointments',
    manage_domain: 'domains',
    finance_expense: 'finance',
};

/** Maps change_view enum values to their required service */
const VIEW_SERVICE_MAP: Record<string, PlatformServiceId> = {
    ecommerce: 'ecommerce',
    cms: 'cms',
    leads: 'crm',
    'ai-assistant': 'chatbot',
    email: 'emailMarketing',
    appointments: 'appointments',
    domains: 'domains',
    finance: 'finance',
};

const DATA_SCHEMA_HINT = `
*** COMPLETE PATHS GUIDE (update_site_content) ***

THEME (Global):
- theme.fontFamilyHeader, theme.fontFamilyBody, theme.fontFamilyButton
- theme.cardBorderRadius, theme.buttonBorderRadius

HEADER:
- header.logoText, header.style, header.layout, header.logoType
- header.colors?.background, header.colors?.text, header.colors?.accent
- header.showCta, header.ctaText, header.showLogin

HERO:
- hero.headline, hero.subheadline, hero.primaryCta, hero.secondaryCta
- hero.headlineFontSize, hero.subheadlineFontSize
- hero.colors?.primary, hero.colors?.secondary, hero.colors?.background, hero.colors?.heading, hero.colors?.text
- hero.colors?.buttonBackground, hero.colors?.buttonText
- hero.imageUrl, hero.imageStyle, hero.paddingY, hero.paddingX

FEATURES:
- features.title, features.description, features.titleFontSize, features.descriptionFontSize
- features.colors?.background, features.colors?.accent, features.colors?.borderColor, features.colors?.text, features.colors?.heading
- features.gridColumns, features.paddingY, features.paddingX
- features.imageHeight, features.imageObjectFit

TESTIMONIALS:
- testimonials.title, testimonials.description, testimonials.titleFontSize, testimonials.descriptionFontSize
- testimonials.colors?.background, testimonials.colors?.accent, testimonials.colors?.borderColor, testimonials.colors?.text, testimonials.colors?.heading
- testimonials.paddingY, testimonials.paddingX

SLIDESHOW:
- slideshow.title, slideshow.titleFontSize
- slideshow.colors?.background, slideshow.colors?.heading
- slideshow.paddingY, slideshow.paddingX

PRICING:
- pricing.title, pricing.description, pricing.titleFontSize, pricing.descriptionFontSize
- pricing.colors?.background, pricing.colors?.accent, pricing.colors?.borderColor, pricing.colors?.text, pricing.colors?.heading
- pricing.colors?.buttonBackground, pricing.colors?.buttonText
- pricing.paddingY, pricing.paddingX

FAQ:
- faq.title, faq.description, faq.titleFontSize, faq.descriptionFontSize
- faq.colors?.background, faq.colors?.accent, faq.colors?.borderColor, faq.colors?.text, faq.colors?.heading
- faq.paddingY, faq.paddingX

LEADS (Contact Form):
- leads.title, leads.description, leads.buttonText, leads.titleFontSize, leads.descriptionFontSize
- leads.colors?.background, leads.colors?.accent, leads.colors?.borderColor, leads.colors?.text, leads.colors?.heading
- leads.colors?.buttonBackground, leads.colors?.buttonText
- leads.paddingY, leads.paddingX

NEWSLETTER:
- newsletter.title, newsletter.description, newsletter.buttonText, newsletter.placeholderText
- newsletter.titleFontSize, newsletter.descriptionFontSize
- newsletter.colors?.background, newsletter.colors?.accent, newsletter.colors?.borderColor, newsletter.colors?.text, newsletter.colors?.heading
- newsletter.colors?.buttonBackground, newsletter.colors?.buttonText
- newsletter.paddingY, newsletter.paddingX

CTA (Call to Action):
- cta.title, cta.description, cta.buttonText, cta.titleFontSize, cta.descriptionFontSize
- cta.colors?.gradientStart, cta.colors?.gradientEnd, cta.colors?.text, cta.colors?.heading
- cta.colors?.buttonBackground, cta.colors?.buttonText
- cta.paddingY, cta.paddingX

PORTFOLIO:
- portfolio.title, portfolio.description, portfolio.titleFontSize, portfolio.descriptionFontSize
- portfolio.colors?.background, portfolio.colors?.accent, portfolio.colors?.borderColor, portfolio.colors?.text, portfolio.colors?.heading
- portfolio.paddingY, portfolio.paddingX

SERVICES:
- services.title, services.description, services.titleFontSize, services.descriptionFontSize
- services.colors?.background, services.colors?.accent, services.colors?.borderColor, services.colors?.text, services.colors?.heading
- services.paddingY, services.paddingX

TEAM:
- team.title, team.description, team.titleFontSize, team.descriptionFontSize
- team.colors?.background, team.colors?.text, team.colors?.heading
- team.paddingY, team.paddingX

VIDEO:
- video.title, video.description, video.titleFontSize, video.descriptionFontSize
- video.source, video.videoId, video.videoUrl, video.autoplay, video.loop, video.showControls
- video.colors?.background, video.colors?.text, video.colors?.heading
- video.paddingY, video.paddingX

HOWITWORKS:
- howItWorks.title, howItWorks.description, howItWorks.steps, howItWorks.titleFontSize, howItWorks.descriptionFontSize
- howItWorks.colors?.background, howItWorks.colors?.accent, howItWorks.colors?.text, howItWorks.colors?.heading
- howItWorks.paddingY, howItWorks.paddingX

FOOTER:
- footer.title, footer.description, footer.copyrightText, footer.titleFontSize, footer.descriptionFontSize
- footer.colors?.background, footer.colors?.border, footer.colors?.text, footer.colors?.linkHover, footer.colors?.heading

CHATBOT:
- chatbot.welcomeMessage, chatbot.placeholderText, chatbot.knowledgeBase, chatbot.position, chatbot.isActive
- chatbot.colors?.primary, chatbot.colors?.text, chatbot.colors?.background

EXAMPLES:
- Change hero headline: path="hero.headline", value="Welcome to Our Site!"
- Change title size: path="hero.headlineFontSize", value="6xl"
- Change background: path="hero.colors?.background", value="#1a1a1a"
- Change padding: path="hero.paddingY", value="xl"
- Change font family: path="theme.fontFamilyHeader", value="playfair-display"
- Change button color: path="hero.colors?.buttonBackground", value="#ff6b6b"
- Enable chatbot: path="chatbot.isActive", value="true"
- Change grid columns: path="features.gridColumns", value="3"
`;

// ACTION_PROTOCOL removed - this content is now managed via the 'coreMandate' prompt template
// in the admin panel (promptTemplates.ts). No more hardcoded instructions.

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

// Helper to generate compact schema for AI to prevent hallucinations
const generateDataSchema = (data: any): string => {
    if (!data) return "No data available";

    const lines: string[] = [];
    Object.keys(data).forEach(sectionKey => {
        const section = data[sectionKey];
        if (typeof section !== 'object' || section === null) return;
        if (sectionKey === 'activePage' || sectionKey === 'pages') return; // Skip complex internal objects

        const props: string[] = [];
        Object.keys(section).forEach(propKey => {
            const val = section[propKey];
            const type = typeof val;

            if (type === 'string' || type === 'number' || type === 'boolean') {
                props.push(propKey);
            } else if (type === 'object' && val !== null && !Array.isArray(val)) {
                // Nested object (recurse one level specifically for colors/styles)
                const subKeys = Object.keys(val);
                if (subKeys.length > 0) {
                    // Compact format: colors.{bg,text}
                    // Truncate if too many subkeys
                    const displayKeys = subKeys.length > 8 ? subKeys.slice(0, 8).concat('...') : subKeys;
                    props.push(`${propKey}.{${displayKeys.join(',')}}`);
                }
            } else if (Array.isArray(val)) {
                props.push(`${propKey}[]`);
            }
        });

        // Only add sections that have properties
        if (props.length > 0) {
            lines.push(`- ${sectionKey}: [${props.join(', ')}]`);
        }
    });
    return lines.join('\n');
};

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

const PROTECTED_EMAIL_SETTING_KEYS = new Set([
    'api_key',
    'apiKey',
    'api_key_configured',
    'apiKeyConfigured',
    'provider_status',
    'providerStatus',
    'domain_status',
    'domainStatus',
    'dkim_status',
    'dkimStatus',
    'spf_status',
    'spfStatus',
    'dmarc_status',
    'dmarcStatus',
    'webhook_configured',
    'webhookConfigured',
    'test_email_sent_at',
    'testEmailSentAt',
    'readiness',
]);

const stripUndefinedValues = <T extends Record<string, any>>(value: T): T =>
    Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;

const sanitizeEmailSettingsUpdates = (updates: any, projectId: string, userId: string) => {
    const cleaned = Object.fromEntries(
        Object.entries(updates || {}).filter(([key]) => !PROTECTED_EMAIL_SETTING_KEYS.has(key))
    ) as Record<string, any>;

    return stripUndefinedValues({
        ...cleaned,
        project_id: projectId,
        store_id: projectId,
        user_id: userId,
        source_module: 'ai-studio',
        source_component: 'GlobalAiAssistant',
        source_event: 'email_settings_update',
        updated_at: new Date().toISOString(),
        metadata: {
            ...(cleaned.metadata && typeof cleaned.metadata === 'object' ? cleaned.metadata : {}),
            canonicalEmailSettings: true,
            managedBy: 'GlobalAiAssistant',
            secretsManagedServerSide: true,
        },
    });
};

const buildAiEmailCampaignPayload = (
    campaign: any,
    projectId: string,
    userId: string,
    mode: 'create' | 'update',
    campaignId?: string,
) => {
    const now = new Date().toISOString();
    const sourceEvent = mode === 'create' ? 'ai_campaign_create' : 'ai_campaign_update';
    const subject = campaign?.subject || campaign?.title || (mode === 'create' ? 'AI email draft' : undefined);
    const name = campaign?.name || campaign?.title || subject;
    const idempotencyKey = createCanonicalEmailIdempotencyKey({
        sourceModule: 'ai-studio',
        sourceEvent,
        sourceEntityType: 'email_campaign',
        sourceEntityId: campaignId || name || subject || now,
        projectId,
    });

    const payload = {
        ...(mode === 'create' ? {
            name: name || 'AI email draft',
            subject: subject || 'AI email draft',
            type: campaign?.type || 'module_generated',
            preview_text: campaign?.previewText ?? campaign?.preview_text ?? '',
            html_content: campaign?.htmlContent ?? campaign?.html_content ?? campaign?.content ?? '',
            email_document: campaign?.emailDocument ?? campaign?.email_document,
            audience_type: campaign?.audienceType ?? campaign?.audience_type ?? 'custom',
            audience_segment_id: campaign?.audienceSegmentId ?? campaign?.audience_segment_id,
            custom_recipient_emails: campaign?.customRecipientEmails ?? campaign?.custom_recipient_emails,
            stats: campaign?.stats || {},
            tags: campaign?.tags || ['ai-studio'],
            created_by: userId,
            created_at: now,
        } : {
            name: campaign?.name,
            subject: campaign?.subject,
            type: campaign?.type,
            preview_text: campaign?.previewText ?? campaign?.preview_text,
            html_content: campaign?.htmlContent ?? campaign?.html_content ?? campaign?.content,
            email_document: campaign?.emailDocument ?? campaign?.email_document,
            audience_type: campaign?.audienceType ?? campaign?.audience_type,
            audience_segment_id: campaign?.audienceSegmentId ?? campaign?.audience_segment_id,
            custom_recipient_emails: campaign?.customRecipientEmails ?? campaign?.custom_recipient_emails,
            tags: campaign?.tags,
        }),
        project_id: projectId,
        store_id: projectId,
        user_id: userId,
        status: 'draft',
        generated_by_ai: true,
        needs_review: true,
        user_modified: false,
        safe_to_edit: true,
        send_mode: 'draft_only',
        source_module: 'ai-studio',
        source_component: 'GlobalAiAssistant',
        source_event: sourceEvent,
        source_entity_type: 'email_campaign',
        source_entity_id: campaignId,
        correlation_id: idempotencyKey,
        idempotency_key: idempotencyKey,
        updated_at: now,
        metadata: {
            ...(campaign?.metadata && typeof campaign.metadata === 'object' ? campaign.metadata : {}),
            canonicalEmail: buildCanonicalEmailDraftMetadata({
                sourceModule: 'ai-studio',
                sourceComponent: 'GlobalAiAssistant',
                sourceEvent,
                sourceEntityType: 'email_campaign',
                sourceEntityId: campaignId || idempotencyKey,
                projectId,
                generatedByAI: true,
                needsReview: true,
                safeToEdit: true,
                consentSource: 'ai-studio',
                extra: {
                    action: mode,
                    idempotencyKey,
                },
            }),
        },
    };

    return stripUndefinedValues(payload);
};

const LOGO_URL = "/logos/quimera-icon.svg";

const buildConversationTitle = (request: string): string => {
    const normalized = request.replace(/\s+/g, ' ').trim();
    return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
};

const toStoredAssistantMessageRole = (role: Message['role']): AssistantMessageRole =>
    role === 'user' ? 'user' : 'assistant';

const formatOperatingLayerAccessLabel = (mode: GlobalAssistantMode): string => {
    if (mode === 'super_admin') return 'Admin';
    if (mode === 'owner') return 'Owner';
    if (mode === 'support') return 'Support';
    return 'Usuario';
};

const GlobalAiAssistant: React.FC = () => {
    const { t, i18n } = useTranslation();
    const {
        userDocument, setAdminView, data, setData, themeMode, setThemeMode, loadProject, activeProject,
        hasApiKey, promptForKeySelection, handleApiError, globalAssistantConfig,
        theme, setTheme,
        getPrompt,
        updateSeoConfig,
        componentStatus, customComponents
    } = useEditor();

    const { user } = useAuth();
    const tenantContext = useSafeTenant();
    const {
        view,
        setView,
        setIsOnboardingOpen,
        setOnboardingMode,
        onSectionSelect: uiOnSectionSelect,
        onSectionItemSelect,
    } = useUI();
    const { navigate, navigateToEditor, navigateToView, path } = useRouter();
    const {
        projects,
        addNewProject,
        brandIdentity,
        setBrandIdentity,
        componentOrder,
        setComponentOrder,
        sectionVisibility,
        setSectionVisibility,
        createNewTemplate,
        archiveTemplate,
        duplicateTemplate,
    } = useProject();
    const { leads, addLead, updateLead, updateLeadStatus, deleteLead } = useCRM();
    const { cmsPosts, saveCMSPost, deleteCMSPost } = useCMS();
    const { aiAssistantConfig, saveAiAssistantConfig, generateImage } = useAI();
    const { domains, addDomain, deleteDomain, verifyDomain } = useDomains();
    const { canAccessService, isLoading: isLoadingServices } = useServiceAvailability();

    // Global kill switch (Super Admin)
    if (globalAssistantConfig?.isEnabled === false) return null;

    // State
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([{ role: 'model', text: globalAssistantConfig.greeting }]);
    const [isThinking, setIsThinking] = useState(false);
    const [isExecutingCommands, setIsExecutingCommands] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false); // New state for minimize mode
    const [pendingOperatingLayerTask, setPendingOperatingLayerTask] = useState<PendingOperatingLayerTask | null>(null);

    // Auto-minimize on mobile for specific routes (e.g., biopage)
    useEffect(() => {
        if (window.innerWidth < 768 && path.includes('/biopage')) {
            setIsMinimized(true);
        }
    }, [path]);

    // Voice State
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [visualizerLevels, setVisualizerLevels] = useState([1, 1, 1, 1]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const processTextRequestRef = useRef<((request: string, entry?: GlobalAssistantEntryPayload) => Promise<void>) | null>(null);
    const pendingOperatingLayerTaskRef = useRef<PendingOperatingLayerTask | null>(null);
    const assistantConversationRef = useRef<AssistantConversation | null>(null);
    const assistantConversationIdRef = useRef<string | null>(null);
    const persistedMessageCountRef = useRef(1);

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
    const onSectionSelectRef = useRef(uiOnSectionSelect);
    const onSectionItemSelectRef = useRef(onSectionItemSelect);
    const setViewRef = useRef(setView);
    const navigateRef = useRef(navigate);
    const navigateToEditorRef = useRef(navigateToEditor);
    const navigateToViewRef = useRef(navigateToView);
    const setAdminViewRef = useRef(setAdminView);
    const setThemeModeRef = useRef(setThemeMode);
    const setThemeRef = useRef(setTheme);
    const userDocumentRef = useRef(userDocument);
    const getPromptRef = useRef(getPrompt);
    const componentStatusRef = useRef(componentStatus);
    const customComponentsRef = useRef(customComponents);
    const lastToolCallRef = useRef<{ name: string; args: string; timestamp: number } | null>(null);
    const addNewProjectRef = useRef(addNewProject);
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
    const updateSeoConfigRef = useRef(updateSeoConfig);
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
    const createNewTemplateRef = useRef(createNewTemplate);
    const archiveTemplateRef = useRef(archiveTemplate);
    const duplicateTemplateRef = useRef(duplicateTemplate);
    const globalAssistantConfigRef = useRef(globalAssistantConfig);
    const tenantContextRef = useRef(tenantContext);

    // Sync Refs
    useEffect(() => { dataRef.current = data; }, [data]);
    useEffect(() => { themeRef.current = theme; }, [theme]);
    useEffect(() => { projectsRef.current = projects; }, [projects]);
    useEffect(() => { loadProjectRef.current = loadProject; }, [loadProject]);
    useEffect(() => { themeModeRef.current = themeMode; }, [themeMode]);
    useEffect(() => { onSectionSelectRef.current = uiOnSectionSelect; }, [uiOnSectionSelect]);
    useEffect(() => { onSectionItemSelectRef.current = onSectionItemSelect; }, [onSectionItemSelect]);
    useEffect(() => { setViewRef.current = setView; }, [setView]);
    useEffect(() => { navigateRef.current = navigate; }, [navigate]);
    useEffect(() => { navigateToEditorRef.current = navigateToEditor; }, [navigateToEditor]);
    useEffect(() => { navigateToViewRef.current = navigateToView; }, [navigateToView]);
    useEffect(() => { setAdminViewRef.current = setAdminView; }, [setAdminView]);
    useEffect(() => { setThemeModeRef.current = setThemeMode; }, [setThemeMode]);
    useEffect(() => { setThemeRef.current = setTheme; }, [setTheme]);
    useEffect(() => { userDocumentRef.current = userDocument; }, [userDocument]);
    useEffect(() => { getPromptRef.current = getPrompt; }, [getPrompt]);
    useEffect(() => { componentStatusRef.current = componentStatus; }, [componentStatus]);
    useEffect(() => { customComponentsRef.current = customComponents; }, [customComponents]);
    useEffect(() => { addNewProjectRef.current = addNewProject; }, [addNewProject]);
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
    useEffect(() => { updateSeoConfigRef.current = updateSeoConfig; }, [updateSeoConfig]);
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
    useEffect(() => { createNewTemplateRef.current = createNewTemplate; }, [createNewTemplate]);
    useEffect(() => { archiveTemplateRef.current = archiveTemplate; }, [archiveTemplate]);
    useEffect(() => { duplicateTemplateRef.current = duplicateTemplate; }, [duplicateTemplate]);
    useEffect(() => { globalAssistantConfigRef.current = globalAssistantConfig; }, [globalAssistantConfig]);
    useEffect(() => { tenantContextRef.current = tenantContext; }, [tenantContext]);
    useEffect(() => { pendingOperatingLayerTaskRef.current = pendingOperatingLayerTask; }, [pendingOperatingLayerTask]);

    useEffect(() => {
        const conversationId = assistantConversationIdRef.current;
        if (!conversationId) {
            persistedMessageCountRef.current = messages.length;
            return;
        }

        if (messages.length < persistedMessageCountRef.current) {
            persistedMessageCountRef.current = messages.length;
            return;
        }

        const nextMessages = messages.slice(persistedMessageCountRef.current);
        if (nextMessages.length === 0) return;

        persistedMessageCountRef.current = messages.length;
        nextMessages
            .filter(message => message.text.trim())
            .forEach(message => {
                void globalAssistantConversationService.recordMessage({
                    conversationId,
                    role: toStoredAssistantMessageRole(message.role),
                    text: message.text,
                    contextSnapshotId: message.contextSnapshotId ?? null,
                    memoryIds: message.memoryIds || [],
                    actionIds: message.actionIds || [],
                    metadata: {
                        source: 'global_assistant_ui',
                        uiRole: message.role,
                        isToolOutput: message.isToolOutput === true,
                        activeRoute: path,
                        activeView: viewRef.current || null,
                        activeProjectId: activeProjectRef.current?.id || null,
                        ...(message.metadata || {}),
                    },
                }).catch(error => {
                    console.warn('[Global Assistant] Failed to persist assistant message:', error);
                });
            });
    }, [messages, path]);

    const ensureAssistantConversation = async (
        request: string,
        entry?: GlobalAssistantEntryPayload,
    ): Promise<AssistantConversation | null> => {
        if (assistantConversationRef.current) return assistantConversationRef.current;

        const project = activeProjectRef.current;
        const userDoc = userDocumentRef.current as any;
        const role = userDoc?.role || null;
        const tenantContext = tenantContextRef.current;
        const tenant = resolveOperatingLayerTenantContext({
            activeProject: project,
            currentTenant: tenantContext?.currentTenant,
            currentMembership: tenantContext?.currentMembership,
            userDocument: userDoc,
        });
        const access = resolveOperatingLayerAccessContext({
            userRole: role,
            tenantRole: tenant.tenantRole,
            tenantPermissions: tenantContext?.currentMembership?.permissions,
        });

        try {
            const conversation = await globalAssistantConversationService.createConversation({
                userId: user?.id || userDoc?.id || null,
                tenantId: tenant.tenantId,
                projectId: project?.id || null,
                mode: access.mode,
                title: buildConversationTitle(request),
                metadata: {
                    source: entry?.source || 'global_assistant',
                    surface: entry?.surface || 'authenticated_app',
                    entryMetadata: entry?.metadata || {},
                    activeRoute: path,
                    activeView: viewRef.current || null,
                    activeProjectId: project?.id || null,
                    activeTenantId: tenant.tenantId,
                    activeTenantName: tenant.tenantName,
                    tenantRole: tenant.tenantRole,
                    tenantPlan: tenant.tenantPlan,
                    assistantMode: access.mode,
                    assistantPermissions: access.userPermissions,
                    chatKind: 'global_assistant_operating_layer',
                    separatedFrom: ['chatcore_visitor_chat', 'module_specific_chats'],
                },
            });
            assistantConversationRef.current = conversation;
            assistantConversationIdRef.current = conversation.id;
            return conversation;
        } catch (error) {
            console.warn('[Global Assistant] Failed to create assistant conversation:', error);
            return null;
        }
    };

    const clearAssistantConversationTask = (taskId: string, planStatus: string) => {
        const conversation = assistantConversationRef.current;
        if (!conversation) return;

        const nextConversation: AssistantConversation = {
            ...conversation,
            activeTaskId: conversation.activeTaskId === taskId ? null : conversation.activeTaskId,
            metadata: {
                ...(conversation.metadata || {}),
                lastTaskId: taskId,
                lastPlanStatus: planStatus,
            },
        };
        assistantConversationRef.current = nextConversation;
        void globalAssistantConversationService.upsertConversation(nextConversation)
            .then(saved => {
                assistantConversationRef.current = saved;
                assistantConversationIdRef.current = saved.id;
            })
            .catch(error => {
                console.warn('[Global Assistant] Failed to clear assistant conversation task:', error);
            });
    };

    const isToolAllowed = (
        toolName: string,
        args: any,
        mode: 'chat' | 'voice'
    ): { allowed: boolean; scopeId?: string; error?: string } => {
        const role = userDocumentRef.current?.role;
        const tenantContext = tenantContextRef.current;
        const access = resolveOperatingLayerAccessContext({
            userRole: role,
            tenantRole: tenantContext?.currentMembership?.role || null,
            tenantPermissions: tenantContext?.currentMembership?.permissions,
        });
        if (access.mode === 'owner' || access.mode === 'super_admin') return { allowed: true };

        const config = globalAssistantConfigRef.current;
        const permissions = config?.permissions || {};

        // If no permissions are configured, keep legacy behavior: allow tools (except role-gated ones)
        if (Object.keys(permissions).length === 0) return { allowed: true };

        // Map tool -> scope
        let scopeId: string | null = null;
        if (toolName === 'change_view') scopeId = String(args?.viewName || '');
        else if (toolName === 'open_features_item') scopeId = 'features';
        else if (toolName === 'open_testimonials_item') scopeId = 'testimonials';
        else if (toolName === 'open_pricing_tier') scopeId = 'pricing';
        else if (toolName === 'open_services_item') scopeId = 'services';
        else if (toolName === 'open_faq_item') scopeId = 'faq';
        else if (toolName === 'open_menu_item') scopeId = 'menu';
        else if (toolName === 'open_howItWorks_step') scopeId = 'howItWorks';
        else if (toolName === 'open_section_item') scopeId = String(args?.sectionName || '');
        else if (toolName.startsWith('open_')) {
            const section = toolName.slice('open_'.length);
            scopeId = section === 'leads' ? 'leads-form' : section;
        }
        else if (toolName === 'select_section') {
            const section = String(args?.sectionName || '');
            // Avoid collision with CRM leads view scope
            scopeId = section === 'leads' ? 'leads-form' : section;
        }
        else if (toolName === 'navigate_admin') scopeId = 'superadmin';
        else if (toolName === 'manage_cms_post') scopeId = 'cms';
        else if (toolName === 'manage_lead') scopeId = 'leads';
        else if (toolName === 'manage_domain') scopeId = 'domains';
        else if (toolName === 'update_chat_config') scopeId = 'ai-assistant';
        else if (toolName === 'generate_image_asset') scopeId = 'assets';
        else if (toolName === 'update_project_seo' || toolName === 'update_global_seo') scopeId = 'seo';
        else if (toolName === 'manage_template') scopeId = 'templates';
        else if (toolName === 'manage_appointment') scopeId = 'appointments';
        else if (toolName === 'email_settings' || toolName === 'email_campaign') scopeId = 'email';
        else if (toolName === 'ecommerce_project' || toolName === 'ecommerce_product' || toolName === 'ecommerce_order') scopeId = 'ecommerce';
        else if (toolName === 'finance_expense') scopeId = 'finance';
        else if (toolName === 'update_site_content' || toolName === 'manage_sections' || toolName === 'manage_section_items' || toolName === 'change_theme')
            scopeId = 'editor';
        else if (toolName === 'load_project' || toolName === 'create_website') scopeId = 'websites';
        else if (toolName === 'deep_search') scopeId = 'search';

        // If unknown tool or unmapped, allow (we'll tighten this once all tools are mapped in settings)
        if (!scopeId) return { allowed: true };

        // Mirror Settings UI default behavior: missing scope == allowed
        const perm = permissions[scopeId] || { chat: true, voice: true };
        const allowed = perm?.[mode] === true;
        if (!allowed) {
            return { allowed: false, scopeId, error: `Permission denied for scope '${scopeId}' in ${mode} mode.` };
        }
        return { allowed: true, scopeId };
    };

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
        const getPrompt = getPromptRef.current;

        const designPrompt = getPrompt('onboarding-design-plan');
        if (!designPrompt) throw new Error("Design prompt not found");

        try {
            const designContent = designPrompt.template.replace('{{businessName}}', businessName).replace('{{industry}}', industry).replace('{{tone}}', tone || 'Professional').replace('{{goal}}', 'Generate Leads').replace('{{summary}}', description).replace('{{availableFonts}}', "Inter, DM Sans, Outfit, Montserrat, Playfair Display").replace('{{allSections}}', "hero, features, testimonials, footer, cta");

            const projectId = activeProject?.id || 'headless-generation';
            const designResponse = await generateContentViaProxy(projectId, designContent, designPrompt.model, {}, user?.id);

            // Log API call
            if (user) {
                logApiCall({
                    userId: user.id,
                    model: designPrompt.model,
                    feature: 'onboarding-design-plan',
                    success: true
                });
            }

            const designPlan = JSON.parse(cleanJson(extractTextFromResponse(designResponse)));

            const websitePrompt = getPrompt('onboarding-website-json');
            if (!websitePrompt) throw new Error("Website generation prompt not found");

            const websiteContent = websitePrompt.template.replace('{{businessName}}', businessName).replace('{{industry}}', industry).replace('{{summary}}', description).replace('{{audience}}', 'General').replace('{{offerings}}', 'Services').replace('{{tone}}', tone || 'Professional').replace('{{goal}}', 'Generate Leads').replace('{{designPlanTypography}}', JSON.stringify(designPlan.typography)).replace('{{designPlanPalette}}', JSON.stringify(designPlan.palette)).replace('{{designPlanComponentOrder}}', JSON.stringify(designPlan.componentOrder)).replace('{{designPlanImageStyle}}', designPlan.imageStyleDescription);

            const websiteResponse = await generateContentViaProxy(projectId, websiteContent, websitePrompt.model, {}, user?.id);

            // Log API call
            if (user) {
                logApiCall({
                    userId: user.id,
                    model: websitePrompt.model,
                    feature: 'onboarding-website-generation',
                    success: true
                });
            }

            const result = JSON.parse(cleanJson(extractTextFromResponse(websiteResponse)));
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
                thumbnailUrl: 'https://picsum.photos/seed/newproject/80/600',
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
                    knowledgeDocuments: [],
                    knowledgeLinks: [],
                    widgetColor: designPlan.palette?.primary || '#4f46e5',
                    isActive: true,
                    leadCaptureEnabled: true,
                    enableLiveVoice: false,
                    voiceName: 'Zephyr' as const
                }
            } as any;

            await addNewProjectRef.current(newProject);
        } catch (error: any) {
            // Log failed API calls
            if (user) {
                logApiCall({
                    userId: user.id,
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
        } catch (e) { console.warn("Optimistic ref update failed", e); }

        setData(prevData => {
            if (!prevData) return null;
            const newData = JSON.parse(JSON.stringify(prevData));
            deepSet(newData, path, value);
            return newData;
        });

        return true;
    };

    const parseToolValue = (raw: any) => {
        if (raw === null || raw === undefined) return raw;
        if (typeof raw !== 'string') return raw;
        const trimmed = raw.trim();
        if (trimmed === '') return '';
        // Try JSON for booleans/numbers/objects/arrays
        if (
            trimmed === 'true' ||
            trimmed === 'false' ||
            trimmed === 'null' ||
            /^-?\d+(\.\d+)?$/.test(trimmed) ||
            trimmed.startsWith('{') ||
            trimmed.startsWith('[') ||
            trimmed.startsWith('"')
        ) {
            try { return JSON.parse(trimmed); } catch { /* fall through */ }
        }
        return raw;
    };

    const updateThemePath = (path: string, value: any) => {
        const deepSet = (obj: any, p: string, v: any) => {
            const keys = p.split('.');
            let cur = obj;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (cur[key] === undefined || cur[key] === null) cur[key] = {};
                if (typeof cur[key] !== 'object') {
                    console.warn(`Cannot traverse theme path '${p}' at '${key}': value is primitive.`);
                    return;
                }
                cur = cur[key];
            }
            cur[keys[keys.length - 1]] = v;
        };

        try {
            const mutableClone = JSON.parse(JSON.stringify(themeRef.current || {}));
            deepSet(mutableClone, path, value);
            themeRef.current = mutableClone;
        } catch (e) { console.warn("Optimistic theme ref update failed", e); }

        setTheme(prev => {
            const next = JSON.parse(JSON.stringify(prev || {}));
            deepSet(next, path, value);
            return next;
        });

        return true;
    };

    const openEditorSection = (sectionName: EditorSectionId) => {
        // Ensure a project is loaded; if not, load the most recent one as a sensible default.
        if (!activeProjectRef.current || !dataRef.current) {
            const candidate = projectsRef.current.find(p => (p as any).status !== 'Template') || projectsRef.current[0];
            if (!candidate) return { error: "No projects available. Create or load a project first." };
            loadProjectRef.current(candidate.id);
            activeProjectRef.current = candidate;
            dataRef.current = candidate.data;
        }

        // Ensure we're in editor and focus the requested section in the sidebar
        setViewRef.current('editor');
        onSectionSelectRef.current(sectionName as any);
        return { result: `Opened editor controls for section '${sectionName}'.` };
    };

    const openEditorSectionItem = (sectionName: EditorSectionId, index0: number) => {
        if (!Number.isFinite(index0) || index0 < 0) return { error: "index must be >= 1." };

        // Ensure a project is loaded; if not, load the most recent one as a sensible default.
        if (!activeProjectRef.current || !dataRef.current) {
            const candidate = projectsRef.current.find(p => (p as any).status !== 'Template') || projectsRef.current[0];
            if (!candidate) return { error: "No projects available. Create or load a project first." };
            loadProjectRef.current(candidate.id);
            activeProjectRef.current = candidate;
            dataRef.current = candidate.data;
        }

        setViewRef.current('editor');
        onSectionItemSelectRef.current(sectionName as any, index0);
        return { result: `Opened '${sectionName}' and focused item #${index0 + 1}.` };
    };

    const executeTool = async (
        name: string,
        args: any,
        mode: 'chat' | 'voice' = 'chat'
    ): Promise<{ result?: string, error?: string }> => {
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

            if (!isGuideOnlyToolName(name)) {
                const result = {
                    result: isSpanishLocale(i18n.language)
                        ? 'No hice cambios. Te llevé o te puedo llevar al módulo correcto para que lo hagas desde ahí.'
                        : 'I did not make changes. I took you, or can take you, to the right module so you can do it there.',
                };
                console.warn(`[Tool Execution] Guide-only block: ${name}`, { args, mode });
                return result;
            }

            lastToolCallRef.current = { name, args: serializedArgs, timestamp: now };

            const permission = isToolAllowed(name, args, mode);
            if (!permission.allowed) {
                const result = { error: permission.error || 'Permission denied.' };
                console.log(`[Tool Result] ${name}`, result);
                return result;
            }

            if (name === 'change_view') {
                const newView = args['viewName'] as any;
                if (viewRef.current === newView) {
                    const result = { result: `Already in ${newView}.` };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                }

                // Views that require an active project
                const viewsRequiringProject = ['email', 'ecommerce', 'finance', 'cms', 'seo', 'editor', 'navigation', 'biopage'];

                // If navigating to a view that requires a project and none is active, load one
                if (viewsRequiringProject.includes(newView) && !activeProjectRef.current) {
                    const availableProjects = projectsRef.current.filter(p => (p as any).status !== 'Template');
                    if (availableProjects.length > 0) {
                        const projectToLoad = availableProjects[0];
                        loadProjectRef.current(projectToLoad.id);
                        activeProjectRef.current = projectToLoad;
                        dataRef.current = projectToLoad.data;
                        console.log(`[Tool] Auto-loaded project '${projectToLoad.name}' for ${newView} view`);
                    } else if (projectsRef.current.length === 0) {
                        const result = { error: `No projects available. Create a website first.` };
                        console.log(`[Tool Result] ${name}`, result);
                        return result;
                    }
                }

                // Map view names to routes
                const viewToRoute: Record<string, string> = {
                    dashboard: ROUTES.DASHBOARD,
                    websites: ROUTES.WEBSITES,
                    cms: ROUTES.CMS,
                    navigation: ROUTES.NAVIGATION,
                    'ai-assistant': ROUTES.AI_ASSISTANT,
                    leads: ROUTES.LEADS,
                    appointments: ROUTES.APPOINTMENTS,
                    domains: ROUTES.DOMAINS,
                    seo: ROUTES.SEO,
                    finance: ROUTES.FINANCE,
                    ecommerce: ROUTES.ECOMMERCE,
                    email: ROUTES.EMAIL,
                    templates: ROUTES.TEMPLATES,
                    assets: ROUTES.ASSETS,
                    superadmin: ROUTES.SUPERADMIN,
                    biopage: ROUTES.BIOPAGE,
                    agency: ROUTES.AGENCY,
                    settings: ROUTES.SETTINGS,
                };

                // Editor requires dynamic projectId in its route
                if (newView === 'editor') {
                    const pid = activeProjectRef.current?.id;
                    if (pid) {
                        navigateRef.current(`/editor/${pid}`);
                    } else {
                        const result = { error: 'No project loaded. Open a project first before navigating to the editor.' };
                        console.log(`[Tool Result] ${name}`, result);
                        return result;
                    }
                } else {
                    const route = viewToRoute[newView];
                    if (route) {
                        navigateRef.current(route);
                    }
                }

                setViewRef.current(newView);
                const projectInfo = activeProjectRef.current ? ` (Project: ${activeProjectRef.current.name})` : '';
                const result = { result: `Navigated to ${newView}.${projectInfo}` };
                console.log(`[Tool Result] ${name}`, result);
                return result;
            }
            else if (name === 'open_features_item') {
                const index1 = Number(args?.index);
                return openEditorSectionItem('features', Math.max(0, Math.floor(index1) - 1));
            }
            else if (name === 'open_testimonials_item') {
                const index1 = Number(args?.index);
                return openEditorSectionItem('testimonials', Math.max(0, Math.floor(index1) - 1));
            }
            else if (name === 'open_pricing_tier') {
                const index1 = Number(args?.index);
                return openEditorSectionItem('pricing', Math.max(0, Math.floor(index1) - 1));
            }
            else if (name === 'open_services_item') {
                const index1 = Number(args?.index);
                return openEditorSectionItem('services', Math.max(0, Math.floor(index1) - 1));
            }
            else if (name === 'open_faq_item') {
                const index1 = Number(args?.index);
                return openEditorSectionItem('faq', Math.max(0, Math.floor(index1) - 1));
            }
            else if (name === 'open_menu_item') {
                const index1 = Number(args?.index);
                return openEditorSectionItem('menu', Math.max(0, Math.floor(index1) - 1));
            }
            else if (name === 'open_howItWorks_step') {
                const index1 = Number(args?.index);
                return openEditorSectionItem('howItWorks', Math.max(0, Math.floor(index1) - 1));
            }
            else if (name === 'open_section_item') {
                const sectionName = args?.sectionName as EditorSectionId;
                const index1 = Number(args?.index);
                const resolved = EDITOR_SECTION_IDS.includes(sectionName)
                    ? (sectionName as EditorSectionId)
                    : resolveEditorSectionId(sectionName as any);
                if (!resolved) return { error: `Unknown section '${sectionName}'.` };
                return openEditorSectionItem(resolved, Math.max(0, Math.floor(index1) - 1));
            }
            else if (name.startsWith('open_')) {
                const rawSection = name.slice('open_'.length);
                const resolved = EDITOR_SECTION_IDS.includes(rawSection as any)
                    ? (rawSection as EditorSectionId)
                    : resolveEditorSectionId(rawSection);
                if (!resolved) return { error: `Unknown section tool '${name}'.` };
                return openEditorSection(resolved);
            }
            else if (name === 'select_section') {
                const sectionName = args?.sectionName as any;
                if (!sectionName) return { error: "sectionName required." };
                const resolved = EDITOR_SECTION_IDS.includes(sectionName)
                    ? (sectionName as EditorSectionId)
                    : resolveEditorSectionId(sectionName);
                if (!resolved) return { error: `Unknown section '${sectionName}'.` };
                return openEditorSection(resolved);
            }
            else if (name === 'update_project_theme') {
                const path = String(args?.path || '').trim();
                if (!path) return { error: "path required." };
                const value = parseToolValue(args?.value);
                updateThemePath(path, value);
                return { result: `Updated theme '${path}'.` };
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
                        try { val = JSON.parse(val); } catch (e) { }
                    }
                }
                if (path.startsWith('theme.')) {
                    const themeKey = path.split('.')[1];
                    if (themeKey && themeRef.current) {
                        setThemeRef.current(prev => ({ ...prev, [themeKey]: val }));
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
                console.log(`[Tool] load_project: searching for '${identifier}' (target: '${target}')`);

                // Enhanced search strategy for voice input
                const project = projectsRef.current.find(p => {
                    // 1. Direct match (ID or Exact Name)
                    if (p.id === identifier) return true;

                    const pName = normalizeText(p.name);
                    if (pName === target) return true;
                    if (pName.includes(target)) return true;
                    if (target.includes(pName)) return true;

                    // 2. Token-based fuzzy match (useful for voice transcription errors)
                    // e.g. "closets ways" vs "CVlosets Ways"
                    const targetTokens = target.split(/\s+/).filter(t => t.length > 2);
                    const nameTokens = pName.split(/\s+/).filter(t => t.length > 2);

                    if (targetTokens.length === 0 || nameTokens.length === 0) return false;

                    // Check if *any* significant token matches exactly
                    const hasTokenMatch = targetTokens.some(tt => nameTokens.includes(tt));
                    if (hasTokenMatch) return true;

                    return false;
                });

                if (project) {
                    if (activeProjectRef.current?.id === project.id) {
                        const result = { result: `Project '${project.name}' is already active.` };
                        console.log(`[Tool Result] ${name}`, result);
                        return result;
                    }
                    console.log(`[Tool] Project found: ${project.name} (${project.id})`);
                    loadProjectRef.current(project.id);
                    activeProjectRef.current = project;
                    dataRef.current = project.data;

                    // Schema context is already injected via getEffectiveSystemInstruction(),
                    // so no need to include it in the tool result (it would be dumped into chat).
                    const result = { result: `Project '${project.name}' loaded successfully.` };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                } else {
                    console.log(`[Tool] Project NOT found. Available projects: ${projectsRef.current.map(p => p.name).join(', ')}`);
                    return { error: `Project '${identifier}' not found. Ask user to list available projects.` };
                }
            }
            else if (name === 'create_website') {
                const { businessName, industry, description, tone } = args;
                if (!businessName || !industry || !description) {
                    const result = {
                        error: "I need businessName, industry, and description before creating a website draft.",
                    };
                    console.log(`[Tool Result] ${name}`, result);
                    return result;
                }
                await performHeadlessGeneration(businessName, industry, description, tone);
                const result = { result: `Website '${businessName}' created.` };
                console.log(`[Tool Result] ${name}`, result);
                return result;
            }

            // --- DEEP SEARCH ---
            else if (name === 'deep_search') {
                const q = String(args?.query || '').toLowerCase().trim();
                const entities = args?.entities || ['products', 'orders', 'leads', 'posts', 'appointments', 'campaigns'];
                const projectId = activeProjectRef.current?.id;
                const uid = user?.id;

                if (!uid) return { error: "User not authenticated." };
                if (!q) return { result: "Please provide a search query." };

                const results: any = {};
                let searchSummary = `Found matches for "${q}":`;

                // 1. In-Memory Search (Leads, CMS) -> Fast
                if (entities.includes('leads') && leadsRef.current) {
                    const matches = leadsRef.current
                        .filter(l => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q))
                        .slice(0, 10)
                        .map(l => ({ id: l.id, name: l.name, email: l.email, status: l.status }));
                    if (matches.length > 0) results.leads = matches;
                }

                if (entities.includes('posts') && cmsPostsRef.current) {
                    const matches = cmsPostsRef.current
                        .filter(p => p.title.toLowerCase().includes(q))
                        .slice(0, 10)
                        .map(p => ({ id: p.id, title: p.title, status: p.status }));
                    if (matches.length > 0) results.posts = matches;
                }

                // 2. Supabase Search (Products, Orders, Appointments) -> Async
                // We user limit() to avoid fetching too much, effectively doing a "recent + filter"
                // because we assume the item is likely relevant or recent.
                // Real deep search would require a dedicated search service (e.g. Algolia/Elastic).
                if (projectId) {
                    const fetchFromSupabase = async (table: string, filterFn: (data: any) => boolean, mapFn: (data: any) => any) => {
                        try {
                            const { data, error } = await supabase
                                .from(table)
                                .select('*')
                                .eq('project_id', projectId)
                                .limit(50);

                            if (error) throw error;

                            if (!data) return null;

                            const matches = data
                                .filter(filterFn)
                                .map(mapFn)
                                .slice(0, 5);

                            return matches.length > 0 ? matches : null;
                        } catch (e) {
                            console.error(`Search error for ${table}:`, e);
                            return null;
                        }
                    };

                    if (entities.includes('products')) {
                        const hits = await fetchFromSupabase(
                            'products',
                            (p: any) => p.name?.toLowerCase().includes(q),
                            (p: any) => ({ id: p.id, name: p.name, price: p.price, stock: p.inventory?.quantity })
                        );
                        if (hits) results.products = hits;
                    }

                    if (entities.includes('orders')) {
                        const hits = await fetchFromSupabase(
                            'orders',
                            (o: any) => o.id.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q) || o.customer_email?.toLowerCase().includes(q),
                            (o: any) => ({ id: o.id, customer: o.customer_name, total: o.total, status: o.status, date: o.created_at })
                        );
                        if (hits) results.orders = hits;
                    }

                    if (entities.includes('appointments')) {
                        const hits = await fetchFromSupabase(
                            'project_appointments',
                            (a: any) => a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q),
                            (a: any) => ({ id: a.id, title: a.title, start: a.start_date, status: a.status })
                        );
                        if (hits) results.appointments = hits;
                    }

                    if (entities.includes('campaigns')) {
                        const hits = await fetchFromSupabase(
                            'email_campaigns',
                            (c: any) => c.name?.toLowerCase().includes(q) || c.subject?.toLowerCase().includes(q),
                            (c: any) => ({ id: c.id, name: c.name, subject: c.subject, status: c.status })
                        );
                        if (hits) results.campaigns = hits;
                    }
                }

                if (Object.keys(results).length === 0) {
                    return { result: `No matches found for "${q}". Try a different term or entity.` };
                }

                return { result: JSON.stringify(results, null, 2) };
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
                } else if (action === 'get') {
                    if (!id) return { error: "Post ID required." };
                    const found = cmsPostsRef.current.find(p => p.id === id);
                    if (!found) return { error: "Post not found." };
                    return { result: JSON.stringify(found, null, 2) };
                }
            }

            // --- LEAD CRM TOOLS ---
            else if (name === 'manage_lead') {
                const { action, id, name: leadName, email, status, notes, value } = args;
                if (action === 'create') {
                    const projectId = activeProjectRef.current?.id;
                    await addLeadRef.current({
                        name: leadName, email, company: '', value: value || 0,
                        status: status || 'new', source: 'manual', notes: notes || '',
                        metadata: {
                            canonicalEmail: buildCanonicalEmailDraftMetadata({
                                sourceModule: 'crm',
                                sourceComponent: 'GlobalAiAssistant',
                                sourceEvent: 'lead_created',
                                sourceEntityType: 'lead',
                                sourceEntityId: email || leadName || 'manual-lead',
                                projectId,
                                recipientEmail: email,
                                generatedByAI: true,
                                needsReview: true,
                                safeToEdit: true,
                                consentSource: 'crm-manual-lead',
                                transactionalConsent: null,
                                marketingConsent: null,
                            }),
                        },
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
                    if (notes || value || email || leadName) {
                        const existingLead = leadsRef.current.find(l => l.id === targetId);
                        await updateLeadRef.current(targetId, {
                            notes,
                            value,
                            email,
                            name: leadName,
                            ...(email ? {
                                metadata: {
                                    ...(existingLead?.metadata || {}),
                                    canonicalEmail: buildCanonicalEmailDraftMetadata({
                                        sourceModule: 'leads',
                                        sourceComponent: 'GlobalAiAssistant',
                                        sourceEvent: 'lead_contact_updated',
                                        sourceEntityType: 'lead',
                                        sourceEntityId: targetId,
                                        projectId: activeProjectRef.current?.id,
                                        recipientEmail: email,
                                        generatedByAI: true,
                                        needsReview: true,
                                        safeToEdit: true,
                                        consentSource: 'crm-lead-update',
                                        transactionalConsent: null,
                                        marketingConsent: null,
                                    }),
                                },
                            } : {}),
                        });
                    }
                    return { result: "Lead updated." };
                } else if (action === 'delete') {
                    if (!id) return { error: "Lead ID required." };
                    await deleteLeadRef.current(id);
                    return { result: "Lead deleted." };
                } else if (action === 'get') {
                    if (!id) return { error: "Lead ID required." };
                    const found = leadsRef.current.find(l => l.id === id);
                    if (!found) return { error: "Lead not found." };
                    return { result: JSON.stringify(found, null, 2) };
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

            // --- SEO ---
            else if (name === 'update_project_seo') {
                const updates = args?.updates;
                if (!updates || typeof updates !== 'object') {
                    return { error: "updates object required." };
                }
                await updateSeoConfigRef.current(updates);
                return { result: "Project SEO updated." };
            }
            else if (name === 'update_global_seo') {
                const role = userDocumentRef.current?.role;
                if (role !== 'superadmin' && role !== 'owner') {
                    return { error: "Unauthorized: Only Super Admins can update global SEO." };
                }
                const payload = { ...args, updated_at: new Date().toISOString() };
                await supabase.from('global_settings').upsert({ id: 'seo', ...payload });
                return { result: "Global SEO settings updated." };
            }

            // --- TEMPLATES ---
            else if (name === 'manage_template') {
                const action = args?.action as string;
                const templateId = args?.templateId as string | undefined;
                if (action === 'create') {
                    await createNewTemplateRef.current();
                    return { result: "Created new template." };
                }
                if (action === 'duplicate') {
                    if (!templateId) return { error: "templateId required for duplicate." };
                    await duplicateTemplateRef.current(templateId);
                    return { result: "Template duplicated." };
                }
                if (action === 'archive' || action === 'unarchive') {
                    if (!templateId) return { error: "templateId required for archive/unarchive." };
                    await archiveTemplateRef.current(templateId, action === 'archive');
                    return { result: action === 'archive' ? "Template archived." : "Template unarchived." };
                }
                return { error: "Invalid action for manage_template." };
            }

            // --- APPOINTMENTS ---
            else if (name === 'manage_appointment') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = args?.action as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };
                const id = args?.id as string | undefined;
                const title = args?.title as string | undefined;
                const description = args?.description as string | undefined;
                const status = args?.status as string | undefined;
                const startIso = args?.startDate as string | undefined;
                const endIso = args?.endDate as string | undefined;

                if (action === 'create') {
                    const now = new Date().toISOString();
                    const startDate = startIso || now;
                    const endDate = endIso || startDate;
                    const payload: any = {
                        title: title || 'Nueva Cita',
                        status: status || 'scheduled',
                        start_date: startDate,
                        end_date: endDate,
                        project_id: projectId,
                        created_by: user.id,
                        organizer_id: user.id,
                    };
                    if (description) payload.description = description;
                    const { data, error } = await supabase.from('project_appointments').insert(payload).select('id').single();
                    if (error) return { error: `Failed to create appointment: ${error.message}` };
                    return { result: `Appointment created: ${data.id}` };
                }

                if (action === 'update' || action === 'status') {
                    if (!id) return { error: "id required." };
                    const updatePayload: any = { updated_by: user.id };
                    if (title !== undefined) updatePayload.title = title;
                    if (description !== undefined) updatePayload.description = description;
                    if (startIso) updatePayload.start_date = startIso;
                    if (endIso) updatePayload.end_date = endIso;
                    if (status) updatePayload.status = status;

                    const { error } = await supabase.from('project_appointments').update(updatePayload).eq('id', id);
                    if (error) return { error: `Failed to update appointment: ${error.message}` };
                    return { result: "Appointment updated." };
                }

                if (action === 'delete') {
                    if (!id) return { error: "id required for delete." };
                    const { error } = await supabase.from('project_appointments').delete().eq('id', id);
                    if (error) return { error: `Failed to delete appointment: ${error.message}` };
                    return { result: "Appointment deleted." };
                }

                if (action === 'get') {
                    if (!id) return { error: "id required for get." };
                    const { data, error } = await supabase.from('project_appointments').select('*').eq('id', id).maybeSingle();
                    if (error || !data) return { error: "Appointment not found." };
                    return { result: JSON.stringify(data, null, 2) };
                }

                return { error: "Invalid action for manage_appointment." };
            }

            // --- EMAIL ---
            else if (name === 'email_settings') {
                if (!user?.id) return { error: "Not authenticated." };
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };
                const updates = args?.updates;
                if (!updates || typeof updates !== 'object') return { error: "updates object required." };
                const { error } = await supabase
                    .from('email_settings')
                    .upsert(sanitizeEmailSettingsUpdates(updates, projectId, user.id), { onConflict: 'project_id' });
                if (error) return { error: `Failed to update email settings: ${error.message}` };
                return { result: "Email settings updated. Provider secrets and readiness verification remain server-managed." };
            }
            else if (name === 'email_campaign') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = args?.action as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };

                if (action === 'create') {
                    const campaign = (args?.campaign || {}) as any;
                    const payload = buildAiEmailCampaignPayload(campaign, projectId, user.id, 'create');
                    const { data, error } = await supabase.from('email_campaigns').insert(payload).select('id').single();
                    if (error) return { error: `Failed to create campaign: ${error.message}` };
                    return { result: `Campaign draft created for review: ${data.id}` };
                }

                if (action === 'update') {
                    const campaignId = args?.campaignId as string | undefined;
                    if (!campaignId) return { error: "campaignId required for update." };
                    const campaign = (args?.campaign || {}) as any;
                    const payload = buildAiEmailCampaignPayload(campaign, projectId, user.id, 'update', campaignId);
                    const { error } = await supabase.from('email_campaigns').update(payload).eq('id', campaignId);
                    if (error) return { error: `Failed to update campaign: ${error.message}` };
                    return { result: "Campaign updated as draft and marked needs_review." };
                }

                if (action === 'delete') {
                    const campaignId = args?.campaignId as string | undefined;
                    if (!campaignId) return { error: "campaignId required for delete." };
                    const { error } = await supabase.from('email_campaigns').delete().eq('id', campaignId);
                    if (error) return { error: `Failed to delete campaign: ${error.message}` };
                    return { result: "Campaign deleted." };
                }

                if (action === 'get') {
                    const campaignId = args?.campaignId as string | undefined;
                    if (!campaignId) return { error: "campaignId required." };
                    const { data, error } = await supabase.from('email_campaigns').select('*').eq('id', campaignId).maybeSingle();
                    if (error || !data) return { error: "Campaign not found." };
                    return { result: JSON.stringify(data, null, 2) };
                }

                return { error: "Invalid action for email_campaign." };
            }

            // --- ECOMMERCE ---
            else if (name === 'ecommerce_project') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = args?.action as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };

                if (action === 'enable') {
                    await supabase.from('projects').update({ ecommerce_enabled: true }).eq('id', projectId);
                    return { result: "Ecommerce enabled for project." };
                }

                if (action === 'disable') {
                    await supabase.from('projects').update({ ecommerce_enabled: false }).eq('id', projectId);
                    return { result: "Ecommerce disabled for project." };
                }

                return { error: "Invalid action for ecommerce_project." };
            }
            else if (name === 'ecommerce_product') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = args?.action as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };
                const productsPath = `users/${user.id}/stores/${projectId}/products`;

                const slugify = (s: string) => s
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');

                if (action === 'create') {
                    const product = (args?.product || {}) as any;
                    if (!product?.name) return { error: "product.name required." };
                    const payload = {
                        ...product,
                        project_id: projectId,
                        slug: product.slug || slugify(product.name),
                        images: product.images || [],
                    };
                    const { data, error } = await supabase.from('store_products').insert({ id: `prod_${Date.now()}`, store_id: projectId, data: payload }).select('id').single();
                    if (error) return { error: `Failed to create product: ${error.message}` };
                    return { result: `Product created: ${data.id}` };
                }

                if (action === 'update') {
                    const productId = args?.productId as string | undefined;
                    if (!productId) return { error: "productId required for update." };
                    const product = (args?.product || {}) as any;
                    const updatePayload: any = { ...product };
                    if (product?.name && !product.slug) updatePayload.slug = slugify(product.name);
                    const { error } = await supabase.from('store_products').update({ data: updatePayload }).eq('id', productId);
                    if (error) return { error: `Failed to update product: ${error.message}` };
                    return { result: "Product updated." };
                }

                if (action === 'delete') {
                    const productId = args?.productId as string | undefined;
                    if (!productId) return { error: "productId required for delete." };
                    const { error } = await supabase.from('store_products').delete().eq('id', productId);
                    if (error) return { error: `Failed to delete product: ${error.message}` };
                    return { result: "Product deleted." };
                }

                if (action === 'get') {
                    const productId = args?.productId as string | undefined;
                    if (!productId) return { error: "productId required." };
                    const { data, error } = await supabase.from('store_products').select('*').eq('id', productId).maybeSingle();
                    if (error || !data) return { error: "Product not found." };
                    return { result: JSON.stringify(data, null, 2) };
                }

                return { error: "Invalid action for ecommerce_product." };
            }
            else if (name === 'ecommerce_order') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = (args?.action || 'update_status') as string;
                const orderId = args?.orderId as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };

                if (action === 'update_status') {
                    const status = args?.status as string;
                    if (!orderId) return { error: "orderId required." };
                    if (!status) return { error: "status required." };

                    const updateData: any = { status };
                    const now = new Date().toISOString();
                    if (status === 'cancelled') updateData.cancelled_at = now;
                    if (status === 'refunded') updateData.refunded_at = now;
                    if (status === 'shipped') updateData.shipped_at = now;
                    if (status === 'delivered') updateData.delivered_at = now;

                    const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);
                    if (error) return { error: `Failed to update order: ${error.message}` };
                    return { result: "Order status updated." };
                }

                if (action === 'get') {
                    if (!orderId) return { error: "orderId required." };
                    const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
                    if (error || !data) return { error: "Order not found." };
                    return { result: JSON.stringify(data, null, 2) };
                }

                return { error: "Invalid action for ecommerce_order." };
            }

            // --- FINANCE ---
            else if (name === 'finance_expense') {
                if (!user?.id) return { error: "Not authenticated." };
                const action = args?.action as string;
                const projectId = (args?.projectId as string | undefined) || activeProjectRef.current?.id;
                if (!projectId) return { error: "No active project. Load a project first." };
                const expenseId = args?.expenseId as string | undefined;

                if (action === 'create') {
                    const expense = (args?.expense || {}) as any;
                    const payload = { ...expense, project_id: projectId };
                    const { data, error } = await supabase.from('expenses').insert(payload).select('id').single();
                    if (error) return { error: `Failed to create expense: ${error.message}` };
                    return { result: `Expense created: ${data.id}` };
                }
                if (action === 'update') {
                    if (!expenseId) return { error: "expenseId required for update." };
                    const expense = (args?.expense || {}) as any;
                    const { error } = await supabase.from('expenses').update(expense).eq('id', expenseId);
                    if (error) return { error: `Failed to update expense: ${error.message}` };
                    return { result: "Expense updated." };
                }
                if (action === 'delete') {
                    if (!expenseId) return { error: "expenseId required for delete." };
                    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
                    if (error) return { error: `Failed to delete expense: ${error.message}` };
                    return { result: "Expense deleted." };
                }

                if (action === 'get') {
                    if (!expenseId) return { error: "expenseId required." };
                    const { data, error } = await supabase.from('expenses').select('*').eq('id', expenseId).maybeSingle();
                    if (error || !data) return { error: "Expense not found." };
                    return { result: JSON.stringify(data, null, 2) };
                }
                return { error: "Invalid action for finance_expense." };
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
        const userRole = userDocumentRef.current?.role;
        const tenantContext = tenantContextRef.current;
        const access = resolveOperatingLayerAccessContext({
            userRole,
            tenantRole: tenantContext?.currentMembership?.role || null,
            tenantPermissions: tenantContext?.currentMembership?.permissions,
        });
        const hasFullAccess = access.mode === 'owner' || access.mode === 'super_admin';

        let scopeText = "";
        if (hasFullAccess) {
            scopeText = access.mode === 'owner' ? `ACCESS: OWNER (FULL CONTROL).` : `ACCESS: SUPER ADMIN.`;
        } else {
            if (Object.keys(permissions).length > 0) {
                if (allowedScopes.length > 0) scopeText = `ACCESS: RESTRICTED. Allowed: ${allowedScopes.join(', ')}.`;
                else scopeText = `ACCESS: READ ONLY.`;
            } else scopeText = "ACCESS: STANDARD USER.";
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

        const crmInstructions = `CRM HELP: To "move" a lead means to update its status. Statuses: new, contacted, qualified, negotiation, won, lost.`;

        const domainsContext = domainsRef.current.length > 0
            ? `Domains: ${domainsRef.current.map(d => `"${d.name}" (ID:${d.id})`).join(', ')}.`
            : "Domains: Empty.";

        // Enhanced Project Context: Include ID and limited description/URL if available, increase limit
        const projectList = projectsRef.current
            .slice(0, 50) // Increased limit to ensure we catch user's recent projects
            .map(p => `"${p.name}" (ID: ${p.id}${(p as any).url ? `, URL: ${(p as any).url}` : ''})`)
            .join(', ');
        const projectContext = `Available Projects: [${projectList}].`;

        let dataStructureContext = "Active Project Data Structure: None (No project loaded).";
        if (dataRef.current) {
            const schema = generateDataSchema(dataRef.current);
            dataStructureContext = `ACTIVE PROJECT DATA STRUCTURE (AVAILABLE PATHS):\n${schema}\n\nEDITING RULES:\n1. Use 'update_site_content' with 'path' matching the schema (e.g. 'hero.headline', 'hero.colors.primary').\n2. Use 'manage_section_items' for paths ending in [] (e.g. 'features.items[]') to add/remove list items.\n3. Do NOT invent keys not shown in the schema.`;
        }

        const activeContext = `STATE: Active Project: ${activeProject ? `${activeProject.name} (ID: ${activeProject.id})` : "None"}. View: ${viewRef.current}. Route: ${path}.`;
        const guideBehavior = [
            'GLOBAL ASSISTANT BEHAVIOR:',
            '- Always use the current route, view, visible screen, active project, and recent conversation as context.',
            '- Answer in the same language the user is using.',
            '- Keep answers short and clear for non-technical users.',
            '- Never reveal internal reasoning, chain of thought, tool plans, JSON, schemas, or technical system details unless the user explicitly asks.',
            '- Act as a guide first: open the right module, explain the next simple step, and let the user press final action buttons inside that module.',
            '- If the user clearly names a module or task destination, open that module first and explain only the next real step there.',
            '- For image or video requests from the global input, open Media AI and prepare the prompt/options when provided. Do not generate inside the chat.',
            '- Only say an action is done after the app actually navigated or the real action completed.',
        ].join('\n');

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
        // 5. Compile final instruction
        return `${baseInstruction}\n\n${templatesInstruction}\n\n${guideBehavior}\n\n${scopeText}\n\n${crmInstructions}\n\n${projectContext}\n${dataStructureContext}\n${cmsContext}\n${leadsContext}\n${domainsContext}\n${componentsContext}\n${customContext}\n${activeContext}`;
    };



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
        activeSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) { /* already stopped */ } });
        activeSourcesRef.current = [];
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (sessionRef.current) {
            // Properly close the WebSocket session
            try {
                const session = sessionRef.current;
                if (session && typeof session.then === 'function') {
                    session.then((s: any) => { try { s.close?.(); } catch (e) { /* ignore */ } }).catch(() => { });
                } else if (session && typeof session.close === 'function') {
                    session.close();
                }
            } catch (e) {
                console.warn('[Voice Mode] Error closing session:', e);
            }
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
            // STEP 1: Request microphone permission FIRST (before WebSocket)
            // This gives the user time to accept without the connection timing out
            console.log('[Voice Mode] Requesting microphone permission...');
            let micStream: MediaStream;
            try {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('[Voice Mode] Microphone access granted');
            } catch (micErr: any) {
                console.error('[Voice Mode] Microphone access denied:', micErr);
                setIsConnecting(false);
                alert(`No se pudo acceder al micrófono: ${micErr?.message || 'Permiso denegado'}. Por favor, permite el acceso al micrófono en tu navegador.`);
                return; // Exit early - don't even try to connect WebSocket
            }

            // STEP 2: Now set up audio contexts
            const ai = await getGoogleGenAI();
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const outputCtx = new AudioContextClass({ sampleRate: 24000 });
            const inputCtx = new AudioContextClass({ sampleRate: 16000 });
            audioContextRef.current = outputCtx;
            inputAudioContextRef.current = inputCtx;
            nextStartTimeRef.current = outputCtx.currentTime;
            streamRef.current = micStream;

            // STEP 3: Connect to WebSocket (microphone is already available)
            const sessionPromise = ai.live.connect({
                model: 'gemini-3.1-flash-live-preview',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: globalAssistantConfig.voiceName } } },
                    // DEBUG: Stripped to minimum config to isolate "invalid argument" error
                    // tools: [{ functionDeclarations: TOOLS }],
                    // systemInstruction: getEffectiveSystemInstruction('voice'),
                    // inputAudioTranscription: {},
                    // outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: async () => {
                        console.log('[Voice Mode] WebSocket connected');
                        setIsConnecting(false);
                        setIsLiveActive(true);
                        isConnectedRef.current = true;

                        // Capture and send initial visual context FIRST (non-blocking)
                        // Delay slightly to let the connection fully stabilize
                        const sendScreenContext = async () => {
                            try {
                                const screenCapture = await captureCurrentView();
                                if (screenCapture && isConnectedRef.current) {
                                    console.log('[Voice Mode] Sending initial screen context...');
                                    const session = await sessionPromise;
                                    session.sendRealtimeInput({
                                        video: {
                                            mimeType: "image/jpeg",
                                            data: screenCapture
                                        }
                                    });
                                    console.log('[Voice Mode] ✅ Screen context sent successfully');
                                }
                            } catch (e) {
                                console.warn('[Voice Mode] Failed to send initial screen context (non-fatal):', e);
                            }
                        };

                        // Set up audio processing with the already-granted microphone stream
                        const source = inputCtx.createMediaStreamSource(micStream);
                        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                        processorRef.current = processor;
                        let audioSendCount = 0;
                        processor.onaudioprocess = (e) => {
                            if (!isConnectedRef.current) return;
                            // Resume AudioContext if suspended (browser policy)
                            if (inputCtx.state === 'suspended') {
                                inputCtx.resume();
                            }
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcm16 = floatTo16BitPCM(inputData);
                            const base64Data = bytesToBase64(new Uint8Array(pcm16));
                            sessionPromise.then(session => {
                                if (!isConnectedRef.current) return;
                                try {
                                    session.sendRealtimeInput({ audio: { mimeType: 'audio/pcm;rate=16000', data: base64Data } });
                                    audioSendCount++;
                                    if (audioSendCount % 100 === 0) {
                                        console.log(`[Voice Mode] 🎤 Audio chunks sent: ${audioSendCount}`);
                                    }
                                } catch (err) {
                                    console.error('[Voice Mode] ❌ Error sending audio chunk:', err);
                                }
                            });
                        };
                        source.connect(processor);
                        processor.connect(inputCtx.destination);

                        // DEBUG: Greeting disabled to test pure audio streaming
                        // setTimeout(async () => {
                        //     if (!isConnectedRef.current) return;
                        //     try {
                        //         const session = await sessionPromise;
                        //         console.log('[Voice Mode] 🤖 Triggering initial greeting...');
                        //         const userLang = navigator.language || 'es-ES';
                        //         const isSpanish = userLang.toLowerCase().includes('es');
                        //         const greetingPrompt = isSpanish
                        //             ? "La sesión ha iniciado. IMPORTANTE: Saluda al usuario corta y amablemente en ESPAÑOL y pregúntale qué desea hacer hoy."
                        //             : "Voice session started. IMPORTANT: Greet the user briefly in ENGLISH and ask what they want to do today.";
                        //         console.log(`[Voice Mode] Sending greeting prompt (${isSpanish ? 'ES' : 'EN'})...`);
                        //         session.sendClientContent({
                        //             turns: [{ role: 'user', parts: [{ text: greetingPrompt }] }],
                        //             turnComplete: true
                        //         });
                        //         console.log('[Voice Mode] ✅ Greeting sent successfully');
                        //         setTimeout(() => sendScreenContext(), 1000);
                        //     } catch (err) {
                        //         console.error('[Voice Mode] Failed to trigger greeting:', err);
                        //     }
                        // }, 2000);
                        console.log('[Voice Mode] ⏳ Audio streaming started (greeting disabled for debug)');
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Debug: log all message types
                        const sc = message.serverContent;
                        const hasAudio = !!sc?.modelTurn?.parts?.some((p: any) => p.inlineData?.data);
                        const hasTool = !!message.toolCall;
                        console.log('[Voice Mode] 📩 Message:', {
                            turnComplete: sc?.turnComplete,
                            generationComplete: (sc as any)?.generationComplete,
                            interrupted: sc?.interrupted,
                            hasAudioData: hasAudio,
                            hasToolCall: hasTool,
                            partsCount: sc?.modelTurn?.parts?.length || 0,
                        });

                        if (sc?.interrupted) {
                            console.log('[Voice Mode] Audio interrupted');
                            activeSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) { } });
                            activeSourcesRef.current = [];
                            if (audioContextRef.current) nextStartTimeRef.current = audioContextRef.current.currentTime;
                            return;
                        }

                        // Resume output audio context if suspended
                        if (audioContextRef.current?.state === 'suspended') {
                            console.log('[Voice Mode] Resuming suspended output AudioContext');
                            await audioContextRef.current.resume();
                        }

                        if (message.toolCall) {
                            console.log('[Voice Mode] Function calls detected:', message.toolCall.functionCalls.map(fc => ({
                                name: fc.name,
                                args: fc.args
                            })));
                            const functionResponses = [];
                            for (const fc of message.toolCall.functionCalls) {
                                try {
                                    const { result, error } = await executeTool(fc.name, fc.args, 'voice');
                                    functionResponses.push({ id: fc.id, name: fc.name, response: { result: result || error || "Done" } });
                                } catch (toolErr: any) {
                                    console.error('[Voice Mode] Tool execution error:', fc.name, toolErr);
                                    functionResponses.push({ id: fc.id, name: fc.name, response: { result: `Error: ${toolErr?.message || 'Unknown'}` } });
                                }
                            }
                            console.log('[Voice Mode] Sending tool responses back to model');
                            sessionPromise.then(session => { if (isConnectedRef.current) session.sendToolResponse({ functionResponses }); });

                            // 🆕 Periodic screen capture: After tool execution (e.g., navigation),
                            // send fresh visual context so the AI sees the updated view
                            const hasViewChange = message.toolCall.functionCalls.some(
                                (fc: any) => fc.name === 'change_view' || fc.name === 'navigate_admin' ||
                                fc.name.startsWith('open_') || fc.name === 'select_section'
                            );
                            if (hasViewChange) {
                                // Wait for the view transition to render, then capture
                                setTimeout(async () => {
                                    if (!isConnectedRef.current) return;
                                    try {
                                        const freshCapture = await captureCurrentView();
                                        if (freshCapture && isConnectedRef.current) {
                                            console.log('[Voice Mode] 📸 Sending updated screen context after view change');
                                            const session = await sessionPromise;
                                            session.sendRealtimeInput({
                                                video: { mimeType: 'image/jpeg', data: freshCapture }
                                            });
                                        }
                                    } catch (e) {
                                        console.warn('[Voice Mode] Could not capture updated screen:', e);
                                    }
                                }, 1500); // Wait 1.5s for view to render
                            }

                            return; // Don't fall through to audio handling for tool call messages
                        }

                        // Handle audio data from any part (not just parts[0])
                        const parts = sc?.modelTurn?.parts || [];
                        for (const part of parts) {
                            const audioData = (part as any)?.inlineData?.data;
                            if (audioData && audioContextRef.current) {
                                const ctx = audioContextRef.current;
                                try {
                                    const bytes = base64ToBytes(audioData);
                                    const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
                                    const src = ctx.createBufferSource();
                                    src.buffer = buffer;
                                    src.connect(ctx.destination);
                                    const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
                                    src.start(startTime);
                                    nextStartTimeRef.current = startTime + buffer.duration;
                                    activeSourcesRef.current.push(src);
                                    src.onended = () => { activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== src); };
                                } catch (audioErr) {
                                    console.error('[Voice Mode] Error playing audio chunk:', audioErr);
                                }
                            }
                        }

                        if (sc?.turnComplete) {
                            console.log('[Voice Mode] ✅ Model turn complete — ready for next input');
                        }
                    },
                    onclose: (e: any) => {
                        console.log('[Voice Mode] WebSocket closed:', e?.reason || 'unknown reason');
                        stopLiveSession();
                    },
                    onerror: (e: any) => {
                        console.error('[Voice Mode] WebSocket error:', e);
                        if (!isConnectedRef.current) return;
                        // Stop the session on error so user can retry
                        stopLiveSession();
                    }
                }
            });
            sessionRef.current = sessionPromise;
        } catch (error: any) {
            console.error('[Voice Mode] Failed to start session:', error);
            handleApiError(error);
            setIsConnecting(false);
            alert(`Error al iniciar sesión de voz: ${error?.message || 'Error desconocido'}. Por favor, intenta de nuevo.`);
        }
    };

    const tryExtractToolCall = (raw: string): { name: string; args: any } | null => {
        const text = String(raw || '').trim();
        if (!text) return null;

        const tryParse = (candidate: string) => {
            try {
                const parsed = JSON.parse(candidate);
                if (parsed?.tool_call?.name) return { name: parsed.tool_call.name, args: parsed.tool_call.args || {} };
                if (Array.isArray(parsed?.tool_calls) && parsed.tool_calls[0]?.name) {
                    return { name: parsed.tool_calls[0].name, args: parsed.tool_calls[0].args || {} };
                }
                if (parsed?.function_call?.name) {
                    const args = parsed.function_call.args ?? parsed.function_call.arguments;
                    if (typeof args === 'string') {
                        try { return { name: parsed.function_call.name, args: JSON.parse(args) }; } catch { return { name: parsed.function_call.name, args: {} }; }
                    }
                    return { name: parsed.function_call.name, args: args || {} };
                }
                if (parsed?.name && parsed?.args) return { name: parsed.name, args: parsed.args || {} };
            } catch { }
            return null;
        };

        // 1) Whole string as JSON
        const direct = tryParse(text);
        if (direct) return direct;

        // 2) JSON fenced block
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fenced?.[1]) {
            const fencedParsed = tryParse(fenced[1].trim());
            if (fencedParsed) return fencedParsed;
        }

        // 3) First balanced JSON object in the text
        const start = text.indexOf('{');
        if (start === -1) return null;
        let depth = 0;
        let inStr = false;
        let esc = false;
        for (let i = start; i < text.length; i++) {
            const ch = text[i];
            if (inStr) {
                if (esc) esc = false;
                else if (ch === '\\') esc = true;
                else if (ch === '"') inStr = false;
                continue;
            }
            if (ch === '"') { inStr = true; continue; }
            if (ch === '{') depth++;
            if (ch === '}') depth--;
            if (depth === 0) {
                const candidate = text.slice(start, i + 1);
                const parsed = tryParse(candidate);
                if (parsed) return parsed;
                break;
            }
        }
        return null;
    };

    const inferToolCallFromUserText = (userText: string): { name: string; args: any } | null => {
        const raw = String(userText || '');
        const norm = normalizeText(raw);

        console.log('[InferTool] Input:', { raw, norm });

        // ============================================================
        // GUARD: Detect QUESTIONS and skip fast-path entirely.
        // When the user is asking about what they see on screen,
        // we must let the LLM with vision answer — NOT navigate.
        // ============================================================
        const hasQuestionMark = raw.includes('?');
        const startsWithQuestionWord = /^(que |qué |cual |cuál |como |cómo |por que |por qué |cuanto |cuánto |cuantos |cuántos |donde |dónde |cuando |cuándo |quien |quién |what |how |why |where |when |who |which |explain |tell me |describe |is this |is that |are these |can you tell |do you see |what's )/.test(norm);
        const isQuestionPattern = /\b(que es |que son |que significa |para que |como funciona |como se |como puedo |se puede |puedo |que hace |que pasa |que hay |que veo |que estoy viendo |que tengo |dime sobre |dime como |explicame |cuentame |enseñame |ayudame a entender |what is |what are |what does |how does |how do |how can |can i |tell me about |explain |describe |show me how )/.test(norm);

        if (hasQuestionMark || startsWithQuestionWord || isQuestionPattern) {
            console.log('[InferTool] Detected QUESTION — skipping fast-path, delegating to LLM with vision');
            return null;
        }


        // 0) PRIORITY: Direct navigation to app views (before checking editor sections)
        // These keywords should ALWAYS navigate to app views, not editor sections
        const hasNavIntent = /\b(ir a|ve a|abre|abrir|open|go to|llevame|muestrame|show)\b/.test(norm);
        if (hasNavIntent) {
            // Email Marketing - highest priority
            if (norm.includes('marketing') || norm.includes('campana') || norm.includes('campaign') ||
                (norm.includes('email') && !norm.includes('newsletter'))) {
                console.log('[InferTool] Priority match: email view');
                return { name: 'change_view', args: { viewName: 'email' } };
            }
            // Finance
            if (norm.includes('finanza') || norm.includes('finance') || norm.includes('gasto') || norm.includes('expense')) {
                console.log('[InferTool] Priority match: finance view');
                return { name: 'change_view', args: { viewName: 'finance' } };
            }
            // Ecommerce (but not "tienda" or "productos" which are editor sections)
            if (norm.includes('ecommerce') || norm.includes('comercio') || norm.includes('pedido') || norm.includes('order')) {
                console.log('[InferTool] Priority match: ecommerce view');
                return { name: 'change_view', args: { viewName: 'ecommerce' } };
            }
            // Appointments
            if (norm.includes('cita') || norm.includes('appointment') || norm.includes('agenda') || norm.includes('reserva')) {
                console.log('[InferTool] Priority match: appointments view');
                return { name: 'change_view', args: { viewName: 'appointments' } };
            }
            // CMS (but not "blog" which could be ambiguous)
            if (norm.includes('cms') || norm.includes('articulo')) {
                console.log('[InferTool] Priority match: cms view');
                return { name: 'change_view', args: { viewName: 'cms' } };
            }
            // Domains
            if (norm.includes('dominio') || norm.includes('domain')) {
                console.log('[InferTool] Priority match: domains view');
                return { name: 'change_view', args: { viewName: 'domains' } };
            }
            // SEO
            if (norm.includes('seo')) {
                console.log('[InferTool] Priority match: seo view');
                return { name: 'change_view', args: { viewName: 'seo' } };
            }
            // Dashboard
            if (norm.includes('dashboard') || norm.includes('inicio') || norm.includes('principal')) {
                console.log('[InferTool] Priority match: dashboard view');
                return { name: 'change_view', args: { viewName: 'dashboard' } };
            }
            // Editor
            if (norm.includes('editor')) {
                console.log('[InferTool] Priority match: editor view');
                return { name: 'change_view', args: { viewName: 'editor' } };
            }
            // Leads / CRM
            if (norm.includes('lead') || norm.includes('crm') || norm.includes('prospecto')) {
                console.log('[InferTool] Priority match: leads view');
                return { name: 'change_view', args: { viewName: 'leads' } };
            }
            // Assets
            if (norm.includes('assets') || norm.includes('recurso') || norm.includes('generador de imagen')) {
                console.log('[InferTool] Priority match: assets view');
                return { name: 'change_view', args: { viewName: 'assets' } };
            }
            // Bio Page
            if (norm.includes('biopage') || norm.includes('bio page') || norm.includes('link in bio') || norm.includes('enlace en bio')) {
                console.log('[InferTool] Priority match: biopage view');
                return { name: 'change_view', args: { viewName: 'biopage' } };
            }
            // Agency
            if (norm.includes('agencia') || norm.includes('agency')) {
                console.log('[InferTool] Priority match: agency view');
                return { name: 'change_view', args: { viewName: 'agency' } };
            }
            // Settings
            if (norm.includes('ajustes') || norm.includes('configuracion del workspace') || norm.includes('settings')) {
                console.log('[InferTool] Priority match: settings view');
                return { name: 'change_view', args: { viewName: 'settings' } };
            }

            // PROJECT LOADING: "abre proyecto X", "carga proyecto X", "usa proyecto X"
            const projectMatch = raw.match(/(?:proyecto|project|sitio|website)\s+["']?([^"']+)["']?/i);
            if (projectMatch && projectMatch[1]) {
                const projectName = projectMatch[1].trim();
                console.log('[InferTool] Priority match: load_project', projectName);
                return { name: 'load_project', args: { identifier: projectName } };
            }

            // PROJECT LOADING BY NAME: "abre Boricua", "abre Mi Tienda"
            // Check if the word after "abre/open" matches any project name
            const openMatch = raw.match(/(?:abre|abrir|open|carga|cargar|usa|usar)\s+["']?([^"']+)["']?$/i);
            if (openMatch && openMatch[1]) {
                const searchTerm = normalizeText(openMatch[1]);
                const matchedProject = projectsRef.current.find(p => {
                    const pName = normalizeText(p.name);
                    return pName === searchTerm || pName.includes(searchTerm) || searchTerm.includes(pName);
                });
                if (matchedProject) {
                    console.log('[InferTool] Priority match: load_project by name', matchedProject.name);
                    return { name: 'load_project', args: { identifier: matchedProject.name } };
                }
            }
        }

        // 1) Match "item X" / "#X" etc
        const numMatch = norm.match(/(?:#|numero|num|item|tier|plan|paso|step|elemento)\s*(\d{1,3})/);
        const index = numMatch ? Number(numMatch[1]) : null;

        if (index && index > 0) {
            if (norm.includes('feature') || norm.includes('caracter')) return { name: 'open_features_item', args: { index } };
            if (norm.includes('testimonial') || norm.includes('testimonio')) return { name: 'open_testimonials_item', args: { index } };
            if (norm.includes('pricing') || norm.includes('precio') || norm.includes('tier') || norm.includes('plan')) return { name: 'open_pricing_tier', args: { index } };
            if (norm.includes('service') || norm.includes('servicio')) return { name: 'open_services_item', args: { index } };
            if (norm.includes('faq') || norm.includes('pregunta') || norm.includes('question')) return { name: 'open_faq_item', args: { index } };
            if (norm.includes('menu') || norm.includes('dish') || norm.includes('platillo')) return { name: 'open_menu_item', args: { index } };
            if (norm.includes('how it works') || norm.includes('howitworks') || norm.includes('paso') || norm.includes('step') || norm.includes('como funciona')) return { name: 'open_howItWorks_step', args: { index } };
        }

        // 2) "abre X" / "open X" / "ir a X" / "ve a X" / "muéstrame X"
        const openPrefixes = ['abre ', 'open ', 'ir a ', 've a ', 'muestrame ', 'abrir ', 'edit ', 'editar ', 'go to '];
        let foundSection: EditorSectionId | null = null;

        for (const prefix of openPrefixes) {
            if (norm.includes(prefix)) {
                const after = norm.split(prefix)[1]?.trim();
                if (after) {
                    foundSection = resolveEditorSectionId(after);
                    if (foundSection) break;
                }
            }
        }

        // 3) Also check if a section word appears WITH an action verb prefix
        //    (NOT a bare keyword match — that caused questions like "que es el hero" to navigate)
        if (!foundSection) {
            const actionSectionMatch = norm.match(/(?:abre|abrir|open|editar|edit|ir a|ve a|muestrame|go to|show)\s+(?:el |la |los |las |the )?(.+)/);
            if (actionSectionMatch && actionSectionMatch[1]) {
                foundSection = resolveEditorSectionId(actionSectionMatch[1].trim());
            }
        }

        if (foundSection) {
            console.log('[InferTool] Found section:', foundSection);
            return { name: 'select_section', args: { sectionName: foundSection } };
        }

        // 4) ONLY if no editor section matched, check for APP VIEW navigation
        // Using words that DON'T conflict with editor sections
        const appViewMap: Record<string, string> = {
            // Email Marketing (unique words)
            marketing: 'email',
            emailmarketing: 'email',
            campanas: 'email',
            campana: 'email',
            correos: 'email',
            email: 'email',
            // Finance (unique words)
            finanzas: 'finance',
            finance: 'finance',
            gastos: 'finance',
            // Ecommerce (unique - NOT "tienda" or "productos" which are editor sections)
            ecommerce: 'ecommerce',
            comercio: 'ecommerce',
            pedidos: 'ecommerce',
            orders: 'ecommerce',
            // Dashboard
            dashboard: 'dashboard',
            // Appointments (unique words)
            citas: 'appointments',
            appointments: 'appointments',
            agenda: 'appointments',
            reservas: 'appointments',
            // CMS
            cms: 'cms',
            articulos: 'cms',
            // Other views
            dominios: 'domains',
            domains: 'domains',
            seo: 'seo',
            plantillas: 'templates',
            templates: 'templates',
            sitios: 'websites',
            websites: 'websites',
            // Editor
            editor: 'editor',
            // Leads / CRM
            leads: 'leads',
            prospectos: 'leads',
            crm: 'leads',
            // Assets
            assets: 'assets',
            recursos: 'assets',
            imagenes: 'assets',
            // Navigation
            navegacion: 'navigation',
            navigation: 'navigation',
            menus: 'navigation',
            // AI Assistant config
            asistente: 'ai-assistant',
            // Bio Page
            biopage: 'biopage',
            bio: 'biopage',
            linkinbio: 'biopage',
            // Agency
            agencia: 'agency',
            agency: 'agency',
            // Settings
            ajustes: 'settings',
            configuracion: 'settings',
            settings: 'settings',
        };

        // Check ALL words after navigation prefix for app view match
        for (const prefix of openPrefixes) {
            if (norm.includes(prefix)) {
                const afterPhrase = norm.split(prefix)[1]?.trim();
                if (afterPhrase) {
                    const wordsAfter = afterPhrase.split(/\s+/);
                    for (const word of wordsAfter) {
                        if (appViewMap[word]) {
                            console.log('[InferTool] Found app view:', appViewMap[word]);
                            return { name: 'change_view', args: { viewName: appViewMap[word] } };
                        }
                    }
                }
            }
        }

        // 5) ACTION COMMANDS: create, update, delete for various components
        const isCreate = /\b(crea|crear|create|nuevo|nueva|new|agrega|agregar|add|añade|añadir)\b/.test(norm);
        const isDelete = /\b(elimina|eliminar|delete|borra|borrar|remove|quita|quitar)\b/.test(norm);
        const isUpdate = /\b(actualiza|actualizar|update|edita|editar|edit|modifica|modificar|cambia|cambiar)\b/.test(norm);
        const isSend = /\b(envia|enviar|send|manda|mandar)\b/.test(norm);
        const isEnable = /\b(activa|activar|enable|habilita|habilitar)\b/.test(norm);
        const isDisable = /\b(desactiva|desactivar|disable|deshabilita|deshabilitar)\b/.test(norm);

        // EMAIL CAMPAIGNS
        if ((norm.includes('campana') || norm.includes('campaign') || norm.includes('email')) &&
            !norm.includes('tienda') && !norm.includes('producto')) {
            if (isCreate) {
                console.log('[InferTool] Fast-path: email_campaign create');
                return { name: 'email_campaign', args: { action: 'create', campaign: {} } };
            }
            if (isSend) {
                console.log('[InferTool] Fast-path: Navigate to email to send');
                return { name: 'change_view', args: { viewName: 'email' } };
            }
        }

        // APPOINTMENTS / CITAS
        if (norm.includes('cita') || norm.includes('appointment') || norm.includes('reunion') || norm.includes('meeting')) {
            if (isCreate) {
                console.log('[InferTool] Fast-path: manage_appointment create');
                return { name: 'manage_appointment', args: { action: 'create' } };
            }
            if (isDelete) {
                console.log('[InferTool] Fast-path: manage_appointment delete');
                return { name: 'manage_appointment', args: { action: 'delete' } };
            }
        }

        // PRODUCTS / PRODUCTOS
        if ((norm.includes('producto') || norm.includes('product')) &&
            (norm.includes('tienda') || norm.includes('ecommerce') || norm.includes('vender') || norm.includes('precio'))) {
            if (isCreate) {
                console.log('[InferTool] Fast-path: ecommerce_product create');
                return { name: 'ecommerce_product', args: { action: 'create', product: {} } };
            }
            if (isDelete) {
                console.log('[InferTool] Fast-path: ecommerce_product delete');
                return { name: 'ecommerce_product', args: { action: 'delete' } };
            }
        }

        // ECOMMERCE ENABLE/DISABLE
        if (norm.includes('ecommerce') || norm.includes('tienda online') || norm.includes('comercio')) {
            if (isEnable) {
                console.log('[InferTool] Fast-path: ecommerce_project enable');
                return { name: 'ecommerce_project', args: { action: 'enable' } };
            }
            if (isDisable) {
                console.log('[InferTool] Fast-path: ecommerce_project disable');
                return { name: 'ecommerce_project', args: { action: 'disable' } };
            }
        }

        // EXPENSES / GASTOS
        if (norm.includes('gasto') || norm.includes('expense') || norm.includes('factura') || norm.includes('invoice')) {
            if (isCreate) {
                console.log('[InferTool] Fast-path: finance_expense create');
                return { name: 'finance_expense', args: { action: 'create', expense: {} } };
            }
            if (isDelete) {
                console.log('[InferTool] Fast-path: finance_expense delete');
                return { name: 'finance_expense', args: { action: 'delete' } };
            }
        }

        // LEADS
        if (norm.includes('lead') || norm.includes('prospecto') || norm.includes('cliente potencial')) {
            if (isCreate) {
                console.log('[InferTool] Fast-path: manage_lead create');
                return { name: 'manage_lead', args: { action: 'create' } };
            }
            if (isDelete) {
                console.log('[InferTool] Fast-path: manage_lead delete');
                return { name: 'manage_lead', args: { action: 'delete' } };
            }
        }

        // CMS POSTS / BLOG
        if (norm.includes('post') || norm.includes('articulo') || norm.includes('blog') || norm.includes('publicacion')) {
            if (isCreate) {
                console.log('[InferTool] Fast-path: manage_cms_post create');
                return { name: 'manage_cms_post', args: { action: 'create' } };
            }
            if (isDelete) {
                console.log('[InferTool] Fast-path: manage_cms_post delete');
                return { name: 'manage_cms_post', args: { action: 'delete' } };
            }
        }

        // DOMAINS
        if (norm.includes('dominio') || norm.includes('domain')) {
            if (isCreate || norm.includes('agrega') || norm.includes('conecta')) {
                console.log('[InferTool] Fast-path: manage_domain add');
                return { name: 'manage_domain', args: { action: 'add' } };
            }
            if (isDelete) {
                console.log('[InferTool] Fast-path: manage_domain delete');
                return { name: 'manage_domain', args: { action: 'delete' } };
            }
        }

        // TEMPLATES
        if (norm.includes('plantilla') || norm.includes('template')) {
            if (isCreate) {
                console.log('[InferTool] Fast-path: manage_template create');
                return { name: 'manage_template', args: { action: 'create' } };
            }
        }

        // WEBSITE / SITIO WEB
        if ((norm.includes('sitio') || norm.includes('website') || norm.includes('pagina web') || norm.includes('landing')) &&
            !norm.includes('seccion')) {
            if (isCreate) {
                console.log('[InferTool] Website creation request requires LLM argument extraction.');
                return null;
            }
        }

        // IMAGE GENERATION
        if ((norm.includes('imagen') || norm.includes('image') || norm.includes('foto')) &&
            (norm.includes('genera') || norm.includes('generate') || norm.includes('crea') || norm.includes('create'))) {
            console.log('[InferTool] Fast-path: generate_image_asset');
            return { name: 'generate_image_asset', args: { prompt: raw } };
        }

        // THEME CHANGE
        if (norm.includes('tema') || norm.includes('theme')) {
            if (norm.includes('oscuro') || norm.includes('dark')) {
                console.log('[InferTool] Fast-path: change_theme dark');
                return { name: 'change_theme', args: { mode: 'dark' } };
            }
            if (norm.includes('claro') || norm.includes('light')) {
                console.log('[InferTool] Fast-path: change_theme light');
                return { name: 'change_theme', args: { mode: 'light' } };
            }
            if (norm.includes('negro') || norm.includes('black')) {
                console.log('[InferTool] Fast-path: change_theme black');
                return { name: 'change_theme', args: { mode: 'black' } };
            }
        }

        console.log('[InferTool] No match');
        return null;
    };

    const buildManualOperatingLayerEntry = (request: string): GlobalAssistantEntryPayload => {
        const project = activeProjectRef.current;
        const tenantContext = tenantContextRef.current;
        const inferredModule = inferGlobalAssistantEntryModule(request);
        const routeModule = resolveModuleFromRoute(path);
        const activeModule = inferredModule || (routeModule && routeModule !== 'project' ? routeModule : null);

        return createGlobalAssistantEntryPayload(request, {
            source: 'global_assistant',
            surface: 'app',
            autoSubmit: true,
            metadata: {
                route: path,
                entryPoint: 'global_assistant_input',
                sourceComponent: 'GlobalAiAssistant',
                assistantLayer: 'global_operating_layer',
                commandCenter: true,
                memoryScopeHint: 'user_tenant_project_module_session_task',
                activeModule,
                routeModule,
                activeProjectId: project?.id || null,
                activeProjectName: typeof project?.name === 'string' ? project.name : null,
                activeTenantId: tenantContext?.currentTenant?.id || project?.tenantId || null,
                activeTenantName: tenantContext?.currentTenant?.name || null,
            },
        });
    };

    const shouldRouteEntryToOperatingLayer = (entry?: GlobalAssistantEntryPayload): entry is GlobalAssistantEntryPayload =>
        Boolean(entry && (
            entry.source === 'dashboard_welcome' ||
            entry.source === 'command_palette' ||
            entry.source === 'global_assistant' ||
            entry.surface === 'dashboard' ||
            entry.surface === 'admin'
        ));

    const getEntryActiveModule = (entry?: GlobalAssistantEntryPayload): unknown =>
        entry?.metadata && typeof entry.metadata.activeModule === 'string'
            ? entry.metadata.activeModule
            : null;

    const getEntryRouteModule = (entry?: GlobalAssistantEntryPayload): unknown =>
        entry?.metadata && typeof entry.metadata.routeModule === 'string'
            ? entry.metadata.routeModule
            : null;

    const getEntryQuickActionId = (entry?: GlobalAssistantEntryPayload): string | null =>
        entry?.metadata && typeof entry.metadata.quickActionId === 'string'
            ? entry.metadata.quickActionId
            : null;

    const openAIStudioFromAssistant = (request: string): void => {
        const prompt = request.trim();
        if (typeof window !== 'undefined') {
            if (prompt) {
                window.localStorage.setItem('aiStudioInitialPrompt', prompt);
            } else {
                window.localStorage.removeItem('aiStudioInitialPrompt');
            }
            window.localStorage.setItem('onboardingMode', 'ai-studio');
        }
        setOnboardingMode('ai-studio');
        setIsOnboardingOpen(true);
    };

    const appendProjectGuideContext = (message: string, projectName?: string | null): string => {
        if (!projectName) return message;
        const label = isSpanishLocale(i18n.language) ? 'Proyecto' : 'Project';
        return `${message}\n${label}: ${projectName}.`;
    };

    const resolveDirectNavigationProject = async (request: string): Promise<{
        blocked: boolean;
        message?: string;
        projectId?: string | null;
        projectName?: string | null;
    }> => {
        const resolution = resolveProjectMentionFromRequest({
            request,
            projects: projectsRef.current,
            activeProjectId: activeProjectRef.current?.id || null,
            locale: i18n.language,
        });

        if (resolution.status === 'ambiguous' || resolution.status === 'not_found') {
            return {
                blocked: true,
                message: resolution.message || resolveGuideOnlyFallbackResponse({ request, locale: i18n.language }).message,
            };
        }

        if (resolution.status !== 'matched' || !resolution.projectId) {
            return {
                blocked: false,
                projectId: activeProjectRef.current?.id || null,
                projectName: null,
            };
        }

        const project = projectsRef.current.find(candidate => candidate.id === resolution.projectId);
        if (activeProjectRef.current?.id !== resolution.projectId) {
            try {
                await Promise.resolve(loadProjectRef.current(resolution.projectId, false, false));
                if (project) {
                    activeProjectRef.current = project;
                    dataRef.current = project.data;
                }
            } catch (error) {
                console.warn('[Global Assistant] Failed to switch project for direct navigation:', error);
                return {
                    blocked: true,
                    message: isSpanishLocale(i18n.language)
                        ? `No pude abrir el proyecto "${resolution.projectName || resolution.projectId}". Revisa el nombre e inténtalo otra vez.`
                        : `I could not open the project "${resolution.projectName || resolution.projectId}". Check the name and try again.`,
                };
            }
        }

        return {
            blocked: false,
            projectId: resolution.projectId,
            projectName: resolution.projectName || project?.name || null,
        };
    };

    interface DirectModuleNavigationResult {
        message: string;
        target: string;
        projectId?: string | null;
        projectName?: string | null;
    }

    const maybeHandleDirectModuleNavigation = async (
        request: string,
        entry?: GlobalAssistantEntryPayload,
    ): Promise<DirectModuleNavigationResult | null> => {
        const quickActionId = getEntryQuickActionId(entry);
        const activeModule = getEntryActiveModule(entry);
        const decision = resolveDirectModuleGuideDecision({
            request,
            activeModule: typeof activeModule === 'string' ? activeModule : null,
            quickActionId,
            locale: i18n.language,
        });

        if (!decision) return null;

        const navigationProject = await resolveDirectNavigationProject(request);
        if (navigationProject.blocked) {
            return {
                target: 'project_resolution',
                message: navigationProject.message || resolveGuideOnlyFallbackResponse({ request, locale: i18n.language }).message,
                projectId: null,
                projectName: null,
            };
        }

        const resolvedProjectId = navigationProject.projectId || activeProjectRef.current?.id || null;
        if (isProjectScopedGuideTarget(decision.target) && !resolvedProjectId) {
            setViewRef.current('websites');
            navigateRef.current(ROUTES.WEBSITES);
            return {
                target: 'project_required',
                message: formatMissingProjectGuideMessage(decision.target, request, i18n.language),
                projectId: null,
                projectName: null,
            };
        }

        if (decision.target === 'aiStudio') {
            openAIStudioFromAssistant(decision.prompt || '');
            return {
                target: decision.target,
                message: appendProjectGuideContext(decision.message, navigationProject.projectName),
                projectId: navigationProject.projectId || null,
                projectName: navigationProject.projectName || null,
            };
        }

        if (decision.target === 'image' || decision.target === 'video') {
            const launch = storeMediaGeneratorLaunchRequest({
                mode: decision.target === 'video' ? 'video' : 'image',
                prompt: decision.prompt,
                autoStart: false,
                projectId: resolvedProjectId,
                source: 'global_assistant',
                options: decision.options,
            });
            setViewRef.current('assets');
            navigateRef.current(ROUTES.ASSETS);
            if (launch) {
                window.setTimeout(() => dispatchMediaGeneratorLaunchRequest(launch), 350);
            }
            return {
                target: decision.target,
                message: appendProjectGuideContext(decision.message, navigationProject.projectName),
                projectId: resolvedProjectId,
                projectName: navigationProject.projectName || null,
            };
        }

        if (decision.target === 'websiteBuilder' || decision.target === 'businessBlueprint') {
            const projectId = resolvedProjectId;
            if (projectId) {
                setViewRef.current('editor');
                navigateToEditorRef.current(projectId);
            } else {
                setViewRef.current('websites');
                navigateRef.current(ROUTES.WEBSITES);
            }
            return {
                target: decision.target,
                message: appendProjectGuideContext(decision.message, navigationProject.projectName),
                projectId: projectId || null,
                projectName: navigationProject.projectName || null,
            };
        }

        const targetViews: Record<string, { view: View; route: string; adminView?: AdminView }> = {
            media: { view: 'assets', route: ROUTES.ASSETS },
            storefront: { view: 'ecommerce', route: ROUTES.ECOMMERCE },
            leads: { view: 'leads', route: ROUTES.LEADS },
            email: { view: 'email', route: ROUTES.EMAIL },
            ecommerce: { view: 'ecommerce', route: ROUTES.ECOMMERCE },
            chatcore: { view: 'ai-assistant', route: ROUTES.AI_ASSISTANT },
            appointments: { view: 'appointments', route: ROUTES.APPOINTMENTS },
            bioPage: { view: 'biopage', route: ROUTES.BIOPAGE },
            analytics: { view: 'dashboard', route: ROUTES.DASHBOARD },
            finance: { view: 'finance', route: ROUTES.FINANCE },
            restaurants: { view: 'restaurants', route: ROUTES.RESTAURANTS },
            realEstate: { view: 'real-estate', route: ROUTES.REAL_ESTATE },
            projects: { view: 'websites', route: ROUTES.WEBSITES },
            settings: { view: 'settings', route: ROUTES.SETTINGS },
            designSystem: { view: 'superadmin', route: ROUTES.ADMIN_DESIGN_TOKENS, adminView: 'design-tokens' },
            ownerMode: { view: 'superadmin', route: ROUTES.SUPERADMIN, adminView: 'main' },
        };
        const route = targetViews[decision.target];
        if (!route) return null;

        if (route.adminView) {
            setAdminView(route.adminView);
        }
        setViewRef.current(route.view);
        navigateRef.current(route.route);

        return {
            target: decision.target,
            message: appendProjectGuideContext(decision.message, navigationProject.projectName),
            projectId: resolvedProjectId,
            projectName: navigationProject.projectName || null,
        };
    };

    const syncAssistantConversationNavigation = (
        navigation: DirectModuleNavigationResult,
        entry?: GlobalAssistantEntryPayload,
    ) => {
        const conversation = assistantConversationRef.current;
        if (!conversation) return;

        const project = navigation.projectId
            ? projectsRef.current.find(candidate => candidate.id === navigation.projectId) || activeProjectRef.current
            : activeProjectRef.current;
        const tenantContext = tenantContextRef.current;
        const nextTenantId = project?.tenantId || tenantContext?.currentTenant?.id || conversation.tenantId;
        const nextProjectId = navigation.projectId || conversation.projectId;

        const nextConversation: AssistantConversation = {
            ...conversation,
            tenantId: nextTenantId || null,
            projectId: nextProjectId || null,
            activeTaskId: null,
            metadata: {
                ...(conversation.metadata || {}),
                lastNavigationTarget: navigation.target,
                lastNavigationProjectId: nextProjectId || null,
                lastNavigationProjectName: navigation.projectName || project?.name || null,
                lastNavigationRoute: path,
                lastNavigationAt: new Date().toISOString(),
                lastEntrySource: entry?.source || null,
                lastEntryMetadata: entry?.metadata || {},
                guideOnly: true,
            },
        };

        assistantConversationRef.current = nextConversation;
        void globalAssistantConversationService.upsertConversation(nextConversation)
            .then(saved => {
                assistantConversationRef.current = saved;
                assistantConversationIdRef.current = saved.id;
            })
            .catch(error => {
                console.warn('[Global Assistant] Failed to sync direct navigation context:', error);
            });
    };

    const formatComponentHelpResponse = (
        request: string,
        entry?: GlobalAssistantEntryPayload,
    ): { targetId: string; message: string } | null => {
        return resolveComponentHelpGuideResponse({
            request,
            activeModule: getEntryActiveModule(entry) as string | null,
            activeRoute: typeof entry?.metadata?.route === 'string' ? entry.metadata.route : path,
            activeRouteModule: getEntryRouteModule(entry) as string | null,
            quickActionId: getEntryQuickActionId(entry),
            locale: i18n.language,
        });
    };

    const processTextRequest = async (request: string, entry?: GlobalAssistantEntryPayload) => {
        const userMsg = request.trim();
        if (!userMsg) return;
        const operatingLayerEntry = entry || buildManualOperatingLayerEntry(userMsg);

        await ensureAssistantConversation(userMsg, operatingLayerEntry);
        setInput('');
        setMessages(prev => [...prev, {
            role: 'user',
            text: userMsg,
            metadata: {
                source: operatingLayerEntry.source,
                surface: operatingLayerEntry.surface,
                entryMetadata: operatingLayerEntry.metadata || {},
                pendingTaskId: pendingOperatingLayerTaskRef.current?.taskId || null,
            },
        }]);

        if (!isLiveActive) {
            setIsThinking(true);
            try {
                console.log('[Global Assistant] Processing message:', userMsg, operatingLayerEntry ? {
                    source: operatingLayerEntry.source,
                    surface: operatingLayerEntry.surface,
                    metadata: operatingLayerEntry.metadata,
                } : undefined);

                const componentHelpResponse = formatComponentHelpResponse(userMsg, operatingLayerEntry);
                if (componentHelpResponse) {
                    setMessages(prev => [...prev, {
                        role: 'model',
                        text: componentHelpResponse.message,
                        metadata: {
                            source: 'component_help',
                            targetId: componentHelpResponse.targetId,
                        },
                    }]);
                    setIsThinking(false);
                    return;
                }

                const directModuleNavigation = await maybeHandleDirectModuleNavigation(userMsg, operatingLayerEntry);
                if (directModuleNavigation) {
                    setPendingOperatingLayerTask(null);
                    syncAssistantConversationNavigation(directModuleNavigation, operatingLayerEntry);
                    setMessages(prev => [...prev, {
                        role: 'model',
                        text: directModuleNavigation.message,
                        metadata: {
                            source: 'direct_module_navigation',
                            target: directModuleNavigation.target,
                            projectId: directModuleNavigation.projectId || null,
                        },
                    }]);
                    setIsThinking(false);
                    return;
                }

                const pendingOperatingLayer = pendingOperatingLayerTaskRef.current;
                if (pendingOperatingLayer && isAssistantPlanCancellation(userMsg)) {
                    const cancelled = await globalAssistantRuntime.cancelPlan({
                        taskId: pendingOperatingLayer.taskId,
                        cancelledBy: user?.id || userDocumentRef.current?.id || null,
                    });
                    setPendingOperatingLayerTask(null);
                    clearAssistantConversationTask(cancelled.task.id, cancelled.plan.status);
                    setMessages(prev => [...prev, {
                        role: 'model',
                        text: isSpanishLocale(i18n.language)
                            ? `Plan cancelado: ${pendingOperatingLayer.actionLabels.join(', ')}`
                            : `Plan cancelled: ${pendingOperatingLayer.actionLabels.join(', ')}`,
                        contextSnapshotId: pendingOperatingLayer.context.id,
                        actionIds: cancelled.actions.map(action => action.id),
                        metadata: {
                            source: 'operating_layer_cancel',
                            taskId: cancelled.task.id,
                            planStatus: cancelled.plan.status,
                            actionStatuses: cancelled.actions.map(action => action.status),
                            actionLabels: pendingOperatingLayer.actionLabels,
                        },
                    }]);
                    setIsThinking(false);
                    return;
                }

                if (pendingOperatingLayer && isAssistantPlanConfirmation(userMsg)) {
                    const cancelled = await globalAssistantRuntime.cancelPlan({
                        taskId: pendingOperatingLayer.taskId,
                        cancelledBy: user?.id || userDocumentRef.current?.id || null,
                    });
                    setPendingOperatingLayerTask(null);
                    clearAssistantConversationTask(cancelled.task.id, cancelled.plan.status);
                    setMessages(prev => [...prev, {
                        role: 'model',
                        text: isSpanishLocale(i18n.language)
                            ? 'No hice cambios. Te puedo llevar al módulo correcto para que lo revises y lo apliques desde ahí.'
                            : 'I did not make changes. I can take you to the right module so you can review and apply it there.',
                        contextSnapshotId: pendingOperatingLayer.context.id,
                        actionIds: cancelled.actions.map(action => action.id),
                        metadata: {
                            source: 'guide_only_confirmation_blocked',
                            taskId: cancelled.task.id,
                            planStatus: cancelled.plan.status,
                            actionStatuses: cancelled.actions.map(action => action.status),
                            actionLabels: pendingOperatingLayer.actionLabels,
                        },
                    }]);
                    setIsThinking(false);
                    return;
                }

                const guideOnlyActionResponse = resolveGuideOnlyActionResponse({
                    request: userMsg,
                    activeModule: getEntryActiveModule(operatingLayerEntry) as string | null,
                    quickActionId: getEntryQuickActionId(operatingLayerEntry),
                    locale: i18n.language,
                });
                if (guideOnlyActionResponse) {
                    setPendingOperatingLayerTask(null);
                    setMessages(prev => [...prev, {
                        role: 'model',
                        text: guideOnlyActionResponse.message,
                        metadata: {
                            source: 'guide_only_action_request',
                        },
                    }]);
                    setIsThinking(false);
                    return;
                }

                if (shouldRouteEntryToOperatingLayer(operatingLayerEntry)) {
                    const guideOnlyFallback = resolveGuideOnlyFallbackResponse({
                        request: userMsg,
                        locale: i18n.language,
                    });
                    setPendingOperatingLayerTask(null);
                    setMessages(prev => [...prev, {
                        role: 'model',
                        text: guideOnlyFallback.message,
                        metadata: {
                            source: 'guide_only_operating_layer_fallback',
                            guideOnly: true,
                        },
                    }]);
                    setIsThinking(false);
                    return;
                }

                // ============================================================
                // STEP 1: Fast-path tool inference from user text
                // ============================================================
                const inferredTool = inferToolCallFromUserText(userMsg);
                if (inferredTool) {
                    console.log('[Global Assistant] Fast-path tool inferred:', inferredTool);
                    try {
                        const { result, error } = await executeTool(inferredTool.name, inferredTool.args, 'chat');
                        if (error) {
                            setMessages(prev => [...prev, { role: 'model', text: `⚠️ ${error}` }]);
                        } else {
                            const resultText = typeof result === 'string' ? result : ((result as any)?.result || JSON.stringify(result));
                            setMessages(prev => [...prev, { role: 'model', text: `✅ ${resultText}` }]);
                        }
                    } catch (toolErr: any) {
                        console.error('[Global Assistant] Tool execution error:', toolErr);
                        setMessages(prev => [...prev, { role: 'model', text: `⚠️ Error al ejecutar la acción: ${toolErr?.message || 'Unknown error'}` }]);
                    }
                    setIsThinking(false);
                    return;
                }

                // ============================================================
                // STEP 2: Send to LLM with vision for conversational responses
                // ============================================================

                // Build conversation history for context
                const historyText = messages
                    .slice(-6) // Keep only last 6 messages for speed
                    .filter(m => !m.isToolOutput)
                    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
                    .join('\n');

                // Build current context information
                const currentView = viewRef.current || 'dashboard';
                const currentProject = activeProjectRef.current;
                const projectInfo = currentProject
                    ? `Project: "${currentProject.name}"`
                    : 'No project loaded';

                // Use admin-configured system instruction (templates + base + context)
                const effectiveInstruction = getEffectiveSystemInstruction('chat');

                // Always capture screen for context (fast with html2canvas-pro)
                console.time('[Global Assistant] Screen Capture');
                const screenCapture = await captureCurrentView();
                console.timeEnd('[Global Assistant] Screen Capture');

                const fullPrompt = `${effectiveInstruction}

${historyText ? `CONVERSACIÓN RECIENTE:\n${historyText}\n` : ''}
Usuario: ${userMsg}`;

                // Use model, temperature, and maxTokens from admin config
                const proxyProjectId = activeProject?.id || user?.id || 'anonymous';
                const chatModel = globalAssistantConfig.model || 'gemini-3-flash-preview';
                const proxyConfig = {
                    temperature: globalAssistantConfig.temperature ?? 0.7,
                    maxOutputTokens: globalAssistantConfig.maxTokens ?? 2048
                };
                console.log(`[Global Assistant] Using model: ${chatModel}, temp: ${proxyConfig.temperature}, maxTokens: ${proxyConfig.maxOutputTokens}`);

                // Prepare TOOLS for the REST API — filter by service availability
                const availableTools = isLoadingServices
                    ? GLOBAL_ASSISTANT_GUIDE_ONLY_TOOLS
                    : GLOBAL_ASSISTANT_GUIDE_ONLY_TOOLS.filter(tool => {
                        const requiredService = TOOL_SERVICE_MAP[tool.name];
                        return !requiredService || canAccessService(requiredService);
                    }).map(tool => {
                        // Dynamically filter the change_view enum to exclude disabled views
                        if (tool.name === 'change_view') {
                            const viewNameProp = tool.parameters?.properties?.viewName;
                            if (viewNameProp && 'enum' in viewNameProp && Array.isArray(viewNameProp.enum)) {
                                const filteredEnum = viewNameProp.enum.filter((v: string) => {
                                    const svc = VIEW_SERVICE_MAP[v];
                                    return !svc || canAccessService(svc);
                                });
                                return {
                                    ...tool,
                                    parameters: {
                                        ...tool.parameters,
                                        properties: {
                                            ...tool.parameters?.properties,
                                            viewName: { ...viewNameProp, enum: filteredEnum },
                                        },
                                    },
                                };
                            }
                        }
                        return tool;
                    });
                const restTools = [{ functionDeclarations: availableTools }];

                console.time('[Global Assistant] LLM Response');
                let response;

                if (screenCapture) {
                    response = await generateMultimodalContentViaProxy(
                        proxyProjectId,
                        fullPrompt,
                        [{ mimeType: "image/jpeg", data: screenCapture }],
                        chatModel,
                        proxyConfig,
                        user?.id,
                        restTools
                    );
                } else {
                    response = await generateContentViaProxy(
                        proxyProjectId,
                        fullPrompt,
                        chatModel,
                        proxyConfig,
                        user?.id,
                        restTools
                    );
                }
                console.timeEnd('[Global Assistant] LLM Response');

                // ============================================================
                // STEP 3: Check for native function call in Gemini response
                // ============================================================
                const candidates = response?.response?.candidates || response?.candidates;
                const parts = candidates?.[0]?.content?.parts || [];
                const functionCallPart = parts.find((p: any) => p.functionCall);

                if (functionCallPart?.functionCall) {
                    const { name: toolName, args: toolArgs } = functionCallPart.functionCall;
                    console.log('[Global Assistant] Native function call:', toolName, toolArgs);
                    try {
                        const { result, error } = await executeTool(toolName, toolArgs || {}, 'chat');
                        if (error) {
                            setMessages(prev => [...prev, { role: 'model', text: `⚠️ ${error}` }]);
                        } else {
                            const resultText = typeof result === 'string' ? result : ((result as any)?.result || JSON.stringify(result));
                            setMessages(prev => [...prev, { role: 'model', text: `✅ ${resultText}` }]);
                        }
                    } catch (toolErr: any) {
                        console.error('[Global Assistant] Function call execution error:', toolErr);
                        setMessages(prev => [...prev, { role: 'model', text: `⚠️ Error: ${toolErr?.message || 'Unknown error'}` }]);
                    }
                } else {
                    // No native function call — extract text and check for embedded JSON tool calls
                    const responseText = extractTextFromResponse(response).trim();
                    console.log('[Global Assistant] Response:', responseText?.substring(0, 200));

                    if (responseText) {
                        const extractedTool = tryExtractToolCall(responseText);
                        if (extractedTool) {
                            console.log('[Global Assistant] Extracted tool_call from LLM text:', extractedTool);
                            try {
                                const { result, error } = await executeTool(extractedTool.name, extractedTool.args, 'chat');
                                if (error) {
                                    setMessages(prev => [...prev, { role: 'model', text: `⚠️ ${error}` }]);
                                } else {
                                    const resultText = typeof result === 'string' ? result : ((result as any)?.result || JSON.stringify(result));
                                    setMessages(prev => [...prev, { role: 'model', text: `✅ ${resultText}` }]);
                                }
                            } catch (toolErr: any) {
                                console.error('[Global Assistant] Text tool execution error:', toolErr);
                                setMessages(prev => [...prev, { role: 'model', text: `⚠️ Error: ${toolErr?.message || 'Unknown error'}` }]);
                            }
                        } else {
                            // Normal text response — display as-is
                            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
                        }
                    } else {
                        setMessages(prev => [...prev, { role: 'model', text: "¿En qué puedo ayudarte?" }]);
                    }
                }

            } catch (e: any) {
                console.error('[Global Assistant] Error:', e);
                handleApiError(e);
                const errorMessage = typeof e?.message === 'string' ? e.message : "Error processing request.";
                setMessages(prev => [...prev, { role: 'model', text: `Error: ${errorMessage}` }]);
            } finally {
                setIsThinking(false);
            }
        }
    };

    const handleTextSend = async () => {
        await processTextRequest(input);
    };

    const clearAssistantConversation = () => {
        assistantConversationRef.current = null;
        assistantConversationIdRef.current = null;
        persistedMessageCountRef.current = 0;
        setPendingOperatingLayerTask(null);
        setMessages([]);
    };

    useEffect(() => {
        processTextRequestRef.current = processTextRequest;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const openAssistantWithEntry = (entry: GlobalAssistantEntryPayload | null) => {
            const request = entry?.request?.trim();
            if (!request) return;

            clearStoredGlobalAssistantEntryRequest();
            setIsMinimized(false);
            setIsOpen(true);

            if (entry.autoSubmit === false) {
                setInput(request);
                window.setTimeout(() => inputRef.current?.focus(), 80);
                return;
            }

            void processTextRequestRef.current?.(request, entry);
        };

        const handleEntryRequest = (event: Event) => {
            openAssistantWithEntry((event as CustomEvent<GlobalAssistantEntryPayload>).detail || null);
        };

        window.addEventListener(GLOBAL_ASSISTANT_ENTRY_EVENT, handleEntryRequest);

        const storedEntry = readStoredGlobalAssistantEntryRequest();
        if (storedEntry) {
            window.setTimeout(() => openAssistantWithEntry(storedEntry), 80);
        }

        return () => {
            window.removeEventListener(GLOBAL_ASSISTANT_ENTRY_EVENT, handleEntryRequest);
        };
    }, []);

    useEffect(() => { return () => stopLiveSession(); }, []);

    // =========================================================================
    // FOOTER TRIGGER BAR (Dynamic: Center Bar OR Side Bubble)
    // =========================================================================
    const footerTriggerContent = isMinimized ? (
        // MODE 1: MINIMIZED BUBBLE (Bottom-Right)
        <div id="global-ai-assistant-footer-bubble" className="fixed bottom-6 right-6 z-[1000] pointer-events-none animate-in fade-in zoom-in duration-300">
            <button
                onClick={() => { setIsMinimized(false); setIsOpen(true); }}
                className={`pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 ${isLiveActive
                    ? 'bg-q-surface border-2 border-q-error/25 animate-pulse'
                    : 'bg-q-surface border border-q-border hover:border-primary/50'
                    }`}
            >
                {/* Logo with voice-active indicator */}
                <div className="relative flex items-center justify-center w-full h-full">
                    <img src={LOGO_URL} alt="Quimera" className={`w-8 h-8 object-contain ${isLiveActive ? 'animate-pulse' : ''}`} />
                    {isLiveActive && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-q-error border-2 border-card animate-pulse" />
                    )}
                    {!isLiveActive && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-q-success border-2 border-card" />
                    )}
                </div>
            </button>
        </div>
    ) : (
        // MODE 2: DEFAULT CENTER BAR (Bottom-Center)
        <div id="global-ai-assistant-footer-bar" className="fixed bottom-6 inset-x-0 z-[1000] px-6 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className={`assistant-footer-trigger pointer-events-auto mx-auto flex items-center gap-3 px-5 py-3 backdrop-blur-lg border rounded-full shadow-xl transition-all max-w-md w-full ${isLiveActive ? 'bg-primary/20 border-primary/50 animate-pulse' : 'bg-q-surface/95 border-q-border hover:shadow-2xl'}`}>
                {/* Logo with voice-active indicator */}
                <div className="relative shrink-0">
                    <img src={LOGO_URL} alt="Quimera" className={`w-9 h-9 object-contain transition-transform ${isLiveActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${isLiveActive ? 'bg-q-error animate-pulse' : 'bg-q-success'}`} />
                </div>

                {/* Content area - shows voice visualizer when active, otherwise input placeholder */}
                <div className="flex-1">
                    {isLiveActive ? (
                        <div className="flex items-center gap-2">
                            {/* Mini audio visualizer bars */}
                            <div className="flex items-end gap-0.5 h-5">
                                {visualizerLevels.slice(0, 8).map((height, i) => (
                                    <div
                                        key={i}
                                        className="w-1 bg-primary rounded-full transition-all duration-75"
                                        style={{ height: `${Math.max(4, height / 3)}px` }}
                                    />
                                ))}
                            </div>
                            <span className="text-sm text-primary font-medium flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-q-error animate-pulse" />
                                Escuchando...
                            </span>
                        </div>
                    ) : (
                        <button onClick={() => setIsOpen(true)} className="flex-1 min-w-0 text-left group mx-2">
                            <p className="text-sm text-q-text-muted group-hover:text-foreground transition-colors truncate">
                                {i18n.language.startsWith('es') ? "Pregunta a Quibo..." : "Ask Quibo..."}
                            </p>
                        </button>
                    )}
                </div>

                {/* Action icons - botones redondos 36×36px fijos */}
                <div className="flex items-center gap-2 shrink-0 self-center">
                    {globalAssistantConfig.enableLiveVoice && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isLiveActive) {
                                    stopLiveSession();
                                } else {
                                    startLiveSession();
                                }
                            }}
                            className={`shrink-0 self-center flex items-center justify-center rounded-full transition-all ${isLiveActive ? 'bg-q-error/20 text-q-error hover:bg-q-error/30' : 'hover:bg-primary/10 text-q-text-muted hover:text-primary'}`}
                            style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', maxHeight: '36px' }}
                        >
                            {isLiveActive ? <PhoneOff size={18} /> : <Mic size={18} />}
                        </button>
                    )}
                    {/* Minimize Bar to Bubble */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                        className="shrink-0 self-center flex items-center justify-center rounded-full hover:bg-primary/10 text-q-text-muted hover:text-primary transition-colors"
                        style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', maxHeight: '36px' }}
                        title={t('aiAssistant.minimizeToBubble')}
                    >
                        <Minus size={18} />
                    </button>
                    {!isLiveActive && (
                        <button
                            onClick={() => setIsOpen(true)}
                            className="shrink-0 self-center flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors shadow-sm"
                            style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', maxWidth: '36px', maxHeight: '36px', aspectRatio: '1 / 1' }}
                        >
                            <Send size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div >
    );

    // =========================================================================
    // DRAWER CONTENT (Bottom sheet with chat)
    // =========================================================================
    const drawerContent = (
        <div id="global-ai-assistant-drawer" className={`fixed z-[10000] bg-q-surface border border-q-border shadow-2xl rounded-3xl flex flex-col overflow-hidden transition-all duration-300 animate-drawer-slide-up ${isExpanded ? 'inset-4' : 'bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[420px] h-[65vh] md:h-[550px]'}`}>
            {/* Drawer Header */}
            <div className="p-4 flex justify-between items-center bg-q-surface border-b border-q-border shrink-0 select-none cursor-move" onMouseDown={(e) => {
                // Determine if we should implement drag logic here or assume user handles it globally
                // For now just add cursor-move as requested "Si desea mover el usuario ese modal" implies potential drag desire
                // But the primary request is the minimize button.
            }}>
                {/* Handle for mobile */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 md:hidden">
                    <div className="drawer-handle" />
                </div>

                <div className="flex items-center gap-3">
                    {/* Minimize Button - Sets isMinimized=true, hides drawer */}
                    {/* Minimize Button - Sets isMinimized=true, hides drawer */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(true); setIsOpen(false); }}
                        className="p-1.5 hover:bg-secondary/50 rounded-md transition-colors text-q-text-muted hover:text-foreground z-10"
                        title="Minimizar (a burbuja)"
                    >
                        <Minus size={20} />
                    </button>

                    <div className="relative">
                        <img src={LOGO_URL} alt="Quimera Logo" className="w-10 h-10 object-contain bg-secondary/30 rounded-full p-1 border border-q-border" />
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-q-surface ${isLiveActive ? 'bg-q-error animate-pulse' : 'bg-q-success'}`} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm leading-tight text-foreground">Quimera Assistant</h3>
                        <p className="text-[10px] text-q-text-muted font-medium truncate max-w-[200px]">
                            {isLiveActive ? 'Escuchando...' : activeProject ? `En: ${activeProject.name}` : 'Dashboard Mode'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-1 items-center text-q-text-muted">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-secondary/50 hover:text-foreground rounded-md transition-colors hidden md:flex">
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <button onClick={() => { setIsOpen(false); setIsMinimized(false); stopLiveSession(); }} className="p-1.5 hover:bg-secondary/50 hover:text-foreground rounded-md transition-colors">
                        <ChevronDown size={18} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-q-bg/50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && !msg.isToolOutput && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mr-2 shrink-0 overflow-hidden">
                                <img src={LOGO_URL} alt="Bot" className="w-5 h-5 object-contain" />
                            </div>
                        )}
                        <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : msg.isToolOutput
                                ? 'bg-secondary/50 text-q-text-muted text-xs font-mono border border-dashed border-q-border w-full'
                                : 'bg-q-surface text-foreground border border-q-border rounded-tl-sm'
                            }`}>
                            {msg.role === 'model' && !msg.isToolOutput ? (
                                <ReactMarkdown
                                    components={{
                                        p: ({ node, ...props }) => <p className="mb-4 last:mb-0 leading-relaxed whitespace-pre-wrap break-words" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="mb-4 last:mb-0 list-disc pl-5 space-y-1" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="mb-4 last:mb-0 list-decimal pl-5 space-y-1" {...props} />,
                                        li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                        h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-3 mt-4 first:mt-0" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-2 mt-3 first:mt-0" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-primary/50 pl-4 italic my-4 bg-primary/5 rounded-r py-2" {...props} />,
                                        code: ({ node, ...props }) => <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground" {...props} />,
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>
                            ) : (
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            )}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-secondary/50 border border-q-border flex items-center justify-center ml-2 shrink-0 overflow-hidden">
                                {userDocument?.photoURL ? <img src={userDocument.photoURL} alt="User" className="w-full h-full object-cover" /> : <UserIcon size={16} className="text-q-text-muted" />}
                            </div>
                        )}
                    </div>
                ))}

                {/* Preparing guidance */}
                {isExecutingCommands && (
                    <div className="flex justify-start">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mr-2 shrink-0 overflow-hidden">
                            <img src={LOGO_URL} alt="Bot" className="w-5 h-5 object-contain animate-pulse" />
                        </div>
                        <div className="bg-q-surface border border-q-border px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-sm text-q-text-muted">
                            <img src="/logos/quimera-icon.svg" alt="Loading..." className="w-4 h-4 object-contain animate-pulse" />
                            <span>{t('superadmin.globalAssistant.drawer.preparing', 'Preparando...')}</span>
                        </div>
                    </div>
                )}

                {/* Thinking */}
                {isThinking && (
                    <div className="flex justify-start">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mr-2 shrink-0 overflow-hidden">
                            <img src={LOGO_URL} alt="Bot" className="w-5 h-5 object-contain" />
                        </div>
                        <div className="bg-q-surface border border-q-border px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-sm text-q-text-muted">
                            <img src="/logos/quimera-icon.svg" alt="Loading..." className="w-4 h-4 object-contain animate-pulse" />
                            <span>{t('superadmin.globalAssistant.drawer.thinking', 'Pensando...')}</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-q-surface border-t border-q-border shrink-0 safe-area-inset-bottom">
                <div className="flex items-center gap-2 bg-secondary/30 p-1.5 rounded-full border border-q-border focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                    <button onClick={clearAssistantConversation} className="p-2 text-q-text-muted hover:text-q-error hover:bg-secondary rounded-full transition-colors" title="Clear Chat">
                        <Trash2 size={18} />
                    </button>
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTextSend()}
                        placeholder={i18n.language.startsWith('es') ? "Pregunta a Quibo..." : "Ask Quibo..."}
                        className="flex-1 bg-transparent px-2 text-sm outline-none text-foreground placeholder:text-q-text-muted/50"
                        disabled={isLiveActive}
                        autoFocus
                    />
                    {globalAssistantConfig.enableLiveVoice && (
                        <button
                            onClick={startLiveSession}
                            disabled={isConnecting || isLiveActive || hasApiKey === false}
                            className={`p-2 rounded-full transition-all ${isConnecting ? 'text-q-text-muted' : 'text-q-text-muted hover:text-primary hover:bg-primary/10'}`}
                            title={t('aiAssistant.startVoiceMode')}
                        >
                            {isConnecting ? <img src="/logos/quimera-icon.svg" alt="Connecting..." className="w-5 h-5 object-contain animate-pulse" /> : <Mic size={20} />}
                        </button>
                    )}
                    <button
                        onClick={handleTextSend}
                        disabled={!input.trim() || isThinking || isLiveActive}
                        className="shrink-0 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all hover:scale-105"
                        style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', maxWidth: '36px', maxHeight: '36px', aspectRatio: '1 / 1' }}
                    >
                        <Send size={18} />
                    </button>
                </div>

                {/* Status Bar */}
                <div className="mt-2 flex justify-between items-center px-2">
                    <p className="text-[10px] text-q-text-muted flex items-center">
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${activeProject ? 'bg-q-success' : 'bg-q-surface-overlay'}`} />
                        {activeProject ? `Activo: ${activeProject.name}` : 'Dashboard Mode'}
                    </p>
                    <div className="flex items-center gap-2">
                        {(() => {
                            const access = resolveOperatingLayerAccessContext({
                                userRole: userDocument?.role || null,
                                tenantRole: tenantContext?.currentMembership?.role || null,
                                tenantPermissions: tenantContext?.currentMembership?.permissions,
                            });
                            const privileged = access.mode === 'owner' || access.mode === 'super_admin';
                            return (
                                <>
                                    {privileged && <Shield size={10} className="text-q-accent" />}
                                    <p className="text-[10px] text-q-text-muted">
                                        {formatOperatingLayerAccessLabel(access.mode)}
                                    </p>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );

    // =========================================================================
    // MAIN RENDER
    // =========================================================================
    return (
        <>
            {/* Footer Trigger - Shows when drawer is closed (works with voice active too) */}
            {!isOpen && footerTriggerContent}

            {/* Drawer - Shows when open (also works during voice mode) */}
            {isOpen && drawerContent}
        </>
    );
};

export default GlobalAiAssistant;
