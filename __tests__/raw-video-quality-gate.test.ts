import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildJobAssetPaths } from "../lib/assets/job-assets.js";
import { inspectRawVideoQualityGate } from "../lib/raw-video/raw-video-quality-gate.js";
import { renderRawVideoWithRemotion } from "../lib/raw-video/raw-video-renderer.js";
import { buildOutputPackage } from "../lib/video/output-package.js";

const renderPlan = {
  profile: "standard" as const,
  timelineDurationMs: 7600,
  outputPath: "output/jobs/job-quality-gate/video.mp4",
  ffmpegArgs: ["-y", "-i", "timeline-input.txt", "output/jobs/job-quality-gate/video.mp4"],
  clips: [
    {
      sceneId: "scene-001",
      imageInput: "output/jobs/job-quality-gate/images/scene-001.png",
      audioInput: "output/jobs/job-quality-gate/audio/scene-001.wav",
      durationMs: 3800,
      transition: { type: "cut", durationMs: 0 },
    },
  ],
  spec: {
    profile: "standard" as const,
    width: 1080,
    height: 1920,
    videoBitrateKbps: 3500,
    audioBitrateKbps: 128,
    crf: 24,
    preset: "medium",
  },
};

const platformMetadata = {
  platform: "douyin" as const,
  title: "Raw Video Quality Gate Test",
  description: "raw video gate",
  tags: ["video-ops"],
  orientation: "portrait" as const,
  category: "channel_video",
  coverText: "质量门测试",
  renderProfile: "standard" as const,
  durationMs: 7600,
};

test("inspectRawVideoQualityGate validates resolution, subtitles, audio, and artifact completeness", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-raw-quality-gate-"));
  const jobId = "job-quality-gate";
  const outputPaths = buildJobAssetPaths(jobId);
  const remotionRoot = path.join(process.cwd(), "remotion");

  await renderRawVideoWithRemotion({
    workspaceRoot,
    remotionRoot,
    jobId,
    title: "你不是缺 AI 工具",
    transcriptAnalysis: {
      topic: "AI 高输出系统",
      summary: "把工作素材接住、整理、复用。",
      chapters: [
        { title: "问题识别", startMs: 0, endMs: 3200, summary: "先识别问题" },
        { title: "方法拆解", startMs: 3200, endMs: 7600, summary: "再给方法" },
      ],
      standoutQuotes: [
        { text: "你不是缺 AI 工具。", startMs: 500, endMs: 2500, reason: "用作 Hook" },
        { text: "你是缺一套高输出操作系统。", startMs: 3400, endMs: 6800, reason: "用作收束" },
      ],
      removalSuggestions: [],
      glossaryReplacements: [],
      providerMetadata: { stage: "analysis", provider: "raw-video-heuristic-analyzer", mode: "primary" },
    },
    outputPath: outputPaths.videoPath,
    propsPath: outputPaths.remotionPropsPath,
    metadataPath: outputPaths.remotionRenderMetadataPath,
  });

  await fs.mkdir(path.join(workspaceRoot, path.dirname(outputPaths.coverPath)), { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, outputPaths.coverPath), "cover");
  await fs.mkdir(path.join(workspaceRoot, path.dirname(outputPaths.transcriptPath)), { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, outputPaths.transcriptPath), JSON.stringify({ text: "test transcript" }, null, 2));
  await fs.writeFile(path.join(workspaceRoot, outputPaths.subtitleTimelinePath), JSON.stringify({ cueCount: 2 }, null, 2));
  await fs.mkdir(path.join(workspaceRoot, path.dirname(outputPaths.edlPath)), { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, outputPaths.edlPath), JSON.stringify({ version: "raw-video-edl-v1" }, null, 2));
  await fs.mkdir(path.join(workspaceRoot, path.dirname(outputPaths.subtitleSrtPath)), { recursive: true });
  await fs.writeFile(
    path.join(workspaceRoot, outputPaths.subtitleSrtPath),
    "1\n00:00:00,000 --> 00:00:02,000\n你不是缺 AI 工具\n\n2\n00:00:02,100 --> 00:00:04,600\n你是缺一套高输出操作系统\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(workspaceRoot, outputPaths.subtitleVttPath),
    "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\n你不是缺 AI 工具\n\n00:00:02.100 --> 00:00:04.600\n你是缺一套高输出操作系统\n",
    "utf8",
  );

  const outputPackage = buildOutputPackage({
    renderPlan: { ...renderPlan, outputPath: outputPaths.videoPath },
    platformMetadata,
    videoPath: outputPaths.videoPath,
    coverPath: outputPaths.coverPath,
    metadataPath: outputPaths.metadataPath,
    subtitles: [
      { format: "srt", path: outputPaths.subtitleSrtPath },
      { format: "vtt", path: outputPaths.subtitleVttPath },
    ],
    rawVideo: {
      jobMode: "raw_video_edit",
      transcript: {
        transcriptPath: outputPaths.transcriptPath,
        subtitleTimelinePath: outputPaths.subtitleTimelinePath,
        srtPath: outputPaths.subtitleSrtPath,
        vttPath: outputPaths.subtitleVttPath,
      },
      editDecisionList: {
        path: outputPaths.edlPath,
      },
      remotion: {
        renderMetadataPath: outputPaths.remotionRenderMetadataPath,
      },
    },
  });
  await fs.writeFile(path.join(workspaceRoot, outputPaths.metadataPath), outputPackage.metadataFile.content, "utf8");

  const report = await inspectRawVideoQualityGate({
    workspaceRoot,
    outputPackage,
    reportPath: outputPaths.rawVideoQualityGateReportPath,
  });

  assert.equal(report.version, "raw-video-quality-gate-v1");
  assert.equal(report.videoProbe.resolution, "1080x1920");
  assert.equal(report.subtitleCueCount, 2);
  assert.equal(report.subtitleSafeArea.passed, true);
  assert.equal(report.missingArtifacts.length, 0);
  assert.equal(report.qualityPassed, true);
  assert.equal(report.checks.every((check) => check.passed), true);
  assert.equal(existsSync(path.join(workspaceRoot, outputPaths.rawVideoQualityGateReportPath)), true);
});

test("inspectRawVideoQualityGate flags missing artifacts and unsafe subtitle layouts", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-raw-quality-gate-fail-"));
  const jobId = "job-quality-gate-fail";
  const outputPaths = buildJobAssetPaths(jobId);
  const remotionRoot = path.join(process.cwd(), "remotion");

  await renderRawVideoWithRemotion({
    workspaceRoot,
    remotionRoot,
    jobId,
    title: "质量门失败用例",
    transcriptAnalysis: {
      topic: "质量门失败",
      summary: "测试缺失资产和字幕安全区。",
      chapters: [{ title: "单章", startMs: 0, endMs: 4800, summary: "单章摘要" }],
      standoutQuotes: [{ text: "这里是测试。", startMs: 500, endMs: 2500, reason: "测试" }],
      removalSuggestions: [],
      glossaryReplacements: [],
      providerMetadata: { stage: "analysis", provider: "raw-video-heuristic-analyzer", mode: "primary" },
    },
    outputPath: outputPaths.videoPath,
    propsPath: outputPaths.remotionPropsPath,
    metadataPath: outputPaths.remotionRenderMetadataPath,
  });

  await fs.mkdir(path.join(workspaceRoot, path.dirname(outputPaths.coverPath)), { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, outputPaths.coverPath), "cover");
  await fs.mkdir(path.join(workspaceRoot, path.dirname(outputPaths.subtitleSrtPath)), { recursive: true });
  await fs.writeFile(
    path.join(workspaceRoot, outputPaths.subtitleSrtPath),
    "1\n00:00:00,000 --> 00:00:02,000\n第一行字幕\n第二行字幕\n第三行字幕\n",
    "utf8",
  );

  const outputPackage = buildOutputPackage({
    renderPlan: { ...renderPlan, outputPath: outputPaths.videoPath },
    platformMetadata,
    videoPath: outputPaths.videoPath,
    coverPath: outputPaths.coverPath,
    metadataPath: outputPaths.metadataPath,
    subtitles: [{ format: "srt", path: outputPaths.subtitleSrtPath }],
    rawVideo: {
      jobMode: "raw_video_edit",
      remotion: {
        renderMetadataPath: outputPaths.remotionRenderMetadataPath,
      },
    },
  });
  await fs.writeFile(path.join(workspaceRoot, outputPaths.metadataPath), outputPackage.metadataFile.content, "utf8");

  const report = await inspectRawVideoQualityGate({
    workspaceRoot,
    outputPackage,
    requiredArtifactKinds: ["video", "cover", "metadata", "subtitle_srt", "transcript_json", "edl"],
  });

  assert.equal(report.qualityPassed, false);
  assert.deepEqual(report.missingArtifacts, ["transcript_json", "edl"]);
  assert.equal(report.checks.find((check) => check.key === "subtitle_safe_area")?.passed, false);
  assert.equal(report.checks.find((check) => check.key === "file_completeness")?.passed, false);
});
