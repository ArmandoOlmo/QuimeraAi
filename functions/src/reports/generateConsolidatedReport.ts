/**
 * Cloud Function to generate consolidated reports
 * Can be triggered via HTTP or scheduled
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const db = admin.firestore();

interface GenerateReportRequest {
    agencyTenantId: string;
    clientIds?: string[]; // If empty, include all clients
    dateRange: {
        start: string; // ISO date string
        end: string;
    };
    metrics: string[];
    template: 'executive' | 'detailed' | 'comparison';
    saveToDB?: boolean; // Save to savedReports collection
    name?: string;
}

interface GenerateReportResponse {
    success: boolean;
    reportId?: string;
    reportData?: any;
    error?: string;
}

/**
 * HTTP callable function to generate report
 */
export const generateConsolidatedReport = functions.https.onCall(
    async (data: GenerateReportRequest, context): Promise<GenerateReportResponse> => {
        try {
            // Verify authentication
            if (!context.auth) {
                throw new functions.https.HttpsError(
                    'unauthenticated',
                    'User must be authenticated'
                );
            }

            const userId = context.auth.uid;

            // Verify user has permission to access agency
            const isAuthorized = await verifyAgencyAccess(userId, data.agencyTenantId);
            if (!isAuthorized) {
                throw new functions.https.HttpsError(
                    'permission-denied',
                    'User does not have access to this agency'
                );
            }

            // Get client IDs (all if not specified)
            let clientIds = data.clientIds || [];
            if (clientIds.length === 0) {
                const clientsSnapshot = await db
                    .collection('tenants')
                    .where('ownerTenantId', '==', data.agencyTenantId)
                    .where('status', 'in', ['active', 'trial'])
                    .get();

                clientIds = clientsSnapshot.docs.map((doc) => doc.id);
            }

            if (clientIds.length === 0) {
                throw new functions.https.HttpsError(
                    'failed-precondition',
                    'No clients found for this agency'
                );
            }

            // Parse date range
            const dateRange = {
                start: Timestamp.fromDate(new Date(data.dateRange.start)),
                end: Timestamp.fromDate(new Date(data.dateRange.end)),
            };

            // Generate report data
            const reportData = await aggregateReportData(
                data.agencyTenantId,
                clientIds,
                dateRange,
                data.metrics
            );

            // Save to database if requested
            let reportId: string | undefined;
            if (data.saveToDB) {
                const reportDoc = await db.collection('savedReports').add({
                    agencyTenantId: data.agencyTenantId,
                    name: data.name || `Reporte ${new Date().toLocaleDateString('es-MX')}`,
                    template: data.template,
                    metrics: data.metrics,
                    includedClients: clientIds,
                    dateRange: {
                        start: dateRange.start,
                        end: dateRange.end,
                    },
                    reportData,
                    generatedAt: Timestamp.now(),
                    generatedBy: userId,
                    status: 'completed',
                    downloadCount: 0,
                });

                reportId = reportDoc.id;

                // Log activity
                await db.collection('agencyActivity').add({
                    agencyTenantId: data.agencyTenantId,
                    type: 'report_generated',
                    description: `Reporte consolidado generado: ${data.name || 'Sin nombre'}`,
                    metadata: {
                        reportId,
                        clientCount: clientIds.length,
                        template: data.template,
                    },
                    createdBy: userId,
                    timestamp: Timestamp.now(),
                });
            }

            return {
                success: true,
                reportId,
                reportData,
            };
        } catch (error: any) {
            console.error('Error generating report:', error);

            if (error instanceof functions.https.HttpsError) {
                throw error;
            }

            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to generate report'
            );
        }
    }
);

/**
 * Aggregate report data from multiple clients
 */
async function aggregateReportData(
    agencyTenantId: string,
    clientIds: string[],
    dateRange: { start: Timestamp; end: Timestamp },
    metrics: string[]
): Promise<any> {
    const clientMetrics: any[] = [];

    // Fetch data for each client
    for (const clientId of clientIds) {
        const clientDoc = await db.collection('tenants').doc(clientId).get();
        if (!clientDoc.exists) continue;

        const clientData = clientDoc.data()!;
        const clientMetric = await getClientMetrics(
            clientId,
            clientData.name,
            dateRange,
            metrics
        );

        clientMetrics.push(clientMetric);
    }

    // Calculate summary
    const summary = {
        totalClients: clientMetrics.length,
        totalLeads: clientMetrics.reduce((sum, c) => sum + (c.totalLeads || 0), 0),
        totalRevenue: clientMetrics.reduce((sum, c) => sum + (c.totalRevenue || 0), 0),
        totalVisits: clientMetrics.reduce((sum, c) => sum + (c.totalVisits || 0), 0),
        totalEmailsSent: clientMetrics.reduce((sum, c) => sum + (c.emailsSent || 0), 0),
        avgConversionRate:
            clientMetrics.length > 0
                ? clientMetrics.reduce((sum, c) => sum + (c.conversionRate || 0), 0) /
                  clientMetrics.length
                : 0,
        totalAiCreditsUsed: clientMetrics.reduce((sum, c) => sum + (c.aiCreditsUsed || 0), 0),
        totalStorageUsedGB: clientMetrics.reduce((sum, c) => sum + (c.storageUsedGB || 0), 0),
    };

    // Calculate trends
    const topPerformingClients = clientMetrics
        .filter((c) => c.totalRevenue > 0)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 5)
        .map((c) => ({
            clientId: c.clientId,
            clientName: c.clientName,
            metric: 'Ingresos',
            value: c.totalRevenue,
        }));

    const underperformingClients = clientMetrics
        .filter((c) => c.conversionRate < 5 || c.bounceRate > 70)
        .slice(0, 5)
        .map((c) => ({
            clientId: c.clientId,
            clientName: c.clientName,
            metric: c.conversionRate < 5 ? 'Conversión Baja' : 'Bounce Rate Alto',
            value: c.conversionRate < 5 ? c.conversionRate : c.bounceRate,
            recommendation:
                c.conversionRate < 5
                    ? 'Optimizar funnel de conversión'
                    : 'Mejorar experiencia de usuario',
        }));

    // Generate recommendations
    const recommendations: string[] = [];
    if (clientMetrics.filter((c) => c.conversionRate < 5).length > 0) {
        recommendations.push(
            `${clientMetrics.filter((c) => c.conversionRate < 5).length} clientes tienen tasas de conversión bajas. Considera revisar sus funnels.`
        );
    }
    if (clientMetrics.filter((c) => c.bounceRate > 70).length > 0) {
        recommendations.push(
            `${clientMetrics.filter((c) => c.bounceRate > 70).length} clientes tienen bounce rates altos. Revisa la experiencia de usuario.`
        );
    }

    return {
        summary,
        byClient: clientMetrics,
        trends: {
            topPerformingClients,
            underperformingClients,
            periodOverPeriodComparison: {
                leadsGrowth: 0, // Would need previous period data
                revenueGrowth: 0,
                trafficGrowth: 0,
            },
        },
        recommendations,
        generatedAt: new Date(),
        dateRange: {
            start: dateRange.start.toDate(),
            end: dateRange.end.toDate(),
        },
        includedClients: clientIds,
        metrics,
    };
}

/**
 * Get metrics for a single client
 */
async function getClientMetrics(
    clientId: string,
    clientName: string,
    dateRange: { start: Timestamp; end: Timestamp },
    metrics: string[]
): Promise<any> {
    const result: any = {
        clientId,
        clientName,
        totalLeads: 0,
        newLeads: 0,
        convertedLeads: 0,
        conversionRate: 0,
        leadsBySource: {},
        totalVisits: 0,
        uniqueVisitors: 0,
        pageViews: 0,
        avgSessionDuration: 0,
        bounceRate: 0,
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        conversionToSale: 0,
        emailsSent: 0,
        emailsOpened: 0,
        emailsClicked: 0,
        openRate: 0,
        clickRate: 0,
        aiCreditsUsed: 0,
        storageUsedGB: 0,
        activeUsers: 0,
        activeProjects: 0,
    };

    // Get leads data
    if (metrics.includes('leads')) {
        const leadsSnapshot = await db
            .collection('leads')
            .where('tenantId', '==', clientId)
            .where('createdAt', '>=', dateRange.start)
            .where('createdAt', '<=', dateRange.end)
            .get();

        const leads = leadsSnapshot.docs.map((doc) => doc.data());
        result.totalLeads = leads.length;
        result.newLeads = leads.filter((l) => l.status === 'new').length;
        result.convertedLeads = leads.filter((l) => l.status === 'converted').length;
        result.conversionRate =
            result.totalLeads > 0 ? (result.convertedLeads / result.totalLeads) * 100 : 0;

        // Group by source
        leads.forEach((lead) => {
            const source = lead.source || 'unknown';
            result.leadsBySource[source] = (result.leadsBySource[source] || 0) + 1;
        });
    }

    // Get traffic data
    if (metrics.includes('visits')) {
        const analyticsSnapshot = await db
            .collection('analytics')
            .where('tenantId', '==', clientId)
            .where('timestamp', '>=', dateRange.start)
            .where('timestamp', '<=', dateRange.end)
            .get();

        const sessions = analyticsSnapshot.docs.map((doc) => doc.data());
        result.totalVisits = sessions.length;
        result.uniqueVisitors = new Set(sessions.map((s) => s.visitorId)).size;
        result.pageViews = sessions.reduce((sum, s) => sum + (s.pageViews || 1), 0);

        const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        result.avgSessionDuration = result.totalVisits > 0 ? totalDuration / result.totalVisits : 0;

        const bounces = sessions.filter((s) => s.pageViews === 1 && s.duration < 30).length;
        result.bounceRate = result.totalVisits > 0 ? (bounces / result.totalVisits) * 100 : 0;
    }

    // Get sales data
    if (metrics.includes('sales')) {
        const ordersSnapshot = await db
            .collection('orders')
            .where('tenantId', '==', clientId)
            .where('status', '==', 'paid')
            .where('createdAt', '>=', dateRange.start)
            .where('createdAt', '<=', dateRange.end)
            .get();

        const orders = ordersSnapshot.docs.map((doc) => doc.data());
        result.totalOrders = orders.length;
        result.totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        result.averageOrderValue =
            result.totalOrders > 0 ? result.totalRevenue / result.totalOrders : 0;
    }

    // Get email data
    if (metrics.includes('emails')) {
        const campaignsSnapshot = await db
            .collection('emailCampaigns')
            .where('tenantId', '==', clientId)
            .where('sentAt', '>=', dateRange.start)
            .where('sentAt', '<=', dateRange.end)
            .get();

        const campaigns = campaignsSnapshot.docs.map((doc) => doc.data());
        result.emailsSent = campaigns.reduce((sum, c) => sum + (c.recipientCount || 0), 0);
        result.emailsOpened = campaigns.reduce((sum, c) => sum + (c.opensCount || 0), 0);
        result.emailsClicked = campaigns.reduce((sum, c) => sum + (c.clicksCount || 0), 0);
        result.openRate = result.emailsSent > 0 ? (result.emailsOpened / result.emailsSent) * 100 : 0;
        result.clickRate =
            result.emailsSent > 0 ? (result.emailsClicked / result.emailsSent) * 100 : 0;
    }

    // Get resource usage from tenant document
    const tenantDoc = await db.collection('tenants').doc(clientId).get();
    const tenantData = tenantDoc.data();
    if (tenantData?.usage) {
        result.aiCreditsUsed = tenantData.usage.aiCreditsUsed || 0;
        result.storageUsedGB = tenantData.usage.storageUsedGB || 0;
        result.activeUsers = tenantData.usage.userCount || 0;
        result.activeProjects = tenantData.usage.projectCount || 0;
    }

    return result;
}

/**
 * Verify user has access to agency
 */
async function verifyAgencyAccess(userId: string, agencyTenantId: string): Promise<boolean> {
    try {
        // Check if user is a member of the agency tenant
        const membershipSnapshot = await db
            .collection('tenantMembers')
            .where('userId', '==', userId)
            .where('tenantId', '==', agencyTenantId)
            .where('role', 'in', ['agency_owner', 'agency_admin'])
            .limit(1)
            .get();

        return !membershipSnapshot.empty;
    } catch (error) {
        console.error('Error verifying agency access:', error);
        return false;
    }
}

/**
 * Get saved report by ID
 */
export const getSavedReport = functions.https.onCall(
    async (data: { reportId: string }, context) => {
        try {
            if (!context.auth) {
                throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
            }

            const reportDoc = await db.collection('savedReports').doc(data.reportId).get();

            if (!reportDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Report not found');
            }

            const reportData = reportDoc.data()!;

            // Verify access
            const hasAccess = await verifyAgencyAccess(context.auth.uid, reportData.agencyTenantId);
            if (!hasAccess) {
                throw new functions.https.HttpsError('permission-denied', 'Access denied');
            }

            // Increment download count
            await reportDoc.ref.update({
                downloadCount: admin.firestore.FieldValue.increment(1),
                lastAccessedAt: Timestamp.now(),
            });

            return {
                success: true,
                report: {
                    id: reportDoc.id,
                    ...reportData,
                },
            };
        } catch (error: any) {
            console.error('Error getting saved report:', error);

            if (error instanceof functions.https.HttpsError) {
                throw error;
            }

            throw new functions.https.HttpsError('internal', 'Failed to get report');
        }
    }
);

/**
 * Delete saved report
 */
export const deleteSavedReport = functions.https.onCall(
    async (data: { reportId: string }, context) => {
        try {
            if (!context.auth) {
                throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
            }

            const reportDoc = await db.collection('savedReports').doc(data.reportId).get();

            if (!reportDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Report not found');
            }

            const reportData = reportDoc.data()!;

            // Verify access (must be owner)
            const hasAccess = await verifyAgencyAccess(context.auth.uid, reportData.agencyTenantId);
            if (!hasAccess) {
                throw new functions.https.HttpsError('permission-denied', 'Access denied');
            }

            // Delete report
            await reportDoc.ref.delete();

            return {
                success: true,
            };
        } catch (error: any) {
            console.error('Error deleting report:', error);

            if (error instanceof functions.https.HttpsError) {
                throw error;
            }

            throw new functions.https.HttpsError('internal', 'Failed to delete report');
        }
    }
);
