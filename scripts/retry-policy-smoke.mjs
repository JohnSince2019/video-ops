import { createJobErrorLogRecord } from "../lib/domain/job-error-log.ts";
import { evaluateRetryPolicy } from "../lib/domain/retry-policy.ts";

const retryDecision = evaluateRetryPolicy({
  retryCount: 1,
});

const errorLog = createJobErrorLogRecord({
  jobId: "job-smoke-001",
  stepName: "image_generation",
  error: new Error("temporary gateway timeout"),
  retryCount: retryDecision.nextRetryCount ?? 0,
});

console.log(
  JSON.stringify(
    {
      retryDecision,
      errorLog,
    },
    null,
    2,
  ),
);
