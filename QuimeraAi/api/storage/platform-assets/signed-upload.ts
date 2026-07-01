import type { IncomingMessage, ServerResponse } from 'node:http';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';
import { requireSupabaseUser } from '../../_lib/mcpKeys.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BUCKET = 'platform-assets';

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage & { body?: any }): Promise<Record<string, any>> {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function isSafeStoragePath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= 1024 &&
    !path.startsWith('/') &&
    !path.includes('..') &&
    !path.includes('//') &&
    !path.includes('\\')
  );
}

function canUserUploadToPath(userId: string, path: string): boolean {
  const allowedPrefixes = [
    `users/${userId}/`,
    `user_uploads/${userId}/`,
    'admin/assets/',
    'admin/landing_page/',
    'admin_news_video/',
    'agencies/',
    'cms_podcast/',
    'cms_video/',
    'global/files/',
    'media/',
    'templates/',
    'tenants/',
  ];

  return allowedPrefixes.some((prefix) => path.startsWith(prefix));
}

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
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
    const supabase = getSupabaseAdmin();
    const user = await requireSupabaseUser(supabase, req);
    const body = await readJson(req);
    const path = typeof body.path === 'string' ? body.path.trim() : '';
    const upsert = body.upsert !== false;

    if (!isSafeStoragePath(path)) {
      throw Object.assign(new Error('Invalid storage path.'), { status: 400 });
    }

    if (!canUserUploadToPath(user.id, path)) {
      throw Object.assign(new Error('Storage path is not allowed for this user.'), { status: 403 });
    }

    const { data, error } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUploadUrl(path, { upsert });

    if (error || !data) {
      throw Object.assign(new Error(error?.message || 'Unable to create signed upload URL.'), {
        status: 500,
      });
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    send(res, 200, {
      bucket: BUCKET,
      path: data.path || path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: publicUrlData.publicUrl,
    });
  } catch (error: any) {
    send(res, error.status || 500, {
      error: error.message || 'Internal server error',
      details: error.details,
    });
  }
}
