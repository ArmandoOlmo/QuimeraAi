
import React, { createContext, useState, useContext, ReactNode, useRef, useEffect } from 'react';
import { PageData, ThemeData, PageSection, PreviewDevice, View, Project, ThemeMode, UserDocument, FileRecord, LLMPrompt, ComponentStyles, EditableComponentID, CustomComponent, BrandIdentity, CMSPost, Menu, AdminView, AiAssistantConfig, GlobalAssistantConfig, OnboardingState, Lead, LeadStatus, Domain } from '../types';
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
import { GoogleGenAI, Modality } from '@google/genai';


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
    createProjectFromTemplate: (templateId: string) => Promise<void>;
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
    updateUserRole: (userId: string, role: 'user' | 'superadmin') => Promise<void>;
    deleteUserRecord: (userId: string) => Promise<void>;
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

    // Component Studio
    componentStyles: ComponentStyles;
    customComponents: CustomComponent[];
    updateComponentStyle: (componentId: string, newStyles: any, isCustom: boolean) => Promise<void>;
    saveComponent: (componentId: string) => Promise<void>;
    createNewCustomComponent: (name: string, baseComponent: EditableComponentID) => Promise<CustomComponent>;

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

    // Domain Management
    domains: Domain[];
    addDomain: (domain: Domain) => Promise<void>;
    updateDomain: (id: string, data: Partial<Domain>) => Promise<void>;
    deleteDomain: (id: string) => Promise<void>;
    verifyDomain: (id: string) => Promise<boolean>;

    // API Key Management
    hasApiKey: boolean | null;
    promptForKeySelection: () => Promise<void>;
    handleApiError: (error: any) => void;
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

    // CMS State
    const [cmsPosts, setCmsPosts] = useState<CMSPost[]>([]);
    const [isLoadingCMS, setIsLoadingCMS] = useState(false);

    // Leads State
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);

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
        goal: 'Generate Leads'
    });

    // Domains State
    const [domains, setDomains] = useState<Domain[]>([]);

    // API Key State
    const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);


    // Effects
    useEffect(() => {
        const checkApiKey = async () => {
            if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
                const keyStatus = await (window as any).aistudio.hasSelectedApiKey();
                setHasApiKey(keyStatus);
            } else {
                setHasApiKey(true); // Fallback for environments where aistudio is not available
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
            } catch (error) {
                console.warn("Error fetching global settings:", error);
            }
        };

        const fetchComponentDefaults = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "component_defaults"));
                const loadedStyles: any = {};
                querySnapshot.forEach((doc) => {
                    loadedStyles[doc.id] = doc.data().styles;
                });
                if (Object.keys(loadedStyles).length > 0) {
                    setComponentStyles(prev => ({ ...prev, ...loadedStyles }));
                }
            } catch (e) {
                console.error("Error loading component defaults:", e);
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
            try {
                const projectsCol = collection(db, 'users', userId, 'projects');
                const q = query(projectsCol, orderBy('lastUpdated', 'desc'));
                const projectSnapshot = await getDocs(q);
                const userProjects = projectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
                
                setProjects([...initialProjects, ...userProjects]);
            } catch (error) {
                console.error("Error loading user projects:", error);
                setProjects(initialProjects);
            }
        };

        const fetchCustomComponents = async () => {
            try {
                const customComponentsCol = collection(db, 'customComponents');
                const q = query(customComponentsCol, orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                const components = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomComponent));
                setCustomComponents(components);
            } catch (error) {
                console.error("Error fetching custom components:", error);
            }
        };
        
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            try {
                setUser(currentUser);
                if (currentUser) {
                    // Fetch global configs only when authenticated to avoid permission errors
                    fetchGlobalSettings();
                    fetchComponentDefaults();

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
                    
                    if (currentUser.email === 'armandoolmomiranda@gmail.com' && finalUserDoc.role !== 'superadmin') {
                         try {
                             finalUserDoc.role = 'superadmin';
                             await updateDoc(userDocRef, { role: 'superadmin' });
                         } catch (e) {
                             console.warn("Failed to auto-promote superadmin (permission error):", e);
                         }
                    }

                    setUserDocument({ ...finalUserDoc, id: currentUser.uid });
                    loadUserProjects(currentUser.uid);
                    fetchAllFiles(currentUser.uid);
                    fetchUserDomains(currentUser.uid);
                    fetchGlobalFiles();
                    fetchAllPrompts(); // Fetch prompts for all users to ensure dynamic system behavior

                    if (finalUserDoc.role === 'superadmin') {
                        fetchCustomComponents();
                    }

                } else {
                    setUserDocument(null);
                    setProjects(initialProjects);
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
        return () => unsubscribe();
    }, []);

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
            
            const mergedData = {
                 ...loadedData,
                 chatbot: loadedData.chatbot || defaultChatbot
            };
            
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
            setComponentOrder(order);
            
            setSectionVisibility(projectToLoad.sectionVisibility);
            setMenus(Array.isArray(projectToLoad.menus) ? projectToLoad.menus : [{ id: 'main', title: 'Main Menu', handle: 'main-menu', items: [] }]);
            
            // Load AI Config if exists
            if (projectToLoad.aiAssistantConfig) {
                setAiAssistantConfig(projectToLoad.aiAssistantConfig);
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

    const createProjectFromTemplate = async (templateId: string) => {
        if (!user) return;
        const template = projects.find(p => p.id === templateId);
        if (template) {
            const { id, ...templateData } = template;
            const newProjectData = {
                ...templateData,
                name: `${template.name} Copy`,
                status: 'Draft' as 'Draft',
                lastUpdated: new Date().toISOString(),
                sourceTemplateId: template.id,
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
    
    const addNewProject = async (project: Project) => {
        if (!user) return;

        const { id, ...projectData } = project;
        const dataToSave = {
            ...projectData,
            lastUpdated: new Date().toISOString()
        };

        try {
            const projectsCol = collection(db, 'users', user.uid, 'projects');
            const docRef = await addDoc(projectsCol, dataToSave);

            const newProjectWithId: Project = { ...dataToSave, id: docRef.id };

            setProjects(prev => [newProjectWithId, ...prev]);
            loadProject(newProjectWithId.id);

            // Trigger Image Auto-Generation for Wizard-created projects
            if (newProjectWithId.imagePrompts && Object.keys(newProjectWithId.imagePrompts).length > 0) {
                hydrateProjectImages(newProjectWithId);
            }

        } catch (error) {
            console.error("Error adding new project:", error);
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
                aiSummary: ''
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
        if (userDocument?.role !== 'superadmin') return;
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
        if (userDocument?.role !== 'superadmin') return;
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
            setHasApiKey(false);
        }
    };
    
    const promptForKeySelection = async () => {
        if (typeof (window as any).aistudio?.openSelectKey === 'function') {
            await (window as any).aistudio.openSelectKey();
            setHasApiKey(true);
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
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response = await ai.models.generateContent({ model: summaryPrompt.model, contents: populatedPrompt });
            
            const summary = response.text.trim();
            
            const fileDocRef = doc(db, 'users', user.uid, 'files', fileId);
            await updateDoc(fileDocRef, { aiSummary: summary });

            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, aiSummary: summary } : f));
        } catch (error) {
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

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        try {
             const enhancerPrompt = getPrompt('image-prompt-enhancer');
             let model = 'gemini-3-pro-preview';
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
            return response.text.trim();
        } catch (error) {
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

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        
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
            } else if (modelName.includes('gemini') || modelName.includes('nano')) {
                // Use Gemini / Nano Banana Pro (generateContent)
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: {
                        parts: [{ text: finalPrompt }]
                    },
                    // Gemini 3 image generation typically uses generateContent and returns inlineData
                });
                
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

        } catch (error) {
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
        } catch (error) {
             console.error("Error deleting lead:", error);
        }
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
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        const success = Math.random() > 0.3; // Simulate success chance
        
        if (success) {
            updateDomain(id, { status: 'active' });
        } else {
            updateDomain(id, { status: 'error' });
        }
        return success;
    };

    // Global Assistant Save (Super Admin)
    const saveGlobalAssistantConfig = async (config: GlobalAssistantConfig) => {
        if (userDocument?.role !== 'superadmin') return;
        setGlobalAssistantConfig(config);
        try {
            await setDoc(doc(db, 'settings', 'global_assistant'), config);
        } catch (e) {
            console.error("Error saving global assistant config:", e);
        }
    };

    // Super Admin Functions
    const fetchAllUsers = async () => {
        if (userDocument?.role !== 'superadmin') return;
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);
        const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDocument));
        setAllUsers(userList);
    };

    const updateUserRole = async (userId: string, role: 'user' | 'superadmin') => {
        if (userDocument?.role !== 'superadmin') return;
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, { role });
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    };

    const deleteUserRecord = async (userId: string) => {
        if (userDocument?.role !== 'superadmin') return;
        // This only deletes the Firestore record, not the Auth user.
        // This is a simplification for the current feature scope.
        const userDocRef = doc(db, 'users', userId);
        await deleteDoc(userDocRef);
        setAllUsers(prev => prev.filter(u => u.id !== userId));
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
                // Only seed if superadmin
                if (userDocument?.role === 'superadmin') {
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
        if (userDocument?.role !== 'superadmin') return;
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
        if (userDocument?.role !== 'superadmin') return;
        const promptDocRef = doc(db, 'prompts', promptId);
        await deleteDoc(promptDocRef);
        await fetchAllPrompts(); // Refresh list
    };

    const updateComponentStyle = async (componentId: string, newStyles: any, isCustom: boolean) => {
        if (userDocument?.role !== 'superadmin') return;
        
        if (isCustom) {
            // UPDATE LOCAL STATE ONLY
            setCustomComponents(prev => prev.map(c => c.id === componentId ? { ...c, styles: { ...c.styles, ...newStyles } } : c));
        } else {
            // UPDATE LOCAL STATE ONLY
            setComponentStyles(prev => ({
                ...prev,
                [componentId]: {
                    ...prev[componentId as EditableComponentID],
                    ...newStyles
                }
            }));
        }
    };

    const saveComponent = async (componentId: string) => {
        if (userDocument?.role !== 'superadmin') return;
        
        try {
            // Check if Custom
            const customComp = customComponents.find(c => c.id === componentId);
            if (customComp) {
                 const docRef = doc(db, 'customComponents', componentId);
                 await updateDoc(docRef, { styles: customComp.styles });
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
        if (userDocument?.role !== 'superadmin') {
            throw new Error("Only superadmins can create custom components.");
        }
        
        const newComponentData: Omit<CustomComponent, 'id' | 'createdAt'> = {
            name,
            baseComponent,
            styles: componentStyles[baseComponent],
        };

        try {
            const customComponentsCol = collection(db, 'customComponents');
            const docRef = await addDoc(customComponentsCol, { ...newComponentData, createdAt: serverTimestamp() });

            const createdComponent: CustomComponent = {
                id: docRef.id,
                ...newComponentData,
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 }
            };
            
            setCustomComponents(prev => [createdComponent, ...prev]);
            return createdComponent;
        } catch (error) {
            console.error("Error creating custom component:", error);
            throw error;
        }
    };

    const updateComponentStatus = async (componentId: PageSection, isEnabled: boolean) => {
        if (userDocument?.role !== 'superadmin') return;
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
        componentStyles,
        customComponents,
        updateComponentStyle,
        saveComponent,
        createNewCustomComponent,
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
        // Domains
        domains,
        addDomain,
        updateDomain,
        deleteDomain,
        verifyDomain
    };
    
    return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};
