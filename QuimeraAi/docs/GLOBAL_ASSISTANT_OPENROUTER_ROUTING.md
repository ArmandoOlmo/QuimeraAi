# Global Assistant OpenRouter Routing

## GA1 model roles

`services/globalAssistant/globalAssistantModelRouter.ts` defines model roles rather than scattering model IDs through UI or module code.

| Role | Model | Intended use |
| --- | --- | --- |
| `orchestrator` | `anthropic/claude-opus-4.7` | Primary agentic planning, tool routing, long context, structured action plans. |
| `fallback` | `google/gemini-2.5-pro` | Multimodal fallback and long-context requests. |
| `fast` | `google/gemini-2.5-flash` | Low-risk open/search/explain requests. |
| `imagePro` | `google/gemini-3-pro-image` | Image-generation planning where tool loop support is needed. |
| `imageFast` | `google/gemini-3.1-flash-image` | Fast image use cases without tool loop support. |

Model availability and capability metadata was verified from `https://openrouter.ai/api/v1/models` on 2026-06-26.

## Capability requirements

For the Global Assistant tool loop, a model must support:

- `tools`
- `tool_choice`
- `structured_outputs`
- `response_format`

`assertModelSupportsToolLoop` blocks models missing those capabilities. In GA1, `imageFast` is intentionally marked as missing `tools` and `tool_choice`.

## Provider policy

`buildOpenRouterProviderPolicy` defaults to:

- `require_parameters: true`
- `data_collection: "deny"` when the role config requests it

Future runtime code should keep sensitive project/admin data behind provider policies and data minimization.

## Future structured tool loop

GA6 should implement:

1. Build sanitized context.
2. Load relevant memory summaries.
3. Ask model for structured intent/action plan.
4. Validate JSON schema.
5. Run allowed tools only.
6. Return tool results to the model.
7. Stop after a max iteration count.
8. Log model, latency, tokens, estimated cost, and tool calls.

## Sensitive data handling

Do not send:

- Provider secrets.
- Stripe secret keys.
- Supabase service role keys.
- OAuth refresh tokens.
- Full raw PII when a scoped summary is enough.
- Admin memory when not in admin mode.

Model requests should reference source IDs and summaries where possible.
