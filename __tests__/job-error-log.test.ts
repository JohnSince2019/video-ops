import assert from "node:assert/strict";
import test from "node:test";

import { createJobErrorLogRecord } from "../lib/domain/job-error-log.js";

test("creates a job error log record from Error objects", () => {
  const error = new Error("gateway timeout");
  const record = createJobErrorLogRecord({
    jobId: "job-001",
    stepName: "image_generation",
    error,
    retryCount: 2,
  });

  assert.equal(record.jobId, "job-001");
  assert.equal(record.stepName, "image_generation");
  assert.equal(record.errorMessage, "gateway timeout");
  assert.match(record.errorStack ?? "", /gateway timeout/);
  assert.equal(record.retryCount, 2);
});

test("normalizes string and object errors for prisma persistence", () => {
  const stringRecord = createJobErrorLogRecord({
    jobId: "job-002",
    stepName: "tts_generation",
    error: "cosyvoice missing output",
  });

  const objectRecord = createJobErrorLogRecord({
    jobId: "job-003",
    stepName: "assembly",
    error: { code: "FFMPEG_EXIT", exitCode: 1 },
  });

  assert.equal(stringRecord.errorMessage, "cosyvoice missing output");
  assert.equal(stringRecord.errorStack, null);
  assert.equal(objectRecord.errorMessage, "{\"code\":\"FFMPEG_EXIT\",\"exitCode\":1}");
});

test("throws explicit errors for missing identifiers or invalid retryCount", () => {
  assert.throws(
    () =>
      createJobErrorLogRecord({
        jobId: "",
        stepName: "render",
        error: new Error("boom"),
      }),
    /non-empty jobId/,
  );

  assert.throws(
    () =>
      createJobErrorLogRecord({
        jobId: "job-004",
        stepName: "",
        error: new Error("boom"),
      }),
    /non-empty stepName/,
  );

  assert.throws(
    () =>
      createJobErrorLogRecord({
        jobId: "job-004",
        stepName: "render",
        error: new Error("boom"),
        retryCount: -1,
      }),
    /non-negative integer/,
  );
});
