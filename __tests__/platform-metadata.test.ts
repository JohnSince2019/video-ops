import assert from "node:assert/strict";
import test from "node:test";

import { buildPlatformMetadata } from "../lib/video/platform-metadata.js";

const manifest = {
  $schema: "https://video-ops.example.com/manifest-v1.schema.json",
  id: "manifest-001",
  title: "AI 提效工作流",
  platform: "douyin" as const,
  renderProfile: "standard" as const,
  scenes: [],
  metadata: {
    created_at: "2026-06-27T00:00:00.000Z",
    author: "John",
    copyright_license: "commercial",
  },
};

const timeline = {
  totalDurationMs: 9300,
  transitionDefault: "crossfade" as const,
  clips: [
    {
      sceneId: "scene-001",
      sceneHash: "scene-hash-001",
      order: 0,
      startMs: 0,
      endMs: 4200,
      durationMs: 4200,
      mainImage: {
        artifactKey: "scene-hash-001:prompt-hash-001:0",
        url: "mock://main/scene-001.png",
      },
      audio: {
        path: "assets/audio/scene-001.wav",
        durationMs: 4200,
        voice: "zh-CN-female-yunyang",
      },
      transition: {
        type: "crossfade" as const,
        durationMs: 0,
      },
    },
  ],
};

test("builds differentiated metadata for douyin, xiaohongshu, and videox", () => {
  const douyin = buildPlatformMetadata({ manifest, timeline, platform: "douyin" });
  const xiaohongshu = buildPlatformMetadata({ manifest, timeline, platform: "xiaohongshu" });
  const videox = buildPlatformMetadata({ manifest, timeline, platform: "videox" });

  assert.notEqual(douyin.title, xiaohongshu.title);
  assert.notEqual(xiaohongshu.description, videox.description);
  assert.equal(douyin.tags.includes("抖音"), true);
  assert.equal(xiaohongshu.tags.includes("小红书"), true);
  assert.equal(videox.tags.includes("视频号"), true);
});

test("builds metadata from manifest and timeline input", () => {
  const metadata = buildPlatformMetadata({ manifest, timeline });

  assert.equal(metadata.platform, "douyin");
  assert.equal(metadata.renderProfile, "standard");
  assert.equal(metadata.durationMs, 9300);
  assert.equal(metadata.orientation, "portrait");
});

test("returns explicit errors for invalid platform and missing title", () => {
  assert.throws(
    () =>
      buildPlatformMetadata({
        manifest: { ...manifest, title: "" },
        timeline,
      }),
    /Manifest title is required/,
  );

  assert.throws(
    () =>
      buildPlatformMetadata({
        manifest,
        timeline,
        platform: "youtube" as never,
      }),
    /Unsupported platform/,
  );
});

test("metadata output is consumable by downstream packaging modules", () => {
  const metadata = buildPlatformMetadata({ manifest, timeline, platform: "videox" });

  assert.equal(Array.isArray(metadata.tags), true);
  assert.equal(metadata.coverText.includes("系统方法"), true);
  assert.equal(metadata.category, "channel_video");
});
