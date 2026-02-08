/**
 * Twilio Voice Webhook - ElevenLabs Conversational AI
 * 
 * Returns TwiML to connect incoming Twilio calls to 
 * the ElevenLabs Conversational AI agent via ConversationRelay.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const AGENT_ID = 'agent_0501kgvccbjte8tthkh8x32exb97';
const ELEVENLABS_API_KEY = 'sk_01669cd1adf56f84bb31a89a453d409ca792440ce88b0cfc';

export const twilioVoiceWebhook = functions.https.onRequest(async (req, res) => {
    const callSid = req.body?.CallSid || 'unknown';
    const from = req.body?.From || 'unknown';

    console.log(`[TwilioVoice] Inbound call from ${from}, CallSid: ${callSid}`);

    try {
        if (!admin.apps.length) { admin.initializeApp(); }

        await admin.firestore().collection('quibo_calls').doc(callSid).set({
            from,
            status: 'initiated',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            agent_id: AGENT_ID,
            type: 'inbound_webhook'
        });

        // Try to get a signed URL from ElevenLabs for the WebSocket connection
        let wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`;

        try {
            const response = await fetch(
                `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${AGENT_ID}`,
                {
                    method: 'GET',
                    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
                }
            );

            if (response.ok) {
                const data = await response.json();
                wsUrl = data.signed_url;
                console.log('[TwilioVoice] Got signed URL from ElevenLabs');
            } else {
                console.warn(`[TwilioVoice] Signed URL failed (${response.status}), using direct URL with API key`);
                wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`;
            }
        } catch (err) {
            console.warn('[TwilioVoice] Could not get signed URL:', err);
        }

        // Use ConversationRelay to connect Twilio directly to ElevenLabs WebSocket
        // Note: ConversationRelay must be enabled on the Twilio account
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <ConversationRelay url="${wsUrl.replace(/&/g, '&amp;')}" dtmfDetection="true" interruptible="true" />
    </Connect>
</Response>`;

        console.log('[TwilioVoice] Returning TwiML with ConversationRelay');

        res.set('Content-Type', 'text/xml');
        res.status(200).send(twiml);
    } catch (error) {
        console.error('[TwilioVoice] Error:', error);
        // Fallback: simple message
        const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="es-ES">Lo siento, hay un problema técnico. Por favor intente más tarde.</Say>
</Response>`;
        res.set('Content-Type', 'text/xml');
        res.status(200).send(fallback);
    }
});
