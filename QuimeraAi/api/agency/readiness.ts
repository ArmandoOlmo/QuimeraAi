import type { IncomingMessage, ServerResponse } from 'node:http';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { runAgencyReadinessChecks } from '../../services/agency/agencyReadinessService.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cron-Secret',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(body));
}

function tokenFromRequest(req: IncomingMessage): string | null {
  const cronHeader = req.headers['x-cron-secret'];
  if (typeof cronHeader === 'string') return cronHeader;

  const auth = req.headers.authorization;
  const value = Array.isArray(auth) ? auth[0] : auth;
  return value?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
}

function booleanParam(url: URL, name: string, defaultValue: boolean): boolean {
  const value = url.searchParams.get(name);
  if (value === null) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, JSON_HEADERS);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    send(res, 405, { error: 'Method not allowed' });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    send(res, 500, { error: 'CRON_SECRET is not configured.' });
    return;
  }

  if (tokenFromRequest(req) !== cronSecret) {
    send(res, 401, { error: 'Unauthorized.' });
    return;
  }

  try {
    const url = new URL(req.url || '/', 'https://quimera.ai');
    const result = await runAgencyReadinessChecks({
      supabase: getSupabaseAdmin(),
      env: process.env,
      requireCloudflare: booleanParam(url, 'requireCloudflare', false),
    });
    send(res, result.ok ? 200 : 503, result);
  } catch (error: any) {
    send(res, error.status || 500, { error: error.message || 'Agency readiness probe failed.' });
  }
}
