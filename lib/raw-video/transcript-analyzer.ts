import { promises as fs } from "node:fs";
import path from "node:path";

import type { ProviderExecutionMetadata } from "../providers/provider-types.js";
import type { CreatorGlossaryReplacement } from "./creator-glossary.js";
import type { RawSubtitleTimeline } from "./subtitle-timeline.js";
import type { SourceVideoTranscript } from "./source-video-transcript.js";

export type TranscriptAnalysisChapter = {
  title: string;
  startMs: number;
  endMs: number;
  summary: string;
};

export type TranscriptAnalysisQuote = {
  text: string;
  startMs: number;
  endMs: number;
  reason: string;
};

export type TranscriptAnalysisRemovalSuggestion = {
  startMs: number;
  endMs: number;
  text: string;
  reason: string;
  confidence: "low" | "medium" | "high";
};

export type TranscriptAnalysis = {
  topic: string;
  summary: string;
  chapters: TranscriptAnalysisChapter[];
  standoutQuotes: TranscriptAnalysisQuote[];
  removalSuggestions: TranscriptAnalysisRemovalSuggestion[];
  glossaryReplacements: CreatorGlossaryReplacement[];
  providerMetadata: ProviderExecutionMetadata;
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function splitSentences(text: string) {
  return normalizeText(text)
    .split(/(?<=[。！？!?])/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildTopic(transcript: SourceVideoTranscript) {
  const text = normalizeText(transcript.text);
  if (!text) {
    return "未识别主题";
  }

  const firstSentence = splitSentences(text)[0] ?? text;
  return firstSentence.slice(0, 30);
}

function buildSummary(transcript: SourceVideoTranscript) {
  const text = normalizeText(transcript.text);
  if (!text) {
    return "当前转写没有提取到可用摘要。";
  }

  const sentences = splitSentences(text);
  return sentences.slice(0, 2).join(" ").slice(0, 160);
}

function buildChapters(transcript: SourceVideoTranscript, timeline: RawSubtitleTimeline): TranscriptAnalysisChapter[] {
  const cues = timeline.cues;
  if (!cues.length) {
    return [];
  }

  const chapterSize = Math.max(1, Math.ceil(cues.length / 3));
  const chapters: TranscriptAnalysisChapter[] = [];
  for (let index = 0; index < cues.length; index += chapterSize) {
    const chunk = cues.slice(index, index + chapterSize);
    const text = normalizeText(chunk.map((item) => item.text).join(" "));
    if (!text) {
      continue;
    }

    chapters.push({
      title: `章节 ${chapters.length + 1}`,
      startMs: chunk[0]!.startMs,
      endMs: chunk[chunk.length - 1]!.endMs,
      summary: text.slice(0, 120),
    });
  }

  if (chapters.length > 0) {
    return chapters;
  }

  return transcript.segments.slice(0, 3).map((segment, index) => ({
    title: `章节 ${index + 1}`,
    startMs: Math.round(segment.startSec * 1000),
    endMs: Math.round(segment.endSec * 1000),
    summary: normalizeText(segment.text).slice(0, 120),
  }));
}

function buildStandoutQuotes(timeline: RawSubtitleTimeline): TranscriptAnalysisQuote[] {
  return timeline.cues
    .filter((cue) => cue.text.length >= 10)
    .slice(0, 3)
    .map((cue) => ({
      text: cue.text,
      startMs: cue.startMs,
      endMs: cue.endMs,
      reason: "这段表达完整，适合做章节金句或封面文案候选。",
    }));
}

function buildRemovalSuggestions(transcript: SourceVideoTranscript): TranscriptAnalysisRemovalSuggestion[] {
  return transcript.segments
    .filter((segment) => {
      const text = normalizeText(segment.text);
      return text.length > 0 && text.length <= 8;
    })
    .slice(0, 3)
    .map((segment) => ({
      startMs: Math.round(segment.startSec * 1000),
      endMs: Math.round(segment.endSec * 1000),
      text: normalizeText(segment.text),
      reason: "这段内容较短，可能更像口头停顿、重复衔接或可压缩表达，建议进入后续删减审查。",
      confidence: "medium" as const,
    }));
}

async function ensureParentDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export function analyzeTranscript(input: {
  transcript: SourceVideoTranscript;
  subtitleTimeline: RawSubtitleTimeline;
}): TranscriptAnalysis {
  return {
    topic: buildTopic(input.transcript),
    summary: buildSummary(input.transcript),
    chapters: buildChapters(input.transcript, input.subtitleTimeline),
    standoutQuotes: buildStandoutQuotes(input.subtitleTimeline),
    removalSuggestions: buildRemovalSuggestions(input.transcript),
    glossaryReplacements: input.transcript.glossaryReplacements ?? [],
    providerMetadata: {
      stage: "analysis",
      provider: "raw-video-heuristic-analyzer",
      mode: "primary",
    },
  };
}

export async function writeTranscriptAnalysis(input: {
  transcript: SourceVideoTranscript;
  subtitleTimeline: RawSubtitleTimeline;
  analysisPath: string;
}) {
  const analysis = analyzeTranscript({
    transcript: input.transcript,
    subtitleTimeline: input.subtitleTimeline,
  });
  await ensureParentDirectory(input.analysisPath);
  await fs.writeFile(input.analysisPath, JSON.stringify(analysis, null, 2), "utf8");
  return analysis;
}

export async function attachTranscriptAnalysisToSourceMetadata(input: {
  metadataPath: string;
  analysisPath: string;
  analysis: TranscriptAnalysis;
}) {
  const raw = await fs.readFile(input.metadataPath, "utf8");
  const metadata = JSON.parse(raw);
  const next = {
    ...metadata,
    transcriptAnalysis: {
      analysisPath: input.analysisPath,
      topic: input.analysis.topic,
      chapterCount: input.analysis.chapters.length,
      standoutQuoteCount: input.analysis.standoutQuotes.length,
      removalSuggestionCount: input.analysis.removalSuggestions.length,
      glossaryReplacementCount: input.analysis.glossaryReplacements.length,
      provider: input.analysis.providerMetadata.provider,
    },
  };

  await ensureParentDirectory(input.metadataPath);
  await fs.writeFile(input.metadataPath, JSON.stringify(next, null, 2), "utf8");
  return next;
}
