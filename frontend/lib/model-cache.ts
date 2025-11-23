const CACHE_NAME = "product-models";

// In-memory cache of iteration ID -> blob URL to avoid creating duplicates
const blobUrlCache = new Map<string, string>();

export async function getCachedModelUrl(iterationId: string, remoteUrl: string) {
  if (typeof window === "undefined" || !("caches" in window)) {
    return remoteUrl;
  }

  // Check in-memory cache first to reuse existing blob URL
  if (blobUrlCache.has(iterationId)) {
    const cached = blobUrlCache.get(iterationId)!;
    console.log(`[model-cache] Reusing in-memory blob URL for ${iterationId}`);
    return cached;
  }

  const cacheKey = `model_glb_${iterationId}`;
  const cache = await caches.open(CACHE_NAME);

  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    console.log(`[model-cache] Found cached GLB for ${iterationId}, creating blob URL`);
    const blob = await cachedResponse.blob();
    const blobUrl = URL.createObjectURL(blob);
    blobUrlCache.set(iterationId, blobUrl);
    return blobUrl;
  }

  console.log(`[model-cache] Fetching and caching GLB for ${iterationId} from ${remoteUrl.substring(0, 60)}...`);
  const response = await fetch(remoteUrl, { credentials: "omit" });
  if (!response.ok) {
    throw new Error(`Failed to fetch model: ${response.status}`);
  }

  await cache.put(cacheKey, response.clone());
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  blobUrlCache.set(iterationId, blobUrl);
  console.log(`[model-cache] Cached GLB and created blob URL for ${iterationId}`);
  return blobUrl;
}

export async function clearCachedModel(iterationId: string) {
  if (typeof window === "undefined" || !("caches" in window)) {
    return;
  }
  // Revoke blob URL if it exists
  const blobUrl = blobUrlCache.get(iterationId);
  if (blobUrl && blobUrl.startsWith("blob:")) {
    URL.revokeObjectURL(blobUrl);
  }
  blobUrlCache.delete(iterationId);
  
  const cacheKey = `model_glb_${iterationId}`;
  const cache = await caches.open(CACHE_NAME);
  await cache.delete(cacheKey);
  console.log(`[model-cache] Cleared cache for iteration ${iterationId}`);
}

export async function clearAllModelCache() {
  if (typeof window === "undefined" || !("caches" in window)) {
    return;
  }
  // Revoke all blob URLs
  blobUrlCache.forEach((blobUrl) => {
    if (blobUrl.startsWith("blob:")) {
      URL.revokeObjectURL(blobUrl);
    }
  });
  blobUrlCache.clear();
  
  await caches.delete(CACHE_NAME);
  console.log(`[model-cache] Cleared all cached models`);
}

