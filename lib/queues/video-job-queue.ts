import { Queue } from "bullmq";
import { redis } from "../redis";

export const VIDEO_JOB_QUEUE_NAME = "video-jobs";

export const videoJobQueue = new Queue(VIDEO_JOB_QUEUE_NAME, {
  connection: redis,
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

export async function closeVideoJobQueue() {
  await videoJobQueue.close();
}
