import { renderJobArtifacts } from "../lib/video/local-renderer.ts";

const manifest = {
  $schema: "https://video-ops.example.com/manifest-v1.schema.json",
  id: "manifest-renderer-smoke",
  title: "Renderer Smoke",
  platform: "douyin",
  renderProfile: "draft",
  scenes: [
    {
      id: "scene-001",
      scene_hash: "scene-hash-smoke-001",
      prompt_hash: "prompt-hash-smoke-001",
      duration_ms: 1500,
      narration: "卧推肩疼，先别急着怪器械。",
      script_type: "narration",
      mood: "calm",
      visual_hint: "一个简洁的训练场景",
      audio: { tts_voice: "zh-CN-male-yunze" },
    },
    {
      id: "scene-002",
      scene_hash: "scene-hash-smoke-002",
      prompt_hash: "prompt-hash-smoke-002",
      duration_ms: 1800,
      narration: "先看手肘是不是外展太开。",
      script_type: "narration",
      mood: "inspiring",
      visual_hint: "手肘角度示意画面",
      audio: { tts_voice: "zh-CN-male-yunze" },
    },
  ],
  metadata: {
    created_at: new Date().toISOString(),
    author: "John",
    copyright_license: "commercial",
  },
};

const result = await renderJobArtifacts({
  jobId: "job-renderer-smoke",
  manifest,
  mode: "ffmpeg",
});

console.log(
  JSON.stringify(
    {
      videoPath: result.outputPackage.video.path,
      previewUrl: result.previewUrl,
      probe: result.probe,
      provider: result.providerMetadata,
    },
    null,
    2,
  ),
);
