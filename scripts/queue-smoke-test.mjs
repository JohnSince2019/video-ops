import { Queue } from "bullmq";
import IORedis from "ioredis";

const connectionString = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const redis = new IORedis(connectionString, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const queue = new Queue("video-jobs-smoke", { connection: redis });

try {
  const job = await queue.add("smoke", { ok: true }, { removeOnComplete: true });
  await job.remove();
  console.log("queue smoke test passed");
} finally {
  await queue.close();
  await redis.quit();
}
