/**
 * User Role Claims - Sync roles to Firebase Auth Custom Claims
 * 
 * This module syncs user roles from Firestore to Firebase Auth Custom Claims.
 * This is necessary for Storage Rules to verify user roles.
 * 
 * Custom Claims structure:
 * {
 *   role: 'owner' | 'superadmin' | 'admin' | 'manager' | 'user',
 *   tenantId?: string,
 *   // ... other claims
 * }
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

// Valid roles that can be set
const VALID_ROLES = ['owner', 'superadmin', 'admin', 'manager', 'user'];

/**
 * Sync user role to Firebase Auth Custom Claims
 * Triggered when a user document is created or updated
 */
export const onUserRoleChange = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        const userId = context.params.userId;
        
        // Get the new data (if document was deleted, this will be null)
        const newData = change.after.exists ? change.after.data() : null;
        const oldData = change.before.exists ? change.before.data() : null;
        
        // If document was deleted, remove custom claims
        if (!newData) {
            try {
                await auth.setCustomUserClaims(userId, {});
                console.log(`[UserRoleClaims] Cleared claims for deleted user: ${userId}`);
            } catch (error) {
                console.warn(`[UserRoleClaims] Could not clear claims for user ${userId}:`, error);
            }
            return;
        }
        
        // Check if role changed
        const newRole = newData.role || 'user';
        const oldRole = oldData?.role || 'user';
        
        // Only update claims if role changed or this is a new user
        if (newRole === oldRole && oldData) {
            return;
        }
        
        // Validate role
        if (!VALID_ROLES.includes(newRole)) {
            console.warn(`[UserRoleClaims] Invalid role "${newRole}" for user ${userId}, defaulting to "user"`);
        }
        
        const validatedRole = VALID_ROLES.includes(newRole) ? newRole : 'user';
        
        try {
            // Get existing claims
            const userRecord = await auth.getUser(userId);
            const existingClaims = userRecord.customClaims || {};
            
            // Update claims with new role
            const newClaims = {
                ...existingClaims,
                role: validatedRole,
                // Include tenantId if present in user data
                ...(newData.tenantId && { tenantId: newData.tenantId }),
            };
            
            await auth.setCustomUserClaims(userId, newClaims);
            
            console.log(`[UserRoleClaims] Updated claims for user ${userId}: role=${validatedRole}`);
            
            // Update the user document to indicate claims were synced
            await db.collection('users').doc(userId).update({
                _claimsSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
        } catch (error: any) {
            console.error(`[UserRoleClaims] Error updating claims for user ${userId}:`, error);
            
            // If user doesn't exist in Auth, log but don't fail
            if (error.code === 'auth/user-not-found') {
                console.warn(`[UserRoleClaims] User ${userId} not found in Firebase Auth`);
            }
        }
    });

/**
 * Callable function to manually sync a user's role to custom claims
 * Useful for fixing inconsistencies or migrating existing users
 */
export const syncUserRoleClaims = functions.https.onCall(async (data, context) => {
    // Require authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated'
        );
    }
    
    // Check if caller is admin or syncing their own claims
    const callerUid = context.auth.uid;
    const targetUid = data.userId || callerUid;
    
    // If syncing another user's claims, verify caller is admin
    if (targetUid !== callerUid) {
        const callerDoc = await db.collection('users').doc(callerUid).get();
        const callerRole = callerDoc.data()?.role;
        
        if (!['owner', 'superadmin'].includes(callerRole)) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Only admins can sync other users\' claims'
            );
        }
    }
    
    try {
        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(targetUid).get();
        
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }
        
        const userData = userDoc.data()!;
        const role = userData.role || 'user';
        
        // Validate role
        const validatedRole = VALID_ROLES.includes(role) ? role : 'user';
        
        // Get existing claims
        const userRecord = await auth.getUser(targetUid);
        const existingClaims = userRecord.customClaims || {};
        
        // Update claims
        const newClaims = {
            ...existingClaims,
            role: validatedRole,
            ...(userData.tenantId && { tenantId: userData.tenantId }),
        };
        
        await auth.setCustomUserClaims(targetUid, newClaims);
        
        // Update sync timestamp
        await db.collection('users').doc(targetUid).update({
            _claimsSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        console.log(`[syncUserRoleClaims] Synced claims for user ${targetUid}: role=${validatedRole}`);
        
        return { 
            success: true, 
            userId: targetUid, 
            role: validatedRole,
            message: `Claims synced successfully. User may need to re-authenticate to see changes.`
        };
        
    } catch (error: any) {
        console.error(`[syncUserRoleClaims] Error:`, error);
        
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError('not-found', 'User not found in Firebase Auth');
        }
        
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Batch sync all users' roles to custom claims
 * Admin-only function for migration or fixing inconsistencies
 */
export const batchSyncAllUserClaims = functions.https.onCall(async (data, context) => {
    // Require authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated'
        );
    }
    
    // Only owner or superadmin can batch sync
    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    const callerRole = callerDoc.data()?.role;
    
    if (!['owner', 'superadmin'].includes(callerRole)) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only owner or superadmin can batch sync claims'
        );
    }
    
    try {
        const usersSnapshot = await db.collection('users').get();
        
        let synced = 0;
        let errors = 0;
        const errorDetails: string[] = [];
        
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            const role = userData.role || 'user';
            const validatedRole = VALID_ROLES.includes(role) ? role : 'user';
            
            try {
                const userRecord = await auth.getUser(userId);
                const existingClaims = userRecord.customClaims || {};
                
                await auth.setCustomUserClaims(userId, {
                    ...existingClaims,
                    role: validatedRole,
                    ...(userData.tenantId && { tenantId: userData.tenantId }),
                });
                
                await db.collection('users').doc(userId).update({
                    _claimsSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                
                synced++;
            } catch (error: any) {
                errors++;
                errorDetails.push(`${userId}: ${error.message}`);
            }
        }
        
        console.log(`[batchSyncAllUserClaims] Synced ${synced} users, ${errors} errors`);
        
        return {
            success: true,
            synced,
            errors,
            errorDetails: errorDetails.slice(0, 10), // Return first 10 errors
        };
        
    } catch (error: any) {
        console.error('[batchSyncAllUserClaims] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});



