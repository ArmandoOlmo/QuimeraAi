# Plan: Generador unificado de Imagen y Video (OpenRouter)

> Copia local del plan de implementación. Fuente canónica con todos: [`.cursor/plans/generador_imagen_y_video_77664c58.plan.md`](../.cursor/plans/generador_imagen_y_video_77664c58.plan.md)

## Contexto actual

- El generador vive en [`ImageGeneratorPanel.tsx`](../components/ui/ImageGeneratorPanel.tsx) (~1400 líneas): modelos de imagen vía OpenRouter en [`ai-proxy`](../supabase/functions/ai-proxy/index.ts) + [`generateImageViaProxy`](../utils/geminiProxyClient.ts) + [`AIContext.generateImage`](../contexts/ai/AIContext.tsx).
- Admin usa el mismo panel en [`UnifiedMediaLibrary.tsx`](../components/dashboard/admin/UnifiedMediaLibrary.tsx) (`destination="admin"`).
- **Lista curada de 3 modelos:** Seedance 2.0, Google Veo 3.1 y Gemini Omni — controles dinámicos vía OpenRouter `/api/v1/videos/models`.

## Referencia UX: Leonardo AI

- Toggle **Imagen | Video** arriba del prompt.
- Selector de modelo con **badges de capacidad**: audio, start frame, end frame, duraciones.
- **Start frame / End frame** separados de **input_references**.
- Acción **"Crear video"** desde galería → modo video con start frame pre-cargado.
- Generación **asíncrona** con polling.

## Modelos curados

| Modelo UI | OpenRouter ID | Notas |
|-----------|---------------|-------|
| **Seedance 2.0** | `bytedance/seedance-2.0` | Text-to-video, image-to-video, first/last frame, referencias multimodales |
| **Google Veo 3.1** | `google/veo-3.1` | 1080p, audio nativo, start/end frame |
| **Gemini Omni** | `google/gemini-omni-flash` *(runtime)* | Resolver slug en `GET /videos/models`; badge "Próximamente" si no disponible |

**Eliminados de v1:** `seedance-2.0-fast`, `seedance-1-5-pro`, `veo-3.1-fast`, `veo-3.1-lite`.

## Arquitectura

```
MediaGeneratorPanel → AIContext.generateVideo → videoProxyClient
  → ai-proxy (video_submit / video_poll / video_models)
  → OpenRouter /api/v1/videos
  → Supabase Storage (MP4)
```

## Archivos clave

| Área | Archivos |
|------|----------|
| Backend | `supabase/functions/ai-proxy/index.ts` |
| Cliente | `utils/videoProxyClient.ts`, `types/videoGeneration.ts`, `constants/curatedVideoModels.ts` |
| Hooks | `hooks/useVideoModels.ts`, `hooks/useVideoGeneration.ts` |
| UI | `components/media-generator/MediaGeneratorPanel.tsx`, `VideoGenerationSection.tsx` |
| Créditos | `types/subscription.ts` — `video_generation_seedance`, `video_generation_veo`, `video_generation_omni` |
| i18n | `locales/en/translation.json`, `locales/es/translation.json` — namespace `mediaGeneration` |

## Integración

- **Assets:** `AssetsDashboard.tsx` → `MediaGeneratorPanel`
- **Admin:** `UnifiedMediaLibrary.tsx` → `MediaGeneratorPanel` + `adminCategory`
- **Picker/Modal:** `ImagePicker.tsx`, `ImageGeneratorModal.tsx` → delegar a media generator
- **Evento global:** `assets:create-video-from-image` → `{ imageUrl, mode: 'start' | 'end' | 'reference' }`

## Orden de implementación

1. Backend video en `ai-proxy`
2. Tipos + videoProxyClient + `AIContext.generateVideo`
3. `MediaGeneratorPanel` con toggle imagen/video
4. `VideoGenerationSection` con controles dinámicos
5. Frame picker + eventos + botones en galerías
6. Créditos + i18n EN/ES
7. Wrappers backward-compat + migrar call sites
8. Fix admin: `adminCategory` en UnifiedMediaLibrary

## Fuera de alcance (v1)

- Webhooks OpenRouter
- Modelos fuera de los 3 curados
- Variantes Fast/Lite
- Edición conversacional multi-turno Omni
- Traducciones FR/PT
- Motion controls estilo Leonardo Motion 2.0
