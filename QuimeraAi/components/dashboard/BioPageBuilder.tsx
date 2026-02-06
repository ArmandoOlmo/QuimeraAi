/**
 * BioPageBuilder
 * Full-featured "Link in Bio" builder with 3-column layout
 * Integrated with Quimera's dashboard architecture
 */

import React, { useState, useMemo, useCallback } from 'react';
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
    ArrowLeft,
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
} from 'lucide-react';
import { useAuth } from '../../contexts/core/AuthContext';
import { useProject } from '../../contexts/project';
import { useAI } from '../../contexts/ai';
import { useUI } from '../../contexts/core/UIContext';
import { useRouter } from '../../hooks/useRouter';
import { useBioPage, type BioLink as ContextBioLink, type BioProfile as ContextBioProfile, type BioTheme as ContextBioTheme, type BioProduct as ContextBioProduct } from '../../contexts/bioPage';
import { ROUTES } from '../../routes/config';
import DashboardSidebar from './DashboardSidebar';
import ImagePicker from '../ui/ImagePicker';
import ColorControl from '../ui/ColorControl';
import ChatCore from '../chat/ChatCore';
import { hexToRgba } from '../../utils/colorUtils';

// =============================================================================
// TYPES
// =============================================================================

type LinkType = 'link' | 'collection' | 'product' | 'form' | 'social' | 'embed' | 'chatbot';
type LinkCategory = 'suggested' | 'commerce' | 'social' | 'media' | 'contact' | 'events' | 'text' | 'all';

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

type ActiveTab = 'links' | 'design' | 'shop' | 'analytics' | 'audience';
type DesignSubTab = 'header' | 'theme' | 'wallpaper' | 'text' | 'buttons' | 'color';

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

const MOCK_PROFILE: BioProfile = {
    name: 'Your Business Name',
    bio: 'Welcome to my page! Find all my links here.',
    avatar: undefined,
};

const DEFAULT_THEME: BioTheme = {
    preset: 'default',
    backgroundColor: '#0f0f0f',
    backgroundType: 'solid',
    gradientColor: '#1a1a2e',
    buttonStyle: 'fill',
    buttonShape: 'rounded',
    buttonShadow: 'none',
    buttonColor: '#facc15',
    buttonTextColor: '#000000',
    textColor: '#ffffff',
    titleFont: 'Inter',
    titleColor: '#ffffff',
    bodyFont: 'Inter',
    bodyColor: '#ffffff',
    profileLayout: 'circle',
    profileSize: 'small',
    titleStyle: 'text',
};

const THEME_PRESETS = [
    { id: 'default', name: 'Quimera Dark', bg: '#0f0f0f', button: '#facc15', text: '#ffffff' },
    { id: 'light', name: 'Clean Light', bg: '#ffffff', button: '#000000', text: '#000000' },
    { id: 'ocean', name: 'Ocean Blue', bg: '#0c1929', button: '#3b82f6', text: '#ffffff' },
    { id: 'forest', name: 'Forest Green', bg: '#0d1f12', button: '#22c55e', text: '#ffffff' },
    { id: 'sunset', name: 'Sunset Glow', bg: '#1a0f0a', button: '#f97316', text: '#ffffff' },
    { id: 'berry', name: 'Berry Purple', bg: '#1a0d1a', button: '#a855f7', text: '#ffffff' },
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

// =============================================================================
// SORTABLE LINK ITEM COMPONENT
// =============================================================================

interface SortableLinkItemProps {
    link: ContextBioLink;
    onUpdate: (updates: Partial<ContextBioLink>) => void;
    onDelete: () => void;
    onToggle: () => void;
    t: (key: string, defaultValue: string) => string;
}

const SortableLinkItem: React.FC<SortableLinkItemProps> = ({
    link,
    onUpdate,
    onDelete,
    onToggle,
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
            className={`group bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 hover:border-border transition-all ${isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''
                }`}
        >
            <div className="flex items-start gap-3">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="mt-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
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
                        className="w-full bg-transparent text-foreground font-medium outline-none placeholder:text-muted-foreground/50"
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
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{link.clicks.toLocaleString()} {t('bioPage.clicks', 'clicks')}</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Only show open link button if not chatbot */}
                            {link.linkType !== 'chatbot' && (
                                <button
                                    onClick={() => window.open(link.url, '_blank')}
                                    className="p-1.5 hover:bg-muted rounded-md"
                                    title={t('bioPage.openLink', 'Open link')}
                                >
                                    <ExternalLink size={14} />
                                </button>
                            )}
                            <button
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
                    onClick={onToggle}
                    className={`p-2 rounded-lg transition-colors ${link.enabled
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
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
// COMPONENT
// =============================================================================

const BioPageBuilder: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { activeProjectId, activeProject } = useProject();
    const { generateImage, hasApiKey, promptForKeySelection } = useAI();
    const { navigate } = useRouter();
    const { user } = useAuth();

    // Mobile sidebar state
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Active view state
    const [activeTab, setActiveTab] = useState<ActiveTab>('links');
    const [designSubTab, setDesignSubTab] = useState<DesignSubTab>('header');

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
        profile,
        updateProfile: contextUpdateProfile,
        theme,
        updateTheme: contextUpdateTheme,
        products,
        setProducts,
        emailSignupEnabled,
        setEmailSignupEnabled,
        publishBioPage,
    } = useBioPage();

    // AI generation state
    const [isGeneratingBio, setIsGeneratingBio] = useState(false);
    const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

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
            const oldIndex = links.findIndex(link => link.id === active.id);
            const newIndex = links.findIndex(link => link.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const reorderedIds = arrayMove(
                    links.map(l => l.id),
                    oldIndex,
                    newIndex
                );
                // Call context reorderLinks to persist to Firestore
                contextReorderLinks(reorderedIds);
            }
        }
    }, [links, contextReorderLinks]);


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
        setSelectedFormIntegration(integration);
        setFormConfigTab('settings');
        setSelectedFormTemplate('email-signup');
        setSelectedFormLayout('classic');
        setIsFormConfigOpen(true);
    };

    const closeFormConfig = () => {
        setIsFormConfigOpen(false);
        setSelectedFormIntegration(null);
    };

    const handleAddForm = () => {
        if (selectedFormIntegration) {
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

    // Get filtered integrations based on category and search
    const filteredIntegrations = useMemo(() => {
        let filtered = INTEGRATIONS;

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
    }, [addLinkCategory, addLinkSearch]);

    const updateLink = (id: string, updates: Partial<BioLink>) => {
        contextUpdateLink(id, updates);
    };

    const deleteLink = (id: string) => {
        contextDeleteLink(id);
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
            const response = await generateContentViaProxy(projectId, prompt, 'gemini-2.5-flash', {}, user?.uid);
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
        { id: 'design', icon: Palette, label: t('bioPage.design', 'Design') },
        { id: 'shop', icon: ShoppingBag, label: t('bioPage.shop', 'Shop') },
        { id: 'analytics', icon: BarChart3, label: t('bioPage.analytics', 'Analytics') },
        { id: 'audience', icon: Users, label: t('bioPage.audience', 'Audience') },
    ];

    // ==========================================================================
    // RENDER HELPERS
    // ==========================================================================

    const renderLinksEditor = () => (
        <div className="space-y-6">
            {/* Add Link Button */}
            <button
                onClick={openAddLinkModal}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-primary/50 rounded-xl text-primary font-semibold hover:bg-primary/10 hover:border-primary transition-all"
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
                    items={links.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-3">
                        {links.map((link) => (
                            <SortableLinkItem
                                key={link.id}
                                link={link}
                                onUpdate={(updates) => updateLink(link.id, updates)}
                                onDelete={() => deleteLink(link.id)}
                                onToggle={() => updateLink(link.id, { enabled: !link.enabled })}
                                t={t}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );

    const renderDesignEditor = () => {
        const DESIGN_SECTIONS = [
            { id: 'header' as const, icon: User, label: t('bioPage.header', 'Header') },
            { id: 'theme' as const, icon: Palette, label: t('bioPage.theme', 'Theme') },
            { id: 'wallpaper' as const, icon: Image, label: t('bioPage.wallpaper', 'Wallpaper') },
            { id: 'text' as const, icon: Type, label: t('bioPage.text', 'Text') },
            { id: 'buttons' as const, icon: Square, label: t('bioPage.buttons', 'Buttons') },
            { id: 'color' as const, icon: Palette, label: t('bioPage.colors', 'Colors') },
        ];

        const FONT_OPTIONS = [
            'Inter', 'Roboto', 'Poppins', 'Montserrat', 'Playfair Display',
            'Open Sans', 'Lato', 'Oswald', 'Raleway', 'Nunito'
        ];

        return (
            <div className="flex gap-4 h-full">
                {/* Vertical Sidebar Navigation */}
                <div className="w-16 shrink-0 flex flex-col gap-1 bg-muted/30 rounded-xl p-2">
                    {DESIGN_SECTIONS.map((section) => {
                        const Icon = section.icon;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setDesignSubTab(section.id)}
                                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${designSubTab === section.id
                                    ? 'bg-background text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                            >
                                <Icon size={18} />
                                <span className="text-[10px] font-medium">{section.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto">
                    {/* HEADER SECTION */}
                    {designSubTab === 'header' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-foreground">{t('bioPage.header', 'Header')}</h3>

                            {/* Profile Image Layout */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-foreground">
                                    {t('bioPage.profileImageLayout', 'Profile image layout')}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => contextUpdateTheme({ profileLayout: 'circle' })}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme.profileLayout === 'circle'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-muted-foreground'
                                            }`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-muted" />
                                        <span className="text-xs font-medium">{t('bioPage.circle', 'Circle')}</span>
                                    </button>
                                    <button
                                        onClick={() => contextUpdateTheme({ profileLayout: 'hero' })}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme.profileLayout === 'hero'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-muted-foreground'
                                            }`}
                                    >
                                        <div className="w-full h-8 rounded-lg bg-muted" />
                                        <span className="text-xs font-medium">{t('bioPage.hero', 'Hero')}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Title Style */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-foreground">
                                    {t('bioPage.titleStyle', 'Title style')}
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => contextUpdateTheme({ titleStyle: 'text' })}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme.titleStyle === 'text'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-muted-foreground'
                                            }`}
                                    >
                                        <span className="text-lg font-bold">Aa</span>
                                        <span className="text-[10px] font-medium">{t('bioPage.text', 'Text')}</span>
                                    </button>
                                    <button
                                        onClick={() => contextUpdateTheme({ titleStyle: 'logo' })}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme.titleStyle === 'logo'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-muted-foreground'
                                            }`}
                                    >
                                        <Image size={20} className="text-muted-foreground" />
                                        <span className="text-[10px] font-medium">{t('bioPage.logo', 'Logo')}</span>
                                    </button>
                                    <button
                                        onClick={() => contextUpdateTheme({ titleStyle: 'both' })}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme.titleStyle === 'both'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-muted-foreground'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center gap-0.5">
                                            <Image size={14} className="text-muted-foreground" />
                                            <span className="text-[10px] font-bold leading-none">Aa</span>
                                        </div>
                                        <span className="text-[10px] font-medium">{t('bioPage.both', 'Both')}</span>
                                    </button>
                                </div>

                                {/* Logo Upload - Shows when logo or both is selected */}
                                {(theme.titleStyle === 'logo' || theme.titleStyle === 'both') && (
                                    <div className="pt-3 space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">
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
                                                    className="absolute top-1 right-1 p-1 rounded bg-black/50 hover:bg-black/70 text-white"
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
                                <label className="text-sm font-medium text-foreground">
                                    {t('bioPage.size', 'Size')}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['small', 'large'] as const).map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => contextUpdateTheme({ profileSize: size })}
                                            className={`py-3 px-4 rounded-xl border-2 transition-all ${theme.profileSize === size
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-muted-foreground'
                                                }`}
                                        >
                                            <span className="text-sm font-medium capitalize">{t(`bioPage.${size}`, size)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title Font */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    {t('bioPage.titleFont', 'Title font')}
                                </label>
                                <select
                                    value={theme.titleFont}
                                    onChange={(e) => contextUpdateTheme({ titleFont: e.target.value })}
                                    className="w-full bg-muted/50 rounded-lg px-3 py-2.5 text-sm text-foreground border border-border focus:ring-2 focus:ring-primary/50 outline-none"
                                >
                                    {FONT_OPTIONS.map(font => (
                                        <option key={font} value={font}>{font}</option>
                                    ))}
                                </select>
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
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-foreground">{t('bioPage.theme', 'Theme')}</h3>

                            {/* Theme Presets Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                {THEME_PRESETS.map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => applyThemePreset(preset.id)}
                                        className={`relative aspect-[4/5] rounded-xl border-2 overflow-hidden transition-all ${theme.preset === preset.id
                                            ? 'border-primary ring-2 ring-primary/20'
                                            : 'border-border hover:border-muted-foreground'
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
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-foreground">{t('bioPage.wallpaper', 'Wallpaper')}</h3>

                            {/* Wallpaper Style */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-foreground">
                                    {t('bioPage.wallpaperStyle', 'Wallpaper style')}
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['solid', 'gradient', 'blur', 'pattern', 'image', 'video'] as const).map((style) => (
                                        <button
                                            key={style}
                                            onClick={() => contextUpdateTheme({ backgroundType: style })}
                                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme.backgroundType === style
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-muted-foreground'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg ${style === 'solid' ? 'bg-muted' :
                                                style === 'gradient' ? 'bg-gradient-to-br from-primary/50 to-secondary' :
                                                    style === 'blur' ? 'bg-muted/50 backdrop-blur' :
                                                        style === 'pattern' ? 'bg-muted' :
                                                            style === 'image' ? 'bg-muted flex items-center justify-center' :
                                                                'bg-muted flex items-center justify-center'
                                                }`}>
                                                {style === 'image' && <Image size={14} className="text-muted-foreground" />}
                                                {style === 'video' && <Video size={14} className="text-muted-foreground" />}
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
                                        <label className="text-sm font-medium text-foreground">
                                            {t('bioPage.patternType', 'Pattern type')}
                                        </label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['dots', 'grid', 'diagonal', 'waves'] as const).map((pattern) => (
                                                <button
                                                    key={pattern}
                                                    onClick={() => contextUpdateTheme({ backgroundPattern: pattern })}
                                                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${(theme.backgroundPattern || 'dots') === pattern
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border hover:border-muted-foreground'
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
                                        <label className="text-sm font-medium text-foreground">
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
                                            <span className="text-sm text-muted-foreground w-8 text-right">
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
                                    <label className="text-sm font-medium text-foreground">
                                        {t('bioPage.backgroundImage', 'Background image')}
                                    </label>

                                    {/* Contrast Overlay Controls - Above Image */}
                                    <div className="p-4 rounded-xl border border-border/50 bg-card/30 space-y-3">
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
                                                    <p className="text-xs text-muted-foreground">
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
                                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${theme.headerOverlay ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Color Picker - Shows when overlay enabled */}
                                        {theme.headerOverlay && (
                                            <div className="pt-3 border-t border-border/50">
                                                <ColorControl
                                                    label={t('bioPage.overlayColor', 'Overlay color')}
                                                    value={theme.headerOverlayColor || '#000000'}
                                                    onChange={(value) => contextUpdateTheme({ headerOverlayColor: value })}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Profile Box Controls */}
                                    <div className="p-4 rounded-xl border border-border/50 bg-card/30 space-y-3">
                                        {/* Toggle Row */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center border border-border/50">
                                                    <Square size={16} className="text-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {t('bioPage.profileBox', 'Profile box')}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
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
                                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${theme.profileBox ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Options when enabled */}
                                        {theme.profileBox && (
                                            <div className="pt-3 border-t border-border/50 space-y-4">
                                                {/* Color Picker */}
                                                <ColorControl
                                                    label={t('bioPage.profileBoxColor', 'Box color')}
                                                    value={theme.profileBoxColor || '#000000'}
                                                    onChange={(value) => contextUpdateTheme({ profileBoxColor: value })}
                                                />

                                                {/* Corner Radius - Same style as buttons */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-muted-foreground">
                                                        {t('bioPage.profileBoxCorners', 'Corners')}
                                                    </label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {(['none', 'sm', 'md', 'lg'] as const).map((radius) => (
                                                            <button
                                                                key={radius}
                                                                onClick={() => contextUpdateTheme({ profileBoxRadius: radius })}
                                                                className={`p-2 rounded-lg border transition-colors ${(theme.profileBoxRadius || 'md') === radius
                                                                    ? 'border-primary bg-primary/10'
                                                                    : 'border-border hover:border-muted-foreground'
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
                                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
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
                                    <label className="text-sm font-medium text-foreground">
                                        {t('bioPage.backgroundVideo', 'Background video')}
                                    </label>

                                    {/* Contrast Overlay Controls - Above Video */}
                                    <div className="p-4 rounded-xl border border-border/50 bg-card/30 space-y-3">
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
                                                    <p className="text-xs text-muted-foreground">
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
                                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${theme.headerOverlay ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Color Picker - Shows when overlay enabled */}
                                        {theme.headerOverlay && (
                                            <div className="pt-3 border-t border-border/50">
                                                <ColorControl
                                                    label={t('bioPage.overlayColor', 'Overlay color')}
                                                    value={theme.headerOverlayColor || '#000000'}
                                                    onChange={(value) => contextUpdateTheme({ headerOverlayColor: value })}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Profile Box Controls */}
                                    <div className="p-4 rounded-xl border border-border/50 bg-card/30 space-y-3">
                                        {/* Toggle Row */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center border border-border/50">
                                                    <Square size={16} className="text-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {t('bioPage.profileBox', 'Profile box')}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
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
                                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${theme.profileBox ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Options when enabled */}
                                        {theme.profileBox && (
                                            <div className="pt-3 border-t border-border/50 space-y-4">
                                                {/* Color Picker */}
                                                <ColorControl
                                                    label={t('bioPage.profileBoxColor', 'Box color')}
                                                    value={theme.profileBoxColor || '#000000'}
                                                    onChange={(value) => contextUpdateTheme({ profileBoxColor: value })}
                                                />

                                                {/* Corner Radius - Same style as buttons */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-muted-foreground">
                                                        {t('bioPage.profileBoxCorners', 'Corners')}
                                                    </label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {(['none', 'sm', 'md', 'lg'] as const).map((radius) => (
                                                            <button
                                                                key={radius}
                                                                onClick={() => contextUpdateTheme({ profileBoxRadius: radius })}
                                                                className={`p-2 rounded-lg border transition-colors ${(theme.profileBoxRadius || 'md') === radius
                                                                    ? 'border-primary bg-primary/10'
                                                                    : 'border-border hover:border-muted-foreground'
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
                                            className="flex-1 bg-muted/50 rounded-lg px-3 py-2.5 text-sm border border-border focus:ring-2 focus:ring-primary/50 outline-none"
                                        />
                                    </div>

                                    {/* Video Upload */}
                                    <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-muted-foreground transition-colors cursor-pointer">
                                        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                                            <Upload size={20} className="text-muted-foreground" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-foreground">
                                                {t('bioPage.uploadVideo', 'Upload video')}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
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
                                        <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
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
                                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
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
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-foreground">{t('bioPage.text', 'Text')}</h3>

                            {/* Page Text Font */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    {t('bioPage.pageTextFont', 'Page text font')}
                                </label>
                                <select
                                    value={theme.bodyFont}
                                    onChange={(e) => contextUpdateTheme({ bodyFont: e.target.value })}
                                    className="w-full bg-muted/50 rounded-lg px-3 py-2.5 text-sm text-foreground border border-border focus:ring-2 focus:ring-primary/50 outline-none"
                                >
                                    {FONT_OPTIONS.map(font => (
                                        <option key={font} value={font}>{font}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Page Text Color */}
                            <ColorControl
                                label={t('bioPage.pageTextColor', 'Page text color')}
                                value={theme.bodyColor}
                                onChange={(value) => contextUpdateTheme({ bodyColor: value })}
                            />

                            {/* Title Font */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    {t('bioPage.titleFont', 'Title font')}
                                </label>
                                <select
                                    value={theme.titleFont}
                                    onChange={(e) => contextUpdateTheme({ titleFont: e.target.value })}
                                    className="w-full bg-muted/50 rounded-lg px-3 py-2.5 text-sm text-foreground border border-border focus:ring-2 focus:ring-primary/50 outline-none"
                                >
                                    {FONT_OPTIONS.map(font => (
                                        <option key={font} value={font}>{font}</option>
                                    ))}
                                </select>
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
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-foreground">{t('bioPage.buttons', 'Buttons')}</h3>

                            {/* Button Style */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-foreground">
                                    {t('bioPage.buttonStyle', 'Button style')}
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['fill', 'glass', 'outline'] as const).map((style) => (
                                        <button
                                            key={style}
                                            onClick={() => contextUpdateTheme({ buttonStyle: style })}
                                            className={`p-4 rounded-xl border-2 transition-all ${theme.buttonStyle === style
                                                ? 'border-primary'
                                                : 'border-border hover:border-muted-foreground'
                                                }`}
                                        >
                                            <div className={`w-full h-8 rounded-lg ${style === 'fill' ? 'bg-muted' :
                                                style === 'glass' ? 'bg-muted/50 backdrop-blur border border-border' :
                                                    'border-2 border-muted-foreground'
                                                }`} />
                                            <span className="text-xs font-medium mt-2 block capitalize">{t(`bioPage.${style}`, style)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Corner Roundness */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-foreground">
                                    {t('bioPage.cornerRoundness', 'Corner roundness')}
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(['square', 'rounded', 'rounder', 'pill'] as const).map((shape) => (
                                        <button
                                            key={shape}
                                            onClick={() => contextUpdateTheme({ buttonShape: shape })}
                                            className={`p-3 border-2 transition-all ${theme.buttonShape === shape
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border hover:border-muted-foreground'
                                                }`}
                                            style={{
                                                borderRadius: shape === 'square' ? '4px' : shape === 'rounded' ? '8px' : shape === 'rounder' ? '16px' : '9999px'
                                            }}
                                        >
                                            <span className="text-[10px] font-medium capitalize">{t(`bioPage.${shape}`, shape)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Button Shadow */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-foreground">
                                    {t('bioPage.buttonShadow', 'Button shadow')}
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(['none', 'soft', 'strong', 'hard'] as const).map((shadow) => (
                                        <button
                                            key={shadow}
                                            onClick={() => contextUpdateTheme({ buttonShadow: shadow })}
                                            className={`py-2 px-3 rounded-lg border-2 transition-all ${theme.buttonShadow === shadow
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border hover:border-muted-foreground'
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
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-foreground">{t('bioPage.colorManagement', 'Color Management')}</h3>

                            {/* Import from Project */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-foreground">
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
                                    className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Download size={18} className="text-primary" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="text-sm font-medium text-foreground">
                                            {t('bioPage.importWebColors', 'Import Web Colors')}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {t('bioPage.syncWithProject', 'Sync with your project theme palette')}
                                        </p>
                                    </div>
                                    {activeProject?.theme?.paletteColors && (
                                        <div className="flex gap-1">
                                            {activeProject.theme.paletteColors.slice(0, 5).map((c, i) => (
                                                <div key={i} className="w-4 h-4 rounded border border-border" style={{ backgroundColor: c }} />
                                            ))}
                                        </div>
                                    )}
                                </button>
                            </div>

                            {/* Coolors Palette Import */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-foreground">
                                    {t('bioPage.importCoolors', 'Import from Coolors')}
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder={t('bioPage.pasteCoolorsUrl', 'Paste Coolors URL (coolors.co/palette/...)')}
                                        className="flex-1 bg-muted/50 rounded-lg px-3 py-2.5 text-sm border border-border focus:ring-2 focus:ring-primary/50 outline-none"
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
                                <p className="text-xs text-muted-foreground">
                                    {t('bioPage.coolorsHelp', 'Paste a Coolors URL and press Enter to import colors')}
                                </p>
                            </div>

                            {/* Quick Color Overview */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-foreground">
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
                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                                                className="w-full aspect-square rounded-lg border border-border mb-1"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="text-[10px] text-muted-foreground">{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* All Color Controls */}
                            <div className="space-y-4 pt-2 border-t border-border">
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
            </div>
        );
    };


    const renderShopEditor = () => (
        <div className="space-y-6">
            <div className="text-center py-12">
                <ShoppingBag size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t('bioPage.shopComingSoon', 'Shop Coming Soon')}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {t('bioPage.shopDescription', 'Add products to sell directly from your bio page')}
                </p>
            </div>
        </div>
    );

    const renderAnalytics = () => (
        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-foreground">
                        {links.reduce((sum, l) => sum + l.clicks, 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">{t('bioPage.totalClicks', 'Total Clicks')}</p>
                </div>
                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-foreground">{links.length}</p>
                    <p className="text-sm text-muted-foreground">{t('bioPage.activeLinks', 'Active Links')}</p>
                </div>
            </div>

            {/* Top Links */}
            <div className="space-y-3">
                <h3 className="font-semibold text-foreground">{t('bioPage.topPerforming', 'Top Performing')}</h3>
                {links
                    .sort((a, b) => b.clicks - a.clicks)
                    .slice(0, 5)
                    .map((link, index) => (
                        <div
                            key={link.id}
                            className="flex items-center gap-3 bg-card/30 rounded-lg p-3"
                        >
                            <span className="text-sm font-bold text-muted-foreground w-6">
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
        </div>
    );

    const renderAudience = () => (
        <div className="space-y-6">
            {/* Email Signup Toggle */}
            <div className="flex items-center justify-between p-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Users size={20} className="text-primary" />
                    </div>
                    <div>
                        <p className="font-medium text-foreground">
                            {t('bioPage.emailSignup', 'Email Signup')}
                        </p>
                        <p className="text-xs text-muted-foreground">
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
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailSignupEnabled ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                    />
                </button>
            </div>
        </div>
    );

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

        // Profile size
        const avatarSize = theme.profileSize === 'large' ? 'w-24 h-24' : 'w-20 h-20';
        const titleSize = theme.profileSize === 'large' ? 'text-xl' : 'text-lg';

        return (
            <div
                className="w-[280px] h-[580px] rounded-[40px] overflow-hidden shadow-2xl border-4 border-neutral-800 relative"
                style={getPreviewBackgroundStyle()}
            >
                {/* Phone Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-800 rounded-b-2xl z-10" />

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

                    {/* Links */}
                    <div className="space-y-3">
                        {links.filter(l => l.enabled).map((link) => {
                            const borderRadius =
                                theme.buttonShape === 'square' ? '4px' :
                                    theme.buttonShape === 'rounded' ? '12px' :
                                        theme.buttonShape === 'rounder' ? '20px' : '9999px';

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
                    {emailSignupEnabled && (
                        <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: `${theme.buttonColor}10` }}>
                            <p className="text-xs text-center mb-2 opacity-70" style={{ color: bodyColor }}>
                                {t('bioPage.joinNewsletter', 'Join my newsletter')}
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="Email"
                                    className="flex-1 px-3 py-2 text-xs rounded-lg bg-black/20 border border-white/10 outline-none"
                                />
                                <button
                                    className="px-3 py-2 text-xs font-medium rounded-lg"
                                    style={{ backgroundColor: theme.buttonColor, color: theme.buttonTextColor || '#ffffff' }}
                                >
                                    {t('bioPage.subscribe', 'Join')}
                                </button>
                            </div>
                        </div>
                    )}

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
                    <div className="absolute inset-0 bg-black/40 z-50 flex flex-col justify-end p-3 pt-8">
                        <div
                            className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                            style={{ height: '90%' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ChatCore
                                config={activeProject.aiAssistant || {
                                    agentName: 'AI Assistant',
                                    tone: 'Professional',
                                    languages: 'Spanish, English',
                                    businessProfile: profile.bio,
                                    productsServices: '',
                                    policiesContact: '',
                                    specialInstructions: '',
                                    faqs: [],
                                    knowledgeDocuments: [],
                                    widgetColor: theme.buttonColor,
                                    isActive: true,
                                    leadCaptureEnabled: false,
                                    enableLiveVoice: false,
                                    voiceName: 'Puck',
                                }}
                                project={activeProject}
                                appearance={activeProject.aiAssistant?.appearance || {
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
        <div className="flex h-screen bg-background text-foreground">
            {/* Dashboard Sidebar */}
            <DashboardSidebar
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 px-2 sm:px-6 border-b border-border flex items-center justify-between bg-background z-20 sticky top-0">
                    <div className="flex items-center gap-1 sm:gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Link2 className="text-primary" size={24} />
                            <h1 className="text-xl font-bold text-foreground hidden sm:block">
                                {t('bioPage.title', 'Bio Page')}
                            </h1>
                        </div>
                    </div>

                    {/* Save Status Indicator + Save Button */}
                    <div className="flex items-center gap-3 text-xs">
                        {isSaving ? (
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Loader2 size={14} className="animate-spin" />
                                <span className="hidden sm:inline">{t('common.saving', 'Saving...')}</span>
                            </span>
                        ) : hasUnsavedChanges ? (
                            <>
                                <span className="flex items-center gap-1.5 text-yellow-500">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                    <span className="hidden sm:inline">{t('common.unsavedChanges', 'Unsaved')}</span>
                                </span>
                                <button
                                    onClick={async () => {
                                        if (!bioPage && activeProjectId) {
                                            // Create bio page first if it doesn't exist
                                            const username = profile.name?.toLowerCase().replace(/\s+/g, '-') || `bio-${Date.now()}`;
                                            await createBioPage(activeProjectId, username);
                                        }
                                        await saveBioPage();
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all"
                                >
                                    <Check size={14} />
                                    <span>{t('common.save', 'Save')}</span>
                                </button>
                            </>
                        ) : bioPage ? (
                            <span className="flex items-center gap-1.5 text-green-500">
                                <Check size={14} />
                                <span className="hidden sm:inline">{t('common.saved', 'Saved')}</span>
                            </span>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={async () => {
                                if (bioPage?.isPublished) {
                                    // Copy URL to clipboard
                                    const publicUrl = `${window.location.origin}/bio/${bioPage.username.toLowerCase()}`;
                                    await navigator.clipboard.writeText(publicUrl);
                                    setNotificationModal({
                                        isOpen: true,
                                        title: t('bioPage.urlCopied', 'URL Copied'),
                                        message: publicUrl,
                                        type: 'success'
                                    });
                                } else {
                                    // Create bio page first if it doesn't exist
                                    if (!bioPage && activeProjectId) {
                                        const username = profile.name?.toLowerCase().replace(/\s+/g, '-') || `bio-${Date.now()}`;
                                        await createBioPage(activeProjectId, username);
                                        await saveBioPage();
                                        // Wait a bit for state to update
                                        await new Promise(resolve => setTimeout(resolve, 100));
                                    }

                                    // Publish the bio page
                                    const success = await publishBioPage();
                                    if (success) {
                                        const usernameForUrl = bioPage?.username || profile.name?.toLowerCase().replace(/\s+/g, '-') || 'bio';
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
                                            message: t('bioPage.publishFailed', 'Failed to publish. Please try again.'),
                                            type: 'error'
                                        });
                                    }
                                }
                            }}
                            disabled={!bioPage?.isPublished && !profile.name && !bioPage?.username}
                            className={`flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-all ${bioPage?.isPublished
                                ? 'bg-green-500/20 hover:bg-green-500/30 text-green-500'
                                : 'bg-primary/20 hover:bg-primary/30 text-primary'
                                }`}
                        >
                            {bioPage?.isPublished ? <Copy size={16} /> : <Share2 size={16} />}
                            <span className="hidden sm:inline">
                                {bioPage?.isPublished
                                    ? t('bioPage.copyUrl', 'Copy URL')
                                    : t('bioPage.publish', 'Publish')}
                            </span>
                        </button>

                        {/* Update Published Button - shows when published and has unsaved changes */}
                        {bioPage?.isPublished && (
                            <button
                                onClick={async () => {
                                    const success = await publishBioPage();
                                    if (success) {
                                        setNotificationModal({
                                            isOpen: true,
                                            title: t('bioPage.updated', 'Updated!'),
                                            message: t('bioPage.updatedMessage', 'Your Bio Page has been updated.'),
                                            type: 'success'
                                        });
                                    }
                                }}
                                className="flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-all bg-primary/20 hover:bg-primary/30 text-primary"
                            >
                                <Share2 size={16} />
                                <span className="hidden sm:inline">{t('bioPage.update', 'Update')}</span>
                            </button>
                        )}

                        <button
                            onClick={() => navigate(ROUTES.DASHBOARD)}
                            className="flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                        >
                            <ArrowLeft size={16} />
                            <span className="hidden sm:inline">{t('common.back', 'Back')}</span>
                        </button>
                    </div>
                </header>

                {/* Loading Overlay */}
                {isLoadingBioPage && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <p className="text-muted-foreground text-sm">{t('bioPage.loading', 'Loading your bio page...')}</p>
                        </div>
                    </div>
                )}

                {/* 3-Column Layout */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Internal Sidebar */}
                    <nav className="hidden md:flex w-56 border-r border-border/50 p-4 flex-col gap-1 bg-card/30">
                        {/* Profile Section - Click to Edit */}
                        <button
                            onClick={openProfileModal}
                            className="mb-6 p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all group w-full text-left"
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
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Edit3 size={10} />
                                        {t('bioPage.clickToEdit', 'Click to edit')}
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                                {profile.bio || t('bioPage.shortBio', 'Write a short bio...')}
                            </p>
                        </button>

                        {/* Nav Items */}
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as ActiveTab)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    {/* Config Panel */}
                    <main className="flex-1 overflow-y-auto bg-muted/5 p-6 sm:p-8 pb-32">
                        <div className="max-w-2xl mx-auto">
                            {/* Mobile Nav */}
                            <div className="md:hidden flex gap-2 mb-6 overflow-x-auto pb-2">
                                {navItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id as ActiveTab)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeTab === item.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-card text-muted-foreground border border-border'
                                            }`}
                                    >
                                        <item.icon size={16} />
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            {/* Content */}
                            {activeTab === 'links' && renderLinksEditor()}
                            {activeTab === 'design' && renderDesignEditor()}
                            {activeTab === 'shop' && renderShopEditor()}
                            {activeTab === 'analytics' && renderAnalytics()}
                            {activeTab === 'audience' && renderAudience()}
                        </div>
                    </main>

                    {/* Live Preview */}
                    <aside className="hidden lg:flex w-[400px] border-l border-border/50 bg-neutral-900/50 items-center justify-center p-8">
                        {renderMobilePreview()}
                    </aside>
                </div>
            </div>

            {/* Add Link Modal */}
            {isAddLinkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={closeAddLinkModal}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-3xl bg-background rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[65vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <h2 className="text-xl font-bold text-foreground">
                                {t('bioPage.add', 'Add')}
                            </h2>
                            <button
                                onClick={closeAddLinkModal}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X size={20} className="text-muted-foreground" />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-5 border-b border-border">
                            <div className="relative">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={addLinkSearch}
                                    onChange={(e) => setAddLinkSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addLinkSearch && handleAddLinkFromSearch()}
                                    placeholder={t('bioPage.pasteOrSearch', 'Paste or search a link')}
                                    className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Main Content - Split Layout */}
                        <div className="flex flex-1 overflow-hidden">
                            {/* Categories Sidebar */}
                            <nav className="w-48 border-r border-border p-3 overflow-y-auto flex-shrink-0">
                                {LINK_CATEGORIES.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => setAddLinkCategory(category.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${addLinkCategory === category.id
                                            ? 'bg-muted text-foreground'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                            }`}
                                    >
                                        <category.icon size={18} />
                                        {t(`bioPage.category.${category.id}`, category.label)}
                                    </button>
                                ))}
                            </nav>

                            {/* Right Content Area */}
                            <div className="flex-1 overflow-y-auto p-5">

                                {/* Category Label */}
                                <p className="text-sm font-medium text-muted-foreground mb-4">
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
                                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-muted-foreground hover:bg-muted/30 transition-all group"
                                        >
                                            {/* Icon */}
                                            <div
                                                className="w-12 h-12 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: `${integration.color}20` }}
                                            >
                                                <integration.icon size={24} style={{ color: integration.color }} />
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 text-left">
                                                <p className="font-semibold text-foreground">{integration.name}</p>
                                                <p className="text-sm text-muted-foreground">{integration.description}</p>
                                            </div>

                                            {/* Arrow */}
                                            <ChevronRight size={20} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}

                                    {/* Empty State */}
                                    {filteredIntegrations.length === 0 && (
                                        <div className="text-center py-12">
                                            <Search size={32} className="mx-auto text-muted-foreground/50 mb-3" />
                                            <p className="text-muted-foreground">
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
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={closeFormConfig}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[70vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-border bg-primary/10">
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
                        <div className="flex border-b border-border">
                            <button
                                onClick={() => setFormConfigTab('settings')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${formConfigTab === 'settings'
                                    ? 'text-foreground border-b-2 border-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {t('bioPage.linkSettings', 'Link Settings')}
                            </button>
                            <button
                                onClick={() => setFormConfigTab('layout')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${formConfigTab === 'layout'
                                    ? 'text-foreground border-b-2 border-primary'
                                    : 'text-muted-foreground hover:text-foreground'
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
                                        <p className="text-sm text-muted-foreground">{t('bioPage.formTemplateDesc', 'Save time with a pre-built template')}</p>
                                    </div>

                                    <div className="space-y-2">
                                        {FORM_TEMPLATES.map((template) => (
                                            <button
                                                key={template.id}
                                                onClick={() => setSelectedFormTemplate(template.id)}
                                                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${selectedFormTemplate === template.id
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-muted-foreground hover:bg-muted/30'
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
                                                    <p className="text-sm text-muted-foreground">{template.description}</p>
                                                </div>
                                                <ChevronRight size={20} className="text-muted-foreground" />
                                            </button>
                                        ))}
                                    </div>

                                    <p className="text-center text-sm text-muted-foreground mt-6">
                                        {t('bioPage.gotIdeas', 'Got ideas? We\'re listening!')} <span className="text-primary cursor-pointer hover:underline">{t('bioPage.shareFeedback', 'Share feedback')}</span>
                                    </p>
                                </div>
                            )}

                            {formConfigTab === 'layout' && (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-4">{t('bioPage.chooseLayout', 'Choose a layout for your link')}</p>

                                    <div className="space-y-3">
                                        {FORM_LAYOUTS.map((layout) => (
                                            <button
                                                key={layout.id}
                                                onClick={() => setSelectedFormLayout(layout.id)}
                                                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${selectedFormLayout === layout.id
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-muted-foreground hover:bg-muted/30'
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
                                                    <p className="text-sm text-muted-foreground">{layout.description}</p>
                                                </div>
                                                {/* Layout Preview */}
                                                <div className={`w-16 h-10 rounded border border-muted-foreground/30 flex items-center justify-center ${layout.id === 'featured' ? 'bg-primary/20' : 'bg-muted'
                                                    }`}>
                                                    <div className={`${layout.id === 'featured' ? 'w-10 h-6 bg-primary/40' : 'w-12 h-2 bg-muted-foreground/30'} rounded`} />
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <p className="text-center text-sm text-muted-foreground mt-6">
                                        {t('bioPage.gotIdeas', 'Got ideas? We\'re listening!')} <span className="text-primary cursor-pointer hover:underline">{t('bioPage.shareFeedback', 'Share feedback')}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-border">
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
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={closeProfileModal}
                    />

                    {/* Modal */}
                    <div className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <h2 className="text-lg font-bold text-foreground">
                                {t('bioPage.editProfile', 'Edit Profile')}
                            </h2>
                            <button
                                onClick={closeProfileModal}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X size={20} className="text-muted-foreground" />
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
                                <p className="text-xs text-muted-foreground text-center">
                                    {t('bioPage.avatarHint', 'Select from library, upload, or generate with AI')}
                                </p>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-border" />

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
                                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            {/* Bio Input */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-foreground">
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
                                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    {profile.bio.length}/150 {t('bioPage.characters', 'characters')}
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-border">
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setNotificationModal({ ...notificationModal, isOpen: false })}>
                    <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${notificationModal.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                {notificationModal.type === 'success' ? <Check size={24} /> : <X size={24} />}
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2">{notificationModal.title}</h3>
                            <p className="text-sm text-muted-foreground break-all mb-6">{notificationModal.message}</p>
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
