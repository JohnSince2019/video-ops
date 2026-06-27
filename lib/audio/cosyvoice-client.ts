import path from "node:path";

import type { ContentScene } from "../types/manifest.js";

export type TtsSceneInput = Pick<
  ContentScene,
  "id" | "scene_hash" | "narration" | "audio"
>;

export type GenerateTtsInput = {
  scene: TtsSceneInput;
  outputDir?: string;
  model?: string;
  referenceAudioPath?: string;
};

export type GenerateTtsResult = {
  sceneId: string;
  sceneHash: string;
  model: string;
  voice: string;
  text: string;
  audioPath: string;
  durationMs: number;
  format: "wav";
  cloneMode: "standard" | "zero_shot";
  referenceAudioPath?: string;
  providerMetadata?: import("../providers/provider-types.js").ProviderExecutionMetadata;
};

export type TtsRunner = (command: {
  pythonBin: string;
  model: string;
  voice: string;
  text: string;
  outputPath: string;
  referenceAudioPath?: string;
}) => Promise<{
  success: boolean;
  audioPath?: string;
  durationMs?: number;
  error?: string;
}>;

const DEFAULT_TTS_MODEL = "aufklarer/CosyVoice3-0.5B-MLX-4bit";
const DEFAULT_TTS_PYTHON = "python";
const DEFAULT_TTS_OUTPUT_DIR = "assets/audio";
const DEFAULT_TTS_REFERENCE_DIR = "assets/reference-audio";

function sanitizeSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "tts";
}

function estimateDurationMs(text: string) {
  const compact = text.replace(/\s+/g, "");
  const length = compact.length;
  const seconds = Math.max(2, Math.ceil(length / 4));
  return seconds * 1000;
}

export function buildTtsRequest(input: GenerateTtsInput) {
  const model = input.model ?? process.env.VIDEO_OPS_TTS_MODEL ?? DEFAULT_TTS_MODEL;
  const pythonBin = process.env.VIDEO_OPS_TTS_PYTHON ?? DEFAULT_TTS_PYTHON;
  const outputDir = input.outputDir ?? process.env.VIDEO_OPS_TTS_OUTPUT_DIR ?? DEFAULT_TTS_OUTPUT_DIR;
  const voice = input.scene.audio.tts_voice;
  const text = input.scene.narration.trim();
  const referenceRoot = process.env.VIDEO_OPS_TTS_REFERENCE_DIR ?? DEFAULT_TTS_REFERENCE_DIR;
  const inheritedReferenceAudioPath = input.scene.audio.reference_audio_path?.trim();
  const requestedReferenceAudioPath = input.referenceAudioPath?.trim() || inheritedReferenceAudioPath;
  const referenceAudioPath = requestedReferenceAudioPath
    ? path.isAbsolute(requestedReferenceAudioPath)
      ? requestedReferenceAudioPath
      : path.join(referenceRoot, requestedReferenceAudioPath)
    : undefined;
  const outputPath = path.join(
    outputDir,
    `${sanitizeSegment(input.scene.id)}-${sanitizeSegment(input.scene.scene_hash.slice(0, 12))}.wav`,
  );

  return {
    pythonBin,
    model,
    voice,
    text,
    outputPath,
    referenceAudioPath,
  };
}

export function normalizeTtsResult(
  input: GenerateTtsInput,
  request: ReturnType<typeof buildTtsRequest>,
  payload: {
    success: boolean;
    audioPath?: string;
    durationMs?: number;
    error?: string;
  },
): GenerateTtsResult {
  if (!payload.success) {
    throw new Error(payload.error || "Local TTS inference failed.");
  }

  if (!payload.audioPath?.trim()) {
    throw new Error("Local TTS inference returned no audio path.");
  }

  const durationMs = payload.durationMs ?? estimateDurationMs(request.text);
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("Local TTS inference returned an invalid duration.");
  }

  return {
    sceneId: input.scene.id,
    sceneHash: input.scene.scene_hash,
    model: request.model,
    voice: request.voice,
    text: request.text,
    audioPath: payload.audioPath,
    durationMs,
    format: "wav",
    cloneMode: request.referenceAudioPath ? "zero_shot" : "standard",
    referenceAudioPath: request.referenceAudioPath,
  };
}

export async function generateSpeechForScene(
  input: GenerateTtsInput,
  options: {
    runner?: TtsRunner;
  } = {},
) {
  const runner = options.runner;
  if (!runner) {
    throw new Error("No local TTS runner configured.");
  }

  const request = buildTtsRequest(input);
  const payload = await runner(request);
  return normalizeTtsResult(input, request, payload);
}

export async function generateClonedSpeechForScene(
  input: GenerateTtsInput,
  options: {
    runner?: TtsRunner;
  } = {},
) {
  if (!input.referenceAudioPath?.trim()) {
    throw new Error("Reference audio path is required for zero-shot voice cloning.");
  }

  return generateSpeechForScene(input, options);
}
