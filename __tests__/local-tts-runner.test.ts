import assert from "node:assert/strict";
import test from "node:test";

import { createUnavailableMlxRunner, detectMlxAudioAvailability } from "../lib/audio/local-tts-runner.js";

test("mlx-audio availability detection returns a boolean", async () => {
  const available = await detectMlxAudioAvailability("python3");
  assert.equal(typeof available, "boolean");
});

test("unavailable mlx runner returns explicit failure payload", async () => {
  const runner = createUnavailableMlxRunner("python3");
  const result = await runner({
    pythonBin: "python3",
    model: "mock-model",
    voice: "zh-CN-male-yunze",
    text: "测试",
    outputPath: "/tmp/mock.wav",
  });

  assert.equal(result.success, false);
  assert.match(result.error ?? "", /mlx-audio is unavailable/);
});
