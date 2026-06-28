import { promises as fs } from "node:fs";
import path from "node:path";

import type { SourceVideoTranscript, TranscriptSegment, TranscriptWord } from "./source-video-transcript.js";

export type RawSubtitleCue = {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
  source: "segment" | "word";
};

export type RawSubtitleTimeline = {
  language: string | null;
  cueSource: "segment" | "word";
  cueCount: number;
  cues: RawSubtitleCue[];
  srt: string;
  vtt: string;
};

function pad(value: number, size = 2) {
  return String(value).padStart(size, "0");
}

function formatSrtTimestamp(totalMs: number) {
  const safeMs = Math.max(0, Math.round(totalMs));
  const hours = Math.floor(safeMs / 3_600_000);
  const minutes = Math.floor((safeMs % 3_600_000) / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1_000);
  const milliseconds = safeMs % 1_000;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

function formatVttTimestamp(totalMs: number) {
  return formatSrtTimestamp(totalMs).replace(",", ".");
}

function normalizeCueText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function segmentToCue(segment: TranscriptSegment, index: number): RawSubtitleCue {
  return {
    index,
    startMs: Math.max(0, Math.round(segment.startSec * 1000)),
    endMs: Math.max(Math.round(segment.startSec * 1000), Math.round(segment.endSec * 1000)),
    text: normalizeCueText(segment.text),
    source: "segment",
  };
}

function wordToCue(word: TranscriptWord, index: number): RawSubtitleCue {
  return {
    index,
    startMs: Math.max(0, Math.round(word.startSec * 1000)),
    endMs: Math.max(Math.round(word.startSec * 1000), Math.round(word.endSec * 1000)),
    text: normalizeCueText(word.text),
    source: "word",
  };
}

function toSrt(cues: RawSubtitleCue[]) {
  return cues
    .map((cue) => `${cue.index}\n${formatSrtTimestamp(cue.startMs)} --> ${formatSrtTimestamp(cue.endMs)}\n${cue.text}`)
    .join("\n\n");
}

function toVtt(cues: RawSubtitleCue[]) {
  return ["WEBVTT", "", ...cues.map((cue) => `${cue.index}\n${formatVttTimestamp(cue.startMs)} --> ${formatVttTimestamp(cue.endMs)}\n${cue.text}`)].join(
    "\n\n",
  );
}

function ensureCueDuration(cue: RawSubtitleCue): RawSubtitleCue {
  if (cue.endMs > cue.startMs) {
    return cue;
  }

  return {
    ...cue,
    endMs: cue.startMs + 120,
  };
}

function buildFromSegments(transcript: SourceVideoTranscript) {
  return transcript.segments
    .map((segment, index) => segmentToCue(segment, index + 1))
    .filter((cue) => cue.text.length > 0)
    .map(ensureCueDuration);
}

function buildFromWords(transcript: SourceVideoTranscript) {
  return transcript.words
    .map((word, index) => wordToCue(word, index + 1))
    .filter((cue) => cue.text.length > 0)
    .map(ensureCueDuration);
}

async function ensureParentDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export function buildRawSubtitleTimeline(transcript: SourceVideoTranscript): RawSubtitleTimeline {
  const segmentCues = buildFromSegments(transcript);
  const wordCues = buildFromWords(transcript);
  const cues = segmentCues.length > 0 ? segmentCues : wordCues;
  const cueSource = segmentCues.length > 0 ? "segment" : "word";

  return {
    language: transcript.language,
    cueSource,
    cueCount: cues.length,
    cues,
    srt: toSrt(cues),
    vtt: toVtt(cues),
  };
}

export async function writeRawSubtitleTimeline(input: {
  transcript: SourceVideoTranscript;
  timelinePath: string;
  srtPath: string;
  vttPath: string;
}) {
  const timeline = buildRawSubtitleTimeline(input.transcript);
  await ensureParentDirectory(input.timelinePath);
  await ensureParentDirectory(input.srtPath);
  await ensureParentDirectory(input.vttPath);
  await fs.writeFile(input.timelinePath, JSON.stringify(timeline, null, 2), "utf8");
  await fs.writeFile(input.srtPath, timeline.srt, "utf8");
  await fs.writeFile(input.vttPath, timeline.vtt, "utf8");
  return timeline;
}

export async function attachSubtitleTimelineToSourceMetadata(input: {
  metadataPath: string;
  timelinePath: string;
  srtPath: string;
  vttPath: string;
  timeline: RawSubtitleTimeline;
}) {
  const raw = await fs.readFile(input.metadataPath, "utf8");
  const metadata = JSON.parse(raw);
  const next = {
    ...metadata,
    subtitleArtifacts: {
      timelinePath: input.timelinePath,
      srtPath: input.srtPath,
      vttPath: input.vttPath,
      cueCount: input.timeline.cueCount,
      cueSource: input.timeline.cueSource,
      language: input.timeline.language,
    },
  };

  await ensureParentDirectory(input.metadataPath);
  await fs.writeFile(input.metadataPath, JSON.stringify(next, null, 2), "utf8");
  return next;
}
