import { assembleVideoTimeline } from "../lib/video/video-assembler.ts";

const timeline = assembleVideoTimeline({
  scenes: [
    { id: "scene-001", scene_hash: "scene-hash-001" },
    { id: "scene-002", scene_hash: "scene-hash-002" },
  ],
  mainImages: [
    {
      sceneId: "scene-001",
      sceneHash: "scene-hash-001",
      promptHash: "prompt-hash-001",
      model: "gpt-image-2",
      prompt: "prompt 1",
      size: "1024x1024",
      quality: "standard",
      responseFormat: "url",
      artifacts: [{ index: 0, url: "mock://main/scene-001.png", artifactKey: "scene-hash-001:prompt-hash-001:0" }],
    },
    {
      sceneId: "scene-002",
      sceneHash: "scene-hash-002",
      promptHash: "prompt-hash-002",
      model: "gpt-image-2",
      prompt: "prompt 2",
      size: "1024x1024",
      quality: "standard",
      responseFormat: "url",
      artifacts: [{ index: 0, url: "mock://main/scene-002.png", artifactKey: "scene-hash-002:prompt-hash-002:0" }],
    },
  ],
  brollImages: [
    {
      sceneId: "scene-001",
      sceneHash: "scene-hash-001",
      promptHash: "prompt-hash-001",
      model: "wanx-v1",
      prompt: "broll prompt",
      size: "1024x1024",
      quality: "standard",
      responseFormat: "url",
      artifacts: [{ index: 0, url: "mock://broll/scene-001.png", artifactKey: "scene-hash-001:prompt-hash-001:0" }],
    },
  ],
  audios: [
    {
      sceneId: "scene-001",
      sceneHash: "scene-hash-001",
      model: "cosyvoice",
      voice: "zh-CN-female-yunyang",
      text: "第一段旁白",
      audioPath: "assets/audio/scene-001.wav",
      durationMs: 4200,
      format: "wav",
      cloneMode: "standard",
    },
    {
      sceneId: "scene-002",
      sceneHash: "scene-hash-002",
      model: "cosyvoice",
      voice: "zh-CN-female-yunyang",
      text: "第二段旁白",
      audioPath: "assets/audio/scene-002.wav",
      durationMs: 5100,
      format: "wav",
      cloneMode: "standard",
    },
  ],
  transitionType: "crossfade",
  transitionDurationMs: 300,
});

console.log(JSON.stringify(timeline, null, 2));
