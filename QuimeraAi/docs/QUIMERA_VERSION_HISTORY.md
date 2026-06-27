# Quimera Version History

## Purpose

Quimera Version History stores automatic blueprint snapshots before AI or engine flows mutate a project. The restore path is safe by default: modules or sections marked `userModified` or `lockedFromRegeneration` are preserved unless an explicit overwrite is requested.

## Storage

The MVP stores snapshots in the existing project JSON payload:

```txt
projects.data.versionHistory.blueprintSnapshots
```

No Supabase migration is required for this implementation. Snapshots intentionally strip any nested `versionHistory` before they are stored, so history does not grow recursively. The current cap is `50` snapshots per project.

If history size, auditing, retention, or multi-user restore workflows become heavy, move the same `BlueprintSnapshot` contract into a dedicated `project_blueprint_snapshots` table with RLS and explicit API grants.

## Snapshot Contract

Core types live in `types/versionHistory.ts`:

- `BlueprintSnapshot`
- `BlueprintSnapshotScope`
- `SnapshotDiff`
- `RestoreTarget`
- `RestoreResult`
- `SnapshotSource`
- `SnapshotMetadata`

Pure utilities live in `utils/businessBlueprint/versionHistory.ts`:

- `createBlueprintSnapshot`
- `createSnapshotBeforeRegeneration`
- `diffBlueprintSnapshots`
- `restoreBlueprintSnapshot`
- `restoreBlueprintModule`
- `restoreBlueprintSection`
- `shouldProtectFromRegeneration`
- `getSnapshotLabel`
- `getSnapshotSummary`

## Automatic Snapshots

`services/globalAssistant/globalAssistantActionHandlers.ts` wraps every registered mutating Global Assistant action. If the action has a `projectId`, it:

1. Loads the current `projects` row inside the assistant scope guard.
2. Creates a `before_regeneration` snapshot.
3. Appends it to `projects.data.versionHistory.blueprintSnapshots`.
4. Only then executes the original action.

If the pre-mutation snapshot cannot be written for a project-scoped action, the action does not continue.

Additional direct blueprint mutation paths also append snapshots before writing new project data:

- AI Website Studio preview regeneration carries the previous generated project into `versionHistory` before the regenerated preview is saved.
- Ecommerce starter content and Ecommerce cross-module sync snapshot `ecommerceBlueprint`/`BusinessBlueprint` before creating AI-backed draft content.
- Realty Engine cross-module and offer sync snapshot the current `BusinessBlueprint` before writing generated integration drafts.
- Chatbot Engine configuration writes a `manual_checkpoint` before changing `chatbotBlueprint`.

## Restore Behavior

Supported restore targets:

- Full project: restores project JSON from the snapshot and preserves protected modules by default.
- Business Blueprint/module: restores a single `BusinessBlueprintModuleKey`.
- Section by ID: currently supports known blueprint section containers such as `websiteBlueprint.sectionBlueprints`, `storefrontBlueprint.sections`, and `bioPageBlueprint.blocks`.

Protected content:

- Module-level `metadata.userModified`
- Module-level `metadata.lockedFromRegeneration`
- Section/item-level `userModified`
- Section/item-level `lockedFromRegeneration`

Protected content is skipped unless `confirmOverwriteProtected` is true.

## UI

The user-facing dashboard route is:

```txt
/dashboard/project/:projectId/version-history
```

Fallback route:

```txt
/version-history
```

The panel shows snapshot date, source, module, change type, compare details, full restore, module restore, and section restore.

## Validation

Focused test coverage is in:

```txt
tests/utils/blueprintVersionHistory.test.ts
tests/services/chatbotEngineConfigurationService.test.ts
```

Run it with:

```bash
npm run test:run -- tests/utils/blueprintVersionHistory.test.ts tests/services/chatbotEngineConfigurationService.test.ts
```
