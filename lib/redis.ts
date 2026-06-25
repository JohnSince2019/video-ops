import IORedis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis?: IORedis;
};

const connectionString = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

export const redis =
  globalForRedis.redis ??
  new IORedis(connectionString, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
