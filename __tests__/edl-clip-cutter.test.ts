import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildJobAssetPaths } from "../lib/assets/job-assets.js";
import {
  attachClipManifestToSourceMetadata,
  cutRawVideoEdlClips,
} from "../lib/raw-video/edl-clip-cutter.js";
import { createEmptyRawVideoEdl } from "../lib/raw-video/edl-schema.js";
import { buildSourceVideo } from "../lib/raw-video/source-video.js";
import { probeSourceVideo } from "../lib/raw-video/source-video-probe.js";
import { renderJobArtifacts } from "../lib/video/local-renderer.js";

const manifest = {
  $schema: "https://video-ops.example.com/manifest-v1.schema.json",
  id: "manifest-edl-clip-cutter-test",
  title: "EDL Clip Cutter Fixture",
  platform: "douyin" as const,
  renderProfile: "draft" as const,
  scenes: [
    {
      id: "scene-001",
      scene_hash: "scene-hash-001",
      prompt_hash: "prompt-hash-001",
      duration_ms: 1600,
      narration: "第一幕 讲引子",
      script_type: "narration" as const,
      mood: "calm" as const,
      visual_hint: "测试画面一",
      audio: { tts_voice: "zh-CN-male-yunze" },
    },
    {
      id: "scene-002",
      scene_hash: "scene-hash-002",
      prompt_hash: "prompt-hash-002",
      duration_ms: 1800,
      narration: "第二幕 讲方法",
      script_type: "narration" as const,
      mood: "calm" as const,
      visual_hint: "测试画面二",
      audio: { tts_voice: "zh-CN-male-yunze" },
    },
  ],
  metadata: {
    created_at: new Date("2026-06-28T00:00:00.000Z").toISOString(),
    author: "John",
    copyright_license: "commercial",
  },
};

test("cutRawVideoEdlClips cuts per-clip mp4 outputs and writes a clip manifest", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-edl-cutter-"));
  const jobId = "job-edl-clip-cutter";
  const sourceVideo = buildSourceVideo(jobId, { fileName: "source.mp4" });
  const outputPaths = buildJobAssetPaths(jobId);
  const rendered = await renderJobArtifacts({
    jobId: "job-edl-clip-source",
    manifest,
    mode: "ffmpeg",
  });

  const absoluteSourcePath = path.join(workspaceRoot, sourceVideo.originalPath);
  await import("node:fs/promises").then((fs) =>
    fs.mkdir(path.dirname(absoluteSourcePath), { recursive: true }).then(() => fs.copyFile(rendered.outputPackage.video.path, absoluteSourcePath)),
  );

  const edl = createEmptyRawVideoEdl({
    jobId,
    sourceVideoId: sourceVideo.id,
  });
  edl.totalDurationMs = 3400;
  edl.clips = [
    {
      clipId: "clip-hook",
      sourceVideoId: sourceVideo.id,
      startMs: 0,
      endMs: 1400,
      durationMs: 1400,
      transcriptText: "第一段保留",
      reviewState: "kept",
      reviewReason: "开场要保留",
    },
    {
      clipId: "clip-method",
      sourceVideoId: sourceVideo.id,
      startMs: 1400,
      endMs: 3000,
      durationMs: 1600,
      transcriptText: "第二段保留",
      reviewState: "restored",
      reviewReason: "方法说明恢复保留",
    },
  ];

  const clipManifest = await cutRawVideoEdlClips({
    workspaceRoot,
    sourceVideoPath: sourceVideo.originalPath,
    edl,
    clipsDir: outputPaths.clipsDir,
    clipManifestPath: outputPaths.clipManifestPath,
  });

  assert.equal(clipManifest.version, "raw-video-clip-manifest-v1");
  assert.equal(clipManifest.clipCount, 2);
  assert.equal(clipManifest.clips[0]?.outputPath, "output/jobs/job-edl-clip-cutter/clips/001-clip-hook.mp4");
  assert.equal(clipManifest.clips[1]?.reviewState, "restored");
  assert.equal(existsSync(path.join(workspaceRoot, clipManifest.clips[0]!.outputPath)), true);
  assert.equal(existsSync(path.join(workspaceRoot, clipManifest.clips[1]!.outputPath)), true);
  assert.equal(existsSync(path.join(workspaceRoot, outputPaths.clipManifestPath)), true);

  const clipProbe = await probeSourceVideo(path.join(workspaceRoot, clipManifest.clips[0]!.outputPath));
  assert.equal(clipProbe.hasAudio, true);
  assert.equal(clipProbe.hasVideo, true);
  assert.equal(clipProbe.durationSec > 1, true);
  assert.equal(clipProbe.durationSec < 1.8, true);
});

test("attachClipManifestToSourceMetadata stores clip artifact summary for downstream clean edit", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-edl-meta-"));
  const sourceVideo = buildSourceVideo("job-edl-meta", { fileName: "source.mp4" });
  const metadataPath = path.join(workspaceRoot, sourceVideo.metadataPath);

  await import("node:fs/promises").then((fs) =>
    fs.mkdir(path.dirname(metadataPath), { recursive: true }).then(() =>
      fs.writeFile(metadataPath, JSON.stringify({ id: sourceVideo.id, jobId: sourceVideo.jobId }, null, 2), "utf8"),
    ),
  );

  const updated = await attachClipManifestToSourceMetadata({
    metadataPath,
    clipManifestPath: sourceVideo.clipManifestPath,
    clipManifest: {
      version: "raw-video-clip-manifest-v1",
      jobId: sourceVideo.jobId,
      sourceVideoId: sourceVideo.id,
      clipCount: 1,
      clips: [
        {
          clipId: "clip-001",
          sourceVideoId: sourceVideo.id,
          startMs: 0,
          endMs: 1200,
          durationMs: 1200,
          transcriptText: "测试片段",
          reviewState: "kept",
          outputPath: "output/jobs/job-edl-meta/clips/001-clip-001.mp4",
          outputUrl: "/output/jobs/job-edl-meta/clips/001-clip-001.mp4",
        },
      ],
    },
  });

  const persisted = JSON.parse(readFileSync(metadataPath, "utf8"));
  assert.equal(updated.clipArtifacts.clipCount, 1);
  assert.equal(updated.clipArtifacts.manifestPath, sourceVideo.clipManifestPath);
  assert.equal(persisted.clipArtifacts.clips[0].clipId, "clip-001");
});
