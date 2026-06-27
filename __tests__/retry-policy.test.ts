import assert from "node:assert/strict";
import test from "node:test";

import { calculateRetryDelay, evaluateRetryPolicy } from "../lib/domain/retry-policy.js";

test("schedules retries while retryCount is still below the max", () => {
  const decision = evaluateRetryPolicy({
    retryCount: 0,
  });

  assert.equal(decision.shouldRetry, true);
  assert.equal(decision.nextRetryCount, 1);
  assert.equal(decision.maxRetries, 3);
  assert.equal(decision.delayMs, 1000);
  assert.equal(decision.reason, "retry_scheduled");
});

test("stops retrying after the third rerun threshold is reached", () => {
  const decision = evaluateRetryPolicy({
    retryCount: 3,
  });

  assert.equal(decision.shouldRetry, false);
  assert.equal(decision.nextRetryCount, null);
  assert.equal(decision.delayMs, null);
  assert.equal(decision.reason, "retry_limit_reached");
});

test("supports deterministic exponential backoff for queue rescheduling", () => {
  assert.equal(calculateRetryDelay({ retryCount: 0 }), 1000);
  assert.equal(calculateRetryDelay({ retryCount: 1 }), 2000);
  assert.equal(calculateRetryDelay({ retryCount: 2 }), 4000);
  assert.equal(
    calculateRetryDelay({
      retryCount: 2,
      baseDelayMs: 500,
      backoffMultiplier: 3,
    }),
    4500,
  );
});

test("throws explicit errors for invalid retry policy input", () => {
  assert.throws(() => evaluateRetryPolicy({ retryCount: -1 }), /non-negative integer/);
  assert.throws(() => evaluateRetryPolicy({ retryCount: 0, maxRetries: 0 }), /positive integer/);
  assert.throws(() => calculateRetryDelay({ retryCount: 0, baseDelayMs: 0 }), /positive baseDelayMs/);
  assert.throws(
    () => calculateRetryDelay({ retryCount: 0, backoffMultiplier: 0.5 }),
    /greater than or equal to 1/,
  );
});
