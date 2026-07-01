# Content Factory Admin

## Product Surface

Content Factory Admin is the Super Admin surface at `/admin/content-factory`.

It is the control plane for reusable content production presets, prompt blocks, style packs, template packs, provider routing, safety policies, usage, publishing, and audit history.

## Storage

V1 uses the existing `settings` config pattern:

```txt
settings.id = contentFactoryAdmin
settings.config = ContentFactoryAdminConfig
```

No new Supabase migration is required for V1.

## Admin Contract

`ContentFactoryAdminConfig` includes:

- global presets
- style presets
- format presets
- template packs
- provider routing rules
- generation jobs
- usage snapshot
- safety policies
- audit logs
- readiness

The implementation lives in:

- `components/dashboard/admin/ContentFactoryAdmin.tsx`
- `components/content-studio/ContentStudioShell.tsx`
- `types/contentFactoryAdmin.ts`
- `utils/contentStudio/engine.ts`

## Preset Publishing

Tenant users only receive presets where:

- `status = published`
- `visibility` is `public`, `tenant_beta`, or `marketplace`

The public preset helper strips admin actor metadata such as `createdBy` before the tenant surface consumes the preset.

Internal/admin draft presets remain visible only inside Content Factory Admin.

## Provider Routing

Provider routing is capability-based and remains in mock mode in V1.

Rules can target:

- text
- image
- image_edit
- video
- audio
- voice
- captions
- export
- moderation
- variations
- references
- batch

V1 queues jobs against the Quimera placeholder provider. Real provider execution must run through a server-side adapter and must not expose provider secrets to the browser.

## Safety Policies

Safety policies are admin managed and surfaced through readiness/export warnings.

V1 categories include:

- brand safety
- copyright
- claims
- adult/sensitive
- political
- regulated
- synthetic media
- platform policy

## Admin Access

The route is admin-only and registered as:

- route: `/admin/content-factory`
- view: `content-factory`
- roles: `owner`, `superadmin`, `admin`
- required service: `aiFeatures`
- required feature: `aiImageGeneration`

Tenant/project private information must not be saved inside global admin presets.
