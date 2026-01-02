/**
 * Lead Email Triggers
 * Cloud Functions para notificar sobre nuevos leads
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendEmail, formatDateTime } from '../emailService';
import { getLeadNotificationTemplate } from '../templates/leadNotification';

const db = admin.firestore();

// ============================================
// Types
// ============================================

interface ProjectData {
    name?: string;
    userId?: string;
    ownerEmail?: string;
}

interface UserData {
    email?: string;
    displayName?: string;
}

// ============================================
// Lead Created Trigger
// ============================================

/**
 * Trigger: When a new lead is created in a project
 * Action: Send notification email to project owner
 */
export const onLeadCreatedSendEmail = functions.firestore
    .document('users/{userId}/projects/{projectId}/leads/{leadId}')
    .onCreate(async (snapshot, context) => {
        const { userId, projectId, leadId } = context.params;
        const lead = snapshot.data();

        console.log(`Processing new lead ${leadId} for project ${projectId}`);

        try {
            // Get project info
            const projectDoc = await db.doc(`users/${userId}/projects/${projectId}`).get();
            const projectData = projectDoc.data() as ProjectData | undefined;
            
            if (!projectData) {
                console.log('Project not found, skipping email notification');
                return;
            }

            // Get user info (owner)
            const userDoc = await db.doc(`users/${userId}`).get();
            const userData = userDoc.data() as UserData | undefined;
            
            const ownerEmail = projectData.ownerEmail || userData?.email;
            
            if (!ownerEmail) {
                console.log('Owner email not found, skipping email notification');
                return;
            }

            // Get email settings if available
            let emailSettings: any = null;
            try {
                const emailSettingsDoc = await db.doc(`users/${userId}/projects/${projectId}/settings/email`).get();
                if (emailSettingsDoc.exists) {
                    emailSettings = emailSettingsDoc.data();
                }
            } catch (err) {
                // Email settings not configured, use defaults
            }

            const siteName = projectData.name || 'Tu Sitio Web';
            const submittedAt = formatDateTime(lead.createdAt || new Date());
            const dashboardUrl = `https://quimera.ai/dashboard/leads/${leadId}?project=${projectId}`;

            // Prepare email content
            const emailHtml = getLeadNotificationTemplate({
                siteName,
                logoUrl: emailSettings?.logoUrl,
                primaryColor: emailSettings?.primaryColor || '#4f46e5',
                leadName: lead.name || 'Sin nombre',
                leadEmail: lead.email || 'Sin email',
                leadPhone: lead.phone,
                leadCompany: lead.company,
                leadMessage: lead.message || lead.notes,
                leadSource: formatLeadSource(lead.source),
                leadScore: lead.leadScore,
                leadTags: lead.tags,
                submittedAt,
                dashboardUrl,
            });

            // Send email
            const result = await sendEmail({
                to: ownerEmail,
                subject: `Nuevo Lead: ${lead.name || lead.email || 'Contacto'} - ${siteName}`,
                html: emailHtml,
                from: `${siteName} <noreply@quimera.ai>`,
                replyTo: lead.email,
                tags: [
                    { name: 'type', value: 'lead-notification' },
                    { name: 'project', value: projectId },
                    { name: 'lead', value: leadId },
                ],
            });

            // Log the email
            await db.collection(`users/${userId}/projects/${projectId}/emailLogs`).add({
                type: 'transactional',
                templateId: 'lead-notification',
                recipientEmail: ownerEmail,
                subject: `Nuevo Lead: ${lead.name || lead.email}`,
                status: result.success ? 'sent' : 'failed',
                providerMessageId: result.messageId,
                errorMessage: result.error,
                leadId,
                provider: 'resend',
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`Lead notification email ${result.success ? 'sent' : 'failed'} for lead ${leadId}`);

        } catch (error) {
            console.error('Error sending lead notification email:', error);
        }
    });

// ============================================
// Helper Functions
// ============================================

/**
 * Format lead source for display
 */
function formatLeadSource(source: string | undefined): string {
    const sourceMap: Record<string, string> = {
        'contact-form': 'Formulario de Contacto',
        'newsletter': 'Newsletter',
        'chat-widget': 'Chat Widget',
        'popup': 'Popup',
        'landing-page': 'Landing Page',
        'api': 'API',
        'import': 'Importacion',
        'manual': 'Manual',
    };

    return sourceMap[source || ''] || source || 'Desconocido';
}

// ============================================
// Lead Score Update Trigger (Optional)
// ============================================

/**
 * Trigger: When a lead is updated with high score
 * Action: Send notification for hot leads
 */
export const onLeadScoreUpdate = functions.firestore
    .document('users/{userId}/projects/{projectId}/leads/{leadId}')
    .onUpdate(async (change, context) => {
        const { userId, projectId, leadId } = context.params;
        const before = change.before.data();
        const after = change.after.data();

        // Check if lead score crossed the "hot lead" threshold (e.g., 80)
        const hotLeadThreshold = 80;
        const wasNotHot = (before.leadScore || 0) < hotLeadThreshold;
        const isNowHot = (after.leadScore || 0) >= hotLeadThreshold;

        if (wasNotHot && isNowHot) {
            console.log(`Lead ${leadId} became hot lead with score ${after.leadScore}`);

            try {
                // Get project and user info
                const projectDoc = await db.doc(`users/${userId}/projects/${projectId}`).get();
                const projectData = projectDoc.data() as ProjectData | undefined;
                
                const userDoc = await db.doc(`users/${userId}`).get();
                const userData = userDoc.data() as UserData | undefined;
                
                const ownerEmail = projectData?.ownerEmail || userData?.email;
                
                if (!ownerEmail) return;

                const siteName = projectData?.name || 'Tu Sitio Web';
                const dashboardUrl = `https://quimera.ai/dashboard/leads/${leadId}?project=${projectId}`;

                // Send a special hot lead alert
                const emailHtml = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                            <h1 style="margin: 0; font-size: 24px;">🔥 Lead Caliente!</h1>
                            <p style="margin: 10px 0 0 0;">Un lead ha alcanzado puntuacion alta</p>
                        </div>
                        
                        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                            <h2 style="margin: 0 0 10px 0; font-size: 18px;">${after.name || 'Sin nombre'}</h2>
                            <p style="margin: 0 0 5px 0; color: #666;">${after.email}</p>
                            ${after.phone ? `<p style="margin: 0; color: #666;">Tel: ${after.phone}</p>` : ''}
                            <div style="margin-top: 15px; padding: 10px; background: #dcfce7; border-radius: 4px;">
                                <strong style="color: #166534;">Lead Score: ${after.leadScore}/100</strong>
                            </div>
                        </div>
                        
                        <div style="text-align: center;">
                            <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                                Ver Lead
                            </a>
                        </div>
                        
                        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
                            Notificacion automatica de ${siteName}
                        </p>
                    </div>
                `;

                await sendEmail({
                    to: ownerEmail,
                    subject: `🔥 Lead Caliente: ${after.name || after.email} (Score: ${after.leadScore})`,
                    html: emailHtml,
                    from: `${siteName} <noreply@quimera.ai>`,
                    tags: [
                        { name: 'type', value: 'hot-lead-alert' },
                        { name: 'project', value: projectId },
                        { name: 'lead', value: leadId },
                    ],
                });

                console.log(`Hot lead alert sent for lead ${leadId}`);

            } catch (error) {
                console.error('Error sending hot lead alert:', error);
            }
        }
    });











