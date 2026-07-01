import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  AGENCY_JSON_HEADERS,
  AgencyApiError,
  getSupabaseAnonKey,
  getSupabaseFunctionUrl,
  handleAgencyApiError,
  normalizeString,
  readRawBody,
  sendJson,
  sendMethodNotAllowed,
} from '../_lib/stripeEdgeProxy.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, AGENCY_JSON_HEADERS);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendMethodNotAllowed(res);
    return;
  }

  try {
    const signature = normalizeString(req.headers['stripe-signature']);
    if (!signature) {
      sendJson(res, 400, { error: 'Missing Stripe signature.' });
      return;
    }

    const rawBody = await readRawBody(req);
    const anonKey = getSupabaseAnonKey();
    const response = await fetch(getSupabaseFunctionUrl('stripe-webhook'), {
      method: 'POST',
      headers: {
        'Content-Type': normalizeString(req.headers['content-type']) || 'application/json',
        'stripe-signature': signature,
        apikey: anonKey,
      },
      body: rawBody,
    });

    const responseBody = await response.text();
    res.writeHead(response.status, {
      'Content-Type': response.headers.get('content-type') || 'application/json; charset=utf-8',
    });
    res.end(responseBody);
  } catch (error) {
    if (error instanceof AgencyApiError) {
      handleAgencyApiError(res, error, 'Failed to process Agency Stripe webhook.');
      return;
    }
    handleAgencyApiError(res, error, 'Failed to process Agency Stripe webhook.');
  }
}
