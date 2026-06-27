import assert from "node:assert/strict";
import test from "node:test";

import { buildJobAssetPaths, buildJobAssetRoot, buildJobOutputUrl } from "../lib/assets/job-assets.js";
import { buildOutputPackage } from "../lib/video/output-package.js";

const renderPlan = {
  profile: "standard" as const,
  timelineDurationMs: 9300,
  outputPath: "output/jobs/job-123/video.mp4",
  ffmpegArgs: ["-y", "-i", "timeline-input.txt", "output/jobs/job-123/video.mp4"],
  clips: [
    {
      sceneId: "scene-001",
      imageInput: "output/jobs/job-123/images/scene-001.png",
      audioInput: "output/jobs/job-123/audio/scene-001.wav",
      durationMs: 4200,
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
  renderProfile: "standard" as const,
  durationMs: 9300,
  orientation: "portrait" as const,
  title: "测试标题",
  description: "测试描述",
  tags: ["抖音"],
  coverText: "测试封面文案",
  category: "channel_video",
};

test("job asset paths follow output/jobs/{jobId} conventions", () => {
  const root = buildJobAssetRoot("job 123");
  const paths = buildJobAssetPaths("job 123");

  assert.equal(root, "output/jobs/job-123");
  assert.equal(paths.imagesDir, "output/jobs/job-123/images");
  assert.equal(paths.audioDir, "output/jobs/job-123/audio");
  assert.equal(paths.subtitlesDir, "output/jobs/job-123/subtitles");
  assert.equal(paths.videoPath, "output/jobs/job-123/video.mp4");
  assert.equal(paths.metadataPath, "output/jobs/job-123/metadata.json");
});

test("output urls and fallback metadata are exposed to downstream UI/api consumers", () => {
  const output = buildOutputPackage({
    renderPlan,
    platformMetadata,
    coverPath: "output/jobs/job-123/cover.png",
    providerMetadata: {
      render: {
        stage: "render",
        provider: "ffmpeg-local",
        mode: "fallback",
        originalProvider: "cloud-renderer",
        fallbackReason: "cloud queue unavailable",
      },
    },
  });

  assert.equal(buildJobOutputUrl("output/jobs/job-123/video.mp4"), "/output/jobs/job-123/video.mp4");
  assert.equal(output.video.url, "/output/jobs/job-123/video.mp4");
  assert.equal(output.cover.url, "/output/jobs/job-123/cover.png");
  assert.equal(output.metadataFile.url, "/output/jobs/job-123/metadata.json");
  assert.equal(output.metadata.providerMetadata?.render?.mode, "fallback");
  assert.equal(output.metadata.providerMetadata?.render?.fallbackReason, "cloud queue unavailable");
});
