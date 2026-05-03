/**
 * platformLeadService.ts
 * Servicio centralizado para capturar leads a nivel de plataforma.
 * 
 * Los leads se almacenan en la tabla `platform_leads` de Supabase para que tanto
 * visitantes públicos (sin autenticación) como el admin puedan interactuar.
 * 
 * Sources:
 *   - contact-page: Formulario de contacto público
 *   - landing-chatbot: Widget de chatbot en la landing page
 *   - manual: Creación manual desde el admin dashboard
 */

import { supabase } from '../supabase';

// =============================================================================
// TYPES
// =============================================================================

export interface PlatformLeadData {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    message?: string;
    source: 'contact-page' | 'landing-chatbot' | 'newsletter' | 'manual' | 'api';
    status: 'new' | 'contacted' | 'qualified' | 'lost';
    score: number;
    tags: string[];
    /** Extra metadata (e.g. sessionId, conversation preview) */
    metadata?: Record<string, any>;
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Save a new platform-level lead.
 * This writes to the `platform_leads` table so that unauthenticated
 * visitors (contact page, chatbot) can persist leads without login.
 */
export async function savePlatformLead(data: PlatformLeadData): Promise<string> {
    const row: Record<string, any> = {
        name: data.name,
        email: data.email,
        source: data.source,
        status: data.status,
        score: data.score,
        tags: data.tags,
        project_id: '__platform__',
    };

    // Only include optional fields if defined
    if (data.phone !== undefined) row.phone = data.phone;
    if (data.company !== undefined) row.company = data.company;
    if (data.message !== undefined) row.message = data.message;
    if (data.metadata !== undefined) row.metadata = data.metadata;

    const { data: inserted, error } = await supabase
        .from('platform_leads')
        .insert(row)
        .select('id')
        .single();

    if (error) {
        console.error(`[platformLeadService] ❌ Error saving lead:`, error);
        throw error;
    }

    console.log(`[platformLeadService] ✅ Platform lead saved: ${inserted.id} (source: ${data.source})`);
    return inserted.id;
}

