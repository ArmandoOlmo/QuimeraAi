export interface SendGridWebhookSignatureInput {
    publicKey: string;
    signature: string;
    timestamp: string;
    rawBody: string | Uint8Array;
}

export async function verifySendGridWebhookSignature(input: SendGridWebhookSignatureInput) {
    const publicKey = await importSendGridPublicKey(input.publicKey);
    if (!publicKey) return false;

    const signature = decodeSendGridSignature(input.signature);
    if (!signature) return false;

    const payload = concatBytes(
        new TextEncoder().encode(input.timestamp),
        toBytes(input.rawBody),
    );

    return crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        signature,
        payload,
    );
}

async function importSendGridPublicKey(value: string) {
    const pem = String(value || '').trim();
    if (!pem) return null;
    const body = pem
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s+/g, '');
    if (!body) return null;

    try {
        return await crypto.subtle.importKey(
            'spki',
            base64ToBytes(body),
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['verify'],
        );
    } catch (_error) {
        return null;
    }
}

function decodeSendGridSignature(value: string) {
    const decoded = base64ToBytes(value);
    if (decoded.length === 64) return decoded;
    return decodeDerEcdsaSignature(decoded, 32);
}

function decodeDerEcdsaSignature(bytes: Uint8Array, scalarLength: number) {
    let offset = 0;
    if (bytes[offset++] !== 0x30) return null;
    const sequenceLength = readDerLength(bytes, offset);
    if (!sequenceLength) return null;
    offset = sequenceLength.offset;
    if (sequenceLength.length + offset > bytes.length) return null;

    const r = readDerInteger(bytes, offset, scalarLength);
    if (!r) return null;
    offset = r.offset;
    const s = readDerInteger(bytes, offset, scalarLength);
    if (!s) return null;

    return concatBytes(r.value, s.value);
}

function readDerLength(bytes: Uint8Array, offset: number) {
    const first = bytes[offset++];
    if (first === undefined) return null;
    if ((first & 0x80) === 0) return { length: first, offset };

    const count = first & 0x7f;
    if (count < 1 || count > 2 || offset + count > bytes.length) return null;
    let length = 0;
    for (let index = 0; index < count; index += 1) {
        length = (length << 8) | bytes[offset++];
    }
    return { length, offset };
}

function readDerInteger(bytes: Uint8Array, offset: number, scalarLength: number) {
    if (bytes[offset++] !== 0x02) return null;
    const length = readDerLength(bytes, offset);
    if (!length) return null;
    offset = length.offset;
    const end = offset + length.length;
    if (end > bytes.length) return null;

    let value = bytes.slice(offset, end);
    while (value.length > scalarLength && value[0] === 0) value = value.slice(1);
    if (value.length > scalarLength) return null;

    const padded = new Uint8Array(scalarLength);
    padded.set(value, scalarLength - value.length);
    return { value: padded, offset: end };
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

function toBytes(value: string | Uint8Array) {
    return value instanceof Uint8Array ? value : new TextEncoder().encode(value);
}

function base64ToBytes(value: string) {
    const binary = atob(String(value || '').trim());
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}
