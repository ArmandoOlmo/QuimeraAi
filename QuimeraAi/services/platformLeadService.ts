/**
 * platformLeadService.ts
 * Servicio centralizado para capturar leads a nivel de plataforma.
 * 
 * Los leads se almacenan en la colección raíz `platformLeads` para que tanto
 * visitantes públicos (sin autenticación) como el admin puedan interactuar.
 * 
 * Sources:
 *   - contact-page: Formulario de contacto público
 *   - landing-chatbot: Widget de chatbot en la landing page
 *   - manual: Creación manual desde el admin dashboard
 */

import { db, collection, addDoc, serverTimestamp } from '../firebase';

// =============================================================================
// TYPES
// =============================================================================

export interface PlatformLeadData {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    message?: string;
    source: 'contact-page' | 'landing-chatbot' | 'manual' | 'api';
    status: 'new' | 'contacted' | 'qualified' | 'lost';
    score: number;
    tags: string[];
    /** Extra metadata (e.g. sessionId, conversation preview) */
    metadata?: Record<string, any>;
}

// Root-level Firestore collection — publicly writable via security rules
const PLATFORM_LEADS_COLLECTION = 'platformLeads';

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Save a new platform-level lead.
 * This writes to the root `platformLeads` collection so that unauthenticated
 * visitors (contact page, chatbot) can persist leads without login.
 */
export async function savePlatformLead(data: PlatformLeadData): Promise<string> {
    const sanitized: Record<string, any> = {};

    // Remove undefined values to avoid Firestore errors
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) sanitized[key] = value;
    });

    const docRef = await addDoc(collection(db, PLATFORM_LEADS_COLLECTION), {
        ...sanitized,
        projectId: '__platform__',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    console.log(`[platformLeadService] ✅ Platform lead saved: ${docRef.id} (source: ${data.source})`);
    return docRef.id;
}
