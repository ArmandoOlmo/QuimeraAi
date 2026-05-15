# Deploy - Quimera AI

Quimera AI se aloja en Vercel y usa Supabase para datos, auth, storage y Edge Functions.

## Producción

- App: `https://www.quimera.ai`
- MCP: `https://www.quimera.ai/api/mcp`
- API keys MCP: `https://www.quimera.ai/api/mcp/keys`
- Jobs MCP: `https://www.quimera.ai/api/mcp/jobs/run`

## Deploy Manual

Desde la raíz del repo:

```bash
npm run build
npm run deploy
```

Deploy sin prompt:

```bash
npm run deploy:quick
```

Preview deploy:

```bash
npm run deploy:preview
```

## Variables En Vercel

Producción requiere:

```bash
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
CRON_SECRET
```

Opcional:

```bash
AI_PROXY_URL
MCP_JOB_LIMIT
```

## Supabase

Aplicar migraciones:

```bash
npx supabase db push
```

Ver estado:

```bash
npx supabase migration list
```

## Notas

El flujo oficial de alojamiento es Vercel + Supabase.
