import { Appointment } from '../../../../types';

export const mapAppointmentFromDb = (row: any): Appointment => {
    return {
        id: row.id,
        title: row.title || '',
        description: row.description,
        type: row.type || 'consultation',
        status: row.status || 'scheduled',
        priority: row.priority || 'medium',
        startDate: row.start_date ? { seconds: Math.floor(new Date(row.start_date).getTime() / 1000), nanoseconds: 0 } : { seconds: 0, nanoseconds: 0 },
        endDate: row.end_date ? { seconds: Math.floor(new Date(row.end_date).getTime() / 1000), nanoseconds: 0 } : { seconds: 0, nanoseconds: 0 },
        timezone: row.timezone || 'UTC',
        allDay: row.all_day || false,
        organizerId: row.organizer_id || '',
        organizerName: row.organizer_name,
        organizerEmail: row.organizer_email,
        participants: row.participants || [],
        location: row.location || { type: 'virtual' },
        recurrence: row.recurrence,
        isRecurringInstance: row.is_recurring_instance,
        reminders: row.reminders || [],
        attachments: row.attachments || [],
        notes: row.notes || [],
        followUpActions: row.follow_up_actions || [],
        aiInsights: row.ai_insights,
        aiPrepEnabled: row.ai_prep_enabled,
        autoTranscription: row.auto_transcription,
        googleSync: row.google_sync,
        linkedLeadIds: row.linked_lead_ids,
        linkedDealIds: row.linked_deal_ids,
        linkedProjectIds: row.linked_project_ids,
        parentAppointmentId: row.parent_appointment_id,
        tags: row.tags,
        color: row.color,
        customColor: row.custom_color,
        outcome: row.outcome,
        outcomeNotes: row.outcome_notes,
        rating: row.rating,
        actualDuration: row.actual_duration,
        createdAt: row.created_at ? { seconds: Math.floor(new Date(row.created_at).getTime() / 1000), nanoseconds: 0 } : { seconds: 0, nanoseconds: 0 },
        createdBy: row.created_by || '',
        updatedAt: row.updated_at ? { seconds: Math.floor(new Date(row.updated_at).getTime() / 1000), nanoseconds: 0 } : undefined,
        updatedBy: row.updated_by,
        cancelledAt: row.cancelled_at ? { seconds: Math.floor(new Date(row.cancelled_at).getTime() / 1000), nanoseconds: 0 } : undefined,
        cancelledBy: row.cancelled_by,
        cancelledReason: row.cancelled_reason,
        completedAt: row.completed_at ? { seconds: Math.floor(new Date(row.completed_at).getTime() / 1000), nanoseconds: 0 } : undefined,
        tenantId: row.tenant_id,
        projectId: row.project_id,
    };
};

export const mapAppointmentToDb = (apt: Partial<Appointment>, tenantId?: string, projectId?: string) => {
    const toDateString = (ts: any) => ts?.seconds ? new Date(ts.seconds * 1000).toISOString() : null;
    
    const dbObj: any = {};
    if (apt.title !== undefined) dbObj.title = apt.title;
    if (apt.description !== undefined) dbObj.description = apt.description;
    if (apt.type !== undefined) dbObj.type = apt.type;
    if (apt.status !== undefined) dbObj.status = apt.status;
    if (apt.priority !== undefined) dbObj.priority = apt.priority;
    if (apt.startDate !== undefined) dbObj.start_date = toDateString(apt.startDate);
    if (apt.endDate !== undefined) dbObj.end_date = toDateString(apt.endDate);
    if (apt.timezone !== undefined) dbObj.timezone = apt.timezone;
    if (apt.allDay !== undefined) dbObj.all_day = apt.allDay;
    if (apt.organizerId !== undefined) dbObj.organizer_id = apt.organizerId;
    if (apt.organizerName !== undefined) dbObj.organizer_name = apt.organizerName;
    if (apt.organizerEmail !== undefined) dbObj.organizer_email = apt.organizerEmail;
    if (apt.participants !== undefined) dbObj.participants = apt.participants;
    if (apt.location !== undefined) dbObj.location = apt.location;
    if (apt.recurrence !== undefined) dbObj.recurrence = apt.recurrence;
    if (apt.isRecurringInstance !== undefined) dbObj.is_recurring_instance = apt.isRecurringInstance;
    if (apt.reminders !== undefined) dbObj.reminders = apt.reminders;
    if (apt.attachments !== undefined) dbObj.attachments = apt.attachments;
    if (apt.notes !== undefined) dbObj.notes = apt.notes;
    if (apt.followUpActions !== undefined) dbObj.follow_up_actions = apt.followUpActions;
    if (apt.aiInsights !== undefined) dbObj.ai_insights = apt.aiInsights;
    if (apt.aiPrepEnabled !== undefined) dbObj.ai_prep_enabled = apt.aiPrepEnabled;
    if (apt.autoTranscription !== undefined) dbObj.auto_transcription = apt.autoTranscription;
    if (apt.googleSync !== undefined) dbObj.google_sync = apt.googleSync;
    if (apt.linkedLeadIds !== undefined) dbObj.linked_lead_ids = apt.linkedLeadIds;
    if (apt.linkedDealIds !== undefined) dbObj.linked_deal_ids = apt.linkedDealIds;
    if (apt.linkedProjectIds !== undefined) dbObj.linked_project_ids = apt.linkedProjectIds;
    if (apt.parentAppointmentId !== undefined) dbObj.parent_appointment_id = apt.parentAppointmentId;
    if (apt.tags !== undefined) dbObj.tags = apt.tags;
    if (apt.color !== undefined) dbObj.color = apt.color;
    if (apt.customColor !== undefined) dbObj.custom_color = apt.customColor;
    if (apt.outcome !== undefined) dbObj.outcome = apt.outcome;
    if (apt.outcomeNotes !== undefined) dbObj.outcome_notes = apt.outcomeNotes;
    if (apt.rating !== undefined) dbObj.rating = apt.rating;
    if (apt.actualDuration !== undefined) dbObj.actual_duration = apt.actualDuration;
    if (apt.createdBy !== undefined) dbObj.created_by = apt.createdBy;
    if (apt.updatedBy !== undefined) dbObj.updated_by = apt.updatedBy;
    if (apt.cancelledBy !== undefined) dbObj.cancelled_by = apt.cancelledBy;
    if (apt.cancelledReason !== undefined) dbObj.cancelled_reason = apt.cancelledReason;
    if (apt.tenantId !== undefined) dbObj.tenant_id = apt.tenantId;
    if (apt.projectId !== undefined) dbObj.project_id = apt.projectId;
    
    if (tenantId) dbObj.tenant_id = tenantId;
    if (projectId) dbObj.project_id = projectId;
    
    return dbObj;
};
