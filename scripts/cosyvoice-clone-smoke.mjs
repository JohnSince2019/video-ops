import { generateClonedSpeechForScene } from "../lib/audio/cosyvoice-client.ts";

const result = await generateClonedSpeechForScene(
  {
    scene: {
      id: "scene-202",
      scene_hash: "scene-hash-202",
      narration: "这是一个零样本音色克隆 mock 验证，用来确认参考音频参数和结果结构都已接好。",
      audio: {
        tts_voice: "zh-CN-female-yunyang",
      },
    },
    referenceAudioPath: "john-reference.wav",
  },
  {
    runner: async (request) => ({
      success: true,
      audioPath: request.outputPath,
      durationMs: 5600,
    }),
  },
);

console.log(JSON.stringify(result, null, 2));
