import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  CUSTOM_VOICE_MODE,
  getVoicePreset,
  isCustomVoiceMode,
  type VoiceMode,
  type VoicePresetId,
} from "./voice-presets.js";
import { buildCustomVoiceReferenceAbsolutePath } from "./custom-voice-reference.js";

const execFileAsync = promisify(execFile);
const EXEC_OPTIONS = { maxBuffer: 10 * 1024 * 1024 };
const PREVIEW_DIR = path.join(process.cwd(), "tmp", "voice-previews");

const PREVIEW_TEXT =
  "你好，我是 Atlas。这个试听片段用于确认视频解说的声音风格、清晰度和节奏。";

type VoicePreviewProfile = {
  systemVoice: string;
  rate: number;
};

const VOICE_PREVIEW_PROFILES: Record<VoicePresetId, VoicePreviewProfile> = {
  male_coach_deep: {
    systemVoice: "Reed (Chinese (China mainland))",
    rate: 175,
  },
  male_clear_teacher: {
    systemVoice: "Eddy (Chinese (China mainland))",
    rate: 195,
  },
  female_warm_narrator: {
    systemVoice: "Tingting",
    rate: 170,
  },
  female_energetic_creator: {
    systemVoice: "Flo (Chinese (China mainland))",
    rate: 210,
  },
  male_storytelling_soft: {
    systemVoice: "Grandpa (Chinese (China mainland))",
    rate: 160,
  },
};

function buildFallbackWav(durationMs: number, frequency: number) {
  const sampleRate = 16000;
  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const durationSec = Math.max(1, durationMs / 1000);
  const frameCount = Math.floor(sampleRate * durationSec);
  const dataSize = frameCount * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < frameCount; i += 1) {
    const amplitude = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.12;
    const sample = Math.max(-1, Math.min(1, amplitude));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }

  return buffer;
}

function sanitizeVoiceMode(voiceMode: VoiceMode) {
  return voiceMode.replace(/[^a-z0-9_-]+/gi, "-");
}

async function ensurePreviewDir() {
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function buildSystemPreview(voiceMode: VoicePresetId, outputPath: string) {
  const previewProfile = VOICE_PREVIEW_PROFILES[voiceMode];
  const tempAiffPath = outputPath.replace(/\.wav$/i, ".aiff");

  await execFileAsync("say", [
    "-v",
    previewProfile.systemVoice,
    "-r",
    String(previewProfile.rate),
    "-o",
    tempAiffPath,
    PREVIEW_TEXT,
  ], EXEC_OPTIONS);

  await execFileAsync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-i",
    tempAiffPath,
    outputPath,
  ], EXEC_OPTIONS);

  await fs.rm(tempAiffPath, { force: true });
}

async function buildFallbackPreview(voiceMode: VoiceMode, outputPath: string) {
  const presetOffsets: Record<string, number> = {
    male_coach_deep: 280,
    male_clear_teacher: 340,
    female_warm_narrator: 420,
    female_energetic_creator: 520,
    male_storytelling_soft: 240,
    [CUSTOM_VOICE_MODE]: 380,
  };

  const frequency = presetOffsets[voiceMode] ?? 360;
  await fs.writeFile(outputPath, buildFallbackWav(2400, frequency));
}

export function getVoicePreviewMeta(voiceMode: VoiceMode) {
  if (isCustomVoiceMode(voiceMode)) {
    return {
      voiceMode,
      label: "自定义声音参考",
      sampleText: PREVIEW_TEXT,
      isPreviewPlaceholder: false,
      previewPurposeLabel: "直接回放你上传或录入的参考声音",
      qualityNote: "这里播放的是你的原始参考声音，用来确认音色身份，不代表最终 TTS 成片已经生成。",
    };
  }

  const preset = getVoicePreset(voiceMode);
  return {
    voiceMode,
    label: preset.label,
    sampleText: PREVIEW_TEXT,
    isPreviewPlaceholder: false,
    previewPurposeLabel: "快速确认预设音色、语速和讲解气质",
    qualityNote: "这是工作台试听样本，用来定声音方向；最终任务成片仍以任务创建后的正式 TTS 结果为准。",
  };
}

export async function ensureVoicePreviewAsset(input: {
  voiceMode: VoiceMode;
  customVoiceReference?: string;
}) {
  const { voiceMode, customVoiceReference } = input;

  if (isCustomVoiceMode(voiceMode) && customVoiceReference?.trim()) {
    return {
      outputPath: buildCustomVoiceReferenceAbsolutePath(customVoiceReference),
      relativeUrl: `/api/custom-voice-reference/file/${encodeURIComponent(customVoiceReference)}`,
      usedFallback: false,
      previewSource: "custom_reference",
    };
  }

  await ensurePreviewDir();

  const outputFilename = `${sanitizeVoiceMode(voiceMode)}.wav`;
  const outputPath = path.join(PREVIEW_DIR, outputFilename);

  if (await fileExists(outputPath)) {
    return {
      outputPath,
      relativeUrl: `/api/voice-preview/file/${outputFilename}`,
      usedFallback: false,
      previewSource: "system_preview_cache",
    };
  }

  try {
    if (isCustomVoiceMode(voiceMode)) {
      await buildFallbackPreview(voiceMode, outputPath);
    } else {
      await buildSystemPreview(voiceMode as VoicePresetId, outputPath);
    }
  } catch {
    await buildFallbackPreview(voiceMode, outputPath);
    return {
      outputPath,
      relativeUrl: `/api/voice-preview/file/${outputFilename}`,
      usedFallback: true,
      previewSource: "generated_fallback_preview",
    };
  }

  return {
    outputPath,
    relativeUrl: `/api/voice-preview/file/${outputFilename}`,
    usedFallback: false,
    previewSource: "generated_system_preview",
  };
}
