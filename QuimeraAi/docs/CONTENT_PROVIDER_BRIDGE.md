# Content Provider Bridge

## Purpose

The Content Provider Bridge is the provider-neutral contract between Content Studio and future generation backends.

V1 does not call real image, video, audio, caption, moderation, or export providers. It resolves routing and queues mock jobs through the Quimera placeholder adapter.

## Capabilities

Providers are capability-based, not vendor-based.

Supported V1 capabilities:

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

## Interfaces

Provider contracts live in `types/contentProviders.ts`.

Core interfaces and aliases:

- `ContentProviderAdapter`
- `ImageGenerationProvider`
- `ImageEditProvider`
- `VideoGenerationProvider`
- `AudioGenerationProvider`
- `VoiceGenerationProvider`
- `CaptionProvider`
- `ModerationProvider`
- `ExportProvider`

Every adapter must implement:

```txt
generate(input)
getJobStatus(jobId)
cancelJob(jobId)
```

Adapters must also declare:

- capabilities
- supported formats
- reference support
- batch support
- variation support
- admin-only status
- cost mode
- enabled status

## Bridge Resolution

`utils/contentStudio/providerBridge.ts` exposes:

- `resolveContentProviderBridge(request, routingRules, providers, options)`
- `createContentProviderBridgeJob(request, routingRules, providers, options)`

Resolution order:

1. enabled preferred provider from a matching routing rule
2. enabled fallback provider from the routing rule
3. Quimera placeholder provider

Admin-only providers are excluded from tenant decisions unless explicitly allowed by server-side/admin execution.

## Mock Mode

V1 runs in mock mode by default.

Mock jobs:

- are queued
- keep tenant/project/user context
- include prompt and format input
- include bridge warnings
- do not call real providers
- do not persist provider secrets

The standard warning is:

```txt
Provider not connected.
```

## Next Provider PR

The next PR can connect the first real image provider by:

1. adding a server-side `ContentProviderAdapter`
2. registering its capabilities and formats
3. enabling an admin routing rule
4. executing `createContentProviderBridgeJob` with `execute = true` on the server
5. persisting returned asset URLs and job status back into `mediaBlueprint`

No Content Studio UI contract should need to change for the first real image provider.
