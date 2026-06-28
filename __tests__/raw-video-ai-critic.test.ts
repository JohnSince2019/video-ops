import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildJobAssetPaths } from "../lib/assets/job-assets.js";
import { inspectRawVideoAiCritic } from "../lib/raw-video/raw-video-ai-critic.js";
import { createEmptyRawVideoEdl } from "../lib/raw-video/edl-schema.js";
import { buildDefaultEditIntentOptions } from "../lib/raw-video/edit-intent-options.js";
import type { RawVideoQualityGateReport } from "../lib/raw-video/raw-video-quality-gate.js";
import type { TranscriptAnalysis } from "../lib/raw-video/transcript-analyzer.js";
import type { RawSubtitleTimeline } from "../lib/raw-video/subtitle-timeline.js";

const strongAnalysis: TranscriptAnalysis = {
  topic: "你不是缺 AI 工具",
  summary: "你不是缺 AI 工具，你是缺一套高输出操作系统。",
  chapters: [
    { title: "问题识别", startMs: 0, endMs: 2600, summary: "先说问题" },
    { title: "方法拆解", startMs: 2600, endMs: 6400, summary: "再给方法" },
  ],
  standoutQuotes: [
    {
      text: "你不是缺 AI 工具，你是缺一套高输出操作系统。",
      startMs: 0,
      endMs: 2400,
      reason: "反常识核心钩子",
    },
    {
      text: "把工作素材接住、整理、复用，输出自然就不再依赖硬挤时间。",
      startMs: 2600,
      endMs: 5200,
      reason: "解决方案收束",
    },
  ],
  removalSuggestions: [
    {
      startMs: 5400,
      endMs: 5900,
      text: "嗯",
      reason: "口头停顿",
      confidence: "medium",
    },
  ],
  glossaryReplacements: [],
  providerMetadata: {
    stage: "analysis",
    provider: "raw-video-heuristic-analyzer",
    mode: "primary",
  },
};

const naturalSubtitleTimeline: RawSubtitleTimeline = {
  language: "zh",
  cueSource: "segment",
  cueCount: 3,
  cues: [
    { index: 1, startMs: 0, endMs: 2000, text: "你不是缺 AI 工具", source: "segment" },
    { index: 2, startMs: 2000, endMs: 4200, text: "你是缺一套高输出操作系统", source: "segment" },
    { index: 3, startMs: 4200, endMs: 6800, text: "把工作素材接住、整理、复用", source: "segment" },
  ],
  srt: "",
  vtt: "",
};

const qualityGatePassed: RawVideoQualityGateReport = {
  version: "raw-video-quality-gate-v1",
  inspectedPath: "output/jobs/job-critic/video.mp4",
  reportPath: "output/jobs/job-critic/analysis/raw-video-quality-gate.json",
  videoProbe: {
    durationSec: 6.8,
    resolution: "1080x1920",
    width: 1080,
    height: 1920,
    fps: 30,
    hasAudio: true,
    hasVideo: true,
    streamTypes: ["video", "audio"],
  },
  subtitleCueCount: 3,
  subtitleSafeArea: {
    bottomRatio: 0.2,
    maxLines: 2,
    passed: true,
  },
  requiredArtifacts: ["video", "cover", "metadata"],
  missingArtifacts: [],
  qualityPassed: true,
  checks: [
    { key: "playable", passed: true, details: "ok" },
    { key: "resolution", passed: true, details: "ok" },
    { key: "audio_track", passed: true, details: "ok" },
    { key: "subtitle_assets", passed: true, details: "ok" },
    { key: "subtitle_safe_area", passed: true, details: "ok" },
    { key: "file_completeness", passed: true, details: "ok" },
  ],
};

test("inspectRawVideoAiCritic produces explainable hook, subtitle, and semantic checks", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-ai-critic-"));
  const outputPaths = buildJobAssetPaths("job-critic");
  const edl = createEmptyRawVideoEdl({
    jobId: "job-critic",
    sourceVideoId: "job-critic-source-video",
  });
  edl.totalDurationMs = 6800;
  edl.clips = [
    {
      clipId: "clip-1",
      sourceVideoId: edl.sourceVideoId,
      startMs: 0,
      endMs: 2200,
      durationMs: 2200,
      transcriptText: "你不是缺 AI 工具，你是缺一套高输出操作系统。",
      reviewState: "kept",
      reviewReason: "保留主钩子。",
    },
    {
      clipId: "clip-2",
      sourceVideoId: edl.sourceVideoId,
      startMs: 2200,
      endMs: 5200,
      durationMs: 3000,
      transcriptText: "把工作素材接住、整理、复用。",
      reviewState: "kept",
      reviewReason: "保留核心方法。",
    },
    {
      clipId: "clip-3",
      sourceVideoId: edl.sourceVideoId,
      startMs: 5200,
      endMs: 5900,
      durationMs: 700,
      transcriptText: "嗯",
      reviewState: "restored",
      reviewReason: "恢复承接语气。",
    },
  ];

  const report = await inspectRawVideoAiCritic({
    workspaceRoot,
    analysis: strongAnalysis,
    subtitleTimeline: naturalSubtitleTimeline,
    qualityGate: qualityGatePassed,
    edl,
    editIntentOptions: {
      ...buildDefaultEditIntentOptions(),
      hookType: "counterintuitive",
    },
    reportPath: outputPaths.rawVideoCriticReportPath,
  });

  assert.equal(report.version, "raw-video-ai-critic-v1");
  assert.equal(report.providerMetadata.provider, "raw-video-ai-critic");
  assert.equal(report.overallPassed, true);
  assert.equal(report.overallScore >= 72, true);
  assert.equal(report.checks.length, 3);
  assert.equal(report.checks.find((item) => item.key === "hook")?.passed, true);
  assert.equal(report.checks.find((item) => item.key === "subtitle_naturalness")?.passed, true);
  assert.equal(report.checks.find((item) => item.key === "semantic_integrity")?.passed, true);
  assert.equal(existsSync(path.join(workspaceRoot, outputPaths.rawVideoCriticReportPath)), true);
});

test("inspectRawVideoAiCritic flags weak hook, broken subtitle rhythm, and semantic overcut risk", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-ai-critic-fail-"));
  const weakAnalysis: TranscriptAnalysis = {
    ...strongAnalysis,
    standoutQuotes: [{ text: "嗯", startMs: 0, endMs: 400, reason: "停顿" }],
    chapters: [{ title: "章节 1", startMs: 0, endMs: 1200, summary: "短" }],
    removalSuggestions: [
      { startMs: 200, endMs: 500, text: "嗯", reason: "停顿", confidence: "medium" },
      { startMs: 600, endMs: 900, text: "啊", reason: "停顿", confidence: "medium" },
    ],
  };
  const choppySubtitleTimeline: RawSubtitleTimeline = {
    language: "zh",
    cueSource: "segment",
    cueCount: 3,
    cues: [
      { index: 1, startMs: 0, endMs: 500, text: "嗯", source: "segment" },
      { index: 2, startMs: 500, endMs: 900, text: "啊", source: "segment" },
      { index: 3, startMs: 900, endMs: 1600, text: "第三行非常非常非常长的字幕内容为了模拟不自然断句", source: "segment" },
    ],
    srt: "",
    vtt: "",
  };
  const qualityGateBlocked: RawVideoQualityGateReport = {
    ...qualityGatePassed,
    subtitleSafeArea: {
      bottomRatio: 0.2,
      maxLines: 2,
      passed: false,
    },
    checks: qualityGatePassed.checks.map((check) =>
      check.key === "subtitle_safe_area" ? { ...check, passed: false, details: "overflow" } : check,
    ),
  };
  const edl = createEmptyRawVideoEdl({
    jobId: "job-critic-fail",
    sourceVideoId: "job-critic-fail-source-video",
  });
  edl.totalDurationMs = 1600;
  edl.clips = [
    {
      clipId: "clip-1",
      sourceVideoId: edl.sourceVideoId,
      startMs: 0,
      endMs: 300,
      durationMs: 300,
      transcriptText: "嗯",
      reviewState: "removed",
      reviewReason: "删掉停顿。",
    },
    {
      clipId: "clip-2",
      sourceVideoId: edl.sourceVideoId,
      startMs: 300,
      endMs: 600,
      durationMs: 300,
      transcriptText: "啊",
      reviewState: "removed",
      reviewReason: "继续删。",
    },
  ];

  const report = await inspectRawVideoAiCritic({
    workspaceRoot,
    analysis: weakAnalysis,
    subtitleTimeline: choppySubtitleTimeline,
    qualityGate: qualityGateBlocked,
    edl,
    editIntentOptions: {
      ...buildDefaultEditIntentOptions(),
      hookType: "counterintuitive",
    },
  });

  assert.equal(report.overallPassed, false);
  assert.equal(report.checks.find((item) => item.key === "hook")?.passed, false);
  assert.equal(report.checks.find((item) => item.key === "subtitle_naturalness")?.passed, false);
  assert.equal(report.checks.find((item) => item.key === "semantic_integrity")?.passed, false);
  assert.equal(report.checks.find((item) => item.key === "hook")?.recommendation.includes("前 3 秒"), true);
  assert.equal(report.checks.find((item) => item.key === "subtitle_naturalness")?.evidence.some((item) => item.includes("质量门发现字幕安全区问题")), true);
});
