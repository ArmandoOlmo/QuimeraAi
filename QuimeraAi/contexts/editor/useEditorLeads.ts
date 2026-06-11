/**
 * useEditorLeads.ts
 * Extracted from EditorContext.tsx — Leads CRM, Activities, Tasks, and Library
 */
import { useState, useEffect } from 'react';
import { Lead, LeadStatus, LeadActivity, LeadTask, LibraryLead } from '../../types';
import { supabase } from '../../supabase';
import type { User } from '@supabase/supabase-js';

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

    // Helper to get tenantId - in the editor we can fetch it once or rely on the project
    const [tenantId, setTenantId] = useState<string | null>(null);

    useEffect(() => {
        if (!activeProjectId) return;
        const fetchTenant = async () => {
            const { data } = await supabase.from('projects').select('tenant_id').eq('id', activeProjectId).single();
            if (data?.tenant_id) {
                setTenantId(data.tenant_id);
            } else if (user) {
                setTenantId(user.id || (user as any).uid);
            }
        };
        fetchTenant();
    }, [activeProjectId, user]);

    // Leads Real-time Subscription - Project-scoped
    useEffect(() => {
        if (!user || !activeProjectId) {
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
            } catch (e) {
                console.error("[useEditorLeads] Error setting up Leads subscription:", e);
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
    }, [user, activeProjectId]);

    // Lead Activities Real-time Subscription - Project-scoped
    useEffect(() => {
        if (!user || !activeProjectId) {
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
                })) as unknown as LeadActivity[];
                setLeadActivities(activitiesData);
            } catch (e) {
                console.error("[useEditorLeads] Error setting up Lead Activities subscription:", e);
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
    }, [user, activeProjectId]);

    // Lead Tasks Real-time Subscription - Project-scoped
    useEffect(() => {
        if (!user || !activeProjectId) {
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
                })) as unknown as LeadTask[];
                setLeadTasks(tasksData);
            } catch (e) {
                console.error("[useEditorLeads] Error setting up Lead Tasks subscription:", e);
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
    }, [user, activeProjectId]);

    // Leads Library Real-time Subscription - Project-scoped
    useEffect(() => {
        if (!user || !activeProjectId) {
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
            } catch (e) {
                console.error("[useEditorLeads] Error fetching library leads:", e);
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
    }, [user, activeProjectId]);

    // ─── CRUD Functions ───

    const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'projectId'>): Promise<string | undefined> => {
        if (!user || !activeProjectId || !tenantId) return undefined;
        try {
            const { data, error } = await supabase
                .from('leads')
                .insert([{
                    tenant_id: tenantId,
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
                }])
                .select('id')
                .single();

            if (error) throw error;
            return data.id;
        } catch (error) {
            console.error("[useEditorLeads] Error adding lead:", error);
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
            console.error("[useEditorLeads] Error updating lead status:", error);
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
            console.error("[useEditorLeads] Error updating lead:", error);
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
            console.log(`✅ Lead ${leadId} deleted`);
        } catch (error) {
            console.error("[useEditorLeads] Error deleting lead:", error);
            throw error;
        }
    };

    // ─── Lead Activities ───

    const addLeadActivity = async (leadId: string, activityData: Omit<LeadActivity, 'id' | 'createdAt' | 'leadId'>) => {
        if (!user || !activeProjectId || !tenantId) return;
        try {
            const { error } = await supabase
                .from('lead_activities')
                .insert([{
                    tenant_id: tenantId,
                    project_id: activeProjectId,
                    lead_id: leadId,
                    type: activityData.type,
                    description: activityData.description,
                    metadata: { performedBy: (activityData as any).performedBy },
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;
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
        if (!user || !activeProjectId || !tenantId) return;
        try {
            const { error } = await supabase
                .from('lead_tasks')
                .insert([{
                    tenant_id: tenantId,
                    project_id: activeProjectId,
                    lead_id: leadId,
                    title: taskData.title,
                    description: taskData.description,
                    due_date: taskData.dueDate || null,
                    is_completed: taskData.isCompleted || false,
                    metadata: { assignedTo: (taskData as any).assignedTo },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);

            if (error) throw error;
        } catch (error) {
            console.error("[useEditorLeads] Error adding lead task:", error);
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
            console.error("[useEditorLeads] Error updating lead task:", error);
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
            console.error("[useEditorLeads] Error deleting lead task:", error);
        }
    };

    const getLeadTasks = (leadId: string): LeadTask[] => {
        return leadTasks.filter(t => t.leadId === leadId);
    };

    // ─── Library Leads ───

    const addLibraryLead = async (leadData: Omit<LibraryLead, 'id' | 'createdAt' | 'isImported'>) => {
        if (!user || !activeProjectId || !tenantId) return;
        try {
            const { error } = await supabase
                .from('library_leads')
                .insert([{
                    tenant_id: tenantId,
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
            console.error("[useEditorLeads] Error adding library lead:", error);
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
            console.error("[useEditorLeads] Error deleting library lead:", error);
            throw error;
        }
    };

    const importLibraryLead = async (leadId: string) => {
        if (!user || !activeProjectId || !tenantId) return;
        try {
            const leadToImport = libraryLeads.find(l => l.id === leadId);
            if (!leadToImport) throw new Error("Lead not found");

            // Create in main CRM
            const { data: newLead, error: insertError } = await supabase
                .from('leads')
                .insert([{
                    tenant_id: tenantId,
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
