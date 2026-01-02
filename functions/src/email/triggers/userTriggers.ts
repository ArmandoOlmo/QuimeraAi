/**
 * User Email Triggers
 * Cloud Functions para enviar emails relacionados con usuarios
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendEmail } from '../emailService';
import { getWelcomeUserTemplate } from '../templates/welcomeUser';

const db = admin.firestore();

// ============================================
// Types
// ============================================

interface UserDocument {
    displayName?: string;
    email?: string;
    role?: string;
    subscriptionPlan?: string;
    createdAt?: admin.firestore.Timestamp;
    emailVerified?: boolean;
    welcomeEmailSent?: boolean;
}

interface TenantData {
    subscriptionPlan?: string;
    limits?: {
        maxAiCredits?: number;
    };
}

// ============================================
// User Created - Welcome Email Trigger
// ============================================

/**
 * Trigger: When a new user document is created
 * Action: Send welcome email with quick start guide
 */
export const onUserCreatedSendWelcomeEmail = functions.firestore
    .document('users/{userId}')
    .onCreate(async (snapshot, context) => {
        const { userId } = context.params;
        const userData = snapshot.data() as UserDocument;

        console.log(`Processing new user ${userId} for welcome email`);

        try {
            // Check if user has email
            if (!userData.email) {
                console.log('User has no email, skipping welcome email');
                return;
            }

            // Check if welcome email was already sent (in case of re-creation)
            if (userData.welcomeEmailSent) {
                console.log('Welcome email already sent, skipping');
                return;
            }

            // Get user's plan info
            let planName = 'Free';
            let aiCredits = 30;

            // Check if user has a tenant
            const tenantsQuery = await db.collection('tenants')
                .where('ownerId', '==', userId)
                .limit(1)
                .get();

            if (!tenantsQuery.empty) {
                const tenantData = tenantsQuery.docs[0].data() as TenantData;
                planName = formatPlanName(tenantData.subscriptionPlan);
                aiCredits = tenantData.limits?.maxAiCredits || 30;
            }

            const userName = userData.displayName || userData.email.split('@')[0];
            const dashboardUrl = 'https://quimera.ai/dashboard';

            // Generate email HTML
            const emailHtml = getWelcomeUserTemplate({
                userName,
                userEmail: userData.email,
                planName,
                aiCredits,
                dashboardUrl,
                supportEmail: 'soporte@quimera.ai',
            });

            // Send welcome email
            const result = await sendEmail({
                to: userData.email,
                subject: '¡Bienvenido a Quimera AI! 🚀 Tu cuenta está lista',
                html: emailHtml,
                from: 'Quimera AI <noreply@quimera.ai>',
                tags: [
                    { name: 'type', value: 'welcome-user' },
                    { name: 'user', value: userId },
                ],
            });

            if (result.success) {
                // Mark welcome email as sent
                await snapshot.ref.update({
                    welcomeEmailSent: true,
                    welcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`Welcome email sent successfully to ${userData.email}`);
            } else {
                console.error(`Failed to send welcome email: ${result.error}`);
            }

            // Log the email
            await db.collection('emailLogs').add({
                type: 'welcome',
                templateId: 'welcome-user',
                userId,
                recipientEmail: userData.email,
                subject: '¡Bienvenido a Quimera AI!',
                status: result.success ? 'sent' : 'failed',
                providerMessageId: result.messageId,
                errorMessage: result.error,
                provider: 'resend',
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        } catch (error) {
            console.error('Error sending welcome email:', error);
        }
    });

// ============================================
// User Email Verified Trigger
// ============================================

/**
 * Trigger: When a user verifies their email
 * Action: Send confirmation and next steps email
 */
export const onUserEmailVerified = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        const { userId } = context.params;
        const before = change.before.data() as UserDocument;
        const after = change.after.data() as UserDocument;

        // Check if email was just verified
        const wasNotVerified = !before.emailVerified;
        const isNowVerified = after.emailVerified === true;

        if (wasNotVerified && isNowVerified && after.email) {
            console.log(`User ${userId} verified their email`);

            try {
                const userName = after.displayName || after.email.split('@')[0];
                const dashboardUrl = 'https://quimera.ai/dashboard';

                const emailHtml = `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <img src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032" alt="Quimera AI" style="width: 60px; height: 60px;">
                        </div>
                        
                        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 30px;">
                            <span style="font-size: 48px;">✅</span>
                            <h1 style="color: white; margin: 16px 0 8px 0; font-size: 28px; font-weight: 700;">
                                ¡Email Verificado!
                            </h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">
                                Tu cuenta está completamente activa
                            </p>
                        </div>
                        
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                            Hola <strong>${userName}</strong>,
                        </p>
                        
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                            Has verificado tu email exitosamente. Ahora tienes acceso completo a todas las funciones de Quimera AI.
                        </p>
                        
                        <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                            <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px;">¿Qué sigue?</h3>
                            <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
                                <li>Crea tu primer sitio web con IA</li>
                                <li>Personaliza colores y contenido</li>
                                <li>Conecta tu dominio personalizado</li>
                                <li>Activa el chatbot inteligente</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center;">
                            <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #FACC15 0%, #EAB308 100%); color: #000; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px;">
                                Ir al Dashboard
                            </a>
                        </div>
                        
                        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 40px;">
                            © ${new Date().getFullYear()} Quimera AI. Todos los derechos reservados.
                        </p>
                    </div>
                `;

                await sendEmail({
                    to: after.email,
                    subject: '✅ Email verificado - Tu cuenta Quimera AI está lista',
                    html: emailHtml,
                    from: 'Quimera AI <noreply@quimera.ai>',
                    tags: [
                        { name: 'type', value: 'email-verified' },
                        { name: 'user', value: userId },
                    ],
                });

                console.log(`Email verified confirmation sent to ${after.email}`);

            } catch (error) {
                console.error('Error sending email verified confirmation:', error);
            }
        }
    });

// ============================================
// Helper Functions
// ============================================

/**
 * Format plan name for display
 */
function formatPlanName(plan: string | undefined): string {
    const planMap: Record<string, string> = {
        'free': 'Free',
        'starter': 'Starter',
        'pro': 'Pro',
        'agency': 'Agency',
        'enterprise': 'Enterprise',
    };
    return planMap[plan || 'free'] || 'Free';
}




