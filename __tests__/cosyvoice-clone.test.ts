import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTtsRequest,
  generateClonedSpeechForScene,
} from "../lib/audio/cosyvoice-client.js";

const scene = {
  id: "scene-201",
  scene_hash: "scene-hash-201",
  narration: "用三到十秒参考音频，生成更贴近目标说话风格的配音。",
  audio: {
    tts_voice: "zh-CN-female-yunyang",
  },
};

test("maps reference audio into the zero-shot cloning request", () => {
  const request = buildTtsRequest({
    scene,
    referenceAudioPath: "john-reference.wav",
  });

  assert.match(request.referenceAudioPath ?? "", /assets\/reference-audio\/john-reference\.wav$/);
  assert.equal(request.voice, "zh-CN-female-yunyang");
});

test("returns compatible result structure while surfacing reference audio usage", async () => {
  const result = await generateClonedSpeechForScene(
    {
      scene,
      referenceAudioPath: "john-reference.wav",
    },
    {
      runner: async (request) => ({
        success: true,
        audioPath: request.outputPath,
        durationMs: 4800,
      }),
    },
  );

  assert.equal(result.cloneMode, "zero_shot");
  assert.equal(result.referenceAudioPath?.endsWith("john-reference.wav"), true);
  assert.equal(result.audioPath.endsWith(".wav"), true);
  assert.equal(result.durationMs, 4800);
});

test("returns explicit errors for missing reference audio, invalid path, and inference failures", async () => {
  await assert.rejects(
    () =>
      generateClonedSpeechForScene(
        {
          scene,
        },
        {
          runner: async () => ({
            success: true,
            audioPath: "assets/audio/scene-201.wav",
            durationMs: 3200,
          }),
        },
      ),
    /Reference audio path is required/,
  );

  await assert.rejects(
    () =>
      generateClonedSpeechForScene(
        {
          scene,
          referenceAudioPath: " ",
        },
        {
          runner: async () => ({
            success: true,
            audioPath: "assets/audio/scene-201.wav",
            durationMs: 3200,
          }),
        },
      ),
    /Reference audio path is required/,
  );

  await assert.rejects(
    () =>
      generateClonedSpeechForScene(
        {
          scene,
          referenceAudioPath: "john-reference.wav",
        },
        {
          runner: async () => ({
            success: false,
            error: "reference audio not readable",
          }),
        },
      ),
    /reference audio not readable/,
  );
});
