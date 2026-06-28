import assert from "node:assert/strict";
import test from "node:test";

import { createJobRecoveryStore } from "../lib/domain/job-recovery-store.js";

test("queries interrupted jobs in updatedAt order for startup recovery", async () => {
  const calls: Array<{ type: string; payload: unknown }> = [];
  const prisma = {
    renderJob: {
      async findMany(input: unknown) {
        calls.push({ type: "findMany", payload: input });
        return [];
      },
      async update(input: unknown) {
        calls.push({ type: "update", payload: input });
        return {};
      },
    },
  } as never;

  const store = createJobRecoveryStore(prisma);
  await store.findInterruptedJobs();

  assert.deepEqual(calls[0], {
    type: "findMany",
    payload: {
      where: {
        state: "INTERRUPTED",
      },
      select: {
        id: true,
        jobMode: true,
        state: true,
        manifestId: true,
        renderProfile: true,
        ownerTokenHash: true,
        lastCheckpoint: true,
      },
      orderBy: {
        updatedAt: "asc",
      },
    },
  });
});

test("updates recovered jobs back to QUEUED before re-enqueue", async () => {
  const calls: Array<{ type: string; payload: unknown }> = [];
  const prisma = {
    renderJob: {
      async findMany() {
        return [];
      },
      async update(input: unknown) {
        calls.push({ type: "update", payload: input });
        return {};
      },
    },
  } as never;

  const store = createJobRecoveryStore(prisma);
  await store.markQueued("job-100");

  assert.deepEqual(calls[0], {
    type: "update",
    payload: {
      where: {
        id: "job-100",
      },
      data: {
        state: "QUEUED",
      },
    },
  });
});
