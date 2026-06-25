import { Queue } from "bullmq";

export const VIDEO_JOB_QUEUE_NAME = "video-jobs";

export function createVideoJobQueue() {
  return new Queue(VIDEO_JOB_QUEUE_NAME, {
    connection: {
      host: process.env.REDIS_HOST ?? "127.0.0.1",
      port: Number(process.env.REDIS_PORT ?? 6379),
    },
    defaultJobOptions: {
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: false,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  });
}
