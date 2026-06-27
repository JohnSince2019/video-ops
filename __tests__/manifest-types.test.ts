import test from "node:test";
import assert from "node:assert/strict";

import type { ContentManifest } from "../lib/types/manifest.js";

test("accepts a valid content manifest shape", () => {
  const manifest: ContentManifest = {
    $schema: "https://video-ops.example.com/manifest-v1.schema.json",
    id: "uuid-v4",
    title: "示例视频标题",
    platform: "douyin",
    renderProfile: "standard",
    scenes: [
      {
        id: "scene-001",
        scene_hash: "scene-hash-001",
        prompt_hash: "prompt-hash-001",
        duration_ms: 5000,
        narration: "今天聊聊如何用 AI 提高效率。",
        script_type: "narration",
        mood: "inspiring",
        visual_hint: "一位工程师在白板前讲解",
        audio: {
          tts_voice: "zh-CN-female-yunyang",
          bgm: "upbeat-lofi-001",
        },
      },
    ],
    metadata: {
      created_at: "2026-06-26T00:00:00.000Z",
      author: "John",
      copyright_license: "commercial",
    },
  };

  assert.equal(manifest.platform, "douyin");
  assert.equal(manifest.scenes[0]?.script_type, "narration");
  assert.equal(manifest.metadata.author, "John");
});
