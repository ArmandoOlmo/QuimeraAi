/**
 * Magic Link Authentication
 * Cloud Functions for passwordless authentication via email
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { sendEmail } from '../email/emailService';

const db = admin.firestore();
const auth = admin.auth();

// Configuration
const APP_URL = process.env.APP_URL || 'https://app.quimera.ai';
const TOKEN_EXPIRY_MINUTES = 15;

// =============================================================================
// TYPES
// =============================================================================

interface MagicLinkToken {
    email: string;
    token: string;
    redirectUrl?: string;
    tenantId?: string;
    expiresAt: admin.firestore.Timestamp;
    createdAt: admin.firestore.Timestamp;
    used: boolean;
    usedAt?: admin.firestore.Timestamp;
    ipAddress?: string;
    userAgent?: string;
}

// =============================================================================
// SEND MAGIC LINK
// =============================================================================

/**
 * Send a magic link to the user's email
 */
export const sendMagicLinkEmail = functions.https.onCall(
    async (data: { email: string; redirectUrl?: string; tenantId?: string }, context) => {
        const { email, redirectUrl, tenantId } = data;

        if (!email || !email.includes('@')) {
            throw new functions.https.HttpsError('invalid-argument', 'Email inválido');
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Rate limiting: max 5 magic links per email per hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentTokens = await db.collection('magicLinkTokens')
            .where('email', '==', normalizedEmail)
            .where('createdAt', '>', admin.firestore.Timestamp.fromDate(oneHourAgo))
            .get();

        if (recentTokens.size >= 5) {
            throw new functions.https.HttpsError(
                'resource-exhausted',
                'Demasiadas solicitudes. Intenta de nuevo en una hora.'
            );
        }

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000)
        );

        // Store token
        const tokenData: MagicLinkToken = {
            email: normalizedEmail,
            token,
            redirectUrl,
            tenantId,
            expiresAt,
            createdAt: admin.firestore.Timestamp.now(),
            used: false,
        };

        await db.collection('magicLinkTokens').add(tokenData);

        // Build magic link URL
        const params = new URLSearchParams({ token });
        if (redirectUrl) {
            params.append('redirect', redirectUrl);
        }
        const magicLinkUrl = `${APP_URL}/auth/magic-link?${params.toString()}`;

        // Get tenant branding if available
        let tenantName = 'Quimera';
        let brandingColor = '#4f46e5';
        
        if (tenantId) {
            const tenantDoc = await db.collection('tenants').doc(tenantId).get();
            if (tenantDoc.exists) {
                const tenantData = tenantDoc.data();
                tenantName = tenantData?.name || tenantName;
                brandingColor = tenantData?.branding?.primaryColor || brandingColor;
            }
        }

        // Send email
        const emailHtml = generateMagicLinkEmailHtml({
            magicLinkUrl,
            email: normalizedEmail,
            tenantName,
            brandingColor,
            expiresInMinutes: TOKEN_EXPIRY_MINUTES,
        });

        try {
            await sendEmail({
                to: normalizedEmail,
                subject: `Tu enlace de acceso a ${tenantName}`,
                html: emailHtml,
            });

            functions.logger.info('Magic link sent', { email: normalizedEmail });

            return {
                success: true,
                message: 'Magic link enviado',
                expiresInMinutes: TOKEN_EXPIRY_MINUTES,
            };

        } catch (emailError) {
            functions.logger.error('Failed to send magic link email', { 
                email: normalizedEmail,
                error: emailError instanceof Error ? emailError.message : 'Unknown error'
            });
            throw new functions.https.HttpsError('internal', 'Error enviando email');
        }
    }
);

// =============================================================================
// VERIFY MAGIC LINK
// =============================================================================

/**
 * Verify magic link token and return custom auth token
 */
export const verifyMagicLink = functions.https.onCall(
    async (data: { token: string }) => {
        const { token } = data;

        if (!token) {
            throw new functions.https.HttpsError('invalid-argument', 'Token requerido');
        }

        // Find token in database
        const tokenQuery = await db.collection('magicLinkTokens')
            .where('token', '==', token)
            .limit(1)
            .get();

        if (tokenQuery.empty) {
            throw new functions.https.HttpsError('not-found', 'Token no válido');
        }

        const tokenDoc = tokenQuery.docs[0];
        const tokenData = tokenDoc.data() as MagicLinkToken;

        // Check if already used
        if (tokenData.used) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Este enlace ya fue utilizado'
            );
        }

        // Check expiration
        if (tokenData.expiresAt.toDate() < new Date()) {
            throw new functions.https.HttpsError(
                'deadline-exceeded',
                'Este enlace ha expirado'
            );
        }

        // Mark token as used
        await tokenDoc.ref.update({
            used: true,
            usedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Get or create user
        let user: admin.auth.UserRecord;
        
        try {
            user = await auth.getUserByEmail(tokenData.email);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // Create new user
                user = await auth.createUser({
                    email: tokenData.email,
                    emailVerified: true, // Magic link verifies email
                });

                // Create user document
                await db.collection('users').doc(user.uid).set({
                    email: tokenData.email,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    authProvider: 'magic-link',
                });

                functions.logger.info('New user created via magic link', { 
                    uid: user.uid, 
                    email: tokenData.email 
                });
            } else {
                throw error;
            }
        }

        // Generate custom auth token
        const customToken = await auth.createCustomToken(user.uid, {
            authMethod: 'magic-link',
        });

        functions.logger.info('Magic link verified', { 
            email: tokenData.email,
            uid: user.uid,
        });

        return {
            success: true,
            customToken,
            email: tokenData.email,
            redirectUrl: tokenData.redirectUrl,
            isNewUser: !user.metadata.lastSignInTime,
        };
    }
);

// =============================================================================
// CLEANUP EXPIRED TOKENS
// =============================================================================

/**
 * Scheduled function to clean up expired tokens
 */
export const cleanupExpiredMagicLinks = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async () => {
        const now = admin.firestore.Timestamp.now();
        
        const expiredTokens = await db.collection('magicLinkTokens')
            .where('expiresAt', '<', now)
            .limit(500)
            .get();

        const batch = db.batch();
        expiredTokens.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        functions.logger.info('Cleaned up expired magic link tokens', { 
            count: expiredTokens.size 
        });

        return null;
    });

// =============================================================================
// EMAIL TEMPLATE
// =============================================================================

interface MagicLinkEmailData {
    magicLinkUrl: string;
    email: string;
    tenantName: string;
    brandingColor: string;
    expiresInMinutes: number;
}

function generateMagicLinkEmailHtml(data: MagicLinkEmailData): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tu enlace de acceso</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="min-height: 100vh;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 24px; text-align: center;">
                            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, ${data.brandingColor} 0%, ${adjustColor(data.brandingColor, -20)} 100%); border-radius: 16px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
                                <span style="color: white; font-size: 28px;">✨</span>
                            </div>
                            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">
                                Tu enlace de acceso
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 0 40px 32px;">
                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151; text-align: center;">
                                Haz clic en el botón de abajo para acceder a <strong>${escapeHtml(data.tenantName)}</strong>. 
                                Este enlace expira en ${data.expiresInMinutes} minutos.
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="${escapeHtml(data.magicLinkUrl)}" style="display: inline-block; background-color: ${data.brandingColor}; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 12px; box-shadow: 0 4px 12px ${data.brandingColor}40;">
                                            Acceder Ahora
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; text-align: center;">
                                Si no solicitaste este enlace, puedes ignorar este email de forma segura.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                Este email fue enviado a ${escapeHtml(data.email)}
                            </p>
                        </td>
                    </tr>
                    
                </table>
                
                <p style="margin: 24px 0 0; font-size: 11px; color: #9ca3af; text-align: center;">
                    Powered by <a href="https://quimera.ai" style="color: #6b7280; text-decoration: none;">Quimera.ai</a>
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function adjustColor(hex: string, percent: number): string {
    hex = hex.replace('#', '');
    
    const num = parseInt(hex, 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
