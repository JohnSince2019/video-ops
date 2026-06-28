import type { PrismaClient } from "@prisma/client";

import type { RecoverInterruptedJobsStore } from "./interrupted-job-recovery.js";

export function createJobRecoveryStore(prisma: PrismaClient): RecoverInterruptedJobsStore {
  return {
    async findInterruptedJobs() {
      return prisma.renderJob.findMany({
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
      });
    },
    async markQueued(jobId) {
      await prisma.renderJob.update({
        where: {
          id: jobId,
        },
        data: {
          state: "QUEUED",
        },
      });
    },
  };
}
