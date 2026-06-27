import assert from "node:assert/strict";
import test from "node:test";

import { assembleVideoTimeline } from "../lib/video/video-assembler.js";

const scenes = [
  { id: "scene-001", scene_hash: "scene-hash-001" },
  { id: "scene-002", scene_hash: "scene-hash-002" },
];

const mainImages = [
  {
    sceneId: "scene-001",
    sceneHash: "scene-hash-001",
    promptHash: "prompt-hash-001",
    model: "gpt-image-2",
    prompt: "main prompt 1",
    size: "1024x1024",
    quality: "standard" as const,
    responseFormat: "url" as const,
    artifacts: [{ index: 0, url: "mock://main/scene-001.png", artifactKey: "scene-hash-001:prompt-hash-001:0" }],
  },
  {
    sceneId: "scene-002",
    sceneHash: "scene-hash-002",
    promptHash: "prompt-hash-002",
    model: "gpt-image-2",
    prompt: "main prompt 2",
    size: "1024x1024",
    quality: "standard" as const,
    responseFormat: "url" as const,
    artifacts: [{ index: 0, url: "mock://main/scene-002.png", artifactKey: "scene-hash-002:prompt-hash-002:0" }],
  },
];

const brollImages = [
  {
    sceneId: "scene-001",
    sceneHash: "scene-hash-001",
    promptHash: "prompt-hash-001",
    model: "wanx-v1",
    prompt: "broll prompt 1",
    size: "1024x1024",
    quality: "standard" as const,
    responseFormat: "url" as const,
    artifacts: [{ index: 0, url: "mock://broll/scene-001.png", artifactKey: "scene-hash-001:prompt-hash-001:0" }],
  },
];

const audios = [
  {
    sceneId: "scene-001",
    sceneHash: "scene-hash-001",
    model: "cosyvoice",
    voice: "zh-CN-female-yunyang",
    text: "第一段旁白",
    audioPath: "assets/audio/scene-001.wav",
    durationMs: 4000,
    format: "wav" as const,
    cloneMode: "standard" as const,
  },
  {
    sceneId: "scene-002",
    sceneHash: "scene-hash-002",
    model: "cosyvoice",
    voice: "zh-CN-female-yunyang",
    text: "第二段旁白",
    audioPath: "assets/audio/scene-002.wav",
    durationMs: 5000,
    format: "wav" as const,
    cloneMode: "standard" as const,
  },
];

test("assembles a standard multi-scene timeline", () => {
  const timeline = assembleVideoTimeline({
    scenes,
    mainImages,
    audios,
  });

  assert.equal(timeline.clips.length, 2);
  assert.equal(timeline.totalDurationMs, 9000);
  assert.equal(timeline.clips[0]?.startMs, 0);
  assert.equal(timeline.clips[1]?.startMs, 4000);
  assert.equal(timeline.clips[1]?.endMs, 9000);
});

test("assembles main image, b-roll, and audio together", () => {
  const timeline = assembleVideoTimeline({
    scenes,
    mainImages,
    brollImages,
    audios,
    transitionType: "fade",
    transitionDurationMs: 500,
  });

  assert.equal(timeline.clips[0]?.mainImage.url, "mock://main/scene-001.png");
  assert.equal(timeline.clips[0]?.brollImage?.url, "mock://broll/scene-001.png");
  assert.equal(timeline.clips[1]?.brollImage, undefined);
  assert.equal(timeline.clips[1]?.transition.type, "fade");
  assert.equal(timeline.clips[1]?.transition.durationMs, 500);
});

test("returns explicit errors for missing assets, missing audio durations, and invalid transitions", () => {
  assert.throws(
    () =>
      assembleVideoTimeline({
        scenes,
        mainImages: mainImages.slice(0, 1),
        audios,
      }),
    /Missing main image asset for scene scene-002/,
  );

  assert.throws(
    () =>
      assembleVideoTimeline({
        scenes,
        mainImages,
        audios: [{ ...audios[0], durationMs: 0 }, audios[1]!],
      }),
    /Missing valid audio duration for scene scene-001/,
  );

  assert.throws(
    () =>
      assembleVideoTimeline({
        scenes,
        mainImages,
        audios,
        transitionType: "slide" as never,
      }),
    /Invalid transition type/,
  );
});

test("timeline output is consumable by downstream rendering modules", () => {
  const timeline = assembleVideoTimeline({
    scenes,
    mainImages,
    audios,
    transitionType: "cut",
  });

  assert.equal(timeline.clips[0]?.audio.path.endsWith(".wav"), true);
  assert.equal(timeline.clips[0]?.mainImage.artifactKey.includes("scene-hash-001"), true);
  assert.equal(timeline.transitionDefault, "cut");
});
