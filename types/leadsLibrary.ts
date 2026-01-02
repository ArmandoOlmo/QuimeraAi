import { LeadStatus } from '../types';

export interface LibraryLead {
    id: string;
    projectId: string; // Required - library leads are scoped to a project
    name: string;
    email: string;
    phone?: string;
    company?: string;
    source?: string;
    tags?: string[];
    notes?: string;
    createdAt: { seconds: number; nanoseconds: number };
    updatedAt?: { seconds: number; nanoseconds: number };

    // Library specific fields
    isImported: boolean;
    importedAt?: { seconds: number; nanoseconds: number };
    importedLeadId?: string; // ID of the lead in the main CRM if imported
}
