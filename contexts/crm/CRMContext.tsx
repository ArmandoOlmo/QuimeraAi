/**
 * CRMContext
 * Maneja leads, actividades y tareas del CRM
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

interface CRMContextType {
    // Leads
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
    
    // Leads Library
    libraryLeads: LibraryLead[];
    isLoadingLibraryLeads: boolean;
    addLibraryLead: (lead: Omit<LibraryLead, 'id' | 'createdAt' | 'isImported'>) => Promise<void>;
    deleteLibraryLead: (leadId: string) => Promise<void>;
    importLibraryLead: (leadId: string) => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    
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

    // Load leads with real-time updates
    useEffect(() => {
        if (!user) {
            setLeads([]);
            return;
        }

        setIsLoadingLeads(true);
        const q = query(
            collection(db, 'users', user.uid, 'leads'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leadsData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as Lead[];
            setLeads(leadsData);
            setIsLoadingLeads(false);
        }, (error) => {
            console.error("Error fetching leads:", error);
            setIsLoadingLeads(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Load activities
    useEffect(() => {
        if (!user) {
            setLeadActivities([]);
            return;
        }

        const q = query(
            collection(db, 'users', user.uid, 'leadActivities'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activitiesData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as LeadActivity[];
            setLeadActivities(activitiesData);
        });

        return () => unsubscribe();
    }, [user]);

    // Load tasks
    useEffect(() => {
        if (!user) {
            setLeadTasks([]);
            return;
        }

        const q = query(
            collection(db, 'users', user.uid, 'leadTasks'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasksData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as LeadTask[];
            setLeadTasks(tasksData);
        });

        return () => unsubscribe();
    }, [user]);

    // Load library leads
    useEffect(() => {
        if (!user) {
            setLibraryLeads([]);
            return;
        }

        setIsLoadingLibraryLeads(true);
        const q = query(
            collection(db, 'users', user.uid, 'libraryLeads'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leadsData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as LibraryLead[];
            setLibraryLeads(leadsData);
            setIsLoadingLibraryLeads(false);
        }, (error) => {
            console.error("Error fetching library leads:", error);
            setIsLoadingLibraryLeads(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Lead Operations
    const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt'>) => {
        if (!user) return;

        try {
            await addDoc(collection(db, 'users', user.uid, 'leads'), {
                ...leadData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error adding lead:", error);
            throw error;
        }
    };

    const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
        if (!user) return;

        try {
            await updateDoc(doc(db, 'users', user.uid, 'leads', leadId), {
                status,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error updating lead status:", error);
            throw error;
        }
    };

    const updateLead = async (leadId: string, data: Partial<Lead>) => {
        if (!user) return;

        try {
            await updateDoc(doc(db, 'users', user.uid, 'leads', leadId), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error updating lead:", error);
            throw error;
        }
    };

    const deleteLead = async (leadId: string) => {
        if (!user) return;

        try {
            await deleteDoc(doc(db, 'users', user.uid, 'leads', leadId));
        } catch (error) {
            console.error("Error deleting lead:", error);
            throw error;
        }
    };

    // Activity Operations
    const addLeadActivity = async (
        leadId: string,
        activity: Omit<LeadActivity, 'id' | 'createdAt' | 'leadId'>
    ) => {
        if (!user) return;

        try {
            await addDoc(collection(db, 'users', user.uid, 'leadActivities'), {
                ...activity,
                leadId,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error adding lead activity:", error);
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
        if (!user) return;

        try {
            await addDoc(collection(db, 'users', user.uid, 'leadTasks'), {
                ...task,
                leadId,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error adding lead task:", error);
            throw error;
        }
    };

    const updateLeadTask = async (taskId: string, data: Partial<LeadTask>) => {
        if (!user) return;

        try {
            await updateDoc(doc(db, 'users', user.uid, 'leadTasks', taskId), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error updating lead task:", error);
            throw error;
        }
    };

    const deleteLeadTask = async (taskId: string) => {
        if (!user) return;

        try {
            await deleteDoc(doc(db, 'users', user.uid, 'leadTasks', taskId));
        } catch (error) {
            console.error("Error deleting lead task:", error);
            throw error;
        }
    };

    const getLeadTasks = (leadId: string): LeadTask[] => {
        return leadTasks.filter(t => t.leadId === leadId);
    };

    // Library Lead Operations
    const addLibraryLead = async (leadData: Omit<LibraryLead, 'id' | 'createdAt' | 'isImported'>) => {
        if (!user) return;

        try {
            await addDoc(collection(db, 'users', user.uid, 'libraryLeads'), {
                ...leadData,
                isImported: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error adding library lead:", error);
            throw error;
        }
    };

    const deleteLibraryLead = async (leadId: string) => {
        if (!user) return;

        try {
            await deleteDoc(doc(db, 'users', user.uid, 'libraryLeads', leadId));
        } catch (error) {
            console.error("Error deleting library lead:", error);
            throw error;
        }
    };

    const importLibraryLead = async (leadId: string) => {
        if (!user) return;

        try {
            const leadToImport = libraryLeads.find(l => l.id === leadId);
            if (!leadToImport) throw new Error("Lead not found");

            // Create in main CRM
            const newLeadRef = await addDoc(collection(db, 'users', user.uid, 'leads'), {
                name: leadToImport.name,
                email: leadToImport.email,
                phone: leadToImport.phone || '',
                company: leadToImport.company || '',
                source: leadToImport.source || 'library_import',
                status: 'new',
                value: 0,
                notes: leadToImport.notes || '',
                tags: [...(leadToImport.tags || []), 'imported'],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Update library lead status
            await updateDoc(doc(db, 'users', user.uid, 'libraryLeads', leadId), {
                isImported: true,
                importedAt: serverTimestamp(),
                importedLeadId: newLeadRef.id,
            });
        } catch (error) {
            console.error("Error importing library lead:", error);
            throw error;
        }
    };

    const value: CRMContextType = {
        leads,
        isLoadingLeads,
        addLead,
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

