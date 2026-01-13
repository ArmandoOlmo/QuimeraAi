/**
 * Scheduled Reports
 * Automatically generate and send reports on schedule
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// ============================================================================
// SCHEDULED FUNCTIONS
// ============================================================================

/**
 * Send monthly reports (runs on 1st of each month at 9am)
 */
export const sendMonthlyReports = functions.pubsub
  .schedule('0 9 1 * *')
  .timeZone('America/Mexico_City')
  .onRun(async (context) => {
    functions.logger.info('Starting monthly reports generation');

    try {
      // Get all agencies with auto-reports enabled
      const agenciesSnapshot = await db.collection('tenants')
        .where('subscriptionPlan', 'in', ['agency', 'agency_plus', 'enterprise'])
        .where('settings.autoReports.enabled', '==', true)
        .where('settings.autoReports.frequency', '==', 'monthly')
        .get();

      functions.logger.info(`Found ${agenciesSnapshot.size} agencies with monthly reports enabled`);

      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      previousMonth.setDate(1);
      previousMonth.setHours(0, 0, 0, 0);

      const startDate = previousMonth;
      const endDate = new Date(previousMonth);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);  // Last day of previous month
      endDate.setHours(23, 59, 59, 999);

      // Process each agency
      for (const agencyDoc of agenciesSnapshot.docs) {
        const agencyData = agencyDoc.data();

        try {
          // Get all sub-clients
          const clientsSnapshot = await db.collection('tenants')
            .where('ownerTenantId', '==', agencyDoc.id)
            .where('status', 'in', ['active', 'trial'])
            .get();

          if (clientsSnapshot.empty) {
            functions.logger.info(`Agency ${agencyDoc.id} has no active clients, skipping`);
            continue;
          }

          // TODO: Generate report using generateConsolidatedReport function
          // This would need to be refactored to be callable internally

          // For now, just record that a report should be sent
          await db.collection('agencyActivity').add({
            agencyTenantId: agencyDoc.id,
            type: 'scheduled_report_generated',
            reportType: 'monthly',
            clientCount: clientsSnapshot.size,
            dateRange: {
              start: admin.firestore.Timestamp.fromDate(startDate),
              end: admin.firestore.Timestamp.fromDate(endDate),
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });

          functions.logger.info(`Monthly report scheduled for agency ${agencyDoc.id}`);
        } catch (error: any) {
          functions.logger.error(`Error processing agency ${agencyDoc.id}`, { error: error.message });
        }
      }

      functions.logger.info('Monthly reports generation completed');
      return null;
    } catch (error: any) {
      functions.logger.error('Error in sendMonthlyReports', { error: error.message });
      throw error;
    }
  });

/**
 * Send weekly reports (runs every Monday at 9am)
 */
export const sendWeeklyReports = functions.pubsub
  .schedule('0 9 * * 1')
  .timeZone('America/Mexico_City')
  .onRun(async (context) => {
    functions.logger.info('Starting weekly reports generation');

    try {
      // Get all agencies with weekly reports enabled
      const agenciesSnapshot = await db.collection('tenants')
        .where('subscriptionPlan', 'in', ['agency', 'agency_plus', 'enterprise'])
        .where('settings.autoReports.enabled', '==', true)
        .where('settings.autoReports.frequency', '==', 'weekly')
        .get();

      functions.logger.info(`Found ${agenciesSnapshot.size} agencies with weekly reports enabled`);

      // Calculate previous week date range
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // Yesterday (Sunday)
      endDate.setHours(23, 59, 59, 999);

      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6); // 7 days ago
      startDate.setHours(0, 0, 0, 0);

      // Process each agency
      for (const agencyDoc of agenciesSnapshot.docs) {
        try {
          // Get all sub-clients
          const clientsSnapshot = await db.collection('tenants')
            .where('ownerTenantId', '==', agencyDoc.id)
            .where('status', 'in', ['active', 'trial'])
            .get();

          if (clientsSnapshot.empty) {
            continue;
          }

          // Record activity
          await db.collection('agencyActivity').add({
            agencyTenantId: agencyDoc.id,
            type: 'scheduled_report_generated',
            reportType: 'weekly',
            clientCount: clientsSnapshot.size,
            dateRange: {
              start: admin.firestore.Timestamp.fromDate(startDate),
              end: admin.firestore.Timestamp.fromDate(endDate),
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });

          functions.logger.info(`Weekly report scheduled for agency ${agencyDoc.id}`);
        } catch (error: any) {
          functions.logger.error(`Error processing agency ${agencyDoc.id}`, { error: error.message });
        }
      }

      functions.logger.info('Weekly reports generation completed');
      return null;
    } catch (error: any) {
      functions.logger.error('Error in sendWeeklyReports', { error: error.message });
      throw error;
    }
  });

/**
 * Manually trigger report generation
 */
export const triggerManualReport = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;

  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { agencyTenantId, reportType = 'monthly' } = data;

  if (!agencyTenantId) {
    throw new functions.https.HttpsError('invalid-argument', 'agencyTenantId is required');
  }

  // Verify user has access
  const memberSnapshot = await db.collection('tenantMembers')
    .where('userId', '==', userId)
    .where('tenantId', '==', agencyTenantId)
    .where('role', 'in', ['agency_owner', 'agency_admin'])
    .limit(1)
    .get();

  if (memberSnapshot.empty) {
    throw new functions.https.HttpsError('permission-denied', 'User does not have permission');
  }

  try {
    // Calculate date range based on report type
    let startDate: Date, endDate: Date;

    if (reportType === 'monthly') {
      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      previousMonth.setDate(1);
      previousMonth.setHours(0, 0, 0, 0);

      startDate = previousMonth;
      endDate = new Date(previousMonth);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Weekly
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    }

    // Record activity
    await db.collection('agencyActivity').add({
      agencyTenantId,
      type: 'manual_report_triggered',
      reportType,
      triggeredBy: userId,
      dateRange: {
        start: admin.firestore.Timestamp.fromDate(startDate),
        end: admin.firestore.Timestamp.fromDate(endDate),
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info('Manual report triggered', { agencyTenantId, reportType });

    return {
      success: true,
      reportType,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  } catch (error: any) {
    functions.logger.error('Error triggering manual report', { error: error.message, agencyTenantId });
    throw new functions.https.HttpsError('internal', `Failed to trigger report: ${error.message}`);
  }
});
