import assert from "node:assert/strict";
import test from "node:test";

import { buildOutputPackage } from "../lib/video/output-package.js";

const renderPlan = {
  profile: "standard" as const,
  timelineDurationMs: 9300,
  outputPath: "output/video-standard.mp4",
  ffmpegArgs: ["-y", "-i", "timeline-input.txt", "output/video-standard.mp4"],
  clips: [
    {
      sceneId: "scene-001",
      imageInput: "mock://main/scene-001.png",
      audioInput: "assets/audio/scene-001.wav",
      durationMs: 4200,
      transition: {
        type: "crossfade",
        durationMs: 0,
      },
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
  platform: "xiaohongshu" as const,
  title: "AI 提效工作流｜小红书笔记视频",
  description: "适合图文视频混合表达",
  tags: ["AI效率", "小红书"],
  orientation: "portrait" as const,
  category: "note_video",
  coverText: "AI 提效工作流｜可直接上手",
  renderProfile: "standard" as const,
  durationMs: 9300,
};

test("builds a standard output package with mp4, cover, and metadata.json", () => {
  const output = buildOutputPackage({
    renderPlan,
    platformMetadata,
    coverPath: "output/cover.png",
    subtitles: [{ format: "srt", path: "output/subtitles/captions.srt" }],
  });

  assert.equal(output.video.path, "output/video-standard.mp4");
  assert.equal(output.cover.path, "output/cover.png");
  assert.equal(output.metadataFile.path, "output/metadata.json");
  assert.equal(output.subtitles[0]?.url, "/output/subtitles/captions.srt");
});

test("metadata.json contains platform metadata, render profile, duration, and asset references", () => {
  const output = buildOutputPackage({
    renderPlan,
    platformMetadata,
    coverPath: "output/cover.png",
    subtitles: [
      { format: "srt", path: "output/subtitles/captions.srt" },
      { format: "vtt", path: "output/subtitles/captions.vtt" },
    ],
    ttsRouteSummary: {
      providerId: "cosyvoice-mlx",
      routeLabel: "默认中文解说路线",
      routeRoleLabel: "第一阶段默认主链路",
      acceptanceHint: "可以先在工作台即时试听，再结合最终产物确认自然度和清晰度。",
      voiceLabel: "zh-CN-male-yunze",
    },
  });

  const parsed = JSON.parse(output.metadataFile.content);
  assert.equal(parsed.platform.platform, "xiaohongshu");
  assert.equal(parsed.renderProfile, "standard");
  assert.equal(parsed.timelineDurationMs, 9300);
  assert.equal(parsed.videoPath, "output/video-standard.mp4");
  assert.equal(parsed.coverPath, "output/cover.png");
  assert.equal(parsed.subtitles[0].format, "srt");
  assert.equal(parsed.subtitles[1].path, "output/subtitles/captions.vtt");
  assert.equal(parsed.ttsRouteSummary.providerId, "cosyvoice-mlx");
  assert.equal(parsed.ttsRouteSummary.routeLabel, "默认中文解说路线");
  assert.equal(parsed.ttsRouteSummary.routeRoleLabel, "第一阶段默认主链路");
  assert.match(parsed.ttsRouteSummary.acceptanceHint, /即时试听/);
});

test("returns explicit errors for missing video, cover, and metadata inputs", () => {
  assert.throws(
    () =>
      buildOutputPackage({
        renderPlan: { ...renderPlan, outputPath: "" },
        platformMetadata,
        coverPath: "output/cover.png",
      }),
    /Video path is required/,
  );

  assert.throws(
    () =>
      buildOutputPackage({
        renderPlan,
        platformMetadata,
        coverPath: "",
      }),
    /Cover path is required/,
  );

  assert.throws(
    () =>
      buildOutputPackage({
        renderPlan,
        platformMetadata: undefined as never,
        coverPath: "output/cover.png",
      }),
    /Platform metadata is required/,
  );
});

test("output package is consumable by downstream export and publishing flows", () => {
  const output = buildOutputPackage({
    renderPlan,
    platformMetadata,
    coverPath: "output/cover.png",
    metadataPath: "output/publish-metadata.json",
    subtitles: [{ format: "srt", path: "output/subtitles/captions.srt" }],
  });

  assert.equal(output.video.profile, "standard");
  assert.equal(output.cover.text?.includes("可直接上手"), true);
  assert.equal(output.metadata.clipCount, 1);
  assert.equal(output.metadataFile.path, "output/publish-metadata.json");
  assert.equal(output.metadata.subtitles.length, 1);
});

test("raw-video output package carries transcript, EDL, clean edit, and remotion artifacts in one delivery contract", () => {
  const output = buildOutputPackage({
    renderPlan,
    platformMetadata,
    videoPath: "output/jobs/job-raw-001/video.mp4",
    coverPath: "output/jobs/job-raw-001/cover.png",
    metadataPath: "output/jobs/job-raw-001/metadata.json",
    subtitles: [
      { format: "srt", path: "output/jobs/job-raw-001/subtitles/captions.srt" },
      { format: "vtt", path: "output/jobs/job-raw-001/subtitles/captions.vtt" },
    ],
    rawVideo: {
      jobMode: "raw_video_edit",
      sourceVideo: {
        metadataPath: "output/jobs/job-raw-001/source/source-video.json",
        proxyPath: "output/jobs/job-raw-001/proxy/proxy.mp4",
        thumbnailPath: "output/jobs/job-raw-001/proxy/thumbnail.jpg",
      },
      transcript: {
        transcriptPath: "output/jobs/job-raw-001/transcripts/transcript.json",
        wordsPath: "output/jobs/job-raw-001/transcripts/words.json",
        subtitleTimelinePath: "output/jobs/job-raw-001/transcripts/subtitle-timeline.json",
        srtPath: "output/jobs/job-raw-001/subtitles/captions.srt",
        vttPath: "output/jobs/job-raw-001/subtitles/captions.vtt",
      },
      editDecisionList: {
        path: "output/jobs/job-raw-001/edl/edit-decision-list.json",
      },
      cleanEdit: {
        path: "output/jobs/job-raw-001/clean-edit.mp4",
        normalizedPath: "output/jobs/job-raw-001/clean-edit-normalized.mp4",
        loudnessReportPath: "output/jobs/job-raw-001/analysis/clean-edit-loudness.json",
        qualityReportPath: "output/jobs/job-raw-001/analysis/clean-edit-quality-report.json",
      },
      remotion: {
        propsPath: "output/jobs/job-raw-001/remotion/clean-knowledge-talk-props.json",
        renderMetadataPath: "output/jobs/job-raw-001/remotion/render-metadata.json",
      },
      complianceReportPath: "output/jobs/job-raw-001/analysis/compliance-report.json",
    },
  });

  const parsed = JSON.parse(output.metadataFile.content);
  assert.equal(parsed.rawVideo.jobMode, "raw_video_edit");
  assert.equal(parsed.rawVideo.transcript.transcriptPath, "output/jobs/job-raw-001/transcripts/transcript.json");
  assert.equal(parsed.rawVideo.editDecisionList.path, "output/jobs/job-raw-001/edl/edit-decision-list.json");
  assert.equal(parsed.rawVideo.cleanEdit.normalizedPath, "output/jobs/job-raw-001/clean-edit-normalized.mp4");
  assert.equal(parsed.rawVideo.remotion.renderMetadataPath, "output/jobs/job-raw-001/remotion/render-metadata.json");
  assert.equal(parsed.rawVideo.complianceReportPath, "output/jobs/job-raw-001/analysis/compliance-report.json");

  const artifactKinds = output.artifacts.map((item) => item.kind);
  assert.deepEqual(
    artifactKinds,
    [
      "video",
      "cover",
      "metadata",
      "subtitle_srt",
      "subtitle_vtt",
      "source_metadata",
      "proxy_video",
      "thumbnail",
      "transcript_json",
      "transcript_words",
      "subtitle_timeline",
      "edl",
      "clean_edit",
      "clean_edit_normalized",
      "clean_edit_loudness_report",
      "clean_edit_quality_report",
      "remotion_props",
      "remotion_render_metadata",
      "compliance_report",
    ],
  );
  assert.equal(output.artifacts.find((item) => item.kind === "remotion_render_metadata")?.url, "/output/jobs/job-raw-001/remotion/render-metadata.json");
});
