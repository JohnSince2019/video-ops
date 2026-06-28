import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promises as fs } from "node:fs";

import { createRawVideoJobFromInput } from "../lib/raw-video/create-raw-video-job.js";
import { createEmptyRawVideoEdl } from "../lib/raw-video/edl-schema.js";
import { cutRawVideoEdlClips } from "../lib/raw-video/edl-clip-cutter.js";
import { assembleCleanEditFromClipManifest } from "../lib/raw-video/clean-edit-assembler.js";
import { normalizeCleanEditAudio } from "../lib/raw-video/clean-edit-audio-normalizer.js";
import { inspectCleanEditQuality } from "../lib/raw-video/clean-edit-quality-inspector.js";
import { renderRawVideoWithRemotion } from "../lib/raw-video/raw-video-renderer.js";
import { inspectRawVideoQualityGate } from "../lib/raw-video/raw-video-quality-gate.js";
import { inspectRawVideoAiCritic } from "../lib/raw-video/raw-video-ai-critic.js";
import { buildOutputPackage } from "../lib/video/output-package.js";
import { buildPlatformMetadata } from "../lib/video/platform-metadata.js";
import { renderJobArtifacts } from "../lib/video/local-renderer.js";

const manifest = {
  $schema: "https://video-ops.example.com/manifest-v1.schema.json",
  id: "manifest-raw-video-e2e-test",
  title: "Raw Video Lifecycle Fixture",
  platform: "douyin" as const,
  renderProfile: "draft" as const,
  scenes: [
    {
      id: "scene-001",
      scene_hash: "scene-hash-001",
      prompt_hash: "prompt-hash-001",
      duration_ms: 1800,
      narration: "你不是缺 AI 工具。",
      script_type: "narration" as const,
      mood: "calm" as const,
      visual_hint: "讲解画面一",
      audio: { tts_voice: "zh-CN-male-yunze" },
    },
    {
      id: "scene-002",
      scene_hash: "scene-hash-002",
      prompt_hash: "prompt-hash-002",
      duration_ms: 2200,
      narration: "你是缺一套高输出操作系统。",
      script_type: "narration" as const,
      mood: "calm" as const,
      visual_hint: "讲解画面二",
      audio: { tts_voice: "zh-CN-male-yunze" },
    },
  ],
  metadata: {
    created_at: new Date("2026-06-28T00:00:00.000Z").toISOString(),
    author: "John",
    copyright_license: "commercial",
  },
};

test("raw-video lifecycle can progress from source video to final packaged outputs and reports", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-raw-lifecycle-"));
  const fixture = await renderJobArtifacts({
    jobId: "job-raw-lifecycle-fixture",
    manifest,
    mode: "ffmpeg",
  });
  const payload = readFileSync(fixture.outputPackage.video.path).toString("base64");
  const created = await createRawVideoJobFromInput(
    {
      title: "原始视频生命周期任务",
      ownerToken: "john-raw-video-e2e-owner",
      platform: "douyin",
      renderProfile: "standard",
      sourceFileName: "john-e2e.mp4",
      sourceMimeType: "video/mp4",
      sourceVideoBase64: payload,
    },
    { workspaceRoot },
  );

  const sourceVideo = created.sourceVideo;
  const outputPaths = created.outputPaths;
  const edl = createEmptyRawVideoEdl({
    jobId: created.record.id,
    sourceVideoId: sourceVideo.id,
  });
  edl.totalDurationMs = Math.round((created.sourceProbe?.durationSec ?? 0) * 1000);
  const effectiveCues =
    (created.subtitleTimeline?.cues?.length ?? 0) > 0
      ? created.subtitleTimeline!.cues
      : [
          {
            index: 1,
            startMs: 0,
            endMs: edl.totalDurationMs,
            text: created.transcript?.text?.trim() || created.transcriptAnalysis?.summary || "原始视频主线片段",
            source: "segment" as const,
          },
        ];
  edl.clips = effectiveCues.map((cue, index) => ({
    clipId: `clip-${index + 1}`,
    sourceVideoId: sourceVideo.id,
    startMs: cue.startMs,
    endMs: cue.endMs,
    durationMs: cue.endMs - cue.startMs,
    transcriptText: cue.text,
    removalCandidate: false,
    reviewState: "kept" as const,
    reviewReason: "保留主线表达。",
  }));
  edl.captions = effectiveCues.map((cue, index) => ({
    captionId: `caption-${index + 1}`,
    startMs: cue.startMs,
    endMs: cue.endMs,
    text: cue.text,
  }));
  edl.chapters = (created.transcriptAnalysis?.chapters ?? []).map((chapter, index) => ({
    chapterId: `chapter-${index + 1}`,
    title: chapter.title,
    startMs: chapter.startMs,
    endMs: chapter.endMs,
    summary: chapter.summary,
  }));

  const edlAbsolutePath = path.join(workspaceRoot, sourceVideo.edlPath);
  await fs.mkdir(path.dirname(edlAbsolutePath), { recursive: true });
  await fs.writeFile(edlAbsolutePath, JSON.stringify(edl, null, 2), "utf8");

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
  const normalizedAudio = await normalizeCleanEditAudio({
    workspaceRoot,
    inputPath: cleanEdit.outputPath,
    outputPath: outputPaths.normalizedCleanEditPath,
    reportPath: outputPaths.loudnessReportPath,
  });
  const cleanEditQuality = await inspectCleanEditQuality({
    workspaceRoot,
    inspectedPath: normalizedAudio.outputPath,
    clipManifest,
    loudnessReportPath: normalizedAudio.reportPath,
    reportPath: outputPaths.cleanEditQualityReportPath,
  });
  const renderResult = await renderRawVideoWithRemotion({
    workspaceRoot,
    remotionRoot: path.join(process.cwd(), "remotion"),
    jobId: created.record.id,
    title: created.record.title ?? "原始视频生命周期任务",
    transcriptAnalysis: created.transcriptAnalysis!,
    outputPath: outputPaths.videoPath,
    propsPath: outputPaths.remotionPropsPath,
    metadataPath: outputPaths.remotionRenderMetadataPath,
  });
  const platformMetadata = buildPlatformMetadata({
    manifest: {
      $schema: "https://video-ops.example.com/raw-video-package.schema.json",
      id: `${created.record.id}-raw-package`,
      title: created.record.title ?? "原始视频生命周期任务",
      platform: "douyin",
      renderProfile: "standard",
      scenes: [
        {
          id: "scene-final",
          scene_hash: "scene-final",
          prompt_hash: "scene-final",
          duration_ms: Math.round(renderResult.probe.durationSec * 1000),
          narration: created.transcriptAnalysis?.summary ?? "",
          script_type: "narration",
          mood: "calm",
          audio: { tts_voice: "raw-video-original-audio" },
        },
      ],
      metadata: {
        created_at: new Date().toISOString(),
        author: "John",
        copyright_license: "internal",
      },
    },
    timeline: {
      totalDurationMs: Math.round(renderResult.probe.durationSec * 1000),
      transitionDefault: "cut",
      clips: [
        {
          sceneId: "scene-final",
          sceneHash: "scene-final",
          order: 1,
          startMs: 0,
          endMs: Math.round(renderResult.probe.durationSec * 1000),
          durationMs: Math.round(renderResult.probe.durationSec * 1000),
          mainImage: {
            url: outputPaths.thumbnailPath,
            artifactKey: "scene-final",
          },
          audio: {
            path: outputPaths.normalizedCleanEditPath,
            durationMs: Math.round(renderResult.probe.durationSec * 1000),
            voice: "raw-video-original-audio",
          },
          transition: {
            type: "cut",
            durationMs: 0,
          },
        },
      ],
    },
  });
  const outputPackage = buildOutputPackage({
    renderPlan: {
      profile: "standard",
      timelineDurationMs: Math.round(renderResult.probe.durationSec * 1000),
      outputPath: outputPaths.videoPath,
      ffmpegArgs: ["remotion", "render", "CleanKnowledgeTalk"],
      clips: [
        {
          sceneId: "scene-final",
          imageInput: outputPaths.thumbnailPath,
          audioInput: outputPaths.normalizedCleanEditPath,
          durationMs: Math.round(renderResult.probe.durationSec * 1000),
          transition: { type: "cut", durationMs: 0 },
        },
      ],
      spec: {
        profile: "standard",
        width: 1080,
        height: 1920,
        videoBitrateKbps: 3500,
        audioBitrateKbps: 128,
        crf: 24,
        preset: "medium",
      },
    },
    platformMetadata,
    videoPath: outputPaths.videoPath,
    coverPath: outputPaths.thumbnailPath,
    metadataPath: outputPaths.metadataPath,
    subtitles: [
      { format: "srt", path: outputPaths.subtitleSrtPath },
      { format: "vtt", path: outputPaths.subtitleVttPath },
    ],
    rawVideo: {
      jobMode: "raw_video_edit",
      sourceVideo: {
        metadataPath: sourceVideo.metadataPath,
        proxyPath: sourceVideo.proxyPath,
        thumbnailPath: sourceVideo.thumbnailPath,
      },
      transcript: {
        transcriptPath: sourceVideo.transcriptPath,
        wordsPath: sourceVideo.transcriptWordsPath,
        subtitleTimelinePath: sourceVideo.subtitleTimelinePath,
        srtPath: sourceVideo.subtitleSrtPath,
        vttPath: sourceVideo.subtitleVttPath,
      },
      editDecisionList: {
        path: sourceVideo.edlPath,
      },
      cleanEdit: {
        path: sourceVideo.cleanEditPath,
        normalizedPath: sourceVideo.normalizedCleanEditPath,
        loudnessReportPath: sourceVideo.loudnessReportPath,
        qualityReportPath: sourceVideo.cleanEditQualityReportPath,
      },
      remotion: {
        propsPath: sourceVideo.remotionPropsPath,
        renderMetadataPath: sourceVideo.remotionRenderMetadataPath,
      },
    },
  });
  await fs.mkdir(path.dirname(path.join(workspaceRoot, outputPaths.metadataPath)), { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, outputPaths.metadataPath), outputPackage.metadataFile.content, "utf8");
  const qualityGateReport = await inspectRawVideoQualityGate({
    workspaceRoot,
    outputPackage,
    reportPath: outputPaths.rawVideoQualityGateReportPath,
  });
  const criticReport = await inspectRawVideoAiCritic({
    workspaceRoot,
    analysis: created.transcriptAnalysis!,
    subtitleTimeline: created.subtitleTimeline!,
    qualityGate: qualityGateReport,
    edl,
    editIntentOptions: created.editIntentOptions,
    reportPath: outputPaths.rawVideoCriticReportPath,
  });

  assert.equal(cleanEditQuality.qualityPassed, true);
  assert.equal(renderResult.probe.hasVideo, true);
  assert.equal(outputPackage.artifacts.some((item) => item.kind === "remotion_render_metadata"), true);
  assert.equal(qualityGateReport.checks.length >= 6, true);
  assert.equal(qualityGateReport.checks.some((item) => item.key === "subtitle_assets"), true);
  assert.equal(typeof qualityGateReport.qualityPassed, "boolean");
  assert.equal(criticReport.checks.length, 3);
  assert.equal(criticReport.overallScore > 0, true);
});
