import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const rootDir = process.cwd();

const CRON_ROUTES = [
  {
    name: 'email outbox cron',
    source: 'api/email/jobs/run.ts',
    method: 'GET',
    load: () => import('../../api/email/jobs/run.ts'),
  },
  {
    name: 'appointments email cron',
    source: 'api/appointments/jobs/run.ts',
    method: 'GET',
    load: () => import('../../api/appointments/jobs/run.ts'),
  },
  {
    name: 'Google Calendar sync cron',
    source: 'api/appointments/google/jobs/run.ts',
    method: 'GET',
    load: () => import('../../api/appointments/google/jobs/run.ts'),
  },
  {
    name: 'MCP generation cron',
    source: 'api/mcp/jobs/run.ts',
    method: 'POST',
    load: () => import('../../api/mcp/jobs/run.ts'),
  },
] as const;

const SERVERLESS_SERVICE_IMPORTS = [
  {
    name: 'emailProviderService',
    load: () => import('../../services/email/serverless/emailProviderService.ts'),
  },
  {
    name: 'emailOutboxProcessor',
    load: () => import('../../services/email/serverless/emailOutboxProcessor.ts'),
  },
  {
    name: 'emailCrossModuleDispatcher',
    load: () => import('../../services/email/serverless/emailCrossModuleDispatcher.ts'),
  },
  {
    name: 'appointmentEmailDeliveryService',
    load: () => import('../../services/appointments/serverless/appointmentEmailDeliveryService.ts'),
  },
] as const;

interface MockResponse {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string;
  writeHead: (status: number, headers: Record<string, string>) => void;
  end: (body?: string) => void;
}

function createResponse(): MockResponse {
  return {
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
    },
    end(body) {
      this.body = body;
    },
  };
}

function createRequest(method: string, headers: Record<string, string> = {}) {
  return {
    method,
    headers,
    url: '/api/test',
  };
}

async function loadHandler(load: () => Promise<{ default: unknown }>) {
  const module = await load();
  return module.default as (req: unknown, res: MockResponse) => Promise<void>;
}

describe('serverless cron API import smoke', () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it.each(CRON_ROUTES)('imports $name without requiring production secrets', async ({ load }) => {
    await expect(load()).resolves.toBeTruthy();
  });

  it.each(SERVERLESS_SERVICE_IMPORTS)('imports serverless service $name', async ({ load }) => {
    await expect(load()).resolves.toBeTruthy();
  });

  it.each(CRON_ROUTES)('returns 401 for $name when CRON_SECRET is set but token is invalid', async ({ load, method }) => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const handler = await loadHandler(load);
    const res = createResponse();

    await handler(createRequest(method), res);

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body || '{}')).toMatchObject({ error: 'Unauthorized.' });
  });

  it.each(CRON_ROUTES)('fails clearly for $name when CRON_SECRET is missing', async ({ load, method }) => {
    delete process.env.CRON_SECRET;
    const handler = await loadHandler(load);
    const res = createResponse();

    await handler(createRequest(method), res);

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body || '{}').error).toContain('CRON_SECRET');
  });

  it('keeps the Vercel cron runtime graph free of runtime .ts import specifiers', () => {
    const violations = collectRuntimeTsImportViolations(CRON_ROUTES.map(route => route.source));

    expect(violations).toEqual([]);
  });

  it('keeps Cloudflare deployment credentials server-only', () => {
    const envExample = readFileSync(path.resolve(rootDir, '.env.example'), 'utf8');
    const deploymentService = readFileSync(path.resolve(rootDir, 'utils/deploymentService.ts'), 'utf8');

    expect(envExample).not.toContain('VITE_CLOUDFLARE_TOKEN');
    expect(deploymentService).not.toMatch(/import\.meta\.env\.VITE_CLOUDFLARE_TOKEN/);
  });
});

function collectRuntimeTsImportViolations(entries: readonly string[]) {
  const violations: string[] = [];
  const visited = new Set<string>();

  const visit = (relativeSource: string) => {
    const sourcePath = path.resolve(rootDir, relativeSource);
    if (visited.has(sourcePath) || !existsSync(sourcePath)) return;
    visited.add(sourcePath);

    const sourceText = readFileSync(sourcePath, 'utf8');
    const sourceFile = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;

      const specifier = statement.moduleSpecifier.text;
      if (!specifier.startsWith('.')) continue;

      const isTypeOnly = Boolean(statement.importClause?.isTypeOnly);
      if (!isTypeOnly && specifier.endsWith('.ts')) {
        violations.push(`${path.relative(rootDir, sourcePath)} imports ${specifier}`);
      }

      if (isTypeOnly) continue;
      const resolved = resolveSourceImport(sourcePath, specifier);
      if (resolved) visit(path.relative(rootDir, resolved));
    }
  };

  for (const entry of entries) visit(entry);
  return violations.sort();
}

function resolveSourceImport(fromPath: string, specifier: string): string | undefined {
  const basePath = path.resolve(path.dirname(fromPath), specifier);
  const candidates = specifier.endsWith('.js')
    ? [basePath.replace(/\.js$/, '.ts'), basePath]
    : specifier.endsWith('.ts')
      ? [basePath]
      : [`${basePath}.ts`, `${basePath}.js`, path.join(basePath, 'index.ts')];

  return candidates.find(candidate => existsSync(candidate));
}
