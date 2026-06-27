export type RetryPolicyInput = {
  retryCount: number;
  maxRetries?: number;
  baseDelayMs?: number;
  backoffMultiplier?: number;
};

export type RetryPolicyDecision = {
  shouldRetry: boolean;
  retryCount: number;
  nextRetryCount: number | null;
  maxRetries: number;
  delayMs: number | null;
  reason: "retry_scheduled" | "retry_limit_reached";
};

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1_000;
const DEFAULT_BACKOFF_MULTIPLIER = 2;

export function calculateRetryDelay(input: Pick<RetryPolicyInput, "retryCount" | "baseDelayMs" | "backoffMultiplier">) {
  if (!Number.isInteger(input.retryCount) || input.retryCount < 0) {
    throw new Error("Retry delay calculation requires a non-negative integer retryCount.");
  }

  const baseDelayMs = input.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const backoffMultiplier = input.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER;

  if (!Number.isFinite(baseDelayMs) || baseDelayMs <= 0) {
    throw new Error("Retry delay calculation requires a positive baseDelayMs.");
  }

  if (!Number.isFinite(backoffMultiplier) || backoffMultiplier < 1) {
    throw new Error("Retry delay calculation requires a backoffMultiplier greater than or equal to 1.");
  }

  return Math.round(baseDelayMs * backoffMultiplier ** input.retryCount);
}

export function evaluateRetryPolicy(input: RetryPolicyInput): RetryPolicyDecision {
  if (!Number.isInteger(input.retryCount) || input.retryCount < 0) {
    throw new Error("Retry policy requires a non-negative integer retryCount.");
  }

  const maxRetries = input.maxRetries ?? DEFAULT_MAX_RETRIES;
  if (!Number.isInteger(maxRetries) || maxRetries < 1) {
    throw new Error("Retry policy requires maxRetries to be a positive integer.");
  }

  const shouldRetry = input.retryCount < maxRetries;

  if (!shouldRetry) {
    return {
      shouldRetry: false,
      retryCount: input.retryCount,
      nextRetryCount: null,
      maxRetries,
      delayMs: null,
      reason: "retry_limit_reached",
    };
  }

  return {
    shouldRetry: true,
    retryCount: input.retryCount,
    nextRetryCount: input.retryCount + 1,
    maxRetries,
    delayMs: calculateRetryDelay(input),
    reason: "retry_scheduled",
  };
}
