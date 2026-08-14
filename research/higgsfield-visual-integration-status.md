# Higgsfield Visual Integration Status

## Connected-service check

The Higgsfield MCP connection is present and exposes image-generation and media-management operations. The `generate_image` request was preflighted with the documented request shape on 2026-08-14. The service returned a plan restriction: **Higgsfield image generation requires the Basic plan or higher**.

No image-generation request was charged or completed, and no user assets were changed.

## Current visual-first fallback

Code Story Studio now promotes the existing interactive Python-rendered 3D SVG scene into the primary story surface. This keeps every scene deterministic, source-linked, fast to render, and available on the current account tier. The direct AI explanation is placed immediately beside it; source code and detailed state remain below the main visual.

## Upgrade seam

When Higgsfield image generation is available, an asset layer can be added without replacing the story contract:

1. Build a bounded image prompt from the validated `sceneBrief` fields: `title`, `plainEnglish`, `visualFocus`, `kind`, and `lineNumber`.
2. Generate or retrieve a 16:9 educational scene asset through Higgsfield.
3. Store the returned asset URL and generation metadata outside the user’s source code.
4. Render that asset inside `data-primary-cinematic-scene`, retaining the deterministic SVG scene as its immediate fallback.
5. Cache successful assets by a content hash of the validated visual brief, with strict timeouts and no blocking of code-story playback.

The deterministic visual remains the required fallback because it is reliable for long code stories, reduced-motion mode, and offline-safe UI states.
