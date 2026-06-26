/**
 * BioPageContext
 * Maneja Bio Pages (Link in Bio) con persistencia en Supabase
 * Soporta multi-tenant: usa /tenants/{tenantId}/bioPages cuando hay tenant activo
 */

import React, { createContext, useState, useContext, useEffect, useRef, ReactNode, useCallback } from 'react';
import {
    db,
    doc,
    getDoc,
} from '@/utils/compatData';
import { useAuth } from '../core/AuthContext';
import { useSafeTenant } from '../tenant';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { useSafeUndo } from '../undo/UndoContext';
import {
    createBioPageDraft,
    createDefaultBlocks,
    DEFAULT_BIO_PROFILE,
    DEFAULT_BIO_THEME,
    duplicateBioPageBlockDraft,
    duplicateBioPageLinkDraft,
    getBioPageByProject,
    normalizeBioSlug,
    prioritizeBioPageBlockDraft,
    prioritizeBioPageLinkDraft,
    publishBioPage as publishCanonicalBioPage,
    unpublishBioPage as unpublishCanonicalBioPage,
    updateBioPageDraft,
} from '../../services/bioPage';
import type { BioPageBlock, BioPageSEO, BioPageSettings } from '../../services/bioPage';

export interface BioPageUndoState {
    links: BioLink[];
    blocks: BioPageBlock[];
    profile: BioProfile;
    theme: BioTheme;
    products: BioProduct[];
    emailSignupEnabled: boolean;
    slug: string;
    seo: BioPageSEO;
    settings: BioPageSettings;
}

export interface BioPagePublishResult {
    ok: boolean;
    error?: string;
}

// Helper to get the correct projects collection path
// Returns tenant path if tenantId provided (and not a personal tenant), otherwise user path
const getProjectsCollectionPath = (userId: string, tenantId?: string | null): string[] => {
    const isPersonalTenant = tenantId && tenantId.startsWith(`tenant_${userId}`);
    if (tenantId && !isPersonalTenant) {
        return ['tenants', tenantId, 'projects'];
    }
    return ['users', userId, 'projects'];
};

// =============================================================================
// TYPES
// =============================================================================

export interface BioLink {
    id: string;
    title: string;
    url: string;
    enabled: boolean;
    clicks: number;
    linkType?: 'link' | 'external' | 'internal' | 'collection' | 'product' | 'form' | 'lead_form' | 'email_subscribe' | 'social' | 'embed' | 'video' | 'file' | 'booking' | 'chatbot';
    platform?: string;
    icon?: string;
    thumbnail?: string;
    imageUrl?: string;
    description?: string;
    order?: number;
    openInNewTab?: boolean;
    visible?: boolean;
    clickTrackingEnabled?: boolean;
    needsReview?: boolean;
    generatedByAI?: boolean;
    userModified?: boolean;
    lockedFromRegeneration?: boolean;
    metadata?: Record<string, unknown>;
}

export interface BioProfile {
    name: string;
    displayName?: string;
    handle?: string;
    bio: string;
    avatarUrl?: string;
    coverImageUrl?: string;
    category?: string;
    location?: string;
    logoUrl?: string; // Logo to display instead of text name when titleStyle is 'logo'
    verifiedBadgeEnabled?: boolean;
}

export interface BioTheme {
    preset: string;
    backgroundColor: string;
    backgroundType: 'solid' | 'gradient' | 'blur' | 'pattern' | 'image' | 'video' | 'glass';
    backgroundGradient?: string;
    gradientColor?: string;
    backgroundImage?: string;
    backgroundVideo?: string;
    backgroundPattern?: string;
    patternColor?: string;
    patternSize?: number;
    buttonStyle: 'fill' | 'solid' | 'outline' | 'soft' | 'glass' | 'shadow';
    buttonShape: 'square' | 'rounded' | 'rounder' | 'pill' | 'full' | 'lg' | 'xl';
    buttonShadow: 'none' | 'soft' | 'strong' | 'hard';
    buttonColor: string;
    buttonTextColor: string;
    textColor: string;
    titleFont: string;
    titleColor: string;
    bodyFont: string;
    bodyColor: string;
    // Profile/Header settings
    profileLayout: 'circle' | 'hero';
    profileSize: 'small' | 'large';
    titleStyle: 'text' | 'logo' | 'both';
    headerOverlay?: boolean; // Gradient overlay behind profile for better contrast
    headerOverlayColor?: string; // Custom color for the overlay
    // Profile Box (card behind name/bio)
    profileBox?: boolean;
    profileBoxColor?: string;
    profileBoxRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export interface BioProduct {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    url: string;
    slug?: string;
    status?: string;
    categoryId?: string;
    categoryName?: string;
    categorySlug?: string;
}

export interface BioPageData {
    id: string;
    projectId?: string;
    tenantId?: string | null;
    userId?: string | null;
    username: string;
    slug?: string;
    title?: string;
    description?: string;
    profile: BioProfile;
    theme: BioTheme;
    links: BioLink[];
    blocks: BioPageBlock[];
    products: BioProduct[];
    emailSignupEnabled: boolean;
    isPublished: boolean;
    status?: 'draft' | 'published' | 'archived';
    seo?: BioPageSEO;
    settings?: BioPageSettings;
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string | null;
}

// Default values
const DEFAULT_PROFILE: BioProfile = DEFAULT_BIO_PROFILE;
const DEFAULT_THEME: BioTheme = DEFAULT_BIO_THEME as BioTheme;

// =============================================================================
// CONTEXT TYPE
// =============================================================================

interface BioPageContextType {
    // State
    bioPage: BioPageData | null;
    isLoading: boolean;
    isSaving: boolean;
    hasUnsavedChanges: boolean;

    // Bio Page Operations
    loadBioPage: (projectId: string) => Promise<void>;
    createBioPage: (projectId: string, username: string) => Promise<string>;
    saveBioPage: () => Promise<void>;

    // Link Operations
    links: BioLink[];
    addLink: (link: Partial<BioLink>) => void;
    updateLink: (linkId: string, updates: Partial<BioLink>) => void;
    deleteLink: (linkId: string) => void;
    reorderLinks: (linkIds: string[]) => void;
    toggleLink: (linkId: string) => void;
    duplicateLink: (linkId: string) => void;
    prioritizeLink: (linkId: string) => void;

    // Block Operations
    blocks: BioPageBlock[];
    addBlock: (block: Partial<BioPageBlock> & Pick<BioPageBlock, 'type'>) => void;
    updateBlock: (blockId: string, updates: Partial<BioPageBlock>) => void;
    deleteBlock: (blockId: string) => void;
    reorderBlocks: (blockIds: string[]) => void;
    toggleBlock: (blockId: string) => void;
    duplicateBlock: (blockId: string) => void;
    prioritizeBlock: (blockId: string) => void;

    // Profile Operations
    profile: BioProfile;
    updateProfile: (updates: Partial<BioProfile>) => void;

    // Theme Operations
    theme: BioTheme;
    updateTheme: (updates: Partial<BioTheme>) => void;

    // Products
    products: BioProduct[];
    setProducts: React.Dispatch<React.SetStateAction<BioProduct[]>>;

    // Settings
    emailSignupEnabled: boolean;
    setEmailSignupEnabled: (enabled: boolean) => void;
    slug: string;
    updateSlug: (value: string) => void;
    seo: BioPageSEO;
    updateSEO: (updates: Partial<BioPageSEO>) => void;
    settings: BioPageSettings;
    updateSettings: (updates: Partial<BioPageSettings>) => void;

    // Publish
    publishBioPage: () => Promise<BioPagePublishResult>;
    unpublishBioPage: () => Promise<boolean>;

    // Undo support
    pushBioPageUndoAction: (description: string, newState: BioPageUndoState, prevState?: BioPageUndoState) => void;
    getCurrentBioPageState: () => BioPageUndoState;
}

const BioPageContext = createContext<BioPageContextType | undefined>(undefined);

// =============================================================================
// HELPERS
// =============================================================================

// =============================================================================
// PROVIDER
// =============================================================================

export const BioPageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const tenantContext = useSafeTenant();
    const currentTenantId = tenantContext?.currentTenant?.id || null;

    // State
    const [bioPage, setBioPage] = useState<BioPageData | null>(null);
    const bioPageRef = useRef<BioPageData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Editable state (local until saved)
    const [links, setLinks] = useState<BioLink[]>([]);
    const [blocks, setBlocks] = useState<BioPageBlock[]>([]);
    const [profile, setProfile] = useState<BioProfile>(DEFAULT_PROFILE);
    const [theme, setTheme] = useState<BioTheme>(DEFAULT_THEME);
    const [products, setProducts] = useState<BioProduct[]>([]);
    const [emailSignupEnabled, setEmailSignupEnabled] = useState(false);
    const [slug, setSlug] = useState('');
    const [seo, setSeo] = useState<BioPageSEO>({});
    const [settings, setSettings] = useState<BioPageSettings>({});

    // Auto-save ref
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialLoadRef = useRef(true);
    // Prevent re-marking unsaved after save
    const postSaveProtectionRef = useRef(false);

    useEffect(() => {
        bioPageRef.current = bioPage;
    }, [bioPage]);

    // Helper to safely mark unsaved changes (respects post-save protection)
    const markUnsaved = useCallback(() => {
        if (!postSaveProtectionRef.current && !isInitialLoadRef.current) {
            setHasUnsavedChanges(true);
        }
    }, []);

    // ==========================================================================
    // UNDO / REDO INTEGRATION
    // ==========================================================================
    const { registerModule, unregisterModule } = useSafeUndo() || {};

    const restoreBioPageState = useCallback((state: BioPageUndoState) => {
        setLinks(state.links);
        setBlocks(state.blocks);
        setProfile(state.profile);
        setTheme(state.theme);
        setProducts(state.products);
        setEmailSignupEnabled(state.emailSignupEnabled);
        setSlug(state.slug);
        setSeo(state.seo);
        setSettings(state.settings);
        markUnsaved();
    }, [markUnsaved]);

    const { pushAction, undo, redo, canUndo, canRedo, lastActionDescription, clear: clearHistory } = useUndoRedo<BioPageUndoState>({
        moduleId: 'bio-page',
        maxHistory: 50,
        onUndo: (action) => restoreBioPageState(action.previousState),
        onRedo: (action) => restoreBioPageState(action.newState),
    });

    const undoStateRef = useRef({ canUndo, canRedo, lastActionDescription });
    useEffect(() => {
        undoStateRef.current = { canUndo, canRedo, lastActionDescription };
    }, [canUndo, canRedo, lastActionDescription]);

    useEffect(() => {
        if (registerModule) {
            registerModule('bio-page', {
                undo,
                redo,
                canUndo: () => undoStateRef.current.canUndo,
                canRedo: () => undoStateRef.current.canRedo,
                getLastActionDescription: () => undoStateRef.current.lastActionDescription
            });
            return () => {
                if (unregisterModule) unregisterModule('bio-page');
            };
        }
    }, [registerModule, unregisterModule, undo, redo]);

    const getCurrentBioPageState = useCallback((): BioPageUndoState => {
        return { links, blocks, profile, theme, products, emailSignupEnabled, slug, seo, settings };
    }, [links, blocks, profile, theme, products, emailSignupEnabled, slug, seo, settings]);

    const pushBioPageUndoAction = useCallback((description: string, newState: BioPageUndoState, prevState?: BioPageUndoState) => {
        pushAction({
            type: 'BIOPAGE_CHANGE',
            description,
            previousState: prevState || getCurrentBioPageState(),
            newState
        });
    }, [pushAction, getCurrentBioPageState]);

    // Load bio page for a project
    const loadBioPage = useCallback(async (projectId: string) => {
        if (!user) return;

        setIsLoading(true);
        try {
            const data = await getBioPageByProject(projectId);

            if (data) {
                setBioPage(data);
                bioPageRef.current = data;
                setLinks(data.links || []);
                setBlocks(data.blocks || createDefaultBlocks({ links: data.links || [], profile: data.profile || DEFAULT_PROFILE, settings: data.settings }));
                setProfile(data.profile || DEFAULT_PROFILE);
                setTheme(data.theme || DEFAULT_THEME);
                setProducts(data.products || []);
                setEmailSignupEnabled(data.emailSignupEnabled || false);
                setSlug(data.slug || data.username || '');
                setSeo(data.seo || {});
                setSettings(data.settings || {});
                console.log('[BioPageContext] Loaded bio page:', data.slug || data.username);
            } else {
                // No bio page exists for this project - reset to defaults
                console.log('[BioPageContext] No bio page found for project:', projectId);
                setBioPage(null);
                bioPageRef.current = null;
                setLinks([]);
                setBlocks(createDefaultBlocks({ links: [], profile: DEFAULT_PROFILE, settings: {} }));
                setProfile(DEFAULT_PROFILE);
                setTheme(DEFAULT_THEME);
                setProducts([]);
                setEmailSignupEnabled(false);
                setSlug('');
                setSeo({});
                setSettings({});
            }

            clearHistory(); // Clear history when loading a new page

            isInitialLoadRef.current = true;
            setTimeout(() => {
                isInitialLoadRef.current = false;
            }, 1000);
        } catch (error) {
            console.error('[BioPageContext] Error loading bio page:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user, currentTenantId]);

    // Create a new bio page
    const createBioPage = useCallback(async (projectId: string, username: string): Promise<string> => {
        if (!user) throw new Error('User not authenticated');

        const tenantId = currentTenantId && !currentTenantId.startsWith(`tenant_${user.id}`) ? currentTenantId : null;

        const newBioPage = await createBioPageDraft({
            projectId,
            tenantId,
            userId: user.id,
            slug: username,
            profile: DEFAULT_PROFILE,
            theme: DEFAULT_THEME,
            links: [],
            blocks: createDefaultBlocks({ links: [], profile: DEFAULT_PROFILE, settings: {} }),
            settings: {
                emailSignupEnabled: false,
                leadCaptureEnabled: false,
                chatbotEnabled: false,
                shopEnabled: false,
                bookingEnabled: false,
            },
        });

        setBioPage(newBioPage);
        bioPageRef.current = newBioPage;
        setLinks([]);
        setBlocks(newBioPage.blocks || []);
        setProfile(DEFAULT_PROFILE);
        setTheme(DEFAULT_THEME);
        setProducts([]);
        setEmailSignupEnabled(false);
        setSlug(newBioPage.slug || username);
        setSeo(newBioPage.seo || {});
        setSettings(newBioPage.settings || {});

        clearHistory(); // Clear history when creating a new page

        console.log('[BioPageContext] Created bio page:', username);
        return projectId;
    }, [user, currentTenantId]);

    // Save bio page
    const saveBioPage = useCallback(async () => {
        const currentBioPage = bioPageRef.current || bioPage;
        if (!user || !currentBioPage) return;

        setIsSaving(true);
        // Enable post-save protection
        postSaveProtectionRef.current = true;

        try {
            const nextSettings: BioPageSettings = {
                ...(currentBioPage.settings || {}),
                ...settings,
                emailSignupEnabled,
                leadCaptureEnabled: blocks.some(block => block.type === 'lead_form' && block.visible),
                chatbotEnabled: blocks.some(block => block.type === 'chatbot_cta' && block.visible),
                shopEnabled: blocks.some(block => ['product_grid', 'product_collection'].includes(block.type) && block.visible),
                bookingEnabled: blocks.some(block => block.type === 'booking' && block.visible),
            };
            const updatedData = await updateBioPageDraft({
                page: currentBioPage as any,
                slug: slug || currentBioPage.slug || currentBioPage.username,
                profile,
                theme,
                links,
                blocks,
                products,
                emailSignupEnabled,
                seo,
                settings: nextSettings,
            });

            setBioPage(updatedData);
            bioPageRef.current = updatedData;
            setLinks(updatedData.links || links);
            setBlocks(updatedData.blocks || blocks);
            setProfile(updatedData.profile || profile);
            setTheme(updatedData.theme || theme);
            setProducts(updatedData.products || products);
            setEmailSignupEnabled(updatedData.emailSignupEnabled || false);
            setSlug(updatedData.slug || updatedData.username || slug);
            setSeo(updatedData.seo || seo);
            setSettings(updatedData.settings || nextSettings);
            setHasUnsavedChanges(false);

            console.log('[BioPageContext] Saved bio page');

            // Disable protection after a short delay
            setTimeout(() => {
                postSaveProtectionRef.current = false;
            }, 500);
        } catch (error) {
            console.error('[BioPageContext] Error saving bio page:', error);
            postSaveProtectionRef.current = false;
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [user, bioPage, profile, theme, links, blocks, products, emailSignupEnabled, slug, seo, settings, currentTenantId]);

    // ==========================================================================
    // LINK OPERATIONS
    // ==========================================================================

    const addLink = useCallback((linkData: Partial<BioLink>) => {
        const newLink: BioLink = {
            id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `link_${Date.now()}`,
            title: linkData.title || 'New Link',
            url: linkData.url || '',
            enabled: true,
            clicks: 0,
            linkType: linkData.linkType || 'link',
            platform: linkData.platform,
            order: linkData.order ?? 0,
            ...linkData,
        };

        const newLinks = [
            { ...newLink, order: 0 },
            ...links.map((link, index) => ({ ...link, order: index + 1 })),
        ];
        setLinks(newLinks);

        pushBioPageUndoAction('Añadió un enlace', { ...getCurrentBioPageState(), links: newLinks });
        markUnsaved();
    }, [links, markUnsaved, pushBioPageUndoAction, getCurrentBioPageState]);

    const updateLink = useCallback((linkId: string, updates: Partial<BioLink>) => {
        setLinks(prev => prev.map(link =>
            link.id === linkId ? { ...link, ...updates, userModified: true } : link
        ));
        markUnsaved();
    }, [markUnsaved]);

    const deleteLink = useCallback((linkId: string) => {
        const newLinks = links.filter(link => link.id !== linkId);
        setLinks(newLinks);
        pushBioPageUndoAction('Eliminó un enlace', { ...getCurrentBioPageState(), links: newLinks });
        markUnsaved();
    }, [links, markUnsaved, pushBioPageUndoAction, getCurrentBioPageState]);

    const reorderLinks = useCallback((linkIds: string[]) => {
        const linkMap = new Map(links.map(link => [link.id, link]));
        const newLinks = linkIds.map((id, index) => {
            const link = linkMap.get(id);
            return link ? { ...link, order: index } : null;
        }).filter(Boolean) as BioLink[];

        setLinks(newLinks);
        pushBioPageUndoAction('Reordenó los enlaces', { ...getCurrentBioPageState(), links: newLinks });
        markUnsaved();
    }, [links, markUnsaved, pushBioPageUndoAction, getCurrentBioPageState]);

    const toggleLink = useCallback((linkId: string) => {
        const newLinks = links.map(link =>
            link.id === linkId ? { ...link, enabled: !link.enabled } : link
        );
        setLinks(newLinks);
        pushBioPageUndoAction('Alternó visibilidad de enlace', { ...getCurrentBioPageState(), links: newLinks });
        markUnsaved();
    }, [links, markUnsaved, pushBioPageUndoAction, getCurrentBioPageState]);

    const duplicateLink = useCallback((linkId: string) => {
        if (!links.some(link => link.id === linkId)) return;
        const newLinks = duplicateBioPageLinkDraft(links, linkId);
        setLinks(newLinks);
        pushBioPageUndoAction('Duplicó un enlace', { ...getCurrentBioPageState(), links: newLinks });
        markUnsaved();
    }, [links, markUnsaved, pushBioPageUndoAction, getCurrentBioPageState]);

    const prioritizeLink = useCallback((linkId: string) => {
        if (!links.some(link => link.id === linkId)) return;
        const newLinks = prioritizeBioPageLinkDraft(links, linkId);
        setLinks(newLinks);
        pushBioPageUndoAction('Priorizó un enlace', { ...getCurrentBioPageState(), links: newLinks });
        markUnsaved();
    }, [links, markUnsaved, pushBioPageUndoAction, getCurrentBioPageState]);

    // ==========================================================================
    // BLOCK OPERATIONS
    // ==========================================================================

    const addBlock = useCallback((blockData: Partial<BioPageBlock> & Pick<BioPageBlock, 'type'>) => {
        const newBlock: BioPageBlock = {
            id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `block_${Date.now()}`,
            type: blockData.type,
            title: blockData.title || blockData.type.replace(/_/g, ' '),
            description: blockData.description,
            order: blocks.length,
            visible: blockData.visible !== false,
            status: blockData.status || 'draft',
            sourceModule: blockData.sourceModule || 'bio-page-engine',
            sourceEntityId: blockData.sourceEntityId,
            data: blockData.data || {},
            settings: blockData.settings || {},
            needsReview: blockData.needsReview,
            generatedByAI: blockData.generatedByAI,
            userModified: true,
            lockedFromRegeneration: blockData.lockedFromRegeneration,
        };
        const newBlocks = [...blocks, newBlock];
        setBlocks(newBlocks);
        pushBioPageUndoAction('Añadió un bloque', { ...getCurrentBioPageState(), blocks: newBlocks });
        markUnsaved();
    }, [blocks, getCurrentBioPageState, markUnsaved, pushBioPageUndoAction]);

    const updateBlock = useCallback((blockId: string, updates: Partial<BioPageBlock>) => {
        setBlocks(prev => prev.map(block =>
            block.id === blockId ? { ...block, ...updates, userModified: true } : block
        ));
        markUnsaved();
    }, [markUnsaved]);

    const deleteBlock = useCallback((blockId: string) => {
        const newBlocks = blocks.filter(block => block.id !== blockId).map((block, index) => ({ ...block, order: index }));
        setBlocks(newBlocks);
        pushBioPageUndoAction('Eliminó un bloque', { ...getCurrentBioPageState(), blocks: newBlocks });
        markUnsaved();
    }, [blocks, getCurrentBioPageState, markUnsaved, pushBioPageUndoAction]);

    const reorderBlocks = useCallback((blockIds: string[]) => {
        const blockMap = new Map(blocks.map(block => [block.id, block]));
        const newBlocks = blockIds.map((id, index) => {
            const block = blockMap.get(id);
            return block ? { ...block, order: index } : null;
        }).filter(Boolean) as BioPageBlock[];
        setBlocks(newBlocks);
        pushBioPageUndoAction('Reordenó los bloques', { ...getCurrentBioPageState(), blocks: newBlocks });
        markUnsaved();
    }, [blocks, getCurrentBioPageState, markUnsaved, pushBioPageUndoAction]);

    const toggleBlock = useCallback((blockId: string) => {
        const newBlocks = blocks.map(block =>
            block.id === blockId ? { ...block, visible: !block.visible, status: block.visible ? 'hidden' as const : 'configured' as const, userModified: true } : block
        );
        setBlocks(newBlocks);
        pushBioPageUndoAction('Alternó visibilidad de bloque', { ...getCurrentBioPageState(), blocks: newBlocks });
        markUnsaved();
    }, [blocks, getCurrentBioPageState, markUnsaved, pushBioPageUndoAction]);

    const duplicateBlock = useCallback((blockId: string) => {
        const source = blocks.find(block => block.id === blockId);
        if (!source || source.type === 'profile' || source.type === 'link') return;
        const newBlocks = duplicateBioPageBlockDraft(blocks, blockId);
        setBlocks(newBlocks);
        pushBioPageUndoAction('Duplicó un bloque', { ...getCurrentBioPageState(), blocks: newBlocks });
        markUnsaved();
    }, [blocks, getCurrentBioPageState, markUnsaved, pushBioPageUndoAction]);

    const prioritizeBlock = useCallback((blockId: string) => {
        if (!blocks.some(block => block.id === blockId)) return;
        const newBlocks = prioritizeBioPageBlockDraft(blocks, blockId);
        setBlocks(newBlocks);
        pushBioPageUndoAction('Priorizó un bloque', { ...getCurrentBioPageState(), blocks: newBlocks });
        markUnsaved();
    }, [blocks, getCurrentBioPageState, markUnsaved, pushBioPageUndoAction]);

    // ==========================================================================
    // PROFILE OPERATIONS
    // ==========================================================================

    const updateProfile = useCallback((updates: Partial<BioProfile>) => {
        setProfile(prev => ({ ...prev, ...updates }));
        markUnsaved();
    }, [markUnsaved]);

    // ==========================================================================
    // THEME OPERATIONS
    // ==========================================================================

    const updateTheme = useCallback((updates: Partial<BioTheme>) => {
        const newTheme = { ...theme, ...updates };
        setTheme(newTheme);
        pushBioPageUndoAction('Actualizó el tema visual', { ...getCurrentBioPageState(), theme: newTheme });
        markUnsaved();
    }, [theme, markUnsaved, pushBioPageUndoAction, getCurrentBioPageState]);

    // ==========================================================================
    // EMAIL SIGNUP
    // ==========================================================================

    const handleSetEmailSignupEnabled = useCallback((enabled: boolean) => {
        setEmailSignupEnabled(enabled);
        setSettings(prev => ({ ...prev, emailSignupEnabled: enabled }));
        pushBioPageUndoAction(enabled ? 'Habilitó captura de leads' : 'Deshabilitó captura de leads', { ...getCurrentBioPageState(), emailSignupEnabled: enabled });
        markUnsaved();
    }, [markUnsaved, pushBioPageUndoAction, getCurrentBioPageState]);

    const updateSlug = useCallback((value: string) => {
        const nextSlug = normalizeBioSlug(value);
        setSlug(nextSlug);
        setBioPage(prev => prev ? { ...prev, slug: nextSlug, username: nextSlug } : prev);
        markUnsaved();
    }, [markUnsaved]);

    const updateSEO = useCallback((updates: Partial<BioPageSEO>) => {
        setSeo(prev => ({ ...prev, ...updates }));
        markUnsaved();
    }, [markUnsaved]);

    const updateSettings = useCallback((updates: Partial<BioPageSettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
        markUnsaved();
    }, [markUnsaved]);

    // ==========================================================================
    // PUBLISH
    // ==========================================================================

    const publishBioPage = useCallback(async (): Promise<BioPagePublishResult> => {
        const currentBioPage = bioPageRef.current || bioPage;
        if (!user || !currentBioPage) return { ok: false, error: 'Bio Page is not ready to publish.' };

        try {
            // First save any pending changes
            await saveBioPage();

            // Fetch the project's aiAssistant config if projectId is available
            let aiAssistant = null;
            if (currentBioPage.projectId) {
                try {
                    // Try the correct projects collection path based on tenant
                    const projectPathSegments = getProjectsCollectionPath(user.id, currentTenantId);
                    const projectRef = doc(db, ...projectPathSegments, currentBioPage.projectId);
                    let projectSnap = await getDoc(projectRef);

                    // If not found, try the alternate path (in case project is stored in user path when using tenant)
                    if (!projectSnap.exists() && currentTenantId) {
                        console.log('[BioPageContext] Project not found in tenant path, trying user path...');
                        const userProjectRef = doc(db, 'users', user.id, 'projects', currentBioPage.projectId);
                        projectSnap = await getDoc(userProjectRef);
                    }

                    if (projectSnap.exists()) {
                        const projectData = projectSnap.data();
                        // Try both aiAssistant and aiAssistantConfig (different naming conventions)
                        aiAssistant = projectData?.aiAssistant || projectData?.aiAssistantConfig || null;
                        console.log('[BioPageContext] Found aiAssistant config:', !!aiAssistant);
                    } else {
                        console.warn('[BioPageContext] Project not found for aiAssistant:', currentBioPage.projectId);
                    }
                } catch (e) {
                    console.warn('[BioPageContext] Could not fetch aiAssistant:', e);
                }
            }

            const nextSettings: BioPageSettings = {
                ...(currentBioPage.settings || {}),
                ...settings,
                emailSignupEnabled,
                aiAssistant,
                chatbotEnabled: Boolean(aiAssistant) || blocks.some(block => block.type === 'chatbot_cta' && block.visible),
                leadCaptureEnabled: blocks.some(block => block.type === 'lead_form' && block.visible),
                shopEnabled: blocks.some(block => ['product_grid', 'product_collection'].includes(block.type) && block.visible),
                bookingEnabled: blocks.some(block => block.type === 'booking' && block.visible),
            };
            const updatedDraft = await updateBioPageDraft({
                page: currentBioPage as any,
                slug: slug || currentBioPage.slug || currentBioPage.username,
                profile,
                theme,
                links,
                blocks,
                products,
                emailSignupEnabled,
                seo,
                settings: nextSettings,
            });
            const published = await publishCanonicalBioPage(updatedDraft.id);

            setBioPage(published);
            bioPageRef.current = published;
            setLinks(published.links || links);
            setBlocks(published.blocks || blocks);
            setProfile(published.profile || profile);
            setTheme(published.theme || theme);
            setProducts(published.products || products);
            setEmailSignupEnabled(published.emailSignupEnabled || false);
            setSlug(published.slug || published.username || slug);
            setSeo(published.seo || seo);
            setSettings(published.settings || nextSettings);

            console.log('[BioPageContext] Published canonical bio page');
            return { ok: true };
        } catch (error) {
            console.error('[BioPageContext] Error publishing bio page:', error);
            return { ok: false, error: error instanceof Error ? error.message : 'Failed to publish Bio Page.' };
        }
    }, [user, bioPage, saveBioPage, currentTenantId, profile, theme, links, blocks, products, emailSignupEnabled, slug, seo, settings]);

    const unpublishBioPage = useCallback(async (): Promise<boolean> => {
        const currentBioPage = bioPageRef.current || bioPage;
        if (!user || !currentBioPage?.id) return false;

        try {
            await unpublishCanonicalBioPage(currentBioPage.id);
            const nextBioPage = {
                ...currentBioPage,
                isPublished: false,
                status: 'draft' as const,
                publishedAt: null,
            };
            setBioPage(nextBioPage);
            bioPageRef.current = nextBioPage;
            setHasUnsavedChanges(false);
            console.log('[BioPageContext] Unpublished canonical bio page');
            return true;
        } catch (error) {
            console.error('[BioPageContext] Error unpublishing bio page:', error);
            return false;
        }
    }, [bioPage, user]);

    // ==========================================================================
    // AUTO-SAVE EFFECT
    // ==========================================================================

    useEffect(() => {
        if (!bioPage || isInitialLoadRef.current || !hasUnsavedChanges) return;

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(() => {
            saveBioPage().catch(console.error);
        }, 2000);

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [links, blocks, profile, theme, products, emailSignupEnabled, slug, seo, settings, bioPage, hasUnsavedChanges, saveBioPage]);

    // ==========================================================================
    // CONTEXT VALUE
    // ==========================================================================

    const value: BioPageContextType = {
        bioPage,
        isLoading,
        isSaving,
        hasUnsavedChanges,

        loadBioPage,
        createBioPage,
        saveBioPage,

        links,
        addLink,
        updateLink,
        deleteLink,
        reorderLinks,
        toggleLink,
        duplicateLink,
        prioritizeLink,

        blocks,
        addBlock,
        updateBlock,
        deleteBlock,
        reorderBlocks,
        toggleBlock,
        duplicateBlock,
        prioritizeBlock,

        profile,
        updateProfile,

        theme,
        updateTheme,

        products,
        setProducts,

        emailSignupEnabled,
        setEmailSignupEnabled: handleSetEmailSignupEnabled,
        slug,
        updateSlug,
        seo,
        updateSEO,
        settings,
        updateSettings,

        publishBioPage,
        unpublishBioPage,

        pushBioPageUndoAction,
        getCurrentBioPageState,
    };

    return (
        <BioPageContext.Provider value={value}>
            {children}
        </BioPageContext.Provider>
    );
};

// =============================================================================
// HOOKS
// =============================================================================

export const useBioPage = (): BioPageContextType => {
    const context = useContext(BioPageContext);
    if (!context) {
        throw new Error('useBioPage must be used within a BioPageProvider');
    }
    return context;
};

export const useSafeBioPage = (): BioPageContextType | null => {
    return useContext(BioPageContext) || null;
};

export default BioPageContext;
