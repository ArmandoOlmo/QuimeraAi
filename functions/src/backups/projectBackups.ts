/**
 * Project Backups Cloud Functions
 * 
 * Scheduled backups of all projects every 6 hours,
 * restore callable function, and cleanup of old backups.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const db = admin.firestore();

// Configuration
const BACKUP_RETENTION_DAYS = 30;
const TRASH_RETENTION_DAYS = 30;
const BACKUP_BATCH_SIZE = 500; // Firestore batch limit

/**
 * Scheduled function that runs every 6 hours to backup all projects.
 * Iterates users/*/projects/* and tenants/*/projects/*
 * and writes snapshots to projectBackups/{backupId}.
 */
export const backupAllProjects = functions.pubsub
    .schedule('0 */6 * * *')
    .timeZone('America/Puerto_Rico')
    .onRun(async () => {
        console.log('🔄 Starting scheduled project backup...');

        let backedUp = 0;
        let errors = 0;

        try {
            // 1. Backup user projects: users/{userId}/projects/{projectId}
            const usersSnapshot = await db.collection('users').get();
            console.log(`Found ${usersSnapshot.size} users to scan for projects`);

            for (const userDoc of usersSnapshot.docs) {
                try {
                    const projectsSnapshot = await db
                        .collection('users', userDoc.id, 'projects')
                        .get();

                    for (const projectDoc of projectsSnapshot.docs) {
                        try {
                            const projectData = projectDoc.data();

                            // Skip projects already in trash (they have deletedAt)
                            if (projectData.deletedAt) continue;

                            // Skip templates (they're backed up separately via the templates collection)
                            if (projectData.status === 'Template') continue;

                            const backupId = `auto__${userDoc.id}__${projectDoc.id}__${Date.now()}`;

                            await db.collection('projectBackups').doc(backupId).set({
                                ownerId: userDoc.id,
                                ownerType: 'user',
                                projectId: projectDoc.id,
                                projectName: projectData.name || 'Unnamed',
                                projectData: projectData,
                                backupType: 'auto',
                                createdAt: Timestamp.now(),
                            });

                            backedUp++;
                        } catch (err) {
                            console.error(`Error backing up project ${projectDoc.id} for user ${userDoc.id}:`, err);
                            errors++;
                        }
                    }
                } catch (err) {
                    console.error(`Error reading projects for user ${userDoc.id}:`, err);
                    errors++;
                }
            }

            // 2. Backup tenant projects: tenants/{tenantId}/projects/{projectId}
            const tenantsSnapshot = await db.collection('tenants').get();
            console.log(`Found ${tenantsSnapshot.size} tenants to scan for projects`);

            for (const tenantDoc of tenantsSnapshot.docs) {
                try {
                    const projectsSnapshot = await db
                        .collection('tenants', tenantDoc.id, 'projects')
                        .get();

                    for (const projectDoc of projectsSnapshot.docs) {
                        try {
                            const projectData = projectDoc.data();

                            if (projectData.deletedAt) continue;
                            if (projectData.status === 'Template') continue;

                            const backupId = `auto__${tenantDoc.id}__${projectDoc.id}__${Date.now()}`;

                            await db.collection('projectBackups').doc(backupId).set({
                                ownerId: tenantDoc.id,
                                ownerType: 'tenant',
                                projectId: projectDoc.id,
                                projectName: projectData.name || 'Unnamed',
                                projectData: projectData,
                                backupType: 'auto',
                                createdAt: Timestamp.now(),
                            });

                            backedUp++;
                        } catch (err) {
                            console.error(`Error backing up tenant project ${projectDoc.id}:`, err);
                            errors++;
                        }
                    }
                } catch (err) {
                    console.error(`Error reading projects for tenant ${tenantDoc.id}:`, err);
                    errors++;
                }
            }

            console.log(`✅ Project backup completed: ${backedUp} backed up, ${errors} errors`);
            return null;
        } catch (error) {
            console.error('❌ Fatal error in backupAllProjects:', error);
            throw error;
        }
    });

/**
 * Callable function to restore a project from a backup.
 * Verifies the caller owns the project before restoring.
 */
export const restoreProjectFromBackup = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { backupId } = data;
    if (!backupId || typeof backupId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'backupId is required');
    }

    try {
        // Read the backup document
        const backupDoc = await db.collection('projectBackups').doc(backupId).get();
        if (!backupDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Backup not found');
        }

        const backup = backupDoc.data()!;
        const userId = context.auth.uid;

        // Verify ownership
        const isOwner = backup.ownerId === userId;
        const isUserOwner = backup.ownerType === 'user' && backup.ownerId === userId;

        // Check if user is a tenant member (for tenant projects)
        let isTenantMember = false;
        if (backup.ownerType === 'tenant') {
            const membershipDoc = await db
                .collection('tenantMembers')
                .doc(`${backup.ownerId}_${userId}`)
                .get();
            isTenantMember = membershipDoc.exists;
        }

        // Check if user is superadmin
        const userDoc = await db.collection('users').doc(userId).get();
        const isSuperAdmin = userDoc.exists && ['SuperAdmin', 'superadmin', 'Owner', 'owner'].includes(
            userDoc.data()?.role || ''
        );

        if (!isOwner && !isUserOwner && !isTenantMember && !isSuperAdmin) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to restore this backup');
        }

        // Determine the target path
        let targetPath: string;
        if (backup.ownerType === 'tenant') {
            targetPath = `tenants/${backup.ownerId}/projects`;
        } else {
            targetPath = `users/${backup.ownerId}/projects`;
        }

        // Restore the project data
        const projectData = backup.projectData;

        // Remove any deletedAt/deletedBy flags if present
        delete projectData.deletedAt;
        delete projectData.deletedBy;

        // Update the lastUpdated timestamp
        projectData.lastUpdated = new Date().toISOString();

        // Write the project back
        await db.collection(targetPath).doc(backup.projectId).set(projectData, { merge: false });

        console.log(`✅ Project ${backup.projectId} restored from backup ${backupId} by user ${userId}`);

        return {
            success: true,
            projectId: backup.projectId,
            projectName: backup.projectName,
            message: `Project "${backup.projectName}" restored successfully from backup`,
        };
    } catch (error: any) {
        console.error('Error restoring from backup:', error);

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError('internal', 'Failed to restore project from backup');
    }
});

/**
 * Daily cleanup function that:
 * 1. Deletes backup documents older than BACKUP_RETENTION_DAYS
 * 2. Hard-deletes projects that have been in trash longer than TRASH_RETENTION_DAYS
 */
export const cleanupOldBackups = functions.pubsub
    .schedule('0 3 * * *')
    .timeZone('America/Puerto_Rico')
    .onRun(async () => {
        console.log('🧹 Starting backup and trash cleanup...');

        let backupsDeleted = 0;
        let projectsPurged = 0;

        try {
            // 1. Delete old backups
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - BACKUP_RETENTION_DAYS);
            const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

            const oldBackups = await db
                .collection('projectBackups')
                .where('createdAt', '<', cutoffTimestamp)
                .limit(BACKUP_BATCH_SIZE)
                .get();

            if (!oldBackups.empty) {
                const batch = db.batch();
                for (const doc of oldBackups.docs) {
                    batch.delete(doc.ref);
                    backupsDeleted++;
                }
                await batch.commit();
            }

            // 2. Purge trashed projects older than TRASH_RETENTION_DAYS
            const trashCutoff = new Date();
            trashCutoff.setDate(trashCutoff.getDate() - TRASH_RETENTION_DAYS);
            const trashCutoffISO = trashCutoff.toISOString();

            // Scan user projects
            const usersSnapshot = await db.collection('users').get();
            for (const userDoc of usersSnapshot.docs) {
                try {
                    const trashedProjects = await db
                        .collection('users', userDoc.id, 'projects')
                        .where('deletedAt', '<', trashCutoffISO)
                        .get();

                    for (const projectDoc of trashedProjects.docs) {
                        try {
                            // Delete subcollections first
                            await deleteSubcollections(projectDoc.ref);
                            // Delete the project document
                            await projectDoc.ref.delete();
                            projectsPurged++;
                            console.log(`🗑️ Purged trashed project: ${projectDoc.id} (user: ${userDoc.id})`);
                        } catch (err) {
                            console.error(`Error purging project ${projectDoc.id}:`, err);
                        }
                    }
                } catch (err) {
                    // Silently skip if collection doesn't exist
                }
            }

            // Scan tenant projects
            const tenantsSnapshot = await db.collection('tenants').get();
            for (const tenantDoc of tenantsSnapshot.docs) {
                try {
                    const trashedProjects = await db
                        .collection('tenants', tenantDoc.id, 'projects')
                        .where('deletedAt', '<', trashCutoffISO)
                        .get();

                    for (const projectDoc of trashedProjects.docs) {
                        try {
                            await deleteSubcollections(projectDoc.ref);
                            await projectDoc.ref.delete();
                            projectsPurged++;
                            console.log(`🗑️ Purged trashed tenant project: ${projectDoc.id}`);
                        } catch (err) {
                            console.error(`Error purging tenant project ${projectDoc.id}:`, err);
                        }
                    }
                } catch (err) {
                    // Silently skip
                }
            }

            console.log(`✅ Cleanup completed: ${backupsDeleted} old backups removed, ${projectsPurged} trashed projects purged`);
            return null;
        } catch (error) {
            console.error('❌ Fatal error in cleanupOldBackups:', error);
            throw error;
        }
    });

/**
 * Helper to delete all subcollections of a document.
 * Handles known project subcollections.
 */
async function deleteSubcollections(
    docRef: admin.firestore.DocumentReference
): Promise<void> {
    const knownSubcollections = [
        'leads', 'leadActivities', 'leadTasks', 'libraryLeads',
        'files', 'appointments', 'deploymentLogs', 'posts',
        'emailCampaigns', 'emailAudiences', 'finance', 'settings'
    ];

    for (const subcol of knownSubcollections) {
        try {
            const snapshot = await docRef.collection(subcol).limit(500).get();
            if (!snapshot.empty) {
                const batch = db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        } catch (err) {
            // Subcollection may not exist, skip silently
        }
    }
}
