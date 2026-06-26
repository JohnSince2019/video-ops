import test from "node:test";
import assert from "node:assert/strict";

import { estimateJobCost } from "../lib/domain/cost-estimator.js";

test("returns zero cost for zero usage", () => {
  assert.deepEqual(estimateJobCost({}), {
    gptImageUsd: 0,
    wanxUsd: 0,
    ttsUsd: 0,
    totalUsd: 0,
  });
});

test("estimates mixed image and tts usage", () => {
  assert.deepEqual(estimateJobCost({
    gptImageCalls: 2,
    wanxCalls: 3,
    ttsDurationSecs: 120,
  }), {
    gptImageUsd: 0.08,
    wanxUsd: 0.045,
    ttsUsd: 0.024,
    totalUsd: 0.149,
  });
});

test("rounds usd values deterministically", () => {
  const result = estimateJobCost({
    gptImageCalls: 1,
    wanxCalls: 1,
    ttsDurationSecs: 7,
  });

  assert.equal(result.gptImageUsd, 0.04);
  assert.equal(result.wanxUsd, 0.015);
  assert.equal(result.ttsUsd, 0.0014);
  assert.equal(result.totalUsd, 0.0564);
});
