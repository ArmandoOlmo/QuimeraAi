export const JSON_HEADERS = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cron-Secret',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};
export function send(res, status, body) {
    res.writeHead(status, JSON_HEADERS);
    res.end(JSON.stringify(body));
}
export function sendNoContent(res) {
    res.writeHead(204, JSON_HEADERS);
    res.end();
}
export function normalizeString(value, maxLength = 2000) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
}
export function readBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', chunk => {
            raw += chunk;
            if (raw.length > 1024 * 1024) {
                req.destroy();
                reject(Object.assign(new Error('Request body too large.'), { status: 413 }));
            }
        });
        req.on('end', () => {
            if (!raw)
                return resolve({});
            try {
                resolve(JSON.parse(raw));
            }
            catch (_error) {
                reject(Object.assign(new Error('Invalid JSON body.'), { status: 400 }));
            }
        });
        req.on('error', reject);
    });
}
export function requestOrigin(req) {
    const origin = normalizeString(req.headers.origin);
    if (origin)
        return origin;
    const referer = normalizeString(req.headers.referer);
    if (referer) {
        try {
            return new URL(referer).origin;
        }
        catch (_error) {
            // Fall through.
        }
    }
    if (process.env.APP_BASE_URL)
        return process.env.APP_BASE_URL;
    if (process.env.VITE_PUBLIC_APP_URL)
        return process.env.VITE_PUBLIC_APP_URL;
    if (process.env.VERCEL_URL)
        return `https://${process.env.VERCEL_URL}`;
    return 'https://quimera.ai';
}
export function googleRedirectUri(req) {
    if (process.env.GOOGLE_CALENDAR_REDIRECT_URI)
        return process.env.GOOGLE_CALENDAR_REDIRECT_URI;
    return `${requestOrigin(req).replace(/\/$/, '')}/api/appointments/google/oauth/callback`;
}
export function safeReturnUrl(req, value) {
    const origin = requestOrigin(req);
    const fallback = `${origin.replace(/\/$/, '')}/appointments`;
    const candidate = normalizeString(value, 2000);
    if (!candidate)
        return fallback;
    try {
        const url = new URL(candidate, origin);
        const allowed = new Set([
            new URL(origin).origin,
            process.env.APP_BASE_URL ? new URL(process.env.APP_BASE_URL).origin : '',
            process.env.VITE_PUBLIC_APP_URL ? new URL(process.env.VITE_PUBLIC_APP_URL).origin : '',
        ].filter(Boolean));
        if (!['http:', 'https:'].includes(url.protocol))
            return fallback;
        if (!allowed.has(url.origin))
            return fallback;
        return url.toString();
    }
    catch (_error) {
        return fallback;
    }
}
export function redirectWithStatus(res, returnUrl, params) {
    const url = new URL(returnUrl);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    res.writeHead(302, { Location: url.toString() });
    res.end();
}
export function tokenFromRequest(req) {
    const cronHeader = req.headers['x-cron-secret'];
    if (typeof cronHeader === 'string')
        return cronHeader;
    const auth = req.headers.authorization;
    const value = Array.isArray(auth) ? auth[0] : auth;
    return value?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
}
//# sourceMappingURL=_lib.js.map