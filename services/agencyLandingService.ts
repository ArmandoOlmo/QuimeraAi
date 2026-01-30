/**
 * Agency Landing Service
 * CRUD operations for agency landing pages
 * Uses the same structure as Quimera's landing page
 */

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    AgencyLandingConfig,
    AgencyLandingSection,
    createDefaultAgencyLandingConfig,
} from '../types/agencyLanding';

// Collection name for agency landing pages
const COLLECTION_NAME = 'agencyLandings';

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Get agency landing config by tenant ID
 */
export async function getAgencyLanding(tenantId: string): Promise<AgencyLandingConfig | null> {
    try {
        // Query by tenantId since document ID might differ
        const q = query(
            collection(db, COLLECTION_NAME),
            where('tenantId', '==', tenantId)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data(),
        } as AgencyLandingConfig;
    } catch (error) {
        console.error('Error fetching agency landing:', error);
        throw error;
    }
}

/**
 * Get agency landing by document ID
 */
export async function getAgencyLandingById(landingId: string): Promise<AgencyLandingConfig | null> {
    try {
        const docRef = doc(db, COLLECTION_NAME, landingId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return {
            id: docSnap.id,
            ...docSnap.data(),
        } as AgencyLandingConfig;
    } catch (error) {
        console.error('Error fetching agency landing by ID:', error);
        throw error;
    }
}

/**
 * Create or update agency landing config
 */
export async function saveAgencyLanding(
    tenantId: string,
    config: Partial<AgencyLandingConfig>,
    userId?: string
): Promise<string> {
    try {
        // Check if landing already exists
        const existing = await getAgencyLanding(tenantId);
        
        if (existing?.id) {
            // Update existing
            const docRef = doc(db, COLLECTION_NAME, existing.id);
            await updateDoc(docRef, {
                ...config,
                updatedAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                updatedBy: userId || null,
            });
            return existing.id;
        } else {
            // Create new
            const newConfig = createDefaultAgencyLandingConfig(tenantId);
            const docRef = doc(collection(db, COLLECTION_NAME));
            
            await setDoc(docRef, {
                ...newConfig,
                ...config,
                tenantId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                updatedBy: userId || null,
            });
            
            return docRef.id;
        }
    } catch (error) {
        console.error('Error saving agency landing:', error);
        throw error;
    }
}

/**
 * Save only sections (for editor auto-save)
 */
export async function saveAgencyLandingSections(
    tenantId: string,
    sections: AgencyLandingSection[],
    userId?: string
): Promise<void> {
    try {
        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            // Create new landing with sections
            await saveAgencyLanding(tenantId, { sections }, userId);
            return;
        }

        const docRef = doc(db, COLLECTION_NAME, existing.id);
        await updateDoc(docRef, {
            sections,
            updatedAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            updatedBy: userId || null,
        });
    } catch (error) {
        console.error('Error saving agency landing sections:', error);
        throw error;
    }
}

/**
 * Publish agency landing
 */
export async function publishAgencyLanding(tenantId: string): Promise<void> {
    try {
        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            throw new Error('Landing page not found');
        }

        const docRef = doc(db, COLLECTION_NAME, existing.id);
        await updateDoc(docRef, {
            isPublished: true,
            publishedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error publishing agency landing:', error);
        throw error;
    }
}

/**
 * Unpublish agency landing
 */
export async function unpublishAgencyLanding(tenantId: string): Promise<void> {
    try {
        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            throw new Error('Landing page not found');
        }

        const docRef = doc(db, COLLECTION_NAME, existing.id);
        await updateDoc(docRef, {
            isPublished: false,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error unpublishing agency landing:', error);
        throw error;
    }
}

/**
 * Delete agency landing
 */
export async function deleteAgencyLanding(tenantId: string): Promise<void> {
    try {
        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            return; // Already doesn't exist
        }

        await deleteDoc(doc(db, COLLECTION_NAME, existing.id));
    } catch (error) {
        console.error('Error deleting agency landing:', error);
        throw error;
    }
}

// =============================================================================
// DOMAIN OPERATIONS
// =============================================================================

/**
 * Check if a subdomain is available
 */
export async function isSubdomainAvailable(subdomain: string, excludeTenantId?: string): Promise<boolean> {
    try {
        const normalizedSubdomain = subdomain.toLowerCase().trim();
        
        // Reserved subdomains
        const reserved = ['www', 'app', 'api', 'admin', 'dashboard', 'login', 'signup', 'register'];
        if (reserved.includes(normalizedSubdomain)) {
            return false;
        }

        const q = query(
            collection(db, COLLECTION_NAME),
            where('domain.subdomain', '==', normalizedSubdomain)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return true;
        }

        // If excluding a tenant, check if the only result is that tenant
        if (excludeTenantId) {
            return snapshot.docs.every(doc => doc.data().tenantId === excludeTenantId);
        }

        return false;
    } catch (error) {
        console.error('Error checking subdomain availability:', error);
        throw error;
    }
}

/**
 * Reserve a subdomain for an agency
 */
export async function reserveSubdomain(tenantId: string, subdomain: string): Promise<boolean> {
    try {
        const isAvailable = await isSubdomainAvailable(subdomain, tenantId);
        
        if (!isAvailable) {
            return false;
        }

        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            // Create new with subdomain
            await saveAgencyLanding(tenantId, {
                domain: { subdomain: subdomain.toLowerCase().trim() },
            });
        } else {
            const docRef = doc(db, COLLECTION_NAME, existing.id);
            await updateDoc(docRef, {
                'domain.subdomain': subdomain.toLowerCase().trim(),
                updatedAt: serverTimestamp(),
            });
        }

        return true;
    } catch (error) {
        console.error('Error reserving subdomain:', error);
        throw error;
    }
}

/**
 * Get agency landing by subdomain (for public resolution)
 */
export async function getAgencyLandingBySubdomain(subdomain: string): Promise<AgencyLandingConfig | null> {
    try {
        const normalizedSubdomain = subdomain.toLowerCase().trim();
        
        const q = query(
            collection(db, COLLECTION_NAME),
            where('domain.subdomain', '==', normalizedSubdomain),
            where('isPublished', '==', true)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data(),
        } as AgencyLandingConfig;
    } catch (error) {
        console.error('Error fetching agency landing by subdomain:', error);
        throw error;
    }
}

/**
 * Get agency landing by custom domain (for public resolution)
 */
export async function getAgencyLandingByCustomDomain(domain: string): Promise<AgencyLandingConfig | null> {
    try {
        const normalizedDomain = domain.toLowerCase().trim();
        
        const q = query(
            collection(db, COLLECTION_NAME),
            where('domain.customDomain', '==', normalizedDomain),
            where('isPublished', '==', true)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data(),
        } as AgencyLandingConfig;
    } catch (error) {
        console.error('Error fetching agency landing by custom domain:', error);
        throw error;
    }
}

// =============================================================================
// THEME & BRANDING OPERATIONS
// =============================================================================

/**
 * Update agency theme settings
 */
export async function updateAgencyTheme(
    tenantId: string,
    theme: Partial<AgencyLandingConfig['theme']>
): Promise<void> {
    try {
        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            throw new Error('Landing page not found');
        }

        const docRef = doc(db, COLLECTION_NAME, existing.id);
        
        // Merge with existing theme
        const updatedTheme = {
            ...existing.theme,
            ...theme,
            globalColors: {
                ...existing.theme?.globalColors,
                ...theme.globalColors,
            },
        };

        await updateDoc(docRef, {
            theme: updatedTheme,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating agency theme:', error);
        throw error;
    }
}

/**
 * Update agency branding
 */
export async function updateAgencyBranding(
    tenantId: string,
    branding: Partial<AgencyLandingConfig['branding']>
): Promise<void> {
    try {
        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            throw new Error('Landing page not found');
        }

        const docRef = doc(db, COLLECTION_NAME, existing.id);
        
        // Merge with existing branding
        const updatedBranding = {
            ...existing.branding,
            ...branding,
        };

        await updateDoc(docRef, {
            branding: updatedBranding,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating agency branding:', error);
        throw error;
    }
}

/**
 * Update agency SEO settings
 */
export async function updateAgencySEO(
    tenantId: string,
    seo: Partial<AgencyLandingConfig['seo']>
): Promise<void> {
    try {
        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            throw new Error('Landing page not found');
        }

        const docRef = doc(db, COLLECTION_NAME, existing.id);
        
        // Merge with existing SEO
        const updatedSEO = {
            ...existing.seo,
            ...seo,
        };

        await updateDoc(docRef, {
            seo: updatedSEO,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating agency SEO:', error);
        throw error;
    }
}

export default {
    getAgencyLanding,
    getAgencyLandingById,
    saveAgencyLanding,
    saveAgencyLandingSections,
    publishAgencyLanding,
    unpublishAgencyLanding,
    deleteAgencyLanding,
    isSubdomainAvailable,
    reserveSubdomain,
    getAgencyLandingBySubdomain,
    getAgencyLandingByCustomDomain,
    updateAgencyTheme,
    updateAgencyBranding,
    updateAgencySEO,
};
