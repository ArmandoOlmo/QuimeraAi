/**
 * Subdomain Service
 * 
 * Client-side utilities for managing subdomains:
 * - Username validation (format, reserved words, uniqueness)
 * - Claiming/releasing subdomains in Firestore
 * - Subdomain status queries
 */

import { 
    doc, getDoc, setDoc, deleteDoc, updateDoc, 
    collection, query, where, getDocs, limit, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Reserved subdomains that cannot be claimed by users */
export const RESERVED_SUBDOMAINS = [
    'app', 'www', 'api', 'admin', 'mail', 'ftp',
    'staging', 'dev', 'test', 'beta', 'preview',
    'store', 'blog', 'help', 'support', 'status',
    'cdn', 'assets', 'static', 'media', 'docs', 'dashboard',
    'login', 'signup', 'register', 'auth', 'oauth',
    'billing', 'payment', 'checkout', 'cart',
    'quimera', 'quimeraai', 'saborea',
    'about', 'contact', 'pricing', 'features', 'terms', 'privacy',
];

/** Username format rules */
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

// =============================================================================
// TYPES
// =============================================================================

export interface SubdomainRecord {
    userId: string;
    projectId: string | null;
    type: 'user' | 'agency' | 'tenant';
    status: 'active' | 'reserved' | 'suspended';
    createdAt: any;
    updatedAt?: any;
    displayName?: string;
}

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate username format (synchronous, no Firestore calls)
 */
export function validateUsernameFormat(username: string): ValidationResult {
    if (!username || username.trim().length === 0) {
        return { valid: false, error: 'El nombre de usuario es requerido' };
    }

    const normalized = username.toLowerCase().trim();

    if (normalized.length < USERNAME_MIN_LENGTH) {
        return { valid: false, error: `Mínimo ${USERNAME_MIN_LENGTH} caracteres` };
    }

    if (normalized.length > USERNAME_MAX_LENGTH) {
        return { valid: false, error: `Máximo ${USERNAME_MAX_LENGTH} caracteres` };
    }

    if (!USERNAME_REGEX.test(normalized)) {
        return { valid: false, error: 'Solo letras minúsculas, números y guiones. No puede empezar/terminar con guión.' };
    }

    if (normalized.includes('--')) {
        return { valid: false, error: 'No puede tener guiones consecutivos' };
    }

    if (RESERVED_SUBDOMAINS.includes(normalized)) {
        return { valid: false, error: 'Este nombre está reservado' };
    }

    return { valid: true };
}

/**
 * Check if a username is available (async - checks Firestore)
 */
export async function isUsernameAvailable(username: string, currentUserId?: string): Promise<boolean> {
    const normalized = username.toLowerCase().trim();
    
    // First check format
    const formatCheck = validateUsernameFormat(normalized);
    if (!formatCheck.valid) return false;

    try {
        // Check /subdomains collection
        const subdomainRef = doc(db, 'subdomains', normalized);
        const subdomainSnap = await getDoc(subdomainRef);
        
        if (subdomainSnap.exists()) {
            const data = subdomainSnap.data();
            // Available if it belongs to the current user (they're re-checking their own)
            return data.userId === currentUserId;
        }

        return true;
    } catch (error) {
        console.error('[SubdomainService] Error checking availability:', error);
        return false;
    }
}

/**
 * Full validation: format + availability
 */
export async function validateUsername(
    username: string, 
    currentUserId?: string
): Promise<ValidationResult> {
    const normalized = username.toLowerCase().trim();
    
    // Format check
    const formatResult = validateUsernameFormat(normalized);
    if (!formatResult.valid) return formatResult;

    // Availability check
    const available = await isUsernameAvailable(normalized, currentUserId);
    if (!available) {
        return { valid: false, error: 'Este nombre de usuario ya está en uso' };
    }

    return { valid: true };
}

// =============================================================================
// FIRESTORE OPERATIONS
// =============================================================================

/**
 * Claim a subdomain for a user
 * Creates entry in /subdomains and updates user document
 */
export async function claimSubdomain(
    username: string,
    userId: string,
    projectId: string | null = null,
    type: 'user' | 'agency' | 'tenant' = 'user'
): Promise<{ success: boolean; error?: string }> {
    const normalized = username.toLowerCase().trim();

    // Validate
    const validation = await validateUsername(normalized, userId);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    try {
        // Release any existing subdomain for this user first
        await releaseSubdomainForUser(userId);

        // Create subdomain record
        const subdomainRef = doc(db, 'subdomains', normalized);
        await setDoc(subdomainRef, {
            userId,
            projectId,
            type,
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        } satisfies Omit<SubdomainRecord, 'displayName'>);

        // Update user document
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            username: normalized,
            ...(projectId ? { defaultProjectId: projectId } : {}),
        });

        console.log(`[SubdomainService] Claimed '${normalized}' for user ${userId}`);
        return { success: true };
    } catch (error: any) {
        console.error('[SubdomainService] Error claiming subdomain:', error);
        return { success: false, error: error.message || 'Error al reclamar subdominio' };
    }
}

/**
 * Update which project is shown on a user's subdomain
 */
export async function updateSubdomainProject(
    username: string,
    userId: string,
    projectId: string
): Promise<{ success: boolean; error?: string }> {
    const normalized = username.toLowerCase().trim();

    try {
        const subdomainRef = doc(db, 'subdomains', normalized);
        await updateDoc(subdomainRef, {
            projectId,
            updatedAt: serverTimestamp(),
        });

        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { defaultProjectId: projectId });

        return { success: true };
    } catch (error: any) {
        console.error('[SubdomainService] Error updating project:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Release all subdomains owned by a user
 */
export async function releaseSubdomainForUser(userId: string): Promise<void> {
    try {
        const subdomainsRef = collection(db, 'subdomains');
        const q = query(subdomainsRef, where('userId', '==', userId), limit(5));
        const snap = await getDocs(q);

        for (const docSnap of snap.docs) {
            await deleteDoc(docSnap.ref);
        }
    } catch (error) {
        console.error('[SubdomainService] Error releasing subdomains:', error);
    }
}

/**
 * Get subdomain record for a username
 */
export async function getSubdomainRecord(username: string): Promise<SubdomainRecord | null> {
    try {
        const ref = doc(db, 'subdomains', username.toLowerCase().trim());
        const snap = await getDoc(ref);
        return snap.exists() ? (snap.data() as SubdomainRecord) : null;
    } catch (error) {
        console.error('[SubdomainService] Error getting record:', error);
        return null;
    }
}

/**
 * Get the subdomain claimed by a specific user
 */
export async function getUserSubdomain(userId: string): Promise<string | null> {
    try {
        const subdomainsRef = collection(db, 'subdomains');
        const q = query(
            subdomainsRef, 
            where('userId', '==', userId), 
            where('type', '==', 'user'),
            limit(1)
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            return snap.docs[0].id; // The document ID is the subdomain name
        }
        return null;
    } catch (error) {
        console.error('[SubdomainService] Error getting user subdomain:', error);
        return null;
    }
}
