import assert from "node:assert/strict";
import test from "node:test";

import {
  MemoryAssetCache,
  buildAssetCacheKey,
} from "../lib/cache/asset-cache.js";
import { MemoryImageCache, buildImageCacheKey, toAssetCacheKey } from "../lib/image/image-cache.js";

test("generic asset cache supports read, write, and hit behavior", () => {
  const cache = new MemoryAssetCache<{ url: string }>();
  const key = { assetType: "image" as const, hashKey: "scene-1:prompt-1" };

  cache.set({
    key,
    value: { url: "mock://asset.png" },
  });

  assert.equal(buildAssetCacheKey(key), "image:scene-1:prompt-1");
  assert.equal(cache.has(key), true);
  assert.equal(cache.get(key)?.url, "mock://asset.png");
});

test("generic asset cache respects ttl expiration", () => {
  const cache = new MemoryAssetCache<{ url: string }>();
  const key = { assetType: "image" as const, hashKey: "scene-2:prompt-2" };
  const now = 1000;

  cache.set({
    key,
    value: { url: "mock://asset-2.png" },
    expiresAt: now + 500,
  });

  assert.equal(cache.has(key, now + 100), true);
  assert.equal(cache.get(key, now + 600), undefined);
  assert.equal(cache.has(key, now + 600), false);
});

test("image cache is migrated onto the generic asset cache layer", () => {
  const imageCache = new MemoryImageCache();
  const key = { sceneHash: "scene-3", promptHash: "prompt-3" };

  imageCache.set({
    key,
    result: {
      sceneId: "scene-003",
      sceneHash: "scene-3",
      promptHash: "prompt-3",
      model: "gpt-image-2",
      prompt: "demo",
      size: "1024x1024",
      quality: "standard",
      responseFormat: "url",
      artifacts: [{ index: 0, url: "mock://cached.png", artifactKey: "scene-3:prompt-3:0" }],
    },
  });

  assert.equal(buildImageCacheKey(key), "scene-3:prompt-3");
  assert.deepEqual(toAssetCacheKey(key), {
    assetType: "image",
    hashKey: "scene-3:prompt-3",
  });
  assert.equal(imageCache.get(key)?.artifacts[0]?.url, "mock://cached.png");
});
