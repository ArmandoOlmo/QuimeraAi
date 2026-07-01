# Content Studio

## Product Surface

Content Studio is the tenant-facing AI content production editor at `/content-studio`.

The V1 surface is an editor shell, not a real provider renderer. It produces strategy, copy, storyboard, prompts, asset placeholders, jobs, a basic timeline, readiness warnings, and export packages that are ready for a provider integration PR.

## Editor Layout

The shared shell follows Quimera's editor pattern:

- Top bar: route title, status, generate, regenerate, save, export.
- Left panel: production steps.
- Center canvas: brief, strategy, script, storyboard, asset manager, timeline, review, export.
- Right panel: settings, readiness, metadata.

The implementation lives in:

- `components/dashboard/content-studio/ContentStudioDashboard.tsx`
- `components/content-studio/ContentStudioShell.tsx`
- `utils/contentStudio/engine.ts`

## Tenant Flow

The tenant flow starts with a project and a `BusinessBlueprint`. The editor resolves:

- `businessBlueprint.businessProfile`
- `businessBlueprint.brandProfile`
- `businessBlueprint.mediaBlueprint`
- published Content Factory presets from `settings.id = contentFactoryAdmin`

Generate creates a `ContentCampaign` and merges it into `mediaBlueprint`.

The generated V1 campaign includes:

- brief
- content type
- formats and platforms
- strategy
- script/copy blocks
- storyboard scenes
- visual prompts
- asset placeholders
- generation jobs
- basic timeline
- readiness report
- export package

## User Edits

The editor must not overwrite user work by default.

Protected content includes:

- campaigns marked `editableState.editedByUser`
- approved scenes
- scenes marked `editableState.editedByUser`
- scenes marked `editableState.lockedFromRegeneration`
- media blueprints marked `metadata.userModified`
- media blueprints marked `metadata.lockedFromRegeneration`

Regenerating a scene or asset appends a new version/job instead of replacing the previous asset.

## Export Actions

The export panel supports:

- copy JSON package
- download JSON package
- copy prompts
- copy script
- copy storyboard

The package contains project context, business context, brand context, brief, content type, platforms, formats, strategy, copy, script, storyboard, scene prompts, asset prompts, placeholders, timeline, readiness, warnings, source map, version, and created timestamp.

## Readiness

Minimum V1 readiness warnings include:

- Missing brand colors or brand profile.
- No approved assets.
- Storyboard scene is missing a visual prompt.
- Generated content needs review.
- Export format not selected.
- Product data missing.
- Prompt was edited after generation.
- Provider not connected.

## Access

Route and registry access are gated by:

- route: `/content-studio`
- required service: `aiFeatures`
- required feature: `aiImageGeneration`
- minimum plan: `individual`
- project/tenant ownership from the existing project context

The tenant UI does not expose provider secrets or admin-only provider settings.
