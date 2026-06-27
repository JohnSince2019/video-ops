export type JobErrorLogInput = {
  jobId: string;
  stepName: string;
  error: unknown;
  retryCount?: number;
};

export type JobErrorLogRecord = {
  jobId: string;
  stepName: string;
  errorMessage: string;
  errorStack: string | null;
  retryCount: number;
};

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }

  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown job error";
    }
  }

  return "Unknown job error";
}

function normalizeErrorStack(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  if (!error.stack || error.stack.trim().length === 0) {
    return null;
  }

  return error.stack;
}

export function createJobErrorLogRecord(input: JobErrorLogInput): JobErrorLogRecord {
  if (!input.jobId.trim()) {
    throw new Error("Job error log requires a non-empty jobId.");
  }

  if (!input.stepName.trim()) {
    throw new Error("Job error log requires a non-empty stepName.");
  }

  const retryCount = input.retryCount ?? 0;
  if (!Number.isInteger(retryCount) || retryCount < 0) {
    throw new Error("Job error log retryCount must be a non-negative integer.");
  }

  return {
    jobId: input.jobId,
    stepName: input.stepName,
    errorMessage: normalizeErrorMessage(input.error),
    errorStack: normalizeErrorStack(input.error),
    retryCount,
  };
}
