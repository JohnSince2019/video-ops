import assert from "node:assert/strict";
import test from "node:test";

import { buildRawVideoPackageDetail } from "../lib/ui/raw-video-package-detail.js";

test("buildRawVideoPackageDetail groups final outputs, supporting artifacts, and reports for raw-video jobs", () => {
  const detail = buildRawVideoPackageDetail({
    jobMode: "raw_video_edit",
    outputs: [
      { kind: "video", path: "output/jobs/job-raw/video.mp4", url: "/output/jobs/job-raw/video.mp4" },
      { kind: "cover", path: "output/jobs/job-raw/cover.png", url: "/output/jobs/job-raw/cover.png" },
      { kind: "metadata", path: "output/jobs/job-raw/metadata.json", url: "/output/jobs/job-raw/metadata.json" },
      { kind: "subtitle_srt", path: "output/jobs/job-raw/subtitles/captions.srt", url: "/output/jobs/job-raw/subtitles/captions.srt" },
    ],
    outputPaths: {
      videoPath: "output/jobs/job-raw/video.mp4",
      coverPath: "output/jobs/job-raw/cover.png",
      metadataPath: "output/jobs/job-raw/metadata.json",
      transcriptPath: "output/jobs/job-raw/transcripts/transcript.json",
      subtitleTimelinePath: "output/jobs/job-raw/transcripts/subtitle-timeline.json",
      subtitleSrtPath: "output/jobs/job-raw/subtitles/captions.srt",
      subtitleVttPath: "output/jobs/job-raw/subtitles/captions.vtt",
      edlPath: "output/jobs/job-raw/edl/edit-decision-list.json",
      cleanEditPath: "output/jobs/job-raw/clean-edit.mp4",
      loudnessReportPath: "output/jobs/job-raw/analysis/clean-edit-loudness.json",
      remotionRenderMetadataPath: "output/jobs/job-raw/remotion/render-metadata.json",
      rawVideoQualityGateReportPath: "output/jobs/job-raw/analysis/raw-video-quality-gate.json",
      rawVideoCriticReportPath: "output/jobs/job-raw/analysis/raw-video-critic-report.json",
    },
    qualityGateReport: {
      version: "raw-video-quality-gate-v1",
      inspectedPath: "output/jobs/job-raw/video.mp4",
      reportPath: "output/jobs/job-raw/analysis/raw-video-quality-gate.json",
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
      requiredArtifacts: ["video"],
      missingArtifacts: [],
      qualityPassed: true,
      checks: [],
    },
    criticReport: {
      version: "raw-video-ai-critic-v1",
      providerMetadata: {
        stage: "analysis",
        provider: "raw-video-ai-critic",
        mode: "primary",
      },
      overallScore: 82,
      overallPassed: true,
      checks: [
        {
          key: "hook",
          passed: true,
          score: 80,
          summary: "开场 Hook 具备记忆点。",
          evidence: [],
          recommendation: "保留当前主钩子。",
        },
        {
          key: "subtitle_naturalness",
          passed: true,
          score: 81,
          summary: "字幕断句和可读性基本自然。",
          evidence: [],
          recommendation: "保持当前字幕节奏。",
        },
        {
          key: "semantic_integrity",
          passed: true,
          score: 85,
          summary: "当前删减没有明显破坏语义主线。",
          evidence: [],
          recommendation: "保持当前删减强度。",
        },
      ],
    },
    availablePaths: [
      "output/jobs/job-raw/video.mp4",
      "output/jobs/job-raw/cover.png",
      "output/jobs/job-raw/metadata.json",
      "output/jobs/job-raw/subtitles/captions.srt",
      "output/jobs/job-raw/analysis/raw-video-quality-gate.json",
      "output/jobs/job-raw/analysis/raw-video-critic-report.json",
    ],
  });

  assert.equal(detail?.finalOutputs.length, 3);
  assert.equal(detail?.finalOutputs[0]?.label, "成片 MP4");
  assert.equal(detail?.supportingArtifacts.some((item) => item.label === "EDL"), true);
  assert.equal(detail?.reportCards[0]?.title, "自动质量门");
  assert.equal(detail?.reportCards[0]?.status, "已通过");
  assert.equal(detail?.reportCards[1]?.status, "通过 · 82 分");
});

test("buildRawVideoPackageDetail returns null for script_to_video jobs", () => {
  const detail = buildRawVideoPackageDetail({
    jobMode: "script_to_video",
    outputs: [],
    outputPaths: {},
  });

  assert.equal(detail, null);
});
