import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  attachSubtitleTimelineToSourceMetadata,
  buildRawSubtitleTimeline,
  writeRawSubtitleTimeline,
} from "../lib/raw-video/subtitle-timeline.js";
import type { SourceVideoTranscript } from "../lib/raw-video/source-video-transcript.js";

const transcript: SourceVideoTranscript = {
  text: "很多人不是不会用 AI，而是没有系统。",
  language: "zh",
  segments: [
    {
      text: "很多人不是不会用 AI，",
      startSec: 0,
      endSec: 1.4,
      durationSec: 1.4,
      words: [
        { text: "很多人", startSec: 0, endSec: 0.5, durationSec: 0.5 },
        { text: "不是", startSec: 0.5, endSec: 0.8, durationSec: 0.3 },
        { text: "不会用", startSec: 0.8, endSec: 1.1, durationSec: 0.3 },
        { text: "AI", startSec: 1.1, endSec: 1.4, durationSec: 0.3 },
      ],
    },
    {
      text: "而是没有系统。",
      startSec: 1.4,
      endSec: 2.6,
      durationSec: 1.2,
      words: [
        { text: "而是", startSec: 1.4, endSec: 1.8, durationSec: 0.4 },
        { text: "没有", startSec: 1.8, endSec: 2.2, durationSec: 0.4 },
        { text: "系统", startSec: 2.2, endSec: 2.6, durationSec: 0.4 },
      ],
    },
  ],
  words: [
    { text: "很多人", startSec: 0, endSec: 0.5, durationSec: 0.5 },
    { text: "不是", startSec: 0.5, endSec: 0.8, durationSec: 0.3 },
    { text: "不会用", startSec: 0.8, endSec: 1.1, durationSec: 0.3 },
    { text: "AI", startSec: 1.1, endSec: 1.4, durationSec: 0.3 },
    { text: "而是", startSec: 1.4, endSec: 1.8, durationSec: 0.4 },
    { text: "没有", startSec: 1.8, endSec: 2.2, durationSec: 0.4 },
    { text: "系统", startSec: 2.2, endSec: 2.6, durationSec: 0.4 },
  ],
};

test("buildRawSubtitleTimeline converts transcript segments into subtitle-ready cues", () => {
  const result = buildRawSubtitleTimeline(transcript);

  assert.equal(result.cueSource, "segment");
  assert.equal(result.cueCount, 2);
  assert.equal(result.cues[0]?.startMs, 0);
  assert.equal(result.cues[0]?.endMs, 1400);
  assert.equal(result.cues[1]?.startMs, 1400);
  assert.match(result.srt, /00:00:00,000 --> 00:00:01,400/);
  assert.match(result.vtt, /WEBVTT/);
});

test("writeRawSubtitleTimeline persists timeline json and subtitle files", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "video-ops-subtitle-timeline-"));
  const timelinePath = path.join(dir, "subtitle-timeline.json");
  const srtPath = path.join(dir, "captions.srt");
  const vttPath = path.join(dir, "captions.vtt");

  const result = await writeRawSubtitleTimeline({
    transcript,
    timelinePath,
    srtPath,
    vttPath,
  });

  assert.equal(result.cueCount, 2);
  assert.equal(JSON.parse(readFileSync(timelinePath, "utf8")).cueCount, 2);
  assert.match(readFileSync(srtPath, "utf8"), /很多人不是不会用 AI/);
  assert.match(readFileSync(vttPath, "utf8"), /WEBVTT/);
});

test("attachSubtitleTimelineToSourceMetadata persists subtitle artifact summary", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "video-ops-subtitle-meta-"));
  const metadataPath = path.join(dir, "source-video.json");
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(metadataPath, JSON.stringify({ id: "sv-1", jobId: "job-1" }, null, 2), "utf8"),
  );

  const timeline = buildRawSubtitleTimeline(transcript);
  const updated = await attachSubtitleTimelineToSourceMetadata({
    metadataPath,
    timelinePath: "output/jobs/job-1/transcripts/subtitle-timeline.json",
    srtPath: "output/jobs/job-1/subtitles/captions.srt",
    vttPath: "output/jobs/job-1/subtitles/captions.vtt",
    timeline,
  });

  const persisted = JSON.parse(readFileSync(metadataPath, "utf8"));
  assert.equal(updated.subtitleArtifacts.cueCount, 2);
  assert.equal(persisted.subtitleArtifacts.cueSource, "segment");
  assert.equal(persisted.subtitleArtifacts.timelinePath, "output/jobs/job-1/transcripts/subtitle-timeline.json");
});
