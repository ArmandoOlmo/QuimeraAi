/**
 * BioPageBuilder
 * Full-featured "Link in Bio" builder with 3-column layout
 * Integrated with Quimera's dashboard architecture
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { generateContentViaProxy, extractTextFromResponse } from '../../utils/geminiProxyClient';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Link2,
    ShoppingBag,
    Palette,
    BarChart3,
    Users,
    Plus,
    GripVertical,
    ExternalLink,
    Trash2,
    Image,
    Sparkles,
    Menu,
    Eye,
    EyeOff,
    MoreVertical,
    Copy,
    Share2,
    Settings,
    Type,
    Square,
    Circle,
    Loader2,
    Check,
    X,
    Search,
    ChevronRight,
    Lightbulb,
    Store,
    Heart,
    Play,
    Phone,
    Calendar,
    FileText,
    Grid,
    Layers,
    Tag,
    File,
    Music,
    Video,
    Instagram,
    Youtube,
    Twitter,
    Linkedin,
    MessageCircle,
    Mail,
    ShoppingCart,
    LucideIcon,
    // Additional icons for new integrations
    Facebook,
    Twitch,
    Rss,
    Star,
    Mic,
    Headphones,
    DollarSign,
    CreditCard,
    Send,
    Radio,
    Camera,
    AtSign,
    Globe,
    Edit3,
    Upload,
    Download,
    Wand2,
    User,
    PanelRightOpen,
    PanelRightClose,
    QrCode,
} from 'lucide-react';
import { useAuth } from '../../contexts/core/AuthContext';
import { useProject } from '../../contexts/project';
import { useAI } from '../../contexts/ai';
import { useUI } from '../../contexts/core/UIContext';
import { useSafeFiles } from '../../contexts/files';
import { useRouter } from '../../hooks/useRouter';
import { useBioPage, type BioLink as ContextBioLink, type BioProfile as ContextBioProfile, type BioTheme as ContextBioTheme, type BioProduct as ContextBioProduct } from '../../contexts/bioPage';
import { useSafeUndo } from '../../contexts/undo';
import { ROUTES } from '../../routes/config';
import DashboardSidebar from './DashboardSidebar';
import HeaderBackButton from '../ui/HeaderBackButton';
import ImagePicker from '../ui/ImagePicker';
import ColorControl from '../ui/ColorControl';
import ChatCore from '../chat/ChatCore';
import { buildChatbotEngineSurfaceContext } from '../../utils/chatbotEngine/surfaceContext';
import { hexToRgba } from '../../utils/colorUtils';
import { useServiceAvailability } from '../../hooks/useServiceAvailability';
import AppSelect from '../ui/AppSelect';
import { CollapsibleSection, CollapsiblePanelHeader, useCollapsibleSections } from '../ui/CollapsibleSection';
import { supabase } from '../../supabase';
import {
    generateBioPageQrCode,
    buildBioPageTrackedUrl,
    filterBioPageProductsForBlock,
    getBioPageAnalytics,
    getBioPageIntegrationReadiness,
    getBioPageEligibleStorefrontProducts,
    isBioSlugAvailable,
    mapStorefrontProductToBioPageProduct,
    normalizeBioSlug,
    sanitizeBioMediaUrl,
    validateBioSlug,
    type BioPageAnalyticsSummary,
    type BioPageBlock,
    type BioPageBlockType,
    type BioPageIntegrationReadiness,
} from '../../services/bioPage';
import { loadPublicStorefrontCatalog, type PublicStorefrontCategory } from '../../utils/ecommerce/publicStorefrontCatalog';
import type { PlatformServiceId } from '../../types/serviceAvailability';

// =============================================================================
// TYPES
// =============================================================================

type LinkType = 'link' | 'external' | 'internal' | 'collection' | 'product' | 'form' | 'lead_form' | 'email_subscribe' | 'social' | 'embed' | 'video' | 'file' | 'booking' | 'chatbot';
type LinkCategory = 'suggested' | 'commerce' | 'social' | 'media' | 'contact' | 'events' | 'text' | 'all';

const BIO_SOURCE_MODULE_SERVICE_MAP: Partial<Record<string, PlatformServiceId>> = {
    ecommerce: 'ecommerce',
    appointments: 'appointments',
    crm: 'crm',
    'email-marketing': 'emailMarketing',
    chatcore: 'chatbot',
    'media-ai': 'aiFeatures',
};

const BIO_BLOCK_TYPE_SERVICE_MAP: Partial<Record<BioPageBlockType, PlatformServiceId>> = {
    product_grid: 'ecommerce',
    product_collection: 'ecommerce',
    booking: 'appointments',
    lead_form: 'crm',
    email_subscribe: 'emailMarketing',
    testimonials: 'crm',
    contact: 'crm',
    chatbot_cta: 'chatbot',
    featured_media: 'aiFeatures',
    media_grid: 'aiFeatures',
    portfolio_grid: 'aiFeatures',
};

const BIO_LINK_TYPE_SERVICE_MAP: Partial<Record<LinkType, PlatformServiceId>> = {
    collection: 'ecommerce',
    product: 'ecommerce',
    booking: 'appointments',
    lead_form: 'crm',
    email_subscribe: 'emailMarketing',
    chatbot: 'chatbot',
};

const BIO_LINK_PLATFORM_SERVICE_MAP: Partial<Record<string, PlatformServiceId>> = {
    chatbot: 'chatbot',
    calendar: 'appointments',
    'email-signup': 'emailMarketing',
};

const BIO_INTEGRATION_SERVICE_MAP: Partial<Record<string, PlatformServiceId>> = {
    chatbot: 'chatbot',
    calendar: 'appointments',
    'email-signup': 'emailMarketing',
};

const resolveBioSourceServiceId = (sourceModule?: string | null): PlatformServiceId | null => (
    sourceModule ? BIO_SOURCE_MODULE_SERVICE_MAP[sourceModule] || null : null
);

interface BioLink {
    id: string;
    title: string;
    url: string;
    enabled: boolean;
    thumbnail?: string;
    clicks: number;
    linkType: LinkType;
    platform?: string; // e.g., 'instagram', 'tiktok', 'youtube'
    icon?: string;
    needsReview?: boolean;
    generatedByAI?: boolean;
    userModified?: boolean;
    lockedFromRegeneration?: boolean;
}

interface BioProfile {
    name: string;
    bio: string;
    avatar?: string;
}

// Local type aliases using context types
type BioTheme = ContextBioTheme;

interface BioProduct {
    id: string;
    title: string;
    price: number;
    image?: string;
    url: string;
}

interface BioProductOption extends ContextBioProduct {
    slug?: string;
    status?: string;
}

type BioCategoryOption = PublicStorefrontCategory;

interface BioAudienceOption {
    id: string;
    name: string;
    description?: string;
    estimatedCount: number;
    isDefault: boolean;
}

interface BioMediaAssetOption {
    id: string;
    name: string;
    url: string;
    type?: string;
    storagePath?: string;
    source: 'files';
}

type ActiveTab = 'links' | 'blocks' | 'design' | 'shop' | 'analytics' | 'audience' | 'settings' | 'share';
type DesignSubTab = 'header' | 'theme' | 'wallpaper' | 'text' | 'buttons' | 'color';
type AnalyticsRange = '7d' | '30d' | '90d' | 'all';
type SlugAvailabilityState = {
    status: 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid' | 'error';
    slug: string;
    message?: string;
};

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_LINKS: BioLink[] = [
    { id: '1', title: 'Visit My Website', url: 'https://example.com', enabled: true, clicks: 1234, linkType: 'link' },
    { id: '2', title: 'Shop My Store', url: 'https://shop.example.com', enabled: true, clicks: 567, linkType: 'link' },
    { id: '3', title: 'Follow on Instagram', url: 'https://instagram.com/example', enabled: true, clicks: 890, linkType: 'social', platform: 'instagram' },
    { id: '4', title: 'Subscribe to Newsletter', url: 'https://newsletter.example.com', enabled: false, clicks: 234, linkType: 'link' },
];

// Link Categories for sidebar
const LINK_CATEGORIES: { id: LinkCategory; icon: any; label: string }[] = [
    { id: 'suggested', icon: Lightbulb, label: 'Suggested' },
    { id: 'commerce', icon: Store, label: 'Commerce' },
    { id: 'social', icon: Heart, label: 'Social' },
    { id: 'media', icon: Play, label: 'Media' },
    { id: 'contact', icon: Phone, label: 'Contact' },
    { id: 'events', icon: Calendar, label: 'Events' },
    { id: 'text', icon: FileText, label: 'Text' },
    { id: 'all', icon: Grid, label: 'View all' },
];


// Social/Media Integrations
interface Integration {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    category: LinkCategory;
    platform: string;
    color: string;
    linkType?: LinkType;
}

const INTEGRATIONS: Integration[] = [
    // AI Assistant
    { id: 'chatbot', name: 'AI Chatbot', description: 'Let visitors chat with your AI assistant', icon: MessageCircle, category: 'contact', platform: 'chatbot', color: '#10B981', linkType: 'chatbot' },

    // Social
    { id: 'instagram', name: 'Instagram', description: 'Display your posts and reels', icon: Instagram, category: 'social', platform: 'instagram', color: '#E4405F' },
    { id: 'tiktok', name: 'TikTok', description: 'Share your TikToks directly', icon: Music, category: 'social', platform: 'tiktok', color: '#000000' },
    { id: 'tiktok-profile', name: 'TikTok Profile', description: 'Share TikTok profiles with your audience', icon: Music, category: 'social', platform: 'tiktok-profile', color: '#FF0050' },
    { id: 'twitter', name: 'X', description: 'Select your own or favorite posts to display', icon: Twitter, category: 'social', platform: 'twitter', color: '#000000' },
    { id: 'threads', name: 'Threads', description: 'Driving your audience to follow you on Threads', icon: AtSign, category: 'social', platform: 'threads', color: '#000000' },
    { id: 'facebook', name: 'Facebook', description: 'Connect with your Facebook page', icon: Facebook, category: 'social', platform: 'facebook', color: '#1877F2' },
    { id: 'linkedin', name: 'LinkedIn', description: 'Connect professionally', icon: Linkedin, category: 'social', platform: 'linkedin', color: '#0A66C2' },
    { id: 'snapchat', name: 'Snapchat', description: 'Create content and grow your audience', icon: Camera, category: 'social', platform: 'snapchat', color: '#FFFC00' },
    { id: 'pinterest', name: 'Pinterest', description: 'Share what you love on Pinterest', icon: Heart, category: 'social', platform: 'pinterest', color: '#E60023' },
    { id: 'twitch', name: 'Twitch', description: 'Show your live stream and let visitors chat', icon: Twitch, category: 'social', platform: 'twitch', color: '#9146FF' },
    { id: 'reddit', name: 'Reddit', description: 'Add a preview of your Reddit profile', icon: MessageCircle, category: 'social', platform: 'reddit', color: '#FF4500' },
    { id: 'discord', name: 'Discord', description: 'Invite your audience to your server', icon: MessageCircle, category: 'social', platform: 'discord', color: '#5865F2' },
    { id: 'telegram', name: 'Telegram', description: 'Direct link to your Telegram', icon: Send, category: 'contact', platform: 'telegram', color: '#0088CC' },

    // Media - Video
    { id: 'video', name: 'Video', description: 'Visitors don\'t need to leave to watch videos', icon: Video, category: 'media', platform: 'video', color: '#FF6B00' },
    { id: 'youtube', name: 'YouTube', description: 'Show any YouTube video right on your page', icon: Youtube, category: 'media', platform: 'youtube', color: '#FF0000' },
    { id: 'tiktok-video', name: 'TikTok Video', description: 'Highlight one of your TikToks', icon: Music, category: 'media', platform: 'tiktok-video', color: '#000000' },
    { id: 'vimeo', name: 'Vimeo', description: 'Share Vimeo videos with your visitors', icon: Play, category: 'media', platform: 'vimeo', color: '#1AB7EA' },

    // Media - Audio
    { id: 'music', name: 'Music', description: 'Connect fans with your music in one place', icon: Headphones, category: 'media', platform: 'music', color: '#8B5CF6' },
    { id: 'spotify', name: 'Spotify', description: 'Share your latest or favorite music', icon: Headphones, category: 'media', platform: 'spotify', color: '#1DB954' },
    { id: 'apple-music', name: 'Apple Music', description: 'Show your fans what\'s new on Apple Music', icon: Music, category: 'media', platform: 'apple-music', color: '#FC3C44' },
    { id: 'soundcloud', name: 'SoundCloud', description: 'Share your tracks on SoundCloud', icon: Radio, category: 'media', platform: 'soundcloud', color: '#FF5500' },
    { id: 'podcast', name: 'Podcasts', description: 'Get more podcast listeners and subscribers', icon: Mic, category: 'media', platform: 'podcast', color: '#8940FA' },

    // Media - Document
    { id: 'pdf', name: 'PDF Display', description: 'From food menus to event invitations', icon: FileText, category: 'media', platform: 'pdf', color: '#FF3E4C' },
    { id: 'rss', name: 'RSS Feed', description: 'Share RSS feeds with your audience', icon: Rss, category: 'media', platform: 'rss', color: '#FFA500' },
    { id: 'file', name: 'File downloads', description: 'Upload files to sell on your page', icon: File, category: 'media', platform: 'file', color: '#FF6B35' },


    // Contact - Forms
    { id: 'form', name: 'Form', description: 'Visitors can send you their contact details', icon: FileText, category: 'contact', platform: 'form', color: '#6366F1' },
    { id: 'contact-form', name: 'Contact Form', description: 'Collect info with a customized form', icon: Mail, category: 'contact', platform: 'contact-form', color: '#3B82F6' },
    { id: 'email-signup', name: 'Email signup', description: 'Collect emails for a direct line to your audience', icon: Mail, category: 'contact', platform: 'email-signup', color: '#8B5CF6' },
    { id: 'sms-signup', name: 'SMS signup', description: 'Collect phone numbers to connect with followers', icon: MessageCircle, category: 'contact', platform: 'sms-signup', color: '#EC4899' },
    { id: 'typeform', name: 'Typeform', description: 'Create forms, surveys, and quizzes', icon: FileText, category: 'contact', platform: 'typeform', color: '#262627' },
    { id: 'laylo', name: 'Laylo', description: 'Build your fan list and reward your audience', icon: Users, category: 'contact', platform: 'laylo', color: '#6366F1' },

    // Contact - Direct
    { id: 'whatsapp', name: 'WhatsApp', description: 'Direct messaging link', icon: MessageCircle, category: 'contact', platform: 'whatsapp', color: '#25D366' },
    { id: 'email', name: 'Email', description: 'Email contact link', icon: Mail, category: 'contact', platform: 'email', color: '#EA4335' },
    { id: 'phone', name: 'Phone', description: 'Click-to-call link', icon: Phone, category: 'contact', platform: 'phone', color: '#34A853' },

    // Events
    { id: 'calendar', name: 'Calendar', description: 'Book appointments', icon: Calendar, category: 'events', platform: 'calendar', color: '#4285F4' },
    { id: 'cameo', name: 'Cameo', description: 'Help fans celebrate special moments', icon: Video, category: 'events', platform: 'cameo', color: '#7C3AED' },
    { id: 'clubhouse', name: 'Clubhouse', description: 'Listen in on fascinating voice conversations', icon: Mic, category: 'events', platform: 'clubhouse', color: '#F3E8D4' },

    // Commerce
    { id: 'shopify', name: 'Shopify', description: 'Connect your store', icon: ShoppingCart, category: 'commerce', platform: 'shopify', color: '#96BF48' },
    { id: 'etsy', name: 'Etsy', description: 'Link your Etsy shop', icon: Store, category: 'commerce', platform: 'etsy', color: '#F16521' },
    { id: 'amazon', name: 'Amazon', description: 'Link to your Amazon storefront', icon: ShoppingBag, category: 'commerce', platform: 'amazon', color: '#FF9900' },
    { id: 'paypal', name: 'PayPal', description: 'Accept payments via PayPal', icon: DollarSign, category: 'commerce', platform: 'paypal', color: '#003087' },
    { id: 'venmo', name: 'Venmo', description: 'Accept payments via Venmo', icon: DollarSign, category: 'commerce', platform: 'venmo', color: '#008CFF' },
    { id: 'stripe', name: 'Stripe Payments', description: 'Accept payments via Stripe', icon: CreditCard, category: 'commerce', platform: 'stripe', color: '#635BFF' },
    { id: 'reviews', name: 'Reviews', description: 'Showcase your Google reviews', icon: Star, category: 'commerce', platform: 'reviews', color: '#FBBC04' },
];

const INTEGRATION_BY_PLATFORM = new Map(INTEGRATIONS.map(integration => [integration.platform, integration]));
const SOCIAL_ICON_PLATFORMS = new Set([
    'instagram',
    'tiktok',
    'tiktok-profile',
    'twitter',
    'threads',
    'facebook',
    'linkedin',
    'snapchat',
    'pinterest',
    'twitch',
    'reddit',
    'discord',
    'telegram',
    'youtube',
    'spotify',
    'apple-music',
    'soundcloud',
    'podcast',
    'whatsapp',
    'email',
    'phone',
]);

const getIntegrationForLink = (link: { platform?: string; linkType?: string }) => (
    (link.platform && INTEGRATION_BY_PLATFORM.get(link.platform))
    || (link.linkType && INTEGRATION_BY_PLATFORM.get(link.linkType))
    || undefined
);

const getLinkIcon = (link: { platform?: string; linkType?: string }) => getIntegrationForLink(link)?.icon || Globe;
const getLinkAccentColor = (link: { platform?: string; linkType?: string }) => getIntegrationForLink(link)?.color || '#64748b';
const isSocialIconLink = (link: { linkType?: string; platform?: string }) => (
    link.linkType === 'social'
    || Boolean(link.platform && SOCIAL_ICON_PLATFORMS.has(link.platform))
);

const readBlockLinkIds = (value: unknown): string[] => (
    Array.isArray(value)
        ? value.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
        : []
);

const selectLinksForSocialBlock = <T extends { id: string; linkType?: string; platform?: string; enabled?: boolean; visible?: boolean }>(
    block: BioPageBlock | undefined,
    links: T[],
): T[] => {
    if (!block || block.visible === false) return [];
    const eligibleLinks = links.filter(link => link.enabled !== false && link.visible !== false && isSocialIconLink(link));
    const selectedIds = readBlockLinkIds(block.data?.linkIds);
    if (!selectedIds.length) return eligibleLinks;
    const selectedSet = new Set(selectedIds);
    return eligibleLinks.filter(link => selectedSet.has(link.id));
};

const MOCK_PROFILE: BioProfile = {
    name: 'Your Business Name',
    bio: 'Welcome to my page! Find all my links here.',
    avatar: undefined,
};

const DEFAULT_THEME: BioTheme = {
    preset: 'dark',
    backgroundColor: '#1C0D28',
    backgroundType: 'solid',
    gradientColor: '#2d1b4e',
    buttonStyle: 'fill',
    buttonShape: 'full',
    buttonShadow: 'none',
    buttonColor: '#FBB92B',
    buttonTextColor: '#000000',
    textColor: '#F5F4F0',
    titleFont: 'Ubuntu',
    titleColor: '#ffffff',
    bodyFont: 'Open Sans',
    bodyColor: '#F5F4F0',
    profileLayout: 'circle',
    profileSize: 'small',
    titleStyle: 'text',
};

const THEME_PRESETS = [
    { id: 'light', name: 'Light (Warm Parchment)', bg: '#F5F4F0', button: '#FBB92B', text: '#1C0D28' },
    { id: 'dark', name: 'Dark (Night Violet)', bg: '#1C0D28', button: '#FBB92B', text: '#F5F4F0' },
    { id: 'oled', name: 'OLED (Black)', bg: '#000000', button: '#FBB92B', text: '#ffffff' },
];

// Form Templates for form configuration modal
const FORM_TEMPLATES: { id: string; name: string; description: string; icon: LucideIcon; color: string }[] = [
    { id: 'email-signup', name: 'Email sign up', description: 'Grow your mailing list', icon: Mail, color: '#3B82F6' },
    { id: 'sms-signup', name: 'SMS sign up', description: 'Collect phone numbers from followers', icon: MessageCircle, color: '#EC4899' },
    { id: 'contact-form', name: 'Contact form', description: 'Be available for opportunities', icon: FileText, color: '#8B5CF6' },
    { id: 'custom', name: 'Custom', description: 'Shape it to your needs', icon: Plus, color: '#6B7280' },
];

// Form Layout options
const FORM_LAYOUTS: { id: 'classic' | 'featured'; name: string; description: string }[] = [
    { id: 'classic', name: 'Classic', description: 'Efficient, direct and compact' },
    { id: 'featured', name: 'Featured', description: 'Make your link stand out with a larger display' },
];

type BioLeadFormFieldType = 'text' | 'email' | 'phone' | 'textarea';

interface BioLeadFormField {
    id: string;
    label: string;
    type: BioLeadFormFieldType;
    required: boolean;
}

const BIO_LEAD_FIELD_TYPE_OPTIONS: Array<{ id: BioLeadFormFieldType; label: string }> = [
    { id: 'text', label: 'Text' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Phone' },
    { id: 'textarea', label: 'Textarea' },
];

const DEFAULT_BIO_LEAD_FIELDS: BioLeadFormField[] = [
    { id: 'name', label: 'Name', type: 'text', required: true },
    { id: 'email', label: 'Email', type: 'email', required: true },
    { id: 'message', label: 'Message', type: 'textarea', required: false },
];
const DEFAULT_BIO_LEAD_CONSENT_TEXT = 'I agree to be contacted about this request.';
const DEFAULT_BIO_LEAD_SUCCESS_MESSAGE = 'Thanks. We will be in touch soon.';
const DEFAULT_BIO_EMAIL_PLACEHOLDER = 'Email address';
const DEFAULT_BIO_EMAIL_BUTTON_TEXT = 'Subscribe';
const DEFAULT_BIO_EMAIL_CONSENT_TEXT = 'I agree to receive marketing emails.';
const DEFAULT_BIO_EMAIL_SUCCESS_MESSAGE = 'Thanks for subscribing.';

const normalizeBioLeadFieldId = (value: unknown, fallback: string): string => {
    const rawValue = typeof value === 'string' ? value : fallback;
    const normalized = rawValue
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
    return normalized || fallback;
};

const normalizeBioLeadFields = (value: unknown): BioLeadFormField[] => {
    if (!Array.isArray(value)) return DEFAULT_BIO_LEAD_FIELDS;

    const seen = new Set<string>();
    const fields = value
        .slice(0, 8)
        .map((field, index): BioLeadFormField | null => {
            if (!field || typeof field !== 'object' || Array.isArray(field)) return null;
            const fieldRecord = field as Record<string, unknown>;
            const id = normalizeBioLeadFieldId(fieldRecord.id, `field-${index + 1}`);
            if (seen.has(id)) return null;
            const rawType = typeof fieldRecord.type === 'string' ? fieldRecord.type : 'text';
            const type = BIO_LEAD_FIELD_TYPE_OPTIONS.some(option => option.id === rawType)
                ? rawType as BioLeadFormFieldType
                : 'text';
            const rawLabel = typeof fieldRecord.label === 'string' ? fieldRecord.label.trim() : '';
            seen.add(id);
            return {
                id,
                label: (rawLabel || id.replace(/[-_]+/g, ' ')).slice(0, 80),
                type,
                required: fieldRecord.required !== false,
            };
        })
        .filter((field): field is BioLeadFormField => Boolean(field));

    if (!fields.length || !fields.some(field => field.type === 'email')) {
        return DEFAULT_BIO_LEAD_FIELDS;
    }

    return fields.slice(0, 6);
};

const getBioLeadTags = (value: unknown): string[] => (
    Array.isArray(value)
        ? value.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim())).map(tag => tag.trim()).slice(0, 10)
        : ['bio-page', 'link-in-bio']
);

const BIO_BLOCK_LIBRARY: Array<{
    type: BioPageBlockType;
    labelKey: string;
    descriptionKey: string;
    label: string;
    description: string;
    icon: LucideIcon;
    sourceModule: string;
    data?: Record<string, unknown>;
}> = [
    { type: 'social_links', labelKey: 'blockLibrarySocialIcons', descriptionKey: 'blockLibrarySocialIconsDesc', label: 'Social icons', description: 'Show selected social links as compact profile icons.', icon: AtSign, sourceModule: 'bio-page-engine', data: { linkIds: [], layout: 'icons' } },
    { type: 'featured_banner', labelKey: 'blockLibraryFeaturedBanner', descriptionKey: 'blockLibraryFeaturedBannerDesc', label: 'Featured banner', description: 'Promote one launch, offer, or announcement.', icon: Star, sourceModule: 'bio-page-engine', data: { url: '' } },
    { type: 'product_grid', labelKey: 'blockLibraryShopProducts', descriptionKey: 'blockLibraryShopProductsDesc', label: 'Shop products', description: 'Show approved Ecommerce products.', icon: ShoppingBag, sourceModule: 'ecommerce', data: { productIds: [] } },
    { type: 'product_collection', labelKey: 'blockLibraryProductCollection', descriptionKey: 'blockLibraryProductCollectionDesc', label: 'Product collection', description: 'Show products from selected Ecommerce categories.', icon: Store, sourceModule: 'ecommerce', data: { collectionIds: [], productIds: [] } },
    { type: 'booking', labelKey: 'blockLibraryBooking', descriptionKey: 'blockLibraryBookingDesc', label: 'Booking', description: 'Send visitors into Appointments or embed booking inline.', icon: Calendar, sourceModule: 'appointments', data: { url: '', bookingMode: 'cta', durationMinutes: 60 } },
    {
        type: 'lead_form',
        labelKey: 'blockLibraryLeadCapture',
        descriptionKey: 'blockLibraryLeadCaptureDesc',
        label: 'Lead capture',
        description: 'Capture CRM leads from the bio page.',
        icon: FileText,
        sourceModule: 'crm',
        data: {
            tags: ['bio-page', 'link-in-bio'],
            fields: DEFAULT_BIO_LEAD_FIELDS,
            consentRequired: true,
            consentText: DEFAULT_BIO_LEAD_CONSENT_TEXT,
            successMessage: DEFAULT_BIO_LEAD_SUCCESS_MESSAGE,
        },
    },
    {
        type: 'email_subscribe',
        labelKey: 'blockLibraryEmailSubscribe',
        descriptionKey: 'blockLibraryEmailSubscribeDesc',
        label: 'Email subscribe',
        description: 'Collect consented subscribers.',
        icon: Mail,
        sourceModule: 'email-marketing',
        data: {
            audienceId: null,
            placeholder: DEFAULT_BIO_EMAIL_PLACEHOLDER,
            buttonText: DEFAULT_BIO_EMAIL_BUTTON_TEXT,
            consentRequired: true,
            consentText: DEFAULT_BIO_EMAIL_CONSENT_TEXT,
            successMessage: DEFAULT_BIO_EMAIL_SUCCESS_MESSAGE,
        },
    },
    { type: 'featured_media', labelKey: 'blockLibraryFeaturedMedia', descriptionKey: 'blockLibraryFeaturedMediaDesc', label: 'Featured media', description: 'Feature a video, image, or downloadable asset.', icon: Video, sourceModule: 'media-ai', data: { url: '', mediaType: 'image' } },
    { type: 'media_grid', labelKey: 'blockLibraryMediaGrid', descriptionKey: 'blockLibraryMediaGridDesc', label: 'Media grid', description: 'Show a compact grid of project media assets.', icon: Grid, sourceModule: 'media-ai', data: { items: [] } },
    { type: 'portfolio_grid', labelKey: 'blockLibraryPortfolioGrid', descriptionKey: 'blockLibraryPortfolioGridDesc', label: 'Portfolio grid', description: 'Show selected media or portfolio items.', icon: Grid, sourceModule: 'media-ai', data: { items: [] } },
    { type: 'testimonials', labelKey: 'blockLibraryTestimonials', descriptionKey: 'blockLibraryTestimonialsDesc', label: 'Testimonials', description: 'Show manually verified customer quotes.', icon: Users, sourceModule: 'crm', data: { items: [] } },
    { type: 'chatbot_cta', labelKey: 'blockLibraryChatCoreCta', descriptionKey: 'blockLibraryChatCoreCtaDesc', label: 'ChatCore CTA', description: 'Open the project AI assistant.', icon: MessageCircle, sourceModule: 'chatcore', data: {} },
    { type: 'faq', labelKey: 'blockLibraryFaq', descriptionKey: 'blockLibraryFaqDesc', label: 'FAQ', description: 'Answer high-intent questions.', icon: Lightbulb, sourceModule: 'bio-page-engine', data: { items: [] } },
    { type: 'contact', labelKey: 'blockLibraryContact', descriptionKey: 'blockLibraryContactDesc', label: 'Contact', description: 'Show direct contact details.', icon: Phone, sourceModule: 'crm', data: { url: '' } },
];

type BioPageTranslate = (key: string, defaultValue: string) => string;

const getBioBlockDefinitionCopy = (
    definition: (typeof BIO_BLOCK_LIBRARY)[number],
    translate: BioPageTranslate,
) => ({
    label: translate(`bioPage.${definition.labelKey}`, definition.label),
    description: translate(`bioPage.${definition.descriptionKey}`, definition.description),
});

const BLOCK_ICON_BY_TYPE: Partial<Record<BioPageBlockType, LucideIcon>> = {
    profile: User,
    link: Link2,
    social_links: AtSign,
    featured_banner: Star,
    featured_media: Video,
    media_grid: Grid,
    product_grid: ShoppingBag,
    product_collection: Store,
    booking: Calendar,
    lead_form: FileText,
    email_subscribe: Mail,
    portfolio_grid: Grid,
    testimonials: Users,
    faq: Lightbulb,
    contact: Phone,
    chatbot_cta: MessageCircle,
    divider: MoreVertical,
    spacer: MoreVertical,
    custom_html_placeholder: FileText,
};

const BLOCKS_WITH_URL = new Set<BioPageBlockType>(['featured_banner', 'contact']);

const formatBlockTypeLabel = (type: BioPageBlockType): string => (
    type.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
);

const getAnalyticsDateFrom = (range: AnalyticsRange): string | undefined => {
    if (range === 'all') return undefined;
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
};

// =============================================================================
// SORTABLE LINK ITEM COMPONENT
// =============================================================================

interface SortableLinkItemProps {
    link: ContextBioLink;
    onUpdate: (updates: Partial<ContextBioLink>) => void;
    onDelete: () => void;
    onToggle: () => void;
    onMarkReviewed: () => void;
    onDuplicate: () => void;
    onPrioritize: () => void;
    t: (key: string, defaultValue: string) => string;
}

const SortableLinkItem: React.FC<SortableLinkItemProps> = ({
    link,
    onUpdate,
    onDelete,
    onToggle,
    onMarkReviewed,
    onDuplicate,
    onPrioritize,
    t
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: link.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group bg-q-surface/50 border border-q-border rounded-lg p-3 hover:border-q-border/80 transition-all ${isDragging ? 'shadow-lg ring-2 ring-q-accent/20' : ''
                }`}
        >
            <div className="flex items-start gap-3">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="mt-2 cursor-grab active:cursor-grabbing text-q-text-muted hover:text-foreground touch-none"
                >
                    <GripVertical size={18} />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                    <input
                        type="text"
                        value={link.title}
                        onChange={(e) => onUpdate({ title: e.target.value })}
                        placeholder={t('bioPage.linkTitle', 'Link title')}
                        className="w-full bg-transparent text-foreground font-medium outline-none placeholder:text-q-text-muted/50"
                    />

                    {/* Only show URL field if not chatbot */}
                    {link.linkType !== 'chatbot' && (
                        <input
                            type="url"
                            value={link.url}
                            onChange={(e) => onUpdate({ url: e.target.value })}
                            placeholder="https://"
                            className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-q-text-muted">
                        <div className="flex flex-wrap items-center gap-2">
                            <span>{link.clicks.toLocaleString()} {t('bioPage.clicks', 'clicks')}</span>
                            {link.needsReview && (
                                <span className="rounded-md bg-q-warning/10 px-2 py-1 text-[11px] font-semibold text-q-warning">
                                    {t('bioPage.needsReview', 'Needs review')}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {link.needsReview && (
                                <button
                                    type="button"
                                    onClick={onMarkReviewed}
                                    className="p-1.5 hover:bg-q-success/10 hover:text-q-success rounded-md"
                                    title={t('bioPage.markReviewed', 'Mark reviewed')}
                                >
                                    <Check size={14} />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onPrioritize}
                                className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-md"
                                title={t('bioPage.prioritizeLink', 'Prioritize link')}
                            >
                                <Star size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={onDuplicate}
                                className="p-1.5 hover:bg-muted rounded-md"
                                title={t('bioPage.duplicateLink', 'Duplicate link')}
                            >
                                <Copy size={14} />
                            </button>
                            {/* Only show open link button if not chatbot */}
                            {link.linkType !== 'chatbot' && (
                                <button
                                    type="button"
                                    onClick={() => window.open(link.url, '_blank')}
                                    className="p-1.5 hover:bg-muted rounded-md"
                                    title={t('bioPage.openLink', 'Open link')}
                                >
                                    <ExternalLink size={14} />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onDelete}
                                className="p-1.5 hover:bg-destructive/20 hover:text-destructive rounded-md"
                                title={t('bioPage.deleteLink', 'Delete link')}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Toggle */}
                <button
                    type="button"
                    onClick={onToggle}
                    className={`p-2 rounded-lg transition-colors ${link.enabled
                        ? 'bg-q-accent/10 text-q-accent'
                        : 'bg-muted text-q-text-muted'
                        }`}
                    title={link.enabled ? t('bioPage.enabled', 'Enabled') : t('bioPage.disabled', 'Disabled')}
                >
                    {link.enabled ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
            </div>
        </div>
    );
};

// =============================================================================
// SORTABLE BLOCK ITEM COMPONENT
// =============================================================================

interface SortableBlockItemProps {
    block: BioPageBlock;
    canDelete: boolean;
    availableProducts: BioProductOption[];
    availableCategories: BioCategoryOption[];
    emailAudiences: BioAudienceOption[];
    mediaAssets: BioMediaAssetOption[];
    socialLinks: ContextBioLink[];
    isMediaLoading: boolean;
    onUpdate: (updates: Partial<BioPageBlock>) => void;
    onDelete: () => void;
    onToggle: () => void;
    onMarkReviewed: () => void;
    onDuplicate: () => void;
    onPrioritize: () => void;
    t: (key: string, defaultValue: string) => string;
}

const SortableBlockItem: React.FC<SortableBlockItemProps> = ({
    block,
    canDelete,
    availableProducts,
    availableCategories,
    emailAudiences,
    mediaAssets,
    socialLinks,
    isMediaLoading,
    onUpdate,
    onDelete,
    onToggle,
    onMarkReviewed,
    onDuplicate,
    onPrioritize,
    t,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 1,
    };
    const Icon = BLOCK_ICON_BY_TYPE[block.type] || Layers;
    const blockUrl = typeof block.data?.url === 'string' ? block.data.url : '';
    const isSystemBlock = block.type === 'profile' || block.type === 'link';
    const selectedProductIds = Array.isArray(block.data?.productIds)
        ? block.data.productIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
        : [];
    const selectedProductIdSet = new Set(selectedProductIds);
    const selectedCollectionIds = Array.isArray(block.data?.collectionIds)
        ? block.data.collectionIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
        : [];
    const selectedCollectionIdSet = new Set(selectedCollectionIds);
    const selectedSocialLinkIds = readBlockLinkIds(block.data?.linkIds);
    const selectedSocialLinkIdSet = new Set(selectedSocialLinkIds);
    const selectedAudienceId = typeof block.data?.audienceId === 'string' ? block.data.audienceId : '';
    const bookingMode = block.data?.bookingMode === 'inline' ? 'inline' : 'cta';
    const bookingDuration = typeof block.data?.durationMinutes === 'number' ? block.data.durationMinutes : 60;
    const selectedMediaItems = Array.isArray(block.data?.items)
        ? block.data.items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
        : [];
    const selectedMediaIds = new Set(
        selectedMediaItems
            .map(item => typeof item.id === 'string' ? item.id : '')
            .filter(Boolean),
    );
    const mediaType = typeof block.data?.mediaType === 'string' ? block.data.mediaType : 'image';
    const testimonialItems = selectedMediaItems;
    const leadFormFields = normalizeBioLeadFields(block.data?.fields);
    const leadFormTags = getBioLeadTags(block.data?.tags);
    const leadConsentRequired = block.data?.consentRequired !== false;
    const leadConsentText = typeof block.data?.consentText === 'string' && block.data.consentText.trim()
        ? block.data.consentText
        : DEFAULT_BIO_LEAD_CONSENT_TEXT;
    const leadSuccessMessage = typeof block.data?.successMessage === 'string' && block.data.successMessage.trim()
        ? block.data.successMessage
        : DEFAULT_BIO_LEAD_SUCCESS_MESSAGE;
    const emailPlaceholder = typeof block.data?.placeholder === 'string' && block.data.placeholder.trim()
        ? block.data.placeholder
        : DEFAULT_BIO_EMAIL_PLACEHOLDER;
    const emailButtonText = typeof block.data?.buttonText === 'string' && block.data.buttonText.trim()
        ? block.data.buttonText
        : DEFAULT_BIO_EMAIL_BUTTON_TEXT;
    const emailConsentRequired = true;
    const emailConsentText = typeof block.data?.consentText === 'string' && block.data.consentText.trim()
        ? block.data.consentText
        : DEFAULT_BIO_EMAIL_CONSENT_TEXT;
    const emailSuccessMessage = typeof block.data?.successMessage === 'string' && block.data.successMessage.trim()
        ? block.data.successMessage
        : DEFAULT_BIO_EMAIL_SUCCESS_MESSAGE;

    const updateLeadFormData = (updates: Record<string, unknown>) => {
        onUpdate({ data: { ...(block.data || {}), ...updates } });
    };

    const updateEmailSubscribeData = (updates: Record<string, unknown>) => {
        onUpdate({ data: { ...(block.data || {}), ...updates } });
    };

    const updateLeadFormField = (index: number, updates: Partial<BioLeadFormField>) => {
        const nextFields = leadFormFields.map((field, fieldIndex) => (
            fieldIndex === index ? { ...field, ...updates } : field
        ));
        const safeFields = nextFields.some(field => field.type === 'email')
            ? nextFields
            : [...nextFields, DEFAULT_BIO_LEAD_FIELDS[1]].slice(0, 6);
        updateLeadFormData({ fields: safeFields });
    };

    const addLeadFormField = () => {
        if (leadFormFields.length >= 6) return;
        const existingIds = new Set(leadFormFields.map(field => field.id));
        let nextNumber = leadFormFields.length + 1;
        while (existingIds.has(`field-${nextNumber}`)) nextNumber += 1;
        updateLeadFormData({
            fields: [
                ...leadFormFields,
                { id: `field-${nextNumber}`, label: `Field ${nextNumber}`, type: 'text', required: false },
            ],
        });
    };

    const deleteLeadFormField = (index: number) => {
        const nextFields = leadFormFields.filter((_, fieldIndex) => fieldIndex !== index);
        updateLeadFormData({
            fields: nextFields.some(field => field.type === 'email')
                ? nextFields
                : [DEFAULT_BIO_LEAD_FIELDS[1], ...nextFields].slice(0, 6),
        });
    };

    const toggleProductSelection = (productId: string) => {
        const next = new Set(selectedProductIds);
        if (next.has(productId)) {
            next.delete(productId);
        } else {
            next.add(productId);
        }
        onUpdate({
            data: {
                ...(block.data || {}),
                productIds: Array.from(next),
            },
        });
    };

    const toggleCollectionSelection = (collectionId: string) => {
        const next = new Set(selectedCollectionIds);
        if (next.has(collectionId)) {
            next.delete(collectionId);
        } else {
            next.add(collectionId);
        }
        onUpdate({
            data: {
                ...(block.data || {}),
                collectionIds: Array.from(next),
            },
        });
    };

    const toggleSocialLinkSelection = (linkId: string) => {
        const baseIds = selectedSocialLinkIds.length
            ? selectedSocialLinkIds
            : socialLinks.filter(link => link.enabled !== false && link.visible !== false).map(link => link.id);
        const next = new Set(baseIds);
        if (next.has(linkId)) {
            next.delete(linkId);
        } else {
            next.add(linkId);
        }
        onUpdate({
            data: {
                ...(block.data || {}),
                linkIds: Array.from(next),
                layout: 'icons',
            },
        });
    };

    const togglePortfolioAsset = (asset: BioMediaAssetOption) => {
        const nextIds = new Set(selectedMediaIds);
        if (nextIds.has(asset.id)) {
            nextIds.delete(asset.id);
        } else {
            nextIds.add(asset.id);
        }

        const knownAssetIds = new Set(mediaAssets.map(item => item.id));
        const externalItems = selectedMediaItems.filter(item => {
            const id = typeof item.id === 'string' ? item.id : '';
            return !id || !knownAssetIds.has(id);
        });
        const nextItems = [
            ...externalItems,
            ...mediaAssets
                .filter(item => nextIds.has(item.id))
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    url: item.url,
                    imageUrl: item.url,
                    type: item.type || 'image',
                    source: item.source,
                    storagePath: item.storagePath,
                })),
        ];

        onUpdate({
            data: {
                ...(block.data || {}),
                items: nextItems,
            },
        });
    };

    const updateTestimonialItem = (index: number, updates: Record<string, unknown>) => {
        const nextItems = testimonialItems.map((item, itemIndex) => (
            itemIndex === index ? { ...item, ...updates } : item
        ));
        onUpdate({ data: { ...(block.data || {}), items: nextItems } });
    };

    const addTestimonialItem = () => {
        onUpdate({
            data: {
                ...(block.data || {}),
                items: [
                    ...testimonialItems,
                    { quote: '', author: '', role: '', rating: 5, verified: false },
                ].slice(0, 6),
            },
        });
    };

    const deleteTestimonialItem = (index: number) => {
        onUpdate({
            data: {
                ...(block.data || {}),
                items: testimonialItems.filter((_, itemIndex) => itemIndex !== index),
            },
        });
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group rounded-lg border border-q-border bg-q-surface/50 p-3 transition-all hover:border-q-border/80 ${isDragging ? 'shadow-lg ring-2 ring-q-accent/20' : ''}`}
        >
            <div className="flex items-start gap-3">
                <div
                    {...attributes}
                    {...listeners}
                    className="mt-2 cursor-grab active:cursor-grabbing text-q-text-muted hover:text-foreground touch-none"
                >
                    <GripVertical size={18} />
                </div>

                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={17} />
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-q-text-muted">
                            {formatBlockTypeLabel(block.type)}
                        </span>
                        {block.needsReview && (
                            <span className="rounded-md bg-q-warning/10 px-2 py-1 text-[11px] font-semibold text-q-warning">
                                {t('bioPage.needsReview', 'Needs review')}
                            </span>
                        )}
                        {block.needsReview && (
                            <button
                                type="button"
                                onClick={onMarkReviewed}
                                className="rounded-md bg-q-success/10 px-2 py-1 text-[11px] font-semibold text-q-success transition-colors hover:bg-q-success/20"
                            >
                                <Check size={12} className="mr-1 inline-block" />
                                {t('bioPage.markReviewed', 'Mark reviewed')}
                            </button>
                        )}
                    </div>

                    <input
                        type="text"
                        value={block.title}
                        onChange={(e) => onUpdate({ title: e.target.value })}
                        placeholder={t('bioPage.blockTitle', 'Block title')}
                        className="w-full bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-q-text-muted/50"
                    />

                    {!isSystemBlock && (
                        <textarea
                            value={block.description || ''}
                            onChange={(e) => onUpdate({ description: e.target.value })}
                            placeholder={t('bioPage.blockDescription', 'Optional description')}
                            rows={2}
                            className="w-full resize-none rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    )}

                    {BLOCKS_WITH_URL.has(block.type) && (
                        <input
                            type="url"
                            value={blockUrl}
                            onChange={(e) => onUpdate({ data: { ...(block.data || {}), url: e.target.value } })}
                            placeholder={block.type === 'booking' ? '/appointments' : 'https://'}
                            className="w-full rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    )}

                    {block.type === 'booking' && (
                        <div className="space-y-3 rounded-lg border border-q-border/60 bg-muted/30 p-3">
                            <div>
                                <p className="text-xs font-semibold text-foreground">
                                    {t('bioPage.bookingMode', 'Booking mode')}
                                </p>
                                <p className="text-[11px] text-q-text-muted">
                                    {t('bioPage.bookingModeDesc', 'Use a direct appointment CTA or embed the public booking form inside the Bio Page.')}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {(['cta', 'inline'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => onUpdate({ data: { ...(block.data || {}), bookingMode: mode } })}
                                        className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${bookingMode === mode ? 'bg-primary text-primary-foreground' : 'bg-q-surface text-q-text-muted hover:text-foreground'}`}
                                    >
                                        {mode === 'cta' ? t('bioPage.bookingCtaMode', 'CTA') : t('bioPage.bookingInlineMode', 'Inline')}
                                    </button>
                                ))}
                            </div>

                            {bookingMode === 'cta' ? (
                                <input
                                    type="url"
                                    value={blockUrl}
                                    onChange={(event) => onUpdate({ data: { ...(block.data || {}), url: event.target.value } })}
                                    placeholder="/appointments"
                                    className="w-full rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            ) : (
                                <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-semibold text-q-text-muted">
                                            {t('bioPage.bookingDuration', 'Duration')}
                                        </span>
                                        <input
                                            type="number"
                                            min={15}
                                            max={240}
                                            step={15}
                                            value={bookingDuration}
                                            onChange={(event) => onUpdate({
                                                data: {
                                                    ...(block.data || {}),
                                                    durationMinutes: Math.min(Math.max(Number(event.target.value) || 60, 15), 240),
                                                },
                                            })}
                                            className="w-full rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                        />
                                    </label>
                                    <span className="pb-2 text-xs text-q-text-muted">{t('bioPage.minutesShort', 'min')}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {block.type === 'lead_form' && (
                        <div className="space-y-3 rounded-lg border border-q-border/60 bg-muted/30 p-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold text-foreground">
                                        {t('bioPage.leadFormFields', 'Lead form fields')}
                                    </p>
                                    <p className="text-[11px] text-q-text-muted">
                                        {t('bioPage.leadFormFieldsHint', 'Configure the CRM fields visitors complete on the public Bio Page.')}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addLeadFormField}
                                    disabled={leadFormFields.length >= 6}
                                    className="shrink-0 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
                                >
                                    {t('bioPage.addField', 'Add field')}
                                </button>
                            </div>

                            <div className="space-y-2">
                                {leadFormFields.map((field, index) => (
                                    <div key={`${field.id}-${index}`} className="rounded-md border border-q-border/60 bg-q-surface/50 p-2">
                                        <div className="grid grid-cols-[1fr_104px_auto] gap-2">
                                            <input
                                                type="text"
                                                value={field.label}
                                                onChange={(event) => updateLeadFormField(index, { label: event.target.value.slice(0, 80) })}
                                                placeholder={t('bioPage.fieldLabel', 'Field label')}
                                                className="min-w-0 rounded-md border border-q-border bg-q-surface px-2 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                            />
                                            <select
                                                value={field.type}
                                                onChange={(event) => updateLeadFormField(index, { type: event.target.value as BioLeadFormFieldType })}
                                                className="rounded-md border border-q-border bg-q-surface px-2 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                            >
                                                {BIO_LEAD_FIELD_TYPE_OPTIONS.map(option => (
                                                    <option key={option.id} value={option.id}>{option.label}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => deleteLeadFormField(index)}
                                                className="rounded-md border border-q-border px-2 text-q-text-muted transition-colors hover:text-q-danger"
                                                aria-label={t('bioPage.deleteField', 'Delete field')}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                        <label className="mt-2 flex items-center gap-2 text-[11px] font-medium text-q-text-muted">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(event) => updateLeadFormField(index, { required: event.target.checked })}
                                            />
                                            {t('bioPage.requiredField', 'Required field')}
                                        </label>
                                    </div>
                                ))}
                            </div>

                            <label className="block space-y-1">
                                <span className="text-[11px] font-semibold text-q-text-muted">
                                    {t('bioPage.crmTags', 'CRM tags')}
                                </span>
                                <input
                                    type="text"
                                    value={leadFormTags.join(', ')}
                                    onChange={(event) => updateLeadFormData({
                                        tags: event.target.value
                                            .split(',')
                                            .map(tag => tag.trim())
                                            .filter(Boolean)
                                            .slice(0, 10),
                                    })}
                                    placeholder="bio-page, link-in-bio"
                                    className="w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            </label>

                            <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                                <input
                                    type="checkbox"
                                    checked={leadConsentRequired}
                                    onChange={(event) => updateLeadFormData({ consentRequired: event.target.checked })}
                                />
                                {t('bioPage.requireLeadConsent', 'Require consent checkbox')}
                            </label>

                            {leadConsentRequired && (
                                <textarea
                                    value={leadConsentText}
                                    onChange={(event) => updateLeadFormData({ consentText: event.target.value.slice(0, 240) })}
                                    rows={2}
                                    placeholder={t('bioPage.consentText', 'Consent text')}
                                    className="w-full resize-none rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            )}

                            <label className="block space-y-1">
                                <span className="text-[11px] font-semibold text-q-text-muted">
                                    {t('bioPage.successMessage', 'Success message')}
                                </span>
                                <input
                                    type="text"
                                    value={leadSuccessMessage}
                                    onChange={(event) => updateLeadFormData({ successMessage: event.target.value.slice(0, 160) })}
                                    className="w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            </label>
                        </div>
                    )}

                    {block.type === 'product_grid' && (
                        <div className="space-y-2 rounded-lg border border-q-border/60 bg-muted/30 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold text-foreground">
                                        {t('bioPage.approvedProducts', 'Approved products')}
                                    </p>
                                    <p className="text-[11px] text-q-text-muted">
                                        {t('bioPage.productBlockHint', 'Only real active Ecommerce products are eligible for the public Bio Page.')}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onUpdate({ data: { ...(block.data || {}), productIds: [] } })}
                                    className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${selectedProductIds.length === 0 ? 'bg-primary text-primary-foreground' : 'bg-q-surface text-q-text-muted hover:text-foreground'}`}
                                >
                                    {t('bioPage.useAllProducts', 'Use all')}
                                </button>
                            </div>

                            {availableProducts.length ? (
                                <div className="grid grid-cols-1 gap-1.5">
                                    {availableProducts.slice(0, 8).map(product => {
                                        const isSelected = selectedProductIds.length === 0 || selectedProductIdSet.has(product.id);
                                        return (
                                            <button
                                                key={product.id}
                                                type="button"
                                                onClick={() => toggleProductSelection(product.id)}
                                                className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left transition-colors ${isSelected ? 'border-primary/40 bg-primary/10' : 'border-q-border/70 bg-q-surface/40 hover:border-q-border'}`}
                                            >
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={product.name} className="h-8 w-8 shrink-0 rounded-md object-cover" />
                                                ) : (
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-q-text-muted">
                                                        <ShoppingBag size={14} />
                                                    </span>
                                                )}
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-xs font-semibold text-foreground">{product.name}</span>
                                                    <span className="block text-[11px] text-q-text-muted">${product.price.toFixed(2)}</span>
                                                </span>
                                                {isSelected ? <Check size={14} className="text-primary" /> : <Square size={14} className="text-q-text-muted" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="rounded-md border border-dashed border-q-border px-3 py-2 text-[11px] text-q-text-muted">
                                    {t('bioPage.noApprovedProducts', 'No active Ecommerce products are available for this project yet.')}
                                </p>
                            )}
                        </div>
                    )}

                    {block.type === 'product_collection' && (
                        <div className="space-y-2 rounded-lg border border-q-border/60 bg-muted/30 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold text-foreground">
                                        {t('bioPage.productCollections', 'Product collections')}
                                    </p>
                                    <p className="text-[11px] text-q-text-muted">
                                        {t('bioPage.productCollectionHint', 'Select active Ecommerce categories to create a focused creator storefront block.')}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onUpdate({ data: { ...(block.data || {}), collectionIds: [] } })}
                                    className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${selectedCollectionIds.length === 0 ? 'bg-primary text-primary-foreground' : 'bg-q-surface text-q-text-muted hover:text-foreground'}`}
                                >
                                    {t('bioPage.useAllCollections', 'Use all')}
                                </button>
                            </div>

                            {availableCategories.length ? (
                                <div className="grid grid-cols-1 gap-1.5">
                                    {availableCategories.slice(0, 10).map(category => {
                                        const isSelected = selectedCollectionIds.length === 0
                                            || selectedCollectionIdSet.has(category.id)
                                            || selectedCollectionIdSet.has(category.slug);
                                        return (
                                            <button
                                                key={category.id}
                                                type="button"
                                                onClick={() => toggleCollectionSelection(category.id || category.slug)}
                                                className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left transition-colors ${isSelected ? 'border-primary/40 bg-primary/10' : 'border-q-border/70 bg-q-surface/40 hover:border-q-border'}`}
                                            >
                                                {category.image ? (
                                                    <img src={category.image} alt={category.name} className="h-8 w-8 shrink-0 rounded-md object-cover" />
                                                ) : (
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-q-text-muted">
                                                        <Store size={14} />
                                                    </span>
                                                )}
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-xs font-semibold text-foreground">{category.name}</span>
                                                    <span className="block text-[11px] text-q-text-muted">{category.count || 0} {t('bioPage.productsLower', 'products')}</span>
                                                </span>
                                                {isSelected ? <Check size={14} className="text-primary" /> : <Square size={14} className="text-q-text-muted" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="rounded-md border border-dashed border-q-border px-3 py-2 text-[11px] text-q-text-muted">
                                    {t('bioPage.noProductCollections', 'No Ecommerce categories are available for this project yet.')}
                                </p>
                            )}
                        </div>
                    )}

                    {block.type === 'social_links' && (
                        <div className="space-y-2 rounded-lg border border-q-border/60 bg-muted/30 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold text-foreground">
                                        {t('bioPage.socialIconLinks', 'Social icon links')}
                                    </p>
                                    <p className="text-[11px] text-q-text-muted">
                                        {t('bioPage.socialIconLinksHint', 'Uses visible social/contact links already created in the Links tab.')}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onUpdate({ data: { ...(block.data || {}), linkIds: [], layout: 'icons' } })}
                                    className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${selectedSocialLinkIds.length === 0 ? 'bg-primary text-primary-foreground' : 'bg-q-surface text-q-text-muted hover:text-foreground'}`}
                                >
                                    {t('bioPage.useAllSocialLinks', 'Use all')}
                                </button>
                            </div>

                            {socialLinks.length ? (
                                <div className="grid grid-cols-1 gap-1.5">
                                    {socialLinks.map(link => {
                                        const isSelected = selectedSocialLinkIds.length === 0 || selectedSocialLinkIdSet.has(link.id);
                                        const LinkIcon = getLinkIcon(link);
                                        return (
                                            <button
                                                key={link.id}
                                                type="button"
                                                onClick={() => toggleSocialLinkSelection(link.id)}
                                                className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left transition-colors ${isSelected ? 'border-primary/40 bg-primary/10' : 'border-q-border/70 bg-q-surface/40 hover:border-q-border'}`}
                                            >
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-q-surface text-q-text-muted">
                                                    <LinkIcon size={14} style={{ color: getLinkAccentColor(link) }} />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-xs font-semibold text-foreground">{link.title}</span>
                                                    <span className="block truncate text-[11px] text-q-text-muted">{link.platform || link.linkType || 'social'}</span>
                                                </span>
                                                {isSelected ? <Check size={14} className="text-primary" /> : <Square size={14} className="text-q-text-muted" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="rounded-md border border-dashed border-q-border px-3 py-2 text-[11px] text-q-text-muted">
                                    {t('bioPage.noSocialLinks', 'No visible social links yet. Add Instagram, TikTok, YouTube, WhatsApp, email, or phone links from the Links tab.')}
                                </p>
                            )}
                        </div>
                    )}

                    {block.type === 'email_subscribe' && (
                        <div className="space-y-3 rounded-lg border border-q-border/60 bg-muted/30 p-3">
                            <label className="block text-xs font-semibold text-foreground">
                                {t('bioPage.emailAudience', 'Email Marketing audience')}
                            </label>
                            <select
                                value={selectedAudienceId}
                                onChange={(event) => updateEmailSubscribeData({ audienceId: event.target.value || null })}
                                className="w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                            >
                                <option value="">{t('bioPage.defaultBioAudience', 'Default Bio Page audience')}</option>
                                {emailAudiences.map(audience => (
                                    <option key={audience.id} value={audience.id}>
                                        {audience.name}{audience.isDefault ? ` ${t('bioPage.defaultAudienceSuffix', '(default)')}` : ''}
                                    </option>
                                ))}
                            </select>
                            {selectedAudienceId && (
                                <p className="text-[11px] text-q-text-muted">
                                    {t('bioPage.emailAudienceRouting', 'Subscribers from this block will be tagged with the selected audience.')}
                                </p>
                            )}
                            {!emailAudiences.length && (
                                <p className="text-[11px] text-q-text-muted">
                                    {t('bioPage.noAudiences', 'No Email Marketing audiences found for this project yet.')}
                                </p>
                            )}

                            <div className="grid grid-cols-1 gap-2">
                                <label className="block space-y-1">
                                    <span className="text-[11px] font-semibold text-q-text-muted">
                                        {t('bioPage.emailPlaceholder', 'Placeholder')}
                                    </span>
                                    <input
                                        type="text"
                                        value={emailPlaceholder}
                                        onChange={(event) => updateEmailSubscribeData({ placeholder: event.target.value.slice(0, 80) })}
                                        className="w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                    />
                                </label>
                                <label className="block space-y-1">
                                    <span className="text-[11px] font-semibold text-q-text-muted">
                                        {t('bioPage.emailButtonText', 'Button text')}
                                    </span>
                                    <input
                                        type="text"
                                        value={emailButtonText}
                                        onChange={(event) => updateEmailSubscribeData({ buttonText: event.target.value.slice(0, 48) })}
                                        className="w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                    />
                                </label>
                            </div>

                            <div className="rounded-lg border border-q-border/60 bg-q-surface/40 p-3">
                                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                                    <Check size={13} className="text-q-success" />
                                    {t('bioPage.marketingConsentRequired', 'Marketing consent required')}
                                </div>
                                <textarea
                                    value={emailConsentText}
                                    onChange={(event) => updateEmailSubscribeData({
                                        consentRequired: true,
                                        consentText: event.target.value.slice(0, 240),
                                    })}
                                    rows={2}
                                    placeholder={t('bioPage.emailConsentText', 'Email consent text')}
                                    className="w-full resize-none rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            </div>

                            <label className="block space-y-1">
                                <span className="text-[11px] font-semibold text-q-text-muted">
                                    {t('bioPage.successMessage', 'Success message')}
                                </span>
                                <input
                                    type="text"
                                    value={emailSuccessMessage}
                                    onChange={(event) => updateEmailSubscribeData({ successMessage: event.target.value.slice(0, 160) })}
                                    className="w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            </label>
                        </div>
                    )}

                    {block.type === 'featured_media' && (
                        <div className="space-y-3 rounded-lg border border-q-border/60 bg-muted/30 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold text-foreground">
                                        {t('bioPage.featuredMediaAsset', 'Featured media asset')}
                                    </p>
                                    <p className="text-[11px] text-q-text-muted">
                                        {t('bioPage.featuredMediaAssetDesc', 'Select a project asset or generate an image for this Bio Page block.')}
                                    </p>
                                </div>
                                <select
                                    value={mediaType}
                                    onChange={(event) => onUpdate({ data: { ...(block.data || {}), mediaType: event.target.value } })}
                                    className="shrink-0 rounded-md border border-q-border bg-q-surface px-2 py-1 text-xs text-foreground outline-none"
                                >
                                    <option value="image">{t('bioPage.image', 'Image')}</option>
                                    <option value="video">{t('bioPage.video', 'Video')}</option>
                                    <option value="file">{t('bioPage.file', 'File')}</option>
                                </select>
                            </div>

                            {mediaType === 'image' ? (
                                <ImagePicker
                                    value={blockUrl}
                                    onChange={(url) => onUpdate({ data: { ...(block.data || {}), url, mediaType: 'image' } })}
                                    onSelectAsset={(asset) => onUpdate({
                                        data: {
                                            ...(block.data || {}),
                                            url: asset.url,
                                            mediaType: asset.type?.startsWith('video/') ? 'video' : 'image',
                                            assetId: asset.id || null,
                                            assetName: asset.name || null,
                                            storagePath: asset.storagePath || null,
                                        },
                                    })}
                                    label={t('bioPage.selectFeaturedMedia', 'Select featured media')}
                                    showAIGeneration={true}
                                    aspectRatio="16:9"
                                    hideUrlInput={true}
                                    destination="user"
                                    contentId={block.id}
                                    contentType="bio_page_block"
                                />
                            ) : (
                                <input
                                    type="url"
                                    value={blockUrl}
                                    onChange={(event) => onUpdate({ data: { ...(block.data || {}), url: event.target.value, mediaType } })}
                                    placeholder={mediaType === 'video' ? 'https://.../video.mp4' : 'https://...'}
                                    className="w-full rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            )}
                        </div>
                    )}

                    {(block.type === 'media_grid' || block.type === 'portfolio_grid') && (
                        <div className="space-y-2 rounded-lg border border-q-border/60 bg-muted/30 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold text-foreground">
                                        {block.type === 'media_grid'
                                            ? t('bioPage.mediaGridAssets', 'Media assets')
                                            : t('bioPage.portfolioAssets', 'Portfolio assets')}
                                    </p>
                                    <p className="text-[11px] text-q-text-muted">
                                        {block.type === 'media_grid'
                                            ? t('bioPage.mediaGridBlockHint', 'Select project media assets for a compact public grid; empty grids stay hidden publicly.')
                                            : t('bioPage.portfolioBlockHint', 'Select project media assets; empty grids stay hidden publicly.')}
                                    </p>
                                </div>
                                <span className="rounded-md bg-q-surface px-2 py-1 text-[11px] font-semibold text-q-text-muted">
                                    {selectedMediaIds.size}
                                </span>
                            </div>

                            {isMediaLoading ? (
                                <div className="flex items-center gap-2 rounded-md border border-dashed border-q-border px-3 py-2 text-[11px] text-q-text-muted">
                                    <Loader2 size={13} className="animate-spin" />
                                    {t('bioPage.loadingMediaAssets', 'Loading media...')}
                                </div>
                            ) : mediaAssets.length ? (
                                <div className="grid grid-cols-3 gap-2">
                                    {mediaAssets.slice(0, 12).map(asset => {
                                        const selected = selectedMediaIds.has(asset.id);
                                        return (
                                            <button
                                                key={asset.id}
                                                type="button"
                                                onClick={() => togglePortfolioAsset(asset)}
                                                className={`group relative aspect-square overflow-hidden rounded-md border transition-colors ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-q-border hover:border-q-border/90'}`}
                                                title={asset.name}
                                            >
                                                {asset.type?.startsWith('video/') ? (
                                                    <div className="flex h-full w-full items-center justify-center bg-q-text/10 text-q-text-muted">
                                                        <Video size={16} />
                                                    </div>
                                                ) : (
                                                    <img src={asset.url} alt={asset.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                                )}
                                                {selected && (
                                                    <span className="absolute right-1 top-1 rounded-full bg-primary p-1 text-primary-foreground">
                                                        <Check size={11} />
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="rounded-md border border-dashed border-q-border px-3 py-2 text-[11px] text-q-text-muted">
                                    {t('bioPage.noMediaAssets', 'No project media assets are available yet. Upload or generate assets from the image picker.')}
                                </p>
                            )}
                        </div>
                    )}

                    {block.type === 'testimonials' && (
                        <div className="space-y-3 rounded-lg border border-q-border/60 bg-muted/30 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold text-foreground">
                                        {t('bioPage.testimonialItems', 'Testimonials')}
                                    </p>
                                    <p className="text-[11px] text-q-text-muted">
                                        {t('bioPage.testimonialItemsHint', 'Add only quotes you can verify.')}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addTestimonialItem}
                                    disabled={testimonialItems.length >= 6}
                                    className="shrink-0 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
                                >
                                    {t('bioPage.addTestimonial', 'Add')}
                                </button>
                            </div>

                            {testimonialItems.length ? (
                                <div className="space-y-2">
                                    {testimonialItems.map((item, index) => {
                                        const quote = typeof item.quote === 'string' ? item.quote : '';
                                        const author = typeof item.author === 'string' ? item.author : '';
                                        const role = typeof item.role === 'string' ? item.role : '';
                                        const rating = typeof item.rating === 'number' ? item.rating : 5;
                                        return (
                                            <div key={`${block.id}-testimonial-${index}`} className="space-y-2 rounded-md border border-q-border/60 bg-q-surface/40 p-2">
                                                <textarea
                                                    value={quote}
                                                    onChange={(event) => updateTestimonialItem(index, { quote: event.target.value })}
                                                    rows={2}
                                                    placeholder={t('bioPage.testimonialQuote', 'Quote')}
                                                    className="w-full resize-none rounded-md bg-muted/50 px-2 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                                />
                                                <div className="grid grid-cols-[1fr_72px_auto] gap-2">
                                                    <input
                                                        value={author}
                                                        onChange={(event) => updateTestimonialItem(index, { author: event.target.value })}
                                                        placeholder={t('bioPage.testimonialAuthor', 'Author')}
                                                        className="min-w-0 rounded-md bg-muted/50 px-2 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                                    />
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={5}
                                                        step={1}
                                                        value={rating}
                                                        onChange={(event) => updateTestimonialItem(index, { rating: Math.min(Math.max(Number(event.target.value) || 5, 1), 5) })}
                                                        className="rounded-md bg-muted/50 px-2 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                                        title={t('bioPage.testimonialRating', 'Rating')}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteTestimonialItem(index)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-md text-q-text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                        title={t('bioPage.deleteTestimonial', 'Delete testimonial')}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                                <input
                                                    value={role}
                                                    onChange={(event) => updateTestimonialItem(index, { role: event.target.value })}
                                                    placeholder={t('bioPage.testimonialRole', 'Role or source')}
                                                    className="w-full rounded-md bg-muted/50 px-2 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="rounded-md border border-dashed border-q-border px-3 py-2 text-[11px] text-q-text-muted">
                                    {t('bioPage.noTestimonials', 'No testimonials yet.')}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        onClick={onPrioritize}
                        className="p-2 rounded-lg text-q-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                        title={t('bioPage.prioritizeBlock', 'Prioritize block')}
                    >
                        <Star size={16} />
                    </button>
                    {canDelete && (
                        <button
                            type="button"
                            onClick={onDuplicate}
                            className="p-2 rounded-lg text-q-text-muted transition-colors hover:bg-muted hover:text-foreground"
                            title={t('bioPage.duplicateBlock', 'Duplicate block')}
                        >
                            <Copy size={16} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onToggle}
                        className={`p-2 rounded-lg transition-colors ${block.visible !== false ? 'bg-q-accent/10 text-q-accent' : 'bg-muted text-q-text-muted'}`}
                        title={block.visible !== false ? t('bioPage.visible', 'Visible') : t('bioPage.hidden', 'Hidden')}
                    >
                        {block.visible !== false ? <Eye size={17} /> : <EyeOff size={17} />}
                    </button>
                    {canDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="p-2 rounded-lg text-q-text-muted transition-colors hover:bg-destructive/20 hover:text-destructive"
                            title={t('bioPage.deleteBlock', 'Delete block')}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// COMPONENT
// =============================================================================

const BioPageBuilder: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { activeProjectId, activeProject } = useProject();
    const { generateImage, hasApiKey, promptForKeySelection } = useAI();
    const { navigate } = useRouter();
    const { user } = useAuth();
    const filesContext = useSafeFiles();

    const {
        openSections: settingsSections,
        toggle: toggleSettingsSection,
        expandAll: expandSettingsSections,
        collapseAll: collapseSettingsSections,
    } = useCollapsibleSections({
        integrationReadiness: true,
        publicRoute: true,
        utm: true,
        seo: true,
        qrBranding: true,
    });

    const {
        canAccessService: canAccessConfiguredService,
        isLoading: isLoadingServiceAvailability,
    } = useServiceAvailability();
    const canAccessService = useCallback((serviceId?: PlatformServiceId | null): boolean => (
        !serviceId || (!isLoadingServiceAvailability && canAccessConfiguredService(serviceId))
    ), [canAccessConfiguredService, isLoadingServiceAvailability]);
    const canAccessEcommerce = canAccessService('ecommerce');
    const canAccessCrm = canAccessService('crm');
    const canAccessAppointments = canAccessService('appointments');
    const canAccessChatbot = canAccessService('chatbot');
    const canAccessEmailMarketing = canAccessService('emailMarketing');
    const canAccessMediaAi = canAccessService('aiFeatures');
    const canAccessAnalytics = canAccessService('analytics');
    const canAccessBioBlockDefinition = useCallback((definition: (typeof BIO_BLOCK_LIBRARY)[number]): boolean => (
        canAccessService(resolveBioSourceServiceId(definition.sourceModule) || BIO_BLOCK_TYPE_SERVICE_MAP[definition.type])
    ), [canAccessService]);
    const canAccessBioBlock = useCallback((block: BioPageBlock): boolean => (
        canAccessService(resolveBioSourceServiceId(block.sourceModule) || BIO_BLOCK_TYPE_SERVICE_MAP[block.type])
    ), [canAccessService]);
    const canAccessBioLink = useCallback((link: ContextBioLink | BioLink): boolean => {
        const linkType = link.linkType as LinkType | undefined;
        const serviceId = (linkType ? BIO_LINK_TYPE_SERVICE_MAP[linkType] : null)
            || (typeof link.platform === 'string' ? BIO_LINK_PLATFORM_SERVICE_MAP[link.platform] : null);
        return canAccessService(serviceId);
    }, [canAccessService]);
    const canAccessBioIntegration = useCallback((integration: Integration): boolean => {
        const serviceId = integration.category === 'commerce'
            ? 'ecommerce'
            : BIO_INTEGRATION_SERVICE_MAP[integration.id] || BIO_INTEGRATION_SERVICE_MAP[integration.platform];
        return canAccessService(serviceId);
    }, [canAccessService]);
    const projectMediaAssets = useMemo<BioMediaAssetOption[]>(() => (
        (filesContext?.files || [])
            .filter(file => file.downloadURL && (file.type?.startsWith('image/') || file.type?.startsWith('video/')))
            .map(file => ({
                id: file.id,
                name: file.name || 'Media asset',
                url: file.downloadURL,
                type: file.type,
                storagePath: file.storagePath,
                source: 'files' as const,
            }))
    ), [filesContext?.files]);

    // Mobile sidebar state
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Active view state
    const [activeTab, setActiveTab] = useState<ActiveTab>('links');
    const [designSubTab, setDesignSubTab] = useState<DesignSubTab>('header');
    const [isControlsPanelOpen, setIsControlsPanelOpen] = useState(true);

    useEffect(() => {
        if (activeTab === 'shop' && !canAccessEcommerce) {
            setActiveTab('blocks');
        }
        if (activeTab === 'audience' && !canAccessEmailMarketing) {
            setActiveTab('blocks');
        }
        if (activeTab === 'analytics' && !canAccessAnalytics) {
            setActiveTab('blocks');
        }
    }, [activeTab, canAccessAnalytics, canAccessEcommerce, canAccessEmailMarketing]);

    // ===== CONTEXT DATA (replaces mock data) =====
    const {
        bioPage,
        isLoading: isLoadingBioPage,
        isSaving,
        hasUnsavedChanges,
        loadBioPage,
        createBioPage,
        saveBioPage,
        links,
        addLink: contextAddLink,
        updateLink: contextUpdateLink,
        deleteLink: contextDeleteLink,
        toggleLink: contextToggleLink,
        reorderLinks: contextReorderLinks,
        duplicateLink: contextDuplicateLink,
        prioritizeLink: contextPrioritizeLink,
        blocks,
        addBlock: contextAddBlock,
        updateBlock: contextUpdateBlock,
        deleteBlock: contextDeleteBlock,
        toggleBlock: contextToggleBlock,
        reorderBlocks: contextReorderBlocks,
        duplicateBlock: contextDuplicateBlock,
        prioritizeBlock: contextPrioritizeBlock,
        profile,
        updateProfile: contextUpdateProfile,
        theme,
        updateTheme: contextUpdateTheme,
        products,
        setProducts,
        emailSignupEnabled,
        setEmailSignupEnabled,
        slug,
        updateSlug,
        seo,
        updateSEO,
        settings,
        updateSettings,
        publishBioPage,
        unpublishBioPage,
    } = useBioPage();

    // AI generation state
    const [isGeneratingBio, setIsGeneratingBio] = useState(false);
    const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

    // Subscriber state for Audience tab
    interface Subscriber {
        id: string;
        email: string;
        name?: string;
        subscribedAt: any;
        source?: string;
    }
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(false);
    const [isDeletingSubscriber, setIsDeletingSubscriber] = useState<string | null>(null);
    const [analyticsSummary, setAnalyticsSummary] = useState<BioPageAnalyticsSummary | null>(null);
    const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('30d');
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [isGeneratingQr, setIsGeneratingQr] = useState(false);
    const [integrationReadiness, setIntegrationReadiness] = useState<BioPageIntegrationReadiness | null>(null);
    const [isLoadingIntegrationReadiness, setIsLoadingIntegrationReadiness] = useState(false);
    const [slugDraft, setSlugDraft] = useState('');
    const [slugAvailability, setSlugAvailability] = useState<SlugAvailabilityState>({ status: 'idle', slug: '' });
    const [availableBioProducts, setAvailableBioProducts] = useState<BioProductOption[]>([]);
    const [availableBioCategories, setAvailableBioCategories] = useState<BioCategoryOption[]>([]);
    const [emailAudiences, setEmailAudiences] = useState<BioAudienceOption[]>([]);
    const [isLoadingBlockIntegrations, setIsLoadingBlockIntegrations] = useState(false);

    const currentBioSlug = slug || bioPage?.slug || bioPage?.username || '';
    const requestedSlugInput = slugDraft || currentBioSlug || profile.displayName || profile.name || activeProject?.name || '';
    const slugValidation = useMemo(() => validateBioSlug(requestedSlugInput), [requestedSlugInput]);
    const normalizedDraftSlug = useMemo(() => normalizeBioSlug(requestedSlugInput), [requestedSlugInput]);
    const publishSlugBlocked = slugAvailability.status !== 'available';

    const getInitialBioPageSlug = useCallback(() => {
        const candidates = [
            slugAvailability.status === 'available' ? slugAvailability.slug : '',
            slugDraft,
            slug,
            bioPage?.slug,
            bioPage?.username,
            profile.displayName,
            profile.name,
            activeProject?.name,
        ];
        const candidate = candidates.find(value => {
            if (typeof value !== 'string') return false;
            const validation = validateBioSlug(value);
            return validation.ok;
        });
        if (candidate) {
            const validation = validateBioSlug(candidate);
            if (validation.ok) return validation.slug;
        }
        return `bio-${Date.now()}`;
    }, [activeProject?.name, bioPage?.slug, bioPage?.username, profile.displayName, profile.name, slug, slugAvailability, slugDraft]);

    useEffect(() => {
        setSlugDraft(slug || bioPage?.slug || bioPage?.username || '');
    }, [slug, bioPage?.slug, bioPage?.username]);

    useEffect(() => {
        if (!requestedSlugInput.trim()) {
            setSlugAvailability({
                status: 'invalid',
                slug: '',
                message: t('bioPage.slugRequired', 'Choose a public slug before publishing.'),
            });
            return;
        }

        if (slugValidation.ok === false) {
            setSlugAvailability({
                status: 'invalid',
                slug: slugValidation.slug,
                message: slugValidation.error,
            });
            return;
        }

        let cancelled = false;
        setSlugAvailability({ status: 'checking', slug: slugValidation.slug });

        const timeoutId = window.setTimeout(async () => {
            try {
                const availability = await isBioSlugAvailable({
                    slug: slugValidation.slug,
                    excludePageId: bioPage?.id || null,
                });
                if (cancelled) return;

                if (availability.ok === true) {
                    setSlugAvailability({ status: 'available', slug: availability.slug });
                    if (availability.slug !== currentBioSlug) {
                        updateSlug(availability.slug);
                    }
                } else {
                    setSlugAvailability({
                        status: 'unavailable',
                        slug: availability.slug,
                        message: availability.error,
                    });
                }
            } catch (error) {
                if (!cancelled) {
                    setSlugAvailability({
                        status: 'error',
                        slug: slugValidation.slug,
                        message: error instanceof Error
                            ? error.message
                            : t('bioPage.slugAvailabilityFailed', 'Could not verify slug availability.'),
                    });
                }
            }
        }, 350);

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [bioPage?.id, currentBioSlug, requestedSlugInput, slugValidation, t, updateSlug]);

    useEffect(() => {
        if (!activeProjectId || !['blocks', 'shop', 'audience'].includes(activeTab)) return;

        let cancelled = false;

        const loadEditorIntegrations = async () => {
            setIsLoadingBlockIntegrations(true);
            try {
                const catalogPromise = canAccessEcommerce
                    ? loadPublicStorefrontCatalog(activeProjectId, { maxProducts: 80 })
                        .then(catalog => ({
                            products: getBioPageEligibleStorefrontProducts(catalog)
                                .map(product => mapStorefrontProductToBioPageProduct(product, activeProjectId) as BioProductOption),
                            categories: catalog.source === 'store-products' ? catalog.categories || [] : [],
                        }))
                    : Promise.resolve({ products: [] as BioProductOption[], categories: [] as BioCategoryOption[] });

                const audiencesPromise = canAccessEmailMarketing
                    ? supabase
                        .from('email_audiences')
                        .select('id,name,description,estimated_count,is_default')
                        .eq('project_id', activeProjectId)
                        .order('created_at', { ascending: false })
                        .limit(50)
                    : Promise.resolve({ data: [], error: null });

                const [nextCatalog, audiencesResult] = await Promise.all([catalogPromise, audiencesPromise]);
                if (cancelled) return;

                setAvailableBioProducts(nextCatalog.products);
                setAvailableBioCategories(nextCatalog.categories);

                if (audiencesResult.error) {
                    console.warn('[BioPageBuilder] Email audiences unavailable:', audiencesResult.error.message);
                    setEmailAudiences([]);
                } else {
                    setEmailAudiences((audiencesResult.data || []).map(row => ({
                        id: String(row.id),
                        name: row.name || 'Audience',
                        description: row.description || undefined,
                        estimatedCount: Number(row.estimated_count || 0),
                        isDefault: row.is_default === true,
                    })));
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn('[BioPageBuilder] Bio Page integrations unavailable:', error);
                    setAvailableBioProducts([]);
                    setAvailableBioCategories([]);
                    setEmailAudiences([]);
                }
            } finally {
                if (!cancelled) setIsLoadingBlockIntegrations(false);
            }
        };

        loadEditorIntegrations();

        return () => {
            cancelled = true;
        };
    }, [activeProjectId, activeTab, canAccessEcommerce, canAccessEmailMarketing]);

    // Load subscribers when Audience tab is active
    useEffect(() => {
        if (activeTab !== 'audience' || !bioPage?.id || !canAccessEmailMarketing) return;

        const loadSubscribers = async () => {
            setIsLoadingSubscribers(true);
            try {
                const { data, error } = await supabase
                    .from('bio_page_subscribers')
                    .select('*')
                    .eq('bio_page_id', bioPage.id)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                const subs = (data || []).map(row => ({
                    id: row.id,
                    email: row.email,
                    name: row.name,
                    subscribedAt: row.subscribed_at || row.created_at,
                    source: row.source,
                } as Subscriber));
                setSubscribers(subs);
            } catch (err) {
                console.error('[BioPageBuilder] Error loading subscribers:', err);
            } finally {
                setIsLoadingSubscribers(false);
            }
        };

        loadSubscribers();
    }, [activeTab, bioPage?.id, canAccessEmailMarketing]);

    useEffect(() => {
        if (activeTab !== 'analytics' || !bioPage?.id || !canAccessAnalytics) return;

        let cancelled = false;
        setIsLoadingAnalytics(true);
        getBioPageAnalytics({
            page: bioPage as any,
            dateFrom: getAnalyticsDateFrom(analyticsRange),
        })
            .then(summary => {
                if (!cancelled) setAnalyticsSummary(summary);
            })
            .catch(error => {
                if (!cancelled) {
                    console.error('[BioPageBuilder] Error loading analytics:', error);
                    setAnalyticsSummary(null);
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoadingAnalytics(false);
            });

        return () => {
            cancelled = true;
        };
    }, [activeTab, bioPage, analyticsRange, canAccessAnalytics]);

    useEffect(() => {
        if (!bioPage?.id || !['settings', 'share', 'analytics'].includes(activeTab)) return;

        let cancelled = false;
        setIsLoadingIntegrationReadiness(true);

        getBioPageIntegrationReadiness({
            ...(bioPage as any),
            slug: slug || bioPage.slug || bioPage.username,
            username: slug || bioPage.username || bioPage.slug,
            profile,
            theme,
            links,
            blocks,
            products,
            emailSignupEnabled,
            seo,
            settings: {
                ...(bioPage.settings || {}),
                ...settings,
            },
            isPublished: bioPage.isPublished,
            status: bioPage.status,
        })
            .then(readiness => {
                if (!cancelled) setIntegrationReadiness(readiness);
            })
            .catch(error => {
                if (!cancelled) {
                    console.warn('[BioPageBuilder] Integration readiness unavailable:', error);
                    setIntegrationReadiness(null);
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoadingIntegrationReadiness(false);
            });

        return () => {
            cancelled = true;
        };
    }, [
        activeTab,
        bioPage,
        slug,
        profile,
        theme,
        links,
        blocks,
        products,
        emailSignupEnabled,
        seo,
        settings,
    ]);

    // Delete a subscriber
    const handleDeleteSubscriber = async (subscriberId: string) => {
        if (!bioPage?.id || !canAccessEmailMarketing) return;
        setIsDeletingSubscriber(subscriberId);
        try {
            const { error } = await supabase
                .from('bio_page_subscribers')
                .delete()
                .eq('bio_page_id', bioPage.id)
                .eq('id', subscriberId);
            if (error) throw error;
            setSubscribers(prev => prev.filter(s => s.id !== subscriberId));
        } catch (err) {
            console.error('[BioPageBuilder] Error deleting subscriber:', err);
        } finally {
            setIsDeletingSubscriber(null);
        }
    };

    // Set active undo module
    const undoContext = useSafeUndo();
    useEffect(() => {
        if (undoContext?.setActiveModule) {
            undoContext.setActiveModule('bio-page');
        }
    }, [undoContext?.setActiveModule]);

    // ===== INITIALIZATION: Load or create bio page =====
    React.useEffect(() => {
        const initializeBioPage = async () => {
            if (!activeProjectId) return;

            // Try to load existing bio page
            await loadBioPage(activeProjectId);
        };

        initializeBioPage();
    }, [activeProjectId, loadBioPage]);

    // Set profile name from project if empty
    React.useEffect(() => {
        if (bioPage && !profile.name && activeProject?.name) {
            contextUpdateProfile({ name: activeProject.name });
        }
    }, [bioPage, profile.name, activeProject?.name, contextUpdateProfile]);

    // ===== DRAG AND DROP SENSORS =====
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handle drag end for link reordering
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const sortedLinks = [...links].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            const oldIndex = sortedLinks.findIndex(link => link.id === active.id);
            const newIndex = sortedLinks.findIndex(link => link.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const reorderedIds = arrayMove(
                    sortedLinks.map(l => l.id),
                    oldIndex,
                    newIndex
                );
                // Call context reorderLinks to persist to Supabase
                contextReorderLinks(reorderedIds);
            }
        }
    }, [links, contextReorderLinks]);

    const handleBlockDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);
        const oldIndex = sortedBlocks.findIndex(block => block.id === active.id);
        const newIndex = sortedBlocks.findIndex(block => block.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        contextReorderBlocks(arrayMove(sortedBlocks.map(block => block.id), oldIndex, newIndex));
    }, [blocks, contextReorderBlocks]);


    // Add Link Modal state
    const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
    const [addLinkSearch, setAddLinkSearch] = useState('');
    const [addLinkCategory, setAddLinkCategory] = useState<LinkCategory>('suggested');

    // Form Configuration Modal state
    const [isFormConfigOpen, setIsFormConfigOpen] = useState(false);
    const [selectedFormIntegration, setSelectedFormIntegration] = useState<Integration | null>(null);
    const [formConfigTab, setFormConfigTab] = useState<'settings' | 'layout'>('settings');
    const [selectedFormTemplate, setSelectedFormTemplate] = useState<string>('email-signup');
    const [selectedFormLayout, setSelectedFormLayout] = useState<'classic' | 'featured'>('classic');

    // Profile Edit Modal state
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [isEnhancingBio, setIsEnhancingBio] = useState(false);

    // Chatbot Preview Modal state
    const [isChatbotPreviewOpen, setIsChatbotPreviewOpen] = useState(false);

    // Notification Modal state
    const [notificationModal, setNotificationModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'success'
    });

    // ==========================================================================
    // HANDLERS
    // ==========================================================================

    const openAddLinkModal = () => {
        setAddLinkSearch('');
        setAddLinkCategory('suggested');
        setIsAddLinkModalOpen(true);
    };

    const closeAddLinkModal = () => {
        setIsAddLinkModalOpen(false);
        setAddLinkSearch('');
    };

    const addLink = (linkType: LinkType = 'link', platform?: string, integration?: Integration) => {
        // Use special title for chatbot
        const defaultTitle = linkType === 'chatbot' ? 'Chat with me' : (integration?.name || 'New Link');

        contextAddLink({
            title: defaultTitle,
            url: '',
            linkType,
            platform: platform || integration?.platform,
        });
        closeAddLinkModal();
        closeFormConfig();
    };

    // Form integrations that should open the config modal
    const FORM_INTEGRATION_IDS = ['form', 'contact-form', 'email-signup', 'sms-signup', 'typeform', 'laylo'];

    const addIntegrationLink = (integration: Integration) => {
        if (!canAccessBioIntegration(integration)) return;

        // Check if this is a form-type integration
        if (FORM_INTEGRATION_IDS.includes(integration.id)) {
            openFormConfig(integration);
        } else {
            // Use integration's linkType if provided (for chatbot), otherwise use 'social'
            const linkType = integration.linkType || 'social';
            addLink(linkType, integration.platform, integration);
        }
    };

    // Form Configuration Modal handlers
    const openFormConfig = (integration: Integration) => {
        if (!canAccessBioIntegration(integration)) return;

        setSelectedFormIntegration(integration);
        setFormConfigTab('settings');
        setSelectedFormTemplate(canAccessEmailMarketing ? 'email-signup' : 'contact-form');
        setSelectedFormLayout('classic');
        setIsFormConfigOpen(true);
    };

    const closeFormConfig = () => {
        setIsFormConfigOpen(false);
        setSelectedFormIntegration(null);
    };

    const handleAddForm = () => {
        if (
            selectedFormIntegration
            && canAccessBioIntegration(selectedFormIntegration)
            && canAccessService(BIO_LINK_PLATFORM_SERVICE_MAP[selectedFormTemplate])
        ) {
            contextAddLink({
                title: FORM_TEMPLATES.find(t => t.id === selectedFormTemplate)?.name || 'Form',
                url: '',
                linkType: 'form',
                platform: selectedFormTemplate,
            });
            closeFormConfig();
            closeAddLinkModal();
        }
    };

    const handleAddLinkFromSearch = () => {
        // If search contains a URL, create a link with that URL
        const isUrl = addLinkSearch.startsWith('http://') || addLinkSearch.startsWith('https://') || addLinkSearch.includes('.');
        contextAddLink({
            title: isUrl ? 'New Link' : addLinkSearch || 'New Link',
            url: isUrl ? (addLinkSearch.startsWith('http') ? addLinkSearch : `https://${addLinkSearch}`) : '',
            linkType: 'link',
        });
        closeAddLinkModal();
    };

    // Get filtered integrations based on category, search, and service availability
    const filteredIntegrations = useMemo(() => {
        let filtered = INTEGRATIONS.filter(canAccessBioIntegration);

        if (addLinkCategory !== 'all' && addLinkCategory !== 'suggested') {
            filtered = filtered.filter(i => i.category === addLinkCategory);
        }

        if (addLinkSearch) {
            const searchLower = addLinkSearch.toLowerCase();
            filtered = filtered.filter(i =>
                i.name.toLowerCase().includes(searchLower) ||
                i.description.toLowerCase().includes(searchLower)
            );
        }

        return filtered;
    }, [addLinkCategory, addLinkSearch, canAccessBioIntegration]);

    const updateLink = (id: string, updates: Partial<BioLink>) => {
        contextUpdateLink(id, updates);
    };

    const deleteLink = (id: string) => {
        contextDeleteLink(id);
    };

    const duplicateLink = (id: string) => {
        contextDuplicateLink(id);
    };

    const prioritizeLink = (id: string) => {
        contextPrioritizeLink(id);
    };

    const addBioBlock = (definition: (typeof BIO_BLOCK_LIBRARY)[number]) => {
        if (!canAccessBioBlockDefinition(definition)) return;

        const copy = getBioBlockDefinitionCopy(definition, t);
        contextAddBlock({
            type: definition.type,
            title: copy.label,
            description: copy.description,
            sourceModule: definition.sourceModule,
            data: definition.data || {},
            status: 'configured',
            visible: true,
        });
        if (definition.type === 'email_subscribe') setEmailSignupEnabled(true);
    };

    const toggleBioBlock = (block: BioPageBlock) => {
        contextToggleBlock(block.id);
        if (block.type === 'email_subscribe') setEmailSignupEnabled(block.visible === false);
    };

    const deleteBioBlock = (block: BioPageBlock) => {
        contextDeleteBlock(block.id);
        if (block.type === 'email_subscribe' && blocks.filter(item => item.id !== block.id).every(item => item.type !== 'email_subscribe')) {
            setEmailSignupEnabled(false);
        }
    };

    const duplicateBioBlock = (block: BioPageBlock) => {
        contextDuplicateBlock(block.id);
        if (block.type === 'email_subscribe') setEmailSignupEnabled(true);
    };

    const prioritizeBioBlock = (block: BioPageBlock) => {
        contextPrioritizeBlock(block.id);
    };

    const applyThemePreset = (presetId: string) => {
        const preset = THEME_PRESETS.find(p => p.id === presetId);
        if (preset) {
            contextUpdateTheme({
                preset: presetId,
                backgroundColor: preset.bg,
                buttonColor: preset.button,
                textColor: preset.text,
            });
        }
    };

    const handleGenerateAvatar = async () => {
        if (!hasApiKey) {
            promptForKeySelection();
            return;
        }
        setIsGeneratingAvatar(true);
        try {
            const avatarUrl = await generateImage(`Professional avatar for ${profile.name}, modern minimalist style`);
            if (avatarUrl) {
                contextUpdateProfile({ avatarUrl });
            }
        } catch (error) {
            console.error('Failed to generate avatar:', error);
        } finally {
            setIsGeneratingAvatar(false);
        }
    };

    // Profile Modal handlers
    const openProfileModal = () => {
        setProfileImageUrl(profile.avatarUrl || '');
        setIsProfileModalOpen(true);
    };

    const closeProfileModal = () => {
        setIsProfileModalOpen(false);
    };

    const handleAvatarSelected = (url: string) => {
        contextUpdateProfile({ avatarUrl: url });
        setProfileImageUrl(url);
        setShowImagePicker(false);
        setIsProfileModalOpen(true);
    };

    const handleEnhanceBio = async () => {
        if (!profile.bio.trim()) return;

        setIsEnhancingBio(true);
        try {
            const currentLang = i18n.language?.startsWith('es') ? 'Spanish' : 'English';
            const prompt = `You are an expert copywriter specializing in "Link in Bio" profiles for maximum engagement and conversion.

Rewrite this bio description following these best practices:
- WRITE IN ${currentLang.toUpperCase()} LANGUAGE ONLY
- Keep it under 150 characters (CRITICAL - must be concise)
- Start with a hook or value proposition
- Include a clear call-to-action or benefit
- Use emojis strategically (1-2 max)
- Make it personal and authentic
- Optimize for link clicks and engagement
- Create curiosity or urgency

Original bio: "${profile.bio}"
Name: "${profile.name}"

Return ONLY the improved bio text in ${currentLang}, nothing else. No quotes, no explanation.`;

            const projectId = activeProjectId || 'bio-page-builder';
            const response = await generateContentViaProxy(projectId, prompt, 'gemini-2.5-flash', {}, user?.id);
            const enhancedBio = extractTextFromResponse(response);

            if (enhancedBio && enhancedBio.trim()) {
                // Ensure it's within 150 chars
                const finalBio = enhancedBio.trim().slice(0, 150);
                contextUpdateProfile({ bio: finalBio });
            }
        } catch (error) {
            console.error('Failed to enhance bio:', error);
        } finally {
            setIsEnhancingBio(false);
        }
    };

    // ==========================================================================
    // NAV ITEMS
    // ==========================================================================

    const navItems = [
        { id: 'links', icon: Link2, label: t('bioPage.links', 'Links') },
        { id: 'blocks', icon: Layers, label: t('bioPage.blocks', 'Blocks') },
        { id: 'design', icon: Palette, label: t('bioPage.design', 'Design') },
        // Service availability: hide Shop tab when ecommerce service is off
        ...(canAccessEcommerce ? [{ id: 'shop', icon: ShoppingBag, label: t('bioPage.shop', 'Shop') }] : []),
        ...(canAccessAnalytics ? [{ id: 'analytics', icon: BarChart3, label: t('bioPage.analytics', 'Analytics') }] : []),
        ...(canAccessEmailMarketing ? [{ id: 'audience', icon: Users, label: t('bioPage.audience', 'Audience') }] : []),
        { id: 'settings', icon: Settings, label: t('bioPage.settings', 'Settings') },
        { id: 'share', icon: QrCode, label: t('bioPage.share', 'Share') },
    ];

    // Service availability: filter Commerce category from link categories
    const effectiveLinkCategories = useMemo(() => {
        if (canAccessEcommerce) return LINK_CATEGORIES;
        return LINK_CATEGORIES.filter(c => c.id !== 'commerce');
    }, [canAccessEcommerce]);

    // ==========================================================================
    // RENDER HELPERS
    // ==========================================================================

    const renderLinksEditor = () => {
        const sortedLinks = links
            .filter(canAccessBioLink)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        return (
        <div className="space-y-4">
            {/* Add Link Button */}
            <button
                onClick={openAddLinkModal}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-dashed border-q-border/80 rounded-lg text-sm font-medium text-q-accent hover:bg-q-accent/10 hover:border-q-accent/40 transition-all"
            >
                <Plus size={20} />
                {t('bioPage.addLink', 'Add Link')}
            </button>

            {/* Links List with Drag and Drop */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={sortedLinks.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2">
                        {sortedLinks.map((link) => (
                            <SortableLinkItem
                                key={link.id}
                                link={link}
                                onUpdate={(updates) => updateLink(link.id, updates)}
                                onDelete={() => deleteLink(link.id)}
                                onToggle={() => updateLink(link.id, { enabled: !link.enabled })}
                                onMarkReviewed={() => updateLink(link.id, { needsReview: false, userModified: true })}
                                onDuplicate={() => duplicateLink(link.id)}
                                onPrioritize={() => prioritizeLink(link.id)}
                                t={t}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
        );
    };

    const renderBlocksEditor = () => {
        const sortedBlocks = blocks
            .filter(canAccessBioBlock)
            .sort((a, b) => a.order - b.order);
        const socialIconLinks = links.filter(link => canAccessBioLink(link) && link.enabled !== false && link.visible !== false && isSocialIconLink(link));
        const blockDefinitions = BIO_BLOCK_LIBRARY.filter(canAccessBioBlockDefinition);

        return (
            <div className="space-y-5">
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">
                                {t('bioPage.blockLibrary', 'Block library')}
                            </h3>
                            <p className="text-xs text-q-text-muted">
                                {t('bioPage.blockLibraryDesc', 'Add funnel blocks connected to Quimera systems.')}
                            </p>
                        </div>
                        {isLoadingBlockIntegrations && (
                            <Loader2 size={16} className="shrink-0 animate-spin text-q-text-muted" />
                        )}
                    </div>
                    {(canAccessEcommerce || canAccessEmailMarketing || canAccessMediaAi) && (
                        <div className="grid grid-cols-3 gap-2">
                            {canAccessEcommerce && (
                                <div className="rounded-lg border border-q-border/60 bg-q-surface/40 px-3 py-2">
                                    <p className="text-[11px] font-semibold uppercase text-q-text-muted">
                                        {t('bioPage.ecommerceProducts', 'Products')}
                                    </p>
                                    <p className="text-sm font-semibold text-foreground">{availableBioProducts.length}</p>
                                </div>
                            )}
                            {canAccessEmailMarketing && (
                                <div className="rounded-lg border border-q-border/60 bg-q-surface/40 px-3 py-2">
                                    <p className="text-[11px] font-semibold uppercase text-q-text-muted">
                                        {t('bioPage.emailAudiences', 'Audiences')}
                                    </p>
                                    <p className="text-sm font-semibold text-foreground">{emailAudiences.length}</p>
                                </div>
                            )}
                            {canAccessMediaAi && (
                                <div className="rounded-lg border border-q-border/60 bg-q-surface/40 px-3 py-2">
                                    <p className="text-[11px] font-semibold uppercase text-q-text-muted">
                                        {t('bioPage.mediaAssets', 'Media')}
                                    </p>
                                    <p className="text-sm font-semibold text-foreground">{projectMediaAssets.length}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-2">
                        {blockDefinitions.map(definition => {
                                const Icon = definition.icon;
                                const copy = getBioBlockDefinitionCopy(definition, t);
                                return (
                                    <button
                                        key={definition.type}
                                        onClick={() => addBioBlock(definition)}
                                        className="flex items-center gap-3 rounded-lg border border-q-border/70 bg-q-surface/40 p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                                    >
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <Icon size={17} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold text-foreground">{copy.label}</span>
                                            <span className="block truncate text-xs text-q-text-muted">{copy.description}</span>
                                        </span>
                                        <Plus size={16} className="text-q-text-muted" />
                                    </button>
                                );
                            })}
                    </div>
                </div>

                <div className="space-y-3 border-t border-q-border pt-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                            {t('bioPage.pageBlocks', 'Page blocks')}
                        </h3>
                        <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-q-text-muted">
                            {sortedBlocks.length}
                        </span>
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleBlockDragEnd}
                    >
                        <SortableContext
                            items={sortedBlocks.map(block => block.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {sortedBlocks.map(block => (
                                    <SortableBlockItem
                                        key={block.id}
                                        block={block}
                                        canDelete={!['profile', 'link'].includes(block.type)}
                                        availableProducts={availableBioProducts}
                                        availableCategories={availableBioCategories}
                                        emailAudiences={emailAudiences}
                                        mediaAssets={projectMediaAssets}
                                        socialLinks={socialIconLinks}
                                        isMediaLoading={filesContext?.isFilesLoading || false}
                                        onUpdate={(updates) => contextUpdateBlock(block.id, updates)}
                                        onDelete={() => deleteBioBlock(block)}
                                        onToggle={() => toggleBioBlock(block)}
                                        onMarkReviewed={() => contextUpdateBlock(block.id, {
                                            needsReview: false,
                                            status: block.visible === false ? 'hidden' : 'configured',
                                            userModified: true,
                                        })}
                                        onDuplicate={() => duplicateBioBlock(block)}
                                        onPrioritize={() => prioritizeBioBlock(block)}
                                        t={t}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {!sortedBlocks.length && (
                        <div className="rounded-lg border border-dashed border-q-border p-6 text-center">
                            <Layers size={28} className="mx-auto mb-2 text-q-text-muted/50" />
                            <p className="text-sm text-q-text-muted">
                                {t('bioPage.noBlocks', 'No blocks yet. Add one from the library.')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const DESIGN_SECTIONS = [
        { id: 'header' as const, icon: User, label: t('bioPage.header', 'Header') },
        { id: 'theme' as const, icon: Palette, label: t('bioPage.theme', 'Theme') },
        { id: 'wallpaper' as const, icon: Image, label: t('bioPage.wallpaper', 'Wallpaper') },
        { id: 'text' as const, icon: Type, label: t('bioPage.text', 'Text') },
        { id: 'buttons' as const, icon: Square, label: t('bioPage.buttons', 'Buttons') },
        { id: 'color' as const, icon: Palette, label: t('bioPage.colors', 'Colors') },
    ];

    const renderDesignEditor = () => {
        const FONT_OPTIONS = [
            'Ubuntu', 'Open Sans'
        ];

        return (
                <div className="space-y-4">
                    {/* HEADER SECTION */}
                    {designSubTab === 'header' && (
                        <div className="space-y-4">
                            {/* Profile Image Layout */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                    {t('bioPage.profileImageLayout', 'Profile image layout')}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => contextUpdateTheme({ profileLayout: 'circle' })}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme.profileLayout === 'circle'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-q-border hover:border-muted-foreground'
                                            }`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-muted" />
                                        <span className="text-xs font-medium">{t('bioPage.circle', 'Circle')}</span>
                                    </button>
                                    <button
                                        onClick={() => contextUpdateTheme({ profileLayout: 'hero' })}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme.profileLayout === 'hero'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-q-border hover:border-muted-foreground'
                                            }`}
                                    >
                                        <div className="w-full h-8 rounded-lg bg-muted" />
                                        <span className="text-xs font-medium">{t('bioPage.hero', 'Hero')}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Title Style */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                    {t('bioPage.titleStyle', 'Title style')}
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => contextUpdateTheme({ titleStyle: 'text' })}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme.titleStyle === 'text'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-q-border hover:border-muted-foreground'
                                            }`}
                                    >
                                        <span className="text-lg font-bold">Aa</span>
                                        <span className="text-[10px] font-medium">{t('bioPage.text', 'Text')}</span>
                                    </button>
                                    <button
                                        onClick={() => contextUpdateTheme({ titleStyle: 'logo' })}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme.titleStyle === 'logo'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-q-border hover:border-muted-foreground'
                                            }`}
                                    >
                                        <Image size={20} className="text-q-text-muted" />
                                        <span className="text-[10px] font-medium">{t('bioPage.logo', 'Logo')}</span>
                                    </button>
                                    <button
                                        onClick={() => contextUpdateTheme({ titleStyle: 'both' })}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme.titleStyle === 'both'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-q-border hover:border-muted-foreground'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center gap-0.5">
                                            <Image size={14} className="text-q-text-muted" />
                                            <span className="text-[10px] font-bold leading-none">Aa</span>
                                        </div>
                                        <span className="text-[10px] font-medium">{t('bioPage.both', 'Both')}</span>
                                    </button>
                                </div>

                                {/* Logo Upload - Shows when logo or both is selected */}
                                {(theme.titleStyle === 'logo' || theme.titleStyle === 'both') && (
                                    <div className="pt-3 space-y-2">
                                        <label className="text-xs font-medium text-q-text-muted">
                                            {t('bioPage.uploadLogo', 'Upload your logo')}
                                        </label>
                                        <ImagePicker
                                            value={profile.logoUrl || ''}
                                            onChange={(url) => contextUpdateProfile({ logoUrl: url })}
                                            label={t('bioPage.selectLogo', 'Select logo image')}
                                            showAIGeneration={true}
                                            aspectRatio="1:1"
                                            hideUrlInput={true}
                                        />
                                        {profile.logoUrl && (
                                            <div className="relative w-24 h-24 mx-auto rounded-lg overflow-hidden bg-muted/50">
                                                <img
                                                    src={profile.logoUrl}
                                                    alt="Logo preview"
                                                    className="w-full h-full object-contain"
                                                />
                                                <button
                                                    onClick={() => contextUpdateProfile({ logoUrl: '' })}
                                                    className="absolute top-1 right-1 p-1 rounded bg-q-text/50 hover:bg-q-text/70 text-white"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Size */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                    {t('bioPage.size', 'Size')}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['small', 'large'] as const).map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => contextUpdateTheme({ profileSize: size })}
                                            className={`py-3 px-4 rounded-xl border-2 transition-all ${theme.profileSize === size
                                                ? 'border-primary bg-primary/5'
                                                : 'border-q-border hover:border-muted-foreground'
                                                }`}
                                        >
                                            <span className="text-sm font-medium capitalize">{t(`bioPage.${size}`, size)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title Font */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                    {t('bioPage.titleFont', 'Title font')}
                                </label>
                                <AppSelect
                                    value={theme.titleFont}
                                    onChange={(e) => contextUpdateTheme({ titleFont: e.target.value })}
                                    className="w-full bg-muted/50 rounded-lg px-3 py-2.5 text-sm text-foreground border border-q-border focus:ring-2 focus:ring-primary/50 outline-none"
                                >
                                    {FONT_OPTIONS.map(font => (
                                        <option key={font} value={font}>{font}</option>
                                    ))}
                                </AppSelect>
                            </div>

                            {/* Title Font Color */}
                            <ColorControl
                                label={t('bioPage.titleFontColor', 'Title font color')}
                                value={theme.titleColor}
                                onChange={(value) => contextUpdateTheme({ titleColor: value })}
                            />
                        </div>
                    )}

                    {/* THEME SECTION */}
                    {designSubTab === 'theme' && (
                        <div className="space-y-4">
                            {/* Theme Presets Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                {THEME_PRESETS.map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => applyThemePreset(preset.id)}
                                        className={`relative aspect-[4/5] rounded-xl border-2 overflow-hidden transition-all ${theme.preset === preset.id
                                            ? 'border-primary ring-2 ring-primary/20'
                                            : 'border-q-border hover:border-muted-foreground'
                                            }`}
                                        style={{ backgroundColor: preset.bg }}
                                    >
                                        <div className="absolute inset-0 p-3 flex flex-col items-center justify-center gap-2">
                                            <span className="text-xl font-bold" style={{ color: preset.text }}>Aa</span>
                                            <div
                                                className="w-full h-6 rounded-lg"
                                                style={{ backgroundColor: preset.button }}
                                            />
                                        </div>
                                        {theme.preset === preset.id && (
                                            <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                                <Check size={12} className="text-primary-foreground" />
                                            </div>
                                        )}
                                        <span className="absolute bottom-2 left-0 right-0 text-[10px] font-medium text-center" style={{ color: preset.text }}>
                                            {preset.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* WALLPAPER SECTION */}
                    {designSubTab === 'wallpaper' && (
                        <div className="space-y-4">
                            {/* Wallpaper Style */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                    {t('bioPage.wallpaperStyle', 'Wallpaper style')}
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['solid', 'gradient', 'blur', 'pattern', 'image', 'video'] as const).map((style) => (
                                        <button
                                            key={style}
                                            onClick={() => contextUpdateTheme({ backgroundType: style })}
                                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme.backgroundType === style
                                                ? 'border-primary bg-primary/5'
                                                : 'border-q-border hover:border-muted-foreground'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg ${style === 'solid' ? 'bg-muted' :
                                                style === 'gradient' ? 'bg-gradient-to-br from-primary/50 to-secondary' :
                                                    style === 'blur' ? 'bg-muted/50 backdrop-blur' :
                                                        style === 'pattern' ? 'bg-muted' :
                                                            style === 'image' ? 'bg-muted flex items-center justify-center' :
                                                                'bg-muted flex items-center justify-center'
                                                }`}>
                                                {style === 'image' && <Image size={14} className="text-q-text-muted" />}
                                                {style === 'video' && <Video size={14} className="text-q-text-muted" />}
                                            </div>
                                            <span className="text-[10px] font-medium capitalize">{t(`bioPage.${style}`, style)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Background Color */}
                            <ColorControl
                                label={t('bioPage.backgroundColor', 'Background color')}
                                value={theme.backgroundColor}
                                onChange={(value) => contextUpdateTheme({ backgroundColor: value })}
                            />

                            {/* Gradient Color (shown for gradient type) */}
                            {theme.backgroundType === 'gradient' && (
                                <ColorControl
                                    label={t('bioPage.gradientColor', 'Gradient end color')}
                                    value={theme.gradientColor || '#1a1a2e'}
                                    onChange={(value) => contextUpdateTheme({ gradientColor: value })}
                                />
                            )}

                            {/* Pattern Options (shown for pattern type) */}
                            {theme.backgroundType === 'pattern' && (
                                <div className="space-y-4">
                                    {/* Pattern Type Selection */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                            {t('bioPage.patternType', 'Pattern type')}
                                        </label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['dots', 'grid', 'diagonal', 'waves'] as const).map((pattern) => (
                                                <button
                                                    key={pattern}
                                                    onClick={() => contextUpdateTheme({ backgroundPattern: pattern })}
                                                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${(theme.backgroundPattern || 'dots') === pattern
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-q-border hover:border-muted-foreground'
                                                        }`}
                                                >
                                                    <div
                                                        className="w-10 h-10 rounded-lg"
                                                        style={{
                                                            backgroundColor: theme.backgroundColor || '#1a1a2e',
                                                            backgroundImage:
                                                                pattern === 'dots' ? `radial-gradient(${theme.buttonColor}40 1px, transparent 1px)` :
                                                                    pattern === 'grid' ? `linear-gradient(${theme.buttonColor}20 1px, transparent 1px), linear-gradient(90deg, ${theme.buttonColor}20 1px, transparent 1px)` :
                                                                        pattern === 'diagonal' ? `repeating-linear-gradient(45deg, transparent, transparent 5px, ${theme.buttonColor}15 5px, ${theme.buttonColor}15 6px)` :
                                                                            `repeating-linear-gradient(0deg, ${theme.buttonColor}10 0px, ${theme.buttonColor}10 2px, transparent 2px, transparent 8px)`,
                                                            backgroundSize:
                                                                pattern === 'dots' ? '10px 10px' :
                                                                    pattern === 'grid' ? '10px 10px' :
                                                                        pattern === 'diagonal' ? '15px 15px' :
                                                                            '100% 10px',
                                                        }}
                                                    />
                                                    <span className="text-[10px] font-medium capitalize">
                                                        {t(`bioPage.pattern.${pattern}`, pattern)}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Pattern Color */}
                                    <ColorControl
                                        label={t('bioPage.patternColor', 'Pattern color')}
                                        value={theme.patternColor || theme.buttonColor}
                                        onChange={(value) => contextUpdateTheme({ patternColor: value })}
                                    />

                                    {/* Pattern Size */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                            {t('bioPage.patternSize', 'Pattern size')}
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="range"
                                                min="10"
                                                max="50"
                                                value={theme.patternSize || 20}
                                                onChange={(e) => contextUpdateTheme({ patternSize: parseInt(e.target.value) })}
                                                className="flex-1 accent-primary"
                                            />
                                            <span className="text-sm text-q-text-muted w-8 text-right">
                                                {theme.patternSize || 20}px
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Background Image (shown for image type) */}
                            {theme.backgroundType === 'image' && (
                                <div className="space-y-4">
                                    {/* Section Title */}
                                    <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                        {t('bioPage.backgroundImage', 'Background image')}
                                    </label>

                                    {/* Contrast Overlay Controls - Above Image */}
                                    <div className="p-4 rounded-xl border border-q-border/50 bg-q-surface/30 space-y-3">
                                        {/* Toggle Row */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-black/60 to-transparent flex items-center justify-center">
                                                    <Layers size={16} className="text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {t('bioPage.headerOverlay', 'Contrast overlay')}
                                                    </p>
                                                    <p className="text-xs text-q-text-muted">
                                                        {t('bioPage.headerOverlayDesc', 'Better text readability')}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => contextUpdateTheme({ headerOverlay: !theme.headerOverlay })}
                                                className={`relative w-11 h-6 rounded-full transition-colors ${theme.headerOverlay ? 'bg-primary' : 'bg-muted'
                                                    }`}
                                            >
                                                <span
                                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-q-surface rounded-full shadow-sm transition-transform ${theme.headerOverlay ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Color Picker - Shows when overlay enabled */}
                                        {theme.headerOverlay && (
                                            <div className="pt-3 border-t border-q-border/50">
                                                <ColorControl
                                                    label={t('bioPage.overlayColor', 'Overlay color')}
                                                    value={theme.headerOverlayColor || '#000000'}
                                                    onChange={(value) => contextUpdateTheme({ headerOverlayColor: value })}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Profile Box Controls */}
                                    <div className="p-4 rounded-xl border border-q-border/50 bg-q-surface/30 space-y-3">
                                        {/* Toggle Row */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center border border-q-border/50">
                                                    <Square size={16} className="text-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {t('bioPage.profileBox', 'Profile box')}
                                                    </p>
                                                    <p className="text-xs text-q-text-muted">
                                                        {t('bioPage.profileBoxDesc', 'Card behind name & bio')}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => contextUpdateTheme({ profileBox: !theme.profileBox })}
                                                className={`relative w-11 h-6 rounded-full transition-colors ${theme.profileBox ? 'bg-primary' : 'bg-muted'
                                                    }`}
                                            >
                                                <span
                                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-q-surface rounded-full shadow-sm transition-transform ${theme.profileBox ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Options when enabled */}
                                        {theme.profileBox && (
                                            <div className="pt-3 border-t border-q-border/50 space-y-4">
                                                {/* Color Picker */}
                                                <ColorControl
                                                    label={t('bioPage.profileBoxColor', 'Box color')}
                                                    value={theme.profileBoxColor || '#000000'}
                                                    onChange={(value) => contextUpdateTheme({ profileBoxColor: value })}
                                                />

                                                {/* Corner Radius - Same style as buttons */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-q-text-muted">
                                                        {t('bioPage.profileBoxCorners', 'Corners')}
                                                    </label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {(['none', 'sm', 'md', 'lg'] as const).map((radius) => (
                                                            <button
                                                                key={radius}
                                                                onClick={() => contextUpdateTheme({ profileBoxRadius: radius })}
                                                                className={`p-2 rounded-lg border transition-colors ${(theme.profileBoxRadius || 'md') === radius
                                                                    ? 'border-primary bg-primary/10'
                                                                    : 'border-q-border hover:border-muted-foreground'
                                                                    }`}
                                                            >
                                                                <div
                                                                    className="w-full aspect-[2/1] bg-muted-foreground/30"
                                                                    style={{
                                                                        borderRadius: radius === 'none' ? '0px' : radius === 'sm' ? '4px' : radius === 'md' ? '8px' : '16px'
                                                                    }}
                                                                />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Image Picker */}
                                    <ImagePicker
                                        value={theme.backgroundImage || ''}
                                        onChange={(url) => contextUpdateTheme({ backgroundImage: url })}
                                        label={t('bioPage.selectBackgroundImage', 'Select background image')}
                                        showAIGeneration={true}
                                        aspectRatio="16:9"
                                        hideUrlInput={true}
                                    />

                                    {/* Image Preview with Remove Button */}
                                    {theme.backgroundImage && (
                                        <div className="relative rounded-xl overflow-hidden aspect-video bg-muted/50">
                                            <img
                                                src={theme.backgroundImage}
                                                alt="Background preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                onClick={() => contextUpdateTheme({ backgroundImage: '' })}
                                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-q-text/50 hover:bg-q-text/70 text-white transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Background Video (shown for video type) */}
                            {theme.backgroundType === 'video' && (
                                <div className="space-y-4">
                                    {/* Section Title */}
                                    <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                        {t('bioPage.backgroundVideo', 'Background video')}
                                    </label>

                                    {/* Contrast Overlay Controls - Above Video */}
                                    <div className="p-4 rounded-xl border border-q-border/50 bg-q-surface/30 space-y-3">
                                        {/* Toggle Row */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-black/60 to-transparent flex items-center justify-center">
                                                    <Layers size={16} className="text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {t('bioPage.headerOverlay', 'Contrast overlay')}
                                                    </p>
                                                    <p className="text-xs text-q-text-muted">
                                                        {t('bioPage.headerOverlayDesc', 'Better text readability')}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => contextUpdateTheme({ headerOverlay: !theme.headerOverlay })}
                                                className={`relative w-11 h-6 rounded-full transition-colors ${theme.headerOverlay ? 'bg-primary' : 'bg-muted'
                                                    }`}
                                            >
                                                <span
                                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-q-surface rounded-full shadow-sm transition-transform ${theme.headerOverlay ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Color Picker - Shows when overlay enabled */}
                                        {theme.headerOverlay && (
                                            <div className="pt-3 border-t border-q-border/50">
                                                <ColorControl
                                                    label={t('bioPage.overlayColor', 'Overlay color')}
                                                    value={theme.headerOverlayColor || '#000000'}
                                                    onChange={(value) => contextUpdateTheme({ headerOverlayColor: value })}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Profile Box Controls */}
                                    <div className="p-4 rounded-xl border border-q-border/50 bg-q-surface/30 space-y-3">
                                        {/* Toggle Row */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center border border-q-border/50">
                                                    <Square size={16} className="text-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {t('bioPage.profileBox', 'Profile box')}
                                                    </p>
                                                    <p className="text-xs text-q-text-muted">
                                                        {t('bioPage.profileBoxDesc', 'Card behind name & bio')}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => contextUpdateTheme({ profileBox: !theme.profileBox })}
                                                className={`relative w-11 h-6 rounded-full transition-colors ${theme.profileBox ? 'bg-primary' : 'bg-muted'
                                                    }`}
                                            >
                                                <span
                                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-q-surface rounded-full shadow-sm transition-transform ${theme.profileBox ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Options when enabled */}
                                        {theme.profileBox && (
                                            <div className="pt-3 border-t border-q-border/50 space-y-4">
                                                {/* Color Picker */}
                                                <ColorControl
                                                    label={t('bioPage.profileBoxColor', 'Box color')}
                                                    value={theme.profileBoxColor || '#000000'}
                                                    onChange={(value) => contextUpdateTheme({ profileBoxColor: value })}
                                                />

                                                {/* Corner Radius - Same style as buttons */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-q-text-muted">
                                                        {t('bioPage.profileBoxCorners', 'Corners')}
                                                    </label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {(['none', 'sm', 'md', 'lg'] as const).map((radius) => (
                                                            <button
                                                                key={radius}
                                                                onClick={() => contextUpdateTheme({ profileBoxRadius: radius })}
                                                                className={`p-2 rounded-lg border transition-colors ${(theme.profileBoxRadius || 'md') === radius
                                                                    ? 'border-primary bg-primary/10'
                                                                    : 'border-q-border hover:border-muted-foreground'
                                                                    }`}
                                                            >
                                                                <div
                                                                    className="w-full aspect-[2/1] bg-muted-foreground/30"
                                                                    style={{
                                                                        borderRadius: radius === 'none' ? '0px' : radius === 'sm' ? '4px' : radius === 'md' ? '8px' : '16px'
                                                                    }}
                                                                />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Video URL Input */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={theme.backgroundVideo || ''}
                                            onChange={(e) => contextUpdateTheme({ backgroundVideo: e.target.value })}
                                            placeholder={t('bioPage.pasteVideoUrl', 'Paste video URL (MP4)')}
                                            className="flex-1 bg-muted/50 rounded-lg px-3 py-2.5 text-sm border border-q-border focus:ring-2 focus:ring-primary/50 outline-none"
                                        />
                                    </div>

                                    {/* Video Upload */}
                                    <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-q-border hover:border-muted-foreground transition-colors cursor-pointer">
                                        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                                            <Upload size={20} className="text-q-text-muted" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-foreground">
                                                {t('bioPage.uploadVideo', 'Upload video')}
                                            </p>
                                            <p className="text-xs text-q-text-muted">
                                                {t('bioPage.videoFormats', 'MP4, WebM (max 50MB)')}
                                            </p>
                                        </div>
                                        <input
                                            type="file"
                                            accept="video/mp4,video/webm"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const url = URL.createObjectURL(file);
                                                    contextUpdateTheme({ backgroundVideo: url });
                                                }
                                            }}
                                        />
                                    </label>

                                    {/* Video Preview */}
                                    {theme.backgroundVideo && (
                                        <div className="relative rounded-xl overflow-hidden aspect-video bg-q-text">
                                            <video
                                                src={theme.backgroundVideo}
                                                className="w-full h-full object-cover"
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                            />
                                            <button
                                                onClick={() => contextUpdateTheme({ backgroundVideo: '' })}
                                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-q-text/50 hover:bg-q-text/70 text-white transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}


                        </div>
                    )}

                    {/* TEXT SECTION */}
                    {designSubTab === 'text' && (
                        <div className="space-y-4">

                            {/* Page Text Font */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                    {t('bioPage.pageTextFont', 'Page text font')}
                                </label>
                                <AppSelect
                                    value={theme.bodyFont}
                                    onChange={(e) => contextUpdateTheme({ bodyFont: e.target.value })}
                                    className="w-full bg-muted/50 rounded-lg px-3 py-2.5 text-sm text-foreground border border-q-border focus:ring-2 focus:ring-primary/50 outline-none"
                                >
                                    {FONT_OPTIONS.map(font => (
                                        <option key={font} value={font}>{font}</option>
                                    ))}
                                </AppSelect>
                            </div>

                            {/* Page Text Color */}
                            <ColorControl
                                label={t('bioPage.pageTextColor', 'Page text color')}
                                value={theme.bodyColor}
                                onChange={(value) => contextUpdateTheme({ bodyColor: value })}
                            />

                            {/* Title Font */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                    {t('bioPage.titleFont', 'Title font')}
                                </label>
                                <AppSelect
                                    value={theme.titleFont}
                                    onChange={(e) => contextUpdateTheme({ titleFont: e.target.value })}
                                    className="w-full bg-muted/50 rounded-lg px-3 py-2.5 text-sm text-foreground border border-q-border focus:ring-2 focus:ring-primary/50 outline-none"
                                >
                                    {FONT_OPTIONS.map(font => (
                                        <option key={font} value={font}>{font}</option>
                                    ))}
                                </AppSelect>
                            </div>

                            {/* Title Font Color */}
                            <ColorControl
                                label={t('bioPage.titleFontColor', 'Title font color')}
                                value={theme.titleColor}
                                onChange={(value) => contextUpdateTheme({ titleColor: value })}
                            />
                        </div>
                    )}

                    {/* BUTTONS SECTION */}
                    {designSubTab === 'buttons' && (
                        <div className="space-y-4">

                            {/* Button Style */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                    {t('bioPage.buttonStyle', 'Button style')}
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['fill', 'glass', 'outline'] as const).map((style) => (
                                        <button
                                            key={style}
                                            onClick={() => contextUpdateTheme({ buttonStyle: style })}
                                            className={`p-4 rounded-xl border-2 transition-all ${theme.buttonStyle === style
                                                ? 'border-primary'
                                                : 'border-q-border hover:border-muted-foreground'
                                                }`}
                                        >
                                            <div className={`w-full h-8 rounded-lg ${style === 'fill' ? 'bg-muted' :
                                                style === 'glass' ? 'bg-muted/50 backdrop-blur border border-q-border' :
                                                    'border-2 border-muted-foreground'
                                                }`} />
                                            <span className="text-xs font-medium mt-2 block capitalize">{t(`bioPage.${style}`, style)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Corner Roundness */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                    {t('bioPage.cornerRoundness', 'Corner roundness')}
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['lg', 'xl', 'full'] as const).map((shape) => (
                                        <button
                                            key={shape}
                                            onClick={() => contextUpdateTheme({ buttonShape: shape })}
                                            className={`p-3 border-2 transition-all ${theme.buttonShape === shape
                                                ? 'border-primary bg-primary/10'
                                                : 'border-q-border hover:border-muted-foreground'
                                                }`}
                                            style={{
                                                borderRadius: shape === 'lg' ? '0.5rem' : shape === 'xl' ? '0.75rem' : '9999px'
                                            }}
                                        >
                                            <span className="text-[10px] font-medium capitalize">{t(`bioPage.${shape}`, shape)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Button Shadow */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                    {t('bioPage.buttonShadow', 'Button shadow')}
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(['none', 'soft', 'strong', 'hard'] as const).map((shadow) => (
                                        <button
                                            key={shadow}
                                            onClick={() => contextUpdateTheme({ buttonShadow: shadow })}
                                            className={`py-2 px-3 rounded-lg border-2 transition-all ${theme.buttonShadow === shadow
                                                ? 'border-primary bg-primary/10'
                                                : 'border-q-border hover:border-muted-foreground'
                                                }`}
                                        >
                                            <span className="text-xs font-medium capitalize">{t(`bioPage.${shadow}`, shadow)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Button Color */}
                            <ColorControl
                                label={t('bioPage.buttonColor', 'Button color')}
                                value={theme.buttonColor}
                                onChange={(value) => contextUpdateTheme({ buttonColor: value })}
                            />

                            {/* Button Text Color */}
                            <ColorControl
                                label={t('bioPage.buttonTextColor', 'Button text color')}
                                value={theme.buttonTextColor}
                                onChange={(value) => contextUpdateTheme({ buttonTextColor: value })}
                            />
                        </div>
                    )}

                    {/* COLOR SECTION */}
                    {designSubTab === 'color' && (
                        <div className="space-y-4">

                            {/* Import from Project */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                    {t('bioPage.importProjectColors', 'Import from project')}
                                </label>
                                <button
                                    onClick={() => {
                                        // Import colors from the current project theme
                                        const projectTheme = activeProject?.theme;
                                        if (projectTheme?.paletteColors?.length) {
                                            const colors = projectTheme.paletteColors;
                                            // Map project palette to bio page theme
                                            contextUpdateTheme({
                                                backgroundColor: colors[0] || theme.backgroundColor,
                                                buttonColor: colors[1] || theme.buttonColor,
                                                buttonTextColor: colors[4] || theme.buttonTextColor,
                                                textColor: colors[2] || theme.textColor,
                                                titleColor: colors[2] || theme.titleColor,
                                                bodyColor: colors[3] || theme.bodyColor,
                                                gradientColor: colors[5] || theme.gradientColor,
                                            });
                                        }
                                    }}
                                    className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-q-border hover:border-primary hover:bg-primary/5 transition-all"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Download size={18} className="text-primary" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="text-sm font-medium text-foreground">
                                            {t('bioPage.importWebColors', 'Import Web Colors')}
                                        </p>
                                        <p className="text-xs text-q-text-muted">
                                            {t('bioPage.syncWithProject', 'Sync with your project theme palette')}
                                        </p>
                                    </div>
                                    {activeProject?.theme?.paletteColors && (
                                        <div className="flex gap-1">
                                            {activeProject.theme.paletteColors.slice(0, 5).map((c, i) => (
                                                <div key={i} className="w-4 h-4 rounded border border-q-border" style={{ backgroundColor: c }} />
                                            ))}
                                        </div>
                                    )}
                                </button>
                            </div>

                            {/* Coolors Palette Import */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                    {t('bioPage.importCoolors', 'Import from Coolors')}
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder={t('bioPage.pasteCoolorsUrl', 'Paste Coolors URL (coolors.co/palette/...)')}
                                        className="flex-1 bg-muted/50 rounded-lg px-3 py-2.5 text-sm border border-q-border focus:ring-2 focus:ring-primary/50 outline-none"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const input = e.target as HTMLInputElement;
                                                const url = input.value;
                                                // Parse Coolors URL: https://coolors.co/palette/... or https://coolors.co/...
                                                const hexMatch = url.match(/([0-9a-f]{6}[-_][0-9a-f]{6}|-[0-9a-f]{6})+/i) ||
                                                    url.match(/([0-9a-f]{6})/gi);
                                                if (hexMatch) {
                                                    const colors = url.match(/[0-9a-f]{6}/gi)?.map(c => `#${c}`) || [];
                                                    if (colors.length >= 2) {
                                                        contextUpdateTheme({
                                                            backgroundColor: colors[0],
                                                            buttonColor: colors[1],
                                                            buttonTextColor: colors[4] || '#ffffff',
                                                            textColor: colors[2] || colors[0],
                                                            titleColor: colors[2] || colors[0],
                                                            bodyColor: colors[3] || colors[1],
                                                            gradientColor: colors[colors.length - 1],
                                                        });
                                                        input.value = '';
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => window.open('https://coolors.co/generate', '_blank')}
                                        className="px-4 py-2.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
                                    >
                                        {t('bioPage.openCoolors', 'Open Coolors')}
                                    </button>
                                </div>
                                <p className="text-xs text-q-text-muted">
                                    {t('bioPage.coolorsHelp', 'Paste a Coolors URL and press Enter to import colors')}
                                </p>
                            </div>

                            {/* Quick Color Overview */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                        {t('bioPage.currentColors', 'Current colors')}
                                    </label>
                                    <button
                                        onClick={() => {
                                            // Reset to default colors
                                            contextUpdateTheme({
                                                backgroundColor: '#1a1a2e',
                                                buttonColor: '#6366f1',
                                                buttonTextColor: '#ffffff',
                                                textColor: '#ffffff',
                                                titleColor: '#ffffff',
                                                bodyColor: '#a1a1aa',
                                                gradientColor: '#0f0f1a',
                                            });
                                        }}
                                        className="text-xs text-q-text-muted hover:text-foreground transition-colors"
                                    >
                                        {t('bioPage.resetColors', 'Reset to defaults')}
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { key: 'backgroundColor', label: 'BG', color: theme.backgroundColor },
                                        { key: 'buttonColor', label: 'BTN', color: theme.buttonColor },
                                        { key: 'titleColor', label: 'Title', color: theme.titleColor },
                                        { key: 'bodyColor', label: 'Body', color: theme.bodyColor },
                                    ].map((item) => (
                                        <div key={item.key} className="text-center">
                                            <div
                                                className="w-full aspect-square rounded-lg border border-q-border mb-1"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="text-[10px] text-q-text-muted">{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* All Color Controls */}
                            <div className="space-y-4 pt-2 border-t border-q-border">
                                <ColorControl
                                    label={t('bioPage.backgroundColor', 'Background')}
                                    value={theme.backgroundColor}
                                    onChange={(value) => contextUpdateTheme({ backgroundColor: value })}
                                />
                                <ColorControl
                                    label={t('bioPage.gradientColor', 'Gradient end')}
                                    value={theme.gradientColor || '#0f0f1a'}
                                    onChange={(value) => contextUpdateTheme({ gradientColor: value })}
                                />
                                <ColorControl
                                    label={t('bioPage.titleColor', 'Title color')}
                                    value={theme.titleColor}
                                    onChange={(value) => contextUpdateTheme({ titleColor: value })}
                                />
                                <ColorControl
                                    label={t('bioPage.bodyColor', 'Body text color')}
                                    value={theme.bodyColor}
                                    onChange={(value) => contextUpdateTheme({ bodyColor: value })}
                                />
                                <ColorControl
                                    label={t('bioPage.buttonColor', 'Button color')}
                                    value={theme.buttonColor}
                                    onChange={(value) => contextUpdateTheme({ buttonColor: value })}
                                />
                                <ColorControl
                                    label={t('bioPage.buttonTextColor', 'Button text')}
                                    value={theme.buttonTextColor}
                                    onChange={(value) => contextUpdateTheme({ buttonTextColor: value })}
                                />
                            </div>
                        </div>
                    )}
                </div>
        );
    };


    const renderShopEditor = () => {
        if (!canAccessEcommerce) return null;

        const productBlocks = blocks.filter(block => ['product_grid', 'product_collection'].includes(block.type) && canAccessBioBlock(block));
        const selectedCollectionIds = new Set(
            productBlocks
                .flatMap(block => Array.isArray(block.data?.collectionIds) ? block.data.collectionIds : [])
                .filter((id): id is string => typeof id === 'string' && Boolean(id.trim())),
        );
        const productBlockDefinition = BIO_BLOCK_LIBRARY.filter(canAccessBioBlockDefinition).find(block => block.type === 'product_grid');
        const collectionBlockDefinition = BIO_BLOCK_LIBRARY.filter(canAccessBioBlockDefinition).find(block => block.type === 'product_collection');

        return (
            <div className="space-y-4">
                <div className="rounded-lg border border-q-border bg-q-surface/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">
                                {t('bioPage.bioShop', 'Bio shop')}
                            </h3>
                            <p className="mt-1 text-xs text-q-text-muted">
                                {t('bioPage.bioShopDescription', 'Show real active Ecommerce products inside your public Bio Page.')}
                            </p>
                        </div>
                        <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                            {availableBioProducts.length}
                        </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-md bg-muted/40 px-3 py-2">
                            <p className="text-[11px] text-q-text-muted">{t('bioPage.productBlocks', 'Blocks')}</p>
                            <p className="text-sm font-semibold text-foreground">{productBlocks.length}</p>
                        </div>
                        <div className="rounded-md bg-muted/40 px-3 py-2">
                            <p className="text-[11px] text-q-text-muted">{t('bioPage.collections', 'Collections')}</p>
                            <p className="text-sm font-semibold text-foreground">
                                {selectedCollectionIds.size || availableBioCategories.length || t('bioPage.all', 'All')}
                            </p>
                        </div>
                        <div className="rounded-md bg-muted/40 px-3 py-2">
                            <p className="text-[11px] text-q-text-muted">{t('bioPage.source', 'Source')}</p>
                            <p className="truncate text-sm font-semibold text-foreground">Ecommerce</p>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => productBlockDefinition && addBioBlock(productBlockDefinition)}
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                        >
                            <Plus size={15} />
                            {t('bioPage.addShopBlock', 'Add shop block')}
                        </button>
                        <button
                            type="button"
                            onClick={() => collectionBlockDefinition && addBioBlock(collectionBlockDefinition)}
                            className="inline-flex items-center gap-2 rounded-md border border-q-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                            <Store size={15} />
                            {t('bioPage.addCollectionBlock', 'Add collection')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('blocks')}
                            className="inline-flex items-center gap-2 rounded-md border border-q-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                            <Layers size={15} />
                            {t('bioPage.configureBlocks', 'Configure blocks')}
                        </button>
                    </div>
                </div>

                {isLoadingBlockIntegrations ? (
                    <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-q-border p-6 text-sm text-q-text-muted">
                        <Loader2 size={16} className="animate-spin" />
                        {t('bioPage.loadingProducts', 'Loading products...')}
                    </div>
                ) : availableBioProducts.length ? (
                    <div className="grid grid-cols-1 gap-2">
                        {availableBioProducts.map(product => (
                            <div key={product.id} className="flex items-center gap-3 rounded-lg border border-q-border/70 bg-q-surface/40 p-3">
                                {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                                ) : (
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-q-text-muted">
                                        <ShoppingBag size={18} />
                                    </span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                                    <p className="text-xs text-q-text-muted">${product.price.toFixed(2)}</p>
                                </div>
                                <span className="rounded-md bg-q-accent/10 px-2 py-1 text-[11px] font-semibold text-q-accent">
                                    {product.status || 'active'}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-q-border p-6 text-center">
                        <ShoppingBag size={28} className="mx-auto mb-2 text-q-text-muted/50" />
                        <p className="text-sm font-semibold text-foreground">
                            {t('bioPage.noBioShopProducts', 'No active Ecommerce products yet')}
                        </p>
                        <p className="mt-1 text-xs text-q-text-muted">
                            {t('bioPage.noBioShopProductsDescription', 'Create and activate products in Ecommerce before they can appear on a public Bio Page.')}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const renderAnalytics = () => {
        if (!canAccessAnalytics) return null;

        const fallbackTopLinks = links
            .map(link => ({ id: link.id, title: link.title, clicks: link.clicks }))
            .sort((a, b) => b.clicks - a.clicks);
        const topLinks = analyticsSummary?.topLinks?.length ? analyticsSummary.topLinks : fallbackTopLinks;
        const sourceEntries = Object.entries(analyticsSummary?.sourceBreakdown || {}).sort((a, b) => b[1] - a[1]);
        const utmSourceEntries = Object.entries(analyticsSummary?.utmSourceBreakdown || {}).sort((a, b) => b[1] - a[1]);
        const utmCampaignEntries = Object.entries(analyticsSummary?.utmCampaignBreakdown || {}).sort((a, b) => b[1] - a[1]);
        const referrerEntries = Object.entries(analyticsSummary?.referrerBreakdown || {}).sort((a, b) => b[1] - a[1]);
        const deviceEntries = Object.entries(analyticsSummary?.deviceBreakdown || {}).sort((a, b) => b[1] - a[1]);
        const blockEntries = Object.entries(analyticsSummary?.blockBreakdown || {}).sort((a, b) => b[1] - a[1]);
        const eventEntries = Object.entries(analyticsSummary?.eventBreakdown || {}).sort((a, b) => b[1] - a[1]);
        const linkSourceRows = (analyticsSummary?.linkSourceBreakdown || [])
            .map(link => ({
                ...link,
                sourceEntries: Object.entries(link.sources || {}).sort((a, b) => b[1] - a[1]),
            }))
            .filter(link => link.clicks > 0);
        const maxSourceCount = Math.max(1, ...sourceEntries.map(([, count]) => count));
        const maxUtmSourceCount = Math.max(1, ...utmSourceEntries.map(([, count]) => count));
        const maxBlockCount = Math.max(1, ...blockEntries.map(([, count]) => count));

        const blockTitleById = new Map(blocks.map(block => [block.id, block.title || formatBlockTypeLabel(block.type)]));
        const rangeItems: Array<{ id: AnalyticsRange; label: string }> = [
            { id: '7d', label: '7D' },
            { id: '30d', label: '30D' },
            { id: '90d', label: '90D' },
            { id: 'all', label: t('bioPage.allTime', 'All') },
        ];

        const formatEventLabel = (eventType: string) => (
            eventType
                .replace(/^bio_/, '')
                .replace(/_/g, ' ')
                .replace(/\b\w/g, char => char.toUpperCase())
        );

        const exportAnalyticsCsv = () => {
            if (!analyticsSummary) return;
            const rows = [
                ['section', 'name', 'value'],
                ['summary', 'views', String(analyticsSummary.views)],
                ['summary', 'unique_views', String(analyticsSummary.uniqueViews || analyticsSummary.views || 0)],
                ['summary', 'returning_views', String(analyticsSummary.returningViews || 0)],
                ['summary', 'clicks', String(analyticsSummary.clicks)],
                ['summary', 'ctr', String(analyticsSummary.ctr)],
                ['summary', 'conversions', String(analyticsSummary.conversions || 0)],
                ['summary', 'conversion_rate', String(analyticsSummary.conversionRate || 0)],
                ['summary', 'subscribers', String(analyticsSummary.subscribers || 0)],
                ['summary', 'leads', String(analyticsSummary.leads || 0)],
                ['summary', 'bookings', String(analyticsSummary.bookings || 0)],
                ['summary', 'product_clicks', String(analyticsSummary.productClicks || 0)],
                ['summary', 'qr_scans', String(analyticsSummary.qrScans || 0)],
                ['summary', 'shares', String(analyticsSummary.shares || 0)],
                ['summary', 'chat_opens', String(analyticsSummary.chatOpens || 0)],
                ...topLinks.map(link => ['link', link.title, String(link.clicks)]),
                ...linkSourceRows.flatMap(link => (
                    link.sourceEntries.map(([source, count]) => ['link_source', `${link.title} / ${source}`, String(count)])
                )),
                ...sourceEntries.map(([source, count]) => ['source', source, String(count)]),
                ...utmSourceEntries.map(([source, count]) => ['utm_source', source, String(count)]),
                ...utmCampaignEntries.map(([campaign, count]) => ['utm_campaign', campaign, String(count)]),
                ...referrerEntries.map(([referrer, count]) => ['referrer', referrer, String(count)]),
                ...deviceEntries.map(([device, count]) => ['device', device, String(count)]),
                ...blockEntries.map(([blockId, count]) => ['block', blockTitleById.get(blockId) || blockId, String(count)]),
                ...eventEntries.map(([eventType, count]) => ['event', eventType, String(count)]),
            ];
            const csv = rows
                .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
                .join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${slug || bioPage?.slug || 'bio-page'}-analytics-${analyticsRange}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        };

        return (
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex rounded-lg border border-q-border/60 bg-q-surface p-1">
                        {rangeItems.map(item => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setAnalyticsRange(item.id)}
                                className={`h-8 rounded-md px-3 text-xs font-semibold transition-colors ${analyticsRange === item.id ? 'bg-primary text-primary-foreground' : 'text-q-text-muted hover:text-foreground'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={exportAnalyticsCsv}
                        disabled={!analyticsSummary}
                        className="h-9 rounded-lg border border-q-border/60 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-q-surface disabled:opacity-50 flex items-center gap-2"
                    >
                        <Download size={14} />
                        {t('bioPage.exportCsv', 'Export CSV')}
                    </button>
                </div>

                {isLoadingAnalytics && (
                    <div className="flex items-center gap-2 rounded-lg border border-q-border/60 bg-q-surface/50 px-3 py-2 text-xs text-q-text-muted">
                        <Loader2 size={14} className="animate-spin" />
                        {t('bioPage.loadingAnalytics', 'Loading analytics...')}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-q-surface/50 backdrop-blur-sm border border-q-border/50 rounded-xl p-4">
                        <p className="text-2xl font-bold text-foreground">
                            {(analyticsSummary?.clicks ?? links.reduce((sum, l) => sum + l.clicks, 0)).toLocaleString()}
                        </p>
                        <p className="text-sm text-q-text-muted">{t('bioPage.totalClicks', 'Total Clicks')}</p>
                    </div>
                    <div className="bg-q-surface/50 backdrop-blur-sm border border-q-border/50 rounded-xl p-4">
                        <p className="text-2xl font-bold text-foreground">{(analyticsSummary?.views ?? 0).toLocaleString()}</p>
                        <p className="text-sm text-q-text-muted">{t('bioPage.views', 'Views')}</p>
                    </div>
                    <div className="bg-q-surface/50 backdrop-blur-sm border border-q-border/50 rounded-xl p-4">
                        <p className="text-2xl font-bold text-foreground">{(analyticsSummary?.uniqueViews ?? 0).toLocaleString()}</p>
                        <p className="text-sm text-q-text-muted">{t('bioPage.uniqueViews', 'Unique views')}</p>
                    </div>
                    <div className="bg-q-surface/50 backdrop-blur-sm border border-q-border/50 rounded-xl p-4">
                        <p className="text-2xl font-bold text-foreground">{(analyticsSummary?.returningViews ?? 0).toLocaleString()}</p>
                        <p className="text-sm text-q-text-muted">{t('bioPage.returningViews', 'Returning views')}</p>
                    </div>
                    <div className="bg-q-surface/50 backdrop-blur-sm border border-q-border/50 rounded-xl p-4">
                        <p className="text-2xl font-bold text-foreground">{analyticsSummary?.ctr ?? 0}%</p>
                        <p className="text-sm text-q-text-muted">{t('bioPage.ctr', 'CTR')}</p>
                    </div>
                    {canAccessEmailMarketing && (
                        <div className="bg-q-surface/50 backdrop-blur-sm border border-q-border/50 rounded-xl p-4">
                            <p className="text-2xl font-bold text-foreground">{(analyticsSummary?.subscribers ?? subscribers.length).toLocaleString()}</p>
                            <p className="text-sm text-q-text-muted">{t('bioPage.subscribers', 'Subscribers')}</p>
                        </div>
                    )}
                    <div className="bg-q-surface/50 backdrop-blur-sm border border-q-border/50 rounded-xl p-4">
                        <p className="text-2xl font-bold text-foreground">{analyticsSummary?.conversionRate ?? 0}%</p>
                        <p className="text-sm text-q-text-muted">{t('bioPage.conversionRate', 'Conversion rate')}</p>
                    </div>
                    <div className="bg-q-surface/50 backdrop-blur-sm border border-q-border/50 rounded-xl p-4">
                        <p className="text-2xl font-bold text-foreground">{(analyticsSummary?.conversions ?? 0).toLocaleString()}</p>
                        <p className="text-sm text-q-text-muted">{t('bioPage.conversions', 'Conversions')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {canAccessCrm && (
                        <div className="rounded-lg border border-q-border/50 bg-q-surface/40 p-3">
                            <p className="text-lg font-bold text-foreground">{(analyticsSummary?.leads ?? 0).toLocaleString()}</p>
                            <p className="text-xs text-q-text-muted">{t('bioPage.leads', 'Leads')}</p>
                        </div>
                    )}
                    {canAccessAppointments && (
                        <div className="rounded-lg border border-q-border/50 bg-q-surface/40 p-3">
                            <p className="text-lg font-bold text-foreground">{(analyticsSummary?.bookings ?? 0).toLocaleString()}</p>
                            <p className="text-xs text-q-text-muted">{t('bioPage.bookings', 'Bookings')}</p>
                        </div>
                    )}
                    {canAccessEcommerce && (
                        <div className="rounded-lg border border-q-border/50 bg-q-surface/40 p-3">
                            <p className="text-lg font-bold text-foreground">{(analyticsSummary?.productClicks ?? 0).toLocaleString()}</p>
                            <p className="text-xs text-q-text-muted">{t('bioPage.productClicks', 'Product clicks')}</p>
                        </div>
                    )}
                    <div className="rounded-lg border border-q-border/50 bg-q-surface/40 p-3">
                        <p className="text-lg font-bold text-foreground">{(analyticsSummary?.qrScans ?? 0).toLocaleString()}</p>
                        <p className="text-xs text-q-text-muted">{t('bioPage.qrScans', 'QR scans')}</p>
                    </div>
                    <div className="rounded-lg border border-q-border/50 bg-q-surface/40 p-3">
                        <p className="text-lg font-bold text-foreground">{(analyticsSummary?.shares ?? 0).toLocaleString()}</p>
                        <p className="text-xs text-q-text-muted">{t('bioPage.shares', 'Shares')}</p>
                    </div>
                    {canAccessChatbot && (
                        <div className="rounded-lg border border-q-border/50 bg-q-surface/40 p-3">
                            <p className="text-lg font-bold text-foreground">{(analyticsSummary?.chatOpens ?? 0).toLocaleString()}</p>
                            <p className="text-xs text-q-text-muted">{t('bioPage.chatOpens', 'Chat opens')}</p>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                        {t('bioPage.topPerforming', 'Top Performing')}
                    </h3>
                    {topLinks.slice(0, 8).map((link, index) => (
                        <div
                            key={link.id}
                            className="flex items-center gap-3 bg-q-surface/30 rounded-lg p-3"
                        >
                            <span className="text-sm font-bold text-q-text-muted w-6">
                                #{index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{link.title}</p>
                            </div>
                            <span className="text-sm font-semibold text-primary">
                                {link.clicks.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                        {t('bioPage.linkSourceAnalytics', 'Link sources')}
                    </h3>
                    {linkSourceRows.length ? linkSourceRows.slice(0, 8).map(link => (
                        <div key={link.id} className="space-y-2 rounded-lg bg-q-surface/30 p-3">
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-foreground">{link.title}</p>
                                    <p className="text-[11px] text-q-text-muted">
                                        {t('bioPage.topSource', 'Top source')}: {link.topSource}
                                    </p>
                                </div>
                                <span className="shrink-0 font-semibold text-primary">{link.clicks.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {link.sourceEntries.slice(0, 3).map(([source, count]) => (
                                    <span key={`${link.id}-${source}`} className="rounded-full border border-q-border/60 bg-q-surface px-2 py-1 text-[11px] font-medium text-q-text-muted">
                                        {source}: {count.toLocaleString()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )) : (
                        <p className="rounded-lg border border-dashed border-q-border px-3 py-4 text-center text-xs text-q-text-muted">
                            {t('bioPage.noLinkSourceAnalytics', 'No link source attribution yet.')}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                        {t('bioPage.sources', 'Sources')}
                    </h3>
                    {sourceEntries.length ? sourceEntries.slice(0, 8).map(([sourceName, count]) => (
                        <div key={sourceName} className="space-y-1 rounded-lg bg-q-surface/30 p-3">
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="truncate font-medium text-foreground">{sourceName}</span>
                                <span className="font-semibold text-primary">{count.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-q-border/60">
                                <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${Math.max(6, Math.round((count / maxSourceCount) * 100))}%` }}
                                />
                            </div>
                        </div>
                    )) : (
                        <p className="rounded-lg border border-dashed border-q-border px-3 py-4 text-center text-xs text-q-text-muted">
                            {t('bioPage.noSourceAnalytics', 'No source events yet.')}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                        {t('bioPage.utmSources', 'UTM sources')}
                    </h3>
                    {utmSourceEntries.length ? utmSourceEntries.slice(0, 8).map(([sourceName, count]) => (
                        <div key={sourceName} className="space-y-1 rounded-lg bg-q-surface/30 p-3">
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="truncate font-medium text-foreground">{sourceName}</span>
                                <span className="font-semibold text-primary">{count.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-q-border/60">
                                <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${Math.max(6, Math.round((count / maxUtmSourceCount) * 100))}%` }}
                                />
                            </div>
                        </div>
                    )) : (
                        <p className="rounded-lg border border-dashed border-q-border px-3 py-4 text-center text-xs text-q-text-muted">
                            {t('bioPage.noUtmAnalytics', 'No UTM-tagged events yet.')}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-lg border border-q-border/50 bg-q-surface/30 p-3">
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-q-text-secondary">
                            {t('bioPage.utmCampaigns', 'UTM campaigns')}
                        </h3>
                        {utmCampaignEntries.length ? utmCampaignEntries.slice(0, 5).map(([campaign, count]) => (
                            <div key={campaign} className="flex items-center justify-between gap-3 py-1 text-xs">
                                <span className="truncate text-foreground">{campaign}</span>
                                <span className="font-semibold text-primary">{count.toLocaleString()}</span>
                            </div>
                        )) : (
                            <p className="text-xs text-q-text-muted">{t('bioPage.noCampaignAnalytics', 'No campaign data yet.')}</p>
                        )}
                    </div>
                    <div className="rounded-lg border border-q-border/50 bg-q-surface/30 p-3">
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-q-text-secondary">
                            {t('bioPage.referrers', 'Referrers')}
                        </h3>
                        {referrerEntries.length ? referrerEntries.slice(0, 5).map(([referrer, count]) => (
                            <div key={referrer} className="flex items-center justify-between gap-3 py-1 text-xs">
                                <span className="truncate text-foreground">{referrer}</span>
                                <span className="font-semibold text-primary">{count.toLocaleString()}</span>
                            </div>
                        )) : (
                            <p className="text-xs text-q-text-muted">{t('bioPage.noReferrerAnalytics', 'No referrer data yet.')}</p>
                        )}
                    </div>
                    <div className="rounded-lg border border-q-border/50 bg-q-surface/30 p-3">
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-q-text-secondary">
                            {t('bioPage.devices', 'Devices')}
                        </h3>
                        {deviceEntries.length ? deviceEntries.slice(0, 5).map(([device, count]) => (
                            <div key={device} className="flex items-center justify-between gap-3 py-1 text-xs">
                                <span className="truncate capitalize text-foreground">{device}</span>
                                <span className="font-semibold text-primary">{count.toLocaleString()}</span>
                            </div>
                        )) : (
                            <p className="text-xs text-q-text-muted">{t('bioPage.noDeviceAnalytics', 'No device data yet.')}</p>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                        {t('bioPage.blockAnalytics', 'Block analytics')}
                    </h3>
                    {blockEntries.length ? blockEntries.slice(0, 8).map(([blockId, count]) => (
                        <div key={blockId} className="space-y-1 rounded-lg bg-q-surface/30 p-3">
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="truncate font-medium text-foreground">{blockTitleById.get(blockId) || blockId}</span>
                                <span className="font-semibold text-primary">{count.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-q-border/60">
                                <div
                                    className="h-full rounded-full bg-q-accent"
                                    style={{ width: `${Math.max(6, Math.round((count / maxBlockCount) * 100))}%` }}
                                />
                            </div>
                        </div>
                    )) : (
                        <p className="rounded-lg border border-dashed border-q-border px-3 py-4 text-center text-xs text-q-text-muted">
                            {t('bioPage.noBlockAnalytics', 'No block-attributed events yet.')}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                        {t('bioPage.eventBreakdown', 'Event breakdown')}
                    </h3>
                    {eventEntries.length ? eventEntries.slice(0, 10).map(([eventType, count]) => (
                        <div key={eventType} className="flex items-center justify-between gap-3 rounded-lg bg-q-surface/30 p-3 text-sm">
                            <span className="truncate text-foreground">{formatEventLabel(eventType)}</span>
                            <span className="font-semibold text-primary">{count.toLocaleString()}</span>
                        </div>
                    )) : (
                        <p className="rounded-lg border border-dashed border-q-border px-3 py-4 text-center text-xs text-q-text-muted">
                            {t('bioPage.noAnalyticsYet', 'No analytics events yet.')}
                        </p>
                    )}
                </div>
            </div>
        );
    };

    const renderAudience = () => {
        if (!canAccessEmailMarketing) return null;

        return (
        <div className="space-y-4">
            {/* Email Signup Toggle */}
            <div className="flex items-center justify-between p-4 bg-q-surface/50 backdrop-blur-sm border border-q-border/50 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Mail size={20} className="text-primary" />
                    </div>
                    <div>
                        <p className="font-medium text-foreground">
                            {t('bioPage.emailSignup', 'Email Signup')}
                        </p>
                        <p className="text-xs text-q-text-muted">
                            {t('bioPage.emailSignupDesc', 'Collect emails from visitors')}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setEmailSignupEnabled(!emailSignupEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${emailSignupEnabled ? 'bg-primary' : 'bg-muted'
                        }`}
                >
                    <span
                        className={`absolute top-0.5 w-5 h-5 bg-q-surface rounded-full shadow transition-transform ${emailSignupEnabled ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                    />
                </button>
            </div>

            {/* Subscriber List */}
            <div className="bg-q-surface/50 backdrop-blur-sm border border-q-border/50 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-q-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users size={18} className="text-q-text-muted" />
                        <h3 className="font-medium text-foreground text-sm">
                            {t('bioPage.subscribers', 'Subscribers')}
                        </h3>
                    </div>
                    <span className="text-xs font-semibold text-q-text-muted bg-muted px-2 py-1 rounded-full">
                        {subscribers.length}
                    </span>
                </div>

                <div className="max-h-80 overflow-y-auto">
                    {isLoadingSubscribers ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={20} className="animate-spin text-primary" />
                        </div>
                    ) : subscribers.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <Mail size={32} className="mx-auto text-q-text-muted/30 mb-3" />
                            <p className="text-sm text-q-text-muted">
                                {emailSignupEnabled
                                    ? t('bioPage.noSubscribersYet', 'No subscribers yet. Share your bio page to start collecting emails!')
                                    : t('bioPage.enableSignupFirst', 'Enable email signup above to start collecting emails.')}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {subscribers.map(sub => (
                                <div key={sub.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Mail size={14} className="text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{sub.email}</p>
                                            <p className="text-xs text-q-text-muted">
                                                {typeof sub.subscribedAt === 'string'
                                                    ? new Date(sub.subscribedAt).toLocaleDateString()
                                                    : sub.subscribedAt?.seconds
                                                    ? new Date(sub.subscribedAt.seconds * 1000).toLocaleDateString()
                                                    : t('common.recently', 'Recently')}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteSubscriber(sub.id)}
                                        disabled={isDeletingSubscriber === sub.id}
                                        className="p-1.5 rounded-md text-q-text-muted hover:text-q-error hover:bg-q-error/10 transition-colors opacity-0 group-hover:opacity-100"
                                        title={t('common.delete', 'Delete')}
                                    >
                                        {isDeletingSubscriber === sub.id ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={14} />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
        );
    };

    const getReadinessStatusLabel = (status: BioPageIntegrationReadiness['publication']['status']) => {
        const labels = {
            ready: t('bioPage.integrationStatusReady', 'Ready'),
            needs_setup: t('bioPage.integrationStatusNeedsSetup', 'Needs setup'),
            needs_review: t('bioPage.integrationStatusNeedsReview', 'Review'),
            disabled: t('bioPage.integrationStatusDisabled', 'Disabled'),
        };
        return labels[status];
    };

    const getReadinessStatusClass = (status: BioPageIntegrationReadiness['publication']['status']) => {
        if (status === 'ready') return 'border-q-success/25 bg-q-success/10 text-q-success';
        if (status === 'needs_setup') return 'border-q-warning/25 bg-q-warning/10 text-q-warning';
        if (status === 'needs_review') return 'border-primary/25 bg-primary/10 text-primary';
        return 'border-q-border bg-muted/40 text-q-text-muted';
    };

    const renderIntegrationReadinessPanel = () => {
        const items: Array<{
            id: string;
            icon: LucideIcon;
            label: string;
            status: BioPageIntegrationReadiness['publication']['status'];
            detail: string;
            serviceId?: PlatformServiceId;
        }> = integrationReadiness ? [
            {
                id: 'ecommerce',
                serviceId: 'ecommerce',
                icon: ShoppingBag,
                label: t('bioPage.integrationEcommerce', 'Ecommerce'),
                status: integrationReadiness.ecommerce.status,
                detail: t('bioPage.integrationProductsCount', '{{count}} products', { count: integrationReadiness.ecommerce.productCount }),
            },
            {
                id: 'appointments',
                serviceId: 'appointments',
                icon: Calendar,
                label: t('bioPage.integrationAppointments', 'Appointments'),
                status: integrationReadiness.appointments.status,
                detail: t('bioPage.integrationServicesCount', '{{count}} services', { count: integrationReadiness.appointments.serviceCount }),
            },
            {
                id: 'crm',
                serviceId: 'crm',
                icon: Users,
                label: t('bioPage.integrationCrm', 'CRM / Leads'),
                status: integrationReadiness.crm.status,
                detail: t('bioPage.integrationLeadFormsCount', '{{blocks}} blocks · {{fields}} fields', {
                    blocks: integrationReadiness.crm.leadBlockCount,
                    fields: integrationReadiness.crm.leadFieldCount,
                }),
            },
            {
                id: 'email',
                serviceId: 'emailMarketing',
                icon: Mail,
                label: t('bioPage.integrationEmailMarketing', 'Email Marketing'),
                status: integrationReadiness.emailMarketing.status,
                detail: t('bioPage.integrationAudienceCount', '{{count}} audiences', { count: integrationReadiness.emailMarketing.audienceCount }),
            },
            {
                id: 'chatcore',
                serviceId: 'chatbot',
                icon: MessageCircle,
                label: t('bioPage.integrationChatCore', 'ChatCore'),
                status: integrationReadiness.chatbot.status,
                detail: integrationReadiness.chatbot.inlineCtaEnabled || integrationReadiness.chatbot.floatingChatEnabled
                    ? t('bioPage.integrationChatCoreEnabled', 'CTA or floating chat enabled')
                    : t('bioPage.integrationChatCoreDisabled', 'No chat block enabled'),
            },
            {
                id: 'media',
                serviceId: 'aiFeatures',
                icon: Image,
                label: t('bioPage.integrationMediaAi', 'Media AI'),
                status: integrationReadiness.media.status,
                detail: t('bioPage.integrationMediaCount', '{{assets}} assets · {{references}} references', {
                    assets: integrationReadiness.media.aiGeneratedAssetCount || integrationReadiness.media.assetCount,
                    references: integrationReadiness.media.pageMediaReferenceCount,
                }),
            },
            {
                id: 'analytics',
                serviceId: 'analytics',
                icon: BarChart3,
                label: t('bioPage.integrationAnalytics', 'Analytics'),
                status: integrationReadiness.analytics.status,
                detail: t('bioPage.integrationEventsCount', '{{count}} events', { count: integrationReadiness.analytics.eventCount }),
            },
            {
                id: 'website',
                icon: Globe,
                label: t('bioPage.integrationWebsiteBuilder', 'Website Builder'),
                status: integrationReadiness.websiteBuilder.status,
                detail: t('bioPage.integrationSectionsCount', '{{count}} sections', { count: integrationReadiness.websiteBuilder.sectionCount }),
            },
            {
                id: 'business-blueprint',
                icon: Sparkles,
                label: t('bioPage.integrationBusinessBlueprint', 'BusinessBlueprint'),
                status: integrationReadiness.businessBlueprint.status,
                detail: t('bioPage.integrationBlueprintSourcesCount', '{{sources}} sources · {{review}} review', {
                    sources: integrationReadiness.businessBlueprint.sourceMapCount,
                    review: integrationReadiness.businessBlueprint.reviewRequiredCount,
                }),
            },
            {
                id: 'design-system',
                icon: Palette,
                label: t('bioPage.integrationDesignSystem', 'Design System'),
                status: integrationReadiness.designSystem.status,
                detail: t('bioPage.integrationDesignTokensCount', '{{count}} tokens', { count: integrationReadiness.designSystem.tokenCount }),
            },
            {
                id: 'seo',
                icon: Search,
                label: t('bioPage.integrationSeo', 'SEO'),
                status: integrationReadiness.seo.status,
                detail: integrationReadiness.seo.hasTitle && integrationReadiness.seo.hasDescription
                    ? t('bioPage.integrationSeoReady', 'Title and description ready')
                    : t('bioPage.integrationSeoNeedsCopy', 'Title or description missing'),
            },
            {
                id: 'qr',
                icon: QrCode,
                label: t('bioPage.integrationQr', 'QR Code'),
                status: integrationReadiness.qrCode.status,
                detail: integrationReadiness.qrCode.generated
                    ? t('bioPage.integrationQrGenerated', 'Trackable QR generated')
                    : t('bioPage.integrationQrNotGenerated', 'QR not generated yet'),
            },
            {
                id: 'publication',
                icon: Share2,
                label: t('bioPage.integrationPublication', 'Publication'),
                status: integrationReadiness.publication.status,
                detail: t('bioPage.integrationPublishIssuesCount', '{{count}} issues', { count: integrationReadiness.publication.issueCount }),
            },
        ] : [];
        const visibleItems = items.filter(item => canAccessService(item.serviceId));

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-q-text-muted">
                        {t('bioPage.integrationReadinessDesc', 'Checks connected Quimera modules before public launch.')}
                    </p>
                    {isLoadingIntegrationReadiness && <Loader2 size={16} className="animate-spin text-q-text-muted" />}
                </div>

                {!integrationReadiness && !isLoadingIntegrationReadiness ? (
                    <p className="rounded-lg border border-dashed border-q-border px-3 py-4 text-center text-xs text-q-text-muted">
                        {t('bioPage.integrationReadinessUnavailable', 'Readiness is available after the Bio Page draft is saved.')}
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {visibleItems.map(item => {
                            const Icon = item.icon;
                            return (
                                <div key={item.id} className="min-w-0 rounded-lg border border-q-border/50 bg-background/60 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-2">
                                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-q-text-muted">
                                                <Icon size={15} />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
                                                <p className="truncate text-xs text-q-text-muted">{item.detail}</p>
                                            </div>
                                        </div>
                                        <span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${getReadinessStatusClass(item.status)}`}>
                                            {getReadinessStatusLabel(item.status)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderSettingsPanel = () => {
        const displaySlug = slugValidation.ok === true ? slugValidation.slug : normalizedDraftSlug || currentBioSlug || 'bio';
        const publicUrl = `${window.location.origin}/bio/${displaySlug}`;
        const qrColor = typeof settings.qrColor === 'string' ? settings.qrColor : theme.buttonColor || '#111827';
        const qrBackgroundColor = typeof settings.qrBackgroundColor === 'string' ? settings.qrBackgroundColor : '#ffffff';
        const qrLogoUrl = typeof settings.qrLogoUrl === 'string' ? settings.qrLogoUrl : '';
        const campaignUrlPage = { slug: displaySlug, settings } as any;
        const shareCampaignUrl = buildBioPageTrackedUrl({ page: campaignUrlPage, origin: window.location.origin, channel: 'share' });
        const qrCampaignUrl = buildBioPageTrackedUrl({ page: campaignUrlPage, origin: window.location.origin, channel: 'qr' });
        const slugValidationError = slugValidation.ok === false
            ? slugValidation.error
            : t('bioPage.slugUnavailable', 'Slug unavailable.');

        const handleSlugInput = (value: string) => {
            setSlugDraft(value);
        };

        return (
            <div className="space-y-4">
                <CollapsiblePanelHeader
                    title={t('bioPage.settings', 'Settings')}
                    onExpandAll={expandSettingsSections}
                    onCollapseAll={collapseSettingsSections}
                />

                <CollapsibleSection
                    title={t('bioPage.integrationReadiness', 'Integration readiness')}
                    isOpen={settingsSections.integrationReadiness}
                    onToggle={() => toggleSettingsSection('integrationReadiness')}
                >
                    {renderIntegrationReadinessPanel()}
                </CollapsibleSection>

                <CollapsibleSection
                    title={t('bioPage.publicRoute', 'Public route')}
                    isOpen={settingsSections.publicRoute}
                    onToggle={() => toggleSettingsSection('publicRoute')}
                >
                    <div className="space-y-3">
                    <div>
                        <p className="text-xs text-q-text-muted">
                            {t('bioPage.publicRouteDesc', 'Set a short, shareable slug for this Bio Page.')}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-q-text-muted">
                            {t('bioPage.customSlug', 'Custom slug')}
                        </label>
                        <div className="flex items-center overflow-hidden rounded-lg border border-q-border/60 bg-background focus-within:ring-2 focus-within:ring-primary/40">
                            <span className="shrink-0 border-r border-q-border/60 px-3 py-2 text-xs text-q-text-muted">
                                /bio/
                            </span>
                            <input
                                value={slugDraft}
                                onChange={(event) => handleSlugInput(event.target.value)}
                                onBlur={() => {
                                    if (slugValidation.ok === true) setSlugDraft(slugValidation.slug);
                                }}
                                placeholder="creator-shop"
                                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none"
                            />
                        </div>
                        <div className="flex min-h-[20px] items-center gap-2 text-xs">
                            {slugAvailability.status === 'checking' && (
                                <>
                                    <Loader2 size={12} className="animate-spin text-q-text-muted" />
                                    <span className="text-q-text-muted">
                                        {t('bioPage.checkingSlug', 'Checking availability...')}
                                    </span>
                                </>
                            )}
                            {slugAvailability.status === 'available' && (
                                <>
                                    <Check size={12} className="text-q-success" />
                                    <span className="min-w-0 truncate text-q-text-muted">
                                        {publicUrl}
                                    </span>
                                </>
                            )}
                            {slugAvailability.status !== 'checking' && slugAvailability.status !== 'available' && (
                                <span className="text-q-warning">
                                    {slugAvailability.message || t('bioPage.slugValidationHint', '{{error}} Normalized preview: {{slug}}', {
                                        error: slugValidationError,
                                        slug: normalizedDraftSlug || 'bio',
                                    })}
                                </span>
                            )}
                        </div>
                    </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title={t('bioPage.utmSettings', 'UTM settings')}
                    isOpen={settingsSections.utm}
                    onToggle={() => toggleSettingsSection('utm')}
                >
                    <div className="space-y-4">
                    <div>
                        <p className="text-xs text-q-text-muted">
                            {t('bioPage.utmSettingsDesc', 'Configure campaign attribution for shared URLs and printed QR traffic.')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-q-text-muted">
                                {t('bioPage.shareUtmSource', 'Share source')}
                            </label>
                            <input
                                value={typeof settings.shareUtmSource === 'string' ? settings.shareUtmSource : ''}
                                onChange={(event) => updateSettings({ shareUtmSource: event.target.value || undefined })}
                                placeholder="bio_page"
                                className="w-full rounded-lg border border-q-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-q-text-muted">
                                {t('bioPage.shareUtmMedium', 'Share medium')}
                            </label>
                            <input
                                value={typeof settings.shareUtmMedium === 'string' ? settings.shareUtmMedium : ''}
                                onChange={(event) => updateSettings({ shareUtmMedium: event.target.value || undefined })}
                                placeholder="share"
                                className="w-full rounded-lg border border-q-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-q-text-muted">
                                {t('bioPage.shareUtmCampaign', 'Share campaign')}
                            </label>
                            <input
                                value={typeof settings.shareUtmCampaign === 'string' ? settings.shareUtmCampaign : ''}
                                onChange={(event) => updateSettings({ shareUtmCampaign: event.target.value || undefined })}
                                placeholder="launch"
                                className="w-full rounded-lg border border-q-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-q-text-muted">
                                {t('bioPage.qrUtmSource', 'QR source')}
                            </label>
                            <input
                                value={typeof settings.qrUtmSource === 'string' ? settings.qrUtmSource : ''}
                                onChange={(event) => updateSettings({ qrUtmSource: event.target.value || undefined })}
                                placeholder="qr"
                                className="w-full rounded-lg border border-q-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-q-text-muted">
                                {t('bioPage.qrUtmMedium', 'QR medium')}
                            </label>
                            <input
                                value={typeof settings.qrUtmMedium === 'string' ? settings.qrUtmMedium : ''}
                                onChange={(event) => updateSettings({ qrUtmMedium: event.target.value || undefined })}
                                placeholder="bio_page"
                                className="w-full rounded-lg border border-q-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-q-text-muted">
                                {t('bioPage.qrUtmCampaign', 'QR campaign')}
                            </label>
                            <input
                                value={typeof settings.qrUtmCampaign === 'string' ? settings.qrUtmCampaign : ''}
                                onChange={(event) => updateSettings({ qrUtmCampaign: event.target.value || undefined })}
                                placeholder="print-campaign"
                                className="w-full rounded-lg border border-q-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-[11px] text-q-text-muted">
                        <p className="truncate">
                            <span className="font-semibold text-foreground">{t('bioPage.shareUrlPreview', 'Share URL')}:</span> {shareCampaignUrl}
                        </p>
                        <p className="truncate">
                            <span className="font-semibold text-foreground">{t('bioPage.qrUrlPreview', 'QR URL')}:</span> {qrCampaignUrl}
                        </p>
                    </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title={t('bioPage.seoSettings', 'SEO settings')}
                    isOpen={settingsSections.seo}
                    onToggle={() => toggleSettingsSection('seo')}
                >
                    <div className="space-y-4">
                    <div>
                        <p className="text-xs text-q-text-muted">
                            {t('bioPage.seoSettingsDesc', 'Control search previews, social cards, canonical URL, and indexing.')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-q-text-muted">
                            {t('bioPage.seoTitle', 'SEO title')}
                        </label>
                        <input
                            value={seo.title || ''}
                            onChange={(event) => updateSEO({ title: event.target.value || undefined })}
                            placeholder={profile.displayName || profile.name || activeProject?.name || 'Creator Bio Page'}
                            className="w-full rounded-lg border border-q-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-q-text-muted">
                            {t('bioPage.seoDescription', 'SEO description')}
                        </label>
                        <textarea
                            value={seo.description || ''}
                            onChange={(event) => updateSEO({ description: event.target.value || undefined })}
                            placeholder={profile.bio || t('bioPage.seoDescriptionPlaceholder', 'A short preview description for search and social sharing.')}
                            rows={3}
                            className="w-full resize-none rounded-lg border border-q-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-q-text-muted">
                            {t('bioPage.ogImage', 'Social preview image')}
                        </label>
                        <ImagePicker
                            value={seo.ogImageUrl || ''}
                            onChange={(url) => updateSEO({ ogImageUrl: url || undefined })}
                            label={t('bioPage.selectOgImage', 'Select preview image')}
                            showAIGeneration={true}
                            aspectRatio="16:9"
                            hideUrlInput={false}
                            destination="user"
                            contentId={bioPage?.id || activeProjectId || 'bio-page'}
                            contentType="bio_page_seo"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-q-text-muted">
                            {t('bioPage.canonicalUrl', 'Canonical URL')}
                        </label>
                        <input
                            type="url"
                            value={seo.canonicalUrl || ''}
                            onChange={(event) => updateSEO({ canonicalUrl: event.target.value || undefined })}
                            placeholder={publicUrl}
                            className="w-full rounded-lg border border-q-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-q-text-muted">
                                {t('bioPage.schemaType', 'Schema type')}
                            </label>
                            <AppSelect
                                value={seo.schemaType || 'Person'}
                                onChange={(event) => updateSEO({ schemaType: event.target.value as any })}
                                className="w-full rounded-lg border border-q-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                            >
                                <option value="Person">Person</option>
                                <option value="Organization">Organization</option>
                                <option value="LocalBusiness">LocalBusiness</option>
                                <option value="WebPage">WebPage</option>
                            </AppSelect>
                        </div>

                        <label className="flex min-h-[70px] items-center gap-3 rounded-lg border border-q-border/60 bg-background px-3 py-2">
                            <input
                                type="checkbox"
                                checked={seo.noIndex === true}
                                onChange={(event) => updateSEO({ noIndex: event.target.checked })}
                                className="h-4 w-4 rounded border-q-border text-primary focus:ring-primary"
                            />
                            <span>
                                <span className="block text-xs font-medium text-foreground">
                                    {t('bioPage.noIndex', 'No index')}
                                </span>
                                <span className="block text-[11px] text-q-text-muted">
                                    {t('bioPage.noIndexHint', 'Keep search engines from indexing this page.')}
                                </span>
                            </span>
                        </label>
                    </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title={t('bioPage.qrBranding', 'QR branding')}
                    isOpen={settingsSections.qrBranding}
                    onToggle={() => toggleSettingsSection('qrBranding')}
                >
                    <div className="space-y-4">
                    <div>
                        <p className="text-xs text-q-text-muted">
                            {t('bioPage.qrBrandingDesc', 'Brand the downloadable QR code used in campaigns and print materials.')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <ColorControl
                            label={t('bioPage.qrForeground', 'QR foreground')}
                            value={qrColor}
                            onChange={(value) => updateSettings({ qrColor: value })}
                        />
                        <ColorControl
                            label={t('bioPage.qrBackground', 'QR background')}
                            value={qrBackgroundColor}
                            onChange={(value) => updateSettings({ qrBackgroundColor: value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-q-text-muted">
                            {t('bioPage.qrLogo', 'QR logo')}
                        </label>
                        <ImagePicker
                            value={qrLogoUrl}
                            onChange={(url) => updateSettings({ qrLogoUrl: url || undefined })}
                            label={t('bioPage.selectQrLogo', 'Select QR logo')}
                            showAIGeneration={false}
                            aspectRatio="1:1"
                            hideUrlInput={false}
                            destination="user"
                            contentId={bioPage?.id || activeProjectId || 'bio-page'}
                            contentType="bio_page_qr"
                        />
                        {(profile.logoUrl || profile.avatarUrl) && !qrLogoUrl && (
                            <button
                                type="button"
                                onClick={() => updateSettings({ qrLogoUrl: profile.logoUrl || profile.avatarUrl })}
                                className="text-xs font-medium text-q-accent hover:text-q-accent/80"
                            >
                                {t('bioPage.useProfileImageForQr', 'Use profile image')}
                            </button>
                        )}
                    </div>
                    </div>
                </CollapsibleSection>
            </div>
        );
    };

    const renderSharePanel = () => {
        const publicSlug = slug || bioPage?.slug || bioPage?.username || profile.name?.toLowerCase().replace(/\s+/g, '-') || 'bio';
        const publicUrl = `${window.location.origin}/bio/${publicSlug.toLowerCase()}`;
        const campaignUrl = buildBioPageTrackedUrl({
            page: {
                slug: publicSlug,
                settings: {
                    ...(bioPage?.settings || {}),
                    ...settings,
                },
            } as any,
            origin: window.location.origin,
            channel: 'share',
        });
        const qrTargetUrl = buildBioPageTrackedUrl({
            page: {
                slug: publicSlug,
                settings: {
                    ...(bioPage?.settings || {}),
                    ...settings,
                },
            } as any,
            origin: window.location.origin,
            channel: 'qr',
        });

        const handleGenerateQr = async () => {
            if (!bioPage) return;
            setIsGeneratingQr(true);
            try {
                const qr = await generateBioPageQrCode({
                    page: {
                        ...bioPage,
                        slug: publicSlug,
                        username: publicSlug,
                        profile,
                        theme,
                        settings: {
                            ...(bioPage.settings || {}),
                            ...settings,
                        },
                    } as any,
                    origin: window.location.origin,
                    color: typeof settings.qrColor === 'string' ? settings.qrColor : theme.buttonColor,
                    backgroundColor: typeof settings.qrBackgroundColor === 'string' ? settings.qrBackgroundColor : '#ffffff',
                    logoUrl: typeof settings.qrLogoUrl === 'string' ? settings.qrLogoUrl : profile.logoUrl || profile.avatarUrl,
                });
                setQrDataUrl(qr.dataUrl);
            } catch (error) {
                console.error('[BioPageBuilder] Error generating QR:', error);
                setNotificationModal({
                    isOpen: true,
                    title: t('bioPage.error', 'Error'),
                    message: t('bioPage.qrFailed', 'Could not generate QR code.'),
                    type: 'error',
                });
            } finally {
                setIsGeneratingQr(false);
            }
        };

        const handleDownloadQr = () => {
            if (!qrDataUrl) return;
            const link = document.createElement('a');
            link.href = qrDataUrl;
            link.download = `${publicSlug}-qr.png`;
            link.click();
        };

        return (
            <div className="space-y-4">
                <div className="rounded-xl border border-q-border/50 bg-q-surface/50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-q-text-secondary mb-2">
                        {t('bioPage.publicUrl', 'Public URL')}
                    </p>
                    <div className="flex items-center gap-2">
                        <input
                            value={publicUrl}
                            readOnly
                            className="min-w-0 flex-1 rounded-lg border border-q-border/60 bg-background px-3 py-2 text-sm text-foreground"
                        />
                        <button
                            onClick={async () => {
                                await navigator.clipboard.writeText(publicUrl);
                                setNotificationModal({
                                    isOpen: true,
                                    title: t('bioPage.urlCopied', 'URL Copied'),
                                    message: publicUrl,
                                    type: 'success',
                                });
                            }}
                            className="h-10 w-10 rounded-lg border border-q-border/60 bg-background flex items-center justify-center text-q-text-muted hover:text-foreground"
                            title={t('bioPage.copyUrl', 'Copy URL')}
                        >
                            <Copy size={17} />
                        </button>
                    </div>
                    {!bioPage?.isPublished && (
                        <p className="mt-2 text-xs text-q-warning">
                            {t('bioPage.publishBeforeSharing', 'Publish before sharing this URL publicly.')}
                        </p>
                    )}
                </div>

                <div className="rounded-xl border border-q-border/50 bg-q-surface/50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-q-text-secondary mb-2">
                        {t('bioPage.campaignUrl', 'Campaign URL')}
                    </p>
                    <div className="flex items-center gap-2">
                        <input
                            value={campaignUrl}
                            readOnly
                            className="min-w-0 flex-1 rounded-lg border border-q-border/60 bg-background px-3 py-2 text-sm text-foreground"
                        />
                        <button
                            onClick={async () => {
                                await navigator.clipboard.writeText(campaignUrl);
                                setNotificationModal({
                                    isOpen: true,
                                    title: t('bioPage.urlCopied', 'URL Copied'),
                                    message: campaignUrl,
                                    type: 'success',
                                });
                            }}
                            className="h-10 w-10 rounded-lg border border-q-border/60 bg-background flex items-center justify-center text-q-text-muted hover:text-foreground"
                            title={t('bioPage.copyCampaignUrl', 'Copy campaign URL')}
                        >
                            <Copy size={17} />
                        </button>
                    </div>
                    <p className="mt-2 truncate text-[11px] text-q-text-muted">
                        {t('bioPage.qrTargetUrl', 'QR target')}: {qrTargetUrl}
                    </p>
                </div>

                <div className="rounded-xl border border-q-border/50 bg-q-surface/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="font-semibold text-foreground">{t('bioPage.qrCode', 'QR Code')}</p>
                            <p className="text-xs text-q-text-muted">{t('bioPage.qrCodeDesc', 'Generate a trackable QR for this Bio Page.')}</p>
                        </div>
                        <button
                            onClick={handleGenerateQr}
                            disabled={!bioPage || isGeneratingQr}
                            className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                            {isGeneratingQr ? <Loader2 size={15} className="animate-spin" /> : <QrCode size={15} />}
                            {t('bioPage.generate', 'Generate')}
                        </button>
                    </div>
                    {qrDataUrl && (
                        <div className="mt-4 flex items-center gap-4">
                            <img src={qrDataUrl} alt={t('bioPage.qrImageAlt', 'Bio Page QR code')} className="h-32 w-32 rounded-lg bg-white p-2" />
                            <button
                                onClick={handleDownloadQr}
                                className="h-9 px-3 rounded-lg border border-q-border/60 text-sm font-medium text-foreground flex items-center gap-2"
                            >
                                <Download size={15} />
                                {t('bioPage.download', 'Download')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ==========================================================================
    // MOBILE PREVIEW
    // ==========================================================================

    const renderMobilePreview = () => {
        // Calculate background style
        const getPreviewBackgroundStyle = (): React.CSSProperties => {
            const baseColor = theme.backgroundColor || '#1a1a2e';
            const gradientEndColor = theme.gradientColor || '#0f0f1a';

            switch (theme.backgroundType) {
                case 'gradient':
                    return { background: `linear-gradient(135deg, ${baseColor}, ${gradientEndColor})` };
                case 'blur':
                    return {
                        background: `linear-gradient(135deg, ${baseColor}cc, ${gradientEndColor}cc)`,
                        backdropFilter: 'blur(20px)',
                    };
                case 'pattern': {
                    const patternColor = theme.patternColor || theme.buttonColor;
                    const patternSize = theme.patternSize || 20;
                    const patternType = theme.backgroundPattern || 'dots';

                    const patterns: Record<string, { image: string; size: string }> = {
                        dots: {
                            image: `radial-gradient(${patternColor}40 1px, transparent 1px)`,
                            size: `${patternSize}px ${patternSize}px`,
                        },
                        grid: {
                            image: `linear-gradient(${patternColor}20 1px, transparent 1px), linear-gradient(90deg, ${patternColor}20 1px, transparent 1px)`,
                            size: `${patternSize}px ${patternSize}px`,
                        },
                        diagonal: {
                            image: `repeating-linear-gradient(45deg, transparent, transparent ${patternSize / 4}px, ${patternColor}15 ${patternSize / 4}px, ${patternColor}15 ${patternSize / 4 + 1}px)`,
                            size: `${patternSize}px ${patternSize}px`,
                        },
                        waves: {
                            image: `repeating-linear-gradient(0deg, ${patternColor}10 0px, ${patternColor}10 2px, transparent 2px, transparent ${patternSize / 2.5}px)`,
                            size: `100% ${patternSize / 2}px`,
                        },
                    };

                    const p = patterns[patternType] || patterns.dots;
                    return {
                        backgroundColor: baseColor,
                        backgroundImage: p.image,
                        backgroundSize: p.size,
                    };
                }
                case 'image':
                    if (theme.backgroundImage) {
                        return {
                            backgroundImage: `url(${theme.backgroundImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                        };
                    }
                    return { backgroundColor: baseColor };
                case 'video':
                case 'solid':
                default:
                    return { backgroundColor: baseColor };
            }
        };

        // Calculate button shadow
        const getPreviewButtonShadow = () => {
            switch (theme.buttonShadow) {
                case 'soft': return '0 4px 12px rgba(0,0,0,0.15)';
                case 'strong': return '0 8px 24px rgba(0,0,0,0.25)';
                case 'hard': return '4px 4px 0px rgba(0,0,0,0.3)';
                default: return 'none';
            }
        };

        // Text colors
        const titleColor = theme.titleColor || theme.textColor || '#ffffff';
        const bodyColor = theme.bodyColor || theme.textColor || '#ffffff';
        const previewEmailSubscribeBlock = canAccessEmailMarketing
            ? blocks.find(block => block.type === 'email_subscribe' && block.visible !== false && canAccessBioBlock(block))
            : undefined;
        const shouldShowEmailBlock = canAccessEmailMarketing && (emailSignupEnabled || Boolean(previewEmailSubscribeBlock));
        const previewEmailPlaceholder = typeof previewEmailSubscribeBlock?.data?.placeholder === 'string' && previewEmailSubscribeBlock.data.placeholder.trim()
            ? previewEmailSubscribeBlock.data.placeholder
            : DEFAULT_BIO_EMAIL_PLACEHOLDER;
        const previewEmailButtonText = typeof previewEmailSubscribeBlock?.data?.buttonText === 'string' && previewEmailSubscribeBlock.data.buttonText.trim()
            ? previewEmailSubscribeBlock.data.buttonText
            : DEFAULT_BIO_EMAIL_BUTTON_TEXT;
        const previewEmailConsentRequired = true;
        const previewEmailConsentText = typeof previewEmailSubscribeBlock?.data?.consentText === 'string' && previewEmailSubscribeBlock.data.consentText.trim()
            ? previewEmailSubscribeBlock.data.consentText
            : DEFAULT_BIO_EMAIL_CONSENT_TEXT;
        const socialLinksBlock = blocks.find(block => block.visible !== false && block.type === 'social_links' && canAccessBioBlock(block));
        const visiblePreviewLinks = links.filter(link => canAccessBioLink(link) && link.enabled !== false && link.visible !== false);
        const previewSocialLinks = selectLinksForSocialBlock(socialLinksBlock, visiblePreviewLinks);
        const previewSocialLinkIds = new Set(previewSocialLinks.map(link => link.id));
        const previewMainLinks = socialLinksBlock
            ? visiblePreviewLinks.filter(link => !previewSocialLinkIds.has(link.id))
            : visiblePreviewLinks;
        const previewExtraBlocks = [...blocks]
            .filter(block => block.visible !== false && canAccessBioBlock(block))
            .filter(block => !['profile', 'link', 'social_links', 'email_subscribe'].includes(block.type))
            .sort((a, b) => a.order - b.order);
        const previewBlockCardStyle: React.CSSProperties = {
            borderRadius: 16,
            border: `1px solid ${theme.buttonColor}33`,
            backgroundColor: `${theme.buttonColor}14`,
            color: bodyColor,
        };
        const previewProducts = availableBioProducts.length ? availableBioProducts : products;
        const renderPreviewExtraBlock = (block: BioPageBlock) => {
            const Icon = BLOCK_ICON_BY_TYPE[block.type] || Layers;
            const mediaUrl = typeof block.data?.url === 'string' ? sanitizeBioMediaUrl(block.data.url) : '';
            const items = Array.isArray(block.data?.items)
                ? block.data.items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
                : [];

            if (block.type === 'product_grid' || block.type === 'product_collection') {
                const blockProducts = filterBioPageProductsForBlock(previewProducts, block);

                return (
                    <div key={block.id} className="mt-3 p-3 text-left" style={previewBlockCardStyle}>
                        <div className="mb-2 flex items-center gap-2">
                            {block.type === 'product_collection'
                                ? <Store size={15} style={{ color: theme.buttonColor }} />
                                : <ShoppingBag size={15} style={{ color: theme.buttonColor }} />}
                            <span className="text-xs font-semibold" style={{ color: titleColor }}>{block.title || 'Shop'}</span>
                        </div>
                        {blockProducts.length ? (
                            <div className="grid grid-cols-2 gap-2">
                                {blockProducts.slice(0, 4).map(product => (
                                    <div key={product.id} className="overflow-hidden rounded-lg bg-q-text/10">
                                        {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="aspect-square w-full object-cover" />}
                                        <div className="p-2">
                                            <p className="truncate text-[11px] font-semibold" style={{ color: titleColor }}>{product.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[11px] opacity-70">{t('bioPage.noApprovedProductsPreview', 'Approved products will appear here.')}</p>
                        )}
                    </div>
                );
            }

            if (block.type === 'booking' && block.data?.bookingMode === 'inline') {
                return (
                    <div key={block.id} className="mt-3 p-3 text-left" style={previewBlockCardStyle}>
                        <div className="mb-2 flex items-center gap-2">
                            <Calendar size={15} style={{ color: theme.buttonColor }} />
                            <span className="text-xs font-semibold" style={{ color: titleColor }}>{block.title || 'Book an appointment'}</span>
                        </div>
                        {block.description && <p className="mb-3 text-[11px] opacity-70">{block.description}</p>}
                        <div className="space-y-2">
                            <div className="h-8 rounded-md bg-q-text/10" />
                            <div className="grid grid-cols-2 gap-2">
                                <div className="h-8 rounded-md bg-q-text/10" />
                                <div className="h-8 rounded-md bg-q-text/10" />
                            </div>
                            <div className="h-9 rounded-md" style={{ backgroundColor: theme.buttonColor }} />
                        </div>
                    </div>
                );
            }

            if (block.type === 'lead_form') {
                const previewLeadFields = normalizeBioLeadFields(block.data?.fields);
                const consentRequired = block.data?.consentRequired !== false;

                return (
                    <div key={block.id} className="mt-3 p-3 text-left" style={previewBlockCardStyle}>
                        <div className="mb-2 flex items-center gap-2">
                            <FileText size={15} style={{ color: theme.buttonColor }} />
                            <span className="text-xs font-semibold" style={{ color: titleColor }}>{block.title || 'Contact'}</span>
                        </div>
                        {block.description && <p className="mb-3 text-[11px] opacity-70">{block.description}</p>}
                        <div className="space-y-2">
                            {previewLeadFields.slice(0, 5).map(field => (
                                <div key={field.id} className="rounded-md bg-q-text/10 px-2 py-2 text-[11px] opacity-75">
                                    {field.label}{field.required ? ' *' : ''}
                                </div>
                            ))}
                            {consentRequired && (
                                <div className="flex items-start gap-2 rounded-md bg-q-text/10 px-2 py-2 text-[10px] opacity-70">
                                    <span className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border" style={{ borderColor: `${theme.buttonColor}88` }} />
                                    <span className="line-clamp-2">
                                        {typeof block.data?.consentText === 'string' && block.data.consentText.trim()
                                            ? block.data.consentText
                                            : DEFAULT_BIO_LEAD_CONSENT_TEXT}
                                    </span>
                                </div>
                            )}
                            <div className="rounded-md px-3 py-2 text-center text-[11px] font-semibold" style={{ backgroundColor: theme.buttonColor, color: theme.buttonTextColor || '#ffffff' }}>
                                {t('bioPage.send', 'Send')}
                            </div>
                        </div>
                    </div>
                );
            }

            if (block.type === 'featured_media' && mediaUrl) {
                return (
                    <div key={block.id} className="mt-3 overflow-hidden text-left" style={previewBlockCardStyle}>
                        <img src={mediaUrl} alt={block.title} className="aspect-video w-full object-cover" />
                        <div className="p-3">
                            <p className="text-xs font-semibold" style={{ color: titleColor }}>{block.title}</p>
                            {block.description && <p className="mt-1 text-[11px] opacity-70">{block.description}</p>}
                        </div>
                    </div>
                );
            }

            if ((block.type === 'media_grid' || block.type === 'portfolio_grid') && items.length) {
                const isMediaGrid = block.type === 'media_grid';
                return (
                    <div key={block.id} className="mt-3 p-3 text-left" style={previewBlockCardStyle}>
                        <p className="mb-2 text-xs font-semibold" style={{ color: titleColor }}>
                            {block.title || (isMediaGrid ? t('bioPage.mediaGridTitle', 'Media') : t('bioPage.portfolioTitle', 'Portfolio'))}
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                            {items.slice(0, 6).map((item, index) => {
                                const rawUrl = typeof item.url === 'string' ? item.url : typeof item.imageUrl === 'string' ? item.imageUrl : '';
                                const url = rawUrl ? sanitizeBioMediaUrl(rawUrl) : '';
                                const itemType = typeof item.type === 'string' ? item.type : '';
                                return (
                                    <div key={`${block.id}-${index}`} className="aspect-square overflow-hidden rounded-md bg-q-text/10 bg-cover bg-center" style={url && !itemType.startsWith('video/') ? { backgroundImage: `url(${url})` } : undefined}>
                                        {itemType.startsWith('video/') && (
                                            <div className="flex h-full w-full items-center justify-center text-q-text-muted">
                                                <Video size={14} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }

            if (block.type === 'testimonials') {
                const testimonials = items.filter(item => typeof item.quote === 'string' && item.quote.trim());
                if (!testimonials.length) return null;
                return (
                    <div key={block.id} className="mt-3 p-3 text-left" style={previewBlockCardStyle}>
                        <div className="mb-2 flex items-center gap-2">
                            <Users size={15} style={{ color: theme.buttonColor }} />
                            <span className="text-xs font-semibold" style={{ color: titleColor }}>{block.title || 'Testimonials'}</span>
                        </div>
                        <div className="space-y-2">
                            {testimonials.slice(0, 2).map((item, index) => (
                                <div key={`${block.id}-testimonial-preview-${index}`} className="rounded-lg bg-q-text/10 p-2">
                                    <p className="line-clamp-3 text-[11px]" style={{ color: bodyColor }}>
                                        "{String(item.quote)}"
                                    </p>
                                    {typeof item.author === 'string' && item.author.trim() && (
                                        <p className="mt-1 truncate text-[10px] font-semibold" style={{ color: titleColor }}>
                                            {item.author}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            return (
                <div
                    key={block.id}
                    className="mt-3 flex items-center gap-3 p-3 text-left"
                    style={previewBlockCardStyle}
                    onClick={block.type === 'chatbot_cta' ? () => setIsChatbotPreviewOpen(true) : undefined}
                >
                    <Icon size={16} style={{ color: theme.buttonColor }} />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold" style={{ color: titleColor }}>{block.title || formatBlockTypeLabel(block.type)}</p>
                        {block.description && <p className="truncate text-[11px] opacity-70">{block.description}</p>}
                    </div>
                </div>
            );
        };

        // Profile size
        const avatarSize = theme.profileSize === 'large' ? 'w-24 h-24' : 'w-20 h-20';
        const titleSize = theme.profileSize === 'large' ? 'text-xl' : 'text-lg';

        return (
            <div
                className="w-[280px] h-[580px] rounded-3xl overflow-hidden shadow-2xl border-4 border-q-border relative"
                style={getPreviewBackgroundStyle()}
            >
                {/* Phone Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-q-surface-overlay rounded-b-2xl z-10" />

                {/* Content */}
                <div className="h-full overflow-y-auto p-6 pt-10 relative">
                    {/* Header Gradient Overlay */}
                    {theme.headerOverlay && (theme.backgroundType === 'image' || theme.backgroundType === 'video') && (
                        <div
                            className="absolute top-0 left-0 right-0 h-48 pointer-events-none z-0"
                            style={{
                                background: `linear-gradient(to bottom, ${hexToRgba(theme.headerOverlayColor || '#000000', 0.6)} 0%, ${hexToRgba(theme.headerOverlayColor || '#000000', 0.3)} 50%, transparent 100%)`,
                            }}
                        />
                    )}

                    {/* Profile - Hero Layout */}
                    {theme.profileLayout === 'hero' ? (
                        <div
                            className="mb-8 relative z-10"
                            style={theme.profileBox ? {
                                backgroundColor: theme.profileBoxColor || '#000000',
                                borderRadius: theme.profileBoxRadius === 'none' ? '0px' :
                                    theme.profileBoxRadius === 'sm' ? '8px' :
                                        theme.profileBoxRadius === 'lg' ? '20px' : '12px',
                                padding: '16px',
                            } : undefined}
                        >
                            {profile.avatarUrl && (
                                <div
                                    className="w-full h-32 rounded-xl mb-3 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${profile.avatarUrl})` }}
                                />
                            )}
                            {/* Title - Logo and/or Text */}
                            {theme.titleStyle === 'both' && profile.logoUrl ? (
                                <div className="flex items-center gap-2 mb-2">
                                    <img
                                        src={profile.logoUrl}
                                        alt={profile.name}
                                        className="h-10 w-auto object-contain"
                                    />
                                    <h2 className={`font-bold ${titleSize}`} style={{ fontFamily: theme.titleFont, color: titleColor }}>
                                        {profile.name}
                                    </h2>
                                </div>
                            ) : (
                                <>
                                    {theme.titleStyle === 'logo' && profile.logoUrl && (
                                        <div className="mb-2">
                                            <img
                                                src={profile.logoUrl}
                                                alt={profile.name}
                                                className="h-10 max-w-[200px] object-contain"
                                            />
                                        </div>
                                    )}

                                    {(theme.titleStyle === 'text' || !profile.logoUrl) && (
                                        <h2 className={`font-bold ${titleSize}`} style={{ fontFamily: theme.titleFont, color: titleColor }}>
                                            {profile.name}
                                        </h2>
                                    )}
                                </>
                            )}
                            <p className="text-sm opacity-70" style={{ fontFamily: theme.bodyFont, color: bodyColor }}>
                                {profile.bio}
                            </p>
                        </div>
                    ) : (
                        // Circle Layout (default)
                        <div
                            className="text-center mb-8 relative z-10"
                            style={theme.profileBox ? {
                                backgroundColor: theme.profileBoxColor || '#000000',
                                borderRadius: theme.profileBoxRadius === 'none' ? '0px' :
                                    theme.profileBoxRadius === 'sm' ? '8px' :
                                        theme.profileBoxRadius === 'lg' ? '20px' : '12px',
                                padding: '16px',
                            } : undefined}
                        >
                            {/* Avatar */}
                            <div className="relative inline-block mb-3">
                                <div
                                    className={`${avatarSize} rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl font-bold`}
                                    style={{
                                        backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : undefined,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        color: titleColor,
                                    }}
                                >
                                    {!profile.avatarUrl && profile.name.charAt(0)}
                                </div>
                            </div>
                            {/* Title - Logo and/or Text */}
                            {theme.titleStyle === 'both' && profile.logoUrl ? (
                                <div className="flex items-center justify-center gap-2">
                                    <img
                                        src={profile.logoUrl}
                                        alt={profile.name}
                                        className="h-10 w-auto object-contain"
                                    />
                                    <h2 className={`font-bold ${titleSize}`} style={{ fontFamily: theme.titleFont, color: titleColor }}>
                                        {profile.name}
                                    </h2>
                                </div>
                            ) : (
                                <>
                                    {theme.titleStyle === 'logo' && profile.logoUrl && (
                                        <div className="mb-2 flex justify-center">
                                            <img
                                                src={profile.logoUrl}
                                                alt={profile.name}
                                                className="h-10 max-w-[200px] object-contain"
                                            />
                                        </div>
                                    )}

                                    {(theme.titleStyle === 'text' || !profile.logoUrl) && (
                                        <h2 className={`font-bold ${titleSize}`} style={{ fontFamily: theme.titleFont, color: titleColor }}>
                                            {profile.name}
                                        </h2>
                                    )}
                                </>
                            )}
                            <p className="text-sm opacity-70" style={{ fontFamily: theme.bodyFont, color: bodyColor }}>
                                {profile.bio}
                            </p>
                        </div>
                    )}

                    {socialLinksBlock && previewSocialLinks.length > 0 && (
                        <div className="relative z-10 -mt-4 mb-6 flex flex-wrap items-center justify-center gap-2">
                            {previewSocialLinks.slice(0, 12).map(link => {
                                const LinkIcon = getLinkIcon(link);
                                return (
                                    <span
                                        key={link.id}
                                        className="flex h-9 w-9 items-center justify-center rounded-full border"
                                        style={{
                                            borderColor: `${theme.buttonColor}44`,
                                            backgroundColor: `${theme.buttonColor}18`,
                                            color: getLinkAccentColor(link),
                                        }}
                                        title={link.title}
                                    >
                                        <LinkIcon size={16} />
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* Links */}
                    <div className="space-y-3">
                        {previewMainLinks.map((link) => {
                            const borderRadius =
                                theme.buttonShape === 'lg' ? '0.5rem' :
                                    theme.buttonShape === 'xl' ? '0.75rem' : '9999px';

                            const textColor = theme.buttonTextColor || '#ffffff';
                            const shadow = getPreviewButtonShadow();

                            const buttonStyles: Record<string, React.CSSProperties> = {
                                fill: {
                                    backgroundColor: theme.buttonColor,
                                    color: textColor,
                                    boxShadow: shadow,
                                },
                                glass: {
                                    backgroundColor: `${theme.buttonColor}40`,
                                    backdropFilter: 'blur(10px)',
                                    border: `1px solid ${theme.buttonColor}60`,
                                    color: textColor,
                                    boxShadow: shadow,
                                },
                                outline: {
                                    backgroundColor: 'transparent',
                                    border: `2px solid ${theme.buttonColor}`,
                                    color: theme.buttonColor,
                                    boxShadow: shadow,
                                },
                                soft: {
                                    backgroundColor: `${theme.buttonColor}20`,
                                    color: theme.buttonColor,
                                    boxShadow: shadow,
                                },
                            };

                            return (
                                <div
                                    key={link.id}
                                    className={`w-full py-3 px-4 text-center font-medium text-sm ${link.linkType === 'chatbot' ? 'flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                                    style={{
                                        borderRadius,
                                        ...buttonStyles[theme.buttonStyle] || buttonStyles.fill,
                                    }}
                                    onClick={link.linkType === 'chatbot' ? () => setIsChatbotPreviewOpen(true) : undefined}
                                >
                                    {link.linkType === 'chatbot' && <MessageCircle size={16} />}
                                    {link.title}
                                </div>
                            );
                        })}
                    </div>

                    {/* Email Signup */}
                    {shouldShowEmailBlock && (
                        <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: `${theme.buttonColor}10` }}>
                            <p className="text-xs text-center mb-2 opacity-70" style={{ color: bodyColor }}>
                                {previewEmailSubscribeBlock?.title || t('bioPage.joinNewsletter', 'Join my newsletter')}
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder={previewEmailPlaceholder}
                                    className="flex-1 px-3 py-2 text-xs rounded-lg bg-q-text/20 border border-q-border/10 outline-none"
                                />
                                <button
                                    className="px-3 py-2 text-xs font-medium rounded-lg"
                                    style={{ backgroundColor: theme.buttonColor, color: theme.buttonTextColor || '#ffffff' }}
                                >
                                    {previewEmailButtonText}
                                </button>
                            </div>
                            {previewEmailConsentRequired && (
                                <div className="mt-2 flex items-start gap-2 text-[10px] opacity-70" style={{ color: bodyColor }}>
                                    <span className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border" style={{ borderColor: `${theme.buttonColor}88` }} />
                                    <span className="line-clamp-2">{previewEmailConsentText}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {previewExtraBlocks.map(renderPreviewExtraBlock)}

                    {/* Made with Quimera */}
                    <a
                        href="https://quimera.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center text-xs opacity-50 mt-8 hover:opacity-70 transition-opacity"
                        style={{ color: bodyColor }}
                    >
                        Made with Quimera.ai
                    </a>
                </div>

                {/* Chatbot Preview - Floating inside phone preview */}
                {isChatbotPreviewOpen && activeProject && (
                    <div className="absolute inset-0 bg-q-text/40 z-50 flex flex-col justify-end p-3 pt-8">
                        <div
                            className="bg-q-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                            style={{ height: '90%' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ChatCore
                                config={activeProject.aiAssistantConfig || {
                                    agentName: 'AI Assistant',
                                    tone: 'Professional',
                                    languages: 'Spanish, English',
                                    businessProfile: profile.bio,
                                    productsServices: '',
                                    policiesContact: '',
                                    specialInstructions: '',
                                    faqs: [],
                                    knowledgeDocuments: [],
                                    knowledgeLinks: [],
                                    widgetColor: theme.buttonColor,
                                    isActive: true,
                                    leadCaptureEnabled: false,
                                    enableLiveVoice: false,
                                    voiceName: 'Puck',
                                }}
                                project={activeProject}
                                appearance={activeProject.aiAssistantConfig?.appearance || {
                                    branding: {
                                        logoType: 'none',
                                        logoSize: 'md',
                                        showBotAvatar: true,
                                        showUserAvatar: false,
                                        userAvatarStyle: 'initials',
                                    },
                                    colors: {
                                        primaryColor: theme.buttonColor,
                                        secondaryColor: theme.buttonColor,
                                        accentColor: theme.buttonColor,
                                        userBubbleColor: theme.buttonColor,
                                        userTextColor: '#ffffff',
                                        botBubbleColor: '#f3f4f6',
                                        botTextColor: '#1f2937',
                                        backgroundColor: '#ffffff',
                                        inputBackground: '#f9fafb',
                                        inputBorder: '#e5e7eb',
                                        inputText: '#1f2937',
                                        headerBackground: theme.buttonColor,
                                        headerText: '#ffffff',
                                    },
                                    behavior: {
                                        position: 'bottom-right',
                                        offsetX: 0,
                                        offsetY: 0,
                                        width: 'md',
                                        height: 'lg',
                                        autoOpen: true,
                                        autoOpenDelay: 0,
                                        openOnScroll: 0,
                                        openOnTime: 0,
                                        fullScreenOnMobile: false,
                                    },
                                    messages: {
                                        welcomeMessage: t('bioPage.chatWelcome', 'Hi! How can I help you today?'),
                                        welcomeMessageEnabled: true,
                                        welcomeDelay: 0,
                                        inputPlaceholder: t('bioPage.chatPlaceholder', 'Type a message...'),
                                        quickReplies: [],
                                        showTypingIndicator: true,
                                    },
                                    button: {
                                        buttonStyle: 'circle',
                                        buttonSize: 'md',
                                        buttonIcon: 'chat',
                                        showButtonText: false,
                                        pulseEffect: false,
                                        shadowSize: 'md',
                                        showTooltip: false,
                                        tooltipText: '',
                                    },
                                    theme: 'light',
                                }}
                                showHeader={true}
                                onClose={() => setIsChatbotPreviewOpen(false)}
                                autoOpen={true}
                                isEmbedded={true}
                                chatbotEngineContext={buildChatbotEngineSurfaceContext({
                                    sourceSurface: 'admin_preview',
                                    sourceModule: 'bio-page',
                                    route: 'bio-page-builder/chatbot-preview',
                                    entityType: 'bio_page',
                                    entityId: bioPage?.id || activeProject.id,
                                    entitySlug: slug || bioPage?.slug,
                                    contextKeys: ['bio_page_builder', 'chatbot_preview'],
                                    metadata: {
                                        projectId: activeProject.id,
                                        bioPageId: bioPage?.id,
                                        preview: true,
                                    },
                                })}
                                className="h-full"
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ==========================================================================
    // MAIN RENDER
    // ==========================================================================

    return (
        <div className="flex h-[100dvh] min-w-0 overflow-hidden bg-q-bg text-foreground">
            {/* Dashboard Sidebar */}
            <DashboardSidebar
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="quimera-dashboard-header-bar h-14 px-2 sm:px-6 flex items-center justify-between z-20 sticky top-0">
                    <div className="flex items-center gap-1 sm:gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-foreground transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Link2 className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
                            <h1 className="text-xl font-bold text-foreground hidden sm:block">
                                {t('bioPage.title', 'Bio Page')}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {/* Save status */}
                        <div className="flex items-center gap-2 sm:gap-3 text-xs">
                            {isSaving ? (
                                <span className="flex items-center gap-1.5 text-q-text-muted">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span className="hidden sm:inline">{t('common.saving', 'Saving...')}</span>
                                </span>
                            ) : hasUnsavedChanges ? (
                                <>
                                    <span className="flex items-center gap-1.5 text-q-accent">
                                        <span className="w-2 h-2 rounded-full bg-q-accent" />
                                        <span className="hidden sm:inline">{t('common.unsavedChanges', 'Unsaved')}</span>
                                    </span>
                                    <button
                                        onClick={async () => {
                                            if (!bioPage && activeProjectId) {
                                                const username = getInitialBioPageSlug();
                                                await createBioPage(activeProjectId, username);
                                            }
                                            await saveBioPage();
                                        }}
                                        className="h-9 w-9 flex items-center justify-center text-primary hover:opacity-80 transition-opacity"
                                        title={t('common.save', 'Save')}
                                    >
                                        <Check size={18} />
                                    </button>
                                </>
                            ) : bioPage ? (
                                <span className="flex items-center gap-1.5 text-q-success">
                                    <Check size={14} />
                                    <span className="hidden sm:inline">{t('common.saved', 'Saved')}</span>
                                </span>
                            ) : null}
                        </div>
                        <button
                            onClick={async () => {
                                if (bioPage?.isPublished) {
                                    // Copy URL to clipboard
                                    const publicUrl = `${window.location.origin}/bio/${(bioPage.slug || bioPage.username).toLowerCase()}`;
                                    await navigator.clipboard.writeText(publicUrl);
                                    setNotificationModal({
                                        isOpen: true,
                                        title: t('bioPage.urlCopied', 'URL Copied'),
                                        message: publicUrl,
                                        type: 'success'
                                    });
                                } else {
                                    if (publishSlugBlocked) {
                                        setNotificationModal({
                                            isOpen: true,
                                            title: t('bioPage.slugNotReady', 'Slug not ready'),
                                            message: slugAvailability.message || t('bioPage.slugNotReadyDesc', 'Choose an available public slug before publishing.'),
                                            type: 'error'
                                        });
                                        return;
                                    }

                                    // Create bio page first if it doesn't exist
                                    if (!bioPage && activeProjectId) {
                                        const username = getInitialBioPageSlug();
                                        await createBioPage(activeProjectId, username);
                                        await saveBioPage();
                                        // Wait a bit for state to update
                                        await new Promise(resolve => setTimeout(resolve, 100));
                                    }

                                    // Publish the bio page
                                    const publishResult = await publishBioPage();
                                    if (publishResult.ok) {
                                        const usernameForUrl = slugAvailability.status === 'available'
                                            ? slugAvailability.slug
                                            : bioPage?.slug || bioPage?.username || getInitialBioPageSlug();
                                        const publicUrl = `${window.location.origin}/bio/${usernameForUrl.toLowerCase()}`;
                                        await navigator.clipboard.writeText(publicUrl);
                                        setNotificationModal({
                                            isOpen: true,
                                            title: t('bioPage.published', 'Published!'),
                                            message: `${t('bioPage.urlCopiedMessage', 'URL copied')}: ${publicUrl}`,
                                            type: 'success'
                                        });
                                    } else {
                                        setNotificationModal({
                                            isOpen: true,
                                            title: t('bioPage.error', 'Error'),
                                            message: publishResult.error || t('bioPage.publishFailed', 'Failed to publish. Please try again.'),
                                            type: 'error'
                                        });
                                    }
                                }
                            }}
                            disabled={!bioPage?.isPublished && ((!profile.name && !bioPage?.username) || publishSlugBlocked)}
                            className={`h-9 w-9 flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-50 ${bioPage?.isPublished
                                ? 'text-q-success'
                                : 'text-primary'
                                }`}
                            title={bioPage?.isPublished
                                ? t('bioPage.copyUrl', 'Copy URL')
                                : publishSlugBlocked
                                ? slugAvailability.message || t('bioPage.slugNotReadyDesc', 'Choose an available public slug before publishing.')
                                : t('bioPage.publish', 'Publish')}
                        >
                            {bioPage?.isPublished ? <Copy size={18} /> : <Share2 size={18} />}
                        </button>

                        {/* Update Published Button - shows when published and has unsaved changes */}
                        {bioPage?.isPublished && (
                            <button
                                onClick={async () => {
                                    if (publishSlugBlocked) {
                                        setNotificationModal({
                                            isOpen: true,
                                            title: t('bioPage.slugNotReady', 'Slug not ready'),
                                            message: slugAvailability.message || t('bioPage.slugNotReadyDesc', 'Choose an available public slug before publishing.'),
                                            type: 'error'
                                        });
                                        return;
                                    }
                                    const publishResult = await publishBioPage();
                                    if (publishResult.ok) {
                                        setNotificationModal({
                                            isOpen: true,
                                            title: t('bioPage.updated', 'Updated!'),
                                            message: t('bioPage.updatedMessage', 'Your Bio Page has been updated.'),
                                            type: 'success'
                                        });
                                    } else {
                                        setNotificationModal({
                                            isOpen: true,
                                            title: t('bioPage.error', 'Error'),
                                            message: publishResult.error || t('bioPage.publishFailed', 'Failed to publish. Please try again.'),
                                            type: 'error'
                                        });
                                    }
                                }}
                                disabled={publishSlugBlocked}
                                className="h-9 w-9 flex items-center justify-center text-primary hover:opacity-80 disabled:opacity-50 transition-opacity"
                                title={publishSlugBlocked
                                    ? slugAvailability.message || t('bioPage.slugNotReadyDesc', 'Choose an available public slug before publishing.')
                                    : t('bioPage.update', 'Update')}
                            >
                                <Share2 size={18} />
                            </button>
                        )}

                        {bioPage?.isPublished && (
                            <button
                                onClick={async () => {
                                    const success = await unpublishBioPage();
                                    setNotificationModal({
                                        isOpen: true,
                                        title: success ? t('bioPage.unpublished', 'Unpublished') : t('bioPage.error', 'Error'),
                                        message: success
                                            ? t('bioPage.unpublishedMessage', 'Your Bio Page is now private and the public URL is disabled.')
                                            : t('bioPage.unpublishFailed', 'Failed to unpublish. Please try again.'),
                                        type: success ? 'success' : 'error'
                                    });
                                }}
                                className="h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-q-error transition-colors"
                                title={t('bioPage.unpublish', 'Unpublish')}
                            >
                                <EyeOff size={18} />
                            </button>
                        )}

                        <HeaderBackButton onClick={() => navigate(ROUTES.DASHBOARD)} />
                    </div>
                </header>

                {/* Loading Overlay */}
                {isLoadingBioPage && (
                    <div className="absolute inset-0 bg-q-bg/80 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <p className="text-q-text-muted text-sm">{t('bioPage.loading', 'Loading your bio page...')}</p>
                        </div>
                    </div>
                )}

                {/* 3-Column Layout */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Internal Sidebar — matches web editor sections panel (w-64 lg:w-72) */}
                    <nav className="hidden md:flex w-64 lg:w-72 flex-shrink-0 flex-col overflow-hidden bg-q-surface/50 border-r border-q-border">
                        {/* Profile Section - Click to Edit */}
                        <button
                            onClick={openProfileModal}
                            className="p-3 border-b border-q-border hover:bg-q-surface/70 transition-colors group w-full text-left"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="relative">
                                    <div
                                        className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-bold text-primary"
                                        style={{
                                            backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : undefined,
                                            backgroundSize: 'cover',
                                        }}
                                    >
                                        {!profile.avatarUrl && profile.name.charAt(0)}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center group-hover:bg-primary/80 transition-colors">
                                        <Sparkles size={12} className="text-primary-foreground" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-foreground text-sm truncate">
                                        {profile.name || t('bioPage.yourName', 'Your Name')}
                                    </p>
                                    <p className="text-xs text-q-text-muted flex items-center gap-1">
                                        <Edit3 size={10} />
                                        {t('bioPage.clickToEdit', 'Click to edit')}
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-q-text-muted line-clamp-2 mt-2">
                                {profile.bio || t('bioPage.shortBio', 'Write a short bio...')}
                            </p>
                        </button>

                        {/* Nav Items with Design sub-tree */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                            {navItems.map((item) => (
                                <React.Fragment key={item.id}>
                                    <button
                                        onClick={() => { setActiveTab(item.id as ActiveTab); setIsControlsPanelOpen(true); }}
                                        className={`flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${activeTab === item.id
                                            ? 'bg-q-accent/10 text-q-accent'
                                            : 'text-q-text hover:text-q-accent hover:bg-q-surface/50'
                                            }`}
                                    >
                                        <item.icon size={16} className="flex-shrink-0" />
                                        {item.label}
                                    </button>
                                    {/* Design sub-items — shown when Design tab is active */}
                                    {item.id === 'design' && activeTab === 'design' && (
                                        <div className="ml-2 pl-2 border-l border-q-border/60 space-y-1 py-1">
                                            {DESIGN_SECTIONS.map((section) => {
                                                const Icon = section.icon;
                                                return (
                                                    <button
                                                        key={section.id}
                                                        onClick={() => { setDesignSubTab(section.id); setIsControlsPanelOpen(true); }}
                                                        className={`flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                                            designSubTab === section.id
                                                                ? 'bg-q-accent/10 text-q-accent'
                                                                : 'text-q-text-secondary hover:text-q-accent hover:bg-q-surface/50'
                                                            }`}
                                                    >
                                                        <Icon size={16} className="flex-shrink-0" />
                                                        {section.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </nav>

                    {/* CENTER: Live Preview */}
                    <main className="flex-1 min-h-0 overflow-hidden hidden md:flex items-center justify-center bg-q-surface-overlay/50 p-4 sm:p-8 relative">
                        {renderMobilePreview()}
                    </main>

                    {/* Controls Panel Toggle - Desktop (matches Controls.tsx pattern) */}
                    <button onClick={() => setIsControlsPanelOpen(!isControlsPanelOpen)}
                        className={`fixed top-1/2 -translate-y-1/2 z-30 p-2 bg-q-surface border border-q-border shadow-lg hover:bg-q-surface-elevated transition-all duration-300 overflow-hidden rounded-lg hidden md:flex items-center justify-center ${
                            isControlsPanelOpen ? 'right-[calc(20rem-18px)] lg:right-[calc(24rem-18px)]' : 'right-0 rounded-l-lg rounded-r-none'
                        }`}
                        title={isControlsPanelOpen ? t('bioPage.hideControls', 'Hide controls') : t('bioPage.showControls', 'Show controls')}
                    >
                        {isControlsPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                    </button>

                    {/* RIGHT: Controls Panel - Desktop */}
                    <div className={`${isControlsPanelOpen ? 'w-80 lg:w-96' : 'w-0 overflow-hidden'} border-l border-q-border bg-q-surface/50 flex-col overflow-hidden flex-shrink-0 order-last hidden md:flex transition-all duration-300`}>
                        <div className="p-4 border-b border-q-border flex items-center justify-between">
                            <h2 className="font-semibold text-sm flex items-center gap-2">
                                <Settings size={16} className="text-q-accent" />
                                {t('common.edit', 'Edit')}: <span className="capitalize">{activeTab === 'design'
                                    ? DESIGN_SECTIONS.find(s => s.id === designSubTab)?.label || designSubTab
                                    : activeTab}</span>
                            </h2>
                            <button onClick={() => setIsControlsPanelOpen(false)}
                                className="p-1.5 rounded-md text-q-text-muted hover:text-q-text hover:bg-q-surface-overlay transition-colors"
                                title={t('bioPage.closePanel', 'Close panel')}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="quimera-clean-controls flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
                            {activeTab === 'links' && renderLinksEditor()}
                            {activeTab === 'blocks' && renderBlocksEditor()}
                            {activeTab === 'design' && renderDesignEditor()}
                            {activeTab === 'shop' && renderShopEditor()}
                            {activeTab === 'analytics' && renderAnalytics()}
                            {activeTab === 'audience' && renderAudience()}
                            {activeTab === 'settings' && renderSettingsPanel()}
                            {activeTab === 'share' && renderSharePanel()}
                        </div>
                    </div>

                    {/* MOBILE: Full-screen controls overlay (no preview on mobile) */}
                    <div className="md:hidden flex-1 flex flex-col overflow-hidden">
                        {/* Mobile Nav */}
                        <div className="p-3 border-b border-q-border bg-q-surface/95 backdrop-blur-sm z-20 flex-shrink-0">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {navItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id as ActiveTab)}
                                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === item.id
                                            ? 'bg-q-accent/10 text-q-accent border border-q-accent/30'
                                            : 'bg-q-surface text-q-text-secondary border border-q-border hover:bg-q-surface/50 hover:text-q-accent'
                                            }`}
                                    >
                                        <item.icon size={16} className="flex-shrink-0" />
                                        <span className="truncate">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="quimera-clean-controls flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {activeTab === 'links' && renderLinksEditor()}
                            {activeTab === 'blocks' && renderBlocksEditor()}
                            {activeTab === 'design' && renderDesignEditor()}
                            {activeTab === 'shop' && renderShopEditor()}
                            {activeTab === 'analytics' && renderAnalytics()}
                            {activeTab === 'audience' && renderAudience()}
                            {activeTab === 'settings' && renderSettingsPanel()}
                            {activeTab === 'share' && renderSharePanel()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Link Modal */}
            {isAddLinkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-q-text/60 backdrop-blur-sm"
                        onClick={closeAddLinkModal}
                    />

                    {/* Modal Content */}
                    <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-q-border bg-q-bg shadow-2xl sm:max-h-[65vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-q-border">
                            <h2 className="text-xl font-bold text-foreground">
                                {t('bioPage.add', 'Add')}
                            </h2>
                            <button
                                onClick={closeAddLinkModal}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X size={20} className="text-q-text-muted" />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-4 border-b border-q-border sm:p-5">
                            <div className="relative">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-q-text-muted" />
                                <input
                                    type="text"
                                    value={addLinkSearch}
                                    onChange={(e) => setAddLinkSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addLinkSearch && handleAddLinkFromSearch()}
                                    placeholder={t('bioPage.pasteOrSearch', 'Paste or search a link')}
                                    className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-q-border rounded-xl text-foreground placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Main Content - Split Layout */}
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
                            {/* Categories Sidebar */}
                            <nav className="flex w-full flex-shrink-0 gap-2 overflow-x-auto border-b border-q-border p-3 sm:w-48 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
                                {effectiveLinkCategories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => setAddLinkCategory(category.id)}
                                        className={`flex min-w-max items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all sm:w-full sm:min-w-0 ${addLinkCategory === category.id
                                            ? 'bg-muted text-foreground'
                                            : 'text-q-text-muted hover:text-foreground hover:bg-muted/50'
                                            }`}
                                    >
                                        <category.icon size={18} className="flex-shrink-0" />
                                        <span className="truncate">{t(`bioPage.category.${category.id}`, category.label)}</span>
                                    </button>
                                ))}
                            </nav>

                            {/* Right Content Area */}
                            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">

                                {/* Category Label */}
                                <p className="text-sm font-medium text-q-text-muted mb-4">
                                    {addLinkCategory === 'suggested'
                                        ? t('bioPage.suggested', 'Suggested')
                                        : t(`bioPage.category.${addLinkCategory}`, addLinkCategory)
                                    }
                                </p>

                                {/* Integrations List */}
                                <div className="space-y-2">
                                    {filteredIntegrations.map((integration) => (
                                        <button
                                            key={integration.id}
                                            onClick={() => addIntegrationLink(integration)}
                                            className="group flex w-full min-w-0 items-center gap-3 rounded-xl border border-q-border p-3 transition-all hover:border-muted-foreground hover:bg-muted/30 sm:gap-4 sm:p-4"
                                        >
                                            {/* Icon */}
                                            <div
                                                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12"
                                                style={{ backgroundColor: `${integration.color}20` }}
                                            >
                                                <integration.icon size={24} style={{ color: integration.color }} />
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0 flex-1 text-left">
                                                <p className="truncate font-semibold text-foreground">{integration.name}</p>
                                                <p className="line-clamp-2 text-sm text-q-text-muted">{integration.description}</p>
                                            </div>

                                            {/* Arrow */}
                                            <ChevronRight size={20} className="text-q-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}

                                    {/* Empty State */}
                                    {filteredIntegrations.length === 0 && (
                                        <div className="text-center py-12">
                                            <Search size={32} className="mx-auto text-q-text-muted/50 mb-3" />
                                            <p className="text-q-text-muted">
                                                {t('bioPage.noResultsFound', 'No integrations found')}
                                            </p>
                                            <button
                                                onClick={() => addLink('link')}
                                                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                                            >
                                                {t('bioPage.createCustomLink', 'Create custom link')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== FORM CONFIGURATION MODAL ===== */}
            {isFormConfigOpen && selectedFormIntegration && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-q-text/60 backdrop-blur-sm"
                        onClick={closeFormConfig}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-md bg-q-bg rounded-2xl shadow-2xl border border-q-border overflow-hidden max-h-[70vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-q-border bg-primary/10">
                            <h2 className="text-lg font-bold text-foreground">
                                {t('bioPage.forms', 'Forms')}
                            </h2>
                            <button
                                onClick={closeFormConfig}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X size={20} className="text-foreground" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-q-border">
                            <button
                                onClick={() => setFormConfigTab('settings')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${formConfigTab === 'settings'
                                    ? 'text-foreground border-b-2 border-primary'
                                    : 'text-q-text-muted hover:text-foreground'
                                    }`}
                            >
                                {t('bioPage.linkSettings', 'Link Settings')}
                            </button>
                            <button
                                onClick={() => setFormConfigTab('layout')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${formConfigTab === 'layout'
                                    ? 'text-foreground border-b-2 border-primary'
                                    : 'text-q-text-muted hover:text-foreground'
                                    }`}
                            >
                                {t('bioPage.layout', 'Layout')}
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {formConfigTab === 'settings' && (
                                <div>
                                    <div className="mb-4">
                                        <h3 className="font-semibold text-foreground mb-1">{t('bioPage.forms', 'Forms')}</h3>
                                        <p className="text-sm text-q-text-muted">{t('bioPage.formTemplateDesc', 'Save time with a pre-built template')}</p>
                                    </div>

                                    <div className="space-y-2">
                                        {FORM_TEMPLATES
                                            .filter(template => canAccessService(BIO_LINK_PLATFORM_SERVICE_MAP[template.id]))
                                            .map((template) => (
                                            <button
                                                key={template.id}
                                                onClick={() => setSelectedFormTemplate(template.id)}
                                                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${selectedFormTemplate === template.id
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-q-border hover:border-muted-foreground hover:bg-muted/30'
                                                    }`}
                                            >
                                                <div
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                    style={{ backgroundColor: `${template.color}20` }}
                                                >
                                                    <template.icon size={20} style={{ color: template.color }} />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className="font-medium text-foreground">{template.name}</p>
                                                    <p className="text-sm text-q-text-muted">{template.description}</p>
                                                </div>
                                                <ChevronRight size={20} className="text-q-text-muted" />
                                            </button>
                                        ))}
                                    </div>

                                    <p className="text-center text-sm text-q-text-muted mt-6">
                                        {t('bioPage.gotIdeas', 'Got ideas? We\'re listening!')} <span className="text-primary cursor-pointer hover:underline">{t('bioPage.shareFeedback', 'Share feedback')}</span>
                                    </p>
                                </div>
                            )}

                            {formConfigTab === 'layout' && (
                                <div>
                                    <p className="text-sm text-q-text-muted mb-4">{t('bioPage.chooseLayout', 'Choose a layout for your link')}</p>

                                    <div className="space-y-3">
                                        {FORM_LAYOUTS.map((layout) => (
                                            <button
                                                key={layout.id}
                                                onClick={() => setSelectedFormLayout(layout.id)}
                                                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${selectedFormLayout === layout.id
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-q-border hover:border-muted-foreground hover:bg-muted/30'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedFormLayout === layout.id
                                                    ? 'border-primary'
                                                    : 'border-muted-foreground'
                                                    }`}>
                                                    {selectedFormLayout === layout.id && (
                                                        <div className="w-3 h-3 rounded-full bg-primary" />
                                                    )}
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className="font-medium text-foreground">{layout.name}</p>
                                                    <p className="text-sm text-q-text-muted">{layout.description}</p>
                                                </div>
                                                {/* Layout Preview */}
                                                <div className={`w-16 h-10 rounded border border-muted-foreground/30 flex items-center justify-center ${layout.id === 'featured' ? 'bg-primary/20' : 'bg-muted'
                                                    }`}>
                                                    <div className={`${layout.id === 'featured' ? 'w-10 h-6 bg-primary/40' : 'w-12 h-2 bg-muted-foreground/30'} rounded`} />
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <p className="text-center text-sm text-q-text-muted mt-6">
                                        {t('bioPage.gotIdeas', 'Got ideas? We\'re listening!')} <span className="text-primary cursor-pointer hover:underline">{t('bioPage.shareFeedback', 'Share feedback')}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-q-border">
                            <button
                                onClick={handleAddForm}
                                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                            >
                                {t('bioPage.addForm', 'Add Form')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== PROFILE EDIT MODAL ===== */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-q-text/60 backdrop-blur-sm"
                        onClick={closeProfileModal}
                    />

                    {/* Modal */}
                    <div className="relative w-full max-w-md bg-q-surface rounded-2xl shadow-2xl border border-q-border overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-q-border">
                            <h2 className="text-lg font-bold text-foreground">
                                {t('bioPage.editProfile', 'Edit Profile')}
                            </h2>
                            <button
                                onClick={closeProfileModal}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X size={20} className="text-q-text-muted" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-6">
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center gap-4">
                                {/* Avatar Preview */}
                                <div
                                    className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-3xl font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity"
                                    style={{
                                        backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : undefined,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                    }}
                                    onClick={() => { setIsProfileModalOpen(false); setShowImagePicker(true); }}
                                >
                                    {!profile.avatarUrl && profile.name.charAt(0)}
                                </div>

                                {/* Choose from Library Button */}
                                <button
                                    onClick={() => { setIsProfileModalOpen(false); setShowImagePicker(true); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                                >
                                    <Sparkles size={16} />
                                    {t('bioPage.chooseAvatar', 'Choose Avatar')}
                                </button>
                                <p className="text-xs text-q-text-muted text-center">
                                    {t('bioPage.avatarHint', 'Select from library, upload, or generate with AI')}
                                </p>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-q-border" />

                            {/* Name Input */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    {t('bioPage.displayName', 'Display Name')}
                                </label>
                                <input
                                    type="text"
                                    value={profile.name}
                                    onChange={(e) => contextUpdateProfile({ name: e.target.value })}
                                    placeholder={t('bioPage.yourName', 'Your Name')}
                                    className="w-full px-4 py-3 bg-muted/50 border border-q-border rounded-lg text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            {/* Bio Input */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                        {t('bioPage.bioDescription', 'Bio Description')}
                                    </label>
                                    <button
                                        onClick={handleEnhanceBio}
                                        disabled={isEnhancingBio || !profile.bio.trim()}
                                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isEnhancingBio ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                            <Wand2 size={12} />
                                        )}
                                        {t('bioPage.enhanceWithAI', 'Enhance with AI')}
                                    </button>
                                </div>
                                <textarea
                                    value={profile.bio}
                                    onChange={(e) => contextUpdateProfile({ bio: e.target.value })}
                                    placeholder={t('bioPage.shortBio', 'Write a short bio...')}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-muted/50 border border-q-border rounded-lg text-foreground outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                />
                                <p className="text-xs text-q-text-muted mt-1">
                                    {profile.bio.length}/15 {t('bioPage.characters', 'characters')}
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-q-border">
                            <button
                                onClick={closeProfileModal}
                                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                            >
                                {t('common.done', 'Done')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== IMAGE PICKER MODAL ===== */}
            {showImagePicker && (
                <ImagePicker
                    label=""
                    value={profile.avatarUrl}
                    onChange={handleAvatarSelected}
                    destination="user"
                    defaultOpen={true}
                    onClose={() => { setShowImagePicker(false); setIsProfileModalOpen(true); }}
                    hideUrlInput={true}
                />
            )}

            {/* ===== NOTIFICATION MODAL ===== */}
            {notificationModal.isOpen && (
                <div className="fixed inset-0 bg-q-text/50 flex items-center justify-center z-[9999]" onClick={() => setNotificationModal({ ...notificationModal, isOpen: false })}>
                    <div className="bg-q-surface border border-q-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${notificationModal.type === 'success' ? 'bg-q-success/20 text-q-success' : 'bg-q-error/20 text-q-error'}`}>
                                {notificationModal.type === 'success' ? <Check size={24} /> : <X size={24} />}
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2">{notificationModal.title}</h3>
                            <p className="text-sm text-q-text-muted break-all mb-6">{notificationModal.message}</p>
                            <button
                                onClick={() => setNotificationModal({ ...notificationModal, isOpen: false })}
                                className="w-full bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BioPageBuilder;
