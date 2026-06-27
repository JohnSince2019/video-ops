import { buildPlatformMetadata } from "../lib/video/platform-metadata.ts";

const metadata = buildPlatformMetadata({
  manifest: {
    $schema: "https://video-ops.example.com/manifest-v1.schema.json",
    id: "manifest-001",
    title: "AI 提效工作流",
    platform: "xiaohongshu",
    renderProfile: "standard",
    scenes: [],
    metadata: {
      created_at: "2026-06-27T00:00:00.000Z",
      author: "John",
      copyright_license: "commercial",
    },
  },
  timeline: {
    totalDurationMs: 9300,
    transitionDefault: "crossfade",
    clips: [
      {
        sceneId: "scene-001",
        sceneHash: "scene-hash-001",
        order: 0,
        startMs: 0,
        endMs: 9300,
        durationMs: 9300,
        mainImage: {
          artifactKey: "scene-hash-001:prompt-hash-001:0",
          url: "mock://main/scene-001.png",
        },
        audio: {
          path: "assets/audio/scene-001.wav",
          durationMs: 9300,
          voice: "zh-CN-female-yunyang",
        },
        transition: {
          type: "crossfade",
          durationMs: 0,
        },
      },
    ],
  },
});

console.log(JSON.stringify(metadata, null, 2));
