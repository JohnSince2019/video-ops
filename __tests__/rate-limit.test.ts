import test from "node:test";
import assert from "node:assert/strict";

import { MemoryRateLimitStore, evaluateRateLimit } from "../lib/domain/rate-limit.js";

test("allows requests under the quota", () => {
  const store = new MemoryRateLimitStore();
  const result = evaluateRateLimit({
    ip: "127.0.0.1",
    now: 1_000,
    store,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 19);
});

test("rejects requests above the quota", () => {
  const store = new MemoryRateLimitStore();
  const now = 10_000;

  for (let i = 0; i < 20; i++) {
    evaluateRateLimit({
      ip: "127.0.0.1",
      now: now + i,
      store,
    });
  }

  const result = evaluateRateLimit({
    ip: "127.0.0.1",
    now: now + 21,
    store,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "rate_limited");
  assert.equal(result.remaining, 0);
});

test("isolates quotas by ip", () => {
  const store = new MemoryRateLimitStore();

  for (let i = 0; i < 20; i++) {
    evaluateRateLimit({
      ip: "127.0.0.1",
      now: 20_000 + i,
      store,
    });
  }

  const result = evaluateRateLimit({
    ip: "127.0.0.2",
    now: 30_000,
    store,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 19);
});
