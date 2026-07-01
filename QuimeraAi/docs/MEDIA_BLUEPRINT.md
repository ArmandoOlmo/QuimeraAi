# Media Blueprint

## Purpose

`mediaBlueprint` is the BusinessBlueprint media production contract used by Content Studio.

It stores tenant-owned content strategy, storyboard, assets, jobs, timeline, readiness, and export state without replacing the existing `BusinessBlueprint`.

## Location

The media blueprint is attached to the project JSON payload:

```txt
projects.data.mediaBlueprint
projects.data.businessBlueprint.mediaBlueprint
```

Older nested payload shapes are preserved when present:

```txt
projects.data.data.mediaBlueprint
projects.data.data.businessBlueprint.mediaBlueprint
```

The update path is `ProjectContext.updateProjectMediaBlueprint(projectId, mediaBlueprint)`.

## Contract

`MediaBlueprint` includes:

- blueprint version
- schema version
- projectId
- tenantId
- workspaceId
- status
- source
- generatedAt
- lastSyncedAt
- public/admin feature flags
- brand context
- default formats and platforms
- campaigns
- assets
- jobs
- presets
- readiness
- source map
- editable state
- image/video/brand asset needs

Types live in:

- `types/mediaBlueprint.ts`
- `types/businessBlueprint.ts`
- `types/contentGeneration.ts`

## Preservation Rules

The media blueprint merge path preserves user edits:

- existing edited campaigns are preserved
- approved scenes are preserved
- edited scenes are preserved
- locked scenes are preserved
- approved or edited assets are retained
- new generations append new jobs and asset versions

Blueprint-level protection also applies when:

- `metadata.userModified = true`
- `metadata.lockedFromRegeneration = true`
- `editableState.editedByUser = true`
- `editableState.lockedFromRegeneration = true`

## Version History

Saving from Content Studio creates a project version-history checkpoint:

```txt
scope = module
moduleKey = mediaBlueprint
actionType = content_studio_media_blueprint_save
```

This gives production teams a recovery point before manual saves change content state.

## Tenant Safety

Every generated campaign, asset, and job should carry:

- tenantId
- projectId
- workspaceId when available
- createdBy
- role/plan/feature gate context from route access

The tenant surface must only operate on the active project/tenant context supplied by Quimera's existing project and auth providers.
