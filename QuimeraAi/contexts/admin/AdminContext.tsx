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
import { supabase } from '../../supabase';
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
    const { user } = useAuth();

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

    // Helper to fetch setting document
    const getSetting = async (id: string) => {
        const { data } = await supabase.from('settings').select('config').eq('id', id).maybeSingle();
        return data?.config;
    };

    // Helper to save setting document
    const saveSetting = async (id: string, config: any) => {
        await supabase.from('settings').upsert({
            id,
            config,
            updated_at: new Date().toISOString(),
            updated_by: user?.id || null
        });
    };

    // Fetch global settings on mount
    useEffect(() => {
        if (!user) return;

        const fetchGlobalSettings = async () => {
            try {
                // Component status
                const compConfig = await getSetting('components');
                if (compConfig?.status) {
                    const status = compConfig.status;
                    const mergedStatus = { ...defaultComponentStatus };
                    Object.keys(status).forEach(key => {
                        mergedStatus[key as PageSection] = status[key];
                    });
                    setComponentStatus(mergedStatus);
                }

                // Global assistant config
                const assistantConfig = await getSetting('global_assistant');
                if (assistantConfig) {
                    setGlobalAssistantConfig(prev => ({ ...prev, ...assistantConfig }));
                }

                // Landing chatbot config
                const landingChatbotConfig = await getSetting('landingChatbot');
                if (landingChatbotConfig) {
                    setLandingChatbotConfig(prev => ({ ...prev, ...landingChatbotConfig }));
                }

                // Global Ad Tracking Pixels (for app-wide analytics)
                const adPixelsConfig = await getSetting('globalAdPixels');
                if (adPixelsConfig) {
                    setGlobalAdPixels(adPixelsConfig as AdPixelConfig);
                }

                // Design tokens
                const tokensConfig = await getSetting('designTokens');
                if (tokensConfig) {
                    setDesignTokens(tokensConfig as DesignTokens);
                }

                // App tokens
                const appTokensConfig = await getSetting('appTokens');
                if (appTokensConfig) {
                    const loadedTokens = appTokensConfig as Partial<AppTokens>;
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

        const fetchCustomComponents = async () => {
            const { data } = await supabase.from('custom_components').select('*').order('created_at', { ascending: false });
            if (data) {
                setCustomComponents(data.map(d => ({
                    id: d.id,
                    name: d.name,
                    baseComponent: d.base_component,
                    styles: d.styles,
                    createdAt: d.created_at,
                    updatedAt: d.updated_at,
                    createdBy: d.created_by,
                    isPublic: d.is_public,
                    usageCount: d.usage_count,
                    versions: d.versions || []
                } as CustomComponent)));
            }
        };

        fetchCustomComponents();

        const channel = supabase.channel('public:custom_components')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_components' }, () => {
                fetchCustomComponents();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Setup landing chatbot config listener for real-time updates
    useEffect(() => {
        const fetchLandingConfig = async () => {
            const config = await getSetting('landingChatbot');
            if (config) {
                setLandingChatbotConfig(prev => ({ ...prev, ...config }));
            }
        };
        fetchLandingConfig();

        const channel = supabase.channel('public:settings:landingChatbot')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'settings',
                filter: 'id=eq.landingChatbot'
            }, (payload) => {
                if (payload.new && (payload.new as any).config) {
                    setLandingChatbotConfig(prev => ({ ...prev, ...(payload.new as any).config }));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // User Management Functions
    const fetchAllUsers = async () => {
        try {
            const { data } = await supabase.from('users').select('*');
            if (data) {
                setAllUsers(data.map(u => ({
                    id: u.id,
                    uid: u.id,
                    email: u.email,
                    name: u.name,
                    role: u.role,
                    createdAt: u.created_at,
                    photoURL: u.photo_url,
                    isOnboardingComplete: u.is_onboarding_complete
                } as UserDocument)));
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const updateUserRole = async (userId: string, role: UserRole) => {
        try {
            await supabase.from('users').update({ role }).eq('id', userId);
            setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
        } catch (error) {
            console.error("Error updating user role:", error);
            throw error;
        }
    };

    const deleteUserRecord = async (userId: string) => {
        try {
            // Note: deleting a user requires admin rights or specific RLS policies, or calling a Supabase edge function if deleting auth user.
            await supabase.from('users').delete().eq('id', userId);
            setAllUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error("Error deleting user:", error);
            throw error;
        }
    };

    const createAdmin = async (email: string, name: string, role: UserRole) => {
        try {
            await supabase.from('pending_admins').insert([{
                email,
                name,
                role,
                created_at: new Date().toISOString()
            }]);
        } catch (error) {
            console.error("Error creating admin:", error);
            throw error;
        }
    };

    const updateUserProfile = async (name: string, photoURL: string) => {
        if (!user) return;

        try {
            await supabase.from('users').update({ 
                name, 
                photo_url: photoURL 
            }).eq('id', user.id);
        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    };

    const updateUserDetails = async (userId: string, data: Partial<UserDocument>) => {
        try {
            const updateData: any = {};
            if (data.name !== undefined) updateData.name = data.name;
            if (data.email !== undefined) updateData.email = data.email;
            if (data.photoURL !== undefined) updateData.photo_url = data.photoURL;
            if (data.isOnboardingComplete !== undefined) updateData.is_onboarding_complete = data.isOnboardingComplete;
            if (data.role !== undefined) updateData.role = data.role;

            await supabase.from('users').update(updateData).eq('id', userId);
            setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
        } catch (error) {
            console.error("Error updating user details:", error);
            throw error;
        }
    };

    // Tenant Management Functions
    const fetchTenants = async () => {
        try {
            const { data } = await supabase.from('tenants').select('*');
            if (data) {
                setTenants(data.map(t => ({
                    id: t.id,
                    type: t.type,
                    name: t.name,
                    email: t.email,
                    companyName: t.company_name,
                    status: t.status,
                    createdAt: t.created_at,
                    subscriptionPlan: t.subscription_plan,
                    limits: t.limits,
                    usage: t.usage,
                    ownerUserId: t.owner_user_id,
                    memberUserIds: t.member_user_ids || [],
                    projectIds: t.project_ids || [],
                    settings: t.settings,
                    billingInfo: t.billing_info,
                } as unknown as Tenant)));
            }
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
            const planLimits = {
                free: { maxProjects: 1, maxUsers: 1, maxStorageGB: 1, maxAiCredits: 100 },
                starter: { maxProjects: 5, maxUsers: 1, maxStorageGB: 5, maxAiCredits: 500 },
                pro: { maxProjects: 20, maxUsers: 5, maxStorageGB: 20, maxAiCredits: 2000 },
                agency: { maxProjects: 50, maxUsers: 20, maxStorageGB: 50, maxAiCredits: 5000 },
                enterprise: { maxProjects: -1, maxUsers: -1, maxStorageGB: 100, maxAiCredits: 10000 },
            };

            const limits = planLimits[data.plan as keyof typeof planLimits] || planLimits.free;

            if (data.type === 'agency' && data.plan !== 'agency' && data.plan !== 'enterprise') {
                limits.maxUsers = Math.max(limits.maxUsers, 5);
                limits.maxProjects = Math.max(limits.maxProjects, 10);
            }

            const { data: newTenant, error } = await supabase.from('tenants').insert([{
                type: data.type,
                name: data.name,
                email: data.email,
                company_name: data.companyName || '',
                status: 'active',
                subscription_plan: data.plan,
                limits: limits,
                usage: {
                    projectCount: 0,
                    userCount: 1,
                    storageUsedGB: 0,
                    aiCreditsUsed: 0,
                },
                owner_user_id: user?.id || null,
                settings: {
                    allowMemberInvites: data.type === 'agency',
                    requireTwoFactor: false,
                    brandingEnabled: data.plan !== 'free',
                },
                billing_info: {
                    mrr: 0,
                    nextBillingDate: undefined,
                    paymentMethod: undefined,
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]).select('*').single();

            if (error) throw error;
            
            // Re-fetch tenants
            await fetchTenants();
            return newTenant.id;
        } catch (error) {
            console.error("Error creating tenant:", error);
            throw error;
        }
    };

    const updateTenant = async (tenantId: string, data: Partial<Tenant>) => {
        try {
            const updateData: any = { updated_at: new Date().toISOString() };
            if (data.type !== undefined) updateData.type = data.type;
            if (data.name !== undefined) updateData.name = data.name;
            if (data.email !== undefined) updateData.email = data.email;
            if (data.companyName !== undefined) updateData.company_name = data.companyName;
            if (data.status !== undefined) updateData.status = data.status;
            if (data.subscriptionPlan !== undefined) updateData.subscription_plan = data.subscriptionPlan;
            if (data.limits !== undefined) updateData.limits = data.limits;
            if (data.usage !== undefined) updateData.usage = data.usage;
            if (data.ownerUserId !== undefined) updateData.owner_user_id = data.ownerUserId;
            if (data.settings !== undefined) updateData.settings = data.settings;
            if (data.billingInfo !== undefined) updateData.billing_info = data.billingInfo;

            await supabase.from('tenants').update(updateData).eq('id', tenantId);
            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, ...data } : t));
        } catch (error) {
            console.error("Error updating tenant:", error);
            throw error;
        }
    };

    const deleteTenant = async (tenantId: string) => {
        try {
            await supabase.from('tenants').delete().eq('id', tenantId);
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
            const { data } = await supabase.from('prompts').select('*');
            if (data) {
                setPrompts(data.map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    template: p.template,
                    variables: p.variables,
                    tags: p.tags || [],
                    isSystem: p.is_system,
                    createdAt: p.created_at,
                    updatedAt: p.updated_at
                } as LLMPrompt)));
            }
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
                await supabase.from('prompts').update({
                    name: prompt.name,
                    description: prompt.description,
                    template: prompt.template,
                    variables: prompt.variables,
                    tags: prompt.tags,
                    is_system: prompt.isSystem,
                    updated_at: now
                }).eq('id', prompt.id);
            } else {
                await supabase.from('prompts').insert([{
                    name: prompt.name,
                    description: prompt.description,
                    template: prompt.template,
                    variables: prompt.variables,
                    tags: prompt.tags || [],
                    is_system: prompt.isSystem || false,
                    created_at: now,
                    updated_at: now
                }]);
            }
            await fetchAllPrompts();
        } catch (error) {
            console.error("Error saving prompt:", error);
            throw error;
        }
    };

    const deletePrompt = async (promptId: string) => {
        try {
            await supabase.from('prompts').delete().eq('id', promptId);
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
            await saveSetting('global_assistant', config);
            setGlobalAssistantConfig(config);
        } catch (error) {
            console.error("Error saving global assistant config:", error);
            throw error;
        }
    };

    // Landing Chatbot Config Functions
    const saveLandingChatbotConfig = async (config: LandingChatbotConfig) => {
        try {
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
            await saveSetting('landingChatbot', cleanConfig);
            setLandingChatbotConfig(config);
        } catch (error) {
            console.error("Error saving landing chatbot config:", error);
            throw error;
        }
    };

    // Global Ad Tracking Pixels Functions
    const saveGlobalAdPixels = async (config: AdPixelConfig) => {
        try {
            const cleanConfig = Object.fromEntries(
                Object.entries(config).filter(([_, v]) => v !== undefined)
            );
            await saveSetting('globalAdPixels', cleanConfig);
            setGlobalAdPixels(config);
        } catch (error) {
            console.error("Error saving global ad pixels:", error);
            throw error;
        }
    };

    // Global Chatbot Prompts Functions
    const fetchGlobalChatbotPrompts = async () => {
        try {
            const config = await getSetting('chatbotPrompts');
            if (config) {
                setGlobalChatbotPrompts(config as GlobalChatbotPrompts);
            }
        } catch (error) {
            console.error('Error fetching global chatbot prompts:', error);
        }
    };

    const saveGlobalChatbotPrompts = async (prompts: GlobalChatbotPrompts) => {
        try {
            await saveSetting('chatbotPrompts', prompts);
            setGlobalChatbotPrompts(prompts);
        } catch (error) {
            console.error('Error saving global chatbot prompts:', error);
            throw error;
        }
    };

    // Component Studio Functions
    const updateComponentStyle = async (componentId: string, newStyles: any, isCustom: boolean) => {
        if (isCustom) {
            setCustomComponents(prev => prev.map(c =>
                c.id === componentId ? { ...c, styles: { ...c.styles, ...newStyles } } : c
            ));
        } else {
            setComponentStyles(prev => {
                const currentStyles = prev[componentId as keyof ComponentStyles] || {};
                return {
                    ...prev,
                    [componentId]: { ...currentStyles, ...newStyles }
                };
            });
        }
    };

    const saveComponent = async (componentId: string, changeDescription?: string) => {
        try {
            const styles = componentStyles[componentId as keyof ComponentStyles];
            await supabase.from('component_defaults').upsert({
                id: componentId,
                styles,
                updated_at: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error saving component:", error);
            throw error;
        }
    };

    const createNewCustomComponent = async (name: string, baseComponent: EditableComponentID): Promise<CustomComponent> => {
        const now = new Date().toISOString();
        const { data, error } = await supabase.from('custom_components').insert([{
            name,
            base_component: baseComponent,
            styles: {},
            created_at: now,
            updated_at: now,
            created_by: user?.id || null,
            is_public: false,
            usage_count: 0,
            versions: []
        }]).select('*').single();

        if (error || !data) throw error || new Error("Failed to create custom component");

        return {
            id: data.id,
            name: data.name,
            baseComponent: data.base_component as any,
            styles: data.styles,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            createdBy: data.created_by,
            isPublic: data.is_public,
            usageCount: data.usage_count,
            versions: data.versions || []
        } as CustomComponent;
    };

    const deleteCustomComponent = async (componentId: string) => {
        await supabase.from('custom_components').delete().eq('id', componentId);
    };

    const duplicateComponent = async (componentId: string): Promise<CustomComponent> => {
        const original = customComponents.find(c => c.id === componentId);
        if (!original) throw new Error("Component not found");

        return await createNewCustomComponent(`${original.name} (Copy)`, original.baseComponent);
    };

    const renameCustomComponent = async (componentId: string, newName: string) => {
        await supabase.from('custom_components').update({ name: newName }).eq('id', componentId);
    };

    const updateComponentVariants = async (componentId: string, variants: ComponentVariant[], activeVariant?: string) => {
        await supabase.from('custom_components').update({
            variants,
            active_variant: activeVariant,
            updated_at: new Date().toISOString()
        }).eq('id', componentId);
    };

    const exportComponent = (componentId: string): string => {
        const component = customComponents.find(c => c.id === componentId);
        return component ? JSON.stringify(component, null, 2) : '';
    };

    const importComponent = async (jsonString: string): Promise<CustomComponent> => {
        const parsed = JSON.parse(jsonString);
        delete parsed.id;
        
        const { data, error } = await supabase.from('custom_components').insert([{
            name: parsed.name,
            base_component: parsed.baseComponent,
            styles: parsed.styles,
            variants: parsed.variants,
            active_variant: parsed.activeVariant,
            is_public: parsed.isPublic,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: user?.id || null,
            usage_count: 0,
            versions: parsed.versions || []
        }]).select('*').single();

        if (error || !data) throw error || new Error("Import failed");

        return {
            id: data.id,
            name: data.name,
            baseComponent: data.base_component as any,
            styles: data.styles,
            variants: data.variants,
            activeVariant: data.active_variant,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            createdBy: data.created_by,
            isPublic: data.is_public,
            usageCount: data.usage_count,
            versions: data.versions || []
        } as CustomComponent;
    };

    const revertToVersion = async (componentId: string, versionNumber: number) => {
        const component = customComponents.find(c => c.id === componentId);
        if (!component || !component.versions) return;

        const version = component.versions.find(v => v.version === versionNumber);
        if (version) {
            await supabase.from('custom_components').update({
                styles: version.styles,
                updated_at: new Date().toISOString()
            }).eq('id', componentId);
        }
    };

    const trackComponentUsage = async (projectId: string, componentIds: string[]) => {
        for (const componentId of componentIds) {
            const component = customComponents.find(c => c.id === componentId);
            if (component) {
                await supabase.from('custom_components').update({
                    usage_count: (component.usageCount || 0) + 1
                }).eq('id', componentId);
            }
        }
    };

    // Design Tokens Functions
    const updateDesignTokens = async (tokens: DesignTokens) => {
        try {
            await saveSetting('designTokens', tokens);
            setDesignTokens(tokens);
        } catch (error) {
            console.error("Error updating design tokens:", error);
            throw error;
        }
    };

    // App Tokens Functions
    const updateAppTokens = async (tokens: AppTokens) => {
        try {
            await saveSetting('appTokens', tokens);
            setAppTokens(tokens);
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
            await saveSetting('components', { status: newStatus });
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

export const useSafeAdmin = (): AdminContextType | null => {
    const context = useContext(AdminContext);
    return context || null;
};
