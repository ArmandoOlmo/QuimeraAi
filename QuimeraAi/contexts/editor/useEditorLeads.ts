/**
 * useEditorLeads.ts
 * Extracted from EditorContext.tsx — Leads CRM, Activities, Tasks, and Library
 */
import { useState, useEffect } from 'react';
import { Lead, LeadStatus, LeadActivity, LeadTask, LibraryLead } from '../../types';
import {
    db, doc, collection, addDoc, updateDoc, deleteDoc,
    query, orderBy, onSnapshot, serverTimestamp
} from '../../firebase';
import type { User } from '../../firebase';

interface UseEditorLeadsParams {
    user: User | null;
    activeProjectId: string | null;
}

export const useEditorLeads = ({ user, activeProjectId }: UseEditorLeadsParams) => {
    // Leads State
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);
    const [leadActivities, setLeadActivities] = useState<LeadActivity[]>([]);
    const [leadTasks, setLeadTasks] = useState<LeadTask[]>([]);

    // Leads Library State
    const [libraryLeads, setLibraryLeads] = useState<LibraryLead[]>([]);
    const [isLoadingLibraryLeads, setIsLoadingLibraryLeads] = useState(false);

    // Leads Real-time Subscription - Project-scoped
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        if (user && activeProjectId) {
            setIsLoadingLeads(true);
            try {
                const leadsCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/leads`);
                const q = query(leadsCol, orderBy('createdAt', 'desc'));

                unsubscribe = onSnapshot(q,
                    (snapshot) => {
                        const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
                        setLeads(leadsData);
                        setIsLoadingLeads(false);
                    },
                    (error) => {
                        console.error("[useEditorLeads] Leads Snapshot Error:", error);
                        setIsLoadingLeads(false);
                    }
                );
            } catch (e) {
                console.error("[useEditorLeads] Error setting up Leads subscription:", e);
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

    // Lead Activities Real-time Subscription - Project-scoped
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        if (user && activeProjectId) {
            try {
                const activitiesCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/leadActivities`);
                const q = query(activitiesCol, orderBy('createdAt', 'desc'));

                unsubscribe = onSnapshot(q,
                    (snapshot) => {
                        const activitiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeadActivity));
                        setLeadActivities(activitiesData);
                    },
                    (error) => {
                        console.error("[useEditorLeads] Lead Activities Snapshot Error:", error);
                    }
                );
            } catch (e) {
                console.error("[useEditorLeads] Error setting up Lead Activities subscription:", e);
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
                const tasksCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/leadTasks`);
                const q = query(tasksCol, orderBy('createdAt', 'desc'));

                unsubscribe = onSnapshot(q,
                    (snapshot) => {
                        const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeadTask));
                        setLeadTasks(tasksData);
                    },
                    (error) => {
                        console.error("[useEditorLeads] Lead Tasks Snapshot Error:", error);
                    }
                );
            } catch (e) {
                console.error("[useEditorLeads] Error setting up Lead Tasks subscription:", e);
            }
        } else {
            setLeadTasks([]);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user, activeProjectId]);

    // Leads Library Real-time Subscription - Project-scoped
    useEffect(() => {
        if (!user || !activeProjectId) {
            setLibraryLeads([]);
            return;
        }

        setIsLoadingLibraryLeads(true);
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
            console.error("[useEditorLeads] Error fetching library leads:", error);
            setIsLoadingLibraryLeads(false);
        });

        return () => unsubscribe();
    }, [user, activeProjectId]);

    // ─── CRUD Functions ───

    const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'projectId'>): Promise<string | undefined> => {
        if (!user || !activeProjectId) return undefined;
        try {
            const leadsCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/leads`);
            const docRef = await addDoc(leadsCol, {
                ...leadData,
                projectId: activeProjectId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("[useEditorLeads] Error adding lead:", error);
            throw error;
        }
    };

    const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
        if (!user || !activeProjectId) return;
        try {
            const leadDocRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/leads/${leadId}`);
            await updateDoc(leadDocRef, { status, updatedAt: serverTimestamp() });
        } catch (error) {
            console.error("[useEditorLeads] Error updating lead status:", error);
        }
    };

    const updateLead = async (leadId: string, data: Partial<Lead>) => {
        if (!user || !activeProjectId) return;
        try {
            const leadDocRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/leads/${leadId}`);
            await updateDoc(leadDocRef, { ...data, updatedAt: serverTimestamp() });
        } catch (error) {
            console.error("[useEditorLeads] Error updating lead:", error);
        }
    };

    const deleteLead = async (leadId: string) => {
        if (!user || !activeProjectId) return;
        try {
            // First delete the lead document
            const leadDocRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/leads/${leadId}`);
            await deleteDoc(leadDocRef);

            // Then clean up associated activities and tasks
            // Note: Firestore onSnapshot will handle local state cleanup
            console.log(`✅ Lead ${leadId} deleted`);
        } catch (error) {
            console.error("[useEditorLeads] Error deleting lead:", error);
            throw error;
        }
    };

    // ─── Lead Activities ───

    const addLeadActivity = async (leadId: string, activityData: Omit<LeadActivity, 'id' | 'createdAt' | 'leadId'>) => {
        if (!user || !activeProjectId) return;
        try {
            const activitiesCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/leadActivities`);
            await addDoc(activitiesCol, {
                ...activityData,
                leadId,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("[useEditorLeads] Error adding lead activity:", error);
            throw error;
        }
    };

    const getLeadActivities = (leadId: string): LeadActivity[] => {
        return leadActivities.filter(a => a.leadId === leadId);
    };

    // ─── Lead Tasks ───

    const addLeadTask = async (leadId: string, taskData: Omit<LeadTask, 'id' | 'createdAt' | 'leadId'>) => {
        if (!user || !activeProjectId) return;
        try {
            const tasksCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/leadTasks`);
            await addDoc(tasksCol, {
                ...taskData,
                leadId,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("[useEditorLeads] Error adding lead task:", error);
            throw error;
        }
    };

    const updateLeadTask = async (taskId: string, data: Partial<LeadTask>) => {
        if (!user || !activeProjectId) return;
        try {
            const taskDocRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/leadTasks/${taskId}`);
            await updateDoc(taskDocRef, { ...data });
        } catch (error) {
            console.error("[useEditorLeads] Error updating lead task:", error);
        }
    };

    const deleteLeadTask = async (taskId: string) => {
        if (!user || !activeProjectId) return;
        try {
            const taskDocRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/leadTasks/${taskId}`);
            await deleteDoc(taskDocRef);
        } catch (error) {
            console.error("[useEditorLeads] Error deleting lead task:", error);
        }
    };

    const getLeadTasks = (leadId: string): LeadTask[] => {
        return leadTasks.filter(t => t.leadId === leadId);
    };

    // ─── Library Leads ───

    const addLibraryLead = async (leadData: Omit<LibraryLead, 'id' | 'createdAt' | 'isImported'>) => {
        if (!user || !activeProjectId) return;
        try {
            await addDoc(collection(db, `users/${user.uid}/projects/${activeProjectId}/libraryLeads`), {
                ...leadData,
                projectId: activeProjectId,
                isImported: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("[useEditorLeads] Error adding library lead:", error);
            throw error;
        }
    };

    const deleteLibraryLead = async (leadId: string) => {
        if (!user || !activeProjectId) return;
        try {
            await deleteDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/libraryLeads/${leadId}`));
        } catch (error) {
            console.error("[useEditorLeads] Error deleting library lead:", error);
            throw error;
        }
    };

    const importLibraryLead = async (leadId: string) => {
        if (!user || !activeProjectId) return;
        try {
            const leadToImport = libraryLeads.find(l => l.id === leadId);
            if (!leadToImport) throw new Error("Lead not found");

            // Create in main CRM
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

            // Update library lead status
            await updateDoc(doc(db, `users/${user.uid}/projects/${activeProjectId}/libraryLeads/${leadId}`), {
                isImported: true,
                importedAt: serverTimestamp(),
                importedLeadId: newLeadRef.id
            });
        } catch (error) {
            console.error("[useEditorLeads] Error importing library lead:", error);
            throw error;
        }
    };

    return {
        // Leads
        leads, isLoadingLeads, addLead, updateLeadStatus, updateLead, deleteLead,
        // Activities
        leadActivities, addLeadActivity, getLeadActivities,
        // Tasks
        leadTasks, addLeadTask, updateLeadTask, deleteLeadTask, getLeadTasks,
        // Library
        libraryLeads, isLoadingLibraryLeads, addLibraryLead, deleteLibraryLead, importLibraryLead,
    };
};
