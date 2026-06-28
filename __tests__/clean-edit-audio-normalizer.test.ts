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
import { cutRawVideoEdlClips } from "../lib/raw-video/edl-clip-cutter.js";
import { createEmptyRawVideoEdl } from "../lib/raw-video/edl-schema.js";
import { buildSourceVideo } from "../lib/raw-video/source-video.js";
import { probeSourceVideo } from "../lib/raw-video/source-video-probe.js";
import { renderJobArtifacts } from "../lib/video/local-renderer.js";

const manifest = {
  $schema: "https://video-ops.example.com/manifest-v1.schema.json",
  id: "manifest-clean-edit-audio-normalizer-test",
  title: "Clean Edit Audio Normalizer Fixture",
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

test("normalizeCleanEditAudio generates a loudness-normalized clean edit and report", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-clean-edit-audio-"));
  const jobId = "job-clean-edit-audio";
  const sourceVideo = buildSourceVideo(jobId, { fileName: "source.mp4" });
  const outputPaths = buildJobAssetPaths(jobId);
  const rendered = await renderJobArtifacts({
    jobId: "job-clean-edit-audio-source",
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

  const normalized = await normalizeCleanEditAudio({
    workspaceRoot,
    inputPath: outputPaths.cleanEditPath,
    outputPath: outputPaths.normalizedCleanEditPath,
    reportPath: outputPaths.loudnessReportPath,
  });

  assert.equal(normalized.version, "raw-video-clean-edit-audio-v1");
  assert.equal(normalized.outputPath, outputPaths.normalizedCleanEditPath);
  assert.equal(normalized.reportPath, outputPaths.loudnessReportPath);
  assert.equal(existsSync(path.join(workspaceRoot, normalized.outputPath)), true);
  assert.equal(existsSync(path.join(workspaceRoot, normalized.reportPath!)), true);
  assert.equal(normalized.report.normalizationType !== null, true);
  assert.equal(normalized.report.outputIntegratedLufs !== null, true);
  assert.equal(normalized.report.outputTruePeakDb !== null, true);
  assert.equal(Math.abs((normalized.report.outputIntegratedLufs ?? 0) - normalized.target.integratedLufs) < 2.5, true);
  assert.equal((normalized.report.outputTruePeakDb ?? 0) <= 0, true);

  const probe = await probeSourceVideo(path.join(workspaceRoot, normalized.outputPath));
  assert.equal(probe.hasAudio, true);
  assert.equal(probe.hasVideo, true);
});

test("attachCleanEditAudioNormalizationToSourceMetadata stores normalized output summary", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-clean-edit-audio-meta-"));
  const sourceVideo = buildSourceVideo("job-clean-edit-audio-meta", { fileName: "source.mp4" });
  const metadataPath = path.join(workspaceRoot, sourceVideo.metadataPath);

  await import("node:fs/promises").then((fs) =>
    fs.mkdir(path.dirname(metadataPath), { recursive: true }).then(() =>
      fs.writeFile(metadataPath, JSON.stringify({ id: sourceVideo.id, jobId: sourceVideo.jobId }, null, 2), "utf8"),
    ),
  );

  const updated = await attachCleanEditAudioNormalizationToSourceMetadata({
    metadataPath,
    normalizedAudio: {
      version: "raw-video-clean-edit-audio-v1",
      inputPath: sourceVideo.cleanEditPath,
      outputPath: sourceVideo.normalizedCleanEditPath,
      outputUrl: `/${sourceVideo.normalizedCleanEditPath}`,
      reportPath: sourceVideo.loudnessReportPath,
      target: {
        integratedLufs: -16,
        loudnessRange: 11,
        truePeakDb: -1.5,
      },
      report: {
        inputIntegratedLufs: -20.1,
        inputLoudnessRange: 2.4,
        inputTruePeakDb: -5.1,
        inputThresholdDb: -30.4,
        outputIntegratedLufs: -16.2,
        outputLoudnessRange: 2.8,
        outputTruePeakDb: -1.9,
        outputThresholdDb: -26.6,
        normalizationType: "dynamic",
        targetOffset: 0.2,
        target: {
          integratedLufs: -16,
          loudnessRange: 11,
          truePeakDb: -1.5,
        },
      },
    },
  });

  const persisted = JSON.parse(readFileSync(metadataPath, "utf8"));
  assert.equal(updated.cleanEditAudioNormalization.outputPath, sourceVideo.normalizedCleanEditPath);
  assert.equal(updated.cleanEditAudioNormalization.reportPath, sourceVideo.loudnessReportPath);
  assert.equal(updated.cleanEditAudioNormalization.measured.outputIntegratedLufs, -16.2);
  assert.equal(persisted.cleanEditAudioNormalization.target.truePeakDb, -1.5);
});
