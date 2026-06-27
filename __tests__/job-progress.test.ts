import test from "node:test";
import assert from "node:assert/strict";

import {
  JobProgressChannel,
  createJobProgressPayload,
  createJobProgressStream,
  readJobProgressStream,
  toServerSentEvent,
} from "../lib/progress/job-progress.js";

test("normalizes progress payloads", () => {
  const payload = createJobProgressPayload({
    jobId: "job-1",
    state: "PARSING",
    progress: 25,
    step: "parse",
  });

  assert.equal(payload.jobId, "job-1");
  assert.equal(payload.state, "PARSING");
  assert.equal(payload.progress, 25);
  assert.equal(typeof payload.timestamp, "string");
});

test("subscribes and emits job-specific updates", () => {
  const channel = new JobProgressChannel();
  const events: string[] = [];

  const stop = channel.subscribe("job-1", (payload) => {
    events.push(`${payload.jobId}:${payload.state}:${payload.progress}`);
  });

  channel.emit({
    jobId: "job-1",
    state: "AI_PROCESSING",
    progress: 50,
    timestamp: "2026-06-25T00:00:00.000Z",
  });
  channel.emit({
    jobId: "job-2",
    state: "RENDERING",
    progress: 80,
    timestamp: "2026-06-25T00:00:01.000Z",
  });
  stop();

  assert.deepEqual(events, ["job-1:AI_PROCESSING:50"]);
});

test("subscribes to all progress updates", () => {
  const channel = new JobProgressChannel();
  const events: string[] = [];

  channel.subscribeAll((payload) => {
    events.push(payload.jobId);
  });

  channel.emit({
    jobId: "job-1",
    state: "PARSING",
    progress: 10,
    timestamp: "2026-06-25T00:00:00.000Z",
  });
  channel.emit({
    jobId: "job-2",
    state: "COMPLETED",
    progress: 100,
    timestamp: "2026-06-25T00:00:01.000Z",
  });

  assert.deepEqual(events, ["job-1", "job-2"]);
});

test("formats server sent event payloads", () => {
  const event = toServerSentEvent({
    jobId: "job-1",
    state: "COMPLETED",
    progress: 100,
    message: "任务已完成，当前成片来自正式主链路，可以进入人工验收。",
    timestamp: "2026-06-25T00:00:00.000Z",
  });

  assert.match(event, /^event: job-progress\n/);
  assert.match(event, /"jobId":"job-1"/);
  assert.match(event, /"state":"COMPLETED"/);
  assert.match(event, /正式主链路/);
});

test("streams progress for a single job", async () => {
  const channel = new JobProgressChannel();
  const { stream, close } = createJobProgressStream(channel, "job-1");

  channel.emit({
    jobId: "job-1",
    state: "PARSING",
    progress: 10,
    timestamp: "2026-06-25T00:00:00.000Z",
  });
  channel.emit({
    jobId: "job-2",
    state: "FAILED",
    progress: 90,
    timestamp: "2026-06-25T00:00:01.000Z",
  });

  close();
  const text = await readJobProgressStream(stream);
  assert.match(text, /: connected/);
  assert.match(text, /event: job-progress/);
  assert.match(text, /"jobId":"job-1"/);
  assert.doesNotMatch(text, /"jobId":"job-2"/);
});
