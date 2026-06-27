import assert from "node:assert/strict";
import test from "node:test";

import { validateAudioQuality } from "../lib/audio/audio-quality.js";

test("passes audio quality checks for healthy duration, amplitude, and silence ratio", () => {
  const result = validateAudioQuality({
    durationMs: 4200,
    averageAmplitude: 0.35,
    silenceRatio: 0.2,
  });

  assert.equal(result.passed, true);
  assert.deepEqual(result.reasons, []);
});

test("fails for too-short duration, too-low amplitude, and near-silence", () => {
  const tooShort = validateAudioQuality({
    durationMs: 600,
    averageAmplitude: 0.35,
    silenceRatio: 0.2,
  });
  const tooLow = validateAudioQuality({
    durationMs: 4200,
    averageAmplitude: 0.01,
    silenceRatio: 0.2,
  });
  const tooSilent = validateAudioQuality({
    durationMs: 4200,
    averageAmplitude: 0.2,
    silenceRatio: 0.95,
  });

  assert.deepEqual(tooShort.reasons, ["duration_too_short"]);
  assert.deepEqual(tooLow.reasons, ["amplitude_too_low"]);
  assert.deepEqual(tooSilent.reasons, ["too_silent"]);
});

test("throws explicit errors for missing or invalid inspection data", () => {
  assert.throws(
    () =>
      validateAudioQuality({
        durationMs: Number.NaN,
        averageAmplitude: 0.2,
        silenceRatio: 0.1,
      }),
    /finite numeric values/,
  );

  assert.throws(
    () =>
      validateAudioQuality({
        durationMs: -200,
        averageAmplitude: 0.2,
        silenceRatio: 0.1,
      }),
    /duration must be a positive number/,
  );

  assert.throws(
    () =>
      validateAudioQuality({
        durationMs: 2000,
        averageAmplitude: 2,
        silenceRatio: 0.1,
      }),
    /amplitude must be between 0 and 1/,
  );

  assert.throws(
    () =>
      validateAudioQuality({
        durationMs: 2000,
        averageAmplitude: 0.2,
        silenceRatio: 2,
      }),
    /silence ratio must be between 0 and 1/,
  );
});

test("result structure is consumable by downstream retry and error logging modules", () => {
  const result = validateAudioQuality({
    durationMs: 700,
    averageAmplitude: 0.01,
    silenceRatio: 0.95,
  });

  assert.equal(result.passed, false);
  assert.equal(Array.isArray(result.reasons), true);
  assert.equal(result.metrics.durationMs, 700);
});
