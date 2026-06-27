import type { GenerateImageResult } from "./gpt-image-client.js";
import {
  MemoryAssetCache,
  buildAssetCacheKey,
  type AssetCacheKey,
} from "../cache/asset-cache.js";

export type ImageCacheKey = {
  sceneHash: string;
  promptHash: string;
};

export type CachedImageRecord = {
  key: ImageCacheKey;
  result: GenerateImageResult;
  ttlMs?: number;
};

export function buildImageCacheKey(key: ImageCacheKey) {
  return `${key.sceneHash}:${key.promptHash}`;
}

export function toAssetCacheKey(
  key: ImageCacheKey,
  assetType: "image" | "broll" = "image",
): AssetCacheKey {
  return {
    assetType,
    hashKey: buildImageCacheKey(key),
  };
}

export class MemoryImageCache {
  constructor(
    private readonly assetCache = new MemoryAssetCache<GenerateImageResult>(),
    private readonly assetType: "image" | "broll" = "image",
  ) {}

  get(key: ImageCacheKey, now?: number) {
    return this.assetCache.get(toAssetCacheKey(key, this.assetType), now);
  }

  set(record: CachedImageRecord, now = Date.now()) {
    this.assetCache.set({
      key: toAssetCacheKey(record.key, this.assetType),
      value: record.result,
      expiresAt: record.ttlMs ? now + record.ttlMs : undefined,
    });
    return record.result;
  }

  has(key: ImageCacheKey, now?: number) {
    return this.assetCache.has(toAssetCacheKey(key, this.assetType), now);
  }

  clear() {
    this.assetCache.clear();
  }
}

export function getSceneCacheKey(scene: { scene_hash: string; prompt_hash: string }): ImageCacheKey {
  return {
    sceneHash: scene.scene_hash,
    promptHash: scene.prompt_hash,
  };
}
