import assert from "node:assert/strict";
import test from "node:test";

import { validateImageQuality } from "../lib/image/image-quality.js";

test("passes image quality checks for healthy dimensions and brightness", () => {
  const result = validateImageQuality({
    width: 1024,
    height: 1024,
    averageBrightness: 128,
  });

  assert.equal(result.passed, true);
  assert.deepEqual(result.reasons, []);
});

test("fails for too-small dimensions, too-dark brightness, and too-bright brightness", () => {
  const tooSmall = validateImageQuality({
    width: 200,
    height: 300,
    averageBrightness: 128,
  });
  const tooDark = validateImageQuality({
    width: 1024,
    height: 1024,
    averageBrightness: 20,
  });
  const tooBright = validateImageQuality({
    width: 1024,
    height: 1024,
    averageBrightness: 240,
  });

  assert.deepEqual(tooSmall.reasons, ["dimension_too_small"]);
  assert.deepEqual(tooDark.reasons, ["too_dark"]);
  assert.deepEqual(tooBright.reasons, ["too_bright"]);
});

test("throws explicit errors for missing or invalid inspection data", () => {
  assert.throws(
    () =>
      validateImageQuality({
        width: Number.NaN,
        height: 1024,
        averageBrightness: 100,
      }),
    /finite numeric values/,
  );

  assert.throws(
    () =>
      validateImageQuality({
        width: -10,
        height: 1024,
        averageBrightness: 100,
      }),
    /dimensions must be positive/,
  );

  assert.throws(
    () =>
      validateImageQuality({
        width: 1024,
        height: 1024,
        averageBrightness: 400,
      }),
    /between 0 and 255/,
  );
});

test("result structure is consumable by downstream retry and error logging modules", () => {
  const result = validateImageQuality({
    width: 220,
    height: 220,
    averageBrightness: 18,
  });

  assert.equal(result.passed, false);
  assert.equal(Array.isArray(result.reasons), true);
  assert.equal(result.metrics.width, 220);
});
