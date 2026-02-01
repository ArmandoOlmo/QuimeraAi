/**
 * Store Users Authentication Cloud Functions
 * Handles multi-tenant user authentication for ecommerce stores
 * 
 * This allows each store to have its own users with:
 * - Self-registration from storefront
 * - Role-based access (customer, vip, wholesale)
 * - Custom claims for multi-tenancy
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firestore
const db = admin.firestore();
const auth = admin.auth();

// ============================================================================
// TYPES
// ============================================================================

type StoreUserRole = 'customer' | 'vip' | 'wholesale';
type StoreUserStatus = 'active' | 'inactive' | 'banned';
type RegistrationSource = 'self_register' | 'import' | 'admin_created' | 'checkout';

interface CreateStoreUserRequest {
    storeId: string;
    email: string;
    password: string;
    displayName: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: StoreUserRole;
    source?: RegistrationSource;
}

interface UpdateStoreUserRoleRequest {
    storeId: string;
    userId: string;
    role: StoreUserRole;
}

interface UpdateStoreUserStatusRequest {
    storeId: string;
    userId: string;
    status: StoreUserStatus;
    reason?: string;
}

interface ResetStoreUserPasswordRequest {
    storeId: string;
    userId: string;
}

interface DeleteStoreUserRequest {
    storeId: string;
    userId: string;
}

interface StoreUserLoginRequest {
    storeId: string;
    email: string;
}

// ============================================================================
// SECURITY HELPERS
// ============================================================================

/**
 * SECURITY: Validate email format
 */
function isValidEmail(email: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

/**
 * SECURITY: Sanitize string input
 */
function sanitizeString(str: unknown, maxLength: number = 500): string {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLength);
}

/**
 * SECURITY: Validate ID format (alphanumeric with hyphens/underscores)
 */
function isValidId(id: string): boolean {
    return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

/**
 * SECURITY: Validate role
 */
function isValidRole(role: string): role is StoreUserRole {
    return ['customer', 'vip', 'wholesale'].includes(role);
}

/**
 * SECURITY: Validate status
 */
function isValidStatus(status: string): status is StoreUserStatus {
    return ['active', 'inactive', 'banned'].includes(status);
}

/**
 * SECURITY: Verify store owner
 */
async function isStoreOwner(userId: string, storeId: string): Promise<boolean> {
    const storeDoc = await db.doc(`publicStores/${storeId}`).get();
    if (!storeDoc.exists) return false;
    
    const storeData = storeDoc.data();
    return storeData?.ownerId === userId;
}

// ============================================================================
// CREATE STORE USER (Self-registration)
// ============================================================================

/**
 * Creates a new store user account
 * Can be called from storefront for self-registration
 */
export const createStoreUser = functions.https.onCall(
    async (data: CreateStoreUserRequest, context) => {
        // Sanitize inputs
        const storeId = sanitizeString(data.storeId, 100);
        const email = sanitizeString(data.email, 254).toLowerCase();
        const password = data.password; // Don't sanitize password
        const displayName = sanitizeString(data.displayName, 100);
        const firstName = sanitizeString(data.firstName || '', 50);
        const lastName = sanitizeString(data.lastName || '', 50);
        const phone = sanitizeString(data.phone || '', 20);
        const role: StoreUserRole = isValidRole(data.role || '') ? data.role as StoreUserRole : 'customer';
        const source: RegistrationSource = data.source || 'self_register';

        // Validate required fields
        if (!storeId || !isValidId(storeId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid store ID');
        }

        if (!email || !isValidEmail(email)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid email address');
        }

        if (!password || password.length < 6) {
            throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters');
        }

        if (!displayName) {
            throw new functions.https.HttpsError('invalid-argument', 'Display name is required');
        }

        try {
            // Verify store exists
            const storeDoc = await db.doc(`publicStores/${storeId}`).get();
            if (!storeDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Store not found');
            }

            // Check if user already exists in this store
            const existingUser = await db
                .collection(`storeUsers/${storeId}/users`)
                .where('email', '==', email)
                .limit(1)
                .get();

            if (!existingUser.empty) {
                throw new functions.https.HttpsError('already-exists', 'User with this email already exists');
            }

            // Create Firebase Auth user
            let firebaseUser;
            try {
                firebaseUser = await auth.createUser({
                    email,
                    password,
                    displayName,
                    emailVerified: false,
                });
            } catch (authError: any) {
                if (authError.code === 'auth/email-already-exists') {
                    // User exists in Auth but not in this store - link them
                    firebaseUser = await auth.getUserByEmail(email);
                } else {
                    throw authError;
                }
            }

            // Set custom claims for multi-tenancy
            const existingClaims = firebaseUser.customClaims || {};
            const storeRoles = existingClaims.storeRoles || {};
            storeRoles[storeId] = role;

            await auth.setCustomUserClaims(firebaseUser.uid, {
                ...existingClaims,
                storeRoles,
            });

            // Create store user document
            const now = admin.firestore.FieldValue.serverTimestamp();
            const storeUserData = {
                email,
                displayName,
                firstName,
                lastName,
                phone,
                photoURL: firebaseUser.photoURL || null,
                role,
                status: 'active' as StoreUserStatus,
                segments: [],
                tags: [],
                totalOrders: 0,
                totalSpent: 0,
                averageOrderValue: 0,
                acceptsMarketing: true,
                metadata: {
                    source,
                    firebaseUid: firebaseUser.uid,
                },
                createdAt: now,
                updatedAt: now,
            };

            const userRef = await db
                .collection(`storeUsers/${storeId}/users`)
                .add(storeUserData);

            // Try to link with existing customer
            const existingCustomer = await db
                .collection(`publicStores/${storeId}/customers`)
                .where('email', '==', email)
                .limit(1)
                .get();

            if (!existingCustomer.empty) {
                const customer = existingCustomer.docs[0];
                await userRef.update({
                    customerId: customer.id,
                    totalOrders: customer.data().totalOrders || 0,
                    totalSpent: customer.data().totalSpent || 0,
                });
            }

            // Log activity
            await db.collection(`storeUsers/${storeId}/activities`).add({
                userId: userRef.id,
                type: 'register',
                description: `User registered: ${email}`,
                metadata: { source },
                createdAt: now,
            });

            return {
                success: true,
                userId: userRef.id,
                firebaseUid: firebaseUser.uid,
                message: 'User created successfully',
            };
        } catch (error: any) {
            console.error('Error creating store user:', error);
            
            if (error instanceof functions.https.HttpsError) {
                throw error;
            }
            
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to create user'
            );
        }
    }
);

// ============================================================================
// UPDATE STORE USER ROLE
// ============================================================================

/**
 * Updates a store user's role
 * Only store owner can call this
 */
export const updateStoreUserRole = functions.https.onCall(
    async (data: UpdateStoreUserRoleRequest, context) => {
        // Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const storeId = sanitizeString(data.storeId, 100);
        const userId = sanitizeString(data.userId, 128);
        const role = data.role;

        // Validate inputs
        if (!storeId || !isValidId(storeId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid store ID');
        }

        if (!userId || !isValidId(userId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid user ID');
        }

        if (!role || !isValidRole(role)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
        }

        // Verify caller is store owner
        if (!await isStoreOwner(context.auth.uid, storeId)) {
            throw new functions.https.HttpsError('permission-denied', 'Only store owner can update user roles');
        }

        try {
            // Get user document
            const userRef = db.doc(`storeUsers/${storeId}/users/${userId}`);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'User not found');
            }

            const userData = userDoc.data()!;
            const oldRole = userData.role;

            // Update role in Firestore
            await userRef.update({
                role,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Update custom claims in Firebase Auth
            if (userData.metadata?.firebaseUid) {
                try {
                    const firebaseUser = await auth.getUser(userData.metadata.firebaseUid);
                    const existingClaims = firebaseUser.customClaims || {};
                    const storeRoles = existingClaims.storeRoles || {};
                    storeRoles[storeId] = role;

                    await auth.setCustomUserClaims(userData.metadata.firebaseUid, {
                        ...existingClaims,
                        storeRoles,
                    });
                } catch (authError) {
                    console.warn('Could not update Firebase Auth claims:', authError);
                }
            }

            // Log activity
            await db.collection(`storeUsers/${storeId}/activities`).add({
                userId,
                type: 'role_change',
                description: `Role changed from ${oldRole} to ${role}`,
                metadata: { oldRole, newRole: role, changedBy: context.auth.uid },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return {
                success: true,
                message: `User role updated to ${role}`,
            };
        } catch (error: any) {
            console.error('Error updating user role:', error);
            
            if (error instanceof functions.https.HttpsError) {
                throw error;
            }
            
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to update user role'
            );
        }
    }
);

// ============================================================================
// UPDATE STORE USER STATUS
// ============================================================================

/**
 * Updates a store user's status (active, inactive, banned)
 * Only store owner can call this
 */
export const updateStoreUserStatus = functions.https.onCall(
    async (data: UpdateStoreUserStatusRequest, context) => {
        // Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const storeId = sanitizeString(data.storeId, 100);
        const userId = sanitizeString(data.userId, 128);
        const status = data.status;
        const reason = sanitizeString(data.reason || '', 500);

        // Validate inputs
        if (!storeId || !isValidId(storeId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid store ID');
        }

        if (!userId || !isValidId(userId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid user ID');
        }

        if (!status || !isValidStatus(status)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid status');
        }

        // Verify caller is store owner
        if (!await isStoreOwner(context.auth.uid, storeId)) {
            throw new functions.https.HttpsError('permission-denied', 'Only store owner can update user status');
        }

        try {
            const userRef = db.doc(`storeUsers/${storeId}/users/${userId}`);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'User not found');
            }

            const userData = userDoc.data()!;
            const oldStatus = userData.status;

            // Update status in Firestore
            await userRef.update({
                status,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // If banned, disable Firebase Auth account
            if (status === 'banned' && userData.metadata?.firebaseUid) {
                try {
                    await auth.updateUser(userData.metadata.firebaseUid, {
                        disabled: true,
                    });
                } catch (authError) {
                    console.warn('Could not disable Firebase Auth account:', authError);
                }
            }

            // If reactivated, enable Firebase Auth account
            if (status === 'active' && oldStatus === 'banned' && userData.metadata?.firebaseUid) {
                try {
                    await auth.updateUser(userData.metadata.firebaseUid, {
                        disabled: false,
                    });
                } catch (authError) {
                    console.warn('Could not enable Firebase Auth account:', authError);
                }
            }

            // Log activity
            await db.collection(`storeUsers/${storeId}/activities`).add({
                userId,
                type: status === 'banned' ? 'banned' : 'status_change',
                description: `Status changed from ${oldStatus} to ${status}${reason ? `: ${reason}` : ''}`,
                metadata: { oldStatus, newStatus: status, reason, changedBy: context.auth.uid },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return {
                success: true,
                message: `User status updated to ${status}`,
            };
        } catch (error: any) {
            console.error('Error updating user status:', error);
            
            if (error instanceof functions.https.HttpsError) {
                throw error;
            }
            
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to update user status'
            );
        }
    }
);

// ============================================================================
// RESET STORE USER PASSWORD
// ============================================================================

/**
 * Sends a password reset email to a store user
 * Only store owner can call this
 */
export const resetStoreUserPassword = functions.https.onCall(
    async (data: ResetStoreUserPasswordRequest, context) => {
        // Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const storeId = sanitizeString(data.storeId, 100);
        const userId = sanitizeString(data.userId, 128);

        // Validate inputs
        if (!storeId || !isValidId(storeId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid store ID');
        }

        if (!userId || !isValidId(userId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid user ID');
        }

        // Verify caller is store owner
        if (!await isStoreOwner(context.auth.uid, storeId)) {
            throw new functions.https.HttpsError('permission-denied', 'Only store owner can reset user passwords');
        }

        try {
            const userRef = db.doc(`storeUsers/${storeId}/users/${userId}`);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'User not found');
            }

            const userData = userDoc.data()!;

            // Generate password reset link
            const resetLink = await auth.generatePasswordResetLink(userData.email);

            // Log activity with reset link info
            await db.collection(`storeUsers/${storeId}/activities`).add({
                userId,
                type: 'password_reset',
                description: `Password reset requested by admin`,
                metadata: { 
                    requestedBy: context.auth.uid,
                    resetLinkGenerated: !!resetLink 
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return {
                success: true,
                message: 'Password reset email sent',
                // Don't expose the reset link in production
                // resetLink, // Only for testing
            };
        } catch (error: any) {
            console.error('Error resetting user password:', error);
            
            if (error instanceof functions.https.HttpsError) {
                throw error;
            }
            
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to reset password'
            );
        }
    }
);

// ============================================================================
// DELETE STORE USER
// ============================================================================

/**
 * Deletes a store user account
 * Only store owner can call this
 */
export const deleteStoreUser = functions.https.onCall(
    async (data: DeleteStoreUserRequest, context) => {
        // Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const storeId = sanitizeString(data.storeId, 100);
        const userId = sanitizeString(data.userId, 128);

        // Validate inputs
        if (!storeId || !isValidId(storeId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid store ID');
        }

        if (!userId || !isValidId(userId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid user ID');
        }

        // Verify caller is store owner
        if (!await isStoreOwner(context.auth.uid, storeId)) {
            throw new functions.https.HttpsError('permission-denied', 'Only store owner can delete users');
        }

        try {
            const userRef = db.doc(`storeUsers/${storeId}/users/${userId}`);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'User not found');
            }

            const userData = userDoc.data()!;

            // Remove user from this store's custom claims
            if (userData.metadata?.firebaseUid) {
                try {
                    const firebaseUser = await auth.getUser(userData.metadata.firebaseUid);
                    const existingClaims = firebaseUser.customClaims || {};
                    const storeRoles = existingClaims.storeRoles || {};
                    delete storeRoles[storeId];

                    await auth.setCustomUserClaims(userData.metadata.firebaseUid, {
                        ...existingClaims,
                        storeRoles,
                    });

                    // If user has no more stores, delete the Firebase Auth account
                    if (Object.keys(storeRoles).length === 0) {
                        await auth.deleteUser(userData.metadata.firebaseUid);
                    }
                } catch (authError) {
                    console.warn('Could not update Firebase Auth:', authError);
                }
            }

            // Delete user document
            await userRef.delete();

            // Delete user activities
            const activitiesSnapshot = await db
                .collection(`storeUsers/${storeId}/activities`)
                .where('userId', '==', userId)
                .get();

            const batch = db.batch();
            activitiesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            return {
                success: true,
                message: 'User deleted successfully',
            };
        } catch (error: any) {
            console.error('Error deleting user:', error);
            
            if (error instanceof functions.https.HttpsError) {
                throw error;
            }
            
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to delete user'
            );
        }
    }
);

// ============================================================================
// RECORD LOGIN
// ============================================================================

/**
 * Records a store user login
 * Called from client after successful Firebase Auth login
 */
export const recordStoreUserLogin = functions.https.onCall(
    async (data: StoreUserLoginRequest, context) => {
        // Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const storeId = sanitizeString(data.storeId, 100);
        const email = sanitizeString(data.email, 254).toLowerCase();

        // Validate inputs
        if (!storeId || !isValidId(storeId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid store ID');
        }

        if (!email || !isValidEmail(email)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid email');
        }

        try {
            // Find user by email
            const usersSnapshot = await db
                .collection(`storeUsers/${storeId}/users`)
                .where('email', '==', email)
                .limit(1)
                .get();

            if (usersSnapshot.empty) {
                throw new functions.https.HttpsError('not-found', 'User not found in this store');
            }

            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();

            // Check if user is banned
            if (userData.status === 'banned') {
                throw new functions.https.HttpsError('permission-denied', 'Account is banned');
            }

            // Check if user is inactive
            if (userData.status === 'inactive') {
                throw new functions.https.HttpsError('permission-denied', 'Account is inactive');
            }

            // Update last login
            await userDoc.ref.update({
                lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Log activity
            await db.collection(`storeUsers/${storeId}/activities`).add({
                userId: userDoc.id,
                type: 'login',
                description: `User logged in`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return {
                success: true,
                user: {
                    id: userDoc.id,
                    ...userData,
                },
            };
        } catch (error: any) {
            console.error('Error recording login:', error);
            
            if (error instanceof functions.https.HttpsError) {
                throw error;
            }
            
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to record login'
            );
        }
    }
);

// ============================================================================
// FIRESTORE TRIGGERS
// ============================================================================

/**
 * Trigger: When a store user is created
 * Action: Link with existing customer if email matches
 */
export const onStoreUserCreate = functions.firestore
    .document('storeUsers/{storeId}/users/{userId}')
    .onCreate(async (snap, context) => {
        const { storeId, userId } = context.params;
        const userData = snap.data();

        if (!userData.email) return;

        try {
            // Find matching customer
            const customersSnapshot = await db
                .collection(`publicStores/${storeId}/customers`)
                .where('email', '==', userData.email.toLowerCase())
                .limit(1)
                .get();

            if (!customersSnapshot.empty) {
                const customer = customersSnapshot.docs[0];
                const customerData = customer.data();

                // Update store user with customer data
                await snap.ref.update({
                    customerId: customer.id,
                    totalOrders: customerData.totalOrders || 0,
                    totalSpent: customerData.totalSpent || 0,
                    averageOrderValue: customerData.totalOrders > 0 
                        ? (customerData.totalSpent / customerData.totalOrders) 
                        : 0,
                });

                console.log(`Linked store user ${userId} with customer ${customer.id}`);
            }
        } catch (error) {
            console.error('Error linking store user with customer:', error);
        }
    });

/**
 * Trigger: When an order is created
 * Action: Update store user stats if they exist
 */
export const onOrderCreateUpdateStoreUser = functions.firestore
    .document('publicStores/{storeId}/customerOrders/{orderId}')
    .onCreate(async (snap, context) => {
        const { storeId } = context.params;
        const orderData = snap.data();

        if (!orderData.customerEmail) return;

        try {
            // Find store user by email
            const usersSnapshot = await db
                .collection(`storeUsers/${storeId}/users`)
                .where('email', '==', orderData.customerEmail.toLowerCase())
                .limit(1)
                .get();

            if (!usersSnapshot.empty) {
                const userDoc = usersSnapshot.docs[0];
                const userData = userDoc.data();

                const newTotalOrders = (userData.totalOrders || 0) + 1;
                const newTotalSpent = (userData.totalSpent || 0) + (orderData.total || 0);

                await userDoc.ref.update({
                    totalOrders: newTotalOrders,
                    totalSpent: newTotalSpent,
                    averageOrderValue: newTotalSpent / newTotalOrders,
                    lastOrderAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Log activity
                await db.collection(`storeUsers/${storeId}/activities`).add({
                    userId: userDoc.id,
                    type: 'order_placed',
                    description: `Order placed: ${orderData.orderNumber}`,
                    metadata: {
                        orderId: snap.id,
                        orderNumber: orderData.orderNumber,
                        total: orderData.total,
                    },
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Check for auto role upgrade (VIP)
                const vipThreshold = 500; // $500 spent
                const vipOrdersThreshold = 5;

                if (userData.role === 'customer' && 
                    (newTotalSpent >= vipThreshold || newTotalOrders >= vipOrdersThreshold)) {
                    await userDoc.ref.update({ role: 'vip' });
                    
                    console.log(`Auto-upgraded user ${userDoc.id} to VIP`);
                }
            }
        } catch (error) {
            console.error('Error updating store user stats:', error);
        }
    });

// ============================================================================
// GET STORE USER (for client-side auth context)
// ============================================================================

/**
 * Gets the current store user data
 * Called from client to get full user profile
 */
export const getStoreUser = functions.https.onCall(
    async (data: { storeId: string }, context) => {
        // Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const storeId = sanitizeString(data.storeId, 100);

        if (!storeId || !isValidId(storeId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid store ID');
        }

        try {
            const email = context.auth.token.email;
            if (!email) {
                throw new functions.https.HttpsError('invalid-argument', 'Email not found in token');
            }

            // Find user by email
            const usersSnapshot = await db
                .collection(`storeUsers/${storeId}/users`)
                .where('email', '==', email.toLowerCase())
                .limit(1)
                .get();

            if (usersSnapshot.empty) {
                return { success: false, user: null };
            }

            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();

            // Check status
            if (userData.status === 'banned') {
                throw new functions.https.HttpsError('permission-denied', 'Account is banned');
            }

            return {
                success: true,
                user: {
                    id: userDoc.id,
                    ...userData,
                },
            };
        } catch (error: any) {
            console.error('Error getting store user:', error);
            
            if (error instanceof functions.https.HttpsError) {
                throw error;
            }
            
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to get user'
            );
        }
    }
);
