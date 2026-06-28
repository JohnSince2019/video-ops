import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePublishReadiness } from "../lib/ui/publish-readiness.js";

test("complete publish package is marked ready", () => {
  const result = evaluatePublishReadiness({
    id: "job-ready",
    state: "COMPLETED",
    qualitySummary: {
      audioPresence: true,
      subtitleStatus: "generated",
      fallbackStatus: "primary",
      complianceStatus: "allowed",
    },
    outputs: [
      { kind: "video", path: "output/video.mp4" },
      { kind: "cover", path: "output/cover.png" },
      { kind: "metadata", path: "output/metadata.json" },
      { kind: "subtitle_srt", path: "output/captions.srt" },
    ],
  });

  assert.equal(result.ready, true);
  assert.equal(result.level, "ready");
  assert.match(result.status, /具备发布条件/);
});

test("missing subtitle blocks publish readiness and explains the missing asset", () => {
  const result = evaluatePublishReadiness({
    id: "job-no-subtitle",
    state: "COMPLETED",
    qualitySummary: {
      audioPresence: true,
      subtitleStatus: "missing",
      fallbackStatus: "primary",
      complianceStatus: "allowed",
    },
    outputs: [
      { kind: "video", path: "output/video.mp4" },
      { kind: "cover", path: "output/cover.png" },
      { kind: "metadata", path: "output/metadata.json" },
    ],
  });

  assert.equal(result.ready, false);
  assert.equal(result.level, "blocked");
  assert.deepEqual(result.missingItems, ["字幕"]);
  assert.match(result.reason, /缺少：字幕/);
});

test("missing metadata or cover are treated as incomplete delivery package", () => {
  const result = evaluatePublishReadiness({
    id: "job-no-metadata",
    state: "COMPLETED",
    qualitySummary: {
      audioPresence: true,
      subtitleStatus: "generated",
      fallbackStatus: "primary",
      complianceStatus: "allowed",
    },
    outputs: [
      { kind: "video", path: "output/video.mp4" },
      { kind: "subtitle_vtt", path: "output/captions.vtt" },
    ],
  });

  assert.equal(result.ready, false);
  assert.equal(result.level, "blocked");
  assert.deepEqual(result.missingItems, ["封面", "元数据"]);
});

test("fallback package is publishable but cautious", () => {
  const result = evaluatePublishReadiness({
    id: "job-fallback",
    state: "COMPLETED",
    qualitySummary: {
      audioPresence: true,
      subtitleStatus: "generated",
      fallbackStatus: "fallback",
      fallbackReason: "ffmpeg render failed",
      complianceStatus: "allowed",
    },
    outputs: [
      { kind: "video", path: "output/video.mp4" },
      { kind: "cover", path: "output/cover.png" },
      { kind: "metadata", path: "output/metadata.json" },
      { kind: "subtitle_srt", path: "output/captions.srt" },
    ],
  });

  assert.equal(result.ready, true);
  assert.equal(result.level, "cautious");
  assert.match(result.status, /建议谨慎/);
});

test("compliance blocked package cannot publish even when files exist", () => {
  const result = evaluatePublishReadiness({
    id: "job-compliance-blocked",
    state: "COMPLETED",
    qualitySummary: {
      audioPresence: true,
      subtitleStatus: "generated",
      fallbackStatus: "primary",
      complianceStatus: "blocked",
      complianceViolations: 2,
    },
    outputs: [
      { kind: "video", path: "output/video.mp4" },
      { kind: "cover", path: "output/cover.png" },
      { kind: "metadata", path: "output/metadata.json" },
      { kind: "subtitle_vtt", path: "output/captions.vtt" },
    ],
  });

  assert.equal(result.ready, false);
  assert.equal(result.level, "blocked");
  assert.match(result.reason, /合规检查没有通过/);
});
