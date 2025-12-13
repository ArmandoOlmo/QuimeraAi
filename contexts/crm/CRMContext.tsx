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

        // #region agent log
        const listenerId = `crm-leads-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
        fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:78',message:'Creating CRM leads listener',data:{listenerId,userId:user.uid},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion

        setIsLoadingLeads(true);
        const q = query(
            collection(db, 'users', user.uid, 'leads'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:91',message:'CRM leads snapshot received',data:{listenerId,docCount:snapshot.docs.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
            // #endregion
            const leadsData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as Lead[];
            setLeads(leadsData);
            setIsLoadingLeads(false);
        }, (error) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:102',message:'CRM leads listener ERROR',data:{listenerId,error:String(error),code:(error as any)?.code},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
            // #endregion
            console.error("Error fetching leads:", error);
            setIsLoadingLeads(false);
        });

        return () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:111',message:'Cleaning up CRM leads listener',data:{listenerId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
            // #endregion
            unsubscribe();
        };
    }, [user]);

    // Load activities
    useEffect(() => {
        if (!user) {
            setLeadActivities([]);
            return;
        }

        // #region agent log
        const listenerId = `crm-activities-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
        fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:122',message:'Creating CRM activities listener',data:{listenerId,userId:user.uid},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion

        const q = query(
            collection(db, 'users', user.uid, 'leadActivities'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:133',message:'CRM activities snapshot',data:{listenerId,docCount:snapshot.docs.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
            const activitiesData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as LeadActivity[];
            setLeadActivities(activitiesData);
        }, (error) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:143',message:'CRM activities ERROR',data:{listenerId,error:String(error),code:(error as any)?.code},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
            console.error("Error fetching activities:", error);
        });

        return () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:151',message:'Cleaning up CRM activities listener',data:{listenerId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
            unsubscribe();
        };
    }, [user]);

    // Load tasks
    useEffect(() => {
        if (!user) {
            setLeadTasks([]);
            return;
        }

        // #region agent log
        const listenerId = `crm-tasks-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
        fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:163',message:'Creating CRM tasks listener',data:{listenerId,userId:user.uid},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion

        const q = query(
            collection(db, 'users', user.uid, 'leadTasks'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:174',message:'CRM tasks snapshot',data:{listenerId,docCount:snapshot.docs.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
            const tasksData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as LeadTask[];
            setLeadTasks(tasksData);
        }, (error) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:184',message:'CRM tasks ERROR',data:{listenerId,error:String(error),code:(error as any)?.code},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
            console.error("Error fetching tasks:", error);
        });

        return () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:192',message:'Cleaning up CRM tasks listener',data:{listenerId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
            unsubscribe();
        };
    }, [user]);

    // Load library leads
    useEffect(() => {
        if (!user) {
            setLibraryLeads([]);
            return;
        }

        // #region agent log
        const listenerId = `crm-libLeads-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
        fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:202',message:'Creating CRM library leads listener',data:{listenerId,userId:user.uid},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion

        setIsLoadingLibraryLeads(true);
        const q = query(
            collection(db, 'users', user.uid, 'libraryLeads'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:214',message:'CRM library leads snapshot',data:{listenerId,docCount:snapshot.docs.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
            const leadsData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as LibraryLead[];
            setLibraryLeads(leadsData);
            setIsLoadingLibraryLeads(false);
        }, (error) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:225',message:'CRM library leads ERROR',data:{listenerId,error:String(error),code:(error as any)?.code},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
            console.error("Error fetching library leads:", error);
            setIsLoadingLibraryLeads(false);
        });

        return () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CRMContext.tsx:234',message:'Cleaning up CRM library leads listener',data:{listenerId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
            unsubscribe();
        };
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



