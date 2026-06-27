/**
 * useAIWebsiteStudio
 *
 * Conversational onboarding hook that uses AI to extract business information
 * through natural conversation, then generates a complete website from scratch.
 *
 * Models:
 *  - Chat: openai/gpt-5.3-codex via OpenRouter
 *  - Voice: gemini-3.1-flash-live-preview
 *  - Images: gemini-3.1-flash-image-preview via OpenRouter Images API
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useProject } from '../../../contexts/project';
import { useEditor } from '../../../contexts/EditorContext';
import { useAdmin } from '../../../contexts/admin';
import { useUI } from '../../../contexts/core/UIContext';
import { useSafeTenant } from '../../../contexts/tenant';
import { useTranslation } from 'react-i18next';
import {
    generateChatContentViaProxy,
    extractTextFromResponse,
    type ChatMessage,
} from '../../../utils/geminiProxyClient';
import { logApiCall } from '../../../services/apiLoggingService';
import { Conversation, Role } from '@elevenlabs/client';
import { LiveServerMessage, Modality } from '@google/genai';
import { getGoogleGenAI } from '../../../utils/genAiClient';
import { generateComponentColorMappings, generateHeroWaveGradientColors, getSolidShellBackgroundForWhiteText, readableTextOn } from '../../ui/GlobalStylesControl';
import { generateAiAssistantConfig, GlobalColors as ChatbotGlobalColors } from '../../../utils/chatbotConfigGenerator';
import { generatePagesFromLegacyProject } from '../../../utils/legacyMigration';
import { extractHeroImage } from '../../../contexts/project/ProjectContext';
import { analyzeWebsite } from '../../../utils/analyzeWebsiteClient';
import { FontFamily, PageSection, Project, SitePage } from '../../../types';
import { resolveFontFamily } from '../../../utils/fontLoader';
import { usePlanAccess } from '../../../hooks/usePlanFeatures';
import { useServiceAvailability } from '../../../hooks/useServiceAvailability';
import { getAccessibleComponentRegistry, registryToPromptList, filterAccessibleSections } from '../../../data/componentRegistry';
import type { ComponentAccessContext } from '../../../data/componentRegistry';
import { isRetiredDesignSuiteSection } from '../../../data/retiredSuites';
import type { WebsitePlan } from '../../../types/websitePlan';
import {
    buildAssetPlan,
    buildComponentPlan,
    createWebsitePlanFromBrief,
    createWebsitePlanFromImport,
    applyColorExpertToPlan,
    sanitizeComponentOrder,
    validateGeneratedWebsite,
} from '../../../utils/websitePlanEngine';
import { attachAiStudioBusinessBlueprint, createSnapshotBeforeRegeneration } from '../../../utils/businessBlueprint';
import { resolveProjectAiAssistantConfig } from '../../../utils/chatbotEngine/projectAiAssistantConfig';
import { applyProjectBioPageBlueprintDraft } from '../../../services/bioPage';
import { createColorBriefFromWebsitePlan } from '../../../utils/colorSystemEngine';
import { getStudioReadiness } from '../../../utils/studioUX';

// ── Models ──────────────────────────────────────────────────────────────────
const MODEL_CHAT = 'openai/gpt-5.3-codex';
const MODEL_VOICE = 'gemini-3.1-flash-live-preview';
const MODEL_IMAGE = 'gemini-3.1-flash-image-preview';

const isDev = import.meta.env.DEV;
const ELEVENLABS_AGENT_ID = '52ac360bd7d15d8bd5e86b214d14338adc732616468d4dc145ce3d12df400eb5';

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
    fontPairing: FontPairing;
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
    contactInfo: {
        email: '',
        phone: '',
        address: '',
        businessHours: '',
        instagram: '',
    },
    hasEcommerce: false,
    colorPalette: { primary: '#6366f1', secondary: '#8b5cf6', accent: '#f59e0b', background: '#0f0f14', surface: '#1a1a24', text: '#e4e4e7' },
    fontPairing: { header: 'playfair-display', body: 'inter', button: 'inter' },
    suggestedComponents: [],
    readinessScore: 0,
    missingFields: ['businessName', 'industry', 'description'],
    referenceImageContext: '',
});

type ContactInfo = BusinessBrief['contactInfo'];

const BRIEF_PLACEHOLDER_PATTERN = /^(?:\[?GENERATE_TEXT\]?|\.\.\.|n\/a|none|null|undefined|no email|no phone|not detected|no detectado|sin email|sin telefono|sin teléfono)$/i;
const CORE_BRIEF_FIELDS = ['businessName', 'industry', 'description'] as const;
const BRIEF_FIELD_ALIASES: Record<string, string> = {
    name: 'businessName',
    businessname: 'businessName',
    'business name': 'businessName',
    negocio: 'businessName',
    'nombre del negocio': 'businessName',
    industry: 'industry',
    industria: 'industry',
    description: 'description',
    descripcion: 'description',
    descripcionnegocio: 'description',
    'descripcion negocio': 'description',
    'business description': 'description',
    services: 'services',
    service: 'services',
    servicios: 'services',
    email: 'contactInfo.email',
    mail: 'contactInfo.email',
    phone: 'contactInfo.phone',
    telefono: 'contactInfo.phone',
    teléfono: 'contactInfo.phone',
    telephone: 'contactInfo.phone',
    address: 'contactInfo.address',
    direccion: 'contactInfo.address',
    dirección: 'contactInfo.address',
    location: 'contactInfo.address',
    ubicacion: 'contactInfo.address',
    ubicación: 'contactInfo.address',
    hours: 'contactInfo.businessHours',
    horario: 'contactInfo.businessHours',
    horarios: 'contactInfo.businessHours',
    businesshours: 'contactInfo.businessHours',
    'business hours': 'contactInfo.businessHours',
    instagram: 'contactInfo.instagram',
    ig: 'contactInfo.instagram',
};
const GENERATION_RELEVANT_MISSING_FIELDS = new Set<string>([
    ...CORE_BRIEF_FIELDS,
    'services',
    'contactInfo.email',
    'contactInfo.phone',
    'contactInfo.address',
    'contactInfo.businessHours',
    'contactInfo.instagram',
]);

function cleanBriefTextValue(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed || BRIEF_PLACEHOLDER_PATTERN.test(trimmed)) return undefined;
    return trimmed;
}

function normalizeInstagram(value: unknown): string | undefined {
    const cleaned = cleanBriefTextValue(value);
    if (!cleaned) return undefined;

    const urlMatch = cleaned.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
    const rawHandle = urlMatch?.[1] || cleaned.replace(/^instagram\s*[:@]?\s*/i, '').replace(/^ig\s*[:@]?\s*/i, '');
    const handle = rawHandle.replace(/^@/, '').split(/[/?#\s]/)[0].replace(/[^A-Za-z0-9._]/g, '');
    return handle ? `@${handle}` : undefined;
}

function cleanContactInfo(contactInfo?: Partial<ContactInfo> | null): ContactInfo {
    if (!contactInfo || typeof contactInfo !== 'object') return {};

    const cleaned: ContactInfo = {};
    const email = cleanBriefTextValue(contactInfo.email);
    const phone = cleanBriefTextValue(contactInfo.phone);
    const address = cleanBriefTextValue(contactInfo.address);
    const city = cleanBriefTextValue(contactInfo.city);
    const state = cleanBriefTextValue(contactInfo.state);
    const country = cleanBriefTextValue(contactInfo.country);
    const businessHours = cleanBriefTextValue(contactInfo.businessHours);
    const facebook = cleanBriefTextValue(contactInfo.facebook);
    const instagram = normalizeInstagram(contactInfo.instagram);
    const twitter = cleanBriefTextValue(contactInfo.twitter);
    const tiktok = cleanBriefTextValue(contactInfo.tiktok);

    if (email) cleaned.email = email;
    if (phone) cleaned.phone = phone;
    if (address) cleaned.address = address;
    if (city) cleaned.city = city;
    if (state) cleaned.state = state;
    if (country) cleaned.country = country;
    if (businessHours) cleaned.businessHours = businessHours;
    if (facebook) cleaned.facebook = facebook;
    if (instagram) cleaned.instagram = instagram;
    if (twitter) cleaned.twitter = twitter;
    if (tiktok) cleaned.tiktok = tiktok;

    return cleaned;
}

function preferDetailedContactValue(existing?: string, incoming?: string): string | undefined {
    const cleanedExisting = cleanBriefTextValue(existing);
    const cleanedIncoming = cleanBriefTextValue(incoming);

    if (!cleanedExisting) return cleanedIncoming;
    if (!cleanedIncoming) return cleanedExisting;
    return cleanedIncoming.length >= cleanedExisting.length ? cleanedIncoming : cleanedExisting;
}

function mergeContactInfo(existing?: Partial<ContactInfo> | null, incoming?: Partial<ContactInfo> | null): ContactInfo {
    const cleanedExisting = cleanContactInfo(existing);
    const cleanedIncoming = cleanContactInfo(incoming);

    return {
        ...cleanedExisting,
        ...cleanedIncoming,
        address: preferDetailedContactValue(cleanedExisting.address, cleanedIncoming.address),
        businessHours: preferDetailedContactValue(cleanedExisting.businessHours, cleanedIncoming.businessHours),
    };
}

function hasBriefValue(value: unknown): boolean {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return Boolean(cleanBriefTextValue(value));
    return Boolean(value);
}

function getBriefPathValue(brief: BusinessBrief, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
        if (!current || typeof current !== 'object') return undefined;
        return (current as Record<string, unknown>)[key];
    }, brief);
}

function normalizeMissingFieldPath(field: unknown): string | undefined {
    const cleaned = cleanBriefTextValue(field);
    if (!cleaned) return undefined;

    const path = cleaned.replace(/^businessBrief\./i, '').replace(/^brief\./i, '').trim();
    const aliasKey = path.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    const compactAliasKey = aliasKey.replace(/\s+/g, '');

    return BRIEF_FIELD_ALIASES[aliasKey] || BRIEF_FIELD_ALIASES[compactAliasKey] || path;
}

function normalizeBriefCompletion(brief: BusinessBrief): BusinessBrief {
    const normalized: BusinessBrief = {
        ...brief,
        businessName: cleanBriefTextValue(brief.businessName) || '',
        industry: cleanBriefTextValue(brief.industry) || '',
        subIndustry: cleanBriefTextValue(brief.subIndustry),
        description: cleanBriefTextValue(brief.description) || '',
        tagline: cleanBriefTextValue(brief.tagline) || '',
        services: brief.services
            .map(service => ({
                name: cleanBriefTextValue(service.name) || '',
                description: cleanBriefTextValue(service.description) || '',
            }))
            .filter(service => service.name),
        contactInfo: mergeContactInfo(brief.contactInfo),
        missingFields: [],
    };

    const missing = new Set<string>();
    for (const field of brief.missingFields || []) {
        const normalizedField = normalizeMissingFieldPath(field);
        if (!normalizedField || !GENERATION_RELEVANT_MISSING_FIELDS.has(normalizedField)) continue;
        if (!hasBriefValue(getBriefPathValue(normalized, normalizedField))) missing.add(normalizedField);
    }
    for (const field of CORE_BRIEF_FIELDS) {
        if (!hasBriefValue(normalized[field])) missing.add(field);
    }

    let calculatedScore = 0;
    if (hasBriefValue(normalized.businessName)) calculatedScore += 15;
    if (hasBriefValue(normalized.industry)) calculatedScore += 15;
    if (hasBriefValue(normalized.description)) calculatedScore += 20;
    if (normalized.services.length > 0) calculatedScore += 10;
    if (hasBriefValue(normalized.tagline)) calculatedScore += 5;
    if (hasBriefValue(normalized.contactInfo.phone)) calculatedScore += 10;
    if (hasBriefValue(normalized.contactInfo.address)) calculatedScore += 10;
    if (hasBriefValue(normalized.contactInfo.businessHours)) calculatedScore += 8;
    if (hasBriefValue(normalized.contactInfo.instagram) || hasBriefValue(normalized.contactInfo.email)) calculatedScore += 7;
    if (normalized.suggestedComponents.length > 0) calculatedScore += 5;

    const missingFields = Array.from(missing);
    let readinessScore = Math.max(brief.readinessScore || 0, calculatedScore);
    if (missingFields.length === 0 && readinessScore >= 70) readinessScore = Math.max(readinessScore, 80);

    return {
        ...normalized,
        readinessScore: Math.min(100, Math.round(readinessScore)),
        missingFields,
    };
}

function extractContactDetailsFromText(text: string): ContactInfo {
    const contactInfo: ContactInfo = {};
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    const phone = text.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/)?.[0];
    const instagramUrl = text.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[0];
    const instagramLabel = text.match(/(?:instagram|ig)\s*[:@]?\s*(@?[A-Za-z0-9._]{2,30})/i)?.[1];
    const instagramHandle = text.match(/(^|[\s(])@([A-Za-z0-9._]{2,30})(?=$|[\s),.;])/i)?.[2];
    const addressLabel = text.match(/(?:direcci[oó]n|address|ubicaci[oó]n|estamos en|located at)\s*:?\s*([^\n.]+)/i)?.[1];
    const streetAddress = text.match(/\b(?:\d{1,6}\s+(?:Calle|Ave\.?|Avenida|Road|Rd\.?|Street|St\.?|Boulevard|Blvd\.?)\s+[^\n.]+|(?:Calle|Ave\.?|Avenida|Road|Rd\.?|Street|St\.?|Boulevard|Blvd\.?)\s+[^\n.]*?\d{1,6}[^\n.]*)/i)?.[0];
    const hoursLabel = text.match(/(?:horario|horarios|business hours|hours)\s*:?\s*([^\n.]+)/i)?.[1];
    const hoursPattern = text.match(/((?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|lun|mar|mi[eé]|jue|vie|s[aá]b|dom|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[^\n.]{0,140}?\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|am|pm)?\s*(?:-|–|—|a|to)\s*\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|am|pm)?)/i)?.[1];

    if (email) contactInfo.email = email;
    if (phone) contactInfo.phone = phone.replace(/\s+/g, ' ').trim();
    if (instagramUrl || instagramLabel || instagramHandle) {
        const normalized = normalizeInstagram(instagramUrl || instagramLabel || instagramHandle);
        if (normalized) contactInfo.instagram = normalized;
    }
    if (addressLabel || streetAddress) contactInfo.address = (addressLabel || streetAddress || '').trim();
    if (hoursLabel || hoursPattern) contactInfo.businessHours = (hoursLabel || hoursPattern || '').trim();

    return cleanContactInfo(contactInfo);
}

// ── ALL_SECTIONS constant ───────────────────────────────────────────────────
const ALL_SECTIONS: PageSection[] = [
    'colors', 'typography', 'header',
    'hero', 'heroSplit', 'heroGallery', 'heroWave', 'heroNova', 'heroLead',
    'topBar', 'logoBanner', 'banner', 'features', 'testimonials', 'slideshow',
    'pricing', 'faq', 'portfolio', 'cta', 'services', 'team', 'video', 'howItWorks', 'menu', 'realEstateListings',
    'leads', 'newsletter', 'map', 'chatbot', 'cmsFeed', 'signupFloat', 'footer',
    'announcementBar', 'productHero', 'featuredProducts', 'categoryGrid', 'trustBadges', 'saleCountdown',
    'collectionBanner', 'recentlyViewed', 'productReviews', 'productBundle', 'restaurantReservation',
    'products', 'storeSettings', 'productDetail', 'categoryProducts', 'articleContent', 'productGrid',
    'propertyDirectory', 'propertyDetail', 'cart', 'checkout',
    'heroQuimera', 'featuresQuimera', 'pricingQuimera', 'testimonialsQuimera', 'faqQuimera', 'ctaQuimera',
    'platformShowcaseQuimera', 'aiCapabilitiesQuimera', 'industrySolutionsQuimera', 'agencyWhiteLabelQuimera',
    'metricsQuimera', 'whatIsQuimera', 'templatesPreviewQuimera', 'aiWebStudioQuimera', 'contentManagerQuimera',
    'imageGeneratorQuimera', 'chatbotWorkflowQuimera', 'chatbotBuilderQuimera', 'leadsManagerQuimera',
    'appointmentsQuimera', 'bioPageQuimera', 'emailMarketingQuimera',
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

function pruneUnplannedComponentData(data: any, componentOrder: PageSection[]): void {
    if (!data || typeof data !== 'object') return;
    const allowed = new Set<PageSection>(componentOrder);
    for (const section of ALL_SECTIONS) {
        if (!allowed.has(section) && Object.prototype.hasOwnProperty.call(data, section)) {
            delete data[section];
        }
    }
}

const ECOMMERCE_SECTIONS = new Set<PageSection>([
    'announcementBar', 'productHero', 'featuredProducts', 'categoryGrid', 'trustBadges',
    'saleCountdown', 'collectionBanner', 'recentlyViewed', 'productReviews', 'productBundle',
    'products', 'storeSettings', 'productDetail', 'categoryProducts', 'productGrid', 'cart', 'checkout',
]);

type FontPairing = { header: FontFamily; body: FontFamily; button: FontFamily; weight?: number };

const FONT_PAIRINGS_BY_INDUSTRY: Record<string, FontPairing[]> = {
    ecommerce: [
        { header: 'biorhyme', body: 'dm-sans', button: 'space-grotesk', weight: 700 },
        { header: 'fraunces', body: 'instrument-sans', button: 'manrope', weight: 700 },
        { header: 'syne', body: 'figtree', button: 'dm-sans', weight: 700 },
        { header: 'unbounded', body: 'public-sans', button: 'space-grotesk', weight: 700 },
    ],
    restaurant: [
        { header: 'fraunces', body: 'dm-sans', button: 'dm-sans', weight: 700 },
        { header: 'marcellus', body: 'instrument-sans', button: 'instrument-sans', weight: 400 },
        { header: 'bree-serif', body: 'figtree', button: 'figtree', weight: 400 },
    ],
    'real-estate': [
        { header: 'newsreader', body: 'libre-franklin', button: 'libre-franklin', weight: 700 },
        { header: 'instrument-serif', body: 'instrument-sans', button: 'instrument-sans', weight: 400 },
        { header: 'red-hat-display', body: 'public-sans', button: 'public-sans', weight: 700 },
    ],
    technology: [
        { header: 'space-grotesk', body: 'inter-tight', button: 'space-grotesk', weight: 700 },
        { header: 'sora', body: 'inter', button: 'sora', weight: 700 },
        { header: 'bricolage-grotesque', body: 'manrope', button: 'manrope', weight: 700 },
    ],
    creative: [
        { header: 'syne', body: 'figtree', button: 'figtree', weight: 700 },
        { header: 'unbounded', body: 'manrope', button: 'manrope', weight: 700 },
        { header: 'fraunces', body: 'dm-sans', button: 'dm-sans', weight: 700 },
    ],
    services: [
        { header: 'red-hat-display', body: 'public-sans', button: 'public-sans', weight: 700 },
        { header: 'manrope', body: 'inter', button: 'manrope', weight: 700 },
        { header: 'sora', body: 'dm-sans', button: 'dm-sans', weight: 700 },
    ],
};

const BODY_SAFE_FONTS = new Set<FontFamily>([
    'inter', 'inter-tight', 'dm-sans', 'outfit', 'figtree', 'urbanist', 'manrope',
    'sora', 'public-sans', 'open-sans', 'work-sans', 'instrument-sans',
    'libre-franklin', 'fira-sans', 'ibm-plex-sans',
]);

const NAV_LABELS: Partial<Record<PageSection, { es: string; en: string }>> = {
    hero: { es: 'Inicio', en: 'Home' },
    heroSplit: { es: 'Inicio', en: 'Home' },
    heroGallery: { es: 'Inicio', en: 'Home' },
    heroWave: { es: 'Inicio', en: 'Home' },
    heroNova: { es: 'Inicio', en: 'Home' },
    heroLead: { es: 'Inicio', en: 'Home' },
    productHero: { es: 'Colección', en: 'Collection' },
    featuredProducts: { es: 'Productos', en: 'Products' },
    categoryGrid: { es: 'Categorías', en: 'Categories' },
    trustBadges: { es: 'Confianza', en: 'Trust' },
    saleCountdown: { es: 'Ofertas', en: 'Deals' },
    productReviews: { es: 'Reseñas', en: 'Reviews' },
    collectionBanner: { es: 'Colección', en: 'Collection' },
    recentlyViewed: { es: 'Vistos', en: 'Recent' },
    productBundle: { es: 'Bundles', en: 'Bundles' },
    services: { es: 'Servicios', en: 'Services' },
    features: { es: 'Beneficios', en: 'Benefits' },
    howItWorks: { es: 'Proceso', en: 'Process' },
    testimonials: { es: 'Testimonios', en: 'Testimonials' },
    faq: { es: 'FAQ', en: 'FAQ' },
    pricing: { es: 'Precios', en: 'Pricing' },
    portfolio: { es: 'Portafolio', en: 'Portfolio' },
    slideshow: { es: 'Galería', en: 'Gallery' },
    team: { es: 'Equipo', en: 'Team' },
    cta: { es: 'Comenzar', en: 'Start' },
    leads: { es: 'Contacto', en: 'Contact' },
    newsletter: { es: 'Newsletter', en: 'Newsletter' },
    map: { es: 'Ubicación', en: 'Location' },
    menu: { es: 'Menú', en: 'Menu' },
    restaurantReservation: { es: 'Reservar', en: 'Reserve' },
    realEstateListings: { es: 'Propiedades', en: 'Listings' },
    footer: { es: 'Contacto', en: 'Contact' },
};

function hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = ((hash << 5) - hash) + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function pickFrom<T>(items: T[], seed: string): T {
    return items[hashString(seed) % items.length];
}

function normalizeDesignIndustry(brief: BusinessBrief): string {
    const text = `${brief.industry || ''} ${brief.subIndustry || ''} ${brief.description || ''}`.toLowerCase();
    if (brief.hasEcommerce || /ecommerce|e-commerce|shop|store|retail|producto|tienda/.test(text)) return 'ecommerce';
    if (/restaurant|restaurante|cafe|food|bakery|bar|menu/.test(text)) return 'restaurant';
    if (/real estate|inmobili|property|propiedad|realtor/.test(text)) return 'real-estate';
    if (/tech|software|saas|ai|ia|web3|cyber/.test(text)) return 'technology';
    if (/creative|portfolio|arte|cultur|diseño|design|artist|photograph/.test(text)) return 'creative';
    return 'services';
}

function chooseWebsiteFontPairing(
    brief: BusinessBrief,
    preferred?: Partial<Record<'header' | 'body' | 'button', string>>,
): FontPairing {
    const industry = normalizeDesignIndustry(brief);
    const pairings = FONT_PAIRINGS_BY_INDUSTRY[industry] || FONT_PAIRINGS_BY_INDUSTRY.services;
    const fallback = pickFrom(pairings, `${brief.businessName}|${industry}|fonts`);
    let header = resolveFontFamily(preferred?.header) || fallback.header;
    let body = resolveFontFamily(preferred?.body) || fallback.body;
    let button = resolveFontFamily(preferred?.button) || fallback.button;

    const importedLooksInvalid = (value?: string) => Boolean(value && resolveFontFamily(value) === 'inter' && value.trim().toLowerCase().replace(/\s+/g, '-') !== 'inter');
    if (importedLooksInvalid(preferred?.header)) header = fallback.header;
    if (importedLooksInvalid(preferred?.body)) body = fallback.body;
    if (importedLooksInvalid(preferred?.button)) button = fallback.button;
    if (!BODY_SAFE_FONTS.has(body)) body = fallback.body;
    if (!BODY_SAFE_FONTS.has(button)) button = fallback.button;

    if (header === body) body = fallback.body !== header ? fallback.body : 'dm-sans';
    if (button === header) button = fallback.button !== header ? fallback.button : body;

    return { header, body, button, weight: fallback.weight || 700 };
}

function buildHeaderLinksForOrder(componentOrder: PageSection[], isSpanish: boolean): Array<{ text: string; href: string }> {
    const links: Array<{ text: string; href: string }> = [{ text: isSpanish ? 'Inicio' : 'Home', href: '/' }];
    const seen = new Set<string>(['/']);
    const hasEcommerce = componentOrder.some(section => ECOMMERCE_SECTIONS.has(section));
    const heroSections = new Set<PageSection>(['hero', 'heroSplit', 'heroGallery', 'heroWave', 'heroNova', 'heroLead']);

    if (hasEcommerce) {
        links.push({ text: isSpanish ? 'Tienda' : 'Shop', href: '/tienda' });
        seen.add('/tienda');
    }

    const orderedSections = hasEcommerce
        ? [
            ...(['featuredProducts', 'categoryGrid', 'productReviews', 'footer', 'saleCountdown'] as PageSection[]).filter(section => componentOrder.includes(section)),
            ...componentOrder,
        ]
        : componentOrder;

    for (const section of orderedSections) {
        if (['colors', 'typography', 'header', 'topBar', 'announcementBar'].includes(section)) continue;
        if (heroSections.has(section)) continue;
        const label = NAV_LABELS[section];
        if (!label) continue;
        const href = `/#${section}`;
        if (seen.has(href)) continue;
        links.push({ text: isSpanish ? label.es : label.en, href });
        seen.add(href);
        if (links.length >= 6) break;
    }

    const contactTarget = componentOrder.includes('leads')
        ? '/#leads'
        : componentOrder.includes('restaurantReservation')
            ? '/#restaurantReservation'
            : componentOrder.includes('map')
                ? '/#map'
                : componentOrder.includes('footer')
                    ? '/#footer'
                    : '';
    if (contactTarget && !seen.has(contactTarget) && links.length < 6) {
        links.push({ text: isSpanish ? 'Contacto' : 'Contact', href: contactTarget });
    }

    return links;
}

function pickHeaderStyle(brief: BusinessBrief, componentOrder: PageSection[], _colors: Record<string, string>): string {
    const industry = normalizeDesignIndustry(brief);
    const seed = `${brief.businessName}|${industry}|${componentOrder.join(',')}`;

    if (industry === 'ecommerce') {
        return pickFrom(['sticky-solid', 'edge-bordered', 'edge-solid'], seed);
    }
    if (industry === 'restaurant') {
        return pickFrom(['edge-solid', 'sticky-solid', 'edge-bordered'], seed);
    }
    if (industry === 'real-estate') {
        return pickFrom(['edge-bordered', 'edge-solid', 'sticky-solid'], seed);
    }
    if (industry === 'technology') {
        return pickFrom(['sticky-solid', 'edge-bordered', 'edge-solid'], seed);
    }
    if (industry === 'creative') {
        return pickFrom(['edge-bordered', 'sticky-solid', 'edge-solid'], seed);
    }
    return pickFrom(['sticky-solid', 'edge-solid', 'edge-bordered'], seed);
}

function getHeaderCtaTarget(componentOrder: PageSection[], hasEcommerce: boolean): string {
    if (hasEcommerce) return '/tienda';
    if (componentOrder.includes('leads')) return '/#leads';
    if (componentOrder.includes('restaurantReservation')) return '/#restaurantReservation';
    if (componentOrder.includes('pricing')) return '/#pricing';
    if (componentOrder.includes('cta')) return '/#cta';
    if (componentOrder.includes('map')) return '/#map';
    return '/#footer';
}

function repairGeneratedWebsiteDesign(
    data: any,
    finalTheme: any,
    componentOrder: PageSection[],
    brief: BusinessBrief,
    isSpanish: boolean,
): void {
    if (!data || typeof data !== 'object') return;
    const colors = finalTheme?.globalColors || brief.colorPalette || {};
    const hasEcommerce = componentOrder.some(section => ECOMMERCE_SECTIONS.has(section));
    const suggestedStyle = pickHeaderStyle(brief, componentOrder, colors);
    const solidHeaderStyles = new Set(['sticky-solid', 'edge-solid', 'edge-bordered']);
    const style = solidHeaderStyles.has(suggestedStyle) ? suggestedStyle : 'sticky-solid';
    const headerBackground = getSolidShellBackgroundForWhiteText(colors);
    const headerText = '#ffffff';
    const buttonBackground = colors.accent || colors.secondary || colors.primary || headerBackground;

    if (!data.header || typeof data.header !== 'object') data.header = {};
    data.header = {
        ...data.header,
        style,
        layout: data.header.layout || 'classic',
        isSticky: true,
        glassEffect: false,
        height: 82,
        logoType: data.header.logoType || 'text',
        logoText: data.header.logoText || brief.businessName || 'Website',
        showCta: true,
        ctaText: data.header.ctaText || (hasEcommerce ? (isSpanish ? 'Comprar ahora' : 'Shop now') : (isSpanish ? 'Comenzar' : 'Get started')),
        ctaUrl: getHeaderCtaTarget(componentOrder, hasEcommerce),
        showCart: hasEcommerce || data.header.showCart,
        links: buildHeaderLinksForOrder(componentOrder, isSpanish),
        colors: {
            ...(data.header.colors || {}),
            background: headerBackground,
            text: headerText,
            accent: headerText,
            border: style === 'edge-bordered' ? (colors.border || 'rgba(255, 255, 255, 0.18)') : 'transparent',
            buttonBackground,
            buttonText: readableTextOn(buttonBackground),
            tabActiveColor: colors.primary || colors.accent,
            tabBorderColor: colors.border,
        },
    };

    if (!data.footer || typeof data.footer !== 'object') data.footer = {};
    data.footer = {
        ...data.footer,
        glassEffect: false,
        colors: {
            ...(data.footer.colors || {}),
            background: headerBackground,
            border: 'rgba(255, 255, 255, 0.18)',
            text: '#ffffff',
            heading: '#ffffff',
            description: 'rgba(255, 255, 255, 0.82)',
            linkHover: '#ffffff',
        },
    };
}

const normalizeRepeatedCornerGradients = (data: any, componentOrder: PageSection[]): void => {
    let sharedGradient: { color?: string; opacity?: number; size?: number } | null = null;

    for (const section of componentOrder) {
        const sectionData = data?.[section];
        const gradient = sectionData?.cornerGradient;
        if (!gradient?.enabled || gradient.position === 'none') continue;

        if (!sharedGradient) {
            sharedGradient = {
                color: gradient.color,
                opacity: gradient.opacity,
                size: gradient.size,
            };
            continue;
        }

        sectionData.cornerGradient = {
            ...gradient,
            color: sharedGradient.color ?? gradient.color,
            opacity: sharedGradient.opacity ?? gradient.opacity,
            size: sharedGradient.size ?? gradient.size,
        };
    }
};

function hasDesignSignal(brief: BusinessBrief, pattern: RegExp): boolean {
    const text = [
        brief.businessName,
        brief.industry,
        brief.subIndustry,
        brief.description,
        brief.tagline,
        ...(brief.services || []).flatMap(service => [service.name, service.description]),
    ].filter(Boolean).join(' ').toLowerCase();
    return pattern.test(text);
}

function applyDesignStrategyToGeneratedData(
    data: any,
    componentOrder: PageSection[],
    brief: BusinessBrief,
    finalTheme: any,
): void {
    if (!data || typeof data !== 'object') return;
    const industry = normalizeDesignIndustry(brief);
    const seed = `${brief.businessName}|${industry}|${componentOrder.join(',')}|design`;
    const isVisual = ['creative', 'restaurant', 'real-estate'].includes(industry) || hasDesignSignal(brief, /\b(gallery|galería|portfolio|portafolio|visual|photo|foto|cultural|cultura|arte|design|diseño|event|travel|spa|salon|construction|architecture)\b/i);
    const isPremium = hasDesignSignal(brief, /\b(premium|luxury|lujo|boutique|exclusive|exclusivo|high-end|profesional|enterprise)\b/i);
    const isBooking = hasDesignSignal(brief, /\b(booking|appointment|cita|consulta|reservation|reserva|quote|cotización|estimate|demo)\b/i);

    if (data.hero && typeof data.hero === 'object') {
        const heroOptions: Record<string, string[]> = {
            restaurant: ['cinematic', 'overlap', 'editorial'],
            creative: ['editorial', 'overlap', 'bold', 'cinematic'],
            'real-estate': ['overlap', 'verticalSplit', 'minimal'],
            technology: ['gradient', 'glass', 'modern'],
            services: isBooking ? ['verticalSplit', 'modern', 'overlap'] : ['modern', 'overlap', 'minimal'],
            ecommerce: ['editorial', 'overlap', 'cinematic'],
        };
        data.hero.heroVariant = pickFrom(heroOptions[industry] || heroOptions.services, seed);
        data.hero.textLayout = data.hero.heroVariant === 'cinematic' || data.hero.heroVariant === 'editorial'
            ? pickFrom(['left-bottom', 'center-bottom', 'left-top'], `${seed}|hero-text`)
            : pickFrom(['left-top', 'center', 'left-bottom'], `${seed}|hero-text`);
        data.hero.imagePosition = pickFrom(['left', 'right'], `${seed}|hero-image-position`);
        data.hero.imageAspectRatio = isVisual ? '4:3' : '16:9';
        data.hero.imageObjectFit = 'cover';
        data.hero.glassEffect = data.hero.heroVariant === 'glass' || isPremium;
        data.hero.backgroundOverlayEnabled = ['cinematic', 'editorial', 'bold'].includes(data.hero.heroVariant);
        data.hero.backgroundOverlayOpacity = data.hero.backgroundOverlayEnabled ? 45 : data.hero.backgroundOverlayOpacity;
    }

    if (data.services && typeof data.services === 'object') {
        const options = industry === 'technology'
            ? ['grid', 'neon-glow', 'minimal']
            : isPremium
                ? ['grid', 'minimal', 'cards']
                : ['grid', 'cards', 'minimal'];
        data.services.servicesVariant = pickFrom(options, `${seed}|services`);
        data.services.animationType = data.services.animationType || 'fade-in-up';
        data.services.enableCardAnimation = true;
    }

    if (data.features && typeof data.features === 'object') {
        const options = industry === 'technology'
            ? ['bento-premium', 'neon-glow', 'press-release']
            : isVisual
                ? ['image-overlay', 'bento-overlay', 'bento-premium', 'editorial-mosaic']
                : ['bento-premium', 'modern', 'press-release', 'editorial-mosaic'];
        data.features.featuresVariant = pickFrom(options, `${seed}|features`);
        data.features.gridColumns = ['image-overlay', 'editorial-mosaic'].includes(data.features.featuresVariant) ? 4 : 3;
        data.features.imageHeight = ['image-overlay', 'editorial-mosaic'].includes(data.features.featuresVariant) ? 420 : 340;
        data.features.showSectionHeader = true;
        data.features.enableCardAnimation = true;
    }

    if (data.testimonials && typeof data.testimonials === 'object') {
        const options = industry === 'technology'
            ? ['neon-glow', 'glassmorphism', 'gradient-shift']
            : isPremium
                ? ['floating-cards', 'glassmorphism', 'minimal-cards', 'editorial-mosaic']
                : ['floating-cards', 'gradient-shift', 'minimal-cards', 'editorial-mosaic'];
        data.testimonials.testimonialsVariant = pickFrom(options, `${seed}|testimonials`);
        data.testimonials.enableCardAnimation = true;
    }

    if (data.menu && typeof data.menu === 'object') {
        const options = industry === 'restaurant'
            ? ['editorial-mosaic', 'full-image', 'modern-grid', 'elegant-list']
            : isVisual || isPremium
                ? ['editorial-mosaic', 'full-image', 'modern-grid']
                : ['modern-grid', 'elegant-list', 'editorial-mosaic'];
        data.menu.menuVariant = pickFrom(options, `${seed}|menu`);
        data.menu.gridColumns = data.menu.menuVariant === 'editorial-mosaic' ? 4 : data.menu.gridColumns;
        data.menu.showSectionHeader = true;
        data.menu.enableCardAnimation = true;
    }

    if (data.faq && typeof data.faq === 'object') {
        data.faq.faqVariant = pickFrom(isPremium ? ['minimal', 'cards'] : ['cards', 'gradient', 'minimal'], `${seed}|faq`);
    }

    if (data.leads && typeof data.leads === 'object') {
        data.leads.leadsVariant = pickFrom(isPremium ? ['floating-glass', 'minimal-border'] : ['split-gradient', 'floating-glass', 'minimal-border'], `${seed}|leads`);
        data.leads.glassEffect = data.leads.leadsVariant === 'floating-glass';
    }

    if (data.portfolio && typeof data.portfolio === 'object') {
        data.portfolio.portfolioVariant = isVisual ? 'image-overlay' : pickFrom(['classic', 'image-overlay'], `${seed}|portfolio`);
        data.portfolio.gridColumns = isVisual ? 3 : 2;
        data.portfolio.imageHeight = isVisual ? 460 : 360;
        data.portfolio.showSectionHeader = true;
    }

    if (data.slideshow && typeof data.slideshow === 'object') {
        data.slideshow.slideshowVariant = pickFrom(isVisual ? ['kenburns', 'cards3d', 'thumbnails'] : ['cards3d', 'classic'], `${seed}|slideshow`);
        data.slideshow.transitionEffect = data.slideshow.slideshowVariant === 'kenburns' ? 'zoom' : 'fade';
        data.slideshow.arrowStyle = 'floating';
        data.slideshow.dotStyle = 'pill';
        data.slideshow.slideHeight = isVisual ? 560 : 420;
        data.slideshow.showCaptions = true;
    }

    if (data.pricing && typeof data.pricing === 'object') {
        data.pricing.pricingVariant = pickFrom(industry === 'technology' ? ['neon-glow', 'glassmorphism', 'gradient'] : ['glassmorphism', 'gradient', 'minimalist'], `${seed}|pricing`);
    }

    if (data.cta && typeof data.cta === 'object') {
        data.cta.glassEffect = isPremium || industry === 'technology';
        data.cta.backgroundOverlayEnabled = isVisual;
        data.cta.backgroundOverlayOpacity = isVisual ? 55 : data.cta.backgroundOverlayOpacity;
    }

    const globalColors = finalTheme?.globalColors || brief.colorPalette;
    for (const key of ['hero', 'services', 'features', 'testimonials', 'menu', 'faq', 'leads', 'portfolio', 'slideshow', 'pricing', 'cta']) {
        if (data[key] && typeof data[key] === 'object') {
            data[key].colors = {
                ...(data[key].colors || {}),
                background: data[key].colors?.background || globalColors.background,
                heading: data[key].colors?.heading || globalColors.heading || globalColors.text,
                text: data[key].colors?.text || globalColors.text,
                accent: data[key].colors?.accent || globalColors.accent || globalColors.primary,
            };
        }
    }
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

const createUuid = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useAIWebsiteStudio() {
    const { user } = useAuth();
    const { addNewProject, updateTemplateInState, loadProject } = useProject();
    const { generateImage } = useEditor();
    const { getPrompt } = useAdmin();
    const { setIsOnboardingOpen } = useUI();
    const tenantContext = useSafeTenant();
    const { t, i18n } = useTranslation();
    const currentTenantId = tenantContext?.currentTenant?.id || null;
    const planAccess = usePlanAccess();
    const { isServicePublic, isLoading: isLoadingServices } = useServiceAvailability();

    const accessContext = useMemo<ComponentAccessContext>(() => ({
        canAccessService: (serviceId) => !isLoadingServices && isServicePublic(serviceId),
        hasPlanFeature: (feature) => !planAccess.isLoading && planAccess.hasAccess(feature),
    }), [isLoadingServices, isServicePublic, planAccess.hasAccess, planAccess.isLoading]);

    const accessibleComponentRegistry = useMemo(
        () => getAccessibleComponentRegistry(accessContext),
        [accessContext]
    );

    const availableComponents = useMemo(
        () => accessibleComponentRegistry.map(item => ({ key: item.id, label: item.label })),
        [accessibleComponentRegistry]
    );

    const filterAllowedComponents = useCallback((components: PageSection[] = []): PageSection[] => {
        return filterAccessibleSections(components, accessContext);
    }, [accessContext]);

    // ── Chat state ──────────────────────────────────────────────────────────
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const chatRef = useRef<HTMLDivElement>(null);
    const historyRef = useRef<ChatMessage[]>([]);

    // ── Brief state ─────────────────────────────────────────────────────────
    const [businessBrief, setBusinessBrief] = useState<BusinessBrief>(createEmptyBrief());
    const [websitePlan, setWebsitePlan] = useState<WebsitePlan | null>(null);
    const [showPlanReview, setShowPlanReview] = useState(false);

    // ── Reference images state ──────────────────────────────────────────────
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const referenceImagesRef = useRef<string[]>([]);
    // Keep ref in sync
    useEffect(() => { referenceImagesRef.current = referenceImages; }, [referenceImages]);

    // ── Generation state ────────────────────────────────────────────────────
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationPhase, setGenerationPhase] = useState<GenerationPhase | null>(null);
    const isGeneratingRef = useRef(false);
    const [generatedProject, setGeneratedProject] = useState<Project | null>(null);
    const [isSavingGeneratedProject, setIsSavingGeneratedProject] = useState(false);
    const [generatedProjectSaveError, setGeneratedProjectSaveError] = useState<string | null>(null);
    const isSavingGeneratedProjectRef = useRef(false);
    const regenerationBusinessBlueprintRef = useRef<Project['businessBlueprint'] | null>(null);
    const regenerationProjectDataRef = useRef<Record<string, unknown> | null>(null);

    // ── Voice state ─────────────────────────────────────────────────────────
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
    const [liveUserTranscript, setLiveUserTranscript] = useState('');
    const [liveModelTranscript, setLiveModelTranscript] = useState('');
    const conversationRef = useRef<any>(null);
    const currentModelResponseRef = useRef<string>('');
    const currentUserTranscriptRef = useRef<string>('');

    // ── Website extraction state ────────────────────────────────────────────
    const [showUrlModal, setShowUrlModal] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    // ── Computed ─────────────────────────────────────────────────────────────
    const isAccessLoading = isLoadingServices || planAccess.isLoading;
    const shouldBlockGenerationForAccess = isLoadingServices && accessibleComponentRegistry.length === 0;
    const studioReadiness = getStudioReadiness({
        kind: 'website',
        businessName: businessBrief.businessName,
        industry: businessBrief.industry,
        description: businessBrief.description,
        services: businessBrief.services,
        websiteGoal: businessBrief.description,
        designStyle: `${businessBrief.fontPairing?.header || ''} ${businessBrief.fontPairing?.body || ''}`.trim(),
        contactInfo: businessBrief.contactInfo,
        suggestedComponents: businessBrief.suggestedComponents,
        missingFields: businessBrief.missingFields,
        readinessScore: businessBrief.readinessScore,
    });
    const canGenerate = studioReadiness.canGenerate && !isGenerating && !shouldBlockGenerationForAccess;

    const saveProjectAndOpenEditor = useCallback(async (project: Project): Promise<boolean> => {
        if (isSavingGeneratedProjectRef.current) return false;

        isSavingGeneratedProjectRef.current = true;
        setIsSavingGeneratedProject(true);
        setGeneratedProjectSaveError(null);

        try {
            await Promise.race([
                addNewProject(project),
                new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Final save timeout')), 30000)),
            ]);

            try {
                const bioPageDraft = await applyProjectBioPageBlueprintDraft({
                    project,
                    userId: user?.id,
                    tenantId: currentTenantId,
                });
                if (bioPageDraft && isDev) {
                    console.log('[AIWebsiteStudio] Bio Page draft created from blueprint:', {
                        projectId: project.id,
                        bioPageId: bioPageDraft.id,
                        slug: bioPageDraft.slug,
                        status: bioPageDraft.status,
                    });
                }
            } catch (bioPageError) {
                console.warn('[AIWebsiteStudio] Bio Page blueprint draft was not applied:', bioPageError);
            }

            loadProject(project.id, false, true, project);
            setGeneratedProject(null);
            setGenerationPhase(null);
            setIsOnboardingOpen(false);
            regenerationBusinessBlueprintRef.current = null;
            regenerationProjectDataRef.current = null;
            return true;
        } catch (finalSaveErr) {
            console.warn('[AIWebsiteStudio] Final save failed:', finalSaveErr);
            setGeneratedProjectSaveError(
                finalSaveErr instanceof Error
                    ? finalSaveErr.message
                    : 'Failed to save the website to the database. Please try again.'
            );
            return false;
        } finally {
            isSavingGeneratedProjectRef.current = false;
            setIsSavingGeneratedProject(false);
        }
    }, [addNewProject, currentTenantId, loadProject, setIsOnboardingOpen, user?.id]);

    // ═════════════════════════════════════════════════════════════════════════
    // SYSTEM PROMPT
    // ═════════════════════════════════════════════════════════════════════════

    const buildSystemPrompt = useCallback(() => {
        const lang = i18n.language === 'es' ? 'Spanish' : 'English';
        const availableComponentIds = accessibleComponentRegistry.map(item => item.id).join(', ');
        const availableComponentDetails = registryToPromptList(accessibleComponentRegistry);
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
1. Be conversational and concise. This is a guided studio flow, not a long interview.
2. Ask one question at a time. If the user provides enough context, summarize and move toward generation instead of continuing the interview.
3. After EVERY response, include a hidden brief update tag with ALL currently known information:
   <!--BRIEF:{"businessName":"[GENERATE_TEXT]","industry":"[GENERATE_TEXT]","description":"[GENERATE_TEXT]","tagline":"[GENERATE_TEXT]","services":[{"name":"[GENERATE_TEXT]","description":"[GENERATE_TEXT]"}],"contactInfo":{"email":"[GENERATE_TEXT]","phone":"[GENERATE_TEXT]","address":"[GENERATE_TEXT]","city":"[GENERATE_TEXT]","state":"[GENERATE_TEXT]","country":"[GENERATE_TEXT]","businessHours":"[GENERATE_TEXT]","instagram":"[GENERATE_TEXT]","facebook":"[GENERATE_TEXT]","twitter":"[GENERATE_TEXT]","tiktok":"[GENERATE_TEXT]"},"hasEcommerce":false,"colorPalette":{"primary":"#hex","secondary":"#hex","accent":"#hex","background":"#hex","surface":"#hex","text":"#hex"},"fontPairing":{"header":"[FONT_KEY_FROM_GUIDE]","body":"[FONT_KEY_FROM_GUIDE]","button":"[FONT_KEY_FROM_GUIDE]"},"suggestedComponents":["hero","services","features","testimonials","faq","cta","leads","newsletter","map","signupFloat"],"readinessScore":0,"missingFields":["businessName","industry"],"referenceImageContext":""}-->
4. Update readinessScore progressively: 0-20 (just started), 20-40 (basic info), 40-60 (good detail), 60-80 (almost ready), 80-100 (ready to generate)
5. For suggestedComponents, pick ONLY from the ACCESSIBLE COMPONENTS list below: ${availableComponentIds}. Never include components that are not listed. Components tied to services like ecommerce, restaurants, real estate, newsletter, chatbot, or CMS are omitted unless the platform service is enabled by Admin AND the current user's plan includes the required feature.
6. Apply your expert color theory knowledge to choose palettes (see COLOR PALETTES section below)
7. Apply your expert typography knowledge to choose font pairings (see TYPOGRAPHY section below). ALWAYS include fontPairing in the BRIEF tag using the exact font key strings from the available fonts list (e.g. "playfair-display", "space-grotesk", "inter"). Choose fonts that match the industry personality.
8. When minimum context exists (business name or clear description, industry or inferred industry, services/products or website goal), you MUST do the following:
   a. Summarize all the information gathered in a clear list.
   b. Tell the user that you can generate now and mark missing non-critical details for review.
   c. Explicitly instruct them to press the **"🚀 Generate Website"** button on the right panel (or on mobile, tap the "Brief" button first).
   d. Warn them that the generation process takes **several minutes** (approximately 3-5 minutes) because the AI needs to generate all the content, create custom images, and assemble everything. Tell them to be patient and NOT close the window.
   e. Example: "¡Tengo todo lo que necesito! Para comenzar, presiona el botón **🚀 Generate Website** en el panel derecho. El proceso toma entre 3-5 minutos porque voy a generar todo el contenido, crear imágenes personalizadas y ensamblar tu sitio completo. ¡No cierres la ventana y verás el progreso en tiempo real!"
9. ALWAYS respond in ${lang}. The BRIEF tag must always use English field names but values in the user's language.
10. Use markdown formatting for clear, readable responses. Use **bold** for emphasis, bullet lists for options.
11. If the user provides a URL or existing website, acknowledge it and extract whatever info you can from the conversation.

═══════════════════════════════════════════════════════════
AVAILABLE COMPONENTS
═══════════════════════════════════════════════════════════
You have these currently accessible components at your disposal. Choose whichever combination best fits — there are NO rigid industry rules. Be creative, but never reference inaccessible services:

${availableComponentDetails}

RULES:
- heroLead = split hero with integrated lead form — great for service businesses.
   - realEstateListings = only for property/real estate. Pair with leads.
- banner is optional. Include it only when it improves the plan.
- ALWAYS include at least one hero variant.
- Use solid header styles only: sticky-solid, edge-solid, or edge-bordered. Never use transparent, glass, floating, or gradient headers.

═══════════════════════════════════════════════════════════
COLOR THEORY FUNDAMENTALS
═══════════════════════════════════════════════════════════

**The 60-30-10 Rule:**
- 60% = Background  |  30% = Primary/surfaces  |  10% = Accent pop

**Contrast (WCAG AA):**
- Dark bg → white/light text  |  Light bg → dark text  |  Min 4.5:1 ratio

**Hard Rules:**
- Use no more than three non-neutral brand colors total: primary, secondary, and accent. Background, surface, and text roles must stay neutral and must not introduce extra brand hues.
- Header and footer MUST use the exact same solid dark brand color. Never use white, off-white, pale, transparent, glass, or gradient backgrounds for header/footer.
- Header and footer typography MUST be white (#ffffff) with WCAG AA contrast.
- Text over colored backgrounds MUST be white (#ffffff) — critical for nav & hero.
- Text placed directly over images MUST be white (#ffffff) with a dark overlay/scrim strong enough for WCAG AA contrast. If text sits inside an opaque solid panel/card over the image, the panel may use a semantic brand color with readable text.
- Never request or reuse images only to create blurred/glass/decorative section backgrounds. Use the existing gradient controls instead: cornerGradient, gradientStart/gradientEnd, gradientColors, radial or multi-stop overlays when supported, plus solid semantic colors.
- Hero variants, banners, menu items, Realty/property components, product/collection heroes, portfolio, slideshow, team, and testimonial portraits remain image-backed when relevant.

Be original with palettes. Use color psychology, modern trends, and brand personality.

═══════════════════════════════════════════════════════════
AVAILABLE FONTS
═══════════════════════════════════════════════════════════
43 Google Fonts — use exact keys:
inter, inter-tight, dm-sans, outfit, figtree, urbanist, manrope, sora, montserrat, poppins, raleway, public-sans, open-sans, work-sans, space-grotesk, bricolage-grotesque, ibm-plex-sans, libre-franklin, fira-sans, barlow-condensed, archivo-narrow, red-hat-display, syne, unbounded, instrument-sans, ubuntu, playfair-display, instrument-serif, eb-garamond, libre-baskerville, merriweather, newsreader, fraunces, dm-serif-text, biorhyme, bree-serif, eczar, inknut-antiqua, marcellus, neuton, dm-mono, space-mono, noto-sans-mono

Choose ANY header/body/button combo freely. Explain your choices to the user.

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
    }, [i18n.language, referenceImages.length, accessibleComponentRegistry]);

    const buildWelcomeText = useCallback(() => `${t('aiWebsiteStudio.welcome.greeting')}

${t('aiWebsiteStudio.welcome.description')}

${t('aiWebsiteStudio.welcome.whatINeed')}
- ${t('aiWebsiteStudio.welcome.businessName')}
- ${t('aiWebsiteStudio.welcome.services')}
- ${t('aiWebsiteStudio.welcome.style')}
- ${t('aiWebsiteStudio.welcome.contact')}

${t('aiWebsiteStudio.welcome.voiceHint')}

${t('aiWebsiteStudio.welcome.existingWebsite')}

${t('aiWebsiteStudio.welcome.startQuestion')}`, [t]);

    // ═════════════════════════════════════════════════════════════════════════
    // INIT
    // ═════════════════════════════════════════════════════════════════════════

    const initStudio = useCallback(() => {
        const welcomeText = buildWelcomeText();

        const welcomeMsg: DisplayMessage = { role: 'model', text: welcomeText, timestamp: Date.now() };
        setMessages([welcomeMsg]);
        setBusinessBrief(createEmptyBrief());
        setWebsitePlan(null);
        setShowPlanReview(false);
        setGenerationPhase(null);
        setGeneratedProject(null);
        setGeneratedProjectSaveError(null);
        regenerationBusinessBlueprintRef.current = null;
        regenerationProjectDataRef.current = null;
        setIsGenerating(false);
        setIsSavingGeneratedProject(false);
        isSavingGeneratedProjectRef.current = false;

        const systemContext = buildSystemPrompt();
        historyRef.current = [
            { role: 'user', text: `[SYSTEM] ${systemContext}` },
            { role: 'model', text: welcomeText },
        ];
    }, [buildWelcomeText, buildSystemPrompt]);

    useEffect(() => {
        if (messages.length !== 1 || messages[0]?.role !== 'model') return;

        const welcomeText = buildWelcomeText();
        setMessages([{ ...messages[0], text: welcomeText, timestamp: Date.now() }]);

        const systemContext = buildSystemPrompt();
        historyRef.current = [
            { role: 'user', text: `[SYSTEM] ${systemContext}` },
            { role: 'model', text: welcomeText },
        ];
    }, [buildWelcomeText, buildSystemPrompt]);

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
            const cfData = await analyzeWebsite(url);

            const result = cfData.result;
            if (!result) {
                throw new Error(cfData.error || 'Analysis returned no extracted website data');
            }
            const pagesScraped = (cfData as any).meta?.pagesScraped || 1;
            const importedPlan = createWebsitePlanFromImport(cfData, accessibleComponentRegistry);
            setWebsitePlan(importedPlan);
            setShowPlanReview(true);

            // 2. Map Cloud Function result into our BusinessBrief
            const lang = i18n.language === 'es' ? 'es' : 'en';
            setBusinessBrief(prev => ({
                ...prev,
                businessName: importedPlan.businessProfile.businessName || result.businessName || prev.businessName,
                industry: importedPlan.businessProfile.industry || result.industry || prev.industry,
                description: importedPlan.businessProfile.description || result.description || prev.description,
                tagline: importedPlan.businessProfile.tagline || result.tagline || prev.tagline,
                services: importedPlan.businessProfile.services?.length
                    ? importedPlan.businessProfile.services.map((s: any) => ({ name: s.name, description: s.description || '' }))
                    : result.services?.length
                        ? result.services.map((s: any) => ({ name: s.name, description: s.description || '' }))
                    : prev.services,
                contactInfo: {
                    ...prev.contactInfo,
                    email: importedPlan.businessProfile.contactInfo?.email || result.contactInfo?.email || prev.contactInfo.email,
                    phone: importedPlan.businessProfile.contactInfo?.phone || result.contactInfo?.phone || prev.contactInfo.phone,
                    address: importedPlan.businessProfile.contactInfo?.address || result.contactInfo?.address || prev.contactInfo.address,
                    city: importedPlan.businessProfile.contactInfo?.city || result.contactInfo?.city || prev.contactInfo.city,
                    state: importedPlan.businessProfile.contactInfo?.state || result.contactInfo?.state || prev.contactInfo.state,
                    country: importedPlan.businessProfile.contactInfo?.country || result.contactInfo?.country || prev.contactInfo.country,
                    businessHours: result.contactInfo?.businessHours
                        ? (typeof result.contactInfo.businessHours === 'string'
                            ? result.contactInfo.businessHours
                            : JSON.stringify(result.contactInfo.businessHours))
                        : prev.contactInfo.businessHours,
                },
                // Map branding into colorPalette
                colorPalette: result.branding ? {
                    ...prev.colorPalette,
                    primary: importedPlan.brandProfile.colors.primary || result.branding.primaryColor || prev.colorPalette.primary,
                    secondary: importedPlan.brandProfile.colors.secondary || result.branding.secondaryColor || prev.colorPalette.secondary,
                    accent: importedPlan.brandProfile.colors.accent || result.branding.accentColor || prev.colorPalette.accent,
                    background: importedPlan.brandProfile.colors.background || result.branding.backgroundColor || prev.colorPalette.background,
                } : prev.colorPalette,
                suggestedComponents: importedPlan.componentPlan.map(item => item.component),
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
                  `\nHe importado toda la información disponible. Puedes seguir ajustando el plan aquí en el chat. Cuando esté listo, presiona Generar para revisar el plan final antes de crear el sitio.`
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
                  `\nI've imported all available information. You can keep adjusting the plan here in chat. When it is ready, press Generate to review the final plan before creating the website.`;

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
    }, [user, t, i18n.language, accessibleComponentRegistry]);

    // ═════════════════════════════════════════════════════════════════════════
    // BRIEF EXTRACTION — Parse <!--BRIEF:{...}--> from AI responses
    // ═════════════════════════════════════════════════════════════════════════

    const extractAndUpdateBrief = useCallback((text: string): string => {
        const briefMatch = text.match(/<!--BRIEF:([\s\S]*?)-->/);
        if (!briefMatch) return text;

        try {
            const briefData = JSON.parse(briefMatch[1]);
            const normalizedSuggestedComponents = briefData.suggestedComponents && Array.isArray(briefData.suggestedComponents)
                ? filterAllowedComponents(briefData.suggestedComponents as PageSection[])
                : null;
            const briefBusinessName = cleanBriefTextValue(briefData.businessName);
            const briefIndustry = cleanBriefTextValue(briefData.industry);
            const briefSubIndustry = cleanBriefTextValue(briefData.subIndustry);
            const briefDescription = cleanBriefTextValue(briefData.description);
            const briefTagline = cleanBriefTextValue(briefData.tagline);
            const briefReferenceImageContext = cleanBriefTextValue(briefData.referenceImageContext);
            const cleanedContactInfo = cleanContactInfo(briefData.contactInfo);
            const hasCleanedContactInfo = Object.keys(cleanedContactInfo).length > 0;
            const cleanedServicesList = Array.isArray(briefData.services)
                ? briefData.services
                    .map((service: any) => ({
                        name: cleanBriefTextValue(service?.name) || '',
                        description: cleanBriefTextValue(service?.description) || '',
                    }))
                    .filter((service: { name: string; description: string }) => service.name)
                : [];
            const cleanedServices = cleanedServicesList.length > 0 ? cleanedServicesList : null;

            setBusinessBrief(prev => {
                const updated = { ...prev };
                if (briefBusinessName) updated.businessName = briefBusinessName;
                if (briefIndustry) updated.industry = briefIndustry;
                if (briefSubIndustry) updated.subIndustry = briefSubIndustry;
                if (briefDescription) updated.description = briefDescription;
                if (briefTagline) updated.tagline = briefTagline;
                if (cleanedServices) updated.services = cleanedServices;
                if (hasCleanedContactInfo) updated.contactInfo = mergeContactInfo(prev.contactInfo, cleanedContactInfo);
                if (briefData.hasEcommerce !== undefined) updated.hasEcommerce = briefData.hasEcommerce;
                if (briefData.ecommerceType) updated.ecommerceType = briefData.ecommerceType;
                if (briefData.colorPalette) updated.colorPalette = { ...prev.colorPalette, ...briefData.colorPalette };
                if (briefData.fontPairing) {
                    updated.fontPairing = chooseWebsiteFontPairing(updated, { ...prev.fontPairing, ...briefData.fontPairing });
                }
                if (normalizedSuggestedComponents) {
                    updated.suggestedComponents = normalizedSuggestedComponents;
                }
                if (typeof briefData.readinessScore === 'number') updated.readinessScore = briefData.readinessScore;
                if (briefData.missingFields && Array.isArray(briefData.missingFields)) updated.missingFields = briefData.missingFields;
                if (briefReferenceImageContext) updated.referenceImageContext = briefReferenceImageContext;
                return normalizeBriefCompletion(updated);
            });

            setWebsitePlan(prevPlan => {
                if (!prevPlan) return prevPlan;

                const nextPlan: WebsitePlan = {
                    ...prevPlan,
                    businessProfile: {
                        ...prevPlan.businessProfile,
                        businessName: briefBusinessName || prevPlan.businessProfile.businessName,
                        industry: briefIndustry || prevPlan.businessProfile.industry,
                        description: briefDescription || prevPlan.businessProfile.description,
                        tagline: briefTagline || prevPlan.businessProfile.tagline,
                        services: cleanedServices || prevPlan.businessProfile.services,
                        contactInfo: hasCleanedContactInfo
                            ? mergeContactInfo(prevPlan.businessProfile.contactInfo, cleanedContactInfo)
                            : prevPlan.businessProfile.contactInfo,
                        hasEcommerce: briefData.hasEcommerce !== undefined ? briefData.hasEcommerce : prevPlan.businessProfile.hasEcommerce,
                    },
                    brandProfile: {
                        ...prevPlan.brandProfile,
                        colors: briefData.colorPalette
                            ? { ...prevPlan.brandProfile.colors, ...briefData.colorPalette }
                            : prevPlan.brandProfile.colors,
                        fonts: briefData.fontPairing
                            ? [
                                briefData.fontPairing.header,
                                briefData.fontPairing.body,
                                briefData.fontPairing.button,
                            ].filter(Boolean)
                            : prevPlan.brandProfile.fonts,
                        selectedColorCandidateId: briefData.colorPalette ? 'manual' : prevPlan.brandProfile.selectedColorCandidateId,
                        colorBrief: briefData.colorPalette
                            ? {
                                ...(prevPlan.brandProfile.colorBrief || createColorBriefFromWebsitePlan(prevPlan)),
                                lockedColors: {
                                    ...(prevPlan.brandProfile.colorBrief?.lockedColors || {}),
                                    ...briefData.colorPalette,
                                },
                            }
                            : prevPlan.brandProfile.colorBrief,
                    },
                };

                if (normalizedSuggestedComponents) {
                    nextPlan.componentPlan = buildComponentPlan(normalizedSuggestedComponents, accessibleComponentRegistry, 'user');
                }

                nextPlan.assetPlan = buildAssetPlan(nextPlan);
                return nextPlan;
            });
        } catch (e) {
            if (isDev) console.warn('[AIWebsiteStudio] Failed to parse brief:', e);
        }

        // Remove the brief tag from visible text
        return text.replace(/<!--BRIEF:[\s\S]*?-->/g, '').trim();
    }, [accessibleComponentRegistry, filterAllowedComponents]);

    const applyUserTextBriefPatch = useCallback((text: string) => {
        const extractedContactInfo = extractContactDetailsFromText(text);
        if (Object.keys(extractedContactInfo).length === 0) return;

        setBusinessBrief(prev => normalizeBriefCompletion({
            ...prev,
            contactInfo: mergeContactInfo(prev.contactInfo, extractedContactInfo),
        }));

        setWebsitePlan(prevPlan => {
            if (!prevPlan) return prevPlan;
            const contactInfo = mergeContactInfo(prevPlan.businessProfile.contactInfo, extractedContactInfo);
            return {
                ...prevPlan,
                businessProfile: {
                    ...prevPlan.businessProfile,
                    contactInfo,
                },
            };
        });
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
        applyUserTextBriefPatch(text.trim());

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
                {
                    temperature: 1.0,
                    thinkingLevel: 'medium',
                    maxOutputTokens: 8192,
                    billing: currentTenantId && user?.id ? {
                        tenantId: currentTenantId,
                        userId: user.id,
                        operation: 'ai_assistant_request',
                        description: 'AI Website Studio chat',
                        metadata: { feature: 'ai-website-studio-chat' },
                    } : { skip: true },
                },
                user?.id
            );

            const responseText = extractTextFromResponse(response);
            if (responseText) {
                const cleanedText = extractAndUpdateBrief(responseText);
                const aiMsg: DisplayMessage = { role: 'model', text: cleanedText, timestamp: Date.now() };
                setMessages(prev => [...prev, aiMsg]);
                historyRef.current.push({ role: 'model', text: responseText }); // Store full including brief
            }

            logApiCall({
                userId: user?.id || '',
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
    }, [isThinking, user, currentTenantId, buildSystemPrompt, extractAndUpdateBrief, applyUserTextBriefPatch]);

    // Auto-scroll
    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [messages, isThinking, liveUserTranscript, liveModelTranscript]);

    // ═════════════════════════════════════════════════════════════════════════
    // VOICE MODE
    // ═════════════════════════════════════════════════════════════════════════

    const stopVoiceSession = useCallback(async () => {
        if (conversationRef.current) {
            try {
                await conversationRef.current.endSession();
            } catch (e) {
                console.error('[AIWebsiteStudio Voice] Error ending session:', e);
            }
            conversationRef.current = null;
        }

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
        setLiveUserTranscript('');
        setLiveModelTranscript('');
        currentUserTranscriptRef.current = '';
        currentModelResponseRef.current = '';
        setIsVoiceActive(false);
        setIsVoiceConnecting(false);
    }, [extractAndUpdateBrief]);

    const startVoiceSession = useCallback(async () => {
        setIsVoiceConnecting(true);
        try {
            // Request mic permissions first
            await navigator.mediaDevices.getUserMedia({ audio: true });

            const conversation = await Conversation.startSession({
                agentId: ELEVENLABS_AGENT_ID,
                onConnect: () => {
                    setIsVoiceConnecting(false);
                    setIsVoiceActive(true);
                },
                onDisconnect: () => {
                    stopVoiceSession();
                },
                onError: (error) => {
                    console.error('[AIWebsiteStudio Voice] Error:', error);
                    stopVoiceSession();
                },
                onModeChange: (mode) => {
                    // Could handle speaking state here if needed
                },
                onMessage: (message) => {
                    if (message.source === 'user') {
                        // User transcript
                        currentUserTranscriptRef.current += message.message + ' ';
                        setLiveUserTranscript(currentUserTranscriptRef.current);
                        
                        // Treat each message as a complete turn for UI simplicity
                        const ut = currentUserTranscriptRef.current.trim();
                        if (ut) {
                            setMessages(prev => [...prev, { role: 'user', text: ut, isVoice: true, timestamp: Date.now() }]);
                            historyRef.current.push({ role: 'user', text: ut });
                        }
                        currentUserTranscriptRef.current = '';
                        setLiveUserTranscript('');
                    } else if (message.source === 'ai') {
                        // Model transcript
                        currentModelResponseRef.current += message.message + ' ';
                        setLiveModelTranscript(currentModelResponseRef.current);
                        
                        const mt = currentModelResponseRef.current.trim();
                        if (mt) {
                            const cleaned = extractAndUpdateBrief(mt);
                            setMessages(prev => [...prev, { role: 'model', text: cleaned, isVoice: true, timestamp: Date.now() }]);
                            historyRef.current.push({ role: 'model', text: mt });
                        }
                        currentModelResponseRef.current = '';
                        setLiveModelTranscript('');
                    }
                }
            });

            conversationRef.current = conversation;

        } catch (error) {
            console.error('[AIWebsiteStudio] Voice session error:', error);
            setIsVoiceConnecting(false);
        }
    }, [stopVoiceSession, extractAndUpdateBrief]);

    // Cleanup voice on unmount
    useEffect(() => { return () => { stopVoiceSession(); }; }, [stopVoiceSession]);

    // ═════════════════════════════════════════════════════════════════════════
    // WEBSITE GENERATION — Project-First Architecture
    // Flow: Create project → Generate content → Map data → Scan for empty
    //       imageUrl fields → Generate images → Write directly to fields
    // ═════════════════════════════════════════════════════════════════════════

    const runGeneration = useCallback(async (planOverride?: WebsitePlan) => {
        if (isGeneratingRef.current || !user || shouldBlockGenerationForAccess) return;
        isGeneratingRef.current = true;
        setIsGenerating(true);
        const existingBusinessBlueprint = regenerationBusinessBlueprintRef.current;
        const existingProjectDataForRegeneration = regenerationProjectDataRef.current;
        regenerationBusinessBlueprintRef.current = null;
        regenerationProjectDataRef.current = null;
        setGeneratedProject(null);
        setGeneratedProjectSaveError(null);

        let planForGeneration = planOverride || websitePlan || createWebsitePlanFromBrief(businessBrief, accessibleComponentRegistry);
        const plannedComponents = planForGeneration.componentPlan.map(item => item.component);
        const sanitizedComponents = sanitizeComponentOrder(
            plannedComponents.length > 0 ? plannedComponents : businessBrief.suggestedComponents,
            accessibleComponentRegistry
        );
        const visibleComponents = sanitizedComponents.filter(section => !['header', 'footer'].includes(section));
        const normalizedPlanBase: WebsitePlan = {
            ...planForGeneration,
            componentPlan: buildComponentPlan(visibleComponents, accessibleComponentRegistry, planForGeneration.source === 'imported-url' ? 'import' : 'user'),
        };
        planForGeneration = {
            ...normalizedPlanBase,
            assetPlan: normalizedPlanBase.assetPlan?.length ? normalizedPlanBase.assetPlan : buildAssetPlan(normalizedPlanBase),
        };
        planForGeneration = applyColorExpertToPlan(planForGeneration);

        const planColors = planForGeneration.brandProfile.colors;
        const planFonts = planForGeneration.brandProfile.fonts || [];
        const briefForFontSelection: BusinessBrief = {
            ...businessBrief,
            businessName: planForGeneration.businessProfile.businessName || businessBrief.businessName,
            industry: planForGeneration.businessProfile.industry || businessBrief.industry,
            description: planForGeneration.businessProfile.description || businessBrief.description,
            hasEcommerce: Boolean(planForGeneration.businessProfile.hasEcommerce && accessibleComponentRegistry.some(item => item.role === 'ecommerce')),
        };
        const hasExplicitPlanFonts = planFonts.length > 0;
        const hasNonDefaultBriefFonts = !(
            businessBrief.fontPairing.header === 'playfair-display' &&
            businessBrief.fontPairing.body === 'inter' &&
            businessBrief.fontPairing.button === 'inter'
        );
        const selectedFontPairing = chooseWebsiteFontPairing(
            briefForFontSelection,
            hasExplicitPlanFonts
                ? { header: planFonts[0], body: planFonts[1], button: planFonts[2] }
                : hasNonDefaultBriefFonts
                    ? businessBrief.fontPairing
                    : undefined
        );
        const brief: BusinessBrief = {
            ...businessBrief,
            businessName: planForGeneration.businessProfile.businessName || businessBrief.businessName,
            industry: planForGeneration.businessProfile.industry || businessBrief.industry,
            description: planForGeneration.businessProfile.description || businessBrief.description,
            tagline: planForGeneration.businessProfile.tagline || businessBrief.tagline,
            services: planForGeneration.businessProfile.services?.length
                ? planForGeneration.businessProfile.services.map(service => ({ name: service.name, description: service.description || '' }))
                : businessBrief.services,
            contactInfo: { ...businessBrief.contactInfo, ...(planForGeneration.businessProfile.contactInfo || {}) },
            hasEcommerce: Boolean(planForGeneration.businessProfile.hasEcommerce && accessibleComponentRegistry.some(item => item.role === 'ecommerce')),
            colorPalette: {
                ...businessBrief.colorPalette,
                primary: planColors.primary || businessBrief.colorPalette.primary,
                secondary: planColors.secondary || businessBrief.colorPalette.secondary,
                accent: planColors.accent || businessBrief.colorPalette.accent,
                background: planColors.background || businessBrief.colorPalette.background,
                surface: planColors.surface || businessBrief.colorPalette.surface,
                text: planColors.text || businessBrief.colorPalette.text,
            },
            fontPairing: {
                header: selectedFontPairing.header,
                body: selectedFontPairing.body,
                button: selectedFontPairing.button,
            },
            suggestedComponents: visibleComponents,
        };
        setWebsitePlan(planForGeneration);
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

            const projectId = createUuid();
            addEvent('content', 'Creating project...');

            const selectedGlobalColors = {
                primary: planColors.primary || brief.colorPalette.primary,
                secondary: planColors.secondary || brief.colorPalette.secondary,
                accent: planColors.accent || brief.colorPalette.accent,
                background: planColors.background || brief.colorPalette.background,
                surface: planColors.surface || brief.colorPalette.surface,
                text: planColors.text || brief.colorPalette.text,
                textMuted: planColors.textMuted || `${planColors.text || brief.colorPalette.text}99`,
                heading: planColors.heading || planColors.text || brief.colorPalette.text,
                border: planColors.border || brief.colorPalette.surface,
                success: planColors.success || '#7fb069',
                error: planColors.error || '#c75c5c',
            };

            // Build theme from the validated Color Expert system.
            const theme = {
                cardBorderRadius: 'md',
                buttonBorderRadius: 'md',
                fontFamilyHeader: selectedFontPairing.header,
                fontFamilyBody: selectedFontPairing.body,
                fontFamilyButton: selectedFontPairing.button,
                fontWeightHeader: selectedFontPairing.weight || 700,
                headingsAllCaps: false,
                buttonsAllCaps: true,
                navLinksAllCaps: false,
                pageBackground: selectedGlobalColors.background,
                globalColors: selectedGlobalColors,
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
                {
                    temperature: 0.7,
                    maxOutputTokens: 32768,
                    billing: currentTenantId ? {
                        tenantId: currentTenantId,
                        userId: user.id,
                        operation: 'onboarding_complete',
                        description: 'AI Website Studio content generation',
                        metadata: { feature: 'ai-website-studio-content', project_id: finalProjectId },
                    } : { skip: true },
                },
                user.id
            );

            logApiCall({ userId: user.id, model: MODEL_CHAT, feature: 'ai-website-studio-content', success: true });

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

            // Merge AI theme structure, but keep Color Expert as the final authority for global colors.
            const finalTheme = websiteData.theme
                ? {
                    ...theme,
                    ...websiteData.theme,
                    pageBackground: theme.pageBackground,
                    globalColors: theme.globalColors,
                    fontFamilyHeader: theme.fontFamilyHeader,
                    fontFamilyBody: theme.fontFamilyBody,
                    fontFamilyButton: theme.fontFamilyButton,
                    fontWeightHeader: theme.fontWeightHeader,
                }
                : theme;

            // Build the data
            const finalData = websiteData.data;
            applyExistingAssetPlan(finalData, planForGeneration.assetPlan);

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
            const plannedOrder = sanitizeComponentOrder(brief.suggestedComponents, accessibleComponentRegistry);
            const plannedSet = new Set<PageSection>(plannedOrder);
            const generatedOrder = Array.isArray(websiteData.componentOrder)
                ? websiteData.componentOrder as PageSection[]
                : brief.suggestedComponents || ['hero', 'services', 'features', 'cta', 'footer'];
            let componentOrder: PageSection[] = sanitizeComponentOrder(generatedOrder, accessibleComponentRegistry)
                .filter(section => ['header', 'footer'].includes(section) || plannedSet.has(section));
            if (!componentOrder.some(section => String(section).startsWith('hero'))) {
                componentOrder = sanitizeComponentOrder(plannedOrder, accessibleComponentRegistry);
            }
            if (!componentOrder.includes('colors')) componentOrder.unshift('colors');
            if (!componentOrder.includes('typography')) componentOrder.splice(1, 0, 'typography');
            if (!componentOrder.includes('header')) componentOrder.splice(2, 0, 'header');
            if (!componentOrder.includes('footer')) componentOrder.push('footer');

            // If banner was selected, keep it near the end without forcing it into every site.
            const bannerIdx = componentOrder.indexOf('banner');
            if (bannerIdx !== -1) {
                componentOrder.splice(bannerIdx, 1);
                const footerIdx = componentOrder.indexOf('footer');
                if (footerIdx !== -1) {
                    componentOrder.splice(footerIdx, 0, 'banner');
                } else {
                    componentOrder.push('banner');
                }
            }

            pruneUnplannedComponentData(finalData, componentOrder);
            repairGeneratedWebsiteDesign(finalData, finalTheme, componentOrder, brief, isSpanish);
            applyDesignStrategyToGeneratedData(finalData, componentOrder, brief, finalTheme);
            normalizeRepeatedCornerGradients(finalData, componentOrder);
            const sectionVisibility = buildVisibility(componentOrder.filter(c => !['colors', 'typography', 'header', 'footer'].includes(c)));

            // Build menus
            const headerLinks = Array.isArray(finalData.header?.links)
                ? finalData.header.links.map((link: any, index: number) => ({
                    id: `nav-${index + 1}`,
                    text: link.text,
                    href: link.href,
                    type: 'section' as const,
                }))
                : buildHeaderLinksForOrder(componentOrder, isSpanish).map((link, index) => ({
                    id: `nav-${index + 1}`,
                    ...link,
                    type: 'section' as const,
                }));
            const projectMenus = [{
                id: 'main', title: 'Main Menu', handle: 'main-menu', items: headerLinks,
            }];

            // Build AI Assistant config
            const chatbotGlobalColors: ChatbotGlobalColors = {
                primary: globalColors.primary, secondary: globalColors.secondary,
                accent: globalColors.accent, background: globalColors.background,
                surface: globalColors.surface, text: globalColors.text, border: globalColors.border,
            };
            const aiAssistantConfig = generateAiAssistantConfig({
                businessName: brief.businessName, industry: brief.industry,
                description: brief.description,
                services: brief.services?.map((s, i) => ({ id: `svc-${i}`, name: s.name, description: s.description, isAIGenerated: true })),
                contactInfo: brief.contactInfo, language: i18n.language,
                hasEcommerce: Boolean(brief.hasEcommerce || planForGeneration.businessProfile.hasEcommerce),
                storeSetup: {
                    storeName: brief.businessName,
                    currency: 'USD',
                    currencySymbol: '$',
                    shippingType: 'local',
                    selectedCategories: Array.from(new Set([
                        ...(planForGeneration.contentMap.products || [])
                            .map(product => typeof product === 'object' && product ? String((product as any).category || '') : '')
                            .filter(Boolean),
                    ])),
                },
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
            const validation = validateGeneratedWebsite(finalData, componentOrder, planForGeneration);
            if (validation.issues.length > 0) {
                addEvent(
                    validation.valid ? 'content' : 'image_fail',
                    `Quality pass found ${validation.issues.length} issue${validation.issues.length === 1 ? '' : 's'}`
                );
                if (!validation.valid) {
                    throw new Error(validation.issues.find(issue => issue.severity === 'error')?.message || 'Generated website failed validation');
                }
            }

            const imageSlots = mergeImageSlots(
                assetPlanToImageSlots(planForGeneration.assetPlan, finalData, brief),
                collectImageSlots(finalData, brief, componentOrder)
            );
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
                            destination: 'user',
                            personGeneration: 'allow_adult',
                            lighting: 'natural golden hour',
                            depthOfField: 'shallow cinematic bokeh',
                            projectId: finalProjectId,
                            tenantId: currentTenantId,
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

            // Decorative glass/blur section backgrounds use gradients and semantic colors.
            // Hero, banner, menu, Realty, product, portfolio, slideshow, team, and testimonial images stay image-backed.

            // ══════════════════════════════════════════════════════════════════
            // PHASE 6: Final project update with images (95-100%)
            // ══════════════════════════════════════════════════════════════════
            addEvent('save', `Saving website with ${completed} images...`);
            setGenerationPhase(prev => prev ? { ...prev, phase: 'finalizing', progress: 95, currentStep: 'Saving and opening editor...' } : prev);

            // Build the complete project object
            let fullProject = attachAiStudioBusinessBlueprint({
                id: finalProjectId,
                name: brief.businessName || 'My Website',
                thumbnailUrl: extractHeroImage(finalData, componentOrder) || '',
                status: 'Draft' as const,
                lastUpdated: new Date().toISOString(),
                data: finalData,
                theme: finalTheme,
                brandIdentity: skeletonProject.brandIdentity,
                componentOrder,
                sectionVisibility,
                pages: projectPages,
                menus: projectMenus,
                aiAssistantConfig: stateUpdates.aiAssistantConfig,
                generatedWith: 'AI Website Studio',
            } as Project, planForGeneration, {
                tenantId: currentTenantId || undefined,
                createdBy: user.id,
                existingBusinessBlueprint,
            });
            const hydratedAiAssistantConfig = resolveProjectAiAssistantConfig({
                ai_assistant_config: fullProject.aiAssistantConfig as any,
                data: {
                    businessBlueprint: fullProject.businessBlueprint,
                },
            });
            if (hydratedAiAssistantConfig) {
                fullProject = {
                    ...fullProject,
                    aiAssistantConfig: hydratedAiAssistantConfig as any,
                };
            }
            if (existingBusinessBlueprint && existingProjectDataForRegeneration) {
                const { nextProjectData } = createSnapshotBeforeRegeneration(
                    {
                        ...existingProjectDataForRegeneration,
                        businessBlueprint: existingBusinessBlueprint,
                    },
                    {
                        projectId: finalProjectId,
                        scope: 'project',
                        source: 'ai_regeneration',
                        now: fullProject.lastUpdated || new Date().toISOString(),
                        metadata: {
                            tenantId: currentTenantId,
                            userId: user.id,
                            createdBy: user.id,
                            actionType: 'ai_website_studio_regenerate_preview',
                            module: 'aiStudio',
                            source: 'ai-website-studio',
                        },
                    },
                );
                fullProject = {
                    ...fullProject,
                    ...({ versionHistory: nextProjectData.versionHistory } as Record<string, unknown>),
                };
            }

            if (isDev) {
                console.log('[AIWebsiteStudio] Commerce blueprints generated:', {
                    ecommerceEnabled: fullProject.businessBlueprint.ecommerceBlueprint.enabled,
                    storefrontEnabled: fullProject.businessBlueprint.storefrontBlueprint.enabled,
                    starterProducts: fullProject.businessBlueprint.ecommerceBlueprint.starterProducts.length,
                    categories: fullProject.businessBlueprint.ecommerceBlueprint.productCategories || fullProject.businessBlueprint.ecommerceBlueprint.categories,
                    themePreset: fullProject.businessBlueprint.storefrontBlueprint.themePreset,
                    productCardVariant: fullProject.businessBlueprint.storefrontBlueprint.productCardVariant,
                });
            }

            addEvent('done', 'Opening website editor...');
            setGenerationPhase(prev => prev ? { ...prev, phase: 'done', progress: 100, currentStep: 'Opening website editor...' } : prev);

            if (isDev) console.log('[AIWebsiteStudio] Website ready. Saving and opening editor.');

            const openedEditor = await saveProjectAndOpenEditor(fullProject);
            if (!openedEditor) {
                setGeneratedProject(fullProject);
                const successMsg = isSpanish
                    ? `Tu website esta listo, pero no se pudo abrir automaticamente. Generamos ${Object.keys(finalData).length} secciones y ${completed} imagenes.`
                    : `Your website is ready, but it could not open automatically. We generated ${Object.keys(finalData).length} sections and ${completed} images.`;
                setMessages(prev => [...prev, { role: 'model', text: successMsg, timestamp: Date.now() }]);
            }

        } catch (error) {
            console.error('[AIWebsiteStudio] Generation failed:', error);
            setGenerationPhase(null);
            setGeneratedProject(null);
            const errorMsg = t('aiWebsiteStudio.generation.error', {
                error: error instanceof Error ? error.message : String(error),
            });
            setMessages(prev => [...prev, { role: 'model', text: errorMsg, timestamp: Date.now() }]);
        } finally {
            isGeneratingRef.current = false;
            setIsGenerating(false);
        }
    }, [businessBrief, websitePlan, accessibleComponentRegistry, shouldBlockGenerationForAccess, user, currentTenantId, t, generateImage, i18n.language, saveProjectAndOpenEditor]);

    const startGeneration = useCallback(() => {
        if (!user || isGeneratingRef.current || shouldBlockGenerationForAccess) return;
        const basePlan = websitePlan || createWebsitePlanFromBrief(businessBrief, accessibleComponentRegistry);
        const selectedComponents = sanitizeComponentOrder(
            basePlan.componentPlan.map(item => item.component).length > 0
                ? basePlan.componentPlan.map(item => item.component)
                : businessBrief.suggestedComponents,
            accessibleComponentRegistry
        ).filter(section => !['header', 'footer'].includes(section));
        const normalizedPlanBase: WebsitePlan = {
            ...basePlan,
            componentPlan: buildComponentPlan(selectedComponents, accessibleComponentRegistry, basePlan.source === 'imported-url' ? 'import' : 'user'),
        };
        const normalizedPlan = applyColorExpertToPlan({
            ...normalizedPlanBase,
            assetPlan: buildAssetPlan(normalizedPlanBase),
        });
        setWebsitePlan(normalizedPlan);
        setShowPlanReview(true);
    }, [accessibleComponentRegistry, businessBrief, shouldBlockGenerationForAccess, user, websitePlan]);

    const commitWebsitePlanToBrief = useCallback((plan: WebsitePlan, selectedComponentsOverride?: PageSection[]) => {
        const selectedComponents = selectedComponentsOverride || sanitizeComponentOrder(
            plan.componentPlan.map(item => item.component),
            accessibleComponentRegistry
        ).filter(section => !['header', 'footer'].includes(section));
        const filteredComponents = filterAllowedComponents(selectedComponents);
        const importedImageUrls = [
            ...plan.assetPlan
                .filter(asset => asset.source === 'existing' && asset.existingUrl)
                .map(asset => asset.existingUrl as string),
            ...(plan.contentMap.extractedImages || [])
                .slice()
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map(image => image.url),
        ].filter((url, index, all): url is string => (
            Boolean(url) &&
            !/pixel|tracking|spacer|blank|placeholder|loader/i.test(url) &&
            all.findIndex(item => item === url) === index
        )).slice(0, 14);

        setBusinessBrief(prev => {
            const nextBrief: BusinessBrief = {
                ...prev,
                businessName: plan.businessProfile.businessName || prev.businessName,
                industry: plan.businessProfile.industry || prev.industry,
                description: plan.businessProfile.description || prev.description,
                tagline: plan.businessProfile.tagline || prev.tagline,
                services: plan.businessProfile.services?.length
                    ? plan.businessProfile.services.map(service => ({ name: service.name, description: service.description || '' }))
                    : prev.services,
                contactInfo: { ...prev.contactInfo, ...(plan.businessProfile.contactInfo || {}) },
                hasEcommerce: Boolean(plan.businessProfile.hasEcommerce),
                colorPalette: {
                    ...prev.colorPalette,
                    primary: plan.brandProfile.colors.primary || prev.colorPalette.primary,
                    secondary: plan.brandProfile.colors.secondary || prev.colorPalette.secondary,
                    accent: plan.brandProfile.colors.accent || prev.colorPalette.accent,
                    background: plan.brandProfile.colors.background || prev.colorPalette.background,
                    surface: plan.brandProfile.colors.surface || prev.colorPalette.surface,
                    text: plan.brandProfile.colors.text || prev.colorPalette.text,
                },
                suggestedComponents: filteredComponents,
                readinessScore: Math.max(prev.readinessScore || 0, 80),
                missingFields: [],
            };
            const importedFonts = plan.brandProfile.fonts || [];
            nextBrief.fontPairing = chooseWebsiteFontPairing(nextBrief, {
                header: importedFonts[0] || prev.fontPairing.header,
                body: importedFonts[1] || importedFonts[0] || prev.fontPairing.body,
                button: importedFonts[2] || importedFonts[1] || importedFonts[0] || prev.fontPairing.button,
            });
            return nextBrief;
        });

        if (importedImageUrls.length > 0) {
            setReferenceImages(prev => {
                const merged = [...prev];
                for (const url of importedImageUrls) {
                    if (merged.length >= 14) break;
                    if (!merged.includes(url)) merged.push(url);
                }
                return merged;
            });
        }
    }, [accessibleComponentRegistry, filterAllowedComponents]);

    const returnToChatFromPlanReview = useCallback(() => {
        if (websitePlan) {
            commitWebsitePlanToBrief(websitePlan);
        }
        setShowPlanReview(false);
    }, [commitWebsitePlanToBrief, websitePlan]);

    const confirmWebsitePlan = useCallback(async (plan: WebsitePlan) => {
        if (shouldBlockGenerationForAccess) return;
        const selectedComponents = sanitizeComponentOrder(
            plan.componentPlan.map(item => item.component),
            accessibleComponentRegistry
        ).filter(section => !['header', 'footer'].includes(section));
        const normalizedPlanBase: WebsitePlan = {
            ...plan,
            componentPlan: buildComponentPlan(selectedComponents, accessibleComponentRegistry, 'user'),
            businessProfile: {
                ...plan.businessProfile,
                hasEcommerce: Boolean(plan.businessProfile.hasEcommerce && selectedComponents.some(component => {
                    const item = accessibleComponentRegistry.find(entry => entry.id === component);
                    return item?.role === 'ecommerce';
                })),
            },
        };
        const selectedAssetByPath = new Map(
            plan.assetPlan
                .filter(asset => asset.source === 'existing' && asset.existingUrl)
                .map(asset => [asset.targetPath, asset])
        );
        const normalizedPlan = applyColorExpertToPlan({
            ...normalizedPlanBase,
            assetPlan: buildAssetPlan(normalizedPlanBase).map(asset => {
                const selectedAsset = selectedAssetByPath.get(asset.targetPath);
                return selectedAsset
                    ? { ...asset, source: 'existing' as const, existingUrl: selectedAsset.existingUrl }
                    : asset;
            }),
        });
        setWebsitePlan(normalizedPlan);
        commitWebsitePlanToBrief(normalizedPlan, selectedComponents);
        setShowPlanReview(false);
        await runGeneration(normalizedPlan);
    }, [accessibleComponentRegistry, commitWebsitePlanToBrief, shouldBlockGenerationForAccess, runGeneration]);

    const saveGeneratedProjectAndOpenEditor = useCallback(async () => {
        if (!generatedProject) return;
        await saveProjectAndOpenEditor(generatedProject);
    }, [generatedProject, saveProjectAndOpenEditor]);

    const regenerateGeneratedWebsite = useCallback(async () => {
        if (isGeneratingRef.current || isSavingGeneratedProjectRef.current) return;
        const planForRegeneration = websitePlan || undefined;
        regenerationBusinessBlueprintRef.current = generatedProject?.businessBlueprint || null;
        regenerationProjectDataRef.current = generatedProject ? {
            name: generatedProject.name,
            data: generatedProject.data,
            theme: generatedProject.theme,
            brandIdentity: generatedProject.brandIdentity,
            componentOrder: generatedProject.componentOrder,
            sectionVisibility: generatedProject.sectionVisibility,
            pages: generatedProject.pages,
            menus: generatedProject.menus,
            aiAssistantConfig: generatedProject.aiAssistantConfig,
            thumbnailUrl: generatedProject.thumbnailUrl,
            businessBlueprint: generatedProject.businessBlueprint,
            lastUpdated: generatedProject.lastUpdated,
        } : null;
        setGeneratedProject(null);
        setGeneratedProjectSaveError(null);
        setGenerationPhase(null);
        await runGeneration(planForRegeneration);
    }, [generatedProject, runGeneration, websitePlan]);

    const returnToPlanFromGeneratedPreview = useCallback(() => {
        if (isSavingGeneratedProjectRef.current) return;
        setGeneratedProject(null);
        setGeneratedProjectSaveError(null);
        setGenerationPhase(null);
        regenerationBusinessBlueprintRef.current = null;
        regenerationProjectDataRef.current = null;
        if (websitePlan) setShowPlanReview(true);
    }, [websitePlan]);

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

    const updateBriefFont = useCallback((fontKey: 'header' | 'body' | 'button', newFont: FontFamily) => {
        setBusinessBrief(prev => ({
            ...prev,
            fontPairing: { ...prev.fontPairing, [fontKey]: newFont },
        }));
    }, []);

    const toggleBriefComponent = useCallback((component: PageSection) => {
        if (filterAllowedComponents([component]).length === 0) return;
        setBusinessBrief(prev => {
            const exists = prev.suggestedComponents.includes(component);
            return {
                ...prev,
                suggestedComponents: exists
                    ? prev.suggestedComponents.filter(c => c !== component)
                    : [...prev.suggestedComponents, component],
            };
        });
    }, [filterAllowedComponents]);

    const setBriefComponents = useCallback((components: PageSection[]) => {
        setBusinessBrief(prev => ({
            ...prev,
            suggestedComponents: filterAllowedComponents(components),
        }));
    }, [filterAllowedComponents]);

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
        businessBrief, websitePlan, showPlanReview, setWebsitePlan, setShowPlanReview, returnToChatFromPlanReview,
        availableComponents, updateBriefColor, updateBriefFont, toggleBriefComponent, setBriefComponents,
        // Reference Images
        referenceImages, addReferenceImage, removeReferenceImage,
        // Generation
        isGenerating, generationPhase, generatedProject, isSavingGeneratedProject, generatedProjectSaveError,
        canGenerate, isAccessLoading, startGeneration, confirmWebsitePlan,
        saveGeneratedProjectAndOpenEditor, regenerateGeneratedWebsite, returnToPlanFromGeneratedPreview,
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

function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, part) => {
        if (current == null) return undefined;
        const index = Number(part);
        return !isNaN(index) ? current[index] : current[part];
    }, obj);
}

function applyExistingAssetPlan(data: any, assetPlan: WebsitePlan['assetPlan'] = []): void {
    for (const asset of assetPlan) {
        if (asset.source === 'existing' && asset.existingUrl) {
            setNestedValue(data, asset.targetPath, asset.existingUrl);
        }
    }
}

function assetPlanToImageSlots(assetPlan: WebsitePlan['assetPlan'] = [], data: any, brief: BusinessBrief): ImageSlot[] {
    return assetPlan
        .filter(asset => asset.source === 'generate' && !getNestedValue(data, asset.targetPath))
        .map(asset => ({
            path: asset.targetPath,
            componentType: asset.targetPath.split('.')[0],
            context: asset.prompt || `${brief.businessName} ${asset.targetPath}`,
            aspectRatio: asset.aspectRatio || '16:9',
        }));
}

function mergeImageSlots(...groups: ImageSlot[][]): ImageSlot[] {
    const seen = new Set<string>();
    const merged: ImageSlot[] = [];
    for (const group of groups) {
        for (const slot of group) {
            if (seen.has(slot.path)) continue;
            seen.add(slot.path);
            merged.push(slot);
        }
    }
    return merged;
}

function collectImageSlots(data: any, brief: any, componentOrder: string[]): ImageSlot[] {
    const slots: ImageSlot[] = [];
    if (!data || typeof data !== 'object') return slots;

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
                slides.slice(0, 2).forEach((slide: any, i: number) => {
                    if (!slide.imageUrl) {
                        slots.push({
                            path: `heroNeon.slides.${i}.imageUrl`,
                            componentType: 'heroNeon',
                            context: slide.headline || slide.subheadline || brief.tagline || brief.businessName,
                            aspectRatio: '16:9',
                        });
                    }
                });
            } else {
                // No slides array — create one with empty imageUrls for 2 slides
                data['heroNeon'].slides = [
                    {
                        headline: brief.tagline || brief.businessName,
                        subheadline: brief.description?.substring(0, 80) || '',
                        primaryCta: 'Get Started',
                        primaryCtaLink: '/#services',
                        imageUrl: '',
                    },
                    {
                        headline: brief.services?.[0]?.name || 'Our Services',
                        subheadline: brief.services?.[0]?.description?.substring(0, 80) || '',
                        primaryCta: 'Learn More',
                        primaryCtaLink: '/#features',
                        imageUrl: '',
                    }
                ];
                [0, 1].forEach(i => {
                    slots.push({
                        path: `heroNeon.slides.${i}.imageUrl`,
                        componentType: 'heroNeon',
                        context: data['heroNeon'].slides[i].headline || brief.tagline || brief.businessName,
                        aspectRatio: '16:9',
                    });
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
                slides.slice(0, 2).forEach((slide: any, i: number) => {
                    if (!slide.backgroundImage) {
                        slots.push({
                            path: `${heroKey}.slides.${i}.backgroundImage`,
                            componentType: heroKey,
                            context: slide.headline || slide.subheadline || brief.tagline || brief.businessName,
                            aspectRatio: '16:9',
                        });
                    }
                });
            } else {
                // No slides array — create one with empty backgroundImage
                data[heroKey].slides = [
                    {
                        headline: brief.tagline || brief.businessName,
                        subheadline: brief.description?.substring(0, 80) || '',
                        primaryCta: 'Get Started',
                        primaryCtaLink: '/#services',
                        backgroundImage: '',
                    },
                    {
                        headline: brief.services?.[0]?.name || 'Our Services',
                        subheadline: brief.services?.[0]?.description?.substring(0, 80) || '',
                        primaryCta: 'Learn More',
                        primaryCtaLink: '/#features',
                        backgroundImage: '',
                    }
                ];
                [0, 1].forEach(i => {
                    slots.push({
                        path: `${heroKey}.slides.${i}.backgroundImage`,
                        componentType: heroKey,
                        context: data[heroKey].slides[i].headline || brief.tagline || brief.businessName,
                        aspectRatio: '16:9',
                    });
                });
            }
        }
    }

    // ── HeroGallery slides ─────────────────────────────────────────────────
    if (componentOrder.includes('heroGallery')) {
        if (data.heroGallery?.slides && Array.isArray(data.heroGallery.slides)) {
            data.heroGallery.slides.slice(0, 2).forEach((slide: any, i: number) => {
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
            { backgroundImage: '', headline: brief.services?.[0]?.name || 'Our Services', subheadline: brief.services?.[0]?.description?.substring(0, 80) || '', primaryCta: 'Learn More', primaryCtaLink: '/#features' }
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
            data.features.items.slice(0, 4).forEach((item: any, i: number) => {
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

    // ── Menu items ─────────────────────────────────────────────────────────
    if (componentOrder.includes('menu') && data.menu?.items && Array.isArray(data.menu.items)) {
        data.menu.items.slice(0, 6).forEach((item: any, i: number) => {
            if (!item.imageUrl) {
                slots.push({
                    path: `menu.items.${i}.imageUrl`,
                    componentType: 'menu',
                    context: item.name || item.description || `Menu item ${i + 1}`,
                    aspectRatio: '4:3',
                });
            }
        });
    }

    // ── Portfolio items ─────────────────────────────────────────────────────
    for (const portfolioKey of ['portfolio', 'portfolioNeon', 'portfolioLumina']) {
        if (componentOrder.includes(portfolioKey) && data[portfolioKey]) {
            const items = data[portfolioKey].items || data[portfolioKey].projects; // support both keys
            if (Array.isArray(items)) {
                items.slice(0, 3).forEach((item: any, i: number) => {
                    if (!item.imageUrl) {
                        const pathKey = data[portfolioKey].projects ? 'projects' : 'items';
                        slots.push({
                            path: `${portfolioKey}.${pathKey}.${i}.imageUrl`,
                            componentType: portfolioKey,
                            context: item.title || item.description || item.category || `Portfolio image ${i + 1}`,
                            aspectRatio: '4:3',
                        });
                    }
                });
            }
        }
    }

    // ── Team items ─────────────────────────────────────────────────────────
    if (componentOrder.includes('team') && data.team?.items && Array.isArray(data.team.items)) {
        data.team.items.slice(0, 3).forEach((item: any, i: number) => {
            if (!item.imageUrl) {
                slots.push({
                    path: `team.items.${i}.imageUrl`,
                    componentType: 'team',
                    context: `${item.name || 'Team member'} - ${item.role || 'Professional'}`,
                    aspectRatio: '1:1',
                });
            }
        });
    }

    // ── Testimonials items ─────────────────────────────────────────────────
    for (const testmKey of ['testimonials', 'testimonialsNeon', 'testimonialsLumina']) {
        if (componentOrder.includes(testmKey) && data[testmKey]) {
            const items = data[testmKey].items || data[testmKey].testimonials; // support both keys
            if (Array.isArray(items)) {
                items.slice(0, 3).forEach((item: any, i: number) => {
                    if (item.imageUrl === "" || !item.imageUrl) { // only if intentionally empty or missing
                        const pathKey = data[testmKey].testimonials ? 'testimonials' : 'items';
                        slots.push({
                            path: `${testmKey}.${pathKey}.${i}.imageUrl`,
                            componentType: testmKey,
                            context: `${item.name || item.author || item.authorName || 'Customer'} - ${item.role || item.authorRole || 'Client'}`,
                            aspectRatio: '1:1',
                        });
                    }
                });
            }
        }
    }

    // ── Slideshow items ────────────────────────────────────────────────────
    if (componentOrder.includes('slideshow') && data.slideshow?.items && Array.isArray(data.slideshow.items)) {
        data.slideshow.items.slice(0, 3).forEach((item: any, i: number) => {
            if (!item.imageUrl) {
                slots.push({
                    path: `slideshow.items.${i}.imageUrl`,
                    componentType: 'slideshow',
                    context: item.altText || item.caption || `Slideshow image ${i + 1}`,
                    aspectRatio: '16:9',
                });
            }
        });
    }

    return slots;
}

// ═════════════════════════════════════════════════════════════════════════════
// SMART IMAGE PROMPT — Context-aware prompt generation from component data
// ═════════════════════════════════════════════════════════════════════════════

function buildImageArtDirection(brief: BusinessBrief, slot: ImageSlot): string {
    const industry = normalizeDesignIndustry(brief);
    const baseByIndustry: Record<string, string> = {
        restaurant: 'warm hospitality, plated details, real ambience, appetizing composition, natural human scale',
        'real-estate': 'premium architectural photography, clean lines, spacious composition, trustworthy upscale atmosphere',
        technology: 'high-end product/editorial tech visual, precise lighting, modern materials, subtle futuristic cues',
        creative: 'editorial art direction, expressive composition, distinctive cultural or creative details, gallery-quality framing',
        services: 'credible service-business photography, real environment, clear human problem-solution moment, polished but not generic',
        ecommerce: 'premium lifestyle/product photography, tactile details, clean commercial composition',
    };
    const componentDirection: Record<string, string> = {
        hero: 'hero image with one dominant focal subject and strong negative space for text overlay',
        heroSplit: 'split-layout side image with subject facing toward the text area and clean crop edges',
        heroGallery: 'immersive gallery slide with a different scene angle from other slides, cinematic but believable',
        heroWave: 'wide atmospheric background with motion and depth, suitable behind graphic wave treatments',
        heroNova: 'editorial hero background with bold composition and visual identity, not generic stock',
        heroLead: 'trust-building lead-generation hero with approachable professional context and space for form UI',
        features: 'specific visual proof of the benefit, detail-oriented and immediately understandable',
        portfolio: 'finished work or real result, composed like a case-study image',
        slideshow: 'atmospheric story image that adds variety from the hero image',
        team: 'natural professional portrait, warm expression, authentic local context',
        testimonials: 'customer portrait style, candid and credible, clean background',
        banner: 'wide campaign image with clear depth and enough empty space for text overlay',
        cta: 'ambient conversion background, subtle and text-safe',
    };

    return [
        baseByIndustry[industry] || baseByIndustry.services,
        componentDirection[slot.componentType] || 'purposeful website image with clear subject and premium composition',
    ].join('; ');
}

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
        cta: `A conversion-focused section visual only when the CTA component explicitly supports an image. Avoid decorative blur-only backgrounds; prefer solid colors and gradient controls for ambient depth.`,
        banner: `A stunning ultra-wide panoramic background image. Cinematic composition, atmospheric depth, dramatic lighting.`,
    };

    const typeInstruction = typeInstructions[slot.componentType] || 'A professional, high-quality image.';
    const artDirection = buildImageArtDirection(brief, slot);

    // Reference image context — user-specified instructions for how to apply reference images
    const refContext = brief.referenceImageContext
        ? `\n\nREFERENCE IMAGE GUIDANCE (from user):\n${brief.referenceImageContext}\nUse the provided reference images as visual guidance following the user's instructions above.`
        : '';

    return `Ultra-realistic editorial commercial photography for a ${brief.industry} business called "${brief.businessName}" located in ${locationStr}.

COMPONENT: ${slot.componentType}
CONTEXT: ${slot.context}
PURPOSE: ${typeInstruction}
ART DIRECTION: ${artDirection}${refContext}

REQUIREMENTS:
- LENS & CAMERA: Shot on a high-end full-frame camera (Sony A7R V or Canon R5) with premium prime lenses (35mm or 50mm).
- LIGHTING: Cinematic, natural lighting. Use golden-hour sunlight, soft diffused studio light, or moody atmospheric lighting depending on the subject.
- DEPTH: Masterful use of depth of field. Creamy bokeh (f/1.4-f/2.8) to isolate subjects where appropriate.
- GEOGRAPHIC COHERENCE: The scene MUST feel authentically grounded in ${locationStr}. Strictly respect local architecture styles, endemic vegetation, realistic weather, and local demographics. If in a specific city/country, the environment must unmistakably reflect it.
- BRAND COLOR INTEGRATION: The image's color palette MUST strictly harmonize with the brand. Subtly but clearly incorporate the brand colors (Primary: ${brief.colorPalette.primary}, Accent: ${brief.colorPalette.accent}) into the scene through props, wardrobe, lighting gels, or background elements. Do not just overlay color; integrate it naturally into the scene.
- DESIGN USE: The image must be useful inside a responsive website component, with a clear focal point, crop-safe edges, and intentional negative space when used as a background.
- AVOID: generic stock-photo poses, random objects unrelated to the business, busy collages, fake signage, duplicated people, distorted hands, and images that rely on text to communicate.
- QUALITY: Ultra high-resolution 8k, flawless photorealism, no noise, no AI artifacts. Professional, premium, aspirational mood.
- STRICT RULE: NO text, words, letters, watermarks, or logos of any kind should appear in the image. The image must be completely textless, UNLESS it is explicitly a UI (User Interface) being presented.
- COMPOSITION: Professional composition using rule of thirds, leading lines, or perfect centered symmetry.
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
    const EXCLUDED_COMPONENTS: string[] = []; // Removed exclusions to allow portfolio, team, slideshow

    // Default to a rich set of components if suggestedComponents is somehow empty
    const baseComponents = (brief.suggestedComponents && brief.suggestedComponents.length > 0)
        ? brief.suggestedComponents
        : ['hero', 'services', 'features', 'testimonials', 'faq', 'cta', 'footer'];

    let filteredComponents = baseComponents.filter(c =>
        !EXCLUDED_COMPONENTS.includes(c) &&
        !isRetiredDesignSuiteSection(c)
    );
    
    // Ensure at least one hero variant is always present
    const hasAnyHero = filteredComponents.some(c => c.startsWith('hero'));
    if (!hasAnyHero) {
        filteredComponents.unshift('hero');
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


    const solidHeaderStyles = 'sticky-solid|edge-solid|edge-bordered';

    componentExamples += `
    "header": {
      "style": "[SELECT ONE. Options: ${solidHeaderStyles}]",
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
        "buttonText": "[GENERATE HEX COLOR that strongly contrasts with buttonBackground]"
      },
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
      "featuresVariant": "[SELECT: classic|modern|bento-premium|bento-overlay|image-overlay|editorial-mosaic]",
      "gridColumns": "[IF featuresVariant IS 'image-overlay' OR 'editorial-mosaic' THEN select 4 ELSE select 2 or 3]",
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
      "menuVariant": "[SELECT: classic|modern-grid|elegant-list|full-image|editorial-mosaic]",
      "categories": ["${isSpanish ? 'Entradas' : 'Starters'}", "${isSpanish ? 'Platos Principales' : 'Main Courses'}", "${isSpanish ? 'Postres' : 'Desserts'}"],
      "items": [
        {"name": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "price": "$...", "category": "[GENERATE_TEXT]", "imageUrl": ""},
        {"name": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "price": "$...", "category": "[GENERATE_TEXT]", "imageUrl": ""},
        {"name": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "price": "$...", "category": "[GENERATE_TEXT]", "imageUrl": ""},
        {"name": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "price": "$...", "category": "[GENERATE_TEXT]", "imageUrl": ""},
        {"name": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "price": "$...", "category": "[GENERATE_TEXT]", "imageUrl": ""},
        {"name": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "price": "$...", "category": "[GENERATE_TEXT]", "imageUrl": ""}
      ]
    },`;
    }

    if (filteredComponents.includes('restaurantReservation')) {
        componentExamples += `
    "restaurantReservation": {
      "title": "${isSpanish ? 'Reserva tu mesa' : 'Reserve Your Table'}",
      "subtitle": "${isSpanish ? 'Experiencia gastronómica' : 'Dining Experience'}",
      "description": "[GENERATE_TEXT]",
      "buttonText": "${isSpanish ? 'Confirmar Reserva' : 'Confirm Reservation'}",
      "successMessage": "${isSpanish ? 'Tu solicitud de reserva fue recibida.' : 'Your reservation request was received.'}",
      "showPhone": true,
      "showNotes": true,
      "showTablePreference": true,
      "minPartySize": 1,
      "maxPartySize": 12,
      "paddingY": "lg",
      "paddingX": "md",
      "titleFontSize": "lg",
      "descriptionFontSize": "md",
      "borderRadius": "xl",
      "buttonBorderRadius": "xl",
      "backgroundImageUrl": "",
      "colors": {"background": "${brief.colorPalette.background}", "heading": "${brief.colorPalette.text}", "description": "${brief.colorPalette.text}cc", "text": "${brief.colorPalette.text}", "accent": "${brief.colorPalette.accent}", "cardBackground": "${brief.colorPalette.surface}", "inputBackground": "${brief.colorPalette.background}", "inputText": "${brief.colorPalette.text}", "inputBorder": "${brief.colorPalette.surface}", "buttonBackground": "${brief.colorPalette.primary}", "buttonText": "#ffffff"}
    },`;
    }

    const hasEcommerceComponents = filteredComponents.some(c => [
        'announcementBar', 'productHero', 'featuredProducts', 'categoryGrid', 'trustBadges',
        'saleCountdown', 'collectionBanner', 'recentlyViewed', 'productReviews', 'productBundle',
    ].includes(c));
    const saleEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    if (hasEcommerceComponents) {
        componentExamples += `
    "announcementBar": {"variant": "static", "messages": [{"text": "[GENERATE_TEXT]", "linkText": "${isSpanish ? 'Comprar ahora' : 'Shop now'}", "link": "/tienda"}, {"text": "[GENERATE_TEXT]", "linkText": "${isSpanish ? 'Ver productos' : 'View products'}", "link": "/tienda"}], "paddingY": "sm", "paddingX": "md", "fontSize": "sm", "height": 40, "showIcon": true, "icon": "megaphone", "dismissible": false, "colors": {"background": "${brief.colorPalette.primary}", "text": "#ffffff", "linkColor": "#ffffff", "iconColor": "#ffffff", "borderColor": "transparent"}},
    "productHero": {"variant": "featured", "layout": "full", "headline": "[GENERATE_TEXT]", "subheadline": "[GENERATE_TEXT]", "buttonText": "${isSpanish ? 'Explorar productos' : 'Explore products'}", "buttonUrl": "/tienda", "backgroundImageUrl": "", "height": 520, "overlayStyle": "gradient", "overlayOpacity": 55, "textAlignment": "left", "contentPosition": "left", "showBadge": true, "badgeText": "${isSpanish ? 'Nuevo' : 'New'}", "buttonBorderRadius": "xl", "showAddToCartButton": true, "colors": {"background": "${brief.colorPalette.background}", "overlayColor": "#000000", "heading": "#ffffff", "text": "#ffffff", "buttonBackground": "${brief.colorPalette.primary}", "buttonText": "#ffffff", "badgeBackground": "${brief.colorPalette.accent}", "badgeText": "#ffffff", "addToCartBackground": "${brief.colorPalette.secondary}", "addToCartText": "#ffffff"}},
    "featuredProducts": {"variant": "carousel", "title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "sourceType": "newest", "columns": 4, "productsToShow": 8, "autoScroll": true, "showArrows": true, "showDots": true, "showBadge": true, "showPrice": true, "showRating": true, "showAddToCart": true, "showViewAll": true, "viewAllUrl": "/tienda", "cardStyle": "modern", "colors": {"background": "${brief.colorPalette.background}", "heading": "${brief.colorPalette.text}", "text": "${brief.colorPalette.text}cc", "accent": "${brief.colorPalette.primary}", "cardBackground": "${brief.colorPalette.surface}", "cardText": "${brief.colorPalette.text}", "buttonBackground": "${brief.colorPalette.primary}", "buttonText": "#ffffff"}},
    "categoryGrid": {"variant": "cards", "title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "columns": 4, "showProductCount": true, "imageAspectRatio": "1:1", "borderRadius": "xl", "categories": [], "colors": {"background": "${brief.colorPalette.background}", "heading": "${brief.colorPalette.text}", "text": "${brief.colorPalette.text}cc", "accent": "${brief.colorPalette.primary}", "cardBackground": "${brief.colorPalette.surface}", "cardText": "${brief.colorPalette.text}"}},
    "trustBadges": {"variant": "horizontal", "title": "[GENERATE_TEXT]", "showLabels": true, "badges": [{"icon": "truck", "title": "${isSpanish ? 'Envío rápido' : 'Fast Shipping'}", "description": "[GENERATE_TEXT]"}, {"icon": "shield", "title": "${isSpanish ? 'Pago seguro' : 'Secure Payment'}", "description": "[GENERATE_TEXT]"}, {"icon": "refresh-cw", "title": "${isSpanish ? 'Cambios fáciles' : 'Easy Returns'}", "description": "[GENERATE_TEXT]"}], "colors": {"background": "${brief.colorPalette.surface}", "heading": "${brief.colorPalette.text}", "text": "${brief.colorPalette.text}cc", "iconColor": "${brief.colorPalette.primary}", "borderColor": "${brief.colorPalette.surface}"}},
    "saleCountdown": {"variant": "banner", "title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "endDate": "${saleEndDate}", "discountText": "${isSpanish ? 'Hasta 50% OFF' : 'Up to 50% OFF'}", "showDays": true, "showHours": true, "showMinutes": true, "showSeconds": true, "colors": {"background": "${brief.colorPalette.surface}", "heading": "${brief.colorPalette.text}", "text": "${brief.colorPalette.text}cc", "accent": "${brief.colorPalette.accent}", "buttonBackground": "${brief.colorPalette.accent}", "buttonText": "#ffffff"}},
    "collectionBanner": {"variant": "hero", "title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "backgroundImageUrl": "", "buttonText": "${isSpanish ? 'Ver colección' : 'View collection'}", "buttonUrl": "/tienda", "height": 420, "overlayStyle": "gradient", "overlayOpacity": 50, "textAlignment": "center", "contentPosition": "center", "showButton": true, "colors": {"background": "${brief.colorPalette.background}", "overlayColor": "#000000", "heading": "#ffffff", "text": "#ffffff", "buttonBackground": "${brief.colorPalette.primary}", "buttonText": "#ffffff"}},
    "recentlyViewed": {"variant": "carousel", "title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "maxProducts": 10, "columns": 5, "showArrows": true, "showPrice": true, "cardStyle": "minimal", "colors": {"background": "${brief.colorPalette.background}", "heading": "${brief.colorPalette.text}", "text": "${brief.colorPalette.text}cc", "accent": "${brief.colorPalette.primary}", "cardBackground": "${brief.colorPalette.surface}", "cardText": "${brief.colorPalette.text}"}},
    "productReviews": {"variant": "cards", "title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "showRatingDistribution": true, "showPhotos": true, "showVerifiedBadge": true, "maxReviews": 6, "colors": {"background": "${brief.colorPalette.background}", "heading": "${brief.colorPalette.text}", "text": "${brief.colorPalette.text}cc", "accent": "${brief.colorPalette.primary}", "cardBackground": "${brief.colorPalette.surface}", "cardText": "${brief.colorPalette.text}", "starColor": "#fbbf24", "verifiedBadgeColor": "#10b981"}},
    "productBundle": {"variant": "horizontal", "title": "[GENERATE_TEXT]", "description": "[GENERATE_TEXT]", "discountPercent": 15, "showSavings": true, "savingsText": "${isSpanish ? 'Ahorra' : 'Save'}", "buttonText": "${isSpanish ? 'Agregar bundle' : 'Add bundle'}", "showBadge": true, "badgeText": "${isSpanish ? 'Mejor valor' : 'Best value'}", "colors": {"background": "${brief.colorPalette.surface}", "heading": "${brief.colorPalette.text}", "text": "${brief.colorPalette.text}cc", "accent": "${brief.colorPalette.primary}", "cardBackground": "${brief.colorPalette.background}", "cardText": "${brief.colorPalette.text}", "priceColor": "${brief.colorPalette.text}", "savingsColor": "#10b981", "buttonBackground": "${brief.colorPalette.primary}", "buttonText": "#ffffff"}},`;
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
    "${testimonialsKey}": {"testimonialsVariant": "[SELECT: classic|minimal-cards|glassmorphism|gradient-glow|neon-border|floating-cards|gradient-shift|editorial-mosaic]", "title": "[GENERATE_TEXT]", "cornerGradient": {"enabled": true, "position": "[SELECT: none|top-left|top-right|bottom-left|bottom-right]", "color": "${brief.colorPalette.secondary}", "opacity": 10, "size": 40}, "items": [{"quote": "[GENERATE_TEXT]", "name": "[GENERATE_TEXT]", "title": "[GENERATE_TEXT]", "imageUrl": ""}, {"quote": "[GENERATE_TEXT]", "name": "[GENERATE_TEXT]", "title": "[GENERATE_TEXT]", "imageUrl": ""}, {"quote": "[GENERATE_TEXT]", "name": "[GENERATE_TEXT]", "title": "[GENERATE_TEXT]", "imageUrl": ""}]},`;
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
    "realEstateListings": {"title": "${isSpanish ? 'Propiedades destacadas' : 'Featured properties'}", "subtitle": "[GENERATE_TEXT]", "buttonText": "${isSpanish ? 'Ver detalles' : 'View details'}", "buttonLink": "#leads", "directoryRoute": "/listados", "detailRoutePattern": "/listados/:slug", "leadCtaText": "${isSpanish ? 'Solicitar información' : 'Request information'}", "showingRequestCtaText": "${isSpanish ? 'Solicitar showing' : 'Request a showing'}", "emptyStateButtonText": "${isSpanish ? 'Solicitar información' : 'Request information'}", "maxItems": 6, "featuredOnly": false, "showPrice": true, "showLocation": true, "showStats": true, "showDescription": true, "colors": {"background": "${brief.colorPalette.background}", "heading": "${brief.colorPalette.text}", "text": "${brief.colorPalette.text}", "textMuted": "${brief.colorPalette.text}99", "accent": "${brief.colorPalette.primary}", "cardBackground": "${brief.colorPalette.surface}", "border": "${brief.colorPalette.surface}", "buttonBackground": "${brief.colorPalette.primary}", "buttonText": "#ffffff"}},
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

COLOR SYSTEM LOCK:
The color palette above was produced by Quimera Color Expert using the 60-30-10 proportion rule (60% dominant neutrals on background/surface, 30% brand colors on primary/secondary, 10% accent pop). Use these exact color roles as semantic tokens.
Do not invent new brand hex colors, do not replace theme.globalColors, and do not make accessibility decisions with new colors.
If a component needs button text, badge text, overlays, cards, or ecommerce colors, derive them from the provided semantic roles.

CHROME AND IMAGE TEXT RULES:
- Use no more than three non-neutral brand colors total: primary, secondary, and accent. Background, surface, and text are neutral roles.
- Header and footer MUST use the same solid dark brand color and white (#ffffff) typography. Never use white, off-white, pale, transparent, glass, or gradient backgrounds for header/footer.
- Header style MUST be one of: sticky-solid, edge-solid, edge-bordered.
- Any text placed directly over an image MUST be white (#ffffff) with a dark overlay/scrim strong enough for WCAG AA contrast. If the text is inside an opaque solid panel/card over the image, the panel may use a semantic brand color with readable text.
- Menu cards using menuVariant "full-image" or "editorial-mosaic" place text over images: all price/title/description/category text over the image MUST be #ffffff, and the background gradient/scrim opacity MUST be strong enough for WCAG AA contrast.
- Never use generated images only as blurred/glass/decorative section backgrounds. Use the existing gradient controls instead: cornerGradient, gradientStart/gradientEnd, gradientColors, radial or multi-stop overlays when supported, plus solid semantic colors. Do not limit decorative backgrounds to linear gradients.
- Keep image-backed content for hero sections, banner, menu items, Realty/property components, product/collection heroes, portfolio, slideshow, team, and testimonial portraits.

COMPONENTS TO GENERATE: ${filteredComponents.join(', ')}

LANGUAGE: All content MUST be in ${lang}.

OUTPUT FORMAT: Return a single JSON object with this EXACT structure:
{
  "componentOrder": ["colors", "typography", "header", ${filteredComponents.filter(c => !['colors', 'typography', 'header', 'footer'].includes(c)).map(c => `"${c}"`).join(', ')}, "footer"],
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
1. For image-backed components (hero/heroGallery/heroWave/heroNova/heroLead/heroSplit, banner, menu, Realty/property components, product/collection heroes, features, portfolio, team, testimonials, slideshow), YOU MUST set imageUrl, backgroundImage, or backgroundImageUrl to an empty string "" so the image generator can fill it.
2. Include RICH, detailed, REAL content for EVERY component — no lorem ipsum, no placeholder text.
3. Each component's items array MUST have the correct number of items with full content. Features MUST have at least 4 items with photos. Portfolio, team, testimonials, services, and faq MUST have EXACTLY 3 items.
4. For topBar: messages MUST be promotional announcements or call-to-actions. NEVER put address or phone numbers here. Use only these icons: megaphone, tag, gift, truck, percent, sparkles, star, zap, heart, flame.
5. For heroGallery/heroNeon/heroNova/heroWave: generate EXACTLY 2 slides with real headlines and subheadlines. Each slide must have: headline, subheadline, primaryCta, primaryCtaLink, backgroundImage or imageUrl (empty string "").
6. For menu: generate at least 6 realistic menu items with real names, descriptions, prices, categories, and "imageUrl": "". Use a visual menuVariant: classic, modern-grid, elegant-list, full-image, or editorial-mosaic. Never use text-only.
7. For header links: the "href" values MUST point to the actual sections on the page using anchors (e.g. "/#services"). Only link to sections that exist in the componentOrder.
8. For features: generate AT LEAST 4 items and include "imageUrl": "" in each item. For portfolio, team, testimonials, and slideshow: generate EXACTLY 3 items and include "imageUrl": "" (or "backgroundImage": "") in each item.
9. For services: generate EXACTLY 3 items. Use the business's ACTUAL services from the brief (max 3). TEXT ONLY — no imageUrl.
10. For FAQ: generate EXACTLY 3 relevant questions and answers.
11. For leads: include proper form fields with labels and placeholders.
12. For footer: Include real contact info inside the 'contactInfo' object. 'linkColumns' is strictly for page navigation links like 'Inicio' or 'Servicios'.
13. For howItWorks: generate EXACTLY 3 steps with titles, descriptions, and valid lucide icons.
14. For properties marked with [SELECT: a|b|c...], you MUST intelligently choose exactly ONE of the provided options based on what best fits the industry's aesthetic. Do not output the brackets.
15. For header.style: choose ONLY a solid style from 'sticky-solid', 'edge-solid', or 'edge-bordered'. Do not use transparent, glass, floating, blur, or gradient header styles.
16. Header and footer colors must match exactly: same solid dark background, white text, white headings, and no light/white shell backgrounds.
17. Do not generate arbitrary new hex colors. Use the COLOR PALETTE values as semantic tokens; the application will apply validated component mappings after generation.
18. For map: use the COMPLETE address including street, city, state, and country. The address field must contain the full location string.
19. Do not set section-level backgroundImageUrl/imageUrl for decorative glass, blur, or ambient backgrounds outside the allowed image-backed components. Use the component's gradient controls instead: cornerGradient, gradientStart/gradientEnd, gradientColors, radial/multi-stop overlays where supported, and semantic colors.

RESPOND WITH ONLY VALID JSON. NO MARKDOWN, NO BACKTICKS, NO EXPLANATION.`;
}

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: Ensure all components have required fields filled
// ═════════════════════════════════════════════════════════════════════════════

function normalizeGeneratedText(value: any, fallback = ''): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value && typeof value === 'object') {
        return value.es || value.en || value.text || value.title || value.label || fallback;
    }
    return fallback;
}

function createDefaultSlideshowItems(brief: any, isSpanish: boolean): Array<{ imageUrl: string; altText: string; caption: string }> {
    const businessName = brief.businessName || (isSpanish ? 'Negocio' : 'Business');
    const services = Array.isArray(brief.services) ? brief.services : [];

    return [
        {
            imageUrl: '',
            altText: businessName,
            caption: brief.tagline || brief.description || businessName,
        },
        {
            imageUrl: '',
            altText: normalizeGeneratedText(services[0]?.name, isSpanish ? 'Servicio destacado' : 'Featured service'),
            caption: normalizeGeneratedText(services[0]?.description, isSpanish ? 'Una experiencia creada para tus clientes.' : 'An experience built for your customers.'),
        },
        {
            imageUrl: '',
            altText: normalizeGeneratedText(services[1]?.name, isSpanish ? 'Experiencia de marca' : 'Brand experience'),
            caption: normalizeGeneratedText(services[1]?.description, isSpanish ? 'Diseño, confianza y conversiones en una sola presencia digital.' : 'Design, trust, and conversion in one digital presence.'),
        },
    ];
}

function normalizeGeneratedSlideshowItems(items: any, brief: any, isSpanish: boolean): Array<{ imageUrl: string; altText: string; caption: string }> {
    let rawItems: any[] = [];

    if (Array.isArray(items)) {
        rawItems = items;
    } else if (items && typeof items === 'object') {
        const record = items as Record<string, any>;
        const hasSingleSlideShape = ['imageUrl', 'url', 'src', 'image', 'backgroundImage', 'altText', 'alt', 'caption', 'title']
            .some((key) => key in record);

        rawItems = hasSingleSlideShape
            ? [record]
            : Object.values(record).filter((item) => item && (typeof item === 'object' || typeof item === 'string'));
    } else if (typeof items === 'string') {
        rawItems = [items];
    }

    const normalized = rawItems.map((item, index) => {
        if (typeof item === 'string') {
            return {
                imageUrl: item,
                altText: `${brief.businessName || (isSpanish ? 'Imagen' : 'Image')} ${index + 1}`,
                caption: '',
            };
        }

        const imageUrl = item?.imageUrl || item?.url || item?.src || item?.image || item?.backgroundImage || '';
        const caption = normalizeGeneratedText(item?.caption || item?.description || item?.subtitle || item?.title, '');
        const altText = normalizeGeneratedText(
            item?.altText || item?.alt || item?.title || item?.caption,
            `${brief.businessName || (isSpanish ? 'Imagen' : 'Image')} ${index + 1}`,
        );

        return { ...item, imageUrl, altText, caption };
    });

    return normalized.length > 0 ? normalized : createDefaultSlideshowItems(brief, isSpanish);
}

function ensureComponentCompleteness(data: any, brief: any, isSpanish: boolean): void {
    if (!data || typeof data !== 'object') return;

    // Header defaults
    if (data.header && typeof data.header === 'object') {
        if (!data.header.logoText) data.header.logoText = brief.businessName || 'My Business';
        if (!data.header.logoType) data.header.logoType = 'text';
        if (!data.header.style) data.header.style = 'sticky-solid';
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
        const fallbackFeatures = [
            { title: isSpanish ? 'Calidad Premium' : 'Premium Quality', description: isSpanish ? 'Ofrecemos la más alta calidad en todos nuestros servicios.' : 'We offer the highest quality across all our services.', icon: 'Award', imageUrl: '' },
            { title: isSpanish ? 'Atención Personalizada' : 'Personalized Attention', description: isSpanish ? 'Cada cliente recibe un trato único y especial.' : 'Every client receives unique and special treatment.', icon: 'Heart', imageUrl: '' },
            { title: isSpanish ? 'Resultados Garantizados' : 'Guaranteed Results', description: isSpanish ? 'Nos comprometemos con resultados excepcionales.' : 'We commit to exceptional results.', icon: 'CheckCircle', imageUrl: '' },
            { title: isSpanish ? 'Innovación Constante' : 'Constant Innovation', description: isSpanish ? 'Siempre a la vanguardia con las últimas tendencias y tecnologías.' : 'Always at the forefront with the latest trends and technologies.', icon: 'Star', imageUrl: '' },
        ];
        while (data.features.items.length < 4) {
            data.features.items.push(fallbackFeatures[data.features.items.length]);
        }
        data.features.items.slice(0, 4).forEach((item: any, index: number) => {
            if (!Object.prototype.hasOwnProperty.call(item, 'imageUrl')) {
                item.imageUrl = '';
            }
            if (!item.icon) {
                item.icon = fallbackFeatures[index]?.icon || 'Star';
            }
        });
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

    // Slideshow defaults
    if (data.slideshow && typeof data.slideshow === 'object') {
        if (!data.slideshow.title) data.slideshow.title = isSpanish ? 'Galería' : 'Gallery';
        data.slideshow.items = normalizeGeneratedSlideshowItems(data.slideshow.items, brief, isSpanish);
        if (data.slideshow.showArrows === undefined) data.slideshow.showArrows = true;
        if (data.slideshow.showDots === undefined) data.slideshow.showDots = true;
        if (data.slideshow.showCaptions === undefined) data.slideshow.showCaptions = true;
        if (!data.slideshow.slideshowVariant) data.slideshow.slideshowVariant = 'classic';
        if (!data.slideshow.transitionEffect) data.slideshow.transitionEffect = 'slide';
        if (!data.slideshow.transitionDuration) data.slideshow.transitionDuration = 500;
        if (!data.slideshow.autoPlaySpeed) data.slideshow.autoPlaySpeed = 5000;
        if (!data.slideshow.colors || typeof data.slideshow.colors !== 'object') data.slideshow.colors = {};
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

    const headerFont = resolveFontFamily(theme.fontFamilyHeader || 'playfair-display');
    const bodyFont = resolveFontFamily(theme.fontFamilyBody || 'inter');
    const buttonFont = resolveFontFamily(theme.fontFamilyButton || bodyFont);
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
        'announcementBar', 'productHero', 'featuredProducts', 'categoryGrid',
        'trustBadges', 'saleCountdown', 'collectionBanner', 'recentlyViewed',
        'productReviews', 'productBundle', 'products', 'storeSettings',
        'productDetail', 'categoryProducts', 'productGrid', 'cart', 'checkout',
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

export default useAIWebsiteStudio;
