# AI Content Production Studio

## V1 Scope

AI Content Production Studio is Quimera's owned content production layer. It is not a Higgsfield-first feature and does not depend on any single external provider. External image, video, audio, caption, and export systems plug in as optional adapters behind Quimera's contracts.

V1 ships the foundation:

- Tenant surface: `/content-studio`, shown as `Content Studio`.
- Super Admin surface: `/admin/content-factory`, shown as `Content Factory Admin`.
- Shared contracts for campaigns, scenes, assets, timelines, readiness, export packages, admin presets, providers, and generation jobs.
- `BusinessBlueprint.mediaBlueprint` integration through project JSON persistence.
- Module Registry entries for `contentStudio` and `contentFactoryAdmin`.
- Plan and service gates through `aiFeatures`, `aiImageGeneration`, and minimum plan `individual`.
- Storyboard editing, asset placeholders, basic timeline, readiness panel, and copy/JSON export.
- Editable script/copy blocks, selective scene regeneration, asset regeneration with version preservation, asset duplication, asset-to-scene assignment, and drag/drop timeline reorder.
- Content Factory Admin overview, global presets, prompt blocks, style packs, template packs, provider routing, generation jobs, usage, safety policies, publishing, and audit logs.
- Admin preset configuration stored in the existing `settings` table pattern under `id = contentFactoryAdmin`.

V1 intentionally does not add migrations, a production video renderer, scheduler, billing changes, or external provider execution.

## Contracts

Detailed operational docs:

- `docs/CONTENT_STUDIO.md`
- `docs/CONTENT_FACTORY_ADMIN.md`
- `docs/MEDIA_BLUEPRINT.md`
- `docs/CONTENT_PROVIDER_BRIDGE.md`

Primary files:

- `types/contentGeneration.ts`
- `types/contentStudio.ts`
- `types/mediaBlueprint.ts`
- `types/contentFactoryAdmin.ts`
- `types/contentProviders.ts`
- `types/contentExports.ts`
- `types/contentReadiness.ts`

The runtime imports `MediaBlueprint` through `types/businessBlueprint.ts`, where it extends the common `BlueprintModuleState` and keeps compatibility with existing blueprint readiness and metadata rules.

## Persistence

Tenant content state is saved with `ProjectContext.updateProjectMediaBlueprint(projectId, mediaBlueprint)`.

The save path:

- Reads the latest `projects.data`.
- Preserves existing `businessBlueprint` when present.
- Writes `data.mediaBlueprint`.
- Writes `data.businessBlueprint.mediaBlueprint` when a business blueprint exists.
- Preserves nested `data.data.mediaBlueprint` / `data.data.businessBlueprint.mediaBlueprint` for older project payload shapes.
- Creates a version-history checkpoint with `scope = module`, `moduleKey = mediaBlueprint`, and `actionType = content_studio_media_blueprint_save`.

Admin config uses the existing `settings` pattern:

```txt
settings.id = contentFactoryAdmin
settings.config = ContentFactoryAdminConfig
```

## Manual Edit Protection

Generation and merge logic live in `utils/contentStudio/engine.ts`.

Content Studio must not overwrite user edits without explicit overwrite intent:

- Campaigns with `editableState.editedByUser` are preserved.
- Scenes marked `approved`, `editedByUser`, or `lockedFromRegeneration` are preserved.
- Regenerating an asset creates a new version and keeps the previous asset.
- Regenerating a scene appends a new asset/job and does not touch other scenes.
- Blueprint-level metadata `userModified` or `lockedFromRegeneration` prevents replacement.
- Merge behavior is tested in `tests/utils/contentStudio.test.ts`.

## Provider Model

The default provider is `quimera-orchestrator-placeholder`.

Provider adapters implement:

```txt
generate(input)
getJobStatus(jobId)
cancelJob(jobId)
```

Capabilities are modeled for image, video, audio, captions, export, references, batch, and variations. Real providers should be registered as adapters and routed through Content Factory Admin presets/rules. Quimera remains the orchestrator and source of truth.

Generation jobs are modeled in both:

- `ContentCampaign.jobs`
- `MediaBlueprint.jobs`
- `ContentFactoryAdminConfig.generationJobs`

Jobs are queued against provider adapters in V1 and are ready for a future external queue/worker without changing the editor contract.

## Registry And Access

`registry/moduleRegistry.ts` defines:

- `contentStudio`: user surface, route `/content-studio`, canonical system `media`.
- `contentFactoryAdmin`: admin surface, route `/admin/content-factory`, canonical system `media`.

Access gates:

- Required service: `aiFeatures`
- Required feature: `aiImageGeneration`
- Minimum plan: `individual`
- Admin route roles: `owner`, `superadmin`, `admin`

The registry and access engine coverage lives in:

- `tests/utils/moduleRegistry.test.ts`
- `tests/services/serviceAccessEngine.test.ts`

## UI Shell

The shared shell is `components/content-studio/ContentStudioShell.tsx`.

It follows the existing Quimera editor pattern:

- Top bar: status, generate, regenerate, save, export, publish.
- Left panel: production flow and admin sections.
- Center canvas: brief, strategy, script, storyboard, assets, timeline, review, export, preset admin.
- Right panel: settings, readiness, and metadata.

Tenant workflow coverage:

- Brief form and content type selector.
- Strategy/script/storyboard generated through the Quimera engine placeholder.
- Script and storyboard are editable.
- Scene prompts, statuses, readiness, and source maps are visible.
- Asset Manager supports filtering, approve/reject, regenerate, duplicate, use in scene, copy prompt, and download when a URL exists.
- Timeline supports ordered scenes, selected-scene preview, basic layers, and drag/drop reorder.
- Export generates copy/JSON package with brief, strategy, copy, storyboard, prompts, assets, timeline, platform formats, and readiness.

Admin workflow coverage:

- Create and edit global presets.
- Move presets through `admin_draft`, `testing`, `approved`, `published`, `disabled`, and `archived`.
- Manage prompt block text inside presets.
- Inspect style packs, template packs, provider routing, generation jobs, usage, safety policies, publishing state, and audit logs.
- Queue test generations into the admin config job log.

Tenant entry point:

- `components/dashboard/content-studio/ContentStudioDashboard.tsx`

Admin entry point:

- `components/dashboard/admin/ContentFactoryAdmin.tsx`

## Validation

Current V1 validation commands:

```txt
npm run test:run -- tests/routes/config.test.ts tests/utils/contentStudio.test.ts tests/utils/moduleRegistry.test.ts tests/services/serviceAccessEngine.test.ts
npm run build
```

Local route smoke checks:

```txt
http://localhost:3000/content-studio
http://localhost:3000/admin/content-factory
```

Unauthenticated browser smoke should redirect both routes to `/login` with HTTP 200 and no Vite overlay.

Known repo gate:

- `npm run type-check -- --pretty false` still exits with existing baseline errors outside the Content Studio module. Filtering the log for `contentStudio`, `ContentStudio`, `ContentFactory`, `mediaBlueprint`, `ContentFactoryAdmin`, and `ContentStudioDashboard` should return no Studio-specific matches.

Acceptance notes:

- No new Supabase migration is required for V1 because tenant state uses `projects.data` and admin state uses the existing `settings` config pattern.
- No provider secret is exposed in the tenant UI. Tenant users see quality/generation mode; admin sees provider routing.
- Full video rendering, scheduler/publishing integrations, multi-provider billing, and advanced analytics remain out of V1 scope by design.
