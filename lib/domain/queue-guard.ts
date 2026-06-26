export type QueueGuardInput = {
  backlogCount: number;
  memoryUsageGb: number;
};

export type QueueGuardResult = {
  allowed: boolean;
  reason?: "backlog_limit" | "memory_limit";
  message: string;
};

export const MAX_QUEUE_BACKLOG = 50;
export const MAX_MEMORY_USAGE_GB = 12;

export function evaluateQueueGuard(input: QueueGuardInput): QueueGuardResult {
  if (input.backlogCount > MAX_QUEUE_BACKLOG) {
    return {
      allowed: false,
      reason: "backlog_limit",
      message: `Queue backlog ${input.backlogCount} exceeds limit ${MAX_QUEUE_BACKLOG}.`,
    };
  }

  if (input.memoryUsageGb > MAX_MEMORY_USAGE_GB) {
    return {
      allowed: false,
      reason: "memory_limit",
      message: `Memory usage ${input.memoryUsageGb}GB exceeds limit ${MAX_MEMORY_USAGE_GB}GB.`,
    };
  }

  return {
    allowed: true,
    message: "Queue and memory usage are within safe thresholds.",
  };
}
