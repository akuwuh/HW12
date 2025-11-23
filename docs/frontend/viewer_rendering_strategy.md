# 3D Viewer Rendering & Caching Strategy

## Overview

This document describes the production-tested rendering and caching pipeline for 3D models in the product viewer. It was developed through iteration to solve real problems: infinite loading loops, blob URL lifecycle bugs, and cache invalidation issues.

## Core Principles

1. **Redis stores metadata only** - URLs, prompts, durations. Never binary assets.
2. **Browser caches binaries** - Cache Storage for persistence, in-memory Map for stable blob URLs.
3. **Stable IDs eliminate bugs** - Every iteration gets a unique, immutable ID at creation time.
4. **Fade, don't block** - Show the previous model while the new one loads; swap when ready.

## Architecture

### 1. Backend State (Redis)

**Key**: `product:current`

**Schema**: `ProductState`
- `iterations: ProductIteration[]` - complete history of create/edit passes
- `trellis_output: TrellisArtifacts` - current GLB URL and preview images
- `in_progress: bool`, `status`, `message`, etc.

**ProductIteration** (per create/edit):
```python
{
  "id": "iter_1763880000123",  # CRITICAL: Generated once at creation
  "type": "create" | "edit",
  "prompt": "user's instruction",
  "trellis_output": {
    "model_file": "https://v3b.fal.media/.../model.glb",
    "no_background_images": [...]
  },
  "duration_seconds": 185.4,
  "created_at": "2024-11-23T05:47:00Z"
}
```

**Why `id` must be stable**:
- If generated via Pydantic `default_factory`, it runs on **every deserialization** from Redis.
- This creates new IDs every time `/product` is called → infinite hydration loop.
- Solution: Generate `id` once in `product_pipeline.py` when creating the iteration.

### 2. Client-Side GLB Cache

**File**: `frontend/lib/model-cache.ts`

Two-tier caching:

```typescript
// Tier 1: Cache Storage (persistent, survives refresh)
Cache Storage "product-models": 
  "model_glb_iter_123" → GLB blob

// Tier 2: In-memory Map (session-only, prevents duplicate blob URLs)
Map<iterationId, blobURL>:
  "iter_123" → "blob:http://localhost:3000/abc-123..."
```

**Why two tiers**:
- `URL.createObjectURL(blob)` creates a **new string** every call, even for the same blob.
- Without the in-memory Map, calling `getCachedModelUrl(iter_123, url)` twice returns different blob URLs.
- React sees a new URL → triggers re-render → resets fade animation → infinite loop.

**Solution**: Cache the blob URL string in memory; return the same string for the same iteration.

### 3. Product Page Hydration

**File**: `frontend/app/product/page.tsx`

**On mount**:
```typescript
const state = await getProductState();
const latestIteration = state.iterations.at(-1);
const iterationId = latestIteration.id;  // Use .id, not .created_at!

// Skip if already showing this iteration
if (latestIterationIdRef.current === iterationId && currentModelUrl) {
  return;  // No-op: prevents re-hydration
}

const cachedUrl = await getCachedModelUrl(iterationId, remoteUrl);
setCurrentModelUrl(cachedUrl);  // Triggers viewer update
```

**On edit complete**:
- Same flow as mount.
- New iteration has new `id` → fetches new GLB → caches it → swaps viewer.
- Old model stays visible until new blob is ready.

**On rewind**:
- Call `/product/rewind/{index}` to truncate Redis iterations.
- Clear cache for discarded iterations: `clearCachedModel(staleIteration.id)`.
- Hydrate from target iteration → instant load from cache.

### 4. Model Viewer Rendering

**File**: `frontend/components/ModelViewer.tsx`

**Key components**:

1. **ModelLoader**: Wraps `useGLTF(url)` and applies materials/wireframe.
2. **ModelLoaderWrapper**: Manages opacity fade-in (0 → 1 over 350ms).
3. **ModelViewer**: Canvas container with controls, lighting, orbit camera.

**Fade animation lifecycle**:
```
URL changes → reset opacity to 0
    ↓
useGLTF loads GLB (async, browser fetches blob or reads cache)
    ↓
onLoad fires → start 350ms fade
    ↓
requestAnimationFrame loop updates opacity
    ↓
Fade complete (opacity = 1)
```

**Preventing duplicate fades**:
- `hasLoadedRef` tracks if we've already animated this URL.
- `lastUrlRef` ensures we only reset when URL actually changes.
- Guards prevent React StrictMode double-mounting from triggering two fades.

### 5. Common Pitfalls & Solutions

#### Problem: Infinite loading loop
**Symptom**: Console shows hundreds of "Loading iteration iter_X" with incrementing timestamps.

**Cause**: `ProductIteration.id` used Pydantic `default_factory`, which ran on every Redis read.

**Fix**: Generate ID once in `product_pipeline.py`:
```python
iteration_id = f"iter_{int(time.time() * 1000)}"
iteration = ProductIteration(id=iteration_id, ...)
```

#### Problem: Model doesn't persist on reload
**Symptom**: Every reload re-fetches the GLB, shows loading state.

**Cause**: Cache hit returns new blob URL → React sees new prop → re-renders.

**Fix**: In-memory Map caches blob URL strings, reuses same string for same iteration.

#### Problem: Fade animation interrupted/restarts
**Symptom**: Model flickers, opacity resets mid-fade.

**Cause**: Parent re-renders or hydration triggers new URL prop mid-animation.

**Fix**: Track `lastUrlRef` and skip fade if URL hasn't changed.

#### Problem: Blank viewer after generation
**Symptom**: Backend completes, but viewer stays empty.

**Cause**: 
- Blob URL revoked before `useGLTF` finishes.
- Or: `currentModelUrl` set to `""` or `undefined` during hydration.

**Fix**: 
- Never clear `modelUrl` unless you have a replacement.
- Let in-memory cache manage blob lifecycle (no manual revocation).

### 6. Performance Characteristics

| Scenario | Network | Cache Operations | Viewer Behavior |
|----------|---------|------------------|-----------------|
| **First generation** | Fetch GLB from Fal.ai (~2.5MB, ~10s) | Store in Cache + Map | Fade in (350ms) |
| **Reload same iteration** | None | Map lookup (instant) | Instant display, no animation |
| **First reload after clearing browser** | None | Cache Storage read (~200ms), create blob URL | Fade in (350ms) |
| **Edit (new iteration)** | Fetch new GLB | Store new entry | Previous model visible, then fade to new |
| **Rewind to cached iteration** | None | Map lookup | Instant swap |
| **Rewind to non-cached** | Fetch GLB | Store in Cache + Map | Fade in |

## Integration Guidelines for Other Features

### For Packaging or Similar Workflows

The product viewer pattern is **fully decoupled and reusable**. To implement a similar flow:

#### 1. Backend Setup
- Create separate Redis key: `packaging:current` (or `packaging:{session_id}`).
- Define `PackagingState` with `iterations[]` similar to `ProductState`.
- Ensure each iteration has a stable, unique `id` field.
- Generate IDs at creation time, not via Pydantic defaults.

#### 2. Frontend API Client
- Create `lib/packaging-api.ts` with:
  ```typescript
  export async function createPackaging(...)
  export async function editPackaging(...)
  export async function getPackagingState()
  export async function getPackagingStatus()
  ```
- Keep completely separate from `product-api.ts`.

#### 3. Frontend Cache
- **Option A**: Share `model-cache.ts` if GLBs are the same type.
- **Option B**: Create `packaging-cache.ts` with different `CACHE_NAME` if asset types differ (textures, dielines, etc.).

#### 4. Page Hydration
- Copy the hydration pattern from `app/product/page.tsx`:
  ```typescript
  const state = await getPackagingState();
  const latestIteration = state.iterations.at(-1);
  const assetUrl = await getCachedAssetUrl(latestIteration.id, remoteUrl);
  setViewerUrl(assetUrl);
  ```

#### 5. Viewer Integration
- Pass the asset URL to `<ModelViewer>` or a custom viewer component.
- Same fade animation, same cache hit behavior.

### Key Isolation Points

**DO**:
- Use separate API modules (`product-api.ts` vs `packaging-api.ts`).
- Use separate Redis keys (`product:current` vs `packaging:current`).
- Use discriminated union types if sharing UI components:
  ```typescript
  type AIChatPanelProps = ProductProps | PackagingProps;
  ```

**DON'T**:
- Share state between product and packaging (e.g., one Redis key for both).
- Couple API calls (e.g., `/product/create` affecting packaging state).
- Use mutable or timestamp-based IDs (always generate once at creation).

## Debugging Checklist

### Model doesn't load
1. Check Network tab: Is the GLB fetch succeeding?
2. Check console: Do you see `"[ModelViewer] GLB loaded successfully"`?
3. Check `/product` response: Does `iterations[].id` stay stable across calls?
4. Check Cache Storage (DevTools → Application → Cache Storage): Is `model_glb_iter_X` present?

### Loading loop
1. Check console: Are iteration IDs incrementing on every log?
   - **YES** → Pydantic `default_factory` bug; move ID generation to pipeline.
   - **NO** → Hydration deduplication failing; verify `latestIterationIdRef` logic.

### Fade animation doesn't run
1. Check console: Do you see `"Fade-in complete"`?
   - **YES but no visual change** → Material opacity not updating; check `useEffect` dependencies.
   - **NO** → `onLoad` not firing; check Suspense/error boundaries.

### Model disappears on reload
1. Check console: Do you see `"Reusing in-memory blob URL"`?
   - **YES** → Cache is working; viewer might be unmounting.
   - **NO** → Cache miss; check if Cache Storage was cleared or iteration ID changed.

## Summary

This architecture balances:
- **Performance**: Instant reloads via Cache Storage + in-memory blob URLs.
- **Simplicity**: No backend storage, no database, no S3. Just Redis metadata + browser cache.
- **Robustness**: Stable IDs prevent infinite loops; deduplication prevents unnecessary fetches.
- **UX**: Smooth fades, no loading spinners, previous model visible during transitions.

The key insight: **Treat the blob URL as a derived, memoized value**—generate it once per iteration and reuse it everywhere. This eliminates an entire class of React re-render bugs while keeping the implementation minimal.
