/**
 * Consolidated Reports Generation
 * Generate reports across multiple sub-clients for agencies
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// ============================================================================
// TYPES
// ============================================================================

interface GenerateReportRequest {
  agencyTenantId: string;
  clientIds?: string[];  // If empty, include all clients
  dateRange: {
    start: string;  // ISO date
    end: string;    // ISO date
  };
  metrics: string[];  // ['leads', 'visits', 'sales', 'emails', 'ai_usage']
  template: 'executive' | 'detailed' | 'comparison';
}

interface ClientMetrics {
  tenantId: string;
  name: string;
  leads: number;
  leadsNew: number;
  leadsConverted: number;
  leadsBySource: Record<string, number>;
  visits: number;
  pageViews: number;
  bounceRate: number;
  sales: number;
  revenue: number;
  averageOrderValue: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  aiCreditsUsed: number;
  storageUsedGB: number;
}

interface AggregatedReportData {
  summary: {
    totalClients: number;
    totalLeads: number;
    totalRevenue: number;
    totalVisits: number;
    averageConversionRate: number;
    totalAiCreditsUsed: number;
  };
  byClient: ClientMetrics[];
  trends: any[];
  recommendations: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function verifyAgencyAccess(userId: string, agencyTenantId: string): Promise<boolean> {
  const memberSnapshot = await db.collection('tenantMembers')
    .where('userId', '==', userId)
    .where('tenantId', '==', agencyTenantId)
    .where('role', 'in', ['agency_owner', 'agency_admin'])
    .limit(1)
    .get();

  return !memberSnapshot.empty;
}

async function getClientMetrics(
  clientTenantId: string,
  startDate: Date,
  endDate: Date,
  metrics: string[]
): Promise<ClientMetrics> {
  const clientDoc = await db.collection('tenants').doc(clientTenantId).get();
  const clientData = clientDoc.data();

  if (!clientData) {
    throw new Error(`Client tenant ${clientTenantId} not found`);
  }

  const result: ClientMetrics = {
    tenantId: clientTenantId,
    name: clientData.name,
    leads: 0,
    leadsNew: 0,
    leadsConverted: 0,
    leadsBySource: {},
    visits: 0,
    pageViews: 0,
    bounceRate: 0,
    sales: 0,
    revenue: 0,
    averageOrderValue: 0,
    emailsSent: 0,
    emailsOpened: 0,
    emailsClicked: 0,
    aiCreditsUsed: 0,
    storageUsedGB: 0,
  };

  // Fetch leads data
  if (metrics.includes('leads')) {
    const leadsSnapshot = await db.collection('leads')
      .where('tenantId', '==', clientTenantId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .get();

    result.leads = leadsSnapshot.size;

    leadsSnapshot.docs.forEach(doc => {
      const lead = doc.data();

      // Count by status
      if (lead.status === 'new') result.leadsNew++;
      if (lead.status === 'converted') result.leadsConverted++;

      // Count by source
      const source = lead.source || 'unknown';
      result.leadsBySource[source] = (result.leadsBySource[source] || 0) + 1;
    });
  }

  // Fetch analytics data (visits)
  if (metrics.includes('visits')) {
    const analyticsSnapshot = await db.collection('analytics')
      .where('tenantId', '==', clientTenantId)
      .where('date', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('date', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .get();

    analyticsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      result.visits += data.visits || 0;
      result.pageViews += data.pageViews || 0;
    });

    if (result.visits > 0) {
      result.bounceRate = analyticsSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.bounceRate || 0);
      }, 0) / analyticsSnapshot.size;
    }
  }

  // Fetch sales data
  if (metrics.includes('sales')) {
    const ordersSnapshot = await db.collection('orders')
      .where('tenantId', '==', clientTenantId)
      .where('status', '==', 'paid')
      .where('paidAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('paidAt', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .get();

    result.sales = ordersSnapshot.size;
    result.revenue = ordersSnapshot.docs.reduce((sum, doc) => {
      const order = doc.data();
      return sum + (order.total || 0);
    }, 0);

    if (result.sales > 0) {
      result.averageOrderValue = result.revenue / result.sales;
    }
  }

  // Fetch email campaigns data
  if (metrics.includes('emails')) {
    const campaignsSnapshot = await db.collection('emailCampaigns')
      .where('tenantId', '==', clientTenantId)
      .where('sentAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('sentAt', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .get();

    campaignsSnapshot.docs.forEach(doc => {
      const campaign = doc.data();
      result.emailsSent += campaign.sent || 0;
      result.emailsOpened += campaign.opened || 0;
      result.emailsClicked += campaign.clicked || 0;
    });
  }

  // Fetch AI usage
  if (metrics.includes('ai_usage')) {
    const usageSnapshot = await db.collection('apiUsage')
      .where('tenantId', '==', clientTenantId)
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .get();

    result.aiCreditsUsed = usageSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + (data.tokensUsed || 0);
    }, 0);
  }

  // Get storage usage (current, not historical)
  result.storageUsedGB = (clientData.usage?.storageUsed || 0) / (1024 * 1024 * 1024);

  return result;
}

function generateRecommendations(reportData: AggregatedReportData): string[] {
  const recommendations: string[] = [];

  // Analyze conversion rates
  const clientsWithLeads = reportData.byClient.filter(c => c.leads > 0);
  if (clientsWithLeads.length > 0) {
    const avgConversionRate = clientsWithLeads.reduce((sum, c) => {
      return sum + (c.leadsConverted / c.leads);
    }, 0) / clientsWithLeads.length;

    const lowConversionClients = clientsWithLeads.filter(c => {
      return (c.leadsConverted / c.leads) < avgConversionRate * 0.7;
    });

    if (lowConversionClients.length > 0) {
      recommendations.push(
        `${lowConversionClients.length} clientes tienen tasas de conversión 30% por debajo del promedio. ` +
        `Considera revisar sus embudos de ventas.`
      );
    }
  }

  // Analyze email performance
  const clientsWithEmails = reportData.byClient.filter(c => c.emailsSent > 0);
  if (clientsWithEmails.length > 0) {
    const avgOpenRate = clientsWithEmails.reduce((sum, c) => {
      return sum + (c.emailsOpened / c.emailsSent);
    }, 0) / clientsWithEmails.length;

    if (avgOpenRate < 0.2) {
      recommendations.push(
        `Tasa promedio de apertura de emails es ${(avgOpenRate * 100).toFixed(1)}%. ` +
        `Considera mejorar los asuntos y segmentación.`
      );
    }
  }

  // Analyze revenue
  const clientsWithSales = reportData.byClient.filter(c => c.sales > 0);
  if (clientsWithSales.length > 0) {
    const topClient = clientsWithSales.reduce((max, c) => c.revenue > max.revenue ? c : max);
    const avgRevenue = clientsWithSales.reduce((sum, c) => sum + c.revenue, 0) / clientsWithSales.length;

    if (topClient.revenue > avgRevenue * 3) {
      recommendations.push(
        `${topClient.name} genera ${((topClient.revenue / reportData.summary.totalRevenue) * 100).toFixed(1)}% ` +
        `de los ingresos totales. Analiza sus estrategias exitosas para replicarlas.`
      );
    }
  }

  // AI usage recommendations
  const highAiUsageClients = reportData.byClient.filter(c => c.aiCreditsUsed > 5000);
  if (highAiUsageClients.length > 0) {
    recommendations.push(
      `${highAiUsageClients.length} clientes están usando altos volúmenes de AI. ` +
      `Considera optimizar los prompts o considerar add-ons de créditos.`
    );
  }

  return recommendations;
}

// ============================================================================
// MAIN CLOUD FUNCTION
// ============================================================================

export const generateConsolidatedReport = functions.https.onCall(
  async (data: GenerateReportRequest, context): Promise<any> => {
    const userId = context.auth?.uid;

    if (!userId) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { agencyTenantId, clientIds, dateRange, metrics, template } = data;

    if (!agencyTenantId || !dateRange || !metrics || !template) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    // Verify user has access to agency
    const isAuthorized = await verifyAgencyAccess(userId, agencyTenantId);
    if (!isAuthorized) {
      throw new functions.https.HttpsError('permission-denied', 'User does not have access to this agency');
    }

    try {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);

      // Get client IDs (all or specified)
      let targetClientIds = clientIds || [];

      if (targetClientIds.length === 0) {
        // Get all sub-clients
        const clientsSnapshot = await db.collection('tenants')
          .where('ownerTenantId', '==', agencyTenantId)
          .where('status', 'in', ['active', 'trial'])
          .get();

        targetClientIds = clientsSnapshot.docs.map(doc => doc.id);
      }

      functions.logger.info('Generating report', {
        agencyTenantId,
        clientCount: targetClientIds.length,
        dateRange,
        metrics,
      });

      // Fetch metrics for each client
      const clientMetricsPromises = targetClientIds.map(clientId =>
        getClientMetrics(clientId, startDate, endDate, metrics)
      );

      const clientMetrics = await Promise.all(clientMetricsPromises);

      // Aggregate data
      const reportData: AggregatedReportData = {
        summary: {
          totalClients: clientMetrics.length,
          totalLeads: clientMetrics.reduce((sum, c) => sum + c.leads, 0),
          totalRevenue: clientMetrics.reduce((sum, c) => sum + c.revenue, 0),
          totalVisits: clientMetrics.reduce((sum, c) => sum + c.visits, 0),
          averageConversionRate: 0,
          totalAiCreditsUsed: clientMetrics.reduce((sum, c) => sum + c.aiCreditsUsed, 0),
        },
        byClient: clientMetrics,
        trends: [],
        recommendations: [],
      };

      // Calculate average conversion rate
      const clientsWithLeads = clientMetrics.filter(c => c.leads > 0);
      if (clientsWithLeads.length > 0) {
        reportData.summary.averageConversionRate = clientsWithLeads.reduce((sum, c) => {
          return sum + (c.leadsConverted / c.leads);
        }, 0) / clientsWithLeads.length;
      }

      // Generate recommendations
      reportData.recommendations = generateRecommendations(reportData);

      // Save report to Firestore
      const reportDoc = await db.collection('savedReports').add({
        agencyTenantId,
        includedClients: targetClientIds,
        dateRange: {
          start: admin.firestore.Timestamp.fromDate(startDate),
          end: admin.firestore.Timestamp.fromDate(endDate),
        },
        metrics,
        template,
        reportData,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        generatedBy: userId,
      });

      // Record activity
      await db.collection('agencyActivity').add({
        agencyTenantId,
        type: 'report_generated',
        reportId: reportDoc.id,
        clientCount: targetClientIds.length,
        template,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info('Report generated successfully', { reportId: reportDoc.id });

      return {
        success: true,
        reportId: reportDoc.id,
        reportData,
      };
    } catch (error: any) {
      functions.logger.error('Error generating report', { error: error.message, agencyTenantId });
      throw new functions.https.HttpsError('internal', `Failed to generate report: ${error.message}`);
    }
  }
);

/**
 * Get saved report
 */
export const getSavedReport = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;

  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { reportId } = data;

  if (!reportId) {
    throw new functions.https.HttpsError('invalid-argument', 'reportId is required');
  }

  const reportDoc = await db.collection('savedReports').doc(reportId).get();

  if (!reportDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Report not found');
  }

  const reportData = reportDoc.data()!;

  // Verify user has access
  const isAuthorized = await verifyAgencyAccess(userId, reportData.agencyTenantId);
  if (!isAuthorized) {
    throw new functions.https.HttpsError('permission-denied', 'User does not have access to this report');
  }

  return {
    success: true,
    report: {
      id: reportDoc.id,
      ...reportData,
    },
  };
});

/**
 * Delete saved report
 */
export const deleteSavedReport = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;

  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { reportId } = data;

  if (!reportId) {
    throw new functions.https.HttpsError('invalid-argument', 'reportId is required');
  }

  const reportDoc = await db.collection('savedReports').doc(reportId).get();

  if (!reportDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Report not found');
  }

  const reportData = reportDoc.data()!;

  // Verify user has access
  const isAuthorized = await verifyAgencyAccess(userId, reportData.agencyTenantId);
  if (!isAuthorized) {
    throw new functions.https.HttpsError('permission-denied', 'User does not have access to this report');
  }

  await reportDoc.ref.delete();

  functions.logger.info('Report deleted', { reportId });

  return {
    success: true,
  };
});
