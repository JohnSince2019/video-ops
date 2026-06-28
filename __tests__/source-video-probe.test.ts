import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { attachProbeToSourceMetadata, probeSourceVideo } from "../lib/raw-video/source-video-probe.js";
import { renderJobArtifacts } from "../lib/video/local-renderer.js";

const manifest = {
  $schema: "https://video-ops.example.com/manifest-v1.schema.json",
  id: "manifest-source-probe-test",
  title: "Source Probe Test",
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
  ],
  metadata: {
    created_at: new Date("2026-06-28T00:00:00.000Z").toISOString(),
    author: "John",
    copyright_license: "commercial",
  },
};

test("source-video probe returns duration, resolution, fps, and audio/video presence", async () => {
  const rendered = await renderJobArtifacts({
    jobId: "job-source-probe",
    manifest,
    mode: "ffmpeg",
  });

  const probe = await probeSourceVideo(rendered.outputPackage.video.path);

  assert.equal(probe.durationSec > 0, true);
  assert.equal(typeof probe.resolution, "string");
  assert.equal(probe.resolution?.includes("x"), true);
  assert.equal(typeof probe.fps, "number");
  assert.equal(probe.hasAudio, true);
  assert.equal(probe.hasVideo, true);
  assert.equal(probe.streamTypes.includes("audio"), true);
  assert.equal(probe.streamTypes.includes("video"), true);
});

test("source-video probe can be attached back into source metadata json", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "video-ops-source-metadata-"));
  const metadataPath = path.join(dir, "source-video.json");
  const probe = {
    durationSec: 12.3,
    width: 1080,
    height: 1920,
    resolution: "1080x1920",
    fps: 30,
    hasAudio: true,
    hasVideo: true,
    streamTypes: ["video", "audio"],
    videoCodec: "h264",
    audioCodec: "aac",
  };

  await import("node:fs/promises").then((fs) =>
    fs.writeFile(metadataPath, JSON.stringify({ id: "sv-1", jobId: "job-1" }, null, 2), "utf8"),
  );

  const updated = await attachProbeToSourceMetadata(metadataPath, probe);
  const persisted = JSON.parse(readFileSync(metadataPath, "utf8"));

  assert.equal(updated.probe.resolution, "1080x1920");
  assert.equal(updated.probe.fps, 30);
  assert.equal(persisted.probe.audioCodec, "aac");
});
