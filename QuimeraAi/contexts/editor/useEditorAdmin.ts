/**
 * useEditorAdmin.ts
 * Extracted from EditorContext.tsx — Super Admin: users, tenants, prompts, global assistant
 */
import { useState } from 'react';
import {
    UserDocument, UserRole, Tenant, TenantStatus, TenantLimits,
    LLMPrompt, AdminView, GlobalAssistantConfig
} from '../../types';
import { isOwner, determineRole } from '../../constants/roles';
import { defaultPrompts } from '../../data/defaultPrompts';
import {
    db, doc, setDoc, updateDoc, deleteDoc, getDoc,
    collection, getDocs, addDoc, query, orderBy, serverTimestamp
} from '../../firebase';
import { updateProfile } from '../../firebase';
import type { User } from '../../firebase';

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
    const [globalAssistantConfig, setGlobalAssistantConfig] = useState<GlobalAssistantConfig>({
        personality: '',
        guidelines: [],
        restrictedTopics: [],
        maxResponseLength: 500,
        enableLargeResponses: false,
        responseFormat: 'markdown',
        contextWindow: 'medium',
        welcomeMessage: '',
        fallbackMessage: '',
        escalationMessage: '',
        enableEmoji: true,
        enableCodeBlocks: true,
        enableLinks: true,
        customInstructions: '',
        allowedDomains: [],
        enableAnalytics: true,
        debugMode: false,
        rateLimitPerMinute: 10,
        enableMemory: true,
        memoryDuration: '24h'
    });

    // Helper for admin check
    const isAdmin = (): boolean => {
        return ['owner', 'superadmin', 'admin', 'manager'].includes(userDocument?.role || '');
    };

    // ─── User Management ───

    const fetchAllUsers = async () => {
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);
        const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDocument));
        setAllUsers(userList);
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
            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, { role: newRole });
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

        const userDocRef = doc(db, 'users', userId);
        await deleteDoc(userDocRef);
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

            const newAdminDoc = {
                email,
                name,
                photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3f3f46&color=e4e4e7`,
                role: determineRole(email, role),
                createdBy: userDocument?.email,
                createdAt: serverTimestamp()
            };

            const usersCol = collection(db, 'users');
            await addDoc(usersCol, newAdminDoc);
            await fetchAllUsers();
        } catch (error) {
            console.error('Error creating admin:', error);
            throw error;
        }
    };

    const updateUserProfile = async (name: string, photoURL: string) => {
        if (!user || !userDocument) return;

        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { name, photoURL });
            await updateProfile(user, { displayName: name, photoURL: photoURL });
            setUserDocument(prev => prev ? { ...prev, name, photoURL } : null);
            setAllUsers(prev => prev.map(u => u.id === user.uid ? { ...u, name, photoURL } : u));
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
            const userDocRef = doc(db, 'users', userId);
            const { id, uid, email, role, ...updatableData } = data as any;
            await updateDoc(userDocRef, updatableData);
            setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updatableData } : u));

            if (user && userId === user.uid) {
                setUserDocument(prev => prev ? { ...prev, ...updatableData } : null);
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

    // ─── Tenant Management ───

    const fetchTenants = async () => {
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
                type: data.type, name: data.name, email: data.email,
                companyName: data.companyName || '',
                status: 'trial' as TenantStatus,
                subscriptionPlan: data.plan,
                limits: getDefaultLimits(data.plan),
                usage: { projectCount: 0, userCount: 1, storageUsedGB: 0, aiCreditsUsed: 0 },
                ownerUserId: '', memberUserIds: [], projectIds: [],
                createdAt: serverTimestamp(),
                settings: { allowMemberInvites: data.type === 'agency', requireTwoFactor: false, brandingEnabled: false }
            };
            const docRef = await addDoc(collection(db, 'tenants'), tenantDoc);
            await fetchTenants();
            return docRef.id;
        } catch (error) {
            console.error("Error creating tenant:", error);
            throw error;
        }
    };

    const updateTenant = async (tenantId: string, data: Partial<Tenant>) => {
        try {
            const tenantRef = doc(db, 'tenants', tenantId);
            await updateDoc(tenantRef, data);
            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, ...data } : t));
        } catch (error) {
            console.error("Error updating tenant:", error);
        }
    };

    const deleteTenant = async (tenantId: string) => {
        try {
            const tenantRef = doc(db, 'tenants', tenantId);
            await deleteDoc(tenantRef);
            setTenants(prev => prev.filter(t => t.id !== tenantId));
        } catch (error) {
            console.error("Error deleting tenant:", error);
        }
    };

    const updateTenantStatus = async (tenantId: string, status: TenantStatus) => {
        try {
            const tenantRef = doc(db, 'tenants', tenantId);
            await updateDoc(tenantRef, { status, lastStatusChangeAt: serverTimestamp() });
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
            const tenantRef = doc(db, 'tenants', tenantId);
            await updateDoc(tenantRef, { limits: updatedLimits });
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
            const promptsCol = collection(db, 'prompts');
            const q = query(promptsCol, orderBy('name', 'asc'));
            const promptSnapshot = await getDocs(q);

            if (promptSnapshot.empty) {
                if (isAdmin()) {
                    console.log('No prompts found, seeding database with defaults...');
                    const seedPromises = defaultPrompts.map(promptData => {
                        const dataToSave = { ...promptData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
                        return addDoc(collection(db, 'prompts'), dataToSave);
                    });
                    await Promise.all(seedPromises);
                    const newSnapshot = await getDocs(q);
                    const promptList = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LLMPrompt));
                    setPrompts(promptList);
                }
            } else {
                const promptList = promptSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LLMPrompt));
                setPrompts(promptList);
            }
        } catch (error) {
            console.error("Error fetching prompts:", error);
        }
    };

    const savePrompt = async (promptData: Omit<LLMPrompt, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
        const { id, ...data } = promptData;
        const collectionRef = collection(db, 'prompts');
        if (id) {
            const promptDocRef = doc(collectionRef, id);
            await updateDoc(promptDocRef, { ...data, updatedAt: serverTimestamp() });
        } else {
            await addDoc(collectionRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        }
        await fetchAllPrompts();
    };

    const deletePrompt = async (promptId: string) => {
        const promptDocRef = doc(db, 'prompts', promptId);
        await deleteDoc(promptDocRef);
        await fetchAllPrompts();
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
                const dataToSave = { ...promptData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
                return addDoc(promptsCol, dataToSave);
            });

            await Promise.all(promises);
            console.log('✅ Prompts synced successfully.');
            await fetchAllPrompts();
        } catch (error) {
            console.error("❌ Error syncing prompts:", error);
        }
    };

    // ─── Global Assistant ───

    const saveGlobalAssistantConfig = async (config: GlobalAssistantConfig) => {
        setGlobalAssistantConfig(config);
        try {
            await setDoc(doc(db, 'settings', 'global_assistant'), config);
        } catch (e) {
            console.error("Error saving global assistant config:", e);
        }
    };

    return {
        adminView, setAdminView,
        allUsers, setAllUsers, fetchAllUsers, updateUserRole, deleteUserRecord,
        createAdmin, updateUserProfile, updateUserDetails,
        tenants, fetchTenants, createTenant, updateTenant, deleteTenant,
        updateTenantStatus, updateTenantLimits,
        prompts, setPrompts, getPrompt, fetchAllPrompts, savePrompt, deletePrompt, syncPrompts,
        globalAssistantConfig, setGlobalAssistantConfig, saveGlobalAssistantConfig,
        isAdmin,
    };
};
