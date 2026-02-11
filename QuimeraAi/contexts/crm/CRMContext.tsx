/**
 * CRMContext
 * Maneja leads, actividades y tareas del CRM
 * Los datos están organizados por proyecto (cada proyecto tiene su propio CRM)
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Lead, LeadStatus, LeadActivity, LeadTask, ActivityType, LibraryLead } from '../../types';
import {
    db,
    doc,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    onSnapshot,
} from '../../firebase';
import { useAuth } from '../core/AuthContext';
import { useSafeProject } from '../project';

interface CRMContextType {
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

    // Leads Library
    libraryLeads: LibraryLead[];
    isLoadingLibraryLeads: boolean;
    addLibraryLead: (lead: Omit<LibraryLead, 'id' | 'createdAt' | 'isImported' | 'projectId'>) => Promise<void>;
    deleteLibraryLead: (leadId: string) => Promise<void>;
    importLibraryLead: (leadId: string) => Promise<void>;

    // Project info
    hasActiveProject: boolean;
    activeProjectId: string | null;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const projectContext = useSafeProject();
    const activeProjectId = projectContext?.activeProjectId || null;

    // Leads State
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);

    // Activities State
    const [leadActivities, setLeadActivities] = useState<LeadActivity[]>([]);

    // Tasks State
    const [leadTasks, setLeadTasks] = useState<LeadTask[]>([]);

    // Library Leads State
    const [libraryLeads, setLibraryLeads] = useState<LibraryLead[]>([]);
    const [isLoadingLibraryLeads, setIsLoadingLibraryLeads] = useState(false);

    // Helper to get the collection path for project-scoped data
    const getCollectionPath = useCallback((collectionName: string) => {
        if (!user || !activeProjectId) return null;
        return `users/${user.uid}/projects/${activeProjectId}/${collectionName}`;
    }, [user, activeProjectId]);

    // Load leads with real-time updates (scoped to active project)
    useEffect(() => {
        if (!user || !activeProjectId) {
            setLeads([]);
            setIsLoadingLeads(false);
            return;
        }

        setIsLoadingLeads(true);
        const leadsPath = `users/${user.uid}/projects/${activeProjectId}/leads`;
        const q = query(
            collection(db, leadsPath),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leadsData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                projectId: activeProjectId,
                ...docSnapshot.data()
            })) as Lead[];
            setLeads(leadsData);
            setIsLoadingLeads(false);
        }, (error) => {
            console.error("[CRMContext] Error fetching leads:", error);
            setIsLoadingLeads(false);
        });

        return () => {
            unsubscribe();
        };
    }, [user, activeProjectId]);

    // Load activities (scoped to active project)
    useEffect(() => {
        if (!user || !activeProjectId) {
            setLeadActivities([]);
            return;
        }

        const activitiesPath = `users/${user.uid}/projects/${activeProjectId}/leadActivities`;
        const q = query(
            collection(db, activitiesPath),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activitiesData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                projectId: activeProjectId,
                ...docSnapshot.data()
            })) as LeadActivity[];
            setLeadActivities(activitiesData);
        }, (error) => {
            console.error("[CRMContext] Error fetching activities:", error);
        });

        return () => {
            unsubscribe();
        };
    }, [user, activeProjectId]);

    // Load tasks (scoped to active project)
    useEffect(() => {
        if (!user || !activeProjectId) {
            setLeadTasks([]);
            return;
        }

        const tasksPath = `users/${user.uid}/projects/${activeProjectId}/leadTasks`;
        const q = query(
            collection(db, tasksPath),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasksData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                projectId: activeProjectId,
                ...docSnapshot.data()
            })) as LeadTask[];
            setLeadTasks(tasksData);
        }, (error) => {
            console.error("[CRMContext] Error fetching tasks:", error);
        });

        return () => {
            unsubscribe();
        };
    }, [user, activeProjectId]);

    // Load library leads (scoped to active project)
    useEffect(() => {
        if (!user || !activeProjectId) {
            setLibraryLeads([]);
            setIsLoadingLibraryLeads(false);
            return;
        }

        setIsLoadingLibraryLeads(true);
        const libraryPath = `users/${user.uid}/projects/${activeProjectId}/libraryLeads`;
        const q = query(
            collection(db, libraryPath),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leadsData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                projectId: activeProjectId,
                ...docSnapshot.data()
            })) as LibraryLead[];
            setLibraryLeads(leadsData);
            setIsLoadingLibraryLeads(false);
        }, (error) => {
            console.error("[CRMContext] Error fetching library leads:", error);
            setIsLoadingLibraryLeads(false);
        });

        return () => {
            unsubscribe();
        };
    }, [user, activeProjectId]);

    // Lead Operations
    const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'projectId'>): Promise<string | undefined> => {
        if (!user || !activeProjectId) {
            console.error("[CRMContext] Cannot add lead: No user or active project");
            return undefined;
        }

        // Debug: Log what we're saving
        console.log('[CRMContext] 📝 addLead called with:', {
            name: leadData.name,
            email: leadData.email,
            source: leadData.source,
            hasTranscript: !!leadData.conversationTranscript,
            transcriptLength: leadData.conversationTranscript?.length || 0,
            transcriptPreview: leadData.conversationTranscript?.substring(0, 200)
        });

        try {
            const leadsPath = `users/${user.uid}/projects/${activeProjectId}/leads`;
            console.log('[CRMContext] 📍 Saving to path:', leadsPath);

            const docRef = await addDoc(collection(db, leadsPath), {
                ...leadData,
                projectId: activeProjectId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            console.log('[CRMContext] ✅ Lead saved with ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error("[CRMContext] Error adding lead:", error);
            throw error;
        }
    };

    // Bulk Lead Import
    const addLeadsBulk = async (leadsData: Omit<Lead, 'id' | 'createdAt' | 'projectId'>[]): Promise<string[]> => {
        if (!user || !activeProjectId) {
            console.error("[CRMContext] Cannot bulk add leads: No user or active project");
            return [];
        }

        console.log(`[CRMContext] 📦 addLeadsBulk called with ${leadsData.length} leads`);
        const createdIds: string[] = [];

        try {
            const leadsPath = `users/${user.uid}/projects/${activeProjectId}/leads`;
            const BATCH_SIZE = 10;

            for (let i = 0; i < leadsData.length; i += BATCH_SIZE) {
                const batch = leadsData.slice(i, i + BATCH_SIZE);
                const promises = batch.map(leadData => {
                    // Firestore rejects undefined values — strip them
                    const sanitized: Record<string, any> = {};
                    Object.entries(leadData).forEach(([key, val]) => {
                        if (val !== undefined) sanitized[key] = val;
                    });
                    return addDoc(collection(db, leadsPath), {
                        ...sanitized,
                        projectId: activeProjectId,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                });
                const refs = await Promise.all(promises);
                refs.forEach(ref => createdIds.push(ref.id));
                console.log(`[CRMContext] ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} complete (${createdIds.length}/${leadsData.length})`);
            }

            console.log(`[CRMContext] ✅ Bulk import complete: ${createdIds.length} leads created`);
            return createdIds;
        } catch (error) {
            console.error("[CRMContext] Error in bulk lead import:", error);
            throw error;
        }
    };

    const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
        if (!user || !activeProjectId) return;

        try {
            const leadPath = `users/${user.uid}/projects/${activeProjectId}/leads/${leadId}`;
            await updateDoc(doc(db, leadPath), {
                status,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("[CRMContext] Error updating lead status:", error);
            throw error;
        }
    };

    const updateLead = async (leadId: string, data: Partial<Lead>) => {
        if (!user || !activeProjectId) return;

        try {
            const leadPath = `users/${user.uid}/projects/${activeProjectId}/leads/${leadId}`;
            await updateDoc(doc(db, leadPath), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("[CRMContext] Error updating lead:", error);
            throw error;
        }
    };

    const deleteLead = async (leadId: string) => {
        if (!user || !activeProjectId) return;

        try {
            const leadPath = `users/${user.uid}/projects/${activeProjectId}/leads/${leadId}`;
            await deleteDoc(doc(db, leadPath));
        } catch (error) {
            console.error("[CRMContext] Error deleting lead:", error);
            throw error;
        }
    };

    // Activity Operations
    const addLeadActivity = async (
        leadId: string,
        activity: Omit<LeadActivity, 'id' | 'createdAt' | 'leadId'>
    ) => {
        if (!user || !activeProjectId) return;

        try {
            const activitiesPath = `users/${user.uid}/projects/${activeProjectId}/leadActivities`;
            await addDoc(collection(db, activitiesPath), {
                ...activity,
                leadId,
                projectId: activeProjectId,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("[CRMContext] Error adding lead activity:", error);
            throw error;
        }
    };

    const getLeadActivities = (leadId: string): LeadActivity[] => {
        return leadActivities.filter(a => a.leadId === leadId);
    };

    // Task Operations
    const addLeadTask = async (
        leadId: string,
        task: Omit<LeadTask, 'id' | 'createdAt' | 'leadId'>
    ) => {
        if (!user || !activeProjectId) return;

        try {
            const tasksPath = `users/${user.uid}/projects/${activeProjectId}/leadTasks`;
            await addDoc(collection(db, tasksPath), {
                ...task,
                leadId,
                projectId: activeProjectId,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("[CRMContext] Error adding lead task:", error);
            throw error;
        }
    };

    const updateLeadTask = async (taskId: string, data: Partial<LeadTask>) => {
        if (!user || !activeProjectId) return;

        try {
            const taskPath = `users/${user.uid}/projects/${activeProjectId}/leadTasks/${taskId}`;
            await updateDoc(doc(db, taskPath), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("[CRMContext] Error updating lead task:", error);
            throw error;
        }
    };

    const deleteLeadTask = async (taskId: string) => {
        if (!user || !activeProjectId) return;

        try {
            const taskPath = `users/${user.uid}/projects/${activeProjectId}/leadTasks/${taskId}`;
            await deleteDoc(doc(db, taskPath));
        } catch (error) {
            console.error("[CRMContext] Error deleting lead task:", error);
            throw error;
        }
    };

    const getLeadTasks = (leadId: string): LeadTask[] => {
        return leadTasks.filter(t => t.leadId === leadId);
    };

    // Library Lead Operations
    const addLibraryLead = async (leadData: Omit<LibraryLead, 'id' | 'createdAt' | 'isImported'>) => {
        if (!user || !activeProjectId) return;

        try {
            const libraryPath = `users/${user.uid}/projects/${activeProjectId}/libraryLeads`;
            await addDoc(collection(db, libraryPath), {
                ...leadData,
                projectId: activeProjectId,
                isImported: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("[CRMContext] Error adding library lead:", error);
            throw error;
        }
    };

    const deleteLibraryLead = async (leadId: string) => {
        if (!user || !activeProjectId) return;

        try {
            const libraryLeadPath = `users/${user.uid}/projects/${activeProjectId}/libraryLeads/${leadId}`;
            await deleteDoc(doc(db, libraryLeadPath));
        } catch (error) {
            console.error("[CRMContext] Error deleting library lead:", error);
            throw error;
        }
    };

    const importLibraryLead = async (leadId: string) => {
        if (!user || !activeProjectId) return;

        try {
            const leadToImport = libraryLeads.find(l => l.id === leadId);
            if (!leadToImport) throw new Error("Lead not found");

            // Create in main CRM (same project)
            const leadsPath = `users/${user.uid}/projects/${activeProjectId}/leads`;
            const newLeadRef = await addDoc(collection(db, leadsPath), {
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
                updatedAt: serverTimestamp(),
            });

            // Update library lead status
            const libraryLeadPath = `users/${user.uid}/projects/${activeProjectId}/libraryLeads/${leadId}`;
            await updateDoc(doc(db, libraryLeadPath), {
                isImported: true,
                importedAt: serverTimestamp(),
                importedLeadId: newLeadRef.id,
            });
        } catch (error) {
            console.error("[CRMContext] Error importing library lead:", error);
            throw error;
        }
    };

    const value: CRMContextType = {
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
        libraryLeads,
        isLoadingLibraryLeads,
        addLibraryLead,
        deleteLibraryLead,
        importLibraryLead,
        hasActiveProject: !!activeProjectId,
        activeProjectId,
    };

    return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
};

export const useCRM = (): CRMContextType => {
    const context = useContext(CRMContext);
    if (!context) {
        throw new Error('useCRM must be used within a CRMProvider');
    }
    return context;
};
