import { buildOutputPackage } from "../lib/video/output-package.ts";

const output = buildOutputPackage({
  renderPlan: {
    profile: "standard",
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
      profile: "standard",
      width: 1080,
      height: 1920,
      videoBitrateKbps: 3500,
      audioBitrateKbps: 128,
      crf: 24,
      preset: "medium",
    },
  },
  platformMetadata: {
    platform: "douyin",
    title: "AI 提效工作流｜抖音版",
    description: "适合竖屏高频刷看的短视频版本。",
    tags: ["AI效率", "抖音"],
    orientation: "portrait",
    category: "knowledge_short_video",
    coverText: "AI 提效工作流｜高信息密度",
    renderProfile: "standard",
    durationMs: 9300,
  },
  coverPath: "output/cover.png",
});

console.log(JSON.stringify(output, null, 2));
