import { transitionJobState, type JobState } from "./job-state.js";
import type { JobMode } from "./job-mode.js";

export type RecoverableJob = {
  id: string;
  jobMode: JobMode;
  state: JobState;
  manifestId: string;
  renderProfile: string;
  ownerTokenHash: string;
  lastCheckpoint: unknown;
};

export type RecoverInterruptedJobsStore = {
  findInterruptedJobs(): Promise<RecoverableJob[]>;
  markQueued(jobId: string): Promise<void>;
};

export type RecoveryQueue = {
  enqueueRecovery(job: RecoverableJob): Promise<void>;
};

export type RecoveryProgressReporter = {
  emit(payload: {
    jobId: string;
    state: JobState;
    progress: number;
    step: string;
    message: string;
    meta?: Record<string, unknown>;
  }): void;
};

export type RecoveryResult = {
  scanned: number;
  recovered: number;
  skipped: number;
  jobIds: string[];
};

export async function recoverInterruptedJobs(input: {
  store: RecoverInterruptedJobsStore;
  queue: RecoveryQueue;
  progress?: RecoveryProgressReporter;
}) {
  const jobs = await input.store.findInterruptedJobs();
  const recoveredJobIds: string[] = [];
  let skipped = 0;

  for (const job of jobs) {
    if (job.state !== "INTERRUPTED") {
      skipped += 1;
      continue;
    }

    const nextState = transitionJobState(job.state, "QUEUED");
    await input.store.markQueued(job.id);
    await input.queue.enqueueRecovery(job);
    input.progress?.emit({
      jobId: job.id,
      state: nextState,
      progress: 0,
      step: "startup_recovery",
      message: "Recovered interrupted job and requeued for resume.",
      meta: {
        manifestId: job.manifestId,
        jobMode: job.jobMode,
        renderProfile: job.renderProfile,
        ownerTokenHash: job.ownerTokenHash,
        recoveredFrom: "INTERRUPTED",
        hasCheckpoint: job.lastCheckpoint !== null && job.lastCheckpoint !== undefined,
      },
    });
    recoveredJobIds.push(job.id);
  }

  return {
    scanned: jobs.length,
    recovered: recoveredJobIds.length,
    skipped,
    jobIds: recoveredJobIds,
  } satisfies RecoveryResult;
}
