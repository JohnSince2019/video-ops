import {
  type GatewayFetch,
  type GenerateImageInput,
  type GenerateImageResult,
  generateImageForScene,
} from "./gpt-image-client.js";
import { buildBrollRequestBody, generateBrollForScene, type GenerateBrollImageInput } from "./wanx-broll-client.js";
import { MemoryImageCache, getSceneCacheKey } from "./image-cache.js";

export type CachedImageGenerationResult = GenerateImageResult & {
  cacheHit: boolean;
};

function withCacheHit(result: GenerateImageResult, cacheHit: boolean): CachedImageGenerationResult {
  return {
    ...result,
    cacheHit,
  };
}

export async function generateCachedMainImage(
  input: GenerateImageInput,
  options: {
    cache?: MemoryImageCache;
    baseUrl?: string;
    fetchImpl?: GatewayFetch;
    ttlMs?: number;
  } = {},
): Promise<CachedImageGenerationResult> {
  const cache = options.cache ?? new MemoryImageCache();
  const key = getSceneCacheKey(input.scene);
  const cached = cache.get(key);
  if (cached) {
    return withCacheHit(cached, true);
  }

  const result = await generateImageForScene(input, options);
  cache.set({ key, result, ttlMs: options.ttlMs });
  return withCacheHit(result, false);
}

export async function generateCachedBrollImage(
  input: GenerateBrollImageInput,
  options: {
    cache?: MemoryImageCache;
    baseUrl?: string;
    fetchImpl?: GatewayFetch;
    ttlMs?: number;
  } = {},
): Promise<CachedImageGenerationResult> {
  const cache = options.cache ?? new MemoryImageCache(undefined, "broll");
  const key = getSceneCacheKey(input.scene);
  const cached = cache.get(key);
  if (cached) {
    return withCacheHit(cached, true);
  }

  const result = await generateBrollForScene(input, options);
  cache.set({ key, result, ttlMs: options.ttlMs });
  return withCacheHit(result, false);
}

export { buildBrollRequestBody };
