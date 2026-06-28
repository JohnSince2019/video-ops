import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createRawVideoJobFromInput } from "../lib/raw-video/create-raw-video-job.js";
import { renderJobArtifacts } from "../lib/video/local-renderer.js";

const manifest = {
  $schema: "https://video-ops.example.com/manifest-v1.schema.json",
  id: "manifest-raw-video-entry-test",
  title: "Raw Video Entry Fixture",
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

test("raw video job entry creates a raw_video_edit job and persists source artifacts", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-raw-job-"));
  const fixture = await renderJobArtifacts({
    jobId: "job-raw-video-entry-fixture",
    manifest,
    mode: "ffmpeg",
  });
  const payload = readFileSync(fixture.outputPackage.video.path).toString("base64");

  const created = await createRawVideoJobFromInput(
    {
      title: "原始视频任务",
      ownerToken: "john-raw-video-owner",
      platform: "douyin",
      renderProfile: "standard",
      sourceFileName: "john-demo.mp4",
      sourceMimeType: "video/mp4",
      sourceVideoBase64: payload,
    },
    { workspaceRoot },
  );

  assert.equal(created.record.jobMode, "raw_video_edit");
  assert.equal(created.record.state, "QUEUED");
  assert.equal(created.record.currentStep, "source_video_received");
  assert.equal(created.record.qualitySummary?.audioPresence, true);
  assert.equal(typeof created.record.qualitySummary?.durationSec, "number");
  assert.equal(created.record.qualitySummary?.resolution?.includes("x"), true);
  assert.equal(created.sourceProbe?.hasAudio, true);
  assert.equal(created.sourceProbe?.hasVideo, true);
  assert.equal(created.sourceVideo.originalPath.includes("/source/john-demo.mp4"), true);
  assert.equal(created.record.outputs?.some((item) => item.kind === "source_video"), true);
  assert.equal(created.record.outputs?.some((item) => item.kind === "source_metadata"), true);
  assert.equal(created.record.outputs?.some((item) => item.kind === "proxy_video"), true);
  assert.equal(created.record.outputs?.some((item) => item.kind === "thumbnail"), true);
  assert.equal(created.record.outputs?.some((item) => item.kind === "transcript_json"), true);
  assert.equal(created.record.outputs?.some((item) => item.kind === "transcript_words"), true);
  assert.equal(created.record.outputs?.some((item) => item.kind === "subtitle_timeline"), true);
  assert.equal(created.record.outputs?.some((item) => item.kind === "subtitle_srt"), true);
  assert.equal(created.record.outputs?.some((item) => item.kind === "subtitle_vtt"), true);
  assert.equal(created.record.outputs?.some((item) => item.kind === "transcript_analysis"), true);
  assert.equal((created.record.outputs?.filter((item) => item.kind.startsWith("keyframe_")).length ?? 0) > 0, true);
  assert.equal(created.sourcePreviewArtifacts?.keyframePaths.length ? true : false, true);
  assert.equal(typeof created.transcript?.text, "string");
  assert.equal((created.transcript?.text.length ?? 0) >= 0, true);
  assert.equal(typeof created.subtitleTimeline?.cueCount, "number");
  assert.equal(typeof created.transcriptAnalysis?.topic, "string");
  assert.equal(created.editIntentOptions.trimIntensity, "conservative");
  assert.equal(created.editIntentOptions.outputPlatforms.includes("douyin"), true);
  assert.equal(typeof (created.record.lastCheckpoint as Record<string, unknown>).editIntentRecommendation, "object");

  const absoluteVideoPath = path.join(workspaceRoot, created.sourceVideo.originalPath);
  const absoluteMetadataPath = path.join(workspaceRoot, created.sourceVideo.metadataPath);
  const absoluteProxyPath = path.join(workspaceRoot, created.sourceVideo.proxyPath);
  const absoluteThumbnailPath = path.join(workspaceRoot, created.sourceVideo.thumbnailPath);
  const absoluteSubtitleTimelinePath = path.join(workspaceRoot, created.sourceVideo.subtitleTimelinePath);
  const absoluteSubtitleSrtPath = path.join(workspaceRoot, created.sourceVideo.subtitleSrtPath);
  const absoluteSubtitleVttPath = path.join(workspaceRoot, created.sourceVideo.subtitleVttPath);
  assert.equal(existsSync(absoluteVideoPath), true);
  assert.equal(existsSync(absoluteMetadataPath), true);
  assert.equal(existsSync(absoluteProxyPath), true);
  assert.equal(existsSync(absoluteThumbnailPath), true);
  assert.equal(existsSync(absoluteSubtitleTimelinePath), true);
  assert.equal(existsSync(absoluteSubtitleSrtPath), true);
  assert.equal(existsSync(absoluteSubtitleVttPath), true);
  assert.equal(readFileSync(absoluteVideoPath).length > 0, true);

  const metadata = JSON.parse(readFileSync(absoluteMetadataPath, "utf8"));
  assert.equal(metadata.jobId, created.record.id);
  assert.equal(metadata.fileName, "john-demo.mp4");
  assert.equal(metadata.proxyPath, created.sourceVideo.proxyPath);
  assert.equal(metadata.edlPath, created.sourceVideo.edlPath);
  assert.equal(typeof metadata.probe.durationSec, "number");
  assert.equal(metadata.probe.hasAudio, true);
  assert.equal(metadata.probe.hasVideo, true);
  assert.equal(typeof metadata.previewArtifacts.proxyPath, "string");
  assert.equal(Array.isArray(metadata.previewArtifacts.keyframePaths), true);
  assert.equal(typeof metadata.transcriptArtifacts.transcriptPath, "string");
  assert.equal(typeof metadata.transcriptArtifacts.segmentCount, "number");
  assert.equal(typeof metadata.subtitleArtifacts.timelinePath, "string");
  assert.equal(typeof metadata.subtitleArtifacts.cueCount, "number");
  assert.equal(typeof metadata.transcriptAnalysis.analysisPath, "string");
  assert.equal(typeof metadata.transcriptAnalysis.chapterCount, "number");
  assert.equal(typeof (created.record.lastCheckpoint as Record<string, unknown>).editIntentSummary, "object");
});
