#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const tenantId = process.argv[2] || process.env.TENANT_ID;
const name = process.argv[3] || process.env.KEY_NAME || 'MCP Agent Key';
const projectId = process.env.PROJECT_ID || null;
const scopes = (process.env.SCOPES || [
  'projects:read',
  'projects:write',
  'templates:read',
  'templates:write',
  'ai:generate_content',
  'ai:generate_image',
  'ai:generate_batch',
  'ai:apply_to_project',
  'leads:read',
  'leads:write',
  'cms:read',
  'cms:write',
  'commerce:read',
  'commerce:write',
  'appointments:read',
  'appointments:write',
  'domains:read',
  'domains:write',
  'reports:read',
].join(','))
  .split(',')
  .map((scope) => scope.trim())
  .filter(Boolean);

if (!supabaseUrl || !serviceRoleKey) {
  console.error('SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

if (!tenantId) {
  console.error('Usage: TENANT_ID=<tenant-id> node scripts/create-mcp-api-key.mjs');
  console.error('Or: node scripts/create-mcp-api-key.mjs <tenant-id> "Key name"');
  process.exit(1);
}

const prefix = 'qma_live';
const secret = randomBytes(32).toString('base64url');
const apiKey = `${prefix}_${secret}`;
const keyHash = createHash('sha256').update(apiKey).digest('hex');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase
  .from('api_keys')
  .insert({
    tenant_id: tenantId,
    project_id: projectId,
    name,
    key_hash: keyHash,
    key_prefix: prefix,
    scopes,
    status: 'active',
    metadata: {
      createdBy: 'scripts/create-mcp-api-key.mjs',
      purpose: 'mcp',
    },
  })
  .select('id, tenant_id, project_id, name, key_prefix, scopes, status, created_at')
  .single();

if (error) {
  console.error('Failed to create MCP API key:', error);
  process.exit(1);
}

console.log(JSON.stringify({
  apiKey,
  record: data,
}, null, 2));
