import assert from "node:assert/strict";
import test from "node:test";

import { buildRenderPlan, getRenderProfileSpec } from "../lib/video/render-plan.js";
import type { VideoTimeline } from "../lib/video/video-assembler.js";

const timeline: VideoTimeline = {
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
        type: "crossfade",
        durationMs: 0,
      },
    },
    {
      sceneId: "scene-002",
      sceneHash: "scene-hash-002",
      order: 1,
      startMs: 4200,
      endMs: 9300,
      durationMs: 5100,
      mainImage: {
        artifactKey: "scene-hash-002:prompt-hash-002:0",
        url: "mock://main/scene-002.png",
      },
      audio: {
        path: "assets/audio/scene-002.wav",
        durationMs: 5100,
        voice: "zh-CN-female-yunyang",
      },
      transition: {
        type: "crossfade",
        durationMs: 300,
      },
    },
  ],
};

test("render profiles differ across draft, standard, and high_quality", () => {
  const draft = getRenderProfileSpec("draft");
  const standard = getRenderProfileSpec("standard");
  const high = getRenderProfileSpec("high_quality");

  assert.notEqual(draft.width, standard.width);
  assert.notEqual(standard.videoBitrateKbps, high.videoBitrateKbps);
  assert.notEqual(draft.crf, high.crf);
});

test("builds a render plan and ffmpeg command from timeline input", () => {
  const plan = buildRenderPlan({
    timeline,
    profile: "standard",
  });

  assert.equal(plan.profile, "standard");
  assert.equal(plan.timelineDurationMs, 9300);
  assert.equal(plan.clips.length, 2);
  assert.equal(plan.spec.width, 1080);
  assert.equal(plan.ffmpegArgs.includes("libx264"), true);
  assert.equal(plan.outputPath, "output/video-standard.mp4");
});

test("returns explicit errors for invalid profile, empty timeline, and empty clips", () => {
  assert.throws(
    () => getRenderProfileSpec("cinematic" as never),
    /Invalid render profile/,
  );

  assert.throws(
    () =>
      buildRenderPlan({
        timeline: { totalDurationMs: 0, transitionDefault: "cut", clips: [] },
        profile: "draft",
      }),
    /Timeline must contain at least one clip/,
  );

  assert.throws(
    () =>
      buildRenderPlan({
        timeline: {
          ...timeline,
          clips: [
            {
              ...timeline.clips[0],
              audio: { ...timeline.clips[0]!.audio, path: "" },
            },
          ],
        },
        profile: "draft",
      }),
    /Missing audio input/,
  );
});

test("render plan output is consumable by a later ffmpeg execution layer", () => {
  const plan = buildRenderPlan({
    timeline,
    profile: "high_quality",
    outputPath: "output/final.mp4",
  });

  assert.equal(plan.ffmpegArgs.at(-1), "output/final.mp4");
  assert.equal(plan.clips[0]?.imageInput, "mock://main/scene-001.png");
  assert.equal(plan.clips[1]?.audioInput, "assets/audio/scene-002.wav");
});
