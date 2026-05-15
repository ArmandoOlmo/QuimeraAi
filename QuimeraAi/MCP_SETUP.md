# Quimera MCP Setup

## Endpoint

Production MCP endpoint:

```bash
https://www.quimera.ai/api/mcp
```

Auth format:

```bash
Authorization: Bearer <mcp_api_key>
```

The key is created from the Quimera dashboard API Keys screen. The plaintext key is shown only once. The server stores only a SHA-256 hash in Supabase.

## Dashboard Keys

API keys are managed through:

```bash
/api/mcp/keys
```

This endpoint requires a normal Supabase user session token. The Vercel function verifies the user with Supabase Auth, checks tenant membership, then uses the service role server-side to create or revoke MCP keys.

## Required Vercel Env Vars

```bash
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
AI_PROXY_URL # optional, defaults to <SUPABASE_URL>/functions/v1/ai-proxy
MCP_JOB_LIMIT # optional, default 3
```

`CRON_SECRET` protects `/api/mcp/jobs/run`.

## Quick Start

List tools:

```bash
curl -X POST https://www.quimera.ai/api/mcp \
  -H "Authorization: Bearer $QUIMERA_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

List generators:

```bash
curl -X POST https://www.quimera.ai/api/mcp \
  -H "Authorization: Bearer $QUIMERA_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ai_list_generators","arguments":{}}}'
```

Generate content:

```bash
curl -X POST https://www.quimera.ai/api/mcp \
  -H "Authorization: Bearer $QUIMERA_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"ai_generate_content","arguments":{"tenantId":"TENANT_ID","brief":"Landing page hero copy for a dental clinic","language":"es"}}}'
```

Queue full project generation:

```bash
curl -X POST https://www.quimera.ai/api/mcp \
  -H "Authorization: Bearer $QUIMERA_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"ai_generate_full_project","arguments":{"tenantId":"TENANT_ID","projectId":"PROJECT_ID","brief":"Website for a modern dental clinic","assets":[{"section":"hero","brief":"Bright professional dental clinic hero image"}]}}}'
```

Check job:

```bash
curl -X POST https://www.quimera.ai/api/mcp \
  -H "Authorization: Bearer $QUIMERA_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"get_generation_job","arguments":{"tenantId":"TENANT_ID","jobId":"JOB_ID"}}}'
```

List templates (includes `contentSummary` to detect empty templates):

```bash
curl -X POST https://www.quimera.ai/api/mcp \
  -H "Authorization: Bearer $QUIMERA_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"list_templates","arguments":{"tenantId":"TENANT_ID"}}}'
```

Get full template payload (verify after create/update):

```bash
curl -X POST https://www.quimera.ai/api/mcp \
  -H "Authorization: Bearer $QUIMERA_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"get_template","arguments":{"tenantId":"TENANT_ID","templateId":"TEMPLATE_ID"}}}'
```

Create a template with real content (empty `data: {}` returns `400`):

```bash
curl -X POST https://www.quimera.ai/api/mcp \
  -H "Authorization: Bearer $QUIMERA_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":8,"method":"tools/call","params":{"name":"create_template","arguments":{"tenantId":"TENANT_ID","name":"MotoForce - Dealer de Motos","category":"automotriz","tags":["motorcycle","dealer"],"industries":["automotive-motorcycle"],"componentOrder":["header","hero","services","footer"],"data":{"hero":{"headline":"Tu concesionario de motos"},"services":{"title":"Servicios"}},"theme":{}}}}'
```

Agent playbook (full product coverage): [MCP_AGENT_GUIDE.md](./MCP_AGENT_GUIDE.md) — templates §1–10, CRM §12, CMS §13, commerce §14, appointments §15, coverage matrix §18.

**Template Editor — todos los componentes y campos editables:** [MCP_COMPONENT_EDITOR_SCHEMA.md](./MCP_COMPONENT_EDITOR_SCHEMA.md).

> **Nota:** Las tarjetas de documentación en Developer → API Keys (`/docs/api/*`) describen la API REST agency v1, no el MCP.

## Scopes

- `projects:read`, `projects:write`
- `templates:read`, `templates:write`
- `ai:generate_content`, `ai:generate_image`, `ai:generate_batch`, `ai:apply_to_project`
- `leads:read`, `leads:write`
- `cms:read`, `cms:write`
- `commerce:read`, `commerce:write`
- `appointments:read`, `appointments:write`
- `domains:read`, `domains:write`
- `reports:read`

`*`, `admin:*`, and namespace wildcards like `projects:*` are supported by the MCP auth layer.

## Tool Groups

- Projects/templates: `list_templates`, `get_template`, `create_template`, `update_template`, `archive_template`, `create_project`, `create_project_from_template`, `list_projects`, `get_project`, `update_project_page`, `update_project_sections`, `validate_project`, `publish_project_preview`
- AI: `ai_list_generators`, `ai_generate_content`, `ai_generate_page_json`, `ai_generate_image`, `ai_generate_image_prompt`, `ai_generate_project_assets`, `ai_analyze_visual_reference`, `ai_apply_generated_content`, `ai_apply_generated_images`, `ai_generate_full_project`, `get_generation_job`
- CRM: `list_leads`, `create_lead`, `update_lead`, `delete_lead`, `add_lead_activity`, `create_lead_task`
- CMS: `list_articles`, `create_article`, `update_article`, `publish_article`, `update_navigation`, `update_seo_metadata`
- Commerce: `list_products`, `create_product`, `update_product`, `list_orders`, `update_order_status`, `create_discount`
- Appointments: `list_appointments`, `create_appointment`, `update_appointment`, `delete_appointment`, `block_appointment_date`
- Domains/reports: `list_domains`, `get_domain_status`, `list_deployment_logs`, `get_tenant_summary`, `get_project_summary`

## Rate Limits

Per API key, per minute:

- Read tools: 120
- Write tools: 60
- AI simple: 20
- Batch/full project: 3

Rate limit state lives in Supabase table `mcp_rate_limits`.

## Troubleshooting

- `401`: missing/invalid MCP API key, or invalid Supabase dashboard session for `/api/mcp/keys`.
- `403`: missing scope, revoked key, expired key, or tenant mismatch.
- `402`: not enough AI credits.
- `429`: MCP rate limit reached.
- Full project generation returns `status: accepted`; use `get_generation_job` to monitor async progress.
