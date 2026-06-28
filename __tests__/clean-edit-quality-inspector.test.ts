import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildJobAssetPaths } from "../lib/assets/job-assets.js";
import {
  attachCleanEditAudioNormalizationToSourceMetadata,
  normalizeCleanEditAudio,
} from "../lib/raw-video/clean-edit-audio-normalizer.js";
import { assembleCleanEditFromClipManifest } from "../lib/raw-video/clean-edit-assembler.js";
import {
  attachCleanEditQualityInspectionToSourceMetadata,
  inspectCleanEditQuality,
} from "../lib/raw-video/clean-edit-quality-inspector.js";
import { cutRawVideoEdlClips } from "../lib/raw-video/edl-clip-cutter.js";
import { createEmptyRawVideoEdl } from "../lib/raw-video/edl-schema.js";
import { buildSourceVideo } from "../lib/raw-video/source-video.js";
import { renderJobArtifacts } from "../lib/video/local-renderer.js";

const manifest = {
  $schema: "https://video-ops.example.com/manifest-v1.schema.json",
  id: "manifest-clean-edit-quality-test",
  title: "Clean Edit Quality Fixture",
  platform: "douyin" as const,
  renderProfile: "draft" as const,
  scenes: [
    {
      id: "scene-001",
      scene_hash: "scene-hash-001",
      prompt_hash: "prompt-hash-001",
      duration_ms: 1500,
      narration: "第一段",
      script_type: "narration" as const,
      mood: "calm" as const,
      visual_hint: "画面一",
      audio: { tts_voice: "zh-CN-male-yunze" },
    },
    {
      id: "scene-002",
      scene_hash: "scene-hash-002",
      prompt_hash: "prompt-hash-002",
      duration_ms: 1600,
      narration: "第二段",
      script_type: "narration" as const,
      mood: "calm" as const,
      visual_hint: "画面二",
      audio: { tts_voice: "zh-CN-male-yunze" },
    },
    {
      id: "scene-003",
      scene_hash: "scene-hash-003",
      prompt_hash: "prompt-hash-003",
      duration_ms: 1700,
      narration: "第三段",
      script_type: "narration" as const,
      mood: "calm" as const,
      visual_hint: "画面三",
      audio: { tts_voice: "zh-CN-male-yunze" },
    },
  ],
  metadata: {
    created_at: new Date("2026-06-28T00:00:00.000Z").toISOString(),
    author: "John",
    copyright_license: "commercial",
  },
};

test("inspectCleanEditQuality validates playability, duration, streams, and loudness-report presence", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-clean-edit-quality-"));
  const jobId = "job-clean-edit-quality";
  const sourceVideo = buildSourceVideo(jobId, { fileName: "source.mp4" });
  const outputPaths = buildJobAssetPaths(jobId);
  const rendered = await renderJobArtifacts({
    jobId: "job-clean-edit-quality-source",
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
  edl.totalDurationMs = 4800;
  edl.clips = [
    {
      clipId: "clip-1",
      sourceVideoId: sourceVideo.id,
      startMs: 0,
      endMs: 1200,
      durationMs: 1200,
      transcriptText: "第一段",
      reviewState: "kept",
      reviewReason: "保留开场",
    },
    {
      clipId: "clip-2",
      sourceVideoId: sourceVideo.id,
      startMs: 1200,
      endMs: 2600,
      durationMs: 1400,
      transcriptText: "第二段",
      reviewState: "removed",
      reviewReason: "删掉过渡",
    },
    {
      clipId: "clip-3",
      sourceVideoId: sourceVideo.id,
      startMs: 2600,
      endMs: 4200,
      durationMs: 1600,
      transcriptText: "第三段",
      reviewState: "restored",
      reviewReason: "恢复结尾",
    },
  ];

  const clipManifest = await cutRawVideoEdlClips({
    workspaceRoot,
    sourceVideoPath: sourceVideo.originalPath,
    edl,
    clipsDir: outputPaths.clipsDir,
    clipManifestPath: outputPaths.clipManifestPath,
  });
  await assembleCleanEditFromClipManifest({
    workspaceRoot,
    clipManifest,
    outputPath: outputPaths.cleanEditPath,
  });
  const normalizedAudio = await normalizeCleanEditAudio({
    workspaceRoot,
    inputPath: outputPaths.cleanEditPath,
    outputPath: outputPaths.normalizedCleanEditPath,
    reportPath: outputPaths.loudnessReportPath,
  });

  const inspection = await inspectCleanEditQuality({
    workspaceRoot,
    inspectedPath: normalizedAudio.outputPath,
    clipManifest,
    loudnessReportPath: normalizedAudio.reportPath,
    reportPath: outputPaths.cleanEditQualityReportPath,
  });

  assert.equal(inspection.version, "raw-video-clean-edit-quality-v1");
  assert.equal(inspection.qualityPassed, true);
  assert.equal(inspection.expectedDurationSec, 2.8);
  assert.equal(inspection.actualDurationSec > 2.3, true);
  assert.equal((inspection.durationDeltaSec ?? 0) < 0.45, true);
  assert.equal(inspection.streamTypes.includes("audio"), true);
  assert.equal(inspection.streamTypes.includes("video"), true);
  assert.equal(inspection.checks.every((check) => check.passed), true);
  assert.equal(existsSync(path.join(workspaceRoot, outputPaths.cleanEditQualityReportPath)), true);
});

test("attachCleanEditQualityInspectionToSourceMetadata stores quality summary for later gates", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-clean-edit-quality-meta-"));
  const sourceVideo = buildSourceVideo("job-clean-edit-quality-meta", { fileName: "source.mp4" });
  const metadataPath = path.join(workspaceRoot, sourceVideo.metadataPath);

  await import("node:fs/promises").then((fs) =>
    fs.mkdir(path.dirname(metadataPath), { recursive: true }).then(() =>
      fs.writeFile(metadataPath, JSON.stringify({ id: sourceVideo.id, jobId: sourceVideo.jobId }, null, 2), "utf8"),
    ),
  );

  const updated = await attachCleanEditQualityInspectionToSourceMetadata({
    metadataPath,
    inspection: {
      version: "raw-video-clean-edit-quality-v1",
      inspectedPath: sourceVideo.normalizedCleanEditPath,
      inspectedUrl: `/${sourceVideo.normalizedCleanEditPath}`,
      reportPath: sourceVideo.cleanEditQualityReportPath,
      expectedDurationSec: 2.8,
      actualDurationSec: 2.79,
      durationDeltaSec: 0.01,
      durationToleranceSec: 0.45,
      fileSizeBytes: 1024,
      resolution: "1080x1920",
      streamTypes: ["video", "audio"],
      qualityPassed: true,
      checks: [
        { key: "playable", passed: true, details: "ok" },
        { key: "duration_match", passed: true, details: "ok" },
        { key: "audio_track", passed: true, details: "ok" },
        { key: "video_track", passed: true, details: "ok" },
        { key: "loudness_report", passed: true, details: "ok" },
      ],
    },
  });

  const persisted = JSON.parse(readFileSync(metadataPath, "utf8"));
  assert.equal(updated.cleanEditQualityInspection.qualityPassed, true);
  assert.equal(updated.cleanEditQualityInspection.reportPath, sourceVideo.cleanEditQualityReportPath);
  assert.equal(persisted.cleanEditQualityInspection.checks[0].key, "playable");
});
