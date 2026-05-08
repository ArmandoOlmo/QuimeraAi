/**
 * useEditorAdmin.ts
 * Extracted from EditorContext.tsx — Super Admin: users, tenants, prompts, global assistant
 */
import { useState } from 'react';
import {
    UserDocument, UserRole, Tenant, TenantStatus, TenantLimits,
    LLMPrompt, AdminView
} from '../../types';
import { isOwner, determineRole } from '../../constants/roles';
import { defaultPrompts } from '../../data/defaultPrompts';
import { supabase } from '../../supabase';
import type { User } from '../../firebase'; // Note: User might come from AuthContext

interface UseEditorAdminParams {
    user: User | null;
    userDocument: UserDocument | null;
    setUserDocument: React.Dispatch<React.SetStateAction<UserDocument | null>>;
    isUserOwner: boolean;
}

export const useEditorAdmin = ({ user, userDocument, setUserDocument, isUserOwner }: UseEditorAdminParams) => {
    // Admin State
    const [adminView, setAdminView] = useState<AdminView>('main');
    const [allUsers, setAllUsers] = useState<UserDocument[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [prompts, setPrompts] = useState<LLMPrompt[]>([]);

    // Helper for admin check
    const isAdmin = (): boolean => {
        return ['owner', 'superadmin', 'admin', 'manager'].includes(userDocument?.role || '');
    };

    // ─── User Management ───

    const fetchAllUsers = async () => {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) {
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
    };

    const updateUserRole = async (userId: string, newRole: UserRole) => {
        const targetUser = allUsers.find(u => u.id === userId);
        if (!targetUser) return;

        if (isOwner(targetUser.email)) {
            throw new Error('No se puede cambiar el rol del Owner');
        }

        if ((newRole === 'superadmin' || targetUser.role === 'superadmin') && !isUserOwner) {
            throw new Error('Solo el Owner puede gestionar Super Admins');
        }

        if (newRole === 'owner') {
            throw new Error('No se puede asignar el rol de Owner');
        }

        try {
            await supabase.from('users').update({ role: newRole }).eq('id', userId);
            setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error('Error updating role:', error);
            throw error;
        }
    };

    const deleteUserRecord = async (userId: string) => {
        const targetUser = allUsers.find(u => u.id === userId);
        if (targetUser && isOwner(targetUser.email)) {
            throw new Error('No se puede eliminar al Owner');
        }

        await supabase.from('users').delete().eq('id', userId);
        setAllUsers(prev => prev.filter(u => u.id !== userId));
    };

    const createAdmin = async (email: string, name: string, role: UserRole) => {
        if (role === 'superadmin' && !isUserOwner) {
            throw new Error('Solo el Owner puede crear Super Admins');
        }
        if (role === 'owner') {
            throw new Error('Solo puede haber un Owner en el sistema');
        }

        try {
            const existingUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (existingUser) {
                throw new Error('Ya existe un usuario con este email');
            }

            await supabase.from('pending_admins').insert([{
                email,
                name,
                role: determineRole(email, role),
                created_at: new Date().toISOString(),
                created_by: userDocument?.email
            }]);
            
            // Re-fetch handled independently or we can fetch again if we have a view for pending admins
        } catch (error) {
            console.error('Error creating admin:', error);
            throw error;
        }
    };

    const updateUserProfile = async (name: string, photoURL: string) => {
        if (!user || !userDocument) return;

        try {
            await supabase.from('users').update({ 
                name, 
                photo_url: photoURL 
            }).eq('id', user.id);
            
            setUserDocument(prev => prev ? { ...prev, name, photoURL } : null);
            setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, name, photoURL } : u));
        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    };

    const updateUserDetails = async (userId: string, data: Partial<UserDocument>) => {
        if (!isAdmin()) {
            throw new Error("Unauthorized: Only admins can update user details");
        }

        try {
            const updateData: any = {};
            if (data.name !== undefined) updateData.name = data.name;
            if (data.email !== undefined) updateData.email = data.email;
            if (data.photoURL !== undefined) updateData.photo_url = data.photoURL;
            if (data.isOnboardingComplete !== undefined) updateData.is_onboarding_complete = data.isOnboardingComplete;
            if (data.role !== undefined) updateData.role = data.role;

            await supabase.from('users').update(updateData).eq('id', userId);
            setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));

            if (user && userId === user.id) {
                setUserDocument(prev => prev ? { ...prev, ...data } : null);
            }
        } catch (error) {
            console.error("Error updating user details:", error);
            throw error;
        }
    };

    // ─── Tenant Management ───

    const fetchTenants = async () => {
        try {
            const { data } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
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

    const getDefaultLimits = (plan: string): TenantLimits => {
        switch (plan) {
            case 'free': return { maxProjects: 3, maxUsers: 1, maxStorageGB: 5, maxAiCredits: 100 };
            case 'pro': return { maxProjects: 20, maxUsers: 5, maxStorageGB: 50, maxAiCredits: 1000 };
            case 'enterprise': return { maxProjects: 100, maxUsers: 50, maxStorageGB: 500, maxAiCredits: 10000 };
            default: return { maxProjects: 3, maxUsers: 1, maxStorageGB: 5, maxAiCredits: 100 };
        }
    };

    const createTenant = async (data: {
        type: 'individual' | 'agency'; name: string; email: string; plan: string; companyName?: string;
    }): Promise<string> => {
        try {
            const tenantDoc = {
                type: data.type, 
                name: data.name, 
                email: data.email,
                company_name: data.companyName || '',
                status: 'trial',
                subscription_plan: data.plan,
                limits: getDefaultLimits(data.plan),
                usage: { projectCount: 0, userCount: 1, storageUsedGB: 0, aiCreditsUsed: 0 },
                owner_user_id: user?.uid || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                settings: { allowMemberInvites: data.type === 'agency', requireTwoFactor: false, brandingEnabled: false }
            };
            
            const { data: newTenant, error } = await supabase.from('tenants').insert([tenantDoc]).select('*').single();
            if (error) throw error;
            
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
        }
    };

    const deleteTenant = async (tenantId: string) => {
        try {
            await supabase.from('tenants').delete().eq('id', tenantId);
            setTenants(prev => prev.filter(t => t.id !== tenantId));
        } catch (error) {
            console.error("Error deleting tenant:", error);
        }
    };

    const updateTenantStatus = async (tenantId: string, status: TenantStatus) => {
        try {
            await supabase.from('tenants').update({ 
                status, 
                last_status_change_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }).eq('id', tenantId);
            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status } : t));
        } catch (error) {
            console.error("Error updating tenant status:", error);
        }
    };

    const updateTenantLimits = async (tenantId: string, limits: Partial<TenantLimits>) => {
        try {
            const tenant = tenants.find(t => t.id === tenantId);
            if (!tenant) return;
            const updatedLimits = { ...tenant.limits, ...limits };
            await supabase.from('tenants').update({ 
                limits: updatedLimits,
                updated_at: new Date().toISOString()
            }).eq('id', tenantId);
            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, limits: updatedLimits } : t));
        } catch (error) {
            console.error("Error updating tenant limits:", error);
        }
    };

    // ─── Prompts ───

    const getPrompt = (name: string): LLMPrompt | undefined => {
        const dbPrompt = prompts.find(p => p.name === name);
        const defaultPrompt = defaultPrompts.find(p => p.name === name) as LLMPrompt | undefined;

        if (dbPrompt && defaultPrompt && dbPrompt.version !== undefined && defaultPrompt.version !== undefined) {
            if (dbPrompt.version < defaultPrompt.version) {
                console.warn(`🔄 [useEditorAdmin] Auto-migrating outdated prompt '${name}' from v${dbPrompt.version} to v${defaultPrompt.version}`);
                savePrompt({ ...defaultPrompt, id: dbPrompt.id }).catch(err => console.error('Failed to auto-migrate prompt:', err));
                return defaultPrompt;
            }
        }

        return dbPrompt || defaultPrompt;
    };

    const fetchAllPrompts = async () => {
        try {
            const { data } = await supabase.from('prompts').select('*').order('name', { ascending: true });

            if (!data || data.length === 0) {
                if (isAdmin()) {
                    console.log('No prompts found, seeding database with defaults...');
                    const now = new Date().toISOString();
                    const seedData = defaultPrompts.map(promptData => ({
                        name: promptData.name,
                        description: promptData.description,
                        template: promptData.template,
                        variables: promptData.variables,
                        tags: promptData.tags || [],
                        is_system: promptData.isSystem || false,
                        version: promptData.version || 1,
                        created_at: now,
                        updated_at: now
                    }));
                    
                    await supabase.from('prompts').insert(seedData);
                    
                    const { data: newPrompts } = await supabase.from('prompts').select('*').order('name', { ascending: true });
                    if (newPrompts) {
                        setPrompts(newPrompts.map(p => ({
                            id: p.id,
                            name: p.name,
                            description: p.description,
                            template: p.template,
                            variables: p.variables,
                            tags: p.tags,
                            isSystem: p.is_system,
                            version: p.version,
                            createdAt: p.created_at,
                            updatedAt: p.updated_at
                        } as LLMPrompt)));
                    }
                }
            } else {
                setPrompts(data.map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    template: p.template,
                    variables: p.variables,
                    tags: p.tags,
                    isSystem: p.is_system,
                    version: p.version,
                    createdAt: p.created_at,
                    updatedAt: p.updated_at
                } as LLMPrompt)));
            }
        } catch (error) {
            console.error("Error fetching prompts:", error);
        }
    };

    const savePrompt = async (promptData: Omit<LLMPrompt, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
        const { id, ...data } = promptData;
        const now = new Date().toISOString();
        
        const saveObj = {
            name: data.name,
            description: data.description,
            template: data.template,
            variables: data.variables,
            tags: data.tags || [],
            is_system: data.isSystem || false,
            version: data.version || 1,
            updated_at: now
        };

        if (id) {
            await supabase.from('prompts').update(saveObj).eq('id', id);
        } else {
            await supabase.from('prompts').insert([{ ...saveObj, created_at: now }]);
        }
        await fetchAllPrompts();
    };

    const deletePrompt = async (promptId: string) => {
        await supabase.from('prompts').delete().eq('id', promptId);
        await fetchAllPrompts();
    };

    const syncPrompts = async () => {
        try {
            console.log('🔄 Syncing default prompts...');
            const { data: dbPrompts } = await supabase.from('prompts').select('name');
            const dbPromptNames = new Set((dbPrompts || []).map(p => p.name));

            const promptsToAdd = defaultPrompts.filter(dp => !dbPromptNames.has(dp.name));

            if (promptsToAdd.length === 0) {
                console.log('✅ All default prompts are already in the database.');
                return;
            }

            console.log(`Creating ${promptsToAdd.length} missing prompts...`);
            const now = new Date().toISOString();
            const insertData = promptsToAdd.map(promptData => ({
                name: promptData.name,
                description: promptData.description,
                template: promptData.template,
                variables: promptData.variables,
                tags: promptData.tags || [],
                is_system: promptData.isSystem || false,
                version: promptData.version || 1,
                created_at: now,
                updated_at: now
            }));

            await supabase.from('prompts').insert(insertData);
            console.log('✅ Prompts synced successfully.');
            await fetchAllPrompts();
        } catch (error) {
            console.error("❌ Error syncing prompts:", error);
        }
    };

    return {
        adminView, setAdminView,
        allUsers, setAllUsers, fetchAllUsers, updateUserRole, deleteUserRecord,
        createAdmin, updateUserProfile, updateUserDetails,
        tenants, fetchTenants, createTenant, updateTenant, deleteTenant,
        updateTenantStatus, updateTenantLimits,
        prompts, setPrompts, getPrompt, fetchAllPrompts, savePrompt, deletePrompt, syncPrompts,
        isAdmin,
    };
};
