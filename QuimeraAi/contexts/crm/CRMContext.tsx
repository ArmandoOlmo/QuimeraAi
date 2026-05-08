/**
 * CRMContext
 * Maneja leads, actividades y tareas del CRM
 * Los datos están organizados por proyecto (cada proyecto tiene su propio CRM)
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Lead, LeadStatus, LeadActivity, LeadTask, ActivityType, LibraryLead } from '../../types';
import { supabase } from '../../supabase';
import { useAuth } from '../core/AuthContext';
import { useSafeProject } from '../project';
import { useSafeTenant } from '../tenant';

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
    const tenantContext = useSafeTenant();
    const currentTenantId = tenantContext?.currentTenant?.id || null;

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
        if (!user || !activeProjectId || !currentTenantId) {
            setLeads([]);
            setIsLoadingLeads(false);
            return;
        }

        const fetchLeads = async () => {
            setIsLoadingLeads(true);
            try {
                const { data, error } = await supabase
                    .from('leads')
                    .select('*')
                    .eq('project_id', activeProjectId)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const leadsData = (data || []).map(l => ({
                    id: l.id,
                    projectId: l.project_id,
                    name: l.name,
                    email: l.email,
                    phone: l.phone,
                    company: l.company,
                    source: l.source,
                    status: l.status,
                    value: l.value,
                    notes: l.notes,
                    tags: l.tags || [],
                    createdAt: l.created_at,
                    updatedAt: l.updated_at,
                    conversationTranscript: l.conversation_transcript,
                    aiSummary: l.ai_summary,
                    metadata: l.metadata
                })) as Lead[];
                setLeads(leadsData);
            } catch (error) {
                console.error("[CRMContext] Error fetching leads:", error);
            } finally {
                setIsLoadingLeads(false);
            }
        };

        fetchLeads();

        const channel = supabase.channel(`public:leads:project_id=eq.${activeProjectId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'leads',
                filter: `project_id=eq.${activeProjectId}`
            }, () => {
                fetchLeads();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, activeProjectId, currentTenantId]);

    // Load activities
    useEffect(() => {
        if (!user || !activeProjectId || !currentTenantId) {
            setLeadActivities([]);
            return;
        }

        const fetchActivities = async () => {
            try {
                const { data, error } = await supabase
                    .from('lead_activities')
                    .select('*')
                    .eq('project_id', activeProjectId)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const activitiesData = (data || []).map(a => ({
                    id: a.id,
                    leadId: a.lead_id,
                    projectId: a.project_id,
                    type: a.type,
                    description: a.description,
                    createdAt: a.created_at,
                    metadata: a.metadata,
                    performedBy: a.metadata?.performedBy
                })) as LeadActivity[];
                setLeadActivities(activitiesData);
            } catch (error) {
                console.error("[CRMContext] Error fetching activities:", error);
            }
        };

        fetchActivities();

        const channel = supabase.channel(`public:lead_activities:project_id=eq.${activeProjectId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'lead_activities',
                filter: `project_id=eq.${activeProjectId}`
            }, () => {
                fetchActivities();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, activeProjectId, currentTenantId]);

    // Load tasks
    useEffect(() => {
        if (!user || !activeProjectId || !currentTenantId) {
            setLeadTasks([]);
            return;
        }

        const fetchTasks = async () => {
            try {
                const { data, error } = await supabase
                    .from('lead_tasks')
                    .select('*')
                    .eq('project_id', activeProjectId)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const tasksData = (data || []).map(t => ({
                    id: t.id,
                    leadId: t.lead_id,
                    projectId: t.project_id,
                    title: t.title,
                    description: t.description,
                    dueDate: t.due_date,
                    isCompleted: t.is_completed,
                    createdAt: t.created_at,
                    updatedAt: t.updated_at,
                    assignedTo: t.metadata?.assignedTo
                })) as LeadTask[];
                setLeadTasks(tasksData);
            } catch (error) {
                console.error("[CRMContext] Error fetching tasks:", error);
            }
        };

        fetchTasks();

        const channel = supabase.channel(`public:lead_tasks:project_id=eq.${activeProjectId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'lead_tasks',
                filter: `project_id=eq.${activeProjectId}`
            }, () => {
                fetchTasks();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, activeProjectId, currentTenantId]);

    // Load library leads
    useEffect(() => {
        if (!user || !activeProjectId || !currentTenantId) {
            setLibraryLeads([]);
            setIsLoadingLibraryLeads(false);
            return;
        }

        const fetchLibraryLeads = async () => {
            setIsLoadingLibraryLeads(true);
            try {
                const { data, error } = await supabase
                    .from('library_leads')
                    .select('*')
                    .eq('project_id', activeProjectId)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const leadsData = (data || []).map(l => ({
                    id: l.id,
                    projectId: l.project_id,
                    name: l.name,
                    email: l.email,
                    phone: l.phone,
                    company: l.company,
                    source: l.source,
                    notes: l.notes,
                    tags: l.tags || [],
                    isImported: l.is_imported,
                    importedAt: l.imported_at,
                    importedLeadId: l.imported_lead_id,
                    createdAt: l.created_at,
                    updatedAt: l.updated_at
                })) as LibraryLead[];
                setLibraryLeads(leadsData);
            } catch (error) {
                console.error("[CRMContext] Error fetching library leads:", error);
            } finally {
                setIsLoadingLibraryLeads(false);
            }
        };

        fetchLibraryLeads();

        const channel = supabase.channel(`public:library_leads:project_id=eq.${activeProjectId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'library_leads',
                filter: `project_id=eq.${activeProjectId}`
            }, () => {
                fetchLibraryLeads();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, activeProjectId, currentTenantId]);

    // Lead Operations
    const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'projectId'>): Promise<string | undefined> => {
        if (!user || !activeProjectId || !currentTenantId) {
            console.error("[CRMContext] Cannot add lead: No user or active project");
            return undefined;
        }

        try {
            const newLead = {
                tenant_id: currentTenantId,
                project_id: activeProjectId,
                name: leadData.name,
                email: leadData.email,
                phone: leadData.phone,
                company: leadData.company,
                source: leadData.source,
                status: leadData.status,
                value: leadData.value,
                notes: leadData.notes,
                tags: leadData.tags,
                conversation_transcript: leadData.conversationTranscript,
                ai_summary: leadData.aiSummary,
                metadata: leadData.metadata,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('leads')
                .insert([newLead])
                .select('id')
                .single();

            if (error) throw error;
            return data.id;
        } catch (error) {
            console.error("[CRMContext] Error adding lead:", error);
            throw error;
        }
    };

    // Bulk Lead Import
    const addLeadsBulk = async (leadsData: Omit<Lead, 'id' | 'createdAt' | 'projectId'>[]): Promise<string[]> => {
        if (!user || !activeProjectId || !currentTenantId) {
            console.error("[CRMContext] Cannot bulk add leads: No user or active project");
            return [];
        }

        try {
            const BATCH_SIZE = 100; // Supabase can handle larger batches than Firestore easily
            const createdIds: string[] = [];

            for (let i = 0; i < leadsData.length; i += BATCH_SIZE) {
                const batch = leadsData.slice(i, i + BATCH_SIZE);
                const records = batch.map(leadData => {
                    const sanitized: any = {};
                    Object.entries(leadData).forEach(([key, val]) => {
                        if (val !== undefined) sanitized[key] = val;
                    });
                    
                    return {
                        tenant_id: currentTenantId,
                        project_id: activeProjectId,
                        name: sanitized.name,
                        email: sanitized.email,
                        phone: sanitized.phone,
                        company: sanitized.company,
                        source: sanitized.source,
                        status: sanitized.status,
                        value: sanitized.value,
                        notes: sanitized.notes,
                        tags: sanitized.tags,
                        conversation_transcript: sanitized.conversationTranscript,
                        ai_summary: sanitized.aiSummary,
                        metadata: sanitized.metadata,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                });

                const { data, error } = await supabase
                    .from('leads')
                    .insert(records)
                    .select('id');

                if (error) throw error;
                if (data) data.forEach(d => createdIds.push(d.id));
            }

            return createdIds;
        } catch (error) {
            console.error("[CRMContext] Error in bulk lead import:", error);
            throw error;
        }
    };

    const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
        if (!user || !activeProjectId) return;

        try {
            const { error } = await supabase
                .from('leads')
                .update({ 
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', leadId);

            if (error) throw error;
        } catch (error) {
            console.error("[CRMContext] Error updating lead status:", error);
            throw error;
        }
    };

    const updateLead = async (leadId: string, data: Partial<Lead>) => {
        if (!user || !activeProjectId) return;

        try {
            const updateData: any = { updated_at: new Date().toISOString() };
            if (data.name !== undefined) updateData.name = data.name;
            if (data.email !== undefined) updateData.email = data.email;
            if (data.phone !== undefined) updateData.phone = data.phone;
            if (data.company !== undefined) updateData.company = data.company;
            if (data.source !== undefined) updateData.source = data.source;
            if (data.status !== undefined) updateData.status = data.status;
            if (data.value !== undefined) updateData.value = data.value;
            if (data.notes !== undefined) updateData.notes = data.notes;
            if (data.tags !== undefined) updateData.tags = data.tags;
            if (data.conversationTranscript !== undefined) updateData.conversation_transcript = data.conversationTranscript;
            if (data.aiSummary !== undefined) updateData.ai_summary = data.aiSummary;
            if (data.metadata !== undefined) updateData.metadata = data.metadata;

            const { error } = await supabase
                .from('leads')
                .update(updateData)
                .eq('id', leadId);

            if (error) throw error;
        } catch (error) {
            console.error("[CRMContext] Error updating lead:", error);
            throw error;
        }
    };

    const deleteLead = async (leadId: string) => {
        if (!user || !activeProjectId) return;

        try {
            const { error } = await supabase
                .from('leads')
                .delete()
                .eq('id', leadId);

            if (error) throw error;
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
        if (!user || !activeProjectId || !currentTenantId) return;

        try {
            const { error } = await supabase
                .from('lead_activities')
                .insert([{
                    tenant_id: currentTenantId,
                    project_id: activeProjectId,
                    lead_id: leadId,
                    type: activity.type,
                    description: activity.description,
                    metadata: { performedBy: (activity as any).performedBy }, // Simplified
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;
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
        if (!user || !activeProjectId || !currentTenantId) return;

        try {
            const { error } = await supabase
                .from('lead_tasks')
                .insert([{
                    tenant_id: currentTenantId,
                    project_id: activeProjectId,
                    lead_id: leadId,
                    title: task.title,
                    description: task.description,
                    due_date: task.dueDate || null,
                    is_completed: task.isCompleted || false,
                    metadata: { assignedTo: (task as any).assignedTo },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);

            if (error) throw error;
        } catch (error) {
            console.error("[CRMContext] Error adding lead task:", error);
            throw error;
        }
    };

    const updateLeadTask = async (taskId: string, data: Partial<LeadTask>) => {
        if (!user || !activeProjectId) return;

        try {
            const updateData: any = { updated_at: new Date().toISOString() };
            if (data.title !== undefined) updateData.title = data.title;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.dueDate !== undefined) updateData.due_date = data.dueDate;
            if (data.isCompleted !== undefined) updateData.is_completed = data.isCompleted;

            const { error } = await supabase
                .from('lead_tasks')
                .update(updateData)
                .eq('id', taskId);

            if (error) throw error;
        } catch (error) {
            console.error("[CRMContext] Error updating lead task:", error);
            throw error;
        }
    };

    const deleteLeadTask = async (taskId: string) => {
        if (!user || !activeProjectId) return;

        try {
            const { error } = await supabase
                .from('lead_tasks')
                .delete()
                .eq('id', taskId);

            if (error) throw error;
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
        if (!user || !activeProjectId || !currentTenantId) return;

        try {
            const { error } = await supabase
                .from('library_leads')
                .insert([{
                    tenant_id: currentTenantId,
                    project_id: activeProjectId,
                    name: leadData.name,
                    email: leadData.email,
                    phone: leadData.phone,
                    company: leadData.company,
                    source: leadData.source,
                    notes: leadData.notes,
                    tags: leadData.tags,
                    is_imported: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);

            if (error) throw error;
        } catch (error) {
            console.error("[CRMContext] Error adding library lead:", error);
            throw error;
        }
    };

    const deleteLibraryLead = async (leadId: string) => {
        if (!user || !activeProjectId) return;

        try {
            const { error } = await supabase
                .from('library_leads')
                .delete()
                .eq('id', leadId);

            if (error) throw error;
        } catch (error) {
            console.error("[CRMContext] Error deleting library lead:", error);
            throw error;
        }
    };

    const importLibraryLead = async (leadId: string) => {
        if (!user || !activeProjectId || !currentTenantId) return;

        try {
            const leadToImport = libraryLeads.find(l => l.id === leadId);
            if (!leadToImport) throw new Error("Lead not found");

            // Create in main CRM
            const { data: newLead, error: insertError } = await supabase
                .from('leads')
                .insert([{
                    tenant_id: currentTenantId,
                    project_id: activeProjectId,
                    name: leadToImport.name,
                    email: leadToImport.email,
                    phone: leadToImport.phone || '',
                    company: leadToImport.company || '',
                    source: leadToImport.source || 'library_import',
                    status: 'new',
                    value: 0,
                    notes: leadToImport.notes || '',
                    tags: [...(leadToImport.tags || []), 'imported'],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select('id')
                .single();

            if (insertError) throw insertError;

            // Update library lead status
            const { error: updateError } = await supabase
                .from('library_leads')
                .update({
                    is_imported: true,
                    imported_at: new Date().toISOString(),
                    imported_lead_id: newLead.id
                })
                .eq('id', leadId);

            if (updateError) throw updateError;
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
