/**
 * Project Backups Cloud Functions
 *
 * Scheduled backups of all projects every 6 hours,
 * restore callable function, and cleanup of old backups.
 */
import * as functions from 'firebase-functions';
/**
 * Scheduled function that runs every 6 hours to backup all projects.
 * Iterates users/{userId}/projects/{projectId} and tenants/{tenantId}/projects/{projectId}
 * and writes snapshots to projectBackups/{backupId}.
 */
export declare const backupAllProjects: functions.CloudFunction<unknown>;
/**
 * Callable function to restore a project from a backup.
 * Verifies the caller owns the project before restoring.
 */
export declare const restoreProjectFromBackup: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Daily cleanup function that:
 * 1. Deletes backup documents older than BACKUP_RETENTION_DAYS
 * 2. Hard-deletes projects that have been in trash longer than TRASH_RETENTION_DAYS
 */
export declare const cleanupOldBackups: functions.CloudFunction<unknown>;
