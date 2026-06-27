import { generateCachedMainImage } from "../lib/image/cached-image-generator.ts";
import { MemoryImageCache } from "../lib/image/image-cache.ts";

const cache = new MemoryImageCache();
let fetchCount = 0;

const scene = {
  id: "scene-004",
  scene_hash: "scene-hash-demo-004",
  prompt_hash: "prompt-hash-demo-004",
  narration: "第一次调用 miss，第二次调用应该直接命中缓存。",
  visual_hint: "缓存命中前后对比的流程图",
  script_type: "narration",
  mood: "calm",
};

const fetchImpl = async () => {
  fetchCount += 1;
  return new Response(
    JSON.stringify({
      data: [{ url: "mock://generated/cache/scene-004.png" }],
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};

const first = await generateCachedMainImage(
  { scene, model: "gpt-image-2" },
  { cache, fetchImpl },
);
const second = await generateCachedMainImage(
  { scene, model: "gpt-image-2" },
  { cache, fetchImpl },
);

cache.set(
  {
    key: {
      sceneHash: scene.scene_hash,
      promptHash: "expired-prompt",
    },
    result: first,
    ttlMs: 10,
  },
  0,
);

const expiredRead = cache.get(
  {
    sceneHash: scene.scene_hash,
    promptHash: "expired-prompt",
  },
  11,
);

console.log(
  JSON.stringify(
    {
      fetchCount,
      first: {
        cacheHit: first.cacheHit,
        artifact: first.artifacts[0],
      },
      second: {
        cacheHit: second.cacheHit,
        artifact: second.artifacts[0],
      },
      expiredRead,
    },
    null,
    2,
  ),
);
