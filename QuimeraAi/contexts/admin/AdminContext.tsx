/**
 * AdminContext
 * Maneja tenants, usuarios administradores, prompts y configuración global
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import {
    UserDocument,
    UserRole,
    Tenant,
    TenantStatus,
    TenantLimits,
    LLMPrompt,
    GlobalAssistantConfig,
    ComponentStyles,
    CustomComponent,
    DesignTokens,
    PageSection,
    ComponentVariant,
    EditableComponentID,
    AppTokens,
    LandingChatbotConfig,
    defaultLandingChatbotConfig,
    GlobalChatbotPrompts,
    AdPixelConfig,
} from '../../types';
import { defaultAppTokens, getAppTokensWithDefaults, applyAppTokensToCSS } from '../../utils/appTokenApplier';
import { ThemeMode } from '../../types';
import { componentStyles as defaultComponentStyles } from '../../data/componentStyles';
import { defaultPrompts } from '../../data/defaultPrompts';
import { initialData } from '../../data/initialData';
import {
    db,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    getDocs,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
} from '../../firebase';
import { useAuth } from '../core/AuthContext';

// Build default component status
const allComponents = initialData.componentOrder;
const defaultComponentStatus = allComponents.reduce((acc, comp) => {
    acc[comp as PageSection] = true;
    return acc;
}, {} as Record<PageSection, boolean>);

interface AdminContextType {
    // User Management
    allUsers: UserDocument[];
    fetchAllUsers: () => Promise<void>;
    updateUserRole: (userId: string, role: UserRole) => Promise<void>;
    deleteUserRecord: (userId: string) => Promise<void>;
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

    // Prompts Management
    prompts: LLMPrompt[];
    getPrompt: (name: string) => LLMPrompt | undefined;
    fetchAllPrompts: () => Promise<void>;
    savePrompt: (prompt: Omit<LLMPrompt, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
    deletePrompt: (promptId: string) => Promise<void>;
    syncPrompts: () => Promise<void>;

    // Global Assistant Config
    globalAssistantConfig: GlobalAssistantConfig;
    saveGlobalAssistantConfig: (config: GlobalAssistantConfig) => Promise<void>;

    // Landing Chatbot Config
    landingChatbotConfig: LandingChatbotConfig;
    saveLandingChatbotConfig: (config: LandingChatbotConfig) => Promise<void>;

    // Global Ad Tracking Pixels (App-wide analytics)
    globalAdPixels: AdPixelConfig | null;
    saveGlobalAdPixels: (config: AdPixelConfig) => Promise<void>;

    // Global Chatbot Prompts (System prompts for all project chatbots)
    globalChatbotPrompts: GlobalChatbotPrompts | null;
    fetchGlobalChatbotPrompts: () => Promise<void>;
    saveGlobalChatbotPrompts: (prompts: GlobalChatbotPrompts) => Promise<void>;

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

    // App Tokens (Dashboard/Admin theming)
    appTokens: AppTokens;
    updateAppTokens: (tokens: AppTokens) => Promise<void>;

    // Global Component Status
    componentStatus: Record<PageSection, boolean>;
    updateComponentStatus: (componentId: PageSection, isEnabled: boolean) => Promise<void>;

    // Usage & Billing
    usage: { used: number; limit: number; plan: string } | null;
    isLoadingUsage: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, userDocument } = useAuth();

    // User Management State
    const [allUsers, setAllUsers] = useState<UserDocument[]>([]);

    // Tenant State
    const [tenants, setTenants] = useState<Tenant[]>([]);

    // Prompts State
    const [prompts, setPrompts] = useState<LLMPrompt[]>([]);

    // Global Assistant Config
    const [globalAssistantConfig, setGlobalAssistantConfig] = useState<GlobalAssistantConfig>({
        isEnabled: true,
        model: 'gemini-2.5-flash',
        enableLiveVoice: true,
        voiceName: 'Puck',
        greeting: '👋 ¡Hola! Soy tu Asistente Quimera',
        systemInstruction: 'You are the Quimera.ai Global Assistant.',
        enabledTemplates: undefined,
        customInstructions: '',
        permissions: {},
        temperature: 0.7,
        maxTokens: 500,
        autoDetectLanguage: true,
        supportedLanguages: 'English, Spanish, French'
    });

    // Landing Chatbot Config
    const [landingChatbotConfig, setLandingChatbotConfig] = useState<LandingChatbotConfig>(defaultLandingChatbotConfig);

    // Global Ad Tracking Pixels State
    const [globalAdPixels, setGlobalAdPixels] = useState<AdPixelConfig | null>(null);

    // Global Chatbot Prompts State
    const [globalChatbotPrompts, setGlobalChatbotPrompts] = useState<GlobalChatbotPrompts | null>(null);

    // Component Studio State
    const [componentStyles, setComponentStyles] = useState<ComponentStyles>(defaultComponentStyles);
    const [customComponents, setCustomComponents] = useState<CustomComponent[]>([]);

    // Design Tokens
    const [designTokens, setDesignTokens] = useState<DesignTokens | null>(null);

    // App Tokens (Dashboard/Admin theming)
    const [appTokens, setAppTokens] = useState<AppTokens>(defaultAppTokens);

    // Component Status
    const [componentStatus, setComponentStatus] = useState<Record<PageSection, boolean>>(defaultComponentStatus);

    // Usage State
    const [usage, setUsage] = useState<{ used: number; limit: number; plan: string } | null>(null);
    const [isLoadingUsage, setIsLoadingUsage] = useState(true);

    // Fetch global settings on mount
    useEffect(() => {
        if (!user) return;

        const fetchGlobalSettings = async () => {
            try {
                // Component status
                const compDoc = await getDoc(doc(db, 'settings', 'components'));
                if (compDoc.exists()) {
                    const status = compDoc.data().status;
                    const mergedStatus = { ...defaultComponentStatus };
                    Object.keys(status).forEach(key => {
                        mergedStatus[key as PageSection] = status[key];
                    });
                    setComponentStatus(mergedStatus);
                }

                // Global assistant config
                const assistantDoc = await getDoc(doc(db, 'settings', 'global_assistant'));
                if (assistantDoc.exists()) {
                    setGlobalAssistantConfig(prev => ({ ...prev, ...assistantDoc.data() }));
                }

                // Landing chatbot config
                const landingChatbotDoc = await getDoc(doc(db, 'settings', 'landingChatbot'));
                if (landingChatbotDoc.exists()) {
                    setLandingChatbotConfig(prev => ({ ...prev, ...landingChatbotDoc.data() }));
                }

                // Global Ad Tracking Pixels (for app-wide analytics)
                const adPixelsDoc = await getDoc(doc(db, 'settings', 'globalAdPixels'));
                if (adPixelsDoc.exists()) {
                    setGlobalAdPixels(adPixelsDoc.data() as AdPixelConfig);
                }

                // Design tokens
                const tokensDoc = await getDoc(doc(db, 'settings', 'designTokens'));
                if (tokensDoc.exists()) {
                    setDesignTokens(tokensDoc.data() as DesignTokens);
                }

                // App tokens
                const appTokensDoc = await getDoc(doc(db, 'settings', 'appTokens'));
                if (appTokensDoc.exists()) {
                    const loadedTokens = appTokensDoc.data() as Partial<AppTokens>;
                    const fullTokens = getAppTokensWithDefaults(loadedTokens);
                    setAppTokens(fullTokens);
                    // Apply tokens to CSS
                    const themeMode = (localStorage.getItem('themeMode') as ThemeMode) || 'dark';
                    applyAppTokensToCSS(fullTokens, themeMode);
                }
            } catch (error) {
                console.warn("Error fetching global settings:", error);
            }
        };

        fetchGlobalSettings();
    }, [user]);

    // Setup custom components listener
    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, 'customComponents'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const components = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            } as CustomComponent));
            setCustomComponents(components);
        }, (error) => {
            if (error.code !== 'permission-denied' && error.code !== 'failed-precondition') {
                console.error("Error in custom components listener:", error);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [user]);

    // Setup landing chatbot config listener for real-time updates
    // This runs for ALL users (authenticated or not) since it's for the public landing page
    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, 'settings', 'landingChatbot'),
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    setLandingChatbotConfig(prev => ({ ...prev, ...docSnapshot.data() }));
                }
            },
            (error) => {
                // Silently ignore permission errors for unauthenticated users
                if (error.code !== 'permission-denied' && error.code !== 'failed-precondition') {
                    console.error("Error in landing chatbot config listener:", error);
                }
            }
        );

        return () => {
            unsubscribe();
        };
    }, []); // No dependency on user - runs for everyone

    // User Management Functions
    const fetchAllUsers = async () => {
        try {
            const usersCol = collection(db, 'users');
            const snapshot = await getDocs(usersCol);
            const users = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as UserDocument[];
            setAllUsers(users);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const updateUserRole = async (userId: string, role: UserRole) => {
        try {
            await updateDoc(doc(db, 'users', userId), { role });
            setAllUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, role } : u
            ));
        } catch (error) {
            console.error("Error updating user role:", error);
            throw error;
        }
    };

    const deleteUserRecord = async (userId: string) => {
        try {
            await deleteDoc(doc(db, 'users', userId));
            setAllUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error("Error deleting user:", error);
            throw error;
        }
    };

    const createAdmin = async (email: string, name: string, role: UserRole) => {
        try {
            const adminData = {
                email,
                name,
                role,
                createdAt: new Date().toISOString(),
            };
            await addDoc(collection(db, 'pendingAdmins'), adminData);
        } catch (error) {
            console.error("Error creating admin:", error);
            throw error;
        }
    };

    const updateUserProfile = async (name: string, photoURL: string) => {
        if (!user) return;

        try {
            await updateDoc(doc(db, 'users', user.uid), { name, photoURL });
        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    };

    const updateUserDetails = async (userId: string, data: Partial<UserDocument>) => {
        try {
            await updateDoc(doc(db, 'users', userId), data);
            setAllUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, ...data } : u
            ));
        } catch (error) {
            console.error("Error updating user details:", error);
            throw error;
        }
    };

    // Tenant Management Functions
    const fetchTenants = async () => {
        try {
            const tenantsCol = collection(db, 'tenants');
            const snapshot = await getDocs(tenantsCol);
            const tenantsList = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as Tenant[];
            setTenants(tenantsList);
        } catch (error) {
            console.error("Error fetching tenants:", error);
        }
    };

    const createTenant = async (data: {
        type: 'individual' | 'agency';
        name: string;
        email: string;
        plan: string;
        companyName?: string
    }): Promise<string> => {
        try {
            // Definir límites según el plan y tipo
            const planLimits = {
                free: { maxProjects: 1, maxUsers: 1, maxStorageGB: 1, maxAiCredits: 100 },
                starter: { maxProjects: 5, maxUsers: 1, maxStorageGB: 5, maxAiCredits: 500 },
                pro: { maxProjects: 20, maxUsers: 5, maxStorageGB: 20, maxAiCredits: 2000 },
                agency: { maxProjects: 50, maxUsers: 20, maxStorageGB: 50, maxAiCredits: 5000 },
                enterprise: { maxProjects: -1, maxUsers: -1, maxStorageGB: 100, maxAiCredits: 10000 }, // -1 = unlimited
            };

            const limits = planLimits[data.plan as keyof typeof planLimits] || planLimits.free;

            // Ajustar límites para agencias
            if (data.type === 'agency' && data.plan !== 'agency' && data.plan !== 'enterprise') {
                limits.maxUsers = Math.max(limits.maxUsers, 5);
                limits.maxProjects = Math.max(limits.maxProjects, 10);
            }

            const tenantData = {
                type: data.type,
                name: data.name,
                email: data.email,
                companyName: data.companyName || '',
                status: 'active' as TenantStatus,
                createdAt: new Date().toISOString(),
                subscriptionPlan: data.plan,
                limits: limits,
                usage: {
                    projectCount: 0,
                    userCount: 1,
                    storageUsedGB: 0,
                    aiCreditsUsed: 0,
                },
                ownerUserId: user?.uid || '',
                memberUserIds: user?.uid ? [user.uid] : [],
                projectIds: [],
                settings: {
                    allowMemberInvites: data.type === 'agency',
                    requireTwoFactor: false,
                    brandingEnabled: data.plan !== 'free',
                },
                billingInfo: {
                    mrr: 0,
                    nextBillingDate: undefined,
                    paymentMethod: undefined,
                },
            };

            const docRef = await addDoc(collection(db, 'tenants'), tenantData);
            const newTenant = { ...tenantData, id: docRef.id } as Tenant;
            setTenants(prev => [...prev, newTenant]);
            return docRef.id;
        } catch (error) {
            console.error("Error creating tenant:", error);
            throw error;
        }
    };

    const updateTenant = async (tenantId: string, data: Partial<Tenant>) => {
        try {
            await updateDoc(doc(db, 'tenants', tenantId), data);
            setTenants(prev => prev.map(t =>
                t.id === tenantId ? { ...t, ...data } : t
            ));
        } catch (error) {
            console.error("Error updating tenant:", error);
            throw error;
        }
    };

    const deleteTenant = async (tenantId: string) => {
        try {
            await deleteDoc(doc(db, 'tenants', tenantId));
            setTenants(prev => prev.filter(t => t.id !== tenantId));
        } catch (error) {
            console.error("Error deleting tenant:", error);
            throw error;
        }
    };

    const updateTenantStatus = async (tenantId: string, status: TenantStatus) => {
        await updateTenant(tenantId, { status });
    };

    const updateTenantLimits = async (tenantId: string, limits: Partial<TenantLimits>) => {
        const tenant = tenants.find(t => t.id === tenantId);
        if (tenant) {
            await updateTenant(tenantId, {
                limits: { ...tenant.limits, ...limits }
            });
        }
    };

    // Prompts Management Functions
    const fetchAllPrompts = async () => {
        try {
            const promptsCol = collection(db, 'prompts');
            const snapshot = await getDocs(promptsCol);
            const promptsList = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as LLMPrompt[];
            setPrompts(promptsList);
        } catch (error) {
            console.error("Error fetching prompts:", error);
        }
    };

    const getPrompt = (name: string): LLMPrompt | undefined => {
        return prompts.find(p => p.name === name) || defaultPrompts.find(p => p.name === name);
    };

    const savePrompt = async (prompt: Omit<LLMPrompt, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
        try {
            const now = new Date().toISOString();
            if (prompt.id) {
                await updateDoc(doc(db, 'prompts', prompt.id), {
                    ...prompt,
                    updatedAt: now,
                });
            } else {
                await addDoc(collection(db, 'prompts'), {
                    ...prompt,
                    createdAt: now,
                    updatedAt: now,
                });
            }
            await fetchAllPrompts();
        } catch (error) {
            console.error("Error saving prompt:", error);
            throw error;
        }
    };

    const deletePrompt = async (promptId: string) => {
        try {
            await deleteDoc(doc(db, 'prompts', promptId));
            setPrompts(prev => prev.filter(p => p.id !== promptId));
        } catch (error) {
            console.error("Error deleting prompt:", error);
            throw error;
        }
    };

    const syncPrompts = async () => {
        await fetchAllPrompts();
    };

    // Global Assistant Config Functions
    const saveGlobalAssistantConfig = async (config: GlobalAssistantConfig) => {
        try {
            await setDoc(doc(db, 'settings', 'global_assistant'), config);
            setGlobalAssistantConfig(config);
        } catch (error) {
            console.error("Error saving global assistant config:", error);
            throw error;
        }
    };

    // Landing Chatbot Config Functions
    const saveLandingChatbotConfig = async (config: LandingChatbotConfig) => {
        try {
            // Deep clean function to remove undefined values recursively
            const removeUndefined = (obj: any): any => {
                if (obj === null || obj === undefined) return null;
                if (Array.isArray(obj)) {
                    return obj.map(item => removeUndefined(item));
                }
                if (typeof obj === 'object') {
                    const cleaned: any = {};
                    for (const [key, value] of Object.entries(obj)) {
                        if (value !== undefined) {
                            cleaned[key] = removeUndefined(value);
                        }
                    }
                    return cleaned;
                }
                return obj;
            };

            const cleanConfig = removeUndefined(config);

            const configToSave = {
                ...cleanConfig,
                lastUpdated: serverTimestamp(),
                updatedBy: user?.uid || '',
            };

            console.log('AdminContext: Saving config to Firestore:', configToSave);
            await setDoc(doc(db, 'settings', 'landingChatbot'), configToSave);
            console.log('AdminContext: Config saved successfully');
            setLandingChatbotConfig(config);
        } catch (error) {
            console.error("Error saving landing chatbot config:", error);
            throw error;
        }
    };

    // Global Ad Tracking Pixels Functions
    const saveGlobalAdPixels = async (config: AdPixelConfig) => {
        try {
            // Clean undefined values
            const cleanConfig = Object.fromEntries(
                Object.entries(config).filter(([_, v]) => v !== undefined)
            );

            const configToSave = {
                ...cleanConfig,
                lastUpdated: serverTimestamp(),
                updatedBy: user?.uid || '',
            };

            console.log('AdminContext: Saving global ad pixels to Firestore:', configToSave);
            await setDoc(doc(db, 'settings', 'globalAdPixels'), configToSave);
            console.log('AdminContext: Global ad pixels saved successfully');
            setGlobalAdPixels(config);
        } catch (error) {
            console.error("Error saving global ad pixels:", error);
            throw error;
        }
    };

    // Global Chatbot Prompts Functions
    const fetchGlobalChatbotPrompts = async () => {
        try {
            const docRef = doc(db, 'globalSettings', 'chatbotPrompts');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setGlobalChatbotPrompts(docSnap.data() as GlobalChatbotPrompts);
            }
        } catch (error) {
            console.error('Error fetching global chatbot prompts:', error);
        }
    };

    const saveGlobalChatbotPrompts = async (prompts: GlobalChatbotPrompts) => {
        try {
            const configToSave = {
                ...prompts,
                updatedAt: new Date().toISOString(),
                updatedBy: user?.uid || '',
            };
            await setDoc(doc(db, 'globalSettings', 'chatbotPrompts'), configToSave);
            setGlobalChatbotPrompts(configToSave);
            console.log('Global chatbot prompts saved successfully');
        } catch (error) {
            console.error('Error saving global chatbot prompts:', error);
            throw error;
        }
    };

    // Component Studio Functions
    const updateComponentStyle = async (componentId: string, newStyles: any, isCustom: boolean) => {
        if (isCustom) {
            setCustomComponents(prev => prev.map(c =>
                c.id === componentId ? { ...c, styles: newStyles } : c
            ));
        } else {
            setComponentStyles(prev => ({ ...prev, [componentId]: newStyles }));
        }
    };

    const saveComponent = async (componentId: string, changeDescription?: string) => {
        try {
            const componentRef = doc(db, 'componentDefaults', componentId);
            const styles = componentStyles[componentId as keyof ComponentStyles];
            await setDoc(componentRef, { styles, updatedAt: new Date().toISOString() });
        } catch (error) {
            console.error("Error saving component:", error);
            throw error;
        }
    };

    const createNewCustomComponent = async (name: string, baseComponent: EditableComponentID): Promise<CustomComponent> => {
        const now = new Date().toISOString();
        const newComponent: Omit<CustomComponent, 'id'> = {
            name,
            baseComponent,
            styles: {},
            createdAt: now,
            updatedAt: now,
            createdBy: user?.uid || '',
            isPublic: false,
            usageCount: 0,
            versions: [],
        };

        const docRef = await addDoc(collection(db, 'customComponents'), newComponent);
        return { ...newComponent, id: docRef.id } as CustomComponent;
    };

    const deleteCustomComponent = async (componentId: string) => {
        await deleteDoc(doc(db, 'customComponents', componentId));
    };

    const duplicateComponent = async (componentId: string): Promise<CustomComponent> => {
        const original = customComponents.find(c => c.id === componentId);
        if (!original) throw new Error("Component not found");

        return await createNewCustomComponent(`${original.name} (Copy)`, original.baseComponent);
    };

    const renameCustomComponent = async (componentId: string, newName: string) => {
        await updateDoc(doc(db, 'customComponents', componentId), { name: newName });
    };

    const updateComponentVariants = async (componentId: string, variants: ComponentVariant[], activeVariant?: string) => {
        await updateDoc(doc(db, 'customComponents', componentId), {
            variants,
            activeVariant,
            updatedAt: new Date().toISOString(),
        });
    };

    const exportComponent = (componentId: string): string => {
        const component = customComponents.find(c => c.id === componentId);
        return component ? JSON.stringify(component, null, 2) : '';
    };

    const importComponent = async (jsonString: string): Promise<CustomComponent> => {
        const parsed = JSON.parse(jsonString);
        delete parsed.id;
        const docRef = await addDoc(collection(db, 'customComponents'), {
            ...parsed,
            createdAt: new Date().toISOString(),
            createdBy: user?.uid || '',
        });
        return { ...parsed, id: docRef.id } as CustomComponent;
    };

    const revertToVersion = async (componentId: string, versionNumber: number) => {
        const component = customComponents.find(c => c.id === componentId);
        if (!component || !component.versions) return;

        const version = component.versions.find(v => v.version === versionNumber);
        if (version) {
            await updateDoc(doc(db, 'customComponents', componentId), {
                styles: version.styles,
                updatedAt: new Date().toISOString(),
            });
        }
    };

    const trackComponentUsage = async (projectId: string, componentIds: string[]) => {
        // Track usage statistics
        for (const componentId of componentIds) {
            const component = customComponents.find(c => c.id === componentId);
            if (component) {
                await updateDoc(doc(db, 'customComponents', componentId), {
                    usageCount: (component.usageCount || 0) + 1,
                });
            }
        }
    };

    // Design Tokens Functions
    const updateDesignTokens = async (tokens: DesignTokens) => {
        try {
            await setDoc(doc(db, 'settings', 'designTokens'), tokens);
            setDesignTokens(tokens);
        } catch (error) {
            console.error("Error updating design tokens:", error);
            throw error;
        }
    };

    // App Tokens Functions
    const updateAppTokens = async (tokens: AppTokens) => {
        try {
            await setDoc(doc(db, 'settings', 'appTokens'), tokens);
            setAppTokens(tokens);
            // Apply tokens to CSS immediately
            const themeMode = (localStorage.getItem('themeMode') as ThemeMode) || 'dark';
            applyAppTokensToCSS(tokens, themeMode);
        } catch (error) {
            console.error("Error updating app tokens:", error);
            throw error;
        }
    };

    // Component Status Functions
    const updateComponentStatus = async (componentId: PageSection, isEnabled: boolean) => {
        try {
            const newStatus = { ...componentStatus, [componentId]: isEnabled };
            await setDoc(doc(db, 'settings', 'components'), { status: newStatus });
            setComponentStatus(newStatus);
        } catch (error) {
            console.error("Error updating component status:", error);
            throw error;
        }
    };

    const value: AdminContextType = {
        allUsers,
        fetchAllUsers,
        updateUserRole,
        deleteUserRecord,
        createAdmin,
        updateUserProfile,
        updateUserDetails,
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
        globalAssistantConfig,
        saveGlobalAssistantConfig,
        landingChatbotConfig,
        saveLandingChatbotConfig,
        globalAdPixels,
        saveGlobalAdPixels,
        globalChatbotPrompts,
        fetchGlobalChatbotPrompts,
        saveGlobalChatbotPrompts,
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
        appTokens,
        updateAppTokens,
        componentStatus,
        updateComponentStatus,
        usage,
        isLoadingUsage,
    };

    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = (): AdminContextType => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};

/**
 * Safe version of useAdmin that returns null instead of throwing
 * Use this in components that might render outside AdminProvider
 */
export const useSafeAdmin = (): AdminContextType | null => {
    const context = useContext(AdminContext);
    return context || null;
};



