
import React, { createContext, useState, useContext, ReactNode, useRef, useEffect } from 'react';
import { PageData, ThemeData, PageSection, PreviewDevice, View, Project, ThemeMode, UserDocument, FileRecord, LLMPrompt, ComponentStyles, EditableComponentID, CustomComponent, BrandIdentity, CMSPost, Menu, AdminView, AiAssistantConfig, GlobalAssistantConfig, OnboardingState, Lead, LeadStatus, LeadActivity, LeadTask, ActivityType, Domain, DeploymentLog, Tenant, TenantStatus, TenantLimits, UserRole, RolePermissions, SEOConfig, ComponentVariant, ComponentVersion, DesignTokens } from '../types';
import { getPermissions, isOwner, determineRole, OWNER_EMAIL } from '../constants/roles';
import { initialProjects } from '../data/templates';
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
import { deploymentService } from '../utils/deploymentService';
import { logApiCall } from '../services/apiLoggingService';


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
    loadProject: (projectId: string, fromAdmin?: boolean, navigateToEditor?: boolean) => void;
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
    exportProjectAsHtml: () => void;
    saveProject: () => Promise<void>;
    createProjectFromTemplate: (templateId: string, newName?: string) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
    addNewProject: (project: Project) => Promise<void>;
    themeMode: ThemeMode;
    setThemeMode: React.Dispatch<React.SetStateAction<ThemeMode>>;
    files: FileRecord[];
    isFilesLoading: boolean;
    uploadFile: (file: File) => Promise<void>;
    deleteFile: (fileId: string, storagePath: string) => Promise<void>;
    updateFileNotes: (fileId: string, notes: string) => Promise<void>;
    generateFileSummary: (fileId: string, downloadURL: string) => Promise<void>;
    uploadImageAndGetURL: (file: File, path: string) => Promise<string>;
    generateImage: (prompt: string, options?: { aspectRatio?: string, style?: string, destination?: 'user' | 'global' }) => Promise<string>; 
    enhancePrompt: (draftPrompt: string) => Promise<string>;
    
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
    
    // Global Assistant (Super Admin)
    globalAssistantConfig: GlobalAssistantConfig;
    saveGlobalAssistantConfig: (config: GlobalAssistantConfig) => Promise<void>;

    // Template Management
    isEditingTemplate: boolean;
    exitTemplateEditor: () => void;
    createNewTemplate: () => void;
    archiveTemplate: (templateId: string, isArchived: boolean) => void;
    duplicateTemplate: (templateId: string) => void;

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

    // Website Builder State
    isOnboardingOpen: boolean;
    setIsOnboardingOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onboardingState: OnboardingState;
    setOnboardingState: React.Dispatch<React.SetStateAction<OnboardingState>>;

    // Leads & CRM
    leads: Lead[];
    isLoadingLeads: boolean;
    addLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => Promise<void>;
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
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const useEditor = () => {
    const context = useContext(EditorContext);
    if (context === undefined) {
        throw new Error('useEditor must be used within an EditorProvider');
    }
    return context;
};

const allComponents = initialData.componentOrder;
const defaultComponentStatus = allComponents.reduce((acc, comp) => {
    acc[comp] = true;
    return acc;
}, {} as Record<PageSection, boolean>);


export const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDashboardSidebarCollapsed, setIsDashboardSidebarCollapsed] = useState(false);
    const [view, setView] = useState<View>('dashboard');
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
    const previewRef = useRef<HTMLDivElement>(null);
    const [activeSection, setActiveSection] = useState<PageSection | null>(null);
    
    // Auth state
    const [user, setUser] = useState<User | null>(null);
    const [userDocument, setUserDocument] = useState<UserDocument | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Project state
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const activeProject = projects.find(p => p.id === activeProjectId) || null;

    // Active project data
    const [data, setData] = useState<PageData | null>(null);
    const [theme, setTheme] = useState<ThemeData>(initialData.theme);
    const [brandIdentity, setBrandIdentity] = useState<BrandIdentity>(initialData.brandIdentity);
    const [componentOrder, setComponentOrder] = useState<PageSection[]>(initialData.componentOrder as PageSection[]);
    const [sectionVisibility, setSectionVisibility] = useState<Record<PageSection, boolean>>(initialData.sectionVisibility as Record<PageSection, boolean>);
    
    // Navigation Menus
    const [menus, setMenus] = useState<Menu[]>([
        { id: 'main', title: 'Main Menu', handle: 'main-menu', items: [{id: '1', text: 'Home', href: '#hero', type: 'section'}] },
        { id: 'footer', title: 'Footer Menu', handle: 'footer-menu', items: [{id: '1', text: 'Contact', href: '#contact', type: 'section'}] }
    ]);

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
        greeting: "Hi! I'm your Quimera Assistant. I have full control over the app.",
        systemInstruction: `You are the Quimera.ai Global Assistant. You have FULL CONTROL over the application via tools.
        
        YOUR MANDATE:
        1. **Action Over Chat:** If the user asks to change something (theme, view, content, project), call the appropriate tool IMMEDIATELY. Do not ask for confirmation.
        2. **Navigation:** Use 'change_view' to move around (dashboard, websites, editor, etc).
        3. **Theming:** Use 'change_theme' for light/dark/black mode.
        4. **Content Editing:** You can DIRECTLY modify the website content using 'update_site_content'.
        5. **Project Management:** Use 'load_project' to switch websites.
        
        IMPORTANT:
        - Be concise.
        `,
        permissions: {}, // Initialize empty, components will handle defaults
        temperature: 0.7,
        maxTokens: 500,
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

    // Theme mode
    const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

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

    // Website Builder State
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [onboardingState, setOnboardingState] = useState<OnboardingState>({
        step: 'basics',
        businessName: '',
        industry: '',
        summary: '',
        audience: '',
        offerings: '',
        tone: 'Professional',
        goal: 'Generate Leads',
        aesthetic: 'Minimalist',
        colorVibe: 'Trustworthy Blue',
        // Nuevos campos opcionales
        companyHistory: undefined,
        uniqueValueProposition: undefined,
        coreValues: undefined,
        yearsInBusiness: undefined,
        products: undefined,
        contactInfo: undefined,
        brandGuidelines: undefined,
        testimonials: undefined,
        designPlan: undefined
    });

    // Domains State
    const [domains, setDomains] = useState<Domain[]>([]);
    
    // SEO Configuration State
    const [seoConfig, setSeoConfig] = useState<SEOConfig | null>(null);
    
    // Usage & Billing State
    const [usage, setUsage] = useState<{ used: number; limit: number; plan: string } | null>(null);
    const [isLoadingUsage, setIsLoadingUsage] = useState(true);

    // API Key State
    const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);


    // Effects
    useEffect(() => {
        const checkApiKey = async () => {
            try {
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
        
        // Moved fetchGlobalSettings and fetchComponentDefaults inside auth state change to avoid permission errors on initial load
        
        const fetchGlobalSettings = async () => {
            try {
                const compDoc = await getDoc(doc(db, 'settings', 'components'));
                if (compDoc.exists()) setComponentStatus(compDoc.data().status);

                const assistantDoc = await getDoc(doc(db, 'settings', 'global_assistant'));
                if (assistantDoc.exists()) {
                    setGlobalAssistantConfig(prev => ({ ...prev, ...assistantDoc.data() }));
                }

                const tokensDoc = await getDoc(doc(db, 'settings', 'designTokens'));
                if (tokensDoc.exists()) {
                    setDesignTokens(tokensDoc.data() as DesignTokens);
                } else {
                    // Initialize with default tokens if none exist
                    const defaultTokens: DesignTokens = {
                        colors: {
                            primary: { main: '#4f46e5', light: '#6366f1', dark: '#4338ca' },
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
                const componentDefaultsCol = collection(db, "component_defaults");
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
                    console.error("Error in component defaults listener:", error);
                });
                return unsubscribe;
            } catch (e) {
                console.error("Error setting up component defaults listener:", e);
                return () => {};
            }
        };

        const fetchAllFiles = async (userId: string) => {
            setIsFilesLoading(true);
            try {
                const filesCol = collection(db, 'users', userId, 'files');
                const q = query(filesCol, orderBy('createdAt', 'desc'));
                const filesSnapshot = await getDocs(q);
                const userFiles = filesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileRecord));
                setFiles(userFiles);
            } catch (error) {
                console.error("Error loading user files:", error);
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
                 const userDomains = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Domain));
                 setDomains(userDomains);
             } catch (error) {
                 console.error("Error loading user domains:", error);
             }
        };

        const loadUserProjects = async (userId: string) => {
            setIsLoadingProjects(true);
            try {
                const projectsCol = collection(db, 'users', userId, 'projects');
                const q = query(projectsCol, orderBy('lastUpdated', 'desc'));
                const projectSnapshot = await getDocs(q);
                const userProjects = projectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
                
                setProjects([...initialProjects, ...userProjects]);
            } catch (error) {
                console.error("Error loading user projects:", error);
                setProjects(initialProjects);
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
                    console.log("✅ Custom components updated in real-time");
                }, (error) => {
                    console.error("Error in custom components listener:", error);
                });
                return unsubscribe;
            } catch (error) {
                console.error("Error setting up custom components listener:", error);
                return () => {};
            }
        };
        
        // Store cleanup functions for real-time listeners
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
                             finalUserDoc.role = 'owner';
                             await updateDoc(userDocRef, { role: 'owner' });
                         } catch (e) {
                             console.warn("Failed to auto-promote owner (permission error):", e);
                         }
                    }

                    setUserDocument({ ...finalUserDoc, id: currentUser.uid });
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
                    setProjects(initialProjects);
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

    // Leads Real-time Subscription (New)
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        if (user) {
            setIsLoadingLeads(true);
            try {
                const leadsCol = collection(db, 'users', user.uid, 'leads');
                const q = query(leadsCol, orderBy('createdAt', 'desc'));
                
                unsubscribe = onSnapshot(q, 
                    (snapshot) => {
                        const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
                        setLeads(leadsData);
                        setIsLoadingLeads(false);
                    },
                    (error) => {
                        console.error("Leads Snapshot Error:", error);
                        setIsLoadingLeads(false);
                    }
                );
            } catch (e) {
                console.error("Error setting up Leads subscription:", e);
                setIsLoadingLeads(false);
            }
        } else {
            setLeads([]);
            setIsLoadingLeads(false);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user]);
    
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
    
    // Lead Activities Real-time Subscription
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        if (user) {
            try {
                const activitiesCol = collection(db, 'users', user.uid, 'leadActivities');
                const q = query(activitiesCol, orderBy('createdAt', 'desc'));
                
                unsubscribe = onSnapshot(q, 
                    (snapshot) => {
                        const activitiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeadActivity));
                        setLeadActivities(activitiesData);
                    },
                    (error) => {
                        console.error("Lead Activities Snapshot Error:", error);
                    }
                );
            } catch (e) {
                console.error("Error setting up Lead Activities subscription:", e);
            }
        } else {
            setLeadActivities([]);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user]);
    
    // Lead Tasks Real-time Subscription
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        if (user) {
            try {
                const tasksCol = collection(db, 'users', user.uid, 'leadTasks');
                const q = query(tasksCol, orderBy('createdAt', 'desc'));
                
                unsubscribe = onSnapshot(q, 
                    (snapshot) => {
                        const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeadTask));
                        setLeadTasks(tasksData);
                    },
                    (error) => {
                        console.error("Lead Tasks Snapshot Error:", error);
                    }
                );
            } catch (e) {
                console.error("Error setting up Lead Tasks subscription:", e);
            }
        } else {
            setLeadTasks([]);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user]);


    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark', 'black'); // Remove all existing theme classes
        root.classList.add(themeMode); // Add the current one
    }, [themeMode]);

    const toggleDashboardSidebar = () => {
        setIsDashboardSidebarCollapsed(prev => !prev);
    };
    
    const onSectionSelect = (section: PageSection) => {
        setActiveSection(section);
        const element = document.getElementById(section);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const openProfileModal = () => setIsProfileModalOpen(true);
    const closeProfileModal = () => setIsProfileModalOpen(false);

    const loadProject = (projectId: string, fromAdmin: boolean = false, navigateToEditor: boolean = true) => {
        const projectToLoad = projects.find(p => p.id === projectId);
        if (projectToLoad) {
            setActiveProjectId(projectId);
            // DEEP CLONE data to prevent mutation issues
            // Also ensure that if data.chatbot is missing (old projects), we provide default
            const loadedData = projectToLoad.data;
            const defaultChatbot = initialData.data.chatbot;
            const defaultTestimonials = initialData.data.testimonials;
            
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
            
            const mergedData = {
                 ...loadedData,
                 chatbot: loadedData.chatbot || defaultChatbot,
                 testimonials: mergedTestimonials,
                 cta: mergedCta
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
            
            setData(mergedData);
            setTheme(projectToLoad.theme);
            setBrandIdentity(projectToLoad.brandIdentity || initialData.brandIdentity);
            
            // Ensure 'chatbot' is in componentOrder for legacy projects
            let order = projectToLoad.componentOrder;
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
                // Add at the very end (after footer)
                order = [...order, 'typography' as PageSection];
            }
            
            setComponentOrder(order);
            
            // Ensure sectionVisibility includes typography
            const visibility = {
                ...projectToLoad.sectionVisibility,
                typography: projectToLoad.sectionVisibility.typography ?? true
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
                setView('editor');
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
        if (!activeProjectId || !user || activeProject?.status === 'Template') return;
        const newLastUpdated = new Date().toISOString();
        try {
            const projectDocRef = doc(db, 'users', user.uid, 'projects', activeProjectId);
            await updateDoc(projectDocRef, { name: newName, lastUpdated: newLastUpdated });
            setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, name: newName, lastUpdated: newLastUpdated } : p));
        } catch (error) {
            console.error("Error renaming project:", error);
        }
    };

    const saveProject = async () => {
        if (!activeProject || !data || !user) return;

        if (activeProject.status === 'Template') {
            console.log("Template saving is a super admin function and is not persisted per user.");
            return;
        }

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
            const projectDocRef = doc(db, 'users', user.uid, 'projects', activeProject.id);
            await setDoc(projectDocRef, dataToSave);
            
            setProjects(prev => prev.map(p => p.id === activeProject.id ? updatedProject : p));
            console.log('Project saved to Firestore');
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

        const { id, ...projectData } = project;
        const now = new Date().toISOString();
        const dataToSave = {
            ...projectData,
            createdAt: projectData.createdAt || now,
            lastUpdated: now
        };

        try {
            console.log("💾 [addNewProject] Saving to Firebase...", {
                userId: user.uid,
                projectName: project.name
            });

            const projectsCol = collection(db, 'users', user.uid, 'projects');
            const docRef = await addDoc(projectsCol, dataToSave);

            console.log("✅ [addNewProject] Saved successfully!", {
                docId: docRef.id,
                projectName: project.name
            });

            const newProjectWithId: Project = { ...dataToSave, id: docRef.id };

            setProjects(prev => {
                console.log("📋 [addNewProject] Updating projects state...", {
                    previousCount: prev.length,
                    newCount: prev.length + 1
                });
                return [newProjectWithId, ...prev];
            });

            console.log("🔄 [addNewProject] Loading project into editor...");
            loadProject(newProjectWithId.id);

            // Trigger Image Auto-Generation for Wizard-created projects
            if (newProjectWithId.imagePrompts && Object.keys(newProjectWithId.imagePrompts).length > 0) {
                console.log("🖼️ [addNewProject] Starting image generation...", {
                    promptCount: Object.keys(newProjectWithId.imagePrompts).length
                });
                hydrateProjectImages(newProjectWithId);
            }

            console.log("🎉 [addNewProject] Complete! Project ID:", docRef.id);
            return docRef.id;

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

    const createNewTemplate = () => {
        const baseTemplate = projects.find(p => p.id === 'template-local-service') || initialProjects[0];
        const newTemplate: Project = {
            ...baseTemplate,
            id: `template-${Date.now()}`,
            name: 'New Custom Template',
            status: 'Template',
            lastUpdated: new Date().toISOString(),
        };
        setProjects(prev => [...prev, newTemplate]);
        loadProject(newTemplate.id, true);
    };

    const archiveTemplate = (templateId: string, isArchived: boolean) => {
        setProjects(prev => prev.map(p => p.id === templateId ? { ...p, isArchived } : p));
    };

    const duplicateTemplate = (templateId: string) => {
        const template = projects.find(p => p.id === templateId);
        if (!template) return;
        
        const duplicatedTemplate: Project = {
            ...template,
            id: `template-${Date.now()}`,
            name: `${template.name} (Copy)`,
            lastUpdated: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isArchived: false,
        };
        
        setProjects(prev => [...prev, duplicatedTemplate]);
        // Optionally load the duplicated template in the editor
        // loadProject(duplicatedTemplate.id, true);
    };

    const deleteProject = async (projectId: string) => {
        if (!projectId) return;

        const projectToDelete = projects.find(p => p.id === projectId);
        const isTemplate = projectToDelete ? projectToDelete.status === 'Template' : false;

        // 1. Handle Templates
        if (isTemplate) {
            setProjects(prev => prev.filter(p => p.id !== projectId));
            if (activeProjectId === projectId) {
                setActiveProjectId(null);
                setData(null);
                setView('dashboard');
            }
            return;
        }

        // 2. Handle User Projects
        if (!user) {
             throw new Error("User not authenticated");
        }

        // Optimistic Update
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (activeProjectId === projectId) {
             setActiveProjectId(null);
             setData(null);
             setView('dashboard');
        }

        try {
            const projectDocRef = doc(db, 'users', user.uid, 'projects', projectId);
            await deleteDoc(projectDocRef);
        } catch (error: any) {
            console.error("Error deleting project:", error);
            // Revert state on failure
            if (projectToDelete) {
                setProjects(prev => [...prev, projectToDelete]);
            }
            throw error;
        }
    };
    
    const uploadFile = async (file: File) => {
        if (!user) return;
        setIsFilesLoading(true);
        try {
            const storageRef = ref(storage, `user_uploads/${user.uid}/${file.name}`);
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
                projectId: currentProject?.id,
                projectName: currentProject?.name
            };

            const filesCol = collection(db, 'users', user.uid, 'files');
            const docRef = await addDoc(filesCol, newFileRecord);

            setFiles(prev => [{ id: docRef.id, ...newFileRecord, createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } } as FileRecord, ...prev]);

        } catch (error) {
            console.error("Error uploading file:", error);
        } finally {
            setIsFilesLoading(false);
        }
    };
    
    const deleteFile = async (fileId: string, storagePath: string) => {
        if (!user) return;
        try {
            const fileRef = ref(storage, storagePath);
            await deleteObject(fileRef);

            const fileDocRef = doc(db, 'users', user.uid, 'files', fileId);
            await deleteDoc(fileDocRef);

            setFiles(prev => prev.filter(f => f.id !== fileId));
        } catch (error) {
            console.error("Error deleting file:", error);
        }
    };
    
    const updateFileNotes = async (fileId: string, notes: string) => {
        if (!user) return;
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, notes } : f));
        try {
            const fileDocRef = doc(db, 'users', user.uid, 'files', fileId);
            await updateDoc(fileDocRef, { notes });
        } catch (error) {
            console.error("Error updating file notes:", error);
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
        const aiStudio = typeof window !== 'undefined' ? (window as any).aistudio : undefined;
        if (typeof aiStudio?.openSelectKey === 'function') {
            await aiStudio.openSelectKey();
            const key = await syncApiKeyFromAiStudio();
            setHasApiKey(Boolean(key));
        }
    };

    const generateFileSummary = async (fileId: string, downloadURL: string) => {
        if (!user) return;
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
            
            const ai = await getGoogleGenAI();
            const response = await ai.models.generateContent({ model: summaryPrompt.model, contents: populatedPrompt });
            
            // Log API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: summaryPrompt.model,
                    feature: 'file-summary',
                    success: true
                });
            }
            
            const summary = response.text.trim();
            
            const fileDocRef = doc(db, 'users', user.uid, 'files', fileId);
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
            console.error("Error generating file summary:", error);
            const errorMessage = 'Error generating summary.';
            const fileDocRef = doc(db, 'users', user.uid, 'files', fileId);
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

    const enhancePrompt = async (draftPrompt: string): Promise<string> => {
        if (hasApiKey === false) {
            await promptForKeySelection();
            throw new Error("Please select an API key.");
        }

        const ai = await getGoogleGenAI();
        try {
             const enhancerPrompt = getPrompt('image-prompt-enhancer');
             let model = 'gemini-2.5-pro';
             let promptTemplate = `Enhance this image generation prompt... Original: "{{originalPrompt}}"`;

             if (enhancerPrompt) {
                 model = enhancerPrompt.model;
                 promptTemplate = enhancerPrompt.template;
             }

             const filledPrompt = promptTemplate.replace('{{originalPrompt}}', draftPrompt);

             const response = await ai.models.generateContent({
                model: model,
                contents: filledPrompt,
            });
            
            // Log API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: model,
                    feature: 'image-prompt-enhancer',
                    success: true
                });
            }
            
            return response.text.trim();
        } catch (error: any) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: model || 'gemini-2.5-pro',
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

    const generateImage = async (prompt: string, options?: { aspectRatio?: string, style?: string, destination?: 'user' | 'global' }): Promise<string> => {
        if (!user) throw new Error("Authentication required to generate images.");
        
        if (hasApiKey === false) {
            await promptForKeySelection();
            throw new Error("Please select an API key first.");
        }

        const destination = options?.destination || 'user';
        if (destination === 'global' && userDocument?.role !== 'superadmin') {
             throw new Error("Unauthorized: Only admins can generate global images.");
        }

        const ai = await getGoogleGenAI();
        
        const galleryPromptConfig = getPrompt('image-generation-gallery');
        let modelName = 'imagen-4.0-generate-001';
        let promptTemplate = '{{prompt}}, {{style}}, professional high quality photo';

        if (galleryPromptConfig) {
            modelName = galleryPromptConfig.model;
            promptTemplate = galleryPromptConfig.template;
        }

        let finalPrompt = promptTemplate.replace('{{prompt}}', prompt).replace('{{style}}', options?.style && options.style !== 'None' ? `${options.style} style` : '');

        try {
            let base64Image: string | undefined;

            if (modelName.includes('imagen')) {
                // Use Imagen API
                const response = await ai.models.generateImages({
                    model: modelName,
                    prompt: finalPrompt,
                    config: {
                        numberOfImages: 1,
                        aspectRatio: (options?.aspectRatio || '1:1') as any,
                        outputMimeType: 'image/jpeg',
                    },
                });
                base64Image = response.generatedImages?.[0]?.image?.imageBytes;
                
                // Log API call
                if (user) {
                    logApiCall({
                        userId: user.uid,
                        projectId: activeProject?.id,
                        model: modelName,
                        feature: 'image-generation-imagen',
                        success: true
                    });
                }
            } else if (modelName.includes('gemini') || modelName.includes('nano')) {
                // Use Gemini / Nano Banana Pro (generateContent)
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: {
                        parts: [{ text: finalPrompt }]
                    },
                    // Gemini 3 image generation typically uses generateContent and returns inlineData
                });
                
                // Log API call
                if (user) {
                    logApiCall({
                        userId: user.uid,
                        projectId: activeProject?.id,
                        model: modelName,
                        feature: 'image-generation-gemini',
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
            } else {
                 storagePath = `user_uploads/${user.uid}/generated/${fileName}`;
                 firestoreCol = collection(db, 'users', user.uid, 'files');
            }

            const storageRef = ref(storage, storagePath);
            const snapshot = await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Create DB Record
            const newFileRecord: Omit<FileRecord, 'id'> = {
                name: fileName,
                storagePath: snapshot.ref.fullPath,
                downloadURL,
                size: blob.size,
                type: 'image/jpeg',
                createdAt: serverTimestamp() as any,
                notes: `AI Generated via ${modelName}. Prompt: "${prompt}". Options: ${JSON.stringify(options)}`,
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
                    projectId: activeProject?.id,
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
            const projectDocRef = doc(db, 'users', user.uid, 'projects', activeProjectId);
            await updateDoc(projectDocRef, { seoConfig: newConfig });
            console.log('SEO configuration updated successfully');
        } catch (error) {
            console.error('Error updating SEO config:', error);
        }
    };

    // Leads & CRM Logic
    const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt'>) => {
        if (!user) return;
        try {
            const leadsCol = collection(db, 'users', user.uid, 'leads');
            const now = serverTimestamp();
            await addDoc(leadsCol, { ...leadData, createdAt: now });
            // Optimistic update via listener
        } catch (error) {
            console.error("Error adding lead:", error);
        }
    };

    const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
        if (!user) return;
        try {
            const leadRef = doc(db, 'users', user.uid, 'leads', leadId);
            await updateDoc(leadRef, { status });
        } catch (error) {
            console.error("Error updating lead status:", error);
        }
    };

    const updateLead = async (leadId: string, data: Partial<Lead>) => {
        if (!user) return;
        try {
            const leadRef = doc(db, 'users', user.uid, 'leads', leadId);
            await updateDoc(leadRef, data);
        } catch (error) {
            console.error("Error updating lead:", error);
        }
    };

    const deleteLead = async (leadId: string) => {
        if (!user) return;
        try {
            const leadRef = doc(db, 'users', user.uid, 'leads', leadId);
            await deleteDoc(leadRef);
            
            // Also delete all activities and tasks associated with this lead
            const activitiesCol = collection(db, 'users', user.uid, 'leadActivities');
            const activitiesSnapshot = await getDocs(query(activitiesCol));
            const deleteActivitiesPromises = activitiesSnapshot.docs
                .filter(doc => doc.data().leadId === leadId)
                .map(doc => deleteDoc(doc.ref));
            
            const tasksCol = collection(db, 'users', user.uid, 'leadTasks');
            const tasksSnapshot = await getDocs(query(tasksCol));
            const deleteTasksPromises = tasksSnapshot.docs
                .filter(doc => doc.data().leadId === leadId)
                .map(doc => deleteDoc(doc.ref));
            
            await Promise.all([...deleteActivitiesPromises, ...deleteTasksPromises]);
        } catch (error) {
             console.error("Error deleting lead:", error);
        }
    };
    
    // Lead Activities
    const addLeadActivity = async (leadId: string, activityData: Omit<LeadActivity, 'id' | 'createdAt' | 'leadId'>) => {
        if (!user) return;
        try {
            const activitiesCol = collection(db, 'users', user.uid, 'leadActivities');
            const now = serverTimestamp();
            await addDoc(activitiesCol, {
                ...activityData,
                leadId,
                createdAt: now,
                createdBy: user.uid
            });
            // Will be updated via listener
        } catch (error) {
            console.error("Error adding lead activity:", error);
        }
    };
    
    const getLeadActivities = (leadId: string): LeadActivity[] => {
        return leadActivities
            .filter(activity => activity.leadId === leadId)
            .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    };
    
    // Lead Tasks
    const addLeadTask = async (leadId: string, taskData: Omit<LeadTask, 'id' | 'createdAt' | 'leadId'>) => {
        if (!user) return;
        try {
            const tasksCol = collection(db, 'users', user.uid, 'leadTasks');
            const now = serverTimestamp();
            await addDoc(tasksCol, {
                ...taskData,
                leadId,
                createdAt: now
            });
            // Will be updated via listener
        } catch (error) {
            console.error("Error adding lead task:", error);
        }
    };
    
    const updateLeadTask = async (taskId: string, data: Partial<LeadTask>) => {
        if (!user) return;
        try {
            const taskRef = doc(db, 'users', user.uid, 'leadTasks', taskId);
            await updateDoc(taskRef, data);
        } catch (error) {
            console.error("Error updating lead task:", error);
        }
    };
    
    const deleteLeadTask = async (taskId: string) => {
        if (!user) return;
        try {
            const taskRef = doc(db, 'users', user.uid, 'leadTasks', taskId);
            await deleteDoc(taskRef);
        } catch (error) {
            console.error("Error deleting lead task:", error);
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
    
    // Domain Logic
    const addDomain = async (domainData: Domain) => {
        if (!user) return;
        const newDomain = { ...domainData, createdAt: new Date().toISOString() };
        setDomains(prev => [newDomain, ...prev]); // Optimistic
        try {
            const domainsCol = collection(db, 'users', user.uid, 'domains');
            await setDoc(doc(domainsCol, domainData.id), newDomain);
        } catch(e) {
             console.error("Error adding domain", e);
        }
    };
    
    const updateDomain = async (id: string, data: Partial<Domain>) => {
        if (!user) return;
        setDomains(prev => prev.map(d => d.id === id ? {...d, ...data} : d));
        try {
            const docRef = doc(db, 'users', user.uid, 'domains', id);
            await updateDoc(docRef, data);
        } catch(e) {
            console.error("Error updating domain", e);
        }
    };
    
    const deleteDomain = async (id: string) => {
        if (!user) return;
        setDomains(prev => prev.filter(d => d.id !== id));
        try {
             const docRef = doc(db, 'users', user.uid, 'domains', id);
             await deleteDoc(docRef);
        } catch(e) {
             console.error("Error deleting domain", e);
        }
    };
    
    const verifyDomain = async (id: string): Promise<boolean> => {
        if (!user) return false;
        
        const domain = domains.find(d => d.id === id);
        if (!domain) return false;
        
        try {
            // Use deployment service for real DNS verification
            const result = await deploymentService.verifyDNS(domain.name);
            
            if (result.verified) {
                await updateDomain(id, { 
                    status: 'active',
                    dnsRecords: result.records
                });
                return true;
            } else {
                await updateDomain(id, { 
                    status: 'pending',
                    dnsRecords: result.records
                });
                return false;
            }
        } catch (error) {
            console.error('Domain verification error:', error);
            await updateDomain(id, { status: 'error' });
            return false;
        }
    };

    const deployDomain = async (
        domainId: string, 
        provider: 'vercel' | 'cloudflare' | 'netlify' = 'vercel'
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
                },
                deploymentLogs: [
                    ...(domain.deploymentLogs || []),
                    deploymentService.createDeploymentLog(
                        'started',
                        `Starting deployment to ${provider}...`,
                        `Project: ${project.name}`
                    )
                ]
            });
            
            // Perform actual deployment
            const result = await deploymentService.deployProject(project, domain, provider);
            
            if (result.success) {
                // Update with success
                await updateDomain(domainId, {
                    status: 'deployed',
                    deployment: {
                        provider,
                        deploymentUrl: result.deploymentUrl,
                        deploymentId: result.deploymentId,
                        lastDeployedAt: new Date().toISOString(),
                        status: 'success'
                    },
                    dnsRecords: result.dnsRecords,
                    deploymentLogs: [
                        ...(domain.deploymentLogs || []),
                        deploymentService.createDeploymentLog(
                            'success',
                            'Deployment completed successfully!',
                            `URL: ${result.deploymentUrl}`
                        )
                    ]
                });
                return true;
            } else {
                // Update with failure
                await updateDomain(domainId, {
                    status: 'error',
                    deployment: {
                        provider,
                        status: 'failed',
                        error: result.error
                    },
                    deploymentLogs: [
                        ...(domain.deploymentLogs || []),
                        deploymentService.createDeploymentLog(
                            'failed',
                            'Deployment failed',
                            result.error
                        )
                    ]
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
        return prompts.find(p => p.name === name) || defaultPrompts.find(p => p.name === name) as LLMPrompt | undefined;
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

    const updateComponentStyle = async (componentId: string, newStyles: any, isCustom: boolean) => {
        console.log('💾 updateComponentStyle called:', { componentId, newStyles, isCustom, userRole: userDocument?.role });
        
        // Allow superadmin, admin, manager, and owner to edit components
        if (!['superadmin', 'admin', 'manager', 'owner'].includes(userDocument?.role || '')) {
            console.warn('❌ Permission denied. User role:', userDocument?.role);
            return;
        }
        
        if (isCustom) {
            // UPDATE LOCAL STATE ONLY
            setCustomComponents(prev => prev.map(c => c.id === componentId ? { ...c, styles: { ...c.styles, ...newStyles } } : c));
        } else {
            // UPDATE LOCAL STATE ONLY - Force immutable update
            setComponentStyles(prev => {
                const currentStyles = prev[componentId as EditableComponentID];
                const updated = {
                    ...prev,
                    [componentId]: {
                        ...currentStyles,
                        ...newStyles
                    }
                };
                console.log('🔄 Component Style Updated:');
                console.log('  - Component ID:', componentId);
                console.log('  - New styles:', newStyles);
                console.log('  - Current styles:', currentStyles);
                console.log('  - Updated styles:', updated[componentId as EditableComponentID]);
                return updated;
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
                 const docRef = doc(db, 'component_defaults', componentId);
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
        user,
        loadingAuth,
        userDocument, setUserDocument,
        verificationEmail, setVerificationEmail,
        isProfileModalOpen, openProfileModal, closeProfileModal,
        renameActiveProject,
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
        // Global Assistant
        globalAssistantConfig,
        saveGlobalAssistantConfig,
        isEditingTemplate,
        exitTemplateEditor,
        createNewTemplate,
        archiveTemplate,
        duplicateTemplate,
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
        isOnboardingOpen, setIsOnboardingOpen,
        onboardingState, setOnboardingState,
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
        updateSeoConfig
    };
    
    return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};
