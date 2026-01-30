/**
 * Platform Admin Utilities
 * Helpers for checking Owner and Super Admin permissions at platform level
 */

import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Check if a user is a platform Owner or Super Admin of Quimera.ai
 * These users have unrestricted access to all features
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
    if (!userId) return false;

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) return false;

        const role = userDoc.data()?.role?.toLowerCase();
        return role === 'owner' || role === 'superadmin';
    } catch (error) {
        console.error('Error checking platform admin status:', error);
        return false;
    }
}

/**
 * Get platform admin info for a user
 * Returns role and tenant access info
 */
export async function getPlatformAdminInfo(userId: string): Promise<{
    isAdmin: boolean;
    role: string | null;
    canAccessAllTenants: boolean;
}> {
    if (!userId) {
        return { isAdmin: false, role: null, canAccessAllTenants: false };
    }

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            return { isAdmin: false, role: null, canAccessAllTenants: false };
        }

        const role = userDoc.data()?.role?.toLowerCase() || null;
        const isAdmin = role === 'owner' || role === 'superadmin';

        return {
            isAdmin,
            role,
            canAccessAllTenants: isAdmin, // Owners and SuperAdmins can access all tenants
        };
    } catch (error) {
        console.error('Error getting platform admin info:', error);
        return { isAdmin: false, role: null, canAccessAllTenants: false };
    }
}
