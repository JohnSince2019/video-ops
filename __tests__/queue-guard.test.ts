import test from "node:test";
import assert from "node:assert/strict";

import { evaluateQueueGuard } from "../lib/domain/queue-guard.js";

test("allows healthy queue and memory usage", () => {
  assert.deepEqual(
    evaluateQueueGuard({ backlogCount: 10, memoryUsageGb: 8 }),
    {
      allowed: true,
      message: "Queue and memory usage are within safe thresholds.",
    },
  );
});

test("rejects backlog overflow", () => {
  assert.deepEqual(
    evaluateQueueGuard({ backlogCount: 51, memoryUsageGb: 8 }),
    {
      allowed: false,
      reason: "backlog_limit",
      message: "Queue backlog 51 exceeds limit 50.",
    },
  );
});

test("rejects memory overflow", () => {
  assert.deepEqual(
    evaluateQueueGuard({ backlogCount: 10, memoryUsageGb: 12.5 }),
    {
      allowed: false,
      reason: "memory_limit",
      message: "Memory usage 12.5GB exceeds limit 12GB.",
    },
  );
});
