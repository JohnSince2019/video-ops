import { recoverInterruptedJobs } from "../lib/domain/interrupted-job-recovery.ts";

const marked = [];
const queued = [];

const result = await recoverInterruptedJobs({
  store: {
    async findInterruptedJobs() {
      return [
        {
          id: "job-smoke-001",
          state: "INTERRUPTED",
          manifestId: "manifest-smoke-001",
          renderProfile: "standard",
          ownerTokenHash: "owner-smoke-001",
          lastCheckpoint: {
            step: "image_generation",
            scene: 2,
          },
        },
      ];
    },
    async markQueued(jobId) {
      marked.push(jobId);
    },
  },
  queue: {
    async enqueueRecovery(job) {
      queued.push(job.id);
    },
  },
});

console.log(
  JSON.stringify(
    {
      result,
      marked,
      queued,
    },
    null,
    2,
  ),
);
