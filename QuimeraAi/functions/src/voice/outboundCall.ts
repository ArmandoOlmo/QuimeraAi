/**
 * Outbound Call Handler for Quibo
 * 
 * Uses ElevenLabs' native outbound call API to initiate calls.
 * ElevenLabs handles the entire call flow: Twilio connection,
 * audio streaming, and AI conversation.
 * 
 * Quibo on the VPS calls this endpoint → we call ElevenLabs API → 
 * ElevenLabs initiates the Twilio call with full AI support.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const ELEVENLABS_API_KEY = 'sk_6084729b375a20b6541e6c67eec258dc03b64414abd4738e';
const AGENT_ID = 'agent_0501kgvccbjte8tthkh8x32exb97';
const PHONE_NUMBER_ID = 'phnum_8501kgwhftqaf0tbdhcym96me1xs';

export const outboundCall = functions.https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    // Validate authorization - use the same OpenClaw key
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'Bearer quibo-master-key-2026') {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const { to, prompt, first_message } = req.body;

    if (!to) {
        res.status(400).json({ error: 'Phone number "to" is required' });
        return;
    }

    console.log(`[Outbound Call] Initiating call to ${to} via ElevenLabs API`);

    try {
        // Use ElevenLabs' native outbound call API
        const elevenlabsResponse = await fetch(
            'https://api.elevenlabs.io/v1/convai/twilio/outbound_call',
            {
                method: 'POST',
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    agent_id: AGENT_ID,
                    agent_phone_number_id: PHONE_NUMBER_ID,
                    to_number: to,
                    // Optional overrides for this specific call
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
 * Logs call status updates to Firestore.
 */
export const outboundCallStatus = functions.https.onRequest(async (req, res) => {
    const { CallSid, CallStatus, CallDuration } = req.body;

    console.log(`[Outbound Call Status] SID: ${CallSid}, Status: ${CallStatus}, Duration: ${CallDuration}`);

    try {
        // Update the call record in Firestore
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
