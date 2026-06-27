import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { renderJobArtifacts } from "../lib/video/local-renderer.js";

const manifest = {
  $schema: "https://video-ops.example.com/manifest-v1.schema.json",
  id: "manifest-renderer-test",
  title: "Renderer Test",
  platform: "douyin" as const,
  renderProfile: "draft" as const,
  scenes: [
    {
      id: "scene-001",
      scene_hash: "scene-hash-001",
      prompt_hash: "prompt-hash-001",
      duration_ms: 1200,
      narration: "第一幕",
      script_type: "narration" as const,
      mood: "calm" as const,
      visual_hint: "测试画面一",
      audio: { tts_voice: "zh-CN-male-yunze" },
    },
    {
      id: "scene-002",
      scene_hash: "scene-hash-002",
      prompt_hash: "prompt-hash-002",
      duration_ms: 1400,
      narration: "第二幕",
      script_type: "narration" as const,
      mood: "inspiring" as const,
      visual_hint: "测试画面二",
      audio: { tts_voice: "zh-CN-male-yunze" },
    },
  ],
  metadata: {
    created_at: new Date("2026-06-27T00:00:00.000Z").toISOString(),
    author: "John",
    copyright_license: "commercial",
    tts_provider_id: "cosyvoice-mlx",
    tts_route_label: "默认中文解说路线",
  },
};

test("mock renderer writes output package artifacts and preview url", async () => {
  const result = await renderJobArtifacts({
    jobId: "job-renderer-mock",
    manifest,
    mode: "mock",
  });

  assert.equal(result.providerMetadata.provider, "mock-renderer");
  assert.equal(result.outputPackage.video.path, "output/jobs/job-renderer-mock/video.mp4");
  assert.equal(result.previewUrl, "/output/jobs/job-renderer-mock/video.mp4");
  assert.equal(existsSync(result.outputPackage.video.path), true);
  assert.equal(existsSync(result.outputPackage.cover.path), true);
  assert.equal(existsSync(result.outputPackage.metadataFile.path), true);
  assert.match(readFileSync(result.outputPackage.metadataFile.path, "utf8"), /mock-renderer/);
  assert.match(readFileSync(result.outputPackage.metadataFile.path, "utf8"), /默认中文解说路线/);
});

test("auto mode falls back to mock metadata when ffmpeg rendering cannot be used", async () => {
  const previousCi = process.env.CI;
  process.env.CI = "true";

  try {
    const result = await renderJobArtifacts({
      jobId: "job-renderer-auto",
      manifest,
      mode: "auto",
    });

    assert.equal(result.providerMetadata.provider, "mock-renderer");
    assert.equal(result.providerMetadata.mode, "primary");
    assert.equal(existsSync(result.outputPackage.video.path), true);
  } finally {
    process.env.CI = previousCi;
  }
});

test("renderer carries custom voice reference into generated audio metadata", async () => {
  const customVoiceManifest = {
    ...manifest,
    id: "manifest-renderer-custom-voice",
    scenes: [
      {
        ...manifest.scenes[0],
        audio: {
          ...manifest.scenes[0].audio,
          reference_audio_path: "/tmp/custom-voice-reference.wav",
        },
      },
    ],
  };

  const result = await renderJobArtifacts({
    jobId: "job-renderer-custom-voice",
    manifest: customVoiceManifest,
    mode: "mock",
  });

  assert.equal(result.timeline.clips[0]?.audio.voice, "zh-CN-male-yunze");
  assert.equal(result.timeline.clips[0]?.audio.path.endsWith(".wav"), true);
  assert.equal(result.outputPackage.metadataFile.content.includes("mock-renderer"), true);
});
