import assert from "node:assert/strict";
import test from "node:test";

import { buildSubtitleArtifacts } from "../lib/video/subtitle-artifacts.js";

const manifest = {
  $schema: "https://video-ops.example.com/manifest-v1.schema.json",
  id: "subtitle-test",
  title: "字幕测试",
  platform: "douyin" as const,
  renderProfile: "standard" as const,
  scenes: [
    {
      id: "scene-001",
      scene_hash: "scene-hash-001",
      prompt_hash: "prompt-hash-001",
      duration_ms: 3000,
      narration: "第一句字幕",
      script_type: "narration" as const,
      mood: "calm" as const,
      audio: { tts_voice: "zh-CN-male-yunze" },
    },
    {
      id: "scene-002",
      scene_hash: "scene-hash-002",
      prompt_hash: "prompt-hash-002",
      duration_ms: 2500,
      narration: "第二句字幕",
      script_type: "narration" as const,
      mood: "inspiring" as const,
      audio: { tts_voice: "zh-CN-male-yunze" },
    },
  ],
  metadata: {
    created_at: new Date("2026-06-28T00:00:00.000Z").toISOString(),
    author: "John",
    copyright_license: "commercial",
  },
};

test("builds subtitle cues plus srt and vtt content from manifest scenes", () => {
  const result = buildSubtitleArtifacts(manifest);

  assert.equal(result.cues.length, 2);
  assert.equal(result.cues[0]?.startMs, 0);
  assert.equal(result.cues[0]?.endMs, 3000);
  assert.equal(result.cues[1]?.startMs, 3000);
  assert.match(result.srt, /00:00:00,000 --> 00:00:03,000/);
  assert.match(result.srt, /第一句字幕/);
  assert.match(result.vtt, /WEBVTT/);
  assert.match(result.vtt, /00:00:03.000 --> 00:00:05.500/);
});
