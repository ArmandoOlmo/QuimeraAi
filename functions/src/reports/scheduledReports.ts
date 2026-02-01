/**
 * Scheduled Reports Cloud Functions
 * Automatically generate and send reports on schedule
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const db = admin.firestore();

/**
 * Scheduled function that runs monthly to send reports
 * Runs on the 1st of each month at 9:00 AM UTC
 */
export const sendMonthlyReports = functions.pubsub
    .schedule('0 9 1 * *')
    .timeZone('America/Mexico_City')
    .onRun(async (context) => {
        console.log('Starting monthly report generation...');

        try {
            // Get all agencies with auto-reports enabled
            const agenciesSnapshot = await db
                .collection('tenants')
                .where('subscriptionPlan', 'in', ['agency', 'agency_plus', 'enterprise'])
                .get();

            const agencies = agenciesSnapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .filter((tenant: any) => tenant.settings?.autoReports?.enabled === true);

            console.log(`Found ${agencies.length} agencies with auto-reports enabled`);

            // Generate report for each agency
            for (const agency of agencies) {
                try {
                    await generateAndSendReport(agency as any);
                } catch (error) {
                    console.error(`Error generating report for agency ${agency.id}:`, error);
                    // Continue with next agency
                }
            }

            console.log('Monthly report generation completed');
            return null;
        } catch (error) {
            console.error('Error in sendMonthlyReports:', error);
            throw error;
        }
    });

/**
 * Weekly scheduled reports
 * Runs every Monday at 9:00 AM UTC
 */
export const sendWeeklyReports = functions.pubsub
    .schedule('0 9 * * 1')
    .timeZone('America/Mexico_City')
    .onRun(async (context) => {
        console.log('Starting weekly report generation...');

        try {
            const agenciesSnapshot = await db
                .collection('tenants')
                .where('subscriptionPlan', 'in', ['agency', 'agency_plus', 'enterprise'])
                .get();

            const agencies = agenciesSnapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .filter(
                    (tenant: any) =>
                        tenant.settings?.autoReports?.enabled === true &&
                        tenant.settings?.autoReports?.frequency === 'weekly'
                );

            console.log(`Found ${agencies.length} agencies with weekly auto-reports`);

            for (const agency of agencies) {
                try {
                    await generateAndSendReport(agency as any, 'weekly');
                } catch (error) {
                    console.error(`Error generating weekly report for agency ${agency.id}:`, error);
                }
            }

            console.log('Weekly report generation completed');
            return null;
        } catch (error) {
            console.error('Error in sendWeeklyReports:', error);
            throw error;
        }
    });

/**
 * Generate and send report for an agency
 */
async function generateAndSendReport(
    agency: any,
    frequency: 'weekly' | 'monthly' = 'monthly'
): Promise<void> {
    console.log(`Generating ${frequency} report for agency: ${agency.name}`);

    // Calculate date range (previous period)
    const now = new Date();
    let dateRange: { start: Date; end: Date };

    if (frequency === 'monthly') {
        // Previous month
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        dateRange = {
            start: lastMonth,
            end: lastMonthEnd,
        };
    } else {
        // Previous week
        const lastWeekEnd = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
        const lastWeekStart = new Date(lastWeekEnd.getTime() - 6 * 24 * 60 * 60 * 1000);
        dateRange = {
            start: lastWeekStart,
            end: lastWeekEnd,
        };
    }

    // Get all sub-clients
    const clientsSnapshot = await db
        .collection('tenants')
        .where('ownerTenantId', '==', agency.id)
        .where('status', 'in', ['active', 'trial'])
        .get();

    const clientIds = clientsSnapshot.docs.map((doc) => doc.id);

    if (clientIds.length === 0) {
        console.log(`No active clients found for agency ${agency.name}`);
        return;
    }

    // Generate report data
    const reportData = await aggregateReportData(
        agency.id,
        clientIds,
        {
            start: Timestamp.fromDate(dateRange.start),
            end: Timestamp.fromDate(dateRange.end),
        },
        ['leads', 'visits', 'sales', 'emails']
    );

    // Save report to database
    const reportDoc = await db.collection('savedReports').add({
        agencyTenantId: agency.id,
        name: `Reporte ${frequency === 'monthly' ? 'Mensual' : 'Semanal'} - ${dateRange.start.toLocaleDateString('es-MX')}`,
        template: 'executive',
        metrics: ['leads', 'visits', 'sales', 'emails'],
        includedClients: clientIds,
        dateRange: {
            start: Timestamp.fromDate(dateRange.start),
            end: Timestamp.fromDate(dateRange.end),
        },
        reportData,
        generatedAt: Timestamp.now(),
        generatedBy: 'system',
        status: 'completed',
        downloadCount: 0,
        automated: true,
    });

    // Get recipients from settings
    const recipients =
        agency.settings?.autoReports?.recipients || [agency.ownerEmail || agency.contactEmail];

    // Send email to recipients
    for (const recipient of recipients) {
        await sendReportEmail(recipient, agency, reportDoc.id, reportData, frequency);
    }

    // Log activity
    await db.collection('agencyActivity').add({
        agencyTenantId: agency.id,
        type: 'report_generated',
        description: `Reporte ${frequency === 'monthly' ? 'mensual' : 'semanal'} automático generado`,
        metadata: {
            reportId: reportDoc.id,
            clientCount: clientIds.length,
            automated: true,
        },
        createdBy: 'system',
        timestamp: Timestamp.now(),
    });

    console.log(`Report generated and sent for agency: ${agency.name}`);
}

/**
 * Aggregate report data (simplified version for scheduled reports)
 */
async function aggregateReportData(
    agencyTenantId: string,
    clientIds: string[],
    dateRange: { start: Timestamp; end: Timestamp },
    metrics: string[]
): Promise<any> {
    const clientMetrics: any[] = [];

    // Fetch basic metrics for each client
    for (const clientId of clientIds) {
        try {
            const clientDoc = await db.collection('tenants').doc(clientId).get();
            if (!clientDoc.exists) continue;

            const clientData = clientDoc.data()!;

            // Get basic stats
            const leadsSnapshot = await db
                .collection('leads')
                .where('tenantId', '==', clientId)
                .where('createdAt', '>=', dateRange.start)
                .where('createdAt', '<=', dateRange.end)
                .get();

            const ordersSnapshot = await db
                .collection('orders')
                .where('tenantId', '==', clientId)
                .where('status', '==', 'paid')
                .where('createdAt', '>=', dateRange.start)
                .where('createdAt', '<=', dateRange.end)
                .get();

            const totalLeads = leadsSnapshot.size;
            const totalRevenue = ordersSnapshot.docs.reduce(
                (sum, doc) => sum + (doc.data().total || 0),
                0
            );

            clientMetrics.push({
                clientId,
                clientName: clientData.name,
                totalLeads,
                totalRevenue,
                activeProjects: clientData.usage?.projectCount || 0,
            });
        } catch (error) {
            console.error(`Error fetching metrics for client ${clientId}:`, error);
        }
    }

    // Calculate summary
    const summary = {
        totalClients: clientMetrics.length,
        totalLeads: clientMetrics.reduce((sum, c) => sum + c.totalLeads, 0),
        totalRevenue: clientMetrics.reduce((sum, c) => sum + c.totalRevenue, 0),
    };

    return {
        summary,
        byClient: clientMetrics,
        generatedAt: new Date(),
        dateRange: {
            start: dateRange.start.toDate(),
            end: dateRange.end.toDate(),
        },
    };
}

/**
 * Send report email to recipient
 */
async function sendReportEmail(
    recipient: string,
    agency: any,
    reportId: string,
    reportData: any,
    frequency: 'weekly' | 'monthly'
): Promise<void> {
    try {
        // Create email document for sending via email extension
        await db.collection('mail').add({
            to: recipient,
            from: 'noreply@quimera.ai',
            replyTo: agency.contactEmail || 'support@quimera.ai',
            template: {
                name: 'scheduled-report',
                data: {
                    agencyName: agency.name,
                    frequency: frequency === 'monthly' ? 'mensual' : 'semanal',
                    reportUrl: `https://app.quimera.ai/dashboard/agency/reports/${reportId}`,
                    summary: {
                        totalClients: reportData.summary.totalClients,
                        totalLeads: reportData.summary.totalLeads.toLocaleString(),
                        totalRevenue: `$${reportData.summary.totalRevenue.toLocaleString()}`,
                    },
                    dateRange: {
                        start: reportData.dateRange.start.toLocaleDateString('es-MX'),
                        end: reportData.dateRange.end.toLocaleDateString('es-MX'),
                    },
                    topClients: reportData.byClient
                        .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
                        .slice(0, 3)
                        .map((c: any) => ({
                            name: c.clientName,
                            revenue: `$${c.totalRevenue.toLocaleString()}`,
                        })),
                },
            },
        });

        console.log(`Report email sent to ${recipient}`);
    } catch (error) {
        console.error(`Error sending report email to ${recipient}:`, error);
        throw error;
    }
}

/**
 * Manual trigger to send report immediately (for testing)
 */
export const triggerManualReport = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { agencyTenantId } = data;

        // Verify user has access
        const membershipSnapshot = await db
            .collection('tenantMembers')
            .where('userId', '==', context.auth.uid)
            .where('tenantId', '==', agencyTenantId)
            .where('role', 'in', ['agency_owner', 'agency_admin'])
            .limit(1)
            .get();

        if (membershipSnapshot.empty) {
            throw new functions.https.HttpsError('permission-denied', 'Access denied');
        }

        // Get agency data
        const agencyDoc = await db.collection('tenants').doc(agencyTenantId).get();
        if (!agencyDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Agency not found');
        }

        const agency = { id: agencyDoc.id, ...agencyDoc.data() };

        // Generate and send report
        await generateAndSendReport(agency as any, 'monthly');

        return {
            success: true,
            message: 'Report generated and sent successfully',
        };
    } catch (error: any) {
        console.error('Error triggering manual report:', error);

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError('internal', 'Failed to generate report');
    }
});
