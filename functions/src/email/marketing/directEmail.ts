/**
 * Direct Email Functions
 * Funciones para envío de emails directos (uno a uno)
 */

import * as functions from 'firebase-functions';
import { sendEmail, isValidEmail } from '../emailService';

interface SendDirectEmailData {
    to: string;
    subject: string;
    html: string;
    storeId?: string; // Optional context mapping
}

/**
 * Send a direct email to a recipient
 * Called from frontend (e.g. Lead Card)
 */
export const sendDirectEmail = functions.https.onCall(async (data: SendDirectEmailData, context) => {
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to send emails.'
        );
    }

    const { to, subject, html } = data;

    // 2. Validation
    if (!to || !isValidEmail(to)) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Invalid or missing recipient email.'
        );
    }

    if (!subject || !subject.trim()) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Email subject is required.'
        );
    }

    if (!html || !html.trim()) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Email content is required.'
        );
    }

    try {
        // 3. Send Email
        const result = await sendEmail({
            to,
            subject,
            html,
            // Tag for tracking
            tags: [
                { name: 'type', value: 'direct_email' },
                { name: 'sender_uid', value: context.auth.uid }
            ]
        });

        if (!result.success) {
            throw new Error(result.error || 'Failed to send email');
        }

        return { success: true, messageId: result.messageId };

    } catch (error: any) {
        console.error('Error sending direct email:', error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Error sending email'
        );
    }
});
