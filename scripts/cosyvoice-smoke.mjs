import { generateSpeechForScene } from "../lib/audio/cosyvoice-client.ts";

const result = await generateSpeechForScene(
  {
    scene: {
      id: "scene-102",
      scene_hash: "scene-hash-102",
      narration: "这是一个本地 TTS mock 验证，用来确认接口和结果结构都已经接好。",
      audio: {
        tts_voice: "zh-CN-female-yunyang",
      },
    },
  },
  {
    runner: async (request) => ({
      success: true,
      audioPath: request.outputPath,
      durationMs: 5100,
    }),
  },
);

console.log(JSON.stringify(result, null, 2));
