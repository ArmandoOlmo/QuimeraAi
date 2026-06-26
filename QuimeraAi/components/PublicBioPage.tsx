/**
 * PublicBioPage
 * Public-facing bio page viewer - accessible without authentication
 * Route: /bio/:username
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    ExternalLink, Loader2, Link2, MessageCircle, X, Send,
    Instagram, Youtube, Twitter, Linkedin, Facebook, Twitch,
    Music, Video, Play, Phone, Mail, ShoppingCart, ShoppingBag,
    Store, FileText, Mic, Headphones, Radio, Camera, AtSign,
    Globe, Rss, File, DollarSign, CreditCard, Star, Users,
    Calendar, Heart, CheckCircle, Share2, MapPin, Search,
    type LucideIcon,
} from 'lucide-react';
import {
    getPublicBioPageBySlug,
    getSafeBioBlockMediaUrl,
    getSafeBioBlockUrl,
    getSafeBioLinkUrl,
    buildBioPageTrackedUrl,
    buildBioPageChatContext,
    filterBioPageProductsForBlock,
    filterBioPageProductsForQuery,
    recordBioPageClick,
    recordBioPageView,
    subscribeBioPageEmail,
    submitBioPageLead,
    trackBioPageAppointmentPaymentReturn,
    trackBioPageBookingCompleted,
    trackBioPageBookingStarted,
    trackBioPageChatOpen,
    trackBioPageProductClick,
    trackBioPageQrScan,
    trackBioPageShare,
    trackBioPageTabChange,
} from '../services/bioPage';
import { buildCanonicalEmailDraftMetadata } from '../services/email/emailModuleIntentService.ts';
import type { BioPageData, BioPageLink, BioPageProfile, BioPageTheme } from '../services/bioPage';
import type { AiAssistantConfig } from '../types/ai-assistant';
import type { Lead } from '../types';
import AppointmentBooking from './AppointmentBooking';
import ChatCore from './chat/ChatCore';

// Platform → Icon mapping (mirrors INTEGRATIONS in BioPageBuilder)
const PLATFORM_ICONS: Record<string, LucideIcon> = {
    // Social
    instagram: Instagram,
    tiktok: Music,
    'tiktok-profile': Music,
    twitter: Twitter,
    threads: AtSign,
    facebook: Facebook,
    linkedin: Linkedin,
    snapchat: Camera,
    pinterest: Heart,
    twitch: Twitch,
    reddit: MessageCircle,
    discord: MessageCircle,
    telegram: Send,
    // Media - Video
    video: Video,
    youtube: Youtube,
    'tiktok-video': Music,
    vimeo: Play,
    // Media - Audio
    music: Headphones,
    spotify: Headphones,
    'apple-music': Music,
    soundcloud: Radio,
    podcast: Mic,
    // Media - Document
    pdf: FileText,
    rss: Rss,
    file: File,
    // Contact
    chatbot: MessageCircle,
    form: FileText,
    'contact-form': Mail,
    'email-signup': Mail,
    'sms-signup': MessageCircle,
    typeform: FileText,
    laylo: Users,
    whatsapp: MessageCircle,
    email: Mail,
    phone: Phone,
    // Events
    calendar: Calendar,
    cameo: Video,
    clubhouse: Mic,
    // Commerce
    shopify: ShoppingCart,
    etsy: Store,
    amazon: ShoppingBag,
    paypal: DollarSign,
    venmo: DollarSign,
    stripe: CreditCard,
    reviews: Star,
    // Generic
    link: Globe,
    social: Globe,
};

const getPlatformIcon = (link: { linkType?: string; platform?: string }): LucideIcon => {
    if (link.platform && PLATFORM_ICONS[link.platform]) {
        return PLATFORM_ICONS[link.platform];
    }
    if (link.linkType && PLATFORM_ICONS[link.linkType]) {
        return PLATFORM_ICONS[link.linkType];
    }
    return Globe;
};

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

const isSocialIconLink = (link: { linkType?: string; platform?: string }) => (
    link.linkType === 'social'
    || Boolean(link.platform && SOCIAL_ICON_PLATFORMS.has(link.platform))
);

const readBlockLinkIds = (value: unknown): string[] => (
    Array.isArray(value)
        ? value.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
        : []
);

const selectLinksForSocialBlock = (
    block: BioPageData['blocks'][number] | undefined,
    links: BioPageLink[],
): BioPageLink[] => {
    if (!block || block.visible === false) return [];
    const eligibleLinks = links.filter(link => link.enabled !== false && link.visible !== false && isSocialIconLink(link));
    const selectedIds = readBlockLinkIds(block.data?.linkIds);
    if (!selectedIds.length) return eligibleLinks;
    const selectedSet = new Set(selectedIds);
    return eligibleLinks.filter(link => selectedSet.has(link.id));
};

const findPublicBioPageLinkBlockId = (page: BioPageData, link: BioPageLink): string | null => {
    const explicitBlockId = typeof link.metadata?.blockId === 'string' ? link.metadata.blockId : '';
    const visibleBlocks = (page.blocks || []).filter(block => block.visible !== false && block.status !== 'hidden');

    if (explicitBlockId && visibleBlocks.some(block => block.id === explicitBlockId)) {
        return explicitBlockId;
    }

    const linkedBlock = visibleBlocks.find(block => (
        ['link', 'social_links'].includes(block.type)
        && readBlockLinkIds(block.data?.linkIds).includes(link.id)
    ));
    if (linkedBlock) return linkedBlock.id;

    if (isSocialIconLink(link)) {
        return visibleBlocks.find(block => block.type === 'social_links')?.id
            || visibleBlocks.find(block => block.type === 'link')?.id
            || null;
    }

    return visibleBlocks.find(block => block.type === 'link')?.id || null;
};

interface PublicBioPageProps {
    username?: string;
}

type PublicBioTab = 'links' | 'shop' | 'media' | 'book' | 'contact';
type PublicLeadFieldType = 'text' | 'email' | 'phone' | 'textarea';

interface PublicLeadField {
    id: string;
    label: string;
    type: PublicLeadFieldType;
    required: boolean;
}

const PUBLIC_BIO_TABS: Array<{ id: PublicBioTab; label: string }> = [
    { id: 'links', label: 'Links' },
    { id: 'shop', label: 'Shop' },
    { id: 'media', label: 'Media' },
    { id: 'book', label: 'Book' },
    { id: 'contact', label: 'Contact' },
];

const PUBLIC_LEAD_FIELD_TYPES = new Set<PublicLeadFieldType>(['text', 'email', 'phone', 'textarea']);
const DEFAULT_PUBLIC_LEAD_FIELDS: PublicLeadField[] = [
    { id: 'name', label: 'Name', type: 'text', required: true },
    { id: 'email', label: 'Email', type: 'email', required: true },
    { id: 'message', label: 'Message', type: 'textarea', required: false },
];
const DEFAULT_PUBLIC_EMAIL_PLACEHOLDER = 'Email address';
const DEFAULT_PUBLIC_EMAIL_BUTTON_TEXT = 'Subscribe';
const DEFAULT_PUBLIC_EMAIL_CONSENT_TEXT = 'I agree to receive marketing emails.';
const DEFAULT_PUBLIC_EMAIL_SUCCESS_MESSAGE = 'Thanks for subscribing.';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeLeadFieldId = (value: unknown, fallback: string): string => {
    const rawValue = typeof value === 'string' ? value : fallback;
    const normalized = rawValue
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
    return normalized || fallback;
};

const getLeadFieldLabel = (id: string): string => (
    id
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase())
);

const normalizeLeadFormFields = (value: unknown): PublicLeadField[] => {
    if (!Array.isArray(value)) return DEFAULT_PUBLIC_LEAD_FIELDS;

    const seen = new Set<string>();
    const fields = value
        .slice(0, 8)
        .map((field, index): PublicLeadField | null => {
            if (!field || typeof field !== 'object' || Array.isArray(field)) return null;
            const fieldRecord = field as Record<string, unknown>;
            const id = normalizeLeadFieldId(fieldRecord.id, `field-${index + 1}`);
            if (seen.has(id)) return null;
            const rawType = typeof fieldRecord.type === 'string' ? fieldRecord.type : 'text';
            const type = PUBLIC_LEAD_FIELD_TYPES.has(rawType as PublicLeadFieldType)
                ? rawType as PublicLeadFieldType
                : 'text';
            const rawLabel = typeof fieldRecord.label === 'string' ? fieldRecord.label.trim() : '';
            seen.add(id);
            return {
                id,
                label: (rawLabel || getLeadFieldLabel(id)).slice(0, 80),
                type,
                required: fieldRecord.required !== false,
            };
        })
        .filter((field): field is PublicLeadField => Boolean(field));

    if (!fields.length || !fields.some(field => field.type === 'email')) {
        return DEFAULT_PUBLIC_LEAD_FIELDS;
    }

    return fields.slice(0, 6);
};

const getLeadFieldKey = (blockId: string, fieldId: string) => `${blockId}:${fieldId}`;

const getPublicTabForBlock = (block: BioPageData['blocks'][number]): PublicBioTab => {
    switch (block.type) {
        case 'product_grid':
        case 'product_collection':
            return 'shop';
        case 'featured_media':
        case 'portfolio_grid':
            return 'media';
        case 'booking':
            return 'book';
        case 'lead_form':
        case 'email_subscribe':
        case 'contact':
        case 'chatbot_cta':
            return 'contact';
        case 'featured_banner':
        case 'testimonials':
        case 'faq':
        default:
            return 'links';
    }
};

const setMetaTag = (selector: string, attribute: 'name' | 'property', key: string, content?: string) => {
    if (typeof document === 'undefined' || !content) return;
    let element = document.head.querySelector<HTMLMetaElement>(selector);
    if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
    }
    element.setAttribute('content', content);
};

const setCanonicalLink = (href?: string) => {
    if (typeof document === 'undefined' || !href) return;
    let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', 'canonical');
        document.head.appendChild(element);
    }
    element.setAttribute('href', href);
};

const applyBioPageSeoTags = (page: BioPageData) => {
    if (typeof document === 'undefined') return;
    const title = page.seo?.title || page.title || page.profile.displayName || page.profile.name || 'Bio Page';
    const description = page.seo?.description || page.description || page.profile.bio || '';
    const canonicalUrl = page.seo?.canonicalUrl || (typeof window !== 'undefined' ? window.location.href.split('?')[0] : '');
    const imageUrl = page.seo?.ogImageUrl || page.profile.coverImageUrl || page.profile.avatarUrl || '';

    document.title = title;
    setMetaTag('meta[name="description"]', 'name', 'description', description);
    setMetaTag('meta[name="robots"]', 'name', 'robots', page.seo?.noIndex ? 'noindex,nofollow' : 'index,follow');
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', page.seo?.schemaType === 'Person' ? 'profile' : 'website');
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', imageUrl ? 'summary_large_image' : 'summary');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    if (imageUrl) setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);
    setCanonicalLink(canonicalUrl);
};

const PublicBioPage: React.FC<PublicBioPageProps> = ({ username }) => {
    const [bioPageData, setBioPageData] = useState<BioPageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [activeChatBlockId, setActiveChatBlockId] = useState<string | null>(null);
    const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared' | 'error'>('idle');
    const [activePublicTab, setActivePublicTab] = useState<PublicBioTab>('links');
    const [shopSearchQuery, setShopSearchQuery] = useState('');

    const [signupEmailByBlockId, setSignupEmailByBlockId] = useState<Record<string, string>>({});
    const [signupConsentByBlockId, setSignupConsentByBlockId] = useState<Record<string, boolean>>({});
    const [emailSubmittedBlockIds, setEmailSubmittedBlockIds] = useState<Record<string, boolean>>({});
    const [emailErrorsByBlockId, setEmailErrorsByBlockId] = useState<Record<string, string | null>>({});
    const [submittingEmailBlockId, setSubmittingEmailBlockId] = useState<string | null>(null);

    const [leadFieldValues, setLeadFieldValues] = useState<Record<string, string>>({});
    const [leadConsentValues, setLeadConsentValues] = useState<Record<string, boolean>>({});
    const [submittedLeadBlockIds, setSubmittedLeadBlockIds] = useState<Record<string, boolean>>({});
    const [leadError, setLeadError] = useState<string | null>(null);
    const [submittingLeadBlockId, setSubmittingLeadBlockId] = useState<string | null>(null);

    // Extract username from URL if not passed as prop
    const bioUsername = username || window.location.pathname.split('/bio/')[1];

    useEffect(() => {
        const fetchBioPage = async () => {
            if (!bioUsername) {
                setError('No username provided');
                setIsLoading(false);
                return;
            }

            try {
                const data = await getPublicBioPageBySlug(bioUsername);
                if (!data) {
                    setError('Bio page not found');
                    setIsLoading(false);
                    return;
                }

                if (!data.isPublished) {
                    setError('This bio page is not published');
                    setIsLoading(false);
                    return;
                }

                setBioPageData(data);
                applyBioPageSeoTags(data);
                const searchParams = new URLSearchParams(window.location.search);
                if (searchParams.get('utm_source') === 'qr' || searchParams.get('source') === 'qr') {
                    void trackBioPageQrScan(data);
                }
                void recordBioPageView(data);
                void trackBioPageAppointmentPaymentReturn(data);
            } catch (err) {
                console.error('Error fetching bio page:', err);
                setError('Failed to load bio page');
            } finally {
                setIsLoading(false);
            }
        };

        fetchBioPage();
    }, [bioUsername]);

    // Lead capture handler for public bio page chatbot
    const handleLeadCapture = useCallback(async (leadData: Partial<Lead>): Promise<string | undefined> => {
        if (!bioPageData?.projectId) {
            console.warn('[PublicBioPage] Cannot capture lead: no projectId');
            return undefined;
        }

        try {
            const leadId = await submitBioPageLead({
                page: bioPageData,
                lead: {
                    ...leadData,
                    metadata: {
                        ...(leadData.metadata || {}),
                        canonicalEmail: buildCanonicalEmailDraftMetadata({
                            sourceModule: 'bio-page-engine',
                            sourceComponent: 'BioPageChatBlock',
                            sourceEvent: 'bio_page_chat_lead_capture',
                            sourceEntityType: 'lead',
                            sourceEntityId: leadData.email || activeChatBlockId || bioPageData.id,
                            projectId: bioPageData.projectId,
                            recipientEmail: leadData.email,
                            generatedByAI: Boolean(leadData.aiAnalysis || leadData.aiScore || leadData.recommendedAction),
                            needsReview: true,
                            safeToEdit: true,
                            consentSource: 'bio-page-chat',
                            transactionalConsent: null,
                            marketingConsent: null,
                            extra: {
                                bioPageId: bioPageData.id,
                                bioSlug: bioPageData.slug,
                                blockId: activeChatBlockId,
                                chatCoreMetadata: leadData.metadata?.canonicalEmail || null,
                            },
                        }),
                    },
                },
                source: 'bio_page_chat',
                blockId: activeChatBlockId,
            });

            console.log('[PublicBioPage] Lead captured:', leadId);
            return leadId || undefined;
        } catch (error) {
            console.error('[PublicBioPage] Error capturing lead:', error);
            return undefined;
        }
    }, [activeChatBlockId, bioPageData]);

    // Track link click
    const handleLinkClick = (link: BioPageLink) => {
        if (!bioPageData) return;
        const blockId = findPublicBioPageLinkBlockId(bioPageData, link);

        // Handle chatbot links
        if (link.linkType === 'chatbot') {
            setActiveChatBlockId(blockId);
            void trackBioPageChatOpen(bioPageData, blockId);
            setIsChatbotOpen(true);
            return;
        }
        if (link.linkType === 'booking') void trackBioPageBookingStarted(bioPageData, blockId);
        void recordBioPageClick(bioPageData, link, blockId);
        const safeUrl = getSafeBioLinkUrl(link);
        if (safeUrl) window.open(safeUrl, safeUrl.startsWith('/') || safeUrl.startsWith('#') ? '_self' : '_blank');
    };

    const handleShare = useCallback(async () => {
        if (!bioPageData || typeof window === 'undefined') return;
        const shareUrl = buildBioPageTrackedUrl({
            page: bioPageData,
            origin: window.location.origin,
            channel: 'share',
        });
        const title = bioPageData.seo?.title || bioPageData.title || bioPageData.profile.displayName || bioPageData.profile.name || 'Bio Page';
        const text = bioPageData.seo?.description || bioPageData.description || bioPageData.profile.bio || '';

        try {
            if (navigator.share) {
                await navigator.share({ title, text, url: shareUrl });
                setShareStatus('shared');
            } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
                setShareStatus('copied');
            } else {
                window.prompt('Copy this Bio Page URL', shareUrl);
                setShareStatus('copied');
            }
            void trackBioPageShare(bioPageData);
        } catch (error) {
            if ((error as DOMException)?.name !== 'AbortError') {
                console.warn('[PublicBioPage] Share failed:', error);
                setShareStatus('error');
            }
        }
    }, [bioPageData]);

    const handlePublicTabChange = useCallback((tab: PublicBioTab) => {
        setActivePublicTab(tab);
        if (bioPageData && tab !== activePublicTab) {
            void trackBioPageTabChange(bioPageData, tab);
        }
    }, [activePublicTab, bioPageData]);

    const handleEmailSignup = useCallback(async (e: React.FormEvent, subscribeBlock: BioPageData['blocks'][number]) => {
        e.preventDefault();
        if (!bioPageData) return;

        const email = (signupEmailByBlockId[subscribeBlock.id] || '').trim().toLowerCase();
        const setBlockEmailError = (message: string | null) => {
            setEmailErrorsByBlockId(previous => ({ ...previous, [subscribeBlock.id]: message }));
        };
        if (!EMAIL_RE.test(email)) {
            setBlockEmailError('Please enter a valid email');
            return;
        }

        const consentRequired = true;
        const consentAccepted = signupConsentByBlockId[subscribeBlock.id] === true;
        if (consentRequired && !consentAccepted) {
            setBlockEmailError('Please accept the consent checkbox.');
            return;
        }

        setSubmittingEmailBlockId(subscribeBlock.id);
        setBlockEmailError(null);

        try {
            const audienceId = typeof subscribeBlock?.data?.audienceId === 'string' && subscribeBlock.data.audienceId.trim()
                ? subscribeBlock.data.audienceId.trim()
                : null;
            const result = await subscribeBioPageEmail({
                page: bioPageData,
                email,
                consent: consentAccepted,
                audienceId,
                blockId: subscribeBlock.id,
                metadata: {
                    sourceComponent: 'BioPageEmailSubscribeBlock',
                    sourceEvent: 'bio_page_email_subscribe',
                    blockTitle: subscribeBlock.title,
                    audienceId,
                    consentRequired,
                },
            });

            if (!result.ok) {
                setBlockEmailError('error' in result ? result.error : 'Unable to subscribe.');
                return;
            }

            setEmailSubmittedBlockIds(previous => ({ ...previous, [subscribeBlock.id]: true }));
            setSignupEmailByBlockId(previous => ({ ...previous, [subscribeBlock.id]: '' }));
            setSignupConsentByBlockId(previous => ({ ...previous, [subscribeBlock.id]: false }));
            console.log('[PublicBioPage] Email subscriber saved');
        } catch (err) {
            console.error('[PublicBioPage] Error saving email subscriber:', err);
            setBlockEmailError('Something went wrong. Please try again.');
        } finally {
            setSubmittingEmailBlockId(null);
        }
    }, [bioPageData, signupConsentByBlockId, signupEmailByBlockId]);

    const handleLeadFieldChange = useCallback((blockId: string, fieldId: string, value: string) => {
        setLeadFieldValues(previous => ({
            ...previous,
            [getLeadFieldKey(blockId, fieldId)]: value.slice(0, 2000),
        }));
    }, []);

    const handleLeadSubmit = useCallback(async (e: React.FormEvent, leadBlock: BioPageData['blocks'][number]) => {
        e.preventDefault();
        if (!bioPageData) return;

        const fields = normalizeLeadFormFields(leadBlock.data?.fields);
        const fieldValues = Object.fromEntries(
            fields.map(field => [
                field.id,
                (leadFieldValues[getLeadFieldKey(leadBlock.id, field.id)] || '').trim(),
            ]),
        );
        const missingField = fields.find(field => field.required && !fieldValues[field.id]);
        if (missingField) {
            setLeadError(`${missingField.label} is required.`);
            return;
        }

        const emailField = fields.find(field => field.type === 'email') || fields.find(field => field.id === 'email');
        const email = emailField ? fieldValues[emailField.id].toLowerCase() : '';
        if (!EMAIL_RE.test(email)) {
            setLeadError('Please enter a valid email');
            return;
        }

        const consentRequired = leadBlock.data?.consentRequired === true;
        const consentAccepted = leadConsentValues[leadBlock.id] === true;
        if (consentRequired && !consentAccepted) {
            setLeadError('Please accept the consent checkbox.');
            return;
        }

        const nameField = fields.find(field => field.id === 'name')
            || fields.find(field => field.type === 'text' && field.id !== emailField?.id);
        const phoneField = fields.find(field => field.type === 'phone' || field.id === 'phone');
        const messageField = fields.find(field => field.id === 'message')
            || fields.find(field => field.type === 'textarea');
        const name = nameField ? fieldValues[nameField.id] : '';
        const phone = phoneField ? fieldValues[phoneField.id] : '';
        const message = messageField ? fieldValues[messageField.id] : '';
        const tags = Array.isArray(leadBlock.data?.tags)
            ? leadBlock.data.tags.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim())).slice(0, 10)
            : ['bio-page', 'link-in-bio'];
        const leadFormMetadata = {
            blockId: leadBlock.id,
            fields: fields.map(field => ({
                id: field.id,
                label: field.label,
                type: field.type,
                required: field.required,
            })),
            values: fieldValues,
            consentRequired,
            consentAccepted,
        };

        setSubmittingLeadBlockId(leadBlock.id);
        setLeadError(null);

        try {
            await submitBioPageLead({
                page: bioPageData,
                lead: {
                    name: name || email,
                    email,
                    phone,
                    message,
                    tags,
                    metadata: {
                        leadForm: leadFormMetadata,
                        canonicalEmail: buildCanonicalEmailDraftMetadata({
                            sourceModule: 'bio-page-engine',
                            sourceComponent: 'BioPageLeadFormBlock',
                            sourceEvent: 'bio_page_lead_capture',
                            sourceEntityType: 'lead',
                            sourceEntityId: email,
                            projectId: bioPageData.projectId,
                            recipientEmail: email,
                            generatedByAI: false,
                            needsReview: true,
                            safeToEdit: true,
                            consentSource: 'bio-page-lead-form',
                            transactionalConsent: true,
                            marketingConsent: null,
                            extra: {
                                bioPageId: bioPageData.id,
                                bioSlug: bioPageData.slug,
                                blockId: leadBlock.id,
                                leadForm: {
                                    fieldIds: fields.map(field => field.id),
                                    consentRequired,
                                    consentAccepted,
                                },
                            },
                        }),
                    },
                },
                source: 'bio_page',
                blockId: leadBlock.id,
            });
            setSubmittedLeadBlockIds(previous => ({ ...previous, [leadBlock.id]: true }));
            setLeadFieldValues(previous => {
                const nextValues = { ...previous };
                fields.forEach(field => {
                    delete nextValues[getLeadFieldKey(leadBlock.id, field.id)];
                });
                return nextValues;
            });
            setLeadConsentValues(previous => ({ ...previous, [leadBlock.id]: false }));
        } catch (err) {
            console.error('[PublicBioPage] Error submitting lead:', err);
            setLeadError('Something went wrong. Please try again.');
        } finally {
            setSubmittingLeadBlockId(null);
        }
    }, [bioPageData, leadConsentValues, leadFieldValues]);

    const bioPageChatContext = useMemo(() => (
        bioPageData ? buildBioPageChatContext(bioPageData, { activeBlockId: activeChatBlockId }) : null
    ), [activeChatBlockId, bioPageData]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                    <p className="text-gray-400 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (error || !bioPageData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="text-center">
                    <Link2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
                    <p className="text-gray-400">{error || 'This bio page does not exist.'}</p>
                </div>
            </div>
        );
    }

    const { profile, theme, links } = bioPageData;

    // Button shape calculations
    const getBorderRadius = () => {
        switch (theme.buttonShape) {
            case 'square': return '4px';
            case 'rounded': return '12px';
            case 'rounder': return '20px';
            case 'pill': return '9999px';
            default: return '12px';
        }
    };

    // Button shadow calculations
    const getButtonShadow = () => {
        switch (theme.buttonShadow) {
            case 'soft': return '0 4px 12px rgba(0,0,0,0.15)';
            case 'strong': return '0 8px 24px rgba(0,0,0,0.25)';
            case 'hard': return '4px 4px 0px rgba(0,0,0,0.3)';
            case 'none':
            default: return 'none';
        }
    };

    // Button style calculations
    const getButtonStyle = () => {
        const baseStyle: React.CSSProperties = {
            borderRadius: getBorderRadius(),
            fontFamily: theme.bodyFont || 'inherit',
            boxShadow: getButtonShadow(),
        };

        const textColor = theme.buttonTextColor || '#ffffff';

        switch (theme.buttonStyle) {
            case 'fill':
                return {
                    ...baseStyle,
                    backgroundColor: theme.buttonColor,
                    color: textColor,
                };
            case 'glass':
                return {
                    ...baseStyle,
                    backgroundColor: `${theme.buttonColor}40`,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: `1px solid ${theme.buttonColor}60`,
                    color: textColor,
                };
            case 'outline':
                return {
                    ...baseStyle,
                    backgroundColor: 'transparent',
                    border: `2px solid ${theme.buttonColor}`,
                    color: theme.buttonColor,
                };
            case 'soft':
                return {
                    ...baseStyle,
                    backgroundColor: `${theme.buttonColor}20`,
                    color: theme.buttonColor,
                };
            default:
                return {
                    ...baseStyle,
                    backgroundColor: theme.buttonColor,
                    color: textColor,
                };
        }
    };

    // Background style calculations
    const getBackgroundStyle = (): React.CSSProperties => {
        const baseColor = theme.backgroundColor || '#1a1a2e';
        const gradientEndColor = theme.gradientColor || '#0f0f1a';

        switch (theme.backgroundType) {
            case 'gradient':
                return {
                    background: `linear-gradient(135deg, ${baseColor}, ${gradientEndColor})`,
                };
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
                return theme.backgroundImage ? {
                    backgroundImage: `url(${theme.backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                } : { backgroundColor: baseColor };
            case 'video':
                // Video handled separately in JSX
                return { backgroundColor: 'transparent' };
            case 'solid':
            default:
                return { backgroundColor: baseColor };
        }
    };

    // Profile size calculations
    const getAvatarSize = () => {
        return theme.profileSize === 'large' ? 'w-32 h-32' : 'w-24 h-24';
    };

    const getTitleSize = () => {
        return theme.profileSize === 'large' ? 'text-3xl' : 'text-2xl';
    };

    const enabledLinks = links.filter(l => l.enabled !== false && l.visible !== false);
    const socialLinksBlock = (bioPageData.blocks || []).find(block => block.visible !== false && block.type === 'social_links');
    const socialIconLinks = selectLinksForSocialBlock(socialLinksBlock, enabledLinks);
    const socialIconLinkIds = new Set(socialIconLinks.map(link => link.id));
    const mainLinks = socialLinksBlock
        ? enabledLinks.filter(link => !socialIconLinkIds.has(link.id))
        : enabledLinks;
    const visibleEmailSubscribeBlock = (bioPageData.blocks || []).find(block => block.visible !== false && block.type === 'email_subscribe');
    const visibleEmailSubscribeBlockId = visibleEmailSubscribeBlock?.id || 'email-subscribe';
    const emailSubscribePlaceholder = typeof visibleEmailSubscribeBlock?.data?.placeholder === 'string' && visibleEmailSubscribeBlock.data.placeholder.trim()
        ? visibleEmailSubscribeBlock.data.placeholder
        : DEFAULT_PUBLIC_EMAIL_PLACEHOLDER;
    const emailSubscribeButtonText = typeof visibleEmailSubscribeBlock?.data?.buttonText === 'string' && visibleEmailSubscribeBlock.data.buttonText.trim()
        ? visibleEmailSubscribeBlock.data.buttonText
        : DEFAULT_PUBLIC_EMAIL_BUTTON_TEXT;
    const emailSubscribeConsentRequired = true;
    const emailSubscribeConsentText = typeof visibleEmailSubscribeBlock?.data?.consentText === 'string' && visibleEmailSubscribeBlock.data.consentText.trim()
        ? visibleEmailSubscribeBlock.data.consentText
        : DEFAULT_PUBLIC_EMAIL_CONSENT_TEXT;
    const emailSubscribeSuccessMessage = typeof visibleEmailSubscribeBlock?.data?.successMessage === 'string' && visibleEmailSubscribeBlock.data.successMessage.trim()
        ? visibleEmailSubscribeBlock.data.successMessage
        : DEFAULT_PUBLIC_EMAIL_SUCCESS_MESSAGE;
    const emailSubscribeValue = signupEmailByBlockId[visibleEmailSubscribeBlockId] || '';
    const emailSubscribeSubmitted = emailSubmittedBlockIds[visibleEmailSubscribeBlockId] === true;
    const emailSubscribeError = emailErrorsByBlockId[visibleEmailSubscribeBlockId] || null;
    const isSubmittingEmailSubscribe = submittingEmailBlockId === visibleEmailSubscribeBlockId;
    const visibleExtraBlocks = (bioPageData.blocks || [])
        .filter(block => block.visible !== false)
        .filter(block => !['profile', 'link', 'social_links', 'email_subscribe'].includes(block.type));
    const getBlockItems = (value: unknown): Array<Record<string, unknown>> => (
        Array.isArray(value)
            ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
            : []
    );
    const hasContactBlockContent = (block: BioPageData['blocks'][number]) => (
        Boolean(block.title || block.description || getSafeBioBlockUrl(block))
        || ['email', 'phone', 'whatsapp', 'address', 'text', 'content']
            .some(key => typeof block.data?.[key] === 'string' && Boolean(String(block.data[key]).trim()))
    );
    const hasRenderableBlockContent = (block: BioPageData['blocks'][number]) => {
        switch (block.type) {
            case 'product_grid':
            case 'product_collection':
                return filterBioPageProductsForBlock(bioPageData.products || [], block).length > 0;
            case 'featured_media':
                return Boolean(getSafeBioBlockMediaUrl(block));
            case 'portfolio_grid':
                return getBlockItems(block.data?.items).some(item => (
                    typeof item.url === 'string' && Boolean(getSafeBioBlockMediaUrl({ data: { url: item.url } }))
                    || typeof item.imageUrl === 'string' && Boolean(getSafeBioBlockMediaUrl({ data: { url: item.imageUrl } }))
                ));
            case 'contact':
                return hasContactBlockContent(block);
            case 'testimonials':
                return getBlockItems(block.data?.items).some(item => typeof item.quote === 'string' && Boolean(item.quote.trim()));
            case 'faq':
                return getBlockItems(block.data?.items).some(item => (
                    typeof item.question === 'string' && Boolean(item.question.trim())
                    && typeof item.answer === 'string' && Boolean(item.answer.trim())
                ));
            case 'featured_banner':
                return Boolean(block.title || block.description || getSafeBioBlockUrl(block));
            default:
                return true;
        }
    };
    const hasLinkTabContent = mainLinks.length > 0 || visibleExtraBlocks.some(block => (
        getPublicTabForBlock(block) === 'links' && hasRenderableBlockContent(block)
    ));
    const hasShopTabContent = visibleExtraBlocks.some(block => (
        getPublicTabForBlock(block) === 'shop' && hasRenderableBlockContent(block)
    ));
    const hasMediaTabContent = visibleExtraBlocks.some(block => (
        getPublicTabForBlock(block) === 'media' && hasRenderableBlockContent(block)
    ));
    const hasBookTabContent = visibleExtraBlocks.some(block => (
        getPublicTabForBlock(block) === 'book' && hasRenderableBlockContent(block)
    ));
    const hasContactTabContent = (
        (bioPageData.emailSignupEnabled && Boolean(visibleEmailSubscribeBlock))
        || visibleExtraBlocks.some(block => getPublicTabForBlock(block) === 'contact' && hasRenderableBlockContent(block))
    );
    const availablePublicTabs = PUBLIC_BIO_TABS.filter(tab => {
        switch (tab.id) {
            case 'links': return hasLinkTabContent;
            case 'shop': return hasShopTabContent;
            case 'media': return hasMediaTabContent;
            case 'book': return hasBookTabContent;
            case 'contact': return hasContactTabContent;
            default: return false;
        }
    });
    const resolvedActivePublicTab = availablePublicTabs.some(tab => tab.id === activePublicTab)
        ? activePublicTab
        : availablePublicTabs[0]?.id || 'links';
    const visibleBlocksForActiveTab = visibleExtraBlocks.filter(block => (
        getPublicTabForBlock(block) === resolvedActivePublicTab && hasRenderableBlockContent(block)
    ));
    const activeShopSearchQuery = shopSearchQuery.trim();

    // Colors from theme
    const titleColor = theme.titleColor || theme.textColor || '#ffffff';
    const bodyColor = theme.bodyColor || theme.textColor || '#ffffff';
    const renderShareButton = () => (
        <button
            type="button"
            onClick={handleShare}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur transition-transform hover:scale-105 active:scale-95"
            style={{ color: bodyColor, fontFamily: theme.bodyFont || 'inherit' }}
            aria-label="Share this Bio Page"
        >
            <Share2 size={14} />
            <span>
                {shareStatus === 'copied'
                    ? 'Copied'
                    : shareStatus === 'shared'
                      ? 'Shared'
                      : shareStatus === 'error'
                        ? 'Try again'
                        : 'Share'}
            </span>
        </button>
    );

    return (
        <div className="min-h-screen relative overflow-x-hidden w-screen max-w-full">
            {/* Video Background */}
            {theme.backgroundType === 'video' && theme.backgroundVideo && (
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover z-0"
                >
                    <source src={theme.backgroundVideo} type="video/mp4" />
                </video>
            )}

            {/* Main Content */}
            <div
                className="min-h-screen flex items-center justify-center p-4 relative z-10"
                style={getBackgroundStyle()}
            >
                <div className="w-full max-w-md">
                    {/* Profile Section */}
                    {theme.profileLayout === 'hero' ? (
                        // Hero Layout
                        <div className="mb-8">
                            {profile.avatarUrl && (
                                <div
                                    className="w-full h-48 rounded-2xl mb-4 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${profile.avatarUrl})` }}
                                />
                            )}
                            <h1
                                className={`${getTitleSize()} font-bold mb-2`}
                                style={{
                                    fontFamily: theme.titleFont || 'inherit',
                                    color: titleColor
                                }}
                            >
                                {profile.name}
                            </h1>
                            {profile.bio && (
                                <p
                                    className="text-sm opacity-80 max-w-xs"
                                    style={{
                                        fontFamily: theme.bodyFont || 'inherit',
                                        color: bodyColor
                                    }}
                                >
                                    {profile.bio}
                                </p>
                            )}
                            {renderShareButton()}
                        </div>
                    ) : (
                        // Circle Layout (default)
                        <div className="text-center mb-8">
                            {/* Avatar */}
                            {profile.avatarUrl ? (
                                <img
                                    src={profile.avatarUrl}
                                    alt={profile.name}
                                    className={`${getAvatarSize()} rounded-full mx-auto mb-4 object-cover ring-4 ring-white/10`}
                                />
                            ) : (
                                <div
                                    className={`${getAvatarSize()} rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold ring-4 ring-white/10`}
                                    style={{ backgroundColor: theme.buttonColor }}
                                >
                                    {profile.name?.charAt(0) || '?'}
                                </div>
                            )}

                            {/* Name */}
                            <h1
                                className={`${getTitleSize()} font-bold mb-2`}
                                style={{
                                    fontFamily: theme.titleFont || 'inherit',
                                    color: titleColor
                                }}
                            >
                                {profile.name}
                            </h1>

                            {/* Bio */}
                            {profile.bio && (
                                <p
                                    className="text-sm opacity-80 max-w-xs mx-auto"
                                    style={{
                                        fontFamily: theme.bodyFont || 'inherit',
                                        color: bodyColor
                                    }}
                                >
                                    {profile.bio}
                                </p>
                            )}

                            {renderShareButton()}
                        </div>
                    )}

                    {socialLinksBlock && socialIconLinks.length > 0 && (
                        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
                            {socialIconLinks.slice(0, 12).map(link => {
                                const PlatformIcon = getPlatformIcon(link);
                                return (
                                    <button
                                        key={link.id}
                                        type="button"
                                        onClick={() => handleLinkClick(link)}
                                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 backdrop-blur transition-transform hover:scale-105 active:scale-95"
                                        aria-label={link.title}
                                        style={{ color: bodyColor }}
                                    >
                                        <PlatformIcon size={18} />
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {availablePublicTabs.length > 1 && (
                        <nav
                            aria-label="Bio Page sections"
                            className="mb-5 flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/20 p-1 backdrop-blur"
                        >
                            {availablePublicTabs.map(tab => {
                                const isActive = tab.id === resolvedActivePublicTab;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        aria-pressed={isActive}
                                        onClick={() => handlePublicTabChange(tab.id)}
                                        className="min-h-9 flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors"
                                        style={{
                                            backgroundColor: isActive ? theme.buttonColor : 'transparent',
                                            color: isActive ? theme.buttonTextColor || '#ffffff' : bodyColor,
                                            fontFamily: theme.bodyFont || 'inherit',
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    )}

                    {resolvedActivePublicTab === 'shop' && hasShopTabContent && (
                        <div className="mb-4 flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 backdrop-blur">
                            <Search size={16} className="shrink-0 opacity-70" style={{ color: bodyColor }} />
                            <input
                                value={shopSearchQuery}
                                onChange={(event) => setShopSearchQuery(event.target.value)}
                                placeholder="Search products"
                                className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-white/45"
                                style={{ color: bodyColor, fontFamily: theme.bodyFont || 'inherit' }}
                                type="search"
                                aria-label="Search products"
                            />
                            {shopSearchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setShopSearchQuery('')}
                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                                    aria-label="Clear product search"
                                    style={{ color: bodyColor }}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Links */}
                    {resolvedActivePublicTab === 'links' && mainLinks.length > 0 && (
                        <div className="space-y-3">
                            {mainLinks.map((link) => {
                                const PlatformIcon = getPlatformIcon(link);
                                return (
                                    <button
                                        key={link.id}
                                        onClick={() => handleLinkClick(link)}
                                        className="w-full p-4 flex items-center gap-3 font-medium transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                                        style={getButtonStyle()}
                                    >
                                        <PlatformIcon size={18} className="opacity-80 flex-shrink-0" />
                                        <span className="flex-1 text-center">{link.title}</span>
                                        {link.linkType !== 'chatbot' && <ExternalLink size={14} className="opacity-50 flex-shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Email Signup */}
                    {resolvedActivePublicTab === 'contact' && bioPageData.emailSignupEnabled && visibleEmailSubscribeBlock && (
                        <div
                            className="mt-6 p-4 rounded-xl"
                            style={{ backgroundColor: `${theme.buttonColor}10` }}
                        >
                            {emailSubscribeSubmitted ? (
                                <div className="flex items-center justify-center gap-2 py-2">
                                    <CheckCircle size={18} style={{ color: theme.buttonColor }} />
                                    <p className="text-sm font-medium" style={{ color: bodyColor }}>
                                        {emailSubscribeSuccessMessage}
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={(event) => handleEmailSignup(event, visibleEmailSubscribeBlock)}>
                                    <p className="text-xs text-center mb-2 opacity-70" style={{ color: bodyColor }}>
                                        {visibleEmailSubscribeBlock.title || 'Join my newsletter'}
                                    </p>
                                    {visibleEmailSubscribeBlock.description && (
                                        <p className="mb-3 text-center text-[11px] opacity-70" style={{ color: bodyColor }}>
                                            {visibleEmailSubscribeBlock.description}
                                        </p>
                                    )}
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={emailSubscribeValue}
                                            onChange={(e) => {
                                                setSignupEmailByBlockId(previous => ({ ...previous, [visibleEmailSubscribeBlockId]: e.target.value }));
                                                setEmailErrorsByBlockId(previous => ({ ...previous, [visibleEmailSubscribeBlockId]: null }));
                                            }}
                                            placeholder={emailSubscribePlaceholder}
                                            required
                                            className="flex-1 px-3 py-2 text-xs rounded-lg bg-black/20 border border-white/10 outline-none"
                                            style={{
                                                color: bodyColor,
                                                fontFamily: theme.bodyFont || 'inherit',
                                            }}
                                            disabled={Boolean(submittingEmailBlockId)}
                                        />
                                        <button
                                            type="submit"
                                            disabled={Boolean(submittingEmailBlockId) || !emailSubscribeValue.trim()}
                                            className="px-3 py-2 text-xs font-medium rounded-lg transition-opacity disabled:opacity-50"
                                            style={{
                                                backgroundColor: theme.buttonColor,
                                                color: theme.buttonTextColor || '#ffffff',
                                                fontFamily: theme.bodyFont || 'inherit',
                                            }}
                                        >
                                            {isSubmittingEmailSubscribe ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                emailSubscribeButtonText
                                            )}
                                        </button>
                                    </div>
                                    {emailSubscribeConsentRequired && (
                                        <label className="mt-2 flex items-start gap-2 text-left text-[11px] opacity-75" style={{ color: bodyColor }}>
                                            <input
                                                type="checkbox"
                                                checked={signupConsentByBlockId[visibleEmailSubscribeBlockId] === true}
                                                onChange={(e) => setSignupConsentByBlockId(previous => ({ ...previous, [visibleEmailSubscribeBlockId]: e.target.checked }))}
                                                className="mt-0.5"
                                                required
                                            />
                                            <span>{emailSubscribeConsentText}</span>
                                        </label>
                                    )}
                                    {emailSubscribeError && (
                                        <p className="text-xs text-red-400 mt-1.5 text-center">{emailSubscribeError}</p>
                                    )}
                                </form>
                            )}
                        </div>
                    )}

                    {visibleBlocksForActiveTab.length > 0 && (
                        <div className="mt-6 space-y-3">
                            {visibleBlocksForActiveTab.map(block => {
                                if (block.type === 'chatbot_cta') {
                                    return (
                                        <button
                                            key={block.id}
                                            onClick={() => {
                                                setActiveChatBlockId(block.id);
                                                if (bioPageData) void trackBioPageChatOpen(bioPageData, block.id);
                                                setIsChatbotOpen(true);
                                            }}
                                            className="w-full p-4 flex items-center gap-3 font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            style={getButtonStyle()}
                                        >
                                            <MessageCircle size={18} className="opacity-80 flex-shrink-0" />
                                            <span className="flex-1 text-center">{block.title || 'Chat with us'}</span>
                                        </button>
                                    );
                                }

                                if (block.type === 'booking') {
                                    if (block.data?.bookingMode === 'inline' && bioPageData.projectId) {
                                        return (
                                            <div key={block.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur">
                                                <AppointmentBooking
                                                    title={block.title || 'Book an appointment'}
                                                    description={block.description || 'Choose an available time and send your request.'}
                                                    buttonText="Request booking"
                                                    durationMinutes={typeof block.data?.durationMinutes === 'number' ? block.data.durationMinutes : 60}
                                                    paddingY="none"
                                                    paddingX="none"
                                                    cardBorderRadius="xl"
                                                    inputBorderRadius="lg"
                                                    buttonBorderRadius="lg"
                                                    titleFontSize="sm"
                                                    descriptionFontSize="sm"
                                                    colors={{
                                                        background: 'transparent',
                                                        cardBackground: 'rgba(255,255,255,0.08)',
                                                        borderColor: 'rgba(255,255,255,0.12)',
                                                        inputBackground: 'rgba(0,0,0,0.2)',
                                                        inputBorder: 'rgba(255,255,255,0.12)',
                                                        inputText: bodyColor,
                                                        text: bodyColor,
                                                        heading: titleColor,
                                                        description: bodyColor,
                                                        accent: theme.buttonColor,
                                                        buttonBackground: theme.buttonColor,
                                                        buttonText: theme.buttonTextColor || '#ffffff',
                                                    }}
                                                    projectId={bioPageData.projectId}
                                                    ownerId={bioPageData.userId || undefined}
                                                    compact
                                                    sourceComponent="BioPageBookingBlock"
                                                    sourceModule="bio-page-engine"
                                                    sourceBlockId={block.id}
                                                    onBookingIntent={() => void trackBioPageBookingStarted(bioPageData, block.id)}
                                                    onBookingCompleted={(result) => void trackBioPageBookingCompleted(bioPageData, block.id, result)}
                                                />
                                            </div>
                                        );
                                    }

                                    return (
                                        <button
                                            key={block.id}
                                            onClick={() => {
                                                if (bioPageData) void trackBioPageBookingStarted(bioPageData, block.id);
                                                const bookingUrl = getSafeBioBlockUrl(block, `/appointments?project=${bioPageData.projectId}`);
                                                if (!bookingUrl) return;
                                                window.open(bookingUrl, '_self');
                                            }}
                                            className="w-full p-4 flex items-center gap-3 font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            style={getButtonStyle()}
                                        >
                                            <Calendar size={18} className="opacity-80 flex-shrink-0" />
                                            <span className="flex-1 text-center">{block.title || 'Book now'}</span>
                                        </button>
                                    );
                                }

                                if (block.type === 'lead_form') {
                                    const fields = normalizeLeadFormFields(block.data?.fields);
                                    const consentRequired = block.data?.consentRequired === true;
                                    const consentText = typeof block.data?.consentText === 'string' && block.data.consentText.trim()
                                        ? block.data.consentText.trim()
                                        : 'I agree to be contacted about this request.';
                                    const successMessage = typeof block.data?.successMessage === 'string' && block.data.successMessage.trim()
                                        ? block.data.successMessage.trim()
                                        : 'Thanks. We will be in touch soon.';
                                    const isSubmitted = submittedLeadBlockIds[block.id] === true;
                                    const isSubmittingThisLead = submittingLeadBlockId === block.id;
                                    return (
                                        <div key={block.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur">
                                            {isSubmitted ? (
                                                <div className="flex items-center justify-center gap-2 py-3">
                                                    <CheckCircle size={18} style={{ color: theme.buttonColor }} />
                                                    <p className="text-sm font-medium" style={{ color: bodyColor }}>{successMessage}</p>
                                                </div>
                                            ) : (
                                                <form onSubmit={(event) => handleLeadSubmit(event, block)} className="space-y-2">
                                                    <p className="text-sm font-semibold text-center" style={{ color: titleColor }}>{block.title || 'Contact'}</p>
                                                    {fields.map(field => {
                                                        const value = leadFieldValues[getLeadFieldKey(block.id, field.id)] || '';
                                                        const commonProps = {
                                                            value,
                                                            placeholder: field.required ? `${field.label} *` : field.label,
                                                            required: field.required,
                                                            'aria-label': field.label,
                                                            className: 'w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none',
                                                            style: { color: bodyColor },
                                                            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleLeadFieldChange(block.id, field.id, event.target.value),
                                                        };
                                                        if (field.type === 'textarea') {
                                                            return (
                                                                <textarea
                                                                    key={field.id}
                                                                    {...commonProps}
                                                                    rows={3}
                                                                    className={`${commonProps.className} resize-none`}
                                                                />
                                                            );
                                                        }
                                                        return (
                                                            <input
                                                                key={field.id}
                                                                {...commonProps}
                                                                type={field.type === 'phone' ? 'tel' : field.type}
                                                                autoComplete={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.id === 'name' ? 'name' : undefined}
                                                            />
                                                        );
                                                    })}
                                                    {consentRequired && (
                                                        <label className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2 text-left text-xs" style={{ color: bodyColor }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={leadConsentValues[block.id] === true}
                                                                onChange={(event) => setLeadConsentValues(previous => ({ ...previous, [block.id]: event.target.checked }))}
                                                                className="mt-0.5"
                                                                required
                                                            />
                                                            <span className="opacity-80">{consentText}</span>
                                                        </label>
                                                    )}
                                                    <button
                                                        type="submit"
                                                        disabled={Boolean(submittingLeadBlockId)}
                                                        className="w-full rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60"
                                                        style={{ backgroundColor: theme.buttonColor, color: theme.buttonTextColor || '#ffffff' }}
                                                    >
                                                        {isSubmittingThisLead ? 'Sending...' : 'Send'}
                                                    </button>
                                                    {leadError && <p className="text-xs text-red-400 text-center">{leadError}</p>}
                                                </form>
                                            )}
                                        </div>
                                    );
                                }

                                if (block.type === 'contact') {
                                    const email = typeof block.data?.email === 'string' ? block.data.email.trim() : '';
                                    const phone = typeof block.data?.phone === 'string' ? block.data.phone.trim() : '';
                                    const whatsapp = typeof block.data?.whatsapp === 'string' ? block.data.whatsapp.trim() : '';
                                    const address = typeof block.data?.address === 'string' ? block.data.address.trim() : '';
                                    const text = typeof block.data?.text === 'string'
                                        ? block.data.text.trim()
                                        : typeof block.data?.content === 'string'
                                          ? block.data.content.trim()
                                          : '';
                                    const rawUrl = typeof block.data?.url === 'string' ? block.data.url.trim() : '';
                                    const safeUrl = rawUrl
                                        ? getSafeBioLinkUrl({ id: `${block.id}-url`, title: block.title || 'Contact', url: rawUrl, enabled: true, clicks: 0 })
                                        : '';
                                    const sanitizedPhone = phone.replace(/[^\d+]/g, '');
                                    const whatsappUrl = whatsapp.startsWith('http')
                                        ? getSafeBioLinkUrl({ id: `${block.id}-whatsapp`, title: 'WhatsApp', url: whatsapp, enabled: true, clicks: 0 })
                                        : whatsapp.replace(/[^\d]/g, '')
                                          ? `https://wa.me/${whatsapp.replace(/[^\d]/g, '')}`
                                          : '';
                                    const contactMethods: Array<{ key: string; label: string; value: string; href?: string; icon: LucideIcon }> = [
                                        ...(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                                            ? [{ key: 'email', label: 'Email', value: email, href: `mailto:${email}`, icon: Mail }]
                                            : []),
                                        ...(sanitizedPhone
                                            ? [{ key: 'phone', label: 'Phone', value: phone, href: `tel:${sanitizedPhone}`, icon: Phone }]
                                            : []),
                                        ...(whatsappUrl
                                            ? [{ key: 'whatsapp', label: 'WhatsApp', value: whatsapp || 'Message on WhatsApp', href: whatsappUrl, icon: MessageCircle }]
                                            : []),
                                        ...(safeUrl
                                            ? [{ key: 'url', label: 'Website', value: safeUrl, href: safeUrl, icon: Globe }]
                                            : []),
                                        ...(address
                                            ? [{ key: 'address', label: 'Address', value: address, icon: MapPin }]
                                            : []),
                                    ];

                                    if (!contactMethods.length && !text && !block.description) return null;

                                    return (
                                        <div key={block.id} className="rounded-2xl border border-white/10 bg-black/15 p-4 text-left backdrop-blur">
                                            <p className="text-sm font-semibold" style={{ color: titleColor }}>{block.title || 'Contact'}</p>
                                            {(block.description || text) && (
                                                <p className="mt-1 text-xs opacity-75" style={{ color: bodyColor }}>
                                                    {block.description || text}
                                                </p>
                                            )}
                                            {contactMethods.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    {contactMethods.map(method => {
                                                        const ContactIcon = method.icon;
                                                        const content = (
                                                            <>
                                                                <ContactIcon size={15} className="shrink-0 opacity-80" />
                                                                <span className="min-w-0 flex-1 truncate">{method.value}</span>
                                                            </>
                                                        );
                                                        return method.href ? (
                                                            <button
                                                                key={method.key}
                                                                type="button"
                                                                onClick={() => window.open(method.href, method.href?.startsWith('http') ? '_blank' : '_self')}
                                                                className="flex w-full items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-medium transition-transform hover:scale-[1.01] active:scale-[0.99]"
                                                                style={{ color: bodyColor }}
                                                                aria-label={method.label}
                                                            >
                                                                {content}
                                                            </button>
                                                        ) : (
                                                            <div
                                                                key={method.key}
                                                                className="flex w-full items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-medium"
                                                                style={{ color: bodyColor }}
                                                            >
                                                                {content}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                if (block.type === 'featured_banner') {
                                    const ctaUrl = getSafeBioBlockUrl(block);
                                    return (
                                        <button
                                            key={block.id}
                                            onClick={() => ctaUrl && window.open(ctaUrl, ctaUrl.startsWith('/') || ctaUrl.startsWith('#') ? '_self' : '_blank')}
                                            className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-4 text-left backdrop-blur transition-transform hover:scale-[1.01]"
                                        >
                                            <p className="text-sm font-semibold" style={{ color: titleColor }}>{block.title}</p>
                                            {block.description && <p className="mt-1 text-xs opacity-75" style={{ color: bodyColor }}>{block.description}</p>}
                                        </button>
                                    );
                                }

                                if (block.type === 'product_grid' || block.type === 'product_collection') {
                                    const blockProducts = filterBioPageProductsForBlock(bioPageData.products || [], block);
                                    if (!blockProducts.length) return null;
                                    const visibleProducts = filterBioPageProductsForQuery(blockProducts, activeShopSearchQuery);
                                    const collectionIds = Array.isArray(block.data?.collectionIds)
                                        ? block.data.collectionIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
                                        : [];
                                    const collectionLabel = collectionIds.length === 1
                                        ? blockProducts.find(product => [product.categoryId, product.categorySlug, product.categoryName].includes(collectionIds[0]))?.categoryName
                                        : '';
                                    return (
                                        <div key={block.id} className="rounded-2xl border border-white/10 bg-black/15 p-4 backdrop-blur">
                                            <p className="mb-3 text-sm font-semibold" style={{ color: titleColor }}>{block.title || collectionLabel || 'Shop'}</p>
                                            {visibleProducts.length ? (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {visibleProducts.slice(0, activeShopSearchQuery ? 12 : 4).map(product => (
                                                        <button
                                                            key={product.id}
                                                            onClick={() => {
                                                                void trackBioPageProductClick(bioPageData, product.id, block.id);
                                                                window.open(product.url, '_self');
                                                            }}
                                                            className="overflow-hidden rounded-xl bg-white/10 text-left"
                                                        >
                                                            {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="aspect-square w-full object-cover" />}
                                                            <span className="block px-2 py-2 text-xs font-medium" style={{ color: bodyColor }}>{product.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="rounded-xl bg-white/10 px-3 py-4 text-center text-xs" style={{ color: bodyColor }}>
                                                    No products match this search.
                                                </p>
                                            )}
                                        </div>
                                    );
                                }

                                if (block.type === 'featured_media') {
                                    const mediaUrl = getSafeBioBlockMediaUrl(block);
                                    if (!mediaUrl) return null;
                                    const mediaType = typeof block.data?.mediaType === 'string' ? block.data.mediaType : '';
                                    return (
                                        <div key={block.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/15 backdrop-blur">
                                            {mediaType === 'video' ? (
                                                <video src={mediaUrl} controls playsInline className="aspect-video w-full bg-black object-cover" />
                                            ) : (
                                                <img src={mediaUrl} alt={block.title || 'Featured media'} className="aspect-video w-full object-cover" />
                                            )}
                                            <div className="p-4">
                                                <p className="text-sm font-semibold" style={{ color: titleColor }}>{block.title || 'Featured media'}</p>
                                                {block.description && <p className="mt-1 text-xs opacity-75" style={{ color: bodyColor }}>{block.description}</p>}
                                            </div>
                                        </div>
                                    );
                                }

                                if (block.type === 'portfolio_grid') {
                                    const items = getBlockItems(block.data?.items);
                                    if (!items.length) return null;
                                    return (
                                        <div key={block.id} className="rounded-2xl border border-white/10 bg-black/15 p-4 backdrop-blur">
                                            <p className="mb-3 text-sm font-semibold" style={{ color: titleColor }}>{block.title || 'Portfolio'}</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {items.slice(0, 9).map((item, index) => {
                                                    const rawUrl = typeof item.url === 'string' ? item.url : typeof item.imageUrl === 'string' ? item.imageUrl : '';
                                                    const url = rawUrl ? getSafeBioBlockMediaUrl({ data: { url: rawUrl } }) : '';
                                                    const title = typeof item.title === 'string' ? item.title : `Portfolio item ${index + 1}`;
                                                    const itemType = typeof item.type === 'string' ? item.type : '';
                                                    const itemHref = typeof item.href === 'string'
                                                        ? getSafeBioLinkUrl({ id: `${block.id}-${index}-href`, title, url: item.href, enabled: true, clicks: 0 })
                                                        : '';
                                                    if (!url) return null;
                                                    return (
                                                        <button
                                                            key={`${block.id}-${index}`}
                                                            onClick={() => itemHref && window.open(itemHref, itemHref.startsWith('/') || itemHref.startsWith('#') ? '_self' : '_blank')}
                                                            className="aspect-square overflow-hidden rounded-xl bg-white/10"
                                                        >
                                                            {itemType.startsWith('video/') ? (
                                                                <video src={url} aria-label={title} className="h-full w-full object-cover" muted playsInline />
                                                            ) : (
                                                                <img src={url} alt={title} className="h-full w-full object-cover" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                }

                                if (block.type === 'testimonials') {
                                    const items = getBlockItems(block.data?.items)
                                        .filter(item => typeof item.quote === 'string' && item.quote.trim());
                                    if (!items.length) return null;
                                    return (
                                        <div key={block.id} className="rounded-2xl border border-white/10 bg-black/15 p-4 text-left backdrop-blur">
                                            <p className="mb-3 text-sm font-semibold" style={{ color: titleColor }}>{block.title || 'Testimonials'}</p>
                                            <div className="space-y-3">
                                                {items.slice(0, 4).map((item, index) => {
                                                    const rating = typeof item.rating === 'number' ? Math.min(Math.max(item.rating, 1), 5) : 0;
                                                    const author = typeof item.author === 'string' ? item.author : '';
                                                    const role = typeof item.role === 'string' ? item.role : '';
                                                    return (
                                                        <figure key={`${block.id}-testimonial-${index}`} className="rounded-xl bg-white/10 p-3">
                                                            {rating > 0 && (
                                                                <div className="mb-2 flex gap-0.5" aria-label={`${rating} out of 5`}>
                                                                    {Array.from({ length: rating }).map((_, starIndex) => (
                                                                        <Star key={`${block.id}-star-${index}-${starIndex}`} size={12} fill="currentColor" style={{ color: theme.buttonColor }} />
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <blockquote className="text-xs leading-relaxed" style={{ color: bodyColor }}>
                                                                "{String(item.quote)}"
                                                            </blockquote>
                                                            {(author || role) && (
                                                                <figcaption className="mt-2 text-[11px] font-semibold" style={{ color: titleColor }}>
                                                                    {author}{author && role ? ' - ' : ''}{role}
                                                                </figcaption>
                                                            )}
                                                        </figure>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                }

                                if (block.type === 'faq') {
                                    const items = getBlockItems(block.data?.items);
                                    if (!items.length) return null;
                                    return (
                                        <div key={block.id} className="rounded-2xl border border-white/10 bg-black/15 p-4 text-left backdrop-blur">
                                            <p className="mb-3 text-sm font-semibold" style={{ color: titleColor }}>{block.title || 'FAQ'}</p>
                                            <div className="space-y-3">
                                                {items.slice(0, 5).map((item, index) => (
                                                    <div key={`${block.id}-${index}`}>
                                                        <p className="text-xs font-semibold" style={{ color: titleColor }}>{typeof item.question === 'string' ? item.question : ''}</p>
                                                        <p className="mt-1 text-xs opacity-75" style={{ color: bodyColor }}>{typeof item.answer === 'string' ? item.answer : ''}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }

                                return null;
                            })}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="text-center mt-12 opacity-50">
                        <a
                            href="https://quimera.ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs hover:opacity-80 transition-opacity"
                            style={{ color: bodyColor }}
                        >
                            Made with Quimera.ai
                        </a>
                    </div>
                </div>
            </div>

            {/* Chatbot Modal */}
            {isChatbotOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    onClick={() => {
                        setIsChatbotOpen(false);
                        setActiveChatBlockId(null);
                    }}
                >
                    <div
                        className="bg-white w-full sm:max-w-md sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[85vh] sm:h-[600px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header with close button */}
                        <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: theme.buttonColor }}>
                            <span className="font-medium text-white">Chat with {profile.name}</span>
                            <button
                                onClick={() => {
                                    setIsChatbotOpen(false);
                                    setActiveChatBlockId(null);
                                }}
                                className="p-1 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X size={20} className="text-white" />
                            </button>
                        </div>

                        {/* Chatbot content */}
                        {bioPageData?.aiAssistant ? (
                            <ChatCore
                                config={bioPageData.aiAssistant}
                                project={{
                                    id: bioPageData.projectId || bioPageData.id,
                                    name: bioPageData.profile.name || 'Chat',
                                    description: bioPageData.profile.bio || '',
                                    userId: bioPageData.userId || undefined,
                                    data: bioPageChatContext?.pageData || {},
                                } as any}
                                appearance={bioPageData.aiAssistant.appearance || {
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
                                        fullScreenOnMobile: true,
                                    },
                                    messages: {
                                        welcomeMessage: 'Hi! How can I help you today?',
                                        welcomeMessageEnabled: true,
                                        welcomeDelay: 0,
                                        inputPlaceholder: 'Type a message...',
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
                                showHeader={false}
                                onClose={() => {
                                    setIsChatbotOpen(false);
                                    setActiveChatBlockId(null);
                                }}
                                autoOpen={true}
                                isEmbedded={true}
                                currentPageContext={bioPageChatContext as any}
                                onLeadCapture={handleLeadCapture}
                                className="h-full flex-1"
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <MessageCircle size={48} className="text-gray-300 mb-4" />
                                <h3 className="text-lg font-medium text-gray-700 mb-2">Chat unavailable</h3>
                                <p className="text-sm text-gray-500">
                                    The chatbot configuration is not available for this page.
                                </p>
                                <button
                                    onClick={() => setIsChatbotOpen(false)}
                                    className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicBioPage;
