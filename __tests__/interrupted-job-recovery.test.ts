import assert from "node:assert/strict";
import test from "node:test";

import { recoverInterruptedJobs } from "../lib/domain/interrupted-job-recovery.js";
import { JobProgressChannel } from "../lib/progress/job-progress.js";

test("scans interrupted jobs on startup, marks them queued, and re-enqueues them", async () => {
  const marked: string[] = [];
  const queued: string[] = [];
  const progress = new JobProgressChannel();
  const events: string[] = [];

  progress.subscribeAll((payload) => {
    events.push(`${payload.jobId}:${payload.state}:${payload.step}`);
  });

  const result = await recoverInterruptedJobs({
    store: {
      async findInterruptedJobs() {
        return [
          {
            id: "job-001",
            state: "INTERRUPTED",
            manifestId: "manifest-001",
            renderProfile: "standard",
            ownerTokenHash: "owner-hash-001",
            lastCheckpoint: { step: "tts" },
          },
          {
            id: "job-002",
            state: "INTERRUPTED",
            manifestId: "manifest-002",
            renderProfile: "draft",
            ownerTokenHash: "owner-hash-002",
            lastCheckpoint: null,
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
    progress,
  });

  assert.deepEqual(marked, ["job-001", "job-002"]);
  assert.deepEqual(queued, ["job-001", "job-002"]);
  assert.deepEqual(events, [
    "job-001:QUEUED:startup_recovery",
    "job-002:QUEUED:startup_recovery",
  ]);
  assert.deepEqual(result, {
    scanned: 2,
    recovered: 2,
    skipped: 0,
    jobIds: ["job-001", "job-002"],
  });
});

test("skips records that are not in INTERRUPTED state", async () => {
  const marked: string[] = [];
  const queued: string[] = [];

  const result = await recoverInterruptedJobs({
    store: {
      async findInterruptedJobs() {
        return [
          {
            id: "job-003",
            state: "FAILED",
            manifestId: "manifest-003",
            renderProfile: "standard",
            ownerTokenHash: "owner-hash-003",
            lastCheckpoint: { step: "render" },
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

  assert.deepEqual(marked, []);
  assert.deepEqual(queued, []);
  assert.deepEqual(result, {
    scanned: 1,
    recovered: 0,
    skipped: 1,
    jobIds: [],
  });
});

test("result structure is consumable by startup bootstrap and ops diagnostics", async () => {
  const result = await recoverInterruptedJobs({
    store: {
      async findInterruptedJobs() {
        return [
          {
            id: "job-004",
            state: "INTERRUPTED",
            manifestId: "manifest-004",
            renderProfile: "high_quality",
            ownerTokenHash: "owner-hash-004",
            lastCheckpoint: { step: "assembly", progress: 78 },
          },
        ];
      },
      async markQueued() {},
    },
    queue: {
      async enqueueRecovery() {},
    },
  });

  assert.equal(result.recovered, 1);
  assert.equal(result.jobIds[0], "job-004");
});
