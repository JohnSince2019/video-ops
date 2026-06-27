import { buildRenderPlan } from "../lib/video/render-plan.ts";

const plan = buildRenderPlan({
  profile: "standard",
  timeline: {
    totalDurationMs: 9300,
    transitionDefault: "crossfade",
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
  },
});

console.log(JSON.stringify(plan, null, 2));
