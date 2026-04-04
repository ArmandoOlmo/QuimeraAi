/**
 * useAdminLeads Hook
 * Hook para gestionar leads a nivel de plataforma (Super Admin)
 * Los datos se almacenan en la colección raíz `platformLeads` — NO asociados a ningún proyecto
 * Los visitantes públicos escriben aquí desde ContactPage y LandingChatbotWidget
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Lead, LeadStatus, LeadActivity, LeadTask } from '../../../../types';
import { useAuth } from '../../../../contexts/core/AuthContext';
import {
    db,
    doc,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
} from '../../../../firebase';

// =============================================================================
// TYPES
// =============================================================================

interface UseAdminLeadsReturn {
    // Leads
    leads: Lead[];
    isLoadingLeads: boolean;
    addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'projectId'>) => Promise<string | undefined>;
    addLeadsBulk: (leads: Omit<Lead, 'id' | 'createdAt' | 'projectId'>[]) => Promise<string[]>;
    updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
    updateLead: (leadId: string, data: Partial<Lead>) => Promise<void>;
    deleteLead: (leadId: string) => Promise<void>;

    // Lead Activities
    leadActivities: LeadActivity[];
    addLeadActivity: (leadId: string, activity: Omit<LeadActivity, 'id' | 'createdAt' | 'leadId' | 'projectId'>) => Promise<void>;
    getLeadActivities: (leadId: string) => LeadActivity[];

    // Lead Tasks
    leadTasks: LeadTask[];
    addLeadTask: (leadId: string, task: Omit<LeadTask, 'id' | 'createdAt' | 'leadId' | 'projectId'>) => Promise<void>;
    updateLeadTask: (taskId: string, data: Partial<LeadTask>) => Promise<void>;
    deleteLeadTask: (taskId: string) => Promise<void>;
    getLeadTasks: (leadId: string) => LeadTask[];
}

// =============================================================================
// HOOK
// =============================================================================

export const useAdminLeads = (): UseAdminLeadsReturn => {
    const { user } = useAuth();

    // State
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingLeads, setIsLoadingLeads] = useState(true);
    const [leadActivities, setLeadActivities] = useState<LeadActivity[]>([]);
    const [leadTasks, setLeadTasks] = useState<LeadTask[]>([]);

    // Platform ID constant for consistency
    const PLATFORM_ID = '__platform__';

    // =========================================================================
    // REAL-TIME LISTENERS
    // =========================================================================

    // Load platform leads
    useEffect(() => {
        if (!user) {
            setLeads([]);
            setIsLoadingLeads(false);
            return;
        }

        setIsLoadingLeads(true);
        const leadsPath = 'platformLeads';
        const q = query(
            collection(db, leadsPath),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leadsData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                projectId: PLATFORM_ID,
                ...docSnapshot.data()
            })) as Lead[];
            setLeads(leadsData);
            setIsLoadingLeads(false);
        }, (error) => {
            console.error("[useAdminLeads] Error fetching platform leads:", error);
            setIsLoadingLeads(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Load platform lead activities
    useEffect(() => {
        if (!user) {
            setLeadActivities([]);
            return;
        }

        const activitiesPath = 'platformLeadActivities';
        const q = query(
            collection(db, activitiesPath),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                projectId: PLATFORM_ID,
                ...docSnapshot.data()
            })) as LeadActivity[];
            setLeadActivities(data);
        }, (error) => {
            console.error("[useAdminLeads] Error fetching platform activities:", error);
        });

        return () => unsubscribe();
    }, [user]);

    // Load platform lead tasks
    useEffect(() => {
        if (!user) {
            setLeadTasks([]);
            return;
        }

        const tasksPath = 'platformLeadTasks';
        const q = query(
            collection(db, tasksPath),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                projectId: PLATFORM_ID,
                ...docSnapshot.data()
            })) as LeadTask[];
            setLeadTasks(data);
        }, (error) => {
            console.error("[useAdminLeads] Error fetching platform tasks:", error);
        });

        return () => unsubscribe();
    }, [user]);

    // =========================================================================
    // CRUD OPERATIONS
    // =========================================================================

    const addLead = useCallback(async (leadData: Omit<Lead, 'id' | 'createdAt' | 'projectId'>): Promise<string | undefined> => {
        if (!user) {
            console.error("[useAdminLeads] Cannot add lead: No user");
            return undefined;
        }

        try {
            const leadsPath = 'platformLeads';
            const docRef = await addDoc(collection(db, leadsPath), {
                ...leadData,
                projectId: PLATFORM_ID,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            console.log('[useAdminLeads] ✅ Platform lead saved:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error("[useAdminLeads] Error adding lead:", error);
            throw error;
        }
    }, [user]);

    const addLeadsBulk = useCallback(async (leadsData: Omit<Lead, 'id' | 'createdAt' | 'projectId'>[]): Promise<string[]> => {
        if (!user) return [];

        const createdIds: string[] = [];
        try {
            const leadsPath = 'platformLeads';
            const BATCH_SIZE = 10;

            for (let i = 0; i < leadsData.length; i += BATCH_SIZE) {
                const batch = leadsData.slice(i, i + BATCH_SIZE);
                const promises = batch.map(leadData => {
                    const sanitized: Record<string, any> = {};
                    Object.entries(leadData).forEach(([key, val]) => {
                        if (val !== undefined) sanitized[key] = val;
                    });
                    return addDoc(collection(db, leadsPath), {
                        ...sanitized,
                        projectId: PLATFORM_ID,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                });
                const refs = await Promise.all(promises);
                refs.forEach(ref => createdIds.push(ref.id));
            }
            return createdIds;
        } catch (error) {
            console.error("[useAdminLeads] Error in bulk import:", error);
            throw error;
        }
    }, [user]);

    const updateLeadStatus = useCallback(async (leadId: string, status: LeadStatus) => {
        if (!user) return;
        try {
            const leadPath = `platformLeads/${leadId}`;
            await updateDoc(doc(db, leadPath), {
                status,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("[useAdminLeads] Error updating lead status:", error);
            throw error;
        }
    }, [user]);

    const updateLead = useCallback(async (leadId: string, data: Partial<Lead>) => {
        if (!user) return;
        try {
            const leadPath = `platformLeads/${leadId}`;
            await updateDoc(doc(db, leadPath), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("[useAdminLeads] Error updating lead:", error);
            throw error;
        }
    }, [user]);

    const deleteLead = useCallback(async (leadId: string) => {
        if (!user) return;
        try {
            const leadPath = `platformLeads/${leadId}`;
            await deleteDoc(doc(db, leadPath));
        } catch (error) {
            console.error("[useAdminLeads] Error deleting lead:", error);
            throw error;
        }
    }, [user]);

    // =========================================================================
    // ACTIVITY OPERATIONS
    // =========================================================================

    const addLeadActivity = useCallback(async (
        leadId: string,
        activity: Omit<LeadActivity, 'id' | 'createdAt' | 'leadId'>
    ) => {
        if (!user) return;
        try {
            const activitiesPath = 'platformLeadActivities';
            await addDoc(collection(db, activitiesPath), {
                ...activity,
                leadId,
                projectId: PLATFORM_ID,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("[useAdminLeads] Error adding activity:", error);
            throw error;
        }
    }, [user]);

    const getLeadActivities = useCallback((leadId: string): LeadActivity[] => {
        return leadActivities.filter(a => a.leadId === leadId);
    }, [leadActivities]);

    // =========================================================================
    // TASK OPERATIONS
    // =========================================================================

    const addLeadTask = useCallback(async (
        leadId: string,
        task: Omit<LeadTask, 'id' | 'createdAt' | 'leadId'>
    ) => {
        if (!user) return;
        try {
            const tasksPath = 'platformLeadTasks';
            await addDoc(collection(db, tasksPath), {
                ...task,
                leadId,
                projectId: PLATFORM_ID,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("[useAdminLeads] Error adding task:", error);
            throw error;
        }
    }, [user]);

    const updateLeadTask = useCallback(async (taskId: string, data: Partial<LeadTask>) => {
        if (!user) return;
        try {
            const taskPath = `platformLeadTasks/${taskId}`;
            await updateDoc(doc(db, taskPath), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("[useAdminLeads] Error updating task:", error);
            throw error;
        }
    }, [user]);

    const deleteLeadTask = useCallback(async (taskId: string) => {
        if (!user) return;
        try {
            const taskPath = `platformLeadTasks/${taskId}`;
            await deleteDoc(doc(db, taskPath));
        } catch (error) {
            console.error("[useAdminLeads] Error deleting task:", error);
            throw error;
        }
    }, [user]);

    const getLeadTasks = useCallback((leadId: string): LeadTask[] => {
        return leadTasks.filter(t => t.leadId === leadId);
    }, [leadTasks]);

    // =========================================================================
    // RETURN
    // =========================================================================

    return {
        leads,
        isLoadingLeads,
        addLead,
        addLeadsBulk,
        updateLeadStatus,
        updateLead,
        deleteLead,
        leadActivities,
        addLeadActivity,
        getLeadActivities,
        leadTasks,
        addLeadTask,
        updateLeadTask,
        deleteLeadTask,
        getLeadTasks,
    };
};

export default useAdminLeads;
