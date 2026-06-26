import type { IncomingMessage, ServerResponse } from 'node:http';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';
import { createAppointmentCheckoutSession } from '../../../services/appointments/appointmentCheckoutService.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        req.destroy();
        reject(new Error('Request body too large.'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (_error) {
        reject(Object.assign(new Error('Invalid JSON body.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function normalizeString(value: unknown, maxLength = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function requestOrigin(req: IncomingMessage): string {
  const origin = normalizeString(req.headers.origin);
  if (origin) return origin;

  const referer = normalizeString(req.headers.referer);
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch (_error) {
      // Fall through to configured origin.
    }
  }

  return process.env.APP_BASE_URL || process.env.VITE_PUBLIC_APP_URL || 'https://quimera.ai';
}

function safeReturnUrl(req: IncomingMessage, value: unknown, status: 'success' | 'cancelled'): string {
  const origin = requestOrigin(req);
  const fallback = new URL('/', origin);
  fallback.searchParams.set('appointmentPayment', status);

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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, JSON_HEADERS);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readBody(req);
    const projectId = normalizeString(body.projectId, 120);
    const appointmentId = normalizeString(body.appointmentId, 120);
    const orderId = normalizeString(body.orderId, 120);

    if (!projectId || !appointmentId || !orderId) {
      send(res, 400, { error: 'projectId, appointmentId, and orderId are required.' });
      return;
    }

    const result = await createAppointmentCheckoutSession(getSupabaseAdmin(), {
      projectId,
      appointmentId,
      orderId,
      successUrl: safeReturnUrl(req, body.successUrl, 'success'),
      cancelUrl: safeReturnUrl(req, body.cancelUrl, 'cancelled'),
    }, {
      stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    });

    send(res, 200, result);
  } catch (error: any) {
    send(res, error.status || 500, { error: error.message || 'Failed to create appointment checkout.' });
  }
}
