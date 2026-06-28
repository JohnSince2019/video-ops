import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildJobAssetPaths } from "../lib/assets/job-assets.js";
import {
  assembleCleanEditFromClipManifest,
  attachCleanEditToSourceMetadata,
} from "../lib/raw-video/clean-edit-assembler.js";
import { cutRawVideoEdlClips } from "../lib/raw-video/edl-clip-cutter.js";
import { createEmptyRawVideoEdl } from "../lib/raw-video/edl-schema.js";
import { buildSourceVideo } from "../lib/raw-video/source-video.js";
import { probeSourceVideo } from "../lib/raw-video/source-video-probe.js";
import { renderJobArtifacts } from "../lib/video/local-renderer.js";

const manifest = {
  $schema: "https://video-ops.example.com/manifest-v1.schema.json",
  id: "manifest-clean-edit-assembler-test",
  title: "Clean Edit Assembler Fixture",
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

test("assembleCleanEditFromClipManifest concatenates approved clips into clean-edit.mp4", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-clean-edit-"));
  const jobId = "job-clean-edit-assembler";
  const sourceVideo = buildSourceVideo(jobId, { fileName: "source.mp4" });
  const outputPaths = buildJobAssetPaths(jobId);
  const rendered = await renderJobArtifacts({
    jobId: "job-clean-edit-source",
    manifest,
    mode: "ffmpeg",
  });

  const absoluteSourcePath = path.join(workspaceRoot, sourceVideo.originalPath);
  const metadataPath = path.join(workspaceRoot, sourceVideo.metadataPath);
  await import("node:fs/promises").then((fs) =>
    Promise.all([
      fs.mkdir(path.dirname(absoluteSourcePath), { recursive: true }).then(() => fs.copyFile(rendered.outputPackage.video.path, absoluteSourcePath)),
      fs.mkdir(path.dirname(metadataPath), { recursive: true }).then(() =>
        fs.writeFile(metadataPath, JSON.stringify({ id: sourceVideo.id, jobId: sourceVideo.jobId }, null, 2), "utf8"),
      ),
    ]),
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

  const cleanEdit = await assembleCleanEditFromClipManifest({
    workspaceRoot,
    clipManifest,
    outputPath: outputPaths.cleanEditPath,
  });

  assert.equal(cleanEdit.version, "raw-video-clean-edit-v1");
  assert.equal(cleanEdit.approvedClipCount, 2);
  assert.equal(cleanEdit.skippedClipCount, 1);
  assert.deepEqual(cleanEdit.approvedClipIds, ["clip-1", "clip-3"]);
  assert.equal(existsSync(path.join(workspaceRoot, cleanEdit.outputPath)), true);
  assert.equal(existsSync(path.join(workspaceRoot, cleanEdit.concatListPath)), true);

  const probe = await probeSourceVideo(path.join(workspaceRoot, cleanEdit.outputPath));
  assert.equal(probe.hasAudio, true);
  assert.equal(probe.hasVideo, true);
  assert.equal(probe.durationSec > 2.3, true);
  assert.equal(probe.durationSec < 3.4, true);
});

test("attachCleanEditToSourceMetadata persists clean edit output summary", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-clean-edit-meta-"));
  const sourceVideo = buildSourceVideo("job-clean-edit-meta", { fileName: "source.mp4" });
  const metadataPath = path.join(workspaceRoot, sourceVideo.metadataPath);

  await import("node:fs/promises").then((fs) =>
    fs.mkdir(path.dirname(metadataPath), { recursive: true }).then(() =>
      fs.writeFile(metadataPath, JSON.stringify({ id: sourceVideo.id, jobId: sourceVideo.jobId }, null, 2), "utf8"),
    ),
  );

  const updated = await attachCleanEditToSourceMetadata({
    metadataPath,
    cleanEdit: {
      version: "raw-video-clean-edit-v1",
      jobId: sourceVideo.jobId,
      sourceVideoId: sourceVideo.id,
      approvedClipCount: 2,
      skippedClipCount: 1,
      outputPath: sourceVideo.cleanEditPath,
      outputUrl: `/${sourceVideo.cleanEditPath}`,
      concatListPath: "output/jobs/job-clean-edit-meta/clean-edit-concat.txt",
      approvedClipIds: ["clip-1", "clip-3"],
    },
  });

  const persisted = JSON.parse(readFileSync(metadataPath, "utf8"));
  assert.equal(updated.cleanEditArtifacts.outputPath, sourceVideo.cleanEditPath);
  assert.equal(updated.cleanEditArtifacts.approvedClipCount, 2);
  assert.deepEqual(persisted.cleanEditArtifacts.approvedClipIds, ["clip-1", "clip-3"]);
});
