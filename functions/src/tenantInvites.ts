/**
 * Tenant Invitations Cloud Functions
 * Handles invitation creation, acceptance, and email notifications
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

const db = admin.firestore();

// =============================================================================
// TYPES
// =============================================================================

interface TenantPermissions {
    canManageProjects: boolean;
    canManageLeads: boolean;
    canManageCMS: boolean;
    canManageEcommerce: boolean;
    canManageFiles: boolean;
    canManageDomains: boolean;
    canInviteMembers: boolean;
    canRemoveMembers: boolean;
    canViewAnalytics: boolean;
    canManageBilling: boolean;
    canManageSettings: boolean;
    canExportData: boolean;
}

type AgencyRole = 'agency_owner' | 'agency_admin' | 'agency_member' | 'client';

interface CreateInviteData {
    tenantId: string;
    email: string;
    role: AgencyRole;
    customPermissions?: Partial<TenantPermissions>;
    message?: string;
}

interface AcceptInviteData {
    token: string;
}

interface AcceptInviteByIdData {
    inviteId: string;
}

// Default permissions by role
const DEFAULT_PERMISSIONS: Record<AgencyRole, TenantPermissions> = {
    agency_owner: {
        canManageProjects: true,
        canManageLeads: true,
        canManageCMS: true,
        canManageEcommerce: true,
        canManageFiles: true,
        canManageDomains: true,
        canInviteMembers: true,
        canRemoveMembers: true,
        canViewAnalytics: true,
        canManageBilling: true,
        canManageSettings: true,
        canExportData: true,
    },
    agency_admin: {
        canManageProjects: true,
        canManageLeads: true,
        canManageCMS: true,
        canManageEcommerce: true,
        canManageFiles: true,
        canManageDomains: true,
        canInviteMembers: true,
        canRemoveMembers: false,
        canViewAnalytics: true,
        canManageBilling: false,
        canManageSettings: false,
        canExportData: true,
    },
    agency_member: {
        canManageProjects: true,
        canManageLeads: true,
        canManageCMS: true,
        canManageEcommerce: false,
        canManageFiles: true,
        canManageDomains: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canViewAnalytics: true,
        canManageBilling: false,
        canManageSettings: false,
        canExportData: false,
    },
    client: {
        canManageProjects: true,
        canManageLeads: true,
        canManageCMS: true,
        canManageEcommerce: true,
        canManageFiles: true,
        canManageDomains: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canViewAnalytics: true,
        canManageBilling: false,
        canManageSettings: false,
        canExportData: false,
    },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a unique invite token
 */
function generateInviteToken(): string {
    return `${Date.now().toString(36)}-${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Get membership document ID
 */
function getMembershipId(tenantId: string, userId: string): string {
    return `${tenantId}_${userId}`;
}

/**
 * Check if user has permission in tenant
 */
async function hasTenantPermission(
    tenantId: string,
    userId: string,
    permission: keyof TenantPermissions
): Promise<boolean> {
    const membershipId = getMembershipId(tenantId, userId);
    const membershipDoc = await db.collection('tenantMembers').doc(membershipId).get();
    
    if (!membershipDoc.exists) {
        return false;
    }
    
    const membership = membershipDoc.data();
    return membership?.permissions?.[permission] === true;
}

/**
 * Check if user is tenant owner or admin
 */
async function isTenantAdminOrOwner(tenantId: string, userId: string): Promise<boolean> {
    const membershipId = getMembershipId(tenantId, userId);
    const membershipDoc = await db.collection('tenantMembers').doc(membershipId).get();
    
    if (!membershipDoc.exists) {
        return false;
    }
    
    const role = membershipDoc.data()?.role;
    return role === 'agency_owner' || role === 'agency_admin';
}

// =============================================================================
// CREATE TENANT INVITE
// =============================================================================

export const createTenantInvite = functions.https.onCall(
    async (data: CreateInviteData, context) => {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'Usuario no autenticado'
            );
        }

        const { tenantId, email, role, customPermissions, message } = data;

        // Validate required fields
        if (!tenantId || !email || !role) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Faltan campos requeridos: tenantId, email, role'
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Email inválido'
            );
        }

        // Validate role
        const validRoles: AgencyRole[] = ['agency_admin', 'agency_member', 'client'];
        if (!validRoles.includes(role)) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Rol inválido'
            );
        }

        const userId = context.auth.uid;

        // Check if user has permission to invite
        const hasPermission = await hasTenantPermission(tenantId, userId, 'canInviteMembers');
        if (!hasPermission) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'No tienes permiso para invitar miembros a este workspace'
            );
        }

        // Get tenant data for email
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                'Workspace no encontrado'
            );
        }
        const tenantData = tenantDoc.data();

        // Check tenant limits
        const currentUserCount = tenantData?.usage?.userCount || 0;
        const maxUsers = tenantData?.limits?.maxUsers || 1;
        
        // Count pending invites
        const pendingInvites = await db.collection('tenantInvites')
            .where('tenantId', '==', tenantId)
            .where('status', '==', 'pending')
            .get();
        
        if (currentUserCount + pendingInvites.size >= maxUsers) {
            throw new functions.https.HttpsError(
                'resource-exhausted',
                `Has alcanzado el límite de ${maxUsers} usuarios para este workspace`
            );
        }

        // Check if email is already a member
        const existingMembers = await db.collection('tenantMembers')
            .where('tenantId', '==', tenantId)
            .get();
        
        for (const member of existingMembers.docs) {
            if (member.data().userEmail?.toLowerCase() === email.toLowerCase()) {
                throw new functions.https.HttpsError(
                    'already-exists',
                    'Este email ya es miembro del workspace'
                );
            }
        }

        // Check for existing pending invite
        const existingInvites = await db.collection('tenantInvites')
            .where('tenantId', '==', tenantId)
            .where('email', '==', email.toLowerCase())
            .where('status', '==', 'pending')
            .get();

        if (!existingInvites.empty) {
            throw new functions.https.HttpsError(
                'already-exists',
                'Ya existe una invitación pendiente para este email'
            );
        }

        // Get inviter info
        const inviterDoc = await db.collection('users').doc(userId).get();
        const inviterData = inviterDoc.data();

        // Generate token and create invite
        const token = generateInviteToken();
        const expiresAt = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        );

        const inviteData = {
            tenantId,
            email: email.toLowerCase(),
            role,
            customPermissions: customPermissions || null,
            invitedBy: userId,
            invitedByName: inviterData?.name || inviterData?.displayName || '',
            token,
            message: message || null,
            expiresAt,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            tenantName: tenantData?.name || '',
            tenantLogo: tenantData?.branding?.logoUrl || null,
        };

        const inviteRef = await db.collection('tenantInvites').add(inviteData);

        // TODO: Send invite email
        // await sendInviteEmail(email, {
        //     inviteUrl: `${process.env.APP_URL}/invite/${token}`,
        //     inviterName: inviterData?.name || 'Someone',
        //     tenantName: tenantData?.name || 'a workspace',
        //     role: role,
        //     message: message
        // });

        functions.logger.info('Tenant invite created', {
            inviteId: inviteRef.id,
            tenantId,
            email,
            role,
            invitedBy: userId,
        });

        return {
            success: true,
            inviteId: inviteRef.id,
            token,
            expiresAt: expiresAt.toDate().toISOString(),
        };
    }
);

// =============================================================================
// ACCEPT TENANT INVITE BY TOKEN
// =============================================================================

export const acceptTenantInviteByToken = functions.https.onCall(
    async (data: AcceptInviteData, context) => {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'Usuario no autenticado'
            );
        }

        const { token } = data;

        if (!token) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Token requerido'
            );
        }

        const userId = context.auth.uid;
        const userEmail = context.auth.token.email?.toLowerCase();

        // Find invite by token
        const invitesSnapshot = await db.collection('tenantInvites')
            .where('token', '==', token)
            .limit(1)
            .get();

        if (invitesSnapshot.empty) {
            throw new functions.https.HttpsError(
                'not-found',
                'Invitación no encontrada'
            );
        }

        const inviteDoc = invitesSnapshot.docs[0];
        const invite = inviteDoc.data();

        // Validate invite status
        if (invite.status !== 'pending') {
            throw new functions.https.HttpsError(
                'failed-precondition',
                `Invitación ya ${invite.status === 'accepted' ? 'aceptada' : 'cancelada o expirada'}`
            );
        }

        // Check expiration
        const now = admin.firestore.Timestamp.now();
        if (invite.expiresAt && invite.expiresAt.toMillis() < now.toMillis()) {
            // Mark as expired
            await inviteDoc.ref.update({ status: 'expired' });
            throw new functions.https.HttpsError(
                'failed-precondition',
                'La invitación ha expirado'
            );
        }

        // Validate email matches
        if (invite.email !== userEmail) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Esta invitación fue enviada a otro email'
            );
        }

        // Check if already a member
        const membershipId = getMembershipId(invite.tenantId, userId);
        const existingMembership = await db.collection('tenantMembers').doc(membershipId).get();
        
        if (existingMembership.exists) {
            // Mark invite as accepted anyway
            await inviteDoc.ref.update({
                status: 'accepted',
                acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
                acceptedByUserId: userId,
            });
            
            throw new functions.https.HttpsError(
                'already-exists',
                'Ya eres miembro de este workspace'
            );
        }

        // Get tenant to check limits and update usage
        const tenantDoc = await db.collection('tenants').doc(invite.tenantId).get();
        if (!tenantDoc.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                'Workspace no encontrado'
            );
        }
        const tenantData = tenantDoc.data();

        // Get user data
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        // Create membership
        const permissions = invite.customPermissions
            ? { ...DEFAULT_PERMISSIONS[invite.role as AgencyRole], ...invite.customPermissions }
            : DEFAULT_PERMISSIONS[invite.role as AgencyRole];

        const membershipData = {
            tenantId: invite.tenantId,
            userId,
            role: invite.role,
            permissions,
            invitedBy: invite.invitedBy,
            joinedAt: admin.firestore.FieldValue.serverTimestamp(),
            userName: userData?.name || userData?.displayName || '',
            userEmail: userEmail || '',
            userPhotoURL: userData?.photoURL || '',
        };

        // Use batch for atomic operations
        const batch = db.batch();

        // Create membership
        batch.set(db.collection('tenantMembers').doc(membershipId), membershipData);

        // Update invite status
        batch.update(inviteDoc.ref, {
            status: 'accepted',
            acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
            acceptedByUserId: userId,
        });

        // Update tenant user count
        batch.update(db.collection('tenants').doc(invite.tenantId), {
            'usage.userCount': admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update user's additionalTenants if needed
        if (userDoc.exists) {
            const currentTenants = userData?.additionalTenants || [];
            if (!currentTenants.includes(invite.tenantId)) {
                batch.update(db.collection('users').doc(userId), {
                    additionalTenants: admin.firestore.FieldValue.arrayUnion(invite.tenantId),
                });
            }
        }

        await batch.commit();

        functions.logger.info('Tenant invite accepted', {
            inviteId: inviteDoc.id,
            tenantId: invite.tenantId,
            userId,
            role: invite.role,
        });

        return {
            success: true,
            tenantId: invite.tenantId,
            tenantName: tenantData?.name || '',
            role: invite.role,
        };
    }
);

// =============================================================================
// ACCEPT TENANT INVITE BY ID (For already authenticated users)
// =============================================================================

export const acceptTenantInvite = functions.https.onCall(
    async (data: AcceptInviteByIdData, context) => {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'Usuario no autenticado'
            );
        }

        const { inviteId } = data;

        if (!inviteId) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'ID de invitación requerido'
            );
        }

        const userId = context.auth.uid;
        const userEmail = context.auth.token.email?.toLowerCase();

        // Get invite
        const inviteDoc = await db.collection('tenantInvites').doc(inviteId).get();

        if (!inviteDoc.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                'Invitación no encontrada'
            );
        }

        const invite = inviteDoc.data()!;

        // Validate invite status
        if (invite.status !== 'pending') {
            throw new functions.https.HttpsError(
                'failed-precondition',
                `Invitación ya ${invite.status === 'accepted' ? 'aceptada' : 'cancelada o expirada'}`
            );
        }

        // Check expiration
        const now = admin.firestore.Timestamp.now();
        if (invite.expiresAt && invite.expiresAt.toMillis() < now.toMillis()) {
            await inviteDoc.ref.update({ status: 'expired' });
            throw new functions.https.HttpsError(
                'failed-precondition',
                'La invitación ha expirado'
            );
        }

        // Validate email matches
        if (invite.email !== userEmail) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Esta invitación fue enviada a otro email'
            );
        }

        // Check if already a member
        const membershipId = getMembershipId(invite.tenantId, userId);
        const existingMembership = await db.collection('tenantMembers').doc(membershipId).get();
        
        if (existingMembership.exists) {
            await inviteDoc.ref.update({
                status: 'accepted',
                acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
                acceptedByUserId: userId,
            });
            
            throw new functions.https.HttpsError(
                'already-exists',
                'Ya eres miembro de este workspace'
            );
        }

        // Get tenant and user data
        const tenantDoc = await db.collection('tenants').doc(invite.tenantId).get();
        if (!tenantDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Workspace no encontrado');
        }
        const tenantData = tenantDoc.data();

        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        // Create membership
        const permissions = invite.customPermissions
            ? { ...DEFAULT_PERMISSIONS[invite.role as AgencyRole], ...invite.customPermissions }
            : DEFAULT_PERMISSIONS[invite.role as AgencyRole];

        const membershipData = {
            tenantId: invite.tenantId,
            userId,
            role: invite.role,
            permissions,
            invitedBy: invite.invitedBy,
            joinedAt: admin.firestore.FieldValue.serverTimestamp(),
            userName: userData?.name || userData?.displayName || '',
            userEmail: userEmail || '',
            userPhotoURL: userData?.photoURL || '',
        };

        const batch = db.batch();

        batch.set(db.collection('tenantMembers').doc(membershipId), membershipData);

        batch.update(inviteDoc.ref, {
            status: 'accepted',
            acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
            acceptedByUserId: userId,
        });

        batch.update(db.collection('tenants').doc(invite.tenantId), {
            'usage.userCount': admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        if (userDoc.exists) {
            const currentTenants = userData?.additionalTenants || [];
            if (!currentTenants.includes(invite.tenantId)) {
                batch.update(db.collection('users').doc(userId), {
                    additionalTenants: admin.firestore.FieldValue.arrayUnion(invite.tenantId),
                });
            }
        }

        await batch.commit();

        functions.logger.info('Tenant invite accepted by ID', {
            inviteId,
            tenantId: invite.tenantId,
            userId,
            role: invite.role,
        });

        return {
            success: true,
            tenantId: invite.tenantId,
            tenantName: tenantData?.name || '',
            role: invite.role,
        };
    }
);

// =============================================================================
// CANCEL TENANT INVITE
// =============================================================================

export const cancelTenantInvite = functions.https.onCall(
    async (data: { inviteId: string }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
        }

        const { inviteId } = data;
        const userId = context.auth.uid;

        const inviteDoc = await db.collection('tenantInvites').doc(inviteId).get();
        if (!inviteDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Invitación no encontrada');
        }

        const invite = inviteDoc.data()!;

        // Check permission
        const hasPermission = await hasTenantPermission(invite.tenantId, userId, 'canInviteMembers');
        if (!hasPermission) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'No tienes permiso para cancelar esta invitación'
            );
        }

        if (invite.status !== 'pending') {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Solo se pueden cancelar invitaciones pendientes'
            );
        }

        await inviteDoc.ref.update({
            status: 'cancelled',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelledBy: userId,
        });

        functions.logger.info('Tenant invite cancelled', {
            inviteId,
            tenantId: invite.tenantId,
            cancelledBy: userId,
        });

        return { success: true };
    }
);

// =============================================================================
// RESEND TENANT INVITE
// =============================================================================

export const resendTenantInvite = functions.https.onCall(
    async (data: { inviteId: string }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
        }

        const { inviteId } = data;
        const userId = context.auth.uid;

        const inviteDoc = await db.collection('tenantInvites').doc(inviteId).get();
        if (!inviteDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Invitación no encontrada');
        }

        const invite = inviteDoc.data()!;

        // Check permission
        const hasPermission = await hasTenantPermission(invite.tenantId, userId, 'canInviteMembers');
        if (!hasPermission) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'No tienes permiso para reenviar esta invitación'
            );
        }

        // Generate new token and extend expiration
        const newToken = generateInviteToken();
        const newExpiresAt = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        );

        await inviteDoc.ref.update({
            token: newToken,
            expiresAt: newExpiresAt,
            status: 'pending',
            resentAt: admin.firestore.FieldValue.serverTimestamp(),
            resentBy: userId,
        });

        // TODO: Resend invite email
        // await sendInviteEmail(invite.email, { ... });

        functions.logger.info('Tenant invite resent', {
            inviteId,
            tenantId: invite.tenantId,
            email: invite.email,
            resentBy: userId,
        });

        return {
            success: true,
            newToken,
            newExpiresAt: newExpiresAt.toDate().toISOString(),
        };
    }
);

// =============================================================================
// GET INVITE BY TOKEN (Public - for invite acceptance page)
// =============================================================================

export const getInviteByToken = functions.https.onCall(
    async (data: { token: string }) => {
        const { token } = data;

        if (!token) {
            throw new functions.https.HttpsError('invalid-argument', 'Token requerido');
        }

        const invitesSnapshot = await db.collection('tenantInvites')
            .where('token', '==', token)
            .limit(1)
            .get();

        if (invitesSnapshot.empty) {
            throw new functions.https.HttpsError('not-found', 'Invitación no encontrada');
        }

        const inviteDoc = invitesSnapshot.docs[0];
        const invite = inviteDoc.data();

        // Check if expired
        const now = admin.firestore.Timestamp.now();
        const isExpired = invite.expiresAt && invite.expiresAt.toMillis() < now.toMillis();

        // Return public info (no sensitive data)
        return {
            id: inviteDoc.id,
            tenantId: invite.tenantId,
            tenantName: invite.tenantName,
            tenantLogo: invite.tenantLogo,
            email: invite.email,
            role: invite.role,
            invitedByName: invite.invitedByName,
            message: invite.message,
            status: isExpired ? 'expired' : invite.status,
            isExpired,
            expiresAt: invite.expiresAt?.toDate().toISOString(),
        };
    }
);

// =============================================================================
// CLEANUP EXPIRED INVITES (Scheduled)
// =============================================================================

export const cleanupExpiredInvites = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async () => {
        const now = admin.firestore.Timestamp.now();
        
        // Find expired invites that are still pending
        const expiredInvites = await db.collection('tenantInvites')
            .where('status', '==', 'pending')
            .where('expiresAt', '<', now)
            .get();

        const batch = db.batch();
        let count = 0;

        for (const doc of expiredInvites.docs) {
            batch.update(doc.ref, { status: 'expired' });
            count++;
        }

        if (count > 0) {
            await batch.commit();
            functions.logger.info(`Marked ${count} expired invites`);
        }

        return null;
    });


