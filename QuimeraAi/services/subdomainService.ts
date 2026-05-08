/**
 * Subdomain Service
 * 
 * Client-side utilities for managing subdomains:
 * - Username validation (format, reserved words, uniqueness)
 * - Claiming/releasing subdomains in Supabase
 * - Subdomain status queries
 */

import { supabase } from '../supabase';

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
    slug?: string;
}

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate username format (synchronous, no database calls)
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
 * Check if a username is available (async - checks Supabase)
 */
export async function isUsernameAvailable(username: string, currentUserId?: string): Promise<boolean> {
    const normalized = username.toLowerCase().trim();
    
    // First check format
    const formatCheck = validateUsernameFormat(normalized);
    if (!formatCheck.valid) return false;

    try {
        const { data, error } = await supabase
            .from('tenants')
            .select('owner_user_id')
            .eq('slug', normalized)
            .maybeSingle();
            
        if (error) {
            console.error('[SubdomainService] Error checking availability:', error);
            return false;
        }
        
        if (data) {
            // Available if it belongs to the current user (they're re-checking their own)
            return data.owner_user_id === currentUserId;
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
// SUPABASE OPERATIONS
// =============================================================================

/**
 * Claim a subdomain for a user
 * Updates the user's primary tenant with the new slug
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
        // Find the user's primary tenant
        const { data: tenants, error: fetchError } = await supabase
            .from('tenants')
            .select('id')
            .eq('owner_user_id', userId)
            .limit(1);

        if (fetchError) throw fetchError;

        if (tenants && tenants.length > 0) {
            // Update existing tenant's slug
            const { error: updateError } = await supabase
                .from('tenants')
                .update({ 
                    slug: normalized,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tenants[0].id);
                
            if (updateError) throw updateError;
        } else {
            // User doesn't have a tenant yet, shouldn't happen with normal flow,
            // but just in case, we could create one or return an error.
            console.error('[SubdomainService] User does not have a tenant to attach slug to.');
            return { success: false, error: 'Usuario no tiene un workspace válido.' };
        }

        console.log(`[SubdomainService] Claimed '${normalized}' for user ${userId}`);
        return { success: true };
    } catch (error: any) {
        console.error('[SubdomainService] Error claiming subdomain:', error);
        return { success: false, error: error.message || 'Error al reclamar subdominio' };
    }
}

/**
 * Update which project is shown on a user's subdomain
 * (In the Supabase model, this might not be needed directly on the tenant if projects are separate,
 * but keeping signature for backwards compatibility if needed, or we might need to update a 'default_project' field on tenant)
 */
export async function updateSubdomainProject(
    username: string,
    userId: string,
    projectId: string
): Promise<{ success: boolean; error?: string }> {
    const normalized = username.toLowerCase().trim();

    try {
        // Update user's preferences to set default project
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('preferences')
            .eq('id', userId)
            .single();

        if (userError && userError.code !== 'PGRST116') throw userError;

        const currentPrefs = user?.preferences || {};
        const updatedPrefs = { ...currentPrefs, defaultProjectId: projectId };

        const { error: updateError } = await supabase
            .from('users')
            .update({ preferences: updatedPrefs })
            .eq('id', userId);

        if (updateError) throw updateError;

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
        // In the new model, releasing a subdomain just means generating a random slug or appending a timestamp
        const { data: tenants, error: fetchError } = await supabase
            .from('tenants')
            .select('id, slug')
            .eq('owner_user_id', userId);

        if (fetchError) throw fetchError;

        for (const tenant of tenants || []) {
            const tempSlug = `released-${tenant.id.substring(0, 8)}-${Date.now()}`;
            await supabase
                .from('tenants')
                .update({ slug: tempSlug })
                .eq('id', tenant.id);
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
        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('slug', username.toLowerCase().trim())
            .maybeSingle();

        if (error || !data) return null;

        return {
            userId: data.owner_user_id,
            projectId: null, // Note: We don't store default projectId on tenant anymore, it's on user preferences or inferred
            type: data.type === 'agency_client' ? 'agency' : 'user',
            status: data.status as any,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            displayName: data.name,
            slug: data.slug
        };
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
        const { data, error } = await supabase
            .from('tenants')
            .select('slug')
            .eq('owner_user_id', userId)
            .limit(1);
            
        if (error || !data || data.length === 0) return null;
        
        return data[0].slug;
    } catch (error) {
        console.error('[SubdomainService] Error getting user subdomain:', error);
        return null;
    }
}
