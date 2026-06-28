import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { attachTranscriptToSourceMetadata, transcribeSourceVideo } from "../lib/raw-video/source-video-transcript.js";

test("transcribeSourceVideo normalizes transcript and writes transcript.json plus words.json", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "video-ops-transcript-"));
  const transcriptPath = path.join(dir, "transcript.json");
  const wordsPath = path.join(dir, "words.json");

  const transcript = await transcribeSourceVideo({
    videoPath: "/tmp/fake-video.mp4",
    transcriptPath,
    wordsPath,
    runner: async () => ({
      stdout: JSON.stringify({
        text: "jon 在 content ops 里说这是第一句 这是第二句，交给 viedo-ops",
        language: "zh",
        segments: [
          {
            text: "jon 在 content ops 里说这是第一句",
            start: 0,
            end: 1.2,
            duration: 1.2,
            tokens: [
              { text: "jon", start: 0, end: 0.2, duration: 0.2 },
              { text: "content ops", start: 0.2, end: 0.7, duration: 0.5 },
              { text: "第一句", start: 0.7, end: 1.2, duration: 0.5 },
            ],
          },
          {
            text: "这是第二句，交给 viedo-ops",
            start: 1.2,
            end: 2.5,
            duration: 1.3,
            tokens: [
              { text: "这是", start: 1.2, end: 1.6, duration: 0.4 },
              { text: "第二句", start: 1.6, end: 2.1, duration: 0.5 },
              { text: "viedo-ops", start: 2.1, end: 2.5, duration: 0.4 },
            ],
          },
        ],
      }),
    }),
  });

  assert.equal(transcript.language, "zh");
  assert.equal(transcript.segments.length, 2);
  assert.equal(transcript.words.length, 6);
  assert.equal(transcript.text.includes("John"), true);
  assert.equal(transcript.text.includes("ContentOps"), true);
  assert.equal(transcript.text.includes("video-ops"), true);
  assert.equal((transcript.glossaryReplacements?.length ?? 0) >= 3, true);
  assert.equal(JSON.parse(readFileSync(transcriptPath, "utf8")).segments.length, 2);
  assert.equal(JSON.parse(readFileSync(wordsPath, "utf8")).length, 6);
});

test("attachTranscriptToSourceMetadata persists transcript artifact summary", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "video-ops-transcript-meta-"));
  const metadataPath = path.join(dir, "source-video.json");
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(metadataPath, JSON.stringify({ id: "sv-1", jobId: "job-1" }, null, 2), "utf8"),
  );

  const updated = await attachTranscriptToSourceMetadata({
    metadataPath,
    transcriptPath: "output/jobs/job-1/transcripts/transcript.json",
    wordsPath: "output/jobs/job-1/transcripts/words.json",
    transcript: {
      text: "这是第一句 这是第二句",
      language: "zh",
      segments: [
        { text: "这是第一句", startSec: 0, endSec: 1.2, durationSec: 1.2, words: [] },
        { text: "这是第二句", startSec: 1.2, endSec: 2.5, durationSec: 1.3, words: [] },
      ],
      words: [
        { text: "这是", startSec: 0, endSec: 0.4, durationSec: 0.4 },
        { text: "第一句", startSec: 0.4, endSec: 1.2, durationSec: 0.8 },
      ],
      glossaryReplacements: [{ from: "jon", to: "John" }],
    },
  });

  const persisted = JSON.parse(readFileSync(metadataPath, "utf8"));
  assert.equal(updated.transcriptArtifacts.segmentCount, 2);
  assert.equal(updated.transcriptArtifacts.wordCount, 2);
  assert.equal(updated.transcriptArtifacts.glossaryReplacementCount, 1);
  assert.equal(persisted.transcriptArtifacts.transcriptPath, "output/jobs/job-1/transcripts/transcript.json");
});
