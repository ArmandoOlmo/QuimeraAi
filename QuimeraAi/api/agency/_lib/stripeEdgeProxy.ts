import type { IncomingMessage, ServerResponse } from 'node:http';

const BODY_LIMIT_BYTES = 1024 * 1024;

export const AGENCY_JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export class AgencyApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, AGENCY_JSON_HEADERS);
  res.end(JSON.stringify(body));
}

export function sendMethodNotAllowed(res: ServerResponse): void {
  sendJson(res, 405, { error: 'Method not allowed.' });
}

export function readRawBody(req: IncomingMessage, limitBytes = BODY_LIMIT_BYTES): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > limitBytes) {
        req.destroy();
        reject(new AgencyApiError('Request body too large.', 413));
      }
    });

    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

export async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const raw = await readRawBody(req);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new AgencyApiError('JSON body must be an object.', 400);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AgencyApiError) throw error;
    throw new AgencyApiError('Invalid JSON body.', 400);
  }
}

export function normalizeString(value: unknown, maxLength = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

export function requireString(value: unknown, field: string, maxLength = 500): string {
  const normalized = normalizeString(value, maxLength);
  if (!normalized) throw new AgencyApiError(`${field} is required.`, 400);
  return normalized;
}

export function optionalFiniteNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new AgencyApiError(`${field} must be a finite number.`, 400);
  return amount;
}

export function optionalPositiveNumber(value: unknown, field: string): number | undefined {
  const amount = optionalFiniteNumber(value, field);
  if (amount === undefined) return undefined;
  if (amount <= 0) throw new AgencyApiError(`${field} must be greater than 0.`, 400);
  return amount;
}

export function bearerTokenFromRequest(req: IncomingMessage): string | null {
  const authorization = normalizeString(req.headers.authorization);
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  return token ? `Bearer ${token}` : null;
}

export function requireBearerToken(req: IncomingMessage): string {
  const bearer = bearerTokenFromRequest(req);
  if (!bearer) throw new AgencyApiError('Authorization bearer token is required.', 401);
  return bearer;
}

export function requestOrigin(req: IncomingMessage): string {
  const origin = normalizeString(req.headers.origin);
  if (origin) return origin;

  const referer = normalizeString(req.headers.referer);
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch (_error) {
      // Fall through to configured app origin.
    }
  }

  return process.env.APP_BASE_URL || process.env.VITE_PUBLIC_APP_URL || 'https://quimera.ai';
}

export function safePaymentReturnUrl(
  req: IncomingMessage,
  token: string,
  value: unknown,
  checkoutStatus: 'success' | 'cancelled',
): string {
  const origin = requestOrigin(req);
  const fallback = new URL(`/pay/${encodeURIComponent(token)}`, origin);
  fallback.searchParams.set('checkout', checkoutStatus);

  const candidate = normalizeString(value, 2000);
  if (!candidate) return fallback.toString();

  try {
    const url = new URL(candidate, origin);
    const allowedOrigins = new Set([
      new URL(origin).origin,
      process.env.APP_BASE_URL ? new URL(process.env.APP_BASE_URL).origin : '',
      process.env.VITE_PUBLIC_APP_URL ? new URL(process.env.VITE_PUBLIC_APP_URL).origin : '',
    ].filter(Boolean));

    if (!['http:', 'https:'].includes(url.protocol)) return fallback.toString();
    if (!allowedOrigins.has(url.origin)) return fallback.toString();
    return url.toString();
  } catch (_error) {
    return fallback.toString();
  }
}

export function getSupabaseAnonKey(): string {
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!key) {
    throw new AgencyApiError('SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY is required for Agency billing API routes.');
  }
  return key;
}

export type SupabaseAgencyFunctionName = 'stripe-api' | 'stripe-webhook' | 'onboarding-api';

export function getSupabaseFunctionUrl(functionName: SupabaseAgencyFunctionName): string {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new AgencyApiError('SUPABASE_URL or VITE_SUPABASE_URL is required for Agency billing API routes.');
  }
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${functionName}`;
}

export function unwrapSupabaseFunctionBody(body: unknown): unknown {
  if (
    body &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    'data' in body &&
    !('error' in body)
  ) {
    return (body as { data: unknown }).data;
  }

  return body;
}

export async function invokeAgencyStripeAction(
  action: string,
  payload: Record<string, unknown>,
  options: { authorization?: string | null } = {},
): Promise<{ status: number; body: unknown }> {
  return invokeSupabaseFunctionAction('stripe-api', action, payload, options);
}

export async function invokeAgencyOnboardingAction(
  action: string,
  payload: Record<string, unknown>,
  options: { authorization?: string | null } = {},
): Promise<{ status: number; body: unknown }> {
  return invokeSupabaseFunctionAction('onboarding-api', action, payload, options);
}

export async function invokeSupabaseFunctionAction(
  functionName: Exclude<SupabaseAgencyFunctionName, 'stripe-webhook'>,
  action: string,
  payload: Record<string, unknown>,
  options: { authorization?: string | null } = {},
): Promise<{ status: number; body: unknown }> {
  const anonKey = getSupabaseAnonKey();
  const authorization = options.authorization || `Bearer ${anonKey}`;

  const response = await fetch(getSupabaseFunctionUrl(functionName), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: authorization,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const text = await response.text();
  let body: unknown = {};

  if (text) {
    try {
      body = JSON.parse(text);
    } catch (_error) {
      body = { error: text };
    }
  }

  return {
    status: response.status,
    body: unwrapSupabaseFunctionBody(body),
  };
}

export function handleAgencyApiError(res: ServerResponse, error: unknown, fallback: string): void {
  const status = error instanceof AgencyApiError ? error.status : 500;
  const message = error instanceof Error ? error.message : fallback;
  sendJson(res, status, { error: message || fallback });
}
