import { EventEmitter } from "node:events";

import type { JobState } from "../domain/job-state.js";

export type JobProgressPayload = {
  jobId: string;
  state: JobState;
  progress: number;
  step?: string;
  message?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
};

export type JobProgressListener = (payload: JobProgressPayload) => void;

export class JobProgressChannel {
  private readonly emitter = new EventEmitter();

  emit(payload: Omit<JobProgressPayload, "timestamp"> & { timestamp?: string }) {
    const normalized: JobProgressPayload = {
      ...payload,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    };

    this.emitter.emit(payload.jobId, normalized);
    this.emitter.emit("*", normalized);
    return normalized;
  }

  subscribe(jobId: string, listener: JobProgressListener) {
    this.emitter.on(jobId, listener);
    return () => this.unsubscribe(jobId, listener);
  }

  subscribeAll(listener: JobProgressListener) {
    this.emitter.on("*", listener);
    return () => this.unsubscribeAll(listener);
  }

  unsubscribe(jobId: string, listener: JobProgressListener) {
    this.emitter.off(jobId, listener);
  }

  unsubscribeAll(listener: JobProgressListener) {
    this.emitter.off("*", listener);
  }

  clear() {
    this.emitter.removeAllListeners();
  }
}

export function createJobProgressStream(
  channel = new JobProgressChannel(),
  jobId?: string,
) {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`: connected\n\n`));

      const listener = (payload: JobProgressPayload) => {
        if (jobId && payload.jobId !== jobId) return;
        controller.enqueue(encoder.encode(toServerSentEvent(payload)));
      };

      const unsubscribe = jobId
        ? channel.subscribe(jobId, listener)
        : channel.subscribeAll(listener);

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      };
    },
    cancel() {
      cleanup();
    },
  });

  return {
    stream,
    close() {
      cleanup();
    },
  };
}

export async function readJobProgressStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(decoder.decode(value, { stream: true }));
  }

  chunks.push(decoder.decode());
  reader.releaseLock();
  return chunks.join("");
}

export function toServerSentEvent(payload: JobProgressPayload) {
  return `event: job-progress\ndata: ${JSON.stringify(payload)}\n\n`;
}

export function createJobProgressPayload(
  input: Omit<JobProgressPayload, "timestamp"> & { timestamp?: string },
) {
  return {
    ...input,
    timestamp: input.timestamp ?? new Date().toISOString(),
  } satisfies JobProgressPayload;
}
