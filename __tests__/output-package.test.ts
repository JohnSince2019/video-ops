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
