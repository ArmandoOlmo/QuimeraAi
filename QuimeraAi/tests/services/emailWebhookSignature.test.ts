import { describe, expect, it } from 'vitest';
import { verifySendGridWebhookSignature } from '../../services/email/emailWebhookSignature.ts';

describe('emailWebhookSignature', () => {
    it('verifies SendGrid ECDSA signatures over timestamp plus raw payload bytes', async () => {
        const keyPair = await crypto.subtle.generateKey(
            { name: 'ECDSA', namedCurve: 'P-256' },
            true,
            ['sign', 'verify'],
        );
        const publicKeyPem = await exportPublicKeyPem(keyPair.publicKey);
        const timestamp = '1771804800';
        const rawBody = JSON.stringify([{ email: 'ada@example.com', event: 'delivered', sg_event_id: 'evt-1' }]);
        const signedPayload = concatBytes(new TextEncoder().encode(timestamp), new TextEncoder().encode(rawBody));
        const signature = new Uint8Array(await crypto.subtle.sign(
            { name: 'ECDSA', hash: 'SHA-256' },
            keyPair.privateKey,
            signedPayload,
        ));
        const sendGridSignature = signature.length === 64 ? p1363ToDer(signature) : signature;

        await expect(verifySendGridWebhookSignature({
            publicKey: publicKeyPem,
            signature: toBase64(sendGridSignature),
            timestamp,
            rawBody,
        })).resolves.toBe(true);

        await expect(verifySendGridWebhookSignature({
            publicKey: publicKeyPem,
            signature: toBase64(sendGridSignature),
            timestamp,
            rawBody: rawBody.replace('delivered', 'bounced'),
        })).resolves.toBe(false);
    });
});

async function exportPublicKeyPem(publicKey: CryptoKey) {
    const spki = new Uint8Array(await crypto.subtle.exportKey('spki', publicKey));
    const base64 = toBase64(spki).replace(/(.{64})/g, '$1\n');
    return `-----BEGIN PUBLIC KEY-----\n${base64}\n-----END PUBLIC KEY-----`;
}

function p1363ToDer(signature: Uint8Array) {
    const r = encodeDerInteger(signature.slice(0, 32));
    const s = encodeDerInteger(signature.slice(32));
    return new Uint8Array([0x30, r.length + s.length, ...r, ...s]);
}

function encodeDerInteger(value: Uint8Array) {
    let normalized = value;
    while (normalized.length > 1 && normalized[0] === 0) normalized = normalized.slice(1);
    if (normalized[0] & 0x80) normalized = new Uint8Array([0, ...normalized]);
    return new Uint8Array([0x02, normalized.length, ...normalized]);
}

function concatBytes(...parts: Uint8Array[]) {
    const length = parts.reduce((total, part) => total + part.length, 0);
    const result = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
    }
    return result;
}

function toBase64(bytes: Uint8Array) {
    return Buffer.from(bytes).toString('base64');
}
