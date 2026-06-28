import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { applyCreatorGlossary, type CreatorGlossaryReplacement } from "./creator-glossary.js";

const execFileAsync = promisify(execFile);
const EXEC_OPTIONS = { maxBuffer: 20 * 1024 * 1024 };

export type TranscriptWord = {
  text: string;
  startSec: number;
  endSec: number;
  durationSec: number;
};

export type TranscriptSegment = {
  text: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  words: TranscriptWord[];
};

export type SourceVideoTranscript = {
  text: string;
  language: string | null;
  segments: TranscriptSegment[];
  words: TranscriptWord[];
  glossaryReplacements?: CreatorGlossaryReplacement[];
};

function normalizePythonBin(pythonBin?: string) {
  return (
    pythonBin?.trim() ||
    process.env.VIDEO_OPS_STT_PYTHON ||
    "/opt/homebrew/Caskroom/miniforge/base/envs/video-ops-py/bin/python"
  );
}

function normalizeModelId(modelId?: string) {
  return modelId?.trim() || process.env.VIDEO_OPS_STT_MODEL || "tiny";
}

function normalizeSegmentSentence(segment: any): TranscriptSegment {
  const words = Array.isArray(segment.tokens)
    ? segment.tokens.map((token: any) => ({
        text: String(token.text ?? "").trim(),
        startSec: Number(token.start ?? 0),
        endSec: Number(token.end ?? token.start ?? 0),
        durationSec: Number(token.duration ?? Math.max(0, Number(token.end ?? 0) - Number(token.start ?? 0))),
      }))
    : [];

  return {
    text: String(segment.text ?? "").trim(),
    startSec: Number(segment.start ?? 0),
    endSec: Number(segment.end ?? segment.start ?? 0),
    durationSec: Number(segment.duration ?? Math.max(0, Number(segment.end ?? 0) - Number(segment.start ?? 0))),
    words,
  };
}

function normalizeTranscriptJson(raw: any): SourceVideoTranscript {
  const sentenceSegments = Array.isArray(raw.sentences)
    ? raw.sentences.map(normalizeSegmentSentence)
    : Array.isArray(raw.segments)
      ? raw.segments.map((segment: Record<string, unknown>) => ({
          text: String(segment.text ?? "").trim(),
          startSec: Number(segment.start ?? 0),
          endSec: Number(segment.end ?? segment.start ?? 0),
          durationSec: Number(segment.duration ?? Math.max(0, Number(segment.end ?? 0) - Number(segment.start ?? 0))),
          words: Array.isArray(segment.tokens)
            ? segment.tokens.map((token: Record<string, unknown>) => ({
                text: String(token.text ?? "").trim(),
                startSec: Number(token.start ?? 0),
                endSec: Number(token.end ?? token.start ?? 0),
                durationSec: Number(
                  token.duration ?? Math.max(0, Number(token.end ?? 0) - Number(token.start ?? 0)),
                ),
              }))
            : [],
        }))
      : [];

  const words = sentenceSegments.flatMap((segment: TranscriptSegment) => segment.words);

  return {
    text: String(raw.text ?? "").trim(),
    language: typeof raw.language === "string" ? raw.language : null,
    segments: sentenceSegments,
    words,
  };
}

function applyGlossaryToTranscript(transcript: SourceVideoTranscript): SourceVideoTranscript {
  const transcriptPatch = applyCreatorGlossary(transcript.text);
  const segmentPatches = transcript.segments.map((segment) => ({
    ...segment,
    text: applyCreatorGlossary(segment.text).text,
    words: segment.words.map((word) => ({
      ...word,
      text: applyCreatorGlossary(word.text).text,
    })),
  }));

  return {
    ...transcript,
    text: transcriptPatch.text,
    segments: segmentPatches,
    words: segmentPatches.flatMap((segment) => segment.words),
    glossaryReplacements: transcriptPatch.replacements,
  };
}

async function ensureParentDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function transcribeSourceVideo(input: {
  videoPath: string;
  transcriptPath: string;
  wordsPath: string;
  pythonBin?: string;
  modelId?: string;
  verbose?: boolean;
  runner?: (
    args: Array<string>,
    options?: { maxBuffer?: number },
  ) => Promise<{ stdout: string; stderr?: string }>;
}) {
  const pythonBin = normalizePythonBin(input.pythonBin);
  const modelId = normalizeModelId(input.modelId);
  const run =
    input.runner ??
    ((args, options) =>
      execFileAsync(pythonBin, args, {
        maxBuffer: options?.maxBuffer ?? EXEC_OPTIONS.maxBuffer,
      }));
  const script = [
    "import json",
    "import whisper",
    "model = whisper.load_model(MODEL_ID)",
    "segments = model.transcribe(VIDEO_PATH, word_timestamps=True, verbose=VERBOSE)",
    "result = {'text': segments.get('text', ''), 'language': segments.get('language')}",
    "result['segments'] = []",
    "for segment in segments.get('segments', []):",
    "    result['segments'].append({",
    "        'text': segment.get('text', ''),",
    "        'start': float(segment.get('start', 0.0)),",
    "        'end': float(segment.get('end', 0.0)),",
    "        'duration': float(segment.get('end', 0.0) - segment.get('start', 0.0)),",
    "        'tokens': [{",
    "            'text': word.get('word', '').strip(),",
    "            'start': float(word.get('start', 0.0)),",
    "            'end': float(word.get('end', 0.0)),",
    "            'duration': float(word.get('end', 0.0) - word.get('start', 0.0)),",
    "        } for word in segment.get('words', [])]",
    "    })",
    "print(json.dumps(result, ensure_ascii=False))",
  ].join('\n');

  const { stdout } = await run(
    [
      "-c",
      `MODEL_ID=${JSON.stringify(modelId)};VIDEO_PATH=${JSON.stringify(input.videoPath)};VERBOSE=${input.verbose ? "True" : "False"}\n${script}`,
    ],
  );
  const normalizedStdout = stdout.trim();
  const jsonStart = normalizedStdout.lastIndexOf("\n{");
  const jsonPayload =
    jsonStart >= 0
      ? normalizedStdout.slice(jsonStart + 1)
      : normalizedStdout.startsWith("{")
        ? normalizedStdout
        : normalizedStdout.slice(normalizedStdout.indexOf("{"));

  const transcript = applyGlossaryToTranscript(normalizeTranscriptJson(JSON.parse(jsonPayload)));

  await ensureParentDirectory(input.transcriptPath);
  await ensureParentDirectory(input.wordsPath);
  await fs.writeFile(input.transcriptPath, JSON.stringify(transcript, null, 2), "utf8");
  await fs.writeFile(input.wordsPath, JSON.stringify(transcript.words, null, 2), "utf8");

  return transcript;
}

export async function attachTranscriptToSourceMetadata(input: {
  metadataPath: string;
  transcriptPath: string;
  wordsPath: string;
  transcript: SourceVideoTranscript;
}) {
  const raw = await fs.readFile(input.metadataPath, "utf8");
  const metadata = JSON.parse(raw);
  const next = {
    ...metadata,
    transcriptArtifacts: {
      transcriptPath: input.transcriptPath,
      wordsPath: input.wordsPath,
      segmentCount: input.transcript.segments.length,
      wordCount: input.transcript.words.length,
      textPreview: input.transcript.text.slice(0, 120),
      glossaryReplacementCount: input.transcript.glossaryReplacements?.length ?? 0,
    },
  };

  await ensureParentDirectory(input.metadataPath);
  await fs.writeFile(input.metadataPath, JSON.stringify(next, null, 2), "utf8");

  return next;
}
