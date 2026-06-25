export const JOB_STATES = [
  "QUEUED",
  "PARSING",
  "AI_PROCESSING",
  "ASSEMBLING",
  "RENDERING",
  "POST_PROCESSING",
  "COMPLETED",
  "FAILED",
  "INTERRUPTED",
] as const;

export type JobState = (typeof JOB_STATES)[number];

export const JOB_STATE_TRANSITIONS: Record<JobState, JobState[]> = {
  QUEUED: ["PARSING", "FAILED", "INTERRUPTED"],
  PARSING: ["AI_PROCESSING", "FAILED", "INTERRUPTED"],
  AI_PROCESSING: ["ASSEMBLING", "FAILED", "INTERRUPTED"],
  ASSEMBLING: ["RENDERING", "FAILED", "INTERRUPTED"],
  RENDERING: ["POST_PROCESSING", "FAILED", "INTERRUPTED"],
  POST_PROCESSING: ["COMPLETED", "FAILED", "INTERRUPTED"],
  COMPLETED: [],
  FAILED: [],
  INTERRUPTED: ["QUEUED"],
};

export function canTransition(from: JobState, to: JobState) {
  return JOB_STATE_TRANSITIONS[from].includes(to);
}

export function transitionJobState(from: JobState, to: JobState) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid job state transition: ${from} -> ${to}`);
  }

  return to;
}
