#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = path.join(tmpdir(), `quimera-readiness-${process.pid}-${Date.now()}`);
const projectConfig = path.join(appRoot, '.vercel', 'project.json');
const probeScript = path.join(appRoot, 'scripts', 'production-readiness-probe.mjs');
const envFile = path.join(tempRoot, '.env.production.local');
const extraArgs = process.argv.slice(2);

mkdirSync(path.join(tempRoot, '.vercel'), { recursive: true });
cpSync(projectConfig, path.join(tempRoot, '.vercel', 'project.json'));

try {
  const pullResult = spawnSync('vercel', [
    'env',
    'pull',
    envFile,
    '--environment=production',
  ], {
    cwd: tempRoot,
    stdio: 'inherit',
    env: process.env,
  });

  if (pullResult.status !== 0) {
    process.exitCode = typeof pullResult.status === 'number' ? pullResult.status : 1;
  } else {
    const productionEnv = parseEnvFile(envFile);
    const supabaseEdgeSecretNames = readSupabaseEdgeSecretNames(appRoot);
    if (supabaseEdgeSecretNames && !productionEnv.SUPABASE_EDGE_SECRET_NAMES) {
      productionEnv.SUPABASE_EDGE_SECRET_NAMES = supabaseEdgeSecretNames;
    }

    const result = spawnSync('node', [
      probeScript,
      '--live',
      '--strict',
      ...extraArgs,
    ], {
      cwd: tempRoot,
      stdio: 'inherit',
      env: { ...process.env, ...productionEnv },
    });

    process.exitCode = typeof result.status === 'number' ? result.status : 1;
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

function parseEnvFile(filePath) {
  const parsed = {};
  const content = readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    const isQuoted = (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (isQuoted) value = value.slice(1, -1);
    if (!value) continue;

    parsed[key] = value;
  }

  return parsed;
}

function readSupabaseEdgeSecretNames(cwd) {
  const result = spawnSync('supabase', ['secrets', 'list'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  if (result.status !== 0 || !result.stdout) return '';

  try {
    const payload = JSON.parse(result.stdout);
    return (payload.secrets || [])
      .map(secret => secret?.name)
      .filter(Boolean)
      .join(',');
  } catch (_error) {
    return '';
  }
}
