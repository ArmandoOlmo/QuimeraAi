/**
 * Scheduled Reports
 * Automatically send reports to clients on a schedule
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendEmail } from '../email/emailService';
import { isPlatformAdmin } from '../utils/platformAdmin';

const db = admin.firestore();

// =============================================================================
// TYPES
// =============================================================================

interface ScheduledReport {
    id: string;
    agencyTenantId: string;
    clientTenantId: string;
    clientEmail: string;
    clientName: string;
    schedule: 'weekly' | 'biweekly' | 'monthly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-28 for monthly
    enabled: boolean;
    metrics: string[];
    template: string;
    lastSentAt?: admin.firestore.Timestamp;
    nextSendAt: admin.firestore.Timestamp;
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
}

// =============================================================================
// CLOUD FUNCTION: Send Scheduled Reports
// =============================================================================

/**
 * Daily check for scheduled reports to send
 */
export const sendScheduledReports = functions.pubsub
    .schedule('every day 08:00')
    .timeZone('America/New_York')
    .onRun(async () => {
        const now = admin.firestore.Timestamp.now();
        
        // Get reports due today
        const dueReports = await db.collection('scheduledReports')
            .where('enabled', '==', true)
            .where('nextSendAt', '<=', now)
            .get();

        functions.logger.info('Processing scheduled reports', { count: dueReports.size });

        for (const doc of dueReports.docs) {
            const report = doc.data() as ScheduledReport;
            
            try {
                await processScheduledReport(doc.id, report);
            } catch (error) {
                functions.logger.error('Failed to send scheduled report', {
                    reportId: doc.id,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return null;
    });

/**
 * Process a single scheduled report
 */
async function processScheduledReport(reportId: string, report: ScheduledReport): Promise<void> {
    // Get agency and client info
    const [agencyDoc, clientDoc] = await Promise.all([
        db.collection('tenants').doc(report.agencyTenantId).get(),
        db.collection('tenants').doc(report.clientTenantId).get(),
    ]);

    if (!agencyDoc.exists || !clientDoc.exists) {
        functions.logger.warn('Tenant not found for scheduled report', { reportId });
        return;
    }

    const agencyData = agencyDoc.data()!;
    const clientData = clientDoc.data()!;

    // Generate report data (simplified - in production, aggregate real data)
    const reportData = await generateReportData(report.clientTenantId, report.metrics);

    // Generate HTML email with report
    const emailHtml = generateReportEmailHtml({
        agencyName: agencyData.name,
        agencyLogo: agencyData.branding?.logoUrl,
        clientName: report.clientName,
        reportData,
        metrics: report.metrics,
        periodStart: getReportPeriodStart(report.schedule),
        periodEnd: new Date(),
        brandingColor: agencyData.branding?.primaryColor || '#4f46e5',
    });

    // Send email
    await sendEmail({
        to: report.clientEmail,
        subject: `Tu reporte ${getPeriodLabel(report.schedule)} - ${agencyData.name}`,
        html: emailHtml,
    });

    // Update report record
    await db.collection('scheduledReports').doc(reportId).update({
        lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
        nextSendAt: calculateNextSendDate(report.schedule, report.dayOfWeek, report.dayOfMonth),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info('Scheduled report sent', {
        reportId,
        clientEmail: report.clientEmail,
        clientName: report.clientName,
    });
}

// =============================================================================
// MANAGE SCHEDULED REPORTS
// =============================================================================

/**
 * Create a new scheduled report
 */
export const createScheduledReport = functions.https.onCall(
    async (data: {
        clientTenantId: string;
        clientEmail: string;
        clientName: string;
        schedule: 'weekly' | 'biweekly' | 'monthly';
        dayOfWeek?: number;
        dayOfMonth?: number;
        metrics: string[];
        template?: string;
        agencyTenantId?: string; // Optional for platform admins
    }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Autenticación requerida');
        }

        // Check if user is platform Owner/SuperAdmin (full access)
        const isAdmin = await isPlatformAdmin(context.auth.uid);
        
        let agencyTenantId: string;

        if (isAdmin && data.agencyTenantId) {
            // Platform admins can specify any agency tenant
            agencyTenantId = data.agencyTenantId;
        } else if (isAdmin) {
            // Platform admin without specifying agency - get from client's owner
            const clientDoc = await db.collection('tenants').doc(data.clientTenantId).get();
            if (!clientDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Cliente no encontrado');
            }
            agencyTenantId = clientDoc.data()?.ownerTenantId || data.clientTenantId;
        } else {
            // Regular users - must be agency owners/admins
            const memberQuery = await db.collection('tenantMembers')
                .where('userId', '==', context.auth.uid)
                .where('role', 'in', ['agency_owner', 'agency_admin'])
                .limit(1)
                .get();

            if (memberQuery.empty) {
                throw new functions.https.HttpsError('permission-denied', 'No tienes permisos de agencia');
            }

            agencyTenantId = memberQuery.docs[0].data().tenantId;

            // Verify client belongs to agency
            const clientDoc = await db.collection('tenants').doc(data.clientTenantId).get();
            if (!clientDoc.exists || clientDoc.data()?.ownerTenantId !== agencyTenantId) {
                throw new functions.https.HttpsError('permission-denied', 'Cliente no válido');
            }
        }

        const scheduledReport = {
            agencyTenantId,
            clientTenantId: data.clientTenantId,
            clientEmail: data.clientEmail,
            clientName: data.clientName,
            schedule: data.schedule,
            dayOfWeek: data.dayOfWeek,
            dayOfMonth: data.dayOfMonth,
            metrics: data.metrics,
            template: data.template || 'standard',
            enabled: true,
            nextSendAt: calculateNextSendDate(data.schedule, data.dayOfWeek, data.dayOfMonth),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection('scheduledReports').add(scheduledReport);

        return { success: true, reportId: docRef.id };
    }
);

/**
 * Update scheduled report
 */
export const updateScheduledReport = functions.https.onCall(
    async (data: { reportId: string; updates: Partial<ScheduledReport> }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Autenticación requerida');
        }

        const reportDoc = await db.collection('scheduledReports').doc(data.reportId).get();
        if (!reportDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Reporte no encontrado');
        }

        // Check if user is platform Owner/SuperAdmin (full access)
        const isAdmin = await isPlatformAdmin(context.auth.uid);

        if (!isAdmin) {
            // Regular users must verify tenant ownership
            const memberQuery = await db.collection('tenantMembers')
                .where('userId', '==', context.auth.uid)
                .where('tenantId', '==', reportDoc.data()?.agencyTenantId)
                .limit(1)
                .get();

            if (memberQuery.empty) {
                throw new functions.https.HttpsError('permission-denied', 'No tienes permisos');
            }
        }

        const { reportId, updates } = data;
        
        await db.collection('scheduledReports').doc(reportId).update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true };
    }
);

// =============================================================================
// HELPERS
// =============================================================================

function calculateNextSendDate(
    schedule: 'weekly' | 'biweekly' | 'monthly',
    dayOfWeek?: number,
    dayOfMonth?: number
): admin.firestore.Timestamp {
    const now = new Date();
    let next = new Date();

    switch (schedule) {
        case 'weekly':
            // Default to Monday (1)
            const targetDay = dayOfWeek ?? 1;
            const daysUntil = (targetDay + 7 - now.getDay()) % 7 || 7;
            next.setDate(now.getDate() + daysUntil);
            break;
            
        case 'biweekly':
            // Every other Monday
            const biweeklyTarget = dayOfWeek ?? 1;
            const biweeklyDays = (biweeklyTarget + 7 - now.getDay()) % 7 || 7;
            next.setDate(now.getDate() + biweeklyDays + 7);
            break;
            
        case 'monthly':
            // Default to 1st of month
            const targetDate = dayOfMonth ?? 1;
            next.setMonth(now.getMonth() + 1);
            next.setDate(targetDate);
            break;
    }

    next.setHours(8, 0, 0, 0); // 8 AM
    return admin.firestore.Timestamp.fromDate(next);
}

function getReportPeriodStart(schedule: 'weekly' | 'biweekly' | 'monthly'): Date {
    const now = new Date();
    switch (schedule) {
        case 'weekly':
            return new Date(now.setDate(now.getDate() - 7));
        case 'biweekly':
            return new Date(now.setDate(now.getDate() - 14));
        case 'monthly':
            return new Date(now.setMonth(now.getMonth() - 1));
    }
}

function getPeriodLabel(schedule: 'weekly' | 'biweekly' | 'monthly'): string {
    switch (schedule) {
        case 'weekly': return 'semanal';
        case 'biweekly': return 'quincenal';
        case 'monthly': return 'mensual';
    }
}

async function generateReportData(clientTenantId: string, metrics: string[]): Promise<Record<string, any>> {
    // In production, aggregate real metrics from Firestore
    // This is a simplified placeholder
    const data: Record<string, any> = {};
    
    if (metrics.includes('leads')) {
        data.leads = { total: 0, new: 0, converted: 0 };
    }
    if (metrics.includes('visits')) {
        data.visits = { total: 0, unique: 0 };
    }
    if (metrics.includes('sales')) {
        data.sales = { total: 0, revenue: 0 };
    }
    
    return data;
}

function generateReportEmailHtml(data: {
    agencyName: string;
    agencyLogo?: string;
    clientName: string;
    reportData: Record<string, any>;
    metrics: string[];
    periodStart: Date;
    periodEnd: Date;
    brandingColor: string;
}): string {
    const formatDate = (date: Date) => date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Rendimiento</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, ${data.brandingColor} 0%, ${data.brandingColor}dd 100%); padding: 32px; text-align: center;">
                            ${data.agencyLogo ? `<img src="${data.agencyLogo}" alt="${data.agencyName}" style="max-height: 48px; margin-bottom: 16px;">` : ''}
                            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff;">
                                Reporte de Rendimiento
                            </h1>
                            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                                ${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 32px;">
                            <p style="margin: 0 0 24px; color: #374151;">
                                Hola <strong>${data.clientName}</strong>,
                            </p>
                            <p style="margin: 0 0 24px; color: #374151;">
                                Aquí está tu resumen de rendimiento para este período.
                            </p>
                            
                            <!-- Metrics Grid -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    ${Object.entries(data.reportData).map(([key, value]) => `
                                        <td style="padding: 16px; background-color: #f9fafb; border-radius: 12px; text-align: center; vertical-align: top;">
                                            <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${data.brandingColor};">
                                                ${typeof value === 'object' ? value.total || 0 : value}
                                            </p>
                                            <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280; text-transform: capitalize;">
                                                ${key}
                                            </p>
                                        </td>
                                    `).join('')}
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                Este reporte fue generado automáticamente por ${data.agencyName}
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}
