import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  analyzeTranscript,
  attachTranscriptAnalysisToSourceMetadata,
  writeTranscriptAnalysis,
} from "../lib/raw-video/transcript-analyzer.js";
import type { RawSubtitleTimeline } from "../lib/raw-video/subtitle-timeline.js";
import type { SourceVideoTranscript } from "../lib/raw-video/source-video-transcript.js";

const transcript: SourceVideoTranscript = {
  text: "你不是缺 AI 工具，你是缺一套高输出操作系统。白天工作积累的素材，本来就可以沉淀成内容资产。",
  language: "zh",
  segments: [
    {
      text: "你不是缺 AI 工具，",
      startSec: 0,
      endSec: 1.1,
      durationSec: 1.1,
      words: [],
    },
    {
      text: "你是缺一套高输出操作系统。",
      startSec: 1.1,
      endSec: 2.5,
      durationSec: 1.4,
      words: [],
    },
    {
      text: "白天工作积累的素材，本来就可以沉淀成内容资产。",
      startSec: 2.5,
      endSec: 4.9,
      durationSec: 2.4,
      words: [],
    },
  ],
  words: [],
  glossaryReplacements: [
    { from: "content ops", to: "ContentOps" },
    { from: "viedo-ops", to: "video-ops" },
  ],
};

const subtitleTimeline: RawSubtitleTimeline = {
  language: "zh",
  cueSource: "segment",
  cueCount: 3,
  cues: [
    { index: 1, startMs: 0, endMs: 1100, text: "你不是缺 AI 工具，", source: "segment" },
    { index: 2, startMs: 1100, endMs: 2500, text: "你是缺一套高输出操作系统。", source: "segment" },
    { index: 3, startMs: 2500, endMs: 4900, text: "白天工作积累的素材，本来就可以沉淀成内容资产。", source: "segment" },
  ],
  srt: "",
  vtt: "",
};

test("analyzeTranscript derives topic, chapters, quotes, and removal suggestions", () => {
  const result = analyzeTranscript({ transcript, subtitleTimeline });

  assert.equal(typeof result.topic, "string");
  assert.equal(result.chapters.length > 0, true);
  assert.equal(result.standoutQuotes.length > 0, true);
  assert.equal(Array.isArray(result.removalSuggestions), true);
  assert.equal(result.glossaryReplacements.length, 2);
  assert.equal(result.providerMetadata.provider, "raw-video-heuristic-analyzer");
});

test("writeTranscriptAnalysis persists transcript-analysis.json", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "video-ops-transcript-analysis-"));
  const analysisPath = path.join(dir, "transcript-analysis.json");

  const result = await writeTranscriptAnalysis({
    transcript,
    subtitleTimeline,
    analysisPath,
  });

  assert.equal(result.chapters.length > 0, true);
  assert.equal(JSON.parse(readFileSync(analysisPath, "utf8")).providerMetadata.provider, "raw-video-heuristic-analyzer");
});

test("attachTranscriptAnalysisToSourceMetadata persists analysis summary", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "video-ops-analysis-meta-"));
  const metadataPath = path.join(dir, "source-video.json");
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(metadataPath, JSON.stringify({ id: "sv-1", jobId: "job-1" }, null, 2), "utf8"),
  );

  const analysis = analyzeTranscript({ transcript, subtitleTimeline });
  const updated = await attachTranscriptAnalysisToSourceMetadata({
    metadataPath,
    analysisPath: "output/jobs/job-1/analysis/transcript-analysis.json",
    analysis,
  });

  const persisted = JSON.parse(readFileSync(metadataPath, "utf8"));
  assert.equal(updated.transcriptAnalysis.provider, "raw-video-heuristic-analyzer");
  assert.equal(persisted.transcriptAnalysis.chapterCount, analysis.chapters.length);
  assert.equal(persisted.transcriptAnalysis.glossaryReplacementCount, 2);
  assert.equal(persisted.transcriptAnalysis.analysisPath, "output/jobs/job-1/analysis/transcript-analysis.json");
});
