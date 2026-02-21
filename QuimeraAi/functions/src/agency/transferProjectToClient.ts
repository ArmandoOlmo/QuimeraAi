/**
 * Transfer Project to Client
 * Copies a project from an agency's workspace to a sub-client's tenant
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// ============================================================================
// TYPES
// ============================================================================

interface TransferProjectData {
    projectId: string;
    sourceTenantId: string;        // Agency tenant ID or 'personal' (uses userId path)
    targetClientTenantId: string;  // Sub-client tenant ID
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify the calling user is an agency owner or admin 
 * and has access to the source tenant.
 */
async function verifyAgencyAccess(
    userId: string,
    sourceTenantId: string
): Promise<void> {
    if (!userId) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check membership
    const memberSnapshot = await db.collection('tenantMembers')
        .where('userId', '==', userId)
        .where('tenantId', '==', sourceTenantId)
        .limit(1)
        .get();

    if (memberSnapshot.empty) {
        throw new functions.https.HttpsError('permission-denied', 'User does not have access to the source workspace');
    }

    const membership = memberSnapshot.docs[0].data();
    if (!['agency_owner', 'agency_admin'].includes(membership.role)) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only agency owners and admins can transfer projects'
        );
    }
}

/**
 * Verify the target client is a valid sub-client of the agency
 */
async function verifySubClientRelationship(
    sourceTenantId: string,
    targetClientTenantId: string
): Promise<admin.firestore.DocumentData> {
    const clientDoc = await db.collection('tenants').doc(targetClientTenantId).get();

    if (!clientDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Client tenant not found');
    }

    const clientData = clientDoc.data()!;

    if (clientData.ownerTenantId !== sourceTenantId) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Target tenant is not a sub-client of the source agency'
        );
    }

    return clientData;
}

/**
 * Resolve the Firestore path where the project lives.
 * Personal tenants (tenant_{userId}) use users/{userId}/projects,
 * otherwise tenants/{tenantId}/projects.
 */
function resolveProjectPath(
    userId: string,
    tenantId: string
): string[] {
    const isPersonalTenant = tenantId.startsWith(`tenant_${userId}`);
    if (isPersonalTenant) {
        return ['users', userId, 'projects'];
    }
    return ['tenants', tenantId, 'projects'];
}

// ============================================================================
// MAIN CLOUD FUNCTION
// ============================================================================

export const transferProjectToClient = functions.https.onCall(
    async (data: TransferProjectData, context): Promise<any> => {
        const userId = context.auth?.uid;

        if (!userId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { projectId, sourceTenantId, targetClientTenantId } = data;

        // Validate required fields
        if (!projectId || !sourceTenantId || !targetClientTenantId) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Missing required fields: projectId, sourceTenantId, targetClientTenantId'
            );
        }

        try {
            // 1. Verify agency access
            await verifyAgencyAccess(userId, sourceTenantId);

            // 2. Verify sub-client relationship
            const clientData = await verifySubClientRelationship(sourceTenantId, targetClientTenantId);

            functions.logger.info('Transferring project', {
                projectId,
                sourceTenantId,
                targetClientTenantId,
                userId,
            });

            // 3. Read the source project
            const sourcePathSegments = resolveProjectPath(userId, sourceTenantId);
            const sourceRef = db.collection(sourcePathSegments[0])
                .doc(sourcePathSegments[1]);

            // Navigate the nested collection path
            let projectRef: admin.firestore.DocumentReference;
            if (sourcePathSegments.length === 3) {
                projectRef = sourceRef.collection(sourcePathSegments[2]).doc(projectId);
            } else {
                throw new functions.https.HttpsError('internal', 'Invalid path resolution');
            }

            const projectSnap = await projectRef.get();

            if (!projectSnap.exists) {
                // Try alternate path: if sourceTenantId is personal, try user path directly
                const altRef = db.collection('users').doc(userId).collection('projects').doc(projectId);
                const altSnap = await altRef.get();

                if (!altSnap.exists) {
                    throw new functions.https.HttpsError('not-found', 'Project not found in source workspace');
                }

                // Use the alternate data
                const projectData = altSnap.data()!;
                return await executeTransfer(projectData, projectId, targetClientTenantId, clientData, userId, sourceTenantId);
            }

            const projectData = projectSnap.data()!;
            return await executeTransfer(projectData, projectId, targetClientTenantId, clientData, userId, sourceTenantId);

        } catch (error: any) {
            functions.logger.error('Error transferring project', {
                error: error.message,
                projectId,
                sourceTenantId,
                targetClientTenantId,
            });

            if (error instanceof functions.https.HttpsError) {
                throw error;
            }

            throw new functions.https.HttpsError('internal', `Failed to transfer project: ${error.message}`);
        }
    }
);

/**
 * Execute the actual project transfer (copy to target tenant)
 */
async function executeTransfer(
    projectData: admin.firestore.DocumentData,
    originalProjectId: string,
    targetClientTenantId: string,
    clientData: admin.firestore.DocumentData,
    userId: string,
    sourceTenantId: string
): Promise<any> {
    // 4. Prepare the transferred project data
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Remove source-specific fields and add transfer metadata
    const transferredProject = {
        ...projectData,
        // Update ownership
        userId: clientData.ownerUserId || null,
        // Reset status to Draft for client review
        status: 'Draft',
        // Add transfer metadata
        transferredFrom: {
            agencyTenantId: sourceTenantId,
            originalProjectId,
            transferredAt: new Date().toISOString(),
            transferredBy: userId,
        },
        // Update timestamps
        createdAt: now,
        lastUpdated: new Date().toISOString(),
    };

    // Remove the source ID (Firestore will generate a new one)
    delete (transferredProject as any).id;

    // 5. Write to the target tenant's projects collection
    const targetRef = db.collection('tenants')
        .doc(targetClientTenantId)
        .collection('projects');

    const newProjectRef = await targetRef.add(transferredProject);
    const newProjectId = newProjectRef.id;

    functions.logger.info('Project copied to client tenant', {
        newProjectId,
        targetClientTenantId,
    });

    // 6. Record activity
    try {
        await db.collection('agencyActivity').add({
            agencyTenantId: sourceTenantId,
            type: 'project_transferred',
            clientTenantId: targetClientTenantId,
            clientName: clientData.name || 'Unknown',
            originalProjectId,
            newProjectId,
            projectName: projectData.name || 'Untitled',
            createdBy: userId,
            timestamp: now,
        });
    } catch (activityErr: any) {
        functions.logger.warn('Could not log agency activity (non-critical)', {
            error: activityErr.message,
        });
    }

    // 7. Update client tenant project count
    try {
        await db.collection('tenants').doc(targetClientTenantId).update({
            'usage.projectCount': admin.firestore.FieldValue.increment(1),
            updatedAt: now,
        });
    } catch (usageErr: any) {
        functions.logger.warn('Could not update client usage count (non-critical)', {
            error: usageErr.message,
        });
    }

    functions.logger.info('Project transfer completed', {
        originalProjectId,
        newProjectId,
        targetClientTenantId,
    });

    return {
        success: true,
        newProjectId,
        message: `Proyecto transferido exitosamente al cliente ${clientData.name || ''}`,
    };
}
