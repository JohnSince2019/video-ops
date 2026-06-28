import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClipReviewCards,
  createEmptyRawVideoEdl,
  validateRawVideoEdlShape,
  validateRawVideoEdlRules,
} from "../lib/raw-video/edl-schema.js";

test("createEmptyRawVideoEdl builds a minimum reusable EDL contract", () => {
  const edl = createEmptyRawVideoEdl({
    jobId: "job-raw-001",
    sourceVideoId: "job-raw-001-source-video",
  });

  assert.equal(edl.version, "raw-video-edl-v1");
  assert.equal(edl.jobId, "job-raw-001");
  assert.equal(edl.sourceVideoId, "job-raw-001-source-video");
  assert.equal(Array.isArray(edl.clips), true);
  assert.equal(Array.isArray(edl.overlays), true);
  assert.equal(Array.isArray(edl.captions), true);
  assert.equal(Array.isArray(edl.chapters), true);
});

test("validateRawVideoEdlShape accepts valid schema and rejects invalid core fields", () => {
  const edl = createEmptyRawVideoEdl({
    jobId: "job-raw-001",
    sourceVideoId: "job-raw-001-source-video",
  });

  assert.equal(validateRawVideoEdlShape(edl), true);

  assert.throws(
    () =>
      validateRawVideoEdlShape({
        ...edl,
        version: "unknown" as never,
      }),
    /Invalid EDL version/,
  );

  assert.throws(
    () =>
      validateRawVideoEdlShape({
        ...edl,
        jobId: "",
      }),
    /jobId is required/,
  );
});

test("validateRawVideoEdlRules rejects negative timing, overlaps, out-of-range segments, and empty text", () => {
  const edl = createEmptyRawVideoEdl({
    jobId: "job-raw-001",
    sourceVideoId: "job-raw-001-source-video",
  });

  edl.totalDurationMs = 5000;
  edl.clips = [
    {
      clipId: "clip-1",
      sourceVideoId: edl.sourceVideoId,
      startMs: 0,
      endMs: 2000,
      durationMs: 2000,
      transcriptText: "第一段",
    },
    {
      clipId: "clip-2",
      sourceVideoId: edl.sourceVideoId,
      startMs: 2000,
      endMs: 5000,
      durationMs: 3000,
      transcriptText: "第二段",
    },
  ];
  edl.captions = [{ captionId: "cap-1", startMs: 0, endMs: 1000, text: "字幕一" }];
  edl.overlays = [{ overlayId: "ov-1", type: "title_bar", startMs: 0, endMs: 600, text: "标题条" }];
  edl.chapters = [{ chapterId: "ch-1", title: "章节一", startMs: 0, endMs: 5000, summary: "概览" }];

  assert.equal(validateRawVideoEdlRules(edl), true);

  assert.throws(
    () =>
      validateRawVideoEdlRules({
        ...edl,
        clips: [{ ...edl.clips[0]!, startMs: -1 }],
      }),
    /negative timing/,
  );

  assert.throws(
    () =>
      validateRawVideoEdlRules({
        ...edl,
        clips: [
          edl.clips[0]!,
          { ...edl.clips[1]!, startMs: 1500, durationMs: 3500 },
        ],
      }),
    /overlap/,
  );

  assert.throws(
    () =>
      validateRawVideoEdlRules({
        ...edl,
        clips: [{ ...edl.clips[0]!, endMs: 6000, durationMs: 6000 }],
      }),
    /exceeds total duration/,
  );

  assert.throws(
    () =>
      validateRawVideoEdlRules({
        ...edl,
        captions: [{ captionId: "cap-x", startMs: 0, endMs: 1000, text: " " }],
      }),
    /missing text/,
  );
});

test("buildClipReviewCards exposes keep/remove/restore review data for later UI and clean edit flows", () => {
  const edl = createEmptyRawVideoEdl({
    jobId: "job-raw-001",
    sourceVideoId: "job-raw-001-source-video",
  });

  edl.totalDurationMs = 5000;
  edl.clips = [
    {
      clipId: "clip-1",
      sourceVideoId: edl.sourceVideoId,
      startMs: 0,
      endMs: 2000,
      durationMs: 2000,
      transcriptText: "第一段",
      reviewState: "kept",
      reviewReason: "保留主观点。",
    },
    {
      clipId: "clip-2",
      sourceVideoId: edl.sourceVideoId,
      startMs: 2000,
      endMs: 3000,
      durationMs: 1000,
      transcriptText: "第二段",
      removalCandidate: true,
    },
    {
      clipId: "clip-3",
      sourceVideoId: edl.sourceVideoId,
      startMs: 3000,
      endMs: 5000,
      durationMs: 2000,
      transcriptText: "第三段",
      reviewState: "restored",
      reviewReason: "恢复误删片段。",
    },
  ];

  const cards = buildClipReviewCards(edl);
  assert.equal(cards.length, 3);
  assert.equal(cards[0]?.reviewState, "kept");
  assert.equal(cards[1]?.reviewState, "removed");
  assert.equal(cards[1]?.reviewReason.includes("可删减候选"), true);
  assert.equal(cards[2]?.reviewState, "restored");
});
