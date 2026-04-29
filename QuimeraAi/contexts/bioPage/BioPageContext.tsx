/**
 * BioPageContext
 * Maneja Bio Pages (Link in Bio) con persistencia en Firestore
 * Soporta multi-tenant: usa /tenants/{tenantId}/bioPages cuando hay tenant activo
 */

import React, { createContext, useState, useContext, useEffect, useRef, ReactNode, useCallback } from 'react';
import {
    db,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    getDocs,
    query,
    orderBy,
    serverTimestamp,
} from '../../firebase';
import { useAuth } from '../core/AuthContext';
import { useSafeTenant } from '../tenant';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { useSafeUndo } from '../undo/UndoContext';

export interface BioPageUndoState {
    links: BioLink[];
    profile: BioProfile;
    theme: BioTheme;
    products: BioProduct[];
    emailSignupEnabled: boolean;
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
    linkType?: 'link' | 'collection' | 'product' | 'form' | 'social' | 'embed' | 'chatbot';
    platform?: string;
    icon?: string;
    thumbnail?: string;
    order?: number;
}

export interface BioProfile {
    name: string;
    bio: string;
    avatarUrl?: string;
    logoUrl?: string; // Logo to display instead of text name when titleStyle is 'logo'
}

export interface BioTheme {
    preset: string;
    backgroundColor: string;
    backgroundType: 'solid' | 'gradient' | 'blur' | 'pattern' | 'image' | 'video';
    backgroundGradient?: string;
    gradientColor?: string;
    backgroundImage?: string;
    backgroundVideo?: string;
    backgroundPattern?: string;
    patternColor?: string;
    patternSize?: number;
    buttonStyle: 'fill' | 'outline' | 'soft' | 'glass';
    buttonShape: 'square' | 'rounded' | 'rounder' | 'pill';
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
}

export interface BioPageData {
    id: string;
    projectId?: string;
    username: string;
    profile: BioProfile;
    theme: BioTheme;
    links: BioLink[];
    products: BioProduct[];
    emailSignupEnabled: boolean;
    isPublished: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// Default values
const DEFAULT_PROFILE: BioProfile = {
    name: '',
    bio: '',
    avatarUrl: '',
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

    // Publish
    publishBioPage: () => Promise<boolean>;

    // Undo support
    pushBioPageUndoAction: (description: string, newState: BioPageUndoState, prevState?: BioPageUndoState) => void;
    getCurrentBioPageState: () => BioPageUndoState;
}

const BioPageContext = createContext<BioPageContextType | undefined>(undefined);

// =============================================================================
// HELPERS
// =============================================================================

// Helper to get the correct bioPages collection path
const getBioPagesCollectionPath = (userId: string, tenantId?: string | null): string[] => {
    const isPersonalTenant = tenantId && tenantId.startsWith(`tenant_${userId}`);

    if (tenantId && !isPersonalTenant) {
        return ['tenants', tenantId, 'bioPages'];
    }
    return ['users', userId, 'bioPages'];
};

// Helper to remove undefined values (Firestore doesn't accept undefined)
const removeUndefinedValues = <T extends Record<string, any>>(obj: T): Partial<T> => {
    const result: Partial<T> = {};
    for (const key of Object.keys(obj) as (keyof T)[]) {
        if (obj[key] !== undefined) {
            result[key] = obj[key];
        }
    }
    return result;
};

// =============================================================================
// PROVIDER
// =============================================================================

export const BioPageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const tenantContext = useSafeTenant();
    const currentTenantId = tenantContext?.currentTenant?.id || null;

    // State
    const [bioPage, setBioPage] = useState<BioPageData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Editable state (local until saved)
    const [links, setLinks] = useState<BioLink[]>([]);
    const [profile, setProfile] = useState<BioProfile>(DEFAULT_PROFILE);
    const [theme, setTheme] = useState<BioTheme>(DEFAULT_THEME);
    const [products, setProducts] = useState<BioProduct[]>([]);
    const [emailSignupEnabled, setEmailSignupEnabled] = useState(false);

    // Auto-save ref
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialLoadRef = useRef(true);
    // Prevent re-marking unsaved after save
    const postSaveProtectionRef = useRef(false);

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
        setProfile(state.profile);
        setTheme(state.theme);
        setProducts(state.products);
        setEmailSignupEnabled(state.emailSignupEnabled);
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
        return { links, profile, theme, products, emailSignupEnabled };
    }, [links, profile, theme, products, emailSignupEnabled]);

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
            const pathSegments = getBioPagesCollectionPath(user.uid, currentTenantId);
            const bioPageRef = doc(db, ...pathSegments, projectId);
            const bioPageSnap = await getDoc(bioPageRef);

            if (bioPageSnap.exists()) {
                const data = { id: bioPageSnap.id, ...bioPageSnap.data() } as BioPageData;
                setBioPage(data);
                setLinks(data.links || []);
                setProfile(data.profile || DEFAULT_PROFILE);
                setTheme(data.theme || DEFAULT_THEME);
                setProducts(data.products || []);
                setEmailSignupEnabled(data.emailSignupEnabled || false);
                console.log('[BioPageContext] Loaded bio page:', data.username);
            } else {
                // No bio page exists for this project - reset to defaults
                console.log('[BioPageContext] No bio page found for project:', projectId);
                setBioPage(null);
                setLinks([]);
                setProfile(DEFAULT_PROFILE);
                setTheme(DEFAULT_THEME);
                setProducts([]);
                setEmailSignupEnabled(false);
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

        const pathSegments = getBioPagesCollectionPath(user.uid, currentTenantId);
        const bioPageRef = doc(db, ...pathSegments, projectId);

        const newBioPage: BioPageData = {
            id: projectId,
            projectId,
            username,
            profile: DEFAULT_PROFILE,
            theme: DEFAULT_THEME,
            links: [],
            products: [],
            emailSignupEnabled: false,
            isPublished: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await setDoc(bioPageRef, removeUndefinedValues(newBioPage));

        setBioPage(newBioPage);
        setLinks([]);
        setProfile(DEFAULT_PROFILE);
        setTheme(DEFAULT_THEME);
        setProducts([]);
        setEmailSignupEnabled(false);

        clearHistory(); // Clear history when creating a new page

        console.log('[BioPageContext] Created bio page:', username);
        return projectId;
    }, [user, currentTenantId]);

    // Save bio page
    const saveBioPage = useCallback(async () => {
        if (!user || !bioPage) return;

        setIsSaving(true);
        // Enable post-save protection
        postSaveProtectionRef.current = true;

        try {
            const pathSegments = getBioPagesCollectionPath(user.uid, currentTenantId);
            const bioPageRef = doc(db, ...pathSegments, bioPage.id);

            const updatedData = removeUndefinedValues({
                profile,
                theme,
                links,
                products,
                emailSignupEnabled,
                updatedAt: new Date().toISOString(),
            });

            await updateDoc(bioPageRef, updatedData);

            setBioPage(prev => prev ? { ...prev, ...updatedData } : null);
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
    }, [user, bioPage, profile, theme, links, products, emailSignupEnabled, currentTenantId]);

    // ==========================================================================
    // LINK OPERATIONS
    // ==========================================================================

    const addLink = useCallback((linkData: Partial<BioLink>) => {
        const newLink: BioLink = {
            id: Date.now().toString(),
            title: linkData.title || 'New Link',
            url: linkData.url || '',
            enabled: true,
            clicks: 0,
            linkType: linkData.linkType || 'link',
            platform: linkData.platform,
            order: links.length,
            ...linkData,
        };

        const newLinks = [newLink, ...links];
        setLinks(newLinks);
        
        pushBioPageUndoAction('Añadió un enlace', { ...getCurrentBioPageState(), links: newLinks });
        markUnsaved();
    }, [links, markUnsaved, pushBioPageUndoAction, getCurrentBioPageState]);

    const updateLink = useCallback((linkId: string, updates: Partial<BioLink>) => {
        setLinks(prev => prev.map(link =>
            link.id === linkId ? { ...link, ...updates } : link
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
        pushBioPageUndoAction(enabled ? 'Habilitó captura de leads' : 'Deshabilitó captura de leads', { ...getCurrentBioPageState(), emailSignupEnabled: enabled });
        markUnsaved();
    }, [markUnsaved, pushBioPageUndoAction, getCurrentBioPageState]);

    // ==========================================================================
    // PUBLISH
    // ==========================================================================

    const publishBioPage = useCallback(async (): Promise<boolean> => {
        if (!user || !bioPage) return false;

        try {
            // First save any pending changes
            await saveBioPage();

            // Update isPublished flag in user's bio page
            const pathSegments = getBioPagesCollectionPath(user.uid, currentTenantId);
            const bioPageRef = doc(db, ...pathSegments, bioPage.id);

            await updateDoc(bioPageRef, {
                isPublished: true,
                updatedAt: new Date().toISOString(),
            });

            // Fetch the project's aiAssistant config if projectId is available
            let aiAssistant = null;
            if (bioPage.projectId) {
                try {
                    // Try the correct projects collection path based on tenant
                    const projectPathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
                    const projectRef = doc(db, ...projectPathSegments, bioPage.projectId);
                    let projectSnap = await getDoc(projectRef);

                    // If not found, try the alternate path (in case project is stored in user path when using tenant)
                    if (!projectSnap.exists() && currentTenantId) {
                        console.log('[BioPageContext] Project not found in tenant path, trying user path...');
                        const userProjectRef = doc(db, 'users', user.uid, 'projects', bioPage.projectId);
                        projectSnap = await getDoc(userProjectRef);
                    }

                    if (projectSnap.exists()) {
                        const projectData = projectSnap.data();
                        // Try both aiAssistant and aiAssistantConfig (different naming conventions)
                        aiAssistant = projectData?.aiAssistant || projectData?.aiAssistantConfig || null;
                        console.log('[BioPageContext] Found aiAssistant config:', !!aiAssistant);
                    } else {
                        console.warn('[BioPageContext] Project not found for aiAssistant:', bioPage.projectId);
                    }
                } catch (e) {
                    console.warn('[BioPageContext] Could not fetch aiAssistant:', e);
                }
            }

            // Create/update public bio page for anonymous access
            // Using username as the document ID for direct URL access
            const publicBioRef = doc(db, 'publicBioPages', bioPage.username.toLowerCase());

            const publicBioData: Record<string, any> = {
                username: bioPage.username.toLowerCase(),
                profile: removeUndefinedValues(bioPage.profile),
                theme: removeUndefinedValues(bioPage.theme),
                links: bioPage.links.map(l => removeUndefinedValues(l)),
                emailSignupEnabled: emailSignupEnabled,
                isPublished: true,
                ownerId: user.uid,
                tenantId: currentTenantId || null,
                projectId: bioPage.projectId || bioPage.id,
                updatedAt: new Date().toISOString(),
            };

            // Include aiAssistant if available
            if (aiAssistant) {
                publicBioData.aiAssistant = aiAssistant;
            }

            await setDoc(publicBioRef, publicBioData, { merge: true });

            setBioPage(prev => prev ? { ...prev, isPublished: true } : null);

            console.log('[BioPageContext] Published bio page to publicBioPages collection');
            return true;
        } catch (error) {
            console.error('[BioPageContext] Error publishing bio page:', error);
            return false;
        }
    }, [user, bioPage, saveBioPage, currentTenantId]);

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
    }, [links, profile, theme, products, emailSignupEnabled, bioPage, hasUnsavedChanges, saveBioPage]);

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

        profile,
        updateProfile,

        theme,
        updateTheme,

        products,
        setProducts,

        emailSignupEnabled,
        setEmailSignupEnabled: handleSetEmailSignupEnabled,

        publishBioPage,

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
