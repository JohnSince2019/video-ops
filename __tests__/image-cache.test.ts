import assert from "node:assert/strict";
import test from "node:test";

import { MemoryImageCache, buildImageCacheKey, getSceneCacheKey } from "../lib/image/image-cache.js";
import { generateCachedBrollImage, generateCachedMainImage } from "../lib/image/cached-image-generator.js";

const scene = {
  id: "scene-003",
  scene_hash: "scene-hash-003",
  prompt_hash: "prompt-hash-003",
  narration: "把重复劳动交给 AI，自己保留判断和验收。",
  visual_hint: "工作台上的任务列表和自动化流程图",
  script_type: "narration" as const,
  mood: "inspiring" as const,
};

test("cache key stays stable and does not depend on volatile fields", () => {
  const key = getSceneCacheKey(scene);

  assert.equal(key.sceneHash, "scene-hash-003");
  assert.equal(key.promptHash, "prompt-hash-003");
  assert.equal(buildImageCacheKey(key), "scene-hash-003:prompt-hash-003");
});

test("cache hit skips gateway fetch for the main image flow", async () => {
  const cache = new MemoryImageCache();
  let fetchCount = 0;

  const first = await generateCachedMainImage(
    { scene, model: "gpt-image-2" },
    {
      cache,
      fetchImpl: async () => {
        fetchCount += 1;
        return new Response(
          JSON.stringify({ data: [{ url: "mock://generated/main/scene-003.png" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  );

  const second = await generateCachedMainImage(
    { scene, model: "gpt-image-2" },
    {
      cache,
      fetchImpl: async () => {
        fetchCount += 1;
        return new Response(
          JSON.stringify({ data: [{ url: "mock://generated/main/scene-003-v2.png" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  );

  assert.equal(fetchCount, 1);
  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);
  assert.equal(second.artifacts[0]?.url, "mock://generated/main/scene-003.png");
});

test("cache miss writes successful main image results back into cache", async () => {
  const cache = new MemoryImageCache();

  const result = await generateCachedMainImage(
    { scene, model: "gpt-image-2" },
    {
      cache,
      fetchImpl: async () =>
        new Response(JSON.stringify({ data: [{ b64_json: "bWFpbi1pbWFnZQ==" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    },
  );

  assert.equal(result.cacheHit, false);
  assert.equal(cache.has(getSceneCacheKey(scene)), true);
  assert.equal(cache.get(getSceneCacheKey(scene))?.artifacts[0]?.b64_json, "bWFpbi1pbWFnZQ==");
});

test("main image and b-roll share the same cache service", async () => {
  const cache = new MemoryImageCache();
  let fetchCount = 0;

  const main = await generateCachedMainImage(
    { scene, model: "gpt-image-2" },
    {
      cache,
      fetchImpl: async () => {
        fetchCount += 1;
        return new Response(
          JSON.stringify({ data: [{ url: "mock://generated/shared/scene-003.png" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  );

  const broll = await generateCachedBrollImage(
    { scene, shotIntent: "supporting keyboard shot" },
    {
      cache,
      fetchImpl: async () => {
        fetchCount += 1;
        return new Response(
          JSON.stringify({ data: [{ url: "mock://generated/broll/scene-003.png" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  );

  assert.equal(fetchCount, 1);
  assert.equal(main.cacheHit, false);
  assert.equal(broll.cacheHit, true);
  assert.equal(broll.artifacts[0]?.url, "mock://generated/shared/scene-003.png");
});

test("expired entries become misses while return shape stays compatible", async () => {
  const cache = new MemoryImageCache();
  const now = 1000;

  cache.set(
    {
      key: getSceneCacheKey(scene),
      result: {
        sceneId: "scene-003",
        sceneHash: "scene-hash-003",
        promptHash: "prompt-hash-003",
        model: "gpt-image-2",
        prompt: "demo",
        size: "1024x1024",
        quality: "standard",
        responseFormat: "url",
        artifacts: [{ index: 0, url: "mock://expired.png", artifactKey: "scene-hash-003:prompt-hash-003:0" }],
      },
      ttlMs: 100,
    },
    now,
  );

  assert.equal(cache.get(getSceneCacheKey(scene), now + 50)?.sceneId, "scene-003");
  assert.equal(cache.get(getSceneCacheKey(scene), now + 150), undefined);
});
