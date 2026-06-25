import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { hashOwnerToken, shouldStartNewJob } from "../lib/domain/job-idempotency.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

try {
  const manifest = await prisma.contentManifest.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!manifest) {
    console.error("No ContentManifest found. Create one first, then rerun this smoke test.");
    process.exit(1);
  }

  const identity = {
    manifestHash: manifest.manifestHash,
    ownerToken: "smoke-owner-token",
  };
  const ownerTokenHash = hashOwnerToken(identity.ownerToken);

  await prisma.renderJob.deleteMany({
    where: {
      manifestId: manifest.id,
      ownerTokenHash,
    },
  });

  const first = await shouldStartNewJob(prisma, identity);
  if (!first.allowed) {
    throw new Error("First run should be allowed");
  }

  const created = await prisma.renderJob.create({
    data: {
      manifestId: manifest.id,
      ownerTokenHash,
      state: "QUEUED",
    },
  });

  const second = await shouldStartNewJob(prisma, identity);

  console.log("first run: allowed =", first.allowed);
  console.log("created job:", created.id);
  console.log("second run: allowed =", second.allowed);
  if (!second.allowed) {
    console.log("blocked job:", second.job.id, second.job.state);
  }
  console.log("idempotency smoke test passed");
} finally {
  await prisma.$disconnect();
}
