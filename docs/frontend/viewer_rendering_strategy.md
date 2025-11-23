# 3D Viewer Rendering & Caching Strategy

## Overview

The product viewer implements a lightweight, persistent caching strategy that keeps generated 3D models instantly available across page reloads, edits, and rewinds—without requiring backend storage or complex state management.

## Architecture

### 1. State Storage (Redis)

**Backend**: `ProductState` in Redis stores metadata only:
- `iterations[]` - array of historical create/edit passes
- Each `ProductIteration` contains:
  - `id` - unique identifier (e.g., `iter_1234567890123`)
  - `trellis_output.model_file` - signed Fal.ai URL to the GLB
  - `duration_seconds` - how long generation took
  - `prompt`, `type`, `created_at`, etc.

**Key principle**: Redis never stores binary assets, only URLs and metadata.

### 2. Client-Side GLB Cache

**Implementation**: `frontend/lib/model-cache.ts`

Uses browser `Cache Storage` + in-memory blob URL map:

```typescript
// Persistent storage (survives refresh)
Cache Storage: iteration.id → GLB blob

// In-memory (resets on refresh, avoids duplicate blob URLs)
Map<iterationId, blobURL>
```

**Flow**:
1. `getCachedModelUrl(iterationId, remoteUrl)` checks the in-memory map first.
   - If found: return existing blob URL (no new fetch, no new object URL).
   - If not in memory but in Cache Storage: read blob, create object URL once, store in map.
   - If nowhere: fetch from remote, store in Cache Storage, create object URL, store in map.

2. Result: **Same iteration always returns the same blob URL string**, preventing React from re-rendering the viewer.

### 3. Product Page Hydration

**File**: `frontend/app/product/page.tsx`

On mount or edit completion:
1. Fetch `ProductState` from Redis via `/product`.
2. Extract latest iteration ID and remote GLB URL.
3. Call `getCachedModelUrl(iteration.id, remoteUrl)`.
4. Pass the resulting blob URL to `<ModelViewer modelUrl={url} />`.

**Deduplication**: If `latestIterationIdRef.current === iterationId && currentModelUrl` is already set, skip hydration entirely—no re-fetch, no re-render.

### 4. Model Viewer Rendering

**File**: `frontend/components/ModelViewer.tsx`

Always keeps the canvas live:
- No loading spinners or placeholder overlays.
- When `modelUrl` changes, `useGLTF(url)` runs inside `<Suspense>`.
- Once the GLB parses, a 350ms opacity fade animates the mesh from 0 → 1.
- Materials are updated reactively in a `useEffect` to apply wireframe/color modes.

**Key**: The URL prop remains stable for the same iteration (thanks to the in-memory cache), so React doesn't re-mount the model component.

### 5. Edit & Rewind Flow

**Edit**:
1. User submits prompt via `AIChatPanel`.
2. Backend runs Gemini → Trellis, creates new `ProductIteration` with unique `id`.
3. Frontend polls `/product/status` until `complete`.
4. Calls `hydrateProductState()` → fetches new GLB → caches it → swaps viewer to new blob URL.
5. Fade animation plays as the new model loads.

**Rewind**:
1. User clicks "Rewind" on a past iteration.
2. Backend truncates `iterations[]` and restores that iteration's assets.
3. Frontend calls `clearCachedModel(staleIteration.id)` for all discarded iterations.
4. Hydrates from the target iteration's cached blob (instant, no fetch).

### 6. Performance Characteristics

| Scenario | Network | Cache | Viewer Behavior |
|----------|---------|-------|-----------------|
| First load of iteration | Fetch GLB from Fal.ai | Store in Cache Storage | Fade in (350ms) |
| Reload same iteration | None | Read from Cache Storage | Instant (blob URL reused) |
| Switch to cached iteration | None | Read from Cache Storage | Instant swap |
| New edit iteration | Fetch new GLB | Store new entry | Fade in while keeping old model visible |

## Best Practices for Other Features (e.g., Packaging)

### Isolation Principles

1. **Separate API clients**: Create `lib/packaging-api.ts` (mirroring `lib/product-api.ts`).
2. **Separate types**: Define `lib/packaging-types.ts` for packaging-specific state.
3. **Separate cache namespace**: If caching assets, use a different `CACHE_NAME` (e.g., `"packaging-models"`).
4. **Shared UI components**: Reuse `<ModelViewer>`, but pass packaging-specific URLs/state via props.

### Extending the Pattern

If packaging needs similar create/edit/rewind functionality:

1. **Backend**: Implement a parallel Redis key (e.g., `packaging:current`) with its own state schema.
2. **Frontend hydration**: Follow the same pattern as product page:
   - Fetch state on mount.
   - Extract latest iteration.
   - Call caching helper (create `getPackagingCachedModel` if artifact types differ).
   - Pass stable URLs to the viewer.

3. **History/rewind**: Same UI pattern (`AIChatPanel` already supports both modes via discriminated unions).

### Guidelines

- **Keep assets out of Redis**: Store only URLs/metadata. Let the browser cache binaries.
- **Use stable IDs**: Always derive cache keys from unique iteration IDs, not timestamps or mutable fields.
- **Defer revocation**: Don't revoke blob URLs until the viewer confirms it's done with them (or use in-memory maps to avoid revocation entirely).
- **Progressive enhancement**: Start with remote URLs, add caching as an optimization layer.
- **Avoid premature abstractions**: Don't share state between product/packaging; keep them fully decoupled.

## Debugging

Enable verbose logging:
- `[Product]` - page-level hydration and cache operations
- `[model-cache]` - CacheStorage reads/writes
- `[ModelViewer]` - GLB loading and fade animation progress

Check console for:
- `"Skipping hydration"` - confirms deduplication is working
- `"Reusing in-memory blob URL"` - confirms no redundant object URLs
- `"Fade progress: X%"` - confirms animation is running

If models don't appear:
1. Check Network tab for failed GLB fetches.
2. Verify blob URLs aren't revoked prematurely.
3. Confirm `iteration.id` is stable across reloads.
