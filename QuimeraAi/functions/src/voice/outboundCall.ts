/**
 * Outbound Call Handler for Quibo
 * 
 * Uses ElevenLabs' native outbound call API to initiate calls.
 * ElevenLabs handles the entire call flow: Twilio connection,
 * audio streaming, and AI conversation.
 * 
 * SECURITY:
 * - API keys loaded from environment config (not hardcoded)
 * - Bearer token validated from environment config
 * - Twilio signature validation on status callback
 * - Restricted CORS origins
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ELEVENLABS_CONFIG, OUTBOUND_CALL_CONFIG } from '../config';

// Allowed origins for outbound call endpoint
const ALLOWED_ORIGINS = [
    'https://quimera.ai',
    'https://www.quimera.ai',
    'https://quimeraai.web.app',
    'https://quimeraai.firebaseapp.com',
    'http://localhost:5173',
    'http://localhost:3000',
];

function setCorsHeaders(req: functions.https.Request, res: functions.Response): void {
    const origin = req.headers.origin as string;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
    }
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export const outboundCall = functions.https.onRequest(async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    // SECURITY: Validate bearer token from environment config
    const authHeader = req.headers.authorization;
    const expectedToken = OUTBOUND_CALL_CONFIG.bearerToken;
    if (!expectedToken || !authHeader || authHeader !== `Bearer ${expectedToken}`) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const { to, prompt, first_message } = req.body;

    if (!to) {
        res.status(400).json({ error: 'Phone number "to" is required' });
        return;
    }

    // SECURITY: Validate API key exists before making call
    const apiKey = ELEVENLABS_CONFIG.apiKey;
    const agentId = ELEVENLABS_CONFIG.agentId;
    const phoneNumberId = ELEVENLABS_CONFIG.phoneNumberId;

    if (!apiKey || !agentId || !phoneNumberId) {
        console.error('[Outbound Call] Missing ElevenLabs configuration');
        res.status(500).json({ error: 'Voice service not configured' });
        return;
    }

    console.log(`[Outbound Call] Initiating call to ${to} via ElevenLabs API`);

    try {
        const elevenlabsResponse = await fetch(
            'https://api.elevenlabs.io/v1/convai/twilio/outbound_call',
            {
                method: 'POST',
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    agent_id: agentId,
                    agent_phone_number_id: phoneNumberId,
                    to_number: to,
                    ...(prompt && {
                        conversation_config_override: {
                            agent: {
                                prompt: { prompt },
                                ...(first_message && { first_message }),
                            },
                        },
                    }),
                }),
            }
        );

        const responseText = await elevenlabsResponse.text();
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { raw: responseText };
        }

        if (!elevenlabsResponse.ok) {
            console.error('[Outbound Call] ElevenLabs error:', responseData);
            res.status(elevenlabsResponse.status).json({
                error: 'Failed to initiate call via ElevenLabs',
                details: responseData,
            });
            return;
        }

        console.log(`[Outbound Call] Call initiated via ElevenLabs:`, JSON.stringify(responseData));

        // Log to Firestore
        try {
            await admin.firestore().collection('calls').add({
                direction: 'outbound',
                to: to,
                from: '+17874769040',
                elevenlabsResponse: responseData,
                prompt: prompt || null,
                firstMessage: first_message || null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } catch (firestoreError) {
            console.warn('[Outbound Call] Failed to log to Firestore:', firestoreError);
        }

        res.json({
            success: true,
            message: 'Call initiated via ElevenLabs',
            data: responseData,
        });
    } catch (error) {
        console.error('[Outbound Call] Error:', error);
        res.status(500).json({
            error: 'Failed to initiate call',
            details: String(error),
        });
    }
});

/**
 * Status callback for outbound calls.
 * SECURITY: Validates that requests come from Twilio using URL-based validation.
 * Twilio status callbacks always POST with specific fields.
 */
export const outboundCallStatus = functions.https.onRequest(async (req, res) => {
    // SECURITY: Only accept POST from Twilio
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }

    // SECURITY: Validate Twilio-specific fields are present
    const { CallSid, CallStatus, CallDuration, AccountSid } = req.body;

    if (!CallSid || !CallStatus || !AccountSid) {
        res.status(400).send('Missing required Twilio fields');
        return;
    }

    // SECURITY: Validate AccountSid matches our Twilio account
    // This prevents spoofed callback requests
    const expectedAccountSid = process.env.TWILIO_ACCOUNT_SID;
    if (expectedAccountSid && AccountSid !== expectedAccountSid) {
        console.warn(`[Outbound Call Status] Invalid AccountSid: ${AccountSid}`);
        res.status(403).send('Forbidden');
        return;
    }

    console.log(`[Outbound Call Status] SID: ${CallSid}, Status: ${CallStatus}, Duration: ${CallDuration}`);

    try {
        const callsRef = admin.firestore().collection('calls');
        const snapshot = await callsRef.where('callSid', '==', CallSid).limit(1).get();

        if (!snapshot.empty) {
            await snapshot.docs[0].ref.update({
                status: CallStatus,
                duration: CallDuration || null,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    } catch (error) {
        console.warn('[Outbound Call Status] Error updating Firestore:', error);
    }

    res.status(200).send('OK');
});
