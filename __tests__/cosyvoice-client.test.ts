import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTtsRequest,
  generateSpeechForScene,
  normalizeTtsResult,
} from "../lib/audio/cosyvoice-client.js";

const scene = {
  id: "scene-101",
  scene_hash: "scene-hash-101",
  narration: "把重复动作交给 AI，把判断和验收留给自己。",
  audio: {
    tts_voice: "zh-CN-female-yunyang",
  },
};

test("maps scene narration and voice into a local TTS request", () => {
  const request = buildTtsRequest({ scene });

  assert.equal(request.voice, "zh-CN-female-yunyang");
  assert.equal(request.model, "aufklarer/CosyVoice3-0.5B-MLX-4bit");
  assert.match(request.outputPath, /scene-101-scene-hash-1/i);
  assert.match(request.text, /把重复动作交给 AI/);
});

test("normalizes successful TTS results for downstream modules", async () => {
  const result = await generateSpeechForScene(
    { scene },
    {
      runner: async (request) => ({
        success: true,
        audioPath: request.outputPath,
        durationMs: 4200,
      }),
    },
  );

  assert.equal(result.sceneId, "scene-101");
  assert.equal(result.sceneHash, "scene-hash-101");
  assert.equal(result.voice, "zh-CN-female-yunyang");
  assert.equal(result.durationMs, 4200);
  assert.equal(result.format, "wav");
});

test("returns explicit errors for local inference failures", async () => {
  await assert.rejects(
    () =>
      generateSpeechForScene(
        { scene },
        {
          runner: async () => ({
            success: false,
            error: "mlx-audio command failed",
          }),
        },
      ),
    /mlx-audio command failed/,
  );
});

test("returns explicit errors for empty output or missing audio path", async () => {
  await assert.rejects(
    () =>
      generateSpeechForScene(
        { scene },
        {
          runner: async () => ({
            success: true,
            durationMs: 3000,
          }),
        },
      ),
    /no audio path/,
  );

  assert.throws(
    () =>
      normalizeTtsResult(
        { scene },
        buildTtsRequest({ scene }),
        {
          success: true,
          audioPath: "assets/audio/test.wav",
          durationMs: 0,
        },
      ),
    /invalid duration/,
  );
});

test("result structure can be consumed by cache or timeline modules", async () => {
  const result = await generateSpeechForScene(
    { scene },
    {
      runner: async (request) => ({
        success: true,
        audioPath: request.outputPath,
      }),
    },
  );

  assert.equal(result.audioPath.endsWith(".wav"), true);
  assert.equal(result.durationMs > 0, true);
  assert.equal(result.text, scene.narration);
});

test("scene-level reference audio path is inherited into local TTS requests", () => {
  const request = buildTtsRequest({
    scene: {
      ...scene,
      audio: {
        ...scene.audio,
        reference_audio_path: "/tmp/custom-voice-reference.wav",
      },
    },
  });

  assert.equal(request.referenceAudioPath, "/tmp/custom-voice-reference.wav");
});
