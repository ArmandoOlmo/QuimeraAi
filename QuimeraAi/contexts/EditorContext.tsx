
import React, { createContext, useState, useContext, ReactNode, useRef, useEffect } from 'react';
import { PageData, ThemeData, PageSection, PreviewDevice, PreviewOrientation, View, Project, ThemeMode, UserDocument, UserPreferences, FileRecord, LLMPrompt, ComponentStyles, EditableComponentID, CustomComponent, BrandIdentity, CMSPost, Menu, AdminView, AiAssistantConfig, GlobalAssistantConfig, Lead, LeadStatus, LeadActivity, LeadTask, ActivityType, Domain, DeploymentLog, Tenant, TenantStatus, TenantLimits, UserRole, RolePermissions, SEOConfig, ComponentVariant, ComponentVersion, DesignTokens, LibraryLead } from '../types';
import { EmailSettings, TransactionalEmailSettings, MarketingEmailSettings } from '../types/email';
import { useUI } from './core/UIContext';
import { useSafeProject } from './project/ProjectContext';
import { getPermissions, isOwner, determineRole, OWNER_EMAIL } from '../constants/roles';
import { initialData } from '../data/initialData';
import { defaultPrompts } from '../data/defaultPrompts';
import { componentStyles as defaultComponentStyles } from '../data/componentStyles';
import {
    auth,
    db,
    storage,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    getDocs,
    query,
    orderBy,
    onAuthStateChanged,
    User,
    updateProfile,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    listAll,
    addDoc,
    serverTimestamp,
    onSnapshot
} from '../firebase';
import { Modality } from '@google/genai';
import { getGoogleGenAI, syncApiKeyFromAiStudio, setCachedApiKey, fetchGoogleApiKey, getCachedApiKey } from '../utils/genAiClient';
import { generateImageViaProxy, generateContentViaProxy, extractTextFromResponse, shouldUseProxy } from '../utils/geminiProxyClient';
import { deploymentService } from '../utils/deploymentService';
import { logApiCall } from '../services/apiLoggingService';
import { router } from '../hooks/useRouter';


// Helper to generate HTML. This is a simplification.
const generateHtml = (project: Project) => {
    // This is a very basic HTML export. A real implementation would be more complex.
    const googleFonts = [project.theme.fontFamilyHeader, project.theme.fontFamilyBody, project.theme.fontFamilyButton]
        .filter((v, i, a) => a.indexOf(v) === i) // unique
        .map(font => {
            const f = font.replace(/\s/g, '+');
            return `family=${f}`;
        })
        .join('&');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?${googleFonts}&display=swap" rel="stylesheet">
    <style>
        /* A real implementation would inline the rendered CSS of the components */
        /* This is a placeholder */
        body { font-family: '${project.theme.fontFamilyBody}', sans-serif; }
        h1, h2, h3, h4, h5, h6 { font-family: '${project.theme.fontFamilyHeader}', sans-serif; }
        button, a, input[type="submit"] { font-family: '${project.theme.fontFamilyButton}', sans-serif; }
    </style>
</head>
<body>
    <div id="root">
        <h1>${project.data.hero.headline.replace(/<.*?>/g, '')}</h1>
        <p>This is a simplified HTML export. The full page content would be rendered here.</p>
    </div>
</body>
</html>`;
};


interface EditorContextType {
    isSidebarOpen: boolean;
    setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isDashboardSidebarCollapsed: boolean;
    toggleDashboardSidebar: () => void;
    view: View;
    setView: React.Dispatch<React.SetStateAction<View>>;
    previewRef: React.RefObject<HTMLDivElement>;
    activeProjectId: string | null;
    activeProject: Project | null;
    projects: Project[];
    isLoadingProjects: boolean;
    loadProject: (projectId: string, fromAdmin?: boolean, navigateToEditor?: boolean, projectOverride?: Project) => void;
    data: PageData | null;
    setData: React.Dispatch<React.SetStateAction<PageData | null>>;
    theme: ThemeData;
    setTheme: React.Dispatch<React.SetStateAction<ThemeData>>;
    brandIdentity: BrandIdentity;
    setBrandIdentity: React.Dispatch<React.SetStateAction<BrandIdentity>>;
    componentOrder: PageSection[];
    setComponentOrder: React.Dispatch<React.SetStateAction<PageSection[]>>;
    sectionVisibility: Record<PageSection, boolean>;
    setSectionVisibility: React.Dispatch<React.SetStateAction<Record<PageSection, boolean>>>;
    activeSection: PageSection | null;
    onSectionSelect: (section: PageSection) => void;
    previewDevice: PreviewDevice;
    setPreviewDevice: React.Dispatch<React.SetStateAction<PreviewDevice>>;
    previewOrientation: PreviewOrientation;
    setPreviewOrientation: React.Dispatch<React.SetStateAction<PreviewOrientation>>;
    user: User | null;
    loadingAuth: boolean;
    userDocument: UserDocument | null;
    setUserDocument: React.Dispatch<React.SetStateAction<UserDocument | null>>;
    verificationEmail: string | null;
    setVerificationEmail: React.Dispatch<React.SetStateAction<string | null>>;
    isProfileModalOpen: boolean;
    openProfileModal: () => void;
    closeProfileModal: () => void;
    renameActiveProject: (newName: string) => Promise<void>;
    updateProjectThumbnail: (projectId: string, file: File) => Promise<void>;
    updateProjectFavicon: (projectId: string, file: File) => Promise<void>;
    exportProjectAsHtml: () => void;
    saveProject: () => Promise<void>;
    createProjectFromTemplate: (templateId: string, newName?: string) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
    addNewProject: (project: Project) => Promise<string | void>;
    themeMode: ThemeMode;
    setThemeMode: React.Dispatch<React.SetStateAction<ThemeMode>>;
    files: FileRecord[];
    isFilesLoading: boolean;
    uploadFile: (file: File) => Promise<string | undefined>;
    deleteFile: (fileId: string, storagePath: string) => Promise<void>;
    updateFileNotes: (fileId: string, notes: string) => Promise<void>;
    generateFileSummary: (fileId: string, downloadURL: string) => Promise<void>;
    uploadImageAndGetURL: (file: File, path: string) => Promise<string>;
    generateImage: (prompt: string, options?: {
        aspectRatio?: string,
        style?: string,
        destination?: 'user' | 'global',
        resolution?: '1K' | '2K' | '4K',
        // Quimera AI model options
        model?: string,
        thinkingLevel?: string,
        personGeneration?: string,
        temperature?: number,
        negativePrompt?: string,
        // Visual controls
        lighting?: string,
        cameraAngle?: string,
        colorGrading?: string,
        themeColors?: string,
        depthOfField?: string,
        referenceImage?: string,
        referenceImages?: string[]
    }) => Promise<string>;
    generateProjectImagesWithProgress: (
        project: Project,
        imagePrompts: Record<string, string>,
        onProgress: (current: number, total: number, section: string, imageUrl?: string) => void
    ) => Promise<{ success: boolean; generatedImages: Record<string, string>; failedPaths: string[] }>;
    enhancePrompt: (draftPrompt: string, referenceImages?: string[]) => Promise<string>;

    // Global File Management (Super Admin)
    globalFiles: FileRecord[];
    isGlobalFilesLoading: boolean;
    fetchGlobalFiles: () => Promise<void>;
    uploadGlobalFile: (file: File) => Promise<void>;
    deleteGlobalFile: (fileId: string, storagePath: string) => Promise<void>;

    // Super Admin
    adminView: AdminView;
    setAdminView: React.Dispatch<React.SetStateAction<AdminView>>;
    allUsers: UserDocument[];
    fetchAllUsers: () => Promise<void>;
    updateUserRole: (userId: string, role: UserRole) => Promise<void>;
    deleteUserRecord: (userId: string) => Promise<void>;

    // Sistema de permisos
    userPermissions: RolePermissions;
    canPerform: (permission: keyof RolePermissions) => boolean;
    isUserOwner: boolean;

    // Gestión de administradores
    createAdmin: (email: string, name: string, role: UserRole) => Promise<void>;
    updateUserProfile: (name: string, photoURL: string) => Promise<void>;
    updateUserDetails: (userId: string, data: Partial<UserDocument>) => Promise<void>;

    // Tenant Management
    tenants: Tenant[];
    fetchTenants: () => Promise<void>;
    createTenant: (data: { type: 'individual' | 'agency'; name: string; email: string; plan: string; companyName?: string }) => Promise<string>;
    updateTenant: (tenantId: string, data: Partial<Tenant>) => Promise<void>;
    deleteTenant: (tenantId: string) => Promise<void>;
    updateTenantStatus: (tenantId: string, status: TenantStatus) => Promise<void>;
    updateTenantLimits: (tenantId: string, limits: Partial<TenantLimits>) => Promise<void>;
    prompts: LLMPrompt[];
    getPrompt: (name: string) => LLMPrompt | undefined;
    fetchAllPrompts: () => Promise<void>;
    savePrompt: (prompt: Omit<LLMPrompt, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
    deletePrompt: (promptId: string) => Promise<void>;
    syncPrompts: () => Promise<void>;

    // Global Assistant (Super Admin)
    globalAssistantConfig: GlobalAssistantConfig;
    saveGlobalAssistantConfig: (config: GlobalAssistantConfig) => Promise<void>;

    // Template Management
    isEditingTemplate: boolean;
    exitTemplateEditor: () => void;
    createNewTemplate: () => Promise<void>;
    archiveTemplate: (templateId: string, isArchived: boolean) => Promise<void>;
    duplicateTemplate: (templateId: string) => Promise<void>;
    updateTemplateInState: (templateId: string, updates: Partial<Project>) => void;

    // Component Studio
    componentStyles: ComponentStyles;
    customComponents: CustomComponent[];
    updateComponentStyle: (componentId: string, newStyles: any, isCustom: boolean) => Promise<void>;
    saveComponent: (componentId: string, changeDescription?: string) => Promise<void>;
    createNewCustomComponent: (name: string, baseComponent: EditableComponentID) => Promise<CustomComponent>;
    deleteCustomComponent: (componentId: string) => Promise<void>;
    duplicateComponent: (componentId: string) => Promise<CustomComponent>;
    renameCustomComponent: (componentId: string, newName: string) => Promise<void>;
    updateComponentVariants: (componentId: string, variants: ComponentVariant[], activeVariant?: string) => Promise<void>;
    exportComponent: (componentId: string) => string;
    importComponent: (jsonString: string) => Promise<CustomComponent>;
    revertToVersion: (componentId: string, versionNumber: number) => Promise<void>;
    trackComponentUsage: (projectId: string, componentIds: string[]) => Promise<void>;

    // Design Tokens
    designTokens: DesignTokens | null;
    updateDesignTokens: (tokens: DesignTokens) => Promise<void>;

    // Global Component Status
    componentStatus: Record<PageSection, boolean>;
    updateComponentStatus: (componentId: PageSection, isEnabled: boolean) => Promise<void>;

    // CMS State
    cmsPosts: CMSPost[];
    isLoadingCMS: boolean;
    loadCMSPosts: () => Promise<void>;
    saveCMSPost: (post: CMSPost) => Promise<void>;
    deleteCMSPost: (postId: string) => Promise<void>;

    // Navigation Management
    menus: Menu[];
    saveMenu: (menu: Menu) => Promise<void>;
    deleteMenu: (menuId: string) => Promise<void>;

    // AI Assistant Configuration (Project Level)
    aiAssistantConfig: AiAssistantConfig;
    saveAiAssistantConfig: (config: AiAssistantConfig) => Promise<void>;

    // User Preferences (synced across devices)
    sidebarOrder: string[];
    setSidebarOrder: React.Dispatch<React.SetStateAction<string[]>>;

    // Leads & CRM
    leads: Lead[];
    isLoadingLeads: boolean;
    addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'projectId'>) => Promise<string | undefined>;
    updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
    updateLead: (leadId: string, data: Partial<Lead>) => Promise<void>;
    deleteLead: (leadId: string) => Promise<void>;

    // Lead Activities
    leadActivities: LeadActivity[];
    addLeadActivity: (leadId: string, activity: Omit<LeadActivity, 'id' | 'createdAt' | 'leadId'>) => Promise<void>;
    getLeadActivities: (leadId: string) => LeadActivity[];

    // Lead Tasks
    leadTasks: LeadTask[];
    addLeadTask: (leadId: string, task: Omit<LeadTask, 'id' | 'createdAt' | 'leadId'>) => Promise<void>;
    updateLeadTask: (taskId: string, data: Partial<LeadTask>) => Promise<void>;
    deleteLeadTask: (taskId: string) => Promise<void>;
    getLeadTasks: (leadId: string) => LeadTask[];

    // Leads Library
    libraryLeads: LibraryLead[];
    isLoadingLibraryLeads: boolean;
    addLibraryLead: (lead: Omit<LibraryLead, 'id' | 'createdAt' | 'isImported'>) => Promise<void>;
    deleteLibraryLead: (leadId: string) => Promise<void>;
    importLibraryLead: (leadId: string) => Promise<void>;

    // Domain Management
    domains: Domain[];
    addDomain: (domain: Domain) => Promise<void>;
    updateDomain: (id: string, data: Partial<Domain>) => Promise<void>;
    deleteDomain: (id: string) => Promise<void>;
    verifyDomain: (id: string) => Promise<boolean>;
    deployDomain: (domainId: string, provider?: 'vercel' | 'cloudflare' | 'netlify') => Promise<boolean>;
    getDomainDeploymentLogs: (domainId: string) => DeploymentLog[];

    // API Key Management
    hasApiKey: boolean | null;
    promptForKeySelection: () => Promise<void>;
    handleApiError: (error: any) => void;

    // Usage & Billing
    usage: { used: number; limit: number; plan: string } | null;
    isLoadingUsage: boolean;

    // SEO Configuration
    seoConfig: SEOConfig | null;
    setSeoConfig: React.Dispatch<React.SetStateAction<SEOConfig | null>>;
    updateSeoConfig: (updates: Partial<SEOConfig>) => Promise<void>;

    // Onboarding
    isOnboardingOpen: boolean;
    setIsOnboardingOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const useEditor = () => {
    const context = useContext(EditorContext);
    if (context === undefined) {
        throw new Error('useEditor must be used within an EditorProvider');
    }
    return context;
};

/**
 * Safe version of useEditor that returns null if not inside EditorProvider
 * Useful for components that can work both inside and outside the editor
 */
export const useSafeEditor = (): EditorContextType | null => {
    const context = useContext(EditorContext);
    return context || null;
};

const allComponents = initialData.componentOrder;
const defaultComponentStatus = allComponents.reduce((acc, comp) => {
    acc[comp] = true;
    return acc;
}, {} as Record<PageSection, boolean>);

// Default Email Settings (copied from useEmailSettings to ensure consistency)
const defaultTransactionalSettings: TransactionalEmailSettings = {
    orderConfirmation: true,
    orderShipped: true,
    orderDelivered: true,
    orderCancelled: true,
    orderRefunded: true,
    reviewRequest: true,
    reviewRequestDelayDays: 3,
    newOrderNotification: true,
    lowStockNotification: true,
};

const defaultMarketingSettings: MarketingEmailSettings = {
    enabled: false,
    welcomeEmail: true,
    abandonedCartEnabled: false,
    abandonedCartDelayHours: 1,
    winBackEnabled: false,
    winBackDelayDays: 30,
};

const defaultEmailSettings: Partial<EmailSettings> = {
    provider: 'resend',
    apiKeyConfigured: false,
    fromEmail: '',
    fromName: '',
    primaryColor: '#4f46e5',
    transactional: defaultTransactionalSettings,
    marketing: defaultMarketingSettings,
};


export const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Get project context for project-scoped data operations
    const projectContext = useSafeProject();
    const projectActiveId = projectContext?.activeProjectId || null;

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDashboardSidebarCollapsed, setIsDashboardSidebarCollapsed] = useState(false);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [view, setView] = useState<View>('dashboard');
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
    const [previewOrientation, setPreviewOrientation] = useState<PreviewOrientation>('portrait');
    const previewRef = useRef<HTMLDivElement>(null);
    const [activeSection, setActiveSection] = useState<PageSection | null>(null);

    // Auth state
    const [user, setUser] = useState<User | null>(null);
    const [userDocument, setUserDocument] = useState<UserDocument | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Track deleted template IDs to prevent hardcoded templates from reappearing
    // IMPORTANT: This must be initialized BEFORE projects state
    const getDeletedTemplateIds = (): Set<string> => {
        try {
            const stored = localStorage.getItem('deletedTemplateIds');
            if (stored) {
                const parsed = JSON.parse(stored);
                const ids = new Set(Array.isArray(parsed) ? parsed : []);
                return ids;
            }
        } catch (e) {
            console.error('Error reading deletedTemplateIds from localStorage:', e);
        }
        return new Set();
    };

    const deletedTemplateIdsRef = useRef<Set<string>>(getDeletedTemplateIds());

    // Project state - initialized empty, will be loaded from Firestore
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const activeProject = projects.find(p => p.id === activeProjectId) || null;

    // CRITICAL FIX: Sync activeProjectId from ProjectContext to EditorContext
    // This ensures GlobalAiAssistant receives the correct project when loaded from sidebar
    useEffect(() => {
        if (projectActiveId !== null && projectActiveId !== activeProjectId) {
            console.log('[EditorContext] Syncing activeProjectId from ProjectContext:', projectActiveId);
            setActiveProjectId(projectActiveId);
        }
    }, [projectActiveId, activeProjectId]);

    // Active project data
    const [data, setData] = useState<PageData | null>(null);
    const [theme, setTheme] = useState<ThemeData>(initialData.theme);
    const [brandIdentity, setBrandIdentity] = useState<BrandIdentity>(initialData.brandIdentity);
    const [componentOrder, setComponentOrder] = useState<PageSection[]>(initialData.componentOrder as PageSection[]);
    const [sectionVisibility, setSectionVisibility] = useState<Record<PageSection, boolean>>(initialData.sectionVisibility as Record<PageSection, boolean>);

    // Navigation Menus
    const [menus, setMenus] = useState<Menu[]>([
        { id: 'main', title: 'Main Menu', handle: 'main-menu', items: [{ id: '1', text: 'Home', href: '/', type: 'section' }] },
        { id: 'footer', title: 'Footer Menu', handle: 'footer-menu', items: [{ id: '1', text: 'Contact', href: '/#contact', type: 'section' }] }
    ]);

    // Auto-save timer ref
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialLoadRef = useRef(true);
    const projectsRef = useRef<Project[]>([]); // Ref to keep latest projects for auto-save

    // Project AI Assistant Config
    const [aiAssistantConfig, setAiAssistantConfig] = useState<AiAssistantConfig>({
        agentName: 'Quimera Bot',
        tone: 'Professional',
        languages: 'English, Spanish',
        businessProfile: '',
        productsServices: '',
        policiesContact: '',
        specialInstructions: '',
        faqs: [],
        knowledgeDocuments: [],
        knowledgeLinks: [],
        widgetColor: '#4f46e5',
        isActive: true,
        leadCaptureEnabled: true,
        enableLiveVoice: false,
        voiceName: 'Zephyr'
    });

    // Global Assistant Config (System Level)
    const [globalAssistantConfig, setGlobalAssistantConfig] = useState<GlobalAssistantConfig>({
        isEnabled: true,
        enableLiveVoice: true,
        voiceName: 'Puck',
        greeting: `👋 **¡Hola! Soy tu Asistente Quimera** 🤖

Tengo control total sobre la aplicación y puedo ayudarte con:

### 🧭 Navegación
Ir a cualquier sección (Editor, CMS, Leads, Dominios)

### 🎨 Diseño & Contenido
✏️ Textos · 🖌️ Colores · 📐 Estilos · 🖼️ Imágenes

### 📊 Gestión de Datos
📰 Blog Posts · 💼 Leads CRM · 🌐 Dominios

### ⚡ Creación
🚀 Nuevos sitios web · 🎨 Imágenes con IA

💬 **¿En qué te ayudo hoy?**`,
        systemInstruction: `You are the Quimera.ai Global Assistant. You have FULL CONTROL over the application via tools.
        
        YOUR MANDATE:
        1. **Action Over Chat:** If the user asks to change something (theme, view, content, project), call the appropriate tool IMMEDIATELY. Do not ask for confirmation.
        2. **Navigation:** Use 'change_view' to move around (dashboard, websites, editor, etc).
        3. **Theming:** Use 'change_theme' for light/dark/black mode.
        4. **Content Editing:** You can DIRECTLY modify the website content using 'update_site_content'.
        5. **Project Management:** Use 'load_project' to switch websites.
        
        🎯 FORMATTING REQUIREMENTS:
        - ✨ ALWAYS use emojis generously (make responses engaging and scannable)
        - 📝 ALWAYS use markdown: headers (##), lists, **bold**, \`code\`
        - 🎨 Match emojis to context (navigation 🧭, design 🎨, data 📊, etc)
        - 💡 Add helpful tips when relevant
        - ✅ Confirm actions with visual structure
        - 🌐 Match user's language (Spanish/English)
        
        Remember: Rich formatting with emojis = Better UX! 🚀
        `,
        enabledTemplates: undefined, // use defaults until saved from Super Admin
        customInstructions: '',
        permissions: {}, // Initialize empty, components will handle defaults
        temperature: 0.7,
        maxTokens: 2048,
        autoDetectLanguage: true,
        supportedLanguages: 'English, Spanish, French'
    });

    // Template editing state
    const [isEditingTemplate, setIsEditingTemplate] = useState(false);

    // Global component status
    const [componentStatus, setComponentStatus] = useState<Record<PageSection, boolean>>(defaultComponentStatus);

    // Design Tokens
    const [designTokens, setDesignTokens] = useState<DesignTokens | null>(null);

    // CMS State
    const [cmsPosts, setCmsPosts] = useState<CMSPost[]>([]);
    const [isLoadingCMS, setIsLoadingCMS] = useState(false);

    // Leads State
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);
    const [leadActivities, setLeadActivities] = useState<LeadActivity[]>([]);
    const [leadTasks, setLeadTasks] = useState<LeadTask[]>([]);

    // Leads Library State
    const [libraryLeads, setLibraryLeads] = useState<LibraryLead[]>([]);
    const [isLoadingLibraryLeads, setIsLoadingLibraryLeads] = useState(false);

    // Theme mode and sidebar order - Use UIContext (single source of truth)
    const { themeMode, setThemeMode, sidebarOrder, setSidebarOrder } = useUI();

    // File Management State
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [isFilesLoading, setIsFilesLoading] = useState(true);

    // Global File Management State
    const [globalFiles, setGlobalFiles] = useState<FileRecord[]>([]);
    const [isGlobalFilesLoading, setIsGlobalFilesLoading] = useState(false);

    // Super Admin State
    const [adminView, setAdminView] = useState<AdminView>('main');
    const [allUsers, setAllUsers] = useState<UserDocument[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);

    // Sistema de permisos
    const [userPermissions, setUserPermissions] = useState<RolePermissions>(getPermissions('user'));
    const [isUserOwner, setIsUserOwner] = useState(false);
    const [prompts, setPrompts] = useState<LLMPrompt[]>([]);

    // Component Studio State
    const [componentStyles, setComponentStyles] = useState<ComponentStyles>(defaultComponentStyles);
    const [customComponents, setCustomComponents] = useState<CustomComponent[]>([]);

    // Domains State
    const [domains, setDomains] = useState<Domain[]>([]);

    // SEO Configuration State
    const [seoConfig, setSeoConfig] = useState<SEOConfig | null>(null);

    // Usage & Billing State
    const [usage, setUsage] = useState<{ used: number; limit: number; plan: string } | null>(null);
    const [isLoadingUsage, setIsLoadingUsage] = useState(true);

    // API Key State
    const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);


    // Leads Library Logic - Project-scoped
    useEffect(() => {
        if (!user || !activeProjectId) {
            setLibraryLeads([]);
            return;
        }

        setIsLoadingLibraryLeads(true);
        // Project-scoped path
        const q = query(
            collection(db, `users/${user.uid}/projects/${activeProjectId}/libraryLeads`),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leadsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as LibraryLead[];
            setLibraryLeads(leadsData);
            setIsLoadingLibraryLeads(false);
        }, (error) => {
            console.error("[EditorContext] Error fetching library leads:", error);
            setIsLoadingLibraryLeads(false);
        });

        return () => unsubscribe();
    }, [user, activeProjectId]);

    const addLibraryLead = async (leadData: Omit<LibraryLead, 'id' | 'createdAt' | 'isImported'>) => {
        if (!user || !activeProjectId) return;
        try {
            // Project-scoped path
            await addDoc(collection(db, `users/${user.uid}/projects/${activeProjectId}/libraryLeads`), {
                ...leadData,
                projectId: activeProjectId,
                isImported: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("[EditorContext] Error adding library lead:", error);
            throw error;
        }
    };

    const deleteLibraryLead = async (leadId: string) => {
        if (!user || !activeProjectId) return;
        try {
            // Project-scoped path
            await deleteDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/libraryLeads/${leadId}`));
        } catch (error) {
            console.error("[EditorContext] Error deleting library lead:", error);
            throw error;
        }
    };

    const importLibraryLead = async (leadId: string) => {
        if (!user || !activeProjectId) return;
        try {
            const leadToImport = libraryLeads.find(l => l.id === leadId);
            if (!leadToImport) throw new Error("Lead not found");

            // Create in main CRM - Project-scoped path
            const newLeadRef = await addDoc(collection(db, `users/${user.uid}/projects/${activeProjectId}/leads`), {
                name: leadToImport.name,
                email: leadToImport.email,
                phone: leadToImport.phone || '',
                company: leadToImport.company || '',
                source: leadToImport.source || 'library_import',
                status: 'new',
                value: 0,
                notes: leadToImport.notes || '',
                tags: [...(leadToImport.tags || []), 'imported'],
                projectId: activeProjectId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Update library lead status - Project-scoped path
            await updateDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/libraryLeads/${leadId}`), {
                isImported: true,
                importedAt: serverTimestamp(),
                importedLeadId: newLeadRef.id
            });

        } catch (error) {
            console.error("[EditorContext] Error importing library lead:", error);
            throw error;
        }
    };
    // Effects
    useEffect(() => {
        const checkApiKey = async () => {
            try {
                // IMPORTANT: When using the proxy, the API key is stored securely on the server
                // We don't need a local API key - the proxy handles authentication
                // Import shouldUseProxy to check if proxy is active
                const { shouldUseProxy } = await import('../utils/geminiProxyClient');

                if (shouldUseProxy()) {
                    console.log('✅ [checkApiKey] Using secure proxy - API key managed by server');
                    setHasApiKey(true);
                    return;
                }

                // Fallback for development: check for local API key
                // Primero, verificar si hay una API key ya cachada
                const cachedKey = getCachedApiKey();
                if (cachedKey) {
                    setHasApiKey(true);
                    return;
                }

                // Intentar obtener la API key usando la función centralizada
                // Esto intenta obtenerla de import.meta.env, process.env, y AI Studio
                try {
                    const apiKey = await fetchGoogleApiKey();
                    if (apiKey) {
                        setCachedApiKey(apiKey);
                        setHasApiKey(true);
                        return;
                    }
                } catch (error) {
                    // fetchGoogleApiKey puede lanzar si no encuentra la key, esto es normal
                    console.debug('No API key found via fetchGoogleApiKey, checking other sources...', error);
                }

                // Si no hay API key disponible, verificar si AI Studio puede proporcionar una
                const aiStudio = typeof window !== 'undefined' ? (window as any).aistudio : undefined;
                if (aiStudio && typeof aiStudio.hasSelectedApiKey === 'function') {
                    try {
                        const keyStatus = await aiStudio.hasSelectedApiKey();
                        setHasApiKey(keyStatus);
                        if (keyStatus) {
                            // Si AI Studio tiene una key, sincronizarla
                            const syncedKey = await syncApiKeyFromAiStudio();
                            if (syncedKey) {
                                setCachedApiKey(syncedKey);
                            }
                        }
                    } catch (error) {
                        console.debug('Error checking AI Studio key status', error);
                        setHasApiKey(false);
                    }
                } else {
                    // Si no hay AI Studio y no hay API key disponible, marcar como false
                    setHasApiKey(false);
                }
            } catch (error) {
                console.warn('Error while checking API key', error);
                // Fallback: verificar si hay una API key cachada
                const cachedKey = getCachedApiKey();
                setHasApiKey(!!cachedKey);
            }
        };

        checkApiKey();
    }, []);

    // Moved fetchGlobalSettings and fetchComponentDefaults inside auth state change to avoid permission errors on initial load

    const fetchGlobalSettings = async () => {
        try {
            const compDoc = await getDoc(doc(db, 'settings', 'components'));
            if (compDoc.exists()) {
                const status = compDoc.data().status;
                // Merge saved status with defaults, ensuring new components are enabled by default
                // This allows new components to be automatically available when added to the system
                const mergedStatus = { ...defaultComponentStatus };
                Object.keys(status).forEach(key => {
                    mergedStatus[key as PageSection] = status[key];
                });
                setComponentStatus(mergedStatus);
            } else {
                // If no document exists, use defaults
                setComponentStatus(defaultComponentStatus);
            }

            const assistantDoc = await getDoc(doc(db, 'settings', 'global_assistant'));
            if (assistantDoc.exists()) {
                setGlobalAssistantConfig(prev => ({ ...prev, ...assistantDoc.data() }));
            }

            const tokensDoc = await getDoc(doc(db, 'settings', 'designTokens'));
            if (tokensDoc.exists()) {
                setDesignTokens(tokensDoc.data() as DesignTokens);
            } else {
                // Initialize with default tokens if none exist
                // Using Quimera's Cadmium Yellow as primary color
                const defaultTokens: DesignTokens = {
                    colors: {
                        primary: { main: '#FBB92B', light: '#FDD766', dark: '#D99B1C' },
                        secondary: { main: '#10b981', light: '#34d399', dark: '#059669' },
                        success: { main: '#10b981', light: '#34d399', dark: '#059669' },
                        warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
                        error: { main: '#ef4444', light: '#f87171', dark: '#dc2626' },
                        info: { main: '#3b82f6', light: '#60a5fa', dark: '#2563eb' },
                        neutral: {
                            50: '#f9fafb',
                            100: '#f3f4f6',
                            200: '#e5e7eb',
                            300: '#d1d5db',
                            400: '#9ca3af',
                            500: '#6b7280',
                            600: '#4b5563',
                            700: '#374151',
                            800: '#1f2937',
                            900: '#111827',
                        },
                    },
                    spacing: {
                        xs: '0.25rem',
                        sm: '0.5rem',
                        md: '1rem',
                        lg: '1.5rem',
                        xl: '2rem',
                        '2xl': '3rem',
                        '3xl': '4rem',
                        '4xl': '5rem',
                    },
                    typography: {
                        fontFamilies: {
                            heading: 'Inter, system-ui, sans-serif',
                            body: 'Inter, system-ui, sans-serif',
                            mono: 'Fira Code, monospace',
                        },
                        fontSizes: {
                            xs: '0.75rem',
                            sm: '0.875rem',
                            base: '1rem',
                            lg: '1.125rem',
                            xl: '1.25rem',
                            '2xl': '1.5rem',
                            '3xl': '1.875rem',
                            '4xl': '2.25rem',
                            '5xl': '3rem',
                            '6xl': '3.75rem',
                        },
                        fontWeights: {
                            light: 300,
                            normal: 400,
                            medium: 500,
                            semibold: 600,
                            bold: 700,
                        },
                        lineHeights: {
                            tight: 1.25,
                            normal: 1.5,
                            relaxed: 1.75,
                        },
                    },
                    shadows: {
                        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                    },
                    animations: {
                        durations: {
                            fast: '150ms',
                            normal: '300ms',
                            slow: '500ms',
                        },
                        easings: {
                            linear: 'linear',
                            easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
                            easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
                            easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
                        },
                    },
                    breakpoints: {
                        sm: '640px',
                        md: '768px',
                        lg: '1024px',
                        xl: '1280px',
                        '2xl': '1536px',
                    },
                };
                setDesignTokens(defaultTokens);
            }
        } catch (error) {
            console.warn("Error fetching global settings:", error);
        }
    };

    const setupComponentDefaultsListener = () => {
        try {
            // Real-time listener for component defaults
            const componentDefaultsCol = collection(db, "componentDefaults");
            const unsubscribe = onSnapshot(componentDefaultsCol, (snapshot) => {
                const loadedStyles: any = {};
                snapshot.forEach((doc) => {
                    loadedStyles[doc.id] = doc.data().styles;
                });
                if (Object.keys(loadedStyles).length > 0) {
                    setComponentStyles(prev => ({ ...prev, ...loadedStyles }));
                    console.log("✅ Component defaults updated in real-time");
                }
            }, (error) => {
                // Silently handle expected errors (empty collection, no permissions yet)
                if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
                    console.warn("⚠️ Component defaults listener: waiting for permissions");
                } else {
                    console.error("Error in component defaults listener:", error);
                }
            });
            return unsubscribe;
        } catch (e) {
            console.error("Error setting up component defaults listener:", e);
            return () => { };
        }
    };

    const fetchAllFiles = async (userId: string, projectId?: string) => {
        setIsFilesLoading(true);
        try {
            // Project-scoped path if projectId is provided, otherwise user-level (legacy)
            const filesPath = projectId
                ? `users/${userId}/projects/${projectId}/files`
                : `users/${userId}/files`;
            const filesCol = collection(db, filesPath);
            const q = query(filesCol, orderBy('createdAt', 'desc'));
            const filesSnapshot = await getDocs(q);
            const userFiles = filesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileRecord));
            setFiles(userFiles);
        } catch (error) {
            console.error("[EditorContext] Error loading user files:", error);
            setFiles([]);
        } finally {
            setIsFilesLoading(false);
        }
    };

    const fetchUserDomains = async (userId: string) => {
        try {
            const domainsCol = collection(db, 'users', userId, 'domains');
            const q = query(domainsCol, orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            // IMPORTANT: docSnapshot.id must come AFTER ...data to override any "id" field
            const userDomains = snap.docs.map(docSnapshot => ({
                ...docSnapshot.data(),
                id: docSnapshot.id
            } as Domain));
            setDomains(userDomains);
        } catch (error) {
            console.error("Error loading user domains:", error);
        }
    };

    // Load templates from Firestore (global collection)
    const loadGlobalTemplates = async (): Promise<{ templates: Project[], deletedIds: Set<string> }> => {
        try {
            const templatesCol = collection(db, 'templates');
            const q = query(templatesCol, orderBy('lastUpdated', 'desc'));
            const templateSnapshot = await getDocs(q);

            const deletedIds = new Set<string>();
            const activeTemplates: Project[] = [];

            templateSnapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                // Check if template is marked as deleted
                if (data.isDeleted === true) {
                    deletedIds.add(docSnap.id);
                } else {
                    activeTemplates.push({
                        id: docSnap.id,
                        ...data,
                        status: 'Template' as const
                    } as Project);
                }
            });

            console.log(`✅ Loaded ${activeTemplates.length} templates from Firestore (${deletedIds.size} deleted)`);

            // Persist deleted template IDs to localStorage
            if (deletedIds.size > 0) {
                deletedIds.forEach(id => deletedTemplateIdsRef.current.add(id));
                localStorage.setItem('deletedTemplateIds', JSON.stringify([...deletedTemplateIdsRef.current]));
            }

            return { templates: activeTemplates, deletedIds };
        } catch (error) {
            console.error("Error loading templates from Firestore:", error);
            // Return cached deleted IDs even on error
            return { templates: [], deletedIds: deletedTemplateIdsRef.current };
        }
    };

    const loadUserProjects = async (userId: string) => {
        setIsLoadingProjects(true);
        try {
            // Load user projects
            const projectsCol = collection(db, 'users', userId, 'projects');
            const q = query(projectsCol, orderBy('lastUpdated', 'desc'));
            const projectSnapshot = await getDocs(q);
            const userProjects = projectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));

            // Load templates from Firestore (includes deleted template IDs)
            // This also updates deletedTemplateIdsRef with Firestore deleted IDs
            const { templates: firestoreTemplates } = await loadGlobalTemplates();

            // Merge: Firestore templates + user projects (NO hardcoded templates)
            console.log('🔍 [Load] Templates from Firestore:', firestoreTemplates.length);
            console.log('🔍 [Load] User projects:', userProjects.length);

            setProjects([...firestoreTemplates, ...userProjects]);
        } catch (error) {
            console.error("Error loading user projects:", error);
            // On error, try to load at least templates from Firestore
            try {
                const { templates: firestoreTemplates } = await loadGlobalTemplates();
                setProjects(firestoreTemplates);
            } catch (templateError) {
                console.error("Error loading templates from Firestore:", templateError);
                setProjects([]);
            }
        } finally {
            setIsLoadingProjects(false);
        }
    };

    const setupCustomComponentsListener = () => {
        try {
            // Real-time listener for custom components
            const customComponentsCol = collection(db, 'customComponents');
            const q = query(customComponentsCol, orderBy('createdAt', 'desc'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const components = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomComponent));
                setCustomComponents(components);
                if (components.length > 0) {
                    console.log("✅ Custom components updated in real-time:", components.length);
                }
            }, (error) => {
                // Silently handle permission errors or missing index errors
                // These are expected when the collection is empty or index doesn't exist yet
                if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
                    console.warn("⚠️ Custom components listener: waiting for index or permissions");
                    setCustomComponents([]);
                } else {
                    console.error("Error in custom components listener:", error);
                }
            });
            return unsubscribe;
        } catch (error) {
            console.error("Error setting up custom components listener:", error);
            return () => { };
        }
    };

    // Store cleanup functions for real-time listeners
    useEffect(() => {
        let unsubscribeComponentDefaults: (() => void) | null = null;
        let unsubscribeCustomComponents: (() => void) | null = null;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            try {
                setUser(currentUser);
                if (currentUser) {
                    // Fetch global configs only when authenticated to avoid permission errors
                    fetchGlobalSettings();

                    // Setup real-time listeners for component defaults
                    unsubscribeComponentDefaults = setupComponentDefaultsListener();

                    const userDocRef = doc(db, 'users', currentUser.uid);

                    let finalUserDoc: Omit<UserDocument, 'id'>;

                    try {
                        const userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                            finalUserDoc = userDocSnap.data() as Omit<UserDocument, 'id'>;
                        } else {
                            const newUserDocData = {
                                name: currentUser.displayName || 'Unnamed User',
                                email: currentUser.email!,
                                photoURL: currentUser.photoURL || '',
                            };
                            await setDoc(userDocRef, newUserDocData);
                            finalUserDoc = newUserDocData;
                        }
                    } catch (error) {
                        console.error("Error fetching/creating user document:", error);
                        finalUserDoc = {
                            name: currentUser.displayName || 'User',
                            email: currentUser.email!,
                            photoURL: currentUser.photoURL || '',
                        };
                    }

                    // Auto-asignar rol de owner al email del creador
                    if (isOwner(currentUser.email!) && finalUserDoc.role !== 'owner') {
                        try {
                            console.log("Auto-promoting user to owner...");
                            finalUserDoc.role = 'owner';
                            // Use setDoc with merge to ensure we can write even if updateDoc fails due to rules
                            // (Rules allow write to own doc, so this should work)
                            await setDoc(userDocRef, { role: 'owner' }, { merge: true });
                            console.log("User auto-promoted to owner successfully.");
                        } catch (e) {
                            console.warn("Failed to auto-promote owner (permission error):", e);
                        }
                    }

                    setUserDocument({ ...finalUserDoc, id: currentUser.uid });

                    // Load user preferences from Firebase (sync across devices)
                    // setThemeMode and setSidebarOrder from UIContext handle localStorage automatically
                    if (finalUserDoc.preferences) {
                        if (finalUserDoc.preferences.themeMode) {
                            setThemeMode(finalUserDoc.preferences.themeMode);
                        }
                        if (finalUserDoc.preferences.sidebarOrder && finalUserDoc.preferences.sidebarOrder.length > 0) {
                            setSidebarOrder(finalUserDoc.preferences.sidebarOrder);
                        }
                    }

                    loadUserProjects(currentUser.uid);
                    fetchAllFiles(currentUser.uid);
                    fetchUserDomains(currentUser.uid);
                    fetchGlobalFiles();
                    fetchAllPrompts(); // Fetch prompts for all users to ensure dynamic system behavior

                    if (['owner', 'superadmin'].includes(finalUserDoc.role || '')) {
                        // Setup real-time listener for custom components
                        unsubscribeCustomComponents = setupCustomComponentsListener();
                    }

                } else {
                    // Cleanup listeners when user logs out
                    if (unsubscribeComponentDefaults) {
                        unsubscribeComponentDefaults();
                        unsubscribeComponentDefaults = null;
                    }
                    if (unsubscribeCustomComponents) {
                        unsubscribeCustomComponents();
                        unsubscribeCustomComponents = null;
                    }

                    setUserDocument(null);
                    // Load templates from Firestore when user logs out (public templates only)
                    try {
                        const { templates: firestoreTemplates } = await loadGlobalTemplates();
                        setProjects(firestoreTemplates);
                    } catch (error) {
                        console.error("Error loading templates after logout:", error);
                        setProjects([]);
                    }
                    setIsLoadingProjects(false);
                    setFiles([]);
                    setDomains([]);
                    setCustomComponents([]);
                    setActiveProjectId(null);
                    setData(null);
                }
            } catch (globalAuthError) {
                console.error("Unexpected error during auth state change:", globalAuthError);
            } finally {
                setLoadingAuth(false);
            }
        });

        // Cleanup function to unsubscribe from all listeners
        return () => {
            unsubscribe();
            if (unsubscribeComponentDefaults) {
                unsubscribeComponentDefaults();
            }
            if (unsubscribeCustomComponents) {
                unsubscribeCustomComponents();
            }
        };
    }, []);

    // Actualizar permisos cuando cambia userDocument
    useEffect(() => {
        if (userDocument) {
            const effectiveRole = determineRole(userDocument.email, userDocument.role || 'user');
            setUserPermissions(getPermissions(effectiveRole));
            setIsUserOwner(isOwner(userDocument.email));
        } else {
            setUserPermissions(getPermissions('user'));
            setIsUserOwner(false);
        }
    }, [userDocument]);

    // Reload files when activeProjectId changes
    useEffect(() => {
        if (user && activeProjectId) {
            fetchAllFiles(user.uid, activeProjectId);
        }
    }, [user, activeProjectId]);

    // CMS Real-time Subscription
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        if (user) {
            setIsLoadingCMS(true);
            try {
                const postsCol = collection(db, 'users', user.uid, 'posts');
                const q = query(postsCol, orderBy('updatedAt', 'desc'));

                unsubscribe = onSnapshot(q,
                    (snapshot) => {
                        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CMSPost));
                        setCmsPosts(posts);
                        setIsLoadingCMS(false);
                    },
                    (error) => {
                        console.error("CMS Snapshot Error:", error);
                        // If offline or error, keep existing posts if any, or empty
                        setIsLoadingCMS(false);
                    }
                );
            } catch (e) {
                console.error("Error setting up CMS subscription:", e);
                setIsLoadingCMS(false);
            }
        } else {
            setCmsPosts([]);
            setIsLoadingCMS(false);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user]);

    // Leads Real-time Subscription - Project-scoped
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        if (user && activeProjectId) {
            setIsLoadingLeads(true);
            try {
                // Project-scoped leads path
                const leadsCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/leads`);
                const q = query(leadsCol, orderBy('createdAt', 'desc'));

                unsubscribe = onSnapshot(q,
                    (snapshot) => {
                        const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
                        setLeads(leadsData);
                        setIsLoadingLeads(false);
                    },
                    (error) => {
                        console.error("[EditorContext] Leads Snapshot Error:", error);
                        setIsLoadingLeads(false);
                    }
                );
            } catch (e) {
                console.error("[EditorContext] Error setting up Leads subscription:", e);
                setIsLoadingLeads(false);
            }
        } else {
            setLeads([]);
            setIsLoadingLeads(false);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user, activeProjectId]);

    // Usage & Billing Real-time Subscription
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        if (user) {
            setIsLoadingUsage(true);
            try {
                const usageRef = doc(db, 'users', user.uid, 'usage', 'current');

                unsubscribe = onSnapshot(usageRef,
                    (snapshot) => {
                        if (snapshot.exists()) {
                            const usageData = snapshot.data();
                            setUsage({
                                used: usageData.used || 0,
                                limit: usageData.limit || 1000,
                                plan: usageData.plan || 'Pro'
                            });
                        } else {
                            // Set default usage if document doesn't exist
                            setUsage({
                                used: 0,
                                limit: 1000,
                                plan: 'Pro'
                            });
                        }
                        setIsLoadingUsage(false);
                    },
                    (error) => {
                        console.error("Usage Snapshot Error:", error);
                        // Set default on error
                        setUsage({
                            used: 0,
                            limit: 1000,
                            plan: 'Pro'
                        });
                        setIsLoadingUsage(false);
                    }
                );
            } catch (e) {
                console.error("Error setting up Usage subscription:", e);
                setUsage({
                    used: 0,
                    limit: 1000,
                    plan: 'Pro'
                });
                setIsLoadingUsage(false);
            }
        } else {
            setUsage(null);
            setIsLoadingUsage(false);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user]);

    // Lead Activities Real-time Subscription - Project-scoped
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        if (user && activeProjectId) {
            try {
                // Project-scoped path
                const activitiesCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/leadActivities`);
                const q = query(activitiesCol, orderBy('createdAt', 'desc'));

                unsubscribe = onSnapshot(q,
                    (snapshot) => {
                        const activitiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeadActivity));
                        setLeadActivities(activitiesData);
                    },
                    (error) => {
                        console.error("[EditorContext] Lead Activities Snapshot Error:", error);
                    }
                );
            } catch (e) {
                console.error("[EditorContext] Error setting up Lead Activities subscription:", e);
            }
        } else {
            setLeadActivities([]);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user, activeProjectId]);

    // Lead Tasks Real-time Subscription - Project-scoped
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        if (user && activeProjectId) {
            try {
                // Project-scoped path
                const tasksCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/leadTasks`);
                const q = query(tasksCol, orderBy('createdAt', 'desc'));

                unsubscribe = onSnapshot(q,
                    (snapshot) => {
                        const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeadTask));
                        setLeadTasks(tasksData);
                    },
                    (error) => {
                        console.error("[EditorContext] Lead Tasks Snapshot Error:", error);
                    }
                );
            } catch (e) {
                console.error("[EditorContext] Error setting up Lead Tasks subscription:", e);
            }
        } else {
            setLeadTasks([]);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user, activeProjectId]);


    // Sync themeMode to Firebase (localStorage sync is handled by UIContext)
    useEffect(() => {
        // Save to Firebase if user is authenticated
        if (user && userDocument) {
            const userDocRef = doc(db, 'users', user.uid);
            updateDoc(userDocRef, {
                'preferences.themeMode': themeMode
            }).catch(err => console.warn('Failed to sync themeMode to Firebase:', err));
        }
    }, [themeMode, user?.uid]); // Only depend on user.uid to avoid infinite loops

    // Sync sidebarOrder to Firebase (localStorage sync is handled by UIContext)
    useEffect(() => {
        if (sidebarOrder.length > 0) {
            // Save to Firebase if user is authenticated
            if (user && userDocument) {
                const userDocRef = doc(db, 'users', user.uid);
                updateDoc(userDocRef, {
                    'preferences.sidebarOrder': sidebarOrder
                }).catch(err => console.warn('Failed to sync sidebarOrder to Firebase:', err));
            }
        }
    }, [sidebarOrder, user?.uid]); // Only depend on user.uid to avoid infinite loops

    // Helper to remove undefined values (Firebase doesn't accept them)
    const removeUndefinedValues = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(removeUndefinedValues);

        const cleaned: any = {};
        for (const key in obj) {
            if (obj[key] !== undefined) {
                cleaned[key] = removeUndefinedValues(obj[key]);
            }
        }
        return cleaned;
    };

    // Keep projectsRef in sync with latest projects state for auto-save
    useEffect(() => {
        projectsRef.current = projects;
    }, [projects]);

    // Auto-save effect: saves project automatically when data changes (including templates)
    useEffect(() => {
        // Skip if missing required data
        if (!activeProjectId || !data || !user || !activeProject) {
            return;
        }

        // Skip first render (initial project load)
        if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
            return;
        }

        // Clear any existing timer
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        // Capture the projectId at the time of scheduling (for closure safety)
        const scheduledProjectId = activeProjectId;

        // Set debounced auto-save (2 seconds after last change)
        autoSaveTimerRef.current = setTimeout(async () => {
            try {
                // CRITICAL: Double-check project still exists in local state before saving
                // This prevents recreating deleted projects due to race conditions
                const projectToSave = projectsRef.current.find(p => p.id === scheduledProjectId);
                if (!projectToSave) {
                    console.log('🛑 [Auto-save] Aborted: Project no longer exists in local state (was likely deleted)');
                    return;
                }
                if (!user) {
                    console.log('🛑 [Auto-save] Aborted: No authenticated user');
                    return;
                }

                // Check permissions for templates
                if (projectToSave.status === 'Template') {
                    const userRole = userDocument?.role || '';
                    if (!['owner', 'superadmin'].includes(userRole)) {
                        console.warn('⚠️ Auto-save skipped: Only owner/superadmin can save templates');
                        return;
                    }
                }

                let thumbnailUrl = projectToSave.thumbnailUrl;
                if (data.hero?.imageUrl && data.hero.imageUrl.trim() !== '') {
                    thumbnailUrl = data.hero.imageUrl;
                }

                const updatedProject: Project = {
                    ...projectToSave,
                    data,
                    theme,
                    brandIdentity,
                    componentOrder,
                    sectionVisibility,
                    thumbnailUrl,
                    menus,
                    aiAssistantConfig,
                    lastUpdated: new Date().toISOString()
                };

                const { id, ...dataToSave } = updatedProject;

                // Save to appropriate collection based on project type
                // Use updateDoc instead of setDoc to prevent recreating deleted documents
                if (projectToSave.status === 'Template') {
                    // Save template to global templates collection
                    const templateDocRef = doc(db, 'templates', scheduledProjectId);
                    // First verify document still exists to prevent recreation
                    const docSnap = await getDoc(templateDocRef);
                    if (!docSnap.exists() || docSnap.data()?.isDeleted) {
                        console.log('🛑 [Auto-save] Aborted: Template was deleted from Firestore');
                        return;
                    }
                    await updateDoc(templateDocRef, dataToSave);
                } else {
                    // Save regular project to user's projects collection
                    const projectDocRef = doc(db, 'users', user.uid, 'projects', scheduledProjectId);
                    // First verify document still exists to prevent recreation
                    const docSnap = await getDoc(projectDocRef);
                    if (!docSnap.exists()) {
                        console.log('🛑 [Auto-save] Aborted: Project was deleted from Firestore');
                        return;
                    }
                    await updateDoc(projectDocRef, dataToSave);
                }

                // Update projects ref without triggering re-render (Firestore is the source of truth)
                projectsRef.current = projectsRef.current.map(p => p.id === scheduledProjectId ? updatedProject : p);
            } catch (error: any) {
                // Don't log errors for "document not found" - this is expected for deleted projects
                if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
                    console.log('🛑 [Auto-save] Document not found (likely deleted), skipping save');
                } else {
                    console.error('❌ Auto-save error:', error);
                }
            }
        }, 2000);

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [data, theme, brandIdentity, componentOrder, sectionVisibility, menus, aiAssistantConfig, activeProjectId, activeProject, user, userDocument]);

    // Reset initial load flag when project changes
    useEffect(() => {
        isInitialLoadRef.current = true;
    }, [activeProjectId]);

    const toggleDashboardSidebar = () => {
        setIsDashboardSidebarCollapsed(prev => !prev);
    };

    const onSectionSelect = (section: PageSection) => {
        setActiveSection(section);
        // Auto-open sidebar on mobile when selecting a section
        if (section) {
            setIsSidebarOpen(true);
        }

        // Scroll to section in preview - use setTimeout to ensure DOM is ready
        setTimeout(() => {
            const element = document.getElementById(section);
            if (element && previewRef.current) {
                // Calculate position relative to preview container
                const container = previewRef.current;
                const elementRect = element.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();

                // Calculate scroll position to center the element
                const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - (containerRect.height / 2) + (elementRect.height / 2);

                container.scrollTo({
                    top: Math.max(0, scrollTop),
                    behavior: 'smooth'
                });
            } else if (element) {
                // Fallback for when previewRef is not available
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    };

    const openProfileModal = () => setIsProfileModalOpen(true);
    const closeProfileModal = () => setIsProfileModalOpen(false);

    const loadProject = (projectId: string, fromAdmin: boolean = false, navigateToEditor: boolean = true, projectOverride?: Project) => {
        const projectToLoad = projectOverride || projects.find(p => p.id === projectId);
        if (projectToLoad) {
            setActiveProjectId(projectId);
            // DEEP CLONE data to prevent mutation issues
            // Also ensure that if data.chatbot is missing (old projects), we provide default
            const loadedData = projectToLoad.data;
            const defaultChatbot = initialData.data.chatbot;
            const defaultTestimonials = initialData.data.testimonials;
            const defaultHeader = initialData.data.header;

            // Merge header with defaults for new fields (ensure header always exists)
            const mergedHeader = loadedData.header ? {
                ...defaultHeader,
                ...loadedData.header,
                colors: {
                    ...defaultHeader.colors,
                    ...loadedData.header.colors
                }
            } : defaultHeader;

            // Merge testimonials with defaults for new fields
            const mergedTestimonials = loadedData.testimonials ? {
                ...defaultTestimonials,
                ...loadedData.testimonials,
                colors: {
                    ...defaultTestimonials.colors,
                    ...loadedData.testimonials.colors
                }
            } : defaultTestimonials;

            // Merge CTA with defaults for new fields
            const defaultCta = initialData.data.cta;
            const mergedCta = loadedData.cta ? {
                ...defaultCta,
                ...loadedData.cta,
                colors: {
                    ...defaultCta.colors,
                    ...loadedData.cta.colors
                }
            } : defaultCta;

            // Merge Map with defaults for new fields (ensure map always exists)
            const defaultMap = initialData.data.map;
            const mergedMap = loadedData.map ? {
                ...defaultMap,
                ...loadedData.map,
                colors: {
                    ...defaultMap.colors,
                    ...loadedData.map?.colors
                }
            } : defaultMap;

            // Merge Menu with defaults for new fields (ensure menu always exists)
            const defaultMenu = initialData.data.menu;
            const mergedMenu = loadedData.menu ? {
                ...defaultMenu,
                ...loadedData.menu,
                colors: {
                    ...defaultMenu.colors,
                    ...loadedData.menu?.colors
                }
            } : defaultMenu;

            const mergedData = {
                ...loadedData,
                header: mergedHeader,
                chatbot: loadedData.chatbot || defaultChatbot,
                testimonials: mergedTestimonials,
                cta: mergedCta,
                map: mergedMap,
                menu: mergedMenu
            };

            // Validate and fix critical fields to prevent runtime errors
            if (mergedData.hero) {
                // Ensure headline is always a valid string
                if (!mergedData.hero.headline || typeof mergedData.hero.headline !== 'string') {
                    mergedData.hero.headline = projectToLoad.name || 'Welcome';
                } else {
                    mergedData.hero.headline = String(mergedData.hero.headline);
                }

                // Ensure subheadline is always a valid string
                if (!mergedData.hero.subheadline || typeof mergedData.hero.subheadline !== 'string') {
                    mergedData.hero.subheadline = 'Your business description';
                } else {
                    mergedData.hero.subheadline = String(mergedData.hero.subheadline);
                }

                // Ensure CTAs are strings
                if (!mergedData.hero.primaryCta || typeof mergedData.hero.primaryCta !== 'string') {
                    mergedData.hero.primaryCta = 'Get Started';
                } else {
                    mergedData.hero.primaryCta = String(mergedData.hero.primaryCta);
                }

                if (!mergedData.hero.secondaryCta || typeof mergedData.hero.secondaryCta !== 'string') {
                    mergedData.hero.secondaryCta = 'Learn More';
                } else {
                    mergedData.hero.secondaryCta = String(mergedData.hero.secondaryCta);
                }
            }

            // Validate footer.socialLinks to ensure it's always an array
            if (mergedData.footer) {
                if (!Array.isArray(mergedData.footer.socialLinks)) {
                    mergedData.footer.socialLinks = [];
                }
            }

            // Initialize storeSettings with defaults if not present
            if (!mergedData.storeSettings) {
                mergedData.storeSettings = {
                    showFilterSidebar: true,
                    showSearchBar: true,
                    showSortOptions: true,
                    showViewModeToggle: true,
                    defaultViewMode: 'grid',
                    productsPerPage: 12
                };
            }

            setData(mergedData);
            setTheme(projectToLoad.theme);
            setBrandIdentity(projectToLoad.brandIdentity || initialData.brandIdentity);

            // Ensure 'header' is in componentOrder for legacy projects
            let order = projectToLoad.componentOrder;
            if (!order.includes('header' as PageSection)) {
                // Header should be at the beginning (after typography if it exists)
                const typographyIndex = order.indexOf('typography' as PageSection);
                if (typographyIndex !== -1) {
                    // Insert after typography
                    const newOrder = [...order];
                    newOrder.splice(typographyIndex + 1, 0, 'header' as PageSection);
                    order = newOrder;
                } else {
                    // Insert at the very beginning
                    order = ['header' as PageSection, ...order];
                }
            }

            // Ensure 'map' is in componentOrder for legacy projects
            if (!order.includes('map' as PageSection)) {
                // Insert before chatbot if it exists, otherwise before footer
                const chatbotIndex = order.indexOf('chatbot' as PageSection);
                const footerIndex = order.indexOf('footer' as PageSection);

                if (chatbotIndex !== -1) {
                    const newOrder = [...order];
                    newOrder.splice(chatbotIndex, 0, 'map' as PageSection);
                    order = newOrder;
                } else if (footerIndex !== -1) {
                    const newOrder = [...order];
                    newOrder.splice(footerIndex, 0, 'map' as PageSection);
                    order = newOrder;
                } else {
                    order = [...order, 'map' as PageSection];
                }
            }

            // Ensure 'menu' is in componentOrder for legacy projects
            if (!order.includes('menu' as PageSection)) {
                // Insert after map and before chatbot if they exist, otherwise before footer
                const mapIndex = order.indexOf('map' as PageSection);
                const chatbotIndex = order.indexOf('chatbot' as PageSection);
                const footerIndex = order.indexOf('footer' as PageSection);

                if (mapIndex !== -1) {
                    const newOrder = [...order];
                    newOrder.splice(mapIndex + 1, 0, 'menu' as PageSection);
                    order = newOrder;
                } else if (chatbotIndex !== -1) {
                    const newOrder = [...order];
                    newOrder.splice(chatbotIndex, 0, 'menu' as PageSection);
                    order = newOrder;
                } else if (footerIndex !== -1) {
                    const newOrder = [...order];
                    newOrder.splice(footerIndex, 0, 'menu' as PageSection);
                    order = newOrder;
                } else {
                    order = [...order, 'menu' as PageSection];
                }
            }

            // Ensure 'chatbot' is in componentOrder for legacy projects
            if (!order.includes('chatbot')) {
                // Insert before footer or at end
                const footerIndex = order.indexOf('footer');
                if (footerIndex !== -1) {
                    const newOrder = [...order];
                    newOrder.splice(footerIndex, 0, 'chatbot');
                    order = newOrder;
                } else {
                    order = [...order, 'chatbot'];
                }
            }

            // Ensure 'typography' is in componentOrder for legacy projects
            if (!order.includes('typography' as PageSection)) {
                // Add at the very beginning (before header)
                order = ['typography' as PageSection, ...order];
            }

            // Ensure 'storeSettings' is in componentOrder for legacy projects
            if (!order.includes('storeSettings' as PageSection)) {
                // Insert before 'products' or at the ecommerce section start
                const productsIndex = order.indexOf('products' as PageSection);
                if (productsIndex !== -1) {
                    const newOrder = [...order];
                    newOrder.splice(productsIndex, 0, 'storeSettings' as PageSection);
                    order = newOrder;
                } else {
                    // Insert before footer if no products section
                    const footerIndex = order.indexOf('footer');
                    if (footerIndex !== -1) {
                        const newOrder = [...order];
                        newOrder.splice(footerIndex, 0, 'storeSettings' as PageSection);
                        order = newOrder;
                    } else {
                        order = [...order, 'storeSettings' as PageSection];
                    }
                }
            }

            setComponentOrder(order);

            // Ensure sectionVisibility includes header, typography, map, menu and storeSettings
            const visibility = {
                ...projectToLoad.sectionVisibility,
                header: projectToLoad.sectionVisibility.header ?? true,
                typography: projectToLoad.sectionVisibility.typography ?? true,
                map: projectToLoad.sectionVisibility.map ?? true,
                menu: projectToLoad.sectionVisibility.menu ?? false,  // Default to false for legacy projects
                storeSettings: projectToLoad.sectionVisibility.storeSettings ?? true  // Default to true for ecommerce config
            };
            setSectionVisibility(visibility);
            setMenus(Array.isArray(projectToLoad.menus) ? projectToLoad.menus : [{ id: 'main', title: 'Main Menu', handle: 'main-menu', items: [] }]);

            // Load AI Config if exists, otherwise use defaults
            if (projectToLoad.aiAssistantConfig) {
                setAiAssistantConfig(projectToLoad.aiAssistantConfig);
            } else {
                // Reset to defaults for projects without AI config
                setAiAssistantConfig({
                    agentName: 'Quimera Bot',
                    tone: 'Professional',
                    languages: 'English, Spanish',
                    businessProfile: '',
                    productsServices: '',
                    policiesContact: '',
                    specialInstructions: '',
                    faqs: [],
                    knowledgeDocuments: [],
                    knowledgeLinks: [],
                    widgetColor: '#4f46e5',
                    isActive: true,
                    leadCaptureEnabled: true,
                    enableLiveVoice: false,
                    voiceName: 'Zephyr'
                });
            }

            // Load SEO Config if exists, otherwise use defaults
            if (projectToLoad.seoConfig) {
                setSeoConfig(projectToLoad.seoConfig);
            } else {
                // Set default SEO config for projects without one
                setSeoConfig({
                    title: projectToLoad.name || 'My Website',
                    description: loadedData.hero?.subheadline || 'Powered by Quimera.ai',
                    keywords: [],
                    language: 'es',
                    ogType: 'website',
                    twitterCard: 'summary_large_image',
                    schemaType: 'WebSite',
                    robots: 'index, follow',
                    aiCrawlable: true,
                } as SEOConfig);
            }

            if (navigateToEditor) {
                // Update view state immediately for responsive UI
                setView('editor');
                // Navigate using router to update URL properly
                router.navigateToEditor(projectId);
            }

            if (fromAdmin && projectToLoad.status === 'Template') {
                setIsEditingTemplate(true);
            } else {
                setIsEditingTemplate(false);
            }
        }
    };

    const exitTemplateEditor = () => {
        setIsEditingTemplate(false);
        setView('superadmin');
    };

    const renameActiveProject = async (newName: string) => {
        if (!activeProjectId || !user || !activeProject) return;
        const newLastUpdated = new Date().toISOString();
        try {
            // If it's a template, also update the global templates collection
            if (activeProject.status === 'Template') {
                const userRole = userDocument?.role || '';
                if (!['owner', 'superadmin'].includes(userRole)) {
                    console.warn("Only superadmin/owner can rename templates");
                    return;
                }

                // Update global templates collection
                const templateDocRef = doc(db, 'templates', activeProjectId);
                await updateDoc(templateDocRef, { name: newName, lastUpdated: newLastUpdated });

                // Also update in user's projects collection if it exists there
                try {
                    const projectDocRef = doc(db, 'users', user.uid, 'projects', activeProjectId);
                    await updateDoc(projectDocRef, { name: newName, lastUpdated: newLastUpdated });
                } catch (err) {
                    // It's okay if the project doesn't exist in user's collection
                    console.log("Template not found in user's projects collection, continuing...");
                }
            } else {
                // Regular project - update in user's collection
                const projectDocRef = doc(db, 'users', user.uid, 'projects', activeProjectId);
                await updateDoc(projectDocRef, { name: newName, lastUpdated: newLastUpdated });
            }

            // Update local state
            setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, name: newName, lastUpdated: newLastUpdated } : p));
        } catch (error) {
            console.error("Error renaming project:", error);
        }
    };

    const updateProjectThumbnail = async (projectId: string, file: File) => {
        if (!user) return;

        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const newLastUpdated = new Date().toISOString();

        try {
            // Upload image to storage - always use user's folder to avoid permission issues
            const fileName = `${Date.now()}_${file.name}`;
            const storagePath = `user_uploads/${user.uid}/thumbnails/${projectId}_${fileName}`;

            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Update in Firestore
            if (project.status === 'Template') {
                const userRole = userDocument?.role || '';
                if (!['owner', 'superadmin'].includes(userRole)) {
                    console.warn("Only superadmin/owner can update template thumbnails");
                    return;
                }

                const templateDocRef = doc(db, 'templates', projectId);
                await updateDoc(templateDocRef, { thumbnailUrl: downloadURL, lastUpdated: newLastUpdated });
            } else {
                const projectDocRef = doc(db, 'users', user.uid, 'projects', projectId);
                await updateDoc(projectDocRef, { thumbnailUrl: downloadURL, lastUpdated: newLastUpdated });
            }

            // Update local state
            setProjects(prev => prev.map(p =>
                p.id === projectId ? { ...p, thumbnailUrl: downloadURL, lastUpdated: newLastUpdated } : p
            ));

            console.log("✅ Thumbnail updated successfully");
        } catch (error) {
            console.error("Error updating thumbnail:", error);
            throw error;
        }
    };

    const updateProjectFavicon = async (projectId: string, file: File) => {
        if (!user) return;

        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const newLastUpdated = new Date().toISOString();

        try {
            // Upload favicon to storage - use user_uploads path which has proper permissions
            const fileName = `${Date.now()}_${file.name}`;
            const storagePath = project.status === 'Template'
                ? `user_uploads/${user.uid}/templates/${projectId}/favicon_${fileName}`
                : `user_uploads/${user.uid}/projects/${projectId}/favicon_${fileName}`;

            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Update in Firestore
            if (project.status === 'Template') {
                const userRole = userDocument?.role || '';
                if (!['owner', 'superadmin'].includes(userRole)) {
                    console.warn("Only superadmin/owner can update template favicons");
                    return;
                }

                const templateDocRef = doc(db, 'templates', projectId);
                await updateDoc(templateDocRef, { faviconUrl: downloadURL, lastUpdated: newLastUpdated });
            } else {
                const projectDocRef = doc(db, 'users', user.uid, 'projects', projectId);
                await updateDoc(projectDocRef, { faviconUrl: downloadURL, lastUpdated: newLastUpdated });
            }

            // Update local state
            setProjects(prev => prev.map(p =>
                p.id === projectId ? { ...p, faviconUrl: downloadURL, lastUpdated: newLastUpdated } : p
            ));

            console.log("✅ Favicon updated successfully");
        } catch (error) {
            console.error("Error updating favicon:", error);
            throw error;
        }
    };

    const saveProject = async () => {
        if (!activeProject || !data || !user) return;

        // Update Thumbnail with Hero Image if available
        let thumbnailUrl = activeProject.thumbnailUrl;
        if (data.hero.imageUrl && data.hero.imageUrl.trim() !== '') {
            thumbnailUrl = data.hero.imageUrl;
        }

        const updatedProject: Project = {
            ...activeProject,
            data,
            theme,
            brandIdentity,
            componentOrder,
            sectionVisibility,
            thumbnailUrl,
            menus,
            aiAssistantConfig, // Include AI Config in save
            lastUpdated: new Date().toISOString()
        };

        const { id, ...dataToSave } = updatedProject;

        try {
            // Handle Template saving - only for superadmin/owner
            if (activeProject.status === 'Template') {
                const userRole = userDocument?.role || '';
                if (!['owner', 'superadmin'].includes(userRole)) {
                    console.warn("Only superadmin/owner can save templates");
                    return;
                }

                // Save to global templates collection
                const templateDocRef = doc(db, 'templates', activeProject.id);
                await setDoc(templateDocRef, dataToSave);

                setProjects(prev => prev.map(p => p.id === activeProject.id ? updatedProject : p));
                console.log('✅ Template saved to Firestore (global templates collection)');
                return;
            }

            // Save regular user project
            const projectDocRef = doc(db, 'users', user.uid, 'projects', activeProject.id);
            await setDoc(projectDocRef, dataToSave);

            setProjects(prev => prev.map(p => p.id === activeProject.id ? updatedProject : p));
            console.log('✅ Project saved to Firestore');
        } catch (error) {
            console.error("Error saving project:", error);
        }
    };

    const exportProjectAsHtml = () => {
        if (!activeProject) return;
        const html = generateHtml(activeProject);
        const blob = new Blob([html], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${activeProject.name.replace(/\s+/g, '-')}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    // Helper function to update nested object using dot notation string path
    const updateNestedData = (obj: any, path: string, value: any) => {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
    };

    const hydrateProjectImages = async (project: Project) => {
        if (!user || !project.imagePrompts) return;

        // Check for API Key before starting heavy ops
        if (hasApiKey === false) {
            await promptForKeySelection();
        }

        console.log("Auto-generating images for project...");
        const prompts = project.imagePrompts;
        const newProjectData = JSON.parse(JSON.stringify(project.data));
        let hasUpdates = false;
        let newThumbnailUrl = project.thumbnailUrl; // Track the potential new thumbnail

        // To avoid rate limits and massive parallel requests, we process sequentially
        for (const [path, prompt] of Object.entries(prompts)) {
            try {
                // Use high quality model for initial generation
                const imageUrl = await generateImage(prompt, { aspectRatio: '16:9', style: 'Photorealistic' });
                updateNestedData(newProjectData, path, imageUrl);
                hasUpdates = true;

                // If we generated the hero image, update the project thumbnail
                if (path === 'hero.imageUrl') {
                    newThumbnailUrl = imageUrl;
                }

                // Update state incrementally to show progress if currently viewing
                if (activeProjectId === project.id) {
                    setData(prev => {
                        if (!prev) return null;
                        const updated = JSON.parse(JSON.stringify(prev));
                        updateNestedData(updated, path, imageUrl);
                        return updated;
                    });
                }
            } catch (e) {
                console.error(`Failed to generate image for ${path}:`, e);
            }
        }

        if (hasUpdates) {
            // Save final state to Firestore to persist generated images
            try {
                const projectDocRef = doc(db, 'users', user.uid, 'projects', project.id);
                await updateDoc(projectDocRef, {
                    data: newProjectData,
                    thumbnailUrl: newThumbnailUrl // Save the thumbnail URL
                });
                // Update project list state
                setProjects(prev => prev.map(p => p.id === project.id ? { ...p, data: newProjectData, thumbnailUrl: newThumbnailUrl } : p));
            } catch (err) {
                console.error("Failed to save hydrated project", err);
            }
        }
    };

    // New function with progress callbacks for onboarding wizard
    const generateProjectImagesWithProgress = async (
        project: Project,
        imagePrompts: Record<string, string>,
        onProgress: (current: number, total: number, section: string, imageUrl?: string) => void
    ): Promise<{ success: boolean; generatedImages: Record<string, string>; failedPaths: string[] }> => {
        if (!user) {
            return { success: false, generatedImages: {}, failedPaths: Object.keys(imagePrompts) };
        }

        // Check for API Key before starting
        if (hasApiKey === false) {
            await promptForKeySelection();
        }

        console.log("🖼️ [generateProjectImagesWithProgress] Starting image generation...", {
            projectId: project.id,
            totalPrompts: Object.keys(imagePrompts).length
        });

        const generatedImages: Record<string, string> = {};
        const failedPaths: string[] = [];
        const entries = Object.entries(imagePrompts);
        const newProjectData = JSON.parse(JSON.stringify(project.data));
        let newThumbnailUrl = project.thumbnailUrl;

        // Helper to get aspect ratio based on path
        const getAspectRatioForPath = (path: string): string => {
            if (path.includes('avatar')) return '1:1';
            if (path.includes('team')) return '3:4';
            if (path.includes('hero') || path.includes('slideshow')) return '16:9';
            if (path.includes('menu') || path.includes('portfolio') || path.includes('features')) return '4:3';
            return '16:9';
        };

        // Helper to get section name from path
        const getSectionFromPath = (path: string): string => {
            const section = path.split('.')[0];
            return section.charAt(0).toUpperCase() + section.slice(1);
        };

        for (let i = 0; i < entries.length; i++) {
            const [path, prompt] = entries[i];
            const section = getSectionFromPath(path);
            const aspectRatio = getAspectRatioForPath(path);

            // Report progress start for this image
            onProgress(i, entries.length, section);

            try {
                console.log(`🖼️ [generateProjectImagesWithProgress] Generating image ${i + 1}/${entries.length}: ${path}`);

                const imageUrl = await generateImage(prompt, {
                    aspectRatio,
                    style: 'Photorealistic'
                });

                generatedImages[path] = imageUrl;
                updateNestedData(newProjectData, path, imageUrl);

                // If we generated the hero image, update the project thumbnail
                if (path === 'hero.imageUrl') {
                    newThumbnailUrl = imageUrl;
                }

                // Report progress with the generated image URL
                onProgress(i + 1, entries.length, section, imageUrl);

                console.log(`✅ [generateProjectImagesWithProgress] Image ${i + 1} generated successfully`);

            } catch (error) {
                console.error(`❌ [generateProjectImagesWithProgress] Failed to generate image for ${path}:`, error);
                failedPaths.push(path);
                // Leave the field empty for failed images (will show placeholder)
                updateNestedData(newProjectData, path, '');

                // Still report progress even on failure
                onProgress(i + 1, entries.length, section);
            }
        }

        // Save to Firebase
        if (Object.keys(generatedImages).length > 0 || failedPaths.length > 0) {
            try {
                const projectDocRef = doc(db, 'users', user.uid, 'projects', project.id);
                await updateDoc(projectDocRef, {
                    data: newProjectData,
                    thumbnailUrl: newThumbnailUrl
                });

                // Update project list state
                setProjects(prev => prev.map(p =>
                    p.id === project.id
                        ? { ...p, data: newProjectData, thumbnailUrl: newThumbnailUrl }
                        : p
                ));

                console.log(`💾 [generateProjectImagesWithProgress] Project updated in Firebase`);
            } catch (err) {
                console.error("Failed to save project with generated images", err);
            }
        }

        console.log(`🖼️ [generateProjectImagesWithProgress] Complete. Generated: ${Object.keys(generatedImages).length}, Failed: ${failedPaths.length}`);

        return {
            success: failedPaths.length === 0,
            generatedImages,
            failedPaths
        };
    };

    const createProjectFromTemplate = async (templateId: string, newName?: string) => {
        if (!user) return;
        const template = projects.find(p => p.id === templateId);
        if (template) {
            const { id, ...templateData } = template;

            // Filter disabled components
            const validComponentOrder = templateData.componentOrder.filter(
                (comp: PageSection) => componentStatus[comp] !== false
            );

            const validSectionVisibility = Object.keys(templateData.sectionVisibility).reduce((acc, key) => {
                const section = key as PageSection;
                acc[section] = templateData.sectionVisibility[section] && componentStatus[section];
                return acc;
            }, {} as Record<PageSection, boolean>);

            const newProjectData = {
                ...templateData,
                name: newName || `${template.name} Copy`,
                status: 'Draft' as 'Draft',
                lastUpdated: new Date().toISOString(),
                sourceTemplateId: template.id,
                componentOrder: validComponentOrder,
                sectionVisibility: validSectionVisibility,
            };

            try {
                const projectsCol = collection(db, 'users', user.uid, 'projects');
                const docRef = await addDoc(projectsCol, newProjectData);

                const newProject: Project = { ...newProjectData, id: docRef.id };

                setProjects(prev => [newProject, ...prev]);
                loadProject(newProject.id);

                // Trigger Image Auto-Generation
                if (newProject.imagePrompts && Object.keys(newProject.imagePrompts).length > 0) {
                    hydrateProjectImages(newProject);
                }

            } catch (error) {
                console.error("Error creating project from template:", error);
            }
        }
    };

    const addNewProject = async (project: Project): Promise<string> => {
        console.log("🚀 [addNewProject] Starting...", {
            projectId: project.id,
            projectName: project.name,
            hasUser: !!user,
            userId: user?.uid
        });

        if (!user) {
            const error = new Error("❌ User not authenticated - cannot save project");
            console.error(error.message);
            throw error;
        }

        const { id: providedId, ...projectData } = project;
        const now = new Date().toISOString();
        const dataToSave = {
            ...projectData,
            createdAt: projectData.createdAt || now,
            lastUpdated: now
        };

        try {
            console.log("💾 [addNewProject] Saving to Firebase...", {
                userId: user.uid,
                projectName: project.name,
                providedId
            });

            let finalId = providedId;
            if (providedId) {
                const docRef = doc(db, 'users', user.uid, 'projects', providedId);
                await setDoc(docRef, dataToSave);
            } else {
                const projectsCol = collection(db, 'users', user.uid, 'projects');
                const docRef = await addDoc(projectsCol, dataToSave);
                finalId = docRef.id;
            }

            console.log("✅ [addNewProject] Saved successfully!", {
                docId: finalId,
                projectName: project.name
            });

            const newProjectWithId: Project = { ...dataToSave, id: finalId as string };

            setProjects(prev => {
                console.log("📋 [addNewProject] Updating projects state...", {
                    previousCount: prev.length,
                    newCount: prev.length + 1
                });
                return [newProjectWithId, ...prev];
            });

            console.log("🔄 [addNewProject] Loading project into editor...");
            // Use the object directly to avoid race condition with state update
            loadProject(newProjectWithId.id, false, true, newProjectWithId);

            // Initialize Email Settings with Project Colors
            try {
                console.log("📧 [addNewProject] Initializing email settings with project colors...");
                const settingsPath = `users/${user.uid}/projects/${newProjectWithId.id}/settings/email`;
                const settingsRef = doc(db, settingsPath);

                // Construct default settings with project colors
                const emailSettings: Partial<EmailSettings> = {
                    ...defaultEmailSettings,
                    primaryColor: project.theme?.globalColors?.primary || defaultEmailSettings.primaryColor,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };

                await setDoc(settingsRef, emailSettings);
                console.log("✅ [addNewProject] Initialized email settings with primary color:", emailSettings.primaryColor);
            } catch (emailError) {
                console.warn("⚠️ [addNewProject] Failed to initialize email settings:", emailError);
                // Non-blocking error, allow project creation to complete
            }

            // Trigger Image Auto-Generation for Wizard-created projects
            if (newProjectWithId.imagePrompts && Object.keys(newProjectWithId.imagePrompts).length > 0) {
                console.log("🖼️ [addNewProject] Starting image generation...", {
                    promptCount: Object.keys(newProjectWithId.imagePrompts).length
                });
                hydrateProjectImages(newProjectWithId);
            }

            console.log("🎉 [addNewProject] Complete! Project ID:", finalId);
            return finalId as string;

        } catch (error) {
            console.error("❌ [addNewProject] CRITICAL ERROR:", error);
            console.error("❌ [addNewProject] Error details:", {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : 'No stack trace',
                userId: user.uid,
                projectName: project.name
            });
            throw error; // Re-throw to let caller handle it
        }
    };

    const createNewTemplate = async () => {
        if (!user) return;

        const userRole = userDocument?.role || '';
        if (!['owner', 'superadmin'].includes(userRole)) {
            console.warn("Only superadmin/owner can create templates");
            return;
        }

        // Always use initialData for new templates - generic dummy content
        const newTemplateId = `template-${Date.now()}`;
        const newTemplate: Project = {
            id: newTemplateId,
            name: 'New Custom Template',
            status: 'Template' as const,
            data: JSON.parse(JSON.stringify(initialData.data)), // Deep clone to avoid mutations
            theme: JSON.parse(JSON.stringify(initialData.theme)),
            brandIdentity: JSON.parse(JSON.stringify(initialData.brandIdentity)),
            componentOrder: [...initialData.componentOrder],
            sectionVisibility: { ...initialData.sectionVisibility },
            thumbnailUrl: '',
            lastUpdated: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isArchived: false,
            category: 'General',
            tags: [],
            description: 'New template with placeholder content',
            isFeatured: false,
            author: 'Quimera AI',
            version: '1.0.0'
        };

        // Save to Firestore immediately
        try {
            const { id, ...dataToSave } = newTemplate;
            const templateDocRef = doc(db, 'templates', newTemplateId);
            await setDoc(templateDocRef, dataToSave);

            setProjects(prev => [...prev, newTemplate]);
            loadProject(newTemplate.id, true);
            console.log('✅ New template created and saved to Firestore');
        } catch (error) {
            console.error("Error creating template:", error);
            // Still add locally for UX, but warn user
            setProjects(prev => [...prev, newTemplate]);
            loadProject(newTemplate.id, true);
        }
    };

    const archiveTemplate = async (templateId: string, isArchived: boolean) => {
        if (!user) return;

        const userRole = userDocument?.role || '';
        if (!['owner', 'superadmin'].includes(userRole)) {
            console.warn("Only superadmin/owner can archive templates");
            return;
        }

        // Update locally first (optimistic update)
        setProjects(prev => prev.map(p => p.id === templateId ? { ...p, isArchived } : p));

        // Persist to Firestore
        try {
            const templateDocRef = doc(db, 'templates', templateId);
            await updateDoc(templateDocRef, {
                isArchived,
                lastUpdated: new Date().toISOString()
            });
            console.log(`✅ Template ${isArchived ? 'archived' : 'unarchived'} in Firestore`);
        } catch (error) {
            console.error("Error archiving template:", error);
            // Revert on failure
            setProjects(prev => prev.map(p => p.id === templateId ? { ...p, isArchived: !isArchived } : p));
        }
    };

    const duplicateTemplate = async (templateId: string) => {
        if (!user) return;

        const userRole = userDocument?.role || '';
        if (!['owner', 'superadmin'].includes(userRole)) {
            console.warn("Only superadmin/owner can duplicate templates");
            return;
        }

        const template = projects.find(p => p.id === templateId);
        if (!template) return;

        const newTemplateId = `template-${Date.now()}`;
        const duplicatedTemplate: Project = {
            ...template,
            id: newTemplateId,
            name: `${template.name} (Copy)`,
            lastUpdated: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isArchived: false,
        };

        // Save to Firestore
        try {
            const { id, ...dataToSave } = duplicatedTemplate;
            const templateDocRef = doc(db, 'templates', newTemplateId);
            await setDoc(templateDocRef, dataToSave);

            setProjects(prev => [...prev, duplicatedTemplate]);
            console.log('✅ Template duplicated and saved to Firestore');
        } catch (error) {
            console.error("Error duplicating template:", error);
            // Still add locally for UX
            setProjects(prev => [...prev, duplicatedTemplate]);
        }
    };

    // Update a template in local state (used after saving to Firestore)
    const updateTemplateInState = (templateId: string, updates: Partial<Project>) => {
        setProjects(prev => prev.map(p =>
            p.id === templateId ? { ...p, ...updates } : p
        ));
    };

    const deleteProject = async (projectId: string) => {
        if (!projectId) return;

        const projectToDelete = projects.find(p => p.id === projectId);
        const isTemplate = projectToDelete ? projectToDelete.status === 'Template' : false;

        // CRITICAL: Cancel any pending auto-save timer BEFORE deleting
        // This prevents race conditions where auto-save could recreate the deleted project
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = null;
            console.log('🛑 [Delete] Auto-save timer cancelled to prevent recreation');
        }

        // 1. Handle Templates - Delete from Firestore (only superadmin/owner)
        if (isTemplate) {
            const userRole = userDocument?.role || '';
            if (!['owner', 'superadmin'].includes(userRole)) {
                console.warn("Only superadmin/owner can delete templates");
                throw new Error("Solo el owner y super admin pueden borrar templates");
            }

            // Optimistic Update - also update projectsRef immediately to prevent race conditions
            setProjects(prev => {
                const filtered = prev.filter(p => p.id !== projectId);
                projectsRef.current = filtered; // Sync ref immediately
                return filtered;
            });
            if (activeProjectId === projectId) {
                setActiveProjectId(null);
                setData(null);
                setView('dashboard');
            }

            // Mark template as deleted in Firestore (instead of deleting, to prevent hardcoded templates from reappearing)
            try {
                const templateDocRef = doc(db, 'templates', projectId);
                // Mark as deleted instead of deleting - this prevents hardcoded templates from reappearing
                await setDoc(templateDocRef, {
                    isDeleted: true,
                    deletedAt: new Date().toISOString(),
                    name: projectToDelete?.name || 'Deleted Template'
                });

                // Also persist to local cache to prevent reappearing on errors/logout
                deletedTemplateIdsRef.current.add(projectId);
                const idsToStore = [...deletedTemplateIdsRef.current];
                localStorage.setItem('deletedTemplateIds', JSON.stringify(idsToStore));

                console.log('✅ Template marked as deleted in Firestore and cached locally');
                console.log('🔍 [Delete] Saved to localStorage:', idsToStore);
                console.log('🔍 [Delete] Verification - localStorage now contains:', localStorage.getItem('deletedTemplateIds'));
            } catch (error: any) {
                console.error("Error marking template as deleted:", error);
                // Revert state on failure
                if (projectToDelete) {
                    setProjects(prev => {
                        const reverted = [...prev, projectToDelete];
                        projectsRef.current = reverted; // Sync ref on revert
                        return reverted;
                    });
                }
            }
            return;
        }

        // 2. Handle User Projects
        if (!user) {
            throw new Error("User not authenticated");
        }

        // Optimistic Update - also update projectsRef immediately to prevent race conditions
        setProjects(prev => {
            const filtered = prev.filter(p => p.id !== projectId);
            projectsRef.current = filtered; // Sync ref immediately
            return filtered;
        });
        if (activeProjectId === projectId) {
            setActiveProjectId(null);
            setData(null);
            setView('dashboard');
        }

        try {
            const projectDocRef = doc(db, 'users', user.uid, 'projects', projectId);
            await deleteDoc(projectDocRef);
            console.log('✅ Project deleted from Firestore:', projectId);
        } catch (error: any) {
            console.error("Error deleting project:", error);
            // Revert state on failure
            if (projectToDelete) {
                setProjects(prev => {
                    const reverted = [...prev, projectToDelete];
                    projectsRef.current = reverted; // Sync ref on revert
                    return reverted;
                });
            }
            throw error;
        }
    };

    const uploadFile = async (file: File): Promise<string | undefined> => {
        if (!user) throw new Error("Authentication required to upload files.");
        if (!activeProjectId) throw new Error("No active project to upload file to.");
        setIsFilesLoading(true);
        try {
            // Project-scoped storage path
            const storageRef = ref(storage, `users/${user.uid}/projects/${activeProjectId}/files/${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const newFileRecord: Omit<FileRecord, 'id'> = {
                name: file.name,
                storagePath: snapshot.ref.fullPath,
                downloadURL,
                size: file.size,
                type: file.type,
                createdAt: serverTimestamp() as any,
                notes: '',
                aiSummary: '',
                projectId: activeProjectId,
                projectName: activeProject?.name
            };

            // Project-scoped Firestore path
            const filesCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/files`);
            const docRef = await addDoc(filesCol, newFileRecord);

            setFiles(prev => [{ id: docRef.id, ...newFileRecord, createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } } as FileRecord, ...prev]);

            return downloadURL;

        } catch (error) {
            console.error("[EditorContext] Error uploading file:", error);
            throw error;
        } finally {
            setIsFilesLoading(false);
        }
    };

    const deleteFile = async (fileId: string, storagePath: string) => {
        if (!user || !activeProjectId) return;
        try {
            const fileRef = ref(storage, storagePath);
            await deleteObject(fileRef);

            // Project-scoped Firestore path
            const fileDocRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/files/${fileId}`);
            await deleteDoc(fileDocRef);

            setFiles(prev => prev.filter(f => f.id !== fileId));
        } catch (error) {
            console.error("[EditorContext] Error deleting file:", error);
        }
    };

    const updateFileNotes = async (fileId: string, notes: string) => {
        if (!user || !activeProjectId) return;
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, notes } : f));
        try {
            // Project-scoped Firestore path
            const fileDocRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/files/${fileId}`);
            await updateDoc(fileDocRef, { notes });
        } catch (error) {
            console.error("[EditorContext] Error updating file notes:", error);
        }
    };

    // --- Global Files Logic (Super Admin) ---

    const fetchGlobalFiles = async () => {
        setIsGlobalFilesLoading(true);
        try {
            const filesCol = collection(db, 'global_files');
            const q = query(filesCol, orderBy('createdAt', 'desc'));
            const filesSnapshot = await getDocs(q);
            const files = filesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileRecord));
            setGlobalFiles(files);
        } catch (error) {
            console.error("Error loading global files:", error);
            setGlobalFiles([]);
        } finally {
            setIsGlobalFilesLoading(false);
        }
    };

    const uploadGlobalFile = async (file: File) => {
        // Todos los usuarios pueden subir archivos globales
        setIsGlobalFilesLoading(true);
        try {
            const storageRef = ref(storage, `global_assets/${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const newFileRecord: Omit<FileRecord, 'id'> = {
                name: file.name,
                storagePath: snapshot.ref.fullPath,
                downloadURL,
                size: file.size,
                type: file.type,
                createdAt: serverTimestamp() as any,
                notes: 'Global Asset',
                aiSummary: ''
            };

            const filesCol = collection(db, 'global_files');
            const docRef = await addDoc(filesCol, newFileRecord);

            setGlobalFiles(prev => [{ id: docRef.id, ...newFileRecord, createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } } as FileRecord, ...prev]);
        } catch (error) {
            console.error("Error uploading global file:", error);
        } finally {
            setIsGlobalFilesLoading(false);
        }
    };

    const deleteGlobalFile = async (fileId: string, storagePath: string) => {
        // Todos los usuarios pueden eliminar archivos globales
        try {
            const fileRef = ref(storage, storagePath);
            await deleteObject(fileRef);

            const fileDocRef = doc(db, 'global_files', fileId);
            await deleteDoc(fileDocRef);

            setGlobalFiles(prev => prev.filter(f => f.id !== fileId));
        } catch (error) {
            console.error("Error deleting global file:", error);
        }
    };


    const handleApiError = (error: any) => {
        if (error?.message?.includes('API key not valid') || error?.message?.includes('Requested entity was not found')) {
            console.warn('API key error detected. Resetting key state.');
            setCachedApiKey(null);
            setHasApiKey(false);
        }
    };

    const promptForKeySelection = async () => {
        console.log('🔑 [promptForKeySelection] Attempting to get API key...');
        const aiStudio = typeof window !== 'undefined' ? (window as any).aistudio : undefined;

        if (typeof aiStudio?.openSelectKey === 'function') {
            console.log('🔑 [promptForKeySelection] AI Studio available, opening key selector...');
            await aiStudio.openSelectKey();
            const key = await syncApiKeyFromAiStudio();
            setHasApiKey(Boolean(key));
            if (key) {
                console.log('✅ [promptForKeySelection] API key obtained successfully');
            }
        } else {
            console.warn('⚠️ [promptForKeySelection] AI Studio not available');
            // Show a user-friendly message
            alert('Para usar las funciones de IA, necesitas configurar una API key de Google AI. Por favor, ve a la configuración de tu cuenta o contacta al administrador.');
        }
    };

    const generateFileSummary = async (fileId: string, downloadURL: string) => {
        if (!user || !activeProjectId) return;
        if (hasApiKey === false) {
            await promptForKeySelection();
            return;
        }
        const summaryPrompt = getPrompt('file-summary');
        if (!summaryPrompt) {
            console.error("File summary prompt not found.");
            return;
        }

        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, aiSummary: 'Generating...' } : f));

        try {
            const fileResponse = await fetch(downloadURL);
            if (!fileResponse.ok) throw new Error('Failed to fetch file for summary.');
            const fileContent = await fileResponse.text();

            const populatedPrompt = summaryPrompt.template.replace('{{fileContent}}', fileContent);

            const projectIdForApi = activeProject?.id || 'file-summary';
            const response = await generateContentViaProxy(projectIdForApi, populatedPrompt, summaryPrompt.model, {}, user.uid);

            // Log API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: summaryPrompt.model,
                    feature: 'file-summary',
                    success: true
                });
            }

            const summary = extractTextFromResponse(response).trim();

            // Project-scoped Firestore path
            const fileDocRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/files/${fileId}`);
            await updateDoc(fileDocRef, { aiSummary: summary });

            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, aiSummary: summary } : f));
        } catch (error: any) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: summaryPrompt.model,
                    feature: 'file-summary',
                    success: false,
                    errorMessage: error.message || 'Unknown error'
                });
            }
            handleApiError(error);
            console.error("[EditorContext] Error generating file summary:", error);
            const errorMessage = 'Error generating summary.';
            // Project-scoped Firestore path
            const fileDocRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/files/${fileId}`);
            await updateDoc(fileDocRef, { aiSummary: errorMessage });
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, aiSummary: errorMessage } : f));
        }
    };

    const uploadImageAndGetURL = async (file: File, path: string): Promise<string> => {
        if (!user) {
            throw new Error("User not authenticated for image upload.");
        }
        try {
            const storageRef = ref(storage, `user_uploads/${user.uid}/${path}/${Date.now()}-${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error("Error uploading image:", error);
            throw error;
        }
    };

    const enhancePrompt = async (draftPrompt: string, referenceImages?: string[]): Promise<string> => {
        if (!user) throw new Error("Authentication required to enhance prompts.");

        let enhanceModel = 'gemini-2.5-flash';
        const enhancerPrompt = getPrompt('image-prompt-enhancer');
        let promptTemplate = `Enhance this image generation prompt to be more detailed and descriptive for AI image generation. Keep it under 200 words. Original: "{{originalPrompt}}"`;

        if (enhancerPrompt) {
            enhanceModel = enhancerPrompt.model;
            promptTemplate = enhancerPrompt.template;
        }

        // Prepare template variables
        const hasReferenceImages = referenceImages && referenceImages.length > 0;
        const referenceImagesInstruction = hasReferenceImages
            ? `**ANALYZE THE REFERENCE IMAGES PROVIDED BELOW:** The user has uploaded ${referenceImages.length} reference image(s). Carefully examine the visual style, composition, color palette, lighting, mood, and artistic techniques present in these images. Incorporate these visual elements into your enhanced prompt to help Quimera Vision Pro generate an image that matches or is inspired by the reference images.`
            : 'No reference images provided. Focus on enhancing the text prompt with rich descriptive details.';

        const filledPrompt = promptTemplate
            .replace('{{originalPrompt}}', draftPrompt)
            .replace('{{hasReferenceImages}}', hasReferenceImages ? `YES (${referenceImages.length} image(s) provided)` : 'NO')
            .replace('{{referenceImagesInstruction}}', referenceImagesInstruction);

        // 🔐 SECURE: Use proxy in production to keep API key safe
        const useProxy = shouldUseProxy();
        console.log(`✨ [enhancePrompt] Mode: ${useProxy ? 'PROXY (secure)' : 'DIRECT (development)'}`);

        try {
            if (useProxy) {
                // Use secure proxy for prompt enhancement in production
                console.log('✨ [enhancePrompt] Enhancing via proxy:', {
                    model: enhanceModel,
                    hasReferenceImages,
                    promptLength: draftPrompt.length
                });

                const proxyResponse = await generateContentViaProxy(
                    activeProject?.id || 'enhance-prompt',
                    filledPrompt,
                    enhanceModel,
                    { temperature: 0.8 },
                    user.uid
                );

                // Log API call
                logApiCall({
                    userId: user.uid,
                    model: enhanceModel,
                    feature: 'image-prompt-enhancer-proxy',
                    success: true
                });

                return extractTextFromResponse(proxyResponse).trim();
            }

            // Always use secure proxy
            console.log('🔐 [enhancePrompt] Using secure proxy for enhancement');

            const proxyProjectId = activeProject?.id || 'enhance-prompt-fallback';
            const proxyResponse = await generateContentViaProxy(
                proxyProjectId,
                filledPrompt,
                enhanceModel,
                { temperature: 0.8 },
                user.uid
            );

            // Log API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: enhanceModel,
                    feature: 'image-prompt-enhancer',
                    success: true
                });
            }

            return extractTextFromResponse(proxyResponse).trim();
        } catch (error: any) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: enhanceModel,
                    feature: 'image-prompt-enhancer',
                    success: false,
                    errorMessage: error.message || 'Unknown error'
                });
            }
            handleApiError(error);
            console.error("Prompt enhancement failed:", error);
            return draftPrompt; // Fallback to original
        }
    };

    const generateImage = async (prompt: string, options?: {
        aspectRatio?: string,
        style?: string,
        destination?: 'user' | 'global',
        resolution?: '1K' | '2K' | '4K',
        // Quimera AI specific options
        model?: string,
        thinkingLevel?: string,
        personGeneration?: string,
        temperature?: number,
        negativePrompt?: string,
        // Visual controls
        lighting?: string,
        cameraAngle?: string,
        colorGrading?: string,
        themeColors?: string,
        depthOfField?: string,
        referenceImage?: string,
        referenceImages?: string[]
    }): Promise<string> => {
        if (!user) throw new Error("Authentication required to generate images.");

        // FORCE user destination for now to avoid Firebase Storage permission issues
        // Only allow 'global' if explicitly set AND user has proper role
        let destination: 'user' | 'global' = 'user';
        if (options?.destination === 'global') {
            const allowedRoles = ['superadmin', 'owner', 'admin'];
            if (allowedRoles.includes(userDocument?.role || '')) {
                destination = 'global';
            }
        }
        console.log('🖼️ generateImage destination:', destination, 'requested:', options?.destination);

        // 🔐 SECURE: Use proxy in production to keep API key safe
        const useProxy = shouldUseProxy();
        console.log(`🎨 Image generation mode: ${useProxy ? 'PROXY (secure)' : 'DIRECT (development)'}`);

        if (useProxy) {
            // Use secure proxy for image generation in production
            try {
                const proxyResponse = await generateImageViaProxy(user.uid, prompt, {
                    aspectRatio: options?.aspectRatio,
                    style: options?.style,
                    resolution: options?.resolution,
                    // Quimera AI specific options
                    model: options?.model,
                    thinkingLevel: options?.thinkingLevel,
                    personGeneration: options?.personGeneration,
                    temperature: options?.temperature,
                    negativePrompt: options?.negativePrompt,
                    // Visual controls
                    lighting: options?.lighting,
                    cameraAngle: options?.cameraAngle,
                    colorGrading: options?.colorGrading,
                    themeColors: options?.themeColors,
                    depthOfField: options?.depthOfField,
                    // Reference images for style transfer
                    referenceImages: options?.referenceImages
                });

                // Convert Base64 to Blob for upload
                const byteCharacters = atob(proxyResponse.image);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: proxyResponse.mimeType || 'image/png' });

                // Upload to Storage
                const fileName = `generated-ai-${Date.now()}.${proxyResponse.mimeType?.includes('png') ? 'png' : 'jpg'}`;
                let storagePath = '';
                let firestoreCol;

                if (destination === 'global') {
                    storagePath = `global_assets/generated/${fileName}`;
                    firestoreCol = collection(db, 'global_files');
                } else if (activeProjectId) {
                    // Project-scoped path
                    storagePath = `users/${user.uid}/projects/${activeProjectId}/files/generated/${fileName}`;
                    firestoreCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/files`);
                } else {
                    // Fallback to user-level if no project (legacy)
                    storagePath = `user_uploads/${user.uid}/generated/${fileName}`;
                    firestoreCol = collection(db, 'users', user.uid, 'files');
                }

                const storageRef = ref(storage, storagePath);
                const snapshot = await uploadBytes(storageRef, blob);
                const downloadURL = await getDownloadURL(snapshot.ref);

                // Create DB Record with simplified notes (just the prompt)
                const newFileRecord: Omit<FileRecord, 'id'> = {
                    name: fileName,
                    storagePath: snapshot.ref.fullPath,
                    downloadURL,
                    size: blob.size,
                    type: proxyResponse.mimeType || 'image/png',
                    createdAt: serverTimestamp() as any,
                    notes: prompt,
                    aiSummary: '',
                    // Only include projectId if it exists (Firestore doesn't accept undefined)
                    ...(activeProjectId ? { projectId: activeProjectId } : {})
                };

                const docRef = await addDoc(firestoreCol, newFileRecord);

                // Update State
                const fullRecord = { id: docRef.id, ...newFileRecord, createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } } as FileRecord;

                if (destination === 'global') {
                    setGlobalFiles(prev => [fullRecord, ...prev]);
                } else {
                    setFiles(prev => [fullRecord, ...prev]);
                }

                // Log API call
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id || 'no-project',
                    model: 'proxy-image-generation',
                    feature: 'image-generation-proxy',
                    success: true
                });

                return downloadURL;
            } catch (error: any) {
                console.error("Proxy image generation failed:", error);
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id || 'no-project',
                    model: 'proxy-image-generation',
                    feature: 'image-generation-proxy',
                    success: false,
                    errorMessage: error.message || 'Unknown error'
                });
                throw error;
            }
        }

        // Development mode: use direct API call
        if (hasApiKey === false) {
            await promptForKeySelection();
            throw new Error("Please select an API key first.");
        }

        const ai = await getGoogleGenAI();

        const galleryPromptConfig = getPrompt('image-generation-gallery');
        // Use model from options if provided, otherwise use config or default to Quimera Vision Pro
        let modelName = options?.model || galleryPromptConfig?.model || 'gemini-3-pro-image-preview';
        let promptTemplate = '{{prompt}}, {{style}}, professional high quality photo, {{lighting}}, {{cameraAngle}}, {{colorGrading}}, {{themeColors}}, {{depthOfField}}, no blurry, no distorted text, high quality';

        console.log('✨ [EditorContext] Quimera AI Config:', {
            selectedModel: options?.model,
            configModel: galleryPromptConfig?.model,
            finalModel: modelName,
            thinkingLevel: options?.thinkingLevel,
            personGeneration: options?.personGeneration,
            temperature: options?.temperature,
        });

        if (galleryPromptConfig) {
            promptTemplate = galleryPromptConfig.template;
        }

        // Build final prompt with all parameters and log them
        console.log('🎨 [EditorContext] Received options:', {
            prompt: prompt.substring(0, 50) + '...',
            model: modelName,
            style: options?.style,
            lighting: options?.lighting,
            cameraAngle: options?.cameraAngle,
            colorGrading: options?.colorGrading,
            themeColors: options?.themeColors,
            depthOfField: options?.depthOfField,
            negativePrompt: options?.negativePrompt,
        });

        console.log('📋 [EditorContext] Using template:', promptTemplate);

        // Build the prompt with proper handling
        let finalPrompt = promptTemplate
            .replace('{{prompt}}', prompt)
            .replace('{{style}}', options?.style && options.style !== 'None' ? `${options.style} style` : '')
            .replace('{{lighting}}', options?.lighting ? options.lighting : '')
            .replace('{{cameraAngle}}', options?.cameraAngle ? options.cameraAngle : '')
            .replace('{{colorGrading}}', options?.colorGrading ? options.colorGrading : '')
            .replace('{{themeColors}}', options?.themeColors ? options.themeColors : '')
            .replace('{{depthOfField}}', options?.depthOfField ? options.depthOfField : '');

        console.log('🔄 [EditorContext] After replacements (before cleanup):', finalPrompt);

        // Clean up extra commas and spaces
        finalPrompt = finalPrompt
            .replace(/,\s*,/g, ',')      // Remove duplicate commas
            .replace(/,\s*,/g, ',')      // Run twice to catch triple commas
            .replace(/,\s*$/g, '')       // Remove trailing comma
            .replace(/\s*,\s*/g, ', ')   // Normalize spacing around commas
            .trim();

        console.log('✅ [EditorContext] Final prompt sent to API:', finalPrompt);

        try {
            let base64Image: string | undefined;

            if (modelName.includes('imagen')) {
                // Use Imagen API for image generation (Imagen 4.0)
                const imageConfig: any = {
                    numberOfImages: 1,
                    aspectRatio: (options?.aspectRatio || '1:1') as any,
                };

                // Add image size for Imagen 4.0 (Standard and Ultra support 1K and 2K)
                if (options?.resolution === '4K') {
                    imageConfig.imageSize = '2K'; // Imagen 4.0 max is 2K
                } else if (options?.resolution === '2K') {
                    imageConfig.imageSize = '2K';
                } else if (options?.resolution === '1K') {
                    imageConfig.imageSize = '1K';
                } else {
                    imageConfig.imageSize = '1K'; // Default
                }

                // Add person generation setting
                imageConfig.personGeneration = 'allow_adult';

                // Debug: Log the configuration
                console.log('🎨 Quimera AI Image Generation Config:', {
                    model: modelName,
                    aspectRatio: imageConfig.aspectRatio,
                    imageSize: imageConfig.imageSize,
                    resolution: options?.resolution,
                });

                // Prepare the request
                const generateRequest: any = {
                    model: modelName,
                    prompt: finalPrompt,
                    config: imageConfig,
                };

                // Add reference image if provided (for style transfer/reference)
                if (options?.referenceImage) {
                    // Extract base64 data from data URL
                    const base64Data = options.referenceImage.split(',')[1];
                    generateRequest.referenceImage = {
                        imageBytes: base64Data
                    };
                    // Modify prompt to indicate style transfer
                    generateRequest.prompt = `In the style of the reference image: ${finalPrompt}`;
                }

                const response = await ai.models.generateImages(generateRequest);
                base64Image = response.generatedImages?.[0]?.image?.imageBytes;

                // Log API call
                if (user) {
                    logApiCall({
                        userId: user.uid,
                        projectId: activeProject?.id || 'no-project',
                        model: modelName,
                        feature: 'image-generation-quimera-ai',
                        success: true
                    });
                }
            } else if (modelName.includes('gemini') || modelName.includes('nano')) {
                // Use Quimera Vision Pro (Gemini 3 Pro Image) with advanced config
                // Strategy: Try multiple parameter locations for robust API compatibility
                const generationConfig: any = {
                    temperature: options?.temperature ?? 1.0,  // Use provided temperature or default
                    candidateCount: 1,          // Una imagen por turno
                    responseMimeType: 'image/jpeg',
                    // Add aspect ratio at root level (some SDKs/Models expect it here)
                    aspectRatio: options?.aspectRatio || undefined
                };

                // Also add nested imageConfig (other SDKs/Models expect it here)
                if (options?.aspectRatio) {
                    generationConfig.imageConfig = {
                        aspectRatio: options.aspectRatio
                    };
                }

                // Add negative prompt if provided
                if (options?.negativePrompt) {
                    generationConfig.negativePrompt = options.negativePrompt;
                    // Also append to the main prompt as some models prefer this
                    finalPrompt = `${finalPrompt}. Avoid: ${options.negativePrompt}`;
                }

                // Add person generation setting (use provided or default to allow_adult)
                generationConfig.personGeneration = options?.personGeneration || 'allow_adult';

                // Add thinking level for Gemini 3 Pro (mejora texto en imagen y lógica espacial)
                // Higher thinking = better text rendering and spatial reasoning
                generationConfig.thinkingLevel = options?.thinkingLevel || 'high';

                // FALLBACK STRATEGY: Add aspect ratio to prompt text as well
                // This is the most reliable way if config parameters are ignored
                if (options?.aspectRatio && options.aspectRatio !== '1:1') {
                    finalPrompt = `${finalPrompt}, aspect ratio ${options.aspectRatio}`;
                }

                // Debug: Log the configuration
                console.log('✨ Quimera Vision Pro Full Config:', {
                    model: modelName,
                    aspectRatio: generationConfig.aspectRatio,
                    imageConfig: generationConfig.imageConfig,
                    temperature: generationConfig.temperature,
                    thinkingLevel: generationConfig.thinkingLevel,
                    personGeneration: generationConfig.personGeneration,
                    negativePrompt: options?.negativePrompt,
                    resolution: options?.resolution,
                });

                // Build content parts (text + optional reference images)
                const contentParts: any[] = [];

                // Prepare reference images array (support both singular and plural options)
                const referenceImages = options?.referenceImages || (options?.referenceImage ? [options.referenceImage] : []);

                // Add reference images if provided (Quimera Vision Pro supports up to 14 images)
                if (referenceImages.length > 0) {
                    referenceImages.forEach((imgData) => {
                        // Extract base64 data from data URL
                        const base64Data = imgData.split(',')[1];
                        const mimeType = imgData.split(';')[0].split(':')[1];

                        contentParts.push({
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data
                            }
                        });
                    });

                    // Modify prompt to indicate we're using reference images
                    contentParts.push({
                        text: `Using the provided reference images as style guide: ${finalPrompt}`
                    });
                } else {
                    contentParts.push({ text: finalPrompt });
                }

                try {
                    // Intenta generateContent primero (para modelos Gemini multimodal)
                    // Nota: La SDK espera 'contents' como array de partes o un objeto con role/parts
                    const response = await ai.models.generateContent({
                        model: modelName,
                        contents: [{ role: 'user', parts: contentParts }],
                        config: generationConfig,
                    } as any);

                    // Log API call success
                    if (user) {
                        logApiCall({
                            userId: user.uid,
                            projectId: activeProject?.id || 'no-project',
                            model: modelName,
                            feature: 'image-generation-quimera-ai',
                            success: true
                        });
                    }

                    // Extract image from response parts
                    if (response.candidates && response.candidates[0].content.parts) {
                        for (const part of response.candidates[0].content.parts) {
                            if (part.inlineData) {
                                base64Image = part.inlineData.data;
                                break;
                            }
                        }
                    }
                } catch (error: any) {
                    console.warn(`⚠️ generateContent failed for ${modelName}, trying generateImages fallback...`, error);

                    // Fallback crítico: Si generateContent falla (ej: 404 Not Found), 
                    // intentamos usar la API de imagen dedicada (generateImages) con un modelo SEGURO
                    if (error.message && (error.message.includes('not found') || error.message.includes('404') || error.message.includes('not supported'))) {
                        // Try Fast model which is widely available
                        const fallbackModel = 'imagen-3.0-generate-001';
                        console.log(`🔄 Switching to fallback model: ${fallbackModel}`);

                        const generateRequest: any = {
                            model: fallbackModel,
                            prompt: finalPrompt,
                            config: {
                                aspectRatio: options?.aspectRatio,
                                numberOfImages: 1,
                                personGeneration: 'allow_adult',
                            }
                        };

                        // Si hay imagen de referencia, intentamos pasarla (aunque generateImages a veces requiere otro formato)
                        // Para fallback, usamos solo la primera imagen
                        const refImages = options?.referenceImages || (options?.referenceImage ? [options.referenceImage] : []);
                        if (refImages.length > 0) {
                            const base64Data = refImages[0].split(',')[1];
                            generateRequest.referenceImage = { imageBytes: base64Data };
                            generateRequest.prompt = `Style reference: ${finalPrompt}`;
                        }

                        try {
                            const response = await ai.models.generateImages(generateRequest);
                            base64Image = response.generatedImages?.[0]?.image?.imageBytes;
                        } catch (fallbackError: any) {
                            console.warn(`⚠️ First fallback failed (${fallbackModel}), trying LAST RESORT (imagen-2)...`, fallbackError);

                            // Debug available models if possible
                            try {
                                // Note: listModels might not be directly available on the simple client interface depending on version
                                // But if it is, it helps debug
                                // const models = await ai.models.list(); 
                                // console.log('Available models:', models);
                            } catch (e) { }

                            // ULTIMATE FALLBACK: Imagen 2 (Legacy but reliable)
                            const lastResortRequest = { ...generateRequest, model: 'image-generation-002' };
                            // Remove unsupported params for legacy model if needed, or just retry
                            const response = await ai.models.generateImages(lastResortRequest);
                            base64Image = response.generatedImages?.[0]?.image?.imageBytes;
                        }
                    } else {
                        // Si es otro error (ej: quota, safety), lo lanzamos
                        throw error;
                    }
                }
            }

            if (!base64Image) {
                throw new Error("No image data returned from AI.");
            }

            // Convert Base64 to Blob for upload
            const byteCharacters = atob(base64Image);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });

            // Upload to Storage
            const fileName = `generated-ai-${Date.now()}.jpg`;
            let storagePath = '';
            let firestoreCol;

            if (destination === 'global') {
                storagePath = `global_assets/generated/${fileName}`;
                firestoreCol = collection(db, 'global_files');
            } else if (activeProjectId) {
                // Project-scoped path
                storagePath = `users/${user.uid}/projects/${activeProjectId}/files/generated/${fileName}`;
                firestoreCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/files`);
            } else {
                // Fallback to user-level if no project (legacy)
                storagePath = `user_uploads/${user.uid}/generated/${fileName}`;
                firestoreCol = collection(db, 'users', user.uid, 'files');
            }

            const storageRef = ref(storage, storagePath);
            const snapshot = await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Generate title using Gemini to interpret the image
            let generatedTitle = fileName; // Default fallback
            try {
                const titleResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [
                        {
                            text: 'Generate a short, descriptive title (maximum 5 words) for this image. Only respond with the title, nothing else. No quotes, no explanation.'
                        },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: base64Image
                            }
                        }
                    ]
                });

                const titleText = titleResponse.text?.trim();
                if (titleText && titleText.length > 0 && titleText.length < 100) {
                    // Clean up the title and create a valid filename
                    generatedTitle = titleText
                        .replace(/[^a-zA-Z0-9\s\-áéíóúñüÁÉÍÓÚÑÜ]/g, '') // Remove special chars
                        .trim()
                        .substring(0, 50); // Limit length
                    if (generatedTitle.length === 0) {
                        generatedTitle = fileName;
                    }
                }
            } catch (titleError) {
                console.warn('Could not generate title for image:', titleError);
                // Keep default fileName as title
            }

            // Create DB Record with simplified notes (just the prompt)
            const newFileRecord: Omit<FileRecord, 'id'> = {
                name: generatedTitle,
                storagePath: snapshot.ref.fullPath,
                downloadURL,
                size: blob.size,
                type: 'image/jpeg',
                createdAt: serverTimestamp() as any,
                notes: prompt, // Only the prompt used
                aiSummary: ''
            };

            const docRef = await addDoc(firestoreCol, newFileRecord);

            // Update State
            const fullRecord = { id: docRef.id, ...newFileRecord, createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } } as FileRecord;

            if (destination === 'global') {
                setGlobalFiles(prev => [fullRecord, ...prev]);
            } else {
                setFiles(prev => [fullRecord, ...prev]);
            }

            return downloadURL;

        } catch (error: any) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id || 'no-project',
                    model: modelName,
                    feature: 'image-generation',
                    success: false,
                    errorMessage: error.message || 'Unknown error'
                });
            }
            handleApiError(error);
            console.error("AI Image Generation failed:", error);
            throw error;
        }
    };

    // Navigation Menu Functions
    const saveMenu = async (menu: Menu) => {
        if (!activeProjectId) {
            console.error("Cannot save menu: No active project ID");
            return;
        }

        // Deep clone current menus to avoid reference issues
        const currentMenus = [...menus];
        let updatedMenusList: Menu[] = [];

        if (currentMenus.some(m => m.id === menu.id)) {
            updatedMenusList = currentMenus.map(m => m.id === menu.id ? menu : m);
        } else {
            updatedMenusList = [...currentMenus, menu];
        }

        // 1. Update Menus State (for UI)
        setMenus(updatedMenusList);

        // 2. Update Projects State (CRITICAL for data consistency)
        setProjects(prev => prev.map(p => {
            if (p.id === activeProjectId) {
                // Ensure we update the menus property on the project object
                return { ...p, menus: updatedMenusList };
            }
            return p;
        }));

        // 3. Persist to Firestore
        if (user) {
            try {
                const projectDocRef = doc(db, 'users', user.uid, 'projects', activeProjectId);
                await updateDoc(projectDocRef, { menus: updatedMenusList });
                console.log("Menu saved successfully.");
            } catch (e) {
                console.error("Error saving menu to Firestore:", e);
            }
        }
    };

    const deleteMenu = async (menuId: string) => {
        if (!activeProjectId) return;

        const updatedMenusList = menus.filter(m => m.id !== menuId);

        // 1. Update Menus State
        setMenus(updatedMenusList);

        // 2. Update Projects State
        setProjects(prev => prev.map(p => {
            if (p.id === activeProjectId) {
                return { ...p, menus: updatedMenusList };
            }
            return p;
        }));

        // 3. Persist
        if (user) {
            try {
                const projectDocRef = doc(db, 'users', user.uid, 'projects', activeProjectId);
                await updateDoc(projectDocRef, { menus: updatedMenusList });
            } catch (e) {
                console.error("Error deleting menu from project", e);
            }
        }
    };

    const saveAiAssistantConfig = async (config: AiAssistantConfig) => {
        setAiAssistantConfig(config);
        if (activeProjectId && user) {
            try {
                const projectDocRef = doc(db, 'users', user.uid, 'projects', activeProjectId);
                await updateDoc(projectDocRef, { aiAssistantConfig: config });
            } catch (e) {
                console.error("Error saving AI Assistant Config", e);
            }
        }
    };

    // SEO Configuration Logic
    const updateSeoConfig = async (updates: Partial<SEOConfig>) => {
        if (!activeProjectId || !user) return;

        const newConfig = { ...seoConfig, ...updates } as SEOConfig;
        setSeoConfig(newConfig);

        try {
            // Update in user's project
            const projectDocRef = doc(db, 'users', user.uid, 'projects', activeProjectId);
            await updateDoc(projectDocRef, { seoConfig: newConfig });
            console.log('SEO configuration updated in project');

            // Also update in publicStores if the project is published there
            try {
                const publicStoreRef = doc(db, 'publicStores', activeProjectId);
                const publicStoreSnap = await getDoc(publicStoreRef);

                if (publicStoreSnap.exists()) {
                    await updateDoc(publicStoreRef, {
                        seoConfig: newConfig,
                        updatedAt: new Date().toISOString()
                    });
                    console.log('SEO configuration also updated in publicStores');
                }
            } catch (publicErr) {
                // publicStores might not exist if project was never published - this is OK
                console.log('Project not in publicStores (not published yet):', publicErr);
            }
        } catch (error) {
            console.error('Error updating SEO config:', error);
        }
    };

    // Leads & CRM Logic
    const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'projectId'>): Promise<string | undefined> => {
        if (!user) return undefined;
        if (!activeProjectId) {
            console.error("[EditorContext] Cannot add lead: No active project");
            return undefined;
        }
        try {
            // Project-scoped leads path
            const leadsPath = `users/${user.uid}/projects/${activeProjectId}/leads`;
            const leadsCol = collection(db, leadsPath);
            const now = serverTimestamp();
            const docRef = await addDoc(leadsCol, {
                ...leadData,
                projectId: activeProjectId,
                createdAt: now
            });
            // Optimistic update via listener
            return docRef.id;
        } catch (error) {
            console.error("[EditorContext] Error adding lead:", error);
            return undefined;
        }
    };

    const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
        if (!user || !activeProjectId) return;
        try {
            // Project-scoped leads path
            const leadRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/leads/${leadId}`);
            await updateDoc(leadRef, { status });
        } catch (error) {
            console.error("[EditorContext] Error updating lead status:", error);
        }
    };

    const updateLead = async (leadId: string, data: Partial<Lead>) => {
        if (!user || !activeProjectId) return;
        try {
            // Project-scoped leads path
            const leadRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/leads/${leadId}`);
            await updateDoc(leadRef, data);
        } catch (error) {
            console.error("[EditorContext] Error updating lead:", error);
        }
    };

    const deleteLead = async (leadId: string) => {
        if (!user || !activeProjectId) return;
        try {
            // Project-scoped paths
            const leadRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/leads/${leadId}`);
            await deleteDoc(leadRef);

            // Also delete all activities and tasks associated with this lead
            const activitiesCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/leadActivities`);
            const activitiesSnapshot = await getDocs(query(activitiesCol));
            const deleteActivitiesPromises = activitiesSnapshot.docs
                .filter(doc => doc.data().leadId === leadId)
                .map(doc => deleteDoc(doc.ref));

            const tasksCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/leadTasks`);
            const tasksSnapshot = await getDocs(query(tasksCol));
            const deleteTasksPromises = tasksSnapshot.docs
                .filter(doc => doc.data().leadId === leadId)
                .map(doc => deleteDoc(doc.ref));

            await Promise.all([...deleteActivitiesPromises, ...deleteTasksPromises]);
        } catch (error) {
            console.error("[EditorContext] Error deleting lead:", error);
        }
    };

    // Lead Activities
    const addLeadActivity = async (leadId: string, activityData: Omit<LeadActivity, 'id' | 'createdAt' | 'leadId'>) => {
        if (!user || !activeProjectId) return;
        try {
            // Project-scoped path
            const activitiesCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/leadActivities`);
            const now = serverTimestamp();
            await addDoc(activitiesCol, {
                ...activityData,
                leadId,
                projectId: activeProjectId,
                createdAt: now,
                createdBy: user.uid
            });
            // Will be updated via listener
        } catch (error) {
            console.error("[EditorContext] Error adding lead activity:", error);
        }
    };

    const getLeadActivities = (leadId: string): LeadActivity[] => {
        return leadActivities
            .filter(activity => activity.leadId === leadId)
            .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    };

    // Lead Tasks
    const addLeadTask = async (leadId: string, taskData: Omit<LeadTask, 'id' | 'createdAt' | 'leadId'>) => {
        if (!user || !activeProjectId) return;
        try {
            // Project-scoped path
            const tasksCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/leadTasks`);
            const now = serverTimestamp();
            await addDoc(tasksCol, {
                ...taskData,
                leadId,
                projectId: activeProjectId,
                createdAt: now
            });
            // Will be updated via listener
        } catch (error) {
            console.error("[EditorContext] Error adding lead task:", error);
        }
    };

    const updateLeadTask = async (taskId: string, data: Partial<LeadTask>) => {
        if (!user || !activeProjectId) return;
        try {
            // Project-scoped path
            const taskRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/leadTasks/${taskId}`);
            await updateDoc(taskRef, data);
        } catch (error) {
            console.error("[EditorContext] Error updating lead task:", error);
        }
    };

    const deleteLeadTask = async (taskId: string) => {
        if (!user || !activeProjectId) return;
        try {
            // Project-scoped path
            const taskRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/leadTasks/${taskId}`);
            await deleteDoc(taskRef);
        } catch (error) {
            console.error("[EditorContext] Error deleting lead task:", error);
        }
    };

    const getLeadTasks = (leadId: string): LeadTask[] => {
        return leadTasks
            .filter(task => task.leadId === leadId)
            .sort((a, b) => {
                // Sort by completed status, then by due date
                if (a.completed !== b.completed) {
                    return a.completed ? 1 : -1;
                }
                return a.dueDate.seconds - b.dueDate.seconds;
            });
    };

    // Domain Logic - Enhanced with Cloud Functions for custom domains
    const addDomain = async (domainData: Domain) => {
        if (!user) return;

        const newDomain = { ...domainData, createdAt: new Date().toISOString() };
        setDomains(prev => [newDomain, ...prev]); // Optimistic update

        try {
            // If this is an external domain being connected to a project,
            // also register it in the global customDomains collection via Cloud Function
            if (domainData.provider === 'External' && domainData.projectId) {
                try {
                    const { addCustomDomainToProject } = await import('../services/domainService');
                    const result = await addCustomDomainToProject(domainData.name, domainData.projectId);

                    if (result.success && result.dnsRecords) {
                        // Update with DNS records from Cloud Function
                        newDomain.dnsRecords = result.dnsRecords;
                        newDomain.verificationToken = result.verificationToken;
                        newDomain.status = 'pending';
                    }
                } catch (cfError) {
                    console.warn('Cloud Function call failed, falling back to local storage:', cfError);
                    // Continue with local storage even if Cloud Function fails
                }
            }

            // Always save to user's domains collection
            const domainsCol = collection(db, 'users', user.uid, 'domains');
            await setDoc(doc(domainsCol, domainData.id), newDomain);

            // Update state with final data
            setDomains(prev => prev.map(d => d.id === domainData.id ? newDomain : d));

        } catch (e) {
            console.error("Error adding domain", e);
            // Revert optimistic update on error
            setDomains(prev => prev.filter(d => d.id !== domainData.id));
        }
    };

    const updateDomain = async (id: string, data: Partial<Domain>) => {
        if (!user) return;
        setDomains(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
        try {
            const docRef = doc(db, 'users', user.uid, 'domains', id);
            await updateDoc(docRef, data);
        } catch (e) {
            console.error("Error updating domain", e);
        }
    };

    const deleteDomain = async (id: string) => {
        if (!user) return;

        const domain = domains.find(d => d.id === id);
        setDomains(prev => prev.filter(d => d.id !== id));

        try {
            // If it's an external domain, also remove from global collection
            if (domain?.provider === 'External') {
                try {
                    const { removeCustomDomainFromProject } = await import('../services/domainService');
                    await removeCustomDomainFromProject(domain.name);
                } catch (cfError) {
                    console.warn('Cloud Function call failed:', cfError);
                }
            }

            const docRef = doc(db, 'users', user.uid, 'domains', id);
            await deleteDoc(docRef);
        } catch (e) {
            console.error("Error deleting domain", e);
        }
    };

    const verifyDomain = async (id: string): Promise<boolean> => {
        if (!user) return false;

        const domain = domains.find(d => d.id === id);
        if (!domain) return false;

        try {
            // Use Cloud Function for real DNS verification
            const { verifyDomainDNS } = await import('../services/domainService');
            const result = await verifyDomainDNS(domain.name);

            if (result.verified) {
                await updateDomain(id, {
                    status: 'ssl_pending', // Next step: SSL provisioning
                    dnsRecords: result.records.map(r => ({
                        type: r.type,
                        host: r.type === 'A' ? '@' : (r.type === 'CNAME' ? 'www' : '_quimera-verify'),
                        value: r.expected,
                        verified: r.verified,
                        lastChecked: result.checkedAt
                    })),
                    lastVerifiedAt: result.checkedAt
                });
                return true;
            } else {
                await updateDomain(id, {
                    status: 'pending',
                    dnsRecords: result.records.map(r => ({
                        type: r.type,
                        host: r.type === 'A' ? '@' : (r.type === 'CNAME' ? 'www' : '_quimera-verify'),
                        value: r.expected,
                        verified: r.verified,
                        lastChecked: result.checkedAt
                    }))
                });
                return false;
            }
        } catch (error) {
            console.error('Domain verification error:', error);
            await updateDomain(id, { status: 'error' });
            return false;
        }
    };

    // Check SSL status for a domain (called after DNS verification)
    const checkDomainSSL = async (id: string): Promise<boolean> => {
        if (!user) return false;

        const domain = domains.find(d => d.id === id);
        if (!domain) return false;

        try {
            const { checkDomainSSLStatus } = await import('../services/domainService');
            const result = await checkDomainSSLStatus(domain.name);

            await updateDomain(id, {
                status: result.status as any,
                sslStatus: result.sslStatus
            });

            return result.sslStatus === 'active';
        } catch (error) {
            console.error('SSL check error:', error);
            return false;
        }
    };

    const deployDomain = async (
        domainId: string,
        provider: 'vercel' | 'cloudflare' | 'netlify' | 'cloud_run' = 'cloud_run'
    ): Promise<boolean> => {
        if (!user) return false;

        const domain = domains.find(d => d.id === domainId);
        if (!domain || !domain.projectId) {
            console.error('Domain or project not found');
            return false;
        }

        const project = projects.find(p => p.id === domain.projectId);
        if (!project) {
            console.error('Project not found');
            return false;
        }

        try {
            // Update status to deploying
            await updateDomain(domainId, {
                status: 'deploying',
                deployment: {
                    provider,
                    status: 'deploying'
                }
            });

            // Handle Cloud Run / SSR Mapping (Direct Firestore Write)
            if (provider === 'cloud_run' || domain.provider === 'Quimera') {
                const normalizedDomain = domain.name.toLowerCase().trim().replace(/^www\./, '');

                // Direct write to customDomains collection
                await setDoc(doc(db, 'customDomains', normalizedDomain), {
                    domain: normalizedDomain,
                    projectId: domain.projectId,
                    userId: user.uid,
                    status: 'active',
                    sslStatus: 'active',
                    dnsVerified: true,
                    cloudRunTarget: 'quimera-ssr-575386543550.us-central1.run.app',
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                await updateDomain(domainId, {
                    status: 'active',
                    sslStatus: 'active',
                    deployment: {
                        provider: 'cloud_run',
                        deploymentUrl: `https://${domain.name}`,
                        lastDeployedAt: new Date().toISOString(),
                        status: 'success'
                    }
                });

                return true;
            }

            // Perform actual static deployment (Vercel/Cloudflare/etc)
            const result = await deploymentService.deployProject(project, domain, provider as any);

            if (result.success) {
                await updateDomain(domainId, {
                    status: 'deployed',
                    deployment: {
                        provider,
                        deploymentUrl: result.deploymentUrl,
                        deploymentId: result.deploymentId,
                        lastDeployedAt: new Date().toISOString(),
                        status: 'success'
                    },
                    dnsRecords: result.dnsRecords
                });
                return true;
            } else {
                await updateDomain(domainId, {
                    status: 'error',
                    deployment: {
                        provider,
                        status: 'failed',
                        error: result.error
                    }
                });
                return false;
            }
        } catch (error) {
            console.error('Deployment error:', error);
            await updateDomain(domainId, {
                status: 'error',
                deployment: {
                    provider,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            });
            return false;
        }
    };

    const getDomainDeploymentLogs = (domainId: string): DeploymentLog[] => {
        const domain = domains.find(d => d.id === domainId);
        return domain?.deploymentLogs || [];
    };

    // Global Assistant Save (todos los usuarios pueden guardar)
    const saveGlobalAssistantConfig = async (config: GlobalAssistantConfig) => {
        // Todos los usuarios pueden guardar configuración del asistente global
        setGlobalAssistantConfig(config);
        try {
            await setDoc(doc(db, 'settings', 'global_assistant'), config);
        } catch (e) {
            console.error("Error saving global assistant config:", e);
        }
    };

    // Super Admin Functions (disponibles para todos)
    const fetchAllUsers = async () => {
        // Todos los usuarios pueden ver la lista de usuarios
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);
        const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDocument));
        setAllUsers(userList);
    };

    const updateUserRole = async (userId: string, newRole: UserRole) => {
        // Todos los usuarios pueden cambiar roles

        const targetUser = allUsers.find(u => u.id === userId);
        if (!targetUser) return;

        // No se puede cambiar el rol del owner
        if (isOwner(targetUser.email)) {
            throw new Error('No se puede cambiar el rol del Owner');
        }

        // Solo owner puede asignar/desasignar superadmin
        if ((newRole === 'superadmin' || targetUser.role === 'superadmin') && !isUserOwner) {
            throw new Error('Solo el Owner puede gestionar Super Admins');
        }

        // No se puede asignar rol de owner
        if (newRole === 'owner') {
            throw new Error('No se puede asignar el rol de Owner');
        }

        try {
            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, { role: newRole });
            setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error('Error updating role:', error);
            throw error;
        }
    };

    const deleteUserRecord = async (userId: string) => {
        // Todos los usuarios pueden eliminar usuarios

        const targetUser = allUsers.find(u => u.id === userId);
        if (targetUser && isOwner(targetUser.email)) {
            throw new Error('No se puede eliminar al Owner');
        }

        // This only deletes the Firestore record, not the Auth user.
        // This is a simplification for the current feature scope.
        const userDocRef = doc(db, 'users', userId);
        await deleteDoc(userDocRef);
        setAllUsers(prev => prev.filter(u => u.id !== userId));
    };

    // Helper para verificar permisos
    const canPerform = (permission: keyof RolePermissions): boolean => {
        return userPermissions[permission] || false;
    };

    // Helper para verificar si tiene rol administrativo
    const isAdmin = (): boolean => {
        return ['owner', 'superadmin', 'admin', 'manager'].includes(userDocument?.role || '');
    };

    // Función para crear administrador
    const createAdmin = async (email: string, name: string, role: UserRole) => {
        // Todos los usuarios pueden crear administradores

        // Solo owner puede crear superadmins
        if (role === 'superadmin' && !isUserOwner) {
            throw new Error('Solo el Owner puede crear Super Admins');
        }

        // No se puede crear otro owner
        if (role === 'owner') {
            throw new Error('Solo puede haber un Owner en el sistema');
        }

        try {
            // Verificar si el usuario ya existe
            const existingUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (existingUser) {
                throw new Error('Ya existe un usuario con este email');
            }

            const newAdminDoc = {
                email,
                name,
                photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3f3f46&color=e4e4e7`,
                role: determineRole(email, role),
                createdBy: userDocument?.email,
                createdAt: serverTimestamp()
            };

            // Crear documento en Firestore
            // Nota: En producción necesitarás una Cloud Function para crear el usuario en Auth
            const usersCol = collection(db, 'users');
            await addDoc(usersCol, newAdminDoc);

            await fetchAllUsers(); // Refresh lista
        } catch (error) {
            console.error('Error creating admin:', error);
            throw error;
        }
    };

    // Update User Profile (Name & Photo)
    const updateUserProfile = async (name: string, photoURL: string) => {
        if (!user || !userDocument) return;

        try {
            // 1. Update Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                name,
                photoURL
            });

            // 2. Update Auth Profile
            await updateProfile(user, {
                displayName: name,
                photoURL: photoURL
            });

            // 3. Update Local State
            setUserDocument(prev => prev ? { ...prev, name, photoURL } : null);
            setAllUsers(prev => prev.map(u => u.id === user.uid ? { ...u, name, photoURL } : u));

        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    };

    // Update ANY User Details (Admin Function)
    const updateUserDetails = async (userId: string, data: Partial<UserDocument>) => {
        // Verify permissions (only admins can do this)
        if (!isAdmin()) {
            throw new Error("Unauthorized: Only admins can update user details");
        }

        try {
            const userDocRef = doc(db, 'users', userId);

            // Filter out sensitive or immutable fields just in case
            const { id, uid, email, role, ...updatableData } = data as any;

            await updateDoc(userDocRef, updatableData);

            // Update local state
            setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updatableData } : u));

            // If updating self, also update userDocument
            if (user && userId === user.uid) {
                setUserDocument(prev => prev ? { ...prev, ...updatableData } : null);
                // Also update Auth profile if name/photo changed
                if (updatableData.name || updatableData.photoURL) {
                    await updateProfile(user, {
                        displayName: updatableData.name || user.displayName,
                        photoURL: updatableData.photoURL || user.photoURL
                    });
                }
            }

        } catch (error) {
            console.error("Error updating user details:", error);
            throw error;
        }
    };

    // Tenant Management Functions (disponibles para todos)
    const fetchTenants = async () => {
        // Todos los usuarios pueden ver tenants
        try {
            const tenantsCol = collection(db, 'tenants');
            const q = query(tenantsCol, orderBy('createdAt', 'desc'));
            const tenantSnapshot = await getDocs(q);
            const tenantList = tenantSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
            setTenants(tenantList);
        } catch (error) {
            console.error("Error fetching tenants:", error);
        }
    };

    const getDefaultLimits = (plan: string): TenantLimits => {
        switch (plan) {
            case 'free':
                return { maxProjects: 3, maxUsers: 1, maxStorageGB: 5, maxAiCredits: 100 };
            case 'pro':
                return { maxProjects: 20, maxUsers: 5, maxStorageGB: 50, maxAiCredits: 1000 };
            case 'enterprise':
                return { maxProjects: 100, maxUsers: 50, maxStorageGB: 500, maxAiCredits: 10000 };
            default:
                return { maxProjects: 3, maxUsers: 1, maxStorageGB: 5, maxAiCredits: 100 };
        }
    };

    const createTenant = async (data: {
        type: 'individual' | 'agency';
        name: string;
        email: string;
        plan: string;
        companyName?: string;
    }): Promise<string> => {
        // Todos los usuarios pueden crear tenants

        try {
            const tenantDoc = {
                type: data.type,
                name: data.name,
                email: data.email,
                companyName: data.companyName || '',
                status: 'trial' as TenantStatus,
                subscriptionPlan: data.plan,
                limits: getDefaultLimits(data.plan),
                usage: {
                    projectCount: 0,
                    userCount: data.type === 'agency' ? 1 : 1,
                    storageUsedGB: 0,
                    aiCreditsUsed: 0
                },
                ownerUserId: '',
                memberUserIds: [],
                projectIds: [],
                createdAt: serverTimestamp(),
                settings: {
                    allowMemberInvites: data.type === 'agency',
                    requireTwoFactor: false,
                    brandingEnabled: false
                }
            };

            const docRef = await addDoc(collection(db, 'tenants'), tenantDoc);
            await fetchTenants(); // Refresh list
            return docRef.id;
        } catch (error) {
            console.error("Error creating tenant:", error);
            throw error;
        }
    };

    const updateTenant = async (tenantId: string, data: Partial<Tenant>) => {
        // Todos los usuarios pueden actualizar tenants

        try {
            const tenantRef = doc(db, 'tenants', tenantId);
            await updateDoc(tenantRef, data);
            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, ...data } : t));
        } catch (error) {
            console.error("Error updating tenant:", error);
        }
    };

    const deleteTenant = async (tenantId: string) => {
        // Todos los usuarios pueden eliminar tenants

        try {
            const tenantRef = doc(db, 'tenants', tenantId);
            await deleteDoc(tenantRef);
            setTenants(prev => prev.filter(t => t.id !== tenantId));
        } catch (error) {
            console.error("Error deleting tenant:", error);
        }
    };

    const updateTenantStatus = async (tenantId: string, status: TenantStatus) => {
        // Todos los usuarios pueden actualizar el estado de tenants

        try {
            const tenantRef = doc(db, 'tenants', tenantId);
            await updateDoc(tenantRef, {
                status,
                lastStatusChangeAt: serverTimestamp()
            });
            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status } : t));
        } catch (error) {
            console.error("Error updating tenant status:", error);
        }
    };

    const updateTenantLimits = async (tenantId: string, limits: Partial<TenantLimits>) => {
        // Todos los usuarios pueden actualizar límites de tenants

        try {
            const tenant = tenants.find(t => t.id === tenantId);
            if (!tenant) return;

            const updatedLimits = { ...tenant.limits, ...limits };
            const tenantRef = doc(db, 'tenants', tenantId);
            await updateDoc(tenantRef, { limits: updatedLimits });
            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, limits: updatedLimits } : t));
        } catch (error) {
            console.error("Error updating tenant limits:", error);
        }
    };

    const getPrompt = (name: string): LLMPrompt | undefined => {
        // Search in DB prompts first, then fallback to default file
        const dbPrompt = prompts.find(p => p.name === name);
        const defaultPrompt = defaultPrompts.find(p => p.name === name) as LLMPrompt | undefined;

        // Auto-migrate outdated prompts in DB
        if (dbPrompt && defaultPrompt && dbPrompt.version !== undefined && defaultPrompt.version !== undefined) {
            if (dbPrompt.version < defaultPrompt.version) {
                console.warn(`🔄 [EditorContext] Auto-migrating outdated prompt '${name}' from v${dbPrompt.version} to v${defaultPrompt.version}`);
                // Trigger async update (don't wait for it)
                savePrompt({
                    ...defaultPrompt,
                    id: dbPrompt.id,
                }).catch(err => console.error('Failed to auto-migrate prompt:', err));
                // Return the updated version immediately
                return defaultPrompt;
            }
        }

        return dbPrompt || defaultPrompt;
    };

    const fetchAllPrompts = async () => {
        try {
            const promptsCol = collection(db, 'prompts');
            const q = query(promptsCol, orderBy('name', 'asc'));
            const promptSnapshot = await getDocs(q);

            if (promptSnapshot.empty) {
                // Only seed if admin
                if (isAdmin()) {
                    console.log('No prompts found, seeding database with defaults...');
                    const seedPromises = defaultPrompts.map(promptData => {
                        const dataToSave = {
                            ...promptData,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        };
                        return addDoc(collection(db, 'prompts'), dataToSave);
                    });
                    await Promise.all(seedPromises);
                    // Re-fetch after seeding
                    const newSnapshot = await getDocs(q);
                    const promptList = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LLMPrompt));
                    setPrompts(promptList);
                }
                // If not superadmin and empty, prompts state remains empty, getPrompt will fallback to defaults
            } else {
                const promptList = promptSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LLMPrompt));
                setPrompts(promptList);
            }
        } catch (error) {
            console.error("Error fetching prompts:", error);
        }
    };

    const savePrompt = async (promptData: Omit<LLMPrompt, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
        // Todos los usuarios pueden guardar prompts
        const { id, ...data } = promptData;
        const collectionRef = collection(db, 'prompts');
        if (id) {
            const promptDocRef = doc(collectionRef, id);
            await updateDoc(promptDocRef, { ...data, updatedAt: serverTimestamp() });
        } else {
            await addDoc(collectionRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        }
        await fetchAllPrompts(); // Refresh list
    };

    const deletePrompt = async (promptId: string) => {
        // Todos los usuarios pueden eliminar prompts
        const promptDocRef = doc(db, 'prompts', promptId);
        await deleteDoc(promptDocRef);
        await fetchAllPrompts(); // Refresh list
    };

    const syncPrompts = async () => {
        try {
            console.log('🔄 Syncing default prompts...');
            const promptsCol = collection(db, 'prompts');
            const q = query(promptsCol);
            const snapshot = await getDocs(q);
            const dbPrompts = snapshot.docs.map(doc => doc.data() as LLMPrompt);
            const dbPromptNames = new Set(dbPrompts.map(p => p.name));

            const promptsToAdd = defaultPrompts.filter(dp => !dbPromptNames.has(dp.name));

            if (promptsToAdd.length === 0) {
                console.log('✅ All default prompts are already in the database.');
                return;
            }

            console.log(`Creating ${promptsToAdd.length} missing prompts...`);
            const promises = promptsToAdd.map(promptData => {
                const dataToSave = {
                    ...promptData,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };
                return addDoc(promptsCol, dataToSave);
            });

            await Promise.all(promises);
            console.log('✅ Prompts synced successfully.');
            await fetchAllPrompts();
        } catch (error) {
            console.error("❌ Error syncing prompts:", error);
        }
    };

    const updateComponentStyle = async (componentId: string, newStyles: any, isCustom: boolean) => {
        // Allow superadmin, admin, manager, and owner to edit components
        if (!['superadmin', 'admin', 'manager', 'owner'].includes(userDocument?.role || '')) {
            return;
        }

        if (isCustom) {
            // UPDATE LOCAL STATE ONLY
            setCustomComponents(prev => prev.map(c => c.id === componentId ? { ...c, styles: { ...c.styles, ...newStyles } } : c));
        } else {
            // UPDATE LOCAL STATE ONLY - Force immutable update
            setComponentStyles(prev => {
                const currentStyles = prev[componentId as EditableComponentID];
                return {
                    ...prev,
                    [componentId]: {
                        ...currentStyles,
                        ...newStyles
                    }
                };
            });
        }
    };

    const saveComponent = async (componentId: string, changeDescription?: string) => {
        // Todos los usuarios pueden guardar componentes

        try {
            // Check if Custom
            const customComp = customComponents.find(c => c.id === componentId);
            if (customComp) {
                // Create version history entry
                const newVersion: ComponentVersion = {
                    version: (customComp.version || 1) + 1,
                    timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 },
                    author: user?.uid || 'unknown',
                    changes: changeDescription || 'Component updated',
                    snapshot: customComp.styles
                };

                const updatedVersionHistory = [
                    ...(customComp.versionHistory || []),
                    newVersion
                ].slice(-10); // Keep only last 10 versions

                const docRef = doc(db, 'customComponents', componentId);
                await updateDoc(docRef, {
                    styles: customComp.styles,
                    version: newVersion.version,
                    versionHistory: updatedVersionHistory,
                    lastModified: serverTimestamp(),
                    modifiedBy: user?.uid || ''
                });

                // Update local state
                setCustomComponents(prev => prev.map(c =>
                    c.id === componentId
                        ? {
                            ...c,
                            version: newVersion.version,
                            versionHistory: updatedVersionHistory,
                            lastModified: { seconds: Date.now() / 1000, nanoseconds: 0 },
                            modifiedBy: user?.uid || ''
                        }
                        : c
                ));

                console.log("Saved custom component", componentId);
                return;
            }

            // Check if Standard
            // We need to get the current style from state. Note: componentStyles is the state.
            const currentStyle = componentStyles[componentId as EditableComponentID];

            if (currentStyle) {
                const docRef = doc(db, 'componentDefaults', componentId);
                // Use setDoc with merge to create or update
                await setDoc(docRef, { styles: currentStyle }, { merge: true });
                console.log("Saved standard component", componentId);
            }
        } catch (e) {
            console.error("Error saving component:", e);
            throw e; // Propagate error so UI can show it
        }
    };

    const createNewCustomComponent = async (name: string, baseComponent: EditableComponentID): Promise<CustomComponent> => {
        // Todos los usuarios pueden crear componentes personalizados

        const newComponentData: Omit<CustomComponent, 'id' | 'createdAt'> = {
            name,
            baseComponent,
            styles: componentStyles[baseComponent],
            version: 1,
            versionHistory: [],
            category: 'other',
            tags: [],
            variants: [],
            isPublic: false,
            createdBy: user?.uid || '',
            usageCount: 0,
            projectsUsing: [],
            permissions: {
                canEdit: [],
                canView: [],
                isPublic: false
            }
        };

        try {
            const customComponentsCol = collection(db, 'customComponents');
            const docRef = await addDoc(customComponentsCol, { ...newComponentData, createdAt: serverTimestamp(), lastModified: serverTimestamp() });

            const createdComponent: CustomComponent = {
                id: docRef.id,
                ...newComponentData,
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                lastModified: { seconds: Date.now() / 1000, nanoseconds: 0 }
            };

            setCustomComponents(prev => [createdComponent, ...prev]);
            return createdComponent;
        } catch (error) {
            console.error("Error creating custom component:", error);
            throw error;
        }
    };

    const deleteCustomComponent = async (componentId: string): Promise<void> => {
        // Todos los usuarios pueden eliminar componentes personalizados

        try {
            const docRef = doc(db, 'customComponents', componentId);
            await deleteDoc(docRef);

            setCustomComponents(prev => prev.filter(c => c.id !== componentId));
        } catch (error) {
            console.error("Error deleting custom component:", error);
            throw error;
        }
    };

    const duplicateComponent = async (componentId: string): Promise<CustomComponent> => {
        // Todos los usuarios pueden duplicar componentes

        const original = customComponents.find(c => c.id === componentId);
        if (!original) {
            throw new Error('Component not found');
        }

        const duplicateData: Omit<CustomComponent, 'id' | 'createdAt'> = {
            ...original,
            name: `${original.name} Copy`,
            version: 1,
            versionHistory: [],
            usageCount: 0,
            projectsUsing: [],
            createdBy: user?.uid || '',
        };

        try {
            const customComponentsCol = collection(db, 'customComponents');
            const docRef = await addDoc(customComponentsCol, { ...duplicateData, createdAt: serverTimestamp(), lastModified: serverTimestamp() });

            const newComponent: CustomComponent = {
                ...duplicateData,
                id: docRef.id,
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                lastModified: { seconds: Date.now() / 1000, nanoseconds: 0 }
            };

            setCustomComponents(prev => [newComponent, ...prev]);
            return newComponent;
        } catch (error) {
            console.error("Error duplicating component:", error);
            throw error;
        }
    };

    const renameCustomComponent = async (componentId: string, newName: string): Promise<void> => {
        // Only owner, superadmin, admin and manager can rename components
        if (!['owner', 'superadmin', 'admin', 'manager'].includes(userDocument?.role || '')) {
            throw new Error("Only administrators and managers can rename components.");
        }

        if (!newName.trim()) {
            throw new Error("Component name cannot be empty.");
        }

        try {
            const docRef = doc(db, 'customComponents', componentId);
            await updateDoc(docRef, {
                name: newName.trim(),
                lastModified: serverTimestamp(),
                modifiedBy: user?.uid || '',
            });

            setCustomComponents(prev => prev.map(c =>
                c.id === componentId
                    ? { ...c, name: newName.trim(), lastModified: { seconds: Date.now() / 1000, nanoseconds: 0 } }
                    : c
            ));
        } catch (error) {
            console.error("Error renaming component:", error);
            throw error;
        }
    };

    const updateComponentVariants = async (componentId: string, variants: ComponentVariant[], activeVariant?: string): Promise<void> => {
        // Todos los usuarios pueden actualizar variantes de componentes

        try {
            const updateData: any = {
                variants,
                lastModified: serverTimestamp(),
                modifiedBy: user?.uid || '',
            };

            if (activeVariant !== undefined) {
                updateData.activeVariant = activeVariant;
            }

            const docRef = doc(db, 'customComponents', componentId);
            await updateDoc(docRef, updateData);

            setCustomComponents(prev => prev.map(c =>
                c.id === componentId
                    ? { ...c, variants, activeVariant: activeVariant ?? c.activeVariant, lastModified: { seconds: Date.now() / 1000, nanoseconds: 0 } }
                    : c
            ));
        } catch (error) {
            console.error("Error updating component variants:", error);
            throw error;
        }
    };

    const exportComponent = (componentId: string): string => {
        const component = customComponents.find(c => c.id === componentId);
        if (!component) {
            throw new Error('Component not found');
        }

        // Remove sensitive/unnecessary data for export
        const exportData = {
            name: component.name,
            description: component.description,
            baseComponent: component.baseComponent,
            styles: component.styles,
            category: component.category,
            tags: component.tags,
            variants: component.variants,
            documentation: component.documentation,
            version: component.version,
        };

        return JSON.stringify(exportData, null, 2);
    };

    const importComponent = async (jsonString: string): Promise<CustomComponent> => {
        // Todos los usuarios pueden importar componentes

        try {
            const importedData = JSON.parse(jsonString);

            // Validate required fields
            if (!importedData.name || !importedData.baseComponent) {
                throw new Error('Invalid component data: missing required fields');
            }

            const newComponentData: Omit<CustomComponent, 'id' | 'createdAt'> = {
                name: importedData.name,
                description: importedData.description,
                baseComponent: importedData.baseComponent,
                styles: importedData.styles || {},
                version: 1,
                versionHistory: [],
                category: importedData.category || 'other',
                tags: importedData.tags || [],
                variants: importedData.variants || [],
                isPublic: false,
                createdBy: user?.uid || '',
                usageCount: 0,
                projectsUsing: [],
                permissions: {
                    canEdit: [],
                    canView: [],
                    isPublic: false
                },
                documentation: importedData.documentation
            };

            const customComponentsCol = collection(db, 'customComponents');
            const docRef = await addDoc(customComponentsCol, { ...newComponentData, createdAt: serverTimestamp(), lastModified: serverTimestamp() });

            const createdComponent: CustomComponent = {
                id: docRef.id,
                ...newComponentData,
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                lastModified: { seconds: Date.now() / 1000, nanoseconds: 0 }
            };

            setCustomComponents(prev => [createdComponent, ...prev]);
            return createdComponent;
        } catch (error) {
            console.error("Error importing component:", error);
            throw error;
        }
    };

    const revertToVersion = async (componentId: string, versionNumber: number): Promise<void> => {
        // Todos los usuarios pueden revertir componentes a versiones anteriores

        const component = customComponents.find(c => c.id === componentId);
        if (!component) {
            throw new Error('Component not found');
        }

        const targetVersion = component.versionHistory?.find(v => v.version === versionNumber);
        if (!targetVersion) {
            throw new Error('Version not found');
        }

        // Update component with old snapshot
        const docRef = doc(db, 'customComponents', componentId);
        await updateDoc(docRef, {
            styles: targetVersion.snapshot,
            lastModified: serverTimestamp(),
            modifiedBy: user?.uid || ''
        });

        // Update local state
        setCustomComponents(prev => prev.map(c =>
            c.id === componentId
                ? {
                    ...c,
                    styles: targetVersion.snapshot,
                    lastModified: { seconds: Date.now() / 1000, nanoseconds: 0 },
                    modifiedBy: user?.uid || ''
                }
                : c
        ));
    };

    const trackComponentUsage = async (projectId: string, componentIds: string[]): Promise<void> => {
        if (!user) return;

        // Track custom components usage
        const customComponentIds = componentIds.filter(id =>
            customComponents.some(c => c.id === id)
        );

        for (const compId of customComponentIds) {
            const component = customComponents.find(c => c.id === compId);
            if (!component) continue;

            const projectsUsing = component.projectsUsing || [];
            if (!projectsUsing.includes(projectId)) {
                try {
                    const docRef = doc(db, 'customComponents', compId);
                    const updatedProjects = [...projectsUsing, projectId];
                    await updateDoc(docRef, {
                        projectsUsing: updatedProjects,
                        usageCount: updatedProjects.length
                    });

                    // Update local state
                    setCustomComponents(prev => prev.map(c =>
                        c.id === compId
                            ? { ...c, projectsUsing: updatedProjects, usageCount: updatedProjects.length }
                            : c
                    ));
                } catch (error) {
                    console.error(`Error tracking component usage for ${compId}:`, error);
                }
            }
        }
    };

    const updateDesignTokens = async (tokens: DesignTokens): Promise<void> => {
        // Todos los usuarios pueden actualizar design tokens

        try {
            const docRef = doc(db, 'settings', 'designTokens');
            await setDoc(docRef, tokens);
            setDesignTokens(tokens);
        } catch (error) {
            console.error("Error updating design tokens:", error);
            throw error;
        }
    };

    const updateComponentStatus = async (componentId: PageSection, isEnabled: boolean) => {
        // Todos los usuarios pueden actualizar el estado de componentes
        const newStatus = { ...componentStatus, [componentId]: isEnabled };
        setComponentStatus(newStatus);
        try {
            const settingsRef = doc(db, 'settings', 'components');
            await setDoc(settingsRef, { status: newStatus }, { merge: true });
        } catch (error) {
            console.error('Failed to update component status:', error);
            // Optionally revert state change on error
        }
    };

    // CMS Logic - Stub, as real logic moved to subscription
    const loadCMSPosts = async () => {
        // No-op to satisfy interface. Subscription handles loading.
        // This ensures old code doesn't crash but relies on the context's state.
    };

    const saveCMSPost = async (post: CMSPost) => {
        if (!user) return;
        try {
            const { id, ...data } = post;

            // --- START FIX: Propagate Slug Changes to Menus ---
            // If updating an existing post, check if slug changed
            if (id) {
                const oldPost = cmsPosts.find(p => p.id === id);

                // If we found the old post and the slug is different
                if (oldPost && oldPost.slug !== post.slug) {
                    const oldLink = `#article:${oldPost.slug}`;
                    const newLink = `#article:${post.slug}`;

                    let hasMenuUpdates = false;

                    // Map through menus to find and replace the link
                    const updatedMenus = menus.map(menu => {
                        let menuChanged = false;
                        const newItems = menu.items.map(item => {
                            if (item.href === oldLink) {
                                menuChanged = true;
                                hasMenuUpdates = true;
                                return { ...item, href: newLink };
                            }
                            return item;
                        });

                        if (menuChanged) {
                            return { ...menu, items: newItems };
                        }
                        return menu;
                    });

                    // If we found links to update
                    if (hasMenuUpdates) {
                        // 1. Update Local State
                        setMenus(updatedMenus);

                        // 2. Update Project in Firestore
                        if (activeProjectId) {
                            try {
                                const projectDocRef = doc(db, 'users', user.uid, 'projects', activeProjectId);
                                await updateDoc(projectDocRef, { menus: updatedMenus });
                                console.log(`[Ref Integrity] Updated menus linking to ${oldLink} -> ${newLink}`);
                            } catch (err) {
                                console.error("Failed to update menu references for slug change:", err);
                            }
                        }
                    }
                }
            }
            // --- END FIX ---

            if (id && id.length > 0) {
                const postRef = doc(db, 'users', user.uid, 'posts', id);
                await updateDoc(postRef, { ...data, updatedAt: new Date().toISOString() });
                // Optimistic update removed, relying on snapshot
            } else {
                const postsCol = collection(db, 'users', user.uid, 'posts');
                const now = new Date().toISOString();
                await addDoc(postsCol, { ...data, authorId: user.uid, createdAt: now, updatedAt: now });
            }
        } catch (error) {
            console.error("Error saving post:", error);
            throw error;
        }
    };

    const deleteCMSPost = async (postId: string) => {
        if (!user) return;
        try {
            const postRef = doc(db, 'users', user.uid, 'posts', postId);
            await deleteDoc(postRef);
        } catch (error) {
            console.error("Error deleting post:", error);
        }
    };


    const value: EditorContextType = {
        isSidebarOpen, setIsSidebarOpen,
        isDashboardSidebarCollapsed, toggleDashboardSidebar,
        view, setView,
        previewRef,
        activeProjectId,
        activeProject,
        projects,
        isLoadingProjects,
        loadProject,
        data, setData,
        theme, setTheme,
        brandIdentity, setBrandIdentity,
        componentOrder, setComponentOrder,
        sectionVisibility, setSectionVisibility,
        activeSection, onSectionSelect,
        previewDevice, setPreviewDevice,
        previewOrientation, setPreviewOrientation,
        user,
        loadingAuth,
        userDocument, setUserDocument,
        verificationEmail, setVerificationEmail,
        isProfileModalOpen, openProfileModal, closeProfileModal,
        renameActiveProject,
        updateProjectThumbnail,
        updateProjectFavicon,
        exportProjectAsHtml,
        saveProject,
        createProjectFromTemplate,
        deleteProject,
        addNewProject,
        themeMode, setThemeMode,
        files,
        isFilesLoading,
        uploadFile,
        deleteFile,
        updateFileNotes,
        generateFileSummary,
        uploadImageAndGetURL,
        generateImage,
        generateProjectImagesWithProgress,
        enhancePrompt,
        // Global File Management
        globalFiles,
        isGlobalFilesLoading,
        fetchGlobalFiles,
        uploadGlobalFile,
        deleteGlobalFile,
        // Admin
        adminView,
        setAdminView,
        allUsers,
        fetchAllUsers,
        updateUserRole,
        deleteUserRecord,
        // Sistema de permisos
        userPermissions,
        canPerform,
        isUserOwner,
        createAdmin,
        updateUserProfile,
        updateUserDetails,
        // Tenants
        tenants,
        fetchTenants,
        createTenant,
        updateTenant,
        deleteTenant,
        updateTenantStatus,
        updateTenantLimits,
        prompts,
        getPrompt,
        fetchAllPrompts,
        savePrompt,
        deletePrompt,
        syncPrompts,
        // Global Assistant
        globalAssistantConfig,
        saveGlobalAssistantConfig,
        isEditingTemplate,
        exitTemplateEditor,
        createNewTemplate,
        archiveTemplate,
        duplicateTemplate,
        updateTemplateInState,
        componentStyles,
        customComponents,
        updateComponentStyle,
        saveComponent,
        createNewCustomComponent,
        deleteCustomComponent,
        duplicateComponent,
        renameCustomComponent,
        updateComponentVariants,
        exportComponent,
        importComponent,
        revertToVersion,
        trackComponentUsage,
        designTokens,
        updateDesignTokens,
        componentStatus,
        updateComponentStatus,
        cmsPosts,
        isLoadingCMS,
        loadCMSPosts,
        saveCMSPost,
        deleteCMSPost,
        hasApiKey,
        promptForKeySelection,
        handleApiError,
        menus,
        saveMenu,
        deleteMenu,
        aiAssistantConfig,
        saveAiAssistantConfig,
        // User Preferences
        sidebarOrder, setSidebarOrder,
        // Leads & CRM
        leads,
        isLoadingLeads,
        addLead,
        updateLeadStatus,
        updateLead,
        deleteLead,
        // Lead Activities
        leadActivities,
        addLeadActivity,
        getLeadActivities,
        // Lead Tasks
        leadTasks,
        addLeadTask,
        updateLeadTask,
        deleteLeadTask,
        getLeadTasks,
        // Leads Library
        libraryLeads,
        isLoadingLibraryLeads,
        addLibraryLead,
        deleteLibraryLead,
        importLibraryLead,
        // Domains
        domains,
        addDomain,
        updateDomain,
        deleteDomain,
        verifyDomain,
        deployDomain,
        getDomainDeploymentLogs,
        // Usage & Billing
        usage,
        isLoadingUsage,
        // SEO Configuration
        seoConfig,
        setSeoConfig,
        updateSeoConfig,
        // Onboarding
        isOnboardingOpen,
        setIsOnboardingOpen,
    };

    return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};
