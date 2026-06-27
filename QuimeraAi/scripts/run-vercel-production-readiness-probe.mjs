#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = path.join(tmpdir(), `quimera-readiness-${process.pid}-${Date.now()}`);
const projectConfig = path.join(appRoot, '.vercel', 'project.json');
const probeScript = path.join(appRoot, 'scripts', 'production-readiness-probe.mjs');
const extraArgs = process.argv.slice(2);

mkdirSync(path.join(tempRoot, '.vercel'), { recursive: true });
cpSync(projectConfig, path.join(tempRoot, '.vercel', 'project.json'));

try {
  const result = spawnSync('vercel', [
    'env',
    'run',
    '--environment=production',
    '--',
    'node',
    probeScript,
    '--live',
    '--strict',
    ...extraArgs,
  ], {
    cwd: tempRoot,
    stdio: 'inherit',
    env: process.env,
  });

  process.exitCode = typeof result.status === 'number' ? result.status : 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
