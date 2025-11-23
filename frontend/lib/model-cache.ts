const CACHE_NAME = "product-models";

export async function getCachedModelUrl(iterationId: string, remoteUrl: string) {
  if (typeof window === "undefined" || !("caches" in window)) {
    return remoteUrl;
  }

  const cacheKey = `model_glb_${iterationId}`;
  const cache = await caches.open(CACHE_NAME);

  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    const blob = await cachedResponse.blob();
    return URL.createObjectURL(blob);
  }

  const response = await fetch(remoteUrl, { credentials: "omit" });
  if (!response.ok) {
    throw new Error(`Failed to fetch model: ${response.status}`);
  }

  await cache.put(cacheKey, response.clone());
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function clearCachedModel(iterationId: string) {
  if (typeof window === "undefined" || !("caches" in window)) {
    return;
  }
  const cacheKey = `model_glb_${iterationId}`;
  const cache = await caches.open(CACHE_NAME);
  await cache.delete(cacheKey);
}

export async function clearAllModelCache() {
  if (typeof window === "undefined" || !("caches" in window)) {
    return;
  }
  await caches.delete(CACHE_NAME);
}

