import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

try {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  console.log("prisma smoke test passed");
} finally {
  await prisma.$disconnect();
}
