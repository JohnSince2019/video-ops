import assert from "node:assert/strict";
import test from "node:test";

import { buildJobDetailView, buildJobListView } from "../lib/ui/job-dashboard.js";

test("task list normalization exposes state, platform, profile, progress, and updated time", () => {
  const list = buildJobListView([
    {
      id: "job-001",
      title: "AI 效率视频",
      state: "AI_PROCESSING",
      platform: "douyin",
      renderProfile: "standard",
      updatedAt: "2026-06-27T02:10:00.000Z",
      progress: 42,
    },
  ]);

  assert.equal(list[0]?.title, "AI 效率视频");
  assert.equal(list[0]?.state, "AI_PROCESSING");
  assert.equal(list[0]?.platform, "douyin");
  assert.equal(list[0]?.renderProfile, "standard");
  assert.equal(list[0]?.progressLabel, "42%");
  assert.equal(list[0]?.updatedLabel, "2026-06-27 02:10");
});

test("task detail output includes step, progress, errors, checkpoint, and outputs", () => {
  const detail = buildJobDetailView({
    id: "job-002",
    title: "副业视频任务",
    state: "FAILED",
    platform: "xiaohongshu",
    renderProfile: "high_quality",
    updatedAt: "2026-06-27T03:00:00.000Z",
    createdAt: "2026-06-27T02:00:00.000Z",
    progress: 73,
    currentStep: "tts_generation",
    lastCheckpoint: { step: "image_generation", scene: 3 },
    errors: [{ stepName: "tts_generation", errorMessage: "cosyvoice timeout", retryCount: 2 }],
    outputs: [{ kind: "cover", path: "output/cover.png" }],
  });

  assert.equal(detail.state, "FAILED");
  assert.equal(detail.progress, 73);
  assert.equal(detail.currentStep, "tts_generation");
  assert.equal(detail.errorSummary[0], "tts_generation: cosyvoice timeout (retry 2)");
  assert.equal(detail.outputsSummary[0], "cover: output/cover.png");
  assert.match(detail.checkpointSummary, /image_generation/);
});

test("unknown state and missing fields fall back to safe display values", () => {
  const list = buildJobListView([
    {
      id: "job-003",
      state: "SOMETHING_NEW",
    },
  ]);
  const detail = buildJobDetailView({
    id: "job-003",
    state: "SOMETHING_NEW",
  });

  assert.equal(list[0]?.title, "Untitled Job 1");
  assert.equal(list[0]?.state, "UNKNOWN");
  assert.equal(list[0]?.platform, "unknown-platform");
  assert.equal(list[0]?.renderProfile, "unknown-profile");
  assert.equal(detail.state, "UNKNOWN");
  assert.equal(detail.currentStep, "No active step");
  assert.equal(detail.errorSummary[0], "No errors recorded.");
  assert.equal(detail.outputsSummary[0], "No output bundle available yet.");
});
