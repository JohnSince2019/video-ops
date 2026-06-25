import crypto from "node:crypto";

import type { PrismaClient, RenderJob } from "@prisma/client";

export type JobIdentity = {
  manifestHash: string;
  ownerToken: string;
};

export type JobStartGuardResult =
  | { allowed: true; ownerTokenHash: string }
  | { allowed: false; ownerTokenHash: string; job: Pick<RenderJob, "id" | "state" | "createdAt" | "updatedAt"> };

export function hashOwnerToken(ownerToken: string) {
  return crypto.createHash("sha256").update(ownerToken).digest("hex");
}

export async function findExistingJobByIdentity(
  prisma: PrismaClient,
  identity: JobIdentity,
) {
  const ownerTokenHash = hashOwnerToken(identity.ownerToken);
  const job = await prisma.renderJob.findFirst({
    where: {
      ownerTokenHash,
      manifest: {
        manifestHash: identity.manifestHash,
      },
    },
    select: {
      id: true,
      state: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return { ownerTokenHash, job };
}

export async function shouldStartNewJob(
  prisma: PrismaClient,
  identity: JobIdentity,
): Promise<JobStartGuardResult> {
  const { ownerTokenHash, job } = await findExistingJobByIdentity(prisma, identity);

  if (job && job.state !== "FAILED" && job.state !== "INTERRUPTED") {
    return { allowed: false, ownerTokenHash, job };
  }

  return { allowed: true, ownerTokenHash };
}
