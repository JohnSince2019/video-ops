import test from "node:test";
import assert from "node:assert/strict";

import { hashOwnerToken, shouldStartNewJob } from "../lib/domain/job-idempotency.js";

test("hashes owner tokens deterministically", () => {
  const hash1 = hashOwnerToken("owner-a");
  const hash2 = hashOwnerToken("owner-a");
  const hash3 = hashOwnerToken("owner-b");

  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hash3);
  assert.equal(hash1.length, 64);
});

test("allows starting a new job when no duplicate exists", async () => {
  const prisma = {
    renderJob: {
      findFirst: async () => null,
    },
  } as const;

  const result = await shouldStartNewJob(prisma as any, {
    manifestHash: "manifest-a",
    ownerToken: "owner-a",
  });

  assert.equal(result.allowed, true);
});

test("blocks duplicate active jobs for the same manifest and owner", async () => {
  const prisma = {
    renderJob: {
      findFirst: async () => ({
        id: "job-1",
        state: "PARSING",
        createdAt: new Date("2026-06-25T00:00:00.000Z"),
        updatedAt: new Date("2026-06-25T00:00:00.000Z"),
      }),
    },
  } as const;

  const result = await shouldStartNewJob(prisma as any, {
    manifestHash: "manifest-a",
    ownerToken: "owner-a",
  });

  assert.equal(result.allowed, false);
  if (!result.allowed) {
    assert.equal(result.job.id, "job-1");
    assert.equal(result.job.state, "PARSING");
  }
});

test("allows restart when previous job is failed or interrupted", async () => {
  const prisma = {
    renderJob: {
      findFirst: async () => ({
        id: "job-2",
        state: "FAILED",
        createdAt: new Date("2026-06-25T00:00:00.000Z"),
        updatedAt: new Date("2026-06-25T00:00:00.000Z"),
      }),
    },
  } as const;

  const result = await shouldStartNewJob(prisma as any, {
    manifestHash: "manifest-a",
    ownerToken: "owner-a",
  });

  assert.equal(result.allowed, true);
});
