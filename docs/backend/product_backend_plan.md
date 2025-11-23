# Backend + Middleware Plan

## 1. Define Product State Schema & Helpers (`backend/app`)

- Add a lightweight domain model (e.g. `app/models/product_state.py`) describing the shared state for the single in-memory session: prompt, flow type (`create|edit`), current status, last request params, generated image URLs, trellis outputs, timestamps, and iteration history.  Include serialization helpers that read/write this structure from Redis under a fixed key such as `product:current`.
- Extend `app/core/redis.py` with convenience helpers (namespaced `set_json/get_json`, optional TTL) so higher-level code doesn’t reimplement JSON/expiry logic for this state blob.

## 2. Implement Product Pipeline Service (`app/services/product_pipeline.py`)

- Create a dedicated service that orchestrates the atomic pipeline: prompt ingestion → Gemini multi-angle image generation → Trellis 3D call.  Expose `run_create(current_state)` and `run_edit(current_state)` that both report granular progress updates back to Redis as they advance (e.g. `status=generating_images`, `status=generating_model`).
- For Gemini, add a helper such as `generate_product_views(prompt, existing_images=None)` that calls the “Gemini nano banana” API (define base URL + key in `Settings`, wrap with retries, ensure clean error surfacing).  The edit flow passes the previously stored canonical image list into the payload so the API conditions on it.
- Reuse the existing Trellis integration but ensure the `images` argument comes from the freshly generated (or updated) view set, and that we request the multi-image configuration stipulated by Replicate.
- Persist every intermediate artifact back into the product state document (prompt text, image URLs, Trellis output URLs, error metadata) so the frontend can rehydrate on `/product` without needing any session identifier.

## 3. Product Router & Async Job Handling (`app/endpoints/product/router.py`)

- Expose FastAPI routes:
- `POST /product/create`: accepts product brief, overwrites the single stored state (`status=pending`), kicks off an async background task invoking the pipeline service, returns the initial status for frontend polling.
- `POST /product/edit`: validates that base context exists, appends the user’s edit instructions, launches pipeline `run_edit` in the background, and returns immediately with updated status placeholder.
- `GET /product`: fetches the full state document from Redis for hydration on `/product` reloads.
- `GET /product/status`: lighter polling endpoint with just status/progress + primary asset URLs.
- Mirror the async pattern already used in `trellis/router.py` (`asyncio.create_task`) so long-running Gemini/Trellis calls don’t block.  Share progress key format `product_status:current` to keep it distinct from the full state blob.

## 4. Redis Persistence & Concurrency Guarantees

- Define clear expiration policy (e.g. expire after idle 24h) when writing the product state and status keys; refresh TTL on every update so an active local session stays available but is cleaned after finishing.
- Since there is only one session per local run, store a `lock`/`in_progress` flag in Redis so concurrent create/edit requests are rejected (HTTP 409) or queued; this prevents overlapping Gemini/Trellis jobs from corrupting the single source of truth.
- Include minimal auditing/history arrays in Redis so the frontend can show previous iterations or rollbacks later, even within the single-session assumption.

## 5. Configuration, Validation, and Observability

- Extend `app/core/config.py` with any new API keys/endpoints needed for the Gemini nano banana service plus optional Trellis tuning params so environments can override defaults.
- Add Pydantic request models under `app/endpoints/product/models.py` (or inline) to validate incoming create/edit payloads (prompt, optional reference image IDs, creativity settings, etc.).
- Centralize logging inside the pipeline service to emit structured logs tied to the “current” session and propagate fatal errors back into Redis (`status=error`, `message=...`) for frontend display.

## 6. Smoke Tests / Stubs (optional but recommended)

- Add a thin unit/integration test (e.g. using `pytest` + mocked Gemini/Trellis clients) that exercises the pipeline service, ensuring Redis writes, progress updates, and final payload shape conform to expectations when upstream APIs succeed/fail.  This safeguards the orchestration layer before wiring the frontend.

## Diagram:

```
┌──────────────┐
│   Home Page  │
└──────┬───────┘
       │ user prompt + “Create”
       ▼
┌─────────────────────────────────┐
│ Next.js frontend `/product` UI  │
│  - Posts to FastAPI product API │
│  - Polls status + `GET /product`│
└──────┬──────────────────────────┘
       │ REST (POST /product/create or /edit)
       ▼
┌────────────────────────────────────────┐
│ FastAPI Product Router                 │
│ 1. Writes `product:current` in Redis   │
│ 2. Sets lock/in-progress flag          │
│ 3. Spawns background pipeline task     │
└──────┬─────────────────────────────────┘
       │
       │ async task reads/writes single state
       ▼
┌─────────────────────────────────────────────┐
│ Product Pipeline Service                    │
│                                             │
│  CREATE FLOW                                │
│  1. Capture prompt                          │
│  2. Gemini nano banana → 3 clean views      │
│  3. Trellis multi-image 3D generation       │
│  4. Persist outputs to `product:current`    │
│                                             │
│  EDIT FLOW                                  │
│  1. Use stored images/context               │
│  2. Gemini w/ prior image context           │
│  3. Trellis re-generation                   │
│  4. Append iteration data in Redis          │
└──────────────┬──────────────────────────────┘
               │
               │ progress + artifacts
               ▼
┌─────────────────────────────────────────────┐
│ Redis (middleware “source of truth”)        │
│ - Key `product:current` holds latest state  │
│ - Key `product_status:current` for polling  │
│ - TTL refreshed; instance killed after flow │
└──────────────┬──────────────────────────────┘
               │
        ┌──────┴───────────────────────┐
        │ FastAPI getters              │
        │  - GET /product/status       │
        │  - GET /product              │
        └──────┬───────────────────────┘
               │ responses consumed by UI
               ▼
┌─────────────────────────────────────────────┐
│ Next.js `/product` page                     │
│ - Hydrates on load from `GET /product`      │
│ - Shows progress, assets, edit controls     │
│ - When user edits, POST /product/edit       │
└─────────────────────────────────────────────┘
```
